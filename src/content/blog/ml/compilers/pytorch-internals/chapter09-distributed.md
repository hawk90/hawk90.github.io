---
title: "Ch 9: Distributed — DDP·FSDP"
date: 2026-05-16T09:00:00
description: "Data parallel·sharded model — multi-GPU/multi-node 학습."
series: "PyTorch Internals"
seriesOrder: 9
tags: [pytorch, ddp, fsdp, distributed]
draft: true
---

> Outline — *torch.distributed* — NCCL·Gloo backend. *DDP* — model replicated, gradient all-reduce. *FSDP* — ZeRO-3 스타일 parameter sharding. *DTensor* — distributed tensor abstraction. *2D/3D parallelism* — TP + PP + DP. *PiPPy*·*TorchTitan*. *Communication overlap*과 bucket.
