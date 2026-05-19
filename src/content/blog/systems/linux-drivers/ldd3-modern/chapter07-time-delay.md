---
title: "Ch 7: Time, Delays, and Deferred Work"
date: 2026-05-13T07:00:00
description: "jiffies·HZ·timer·delay·workqueue·tasklet — 커널 시간 관리."
series: "Linux Device Drivers (LDD3)"
seriesOrder: 7
tags: [linux, driver, time, jiffies, workqueue]
draft: true
---

> Outline — `jiffies`·HZ·`get_jiffies_64`. `time64_t`·`ktime_t`. delay — `udelay`·`mdelay`·`msleep`·`usleep_range`. kernel timer (legacy)·hrtimer. *workqueue* (모던 표준)·tasklet (deprecated). softirq·threaded IRQ.
