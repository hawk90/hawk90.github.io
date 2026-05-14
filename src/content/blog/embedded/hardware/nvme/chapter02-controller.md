---
title: "Ch 2: Controller"
date: 2026-07-01T03:00:00
description: "NVMe Controller의 Capabilities 레지스터와 Identify Controller 구조체를 분석한다"
series: "NVMe Deep Dive"
seriesOrder: 2
tags: [nvme, controller, identify, capabilities]
draft: true
---

NVMe Controller는 호스트와 스토리지 미디어 사이의 인터페이스를 담당한다. 이 장에서는 Controller의 능력을 정의하는 레지스터와 Identify 구조체를 상세히 분석한다.

## Controller Capabilities (CAP)

TODO: 내용 작성

- MQES (Maximum Queue Entries Supported)
- CQR (Contiguous Queues Required)
- AMS (Arbitration Mechanism Supported)
- TO (Timeout)
- DSTRD (Doorbell Stride)

## Identify Controller 구조체

TODO: 내용 작성

- VID, SSVID (Vendor ID)
- SN, MN, FR (Serial Number, Model Number, Firmware Revision)
- MDTS (Maximum Data Transfer Size)
- CNTLID (Controller ID)
- NN (Number of Namespaces)

## Controller 유형

TODO: 내용 작성

- I/O Controller
- Discovery Controller
- Administrative Controller

## Controller 상태 머신

TODO: 내용 작성

- Disabled → Enabled → Ready
- Reset 동작

## 정리

- CAP 레지스터는 Controller의 하드웨어 제약을 정의한다
- Identify Controller는 소프트웨어가 읽을 수 있는 상세 정보를 제공한다
- MDTS는 단일 명령의 최대 전송 크기를 결정한다

## 다음 장 예고

Ch 3에서는 Namespace의 개념과 Multi-path I/O를 다룬다.

## 관련 항목

- [Ch 1: NVMe 아키텍처](/blog/embedded/hardware/nvme/chapter01-architecture)
- [Ch 3: Namespace](/blog/embedded/hardware/nvme/chapter03-namespace)
