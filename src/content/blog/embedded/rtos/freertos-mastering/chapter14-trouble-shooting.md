---
title: "Ch 14: Trouble Shooting"
date: 2026-05-09T14:00:00
description: "stack overflow·malloc failed·assert — FreeRTOS 흔한 버그 패턴."
series: "Mastering the FreeRTOS Real Time Kernel"
seriesOrder: 14
tags: [freertos, debugging, stack-overflow, assert]
draft: true
---

> Outline — `configASSERT` — 켜고 디버깅. *Stack overflow hook* — `configCHECK_FOR_STACK_OVERFLOW` 1·2. *Malloc failed hook*. *Priority inversion* 증상. *Interrupt priority 설정 실수* (Cortex-M). *Tracing tool* — Tracealyzer·SystemView·`vTaskGetRunTimeStats`.
