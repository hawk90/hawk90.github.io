---
title: "Tip 17: Eliminate Effects Between Unrelated Things"
date: 2026-05-13
description: "관련 없는 것들 사이의 영향을 제거하라 — 직교성. 한 변경이 한 자리만 건드리도록."
series: "The Pragmatic Programmer"
seriesOrder: 17
tags: [pragmatic-programmer, design, orthogonality]
draft: true
---

## 이 팁의 메시지

> **Eliminate Effects Between Unrelated Things** — **직교성**(orthogonality)의 한 줄.

수학·물리의 직교성을 — 코드에 가져온다. 두 축이 직교하면 — 한 축의 변경이 다른 축에 — **영향 X**.

## 핵심 내용

- 직교성 = **독립성**.
- 모듈 A의 변경 → 모듈 B에 영향 X.
- 헬리콥터의 조종간(레터럴/롤/요/스로틀) = 직교 = 조종 가능.
- 직교성 없음 = 한 변경이 — 도미노.

## 직교성의 이점

- **변경의 국지화** — 한 자리만 수정.
- **테스트의 격리** — 한 모듈만 시험.
- **재사용** — 다른 맥락에서 그대로.
- **이해** — 한 부분씩 본다.

## 직교성을 깨뜨리는 자리

- **전역 상태** — 모든 모듈이 의존.
- **타입 강결합** — 인터페이스 없는 직접 호출.
- **이중 책임** — 한 모듈이 — 두 일.
- **숨겨진 의존** — 호출 순서가 — 결과를 바꿈.

## 직교성을 키우는 자리

- **인터페이스** — 추상으로 의존.
- **DI** — 외부에서 주입.
- **순수 함수** — 입력만으로 출력.
- **불변** — 공유 시에도 안전.

## 메타포 — 헬리콥터

> 헬리콥터 조종간이 — 직교하지 않으면? 한 손을 움직일 때마다 — 모든 축이 함께 움직이면? 비행 불가능.

코드도 같다.

## 정리

- 직교성 = 독립성.
- 한 변경이 한 자리만 건드리도록.
- 전역·강결합·이중책임·숨은 의존 — 제거.
- 변경 비용을 — 크게 줄인다.

## 관련 항목

- [Tip 16: Make It Easy to Reuse](/blog/programming/engineering/pragmatic-programmer/tip16)
- [Tip 18: There Are No Final Decisions](/blog/programming/engineering/pragmatic-programmer/tip18)
- [Clean Architecture Ch 14: Component Coupling](/blog/programming/design/clean-architecture/)
- [Code Complete Ch 5: Design in Construction](/blog/programming/engineering/code-complete/ch05-Design-in-Construction)
