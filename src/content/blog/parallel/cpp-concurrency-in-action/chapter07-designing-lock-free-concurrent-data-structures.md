---
title: "Chapter 7: Designing lock-free concurrent data structures"
date: 2026-05-20T07:00:00
description: "lock-free / wait-free 정의, compare-and-swap, ABA 문제, hazard pointer."
tags: [C++, Concurrency, Lock-free, Atomic, CAS]
series: "C++ Concurrency in Action"
seriesOrder: 7
draft: true
---

## 작성 중

### 예정 내용
- lock-free vs wait-free 정의
- 왜 lock-free? — 진행 보장, 우선순위 역전 회피
- compare_exchange 패턴
- ABA 문제 — counter / tag
- lock-free stack 구현 (점진적 진화)
- 메모리 해제 — reference counting / hazard pointer
- lock-free queue (Michael-Scott)
- 가이드라인 — 언제 lock-free?
