---
title: "항목 9: typedef보다 별칭 선언(using)을 선호하라"
date: 2025-01-05T09:00:00
description: "using 별칭이 typedef보다 나은 4가지 — 가독성, 템플릿화, typename 회피, _t/_v 트레이트."
tags: [C++, Type Alias, Template, Modern C++]
series: "Effective Modern C++"
seriesOrder: 9
draft: true
---

## 왜 이 항목이 중요한가?

`typedef`와 `using` 둘 다 타입 별칭을 만든다. 같은 일을 한다면 굳이 새 문법으로 옮길 필요가 있을까?

답은 명확하다. `using`은 `typedef`가 할 수 있는 모든 일을 더 잘 한다. 특히 **템플릿화**가 가능하다는 점이 결정적이다. 이 차이가 C++14 `<type_traits>`의 `_t` 별칭, C++17의 `_v` 변수 트레이트 같은 표준 패턴의 토대가 되었다.

이 항목은 `using`이 `typedef`보다 나은 네 가지 이유를 정리한다.

## 개요

C++11의 `using` 별칭 선언은 `typedef`와 **동일한 기능**을 제공하면서 추가로 다음 장점이 있다.

- **가독성** 향상.
- **템플릿화** 가능 (alias template).
- **`typename` 키워드** 회피.
- **C++14 type traits `_t`/`_v`** 와 잘 맞는다.

`typedef`를 쓸 이유가 거의 없다.

## 필수 개념: typedef와 using

> **초보자를 위한 배경 지식**

<br>

### typedef — C 시절부터

```cpp
typedef long long int64;
typedef int* IntPtr;
typedef int (*Comparator)(const void*, const void*);
typedef std::map<std::string, std::vector<int>> Inventory;
```

좌변에 본 타입, 우변에 별칭이 온다. **거꾸로**다. 일반 변수 선언과 시각적 패턴이 반대다.

### using — C++11

```cpp
using int64 = long long;
using IntPtr = int*;
using Comparator = int (*)(const void*, const void*);
using Inventory = std::map<std::string, std::vector<int>>;
```

좌변에 별칭, 우변에 본 타입이 온다. **일반 변수 선언과 동일**한 `auto x = ...` 패턴이다.

## 차이 1 — 가독성 (특히 함수 포인터)

함수 포인터 typedef는 매우 헷갈린다.

```cpp
typedef void (*FP)(int, const std::string&);
//      ^^^^      ^                            ← 이름이 어디 있는지 못 찾는다
```

using은 다르다.

```cpp
using FP = void (*)(int, const std::string&);
//    ^^                                       ← 한눈에 명백
```

좌변에 이름, 우변에 타입이라서 **읽기 패턴이 자연스럽다**.

## 차이 2 — 템플릿화 (가장 큰 차이)

`typedef`는 그 자체로 템플릿화될 수 없다. 클래스 안에 감싸야 한다.

### typedef 방식 — `::type` 멤버

```cpp
template<typename T>
struct MyAllocList {
    typedef std::list<T, MyAlloc<T>> type;   // ← 클래스 안에 typedef
};

// 사용
MyAllocList<Widget>::type list;   // ::type 필요
```

### using 방식 — alias template (직접 템플릿화)

```cpp
template<typename T>
using MyAllocList = std::list<T, MyAlloc<T>>;   // ← 직접 템플릿

// 사용
MyAllocList<Widget> list;   // ::type 불필요
```

훨씬 깔끔하다.

## 차이 3 — `typename` 키워드 회피

C++의 미묘한 함정 중 하나가 **의존 타입(dependent type)**이다.

### typedef 기반 — typename 필요

```cpp
template<typename T>
class Widget {
private:
    typename MyAllocList_typedef<T>::type list;
//  ^^^^^^^^                                      ← typename 필수
};
```

`MyAllocList_typedef<T>::type`은 의존 타입이다(T가 결정되어야 알 수 있다). 컴파일러는 기본적으로 **값**으로 가정하므로 "이건 타입"임을 `typename`으로 명시해야 한다 ([Effective C++ 항목 42 참고](/blog/programming/cpp/effective-cpp/item42-understand-the-two-meanings-of-typename)).

### using 기반 — typename 불필요

```cpp
template<typename T>
class Widget {
private:
    MyAllocList_using<T> list;
//  ^^^^^^^^^^^^^^^^^^^^                  ← typename 없이 OK
};
```

`MyAllocList_using<T>`는 alias template이다. alias이지 dependent name이 아니다. `typename`이 불필요하다.

## 차이 4 — C++14 `_t` / `_v` 트레이트와 잘 맞음

C++11 `<type_traits>`는 의존 타입 형태다.

```cpp
typename std::remove_const<T>::type      x;   // T → const 제거
typename std::remove_reference<T>::type  y;
typename std::add_lvalue_reference<T>::type z;
```

매번 `typename` + `::type`이다. verbose하다.

C++14는 **`_t` alias**를 추가했다.

```cpp
std::remove_const_t<T>          x;
std::remove_reference_t<T>      y;
std::add_lvalue_reference_t<T>  z;
```

`_t`는 어떻게 만들었나? **alias template**으로 만들었다.

```cpp
namespace std {
    template<typename T>
    using remove_const_t = typename remove_const<T>::type;
}
```

`using`이 `_t` 패턴의 토대다.

C++17의 `_v` (value 트레이트)도 마찬가지다.

```cpp
template<typename T, typename U>
inline constexpr bool is_same_v = is_same<T, U>::value;

// 사용
static_assert(std::is_same_v<int, int>);   // 더 짧다
```

## 직접 만들 수도 있다

표준에 `_t`가 없는 트레이트도 직접 만들 수 있다.

```cpp
template<typename T>
using my_decay_t = typename my_decay<T>::type;
```

## 더 복잡한 예제 — 의존 alias template

```cpp
template<typename T>
class Widget {
private:
    template<typename U>
    using Container = std::vector<U, MyAlloc<U>>;

    Container<int>  ints;
    Container<T>    items;   // T 의존
};
```

자연스럽고 typename도 없다.

## 호환성

`using`은 C++11+ 기능이다. C++03에선 `typedef`만 가능하다.

```cpp
// C++03 호환 — typedef
typedef std::map<std::string, int> Inventory;

// C++11+ — using 권장
using Inventory = std::map<std::string, int>;
```

C++03을 지원해야 하면 `typedef`를 쓰고, 그 외엔 `using`을 쓴다.

## 함정 — 부분 특수화

`using` alias template은 **부분 특수화가 불가능**하다.

```cpp
// 이건 안 된다
template<typename T>
using Wrapper = std::vector<T>;

template<typename T>
using Wrapper<T*> = std::set<T*>;   // 에러! alias template은 특수화 X
```

부분 특수화가 필요하면 `class` template을 써야 한다.

```cpp
template<typename T>
struct Wrapper { using type = std::vector<T>; };

template<typename T>
struct Wrapper<T*> { using type = std::set<T*>; };

// 사용
Wrapper<int>::type   v;   // std::vector<int>
Wrapper<int*>::type  s;   // std::set<int*>
```

부분 특수화와 alias를 결합한 패턴이다.

## 마이그레이션 가이드

기존 코드의 `typedef`를 모두 `using`으로 바꿔도 될까?

- **단순 typedef**는 안전하다. 같은 의미다.
- **의존 타입의 `typedef`**는 alias template으로 바꾸면 typename을 줄이는 큰 이득이 있다.
- **부분 특수화 의도였던 typedef**는 alias template으로 못 바꾸니 `struct + ::type` 형태를 유지한다.

```cpp
// 안전한 변환
typedef int Int;                    →  using Int = int;
typedef std::vector<int> IntVec;    →  using IntVec = std::vector<int>;
typedef int (*Cmp)(int, int);       →  using Cmp = int (*)(int, int);

// 템플릿화 — alias template
template<typename T>
struct Foo {
    typedef std::vector<T> Vec;     →  using Vec = std::vector<T>;
                                       (그러나 외부에서 Foo<T>::Vec로 접근하면 typename 필요)
};

// 클래스 외부 alias template
template<typename T>
struct FooT { typedef std::vector<T> Vec; };
                                    →
template<typename T>
using FooVec = std::vector<T>;
                                       (Foo<T>::Vec 대신 FooVec<T>)
```

## 핵심 정리

1. `using`은 `typedef`가 하는 모든 일을 더 깔끔하게 한다.
2. **함수 포인터** 등 복잡한 타입에서 가독성 차이가 크다.
3. **alias template** — `typedef`로는 불가능하다.
4. 의존 타입에서 **`typename`을 회피**할 수 있다 (alias template).
5. C++14의 **`_t`/`_v` 트레이트와 자연스러운 짝**이다.
6. C++03 지원이 필요할 때만 `typedef`를 쓴다.

## 관련 항목

- [항목 1: 템플릿 타입 추론](/blog/programming/cpp/effective-modern-cpp/item01-understand-template-type-deduction) — 의존 타입 개념
- [항목 3: decltype의 작동 방식을 이해하라](/blog/programming/cpp/effective-modern-cpp/item03-understand-decltype) — `decltype(auto)`와 트레이트
- [Effective C++ item 42: typename](/blog/programming/cpp/effective-cpp/item42-understand-the-two-meanings-of-typename) — typename의 두 의미
