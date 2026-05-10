---
title: "항목 24: 보편 참조와 rvalue 참조를 구분하라"
date: 2025-01-08T11:00:00
description: "T&&는 두 가지 의미 — 정확한 식별 조건과 시각적 구분법."
tags: [C++, Universal Reference, Rvalue Reference, Modern C++]
series: "Effective Modern C++"
seriesOrder: 24
draft: true
---

> **초안** — 정리 진행 중

## 개요

`T&&`는 같은 문법으로 두 가지 다른 것을 표현합니다 — **rvalue 참조** 또는 **보편 참조(forwarding reference)**. 식별 조건을 모르면 어느 쪽인지 헷갈려 잘못된 캐스팅을 하게 됩니다.

## 보편 참조의 두 조건

`T&&`가 보편 참조이려면:

1. **타입 추론**이 일어나는 자리여야 함
2. **정확히 `T&&` 형태**여야 함 (const, volatile, 다른 타입에 감싸짐 모두 X)

```cpp
template<typename T>
void f(T&& param);                  // ✅ 보편 참조

template<typename T>
void f(std::vector<T>&& param);     // ❌ rvalue 참조 (T가 감싸짐)

template<typename T>
void f(const T&& param);            // ❌ rvalue 참조 (const)

void f(Widget&& param);              // ❌ rvalue 참조 (추론 없음)

template<typename T>
class Vector {
    void push(T&& x);                // ❌ rvalue 참조 — 클래스 T는 이미 결정됨
};
```

## `auto&&`도 보편 참조

같은 두 조건을 만족.

```cpp
auto&& a = x;          // ✅ 보편 참조
const auto&& b = 42;   // ❌ rvalue 참조 (const)
```

## 추론 결과 (보편 참조의 경우)

- `expr`이 lvalue → `T`가 **lvalue 참조**로 추론 → 참조 축약 → 매개변수도 lvalue 참조
- `expr`이 rvalue → `T`가 일반 타입 → 매개변수는 rvalue 참조

```cpp
template<typename T>
void f(T&& param);

int x = 0;
f(x);    // T = int&,  param = int&
f(0);    // T = int,   param = int&&
```

## 사용 결정

- **rvalue 참조**: `std::move`로 이동 의도 표현
- **보편 참조**: `std::forward<T>`로 카테고리 보존

```cpp
class Widget {
public:
    Widget(Widget&& rhs) {                       // rvalue 참조
        name = std::move(rhs.name);              // move
    }

    template<typename T>
    void setName(T&& newName) {                  // 보편 참조
        name = std::forward<T>(newName);         // forward
    }

private:
    std::string name;
};
```

## 핵심 정리

1. `T&&`는 두 의미 — **추론 자리 + 정확한 형태**일 때만 보편 참조
2. 클래스 멤버 함수의 `T&&`는 보통 rvalue 참조 (T가 이미 결정됨)
3. 보편 참조 = `std::forward`, rvalue 참조 = `std::move`
4. 시각적으로 같으니 매번 의식적으로 구분
