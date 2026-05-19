---
title: "Ch 11: Avionics Software — RTOS 선택과 통합"
date: 2026-05-18T11:00:00
description: "VxWorks·RTEMS·INTEGRITY — avionics용 RTOS 비교와 통합 고려사항."
series: "Digital Avionics Handbook"
seriesOrder: 11
tags: [avionics, rtos, vxworks, rtems, integrity]
draft: true
---

## 한 줄 요약

> **"Avionics RTOS = 인증 + partitioning + 결정성"** — vendor·license·platform 선택.

## Avionics RTOS 요구

**일반 (FreeRTOS·Zephyr·ThreadX):**
- Lightweight
- 무료 or 저렴
- Real-time scheduling
- 인증 evidence 부재
- Partitioning 약함
- Vendor support 제한

**Avionics:**
- DO-178C Level A 인증 evidence
- ARINC-653 partitioning
- 결정성 (WCET·timing 보장)
- Long-term support (~30년)
- Multi-core safe (CAST-32A)
- Tool qualification
- 비싸 (수십만 달러+)
- Vendor 제한 (Wind River·Green Hills·Lynx·SYSGO)

Avionics RTOS — *인증 + safety + vendor support*.

## 주요 Avionics RTOS

**Wind River VxWorks 653:**
- ARINC-653 Part 1
- Multi-core (3.0+)
- 사용 — B787·A380·A350 (일부)·F-22 일부
- License — 수십만 달러+

**Green Hills INTEGRITY-178 tuMP:**
- MILS (Multiple Independent Levels of Security)
- Multi-core
- 사용 — F-22·F-35·B777X·Eurocopter
- Highest certification (Level A + EAL 6+)

**Lynx LynxOS-178:**
- Linux 호환 (POSIX subset)
- 사용 — F-22·B787 일부

**SYSGO PikeOS:**
- Hypervisor 기반
- Multi-arch (PowerPC·ARM·x86)
- 사용 — A350·Eurofighter·KAI 일부

**DDC-I Deos:**
- Stack analyzer integration
- Smaller market

**WITTENSTEIN SafeRTOS:**
- FreeRTOS 인증 fork
- DO-178C Level B·A subset
- IEC 61508·26262
- 자동차·항공·의료

**RTEMS (open source):**
- NASA·ESA 광범위 사용
- Apache 2.0 license
- 자체 인증 또는 ESA support

각 RTOS — *target·license·인증 패키지 비교*.

## VxWorks 653 — Wind River

**VxWorks 653:**
- Wind River (Intel subsidiary)
- Industry leader

**특징:**
- ARINC-653 P1 Supplement 4
- Multi-core (3.0+)
- PowerPC·ARM·x86·SPARC
- Workbench IDE
- VxSim simulator

**인증:**
- DO-178C Level A
- DO-330 tool qualification
- DO-297 IMA Platform Certification

**사용 사례:**
- Boeing 787 Common Core System
- Airbus A380·A350 (일부)
- KAI F-X·KF-X·KUH (일부)
- NASA Curiosity·Perseverance Mars rovers

**가격:**
- Development license — 수만~수십만 달러
- Production royalty — 추가
- Certification package — 별도 (수십만 달러)

VxWorks — *최대 시장 점유*. Wind River support.

## INTEGRITY-178 — Green Hills

**INTEGRITY-178 tuMP:**
- Green Hills Software
- Time-Variant Unified Multi-Processing

**특징:**
- MILS (Multiple Independent Levels of Security)
- Multi-core (deterministic)
- Memory protection (MMU + HW partition)
- ARINC-653
- C++ heavy support
- Compiler integrated

**인증:**
- DO-178C Level A
- EAL 6+ (Common Criteria — 최고 security level)
- ISO 26262 ASIL-D
- IEC 62304 (medical)

**사용 사례:**
- Lockheed F-22 Raptor
- Lockheed F-35 Lightning II
- Boeing 777X
- Eurocopter Tiger

**강점:**
- Highest security + safety
- MILS architecture
- Time partitioning multi-core

INTEGRITY — *highest cert*. Defense·high-security.

## LynxOS-178 — Lynx Software

**LynxOS-178:** Lynx Software Technologies (구 LynuxWorks).

**특징:**
- Linux 호환 (POSIX subset)
- ARINC-653
- 모든 commercial Linux app 일부 호환

**인증:** DO-178C Level A.

**사용 사례:**
- Lockheed F-22 (Mission Computer)
- Boeing 787 부분
- Lockheed F-35 일부

**강점:**
- Linux 친화 — developer onboarding 쉬움
- Open standard

LynxOS — *Linux compatibility*. Modern development friendly.

## PikeOS — SYSGO

**PikeOS:** SYSGO (Thales 자회사).

**특징:**
- Microkernel + Hypervisor
- ARINC-653 + POSIX
- Multi-arch (PowerPC·ARM·x86·SPARC)
- Multi-core deterministic

**인증:**
- DO-178C Level A
- ISO 26262
- IEC 62304
- EUROCAE ED-153

**사용 사례:**
- Airbus A350·A220
- Eurofighter Typhoon
- Brazilian Embraer KC-390
- KARI 일부 검토
- Honda Jet

**유럽 강세:** Airbus partnership.

PikeOS — *유럽 표준*. Hypervisor 가능.

## RTEMS — Open Source

```text
RTEMS:
  Real-Time Executive for Multiprocessor Systems
  
역사:
  1980s — US Army development
  Open source — Apache 2.0
  OAR Corporation 유지
  Community + ESA·NASA support
  
특징:
  - POSIX·Classic RTEMS API
  - Multi-arch (PowerPC·ARM·x86·SPARC·RISC-V)
  - 다양한 BSP
  - 무료 license
  
인증:
  - ECSS-Q-ST-80C compliant
  - 자체 또는 ESA verification
  - DO-178C — case-by-case (no out-of-box kit)
  
사용 사례:
  NASA missions (Curiosity 일부·DAWN·OSIRIS-REx)
  ESA missions (Lisa·BepiColombo)
  Mars Express
  Korean KARI 일부 (학습 단계)
  CubeSat
  
강점:
  - No license cost
  - Source available
  - Community
  
한계:
  - No commercial cert kit
  - Per-project 인증 work
```

RTEMS — *우주 분야 strong*. NASA·ESA 광범위.

## RTOS 비교 표

```text
RTOS         | Cert        | Multi-core | License    | Use
─────────────────────────────────────────────────────────────
VxWorks 653  | DO-178C A   | Yes (3.0+) | $$$$       | B787·A380
INTEGRITY    | DO-178C A   | Yes (tuMP) | $$$$       | F-22·F-35
LynxOS-178   | DO-178C A   | Limited    | $$$        | F-22·B787
PikeOS       | DO-178C A   | Yes        | $$$        | A350·EF
Deos         | DO-178C A   | Limited    | $$$        | small
SafeRTOS     | DO-178C B/A | Limited    | $$         | smaller
RTEMS        | ECSS·case   | Yes        | Free       | NASA·ESA
ThreadX (Az) | DO-178C C   | Limited    | Free·$     | low DAL
FreeRTOS     | None default| Yes        | Free       | low DAL
Zephyr       | Limited     | Yes        | Free       | research
```

각 — *target DAL + budget + ecosystem*.

## ARINC-653 Compliance

```text
ARINC-653 compliance levels:

P1 — Original
  Single-core partitioning
  
P1 Supplement 1·2·3·4·5
  점진 enhancement
  Health Monitor, file system 등
  
P2 — Extended
  File system, sampling protocol
  
P3·P4 — Conformity 
  Test suite

각 RTOS — *어느 supplement level*:
  VxWorks 653: P1S4
  INTEGRITY-178: P1 + 자체 extension
  PikeOS: P1S5
  
ARINC-653 *certificate*:
  ARINC가 별도 cert 발행 안 함
  Vendor 자체 declaration + DO-178C
  사용자 — vendor evidence 검토
```

ARINC-653 compliance — *vendor declaration*. 사용자 검증.

## BSP — Board Support Package

```text
BSP (Board Support Package):
  Hardware-specific layer
  RTOS와 HW 사이
  
포함:
  - Boot code
  - Hardware initialization
  - Drivers (1553·SpaceWire·UART·CAN·SPI·...)
  - Timer·interrupt
  - Memory map
  - Cache·MMU config
  
RTOS BSP:
  VxWorks BSP — board별 (PowerPC P2020·ARM A9 etc.)
  INTEGRITY BSP — 유사
  RTEMS BSP — community-maintained
  
인증:
  BSP 자체 — DO-178C 동일
  RTOS package + BSP = complete cert

상용 BSP:
  Vendor가 reference BSP 제공
  Custom HW — *자체 개발 + 인증*
```

BSP — *RTOS 도입 cost의 큰 부분*. Custom HW에 큰 부담.

## Driver Model

```text
Driver 분류:

Block driver:
  Storage·flash
  Volatile·non-volatile
  
Character driver:
  UART·SPI·I2C
  Single-byte interface
  
Network driver:
  Ethernet·AFDX·SpaceWire
  
Bus driver:
  1553·CAN·ARINC-429
  Avionics-specific

각 OS — *별도 driver API*:
  VxWorks — VxBus·IOCTL
  INTEGRITY — gh_driver
  LynxOS — POSIX-like
  RTEMS — RTEMS driver model
  
인증:
  Driver — RTOS와 동급 DAL
  DO-178C evidence per driver
```

Driver — RTOS-specific. Migration cost.

## Toolchain Integration

```text
Toolchain 구성:

Compiler:
  - GHS Multi (Green Hills)
  - Wind River Diab
  - GCC + ARM Toolchain
  - Clang (modern)

Linker·Loader:
  - Memory map per partition
  - Section placement (ROM·RAM·NVM)
  
Debugger:
  - JTAG · Lauterbach TRACE32
  - Green Hills Multi
  - Wind River Workbench
  - GDB + OpenOCD
  
Tool qualification:
  - GHS Multi — DO-178C kit (TQL-1)
  - Diab — DO-178C kit
  - GCC — 자체 verification or qualified fork
  
RTOS-integrated:
  - VxWorks Workbench
  - INTEGRITY Multi
  - LynxOS Eclipse
  - RTEMS — manual integration
```

Toolchain — *RTOS 일체*. Vendor lock-in 요소.

## Memory Management

```text
ARINC-653 partition memory:
  Each partition — separate physical region
  MMU enforced
  Cache aware (locking·partitioning)
  
RTOS-internal:
  Kernel — separate region
  Driver — kernel-mode
  
Dynamic allocation:
  Partition-specific pool
  No system-wide heap (보통)
  Init-time allocation 우선
  
TLSF·buddy·pool allocator:
  Predictable timing
  Fragmentation control
  
DO-178C:
  Dynamic memory 회피
  Init-only allocation
  Static analysis (stack·heap)
```

Memory — *partition isolation + static lifetime*.

## Scheduling

```text
Scheduling levels:

1. Inter-partition (ARINC-653):
   Time-driven (major frame)
   Static schedule
   No preemption between partitions
   
2. Intra-partition:
   Priority-based preemptive
   POSIX-like or Classic RTEMS
   
3. Multi-core:
   Affinity (partition to core)
   Lock-step (DCLS)
   Migration policy

Scheduling parameters:
  Period, deadline, capacity
  Priority
  
Analysis:
  WCET (Worst-Case Execution Time)
  Schedulability (RM·EDF·DM)
  Cache·memory effect
```

Multi-core scheduling — *CAST-32A 영역*. Active 인증.

## RTOS Selection Workflow

```text
Selection criteria:

1. Required DAL:
   Level A → fully certified RTOS
   Level B·C → less options
   Level D·E → general RTOS
   
2. Architecture:
   ARM·PowerPC·SPARC·x86
   Multi-core requirement
   
3. ARINC-653:
   Mandatory (IMA) — VxWorks·INTEGRITY·PikeOS
   Not needed — RTEMS·FreeRTOS·ThreadX
   
4. Budget:
   $$$$ — commercial
   $ — open source + self-cert
   
5. Long-term support:
   20-30년 — vendor commitment
   
6. Ecosystem:
   Tool·BSP·community
   
7. Project legacy:
   Previous program continuity
```

Selection — *technical + business*. 큰 결정.

## 인증·DO-178C

```text
RTOS DO-178C Evidence:

Vendor 제공:
  - Plans (PSAC equivalent for OS)
  - Requirements (HLR·LLR)
  - Design (architecture·detailed)
  - Source code
  - Verification (test·coverage·analysis)
  - Tool qualification (compiler·linker)
  - Trace matrix
  - SAS

License model:
  Per-project royalty
  Source escrow option
  Cert package separate
  
사용자 (integrator):
  - PSAC reference
  - Configuration definition
  - Application integration test
  - System-level cert evidence
```

RTOS 인증 — *vendor lifecycle data + integrator 활용*.

## Korean RTOS

```text
KARI KSLV-II:
  자체 개발 RTOS 또는 commercial
  자세한 사항 비공개
  
KAI KF-21:
  Mission system RTOS — commercial (Wind River·GHS)
  국산 BSP·driver
  
한화 미사일·LV:
  Commercial RTOS
  자체 firmware (smaller subsystem)
  
ETRI·KAIST 연구:
  AIR (Aerospace IMA Real-time) — 학술
  국산 ARINC-653 OS 개발 검토
  
민간 LV (인노스페이스·페리지):
  Commercial RTOS or RTEMS
  Cost-sensitive
```

한국 — *commercial 도입 + 국산 R&D*. Mid-term 자체화 목표.

## RTOS Integration 사례 — VxWorks 653

```text
Boeing 787 CCS workflow:

1. VxWorks 653 kernel + BSP per GPM
   - Each GPM module config

2. Partition config (XML):
   - Memory map
   - Time slot
   - Port·channel
   - HM action

3. Application development:
   - Each partition — separate vendor·team
   - ARINC-653 API
   - Cert evidence

4. Build·image:
   - Each partition image
   - Combined system image
   
5. Integration test:
   - HIL bench
   - Schedule verify
   - Port communication test
   
6. Cert evidence collection:
   - Each partition DO-178C
   - VxWorks 653 cert package
   - System integration cert
```

각 step — *수개월 작업*. Complex 인증.

## 자주 하는 실수

> ⚠️ RTOS 선택 후 변경

```text
"VxWorks → INTEGRITY mid-project"
→ BSP·driver·test 완전 rework
→ 1년+ delay
```

→ Early RTOS lock-in.

> ⚠️ ARINC-653 declaration만 신뢰

```text
"ARINC-653 compliance" — vendor 선언만
→ 자체 verification 없이 사용
```

→ Conformity test 검증.

> ⚠️ Custom BSP 인증 부담 무시

```text
"Reference BSP modify"
→ 새 BSP — full DO-178C evidence
```

→ BSP 인증 effort 계획.

> ⚠️ Tool license 만료

```text
Project mid → tool license 갱신 필요
→ 비용 미예산
```

→ Long-term license contract.

## 정리

- **Avionics RTOS** = 인증 + ARINC-653 + 결정성.
- **VxWorks 653·INTEGRITY-178·LynxOS-178·PikeOS** — 4 commercial.
- **RTEMS** — NASA·ESA 우주 표준 (오픈소스).
- **SafeRTOS** — FreeRTOS 인증 fork.
- BSP·driver·toolchain — RTOS-specific.
- Multi-core — CAST-32A 활성 영역.
- 한국 — *commercial 도입 + 국산 R&D*.

다음 편은 **Verification & Validation**.

## 관련 항목

- [Ch 3: ARINC-653](/blog/embedded/avionics/digital-avionics-handbook/chapter03-arinc-653)
- [Ch 12: V&V](/blog/embedded/avionics/digital-avionics-handbook/chapter12-vv)
- [Practical RTOS Internals — Part 5](/blog/embedded/rtos/practical-internals/part5-01-freertos-source)
- [Developing Safety-Critical SW Ch 10: Reusable Software](/blog/embedded/avionics/developing-safety-critical/chapter10-reusable-software)
