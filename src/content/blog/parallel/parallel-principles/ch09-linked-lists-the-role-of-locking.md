---
title: "Chapter 9: Linked List — Locking의 역할"
date: 2026-05-12
description: "동시성 리스트의 진화 — 거대 락, 미세 락, optimistic, lazy, lock-free."
series: "The Art of Multiprocessor Programming"
seriesOrder: 9
tags: [parallel, concurrency, book-review, amp, linked-list, lock-free]
type: book-review
bookTitle: "The Art of Multiprocessor Programming"
bookAuthor: "Maurice Herlihy, Nir Shavit"
---

> **The Art of Multiprocessor Programming** Chapter 9 요약

## 9.1 동시성 자료구조의 진화

가장 단순한 자료구조 — 정렬된 연결 리스트 — 를 통해 동시성 자료구조 설계의 5단계 진화를 본다.

각 단계는 직전 단계의 한계를 극복한다. 이 흐름이 모든 동시성 자료구조 디자인의 일반적 패턴이다.

```
1. Coarse-Grained — 거대 락
2. Fine-Grained — 노드별 락
3. Optimistic — 낙관적 잠금
4. Lazy — 게으른 삭제
5. Lock-Free — 락 없음
```

## 9.2 Coarse-Grained — 거대 락

```java
class CoarseList<T>:
    head: Node
    lock: Lock
    
    def add(item):
        lock.acquire()
        try:
            # 일반 순차 알고리즘 (찾기 + 삽입)
            pred = head
            curr = head.next
            while curr.item < item:
                pred = curr; curr = curr.next
            newNode = Node(item, curr)
            pred.next = newNode
        finally:
            lock.release()
```

**장점**: 단순. 정확성 분명.
**단점**: **모든 작업이 순차적**. 멀티 코어 이득 없음.

기준선(baseline). 빠른 prototype에 좋다.

## 9.3 Fine-Grained — 노드별 락

각 노드에 락. **Hand-over-hand locking** (또는 lock coupling).

```python
def add(item):
    head.lock.acquire()
    pred = head
    curr = head.next
    curr.lock.acquire()
    
    while curr.item < item:
        pred.lock.release()    # 직전 락 풀고
        pred = curr             # 한 칸 이동
        curr = curr.next
        curr.lock.acquire()     # 다음 락 잡기
    
    newNode = Node(item, curr)
    pred.next = newNode
    pred.lock.release()
    curr.lock.release()
```

매 시점에 **인접 두 노드**의 락을 잡는다. 손에 손 잡고.

**장점**: 다른 부분에서 동시 작업 가능.
**단점**: 락 획득/해제 비용이 큼. 매 노드마다.

## 9.4 Optimistic — 낙관적 잠금

대부분의 시간에 경합이 없다는 가정. 락 없이 검색하고, 수정할 때만 락.

```python
def add(item):
    while True:
        # 1. 락 없이 찾기
        pred = head
        curr = head.next
        while curr.item < item:
            pred = curr; curr = curr.next
        
        # 2. 락 잡기 (validation 필요)
        pred.lock.acquire()
        curr.lock.acquire()
        
        # 3. 검증 — 그 사이 변경 없었나?
        if validate(pred, curr):
            # 안 변했음 — 삽입
            newNode = Node(item, curr)
            pred.next = newNode
            pred.lock.release()
            curr.lock.release()
            return
        
        # 4. 변했음 — 다시 시작
        pred.lock.release()
        curr.lock.release()
```

`validate`는 — 락을 잡은 후, pred에서 curr이 여전히 도달 가능한지 검사.

**장점**: 검색이 락 없이 빠름. 캐시 트래픽 적음.
**단점**: validation 비용. 경합 심하면 무한 재시도.

## 9.5 Lazy — 게으른 삭제

삭제를 두 단계로.

1. **Logical delete** — 노드에 `marked` 플래그
2. **Physical delete** — 실제로 next 포인터에서 제거

검색은 marked 노드를 무시한다.

```python
def remove(item):
    while True:
        pred, curr = find(item)
        pred.lock.acquire()
        curr.lock.acquire()
        
        if validate(pred, curr):
            if curr.item == item:
                curr.marked = true    # 1. logical
                pred.next = curr.next # 2. physical
                pred.lock.release()
                curr.lock.release()
                return true
            ...
```

**장점**:
- 검색이 락 없음 — 정말 빠름
- `contains()` 같은 read-only 작업이 거의 free

**단점**: 메모리 점유 (marked 노드 즉시 해제 안 됨).

이 패턴이 **wait-free contains**의 핵심 — 검색만큼은 정확히 wait-free.

## 9.6 Lock-Free Linked List

CAS만 사용. 락 전혀 없음.

```python
def remove(item):
    while True:
        pred, curr = find(item)
        if curr.item != item:
            return false
        
        # 1. mark — CAS로 marked 비트 + next
        succ = curr.next
        if not curr.next.cas((succ, false), (succ, true)):
            continue
        
        # 2. physical — CAS로 pred.next 변경
        pred.next.cas((curr, false), (succ, false))
        return true
```

**핵심 트릭**: `next` 포인터에 marked 비트를 함께 저장. CAS 한 번으로 둘을 atomic하게.

```
포인터 (low bit가 marked):
  raw:  0x12345678 → 노드 + unmarked
  marked: 0x12345679 → 노드 + marked
```

C++의 `std::atomic`은 포인터 + bit를 직접 못 다루므로, **tagged pointer** 기법 필요 (포인터의 low bit가 보통 사용 안 됨).

**장점**: 진정한 lock-free. 한 스레드의 stall이 다른 스레드를 막지 않음.
**단점**: 매우 복잡. ABA 문제, 메모리 회수 어려움.

## 9.7 단계별 성능 비교

벤치마크 (개략 경향).

| 알고리즘 | Read-Heavy | Mix | Write-Heavy |
|---|---|---|---|
| Coarse | 매우 느림 | 매우 느림 | 매우 느림 |
| Fine-Grained | 보통 | 보통 | 빠름 |
| Optimistic | 빠름 | 보통 | 보통 |
| Lazy | 매우 빠름 | 빠름 | 빠름 |
| Lock-Free | 매우 빠름 | 빠름 | 매우 빠름 |

**Lazy**가 실용적으로 가장 좋다. 복잡도 vs 성능 트레이드오프가 적절.

Lock-free는 이론적으로 최고지만 구현 복잡도가 매우 크다 — 라이브러리(folly, junction 등)를 쓰는 게 현실적.

## 9.8 일반화 가능한 교훈

이 챕터의 진화 패턴이 모든 동시성 자료구조에 적용된다.

**1. Coarse부터 시작**

정확성 확보. 기준선.

**2. Hot path를 분리**

읽기만 하는 경로는 락을 안 잡거나, 짧게만.

**3. Logical vs Physical 분리**

삭제, 업데이트를 두 단계로 — 로지컬 표시 + 물리적 처리.

**4. CAS로 atomic 두 작업**

포인터 + 플래그 같이 묶기.

**5. 메모리 회수에 주의**

Lock-free는 GC 또는 hazard pointer 필요.

## 정리

- 동시성 자료구조 진화 — **Coarse → Fine → Optimistic → Lazy → Lock-Free**
- **Hand-over-hand locking** — 인접 두 노드만 락
- **Optimistic** — 락 없이 찾고 락 잡고 검증
- **Lazy** — logical / physical 삭제 분리
- **Lock-Free** — CAS + tagged pointer
- **Lazy**가 실용성과 성능의 가장 좋은 절충

## 다음 장 예고

다음 장은 **Concurrent Queue와 ABA 문제** — lock-free queue 디자인.

## 관련 항목

- [Ch 8: Monitors](/blog/parallel/parallel-principles/ch08-monitors-and-blocking-synchronization)
- [Ch 6: Universal Construction](/blog/parallel/parallel-principles/ch06-universality-of-consensus)
- [C++ Concurrency in Action Ch 6: Lock-based 자료구조](/blog/parallel/cpp-concurrency-in-action/chapter06-designing-lock-based-concurrent-data-structures)
