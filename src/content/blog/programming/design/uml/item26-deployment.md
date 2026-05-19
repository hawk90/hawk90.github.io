---
title: "UML 26: 배포 — 물리 토폴로지와 노드"
date: 2026-05-03T02:00:00
description: "코드가 실제로 도는 곳 — 노드, 통신 경로, 그리고 그 위의 아티팩트."
tags: [UML, Deployment, Architecture, Distributed Systems]
series: "UML 2.5.1"
seriesOrder: 26
draft: false
---

## 한 줄 요약

> **"코드는 어딘가에 실제로 돈다"** — 배포 모델링은 컴포넌트가 어느 하드웨어 위에 올라가는지를 그린다.

## 어떤 문제를 푸는가

소프트웨어를 만든 뒤 가장 자주 묻는 질문:

- 이 서비스는 어디서 도나?
- 어떤 노드끼리 통신하나?
- 프로토콜이 뭐고 latency는 얼마나 되나?
- DB는 어디 있고 백업은?

배포 다이어그램이 이 답을 한 장에 담습니다.

## 한눈에 보는 구조

![Deployment overview](/images/blog/uml/diagrams/item26-deployment-overview.svg)

UML의 노드는 **3D 직사각형**(육면체)으로 그립니다. 노드끼리의 선은 **통신 경로**.

## 노드 (Node)

UML 노드는 두 종류:

### Device

물리 또는 가상 머신.

```
<<device>>
WebServer
```

- EC2 인스턴스, 컨테이너, 베어메탈
- 라우터, 센서, 모바일 단말

### Execution Environment

OS·JVM·container runtime처럼 다른 무언가를 실행할 수 있는 환경.

<img src="/images/blog/uml/diagrams/item26-node-execenv.svg" alt="Server 노드 안의 JVM 실행환경" style="max-width:100%; background:white; padding:8px; border-radius:6px;" />

노드 안에 노드를 둘 수 있습니다.

## Artifact — 배포되는 것

노드 위에 올라가는 실제 파일 단위.

```
<<artifact>>
order-svc.jar
```

| 표기 | 예 |
| --- | --- |
| 박스 + 종이접기 아이콘 | jar, war, exe, dll |
| 스테레오타입 | `<<artifact>>` |

컴포넌트는 추상 단위, artifact는 그 컴포넌트의 **물리 결과물**.

## Manifestation — 컴포넌트와 아티팩트 매핑

<img src="/images/blog/uml/diagrams/item26-artifact-manifest.svg" alt="아티팩트 manifest — order-svc.jar ⇨ OrderService" style="max-width:100%; background:white; padding:8px; border-radius:6px;" />

"이 jar 파일이 이 컴포넌트의 구현 결과물이다."

## 통신 경로

노드 간 선은 단순히 "연결"이 아닌 **통신 채널**:

- 프로토콜 (HTTP, TCP, gRPC, AMQP) — 스테레오타입
- 양방향 / 단방향
- QoS (latency, bandwidth, encrypted)

```
WebServer ──HTTP/2──── AppServer ──gRPC──── PaymentSvc
                      ⊕ encrypted
```

## 배포 시나리오

### Static Deployment

빌드 시 정해지는 배치. UML 배포 다이어그램의 표준 사용.

### Dynamic Deployment

런타임에 변하는 배치 (오토스케일, 마이그레이션). `<<deploy>>` 의존성에 조건을 표시하거나 별도 시나리오 다이어그램.

## 자주 하는 실수

> ⚠️ 컴포넌트 다이어그램과 합치기

소프트웨어 단위(컴포넌트) vs 하드웨어 단위(노드)는 다른 시각입니다. **분리**해서 그리세요.

> ⚠️ 모든 노드를 한 다이어그램에

대규모 시스템은 수십~수백 노드. **레이어별/스코프별로** 분할.

> ⚠️ 프로토콜·QoS 누락

선만 있고 무슨 프로토콜인지 안 적으면 운영 시에 의미가 없음. **선마다 라벨** 붙이세요.

## 정리

- 노드는 **3D 박스** — `<<device>>` 또는 `<<executionEnvironment>>`.
- 아티팩트는 노드 위에 올라가는 **실제 파일**.
- **Manifestation**으로 컴포넌트와 아티팩트를 연결.
- 노드 간 선은 통신 채널 — 프로토콜과 QoS 명시.

다음 편은 **협력(Collaboration)** — 패턴과 재사용 가능한 구조.
