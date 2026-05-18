---
title: "3-02: 세마포어 내부 구현"
date: 2026-05-12T22:00:00
description: "3-02: 세마포어 내부 구현"
series: "Practical RTOS Internals"
seriesOrder: 22
tags: [semaphore, wait-queue, counter]
draft: true
---

> Outline — *Counter + wait list*. P(wait): counter--, if <0 block. V(post): counter++, if waiter wake. ISR-safe variant.
