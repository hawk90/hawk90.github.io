---
title: "Chapter 8: Designing concurrent code"
date: 2026-05-20T08:00:00
description: "작업 분할 — 데이터 vs 작업 병렬, false sharing, 작업 단위 결정."
tags: [C++, Concurrency, Design, Parallelism, False Sharing]
series: "C++ Concurrency in Action"
seriesOrder: 8
draft: true
---

## 작성 중

### 예정 내용
- 작업 분할 — 데이터 병렬 vs 작업 병렬
- 데이터 의존성 분석
- 동시 코드 성능 — Amdahl, Gustafson
- false sharing — cache line 충돌
- data layout — AoS vs SoA
- contention 회피
- 동시 알고리즘 예 — parallel for_each, find, partial_sum
- 예외 안전성 — 동시 코드에서
