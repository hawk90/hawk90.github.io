---
title: "Tiered Memory 진단 — DAMON·DAMOS·Promotion/Demotion 디버깅"
date: 2026-06-18T09:06:00
description: "DDR + CXL.mem 계층화 환경에서 DAMON·DAMOS 동작 분석 — page promotion/demotion 추적, hot/cold 분류 디버깅."
series: "Memory Diagnostics"
seriesOrder: 7
tags: [tiered-memory, damon, damos, cxl, promotion, demotion]
draft: false
---

## DAMON 기본 동작 모델

DAMON은 *page activity를 적은 오버헤드로 측정*하는 메커니즘입니다. 3단계:

| 단계 | 동작 |
|------|------|
| 1. Region sampling | 메모리를 *region*으로 나누어 *각 region 내 random page 1개*만 sampling |
| 2. Access counting | sampling된 page의 *PTE Access bit* 확인 |
| 3. Aggregation | 일정 시간 누적 → access 빈도로 환산 |

이렇게 *전체를 안 보고 sampling*해 *오버헤드 1% 이하*.

## DAMON 파라미터 튜닝

| 파라미터 | 의미 | 기본 | 권장 |
|---------|------|------|------|
| sample_interval | sampling 주기 | 5ms | 5~10ms |
| aggr_interval | aggregation 주기 | 100ms | 100~500ms |
| min_nr_regions | 최소 region 분할 | 10 | 10~100 |
| max_nr_regions | 최대 region 분할 | 1000 | 1000~10000 |
| ops | operation set | vaddr | paddr (system-wide) 또는 vaddr (per-process) |

```bash
# 파라미터 설정
$ echo 5000 > /sys/kernel/mm/damon/admin/kdamonds/0/contexts/0/monitoring_attrs/intervals/sample_us
$ echo 200000 > /sys/kernel/mm/damon/admin/kdamonds/0/contexts/0/monitoring_attrs/intervals/aggr_us
$ echo 100 > /sys/kernel/mm/damon/admin/kdamonds/0/contexts/0/monitoring_attrs/min_nr_regions
$ echo 10000 > /sys/kernel/mm/damon/admin/kdamonds/0/contexts/0/monitoring_attrs/max_nr_regions

# 활성화
$ echo on > /sys/kernel/mm/damon/admin/kdamonds/0/state
```

`sample_interval`이 *너무 작으면* (1ms 이하) DAMON 자체 오버헤드가 큽니다.

## DAMOS — 자동 액션

*DAMOS (DAMON-based Operation Schemes)*는 *DAMON 측정 결과에 따라 자동 액션*을 취합니다.

| Action | 의미 |
|--------|------|
| pageout | swap으로 강제 page out |
| migrate_hot | hot page를 *상위 tier로 promotion* |
| migrate_cold | cold page를 *하위 tier로 demotion* |
| lru_prio | LRU 우선순위 높임 |
| lru_deprio | LRU 우선순위 낮춤 |
| stat | 통계만 (action 없음) |
| nohugepage | huge page 비활성 |

```bash
# Scheme 추가 — cold page를 CXL.mem으로 demotion
$ cd /sys/kernel/mm/damon/admin/kdamonds/0/contexts/0/schemes
$ echo 1 > nr_schemes
$ cd 0/

$ echo migrate_cold > action
$ echo 2 > target_nid    # CXL node

# Access pattern — 10초 동안 1번 이하 access
$ echo 0 > access_pattern/min_nr_accesses
$ echo 1 > access_pattern/max_nr_accesses

# 영역 크기 — 1 MB 이상
$ echo 1048576 > access_pattern/min_sz
$ echo $((1024*1024*1024*1024)) > access_pattern/max_sz

# Watermark — 메모리 부족 시만 동작
$ echo 50 > watermarks/high
$ echo 30 > watermarks/mid
$ echo 10 > watermarks/low
```

## Tiered Memory Configuration

Linux의 *memory tier* 인터페이스:

```bash
# Tier 확인
$ ls /sys/devices/virtual/memory_tiering/
memory_tier0/  memory_tier1/

$ cat /sys/devices/virtual/memory_tiering/memory_tier0/nodelist
0,1        # DDR (hot tier)

$ cat /sys/devices/virtual/memory_tiering/memory_tier1/nodelist
2          # CXL.mem (cold tier)

# Tier ID 변경 (드물게 필요)
$ echo 100 > /sys/devices/virtual/memory_tiering/memory_tier0/tier_id

# 자동 promotion 활성
$ echo 2 > /proc/sys/kernel/numa_balancing   # NUMA balance + promotion
$ cat /sys/devices/system/node/node2/demotion_target_nodes
0,1        # CXL → DDR로 promotion 대상
```

## Promotion·Demotion 추적

실시간 모니터링:

```bash
# 1. DAMON 모니터링
$ damo monitor --kdamonds 0
[Sample]
Region 0-32M: 82% access, node 0
Region 32M-256M: 45% access, node 0
Region 256M-1G: 8% access, node 2
Region 1G-256G: 1% access, node 2

# 2. Migration 이벤트 트레이싱
$ cat /sys/kernel/debug/tracing/events/migrate/mm_migrate_pages/enable
1
$ cat /sys/kernel/debug/tracing/trace_pipe | grep migrate
   -<idle>...migrate_pages: nr_pages=128 from=node 2 to=node 0
   -<idle>...migrate_pages: nr_pages=64 from=node 0 to=node 2

# 3. perf로 migration 통계
$ perf stat -e migrate:mm_migrate_pages -a sleep 60
 Performance counter stats for 'system wide':

       123,456    migrate:mm_migrate_pages

      60.001 seconds time elapsed
```

## 흔한 문제들

### False Promotion

*Single-access page*가 hot으로 잘못 분류:

```text
[증상]
DAMON: Region X has 1 access in last 1 second
→ DAMOS migrate_hot triggered
→ Page promoted to DDR
→ Next 60 seconds: 0 access
→ Wasted DDR capacity
```

해결:
- `min_nr_accesses` 임계 높임 (1 → 5+)
- `aggr_interval` 늘림 (100ms → 500ms)

### Demotion Thrashing

같은 page가 *DDR ↔ CXL 사이 왕복*:

```text
[증상]
Time 0:  Page X in DDR, access count high
Time 1:  Access 줄어듬 → demoted to CXL
Time 2:  Access 다시 발생 → promoted to DDR
Time 3:  Demoted again
... 반복
```

해결:
- Migration cool-down 추가 (CXL → DDR 후 일정 시간 demotion 금지)
- DAMOS의 *quota* 활성: 시간당 migration 횟수 제한
  ```bash
  $ echo 100 > quotas/sz_permil  # 0.1% 메모리만 migrate
  ```

### Promotion 실패

DDR tier가 full일 때:

```text
[증상]
[damon] migrate_hot scheme: 1024 pages
[mm] migrate_pages failed: -ENOMEM at node 0
```

해결:
- DDR에 *여유 확보* (`vm.min_free_kbytes` 증가)
- *동시 demotion* 활성화 (`damos demote-first` flag)

### NUMA Balancing vs DAMON 충돌

```text
[증상]
NUMA balance: promote page X to node 0 (CPU 0 access)
DAMON: page X is cold → demote to node 2
NUMA balance: page X access on CPU 0 → promote back
... 무한 충돌
```

해결:
- *NUMA balancing 비활성* (`echo 0 > /proc/sys/kernel/numa_balancing`)
- 또는 *DAMON 비활성*하고 NUMA balance만 사용

## 워크로드별 권장 설정

| 워크로드 | sample_interval | aggr | min_nr_accesses | quota |
|---------|-----------------|------|-----------------|-------|
| LLM inference | 5ms | 100ms | 1 | 1% |
| In-memory DB | 10ms | 500ms | 5 | 0.5% |
| Container host | 50ms | 1000ms | 3 | 0.1% |
| HPC tight loop | (DAMON 안 씀) | — | — | — |

*HPC tight loop*은 *지연 민감*이라 *DAMON 자체 오버헤드도 부담*. 다른 메커니즘 사용.

## bpftrace로 migration 캡처

깊은 추적:

```bash
$ bpftrace -e '
  tracepoint:migrate:mm_migrate_pages_start {
    @starts[args->from_node, args->to_node] = sum(args->nr_pages);
  }
  tracepoint:migrate:mm_migrate_pages_completed {
    @completes[args->from_node, args->to_node] = sum(args->nr_pages);
  }
  interval:s:60 {
    print(@starts);
    print(@completes);
    clear(@starts);
    clear(@completes);
  }
'

# 출력
@starts[0, 2]: 1234     # DDR → CXL demotion 시도
@starts[2, 0]: 567      # CXL → DDR promotion 시도
@completes[0, 2]: 1230  # 성공
@completes[2, 0]: 560   # 성공 (일부 실패)
```

## Performance Regression 사례

*DAMON 활성화 후 throughput 떨어진* 경우:

원인 추정:
- *sample_interval 너무 작음* — DAMON 오버헤드 큼
- *migration 자체 비용* — page migrate 시 *수십 μs 정지*
- *PTE Access bit 처리* — TLB flush가 자주 발생

해결 순서:
1. *aggr_interval 증가* (100ms → 500ms)
2. *quota 감소* (1% → 0.1%)
3. *DAMOS scheme 비활성*하고 *모니터링만*
4. 그래도 문제 → DAMON 비활성

## 자주 만나는 함정

| 증상 | 원인 |
|------|------|
| DAMON 활성화했는데 access % 모두 0 | `ops`가 잘못 — paddr인지 vaddr인지 |
| Tier 정보 없음 | HMAT 누락 — BIOS 확인 |
| Migration이 안 일어남 | watermark 임계 안 됨 — `watermarks/low` 확인 |
| Migration 너무 많음 | quota 미설정 |
| CXL 노드 사용량 안 늘어남 | numa_balancing이 promotion 우세 — DAMON quota 늘림 |
| Workload throughput 떨어짐 | sample_interval 작아서 오버헤드 — 늘림 |
| `damo` 명령 안 보임 | damo CLI 설치 안 됨 — `pip install damo` |
| Migration 후 SIGBUS | DAMON이 active page migrate 시도 — 매우 드문 race |

## 정리

- *DAMON*은 *region sampling으로 page activity*를 *적은 오버헤드*로 측정합니다.
- *DAMOS*는 측정 결과에 따라 *promotion·demotion·pageout 자동 액션*.
- *Tiered memory*는 *HMAT 기반 자동 분류* + DAMON·DAMOS 보조.
- *흔한 문제*는 *false promotion·thrashing·promotion 실패·NUMA balance 충돌* 4가지.
- *워크로드별 파라미터 튜닝*이 필수. HPC tight loop은 DAMON 안 씀.
- bpftrace의 *migrate tracepoint*로 *migration 흐름 깊이 분석* 가능.

## 다음 장 예고

Memory Diagnostics 시리즈의 *CXL 관련 마무리*. 다음 깊이는 *Postmortem Debugging Ch 5~6*의 *core dump·fabric* 분석으로 자연 연결.

## 관련 항목

- [Ch 1: 리눅스 메모리 회계 — RSS·VSS·PSS·smaps 해석](/blog/tools/debugging/memory/chapter01-memory-accounting)
- [Ch 6: CXL 메모리 진단](/blog/tools/debugging/memory/chapter06-cxl-memory-diagnostics)
- [Embedded Performance Engineering Ch 55: CXL 성능 프로파일링 도구](/blog/embedded/performance-engineering/part5-11-cxl-profiling-tools)
- [HBM·GDDR 심화 Ch 9: CXL.mem 분석](/blog/embedded/hardware/hbm/chapter09-cxl-mem)
- [Postmortem Debugging Ch 5: CXL 디바이스 Core Dump 분석](/blog/tools/debugging/postmortem/chapter05-cxl-device-postmortem)
