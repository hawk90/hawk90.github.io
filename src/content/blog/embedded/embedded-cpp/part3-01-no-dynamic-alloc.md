---
title: "Part 3-01: 동적 할당 없이 C++ 쓰기"
date: 2026-05-15T01:00:00
description: "임베디드의 첫 번째 원칙 — new/malloc 없이 modern C++의 STL 같은 컨테이너 활용."
series: "Embedded C++ for Real Systems"
seriesOrder: 19
tags: [cpp, embedded, no-heap, static-allocation, std-array, etl]
type: tech
---

## 한 줄 요약

> **"임베디드의 기본은 *정적 할당*."** — `std::vector` 대신 `std::array`, `etl::vector`. *heap 자체를 사용 안 함*.

## 어떤 문제를 푸는가

임베디드에서 *동적 할당*은 *세 가지 위험*입니다.

1. **Heap fragmentation** — 짧고 긴 alloc 반복으로 *큰 블록 못 얻음*
2. **비결정성** — `malloc`의 시간 *예측 불가*. real-time 보장 깨짐
3. **메모리 부족** — *언제 부족할지* 모름. graceful fail 어려움

```cpp
// 위험
std::vector<Order> orders;
for (auto& order : input) {
    orders.push_back(order);   // heap alloc, 크기마다 reallocate
    if (orders.capacity() > 1000) {
        // 시점 불명, 메모리 부족 가능
    }
}
```

대부분 인증 환경(MISRA, AUTOSAR, DO-178C)이 *동적 할당을 금지*하거나 *심하게 제한*. *시스템 초기화 시점*에만 허용.

이 글은 *heap 없이 C++ 쓰는 패턴*입니다.

## 정적 컨테이너 표준 라이브러리

C++ 표준 `<array>`가 *유일한 stack-only 컨테이너*. 나머지는 보통 *heap 사용*.

```cpp
#include <array>

std::array<int, 16> buffer;             // stack, 64 byte
std::array<float, 256> sin_table;       // 1024 byte
std::array<Order, 8> recent_orders;     // sizeof(Order)*8

buffer[0] = 1;
auto size = buffer.size();               // 16, constexpr
auto begin = buffer.begin();             // iterator

// range-for
for (auto& x : buffer) { x = 0; }

// algorithm
std::fill(buffer.begin(), buffer.end(), 0);
std::sort(sin_table.begin(), sin_table.end());
```

`std::array`는 *컴파일 타임 크기*. *런타임 크기 변경 불가* — 그게 *zero-cost의 비결*.

## ETL — heap 없는 STL 대체

[Embedded Template Library](https://www.etlcpp.com/) (ETL)는 *임베디드 친화 STL*. 모든 컨테이너가 *고정 크기*.

```cpp
#include <etl/vector.h>
#include <etl/string.h>
#include <etl/map.h>

etl::vector<int, 16> v;        // 최대 16개
v.push_back(1);
v.push_back(2);
if (v.full()) { /* */ }

etl::string<32> s = "hello";    // 최대 32 char
s += " world";

etl::map<int, Order, 8> orders; // 최대 8 entry
orders.insert({1, Order{}});
```

핵심:
- *컨테이너 크기가 type의 일부*. compile-time 결정.
- `push_back` 등이 *실패할 수 있음* — `full()` 체크.
- *internal storage가 stack 또는 .bss*.
- `<algorithm>`, `<iterator>` 모두 호환.

ETL은 *MIT license*, header-only, 임베디드 표준 라이브러리에 가까움.

## std::pmr (C++17) — polymorphic allocator

표준 컨테이너 + *사용자 정의 allocator*. *heap 없이도* 표준 STL 사용 가능.

```cpp
#include <memory_resource>

// stack buffer 위에 monotonic allocator
std::array<std::byte, 4096> buffer;
std::pmr::monotonic_buffer_resource pool(buffer.data(), buffer.size());

std::pmr::vector<int> v(&pool);
v.reserve(100);
for (int i = 0; i < 100; ++i) v.push_back(i);
// 모든 메모리는 stack buffer에서
```

자세한 내용은 [Part 3-04: std::pmr 활용](/blog/embedded/embedded-cpp/part3-04-pmr).

## Stack vs static vs heap

| 위치 | 수명 | 크기 | 임베디드 적합 |
| --- | --- | --- | --- |
| **Stack** | 함수 scope | 작음 (KB) | 단명 객체 |
| **Static (.bss/.data)** | 프로그램 전체 | 큼 (수십 KB) | 영구 객체 |
| **Heap** | 동적 | 매우 큼 | *회피* |

```cpp
void func() {
    int local_arr[100];                    // stack — 함수 종료시 회수
    static int static_arr[100];            // .bss — 영구
    auto* heap = new int[100];             // heap — 위험!
    delete[] heap;                          // 명시 해제 필요
}
```

임베디드는 *stack과 static 우선*.

## 임베디드 패턴 1 — fixed-size object pool

[Part 3-03: Pool Allocator](/blog/embedded/embedded-cpp/part3-03-pool-allocator) 미리보기.

```cpp
template<typename T, size_t N>
class ObjectPool {
    alignas(T) std::byte storage_[sizeof(T) * N];
    std::bitset<N> in_use_;

public:
    T* allocate() {
        for (size_t i = 0; i < N; ++i) {
            if (!in_use_[i]) {
                in_use_.set(i);
                return reinterpret_cast<T*>(&storage_[sizeof(T) * i]);
            }
        }
        return nullptr;
    }

    void deallocate(T* p) {
        if (!p) return;
        size_t i = (reinterpret_cast<std::byte*>(p) - storage_) / sizeof(T);
        if (i < N) in_use_.reset(i);
    }

    template<typename... Args>
    T* construct(Args&&... args) {
        T* p = allocate();
        if (p) new (p) T(std::forward<Args>(args)...);
        return p;
    }

    void destroy(T* p) {
        if (p) {
            p->~T();
            deallocate(p);
        }
    }
};

ObjectPool<Order, 32> order_pool;

auto* o = order_pool.construct(/* args */);
// 사용
order_pool.destroy(o);
```

*고정 크기 N개*. *heap 없음*. *결정적 시간*.

## 패턴 2 — placement new

이미 할당된 메모리에 *객체 생성*. `new`의 *생성 부분만*.

```cpp
alignas(Order) std::byte buffer[sizeof(Order)];
Order* o = new (buffer) Order(/* args */);   // placement new

o->process();

o->~Order();   // 명시 destructor 호출
```

heap *전혀 안 씀*. *기존 메모리 위에 객체 construct*.

## 패턴 3 — std::optional (C++17)

객체의 *유무*를 *heap 없이* 표현.

```cpp
std::optional<Order> current_order;   // sizeof(Order) + bool, on stack

void start() {
    current_order = Order{/* args */};   // emplace
}

void process() {
    if (current_order) {
        current_order->execute();
    }
}

void end() {
    current_order.reset();
}
```

*pointer/heap 없이* "있을 수도, 없을 수도"를 표현. *모든 메모리 stack 또는 static*.

## 패턴 4 — Static factory

생성 시점에 *한 번만* 할당. 그 후엔 *공유*.

```cpp
class Logger {
public:
    static Logger& instance() {
        static Logger inst;   // C++11 — thread-safe, 최초 호출 시 1번 생성
        return inst;
    }

private:
    Logger() = default;
};

// 사용
Logger::instance().log("hello");
```

*Construct-On-First-Use*. *.bss에 자리만 잡고*, *최초 호출에 생성*.

## std::vector 대신

```cpp
// BAD — 동적
std::vector<Order> orders;
orders.push_back(o);

// GOOD — 정적
etl::vector<Order, 32> orders;
if (!orders.full()) orders.push_back(o);

// GOOD — pmr (메모리 풀에서)
std::pmr::vector<Order> orders(&order_pool);

// GOOD — std::array + 직접 size
std::array<Order, 32> orders;
size_t order_count = 0;
if (order_count < orders.size()) orders[order_count++] = o;
```

## std::string 대신

```cpp
// BAD — 동적
std::string s = "hello";

// GOOD — 고정 크기
etl::string<32> s = "hello";

// GOOD — string_view (참조만)
std::string_view sv = "hello";   // const char* + size_t

// GOOD — std::array<char, N>
std::array<char, 32> s = {'h', 'e', 'l', 'l', 'o', '\0'};
```

`string_view`는 *데이터 소유 안 함*. *기존 문자열 가리킴*. 함수 매개변수에 *최적*.

## std::function 대신

```cpp
// BAD — heap 가능
std::function<void(int)> callback;
callback = [data](int x) { /* */ };   // capture가 크면 heap

// GOOD — etl::delegate (fixed-size)
etl::delegate<void(int)> cb;
cb = etl::delegate<void(int)>::create<&MyClass::method>(my_obj);

// GOOD — 함수 포인터
void (*cb)(int) = my_function;

// GOOD — std::function with capture-less lambda
std::function<void(int)> cb = [](int x) { /* */ };   // capture 없으면 inline storage
```

`etl::delegate`은 *고정 크기 internal storage*. *heap 없음*.

## 자주 보는 함정과 안티패턴

### 1. *std::vector 무심코 사용*
표준 라이브러리의 *대부분 컨테이너가 heap*. *명시적 검사 후* 사용.

### 2. *std::string concatenation*
```cpp
std::string s = "a";
s += "b";   // heap reallocate 가능
```
*고정 크기 buffer* + `snprintf`.

### 3. *static array에 큰 객체*
```cpp
static std::array<HugeStruct, 1000> arr;   // 큰 .bss
```
*.bss 크기 폭증*. RAM 부족.

### 4. *Pool 고갈*
```cpp
auto* o = pool.allocate();
if (!o) { /* ? */ }   // nullptr 처리 누락
```
*항상 null 체크*.

### 5. *Destructor 누락*
```cpp
Order* o = new (buffer) Order;
return;   // ~Order() 호출 안 함 — leak
```
*placement new에는 명시적 destructor*. RAII로 감쌈.

### 6. *Recursive structure에 정적 할당*
```cpp
struct Node {
    std::array<Node, 4> children;   // 무한 재귀 — 컴파일 에러
};
```
*pointer 또는 index 활용*.

## 측정 — heap 사용 추적

malloc 호출 횟수와 크기를 *런타임 추적*.

```cpp
extern "C" {
    static size_t total_alloc = 0;
    static size_t total_free = 0;
    static size_t alloc_count = 0;

    void* __wrap_malloc(size_t n) {
        total_alloc += n;
        alloc_count++;
        return __real_malloc(n);
    }

    void __wrap_free(void* p) {
        // 크기 추적 어려움 — newlib에 기록 필요
        total_free++;
        __real_free(p);
    }
}
```

링커 옵션 `-Wl,--wrap=malloc,--wrap=free`로 *모든 malloc 호출 가로채기*. *예상치 못한 호출 발견*.

## Code size 비교

같은 기능, *동적* vs *정적*.

```cpp
// V1 — std::vector (heap)
std::vector<int> v;
for (int i = 0; i < 100; ++i) v.push_back(i);

// V2 — etl::vector (static)
etl::vector<int, 128> v;
for (int i = 0; i < 100; ++i) v.push_back(i);

// V3 — std::array
std::array<int, 128> v;
for (int i = 0; i < 100; ++i) v[i] = i;
```

STM32F4 (newlib-nano, -Os):

```text
V1 (std::vector): +6.2 KB (heap, vector, growth logic)
V2 (etl::vector): +0.4 KB
V3 (std::array): +0.2 KB
```

*동적 vs 정적의 차이*가 *수 KB*. 임베디드에선 *결정적*.

## 정리

- 임베디드는 정적 할당이 원칙이며 heap은 회피하거나 제한적으로 사용합니다.
- `std::array`가 유일한 표준 stack 컨테이너입니다.
- ETL이 heap 없는 STL 대체이며 모든 컨테이너가 고정 크기입니다.
- `std::pmr`(C++17)로 표준 컨테이너에 custom allocator를 붙여 pool을 활용합니다.
- placement new로 명시적 위치에 객체를 생성합니다.
- `std::function` 대신 `etl::delegate`나 capture-less lambda를 씁니다.

## 관련 항목

- [Part 3-02: Custom Allocator 기초](/blog/embedded/embedded-cpp/part3-02-custom-allocator-basics)
- [Part 3-03: Pool Allocator 구현](/blog/embedded/embedded-cpp/part3-03-pool-allocator)
- [Part 3-04: std::pmr 활용](/blog/embedded/embedded-cpp/part3-04-pmr)
- [Part 4-01: Intrusive Containers](/blog/embedded/embedded-cpp/part4-01-intrusive-containers)
- [Part 4-02: ETL 라이브러리](/blog/embedded/embedded-cpp/part4-02-etl-library)

## 다음 글

[Part 3-02: Custom Allocator 기초](/blog/embedded/embedded-cpp/part3-02-custom-allocator-basics) — *STL allocator interface*를 구현해 *제어된 메모리* 위에서 표준 컨테이너 사용.
