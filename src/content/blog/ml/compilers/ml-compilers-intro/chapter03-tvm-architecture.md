---
title: "Ch 3: TVM 아키텍처"
date: 2026-05-16T03:00:00
description: "Relay·TIR·Runtime — TVM의 3 layer."
series: "ML 컴파일러"
seriesOrder: 3
tags: [tvm, relay, tir, runtime]
draft: true
---

> Outline — *TVM 구조* — Relay (high-level) → TIR (loop-level) → target codegen. *Module·Function·Pass*. *Schedule primitive* — split·fuse·reorder·bind·tensorize. *Runtime* — `tvm.Module`·*module.load*·dispatch. *Custom code generator* — BYOC. *Microcontroller (microTVM)* 지원.
