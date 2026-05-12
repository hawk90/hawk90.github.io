---
title: "Chapter 3: Sharing data between threads"
date: 2026-05-20T03:00:00
description: "race condition, std::mutex, lock guard, deadlock 회피, std::shared_mutex."
tags: [C++, Concurrency, Mutex, Race Condition, Deadlock]
series: "C++ Concurrency in Action"
seriesOrder: 3
draft: true
---

## 작성 중

### 예정 내용
- race condition의 본질
- std::mutex + std::lock_guard / std::unique_lock / std::scoped_lock
- deadlock — 4 조건 / 회피 전략
- 락 순서 (std::lock, hierarchical mutex)
- std::shared_mutex — reader-writer (C++14/17)
- std::once_flag / std::call_once
- 락 입자(granularity) 결정
