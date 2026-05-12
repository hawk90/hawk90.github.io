---
title: "항목 22: Pimpl 관용구 사용 시 특수 멤버 함수는 구현 파일에 정의하라"
date: 2025-01-07T14:00:00
description: "Pimpl + unique_ptr 조합에서 incomplete type 에러를 회피하는 정확한 패턴."
tags: [C++, Pimpl, unique_ptr, Compilation, Modern C++]
series: "Effective Modern C++"
seriesOrder: 22
---

## 개요

**Pimpl**(Pointer to Implementation)은 구현 세부를 헤더에서 숨겨 컴파일 의존성을 줄이는 관용구. C++11 이전엔 raw pointer + 수동 delete였지만 모던에선 `std::unique_ptr`로 깔끔. 단 **특수 멤버 함수의 정의 위치**에 함정이 있음.

## 필수 개념: Pimpl이란

> **초보자를 위한 배경 지식**

<br>

### 컴파일 의존성 문제

```cpp
// Widget.h
#include <string>          // 의존성 ↑
#include "Date.h"          // 의존성 ↑
#include "Address.h"       // 의존성 ↑

class Widget {
    std::string  name;
    Date         birthday;
    Address      addr;
    // ...
};
```

`Widget.h`를 include하는 모든 파일은 `string`, `Date.h`, `Address.h`까지 모두 컴파일해야. `Date.h`가 바뀌면 → **모든 의존 파일 재컴파일**.

### Pimpl — 멤버를 포인터 뒤로 숨김

```cpp
// Widget.h — 가벼움
class WidgetImpl;        // 전방 선언

class Widget {
    WidgetImpl* pImpl;   // ← 포인터 (incomplete type OK)
public:
    // ...
};
```

```cpp
// Widget.cpp — 무거운 의존성은 여기만
#include "WidgetImpl.h"

class WidgetImpl {       // 진짜 멤버들
    std::string  name;
    Date         birthday;
    Address      addr;
};
```

→ **헤더 의존성 ↓**, 컴파일 시간 ↓.

## 모던 Pimpl — `unique_ptr`

```cpp
// Widget.h
#include <memory>

class Widget {
    struct Impl;
    std::unique_ptr<Impl> pImpl;
public:
    Widget();
    ~Widget();
    // ...
};
```

```cpp
// Widget.cpp
struct Widget::Impl {
    // 실제 멤버들 (헤더 의존성 다 여기서)
    std::string  name;
    // ...
};

Widget::Widget()  : pImpl(std::make_unique<Impl>()) {}
Widget::~Widget() = default;       // ◄── 반드시 .cpp에!
```

## 왜 소멸자를 .cpp에?

`unique_ptr<Impl>`은 소멸 시점에 **`Impl`의 완전한 타입 정의**가 필요 — 소멸자 호출을 위해.

### 헤더에 `~Widget() = default` — 에러

```cpp
// Widget.h — 잘못된 예
class Widget {
    struct Impl;
    std::unique_ptr<Impl> pImpl;
public:
    Widget();
    ~Widget() = default;            // ◄── Widget.h만 본 사용자 코드에서 인스턴스화 시도
                                    //    Impl이 incomplete → 컴파일 에러
};

// 사용자
Widget w;   // 에러: Impl is incomplete
```

`unique_ptr<Impl>`의 소멸자를 인스턴스화하려면 Impl이 완전 타입이어야 — 헤더만 보면 incomplete.

### 해결 — 소멸자 선언만 헤더에, 정의는 .cpp

```cpp
// Widget.h
class Widget {
    struct Impl;
    std::unique_ptr<Impl> pImpl;
public:
    Widget();
    ~Widget();             // 선언만
};
```

```cpp
// Widget.cpp
struct Widget::Impl { /* ... */ };

Widget::~Widget() = default;   // 정의 — 여기선 Impl 완전 타입
```

→ **사용자 코드에서 소멸자 호출 시 Widget.cpp의 정의 사용** → Impl 완전 타입 OK.

## move 연산도 마찬가지

`unique_ptr` 자체는 move 가능이지만, **move 연산도 구버전 객체의 소멸을 호출** → 같은 함정.

```cpp
// Widget.h
class Widget {
public:
    Widget(Widget&&) noexcept;             // 선언만
    Widget& operator=(Widget&&) noexcept;
};
```

```cpp
// Widget.cpp
Widget::Widget(Widget&&) noexcept = default;
Widget& Widget::operator=(Widget&&) noexcept = default;
```

[항목 17](/blog/programming/cpp/effective-modern-cpp/item17-understand-special-member-function-generation): 사용자 정의 소멸자 → move 자동 생성 막힘. 그러므로 **소멸자 + move 모두 명시**.

## copy도 필요하면

`unique_ptr`는 복사 불가 → 직접 정의 필요.

```cpp
// Widget.h
class Widget {
public:
    Widget(const Widget& rhs);
    Widget& operator=(const Widget& rhs);
    // ...
};
```

```cpp
// Widget.cpp
Widget::Widget(const Widget& rhs)
    : pImpl(std::make_unique<Impl>(*rhs.pImpl)) {}    // Impl 복사

Widget& Widget::operator=(const Widget& rhs) {
    *pImpl = *rhs.pImpl;
    return *this;
}
```

## 5개 모두 헤더 + .cpp 패턴 (Rule of Five with Pimpl)

```cpp
// Widget.h
class Widget {
    struct Impl;
    std::unique_ptr<Impl> pImpl;
public:
    Widget();
    ~Widget();                                    // 선언
    Widget(const Widget&);                        // 선언
    Widget& operator=(const Widget&);             // 선언
    Widget(Widget&&) noexcept;                    // 선언
    Widget& operator=(Widget&&) noexcept;         // 선언
};
```

```cpp
// Widget.cpp
struct Widget::Impl { /* ... */ };

Widget::Widget()                              : pImpl(std::make_unique<Impl>()) {}
Widget::~Widget()                             = default;
Widget::Widget(Widget&&) noexcept             = default;
Widget& Widget::operator=(Widget&&) noexcept  = default;

Widget::Widget(const Widget& rhs)
    : pImpl(std::make_unique<Impl>(*rhs.pImpl)) {}

Widget& Widget::operator=(const Widget& rhs) {
    *pImpl = *rhs.pImpl;
    return *this;
}
```

## `shared_ptr<Impl>`은?

`shared_ptr<Impl>`은 **deleter가 type-erased** ([항목 19](/blog/programming/cpp/effective-modern-cpp/item19-use-shared-ptr-for-shared-ownership)) — incomplete type에서도 문제 없음.

```cpp
// Widget.h
class Widget {
    struct Impl;
    std::shared_ptr<Impl> pImpl;   // shared_ptr
public:
    Widget();
    ~Widget() = default;            // 헤더에 OK!
};
```

→ **shared 의미 변화에 주의**: Pimpl 객체가 다른 곳과 Impl 공유? 보통 의미 X.

→ **unique_ptr가 표준 + Pimpl 의도와 일치**.

## 컴파일 시간 절감 효과

큰 헤더 의존성을 가진 클래스에 Pimpl 적용:
- 의존 파일 수 감소
- 부분 재컴파일 시 영향 ↓
- 인터페이스 안정성 ↑ (멤버 변경이 ABI 안 깨뜨림)

→ **라이브러리 헤더**에 특히 유리.

## 함정 정리

| 함정 | 해결 |
| --- | --- |
| `unique_ptr<Impl>` + 헤더에 `~Widget() = default` | .cpp로 |
| 동시에 move 자동 생성 막힘 | move도 명시 + .cpp로 |
| copy 자동 생성 X | 명시 + Impl 복사 |
| `shared_ptr<Impl>`이면 헤더 OK | 그러나 의미 다름 |

## ABI 안정성

Pimpl은 **헤더 안정성** 보장 — 사용자 코드 재컴파일 안 해도 Impl 변경 가능 (다른 객체 크기여도, 다른 멤버여도).

→ **라이브러리 ABI 안정성**에 매우 유리. Qt의 Q_DECLARE_PRIVATE / d-pointer가 이 패턴.

## 핵심 정리

1. **Pimpl + `unique_ptr<Impl>`** 조합에서 특수 멤버 **선언은 헤더, 정의는 .cpp**
2. 이유: `unique_ptr`의 소멸자는 완전 타입을 요구
3. **move + copy도 동일** — `.cpp`에서 `= default` 또는 직접 구현
4. `shared_ptr<Impl>`은 type-erased deleter라 헤더 OK (그러나 의미 다름)
5. 라이브러리 헤더에 매우 유용 — ABI 안정성

## 관련 항목

- [항목 17: 특수 멤버 자동 생성](/blog/programming/cpp/effective-modern-cpp/item17-understand-special-member-function-generation) — 자동 생성 규칙
- [항목 18: unique_ptr](/blog/programming/cpp/effective-modern-cpp/item18-use-unique-ptr-for-exclusive-ownership)
- [항목 19: shared_ptr](/blog/programming/cpp/effective-modern-cpp/item19-use-shared-ptr-for-shared-ownership) — type-erased deleter
