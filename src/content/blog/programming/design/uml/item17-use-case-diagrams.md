---
title: "UML 17: 유스케이스 다이어그램 — 시스템 경계와 외부 행위자"
date: 2026-04-01T17:00:00
description: "System boundary box, actor, use case, include/extend — 시스템 스코프를 한 장에."
tags: [UML, Use Case Diagram, Requirements, Scope]
series: "UML 2.5.1"
seriesOrder: 17
draft: true
---

## 한 줄 요약

> **"시스템 경계 + actor + use case"** — 시스템이 무엇을 하고 누가 그걸 쓰는지 한 장에.

## 어떤 문제를 푸는가

기획자와 개발자가 처음 만나면 가장 먼저 합의해야 할 것: **시스템의 범위(scope)**.

- 어디까지 우리가 만드는가?
- 누가 이 시스템을 쓰는가?
- 외부 시스템과는 어떻게 연결되나?

유스케이스 다이어그램은 이 질문에 한 장으로 답합니다.

## 한눈에 보는 예시 — 온라인 서점

![Use case diagram](/images/blog/uml/diagrams/item17-use-case-diagram.svg)

- **둘러싼 사각형** — 시스템 경계
- 안쪽 — 시스템이 제공하는 유스케이스
- 바깥쪽 — actor (Customer + Payment Gateway)

## 구성 요소

### 1. System Boundary

사각형 + 시스템 이름. **명시적**으로 그려 시스템 경계를 표시합니다.

### 2. Actor

시스템 바깥. 막대 사람 또는 `<<actor>>` 스테레오타입의 박스.

- 사람 actor: 막대 그림
- 시스템 actor: 박스 with `<<actor>>` 또는 `<<system>>`

### 3. Use Case

시스템 안. 타원.

### 4. Association

actor와 use case 사이의 실선 — "이 actor가 이 use case에 참여".

## Include vs Extend

유스케이스끼리도 관계를 가질 수 있습니다.

### `<<include>>` — 항상 포함

A가 B를 include 하면, A 실행 시 **항상** B가 실행됨.

```
[Place Order] ┈┈▷ [Authenticate]   <<include>>
```

`Authenticate`는 `Place Order`의 부분.

### `<<extend>>` — 조건부 확장

A가 B를 extend 하면, **조건 만족 시에만** B가 실행됨.

```
[Place Order] ◁┈┈ [Apply Coupon]   <<extend>>
```

`Apply Coupon`은 쿠폰이 있을 때만.

> 💡 화살표 방향: include는 사용자가 사용 대상을, extend는 확장이 본체를 가리킴. 반대로 그리는 실수가 많음.

### Generalization

actor도 use case도 일반화 가능.

```
Premium Customer ── ▷ Customer    (actor generalization)
[Express Place Order] ─▷ [Place Order]   (UC generalization)
```

## 시스템 경계 — 어디까지가 우리?

시스템 경계는 다음을 명확히 합니다.

- **만드는 것** — 박스 안의 use case
- **가정하는 것** — 박스 밖의 actor
- **연결만 하는 것** — 외부 시스템 actor (Payment Gateway 등)

이 셋만 분명히 해도 요구사항 합의의 절반은 끝.

## 유스케이스 다이어그램으로는 부족한 것

이 다이어그램은 **무엇을** 만드는지만 보여줍니다. 다음은 별도 다이어그램이나 텍스트로:

- 시나리오 디테일 → 시퀀스/활동 다이어그램
- 데이터 → 클래스 다이어그램
- 비기능 요구사항(성능·보안) → 텍스트 명세
- 우선순위 → 백로그

## 자주 하는 실수

> ⚠️ 너무 많은 유스케이스

대규모 시스템도 화면 한 장에 들어갈 만큼만 — 보통 5-15개. 더 많으면 **하위 시스템으로 분할**.

> ⚠️ Include로 분해를 남발

"`Place Order` → `Validate Cart` → `Calculate Total` → ..." 식으로 잘게 쪼개면 시나리오만 흩어집니다. **사용자 가치 단위**를 지키세요.

> ⚠️ System Boundary 생략

"시스템 = 화면 전체"라는 암묵적 가정이 깨지면 다이어그램의 절반이 무너집니다. 명시하세요.

## 정리

- 유스케이스 다이어그램은 **시스템 경계 + actor + use case**.
- `<<include>>`(항상)와 `<<extend>>`(조건부)로 use case 간 관계 표현.
- Actor와 use case 모두 일반화 가능.
- 다이어그램은 **scope** 합의 도구 — 디테일은 시나리오 텍스트나 다른 다이어그램에.

다음 편은 **시퀀스 다이어그램** — 한 시나리오를 시간 축으로 펼치기.
