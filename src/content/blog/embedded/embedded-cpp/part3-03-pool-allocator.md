---
title: "Pool Allocator 구현 — Fixed-Size Block과 O(1) 보장"
slug: "embedded/embedded-cpp/part3-03-pool-allocator"
date: 2026-04-30T09:21:00
description: "고정 크기 블록 + free list — 임베디드의 표준 allocator 구현."
series: "Embedded C++ for Real Systems"
seriesOrder: 21
tags: [cpp, embedded, pool-allocator, free-list, memory-management]
type: tech
topics: ["embedded"]
---

## 한 줄 요약

> **"Pool은 같은 크기 블록의 묶음에 free list를 더한 구조입니다."** free-list 조작은 O(1)이지만 동기화 대기와 T의 생성·소멸까지 일정 시간을 보장하지는 않습니다. 고정 크기 블록에는 외부 단편화가 없고, 정렬·작은 객체에 따른 내부 낭비는 남습니다.

## 어떤 문제를 푸는가

[Part 3-02](/blog/embedded/embedded-cpp/part3-02-custom-allocator-basics)에서 간단한 pool을 보았습니다. 이 글은 실용적인 pool 구현을 다룹니다.

요구사항은 이렇습니다.

- **O(1) 할당과 해제** — 슬롯 선택 단계가 N에 비례해 늘어나지 않아야 합니다.
- **Fragmentation 0** — 같은 크기 블록만 다룹니다.
- **Thread-safe (선택)** — RTOS 환경에서 필요합니다.
- **Statistics** — 사용량을 추적할 수 있어야 합니다.

```cpp
ObjectPool<Order, 32> pool;

Order* o1 = pool.allocate();   // O(1)
Order* o2 = pool.allocate();
pool.deallocate(o1);            // O(1)

assert(pool.allocated() == 1);
assert(pool.available() == 31);
```

## Pool의 핵심 — Free List

free 블록들을 연결 리스트로 관리합니다. 비어 있는 블록에만 next pointer를 저장하고, 사용 중인 블록에는 T를 생성합니다.

![Pool free list — 초기 상태와 두 블록 할당 후](/images/blog/embedded-cpp/diagrams/part3-03-pool-free-list.svg)


```text
처음 상태:
storage: [block0][block1][block2][block3]
free_list_head → block0 → block1 → block2 → block3 → nullptr

block0 할당 후:
free_list_head → block1 → block2 → block3 → nullptr

block0 해제 후:
free_list_head → block0 → block1 → block2 → block3 → nullptr
(또는 LIFO: block0 → block1 → block2 → ...)
```

free list에서 빠져나온 `block0`의 메모리는 그 순간부터 사용자 몫입니다. 포인터 하나만 보유하면 O(1) push/pop이 가능합니다.

## 기본 구현

```cpp title="object-pool.hpp"
#include <cstddef>
#include <new>
#include <type_traits>
#include <utility>
using std::size_t;
template<typename T, size_t N>
class ObjectPool {
    static_assert(N > 0, "pool capacity must be positive");
    static_assert(std::is_nothrow_destructible_v<T>);
    // 각 슬롯 — T 또는 next pointer
    union Slot {
        T value;
        Slot* next;
        Slot() noexcept : next(nullptr) {}
        ~Slot() noexcept {} // 활성 T는 destroy에서 소멸
    };

    Slot slots_[N];
    Slot* free_head_;
    size_t allocated_ = 0;

public:
    ObjectPool() {
        // 초기 free list 구성
        for (size_t i = 0; i < N - 1; ++i) {
            slots_[i].next = &slots_[i + 1];
        }
        slots_[N - 1].next = nullptr;
        free_head_ = &slots_[0];
    }

    ObjectPool(const ObjectPool&) = delete;
    ObjectPool& operator=(const ObjectPool&) = delete;

    T* allocate() noexcept {
        if (!free_head_) return nullptr;   // 고갈

        Slot* slot = free_head_;
        free_head_ = slot->next;
        ++allocated_;
        return &slot->value;
    }

    void deallocate(T* p) noexcept {
        if (!p) return;

        Slot* slot = reinterpret_cast<Slot*>(p);
        slot->next = free_head_;
        free_head_ = slot;
        --allocated_;
    }

    // 객체 생성 + 할당
    template<typename... Args>
    T* construct(Args&&... args) noexcept {
        T* p = allocate();
        static_assert(std::is_nothrow_constructible_v<T, Args...>,
                      "this pool requires a nothrow constructor");
        if (p) p = new (p) T(std::forward<Args>(args)...);
        return p;
    }

    // 소멸 + 해제
    void destroy(T* p) noexcept {
        if (p) {
            p->~T();
            deallocate(p);
        }
    }

    size_t allocated() const { return allocated_; }
    size_t available() const { return N - allocated_; }
    bool empty() const { return allocated_ == 0; }
    bool full() const { return allocated_ == N; }
};
```

핵심 아이디어는 `union`을 활용해 같은 메모리를 객체 또는 next pointer로 양분한다는 점입니다. 각 슬롯은 max(sizeof(T), sizeof(Slot*))와 정렬 패딩만큼 차지합니다.

O(1)이 실제로 어떤 코드인지 보려고, 아래 `Order`(12바이트)로 `ObjectPool<Order, 32>` 전역 하나를 만들고 `allocate`·`deallocate`만 부르는 함수 두 개를 arm-none-eabi-g++ 16.2.0 `-mcpu=cortex-m4 -mthumb -Os`로 컴파일했습니다. 이 툴체인에는 C++ 표준 헤더가 없어 `<new>`·`<type_traits>`·`<utility>`의 해당 부분만 짧은 대체 헤더로 넣었습니다.

```text
00000000 <get()>:                          ; order_pool.allocate()
   0:	ldr	r3, [pc, #24]              ; &order_pool
   2:	ldr.w	r0, [r3, #384]             ; slot = free_head_
   6:	cbz	r0, 18                     ; 고갈이면 nullptr 반환
   8:	ldr	r2, [r0, #0]               ; slot->next
   a:	str.w	r2, [r3, #384]             ; free_head_ = slot->next
   e:	ldr.w	r2, [r3, #388]
  12:	adds	r2, #1                     ; ++allocated_
  14:	str.w	r2, [r3, #388]
  18:	bx	lr
```

`deallocate`도 분기 하나에 load·store 몇 개로 같은 구조였습니다. 루프가 없으므로 실행 명령 수가 N과 무관합니다. `.bss`는 32 × 12 + 4 + 4 = 392바이트로, `static_assert(sizeof(order_pool) == 392)`가 통과했습니다. 생성자는 free list를 런타임에 연결하므로 `.init_array` entry와 60바이트 초기화 코드가 함께 생겼습니다([Part 1-06](/blog/embedded/embedded-cpp/part1-06-startup-code)의 `__libc_init_array`가 부팅 때 실행). free-head와 통계도 별도로 필요합니다. allocate/deallocate는 원시 저장소를, construct/destroy는 객체 수명을 다루며 서로 짝을 맞춥니다. 같은 pool의 활성 포인터만 반환하고 pool보다 객체·wrapper를 먼저 소멸시켜야 합니다.

## 사용 예 — Order Pool

```cpp
struct Order {
    int id;
    int quantity;
    float price;
    Order(int i, int q, float p) noexcept : id(i), quantity(q), price(p) {}
};

ObjectPool<Order, 32> order_pool;

void process_request(int id, int qty, float price) {
    auto* order = order_pool.construct(id, qty, price);
    if (!order) {
        log_error("order pool full");
        return;
    }

    // 처리
    process(order);

    order_pool.destroy(order);
}
```

`construct`와 `destroy`로 RAII와 자연스럽게 어울리며, 고갈 시 nullptr를 반환합니다. 이 구현은 nothrow 생성·소멸 타입으로 제한합니다. 생성 예외까지 지원하려면 실패한 슬롯을 free-list로 돌려보내는 복구가 필요합니다.

## RAII wrapper — Pool unique_ptr

```cpp
template<typename T, size_t N>
class PoolUniquePtr {
    ObjectPool<T, N>* pool_;
    T* ptr_;

public:
    PoolUniquePtr(ObjectPool<T, N>* pool, T* ptr) : pool_(pool), ptr_(ptr) {}

    ~PoolUniquePtr() {
        if (ptr_) pool_->destroy(ptr_);
    }

    PoolUniquePtr(PoolUniquePtr&& other) noexcept
        : pool_(other.pool_), ptr_(other.ptr_) {
        other.ptr_ = nullptr;
    }

    PoolUniquePtr& operator=(PoolUniquePtr&& other) noexcept {
        if (this != &other) {
            if (ptr_) pool_->destroy(ptr_);
            pool_ = other.pool_;
            ptr_ = other.ptr_;
            other.ptr_ = nullptr;
        }
        return *this;
    }

    PoolUniquePtr(const PoolUniquePtr&) = delete;
    PoolUniquePtr& operator=(const PoolUniquePtr&) = delete;

    T* get() const { return ptr_; }
    T* operator->() const { return ptr_; }
    T& operator*() const { return *ptr_; }
    explicit operator bool() const { return ptr_ != nullptr; }
};

template<typename T, size_t N, typename... Args>
PoolUniquePtr<T, N> make_pool_unique(ObjectPool<T, N>& pool, Args&&... args) {
    return PoolUniquePtr<T, N>(&pool, pool.construct(std::forward<Args>(args)...));
}
```

사용 예는 다음과 같습니다.

```cpp
ObjectPool<Order, 32> pool;

void process() {
    auto order = make_pool_unique(pool, 1, 100, 9.99f);
    if (!order) return;   // pool full

    order->process();
    // 자동 destroy
}
```

`std::unique_ptr`처럼 scope를 벗어나는 모든 경로에서 `destroy`가 불립니다.

## Thread-safe pool의 경계

다중 task가 하나의 pool을 쓰면 free-list와 통계를 함께 보호해야 합니다. mutex wrapper는 초기화된 ObjectPool을 멤버로 두고, mutex 생성 실패와 획득 결과를 확인한 뒤 allocate/deallocate를 호출하는 형태로 설계합니다. FreeRTOS mutex는 ISR에서 사용할 수 없으므로 ISR 경로에는 해당 포트의 ISR용 API·critical section 정책을 별도로 적용합니다.

mutex는 슬롯 조작뿐 아니라 대기 시간을 추가합니다. 이 장은 RTOS 실행 시간과 ISR 안전성을 검증하지 않았으며, 임의의 μs 값으로 비용을 단정하지 않습니다.

### atomic head만으로 lock-free가 되지 않는 이유

Treiber 형태의 head CAS만 붙인 pool에는 ABA뿐 아니라 슬롯 재사용 중 next를 읽고 쓰는 수명·data race 문제가 있습니다. acquire/release 순서만 바꿔서 해결되지 않습니다. tagged pointer, 안전한 회수·재사용 프로토콜, 타깃에서의 원자 연산 보장까지 검토해야 합니다. 이 글은 검증되지 않은 CAS pool을 완성 예제로 제공하지 않습니다. 알고리즘의 전제는 [Part 4-03](/blog/embedded/embedded-cpp/part4-03-lock-free-basics)에서 다룹니다.

## 통계와 디버깅

production debugging을 위한 추가 정보입니다.

```cpp
template<typename T, size_t N>
class InstrumentedPool {
    // ... 기본 pool

    size_t peak_allocated_ = 0;
    size_t total_allocations_ = 0;
    size_t failed_allocations_ = 0;

public:
    T* allocate() noexcept {
        ++total_allocations_;
        T* p = base_allocate();
        if (!p) {
            ++failed_allocations_;
        } else {
            if (allocated_ > peak_allocated_) peak_allocated_ = allocated_;
        }
        return p;
    }

    struct Stats {
        size_t allocated;
        size_t available;
        size_t peak;
        size_t total_allocs;
        size_t failed;
    };

    Stats get_stats() const {
        return {allocated_, N - allocated_, peak_allocated_,
                total_allocations_, failed_allocations_};
    }
};
```

런타임에 pool 사용 패턴을 추적합니다. 피크가 N에 도달한다면 N을 늘릴지 판단합니다.

## Heap-backed pool — 동적 pool

처음에 malloc을 한 번만 호출하고 이후로는 free list로 관리합니다.

```cpp
template<typename T>
class HeapPool {
    void* storage_;
    Slot* free_head_;
    size_t capacity_;

public:
    explicit HeapPool(size_t n) : capacity_(n) {
        storage_ = std::malloc(sizeof(Slot) * n);
        // ... free list 초기화
    }

    HeapPool(const HeapPool&) = delete;
    HeapPool& operator=(const HeapPool&) = delete;
    ~HeapPool() { std::free(storage_); }
};
```

시작 시점에 한 번만 malloc을 호출하고 이후로는 같은 크기 블록만 다루므로 heap fragmentation이 생기지 않습니다. 시스템 init 단계에서 만들어 두면 운용 중 malloc이 사라집니다.

static pool은 크기가 링크 단계에서 확정되어 RAM 초과가 링크 오류로 드러나고, heap pool의 malloc 실패는 부팅 때 런타임에야 드러납니다. 그래서 heap pool은 시작 시점에야 크기가 결정되는 경우(설정 파일로 슬롯 수를 정하는 경우 등)에만 씁니다.

## 자주 보는 함정과 안티패턴

### 1. Double free
```cpp
auto* p = pool.allocate();
pool.deallocate(p);
pool.deallocate(p);   // free list가 자기 자신을 가리킴
```

두 번째 `deallocate`는 `p->next = free_head_`(= `p`)를 써서 슬롯이 자기 자신을 가리키게 만듭니다. `ObjectPool<int, 4>`로 실행해 보면(g++-16) 이후 `allocate()` 세 번이 모두 같은 `p`를 돌려줬고, `allocated()`는 0에서 한 번 더 감소해 wrap된 뒤 세 번 증가한 2, `available()`은 2였습니다. 세 소유자가 같은 메모리를 나눠 쓰는데 pool은 정상이라고 보고합니다. RAII로 감싸 직접 호출을 피합니다.

### 2. Use after free
```cpp
auto* p = pool.allocate();
pool.deallocate(p);
p->method();   // p의 메모리는 next pointer로 변경됨
```
RAII로 lifetime을 명확히 합니다.

### 3. 큰 N으로 .bss 폭증
```cpp
ObjectPool<HugeStruct, 10000> pool;   // sizeof(HugeStruct) * 10000
```
N은 동시 최대 수요·실패 정책·RAM 예산으로 정합니다. peak_allocated는 관찰 표본일 뿐 최악 입력의 상한이 아니며 임의의 비율을 더한다고 충분성이 보장되지는 않습니다.

### 4. Thread safety 가정
single-thread pool을 RTOS task끼리 공유하면 race가 발생합니다. mutex를 두거나 task별로 별도 pool을 씁니다.

### 5. Pool 종류 너무 많음
타입마다 전용 pool을 두면 각 pool이 자기 최대 수요만큼 슬롯을 따로 잡습니다. 여러 타입의 최대 수요가 동시에 오지 않는다면 그 합만큼 RAM이 비어 있게 됩니다. 비슷한 크기는 공용 pool로 합칩니다.

### 6. initial free list 잘못
생성자 루프가 마지막 슬롯을 빼먹거나 하나를 건너뛰면, 그 슬롯은 한 번도 할당되지 않아 용량이 조용히 줄어듭니다. `allocated()`가 N이 되기 전에 `allocate()`가 nullptr를 반환하는지로 잡을 수 있습니다. 아래 예제처럼 N개를 할당한 뒤 `full()`이 true인지 검사합니다.

## Variable-size — Multi-pool

여러 크기를 처리하려면 여러 pool을 두고 크기에 따라 분기합니다.

```cpp
class MultiPool {
    struct alignas(std::max_align_t) Small { std::byte bytes[16]; };
    struct alignas(std::max_align_t) Medium { std::byte bytes[64]; };
    struct alignas(std::max_align_t) Large { std::byte bytes[256]; };
    ObjectPool<Small, 8> small_pool_;    // 16바이트 payload 8개
    ObjectPool<Medium, 8> medium_pool_;  // 64바이트 payload 8개
    ObjectPool<Large, 4> large_pool_;    // 256바이트 payload 4개

public:
    void* allocate(size_t n) {
        if (n <= 16) return small_pool_.allocate();
        if (n <= 64) return medium_pool_.allocate();
        if (n <= 256) return large_pool_.allocate();
        return nullptr;
    }
};
```

위 코드는 분류 구조를 보여 주는 부분 예제입니다. 해제는 클래스 멤버로 구현하고 small/medium/large 모두에 대응해야 합니다. 요청 n뿐 아니라 alignment도 검사해야 하며, 이 설계는 max_align_t보다 큰 정렬을 지원하지 않습니다. 원래 선택된 크기 등급·활성 할당 상태를 보존해야 합니다.

```cpp
void deallocate(void* p, size_t n) {
    if (n <= 16) small_pool_.deallocate(static_cast<Small*>(p));
    else if (n <= 64) medium_pool_.deallocate(static_cast<Medium*>(p));
    // ...
}
```

malloc과 비슷한 generic allocator가 됩니다. 각 pool 안에서는 외부 fragmentation이 없지만 두 가지 낭비가 생깁니다. 하나는 내부 낭비입니다. 17바이트 요청은 64바이트 Medium 블록을 쓰므로 47바이트가 버려집니다. 다른 하나는 등급 간 불균형입니다. Small 슬롯이 남아 있어도 Medium 8개가 다 차면 Medium 요청은 실패합니다.

## 실행 확인 — 고갈·재사용·정렬·수명

앞의 object-pool.hpp와 다음 파일을 같은 디렉터리에 둡니다. 빈 pool, N=2 고갈, 반환 슬롯 재사용, 64바이트 정렬, 소멸 횟수를 확인합니다. 잘못된 포인터와 double-free는 계약 위반이며 이 간단한 pool은 이를 검출하지 않습니다.

```cpp title="pool-check.cpp"
#include "object-pool.hpp"
#include <cassert>
#include <cstdint>
struct alignas(64) Message {
    static inline int live = 0;
    int value;
    explicit Message(int n) noexcept : value(n) { ++live; }
    ~Message() noexcept { --live; }
};
int main() {
    ObjectPool<Message, 2> pool;
    assert(pool.empty() && pool.available() == 2);
    auto* a = pool.construct(1);
    auto* b = pool.construct(2);
    assert(a && b && Message::live == 2 && pool.full());
    assert(reinterpret_cast<std::uintptr_t>(a) % alignof(Message) == 0);
    assert(pool.construct(3) == nullptr);
    pool.destroy(a);
    auto* c = pool.construct(3);
    assert(c == a && c->value == 3);
    pool.destroy(b); pool.destroy(c);
    assert(pool.empty() && Message::live == 0);
}
```

Homebrew Clang 23.1.5에서 `-std=c++17 -Wall -Wextra -Werror -fsanitize=address,undefined`로 실행해 진단 없이 exit 0이었습니다. 이 장은 malloc 대비 속도·보드 cycle·동시성 안전성을 측정하지 않았습니다.

## 정리

- Pool은 고정 크기 블록과 free list로 구성되며 O(1)에 할당과 해제가 가능합니다.
- union 슬롯은 T와 next 포인터 중 큰 쪽 및 정렬 패딩을 수용합니다.
- 동시성 보호는 별도 설계하며 atomic head만으로 안전한 lock-free pool이 되지는 않습니다.
- PoolUniquePtr는 소유권 자동 반환을 돕지만 pool 수명과 nothrow 생성 계약은 별도로 지켜야 합니다.
- 통계를 추적하면 capacity tuning이 가능합니다.
- 여러 크기를 다룰 때는 multi-pool로 가며, 크기 등급에 따른 내부 낭비와 등급 간 불균형이 생깁니다.

## 근거와 검증 범위

2026-11-16에 `pool-check.cpp`를 Homebrew Clang 23.1.5·libc++의 macOS arm64 host에서 ASan·UBSan으로, double free 실험을 g++-16으로 실행했습니다. `allocate`·`deallocate`의 Cortex-M4 디스어셈블리는 arm-none-eabi-g++ 16.2.0 오브젝트에서 얻었고 보드 실행·WCET은 하지 않았습니다. 다른 이름 없는 코드 블록은 주변에 정의한 장치 API를 가정하는 부분 예제이며 하나의 translation unit으로 합치지 않습니다.

- [객체 수명·저장소 재사용](https://eel.is/c++draft/basic.life)
- [union 활성 멤버 수명](https://eel.is/c++draft/class.union)

## 관련 항목

- [Part 3-01: 동적 할당 없이 C++ 쓰기](/blog/embedded/embedded-cpp/part3-01-no-dynamic-alloc)
- [Part 3-02: Custom Allocator 기초](/blog/embedded/embedded-cpp/part3-02-custom-allocator-basics)
- [Part 3-04: std::pmr 활용](/blog/embedded/embedded-cpp/part3-04-pmr) — 표준 인터페이스 pool
- [Part 4-03: Lock-free 기초](/blog/embedded/embedded-cpp/part4-03-lock-free-basics)
- [Part 2-02: RAII 실전 패턴](/blog/embedded/embedded-cpp/part2-02-raii-patterns) — PoolUniquePtr

## 다음 글

[Part 3-04: std::pmr 활용](/blog/embedded/embedded-cpp/part3-04-pmr) — C++17 표준 polymorphic allocator로, 같은 컨테이너 타입에 다른 pool을 사용합니다.
