---
title: "DSA 12: 힙 / 우선순위 큐"
date: 2026-06-03T12:00:00
description: "완전 이진 트리 + 부모-자식 순서 = 힙. 우선순위 큐의 표준 구현."
tags: [Data Structure, Algorithm, Heap, Priority Queue]
series: "Data Structures and Algorithms"
seriesOrder: 12
draft: true
---

## 한 줄 요약

> **"가장 큰 (또는 작은) 값을 항상 O(log n)에 꺼내고 넣는다"** — 우선순위 큐의 표준 구현.

## 어떤 문제를 푸는가

- **작업 스케줄링** — 우선순위 높은 작업 먼저
- **Dijkstra 최단 경로** — 가장 가까운 노드 꺼냄
- **A* / 게임 AI** — 휴리스틱 + 비용
- **이벤트 시뮬레이션** — 가장 빠른 다음 이벤트
- **스트림 top-K** — 큰 값 K개만

→ "다음으로 처리할 가장 우선순위 높은 것"이 필요.

정렬해두고 꺼내면? — 매 삽입이 O(n). 힙이 O(log n).

## 한눈에 보는 구조

**완전 이진 트리** + **힙 속성**:
- **Max-heap**: 부모 ≥ 자식 (루트가 최댓값)
- **Min-heap**: 부모 ≤ 자식 (루트가 최솟값)

```
         50         (max-heap)
        /  \
       30   40
      / \   /
     10 20 35
```

부모-자식 관계만 정의 — 형제 간 순서는 X.

## 배열로 표현

완전 이진 트리는 **배열 인덱스만으로 부모·자식 계산** 가능 — 포인터 불필요.

```
인덱스:  0   1   2   3   4   5
값:    [50, 30, 40, 10, 20, 35]

      50 (0)
     /     \
   30 (1)   40 (2)
   /  \    /
  10  20  35
  (3) (4) (5)
```

부모·자식 관계 (1-indexed로 단순화):
- 노드 i의 **부모**: `i / 2`
- 노드 i의 **왼쪽 자식**: `2i`
- 노드 i의 **오른쪽 자식**: `2i + 1`

(0-indexed면 `(i-1)/2`, `2i+1`, `2i+2`.)

## 핵심 연산

### Insert — heapify up (sift up)

1. 마지막 자리에 추가
2. 부모와 비교, 더 크면 swap
3. 루트까지 또는 부모가 더 크면 종료

```
[50, 30, 40, 10, 20]   ← 60 추가
[50, 30, 40, 10, 20, 60]
            ↑ 5번 인덱스, 부모 = 인덱스 2 (40)
60 > 40 → swap
[50, 30, 60, 10, 20, 40]
        ↑ 2번 인덱스, 부모 = 0 (50)
60 > 50 → swap
[60, 30, 50, 10, 20, 40]
```

O(log n).

### Extract Max — heapify down (sift down)

1. 루트 = 결과 보관
2. 마지막 원소를 루트로
3. 자식 중 큰 쪽과 비교, 더 작으면 swap
4. leaf까지 또는 자식보다 크면 종료

O(log n).

## C++ 구현 — Max-heap (1-indexed)

```cpp
#include <vector>
#include <stdexcept>

template<typename T>
class MaxHeap {
    std::vector<T> heap;   // heap[0]은 dummy

public:
    MaxHeap() : heap(1) {}   // 1-indexed

    void push(const T& v) {
        heap.push_back(v);
        siftUp(heap.size() - 1);
    }

    T pop() {
        if (heap.size() < 2) throw std::underflow_error("empty");
        T top = heap[1];
        heap[1] = heap.back();
        heap.pop_back();
        if (heap.size() > 1) siftDown(1);
        return top;
    }

    T top() const {
        if (heap.size() < 2) throw std::underflow_error("empty");
        return heap[1];
    }

    bool empty() const { return heap.size() < 2; }
    int  size()  const { return heap.size() - 1; }

private:
    void siftUp(int i) {
        while (i > 1 && heap[i / 2] < heap[i]) {
            std::swap(heap[i / 2], heap[i]);
            i /= 2;
        }
    }

    void siftDown(int i) {
        int n = heap.size();
        while (2 * i < n) {
            int j = 2 * i;
            if (j + 1 < n && heap[j] < heap[j + 1]) ++j;   // 큰 자식
            if (heap[i] >= heap[j]) break;
            std::swap(heap[i], heap[j]);
            i = j;
        }
    }
};

// 사용
MaxHeap<int> h;
h.push(10); h.push(30); h.push(20); h.push(50); h.push(40);
while (!h.empty()) std::cout << h.pop() << " ";   // 50 40 30 20 10
```

## C++ 구현 — STL `std::priority_queue`

```cpp
#include <queue>

std::priority_queue<int> pq;   // max-heap (기본)
pq.push(10); pq.push(30); pq.push(20);
std::cout << pq.top();   // 30
pq.pop();

// min-heap
std::priority_queue<int, std::vector<int>, std::greater<int>> minPq;
```

## C 구현

```c
#include <stdio.h>

#define HEAP_CAPACITY 1000

typedef struct {
    int data[HEAP_CAPACITY + 1];   // 1-indexed
    int size;
} MaxHeap;

void heap_init(MaxHeap* h) { h->size = 0; }

static void swap(int* a, int* b) { int t = *a; *a = *b; *b = t; }

void heap_push(MaxHeap* h, int v) {
    h->data[++h->size] = v;
    int i = h->size;
    while (i > 1 && h->data[i / 2] < h->data[i]) {
        swap(&h->data[i / 2], &h->data[i]);
        i /= 2;
    }
}

int heap_pop(MaxHeap* h) {
    int top = h->data[1];
    h->data[1] = h->data[h->size--];
    int i = 1;
    while (2 * i <= h->size) {
        int j = 2 * i;
        if (j + 1 <= h->size && h->data[j] < h->data[j + 1]) ++j;
        if (h->data[i] >= h->data[j]) break;
        swap(&h->data[i], &h->data[j]);
        i = j;
    }
    return top;
}
```

## Build-heap — O(n) 일괄 구축

배열 → 힙으로 만들 때 매 push 하면 O(n log n). **leaf 제외 모든 노드에서 siftDown**하면 O(n) — 더 빠름.

```cpp
template<typename T>
void buildHeap(std::vector<T>& arr) {
    int n = arr.size();
    for (int i = (n - 2) / 2; i >= 0; --i)   // 마지막 비-leaf부터
        siftDown(arr, i, n);
}
```

수학적으로 O(n) — 깊은 노드는 적고 siftDown 짧음, 얕은 노드는 많지만 siftDown은 적음.

## 응용 — 힙 정렬 (Heap Sort)

1. Build-heap O(n)
2. 루트(최댓값)를 마지막 자리와 swap, 힙 크기 -1, siftDown
3. n-1번 반복

→ **O(n log n)**. In-place. 자세히는 [item 16](/blog/programming/data-structures-and-algorithms/item16-heap-sort).

## 시간 복잡도

| 연산 | 시간 |
| --- | --- |
| push | O(log n) |
| pop | O(log n) |
| top | O(1) |
| build (n개 일괄) | O(n) |
| size, empty | O(1) |

## 트레이드오프 — 한눈에

| 차원 | Heap |
| --- | --- |
| top 접근 | ✅ O(1) |
| push/pop | ✅ O(log n) |
| 임의 검색 | ❌ O(n) — 정렬된 게 아님 |
| 임의 삭제 | ❌ O(n) (위치 모르면) |
| 정렬된 순회 | ❌ pop 반복 — O(n log n) |
| in-place 가능 | ✅ 배열로 |

## 실제 사례

- **`std::priority_queue`**, Java `PriorityQueue`
- **Dijkstra / A*** (item 24)
- **OS 스케줄러** (priority queue)
- **이벤트 시뮬레이션** (event scheduling)
- **Huffman 코딩** (item 27)

## 다음

- [BST — 삽입·삭제·균형 한계](/blog/programming/data-structures-and-algorithms/item13-binary-search-tree)
