---
title: "Ch 4: Queue 메커니즘"
date: 2026-07-01T05:00:00
description: "NVMe의 Submission Queue, Completion Queue, Doorbell, Phase Bit 메커니즘을 분석한다"
series: "NVMe Deep Dive"
seriesOrder: 4
tags: [nvme, queue, doorbell, phase-bit]
draft: true
---

NVMe의 고성능은 효율적인 큐 메커니즘에서 비롯된다. 이 장에서는 Submission Queue, Completion Queue, Doorbell 레지스터, 그리고 Phase Bit의 동작을 상세히 분석한다.

## Submission Queue (SQ)

TODO: 내용 작성

- SQ Entry 구조 (64바이트)
- CDW0 (Command Dword 0) 필드
- NSID, PRP1, PRP2 필드
- Circular buffer 구조

## Completion Queue (CQ)

TODO: 내용 작성

- CQ Entry 구조 (16바이트)
- Status Field
- SQHD (SQ Head Pointer)
- Phase Tag

## Doorbell 레지스터

TODO: 내용 작성

- SQ Tail Doorbell
- CQ Head Doorbell
- Doorbell Stride (DSTRD)

## Phase Bit

TODO: 내용 작성

- Wraparound 감지
- 폴링 모드에서의 활용
- Phase Bit 토글 규칙

## 명령 제출 흐름

TODO: 내용 작성

1. 호스트가 SQ Entry 작성
2. SQ Tail Doorbell 업데이트
3. Controller가 명령 Fetch
4. Controller가 CQ Entry 작성
5. 인터럽트 또는 폴링으로 완료 감지
6. 호스트가 CQ Head Doorbell 업데이트

## 정리

- SQ Entry는 64바이트, CQ Entry는 16바이트
- Doorbell 쓰기로 Controller에 명령 제출을 알린다
- Phase Bit는 CQ Entry의 유효성을 판단하는 핵심 메커니즘이다
- 인터럽트 또는 폴링으로 완료를 감지한다

## 다음 장 예고

Ch 5에서는 Admin Command (Identify, Create Queue, Get/Set Features)를 상세히 분석한다.

## 관련 항목

- [Ch 3: Namespace](/blog/embedded/hardware/nvme/chapter03-namespace)
- [Ch 5: Admin Commands](/blog/embedded/hardware/nvme/chapter05-admin-commands)
