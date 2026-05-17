---
title: "Ch 5: Concurrency and Race Conditions"
date: 2026-06-01T05:00:00
description: "Semaphore·mutex·spinlock·completion·atomic·RCU — 커널 동기화 도구의 한 장 정리."
series: "Linux Device Drivers (LDD3)"
seriesOrder: 5
tags: [linux, driver, concurrency, mutex, spinlock, rcu]
draft: true
---

> Outline — kernel semaphore (down/up) → mutex (모던 표준). spinlock — `spin_lock`·`spin_lock_irqsave`. completion. atomic — `atomic_t`·`atomic_long_t`. seqlock·RCU 개요. 6.x에서의 *preemption RT*와의 영향.
