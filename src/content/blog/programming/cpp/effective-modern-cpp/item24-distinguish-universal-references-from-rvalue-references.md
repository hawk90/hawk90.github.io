---
title: "항목 24: 보편 참조와 rvalue 참조를 구분하라"
date: 2025-01-06T00:00:00
description: "T&&는 두 의미 — 정확한 식별 조건과 시각적 구분법."
tags: [C++, Universal Reference, Rvalue Reference, Modern C++]
series: "Effective Modern C++"
seriesOrder: 24
draft: true
---

## 왜 이 항목이 중요한가?

`T&&`는 C++에서 같은 문법으로 두 가지를 표현한다. **rvalue 참조** 또는 **보편 참조(forwarding reference)** 다. 시각적으로 똑같이 생겼지만 의미가 완전히 다르고, 사용해야 할 도구도 다르다.

- rvalue 참조 → `std::move` (이동 의도).
- 보편 참조 → `std::forward<T>` (카테고리 보존).

뒤바꿔 쓰면 어떤 일이 생기는가? lvalue로 들어온 인자가 강제로 파괴되거나, 이동 의도였는데 카테고리 보존 코드가 들어가 의도가 흐려진다.

이 항목은 두 가지를 정확히 구별하는 **두 조건**과 시각적 구분 팁을 정리한다.

## 개요

`T&&`는 같은 문법으로 두 가지 다른 것을 표현한다. **rvalue 참조** 또는 **보편 참조(forwarding reference)** 다. 식별 조건을 모르면 어느 쪽인지 헷갈려 잘못된 캐스팅을 하게 된다.

## 필수 개념: 두 가지 `&&`

> **초보자를 위한 배경 지식**

<br>

### rvalue 참조

C++11에 추가된 새 참조다. **rvalue만** 받는다. move semantics의 토대다.

```cpp
void f(int&& x);    // rvalue 참조 — int rvalue만
f(42);              // OK
int n = 5;
f(n);               // 에러 — n은 lvalue
f(std::move(n));    // OK — std::move가 rvalue로 캐스팅
```

용도는 **이동 의도가 명확**할 때다. 호출자가 "이거 가져가도 돼"라고 약속한다.

### 보편 참조 (forwarding reference)

같은 `&&` 문법이지만 **lvalue·rvalue 모두** 받는다. 템플릿/auto에서만 등장한다.

```cpp
template<typename T>
void f(T&& x);      // 보편 참조 — lvalue·rvalue 모두
f(42);              // OK — rvalue
int n = 5;
f(n);               // OK — lvalue (T는 int& 추론)
```

같은 코드가 두 가지 다른 의미를 가진다.

## 보편 참조의 두 조건

`T&&`가 보편 참조이려면 다음 두 조건을 만족해야 한다.

1. **타입 추론**이 일어나는 자리여야 한다.
2. **정확히 `T&&` 형태**여야 한다 (const, volatile, 다른 타입에 감싸짐 모두 X).

```cpp
template<typename T>
void f1(T&& param);                  // ✅ 보편 참조

template<typename T>
void f2(std::vector<T>&& param);     // ❌ rvalue 참조 (T가 감싸짐)

template<typename T>
void f3(const T&& param);            // ❌ rvalue 참조 (const)

void f4(Widget&& param);             // ❌ rvalue 참조 (추론 없음)

template<typename T>
class Vector {
    void push(T&& x);                // ❌ rvalue 참조!
                                     //    클래스의 T는 이미 결정 — 호출 시점에 추론 X
};
```

## `auto&&`도 보편 참조

같은 두 조건을 만족한다. **추론 + 정확한 형태**다.

```cpp
auto&& a = x;          // ✅ 보편 참조 — auto가 추론
const auto&& b = 42;   // ❌ rvalue 참조 (const)
auto&& c = std::move(x);  // ✅ 보편 참조 (rvalue로 추론)
```

## 추론 결과 (보편 참조의 경우)

- `expr`이 lvalue면 → `T`가 **lvalue 참조**로 추론된다 → 참조 축약 → 매개변수도 lvalue 참조다.
- `expr`이 rvalue면 → `T`가 일반 타입이다 → 매개변수는 rvalue 참조다.

```cpp
template<typename T>
void f(T&& param);

int x = 0;
f(x);    // T = int&,  param = int&
f(0);    // T = int,   param = int&&
```

## 사용 결정

| 참조 종류 | 의도 | 도구 |
| --- | --- | --- |
| **rvalue 참조** | 이동 의도 표현 | `std::move` |
| **보편 참조** | 카테고리 보존 (forwarding) | `std::forward<T>` |

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

## 함정 — 같은 함수에 두 종류 섞기

```cpp
// ❌ 헷갈림
template<typename T>
void process(T&& x);   // 보편 참조

void process(int&& x); // rvalue 참조

process(42);           // 보편이 더 정밀 매칭? 또는 rvalue?
                       // 답: 비-템플릿이 우선 — rvalue 참조 호출
```

[항목 26](/blog/programming/cpp/effective-modern-cpp/item26-avoid-overloading-on-universal-references)에서 자세히 다룬다.

## 함정 — 다른 모양의 `T&&`

### 클래스 템플릿의 멤버 함수

```cpp
template<typename T>
class Vector {
public:
    void push(T&& v);   // T는 클래스에서 결정 — 호출 시점 추론 X
                        // → rvalue 참조 (보편 X)
};

Vector<Widget> v;
v.push(Widget{});       // OK — rvalue
v.push(w);              // 에러 — lvalue
```

### 멤버 함수가 아닌 일반 함수

```cpp
template<typename T>
void f(std::vector<T>&& v);   // T는 호출 시점 추론
                              // 그러나 std::vector<T>로 감싸짐
                              // → rvalue 참조
```

`T`가 직접 매개변수 타입이 아니라 다른 타입에 감싸지면 보편이 아니다.

### 시각적 구분 팁

함수 매개변수의 형태가 정확히 `T&&` 또는 `auto&&` (T·auto가 직접 추론)일 때만 보편 참조다.

- ✅ 보편 참조.

다음은 모두 그냥 rvalue 참조다.

- `const T&&`.
- `volatile T&&`.
- `std::vector<T>&&`.
- `클래스 멤버의 T&&` (클래스의 T).
- `T&&&` (참조의 참조 — 안 됨).

## 보편 참조 → 함수 호출

```cpp
template<typename T>
void wrapper(T&& arg) {
    inner(std::forward<T>(arg));   // 카테고리 보존
}
```

`arg`는 이름이므로 lvalue다 (rvalue 참조 타입이지만, 식 자체는 lvalue).

`std::forward<T>`로 `T`가 인코딩한 카테고리를 복원한다.

## 활용 — perfect forwarding wrapper

```cpp
template<typename Func, typename... Args>
auto invoke(Func&& f, Args&&... args)
    -> decltype(std::forward<Func>(f)(std::forward<Args>(args)...))
{
    return std::forward<Func>(f)(std::forward<Args>(args)...);
}
```

C++17 `std::invoke`가 비슷한 패턴이다 (정확히는 다르다. 멤버 함수 처리 등).

## 비교 — 한눈에

| 기준 | rvalue 참조 | 보편 참조 |
| --- | --- | --- |
| 문법 | `T&&` (T 결정됨) | `T&&` (T 추론) |
| 받는 카테고리 | rvalue만 | lvalue + rvalue |
| 도구 | `std::move` | `std::forward<T>` |
| 사용 | 이동 의도 | 카테고리 보존 (forwarding) |
| 매칭 | 정밀 (rvalue에) | 매우 정밀 (모두에) |

## 핵심 정리

1. **`T&&`는 두 의미**다. 추론 자리 + 정확한 형태일 때만 보편 참조다.
2. **클래스 멤버 함수의 `T&&`** 는 보통 rvalue 참조다 (T가 이미 결정).
3. **`auto&&`** 도 보편 참조다 (auto가 추론).
4. **rvalue 참조 = `std::move`**, **보편 참조 = `std::forward<T>`** 다.
5. 시각적으로 같으니 **매번 의식적으로 구분**한다.

## 관련 항목

- [항목 1: 템플릿 추론](/blog/programming/cpp/effective-modern-cpp/item01-understand-template-type-deduction) — 보편 참조의 두 조건 자세히
- [항목 23: move/forward](/blog/programming/cpp/effective-modern-cpp/item23-understand-std-move-and-std-forward)
- [항목 25: move on rvalue, forward on universal](/blog/programming/cpp/effective-modern-cpp/item25-use-move-on-rvalue-refs-and-forward-on-universal-refs)
- [항목 26: 보편 참조 오버로딩 함정](/blog/programming/cpp/effective-modern-cpp/item26-avoid-overloading-on-universal-references)
- [항목 28: 참조 축약](/blog/programming/cpp/effective-modern-cpp/item28-understand-reference-collapsing)
