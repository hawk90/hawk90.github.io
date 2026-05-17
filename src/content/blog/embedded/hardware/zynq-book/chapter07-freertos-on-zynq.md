---
title: "Ch 7: FreeRTOS on Zynq"
date: 2026-08-01T07:00:00
description: "Cortex-A9 port·GIC·SMP — Zynq 위에서 FreeRTOS 돌리기."
series: "The Zynq Book"
seriesOrder: 7
tags: [zynq, freertos, cortex-a9, smp]
draft: true
---

> Outline — *FreeRTOS Cortex-A9 port* — `portASM.S`·tick via Global Timer. *GIC와 협력* — `XScuGic` + FreeRTOS interrupt API. *SMP 옵션* — Cortex-A9 dual core. *RPU on UltraScale+* — Cortex-R5F lockstep. *Hardware abstraction* — Xilinx driver + FreeRTOS task의 통합 패턴.
