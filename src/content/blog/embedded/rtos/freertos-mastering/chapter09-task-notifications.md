---
title: "Ch 9: Task Notifications"
date: 2026-05-09T09:00:00
description: "xTaskNotify·NotifyValue — 큐/세마포보다 가볍고 빠른 알림 방식."
series: "Mastering the FreeRTOS Real Time Kernel"
seriesOrder: 9
tags: [freertos, notification, lightweight-ipc]
draft: true
---

> Outline — 각 태스크가 가진 *notification value* + state. `xTaskNotify`·`xTaskNotifyWait`·`ulTaskNotifyTake`. *6가지 action* — NoAction·SetBits·Increment·SetValueWithOverwrite·SetValueWithoutOverwrite·General. *binary·counting semaphore 대체* — RAM 절약·속도. *제약* — 단일 수신자만 (broadcast 불가).
