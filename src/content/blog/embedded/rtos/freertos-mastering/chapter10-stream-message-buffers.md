---
title: "Ch 10: Stream and Message Buffers"
date: 2026-05-09T10:00:00
description: "xStreamBufferSend·xMessageBufferSend — 단일 reader/writer용 lock-free 버퍼."
series: "Mastering the FreeRTOS Real Time Kernel"
seriesOrder: 10
tags: [freertos, stream-buffer, message-buffer, lock-free]
draft: true
---

> Outline — *Stream buffer* — 바이트 단위 producer/consumer FIFO. *Message buffer* — 가변 크기 메시지(길이 prefix). *제약* — 단일 reader + 단일 writer (lock 없음). *Core-to-core* 통신 (AMP·dual-core)에 적합. `xStreamBufferSetTriggerLevel`. *ISR-safe* 변형 — `...FromISR`.
