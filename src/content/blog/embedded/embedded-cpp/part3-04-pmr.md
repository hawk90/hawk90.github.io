---
title: "std::pmr 임베디드 활용 — Polymorphic Memory Resource 분석"
slug: "embedded/embedded-cpp/part3-04-pmr"
date: 2026-04-30T09:22:00
description: "C++17 polymorphic allocator — 같은 컨테이너 타입에 다른 메모리 출처 주입."
series: "Embedded C++ for Real Systems"
seriesOrder: 22
tags: [cpp, embedded, pmr, polymorphic-allocator, cpp17, memory-resource]
type: tech
topics: ["embedded"]
---

## 한 줄 요약

> **"`std::pmr::vector<int>`는 런타임에 allocator를 선택할 수 있습니다."** 전통적인 `std::vector<int, Alloc>`처럼 타입에 박히지 않습니다.

## 어떤 문제를 푸는가

[Part 3-02](/blog/embedded/embedded-cpp/part3-02-custom-allocator-basics) 방식의 custom allocator는 allocator가 타입에 박힙니다.

```cpp
std::vector<int, PoolAllocator<int, 16>> v1;     // pool 16
std::vector<int, PoolAllocator<int, 32>> v2;     // pool 32 — 다른 타입
// v1과 v2는 *다른 타입* — 호환 안 됨
```

함수 매개변수도 서로 다른 vector 타입이 됩니다. 두 vector를 받으려면 함수를 템플릿으로 만들어야 하고, allocator 타입마다 별도 인스턴스가 생깁니다.

C++17의 **std::pmr**(Polymorphic Memory Resource)이 이를 해결합니다.

```cpp
std::pmr::vector<int> v1(&pool1);     // pool1에서
std::pmr::vector<int> v2(&pool2);     // pool2에서
// v1과 v2는 *같은 타입* — 호환

void process(std::pmr::vector<int>& v) {
    // 어떤 pool 위 vector든 받음
}
```

메모리 출처를 런타임 객체(`memory_resource*`)로 넘기므로 컨테이너 타입이 하나로 유지되고, `process`도 한 번만 컴파일됩니다. 대가는 할당마다 가상 호출 한 번입니다.

## 핵심 — memory_resource

`std::pmr::memory_resource`는 abstract base class이며 virtual interface를 노출합니다.

```cpp
class memory_resource {
public:
    virtual ~memory_resource() = default;

    void* allocate(size_t bytes, size_t alignment) {
        return do_allocate(bytes, alignment);
    }

    void deallocate(void* p, size_t bytes, size_t alignment) {
        do_deallocate(p, bytes, alignment);
    }

    bool is_equal(const memory_resource& other) const {
        return do_is_equal(other);
    }

protected:
    virtual void* do_allocate(size_t, size_t) = 0;
    virtual void do_deallocate(void*, size_t, size_t) = 0;
    virtual bool do_is_equal(const memory_resource&) const noexcept = 0;
};
```

이 스케치는 핵심 세 customization 함수를 보여 줍니다. 가상 소멸자도 존재하며 vptr의 존재·크기와 레이아웃은 ABI에 따릅니다. 4바이트로 고정되지 않습니다.

`std::pmr::polymorphic_allocator<T>`가 memory_resource를 wrap해 STL allocator interface를 제공합니다.

## 표준 memory_resource 구현

C++17은 세 가지 기본 resource를 제공합니다.

### 1. `new_delete_resource` — heap

```cpp
auto* mr = std::pmr::new_delete_resource();
std::pmr::vector<int> v(mr);   // heap에서
```

초기 default resource는 new_delete_resource이며 set_default_resource로 바뀔 수 있습니다. heap 금지 경로에서는 default에 기대지 않고 명시적으로 resource를 전달합니다.

### 2. `null_memory_resource` — 항상 실패

```cpp
auto* mr = std::pmr::null_memory_resource();
std::pmr::vector<int> v(mr);
v.push_back(1);   // throws std::bad_alloc
```

heap 사용을 원치 않을 때 upstream으로 둡니다. 초기 버퍼가 바닥났을 때 heap으로 조용히 넘어가지 않고 `bad_alloc`으로 드러납니다.

### 3. `monotonic_buffer_resource` — bump pointer

미리 준비된 buffer에 순차적으로 할당하며, 개별 해제는 불가합니다.

```cpp
std::array<std::byte, 4096> buffer;
std::pmr::monotonic_buffer_resource mr(
    buffer.data(), buffer.size(), std::pmr::null_memory_resource());

std::pmr::vector<int> v(&mr);
v.reserve(100);
for (int i = 0; i < 100; ++i) v.push_back(i);
// 버퍼 고갈 시 upstream이 bad_alloc을 던짐
// mr 소멸 또는 release() 호출 시 일괄 reset
```

[Part 3-02의 Arena](/blog/embedded/embedded-cpp/part3-02-custom-allocator-basics)와 같은 아이디어이며, frame allocator에 적합합니다.

## 임베디드 — Static buffer pool

```cpp
// 전역 static buffer
constexpr size_t kPoolSize = 8192;
alignas(std::max_align_t) std::byte g_pool_buffer[kPoolSize];
std::pmr::monotonic_buffer_resource g_pool(
    g_pool_buffer, kPoolSize, std::pmr::null_memory_resource());

void process_request() {
    std::pmr::vector<Order> orders(&g_pool);
    orders.reserve(10);

    for (auto& req : input_requests) {
        orders.push_back(Order{req});
    }

    process_orders(orders);

    // 함수 끝 — orders는 소멸하지만 buffer는 안 비워짐
    // 다음 호출에 release 또는 reset 필요
}

void reset_pool() {
    g_pool.release();   // 또는 buffer 재할당
}
```

매 frame 또는 batch 시작 시점에 release합니다. 해제가 없으므로 구멍(외부 fragmentation)이 생기지 않습니다. 대신 함수 안에서 vector가 커지며 버린 이전 버퍼도 release 전까지 회수되지 않습니다. 아래 계측에서 `push_back` 100번은 총 1,020바이트를 요청했으니, `reserve` 없이 같은 buffer를 쓰면 원소 100개(400바이트)의 두 배 넘게 소비합니다(4바이트 × (1 + 2 + … + 128) = 1,020).

## 폴백 chain — unsynchronized_pool_resource

C++17은 크기 등급별 pool resource도 제공합니다. 다만 이 resource는 chunk를 upstream에서 받아 옵니다.

```cpp
std::pmr::pool_options opts{
    .max_blocks_per_chunk = 16,
    .largest_required_pool_block = 256
};

std::pmr::unsynchronized_pool_resource pool(opts);
std::pmr::vector<int> v(&pool);
```

unsynchronized_pool_resource는 다중 크기 등급과 chunk 재사용을 제공합니다. upstream을 따로 주지 않으면 default resource(초기값 `new_delete_resource`)를 씁니다. 호출을 세는 resource를 upstream으로 끼우고 기본 `pool_options`로 `push_back` 한 번만 해 보면, libstdc++(g++-16)는 upstream을 3번(총 1,744바이트), libc++(Clang 23.1.5)는 2번(총 1,336바이트) 불렀습니다. 위 `opts`(16, 256)로는 3번 608바이트, 2번 248바이트였습니다. 원소 4바이트 하나에 관리 구조와 chunk를 수백 바이트에서 1KB 넘게 받아 온 것이고, 그 크기는 라이브러리와 옵션마다 다릅니다. heap을 금지한 시스템이라면 upstream을 `monotonic_buffer_resource` 같은 정적 버퍼로 둡니다. 위 지정 초기화 문법은 C++20이 필요합니다. C++17에서는 pool_options opts{} 선언 뒤 멤버를 대입합니다.

## Custom memory_resource — 직접 정의

```cpp
class PoolMemoryResource : public std::pmr::memory_resource {
    Pool* pool_;

public:
    explicit PoolMemoryResource(Pool* pool) : pool_(pool) {}

protected:
    void* do_allocate(size_t bytes, size_t alignment) override {
        void* p = pool_->allocate(bytes, alignment);
        if (!p) throw std::bad_alloc();
        return p;
    }

    void do_deallocate(void* p, size_t /*bytes*/, size_t /*align*/) override {
        pool_->deallocate(p);
    }

    bool do_is_equal(const std::pmr::memory_resource& other) const noexcept override {
        auto* o = dynamic_cast<const PoolMemoryResource*>(&other);
        return o && o->pool_ == pool_;
    }
};

// 사용
Pool my_pool;
PoolMemoryResource mr(&my_pool);

std::pmr::vector<int> v(&mr);
```

`dynamic_cast`는 RTTI를 필요로 합니다. `-fno-rtti` 환경에서는 다른 방식으로 비교해야 합니다(`typeid` 회피).

## RTTI 없는 비교

memory_resource의 do_is_equal은 순수 가상 함수이며 기본 dynamic_cast 구현이 없습니다. 서로 다른 resource 종류가 들어올 수 있으므로 먼저 derived 포인터로 static_cast한 뒤 type id를 검사하는 방식은 안전하지 않습니다. 타입을 알기 전에는 그 파생 타입 멤버를 호출할 수 없습니다.

다른 인스턴스와 교차 해제할 필요가 없다면 객체 identity 비교가 가장 작은 안전한 구현입니다. 아래 resource는 allocation을 upstream에 위임하지만 equality는 자기 자신만 참으로 답합니다. 같은 upstream을 쓴다는 사실만으로 다른 타입으로 downcast하지 않습니다.

```cpp title="identity-resource.hpp"
#include <memory_resource>
class IdentityResource final : public std::pmr::memory_resource {
    std::pmr::memory_resource* upstream_;
    void* do_allocate(std::size_t n, std::size_t a) override {
        return upstream_->allocate(n, a);
    }
    void do_deallocate(void* p, std::size_t n, std::size_t a) override {
        upstream_->deallocate(p, n, a);
    }
    bool do_is_equal(const std::pmr::memory_resource& other) const noexcept override {
        return this == &other;
    }
public:
    explicit IdentityResource(std::pmr::memory_resource& upstream) noexcept
        : upstream_(&upstream) {}
};
```

## 복사·대입·swap의 resource 계약

같은 `std::pmr::vector<int>` 타입이어도 메모리 출처가 자동 전파되지는 않습니다. 일반 복사 생성 `auto copy = original;`은 polymorphic allocator의 copy-selection 규칙에 따라 **현재 default resource**를 사용합니다. 복사본도 특정 pool을 사용해야 한다면 `std::pmr::vector<int> copy(original, &pool);`처럼 allocator를 명시합니다.

복사 대입과 이동 대입에서는 대상 allocator가 유지됩니다. resource가 서로 같지 않은 이동 대입은 원소 이동과 추가 할당이 필요할 수 있으며, 단순 포인터 교환으로 가정하면 안 됩니다. PMR allocator는 swap에도 전파되지 않으므로 allocator가 서로 같지 않은 컨테이너를 swap하면 사용 계약을 위반합니다. resource 주소가 다르다는 사실과 `is_equal()` 결과가 false라는 사실도 구분합니다.

근거는 [polymorphic allocator의 copy selection](https://eel.is/c++draft/mem.poly.allocator.mem)과 [allocator-aware container의 전파·swap 조건](https://eel.is/c++draft/container.alloc.reqmts)입니다. 따라서 null upstream 하나를 설정한 것만으로 복사본·중첩 원소·전체 호출 경로의 무할당까지 보장하지 않습니다.

## 함수 매개변수에 pmr

`std::pmr::vector`는 type이 통일되므로 함수 매개변수에 자연스럽게 들어갑니다.

```cpp
// 어떤 pmr vector든 받음
void process(std::pmr::vector<int>& v) {
    v.push_back(1);
}

std::pmr::vector<int> v1(&pool1);
std::pmr::vector<int> v2(&pool2);

process(v1);   // OK
process(v2);   // OK — 같은 함수, 다른 메모리
```

반면 non-pmr 버전은 이렇게 됩니다.

```cpp
template<typename Alloc>
void process(std::vector<int, Alloc>& v) {   // 매 호출마다 인스턴스화
    v.push_back(1);
}
```

`std::vector<int, A1>`과 `std::vector<int, A2>`는 다른 타입이므로, 이 함수와 vector의 멤버 함수가 allocator 타입마다 따로 인스턴스화됩니다.

## 임베디드 패턴 — Frame allocator

매 frame 한 번씩 reset해서 transient 객체에 활용하는 패턴입니다.

```cpp
constexpr size_t kFrameBufferSize = 16 * 1024;
alignas(std::max_align_t) static std::byte frame_buffer[kFrameBufferSize];
static std::pmr::monotonic_buffer_resource frame_pool(
    frame_buffer, kFrameBufferSize, std::pmr::null_memory_resource());

void process_frame() {
    // 매 frame 시작 시 reset
    frame_pool.release();

    std::pmr::vector<Object> objects(&frame_pool);
    std::pmr::string log_buffer(&frame_pool);

    // 처리
    for (auto& obj : input) {
        objects.push_back(process_one(obj));
        log_buffer += format_log(obj);
    }

    // 함수 끝 — 객체들이 소멸하지만 메모리는 reset에서 회수
}
```

release는 이전 frame의 모든 컨테이너·원소가 소멸하고 외부 참조가 없어졌을 때만 호출합니다. upstream 할당, 원소 생성, 버퍼 고갈 경로까지 포함한 WCET는 별도로 검증해야 합니다.

## std::pmr 가용 컨테이너

C++17 pmr 별칭은 각 컨테이너 헤더에서 제공합니다. 예를 들어 vector는 <vector>, string은 <string>이 필요하며 <memory_resource>만으로 모두 선언되는 것은 아닙니다.

```cpp
std::pmr::vector<T>
std::pmr::string
std::pmr::list<T>
std::pmr::map<K, V>
std::pmr::set<T>
std::pmr::unordered_map<K, V>
std::pmr::unordered_set<T>
std::pmr::deque<T>
```

목록 외에 `forward_list`, `multimap`, `multiset`, `unordered_multimap`, `unordered_multiset`, `<regex>`의 `match_results`에도 pmr 별칭이 있습니다. allocator를 받는 표준 컨테이너에는 모두 있고, allocator가 없는 `std::array`에는 없습니다.

## 자주 보는 함정과 안티패턴

### 1. Default resource 사용
```cpp
std::pmr::vector<int> v;   // 현재 default resource; 초기 기본값은 new_delete_resource
```
명시적으로 resource를 지정해 heap을 회피합니다.

### 2. monotonic resource 미release
```cpp
void process() {
    std::pmr::vector<int> v(&pool);
    v.push_back(1);
    // 함수 끝 — v 소멸, 그러나 pool 메모리는 안 비워짐
}
// pool이 계속 차오름
```
명시적으로 reset이나 release를 호출합니다.

### 3. Resource lifetime 부적절
```cpp
std::pmr::vector<int>* make() {
    std::pmr::monotonic_buffer_resource pool(...);   // local
    return new std::pmr::vector<int>(&pool);   // pool 소멸 → dangling
}
```
resource는 vector보다 오래 살아 있어야 합니다.

### 4. Virtual 호출 비용
`std::pmr`은 할당·해제마다 `do_allocate`·`do_deallocate` 가상 호출을 거칩니다. 호출 횟수는 원소 수가 아니라 할당 횟수입니다. 호출을 세는 resource로 재 보면 `std::pmr::vector<int>`에 `push_back` 100번(reserve 없음)은 `do_allocate`를 8번 불렀습니다(libstdc++·libc++ 동일). 원소마다 노드를 할당하는 `pmr::list`·`pmr::map`은 원소 수만큼 부릅니다. 이 글에서는 호출당 cycle을 재지 않았습니다.

### 5. RTTI 의존 비교
do_is_equal은 사용자 구현이 필요한 순수 가상 함수입니다. identity 비교에는 RTTI가 필요하지 않습니다.

### 6. bytes/alignment 인자 무시
```cpp
void do_deallocate(void* p, size_t, size_t) {
    free(p);   // bytes 무시 — pool은 어떻게 알지?
}
```
pool 구현에 따라 bytes가 필요하거나 자체 추적이 필요합니다.

## 실행 확인 — 고갈과 서로 다른 resource 비교

```cpp title="pmr-check.cpp"
#include "identity-resource.hpp"
#include <array>
#include <cassert>
#include <cstddef>
#include <new>
#include <vector>
int main() {
    std::array<std::byte, 256> bytes{};
    std::pmr::monotonic_buffer_resource arena(
        bytes.data(), bytes.size(), std::pmr::null_memory_resource());
    IdentityResource a(arena), b(arena);
    assert(a.is_equal(a) && !a.is_equal(b));
    assert(!a.is_equal(*std::pmr::new_delete_resource()));
    {
        std::pmr::vector<int> values(&a);
        values.reserve(4); values.push_back(42);
        assert(values[0] == 42);
        auto default_copy = values;
        assert(default_copy.get_allocator().resource() ==
               std::pmr::get_default_resource());
        std::pmr::vector<int> explicit_copy(values, &b);
        assert(explicit_copy.get_allocator().resource() == &b);
        assert(default_copy[0] == 42 && explicit_copy[0] == 42);
    }

#ifndef IDENTITY_ONLY
    bool exhausted = false;
    try { (void)a.allocate(4096, alignof(std::max_align_t)); }
    catch (const std::bad_alloc&) { exhausted = true; }
    assert(exhausted);
#endif
    arena.release(); // 모든 컨테이너 소멸 후
    (void)a.allocate(16, alignof(int)); // 고갈 이후 release로 다시 할당 가능
}
```

모든 컨테이너가 소멸한 뒤에만 release합니다. 기본 빌드(`-std=c++17 -Wall -Wextra -Werror -fsanitize=address,undefined`)는 Homebrew Clang 23.1.5와 g++-16 모두 exit 0이었고, `-fno-rtti -DIDENTITY_ONLY` 빌드도 둘 다 exit 0이었습니다.

`IDENTITY_ONLY` 없이 `-fno-rtti`로 고갈 검사까지 돌리면 결과가 갈렸습니다. g++-16(libstdc++)은 `catch (const std::bad_alloc&)`가 예외를 잡아 exit 0이었고, macOS의 Clang 23.1.5(libc++/libc++abi)는 `libc++abi: terminating due to uncaught exception of type std::bad_alloc: std::bad_alloc`으로 exit 134였습니다. 원인은 이 글에서 추적하지 않았습니다. 그래서 두 검사를 분리했습니다. 코드 크기·cycle 차이는 측정하지 않았습니다.

## 정리

- `std::pmr`(C++17)은 polymorphic memory resource로, 런타임에 allocator를 선택합니다.
- `std::pmr::vector<int>`는 type을 통일하면서 다른 resource를 사용할 수 있습니다.
- new/delete·null resource 외에 monotonic과 동기화·비동기화 pool resource도 있습니다.
- Custom resource는 `memory_resource`를 상속하고 virtual 함수 3개를 구현합니다.
- 임베디드 패턴은 static buffer와 monotonic_buffer_resource를 frame 단위로 reset하는 것입니다.
- RTTI 없이 identity 비교를 구현할 수 있으며, 고갈 시 upstream 정책을 명시합니다.

## 근거와 검증 범위

2026-11-16에 `pmr-check.cpp`와 호출 계측을 Homebrew Clang 23.1.5(libc++)와 g++-16(libstdc++)으로 macOS arm64 host에서 실행했습니다. 이 글의 ARM 툴체인에는 libstdc++가 없어 `<memory_resource>`를 Cortex-M용으로 빌드하지 못했고, 보드 실행·WCET은 하지 않았습니다. 다른 이름 없는 코드 블록은 주변에 정의한 장치 API를 가정하는 부분 예제이며 하나의 translation unit으로 합치지 않습니다.

- [memory_resource와 표준 resource 계약](https://eel.is/c++draft/mem.res)

## 관련 항목

- [Part 3-02: Custom Allocator 기초](/blog/embedded/embedded-cpp/part3-02-custom-allocator-basics) — 비-pmr allocator
- [Part 3-03: Pool Allocator](/blog/embedded/embedded-cpp/part3-03-pool-allocator) — pool 자체 구현
- [Part 3-01: 동적 할당 없이](/blog/embedded/embedded-cpp/part3-01-no-dynamic-alloc) — 정적 우선
- [Part 1-08: C++ 표준 선택](/blog/embedded/embedded-cpp/part1-08-cpp-standard-choice) — C++17

## 다음 글

[Part 3-05: No-Exception 설계](/blog/embedded/embedded-cpp/part3-05-no-exception-design) — `-fno-exceptions` 환경에서 에러를 처리하는 패턴을 다룹니다. std::optional, error code, expected가 등장합니다.
