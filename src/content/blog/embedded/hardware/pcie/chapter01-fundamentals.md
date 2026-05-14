---
title: "Ch 1: PCIe Fundamentals — 계층 구조와 토폴로지"
date: 2026-06-01T02:00:00
description: "PCIe 아키텍처의 기초 — 계층 구조, 포인트-투-포인트 토폴로지, Root Complex, Switch, Endpoint"
series: "PCIe Deep Dive"
seriesOrder: 1
tags: [pcie, architecture, topology, root-complex, endpoint]
draft: true
---

PCIe는 PCI의 공유 버스 모델을 버리고 포인트-투-포인트(point-to-point) 직렬 링크로 전환했다. 이 장에서는 PCIe의 기본 아키텍처를 이해하기 위한 핵심 개념을 다룬다.

## 계층 구조 (Layer Architecture)

TODO: 내용 작성

- Transaction Layer
- Data Link Layer
- Physical Layer
- 각 계층의 역할과 책임

## 토폴로지 (Topology)

TODO: 내용 작성

- 포인트-투-포인트 vs 공유 버스
- 트리 구조
- 단일 Root

## Root Complex

TODO: 내용 작성

- CPU와의 인터페이스
- 메모리 컨트롤러 연결
- 여러 Root Port 지원

## Switch

TODO: 내용 작성

- Upstream Port / Downstream Port
- 패킷 라우팅
- Virtual Switch

## Endpoint

TODO: 내용 작성

- Type 0 Configuration Header
- 디바이스 기능
- Multi-function Device

## Bridge

TODO: 내용 작성

- PCI-to-PCIe Bridge
- PCIe-to-PCI Bridge
- Type 1 Configuration Header

## Lane과 Link

TODO: 내용 작성

- Lane 개념 (x1, x4, x8, x16)
- Link Width Negotiation
- Lane Reversal

## 정리

- PCIe는 3개 계층(Transaction, Data Link, Physical)으로 구성된다
- 포인트-투-포인트 아키텍처로 대역폭 격리와 확장성을 확보한다
- Root Complex가 트리의 루트, Switch가 중간 노드, Endpoint가 리프다
- 각 링크는 1~32개의 Lane으로 구성될 수 있다

## 다음 장 예고

[Chapter 2: TLP](/blog/embedded/hardware/pcie/chapter02-tlp)에서 Transaction Layer Packet의 구조와 종류를 다룬다. Memory Read/Write, Configuration Read/Write, Completion 패킷의 포맷을 상세히 분석한다.

## 관련 항목

- [시리즈 개요](/blog/embedded/hardware/pcie/00-overview)
- [Chapter 2: TLP](/blog/embedded/hardware/pcie/chapter02-tlp)
