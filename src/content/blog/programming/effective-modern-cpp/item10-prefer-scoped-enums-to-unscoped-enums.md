---
title: "항목 10: 범위 없는 enum보다 범위 있는 enum을 선호하라"
date: 2025-01-06T13:00:00
description: "enum class가 unscoped enum보다 안전하고 모듈화에 유리한 이유."
tags: [C++, Enum, Modern C++]
series: "Effective Modern C++"
seriesOrder: 10
draft: true
---

> **초안** — 정리 진행 중

## 개요

C++11의 `enum class`(scoped enum)는 unscoped enum의 세 가지 문제 — **이름 오염**, **암묵적 정수 변환**, **전방 선언 불가**를 모두 해결합니다.

## 문제 1: 이름 오염

```cpp
// unscoped
enum Color { black, white, red };
auto white = false;   // 에러! white는 이미 enum 값
```

scoped enum은 enum 이름 안에 갇혀 있습니다.

```cpp
enum class Color { black, white, red };
auto white = false;          // OK
Color c = Color::white;      // 명시적 자격 필요
```

## 문제 2: 암묵적 정수 변환

```cpp
enum Color { black, white, red };

Color c = red;
if (c < 14.5) { /* ... */ }   // OK?! Color → double
```

scoped enum은 변환되지 않습니다.

```cpp
enum class Color { black, white, red };

Color c = Color::red;
if (c < 14.5) { /* ... */ }      // 에러
if (static_cast<int>(c) < 14) {} // 명시적 변환만 허용
```

## 문제 3: 전방 선언

unscoped enum은 기본 underlying type이 결정되지 않아 전방 선언이 어렵습니다.

```cpp
enum Color;                     // 보통 에러 (C++11 전엔 불가)
enum Color : std::uint8_t;      // OK — underlying type 명시 시
```

scoped enum은 underlying type 기본값(`int`)이 정해져 있어 자유롭게 전방 선언 가능합니다.

```cpp
enum class Status;                       // OK — underlying type 기본 int
enum class Status : std::uint32_t;       // 명시도 가능
```

전방 선언이 가능하면 헤더에 enum 정의를 노출하지 않고도 사용 가능 → **컴파일 의존성 감소**.

## unscoped가 유용한 경우

`std::tuple` 인덱싱처럼 정수 변환이 의도된 자리에서는 unscoped가 편합니다.

```cpp
using UserInfo = std::tuple<std::string, std::string, std::size_t>;
enum UserInfoFields { uiName, uiEmail, uiReputation };

UserInfo info = ...;
auto val = std::get<uiEmail>(info);   // 자동 정수 변환 — 깔끔
```

scoped enum이라면 매번 `static_cast` 필요. (C++14 `std::get`이 컴파일 타임 캐스팅 헬퍼와 함께라면 줄어들지만 여전히 verbose.)

## 핵심 정리

1. `enum class`는 이름 오염 방지, 정수 변환 방지, 전방 선언 가능
2. 기본으로 `enum class`를 쓰고, 정수 변환이 의도된 특수 케이스만 unscoped
3. underlying type을 `: T` 문법으로 명시 가능 (C++11 이후 양쪽 다)
