---
title: "Ch 2: IR 설계 — Relay·HLO·MLIR"
date: 2026-05-16T02:00:00
description: "ML 컴파일러의 중간 표현 — 3가지 디자인 철학."
series: "ML 컴파일러"
seriesOrder: 2
tags: [ir, relay, hlo, mlir, tensor]
draft: true
---

> Outline — *Relay (TVM)* — functional·typed IR. *HLO (XLA)* — operation-rich, shape-statically-typed. *MLIR* — multi-level, dialect-extensible. *Common requirements* — tensor type·shape·layout·attr. *TIR (TVM)*·*TensorIR* — low-level loop IR. *Relax* (TVM 2) — dynamic shape 지원.
