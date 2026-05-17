---
title: "Ch 8: NPU·GPU에서의 활용"
date: 2027-01-01T08:00:00
description: "Weight·activation·KV cache — HBM 자리잡기."
series: "HBM·GDDR 심화"
seriesOrder: 8
tags: [hbm, npu, gpu, llm-serving]
draft: true
---

> Outline — *Weight 저장* — model size에 비례. *Activation* — batch×seq×hidden. *KV cache* — 메모리 폭증 원인. *Memory layout* — channel-aware allocation. *HBM tiling* — kernel design 영향. *MFU·MBU*. *CXL·UALink tiering*과 결합. 카드급 사례 — H100·MI300·Sapeon·Rebellions Atom.
