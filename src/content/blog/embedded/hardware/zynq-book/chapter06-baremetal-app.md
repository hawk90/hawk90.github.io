---
title: "Ch 6: Bare-metal Application Development"
date: 2026-08-01T06:00:00
description: "standalone BSP·Xil*** API — RTOS 없이 Zynq 위에서 코드를 돌려보자."
series: "The Zynq Book"
seriesOrder: 6
tags: [zynq, baremetal, bsp, standalone]
draft: true
---

> Outline — *Standalone BSP* — `xparameters.h`로 메모리/주변기기 매핑. *Xil drivers* — `XGpio`·`XUartPs`·`XAxiDma`·`XScuGic`. *Linker script* — DDR·OCM 분리. *Interrupt setup* — GIC 초기화. *Printf via UART*. *Cache 제어* — `Xil_DCacheFlushRange`. Bare-metal에서 *PL 가속기*와 통신하는 패턴.
