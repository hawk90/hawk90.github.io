---
title: "3-01: Bus Architecture — AHB·AXI·CHI 진화와 5-Channel"
date: 2026-05-08T00:00:00
description: "ARM AMBA — AHB·APB·AXI·ACE·CHI. AXI 5 channel, burst, outstanding transaction."
series: "Embedded Performance Engineering"
seriesOrder: 19
tags: [bus, ahb, axi, chi, amba]
draft: true
---

## 한 줄 요약

> **"Bus = CPU와 peripheral 사이 다리"** — bandwidth·latency 결정.

## AMBA 진화

| Bus | 도입 | 특징 | 사용처 |
|---|---|---|---|
| **APB** (Advanced Peripheral Bus) | 1996 | 단일 사이클, 단순 | UART·timer·GPIO |
| **AHB** (High-perf) | 1999 | Burst, pipeline | Cortex-M, 옛 Cortex-A |
| **AXI** (eXtensible Interface) | 2003 | 5 channel, OoO | Cortex-A, GPU |
| **ACE** (AXI Coherency Ext) | 2011 | Cache coherence | big.LITTLE |
| **CHI** (Coherent Hub Interface) | 2014 | Mesh, scalable | server-class SoC |

ARM Cortex-M = *AHB-Lite + APB*. Cortex-A = *AXI + CCI/CCN/CMN(CHI)*.

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

5 채널 = *독립 핸드셰이크*. Read·Write 동시 진행, OoO 응답 가능.

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

**VALID/READY handshake** — 양쪽 모두 high여야 transfer 발생.

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

같은 ID는 *FIFO 순서*, 다른 ID는 *OoO 가능*.

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

Cache line fill (64 byte, 8 × 64-bit beat) — `ARLEN=7, ARSIZE=011, ARBURST=WRAP`.

## Outstanding Transaction

```text
Master가 *응답 받기 전*에 다음 AR 발사 가능.

Time:  1    2    3    4    5    6
       AR0  AR1  AR2  AR3  AR4  AR5
                      R0        R1
                                R2 ...
```

Throughput 향상 — DRAM latency를 *parallelism으로 hide*.

`Outstanding count` = 동시 미응답 수. Cortex-A72 = 32+, peripheral은 보통 2-4.

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

AHB는 *간단*해서 작은 MCU에 적합. AXI는 *복잡하지만 throughput 높음*.

## APB — Peripheral 전용

```text
2-cycle (setup + access):
  Cycle 1: PSEL=1, PENABLE=0, PADDR set
  Cycle 2: PENABLE=1, PRDATA returned (read) / PWDATA captured (write)
```

매우 단순 — UART·timer·GPIO 등 *낮은 대역폭 peripheral*.

Cortex-M : `[Cortex-M] ─ AHB ─ [bridge] ─ APB ─ [UART, timer, GPIO]`.

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

ARM CMN (Coherent Mesh Network) — *grid topology* — server·고급 모바일 SoC.

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

각 stage = AXI 또는 ACE. CCI-400 — 4 cluster cache coherent interconnect.

## 측정 — AXI 활용도

| Metric | 의미 |
|---|---|
| **VALID without READY** | Backpressure (downstream 못 따라옴) |
| **READY without VALID** | Idle (upstream 데이터 없음) |
| **Outstanding count** | Concurrency 수준 |
| **Burst length 분포** | Cache line fill vs single |

SoC integration 시 *AXI monitor* (Synopsys VIP 등)로 capture.

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

STM32H7가 *고성능 Cortex-M7*인 이유 — AXI bus matrix로 *parallel access*.

## DMA·CPU Contention

```text
CPU AXI master + DMA AXI master → 같은 slave (DDR) 접근
  → arbiter가 우선순위 결정
  → DMA 우선 시 CPU stall
  → CPU 우선 시 DMA latency 증가
```

`ARQOS·AWQOS` (Quality of Service) — 4-bit priority. CCI-400은 *bandwidth regulation* 가능.

## Slave Response — OKAY/EXOKAY/SLVERR/DECERR

```text
00 OKAY     — 정상
01 EXOKAY   — exclusive access 성공
10 SLVERR   — slave 오류 (peripheral 미준비)
11 DECERR   — decode 오류 (해당 주소 없음)
```

Bus fault → ARM Cortex-A `Synchronous External Abort`, Cortex-M `BusFault`.

## 자주 하는 실수

> ⚠️ Burst boundary 넘김

```text
AXI burst는 *4KB boundary* 넘으면 안 됨.
INCR16 (16 transfer × 8 byte = 128 byte) → 4 KB 안에 있어야.
```

DMA controller가 자동 split — 그러나 *수동 AXI master* 시 split 필요.

> ⚠️ ID 충돌

```text
같은 ID로 2 outstanding → slave가 응답을 *순서대로* 줘야 함.
서로 다른 slave면 — *재정렬 못 함* → deadlock 가능.
```

`Unique ID per slave path` 권장.

> ⚠️ Outstanding 너무 많음

CPU가 100 outstanding → DRAM scheduler에 *queue pressure*. 다른 master 굶주림.

> ⚠️ APB peripheral을 AHB master로 가정

APB는 *간단 2-cycle* — burst 없음, OoO 없음. AXI에서 APB로 *bridge 통해* 매핑.

## 정리

- AMBA 진화 — **APB → AHB → AXI → ACE → CHI**.
- AXI = **5 channel** (AR·R·AW·W·B), *독립 handshake*.
- **ID·Burst·Outstanding**으로 OoO + parallel throughput.
- Cortex-M7 = AHB-Lite + APB + AXI bus matrix.
- Cortex-A = AXI + CCI/CMN coherent interconnect.
- DMA·CPU contention 시 QoS 활용.

다음 편은 **Bus Contention 분석**.

## 관련 항목

- [2-10: PMU](/blog/embedded/performance-engineering/part2-10-pmu)
- [3-02: Bus Contention](/blog/embedded/performance-engineering/part3-02-bus-contention)
