---
title: "Ch 1: NVMe 아키텍처"
date: 2026-05-16T02:00:00
description: "AHCI와 NVMe의 근본적인 차이를 비교하고 NVMe 아키텍처의 전체 구조를 분석한다"
series: "NVMe Deep Dive"
seriesOrder: 1
tags: [nvme, ahci, pcie, architecture]
draft: true
---

NVMe는 AHCI의 한계를 극복하기 위해 처음부터 새로 설계된 프로토콜이다. 이 장에서는 두 프로토콜의 근본적인 차이를 비교하고, NVMe 아키텍처의 전체 그림을 그린다.

## NVMe vs AHCI

TODO: 내용 작성

- AHCI의 한계 (단일 커맨드 큐, 32개 슬롯)
- NVMe의 설계 철학 (병렬성, 낮은 레이턴시)
- 성능 비교 수치

## PCIe 기반 통신

TODO: 내용 작성

- Memory-Mapped I/O
- DMA 전송
- MSI-X 인터럽트

## NVMe 전체 구조

TODO: 내용 작성

- Host Software
- Controller
- Namespace
- 구성 요소 간 관계 다이어그램

## Controller와 Namespace 관계

TODO: 내용 작성

- 하나의 Controller, 다수의 Namespace
- NVMe Subsystem 개념

## 정리

- AHCI는 HDD 시대의 유산이며, NVMe는 플래시에 최적화되었다
- NVMe는 최대 65,535개의 I/O Queue를 지원한다
- 각 Queue는 최대 65,536개의 Command를 담을 수 있다
- PCIe의 Memory-Mapped I/O와 DMA로 CPU 개입을 최소화한다

## 다음 장 예고

Ch 2에서는 Controller의 Capabilities 레지스터와 Identify 구조체를 상세히 분석한다.

## 관련 항목

- [Ch 2: Controller](/blog/embedded/hardware/nvme/chapter02-controller)
