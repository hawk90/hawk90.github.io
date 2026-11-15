---
title: "임베디드 Lock-free 기초 — atomic·memory ordering·CAS"
slug: "embedded/embedded-cpp/part4-03-lock-free-basics"
date: 2026-05-01T09:31:00
description: "Atomic, CAS, memory order — mutex 없이 동시성. 임베디드의 ISR-safe 패턴."
series: "Embedded C++ for Real Systems"
seriesOrder: 31
tags: [cpp, embedded, lock-free, atomic, cas, memory-order, isr]
type: tech
topics: ["embedded"]
---

## 한 줄 요약

> **Lock-free는 시스템 전체의 진행을 보장하는 성질이며, atomic을 썼다는 뜻과 같지 않습니다.** 개별 호출의 완료 시간 상한이나 ISR 안전성은 별도 검증이 필요합니다.

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

Cortex-M 코어와 toolchain마다 구현이 다릅니다. M3/M4/M7의 일부 read-modify-write는 exclusive 명령 retry loop로 구현할 수 있고 M0는 runtime helper를 사용할 수 있습니다.

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
// counter == 5이고 spurious failure가 없으면 10으로 변경 + true
// weak는 값이 같아도 실패할 수 있어 보통 retry loop에서 사용
// 아니면 expected = current value + false
```

정렬된 단일 load/store와 fetch_add 같은 read-modify-write를 구분합니다. 후자는 M4에서도 여러 명령과 retry가 필요할 수 있습니다. `is_always_lock_free`/`is_lock_free()`와 생성된 오브젝트를 함께 확인합니다.

## CAS — Compare-And-Swap

Lock-free의 핵심 도구입니다. 값을 비교해서 일치하면 새 값으로 교체하는 동작 전체가 다른 동시 atomic 연산에 대해 분할되지 않는 연산으로 관찰됩니다. 하드웨어 명령이 한 개인지는 별개입니다. 다른 스레드가 끼어들면 CAS가 실패하고, 최신 값을 다시 읽어 재시도합니다.

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
| `relaxed` | 해당 atomic의 indivisibility·modification order는 유지, 다른 memory 게시 보장 없음 | 독립 counter 등 |
| `acquire` | load — 이후 memory 작업이 *이전으로 옮겨가지 않음* | reader |
| `release` | store — 이전 memory 작업이 *이후로 옮겨가지 않음* | writer |
| `acq_rel` | acquire + release | RMW |
| `seq_cst` | 해당 seq_cst 연산들에 단일 total order (기본) | 강한 atomic 순서 보장 |

release를 acquire가 읽어 synchronizes-with가 성립하는 경로를 먼저 증명합니다. acquire/release가 언제나 더 빠른 것은 아니며 target 생성 코드와 workload를 측정합니다.

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

이 target에서 해당 atomic 연산이 lock-free이고 runtime helper와 exclusive retry의 ISR 재진입 계약이 맞는지 확인해야 합니다. tick 값은 설정된 SysTick 주기에 따라 증가하며 반드시 1ms인 것은 아닙니다.

## 임베디드 — Lock-free SPSC Queue

Single Producer Single Consumer 패턴이며, 가장 단순한 lock-free queue입니다.

```cpp
template<typename T, size_t N>
class SpscQueue {
    static_assert(N >= 2 && (N & (N - 1)) == 0, "N must be a power of 2 >= 2");

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

이 구현의 사용 가능 capacity는 N-1입니다. 정확히 한 producer와 한 consumer만 허용하며 중첩 ISR에서 두 producer가 되면 계약을 어깁니다. T 복사·atomic 구현·overflow 정책까지 확인한 뒤 ISR에 적용합니다.

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
    auto saved = __get_PRIMASK();
    __disable_irq();
    counter++;
    if (counter > MAX) counter = 0;
    __set_PRIMASK(saved);
}

// V2 — Lock-free (단순 카운터만)
std::atomic<int> counter{0};
void update_shared() {
    int v;
    int next;
    do {
        v = counter.load();
        next = v == MAX ? 0 : v + 1;   // 0 <= v <= MAX < INT_MAX 전제
    } while (!counter.compare_exchange_weak(v, next));
}
```

V1의 PRIMASK는 일반 maskable interrupt를 막으며 NMI/HardFault까지 막지 않습니다. 진입 전 상태를 복원해야 outer critical section을 깨지 않습니다. V2의 CAS retry는 개별 호출의 시간 상한을 보장하지 않습니다.

## ARM Cortex-M의 지원 범위를 확인하기

M0/M0+에 LDREX/STREX가 없다는 사실은 C++ atomic API 자체가 존재할 수 없다는 뜻이 아닙니다. compiler가 helper나 target runtime 경로를 사용할 수 있고, 그런 구현이 ISR에서 안전한지는 별도입니다. M4의 exclusive retry도 wait-free나 고정 cycle 보장을 뜻하지 않습니다.

```cpp title="arm-atomic.cpp"
extern "C" unsigned increment(unsigned* value) {
    return __atomic_fetch_add(value, 1U, __ATOMIC_RELAXED);
}
```

이 파일은 Clang/GCC built-in의 코드 생성 probe이며 std::atomic의 모든 library 구현을 대신하지 않습니다. Clang 23.1.3에서 M4 Thumb 오브젝트에는 ldrex/strex가, M0에는 __atomic_fetch_add_4 미정의 helper 참조가 나타났습니다. M0의 실제 helper 제공·link·ISR 안전성은 실행하지 않았습니다.

## 자주 보는 함정과 안티패턴

### 1. Memory order 무시
```cpp
counter.store(1);   // 기본 seq_cst, 필요한 순서 보장을 먼저 검토
```

필요한 최소 order만 사용합니다. relaxed/acquire/release 중 적절한 것을 고릅니다.

### 2. ABA problem 무시
복잡한 lock-free에서는 tagged pointer나 hazard pointer를 씁니다. 아니면 간단한 경우에만 lock-free를 적용합니다.

### 3. load 후 사용하고 store
```cpp
int v = counter.load();
process(v);
counter.store(v + 1);   // 각 access는 atomic이어도 lost update 가능
```

`fetch_add` 같은 atomic operation을 씁니다.

### 4. 큰 객체에 atomic 적용
```cpp
std::atomic<HugeStruct> obj;   // lock-free와 helper 제공 여부를 확인
```

크기만으로 판단하지 말고 지원되는 atomic 타입과 정렬, lock-free property와 runtime 의존을 확인합니다.

### 5. Cortex-M0에 atomic 가정
LDREX/STREX가 없으므로 runtime fallback이나 컴파일 에러가 발생합니다. target을 확인합니다.

### 6. Lock-free라고 빠르다고 가정
contention이 높으면 CAS retry loop가 길어져 mutex보다 느릴 수도 있습니다. 반드시 측정합니다.

## 재현 — acquire/release 게시와 CAS 실패

```cpp title="atomic-check.cpp"
#include <atomic>
#include <thread>
#include <cassert>
#include <iostream>
int main() {
    int payload = 0;
    std::atomic<bool> ready{false};
    std::thread producer([&] { payload = 42; ready.store(true, std::memory_order_release); });
    std::thread consumer([&] {
        while (!ready.load(std::memory_order_acquire)) std::this_thread::yield();
        assert(payload == 42);
    });
    producer.join(); consumer.join();
    std::atomic<int> value{7}; int expected = 5;
    assert(!value.compare_exchange_strong(expected, 9));
    assert(expected == 7 && value.load() == 7);
    assert(value.compare_exchange_strong(expected, 9));
    std::cout << "publication=42 cas-mismatch=7 cas-success=9\n";
}
```

Clang 23.1.3의 C++17 host에서 실행한 기능 검사입니다. 정상 payload 게시와 CAS 실패 시 expected 갱신을 확인했으며, cycle 수·WCET·hardware ISR의 증거는 아닙니다. 실행 관찰만으로 모든 가능한 interleaving을 증명할 수 없으므로 release/acquire의 읽기 관계도 함께 검토합니다.

## 1차 자료

- [C++ draft: atomic lock-free property](https://eel.is/c++draft/atomics.lockfree), [memory ordering](https://eel.is/c++draft/atomics.order)
- [Clang atomic builtins](https://clang.llvm.org/docs/LanguageExtensions.html#c-atomic-builtins) — ARM 코드 생성 probe의 API 범위
- [Arm CMSIS interrupt mask intrinsics](https://arm-software.github.io/CMSIS_6/main/Core/group__Core__Register__gr.html) — PRIMASK 저장·복원

## 정리

- Lock-free는 atomic operation으로 mutex 없이 동시성을 다룹니다.
- 핵심은 `std::atomic`과 CAS(`compare_exchange`)입니다.
- Memory order는 relaxed/acquire/release/seq_cst 중 필요한 최소만 선택합니다.
- SPSC queue가 임베디드 lock-free의 표준이며 ISR과 main 통신에 적합합니다.
- 코어의 exclusive 명령 유무와 compiler/runtime atomic API 지원을 구분하고 ISR 안전성을 따로 검증합니다.
- ABA problem에 주의하고 복잡한 lock-free 자료구조는 전문 라이브러리에 맡깁니다.

## 관련 항목

- [Part 4-04: Lock-free Container](/blog/embedded/embedded-cpp/part4-04-lock-free-container)
- [Part 3-03: Pool Allocator](/blog/embedded/embedded-cpp/part3-03-pool-allocator) — atomic free list
- [Practical RTOS Internals](/blog/embedded/rtos/practical-internals/00-preface)
- [C++ atomic 연산 규칙](https://eel.is/c++draft/atomics) — 특정 강연 검색 결과를 기술 근거로 사용하지 않습니다.

## 다음 글

[Part 4-04: Lock-free Container](/blog/embedded/embedded-cpp/part4-04-lock-free-container) — queue와 stack의 lock-free 구현. SPSC, MPMC 차이.
