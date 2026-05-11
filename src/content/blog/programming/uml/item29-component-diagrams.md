---
title: "UML 29: 컴포넌트 다이어그램 — 빌드·배포 단위의 아키텍처"
date: 2026-07-06T14:00:00
description: "MSA·모놀리스·라이브러리 아키텍처를 한 장에. 인터페이스로 연결된 컴포넌트의 지도."
tags: [UML, Component Diagram, Architecture, Microservices]
series: "UML User Guide"
seriesOrder: 29
draft: false
---

## 한 줄 요약

> **"컴포넌트들의 연결 지도"** — 마이크로서비스 아키텍처, 모듈 아키텍처를 한눈에.

## 어떤 문제를 푸는가

대규모 시스템을 처음 받았을 때 가장 먼저 묻는 질문:

- 어떤 서비스들이 있나?
- 누가 누구를 부르나?
- 어떤 인터페이스로 통신하나?

컴포넌트 다이어그램이 이 답.

## 한눈에 보는 예시

![Component diagram](/images/blog/uml/diagrams/item29-component-diagram.svg)

`Web UI` → `Order Service` → `Payment Service`, `Order Service` → `Order DB`. 컴포넌트 4개의 한 시스템.

## 구성 요소

| 요소 | 그림 |
| --- | --- |
| 컴포넌트 | 박스 + `<<component>>` 또는 두 탭 아이콘 |
| 제공 인터페이스 | lollipop (`●`) |
| 필요 인터페이스 | socket (`⌒`) |
| Assembly | 두 ball-and-socket이 맞물림 |
| 의존 | 점선 화살표 |
| 포트 | 박스 가장자리 작은 사각형 |

## 그릴 때 단계

### 1. 컴포넌트 식별

도메인·기능별로 큰 단위를 식별. 보통:

- 사용자 인터페이스 (Web, Mobile, CLI)
- 비즈니스 서비스 (Order, Inventory, Payment)
- 데이터 저장소 (Order DB, Cache, Search Index)
- 외부 시스템 (Payment Gateway, Email Service)

### 2. 인터페이스 식별

각 컴포넌트가 **제공**하는 것과 **필요**한 것.

```
OrderService
  제공: IOrder, IOrderQuery, OrderEvents
  필요: IPayment, IInventory, ILogger
```

### 3. 연결

같은 인터페이스의 양 끝을 묶음 — assembly connector.

### 4. 의존성 그리기

인터페이스 없이 직접 의존하는 경우는 점선 화살표.

## Layered 컴포넌트 다이어그램

계층 아키텍처를 컴포넌트 다이어그램으로:

```
┌─ UI ────────────┐
│ Web Frontend    │
└────────┬────────┘
         │ IOrder
┌─ App ──┴────────┐
│ Order Service   │
└────────┬────────┘
         │ IOrderRepo
┌─ Infra ┴────────┐
│ Order Repository│
└─────────────────┘
```

각 계층이 컴포넌트, 계층 간 인터페이스로 결합.

## 마이크로서비스 다이어그램

각 서비스를 컴포넌트로:

```
[API Gateway]
   ├──→ [Order Service]
   ├──→ [Inventory Service]
   ├──→ [Payment Service]
   └──→ [User Service]
```

`<<microservice>>` 스테레오타입을 도입해 의도를 분명히.

## 컴포넌트 다이어그램 vs 패키지 다이어그램

| | Package | Component |
| --- | --- | --- |
| 단위 | 이름공간 | 빌드·배포 단위 |
| 단위 크기 | 작음~중간 | 크음 |
| 통신 | 클래스 의존 | 인터페이스 |
| 표기 | 폴더 탭 | 박스 + 컴포넌트 아이콘 |

대규모 시스템에선 **컴포넌트가 패키지를 묶고**, 패키지가 다시 클래스를 묶습니다.

## 자주 하는 실수

> ⚠️ 한 다이어그램에 모든 컴포넌트

대규모 시스템은 컴포넌트도 수십 개. **하위 시스템별로 분할**한 다이어그램을 여러 장.

> ⚠️ 인터페이스 없이 직선만

컴포넌트끼리 직선만 그리면 의미가 흐림. **lollipop/socket**으로 어떤 계약인지 표시.

> ⚠️ 컴포넌트 안에 클래스 다 그리기

컴포넌트 내부 디테일은 별도 다이어그램으로. 컴포넌트 다이어그램은 **컴포넌트 간 관계**.

## 정리

- 컴포넌트 다이어그램은 **빌드·배포·교체 단위**의 연결 지도.
- 인터페이스(lollipop/socket)로 컴포넌트 간 계약 명시.
- 마이크로서비스, 계층 아키텍처, 모듈 아키텍처에 모두 활용.
- 패키지 다이어그램보다 **한 단계 위**, 배포 다이어그램보다 **한 단계 아래**.

다음 편은 **배포 다이어그램** — 어떤 노드 위에 어떤 컴포넌트가 도는지.
