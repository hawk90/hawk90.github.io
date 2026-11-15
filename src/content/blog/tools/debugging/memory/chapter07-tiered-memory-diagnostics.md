---
title: "Tiered Memory 진단 — DAMON·DAMOS·Promotion/Demotion 디버깅"
slug: "tools/debugging/memory/chapter07-tiered-memory-diagnostics"
date: 2026-06-18T09:06:00
description: "DDR + CXL.mem 계층화 환경에서 DAMON·DAMOS 동작 분석 — page promotion/demotion 추적, hot/cold 분류 디버깅."
series: "Memory Diagnostics"
seriesOrder: 7
tags: [tiered-memory, damon, damos, cxl, promotion, demotion]
draft: false
topics: ["tools", "tools/debugging"]
---

## DAMON 기본 동작 모델

DAMON은 제한된 표본으로 메모리 영역의 접근 빈도를 추정하는 Linux 모니터링 프레임워크입니다. 결과 정확도와 비용은 operations set, region 수, interval, workload에 따라 달라집니다. 대표 시스템에서 관찰 결과를 확인하고 파라미터를 조정합니다.

| 단계 | 동작 |
|------|------|
| 1. Region sampling | 비슷한 접근 빈도라고 가정한 영역으로 나누고 각 주기마다 영역 내 페이지를 표본 선택 |
| 2. Access counting | 선택한 표본의 접근 여부를 operations set에 맞는 방식으로 확인 |
| 3. Aggregation | 일정 시간 누적 → access 빈도로 환산 |

영역 기반 표본화로 전체 페이지를 매 주기 모두 검사하지 않지만, 보편적인 오버헤드 상한은 없습니다. 커널 문서는 모니터링 영역 수와 간격이 비용/정확도 tradeoff라고 설명합니다.

## DAMON 파라미터 튜닝

| 파라미터 | 의미 | 기본 | 권장 |
|---------|------|------|------|
| sample_interval | 표본 접근 확인 주기 | 커널/operations set 기본값 확인 | 목적에 맞춰 측정 |
| aggr_interval | 결과 집계 주기 | 커널 기본값 확인 | 목적에 맞춰 측정 |
| min_nr_regions | 최소 적응형 영역 수 | 커널 문서상 3 이상 | workload에 맞춰 조정 |
| max_nr_regions | 최대 적응형 영역 수 | 커널 기본값 확인 | overhead와 해상도로 조정 |
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

`sample_interval`을 줄이면 모니터링 비용이 늘 수 있습니다. 특정 밀리초를 보편적 경계로 쓰지 말고 결과 해상도와 overhead를 함께 측정합니다.

## DAMOS — 자동 액션

*DAMOS (DAMON-based Operation Schemes)*는 *DAMON 측정 결과에 따라 자동 액션*을 취합니다.

| Action | 의미 |
|--------|------|
| pageout | 대상 영역의 page reclaim을 시도 |
| migrate_hot | hot page를 *상위 tier로 promotion* |
| migrate_cold | cold page를 *하위 tier로 demotion* |
| lru_prio | LRU 우선순위 높임 |
| lru_deprio | LRU 우선순위 낮춤 |
| stat | 통계만 (action 없음) |
| nohugepage | huge page 비활성 |

```bash
# Scheme 추가 — cold page를 CXL.mem으로 demotion
# 아래 sysfs 노드와 scheme 파일은 커널/CONFIG에 맞춰 생성·확인한 상태라고 가정합니다.
$ cd /sys/kernel/mm/damon/admin/kdamonds/0/contexts/0/schemes
$ echo 1 > nr_schemes
$ cd 0/

$ echo migrate_cold > action
$ echo 2 > target_nid    # CXL node

# Access pattern — 10초 동안 1번 이하 access
$ echo 0 > access_pattern/nr_accesses/min
$ echo 1 > access_pattern/nr_accesses/max

# 영역 크기 — 1 MB 이상
$ echo 1048576 > access_pattern/sz/min
$ echo $((1024*1024*1024*1024)) > access_pattern/sz/max

# Watermark metric과 점검 주기·경계는 커널 문서와 실제 free-memory 정책에 맞춰 설정합니다.
$ echo free_mem_rate > watermarks/metric
$ echo 5000000 > watermarks/interval_us
$ echo 600 > watermarks/high
$ echo 500 > watermarks/mid
$ echo 300 > watermarks/low

# 적용량 제한: reset 주기 안에서 scheme이 시도할 최대 바이트 수
$ echo 1048576 > quotas/bytes
$ echo 1000 > quotas/reset_interval_ms
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

# 자동 promotion 활성
$ echo 2 > /proc/sys/kernel/numa_balancing   # NUMA_BALANCING_MEMORY_TIERING mode
```

위 sysctl은 NUMA balancing의 memory-tiering mode를 선택하지만, 장치·펌웨어가 자동으로 올바른 tier를 구성한다는 보장은 아닙니다. `/sys/devices/virtual/memory_tiering/memory_tierN/nodelist`는 현재 tier 소속을 보여 주는 읽기 전용 관찰값이며, 사용 가능한 경로와 값은 커널 버전 및 실제 tier 구성에서 확인합니다.

## Promotion·Demotion 추적

실시간 모니터링:

```bash
# 1. DAMON access report (정확한 출력 형식은 설치한 damo 버전 확인)
$ damo monitor --kdamonds 0
# DAMON access estimate; region's NUMA node is not supplied by this output.
# Placement must be correlated with an independent node allocation/migration source.

# 2. Migration 이벤트 트레이싱
$ cat /sys/kernel/debug/tracing/events/migrate/mm_migrate_pages/enable
1
$ cat /sys/kernel/debug/tracing/trace_pipe | grep mm_migrate_pages
# Read the fields documented by this kernel's tracefs format file.

# 3. perf로 migration 통계
$ perf stat -e migrate:mm_migrate_pages -a sleep 60
 Performance counter stats for 'system wide':

       123,456    migrate:mm_migrate_pages  # illustrative tracepoint hit count, not pages or bytes

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
- `access_pattern/nr_accesses/min` 조건을 workload에서 조정하고 결과를 다시 측정
- `aggr_interval`을 바꾸기 전 분류 반응성과 monitoring 비용을 함께 비교

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
- 애플리케이션/운영 정책에서 hysteresis를 두고 다시 이동시키기 전 관찰 구간을 둡니다. DAMOS quota 자체는 page별 cool-down timer가 아닙니다.
- DAMOS quota로 reset 구간마다 적용 바이트/시간 상한을 설정합니다.
  ```bash
  $ echo 1048576 > quotas/bytes
  $ echo 1000 > quotas/reset_interval_ms
  ```

### Promotion 실패

DDR tier가 full일 때:

```text
[Illustrative condition, not a captured log]
DAMOS attempted bytes differ from applied bytes; inspect migration and kernel diagnostics
```

시도한 크기와 적용한 크기가 다르거나 커널 로그에 migration 실패가 보이면 대상 node의 여유 메모리, 허용 노드 mask, 페이지 이동 가능성과 해당 커널의 진단 정보를 확인합니다.

해결:
- 먼저 대상 node의 free memory, 허용 노드 mask, 페이지 이동 가능성, kernel log를 확인합니다.
- `vm.min_free_kbytes` 증가는 전역 메모리 회수 동작에 영향을 주므로 일반 해결책처럼 적용하지 않습니다.
- `damos demote-first`는 여기서 확인된 보편적인 sysfs action으로 제시하지 않습니다.

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

## 워크로드별 설정 검증

특정 애플리케이션 종류에 보편적인 `sample_interval`, `aggr_interval`, access threshold, quota 값은 없습니다. 읽기 전용 관찰로 시작해 분류 결과와 CPU·latency 영향을 기준선과 비교하고, 이후 제한된 quota의 scheme을 단계적으로 시험합니다. 지연 민감한 workload도 DAMON 비용과 이득을 실제 구성에서 benchmark한 뒤 사용 여부를 정합니다.

## bpftrace로 migration 캡처

깊은 추적:

```bash
$ bpftrace -e '
  tracepoint:migrate:mm_migrate_pages {
    @succeeded = sum(args->succeeded);
    @failed = sum(args->failed);
  }
  interval:s:60 {
    print(@succeeded);
    print(@failed);
    clear(@succeeded);
    clear(@failed);
  }
'

# 출력 예시 (tracepoint 필드의 예시 값; 특정 실행 결과가 아님)
@succeeded: 1230
@failed: 4
```

`migrate:mm_migrate_pages`는 현재 Linux tracepoint에서 `succeeded`, `failed`, `reason` 등의 집계 필드를 제공하지만 source/destination node 쌍은 제공하지 않습니다. 이 집계만으로 DDR→CXL과 CXL→DDR 방향을 나눌 수는 없습니다. 실제 schema는 대상 시스템의 `tracefs/events/migrate/mm_migrate_pages/format`에서 확인하세요.

## Performance Regression 사례

*DAMON 활성화 후 throughput 떨어진* 경우:

원인 추정:
- *sample_interval 너무 작음* — overhead와 정확도를 workload에서 함께 측정
- *migration 자체 비용* — 대상 페이지 수·고정 가능성·목적 노드 압력 등에 따라 latency가 달라짐
- *monitoring 방식과 memory access tracking* — architecture·operations set에 따라 추가 비용이 달라짐

해결 순서:
1. *aggr_interval 조정* 후 access classification과 overhead를 다시 비교
2. *DAMOS quota를 제한*하고 적용 통계를 비교
3. *DAMOS scheme 비활성*하고 *모니터링만*
4. 그래도 문제 → DAMON 비활성

## 자주 만나는 함정

| 증상 | 원인 |
|------|------|
| DAMON 활성화했는데 access % 모두 0 | `ops`가 잘못 — paddr인지 vaddr인지 |
| Tier 정보 없음 | HMAT 누락 — BIOS 확인 |
| Migration이 안 일어남 | watermark 임계 안 됨 — `watermarks/low` 확인 |
| Migration 너무 많음 | quota 미설정 |
| CXL 노드 사용량 안 늘어남 | memory policy, tier 구성, eligible memory, 이동 성공 통계를 각각 확인 |
| Workload throughput 떨어짐 | monitoring과 migration 비용을 분리해 측정한 뒤 interval·quota를 조정 |
| `damo` 명령 안 보임 | 사용자 공간 DAMON 도구 미설치 또는 PATH/환경 문제. 배포판 설치 지침을 확인 |
| migration 뒤 fault 발생 | 로그와 workload·kernel의 page migration 및 device failure 경로를 조사. 단일 원인으로 DAMON에 귀속하지 않음 |

## 정리

- *DAMON*은 *region sampling으로 page activity*를 추정하며, 측정 비용과 정확도는 interval·region 수·operations set에 따라 달라집니다.
- *DAMOS*는 측정 결과에 따라 *promotion·demotion·pageout 자동 액션*.
- *Tiered memory* 구성은 성능 거리 정보와 플랫폼/커널 설정에 의존하며 DAMON·DAMOS는 별도 보조 경로입니다.
- *흔한 문제*는 *false promotion·thrashing·promotion 실패·NUMA balance 충돌* 4가지.
- 파라미터는 workload별로 검증합니다. 지연 민감 workload에서 DAMON을 쓰지 않는 선택도 benchmark로 판단합니다.
- bpftrace의 *migrate tracepoint*로 *migration 흐름 깊이 분석* 가능.

## 다음 장 예고

Memory Diagnostics 시리즈의 *CXL 관련 마무리*. 다음 깊이는 *Postmortem Debugging Ch 5~6*의 *core dump·fabric* 분석으로 자연 연결.

## 관련 항목

- [Ch 1: 리눅스 메모리 회계 — RSS·VSS·PSS·smaps 해석](/blog/tools/debugging/memory/chapter01-memory-accounting)
- [Ch 6: CXL 메모리 진단](/blog/tools/debugging/memory/chapter06-cxl-memory-diagnostics)
- [Embedded Performance Engineering Ch 55: CXL 성능 프로파일링 도구](/blog/embedded/performance-engineering/part5-11-cxl-profiling-tools)
- [HBM·GDDR 심화 Ch 9: CXL.mem 분석](/blog/embedded/hardware/hbm/chapter09-cxl-mem)
- [Postmortem Debugging Ch 5: CXL 디바이스 Core Dump 분석](/blog/tools/debugging/postmortem/chapter05-cxl-device-postmortem)

## 공식 자료

- [Linux DAMON design and DAMOS actions](https://docs.kernel.org/mm/damon/design.html)
- [Linux DAMON sysfs interface](https://docs.kernel.org/admin-guide/mm/damon/usage.html)
- [Linux NUMA balancing sysctl](https://docs.kernel.org/admin-guide/sysctl/kernel.html#numa-balancing)
- [Linux migration tracepoint definition](https://github.com/torvalds/linux/blob/master/include/trace/events/migrate.h)
