---
title: "Ch 9: Sharding과 SPMD"
slug: "ml/compilers/xla-deep/chapter09-sharding-spmd"
date: 2026-05-16T09:00:00
description: "GSPMD·sharding propagation — multi-device 자동 분할."
series: "XLA·OpenXLA 심화"
seriesOrder: 9
tags: [xla, gspmd, sharding, tpu-pod]
draft: true
topics: ["ml", "ml/compilers"]
---

* Outline — *SPMD (Single Program Multiple Data)*. *GSPMD* — XLA의 partition compiler. *Sharding annotation* — `OpSharding`·mesh·partition spec. *Sharding propagation* — 일부 annotation만 주면 나머지 자동 추론. *Collective op insertion* — all-reduce·all-gather·reduce-scatter. *JAX `pjit`·`shard_map`*과 통합.
