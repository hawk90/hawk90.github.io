---
title: "Ch 11: JAX와 XLA 통합"
date: 2026-05-16T11:00:00
description: "jit·grad·vmap·pjit — JAX trace가 XLA에 들어가는 길."
series: "XLA·OpenXLA 심화"
seriesOrder: 11
tags: [jax, xla, jit, pjit]
draft: true
---

> Outline — *JAX의 transform* — `jit`·`grad`·`vmap`·`pmap`·`pjit`. *Tracing* — abstract value로 trace, jaxpr 생성. *jaxpr → MLIR (StableHLO)* lowering. *Cache hashing* — argument shape·dtype. *Sharding* — `pjit` with mesh. *Custom call* — black-box op 삽입. *Performance pitfall* — recompilation·async dispatch.
