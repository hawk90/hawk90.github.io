---
title: "Ch 7: Snooping Coherence Protocols"
date: 2026-05-19T07:00:00
description: "Bus·broadcast — 모든 캐시가 모든 transaction을 본다."
series: "A Primer on Memory Consistency and Cache Coherence"
seriesOrder: 7
tags: [snooping, bus-coherence, broadcast]
draft: true
---

> Outline — *Snooping 모델* — shared bus 위에서 모든 cache가 listen. *Broadcast request* → *snoop response*. *Atomic bus* vs *split-transaction bus*. *MESI 구현* on snooping. *Scalability 한계* — bus 대역폭. *왜 small SMP에 적합한가* — latency 작음. *Hybrid* — snoop + filter.
