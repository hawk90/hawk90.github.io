---
title: "PMU·HPM 하드웨어 카운터 분석 — 정밀 성능 진단"
date: 2026-04-24T09:09:00
description: "ARMv8 PMU 6+ counter, RISC-V HPM. CYCLE·INST_RETIRED·CACHE·BRANCH. perf 활용."
series: "Embedded Performance Engineering"
seriesOrder: 18
tags: [pmu, hardware-counter, arm, riscv, perf]
draft: false
---

## 한 줄 요약

> **"PMU = CPU 내장 프로파일러"**입니다. 측정 overhead가 거의 0에 가깝습니다.

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

각 CPU별 Technical Reference Manual을 확인해야 합니다. CPU마다 implementation-specific event가 추가로 정의되어 있습니다.

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

`perf record` 결과로 function별 cycle 분포를 확인할 수 있고, 이를 통해 hotspot을 발견합니다.

## 핵심 비율 — IPC·MPKI

$$\text{IPC} = \frac{\text{INST\_RETIRED}}{\text{CPU\_CYCLES}} \quad (\text{높을수록 좋음, target } 1+)$$

$$\text{MPKI} = \frac{\text{L1D\_CACHE\_REFILL} \times 1000}{\text{INST\_RETIRED}} \quad (\text{낮을수록 좋음})$$

```text
MPKI < 10  — cache 효율 좋음
MPKI 10-30 — 보통
MPKI > 30  — cache 문제
```

$$\text{Branch mispredict rate} = \frac{\text{BR\_MIS\_PRED}}{\text{BRANCHES}}$$

5% 미만이면 양호, 10% 초과면 문제입니다.

$$\text{Frontend bound} = \frac{\text{STALL\_FRONTEND}}{\text{CYCLES}}, \quad \text{Backend bound} = \frac{\text{STALL\_BACKEND}}{\text{CYCLES}}$$

둘 합이 50% 이상이면 stall 지배적입니다.

## Top-Down Microarchitecture Analysis

Intel이 먼저 도입했고, ARM도 비슷한 분류 체계를 사용합니다.

![Top-Down Microarchitecture Analysis — CPU cycle 분배 분석](/images/blog/perf-eng/diagrams/part2-10-topdown.svg)

Bottleneck을 식별한 뒤 적절한 최적화를 적용합니다. cache miss라면 tiling, mispredict라면 branchless 변환이 그 예입니다.

## Cortex-M PMU

Cortex-M3/M4는 작은 PMU를 가집니다.

```c
DWT->CTRL |= DWT_CTRL_CYCCNTENA_Msk;
uint32_t cycles_start = DWT->CYCCNT;
/* code */
uint32_t cycles_end = DWT->CYCCNT;
```

Cortex-M7 이상은 LSU·FOLD·CPI 등 추가 counter를 제공합니다.

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

Event ID는 vendor마다 다릅니다. SiFive U74 예시는 다음과 같습니다.

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

매 1 ms마다 PC와 call stack을 캡쳐합니다. Flamegraph로 시각화하면 다음과 같습니다.

```bash
perf script | stackcollapse-perf.pl | flamegraph.pl > flame.svg
```

overhead가 1-3% 정도로 매우 적어서 production 환경에서도 사용할 수 있습니다.

## Streamline (ARM) / VTune (Intel)

대표적인 GUI 도구들은 다음과 같습니다.

- **ARM Streamline**: Cortex-A/M target에서 perf 데이터를 수집합니다.
- **Intel VTune**: Top-down 자동 분석을 제공합니다.
- **Apple Instruments**: macOS·iOS용입니다.
- **NVIDIA Nsight**: GPU와 CPU를 함께 봅니다.

학습 곡선이 가파르지만 강력합니다.

## 자동차·항공 — RTOS PMU 활용

자동차 ECU(NXP S32K3, Cortex-M7)에서는 PMU로 WCET 분석을 수행합니다.

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

KSLV-II 누리 flight computer에서도 task별 cycle budget을 측정해 안전 마진을 확보합니다.

## Event Multiplexing

PMU counter는 6개인데 측정하고 싶은 event가 12개라면 time-sharing이 필요합니다.

```bash
perf stat -e r03,r04,r10,r11,r17,r23,r24 ./prog
# 6 이하면 동시, 초과시 자동 multiplex
# perf가 결과를 normalize (scaling factor)
```

다만 sampling 방식이라 정확도는 떨어집니다. 가능하면 측정 event 수를 counter 수 이하로 유지하는 것이 좋습니다.

## 자주 하는 실수

> ⚠️ Cycle 측정에 barrier 누락

```c
uint32_t start = DWT->CYCCNT;
do_work();
uint32_t end = DWT->CYCCNT;
```

OoO CPU에서는 `do_work` 시작이 start 측정 전에 일어날 수도 있습니다. 다음과 같이 barrier를 넣습니다.

```c
__DSB(); __ISB();
uint32_t start = DWT->CYCCNT;
do_work();
__DSB(); __ISB();
uint32_t end = DWT->CYCCNT;
```

> ⚠️ Counter overflow

32-bit 카운터를 1 GHz에서 돌리면 약 4초만에 overflow가 납니다. 긴 측정에서는 overflow handler를 두거나 64-bit cycle counter(ARMv8 PMCCNTR)를 사용합니다.

> ⚠️ User-mode PMU 접근

기본적으로 PMU 접근은 kernel mode 전용입니다. Linux에서는 `/proc/sys/kernel/perf_event_paranoid`로 제어합니다.

```bash
echo 0 | sudo tee /proc/sys/kernel/perf_event_paranoid   # user access
```

Production 서버에서는 보안 위험이 있으므로 신중하게 적용해야 합니다.

> ⚠️ ISR이 측정 손상

PMU counter는 ISR도 함께 카운트합니다. ISR이 빈번하면 측정 결과에 노이즈가 섞입니다. ISR-free 구간을 잡거나, 측정에서 ISR을 빼는 방법을 씁니다.

## 정리

- PMU는 **CPU 내장 hardware counter**입니다. overhead가 거의 0입니다.
- ARMv8은 6개 counter와 별도의 cycle counter를 제공합니다.
- 핵심 metric은 **IPC, MPKI, mispredict rate, STALL**입니다.
- Linux `perf`가 사실상 표준 도구입니다.
- Cortex-M은 **DWT counter**, Cortex-A는 PMU를 씁니다.
- RISC-V는 `mhpmcounter`로 programmable counter를 제공합니다.
- WCET 검증, hotspot 파악, top-down 분석에 핵심적인 도구입니다.

다음 파트에서는 **Compiler & Optimization**을 다룹니다.

## 관련 항목

- [2-09: SIMD NEON](/blog/embedded/performance-engineering/part2-09-simd-neon)
- [3-01: Compiler 최적화 단계](/blog/embedded/performance-engineering/part3-01-compiler-optimization)
