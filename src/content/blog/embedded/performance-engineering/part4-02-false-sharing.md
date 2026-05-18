---
title: "4-02: False Sharing"
date: 2026-05-12T30:00:00
description: "4-02: False Sharing"
series: "Embedded Performance Engineering"
seriesOrder: 30
tags: [false-sharing, cacheline, padding]
draft: true
---

> Outline — *같은 cache line 공유* → 코어 간 ping-pong. Padding으로 분리 (alignas(64)).
