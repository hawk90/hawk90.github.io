---
title: "Ch 7: TimingCache·Build 시간 단축"
date: 2028-06-01T07:00:00
description: "Tactic timing 결과를 cache — 동일 GPU에서 재사용."
series: "TensorRT 심화"
seriesOrder: 7
tags: [tensorrt, timing-cache, build-time]
draft: true
---

* Outline — *ITimingCache* — kernel benchmark 결과 저장. *GPU·CUDA 버전 의존*. *Share across builds* — 같은 device에서 빌드 시간 5-10× 감소. *Cache size*·*serialization*. *MultiGPU build* — 각 GPU별 cache. *Versioning*과 cross-version 호환성.
