---
title: "Chapter 6: Designing lock-based concurrent data structures"
date: 2026-05-20T06:00:00
description: "thread-safe stack/queue/map 설계. 락 입자, 예외 안전, 인터페이스 vs 구현."
tags: [C++, Concurrency, Data Structures, Mutex]
series: "C++ Concurrency in Action"
seriesOrder: 6
draft: true
---

## 작성 중

### 예정 내용
- thread-safe 인터페이스 — top()+pop() 문제
- thread-safe stack 설계
- thread-safe queue — 락 + condition_variable
- fine-grained 락 queue — 노드별 락
- thread-safe lookup table — bucket-level 락
- thread-safe linked list
- 예외 안전성 + thread safety
