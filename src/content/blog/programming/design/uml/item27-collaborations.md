---
title: "UML 27: 협력 — 역할들의 묶음과 재사용 단위"
date: 2026-04-06T12:00:00
description: "Collaboration은 객체가 아니라 역할의 그룹 — 패턴 추상화의 토대."
tags: [UML, Collaboration, Role, Pattern]
series: "UML User Guide"
seriesOrder: 27
draft: true
---

## 한 줄 요약

> **"같이 일하는 역할들의 묶음"** — 협력은 객체가 아니라 역할의 집합. 패턴을 표현할 때 필요한 추상.

## 어떤 문제를 푸는가

GoF의 Observer 패턴을 생각해봅시다. `Subject`와 `Observer`는 클래스가 아닙니다 — **역할**입니다.

- 어떤 시스템에선 `StockTicker`가 Subject, `PriceChart`가 Observer.
- 다른 시스템에선 `Document`가 Subject, `View`가 Observer.

이 "역할들의 패턴"을 UML로 표현하는 방법이 **협력(Collaboration)**입니다.

## 한눈에 보는 구조

![Collaboration with roles](/images/blog/uml/diagrams/item27-collaboration.svg)

- **점선 타원** — 협력 자체
- 안쪽 — 역할(role)과 그들 간의 관계

## 협력의 두 면

### 1. 구조 (Structure)

협력에 참가하는 **역할**과 그들 간의 관계. 컴포지트 구조 다이어그램과 비슷한 표기.

### 2. 행위 (Behavior)

역할들이 **어떻게 협력하는가** — 시퀀스 다이어그램, 통신 다이어그램, 활동 다이어그램으로.

협력은 **구조 + 행위**의 패키지.

## Role vs Class

| | Class | Role |
| --- | --- | --- |
| 의미 | 객체 정의 | 협력 내 위치 |
| 이름 | `Subject`, `Observer` | `:Subject`, `:Observer` |
| 인스턴스 | `subject1, subject2` | 협력 인스턴스화 시 실제 클래스 바인딩 |

같은 클래스가 다른 협력에서 다른 역할을 가질 수 있습니다 — `User`가 인증 협력에선 `Principal`, 결제 협력에선 `Payer`.

## 협력 인스턴스화

협력은 추상이고, 실제 시스템에 적용할 때 **바인딩**합니다.

<img src="/images/blog/uml/diagrams/item27-observer-instance.svg" alt="Observer 협력 — StockTicker(Subject) · PriceChart(Observer)" style="max-width:100%; background:white; padding:8px; border-radius:6px;" />

다음 편(패턴)에서 더 자세히.

## 협력 vs 컴포넌트 vs 패턴

| 추상 | 의미 | 시각 |
| --- | --- | --- |
| Class | 타입 | 정적 |
| Object | 인스턴스 | 정적, 시점 |
| Component | 배치 단위 | 정적, 아키텍처 |
| Collaboration | 역할 묶음 | 구조 + 행위 |
| Pattern | 매개변수화된 협력 | 재사용 |

## 활용 — 아키텍처 다이어그램의 골격

협력은 **아키텍처 청사진**을 그릴 때 강력합니다.

```
MVC 협력:
  Model 역할 ── Controller 역할 ── View 역할
```

이 청사진을 두고 구체 클래스 매핑은 별도 다이어그램으로.

## 자주 하는 실수

> ⚠️ 협력을 클래스 다이어그램과 혼동

협력은 역할의 집합 — 구체 클래스가 아닙니다. **점선 타원**으로 그리세요.

> ⚠️ 한 협력에 너무 많은 역할

3-5개가 보통입니다. 더 많으면 협력을 쪼개세요.

> ⚠️ 행위 빼고 구조만

협력의 핵심은 "어떻게 협력하는가" — 행위 다이어그램이 빠지면 의미 절반.

## 정리

- 협력은 **역할들의 묶음** — 객체가 아닌 추상 단위.
- 구조(역할·관계) + 행위(시퀀스·통신·활동) 두 면.
- 같은 클래스가 다른 협력에서 다른 역할.
- **아키텍처 청사진**·**디자인 패턴**의 토대.

다음 편은 **패턴과 프레임워크** — 협력을 매개변수화해 재사용.
