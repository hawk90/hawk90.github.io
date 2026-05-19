---
title: "Ch 5: Interrupts — Legacy, MSI, MSI-X"
date: 2026-05-16T06:00:00
description: "PCIe 인터럽트 메커니즘 — Legacy INTx, MSI, MSI-X의 구조와 차이"
series: "PCIe Deep Dive"
seriesOrder: 5
tags: [pcie, interrupt, msi, msi-x, intx]
draft: true
---

인터럽트는 디바이스가 CPU에 이벤트를 알리는 메커니즘이다. PCIe는 Legacy INTx를 유지하면서 MSI와 MSI-X를 통해 현대적인 인터럽트 방식을 제공한다.

## Legacy INTx

TODO: 내용 작성

- PCI 호환성
- INTA#, INTB#, INTC#, INTD#
- Virtual Wire (Assert_INTx, Deassert_INTx)
- 공유 인터럽트 문제
- Level-triggered

## MSI (Message Signaled Interrupt)

TODO: 내용 작성

- MSI Capability 구조
- Message Address/Data 레지스터
- 32개 벡터 제한
- Edge-triggered
- 공유 없음

## MSI-X

TODO: 내용 작성

- MSI의 확장
- 2048개 벡터 지원
- Table과 PBA (Pending Bit Array)
- BAR 기반 테이블 위치
- Per-vector Masking

## MSI vs MSI-X 비교

TODO: 내용 작성

| 특성 | MSI | MSI-X |
|------|-----|-------|
| 최대 벡터 | 32 | 2048 |
| 벡터당 마스킹 | X | O |
| 테이블 위치 | Config Space | BAR |

## 인터럽트 라우팅

TODO: 내용 작성

- APIC과의 연동
- Interrupt Remapping
- IOMMU의 역할
- Multi-queue 디바이스

## Linux에서의 사용

TODO: 내용 작성

- `pci_alloc_irq_vectors()`
- MSI vs MSI-X 선택
- Affinity 설정
- `request_irq()` / `free_irq()`

## 정리

- Legacy INTx는 PCI 호환성을 위해 존재하지만 현대 시스템에서는 비효율적이다
- MSI는 Memory Write로 인터럽트를 전달하여 공유 문제를 해결한다
- MSI-X는 더 많은 벡터와 유연한 마스킹을 제공한다
- 고성능 디바이스는 MSI-X를 사용한다

## 다음 장 예고

[Chapter 6: Power Management](/blog/embedded/hardware/pcie/chapter06-power-management)에서 PCIe의 전력 관리 메커니즘을 다룬다. ASPM과 L-states를 통한 절전을 살펴본다.

## 관련 항목

- [Chapter 3: Configuration Space](/blog/embedded/hardware/pcie/chapter03-config-space)
- [Chapter 6: Power Management](/blog/embedded/hardware/pcie/chapter06-power-management)
- [Chapter 10: Linux Basics](/blog/embedded/hardware/pcie/chapter10-linux-basics)
