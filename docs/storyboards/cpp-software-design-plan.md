# C++ Software Design 시리즈 — 작업 계획

> Klaus Iglberger, *C++ Software Design: Design Principles and Patterns for High-Quality Software*, O'Reilly, 2022
> 39 guidelines / 11 chapters

## 시리즈 위치

```
src/content/blog/programming/cpp-software-design/
  00-overview.md
  guideline01-...md
  guideline02-...md
  ...
  guideline39-...md
```

- 폴더: `programming/cpp-software-design/` (`code-complete`, `pragmatic-programmer` 빈 폴더 옆에)
- 파일명: `guideline01-...` 또는 `item01-...` — 결정 필요. **추천: `guideline01-...`** (책 용어 그대로, 다른 시리즈와 차별)
- frontmatter: `series: "C++ Software Design"`, `seriesOrder: N`
- 한국어 본문, 카테고리: programming

## 책 목차 (39 guidelines)

### Ch 1 — The Art of Software Design
1. Understand the Importance of Software Design
2. Design for Change
3. Separate Interfaces to Avoid Artificial Coupling
4. Design for Testability
5. Design for Extension

### Ch 2 — The Art of Building Abstractions
6. Adhere to the Expected Behavior of Abstractions
7. Understand the Similarities Between Base Classes and Concepts
8. Understand the Semantic Requirements of Overload Sets

### Ch 3 — The Purpose of Design Patterns
9. Pay Attention to the Ownership of Abstractions
10. Consider Creating an Architectural Document
11. Understand the Purpose of Design Patterns
12. Beware of Design Pattern Misconceptions
13. Design Patterns Are Everywhere
14. Use a Design Pattern's Name to Communicate Intent

### Ch 4 — The Visitor Design Pattern
15. Design for the Addition of Types or Operations
16. Use Visitor to Extend Operations
17. Consider std::variant for Implementing Visitor
18. Beware the Performance of Acyclic Visitor

### Ch 5 — The Strategy and Command Design Patterns
19. Use Strategy to Isolate How Things Are Done
20. Favor Composition over Inheritance
21. Use Command to Isolate What Things Are Done
22. Prefer Value Semantics over Reference Semantics
23. Prefer a Value-Based Implementation of Strategy and Command

### Ch 6 — The Adapter, Observer, and CRTP Design Patterns
24. Use Adapters to Standardize Interfaces
25. Apply Observers as an Abstract Notification Mechanism
26. Use CRTP to Introduce Static Type Categories
27. Use CRTP for Static Mixin Classes

### Ch 7 — The Bridge, Prototype, External Polymorphism
28. Build Bridges to Remove Physical Dependencies
29. Be Aware of Bridge Performance Gains and Losses
30. Apply Prototype for Abstract Copy Operations
31. Use External Polymorphism for Nonintrusive Runtime Polymorphism

### Ch 8 — The Type Erasure Design Pattern
32. Consider Replacing Inheritance Hierarchies with Type Erasure
33. Be Aware of the Optimization Potential of Type Erasure
34. Be Aware of the Setup Costs of Owning Type Erasure Wrappers

### Ch 9 — The Decorator Design Pattern
35. Use Decorators to Add Customization Hierarchically
36. Understand the Trade-off Between Runtime and Compile Time Abstraction

### Ch 10 — The Singleton Pattern
37. Treat Singleton as an Implementation Pattern, Not a Design Pattern
38. Design Singletons for Change and Testability

### Ch 11 — The Last Guideline
39. Continue to Learn About Design Patterns

## 항목 템플릿

Effective C++ / Beautiful C++ 시리즈와 동일한 구조 (~250-300 lines/item):

```markdown
---
title: "가이드라인 N: <한국어 제목>"
date: 2026-...
description: "한 줄 요약"
tags: [C++, Software Design, Design Patterns, ...]
series: "C++ Software Design"
seriesOrder: N
---

## 왜 이 가이드라인이 중요한가?
(맥락 — 흔한 실수, Iglberger의 문제 제기)

## 핵심 내용
(불릿 5-6개)

## 비교 — Before / After
(Bad / Good 코드)

## (도메인별 심층 섹션 2-4개)

## 함정
(흔한 실수 케이스)

## 모던 변형
(C++17/20/23 도구 활용)

## 실무 가이드 — 체크리스트

## 정리

## 관련 항목
(같은 시리즈 + GoF/EC++/EMC++/Beautiful 크로스 참조)
```

## 작업 배치 계획

| 배치 | 가이드라인 | 챕터 | 개수 |
|---|---|---|---|
| **0. 개요** | 00-overview | — | 1 |
| **1. 파일럿** | 1-3 | Ch 1 (절반) | 3 |
| **A** | 4-14 | Ch 1-3 마무리 | 11 |
| **B** | 15-23 | Ch 4-5 (Visitor, Strategy/Command) | 9 |
| **C** | 24-34 | Ch 6-8 (Adapter, Bridge, Type Erasure) | 11 |
| **D** | 35-39 | Ch 9-11 (Decorator, Singleton, 마무리) | 5 |

총 40개 (overview + 39 guidelines).

## 다른 시리즈와의 크로스 참조

- **GoF Design Patterns** — 21세기 후속작. 같은 패턴(Visitor, Strategy, Singleton 등)이 등장하면 GoF 항목 링크.
- **Effective C++** — composition over inheritance, value semantics 등 겹침
- **Effective Modern C++** — `std::variant`, type erasure, perfect forwarding 등
- **Beautiful C++** — 의도된 디자인, RAII, concepts 등

Iglberger 책의 핵심 메시지 (`design for change`, `composition over inheritance`, `value semantics`)와 기존 시리즈를 자연스럽게 엮음.

## 카테고리 / 네비게이션

- `src/consts/categories.ts` — 변경 불필요 (programming 카테고리에 자동 포함)
- 시리즈 페이지 (`/series/cpp-software-design/`) — Astro의 series 자동 생성에 의해 작동

## 빌드 / 배포

- 각 배치 후: `npm run build` 통과 → 커밋 → 푸시
- 빌드 대상 페이지: 40개 추가 → 현재 599 + 40 = 약 639페이지

## 예상 분량

| 측면 | 추정 |
|---|---|
| 항목당 줄 수 | 250-300 |
| 총 분량 | 약 10,000-12,000 줄 |
| 배치 수 | 5 (overview + 4) |
| 커밋 수 | 5-6개 |

## 시작 전 결정 사항

1. **파일명**: `guideline01-...` vs `item01-...` — 추천 `guideline01-...`
2. **00-overview 파일**: 책 소개 + 차례 + 자기 자리 매김 — 작성 예정
3. **태그**: `C++`, `Software Design`, `Design Patterns`, `Modern C++` + 패턴별 (`Visitor`, `Strategy` etc.)
4. **시리즈 표제** (`series:` 필드): `"C++ Software Design"`
5. **시작 날짜**: `date` — 시간순으로 늘려가기 (예: 2026-05-13T10:00:00부터 1시간씩)

## 다음 단계 (작성자 승인 후)

1. ✅ 이 계획 문서 검토
2. ⬜ 00-overview.md 작성 — 시리즈 소개
3. ⬜ 파일럿 (guideline 1-3) 작성 → 빌드 → 커밋 → 푸시
4. ⬜ 배치 A (4-14) 작성 → 빌드 → 커밋
5. ⬜ 배치 B (15-23)
6. ⬜ 배치 C (24-34)
7. ⬜ 배치 D (35-39) — 시리즈 완료

각 배치 끝나면 빌드 + 커밋 + 푸시.
