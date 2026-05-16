---
title: "Ch 2: 언어 환경, Lexical, One Definition Rule"
date: 2025-09-15T03:00:00
description: "Implementation-defined 동작(M0/M1), 어휘 규칙(M2), 식별자, 헤더·ODR — C++의 첫 진입 장벽."
tags: [autosar, cpp, lexical, identifier, odr, header]
series: "AUTOSAR C++14"
seriesOrder: 2
draft: false
---

C++는 *C의 모든 미지정·구현 정의 동작*에 더해 *훨씬 더 큰 표면적*을 가진다. 이 장은 빌드·식별자·헤더 같은 *기초 환경* 규칙을 본다.

## A0 — General Principles

### A0-1-1 — *모든 declaration 사용됨*

```c++
// 위반
void Foo() {
    int x;
    int y = 5;          // 위반 — y가 사용되지 않음
    Bar(x);
}
```

C++17의 `[[maybe_unused]]`로 *의도적 미사용*을 표시(C++14는 GCC attribute).

```c++
[[maybe_unused]] int debug_counter;
```

### A0-1-2 — 분석을 신뢰할 수 없는 코드 회피

*컴파일러·플랫폼 의존* 동작 회피. MISRA Dir 1.1과 같은 메시지.

### A0-1-3 — *모든 함수가 호출됨* 또는 *명시적 미사용 표시*

```c++
// 위반 — 정의됐지만 호출되지 않음
static int InternalHelper(int x) { return x * 2; }
```

리팩토링 후 *dead code* 정리.

### A0-1-4~6 — 매개변수·블록·return 값 사용

CERT의 EXP33/33 등과 같은 메시지.

## A1 — Language

### A1-1-1 — 표준 C++14만 사용

GCC `-std=c++14 -pedantic`. 컴파일러 확장(`__attribute__`, `__has_include`) 회피.

### A1-1-2 — 빌드 시 모든 경고 *해결*

MISRA Dir 2.1과 동일.

```bash
g++ -std=c++14 -pedantic -Wall -Wextra -Werror -Wnon-virtual-dtor \
    -Wcast-align -Woverloaded-virtual -Wconversion -Wsign-conversion \
    -Wmisleading-indentation -Wduplicated-cond -Wduplicated-branches \
    -Wlogical-op -Wnull-dereference -Wdouble-promotion -Wformat=2
```

### A1-1-3 — 일반적으로 코드 분석기로 분석

정적 분석기 사용 강제.

### A1-2-1 — 모든 디버그 traces는 *해제 가능*

```c++
// 회피
std::cout << "[DEBUG] x = " << x << "\n";

// Good — 컴파일 시간 토글
#ifdef DEBUG_BUILD
#  define LOG_DEBUG(msg) std::cerr << msg << "\n"
#else
#  define LOG_DEBUG(msg) ((void)0)
#endif
```

운영 빌드에서 *디버그 출력 자체가 컴파일되지 않음*.

## M2 — Lexical Conventions

### M2-3-1 — *Trigraph 사용 금지*

C++17이 trigraph를 폐지했지만 C++14는 살아 있음.

### M2-5-1 — *Digraph 사용 금지*

```c++
%:include <iostream>     // %: → #
<:        :>             // <: → [, :> → ]
```

*디그래프*는 *해당 키를 가지지 않는 키보드를 위한* 대체 문법. 가독성 저하. 사용 금지.

### M2-7-1 — `/*`로 시작하는 주석에 `/*` 포함 금지

```c++
/* outer /* inner */ */    // 위반 — 중첩 의도지만 표준 X
```

### M2-7-2 — `//` 주석 사용 권장 (C++ 한정)

```c++
// C++ 단일 줄 주석 — OK
/* C-style — 회피 권장 */
```

`//`가 *문서·코드 분리* 더 명확.

### M2-7-3 — 모든 코드는 *주석으로* 비활성화 금지

```c++
// 위반
// int x = 5;
// Foo(x);
```

VCS가 있으면 *코드 제거*. dead comment는 노이즈.

### M2-10-1 — 식별자 *고유* (외부 + 내부 모두)

C++는 namespace, class scope가 있어 *완전 동일 이름*은 드물지만, *같은 namespace 안*에서 고유.

### M2-10-2~6 — *예약 식별자* 회피

`__foo`, `_Foo` 등 표준 예약 이름 회피.

```c++
// 위반
#define __MY_GUARD 1
int _Counter = 0;

// Good
#define MY_GUARD 1
int counter = 0;
```

### M2-13-2~5 — 정수 리터럴 *명시적 접미사*

```c++
auto x = 1000000000;        // 위반? — int? long? 환경 따름
auto x = 1'000'000'000LL;   // Good — 명시 long long
auto y = 0.1;                // 위반 — float? double?
auto y = 0.1F;               // Good — float
```

C++14의 *digit separator* `'`도 함께 활용.

## A3 — Basic Concepts (Headers, ODR)

### A3-1-1 — 헤더 파일에 *외부 객체 선언 금지*

```c++
// foo.hpp — 위반
int g_counter = 0;          // 정의가 헤더에 — multiple definition

// Good — 헤더에는 declaration만
extern int g_counter;
inline int kThreshold = 100;       // C++17 inline variable (C++14는 매크로 등 대체)
```

ODR(One Definition Rule): *모든 외부 객체·함수는 정확히 한 정의*. 헤더에 정의를 두면 *include하는 모든 곳에서 중복 정의*되어 링크 실패.

### A3-1-2 — 헤더 *Include Guard* 또는 `#pragma once`

MISRA Dir 4.10과 같다.

```c++
// foo.hpp
#ifndef PROJECT_FOO_HPP
#define PROJECT_FOO_HPP
/* ... */
#endif // PROJECT_FOO_HPP

// 또는
#pragma once
```

### A3-1-3 — 같은 헤더 *여러 번 include OK* (idempotent)

Include guard로 자동 보장.

### A3-1-4 — *Self-Contained* 헤더

각 헤더는 *단독으로 컴파일 가능*해야.

```c++
// foo.hpp — 위반: vector를 쓰지만 include 안 함
struct Foo {
    std::vector<int> data;
};

// Good
#include <vector>
struct Foo {
    std::vector<int> data;
};
```

테스트: 헤더만 단독으로 `g++ -c foo.hpp`로 컴파일되어야.

### A3-1-5 — 함수 정의는 *.cpp* 또는 *inline*

```c++
// foo.hpp
class Foo {
public:
    void DoWork();           // 선언만
    int GetValue() const { return value_; }   // inline OK — 짧음

private:
    int value_;
};

// foo.cpp
void Foo::DoWork() {
    /* ... */
}
```

긴 함수 정의를 헤더에 두면 *컴파일 시간 증가* 및 ODR 위험.

## A4 — Standard Conversions

### A4-5-1 — 묵시적 변환 *명시*

C의 essential type model과 비슷한 정신.

```c++
// 위반
int x = 5;
double d = x;             // implicit int → double

// Good
double d = static_cast<double>(x);
```

`static_cast`, `const_cast`, `dynamic_cast`, `reinterpret_cast` 중 *의도에 맞는 것* 사용. C-style cast(`(double)x`)는 *어느 종류인지 모름* — 금지.

### A4-5-2 — `enum class` 사용 권장

C++11 *scoped enumeration*은 *암묵 정수 변환 차단*.

```c++
// 회피 — unscoped enum
enum Color { RED, GREEN, BLUE };
int x = RED;              // 묵시 변환 OK — 위험

// Good — enum class
enum class Color { RED, GREEN, BLUE };
int x = Color::RED;       // 컴파일 에러
int x = static_cast<int>(Color::RED);  // 명시 OK
```

### A4-7-1 — *정수 변환*은 표현 가능한 범위 내

CERT INT35와 같은 메시지. signed/unsigned, narrowing 검사.

```c++
// 위반
int x = -1;
unsigned int u = x;       // -1 → 0xFFFFFFFF

// Good
unsigned int u = static_cast<unsigned int>(x);   // 의도 표시
```

### A4-10-1 — `nullptr` 사용 권장

```c++
char *p = NULL;           // 위반 — NULL은 0인데 0은 int (C++14)
char *p = nullptr;        // Good — pointer type
```

C++11의 `nullptr`은 *별도 타입(nullptr_t)*. 함수 오버로딩에서 *정확한 매칭*이 가능.

```c++
void Foo(int x);
void Foo(int *p);

Foo(0);          // Foo(int) — 의도와 다를 수 있음
Foo(nullptr);    // Foo(int *) — 명확
```

## 정리

- 모든 declaration·함수·매개변수가 *사용되어야* (또는 `[[maybe_unused]]`).
- 컴파일러 확장 회피, *경고 0*으로 빌드.
- Trigraph, digraph 금지. C-style 주석보다 `//` 권장.
- 예약 식별자(`__`, `_대문자`) 회피.
- 헤더는 *include guard + self-contained*. 외부 객체 정의 두지 마라.
- `static_cast` 명시. C-style cast 금지.
- `enum class`로 *암묵 정수 변환 차단*.
- `nullptr`이 `NULL` 대체.

## 다음 장 예고

3장은 표현식과 변환. integer promotion, signedness, narrowing, `auto` 추론, lambda capture.

## 관련 항목

- [Ch 1 — AUTOSAR 배경](/blog/embedded/standards/autosar-cpp/chapter01-intro)
- [Ch 3 — Expressions, Conversions](/blog/embedded/standards/autosar-cpp/chapter03-expressions-conversions)
