---
title: "PMU·HPM 하드웨어 카운터 분석 — 정밀 성능 진단"
slug: "embedded/performance-engineering/part2-10-pmu"
date: 2026-04-24T09:09:00
description: "Armv8 PMU의 counter 구조와 event 번호를 Linux 소스·Cortex-A53 TRM으로 확인하고, Cortex-M DWT profiling counter와 RISC-V HPM을 사양서로 정리합니다."
series: "Embedded Performance Engineering"
seriesOrder: 18
tags: [pmu, hardware-counter, arm, risc-v, perf]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"PMU = CPU 내장 프로파일러"**입니다. 코어가 하드웨어로 이벤트를 셉니다.

## ARMv8 PMU 구조

Armv8-A PMU는 event counter 몇 개와 별도의 cycle counter(`PMCCNTR_EL0`)로 이루어집니다. event counter 수는 구현마다 다르고, `PMCR_EL0.N`(bit 15:11)이 그 수를 알려 줍니다(Linux `include/linux/perf/arm_pmuv3.h` 219행 `ARMV8_PMU_PMCR_N`). Cortex-A53 TRM(DDI 0500E) 12장은 "The PMU provides six counters"라고 적고, PMCR_EL0.N이 `0b00110`(six counters)으로 읽힌다고 적습니다.

이 시리즈의 HVF 게스트는 커널 로그에 `1 (0,80000000) counters available`가 찍혔습니다. mask 0x80000000은 bit 31, 즉 cycle counter(`ARMV8_PMU_CYCLE_IDX` 31) 하나뿐이고 event counter는 0개라는 뜻입니다(1-01).

EL1(커널)에서 cycle counter를 켜는 최소 코드입니다. 각 비트는 Linux `arm_pmuv3.h`의 정의(`PMCR_E` bit 0, `USERENR_EN` bit 0, cycle counter index 31)를 따랐고, 보드에서 실행하지는 않았습니다.

```c
/* EL1 only */
asm volatile ("msr pmuserenr_el0, %0" :: "r"(1UL));            // EN: EL0 접근 허용
asm volatile ("msr pmcntenset_el0, %0" :: "r"(1UL << 31));     // cycle counter enable
asm volatile ("msr pmcr_el0, %0" :: "r"(1UL));                 // E: 전체 enable
asm volatile ("isb");

uint64_t cycles;
asm volatile ("mrs %0, pmccntr_el0" : "=r"(cycles));
```

Linux 위에서는 이렇게 직접 켜지 말고 perf를 쓰거나, 1-03에서 본 `perf_user_access` 경로를 씁니다.

## ARM PMUv3 Event IDs

Linux `arm_pmuv3.h`의 공통 이벤트 번호와, Cortex-A53 TRM 12.9 표 12-28에 그 번호가 있는지를 함께 적었습니다.

| ID | 이름 | A53 표 12-28 |
|---|---|---|
| 0x00 | SW_INCR | 있음 |
| 0x01 | L1I_CACHE_REFILL | 있음 |
| 0x03 | L1D_CACHE_REFILL | 있음 |
| 0x04 | L1D_CACHE | 있음 |
| 0x08 | INST_RETIRED | 있음 |
| 0x10 | BR_MIS_PRED | 있음 |
| 0x11 | CPU_CYCLES | 있음 |
| 0x13 | MEM_ACCESS | 있음 |
| 0x16 | L2D_CACHE | 있음 |
| 0x17 | L2D_CACHE_REFILL | 있음 |
| 0x18 | L2D_CACHE_WB | 있음 |
| 0x23 | STALL_FRONTEND | 없음 |
| 0x24 | STALL_BACKEND | 없음 |

0x18은 L2 access가 아니라 `L2D_CACHE_WB`(L2 write-back)이고, access는 0x16 `L2D_CACHE`입니다. A53에서 stall을 보려면 0x23·0x24 대신 구현 정의 이벤트 0xE0~0xE8을 씁니다(2-02).

## Linux perf

```bash
perf stat ./prog
perf stat -e cycles,instructions,branches,branch-misses ./prog
perf stat -e r03,r04 ./prog        # raw: L1D_CACHE_REFILL, L1D_CACHE
perf list                          # 이 커널의 PMU driver가 노출한 이름
perf record -e cycles -g ./prog
perf report
```

일반 이벤트 이름은 Linux `drivers/perf/arm_pmuv3.c` 44~51행에서 Armv8 이벤트로 매핑됩니다. `instructions`는 `INST_RETIRED`, `cache-misses`는 `L1D_CACHE_REFILL`, `branch-misses`는 `BR_MIS_PRED`입니다. 이 시리즈의 게스트에서는 모두 `<not supported>`였고, 하드웨어 카운터 없이도 동작하는 `cpu-clock` 샘플링은 1-08에서 실행했습니다.

## 핵심 비율 — IPC·MPKI

$$\text{IPC} = \frac{\text{INST\_RETIRED}}{\text{CPU\_CYCLES}}, \quad \text{MPKI} = \frac{\text{L1D\_CACHE\_REFILL} \times 1000}{\text{INST\_RETIRED}}$$

$$\text{Branch mispredict rate} = \frac{\text{BR\_MIS\_PRED}}{\text{BR\_PRED}}$$

IPC의 범위는 1-02와 2-01에서 잰 것처럼 같은 코어에서도 0.11(무작위 포인터 추적)부터 5.3(독립 덧셈)까지 퍼집니다. 하나의 "좋은 IPC" 기준이 없으므로, 같은 코드의 변경 전후를 비교하는 데 씁니다.

## Top-Down 분석

![Top-Down Microarchitecture Analysis — CPU slot 분류](/images/blog/perf-eng/diagrams/part2-10-topdown.svg)

Linux perf에는 Arm용 top-down Level 1 metric이 있습니다. `tools/perf/pmu-events/arch/arm64/sbsa.json`(Linux 6.12)은 네 갈래를 이렇게 정의합니다.

| metric | 식 | 설명 |
|---|---|---|
| `frontend_bound` | 100 × stall_slot_frontend / (slots × cpu_cycles) | frontend 자원 부족으로 멈춘 slot 비율 |
| `backend_bound` | 100 × stall_slot_backend / (slots × cpu_cycles) | backend 자원 부족으로 멈춘 slot 비율 |
| `bad_speculation` | 100 × (1 − op_retired / op_spec) × (1 − stall_slot / (slots × cpu_cycles)) | 실행했지만 pipeline flush로 retire하지 못한 slot |
| `retiring` | 100 × (op_retired / op_spec) × (1 − stall_slot / (slots × cpu_cycles)) | 실행해서 retire한 slot |

이 식에 쓰이는 `op_retired`, `op_spec`, `stall_slot*`은 0x3A~0x3F번 이벤트(`arm_pmuv3.h` 74~79행)이고, A53 표 12-28에는 없습니다. 그래서 A53에서는 이 metric을 계산할 수 없습니다. 그림의 Level 2 이하 분류(Core/Memory Bound 등)는 이 파일에 없고, 코어별 metric 파일이 따로 정의합니다.

## Cortex-M — DWT 카운터

Cortex-M3/M4/M7에는 PMUv3가 없고, DWT의 카운터로 잽니다. `CYCCNT`(32-bit, 선택 사항)는 1-03에서 다뤘습니다. ARMv7-M ARM(DDI 0403E) C1.8.4는 그 밖에 선택 사항인 *8-bit* profiling 카운터 다섯 개를 정의합니다. 구현 여부는 `DWT_CTRL.NOPRFCNT`가 0인지로 확인합니다.

| 카운터 | C1.8.4의 정의 |
|---|---|
| `DWT_CPICNT` | 여러 cycle 걸리는 명령의 *추가* cycle(LSUCNT가 세는 것 제외)과 명령 fetch stall cycle |
| `DWT_EXCCNT` | 예외 진입·복귀(stacking, unstacking, preemption 등)에 쓰인 cycle |
| `DWT_SLEEPCNT` | WFI·WFE·sleep-on-exit로 절전한 cycle |
| `DWT_LSUCNT` | 여러 cycle 걸리는 load/store의 *추가* cycle |
| `DWT_FOLDCNT` | 0 cycle에 실행된 명령의 수 |

같은 절에 따르면 이 카운터는 256마다 0으로 돌아가고, `DWT_CTRL`의 overflow event 비트(CPIEVTENA bit 17 ~ FOLDEVTENA bit 21)를 켜면 넘칠 때마다 ITM으로 Event counter packet을 내보냅니다. 8-bit라서 소프트웨어로 읽기만 해서는 긴 구간을 잴 수 없고, trace로 패킷을 받거나 짧은 구간마다 읽어 누적합니다.

```c
DWT->CTRL |= DWT_CTRL_CYCCNTENA_Msk | DWT_CTRL_CPIEVTENA_Msk | DWT_CTRL_LSUEVTENA_Msk;
uint32_t c0 = DWT->CYCCNT;
uint8_t  l0 = (uint8_t)DWT->LSUCNT;
/* 짧은 구간 */
uint8_t  l1 = (uint8_t)DWT->LSUCNT;
uint32_t c1 = DWT->CYCCNT;
uint8_t  lsu_extra = (uint8_t)(l1 - l0);   /* 구간이 짧아 256을 넘지 않을 때만 의미 있음 */
```

이 코드는 보드에서 실행하지 않았습니다. QEMU에서는 DWT가 동작하지 않습니다(1-03).

## RISC-V HPM (Hardware Performance Monitor)

RISC-V Privileged Architecture(Document Version 20211203) 3.1.10절에 따르면 `mcycle`은 코어가 실행한 clock cycle 수를, `minstret`은 retire한 명령 수를 세며, 둘 다 RV32와 RV64 모두에서 64-bit 정밀도입니다. 이와 별도로 64-bit event counter `mhpmcounter3`~`mhpmcounter31` 29개와, 각 카운터가 셀 이벤트를 고르는 `mhpmevent3`~`mhpmevent31`이 있습니다. 이벤트의 의미는 플랫폼이 정하고 event 0만 "no event"로 정해져 있습니다. 같은 절은 카운터와 event selector를 모두 read-only 0으로 두는 구현도 합법이라고 적습니다. 그래서 RISC-V 칩에서 HPM을 쓰려면 그 칩의 매뉴얼에서 어느 카운터가 실제로 구현됐는지부터 봅니다.

하위 모드의 접근은 `mcounteren`(3.1.11)과 `scounteren`(4.1.5)이 정합니다. 3.1.11에 따르면 `mcounteren`은 바로 아래 권한 모드가 각 카운터를 쓸 수 있는지를 비트(CY, TM, IR, HPM3~HPM31)로 정합니다.

## Sampling — Statistical Profiling

```bash
perf record -F 1000 -g ./prog
perf report --stdio
```

`-F 1000`은 *요청한* 샘플링 주파수입니다. 1-08에서 `-F 999`로 약 1.2초를 돌렸을 때 실제 표본은 1,195개였습니다. Flamegraph는 5-05에서 다룹니다.

## Event Multiplexing

카운터 수보다 많은 이벤트를 한 번에 요청하면 perf는 이벤트를 번갈아 카운터에 올리고, 센 값을 enabled 시간으로 환산해 보여 줍니다(1-03). A53은 event counter가 6개이므로, 아래처럼 cycle이 아닌 이벤트 7개를 주면 적어도 하나는 측정 시간의 일부만 센 값이 됩니다. `r11`(CPU_CYCLES)은 Linux가 전용 cycle counter에 올리므로(`arm_pmuv3.c` `armv8pmu_get_event_idx()`의 "Always prefer to place a cycle counter into the cycle counter") 6개 계산에 들어가지 않습니다.

```bash
perf stat -e r03,r04,r10,r12,r17,r16,r13 ./prog
```

이렇게 환산한 값은 측정하지 않은 구간의 동작을 가정한 추정입니다. 비율을 계산할 두 이벤트(예: `r03`과 `r04`)는 `perf stat -e '{r03,r04}'`처럼 group으로 묶어 같은 구간을 세게 합니다.

## 자주 하는 실수

> ⚠️ 카운터 읽기 순서를 강제하지 않음

arm64에서 Linux는 카운터 레지스터를 읽기 전에 `isb`를 둡니다(1-03의 `CNTVCT_EL0`). 그렇지 않으면 측정 구간 안의 명령이 끝나기 전에 카운터가 읽힐 수 있습니다.

> ⚠️ Counter overflow

`PMCCNTR_EL0`는 64-bit이지만, Cortex-M의 `CYCCNT`는 32-bit(168 MHz에서 약 25.6초)이고 DWT profiling 카운터는 8-bit(256)입니다. 측정 구간을 카운터 폭에 맞춥니다.

> ⚠️ `perf_event_paranoid`와 레지스터 직접 접근을 혼동

`/proc/sys/kernel/perf_event_paranoid`는 `perf_event_open()`을 통한 perf 사용 권한을 정합니다. Linux 6.12 `Documentation/admin-guide/sysctl/kernel.rst`에 따르면 기본값은 2이고, 1 이상이면 `CAP_PERFMON` 없는 사용자의 CPU 이벤트 접근을, 2 이상이면 커널 프로파일링을 막습니다. Debian 13 게스트의 값은 3이었습니다(upstream 표는 >=2까지). EL0에서 `mrs`로 PMU 레지스터를 직접 읽는 것은 이와 별개로 `kernel.perf_user_access`가 정합니다(1-03).

```bash
sudo sysctl kernel.perf_event_paranoid=1
```

> ⚠️ 커널·ISR 시간이 섞임

측정 구간에 커널 코드나 인터럽트 처리가 끼면 그 cycle도 카운터에 들어갈 수 있습니다. `perf-list` man page는 이벤트를 제한하는 modifier로 `u`(user-space counting), `k`(kernel counting) 등을 둡니다. 사용자 공간만 세려면 `:u`를 붙입니다.

```bash
perf stat -e cycles:u,instructions:u ./prog
```

## 정리

- Armv8 PMU의 event counter 수는 `PMCR_EL0.N`이 알려 주고, A53은 6개입니다. HVF 게스트에는 cycle counter 하나만 보였습니다.
- 0x18은 `L2D_CACHE_WB`입니다. 0x23·0x24 stall 이벤트는 A53에 없습니다.
- Linux perf의 Arm top-down Level 1은 `sbsa.json`에 정의되어 있고, A53 표 12-28에 없는 0x3A~0x3F 이벤트가 필요합니다.
- Cortex-M의 DWT profiling 카운터는 8-bit이고, `FOLDCNT`는 0 cycle 명령 수를 셉니다.
- RISC-V는 64-bit `mcycle`·`minstret`과 `mhpmcounter3~31`을 정의하지만, 구현이 카운터를 0으로 고정할 수 있습니다.

다음 편부터 Part 3 **System Level Performance**입니다. 첫 글은 **Bus Architecture**입니다.

## 관련 항목

- [2-09: SIMD NEON](/blog/embedded/performance-engineering/part2-09-simd-neon)
- [3-01: Bus Architecture](/blog/embedded/performance-engineering/part3-01-bus-architecture)
- [1-03: 측정의 기본](/blog/embedded/performance-engineering/part1-03-measurement)

## 참고 자료

- Cortex-A53 MPCore Technical Reference Manual (DDI 0500E) 12장, 12.9 표 12-28
- ARMv7-M Architecture Reference Manual (DDI 0403E) C1.8.4
- RISC-V Privileged Architecture, Document Version 20211203, 3.1.10, 3.1.11, 4.1.5
- Linux v6.12 `include/linux/perf/arm_pmuv3.h`, `drivers/perf/arm_pmuv3.c`, `tools/perf/pmu-events/arch/arm64/sbsa.json`, `Documentation/admin-guide/sysctl/kernel.rst`
