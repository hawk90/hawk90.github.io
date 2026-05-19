---
title: "Ch 1: 임베디드 에뮬레이션 개요"
date: 2026-05-17T01:00:00
description: "QEMU로 ARM/RISC-V 보드를 에뮬레이션해 펌웨어와 OS를 테스트하는 이유."
tags: [QEMU, ARM, RISC-V, Embedded, virt]
series: "QEMU Embedded Emulation"
seriesOrder: 1
draft: true
---

임베디드 개발은 *하드웨어가 있어야* 시작할 수 있는 분야로 흔히 인식됩니다. 그러나 실 보드 없이도 펌웨어·OS·driver의 *대부분*을 개발·테스트할 수 있는 환경이 존재합니다 — **QEMU**입니다. 이 시리즈는 그 환경을 깊이 활용하는 법을 다룹니다.

이 첫 장은 시리즈가 다룰 범위와 동기, 기본 머신, 부팅 chain을 정리합니다.

## 왜 임베디드 에뮬레이션인가

임베디드 개발 현장에서 자주 마주치는 문제들.

| 어려움 | 결과 |
|--------|------|
| 하드웨어 부족 — 팀원 수만큼 보드 없음 | 작업 시간 충돌 |
| 보드 파손 위험 — 프로토타입은 부서지기 쉬움 | 비용·일정 영향 |
| 디버깅 어려움 — JTAG 환경 구축 번거로움 | iteration 시간 증가 |
| CI 자동화 어려움 — 실 보드 연결 곤란 | 회귀 테스트 부재 |
| Cross-platform 검증 — N개 SoC × M개 kernel | 조합 폭발 |

QEMU는 이 모든 문제를 *완전히는* 풀지 않지만 *대부분*을 풉니다 — 학습·firmware bring-up·CI에서 표준 도구.

## QEMU가 지원하는 아키텍처

| Architecture | 자주 쓰는 머신 |
|--------------|----------------|
| **ARM (AArch32/AArch64)** | virt, raspi3b/4b, mps2, xlnx-zcu102 |
| **RISC-V (RV32/RV64)** | virt, sifive_u, hifive_unmatched, opentitan |
| **x86/x86_64** | q35, pc-i440fx |
| MIPS, PowerPC, OpenRISC, m68k, SH4 | 다양한 머신 |

임베디드 주류는 ARM·RISC-V이므로 이 시리즈는 둘에 집중합니다.

## virt 머신 — 시작점

QEMU의 `virt` 머신은 *특정 실 SoC를 흉내내지 않는* 범용 가상 플랫폼입니다.

- VirtIO 디바이스(블록·네트워크·rng)
- PL011 UART (ARM), 16550 UART (RISC-V)
- GIC (ARM), PLIC + CLINT (RISC-V)
- 필요한 peripheral만 *선택적*으로 attach

학습·CI·prototype에 적합합니다. 실 SoC에 가까운 환경이 필요하면 vendor machine(Ch 13)으로 이동.

## 시리즈 구성

이 시리즈가 다룰 20장.

| Ch 범위 | 주제 |
|---------|------|
| Ch 1~3 | 개요와 virt 머신 (ARM/RISC-V) |
| Ch 4~6 | U-Boot · Linux 커널 · rootfs |
| Ch 7~9 | DT · peripherals · 네트워킹 |
| Ch 10 | GDB 원격 디버깅 |
| Ch 11~12 | 베어메탈 · RTOS |
| Ch 13~14 | 벤더 머신 · semihosting |
| Ch 15~17 | OpenAMP/RPMsg · TrustZone · Hypervisor |
| Ch 18~20 | 보드 bringup · fault injection · CI matrix |

각 장은 "어떤 문제 → 어떻게 동작 → 코드 예시 → 정리"의 흐름을 따릅니다.

## 가장 단순한 부팅

```bash
qemu-system-aarch64 -M virt -cpu cortex-a53 -m 512M \
    -kernel Image -nographic \
    -append "console=ttyAMA0"
```

미리 빌드된 ARM64 Linux Image를 *바로* 실행합니다. console 메시지가 stdio에 흐르고 `Ctrl-A`, `x`로 종료.

RISC-V도 한 줄.

```bash
qemu-system-riscv64 -M virt -m 512M \
    -bios opensbi-fw_jump.bin -kernel Image -nographic \
    -append "console=ttyS0"
```

이 두 명령이 시리즈 전반에 반복 등장합니다.

## QEMU와 실 보드의 거리

| 측면 | QEMU | 실 보드 |
|------|------|---------|
| CPU 명령 | 100% 정확 | 정확 |
| Peripheral 인터페이스 | 거의 정확 | 정확 |
| Timing | 명목적 | cycle-accurate |
| 전력·열 | 모사 안 함 | 실제 영향 |
| 외부 아날로그 | 거의 모사 안 함 | 실제 |
| CI 통합 | 매우 쉬움 | 어려움 |

QEMU는 *기능 검증*에서 우위, 실 보드는 *물리적 동작*에서 우위. 두 환경이 *보완*되어야 production 품질에 도달합니다.

## 임베디드 개발 흐름

다음 흐름을 가정하면 QEMU의 자리가 명확해집니다.

```text
1. 알고리즘·driver 로직 → QEMU virt에서 검증
2. SoC-specific 동작 → QEMU vendor machine에서 검증
3. CI 회귀 → QEMU matrix(Ch 20)에서 자동
4. timing-critical / 아날로그 → 실 보드에서
5. 양산 검증 → HIL 또는 production line
```

QEMU가 1~3을 *대부분 흡수*해 실 보드는 4~5에 집중할 수 있게 합니다.

## 정리

- 임베디드 개발의 *대부분*은 실 보드 없이도 QEMU에서 가능. 학습·firmware·driver·CI에서 표준.
- 주된 아키텍처는 **ARM**(AArch32/AArch64)과 **RISC-V**(RV32/RV64). 둘 다 `virt` 머신이 시작점.
- `virt`는 범용 가상 SoC — vendor machine은 실 SoC 호환(Ch 13).
- 시리즈 20장 구성: 기본 → 벤더 머신 → secure/hypervisor → bringup/fault/CI.
- QEMU는 *기능 검증*에 우위, 실 보드는 *물리적 동작*에 우위. 두 환경이 보완.
- 개발 흐름: 알고리즘·SoC-specific을 QEMU에서, timing/analog는 실 보드에서.

## 다음 장 예고

다음 장은 ARM **virt 머신**을 자세히 다룹니다. AArch64 Linux 커널을 부팅하고 GIC·PL011·VirtIO 같은 표준 peripheral을 확인하는 흐름까지.

## 관련 항목

- [Ch 2: ARM virt 머신](/blog/tools/emulation/qemu-embedded/chapter02-arm-virt)
- [QEMU Fake Device Driver](/blog/tools/emulation/qemu-fake-device/chapter01-overview) — driver 개발 관점
- [QEMU Internals](/blog/tools/emulation/qemu-internals/chapter01-architecture)
- [RISC-V QEMU 심화](/blog/tools/emulation/qemu-riscv/chapter01-overview)
