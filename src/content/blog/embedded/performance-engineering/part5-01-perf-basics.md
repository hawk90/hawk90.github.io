---
title: "5-01: Linux perf 기초 — stat·record·report·script·top"
date: 2026-05-08T20:00:00
description: "Linux perf 표준 도구. stat·record·report·top. 기본 hardware event 활용."
series: "Embedded Performance Engineering"
seriesOrder: 39
tags: [perf, profiling, sampling, linux]
draft: true
---

## 한 줄 요약

> **"Linux perf = 가장 강력한 무료 profiler"** — kernel·user·hardware event 통합.

## 설치

```bash
# Ubuntu·Debian
sudo apt install linux-tools-common linux-tools-$(uname -r)

# 임베디드 (Yocto)
IMAGE_INSTALL += "perf"

# 확인
perf --version
```

## perf stat — 빠른 overview

```bash
sudo perf stat ./prog

# 출력
#  Performance counter stats for './prog':
#         1234.56 msec task-clock
#                 12   context-switches
#                  3   cpu-migrations
#                234   page-faults
#      5,123,456,789   cycles                # 4.150 GHz
#      8,234,567,890   instructions          # 1.61  insns per cycle
#        234,567,890   branches              # 190.0 M/sec
#            123,456   branch-misses         # 0.05% of all branches
```

핵심 metric:
- **IPC** = instructions / cycles (높을수록 좋음, target 1+)
- **Branch miss rate** = branch-misses / branches (< 1% 이상적)
- **Page faults** = memory pressure 표시

## 특정 Event 측정

```bash
sudo perf stat -e cycles,instructions,cache-references,cache-misses ./prog

# Raw events (PMU 직접)
sudo perf stat -e r03,r04 ./prog   # ARM L1D_CACHE_REFILL, L1D_CACHE

# Multiple groups
sudo perf stat -e '{cycles,instructions},{cache-references,cache-misses}' ./prog
```

## perf list — Event 목록

```bash
perf list

# Hardware
#   cpu-cycles OR cycles
#   instructions
#   cache-references
#   cache-misses
#   branch-instructions OR branches
#   branch-misses
#   bus-cycles
#   stalled-cycles-frontend
#   stalled-cycles-backend
#   ref-cycles
#
# Software
#   cpu-clock
#   task-clock
#   page-faults OR faults
#   context-switches OR cs
#   cpu-migrations OR migrations
#   minor-faults
#   major-faults
#
# Cache
#   L1-dcache-loads
#   L1-dcache-load-misses
#   L1-dcache-stores
#   L1-icache-load-misses
#   LLC-loads
#   LLC-load-misses
```

## perf record + report — Profiling

```bash
# 100 Hz sampling, call graph
sudo perf record -F 100 -g ./prog
sudo perf report

# Output
# Samples: 12K of event 'cycles'
# Event count (approx.): 5234567890
#
# Overhead  Command  Shared Object  Symbol
#   23.45%  prog     prog           [.] hot_function
#   12.34%  prog     libc-2.31.so   [.] __memcpy_avx_unaligned
#    8.91%  prog     prog           [.] another_function
```

`-g` — call graph (DWARF·FP·LBR).

## Call Graph 방식

```bash
# Frame pointer (rbp) — 컴파일 시 -fno-omit-frame-pointer 필요
perf record -g --call-graph=fp ./prog

# DWARF — debug info 사용, 더 정확하나 size 큼
perf record -g --call-graph=dwarf ./prog

# LBR (Intel) — hardware Last Branch Record
perf record -g --call-graph=lbr ./prog
```

LBR이 *가장 빠름·정확*. ARM은 *PMU SPE* (Statistical Profiling Extension).

## perf top — Real-time

```bash
sudo perf top
sudo perf top -e cache-misses
sudo perf top -p $PID   # 특정 process
```

화면 실시간 — *어느 함수가 hot* 즉시 보임. `htop`의 함수 버전.

## perf script — Raw 데이터

```bash
perf record -F 999 -g ./prog
perf script > out.script

# 각 sample의 raw event + call stack
# → flame graph 생성 가능
```

## Annotate — Source Line별

```bash
perf record -e cycles -g ./prog
perf annotate hot_function

# 또는 perf report 안에서 'a' 키 — annotate mode
```

```text
Source:                            Disassembly:           %
for (i = 0; i < N; i++) {          1: mov    %eax,%edx     0.5
    sum += data[i];                2: add    (%rcx),%edx  23.4   ← hot
}                                  3: inc    %rax          0.3
                                   4: cmp    $0x1000,%rax  0.2
                                   5: jne    1b           76.0   ← branch!
```

명령별 cycle 분포 — *진짜 hot instruction* 발견.

## Multiplexing — Event 많을 때

```bash
# PMU counter는 보통 4-6개
# 6개 초과 → 자동 time-share
perf stat -e cycles,instructions,branches,branch-misses,cache-references,cache-misses,L1-dcache-loads,L1-dcache-load-misses ./prog

# 결과에 multiplex 비율 표시
#   1,234,567   cycles (50.00%)
#   2,345,678   instructions (50.00%)
```

각 event가 *시간의 50%만* 측정 → scaled 결과. 정확도 ↓.

## Hardware Events on ARM

```bash
# ARM Cortex-A53 PMU events
sudo perf stat -e r08,r10,r11,r17,r18 ./prog
# r08: INST_RETIRED
# r10: BRANCH_PRED
# r11: CPU_CYCLES
# r17: L2D_CACHE_REFILL
# r18: L2D_CACHE_ACCESS
```

ARM PMU number 코드 — [ARM ARM](https://developer.arm.com)에서 확인.

## Tracepoint Events

```bash
perf list | grep tracepoint
# sched:sched_switch
# block:block_rq_issue
# syscalls:sys_enter_*
# net:net_dev_queue

sudo perf record -e sched:sched_switch -g ./prog
```

Kernel tracepoint — *수천 개*. ftrace와 결합.

## perf diff — 두 run 비교

```bash
perf record -o perf.before.data ./prog_v1
perf record -o perf.after.data ./prog_v2
perf diff perf.before.data perf.after.data

# Output:
# Baseline    Delta   Command  Symbol
#   30.0%   -10.0%   prog     hot_function   ← v2가 빠름
```

최적화 결과 *정량 비교*.

## perf c2c — Cache-to-Cache False Sharing

```bash
sudo perf c2c record -F 60000 ./prog
sudo perf c2c report

# HITM events — false sharing signature
```

False sharing의 *직접 진단*.

## perf lock — Lock Contention

```bash
sudo perf lock record ./prog
sudo perf lock report

# Name              acquired    wait_total(s)    wait_avg
# mutex_a            12345          0.234          19 ns
# mutex_b              400          1.520        3800 ns   ← hot
```

## Privilege 설정

```bash
# /proc/sys/kernel/perf_event_paranoid
echo 1 > /proc/sys/kernel/perf_event_paranoid   # user 일부 가능
echo 0 > /proc/sys/kernel/perf_event_paranoid   # user 거의 모두
echo -1 > /proc/sys/kernel/perf_event_paranoid  # 모두 (보안 위험)
```

Production server — `2` (기본). 개발 환경 — `1` 또는 `0`.

## Yocto·OpenEmbedded — perf 추가

```bash
# local.conf 또는 image recipe
IMAGE_INSTALL_append = " perf"

# Or build kernel with PMU support
# CONFIG_PERF_EVENTS=y
# CONFIG_HW_PERF_EVENTS=y
```

임베디드 Linux SoC — Yocto build 시 활성.

## 자주 하는 실수

> ⚠️ Frame pointer 끄고 call graph

```c
/* gcc -O2 — 기본 -fomit-frame-pointer */
```

→ `-fno-omit-frame-pointer` 또는 *DWARF* 사용.

> ⚠️ Multiplex 무시

```bash
perf stat -e cycles,instructions,...,...,...,...   # 8 event
# 결과 — multiplex로 scaled
```

→ 6 이하 또는 *여러 run*.

> ⚠️ Symbol stripped binary

```bash
# Released binary — symbol 없음
strip prog
perf record ./prog   # → [.] 0x12345 만 표시
```

→ *debug symbol 유지* (`-g`) 또는 *separate symbol package*.

> ⚠️ Sampling frequency 너무 높음

```bash
perf record -F 99999 ./prog   # 100 kHz — overhead 5%+
```

→ 1000 Hz 적당.

## 정리

- `perf stat` — 빠른 overview.
- `perf record + report` — flame profile.
- `perf top` — real-time hot function.
- `perf script` — raw 데이터 → flame graph.
- `perf annotate` — instruction-level.
- `perf c2c` — false sharing, `perf lock` — contention.

다음 편은 **perf advanced**.

## 관련 항목

- [2-10: PMU](/blog/embedded/performance-engineering/part2-10-pmu)
- [5-02: perf Advanced](/blog/embedded/performance-engineering/part5-02-perf-advanced)
