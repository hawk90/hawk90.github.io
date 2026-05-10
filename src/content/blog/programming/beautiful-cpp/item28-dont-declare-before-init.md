---
title: "항목 28: 값을 초기화하기 전까지는 변수를 선언하지 말라"
date: 2026-05-10T10:00:00
description: "선언과 초기화를 분리하는 옛 스타일이 만드는 UB의 위험"
tags: [C++, Initialization, Code Style]
series: "Beautiful C++"
seriesOrder: 28
draft: true
---


## 핵심 내용

- "선언만 먼저, 대입은 나중에"는 C 시절의 잔재다
- 미초기화 변수는 **읽기 시 UB**의 원인이고, 정적 분석기조차 놓치는 경우가 있다
- 변수는 **값을 안 시점**에 선언하면 자연스럽게 초기화와 함께 만들어진다
- 결과적으로 변수 스코프가 좁아지고(아이템 21), 코드 흐름이 더 직선적이 된다
- C++17 구조적 바인딩, `if (auto x = ...; cond)` 등이 이 패턴을 더 쉽게 만들어준다

## 예제 코드

```cpp
// Bad: 미리 선언, 한참 후 대입
std::string name;       // 빈 문자열 — 의미 없는 기본 상태
int age;                // 미초기화 — 읽으면 UB
// ... 30줄 후 ...
name = lookup_name(id);
age  = lookup_age(id);

// Good: 알게 되는 시점에 초기화와 함께 선언
auto name = lookup_name(id);
auto age  = lookup_age(id);

// Even better: 한 번에 받아 구조적 바인딩
auto [name, age] = lookup_user(id);

// if 초기화 절로 스코프까지 좁히기
if (auto user = lookup_user(id); user.is_valid()) {
    use(user);
}
```

## 정리

선언과 초기화는 **한 줄에서**. "나중에 채울게"라는 핑계로 미초기화 변수를 두지 마라 — UB와 읽는 사람의 인지 부담이 동시에 사라진다.
