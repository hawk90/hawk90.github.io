---
title: "항목 33: 상속된 이름을 가리지 말라"
date: 2025-02-06T11:00:00
description: "derived 클래스가 base의 이름을 가리는 함정과 using 선언으로 해결."
tags: [C++, Effective C++, Inheritance, Name Hiding]
series: "Effective C++"
seriesOrder: 33
draft: true
---

> **초안** — 정리 진행 중

## 개요

derived 클래스에서 base와 같은 이름의 함수를 정의하면 — **시그니처가 달라도** — base의 모든 동명 함수가 가려집니다(name hiding). 표준 오버로딩 룰과 다른 동작.

## 함정

```cpp
class Base {
public:
    virtual void f();
    virtual void f(int);
    virtual void f(double);
};

class Derived : public Base {
public:
    void f();    // base의 f()를 가림
                 // — base의 f(int), f(double)도 모두 숨김!
};

Derived d;
d.f();         // OK
d.f(10);       // 에러! Derived::f()와 시그니처 불일치
d.f(3.14);     // 에러!
```

## 해결 — `using` 선언

```cpp
class Derived : public Base {
public:
    using Base::f;    // base의 모든 f를 가져옴
    void f();         // 그 위에 추가
};

Derived d;
d.f();         // Derived::f()
d.f(10);       // Base::f(int)
d.f(3.14);     // Base::f(double)
```

## 의도적으로 일부만 노출

private 상속에서 일부만 가져오고 싶을 때:

```cpp
class Derived : private Base {
public:
    using Base::f;     // f는 derived의 public이 됨
                       // 다른 base 멤버는 여전히 가려짐
};
```

## C++11+ 생성자도 동일

```cpp
class Base {
public:
    Base(int);
    Base(double);
};

class Derived : public Base {
public:
    using Base::Base;    // 모든 base 생성자 가져옴
};
```

## 핵심 정리

1. derived의 동명 함수는 base의 모든 동명 함수를 가림 (시그니처 무관)
2. `using Base::f;`로 모두 가져오기
3. 일부만 노출하려면 private 상속 + `using`
4. C++11+ 에선 `using Base::Base;`로 생성자도 상속
