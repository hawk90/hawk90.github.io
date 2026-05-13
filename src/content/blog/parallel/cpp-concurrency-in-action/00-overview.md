---
title: "C++ Concurrency in Action — 시리즈 개요"
date: 2026-05-20T00:00:00
description: "Anthony Williams의 C++ 동시성 정전. std::thread부터 lock-free 자료구조까지."
tags: [C++, Concurrency, Multithreading, Series]
series: "C++ Concurrency in Action"
seriesOrder: 0
---

Anthony Williams의 **C++ Concurrency in Action** 2nd Edition (2019, Manning)을 정리한 시리즈다. C++11에서 도입된 표준 스레드 라이브러리부터 C++17 병렬 알고리즘, C++20 동기화 프리미티브까지 다룬다.

## 왜 이 책인가

| 특징 | 설명 |
|------|------|
| **정통** | C++ 표준 위원회 멤버가 직접 집필 |
| **실전** | 이론보다 실용적 코드 중심 |
| **최신** | C++17/20 기능 반영 |
| **깊이** | 메모리 모델부터 lock-free까지 |

## 시리즈 구성

### Part 1: 기초 (Ch 1-4)

| 장 | 주제 | 핵심 내용 |
|----|------|-----------|
| **Ch 1** | Hello, concurrent world! | 동시성 개념, std::thread 소개 |
| **Ch 2** | Managing threads | 스레드 생성, 소유권, 인자 전달 |
| **Ch 3** | Sharing data | 뮤텍스, 데드락, reader-writer |
| **Ch 4** | Synchronizing operations | condition_variable, future, promise |

### Part 2: 심화 (Ch 5-7)

| 장 | 주제 | 핵심 내용 |
|----|------|-----------|
| **Ch 5** | Memory model & atomics | happens-before, memory_order, atomic |
| **Ch 6** | Lock-based data structures | 스레드 안전 스택, 큐, 맵 |
| **Ch 7** | Lock-free data structures | CAS, ABA 문제, hazard pointer |

### Part 3: 설계와 실전 (Ch 8-11)

| 장 | 주제 | 핵심 내용 |
|----|------|-----------|
| **Ch 8** | Designing concurrent code | Amdahl 법칙, false sharing, 병렬 알고리즘 |
| **Ch 9** | Advanced thread management | 스레드 풀, work stealing, stop_token |
| **Ch 10** | Parallel algorithms | 실행 정책, reduce, transform_reduce |
| **Ch 11** | Testing and debugging | 동시성 버그, TSan, Helgrind |

## 학습 경로

```
                    ┌─────────────────┐
                    │   Ch 1: 입문     │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
        ┌─────────┐    ┌─────────┐    ┌─────────┐
        │ Ch 2    │    │ Ch 3    │    │ Ch 4    │
        │ 스레드   │    │ 공유 데이터│   │ 동기화   │
        └────┬────┘    └────┬────┘    └────┬────┘
             │              │              │
             └──────────────┼──────────────┘
                            ▼
                    ┌─────────────────┐
                    │   Ch 5: 메모리   │
                    │   모델 (핵심)    │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
        ┌─────────┐    ┌─────────┐    ┌─────────┐
        │ Ch 6    │    │ Ch 7    │    │ Ch 8    │
        │ Lock기반 │    │Lock-free│    │ 설계    │
        └─────────┘    └─────────┘    └────┬────┘
                                           │
              ┌────────────────────────────┼────────────────────────────┐
              ▼                            ▼                            ▼
        ┌─────────┐                  ┌─────────┐                  ┌─────────┐
        │ Ch 9    │                  │ Ch 10   │                  │ Ch 11   │
        │ 스레드 풀│                  │ 병렬 STL │                  │테스트/디버깅│
        └─────────┘                  └─────────┘                  └─────────┘
```

**추천 순서:**
1. **필수**: Ch 1 → Ch 2 → Ch 3 → Ch 4 → Ch 5
2. **자료구조**: Ch 6 → Ch 7
3. **실전**: Ch 8 → Ch 9 → Ch 10 → Ch 11

## 핵심 개념 미리보기

### 동시성 vs 병렬성

```cpp
// 동시성 (Concurrency): 여러 작업이 논리적으로 동시에 진행
// - 싱글 코어에서도 가능 (시분할)
// - 구조적 관점

// 병렬성 (Parallelism): 여러 작업이 물리적으로 동시에 실행
// - 멀티 코어 필요
// - 성능적 관점

std::thread t1(task_a);  // 동시성
std::thread t2(task_b);  // 병렬성 (코어가 있다면)
```

### C++ 동시성 진화

| 표준 | 주요 기능 |
|------|-----------|
| **C++11** | thread, mutex, condition_variable, atomic, future |
| **C++14** | shared_timed_mutex |
| **C++17** | shared_mutex, 병렬 알고리즘, scoped_lock |
| **C++20** | jthread, stop_token, latch, barrier, semaphore |
| **C++23** | 더 많은 병렬 알고리즘 |

### 동시성의 세 가지 축

```
        데이터 공유
            │
            │   mutex, atomic
            │   lock-free
            ▼
    ┌───────────────┐
    │               │
    │   동시성 코드  │
    │               │
    └───────────────┘
   ╱                 ╲
  ╱                   ╲
 ▼                     ▼
스레드 관리            동기화
thread, jthread       condition_variable
thread_pool           future, promise
                      latch, barrier
```

## 환경 설정

### 컴파일러 요구사항

```bash
# GCC 10+ (C++20 지원)
g++ -std=c++20 -pthread -O2 main.cpp

# Clang 11+
clang++ -std=c++20 -pthread -O2 main.cpp

# MSVC 19.29+ (VS 2019 16.10+)
cl /std:c++20 /EHsc main.cpp
```

### 디버깅 도구

```bash
# ThreadSanitizer (권장)
g++ -std=c++20 -fsanitize=thread -g main.cpp
./a.out

# Helgrind
valgrind --tool=helgrind ./a.out
```

## 주의사항

1. **메모리 순서**: `memory_order_relaxed`는 신중하게
2. **데드락**: 락 순서 일관성 유지
3. **성능 측정**: 항상 프로파일 후 최적화
4. **테스트**: TSan은 필수, 수동 테스트는 불충분

## 참고 자료

- [cppreference - Thread support](https://en.cppreference.com/w/cpp/thread)
- [C++ Core Guidelines - Concurrency](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#cp-concurrency-and-parallelism)
- Anthony Williams, *C++ Concurrency in Action*, 2nd Ed. (Manning, 2019)
