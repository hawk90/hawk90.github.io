---
title: "항목 22: Pimpl 관용구 사용 시 특수 멤버 함수는 구현 파일에 정의하라"
date: 2025-01-07T14:00:00
description: "Pimpl + unique_ptr 조합에서 발생하는 incomplete type 에러와 해결법."
tags: [C++, Pimpl, unique_ptr, Modern C++]
series: "Effective Modern C++"
seriesOrder: 22
draft: true
---

> **초안** — 정리 진행 중

## 개요

**Pimpl**(Pointer to Implementation)은 구현 세부를 헤더에서 숨겨 컴파일 의존성을 줄이는 관용구입니다. C++11 이전엔 raw pointer + 수동 delete였지만, 이제는 `std::unique_ptr`로 깔끔하게 표현 가능 — 단, **특수 멤버 함수의 정의 위치**에 함정이 있습니다.

## 기본 Pimpl 구조

**Widget.h**
```cpp
class Widget {
public:
    Widget();
    ~Widget();
    // ...
private:
    struct Impl;                    // 전방 선언 — 정의는 .cpp에
    std::unique_ptr<Impl> pImpl;
};
```

**Widget.cpp**
```cpp
struct Widget::Impl {
    // 실제 멤버들 (헤더 의존성 다 여기서)
};

Widget::Widget()  : pImpl(std::make_unique<Impl>()) {}
Widget::~Widget() = default;        // 반드시 .cpp에!
```

## 왜 소멸자를 .cpp에?

`unique_ptr<Impl>`는 소멸 시점에 `Impl`의 **완전한 타입 정의**가 필요합니다 (소멸자 호출을 위해).

헤더에 `~Widget() = default`를 두면, 헤더만 보는 사용자 코드에서 소멸자가 인스턴스화될 때 `Impl`이 아직 incomplete type → **컴파일 에러**.

```cpp
// Widget.h — 잘못된 예
class Widget {
    struct Impl;
    std::unique_ptr<Impl> pImpl;
public:
    Widget();
    ~Widget() = default;            // 에러! Impl이 incomplete
};
```

해결: 소멸자 선언만 헤더에, **정의는 .cpp에서 `= default`**.

## move 연산도 마찬가지

`unique_ptr` 자체는 move 가능이지만, move 연산도 **구버전 객체의 소멸을 호출**하므로 같은 문제가 발생.

```cpp
// Widget.h
class Widget {
public:
    Widget(Widget&&) noexcept;             // 선언만
    Widget& operator=(Widget&&) noexcept;
};

// Widget.cpp
Widget::Widget(Widget&&) noexcept = default;
Widget& Widget::operator=(Widget&&) noexcept = default;
```

## copy도 필요하다면?

`unique_ptr`는 복사 불가 → 직접 정의 필요.

```cpp
// Widget.cpp
Widget::Widget(const Widget& rhs)
    : pImpl(std::make_unique<Impl>(*rhs.pImpl)) {}

Widget& Widget::operator=(const Widget& rhs) {
    *pImpl = *rhs.pImpl;
    return *this;
}
```

## `shared_ptr`는?

`shared_ptr<Impl>`이라면 **deleter가 type-erased**라 incomplete type에서도 문제없음. 헤더에 `= default` OK. 다만 공유 소유의 의미 변화에 주의.

## 핵심 정리

1. Pimpl + `unique_ptr<Impl>` 조합에서 특수 멤버 함수 **선언은 헤더, 정의는 .cpp**
2. 이유: `unique_ptr`의 소멸자는 완전한 타입을 요구
3. move와 copy도 동일 — `.cpp`에서 `= default` 또는 직접 구현
4. `shared_ptr<Impl>`은 type-erased deleter라 헤더에 둬도 OK
