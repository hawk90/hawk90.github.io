---
title: "항목 15: 가능하다면 constexpr를 사용하라"
date: 2025-01-06T18:00:00
description: "constexpr가 컴파일 타임 평가, 상수 표현식 자리, 그리고 성능에 어떤 영향을 주는지."
tags: [C++, constexpr, Modern C++]
series: "Effective Modern C++"
seriesOrder: 15
draft: true
---

> **초안** — 정리 진행 중

## 개요

`constexpr`는 **"컴파일 타임에 알 수 있는 값"**을 표현합니다. 변수에 붙으면 진짜 상수, 함수에 붙으면 인자가 컴파일 타임 상수일 때 컴파일 타임에 평가됩니다. 배열 크기, 템플릿 인자, `enum` 값 등 **상수 표현식이 필요한 자리**에서 사용 가능해집니다.

## constexpr 변수 vs const 변수

```cpp
int sz = 10;                  // 런타임 변수
const int cx = 10;            // const, 하지만 컴파일 타임 상수가 아닐 수도
constexpr int cy = 10;        // 컴파일 타임 상수 — 보장됨

int arr1[sz];   // 에러
int arr2[cx];   // 컴파일러에 따라 다름 (cx 초기치가 상수면 OK)
int arr3[cy];   // OK — 항상
```

`constexpr` 객체는 **반드시** 컴파일 타임에 알려진 값으로 초기화됩니다. `const`는 단지 "수정 불가"일 뿐이라 런타임 값으로도 초기화될 수 있습니다.

## constexpr 함수

```cpp
constexpr int pow(int base, int exp) noexcept {
    return (exp == 0) ? 1 : base * pow(base, exp - 1);
}

constexpr int n = pow(2, 10);   // 컴파일 타임에 1024로 평가
int           m = pow(x, y);    // 런타임에도 호출 가능 (일반 함수처럼)
```

**핵심 성질**: 같은 함수가 컴파일 타임 상수를 받으면 컴파일 타임에 평가되고, 런타임 값을 받으면 런타임에 평가됩니다 — **두 모드를 한 함수로**.

## C++11 vs C++14의 차이

- **C++11**: 함수 본문에 `return 한 줄`만 가능 (재귀로 우회)
- **C++14**: 일반적인 제어 흐름(`if`, `for`, 지역 변수)도 OK

```cpp
// C++14 — 더 자연스러운 작성
constexpr int factorial(int n) {
    int result = 1;
    for (int i = 2; i <= n; ++i) result *= i;
    return result;
}
```

## constexpr 사용자 정의 타입

```cpp
class Point {
    double x, y;
public:
    constexpr Point(double xVal = 0, double yVal = 0) noexcept
        : x(xVal), y(yVal) {}

    constexpr double xValue() const noexcept { return x; }
    constexpr void setX(double newX) noexcept { x = newX; }  // C++14
};

constexpr Point p1(1.0, 2.0);   // 컴파일 타임 객체 생성
constexpr Point midpoint(const Point& a, const Point& b) noexcept {
    return { (a.xValue() + b.xValue()) / 2,
             (a.yValue() + b.yValue()) / 2 };
}

constexpr Point mid = midpoint(p1, Point(3, 4));   // 컴파일 타임 계산
```

## `constexpr`의 함의

`constexpr`는 함수의 **공개 인터페이스의 일부**입니다 — 한 번 약속하면 사용자가 컴파일 타임 평가에 의존하므로, 나중에 떼기 어렵습니다.

## 핵심 정리

1. `constexpr` 변수는 컴파일 타임 상수 보장
2. `constexpr` 함수는 컴파일 타임/런타임 양용
3. 가능하면 `constexpr`를 — 더 많은 자리에서 사용 가능
4. 인터페이스 계약이므로 신중히 약속
