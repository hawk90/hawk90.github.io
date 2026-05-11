---
title: "항목 28: 참조 축약(reference collapsing)을 이해하라"
date: 2025-01-08T15:00:00
description: "참조의 참조를 단일 참조로 — 보편 참조와 std::forward의 동작 원리."
tags: [C++, Reference Collapsing, Template, Modern C++]
series: "Effective Modern C++"
seriesOrder: 28
---

## 개요

C++ 코드에서 **참조의 참조**(reference to reference)는 직접 적을 수 없지만, **템플릿 추론**, **typedef/using**, **decltype**, **auto** 같은 자리에서 간접적으로 만들어질 수 있습니다. 이때 컴파일러는 **참조 축약**으로 단일 참조 타입을 만듭니다 — 보편 참조와 `std::forward`의 토대.

## 필수 개념: 참조의 참조

> **초보자를 위한 배경 지식**

<br>

C++에선 직접 `int& &` 같은 코드 못 적음:

```cpp
int& & x;        // 에러
int&& && y;      // 에러
```

그러나 **간접적으로** 만들어지면 — 참조 축약 규칙으로 단일 참조.

## 4가지 축약 규칙

```
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
f(x);   // T = int& 추론 ([항목 1])
        // param 타입: int& && → int& (참조 축약)
```

이게 **보편 참조**의 작동 원리.

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

`forward`는 참조 축약 위에 만들어진 도구.

### 의사 구현

```cpp
template<typename T>
T&& forward(typename remove_reference<T>::type& param) {
    return static_cast<T&&>(param);
}
```

### 동작 분석

```cpp
template<typename T>
void wrapper(T&& arg) {
    process(std::forward<T>(arg));
}

int x = 0;
wrapper(x);   // T = int& (lvalue 호출)
              // forward<int&>(arg)
              //   반환 타입: int& && → int& (참조 축약)
              // → process가 int& 받음 (lvalue로 전달)

wrapper(0);   // T = int (rvalue 호출)
              // forward<int>(arg)
              //   반환 타입: int&&
              // → process가 int&& 받음 (rvalue로 전달)
```

호출자가 보낸 카테고리를 `T`에 인코딩하고, 반환 시 참조 축약으로 풀어냄.

## 보편 참조의 동작 원리

```cpp
template<typename T>
void f(T&& param);
```

`f(x)` (x는 lvalue):
1. 보편 참조 추론 규칙 — lvalue → T = `int&`
2. param 타입: `T&&` = `int& &&` → 참조 축약 → **`int&`**

`f(0)` (rvalue):
1. T = `int` (일반 추론)
2. param 타입: `T&&` = `int&&`

→ 보편 참조가 lvalue·rvalue 둘 다 받는 비밀 = 참조 축약.

## 실제 적용 예시

```cpp
template<typename T>
void f(T&& param);

int x = 10;
const int cx = x;

f(x);    // T = int&,       param = int& && → int&
f(cx);   // T = const int&, param = const int& && → const int&
f(10);   // T = int,        param = int&&
```

## `auto&&`의 동작

C++14 generic lambda:

```cpp
auto print = [](auto&& x) {
    std::cout << std::forward<decltype(x)>(x);
};

int n = 5;
print(n);             // x: int&
print(5);             // x: int&&
print(std::move(n));  // x: int&&
```

`auto&&`도 보편 참조 — 같은 원리.

## `decltype`과의 미묘함

```cpp
int x = 5;

decltype(x)    // int       — id-expression
decltype((x))  // int&      — lvalue 표현식

using A = decltype(x)&;     // int&
using B = decltype((x))&;   // int& & → int&
```

`auto&&`와 `decltype`을 함께 쓸 때 [항목 33 참고](/blog/programming/effective-modern-cpp/item33-use-decltype-on-auto-parameters-when-forwarding).

## 함정 — 참조 축약은 특정 문맥만

참조 축약은 **위 4가지 문맥**에서만 자동 발생. 직접 작성한 `int& &` 같은 코드는 여전히 컴파일 에러.

```cpp
int& & x;   // 에러

template<typename T>
struct Wrap {
    T value;   // T = int&라면 OK (int& 멤버)
    // T& ref;   // 에러? — 참조 축약 적용 — 컴파일 OK
};
```

## perfect forwarding 일반화

참조 축약은 보편 참조와 `forward`의 토대 — 그러므로 다음 모두의 토대:

- 표준의 `std::make_unique`, `std::make_shared`
- `std::forward<T>` 자체
- `std::function<T>`의 호출
- `emplace_back` 류
- 모든 generic wrapper 함수

## 핵심 정리

1. **참조 축약 = lvalue 참조가 하나라도 있으면 결과도 lvalue 참조**
2. **4가지 문맥** — 템플릿 추론, typedef/using, decltype, auto
3. **보편 참조와 `std::forward`의 동작 원리**
4. 직접 `int& &`는 못 적지만, 간접 생성된 참조의 참조는 자동 축약
5. perfect forwarding의 토대

## 관련 항목

- [항목 1: 템플릿 추론](/blog/programming/effective-modern-cpp/item01-understand-template-type-deduction) — 보편 참조 추론
- [항목 23: move/forward](/blog/programming/effective-modern-cpp/item23-understand-std-move-and-std-forward)
- [항목 24: 보편 참조 식별](/blog/programming/effective-modern-cpp/item24-distinguish-universal-references-from-rvalue-references)
- [항목 33: decltype + forwarding](/blog/programming/effective-modern-cpp/item33-use-decltype-on-auto-parameters-when-forwarding)
