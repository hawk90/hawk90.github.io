---
title: "항목 45: 모든 호환 타입을 받기 위해 멤버 함수 템플릿을 사용하라"
date: 2025-02-07T14:00:00
description: "스마트 포인터의 변환 생성자 — Derived* → Base*. 일반화된 copy ctor와 컴파일러 자동 생성 함수의 공존."
tags: [C++, Effective C++, Template, Member Function]
series: "Effective C++"
seriesOrder: 45
draft: true
---

## 왜 이 항목이 중요한가?

내장 포인터는 자연스러운 IS-A 변환을 가진다. `Derived*`가 `Base*`에 그대로 들어간다. 그러나 **스마트 포인터를 직접 만들면** 이 변환이 자동으로 따라오지 않는다.

```cpp
template<typename T>
class SmartPtr { /* ... */ };

SmartPtr<Derived> d;
SmartPtr<Base> b = d;   // ❌ 컴파일 에러 — 두 인스턴스는 무관한 타입
```

이유는 `SmartPtr<Derived>`와 `SmartPtr<Base>`가 **완전히 별개의 타입**이기 때문이다. 컴파일러는 둘 사이 변환을 모른다.

해결책은 **멤버 함수 템플릿**(generalized copy constructor)이다. `template<typename U> SmartPtr(const SmartPtr<U>&)` 형태로 호환 타입을 모두 받는다. `std::shared_ptr`, `std::unique_ptr`이 이 패턴을 따른다. 이 항목은 그 메커니즘과 컴파일러 자동 생성 함수와의 공존을 정리한다.

## 개요

내장 포인터는 자연스러운 IS-A 변환을 가진다. `Derived*`가 `Base*`에 들어갈 수 있다. 그러나 **템플릿 인스턴스끼리는 무관한 타입**이다. `SmartPtr<Derived>`와 `SmartPtr<Base>`는 자동 변환이 안 된다. 스마트 포인터, 컨테이너 등에서 이 변환을 제공하려면 **멤버 함수 템플릿**(member function template)이 필요하다.

## 필수 개념: 템플릿 인스턴스는 별개 타입

> **초보자를 위한 배경 지식**

<br>

```cpp
template<typename T>
class Box {
    T value;
};

Box<int>    bi;
Box<double> bd;
// Box<int>와 Box<double>는 완전히 다른 클래스 — 컴파일러 관점
// 비록 같은 템플릿에서 나왔어도
```

C++에서 같은 템플릿의 다른 인스턴스 사이엔 **자동 관계가 없습니다**. 상속·변환 모두 별도로 정의해야 함.

내장 포인터의 경우:

```cpp
class Base {};
class Derived : public Base {};

Derived* pd = new Derived;
Base*    pb = pd;            // ✅ 자동 변환 — IS-A 적용
```

이 변환은 **컴파일러가 제공**하는 내장 동작. 사용자 정의 템플릿에는 자동 적용 안 됨:

```cpp
SmartPtr<Derived> sp = ...;
SmartPtr<Base>    sb = sp;    // ❌ 자동 변환 없음
```

## 해결 — 멤버 함수 템플릿 (변환 생성자)

```cpp
template<typename T>
class SmartPtr {
public:
    explicit SmartPtr(T* p) : ptr(p) {}

    template<typename U>                           // ← 멤버 함수 템플릿
    SmartPtr(const SmartPtr<U>& other)             //    "generalized copy ctor"
        : ptr(other.get()) {}                       //    U* → T* 변환이 가능하면 OK

    T* get() const { return ptr; }
private:
    T* ptr;
};
```

**작동 원리**:
- 사용자가 `SmartPtr<Base> sb(sd);` 호출 시 (sd는 `SmartPtr<Derived>`)
- 컴파일러가 U = Derived로 추론 → `SmartPtr<Base>(const SmartPtr<Derived>&)` 생성
- 본문에서 `other.get()` 결과 (Derived*)를 `ptr` (Base*)에 대입 — IS-A 변환 적용
- 변환이 가능하면 컴파일 OK, 불가능하면 컴파일 에러

```cpp
SmartPtr<Derived> sd(new Derived);
SmartPtr<Base>    sb(sd);     // ✅ generalized ctor 호출
                               //    Derived* → Base* 변환 가능
```

## 타입 안전성 — 자연스러운 제약

```cpp
SmartPtr<Base>    sb(new Base);
SmartPtr<Derived> sd(sb);     // ❌ 컴파일 에러
                               //    Base* → Derived* 자동 변환 안 됨
```

**왜 자동 차단되나**: 본문이 `ptr(other.get())` — `Base*`를 `Derived*`에 대입 시도 → 컴파일러가 거부. **잘못된 변환이 자동으로 컴파일 에러**가 됨. C++ 타입 시스템의 자연스러운 활용.

이게 핵심 패턴 — "**가능한 변환은 자동, 불가능한 변환은 자동 차단**". 별도의 type trait 검사 코드 불필요.

## 일반 복사 생성자 vs 일반화된 복사 생성자

함정: **일반화된 복사 생성자는 컴파일러의 일반 복사 생성자 자동 생성을 막지 않습니다**.

```cpp
template<typename T>
class SmartPtr {
public:
    template<typename U>
    SmartPtr(const SmartPtr<U>& other) : ptr(other.get()) {}     // generalized
    // 일반 SmartPtr(const SmartPtr&) — 컴파일러가 자동 생성!
};

SmartPtr<int> sp;
SmartPtr<int> sp2(sp);      // 일반 복사 ctor 호출 (컴파일러 자동, generalized 안 호출)
```

`SmartPtr<int>`와 `SmartPtr<int>`는 같은 타입 — 일반 복사 생성자가 더 좋은 매치. generalized ctor는 **다른 인스턴스 사이** 변환에만 사용됨.

**문제**: 컴파일러 자동 생성 일반 복사 ctor는 — 단순 멤버 복사. `SmartPtr`의 의미가 깊은 복사라면? 별도 정의 필요.

```cpp
template<typename T>
class SmartPtr {
public:
    SmartPtr(const SmartPtr& other)              // 명시 일반 ctor
        : ptr(deepCopy(other.ptr)) {}

    template<typename U>
    SmartPtr(const SmartPtr<U>& other)            // 일반화된 ctor
        : ptr(deepCopy(other.get())) {}
};
```

표준 라이브러리도 둘 다 정의: 일반 복사 ctor + generalized ctor.

```cpp
// std::shared_ptr 일부 — 정확한 시그니처는 표준 참조
template<typename T>
class shared_ptr {
public:
    shared_ptr(const shared_ptr& other);              // 일반
    
    template<typename Y>
    shared_ptr(const shared_ptr<Y>& other);            // generalized — Y* → T* 가능 시
};
```

## 이동 생성자에도 같은 패턴

C++11+ 이동 의미론에서도 같은 패턴:

```cpp
template<typename T>
class SmartPtr {
public:
    SmartPtr(SmartPtr&& other) noexcept                       // 일반 이동
        : ptr(other.ptr) { other.ptr = nullptr; }

    template<typename U>
    SmartPtr(SmartPtr<U>&& other) noexcept                    // generalized 이동
        : ptr(other.get()) { other.release(); }
};
```

`SmartPtr<Derived>&& → SmartPtr<Base>` 이동도 같은 방식.

## 대입 연산자에도

```cpp
template<typename T>
class SmartPtr {
public:
    SmartPtr& operator=(const SmartPtr& other);               // 일반

    template<typename U>
    SmartPtr& operator=(const SmartPtr<U>& other) {            // generalized
        ptr = other.get();
        return *this;
    }
};
```

## 표준 라이브러리의 예 — `std::unique_ptr`

```cpp
namespace std {
    template<typename T, typename D = default_delete<T>>
    class unique_ptr {
    public:
        unique_ptr(unique_ptr&& other) noexcept;              // 일반 이동

        template<typename U, typename E>
        unique_ptr(unique_ptr<U, E>&& other) noexcept;        // generalized
        // 단, U*가 T*로 변환 가능해야 함 (SFINAE/concepts로 제약)
    };
}

std::unique_ptr<Derived> pd = std::make_unique<Derived>();
std::unique_ptr<Base>    pb = std::move(pd);    // ✅
```

## 제약 — SFINAE 또는 concepts로 명시

종종 generalized ctor를 **올바른 변환에만** 적용하려고 제약 추가:

```cpp
// C++11 SFINAE
template<typename T>
class SmartPtr {
public:
    template<typename U,
             typename = std::enable_if_t<std::is_convertible_v<U*, T*>>>
    SmartPtr(const SmartPtr<U>& other) : ptr(other.get()) {}
};

// C++20 concepts
template<typename T>
class SmartPtr {
public:
    template<typename U>
        requires std::convertible_to<U*, T*>
    SmartPtr(const SmartPtr<U>& other) : ptr(other.get()) {}
};
```

본문이 동작하지 않을 변환은 — 인스턴스화하지 않게 막음. 에러 메시지가 깔끔.

`std::shared_ptr`는 이 제약 패턴을 사용해 `Derived* → Base*` 가능한 경우만 변환 ctor 활성.

## 함정 — 일반 ctor가 generalized보다 우선

```cpp
SmartPtr<int> sp1;
SmartPtr<int> sp2(sp1);    // 일반 ctor (둘 다 SmartPtr<int>)
                            // generalized 안 불림 — 일반이 더 좋은 매치
```

같은 인스턴스라면 일반이 항상 우선. 다른 인스턴스 변환만 generalized 사용.

이 동작은 의도된 것 — 자기 자신 복사는 일반 ctor가 더 효율적.

## 흔한 패턴 — 비-템플릿 friend도 같은 효과

```cpp
template<typename T>
class SmartPtr {
public:
    // get을 friend로 모든 SmartPtr 인스턴스에 노출
    template<typename U> friend class SmartPtr;     // 다른 인스턴스가 ptr에 접근 가능
};
```

generalized ctor가 `other.get()`을 호출하려면 — `other`의 private 멤버 접근권 필요. friend로 해결.

## 모던 변형 — `std::launder`, `std::start_lifetime_as`

C++17+ 일부 메모리 관련 기능에서도 비슷한 패턴 — 한 타입의 객체를 다른 타입 시각으로 보기.

```cpp
T* p = std::launder(other_pointer);     // 타입 변환 + 라이프타임 검증
```

본 항목 범위는 아니지만 관련 영역.

## 흔한 함정 — generalized가 너무 광범위

```cpp
template<typename T>
class Container {
public:
    template<typename U>
    Container(const Container<U>& other);    // 어떤 U든
};

Container<int>    c1;
Container<std::string> c2(c1);   // int → string? — 컴파일러가 시도 → 에러
```

제약 없는 generalized는 모든 U에 대해 인스턴스화 시도 — 의미 없는 에러. SFINAE/concepts로 제약 필수.

## 실무 가이드 — 결정

```
템플릿 클래스에 인스턴스 사이 변환이 필요한가?
├── IS-A 관계의 타입 — generalized ctor + 자연스러운 본문(T* 변환)
├── 다른 호환 타입 — generalized ctor + SFINAE/concepts 제약
└── 변환 의도 없음 — generalized 안 추가
```

## 실무 가이드 — 체크리스트

- [ ] 템플릿 인스턴스 사이 변환이 필요한가?
- [ ] generalized ctor / 대입 연산자 추가했는가?
- [ ] 일반 복사·이동 ctor도 함께 정의 (또는 = default)?
- [ ] SFINAE 또는 concepts로 부적절한 변환 차단?
- [ ] 다른 인스턴스의 private 접근에 friend 선언?

## 핵심 정리

1. **템플릿 인스턴스끼리는 자동 변환 없음** — generalized 멤버 함수 템플릿 필요
2. **일반 ctor**(같은 인스턴스) + **generalized ctor**(다른 인스턴스) — 둘 다 정의
3. 본문이 **T* 변환 시도** — 가능하면 컴파일, 불가능하면 자연스러운 에러
4. **SFINAE/concepts**로 부적절한 변환 명시적 차단
5. 이동·대입에도 같은 패턴 적용
6. 표준 라이브러리 `shared_ptr`, `unique_ptr`이 정석 예

## 관련 항목

- [항목 13: RAII](/blog/programming/cpp/effective-cpp/item13-use-objects-to-manage-resources) — 스마트 포인터의 동기
- [항목 41: 암묵 인터페이스](/blog/programming/cpp/effective-cpp/item41-understand-implicit-interfaces-and-compile-time-polymorphism) — generalized ctor는 컴파일 타임 검증
- [항목 46: 템플릿 안의 비-멤버 함수](/blog/programming/cpp/effective-cpp/item46-define-non-member-functions-inside-templates-when-type-conversions-are-desired) — 비-멤버 변환의 다른 면
