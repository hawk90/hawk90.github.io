---
title: "Ch 12: Linux I/O 경로"
date: 2026-07-01T13:00:00
description: "Linux NVMe 드라이버의 I/O 경로 (blk-mq → nvme_cmd → completion)를 추적한다"
series: "NVMe Deep Dive"
seriesOrder: 12
tags: [nvme, linux, blk-mq, io-path]
draft: true
---

이 장에서는 애플리케이션의 I/O 요청이 NVMe Controller에 도달하고 완료되기까지의 전체 경로를 추적한다.

## I/O 경로 개요

TODO: 내용 작성

```
Application
    ↓ (syscall)
VFS
    ↓
File System (ext4, xfs, ...)
    ↓
Block Layer (bio)
    ↓
blk-mq
    ↓
nvme driver
    ↓
NVMe Controller
```

## blk-mq 요청 제출

TODO: 내용 작성

- `blk_mq_make_request()`
- Request 할당
- Hardware Queue 선택
- `nvme_queue_rq()` 호출

## nvme_queue_rq()

TODO: 내용 작성

- `struct nvme_command` 구성
- PRP/SGL 설정
- SQ Entry 작성
- Doorbell 쓰기

## 인터럽트 핸들링

TODO: 내용 작성

- MSI-X 인터럽트 수신
- `nvme_irq()` 호출
- CQ Entry 처리
- Phase Bit 확인

## Completion 처리

TODO: 내용 작성

- `nvme_complete_rq()`
- 에러 처리
- `blk_mq_complete_request()`
- 상위 계층 콜백

## 폴링 모드

TODO: 내용 작성

- `io_uring` 폴링
- `nvme_poll()`
- 레이턴시 최적화

## 정리

- blk-mq가 요청을 Hardware Queue에 분배한다
- `nvme_queue_rq()`가 SQ Entry를 작성하고 Doorbell을 누른다
- 인터럽트 핸들러가 CQ Entry를 처리하고 완료를 알린다
- 폴링 모드로 인터럽트 오버헤드를 제거할 수 있다

## 다음 장 예고

Ch 13에서는 Linux에서 Admin Queue 처리와 Identify, Features 명령 구현을 분석한다.

## 관련 항목

- [Ch 11: Linux 드라이버 개요](/blog/embedded/hardware/nvme/chapter11-linux-overview)
- [Ch 13: Linux Admin 처리](/blog/embedded/hardware/nvme/chapter13-linux-admin)
