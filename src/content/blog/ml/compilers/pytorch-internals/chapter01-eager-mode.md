---
title: "Ch 1: Eager Mode — Autograd·Dispatcher"
slug: "ml/compilers/pytorch-internals/chapter01-eager-mode"
date: 2026-05-16T01:00:00
description: "Tensor 연산이 Python에서 C++로 가는 길."
series: "PyTorch Internals"
seriesOrder: 1
tags: [pytorch, eager, autograd, dispatcher]
draft: true
topics: ["ml", "ml/compilers"]
---

> Outline — *Eager execution* — immediate evaluation. *Autograd* — backward graph 동적 구축. *Dispatcher* — operator·dtype·device·backend로 분기. *requires_grad*·*saved_tensors*. *Python ↔ C++* binding (pybind11). 시리즈 로드맵.
