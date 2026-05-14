---
title: "Ch 5: Admin Commands"
date: 2026-07-01T06:00:00
description: "NVMe Admin Command (Identify, Create Queue, Get/Set Features)를 분석한다"
series: "NVMe Deep Dive"
seriesOrder: 5
tags: [nvme, admin, identify, features]
draft: true
---

Admin Queue는 Controller 관리와 I/O Queue 생성에 사용된다. 이 장에서는 핵심 Admin Command인 Identify, Create I/O Queue, Get/Set Features를 분석한다.

## Admin Queue 개요

TODO: 내용 작성

- Admin SQ/CQ는 항상 Queue ID 0
- 초기화 시 자동 생성
- ASQ/ACQ 레지스터로 주소 설정

## Identify 명령

TODO: 내용 작성

- CNS (Controller or Namespace Structure) 값
- Identify Controller (CNS=01h)
- Identify Namespace (CNS=00h)
- Active Namespace List (CNS=02h)

## Create I/O Submission Queue

TODO: 내용 작성

- QSIZE (Queue Size)
- PC (Physically Contiguous)
- CQID (Completion Queue Identifier)
- QPRIO (Queue Priority)

## Create I/O Completion Queue

TODO: 내용 작성

- QSIZE
- PC
- IEN (Interrupt Enable)
- IV (Interrupt Vector)

## Get Features / Set Features

TODO: 내용 작성

- Feature Identifier (FID)
- Arbitration (FID=01h)
- Power Management (FID=02h)
- Temperature Threshold (FID=04h)
- Number of Queues (FID=07h)

## 기타 Admin Commands

TODO: 내용 작성

- Delete I/O SQ/CQ
- Abort
- Asynchronous Event Request
- Firmware Commands

## 정리

- Admin Queue (ID=0)는 Controller 관리 전용이다
- Identify로 Controller/Namespace 정보를 조회한다
- I/O Queue는 Create SQ/CQ 명령으로 동적 생성한다
- Features 명령으로 Controller 동작을 조정한다

## 다음 장 예고

Ch 6에서는 실제 데이터 전송을 담당하는 I/O Commands (Read, Write, Flush, DSM)를 다룬다.

## 관련 항목

- [Ch 4: Queue 메커니즘](/blog/embedded/hardware/nvme/chapter04-queue-mechanism)
- [Ch 6: I/O Commands](/blog/embedded/hardware/nvme/chapter06-io-commands)
