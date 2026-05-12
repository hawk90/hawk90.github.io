---
title: "The Art of Multiprocessor Programming: 서문"
date: 2026-05-12
description: "멀티프로세서 프로그래밍의 바이블. Herlihy & Shavit의 AMP 북리뷰. 동기화 원리부터 lock-free 자료구조까지."
series: "The Art of Multiprocessor Programming"
seriesOrder: 0
tags: [parallel, concurrency, book-review, amp, herlihy, shavit]
type: book-review
bookTitle: "The Art of Multiprocessor Programming"
bookAuthor: "Maurice Herlihy, Nir Shavit, Victor Luchangco, Michael Spear"
featured: true
---

## 이 책에 대하여

**The Art of Multiprocessor Programming** (2nd Edition, 2020)

- **저자**: Maurice Herlihy, Nir Shavit, Victor Luchangco, Michael Spear
- **출판**: Morgan Kaufmann
- **분량**: 576 pages

멀티프로세서 프로그래밍의 **바이블**로 불리는 책이다.

## 왜 이 책인가

1. **이론과 실전의 균형**: 수학적 증명 + 실제 구현
2. **Lock-free의 정수**: 대부분의 lock-free 알고리즘 출처
3. **저자의 권위**: Herlihy는 Linearizability 창시자, Turing Award 수상자
4. **업계 표준**: 동시성 면접의 출처

## 대상 독자

- 동시성 버그로 고생한 개발자
- Lock-free 알고리즘을 이해하고 싶은 분
- 시스템 프로그래밍 면접 준비
- 컴퓨터 과학 대학원생

## 사전 지식

- 자료구조 (리스트, 큐, 스택, 해시)
- Java 또는 C++ 기초
- 운영체제 기초 (스레드, 프로세스)

---

## 책 구조

### Part I: Principles (원리)

이론적 기초. 동시성의 수학적 토대.

| Ch | 제목 | 핵심 내용 |
|----|-----|----------|
| 1 | Introduction | 멀티프로세서의 필요성, 병렬성 개요 |
| 2 | Mutual Exclusion | Peterson, Bakery, 상호배제 불가능성 |
| 3 | Concurrent Objects | Linearizability, Sequential Consistency |
| 4 | Foundations of Shared Memory | Register, Atomic Snapshot |

### Part II: Practice (실전)

실제 동기화 프리미티브와 자료구조.

| Ch | 제목 | 핵심 내용 |
|----|-----|----------|
| 5 | Relative Power of Primitives | Consensus Number, CAS의 힘 |
| 6 | Universality of Consensus | Universal Construction |
| 7 | Spin Locks and Contention | TAS, TTAS, MCS, CLH |
| 8 | Monitors and Blocking | Condition Variables, Semaphores |
| 9 | Linked Lists | Coarse, Fine, Optimistic, Lazy, Lock-free |
| 10 | Concurrent Queues | Bounded, Unbounded, Lock-free, ABA |
| 11 | Concurrent Stacks | Elimination Backoff Stack |
| 12 | Counting, Sorting, Coordination | Combining Trees, Bitonic Sort |
| 13 | Concurrent Hashing | Open/Closed Addressing, Lock-free |
| 14 | Skiplists and Balanced Search | Lock-free Skiplist |
| 15 | Priority Queues | Heap-based, Skiplist-based |
| 16 | Futures, Scheduling, Work Distribution | Work Stealing |
| 17 | Barriers | Sense-reversing, Combining Tree |
| 18 | Transactional Memory | STM, HTM |

---

## 시리즈 구성

**총 18개 챕터**를 순서대로 정리합니다.

각 챕터는 다음 구조로 작성:

1. **핵심 개념**: 챕터의 주요 아이디어
2. **알고리즘/자료구조**: 의사코드 + 설명
3. **정확성 증명**: 왜 동작하는가
4. **성능 분석**: 시간/공간 복잡도
5. **실전 고려사항**: 구현 시 주의점
6. **연습 문제**: 책의 문제 + 추가 문제

---

## Part I: Principles

| # | 글 제목 | 상태 |
|---|--------|------|
| Ch1 | [Introduction](/blog/parallel/parallel-principles/ch01-introduction) | |
| Ch2 | [Mutual Exclusion](/blog/parallel/parallel-principles/ch02-mutual-exclusion) | |
| Ch3 | [Concurrent Objects](/blog/parallel/parallel-principles/ch03-concurrent-objects) | |
| Ch4 | [Foundations of Shared Memory](/blog/parallel/parallel-principles/ch04-shared-memory) | |

## Part II: Practice

| # | 글 제목 | 상태 |
|---|--------|------|
| Ch5 | [Relative Power of Primitives](/blog/parallel/parallel-principles/ch05-primitives-power) | |
| Ch6 | [Universality of Consensus](/blog/parallel/parallel-principles/ch06-consensus) | |
| Ch7 | [Spin Locks and Contention](/blog/parallel/parallel-principles/ch07-spin-locks) | |
| Ch8 | [Monitors and Blocking](/blog/parallel/parallel-principles/ch08-monitors) | |
| Ch9 | [Linked Lists](/blog/parallel/parallel-principles/ch09-linked-lists) | |
| Ch10 | [Concurrent Queues](/blog/parallel/parallel-principles/ch10-queues) | |
| Ch11 | [Concurrent Stacks](/blog/parallel/parallel-principles/ch11-stacks) | |
| Ch12 | [Counting, Sorting, Coordination](/blog/parallel/parallel-principles/ch12-counting) | |
| Ch13 | [Concurrent Hashing](/blog/parallel/parallel-principles/ch13-hashing) | |
| Ch14 | [Skiplists and Balanced Search](/blog/parallel/parallel-principles/ch14-skiplists) | |
| Ch15 | [Priority Queues](/blog/parallel/parallel-principles/ch15-priority-queues) | |
| Ch16 | [Futures, Scheduling, Work Distribution](/blog/parallel/parallel-principles/ch16-scheduling) | |
| Ch17 | [Barriers](/blog/parallel/parallel-principles/ch17-barriers) | |
| Ch18 | [Transactional Memory](/blog/parallel/parallel-principles/ch18-stm) | |

---

## 학습 가이드

### 필수 코스 (핵심만)

```
Ch1 → Ch2 → Ch3 → Ch7 → Ch9
```

Introduction → Mutual Exclusion → Linearizability → Spin Locks → Linked Lists

### 전체 코스

```
Part I (Ch1-4) → Part II (Ch5-18)
```

### Lock-free 집중

```
Ch3 → Ch5 → Ch6 → Ch9 → Ch10 → Ch11
```

Linearizability → Consensus → Universal → Lock-free Lists/Queues/Stacks

---

## 책의 코드

원서 코드는 **Java**로 작성되어 있다.

이 시리즈에서는:
- **Java**: 원서 그대로 (일부)
- **C++**: std::atomic 기반 변환 (대부분)
- **의사코드**: 언어 독립적 설명

---

## 레퍼런스

**공식 자료**
- [책 공식 사이트](https://www.cs.tau.ac.il/~shanir/art-prac-concurrent/)
- [저자 Maurice Herlihy](https://cs.brown.edu/~mph/)
- [저자 Nir Shavit](https://people.csail.mit.edu/shanir/)

**보조 자료**
- MIT OCW 6.816: Multicore Programming
- Brown CS 176: Multiprocessor Programming

---

다음 글: [Chapter 1: Introduction](/blog/parallel/parallel-principles/ch01-introduction)
