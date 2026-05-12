---
title: "항목 20: 단순 열거형보다는 클래스 열거형을 택하라"
date: 2026-05-09T19:00:00
description: "enum class가 주는 스코프와 타입 안전성"
tags: [C++, Enums, Type Safety]
series: "Beautiful C++"
seriesOrder: 20
draft: false
---


## 핵심 내용

- C 스타일 `enum`은 **이름이 둘러싼 스코프로 새어 나온다** → 이름 충돌 빈발
- `enum`은 **암시적으로 정수로 변환**된다 → 의도치 않은 산술·비교 가능
- `enum class`(C++11)는 두 문제를 모두 해결한다: 스코프 안에 갇히고, 정수 변환은 명시적이어야 한다
- 기반 타입을 명시할 수 있어 **ABI/직렬화에도 안전**: `enum class Color : uint8_t`

## 예제 코드

```cpp
// Bad: 일반 enum
enum Color  { Red, Green, Blue };
enum Status { Red, OK };          // 컴파일 에러! Red 충돌

int x = Red + 1;                  // 정수처럼 연산 가능 — 보통 의도가 아님

// Good: enum class
enum class Color  : uint8_t { Red, Green, Blue };
enum class Status : uint8_t { Red, OK };   // 충돌 없음

Color c = Color::Red;
// int x = c + 1;                 // 컴파일 에러 — 명시적 변환 필요
int x = static_cast<int>(c) + 1;
```

## 정리

`enum class`는 **스코프와 타입 안전성**을 동시에 준다. 새 코드에서 일반 `enum`을 쓸 이유는 거의 없다.
