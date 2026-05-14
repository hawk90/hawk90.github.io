---
title: "항목 30: perfect forwarding이 실패하는 경우에 익숙해져라"
date: 2025-01-06T06:00:00
description: "보편 참조 + std::forward로도 전달되지 않는 5가지 표현식 패턴."
tags: [C++, Perfect Forwarding, Template, Modern C++]
series: "Effective Modern C++"
seriesOrder: 30
draft: true
---

## 왜 이 항목이 중요한가?

`template<typename T> void wrap(T&& arg) { f(std::forward<T>(arg)); }` 패턴은 perfect forwarding의 표준이다. 이 패턴이 거의 모든 인자를 잘 전달하므로 "perfect"라는 이름이 붙었다.

그런데 **5가지 자리에서 실패**한다.

- `{}` 초기화 리스트 → 추론 실패.
- `0`/`NULL` 포인터 → `int`로 추론되어 포인터 매개변수와 매칭 실패.
- 선언만 있는 static const 멤버 → 링크 에러.
- 오버로드된 함수 이름 → 어느 오버로드인지 추론 불가.
- 비트 필드 → 참조로 받을 수 없음.

이 항목은 5가지 함정과 모두에게 통하는 한 가지 우회 패턴 (`auto`로 한 번 받기)을 정리한다.

## 개요

`template<typename T> void wrap(T&& arg) { f(std::forward<T>(arg)); }` 패턴은 대부분의 인자를 잘 전달하지만, **추론이 실패**하거나 **추론은 되는데 호출이 다르게 되는** 케이스가 있다. 이 항목은 5가지 함정을 본다.

## 필수 개념: perfect forwarding

> **초보자를 위한 배경 지식**

<br>

```cpp
template<typename T>
void wrapper(T&& arg) {
    f(std::forward<T>(arg));   // arg를 f에 그대로 전달 — 카테고리 보존
}
```

이상적으로는 `wrapper(x)`가 `f(x)`와 정확히 같은 동작을 해야 한다.

대부분 OK다. 그러나 다음 5가지에서 **실패** 또는 **다른 결과**가 일어난다.

## 1. 중괄호 초기화 리스트 `{}`

```cpp
void f(const std::vector<int>& v);

f({1, 2, 3});            // OK — 직접 호출은 잘 됨 (initializer_list 변환)
wrap({1, 2, 3});         // 에러! T를 추론할 수 없음
```

이유는 이렇다. 템플릿 추론은 `{1, 2, 3}`을 어떤 타입으로 봐야 할지 모른다. 직접 호출은 함수 시그니처를 보고 변환하지만, 템플릿은 인자 타입을 먼저 추론한다.

해결책은 `auto`로 한 번 받고 넘기는 것이다.

```cpp
auto il = {1, 2, 3};   // initializer_list<int>
wrap(il);              // OK
```

또는 명시한다.

```cpp
wrap(std::vector<int>{1, 2, 3});
```

## 2. `0`, `NULL`을 포인터처럼 사용

```cpp
void f(Widget* p);

f(0);                    // OK — 0이 nullptr로 변환
wrap(0);                 // T = int → f(int) 매칭 안 됨 → 에러
```

**`nullptr` 사용**이 답이다 ([항목 8](/blog/programming/cpp/effective-modern-cpp/item08-prefer-nullptr-to-0-and-null)).

```cpp
wrap(nullptr);   // T = nullptr_t → f(Widget*) OK
```

## 3. 선언만 있는 정적 const 멤버

```cpp
class Widget {
public:
    static const std::size_t MinVals = 28;   // 선언 + 초기치 (정의 X)
};

void f(std::size_t n);

f(Widget::MinVals);      // OK — 보통 inline 처리됨
wrap(Widget::MinVals);   // 링크 에러! 참조로 받으려 하니 주소 필요
                         // 하지만 정의가 없음
```

이유는 이렇다. 함수 매개변수 `T&&`는 참조라 변수의 주소가 필요하다. `MinVals`가 정의되지 않으면 주소가 없다.

해결책은 어딘가에 정의를 추가하는 것이다.

```cpp
// .cpp 어딘가
const std::size_t Widget::MinVals;   // 정의
```

C++17부터는 `inline` 변수로 선언과 정의를 일체화할 수 있다.

```cpp
class Widget {
public:
    static inline const std::size_t MinVals = 28;   // C++17
};
```

## 4. 오버로드된 함수 / 템플릿 함수

```cpp
void f(int);
void f(double);

void wrap_call(...);
wrap_call(f);            // OK — wrap_call은 오버로드 해석 도움 가능 (C 가변)
wrap(f);                 // 에러! T를 추론하지 못함 (어느 f?)
```

이유는 이렇다. `f`가 단일 함수가 아니라 오버로드 집합이라 어느 걸 가리키는지 모른다.

해결책은 명시적 캐스팅이다.

```cpp
using FT = void(*)(int);
wrap(static_cast<FT>(f));   // f(int)로 결정
```

## 5. 비트 필드

```cpp
struct Packet {
    std::uint32_t length : 16;   // 비트 필드
    std::uint32_t type   : 4;
};

void f(std::uint32_t n);

Packet p;
f(p.length);             // OK
wrap(p.length);          // 에러! 비트 필드는 주소를 가질 수 없음
                         // 참조로 받을 수 없음
```

이유는 이렇다. 비트 필드는 **bit 단위 주소**라 일반 포인터·참조로 못 가리킨다.

해결책은 일반 변수에 복사하는 것이다.

```cpp
auto length = p.length;   // 일반 uint32_t 복사
wrap(length);             // OK
```

## 통합 우회 패턴 — `auto`로 한 번 받기

위 5가지 함정 모두 비슷한 우회 패턴이 통한다.

```cpp
// 표현식 → auto로 변수 → wrap
auto x = 그_표현식;
wrap(x);
```

`auto`가 표현식을 일반 객체로 변환한다. 보편 참조에 정상 매칭된다.

## 함정 — 보편 참조의 효율 의문

`wrap` 자체가 always 잘 동작하는 게 아니므로, 진짜 perfect forwarding이 필요한지 검토해야 한다.

- 단순 함수 호출 wrapping → 보통 inline으로 충분하다.
- 작은 객체 → by-value도 OK다.
- 큰 객체 + 다양한 카테고리 → forwarding이 필요하다.

측정 후 결정한다.

## 표준 라이브러리에서 활용

`std::make_unique`, `std::make_shared`, `emplace_back` 등 모두 perfect forwarding을 사용한다. 위 함정에 노출된다.

```cpp
auto p = std::make_unique<Widget>({1, 2, 3});   // 에러! {} 추론 실패
auto p = std::make_unique<Widget>(1, 2, 3);     // OK — 개별 인자
```

## 함정 검출 — 컴파일 에러 메시지

perfect forwarding 실패는 보통 매우 긴 에러 메시지를 낸다. 다음 패턴을 익히면 진단이 빨라진다.

- `couldn't deduce template argument` → 추론 실패.
- `taking address of temporary` → 임시 객체 주소 시도.
- `undefined reference to ...` → 정의 없는 static const 멤버 (링크 에러).

## 핵심 정리

1. perfect forwarding은 **거의** 완벽하지만 5가지 함정이 있다.
2. **`{}` 리스트, `0`/`NULL`, 선언만 된 static const, 오버로드 함수, 비트 필드**다.
3. 우회 패턴은 모두 같다. **표현식을 한 번 일반 변수로 받아서 넘긴다**.
4. `nullptr`, `static_cast`, `auto`를 활용한다.
5. C++17 `inline` 변수로 static const 함정을 회피할 수 있다.

## 관련 항목

- [항목 8: nullptr](/blog/programming/cpp/effective-modern-cpp/item08-prefer-nullptr-to-0-and-null)
- [항목 23: move/forward](/blog/programming/cpp/effective-modern-cpp/item23-understand-std-move-and-std-forward)
- [항목 24: 보편 참조 식별](/blog/programming/cpp/effective-modern-cpp/item24-distinguish-universal-references-from-rvalue-references)
- [항목 27: 오버로딩 대안](/blog/programming/cpp/effective-modern-cpp/item27-familiarize-yourself-with-alternatives-to-overloading-on-universal-references)
