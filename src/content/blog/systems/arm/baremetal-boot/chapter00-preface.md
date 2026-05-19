---
title: "Preface: ARM Bare-Metal Boot 시리즈"
date: 2026-05-22T00:00:00
description: "POWER-on-Reset 신호부터 main() 진입까지, ARM 베어메탈 부트 시퀀스를 한 시리즈에서 따라갑니다."
series: "ARM Bare-Metal Boot"
seriesOrder: 0
tags: [arm, baremetal, boot, cortex-m, cortex-a, tf-a, psci]
type: tech
featured: false
draft: true
---

## 왜 이 시리즈인가

ARM 시스템의 부트는 *조각 조각으로* 흩어져 있는 주제입니다. Cortex-M의 vector table은 임베디드 C++ 책에 한 챕터, TF-A의 BL31 흐름은 부트로더 책에 한 챕터, PSCI는 RTOS 책에 한 챕터, secure boot 체인은 보안 책에 한 챕터. *전원이 들어오는 순간부터 main()이 도는 순간까지*를 한 흐름으로 연결한 자료가 의외로 드뭅니다.

이 시리즈는 그 *공백*을 채우는 것이 목표입니다. POWER-on-Reset 신호의 전기적 의미부터, vector table fetch, 어셈블리 한 줄 한 줄의 Reset_Handler, BL1·BL2·BL31의 EL 전환, PSCI를 통한 secondary CPU bring-up, 그리고 secure boot의 신뢰 사슬까지. *ARM 아키텍처 관점에서 본 부트 그 자체*가 주제입니다.

## 자매 시리즈와의 관계

이 사이트에는 이미 부트의 *특정 단면*을 다루는 시리즈가 여럿 있습니다. 이 시리즈는 그 시리즈들을 *대체*하는 것이 아니라 *연결*하는 위치입니다.

| 영역 | 자매 시리즈 | 이 시리즈 |
|------|-----------|-----------|
| U-Boot 사용, Linux 부팅 | [Bootloader Internals](/blog/embedded/bootloader/chapter01-boot-problem) | (cross-link only) |
| C++ runtime startup, `__libc_init_array` | [Embedded C++ for Real Systems — Part 1](/blog/embedded/embedded-cpp/part1-06-startup-code) | (cross-link) |
| RTOS scheduler의 context switch | [Practical RTOS Internals — Part 2](/blog/embedded/rtos/practical-internals/part2-05-cortex-m-context) | (cross-link) |
| 드라이버 작성·MMIO·GPIO recipe | [Modern Embedded Recipes — Part 4](/blog/embedded/modern-recipes/part4-01-first-baremetal) | (cross-link) |
| TrustZone과 TF-M, OP-TEE | [Embedded Security](/blog/embedded/embedded-security/chapter04-trustzone) | (cross-link) |
| **부트 시퀀스 자체 (POWER → main)** | — | **이 시리즈** |

자매 시리즈는 *부트의 결과를 사용하는 코드*에 집중합니다. 이 시리즈는 *부트 그 자체*에 집중합니다. RTOS 시리즈가 "context switch는 PendSV가 한다"고 설명한다면, 이 시리즈는 "vector table이 SP를 어떻게 로드하고 Reset_Handler가 어떻게 PendSV를 처음 trigger하는가"를 다룹니다.

## 12 챕터 구성

| Ch | 제목 | 핵심 |
|----|------|------|
| 1 | ARM Boot 전체 그림 | M profile vs A profile, PoR 신호 |
| 2 | Cortex-M Reset → Vector → main | vector table, Reset_Handler 어셈블리 |
| 3 | Cortex-M Linker Script & Memory Map | .text/.data/.bss, LMA vs VMA |
| 4 | Cortex-A BootROM 분석 | NXP i.MX, STM32, RPi 4 vendor BootROM |
| 5 | TF-A 4-Stage 개요 | BL1/BL2/BL31/BL32/BL33과 EL |
| 6 | TF-A BL1 → BL2 흐름 | image load, EL3 SMC handoff, FIP |
| 7 | TF-A BL31 EL3 Runtime | PSCI/SDEI/RAS service |
| 8 | PSCI / SMCCC | CPU power state, OS↔EL3 ABI |
| 9 | SMP Secondary CPU Bring-up | spin table vs PSCI CPU_ON |
| 10 | AMP Heterogeneous Boot | Cortex-A + Cortex-M, firmware handoff |
| 11 | Secure Boot Chain End-to-End | ROM key → BL2 sign verify → kernel |
| 12 | Boot 디버깅 | JTAG halt-at-reset, ROM trace, semihosting |

## 학습 로드맵

대상 독자의 관심사에 따라 *세 가지 경로*가 있습니다.

**M profile만 — STM32, nRF, RP2040 임베디드 개발자**

1. Ch 1 (전체 그림) → Ch 2 (Reset 흐름) → Ch 3 (Linker)
2. Ch 12 (디버깅)
3. 필요 시 Ch 11 (secure boot)에서 Cortex-M TrustZone-M 부분

**A profile만 — i.MX, Snowy, Rockchip, RPi 4 SoC 개발자**

1. Ch 1 (전체 그림) → Ch 4 (BootROM) → Ch 5 (TF-A 4-stage) → Ch 6 (BL1→BL2)
2. Ch 7 (BL31 runtime) → Ch 8 (PSCI/SMCCC) → Ch 9 (SMP)
3. Ch 11 (secure boot) → Ch 12 (디버깅)

**전체 — heterogeneous SoC (i.MX 8M, STM32MP, RP2350) 개발자**

전 챕터 순서대로. 특히 Ch 10 (AMP)가 두 profile을 묶는 자리입니다.

## 톤과 형식

[Tone A](/blog/) — `~합니다` 친근체. 자매 시리즈와 통일된 톤입니다. 코드 예시는 *어셈블리·C·링커 스크립트·devicetree*가 섞여 들어갑니다. 모든 다이어그램은 TikZ로 빌드된 SVG이며, 부트 시퀀스 자체가 *시각적*인 주제이므로 그림이 많습니다.

## 다음

[Ch 1: ARM Boot 전체 그림](/blog/systems/arm/baremetal-boot/chapter01-boot-overview)에서 시작합니다. PoR 신호의 전기적 의미부터, Cortex-M과 Cortex-A의 첫 fetch가 어떻게 다른지를 한 장의 비교 표로 정리합니다.

## 관련 시리즈

- [RISC-V 베어메탈 부트](/blog/systems/riscv/baremetal-boot/chapter01-boot-overview) — 같은 주제의 RISC-V 버전
- [Bootloader Internals](/blog/embedded/bootloader/chapter01-boot-problem) — U-Boot·TF-A·EDK II 생태계
- [Embedded C++ for Real Systems](/blog/embedded/embedded-cpp/00-preface) — C++ runtime의 부트 요구사항
- [Practical RTOS Internals](/blog/embedded/rtos/practical-internals/00-preface) — RTOS scheduler가 사용하는 부트 결과물
- [Modern Embedded Recipes](/blog/embedded/modern-recipes/00-preface) — 보드별 부팅 recipe
- [Embedded Security](/blog/embedded/embedded-security/chapter01-threat-model) — TrustZone·secure boot 깊이
