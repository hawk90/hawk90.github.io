---
title: "GoF: 23개 패턴 전체 관계 한눈에 보기"
date: 2026-02-05T10:00:00
description: "23개 GoF 패턴이 어떻게 서로 의존·대체·결합되는지 한 장의 다이어그램으로."
tags: [Design Pattern, GoF, Overview]
series: "GoF Design Patterns"
seriesOrder: 24
---

## 개요

GoF 23개 패턴은 독립적으로 존재하지 않습니다. 서로 **사용하거나**, **대체 가능**하거나, **유사한 구조**를 공유합니다. 한 패턴을 다른 패턴 안에서 활용하는 경우도 흔합니다 (예: Abstract Factory 안의 각 메서드는 Factory Method).

아래 다이어그램은 23개 패턴 전체와 그들 사이의 주요 관계를 한 장에 모았습니다. 색은 GoF의 세 카테고리:

- **빨강** — Creational (생성)
- **파랑** — Structural (구조)
- **초록** — Behavioral (행위)

화살표:
- 실선 → **명시적 사용·구성 관계**
- 점선 → **유사 / 대체 가능**

## 다이어그램

![GoF 23개 패턴 관계도](/images/blog/gof/relationships.svg)

[**TikZ 소스 보기**](/images/blog/gof/relationships.tex)

## 주요 관계 분류

### "한 패턴이 다른 패턴을 사용"

- **Abstract Factory → Factory Method** — Abstract Factory의 각 `createXxx()`는 보통 Factory Method
- **Builder → Composite** — Builder가 만드는 결과가 종종 Composite 트리
- **Composite ↔ Iterator** — Iterator는 Composite를 순회하기 위해 자주 사용
- **Composite ↔ Visitor** — Visitor는 Composite 트리에 새 연산을 추가
- **Command → Memento** — Command의 undo가 Memento에 상태 저장
- **Mediator → Observer** — Mediator가 동료들의 변경을 Observer로 받음
- **Visitor → Interpreter** — Interpreter의 AST가 Visitor에 의해 평가됨

### "유사한 구조, 다른 의도"

- **Adapter ↔ Bridge** — 둘 다 인터페이스 분리. Adapter는 사후, Bridge는 사전 설계
- **Adapter ↔ Decorator ↔ Proxy** — 모두 객체 wrapping. 의도가 인터페이스 변환 / 책임 추가 / 접근 제어로 다름
- **Composite ↔ Decorator** — 둘 다 재귀적 객체 구조
- **State ↔ Strategy** — 같은 구조. State는 객체 자체가 전이, Strategy는 외부에서 선택
- **Strategy ↔ Bridge** — 알고리즘 vs 추상-구현 분리

### "서로 대체 가능"

- **Abstract Factory ↔ Builder** — 객체 군 vs 단일 복잡 객체
- **Abstract Factory ↔ Prototype** — 새 인스턴스 vs 등록된 prototype 복제
- **Strategy ↔ Template Method** — composition vs 상속

### "Singleton과 자주 결합"

- ConcreteFactory, State 객체, Strategy 객체 등은 무상태이거나 인스턴스 수가 제한적이라 Singleton/Flyweight으로 구현되는 경우가 많음

### "Flyweight와 자주 결합"

- 다수 객체가 같은 상태를 공유하는 경우 — Composite의 leaf, State 객체, Strategy 객체

## 패턴 선택 가이드 — "비슷해 보일 때"

같은 문제처럼 보이지만 다른 패턴이 답인 경우:

| 비슷한 구조의 패턴 | 무엇이 다른가 |
| --- | --- |
| Adapter vs Decorator | Adapter = 인터페이스 변환 / Decorator = 책임 추가 |
| Decorator vs Proxy | Decorator = 동적 기능 / Proxy = 접근 제어 |
| Strategy vs State | Strategy = 외부 선택 / State = 자체 전이 |
| Strategy vs Template Method | Strategy = composition / Template Method = 상속 |
| Composite vs Decorator | Composite = 부분-전체 / Decorator = 책임 적층 |
| Bridge vs Adapter | Bridge = 사전 분리 / Adapter = 사후 호환 |
| Facade vs Mediator | Facade = 단방향 단순화 / Mediator = 양방향 협력 |
| Command vs Strategy | Command = 요청 자체 / Strategy = 알고리즘 |
| Mediator vs Observer | Mediator = 중앙 협력 / Observer = pub/sub 알림 |

## 학습 순서 추천

처음 GoF를 공부한다면 **개념 의존도가 낮은 것부터**:

1. **Singleton, Factory Method** — 단순한 생성 패턴
2. **Strategy, Template Method, Iterator, Observer** — 매일 마주치는 행위 패턴
3. **Adapter, Decorator, Composite** — 직관적인 구조 패턴
4. **State, Command, Chain of Responsibility** — 상태/요청 처리
5. **Abstract Factory, Builder, Prototype** — 본격적 생성 패턴
6. **Bridge, Facade, Proxy, Flyweight** — 큰 시스템 구조
7. **Mediator, Memento, Interpreter, Visitor** — 고급 행위 패턴

## 모던 C++에서 변형되는 패턴들

C++11+ 기능으로 패턴 자체가 단순해지거나 사라지는 경우:

- **Strategy / Command / Observer** → `std::function` + 람다로 클래스 계층 없이 표현
- **Singleton** → Meyers' Singleton (C++11 thread-safe static)
- **Iterator** → range-for + STL iterator 컨셉
- **Visitor** → `std::variant` + `std::visit` (closed type set인 경우)
- **Prototype** → `std::unique_ptr` + virtual `clone()` 표준 패턴
- **Factory** → `std::make_unique`, `std::make_shared`
- **State** → `std::variant` + state 멤버

## 다이어그램 재생성

`public/images/blog/gof/relationships.tex`에 TikZ 소스가 있어, 수정 후 다음으로 재생성:

```bash
cd public/images/blog/gof
pdflatex relationships.tex
pdftocairo -svg relationships.pdf relationships.svg
```

## 관련 자료

각 패턴 상세는 시리즈의 개별 글 참고:
- Creational: [item 1–5](/blog/programming/gof-design-patterns/item01-abstract-factory)
- Structural: [item 6–12](/blog/programming/gof-design-patterns/item06-adapter)
- Behavioral: [item 13–23](/blog/programming/gof-design-patterns/item13-chain-of-responsibility)
