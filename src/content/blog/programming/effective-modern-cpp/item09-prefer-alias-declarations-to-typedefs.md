---
title: "항목 9: typedef보다 별칭 선언을 선호하라"
date: 2025-01-06T12:00:00
description: "using 별칭 선언이 typedef보다 나은 이유 — 가독성, 템플릿화, type traits 호환성."
tags: [C++, Type Alias, Modern C++]
series: "Effective Modern C++"
seriesOrder: 9
draft: true
---

> **초안** — 정리 진행 중

## 개요

C++11의 `using` 별칭 선언은 `typedef`와 동일한 기능을 제공하면서 **가독성**, **템플릿화**, **type traits**까지 지원합니다. `typedef`를 쓸 이유가 거의 없습니다.

## 가독성

```cpp
typedef void (*FP)(int, const std::string&);
using   FP = void (*)(int, const std::string&);
```

`using`은 좌변에 이름, 우변에 타입 — 일반 변수 선언과 동일한 시각 패턴입니다.

## 템플릿화 (가장 큰 차이)

`typedef`는 그 자체로 템플릿화될 수 없습니다. 클래스 안에 감싸야 합니다.

```cpp
// typedef 방식 — 클래스 안에 ::type 멤버
template<typename T>
struct MyAllocList {
    typedef std::list<T, MyAlloc<T>> type;
};

MyAllocList<Widget>::type list;  // ::type 필요

// using 방식 — 직접 템플릿화
template<typename T>
using MyAllocList = std::list<T, MyAlloc<T>>;

MyAllocList<Widget> list;  // ::type 불필요
```

## 의존 타입 — `typename` 키워드 회피

`typedef` 기반은 의존 타입이라 `typename`이 필요합니다. `using` 기반은 alias이므로 의존 타입이 아닙니다.

```cpp
template<typename T>
class Widget {
    typename MyAllocList_typedef<T>::type list;  // typename 필요
    MyAllocList_using<T>            list;        // 깔끔
};
```

## type traits 호환성

C++14는 표준 type traits에 `_t` alias 버전을 추가했습니다.

```cpp
// C++11
typename std::remove_const<T>::type      x;
typename std::remove_reference<T>::type  y;
typename std::add_lvalue_reference<T>::type z;

// C++14
std::remove_const_t<T>      x;
std::remove_reference_t<T>  y;
std::add_lvalue_reference_t<T> z;
```

`_t` 버전이 없는 옛날 라이브러리도 `using` 한 줄로 만들 수 있습니다.

## 핵심 정리

1. `using`은 `typedef`가 하는 모든 일을 더 깔끔하게 함
2. 템플릿 별칭은 `using`만 가능 — `typedef`는 클래스로 감싸야 함
3. 의존 타입에서 `typename`을 안 써도 되는 경우가 많음
4. C++14의 `_t`/`_v` traits 패턴과 잘 맞음
