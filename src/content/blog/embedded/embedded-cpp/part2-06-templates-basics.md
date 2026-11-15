---
title: "임베디드 Templates 기초 — 타입 안전과 코드 재사용 분석"
slug: "embedded/embedded-cpp/part2-06-templates-basics"
date: 2026-04-29T09:14:00
description: "함수 템플릿과 클래스 템플릿 — 컴파일 타임 다형성으로 type-safe + zero-cost generic 코드."
series: "Embedded C++ for Real Systems"
seriesOrder: 14
tags: [cpp, embedded, templates, generic, type-safe, instantiation]
type: tech
topics: ["embedded"]
---

## 한 줄 요약

> **"Template은 컴파일 타임 다형성."** — 코드 한 번 작성으로 여러 타입에 적용하면서 템플릿 자체의 런타임 dispatch를 요구하지 않습니다.

## 어떤 문제를 푸는가

같은 알고리즘을 여러 타입에 적용하고 싶을 때 세 가지 선택지가 있습니다.

1. **매크로** — 타입 안전이 없고 디버깅이 어렵습니다.
2. **`void*` + 함수 포인터** — 타입 캐스팅과 간접 호출 비용이 듭니다.
3. **C++ 템플릿** — 타입 안전하며 타입별로 코드를 생성하며 일반 함수와 같은 직접 호출·인라인 기회를 제공합니다. 처리하는 알고리즘 자체의 비용은 남습니다.

```c
// 매크로 — 위험
#define MAX(a, b) ((a) > (b) ? (a) : (b))
int x = MAX(1, 2);
float y = MAX(1.5f, 2.5f);
// MAX(i++, j++) — 비교 후 선택된 인자 하나가 다시 증가 (부작용 중복)
```

```c
// void* — 런타임 cost
int (*compare)(const void*, const void*);
void qsort(void* base, size_t n, size_t size, int (*cmp)(const void*, const void*));
// 매 호출이 간접 호출 + 비교 함수 호출 비용
```

```cpp
// 템플릿 — 안전 + 빠름
template<typename T>
T max(T a, T b) {
    return (a > b) ? a : b;
}

int x = max(1, 2);          // T = int
float y = max(1.5f, 2.5f);  // T = float
```

C++ 템플릿은 컴파일러가 타입별 코드를 생성합니다. 각 인스턴스가 전용 함수가 되며 간접 호출은 없습니다.

## 함수 템플릿

가장 단순한 형태입니다.

```cpp
template<typename T>
T add(T a, T b) {
    return a + b;
}

int a = add(1, 2);          // T deduced as int
float b = add(1.5f, 2.5f);  // T deduced as float
double c = add<double>(1.0, 2);   // 명시: T = double, 2가 double로 변환
```

`typename T`는 템플릿 매개변수입니다. 컴파일러가 호출 시 T를 결정하고 해당 타입용 함수 본문을 생성합니다.

### 어셈블리 결과

```text
add<int>:
    add     r0, r0, r1
    bx      lr

add<float>:
    vadd.f32 s0, s0, s1
    bx      lr
```

위 어셈블리는 직접 산술 명령의 형태를 설명하는 예시입니다. 실제 명령과 인라인 여부는 CPU·ABI·최적화 옵션에 따라 확인하며 이 목록은 실측 출력이 아닙니다.

## 클래스 템플릿

가장 흔한 패턴은 컨테이너입니다.

```cpp
template<typename T, size_t N>
class FixedVector {
    static_assert(N > 0, "capacity must be positive");
    T data_[N];
    size_t size_ = 0;

public:
    bool push_back(const T& value) {
        if (size_ >= N) return false;
        data_[size_++] = value;
        return true;
    }

    T& operator[](size_t i) { return data_[i]; }
    size_t size() const { return size_; }
};

FixedVector<int, 16> a;
FixedVector<float, 32> b;
FixedVector<Order, 8> c;
```

각 인스턴스가 별개의 타입이 됩니다. `a.push_back(1)`은 int용 함수, `b.push_back(1.5f)`는 float용 함수입니다.

### Non-type template parameter

`size_t N`은 타입이 아닌 값으로 들어가는 컴파일 타임 상수입니다.

```cpp
FixedVector<int, 16> a;
FixedVector<int, 32> b;
// a와 b는 *다른 타입* — 함께 못 섞음
```

크기가 타입의 일부가 되어 컴파일 타임에 확정됩니다. 런타임에 크기를 바꿀 수는 없지만, 그게 곧 zero-cost의 비결입니다.

## 임베디드 — Ring Buffer 템플릿

```cpp
template<typename T, size_t N>
class RingBuffer {
    static_assert(N > 0 && (N & (N - 1)) == 0,
                  "N must be power of 2");

    T buffer_[N]{};
    size_t head_ = 0;
    size_t tail_ = 0;
    static constexpr size_t kMask = N - 1;

public:
    bool push(const T& value) {
        size_t next = (head_ + 1) & kMask;
        if (next == tail_) return false;   // full
        buffer_[head_] = value;
        head_ = next;
        return true;
    }

    bool pop(T& out) {
        if (tail_ == head_) return false;   // empty
        out = buffer_[tail_];
        tail_ = (tail_ + 1) & kMask;
        return true;
    }

    size_t size() const {
        return (head_ - tail_) & kMask;
    }
};

// 사용
RingBuffer<uint8_t, 256> uart_rx;
RingBuffer<LogEntry, 64> log_queue;
```

`(head_ + 1) & kMask`로 modulo 없이 circular index를 계산합니다. N이 2의 거듭제곱이어야 하므로 `static_assert`로 강제합니다. 빈 칸 하나로 full과 empty를 구분하므로 실제 용량은 N-1입니다. 이 구현은 단일 실행 문맥용이며 ISR/태스크 간 동시 접근은 별도의 동기화와 메모리 순서가 필요합니다.

각 인스턴스(uart_rx, log_queue)는 별도 클래스가 됩니다. 멤버 함수 호출은 direct call이며 가상 함수가 없습니다.

## 임베디드 — GPIO 추상화

```cpp
template<uintptr_t Port, uint8_t Pin>
class Gpio {
    static_assert(Pin < 16, "STM32-style GPIO pin must be below 16");
public:
    static void set() {
        *reinterpret_cast<volatile uint32_t*>(Port + 0x18) = 1u << Pin;
    }
    static void clear() {
        *reinterpret_cast<volatile uint32_t*>(Port + 0x18) = 1u << (Pin + 16);
    }
    static bool read() {
        return (*reinterpret_cast<volatile uint32_t*>(Port + 0x10) >> Pin) & 1;
    }
};

using LedRed   = Gpio<0x40020000, 5>;
using LedGreen = Gpio<0x40020000, 6>;
using Button   = Gpio<0x40020400, 13>;

LedRed::set();
LedGreen::set();
if (Button::read()) { /* */ }
```

이 스케치는 STM32F4식 BSRR/IDR 오프셋을 가정합니다. 실제 MCU의 레지스터 폭·주소와 clock·pin 설정을 확인해야 하며, 포인터 타입만으로 하드웨어 접근의 유효성을 보장하지 않습니다. 아래 어셈블리는 명령 형태 설명용이며 이 글에서 보드 빌드로 측정한 출력이 아닙니다.

```text
LedRed::set:
    ldr     r3, =0x40020018
    movs    r2, #32      ; 1 << 5
    str     r2, [r3]
    bx      lr
```

C 매크로 `#define LED_RED_SET()`의 결과와 동일하지만 타입 안전성이 더해집니다.

`LedRed`와 `Button`은 서로 다른 타입이므로 섞어 쓸 수 없습니다. C 매크로였다면 무심코 섞일 수 있었을 자리입니다.

## 템플릿 specialization

특정 타입에 다른 구현을 제공하는 방식입니다.

```cpp
template<typename T>
struct Serializer {
    static size_t serialize(T value, uint8_t* buf) {
        static_assert(std::is_trivially_copyable_v<T>, "object representation copy only");
        // 기본 — host object representation, portable wire format 아님
        std::memcpy(buf, &value, sizeof(T));
        return sizeof(T);
    }
};

// uint16_t — big-endian 직접
template<>
struct Serializer<uint16_t> {
    static size_t serialize(uint16_t value, uint8_t* buf) {
        buf[0] = (value >> 8) & 0xFF;
        buf[1] = value & 0xFF;
        return 2;
    }
};

// uint32_t — big-endian
template<>
struct Serializer<uint32_t> {
    static size_t serialize(uint32_t value, uint8_t* buf) {
        buf[0] = (value >> 24) & 0xFF;
        buf[1] = (value >> 16) & 0xFF;
        buf[2] = (value >> 8) & 0xFF;
        buf[3] = value & 0xFF;
        return 4;
    }
};
```

호출자는 동일한 syntax를 쓰고, 컴파일러가 타입별 specialization을 선택합니다. `<type_traits>`, `<cstring>`, `<cstdint>`, `<cstddef>`가 필요합니다. 기본 memcpy는 padding·endianness·float 표현을 보존하므로 장치 간 wire format은 필드별로 정의합니다.

```cpp
Serializer<uint16_t>::serialize(0x1234, buf);   // big-endian 직접
Serializer<float>::serialize(1.5f, buf);        // 기본 memcpy
```

## 템플릿과 `auto` (C++14+)

C++14부터 템플릿 함수의 반환 타입을 `auto`로 둘 수 있습니다.

```cpp
template<typename T, typename U>
auto add(T a, U b) {
    return a + b;
}

auto x = add(1, 2.5);   // double
```

C++14부터 generic lambda의 `auto` 매개변수가 가능합니다.

```cpp
auto add = [](auto a, auto b) { return a + b; };
auto x = add(1, 2.5);
```

C++20부터는 함수 자체에도 `auto` 매개변수를 쓸 수 있습니다(abbreviated function template).

```cpp
auto add(auto a, auto b) { return a + b; }
// 동등: template<typename T, typename U> auto add(T a, U b) { return a + b; }
```

## Variadic templates — 가변 인자

C의 `printf`는 타입 안전성이 없고 `va_list` 사용이 위험합니다.

```c
printf("value: %d", 1.5f);   // %d인데 float — undefined behavior
```

C++의 variadic template은 타입 안전한 가변 인자를 제공합니다.

```cpp
#include <iostream>
template<typename T> void print_one(const T& value) { std::cout << value; }
template<typename... Args>
void print_each(const Args&... args) { (print_one(args), ...); }
template<typename... Args>
void log(const char* prefix, const Args&... args) {
    print_one(prefix);
    print_each(args...);
}
// log("hello ", 1, 2.5f, "world");
```

정의 순서를 지켜 이름 조회가 가능하게 했습니다. 이 예제의 prefix는 printf 포맷 문자열로 해석하지 않습니다.

`std::format`(C++20)은 표준 라이브러리 구현이 제공할 때 type-safe printf 역할을 합니다. 예를 들어 GCC libstdc++에서는 GCC 13 계열부터 지원이 추가됐지만, 임베디드 toolchain에서는 버전과 라이브러리 조합을 따로 확인해야 합니다. fmt는 header-only 구성과 컴파일된 라이브러리 구성을 모두 제공하며, 어느 구성이 더 작은지는 실제 링크 결과를 비교합니다.

## 임베디드 — Type-safe Print

```cpp
template<typename T>
void uart_print(T value);

// specialization
template<> void uart_print<int>(int v) {
    char buf[12];
    int len = snprintf(buf, sizeof(buf), "%d", v);
    if (len < 0 || static_cast<size_t>(len) >= sizeof(buf)) return;
    uart_send(buf, len);
}

template<> void uart_print<float>(float v) {
    char buf[16];
    int len = snprintf(buf, sizeof(buf), "%g", static_cast<double>(v));
    if (len < 0 || static_cast<size_t>(len) >= sizeof(buf)) return;
    uart_send(buf, len);
}

template<> void uart_print<const char*>(const char* s) {
    uart_send(s, strlen(s));
}

// fold expression으로 여러 인자
template<typename... Args>
void uart_log(Args&&... args) {
    (uart_print(args), ...);   // C++17 fold expression
}

uart_log("counter: ", 42, " freq: ", 168.0f, " MHz\n");
```

`%d`, `%f` 같은 포맷 매칭 오류가 일어날 수 없습니다. 타입이 맞아야만 컴파일됩니다.

이 UART 변환 스케치에는 `<cstdio>`, `<cstring>`와 보드별 `uart_send` 구현이 필요합니다. 부동소수점 printf 지원과 코드 크기는 C 라이브러리 설정에 따라 다르며, 잘린 변환 결과는 전송하지 않습니다.

## 자주 보는 함정과 안티패턴

### 1. 템플릿이 header에 없음
템플릿 정의는 header에 있어야 인스턴스화가 가능합니다. `.cpp`에만 있으면 link error가 발생합니다.

```cpp
// foo.h
template<typename T>
void func(T x);   // 선언만

// foo.cpp
template<typename T>
void func(T x) { /* */ }   // 정의 — 다른 TU에서 인스턴스 불가
```

정의를 header로 옮기거나 explicit instantiation을 사용합니다.

### 2. 과도한 인스턴스화로 인한 code bloat
같은 함수를 수많은 타입으로 인스턴스화하면 각자의 코드가 쌓여 크기가 폭증합니다. 공통 부분을 분리해 해결합니다([Part 2-07](/blog/embedded/embedded-cpp/part2-07-templates-cost)).

### 3. type-safe하지 않은 인자
```cpp
template<typename T>
void process(T* data, size_t n);

int* arr = ...;
process(arr, 100);   // 100 맞나? 컴파일러 모름
```
대안으로 C++20의 `std::span<T>`를 씁니다.

### 4. template error message 폭증
중첩 template 오류는 수십 줄짜리 메시지가 됩니다. C++20 concepts로 훨씬 깔끔해집니다.

### 5. forward declaration만으로는 인스턴스화 불가
```cpp
template<typename T> class Foo;   // 선언만
Foo<int> x;   // ERROR — 인스턴스 불가
```
정의가 필요하거나, 포인터/레퍼런스 형태로만 사용해야 합니다.

### 6. 멤버 함수 override가 template
virtual 함수는 template이 될 수 없습니다. type erasure나 visitor로 우회합니다.

## 작은 예제 — ring buffer의 실제 용량

```cpp title="ring-check.cpp"
#include <array>
#include <cassert>
#include <cstddef>
template<class T, std::size_t N> struct Ring {
    static_assert(N > 1 && (N & (N-1)) == 0, "N must be power of two and above one");
    std::array<T,N> a{};
    std::size_t head=0, tail=0;
    bool push(T v) {
        auto next=(head+1)&(N-1);
        if (next==tail) return false;
        a[head]=v; head=next; return true;
    }
    bool pop(T& v) {
        if (head==tail) return false;
        v=a[tail]; tail=(tail+1)&(N-1); return true;
    }
};
#ifdef BAD_CAPACITY
Ring<int,3> invalid;
#endif
int main() {
    Ring<int,4> q; int v=0;
    assert(!q.pop(v));
    assert(q.push(1) && q.push(2) && q.push(3));
    assert(!q.push(4));
    assert(q.pop(v) && v==1);
    assert(q.push(4));
    for (int expected=2; expected<=4; ++expected)
        assert(q.pop(v) && v==expected);
    assert(!q.pop(v));
}
```

Clang 23.1.3 arm64 macOS에서 `clang++ -std=c++17 -Wall -Wextra -pedantic-errors ring-check.cpp -o ring-check && ./ring-check`로 empty/full·wraparound·FIFO 순서를 확인했습니다. `-DBAD_CAPACITY`는 컴파일 실패해야 합니다. 실측 소스와 도구가 없던 인스턴스별 바이트 수와 전체 프로젝트 비율은 근거로 사용하지 않습니다.

[C++20 N4861 템플릿 인스턴스화 규칙](https://timsong-cpp.github.io/cppwp/n4861/temp.inst)을 참고합니다. 템플릿이라는 이유만으로 코드 크기나 실행 속도의 우열이 정해지지는 않습니다.

## 정리

- 템플릿은 컴파일 타임 다형성으로, 타입별 전용 코드를 생성합니다.
- 함수, 클래스, non-type 매개변수를 모두 지원합니다.
- 임베디드에서는 RingBuffer, GPIO 추상화, type-safe print에 활용합니다.
- 이 예제는 가상 dispatch를 쓰지 않으며 연산 비용과 코드 크기는 생성된 코드로 확인합니다.
- 비용은 컴파일 시간과 인스턴스별 코드 크기에서 발생하며 적절히 관리해야 합니다 ([Part 2-07](/blog/embedded/embedded-cpp/part2-07-templates-cost)).

## 관련 항목

- [Part 2-07: Templates 비용 분석](/blog/embedded/embedded-cpp/part2-07-templates-cost) — code bloat 추적
- [Part 2-08: Static Polymorphism](/blog/embedded/embedded-cpp/part2-08-static-polymorphism) — CRTP
- [Part 2-09: Type Traits 활용](/blog/embedded/embedded-cpp/part2-09-type-traits) — SFINAE
- [Part 2-10: Concepts (C++20)](/blog/embedded/embedded-cpp/part2-10-concepts) — template 제약
- [Part 5-02: GPIO 추상화](/blog/embedded/embedded-cpp/part5-02-gpio-abstraction) — 템플릿 GPIO

## 다음 글

[Part 2-07: Templates 비용 분석](/blog/embedded/embedded-cpp/part2-07-templates-cost) — 같은 함수가 여러 타입에 쓰일 때 발생하는 코드 bloat를 추적하고 통제하는 방법을 다룹니다.
