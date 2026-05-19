---
title: "Tip 44: Decoupled Code Is Easier to Change"
date: 2026-05-11T20:00:00
description: "결합도 낮은 코드가 — 바꾸기 쉽다. ETC 원칙의 한 형태."
series: "The Pragmatic Programmer"
seriesOrder: 44
tags: [pragmatic-programmer, design]
draft: true
---

## 이 팁의 메시지

> **Decoupled Code Is Easier to Change** — ETC(Easier To Change)의 — 한 표현.

## 핵심 내용

- 결합도(coupling) — 모듈 간 의존.
- 높을수록 — 한 변경이 — 다른 모듈에 — 영향.
- 낮을수록 — 한 자리만 — 수정.
- 변경 가능성의 — 핵심 척도.

## 결합도의 종류

- **데이터 결합** — 인자로 전달(낮음, 좋음).
- **스탬프 결합** — 구조체 전체(중간).
- **제어 결합** — 흐름 제어 인자(중간).
- **공용 결합** — 전역 데이터(높음, 나쁨).
- **내용 결합** — 다른 모듈 내부 접근(최악).

## 결합도 낮추기

- **인터페이스** — 추상에 의존.
- **DI** — 외부에서 주입.
- **이벤트** — 비동기 분리.
- **메시지** — 메시지로 — 통신.

## 강결합의 표지

- 한 자리 수정 → 여러 자리 동시 수정.
- 한 테스트 → 여러 모듈 초기화.
- 한 모듈 이해 → 다른 모듈 모두 읽기.

## 정리

- 결합도 ↓ = 변경 비용 ↓.
- 데이터·인터페이스·DI·이벤트.
- 강결합 표지 — 인식.

## 관련 항목

- [Tip 17: Orthogonality](/blog/programming/engineering/pragmatic-programmer/tip17)
- [Tip 43: Avoid Fortune-Telling](/blog/programming/engineering/pragmatic-programmer/tip43)
- [Tip 45: Tell, Don't Ask](/blog/programming/engineering/pragmatic-programmer/tip45)
- [Clean Architecture Ch 14: Component Coupling](/blog/programming/design/clean-architecture/chapter01-what-is-design-and-architecture/)
