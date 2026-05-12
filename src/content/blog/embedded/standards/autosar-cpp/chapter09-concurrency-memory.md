---
title: "Ch 9: 동시성 / 메모리 (A21-A25)"
date: 2026-09-17T03:00:00
description: "std::thread, std::atomic, std::mutex. 메모리 순서. lock-free 제한."
tags: [AUTOSAR, Concurrency, Memory Model]
series: "AUTOSAR C++14"
seriesOrder: 9
draft: true
---

## 예정 내용
- A21.* — std::thread 인자 — 참조 / 소유
- A22.* — 함수 객체 / 람다 capture 명확
- A23.* — std::atomic — memory_order_seq_cst 권장
- A24.* — race condition 회피 패턴
- A25.* — 동적 메모리 — POSIX malloc / placement new
- lock-free — 분석 어려움 → 안전중요에선 제한
