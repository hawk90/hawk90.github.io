---
title: "항목 24: 보편 참조와 rvalue 참조를 구분하라"
date: 2025-01-08T11:00:00
description: "T&&는 두 의미 — 정확한 식별 조건과 시각적 구분법."
tags: [C++, Universal Reference, Rvalue Reference, Modern C++]
series: "Effective Modern C++"
seriesOrder: 24
---

## 개요

`T&&`는 같은 문법으로 두 가지 다른 것을 표현 — **rvalue 참조** 또는 **보편 참조(forwarding reference)**. 식별 조건을 모르면 어느 쪽인지 헷갈려 잘못된 캐스팅을 하게 됩니다.

## 필수 개념: 두 가지 `&&`

> **초보자를 위한 배경 지식**

<br>

### rvalue 참조

C++11에 추가된 새 참조 — **rvalue만** 받음. move semantics의 토대.

```cpp
void f(int&& x);    // rvalue 참조 — int rvalue만
f(42);              // OK
int n = 5;
f(n);               // 에러 — n은 lvalue
f(std::move(n));    // OK — std::move가 rvalue로 캐스팅
```

용도: **이동 의도가 명확** — 호출자가 "이거 가져가도 돼"라고 약속.

### 보편 참조 (forwarding reference)

같은 `&&` 문법, 그러나 **lvalue·rvalue 모두** 받음. 템플릿/auto에서만 등장.

```cpp
template<typename T>
void f(T&& x);      // 보편 참조 — lvalue·rvalue 모두
f(42);              // OK — rvalue
int n = 5;
f(n);               // OK — lvalue (T는 int& 추론)
```

→ 같은 코드가 두 가지 다른 의미.

## 보편 참조의 두 조건

`T&&`가 보편 참조이려면:

1. **타입 추론**이 일어나는 자리여야 함
2. **정확히 `T&&` 형태**여야 함 (const, volatile, 다른 타입에 감싸짐 모두 X)

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

같은 두 조건 만족 — **추론 + 정확한 형태**.

```cpp
auto&& a = x;          // ✅ 보편 참조 — auto가 추론
const auto&& b = 42;   // ❌ rvalue 참조 (const)
auto&& c = std::move(x);  // ✅ 보편 참조 (rvalue로 추론)
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

→ [항목 26](/blog/programming/cpp/effective-modern-cpp/item26-avoid-overloading-on-universal-references)에서 자세히.

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

`T`가 직접 매개변수 타입이 아니라 다른 타입에 감싸짐 → 보편 X.

### 시각적 구분 팁

함수 매개변수의 형태가 정확히 `T&&` 또는 `auto&&` (T·auto가 직접 추론):
- ✅ 보편 참조

다음은 모두 그냥 rvalue 참조:
- `const T&&`
- `volatile T&&`
- `std::vector<T>&&`
- `클래스 멤버의 T&&` (클래스의 T)
- `T&&&` (참조의 참조 — 안 됨)

## 보편 참조 → 함수 호출

```cpp
template<typename T>
void wrapper(T&& arg) {
    inner(std::forward<T>(arg));   // 카테고리 보존
}
```

`arg`는 이름 — lvalue (rvalue 참조 타입이지만, 식 자체는 lvalue).

`std::forward<T>`로 `T`가 인코딩한 카테고리 복원.

## 활용 — perfect forwarding wrapper

```cpp
template<typename Func, typename... Args>
auto invoke(Func&& f, Args&&... args)
    -> decltype(std::forward<Func>(f)(std::forward<Args>(args)...))
{
    return std::forward<Func>(f)(std::forward<Args>(args)...);
}
```

C++17 `std::invoke`가 비슷한 패턴 (정확히는 다름 — 멤버 함수 처리 등).

## 비교 — 한눈에

| 기준 | rvalue 참조 | 보편 참조 |
| --- | --- | --- |
| 문법 | `T&&` (T 결정됨) | `T&&` (T 추론) |
| 받는 카테고리 | rvalue만 | lvalue + rvalue |
| 도구 | `std::move` | `std::forward<T>` |
| 사용 | 이동 의도 | 카테고리 보존 (forwarding) |
| 매칭 | 정밀 (rvalue에) | 매우 정밀 (모두에) |

## 핵심 정리

1. **`T&&`는 두 의미** — 추론 자리 + 정확한 형태일 때만 보편 참조
2. **클래스 멤버 함수의 `T&&`**는 보통 rvalue 참조 (T가 이미 결정)
3. **`auto&&`**도 보편 참조 (auto가 추론)
4. **rvalue 참조 = `std::move`**, **보편 참조 = `std::forward<T>`**
5. 시각적으로 같으니 **매번 의식적으로 구분**

## 관련 항목

- [항목 1: 템플릿 추론](/blog/programming/cpp/effective-modern-cpp/item01-understand-template-type-deduction) — 보편 참조의 두 조건 자세히
- [항목 23: move/forward](/blog/programming/cpp/effective-modern-cpp/item23-understand-std-move-and-std-forward)
- [항목 25: move on rvalue, forward on universal](/blog/programming/cpp/effective-modern-cpp/item25-use-move-on-rvalue-refs-and-forward-on-universal-refs)
- [항목 26: 보편 참조 오버로딩 함정](/blog/programming/cpp/effective-modern-cpp/item26-avoid-overloading-on-universal-references)
- [항목 28: 참조 축약](/blog/programming/cpp/effective-modern-cpp/item28-understand-reference-collapsing)
