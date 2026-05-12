---
title: "Chapter 3: Concurrent Objects"
date: 2026-05-12
description: "동시성 객체의 정확성 정의. Sequential Consistency와 Linearizability. 진행 조건: wait-free, lock-free."
series: "The Art of Multiprocessor Programming"
seriesOrder: 3
tags: [parallel, concurrency, book-review, amp, linearizability, sequential-consistency]
type: book-review
bookTitle: "The Art of Multiprocessor Programming"
bookAuthor: "Maurice Herlihy, Nir Shavit"
---

> **The Art of Multiprocessor Programming** Chapter 3 요약

## 3.1 동시성과 정확성

### 핵심 질문

> 동시 실행되는 객체가 **"올바르게"** 동작한다는 것은 무엇인가?

순차 프로그램: 명세대로 동작하면 정확
동시 프로그램: 정확성 정의 자체가 복잡

### 순차 명세 (Sequential Specification)

```java
// 큐의 순차 명세
interface Queue<T> {
    void enqueue(T item);  // 아이템 추가
    T dequeue();           // 아이템 제거, 반환
}

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

```
강함    Wait-free
   ↑    모든 스레드 항상 완료
   │
   │    Lock-free
   │    시스템은 진행, 개별 스레드 기아 가능
   │
   │    Obstruction-free
   ↓    혼자면 완료, 경쟁 시 보장 없음
약함
```

---

## 3.7 예시: Wait-free Counter

```java
class WaitFreeCounter {
    private AtomicInteger value = new AtomicInteger(0);

    public int getAndIncrement() {
        while (true) {
            int v = value.get();
            if (value.compareAndSet(v, v + 1)) {
                return v;
            }
        }
    }
}
```

**잠깐**: 이건 Lock-free지 Wait-free가 아니다!

### 진정한 Wait-free Counter

```java
class TrueWaitFreeCounter {
    private int[] counters;  // 스레드별 카운터

    public void increment() {
        int me = ThreadID.get();
        counters[me]++;  // 로컬 업데이트, 항상 완료
    }

    public int get() {
        int sum = 0;
        for (int c : counters) sum += c;
        return sum;
    }
}
```

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

다음 글: [Chapter 4: Foundations of Shared Memory](/blog/parallel/parallel-principles/ch04-shared-memory)
