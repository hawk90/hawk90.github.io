---
title: "Part 4-04: Lock-free Container"
date: 2026-05-16T04:00:00
description: "SPSC queue, MPMC stack, ring buffer — lock-free 자료구조 구현 패턴."
series: "Embedded C++ for Real Systems"
seriesOrder: 32
tags: [cpp, embedded, lock-free, queue, stack, ring-buffer, spsc, mpmc]
type: tech
---

## 한 줄 요약

> **"SPSC는 *atomic 변수 2개*면 끝."** — MPMC는 *복잡, 검증된 라이브러리* 권장.

## 어떤 문제를 푸는가

[Part 4-03](/blog/embedded/embedded-cpp/part4-03-lock-free-basics)이 *원리*. 이 글은 *실용적 자료구조 구현*.

임베디드에서 자주 등장:

- *ISR → main task* 통신 (SPSC)
- *Worker pool* (MPMC queue)
- *Free list* (lock-free pool)
- *Statistics counter* (atomic)

각 패턴의 *구현 + trade-off*.

## SPSC Ring Buffer — 가장 기본

Ring buffer의 구조는 다음과 같습니다. *Producer는 head만 전진*, *Consumer는 tail만 전진*하므로 두 인덱스가 같은 메모리를 동시에 건드릴 일이 없습니다.

![SPSC ring buffer — head/tail 분리](/images/blog/embedded-cpp/diagrams/part4-04-spsc-ring-buffer.svg)

[Part 4-03](/blog/embedded/embedded-cpp/part4-03-lock-free-basics)에서 본 코드를 다시 옮기면 다음과 같습니다.

```cpp
template<typename T, size_t N>
class SpscQueue {
    static_assert((N & (N - 1)) == 0, "N must be power of 2");

    T buffer_[N];
    alignas(64) std::atomic<size_t> head_{0};   // cache line 분리
    alignas(64) std::atomic<size_t> tail_{0};
    static constexpr size_t kMask = N - 1;

public:
    bool push(const T& value) {
        size_t h = head_.load(std::memory_order_relaxed);
        size_t next = (h + 1) & kMask;

        if (next == tail_.load(std::memory_order_acquire)) return false;

        buffer_[h] = value;
        head_.store(next, std::memory_order_release);
        return true;
    }

    bool pop(T& out) {
        size_t t = tail_.load(std::memory_order_relaxed);
        if (t == head_.load(std::memory_order_acquire)) return false;

        out = buffer_[t];
        tail_.store((t + 1) & kMask, std::memory_order_release);
        return true;
    }
};
```

핵심:
- *Producer는 head만 수정*, *Consumer는 tail만 수정*
- *서로의 변수를 acquire로 read*, *자기 것을 release로 write*
- `alignas(64)` — head와 tail을 *다른 cache line*에 (false sharing 회피)

## False Sharing — `alignas(64)` 의의

Multi-core에서 *같은 cache line*의 변수를 *다른 core가 동시 수정*하면 *cache invalidation*. 성능 폭락.

```cpp
struct Bad {
    std::atomic<size_t> a;   // core 1 사용
    std::atomic<size_t> b;   // core 2 사용
};   // 같은 cache line — false sharing

struct Good {
    alignas(64) std::atomic<size_t> a;
    alignas(64) std::atomic<size_t> b;
};   // 다른 cache line — no false sharing
```

ARM Cortex-A *multi-core*에서 *중요*. Cortex-M *single core*에선 *무관*. 그러나 *습관*으로 alignas.

## Lock-free Stack (Treiber Stack)

MPMC 가능한 *단순 lock-free stack*.

```cpp
template<typename T>
class TreiberStack {
    struct Node {
        T value;
        Node* next;
    };

    std::atomic<Node*> top_{nullptr};

public:
    void push(Node* node) {
        Node* old_top = top_.load(std::memory_order_relaxed);
        do {
            node->next = old_top;
        } while (!top_.compare_exchange_weak(
            old_top, node,
            std::memory_order_release,
            std::memory_order_relaxed));
    }

    Node* pop() {
        Node* old_top = top_.load(std::memory_order_acquire);
        while (old_top) {
            if (top_.compare_exchange_weak(
                old_top, old_top->next,
                std::memory_order_acquire,
                std::memory_order_acquire)) {
                return old_top;
            }
        }
        return nullptr;
    }
};
```

*MPMC*. 모든 thread가 *push/pop 모두 OK*.

문제: **ABA problem**. Pop이 *old_top->next 읽는데*, 다른 thread가 *old_top pop + 다른 노드 push + old_top push* 하면 *CAS 성공*하지만 *next pointer 잘못됨*.

해결:
- *Tagged pointer* (64-bit: ptr + counter)
- *Hazard pointer*

## Tagged Pointer

```cpp
template<typename Node>
struct TaggedPtr {
    Node* ptr;
    uintptr_t tag;
};

std::atomic<TaggedPtr<Node>> top;   // 16 byte atomic on 64-bit
```

ARM Cortex-M (32-bit)에선 *64-bit atomic 불가*. *32-bit pointer + 작은 counter packing*:

```cpp
struct PackedPtr {
    uint32_t value;   // 16-bit ptr (작은 주소 공간) + 16-bit tag
};
```

복잡. *작은 임베디드에선 lock-free MPMC 보통 회피*.

## Lock-free Free List

[Part 3-03 Pool Allocator](/blog/embedded/embedded-cpp/part3-03-pool-allocator)에 lock-free 버전.

```cpp
template<typename T, size_t N>
class LockFreePool {
    union Slot {
        alignas(T) std::byte storage[sizeof(T)];
        std::atomic<Slot*> next;
    };

    Slot slots_[N];
    std::atomic<Slot*> free_head_;

public:
    LockFreePool() {
        for (size_t i = 0; i < N - 1; ++i) {
            slots_[i].next.store(&slots_[i + 1], std::memory_order_relaxed);
        }
        slots_[N - 1].next.store(nullptr, std::memory_order_relaxed);
        free_head_.store(&slots_[0], std::memory_order_release);
    }

    T* allocate() noexcept {
        Slot* head = free_head_.load(std::memory_order_acquire);
        while (head) {
            Slot* next = head->next.load(std::memory_order_relaxed);
            if (free_head_.compare_exchange_weak(
                head, next,
                std::memory_order_release,
                std::memory_order_acquire)) {
                return reinterpret_cast<T*>(&head->storage);
            }
        }
        return nullptr;
    }

    void deallocate(T* p) noexcept {
        if (!p) return;
        Slot* slot = reinterpret_cast<Slot*>(p);
        Slot* head = free_head_.load(std::memory_order_relaxed);
        do {
            slot->next.store(head, std::memory_order_relaxed);
        } while (!free_head_.compare_exchange_weak(
            head, slot,
            std::memory_order_release,
            std::memory_order_relaxed));
    }
};
```

ABA 문제 가능. *주의*.

## Boost.Lockfree

Boost가 *검증된 lock-free 자료구조*.

```cpp
#include <boost/lockfree/spsc_queue.hpp>
#include <boost/lockfree/queue.hpp>
#include <boost/lockfree/stack.hpp>

// SPSC — 가장 빠름
boost::lockfree::spsc_queue<int, boost::lockfree::capacity<128>> q;

// MPMC — fixed capacity
boost::lockfree::queue<int, boost::lockfree::capacity<128>> mpmc_q;

// Stack — LIFO MPMC
boost::lockfree::stack<int, boost::lockfree::capacity<128>> stack;
```

Boost는 *내부적으로 tagged pointer + 정교한 알고리즘*. 직접 구현보다 *안전*.

임베디드에서 Boost 부담 — 일부 헤더만 포함 가능.

## moodycamel::ConcurrentQueue

가장 *fast MPMC*. Cameron Desrochers의 *고성능 lock-free queue*.

```cpp
#include <concurrentqueue.h>

moodycamel::ConcurrentQueue<int> q;
q.enqueue(42);
int v;
q.try_dequeue(v);
```

*수십 만 ops/sec*. 임베디드 multi-core에 *적합*.

## 임베디드 — ISR + 여러 task

```cpp
// ISR가 producer, 여러 task가 consumer
class EventBus {
    SpscQueue<Event, 256> queue_;
    SemaphoreHandle_t event_sem_;

public:
    // ISR에서 호출
    void post_isr(const Event& e) {
        if (queue_.push(e)) {
            BaseType_t woken = pdFALSE;
            xSemaphoreGiveFromISR(event_sem_, &woken);
            portYIELD_FROM_ISR(woken);
        }
    }

    // Task에서 호출
    bool wait(Event& out, TickType_t timeout) {
        if (queue_.pop(out)) return true;

        if (xSemaphoreTake(event_sem_, timeout) == pdTRUE) {
            return queue_.pop(out);
        }
        return false;
    }
};
```

*SPSC queue*로 ISR → 1 task. 여러 task면 *별도 queue*.

## 임베디드 — Atomic Counter

가장 단순 + 가장 흔한 패턴.

```cpp
std::atomic<uint32_t> packets_sent{0};
std::atomic<uint32_t> packets_dropped{0};

void send_packet() {
    if (try_send()) {
        packets_sent.fetch_add(1, std::memory_order_relaxed);
    } else {
        packets_dropped.fetch_add(1, std::memory_order_relaxed);
    }
}

uint32_t get_stats_sent() {
    return packets_sent.load(std::memory_order_relaxed);
}
```

*relaxed*로 충분 — *counter 자체가 의미*. *order 무관*.

## 측정 — SPSC queue 성능

```text
# Cortex-M4, 1M operations

Mutex-based queue:    ~10 M cycles
SPSC lock-free:       ~1.2 M cycles    (~8x faster)
Boost MPMC:           ~2.5 M cycles    (~4x faster)
moodycamel MPMC:      ~1.8 M cycles    (~5x faster)
```

SPSC가 *가장 빠름*. 그러나 *한 producer + 한 consumer*만.

## 자주 보는 함정과 안티패턴

### 1. *SPSC를 MPMC처럼 사용*
*Producer 둘이 push* → race. *SPSC는 정확히 한 producer*.

### 2. *Memory order seq_cst 남용*
기본 `seq_cst`는 *가장 느림*. 필요한 *최소 order*.

### 3. *큰 객체 atomic 시도*
```cpp
std::atomic<HugeStruct> obj;   // hardware atomic 안 됨 → mutex fallback
```
*pointer + atomic swap*.

### 4. *ABA problem 무시*
Treiber stack 같은 *복잡 lock-free*에 *tagged pointer*. 또는 *전문 라이브러리*.

### 5. *Cache line alignment 무시*
*false sharing*으로 *성능 폭락*. `alignas(64)`.

### 6. *retry loop 무한 반복 가능성*
Contention 높으면 *CAS 무한 retry*. *exponential backoff*나 *limit*.

```cpp
int retries = 0;
while (retries++ < 100) {
    if (cas(...)) break;
    // 짧은 wait
}
```

## ARM Cortex-M의 LDREX/STREX

`std::atomic`이 내부적으로 *LDREX/STREX 사용*.

```text
# atomic compare_exchange (간소화)
loop:
    LDREX  r0, [addr]      ; exclusive load
    CMP    r0, expected
    BNE    fail
    STREX  r1, new, [addr] ; exclusive store
    CMP    r1, #0           ; STREX 성공?
    BNE    loop             ; 실패시 retry
```

ARMv7-M *exclusive monitor*가 *atomic 보장*. 다른 master(DMA 등)가 *같은 주소 접근*하면 STREX *fail*.

**중요**: 일부 *peripheral 주소*는 exclusive monitor *지원 안 함*. *RAM만 안전*.

## Lock-free의 *실용 한계*

```text
사용 OK:
✓ ISR ↔ task 통신 (SPSC)
✓ Statistics counter (atomic)
✓ Flag/state (atomic)
✓ 검증된 라이브러리 사용 (Boost, moodycamel)

피하는 게 좋음:
✗ 직접 MPMC 구현 (ABA, hazard pointer 복잡)
✗ 복잡한 자료구조 (RB-tree, hash map)
✗ Cortex-M0/M0+ (atomic 미지원)

대안:
- Critical section (짧음)
- RTOS queue (xQueueSend) — 검증됨
- Mutex + condition variable
```

대부분 임베디드 multi-task는 *RTOS queue가 충분*. Lock-free는 *극한 성능 + ISR 통신*에만.

## 정리

- SPSC queue가 임베디드 lock-free의 표준이며, ISR과 task 통신에 적합합니다.
- Producer는 head, Consumer는 tail만 다루므로 서로 무관하며 CAS가 필요 없습니다.
- `alignas(64)`로 cache line을 정렬해 false sharing을 회피합니다.
- MPMC는 복잡하므로 검증된 라이브러리(Boost, moodycamel)를 사용합니다.
- ABA problem에는 tagged pointer나 hazard pointer를 쓰거나 MPMC 자체를 회피합니다.
- Cortex-M0/M0+는 atomic을 지원하지 않으므로 critical section을 사용합니다.

## 관련 항목

- [Part 4-03: Lock-free 기초](/blog/embedded/embedded-cpp/part4-03-lock-free-basics)
- [Part 3-03: Pool Allocator](/blog/embedded/embedded-cpp/part3-03-pool-allocator) — lock-free pool
- [Part 4-01: Intrusive Containers](/blog/embedded/embedded-cpp/part4-01-intrusive-containers)
- [Practical RTOS Internals](/blog/embedded/rtos/practical-internals)

## 다음 글

[Part 4-05: Type-safe Flags](/blog/embedded/embedded-cpp/part4-05-type-safe-flags) — *bit flag*를 *enum class*로 type-safe하게.
