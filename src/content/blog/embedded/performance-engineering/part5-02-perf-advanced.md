---
title: "Linux perf 고급 — Raw Event·Tracepoint·perf script"
date: 2026-04-27T09:01:00
description: "perf의 raw event, tracepoint, perf script Python을 사용한 커스텀 분석."
series: "Embedded Performance Engineering"
seriesOrder: 41
tags: [perf, raw-event, scripting, tracepoint]
---

## 한 줄 요약

> **"perf의 진짜 힘은 raw event와 perf script에 있으며, 두 가지를 묶으면 사용자 정의 분석기를 만들 수 있습니다."**

## 어떤 문제를 푸는가

5-01에서 본 `perf stat`과 `perf record`는 cycle과 cache-miss 정도의 기본 metric에 머뭅니다. 실제 튜닝 현장에서는 특정 micro-architecture event를 측정하거나, 특정 함수 호출을 trace하거나, sampling 결과를 자체 포맷으로 가공해야 합니다.

`perf list`가 보여주는 hundreds의 event 중에는 PMU vendor-specific raw event가 절반 이상입니다. 그중 의미 있는 event를 골라 측정하고, 결과를 `perf script`로 후처리하면 vendor profiler 없이도 동등한 분석이 가능합니다.

이 글에서는 raw event 코드 지정, tracepoint 활용, perf script Python 후처리, 그리고 sampling overhead를 다룹니다.

## perf list — 사용 가능한 이벤트 둘러보기

```bash
perf list                    # 모든 event
perf list cache              # cache 관련만
perf list 'sched:*'          # tracepoint 패턴
perf list pmu                # PMU 카운터 전체
```

분류는 크게 네 가지로 나뉩니다.

```text
Hardware event   — cycles, instructions, cache-misses, branch-misses
Software event   — context-switches, page-faults, cpu-clock
Hardware cache   — L1-dcache-loads, LLC-load-misses
Tracepoint       — sched:sched_switch, syscalls:sys_enter_read
Raw PMU          — r<event_code> 형식의 vendor event
```

ARM Cortex-A에서 자주 쓰는 raw event 예시는 다음과 같습니다.

```bash
perf stat -e r03 -e r04 ./app          # L1D refill, L1D access
perf stat -e armv8_pmuv3/l2d_cache_refill/ ./app
```

`r03`은 Cortex-A의 architectural PMU event number 0x03을 의미하며, TRM에서 정의를 찾을 수 있습니다.

## Hardware Event 묶음 측정

```bash
perf stat -e cycles,instructions,cache-references,cache-misses,\
branch-instructions,branch-misses ./app
```

같은 group으로 묶으면 PMU counter가 부족할 때 multiplex되지 않습니다.

```bash
perf stat -e '{cycles,instructions,cache-misses}' ./app
```

PMU counter는 보통 코어당 4-6개로 제한되므로, event가 그보다 많으면 시간 분할로 측정되어 정확도가 떨어집니다. Group은 동시 측정 보장을 의미합니다.

## Software Event와 시스템 동작

```bash
perf stat -e context-switches,cpu-migrations,page-faults,\
minor-faults,major-faults ./app
```

| Event | 의미 |
|---|---|
| `context-switches` | 컨텍스트 스위치 횟수 |
| `cpu-migrations` | 코어 간 이주 횟수 |
| `page-faults` | 페이지 폴트 총합 |
| `minor-faults` | 디스크 I/O 없이 해결된 폴트 |
| `major-faults` | 디스크에서 읽어온 폴트 |

Major fault가 많이 보이면 워킹셋이 RAM보다 크거나 swap이 활성화된 경우입니다.

## Tracepoint — 커널 이벤트

Tracepoint는 커널이 미리 심어 둔 static probe입니다. 거의 zero overhead이며 비활성 상태에서는 NOP 한 줄과 같습니다.

```bash
perf record -e sched:sched_switch -a sleep 5
perf script | head
```

```text
swapper     0 [000] 1234.567: sched:sched_switch: prev_comm=swapper prev_pid=0 prev_prio=120 prev_state=R ==> next_comm=app next_pid=1234 next_prio=120
```

자주 쓰는 tracepoint 카테고리입니다.

```text
sched:*       — 스케줄러
syscalls:*    — 시스템 호출 enter/exit
irq:*         — 인터럽트
block:*       — block I/O
net:*         — 네트워크
kmem:*        — 커널 메모리
```

## perf record와 Call Graph

```bash
perf record -g --call-graph dwarf ./app
perf record -g --call-graph fp ./app
perf record -g --call-graph lbr ./app
```

- `dwarf` — DWARF debug info 기반, 정확하지만 무겁습니다
- `fp` — frame pointer 기반, 빠르지만 `-fno-omit-frame-pointer`로 컴파일되어야 합니다
- `lbr` — Intel Last Branch Record, x86 전용으로 가장 빠릅니다

ARM에서는 frame pointer가 가장 무난한 선택이며, DWARF는 stack copy로 인해 5-10% overhead가 추가됩니다.

```bash
perf report -g graph,0.5,caller
```

`graph` 형식은 caller 트리를 보여주며, `caller`는 호출자를 위로, `callee`는 피호출자를 위로 정렬합니다.

## perf script — Python 후처리

`perf script`는 record한 데이터를 텍스트로 출력합니다. 그대로 보면 길지만, Python script로 가공하면 자유로운 분석이 가능합니다.

```bash
perf script -i perf.data > trace.txt
perf script -g python                   # 스켈레톤 생성
```

생성된 `perf-script.py`를 편집해 콜백을 채웁니다.

```python
def sched__sched_switch(event_name, context, common_cpu, common_secs,
                         common_nsecs, common_pid, common_comm,
                         common_callchain, prev_comm, prev_pid, prev_prio,
                         prev_state, next_comm, next_pid, next_prio):
    if next_comm.startswith("app"):
        print(f"{common_secs}.{common_nsecs:09d} cpu{common_cpu} "
              f"{prev_comm} -> {next_comm}")
```

실행은 다음과 같습니다.

```bash
perf script -s perf-script.py
```

특정 프로세스의 wake-up latency를 직접 계산하거나, 함수별 sample 분포를 자체 포맷으로 출력할 수 있습니다.

## perf top — 실시간 hotspot

```bash
perf top -p <pid>
perf top -e cache-misses
perf top -g
```

`perf top`은 1초마다 sampling 결과를 refresh하며, 가장 hot한 함수가 위로 올라옵니다. Production에서 lightweight하게 응급 진단할 때 유용합니다.

## perf sched — 스케줄러 분석

```bash
perf sched record -- ./app
perf sched latency                    # wake-up latency 통계
perf sched timehist                   # 시간순 상세
perf sched map                        # ASCII chart
```

```text
Task                   Runtime ms    Switches    Avg delay ms    Max delay ms
app:1234                  500.123         800           0.045           1.234
kworker:5                  10.456         120           0.012           0.345
```

Real-time task가 정해진 deadline 안에 깨어났는지 확인할 때 핵심 도구입니다.

## perf mem과 perf c2c

```bash
perf mem record ./app
perf mem report

perf c2c record ./app
perf c2c report
```

`perf mem`은 load/store latency를 측정하고, `perf c2c`는 cache-to-cache traffic으로 false sharing을 찾아냅니다. Cortex-A 일부 PMU에서 지원하며, x86은 PEBS와 결합되어 더 정밀합니다.

## Sampling Overhead 측정

```bash
# 기본 sampling rate (4 kHz)
perf record -F 4000 ./app

# 낮은 rate (1 kHz) — overhead 감소
perf record -F 1000 ./app

# 정확한 cycle 단위 sampling
perf record -e cycles -c 1000000 ./app
```

Sampling rate가 높을수록 정확도가 올라가지만 overhead도 증가합니다. 일반적인 권장은 1-4 kHz이며, ARM Cortex-A에서는 4 kHz에서 약 2-5% overhead를 봅니다.

## 자주 보는 함정과 안티패턴

> ⚠️ Frame pointer 없이 callchain 수집

```bash
gcc -O2 app.c                    # -fno-omit-frame-pointer 누락
perf record -g --call-graph fp   # callchain 깨짐
```

`-fno-omit-frame-pointer`를 추가하거나 `--call-graph dwarf`를 사용해야 합니다.

> ⚠️ Multiplex된 event를 정확하다고 믿기

```bash
perf stat -e e1,e2,e3,e4,e5,e6,e7,e8 ./app
```

PMU counter가 4개인 시스템에서 8개 event를 측정하면 multiplex됩니다. `time enabled / time running` 비율을 확인해야 합니다.

> ⚠️ Tracepoint를 부담스럽다고 회피

Tracepoint는 거의 zero overhead입니다. 활성화 전에는 NOP 한 줄과 같아 부담이 없으며, 활성화 시에도 callback 비용만 추가됩니다.

> ⚠️ perf top을 장시간 실행

`perf top`은 표시 화면 갱신을 위해 추가 CPU를 사용합니다. 30분 이상 켜 두면 측정 대상보다 perf 자체가 noise가 되기 쉽습니다.

## 정리

- `perf list`로 hardware, software, cache, tracepoint, raw PMU event를 둘러봅니다.
- Raw event는 `r<code>` 또는 `pmu/event=.../` 형식으로 vendor-specific하게 지정합니다.
- Tracepoint는 거의 zero overhead이며 sched, syscalls, irq, block 카테고리가 대표적입니다.
- `perf script`에 Python 콜백을 붙여 커스텀 분석기를 만들 수 있습니다.
- `perf sched`, `perf mem`, `perf c2c`로 스케줄링과 false sharing을 진단합니다.
- Sampling rate가 정확도와 overhead의 trade-off이며 1-4 kHz가 표준입니다.

다음 편은 **ftrace 활용** — 커널 내부 흐름을 추적합니다.

## 관련 항목

- [5-01: perf 기초](/blog/embedded/performance-engineering/part5-01-perf-basics)
- [5-03: ftrace 활용](/blog/embedded/performance-engineering/part5-03-ftrace)
- [4-09: Cache Coherency](/blog/embedded/performance-engineering/part4-09-cache-coherency)
- [Practical RTOS Internals 2-11: Tracing·Observability](/blog/embedded/rtos/practical-internals/part2-11-tracing-observability)
