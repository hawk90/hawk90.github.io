---
title: "Part 4-03: Lock-free 기초"
date: 2026-05-16T03:00:00
description: "Atomic, CAS, memory order — mutex 없이 동시성. 임베디드의 ISR-safe 패턴."
series: "Embedded C++ for Real Systems"
seriesOrder: 31
tags: [cpp, embedded, lock-free, atomic, cas, memory-order, isr]
type: tech
---

## 한 줄 요약

> **"Lock-free = *mutex 없이 atomic operation*."** — 짧고 deterministic. ISR-safe.

## 어떤 문제를 푸는가

Mutex의 비용:

- *context switch* — RTOS task가 blocked
- *Priority inversion* — 낮은 priority가 lock 잡고 높은 priority 막힘
- *Deadlock* — 둘 이상 mutex 잘못 잡으면
- *ISR 사용 불가* — ISR에서 mutex 못 (대부분 RTOS)

**Lock-free**는 *mutex 없이* 동시 접근. *atomic 명령*으로 *consistency 보장*.

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

ARM Cortex-M의 *atomic instruction*(LDREX/STREX)으로 *hardware 보장*.

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

ARM Cortex-M에서 *4-byte atomic*은 *single instruction* (load/store가 자연 atomic).

`fetch_add`, `compare_exchange`는 *LDREX/STREX* 사용.

## CAS — Compare-And-Swap

Lock-free의 *핵심*. *값을 비교 + 일치하면 교체*. 전체가 *atomic*.

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

흐름:
1. `head` 현재 값 읽음 (`old_head`)
2. `n->next = old_head` 설정
3. CAS: `head == old_head`면 `n`으로 교체
4. 다른 thread가 끼어들어 `head` 변경됐으면 CAS 실패 → retry

*retry loop이 lock-free의 특징*. *deadlock 없음*. 다만 *contention 높으면 starvation* 가능.

## ABA Problem

CAS의 *함정*. *값이 A → B → A로 변경*되었어도 *CAS는 성공*.

```cpp
// Thread 1: pop 시도
Node* old_top = top.load();        // = A
// (이때 Thread 2가 A pop, B push, A push)
// 이제 top = A지만 *A->next는 변경*
top.compare_exchange_weak(old_top, old_top->next);
// CAS 성공 — 그러나 old_top->next는 잘못된 값
```

해결:
- *Tagged pointer* — pointer + counter (64-bit)
- *Hazard pointer* — 다른 thread가 *현재 사용 중인 pointer 추적*
- *Epoch-based reclamation* — gc-like

임베디드에서는 *간단한 경우*에 lock-free 사용. *복잡한 ABA 회피*는 *mutex가 낫기도*.

## Memory Order

`std::atomic` 연산은 *memory ordering* 인자.

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

대부분 임베디드는 *acquire/release* 활용 — *seq_cst보다 빠름*.

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

ISR과 main에서 *동시 접근*. *atomic이라 safe*. *no lock*.

## 임베디드 — Lock-free SPSC Queue

Single Producer Single Consumer. *가장 단순한 lock-free queue*.

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

*Producer는 head만 변경, Consumer는 tail만*. *서로 무관한 변수* → *CAS 불필요*.

`acquire`/`release`로 *write가 visible*하게.

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

*mutex 없이* ISR-main 통신. *deterministic*.

## MPMC Queue — 복잡

Multi-Producer Multi-Consumer는 *훨씬 복잡*. Boost.Lockfree, Folly, Concurrent Data Structures 활용.

```cpp
// 직접 구현 어렵다 — 검증된 라이브러리 사용
#include <boost/lockfree/queue.hpp>
boost::lockfree::queue<int, boost::lockfree::capacity<128>> q;
```

임베디드는 *task당 한 producer/consumer*가 대부분. *SPSC로 충분*한 경우 많음.

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

V1은 *모든 ISR 차단*. V2는 *해당 변수만*. V1이 *단순*하지만 V2가 *더 deterministic*.

## ARM Cortex-M의 한계

Cortex-M0/M0+는 *LDREX/STREX 없음*. *atomic operation 불가*.

- *Cortex-M3, M4, M7*: LDREX/STREX 있음, atomic OK
- *Cortex-M0, M0+*: atomic 없음, *critical section만*

```cpp
// Cortex-M0+
void increment() {
    __disable_irq();
    ++counter;
    __enable_irq();
}
```

Cortex-M0+는 *interrupt disable*이 *cheapest sync*.

## 자주 보는 함정과 안티패턴

### 1. *Memory order 무시*
```cpp
counter.store(1);   // 기본 seq_cst — 가장 느림
```
필요한 *최소 order* 사용. relaxed/acquire/release.

### 2. *ABA problem 무시*
복잡 lock-free에 *tagged pointer* 또는 *hazard pointer*. 또는 *간단한 경우만*.

### 3. *load + 사용 + store*
```cpp
int v = counter.load();
process(v);
counter.store(v + 1);   // 다른 thread가 끼어들면 race
```
*atomic operation* 사용 (`fetch_add`).

### 4. *큰 객체 atomic*
```cpp
std::atomic<HugeStruct> obj;   // hardware atomic 불가 — lock 사용
```
*4 byte 이하* 또는 *별도 동기화*.

### 5. *Cortex-M0에 atomic 가정*
LDREX/STREX 없음 → *runtime fallback 또는 컴파일 에러*. *target 확인*.

### 6. *Lock-free라고 빠르다 가정*
contention 높으면 *CAS retry loop*. mutex보다 *느릴 수* 있음. *측정*.

## 측정 — atomic vs critical section

```text
# Cortex-M4, simple counter increment

1. Mutex (FreeRTOS):     ~600 cycles
2. Critical section:     ~30 cycles
3. Atomic fetch_add:     ~15 cycles
4. Plain ++ (no sync):   ~5 cycles (but unsafe)
```

*atomic이 가장 빠름 + 안전*. critical section은 *모든 ISR 차단*해서 latency 영향.

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

[Part 4-04: Lock-free Container](/blog/embedded/embedded-cpp/part4-04-lock-free-container) — *queue, stack의 lock-free 구현*. SPSC, MPMC 차이.
