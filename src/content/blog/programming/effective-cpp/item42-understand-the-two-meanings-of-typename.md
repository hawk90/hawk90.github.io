---
title: "항목 42: typename의 두 가지 의미를 이해하라"
date: 2025-02-07T11:00:00
description: "템플릿 매개변수 선언과 의존 타입 명시 — 같은 키워드, 두 용도."
tags: [C++, Effective C++, Template, typename]
series: "Effective C++"
seriesOrder: 42
draft: true
---

> **초안** — 정리 진행 중

## 개요

`typename`은 두 가지 다른 의미로 사용됩니다:

1. 템플릿 매개변수 선언 — `class`와 동일
2. **의존 타입(dependent type)** 명시 — 컴파일러에게 "이건 타입이다"라고 알림

## 의미 1 — 템플릿 매개변수

```cpp
template<typename T> void f();    // 동일
template<class    T> void f();    // 동일
```

여기선 `typename`과 `class`가 완전히 동일. 관습적으로 일관성 있게 한쪽만 사용.

## 의미 2 — 의존 타입

템플릿 매개변수에 의존하는 타입(예: `T::iterator`, `T::value_type`)은 컴파일러가 **타입인지 값인지** 컴파일 시점에 알 수 없습니다 — `T`가 결정될 때까지.

기본적으로 컴파일러는 **값**으로 가정. 타입이라면 `typename`으로 알려야 함.

```cpp
template<typename C>
void print2nd(const C& container) {
    if (container.size() >= 2) {
        C::const_iterator iter(container.begin());   // 에러!
                                                      // C::const_iterator가 타입인지 값인지 모호
        ++iter;
        std::cout << *iter;
    }
}
```

해결:

```cpp
typename C::const_iterator iter(container.begin());   // OK — 타입임을 명시
```

## 예외 — `typename` 안 쓰는 자리

다음 자리에선 의존 타입이라도 `typename` 금지:

- **base 클래스 목록**
  ```cpp
  template<typename T>
  class Derived : public Base<T>::Nested {  // typename 금지
      using TypeName = typename Base<T>::Nested;   // 일반 자리에선 필요
  };
  ```

- **멤버 초기화 리스트의 base 식별자**

## C++20 완화

C++20부터는 더 많은 자리에서 `typename` 생략 가능 — 컴파일러가 문맥으로 추론.

## 흔한 패턴

```cpp
template<typename C>
void f(const C& container) {
    typename C::value_type x = *container.begin();
}
```

C++14의 `auto` + `_t` 트레이트 alias로 더 깔끔하게:

```cpp
template<typename C>
void f(const C& container) {
    auto x = *container.begin();   // typename 불필요
    typename std::remove_const<typename C::value_type>::type y;   // C++14: std::remove_const_t<...>
}
```

## 핵심 정리

1. `typename` 의미 1: 템플릿 매개변수 선언 (= `class`)
2. `typename` 의미 2: 의존 타입을 컴파일러에게 알림
3. base 클래스 목록·멤버 초기화 base 자리에선 `typename` 금지
4. C++14의 `_t` alias가 typename 사용을 줄여줌
