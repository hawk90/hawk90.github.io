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

`add<int>`와 `add<float>`를 명시적으로 인스턴스화(`template int add<int>(int, int);`)하고 arm-none-eabi-g++ 16.2.0 `-mcpu=cortex-m4 -mthumb -mfloat-abi=hard -mfpu=fpv4-sp-d16 -Os`로 컴파일한 결과입니다.

```text
00000000 <int add<int>(int, int)>:
   0:	add	r0, r1
   2:	bx	lr

00000000 <float add<float>(float, float)>:
   0:	vadd.f32	s0, s0, s1
   4:	bx	lr
```

두 인스턴스는 각자의 섹션(`.text._Z3addIiET_S0_S0_` 등)에 따로 생기고, 같은 소스가 타입에 맞는 명령 하나가 됐습니다. float 쪽이 FPU 명령인 것은 hard-float 옵션 덕분이며, soft-float였다면 `__aeabi_fadd` 호출이 됩니다([Part 0](/blog/embedded/embedded-cpp/00-preface#컴파일러-플래그-가이드)).

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

크기가 타입의 일부가 되어 컴파일 타임에 확정됩니다. 런타임에 크기를 바꿀 수는 없지만, 그래서 용량을 저장할 멤버도, 용량을 읽는 load도 필요 없습니다. `N`은 명령의 즉치값으로 들어갑니다.

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

이 스케치는 STM32F4식 BSRR/IDR 오프셋을 가정합니다. 보드에서는 실행하지 않았습니다. `LedRed::set()`을 명시적으로 인스턴스화해 위와 같은 옵션으로 컴파일한 결과입니다.

```text
00000000 <Gpio<1073872896u, (unsigned char)5>::set()>:
   0:	ldr	r3, [pc, #4]	@ (8 <...+0x8>)
   2:	movs	r2, #32
   4:	str	r2, [r3, #24]
   6:	bx	lr
   8:	.word	0x40020000
```

포트 주소 `0x40020000`을 literal pool에서 읽고, `Port + 0x18`의 `0x18`(24)은 `str`의 오프셋으로, `1u << 5`는 즉치값 32로 접혔습니다. 같은 동작의 C 매크로 `#define LED_RED_SET() (*(volatile uint32_t*)0x40020018u = 1u << 5)`가 만드는 store와 같은 형태입니다.

`LedRed`와 `Button`은 서로 다른 타입입니다. 이 차이는 핀을 타입으로 받는 함수(`template<class Pin> void blink();`)나 핀 타입을 멤버로 갖는 드라이버에서 쓸모가 있습니다. 정적 함수를 직접 부르는 위 코드에서는 타입이 달라도 막을 실수가 없으며, 직접적인 보호는 핀 범위 `static_assert`입니다.

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

`std::format`(C++20)은 type-safe printf 역할을 합니다. [cppreference의 C++20 지원 표](https://en.cppreference.com/w/cpp/compiler_support/20)에 따르면 libstdc++에는 GCC 13부터 들어왔습니다. fmt 라이브러리는 header-only 구성과 컴파일된 라이브러리 구성을 모두 제공합니다. 이 글에서는 두 라이브러리의 코드 크기를 재지 않았습니다.

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

`%d`, `%f` 같은 포맷 매칭 오류가 일어날 수 없습니다. 비교를 위해 C의 `printf("value: %d", 1.5f)`를 컴파일하면 컴파일러는 경고만 냅니다. g++-16은 `warning: format '%d' expects argument of type 'int', but argument 2 has type 'double' [-Wformat=]`(가변 인자에서 float이 double로 승격되므로 double로 표시), Clang 23.1.5는 `warning: format specifies type 'int' but the argument has type 'float' [-Wformat]`였습니다.

특수화가 없는 타입을 넘기면 어떻게 될까요. `uart_print`의 기본 템플릿은 선언만 있으므로 `uart_log(1.5)`는 컴파일은 되고 링크에서 `uart_print<double>(double)` 미정의 심볼로 멈춥니다(아래 함정 1과 같은 메커니즘). 컴파일 단계에서 막으려면 기본 템플릿을 `= delete`로 선언합니다.

이 UART 변환 스케치에는 `<cstdio>`, `<cstring>`와 보드별 `uart_send` 구현이 필요합니다. `%g`는 newlib-nano에서 `-u _printf_float` 없이 링크하면 부동소수점 변환 코드가 빠지고, newlib README는 이 경우를 미정의 동작이 될 수 있다고 적습니다([Part 1-03](/blog/embedded/embedded-cpp/part1-03-runtime-requirements)). 잘린 변환 결과는 전송하지 않도록 `snprintf` 반환값을 검사합니다.

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

`func(1)`을 부르는 `main.cpp`와 정의만 있는 `foo.cpp`를 함께 링크하면 g++-16(macOS ld)은 `Undefined symbols for architecture arm64: "void func<int>(int)"`로 멈춥니다. `foo.cpp`에서는 아무도 `func<int>`를 쓰지 않아 인스턴스가 만들어지지 않았기 때문입니다. 정의를 header로 옮기거나 `foo.cpp`에 `template void func<int>(int);` 같은 explicit instantiation을 둡니다.

### 2. 과도한 인스턴스화로 인한 code bloat
같은 함수를 여러 타입으로 인스턴스화하면 인스턴스마다 코드가 생깁니다. [Part 1-04](/blog/embedded/embedded-cpp/part1-04-code-size-analysis#워크플로-3--템플릿-bloat-추적)의 `process<T>`는 세 인스턴스가 28·28·74바이트였습니다. 공통 부분을 분리하는 방법은 [Part 2-07](/blog/embedded/embedded-cpp/part2-07-templates-cost)에서 다룹니다.

### 3. type-safe하지 않은 인자
```cpp
template<typename T>
void process(T* data, size_t n);

int* arr = ...;
process(arr, 100);   // 100 맞나? 컴파일러 모름
```
대안으로 C++20의 `std::span<T>`를 씁니다.

### 4. template error message 폭증
`std::list<int>`에 `std::sort`를 부르는 한 줄짜리 실수를 컴파일하면, g++-16은 34줄, Clang 23.1.5는 114줄을 출력했습니다. g++-16의 첫 `error:`는 사용자 코드가 아니라 `bits/stl_algo.h:1914`의 `no match for 'operator-' (operand types are 'std::_List_iterator<int>' ...)`를 가리킵니다. 같은 실수를 C++20의 `std::ranges::sort(l)`로 쓰면 출력은 g++-16 기준 51줄로 오히려 길지만(Clang 23.1.5는 22줄), 첫 오류가 사용자 코드 줄을 가리키고 `required for the satisfaction of 'random_access_range<_Range>'`처럼 어느 concept을 못 맞췄는지 적습니다([Part 2-10](/blog/embedded/embedded-cpp/part2-10-concepts)).

### 5. forward declaration만으로는 인스턴스화 불가
```cpp
template<typename T> class Foo;   // 선언만
Foo<int> x;   // ERROR — 인스턴스 불가
```
g++-16은 `error: aggregate 'Foo<int> x' has incomplete type and cannot be defined`, Clang 23.1.5는 `error: implicit instantiation of undefined template 'Foo<int>'`를 냅니다. 정의를 보이게 하거나, 포인터/레퍼런스 형태로만 사용합니다.

### 6. 멤버 함수 override가 template
멤버 함수 템플릿은 virtual일 수 없습니다([temp.mem]/3). `template <class T> virtual void f(T);`에 g++-16은 `error: templates may not be 'virtual'`, Clang 23.1.5는 `error: 'virtual' cannot be specified on member function templates`를 냅니다. 타입마다 vtable 슬롯이 하나씩 필요한데 인스턴스 수를 링크 전에 알 수 없기 때문입니다. type erasure나 visitor로 우회합니다.

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

Homebrew Clang 23.1.5, arm64 macOS에서 `clang++ -std=c++17 -Wall -Wextra -pedantic-errors ring-check.cpp -o ring-check && ./ring-check`가 exit 0으로 empty/full·wraparound·FIFO 순서를 통과했습니다. `-DBAD_CAPACITY`는 `error: static assertion failed due to requirement '(3UL & (3UL - 1)) == 0': N must be power of two and above one`으로 거부됩니다.

[C++20 N4861 템플릿 인스턴스화 규칙](https://timsong-cpp.github.io/cppwp/n4861/temp.inst)을 참고합니다. 템플릿이라는 이유만으로 코드 크기나 실행 속도의 우열이 정해지지는 않습니다.

## 정리

- 템플릿은 컴파일 타임 다형성으로, 타입별 전용 코드를 생성합니다.
- 함수, 클래스, non-type 매개변수를 모두 지원합니다.
- 임베디드에서는 RingBuffer, GPIO 추상화, type-safe print에 활용합니다.
- 이 글의 `add<T>`와 `Gpio::set()`은 Cortex-M4에서 각각 명령 두 개와 store 하나로 내려갔고 가상 dispatch가 없습니다.
- 비용은 컴파일 시간과 인스턴스별 코드 크기에서 발생하며 적절히 관리해야 합니다 ([Part 2-07](/blog/embedded/embedded-cpp/part2-07-templates-cost)).

## 관련 항목

- [Part 2-07: Templates 비용 분석](/blog/embedded/embedded-cpp/part2-07-templates-cost) — code bloat 추적
- [Part 2-08: Static Polymorphism](/blog/embedded/embedded-cpp/part2-08-static-polymorphism) — CRTP
- [Part 2-09: Type Traits 활용](/blog/embedded/embedded-cpp/part2-09-type-traits) — SFINAE
- [Part 2-10: Concepts (C++20)](/blog/embedded/embedded-cpp/part2-10-concepts) — template 제약
- [Part 5-02: GPIO 추상화](/blog/embedded/embedded-cpp/part5-02-gpio-abstraction) — 템플릿 GPIO

## 다음 글

[Part 2-07: Templates 비용 분석](/blog/embedded/embedded-cpp/part2-07-templates-cost) — 같은 함수가 여러 타입에 쓰일 때 발생하는 코드 bloat를 추적하고 통제하는 방법을 다룹니다.
