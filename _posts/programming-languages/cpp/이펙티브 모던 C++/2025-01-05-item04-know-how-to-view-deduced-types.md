---
layout: post
title: "항목 4: 추론된 타입을 확인하는 방법을 알아두라"
date: 2025-01-05
categories: [C++, Effective Modern C++]
tags: [C++, Type Deduction, Debugging]
---

## 개요

`auto`나 템플릿을 쓰다 보면 "도대체 이게 무슨 타입으로 추론됐지?" 싶을 때가 있습니다. 다행히 확인하는 방법이 여러 가지 있어요. IDE부터 런타임까지, 상황에 맞는 방법을 골라 쓰세요.

## 방법 1: IDE의 도움

가장 쉬운 방법입니다. 마우스를 올려보세요!

```cpp
const int theAnswer = 42;
auto x = theAnswer;  // 마우스 호버 → "int"
auto y = &theAnswer; // 마우스 호버 → "const int*"
```

**장점:** 빠르고 편리함
**단점:** 복잡한 타입은 보기 어려울 수 있음

## 방법 2: 컴파일러 에러 메시지 활용

**정의하지 않은 템플릿으로 에러 유발:**

```cpp
template<typename T>  // 선언만!
class TD;

int main() {
    const int theAnswer = 42;
    auto x = theAnswer;
    auto y = &theAnswer;

    TD<decltype(x)> xType;  // 에러: TD<int> 정의 없음
    TD<decltype(y)> yType;  // 에러: TD<const int*> 정의 없음
}
```

컴파일러 에러 메시지:
```
error: incomplete type 'TD<int>' used in nested name specifier
error: incomplete type 'TD<const int*>' used in nested name specifier
```

**장점:** 컴파일 시점에 정확한 타입 확인
**단점:** 프로그램이 컴파일되지 않음

## 방법 3: typeid와 std::type_info::name

런타임에 타입을 확인하는 표준 방법:

```cpp
#include <iostream>
#include <typeinfo>

template<typename T>
void f(const T& param) {
    std::cout << "T = " << typeid(T).name() << '\n';
    std::cout << "param = " << typeid(param).name() << '\n';
}

int main() {
    const int theAnswer = 42;
    f(theAnswer);
}
```

**문제: 컴파일러마다 다른 출력!**

```cpp
// GNU/Clang 출력
T = i         // i = int
param = i

// MSVC 출력
T = int
param = int
```

**더 큰 문제: 정확하지 않음!**

```cpp
template<typename T>
void f(const T& param) {
    std::cout << "T = " << typeid(T).name() << '\n';
    std::cout << "param = " << typeid(param).name() << '\n';
}

const int* px = nullptr;
f(px);

// 출력:
// T = PKi (pointer to const int)
// param = PKi (잘못됨! 실제로는 const PKi&여야 함)
```

`std::type_info::name`은 참조(&)와 const를 무시합니다!

## 방법 4: Boost.TypeIndex 사용

가장 정확한 런타임 방법:

```cpp
#include <boost/type_index.hpp>

template<typename T>
void f(const T& param) {
    using boost::typeindex::type_id_with_cvr;  // cvr = const, volatile, reference

    std::cout << "T = "
              << type_id_with_cvr<T>().pretty_name() << '\n';
    std::cout << "param = "
              << type_id_with_cvr<decltype(param)>().pretty_name() << '\n';
}

const int* px = nullptr;
f(px);

// 정확한 출력:
// T = int const*
// param = int const* const&
```

**장점:** 정확하고 읽기 쉬운 출력
**단점:** Boost 라이브러리 필요

## 방법 5: 직접 만든 타입 출력 함수

컴파일러별 demangle 함수 활용:

```cpp
#include <cxxabi.h>  // GCC/Clang
#include <memory>
#include <iostream>

template<typename T>
std::string type_name() {
    int status;
    std::unique_ptr<char, void(*)(void*)> result{
        abi::__cxa_demangle(typeid(T).name(), 0, 0, &status),
        std::free
    };
    return result.get() ? std::string(result.get()) : "error";
}

// 사용
auto x = 42;
std::cout << type_name<decltype(x)>() << '\n';  // "int"
```

## 실전 예제: 복잡한 타입 추론

```cpp
#include <vector>

// 어떤 타입일까요?
const auto vw = std::vector<int>{1, 2, 3};
auto lambda = [](const auto& x) { return x * 2; };

// 컴파일러 에러로 확인
template<typename T> class TD;

TD<decltype(vw)> vwType;      // const std::vector<int>
TD<decltype(lambda)> lambdaType;  // 람다는 유일한 클로저 타입

// Boost로 확인
using boost::typeindex::type_id_with_cvr;
std::cout << type_id_with_cvr<decltype(vw)>().pretty_name() << '\n';
// 출력: std::vector<int, std::allocator<int> > const
```

## 각 방법의 사용 시기

| 상황 | 추천 방법 |
|------|----------|
| 코드 작성 중 빠른 확인 | IDE 호버 |
| 정확한 타입이 필요할 때 | 컴파일러 에러 메시지 |
| 런타임 디버깅 | Boost.TypeIndex |
| Boost 없이 런타임 확인 | typeid (부정확함 주의) |
| 템플릿 개발 중 | TD 템플릿 트릭 |

## 실용적인 팁

**1. 매크로로 편하게:**
```cpp
#define SHOW_TYPE(x) \
    template<typename T> class TD; \
    TD<decltype(x)> td;

auto x = {1, 2, 3};
SHOW_TYPE(x);  // 에러: TD<std::initializer_list<int>>
```

**2. static_assert로 컴파일 타임 체크:**
```cpp
auto x = 42;
static_assert(std::is_same_v<decltype(x), int>);  // OK
static_assert(std::is_same_v<decltype(x), double>);  // 컴파일 에러
```

**3. 개념(Concepts) 활용 (C++20):**
```cpp
#include <concepts>

auto x = 42;
static_assert(std::integral<decltype(x)>);  // OK
```

## 핵심 정리

1. **IDE가 가장 편함** - 하지만 항상 정확하진 않음
2. **컴파일러 에러가 가장 정확함** - TD 템플릿 트릭 활용
3. **typeid는 조심** - const, volatile, & 무시됨
4. **Boost.TypeIndex 추천** - 런타임에 정확한 타입 확인

**기억하세요:** 타입 추론이 헷갈릴 때는 확인하는 습관을 들이세요. 추측보다는 확인이 낫습니다!