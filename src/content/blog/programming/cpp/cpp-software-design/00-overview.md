---
title: "C++ Software Design — 시리즈 개요"
date: 2026-05-13T10:00:00
description: "Klaus Iglberger의 C++ Software Design 39 가이드라인 시리즈 — 모던 C++로 다시 쓰는 디자인 패턴, GoF의 21세기 후속작."
tags: [C++, Software Design, Design Patterns, Modern C++]
series: "C++ Software Design"
seriesOrder: 0
---

## 왜 이 책인가

1994년 *Design Patterns: Elements of Reusable Object-Oriented Software* (Gang of Four, GoF)는 객체 지향 디자인 패턴의 정전이 됐다. 30년이 지나는 동안 C++은 — `std::variant`, `std::function`, `concepts`, value semantics 강조 — 으로 패턴 구현 방식 자체가 바뀌었다. **상속 + virtual + raw pointer** 중심의 GoF 코드는 이제 모던 C++의 자연스러운 모양이 아니다.

Klaus Iglberger의 ***C++ Software Design*** (O'Reilly, 2022)은 이 격차를 메운다. 39개의 **가이드라인**으로:

- "왜 디자인이 중요한가" — 흔히 건너뛰는 1장에 가장 깊이 있는 메시지
- GoF 패턴을 **모던 C++로 재구성**
- **value semantics, type erasure, `std::variant`** 같은 도구를 디자인 패턴과 결합
- **의존성 / 결합도 / 변화 가능성** 이라는 디자인의 본질에 끊임없이 회귀

GoF가 "**어떤 패턴이 있는가**"의 카탈로그라면, Iglberger는 "**왜 그 패턴이 필요한가, 모던 C++에서 어떻게 구현하는가**"의 안내서다.

## 시리즈의 자기 자리매김

이 블로그의 C++ 시리즈 지형:

| 시리즈 | 저자 | 시점 | 초점 |
| --- | --- | --- | --- |
| **Effective C++** (55 items) | Scott Meyers | 2005 (C++98) | 일반 원칙, "이렇게 하라" |
| **Effective Modern C++** (42 items) | Scott Meyers | 2014 (C++11/14) | 모던 도구 활용 |
| **Beautiful C++** (30 items) | Davidson & Gregory | 2021 (C++20) | 가독성, 코어 가이드라인 |
| **GoF Design Patterns** (23 items) | Gang of Four | 1994 | 객체 지향 패턴 카탈로그 |
| **C++ Software Design** (39 guidelines) | Klaus Iglberger | 2022 (C++20) | **이 시리즈** — 모던 디자인 패턴 |

이 시리즈는 — **GoF의 후속작**이자 **Effective Modern C++의 디자인 측면 확장**이다.

## 책의 구조 (11 chapters / 39 guidelines)

### Part I — 디자인의 기초 (Ch 1-3)

```
Ch 1. The Art of Software Design  (Guidelines 1-5)
Ch 2. The Art of Building Abstractions  (Guidelines 6-8)
Ch 3. The Purpose of Design Patterns  (Guidelines 9-14)
```

디자인이란 무엇이며, 왜 중요한가. 패턴이 등장하기 전에 다지는 토대.

### Part II — 모던 디자인 패턴 (Ch 4-10)

```
Ch 4.  Visitor  (15-18)         — 타입 추가 vs 연산 추가
Ch 5.  Strategy & Command  (19-23) — 동작을 객체로
Ch 6.  Adapter, Observer, CRTP  (24-27)
Ch 7.  Bridge, Prototype, External Polymorphism  (28-31)
Ch 8.  Type Erasure  (32-34)    — std::function 같은 패턴
Ch 9.  Decorator  (35-36)
Ch 10. Singleton  (37-38)       — "디자인 패턴이 아니다"
```

각 패턴을 — **GoF의 정의 + 모던 C++ 구현 + 트레이드오프** 로 다룬다. `std::variant` Visitor, value-based Strategy, CRTP mixin, type erasure로 vtable 회피 등.

### Part III — 마무리 (Ch 11)

```
Ch 11. The Last Guideline (39)
```

## 핵심 메시지 — 책의 4가지 큰 주장

### 1. 디자인 = 의존성 관리

> "Coupling and cohesion are the fundamental forces of software design."

좋은 디자인은 — **의존성을 적절히 분리**하고 **변화의 축을 찾아 캡슐화**하는 것. 이 메시지가 시리즈 전반의 backbone.

### 2. Composition > Inheritance

GoF 시대의 "상속으로 모든 것"에서 — Iglberger는 **composition** + **value semantics**로 거의 모든 패턴을 다시 쓴다.

```cpp
// 옛 GoF — 상속
class Shape { virtual void draw() = 0; };
class Circle : public Shape { void draw() override; };

// 모던 — value semantics + std::variant
using Shape = std::variant<Circle, Square, Triangle>;
std::visit([](const auto& s) { s.draw(); }, shape);
```

### 3. Value Semantics

레퍼런스 / 포인터 / 가상 함수 대신 — **값을 다루는 디자인**. `std::function`, `std::variant`, `std::any`는 모두 type erasure를 통해 값 의미론 + 다형성을 동시에 제공.

### 4. "변화를 위한 디자인"

> "Design for what is going to change."

가이드라인 2(Design for Change), 4(Design for Testability), 5(Design for Extension), 15(Design for Addition) — 책 전체가 "**미래의 변경**" 관점.

## 어떻게 읽으면 좋은가

각 가이드라인을 — **GoF / Effective 시리즈의 항목과 연결해서** 읽는 것을 추천. 동일 패턴이 시대에 따라 어떻게 진화했는지:

- **GoF Visitor** → Iglberger 가이드라인 16-18 (`std::variant` 활용)
- **GoF Strategy** → 가이드라인 19-23 (value-based Strategy)
- **GoF Bridge** → 가이드라인 28-29 (PIMPL과의 관계)
- **GoF Singleton** → 가이드라인 37-38 ("디자인 패턴 아님" 주장)

이 시리즈의 각 가이드라인 끝에 — GoF / EC++ / EMC++ / Beautiful의 해당 항목으로 **크로스 링크**.

## 책의 강점과 약점

### 강점

- **모던 C++ 코드** — C++20 `concept`, `std::variant`, value semantics 풍부
- **트레이드오프 강조** — "이 패턴은 좋다"가 아니라 "**언제 좋고 언제 나쁜가**"
- **현실적 예제** — toy example이 아닌 production-quality 코드
- **저자의 의견 명확** — 단순 카탈로그가 아닌 의견 있는 안내서

### 약점

- **분량이 큼** — 한 가이드라인이 20-30 페이지인 경우 多
- **전제 지식** — 모던 C++ (C++17+) 익숙해야 자연스러움
- **저자 의견이 강함** — 동의 안 하는 부분이 있을 수 있음 (예: type erasure 적용 범위)

## 이 시리즈 사용법

각 가이드라인 글은 — **책의 요약이 아니다**. Iglberger의 메시지를 한국어로 옮기되:

1. **핵심 원칙**을 그대로 옮김
2. **모던 C++ 코드 예제**를 책의 의도대로 + 일부 단순화
3. **GoF / Effective 시리즈와의 비교** 추가
4. **흔한 함정 / 트레이드오프**를 실무 관점으로 정리
5. **한국 개발 환경의 컨텍스트** (임베디드, 모바일 등) 일부 반영

책 자체를 읽는 게 가장 좋고 — 이 시리즈는 그 **여정의 동반자** 또는 **빠른 참조**.

## 작성 순서

```
Part I (Ch 1-3, guidelines 1-14)
  ├── 디자인의 토대 — 가장 깊이 있는 부분
  └── 이 토대 없이 Part II 패턴이 의미 X

Part II (Ch 4-10, guidelines 15-38)
  ├── 각 패턴 — GoF와 비교하며
  └── 모던 C++ 도구로 재구성

Part III (Ch 11, guideline 39)
  └── 시리즈 마무리
```

총 39 가이드라인 + 본 overview = **40개 글**.

## 시작 — 가이드라인 1로

다음 글: **[가이드라인 1: 소프트웨어 디자인의 중요성을 이해하라](/blog/programming/cpp/cpp-software-design/guideline01-understand-the-importance-of-software-design)**

## 관련 시리즈

- **[GoF Design Patterns](/blog/programming/gof-design-patterns)** — 1994년의 정전
- **[Effective Modern C++](/blog/programming/effective-modern-cpp)** — Iglberger가 전제하는 C++11/14 도구들
- **[Beautiful C++](/blog/programming/beautiful-cpp)** — Core Guidelines 기반 모던 스타일
- **[Effective C++](/blog/programming/effective-cpp)** — C++ 디자인의 일반 원칙
