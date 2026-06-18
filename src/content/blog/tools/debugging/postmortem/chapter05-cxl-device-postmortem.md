---
title: "CXL 디바이스 Core Dump 분석 — Device State·Mailbox Log·NUMA 토폴로지"
date: 2026-06-18T09:07:00
description: "CXL 디바이스가 fail한 후 core dump에서 device state·mailbox 명령 이력·NUMA 토폴로지를 복원하는 분석 흐름."
series: "Postmortem Debugging"
seriesOrder: 5
tags: [cxl, postmortem, core-dump, drgn, mailbox-log, vmcore]
draft: false
---

## CXL 관련 postmortem이 왜 다른가

일반 프로세스 core dump는 *CPU 레지스터·메모리·스레드 상태*가 핵심입니다. CXL 디바이스 fail 시에는 추가로 *디바이스 측 상태*가 필요합니다:

- *디바이스 mailbox 명령 이력* — 어떤 명령이 실패했나
- *HDM Decoder 매핑 테이블* — 메모리가 어디로 매핑되어 있었나
- *Poison list 변화* — bad media 누적 추이
- *NUMA 토폴로지* — 어느 node가 CXL이었나
- *Region·decoder 객체 상태* — sysfs path와 매핑

이 정보들은 *대부분 vmcore에 들어 있지만 추출하려면 별도 도구*가 필요합니다.

## drgn으로 vmcore 분석

drgn은 *kdump core*에서 *살아 있는 커널처럼* CXL 구조를 검사할 수 있습니다.

```python
# drgn 세션
$ drgn --core /var/crash/vmcore --vmlinux /usr/lib/debug/.../vmlinux

>>> # 모든 CXL port 나열
>>> from drgn.helpers.linux.cxl import for_each_cxl_port
>>> ports = list(for_each_cxl_port(prog))
>>> print(f"{len(ports)} CXL ports")
3 CXL ports

>>> # Crash 시점의 region 상태
>>> for region in prog["cxl_regions"]:
...     print(f"region {region.name}: ", end="")
...     print(f"size={region.size:#x} ", end="")
...     print(f"state={region.state}")
region region0: size=0x4000000000 state=COMMIT
region region1: size=0x2000000000 state=COMMIT
region region2: size=0x0          state=ERROR     ← 의심

>>> # 의심 region의 decoder 상태
>>> r2 = prog["cxl_region_lookup"]("region2")
>>> for dec in r2.decoders:
...     print(f"  decoder{dec.id}: hpa={hex(dec.hpa_range.start)}")
...     print(f"    flags={dec.flags:#x}")
  decoder3.0: hpa=0x80000000000
    flags=0x4   ← ERROR flag set
```

*ERROR state region*과 *flag*가 crash 직전의 상태를 알려 줍니다.

## Mailbox 명령 이력 복원

`cxl_core`는 *mailbox 명령 ring buffer*를 유지합니다. vmcore에서 복원:

```python
>>> mbox = prog["cxl_memdev"][0].mbox
>>> for i, cmd in enumerate(mbox.cmd_log):
...     print(f"[{cmd.timestamp:>16}] opcode={cmd.opcode:#06x} ret={cmd.ret}")
[1719724823501] opcode=0x4400 ret=0      # Get Health Info OK
[1719724824112] opcode=0x4300 ret=0      # Get LSA OK
[1719724824890] opcode=0x4302 ret=-110   # Set LSA TIMEOUT ← 의심
[1719724825101] opcode=0x0000 ret=-19    # device removed
```

*timeout 후 ENODEV*가 나면 *디바이스가 응답 정지*했다는 신호입니다.

## NUMA 토폴로지 복원

CXL 노드가 *crash 시점에 어떤 상태였는지* 확인:

```python
>>> # 모든 노드 정보
>>> for node in prog["node_data"]:
...     if node:
...         print(f"node {node.node_id}: ", end="")
...         print(f"present={node.node_present_pages}, ", end="")
...         print(f"online={node.node_spanned_pages}")
node 0: present=33554432, online=33554432    # DDR socket 0
node 1: present=33554432, online=33554432    # DDR socket 1
node 2: present=67108864, online=0           # CXL — offline at crash!
```

*node 2가 offline*이 되었다면 *CXL 디바이스가 사라진 시점*이 *crash 직전*임을 알 수 있습니다.

## Kernel log에서 단서

vmcore의 dmesg buffer:

```bash
$ crash /usr/lib/debug/.../vmlinux /var/crash/vmcore
crash> log | tail -30
[12345.6789] cxl_pci 0000:5e:00.0: mailbox timeout (opcode 0x4302)
[12345.7892] cxl_pci 0000:5e:00.0: device went offline
[12345.7893] pci 0000:5e:00.0: AER: Multiple Uncorrectable error received
[12345.7895] cxl_mem mem0: removing memory device
[12345.8001] BUG: kernel NULL pointer dereference, address: 00000018
[12345.8002] RIP: 0010:cxl_region_access+0x2a/0x80
```

*Mailbox timeout → device offline → AER UE → driver NULL deref*의 *연쇄가 보입니다*.

## 자주 만나는 함정

| 증상 | 원인 |
|------|------|
| drgn에 cxl helper 없음 | drgn 0.0.24+ 필요. 또는 자체 helper 작성 |
| `cxl_regions`가 비어 있음 | crash 시점에 region 모두 해제됨 |
| HDM Decoder address 0 | early crash — decoder programming 전 |
| vmcore에 mailbox log 없음 | `cxl_core` 모듈이 로그 안 유지 — kernel patch 필요 |
| Node `present_pages` ≠ `online_pages` | device offline 또는 hot-remove 진행 중 |
| `RIP`가 cxl 모듈 안 | NULL deref — race condition 의심 |
| AER 이벤트는 있는데 cxl 메시지 없음 | PCI 레벨에서 죽음. cxl driver 호출 전 |
| `Multiple UE`인데 disconnect 안 됨 | `pci=noaer` 부팅 옵션? |
| Mailbox cmd_log timestamp 비현실적 | TSC 미보정 또는 hot-plug 후 reset |
| Region state ERROR + sysfs 정상 | sysfs와 kernel state 불일치 — recovery 필요 |

## 분석 체크리스트

1. `crash> log`로 *마지막 메시지 5~10줄* 확인
2. `drgn`으로 *CXL port·region·memdev 객체* 상태 검사
3. *Mailbox cmd_log*에서 *마지막 실패 명령* 확인
4. *NUMA 노드 online 상태*로 *언제 device가 사라졌는지* 파악
5. *AER 이벤트 + cxl 메시지 순서*로 *어디서 처음 실패*했는지 좁힘

## 정리

- CXL 관련 postmortem은 *디바이스 측 상태*가 추가로 필요해 *drgn + cxl helper*가 표준 도구입니다.
- *Mailbox cmd_log·HDM Decoder·Region state·NUMA online* 네 가지가 핵심 정보입니다.
- *Kernel log의 cxl 메시지 → AER → driver crash* 연쇄가 *전형적인 패턴*입니다.
- 운영에서는 *crash 직전 5~10초의 mailbox 명령*을 보면 *원인 좁히기*가 빠릅니다.

## 다음 장 예고

Ch 6 — CXL Fabric Postmortem. 분산 디바이스·multi-host pool에서의 *장애 추적 분석*.

## 관련 항목

- [Ch 1: Core Dump 생성 메커니즘](/blog/tools/debugging/postmortem/chapter01-core-generation)
- [Ch 3: GDB로 Core 분석](/blog/tools/debugging/postmortem/chapter03-gdb-core-analysis)
- [Kernel Debugging Ch 6: crash와 drgn 분석](/blog/tools/debugging/kernel/chapter06-crash-drgn)
- [Kernel Debugging Ch 8: CXL 커널 드라이버 디버깅](/blog/tools/debugging/kernel/chapter08-cxl-driver-debug)
- [Memory Diagnostics Ch 6: CXL 메모리 진단](/blog/tools/debugging/memory/chapter06-cxl-memory-diagnostics)
