---
title: "항목 10: 대입 연산자는 *this의 참조를 반환하라"
date: 2025-02-02T15:00:00
description: "체인 대입(x = y = z) 지원을 위한 표준 관용구."
tags: [C++, Effective C++, Operator Overloading]
series: "Effective C++"
seriesOrder: 10
draft: true
---

> **초안** — 정리 진행 중

## 개요

`x = y = z = 15`처럼 대입을 체인으로 쓰려면 `=`이 **lvalue를 반환**해야 합니다. 표준 관용구는 `*this`를 참조로 반환.

## 표준 패턴

```cpp
class Widget {
public:
    Widget& operator=(const Widget& rhs) {
        // ...
        return *this;
    }

    // += -= 등 모든 대입 형태에 동일
    Widget& operator+=(const Widget& rhs) {
        // ...
        return *this;
    }
};
```

## 체인 동작 원리

```cpp
int x, y, z;
x = y = z = 15;
// 같은 의미: x = (y = (z = 15));
// 1. z = 15 → z의 참조 반환
// 2. y = (z의 참조) → y의 참조 반환
// 3. x = (y의 참조) → x의 참조 반환
```

값 반환이라면 임시 객체가 만들어져 효율도 떨어지고 의미도 미묘해짐.

## 표준 관용구이지 강제는 아님

컴파일러가 강요하진 않습니다 — `void`나 다른 타입 반환도 가능. 하지만 **모든 표준 라이브러리와 사용자 코드가 이 관용구를 가정**하므로 따르는 게 좋음.

## 핵심 정리

1. 모든 대입 연산자(`=`, `+=`, `-=` 등)는 `Widget&`를 반환
2. 본문 끝에 `return *this;`
3. 체인 대입과 표준 관용구 호환을 위해
