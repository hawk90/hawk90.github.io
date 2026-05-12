---
title: "Parallel Programming Principles: 서문"
date: 2026-05-12
description: "플랫폼 독립적인 병렬 프로그래밍의 원리. 동기화, 메모리 모델, lock-free 알고리즘, 병렬 패턴까지. 어떤 환경에서든 적용 가능한 원칙."
series: "Parallel Programming Principles"
seriesOrder: 0
tags: [parallel, concurrency, synchronization, lock-free, memory-model, patterns]
type: tech
featured: true
---

## 이 시리즈를 쓰는 이유

"병렬 프로그래밍은 어렵다."

맞습니다. 하지만 **왜** 어려운지 이해하면 접근 방식이 달라집니다.

병렬 프로그래밍이 어려운 이유:

- **비결정적 실행**: 같은 코드가 매번 다르게 동작할 수 있다
- **보이지 않는 버그**: 테스트에서 통과하고 프로덕션에서 터진다
- **인간의 직관과 반대**: 순차적 사고에 익숙한 우리에게 어색하다
- **하드웨어의 복잡성**: 캐시, 메모리 재배치, 코어간 통신

이 시리즈는 **왜 그런지**를 설명합니다. 플랫폼이나 언어가 아니라 **원리**에 집중합니다.

## 왜 플랫폼 독립적인가

CUDA, OpenCL, MPI, OpenMP... 도구는 많습니다. 하지만:

1. **도구는 바뀐다**: 10년 전의 CUDA 코드는 오늘 다르게 작성한다
2. **원리는 남는다**: 동기화, 메모리 모델, 병렬 패턴은 50년 된 개념이다
3. **이해 없이 사용하면 위험**: 도구 사용법만 알면 미묘한 버그를 만든다

이 시리즈를 읽으면:

- CUDA를 배울 때 **왜** 그렇게 설계됐는지 이해한다
- pthread와 std::thread의 **차이와 공통점**을 안다
- 새로운 병렬 도구가 나와도 **빠르게 적응**한다

## 대상 독자

1. **동시성 버그로 고생한 적 있는 분**
   - 데드락, 레이스 컨디션, 하이젠버그
   - "로컬에서는 됐는데..."

2. **lock-free를 들어봤지만 정확히 모르는 분**
   - CAS, ABA 문제, 메모리 오더링
   - "왜 volatile이 안 되는 거지?"

3. **병렬 라이브러리를 사용하지만 원리가 궁금한 분**
   - TBB, OpenMP, std::execution
   - "이게 왜 빠른 거지?"

4. **면접에서 동시성 질문이 두려운 분**
   - "스핀락과 뮤텍스의 차이는?"
   - "lock-free가 항상 빠른가요?"

## 핵심 참고 서적

이 시리즈는 다음 책들을 기반으로 합니다:

| 서적 | 저자 | 핵심 내용 |
|-----|-----|----------|
| **The Art of Multiprocessor Programming** | Herlihy & Shavit | 동기화 이론, lock-free 알고리즘 |
| **Structured Parallel Programming** | McCool, Reinders, Robison | 병렬 패턴, 알고리즘 설계 |
| **Patterns for Parallel Programming** | Mattson, Sanders, Massingill | 패턴 언어, 설계 공간 |
| **C++ Concurrency in Action** | Anthony Williams | C++ 메모리 모델, 실전 구현 |
| **Seven Concurrency Models** | Paul Butcher | 다양한 동시성 모델 비교 |
| **The Art of Concurrency** | Clay Breshears | 실전 디버깅, 성능 분석 |

## 시리즈 구성

**총 4개 Part, 40개 글**로 구성됩니다.

원리와 이론부터 패턴과 성능 분석까지 체계적으로 다룹니다.

---

### Part 1: Fundamentals (10개)

병렬 프로그래밍의 기초 개념을 다룹니다.

| # | 글 제목 | 핵심 내용 |
|---|--------|----------|
| 1-01 | 병렬성 vs 동시성 | Parallelism vs Concurrency |
| 1-02 | Amdahl의 법칙과 한계 | 병렬화의 이론적 한계 |
| 1-03 | Gustafson의 법칙 | 문제 크기와 스케일링 |
| 1-04 | 데이터 병렬성 vs 태스크 병렬성 | 두 가지 병렬화 접근법 |
| 1-05 | 의존성 분석 | Data, control, resource 의존성 |
| 1-06 | 작업 분해 전략 | Decomposition strategies |
| 1-07 | 공유 메모리 vs 분산 메모리 | 메모리 모델 비교 |
| 1-08 | 스레드 vs 프로세스 | 실행 단위 비교 |
| 1-09 | 스케일링: Strong vs Weak | 확장성 측정 |
| 1-10 | 효율성과 스피드업 | 성능 지표 정의 |

---

### Part 2: Synchronization & Correctness (12개)

**The Art of Multiprocessor Programming** 기반 동기화 이론을 다룹니다.

| # | 글 제목 | 핵심 내용 | 참고 |
|---|--------|----------|------|
| 2-01 | 상호 배제 문제 | Mutual Exclusion Problem | AMP Ch.2 |
| 2-02 | Peterson의 알고리즘 | 2-스레드 상호 배제 | AMP Ch.2 |
| 2-03 | Bakery 알고리즘 | N-스레드 상호 배제 | AMP Ch.2 |
| 2-04 | 원자적 연산 | Atomic Operations, RMW | AMP Ch.5 |
| 2-05 | Compare-and-Swap (CAS) | CAS 의미론과 사용법 | AMP Ch.5 |
| 2-06 | 메모리 모델 기초 | Sequential Consistency, TSO | AMP Ch.3 |
| 2-07 | Acquire-Release 의미론 | 메모리 순서 보장 | AMP Ch.3 |
| 2-08 | 스핀락 구현 | TAS, TTAS, Backoff | AMP Ch.7 |
| 2-09 | 대기열 기반 락 | MCS, CLH 락 | AMP Ch.7 |
| 2-10 | 데드락과 라이브락 | 원인, 탐지, 회피 | AMP Ch.8 |
| 2-11 | Lock-free 알고리즘 기초 | 진행 보장 | AMP Ch.9 |
| 2-12 | Wait-free vs Lock-free | 진행성 계층 | AMP Ch.9 |

---

### Part 3: Parallel Patterns (12개)

**Structured Parallel Programming** 기반 병렬 패턴을 다룹니다.

| # | 글 제목 | 핵심 내용 | 참고 |
|---|--------|----------|------|
| 3-01 | Map 패턴 | 독립적 데이터 변환 | SPP Ch.4 |
| 3-02 | Reduce 패턴 | 결합 연산 | SPP Ch.5 |
| 3-03 | Scan (Prefix Sum) 패턴 | 누적 연산 | SPP Ch.6 |
| 3-04 | Fork-Join 패턴 | 재귀적 병렬화 | SPP Ch.8 |
| 3-05 | Divide and Conquer | 분할 정복 | SPP Ch.8 |
| 3-06 | Pipeline 패턴 | 단계별 처리 | SPP Ch.9 |
| 3-07 | Producer-Consumer | 비동기 통신 | PfPP Ch.4 |
| 3-08 | Work Stealing | 동적 부하 분산 | SPP Ch.10 |
| 3-09 | Stencil 패턴 | 이웃 접근 패턴 | SPP Ch.7 |
| 3-10 | Partition 패턴 | 데이터 분할 | SPP Ch.4 |
| 3-11 | 패턴 조합과 중첩 | Nesting and Composition | SPP Ch.11 |
| 3-12 | 패턴 선택 가이드 | Decision Framework | PfPP Ch.5 |

---

### Part 4: Performance Analysis (6개)

병렬 성능 분석과 최적화를 다룹니다.

| # | 글 제목 | 핵심 내용 |
|---|--------|----------|
| 4-01 | 병렬 성능 측정 | 측정 방법론, 통계 |
| 4-02 | 스케일링 분석 | Strong/Weak scaling |
| 4-03 | 로드 밸런싱 | 부하 불균형 진단 |
| 4-04 | False Sharing과 캐시 효과 | 캐시라인 충돌 |
| 4-05 | 통신 오버헤드 | 동기화 비용 |
| 4-06 | 병렬 벤치마킹 방법론 | 재현성, 노이즈 |

---

## 학습 로드맵

### 동시성 기초 학습

```
Part 1 (기초) → Part 2-01~05 (상호배제, CAS)
```

### Lock-free 알고리즘 학습

```
Part 2-04~07 (원자적 연산, 메모리 모델) → Part 2-11~12 (lock-free)
```

### 병렬 패턴 학습

```
Part 1 (기초) → Part 3 (패턴) → Part 4 (성능)
```

### 면접 준비

```
Part 1-01~03 → Part 2-01~05, 08, 10~12 → Part 4-04
```

---

## 핵심 원칙

### 1. 플랫폼 독립적 원리에 집중한다

- CUDA, OpenCL 없이 원리만 다룬다
- C++ std::atomic, std::thread 수준의 예제
- 어떤 플랫폼에서든 적용 가능한 개념

### 2. 정확성이 먼저다

- "빠른 코드"보다 "맞는 코드"가 먼저
- 동기화 없이 최적화하지 않는다
- 진행 보장(progress guarantee)을 이해한다

### 3. 측정 없이 최적화하지 않는다

- "lock-free가 항상 빠르다"는 신화
- 실제 워크로드에서 측정한다
- 병목 지점을 찾고 해결한다

### 4. 단순함을 추구한다

- 복잡한 lock-free보다 단순한 락이 나을 수 있다
- 코드 리뷰 가능한 수준을 유지한다
- 정확성 증명이 가능한 설계

---

## 대상 환경

이 시리즈의 예제는 다음 환경을 기준으로 합니다:

| 항목 | 기준 |
|-----|------|
| 언어 | C++17/20 |
| 메모리 모델 | C++11 Memory Model |
| 컴파일러 | GCC 11+, Clang 14+ |
| 아키텍처 | x86-64, ARM64 |
| 표준 라이브러리 | std::atomic, std::thread, std::mutex |

**플랫폼별 확장 (이 시리즈에서 다루지 않음):**
- CUDA: GPU 병렬 프로그래밍
- OpenCL: 이기종 컴퓨팅
- MPI: 분산 메모리 프로그래밍
- OpenMP: 공유 메모리 병렬화

---

## 사전 지식

- C++ 프로그래밍 (포인터, 클래스)
- 운영체제 기초 (프로세스, 스레드)
- 컴퓨터 구조 기초 (캐시, 메모리)
- 자료구조 기초 (리스트, 큐, 스택)

---

## 레퍼런스

**핵심 서적**
- *The Art of Multiprocessor Programming* (2nd ed) - Herlihy, Shavit, Luchangco
- *Structured Parallel Programming* - McCool, Reinders, Robison
- *Patterns for Parallel Programming* - Mattson, Sanders, Massingill

**동시성 실전**
- *C++ Concurrency in Action* (2nd ed) - Anthony Williams
- *Seven Concurrency Models in Seven Weeks* - Paul Butcher
- *The Art of Concurrency* - Clay Breshears

**온라인**
- [Herb Sutter's "atomic Weapons"](https://herbsutter.com/2013/02/11/atomic-weapons-the-c-memory-model-and-modern-hardware/)
- [Preshing on Programming](https://preshing.com/)
- [cppreference - Memory Model](https://en.cppreference.com/w/cpp/atomic/memory_order)

---

## 이 시리즈의 목표

이 시리즈를 완주하면:

- **왜** 동시성 버그가 발생하는지 **이해**한다
- **언제** 락을 쓰고 **언제** lock-free를 쓸지 **판단**한다
- **어떤** 병렬 패턴이 문제에 적합한지 **선택**한다
- **메모리 모델**을 이해하고 **올바른 코드**를 작성한다
- 새로운 병렬 도구를 **빠르게 학습**할 기반을 갖춘다

---

다음 글: [Part 1-01: 병렬성 vs 동시성](/blog/parallel/parallel-principles/part1-01-parallelism-vs-concurrency)
