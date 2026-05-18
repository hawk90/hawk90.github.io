---
title: "UML 25: 컴포넌트 — 배치 가능한 단위와 인터페이스 계약"
date: 2026-04-02T01:00:00
description: "클래스보다 큰 단위. 빌드·배포·교체의 기본 단위로서의 컴포넌트."
tags: [UML, Component, Architecture, Deployment]
series: "UML 2.5.1"
seriesOrder: 25
draft: false
---

## 한 줄 요약

> **"독립적으로 빌드·배포 가능한 단위"** — 컴포넌트는 인터페이스 계약을 통해서만 외부와 통신한다.

## 어떤 문제를 푸는가

클래스 다이어그램은 50개를 넘으면 거대해집니다. 게다가 **빌드 단위**, **배포 단위**, **교체 단위**는 클래스가 아닙니다 — 보통 더 큰 묶음(JAR, DLL, microservice).

UML은 이 큰 단위를 **컴포넌트(Component)**로 모델링합니다.

## 한눈에 보는 구조

![Component with interfaces](/images/blog/uml/diagrams/item25-component.svg)

- 박스 우상단의 **두 탭 아이콘**(또는 `<<component>>` 스테레오타입)으로 컴포넌트임을 표시.
- 오른쪽 **lollipop**(제공 인터페이스) — IOrder를 제공.
- 왼쪽 **socket**(필요 인터페이스) — IPayment를 필요로 함.

## 컴포넌트의 특징

| 특징 | 의미 |
| --- | --- |
| 독립 빌드 | 자기 코드만으로 컴파일 가능 |
| 독립 배포 | 다른 컴포넌트 없이도 배포 가능 |
| 인터페이스 계약 | 외부와는 정해진 인터페이스로만 |
| 교체 가능 | 같은 인터페이스 만족하면 갈아끼울 수 있음 |

## 컴포넌트 vs 클래스

| | Class | Component |
| --- | --- | --- |
| 크기 | 작음 | 큼 (보통 수십~수백 클래스) |
| 단위 | 타입 | 빌드·배포·교체 단위 |
| 통신 | 메서드 호출 | 인터페이스를 통한 모든 통신 |
| 예 | `Order`, `Customer` | OrderService, PaymentGateway |

## Port — 외부와의 접점

컴포넌트는 **포트**(11편 참조)를 통해 외부와 통신합니다.

<img src="/images/blog/uml/diagrams/item25-component-ports.svg" alt="OrderService — 제공·필요 포트" style="max-width:100%; background:white; padding:8px; border-radius:6px;" />

포트는 컴포넌트 경계의 작은 사각형. 내부 구현 변화가 외부에 노출되지 않게 격리합니다.

## 컴포넌트의 내부

`<<component>>` 박스 안에 더 작은 클래스·서브컴포넌트를 그릴 수 있습니다.

<img src="/images/blog/uml/diagrams/item25-component-contents.svg" alt="컴포넌트 내부 — Controller·Repository·Validator" style="max-width:100%; background:white; padding:8px; border-radius:6px;" />

또는 **컴포지트 구조 다이어그램**으로 내부 부품과 연결을 보여줍니다.

## 의존성과 표현

컴포넌트 다이어그램에서 컴포넌트 간 의존은:

- **인터페이스 간 연결** (assembly connector) — 두 ball-and-socket이 맞물림
- **점선 화살표** — 일반 의존

가능하면 **항상 인터페이스를 통해서** 의존하도록 그립니다 — DIP 적용.

## 컴포넌트가 뭘 담는가

코드 매핑:

- Java: JAR, WAR, OSGi 번들
- C++: DLL, SO
- .NET: 어셈블리
- Node: npm package
- 클라우드: microservice, Lambda

## 자주 하는 실수

> ⚠️ 컴포넌트를 클래스 다이어그램에서

큰 단위(JAR/SVC)는 컴포넌트 다이어그램, 작은 단위(class/interface)는 클래스 다이어그램. **레벨을 섞지 마세요**.

> ⚠️ 인터페이스 없이 컴포넌트끼리 직접 의존

컴포넌트는 **인터페이스를 통해서만** 의존해야 교체 가능. 직접 의존하면 모놀리스에 가까워짐.

> ⚠️ 너무 작은 컴포넌트

컴포넌트가 클래스 1개짜리라면 그건 클래스. 보통 **수십 클래스 이상**이 모여 한 컴포넌트.

## 정리

- 컴포넌트는 **독립 빌드·배포·교체 단위**.
- 외부와는 **인터페이스**(lollipop/socket)로만 통신.
- 포트는 컴포넌트 경계의 명시적 접점.
- 클래스 다이어그램보다 **한 레벨 위**의 시각.

다음 편은 **배포** — 컴포넌트가 어디에 올라가는지.
