---
title: "Ch 8: ML 가속기와 CXL"
date: 2026-10-01T08:00:00
description: "NPU·GPU에 CXL이 의미하는 것 — capacity·coherent compute."
series: "CXL 심화"
seriesOrder: 8
tags: [cxl, npu, gpu, ml-accelerator]
draft: true
---

> Outline — *왜 CXL이 AI에 큰가* — GPU HBM 용량 한계 + LLM weight 크기. *Capacity tier* — HBM (Tier 0) + CXL DRAM (Tier 1) + NVMe. *Type 2 가속기* — host와 coherent. *NPU 통합 패턴* — weight를 CXL에, activation을 local. *UALink vs CXL* — compute 인터커넥트 분기.
