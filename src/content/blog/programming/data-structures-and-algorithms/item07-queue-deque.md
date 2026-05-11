---
title: "DSA 7: 큐 / 원형 큐 / 덱"
date: 2026-03-02T11:00:00
description: "FIFO 큐, 원형 버퍼의 wrap-around 트릭, 양쪽 끝 모두 가능한 덱."
tags: [Data Structure, Algorithm, Queue, Deque]
series: "Data Structures and Algorithms"
seriesOrder: 7
draft: false
---

## 한 줄 요약

> **"먼저 들어간 게 먼저 나온다 (FIFO)"** — 줄서기. 원형으로 만들면 메모리 낭비 없음.

## 어떤 문제를 푸는가

- **줄서기** — 식당, 프린터 큐, 스레드 풀 작업 큐
- **BFS** — 그래프 너비 우선 탐색
- **버퍼링** — 생산자-소비자, 키보드 입력 버퍼
- **스케줄링** — round-robin

공통: **들어온 순서대로 처리**.

## 한눈에 보는 구조

```
       front          rear
        ↓              ↓
       [A] [B] [C] [D]
       ▲              ▲
       dequeue        enqueue
```

연산:
- `enqueue(x)` — rear에 추가 — O(1)
- `dequeue()` — front 제거 + 반환 — O(1)
- `front()` — front 조회 — O(1)
- `empty()` — O(1)

## 단순 배열 큐의 함정

```
[_ _ A B C]
     ↑   ↑
     fr  rear

dequeue → [_ _ _ B C]
                ↑ ↑
                fr rear

enqueue X → [_ _ _ B C X]   ← 자리 부족? 앞은 비어있는데!
```

→ 앞쪽 빈 자리를 못 씀. 매번 앞으로 당기면 O(n).

## 해결: 원형 큐 (Circular Queue)

배열 끝과 시작을 **이어 붙임** (modulo 산술).

```
   [3]
   [4][2]
[5]      [1]    front = 1, rear = 5
   [0][6]
   [7]
```

인덱스가 끝에 도달하면 wrap-around:

```cpp
rear = (rear + 1) % CAPACITY;
```

## C++ 구현 — 원형 큐

```cpp
#include <stdexcept>

template<typename T, std::size_t N>
class CircularQueue {
    T data[N];
    int front = 0;
    int rear  = 0;
    int count = 0;
public:
    void enqueue(const T& x) {
        if (count == N) throw std::overflow_error("queue full");
        data[rear] = x;
        rear = (rear + 1) % N;
        ++count;
    }

    T dequeue() {
        if (count == 0) throw std::underflow_error("queue empty");
        T x = data[front];
        front = (front + 1) % N;
        --count;
        return x;
    }

    T peek() const {
        if (count == 0) throw std::underflow_error("queue empty");
        return data[front];
    }

    bool empty() const { return count == 0; }
    int size()  const { return count; }
};
```

`count` 변수로 full/empty 구분 — 안 쓰면 `front == rear`가 둘 다를 의미해 모호.

## C++ 구현 — STL `std::queue`

```cpp
#include <queue>

std::queue<int> q;
q.push(1);
q.push(2);
q.push(3);
std::cout << q.front();   // 1
q.pop();
std::cout << q.front();   // 2
```

내부 기본 컨테이너는 `std::deque`.

## C 구현 — 원형 큐

```c
#include <stdio.h>
#include <stdlib.h>

#define QUEUE_SIZE 100

typedef struct {
    int data[QUEUE_SIZE];
    int front;
    int rear;
    int count;
} CircularQueue;

void cq_init(CircularQueue* q) { q->front = q->rear = q->count = 0; }
int  cq_empty(const CircularQueue* q) { return q->count == 0; }
int  cq_full(const CircularQueue* q)  { return q->count == QUEUE_SIZE; }

void cq_enqueue(CircularQueue* q, int x) {
    if (cq_full(q)) { fprintf(stderr, "queue full\n"); exit(1); }
    q->data[q->rear] = x;
    q->rear = (q->rear + 1) % QUEUE_SIZE;
    q->count++;
}

int cq_dequeue(CircularQueue* q) {
    if (cq_empty(q)) { fprintf(stderr, "queue empty\n"); exit(1); }
    int x = q->data[q->front];
    q->front = (q->front + 1) % QUEUE_SIZE;
    q->count--;
    return x;
}
```

## 덱 (Deque, Double-Ended Queue)

양쪽 끝에서 모두 enqueue/dequeue 가능.

```
push_front  ↔  pop_front
                              [A][B][C][D]
                push_back  ↔  pop_back
```

C++ `std::deque` — 보통 **블록 리스트**(여러 청크의 배열) 구현.

```cpp
#include <deque>

std::deque<int> d;
d.push_back(1);    // [1]
d.push_front(0);   // [0, 1]
d.push_back(2);    // [0, 1, 2]
d.pop_front();     // [1, 2]
```

연산:
- `push_back/front`, `pop_back/front` — 모두 amortized O(1)
- 임의 접근 `d[i]` — O(1) (단 vector보다 약간 느림)
- 중간 삽입/삭제 — O(n)

## 우선순위 큐 (Priority Queue) 미리보기

가장 큰(또는 작은) 원소가 먼저 나옴 — FIFO 아님.

```cpp
#include <queue>
std::priority_queue<int> pq;   // 기본: max-heap
pq.push(3);
pq.push(1);
pq.push(5);
std::cout << pq.top();   // 5
```

내부는 **힙** — item 12에서 자세히.

## 시간 복잡도 비교

| | enqueue | dequeue | 임의 접근 | 메모리 |
| --- | --- | --- | --- | --- |
| **단순 배열 큐** | O(1) | O(n) (당기면) | O(1) | O(n) |
| **원형 배열 큐** | O(1) | O(1) | O(1) | O(n) 고정 |
| **연결 리스트 큐** | O(1) | O(1) | O(n) | O(n) 동적 |
| **`std::deque`** | amortized O(1) | amortized O(1) | O(1) | 블록 |
| **우선순위 큐 (heap)** | O(log n) | O(log n) | — | O(n) |

## 트레이드오프 — 한눈에

| 차원 | Queue (원형) |
| --- | --- |
| FIFO 처리 | ✅ |
| 모든 기본 연산 O(1) | ✅ |
| 메모리 효율 (원형) | ✅ wrap-around |
| 크기 동적 변경 | ❌ 고정 (vector 기반은 가능) |
| 양쪽 끝 접근 | ❌ — 덱 사용 |

## 실제 사례

- **OS 작업 스케줄러**, **프린터 큐**, **스레드 풀**
- **BFS** (item 21)
- **메시지 큐** (Kafka, RabbitMQ — 분산 큐)
- **키보드 입력 버퍼**
- **네트워크 패킷 큐**

## 다음

- [연결 리스트 — 단일·이중·원형](/blog/programming/data-structures-and-algorithms/item08-linked-list)
