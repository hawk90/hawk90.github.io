---
title: "Part 3-04: std::pmr 활용"
date: 2026-05-15T04:00:00
description: "C++17 polymorphic allocator — 같은 컨테이너 타입에 다른 메모리 출처 주입."
series: "Embedded C++ for Real Systems"
seriesOrder: 22
tags: [cpp, embedded, pmr, polymorphic-allocator, cpp17, memory-resource]
type: tech
---

## 한 줄 요약

> **"`std::pmr::vector<int>`는 *런타임에 allocator 선택 가능*."** — 전통 `std::vector<int, Alloc>`처럼 *type에 박히지 않음*.

## 어떤 문제를 푸는가

[Part 3-02](/blog/embedded/embedded-cpp/part3-02-custom-allocator-basics) 방식의 custom allocator는 *타입에 박힘*.

```cpp
std::vector<int, PoolAllocator<int, 16>> v1;     // pool 16
std::vector<int, PoolAllocator<int, 32>> v2;     // pool 32 — 다른 타입
// v1과 v2는 *다른 타입* — 호환 안 됨
```

함수 매개변수도 *서로 다른 vector 타입*. 함수마다 *별도 인스턴스화* (코드 bloat).

C++17 **std::pmr** (Polymorphic Memory Resource)이 해결.

```cpp
std::pmr::vector<int> v1(&pool1);     // pool1에서
std::pmr::vector<int> v2(&pool2);     // pool2에서
// v1과 v2는 *같은 타입* — 호환

void process(std::pmr::vector<int>& v) {
    // 어떤 pool 위 vector든 받음
}
```

*런타임 polymorphism*. *컨테이너 타입 동일*. *코드 인스턴스 한 번*.

## 핵심 — memory_resource

`std::pmr::memory_resource`가 *abstract base class*. *virtual interface*.

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

*virtual 함수 3개*. *vptr 1개 (4 byte)*.

`std::pmr::polymorphic_allocator<T>`가 *memory_resource를 wrap*하고 *STL allocator interface 제공*.

## 표준 memory_resource 구현

C++17은 *세 가지 기본 resource*를 제공.

### 1. `new_delete_resource` — heap

```cpp
auto* mr = std::pmr::new_delete_resource();
std::pmr::vector<int> v(mr);   // heap에서
```

기본 `std::pmr::vector<int>`의 default resource. *임베디드에선 회피*.

### 2. `null_memory_resource` — 항상 실패

```cpp
auto* mr = std::pmr::null_memory_resource();
std::pmr::vector<int> v(mr);
v.push_back(1);   // throws std::bad_alloc
```

*"실수 방지용"* — heap 사용 *원하지 않을 때* base로.

### 3. `monotonic_buffer_resource` — bump pointer

미리 준비된 buffer에 *순차 할당*. *해제 불가*.

```cpp
std::array<std::byte, 4096> buffer;
std::pmr::monotonic_buffer_resource mr(buffer.data(), buffer.size());

std::pmr::vector<int> v(&mr);
v.reserve(100);
for (int i = 0; i < 100; ++i) v.push_back(i);
// 모든 메모리는 stack buffer에서
// mr 소멸 또는 release() 호출 시 일괄 reset
```

[Part 3-02의 Arena](/blog/embedded/embedded-cpp/part3-02-custom-allocator-basics)와 같은 idea. *frame allocator*에 적합.

## 임베디드 — Static buffer pool

```cpp
// 전역 static buffer
constexpr size_t kPoolSize = 8192;
alignas(std::max_align_t) std::byte g_pool_buffer[kPoolSize];
std::pmr::monotonic_buffer_resource g_pool(g_pool_buffer, kPoolSize);

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

*매 frame 또는 batch 시작 시 release*. *fragmentation 없음, 빠름*.

## 폴백 chain — unsynchronized_pool_resource

C++17은 *복잡한 pool*도 제공. 단 임베디드에선 *너무 복잡한 경우 많음*.

```cpp
std::pmr::pool_options opts{
    .max_blocks_per_chunk = 16,
    .largest_required_pool_block = 256
};

std::pmr::unsynchronized_pool_resource pool(opts);
std::pmr::vector<int> v(&pool);
```

*보통 직접 구현한 pool이 더 작고 빠름*. 표준 제공은 *데스크톱 기본 환경* 지향.

## Custom memory_resource — 직접 정의

```cpp
class PoolMemoryResource : public std::pmr::memory_resource {
    Pool* pool_;

public:
    explicit PoolMemoryResource(Pool* pool) : pool_(pool) {}

protected:
    void* do_allocate(size_t bytes, size_t alignment) override {
        return pool_->allocate(bytes, alignment);
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

`dynamic_cast` — RTTI 필요. `-fno-rtti`에서는 *다른 방식*으로 비교 (`typeid` 회피).

## RTTI 없는 비교

```cpp
class PoolMemoryResource : public std::pmr::memory_resource {
    Pool* pool_;
    static inline int s_type_id;   // unique tag

public:
    static const void* type_id() { return &s_type_id; }

    explicit PoolMemoryResource(Pool* pool) : pool_(pool) {}

    virtual const void* get_type_id() const { return &s_type_id; }

protected:
    bool do_is_equal(const std::pmr::memory_resource& other) const noexcept override {
        auto* o = static_cast<const PoolMemoryResource*>(&other);
        if (o->get_type_id() != &s_type_id) return false;
        return o->pool_ == pool_;
    }
};
```

`get_type_id()` virtual로 *type 식별*. *RTTI 없이도 type-safe 비교*.

## 함수 매개변수에 pmr

`std::pmr::vector`가 *type 통일*되므로 함수 매개변수에 자연.

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

비-pmr versions는:

```cpp
template<typename Alloc>
void process(std::vector<int, Alloc>& v) {   // 매 호출마다 인스턴스화
    v.push_back(1);
}
```

`std::vector`의 *각 allocator마다 별도 instance*. *코드 bloat*.

## 임베디드 패턴 — Frame allocator

매 frame *한 번 reset*. *transient 객체* 용.

```cpp
constexpr size_t kFrameBufferSize = 16 * 1024;
alignas(std::max_align_t) static std::byte frame_buffer[kFrameBufferSize];
static std::pmr::monotonic_buffer_resource frame_pool(
    frame_buffer, kFrameBufferSize);

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

*매우 빠른 alloc/dealloc*. *deterministic*.

## std::pmr 가용 컨테이너

C++17 `<memory_resource>` + `std::pmr::*`.

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

*대부분 표준 STL 컨테이너*에 pmr 버전 존재.

## 자주 보는 함정과 안티패턴

### 1. *Default resource 사용*
```cpp
std::pmr::vector<int> v;   // default resource = heap
```
*명시적 resource 지정*. heap 회피.

### 2. *monotonic resource 미release*
```cpp
void process() {
    std::pmr::vector<int> v(&pool);
    v.push_back(1);
    // 함수 끝 — v 소멸, 그러나 pool 메모리는 안 비워짐
}
// pool이 계속 차오름
```
*명시적 reset/release*.

### 3. *Resource lifetime 부적절*
```cpp
std::pmr::vector<int>* make() {
    std::pmr::monotonic_buffer_resource pool(...);   // local
    return new std::pmr::vector<int>(&pool);   // pool 소멸 → dangling
}
```
resource는 *vector보다 오래 살아야*.

### 4. *Virtual 호출 비용*
`std::pmr`은 *virtual function 호출* — *간접 호출*. *극히 hot path*에서 측정. 보통 무시.

### 5. *RTTI 의존 비교*
default `do_is_equal`이 `dynamic_cast` 사용. RTTI 끄면 *우회 필요*.

### 6. *bytes/alignment 인자 무시*
```cpp
void do_deallocate(void* p, size_t, size_t) {
    free(p);   // bytes 무시 — pool은 어떻게 알지?
}
```
*pool 구현에 따라* bytes 필요. 또는 *자체 추적*.

## 측정 — pmr vs 직접 allocator

같은 vector 사용, `std::vector<int, MyAlloc>` vs `std::pmr::vector<int>`.

```text
# std::vector<int, MyAlloc> (3 allocator 인스턴스)
.text       : +2.4 KB  (3개 vector specialization)
runtime alloc: 직접 호출, ~10 cycles

# std::pmr::vector<int> (3 resource)
.text       : +0.8 KB  (한 vector specialization)
runtime alloc: virtual 호출, ~15 cycles
```

*pmr이 코드 작고*, *런타임 약간 느림*. 대부분 *작은 차이*. 코드 크기 중요한 임베디드에서 *pmr 유리*.

## 정리

- `std::pmr`(C++17)은 polymorphic memory resource로, 런타임에 allocator를 선택합니다.
- `std::pmr::vector<int>`는 type을 통일하면서 다른 resource를 사용할 수 있습니다.
- 표준 resource는 세 가지입니다 — `new_delete`(heap), `null`(실패), `monotonic`(bump pointer).
- Custom resource는 `memory_resource`를 상속하고 virtual 함수 3개를 구현합니다.
- 임베디드 패턴은 static buffer와 monotonic_buffer_resource를 frame 단위로 reset하는 것입니다.
- RTTI 없는 환경에서는 `do_is_equal`에 직접 type id를 다룹니다.

## 관련 항목

- [Part 3-02: Custom Allocator 기초](/blog/embedded/embedded-cpp/part3-02-custom-allocator-basics) — 비-pmr allocator
- [Part 3-03: Pool Allocator](/blog/embedded/embedded-cpp/part3-03-pool-allocator) — pool 자체 구현
- [Part 3-01: 동적 할당 없이](/blog/embedded/embedded-cpp/part3-01-no-dynamic-alloc) — 정적 우선
- [Part 1-08: C++ 표준 선택](/blog/embedded/embedded-cpp/part1-08-cpp-standard-choice) — C++17

## 다음 글

[Part 3-05: No-Exception 설계](/blog/embedded/embedded-cpp/part3-05-no-exception-design) — `-fno-exceptions` 환경에서 *에러 처리*하는 패턴 — std::optional, error code, expected.
