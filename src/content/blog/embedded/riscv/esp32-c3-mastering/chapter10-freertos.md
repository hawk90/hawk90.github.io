---
title: "Ch 10: FreeRTOS on ESP32-C3 — 단일 코어 RTOS 활용"
date: 2026-05-01T10:00:00
description: "ESP-IDF의 modified FreeRTOS. 우선순위 25 단계, tickless idle, software timer."
series: "ESP32-C3 Mastering"
seriesOrder: 10
tags: [freertos, rtos, task, queue, esp32-c3]
draft: true
---

> Outline — *Espressif fork* — vanilla FreeRTOS + 일부 확장 (deprecated SMP API). C3는 단일 코어. *Task* — priority 0-24, stack은 word 단위 (RV32). *Queue·Semaphore·Mutex·Event Group·Stream Buffer*. *Tickless idle* — 절전 핵심. *Software timer*. *Watchdog* — task WDT, interrupt WDT, RTOS-level. *흔한 함정* — stack overflow 검출, priority inversion. 실습 — producer/consumer task pair.
