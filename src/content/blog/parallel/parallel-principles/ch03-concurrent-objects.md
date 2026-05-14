---
title: "Chapter 3: Concurrent Objects"
date: 2026-05-12
description: "동시성 객체의 정확성 정의. Sequential Consistency와 Linearizability. 진행 조건: wait-free, lock-free."
series: "The Art of Multiprocessor Programming"
seriesOrder: 3
tags: [parallel, concurrency, book-review, amp, linearizability, sequential-consistency, C++, C]
type: book-review
bookTitle: "The Art of Multiprocessor Programming"
bookAuthor: "Maurice Herlihy, Nir Shavit"
draft: false
---

> **The Art of Multiprocessor Programming** Chapter 3 요약
>
> 이 시리즈는 C++20/23과 C11을 사용하여 최신 문법으로 재구성했다.

## 3.1 동시성과 정확성

### 핵심 질문

> 동시 실행되는 객체가 **"올바르게"** 동작한다는 것은 무엇인가?

순차 프로그램: 명세대로 동작하면 정확
동시 프로그램: 정확성 정의 자체가 복잡

### 순차 명세 (Sequential Specification)

```cpp
// C++20: 큐의 순차 명세
template <typename T>
class Queue {
public:
    void enqueue(T item);   // 아이템 추가
    T dequeue();            // 아이템 제거, 반환
};

// 조건: FIFO 순서 유지
// dequeue는 가장 먼저 enqueue된 아이템 반환
```

```c
// C11: 큐의 순차 명세
typedef struct Queue Queue;

void queue_enqueue(Queue* q, void* item);  // 아이템 추가
void* queue_dequeue(Queue* q);             // 아이템 제거, 반환

// 조건: FIFO 순서 유지
// dequeue는 가장 먼저 enqueue된 아이템 반환
```

동시 실행에서 이 명세를 **어떻게 해석**하는가?

---

## 3.2 Quiescent Consistency

### 정의

> 객체가 **quiescent** (조용한) 상태가 되면, 그 전까지의 모든 연산이 순차 명세와 일치하는 순서로 완료된 것처럼 보인다.

**Quiescent**: 진행 중인 연산이 없는 상태

### 예시

```
Thread A: enq(1) ─────────────────────────────
Thread B:        ─────── enq(2) ──────────────
                                    ↑ quiescent point

이 시점에서 큐는 [1, 2] 또는 [2, 1] 중 하나
```

### 한계

- **실시간 순서 무시**: 먼저 끝난 연산이 나중 순서가 될 수 있음
- **비합성적 (Non-compositional)**: 두 quiescent-consistent 객체를 조합해도 quiescent-consistent가 아닐 수 있음

---

## 3.3 Sequential Consistency

### 정의 (Lamport, 1979)

> 모든 스레드의 모든 연산에 대해 **하나의 전역 순서**가 존재하고,
> 각 스레드 내 연산은 **프로그램 순서**를 유지한다.

### 예시

```
Thread A: enq(1) ──────────── deq():2 ─────
Thread B: ─────── enq(2) ──────────────────

가능한 순차 순서:
1. enq(1), enq(2), deq():2  ← 유효? deq()가 1을 반환해야 함 ✗
2. enq(2), enq(1), deq():2  ← 유효? 프로그램 순서 위반 ✗
3. enq(2), deq():2, enq(1)  ← 유효? A의 enq(1)이 deq() 전인데? ✗

실제로 이 실행은 Sequential Consistent하지 않음!
```

### Sequential Consistency의 한계

**실시간 순서 무시**:

```
Thread A: enq(1) ──────────────────────────────
Thread B:              ──────── deq():1 ──────

A의 enq가 B의 deq 전에 완료되어도,
SC는 deq():empty를 허용할 수 있음 (이론적으로)
```

---

## 3.4 Linearizability

### 정의 (Herlihy & Wing, 1990)

> 각 연산이 **호출(invocation)**과 **응답(response)** 사이 어느 한 점에서 **원자적으로 발생**한 것처럼 보인다.

이 점을 **linearization point**라 부른다.

### 시각화

```
Thread A: │──── enq(1) ────│
                    ●        ← linearization point
Thread B:      │──── enq(2) ────│
                        ●    ← linearization point

시간순: enq(1) → enq(2)
큐 상태: [1, 2]
```

### Linearizability vs Sequential Consistency

| 특성 | Sequential Consistency | Linearizability |
|-----|----------------------|-----------------|
| 실시간 순서 | 무시 | **존중** |
| 합성성 | 비합성적 | **합성적** |
| 강도 | 약함 | 강함 |

**Linearizability ⊂ Sequential Consistency**

Linearizable이면 Sequential Consistent이지만, 역은 성립 안 함.

### 합성성 (Compositionality)

> 각 객체가 linearizable하면, 전체 시스템도 linearizable하다.

**중요**: 모듈화된 설계 가능. 각 자료구조를 독립적으로 검증.

---

## 3.5 형식적 정의

### 히스토리 (History)

스레드들의 연산 호출과 응답 시퀀스:

```
H = A.enq(1)  B.enq(2)  A.ok  B.ok  A.deq()  A.ok:1
```

### 완료 히스토리 (Complete History)

모든 호출에 대응하는 응답이 있음.

### 순차 히스토리 (Sequential History)

호출-응답 쌍이 연속적:

```
H_seq = A.enq(1).ok  B.enq(2).ok  A.deq().ok:1
```

### Linearizable 정의

히스토리 H가 linearizable ⟺ 다음을 만족하는 순차 히스토리 S 존재:

1. **complete(H) ⊆ S** (완료된 연산 포함)
2. **실시간 순서 보존**: op1 →H op2 이면 op1 →S op2
3. **S가 순차 명세 만족**

---

## 3.6 진행 조건 (Progress Conditions)

### Blocking vs Non-blocking

**Blocking**: 한 스레드가 멈추면 다른 스레드도 멈출 수 있음
**Non-blocking**: 한 스레드가 멈춰도 다른 스레드는 진행 가능

### Wait-free

> **모든** 메서드 호출이 **유한 단계**에 완료된다.

- 가장 강한 보장
- 어떤 스레드가 멈춰도 모든 스레드 진행
- 실시간 시스템에 적합

### Lock-free

> **어떤** 메서드 호출이 **항상** 유한 단계에 완료된다.

- 전체 시스템은 항상 진행
- 개별 스레드는 기아 가능
- 처리량 최적화에 적합

### Obstruction-free

> **혼자 실행**되면 유한 단계에 완료된다.

- 가장 약한 non-blocking 조건
- 경쟁이 없으면 진행 보장
- 경쟁 시 라이브락 가능

### 비교

![진행 조건 계층](/images/blog/parallel/diagrams/progress-conditions.svg)

---

## 3.7 예시: Wait-free Counter

```cpp
// C++20: Lock-free Counter (Wait-free가 아님)
#include <atomic>

class LockFreeCounter {
    std::atomic<int> value{0};

public:
    int getAndIncrement() {
        int v = value.load(std::memory_order_relaxed);
        while (!value.compare_exchange_weak(v, v + 1,
                std::memory_order_seq_cst,
                std::memory_order_relaxed)) {
            // CAS 실패 시 v가 자동으로 갱신됨
        }
        return v;
    }
};
```

```c
// C11: Lock-free Counter (Wait-free가 아님)
#include <stdatomic.h>

typedef struct {
    _Atomic int value;
} LockFreeCounter;

void counter_init(LockFreeCounter* c) {
    atomic_init(&c->value, 0);
}

int counter_get_and_increment(LockFreeCounter* c) {
    int v = atomic_load_explicit(&c->value, memory_order_relaxed);
    while (!atomic_compare_exchange_weak_explicit(
            &c->value, &v, v + 1,
            memory_order_seq_cst,
            memory_order_relaxed)) {
        // CAS 실패 시 v가 자동으로 갱신됨
    }
    return v;
}
```

**잠깐**: 이건 Lock-free지 Wait-free가 아니다!

### 진정한 Wait-free Counter

```cpp
// C++20: Wait-free Counter (분산 카운터)
#include <atomic>
#include <thread>
#include <vector>

class WaitFreeCounter {
    static constexpr size_t MAX_THREADS = 64;
    std::atomic<int> counters[MAX_THREADS]{};

    size_t getThreadIndex() {
        // 간단한 스레드 ID 매핑 (실제로는 더 정교한 방법 필요)
        thread_local static size_t idx =
            std::hash<std::thread::id>{}(std::this_thread::get_id()) % MAX_THREADS;
        return idx;
    }

public:
    void increment() {
        size_t me = getThreadIndex();
        counters[me].fetch_add(1, std::memory_order_relaxed);  // 항상 완료
    }

    int get() {
        int sum = 0;
        for (size_t i = 0; i < MAX_THREADS; ++i) {
            sum += counters[i].load(std::memory_order_relaxed);
        }
        return sum;
    }
};
```

```c
// C11: Wait-free Counter (분산 카운터)
#include <stdatomic.h>
#include <threads.h>
#include <string.h>

#define MAX_THREADS 64

typedef struct {
    _Atomic int counters[MAX_THREADS];
} WaitFreeCounter;

// 스레드 로컬 인덱스
thread_local size_t thread_idx = 0;
_Atomic size_t next_thread_idx = 0;

void counter_init(WaitFreeCounter* c) {
    memset(c->counters, 0, sizeof(c->counters));
}

size_t get_thread_index(void) {
    if (thread_idx == 0) {
        thread_idx = atomic_fetch_add(&next_thread_idx, 1) % MAX_THREADS + 1;
    }
    return thread_idx - 1;
}

void counter_increment(WaitFreeCounter* c) {
    size_t me = get_thread_index();
    atomic_fetch_add_explicit(&c->counters[me], 1, memory_order_relaxed);  // 항상 완료
}

int counter_get(WaitFreeCounter* c) {
    int sum = 0;
    for (size_t i = 0; i < MAX_THREADS; ++i) {
        sum += atomic_load_explicit(&c->counters[i], memory_order_relaxed);
    }
    return sum;
}
```

---

## 3.8 C++ Memory Order와의 관계

C++20/23의 memory order와 이 장의 개념이 어떻게 대응되는지 살펴보자.

```cpp
// C++20: Memory Order 예시
#include <atomic>

std::atomic<int> x{0};
std::atomic<int> y{0};

// Sequential Consistency (가장 강함)
void thread_a_sc() {
    x.store(1, std::memory_order_seq_cst);  // Linearizable
    int r = y.load(std::memory_order_seq_cst);
}

// Acquire-Release (중간)
void thread_a_acq_rel() {
    x.store(1, std::memory_order_release);  // 이전 연산 publish
    int r = y.load(std::memory_order_acquire);  // 이후 연산 protect
}

// Relaxed (가장 약함)
void thread_a_relaxed() {
    x.store(1, std::memory_order_relaxed);  // 원자성만 보장
    int r = y.load(std::memory_order_relaxed);  // 순서 보장 없음
}
```

| Memory Order | 정확성 수준 | 용도 |
|-------------|-----------|-----|
| `seq_cst` | Linearizable | 기본값, 가장 안전 |
| `acquire/release` | Happens-before 관계 | 동기화 포인트 |
| `relaxed` | 원자성만 | 카운터, 통계 |

---

## 핵심 요약

| 개념 | 정의 |
|-----|------|
| **Quiescent Consistency** | 조용할 때 순차 일관성 |
| **Sequential Consistency** | 전역 순서 + 프로그램 순서 |
| **Linearizability** | 실시간 순서 존중 + 합성적 |
| **Wait-free** | 모든 연산 유한 시간 완료 |
| **Lock-free** | 시스템 항상 진행 |
| **Obstruction-free** | 혼자면 완료 |

---

## 핵심 정리

**Theorem 3.6.1**: Linearizability는 합성적이다.
**Theorem 3.6.2**: Sequential Consistency는 비합성적이다.

---

## 연습 문제

1. 다음 실행이 linearizable한가?
   ```
   A: enq(1)────────────────
   B: ────enq(2)────deq():1─
   ```

2. Lock-free이지만 Wait-free가 아닌 알고리즘의 예는?

3. Linearization point는 항상 메서드 내부에 있어야 하는가?

4. 두 Sequential Consistent 큐를 조합한 것이 SC가 아닌 예를 구성하라.

---

## 한국 개발자의 함정

```
1. *Linearizability ≈ Atomicity*라는 오해
   - Atomic은 *하드웨어 명령의 원자성*
   - Linearizable은 *추상 객체의 정확성*
   - 둘은 다른 차원

2. *Sequential consistency만 알면 충분*
   - C++ Memory Model이 SC가 아님
   - Modern CPU도 SC가 아님
   - Acquire-release / sequentially-consistent 등 약한 모델

3. *Lock-free = Wait-free*라는 혼동
   - Lock-free: 일부가 진행 (전체는 안 끝날 수 있음)
   - Wait-free: 모두 유한 시간 완료
   - 실무 대부분이 lock-free만 (wait-free는 너무 비쌈)

4. *Composability(합성성)*의 중요성 간과
   - Linearizable이 SC보다 강한 이유
   - 분산 시스템 / 모듈러 설계에 결정적
```

## 실무 적용

```
이론 → 실무:
- Linearizability  → Strong consistency (DB, etcd, ZooKeeper)
- Sequential Consistency → Java synchronized의 메모리 모델
- Wait-free         → 실시간 시스템 (오디오, 게임)
- Lock-free         → 동시성 자료구조 (java.util.concurrent)
- Obstruction-free  → STM (Software Transactional Memory)

C++20/23 예:
- std::atomic<T>::load()/store()    — Linearizable (seq_cst)
- std::atomic<T>::compare_exchange_*() — CAS 기반
- std::atomic<T>::fetch_add()       — FAA

C11 예:
- atomic_load()/atomic_store()      — 원자적 읽기/쓰기
- atomic_compare_exchange_*()       — CAS
- atomic_fetch_add()                — FAA

Java 예:
- ConcurrentHashMap: linearizable
- AtomicLong: linearizable (CAS 기반)
- volatile read/write: SC 보장
```

## 자기 점검

```
□ Linearizability 정의를 그림으로 그릴 수 있는가?
□ Linearization point 찾는 법?
□ Lock-free / Wait-free / Obstruction-free 구분?
□ Composability(합성성)의 의미와 왜 중요한가?
□ Sequential Consistency의 비합성성 예?
□ C++20 memory_order와의 관계?
```

## 관련 항목

- [Chapter 2: Mutual Exclusion](/blog/parallel/parallel-principles/ch02-mutual-exclusion)
- [Chapter 4: Foundations of Shared Memory](/blog/parallel/parallel-principles/ch04-foundations-of-shared-memory)
- [Chapter 5: Relative Power of Synchronization](/blog/parallel/parallel-principles/ch05-relative-power-of-synchronization)
- [C++ Concurrency in Action — Ch 5: Memory Model](/blog/parallel/cpp-concurrency-in-action/chapter05-the-cpp-memory-model-and-operations-on-atomic-types)

---

다음 글: [Chapter 4: Foundations of Shared Memory](/blog/parallel/parallel-principles/ch04-foundations-of-shared-memory)
