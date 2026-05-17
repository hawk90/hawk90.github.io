---
title: "Ch 9: Communicating with Hardware"
date: 2026-06-01T09:00:00
description: "ioport·ioremap·MMIO·barriers — 커널이 HW와 대화하는 표준 인터페이스."
series: "Linux Device Drivers (LDD3)"
seriesOrder: 9
tags: [linux, driver, mmio, ioremap, barrier]
draft: true
---

> Outline — I/O ports — `request_region`·`inb`·`outb`. MMIO — `ioremap`·`readl`·`writel`·`iounmap`. *memory barriers* — `wmb`·`rmb`·`mb`·`smp_mb`. 6.x의 `devm_ioremap_resource`. *endianness* — `cpu_to_le32`·`le32_to_cpu`. PCIe BAR access는 ch12에서.
