---
title: "Ch 1: 임베디드 에뮬레이션 개요"
date: 2025-09-15T01:00:00
description: "QEMU로 ARM/RISC-V 보드를 에뮬레이션해 펌웨어와 OS를 테스트하는 이유."
tags: [QEMU, ARM, RISC-V, Embedded]
series: "QEMU Embedded Emulation"
seriesOrder: 1
draft: true
---

## 왜 임베디드 에뮬레이션인가

임베디드 개발에서 흔한 문제:

- **하드웨어 부족** — 팀원 수만큼 보드가 없음
- **보드 파손 위험** — 프로토타입은 망가지기 쉬움
- **디버깅 어려움** — JTAG 환경 구축 번거로움
- **자동화 어려움** — CI에서 실제 보드 연결 곤란

QEMU로 이 모든 문제를 해결합니다.

---

## QEMU가 지원하는 아키텍처

- **ARM**: Cortex-A, Cortex-M, AArch64
- **RISC-V**: RV32, RV64
- **x86/x86_64**
- MIPS, PowerPC, ...

---

## virt 머신

QEMU의 `virt` 머신은 범용 가상 플랫폼입니다.

- 특정 하드웨어를 흉내내지 않음
- 필요한 페리페럴만 선택적으로 추가
- 빠르고 간단

---

## 정리

- QEMU로 ARM/RISC-V 보드 없이 펌웨어를 개발/테스트한다.
- virt 머신은 범용 가상 플랫폼이다.
- GDB 원격 디버깅으로 커널/펌웨어를 단계별 실행한다.

---

## 관련 항목

- [Ch 2: ARM virt 머신](/blog/tools/qemu-embedded-emulation/chapter02-arm-virt)
- [QEMU Fake Device Driver 시리즈](/blog/tools/qemu-fake-device/chapter01-overview)
