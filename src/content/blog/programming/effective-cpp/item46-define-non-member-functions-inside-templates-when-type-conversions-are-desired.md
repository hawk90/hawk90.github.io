---
title: "항목 46: 타입 변환이 필요하면 비-멤버 함수를 템플릿 안에 정의하라"
date: 2025-02-07T15:00:00
description: "템플릿 클래스의 friend 비-멤버 함수 — 변환이 양쪽에 적용되도록."
tags: [C++, Effective C++, Template, friend]
series: "Effective C++"
seriesOrder: 46
draft: true
---

> **초안** — 정리 진행 중

## 개요

항목 24의 템플릿 버전. 템플릿 클래스에서 양쪽 피연산자에 변환이 필요하면, 단순한 비-멤버 템플릿 함수로는 안 됩니다 — **템플릿 매개변수 추론은 변환을 거치지 않기 때문**입니다.

## 함정

```cpp
template<typename T>
class Rational {
public:
    Rational(const T& n = 0, const T& d = 1);
};

template<typename T>
const Rational<T> operator*(const Rational<T>& a, const Rational<T>& b);

Rational<int> r(1, 2);
auto result = r * 2;     // 에러!
                          // operator*<int>를 찾으려면 두 인자에서 T 추론
                          // r에서 T = int OK
                          // 2에서 T 추론? int? 변환은 추론 후니까 추론 실패
```

## 해결 — 클래스 안의 friend 함수

```cpp
template<typename T>
class Rational {
public:
    Rational(const T& n = 0, const T& d = 1);

    friend const Rational operator*(const Rational& a, const Rational& b) {
        return Rational(a.numerator() * b.numerator(),
                        a.denominator() * b.denominator());
    }
};

Rational<int> r(1, 2);
auto result = r * 2;     // OK!
                          // Rational<int>가 인스턴스화되면서
                          // operator* 비-템플릿 함수가 생성됨
                          // 비-템플릿이라 통상 변환 적용 → 2 → Rational<int>(2)
```

핵심: **클래스 템플릿이 인스턴스화될 때 함께 생성되는 비-템플릿 함수**라 통상 변환이 적용.

## 본문은 헤더에

위 friend 함수 본문을 헤더에 두는 게 일반적. 분리 정의는 복잡 — `extern template` 등이 필요.

## 핵심 정리

1. 템플릿 매개변수 추론은 암묵 변환 안 거침
2. `operator*` 같은 이항 연산자에서 양쪽 변환 필요하면 클래스 안 friend
3. 인스턴스화 시 생성되는 비-템플릿 함수라 통상 변환 OK
4. 본문은 헤더에 두는 게 깔끔
