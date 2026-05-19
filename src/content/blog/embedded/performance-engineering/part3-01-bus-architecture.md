---
title: "3-01: Bus Architecture — AHB·AXI·CHI 진화와 5-Channel"
date: 2026-05-08T00:00:00
description: "ARM AMBA — AHB·APB·AXI·ACE·CHI. AXI 5 channel, burst, outstanding transaction."
series: "Embedded Performance Engineering"
seriesOrder: 19
tags: [bus, ahb, axi, chi, amba]
draft: false
---

## 한 줄 요약

> **"Bus = CPU와 peripheral 사이 다리"**입니다. 시스템의 bandwidth와 latency를 결정합니다.

## AMBA 진화

| Bus | 도입 | 특징 | 사용처 |
|---|---|---|---|
| **APB** (Advanced Peripheral Bus) | 1996 | 단일 사이클, 단순 | UART·timer·GPIO |
| **AHB** (High-perf) | 1999 | Burst, pipeline | Cortex-M, 옛 Cortex-A |
| **AXI** (eXtensible Interface) | 2003 | 5 channel, OoO | Cortex-A, GPU |
| **ACE** (AXI Coherency Ext) | 2011 | Cache coherence | big.LITTLE |
| **CHI** (Coherent Hub Interface) | 2014 | Mesh, scalable | server-class SoC |

ARM Cortex-M은 AHB-Lite와 APB를 함께 씁니다. Cortex-A는 AXI에 CCI/CCN/CMN(CHI)을 결합합니다.

두 세대를 한 장의 그림으로 비교하면 master/slave 연결 구조의 차이가 잘 드러납니다.

![AHB-Lite + APB(Cortex-M)와 AXI Interconnect(Cortex-A) 비교](/images/blog/perf-eng/diagrams/part3-01-bus-architecture.svg)

## AXI 5 채널

```text
Master                                       Slave
  │                                             │
  │ ── Address Read    (AR) ───────────────→  │
  │ ←── Read Data      (R)  ───────────────  │
  │                                             │
  │ ── Address Write   (AW) ───────────────→  │
  │ ── Write Data      (W)  ───────────────→  │
  │ ←── Write Response (B)  ───────────────  │
```

5 채널은 각각 독립적으로 핸드셰이크합니다. Read와 Write가 동시에 진행되며, OoO 응답도 가능합니다.

## 채널별 시그널

```text
AR (Read Address):
  ARID, ARADDR, ARLEN, ARSIZE, ARBURST, ARLOCK, ARCACHE, ARPROT, ARVALID, ARREADY

R (Read Data):
  RID, RDATA, RRESP, RLAST, RVALID, RREADY

AW (Write Address):
  AWID, AWADDR, AWLEN, AWSIZE, AWBURST, AWLOCK, AWCACHE, AWPROT, AWVALID, AWREADY

W (Write Data):
  WDATA, WSTRB, WLAST, WVALID, WREADY

B (Write Response):
  BID, BRESP, BVALID, BREADY
```

**VALID/READY handshake**는 양쪽이 모두 high여야 transfer가 발생합니다.

## ID — Out-of-Order 지원

```text
Master가 transaction에 ID 부여:
  AR0: ID=0, addr=0x1000
  AR1: ID=1, addr=0x2000  (다른 ID)
  AR2: ID=0, addr=0x3000  (같은 ID — 순서 보장)

Slave 응답:
  R: ID=1, data=0xCAFE   (AR1 응답 먼저 가능)
  R: ID=0, data=...      (AR0)
  R: ID=0, data=...      (AR2 — 같은 ID 내 순서)
```

같은 ID끼리는 FIFO 순서를 지키고, 다른 ID 사이에서는 OoO가 가능합니다.

## Burst Transaction

```text
ARBURST:
  00 FIXED — 같은 주소 반복 (peripheral FIFO read)
  01 INCR  — 주소 자동 증가 (memory)
  10 WRAP  — 경계에서 wrap (cache line fill)
  11 reserved

ARLEN — burst 길이 (0=1 transfer, 15=16 transfer)
ARSIZE — 각 transfer bytes (000=1, 011=8, 100=16, ..., 111=128)
```

예를 들어 cache line fill(64 byte, 8 × 64-bit beat)은 `ARLEN=7, ARSIZE=011, ARBURST=WRAP`으로 표현합니다.

## Outstanding Transaction

```text
Master가 *응답 받기 전*에 다음 AR 발사 가능.

Time:  1    2    3    4    5    6
       AR0  AR1  AR2  AR3  AR4  AR5
                      R0        R1
                                R2 ...
```

이렇게 하면 throughput이 향상됩니다. DRAM latency를 parallelism으로 가리는 효과가 있습니다.

`Outstanding count`는 동시에 미응답 상태로 둘 수 있는 transaction 수입니다. Cortex-A72는 32개 이상, peripheral은 보통 2-4개 수준입니다.

## AHB-Lite vs AXI 차이

| 항목 | AHB-Lite | AXI |
|---|---|---|
| Master | 1 | N |
| Channel | 단일 (address + data) | 5 |
| OoO | X | O |
| Outstanding | 1 | N |
| Pipeline | Yes | Yes |
| Burst | INCR4/8/16 | flexible 1-256 |
| 사용처 | Cortex-M | Cortex-A |

AHB는 간단해서 작은 MCU에 적합합니다. AXI는 복잡하지만 throughput이 높습니다.

## APB — Peripheral 전용

```text
2-cycle (setup + access):
  Cycle 1: PSEL=1, PENABLE=0, PADDR set
  Cycle 2: PENABLE=1, PRDATA returned (read) / PWDATA captured (write)
```

매우 단순한 구조라서 UART·timer·GPIO처럼 낮은 대역폭 peripheral에 어울립니다.

Cortex-M에서는 보통 `[Cortex-M] ─ AHB ─ [bridge] ─ APB ─ [UART, timer, GPIO]` 형태로 연결합니다.

## NoC — Network-on-Chip

```text
Multi-core SoC:
  [Cluster 0] ──┐
                │
                │            ┌── [DDR Controller]
  [Cluster 1] ──┼── NoC ─────┤
                │            ├── [GPU]
                │            ├── [VPU]
  [Cluster 2] ──┤            └── [PCIe]
                │
  [IO Master]  ─┘
```

ARM CMN(Coherent Mesh Network)은 grid topology 구조로, server 및 고급 모바일 SoC에서 사용합니다.

## Cortex-A72 — Bus Hierarchy

```text
[Cortex-A72 core]
  │
[L1 D]  [L1 I]
  │      │
  └──┬───┘
     ↓
   [L2 (cluster 공유)]
     ↓
   [SCU + ACE]   ← cluster ACE master
     ↓
  [CCI-400 (cluster interconnect)]
     ↓
   [Memory Controller] → DDR
```

각 stage는 AXI 또는 ACE로 연결됩니다. CCI-400은 4 cluster cache coherent interconnect입니다.

## 측정 — AXI 활용도

| Metric | 의미 |
|---|---|
| **VALID without READY** | Backpressure (downstream 못 따라옴) |
| **READY without VALID** | Idle (upstream 데이터 없음) |
| **Outstanding count** | Concurrency 수준 |
| **Burst length 분포** | Cache line fill vs single |

SoC integration 단계에서 AXI monitor(Synopsys VIP 등)로 데이터를 캡쳐합니다.

## STM32H7 — AXI 사례

```text
Cortex-M7 (AHB-Lite) ─→ AXI bus matrix ─→ DDR ext / SRAM / FMC

Master:
- M0: Cortex-M7 ITCM·DTCM access
- M1: Cortex-M7 AXI
- M2: SDMMC1·2
- M3: MDMA (Master DMA)
- M4: HASH·CRYP·CAMERA
- M5: LCD-TFT

Slave:
- S0: AXI SRAM (512 KB)
- S1: AHB SRAM1
- S2: AHB SRAM2
- S3: APB1·2·3·4 (peripheral)
- S4: FMC ext memory
- S5: QUADSPI
```

STM32H7이 고성능 Cortex-M7으로 평가받는 이유 중 하나가 바로 AXI bus matrix를 통한 parallel access입니다.

## DMA·CPU Contention

```text
CPU AXI master + DMA AXI master → 같은 slave (DDR) 접근
  → arbiter가 우선순위 결정
  → DMA 우선 시 CPU stall
  → CPU 우선 시 DMA latency 증가
```

`ARQOS`와 `AWQOS`는 4-bit priority를 제공합니다. CCI-400은 bandwidth regulation도 가능합니다.

## Slave Response — OKAY/EXOKAY/SLVERR/DECERR

```text
00 OKAY     — 정상
01 EXOKAY   — exclusive access 성공
10 SLVERR   — slave 오류 (peripheral 미준비)
11 DECERR   — decode 오류 (해당 주소 없음)
```

Bus fault가 발생하면 ARM Cortex-A에서는 `Synchronous External Abort`, Cortex-M에서는 `BusFault`로 잡힙니다.

## 자주 하는 실수

> ⚠️ Burst boundary 넘김

```text
AXI burst는 *4KB boundary* 넘으면 안 됨.
INCR16 (16 transfer × 8 byte = 128 byte) → 4 KB 안에 있어야.
```

DMA controller는 자동으로 split을 처리하지만, 수동으로 AXI master를 다룰 때는 직접 split해야 합니다.

> ⚠️ ID 충돌

```text
같은 ID로 2 outstanding → slave가 응답을 *순서대로* 줘야 함.
서로 다른 slave면 — *재정렬 못 함* → deadlock 가능.
```

slave 경로마다 unique ID를 두는 것이 안전합니다.

> ⚠️ Outstanding 너무 많음

CPU가 outstanding 100개를 발사하면 DRAM scheduler에 queue pressure가 쌓이고, 다른 master가 굶주리게 됩니다.

> ⚠️ APB peripheral을 AHB master로 가정

APB는 단순한 2-cycle 프로토콜이라서 burst나 OoO가 없습니다. AXI에서 APB로 넘어갈 때는 bridge를 통해 매핑해야 합니다.

## 정리

- AMBA는 **APB → AHB → AXI → ACE → CHI** 순으로 진화했습니다.
- AXI는 **5 channel**(AR·R·AW·W·B)로 구성되며 독립 handshake를 합니다.
- **ID·Burst·Outstanding**으로 OoO와 parallel throughput을 얻습니다.
- Cortex-M7은 AHB-Lite + APB + AXI bus matrix를 함께 사용합니다.
- Cortex-A는 AXI에 CCI/CMN coherent interconnect를 결합합니다.
- DMA와 CPU가 contention을 일으킬 때 QoS를 활용합니다.

다음 편에서는 **Bus Contention 분석**을 다룹니다.

## 관련 항목

- [2-10: PMU](/blog/embedded/performance-engineering/part2-10-pmu)
- [3-02: Bus Contention](/blog/embedded/performance-engineering/part3-02-bus-contention)
