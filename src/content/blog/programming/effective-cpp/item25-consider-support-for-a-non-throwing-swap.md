---
title: "항목 25: 예외를 던지지 않는 swap 지원을 고려하라"
date: 2025-02-04T17:00:00
description: "사용자 정의 swap 구현 패턴 — 표준 swap 특수화와 ADL."
tags: [C++, Effective C++, Exception Safety, swap]
series: "Effective C++"
seriesOrder: 25
draft: true
---

> **초안** — 정리 진행 중

## 개요

`std::swap`의 기본 구현은 세 번의 복사 — 자원 관리 클래스에서는 비효율. 멤버 swap + ADL을 통한 비-멤버 swap 패턴으로 효율적이고 noexcept인 swap을 제공해야 합니다.

## 기본 `std::swap`

```cpp
template<typename T>
void swap(T& a, T& b) {
    T tmp(a);
    a = b;
    b = tmp;
}
```

세 번의 복사 — `string`, `vector`처럼 큰 객체엔 비쌈.

## 패턴 1: 멤버 swap

내부 포인터만 교환 (pimpl idiom과 잘 맞음).

```cpp
class Widget {
    WidgetImpl* pImpl;
public:
    void swap(Widget& other) noexcept {
        std::swap(pImpl, other.pImpl);   // 포인터만 교환 — O(1)
    }
};
```

## 패턴 2: 비-멤버 swap

같은 네임스페이스에 비-멤버 swap을 두면 ADL이 찾아줌.

```cpp
namespace MyNS {
    class Widget { /* ... */ };

    void swap(Widget& a, Widget& b) noexcept {
        a.swap(b);
    }
}
```

## 패턴 3: std::swap 특수화 (선택적)

```cpp
namespace std {
    template<>
    void swap<MyNS::Widget>(MyNS::Widget& a, MyNS::Widget& b) noexcept {
        a.swap(b);
    }
}
```

전체 특수화는 `std`에 추가 가능 (부분 특수화는 금지). 다만 위 패턴 2(ADL)이 더 일반적이고 템플릿 클래스에도 동작.

## 호출자 측 — `using std::swap`

```cpp
template<typename T>
void doSomething(T& a, T& b) {
    using std::swap;   // ADL이 사용자 정의 swap을 찾도록
    swap(a, b);        // 사용자 정의 있으면 그걸, 없으면 std::swap
}
```

`std::swap(a, b)`로 명시하면 ADL이 작동 안 해 사용자 정의 swap을 놓침.

## noexcept

swap은 보통 자원 교환만 하므로 예외 안 던짐. **`noexcept`로 표시**하면 표준 라이브러리(`vector::swap` 등)의 강력한 예외 보증에 활용됨.

## 핵심 정리

1. 큰 객체엔 효율적 swap 제공 — 멤버 swap + 비-멤버 swap (같은 네임스페이스)
2. `noexcept` 표시 — 표준 라이브러리 활용
3. 호출자 측은 `using std::swap` 후 unqualified `swap()` 호출
4. pimpl이라면 swap이 매우 자연스러움 (포인터 교환)
