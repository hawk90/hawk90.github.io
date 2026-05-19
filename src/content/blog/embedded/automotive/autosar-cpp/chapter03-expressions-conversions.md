---
title: "Ch 3: 표현식과 변환 — cast, narrowing, sizeof"
date: 2026-05-18T04:00:00
description: "static_cast 명시(A5-2-2), C-style cast 금지(A5-2-3), narrowing 차단(A5-2-5), 0 나눗셈(A5-6-1)."
tags: [autosar, cpp, cast, narrowing, sizeof, division]
series: "AUTOSAR C++14"
seriesOrder: 3
draft: false
---

C++의 표현식은 C에 *연산자 오버로딩, 참조, lambda*가 추가되어 *복잡도가 비약*한다. 이 장은 변환·캐스트·산술의 안전성을 본다.

## A5 — Expressions

### A5-0-1 — 평가 결과 *값의존* 회피

```c++
// 위반 — i++의 평가 순서 미정
int x = i++ + i++;

// 위반 — 함수 인자 평가 순서 미정 (C++17까지)
foo(g(), h());            // g와 h 중 어느 쪽 먼저?
```

C++17부터는 *함수 호출 시 평가 순서*가 *왼쪽 → 오른쪽*으로 정해졌지만 C++14에서는 미정. AUTOSAR C++14는 *C++17 의미론에 의존하지 마라*.

### A5-1-1~9 — Lambda 사용 정책

```c++
// 회피 — 캡처가 너무 광범위
auto fn = [&](int x) { return data[x] + offset; };

// Good — 명시적 캡처
auto fn = [&data, offset](int x) { return data[x] + offset; };
```

`[=]`, `[&]`은 *모든 것을 캡처* — *우연히 dangling reference* 만들 수 있다. *명시적 캡처 목록* 강제.

```c++
// 위반 — 자동 변수 참조 캡처를 함수 외부로 반환
auto MakeCounter() {
    int count = 0;
    return [&count]() { return ++count; };  // 위반 — count 사라짐
}

// Good — value 캡처
auto MakeCounter() {
    int count = 0;
    return [count]() mutable { return ++count; };
}
```

### A5-1-7 — Lambda는 *parameter 타입 명시*

```c++
// 회피
auto fn = [](auto x) { return x * 2; };    // generic lambda — C++14

// Good — 명시 타입
auto fn = [](int x) { return x * 2; };
```

generic lambda는 *임의 타입에 동작*해 분석 곤란. 안전 critical 코드에서 회피.

### A5-2-2 — *C-style cast 금지*

```c++
// 위반
int x = (int)f;
char *p = (char *)q;

// Good — 명시
int x = static_cast<int>(f);
char *p = static_cast<char *>(q);          // 같은 객체 계층이면
char *p = reinterpret_cast<char *>(q);     // 다른 계층이면
```

C-style cast는 *static, const, reinterpret 중 어느 것*인지 *컴파일러가 시도해 본다*. *의도를 가린다*.

### A5-2-3 — `const_cast` 사용 회피

```c++
// 회피
const int x = 5;
int *p = const_cast<int *>(&x);     // UB if 원본 const
*p = 10;
```

원본이 진짜 `const`면 수정은 UB. const_cast는 *옛 API와 호환을 위한 escape hatch*. 새 코드에서 회피.

### A5-2-4 — `reinterpret_cast` 사용 *최소화*

```c++
// 회피
char buf[100];
auto *p = reinterpret_cast<uint32_t *>(buf);   // 정렬 깨질 수 있음

// Good — memcpy
char buf[100];
uint32_t v;
std::memcpy(&v, buf, sizeof(v));
```

타입 punning은 *memcpy* 또는 *std::bit_cast* (C++20).

### A5-2-5 — *Narrowing conversion 금지*

```c++
int x = 1000;
char c = x;               // 위반 — int → char narrowing

// 명시적 캐스트가 *있어도 위반* (안전성 측면)
char c = static_cast<char>(x);   // 위반? — AUTOSAR는 *별도 정당화* 요구
```

대안: 명시적 범위 검사 + 캐스트.

```c++
if (x < CHAR_MIN || x > CHAR_MAX) return error;
char c = static_cast<char>(x);
```

### A5-2-6 — *Two operand가 같은 essential 타입*

MISRA Rule 10.4와 같은 메시지.

### A5-3-1 — 표현식 결과 *모두 사용*

EXP46(boolean vs bitwise)과 같이 이미 잡힘.

### A5-3-2 — `nullptr` dereference 회피

CERT EXP34와 같다. NULL deref 차단.

### A5-3-3 — `delete this` 금지

```c++
// 위반
void Foo::Destroy() {
    delete this;            // 위반 — 위험한 self-destruct
}
```

`delete this` 후의 *그 함수의 어떤 코드*도 UB. *Reference counting* 또는 *별도 manager* 패턴.

### A5-5-1 — Pointer-to-member의 dereference *valid*

```c++
struct S { void Foo(); };
void (S::*pfn)() = &S::Foo;
S s;
(s.*pfn)();              // OK — pfn이 valid함
```

### A5-6-1 — *정수 0 나눗셈* 회피

```c++
int z = x / y;            // y == 0이면 UB
```

CERT INT33과 같다. 동적 검사 필요.

## A6 — Standard Conversions

### A6-2-1 — *Move assignment* 객체는 *valid but unspecified* 상태

```c++
std::string s1 = "hello";
std::string s2 = std::move(s1);
// s1은 *valid* (소멸자 호출 가능) 이지만 *unspecified* (값을 모름)
s1.size();                // OK — 정의되지만 값 모름
s1[0];                    // 위반 가능 — 비었으면 OOB
```

Move된 객체는 *다시 사용하기 전에 reassign*.

### A6-4-1 — Switch 라벨은 case와 default만 (MISRA R16.2와 같음).

### A6-5-1 — Range-based for 사용 권장

```c++
// 회피
for (size_t i = 0; i < v.size(); i++) {
    DoWork(v[i]);
}

// Good
for (auto &elem : v) {
    DoWork(elem);
}
```

Range-based for는 *iterator 범위 안전 보장*. *off-by-one 차단*.

## A7 — Declarations

### A7-1-1 — *const 정확성*

CERT DCL00과 같다.

### A7-1-2 — `constexpr` 사용 권장

```c++
// 회피 — 런타임 계산
int kBufferSize() { return 256; }

// Good — 컴파일 타임
constexpr int kBufferSize = 256;
constexpr int Compute(int x) { return x * 2; }
```

`constexpr`은 *컴파일 타임 평가*. 런타임 비용 0, 정적 분석에 유리.

### A7-1-3 — CV-qualifier 적용 시 *base 타입에*

```c++
const int *p;             // *p는 const, p 자체는 변경 가능
int *const p = &x;        // p는 const, *p는 변경 가능
const int *const p = &x;  // 둘 다 const

// 권장 — west const vs east const는 프로젝트 정책
int const * const p;      // east const
```

### A7-1-5 — *auto는 type traits로*

```c++
// 회피
auto x = GetValue();      // GetValue 반환 타입은?

// Good — auto가 *추론을 명확하게* 할 때만
auto it = container.begin();   // iterator — 길게 쓰면 가독성 저하
auto p = std::make_unique<Foo>();  // make_* 함수의 반환은 명확
```

`auto`는 *iterator·smart pointer 반환*에서 유용. *값이 무엇인지 모를 때* 회피.

### A7-1-6 — `using` 별칭이 `typedef`보다 권장

```c++
// 회피 — C-style
typedef std::map<std::string, int> StringIntMap;

// Good — C++ alias
using StringIntMap = std::map<std::string, int>;

// 더 좋음 — template alias (typedef 불가)
template <typename T>
using Vec = std::vector<T>;
```

`using`은 *템플릿*에도 적용 가능. `typedef`는 그렇지 못함.

### A7-1-7 — *Forward declaration*은 *최소화*

```c++
// 회피 — 불필요한 forward declaration
class Bar;
class Foo {
    Bar *bar_;             // pointer/reference면 forward OK
};

// 더 명확하면 include
#include "Bar.hpp"
class Foo {
    Bar bar_;              // value 멤버는 include 필요
};
```

## 정리

- C-style cast 금지. `static_cast` 등 *명시 cast*.
- Narrowing 회피, *범위 검사 후 명시 cast*.
- Lambda 캡처는 *명시*. `[=]`, `[&]` 회피.
- `enum class`, `nullptr`, `constexpr`을 적극 활용.
- Range-based for로 off-by-one 차단.
- Move 후 객체는 *다시 사용 전 재할당*.
- `auto`는 *명확한 곳에만*. *값이 무엇인지 모르면 명시*.

## 다음 장 예고

4장은 함수, 람다, noexcept. 함수 정의, default argument, RVO, exception 정책.

## 관련 항목

- [Ch 2 — 언어 환경](/blog/embedded/automotive/autosar-cpp/chapter02-language-build)
- [Ch 4 — Functions, Lambdas](/blog/embedded/automotive/autosar-cpp/chapter04-functions-lambdas)
