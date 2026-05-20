---
title: "Ch 6: The Implementation Mechanisms Design Space"
date: 2026-05-21T19:00:00
description: "구현 메커니즘 패턴 — Thread, Process, Synchronization, Communication"
series: "Patterns for Parallel Programming"
seriesOrder: 6
tags: [parallel, patterns, threads, synchronization, MPI, OpenMP]
draft: true
type: book-review
bookTitle: "Patterns for Parallel Programming"
bookAuthor: "Timothy G. Mattson, Beverly A. Sanders, Berna L. Massingill"
---

## 이 장에서 다루는 것

**저수준 구현 메커니즘**

### UE (Unit of Execution) 관리
- **Thread Creation/Destruction**
- **Process Management**

### 동기화 메커니즘
- **Mutual Exclusion** — 뮤텍스, 락
- **Barrier** — 집합점 동기화
- **Fence** — 메모리 펜스

### 통신 메커니즘
- **Message Passing** — MPI Send/Recv
- **Collective Communication** — Broadcast, Reduce

### 플랫폼별 구현
- Pthreads
- OpenMP
- MPI

---

## 정리

(작성 예정)

## 관련 항목

- [Ch 1: Pattern Language](/blog/parallel/patterns-for-parallel-programming/chapter01-pattern-language)
- [Introduction to Parallel Computing 시리즈](/blog/parallel/intro-to-parallel-computing/chapter01-introduction)
- [Structured Parallel Programming 시리즈](/blog/parallel/structured-parallel-programming/chapter01-introduction)
