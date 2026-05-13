---
title: "Chapter 11: Concurrent Stack과 Elimination"
date: 2026-05-12
description: "Lock-Free Treiber Stack. Elimination 기법으로 push/pop이 서로 상쇄되어 스택을 안 거치게."
series: "The Art of Multiprocessor Programming"
seriesOrder: 11
tags: [parallel, concurrency, book-review, amp, stack, treiber, elimination]
type: book-review
bookTitle: "The Art of Multiprocessor Programming"
bookAuthor: "Maurice Herlihy, Nir Shavit"
draft: true
---

> **The Art of Multiprocessor Programming** Chapter 11 요약

## 11.1 Lock-Free Stack — Treiber Stack

가장 단순한 lock-free 자료구조.

```python
class TreiberStack<T>:
    top: AtomicNode
    
    def push(item):
        newNode = Node(item)
        while True:
            old = top.read()
            newNode.next = old
            if top.cas(old, newNode):
                return
    
    def pop():
        while True:
            old = top.read()
            if old is null: return null
            new = old.next
            if top.cas(old, new):
                return old.item
```

**핵심** — top 포인터에 대한 CAS 한 번. 매우 단순하고 빠르다.

## 11.2 Treiber Stack의 한계

성능 측정을 해 보면 — **경합이 심하면 매우 느리다**.

이유는 단순하다. 모든 스레드가 같은 변수(top)에 CAS를 시도한다. **Cache line contention**이 매우 크다.

```
8 코어, 모두 push 시도:
- 매 사이클 7 코어가 CAS 실패
- top cache line이 코어 사이를 핑퐁
- 처리량 거의 0에 수렴
```

이게 단순 lock-free의 한계다. **모두가 같은 위치에서 경쟁**하면 락보다도 못한 성능.

## 11.3 통찰 — Push와 Pop이 만나면?

Herlihy의 우아한 통찰.

> **Push와 Pop이 동시에 일어나면 — 그 두 작업은 서로 상쇄된다.**

```
스택: [A, B, C]
스레드 X: push(D)
스레드 Y: pop() → 무엇을 받을까?
```

답은 두 가지 가능.

1. push가 먼저 — Y는 D를 받음
2. pop이 먼저 — Y는 C를 받음, 그 후 push로 D 추가

**둘 다 정당하다**. Linearizability는 어느 순서든 허용.

그렇다면 — **스택 자체를 안 거치고** push/pop이 서로 합의할 수 있을까? push가 D를 쥐고 있고 pop이 기다리고 있다면, 둘이 만나서 push가 D를 직접 pop에게 넘기면 된다. 스택은 그대로.

이게 **Elimination Backoff Stack**의 아이디어.

## 11.4 Elimination Backoff Stack

```python
class EliminationStack<T>:
    centralStack: TreiberStack
    eliminationArray: ExchangerArray
    
    def push(item):
        while True:
            if centralStack.tryPush(item):
                return
            
            # 실패 — elimination 시도
            slot = random_slot()
            other = eliminationArray[slot].exchange(item, TIMEOUT)
            if other is "popOp":
                # pop과 만남 — 그쪽에 직접 전달
                return
            # 만남 실패 — 다시 시도
    
    def pop():
        while True:
            item = centralStack.tryPop()
            if item is not null:
                return item
            
            slot = random_slot()
            other = eliminationArray[slot].exchange("popOp", TIMEOUT)
            if other is not "popOp":
                # push와 만남 — 그 값을 받음
                return other
            # 만남 실패 — 다시 시도
```

**메커니즘**:

1. 먼저 central stack에 시도
2. 실패 시 — **elimination array**의 랜덤 슬롯에서 짝을 기다림
3. push와 pop이 같은 슬롯에서 만나면 — 서로 직접 교환, 스택은 그대로

## 11.5 왜 이게 빠른가

**경합이 적을 때** — central stack의 CAS가 보통 성공. Treiber stack과 거의 같음.

**경합이 심할 때** — central stack CAS 실패가 많지만, 그만큼 push/pop 짝이 많이 있다. Elimination array에서 만날 확률이 높음.

```
경합 ↑ → CAS 실패 ↑ → 그러나 elimination 만남 ↑
        결과: 처리량 ↑
```

직관적으로 모순이지만 — **경합이 심할수록 elimination이 더 잘 작동**한다.

## 11.6 Elimination Array의 설계

각 슬롯은 **Exchanger** — 두 스레드가 만나서 값을 교환하는 동기화 객체.

```python
class Exchanger<T>:
    state: AtomicState (EMPTY, WAITING, BUSY)
    item: T
    
    def exchange(myItem, timeout):
        # State machine으로 만남 처리
        ...
```

세 상태:

- **EMPTY** — 아무도 없음
- **WAITING** — 한 명이 기다리는 중
- **BUSY** — 두 명이 만나서 교환 중

**랜덤 슬롯 선택** — 모든 스레드가 같은 슬롯에 모이면 경합. 랜덤이라 분산됨.

**Adaptive sizing** — 경합 정도에 따라 array 크기 조정. 경합 많으면 array 크게, 적으면 작게.

## 11.7 Linearizability 보장

흥미로운 질문 — push와 pop이 elimination으로 만나면, 스택의 linearizability가 유지되는가?

**답**: 그렇다.

```
시간:           t1  t2  t3  t4
스레드 X:    push─────────────
스레드 Y:              pop───
```

X와 Y가 elimination으로 만나는 시점이 linearization point. 그 시점에 push와 pop이 동시에 일어났다고 해석. Linearizability 정의 만족.

## 11.8 다른 elimination 응용

이 아이디어는 stack에만 국한되지 않는다.

- **Counter** — increment와 decrement
- **Set** — add와 remove
- **Map** — 어떤 키 / 어떤 값 등

서로 상쇄되는 작업 쌍이 있으면 elimination 적용 가능.

다만 — **서로 상쇄 가능한지**가 자료구조의 명세에 달려 있다. Stack/Queue/Counter에서는 쉽다. 정렬된 구조에서는 어렵다.

## 11.9 실용성

Elimination Backoff Stack은 이론적으로 우아하다. 실용성은?

- **고경합 시 매우 빠름** — Treiber보다 수 배 빠를 수 있음
- **저경합 시 비슷** — Treiber와 거의 같음
- **복잡도** — 구현이 매우 복잡

실전에서는 라이브러리(java.util.concurrent.ConcurrentLinkedQueue 등)가 이런 최적화를 내장한다. 직접 짜는 건 어렵다.

## 정리

- **Treiber Stack** — 가장 단순한 lock-free 자료구조
- 경합이 심하면 Cache line contention으로 매우 느림
- **Elimination 아이디어** — push와 pop이 서로 상쇄 가능
- **Elimination Backoff Stack** — central stack + exchanger array
- 경합이 심할수록 elimination이 잘 작동 — **반직관적**
- Stack 외에도 적용 가능 (Counter, Set 등 — 상쇄 가능한 작업이 있다면)

## 다음 장 예고

다음 장은 **Counting, Sorting, Distributed Coordination** — 분산 카운터와 정렬 네트워크.

## 관련 항목

- [Ch 10: Queue와 ABA](/blog/parallel/parallel-principles/ch10-concurrent-queues-and-the-aba-problem)
- [Ch 9: Linked Lists](/blog/parallel/parallel-principles/ch09-linked-lists-the-role-of-locking)
