---
title: "항목 26: 변수 정의는 가능한 한 늦춰라"
date: 2025-02-05T10:00:00
description: "사용 직전에 정의 — 불필요한 생성·소멸 회피, 의도된 값으로 초기화."
tags: [C++, Effective C++, Performance, Initialization]
series: "Effective C++"
seriesOrder: 26
draft: true
---

> **초안** — 정리 진행 중

## 개요

함수 시작에 모든 변수를 선언하는 옛 C 스타일 대신, **사용 직전에 정의**하면 효율과 가독성 모두 향상됩니다.

## 1. 사용 안 될 가능성

```cpp
std::string encryptPassword(const std::string& password) {
    std::string encrypted;     // 일찍 정의 — 예외 시에도 생성·소멸 비용 발생

    if (password.length() < MIN_LEN)
        throw std::logic_error("too short");

    encrypted = password;
    encrypt(encrypted);
    return encrypted;
}
```

예외가 던져지면 `encrypted`는 만들어졌다가 바로 소멸. 사용 시점까지 미루기:

```cpp
std::string encryptPassword(const std::string& password) {
    if (password.length() < MIN_LEN)
        throw std::logic_error("too short");

    std::string encrypted(password);   // 사용 시점에 — 의도된 초기화로
    encrypt(encrypted);
    return encrypted;
}
```

## 2. 의미 있는 초기치로 초기화

```cpp
std::string s;        // 기본 생성 + 나중에 대입 — 두 번 작업
s = someValue;

std::string s = someValue;   // 한 번에 — 복사 생성자
```

기본 생성 후 대입보다 한 번에 의미 있는 값으로 초기화하는 게 효율적.

## 3. 루프 안 vs 밖

```cpp
// A: 루프 밖
Widget w;
for (int i = 0; i < n; ++i) {
    w = expr(i);
    // ...
}
// → w 1번 생성, n번 대입, 1번 소멸

// B: 루프 안
for (int i = 0; i < n; ++i) {
    Widget w(expr(i));
    // ...
}
// → w n번 생성·소멸
```

- **A가 빠른 경우**: 대입이 (생성+소멸)보다 저렴할 때 (예: 단순 타입)
- **B가 좋은 경우**: 변수의 스코프가 좁아 가독성·안전성 ↑

도메인에 따라 선택.

## 핵심 정리

1. 변수는 사용 직전에 정의
2. 기본 생성 후 대입 대신 의미 있는 초기치로 한 번에
3. 루프 안/밖은 비용 비교 후 결정 — 의심되면 좁은 스코프(루프 안)
