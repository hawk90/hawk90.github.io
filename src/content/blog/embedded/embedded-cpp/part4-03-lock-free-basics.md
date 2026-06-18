---
title: "임베디드 Lock-free 기초 — atomic·memory ordering·CAS"
date: 2026-05-01T09:31:00
description: "Atomic, CAS, memory order — mutex 없이 동시성. 임베디드의 ISR-safe 패턴."
series: "Embedded C++ for Real Systems"
seriesOrder: 31
tags: [cpp, embedded, lock-free, atomic, cas, memory-order, isr]
type: tech
---

## 한 줄 요약

> **"Lock-free는 mutex 없이 atomic operation으로 동기화하는 방식입니다."** 짧고 deterministic하며 ISR에서도 안전합니다.

## 어떤 문제를 푸는가

Mutex는 다음과 같은 비용을 동반합니다.

- context switch가 발생해 RTOS task가 block됩니다.
- Priority inversion이 일어납니다. 낮은 priority가 lock을 잡으면 높은 priority가 막힙니다.
- Deadlock 가능성이 있습니다. 두 개 이상의 mutex를 잘못 잡으면 발생합니다.
- 대부분의 RTOS에서 ISR은 mutex를 쓸 수 없습니다.

**Lock-free**는 mutex 없이 동시에 접근하면서 atomic 명령으로 consistency를 보장합니다.

```cpp
// Mutex 기반
std::mutex m;
int counter = 0;
void increment() {
    std::lock_guard lock(m);
    counter++;
}

// Lock-free
std::atomic<int> counter{0};
void increment() {
    counter.fetch_add(1);   // atomic
}
```

ARM Cortex-M의 atomic instruction(LDREX/STREX)이 하드웨어 레벨에서 이를 보장합니다.

## std::atomic — 기본

```cpp
#include <atomic>

std::atomic<int> counter{0};

counter.store(42);
int v = counter.load();
counter.fetch_add(1);          // counter++ (atomic)
int old = counter.exchange(0); // 교체

// Compare-and-swap
int expected = 5;
bool success = counter.compare_exchange_weak(expected, 10);
// counter == 5면 10으로 변경 + true
// 아니면 expected = current value + false
```

ARM Cortex-M에서 4-byte atomic은 single instruction이며 load/store가 자연스럽게 atomic입니다.

`fetch_add`나 `compare_exchange`는 LDREX/STREX를 사용합니다.

## CAS — Compare-And-Swap

Lock-free의 핵심 도구입니다. 값을 비교해서 일치하면 새 값으로 교체하는 동작 전체가 하나의 atomic 명령으로 실행됩니다. 다른 스레드가 끼어들면 CAS가 실패하고, 최신 값을 다시 읽어 재시도합니다.

![CAS retry loop — 실패 후 reload-and-retry 흐름](/images/blog/embedded-cpp/diagrams/part4-03-cas-retry.svg)

```cpp
std::atomic<Node*> head{nullptr};

void push(Node* n) {
    Node* old_head = head.load();
    do {
        n->next = old_head;
    } while (!head.compare_exchange_weak(old_head, n));
    // CAS 성공할 때까지 retry
}
```

흐름은 다음과 같습니다.

1. `head`의 현재 값을 `old_head`로 읽습니다.
2. `n->next = old_head`로 설정합니다.
3. CAS로 `head == old_head`면 `n`으로 교체합니다.
4. 다른 thread가 끼어들어 `head`가 변경되었으면 CAS가 실패하므로 retry합니다.

retry loop이 lock-free의 특징이며 deadlock이 없습니다. 다만 contention이 높으면 starvation이 발생할 수 있습니다.

## ABA Problem

CAS의 함정입니다. 값이 A → B → A로 바뀌어도 CAS는 성공합니다.

```cpp
// Thread 1: pop 시도
Node* old_top = top.load();        // = A
// (이때 Thread 2가 A pop, B push, A push)
// 이제 top = A지만 *A->next는 변경*
top.compare_exchange_weak(old_top, old_top->next);
// CAS 성공 — 그러나 old_top->next는 잘못된 값
```

해결책은 다음과 같습니다.

- Tagged pointer — pointer + counter를 묶어 64-bit으로 다룹니다.
- Hazard pointer — 다른 thread가 현재 사용 중인 pointer를 추적합니다.
- Epoch-based reclamation — gc 비슷한 방식입니다.

임베디드에서는 간단한 경우에만 lock-free를 씁니다. ABA 회피가 복잡해진다면 mutex가 나을 때도 많습니다.

## Memory Order

`std::atomic` 연산은 memory ordering 인자를 받습니다.

```cpp
counter.store(1, std::memory_order_relaxed);
counter.load(std::memory_order_acquire);
counter.fetch_add(1, std::memory_order_release);
counter.compare_exchange_weak(expected, new_value,
                                std::memory_order_seq_cst,
                                std::memory_order_acquire);
```

| Order | 의미 | 사용 |
| --- | --- | --- |
| `relaxed` | 순서 보장 없음 | counter만 |
| `acquire` | load — 이후 memory 작업이 *이전으로 옮겨가지 않음* | reader |
| `release` | store — 이전 memory 작업이 *이후로 옮겨가지 않음* | writer |
| `acq_rel` | acquire + release | RMW |
| `seq_cst` | 모든 thread가 *같은 순서* (기본) | 강한 보장 |

대부분의 임베디드 코드는 `acquire`/`release`를 활용해 `seq_cst`보다 빠르게 만듭니다.

## 임베디드 — ISR-safe Counter

```cpp
std::atomic<uint32_t> tick_count{0};

extern "C" void SysTick_Handler() {
    tick_count.fetch_add(1, std::memory_order_relaxed);
}

uint32_t get_uptime_ms() {
    return tick_count.load(std::memory_order_relaxed);
}
```

ISR과 main에서 동시에 접근해도 atomic이라 안전하고 lock도 필요 없습니다.

## 임베디드 — Lock-free SPSC Queue

Single Producer Single Consumer 패턴이며, 가장 단순한 lock-free queue입니다.

```cpp
template<typename T, size_t N>
class SpscQueue {
    static_assert((N & (N - 1)) == 0, "N must be power of 2");

    T buffer_[N];
    std::atomic<size_t> head_{0};   // producer
    std::atomic<size_t> tail_{0};   // consumer
    static constexpr size_t kMask = N - 1;

public:
    bool push(const T& value) {
        size_t h = head_.load(std::memory_order_relaxed);
        size_t next = (h + 1) & kMask;

        if (next == tail_.load(std::memory_order_acquire)) {
            return false;   // full
        }

        buffer_[h] = value;
        head_.store(next, std::memory_order_release);
        return true;
    }

    bool pop(T& out) {
        size_t t = tail_.load(std::memory_order_relaxed);
        if (t == head_.load(std::memory_order_acquire)) {
            return false;   // empty
        }

        out = buffer_[t];
        tail_.store((t + 1) & kMask, std::memory_order_release);
        return true;
    }
};
```

Producer는 head만, Consumer는 tail만 수정합니다. 서로 다른 변수를 다루므로 CAS가 필요 없습니다.

`acquire`/`release`로 한쪽의 write가 다른 쪽에서 visible하게 만듭니다.

### ISR + main 사용

```cpp
SpscQueue<Event, 64> event_queue;

extern "C" void UART_IRQHandler() {
    Event e = read_uart();
    event_queue.push(e);   // ISR가 producer
}

void main_loop() {
    Event e;
    while (event_queue.pop(e)) {
        process(e);   // main이 consumer
    }
}
```

mutex 없이 ISR-main 통신이 가능하며 deterministic하게 동작합니다.

## MPMC Queue — 복잡

Multi-Producer Multi-Consumer는 훨씬 복잡합니다. Boost.Lockfree, Folly, Concurrent Data Structures 같은 검증된 라이브러리를 활용합니다.

```cpp
// 직접 구현 어렵다 — 검증된 라이브러리 사용
#include <boost/lockfree/queue.hpp>
boost::lockfree::queue<int, boost::lockfree::capacity<128>> q;
```

임베디드에서는 task마다 producer와 consumer가 하나씩인 경우가 대부분이라 SPSC로 충분합니다.

## 자료 정합성 — Critical Section vs Lock-free

```cpp
// V1 — Critical section
void update_shared() {
    __disable_irq();
    counter++;
    if (counter > MAX) counter = 0;
    __enable_irq();
}

// V2 — Lock-free (단순 카운터만)
std::atomic<int> counter{0};
void update_shared() {
    int v;
    int next;
    do {
        v = counter.load();
        next = (v + 1) > MAX ? 0 : v + 1;
    } while (!counter.compare_exchange_weak(v, next));
}
```

V1은 모든 ISR을 차단하지만, V2는 해당 변수에만 영향을 줍니다. V1이 단순하지만 V2가 더 deterministic합니다.

## ARM Cortex-M의 한계

Cortex-M0/M0+는 LDREX/STREX를 지원하지 않으므로 atomic operation을 쓸 수 없습니다.

- Cortex-M3, M4, M7은 LDREX/STREX가 있어 atomic을 쓸 수 있습니다.
- Cortex-M0, M0+는 atomic이 없으므로 critical section만 사용합니다.

```cpp
// Cortex-M0+
void increment() {
    __disable_irq();
    ++counter;
    __enable_irq();
}
```

Cortex-M0+에서는 interrupt disable이 가장 저렴한 동기화입니다.

## 자주 보는 함정과 안티패턴

### 1. Memory order 무시
```cpp
counter.store(1);   // 기본 seq_cst — 가장 느림
```

필요한 최소 order만 사용합니다. relaxed/acquire/release 중 적절한 것을 고릅니다.

### 2. ABA problem 무시
복잡한 lock-free에서는 tagged pointer나 hazard pointer를 씁니다. 아니면 간단한 경우에만 lock-free를 적용합니다.

### 3. load 후 사용하고 store
```cpp
int v = counter.load();
process(v);
counter.store(v + 1);   // 다른 thread가 끼어들면 race
```

`fetch_add` 같은 atomic operation을 씁니다.

### 4. 큰 객체에 atomic 적용
```cpp
std::atomic<HugeStruct> obj;   // hardware atomic 불가 — lock 사용
```

4 byte 이하로 만들거나 별도 동기화를 사용합니다.

### 5. Cortex-M0에 atomic 가정
LDREX/STREX가 없으므로 runtime fallback이나 컴파일 에러가 발생합니다. target을 확인합니다.

### 6. Lock-free라고 빠르다고 가정
contention이 높으면 CAS retry loop가 길어져 mutex보다 느릴 수도 있습니다. 반드시 측정합니다.

## 측정 — atomic vs critical section

```text
# Cortex-M4, simple counter increment

1. Mutex (FreeRTOS):     ~600 cycles
2. Critical section:     ~30 cycles
3. Atomic fetch_add:     ~15 cycles
4. Plain ++ (no sync):   ~5 cycles (but unsafe)
```

atomic이 가장 빠르면서도 안전합니다. critical section은 모든 ISR을 차단하므로 latency에 영향을 줍니다.

## 정리

- Lock-free는 atomic operation으로 mutex 없이 동시성을 다룹니다.
- 핵심은 `std::atomic`과 CAS(`compare_exchange`)입니다.
- Memory order는 relaxed/acquire/release/seq_cst 중 필요한 최소만 선택합니다.
- SPSC queue가 임베디드 lock-free의 표준이며 ISR과 main 통신에 적합합니다.
- Cortex-M0/M0+는 atomic을 지원하지 않으므로 critical section을 씁니다.
- ABA problem에 주의하고 복잡한 lock-free 자료구조는 전문 라이브러리에 맡깁니다.

## 관련 항목

- [Part 4-04: Lock-free Container](/blog/embedded/embedded-cpp/part4-04-lock-free-container)
- [Part 3-03: Pool Allocator](/blog/embedded/embedded-cpp/part3-03-pool-allocator) — atomic free list
- [Practical RTOS Internals](/blog/embedded/rtos/practical-internals)
- [CppCon: Lock-free programming](https://www.youtube.com/results?search_query=cppcon+lock+free)

## 다음 글

[Part 4-04: Lock-free Container](/blog/embedded/embedded-cpp/part4-04-lock-free-container) — queue와 stack의 lock-free 구현. SPSC, MPMC 차이.
