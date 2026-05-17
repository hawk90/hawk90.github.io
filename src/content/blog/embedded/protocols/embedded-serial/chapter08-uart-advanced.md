---
title: "Ch 8: UART 고급 — 흐름 제어·DMA"
date: 2027-03-01T08:00:00
description: "RTS/CTS·DMA·FIFO — UART를 고속·안정적으로 쓰는 길."
series: "Embedded Protocols 심화"
seriesOrder: 8
tags: [uart, flow-control, dma, fifo]
draft: true
---

> Outline — *하드웨어 흐름 제어* — RTS·CTS. *소프트웨어 흐름* — XON/XOFF. *FIFO* — 8/16/32/64-byte buffer로 overrun 회피. *DMA* — burst 수신·송신. *IDLE line detect*. *Multi-buffer ping-pong*. STM32·Cortex-M 흔한 패턴.
