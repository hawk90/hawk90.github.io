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

아래 drgn 코드는 커널 자료구조를 조사하는 예시입니다. 실제 필드와 helper 동작은 분석 대상 커널의 빌드·설정·디버그 심볼에 맞춰 확인해야 합니다. 이 장은 CXL 하드웨어나 vmcore에서 실행 검증한 절차를 보고하지 않습니다. 장치 내부 로그는 사전에 수집해야 하며, 제시된 흐름만으로 특정 장애 원인을 확정할 수 없습니다.

일반 프로세스 core dump는 *CPU 레지스터·메모리·스레드 상태*가 핵심입니다. CXL 디바이스 fail 시에는 추가로 *커널이 들고 있던 CXL 객체 상태*가 필요합니다:

- *Region·decoder 객체 상태* — commit 단계, 매핑된 HPA 범위
- *NUMA 토폴로지* — 어느 node가 CXL이었나
- *Kernel log의 cxl 메시지* — mailbox timeout, PCI error handler 경고

Vmcore의 포착 범위·dump filter·debug 정보에 따라 객체와 printk/trace 사본을 조사할 수 있습니다. Device의 현재 poison/event log 전체가 vmcore에 반드시 보존되는 것은 아니며 일부 kernel buffer 사본과 device 원본을 구분합니다. ndctl80의 `cxl list -L`·`cxl monitor` 등은 살아 있는 대상에서 사전에 수집할 경로이고 이 작업에서 실행하지 않았습니다.

## drgn으로 vmcore 분석

[Linux6.12 고정 source](https://github.com/torvalds/linux/blob/adc218676eef25575469234709c2d87185ca223a/drivers/cxl/cxl.h)의 필드와 [drgn helper 문서(확인 build0.3.0+6.g5e21fd3)](https://drgn.readthedocs.io/en/latest/helpers.html)를 대조했습니다. 이는 해당 조합의 vmcore 실행 검증이 아닙니다. 이 예는 범용 helper `bus_for_each_dev()`로 CXL bus(`cxl_bus_type`, `drivers/cxl/core/port.c`)의 device를 돌고 `device_type` 이름으로 골라냅니다.

```python title="drgn-cxl-region.py"
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

```python title="drgn-cxl-nodes.py"
from drgn.helpers.linux.nodemask import for_each_online_node

for nid in for_each_online_node(prog):
    pgdat = prog["node_data"][nid]
    print(nid, pgdat.node_present_pages.value_(),
          pgdat.node_spanned_pages.value_())
```

`node_data` symbol이 해당 architecture·build에서 제공되고 pointer와 필요한 dump page가 유효하다는 전제입니다. `node_present_pages`는 present page 수, `node_spanned_pages`는 노드가 걸친 범위 크기(구멍 포함)입니다(`include/linux/mmzone.h`). Node가 없거나 present=0이어도 CXL offlining을 확정하지 않습니다. Device DAX/SystemRAM 구성·다른 node와 통합·memory-only node·dump 손실·build 차이를 비교하고 region/decoder/HPA mapping 자료와 연결해야 합니다.

## Kernel log에서 단서

vmcore의 printk 버퍼는 `crash`의 `log`로 봅니다.

아래는 이미 연 crash session에서의 command 예이며 실제 출력은 아닙니다. Matching vmlinux·module debuginfo·dump 손실을 먼저 확인합니다.

```text
crash> log | grep -iE "cxl|mailbox|AER"
```

`drivers/cxl/`가 남기는 메시지 중 postmortem에서 찾을 것:

| 메시지 (소스의 format 문자열) | 출처 | 의미 |
|-------------------------------|------|------|
| `mailbox timeout (opcode: %#x), device state %s%s` | `pci.c` | 해당 source의 doorbell 대기 timeout. device state에 `fatal`·`firmware-halt`가 붙을 수 있음 |
| `timeout waiting for background (%d ms)` | `pci.c` | background 명령이 poll 한도 안에 끝나지 않음 |
| `%s: frozen state error detected, disable CXL.mem` | `core/pci.c` | PCI 채널 frozen — memdev 드라이버 해제 후 reset 요청 |
| `failure state error detected, request disconnect` | `core/pci.c` | PCI 채널 perm failure — disconnect |
| `%s: memdev disabled, abort error handling` | `core/pci.c` | memdev에 드라이버가 없어 오류 처리 포기 |

이 table은 Linux6.12의 format 문자열·분기를 대조한 것입니다. Mailbox readiness·doorbell·background command의 서로 다른 timeout을 구분합니다. Asynchronous 처리·CPU별 timestamp·lost/rate-limited log를 확인하며 출력 순서만으로 첫 물리 원인을 확정하지 않습니다.

## 자주 만나는 함정

| 관찰 | 점검할 가설 |
|------|------|
| drgn에 cxl helper 없음 | 선택한 helper 문서·버전과 범용 bus 순회 검토 |
| `cxl_bus_type` 심볼을 못 찾음 | module debuginfo·CONFIG·로드 상태·대상 build 일치 여부 |
| region `state`가 `CXL_CONFIG_COMMIT`이 아님 | crash 시점에 decoder commit이 끝나지 않았거나 reset 진행 중 |
| AER 메시지는 있는데 cxl 메시지 없음 | PCI 단계 처리·module 상태·log 필터/유실을 구분 |

## 분석 체크리스트

1. `crash> log`로 *마지막 cxl·AER 메시지* 확인
2. `drgn`으로 *CXL region·decoder·memdev 객체* 상태 검사
3. *mailbox timeout 메시지*의 opcode와 device state 확인
4. *NUMA 노드 페이지 수*로 CXL 메모리가 아직 올라가 있었는지 파악
5. *AER 이벤트 + cxl 메시지 순서*로 *어디서 처음 실패*했는지 좁힘

## 정리

- CXL 관련 postmortem은 *커널이 들고 있던 CXL 객체 상태*가 추가로 필요합니다. 이 예는 `bus_for_each_dev()`로 CXL bus의 kernel object를 순회하며 실제 dump에서 실행하지 않았습니다.
- *Region state·decoder·NUMA 노드·kernel log* 네 가지가 핵심 정보입니다.
- mailbox 명령 이력은 커널이 따로 보관하지 않습니다. 남는 것은 실패 시 찍힌 `mailbox timeout (opcode: …)` 같은 로그입니다.
- Device 원본 log 전체와 vmcore에 남은 kernel 사본의 coverage는 다릅니다. 사전 수집한 device 자료·주소 mapping과 함께 확인합니다.

## 다음 장 예고

Ch 6 — CXL Fabric Postmortem. 분산 디바이스·multi-host pool에서의 *장애 추적 분석*.

## 관련 항목

- [Ch 1: Core Dump 생성 메커니즘](/blog/tools/debugging/postmortem/chapter01-core-generation)
- [Ch 3: GDB로 Core 분석](/blog/tools/debugging/postmortem/chapter03-gdb-core-analysis)
- [Kernel Debugging Ch 6: crash와 drgn 분석](/blog/tools/debugging/kernel/chapter06-crash-drgn)
- [Kernel Debugging Ch 8: CXL 커널 드라이버 디버깅](/blog/tools/debugging/kernel/chapter08-cxl-driver-debug)
- [Memory Diagnostics Ch 6: CXL 메모리 진단](/blog/tools/debugging/memory/chapter06-cxl-memory-diagnostics)
