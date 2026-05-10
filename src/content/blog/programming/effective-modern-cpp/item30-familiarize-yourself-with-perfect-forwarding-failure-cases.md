---
title: "항목 30: perfect forwarding이 실패하는 경우에 익숙해져라"
date: 2025-01-08T17:00:00
description: "보편 참조 + std::forward로도 전달되지 않는 표현식 패턴들."
tags: [C++, Perfect Forwarding, Template, Modern C++]
series: "Effective Modern C++"
seriesOrder: 30
draft: true
---

> **초안** — 정리 진행 중

## 개요

`template<typename T> void wrap(T&& arg) { f(std::forward<T>(arg)); }` 패턴은 대부분의 인자를 잘 전달하지만, **추론이 실패**하거나 **추론은 되는데 호출이 다르게 되는** 케이스가 있습니다.

## 1. 중괄호 초기화 리스트

```cpp
void f(const std::vector<int>& v);

f({1, 2, 3});            // OK — 직접 호출은 잘 됨
wrap({1, 2, 3});         // 에러! T를 추론할 수 없음
```

해결: `auto`로 한 번 받고 넘기기.

```cpp
auto il = {1, 2, 3};
wrap(il);                // OK
```

## 2. `0`, `NULL`을 포인터처럼 사용

```cpp
void f(Widget* p);

f(0);                    // OK — 0이 nullptr로 변환
wrap(0);                 // T = int → f(int) 매칭 안 됨
```

해결: `nullptr` 사용 (항목 8).

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

해결: 어딘가 한 곳에 정의 추가 — `const std::size_t Widget::MinVals;`.

## 4. 오버로드된 함수 / 템플릿 함수

```cpp
void f(int);
void f(double);

void wrap_call(...);
wrap_call(f);            // OK — wrap_call은 오버로드 해석 도움 가능
wrap(f);                 // 에러! T를 추론하지 못함 (어느 f?)
```

해결: 명시적 캐스팅으로 후보 결정.

```cpp
using FT = void(*)(int);
wrap(static_cast<FT>(f));
```

## 5. 비트 필드

```cpp
struct Packet {
    std::uint32_t length : 16;   // 비트 필드
};

void f(std::uint32_t n);

Packet p;
f(p.length);             // OK
wrap(p.length);          // 에러! 비트 필드는 주소를 가질 수 없음
                         // 참조로 받을 수 없음
```

해결: 일반 변수에 복사.

```cpp
auto length = p.length;
wrap(length);
```

## 핵심 정리

1. perfect forwarding은 **거의** 완벽하지만 5가지 함정 존재
2. `{}` 리스트, `0`/`NULL`, 선언만 된 static const, 오버로드 함수, 비트 필드
3. 우회 방법은 모두 같은 패턴 — **표현식을 한 번 일반 변수로 받아서 넘기기**
4. `nullptr`, `static_cast`, `auto` 활용
