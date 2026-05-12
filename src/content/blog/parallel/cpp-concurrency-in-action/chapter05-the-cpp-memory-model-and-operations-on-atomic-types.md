---
title: "Chapter 5: The C++ memory model and operations on atomic types"
date: 2026-05-20T05:00:00
description: "memory order — relaxed / acquire / release / seq_cst. std::atomic, fence, happens-before."
tags: [C++, Concurrency, Memory Model, Atomic, Memory Order]
series: "C++ Concurrency in Action"
seriesOrder: 5
draft: true
---

## 작성 중

### 예정 내용
- C++ 메모리 모델 — 관찰 가능 동작 정의
- modification order, happens-before
- std::atomic<T> — load / store / RMW
- memory_order_relaxed / acquire / release / acq_rel / seq_cst
- std::atomic_flag — 가장 단순한 atomic
- std::atomic<bool>, std::atomic<T*>, std::atomic<integral>
- compare_exchange_weak / strong
- fence (std::atomic_thread_fence)
- cache 일관성과의 관계
