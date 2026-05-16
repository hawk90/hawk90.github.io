---
title: "Ch 17: Benchmark와 profiling"
date: 2026-05-22T17:00:00
description: "pytest-benchmark·pyinstrument — 성능 회귀 감지와 hotspot 찾기."
series: "pytest 심화"
seriesOrder: 17
tags: [pytest, benchmark, pyinstrument, profiling]
draft: true
---

> Outline — `pytest-benchmark`의 `benchmark` fixture로 *반복 측정·통계*. `--benchmark-compare`로 *회귀 감지*. *pyinstrument*로 wall-clock based profiler (cProfile보다 부드러움). `pytest-profiling`으로 *.prof* 산출 → snakeviz.
