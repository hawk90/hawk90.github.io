---
title: "Ch 8: 병목 진단과 최적화"
date: 2026-05-16T08:00:00
description: "Compute·memory·comm — 어느 축이 막혔는지 정확히 찾기."
series: "ML 시스템 프로파일링"
seriesOrder: 8
tags: [bottleneck, optimization, mfu, mbu]
draft: true
---

> Outline — *Decision tree* — MFU<50%? → compute issue. MBU 한계? → memory bound. Comm 시간 > compute? → topology 문제. *Specific 최적화* — fusion·layout·sharding 변경·tensor parallelism. *KV cache* 최적화 — page attention·prefix sharing. *대용량 LLM serving* 사례.
