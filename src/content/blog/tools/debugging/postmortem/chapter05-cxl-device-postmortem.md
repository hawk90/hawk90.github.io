---
title: "CXL 디바이스 Core Dump 분석 — Device State·Kernel Log·NUMA 토폴로지"
slug: "tools/debugging/postmortem/chapter05-cxl-device-postmortem"
date: 2026-06-18T09:07:00
description: "CXL 디바이스가 fail한 후 vmcore에서 region·decoder 상태, mailbox 오류 로그, NUMA 토폴로지를 복원하는 분석 흐름."
series: "Postmortem Debugging"
seriesOrder: 5
tags: [cxl, postmortem, core-dump, drgn, vmcore]
draft: false
topics: ["tools", "tools/debugging"]
---

## CXL 관련 postmortem이 왜 다른가

일반 프로세스 core dump는 *CPU 레지스터·메모리·스레드 상태*가 핵심입니다. CXL 디바이스 fail 시에는 추가로 *커널이 들고 있던 CXL 객체 상태*가 필요합니다:

- *Region·decoder 객체 상태* — commit 단계, 매핑된 HPA 범위
- *NUMA 토폴로지* — 어느 node가 CXL이었나
- *Kernel log의 cxl 메시지* — mailbox timeout, PCI error handler 경고

이 정보는 vmcore 안의 커널 자료구조와 printk 버퍼에 남아 있습니다. 디바이스 내부의 poison list나 event log는 디바이스 쪽에 있으므로 vmcore에서 읽을 수 없고, 살아 있는 시스템에서 `cxl list -L`·`cxl monitor`로 봐야 합니다.

## drgn으로 vmcore 분석

drgn은 *kdump core*에서 *살아 있는 커널처럼* CXL 구조를 검사할 수 있습니다. drgn의 `drgn/helpers/linux/`에는 CXL 전용 helper가 없으므로, 범용 helper `bus_for_each_dev()`로 CXL bus(`cxl_bus_type`, `drivers/cxl/core/port.c`)의 device를 돌고 `device_type` 이름으로 골라냅니다.

```python
# drgn 세션: drgn -c /var/crash/vmcore -s <vmlinux 경로>
from drgn import container_of
from drgn.helpers.linux.device import bus_for_each_dev, dev_name

for dev in bus_for_each_dev(prog["cxl_bus_type"].address_of_()):
    if not dev.type or dev.type.name.string_() != b"cxl_region":
        continue
    cxlr = container_of(dev, "struct cxl_region", "dev")
    p = cxlr.params
    print(dev_name(dev).decode(), p.state.format_(type_name=False),
          "ways", p.interleave_ways.value_(), "targets", p.nr_targets.value_(),
          "flags", hex(cxlr.flags.value_()))
```

`struct cxl_region`의 `params.state`는 `enum cxl_config_state`이고 값은 `CXL_CONFIG_IDLE`, `CXL_CONFIG_INTERLEAVE_ACTIVE`, `CXL_CONFIG_ACTIVE`, `CXL_CONFIG_RESET_PENDING`, `CXL_CONFIG_COMMIT` 다섯 가지입니다(`drivers/cxl/cxl.h`). 별도의 오류 상태 값은 없습니다. `flags`의 `CXL_REGION_F_NEEDS_RESET`(bit 1)은 commit된 region의 decoder 일부가 이미 내려가 teardown이 필요하다는 표시입니다. 같은 방식으로 `device_type` 이름 `cxl_port`, `cxl_decoder_endpoint`, `cxl_decoder_switch`, `cxl_decoder_root`, `cxl_memdev`를 골라 다른 객체도 볼 수 있습니다.

## NUMA 토폴로지 복원

crash 시점의 노드별 페이지 수:

```python
from drgn.helpers.linux.nodemask import for_each_online_node

for nid in for_each_online_node(prog):
    pgdat = prog["node_data"][nid]
    print(nid, pgdat.node_present_pages.value_(),
          pgdat.node_spanned_pages.value_())
```

`node_present_pages`는 실제 물리 페이지 수, `node_spanned_pages`는 노드가 걸친 범위 크기(구멍 포함)입니다(`include/linux/mmzone.h`). CXL region을 System RAM으로 올린 노드가 목록에 없거나 present 값이 0이면, crash 전에 메모리가 내려갔다는 단서입니다.

## Kernel log에서 단서

vmcore의 printk 버퍼는 `crash`의 `log`로 봅니다.

```bash
$ crash <vmlinux 경로> /var/crash/vmcore
crash> log | grep -iE "cxl|mailbox|AER"
```

`drivers/cxl/`가 남기는 메시지 중 postmortem에서 찾을 것:

| 메시지 (소스의 format 문자열) | 출처 | 의미 |
|-------------------------------|------|------|
| `mailbox timeout (opcode: %#x), device state %s%s` | `pci.c` | doorbell이 2초 안에 내려가지 않음. device state에 `fatal`·`firmware-halt`가 붙을 수 있음 |
| `timeout waiting for background (%d ms)` | `pci.c` | background 명령이 poll 한도 안에 끝나지 않음 |
| `%s: frozen state error detected, disable CXL.mem` | `core/ras.c` | PCI 채널 frozen — memdev 드라이버 해제 후 reset 요청 |
| `failure state error detected, request disconnect` | `core/ras.c` | PCI 채널 perm failure — disconnect |
| `%s: memdev disabled, abort error handling` | `core/ras.c` | memdev에 드라이버가 없어 오류 처리 포기 |

메시지 순서로 *mailbox 단계에서 먼저 막혔는지*, *PCI 오류 처리에서 먼저 끊겼는지*를 가립니다.

## 자주 만나는 함정

| 증상 | 원인 |
|------|------|
| drgn에 cxl helper 없음 | drgn에 CXL 전용 helper가 없음 — `bus_for_each_dev()`로 직접 순회 |
| `cxl_bus_type` 심볼을 못 찾음 | `cxl_core` 모듈 debuginfo가 로드되지 않음 |
| region `state`가 `CXL_CONFIG_COMMIT`이 아님 | crash 시점에 decoder commit이 끝나지 않았거나 reset 진행 중 |
| AER 메시지는 있는데 cxl 메시지 없음 | memdev 오류 처리 전에 PCI 레벨에서 끝남 |

## 분석 체크리스트

1. `crash> log`로 *마지막 cxl·AER 메시지* 확인
2. `drgn`으로 *CXL region·decoder·memdev 객체* 상태 검사
3. *mailbox timeout 메시지*의 opcode와 device state 확인
4. *NUMA 노드 페이지 수*로 CXL 메모리가 아직 올라가 있었는지 파악
5. *AER 이벤트 + cxl 메시지 순서*로 *어디서 처음 실패*했는지 좁힘

## 정리

- CXL 관련 postmortem은 *커널이 들고 있던 CXL 객체 상태*가 추가로 필요합니다. drgn에는 CXL 전용 helper가 없으므로 `bus_for_each_dev()`로 CXL bus를 직접 순회합니다.
- *Region state·decoder·NUMA 노드·kernel log* 네 가지가 핵심 정보입니다.
- mailbox 명령 이력은 커널이 따로 보관하지 않습니다. 남는 것은 실패 시 찍힌 `mailbox timeout (opcode: …)` 같은 로그입니다.
- 디바이스 쪽 poison list와 event log는 vmcore에 없으므로 살아 있는 시스템에서 수집해 둡니다.

## 다음 장 예고

Ch 6 — CXL Fabric Postmortem. 분산 디바이스·multi-host pool에서의 *장애 추적 분석*.

## 관련 항목

- [Ch 1: Core Dump 생성 메커니즘](/blog/tools/debugging/postmortem/chapter01-core-generation)
- [Ch 3: GDB로 Core 분석](/blog/tools/debugging/postmortem/chapter03-gdb-core-analysis)
- [Kernel Debugging Ch 6: crash와 drgn 분석](/blog/tools/debugging/kernel/chapter06-crash-drgn)
- [Kernel Debugging Ch 8: CXL 커널 드라이버 디버깅](/blog/tools/debugging/kernel/chapter08-cxl-driver-debug)
- [Memory Diagnostics Ch 6: CXL 메모리 진단](/blog/tools/debugging/memory/chapter06-cxl-memory-diagnostics)
