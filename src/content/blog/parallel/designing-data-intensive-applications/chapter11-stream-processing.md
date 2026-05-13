---
title: "Ch 11: Stream 처리"
date: 2026-07-03T03:00:00
description: "Kafka, Flink, Storm. 무한 입력의 즉시 처리. Event time vs Processing time, Exactly-once semantics."
tags: [DDIA, Stream, Kafka, Flink, EventTime, ExactlyOnce]
series: "Designing Data-Intensive Applications"
seriesOrder: 11
---

## 이 챕터의 메시지

배치 처리는 **유한한 입력**을 가진다. 어제의 로그, 지난 분기의 거래 — 시작과 끝이 있다.

**Stream 처리**는 **무한한 입력**. 끝없이 들어오는 이벤트들을 즉시 처리.

```
Batch: [─────── 어제 데이터 ──────] → 처리 → 결과
Stream: ─────────────────────── (계속) ───────→
                ↓ 매 이벤트 즉시 처리
```

이게 점점 더 일반적인 데이터 처리 모델. 모던 시스템은 거의 모두 stream을 활용.

## Message Brokers — Stream의 인프라

이벤트를 produce / consume하는 시스템.

### AMQP-style (RabbitMQ, SQS)

```
Producer → Queue → Consumer
```

- 메시지 큐, 보통 한 consumer가 가져가면 사라짐
- Topic / queue routing
- 짧은 메시지 보관

### Log-Based (Kafka, AWS Kinesis)

```
Producer → Log → 여러 Consumer (각자 위치 추적)
```

- 메시지가 로그에 영구 저장
- 여러 consumer가 다른 속도로 읽음
- "Replayable" — 과거로 돌아가 다시 읽기

Kafka가 표준. 2010년대 데이터 인프라의 백본.

## Kafka 모델

```
Topic "orders":
  Partition 0: [msg1, msg2, msg3, ...]
  Partition 1: [msg1, msg2, msg3, ...]
  Partition 2: [msg1, msg2, msg3, ...]

Consumer Group "analytics":
  Consumer A → Partition 0, 1
  Consumer B → Partition 2

각 consumer는 자기 offset 추적:
  Consumer A on Partition 0: offset 1523
```

**핵심 특성**:

- 메시지는 append-only 로그
- Consumer offset이 진행 추적
- 같은 메시지를 여러 consumer가 독립적으로 read
- 매우 빠른 처리량 (수백만 msg/s)

## Event Sourcing

전통적 DB — **상태**를 저장.
Event sourcing — **이벤트**를 저장. 상태는 이벤트의 함수.

```
Traditional:
  Account { balance: 500 }

Event Sourcing:
  events = [
    Created("alice"),
    Deposited(1000),
    Withdrew(500),
  ]
  → balance = 1000 - 500 = 500
```

장점:
- 모든 변경의 감사 가능
- 시간 여행 (특정 시점의 상태)
- 새 view를 만들 때 같은 이벤트 다시 처리

CQRS (Command Query Responsibility Segregation)와 자주 결합.

## Stream Processing의 도구

### Apache Storm (2011)

초기 stream 처리 프레임워크. Topology — spout (입력) + bolt (처리).

이제 거의 사용 안 됨.

### Apache Spark Streaming

Spark의 micro-batch 방식.

```
무한 stream → 짧은 시간 단위 batch들 → Spark로 처리
```

지연: micro-batch 크기 (보통 수 초). True streaming보다 큼.

### Apache Flink

True streaming. 매 이벤트를 즉시 처리.

```
event arrives → process → emit
```

지연: ms 단위. 모던 stream의 표준 중 하나.

### Kafka Streams

Kafka 위의 라이브러리. 간단한 stream 처리는 별도 클러스터 없이.

```java
KStream<String, Order> orders = builder.stream("orders");
orders.filter((k, v) -> v.amount > 1000)
      .to("large-orders");
```

## 시간의 문제 — Event Time vs Processing Time

Stream의 가장 까다로운 부분.

**Event Time** — 이벤트가 실제로 발생한 시간.
**Processing Time** — stream processor가 이벤트를 받은 시간.

```
Event:        12:00:00 (실제 발생)
              ↓ network delay, queueing
Processing:   12:00:05 (도착)
```

5초 차이. 보통은 작지만 — 가끔 큰 차이 (네트워크 문제, 모바일 인터넷 등).

```
1시간 동안 클릭 수 = ?

Processing time 기준: 매시간 윈도우, 그 시간에 도착한 이벤트
Event time 기준: 실제 그 시간에 발생한 이벤트
```

비즈니스적으로는 보통 **event time**이 정답. 그러나 어렵다 — 늦게 도착하는 이벤트를 어떻게 처리?

### Watermark

"Event time T 이전의 이벤트는 모두 도착했다고 가정" — 그 시점이 watermark.

```
Watermark: 12:00:00
→ 12:00:00 이전 시간의 모든 이벤트 도착한 것으로 간주
→ 12:00:00의 윈도우 결과를 emit
```

너무 빠르면 — 늦은 이벤트 누락.
너무 느리면 — 결과 지연.

Trade-off. 보통 heuristic으로 결정.

## Window 종류

Stream을 어떻게 윈도우로 자를 것인가.

### Tumbling Window

```
[──5초──][──5초──][──5초──]
   W1      W2      W3
```

겹치지 않는 고정 윈도우.

### Hopping (Sliding) Window

```
[──5초──]
   [──5초──]
      [──5초──]
```

겹치는 윈도우. 같은 이벤트가 여러 윈도우에.

### Session Window

활동의 자연스러운 묶음. 5분 이상 비활성 → 새 session.

```
User clicks: 1:00, 1:01, 1:02 ┤── session 1
                              │ (gap > 5분)
User clicks: 1:30, 1:31       ┤── session 2
```

## Exactly-Once Semantics

가장 어려운 stream 보장.

**At-Most-Once** — 메시지가 0번 또는 1번 처리. 일부 loss 가능.
**At-Least-Once** — 1번 이상 처리. 중복 가능.
**Exactly-Once** — 정확히 1번 처리.

분산에서 진정한 exactly-once는 불가능 (8장의 양방향 실패). 그러나 **effectively exactly-once**는 가능:

1. At-least-once delivery + idempotent processing → 효과적으로 exactly-once
2. Transaction with offset commit (Kafka)

이게 Kafka Streams, Flink의 표준 접근.

## Stream과 Batch의 통합

전통적으로 — 별도 시스템. **Lambda Architecture**가 이 패턴.

```
batch processing (정확) ─┐
                         ├─ merged view
stream processing (빠름) ─┘
```

복잡함. 두 코드베이스 유지.

**Kappa Architecture** — 단일 stream 처리만. 배치는 stream의 특별 형태(빠른 처리, 큰 윈도우).

```
모든 데이터 → Kafka → stream processing
```

더 단순하지만 stream 도구의 성숙이 필요.

모던 트렌드 — Kappa 또는 stream-first.

## Stream의 응용

어떤 곳에 stream을 쓰는가.

- **실시간 분석** — 대시보드, 알람
- **이벤트 기반 마이크로서비스** — Kafka가 백본
- **Change Data Capture (CDC)** — DB 변경을 stream으로
- **머신러닝 — 실시간 예측, 학습
- **모니터링** — log / metric stream

## 정리

- Stream = 무한 입력의 즉시 처리
- **Message broker** — AMQP-style (큐) vs Log-based (Kafka)
- **Event Sourcing** — 상태 대신 이벤트 저장
- **Storm / Spark Streaming / Flink / Kafka Streams** — 처리 도구
- **Event time vs Processing time** — 시간의 어려움
- **Watermark** — 윈도우 emit 시점
- **Exactly-once** — at-least-once + idempotent로 effectively 달성
- **Lambda → Kappa** — stream-first 아키텍처

## 다음 장 예고

마지막 장 — **The Future of Data Systems**. 책 전체 회고와 미래 방향.

## 관련 항목

- [Ch 10: Batch](/blog/parallel/designing-data-intensive-applications/chapter10-batch-processing)
- [Ch 9: Consistency](/blog/parallel/designing-data-intensive-applications/chapter09-consistency-and-consensus) — exactly-once의 기반
- [AMP Ch 18: TM](/blog/parallel/parallel-principles/ch18-transactional-memory) — Event sourcing의 정신
