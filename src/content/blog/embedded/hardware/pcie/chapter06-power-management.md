---
title: "Ch 6: Power Management — ASPM과 L-states"
date: 2026-06-01T07:00:00
description: "PCIe 전력 관리 — ASPM, L0s/L1/L2/L3 상태, D-states, 링크 전력 최적화"
series: "PCIe Deep Dive"
seriesOrder: 6
tags: [pcie, power-management, aspm, l-states, d-states]
draft: true
---

전력 관리는 모바일 기기부터 데이터센터까지 모든 시스템에서 중요하다. PCIe는 ASPM(Active State Power Management)과 D-states를 통해 유휴 시 전력을 절감한다.

## 전력 관리 개요

TODO: 내용 작성

- 링크 레벨 전력 관리 (ASPM)
- 디바이스 레벨 전력 관리 (D-states)
- 소프트웨어 제어 vs 하드웨어 자동

## D-states

TODO: 내용 작성

- D0: Fully Operational
- D1: Light Sleep (optional)
- D2: Deep Sleep (optional)
- D3hot: Software Off
- D3cold: Hardware Off
- 전환 레이턴시

## Power Management Capability

TODO: 내용 작성

- PME (Power Management Event)
- PME_Status, PME_Enable
- Power State 필드
- Auxiliary Power

## ASPM (Active State Power Management)

TODO: 내용 작성

- L0: Active
- L0s: Standby (빠른 진입/복귀)
- L1: Low Power Standby
- ASPM Control 레지스터
- Link Capability의 ASPM Support

## L1 Substates

TODO: 내용 작성

- L1.1: PLL Off
- L1.2: Link in Electrical Idle
- L1 PM Substates Capability
- 더 깊은 절전

## L2/L3 States

TODO: 내용 작성

- L2: Auxiliary Power
- L3: Power Off
- Hot-Plug와의 관계
- Wake 메커니즘

## ASPM 정책

TODO: 내용 작성

- Linux ASPM 정책
  - `default`
  - `performance`
  - `powersave`
  - `powersupersave`
- `/sys/module/pcie_aspm/parameters/policy`
- 커널 파라미터 `pcie_aspm=`

## 정리

- D-states는 디바이스 수준의 전력 상태를 정의한다
- ASPM은 링크 수준에서 유휴 시 자동으로 절전 모드에 진입한다
- L0s는 빠른 복귀, L1/L1.x는 더 깊은 절전을 제공한다
- 전력 절감과 레이턴시는 트레이드오프 관계다

## 다음 장 예고

[Chapter 7: Error Handling](/blog/embedded/hardware/pcie/chapter07-error-handling)에서 PCIe의 에러 탐지와 복구 메커니즘을 다룬다. AER(Advanced Error Reporting)을 중심으로 살펴본다.

## 관련 항목

- [Chapter 5: Interrupts](/blog/embedded/hardware/pcie/chapter05-interrupts)
- [Chapter 7: Error Handling](/blog/embedded/hardware/pcie/chapter07-error-handling)
- [Chapter 9: Physical Layer](/blog/embedded/hardware/pcie/chapter09-physical-layer)
