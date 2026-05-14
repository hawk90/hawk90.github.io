---
title: "Ch 4: BAR & MMIO — 메모리 매핑"
date: 2026-06-01T05:00:00
description: "Base Address Register 타입과 Address Translation — Memory BAR, I/O BAR, 64-bit BAR, Prefetchable"
series: "PCIe Deep Dive"
seriesOrder: 4
tags: [pcie, bar, mmio, address-translation, memory-mapping]
draft: true
---

Base Address Register(BAR)는 디바이스의 레지스터 공간을 시스템 주소 공간에 매핑하는 메커니즘이다. 이 장에서는 BAR의 종류와 Address Translation 과정을 다룬다.

## BAR 개요

TODO: 내용 작성

- BAR의 역할
- Type 0 헤더의 BAR 0-5
- Type 1 헤더의 BAR 0-1
- 디바이스 초기화 시 할당

## Memory BAR

TODO: 내용 작성

- 32-bit Memory BAR
- 64-bit Memory BAR (연속 2개 BAR 사용)
- Prefetchable vs Non-Prefetchable
- Type 필드 인코딩

## I/O BAR

TODO: 내용 작성

- Legacy I/O 공간
- 32-bit I/O Address
- 현대 시스템에서의 제한
- Deprecation 경향

## BAR 크기 결정

TODO: 내용 작성

- BAR Sizing 알고리즘
- 0xFFFFFFFF 쓰기 후 읽기
- 크기 비트마스크 해석
- BIOS/Firmware의 역할

## Address Translation

TODO: 내용 작성

- CPU Physical Address → PCIe Address
- Inbound vs Outbound Translation
- Root Complex의 역할
- IOMMU 연동

## Prefetchable Memory

TODO: 내용 작성

- Prefetchable 속성의 의미
- CPU 캐시와의 관계
- Read-Combining 최적화
- 언제 사용하는가

## Expansion ROM BAR

TODO: 내용 작성

- Option ROM 지원
- Enable 비트
- 주소 할당

## 정리

- BAR는 디바이스 레지스터를 시스템 주소 공간에 매핑한다
- Memory BAR는 32-bit 또는 64-bit 주소를 지원한다
- Prefetchable 메모리는 CPU가 미리 읽어도 부작용이 없다
- BAR 크기는 런타임에 소프트웨어가 감지한다

## 다음 장 예고

[Chapter 5: Interrupts](/blog/embedded/hardware/pcie/chapter05-interrupts)에서 PCIe의 인터럽트 메커니즘을 다룬다. Legacy INTx에서 MSI, MSI-X까지의 발전을 살펴본다.

## 관련 항목

- [Chapter 3: Configuration Space](/blog/embedded/hardware/pcie/chapter03-config-space)
- [Chapter 5: Interrupts](/blog/embedded/hardware/pcie/chapter05-interrupts)
- [Chapter 11: Linux DMA](/blog/embedded/hardware/pcie/chapter11-linux-dma)
