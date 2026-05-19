---
title: "Part 4-3: 블록 I/O 계층"
date: 2026-05-12T19:00:00
description: "bio / request — 블록 디바이스 추상. I/O 스케줄러 (BFQ / mq-deadline)."
tags: [Linux, Kernel, Block I/O, Scheduler]
series: "리눅스 커널의 구조와 원리"
seriesOrder: 19
draft: true
---

## 작성 중

### 예정 내용
- bio 구조체 — 블록 I/O 단위
- request queue
- I/O 스케줄러 — noop / deadline / CFQ → BFQ / mq-deadline / Kyber
- multi-queue (blk-mq) — 멀티 큐 / NVMe
- plug/unplug — 배치 처리
- merge / elevator
