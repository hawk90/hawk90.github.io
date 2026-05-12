---
title: "DSA 24: Min-Max Heap, Deap"
date: 2026-03-07T10:00:00
description: "양 끝 (최솟값·최댓값) 모두 O(log n)에 접근하는 이중 우선순위 큐."
tags: [Data Structure, Algorithm, Heap, Priority Queue]
series: "Data Structures and Algorithms"
seriesOrder: 24
draft: false
---

## 한 줄 요약

> **"한 자료구조로 min과 max 둘 다 O(log n)"** — 단일 힙은 한쪽만 가능.

## 어떤 문제를 푸는가

일반 힙(item 12):
- max-heap → max O(1), min O(n)
- min-heap → min O(1), max O(n)

**둘 다** 빠르게 필요한 경우:
- **중앙값 유지** — 양쪽 끝 잘라내기
- **이상치 검출** — 가장 큰·작은 K개 모두
- **양방향 우선순위 큐** — 둘 중 빠른 처리

→ Min-Max Heap 또는 Deap.

## Min-Max Heap

### 구조

완전 이진 트리. 레벨이 **min level과 max level 교대**.

<img src="/images/blog/dsa/diagrams/item24-min-max-heap.svg" alt="Min-max heap" style="max-width:100%; background:white; padding:8px; border-radius:6px;" />

규칙:
- min level 노드 ≤ 그 서브트리의 모든 노드
- max level 노드 ≥ 그 서브트리의 모든 노드

→ **루트 = 최솟값**, 루트의 두 자식 중 큰 것 = 최댓값.

### 삽입 (insert)

1. 마지막 자리에 추가
2. 부모와 비교, 부모가 max(min) level인지 확인
3. min level 노드라면 조부모와 비교, 더 작으면 swap (또는 부모와 비교)
4. 반복

상세 알고리즘 복잡 — 스킵.

### 삭제 (delete-min, delete-max)

- delete-min: 루트 제거, 마지막 노드 → 루트, sift-down
- delete-max: 루트의 두 자식 중 큰 것 제거, sift-down

### 시간 복잡도

| | 시간 |
| --- | --- |
| insert | O(log n) |
| find-min, find-max | O(1) |
| delete-min, delete-max | O(log n) |

코드는 일반 힙보다 복잡 — leveling 검사 필요.

## Deap (Double-ended Heap)

### 구조

루트가 비어 있고, 두 서브트리가 **min-heap 과 max-heap**.

<img src="/images/blog/dsa/diagrams/item24-deap.svg" alt="Deap 구조" style="max-width:100%; background:white; padding:8px; border-radius:6px;" />

각 min-heap 노드 ≤ 대응 max-heap 노드 (correspondence property).

### 시간 복잡도

| | 시간 |
| --- | --- |
| insert | O(log n) |
| find-min | O(1) |
| find-max | O(1) |
| delete-min, delete-max | O(log n) |

Min-Max Heap보다 코드 단순 — 두 표준 힙의 결합.

## C++ 구현 — Min-Max 두 우선순위 큐로 흉내

진짜 Min-Max Heap 구현은 복잡 — 실용에선 **두 개의 힙 + 동기화**가 흔함.

```cpp
#include <queue>
#include <unordered_map>

template<typename T>
class DualPriorityQueue {
    std::priority_queue<T> maxPq;
    std::priority_queue<T, std::vector<T>, std::greater<T>> minPq;
    std::unordered_map<T, int> deleted;

    void cleanMax() {
        while (!maxPq.empty() && deleted[maxPq.top()] > 0) {
            --deleted[maxPq.top()];
            maxPq.pop();
        }
    }
    void cleanMin() {
        while (!minPq.empty() && deleted[minPq.top()] > 0) {
            --deleted[minPq.top()];
            minPq.pop();
        }
    }

public:
    void push(const T& v) {
        maxPq.push(v);
        minPq.push(v);
    }

    T getMin() { cleanMin(); return minPq.top(); }
    T getMax() { cleanMax(); return maxPq.top(); }

    T popMin() {
        cleanMin();
        T v = minPq.top(); minPq.pop();
        ++deleted[v];   // 다른 힙에서 lazy delete
        return v;
    }

    T popMax() {
        cleanMax();
        T v = maxPq.top(); maxPq.pop();
        ++deleted[v];
        return v;
    }
};
```

**시간**: amortized O(log n) — lazy deletion으로 다른 힙 정리.
**메모리**: 2배.

## C++ 구현 — `std::set`으로 흉내 (단순)

`std::set`은 정렬된 균형 BST → 양 끝 O(log n).

```cpp
#include <set>

std::multiset<int> s;
s.insert(5); s.insert(3); s.insert(8); s.insert(1);

int min = *s.begin();      // 1
int max = *s.rbegin();     // 8

s.erase(s.begin());        // pop min
s.erase(--s.end());        // pop max
```

`O(log n)` 모든 연산. Heap만큼 빠르진 않지만 코드 깔끔.

## C 구현 — Deap 개념

```c
#define DEAP_SIZE 1000

typedef struct {
    int data[DEAP_SIZE];   // 0번 비움 (루트), 1: min-heap 루트, 2: max-heap 루트
    int size;
} Deap;

void deap_init(Deap* d) { d->size = 0; }

int deap_min(const Deap* d) {
    if (d->size == 0) return -1;
    return d->data[1];
}

int deap_max(const Deap* d) {
    if (d->size == 0) return -1;
    if (d->size == 1) return d->data[1];
    return d->data[2];
}

// insert / delete는 잎이 어느 heap인지에 따라 swap·correspondence 검사
// (긴 코드 — 생략)
```

## 응용

- **중앙값 유지 (Running Median)** — 두 힙(max + min) 표준 패턴
- **K번째 최대/최소** — top-K 갱신
- **A* 알고리즘**의 우선순위 큐
- **이상치 모니터링** — 최대·최소 동시

## 중앙값 유지 패턴

```cpp
class MedianFinder {
    std::priority_queue<int> maxPq;   // 작은 절반의 max
    std::priority_queue<int, std::vector<int>, std::greater<int>> minPq;   // 큰 절반의 min

public:
    void add(int v) {
        if (maxPq.empty() || v <= maxPq.top()) maxPq.push(v);
        else minPq.push(v);

        // 균형
        if (maxPq.size() > minPq.size() + 1) { minPq.push(maxPq.top()); maxPq.pop(); }
        if (minPq.size() > maxPq.size())     { maxPq.push(minPq.top()); minPq.pop(); }
    }

    double median() const {
        if (maxPq.size() > minPq.size()) return maxPq.top();
        return (maxPq.top() + minPq.top()) / 2.0;
    }
};
```

스트림에서 매 추가 O(log n), 중앙값 조회 O(1). LeetCode 단골.

## 트레이드오프 — 한눈에

| 차원 | Min-Max Heap / Deap |
| --- | --- |
| 양 끝 동시 접근 | ✅ O(log n) |
| 코드 복잡 | ❌ 일반 힙의 2~3배 |
| `std::set`으로 대체 가능 | ✅ — 정렬 트리 |
| 두 힙으로 흉내 가능 | ✅ — lazy delete |

## 실제 사례

- **A* / Dijkstra** 변형
- **OS 스케줄러** 일부
- **이상치 검출 시스템**
- **양방향 우선순위 큐** (드물게 필요)

## 다음

- [Leftist / Binomial / Fibonacci Heap](/blog/programming/algorithms/data-structures-and-algorithms/item25-mergeable-heaps)
