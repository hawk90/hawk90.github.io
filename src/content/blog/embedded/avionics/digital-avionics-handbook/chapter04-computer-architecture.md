---
title: "Ch 4: Avionics Computer Architecture"
date: 2026-05-25T04:00:00
description: "ARM·PowerPC·RAD 류 우주용 프로세서 — 신뢰성과 성능의 트레이드오프."
series: "Digital Avionics Handbook"
seriesOrder: 4
tags: [avionics, processor, rad750, leon, cortex]
draft: true
---

## 한 줄 요약

> **"Avionics processor = 신뢰성 + 방사선 + 인증"** — 성능보단 reliability·predictability.

## Avionics Processor 요구

```text
일반 임베디드 vs Avionics:

일반 임베디드 (commercial):
  + 고성능
  + 저전력
  + 저비용
  + 최신 process node
  
Avionics:
  + Deterministic (predictable execution)
  + Fault tolerance (lockstep·TMR)
  + 방사선 내성 (rad-hard, rad-tolerant)
  + 인증 friendly (manual·architecture 공개)
  + Long supply (~20-30년)
  + Wide temp (-55°C ~ +125°C)
  + Vibration·shock
  + 신뢰성 (MIL spec)
  
  - 성능 (commercial 대비 10년 뒤)
  - 비용 (10x~100x)
```

성능 ≠ 1순위. *예측 가능성 + 신뢰성*.

## Radiation Effect — 우주 특수

```text
SEU (Single Event Upset):
  중성자·양성자·중이온 → 메모리 bit flip
  Transient (영구 손상 X)
  → ECC + scrubbing
  
SEFI (Single Event Functional Interrupt):
  Logic 단계 영향
  Reset·recovery 필요
  
SEL (Single Event Latch-up):
  CMOS 회로 latch-up → 영구 손상
  → 즉시 power cycle
  → SEL-immune CMOS
  
TID (Total Ionizing Dose):
  Cumulative dose → 성능 저하
  단위 — krad(Si)
  LEO 위성 → 10~50 krad over 10년
  Deep space → 100s krad
  
DD (Displacement Damage):
  Atom dislocation
  Long-term degradation
```

방사선 = *deep space + 위성*. LV (수십 분) → 영향 적음.

## Rad-hard vs Rad-tolerant

```text
Rad-hard (Radiation-Hardened):
  설계·공정 자체로 SEU·SEL·TID 내성
  Si-on-Insulator (SOI), redundant cell
  Performance·비용 trade-off
  
  예 — BAE RAD750, BAE RAD5500
  
Rad-tolerant:
  Commercial part 기반 + 일부 보강
  ECC·TMR for SEU mitigation
  TID 제한적
  
  예 — Cobham GR716·GR740 (LEON SPARC)
  Microchip ATmega rad-tol
  
COTS (Commercial Off-The-Shelf):
  표준 commercial part
  Mitigation은 *system 차원* (TMR·ECC·watchdog)
  
  예 — Raspberry Pi (early CubeSat)
  Nvidia Jetson (Mars Ingenuity)
```

각 trade-off — *mission profile에 따라*.

## BAE RAD750 — 우주 표준

```text
BAE Systems RAD750:
  PowerPC 750 기반 (Apple G3)
  
Specs:
  Process — 250 nm or 150 nm CMOS SOI
  Clock — 110~200 MHz
  Performance — 240 MIPS
  Memory — onboard cache + external SDRAM
  Rad-hard:
    SEU LET threshold > 75 MeV-cm²/mg
    TID > 1 Mrad(Si)
    SEL — immune
  Power — 5 W
  
Cost:
  ~$200K per chip
  
사용처:
  Mars Curiosity (2012)
  Mars Perseverance (2020)
  Mars Reconnaissance Orbiter
  James Webb Space Telescope (JWST)
  Juno (Jupiter)
  Orion (NASA crew vehicle)
  
한계:
  - 매우 비싸다
  - 성능 1990년대 수준
```

NASA·ESA deep-space의 *de facto*.

## BAE RAD5500 — 차세대

```text
BAE Systems RAD5500:
  PowerPC e5500 기반
  
Specs:
  Quad-core 64-bit
  Clock — 466 MHz
  Performance — 5500 DMIPS
  4 GB DDR2/3 ECC
  Rad-hard
  Power — 25 W
  
사용처:
  Future Mars missions
  Lunar Gateway
```

RAD750 → RAD5500 — *10x 성능*. 여전히 commercial 대비 뒤짐.

## Cobham GR716 — LEON SPARC

```text
Cobham Gaisler GR716·GR740·GR716B:
  LEON SPARC V8 architecture
  ESA 후원 — 유럽 우주 표준
  
GR716 (single-core, 150 MHz):
  Rad-tolerant
  LEON3 SPARC
  
GR740 (quad-core, 250 MHz):
  Rad-hard
  Performance — 1700 DMIPS
  ECC, lockstep, watchdog
  AMBA AHB bus
  
사용처:
  ESA missions
  Galileo
  Lisa Pathfinder
  ExoMars
  
KARI 사용 검토:
  KSLV·KOMPSAT 자체 alternatively
```

ESA — LEON SPARC *공식 architecture*. Commercial한 RAD-hard.

## ARM Cortex-R52 — Safety

```text
ARM Cortex-R52:
  Safety-critical real-time CPU
  Lockstep variant
  
Specs:
  ARMv8-R (32-bit)
  Lockstep dual-core (DCLS)
  Cache·TCM
  MPU (no MMU)
  ASIL-D / DAL-A certifiable
  
사용처:
  Aerospace (Airbus 일부)
  Automotive ECU (자동차 ECU)
  Industrial safety
  Avionics actuator·sensor controller
  
Vendor:
  STMicro STM32MP
  TI Hercules safety MCU
  NXP S32R safety SoC
```

Cortex-R52 = *safety-critical actuator·sensor*. Avionics 보조 컴퓨터.

## Xilinx·AMD Zynq — Hybrid SoC

```text
Xilinx Zynq UltraScale+ MPSoC:
  ARM Cortex-A53 (4 cores) + FPGA fabric
  + ARM Cortex-R5 (lockstep)
  + GPU·DSP
  
Aerospace variants:
  KU025 / KU040 / KU060 Space Grade
  Rad-tolerant (5~10 krad)
  Lockstep R5 for safety-critical
  
사용처:
  - Software-defined radio (SDR)
  - Sensor processing
  - Communication
  - Image processing (camera·SAR)
  - DSP heavy (FFT·MIMO·beamforming)
  
LV usage:
  KSLV-II — telemetry encoder
  Falcon 9 — partial
  
인증:
  DO-254 (HW) + DO-178C (SW)
  FPGA design — DO-254 인증 요구
```

Zynq — *SDR·DSP·FPGA 통합*. Avionics에 modern 도입.

## Cortex-M·R 일반 사용

```text
Cortex-M (microcontroller):
  M4·M7·M33·M55 — actuator·sensor controller
  ASIL-B·D capable (R5 lockstep)
  
ST·NXP·Microchip 등 공급

사용:
  - Servo controller
  - Engine monitor
  - I/O controller
  - Power management
  - 작은 LRU controller

Avionics-friendly variants:
  ST STM32H7 — 480 MHz, lockstep
  Microchip ATSAMV71 — automotive·aerospace
  
LV·위성 — Cortex-M0/M3 (low power, simple task)
```

대량 사용 — *actuator·sensor*. Main FCC는 더 강력 chip.

## Multi-core 인증 도전

```text
Multi-core 위험:
  Cache contention
  Memory bus arbitration
  Interrupt routing
  Cross-core noise
  
WCET 분석 어려움:
  Single-core — 비교적 predictable
  Multi-core — *worst-case가 매우 큼*
  
인증 가이드:
  CAST-32A (FAA)
  AMC 20-193 (EASA·FAA, 2021)
  
Mitigation:
  - Single-active core (cert simplification)
  - Lockstep (DCLS·TCLS)
  - Static partitioning
  - Cache locking
  - Memory bandwidth allocation
  - Interrupt routing isolation
  
실제 추세:
  F-35 — multi-core 도입
  B787 — single → multi-core upgrade 검토
  민간 LV — multi-core 자유
```

Multi-core IMA — *적극 인증 활동* 영역.

## Lockstep — Hardware Redundancy

```text
DCLS (Dual-Core Lock-Step):
  Same instruction → 2 core simultaneously
  Output compare → mismatch detect
  Fault → halt 또는 recover
  
Cortex-R5 / R52 / R82 — DCLS 내장
TI Hercules — TCLS (Triple)
Infineon AURIX — TCLS·DMR

장점:
  Random fault detect (SEU·logic upset)
  Hardware-level safety
  
단점:
  Performance 2x cost (2 core)
  Power 2x

LV 사용:
  비교적 적음 (mission time 짧음)
  자동차 ASIL-D 더 많음
  
항공·우주 사용:
  Cortex-R52 — actuator·sensor controller
  RAD750 lockstep variant
```

Lockstep — 자동차·산업 *주력*. Avionics actuator 진입.

## TMR — Triple Modular Redundancy

```text
TMR (Triple Modular Redundancy):
  3 identical processor
  Vote majority (2-of-3)
  Mismatch → faulty processor isolate
  
구성:
  ┌──────┐   ┌──────┐   ┌──────┐
  │ CPU1 │   │ CPU2 │   │ CPU3 │
  └───┬──┘   └───┬──┘   └───┬──┘
      ↓          ↓          ↓
   ┌──────────────────────────┐
   │       Voter (HW·SW)       │
   └──────────────────────────┘
              ↓
          Output

사용처:
  Space Shuttle — 4 main + 1 backup
  Boeing 777·787 — triple redundant flight control
  Ariane 5·6 — triple flight computer
  KSLV-II — dual (cost trade-off)
  
구현:
  Hardware voter (FPGA·ASIC)
  Software voter (consensus)
  Hybrid
```

TMR — *고가 fault tolerance*. Critical mission.

## FCC Architecture 사례

```text
Boeing 787 PFC (Primary Flight Computer):
  Triple architecture (3 lanes)
  Each lane:
    - General-purpose computer (PowerPC)
    - Independent vendor
    - Different language (Ada·C·...)
  Diverse design — common-mode fault 회피
  AFDX network
  
F-35 ICP:
  Multi-core (modern PowerPC)
  Single-failure-tolerant
  Backup architecture
  
KSLV-II FCC:
  Dual-redundant ARM Cortex
  자체 + 일부 commercial parts
  Cross-comparison
  
SpaceX Falcon 9:
  Dual flight computer (x86 LEM)
  Linux + custom RTOS
  Software-level redundancy
```

각 사례 — *redundancy + diversity*.

## FPGA·DSP in Avionics

```text
FPGA roles:
  - Sensor data acquisition (high-speed)
  - DSP (FFT·filter·correlation)
  - Bus interface (1553·SpaceWire·AFDX)
  - Control loops (low-latency)
  - Image processing
  - Crypto·security
  - Camera·radar processing
  
Aerospace FPGA:
  Xilinx — UltraScale+ KU025/KU060 Space Grade
  Microchip (Microsemi) — RTAX·RTG4·PolarFire SoC
  
인증:
  DO-254 (HW airworthiness)
  Complex hardware design assurance
  
DSP:
  TI C6000·C7000 series
  ADI Sharc·TigerSHARC
  FPGA-embedded DSP
  
LV usage:
  KSLV-II — DSP for IMU·GPS fusion
  Falcon 9 — Zynq for SDR·telemetry
  Mars Ingenuity — Snapdragon (commercial Linux)
```

FPGA·DSP — *avionics 진화*. 학습 가치 큼.

## Memory Architecture

```text
Memory hierarchy (typical avionics):

L1 cache (CPU built-in)
  - SEU mitigation: ECC parity
  
L2 cache (CPU built-in)
  - ECC
  
SDRAM (external):
  - ECC SODIMM (Single error correct, Double detect)
  - Scrubbing (background read·rewrite)
  - DDR ECC standard
  
Flash (boot·data):
  - SEU rare but matters
  - Watchdog·CRC
  
NVRAM·MRAM·FRAM:
  - Non-volatile, rad-tolerant
  - Critical state

Memory protection:
  - MMU (with OS support)
  - MPU (no OS or hard real-time)
  - ARINC-653 partition memory
```

Memory — *ECC + scrubbing* 표준. SEU mitigation.

## 한국 Aerospace Processor

```text
KARI KSLV-II Flight Computer:
  ARM Cortex-based (자세한 spec 비공개)
  자체 BSP + RTOS
  단일 또는 dual redundant
  
KAI KF-21:
  Mission computer — multi-core
  국산 + 일부 commercial
  
한화 미사일·LV:
  Cortex-R·M
  Commercial parts (Microchip·ST)
  자체 board·firmware
  
KARI KOMPSAT·KPLO:
  ESA·NASA 협력 — LEON SPARC 일부
  자체 + commercial parts (rad-tol)

국산 rad-hard 개발:
  ETRI·KAIST 연구
  ASIC·FPGA 개발 추진
```

한국 — *국산 + commercial 혼합*. Rad-hard 개발 진행.

## Processor Selection Criteria

```text
선택 기준:

Performance:
  MIPS·MFLOPS
  Memory bandwidth
  I/O throughput

Reliability:
  MTBF
  Failure mode
  Fault tolerance (lockstep·TMR)

Radiation:
  Mission orbit·duration
  TID·SEU tolerance

Power:
  Operating power·peak·idle
  Thermal envelope

Certification:
  DO-178C / DO-254 evidence
  Vendor support (manual·errata)

Supply:
  Long-term availability (20+ years)
  Obsolescence plan

Cost:
  Per unit
  Total program (qual·integration)

Toolchain:
  Compiler·debugger·tool qualification
  RTOS support
```

각 mission — *적합 processor 선택*.

## 자주 하는 실수

> ⚠️ Commercial part 직접 사용

```text
LEO 위성에 commercial ARM
→ SEU 누적
→ Mission 단축
```

→ Rad-tol 또는 rad-hard.

> ⚠️ Multi-core 성능만 보고 도입

```text
"Quad-core → 4x 성능"
→ WCET 폭증
→ 인증 어려움
```

→ CAST-32A·AMC 20-193 분석.

> ⚠️ Lockstep 잘못 사용

```text
"Lockstep CPU → 자동 안전"
→ Voter·comparator도 fail 가능
→ Power·clock 공통 fault
```

→ Full redundancy + diversity.

> ⚠️ 20년 supply 무시

```text
"이번 program만 위한 chip"
→ 5년 뒤 EOL
→ Migration 비용 폭발
```

→ Long-term supply guarantee.

## 정리

- Avionics processor = *신뢰성 + 방사선 + 인증*.
- **BAE RAD750/5500** — deep space *de facto*.
- **Cobham LEON SPARC** — ESA 표준.
- **ARM Cortex-R52** — safety-critical lockstep.
- **Xilinx Zynq** — SoC + FPGA, modern avionics.
- Multi-core — *CAST-32A·AMC 20-193* 인증.
- Lockstep·TMR — fault tolerance.
- 한국 — *commercial + 국산 + rad-hard 개발 추진*.

다음 편은 **Avionics Buses (1553·ARINC-429·AFDX)**.

## 관련 항목

- [Ch 3: ARINC-653](/blog/embedded/avionics/digital-avionics-handbook/chapter03-arinc-653)
- [Ch 5: Buses](/blog/embedded/avionics/digital-avionics-handbook/chapter05-buses)
- [Ch 9: Fault Tolerance](/blog/embedded/avionics/digital-avionics-handbook/chapter09-fault-tolerance)
- [Practical RTOS Internals — Part 5 Implementations](/blog/embedded/rtos/practical-internals/part5-01-freertos-source)
