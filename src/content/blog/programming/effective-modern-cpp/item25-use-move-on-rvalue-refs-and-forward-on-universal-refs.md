---
title: "항목 25: rvalue 참조에는 std::move를, 보편 참조에는 std::forward를 사용하라"
date: 2025-01-08T12:00:00
description: "참조 종류별 올바른 캐스팅 도구 선택 — 그리고 RVO와 충돌하지 않는 법."
tags: [C++, std::move, std::forward, Move Semantics, Modern C++]
series: "Effective Modern C++"
seriesOrder: 25
draft: true
---

> **초안** — 정리 진행 중

## 개요

`std::move`와 `std::forward`는 각각 **rvalue 참조**와 **보편 참조**에 매칭되는 도구입니다. 잘못 쓰면 의도와 다른 일이 발생 — 게다가 `return`문에서 잘못 쓰면 RVO를 무력화시킵니다.

## 기본 규칙

```cpp
class Widget {
public:
    Widget(Widget&& rhs) {                  // rvalue 참조
        name = std::move(rhs.name);         // ✅ move
    }

    template<typename T>
    void setName(T&& newName) {             // 보편 참조
        name = std::forward<T>(newName);    // ✅ forward
    }
};
```

## 잘못된 조합의 결과

**보편 참조에 `std::move`** → lvalue도 강제로 이동 → 호출자의 객체를 망가뜨림.

```cpp
template<typename T>
void wrapper(T&& arg) {
    sink(std::move(arg));   // arg가 lvalue여도 무조건 move
}

std::string s = "hello";
wrapper(s);   // s가 망가짐 — 호출자가 expect한 동작 아님
```

**rvalue 참조에 `std::forward`** → 동작은 맞지만 매번 `<T>`를 적어야 해 가독성 손해 + 헷갈림.

## 마지막 사용 시점에만 move/forward

같은 매개변수를 함수 안에서 여러 번 쓴다면, **마지막**에만 move/forward 해야 합니다.

```cpp
template<typename T>
void process(T&& arg) {
    log(arg);                      // 사용 1
    validate(arg);                 // 사용 2
    sink(std::forward<T>(arg));    // 마지막 — 여기서 forward
}
```

먼저 move/forward 해버리면 이후 `arg`는 moved-from 상태 — UB.

## 값 반환 시 — RVO와 충돌 주의

```cpp
Widget makeWidget() {
    Widget w;
    return w;        // ✅ NRVO 가능 — copy/move 모두 생략
}

Widget makeWidget() {
    Widget w;
    return std::move(w);   // ❌ NRVO 깨짐 — 강제로 move 발생
}
```

**규칙**: 지역 변수를 그냥 반환하면 컴파일러가 RVO/NRVO로 최적화. `std::move`를 명시하면 오히려 최적화를 막습니다.

**예외**: 매개변수로 받은 rvalue 참조/보편 참조를 반환할 때는 명시적 move/forward 필요 (RVO 적용 안 됨).

```cpp
template<typename T>
Fraction reduceAndCopy(T&& frac) {
    frac.reduce();
    return std::forward<T>(frac);   // ✅
}
```

## 핵심 정리

1. rvalue 참조 → `std::move`, 보편 참조 → `std::forward`
2. 매개변수의 마지막 사용 시점에만 move/forward
3. 지역 변수 반환에 `std::move` 금지 — RVO/NRVO를 깨뜨림
4. 매개변수(rvalue/보편 참조) 반환은 명시적 move/forward 필요
