---
title: "Ch 4: Communication"
date: 2025-05-20T04:00:00
description: "RPC, 메시지 지향 통신, 멀티캐스트 — 분산 시스템의 통신 기초"
series: "Distributed Systems"
seriesOrder: 4
tags: [distributed-systems, rpc, message-queue, multicast, communication]
draft: true
type: book-review
bookTitle: "Distributed Systems: Principles and Paradigms"
bookAuthor: "Maarten van Steen, Andrew S. Tanenbaum"
---

## 통신의 기초

분산 시스템의 핵심은 **프로세스 간 통신 (IPC)**.

### 프로토콜 계층

```
┌──────────────────────────────┐
│     애플리케이션 프로토콜      │  HTTP, gRPC, AMQP
├──────────────────────────────┤
│     미들웨어 프로토콜         │  RPC, MOM
├──────────────────────────────┤
│     전송 계층                │  TCP, UDP
├──────────────────────────────┤
│     네트워크 계층            │  IP
└──────────────────────────────┘
```

### 통신 유형

| 유형 | 동기성 | 지속성 | 예 |
|------|--------|--------|-----|
| **Transient Synchronous** | 동기 | 일시 | RPC, HTTP |
| **Transient Asynchronous** | 비동기 | 일시 | UDP |
| **Persistent Synchronous** | 동기 | 지속 | 보장 전달 |
| **Persistent Asynchronous** | 비동기 | 지속 | 메시지 큐 |

```
Transient: 양쪽 모두 실행 중이어야 통신
Persistent: 수신자가 없어도 메시지 저장
Synchronous: 응답까지 블로킹
Asynchronous: 보내고 바로 리턴
```

---

## 원격 프로시저 호출 (RPC)

**RPC**는 원격 함수를 로컬처럼 호출하는 추상화.

### 기본 RPC 동작

```
Client                              Server
  │                                   │
  │  1. 로컬 함수처럼 호출              │
  │  result = add(3, 5)               │
  │      │                            │
  │      ▼                            │
  │  ┌───────────┐                    │
  │  │Client Stub│ 2. 마샬링           │
  │  └─────┬─────┘                    │
  │        │                          │
  │        ▼  3. 네트워크 전송          │
  │  ═══════════════════════════════▶ │
  │                                   │
  │                            ┌──────┴──────┐
  │                            │ Server Stub │
  │                            │ 4. 언마샬링  │
  │                            └──────┬──────┘
  │                                   │
  │                            5. 실제 함수 실행
  │                            result = add(3,5)
  │                                   │
  │  ◀═══════════════════════════════ │
  │        6. 결과 반환                │
  │                                   │
```

### 파라미터 전달

**마샬링 (Marshalling)**: 데이터를 전송 가능한 형태로 변환.

```
문제:
- 바이트 순서 (빅엔디안/리틀엔디안)
- 데이터 표현 (int 크기, 포인터)
- 복잡한 타입 (구조체, 객체)

해결:
- IDL (Interface Definition Language)
- 직렬화 포맷 (Protocol Buffers, JSON, XML)
```

**값 전달 vs 참조 전달**:

| 방식 | 장점 | 단점 |
|------|------|------|
| **값 전달** | 단순 | 큰 데이터 비효율 |
| **참조 전달** | 효율적 | 분산 환경에서 불가능 |
| **Copy-Restore** | 타협안 | 부분적 참조 의미 |

### RPC의 변형

**동기 RPC**:
```
클라이언트가 응답까지 블로킹
request ──────▶
              waiting...
        ◀────── response
```

**비동기 RPC**:
```
요청 후 바로 리턴, 나중에 결과 획득
request ──────▶
        ◀────── ack (바로)
...다른 작업...
poll/callback ──▶ result
```

**단방향 RPC (One-way)**:
```
응답 없음
request ──────▶
(끝)
```

### 현대 RPC 프레임워크

| 프레임워크 | 특징 |
|-----------|------|
| **gRPC** | HTTP/2, Protocol Buffers, 스트리밍 |
| **Apache Thrift** | 다중 언어, 다중 프로토콜 |
| **JSON-RPC** | 단순, HTTP 기반 |

---

## 메시지 지향 통신 (MOM)

RPC는 **동기적**, MOM은 **비동기적** 통신.

### 단순 트랜지언트 메시징

**소켓 (Socket)**:

```
서버:
socket() → bind() → listen() → accept() → recv()/send() → close()

클라이언트:
socket() → connect() → send()/recv() → close()
```

```
┌────────────┐                    ┌────────────┐
│   Client   │                    │   Server   │
│  socket()  │                    │  socket()  │
│  connect() │ ─────TCP SYN─────▶ │  bind()    │
│            │ ◀────TCP ACK────── │  listen()  │
│  send()    │ ─────data────────▶ │  accept()  │
│            │                    │  recv()    │
│  recv()    │ ◀────response───── │  send()    │
│  close()   │                    │  close()   │
└────────────┘                    └────────────┘
```

### 메시지 큐 시스템

**지속적 비동기 통신**을 제공.

```
┌──────────┐     put      ┌─────────────┐     get      ┌──────────┐
│ Producer │ ───────────▶ │   Queue     │ ───────────▶ │ Consumer │
└──────────┘              │ (Persistent)│              └──────────┘
                          └─────────────┘
                          메시지 저장 (수신자 없어도)
```

**특징**:

| 특징 | 설명 |
|------|------|
| **비동기** | 송신자는 수신자 상태 무관 |
| **지속성** | 메시지가 큐에 저장 |
| **분리** | 송수신자 독립적 |
| **부하 평준화** | 급증하는 요청 버퍼링 |

**예**: RabbitMQ, Apache Kafka, Amazon SQS.

### 메시지 브로커

메시지를 **라우팅, 변환, 필터링**하는 중개자.

```
┌──────────┐         ┌─────────────────────────┐         ┌──────────┐
│Producer A│────────▶│                         │────────▶│Consumer 1│
└──────────┘         │    Message Broker       │         └──────────┘
┌──────────┐         │  - 라우팅 (topic/queue) │         ┌──────────┐
│Producer B│────────▶│  - 형식 변환            │────────▶│Consumer 2│
└──────────┘         │  - 필터링               │         └──────────┘
                     └─────────────────────────┘
```

**토픽 기반 라우팅**:

```
Producer → publish("orders.created", message)

Broker:
  - "orders.*" 구독자에게 전달
  - "orders.created" 정확 매칭 구독자에게 전달
```

---

## 멀티캐스트 통신

**하나의 메시지를 여러 수신자에게 전달**.

### 애플리케이션 레벨 멀티캐스트

IP 멀티캐스트가 없어도 애플리케이션에서 구현.

```
오버레이 네트워크:
┌────┐       ┌────┐       ┌────┐
│ A  │───────│ B  │───────│ C  │
└─┬──┘       └─┬──┘       └─┬──┘
  │            │            │
  └────────────┴────────────┘
          논리적 연결 (오버레이)
          ─ ─ ─ ─ ─ ─ ─ ─ ─
          물리적 네트워크
```

**트리 기반 멀티캐스트**:

```
       ┌────┐
       │Root│ ← 소스
       └─┬──┘
    ┌────┴────┐
    ▼         ▼
  ┌────┐   ┌────┐
  │ A  │   │ B  │
  └─┬──┘   └─┬──┘
  ┌─┴─┐   ┌─┴─┐
  ▼   ▼   ▼   ▼
┌──┐┌──┐┌──┐┌──┐
│C ││D ││E ││F │
└──┘└──┘└──┘└──┘
```

### 가십 기반 데이터 전파 (Gossip/Epidemic)

**랜덤하게 피어를 선택하여 정보 전파**.

```
라운드 1:
A가 B, C에게 전파
A● ──▶ B●
   ──▶ C●

라운드 2:
B가 D, E에게, C가 F, G에게
A● B● ──▶ D●
      ──▶ E●
   C● ──▶ F●
      ──▶ G●

...지수적으로 퍼짐...
```

**특징**:

| 특징 | 설명 |
|------|------|
| **확장성** | O(log N) 라운드로 전체 전파 |
| **내결함성** | 일부 노드 장애에도 전파 |
| **최종 일관성** | 모든 노드가 결국 같은 정보 |
| **비결정적** | 전파 시간 예측 어려움 |

**변형**:

```
Push: 정보를 능동적으로 전파
Pull: 다른 노드에게 정보 요청
Push-Pull: 양방향 교환
```

---

## 정리

- **RPC**: 원격 호출을 로컬처럼 (동기, 일시)
- **MOM**: 메시지 큐 기반 비동기 통신 (비동기, 지속)
- **멀티캐스트**: 하나 → 다수 전달
- **가십**: 확장성 있는 정보 전파

---

## 핵심 비교

| 통신 방식 | 동기성 | 결합도 | 사용 사례 |
|----------|--------|--------|----------|
| RPC/gRPC | 동기 | 높음 | 마이크로서비스 호출 |
| Message Queue | 비동기 | 낮음 | 작업 큐, 이벤트 |
| Pub/Sub | 비동기 | 낮음 | 알림, 로그 |
| Gossip | 비동기 | 없음 | 멤버십, 장애 감지 |

---

## 관련 항목

- [Ch 3: Processes](/blog/parallel/distributed-systems-tanenbaum/chapter03-processes) — 프로세스와 스레드
- [Ch 5: Naming](/blog/parallel/distributed-systems-tanenbaum/chapter05-naming) — 서비스 찾기
- [DDIA Ch 4: Encoding and Evolution](/blog/parallel/designing-data-intensive-applications/chapter04-encoding-and-evolution) — 직렬화
- [Seven Models Ch 4: Actors](/blog/parallel/seven-concurrency-models/ch04-actors) — 메시지 패싱
