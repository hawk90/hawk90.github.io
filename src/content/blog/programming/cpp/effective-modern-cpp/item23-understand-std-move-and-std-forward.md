---
title: "항목 23: std::move와 std::forward를 이해하라"
date: 2026-05-04T23:00:00
description: "둘 다 캐스팅 함수 — 아무것도 이동·전달하지 않음. const + std::move의 함정."
tags: [C++, std::move, std::forward, Move Semantics, Modern C++]
series: "Effective Modern C++"
seriesOrder: 23
draft: true
---

## 왜 이 항목이 중요한가?

`std::move`와 `std::forward`라는 이름은 오해를 부른다. "move는 이동을 시켜 주고 forward는 전달을 해 주는 함수" 같지만, 사실 둘 다 **컴파일 타임 캐스팅**일 뿐이다. 런타임 코드를 거의 생성하지 않는다.

이 사실을 정확히 짚지 못하면 두 가지 함정이 따라온다.

- **`const` 객체에 `std::move`** — 캐스팅은 되지만 const 때문에 move 생성자가 아닌 copy 생성자가 호출된다. 조용히 copy가 일어난다.
- **보편 참조에 `std::move`** — lvalue로 들어온 인자도 강제로 rvalue로 캐스팅되어 원본을 파괴한다. `std::forward`를 써야 한다.

이 항목은 두 함수의 정확한 의미와, 자주 빠지는 함정들을 정리한다.

## 개요

`std::move`와 `std::forward`는 이름이 오해를 낳지만 둘 다 **컴파일 타임 캐스팅 함수**일 뿐이다. 런타임 코드를 거의 생성하지 않는다. 정확히 무엇을 하는지 이해하는 게 move semantics의 토대다.

## 필수 개념: 캐스팅의 본질

> **초보자를 위한 배경 지식**

<br>

### `std::move`는 무조건 rvalue 캐스팅

```cpp
// 개념적 구현
template<typename T>
typename std::remove_reference<T>::type&&
move(T&& param) {
    using ReturnType = typename std::remove_reference<T>::type&&;
    return static_cast<ReturnType>(param);
}
```

핵심은 두 단계다.

1. 입력의 참조를 제거한다.
2. `&&`를 붙여 rvalue 참조로 캐스팅한다.

**이것뿐**이다. 이동을 발생시키지 않고, 단지 컴파일러에게 "이 객체는 이동 대상으로 취급해도 좋다"는 신호를 보낸다.

> 🤔 **그런데 왜 이름이 'move'인가?**
>
> `std::move`는 직접 객체를 옮기지 않는다. 그러나 객체를 **rvalue로 캐스팅해 "movable" 상태로 만들어 준다**. 진짜 이동을 실행하는 move 생성자(또는 move 대입)를 *호출 가능하게* 해 주는 캐스팅이다. 그래서 이름이 `move`다.
>
> 직관은 이렇다. rvalue는 곧 사라질 값이라 어차피 *남에게 보여줘야 할 의무*가 없다. 그러니 비싼 복사로 모든 걸 베끼지 말고, 내장된 자원을 통째로 **"훔쳐 가도"** 안전하다. 이 "훔쳐 가기"가 곧 이동이다.

### 실제 이동은 누가?

`std::move(x)`의 결과를 받는 함수가 이동을 수행한다. 보통 **move 생성자/대입**이다.

```cpp
std::string a = "hello";
std::string b = std::move(a);   // std::move는 캐스팅만
                                 // 진짜 이동은 string의 move ctor
```

### 눈으로 확인하기 — 어떤 생성자가 불리나

개념만으론 헷갈리는 경우를 위한 짤막한 데모다. 두 생성자에 `puts`를 박아 두면 어떤 쪽이 불리는지 그대로 보인다.

```cpp
#include <cstdio>
#include <string>
#include <utility>

class Widget {
public:
    explicit Widget(std::string s) : name(std::move(s)) {}
    Widget(const Widget&)            { std::puts("copy ctor"); }
    Widget(Widget&&) noexcept        { std::puts("move ctor"); }
    std::string name;
};

int main() {
    Widget a("hello");
    Widget b = a;             // → "copy ctor"  (a는 lvalue)
    Widget c = std::move(a);  // → "move ctor"  (std::move가 a를 rvalue로 캐스팅)
}
```

`std::move(a)` 자체는 코드 한 줄이고 캐스팅뿐인데, 그 결과로 `Widget(Widget&&)` 오버로드가 선택된다. *이름이 어떻게 이동을 만들어 주는지*가 출력 두 줄로 확인된다.

## ⚠️ 함정 — `const`는 깎이지 않음

```cpp
class Annotation {
public:
    explicit Annotation(const std::string text)
        : value(std::move(text)) {}     // text는 const std::string!
                                        // → const std::string&& 로 캐스팅됨
private:
    std::string value;
};
```

`std::string`의 move 생성자 시그니처는 `string(string&&)`다. `const string&&`는 받지 못한다. 대신 `string(const string&)` 복사 생성자가 호출된다. **이동이 일어나지 않는다.**

사용자는 move를 의도했는데 실제는 copy다. 정확성은 OK지만 의도와 다르다.

### **교훈: 이동시키고 싶으면 `const`를 붙이지 마라**

```cpp
// Bad — const라 move 안 됨
explicit Annotation(const std::string text);

// Good — std::string으로 받기 (by value, [항목 41])
explicit Annotation(std::string text)
    : value(std::move(text)) {}
```

## `std::forward`는 조건부 캐스팅

```cpp
template<typename T>
T&& forward(typename std::remove_reference<T>::type& param) {
    return static_cast<T&&>(param);
}
```

`forward<T>(x)`의 결과는 이렇다.

- `T`가 lvalue 참조 타입이면 → lvalue로 캐스팅된다 (참조 축약: `T& &&` → `T&`).
- `T`가 그 외 타입이면 → rvalue로 캐스팅된다.

이게 **perfect forwarding의 핵심**이다. 호출자가 보낸 카테고리 그대로 다음 함수에 전달한다.

## 두 함수의 차이

```cpp
template<typename T>
void wrapper(T&& arg) {
    process(std::move(arg));      // 무조건 rvalue로 — arg가 lvalue여도!
    process(std::forward<T>(arg)); // arg의 원래 카테고리 유지
}

int x = 1;
wrapper(x);   // x는 lvalue
              // move 사용: process(int&&) 호출 — x를 망가뜨림!
              // forward 사용: process(int&) 호출 — 의도된 동작
```

**`std::move`는 강제 이동 의도, `std::forward`는 카테고리 보존**이다.

## 실전 패턴

### move

함수 안에서 **확실히 더 이상 안 쓸 객체**를 다른 함수에 넘길 때 쓴다.

```cpp
class Widget {
    std::string name;
public:
    Widget(std::string n) : name(std::move(n)) {}  // n은 더 이상 안 씀
};
```

매개변수가 by-value (또는 rvalue 참조)일 때 이동시켜야 효율적이다.

### forward

**보편 참조 매개변수**의 카테고리를 보존해 다음 함수에 전달한다.

```cpp
template<typename T>
void wrapper(T&& arg) {
    process(std::forward<T>(arg));
}

int x = 1;
wrapper(x);              // x는 lvalue → process(int&)
wrapper(std::move(x));   // rvalue → process(int&&)
wrapper(42);             // rvalue → process(int&&)
```

## `std::move`의 0 비용

`std::move`는 캐스팅뿐이다. **컴파일러가 인라인하면 코드 0**이 된다.

```cpp
std::move(x);   // assembly: 0 instruction
```

비용은 **이후의 move 생성자/대입**이다. 이동 자체가 비용이다.

## perfect forwarding 일반 패턴

```cpp
template<typename T, typename... Args>
std::unique_ptr<T> make(Args&&... args) {
    return std::unique_ptr<T>(new T(std::forward<Args>(args)...));
}
```

각 인자를 forward한다. 호출자가 보낸 카테고리를 보존한다. `std::make_unique` 표준 구현이다.

## 함정 — 매개변수의 마지막 사용 시점에만

같은 매개변수를 함수 안에서 **여러 번 쓴다면, 마지막에만 move/forward**한다.

```cpp
template<typename T>
void process(T&& arg) {
    log(arg);                      // 사용 1 — arg 그대로
    validate(arg);                 // 사용 2
    sink(std::forward<T>(arg));    // 마지막 — 여기서 forward
}
```

먼저 move/forward를 해 버리면 이후 `arg`는 moved-from 상태가 된다. UB 가능성이 있다.

## 함정 — `std::move`는 const 객체에 대해 조용히 copy

```cpp
const std::string s = "hello";
std::string s2 = std::move(s);   // copy 호출 — move 안 됨 (const라)
                                  // 컴파일 에러 X — 조용히 copy
```

**moved-from처럼 보이지만 사실 copy**다. 사용자가 의도와 다른 동작을 모를 수도 있다.

## std::move/forward 미사용 — 명시 권장

```cpp
template<typename T>
void wrapper(T&& arg) {
    process(arg);   // arg는 이름이 있으니 lvalue — process(T&) 호출
                    // 의도가 forward였다면? — 명시적으로 적기
}
```

**명시적 std::forward**가 의도 표현이다.

## 핵심 정리

1. **`std::move` = 무조건 rvalue 캐스팅**이다. 이동 보장이 아니다.
2. **`std::forward<T>` = T가 lvalue 참조면 lvalue, 아니면 rvalue로 캐스팅**한다.
3. **`const`에 `std::move` → copy**가 일어난다 (조용히).
4. 둘 다 **런타임 코드가 거의 0**이다. 순수 컴파일 타임 도구다.
5. **마지막 사용 시점에만** move/forward한다.
6. rvalue 참조 → `std::move`, 보편 참조 → `std::forward<T>`다.

## 관련 항목

- [항목 22: Pimpl](/blog/programming/cpp/effective-modern-cpp/item22-when-using-pimpl-define-special-members-in-impl-file-define-special-members-in-impl-file) — move 자동 생성 차단의 영향
- [항목 24: 보편 참조 vs rvalue 참조](/blog/programming/cpp/effective-modern-cpp/item24-distinguish-universal-references-from-rvalue-references)
- [항목 25: move/forward 사용처](/blog/programming/cpp/effective-modern-cpp/item25-use-move-on-rvalue-refs-and-forward-on-universal-refs)
- [항목 28: 참조 축약](/blog/programming/cpp/effective-modern-cpp/item28-understand-reference-collapsing) — forward 동작 원리
