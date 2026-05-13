---
title: "C++ Software Design — 시리즈 개요"
date: 2026-05-13T10:00:00
description: "Klaus Iglberger의 39 가이드라인. 모던 C++로 다시 쓰는 디자인 패턴, GoF의 21세기 후속작."
tags: [C++, Software Design, Design Patterns, Modern C++]
series: "C++ Software Design"
seriesOrder: 0
---

## 왜 이 책인가

1994년에 나온 *Design Patterns: Elements of Reusable Object-Oriented Software*(Gang of Four, 줄여서 GoF)는 객체 지향 디자인 패턴의 정전이 되었다. 그 사이 30년이 지나는 동안 C++은 크게 바뀌었다. `std::variant`, `std::function`, concepts, 값 의미론 같은 도구가 들어오면서 패턴을 구현하는 방식 자체가 달라졌다. 상속과 가상 함수와 raw pointer 중심이던 GoF 코드는 더 이상 모던 C++의 자연스러운 모양이 아니다.

Klaus Iglberger의 ***C++ Software Design***(O'Reilly, 2022)이 바로 이 간격을 메운다. 책은 39개의 가이드라인으로 다음을 다룬다.

- 흔히 건너뛰기 쉬운 "왜 디자인이 중요한가"를 1장부터 깊이 있게 짚는다.
- GoF 패턴을 모던 C++로 다시 구성한다.
- 값 의미론, type erasure, `std::variant` 같은 도구를 디자인 패턴과 결합한다.
- 의존성, 결합도, 변화 가능성이라는 디자인의 본질로 끊임없이 돌아온다.

GoF가 "어떤 패턴이 있는가"를 정리한 카탈로그라면, Iglberger의 책은 "왜 그 패턴이 필요하고, 모던 C++에서 어떻게 구현하는가"를 안내하는 책이다.

## 시리즈의 자리

이 블로그의 C++ 시리즈들을 한 표로 정리하면 다음과 같다.

| 시리즈 | 저자 | 시점 | 초점 |
| --- | --- | --- | --- |
| **Effective C++** (55 items) | Scott Meyers | 2005 (C++98) | 일반 원칙, "이렇게 하라" |
| **Effective Modern C++** (42 items) | Scott Meyers | 2014 (C++11/14) | 모던 도구 활용 |
| **Beautiful C++** (30 items) | Davidson & Gregory | 2021 (C++20) | 가독성, Core Guidelines |
| **GoF Design Patterns** (23 items) | Gang of Four | 1994 | 객체 지향 패턴 카탈로그 |
| **C++ Software Design** (39 guidelines) | Klaus Iglberger | 2022 (C++20) | **이 시리즈** — 모던 디자인 패턴 |

위치로 보면 이 시리즈는 GoF의 후속작이자, Effective Modern C++의 디자인 측면을 확장한 자리에 있다.

## 책의 구조 — 11장 / 39 가이드라인

### Part I — 디자인의 기초 (Ch 1-3)

```
Ch 1. The Art of Software Design          (Guidelines 1-5)
Ch 2. The Art of Building Abstractions    (Guidelines 6-8)
Ch 3. The Purpose of Design Patterns      (Guidelines 9-14)
```

디자인이란 무엇이며, 왜 중요한가. 패턴이 등장하기 전에 다지는 토대다.

### Part II — 모던 디자인 패턴 (Ch 4-10)

```
Ch 4.  Visitor              (15-18)   — 타입 추가 vs 연산 추가
Ch 5.  Strategy & Command   (19-23)   — 동작을 객체로
Ch 6.  Adapter, Observer, CRTP   (24-27)
Ch 7.  Bridge, Prototype, External Polymorphism   (28-31)
Ch 8.  Type Erasure         (32-34)   — std::function 같은 패턴
Ch 9.  Decorator            (35-36)
Ch 10. Singleton            (37-38)   — "디자인 패턴이 아니다"
```

각 패턴을 GoF의 정의, 모던 C++ 구현, 그리고 트레이드오프 세 측면에서 다룬다. `std::variant`로 구현한 Visitor, 값 기반 Strategy, CRTP 믹스인, type erasure로 vtable을 회피하는 방법 같은 이야기가 이어진다.

### Part III — 마무리 (Ch 11)

```
Ch 11. The Last Guideline (39)
```

## 핵심 메시지 — 네 가지 큰 주장

### 1. 디자인은 의존성 관리다

> "Coupling and cohesion are the fundamental forces of software design."

좋은 디자인은 의존성을 적절히 분리하고 변화의 축을 찾아 캡슐화하는 일이다. 이 한 문장이 시리즈 전체를 지탱하는 척추다.

### 2. Composition > Inheritance

GoF 시대의 "상속으로 모든 것"이라는 사고를 두고, Iglberger는 composition과 값 의미론으로 거의 모든 패턴을 다시 쓴다.

```cpp
// 옛 GoF — 상속
class Shape { virtual void draw() = 0; };
class Circle : public Shape { void draw() override; };

// 모던 — 값 의미론 + std::variant
using Shape = std::variant<Circle, Square, Triangle>;
std::visit([](const auto& s) { s.draw(); }, shape);
```

### 3. 값 의미론

레퍼런스, 포인터, 가상 함수 대신 값을 다루는 디자인을 권한다. `std::function`, `std::variant`, `std::any`는 모두 type erasure를 활용해 값 의미론과 다형성을 동시에 제공한다.

### 4. 변화를 위한 디자인

> "Design for what is going to change."

가이드라인 2(Design for Change), 4(Design for Testability), 5(Design for Extension), 15(Design for Addition)가 보여주듯, 책 전체가 미래의 변경을 염두에 두고 흐른다.

## 어떻게 읽으면 좋은가

각 가이드라인을 GoF나 Effective 시리즈의 해당 항목과 짝지어 읽기를 권한다. 같은 패턴이 시대에 따라 어떻게 진화했는지가 자연스럽게 드러난다.

- **GoF Visitor** ↔ 가이드라인 16-18 (`std::variant` 활용)
- **GoF Strategy** ↔ 가이드라인 19-23 (값 기반 Strategy)
- **GoF Bridge** ↔ 가이드라인 28-29 (PIMPL과의 관계)
- **GoF Singleton** ↔ 가이드라인 37-38 ("디자인 패턴 아님"이라는 주장)

각 가이드라인 글 끝에는 GoF, Effective C++, Effective Modern C++, Beautiful C++의 해당 항목으로 가는 크로스 링크를 달아 둔다.

## 책의 강점과 약점

### 강점

- **모던 C++ 코드** — C++20의 concept, `std::variant`, 값 의미론을 풍부하게 쓴다.
- **트레이드오프 강조** — "이 패턴은 좋다"가 아니라 "언제 좋고 언제 나쁜가"를 다룬다.
- **현실적인 예제** — 장난감 예제가 아니라 실무에서 쓸 만한 코드를 보여 준다.
- **저자의 의견이 분명** — 단순 카탈로그가 아닌, 견해가 있는 안내서다.

### 약점

- **분량이 크다** — 가이드라인 하나가 20~30쪽인 경우가 많다.
- **전제 지식이 높다** — 모던 C++(C++17 이후)에 어느 정도 익숙해야 자연스럽게 따라갈 수 있다.
- **의견이 강하다** — 동의하기 어려운 부분도 생긴다(예: type erasure를 어디까지 밀어붙일지).

## 이 시리즈를 쓰는 방식

각 가이드라인 글은 책의 요약이 아니다. Iglberger의 메시지를 한국어로 옮기되 다음 원칙을 따른다.

1. 핵심 원칙은 그대로 옮긴다.
2. 모던 C++ 코드 예제는 책의 의도를 유지하되 일부 단순화한다.
3. GoF / Effective 시리즈와의 비교를 덧붙인다.
4. 흔한 함정과 트레이드오프를 실무 관점으로 정리한다.
5. 임베디드, 모바일처럼 한국 개발 환경에서 자주 마주치는 맥락을 일부 반영한다.

책 자체를 읽는 것이 가장 좋다. 이 시리즈는 그 여정의 동반자, 혹은 빠른 참조용 노트라고 보면 된다.

## 작성 순서

```
Part I (Ch 1-3, guidelines 1-14)
  ├── 디자인의 토대 — 가장 깊이 있는 부분
  └── 이 토대 없이는 Part II 패턴이 의미를 못 가진다

Part II (Ch 4-10, guidelines 15-38)
  ├── 각 패턴을 GoF와 비교하며
  └── 모던 C++ 도구로 다시 구성

Part III (Ch 11, guideline 39)
  └── 시리즈 마무리
```

총 39 가이드라인에 본 개요를 더해 **40개 글**로 구성된다.

## 시작 — 가이드라인 1로

다음 글: **[가이드라인 1: 소프트웨어 디자인의 중요성을 이해하라](/blog/programming/cpp/cpp-software-design/guideline01-understand-the-importance-of-software-design)**

## 관련 시리즈

- **[GoF Design Patterns](/blog/programming/design/gof-design-patterns)** — 1994년의 정전
- **[Effective Modern C++](/blog/programming/cpp/effective-modern-cpp)** — Iglberger가 전제하는 C++11/14 도구들
- **[Beautiful C++](/blog/programming/cpp/beautiful-cpp)** — Core Guidelines 기반 모던 스타일
- **[Effective C++](/blog/programming/cpp/effective-cpp)** — C++ 디자인의 일반 원칙
