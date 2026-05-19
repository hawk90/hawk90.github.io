---
title: "Ch 2: LV 비행 컴퓨터 아키텍처 — ARM·DSP·FPGA Heterogeneous"
date: 2026-05-27T02:00:00
description: "발사체 FCC 보드 구성. ARM Cortex-A·R + DSP + FPGA. CompactPCI·VPX backplane. 사례."
series: "Launch Vehicle Flight Software"
seriesOrder: 2
tags: [avionics, fcc, arm, dsp, fpga, heterogeneous]
draft: true
---

## 한 줄 요약

> **"LV FCC = ARM + DSP + FPGA + radhard"** — 각 코어 *역할 분담*.

## FCC 일반 구성

```text
FCC (Flight Control Computer):
  Main CPU       — ARM Cortex-A·R 또는 RAD750 (PowerPC)
  DSP            — Sensor filtering·FFT·convolution
  FPGA           — Timing-critical I/O·CRC·DMA
  Memory         — Rad-hard SRAM/MRAM
  Storage        — Flash·MRAM
  Backplane      — CompactPCI·VPX·SpaceWire
  Power          — ±5V·±15V regulators
  Interfaces     — MIL-STD-1553, CAN, ARINC-429, Ethernet
```

각 component — *최적 작업*에 분담.

## ARM Cortex 적용

```text
Cortex-A53:
  Mission management
  Telemetry encoding
  Network·protocol
  ~수십 MHz~수 GHz

Cortex-R52 (lock-step):
  Safety-critical control
  Hard real-time loop
  DCLS (Dual-Core Lock Step)
  자동차 ASIL-D 표준
  
Cortex-M7:
  Sensor I/O
  Mid-level real-time
  Low-power option
```

LV — *R52 또는 M7* 가장 흔함. *A53*은 mission computer.

## DSP 적용

```text
TI C6000·C2000:
  Sensor processing
  Digital filter (FIR·IIR)
  FFT (vibration analysis)
  Sensor fusion (Kalman)
  
ADI SHARC:
  Audio·high-precision math
  Low-latency control
  
Custom DSP IP (FPGA 내장):
  Vendor-specific
```

ARM NEON으로도 가능 — DSP는 *전용 power efficient*.

## FPGA 적용

```text
Xilinx Zynq Ultrascale+·Versal:
  Cortex-A + Cortex-R + FPGA fabric
  Single-chip heterogeneous
  
Microchip PolarFire:
  Flash-based FPGA (radiation tolerant)
  RISC-V + FPGA
  
Lattice·Achronix·Intel FPGA:
  
FPGA roles:
  Timing-critical I/O (TVC actuator)
  CRC·encoding (Reed-Solomon)
  Sensor capture (DMA descriptor)
  Custom protocols
  PWM·encoder feedback
```

µs 단위 timing은 *FPGA*. CPU latency 너무 크면 FPGA로 offload.

## Backplane — CompactPCI / VPX

```text
CompactPCI / PXI:
  3U·6U Eurocard
  PCI bus
  Legacy avionics
  
VPX (VITA 46):
  Modern military·space
  Gigabit transceivers
  OpenVPX standard
  Multi-payload backplane
  
SpaceWire:
  ESA standard (ECSS-E-ST-50-12C)
  200 Mbit/s
  RMAP protocol
  
SpaceFibre (차세대):
  6.25 Gbit/s
  QoS·packet routing
```

VPX·SpaceWire — *space avionics 표준*.

## Memory — Rad-Hard

```text
Rad-hard SRAM:
  - SEU (Single Event Upset) immune
  - SEL (Single Event Latch-up) immune
  - 일반 SRAM 10x 비쌈, 5x 느림
  
MRAM (Magnetoresistive RAM):
  - Non-volatile
  - High radiation tolerance
  - Read·write 빠름

Flash:
  - 일반 NAND/NOR
  - ECC + scrubbing 필수
  - LV mission 시간 짧음 — 일반 grade 사용 가능
```

LV는 *수십 분 mission* — *상용 chip + EDAC*도 OK인 경우 많음.

## Radiation Effect

```text
SEU (Single Event Upset):
  bit flip — recoverable
  → ECC, TMR voting으로 복구
  
SEL (Single Event Latch-up):
  CMOS short → reset 필요
  → Latch-up immune chip 사용
  
SEFI (Functional Interrupt):
  chip 자체 stuck
  → Watchdog reset
  
TID (Total Ionizing Dose):
  Long-term degradation
  → LV mission 짧아 무관, 위성은 critical
```

LV — *SEU·SEFI* 주로. *TID 무관*.

## TMR — Triple Modular Redundancy

```text
TMR architecture:
  3 identical compute → voter → output
  
Failure modes:
  1-fail: voter picks 2 majority → continue
  2-fail: undefined or fail-safe
  
Voter:
  Hardware (FPGA) — preferred
  Software — also possible
  
Latency: voter overhead ~ µs
```

Saturn V LVDC·Space Shuttle GPC·우주 표준. ASIL-D·DO-178C Level A.

## DCLS — Dual-Core Lock-Step

```text
Cortex-R52 DCLS:
  2 cores running *same instruction*
  Hardware compares results each cycle
  Diff → fault, reset 또는 safe state
  
TMR보다 가벼움 (2x vs 3x cost)
Modern automotive·일부 LV
```

자동차 brake·airbag ECU 표준. LV에서도 채택 증가.

## 사례 — Saturn V LVDC

```text
Launch Vehicle Digital Computer (1960s):
  IBM-build
  TMR architecture
  Magnetic core memory
  ~30K instructions/sec (slow!)
  3-stage Saturn V navigation
  Apollo 11-17 사용
  
Architecture:
  3 CPU 동시 실행
  Bitwise voter
  Fail-operational
```

50년 전 *TMR voter* 표준 — 지금도 동일 원리.

## 사례 — Space Shuttle GPC

```text
Shuttle GPC (1980s):
  5 IBM AP-101S
  TMR + sync
  HAL/S language
  4 primary + 1 backup (PASS·BFS)
  
Famous incident:
  STS-1 (1981): 4 PASS sync 실패
  → mission delay
```

5중 redundancy — *극도 안전*.

## 사례 — Falcon 9 / Dragon

```text
Falcon 9·Dragon FCC (공개 한정):
  Triple-redundant flight computers
  3 dual-core x86 (commercial)
  Linux + custom RTOS
  ARM Cortex 일부 (Dragon)
  
Commercial chips:
  공식 commercial-grade
  EDAC·TMR로 radiation 처리
  지구 LEO mission만 (TID 짧음)
  
SpaceX의 혁신:
  Custom hardware·software
  Open-design boards
  Faster iteration
```

기존 mil-spec → commercial 전환의 *선구자*.

## 사례 — KSLV-II 누리 (한국)

```text
KARI 공개 자료 (AIAA·IEEE paper):
  3-stage liquid LV
  Flight Computer (FC) by KARI
  FOG·MEMS IMU
  GPS/INS fusion
  TMR architecture
  
공개 published:
  RTEMS 또는 자체 RTOS
  MIL-STD-1553 backplane
  C 언어 + Ada 일부
  DO-178C 기반 process (한국 적응)
```

한국형 — *KARI·한화에어로스페이스* 협업.

## 일반 보드 사례 — Zynq Ultrascale+

```text
Xilinx Zynq Ultrascale+:
  4× Cortex-A53 — Linux·mission
  2× Cortex-R5 (DCLS) — RTOS·control
  Mali GPU — graphics (display)
  PL (FPGA) — custom I/O
  PMU MicroBlaze — power mgmt
  
사용:
  Lockheed·NASA payload
  자율주행 자동차
  Industrial automation
```

*Heterogeneous SoC*의 표본. 새로운 LV 보드의 base.

## 일반 보드 사례 — NXP Layerscape

```text
NXP LS1043 / LS1046:
  4× Cortex-A53/A72
  Network accelerator
  Crypto engine
  DPAA
  
사용:
  Industrial gateway
  자동차 ECU
  일부 commercial space
```

## 일반 보드 사례 — RAD750 / RAD5500

```text
BAE RAD750:
  Rad-hard PowerPC 750
  133-200 MHz
  $200,000+ per chip
  Mars Rover·Hubble 사용
  
RAD5500 (modern):
  Rad-hard PowerPC e5500
  더 빠름
  최근 NASA mission
```

전통 rad-hard — *commercial 1000x 비쌈, 10x 느림*. SpaceX 등 *commercial 전환 추세*.

## I/O 인터페이스

```text
MIL-STD-1553:
  1 Mbps redundant bus
  Military·avionics 표준
  Decades-old, robust
  
ARINC-429:
  Civil avionics
  1단 transmitter·multi receiver
  
CAN bus:
  Sensor·actuator
  자동차 friendly chips
  
SpaceWire:
  Space avionics
  200 Mbps
  
Ethernet (AFDX):
  Civil aircraft (A380·B787)
  일부 LV
```

LV — *1553·CAN·SpaceWire* 흔함.

## 자주 하는 실수

> ⚠️ Commercial chip 막연히 사용

```text
"commercial Cortex-A53 — 비행에 OK"
→ SEU·SEL test 안 함
→ flight fail 사례
```

→ radiation test·EDAC 필수.

> ⚠️ FPGA underestimate

```text
"FPGA = optional, CPU로 가능"
→ 마이크로초 latency 요구 시 — CPU IRQ 너무 느림
```

→ timing critical은 FPGA.

> ⚠️ Backplane 호환성

```text
CompactPCI 모듈 + VPX backplane → 안 됨
```

→ 표준 명시.

> ⚠️ TMR voter 자체 redundancy 없음

```text
Voter 하나가 single point of failure
```

→ voter도 redundant (또는 simple discrete logic).

## 정리

- LV FCC = **ARM/PowerPC + DSP + FPGA + rad-hard memory**.
- Cortex-A53·R52·M7 — heterogeneous workload.
- DSP — sensor processing·filter·FFT.
- FPGA — *µs timing·CRC·custom I/O*.
- TMR (Saturn V·Shuttle), DCLS (modern).
- Commercial → rad-hard 변환 — SpaceX 등 추세.
- 한국 — KSLV-II 누리는 *KARI 자체 개발*.

다음 편은 **Multi-Processor SW**.

## 관련 항목

- [Ch 1: LV vs Aircraft](/blog/embedded/avionics/launch-vehicle-flight-sw/chapter01-lv-vs-aircraft)
- [Ch 3: Multiprocessor](/blog/embedded/avionics/launch-vehicle-flight-sw/chapter03-multiprocessor)
