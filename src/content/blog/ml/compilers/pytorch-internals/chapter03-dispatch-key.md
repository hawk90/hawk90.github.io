---
title: "Ch 3: Operator·Dispatch Key"
date: 2026-05-16T03:00:00
description: "Tensor 메소드 호출이 어디로 routed되는가."
series: "PyTorch Internals"
seriesOrder: 3
tags: [pytorch, dispatch, key, registration]
draft: true
---

> Outline — *Dispatch key set* — 우선순위 stack. *CPU·CUDA·Autograd·VariableType·BackendSelect·Functionalize·FuncTorch·Vmap·Tracer*. *Library 등록 API* — `TORCH_LIBRARY`·`TORCH_LIBRARY_IMPL`. *Selective build*·*mobile dispatch*. *Custom backend* 추가 — NPU vendor 진입로. *Dispatcher 디버깅* — `TORCH_SHOW_DISPATCH_TRACE`.
