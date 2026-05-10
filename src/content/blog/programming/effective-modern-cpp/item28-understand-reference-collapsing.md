---
title: "항목 28: 참조 축약(reference collapsing)을 이해하라"
date: 2025-01-08T15:00:00
description: "참조의 참조가 만들어질 때 적용되는 4가지 축약 규칙과 그 응용."
tags: [C++, Reference Collapsing, Template, Modern C++]
series: "Effective Modern C++"
seriesOrder: 28
draft: true
---

> **초안** — 정리 진행 중

## 개요

C++ 코드에서 **참조의 참조**(reference to reference)는 직접 적을 수 없지만, **템플릿 추론**, **typedef/using**, **decltype**, **auto** 같은 자리에서 간접적으로 만들어질 수 있습니다. 이때 컴파일러는 **참조 축약(reference collapsing)**으로 단일 참조 타입을 만듭니다.

## 4가지 규칙

```cpp
T&  &   → T&
T&  &&  → T&
T&& &   → T&
T&& &&  → T&&
```

**한 줄 요약**: lvalue 참조가 하나라도 있으면 결과는 **lvalue 참조**, 그렇지 않으면 rvalue 참조.

## 발생하는 4가지 문맥

### 1. 템플릿 인스턴스화

```cpp
template<typename T>
void f(T&& param);

int x = 0;
f(x);   // T = int& 추론
        // param 타입: int& && → int& (참조 축약)
```

이게 보편 참조의 작동 원리입니다.

### 2. `typedef` / `using`

```cpp
template<typename T>
class Widget {
    using LvalueRefType = T&;   // T가 int&라면
                                // LvalueRefType = int& & → int&
};
```

### 3. `decltype`

```cpp
int x = 0;
using A = decltype((x))&;       // decltype((x)) = int&
                                // A = int& & → int&
```

### 4. `auto`

```cpp
int x = 0;
auto&& a = x;   // x lvalue → auto = int&
                // a 타입: int& && → int&
```

## `std::forward`의 동작 원리

`forward`도 참조 축약 위에 만들어진 도구.

```cpp
template<typename T>
T&& forward(typename remove_reference<T>::type& param) {
    return static_cast<T&&>(param);
}

// T = int& (lvalue 호출자 카테고리)
// 반환 타입: int& && → int& (lvalue 반환)

// T = int (rvalue 호출자 카테고리)
// 반환 타입: int&& (rvalue 반환)
```

호출자가 보낸 카테고리를 `T`에 인코딩하고, 반환 시 참조 축약으로 풀어냅니다.

## 핵심 정리

1. 참조 축약 = lvalue 참조가 하나라도 있으면 결과도 lvalue 참조
2. 템플릿 추론, typedef/using, decltype, auto 네 자리에서 발생
3. 보편 참조와 `std::forward`의 동작 원리
4. 직접 `int& &` 같은 코드는 못 적지만, 간접 생성된 참조의 참조는 자동 축약
