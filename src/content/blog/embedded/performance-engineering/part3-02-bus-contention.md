---
title: "Bus Contention 진단 — Arbitration·QoS·Starvation 측정"
slug: "embedded/performance-engineering/part3-02-bus-contention"
date: 2026-04-25T09:01:00
description: "Round-robin·priority·QoS arbitration. Master 다수 시 starvation. AXI QoS·BUSY counter."
series: "Embedded Performance Engineering"
seriesOrder: 20
tags: [bus, contention, arbitration, qos, starvation]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"Contention = 여러 master가 한 slave에 동시에 접근하는 상황"**입니다. arbiter는 공평과 빠름 사이에서 trade-off를 선택합니다.

## Arbitration 정책

### Round-Robin (Fair)

```text
Master:  A B C D
Token:   ↑ ──→
Cycle 1: A (token=A)
Cycle 2: B (token=B)
Cycle 3: C
Cycle 4: D
Cycle 5: A
```

장점은 공평하고 굶주림이 없다는 점입니다. 단점은 우선순위를 지정할 수 없다는 점입니다.

### Priority

```text
Master:  A (P0) B (P1) C (P2) D (P3)
                                ↑ highest
```

A·B·C·D가 동시에 요청하면 우선순위가 가장 높은 D가 먼저 처리됩니다. 장점은 critical master를 보장한다는 점입니다. 단점은 low priority master가 starvation에 빠질 수 있다는 점입니다.

### Weighted Round-Robin

```text
Master A weight=3, B weight=1, C weight=1
순환: A A A B C A A A B C ...
```

대역폭을 정해진 비율로 분배하는 방식입니다.

### QoS-Based (AXI)

![QoS-based arbitration — ARQOS 4-bit priority로 master 선택](/images/blog/perf-eng/diagrams/part3-02-arbitration.svg)

ARM CCI-400과 CMN의 표준 방식이며, Cortex-A SoC에서 흔히 사용합니다.

## Cortex-A SoC — CCI-400 사례

```text
[Cluster 0 (4 × A72)]  AXI ─→ [CCI-400] ─→ DDR Controller
[Cluster 1 (4 × A53)]  AXI ─→
[GPU]                  AXI ─→
[DPU (display)]        AXI ─→
[VPU (video)]          AXI ─→
```

CCI-400은 최대 2개의 ACE fully-coherent processor interface와 3개의 ACE-Lite I/O-coherent interface를 지원합니다. interface 종류와 연결은 설계 구성에 따라 달라집니다([Arm CCI-400 overview](https://developer.arm.com/community/arm-community-blogs/b/architectures-and-processors-blog/posts/extended-system-coherency---part-2---implementation-big-little-gpu-compute-and-enterprise)).

```c
/* 의사코드: 실제 CCI-400 레지스터 이름·필드·QoS 설정은 해당 SoC TRM에서 확인 */
set_platform_qos(cluster0, MEDIUM_HIGH);
set_platform_qos(dpu, HIGH);
set_platform_qos(gpu, MEDIUM);
```

## STM32H7 — AXI Bus Matrix

STM32H743은 D1 AXI와 D2/D3 AHB bus matrix 및 bus bridge로 구성됩니다. RM0433은 전체 연결을 19개 bus master와 18개 bus slave의 interconnect 표로 정리하며, 실제 접근 가능 경로는 master/slave 조합마다 다릅니다. arbitration 정책은 matrix와 domain에 따라 확인해야 합니다([ST RM0433](https://www.st.com/resource/en/reference_manual/rm0433-stm32h743-753-and-stm32h750-value-line-advanced-arm-based-32-bit-mcus-stmicroelectronics.pdf)).

RM0433은 bus matrix 별 arbitration을 설명하지만, 이 글에서는 STM32H743용 임의 QoS 설정 API를 제시하지 않습니다. 우선순위 설정이 필요한 경우 해당 MCU reference manual이 명시한 설정 항목과 영향을 확인합니다.

## Starvation 시나리오

다음과 같은 상황에서 starvation이 발생합니다.

```text
Master A: 매 cycle DMA burst 요청 (high priority)
Master B: 가끔 read 요청 (low priority)

Arbiter — A 우선 → B *수 ms 대기*
B의 latency-sensitive 작업 (LCD refresh) → frame drop
```

### 해결 1: Bandwidth Limit on A

```c
/* 의사코드: bus bandwidth limiter가 구현된 SoC에서만 사용 */
set_master_bandwidth_limit(master_a, 50_percent);
```

A의 throughput을 일부 손실하는 대신 B의 latency를 개선할 수 있습니다.

### 해결 2: Latency-based QoS

```c
/* 의사코드: 실제 ARQOS 신호 생성과 중재 정책은 SoC별로 다름 */
set_master_qos(master, LATENCY_CRITICAL);
```

QoS 값의 중재 효과는 interconnect 구현과 설정에 따릅니다. 대기 시간에 따라 priority가 자동 상승한다고 일반화하지 않습니다.

## 측정 — AXI Monitor

ARM CoreSight와 DSU PMU를 함께 활용합니다.

- 일부 PMU에는 load/store bus access나 bus-cycle 이벤트가 있지만, 이름과 의미는 core·SoC별로 다릅니다. 아래 이름을 보편적인 ARM PMU 이벤트로 가정하지 말고 해당 PMU 문서를 확인해야 합니다.

$$\text{access/cycle 비} = \frac{\text{BUS\_ACCESS}}{\text{BUS\_CYCLES}}$$

```bash
perf stat -e r19,r1d ./prog
# 예시 값에서 access/cycle 비는 0.1입니다. 이것은 bus utilization이 아닙니다.
# bus-active-cycle counter가 제공될 때만 active_cycles / total_cycles로 점유율을 계산합니다.
```

## VTune Memory Bandwidth Analysis

VTune의 time-series chart는 다음과 같이 표시됩니다.

**Time-series chart:**

- CPU: ────░░░░░░░░░░░──── (10%)
- GPU: ──────░░░░░░██████  (60%)
- DMA: ░░░░░░░░░░░░░░░░██  (5%)
- Total: ░░░░░░░░██████░░  (saturation)

색칠된 부분이 active 상태입니다. 총합이 100%에 가까워지면 saturation입니다.

## DMA·CPU 충돌 해결

### TCM (Cortex-M·R) 활용

```c
__attribute__((section(".dtcm"))) uint8_t fast_buf[8192];

void critical_isr(void) {
    /* DTCM은 *별도 bus* — DMA·main RAM과 충돌 없음 */
    process(fast_buf);
}
```

DTCM과 ITCM은 CPU 전용 bus라서 bus matrix를 우회합니다.

### Cache Locking

```c
/* Cortex-A53 — way locking */
write_l2_lockdown(WAY_0, 1);   // way 0 lock
/* 특정 line이 evict 안 됨 — predictable latency */
```

WCET 보장이 critical한 경우에 사용합니다.

### Master 분리 SoC 디자인

```text
CPU ─→ DDR0
GPU ─→ DDR1   (분리된 channel)
DMA ─→ DDR2
```

서로 다른 DDR channel로 access하면 contention이 0이 됩니다. 다만 BGA 핀 수가 늘어나 고가 SoC에서만 가능합니다.

## Cortex-M Bus Matrix — STM32 사례

RM0433의 STM32H743 연결 표는 AXI/AHB/TCM bus master와 memory/peripheral slave별 허용 경로를 구분합니다. CPU와 DMA가 동시에 접근할 수 있는지 여부는 각 경로와 대상 메모리의 조합으로 확인해야 합니다.

독립 경로가 병렬 동작할 수는 있지만, 같은 buffer를 피하는 것만으로 처리량이 4배가 된다고 보장되지는 않습니다.

## QoS 동적 조정 — 자동차 사례

```c
/* 의사코드: CCI-400 register name은 platform-specific */
void on_brake_event(void) {
    /* 브레이크 신호 — critical */
    set_platform_qos(BRAKE_ECU, MAX_PRIORITY);
    /* 다른 master → 낮춤 */
    set_platform_qos(INFOTAINMENT, LOW);
}
```

차량 상태에 따라 priority를 동적으로 조정합니다. 다만 ASIL-D ECU에서는 정적으로 worst case를 보장하는 쪽을 우선합니다.

## Bandwidth Regulator

```c
/* CCI-400 — per master */
set_platform_bandwidth_policy(GPU, TOKEN_BUCKET(
    .max_burst = 64,         // 64 transfer
    .replenish_rate = 100    // 100 transfer/µs
));
```

Token bucket 방식은 peak는 허용하면서 평균을 제한합니다. GPU와 DPU에 흔히 사용하며, frame drop을 막으면서도 CPU 대역폭을 함께 보장합니다.

## 자주 하는 실수

> ⚠️ 같은 master ID로 multi-thread

Cortex-A core 4개가 모두 ID=0으로 transaction을 발사하면 AXI가 *같은 ID FIFO 순서*를 강제해 OoO를 못 합니다.

Cluster와 Core별로 unique ID를 부여해야 합니다. Cortex-A72의 ARID는 `cluster|core|thread`로 encoding되어 있습니다.

> ⚠️ QoS 모든 master 최대

```c
set_platform_qos(cpu, MAX_PRIORITY);
set_platform_qos(gpu, MAX_PRIORITY);
set_platform_qos(dma, MAX_PRIORITY);
```

모두 max로 설정하면 의미가 없어집니다. 결과적으로 모두 동등해져 round-robin으로 fallback됩니다.

> ⚠️ Bus contention 측정 안 함

이렇게 두면 성능 문제가 CPU 부족 때문인지 bus saturation 때문인지 구분이 안 됩니다. PMU의 `BUS_ACCESS`와 `STALL_BACKEND_MEM`을 비교해야 합니다.

> ⚠️ DMA가 CPU 깨움 패턴

```c
HAL_DMA_Start(...);
while (!dma_done) { CPU 대기 }   // CPU도 bus 점유 — 의미 없음
```

CPU를 sleep(WFI) 상태로 두거나 다른 일을 시켜서 bus를 양보해야 합니다.

## 정리

- Arbitration 방식은 **round-robin, priority, weighted, QoS**가 있습니다.
- AXI는 **ARQOS** 4-bit으로 master별 우선순위를 표현합니다.
- **Starvation** 방지를 위해 bandwidth regulator와 latency-based QoS를 활용합니다.
- STM32H743의 bus master/slave 접근 가능 조합은 RM0433 interconnect 표에서 확인합니다.
- 자동차 시스템에서는 상황에 따라 QoS를 동적으로 조정합니다.
- 점유율은 해당 SoC가 제공하는 bus-active-cycle counter 정의를 확인해 계산합니다. access 수를 cycle 수로 나눈 값을 utilization으로 부르지 않습니다.

다음 편에서는 **DMA Performance**를 다룹니다.

## 관련 항목

- [3-01: Bus Architecture](/blog/embedded/performance-engineering/part3-01-bus-architecture)
- [3-03: DMA Performance](/blog/embedded/performance-engineering/part3-03-dma-performance)
