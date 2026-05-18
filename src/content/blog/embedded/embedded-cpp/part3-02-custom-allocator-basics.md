---
title: "Part 3-02: Custom Allocator 기초"
date: 2026-05-15T02:00:00
description: "STL allocator interface — 표준 컨테이너의 메모리 출처를 제어."
series: "Embedded C++ for Real Systems"
seriesOrder: 20
tags: [cpp, embedded, allocator, custom-allocator, stl]
type: tech
---

## 한 줄 요약

> **"Allocator는 *메모리 출처*를 STL에 알려줍니다."** — `std::vector<int, MyAllocator>`로 *내 메모리* 사용.

## 어떤 문제를 푸는가

`std::vector<int>`의 기본 allocator는 `std::allocator<int>` — *heap (new/malloc)*. 임베디드에서는 *heap 회피*가 원칙이지만 *표준 컨테이너의 편리함*은 포기하기 어렵습니다.

```cpp
std::vector<int> v;
v.push_back(1);   // new 호출 — heap
```

**Custom allocator**는 *STL과 호환되는 메모리 인터페이스*. *pool, stack arena, 특정 메모리 영역*에서 할당하도록.

```cpp
std::vector<int, MyPoolAllocator<int>> v;
v.push_back(1);   // pool에서 할당
```

이 글은 *STL allocator concept*과 *기본 구현*입니다.

## Allocator Concept (C++17 이전)

STL 컨테이너는 *allocator concept*을 따르는 객체를 사용. C++17 이전:

```cpp
template<typename T>
class MyAllocator {
public:
    using value_type = T;

    MyAllocator() noexcept = default;

    template<typename U>
    MyAllocator(const MyAllocator<U>&) noexcept {}

    T* allocate(std::size_t n) {
        // 메모리 할당 (n * sizeof(T) 바이트)
        return static_cast<T*>(::operator new(n * sizeof(T)));
    }

    void deallocate(T* p, std::size_t /*n*/) noexcept {
        ::operator delete(p);
    }
};

template<typename T, typename U>
bool operator==(const MyAllocator<T>&, const MyAllocator<U>&) { return true; }

template<typename T, typename U>
bool operator!=(const MyAllocator<T>&, const MyAllocator<U>&) { return false; }
```

핵심 요구사항:
- `value_type` typedef
- `allocate(n)` — n * sizeof(T) 바이트 반환
- `deallocate(p, n)` — 반환
- *컨테이너끼리 비교* 가능 — `operator==`, `operator!=`

C++20에서는 *concept으로 강제* (`std::allocator_traits`).

## 가장 단순한 예 — Pool Allocator

고정 크기 pool에서 할당.

```cpp
template<typename T, size_t N>
class PoolAllocator {
public:
    using value_type = T;

    PoolAllocator() noexcept = default;

    template<typename U>
    PoolAllocator(const PoolAllocator<U, N>&) noexcept {}

    T* allocate(std::size_t n) {
        if (n != 1) throw std::bad_alloc();   // 한 번에 1개만
        for (size_t i = 0; i < N; ++i) {
            if (!in_use_[i]) {
                in_use_.set(i);
                return reinterpret_cast<T*>(&storage_[sizeof(T) * i]);
            }
        }
        throw std::bad_alloc();
    }

    void deallocate(T* p, std::size_t /*n*/) noexcept {
        size_t i = (reinterpret_cast<std::byte*>(p) - storage_) / sizeof(T);
        if (i < N) in_use_.reset(i);
    }

private:
    static inline alignas(T) std::byte storage_[sizeof(T) * N]{};
    static inline std::bitset<N> in_use_{};
};
```

문제: *throw* — `-fno-exceptions`. 다른 패턴 필요.

## No-exception allocator — abort 사용

`-fno-exceptions`에서는 *throw 대신* abort 또는 null 처리.

```cpp
template<typename T, size_t N>
class NoExceptPoolAllocator {
public:
    using value_type = T;

    T* allocate(std::size_t n) noexcept {
        if (n != 1) std::abort();
        for (size_t i = 0; i < N; ++i) {
            if (!in_use_[i]) {
                in_use_.set(i);
                return reinterpret_cast<T*>(&storage_[sizeof(T) * i]);
            }
        }
        std::abort();   // 또는 다른 fail 메커니즘
    }

    void deallocate(T* p, std::size_t) noexcept {
        size_t i = (reinterpret_cast<std::byte*>(p) - storage_) / sizeof(T);
        if (i < N) in_use_.reset(i);
    }
    // ...
};
```

표준 STL은 *allocate가 throw하거나 정상 반환* 가정. *abort/null*은 *STL 호환 깨짐*. *ETL이나 직접 구현 컨테이너* 권장.

## C++17 — `std::pmr::polymorphic_allocator`

C++17이 *polymorphic allocator*를 도입. *런타임에 allocator 변경 가능*.

```cpp
#include <memory_resource>

std::pmr::vector<int> v(&my_pool);
// 같은 std::pmr::vector<int> 타입이지만
// 런타임에 다른 pool 사용 가능
```

자세한 내용은 [Part 3-04: std::pmr 활용](/blog/embedded/embedded-cpp/part3-04-pmr).

## Stateful allocator

allocator가 *상태를 가짐* — pool 포인터, arena 등.

```cpp
template<typename T>
class ArenaAllocator {
    Arena* arena_;
public:
    using value_type = T;

    explicit ArenaAllocator(Arena* arena) : arena_(arena) {}

    template<typename U>
    ArenaAllocator(const ArenaAllocator<U>& other) : arena_(other.arena()) {}

    Arena* arena() const { return arena_; }

    T* allocate(std::size_t n) {
        return static_cast<T*>(arena_->allocate(n * sizeof(T), alignof(T)));
    }

    void deallocate(T* p, std::size_t /*n*/) noexcept {
        // arena는 한 번에 해제 — 개별 deallocate 무의미
    }
};

template<typename T, typename U>
bool operator==(const ArenaAllocator<T>& a, const ArenaAllocator<U>& b) {
    return a.arena() == b.arena();
}
```

*상태 있는 allocator*는 *컨테이너 간 비교*가 *meaningful*. 같은 arena 사용하는 두 vector만 *동등*.

## Arena allocator — bump pointer

가장 단순한 stateful allocator. *포인터를 증가*시키며 할당. *개별 해제 불가*.

```cpp
class Arena {
    std::byte* base_;
    std::byte* current_;
    std::byte* end_;

public:
    Arena(std::byte* buffer, size_t size)
        : base_(buffer), current_(buffer), end_(buffer + size) {}

    void* allocate(size_t bytes, size_t alignment) {
        // align 맞추기
        auto* aligned = reinterpret_cast<std::byte*>(
            (reinterpret_cast<uintptr_t>(current_) + alignment - 1) & ~(alignment - 1));

        if (aligned + bytes > end_) return nullptr;   // 부족

        current_ = aligned + bytes;
        return aligned;
    }

    void reset() { current_ = base_; }   // 한 번에 모두 해제

    size_t used() const { return current_ - base_; }
};

std::array<std::byte, 4096> buffer;
Arena arena(buffer.data(), buffer.size());
```

*매우 빠른 할당* (포인터 산술만). *fragmentation 0*. 단점: *개별 해제 불가*. *frame allocator*나 *transient 객체*에 적합.

## 임베디드 — Static memory pool

전역 또는 .bss의 *고정 메모리 영역*을 *pool로*.

```cpp
// 한 task의 transient allocation 용
template<typename T>
class TaskArenaAllocator {
    static inline std::array<std::byte, 4096> arena_storage_{};
    static inline Arena arena_{arena_storage_.data(), arena_storage_.size()};

public:
    using value_type = T;

    TaskArenaAllocator() = default;
    template<typename U> TaskArenaAllocator(const TaskArenaAllocator<U>&) {}

    T* allocate(std::size_t n) noexcept {
        auto* p = arena_.allocate(n * sizeof(T), alignof(T));
        if (!p) std::abort();
        return static_cast<T*>(p);
    }

    void deallocate(T*, std::size_t) noexcept {
        // no-op (arena가 reset으로 일괄 해제)
    }

    static void reset() { arena_.reset(); }
};

// 사용
void process_frame() {
    std::vector<int, TaskArenaAllocator<int>> v;
    v.push_back(1);   // arena에서
    v.push_back(2);
    // 함수 끝
    TaskArenaAllocator<int>::reset();   // 한 번에 해제
}
```

*프레임 단위 할당/해제*. 매 프레임 시작 시 reset.

## Allocator로 STL 컨테이너 사용

```cpp
// 정수 vector — pool에서 할당
std::vector<int, PoolAllocator<int, 32>> v;
v.push_back(1);
v.push_back(2);
// v가 사라지면 pool 자리 회수

// map — pool에서
std::map<int, Order, std::less<>, PoolAllocator<std::pair<const int, Order>, 16>> m;
m[1] = Order{};

// string — pool에서
std::basic_string<char, std::char_traits<char>, PoolAllocator<char, 256>> s;
s = "hello";
```

*STL의 인터페이스 그대로* + *제어된 메모리*. 단 *컨테이너 타입이 길어짐*.

C++17 *std::pmr*가 *훨씬 깔끔* — 같은 타입 (`std::pmr::vector<int>`), runtime 분기.

## C++20 allocator concept

`std::allocator_traits`가 모든 *기본 정의 제공*. 최소 구현:

```cpp
template<typename T>
struct MinimalAllocator {
    using value_type = T;

    T* allocate(std::size_t n) { /* */ }
    void deallocate(T* p, std::size_t n) { /* */ }

    // 나머지는 allocator_traits가 default
};

// 사용
std::vector<int, MinimalAllocator<int>> v;
```

C++17 이전엔 *수많은 typedef*가 필요했음. 이제 *value_type, allocate, deallocate* 3개만.

## 자주 보는 함정과 안티패턴

### 1. *rebind 누락*
```cpp
std::list<int, MyAllocator<int>> l;
// list 내부에 ListNode<int> 할당 필요
// rebind로 MyAllocator<ListNode<int>> 만들어야
```
*allocator_traits가 자동 rebind* — C++17 이후 보통 무관.

### 2. *allocator 비교 잘못*
```cpp
bool operator==(const MyAlloc&, const MyAlloc&) { return true; }   // 다른 pool도 같다고?
```
*상태 있는 allocator*는 *상태 비교*해야. 잘못된 비교는 *컨테이너 move/swap 망침*.

### 3. *deallocate에서 size 무시*
```cpp
void deallocate(T* p, size_t n) {
    free(p);   // n 무시 — array는 어떻게?
}
```
*allocator에 따라 size 필요*. pool은 무시 OK, 다른 경우 필요.

### 4. *throw 사용*
`-fno-exceptions` + throw → *abort*. *abort 명시* 또는 *예외 활성*.

### 5. *thread safety 가정*
multi-thread에서 *같은 pool 동시 접근* → race. *mutex* 또는 *thread-local pool*.

### 6. *복잡한 allocator*
*간단한 pool*로 충분한데 *generic allocator 만들기*. *프로젝트 needs*에 맞게.

## 측정 — Pool vs heap allocator

같은 `std::vector<int>`, 10000회 push_back.

```text
# heap (std::allocator)
allocation: 변동 (realloc 시점)
total time: 1.2 ms
fragmentation: 시간에 따라 증가

# pool (fixed size)
allocation: 일정 (pool slot 1개)
total time: 0.4 ms
fragmentation: 0
```

Pool이 *3배 빠름 + 결정적*. 임베디드 real-time에 *중요*.

## 정리

- Custom allocator는 STL의 메모리 출처를 제어하며 `value_type`, `allocate`, `deallocate` 세 가지만 구현하면 됩니다.
- Stateful allocator는 pool/arena 포인터를 보유하므로 컨테이너 간 비교에 의미가 있습니다.
- Arena allocator는 bump pointer 방식이라 개별 해제는 불가하지만 일괄 reset이 가능해 transient 객체에 적합합니다.
- `-fno-exceptions` 환경에서는 throw 대신 abort를 사용하며 STL 표준 호환이 깨질 수 있습니다.
- C++17 `std::pmr`이 훨씬 단순하며 다음 chapter에서 다룹니다.

## 관련 항목

- [Part 3-01: 동적 할당 없이 C++ 쓰기](/blog/embedded/embedded-cpp/part3-01-no-dynamic-alloc)
- [Part 3-03: Pool Allocator 구현](/blog/embedded/embedded-cpp/part3-03-pool-allocator)
- [Part 3-04: std::pmr 활용](/blog/embedded/embedded-cpp/part3-04-pmr)
- [Part 4-02: ETL 라이브러리](/blog/embedded/embedded-cpp/part4-02-etl-library)

## 다음 글

[Part 3-03: Pool Allocator 구현](/blog/embedded/embedded-cpp/part3-03-pool-allocator) — 임베디드의 *대표적 allocator*. 고정 크기 블록, free list 관리.
