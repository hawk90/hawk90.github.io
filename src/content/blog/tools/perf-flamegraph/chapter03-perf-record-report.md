---
title: "Ch 3: perf record / report"
date: 2026-08-25T03:00:00
description: "샘플링 프로파일링 — perf record. perf report로 분석."
tags: [perf, Sampling, Profile]
series: "perf / FlameGraph"
seriesOrder: 3
draft: true
---

## 예정 내용
- perf record -F 99 ./prog
- -g (콜그래프) — fp / dwarf / lbr
- perf.data 파일
- perf report — 인터랙티브
- TUI 단축키 — Enter, A, +, -
- 자식 묶기 (--children)
- 비대화 — --stdio
