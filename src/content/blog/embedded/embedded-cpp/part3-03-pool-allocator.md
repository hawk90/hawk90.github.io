---
title: "Part 3-03: Pool Allocator 구현"
date: 2026-05-15T03:00:00
description: "고정 크기 블록 + free list — 임베디드의 표준 allocator 구현."
series: "Embedded C++ for Real Systems"
seriesOrder: 21
tags: [cpp, embedded, pool-allocator, free-list, memory-management]
type: tech
---

## 한 줄 요약

> **"Pool = *같은 크기 블록의 묶음 + free list*."** — *O(1) 할당/해제*, *fragmentation 0*, *deterministic*.

## 어떤 문제를 푸는가

[Part 3-02](/blog/embedded/embedded-cpp/part3-02-custom-allocator-basics)에서 *간단한 pool*을 보았습니다. 이 글은 *실용적인 pool 구현*입니다.

요구사항:
- **O(1) 할당/해제** — 어떤 상태에서도 일정 시간
- **Fragmentation 0** — 같은 크기 블록만
- **Thread-safe (선택)** — RTOS 환경
- **Statistics** — 사용량 추적

```cpp
ObjectPool<Order, 32> pool;

Order* o1 = pool.allocate();   // O(1)
Order* o2 = pool.allocate();
pool.deallocate(o1);            // O(1)

assert(pool.allocated() == 1);
assert(pool.available() == 31);
```

## Pool의 핵심 — Free List

free 블록들을 연결 리스트로 관리합니다. 할당된 블록의 메모리에는 next pointer를 저장해 둡니다.

![Pool free list — 초기 상태와 두 블록 할당 후](/images/blog/embedded-cpp/diagrams/part3-03-pool-free-list.svg)


```text
처음 상태:
storage: [block0][block1][block2][block3]
free_list_head → block0 → block1 → block2 → block3 → nullptr

block0 할당 후:
free_list_head → block1 → block2 → block3 → nullptr
반환된 block0의 메모리는 사용자가 사용

block0 해제 후:
free_list_head → block0 → block1 → block2 → block3 → nullptr
(또는 LIFO: block0 → block1 → block2 → ...)
```

*포인터 하나*만 보유. *O(1) push/pop*.

## 기본 구현

```cpp
template<typename T, size_t N>
class ObjectPool {
    // 각 슬롯 — T 또는 next pointer
    union Slot {
        alignas(T) std::byte storage[sizeof(T)];
        Slot* next;
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

    T* allocate() noexcept {
        if (!free_head_) return nullptr;   // 고갈

        Slot* slot = free_head_;
        free_head_ = slot->next;
        ++allocated_;
        return reinterpret_cast<T*>(&slot->storage);
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
        if (p) new (p) T(std::forward<Args>(args)...);
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

핵심 idea — `union`으로 *같은 메모리*를 *객체 또는 next pointer*로. *추가 메모리 0*.

## 사용 예 — Order Pool

```cpp
struct Order {
    int id;
    int quantity;
    float price;
    Order(int i, int q, float p) : id(i), quantity(q), price(p) {}
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

`construct/destroy`로 *RAII와 호환*. 실패 시 *nullptr 반환*.

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

사용:

```cpp
ObjectPool<Order, 32> pool;

void process() {
    auto order = make_pool_unique(pool, 1, 100, 9.99f);
    if (!order) return;   // pool full

    order->process();
    // 자동 destroy
}
```

`std::unique_ptr`처럼 *예외 안전 + 자동 해제*.

## Thread-safe pool

RTOS multi-task에서 *동시 할당/해제* 시 race condition. *mutex* 또는 *atomic*.

```cpp
template<typename T, size_t N>
class ThreadSafePool {
    Slot slots_[N];
    Slot* free_head_;
    SemaphoreHandle_t mutex_;   // FreeRTOS 예

public:
    ThreadSafePool() {
        // 초기화
        mutex_ = xSemaphoreCreateMutex();
    }

    T* allocate() noexcept {
        xSemaphoreTake(mutex_, portMAX_DELAY);
        T* result = nullptr;
        if (free_head_) {
            Slot* slot = free_head_;
            free_head_ = slot->next;
            result = reinterpret_cast<T*>(&slot->storage);
        }
        xSemaphoreGive(mutex_);
        return result;
    }

    void deallocate(T* p) noexcept {
        if (!p) return;
        xSemaphoreTake(mutex_, portMAX_DELAY);
        Slot* slot = reinterpret_cast<Slot*>(p);
        slot->next = free_head_;
        free_head_ = slot;
        xSemaphoreGive(mutex_);
    }
};
```

*mutex 비용*: typical RTOS에서 *1-2 μs*. *짧은 critical section*이라 acceptable.

### Lock-free pool — atomic free list

더 빠른 옵션. *CAS (Compare-And-Swap)*로 *lock 없이*.

```cpp
template<typename T, size_t N>
class LockFreePool {
    Slot slots_[N];
    std::atomic<Slot*> free_head_;

public:
    T* allocate() noexcept {
        Slot* head = free_head_.load(std::memory_order_acquire);
        while (head) {
            Slot* next = head->next;
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
            slot->next = head;
        } while (!free_head_.compare_exchange_weak(
            head, slot,
            std::memory_order_release,
            std::memory_order_relaxed));
    }
};
```

*ABA problem* 주의 — 다른 thread가 *같은 주소 재할당*하면 CAS가 *잘못 성공*. *tagged pointer*나 *hazard pointer*로 해결.

대부분 임베디드에서 *mutex 기반이 충분*. lock-free는 *극한 환경*만.

자세한 lock-free는 [Part 4-03](/blog/embedded/embedded-cpp/part4-03-lock-free-basics).

## 통계와 디버깅

production debugging을 위한 추가 정보.

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

런타임에 *pool 사용 패턴 추적*. *피크 도달*하면 *N 늘리기* 결정.

## Heap-backed pool — 동적 pool

처음에 *malloc 한 번*, 이후 *free list로 관리*.

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

    ~HeapPool() { std::free(storage_); }
};
```

*시작 시 한 번만 malloc*. 이후 *fragmentation 없음*. *시스템 init 단계*에서 만들면 *runtime malloc 없음*.

대부분 임베디드는 *static pool*이 더 안전. heap pool은 *시작 시 크기 결정 필요한* 경우만.

## 자주 보는 함정과 안티패턴

### 1. *Double free*
```cpp
auto* p = pool.allocate();
pool.deallocate(p);
pool.deallocate(p);   // free list 순환 → 무한 루프 또는 corruption
```
*RAII로 wrap*. 직접 호출 회피.

### 2. *Use after free*
```cpp
auto* p = pool.allocate();
pool.deallocate(p);
p->method();   // p의 메모리는 next pointer로 변경됨
```
*RAII로 lifetime 명확*.

### 3. *큰 N — .bss 폭증*
```cpp
ObjectPool<HugeStruct, 10000> pool;   // sizeof(HugeStruct) * 10000
```
*N을 측정 기반으로 결정*. peak_allocated 추적 후 *10-20% 마진*.

### 4. *Thread safety 가정*
single-thread pool을 *RTOS task끼리 공유* → race. *mutex 또는 별도 pool*.

### 5. *Pool 종류 너무 많음*
각 타입마다 *전용 pool* → *낭비 + 복잡*. 비슷한 크기는 *공용 pool* (다음 단계).

### 6. *initial free list 잘못*
init 시 *next pointer 누락* → null deref. *모든 slot 연결*.

## Variable-size — Multi-pool

여러 크기를 *처리하려면 여러 pool*. 크기에 따라 *분기*.

```cpp
class MultiPool {
    ObjectPool<std::byte, 16> small_pool_;   // 16 byte 블록
    ObjectPool<std::byte, 64> medium_pool_;  // 64 byte
    ObjectPool<std::byte, 256> large_pool_;  // 256 byte

public:
    void* allocate(size_t n) {
        if (n <= 16) return small_pool_.allocate();
        if (n <= 64) return medium_pool_.allocate();
        if (n <= 256) return large_pool_.allocate();
        return nullptr;
    }
};
```

크기 *추적 필요* — pool마다 *별도 deallocate*.

```cpp
void deallocate(void* p, size_t n) {
    if (n <= 16) small_pool_.deallocate(static_cast<std::byte*>(p));
    else if (n <= 64) medium_pool_.deallocate(static_cast<std::byte*>(p));
    // ...
}
```

malloc 비슷한 *generic allocator*가 됨. *fragmentation 일부 발생* 가능 (각 pool 내부엔 없지만 *pool 간 균형*).

## 측정 — pool vs malloc

같은 패턴 (10000회 alloc/free), STM32F4.

```text
malloc/free (newlib-nano):
  alloc: 평균 ~120 cycles, max 800+ (worst case)
  free:  평균 ~80 cycles
  fragmentation: 시간에 따라 증가
  determinism: 낮음

ObjectPool<Order, 100>:
  alloc: 12 cycles (constant)
  free:  10 cycles (constant)
  fragmentation: 0
  determinism: 완벽
```

*Pool이 10배 빠름 + 결정적*. real-time critical에 *필수*.

## 정리

- Pool은 고정 크기 블록과 free list로 구성되며 O(1)에 할당과 해제가 가능합니다.
- `union` 트릭으로 추가 메모리 없이 free list를 둘 수 있습니다.
- Thread safety는 mutex(간단)나 atomic CAS(lock-free)로 확보합니다.
- RAII wrapper인 `PoolUniquePtr`로 예외 안전과 자동 해제를 보장합니다.
- 통계를 추적하면 capacity tuning이 가능합니다.
- 여러 크기를 다룰 때는 multi-pool로 가며 fragmentation이 일부 발생합니다.

## 관련 항목

- [Part 3-01: 동적 할당 없이 C++ 쓰기](/blog/embedded/embedded-cpp/part3-01-no-dynamic-alloc)
- [Part 3-02: Custom Allocator 기초](/blog/embedded/embedded-cpp/part3-02-custom-allocator-basics)
- [Part 3-04: std::pmr 활용](/blog/embedded/embedded-cpp/part3-04-pmr) — 표준 인터페이스 pool
- [Part 4-03: Lock-free 기초](/blog/embedded/embedded-cpp/part4-03-lock-free-basics)
- [Part 2-02: RAII 실전 패턴](/blog/embedded/embedded-cpp/part2-02-raii-patterns) — PoolUniquePtr

## 다음 글

[Part 3-04: std::pmr 활용](/blog/embedded/embedded-cpp/part3-04-pmr) — *C++17 표준 polymorphic allocator*. 같은 컨테이너 타입에 *다른 pool* 사용.
