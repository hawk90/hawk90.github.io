---
title: "Chapter 15: Priority Queue"
date: 2026-05-12
description: "동시 우선순위 큐 — Heap 기반 / Skiplist 기반 / Linden-Jonsson Relaxed PQ."
series: "The Art of Multiprocessor Programming"
seriesOrder: 15
tags: [parallel, concurrency, book-review, amp, priority-queue, heap]
type: book-review
bookTitle: "The Art of Multiprocessor Programming"
bookAuthor: "Maurice Herlihy, Nir Shavit"
draft: true
---

> **The Art of Multiprocessor Programming** Chapter 15 요약

## 15.1 Priority Queue의 동시성 도전

Priority Queue (PQ) — 우선순위가 가장 높은 원소를 빠르게 꺼낸다.

```
insert(x, priority)
extractMin() / extractMax()
```

**자연스러운 병렬성이 없다**. 모든 extract가 한 점 — 가장 우선 — 을 향한다. 그 점이 hot spot.

이게 PQ의 본질적 어려움. Stack/Queue/Hash와는 본질적으로 다르다.

## 15.2 Heap 기반 PQ

순차 PQ의 표준 — Binary Heap.

```
Heap (min-heap):
        1
       / \
      3   2
     / \ / \
    7  5 8  4
```

- O(log N) insert, extractMin
- 배열로 구현 가능 (캐시 친화적)

**동시 구현의 어려움** — heap 연산은 sift-up / sift-down으로 위에서 아래까지 가로지른다. 락을 어디까지 잡을지 모름.

### Hunt et al.의 Concurrent Heap

각 노드에 락. **bottom-up insert + top-down extract**.

```python
def insert(x, priority):
    # 1. 락 없이 leaf에 넣음
    # 2. 부모와 비교하면서 sift-up (각 단계마다 락)
    # 3. 다른 스레드와 충돌 가능 — 신중한 락 순서
```

복잡하다. 그리고 root 근처에서 경합이 폭발.

## 15.3 Skiplist 기반 PQ

14장의 skiplist를 그대로 사용. 가장 작은 원소는 리스트의 head 다음 노드.

```
Skiplist:
head → 1 → 3 → 5 → 7 → 10 → ...
       ↑
    extractMin은 이걸 꺼냄
```

**Insert**: 정렬된 위치 찾고 lock-free 삽입.
**ExtractMin**: head.next를 꺼냄.

**문제** — extractMin도 결국 head 근처에서 경합. Skiplist의 동시성 이득이 PQ에서는 약함.

## 15.4 Relaxed Priority Queue

핵심 통찰 — **엄격한 우선순위가 정말 필요한가?**

```
엄격한 PQ: extractMin은 가장 작은 원소를 반환
Relaxed PQ: extractMin은 가장 작은 K개 중 하나를 반환 (K는 작은 상수)
```

엄밀히는 잘못된 답이지만, 대부분의 응용에서 K가 작으면 충분.

**예** — 작업 스케줄러. 우선순위가 가장 높은 작업을 처리하고 싶지만, K개의 차이는 큰 문제가 아님.

## 15.5 Linden-Jonsson Relaxed PQ

Linden과 Jonsson의 2013년 알고리즘. Skiplist를 기반으로 한 relaxed PQ.

**아이디어**:

- Skiplist 사용 (정렬)
- extractMin이 head.next부터 K개 안에서 **랜덤하게** 선택
- 여러 스레드가 다른 노드를 동시에 extract → 경합 분산

```python
def extractMin():
    pos = random(0, K)
    target = head.next
    for i in range(pos):
        target = target.next
    # CAS로 target을 marked
    if mark(target):
        return target.item
```

**핵심** — K개 중 하나만 처리하면 되므로 N 스레드가 N개의 다른 노드를 처리 가능. Hot spot 분산.

**성능** — N 스레드에서 거의 N배 빠름. Linden-Jonsson은 PQ 동시성의 큰 진전.

## 15.6 SprayList — 더 강한 분산

Alistarh et al.의 2014년 알고리즘. Skiplist를 위에서부터 랜덤 워크.

```
Level 3: head ─ A ─ B ─ C
                 │
                 ↓ random walk
                 │
Level 2: head ─ A ─ B ─ C ─ D
                       │
Level 0: head ─ ... 일부 노드
```

위 레벨에서 랜덤 워크 → 아래 레벨에서 가까운 노드 extract.

**장점**:
- Spread가 매우 큼 — 여러 스레드가 거의 충돌 안 함
- 평균적으로 K = O(N log N) 같은 비교적 큰 K

**단점**:
- 정확도가 더 약함 (반환값이 글로벌 최소에서 멀 수 있음)

## 15.7 작업 스케줄링의 실용성

PQ의 가장 흔한 응용 — **작업 큐**.

```
스레드 풀:
- 각 스레드가 PQ에서 작업을 꺼냄
- 우선순위 높은 작업 먼저
```

이 컨텍스트에서.

- **Strict PQ**: 가장 우선 작업이 정확히 먼저 — 그러나 hot spot
- **Relaxed PQ**: 거의 우선 — 충분, 그리고 빠름

실전에서는 거의 항상 relaxed PQ. 또는 다중 PQ (각 스레드가 자기 큐) + work stealing (16장에서).

## 15.8 Multi-Queue PQ

각 스레드(또는 sharded group)가 자기 작은 PQ를 가진다.

```
Thread 1 PQ: [a, b, c]
Thread 2 PQ: [d, e, f]
Thread 3 PQ: [g, h, i]

extractMin:
- 자기 PQ에서 꺼냄 (낮은 경합)
- 비었으면 다른 PQ에서 work stealing
```

**장점**: 극도로 적은 경합.
**단점**: 글로벌 최소가 반환된다는 보장 거의 없음.

이게 모던 work-stealing 스케줄러(Cilk, Tokio, Go)의 기본 구조.

## 15.9 PQ는 본질적으로 어렵다

이 챕터의 메시지 — **모든 자료구조가 동시 친화적이지 않다**.

- Stack, Queue, Hash: 자연스러운 병렬성 있음
- Sorted List, Skiplist: 어느 정도 있음
- **Priority Queue: 본질적으로 hot spot 있음**

PQ를 강제로 lock-free로 만들 수는 있다. 그러나 **strict semantics + 좋은 성능 + lock-free**의 셋을 동시에는 불가능에 가깝다.

대신 **semantics를 약하게** 해서 (relaxed) 성능을 얻는다. 또는 **자료구조 자체를 바꿔서** (multi-queue + work stealing) 다른 모델을 채택.

## 15.10 실용적 권장

| 상황 | 추천 |
|---|---|
| 순차 PQ | `std::priority_queue` |
| 짧은 임계 + strict | mutex + heap |
| 동시 + relaxed OK | Linden-Jonsson 또는 라이브러리 |
| 작업 스케줄링 | Multi-queue + work stealing |
| 분산 시스템 | Tokio / async runtime |

직접 lock-free PQ는 거의 항상 잘못. 라이브러리 사용 권장.

## 정리

- PQ는 **본질적으로 hot spot** — 모든 extract가 한 점을 향함
- **Heap 기반** 동시 PQ는 복잡하고 경합 심함
- **Skiplist 기반**도 head 근처 경합 존재
- **Relaxed PQ** — semantics 양보로 성능 얻기 (Linden-Jonsson, SprayList)
- 실용적으로는 **multi-queue + work stealing** (모던 스케줄러)
- 모든 자료구조가 동시 친화적이진 않다 — **PQ는 어려운 케이스**

## 다음 장 예고

다음 장은 **Futures, Scheduling, Work Distribution** — work stealing의 정식 다룸.

## 관련 항목

- [Ch 14: Skiplists](/blog/parallel/parallel-principles/ch14-skiplists-and-balanced-search)
- [C++ Concurrency in Action Ch 9: 스레드 풀](/blog/parallel/cpp-concurrency-in-action/chapter09-advanced-thread-management)
