---
title: "Ch 7: 메모리 제약 설계 (<256 KB)"
date: 2028-04-01T07:00:00
description: "RAM·Flash·tensor arena 분배 — 매 KB가 소중하다."
series: "TinyML·Edge AI"
seriesOrder: 7
tags: [tinyml, memory, ram, flash]
draft: true
---

> Outline — *MCU 메모리 분류* — Flash (model + code)·RAM (activation + stack). *Typical budget* — Cortex-M0+ (8-32 KB RAM)·M4 (128-512 KB)·M7 (1 MB). *Model size 줄이기* — pruning·quantization·distillation. *Streaming inference* — activation을 sub-tile로. *External Flash·PSRAM* 활용.
