---
title: "항목 19: 출력값을 여러 개로 반환하려면 구조체로 반환하라"
date: 2026-05-10T10:00:00
description: "out 파라미터·tuple 대신 이름 있는 구조체와 구조적 바인딩"
tags: [C++, Function Design, Structured Bindings]
series: "Beautiful C++"
seriesOrder: 19
draft: true
---


## 핵심 내용

- out 파라미터(`int& out`)는 호출부에서 **무엇이 입력이고 무엇이 출력인지** 알 수 없다
- 여러 값을 묶어 반환하려면 **이름이 있는 구조체**가 가장 명확하다
- `std::pair`/`std::tuple`은 짧지만 `.first`/`std::get<0>`이 의미를 잃게 한다
- C++17 구조적 바인딩과 결합하면 호출부도 깔끔해진다
- 반환 비용이 걱정되면 **NRVO/이동**이 처리해 준다

## 예제 코드

```cpp
// Bad: out 파라미터 — 호출부에서 의도가 안 보임
void divide(int a, int b, int& quotient, int& remainder);

int q, r;
divide(17, 5, q, r);  // q,r이 입력인지 출력인지?

// OK but: pair — 의미 없는 .first/.second
std::pair<int, int> divide(int a, int b);
auto p = divide(17, 5);
use(p.first);  // 몫? 나머지?

// Good: 이름이 있는 구조체 + 구조적 바인딩
struct DivResult { int quotient; int remainder; };
DivResult divide(int a, int b) { return {a / b, a % b}; }

auto [q, r] = divide(17, 5);   // 의도가 명확
```

## 정리

여러 값을 돌려줄 때는 **타입에 이름**을 붙여라. `pair`/`tuple`은 임시방편, **구조체 반환 + 구조적 바인딩**이 현대 C++의 정석이다.
