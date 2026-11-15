---
title: "Linux perf 고급 — Raw Event·Tracepoint·perf script"
slug: "embedded/performance-engineering/part5-02-perf-advanced"
date: 2026-04-27T09:01:00
description: "perf의 raw event, tracepoint, perf script Python을 사용한 커스텀 분석."
series: "Embedded Performance Engineering"
seriesOrder: 41
tags: [perf, raw-event, scripting, tracepoint]
topics: ["embedded"]
---

## 한 줄 요약

> **"perf의 진짜 힘은 raw event와 perf script에 있으며, 두 가지를 묶으면 사용자 정의 분석기를 만들 수 있습니다."**

## 어떤 문제를 푸는가

5-01에서 본 `perf stat`과 `perf record`는 cycle과 cache-miss 정도의 기본 metric에 머뭅니다. 실제 튜닝 현장에서는 특정 micro-architecture event를 측정하거나, 특정 함수 호출을 trace하거나, sampling 결과를 자체 포맷으로 가공해야 합니다.

Event 수와 종류는 CPU·kernel·perf build에 따라 다릅니다. 그중 의미 있는 event를 골라 측정하고, 결과를 `perf script`로 후처리하면 선택한 관측 질문을 분석할 수 있습니다. Vendor profiler와 수집 범위가 같다는 뜻은 아닙니다.

이 글에서는 raw event 코드 지정, tracepoint 활용, perf script Python 후처리, 그리고 sampling overhead를 다룹니다.

이 장의 command·event group은 [Linux6.12 perf-stat 문서](https://github.com/torvalds/linux/blob/v6.12/tools/perf/Documentation/perf-stat.txt)와 대조했습니다. 이 환경에서는 Linux PMU/perf session을 실행하지 않았습니다. 예시 trace·latency는 실제 캡처가 아닙니다.

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

Raw encoding과 alias는 해당 PMU의 format·event 정의로 확인합니다. 아래는 Arm PMU에서 사용할 수 있는 문법 예이며 모든 Cortex-A·x86에 같은 code 의미가 보장되지 않습니다.

```bash
perf stat -e r03 -e r04 ./app          # L1D refill, L1D access
perf stat -e armv8_pmuv3/l2d_cache_refill/ ./app
```

`rN`은 PMU별 raw register encoding입니다. CPU TRM·event availability·perf의 format을 함께 확인하며 코드만 다른 ISA에 옮기지 않습니다.

## Hardware Event 묶음 측정

```bash
perf stat -e cycles,instructions,cache-references,cache-misses,\
branch-instructions,branch-misses ./app
```

Group의 event는 같은 관측 구간에 함께 schedule하는 단위입니다. 독립 event의 comma 목록과 다르며, group 자체가 다른 group과 time multiplex될 수 있습니다. 동시에 들어갈 수 없는 group은 not-counted가 될 수 있습니다.

```bash
perf stat -e '{cycles,instructions,cache-misses}' ./app
```

PMU counter 수는 CPU에 따라 다릅니다. 그룹 요청이 counter 제약을 넘으면 스케줄링 실패가 나거나 측정이 multiplex될 수 있으므로 `perf stat` 결과의 running/enabled 비율을 확인합니다.

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

Major fault는 보통 저장장치 I/O를 포함하지만, 이를 곧바로 메모리 압박으로 해석하지 말고 workload와 I/O 지표를 함께 봅니다.

## Tracepoint — 커널 이벤트

Tracepoint는 커널 코드에 정의된 probe입니다. 활성화하면 이벤트 빈도와 수집·기록 방식에 따른 비용이 생기며, 사용 가능한 이름과 필드는 커널 빌드에 따라 달라질 수 있습니다.

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

- `dwarf` — user stack sample과 unwind 정보에 의존, 크기·unwinder·누락 확인
- `fp` — frame pointer 기반, 빠르지만 `-fno-omit-frame-pointer`로 컴파일되어야 합니다
- `lbr` — 지원 x86 PMU의 Last Branch Record 경로, 지원 여부·capture 비용 확인

ARM 환경에서도 frame pointer와 DWARF의 지원·비용은 빌드와 커널에 따라 다릅니다. 두 방식을 대상 workload에서 비교하고 설정을 기록합니다.

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

선택한 perf build에서 생성한 callback signature·event format을 기준으로 편집합니다. Python scripting support가 build에 없을 수도 있습니다. 다음 callback은 개념 예이며 모든 kernel의 자동 생성 결과나 실행 검증된 API로 제시하지 않습니다.

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

위 callback의 syntax만 확인할 수 있으며 실제 perf dispatch·stack·timestamp 단위를 검증한 것은 아닙니다. 잘못된 event·권한·unsupported group·not-counted·lost sample을 정상 결과와 구분해 기록합니다.

## perf top — 실시간 hotspot

```bash
perf top -p 1234
perf top -e cache-misses
perf top -g
```

`perf top`은 설정한 주기로 화면을 갱신하며, 가장 hot한 함수가 위로 올라옵니다. 실제 수집 비용과 권한을 확인해 적용합니다.

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

`perf mem`의 이벤트와 memory-source 정보는 CPU·PMU별 지원에 따릅니다. `perf c2c`도 지원되는 PMU와 커널 구성에서 cache-line contention 단서를 제공합니다. 대상 장비의 `perf list`와 도구 문서를 확인합니다.

## Sampling Overhead 측정

```bash
# 샘플 주파수는 이벤트·장비에 맞춰 정하고 비용을 비교합니다.
perf record -F 99 ./app

# 비교용 rate, 99Hz보다 높음
perf record -F 1000 ./app

# event count period, 정확한 시간 측정과 별도
perf record -e cycles -c 1000000 ./app
```

높은 rate가 곧 더 정확한 결과를 보장하지 않습니다. Multiplex·lost sample·unwind 실패·sampling bias·오버헤드를 확인하고 같은 workload의 무계측 baseline과 비교합니다. 기존1~4kHz·2~5% 수치는 환경 근거가 없어 제거했습니다.

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

Counter 수뿐 아니라 event 제약·fixed counter·group에 따라 스케줄링이 달라집니다. `time enabled / time running` 비율을 확인해야 합니다.

> ⚠️ Tracepoint를 부담스럽다고 회피

Tracepoint는 사전 정의된 instrumentation point입니다. 비활성 상태의 구현과 활성화 비용은 tracepoint 종류·kernel config·event rate에 따라 달라집니다. 실제 대상에서 수집 전후 비용을 비교합니다.

> ⚠️ perf top을 장시간 실행

`perf top`은 표시 화면 갱신을 위해 추가 CPU를 사용합니다. 고정30분 임계값을 두지 말고 실제 표시·수집 비용과 report 크기를 확인합니다.

## 정리

- `perf list`로 hardware, software, cache, tracepoint, raw PMU event를 둘러봅니다.
- Raw event는 `r<code>` 또는 `pmu/event=.../` 형식으로 vendor-specific하게 지정합니다.
- Tracepoint는 sched, syscalls, irq, block 등에서 제공되며, 이름과 필드는 target kernel에서 확인합니다.
- `perf script`에 Python 콜백을 붙여 커스텀 분석기를 만들 수 있습니다.
- `perf sched`, `perf mem`, `perf c2c`로 스케줄링과 false sharing을 진단합니다.
- Sampling rate가 정확도와 overhead의 trade-off이므로 목표 workload에 맞춰 선택하고 비용을 확인합니다.

다음 편은 **ftrace 활용** — 커널 내부 흐름을 추적합니다.

## 관련 항목

- [5-01: perf 기초](/blog/embedded/performance-engineering/part5-01-perf-basics)
- [5-03: ftrace 활용](/blog/embedded/performance-engineering/part5-03-ftrace)
- [4-09: Cache Coherency](/blog/embedded/performance-engineering/part4-09-cache-coherency)
- [Practical RTOS Internals 2-11: Tracing·Observability](/blog/embedded/rtos/practical-internals/part2-11-tracing-observability)
- [DWARF: Call Frame Information](/blog/tools/debugging/dwarf-elf/chapter05-cfi-eh-frame) — `--call-graph dwarf`가 콜스택을 복원할 때 읽는 CFI
