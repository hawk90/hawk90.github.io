---
title: "Chapter 3: Concurrent Objects"
date: 2026-05-06T03:00:00
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

![두 enq가 quiescent point에서 만나면 큐 = [1,2] 또는 [2,1] 둘 다 허용](/images/blog/parallel-principles/diagrams/ch03-quiescent.svg)

### 한계

- **실시간 순서 무시**: 먼저 끝난 연산이 나중 순서가 될 수 있음
- **비합성적 (Non-compositional)**: 두 quiescent-consistent 객체를 조합해도 quiescent-consistent가 아닐 수 있음

---

## 3.3 Sequential Consistency

### 정의 (Lamport, 1979)

> 모든 스레드의 모든 연산에 대해 **하나의 전역 순서**가 존재하고,
> 각 스레드 내 연산은 **프로그램 순서**를 유지한다.

### 예시

![SC 위반 예시 — A의 enq(1)과 deq():2, B의 enq(2)의 순서가 모순](/images/blog/parallel-principles/diagrams/ch03-sc-impossible.svg)

가능한 순차 순서를 따져보면:

1. `enq(1), enq(2), deq():2` → `deq()`가 1을 반환해야 함 ✗
2. `enq(2), enq(1), deq():2` → 프로그램 순서 위반 ✗
3. `enq(2), deq():2, enq(1)` → A의 `enq(1)`이 `deq()` 전이어야 함 ✗

실제로 이 실행은 Sequential Consistent하지 않다.

### Sequential Consistency의 한계

**실시간 순서 무시**:

![A의 enq(1)이 B의 deq보다 먼저 끝나도 SC는 deq():empty를 허용](/images/blog/parallel-principles/diagrams/ch03-sc-relaxed.svg)

A의 `enq`가 B의 `deq` 전에 완료되어도, SC는 `deq():empty`를 허용할 수 있다 (이론적으로).

---

## 3.4 Linearizability

### 정의 (Herlihy & Wing, 1990)

> 각 연산이 **호출(invocation)**과 **응답(response)** 사이 어느 한 점에서 **원자적으로 발생**한 것처럼 보인다.

이 점을 **linearization point**라 부른다.

### 시각화

```text
Thread A: │──── enq(1) ────│
                    ●        ← linearization point
Thread B:      │──── enq(2) ────│
                        ●    ← linearization point

시간순: enq(1) → enq(2)
큐 상태: [1, 2]
```

### Linearization Point — 구체 예제

책은 가장 단순한 객체인 atomic register로 linearization point를 보여준다.

```cpp
// Atomic register (CAS 없는 단일 변수)
class Register {
    std::atomic<int> value;
public:
    int read()  { return value.load(std::memory_order_seq_cst); }
    void write(int v) { value.store(v, std::memory_order_seq_cst); }
};
```

`read()`의 linearization point는 **하드웨어 load 명령이 실행된 정확한 순간**. `write(v)`의 linearization point는 **하드웨어 store 명령이 메모리에 반영된 순간**.

```text
Thread A:  │── read() ──│ : 7
                  ●            ← LP_A: 값 7을 봄
Thread B:        │── write(42) ──│
                       ●         ← LP_B: 42 씀
Thread C:              │── read() ──│ : 42
                              ●     ← LP_C: 값 42를 봄

타임라인 순서: LP_A < LP_B < LP_C
일관된 순차 명세: write(7), read()→7, write(42), read()→42
```

A의 read는 LP_B 이전에 일어나야 7을 본다. C의 read는 LP_B 이후라야 42를 본다. **물리적 시간상 호출-응답 구간 안 어딘가에 LP가 있다면**, 그 LP들을 시간순으로 늘어놓은 순차 히스토리가 명세를 만족하면 객체는 linearizable.

### 더 어려운 예: lock-free queue

큐의 linearization point는 어디인가? 단일 인스트럭션이 아니라 여러 단계로 나뉜다.

```cpp
// Michael-Scott queue (Ch 10)
void enqueue(T item) {
    Node* node = new Node{item};
    while (true) {
        Node* tail = Tail.load();
        Node* next = tail->next.load();
        if (tail == Tail.load()) {
            if (next == nullptr) {
                // ★ LP_enq: 여기 CAS 성공 시점
                if (tail->next.compare_exchange_weak(next, node)) {
                    Tail.compare_exchange_strong(tail, node);
                    return;
                }
            } else {
                Tail.compare_exchange_strong(tail, next);
            }
        }
    }
}
```

`enqueue`의 linearization point는 **`tail->next`를 CAS로 성공시킨 순간**. 이후 `Tail.compare_exchange_strong`는 정리(cleanup)일 뿐, 다른 스레드는 이미 새 노드를 볼 수 있다.

linearization point를 식별하는 능력이 lock-free 알고리즘 검증의 핵심이다.

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

### 세 가지 일관성 비교 — enqueue/dequeue 히스토리

같은 큐에 대한 동일한 호출 시퀀스를 세 가지 일관성 모델로 평가해보자.

```text
실제 시간:
Thread A: ┃──enq(1)──┃                ┃──deq()──┃ : ?
Thread B:         ┃──enq(2)──┃
```

A는 1을 enqueue한 다음 (B의 enq(2)와 부분 겹침) 나중에 dequeue를 시도한다. A의 deq가 반환할 수 있는 값은?

**Quiescent Consistency**

- A의 deq 시점에 quiescent가 아닐 수 있으나, 만약 quiescent였다면 큐는 `[1, 2]` 또는 `[2, 1]`
- 가능한 dequeue 결과: **1 또는 2 모두 OK**
- enq(1)과 enq(2)가 부분 겹침이므로 순서 자유

**Sequential Consistency**

- 프로그램 순서: 각 스레드 내부 순서만 유지
- A의 enq(1) → A의 deq() (프로그램 순서)
- B의 enq(2)는 어디든 끼울 수 있음
- 가능한 순차 순서:
  - `enq(1), enq(2), deq:1` → 1 반환
  - `enq(1), deq:1, enq(2)` → 1 반환
  - `enq(2), enq(1), deq:2` → 2 반환 (B의 enq가 A의 enq보다 먼저)
- **1 또는 2 모두 OK**

**Linearizability**

- 실시간 순서 존중. A의 enq(1)은 실시간상 모든 다른 연산보다 먼저 끝났는가? deq 전에 끝났다.
- enq(1)은 A의 deq보다 실제 시간상 앞섰으므로 LP_enq(1) < LP_deq.
- enq(2)는 deq와 부분 겹침 — LP는 어느 쪽이든 가능.
- 시나리오 1: LP_enq(1) < LP_enq(2) < LP_deq → deq:1
- 시나리오 2: LP_enq(1) < LP_deq < LP_enq(2) → 하지만 enq(2) 호출이 deq 응답 전이므로 LP_enq(2)는 deq의 LP보다 뒤일 수 있음. 그러면 deq는 큐에 1만 있을 때 deq:1
- 두 시나리오 모두 **1을 반환해야 한다**

### 비교 표

| 시나리오 | Quiescent | Sequential | Linearizable |
|----------|-----------|------------|--------------|
| 부분 겹침 enq, 그 후 deq | 1 또는 2 | 1 또는 2 | **1만 가능** |
| 완전 분리 enq(1) → enq(2) → deq | 1 또는 2 (quiescent였다면) | 1 | **1** |
| 두 deq가 동시, 큐에 [1,2] | 합법 모두 | 합법 모두 | (1,2) 또는 (2,1) — 한 dequeue가 다른 것보다 먼저 끝나야 함 |
| 두 객체 합성 (큐 + 스택) | 깨질 수 있음 | 깨질 수 있음 | **유지됨** |

핵심: **linearizable이 가장 제약이 강하고, quiescent가 가장 약하다**.

```text
linearizable ⊂ sequentially consistent ⊂ quiescent consistent
```

### Composition Theorem (Theorem 3.6.1)

> **Theorem 3.6.1**: 히스토리 $H$가 객체 $x$로 제한($H | x$)했을 때 모든 객체 $x$에 대해 linearizable이면, $H$ 전체가 linearizable이다.

**증명 스케치**

각 객체 $x$별로 linearization을 주는 순차 히스토리 $S_x$가 있다고 하자. 모든 $S_x$는 실시간 순서를 보존한다.

전체 히스토리 $H$의 linearization $S$를 구성하려면, 모든 객체의 연산을 하나의 전역 순서로 배열해야 한다. 핵심 아이디어:

1. 각 연산 $op$에 대해 그 linearization point $LP(op)$를 잡는다 (호출-응답 구간 안의 한 점).
2. 모든 LP를 **실제 시간**순으로 정렬한다 — 이것이 $S$.

$S$가 잘 정의되는가? 각 객체 $x$에 대해 $S | x$의 순서는 $LP$의 시간 순서와 같다. $S_x$도 시간 순서와 일관되므로 $S | x = S_x$이고, 따라서 $x$의 명세를 만족한다.

실시간 순서도 보존된다 (LP 자체가 호출-응답 안에 있고 시간순으로 정렬했으므로). ∎

**Sequential Consistency는 왜 합성적이지 않은가**

SC는 "각 스레드의 프로그램 순서"만 요구하지 실시간 순서를 강제하지 않는다. 객체별로는 SC를 만족해도, 두 객체를 합치면 두 객체 사이의 연산 순서를 어떻게 정렬할지 자유도가 너무 커서 일관된 전역 순서가 안 나올 수 있다.

```text
객체 X: queue (SC만 만족)
객체 Y: queue (SC만 만족)

Thread A: x.enq(1); y.deq() → ?
Thread B: y.enq(1); x.deq() → ?

X로 제한하면: A.enq(1) → B.deq() — SC OK
Y로 제한하면: B.enq(1) → A.deq() — SC OK
그러나 합쳐서 보면 두 deq가 모두 empty를 반환할 수 있고
              두 deq가 모두 성공할 수 있고
              순환 의존이 생긴다 — 일관된 전역 순서 없음
```

이게 책이 강조하는 **합성성의 결정적 차이**다. 분산 시스템과 모듈러 자료구조 설계에서 linearizability를 선호하는 이유.

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

### 진행 조건의 포함 관계

세 조건은 **계층적 포함 관계**를 가진다.

$$
\text{wait-free} \subset \text{lock-free} \subset \text{obstruction-free}
$$

- **wait-free 구현은 자동으로 lock-free**: 모든 스레드가 유한 단계에 끝나면 어떤 스레드는 항상 진행한다 (자명).
- **lock-free 구현은 자동으로 obstruction-free**: 시스템 전체가 진행하면, 혼자 실행되는 스레드도 결국 진행한다 (다른 스레드의 방해가 없으므로).
- 역은 성립하지 않는다.

### 구체적 예시 — 어떤 알고리즘이 어디에 속하는가

| 알고리즘 | Obstruction-free | Lock-free | Wait-free |
|----------|------------------|-----------|-----------|
| spin lock (TAS) | ✗ | ✗ | ✗ |
| CAS-loop counter | ✓ | ✓ | ✗ |
| Treiber's stack | ✓ | ✓ | ✗ |
| Michael-Scott queue | ✓ | ✓ | ✗ |
| 분산 카운터 (배열 합) | ✓ | ✓ | ✓ |
| Kogan-Petrank wait-free queue | ✓ | ✓ | ✓ |
| Software Transactional Memory | ✓ | (구현마다) | (드뭄) |

### 비용 vs 강도 트레이드오프

```text
진행 조건 강도:
  wait-free      ─ 강함, 비쌈
       ↓
  lock-free      ─ 중간
       ↓
  obstruction-free ─ 약함, 저렴
       ↓
  blocking (mutex) ─ 가장 약함, 가장 저렴 (보통)

구현 복잡도:
  wait-free       ★★★★★ (분산 헬퍼, announce 배열 등)
  lock-free       ★★★★  (CAS 루프, ABA, 메모리 관리)
  obstruction-free★★★   (백오프, 재시도 전략)
  blocking        ★     (mutex 한 줄)

처리량 (경쟁 적을 때):
  blocking < obstruction-free < lock-free < wait-free

처리량 (경쟁 많을 때):
  obstruction-free 망함 (라이브락)
  wait-free 안정적
  lock-free 변동
```

대부분의 실무 자료구조는 **lock-free**를 목표로 한다. wait-free는 이론적 매력은 크지만 구현 오버헤드가 커서 경쟁이 매우 높은 환경에서만 유리하다.

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

## 3.8 메모리 일관성 vs 객체 일관성

책 3.8절은 자주 혼동되는 두 차원을 명확히 구분한다.

### 두 종류의 일관성

| 구분 | 메모리 일관성 (Memory Consistency) | 객체 일관성 (Object Consistency) |
|------|------------------------------------|----------------------------------|
| 대상 | 메모리 위치(load/store) | 추상 자료구조(enq/deq/lookup) |
| 정의자 | 하드웨어 + 컴파일러 | 알고리즘 설계자 |
| 예 | SC, TSO, PSO, ARM weak | linearizable, sequentially consistent |
| 강제 도구 | memory barrier, fence, `memory_order` | 프로그램 로직, CAS |
| 단위 | byte / word | 객체 호출 |

### 메모리 일관성 모델

CPU와 컴파일러는 메모리 연산을 재정렬할 수 있다. 어디까지 재정렬을 허용하는지가 **메모리 일관성 모델**이다.

```text
Sequential Consistency (SC)
  모든 load/store가 단일 전역 순서, 프로그램 순서 유지
  예: 이론적 모델, 없는 것에 가까움

Total Store Order (TSO)
  store→load 재정렬만 허용 (store buffer)
  예: x86, x86-64

Partial Store Order (PSO)
  store→store도 재정렬 허용
  예: 옛 SPARC

Weak / Release Consistency
  거의 모든 재정렬 허용 (fence로 막아야 함)
  예: ARM, PowerPC, RISC-V

C++/Java 메모리 모델
  Data-race-free → SC 결과 보장 (DRF-SC)
  atomic + memory_order로 재정렬 제어
```

### 객체 일관성 모델

자료구조의 동시 호출이 어떤 정확성을 만족하는지.

```text
Linearizability
  실시간 순서 + 합성적 (이번 챕터)

Sequential Consistency (객체 차원)
  프로그램 순서, 실시간 순서 무시 (이번 챕터)

Quiescent Consistency
  조용할 때만 일관성 (이번 챕터)

Strict Serializability (DB)
  트랜잭션 단위 linearizability

Causal Consistency
  인과 관계만 보존 (실시간 무시)

Eventual Consistency
  결국 같아짐 (DynamoDB, NoSQL)
```

### 둘이 어떻게 만나는가

객체 일관성을 구현하려면 메모리 일관성을 다뤄야 한다.

```cpp
// 객체 차원: linearizable queue를 만들고 싶다
// 메모리 차원: x86 TSO 위에서 ARM weak에서도 작동하게

class LinearizableQueue {
    std::atomic<Node*> Head;
    std::atomic<Node*> Tail;

    void enqueue(T item) {
        Node* node = new Node{item};
        Node* old_tail;
        do {
            old_tail = Tail.load(std::memory_order_acquire);  // ← 메모리 일관성 제어
            //                       ^^^^^^^^^^^^^^^^^^^^
            //                       객체 일관성을 보장하려면
            //                       올바른 memory_order 필수
        } while (!Tail.compare_exchange_weak(old_tail, node,
                    std::memory_order_release,    // ← 발행
                    std::memory_order_relaxed));
        // 객체 차원의 linearization point = 이 CAS 성공 순간
    }
};
```

**메모리 차원에서 잘못된 acquire/release** → 다른 스레드가 새 노드의 내용을 보기 전에 포인터부터 본다 → 객체 차원에서 **linearizable이 아닌 동작**.

### 자주 발생하는 혼동

```text
혼동 1: "내 큐는 std::mutex 쓰니까 안전해"
  → mutex는 메모리 일관성을 강제 (happens-before)
  → 하지만 객체 일관성은 별도 — 알고리즘 로직이 맞아야 함
  → 예: dequeue가 empty 체크 후 pop 사이에 다른 스레드가 enq 가능?

혼동 2: "memory_order_seq_cst만 쓰면 linearizable"
  → 메모리 차원에서 SC가 객체 차원의 linearizable을 자동 보장하지 않음
  → 알고리즘 자체가 잘못되었을 수 있음

혼동 3: "C++는 SC 메모리 모델이다"
  → DRF (data race free)일 때만 SC 결과
  → atomic + relaxed 쓰면 SC 안 됨
  → 객체의 linearizability는 메모리 모델 위에서 별도로 증명
```

이 두 차원의 분리가 책 후반부 자료구조 설계의 전제다. 9장부터 등장하는 lock-free 큐, 스택, 해시 테이블은 **메모리 일관성을 매개로** 객체 일관성을 구현한다.

---

## 3.9 C++ Memory Order와의 관계

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

   ![enq(1), enq(2), deq():1 — linearizable한지 분석](/images/blog/parallel-principles/diagrams/ch03-exercise-linearizable.svg)

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
