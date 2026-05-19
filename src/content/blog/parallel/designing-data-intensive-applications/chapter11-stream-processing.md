---
title: "Ch 11: Stream 처리"
date: 2026-05-12T11:00:00
description: "Kafka, Flink, Storm. 무한 입력의 즉시 처리. Event time vs Processing time, Exactly-once semantics."
tags: [DDIA, Stream, Kafka, Flink, EventTime, ExactlyOnce]
series: "Designing Data-Intensive Applications"
seriesOrder: 11
draft: true
---

## 이 챕터의 메시지

배치 처리는 **유한한 입력**을 가진다. 어제의 로그, 지난 분기의 거래 — 시작과 끝이 있다.

**Stream 처리**는 **무한한 입력**이다. 끝없이 들어오는 이벤트들을 즉시 처리한다.

```text
Batch:  [─────── 어제 데이터 ──────] → 처리 → 결과

Stream: ─────────────────────── (계속) ───────→
                ↓ 매 이벤트 즉시 처리
```

차이점을 모아보면.

| 측면 | Batch | Stream |
|---|---|---|
| 입력 | 유한 | 무한 |
| 지연 | 분~시간 | ms~초 |
| 출력 | 한 번 | 연속 |
| 재실행 | 자유 | 어렵다 |
| 시간 의미 | 처리 시점 | event time이 중요 |

이게 점점 더 일반적인 데이터 처리 모델이다. 모던 시스템은 거의 모두 stream을 활용한다. 알람, 추천, 사기 탐지, 실시간 대시보드, change data capture — 모두 stream이다.

### 일상 비유 — 강물

배치는 댐의 물이다. 모아 두었다가 한꺼번에 처리한다. 시작과 끝이 명확하다.

Stream은 흐르는 강물이다. 끝이 없다. 강을 *측정*하려면 한 지점에 머물러 흘러가는 물을 관찰해야 한다. 댐처럼 다 모이길 기다릴 수 없다.

이 장 전체에 강물 비유가 도움된다. 뒤에 나올 *watermark* 도 강의 수위계처럼 동작한다.

## Message Brokers — Stream의 인프라

이벤트를 produce/consume하는 시스템이 **메시지 브로커**다. 두 큰 갈래가 있다.

### AMQP-style / JMS — 전통적 메시지 큐 (RabbitMQ, ActiveMQ, AWS SQS)

```text
Producer → Queue → Consumer
              (배달 후 삭제)
```

특성.

- **AMQP**(Advanced Message Queuing Protocol), **JMS**(Java Message Service)가 대표 표준.
- 메시지 큐 모델. 보통 한 consumer가 가져가면 큐에서 사라진다(or ACK 후 삭제).
- 짧은 메시지 보관. 큐는 buffer 역할이지 storage가 아니다.
- Topic/queue routing — exchange, binding, routing key.
- **Push 모델** — 브로커가 consumer로 메시지를 적극 보낸다.

```text
RabbitMQ exchange types:
  - direct: routing key 정확 일치
  - topic: pattern matching (us.*.orders)
  - fanout: 모든 binding으로 broadcast
```

장점. 짧은 작업 큐(work queue)에 적합. consumer가 처리하면 사라지니 깔끔.

단점. 한 번 consume된 메시지는 사라진다. 새 consumer를 붙여 과거를 다시 읽을 수 없다.

### Log-Based — 로그 기반 (Kafka, AWS Kinesis, Apache Pulsar)

```text
Producer → Log (append-only) → 여러 Consumer Group
              ↓ 메시지는 사라지지 않음
          [m0][m1][m2][m3][m4][m5]...
                  ↑       ↑
                  C1      C2
              (각자 offset 추적)
```

특성.

- 메시지가 **append-only 로그**에 영구(또는 retention 기간 동안) 저장.
- 여러 consumer가 *다른 속도로 독립적으로* 읽는다.
- **Replayable** — 과거 offset으로 돌아가 다시 읽기 가능.
- **Pull 모델** — consumer가 자기 페이스로 읽는다.

이게 stream 처리의 결정적 인프라가 된 이유다. *replay*가 가능하면.

- 새 consumer를 붙여 과거의 모든 이벤트를 처음부터 처리할 수 있다.
- 처리 로직이 바뀌면 다시 돌려 새 결과 만들기 가능.
- Materialized view를 stream에서 빌드할 수 있다.

Kafka가 표준이다. 2010년대 데이터 인프라의 백본. LinkedIn이 만들어 Apache로 기증.

### 일상 비유

AMQP-style은 **택배 시스템**과 같다. 한 번 배달되면 끝. 다시 받으려면 새로 보내야 한다.

Log-based는 **신문 인쇄소의 영구 보관함**과 같다. 신문이 발행되면 보관함에 영구히 쌓인다. 새 구독자가 와도 1면부터 다시 읽을 수 있다.

## Kafka 모델 — 자세히

```text
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

**핵심 개념**.

- **Topic** — 논리적 stream. "orders", "user-clicks" 같은 단위.
- **Partition** — topic을 물리적으로 나눈 단위. 각 partition은 append-only 로그.
- **Offset** — partition 안에서 메시지 위치. 단조 증가.
- **Consumer Group** — 같은 그룹의 consumer들이 partition을 나눠 가짐. 다른 그룹은 독립.
- **Replication** — 각 partition을 N개 broker에 복제. leader + followers.

### Partition 안에서의 순서

같은 partition 안에서는 순서가 보장된다. 다른 partition 사이는 보장 없음.

```text
Producer가 같은 user_id로 partition key 지정
→ 같은 user의 이벤트는 항상 같은 partition
→ 그 user에 대해서는 순서 보장
```

이게 stream 처리에서 *partitioned consistency*의 기본이다. 5장의 partitioning 개념과 같다.

### 성능 특성

Kafka는 매우 빠르다. 단일 클러스터에서 수백만 msg/s 처리.

- 디스크에 순차 쓰기(append-only) — 회전 디스크에서도 빠름.
- Zero-copy — sendfile(2) syscall로 page cache → socket 직접 전송.
- Batch — producer가 메시지를 모아 전송.

## Change Data Capture (CDC) — DB를 stream으로

DDIA가 강조하는 패턴. 전통적 DB와 stream 세계를 연결하는 다리다.

### 무엇인가

DB의 모든 변경(INSERT, UPDATE, DELETE)을 stream으로 흘려보낸다.

```text
PostgreSQL → CDC → Kafka topic "db_changes"
                       ↓
            ┌──────────┼──────────┐
            ↓          ↓          ↓
       Elasticsearch  Cache    분석 DB
```

원본 DB는 그대로 작동. 변경이 stream으로 derived 시스템으로 흘러간다.

### 어떻게 구현하나

DB의 **write-ahead log(WAL)** 또는 replication log를 읽는다.

- **PostgreSQL** — logical replication, `wal2json`/`pgoutput` plugin.
- **MySQL** — binlog (binary log).
- **MongoDB** — oplog.
- **SQL Server** — CDC feature.

이걸 읽어 Kafka로 publish하는 도구가 **Debezium**이다. 모던 데이터 스택의 표준 컴포넌트.

```text
PostgreSQL WAL → Debezium → Kafka Connect → Kafka topic
```

### CDC가 해결하는 문제

전통적 ETL의 *batch refresh* 문제.

```text
전통적: 매일 새벽 1시에 DB 전체 dump → 분석 DB
        → 하루치 늦은 데이터
        → DB 부하 큼 (대량 read)

CDC:    실시간 stream
        → 초 단위 지연
        → DB는 정상 작동, replication log만 read
```

### Event Sourcing — 비슷하지만 다른 패턴

CDC와 자주 혼동되는 개념. **Event Sourcing**.

전통적 DB는 **상태(state)** 를 저장한다.
Event sourcing은 **이벤트(event)** 를 저장한다. 상태는 이벤트의 함수다.

```text
Traditional:
  Account { balance: 500 }
  (현재 잔고만 저장)

Event Sourcing:
  events = [
    AccountCreated("alice"),
    Deposited(1000),
    Withdrew(500),
  ]
  → 현재 balance = fold(events) = 1000 - 500 = 500
```

장점.

- **모든 변경의 감사** 가능. 누가 언제 무엇을 했는지 영구 기록.
- **시간 여행** — 특정 시점의 상태 재구성 가능.
- **새 view** — 같은 이벤트를 새 로직으로 다시 처리해 새 derived data 생성.
- **디버깅** — 버그 재현이 쉬움. 이벤트 다시 돌리면 됨.

CQRS(Command Query Responsibility Segregation)와 자주 결합. 쓰기는 이벤트로, 읽기는 derived view로.

### CDC vs Event Sourcing

| 측면 | CDC | Event Sourcing |
|---|---|---|
| Source of truth | DB의 현재 상태 | 이벤트 로그 |
| 이벤트 의미 | DB 변경의 결과 | 도메인 의도(*"order placed"*) |
| 적용 시점 | 기존 시스템에 추가 | 처음부터 설계 |
| 복잡도 | 낮음 | 높음(스냅숏, snapshotting) |

CDC는 *현재* 만들어 쓸 수 있다. Event sourcing은 *처음부터* 그렇게 짜야 한다.

## Event Sourcing 더 자세히

위에서 개념을 살펴봤다. 운영 측면을 더 본다.

### 스냅숏

이벤트가 수백만 개 쌓이면 매번 처음부터 fold하는 건 비싸다. **스냅숏(snapshot)** 이 답이다.

```text
events: [e1, e2, ..., e1000]
snapshot @ e1000: { balance: 5000 }

events: [e1001, e1002, ..., e1234]
현재 상태 = snapshot + fold(e1001..e1234)
```

주기적으로 스냅숏을 만들어 두면 fold 비용이 한정된다.

### Immutable events

이벤트는 **불변**이어야 한다. 한번 쓰면 수정하지 않는다.

```text
잘못된 패턴:
  evt.amount = 600  ← 절대 X

올바른 패턴:
  새 이벤트 추가: WithdrawalAdjusted(evt_id, new_amount=600)
```

이게 audit log의 본질이다.

### 시스템 사례

- **Axon Framework**(Java) — event sourcing + CQRS 프레임워크.
- **EventStoreDB** — 전용 event store DB.
- **Kafka + Materialize**(또는 ksqlDB) — Kafka가 event log, materialize가 derived view.

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

장점. 별도 인프라 없음. JVM 앱 안에서 stream 처리.

단점. JVM 한정. 복잡한 join, 큰 상태에는 부족할 수 있음.

### ksqlDB

Kafka Streams를 SQL로 쓸 수 있게 한 도구. Confluent가 만듦.

```sql
CREATE STREAM orders (id INT, amount DOUBLE)
  WITH (KAFKA_TOPIC='orders', VALUE_FORMAT='JSON');

CREATE STREAM large_orders AS
  SELECT * FROM orders WHERE amount > 1000;
```

분석가도 stream을 다룰 수 있게 한 시도.

### Materialize

PostgreSQL-compatible streaming SQL DB. CDC + materialize view + Kafka 통합.

```sql
CREATE MATERIALIZED VIEW order_totals AS
  SELECT user_id, SUM(amount) AS total
  FROM orders
  GROUP BY user_id;
```

이 view가 *언제 query해도 최신*. 내부적으로 stream 처리로 incremental update.

### Apache Pulsar

Kafka와 비슷한 log-based 브로커. 차이점.

- **Tiered storage** — 오래된 메시지를 S3로 자동 이동.
- **Multi-tenancy** — 한 클러스터에 여러 조직.
- **Geo-replication** — 내장.

Kafka의 대안으로 일부 조직에서 채택.

## Stream-X Join — stream에서의 결합

배치 join을 stream에서 하는 건 *어렵다*. 한쪽 또는 양쪽이 무한이기 때문에. 세 종류로 나눈다.

### Stream-Stream Join

두 stream이 같이 흐를 때. 클릭과 노출(impression)을 합쳐 CTR 계산하는 경우.

```text
Impression stream: "광고 X가 user A에게 11:00:00에 노출됨"
Click stream:      "user A가 광고 X를 11:00:03에 클릭함"
                                    ↓
Joined: "Impression+Click within 5min window"
```

**시간 윈도우 안에서만 join**. 무한 stream이므로 영원히 메모리에 들고 있을 수 없다.

```sql
-- Flink SQL 예
SELECT i.ad_id, i.user_id, c.click_time
FROM impressions i, clicks c
WHERE i.ad_id = c.ad_id
  AND i.user_id = c.user_id
  AND c.click_time BETWEEN i.imp_time AND i.imp_time + INTERVAL '5' MINUTE
```

### Stream-Table Join

Stream + 비교적 정적인 테이블. 클릭에 사용자 프로필을 붙이는 경우.

```text
Click stream:   "user_id=42 clicked on X"
User table:     user_id → { name, country, age, ... }
                            ↓
Joined:         enriched click event
```

**구현**.

- 테이블을 stream processor의 로컬 상태에 들고 있는다.
- 테이블 변경은 별도 CDC stream으로 받아 로컬 상태 갱신.

이게 stream processor가 *상태(state)* 를 가지는 핵심 이유다. RocksDB 등을 백엔드로 쓴다.

### Table-Table Join

두 테이블의 변경 stream을 합쳐 derived 테이블 만들기.

```text
User stream changes  ─┐
                      ├─→ Joined materialized view
Order stream changes ─┘
```

Materialized view의 증분 갱신과 같은 패턴. ksqlDB, Materialize, Flink Table API가 지원.

### 시간 의존성

Stream join에서 *언제*가 결정적이다.

- Stream-stream: 두 이벤트가 *같은 윈도우 안*에 들어와야.
- Stream-table: stream 이벤트의 *event time 시점*의 테이블 상태와 join해야 reproducible.

이게 다음 절의 *event time vs processing time* 으로 이어진다.

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

### Watermark — 강의 수위계

"Event time T 이전의 이벤트는 모두 도착했다고 가정" — 그 시점이 **watermark**다.

```text
Watermark: 12:00:00
→ 12:00:00 이전 시간의 모든 이벤트 도착한 것으로 간주
→ 12:00:00의 윈도우 결과를 emit
```

### 일상 비유 — 강의 수위계

강가에 수위계가 있다. *지금* 수위가 1.5m라고 적혀 있다고 하자. 이게 watermark다.

- 수위계는 *상류에서 흘러온 물*의 흔적이다. 멀리 상류의 물은 시간이 지나야 여기 도달한다.
- 수위계가 "지금 1.5m"라면, 1.5m보다 *낮은 수위에서 출발한 물*은 (대부분) 이미 도착했다고 본다.

Stream에서 같다. watermark가 12:00을 가리키면, 12:00 이전의 *event time*을 가진 이벤트는 *거의 다* 도착했다고 가정한다.

### Trade-off

너무 빠른 watermark — 늦은 이벤트 누락.

```text
Event time 11:59:30의 이벤트가 12:01에 도착했는데
watermark가 12:00에 이미 통과 → 이 이벤트 처리 못 함
```

너무 느린 watermark — 결과 지연.

```text
watermark가 모든 이벤트의 도착 보장까지 기다림
→ 결과 emit이 10분, 1시간 지연
```

Trade-off다. 보통 heuristic으로 결정.

- **Bounded delay** — "이벤트는 발생 후 5분 안에 도착"이라고 가정. watermark = current event time - 5분.
- **Late event 별도 처리** — watermark는 빠르게, 늦은 이벤트는 *side output*으로 별도 stream에.

### Late arrival 처리

Late event를 어떻게 다룰지가 stream 시스템의 정책 결정이다.

- **Drop** — 무시.
- **Reprocess** — 윈도우 결과를 다시 emit (수정 메시지).
- **Side output** — 별도 stream으로 보관, 나중에 처리.

Apache Beam은 *triggers* + *allowed lateness*로 이걸 명시적으로 모델링한다.

```python
# Beam 예
window = beam.window.FixedWindows(60)  # 1분 윈도우
trigger = AfterWatermark(early=AfterProcessingTime(10),
                          late=AfterCount(1))
# 처리 시간 10초마다 early result, 늦은 이벤트마다 update
```

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

## Exactly-Once Semantics — 가장 어려운 보장

Stream 처리의 가장 까다로운 부분이다.

**세 가지 delivery semantics**.

- **At-Most-Once** — 메시지가 0번 또는 1번 처리. 일부 loss 가능.
- **At-Least-Once** — 1번 이상 처리. 중복 가능.
- **Exactly-Once** — 정확히 1번 처리.

### 왜 어려운가

분산에서 진정한 exactly-once는 *불가능*에 가깝다. 8장의 양방향 실패 — 메시지 보낸 쪽도, 받은 쪽도 결과를 확신할 수 없는 상황 — 가 근본 원인이다.

```text
Consumer가 메시지 처리
→ DB에 쓰기
→ Kafka에 offset commit
        ↓
어디서든 실패 가능. 재시작 후 처리됐는지 모름.
```

### Idempotence — 가장 실용적 답

**Effectively exactly-once**가 가능하다. *at-least-once delivery + idempotent processing* 의 조합.

```python
# 멱등하지 않은 처리
def process(event):
    balance += event.amount  # 중복 시 두 번 더해짐

# 멱등 처리
def process(event):
    if not seen(event.id):
        balance += event.amount
        mark_seen(event.id)
```

이게 11장의 핵심 가르침. **분산에서는 idempotence가 더 강력하다**.

### Kafka Transactions

Kafka 0.11(2017)에서 도입한 **transactional producer**. 한 트랜잭션으로.

- 여러 partition에 atomic write.
- consumer offset commit과 새 메시지 produce를 atomic으로.

이걸로 *read → process → write → commit* 사이클이 atomic이 된다.

```java
producer.beginTransaction();
producer.send(record1);
producer.send(record2);
producer.sendOffsetsToTransaction(offsets, consumerGroupId);
producer.commitTransaction();
```

Kafka Streams가 이 기반으로 exactly-once 보장.

### Flink Checkpointing

Flink는 다른 접근 — **distributed snapshot**.

```text
주기적으로 checkpoint barrier를 stream에 삽입
→ 각 operator가 barrier 도달 시점의 상태 snapshot
→ 모든 operator의 snapshot이 한 checkpoint
→ 실패 시 마지막 checkpoint로 복구
```

이 알고리즘이 Chandy-Lamport snapshot의 변형. 2-phase commit과 결합해 exactly-once 출력.

### 한계 인정

"Exactly-once"는 marketing 용어이기도 하다. 실제로는 *effectively exactly-once* — *at-least-once + idempotence* 조합. 외부 시스템(DB 등)으로의 side effect까지 진정 exactly-once는 어렵다.

가장 실용적 답. *처리는 멱등하게 만들고, retry는 안전하게 가능하게 한다*.

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

- **실시간 분석** — 대시보드, 알람.
- **이벤트 기반 마이크로서비스** — Kafka가 service-to-service 통신 백본.
- **Change Data Capture(CDC)** — DB 변경을 stream으로 흘려 derived 시스템 갱신.
- **머신러닝** — 실시간 예측, online learning, feature pipeline.
- **모니터링** — log/metric stream → 알람.
- **사기 탐지(fraud detection)** — 결제 stream에서 패턴 매칭.
- **추천** — 사용자 행동 stream → 실시간 추천 갱신.
- **IoT** — 센서 데이터 stream.

## 작은 예시 — 실시간 사기 탐지

전체 개념을 묶는 현실적 예. 카드 결제 stream에서 *5분 안에 3국 이상에서 사용된 카드*를 탐지한다.

```sql
-- Kafka topic: payments
-- 필드: card_id, country, amount, timestamp (event time)

-- Flink SQL
CREATE TABLE payments (
    card_id STRING,
    country STRING,
    amount DOUBLE,
    event_time TIMESTAMP(3),
    WATERMARK FOR event_time AS event_time - INTERVAL '30' SECOND
) WITH ('connector' = 'kafka', ...);

CREATE VIEW suspicious AS
SELECT card_id,
       COUNT(DISTINCT country) AS country_count,
       window_start, window_end
FROM TABLE(
    TUMBLE(TABLE payments, DESCRIPTOR(event_time), INTERVAL '5' MINUTE))
GROUP BY card_id, window_start, window_end
HAVING COUNT(DISTINCT country) >= 3;

-- suspicious view → 알람 시스템 stream
```

이 한 query에 들어 있는 개념.

- **Kafka topic** — payments stream.
- **Event time** — `event_time` 컬럼.
- **Watermark** — 30초 지연 허용.
- **Tumbling window** — 5분 윈도우.
- **Aggregation** — 윈도우 안에서 distinct count.
- **Derived stream** — `suspicious`가 새 stream.

배치로 같은 일을 하려면 매 분 SQL 돌려야 한다. Stream으로 하면 *이벤트가 도착하는 순간* 윈도우가 갱신된다.

## 정리

- Stream = **무한 입력의 즉시 처리**. ms~초 단위 지연.
- **Message broker** — AMQP/JMS(큐, push, 메시지 사라짐) vs Log-based(Kafka, replayable).
- **Kafka** — topic + partition + offset + consumer group. log-based 표준.
- **CDC** — DB의 WAL/binlog를 stream으로. Debezium이 표준.
- **Event Sourcing** — 상태 대신 이벤트 저장. 시간 여행, audit, 새 view.
- **Stream processors** — Storm(레거시), Spark Streaming(micro-batch), Flink(true streaming), Kafka Streams, ksqlDB, Materialize.
- **Stream-Stream / Stream-Table / Table-Table join** — 시간 윈도우와 상태로 stream에서 결합.
- **Event time vs Processing time** — 비즈니스는 event time이 정답. 늦은 도착이 문제.
- **Watermark** — 강의 수위계. 윈도우 emit 시점을 정함. trade-off.
- **Window** — Tumbling(겹치지 않음), Hopping(겹침), Session(자연스러운 묶음).
- **Exactly-once** — 진정한 exactly-once는 분산에서 불가. *at-least-once + idempotent* 또는 Kafka transactions, Flink checkpointing으로 effectively 달성.
- **Lambda → Kappa** — stream-first 아키텍처가 모던 트렌드.

## 다음 장 예고

마지막 장 — **The Future of Data Systems**. 책 전체 회고와 미래 방향. Kleppmann의 *unbundled database* 비전이 핵심이다. Batch와 stream이 통합되어 derived data system 전체를 짓는 모델로.

## 관련 항목

- [Ch 10: Batch](/blog/parallel/designing-data-intensive-applications/chapter10-batch-processing) — 유한 입력의 처리. stream과 통합되는 방향.
- [Ch 9: Consistency](/blog/parallel/designing-data-intensive-applications/chapter09-consistency-and-consensus) — exactly-once의 분산 이론적 기반.
- [Ch 5: Replication](/blog/parallel/designing-data-intensive-applications/chapter05-replication) — log-based replication이 Kafka의 정신적 조상.
- [Ch 12: 미래](/blog/parallel/designing-data-intensive-applications/chapter12-the-future-of-data-systems) — unbundled database와 dataflow.
- [AMP Ch 18: TM](/blog/parallel/parallel-principles/ch18-transactional-memory) — Event sourcing의 정신과 닮은 atomic 변경 로그.
