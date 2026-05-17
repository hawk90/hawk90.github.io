---
title: "Ch 1: MLIR의 위치 — LLVM·SPIR-V·HLO와 비교"
date: 2027-07-01T01:00:00
description: "왜 LLVM IR 위에 또 다른 IR이 필요한가."
series: "MLIR 심화"
seriesOrder: 1
tags: [mlir, llvm, ir, compiler]
draft: true
---

> Outline — *LLVM IR* 한계 — too low-level, ML high-level 정보 손실. *SPIR-V* — GPU/Vulkan에 한정. *HLO* — XLA 전용. *MLIR* — *multi-level* IR로 frontend → backend 전 구간을 한 framework. *Dialect 시스템*으로 ML·linear algebra·hardware 추상화를 한 곳에. 시리즈 로드맵.
