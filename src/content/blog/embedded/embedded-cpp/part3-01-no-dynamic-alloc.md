---
title: "동적 할당 없는 임베디드 C++ — placement new·정적 객체·풀"
slug: "embedded/embedded-cpp/part3-01-no-dynamic-alloc"
date: 2026-04-30T09:19:00
description: "임베디드의 첫 번째 원칙 — new/malloc 없이 modern C++의 STL 같은 컨테이너 활용."
series: "Embedded C++ for Real Systems"
seriesOrder: 19
tags: [cpp, embedded, no-heap, static-allocation, std-array, etl]
type: tech
topics: ["embedded"]
---

## 한 줄 요약

> **"임베디드의 기본은 정적 할당입니다."** `std::vector` 대신 `std::array`나 `etl::vector`를 쓰고 heap 자체를 사용하지 않습니다.

## 어떤 문제를 푸는가

임베디드에서 동적 할당은 세 가지 위험을 안고 갑니다.

1. **Heap fragmentation** — 짧고 긴 alloc이 반복되면 큰 블록을 얻지 못합니다.
2. **비결정성** — `malloc`의 시간이 예측 불가합니다. real-time 보장이 깨집니다.
3. **메모리 부족** — 언제 부족해질지 알 수 없고 graceful fail이 어렵습니다.

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

동적 할당 허용 범위는 프로젝트의 코딩 규칙과 안전 요구사항에 따라 정합니다. MISRA·AUTOSAR의 특정 규칙과 DO-178C의 인증 프로세스를 한데 묶어 일괄 금지로 해석하면 안 됩니다. 이 글은 운용 중 heap 할당을 금지하기로 정한 프로젝트를 대상으로 합니다.

이 글은 heap 없이 C++를 쓰는 패턴을 정리합니다.

## 정적 컨테이너 표준 라이브러리

`std::array`는 원소를 객체 내부에 저장하는 고정 길이 컨테이너입니다. 자동·정적·동적 저장 기간은 array 객체를 어디에 생성하는지에 따라 달라집니다. `std::optional`, `std::variant`도 자신의 값을 내부에 저장하며, C++26에는 `std::inplace_vector`도 추가됩니다.

```cpp
#include <array>

std::array<int, 16> buffer{};             // stack, 64 byte
std::array<float, 256> sin_table{};       // 1024 byte
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

`std::array`는 컴파일 타임 크기를 갖고 런타임에 크기를 바꿀 수 없습니다. 이것이 zero-cost의 비결입니다.

## ETL — heap 없는 STL 대체

[Embedded Template Library](https://www.etlcpp.com/) (ETL)는 임베디드 친화 STL입니다. 이 장에서 사용하는 vector·string·map은 고정 용량을 타입에 지정합니다.

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

핵심을 정리하면 이렇습니다.

- 컨테이너 크기가 type의 일부이며 compile-time에 결정됩니다.
- `push_back` 등이 실패할 수 있으므로 `full()`로 체크합니다.
- internal storage가 stack 또는 .bss에 자리잡습니다.
- `<algorithm>`, `<iterator>`와 모두 호환됩니다.

ETL은 MIT license에 header-only이며, 임베디드 표준 라이브러리에 가깝게 쓰입니다.

## std::pmr (C++17) — polymorphic allocator

표준 컨테이너에 사용자 정의 allocator를 붙이면 heap 없이도 표준 STL을 사용할 수 있습니다.

```cpp
#include <memory_resource>

// stack buffer 위에 monotonic allocator
std::array<std::byte, 4096> buffer;
std::pmr::monotonic_buffer_resource pool(
    buffer.data(), buffer.size(), std::pmr::null_memory_resource());

std::pmr::vector<int> v(&pool);
v.reserve(100);
for (int i = 0; i < 100; ++i) v.push_back(i);
// 초기 버퍼가 부족하면 bad_alloc. 원소 자체의 내부 할당은 별도입니다.
```

자세한 내용은 [Part 3-04: std::pmr 활용](/blog/embedded/embedded-cpp/part3-04-pmr).

## Stack vs static vs heap

| 위치 | 수명 | 크기 | 임베디드 적합 |
| --- | --- | --- | --- |
| **Stack** | 함수 scope | 작음 (KB) | 단명 객체 |
| **Static (.bss/.data)** | 프로그램 전체 | 큼 (수십 KB) | 영구 객체 |
| **Heap** | 동적 | 매우 큼 | 회피 |

```cpp
void func() {
    int local_arr[100];                    // stack — 함수 종료시 회수
    static int static_arr[100];            // .bss — 영구
    auto* heap = new int[100];             // heap — 위험!
    delete[] heap;                          // 명시 해제 필요
}
```

임베디드에서는 stack과 static을 우선합니다.

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
        static_assert(std::is_nothrow_constructible_v<T, Args...>);
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

이 검색형 pool의 할당은 최대 N개 슬롯을 살피므로 O(N)입니다. 생성자가 예외를 던지면 슬롯을 반환하는 복구도 필요합니다. 아래 미리보기는 nothrow 생성·소멸 타입과 같은 pool에서 얻은 유효 포인터만 받는다고 가정합니다. O(1) free-list 구현과 완전한 예제는 Part 3-03에서 다룹니다.

## 패턴 2 — placement new

이미 할당된 메모리 위에 객체만 생성합니다. `new`의 생성 부분만 쓰는 셈입니다.

```cpp
alignas(Order) std::byte buffer[sizeof(Order)];
Order* o = new (buffer) Order(/* args */);   // placement new

o->process();

o->~Order();   // 명시 destructor 호출
```

heap을 전혀 쓰지 않고 기존 메모리 위에 객체를 construct합니다.

## 패턴 3 — std::optional (C++17)

객체의 유무를 heap 없이 표현합니다.

```cpp
std::optional<Order> current_order;   // Order + 상태·정렬 패딩, 저장 위치는 선언에 따름

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

optional 자체가 값을 내부에 저장하지만 Order의 내부 할당과 저장 기간은 따로 확인합니다.

## 패턴 4 — Static factory

생성 시점에 한 번만 할당하고 그 뒤로는 공유합니다.

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

Construct-On-First-Use 패턴입니다. .bss에 자리만 잡아두고 최초 호출 시점에 생성합니다.

## std::vector 대신

```cpp
// BAD — 동적
std::vector<Order> orders;
orders.push_back(o);

// GOOD — 정적
etl::vector<Order, 32> orders;
if (!orders.full()) orders.push_back(o);

// GOOD — pmr (memory_resource 구현에서; ObjectPool은 직접 호환되지 않음)
std::pmr::vector<Order> orders(&pool_resource);

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

`string_view`는 데이터를 소유하지 않고 기존 문자열을 가리키기만 합니다. 함수 매개변수에 가장 적합합니다.

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
std::function<void(int)> cb = [](int x) { /* */ };   // 구현의 SBO 조건을 확인해야 함
```

캡처 없는 람다는 함수 포인터로 변환할 수 있습니다. `std::function`에 람다 객체를 직접 넣는 경우에는 구현의 작은 객체 최적화 조건을 확인합니다. 확실히 표준의 비할당 보장을 쓰려면 `std::function<void(int)> cb = +[](int) {};`처럼 함수 포인터를 저장합니다. ETL의 용량 초과·delegate 계약과 버전 검증은 [Part 4-02](/blog/embedded/embedded-cpp/part4-02-etl-library)에서 다룹니다.

## 자주 보는 함정과 안티패턴

### 1. std::vector 무심코 사용
표준 라이브러리의 대부분의 컨테이너는 heap을 사용합니다. 명시적으로 검사한 뒤에 써야 합니다.

### 2. std::string concatenation
```cpp
std::string s = "a";
s += "b";   // heap reallocate 가능
```
고정 크기 buffer와 `snprintf` 조합으로 대체합니다.

### 3. static array에 큰 객체
```cpp
static std::array<HugeStruct, 1000> arr;   // 큰 .bss
```
.bss 크기가 폭증하고 RAM이 부족해집니다.

### 4. Pool 고갈
```cpp
auto* o = pool.allocate();
if (!o) { /* ? */ }   // nullptr 처리 누락
```
항상 null 체크를 합니다.

### 5. Destructor 누락
```cpp
Order* o = new (buffer) Order;
return;   // ~Order() 호출 안 함 — leak
```
placement new에는 명시적으로 destructor를 호출하거나 RAII로 감쌉니다.

### 6. Recursive structure에 정적 할당
```cpp
struct Node {
    std::array<Node, 4> children;   // 무한 재귀 — 컴파일 에러
};
```
pointer나 index를 활용해 풉니다.

## 측정 — heap 사용 추적

malloc 호출 횟수와 크기를 런타임에 추적합니다.

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

위 GNU ld 예제에는 `__real_malloc`·`__real_free` 선언이 추가로 필요합니다. `-Wl,--wrap=malloc,--wrap=free`는 링크 시 미해결 참조를 치환합니다. 이미 라이브러리 내부에서 결합된 호출·다른 allocation API까지 모두 잡는 것은 아니며 Apple ld에서는 같은 옵션을 사용할 수 없습니다.

## 실행 확인 — 고정 저장소와 객체 수명

다음 파일은 C++17에서 고정 저장소 위 생성·소멸과 optional의 재생성을 확인합니다. 원소 타입 자체가 heap을 사용하면 컨테이너의 내부 저장만으로 시스템 전체의 무할당을 보장할 수 없습니다.

```cpp title="fixed-storage.cpp"
#include <array>
#include <cassert>
#include <cstddef>
#include <new>
#include <optional>
struct Reading {
    static inline int live = 0;
    int value;
    explicit Reading(int v) noexcept : value(v) { ++live; }
    ~Reading() noexcept { --live; }
};
int main() {
    alignas(Reading) std::array<std::byte, sizeof(Reading)> bytes{};
    auto* r = new (bytes.data()) Reading(42);
    assert(r->value == 42 && Reading::live == 1);
    r->~Reading();
    assert(Reading::live == 0);
    std::optional<Reading> current;
    current.emplace(7);
    assert(current->value == 7 && Reading::live == 1);
    current.reset();
    assert(!current && Reading::live == 0);
}
```

```bash
clang++ -std=c++17 -Wall -Wextra -Werror fixed-storage.cpp -o fixed-storage
./fixed-storage
```

보드별 코드 크기·실행 시간은 이 예제로 측정하지 않았습니다. 같은 입력과 관찰 가능한 출력으로 각 구현을 빌드한 다음 linker map과 allocation 추적 범위를 함께 남겨야 합니다.

## 정리

- 임베디드는 정적 할당이 원칙이며 heap은 회피하거나 제한적으로 사용합니다.
- `std::array`는 내부 고정 저장소를 제공하며 저장 기간은 객체의 선언 위치로 정합니다.
- ETL의 고정 용량 컨테이너는 용량 초과 정책을 확인하고 사용합니다.
- `std::pmr`(C++17)로 표준 컨테이너에 custom allocator를 붙여 pool을 활용합니다.
- placement new로 명시적 위치에 객체를 생성합니다.
- 콜백의 heap 제한은 함수 포인터·delegate의 계약 또는 실제 표준 라이브러리 구현으로 확인합니다.

## 근거와 검증 범위

2026-10-22에 장별 명명 예제를 Homebrew Clang 23.1.3·libc++의 macOS arm64 host에서 실행했습니다. ASan·UBSan을 적용했으며 보드 실행·WCET·인증 적합성·외부 라이브러리 성공은 이 결과에 포함하지 않습니다. 다른 이름 없는 코드 블록은 주변에 정의한 장치 API를 가정하는 부분 예제이며 하나의 translation unit으로 합치지 않습니다.

- [고정 저장소와 배열 계약](https://eel.is/c++draft/array)
- [std::function의 함수 포인터 생성 계약](https://eel.is/c++draft/func.wrap.func.con)

## 관련 항목

- [Part 3-02: Custom Allocator 기초](/blog/embedded/embedded-cpp/part3-02-custom-allocator-basics)
- [Part 3-03: Pool Allocator 구현](/blog/embedded/embedded-cpp/part3-03-pool-allocator)
- [Part 3-04: std::pmr 활용](/blog/embedded/embedded-cpp/part3-04-pmr)
- [Part 4-01: Intrusive Containers](/blog/embedded/embedded-cpp/part4-01-intrusive-containers)
- [Part 4-02: ETL 라이브러리](/blog/embedded/embedded-cpp/part4-02-etl-library)

## 다음 글

[Part 3-02: Custom Allocator 기초](/blog/embedded/embedded-cpp/part3-02-custom-allocator-basics) — STL allocator interface를 구현해 제어된 메모리 위에서 표준 컨테이너를 사용합니다.
