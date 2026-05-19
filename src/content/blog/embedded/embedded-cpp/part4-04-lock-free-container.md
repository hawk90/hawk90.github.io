---
title: "Part 4-04: Lock-free Container"
date: 2026-05-07T04:00:00
description: "SPSC queue, MPMC stack, ring buffer — lock-free 자료구조 구현 패턴."
series: "Embedded C++ for Real Systems"
seriesOrder: 32
tags: [cpp, embedded, lock-free, queue, stack, ring-buffer, spsc, mpmc]
type: tech
---

## 한 줄 요약

> **"SPSC는 atomic 변수 두 개면 끝납니다."** MPMC는 복잡하므로 검증된 라이브러리를 권장합니다.

## 어떤 문제를 푸는가

[Part 4-03](/blog/embedded/embedded-cpp/part4-03-lock-free-basics)에서 원리를 다뤘다면, 이 글은 실용적인 자료구조 구현을 다룹니다.

임베디드에서 자주 등장하는 패턴은 다음과 같습니다.

- ISR에서 main task로의 통신 (SPSC)
- Worker pool (MPMC queue)
- Free list (lock-free pool)
- Statistics counter (atomic)

각 패턴의 구현과 trade-off를 살펴봅니다.

## SPSC Ring Buffer — 가장 기본

Ring buffer의 구조는 다음과 같습니다. Producer는 head만 전진시키고 Consumer는 tail만 전진시키므로 두 인덱스가 같은 메모리를 동시에 건드릴 일이 없습니다.

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

핵심은 다음과 같습니다.

- Producer는 head만, Consumer는 tail만 수정합니다.
- 서로의 변수는 `acquire`로 읽고 자기 것은 `release`로 씁니다.
- `alignas(64)`로 head와 tail을 다른 cache line에 두어 false sharing을 회피합니다.

## False Sharing — `alignas(64)`의 의의

Multi-core에서 같은 cache line의 변수를 다른 core가 동시에 수정하면 cache invalidation이 일어나 성능이 폭락합니다.

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

ARM Cortex-A multi-core에서는 중요합니다. Cortex-M single core에서는 무관하지만 습관적으로 alignas를 붙입니다.

## Lock-free Stack (Treiber Stack)

MPMC가 가능한 단순한 lock-free stack입니다.

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

MPMC이며 모든 thread가 push/pop 모두 수행할 수 있습니다.

문제는 **ABA problem**입니다. Pop이 `old_top->next`를 읽는 중에 다른 thread가 `old_top`을 pop했다가 다른 노드를 push한 뒤 다시 `old_top`을 push하면, CAS는 성공하지만 next pointer가 잘못된 값을 가리킵니다.

해결책은 다음과 같습니다.

- Tagged pointer — 64-bit으로 ptr과 counter를 묶습니다.
- Hazard pointer를 사용합니다.

## Tagged Pointer

```cpp
template<typename Node>
struct TaggedPtr {
    Node* ptr;
    uintptr_t tag;
};

std::atomic<TaggedPtr<Node>> top;   // 16 byte atomic on 64-bit
```

ARM Cortex-M(32-bit)에서는 64-bit atomic이 불가능하므로 32-bit pointer에 작은 counter를 packing합니다.

```cpp
struct PackedPtr {
    uint32_t value;   // 16-bit ptr (작은 주소 공간) + 16-bit tag
};
```

구현이 복잡하므로 작은 임베디드에서는 lock-free MPMC를 보통 회피합니다.

## Lock-free Free List

[Part 3-03 Pool Allocator](/blog/embedded/embedded-cpp/part3-03-pool-allocator)의 lock-free 버전입니다.

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

ABA 문제가 발생할 수 있으므로 주의가 필요합니다.

## Boost.Lockfree

Boost가 검증된 lock-free 자료구조를 제공합니다.

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

Boost는 내부적으로 tagged pointer와 정교한 알고리즘을 쓰므로 직접 구현하는 것보다 안전합니다.

임베디드에서 Boost가 부담스럽다면 일부 헤더만 포함할 수 있습니다.

## moodycamel::ConcurrentQueue

가장 빠른 MPMC 구현으로, Cameron Desrochers의 고성능 lock-free queue입니다.

```cpp
#include <concurrentqueue.h>

moodycamel::ConcurrentQueue<int> q;
q.enqueue(42);
int v;
q.try_dequeue(v);
```

수십만 ops/sec를 달성하며 임베디드 multi-core에 적합합니다.

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

SPSC queue로 ISR에서 단일 task로 전달합니다. 여러 task가 받아야 한다면 queue를 따로 둡니다.

## 임베디드 — Atomic Counter

가장 단순하면서 가장 흔한 패턴입니다.

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

counter 값 자체가 의미를 갖고 순서는 무관하므로 `relaxed`로 충분합니다.

## 측정 — SPSC queue 성능

```text
# Cortex-M4, 1M operations

Mutex-based queue:    ~10 M cycles
SPSC lock-free:       ~1.2 M cycles    (~8x faster)
Boost MPMC:           ~2.5 M cycles    (~4x faster)
moodycamel MPMC:      ~1.8 M cycles    (~5x faster)
```

SPSC가 가장 빠르지만 producer와 consumer가 정확히 하나씩일 때만 쓸 수 있습니다.

## 자주 보는 함정과 안티패턴

### 1. SPSC를 MPMC처럼 사용
Producer 둘이 push하면 race가 발생합니다. SPSC는 producer가 정확히 하나여야 합니다.

### 2. Memory order `seq_cst` 남용
기본 `seq_cst`는 가장 느립니다. 필요한 최소 order만 씁니다.

### 3. 큰 객체에 atomic 시도
```cpp
std::atomic<HugeStruct> obj;   // hardware atomic 안 됨 → mutex fallback
```

pointer를 atomic swap하는 방식으로 우회합니다.

### 4. ABA problem 무시
Treiber stack 같은 복잡한 lock-free에는 tagged pointer를 적용하거나 전문 라이브러리를 사용합니다.

### 5. Cache line alignment 무시
false sharing으로 성능이 폭락합니다. `alignas(64)`로 분리합니다.

### 6. retry loop 무한 반복 가능성
Contention이 높으면 CAS retry가 무한히 반복될 수 있습니다. exponential backoff나 limit을 둡니다.

```cpp
int retries = 0;
while (retries++ < 100) {
    if (cas(...)) break;
    // 짧은 wait
}
```

## ARM Cortex-M의 LDREX/STREX

`std::atomic`은 내부적으로 LDREX/STREX를 사용합니다.

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

ARMv7-M의 exclusive monitor가 atomic을 보장합니다. DMA 같은 다른 master가 같은 주소에 접근하면 STREX가 실패합니다.

**중요**: 일부 peripheral 주소는 exclusive monitor를 지원하지 않으므로 RAM에서만 안전합니다.

## Lock-free의 실용적 한계

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

대부분의 임베디드 multi-task는 RTOS queue로 충분합니다. Lock-free는 극한 성능이 필요하거나 ISR 통신이 필요할 때만 씁니다.

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

[Part 4-05: Type-safe Flags](/blog/embedded/embedded-cpp/part4-05-type-safe-flags) — bit flag를 `enum class`로 type-safe하게.
