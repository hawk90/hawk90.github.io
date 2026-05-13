---
title: "UML 30: 배포 다이어그램 — 노드와 아티팩트의 물리 토폴로지"
date: 2026-04-06T15:00:00
description: "3D 박스, 통신 경로, 그 위의 아티팩트 — 운영팀과 개발팀이 같이 보는 다이어그램."
tags: [UML, Deployment Diagram, Infrastructure, Production]
series: "UML User Guide"
seriesOrder: 30
draft: false
draft: true
---

## 한 줄 요약

> **"운영의 청사진"** — 어떤 하드웨어 위에 어떤 코드가 도는지, 어떻게 통신하는지를 한 장에.

## 어떤 문제를 푸는가

운영팀이 알고 싶은 건:

- 서버 몇 대 필요해?
- 트래픽 분기는 어디서?
- DB는 어디 두지?
- 외부 결제 시스템과 연결 통로는?

배포 다이어그램이 이 답.

## 한눈에 보는 예시

![Three-tier deployment](/images/blog/uml/diagrams/item30-deployment-diagram.svg)

3계층 아키텍처: Web 서버 → App 서버 → DB 서버. 각 노드 위에 실제로 배포되는 아티팩트도 표시.

## 구성 요소

| 요소 | 그림 |
| --- | --- |
| Node | 3D 박스 (육면체) |
| `<<device>>` | 물리/가상 머신 |
| `<<executionEnvironment>>` | OS·런타임 |
| Artifact | 박스 + 종이접기 아이콘 (또는 `<<artifact>>`) |
| Communication path | 노드 간 선, 라벨 = 프로토콜 |
| Deployment | 노드 내부에 artifact 배치 |

## 노드 안에 노드 — Nesting

<img src="/images/blog/uml/diagrams/item30-nested-execenv.svg" alt="중첩 실행환경 — Server > Linux > Docker" style="max-width:100%; background:white; padding:8px; border-radius:6px;" />

VM/컨테이너 토폴로지를 자연스럽게 표현.

## 통신 경로 표기

선 + 라벨:

```
WebServer ──HTTP/2──── AppServer ──gRPC──── PaymentSvc
            <<TCP>>                <<encrypted>>
```

선에 스테레오타입과 protocol·QoS·port 같은 정보를 표시.

## Cloud / Container 표기

UML 자체엔 클라우드 전용 표기가 없지만 스테레오타입으로 확장:

```
<<EC2>>
<<Lambda>>
<<S3 bucket>>
<<Kubernetes Pod>>
<<docker-container>>
```

도메인 어휘를 도입한 다이어그램이 운영팀과 소통에 훨씬 효과적.

## 좋은 배포 다이어그램의 조건

### 1. 노드 정체성 명확

`Server1`, `Server2` 같이 모호한 이름 ❌. **역할이 보이는 이름**: `web-1.tokyo.prod`, `db-primary`.

### 2. 환경별 다이어그램 따로

Production, Staging, Dev는 보통 다릅니다. **각 환경별 한 장씩**.

### 3. 통신 경로 라벨

선만 있고 아무 정보 없으면 운영에 도움 안 됨. **프로토콜·포트·인증**까지.

### 4. 스케일링 표시

여러 인스턴스가 동일한 경우:

```
<<device>> AppServer [3..10]
```

다중도로 인스턴스 수 범위 표시.

## 배포 시나리오 비교

### Monolith

```
[LB] → [Single App Server] → [DB]
```

### Microservices

<img src="/images/blog/uml/diagrams/item30-api-gateway-tree.svg" alt="API Gateway → 3 서비스 → 각자의 DB" style="max-width:100%; background:white; padding:8px; border-radius:6px;" />

### Serverless

```
[API Gateway] → [<<Lambda>>] → [<<DynamoDB>>]
```

각 패턴마다 배포 다이어그램의 모양이 확연히 다름. **아키텍처 의도가 시각적으로 드러납니다**.

## 자주 하는 실수

> ⚠️ 컴포넌트 다이어그램과 합치기

컴포넌트는 소프트웨어 단위, 노드는 하드웨어 단위. **분리**해서 그리고 manifestation으로 연결.

> ⚠️ 운영 환경 변화 무시

런타임에 변하는 배치(오토스케일, 카나리 배포)는 별도 시나리오 다이어그램이나 어노테이션으로.

> ⚠️ 보안 경계 누락

DMZ, VPC, 방화벽 등 보안 경계는 배포 다이어그램의 핵심 정보. **그루핑 박스**로 명시.

## 정리

- 배포 다이어그램은 **하드웨어 + 소프트웨어 배치**의 시각화.
- `<<device>>`, `<<executionEnvironment>>`로 노드 분류.
- 아티팩트가 실제 배포 단위 — 컴포넌트의 manifestation.
- 통신 경로엔 **프로토콜·QoS·보안** 라벨 필수.
- **환경별로** 다이어그램을 따로.

다음(Part 7, 마지막)편은 **시스템과 모델** — 모든 다이어그램을 한 모델로 묶고 마무리.
