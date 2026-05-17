---
title: "Ch 6: Coherence Protocols"
date: 2026-09-01T06:00:00
description: "MSI·MESI·MOESI·MESIF — cache line state machine의 분류학."
series: "A Primer on Memory Consistency and Cache Coherence"
seriesOrder: 6
tags: [coherence-protocol, mesi, moesi, state-machine]
draft: true
---

> Outline — *Cache line state*의 진화 — MSI (Modified·Shared·Invalid) → MESI (+Exclusive) → MOESI (+Owned) → MESIF (Intel). *Transition diagram* — request·response·snoop. *Stable vs transient state*. *Atomic transitions* — race 회피 위한 추가 state. *Why E matters* — silent upgrade.
