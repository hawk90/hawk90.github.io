---
title: "Chapter 14: Skiplist와 균형 검색"
date: 2026-05-12
description: "Skiplist의 동시성 친화성. Lock-Free Skiplist. 균형 트리(BST)가 동시성에 부적합한 이유."
series: "The Art of Multiprocessor Programming"
seriesOrder: 14
tags: [parallel, concurrency, book-review, amp, skiplist, lock-free]
type: book-review
bookTitle: "The Art of Multiprocessor Programming"
bookAuthor: "Maurice Herlihy, Nir Shavit"
draft: true
---

> **The Art of Multiprocessor Programming** Chapter 14 요약

## 14.1 정렬된 검색의 동시성

이전 챕터들은 stack / queue / hash 같은 **순서 없는** 자료구조였다. 정렬된 자료구조는 더 어렵다.

```
연산:
- contains(x): x가 있는가?
- add(x): x를 정렬 위치에 삽입
- remove(x): x 제거
- successor(x): x보다 큰 가장 작은 값
- predecessor(x): x보다 작은 가장 큰 값
```

균형 이진 트리 (Red-Black, AVL)가 순차에서는 표준. 그러나 **동시에서는 부적합**.

## 14.2 균형 트리의 동시성 문제

```
        50
       /  \
      30   70
     /  \   \
    20  40  80
```

삽입/삭제 시 **rebalancing**이 트리의 큰 부분을 만진다. 회전(rotation)은 여러 노드의 포인터를 동시에 갱신해야 한다.

```
80 추가 후 rebalance:
회전 ── 여러 부모 자식 관계 동시 갱신
```

- 락을 잡기 어렵다 (어디까지 잡을지 모름)
- Lock-free 구현이 매우 복잡 (다중 포인터 atomic 갱신)
- 회전 중 동시 작업이 깨질 위험

이게 **균형 트리가 동시성에서 거의 쓰이지 않는** 이유.

## 14.3 Skiplist — 정렬과 동시성의 친구

W. Pugh가 1989년 발명한 자료구조. 균형 트리의 대안.

![Skiplist 구조](/images/blog/parallel/diagrams/skiplist-structure.svg)

**Skiplist의 핵심**:

- 각 노드가 **랜덤 높이** (1, 2, 3, ...)를 가짐
- 높이 h의 노드는 0~h-1 레벨의 리스트에 모두 등장
- 평균 O(log N) 검색
- 균형 트리와 같은 성능, 그러나 회전 없음

### 검색

```python
def contains(x):
    pred = head
    for level from MAX_LEVEL down to 0:
        while pred.next[level].item < x:
            pred = pred.next[level]
        # pred는 x보다 작은 마지막 노드
    if pred.next[0].item == x:
        return true
    return false
```

위 레벨에서 빠르게 건너뛰고, 아래 레벨로 갈수록 정밀하게.

### 삽입

```python
def add(x):
    height = randomHeight()  # geometric distribution
    newNode = Node(x, height)
    
    # 각 레벨에서 predecessor 찾고 newNode 연결
    for level from 0 to height-1:
        # ... predecessor 갱신 ...
```

회전이 없다. 단지 각 레벨의 리스트에 삽입.

## 14.4 왜 Skiplist가 동시성에 좋은가

균형 트리와 달리.

- **국소적 수정** — 한 키 삽입/삭제는 그 키 주변의 몇 노드만 만짐
- **회전 없음** — 다중 포인터 atomic 갱신 불필요
- **각 레벨이 독립** — 위 레벨이 깨져도 아래 레벨에서 정확성 회복 가능

Lock-free 구현이 균형 트리보다 훨씬 단순. 그래서 모든 모던 동시성 라이브러리에 skiplist 기반 정렬 컨테이너가 있다.

- `java.util.concurrent.ConcurrentSkipListMap`
- `tbb::concurrent_unordered_set`
- ...

## 14.5 Lock-Free Skiplist

기본 구조는 9장의 lock-free linked list를 각 레벨마다 적용한 것.

```python
class LockFreeSkiplist<T>:
    head: Node  # MAX_LEVEL 높이의 sentinel
    
    def add(x):
        height = randomHeight()
        newNode = Node(x, height)
        
        # 각 레벨에서 lock-free linked list와 같은 방식
        # CAS로 next 포인터 갱신
        # logical/physical 삭제 (marked bit)
        ...
```

세부 구현은 매우 복잡 — Pugh가 1989년에 단순화한 lock-based 버전을 제시하고, Fraser/Harris 등이 2000년대에 lock-free 버전을 완성.

## 14.6 Lazy Skiplist

복잡한 lock-free 대신 lazy 패턴 (9장과 같은 방식) 적용한 skiplist.

```
각 노드:
- 높이별 next 포인터들
- marked 플래그 (logical 삭제)
- locks (각 레벨)

add/remove:
- 락 없이 찾기
- 락 잡고 검증
- 통과하면 수정 (CAS 또는 락 안에서)
```

Lock-free보다 단순하면서 비슷한 성능. 실용적으로 자주 쓰이는 형태.

## 14.7 다른 정렬 자료구조

skiplist 외에 동시성 정렬 자료구조.

**B-Tree**

- 디스크 기반 정렬에 표준
- 동시 B-Tree: B-link tree (1981), OLFIT
- 위에서 아래로 잠그며 내려가는 latching

**Hopscotch Hashing**

- 정렬은 아니지만 cache-friendly
- 가까운 bucket으로 swap하며 충돌 해결

**LSM Tree**

- Log-Structured Merge Tree
- LevelDB, RocksDB, Cassandra
- 쓰기 최적, 동시성 친화적

각각 다른 사용 사례. 메모리 정렬은 skiplist, 디스크 정렬은 B-tree, 쓰기 집약은 LSM tree.

## 14.8 균형 트리는 죽었나

순차에서는 여전히 균형 트리가 표준 (`std::map`, `TreeMap`). 동시에서는 거의 안 쓰임.

이유 — 위에서 설명한 회전의 동시성 문제. 그리고 skiplist가 같은 성능을 동시 친화적으로 제공.

다만 균형 트리의 lock-free 변형 연구는 계속된다. 예: BST with relaxed balance, k-tree 등.

## 14.9 Skiplist의 단점

완벽한 자료구조는 없다. Skiplist의 단점.

**1. 메모리 오버헤드**

각 노드가 평균 2개의 다음 포인터. 8 byte × 2 = 16 byte 오버헤드 per node. 균형 트리(8 byte × 2 = 16 byte)와 비슷하지만, 노드 수가 같으면 노드 자체가 다양한 높이라 캐시 친화성이 더 나쁠 수 있음.

**2. 랜덤성**

높이가 랜덤이라 worst case가 이론상 가능 (매우 드물지만). 균형 트리는 worst case가 보장.

**3. 캐시**

균형 트리는 노드의 자식이 메모리에 묶이도록 배치 가능. Skiplist는 어렵다.

따라서 **메모리 정렬, 동시성 필요** → Skiplist. **순차, worst case 보장 필요** → 균형 트리.

## 정리

- 균형 이진 트리는 **동시성에 부적합** — 회전이 다중 포인터 갱신
- **Skiplist** — 같은 성능, 회전 없음, 동시 친화적
- Lock-Free Skiplist는 lock-free linked list의 각 레벨 적용
- 실용적으로는 **Lazy Skiplist** 또는 striped lock 기반
- 정렬된 동시 컨테이너의 사실상 표준 — skiplist

## 다음 장 예고

다음 장은 **Priority Queue** — 우선순위 큐의 동시성 구현.

## 관련 항목

- [Ch 13: Hashing](/blog/parallel/parallel-principles/ch13-concurrent-hashing-and-natural-parallelism)
- [Ch 9: Linked Lists](/blog/parallel/parallel-principles/ch09-linked-lists-the-role-of-locking)
