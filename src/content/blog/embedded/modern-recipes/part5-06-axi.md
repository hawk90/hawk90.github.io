---
title: "5-06: AXI Backpressure — Outstanding·QoS·ID·Deadlock"
date: 2026-05-21T00:00:00
description: "AXI ready/valid handshake. Backpressure. Outstanding transactions. ID-based ordering. Deadlock 회피."
series: "Modern Embedded Recipes"
seriesOrder: 30
tags: [recipes, axi, backpressure, qos, deadlock]
draft: true
---

## 한 줄 요약

> **"AXI = ready/valid handshake + 5 channel"** — backpressure가 system 동작 결정.

## AXI 5 Channel

```text
AR  Address Read   master → slave
R   Read Data      slave → master
AW  Address Write  master → slave
W   Write Data     master → slave
B   Write Response slave → master
```

각 채널 = *VALID + READY* 양쪽 high시 transfer.

## Backpressure — Ready 신호

```text
Master:  VALID │ Data│Data│Data│ . . . │
                   1   1    1     0
Slave:   READY │   1   0    1     1   │   ← READY=0 동안 wait
                          ↑
                     Slave가 못 받음 — Master는 *데이터 유지*
```

Slave가 *느리면* — READY=0 → Master 대기. 자연스러운 flow control.

## Producer-Slow

```c
/* Slow producer */
ARVALID = 1;
ARADDR = 0x1000;
while (ARREADY == 0);   /* Master가 next 못 보냄 */
```

Slow producer — slave는 *idle*. Bandwidth ↓.

## Consumer-Slow

```c
/* Read return */
RVALID = 1;
RDATA = ...;
while (RREADY == 0);   /* Master가 못 받음 */
```

Slow consumer — slave queue 가득 차면 *backpressure* upstream.

## Outstanding Transactions

```text
Master가 *응답 받기 전*에 새 요청 발사 가능

Time:   AR0  AR1  AR2  AR3  AR4
                        R0
                        R1  R2  R3  R4

Outstanding 4 = 동시 미응답 4개
```

DDR latency hide — `Outstanding > 1` 필수.

```c
/* Xilinx HLS */
#pragma HLS INTERFACE m_axi port=data max_read_outstanding=8
```

## QoS — Quality of Service

```text
ARQOS / AWQOS — 4-bit (0-15)
Higher value = higher priority
Arbiter가 우선 처리
```

```c
/* CCI-400 / NIC-400 */
ARQOS_high = 15;   /* DPU·display */
ARQOS_med  = 8;    /* CPU·GPU */
ARQOS_low  = 4;    /* DMA bulk */
```

자동차 — *brake sensor higher*, *infotainment lower*.

## ID-Based Ordering

```text
같은 ARID의 transaction:
  → 응답이 *순서대로* (FIFO)
  
다른 ARID:
  → 응답 *임의 순서* (OoO)
```

```c
/* Master */
issue(ARID=0, addr=0x1000);   /* 응답 1 */
issue(ARID=0, addr=0x2000);   /* 응답 2 */
issue(ARID=1, addr=0x3000);   /* 별도 ID — OoO */
```

CPU per-core ID·DMA per-channel ID — 유연성·재정렬.

## Deadlock — ID 충돌

```text
Same ID에 다른 slave:
  AR (id=0) → slave A
  AR (id=0) → slave B
  
Slave A 빠름, B 느림:
  B의 응답 = waiting
  A의 응답 = waiting (same ID FIFO 순서)
  → deadlock
```

해결 — *slave별 unique ID*. `ARID = base_id | (slave_id << 4)`.

## AXI Bus Matrix — Multi-Master

```text
Masters:        Slaves:
M0 CPU       ─→  S0 DDR
M1 DMA       ─→  S1 SRAM
M2 GPU       ─→  S2 Peripherals
M3 USB       
M4 Ethernet
```

각 master-slave 조합 = *별도 path*. 동시 transfer 가능.

```c
/* STM32H7 AXI Bus Matrix */
HAL_AXIBusMatrix_SetPriority(M0_CPU, S0_DDR, AXI_PRIORITY_HIGH);
HAL_AXIBusMatrix_SetPriority(M5_LTDC, S0_DDR, AXI_PRIORITY_HIGHEST);
```

LCD display = 최우선 (frame drop 방지).

## AXI4 vs AXI-Lite vs AXI-Stream

```text
AXI4 (full):
  - 5 channel
  - Burst, OoO, outstanding
  - Memory-mapped DMA
  
AXI-Lite:
  - Subset — single beat only
  - Register interface
  - Simple
  
AXI-Stream:
  - Continuous data flow
  - No address
  - DMA·video·audio pipeline
```

HLS — *역할별 다른 interface*.

## AXI Stream — TLAST·TUSER

```text
AXI-Stream 신호:
  TDATA[N:0]    — data
  TVALID/TREADY — handshake
  TLAST         — packet 끝 표시
  TUSER[M:0]    — sideband data
  TKEEP         — byte-level enable
  TSTRB         — sparse beat
```

Video — *TLAST = end of line*. Network — *TLAST = end of packet*.

## Performance Counter

```text
ARM CCI-400 / DSU PMU events:
  BUS_ACCESS_LD      — read transactions
  BUS_ACCESS_ST      — write transactions
  BUS_CYCLES         — bus active
  BUS_ACCESS_CHKD    — external bus
  
Utilization = BUS_ACCESS / BUS_CYCLES
Latency = BUS_CYCLES_PER_TRANSACTION
```

```bash
perf stat -e r19,r1d ./prog
```

## AXI Trace — Diagnostic

```text
SoC integrated AXI monitor:
  - VALID·READY 시계열
  - 평균 latency
  - Backpressure 빈도
  - Outstanding distribution
  
ARM Streamline·Xilinx ChipScope — 시각화.
```

## Cortex-A SoC — AXI 진화

```text
Cortex-A7·A53: AXI-3
Cortex-A57+: AXI-4 + ACE (coherent)
Cortex-A78: CHI (Coherent Hub Interface, message-based)
```

CHI — message-based, scalable. 서버 *수십 코어*.

## Xilinx Zynq Ultrascale+

```text
PS·PL AXI interfaces:
  HP (High Performance) 4 ports — DDR bypass cache
  HPC (HP Cache-coherent) 2 ports — coherent
  ACP (Accelerator Coherency Port) — full coherency
  GP (General Purpose) 4 ports — control
```

FPGA accelerator → AXI HP master로 DDR access. ACP = coherent with CPU.

## DDR Memory Controller AXI

```text
DDR4 controller — AXI slave:
  - Single port — bottleneck
  - Multi-port (HBM, GDDR) — parallel
  
QoS:
  - 큰 outstanding = bandwidth ↑, latency ↑
  - 작은 outstanding = latency 안정
```

자동차 RT — *fixed outstanding* + dedicated CPU port.

## Latency vs Throughput Trade-off

```text
4-beat burst:
  - latency 50 ns
  - throughput 50%
  
16-beat burst:
  - latency 100 ns
  - throughput 95%
  
256-beat burst:
  - latency 1 µs
  - throughput 99%
```

Camera·video — *big burst*. Sensor·control — *small + low latency*.

## AXI-S DMA Pattern

```c
/* AXI-S + DMA — typical */
DMA->S2MM_DESC[0].buf = (uint32_t)buf;
DMA->S2MM_DESC[0].len = 1024;
DMA->S2MM_DESC[0].next = (uint32_t)&desc[1];

DMA->S2MM_TAILDESC = (uint32_t)&desc[N-1];
DMA->S2MM_CR = RUN;
```

Stream → DMA → DDR. Camera·LiDAR ingestion.

## 자동차 — AXI QoS 사례

```text
Cortex-A53 cluster + Mali GPU + DPU + Camera ISP:
  
QoS allocation:
  Camera ISP   QoS=15  (frame drop 안 됨)
  DPU display  QoS=14  (frame drop 안 됨)
  CPU cluster  QoS=10
  Mali GPU     QoS=8
  USB·Audio    QoS=5
  
Bandwidth allocation:
  DDR total 16 GB/s
  Camera   max 4 GB/s (regulator)
  GPU      max 4 GB/s
  Others   shared
```

## 자주 하는 실수

> ⚠️ Same ID multi-slave

```c
/* deadlock */
issue(ARID=0, slave_A);
issue(ARID=0, slave_B);
```

→ slave별 ID 분리.

> ⚠️ Outstanding 1

```c
#pragma HLS INTERFACE m_axi max_read_outstanding=1
/* DDR latency hide 안 됨 */
```

→ 4+ outstanding.

> ⚠️ Burst boundary 위반

```text
AXI4 burst — 4 KB boundary 못 넘음
INCR16 × 16 byte = 256 byte → OK
INCR256 × 16 = 4 KB → boundary 정확
```

DMA controller가 *자동 split* — 그러나 RAW AXI master 수동.

> ⚠️ QoS 무시

```c
/* 모든 master QoS=0 — round-robin */
/* RT critical master starvation */
```

→ QoS 명시.

## 정리

- AXI = **5 channel + ready/valid handshake**.
- **Outstanding transactions** = DDR latency hide.
- **ID** — same ID FIFO, different OoO.
- **QoS** = master 우선순위.
- **Bus matrix** — multi-master·multi-slave parallel.
- 자동차·자율주행 — *QoS 명시 필수*.

이번 시리즈 Part 5 여기까지.

## 관련 항목

- [5-05: HLS](/blog/embedded/modern-recipes/part5-05-hls)
- [PE 3-01: Bus Architecture](/blog/embedded/performance-engineering/part3-01-bus-architecture)
- [PE 3-02: Bus Contention](/blog/embedded/performance-engineering/part3-02-bus-contention)
