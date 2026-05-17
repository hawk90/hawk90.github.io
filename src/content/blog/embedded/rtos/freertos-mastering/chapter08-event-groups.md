---
title: "Ch 8: Event Groups"
date: 2026-07-01T08:00:00
description: "xEventGroupSetBits·WaitForBits — 24비트 이벤트 플래그로 다중 동기화."
series: "Mastering the FreeRTOS Real Time Kernel"
seriesOrder: 8
tags: [freertos, event-group, synchronization, rendezvous]
draft: true
---

> Outline — *Event group* — RTOS 객체로 24-bit 이벤트 비트. `xEventGroupSetBits`·`xEventGroupWaitBits`. *Wait for any / all bits*. *Auto-clear on exit*. *Task synchronization* — `xEventGroupSync`로 multiple-task rendezvous. *Queue·Semaphore와 차이* — broadcast 가능.
