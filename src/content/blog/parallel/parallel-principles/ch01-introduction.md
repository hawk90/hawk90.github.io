---
title: "Chapter 1: Introduction"
date: 2026-05-12
description: "멀티프로세서 프로그래밍이 왜 필요한가. 공유 메모리와 메시지 전달. 병렬 프로그래밍의 어려움."
series: "The Art of Multiprocessor Programming"
seriesOrder: 1
tags: [parallel, concurrency, book-review, amp, introduction]
type: book-review
bookTitle: "The Art of Multiprocessor Programming"
bookAuthor: "Maurice Herlihy, Nir Shavit"
draft: true
---

> **The Art of Multiprocessor Programming** Chapter 1 요약

## 1.1 공유 객체와 동기화

### 왜 멀티프로세서인가?

**Moore's Law의 종말**

```
1970s-2000s: 클럭 속도 ↑ → 단일 스레드 성능 ↑
2005~: 클럭 속도 정체 (발열 한계)
2005~: 코어 수 ↑ → 병렬 처리 필수
```

단일 스레드 성능 향상이 멈췄다. 성능을 높이려면 **여러 코어**를 활용해야 한다.

### 공유 메모리 vs 메시지 전달

**공유 메모리 (Shared Memory)**

```
┌────────┐ ┌────────┐ ┌────────┐
│ Core 1 │ │ Core 2 │ │ Core 3 │
└───┬────┘ └───┬────┘ └───┬────┘
    │          │          │
    ▼          ▼          ▼
┌─────────────────────────────┐
│       Shared Memory         │
└─────────────────────────────┘
```

- 모든 프로세서가 **같은 메모리**에 접근
- 통신: 메모리 읽기/쓰기
- 동기화: 락, 원자적 연산

**메시지 전달 (Message Passing)**

```
┌────────┐     ┌────────┐     ┌────────┐
│ Node 1 │◄───►│ Node 2 │◄───►│ Node 3 │
│ Memory │     │ Memory │     │ Memory │
└────────┘     └────────┘     └────────┘
```

- 각 프로세서가 **독립된 메모리**
- 통신: 명시적 메시지 송수신
- 동기화: 메시지 순서

**이 책의 초점**: 공유 메모리 멀티프로세서

---

## 1.2 병렬 프로그래밍의 도전

### 도전 1: 상호 배제 (Mutual Exclusion)

```java
// 위험: 두 스레드가 동시에 counter 수정
counter = counter + 1;
```

해결: 한 번에 하나의 스레드만 접근 허용

### 도전 2: 조건 동기화 (Condition Synchronization)

```java
// 위험: 아이템이 없는데 consume
while (buffer.isEmpty()) {
    // busy wait? sleep? signal?
}
consume(buffer.remove());
```

해결: 조건이 만족될 때까지 대기

### 도전 3: 지연과 실패 (Latency and Failure)

```
스레드 A가 락을 잡고 멈추면?
- 다른 스레드들은 영원히 대기?
- 데드락, 라이브락
```

해결: 락-프리 알고리즘, 타임아웃

---

## 1.3 병렬 프로그래밍의 예술

### 정확성 vs 성능의 트레이드오프

| 접근 | 정확성 | 성능 | 복잡도 |
|-----|--------|------|--------|
| 거친 락 (Coarse) | 쉬움 | 낮음 | 낮음 |
| 세밀한 락 (Fine) | 어려움 | 높음 | 높음 |
| 락-프리 (Lock-free) | 매우 어려움 | 가장 높음 | 매우 높음 |

### 추상화 레벨

```
High   ─┬─ Transactional Memory
Level   │  Concurrent Collections
        │  Locks and Conditions
        │  Atomic Operations
Low    ─┴─ Memory Model
Level
```

**위로 갈수록**: 사용하기 쉬움, 성능 손실 가능
**아래로 갈수록**: 성능 좋음, 버그 위험

---

## 1.4 이 책의 구조

### Part I: Principles (원리)

| Chapter | 내용 |
|---------|------|
| Ch 2 | Mutual Exclusion: 상호 배제의 이론 |
| Ch 3 | Concurrent Objects: 정확성 정의 (Linearizability) |
| Ch 4 | Shared Memory: 레지스터와 원자적 스냅샷 |

### Part II: Practice (실전)

| Chapter | 내용 |
|---------|------|
| Ch 5-6 | 동기화 프리미티브의 힘과 한계 |
| Ch 7-8 | 스핀락, 모니터, 블로킹 동기화 |
| Ch 9-15 | 동시성 자료구조 (리스트, 큐, 스택, 해시, ...) |
| Ch 16-17 | 스케줄링, 배리어 |
| Ch 18 | 트랜잭셔널 메모리 |

---

## 1.5 실습: Amdahl의 법칙

### 병렬화의 한계

프로그램의 일부만 병렬화 가능:

$$
\text{Speedup} = \frac{1}{(1-p) + \frac{p}{n}}
$$

- **p**: 병렬화 가능 비율
- **n**: 프로세서 수

### 예시

```
90% 병렬화 가능, 10코어:
Speedup = 1 / (0.1 + 0.9/10) = 1 / 0.19 ≈ 5.3x

90% 병렬화 가능, 100코어:
Speedup = 1 / (0.1 + 0.9/100) = 1 / 0.109 ≈ 9.2x

90% 병렬화 가능, ∞ 코어:
Speedup = 1 / 0.1 = 10x (최대)
```

**결론**: 순차 부분이 전체를 지배한다.

---

## 핵심 개념

| 개념 | 정의 |
|-----|------|
| **Shared Memory** | 여러 프로세서가 공유하는 메모리 |
| **Mutual Exclusion** | 한 번에 하나만 임계 영역 진입 |
| **Linearizability** | 동시 실행이 순차 실행처럼 보임 |
| **Lock-free** | 일부가 멈춰도 시스템은 진행 |
| **Wait-free** | 모든 스레드가 유한 시간 내 완료 |

---

## 생각해볼 질문

1. 왜 클럭 속도를 계속 올릴 수 없는가?
2. 공유 메모리와 메시지 전달 중 어떤 게 더 쉬운가?
3. 락-프리가 항상 빠른가?
4. Amdahl의 법칙이 비관적인 이유는?

---

다음 글: [Chapter 2: Mutual Exclusion](/blog/parallel/parallel-principles/ch02-mutual-exclusion)
