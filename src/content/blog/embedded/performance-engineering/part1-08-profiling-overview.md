---
title: "1-08: 프로파일링 개요 — Sampling vs Instrumentation, PGO·LTO"
date: 2026-05-08T08:00:00
description: "두 큰 접근 — Sampling (perf, low overhead) vs Instrumentation (gprof, accurate but slow). PGO로 최적화."
series: "Embedded Performance Engineering"
seriesOrder: 8
tags: [profiling, sampling, instrumentation, gprof, perf, pgo, lto]
draft: true
---

## 한 줄 요약

> **"Sampling = 가볍지만 noisy, Instrumentation = 정확하지만 무거움"** — 상황에 맞춰.

## Sampling Profiling

**주기적 interrupt**로 *현재 PC 캡처*. 통계적 추정.

```text
1000 Hz timer interrupt:
매 1 ms마다 PC 기록
1초 동안 1000 sample
주요 hot function = sample 많은 곳
```

### 장단점

✓ **낮은 overhead** (1-5%)
✓ Production에서 사용 가능
✓ 외부 sampling tool — *코드 수정 X*
✗ 짧은 함수 (< 1ms) 놓침
✗ Sample rate × 시간 sample size

### 대표 도구

- **perf** (Linux) — 1 kHz 기본
- **gperftools** (Google) — user-space
- **Instruments** (macOS)
- **Visual Studio Profiler** (Windows)

## Instrumentation Profiling

각 함수 진입·exit에 *카운터 + 시간 기록*.

```c
// 컴파일러가 자동 삽입 (-pg)
void func() {
    __cyg_profile_func_enter(...);
    // ...
    __cyg_profile_func_exit(...);
}
```

### 장단점

✓ **정확** — 모든 호출 카운트
✓ Call graph 정확
✓ 짧은 함수 잡힘
✗ 큰 overhead (20-200%)
✗ 측정값이 *현실과 다름* (probe effect)

### 대표 도구

- **gprof** — `-pg` 컴파일
- **callgrind** (Valgrind) — 시뮬레이션
- **dtrace** — 동적 instrumentation
- **eBPF** — kernel·user-space dynamic

## perf — Linux 표준

```bash
# Sampling
perf record -F 999 -p PID -g -- sleep 30
perf report

# Aggregate stats
perf stat ./myapp
# task-clock, cycles, instructions, cache-misses 등 자동 수집
```

### Flamegraph

```bash
perf record -F 99 -g ./app
perf script | stackcollapse-perf.pl | flamegraph.pl > out.svg
```

CPU 사용 분포 *시각화* — hot path 즉시 인식.

## eBPF — 모던 Dynamic Tracing

Linux kernel + user-space *bytecode 주입*. 정확 + low overhead.

```bash
# bpftrace
bpftrace -e 'tracepoint:syscalls:sys_enter_read { @[comm] = count(); }'

# BCC 도구
opensnoop          # file opens
biolatency         # disk I/O latency
funclatency        # function latency
```

CSV·flamegraph·histogram 자동 출력. *Brendan Gregg* 추천 도구.

## ftrace — Linux Kernel Tracer

```bash
echo function > /sys/kernel/debug/tracing/current_tracer
echo 'sys_*' > /sys/kernel/debug/tracing/set_ftrace_filter
echo 1 > /sys/kernel/debug/tracing/tracing_on

cat /sys/kernel/debug/tracing/trace
```

Kernel-only. *Function entry/exit* + *latency·event tracers*.

## 임베디드 — RTOS Tracer

| 도구 | RTOS | 특징 |
| --- | --- | --- |
| **Tracealyzer** (Percepio) | FreeRTOS·Zephyr·SafeRTOS | 상용, 강력 |
| **SystemView** (Segger) | FreeRTOS·embOS·µC/OS | 무료, J-Link 필수 |
| **Zephyr Tracing** | Zephyr | 내장 |
| **CTF** (Common Trace Format) | 모든 | 표준 포맷 |

```c
SEGGER_SYSVIEW_OnTaskStartExec(task);
SEGGER_SYSVIEW_OnTaskStopExec();
```

자동 hook + GUI viewer = *Linux ftrace 같은 시각화*.

## Profile-Guided Optimization (PGO)

```bash
# 1. Instrument 컴파일
gcc -fprofile-generate -o app app.c

# 2. 실 워크로드 실행 (training)
./app < training_data

# 3. profile 데이터 사용 재컴파일
gcc -fprofile-use -O3 -o app app.c
```

**컴파일러가 hot path 우대** — branch prediction·inline·register 할당.

### 효과

```text
Without PGO:  100 ms
With PGO:      85-90 ms (10-15% 개선)
```

- *Branch unlikely* 자동 hint
- Hot function inline
- Layout optimization (hot code clustering)

## Link-Time Optimization (LTO)

```bash
gcc -flto -O3 -o app *.c
```

링크 시점에 *전체 프로그램 보기* — cross-file inline·DCE·constant prop.

### 효과

```text
Without LTO:  100 ms
With LTO:      90-95 ms (5-10%)
With PGO + LTO: 80-85 ms (15-20%)
```

조합 시 *순수 algorithmic 변화 없이* 15-20% 개선.

## 임베디드 적용

```bash
arm-none-eabi-gcc -flto -O2 -ffunction-sections -fdata-sections \
  -Wl,--gc-sections -o firmware.elf
```

- `-flto` — link-time optimization
- `-ffunction-sections -fdata-sections` + `--gc-sections` — 미사용 코드 제거
- 코드 크기 *10-20% 감소* + 성능 *5-10% 향상*

## Microbenchmark vs System Benchmark

| | Microbench | System |
| --- | --- | --- |
| 대상 | 단일 함수 | 전체 app |
| Overhead | 작음 | 큼 |
| 결과 활용 | 알고리즘 비교 | 사용자 경험 |
| 위험 | *현실 안 반영* | *어디가 느린지 X* |

**둘 다 필요** — System bench로 *bottleneck 식별* → Microbench로 *대안 비교*.

## Profiler Output 해석

### perf report

```text
Samples: 10K of event 'cycles', Event count: 5,200,000,000
Overhead  Command  Shared Object  Symbol
  35.0%   app      app            [.] hot_function
  20.0%   app      libc.so        [.] memcpy
  15.0%   app      [kernel]       [k] schedule
```

**Self vs Cumulative** — self는 *그 함수 자체*, cumulative는 *호출한 모든 함수 포함*.

### gprof output

```text
% time   self  cumulative
35.00    1.0     1.0       hot_function
20.00    0.5     1.5       memcpy_call_chain
```

함수별 *시간 + call count*. Call graph 별도 섹션.

## Inclusive vs Exclusive Time

```text
foo() {
  for (...) bar();   // 90 ms
  baz();             // 5 ms
  return;            // 5 ms self
}

foo의 inclusive: 100 ms (모든 호출 포함)
foo의 exclusive (self): 10 ms (bar·baz 제외)
```

**Exclusive (self) time이 큰 함수 = 직접 최적화 대상**.

## 자주 하는 실수

> ⚠️ Sample rate 너무 낮음

10 Hz로 5초 sampling → 50 sample. 결론 X. **최소 99 Hz × 30+ sec**.

> ⚠️ Debug build profile

`-O0`로 측정한 hot path와 `-O2` hot path는 *완전 다름*. **Release build로 profile**.

> ⚠️ Profile 후 *예상* 함수 수정

Profile 결과가 *예상과 다를 때* 진짜 학습 — *측정이 답*.

> ⚠️ Production에서 instrumentation

20-200% overhead로 *production 망가짐*. *Sampling만 production*.

## 정리 — Part 1 마무리

- **Sampling** (low overhead, statistical) vs **Instrumentation** (accurate, heavy).
- **perf** = Linux 표준, **eBPF** = 모던 dynamic.
- **SystemView·Tracealyzer** = 임베디드 RTOS trace.
- **PGO + LTO** = 15-20% 무료 성능.
- Release build로 profile + production은 sampling만.

**Part 1 (Performance Analysis Fundamentals) 종료**. Part 2부터 CPU·Microarchitecture deep dive.

## 관련 항목

- [1-07: 성능 모델링](/blog/embedded/performance-engineering/part1-07-modeling)
- [5-01: perf 기초](/blog/embedded/performance-engineering/part5-01-perf-basics)
- [5-05: Flamegraph 분석](/blog/embedded/performance-engineering/part5-05-flamegraph)
