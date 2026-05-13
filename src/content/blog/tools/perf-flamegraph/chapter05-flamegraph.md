---
title: "Ch 5: FlameGraph — Brendan Gregg"
date: 2025-08-26T02:00:00
description: "Brendan Gregg의 시각화 — perf script → stackcollapse → flamegraph.pl."
tags: [FlameGraph, Brendan Gregg, Visualization]
series: "perf and FlameGraph"
seriesOrder: 5
draft: true
---

## 예정 내용
- FlameGraph 동기 — 콜스택의 시각적 합산
- perf script → stackcollapse-perf.pl → flamegraph.pl
- SVG 산출 — 인터랙티브 (검색 / 줌)
- 가로 = 비율 / 세로 = 깊이
- 색 의미 — 무작위 / 의미 부여
- Differential / Heat / Reverse flame graph
