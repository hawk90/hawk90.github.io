---
title: "Ch 11: Low Power Support"
date: 2026-07-01T11:00:00
description: "tickless idle·sleep modes — RTOS에서 전력 소비 줄이기."
series: "Mastering the FreeRTOS Real Time Kernel"
seriesOrder: 11
tags: [freertos, low-power, tickless, sleep]
draft: true
---

> Outline — *Tickless idle* — `configUSE_TICKLESS_IDLE`. *Pre/Post sleep hook* — `portSUPPRESS_TICKS_AND_SLEEP`. *Expected idle time* 계산. *MCU sleep mode* — sleep·deep sleep·standby. *Wakeup source* — interrupt·RTC·timer. *Tick correction* — sleep 동안 경과한 시간 반영.
