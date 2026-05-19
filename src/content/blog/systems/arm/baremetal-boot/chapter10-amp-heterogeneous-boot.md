---
title: "Chapter 10: AMP Heterogeneous Boot"
date: 2026-05-22T10:00:00
description: "Cortex-A와 Cortex-M이 함께 있는 SoC(i.MX 8M, STM32MP, RP2350)의 firmware handoff 패턴을 정리합니다."
series: "ARM Bare-Metal Boot"
seriesOrder: 10
tags: [arm, baremetal, amp, heterogeneous, imx, stm32mp, rp2350]
draft: true
---

> Outline — Cortex-A가 Cortex-M 펌웨어를 적재·기동하는 두 가지 모델(Linux Remoteproc vs U-Boot pre-Linux), STM32MP의 Cortex-M4 co-processor, i.MX 8M의 M7 어시스턴트, RP2350의 dual-architecture 부트까지를 비교합니다.
