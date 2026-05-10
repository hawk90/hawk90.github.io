---
title: "항목 45: 모든 호환 타입을 받기 위해 멤버 함수 템플릿을 사용하라"
date: 2025-02-07T14:00:00
description: "smart pointer의 변환 생성자 패턴 — Derived* → Base*."
tags: [C++, Effective C++, Template, Member Function]
series: "Effective C++"
seriesOrder: 45
draft: true
---

> **초안** — 정리 진행 중

## 개요

스마트 포인터 같은 템플릿 클래스가 **암묵 변환**을 제공해야 할 때 (예: `shared_ptr<Derived>` → `shared_ptr<Base>`), 멤버 함수 템플릿이 정답입니다.

## 함정 — 템플릿 인스턴스끼리는 무관

```cpp
template<typename T>
class SmartPtr {
public:
    explicit SmartPtr(T* p) : ptr(p) {}
};

class Derived : public Base {};

SmartPtr<Derived> d(new Derived);
SmartPtr<Base>    b(d);    // 에러! SmartPtr<Derived>와 SmartPtr<Base>는 무관한 타입
```

내장 포인터의 IS-A는 자동으로 적용되지만, 템플릿 인스턴스 사이엔 그런 자동 변환이 없음.

## 해결 — 멤버 함수 템플릿 (generalized copy ctor)

```cpp
template<typename T>
class SmartPtr {
public:
    template<typename U>
    SmartPtr(const SmartPtr<U>& other)
        : ptr(other.get()) {}    // U* → T* 변환이 가능하면 컴파일 통과
                                  // 불가능하면 컴파일 에러 (자연스러운 제약)

    T* get() const { return ptr; }
private:
    T* ptr;
};
```

`U* → T*` 변환이 가능한 모든 `U`에 대해 자동으로 변환 생성자가 만들어짐. `Derived* → Base*`는 가능하므로 `SmartPtr<Derived> → SmartPtr<Base>`도 OK.

## 타입 안전성 — 잘못된 변환 차단

`Base* → Derived*`는 자동 변환 안 되므로 컴파일 에러. 의도된 IS-A만 통과.

```cpp
SmartPtr<Base>    b(...);
SmartPtr<Derived> d(b);    // 에러 — Base* → Derived* 변환 불가
```

## 컴파일러가 자동 생성하는 함수와의 관계

`template<typename U> SmartPtr(const SmartPtr<U>&)`는 **일반 복사 생성자가 아님** — 컴파일러가 별도로 진짜 복사 생성자를 자동 생성. 의도와 다른 동작 막으려면 **둘 다 명시**:

```cpp
template<typename T>
class SmartPtr {
public:
    SmartPtr(const SmartPtr& other)        // 일반 copy
        : ptr(other.ptr) {}

    template<typename U>
    SmartPtr(const SmartPtr<U>& other)     // generalized
        : ptr(other.get()) {}
};
```

표준 `shared_ptr`도 둘 다 가짐.

## 핵심 정리

1. 템플릿 인스턴스 사이의 변환은 자동 X — 멤버 함수 템플릿으로 명시
2. `template<typename U>`로 모든 호환 타입 한 번에
3. 잘못된 변환은 자연스럽게 컴파일 에러
4. 일반 copy ctor와 generalized copy ctor는 별개 — 둘 다 정의 권장
