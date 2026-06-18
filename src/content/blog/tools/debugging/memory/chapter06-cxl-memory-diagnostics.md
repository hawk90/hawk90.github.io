---
title: "CXL 메모리 진단 — RAS·Poison List·Media Error 추적"
date: 2026-06-18T09:05:00
description: "CXL.mem 디바이스 메모리 상태 진단 — cxl-cli·poison list·event log로 RAS 이벤트 추적, NUMA node별 사용량 분석."
series: "Memory Diagnostics"
seriesOrder: 6
tags: [cxl, memory-diagnostics, ras, poison, numa, cxl-cli]
draft: false
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
# 전체 노드 통계
$ numastat -m
                  Node 0     Node 1     Node 2 (CXL)
MemTotal      262144000  262144000  274877906944
MemFree         5120000     6291000    8589934592
MemUsed       257024000  255853000  266287972352
Anon          198976000  201342000  198945792000
Active(file)    2048000     1532000     1073741824

# 프로세스별 노드 할당
$ numastat -p <pid>
Per-node process memory usage (in MBs)
                Node 0  Node 1  Node 2  Total
Huge               0      0       0      0
Heap            1234   2345    98765  102344
Stack              0      0       0      0
Private         1098   1872    87654   90624
----------------------------------
Total           2332   4217   186419  192968
```

*Node 2 (CXL)에 메모리 의외로 많이* 가 있으면 *원하지 않은 placement*입니다. *`mbind()` 또는 `numactl`로 제어*해야 합니다.

## cxl-cli로 디바이스 상태

```bash
# 1. 전체 토폴로지
$ cxl list -RT
[
  {
    "memdev":"mem0",
    "ram_size":274877906944,
    "host":"0000:5e:00.0"
  }
]

# 2. 디바이스 health
$ cxl health -m mem0
{
  "memdev":"mem0",
  "health_status":"normal",
  "media_status":"normal",
  "ext_status":"normal",
  "life_used_percent":12,
  "temperature":42,
  "dirty_shutdown_count":3
}

# 3. Poison list — bad media 추적
$ cxl list -m mem0 -P
{
  "poison":[
    {"address":"0x80012340", "length":64, "source":"injected"},
    {"address":"0x80015800", "length":64, "source":"internal"}
  ]
}

# 4. Event log
$ cxl monitor -m mem0
[2026-06-18 09:10:23] Info: Mailbox cmd 0x4400 completed in 1.2ms
[2026-06-18 09:11:45] Warning: Correctable ECC error at 0x80045000
[2026-06-18 09:12:01] Failure: Media error at 0x80067800 — added to poison list
```

## RAS 이벤트 분류

| 등급 | 의미 | 대응 |
|------|------|------|
| Information | 정보성 (mailbox completion 등) | 무시 가능 |
| Warning | Correctable error | 카운트 모니터링 |
| Failure | Uncorrectable, 단일 영역 | poison list 격리, 페이지 unmap |
| Fatal | 디바이스 오류 | 디바이스 reset 또는 교체 |

Linux 6.2+에서는 *Failure 이벤트 발생 시* *자동 page offline*과 *MCE 이벤트 발생*이 통합됩니다.

## DAMON으로 access 패턴

CXL 메모리가 *cold tier*로 잘 활용되는지 확인:

```bash
# DAMON 활성화
$ echo on > /sys/kernel/mm/damon/admin/kdamonds/0/state

# 결과 분포
$ damo report access
target_id  region(KB)  access(%)  node
0          0-32M       82.3       0  # DDR — hot
0          32M-128M    45.1       0  # DDR — warm
0          128M-1G     8.2        2  # CXL — cool
0          1G-256G     1.1        2  # CXL — cold
```

*CXL 노드의 access %*가 *DDR 대비 작아야 정상*입니다. 비슷하면 *promotion이 잘 안 되고 있는 신호*.

## 자주 만나는 함정

| 증상 | 원인 |
|------|------|
| CXL 노드 메모리 안 보임 | `cxl create-region` 안 함 — region 생성해야 사용 가능 |
| `numastat`에 node 2 없음 | `daxctl reconfigure-device -m system-ram` 누락 |
| Poison list 늘어남 | media wear 또는 ECC marginal — 디바이스 교체 검토 |
| Health "warning"으로 떨어짐 | `life_used_percent` 또는 dirty_shutdown 증가 — log 확인 |
| `cxl monitor` 무응답 | event interrupt 비활성. `cxl set-event-irq -m memX` |
| DAMON CXL 노드 무시 | DAMON 6.2+ tiered memory awareness 활성 확인 |
| `temperature` 비현실적 (255 또는 0) | 디바이스 firmware bug — sensor 미초기화 |
| 갑작스러운 throughput 저하 | thermal throttling 가능 — `cxl health` 확인 |
| Multi-host pool에서 access 실패 | LD(Logical Device) 할당 충돌 — Fabric Manager 확인 |
| Page offline 빈번 | bad media 진행 — poison rate 모니터링 |

## 진단 워크플로

1. `numastat -m` — 노드별 전체 통계
2. `cxl health -m memX` — 디바이스 자체 상태
3. `cxl list -m memX -P` — poison list 변화 추적
4. `cxl monitor -m memX` — 실시간 event log
5. `damo report access` — access pattern 분포
6. `dmesg | grep -E "cxl|mce|memory_failure"` — kernel 측 이벤트

## 정리

- CXL 메모리는 *별도 NUMA 노드*로 등록되어 `numastat`에서 *디바이스 관점* 진단이 가능합니다.
- *cxl-cli*가 *디바이스 health·poison·event*를 노출하는 표준 도구입니다.
- *RAS 이벤트는 Information·Warning·Failure·Fatal* 네 단계로 분류되며 *Failure 이상에서 page offline*이 trigger됩니다.
- *DAMON*으로 *CXL 노드의 access pattern*을 확인해 *tier 정렬이 잘 동작하는지* 검증합니다.
- 운영에서는 *poison rate·life_used·dirty_shutdown* 세 지표를 *장기 추적*합니다.

## 다음 장 예고

Ch 7 — Tiered Memory 진단. DAMON·DAMOS·promotion/demotion debugging.

## 관련 항목

- [Ch 1: 리눅스 메모리 회계 — RSS·VSS·PSS·smaps 해석](/blog/tools/debugging/memory/chapter01-memory-accounting)
- [HBM·GDDR 심화 Ch 9: CXL.mem 분석](/blog/embedded/hardware/hbm/chapter09-cxl-mem)
- [Embedded Performance Engineering Ch 54: CXL.mem 지연·대역폭 실측](/blog/embedded/performance-engineering/part3-12-cxl-mem-latency)
- [Embedded Debugging Ch 9: CXL 디바이스 트러블슈팅](/blog/tools/debugging/embedded/chapter09-cxl-device-troubleshoot)
