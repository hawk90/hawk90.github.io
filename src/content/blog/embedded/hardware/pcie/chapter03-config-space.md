---
title: "Ch 3: Configuration Space — 설정 공간과 Capability"
date: 2026-05-16T04:00:00
description: "PCIe Configuration Space 구조 — Type 0/1 헤더, Capability 체인, Extended Configuration Space"
series: "PCIe Deep Dive"
seriesOrder: 3
tags: [pcie, config-space, capability, registers]
draft: true
---

Configuration Space는 PCIe 디바이스의 신원과 기능을 정의하는 레지스터 공간이다. 이 장에서는 Configuration Space의 구조와 Capability 메커니즘을 다룬다.

## Configuration Space 개요

TODO: 내용 작성

- 256 바이트 기본 공간 (PCI 호환)
- 4KB Extended Configuration Space (PCIe)
- ECAM (Enhanced Configuration Access Mechanism)

## Type 0 Header

TODO: 내용 작성

- Endpoint용 헤더
- Vendor ID, Device ID
- Command, Status 레지스터
- BAR 0-5
- Subsystem ID
- Interrupt Line/Pin

## Type 1 Header

TODO: 내용 작성

- Bridge/Switch용 헤더
- Primary/Secondary/Subordinate Bus Number
- Memory Base/Limit
- I/O Base/Limit
- Prefetchable Memory

## Command Register

TODO: 내용 작성

- I/O Space Enable
- Memory Space Enable
- Bus Master Enable
- INTx Disable
- SERR Enable

## Status Register

TODO: 내용 작성

- Capabilities List
- Interrupt Status
- Master/Target Abort
- Detected Parity Error

## Capability 구조

TODO: 내용 작성

- Capability Pointer (0x34)
- Capability ID
- Next Capability Pointer
- Capability-specific Data

## 주요 Capability

TODO: 내용 작성

- Power Management (0x01)
- MSI (0x05)
- MSI-X (0x11)
- PCI Express (0x10)
- Vendor Specific (0x09)

## Extended Capability

TODO: 내용 작성

- 0x100 이후 영역
- Extended Capability Header
- AER (0x0001)
- Serial Number (0x0003)
- SR-IOV (0x0010)

## 정리

- Configuration Space는 디바이스 식별과 제어를 위한 레지스터 집합이다
- Type 0은 Endpoint, Type 1은 Bridge/Switch용이다
- Capability는 링크드 리스트로 확장 기능을 표현한다
- Extended Capability는 PCIe 전용 확장 기능을 제공한다

## 다음 장 예고

[Chapter 4: BAR & MMIO](/blog/embedded/hardware/pcie/chapter04-bar-mmio)에서 Base Address Register의 종류와 메모리 매핑 메커니즘을 다룬다.

## 관련 항목

- [Chapter 2: TLP](/blog/embedded/hardware/pcie/chapter02-tlp)
- [Chapter 4: BAR & MMIO](/blog/embedded/hardware/pcie/chapter04-bar-mmio)
- [Chapter 16: Register Maps](/blog/embedded/hardware/pcie/chapter16-register-maps)
