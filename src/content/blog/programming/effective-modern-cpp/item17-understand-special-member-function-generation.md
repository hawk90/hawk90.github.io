---
title: "항목 17: 특수 멤버 함수의 자동 생성 규칙을 이해하라"
date: 2025-01-06T20:00:00
description: "C++11+ move 생성자/대입 추가 — 자동 생성 규칙의 미묘한 함정과 Rule of Zero/Five."
tags: [C++, Special Member Functions, Move Semantics, Modern C++]
series: "Effective Modern C++"
seriesOrder: 17
---

## 개요

C++11은 특수 멤버 함수에 **move 생성자**와 **move 대입**을 추가. 자동 생성 규칙이 더 복잡해졌는데, 핵심은 **"하나를 직접 선언하면 다른 것의 자동 생성이 막힌다"**는 점입니다.

## 필수 개념: 특수 멤버 함수 6종

> **초보자를 위한 배경 지식**

<br>

C++11 시점부터 클래스의 "특수 멤버 함수":

| # | 함수 | C++03 | C++11+ |
| --- | --- | --- | --- |
| 1 | 기본 생성자 | ✅ | ✅ |
| 2 | 소멸자 | ✅ | ✅ |
| 3 | 복사 생성자 | ✅ | ✅ |
| 4 | 복사 대입 연산자 | ✅ | ✅ |
| 5 | **move 생성자** | — | ✅ (신규) |
| 6 | **move 대입 연산자** | — | ✅ (신규) |

각각 컴파일러가 자동으로 생성할 수 있음 — 단 조건이 있음.

### 자동 생성 시점

특수 멤버 함수는 **사용될 때만** 자동 생성됨.

```cpp
class Empty {};

Empty e1;        // 기본 생성자 호출 — 컴파일러가 자동 생성
Empty e2 = e1;   // 복사 생성자 호출 — 자동 생성
```

사용 안 하면 생성도 안 함.

### 자동 생성된 함수의 특성

- `public`
- `inline`
- `noexcept` (멤버들이 모두 noexcept면)
- 멤버별 (member-wise) 동작:
  - copy/move ctor: 멤버를 차례로 copy/move
  - copy/move assignment: 같음
  - destructor: 멤버 소멸자 역순 호출

## 자동 생성 규칙 — C++11+ 핵심

| 사용자가 직접 선언한 것 | 자동 생성되는 특수 멤버 |
| --- | --- |
| 아무것도 (모두 자동) | 모든 6개 (사용 시점에) |
| **사용자 정의 소멸자** | move ctor·assignment **막힘**, copy는 생성 (deprecated) |
| **사용자 정의 copy 생성자/대입** | move ctor·assignment **막힘** |
| **사용자 정의 move 생성자/대입** | copy 생성자·대입 자동 생성 **막힘** (`= delete` 됨) |

### 가장 중요한 결과 (3가지)

**1. 소멸자 또는 copy 정의 → move 자동 생성 안 됨**

```cpp
class Widget {
public:
    Widget(const Widget&) {}    // copy 정의
    // → move ctor·assignment 자동 생성 안 됨
};

Widget a;
Widget b = std::move(a);   // move ctor 호출? — 자동 생성 안 됨 → copy로 떨어짐!
```

→ 객체가 **항상 copy됨** — 성능 손실.

**2. move 정의 → copy 자동 생성 안 됨 (`= delete`)**

```cpp
class Widget {
public:
    Widget(Widget&&) {}    // move 정의
    // → copy ctor·assignment는 자동 = delete 됨
};

Widget a;
Widget b = a;   // 에러! copy ctor가 deleted
```

명시적으로 copy 필요 시 `= default`로 부활.

**3. "Rule of Three"의 일반화 — Rule of Five**

C++03 "Rule of Three": destructor·copy ctor·copy assignment 중 하나를 정의했으면 셋 다 정의해라.

C++11+ "Rule of Five": **다섯 (위 3개 + move 2개)** 모두 정의해라.

→ 더 좋은 권장 — **Rule of Zero**: 자원은 RAII에 위임하고 모두 자동 생성에 맡겨라.

## Rule of Zero — 가장 권장

자원 관리는 표준 라이브러리에 위임.

```cpp
class Widget {
    std::string                      name;
    std::vector<int>                 data;
    std::unique_ptr<Resource>        resource;
    std::shared_ptr<Connection>      connection;
public:
    // 특수 멤버 함수 모두 자동 — 모두 잘 동작
};
```

각 멤버가 자기 자원 관리 → Widget은 따로 신경 안 써도 됨.

→ **새 클래스에선 Rule of Zero**가 default. Rule of Five는 진짜 자원 관리 필요할 때만.

## Rule of Five — 직접 자원 관리

자원을 raw로 보유한다면 5개 모두 정의:

```cpp
class Buffer {
    int*   data;
    size_t size;
public:
    Buffer(size_t n) : data(new int[n]), size(n) {}
    ~Buffer() { delete[] data; }

    Buffer(const Buffer& rhs)                       // copy ctor
        : data(new int[rhs.size]), size(rhs.size) {
        std::copy(rhs.data, rhs.data + rhs.size, data);
    }

    Buffer& operator=(const Buffer& rhs) {          // copy assignment
        Buffer tmp(rhs);
        std::swap(data, tmp.data);
        std::swap(size, tmp.size);
        return *this;
    }

    Buffer(Buffer&& rhs) noexcept                   // move ctor
        : data(rhs.data), size(rhs.size) {
        rhs.data = nullptr;
        rhs.size = 0;
    }

    Buffer& operator=(Buffer&& rhs) noexcept {      // move assignment
        std::swap(data, rhs.data);
        std::swap(size, rhs.size);
        return *this;
    }
};
```

> ⚠️ **Rule of Zero가 거의 항상 우월** — `Buffer` 대신 `std::vector<int>` 멤버.

## 명시적 자동 생성 요청 — `= default`

자동 생성을 막은 상태에서도 명시적으로 다시 요청 가능.

```cpp
class Widget {
public:
    Widget(const Widget&);   // copy 정의 → move 자동 생성 막힘

    // move를 다시 자동 생성 요청
    Widget(Widget&&) = default;
    Widget& operator=(Widget&&) = default;
};
```

`= default`는:
- 컴파일러가 정의 (코드 안 짜도 됨)
- 의도가 명확 (사용자가 default 원함을 표시)
- 자동 생성 차단 우회

## 명시적 차단 — `= delete`

```cpp
class Singleton {
public:
    Singleton(const Singleton&)            = delete;
    Singleton& operator=(const Singleton&) = delete;
    Singleton(Singleton&&)                 = delete;
    Singleton& operator=(Singleton&&)      = delete;
};
```

복사·이동 모두 차단 — 진정한 singleton.

## 템플릿 멤버 함수와의 상호작용

```cpp
class Widget {
public:
    template<typename T>
    Widget(const T& other);   // copy처럼 보이지만 템플릿
                              // → 진짜 copy 생성자는 여전히 자동 생성됨!
};
```

템플릿 멤버 함수는 **특수 멤버 함수의 자동 생성을 막지 않음**.

```cpp
Widget a;
Widget b(a);   // 컴파일러 자동 생성된 copy ctor 호출
               // (Widget(const T&)가 더 좋은 후보로 보일 수도 있지만 copy ctor 우선)
```

이게 [항목 26 (보편 참조 오버로딩 함정)](/blog/programming/effective-modern-cpp/item26-avoid-overloading-on-universal-references)의 토대.

## 특수 멤버 함수의 noexcept

자동 생성된 특수 멤버 함수는 **모든 멤버의 대응 함수가 noexcept면** 자동 noexcept:

```cpp
struct A {
    int x;
    std::string s;   // string의 move ctor는 noexcept
};

// A의 자동 생성 move ctor는 noexcept
static_assert(std::is_nothrow_move_constructible_v<A>);
```

→ 표준 컨테이너가 move를 사용 ([항목 14 참고](/blog/programming/effective-modern-cpp/item14-declare-functions-noexcept-if-they-wont-emit-exceptions)).

## 디버깅 — 어떤 함수가 자동 생성됐나?

```cpp
class Widget { /* ... */ };

static_assert(std::is_default_constructible_v<Widget>);
static_assert(std::is_copy_constructible_v<Widget>);
static_assert(std::is_move_constructible_v<Widget>);
static_assert(std::is_copy_assignable_v<Widget>);
static_assert(std::is_move_assignable_v<Widget>);
static_assert(std::is_nothrow_move_constructible_v<Widget>);
```

어떤 게 막혔는지 확인 가능.

## 핵심 정리

1. C++11에 **move 생성자/대입**이 특수 멤버에 추가
2. **소멸자나 copy 정의 → move 자동 생성 막힘** (성능 함정)
3. **move 정의 → copy 자동 = delete**
4. **Rule of Zero**가 default — 자원은 RAII로
5. 직접 정의 시 `= default`로 명시 가능
6. **템플릿 생성자는 특수 멤버 자동 생성을 막지 않음**

## 관련 항목

- [항목 11: `= delete`](/blog/programming/effective-modern-cpp/item11-prefer-deleted-functions-to-private-undefined) — 명시적 차단
- [항목 22: Pimpl + special members](/blog/programming/effective-modern-cpp/item22-when-using-pimpl-define-special-members-in-impl-file)
- [항목 23: move/forward](/blog/programming/effective-modern-cpp/item23-understand-std-move-and-std-forward)
- [항목 26: 보편 참조 오버로딩](/blog/programming/effective-modern-cpp/item26-avoid-overloading-on-universal-references) — 템플릿 ctor 함정
