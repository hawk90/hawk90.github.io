---
title: "Ch 12: Memory Protection Unit (MPU) Support"
date: 2026-05-09T12:00:00
description: "FreeRTOS-MPU·privileged·unprivileged — 태스크 격리와 보안."
series: "Mastering the FreeRTOS Real Time Kernel"
seriesOrder: 12
tags: [freertos, mpu, security, isolation]
draft: true
---

> Outline — *Cortex-M MPU* 모델 — region·permission·attribute. *Privileged vs unprivileged 태스크*. `xTaskCreateRestricted` — region 정의. *System call*로 권한 승격. *Region overlap* 규칙. *Stack overflow detection* 강화. *Limitation* — 8/16 region 한계.
