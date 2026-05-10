---
title: "항목 32: 객체를 클로저로 이동시키려면 init capture를 사용하라"
date: 2025-01-09T11:00:00
description: "C++14 init capture로 람다에 move-only 객체 담는 법, C++11 우회법까지."
tags: [C++, Lambda, Move Semantics, Modern C++]
series: "Effective Modern C++"
seriesOrder: 32
draft: true
---

> **초안** — 정리 진행 중

## 개요

C++11 람다는 **값 캡처(`[x]`)나 참조 캡처(`[&x]`)**만 가능 — `std::unique_ptr` 같은 move-only 객체를 클로저에 넣을 수 없었습니다. C++14의 **init capture** 문법이 이를 해결합니다.

## C++14 init capture

```cpp
auto pw = std::make_unique<Widget>();

auto func = [pw = std::move(pw)] {   // 새 캡처 변수 pw에 std::move(pw) 저장
    pw->doSomething();
};
```

문법: `[변수명 = 표현식]`. 표현식은 캡처 시점의 스코프에서 평가되고, 결과가 클로저 멤버로 저장됨.

좌변의 `pw`는 클로저 안의 새 변수, 우변의 `pw`는 바깥 스코프의 원본.

## 임시 객체 직접 캡처

```cpp
auto func = [pw = std::make_unique<Widget>()] {
    pw->doSomething();
};
```

람다 안에 객체를 만들어 넣은 효과.

## C++11 우회법 1: 직접 함수 객체 작성

```cpp
class IsValAndArch {
    std::unique_ptr<Widget> pw;
public:
    explicit IsValAndArch(std::unique_ptr<Widget>&& w)
        : pw(std::move(w)) {}

    bool operator()() const { return pw->isValidated(); }
};

auto func = IsValAndArch(std::make_unique<Widget>());
```

람다가 하던 일을 손으로 풀어서 작성. 길지만 명확.

## C++11 우회법 2: `std::bind`

```cpp
auto func = std::bind(
    [](const std::unique_ptr<Widget>& pw) {
        return pw->isValidated();
    },
    std::make_unique<Widget>()
);
```

`bind`가 인자를 클로저에 보관 — move-only 객체도 OK. 다만 `bind` 자체의 단점(타입 명료성, 디버깅)은 항목 34 참고.

## init capture로 perfect forwarding

```cpp
auto func = [data = std::forward<T>(arg)] {
    use(data);
};
```

보편 참조 매개변수의 카테고리를 보존해 캡처할 때 유용.

## 핵심 정리

1. C++14 init capture: `[name = expr]`로 임의 표현식 결과를 클로저에 저장
2. move-only 객체를 람다에 넣을 수 있음
3. C++11에선 직접 함수 객체나 `std::bind`로 우회
4. 임시 객체 직접 생성, perfect forwarding 모두 가능
