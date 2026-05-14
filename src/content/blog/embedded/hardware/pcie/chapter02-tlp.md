---
title: "Ch 2: TLP — Transaction Layer Packet"
date: 2026-06-01T03:00:00
description: "TLP 패킷 구조와 종류 — Memory, I/O, Configuration, Message, Completion"
series: "PCIe Deep Dive"
seriesOrder: 2
tags: [pcie, tlp, packet, transaction-layer]
draft: true
---

Transaction Layer Packet(TLP)은 PCIe의 상위 계층에서 데이터를 전송하는 기본 단위다. 이 장에서는 TLP의 구조, 종류, 라우팅 방식을 다룬다.

## TLP 개요

TODO: 내용 작성

- TLP의 역할
- Request와 Completion
- Non-Posted vs Posted Transaction

## TLP 헤더 구조

TODO: 내용 작성

- 3DW Header vs 4DW Header
- Format/Type 필드
- Traffic Class, Attributes
- Length, Requester ID, Tag

## Memory Transaction

TODO: 내용 작성

- Memory Read Request (MRd)
- Memory Write Request (MWr)
- 32-bit vs 64-bit Addressing
- Completion 필요 여부

## I/O Transaction

TODO: 내용 작성

- I/O Read/Write
- Legacy 호환성
- 현대 시스템에서의 사용

## Configuration Transaction

TODO: 내용 작성

- Configuration Read/Write
- Type 0 vs Type 1
- Bus/Device/Function 라우팅

## Message Transaction

TODO: 내용 작성

- Vendor Defined Message
- Error Signaling
- Power Management
- Interrupt (Assert_INTx, MSI)

## Completion

TODO: 내용 작성

- Completion with Data (CplD)
- Completion without Data (Cpl)
- Completion Status
- Completer ID, Byte Count

## TLP Routing

TODO: 내용 작성

- Address Routing
- ID Routing
- Implicit Routing
- Broadcast/Multicast

## 정리

- TLP는 3DW 또는 4DW 헤더와 선택적 데이터 페이로드로 구성된다
- Memory/IO/Config/Message 4종류의 Request가 있다
- Non-Posted Transaction은 Completion을 필요로 한다
- 라우팅은 Address, ID, Implicit 세 가지 방식이 있다

## 다음 장 예고

[Chapter 3: Configuration Space](/blog/embedded/hardware/pcie/chapter03-config-space)에서 PCIe 디바이스의 Configuration Space 구조와 Capability 체인을 다룬다.

## 관련 항목

- [Chapter 1: Fundamentals](/blog/embedded/hardware/pcie/chapter01-fundamentals)
- [Chapter 3: Configuration Space](/blog/embedded/hardware/pcie/chapter03-config-space)
