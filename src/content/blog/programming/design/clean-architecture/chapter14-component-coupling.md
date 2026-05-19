---
title: "Ch 14: 컴포넌트 결합"
date: 2026-05-01T14:00:00
description: "컴포넌트들이 서로 어떻게 의존해야 하는가. ADP, SDP, SAP 세 원칙과 안정성·추상도의 측정."
tags: [Architecture, Components, Coupling, ADP, SDP, SAP]
series: "Clean Architecture"
seriesOrder: 14
draft: true
---

## 이 챕터의 메시지

13장이 한 컴포넌트 안의 응집을 다뤘다면, 14장은 컴포넌트들 **사이의 결합**을 다룬다.

세 가지 원칙이 있다.

| 원칙 | 약어 | 의미 |
|---|---|---|
| Acyclic Dependencies Principle | ADP | 컴포넌트 의존성에 순환이 없어야 한다 |
| Stable Dependencies Principle | SDP | 안정 방향으로만 의존한다 |
| Stable Abstractions Principle | SAP | 안정적인 것은 추상적이어야 한다 |

## ADP — 순환 의존 금지 원칙

> **Allow no cycles in the component dependency graph.**

컴포넌트 의존 그래프에 순환이 없어야 한다.

![좋은 DAG vs 나쁜 순환 의존](/images/blog/clean-architecture/diagrams/ch14-dag-vs-cycle.svg)

왜 순환이 문제인가? 순환은 컴포넌트들을 **하나의 큰 단위**로 묶어 버린다. A를 빌드하려면 B가 필요하고, B를 빌드하려면 C가 필요하고, C를 빌드하려면 A가 필요하다 — 그러면 셋을 동시에 빌드할 수밖에 없다.

**순환의 결과**:
- 빌드 순서가 불가능 (어디서 시작?)
- 한 컴포넌트의 변경이 다른 모든 컴포넌트를 흔든다
- 독립 진화 불가능 (12장에서 강조했던 그 핵심 가치)

### 순환은 어떻게 생기나

대부분 우연히 생긴다.

- A가 B의 클래스를 쓴다 (A → B)
- 시간이 지나 B가 A의 어떤 기능을 쓰기 시작한다 (B → A 추가)
- 모르고 있다가 순환이 생긴 채로 빌드 시스템이 받아들인다

이걸 막으려면 **빌드 시 자동 검증**이 필요하다. 정적 분석 도구로 의존 그래프를 그리고, 순환이 있으면 빌드 실패.

### 순환 해소

순환을 발견했을 때 두 가지 해법이 있다.

**1. DIP 적용** — 5장의 의존성 역전.

```
이전:                       이후:
A → B → A (순환)            A → Interface ← B
                            B는 A의 인터페이스를 구현
```

A는 인터페이스만 알고, B가 그 인터페이스를 구현한다.

**2. 새 컴포넌트 생성** — A와 B가 공통으로 쓰는 코드를 C로 추출.

```
이전:                       이후:
A → B → A (순환)            A → C ← B
```

## SDP — 안정 의존 원칙

> **Depend in the direction of stability.**

안정성의 방향으로 의존한다.

**안정성(stability)** — 컴포넌트가 변경에 얼마나 저항적인가. 변경하기 어려운 컴포넌트가 안정적이다.

무엇이 컴포넌트를 안정적으로 만드는가? **그것에 의존하는 컴포넌트의 수**다. 많은 컴포넌트가 의존하는 컴포넌트는 변경이 어렵다 — 모든 의존자에게 영향을 주기 때문이다.

![컴포넌트 안정성 — 많은 의존자](/images/blog/clean-architecture/diagrams/ch14-stability-visual.svg)

이제 SDP를 다시 본다.

> 의존성은 **안정성의 방향**으로 흘러야 한다.

X가 안정적이라면, A, B, C, D, E가 X에 의존하는 건 자연스럽다. 반대로 X가 A에 의존하면 안 된다 — A가 변할 때 X가 흔들리고, 그 X에 의존하는 5개 컴포넌트가 모두 흔들린다.

### 측정 — Instability (I)

Martin은 안정성을 측정하는 지표를 제시한다.

$$
I = \frac{\text{밖으로 나가는 의존} (Ce)}{\text{전체 의존} (Ce + Ca)}
$$

- $Ce$ — Efferent Coupling (밖으로 나가는 의존): 이 컴포넌트가 다른 컴포넌트에 의존하는 개수
- $Ca$ — Afferent Coupling (들어오는 의존): 다른 컴포넌트가 이 컴포넌트에 의존하는 개수

I의 범위는 [0, 1].

- I = 0 — 최대 안정. 들어오는 의존만 있고 나가는 의존 없음
- I = 1 — 최대 불안정. 나가는 의존만 있고 들어오는 의존 없음

SDP의 정확한 표현 — **한 컴포넌트의 I는 자신이 의존하는 컴포넌트의 I보다 크거나 같아야 한다**. 즉 불안정한 것이 안정적인 것에 의존한다.

## SAP — 안정 추상화 원칙

> **A component should be as abstract as it is stable.**

컴포넌트는 안정적인 만큼 추상적이어야 한다.

왜 그런가? **안정 + 구체**의 조합이 가장 위험하다.

- 안정 → 변경 어려움
- 구체 → 디테일이 박혀 있음
- 합치면 — 디테일은 박혀 있는데 변경이 어렵다 → 새 요구를 받아들일 수 없다

반대로 **불안정 + 추상**도 이상하다.

- 불안정 → 변경 잦음
- 추상 → 디테일이 없음
- 합치면 — 추상이 자주 변하면 의존자들이 모두 흔들린다

따라서 균형이 필요하다 — **안정한 것은 추상적으로, 불안정한 것은 구체적으로**.

### 측정 — Abstractness (A)

$$
A = \frac{\text{추상 클래스/인터페이스 수} (Na)}{\text{전체 클래스 수} (Nc)}
$$

A의 범위도 [0, 1].

- A = 0 — 모두 구체 클래스
- A = 1 — 모두 추상 (인터페이스)

## Main Sequence — I와 A의 관계

I와 A를 함께 그리면 평면이 만들어진다.

![Main Sequence — Abstractness vs Instability](/images/blog/clean-architecture/diagrams/ch14-main-sequence.svg)

**Main Sequence** — A + I = 1 직선. 이 직선 위에 있는 컴포넌트가 이상적이다.

- 안정 (I = 0) → 추상 (A = 1)
- 불안정 (I = 1) → 구체 (A = 0)

**Zone of Pain** — 구체이면서 안정. 변경 불가능한 디테일 덩어리. DB 스키마, 레거시 코드.

**Zone of Uselessness** — 추상이지만 안 쓰임. 누구도 의존하지 않는 인터페이스. 죽은 코드.

### 거리(Distance) — D

Main Sequence에서 얼마나 떨어졌는가를 측정.

$$
D = |A + I - 1|
$$

D = 0이면 Main Sequence 위. D가 1에 가까우면 Pain/Uselessness 영역.

## 측정의 실용성

이 측정들이 "절대적 좋고 나쁨"을 주지는 않는다. **트렌드를 본다**.

- 컴포넌트 X의 D가 계속 증가하는가? → 디자인이 무너지고 있다
- 새로 추가한 컴포넌트가 Zone of Pain에 있는가? → 디자인 재검토

빌드마다 D를 측정하고 추이를 보면 아키텍처의 건강 상태를 정량적으로 추적할 수 있다.

## 정리

- 컴포넌트 결합의 세 원칙 — **ADP / SDP / SAP**
- **ADP** — 순환 의존 금지. 발견 시 DIP 또는 새 컴포넌트 추출로 해소
- **SDP** — 안정 방향으로 의존. Instability(I) 측정
- **SAP** — 안정 = 추상. Abstractness(A) 측정
- **Main Sequence** — A + I = 1 위가 이상적
- **Zone of Pain** (구체+안정) / **Zone of Uselessness** (추상+불안정) 피하기
- 거리(D) 추적으로 아키텍처 건강 측정

## 다음 장 예고

여기서부터는 **Part V — 아키텍처**가 시작된다. 15장은 "아키텍처란 무엇인가"부터 다시 본다.

## 관련 항목

- [Ch 11: DIP](/blog/programming/design/clean-architecture/chapter11-dip-the-dependency-inversion-principle) — 순환 해소의 도구
- [Ch 13: 컴포넌트 응집](/blog/programming/design/clean-architecture/chapter13-component-cohesion) — 응집과 결합은 짝
- [C++ Software Design 가이드라인 1: 디자인](/blog/programming/cpp/cpp-software-design/guideline01-understand-the-importance-of-software-design) — 의존성 관리
