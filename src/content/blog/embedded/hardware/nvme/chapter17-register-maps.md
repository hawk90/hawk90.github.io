---
title: "Ch 17: Register Map"
date: 2026-05-16T18:00:00
description: "NVMe Controller Register Map (CAP/VS/CC/CSTS/AQA/ASQ/ACQ)을 상세히 분석한다"
series: "NVMe Deep Dive"
seriesOrder: 17
tags: [nvme, register, mmio, bar]
draft: true
---

NVMe Controller는 PCIe BAR0를 통해 Memory-Mapped Register를 노출한다. 이 장에서는 핵심 레지스터를 상세히 분석한다.

## Register Map 개요

TODO: 내용 작성

| 오프셋 | 레지스터 | 크기 | 설명 |
|--------|----------|------|------|
| 00h | CAP | 8B | Controller Capabilities |
| 08h | VS | 4B | Version |
| 0Ch | INTMS | 4B | Interrupt Mask Set |
| 10h | INTMC | 4B | Interrupt Mask Clear |
| 14h | CC | 4B | Controller Configuration |
| 1Ch | CSTS | 4B | Controller Status |
| 20h | NSSR | 4B | NVM Subsystem Reset |
| 24h | AQA | 4B | Admin Queue Attributes |
| 28h | ASQ | 8B | Admin Submission Queue Base Address |
| 30h | ACQ | 8B | Admin Completion Queue Base Address |

## CAP (Controller Capabilities)

TODO: 내용 작성

- MQES: Maximum Queue Entries Supported
- CQR: Contiguous Queues Required
- AMS: Arbitration Mechanism Supported
- TO: Timeout
- DSTRD: Doorbell Stride
- NSSRS: NVM Subsystem Reset Supported
- CSS: Command Sets Supported
- MPSMIN/MPSMAX: Memory Page Size

## VS (Version)

TODO: 내용 작성

- MJR: Major Version
- MNR: Minor Version
- TER: Tertiary Version

## CC (Controller Configuration)

TODO: 내용 작성

- EN: Enable
- CSS: I/O Command Set Selected
- MPS: Memory Page Size
- AMS: Arbitration Mechanism Selected
- SHN: Shutdown Notification
- IOSQES: I/O SQ Entry Size
- IOCQES: I/O CQ Entry Size

## CSTS (Controller Status)

TODO: 내용 작성

- RDY: Ready
- CFS: Controller Fatal Status
- SHST: Shutdown Status
- NSSRO: NVM Subsystem Reset Occurred
- PP: Processing Paused

## AQA (Admin Queue Attributes)

TODO: 내용 작성

- ASQS: Admin Submission Queue Size
- ACQS: Admin Completion Queue Size

## ASQ/ACQ

TODO: 내용 작성

- Admin Submission Queue Base Address
- Admin Completion Queue Base Address
- 물리 주소, 페이지 정렬

## Doorbell 레지스터

TODO: 내용 작성

- SQ Tail Doorbell: 1000h + (2y * DSTRD)
- CQ Head Doorbell: 1000h + ((2y + 1) * DSTRD)

## 초기화 시퀀스

TODO: 내용 작성

1. CAP 읽기 → 능력 확인
2. CC.EN=0 → Controller 비활성화
3. CSTS.RDY=0 대기
4. AQA, ASQ, ACQ 설정
5. CC 설정 (MPS, AMS, CSS, EN=1)
6. CSTS.RDY=1 대기

## 정리

- CAP는 Controller의 하드웨어 능력을 정의한다
- CC로 Controller를 설정하고 활성화한다
- CSTS로 Controller 상태를 확인한다
- ASQ/ACQ는 Admin Queue의 물리 주소를 설정한다
- Doorbell 오프셋은 DSTRD에 따라 계산한다

## 시리즈 마무리

이것으로 NVMe Deep Dive 시리즈를 마친다. NVMe 스펙의 핵심 개념부터 Linux 드라이버 구현, 실무 도구 활용까지 체계적으로 다루었다. 이 지식을 바탕으로 NVMe 스펙 문서를 직접 읽고 시스템을 분석하고 최적화할 수 있기를 바란다.

## 관련 항목

- [Ch 16: Firmware와 Format](/blog/embedded/hardware/nvme/chapter16-firmware)

## 외부 참고 자료

- [NVMe Base Specification](https://nvmexpress.org/specifications/)
- [Linux NVMe Driver Source](https://github.com/torvalds/linux/tree/master/drivers/nvme)
