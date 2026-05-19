---
title: "Ch 5: TorchDynamo — Python Frame 추적"
date: 2026-05-16T05:00:00
description: "CPython bytecode를 가로채서 graph를 만든다."
series: "PyTorch Internals"
seriesOrder: 5
tags: [pytorch, torchdynamo, bytecode, fx-graph]
draft: true
---

> Outline — *Dynamo 동기* — TorchScript의 control flow 한계 극복. *Frame evaluation API* (PEP 523). *bytecode 분석* → *symbolic 실행* → FX graph. *Graph break* — supported subset 밖이면 fallback. *Guards* — recompilation trigger. *Cache mechanism*. 비교 — Numba·JAX trace.
