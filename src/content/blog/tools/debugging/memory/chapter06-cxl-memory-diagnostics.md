---
title: "CXL 메모리 진단 — RAS·Poison List·Media Error 추적"
slug: "tools/debugging/memory/chapter06-cxl-memory-diagnostics"
date: 2026-06-18T09:05:00
description: "CXL.mem 디바이스 메모리 상태 진단 — cxl-cli·poison list·event log로 RAS 이벤트 추적, NUMA node별 사용량 분석."
series: "Memory Diagnostics"
seriesOrder: 6
tags: [cxl, memory-diagnostics, ras, poison, numa, cxl-cli]
draft: false
topics: ["tools", "tools/debugging"]
---

## CXL.mem은 일반 메모리와 무엇이 다른가

DDR DIMM과 달리 CXL 메모리 디바이스는:
- *별도 NUMA 노드*로 등록됨 — `numastat`에 별도 항목
- *RAS 이벤트 채널*이 존재 — poison list, event log
- *Mailbox 명령*으로 *디바이스 상태 query* 가능
- *Tiered memory* 컨텍스트에서 *promotion/demotion* 트래픽 발생

기존 메모리 진단 도구(`heaptrack`·`jemalloc profile`)는 *프로세스 관점*입니다. CXL은 *디바이스 관점* 추가 진단이 필요합니다.

## NUMA 노드별 사용량

`numastat`에서 CXL 노드 사용량 확인:

```bash
# 전체 노드 통계 (노드별 meminfo)
$ numastat -m

# 프로세스별 노드 할당
$ numastat -p <pid>
```

*CXL 노드에 메모리가 의외로 많이* 잡혀 있으면 *원하지 않은 placement*입니다. *`mbind()` 또는 `numactl`로 제어*해야 합니다.

## cxl-cli로 디바이스 상태

```bash
# 1. region과 target 토폴로지
$ cxl list -RT

# 2. 디바이스 health (Get Health Info, mailbox opcode 0x4200)
$ cxl list -m mem0 -H

# 3. Poison list — media error 추적 (Get Poison List, opcode 0x4300)
$ cxl list -m mem0 -L

# 4. CXL trace event 모니터링
$ cxl monitor
```

`-H` 출력의 `health` 객체에는 `life_used_percent`, `temperature`, `dirty_shutdowns`, `volatile_errors`, `pmem_errors`와 `media_*`·`ext_*` 상태 필드가 들어 있습니다. `-L` 출력은 `media_errors` 배열로 `offset`·`length`·`source`를 줍니다(ndctl `Documentation/cxl/cxl-list.txt`). 전체 예시는 [Embedded Debugging Ch 9](/blog/tools/debugging/embedded/chapter09-cxl-device-troubleshoot)에 있습니다.

## Event Log 분류

CXL 디바이스의 Event Log는 네 종류입니다(`drivers/cxl/core/trace.h`).

| 로그 | 커널 enum |
|------|-----------|
| Informational | `CXL_EVENT_TYPE_INFO` |
| Warning | `CXL_EVENT_TYPE_WARN` |
| Failure | `CXL_EVENT_TYPE_FAIL` |
| Fatal | `CXL_EVENT_TYPE_FATAL` |

드라이버는 이 로그들을 Get Event Records(0x0100)로 읽어 trace event로 내보냅니다.

## DAMON으로 access 패턴

CXL 메모리가 *cold tier*로 잘 활용되는지 확인:

```bash
# DAMON 활성화 (kdamond 설정 뒤)
$ echo on > /sys/kernel/mm/damon/admin/kdamonds/0/state

# 결과 분포
$ damo report access
```

*CXL 노드의 access 빈도*가 *DDR보다 낮으면* tier 배치가 의도대로 동작하고 있습니다. 비슷하면 *promotion이 잘 안 되고 있는 신호*입니다.

## 자주 만나는 함정

이 장이 다루는 것은 *메모리로서의 CXL*이므로, 여기서는 용량이 보이지 않거나 통계가 어긋나는 쪽의 함정을 모읍니다.

| 증상 | 원인 |
|------|------|
| CXL 노드 메모리 안 보임 | `cxl create-region` 안 함 — region 생성해야 사용 가능 |
| `numastat`에 node 2 없음 | `daxctl reconfigure-device -m system-ram` 누락 |
| 승격(promotion)이 일어나지 않음 | `/proc/sys/kernel/numa_balancing`에 `NUMA_BALANCING_MEMORY_TIERING`(2)이 설정되지 않음 |
| 강등(demotion)이 일어나지 않음 | `/sys/kernel/mm/numa/demotion_enabled`가 꺼져 있음 |

health 이상, media error 증가, `cxl monitor`에 이벤트가 나오지 않는 경우 등 디바이스 자체의 이상은 [Embedded Debugging Ch 9: CXL 디바이스 트러블슈팅](/blog/tools/debugging/embedded/chapter09-cxl-device-troubleshoot#자주-만나는-함정)에 정리돼 있습니다.

## 진단 워크플로

1. `numastat -m` — 노드별 전체 통계
2. `cxl list -m memX -H` — 디바이스 자체 상태
3. `cxl list -m memX -L` — poison list 변화 추적
4. `cxl monitor` — CXL trace event
5. `damo report access` — access pattern 분포
6. `dmesg | grep -E "cxl|mce|memory_failure"` — kernel 측 이벤트

## 정리

- CXL 메모리는 *별도 NUMA 노드*로 등록되어 `numastat`에서 *디바이스 관점* 진단이 가능합니다.
- *cxl-cli*의 `cxl list -H`·`-L`과 `cxl monitor`가 *디바이스 health·poison·event*를 보여 줍니다.
- *Event Log는 Informational·Warning·Failure·Fatal* 네 종류입니다.
- *DAMON*으로 *CXL 노드의 access pattern*을 확인해 *tier 정렬이 잘 동작하는지* 검증합니다.
- 운영에서는 *media error 수·`life_used_percent`·`dirty_shutdowns`* 세 지표를 *장기 추적*합니다.

## 다음 장 예고

Ch 7 — Tiered Memory 진단. DAMON·DAMOS·promotion/demotion debugging.

## 관련 항목

- [Ch 1: 리눅스 메모리 회계 — RSS·VSS·PSS·smaps 해석](/blog/tools/debugging/memory/chapter01-memory-accounting)
- [HBM·GDDR 심화 Ch 9: CXL.mem 분석](/blog/embedded/hardware/hbm/chapter09-cxl-mem)
- [Embedded Performance Engineering Ch 54: CXL.mem 지연·대역폭 실측](/blog/embedded/performance-engineering/part3-12-cxl-mem-latency)
- [Embedded Debugging Ch 9: CXL 디바이스 트러블슈팅](/blog/tools/debugging/embedded/chapter09-cxl-device-troubleshoot)
