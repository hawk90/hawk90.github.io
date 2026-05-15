# Clean Architecture — Series Plan

## 책 정보

- 저자: Robert C. Martin (Uncle Bob)
- 출판: Prentice Hall, 2017
- 분량: ~430쪽, 34장, 6부
- 위상: 아키텍처 차원의 "정리된" 책 — 디자인 원칙의 위층

## 시리즈 위상

이전 시리즈와의 관계:
- C++ Software Design 가이드라인 9, 10에서 언급된 **아키텍처 차원**
- 언어 무관 (C++ / Java / Python 등 모두 적용)
- "디자인은 의존성 관리" (Iglberger 메시지) → 아키텍처로 확장

흐름: **클래스 디자인 → 컴포넌트 → 아키텍처**

## 폴더 / 명명

위상이 — 언어 무관이지만 — 사이트의 기존 카테고리는 `programming`. 처음엔:

```
src/content/blog/programming/clean-architecture/
├── 00-overview.md
├── part1-introduction/
│   ├── chapter01-what-is-design-and-architecture.md
│   ├── chapter02-a-tale-of-two-values.md
├── ...
```

서브폴더 (Part 단위) — 34장 평면 나열보다 가독성. 또는:

```
src/content/blog/programming/clean-architecture/
├── 00-overview.md
├── chapter01-...md     (Part I)
├── chapter02-...md
├── ...
```

**결정** — 평면 (subfolder 없이). 기존 시리즈와 일관성. seriesOrder로 정렬.

## 34장 ToC (6 Parts)

### Part I: Introduction (Ch 1-2)
1. What Is Design and Architecture?
2. A Tale of Two Values

### Part II: Starting with the Bricks: Programming Paradigms (Ch 3-6)
3. Paradigm Overview
4. Structured Programming
5. Object-Oriented Programming
6. Functional Programming

### Part III: Design Principles (SOLID) (Ch 7-11)
7. SRP: The Single Responsibility Principle
8. OCP: The Open-Closed Principle
9. LSP: The Liskov Substitution Principle
10. ISP: The Interface Segregation Principle
11. DIP: The Dependency Inversion Principle

### Part IV: Component Principles (Ch 12-14)
12. Components
13. Component Cohesion (REP, CCP, CRP)
14. Component Coupling (ADP, SDP, SAP)

### Part V: Architecture (Ch 15-29)
15. What Is Architecture?
16. Independence
17. Boundaries: Drawing Lines
18. Boundary Anatomy
19. Policy and Level
20. Business Rules
21. Screaming Architecture
22. The Clean Architecture
23. Presenters and Humble Objects
24. Partial Boundaries
25. Layers and Boundaries
26. The Main Component
27. Services: Great and Small
28. The Test Boundary
29. Clean Embedded Architecture

### Part VI: Details (Ch 30-34)
30. The Database Is a Detail
31. The Web Is a Detail
32. Frameworks Are Details
33. Case Study: Video Sales
34. The Missing Chapter (Simon Brown 추가)

부록: The Missing Advice

## Item 템플릿

```markdown
---
title: "Ch N: 제목"
date: 2026-MM-DDTHH:00:00
description: "한 줄 요약"
tags: [Software Architecture, Clean Code, ...]
series: "Clean Architecture"
seriesOrder: N
---

## 개요 / 동기
... 이 장이 풀려는 문제

## 핵심 주장
... Bob의 thesis

## 코드 / 도식 예제
... 가능하면 C++ 예제로 통일 (이전 시리즈와 결합 ↑)

## 비교 / 대조
... 다른 접근, anti-pattern

## 함정
... 흔한 오해

## 실무 가이드 — 체크리스트

## 핵심 정리

## 관련 항목
- C++ Software Design 가이드라인 N
- GoF 패턴 N
- 외부 자원
```

장당 — 짧은 장(Part I-II)은 ~400 라인, 긴 장(Part V Architecture)은 ~700 라인.

## 배치 계획

총 35개 글 (overview + 34장). 큰 시리즈 — 6 배치:

### Pilot (overview + Part I, 3 글)
- 00-overview
- Ch 1: Design and Architecture
- Ch 2: Two Values

### Batch A (Part II, 4 글) — 패러다임
- Ch 3-6: Paradigms, Structured, OO, Functional

### Batch B (Part III, 5 글) — SOLID
- Ch 7-11: SRP, OCP, LSP, ISP, DIP

### Batch C (Part IV, 3 글) — Components
- Ch 12-14: Components, Cohesion, Coupling

### Batch D (Part V 전반, 8 글) — 아키텍처 기초
- Ch 15-22: Architecture, Independence, Boundaries, Anatomy, Policy, Business Rules, Screaming, Clean

### Batch E (Part V 후반, 7 글) — 아키텍처 고급
- Ch 23-29: Presenters, Partial Boundaries, Layers, Main, Services, Test, Embedded

### Batch F (Part VI, 5 글) — 세부 + 마무리
- Ch 30-34: DB, Web, Frameworks, Case Study, Missing Chapter

## 교차 참조

매 SOLID 장:
- C++ Software Design 가이드라인 1-9 (디자인 원칙)
- GoF 패턴 (관련된 곳)

매 아키텍처 장:
- C++ Software Design 가이드라인 9 (Ownership)
- C++ Software Design 가이드라인 10 (ADR)
- Hexagonal Architecture / DDD 외부 참조

## 사전 결정 사항

1. **C++ 예제 통일** — 책의 Java 예제 → C++로 번역 (시리즈 결합 ↑)
2. **Korean tone** — 이전 시리즈와 동일 (~ 격, "...". 흐름)
3. **TikZ / Mermaid 다이어그램** — 아키텍처 boundary 시각화 (Part V)
4. **분량 조절** — 짧은 장(Part I)은 압축, 큰 장(Part V)은 충실
5. **부록** — 별도 글 없이 Missing Chapter에 통합

## 시작 / 끝

시작 — overview에서 Bob의 경력 / 아키텍처 철학 / 이 책의 위치
끝 — Ch 34 + Missing Chapter에서 실전 적용 정리

## 우선순위

C++ Concurrency와 동시 진행 시 — 어느 쪽 먼저?
- Concurrency — C++ 결 유지, 작은 시리즈 (12 글)
- Clean Architecture — 도메인 다양화, 큰 시리즈 (35 글)

**추천 순서** — Concurrency 먼저 (작고 빠른 완결), 그 후 Clean Architecture.
