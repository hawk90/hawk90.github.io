---
title: "Ch 4: Queue Management"
date: 2026-05-09T04:00:00
description: "xQueueSend·xQueueReceive — 태스크 간 메시지 전달의 기본."
series: "Mastering the FreeRTOS Real Time Kernel"
seriesOrder: 4
tags: [freertos, queue, ipc, message-passing]
draft: true
---

> Outline — *큐 생성* — `xQueueCreate`·`xQueueCreateStatic`. *블로킹 동작* — `xTicksToWait`. *큐 데이터 모델* — by copy vs by reference. *큐 집합* — `xQueueCreateSet` (여러 큐 동시 대기). *peek* — `xQueuePeek` 데이터 보존. *mailbox 패턴* — 큐 깊이 1.
