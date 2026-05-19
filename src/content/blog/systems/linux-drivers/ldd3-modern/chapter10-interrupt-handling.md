---
title: "Ch 10: Interrupt Handling"
date: 2026-05-13T10:00:00
description: "request_irq·top half·bottom half·threaded IRQ — 인터럽트 처리의 정석."
series: "Linux Device Drivers (LDD3)"
seriesOrder: 10
tags: [linux, driver, interrupt, threaded-irq, tasklet]
draft: true
---

> Outline — `request_irq`·`free_irq` — IRQ 등록. *top half* — 짧고 빠르게. *bottom half* — tasklet·softirq·workqueue 비교. 6.x의 `request_threaded_irq` — kernel thread 위에서 실행. *MSI/MSI-X*는 ch12에서. *IRQ sharing* — `IRQF_SHARED`. *spurious IRQ* 디버깅.
