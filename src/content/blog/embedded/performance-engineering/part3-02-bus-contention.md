---
title: "3-02: Bus Contention — Arbitration·QoS·Starvation 진단"
date: 2026-05-08T01:00:00
description: "Round-robin·priority·QoS arbitration. Master 다수 시 starvation. AXI QoS·BUSY counter."
series: "Embedded Performance Engineering"
seriesOrder: 20
tags: [bus, contention, arbitration, qos, starvation]
draft: false
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

A·B·C·D 동시 요청 → D 먼저
```

장점은 critical master를 보장한다는 점입니다. 단점은 low priority master가 starvation에 빠질 수 있다는 점입니다.

### Weighted Round-Robin

```text
Master A weight=3, B weight=1, C weight=1
순환: A A A B C A A A B C ...
```

대역폭을 정해진 비율로 분배하는 방식입니다.

### QoS-Based (AXI)

```text
ARQOS = 4-bit (0-15)
Arbiter — *높은 QoS 우선*, 같으면 round-robin
```

ARM CCI-400과 CMN의 표준 방식이며, Cortex-A SoC에서 흔히 사용합니다.

## Cortex-A SoC — CCI-400 사례

```text
[Cluster 0 (4 × A72)]  AXI ─→ [CCI-400] ─→ DDR Controller
[Cluster 1 (4 × A53)]  AXI ─→
[GPU]                  AXI ─→
[DPU (display)]        AXI ─→
[VPU (video)]          AXI ─→
```

CCI-400은 5 master와 3 slave까지 지원합니다. master별 QoS regulator와 bandwidth limiter를 함께 제공합니다.

```c
/* CCI-400 register */
CCI->QoS[CLUSTER0] = 0xC;   // medium-high
CCI->QoS[DPU]      = 0xF;   // highest — frame drop 방지
CCI->QoS[GPU]      = 0x8;   // medium
```

## STM32H7 — AXI Bus Matrix

```text
Slave 6개, master 7개 → 42 path
각 path별 *fixed priority* or *round-robin* 설정

기본 — round-robin
critical (LTDC for display) — fixed high priority
```

```c
/* HAL */
__HAL_RCC_AXI_CLK_ENABLE();
HAL_AXIBusMatrix_ConfigPriority(M5_LTDC, AXI_PRIORITY_HIGH);
```

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
CCI->BW_REGULATOR[A] = LIMIT_50_PCT;   // A는 50%만 사용
```

A의 throughput을 일부 손실하는 대신 B의 latency를 개선할 수 있습니다.

### 해결 2: Latency-based QoS

```c
ARQOS = LATENCY_CRITICAL;   // arbiter가 *delay 안 우선*
```

CCI가 대기 시간까지 고려해서, 오래 기다린 transaction일수록 priority를 올려 줍니다.

## 측정 — AXI Monitor

ARM CoreSight와 DSU PMU를 함께 활용합니다.

```text
Event: BUS_ACCESS_LD, BUS_ACCESS_ST
Event: BUS_ACCESS_CHKD (외부 bus 접근만)
Event: BUS_CYCLES (bus active cycle)
```

$$U_{bus} = \frac{\text{BUS\_ACCESS}}{\text{BUS\_CYCLES}}$$

```bash
perf stat -e r19,r1d ./prog
# BUS_ACCESS=10M, BUS_CYCLES=100M → 10% utilization
```

## VTune Memory Bandwidth Analysis

VTune의 time-series chart는 다음과 같이 표시됩니다.

```text
Time-series chart:
  CPU: ────░░░░░░░░░░░──── (10%)
  GPU: ──────░░░░░░██████  (60%)
  DMA: ░░░░░░░░░░░░░░░░██  (5%)
  Total: ░░░░░░░░██████░░  (saturation)
```

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

```text
Master:    M0 CPU
           M1 DMA1
           M2 DMA2
           M3 Ethernet
           M4 USB

Slave:     S0 Flash
           S1 SRAM1
           S2 SRAM2
           S3 AHB1 peripherals
           S4 APB1
           S5 APB2

→ M0 ↔ S0 (code fetch)
   M1 ↔ S1 (DMA data)
   M2 ↔ S2 (DMA data)
   동시 — *4 simultaneous transfer*
```

bus matrix 덕분에 같은 buffer만 쓰지 않으면 대역폭이 4배까지 늘어납니다.

## QoS 동적 조정 — 자동차 사례

```c
void on_brake_event(void) {
    /* 브레이크 신호 — critical */
    CCI->QOS[BRAKE_ECU] = MAX_PRIORITY;
    /* 다른 master → 낮춤 */
    CCI->QOS[INFOTAINMENT] = LOW;
}
```

차량 상태에 따라 priority를 동적으로 조정합니다. 다만 ASIL-D ECU에서는 정적으로 worst case를 보장하는 쪽을 우선합니다.

## Bandwidth Regulator

```c
/* CCI-400 — per master */
CCI->REG_THROTTLE[GPU] = TOKEN_BUCKET(
    .max_burst = 64,         // 64 transfer
    .replenish_rate = 100    // 100 transfer/µs
);
```

Token bucket 방식은 peak는 허용하면서 평균을 제한합니다. GPU와 DPU에 흔히 사용하며, frame drop을 막으면서도 CPU 대역폭을 함께 보장합니다.

## 자주 하는 실수

> ⚠️ 같은 master ID로 multi-thread

```text
Cortex-A core 4개가 모두 ID=0으로 transaction 발사
  → AXI는 *같은 ID FIFO 순서* 강제 → OoO 못 함
```

Cluster와 Core별로 unique ID를 부여해야 합니다. Cortex-A72의 ARID는 `cluster|core|thread`로 encoding되어 있습니다.

> ⚠️ QoS 모든 master 최대

```c
CCI->QOS[CPU] = 15;
CCI->QOS[GPU] = 15;
CCI->QOS[DMA] = 15;
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
- STM32H7은 7×6 bus matrix로 parallel transfer를 지원합니다.
- 자동차 시스템에서는 상황에 따라 QoS를 동적으로 조정합니다.
- 측정은 PMU의 `BUS_ACCESS`와 `BUS_CYCLES`로 수행합니다.

다음 편에서는 **DMA Performance**를 다룹니다.

## 관련 항목

- [3-01: Bus Architecture](/blog/embedded/performance-engineering/part3-01-bus-architecture)
- [3-03: DMA Performance](/blog/embedded/performance-engineering/part3-03-dma-performance)
