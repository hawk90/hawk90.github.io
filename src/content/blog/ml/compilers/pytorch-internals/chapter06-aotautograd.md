---
title: "Ch 6: AOTAutograd"
date: 2026-05-16T06:00:00
description: "Forward + backward graph를 미리 만든다."
series: "PyTorch Internals"
seriesOrder: 6
tags: [pytorch, aotautograd, backward, fx]
draft: true
---

> Outline — *AOTAutograd* — forward와 backward를 사전에 trace. *Partitioner* — forward·backward 분리. *Functionalization* — in-place op 제거. *FX graph* — symbolic IR. *make_fx*·*aot_module*. *Min-cut activation checkpointing*. Inductor의 입력으로 사용.
