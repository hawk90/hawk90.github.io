---
title: "Ch 2: Architectures"
date: 2025-05-20T02:00:00
description: "분산 시스템 아키텍처 스타일 — 계층, P2P, 마이크로서비스, 자기 관리 시스템"
series: "Distributed Systems"
seriesOrder: 2
tags: [distributed-systems, architecture, layered, p2p, microservices]
draft: true
type: book-review
bookTitle: "Distributed Systems: Principles and Paradigms"
bookAuthor: "Maarten van Steen, Andrew S. Tanenbaum"
---

## 아키텍처 스타일

분산 시스템의 아키텍처는 **컴포넌트의 논리적 배치**와 **컴포넌트 간 상호작용**으로 정의된다.

### 계층 아키텍처 (Layered)

컴포넌트를 계층으로 조직. 각 계층은 아래 계층만 호출.

```
┌─────────────────────────────┐
│   애플리케이션 계층 (Layer N)  │
├─────────────────────────────┤
│   미들웨어 계층               │
├─────────────────────────────┤
│   OS/네트워크 계층            │
└─────────────────────────────┘
        호출 방향: ↓
```

**전형적인 3-티어**:

| 계층 | 역할 | 예 |
|------|------|-----|
| **프레젠테이션** | 사용자 인터페이스 | 웹 브라우저, 모바일 앱 |
| **비즈니스 로직** | 처리, 규칙 | 애플리케이션 서버 |
| **데이터** | 영속성 | 데이터베이스 |

### 객체 기반 스타일 (Object-Based)

각 컴포넌트가 객체. 객체 간 메서드 호출(RPC)로 통신.

```
┌─────────┐     RPC      ┌─────────┐
│ Object  │ ──────────▶  │ Object  │
│    A    │              │    B    │
└─────────┘              └─────────┘
     │                        │
     └────── RPC ─────────────┘
```

**특징**: 느슨한 결합, 캡슐화. 하지만 객체 찾기(naming)가 복잡.

### 자원 중심 아키텍처 (Resource-Centered)

**RESTful 아키텍처**: 모든 것이 자원(resource). HTTP 메서드로 조작.

```
자원: /users/123
- GET    → 조회
- PUT    → 전체 수정
- PATCH  → 부분 수정
- DELETE → 삭제
- POST   → 생성 (컬렉션에)
```

**원칙**:

| 원칙 | 설명 |
|------|------|
| **Stateless** | 서버가 클라이언트 상태를 저장하지 않음 |
| **Uniform Interface** | 일관된 인터페이스 (HTTP 메서드) |
| **Cacheable** | 응답을 캐시 가능 |
| **Layered** | 중간 계층(프록시, 로드밸런서) 허용 |

### 이벤트 기반 아키텍처 (Event-Based)

**발행-구독 (Publish-Subscribe)**: 이벤트 생산자와 소비자의 분리.

```
┌──────────┐     publish     ┌─────────────┐
│ Producer │ ───────────────▶│ Event Bus   │
└──────────┘                 │ (Broker)    │
                             └──────┬──────┘
                    subscribe       │
              ┌─────────────────────┼─────────────────────┐
              ▼                     ▼                     ▼
        ┌──────────┐          ┌──────────┐          ┌──────────┐
        │Consumer 1│          │Consumer 2│          │Consumer 3│
        └──────────┘          └──────────┘          └──────────┘
```

**장점**: 느슨한 결합, 비동기, 확장성.
**단점**: 디버깅 어려움, 이벤트 순서 문제.

---

## 미들웨어 조직

미들웨어는 OS와 애플리케이션 사이에서 분산을 추상화한다.

### 래퍼 (Wrapper)

레거시 컴포넌트를 표준 인터페이스로 감싼다.

```
┌──────────────────┐
│     Client       │
└────────┬─────────┘
         │ 표준 인터페이스
         ▼
┌──────────────────┐
│     Wrapper      │ ← 변환
└────────┬─────────┘
         │ 레거시 인터페이스
         ▼
┌──────────────────┐
│ Legacy Component │
└──────────────────┘
```

### 인터셉터 (Interceptor)

요청/응답 경로에서 추가 처리 수행.

```
Client ──▶ Interceptor ──▶ Service
                │
                └── 로깅, 인증, 암호화 등
```

**예**: 서비스 메시의 사이드카 프록시 (Envoy, Istio).

### 수정 가능한 미들웨어 (Modifiable Middleware)

런타임에 동작을 변경할 수 있는 미들웨어.

```
기법:
- 플러그인/모듈 동적 로딩
- 설정 기반 동작 변경
- 리플렉션으로 컴포넌트 교체
```

---

## 시스템 아키텍처

논리 아키텍처를 **물리적 머신에 배치**하는 방법.

### 중앙집중식 (Centralized)

**클라이언트-서버 모델**:

```
┌──────────┐         ┌──────────┐
│ Client 1 │────────▶│          │
└──────────┘         │          │
┌──────────┐         │  Server  │
│ Client 2 │────────▶│          │
└──────────┘         │          │
┌──────────┐         │          │
│ Client N │────────▶│          │
└──────────┘         └──────────┘
```

**멀티티어**:

```
Thin Client ─▶ App Server ─▶ DB Server

티어 분할:
- 2-tier: 클라이언트 + 서버
- 3-tier: 프레젠테이션 + 로직 + 데이터
- N-tier: 더 세분화
```

### 분산식: P2P (Decentralized)

모든 노드가 클라이언트이자 서버.

**구조화된 P2P (Structured)**:

```
DHT (Distributed Hash Table):
- 키를 해시하여 담당 노드 결정
- Chord, Kademlia, Pastry
```

**비구조화된 P2P (Unstructured)**:

```
- 랜덤 연결
- 검색: 플러딩, 랜덤 워크
- 예: Gnutella
```

**슈퍼피어 (Super-peer)**:

```
일반 피어 ◀──▶ 슈퍼피어 ◀──▶ 슈퍼피어 ◀──▶ 일반 피어
                  │
               인덱스 유지

슈퍼피어가 인덱스를 관리하여 검색 효율화
```

### 하이브리드 (Hybrid)

중앙집중과 P2P를 혼합.

**예: BitTorrent**:

```
1. 트래커(중앙)에서 피어 목록 획득
2. 피어 간 직접 데이터 교환 (P2P)
```

**예: CDN (Content Delivery Network)**:

```
Origin Server (중앙)
       │
       ▼
┌─────────────────────────────┐
│       CDN Edge Servers      │ ← 지리적 분산
└─────────────────────────────┘
       │
       ▼
     Users
```

---

## 마이크로서비스 아키텍처

모놀리식을 작은 서비스들로 분해.

```
모놀리식:
┌─────────────────────────────────┐
│   UI + Logic + Data 모두 하나    │
└─────────────────────────────────┘

마이크로서비스:
┌─────────┐  ┌─────────┐  ┌─────────┐
│ User    │  │ Order   │  │ Payment │
│ Service │  │ Service │  │ Service │
└────┬────┘  └────┬────┘  └────┬────┘
     │            │            │
     └────────────┴────────────┘
              API Gateway
```

**특징**:

| 특징 | 설명 |
|------|------|
| **독립 배포** | 각 서비스 개별 배포 |
| **기술 다양성** | 서비스마다 다른 언어/DB 가능 |
| **탄력성** | 일부 서비스 장애가 전체에 영향 적음 |
| **복잡성** | 서비스 간 통신, 분산 트랜잭션 |

**서비스 메시 (Service Mesh)**:

```
┌─────────────────────┐
│ Service A           │
│ ┌─────────────────┐ │
│ │ App   │ Sidecar │ │
│ └───────┴─────────┘ │
└─────────────────────┘
        │ ▲
        ▼ │ mTLS, 로드밸런싱, 관측성
┌─────────────────────┐
│ Service B           │
│ ┌─────────────────┐ │
│ │ App   │ Sidecar │ │
│ └───────┴─────────┘ │
└─────────────────────┘
```

---

## 자기 관리 분산 시스템

**자율 컴퓨팅 (Autonomic Computing)**: 시스템이 스스로 관리.

### 피드백 제어 루프

```
          measure
    ┌────────────────┐
    │                ▼
┌───────┐      ┌──────────┐      ┌─────────┐
│Managed│◀─────│Controller│◀─────│Reference│
│System │      │(analyze, │      │(목표값)  │
└───────┘      │ plan,    │      └─────────┘
    ▲          │ execute) │
    │          └──────────┘
    └─────── actuate
```

**MAPE-K 루프**:

| 단계 | 설명 |
|------|------|
| **Monitor** | 시스템 상태 수집 |
| **Analyze** | 이상 감지, 예측 |
| **Plan** | 조치 계획 수립 |
| **Execute** | 계획 실행 |
| **Knowledge** | 공유 지식 베이스 |

### 자기 관리 속성

| 속성 | 설명 |
|------|------|
| **Self-configuring** | 환경 변화에 자동 적응 |
| **Self-healing** | 장애 감지 및 복구 |
| **Self-optimizing** | 성능 자동 튜닝 |
| **Self-protecting** | 보안 위협 대응 |

---

## 정리

- **아키텍처 스타일**: 계층, 객체 기반, RESTful, 이벤트 기반
- **시스템 아키텍처**: 중앙집중(클라이언트-서버), P2P, 하이브리드
- **마이크로서비스**: 독립 배포 가능한 작은 서비스들
- **자기 관리**: 피드백 루프로 자율 운영

---

## 핵심 비교

| 스타일 | 결합도 | 확장성 | 복잡성 |
|--------|--------|--------|--------|
| 모놀리식 | 높음 | 낮음 | 낮음 |
| 클라이언트-서버 | 중간 | 중간 | 중간 |
| P2P | 낮음 | 높음 | 높음 |
| 마이크로서비스 | 낮음 | 높음 | 높음 |

---

## 관련 항목

- [Ch 1: Introduction](/blog/parallel/distributed-systems-tanenbaum/chapter01-introduction) — 분산 시스템 기초
- [Ch 3: Processes](/blog/parallel/distributed-systems-tanenbaum/chapter03-processes) — 프로세스와 스레드
- [Clean Architecture Ch 22: Clean Architecture](/blog/programming/design/clean-architecture/chapter22-the-clean-architecture) — 계층 아키텍처
- [DDIA Ch 1](/blog/parallel/designing-data-intensive-applications/chapter01-reliable-scalable-maintainable) — 확장성
