---
title: "항목 22: Pimpl 관용구 사용 시 특수 멤버 함수는 구현 파일에 정의하라"
date: 2025-01-07T14:00:00
description: "Pimpl + unique_ptr 조합에서 incomplete type 에러를 회피하는 정확한 패턴."
tags: [C++, Pimpl, unique_ptr, Compilation, Modern C++]
series: "Effective Modern C++"
seriesOrder: 22
---

## 왜 이 항목이 중요한가?

Pimpl 관용구는 라이브러리 헤더에서 가장 자주 보는 패턴이다. 멤버를 포인터 뒤로 숨겨서 헤더 의존성을 줄이고, ABI 안정성까지 확보한다.

C++11에서 `std::unique_ptr<Impl>`을 쓰면 raw pointer + 수동 delete가 깔끔하게 사라진다. 다만 한 가지 함정이 있다.

**`~Widget() = default;`를 헤더에 적으면 컴파일 에러가 난다.**

이유는 `unique_ptr`의 소멸자가 인스턴스화되려면 Impl이 완전 타입이어야 하는데, 헤더 시점에는 Impl이 incomplete이기 때문이다. 더 미묘한 건 [항목 17](/blog/programming/cpp/effective-modern-cpp/item17-understand-special-member-function-generation)과 결합되어 move 자동 생성까지 막힌다는 점이다.

이 항목은 다음을 정리한다.

- Pimpl + unique_ptr 조합에서 특수 멤버를 .cpp에 정의해야 하는 이유.
- 소멸자, move, copy 5개 모두 헤더 선언 + .cpp 정의 패턴.
- `shared_ptr<Impl>`이면 왜 헤더에 default가 가능한지 (그러나 의미는 다르다).

## 개요

**Pimpl**(Pointer to Implementation)은 구현 세부를 헤더에서 숨겨 컴파일 의존성을 줄이는 관용구다. C++11 이전엔 raw pointer + 수동 delete였지만 모던에선 `std::unique_ptr`로 깔끔해진다. 단 **특수 멤버 함수의 정의 위치**에 함정이 있다.

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

`Widget.h`를 include하는 모든 파일은 `string`, `Date.h`, `Address.h`까지 모두 컴파일해야 한다. `Date.h`가 바뀌면 **모든 의존 파일이 재컴파일**된다.

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

**헤더 의존성이 줄어들고**, 컴파일 시간이 줄어든다.

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

`unique_ptr<Impl>`은 소멸 시점에 **`Impl`의 완전한 타입 정의**가 필요하다. 소멸자 호출을 위해서다.

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

`unique_ptr<Impl>`의 소멸자를 인스턴스화하려면 Impl이 완전 타입이어야 한다. 헤더만 보면 incomplete다.

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

**사용자 코드에서 소멸자 호출 시 Widget.cpp의 정의가 사용**된다. Impl이 완전 타입이라 OK다.

## move 연산도 마찬가지

`unique_ptr` 자체는 move 가능이지만, **move 연산도 구버전 객체의 소멸을 호출**한다. 같은 함정이다.

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

[항목 17](/blog/programming/cpp/effective-modern-cpp/item17-understand-special-member-function-generation)에 따르면 사용자 정의 소멸자는 move 자동 생성을 막는다. 그러므로 **소멸자 + move 모두 명시**해야 한다.

## copy도 필요하면

`unique_ptr`는 복사 불가다. 직접 정의가 필요하다.

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

`shared_ptr<Impl>`은 **deleter가 type-erased**라 ([항목 19](/blog/programming/cpp/effective-modern-cpp/item19-use-shared-ptr-for-shared-ownership)) incomplete type에서도 문제가 없다.

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

다만 **shared 의미 변화에 주의**가 필요하다. Pimpl 객체가 다른 곳과 Impl을 공유하는가? 보통 의미가 없다.

**unique_ptr가 표준이고 Pimpl 의도와도 일치**한다.

## 컴파일 시간 절감 효과

큰 헤더 의존성을 가진 클래스에 Pimpl을 적용하면 다음과 같은 효과가 있다.

- 의존 파일 수가 감소한다.
- 부분 재컴파일 시 영향이 줄어든다.
- 인터페이스 안정성이 올라간다 (멤버 변경이 ABI를 안 깨뜨린다).

**라이브러리 헤더**에 특히 유리하다.

## 함정 정리

| 함정 | 해결 |
| --- | --- |
| `unique_ptr<Impl>` + 헤더에 `~Widget() = default` | .cpp로 |
| 동시에 move 자동 생성 막힘 | move도 명시 + .cpp로 |
| copy 자동 생성 X | 명시 + Impl 복사 |
| `shared_ptr<Impl>`이면 헤더 OK | 그러나 의미 다름 |

## ABI 안정성

Pimpl은 **헤더 안정성**을 보장한다. 사용자 코드를 재컴파일하지 않아도 Impl 변경이 가능하다 (다른 객체 크기여도, 다른 멤버여도).

**라이브러리 ABI 안정성**에 매우 유리하다. Qt의 Q_DECLARE_PRIVATE / d-pointer가 이 패턴이다.

## 핵심 정리

1. **Pimpl + `unique_ptr<Impl>`** 조합에서 특수 멤버 **선언은 헤더, 정의는 .cpp**다.
2. 이유는 `unique_ptr`의 소멸자가 완전 타입을 요구하기 때문이다.
3. **move + copy도 동일**하다. `.cpp`에서 `= default` 또는 직접 구현한다.
4. `shared_ptr<Impl>`은 type-erased deleter라 헤더 OK다 (그러나 의미가 다르다).
5. 라이브러리 헤더에 매우 유용하다. ABI 안정성이 확보된다.

## 관련 항목

- [항목 17: 특수 멤버 자동 생성](/blog/programming/cpp/effective-modern-cpp/item17-understand-special-member-function-generation) — 자동 생성 규칙
- [항목 18: unique_ptr](/blog/programming/cpp/effective-modern-cpp/item18-use-unique-ptr-for-exclusive-ownership)
- [항목 19: shared_ptr](/blog/programming/cpp/effective-modern-cpp/item19-use-shared-ptr-for-shared-ownership) — type-erased deleter
- [항목 21: `make_*` 함수](/blog/programming/cpp/effective-modern-cpp/item21-prefer-make-unique-and-make-shared-to-direct-new)
