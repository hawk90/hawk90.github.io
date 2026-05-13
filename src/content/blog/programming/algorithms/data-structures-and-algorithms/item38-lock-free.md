---
title: "DSA 38: Lock-free 자료구조 입문"
date: 2026-03-11T11:00:00
description: "atomic·CAS로 mutex 없이 — 단순 lock-free queue부터."
tags: [Data Structure, Algorithm, Concurrency, Lock-free, Atomic]
series: "Data Structures and Algorithms"
seriesOrder: 38
draft: false
draft: true
---

## 한 줄 요약

> **"mutex 없이 진행 보장 — atomic + CAS로 우아하게 (그러나 어렵게)"**

## 어떤 문제를 푸는가

mutex 기반 동시 자료구조의 단점:
- **블로킹** — 대기 시간 = bottleneck
- **deadlock** — 락 순서 잘못
- **priority inversion** — 낮은 우선순위가 높은 걸 막음
- **scalability** — 락 contention

→ **lock-free** = 한 스레드가 멈춰도 다른 스레드는 진행 가능.

## 핵심 도구 — `std::atomic` + CAS

### `std::atomic<T>`

분할되지 않은 read/write/RMW (Read-Modify-Write) 보장.

```cpp
std::atomic<int> counter{0};
counter.fetch_add(1);           // ++ atomic
int v = counter.load();
counter.store(42);
```

### CAS — Compare-And-Swap

```
CAS(addr, expected, new):
    if (*addr == expected) {
        *addr = new;
        return true;
    } else {
        expected = *addr;
        return false;
    }
```

원자적 — 다른 스레드가 끼어들 수 없음.

```cpp
std::atomic<int> x{5};
int expected = 5;
bool ok = x.compare_exchange_strong(expected, 10);   // x가 5면 10으로
```

대부분 lock-free 알고리즘의 토대.

## 단순 예 — Lock-free Counter

```cpp
class LockFreeCounter {
    std::atomic<int> count{0};
public:
    void increment() {
        count.fetch_add(1, std::memory_order_relaxed);
    }
    int get() const {
        return count.load(std::memory_order_relaxed);
    }
};
```

mutex 없이 thread-safe. `fetch_add`가 atomic.

## Lock-free Stack — Treiber's Stack

```
push:
    new_node = create
    do:
        new_node.next = head
    while CAS(head, head, new_node) fails

pop:
    do:
        old_head = head
        if old_head == null: return null
        next = old_head.next
    while CAS(head, old_head, next) fails
    return old_head
```

### C++ 구현

```cpp
template<typename T>
class LockFreeStack {
    struct Node {
        T value;
        Node* next;
    };
    std::atomic<Node*> head{nullptr};

public:
    void push(const T& v) {
        Node* node = new Node{v, head.load()};
        while (!head.compare_exchange_weak(node->next, node)) {
            // CAS 실패 시 head를 새로 읽어 다시 시도
        }
    }

    bool pop(T& out) {
        Node* old = head.load();
        while (old && !head.compare_exchange_weak(old, old->next)) {
        }
        if (!old) return false;
        out = old->value;
        delete old;   // ⚠️ ABA 문제 — 아래 참고
        return true;
    }
};
```

## ⚠️ ABA 문제

```
스레드 1: pop() 시작 — old_head = A, next = B
스레드 2: pop A → push C → pop C → push A    (A 메모리 재사용)
스레드 1: CAS(head, A, B) → 성공! 그러나 head는 사실 다른 A
                                   B는 이미 삭제됨 → 댕글링
```

해결:
- **Hazard Pointer** — 스레드별 안전 포인터 등록
- **Epoch-based reclamation** — 한 epoch가 끝나야 메모리 반환
- **참조 카운트** — `std::shared_ptr` (atomic)
- **Double-Width CAS** — pointer + counter 함께 CAS

→ 진짜 lock-free 자료구조는 **메모리 재활용이 매우 까다로움**.

## Lock-free Queue — Michael-Scott

가장 유명한 lock-free FIFO. 약 100줄, ABA 처리 포함. CLRS·논문 참고.

## Memory Order

`std::atomic` 연산엔 메모리 순서 옵션:

| | 의미 |
| --- | --- |
| `relaxed` | 순서 보장 X — 카운터 |
| `acquire` | 이후 read/write가 이 연산 이후에 |
| `release` | 이전 read/write가 이 연산 이전에 |
| `acq_rel` | 둘 다 |
| `seq_cst` | 가장 엄격 — 모든 스레드 일관 (default) |

성능 위해 weak 모델 사용 — 그러나 잘못 쓰면 race.

```cpp
std::atomic<bool> ready{false};
std::atomic<int> data{0};

// Thread 1
data.store(42, std::memory_order_relaxed);
ready.store(true, std::memory_order_release);   // 모든 이전 write 노출

// Thread 2
while (!ready.load(std::memory_order_acquire)) {}   // ready 전의 모든 write 보임
assert(data.load(std::memory_order_relaxed) == 42);   // 보장됨
```

## Lock-free vs Wait-free

| | Lock-free | Wait-free |
| --- | --- | --- |
| 보장 | 적어도 한 스레드 진행 | 모든 스레드가 유한 단계 안에 진행 |
| 구현 | 어려움 | 매우 어려움 |
| 성능 | 보통 | 종종 더 느림 |

대부분 실용은 lock-free.

## 표준 라이브러리

C++ 표준엔 lock-free 자료구조 없음. 외부:

- **Boost.Lockfree** — `lockfree::queue`, `lockfree::stack`, `lockfree::spsc_queue`
- **Folly** (Facebook) — `MPMCQueue`, `ProducerConsumerQueue`
- **Intel TBB** — 동시 컨테이너
- **moodycamel::ConcurrentQueue** — 인기 single-header

## Lock-free 패턴

| 패턴 | 사용 |
| --- | --- |
| **CAS 루프** | 모든 lock-free 기본 |
| **Hazard Pointer** | 메모리 재활용 안전 |
| **Read-Copy-Update (RCU)** | Linux kernel 표준 — 읽기 매우 자주, 쓰기 드뭄 |
| **Sequential Lock** | 짧은 read에 (writer 차단) |

## 실용 가이드

> ⚠️ **lock-free 자료구조 직접 구현은 매우 어려움** — 검증된 라이브러리 사용.

- 일반 동시성: **mutex + condition variable**이 충분 + 단순
- 핫패스: **검증된 lock-free 라이브러리** (Boost, Folly)
- 진짜 자체 구현: **수개월 + 광범위 테스트 + helgrind/tsan**

## 트레이드오프 — 한눈에

| 차원 | Lock-free |
| --- | --- |
| 진행 보장 | ✅ |
| deadlock 없음 | ✅ |
| 성능 (low contention) | 비슷하거나 약간 빠름 |
| 성능 (high contention) | ✅ 우월 |
| 구현 난이도 | ❌❌ 매우 어려움 |
| 디버깅 | ❌❌❌ |
| ABA·메모리 재활용 | ❌ |

## 실제 사례

- **Linux kernel** — RCU (전반)
- **Java `ConcurrentLinkedQueue`** — Michael-Scott
- **Java `java.util.concurrent.atomic`**
- **Go runtime** — lock-free queue 일부
- **수많은 게임 엔진** — single-producer single-consumer queue

## 다음

- [자료구조 선택 가이드](/blog/programming/algorithms/data-structures-and-algorithms/item39-selection-guide)
