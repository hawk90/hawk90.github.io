---
title: "Ch 7: 인터럽트와 완료 통보"
date: 2026-05-16T07:00:00
description: "MSI-X·threaded IRQ·tasklet — NPU가 끝났음을 알리는 길."
series: "NPU 드라이버 개발"
seriesOrder: 7
tags: [npu, interrupt, msi-x, threaded-irq]
draft: true
---

> Outline — *Interrupt source* — completion·error·debug. *MSI-X allocation* — `pci_alloc_irq_vectors`. *Top half + threaded IRQ*. *Polled completion* — vs interrupt-driven. *Doorbell-like fast path*. *Userspace wakeup* — `wait_queue`·*eventfd*·*sync_file*. Cumulative IRQ rate 조절.
