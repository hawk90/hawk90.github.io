---
title: "Part 4-5: io_uring"
date: 2026-05-12T21:00:00
description: "io_uring — 비동기 I/O의 현대 인터페이스. 링 버퍼 / zero-copy."
tags: [Linux, Kernel, io_uring, Async I/O]
series: "리눅스 커널의 구조와 원리"
seriesOrder: 21
draft: true
---

## 작성 중

### 예정 내용
- 기존 AIO의 한계
- io_uring 설계 — SQ / CQ 링 버퍼
- syscall 최소화 — SQPOLL / IOPOLL
- 지원 연산 — read / write / accept / connect / etc.
- liburing 라이브러리
- 보안 / sandbox 이슈
