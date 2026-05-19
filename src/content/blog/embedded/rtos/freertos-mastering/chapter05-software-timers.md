---
title: "Ch 5: Software Timer Management"
date: 2026-05-09T05:00:00
description: "xTimerCreate·oneshot·autoreload — 타이머 데몬과 콜백."
series: "Mastering the FreeRTOS Real Time Kernel"
seriesOrder: 5
tags: [freertos, timer, callback, daemon]
draft: true
---

> Outline — *타이머 데몬* — 모든 타이머 콜백을 한 태스크에서 실행. *one-shot vs auto-reload*. `xTimerStart`·`xTimerStop`·`xTimerChangePeriod`. *주의* — 콜백은 짧고 블록 금지. *타이머 ID*로 인스턴스 식별. *동적 우선순위* — `configTIMER_TASK_PRIORITY`.
