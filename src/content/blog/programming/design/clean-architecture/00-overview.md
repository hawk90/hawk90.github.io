---
title: "Clean Architecture — 시리즈 개요"
date: 2026-06-01T00:00:00
description: "Uncle Bob의 아키텍처 가이드. SOLID, 컴포넌트, 경계 — 변경에 친화적 시스템을 어떻게 짓는가."
tags: [Architecture, CleanArchitecture, SoftwareEngineering, Series]
series: "Clean Architecture"
seriesOrder: 0
---

## 책 소개

Robert C. Martin (Uncle Bob), *Clean Architecture: A Craftsman's Guide to Software Structure and Design* (Prentice Hall, 2017).

이 책은 한 줄로 요약 가능하다 — **시스템의 구조를 변경 친화적으로 만드는 방법**.

세부적으로는 다음 세 층위가 합쳐진다.

1. **프로그래밍 패러다임** — 구조적, 객체 지향, 함수형이 각각 무엇을 제약하는가
2. **디자인 원칙** — SOLID 5개 원칙이 클래스 수준에서 작동하는 방식
3. **아키텍처** — 컴포넌트 경계, 의존성 방향, 그리고 유명한 Clean Architecture 다이어그램

## 시리즈 구조

책은 6부 34장으로 짜여 있다.

| 부 | 장 | 주제 |
|---|---|---|
| I | 1-2 | 서론 — 디자인 / 두 가치 |
| II | 3-6 | 프로그래밍 패러다임 |
| III | 7-11 | 디자인 원칙 (SOLID) |
| IV | 12-14 | 컴포넌트 원칙 |
| V | 15-29 | 아키텍처 |
| VI | 30-34 | 세부 사항 (DB, Web, Framework) |

## 핵심 메시지

Martin의 메시지는 시리즈 전체에 일관적이다.

- **디자인과 아키텍처는 같다** — 크기만 다른 같은 활동
- **좋은 디자인의 지표는 변경 비용의 일정성**
- **빠르게 가는 유일한 방법은 잘 가는 것** ("The only way to go fast is to go well")
- **세부 사항은 정책 뒤에** — DB, Web, Framework는 모두 detail
- **의존성은 안쪽으로** — 정책은 detail을 모른다

## 시리즈 위상

- C++ Software Design 가이드라인 9(추상화 소유권), 10(아키텍처 문서)이 다룬 영역의 본격 책
- 언어 무관한 원칙 — 예제는 Java/C# 위주지만 C++/Python/JavaScript에도 적용 가능
- 클래스 디자인 → 컴포넌트 → 아키텍처로 줌 아웃하는 구조

## 시리즈 진행 순서

1장부터 순서대로 읽기를 권한다. 각 부는 앞 부의 결론 위에 쌓인다. 특히 III부(SOLID)와 IV부(컴포넌트)는 V부(아키텍처)의 전제다.

다만 V부의 핵심(Ch 22 — The Clean Architecture)만 먼저 보고 싶다면 거기로 점프하는 것도 가능 — 그 한 장이 책 전체의 시각적 요약이다.

## 함께 읽으면 좋은 자료

- [Refactoring (Fowler)](/blog/programming/design/refactoring/ch01) — Evolutionary Design의 실전
- [C++ Software Design (Iglberger)](/blog/programming/cpp/cpp-software-design/guideline01-understand-the-importance-of-software-design) — 같은 정신을 C++ 코드 차원에서
- [Domain-Driven Design (Evans)](/blog/programming/design/domain-driven-design/) — 비즈니스 모델링 차원
- [GoF Design Patterns](/blog/programming/design/gof-design-patterns/) — 클래식 패턴
