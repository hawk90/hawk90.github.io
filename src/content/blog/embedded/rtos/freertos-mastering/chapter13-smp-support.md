---
title: "Ch 13: SMP Support"
date: 2026-05-09T13:00:00
description: "configNUMBER_OF_CORES·core affinity — FreeRTOS의 멀티코어 스케줄링."
series: "Mastering the FreeRTOS Real Time Kernel"
seriesOrder: 13
tags: [freertos, smp, multicore, affinity]
draft: true
---

> Outline — *SMP 분기* — v11에 mainline 통합. `configNUMBER_OF_CORES` ≥ 2. *Core affinity mask* — `vTaskCoreAffinitySet`. *Symmetric vs asymmetric* 비교 (AMP는 별도). *Inter-core synchronization* — spinlock, critical section의 core-aware 버전. *RP2040·ESP32-S3* 등 dual-core 타깃.
