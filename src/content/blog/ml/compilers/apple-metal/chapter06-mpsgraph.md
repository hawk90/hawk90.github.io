---
title: "Ch 6: MPSGraph — Graph-based ML"
date: 2026-05-16T06:00:00
description: "Compute graph로 ML 워크로드 표현·실행."
series: "Apple Metal Stack"
seriesOrder: 6
tags: [metal, mpsgraph, ml-graph]
draft: true
---

> Outline — *MPSGraph* — XLA·ONNX 등 ML graph 의 Apple 등가. *Op set* — linear algebra·conv·activation·optimizer. *Graph construction* — `Graph.matMul`·`Graph.add`. *Compilation* — kernel fusion·layout opt. *Execution* — `runWithFeeds`. *Backward / training* 지원. PyTorch MPS backend의 내부.
