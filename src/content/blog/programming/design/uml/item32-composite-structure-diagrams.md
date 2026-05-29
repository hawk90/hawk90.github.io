---
title: "UML 32: 컴포지트 구조 다이어그램 — 클래스 내부의 부품·포트·연결"
date: 2026-05-03T04:00:00
description: "클래스 다이어그램은 '무엇이 누구를 안다'까지, 컴포지트 구조는 '내부가 어떻게 연결됐다'까지. UML 2.0 신규, 임베디드·아키텍처에서 핵심."
tags: [UML, Composite Structure, Part, Port, Connector]
series: "UML 2.5.1"
seriesOrder: 32
draft: true
---

## 한 줄 요약

> **"클래스의 단면도"** — 외부 인터페이스만 그리는 클래스 다이어그램을 넘어서, 안쪽 *부품·포트·배선*까지 보이게 하는 다이어그램.

## 어떤 문제를 푸는가

클래스 다이어그램은 `Car`가 `Engine`을 *가진다*까지만 보여줍니다. 하지만 실제로 다음 질문에 답하려면 안쪽을 봐야 합니다.

- `Engine`이 두 개 있는 하이브리드라면 두 부품이 *어떻게 연결*되나?
- `Car` 외부 인터페이스(`«FuelInput»`)는 *어느 내부 부품*과 닿나?
- 한 `Component`가 여러 인스턴스의 *부품*으로 쓰일 때, 각 인스턴스의 상태는 별개인가?

**컴포지트 구조 다이어그램**(Composite Structure Diagram)이 이 안쪽을 그립니다. UML 2.0에서 추가됐고, 임베디드·SoC·SOA에서 특히 가치가 큽니다.

## 한눈에 보는 구조

![Composite structure of Car](/images/blog/uml/diagrams/item32-composite-structure.svg)

`Car` 클래스 박스 안에 부품(`engine : Engine`, `transmission : Transmission`) 박스가 들어있고, 각 부품의 **포트**(작은 사각형)가 **커넥터**(실선)로 연결.

## 4개 building block

| 요소 | 표기 | 의미 |
| --- | --- | --- |
| **Part** (부품) | 내부 박스 `name : Type [n..m]` | 인스턴스가 합성에 참가하는 슬롯 |
| **Port** | 부품 테두리 위 작은 사각형 | 부품의 입출력 단자 |
| **Interface** | ball(제공) / socket(요구) | 포트가 제공·요구하는 계약 |
| **Connector** | 포트 간 실선 | 메시지가 흐르는 배선 |

### Part vs Attribute

```text
Class Car
  - engine : Engine        ← attribute (전통)

vs

  part engine : Engine     ← composite part (강한 소유)
```

Composite part는 `Car`가 살아있는 동안만 그 부품이 존재합니다 (composition `◆──`와 같은 의미, 강한 ownership).

### Port

포트는 부품의 *공개 입출력 지점*. 두 종류:

- **Provided Interface** (ball, ●─) — 이 포트를 통해 다른 부품이 호출할 수 있는 인터페이스
- **Required Interface** (socket, ─⊃) — 이 포트가 호출하고 싶은 인터페이스

![engine requires IFuel and provides IThrottle via ball-and-socket](/images/blog/uml/diagrams/item32-engine-interfaces.svg)

Ball-and-socket 표기는 11편(인터페이스)에서 본 그것 — 컴포지트 구조에선 *포트 위*에 붙습니다.

### Connector

포트끼리를 잇는 선. 두 종류:

- **Assembly Connector** — 한쪽의 provided가 다른 쪽의 required와 짝
- **Delegation Connector** — 외부 포트가 내부 부품의 포트로 위임

## Delegation Connector — 외부와 내부의 다리

![Car external fuelIn port delegates to engine internal IFuel port](/images/blog/uml/diagrams/item32-car-delegation.svg)

`Car`의 외부 `fuelIn` 포트가 들어온 메시지를 내부 `engine`의 `IFuel` 포트로 *위임*. **외부 계약은 안 깨고, 내부 구현은 자유**.

이 패턴이 컴포넌트 기반 설계의 핵심입니다.

## 활용 영역

### 1) 임베디드·SoC

ECU가 여러 부품(CAN·SPI 컨트롤러·CPU 코어 등)을 가질 때, 각 부품의 포트와 연결을 그려야 *버스 토폴로지*가 보입니다.

![ECU composite: cpu/can/adc parts each require IBus served by AXI bus](/images/blog/uml/diagrams/item32-ecu-composite.svg)

### 2) 컴포지트 디자인 패턴

Composite·Facade·Mediator 같은 패턴은 *외부 인터페이스 하나가 내부 여러 부품으로 위임*되는 구조 — Delegation Connector가 천연 표기.

### 3) 분산 시스템 컴포넌트

서비스 컴포지션(Saga·Choreography)에서 각 서비스를 부품으로, 메시지 라우팅을 커넥터로.

## 클래스 다이어그램 vs 컴포지트 구조

| | 클래스 다이어그램 | 컴포지트 구조 |
| --- | --- | --- |
| 보는 단위 | 클래스 카탈로그 | 한 클래스의 단면도 |
| 관계 | 일반 association | composite part + connector |
| 인터페이스 | 클래스 간 realization | **포트** 위에 ball/socket |
| 인스턴스 정체성 | 클래스 수준 | 부품마다 별개 인스턴스 |
| 강점 | 시스템 전체 구조 | 한 컴포넌트 내부 |

둘은 **보완 관계** — 둘 다 그리는 게 보통입니다.

## 컴포넌트 다이어그램과의 관계

25·29편의 컴포넌트 다이어그램은 *배치 단위 사이의 의존*에 초점, 컴포지트 구조는 *부품·포트·커넥터의 위상*에 초점. UML 2.5.1에서는 컴포넌트 다이어그램이 컴포지트 구조의 *특화*로 정리됐습니다 — 컴포넌트는 `«component»` 스테레오타입을 가진 클래스이고, 그 내부 구조를 컴포지트 구조 표기로 그립니다.

## 자주 하는 실수

> ⚠️ Part = Attribute라고 같게 그리기

Part는 *강한 ownership*. attribute에 단순 참조를 담으려면 attribute로 두세요.

> ⚠️ Port 없이 Connector를 그리기

Connector는 *Port 사이*에 그어집니다. 부품 본체를 직접 잇지 마세요 — 포트가 없으면 그 부품은 *그냥 attribute*입니다.

> ⚠️ ball/socket의 방향 혼동

Ball(●)은 *제공*, Socket(⊃)은 *요구*. 외워두면 평생 헷갈리지 않습니다.

## 정리

- 컴포지트 구조 다이어그램은 **클래스의 단면도** — 안쪽 부품·포트·커넥터.
- 4 building block: **Part · Port · Interface · Connector**.
- **Delegation Connector**가 외부 인터페이스를 내부 부품으로 위임 — 컴포넌트 설계의 핵심.
- 임베디드·SoC·SOA에서 가치 큰 다이어그램.
- 클래스·컴포넌트 다이어그램과 **보완 관계**, 보통 같이 그린다.

다음 편은 **커뮤니케이션 다이어그램** — 시퀀스의 공간적 자매.

## 관련 항목

- [UML 11: 인터페이스·타입·역할](/blog/programming/design/uml/item11-interfaces-types-roles) — ball-and-socket의 기본
- [UML 25: 컴포넌트](/blog/programming/design/uml/item25-components)
- [UML 29: 컴포넌트 다이어그램](/blog/programming/design/uml/item29-component-diagrams)
