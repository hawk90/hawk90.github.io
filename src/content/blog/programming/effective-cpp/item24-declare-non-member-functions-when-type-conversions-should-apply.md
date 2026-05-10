---
title: "항목 24: 모든 매개변수에 타입 변환이 필요하면 비-멤버 함수로 선언하라"
date: 2025-02-04T16:00:00
description: "operator*에서 lhs도 변환 가능해야 한다면 멤버 함수로는 불가능."
tags: [C++, Effective C++, Operator Overloading, Implicit Conversion]
series: "Effective C++"
seriesOrder: 24
draft: true
---

> **초안** — 정리 진행 중

## 개요

이항 연산자에서 **양쪽 피연산자 모두 암묵 변환이 필요**하다면, 비-멤버 함수로 정의해야 합니다. 멤버 함수의 lhs는 `*this`라 변환 대상이 안 됩니다.

## 함정 — 멤버 함수

```cpp
class Rational {
public:
    Rational(int numerator = 0, int denominator = 1);   // 암묵 변환 가능

    const Rational operator*(const Rational& rhs) const;   // 멤버
};

Rational r(1, 2);
Rational result = r * 2;     // OK — r.operator*(Rational(2))
Rational result = 2 * r;     // 에러! 2.operator*(r) — int에 멤버 함수 없음
```

`r * 2`는 `r`이 멤버 함수의 호출 객체(this)이고 `2`만 변환됨. `2 * r`는 `2`가 호출 객체가 되어야 하는데 int는 멤버 함수 없음.

## 해결 — 비-멤버 함수

```cpp
const Rational operator*(const Rational& lhs, const Rational& rhs) {
    return Rational(lhs.n * rhs.n, lhs.d * rhs.d);
}

Rational result = 2 * r;     // OK — operator*(Rational(2), r)
Rational result = r * 2;     // OK — operator*(r, Rational(2))
```

이제 양쪽이 모두 변환 후보. `int → Rational` 변환이 양쪽 다 가능.

## friend는 필요한가?

비-멤버 함수가 private 멤버에 접근해야 한다면 friend가 필요. 그러나 **public 인터페이스만으로 충분하다면 friend 불필요** — 캡슐화 측면에서 더 좋음.

## 핵심 정리

1. 양쪽 피연산자 모두 변환되어야 → **비-멤버 함수**
2. 멤버 함수의 lhs(`*this`)는 변환 안 됨
3. 가능하면 friend 없이 public 인터페이스로
