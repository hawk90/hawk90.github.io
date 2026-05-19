---
title: "3-02: Bus Contention — Arbitration·QoS·Starvation 진단"
date: 2026-05-08T01:00:00
description: "Round-robin·priority·QoS arbitration. Master 다수 시 starvation. AXI QoS·BUSY counter."
series: "Embedded Performance Engineering"
seriesOrder: 20
tags: [bus, contention, arbitration, qos, starvation]
draft: true
---

## 한 줄 요약

> **"Contention = 여러 master 한 slave 동시 access"** — arbiter가 *공평 vs 빠름* trade-off.

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

장점 — *공평*, 굶주림 없음. 단점 — 우선순위 없음.

### Priority

```text
Master:  A (P0) B (P1) C (P2) D (P3)
                                ↑ highest

A·B·C·D 동시 요청 → D 먼저
```

장점 — critical master 보장. 단점 — *low priority starvation*.

### Weighted Round-Robin

```text
Master A weight=3, B weight=1, C weight=1
순환: A A A B C A A A B C ...
```

대역폭을 *비율로 분배*.

### QoS-Based (AXI)

```text
ARQOS = 4-bit (0-15)
Arbiter — *높은 QoS 우선*, 같으면 round-robin
```

ARM CCI-400·CMN 표준. Cortex-A SoC에서 흔히 사용.

## Cortex-A SoC — CCI-400 사례

```text
[Cluster 0 (4 × A72)]  AXI ─→ [CCI-400] ─→ DDR Controller
[Cluster 1 (4 × A53)]  AXI ─→
[GPU]                  AXI ─→
[DPU (display)]        AXI ─→
[VPU (video)]          AXI ─→
```

CCI-400 — *5 master, 3 slave* 가능. Per-master QoS regulator + bandwidth limiter.

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

A의 throughput 손실 + B의 latency 개선.

### 해결 2: Latency-based QoS

```c
ARQOS = LATENCY_CRITICAL;   // arbiter가 *delay 안 우선*
```

CCI가 *대기 시간*도 고려. 옛 transaction일수록 priority boost.

## 측정 — AXI Monitor

ARM CoreSight + DSU PMU:

```text
Event: BUS_ACCESS_LD, BUS_ACCESS_ST
Event: BUS_ACCESS_CHKD (외부 bus 접근만)
Event: BUS_CYCLES (bus active cycle)

Utilization = BUS_ACCESS / BUS_CYCLES
```

```bash
perf stat -e r19,r1d ./prog
# BUS_ACCESS=10M, BUS_CYCLES=100M → 10% utilization
```

## VTune Memory Bandwidth Analysis

```text
Time-series chart:
  CPU: ────░░░░░░░░░░░──── (10%)
  GPU: ──────░░░░░░██████  (60%)
  DMA: ░░░░░░░░░░░░░░░░██  (5%)
  Total: ░░░░░░░░██████░░  (saturation)
```

색칠된 부분 = active. *총합 100% 가까이 = saturation*.

## DMA·CPU 충돌 해결

### TCM (Cortex-M·R) 활용

```c
__attribute__((section(".dtcm"))) uint8_t fast_buf[8192];

void critical_isr(void) {
    /* DTCM은 *별도 bus* — DMA·main RAM과 충돌 없음 */
    process(fast_buf);
}
```

DTCM·ITCM = *CPU 전용 bus* — bus matrix 우회.

### Cache Locking

```c
/* Cortex-A53 — way locking */
write_l2_lockdown(WAY_0, 1);   // way 0 lock
/* 특정 line이 evict 안 됨 — predictable latency */
```

WCET 보장이 critical한 경우.

### Master 분리 SoC 디자인

```text
CPU ─→ DDR0
GPU ─→ DDR1   (분리된 channel)
DMA ─→ DDR2
```

서로 다른 *DDR channel*로 access → contention 0. 고가 SoC만 가능 (BGA 핀 ↑).

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

bus matrix 덕분 — 같은 buffer 안 쓰면 *대역폭 4x*.

## QoS 동적 조정 — 자동차 사례

```c
void on_brake_event(void) {
    /* 브레이크 신호 — critical */
    CCI->QOS[BRAKE_ECU] = MAX_PRIORITY;
    /* 다른 master → 낮춤 */
    CCI->QOS[INFOTAINMENT] = LOW;
}
```

차량 상태별 *동적 priority*. ASIL-D ECU에선 정적 *최악 case* 보장 우선.

## Bandwidth Regulator

```c
/* CCI-400 — per master */
CCI->REG_THROTTLE[GPU] = TOKEN_BUCKET(
    .max_burst = 64,         // 64 transfer
    .replenish_rate = 100    // 100 transfer/µs
);
```

Token bucket — peak 허용, 평균 제한. GPU·DPU에 흔히 사용 (frame drop 방지하면서 CPU도 보장).

## 자주 하는 실수

> ⚠️ 같은 master ID로 multi-thread

```text
Cortex-A core 4개가 모두 ID=0으로 transaction 발사
  → AXI는 *같은 ID FIFO 순서* 강제 → OoO 못 함
```

Cluster·Core별로 *unique ID*. Cortex-A72 ARID = `cluster|core|thread` encoding.

> ⚠️ QoS 모든 master 최대

```c
CCI->QOS[CPU] = 15;
CCI->QOS[GPU] = 15;
CCI->QOS[DMA] = 15;
```

다 max → 의미 없음 (모두 동등) → round-robin으로 fallback.

> ⚠️ Bus contention 측정 안 함

성능 problem이 *CPU 부족* vs *bus saturation* 구분 안 됨. PMU `BUS_ACCESS`·`STALL_BACKEND_MEM` 비교.

> ⚠️ DMA가 CPU 깨움 패턴

```c
HAL_DMA_Start(...);
while (!dma_done) { CPU 대기 }   // CPU도 bus 점유 — 의미 없음
```

CPU sleep (WFI) 또는 *다른 일* 시킴 — bus 양보.

## 정리

- Arbitration — **round-robin·priority·weighted·QoS**.
- AXI **ARQOS** 4-bit으로 master별 우선순위.
- **Starvation** 방지 — bandwidth regulator·latency-based QoS.
- STM32H7 — *7×6 bus matrix*로 parallel transfer.
- 자동차 — *상황별 동적 QoS*.
- 측정 — PMU `BUS_ACCESS`·`BUS_CYCLES`.

다음 편은 **DMA Performance**.

## 관련 항목

- [3-01: Bus Architecture](/blog/embedded/performance-engineering/part3-01-bus-architecture)
- [3-03: DMA Performance](/blog/embedded/performance-engineering/part3-03-dma-performance)
