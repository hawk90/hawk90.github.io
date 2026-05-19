---
title: "Ch 8: Directory Coherence Protocols"
date: 2026-05-19T08:00:00
description: "Directory — broadcast 대신 sharers를 추적한다."
series: "A Primer on Memory Consistency and Cache Coherence"
seriesOrder: 8
tags: [directory-coherence, scalability, sharers]
draft: true
---

> Outline — *Directory* — 각 cache line별로 sharer 집합을 메타데이터로 보관. *Home node* — 메모리 인접 directory. *Point-to-point messaging* — broadcast 회피. *Directory entry format* — full bit vector vs coarse vector vs limited pointer. *3-hop vs 4-hop* protocol. *Scalability* — large multi-socket·many-core 시스템에 필수.
