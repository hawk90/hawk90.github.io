---
title: "Ch 6: Advanced Char Driver Operations"
date: 2026-06-01T06:00:00
description: "ioctl·blocking I/O·poll·async notification·seek·access control — char driver 심화."
series: "Linux Device Drivers (LDD3)"
seriesOrder: 6
tags: [linux, driver, ioctl, poll, blocking-io]
draft: true
---

> Outline — `ioctl` — magic numbers·command coding macros (`_IO`·`_IOR`·`_IOW`·`_IOWR`). blocking I/O — wait queues (`wait_event_interruptible`·`wake_up_interruptible`). poll·select — `f_op->poll`. async notification — `fasync`. mmap (다음 ch15에서 깊이).
