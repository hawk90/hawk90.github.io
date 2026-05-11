---
title: "항목 30: perfect forwarding이 실패하는 경우에 익숙해져라"
date: 2025-01-08T17:00:00
description: "보편 참조 + std::forward로도 전달되지 않는 5가지 표현식 패턴."
tags: [C++, Perfect Forwarding, Template, Modern C++]
series: "Effective Modern C++"
seriesOrder: 30
---

## 개요

`template<typename T> void wrap(T&& arg) { f(std::forward<T>(arg)); }` 패턴은 대부분의 인자를 잘 전달하지만, **추론이 실패**하거나 **추론은 되는데 호출이 다르게 되는** 케이스가 있습니다. 이 항목은 5가지 함정.

## 필수 개념: perfect forwarding

> **초보자를 위한 배경 지식**

<br>

```cpp
template<typename T>
void wrapper(T&& arg) {
    f(std::forward<T>(arg));   // arg를 f에 그대로 전달 — 카테고리 보존
}
```

이상적으로는: `wrapper(x)`가 `f(x)`와 정확히 같은 동작.

→ 대부분 OK. 그러나 다음 5가지에서 **실패** 또는 **다른 결과**.

## 1. 중괄호 초기화 리스트 `{}`

```cpp
void f(const std::vector<int>& v);

f({1, 2, 3});            // OK — 직접 호출은 잘 됨 (initializer_list 변환)
wrap({1, 2, 3});         // 에러! T를 추론할 수 없음
```

이유: 템플릿 추론은 `{1, 2, 3}`을 어떤 타입으로 봐야 할지 모름. 직접 호출은 함수 시그니처를 보고 변환하지만, 템플릿은 인자 타입을 먼저 추론.

해결: `auto`로 한 번 받고 넘기기.

```cpp
auto il = {1, 2, 3};   // initializer_list<int>
wrap(il);              // OK
```

또는 명시:
```cpp
wrap(std::vector<int>{1, 2, 3});
```

## 2. `0`, `NULL`을 포인터처럼 사용

```cpp
void f(Widget* p);

f(0);                    // OK — 0이 nullptr로 변환
wrap(0);                 // T = int → f(int) 매칭 안 됨 → 에러
```

→ **`nullptr` 사용** ([항목 8](/blog/programming/effective-modern-cpp/item08-prefer-nullptr-to-0-and-null)).

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

이유: 함수 매개변수 `T&&`는 참조 — 변수의 주소가 필요. `MinVals`가 정의되지 않으면 주소 없음.

해결: 어딘가 정의 추가.

```cpp
// .cpp 어딘가
const std::size_t Widget::MinVals;   // 정의
```

C++17부터 `inline` 변수로 선언 + 정의 일체화:

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

이유: `f`가 단일 함수 아니라 오버로드 집합 — 어느 걸 가리키는지 모름.

해결: 명시적 캐스팅.

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

이유: 비트 필드는 **bit 단위 주소** — 일반 포인터·참조로 못 가리킴.

해결: 일반 변수에 복사.

```cpp
auto length = p.length;   // 일반 uint32_t 복사
wrap(length);             // OK
```

## 통합 우회 패턴 — `auto`로 한 번 받기

위 5가지 함정 모두 비슷한 우회 패턴:

```cpp
// 표현식 → auto로 변수 → wrap
auto x = 그_표현식;
wrap(x);
```

`auto`가 표현식을 일반 객체로 변환 → 보편 참조에 정상 매칭.

## 함정 — 보편 참조의 효율 의문

`wrap` 자체가 always 잘 동작하는 게 아니므로, 진짜 perfect forwarding이 필요한지 검토:

- 단순 함수 호출 wrapping → 보통 inline으로 충분
- 작은 객체 → by-value도 OK
- 큰 객체 + 다양한 카테고리 → forwarding 필요

→ 측정 후 결정.

## 표준 라이브러리에서 활용

`std::make_unique`, `std::make_shared`, `emplace_back` 등 모두 perfect forwarding 사용 — 위 함정에 노출.

```cpp
auto p = std::make_unique<Widget>({1, 2, 3});   // 에러! {} 추론 실패
auto p = std::make_unique<Widget>(1, 2, 3);     // OK — 개별 인자
```

## 함정 검출 — 컴파일 에러 메시지

perfect forwarding 실패는 보통 매우 긴 에러 메시지. 다음 패턴 익히면 진단 빠름:

- `couldn't deduce template argument` → 추론 실패
- `taking address of temporary` → 임시 객체 주소 시도
- `undefined reference to ...` → 정의 없는 static const 멤버 (링크 에러)

## 핵심 정리

1. perfect forwarding은 **거의** 완벽하지만 5가지 함정
2. **`{}` 리스트, `0`/`NULL`, 선언만 된 static const, 오버로드 함수, 비트 필드**
3. 우회 패턴은 모두 같음 — **표현식을 한 번 일반 변수로 받아서 넘기기**
4. `nullptr`, `static_cast`, `auto` 활용
5. C++17 `inline` 변수로 static const 함정 회피

## 관련 항목

- [항목 8: nullptr](/blog/programming/effective-modern-cpp/item08-prefer-nullptr-to-0-and-null)
- [항목 23: move/forward](/blog/programming/effective-modern-cpp/item23-understand-std-move-and-std-forward)
- [항목 24: 보편 참조 식별](/blog/programming/effective-modern-cpp/item24-distinguish-universal-references-from-rvalue-references)
- [항목 27: 오버로딩 대안](/blog/programming/effective-modern-cpp/item27-familiarize-yourself-with-alternatives-to-overloading-on-universal-references)
