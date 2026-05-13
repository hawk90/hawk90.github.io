---
title: "Google C++ Style — 시리즈 개요"
date: 2025-05-13T00:00:00
description: "Google C++ Style Guide — 원문 전체를 10장으로 정리. Optimize for the reader, 강한 의견, 단일 코드베이스 일관성."
tags: [Google, C++, Style-Guide, Standards, Series]
series: "Google C++ Style"
seriesOrder: 0
draft: false
---

> Google의 사내 C++ 표준. 십수 년 검증된 — 대규모 코드베이스의 일관성 규칙. 본 시리즈는 [원문 가이드](https://google.github.io/styleguide/cppguide.html)의 모든 절을 10장으로 묶어 정리.

## 위치와 성격

```
MISRA C / C++  ── 안전중요 (자동차)
CERT C / C++   ── 보안 (CVE 예방)
AUTOSAR C++14  ── 자동차 + 모던 C++
High Integrity ── 일반 안전중요

Google C++     ── 대규모 코드베이스의 가독성 / 유지보수
```

다른 표준이 — 안전 / 보안 중심의 *금지*에 가깝다면, Google은 — *읽기 쉬움 / 유지 쉬움* 중심의 *선택*에 가깝다.

## 핵심 원칙

> **Optimize for the reader, not the writer.**

- 코드는 — 쓰는 시간보다 읽는 시간이 길다
- 한 사람의 천재성보다 — 모두의 가독성
- 새로운 기법 도입 — 도입 비용까지 고려
- "내가 이해할 수 있는" 코드보다 — "신참이 이해할 수 있는" 코드

## 시리즈 구성 (원문 매핑)

원문의 모든 절을 — 10개 장으로 묶었다.

### Ch 1 — Background / C++ Version / Magic (메타)
- Background, Goals of the Style Guide
- C++ Version (C++17 / 20 / 23 정책)
- Google-Specific Magic (cpplint)
- 시리즈 전반 / 다른 표준과의 비교

### Ch 2 — Header Files
- Self-contained Headers
- The #define Guard
- Include What You Use
- Forward Declarations
- Inline Functions / Defining Functions in Header Files
- Names and Order of Includes

### Ch 3 — Scoping
- Namespaces (named / unnamed)
- Internal Linkage
- Nonmember, Static Member, and Global Functions
- Local Variables
- Static and Global Variables
- thread_local Variables

### Ch 4 — Classes
- Doing Work in Constructors
- Implicit Conversions
- Copyable and Movable Types
- Structs vs. Classes
- Structs vs. Pairs and Tuples
- Inheritance
- Operator Overloading
- Access Control
- Declaration Order

### Ch 5 — Functions
- Inputs and Outputs (output parameters, return types)
- Write Short Functions
- Function Overloading
- Default Arguments
- Trailing Return Type Syntax

### Ch 6 — Other C++ Features I (Memory / Exceptions / Casting)
- Ownership and Smart Pointers
- Rvalue References
- Friends
- Exceptions (사용 금지의 동기)
- noexcept
- Run-Time Type Information (RTTI)
- Casting
- Streams

### Ch 7 — Other C++ Features II (Constants / Numbers / Macros)
- Preincrement / Predecrement
- Use of const / constexpr / constinit / consteval
- Integer Types
- 64-bit Portability
- Preprocessor Macros
- 0 and nullptr / NULL
- sizeof

### Ch 8 — Type Deduction / Templates / Lambdas / Aliases
- Type Deduction (auto, structured bindings)
- Class Template Argument Deduction
- Lambda Expressions
- Template Metaprogramming
- Concepts and Constraints (C++20)
- Boost
- Other C++ Features (designated initializers 등)
- Aliases (`using`, `typedef`)

### Ch 9 — Naming
- General Naming Rules
- File Names
- Type Names
- Variable Names (멤버 / 정적 멤버 / 글로벌 / 매개변수)
- Constant Names (`kCamelCase`)
- Function Names
- Namespace Names
- Enumerator Names
- Macro Names
- Exceptions to Naming Rules

### Ch 10 — Comments / Formatting / Closing
- Comments — File, Class, Function, Variable, Implementation, TODO, Deprecation
- Formatting — Line length, Spaces vs tabs, Function declarations, Calls, Conditionals, Loops, Pointer / Reference, Return, Init, Preprocessor, Class, Constructor init list, Namespace
- Exceptions to the Rules
- Inclusive Language
- Parting Words

## 의견이 강한 결정들

Google의 스타일은 — 다른 표준과 *다른* 선택이 많다.

```
- 예외 금지 (Ch 6)
- RTTI 제한 (Ch 6)
- Implicit conversion 금지 → explicit (Ch 4)
- 다중 상속 — 인터페이스만 (Ch 4)
- 매크로 회피 (Ch 7)
- 스트림 — 사용자 입출력에만 (Ch 6)
```

이유는 대부분 — *기존 코드와의 호환 / 거대 코드베이스의 부담*. 새 기능을 안 쓰는 것이 아니라 — 도입 비용까지 본다.

## 명명 규칙 미리보기

```
Type:       PascalCase    (MyClass, MyEnum)
Variable:   snake_case    (my_var, table_name)
Member:     snake_case_   (my_var_)
Constant:   kCamelCase    (kDaysInWeek)
Function:   PascalCase    (DoWork, GetCount)
Namespace:  snake_case    (utility, my_app)
File:       snake_case.cc (my_file.cc, my_file.h)
```

자세한 — Ch 9.

## 적용 대상

```
잘 맞음:
- 거대한 코드베이스 (모놀리식)
- 신규 인원 유입이 많은 팀
- 기존 코드에 예외가 거의 없음

덜 맞음:
- 안전중요 / 인증 필요 (MISRA / AUTOSAR가 우선)
- 보안 중심 (CERT가 우선)
- 모던 C++ 적극 활용 (예외 / RTTI 등 필수)
```

## 관련 항목

- [원문 — Google C++ Style Guide](https://google.github.io/styleguide/cppguide.html)
- [CERT C — 시리즈 개요](/blog/embedded/standards/cert-c/00-overview)
- [AUTOSAR C++14 — 시리즈 개요](/blog/embedded/standards/autosar-cpp/00-overview)
