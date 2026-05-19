---
title: "Ch 5: 대역폭 계산과 병목 분석"
date: 2026-05-16T05:00:00
description: "Theoretical vs achievable — 메모리 대역폭의 실제."
series: "HBM·GDDR 심화"
seriesOrder: 5
tags: [hbm, bandwidth, roofline, bottleneck]
draft: true
---

> Outline — *Theoretical BW* — clock × bus width × DDR. *Sustained BW* — refresh·row activation·bank conflict로 70-90%. *Roofline 모델* — arithmetic intensity vs BW. *Memory wall* — compute가 BW보다 빨리 증가. *Workload별 BW 요구* — GEMM·attention·embedding. 측정 — perf·NVIDIA Nsight·rocprof.
