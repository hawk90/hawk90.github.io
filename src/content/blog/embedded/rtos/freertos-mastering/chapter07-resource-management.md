---
title: "Ch 7: Resource Management"
date: 2026-07-01T07:00:00
description: "mutex·recursive mutex·priority inheritance — 공유 자원 보호 패턴."
series: "Mastering the FreeRTOS Real Time Kernel"
seriesOrder: 7
tags: [freertos, mutex, semaphore, priority-inversion]
draft: true
---

> Outline — *Critical section* — `taskENTER_CRITICAL`. *Suspend scheduler* — `vTaskSuspendAll`. *Mutex* — `xSemaphoreCreateMutex`, priority inheritance 포함. *Recursive mutex* — 같은 태스크 재진입. *Counting semaphore*. *Gatekeeper task* 패턴 — 공유 자원을 한 태스크가 독점 관리. *우선순위 역전* (priority inversion) 회피.
