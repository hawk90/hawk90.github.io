---
title: "항목 25: 프로그램은 최대한 정적으로 타입에 안전해야 한다"
date: 2026-05-10T14:00:00
description: "타입 시스템에 의미를 담아 컴파일러에게 검사를 맡기는 법"
tags: [C++, Type Safety, Strong Types]
series: "Beautiful C++"
seriesOrder: 25
draft: false
---


## 핵심 내용

- **타입 시스템에 더 많은 정보를 담을수록** 컴파일러가 더 많은 버그를 잡아준다
- `void*`, 무차별 캐스트, 원시 정수 ID는 **타입 시스템을 우회**하는 행위다
- 같은 `int`라도 `UserId`와 `OrderId`를 **strong typedef**로 분리하면 혼동이 사라진다
- C 스타일 캐스트 대신 `static_cast`/`dynamic_cast` — 의도가 시그니처에 드러난다
- `std::variant`/`std::optional`로 **"있을 수도 / 없을 수도"를 타입으로 표현**하라

## 예제 코드

```cpp
// Bad: int가 모든 의미를 다 짊어짐
void transfer(int from, int to, int amount);  // 어느 게 from? amount는 음수면?
transfer(amount, fromId, toId);               // 컴파일러는 가만히 있음

// Good: 의미별 타입을 분리
struct AccountId { int value; };
struct Money     { int cents; };

void transfer(AccountId from, AccountId to, Money amount);
// transfer(amount, fromId, toId);  // 컴파일 에러 — 잡아준다

// Bad: nullable인지 시그니처로 모름
Widget* find(std::string_view name);

// Good: optional로 명시
std::optional<Widget> find(std::string_view name);
```

## 정리

런타임 검사보다 **컴파일 타임 검사**가 항상 싸고 안전하다. 의도를 타입으로 적으면 버그가 발생하기 전에 사라진다.
