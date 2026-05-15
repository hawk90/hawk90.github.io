---
title: "Ch 16: Register Maps — Config Space 비트필드"
date: 2026-06-01T17:00:00
description: "PCIe Configuration Space 레지스터 맵 — 비트필드 레퍼런스, 주요 레지스터 상세"
series: "PCIe Deep Dive"
seriesOrder: 16
tags: [pcie, registers, config-space, bitfield, reference]
draft: true
---

이 장은 Configuration Space의 주요 레지스터와 비트필드를 정리한 레퍼런스다. 디버깅과 드라이버 개발 시 참조용으로 활용한다.

## Type 0 Header (0x00-0x3F)

TODO: 내용 작성

| Offset | Size | Register |
|--------|------|----------|
| 0x00 | 2 | Vendor ID |
| 0x02 | 2 | Device ID |
| 0x04 | 2 | Command |
| 0x06 | 2 | Status |
| ... | ... | ... |

## Command Register (0x04)

TODO: 내용 작성

| Bit | Name | Description |
|-----|------|-------------|
| 0 | I/O Space Enable | |
| 1 | Memory Space Enable | |
| 2 | Bus Master Enable | |
| ... | ... | ... |

## Status Register (0x06)

TODO: 내용 작성

| Bit | Name | Description |
|-----|------|-------------|
| 3 | Interrupt Status | |
| 4 | Capabilities List | |
| ... | ... | ... |

## BAR Registers (0x10-0x27)

TODO: 내용 작성

- Memory BAR 비트 구조
- I/O BAR 비트 구조
- 64-bit BAR 조합
- Prefetchable 비트

## PCI Express Capability

TODO: 내용 작성

| Offset | Size | Register |
|--------|------|----------|
| 0x00 | 2 | PCI Express Capabilities |
| 0x02 | 4 | Device Capabilities |
| 0x08 | 2 | Device Control |
| 0x0A | 2 | Device Status |
| ... | ... | ... |

## Device Capabilities (Cap+0x04)

TODO: 내용 작성

| Bit | Name | Description |
|-----|------|-------------|
| 2:0 | Max_Payload_Size Supported | |
| 4:3 | Phantom Functions Supported | |
| 5 | Extended Tag Field Supported | |
| ... | ... | ... |

## Device Control (Cap+0x08)

TODO: 내용 작성

| Bit | Name | Description |
|-----|------|-------------|
| 0 | Correctable Error Reporting Enable | |
| 1 | Non-Fatal Error Reporting Enable | |
| 2 | Fatal Error Reporting Enable | |
| ... | ... | ... |

## Link Capabilities (Cap+0x0C)

TODO: 내용 작성

| Bit | Name | Description |
|-----|------|-------------|
| 3:0 | Max Link Speed | |
| 9:4 | Maximum Link Width | |
| 11:10 | ASPM Support | |
| ... | ... | ... |

## Link Status (Cap+0x12)

TODO: 내용 작성

| Bit | Name | Description |
|-----|------|-------------|
| 3:0 | Current Link Speed | |
| 9:4 | Negotiated Link Width | |
| 11 | Link Training | |
| ... | ... | ... |

## MSI Capability

TODO: 내용 작성

- Message Control
- Message Address (32/64)
- Message Data
- Mask Bits
- Pending Bits

## MSI-X Capability

TODO: 내용 작성

- Message Control
- Table Offset/BIR
- PBA Offset/BIR
- Table Entry 구조

## Power Management Capability

TODO: 내용 작성

- PM Capabilities
- PM Control/Status
- D-state 인코딩
- PME 관련 비트

## AER Extended Capability

TODO: 내용 작성

- Uncorrectable Error Status/Mask/Severity
- Correctable Error Status/Mask
- Advanced Error Capabilities and Control
- Header Log
- Root Error Command/Status

## 정리

- 이 장은 레퍼런스용으로 필요할 때 참조한다
- 각 레지스터의 비트 의미를 정확히 이해해야 디버깅이 가능하다
- lspci -vvv 출력과 매핑하며 해석한다
- 스펙 문서와 함께 사용한다

## 시리즈 마무리

PCIe Deep Dive 시리즈를 마친다. 계층 구조부터 Linux 드라이버, 디버깅까지 PCIe의 핵심을 다루었다. 실무에서 이 지식을 활용하여 드라이버 개발과 시스템 디버깅에 적용하기 바란다.

## 관련 항목

- [Chapter 3: Configuration Space](/blog/embedded/hardware/pcie/chapter03-config-space)
- [Chapter 13: Tools](/blog/embedded/hardware/pcie/chapter13-tools)
- [PCI-SIG 스펙 문서](https://pcisig.com/)
