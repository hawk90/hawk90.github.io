---
title: "5-05: RTOS 선택 가이드 — Footprint·License·Certification·Ecosystem"
date: 2026-05-20T06:00:00
description: "프로젝트별 RTOS 선택. FreeRTOS·Zephyr·ThreadX·VxWorks·QNX·INTEGRITY·SafeRTOS 비교."
series: "Practical RTOS Internals"
seriesOrder: 50
tags: [selection, comparison, freertos, zephyr, threadx, vxworks, qnx]
draft: true
---

## 한 줄 요약

> **"RTOS 선택 = footprint·certification·ecosystem 3 trade-off"** — 정답 없음.

## 주요 RTOS 비교

| RTOS | License | Footprint | SMP | Certification | Ecosystem |
|---|---|---|---|---|---|
| **FreeRTOS** | MIT | 4-10 KB | 11+ | SafeRTOS commercial | huge |
| **Zephyr** | Apache 2.0 | 8-50 KB | ✓ | DO-178C in progress | huge·LF |
| **ThreadX** (Azure RTOS) | proprietary (free) | 2-15 KB | optional | IEC 61508·ISO 26262 | Microsoft |
| **RT-Thread** | Apache 2.0 | 4-50 KB | ✓ | 일부 | 중국 dominant |
| **NuttX** | Apache 2.0 | 8-100 KB | ✓ | DO-178C optional | open |
| **VxWorks** | commercial | 50-500 KB | ✓ | DO-178C·ISO 26262 | Wind River |
| **QNX** | commercial | 100 KB+ | ✓ | ASIL D·DO-178C | BlackBerry |
| **INTEGRITY** | commercial | 50 KB+ | ✓ | DO-178C Level A·EAL 6+ | Green Hills |
| **SafeRTOS** | commercial | 6 KB+ | × | IEC 61508·ISO 26262 | WHIS |
| **µC/OS** (Micrium) | proprietary | 5-15 KB | optional | IEC 62304 | Silicon Labs |
| **PX5** | commercial | 1-5 KB | × | DO-178C in progress | new (2024) |

## 결정 요인

### 1. Project 규모

```text
< 1 K LoC application:
  → FreeRTOS·ThreadX·µC/OS — overhead 최소
  → Component·devicetree 불필요

1 K - 10 K LoC:
  → FreeRTOS+ (이전 외 LwIP·FAT 등 추가)
  → Zephyr — Network·BLE 통합 우수
  
10 K+ LoC, 풍부한 component:
  → Zephyr (Linux-like ecosystem)
  → RT-Thread Smart (POSIX·MMU)
```

### 2. Hardware

```text
MCU class:
  Cortex-M0/M3: FreeRTOS·ThreadX·µC/OS (footprint)
  Cortex-M4/M7: + Zephyr·RT-Thread
  Cortex-M33: + TrustZone-aware (Zephyr·TF-M)
  Cortex-M55/M85: SMP variant
  Cortex-R52: AUTOSAR·SafeRTOS (lock-step)
  Cortex-A: Zephyr·VxWorks·QNX·Linux-RT
  RISC-V: Zephyr·FreeRTOS·RT-Thread (모두 지원)
```

### 3. Safety Certification

```text
Automotive (ISO 26262):
  - ASIL-B/C: FreeRTOS (with WHIS SafeRTOS), AUTOSAR OS
  - ASIL-D: AUTOSAR OS, QNX, INTEGRITY, ThreadX 일부
  
Aerospace (DO-178C):
  - Level D/C: many (Zephyr·FreeRTOS+cert)
  - Level B: QNX·INTEGRITY·VxWorks·µC/OS-III
  - Level A: INTEGRITY (Cortex-A·R), VxWorks 일부

Medical (IEC 62304):
  - µC/OS-III, Zephyr, ThreadX, INTEGRITY
  
Industrial (IEC 61508):
  - SafeRTOS (SIL 3), µC/OS-III, INTEGRITY
```

인증 비용 — **수만 ~ 수십만 달러**. 인증 RTOS 사용 시 *별도 라이선스 + audit*.

### 4. License

```text
무료·open source:
  - FreeRTOS (MIT)
  - Zephyr (Apache 2.0)
  - NuttX (Apache 2.0)
  - RT-Thread (Apache 2.0)
  - eCos (modified GPL)
  - Linux PREEMPT_RT (GPL)

Free for commercial (proprietary):
  - ThreadX (Azure RTOS) — Microsoft 무료
  
Commercial:
  - VxWorks·QNX·INTEGRITY — 수만 달러
  - SafeRTOS·µC/OS-III — 수만 달러
  - PX5 — 새로운 옵션
```

GPL — 임베디드 *제품 distribution 시 source 공개*. 자동차·proprietary 시스템엔 *부담*.

### 5. Ecosystem

```text
Driver·Network·BLE·USB stack:
  - Zephyr: 통합 (built-in)
  - FreeRTOS: 별도 (FreeRTOS+TCP·FreeRTOS+TLS)
  - RT-Thread: 통합 (DFS·LwIP·POSIX)
  - VxWorks: 통합 (commercial)
  - ThreadX: AzureRTOS components

IDE:
  - VS Code + extension (universal)
  - STM32CubeIDE (FreeRTOS·Zephyr 일부)
  - RT-Thread Studio (RT-Thread)
  - Wind River Workbench (VxWorks)
  - QNX Momentics (QNX)
```

### 6. Real-Time 성능

```text
ISR latency (Cortex-M4 @ 168 MHz, no FPU):
  FreeRTOS: 12-15 cycle (~80 ns)
  ThreadX:  10-12 cycle (~70 ns)
  Zephyr:   15-20 cycle (~100 ns)
  RT-Thread: 12-15 cycle
  
Context switch (시간):
  FreeRTOS: 30-50 cycle
  ThreadX:  20-30 cycle
  Zephyr:   40-60 cycle
  RT-Thread: 30-40 cycle
  
모두 *sub-µs* — 큰 차이 없음.
```

### 7. POSIX Compliance

```text
Strong POSIX:
  - QNX (full POSIX 1003.1)
  - INTEGRITY (POSIX·ARINC-653)
  - Linux PREEMPT_RT
  - RT-Thread Smart
  
Partial POSIX:
  - Zephyr (`subsys/posix`)
  - NuttX
  - FreeRTOS (with FreeRTOS-POSIX add-on)
  
No POSIX:
  - ThreadX (자체 API)
  - µC/OS
```

POSIX → *Linux 코드 호환*. 자동차 인포테인먼트·산업 HMI에 가치.

## 시나리오별 추천

### IoT 센서 (Battery 작동, Cortex-M0/M3)

```text
요구: 작은 footprint, 저전력, BLE/Wi-Fi
추천:
  1. Zephyr — Nordic·Espressif 표준
  2. FreeRTOS — 단순함
  3. RT-Thread — 중국 시장 또는 BSP 풍부 시
```

### 자동차 ECU (ASIL-B/C/D)

```text
요구: 인증, 결정성, AUTOSAR
추천:
  1. AUTOSAR OS (Vector, EB, ETAS) — 표준
  2. QNX·INTEGRITY — high-end 인포테인먼트
  3. SafeRTOS — 작은 ASIL-D ECU
```

### 항공기·LV·우주 (DO-178C)

```text
요구: DO-178C 인증, Level A/B
추천:
  1. INTEGRITY (Cortex-A·R) — fully cert
  2. VxWorks (DO-178C optional)
  3. µC/OS-III — Level A 가능
  4. SafeRTOS — 작은 시스템
  
참고: NASA·SpaceX 일부 — VxWorks·자체 RTOS
```

### 산업 PLC·로봇

```text
요구: hard real-time, EtherCAT·CANopen·OPC-UA
추천:
  1. Linux PREEMPT_RT — 가장 큰 ecosystem
  2. Zephyr — modern, 통합 IPC
  3. QNX·VxWorks — 인증 + 안정성
  4. Xenomai (Linux + RT extension)
```

### 의료 기기 (IEC 62304)

```text
요구: Class A/B/C 분류
추천:
  1. µC/OS-III (Micrium) — IEC 62304 표준
  2. INTEGRITY·VxWorks — high-end
  3. ThreadX·Zephyr (cert 확인)
```

### 스마트홈·웨어러블

```text
요구: BLE·Wi-Fi·Matter·Thread, 빠른 개발
추천:
  1. Zephyr — Matter 가장 많은 채택
  2. ESP-IDF (Espressif 자체 RTOS) — ESP32 전용
  3. Nordic SDK + Zephyr
```

### Edge AI·자율주행

```text
요구: heterogeneous (CPU·GPU·NPU), Linux 통신
추천:
  1. Linux + PREEMPT_RT — main system
  2. Zephyr·FreeRTOS — co-processor (Cortex-R, Cortex-M)
  3. NVIDIA DriveOS (QNX 기반) — 자동차 ADAS
```

## Total Cost of Ownership

```text
무료 RTOS (FreeRTOS·Zephyr):
  - License $0
  - Cert support: 별도 (SafeRTOS·WHIS·Yocto)
  - Engineer 시간 — *learning curve* 비싸짐
  - Long-term ecosystem 보장

Commercial RTOS (VxWorks·QNX·INTEGRITY):
  - License: 수만~수십만 $ per project
  - Support·training 포함
  - 인증 ready
  - 빠른 개발

상황별 정답 다름 — *startup·시작*은 무료, *enterprise·인증*은 commercial.
```

## 사양·feature 외 — Soft Factors

```text
1. Vendor 신뢰성·long-term support
2. Engineer pool — 채용 가능 vs 희소
3. Tooling (debugger·trace·analyzer)
4. Documentation 품질
5. Community·forum 활성도
6. Open source contribution 가능 여부
```

## 자주 하는 실수

> ⚠️ Footprint만 보고 선택

```text
"Zephyr는 너무 큼" → FreeRTOS 선택
→ network·BLE 직접 통합 필요 → 더 큰 cost
```

→ **ecosystem 통합**도 고려.

> ⚠️ 무료라서 선택

```text
"FreeRTOS 무료" → safety-critical에 사용
→ 인증 실패 → SafeRTOS 변환 필요 → re-development
```

→ **인증 요구사항 미리 확인**.

> ⚠️ 모든 features 추구

```text
"Zephyr가 ALL feature 가짐" → 작은 sensor에 적용
→ 100 KB footprint → flash 부족
```

→ **요구사항 명확 후 RTOS 선택**.

> ⚠️ 인증 RTOS 자체 변경

```c
/* 인증된 binary에 patch */
patch_freertos_for_my_need();
/* → 인증 무효 → re-audit */
```

→ 인증 RTOS는 *원본 유지*.

## 정리

- RTOS 선택 = **footprint·certification·ecosystem 3 trade-off**.
- IoT — Zephyr·FreeRTOS·RT-Thread.
- 자동차 — AUTOSAR OS·QNX·SafeRTOS·INTEGRITY.
- 항공 — INTEGRITY·VxWorks·µC/OS-III.
- 정답 없음 — *workload·인증·budget 따라*.
- **이전 세션 발사체 에비오닉스 우대** → INTEGRITY·VxWorks·SafeRTOS·µC/OS-III.

다음 편은 **NuttX**.

## 관련 항목

- [5-04: Porting](/blog/embedded/rtos/practical-internals/part5-04-porting)
- [5-06: NuttX](/blog/embedded/rtos/practical-internals/part5-06-nuttx)
