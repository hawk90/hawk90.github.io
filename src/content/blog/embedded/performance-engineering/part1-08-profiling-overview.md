---
title: "프로파일링 기법 개요 — Sampling vs Instrumentation·PGO·LTO"
date: 2026-04-23T09:08:00
description: "두 가지 큰 접근을 비교합니다. Sampling은 perf처럼 가볍고 Instrumentation은 gprof처럼 정확하지만 무겁습니다. PGO로 최적화하는 방법도 다룹니다."
series: "Embedded Performance Engineering"
seriesOrder: 8
tags: [profiling, sampling, instrumentation, gprof, perf, pgo, lto]
draft: false
---

## 한 줄 요약

> **Sampling은 가볍지만 noisy하고, Instrumentation은 정확하지만 무겁습니다.** 상황에 맞춰 골라야 합니다.

## Sampling Profiling

**주기적 interrupt**로 *현재 PC를 캡처*하는 통계적 추정 방식입니다.

```text
1000 Hz timer interrupt:
매 1 ms마다 PC 기록
1초 동안 1000 sample
주요 hot function = sample 많은 곳
```

### 장단점

- **낮은 overhead** (1-5%)입니다.
- Production에서 사용할 수 있습니다.
- 외부 sampling tool이므로 *코드 수정이 필요 없습니다*.
- 짧은 함수 (< 1ms)는 놓칠 수 있습니다.
- Sample size는 sample rate에 시간을 곱한 값입니다.

### 대표 도구

- **perf** (Linux) — 1 kHz 기본입니다.
- **gperftools** (Google) — user-space입니다.
- **Instruments** (macOS)
- **Visual Studio Profiler** (Windows)

## Instrumentation Profiling

각 함수 진입과 exit에 *카운터와 시간을 기록*합니다.

```c
// 컴파일러가 자동 삽입 (-pg)
void func() {
    __cyg_profile_func_enter(...);
    // ...
    __cyg_profile_func_exit(...);
}
```

### 장단점

- **정확합니다.** 모든 호출이 카운트됩니다.
- Call graph가 정확합니다.
- 짧은 함수도 잡힙니다.
- Overhead가 큽니다 (20-200%).
- 측정값이 *현실과 다를 수* 있습니다 (probe effect).

### 대표 도구

- **gprof** — `-pg`로 컴파일합니다.
- **callgrind** (Valgrind) — 시뮬레이션 방식입니다.
- **dtrace** — 동적 instrumentation입니다.
- **eBPF** — kernel과 user-space 모두 동적 가능합니다.

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

CPU 사용 분포가 *시각화*되어 hot path를 즉시 인식할 수 있습니다.

## eBPF — 모던 Dynamic Tracing

Linux kernel과 user-space에 *bytecode를 주입*합니다. 정확하면서 low overhead입니다.

```bash
# bpftrace
bpftrace -e 'tracepoint:syscalls:sys_enter_read { @[comm] = count(); }'

# BCC 도구
opensnoop          # file opens
biolatency         # disk I/O latency
funclatency        # function latency
```

CSV, flamegraph, histogram을 자동 출력합니다. *Brendan Gregg*가 추천하는 도구입니다.

## ftrace — Linux Kernel Tracer

```bash
echo function > /sys/kernel/debug/tracing/current_tracer
echo 'sys_*' > /sys/kernel/debug/tracing/set_ftrace_filter
echo 1 > /sys/kernel/debug/tracing/tracing_on

cat /sys/kernel/debug/tracing/trace
```

Kernel-only입니다. *Function entry/exit*와 *latency·event tracers*를 제공합니다.

## 임베디드 — RTOS Tracer

| 도구 | RTOS | 특징 |
| --- | --- | --- |
| **Tracealyzer** (Percepio) | FreeRTOS·Zephyr·SafeRTOS | 상용이며 강력합니다 |
| **SystemView** (Segger) | FreeRTOS·embOS·µC/OS | 무료지만 J-Link가 필수입니다 |
| **Zephyr Tracing** | Zephyr | 내장입니다 |
| **CTF** (Common Trace Format) | 모든 RTOS | 표준 포맷입니다 |

```c
SEGGER_SYSVIEW_OnTaskStartExec(task);
SEGGER_SYSVIEW_OnTaskStopExec();
```

자동 hook과 GUI viewer로 *Linux ftrace 같은 시각화*가 가능합니다.

## Profile-Guided Optimization (PGO)

```bash
# 1. Instrument 컴파일
gcc -fprofile-generate -o app app.c

# 2. 실 워크로드 실행 (training)
./app < training_data

# 3. profile 데이터 사용 재컴파일
gcc -fprofile-use -O3 -o app app.c
```

**컴파일러가 hot path를 우대**합니다. Branch prediction, inline, register 할당이 모두 최적화됩니다.

### 효과

```text
Without PGO:  100 ms
With PGO:      85-90 ms (10-15% 개선)
```

- *Branch unlikely* 자동 hint를 줍니다.
- Hot function이 inline됩니다.
- Layout optimization (hot code clustering)이 적용됩니다.

## Link-Time Optimization (LTO)

```bash
gcc -flto -O3 -o app *.c
```

링크 시점에 *전체 프로그램을 볼 수 있어서* cross-file inline, DCE, constant propagation이 가능합니다.

### 효과

```text
Without LTO:  100 ms
With LTO:      90-95 ms (5-10%)
With PGO + LTO: 80-85 ms (15-20%)
```

조합하면 *순수 algorithmic 변화 없이도* 15-20%가 개선됩니다.

## 임베디드 적용

```bash
arm-none-eabi-gcc -flto -O2 -ffunction-sections -fdata-sections \
  -Wl,--gc-sections -o firmware.elf
```

- `-flto`는 link-time optimization을 켭니다.
- `-ffunction-sections -fdata-sections` + `--gc-sections`로 미사용 코드를 제거합니다.
- 코드 크기는 *10-20% 감소*하고 성능은 *5-10% 향상*됩니다.

## Microbenchmark vs System Benchmark

| | Microbench | System |
| --- | --- | --- |
| 대상 | 단일 함수 | 전체 app |
| Overhead | 작음 | 큼 |
| 결과 활용 | 알고리즘 비교 | 사용자 경험 |
| 위험 | *현실을 반영하지 못합니다* | *어디가 느린지 알 수 없습니다* |

**둘 다 필요합니다.** System bench로 *bottleneck을 식별*하고, Microbench로 *대안을 비교*합니다.

## Profiler Output 해석

### perf report

```text
Samples: 10K of event 'cycles', Event count: 5,200,000,000
Overhead  Command  Shared Object  Symbol
  35.0%   app      app            [.] hot_function
  20.0%   app      libc.so        [.] memcpy
  15.0%   app      [kernel]       [k] schedule
```

**Self vs Cumulative**가 중요합니다. self는 *그 함수 자체*만, cumulative는 *호출한 모든 함수를 포함*합니다.

### gprof output

```text
% time   self  cumulative
35.00    1.0     1.0       hot_function
20.00    0.5     1.5       memcpy_call_chain
```

함수별 *시간과 call count*가 표시됩니다. Call graph는 별도 섹션으로 나옵니다.

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

**Exclusive (self) time이 큰 함수가 직접 최적화 대상**입니다.

## 자주 하는 실수

> ⚠️ Sample rate 너무 낮음

10 Hz로 5초 sampling은 50 sample뿐이라 결론을 낼 수 없습니다. **최소 99 Hz × 30초 이상**이 필요합니다.

> ⚠️ Debug build profile

`-O0`로 측정한 hot path와 `-O2` hot path는 *완전히 다릅니다*. **Release build로 profile**해야 합니다.

> ⚠️ Profile 후 *예상* 함수 수정

Profile 결과가 *예상과 다를 때* 진짜 학습이 됩니다. *측정이 답*입니다.

> ⚠️ Production에서 instrumentation

20-200% overhead로 *production이 망가집니다*. *Production에서는 sampling만* 사용해야 합니다.

## 정리 — Part 1 마무리

- **Sampling**은 low overhead의 statistical 방식이고, **Instrumentation**은 accurate하지만 heavy합니다.
- **perf**는 Linux 표준이고, **eBPF**는 모던 dynamic tracing입니다.
- **SystemView, Tracealyzer**는 임베디드 RTOS trace에 씁니다.
- **PGO와 LTO**를 결합하면 15-20%의 무료 성능을 얻습니다.
- Release build로 profile하고 production에서는 sampling만 사용합니다.

**Part 1 (Performance Analysis Fundamentals)이 끝났습니다.** Part 2부터는 CPU와 Microarchitecture를 깊이 다룹니다.

## 관련 항목

- [1-07: 성능 모델링](/blog/embedded/performance-engineering/part1-07-modeling)
- [5-01: perf 기초](/blog/embedded/performance-engineering/part5-01-perf-basics)
- [5-05: Flamegraph 분석](/blog/embedded/performance-engineering/part5-05-flamegraph)
