---
title: "Ch 1: ARMv8-A Overview·Variants·History"
date: 2026-05-17T01:00:00
description: "ARMv8-A 아키텍처 소개·variants·8.1-8.9 확장 history."
series: "ARMv8-A Architecture Reference Manual"
seriesOrder: 1
tags: [armv8-a, arm-arm, overview]
draft: true
---

## 한 줄 요약

> **"ARMv8-A = 64-bit ARM Application profile"** — AArch64 + AArch32 dual state.

## ARMv8-A 위치

```text
ARM Architecture profiles:
  A (Application) — application processor
    Cortex-A series, Neoverse
    Smartphone·server·tablet·embedded
    
  R (Real-time) — real-time processor
    Cortex-R series
    Automotive·industrial·safety
    
  M (Microcontroller) — microcontroller
    Cortex-M series
    MCU·embedded
  
ARMv8 — 2011 announced
  64-bit 첫 ARM
  Apple A7 (iPhone 5s) — 첫 production (2013)
  
주요 reference:
  Arm Architecture Reference Manual for A-profile
  ARM DDI 0487 (현재 K.a 또는 후속)
  10000+ pages
```

ARMv8-A — *현대 ARM의 기반*. 모바일·서버 표준.

## AArch64 vs AArch32

```text
Dual execution state:

AArch64:
  64-bit
  31 general-purpose registers (X0-X30)
  A64 instruction set (32-bit fixed)
  SP·PC 64-bit
  
AArch32:
  32-bit (ARMv7-A 호환)
  16 general-purpose registers (R0-R15)
  A32 (ARM) + T32 (Thumb-2) instruction set
  Legacy 호환성
  
Exception level (EL)별 state:
  EL3 — Secure monitor
  EL2 — Hypervisor
  EL1 — OS kernel
  EL0 — Application
  
각 EL — AArch64 또는 AArch32 선택 가능
EL transition 시 state 변경 가능
```

ARMv8.x — *AArch32 점진 deprecate*. ARMv9.0+ — AArch64 only 옵션.

## ARMv8 Variants (8.0 → 8.9)

```text
ARMv8.0 (2011):
  Base — AArch64 도입
  
ARMv8.1 (2014):
  Atomics (LSE — Large System Extensions)
  PAN (Privileged Access Never)
  CRC
  Virtualization host extensions (VHE)
  Limited Ordering Regions (LOR)
  
ARMv8.2 (2016):
  Half-precision FP (FP16)
  RAS extensions
  Persistent memory
  Statistical Profiling Extension (SPE)
  
ARMv8.3 (2017):
  Pointer Authentication (PAC)
  Nested virtualization
  Complex number instructions
  
ARMv8.4 (2018):
  Memory partitioning (MPAM)
  Secure EL2
  Enhanced nested virtualization
  
ARMv8.5 (2018):
  Memory Tagging Extension (MTE)
  Branch Target Identification (BTI)
  RNG
  
ARMv8.6 (2019):
  General Matrix Multiply (GEMM)
  BFloat16
  
ARMv8.7 (2020):
  CMO (Cache Maintenance Operations)
  WFET·WFIT
  
ARMv8.8 (2021):
  Hinted conditional branch
  
ARMv8.9 (2022):
  Performance Monitor extension
  Memory Encryption Contexts
```

각 minor version — *backward compatible*. New features optional.

## Implementation 예 — Cortex-A

```text
Cortex-A series (Application):

Little cores (efficiency):
  Cortex-A53 (ARMv8.0) — 2013, smartphone budget
  Cortex-A55 (ARMv8.2) — 2017
  Cortex-A510 (ARMv9.0) — 2021
  Cortex-A520 (ARMv9.2) — 2023

Mid cores:
  Cortex-A72 (ARMv8.0)
  Cortex-A75 (ARMv8.2)
  Cortex-A76 (ARMv8.2)
  Cortex-A77 (ARMv8.2)
  Cortex-A78 (ARMv8.2)
  Cortex-A715 (ARMv9.0)
  Cortex-A725 (ARMv9.2)

Big·Premium cores:
  Cortex-X1 (ARMv8.2) — 2020
  Cortex-X2 (ARMv9.0)
  Cortex-X3 (ARMv9.0)
  Cortex-X4 (ARMv9.2)

DynamIQ (big.LITTLE 후속):
  Heterogeneous cluster
  e.g. X4 + A720 + A520
```

각 Cortex — *target market + 성능·전력 trade-off*.

## Neoverse — 서버

```text
Neoverse series (Infrastructure):

N1·N2·N3 — Neoverse Performance
  Cloud·hyperscale
  AWS Graviton 2·3·4 (N1·V1·V2)
  
V1·V2 — Neoverse Versatile
  HPC·AI
  Fujitsu A64FX (V1 기반 derivative)
  
E1·E2 — Neoverse Edge
  5G·edge computing
  
사용:
  AWS Graviton — Amazon 서버
  Ampere Altra — Cloud
  HPE·Microsoft Azure 일부
  Fugaku supercomputer (A64FX)
```

Neoverse — *서버·HPC의 ARM 도약*. 데이터센터 점유율 ↑.

## Vendor 구현

```text
Apple:
  Custom microarchitecture
  Apple A7~A18 (ARMv8.0 ~ ARMv8.6+)
  M1·M2·M3·M4 (ARMv8.5+)

Qualcomm:
  Snapdragon Kryo (Cortex 기반 또는 custom)
  Oryon (Apple-style custom, 2023+)

Samsung:
  Exynos (Cortex + custom Mongoose, 종료)
  현재 — Cortex 사용
  
HiSilicon (Huawei):
  Kirin (Cortex 기반)
  미국 제재 영향
  
MediaTek:
  Dimensity (Cortex 기반)
  
Marvell·Cavium:
  ThunderX (server, ARMv8.0·8.1·8.2)
```

각 vendor — *ARM 라이선스 + custom design*.

## Profile (A vs R vs M)

```text
A (Application):
  MMU (full virtual memory)
  Multi-OS · multi-process
  Power efficiency, performance
  AArch64 + AArch32 (legacy)
  
R (Real-time):
  MPU (no MMU)
  Deterministic timing
  Cortex-R5, R52, R82
  Safety critical (DCLS lockstep)
  AArch32 only 또는 AArch64 (R82)
  
M (Microcontroller):
  Cortex-M0/1/3/4/7/23/33/55/85
  ARMv6-M, ARMv7-M, ARMv8-M
  Bare-metal·RTOS
  ARMv8.1-M — Helium (MVE)
  AArch32 only (ARMv8-M)
```

이 시리즈 — *ARMv8-A profile* 집중.

## A-profile 적용 분야

```text
Mobile (smartphone):
  Apple iPhone·iPad
  Samsung Galaxy
  Pixel·OnePlus·Xiaomi
  → SoC vendors: Apple·Qualcomm·MediaTek·Exynos

Tablet·laptop:
  iPad
  Surface Pro X·Surface Pro 9 5G
  ARM Linux laptop

Server:
  AWS Graviton
  Ampere Altra
  Fujitsu A64FX
  
Automotive:
  NVIDIA Drive (Tegra)
  Qualcomm Snapdragon Ride
  Renesas R-Car
  
Embedded:
  Raspberry Pi 4·5
  NVIDIA Jetson
  Qualcomm IoT
  
HPC·AI:
  Fugaku
  NVIDIA Grace
```

A-profile — *consumer + cloud + automotive*.

## Document Structure — ARM ARM

```text
ARM Architecture Reference Manual (DDI 0487):
  
Part A: Application Level Architecture
  Programmer's model
  Application instructions
  
Part B: AArch64 System Level
  Exception levels
  System registers
  Virtual memory
  Memory model
  Exception handling
  
Part C: AArch64 Instruction Set
  Encoding
  Each instruction spec
  
Part D: AArch32 Instruction Set
  Legacy
  
Part E: System Level Memory Model
  Detailed memory ordering
  
Part F: Architecture Extensions
  Each extension spec
  
+ Appendices, change logs

이 시리즈 — *Part A·B의 핵심* 위주.
```

ARM ARM — *10000+ pages*. 본 시리즈는 *avionics·embedded SW 직결* 항목 선별.

## ARMv8-A in Avionics·Aerospace

```text
ARMv8-A 도입:
  KAI KF-21 — Cortex-A 일부 (mission system)
  KARI KSLV-II — Cortex-A 기반 FCC (likely)
  자동차 ADAS — Cortex-A
  Defense radar·EW — Cortex-A
  
이유:
  - 풍부한 ecosystem
  - Linux 호환
  - AI·DSP capability
  - Long-term supply
  
제약:
  - Cert evidence — 자체 또는 vendor 협력
  - Multi-core 인증 (CAST-32A·AMC 20-193)
  - Cortex-R52 — safety MCU complement
```

ARMv8-A — *avionics에 점진 도입*. Cortex-A.

## 이 시리즈의 범위

```text
ARMv8-A Architecture Reference Manual — 본 시리즈:

Ch 1: Overview·variants·history (이 글)
Ch 2: AArch64 Application-level model
Ch 3: AArch64 Exception levels·system registers
Ch 4: Memory model·ordering
Ch 5: Virtual memory·MMU
Ch 6: Exceptions·interrupts
Ch 7: SIMD·NEON·SVE·SVE2
Ch 8: Atomic·LSE·exclusive monitor
Ch 9: Performance Monitor (PMU)
Ch 10: Security (PAC·BTI·MTE)
Ch 11: Virtualization (EL2·VHE)
Ch 12: Cache·coherence
Ch 13: Debug·trace
Ch 14: System programming 사례 (boot·context switch)
+ extras

→ avionics·embedded SW 직결 항목 위주.
```

## 정리

- ARMv8-A = *64-bit ARM Application profile*.
- AArch64 + AArch32 — dual execution state.
- ARMv8.0~8.9 — 점진 enhancement (PAC·MTE·BTI 등).
- Cortex-A·Neoverse — implementation.
- Apple·Qualcomm·Samsung — major vendors.
- Mobile·server·automotive·embedded·HPC.
- Document — ARM ARM DDI 0487, 10000+ pages.
- 본 시리즈 — *avionics·embedded SW 직결* 항목.

다음 편은 **AArch64 Application-level Model**.

## 관련 항목

- [Ch 2: AArch64 Application Model](/blog/systems/arm/armv8-a-spec/chapter02-aarch64-app-model)
- [Digital Avionics Handbook Ch 4: Computer Architecture](/blog/embedded/avionics/digital-avionics-handbook/chapter04-computer-architecture)
- [원문 — ARM Architecture Reference Manual](https://developer.arm.com/documentation/ddi0487/latest)
