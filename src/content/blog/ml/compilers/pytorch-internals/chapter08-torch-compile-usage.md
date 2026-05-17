---
title: "Ch 8: torch.compile 사용 패턴"
date: 2027-10-01T08:00:00
description: "Mode·backend·dynamic — torch.compile을 잘 쓰는 법."
series: "PyTorch Internals"
seriesOrder: 8
tags: [pytorch, torch-compile, mode, dynamic]
draft: true
---

> Outline — *torch.compile(model, mode=...)* — `default·reduce-overhead·max-autotune`. *Backend 선택* — `inductor` (default)·`openxla`·custom. *Dynamic shape* — `dynamic=True`. *graph break* 회피 — supported Python subset. *Recompilation cost*·`TORCH_LOGS=recompiles`. *Production pattern* — warmup·cache.
