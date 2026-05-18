---
title: "5-07: PREEMPT_RT Linux와 RTOS 비교"
date: 2026-05-12T52:00:00
description: "5-07: PREEMPT_RT Linux와 RTOS 비교"
series: "Practical RTOS Internals"
seriesOrder: 52
tags: [preempt-rt, linux, xenomai, evl, real-time-linux, hybrid-kernel]
draft: true
---

> Outline — PREEMPT_RT mainline (Linux 6.12, 2024-09) — 산업계 최대 변화. Threaded IRQ · sleeping spinlock · RT-mutex로 µs 범위 latency. Xenomai 4 · EVL Core dual-kernel 접근. "Hard RTOS vs PREEMPT_RT Linux" 선택 기준 — 1 ms 이상 SoC 시스템에 Linux 쪽이 답일 때.
