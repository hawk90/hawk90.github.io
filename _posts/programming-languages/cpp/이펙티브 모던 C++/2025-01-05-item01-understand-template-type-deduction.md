---
layout: post
title: "항목 1: 템플릿 타입 추론 규칙을 이해하라"
date: 2025-01-05
categories: [C++, Effective Modern C++]
tags: [C++, Template, Type Deduction]
---

## 개요

C++의 템플릿 타입 추론(template type deduction)은 복잡해 보이지만, 세 가지 경우로 나누어 생각하면 명확해집니다. `auto` 타입 추론도 거의 동일한 규칙을 따르므로, 이 규칙을 확실히 이해하는 것이 중요합니다.

## 기본 형태

템플릿 함수의 일반적인 형태:

```cpp
template<typename T>
void f(ParamType param);

f(expr);  // expr로부터 T와 ParamType을 추론
```

컴파일러는 `expr`을 통해 두 가지 타입을 추론합니다:
- `T`의 타입
- `ParamType`의 타입

이 둘은 종종 다릅니다. `ParamType`에는 const나 참조(&) 같은 한정자가 포함될 수 있기 때문입니다.

## 세 가지 경우

### 경우 1: ParamType이 참조 또는 포인터 (보편 참조는 제외)

**규칙:**
1. `expr`이 참조 타입이면, 참조 부분을 무시합니다
2. `expr`의 타입과 `ParamType`을 패턴 매칭하여 `T`를 결정합니다

```cpp
template<typename T>
void f(T& param);    // param은 참조

int x = 27;
const int cx = x;
const int& rx = x;

f(x);   // T는 int,       param의 타입은 int&
f(cx);  // T는 const int, param의 타입은 const int&
f(rx);  // T는 const int, param의 타입은 const int&
        // (rx의 참조성은 무시됨)
```

const 참조 파라미터의 경우:

```cpp
template<typename T>
void f(const T& param);  // param은 const 참조

int x = 27;
const int cx = x;
const int& rx = x;

f(x);   // T는 int, param의 타입은 const int&
f(cx);  // T는 int, param의 타입은 const int&
f(rx);  // T는 int, param의 타입은 const int&
```

포인터의 경우도 동일한 규칙이 적용됩니다:

```cpp
template<typename T>
void f(T* param);

int x = 27;
const int* px = &x;

f(&x);  // T는 int,       param의 타입은 int*
f(px);  // T는 const int, param의 타입은 const int*
```

### 경우 2: ParamType이 보편 참조(Universal Reference)

보편 참조는 `T&&` 형태로 선언됩니다:

**규칙:**
- `expr`이 lvalue면 → `T`와 `ParamType` 모두 lvalue 참조로 추론
- `expr`이 rvalue면 → 일반 규칙(경우 1)을 적용

```cpp
template<typename T>
void f(T&& param);   // param은 보편 참조

int x = 27;
const int cx = x;
const int& rx = x;

f(x);   // x는 lvalue  → T는 int&,       param은 int&
f(cx);  // cx는 lvalue → T는 const int&, param은 const int&
f(rx);  // rx는 lvalue → T는 const int&, param은 const int&
f(27);  // 27은 rvalue → T는 int,        param은 int&&
```

이것이 유일하게 `T`가 참조 타입으로 추론되는 경우입니다!

### 경우 3: ParamType이 참조도 포인터도 아닌 경우

값 전달(pass-by-value)입니다:

**규칙:**
1. `expr`이 참조면, 참조 부분을 무시
2. 참조를 무시한 후, `expr`이 const면 const도 무시
3. volatile이면 그것도 무시

```cpp
template<typename T>
void f(T param);     // param은 값 전달

int x = 27;
const int cx = x;
const int& rx = x;

f(x);   // T와 param의 타입 모두 int
f(cx);  // T와 param의 타입 모두 int (const 무시됨!)
f(rx);  // T와 param의 타입 모두 int (const와 참조 무시됨!)
```

**중요:** const는 무시되지만, const 포인터가 가리키는 대상의 const는 유지됩니다:

```cpp
const char* const ptr = "Fun with pointers";

f(ptr);  // param의 타입은 const char*
         // 포인터 자체의 const는 무시되지만,
         // 가리키는 대상의 const는 유지됨
```

## 배열 인수

배열은 특별한 처리가 필요합니다:

```cpp
const char name[] = "J. P. Briggs";  // 타입: const char[13]

template<typename T>
void f(T param);

f(name);  // T는 const char*로 추론 (배열이 포인터로 decay)

template<typename T>
void f(T& param);

f(name);  // T는 const char[13]으로 추론!
          // param의 타입은 const char(&)[13]
```

이를 활용하면 컴파일 타임에 배열 크기를 구할 수 있습니다:

```cpp
template<typename T, std::size_t N>
constexpr std::size_t arraySize(T (&)[N]) noexcept {
    return N;
}

int keyVals[] = { 1, 3, 5, 7, 9, 11, 22, 35 };
std::array<int, arraySize(keyVals)> mappedVals;
```

## 함수 인수

함수도 함수 포인터로 decay됩니다:

```cpp
void someFunc(int, double);

template<typename T>
void f1(T param);

template<typename T>
void f2(T& param);

f1(someFunc);  // param은 함수 포인터: void(*)(int, double)
f2(someFunc);  // param은 함수 참조: void(&)(int, double)
```

## 핵심 정리

1. **참조 파라미터**: expr의 참조성은 무시되지만, const는 타입 추론에 포함됨
2. **보편 참조 파라미터**: lvalue는 특별하게 처리되어 T가 참조 타입으로 추론됨
3. **값 전달 파라미터**: const와 volatile이 무시됨 (포인터가 가리키는 대상의 const는 유지)
4. **배열과 함수**: 참조가 아닌 파라미터에서는 포인터로 decay됨

템플릿 타입 추론을 이해하면 `auto`, `decltype`, 그리고 Modern C++의 많은 기능들을 더 잘 활용할 수 있습니다.