---
title: "Ch 6: Interrupt Management"
date: 2026-05-09T06:00:00
description: "...FromISR·deferred interrupt — ISR과 태스크의 안전한 다리."
series: "Mastering the FreeRTOS Real Time Kernel"
seriesOrder: 6
tags: [freertos, interrupt, isr, deferred-processing]
draft: true
---

> Outline — *`...FromISR` API* 패밀리 — context switch yield. `portYIELD_FROM_ISR`·`pxHigherPriorityTaskWoken`. *deferred interrupt processing* — 짧은 ISR + 태스크 처리. *우선순위 마스크* — `configMAX_SYSCALL_INTERRUPT_PRIORITY`. *세마포 시그널링* — `xSemaphoreGiveFromISR`. *Cortex-M 특화* — NVIC priority bit grouping.
