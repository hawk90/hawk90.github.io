---
title: "항목 21: 반드시 객체를 반환해야 할 때 참조를 반환하려 하지 말라"
date: 2025-02-04T13:00:00
description: "지역 변수 참조 반환 = 댕글링. 새 객체가 필요하면 값으로 반환."
tags: [C++, Effective C++, Reference, Return Value]
series: "Effective C++"
seriesOrder: 21
draft: true
---

> **초안** — 정리 진행 중

## 개요

함수가 새 객체를 만들어 돌려줘야 한다면, **참조 반환은 위험**합니다. 지역 변수의 참조는 댕글링, 정적 변수는 동시성/재진입 문제. 그냥 값으로 반환하고 컴파일러의 RVO를 신뢰하세요.

## 위험 1 — 지역 변수 참조

```cpp
const Rational& operator*(const Rational& a, const Rational& b) {
    Rational result(a.n * b.n, a.d * b.d);
    return result;     // 함수 종료 시 result 소멸 → 댕글링!
}
```

## 위험 2 — heap 할당

```cpp
const Rational& operator*(const Rational& a, const Rational& b) {
    Rational* p = new Rational(a.n * b.n, a.d * b.d);
    return *p;     // 누구가 delete?? — 누수
}

Rational w, x, y, z;
w = x * y * z;     // 두 개의 임시 Rational — 둘 다 누수
```

## 위험 3 — static 변수

```cpp
const Rational& operator*(const Rational& a, const Rational& b) {
    static Rational result;
    result = Rational(a.n * b.n, a.d * b.d);
    return result;     // 동일 static을 모든 호출이 공유
}

Rational a, b, c, d;
if ((a * b) == (c * d)) ...     // 항상 true!
                                  // 첫 비교 시점에 두 결과가 같은 static을 가리킴
```

## 해결 — 값으로 반환

```cpp
const Rational operator*(const Rational& a, const Rational& b) {
    return Rational(a.n * b.n, a.d * b.d);
}
```

복사 비용이 걱정되면 컴파일러의 RVO/NRVO가 대부분 제거. C++11+ 에선 move semantics로 추가 이득.

## 핵심 정리

1. 새 객체 반환은 **값으로** — 참조는 위험
2. 지역 변수 참조 = 댕글링
3. 힙 할당 + 참조 = 누수
4. static 객체 + 참조 = 공유 함정
5. 컴파일러 최적화(RVO, move)를 신뢰
