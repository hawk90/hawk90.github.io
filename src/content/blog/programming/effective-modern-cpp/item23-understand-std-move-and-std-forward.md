---
title: "항목 23: std::move와 std::forward를 이해하라"
date: 2025-01-08T10:00:00
description: "std::move와 std::forward가 실제로 무엇을 하는지 — 둘 다 캐스팅이고 아무것도 이동하지 않는다."
tags: [C++, std::move, std::forward, Move Semantics, Modern C++]
series: "Effective Modern C++"
seriesOrder: 23
draft: true
---

> **초안** — 정리 진행 중

## 개요

`std::move`도, `std::forward`도 **아무것도 이동/전달하지 않습니다.** 둘 다 **컴파일 타임 캐스팅 함수**일 뿐 — 런타임에 코드를 생성하지 않습니다. 이름이 오해를 낳지만, 정확히 무엇을 하는지 이해하는 게 중요합니다.

## `std::move`는 무조건 rvalue로 캐스팅

```cpp
// 개념적 구현
template<typename T>
typename std::remove_reference<T>::type&&
move(T&& param) {
    using ReturnType =
        typename std::remove_reference<T>::type&&;
    return static_cast<ReturnType>(param);
}
```

핵심 동작:
- 입력의 참조를 제거
- `&&` 붙여 rvalue 참조로 캐스팅

이걸로 끝입니다. **이동을 발생시키지 않고**, 단지 컴파일러에게 "이 객체는 이동 대상으로 취급해도 좋다"고 알릴 뿐입니다.

## `std::move` 함정 — `const`는 깎이지 않음

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

`std::string`의 move 생성자 시그니처는 `string(string&&)` — `const string&&`는 받지 못합니다. 대신 `string(const string&)` 복사 생성자가 호출됩니다 — **이동이 일어나지 않음**.

**교훈**: **이동시키고 싶으면 `const`를 붙이지 마세요.**

## `std::forward`는 조건부 캐스팅

```cpp
template<typename T>
T&& forward(typename std::remove_reference<T>::type& param) {
    return static_cast<T&&>(param);
}
```

`forward<T>(x)`의 결과는:
- `T`가 lvalue 참조 타입이면 → lvalue로 캐스팅 (참조 축약: `T& &&` → `T&`)
- `T`가 그 외 타입이면 → rvalue로 캐스팅

이게 perfect forwarding의 핵심 — **호출자가 보낸 카테고리 그대로 다음 함수에 전달**.

## 두 함수의 차이

```cpp
template<typename T>
void wrapper(T&& arg) {
    process(std::move(arg));      // 무조건 rvalue로 — arg가 lvalue여도!
    process(std::forward<T>(arg)); // arg의 원래 카테고리 유지
}

int x = 1;
wrapper(x);   // x는 lvalue
              // move: process(int&&) 호출 — x를 망가뜨림!
              // forward: process(int&) 호출 — 의도된 동작
```

## 실전 패턴

- 함수 안에서 **확실히 더 이상 안 쓸 객체**를 다른 함수에 넘길 때 → `std::move`
- **보편 참조 매개변수**의 카테고리를 보존해 다음 함수에 전달할 때 → `std::forward<T>`

```cpp
// move
class Widget {
    std::string name;
public:
    Widget(std::string n) : name(std::move(n)) {}  // n은 더 이상 안 씀
};

// forward
template<typename T>
void wrapper(T&& arg) {
    process(std::forward<T>(arg));
}
```

## 핵심 정리

1. `std::move`: 무조건 rvalue 캐스팅 — 이동을 보장하지 않음
2. `std::forward<T>`: T가 lvalue 참조면 lvalue, 아니면 rvalue로 캐스팅
3. `const`에 `std::move`를 쓰면 복사가 일어남 — 함정
4. 둘 다 **런타임 코드를 생성하지 않음** — 순수 컴파일 타임 도구
