---
title: "UML 11: 인터페이스 · 타입 · 역할 — ball-and-socket과 의존성 역전"
date: 2026-04-01T11:00:00
description: "제공 인터페이스(lollipop) vs 필요 인터페이스(socket) — 컴포넌트 결합의 표준 어휘."
tags: [UML, Interface, Ports, DIP, SOLID]
series: "UML 2.5.1"
seriesOrder: 11
draft: false
---

## 한 줄 요약

> **"lollipop은 제공, socket은 필요"** — 인터페이스 표기 하나로 모듈 간 결합을 깔끔하게.

## 어떤 문제를 푸는가

클래스 간 결합을 줄이려면 **인터페이스에 의존하라(DIP)**고 합니다. 그런데 인터페이스를 클래스 박스 + 실체화 화살표로 풀어 그리면 다이어그램이 금세 복잡해집니다.

UML은 인터페이스를 **간략하게** 그릴 수 있는 표기를 따로 줍니다.

## 한눈에 보는 구조

![Interfaces ball-and-socket](/images/blog/uml/diagrams/item11-interfaces.svg)

- **막대 + 동그라미 (lollipop)** — 제공 인터페이스 (provided)
- **막대 + 반원 (socket)** — 필요 인터페이스 (required)
- 둘이 **맞물리면** = 제공자와 소비자가 호환된다는 뜻.

## Provided vs Required

<img src="/images/blog/uml/diagrams/item11-provided-required.svg" alt="Provided vs Required — IOrder 인터페이스 양쪽 끝" style="max-width:100%; background:white; padding:8px; border-radius:6px;" />

두 클래스가 같은 인터페이스의 양 끝에 있으면 **묶을 수 있습니다** (assembly connector).

## 인터페이스 vs 타입 vs 추상 클래스

| 분류자 | 속성 | 연산 | 인스턴스화 |
| --- | --- | --- | --- |
| Interface | ❌ | 추상만 | ❌ |
| Abstract Class (Type) | ✅ | 일부 구현 | ❌ |
| Concrete Class | ✅ | 모두 구현 | ✅ |

Java의 `interface` vs `abstract class` 구분이 그대로 UML에도 있습니다.

## 역할 (Roles)

같은 객체가 **다른 맥락에서 다른 역할**을 가질 때.

<img src="/images/blog/uml/diagrams/item11-role-association.svg" alt="Person/Company 역할 — employee, employer" style="max-width:100%; background:white; padding:8px; border-radius:6px;" />

연관 양 끝에 역할 이름을 적습니다. 한 사람이 동시에 다른 회사의 employer일 수도 있죠 — 역할은 객체가 아니라 **관계 안에서의 위치**.

## 포트 (Port)

UML 2.x는 컴포지트 구조에서 **포트**라는 개념을 도입했습니다.

<img src="/images/blog/uml/diagrams/item11-ports-on-component.svg" alt="OrderService 포트 — IOrder 제공, IPay 필요" style="max-width:100%; background:white; padding:8px; border-radius:6px;" />

- 포트는 컴포넌트 외부와의 **접점**.
- 안쪽 구현이 바뀌어도 포트 인터페이스는 유지됩니다.

## 의존성 역전 — UML로 그리기

DIP(Dependency Inversion Principle): "고수준 모듈은 저수준 모듈에 의존하지 말고, 둘 다 추상에 의존하라."

<img src="/images/blog/uml/diagrams/item11-dip-pattern.svg" alt="DIP — OrderService와 Stripe가 IPayment에 의존" style="max-width:100%; background:white; padding:8px; border-radius:6px;" />

`OrderService`는 `Stripe`를 모름. `Stripe`는 `IPayment`를 구현. 의존 화살표가 가운데 추상으로 **수렴**합니다.

## 자주 하는 실수

> ⚠️ Lollipop만 그리고 socket을 안 그리기

제공 인터페이스만 그리면 누가 그걸 쓰는지 안 보입니다. 두 끝을 다 그리세요.

> ⚠️ 인터페이스를 매번 큰 박스로

ball-and-socket은 **간략 표기**입니다. 이름·연산을 다 보여야 할 땐 큰 박스(`<<interface>>` 클래스 박스)로 그리되, 그렇지 않을 땐 동그라미 하나로 충분.

> ⚠️ 역할 이름 빼먹기

`Person ── Person` 같은 자기 참조 관계에서 역할 이름이 없으면 의미가 안 잡힙니다. `manager`, `subordinate` 같은 이름을 꼭 붙이세요.

## 정리

- 제공 인터페이스는 **lollipop**, 필요 인터페이스는 **socket** — 맞물리면 호환.
- 인터페이스는 속성이 없고, 추상 클래스(type)는 속성이 있을 수 있다.
- **역할**은 객체가 아니라 관계 안의 위치 — 연관 양 끝에 이름.
- **포트**는 컴포넌트의 접점 — 내부 구현 무관.
- DIP를 그릴 땐 의존 화살표가 **추상으로 수렴**한다.

다음 편은 **패키지** — 모델을 그룹으로 묶기.
