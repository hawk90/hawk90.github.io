---
title: "Lock-free Container 구현 — SPSC Queue·Ring Buffer"
slug: "embedded/embedded-cpp/part4-04-lock-free-container"
date: 2026-05-01T09:32:00
description: "SPSC queue, MPMC stack, ring buffer — lock-free 자료구조 구현 패턴."
series: "Embedded C++ for Real Systems"
seriesOrder: 32
tags: [cpp, embedded, lock-free, queue, stack, ring-buffer, spsc, mpmc]
type: tech
topics: ["embedded"]
---

## 한 줄 요약

> **SPSC는 단일 producer·consumer와 slot 게시·재사용 순서가 핵심입니다.** atomic index 두 개 외에도 payload 수명·full/empty·타깃 atomic 지원을 확인합니다.

## 어떤 문제를 푸는가

[Part 4-03](/blog/embedded/embedded-cpp/part4-03-lock-free-basics)에서 원리를 다뤘다면, 이 글은 실용적인 자료구조 구현을 다룹니다.

임베디드에서 자주 등장하는 패턴은 다음과 같습니다.

- ISR에서 main task로의 통신 (SPSC)
- Worker pool (MPMC queue)
- Free list (lock-free pool)
- Statistics counter (atomic)

각 패턴의 구현과 trade-off를 살펴봅니다.

## SPSC Ring Buffer — 가장 기본

Ring buffer의 구조는 다음과 같습니다. Producer만 head를 쓰고 Consumer만 tail을 씁니다. 서로의 index를 읽는 일은 있으므로 atomic과 release/acquire로 slot 재사용 시점을 동기화합니다.

![SPSC ring buffer — head/tail 분리](/images/blog/embedded-cpp/diagrams/part4-04-spsc-ring-buffer.svg)

[Part 4-03](/blog/embedded/embedded-cpp/part4-03-lock-free-basics)에서 본 코드를 다시 옮기면 다음과 같습니다.

```cpp title="spsc.h"
#pragma once
#include <atomic>
#include <cstddef>
using std::size_t;
template<typename T, size_t N>
class SpscQueue {
    static_assert(N >= 2 && (N & (N - 1)) == 0, "N must be a power of 2 >= 2");

    T buffer_[N];
    alignas(64) std::atomic<size_t> head_{0};   // 64바이트 line을 가정한 정렬 예시
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

이 배열 기반 구현은 T의 기본 생성과 copy assignment를 요구합니다. ISR 경로에서는 T의 복사가 allocation·blocking·예외를 만들지 않는지도 확인해야 합니다.

핵심은 다음과 같습니다.

- Producer는 head만, Consumer는 tail만 수정합니다.
- 서로의 변수는 `acquire`로 읽고 자기 것은 `release`로 씁니다.
- target의 destructive-interference 간격이 64바이트 이하인 경우 이 정렬로 두 index를 분리할 수 있습니다. 대가는 RAM입니다. `SpscQueue<int, 4>`는 데이터 16바이트짜리인데 `sizeof`가 192바이트(g++-16·Clang 23.1.5, 64비트 호스트)였습니다.

### 두 release/acquire 관계

producer의 payload 대입은 head의 release보다 먼저이고, consumer가 그 게시를 acquire로 관찰한 뒤 해당 slot을 읽습니다. 반대 방향에서는 consumer의 payload 읽기가 tail의 release보다 먼저이며, producer가 tail을 acquire로 관찰한 뒤 그 slot을 다시 씁니다. 첫 관계는 미완성 payload 읽기를, 두 번째 관계는 consumer가 읽는 동안의 덮어쓰기를 막는 계약입니다. index 값이 원형으로 반복되더라도 각 slot의 접근 순서를 이 두 관계로 설명해야 합니다.

이 구현의 실제 수용량은 N−1개입니다. push의 false는 full 관측이며 자동 재시도나 drop 기록이 없으므로 호출자가 정책을 정합니다. reset·파괴·consumer 추가는 동작 중 허용하지 않으며, producer/consumer가 멈추고 외부 참조도 끝난 뒤 저장소를 회수합니다. atomic index의 lock-free 여부와 T의 처리 비용이 전체 호출의 진행 보장·ISR 적합성을 제한합니다.

## False Sharing — `alignas(64)`의 의의

Multi-core에서 같은 cache line의 변수를 다른 core가 동시에 수정하면, 그 line의 소유권이 core 사이를 계속 오갑니다. Apple M2 Pro 호스트(`hw.cachelinesize` 128)에서 두 스레드가 각자의 `std::atomic<unsigned long>`에 relaxed `fetch_add`를 5천만 번씩 하게 해 보면(g++-16 `-O2`, 3회), 두 변수가 붙어 있을 때 501·558·507ms, 64바이트 정렬로 떼었을 때 162·140·171ms, 128바이트 정렬일 때 172·122·171ms였습니다. 붙어 있으면 세 배가량 느렸습니다.

```cpp
struct Bad {
    std::atomic<size_t> a;   // core 1 사용
    std::atomic<size_t> b;   // core 2 사용
};   // 같은 cache line — false sharing

struct Good {
    alignas(64) std::atomic<size_t> a;
    alignas(64) std::atomic<size_t> b;
};   // line 크기가 64바이트 이하일 때 분리
```

ARM Cortex-A multi-core에서는 중요합니다. Cortex-M single core에는 다툴 다른 core가 없으므로 이 정렬을 습관적으로 넣을 이유가 없습니다(위 192바이트가 그 비용입니다). 64가 모든 target의 값도 아닙니다. 같은 호스트에서 `std::hardware_destructive_interference_size`는 g++-16(libstdc++)이 256, Clang 23.1.5(libc++)가 128이라고 답했습니다. 이 예시의 64는 설명용 설정입니다.

## Lock-free Stack (Treiber Stack)

다음은 Treiber의 CAS 연결 동작만 보여 주는 골격입니다. 안전한 MPMC 객체 수명·재사용·reclamation 구현을 생략했으므로 제품용 컨테이너가 아닙니다.

```cpp
template<typename T>
class TreiberStack {
public:
    struct Node {
        T value;
        Node* next;
    };

private:
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

다중 thread로 사용하려면 읽는 동안 node가 해제되지 않고, 다른 thread가 next를 쓰거나 node를 다시 push하지 않도록 보장해야 합니다. 단순히 pop 후 delete하거나 pool에 즉시 반환하면 use-after-free·data race가 발생할 수 있습니다.

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

std::atomic<TaggedPtr<Node>> top{TaggedPtr<Node>{nullptr, 0}};   // 16 byte atomic on 64-bit
```

32-bit target에서 32비트 pointer와 tag를 묶으면 64비트 atomic CAS가 필요하고, ARMv7-M에는 이 명령이 없습니다([Part 4-03](/blog/embedded/embedded-cpp/part4-03-lock-free-basics#aba-problem)). 아래 16-bit ptr 표현은 일반 Cortex-M의 0x20000000 SRAM 주소를 담지 못하므로 실제 pointer packing으로 쓰면 안 됩니다.

```cpp
struct PackedPtr {
    uint32_t value;   // 16-bit ptr (작은 주소 공간) + 16-bit tag
};
```

32비트 Cortex-M에서 포인터 32비트와 tag를 함께 CAS하려면 64비트 CAS가 필요한데, ARMv7-M에는 `ldrexd`/`strexd`가 없습니다([Part 4-03](/blog/embedded/embedded-cpp/part4-03-lock-free-basics#aba-problem)). 그래서 Cortex-M에서는 pointer 대신 pool index와 tag를 32비트 하나에 묶지 않는 한 critical section을 씁니다.

## Lock-free Free List

[Part 3-03 Pool Allocator](/blog/embedded/embedded-cpp/part3-03-pool-allocator)의 lock-free 버전입니다.

이전처럼 storage와 atomic next를 union으로 겹치면 T 사용 중에도 관찰자가 next를 읽을 수 있어 활성 member와 객체 수명 문제가 생깁니다. ABA뿐 아니라 누가 node를 읽는지, 언제 재사용할 수 있는지, T를 언제 생성·파괴할지의 프로토콜이 필요합니다.

```cpp
// 저장 공간의 분리만 보여 주는 설계 조각이며 완성 lock-free pool이 아닙니다.
template<typename T>
struct PoolSlot {
    std::atomic<PoolSlot*> next{nullptr};
    alignas(T) std::byte storage[sizeof(T)];
};
```

metadata를 분리해도 reclamation·ABA가 자동 해결되지는 않습니다. bounded critical section 또는 소유권이 명확한 RTOS pool부터 선택하고, MPMC가 필요할 때는 해당 library의 용량·lock-free·reclamation 계약을 확인합니다.

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

Boost.Lockfree 문서는 각 자료구조의 lock-free 조건과 고정 용량 설정을 설명합니다. 이 글을 쓴 Mac에는 Boost가 없어 위 코드는 빌드하지 않았습니다.

## moodycamel::ConcurrentQueue

Cameron Desrochers의 MPMC queue입니다. 이 글에서는 빌드하지 않았고, 아래 동작은 저장소 README(master)에서 확인했습니다.

```cpp
#include <concurrentqueue.h>

moodycamel::ConcurrentQueue<int> q;
q.enqueue(42);
int v;
q.try_dequeue(v);
```

README는 `enqueue`가 "필요하면 추가 공간을 할당"하고 `try_enqueue`는 "이미 할당된 메모리가 충분할 때만" 넣는다고 적습니다. 암묵적 enqueue는 producer마다 thread-local sub-queue를 자동 할당합니다. README는 또 이 queue가 "linearizable하지 않다"고 적으므로, 모든 producer에 걸친 전역 FIFO를 기대할 수 없습니다. 런타임 할당을 막으려면 `try_enqueue`와 생성 시 미리 할당한 용량, explicit producer token만 씁니다. 초기 할당도 Traits의 malloc을 쓰므로, heap 자체를 금지한 시스템이면 Traits의 malloc/free를 정적 pool로 바꿔야 합니다.

## 임베디드 — ISR 한 개와 consumer task 한 개

```cpp
// 정확히 한 ISR producer와 한 task consumer
class EventBus {
    SpscQueue<Event, 256> queue_;
    SemaphoreHandle_t event_sem_;

public:
    explicit EventBus(SemaphoreHandle_t sem) : event_sem_(sem) {}

    // ISR에서 호출
    void post_isr(const Event& e) {
        if (queue_.push(e)) {
            BaseType_t woken = pdFALSE;
            xSemaphoreGiveFromISR(event_sem_, &woken);
            portYIELD_FROM_ISR(woken);
        }
    }

    // 지정된 단일 consumer task에서만 호출
    bool wait(Event& out, TickType_t timeout) {
        if (queue_.pop(out)) return true;

        if (xSemaphoreTake(event_sem_, timeout) == pdTRUE) {
            return queue_.pop(out);
        }
        return false;
    }
};
```

이 조각은 정상 생성된 semaphore를 주입하고 단일 task에서만 pop하는 흐름입니다. semaphore는 wake hint이므로 queue를 먼저 drain하면 stale token이 남을 수 있고 wait가 false를 반환해도 전체 timeout을 소진했다는 뜻은 아닙니다. 완전한 wait-until-deadline API는 timeout 잔여량과 재검사를 설계해야 합니다. 여러 task가 pop해야 한다면 RTOS queue 등 multi-consumer API로 바꿉니다. ISR priority·FromISR 허용 범위와 full/drop 정책도 별도입니다.

## 임베디드 — Atomic Counter

lock-free 패턴 중 가장 단순한 형태입니다.

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

## 재현 — capacity, wrap-around와 두 thread

```cpp title="spsc-check.cpp"
#include "spsc.h"
#include <cassert>
#include <thread>
#include <iostream>
int main() {
    SpscQueue<int, 4> small; int value = 0;
    assert(!small.pop(value));
    assert(small.push(1) && small.push(2) && small.push(3));
    assert(!small.push(4));
    assert(small.pop(value) && value == 1);
    assert(small.push(4));
    for (int expected = 2; expected <= 4; ++expected) assert(small.pop(value) && value == expected);
    assert(!small.pop(value));
    SpscQueue<int, 64> queue;
    constexpr int count = 100000;
    std::thread producer([&] { for (int n = 0; n < count; ++n) while (!queue.push(n)) std::this_thread::yield(); });
    std::thread consumer([&] { for (int n = 0; n < count; ++n) { int got; while (!queue.pop(got)) std::this_thread::yield(); assert(got == n); } });
    producer.join(); consumer.join();
#ifdef BAD_CAPACITY
    SpscQueue<int, 0> invalid;
#endif
    std::cout << "spsc N-1/full/wrap/fifo passed count=" << count << '\n';
}
```

Homebrew Clang 23.1.5(`-fsanitize=thread`, 진단 없음)와 g++-16에서 실행해 둘 다 `spsc N-1/full/wrap/fifo passed count=100000`을 출력했습니다. N=4의 실제 capacity 3, full·empty·wrap-around, 100000개의 FIFO 전달을 확인했고 BAD_CAPACITY는 static_assert 실패입니다. host stress는 모든 interleaving의 증명이나 board ISR/WCET 검증이 아닙니다.

## 자주 보는 함정과 안티패턴

### 1. SPSC를 MPMC처럼 사용
Producer 둘이 push하면 race가 발생합니다. SPSC는 producer가 정확히 하나여야 합니다.

### 2. Memory order `seq_cst` 남용
기본 seq_cst보다 약한 순서를 선택하기 전에 게시·회수의 happens-before 관계를 증명합니다. 성능은 target에서 비교합니다.

### 3. 큰 객체에 atomic 시도
```cpp
std::atomic<HugeStruct> obj;   // lock-free 여부와 runtime helper 제공 확인
```

pointer 게시를 atomic으로 바꿔도 pointee 수명·동시 접근·회수는 별도 protocol이 필요합니다.

### 4. ABA problem 무시
Treiber stack 같은 복잡한 lock-free에는 tagged pointer를 적용하거나 전문 라이브러리를 사용합니다.

### 5. Cache line alignment 무시
multi-core target에서는 같은 line의 두 카운터가 서로를 느리게 합니다(위 M2 Pro 측정에서 약 세 배). target의 line 크기로 `alignas`를 줍니다. single core Cortex-M에서는 해당하지 않습니다.

### 6. retry loop 무한 반복 가능성
C++ 표준은 lock-free 연산에 시스템 전체의 진행조차 권고(should)로만 두므로([intro.progress]/2), 경쟁이 계속되면 특정 스레드의 CAS retry에는 상한이 없습니다. 시간 상한이 필요한 경로에는 retry 횟수 limit과 실패 처리를 둡니다.

```cpp
int retries = 0;
while (retries++ < 100) {
    if (cas(...)) break;
    // 짧은 wait
}
```

## ARM Cortex-M의 LDREX/STREX

Cortex-M4에서 CAS는 LDREX/STREX로 내려갑니다. `__atomic_compare_exchange_n(p, expected, desired, true /*weak*/, __ATOMIC_ACQ_REL, __ATOMIC_ACQUIRE)`를 arm-none-eabi-g++ 16.2.0 `-mcpu=cortex-m4 -Os`로 컴파일한 결과입니다.

```text
00000000 <cas>:
   0:	push	{r4, lr}
   2:	ldr	r4, [r1, #0]       ; *expected
   4:	dmb	ish
   8:	ldrex	r3, [r0]           ; exclusive load
   c:	cmp	r3, r4
   e:	bne.n	18                 ; 값이 다르면 실패
  10:	strex	ip, r2, [r0]       ; exclusive store
  14:	cmp.w	ip, #0             ; STREX 성공?
  18:	dmb	ish
  1c:	itee	eq
  1e:	moveq	r0, #1
  20:	movne	r0, #0
  22:	strne	r3, [r1, #0]       ; 실패 시 *expected 갱신
  24:	pop	{r4, pc}
```

weak CAS라서 `strex` 실패 시 되돌아가지 않고 false를 반환합니다. retry는 호출자의 loop가 맡습니다. strong CAS(`weak` 인자 false)로 바꾸면 `cmp.w ip, #0` 뒤에 `bne.n 8`이 붙어 `strex` 실패 시 `ldrex`로 되돌아가는 loop가 함수 안에 생겼습니다. DMA의 쓰기가 exclusive monitor에 반영되는지는 시스템 interconnect와 메모리 속성에 따릅니다. CPU 간 atomic의 가시성 규칙을 DMA cache 일관성·barrier·buffer ownership의 대안으로 쓰면 안 됩니다.

이 글의 atomic 예제는 모두 일반 RAM 변수를 대상으로 했고, peripheral 레지스터에 exclusive 접근을 쓰는 경우는 확인하지 않았습니다.

## 1차 자료와 적용 한계

- [C++ atomic ordering](https://eel.is/c++draft/atomics.order) — release/acquire 게시와 회수
- [Boost.Lockfree](https://www.boost.org/doc/libs/latest/doc/html/lockfree.html) — 자료구조별 제약과 용량 정책
- [ConcurrentQueue README](https://github.com/cameron314/concurrentqueue) — producer 간 순서와 allocation 계약

SPSC는 정확히 한 producer/consumer라는 제약을 확인할 수 있을 때 사용합니다. target atomic helper·ISR 재진입·cache/DMA ownership은 host 실행과 분리해 검증하며, M0도 atomic API 지원과 lock-free 구현 여부를 따로 확인합니다.

## 정리

- SPSC queue는 CAS 없이 동작해, producer·consumer가 하나씩인 ISR과 task 통신에 맞습니다.
- index별 writer가 하나여서 CAS가 필요 없지만 서로의 index를 읽어 게시와 slot 재사용을 동기화합니다.
- false sharing 정렬은 target 간격을 확인해 선택하며 64바이트를 모든 CPU의 고정값으로 쓰지 않습니다.
- MPMC는 복잡하므로 검증된 라이브러리(Boost, moodycamel)를 사용합니다.
- ABA problem에는 tagged pointer나 hazard pointer를 쓰거나 MPMC 자체를 회피합니다.
- M0의 exclusive 명령 부재와 atomic API/helper 지원을 구분하고 ISR에서의 진행성을 따로 검증합니다.

## 관련 항목

- [Part 4-03: Lock-free 기초](/blog/embedded/embedded-cpp/part4-03-lock-free-basics)
- [Part 3-03: Pool Allocator](/blog/embedded/embedded-cpp/part3-03-pool-allocator) — lock-free pool
- [Part 4-01: Intrusive Containers](/blog/embedded/embedded-cpp/part4-01-intrusive-containers)
- [Practical RTOS Internals](/blog/embedded/rtos/practical-internals/00-preface)

## 다음 글

[Part 4-05: Type-safe Flags](/blog/embedded/embedded-cpp/part4-05-type-safe-flags) — bit flag를 `enum class`로 type-safe하게.
