---
title: "Ch 1: ML 컴파일러 개요 — 왜 필요한가"
date: 2028-02-01T01:00:00
description: "PyTorch가 있으면 끝 아닌가 — ML 컴파일러의 의미."
series: "ML 컴파일러"
seriesOrder: 1
tags: [ml-compiler, tvm, mlir, xla]
draft: true
---

* Outline — *eager mode 한계* — kernel launch·메모리 roundtrip. *벤더 lib (cuDNN·cuBLAS)*의 한계 — fusion·special shape 미지원. *Generality vs performance* trade-off. *Compile-time 정보* — shape·dtype·dataflow로 best kernel 생성. *주요 frameworks* — TVM·XLA·MLIR·Glow·TensorRT. 시리즈 로드맵.
