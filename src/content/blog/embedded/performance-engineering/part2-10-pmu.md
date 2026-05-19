---
title: "2-10: PMU·HPM — 하드웨어 카운터로 진단"
date: 2026-05-08T17:00:00
description: "ARMv8 PMU 6+ counter, RISC-V HPM. CYCLE·INST_RETIRED·CACHE·BRANCH. perf 활용."
series: "Embedded Performance Engineering"
seriesOrder: 18
tags: [pmu, hardware-counter, arm, riscv, perf]
draft: true
---

## 한 줄 요약

> **"PMU = CPU 내장 프로파일러"** — 측정 overhead 거의 0.

## ARMv8 PMU 구조

| 항목 | 사양 |
|---|---|
| Counter 수 | Cortex-A53 = 6, A72 = 6, M-class = 4~ |
| Counter 폭 | 32-bit (overflow interrupt) |
| Cycle counter | 별도 64-bit (PMCCNTR_EL0) |
| Event 선택 | 각 counter에 event ID 할당 |

```c
/* User mode access 활성화 (kernel 권한 필요) */
asm volatile ("msr pmuserenr_el0, %0" :: "r"(1));
asm volatile ("msr pmcntenset_el0, %0" :: "r"(0x80000000));   // CCNT enable
asm volatile ("msr pmcr_el0, %0" :: "r"(1));                  // PMU enable

uint64_t cycles;
asm volatile ("mrs %0, pmccntr_el0" : "=r"(cycles));
```

## ARMv8 표준 Event IDs

| ID | 이름 | 의미 |
|---|---|---|
| 0x00 | SW_INCR | 소프트 카운터 |
| 0x01 | L1I_CACHE_REFILL | L1 I-cache miss |
| 0x03 | L1D_CACHE_REFILL | L1 D-cache miss |
| 0x04 | L1D_CACHE | L1 D-cache access |
| 0x08 | INST_RETIRED | 명령 완료 |
| 0x10 | BR_MIS_PRED | branch mispredict |
| 0x11 | CPU_CYCLES | cycle (CCNT와 동일) |
| 0x13 | MEM_ACCESS | memory access |
| 0x17 | L2D_CACHE_REFILL | L2 miss |
| 0x18 | L2D_CACHE_ACCESS | L2 access |
| 0x23 | STALL_FRONTEND | front-end stall |
| 0x24 | STALL_BACKEND | back-end stall |

각 CPU별 *Technical Reference Manual* 확인 — implementation-specific event 추가 있음.

## Linux perf — 가장 흔한 도구

```bash
# 기본 측정
perf stat ./prog

# 특정 event
perf stat -e cycles,instructions,branches,branch-misses ./prog

# Raw event (PMU 직접)
perf stat -e r03,r04 ./prog   # L1D_CACHE_REFILL, L1D_CACHE
perf stat -e r23,r24 ./prog   # STALL_FRONTEND, STALL_BACKEND

# Profiling
perf record -e cycles -g ./prog
perf report
```

`perf record` 결과는 *function별 cycle 분포* — hotspot 발견.

## 핵심 비율 — IPC·MPKI

```text
IPC = INST_RETIRED / CPU_CYCLES        ← 높을수록 좋음 (target 1+)
MPKI = (L1D_CACHE_REFILL × 1000) / INST_RETIRED   ← 낮을수록 좋음

MPKI < 10  — cache 효율 좋음
MPKI 10-30 — 보통
MPKI > 30  — cache 문제
```

```text
Branch mispredict rate = BR_MIS_PRED / BRANCHES
  < 5%  — 양호
  > 10% — 문제

Frontend bound = STALL_FRONTEND / CYCLES
Backend bound = STALL_BACKEND / CYCLES
  → 둘 합이 50%↑면 stall 지배적
```

## Top-Down Microarchitecture Analysis

Intel가 도입, ARM도 비슷.

```text
4 카테고리 — CPU cycle 분배:
1. Retiring          (실제 일 함, 좋은 cycle)
2. Bad Speculation   (mispredict로 폐기)
3. Frontend Bound    (fetch·decode 못 따라옴)
4. Backend Bound     (compute·memory)
   ├ Core Bound
   └ Memory Bound
       ├ L1 / L2 / L3 bound
       └ DRAM bound
```

Bottleneck 식별 → 적절한 최적화 (cache miss → tiling, mispredict → branchless).

## Cortex-M PMU

Cortex-M3/M4 — 작은 PMU:

```c
DWT->CTRL |= DWT_CTRL_CYCCNTENA_Msk;
uint32_t cycles_start = DWT->CYCCNT;
/* code */
uint32_t cycles_end = DWT->CYCCNT;
```

Cortex-M7+ — 추가 counter (LSU·FOLD·CPI 등):

```c
DWT->LSUCNT  // load/store cycle
DWT->CPICNT  // CPI miss (extra) cycle
DWT->EXCCNT  // exception overhead
DWT->FOLDCNT // folded instruction (e.g. IT)
DWT->SLEEPCNT // sleep cycle
```

```c
float cpi = (float)(DWT->CPICNT + DWT->CYCCNT) / DWT->CYCCNT;
```

## RISC-V HPM (Hardware Performance Monitor)

```text
mcycle      — cycle counter (64-bit)
minstret    — instruction retired
mhpmcounter3 — mhpmcounter31 — 28 programmable counter
mhpmevent3  — mhpmevent31    — event ID 선택
```

Event ID는 vendor-specific. SiFive U74:

| ID | 의미 |
|---|---|
| 0x100 | I-cache miss |
| 0x101 | I-cache busy |
| 0x800 | D-cache miss |
| 0x801 | D-cache busy |
| 0x100A | Branch mispredict |

```c
asm volatile ("csrw mhpmevent3, %0" :: "r"(0x800));   // D-cache miss
uint64_t count;
asm volatile ("csrr %0, mhpmcounter3" : "=r"(count));
```

## Sampling — Statistical Profiling

```bash
perf record -F 1000 -g ./prog   # 1000 Hz sampling
perf report --stdio
```

매 1 ms마다 *PC + call stack 캡쳐*. Flamegraph로 시각화:

```bash
perf script | stackcollapse-perf.pl | flamegraph.pl > flame.svg
```

매우 적은 overhead (~1-3%) — production 환경에서도 가능.

## Streamline (ARM) / VTune (Intel)

GUI 도구:
- **ARM Streamline** — Cortex-A/M *target에서* perf 데이터 수집
- **Intel VTune** — Top-down 자동 분석
- **Apple Instruments** — macOS·iOS
- **NVIDIA Nsight** — GPU + CPU

학습 곡선 가파르지만 강력.

## 자동차·항공 — RTOS PMU 활용

자동차 ECU (NXP S32K3, Cortex-M7) — PMU로 *WCET 분석*:

```c
void task(void) {
    uint32_t start = DWT->CYCCNT;
    do_work();
    uint32_t cycles = DWT->CYCCNT - start;
    
    if (cycles > WCET_BUDGET) {
        log_overrun(cycles);   // 디버깅용
    }
}
```

KSLV-II 누리 flight computer에서도 *task별 cycle budget* 측정 — 안전 마진 확보.

## Event Multiplexing

PMU counter 6개인데 *측정하고 싶은 event 12개* — *time-sharing*.

```bash
perf stat -e r03,r04,r10,r11,r17,r23,r24 ./prog
# 6 이하면 동시, 초과시 자동 multiplex
# perf가 결과를 normalize (scaling factor)
```

다만 *sampling이라 정확도 ↓*. 가능하면 counter 수 이하.

## 자주 하는 실수

> ⚠️ Cycle 측정에 barrier 누락

```c
uint32_t start = DWT->CYCCNT;
do_work();
uint32_t end = DWT->CYCCNT;
```

OoO CPU에선 `do_work` 시작이 *start 측정 전*에 일어날 수도:

```c
__DSB(); __ISB();
uint32_t start = DWT->CYCCNT;
do_work();
__DSB(); __ISB();
uint32_t end = DWT->CYCCNT;
```

> ⚠️ Counter overflow

32-bit @ 1 GHz = *4 sec*면 overflow. 긴 측정은 overflow handler 또는 *64-bit cycle counter* (ARMv8 PMCCNTR).

> ⚠️ User-mode PMU 접근

기본은 *kernel mode only*. Linux는 `/proc/sys/kernel/perf_event_paranoid`로 제어:

```bash
echo 0 | sudo tee /proc/sys/kernel/perf_event_paranoid   # user access
```

Production server에선 *보안 위험* — 신중.

> ⚠️ ISR이 측정 손상

PMU counter는 *ISR도 카운트*. ISR 빈번하면 *측정 결과 노이즈*. ISR-free 구간 또는 ISR 빼는 방법.

## 정리

- PMU = **CPU 내장 hardware counter** — overhead ~0.
- ARMv8 — *6 counter + cycle counter*.
- 핵심 metric — **IPC·MPKI·mispredict rate·STALL**.
- Linux `perf`가 표준 도구.
- Cortex-M = **DWT counter**, Cortex-A = PMU.
- RISC-V — `mhpmcounter` programmable.
- WCET 검증·hotspot 파악·top-down 분석에 핵심.

다음 part는 **Compiler & Optimization**.

## 관련 항목

- [2-09: SIMD NEON](/blog/embedded/performance-engineering/part2-09-simd-neon)
- [3-01: Compiler 최적화 단계](/blog/embedded/performance-engineering/part3-01-compiler-optimization)
