---
title: "Custom Allocator 기초 — std::allocator 인터페이스 분석"
slug: "embedded/embedded-cpp/part3-02-custom-allocator-basics"
date: 2026-04-30T09:20:00
description: "STL allocator interface — 표준 컨테이너의 메모리 출처를 제어."
series: "Embedded C++ for Real Systems"
seriesOrder: 20
tags: [cpp, embedded, allocator, custom-allocator, stl]
type: tech
topics: ["embedded"]
---

## 한 줄 요약

> **"Allocator는 메모리 출처를 STL에 알려줍니다."** `std::vector<int, MyAllocator>` 형태로 내가 지정한 메모리를 사용합니다.

## 어떤 문제를 푸는가

`std::vector<int>`의 기본 allocator는 `std::allocator<int>`이며 heap(new/malloc)을 사용합니다. 임베디드에서는 heap 회피가 원칙이지만 표준 컨테이너의 편리함을 포기하기는 어렵습니다.

```cpp
std::vector<int> v;
v.push_back(1);   // new 호출 — heap
```

**Custom allocator**는 STL과 호환되는 메모리 인터페이스입니다. pool, stack arena, 특정 메모리 영역에서 할당하도록 만들 수 있습니다.

```cpp
std::vector<int, MyPoolAllocator<int>> v;
v.push_back(1);   // pool에서 할당
```

이 글은 STL allocator concept과 기본 구현을 다룹니다.

## Allocator 요구사항과 C++11 allocator_traits

STL 컨테이너는 allocator 요구사항을 따르는 객체를 사용합니다. `std::allocator_traits`는 C++11부터 존재하며, 아래처럼 타입 매개변수만 있는 stateless allocator의 기본 정보를 보완합니다. C++20 언어 concept으로 자동 검사한다는 뜻은 아닙니다.

```cpp
template<typename T>
class MyAllocator {
public:
    using value_type = T;

    MyAllocator() noexcept = default;

    template<typename U>
    MyAllocator(const MyAllocator<U>&) noexcept {}

    T* allocate(std::size_t n) {
        static_assert(alignof(T) <= alignof(std::max_align_t), "alignment unsupported");
        if (n > std::numeric_limits<std::size_t>::max() / sizeof(T))
            throw std::bad_alloc();
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

핵심 요구사항은 이렇습니다.

- `value_type` typedef를 제공합니다.
- `allocate(n)`이 n * sizeof(T) 바이트를 반환합니다.
- `deallocate(p, n)`으로 메모리를 돌려줍니다.
- `operator==`, `operator!=`로 컨테이너끼리 비교가 가능합니다.

위 예는 <cstddef>·<limits>·<new>를 포함하며 기본 new 정렬보다 큰 T는 거부합니다. 할당자는 n개 원소의 연속 저장소·정렬·고갈 처리와 동등성 계약을 만족해야 합니다. 객체 생성은 별도이며 컨테이너가 allocator_traits를 통해 처리합니다.

## 가장 단순한 예 — Pool Allocator

고정 크기 pool에서 할당하는 기본형입니다.

```cpp
template<typename T, size_t N>
class PoolAllocator {
public:
    using value_type = T;
    template<class U> struct rebind { using other = PoolAllocator<U, N>; };

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
    alignas(T) static inline std::byte storage_[sizeof(T) * N]{};
    static inline std::bitset<N> in_use_{};
};
```

이 구현은 n==1만 받는 단일 객체 실험용입니다. 컨테이너가 `allocate`에 넘기는 n을 기록하는 allocator로 재 보면 이유가 보입니다. `push_back`을 20번 하는 동안 `std::vector`는 n = 1, 2, 4, 8, 16, 32를 요청했고, `std::list`는 노드마다 n = 1을 요청했습니다(g++-16의 libstdc++, Clang 23.1.5의 libc++ 결과 동일). 그래서 이 pool은 `std::list<int, PoolAllocator<int, 8>>`에서는 노드 8개까지 들어가고 9번째에서 `bad_alloc`을 던졌지만, `std::vector`에서는 두 번째 `push_back`(n = 2 요청)에서 바로 `bad_alloc`이었습니다. 여러 원소를 연속으로 요구하는 vector·string의 일반 allocator로 쓸 수 없습니다. N은 슬롯 개수이며 노드 크기가 아닙니다. 비타입 매개변수 N을 포함하므로 rebind도 명시했습니다. 복사본은 같은 정적 저장소를 공유하고, 포인터는 해당 저장소에서 얻은 활성 슬롯이어야 합니다.

## No-exception allocator — abort 사용

`-fno-exceptions`에서 계속 실행해야 한다면 고갈을 사전 검사하는 비표준 컨테이너 API를 선택합니다. 표준 allocator의 allocate는 실패 시 null을 정상 결과로 반환하면 안 됩니다. 프로그램 종료가 정책이면 abort 같은 종료 경로를 사용할 수 있지만 복구할 수는 없습니다.

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

정상 복귀하는 allocate는 요구 크기와 정렬을 만족하는 유효 저장소를 반환해야 합니다. null 반환과 프로세스 종료는 서로 다릅니다. 종료 정책은 오류를 반환하는 API로 대체할 수 있는지 먼저 검토합니다.

## C++17 — `std::pmr::polymorphic_allocator`

C++17이 polymorphic allocator를 도입하면서 런타임에 allocator를 바꿀 수 있게 됐습니다.

```cpp
#include <memory_resource>

std::pmr::vector<int> v(&my_pool);
// 같은 std::pmr::vector<int> 타입이지만
// 런타임에 다른 pool 사용 가능
```

자세한 내용은 [Part 3-04: std::pmr 활용](/blog/embedded/embedded-cpp/part3-04-pmr).

## Stateful allocator

allocator가 pool 포인터나 arena 같은 상태를 가지는 경우입니다.

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
        if (n > static_cast<std::size_t>(-1) / sizeof(T)) throw std::bad_alloc();
        void* p = arena_->allocate(n * sizeof(T), alignof(T));
        if (!p) throw std::bad_alloc();
        return static_cast<T*>(p);
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

상태 있는 allocator는 컨테이너 간 비교가 의미를 가집니다. 같은 arena를 사용하는 두 vector만 동등합니다.

## Arena allocator — bump pointer

가장 단순한 stateful allocator입니다. 포인터를 증가시키며 할당하므로 개별 해제는 불가합니다.

```cpp
class Arena {
    std::byte* base_;
    std::byte* current_;
    std::byte* end_;

public:
    Arena(std::byte* buffer, size_t size)
        : base_(buffer), current_(buffer), end_(buffer + size) {}

    void* allocate(size_t bytes, size_t alignment) {
        // alignment는 0이 아닌 지원되는 2의 거듭제곱이어야 합니다.
        void* p = current_;
        auto remaining = static_cast<std::size_t>(end_ - current_);
        if (!std::align(alignment, bytes, p, remaining)) return nullptr;
        current_ = static_cast<std::byte*>(p) + bytes;
        return p;
    }

    void reset() { current_ = base_; }   // 한 번에 모두 해제

    size_t used() const { return current_ - base_; }
};

std::array<std::byte, 4096> buffer;
Arena arena(buffer.data(), buffer.size());
```

할당은 정렬 계산(`std::align`)과 포인터 증가뿐이고, 해제가 없으므로 빈 구멍이 생기는 외부 fragmentation도 없습니다. 정렬 맞춤으로 버려지는 내부 padding만 있습니다. 단점은 개별 해제가 불가하다는 점입니다. 한 프레임·한 요청 동안만 사는 transient 객체에 맞습니다.

## 임베디드 — Static memory pool

전역 또는 .bss의 고정 메모리 영역을 pool로 활용합니다.

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
        if (n > std::numeric_limits<std::size_t>::max() / sizeof(T)) std::abort();
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
    // v가 살아 있는 동안 reset하지 않습니다.
}
```

이 예제의 정적 arena는 T별로 따로 생기며 task-local이 아닙니다. 복사·rebind·동등성을 모두 구현한 완전한 allocator로 사용하기 전에는 설계 보완이 필요합니다. reset은 모든 관련 컨테이너를 먼저 소멸시킨 뒤 호출해야 합니다. 정적 저장소를 task끼리 공유하면 동기화도 필요합니다.

## 실행 확인 — allocator_traits와 연속 할당

단일 슬롯 pool 대신 다음 allocator로 vector가 실제 요청하는 n을 확인합니다. 이 예제는 heap을 사용하며, allocator_traits의 C++11 기본 보완과 overflow 실패를 검증하기 위한 기준선입니다. over-aligned T는 지원하지 않는다고 명시적으로 제한합니다.

```cpp title="allocator.cpp"
#include <cassert>
#include <cstddef>
#include <limits>
#include <memory>
#include <new>
#include <vector>
template<class T> struct CheckedAllocator {
    using value_type = T;
    static_assert(alignof(T) <= alignof(std::max_align_t), "alignment unsupported");
    CheckedAllocator() noexcept = default;
    template<class U> CheckedAllocator(const CheckedAllocator<U>&) noexcept {}
    T* allocate(std::size_t n) {
        if (n > std::numeric_limits<std::size_t>::max() / sizeof(T))
            throw std::bad_alloc();
        return static_cast<T*>(::operator new(n * sizeof(T)));
    }
    void deallocate(T* p, std::size_t) noexcept { ::operator delete(p); }
};
template<class T, class U>
bool operator==(const CheckedAllocator<T>&, const CheckedAllocator<U>&) { return true; }
template<class T, class U>
bool operator!=(const CheckedAllocator<T>&, const CheckedAllocator<U>&) { return false; }
int main() {
    std::vector<int, CheckedAllocator<int>> values;
    values.reserve(4);
    for (int n = 0; n != 4; ++n) values.push_back(n);
    assert(values.size() == 4 && values[3] == 3);
    using Rebound = std::allocator_traits<CheckedAllocator<int>>::rebind_alloc<long>;
    Rebound a;
    auto* p = a.allocate(2);
    a.deallocate(p, 2);
    bool rejected = false;
    try { (void)a.allocate(std::numeric_limits<std::size_t>::max()); }
    catch (const std::bad_alloc&) { rejected = true; }
    assert(rejected);
}
```

```bash
clang++ -std=c++11 -Wall -Wextra -Werror allocator.cpp -o allocator
./allocator
```

Homebrew Clang 23.1.5와 g++-16 모두 `-std=c++11`에 ASan·UBSan을 더해 진단 없이 exit 0이었습니다. 한 개만 할당하는 pool은 별도의 ObjectPool 인터페이스로 사용하는 편이 계약을 분명히 드러냅니다. 연속 저장소·컨테이너 수명·상태 전파를 구현하지 않은 allocator를 vector·map·string 모두에 그대로 적용하지 않습니다.

## 자주 보는 함정과 안티패턴

### 1. rebind 누락
```cpp
std::list<int, MyAllocator<int>> l;
// list 내부에 ListNode<int> 할당 필요
// rebind로 MyAllocator<ListNode<int>> 만들어야
```
C++11부터 `A<T, 나머지 타입 인자...>` 형태는 traits가 rebind를 유추합니다([allocator.traits.types]). `PoolAllocator<T, N>`처럼 비타입 인자가 섞이면 유추할 수 없어 명시적인 rebind가 필요합니다. 위 `PoolAllocator`에서 `rebind`만 지우고 `std::list`에 쓰면 libstdc++는 `error: no type named 'type' in 'struct std::__replace_first_arg<PoolAllocator<int, 8>, int>'`, libc++는 `static assertion failed ...: This allocator has to implement rebind`로 멈춥니다.

### 2. allocator 비교 잘못
```cpp
bool operator==(const MyAlloc&, const MyAlloc&) { return true; }   // 다른 pool도 같다고?
```
상태 있는 allocator는 상태 자체를 비교해야 합니다. 컨테이너의 move 대입은 allocator를 전파하지 않을 때(`propagate_on_container_move_assignment`가 false) 두 allocator가 같다고 판단되면 원소를 옮기지 않고 저장소를 그대로 가져옵니다. 다른 arena를 같다고 답하면, 가져온 저장소를 나중에 엉뚱한 arena에 반환하게 됩니다(g++-16·Clang 23.1.5 모두 같은 arena를 동등하다고 답했을 때 원본 버퍼를 그대로 가져갔습니다. 요구사항은 [container.alloc.reqmts]).

### 3. deallocate에서 size 무시
```cpp
void deallocate(T* p, size_t n) {
    free(p);   // n 무시 — array는 어떻게?
}
```
해제 정책에 따라 n이 필요할 수 있습니다. 원래 malloc으로 얻은 p를 free하는 구현은 n을 쓰지 않아도 되며, 단순히 n을 무시했다는 이유만으로 배열 해제가 틀린 것은 아닙니다.

### 4. throw 사용
Clang/GCC에서 `-fno-exceptions`인 translation unit에 throw를 직접 쓰면 컴파일 오류입니다([Part 1-01](/blog/embedded/embedded-cpp/part1-01-cpp-vs-c#1-예외-처리)). 이미 빌드된 libstdc++의 실패 경로는 hosted 구성에서 라이브러리 안의 throw로 남아 `std::terminate`로 끝납니다([Part 1-02](/blog/embedded/embedded-cpp/part1-02-compiler-flags#주의--stl-함수가-던지는-예외)).

### 5. thread safety 가정
multi-thread에서 같은 pool을 동시에 접근하면 race가 발생합니다. mutex나 thread-local pool을 씁니다.

### 6. 복잡한 allocator
위 `PoolAllocator`가 vector에서 실패한 것처럼, 표준 allocator 인터페이스는 컨테이너마다 요청 형태가 달라 일반화할수록 rebind·동등성·전파를 모두 구현해야 합니다. 객체 하나씩만 필요하면 ObjectPool 인터페이스로 충분합니다.

## 측정 범위

이 장은 실행 시간이나 MCU cycle을 측정하지 않았습니다. 위 검증은 vector의 연속 할당·rebind·정수 overflow 실패 경로를 확인합니다. allocator 교체의 이득을 비교하려면 동일 프로그램, 입력, 라이브러리, 컴파일 옵션, allocation 요청 크기와 최대 지연을 함께 기록합니다.

## 정리

- Custom allocator는 STL의 메모리 출처를 제어하며 `value_type`, `allocate`, `deallocate` 기본 인터페이스 외에도 동등성·rebind·실패 계약을 만족해야 합니다.
- Stateful allocator는 pool/arena 포인터를 보유하므로 컨테이너 간 비교에 의미가 있습니다.
- Arena allocator는 bump pointer 방식이라 개별 해제는 불가하지만 일괄 reset이 가능해 transient 객체에 적합합니다.
- `-fno-exceptions` 환경에서는 throw 대신 실패 시 종료할지 오류 반환 API를 쓸지 정책을 정합니다.
- C++17 `std::pmr`은 allocator 타입을 하나(`polymorphic_allocator`)로 고정하고 메모리 출처를 런타임 객체로 넘겨, rebind·타입별 정적 저장소 문제를 없앱니다. Part 3-04에서 다룹니다.

## 근거와 검증 범위

2026-11-16에 `allocator.cpp`와 요청 크기 기록 실험을 Homebrew Clang 23.1.5(libc++)와 g++-16(libstdc++)으로 macOS arm64 host에서 실행했습니다. ASan·UBSan을 적용했으며 보드 실행·WCET은 하지 않았습니다. 다른 이름 없는 코드 블록은 주변에 정의한 장치 API를 가정하는 부분 예제이며 하나의 translation unit으로 합치지 않습니다.

- [C++11 이후 초안 N3337의 allocator_traits](https://www.open-std.org/jtc1/sc22/wg21/docs/papers/2012/n3337.pdf)
- [Allocator 요구사항](https://eel.is/c++draft/allocator.requirements)

## 관련 항목

- [Part 3-01: 동적 할당 없이 C++ 쓰기](/blog/embedded/embedded-cpp/part3-01-no-dynamic-alloc)
- [Part 3-03: Pool Allocator 구현](/blog/embedded/embedded-cpp/part3-03-pool-allocator)
- [Part 3-04: std::pmr 활용](/blog/embedded/embedded-cpp/part3-04-pmr)
- [Part 4-02: ETL 라이브러리](/blog/embedded/embedded-cpp/part4-02-etl-library)

## 다음 글

[Part 3-03: Pool Allocator 구현](/blog/embedded/embedded-cpp/part3-03-pool-allocator) — 임베디드의 대표적 allocator로, 고정 크기 블록과 free list 관리를 다룹니다.
