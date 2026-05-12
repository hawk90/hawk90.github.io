---
title: "항목 9: typedef보다 별칭 선언(using)을 선호하라"
date: 2025-01-06T12:00:00
description: "using 별칭이 typedef보다 나은 4가지 — 가독성, 템플릿화, typename 회피, _t/_v 트레이트."
tags: [C++, Type Alias, Template, Modern C++]
series: "Effective Modern C++"
seriesOrder: 9
---

## 개요

C++11의 `using` 별칭 선언은 `typedef`와 **동일한 기능**을 제공하면서 추가로:
- **가독성** ↑
- **템플릿화** 가능 (alias template)
- **`typename` 키워드** 회피
- **C++14 type traits `_t`/`_v`** 와 잘 맞음

→ `typedef`를 쓸 이유가 거의 없습니다.

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

좌변에 본 타입, 우변에 별칭. **거꾸로** — 일반 변수 선언과 시각적 패턴이 반대.

### using — C++11

```cpp
using int64 = long long;
using IntPtr = int*;
using Comparator = int (*)(const void*, const void*);
using Inventory = std::map<std::string, std::vector<int>>;
```

좌변에 별칭, 우변에 본 타입. **일반 변수 선언과 동일** — `auto x = ...` 패턴.

## 차이 1 — 가독성 (특히 함수 포인터)

함수 포인터 typedef는 매우 헷갈림:

```cpp
typedef void (*FP)(int, const std::string&);
//      ^^^^      ^                            ← 이름이 어디 있는지 못 찾음
```

using:
```cpp
using FP = void (*)(int, const std::string&);
//    ^^                                       ← 한눈에 명백
```

좌변에 이름, 우변에 타입 — **읽기 패턴이 자연스러움**.

## 차이 2 — 템플릿화 (가장 큰 차이)

`typedef`는 그 자체로 템플릿화될 수 없습니다. 클래스 안에 감싸야 합니다.

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

훨씬 깔끔.

## 차이 3 — `typename` 키워드 회피

C++의 미묘한 함정 중 하나 — **의존 타입(dependent type)**.

### typedef 기반 — typename 필요

```cpp
template<typename T>
class Widget {
private:
    typename MyAllocList_typedef<T>::type list;
//  ^^^^^^^^                                      ← typename 필수
};
```

`MyAllocList_typedef<T>::type`은 의존 타입(T가 결정되어야 알 수 있음). 컴파일러는 기본적으로 **값**으로 가정하므로 "이건 타입"임을 `typename`으로 명시해야 함 ([항목 42 참고](/blog/programming/cpp/effective-cpp/item42-understand-the-two-meanings-of-typename)).

### using 기반 — typename 불필요

```cpp
template<typename T>
class Widget {
private:
    MyAllocList_using<T> list;
//  ^^^^^^^^^^^^^^^^^^^^                  ← typename 없이 OK
};
```

`MyAllocList_using<T>`는 alias template — alias이지 dependent name이 아님. `typename` 불필요.

## 차이 4 — C++14 `_t` / `_v` 트레이트와 잘 맞음

C++11 `<type_traits>`는 의존 타입 형태:

```cpp
typename std::remove_const<T>::type      x;   // T → const 제거
typename std::remove_reference<T>::type  y;
typename std::add_lvalue_reference<T>::type z;
```

매번 `typename` + `::type` — verbose.

C++14는 **`_t` alias** 추가:

```cpp
std::remove_const_t<T>          x;
std::remove_reference_t<T>      y;
std::add_lvalue_reference_t<T>  z;
```

`_t`는 어떻게 만들었나? **alias template**:

```cpp
namespace std {
    template<typename T>
    using remove_const_t = typename remove_const<T>::type;
}
```

→ `using`이 `_t` 패턴의 토대.

C++17의 `_v` (value 트레이트):
```cpp
template<typename T, typename U>
inline constexpr bool is_same_v = is_same<T, U>::value;

// 사용
static_assert(std::is_same_v<int, int>);   // 더 짧음
```

## 직접 만들 수도

표준에 `_t`가 없는 트레이트도 직접:

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

자연스럽고 typename 없음.

## 호환성

`using`은 C++11+ 기능. C++03에선 `typedef`만 가능.

```cpp
// C++03 호환 — typedef
typedef std::map<std::string, int> Inventory;

// C++11+ — using 권장
using Inventory = std::map<std::string, int>;
```

C++03 지원해야 하면 `typedef`. 그 외엔 `using`.

## 함정 — 부분 특수화

`using` alias template은 **부분 특수화 불가**.

```cpp
// 이건 안 됨
template<typename T>
using Wrapper = std::vector<T>;

template<typename T>
using Wrapper<T*> = std::set<T*>;   // 에러! alias template은 특수화 X
```

부분 특수화가 필요하면 `class` template:

```cpp
template<typename T>
struct Wrapper { using type = std::vector<T>; };

template<typename T>
struct Wrapper<T*> { using type = std::set<T*>; };

// 사용
Wrapper<int>::type   v;   // std::vector<int>
Wrapper<int*>::type  s;   // std::set<int*>
```

→ 부분 특수화 + alias 결합 패턴.

## 마이그레이션 가이드

기존 코드의 `typedef`를 모두 `using`으로?

- **단순 typedef**: 안전 — 같은 의미.
- **의존 타입의 `typedef`**: alias template으로 — typename 줄이기 큰 이득.
- **부분 특수화 의도였던 typedef**: alias template 안 되니 `struct + ::type` 유지.

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

1. `using`은 `typedef`가 하는 모든 일을 더 깔끔하게
2. **함수 포인터** 등 복잡한 타입에서 가독성 큰 차이
3. **alias template** — `typedef`로는 불가능
4. 의존 타입에서 **`typename` 회피** (alias template)
5. C++14의 **`_t`/`_v` 트레이트와 자연스러운 짝**
6. C++03 지원 필요 시만 `typedef`

## 관련 항목

- [항목 1: 템플릿 타입 추론](/blog/programming/cpp/effective-modern-cpp/item01-understand-template-type-deduction) — 의존 타입 개념
- [Effective C++ item 42: typename](/blog/programming/cpp/effective-cpp/item42-understand-the-two-meanings-of-typename) — typename의 두 의미
