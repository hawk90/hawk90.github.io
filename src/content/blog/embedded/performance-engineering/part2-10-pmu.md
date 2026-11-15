---
title: "PMU·HPM 하드웨어 카운터 분석 — 정밀 성능 진단"
slug: "embedded/performance-engineering/part2-10-pmu"
date: 2026-04-24T09:09:00
description: "ARMv8 PMU 6+ counter, RISC-V HPM. CYCLE·INST_RETIRED·CACHE·BRANCH. perf 활용."
series: "Embedded Performance Engineering"
seriesOrder: 18
tags: [pmu, hardware-counter, arm, risc-v, perf]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"PMU = CPU 내장 프로파일러"**입니다. 측정 overhead가 거의 0에 가깝습니다.

## ARMv8 PMU 구조

| 항목 | 사양 |
|---|---|
| Event counter 수·폭 | PMU version 및 core implementation이 제공하는 값; PMCR/PMCEID와 TRM 확인 |
| Cycle counter | 별도 cycle counter; 폭·overflow handling은 PMU version/구현 설정에 따름 |
| Event 선택 | 각 counter에 event ID 할당 |

```c
/* EL1/kernel code only: configure PMU access for EL0 per OS policy. */
asm volatile ("msr pmuserenr_el0, %0" :: "r"(1));
asm volatile ("msr pmcntenset_el0, %0" :: "r"(0x80000000));   // CCNT enable
asm volatile ("msr pmcr_el0, %0" :: "r"(1));                  // PMU enable

uint64_t cycles;
asm volatile ("mrs %0, pmccntr_el0" : "=r"(cycles));
```

## ARM PMUv3 Event IDs

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
| 0x18 | L2D_CACHE | L2 data-cache access event |
| 0x23 | STALL_FRONTEND | front-end stall |
| 0x24 | STALL_BACKEND | back-end stall |

각 CPU별 Technical Reference Manual과 PMU version을 확인해야 합니다. event count/width/권한/지원 ID는 implementation별이며, Linux에서는 kernel perf driver의 매핑도 확인합니다.

## Linux perf — 가장 흔한 도구

```bash
# 기본 측정
perf stat ./prog

# 특정 event
perf stat -e cycles,instructions,branches,branch-misses ./prog

# Raw event (PMU 직접)
perf stat -e r03,r04 ./prog   # L1D_CACHE_REFILL, L1D_CACHE
perf list   # 대상 PMU driver가 제공하는 event name 확인

# Profiling
perf record -e cycles -g ./prog
perf report
```

`perf record` 결과로 function별 cycle 분포를 확인할 수 있고, 이를 통해 hotspot을 발견합니다.

## 핵심 비율 — IPC·MPKI

$$\text{IPC} = \frac{\text{INST\_RETIRED}}{\text{CPU\_CYCLES}} \quad (\text{높을수록 좋음, target } 1+)$$

$$\text{MPKI} = \frac{\text{L1D\_CACHE\_REFILL} \times 1000}{\text{INST\_RETIRED}} \quad (\text{낮을수록 좋음})$$

MPKI는 workload·cache level·PMU event definition을 함께 보고 해석합니다. 보편적인 임계값은 두지 않습니다.

$$\text{Branch mispredict rate} = \frac{\text{BR\_MIS\_PRED}}{\text{BRANCHES}}$$

mispredict ratio는 workload와 target에서 관찰하고, 보편적인 합격 임계값으로 해석하지 않습니다.

$$\text{Frontend bound} = \frac{\text{STALL\_FRONTEND}}{\text{CYCLES}}, \quad \text{Backend bound} = \frac{\text{STALL\_BACKEND}}{\text{CYCLES}}$$

counter의 정의·overlap을 확인하지 않은 채 두 비율을 더해 bottleneck으로 판정하지 않습니다.

## Top-Down Microarchitecture Analysis

Intel이 먼저 도입했고, ARM도 비슷한 분류 체계를 사용합니다.

![Top-Down Microarchitecture Analysis — CPU cycle 분배 분석](/images/blog/perf-eng/diagrams/part2-10-topdown.svg)

Bottleneck을 식별한 뒤 적절한 최적화를 적용합니다. cache miss라면 tiling, mispredict라면 branchless 변환이 그 예입니다.

## Cortex-M PMU

Cortex-M3/M4 코어는 PMUv3 event counters가 아니라 구현에 포함된 DWT cycle counter 등 CoreDebug/DWT 기능으로 측정할 수 있습니다. DWT 기능·권한·가용성은 core/SoC 설정을 확인합니다.

```c
DWT->CTRL |= DWT_CTRL_CYCCNTENA_Msk;
uint32_t cycles_start = DWT->CYCCNT;
/* code */
uint32_t cycles_end = DWT->CYCCNT;
```

일부 Cortex-M 구현의 DWT는 LSUCNT·CPICNT·EXCCNT·FOLDCNT·SLEEPCNT를 제공합니다. 실제 존재 여부·계산 의미는 core revision TRM을 확인합니다.

```c
DWT->LSUCNT  // load/store cycle
DWT->CPICNT  // CPI miss (extra) cycle
DWT->EXCCNT  // exception overhead
DWT->FOLDCNT // folded instruction (e.g. IT)
DWT->SLEEPCNT // sleep cycle
```

```c
/* CPI = measured cycles / retired instructions.
   CYCCNT and CPICNT alone do not provide retired-instruction count. */
```

## RISC-V HPM (Hardware Performance Monitor)

RISC-V Privileged Architecture defines `mcycle` and `minstret` as 64-bit precision counters and provides `mhpmcounter3`–`mhpmcounter31` slots. Implementations may make a counter/event selector read-only zero; event meanings are platform-defined. Lower-privilege access is controlled by `mcounteren`/`scounteren`. Read the platform manual before configuring a selector.

## Sampling — Statistical Profiling

```bash
perf record -F 1000 -g ./prog   # 1000 Hz sampling
perf report --stdio
```

`-F 1000`은 요청 sampling frequency이며 실제 rate·lost sample 수·call-chain 정확도는 perf, PMU, 권한과 workload에 따라 달라집니다. Flamegraph로 시각화하면 다음과 같습니다.

```bash
perf script | stackcollapse-perf.pl | flamegraph.pl > flame.svg
```

sampling overhead는 frequency, call-chain capture, workload와 platform에 따라 달라집니다. production 수용 전 대상에서 overhead를 측정합니다.

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

사용 가능한 hardware counters보다 더 많은 event를 동시에 요청하면 Linux perf가 multiplex할 수 있습니다.

```bash
perf stat -e r03,r04,r10,r11,r17,r23,r24 ./prog
# # perf reports scaling when multiplexing is used; inspect enabled/running time
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

32-bit counter는 일정 시간 후 wraparound할 수 있지만, counter 폭과 overflow 동작은 PMU/DWT 구현에 따릅니다. 측정 구간을 확인하고 필요하면 wraparound를 처리합니다.

> ⚠️ User-mode PMU 접근

기본적으로 PMU 접근은 kernel mode 전용입니다. Linux에서는 `/proc/sys/kernel/perf_event_paranoid`로 제어합니다.

```bash
echo 0 | sudo tee /proc/sys/kernel/perf_event_paranoid   # user access
```

Production 서버에서는 보안 위험이 있으므로 신중하게 적용해야 합니다.

> ⚠️ ISR이 측정 손상

PMU counter는 ISR도 함께 카운트합니다. ISR이 빈번하면 측정 결과에 노이즈가 섞입니다. ISR-free 구간을 잡거나, 측정에서 ISR을 빼는 방법을 씁니다.

## 정리

- PMU는 **CPU 내장 hardware counter**이며, 수집·sampling overhead는 구성과 workload에서 확인합니다.
- PMU event counter 수와 cycle counter 폭은 PMU version 및 CPU implementation에 따라 달라집니다.
- 핵심 metric은 **IPC, MPKI, mispredict rate, STALL**입니다.
- Linux `perf`가 사실상 표준 도구입니다.
- Cortex-M은 **DWT counter**, Cortex-A는 PMU를 씁니다.
- RISC-V는 `mhpmcounter`로 programmable counter를 제공합니다.
- WCET 검증, hotspot 파악, top-down 분석에 핵심적인 도구입니다.

다음 파트에서는 **Compiler & Optimization**을 다룹니다.

## 관련 항목

- [2-09: SIMD NEON](/blog/embedded/performance-engineering/part2-09-simd-neon)
- 3-01: Compiler 최적화 단계
