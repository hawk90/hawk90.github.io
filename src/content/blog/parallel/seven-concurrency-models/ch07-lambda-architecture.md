---
title: "Chapter 7: Lambda Architecture"
date: 2026-05-06T07:00:00
description: "배치 + 스트리밍 통합 — Hadoop/Storm/Spark. 정확성과 실시간성의 트레이드오프."
series: "Seven Concurrency Models in Seven Weeks"
seriesOrder: 7
tags: [parallel, concurrency, book-review, lambda-architecture, hadoop, storm, spark, distributed]
type: book-review
bookTitle: "Seven Concurrency Models in Seven Weeks"
bookAuthor: "Paul Butcher"
draft: true
---

> **Seven Concurrency Models in Seven Weeks** Chapter 7 요약

## 7.1 분산 데이터의 새로운 도전

지금까지 본 모델 — *한 머신*의 동시성 또는 *몇 대 머신*의 actor 분산.

이번 모델 — **수백~수천 머신에서 PB급 데이터 처리**.

- **단일 머신** — GB ~ TB
- **분산 데이터** — TB ~ PB ~ EB. 데이터가 한 머신에 안 들어간다.
- 네트워크 < 디스크 < 메모리 (성능 계층)
- 머신은 *언제든* 죽는다

## 7.2 Nathan Marz의 Lambda Architecture

세 가지 레이어로 분산 데이터 처리.

Raw data가 두 갈래로 흘러 — **Batch Layer**(느리지만 정확, Hadoop / Spark)와 **Speed Layer**(빠르지만 근사, Storm / Flink) — 양쪽 결과를 **Serving Layer**가 병합해 쿼리에 응답한다.

- **Batch Layer** — 전체 데이터, 정확한 결과, *느림*
- **Speed Layer** — 최근 데이터만, 근사, *실시간*
- **Serving Layer** — 둘을 *병합*해서 쿼리 응답

## 7.3 왜 두 레이어인가

Batch만으로는 — 너무 느려서 *실시간*을 못 준다.
Speed만으로는 — *정확성* 보장이 어렵다 (재시작 시 데이터 손실 등).

| 레이어 | 처리 주기 | 정확도 |
|--------|-----------|--------|
| Batch | 매시간 / 매일 | 0~24시간 전 데이터까지 정확 |
| Speed | 실시간 | 0~수 분 전 데이터, 근사값 |

Query는 *Batch 결과 + Speed 결과* = 전체.

## 7.4 Batch Layer — MapReduce

Google의 2004년 논문. Hadoop이 오픈소스 구현.

- **Map** — 데이터를 `(key, value)` 쌍으로 변환
- **Shuffle** — 같은 key를 같은 reducer로 모음
- **Reduce** — 같은 key의 values를 처리

```python
# WordCount
def map_fn(line):
    for word in line.split():
        emit(word, 1)

def reduce_fn(word, counts):
    emit(word, sum(counts))
```

예를 들어 입력이 `[Hello world, Hello there, world is wide]`라면

1. **Map** — `(Hello,1), (world,1), (Hello,1), (there,1), (world,1), (is,1), (wide,1)`
2. **Shuffle** — `Hello → [1,1]`, `world → [1,1]`, `there → [1]`, …
3. **Reduce** — `(Hello,2), (world,2), (there,1), (is,1), (wide,1)`

함수형의 map / reduce를 *수천 머신*에 분산.

## 7.5 Apache Spark — Hadoop의 진화

MapReduce의 한계 — 매 단계가 디스크 I/O.

- **Hadoop MapReduce** — map → 디스크 → reduce → 디스크 → …
- **Spark** — 메모리에서 RDD 변환 → … → 결과

10~100배 빠름. 함수형 변환 그래프를 *DAG*로 표현.

```scala
val sc = new SparkContext(...)

val lines = sc.textFile("hdfs://logs.txt")
val errors = lines
  .filter(_.contains("ERROR"))
  .map(_.split(" "))
  .map(parts => (parts(0), 1))  // (date, 1)
  .reduceByKey(_ + _)            // date별 에러 수

errors.saveAsTextFile("errors_per_day")
```

함수형 변환의 분산 버전. Lazy evaluation으로 최적화.

## 7.6 Speed Layer — Storm

실시간 스트림 처리. 무한 스트림에서 작업.

Topology의 구성요소.

- **Spout** — 소스 (Kafka, queue 등)
- **Bolt** — 처리 노드. 여러 단계로 fan-out / fan-in 가능
- **Sink** — 최종 출력

각 Bolt는 *메시지 받음 → 처리 → 다음 Bolt로* 전달.

```java
TopologyBuilder builder = new TopologyBuilder();
builder.setSpout("source", new KafkaSpout());
builder.setBolt("filter", new FilterBolt()).shuffleGrouping("source");
builder.setBolt("count", new CountBolt()).fieldsGrouping("filter", new Fields("user"));
```

CSP의 *분산 버전*. 채널 = stream, goroutine = bolt.

## 7.7 Apache Flink — 모던 스트리밍

Storm보다 강력한 의미론.

- **Exactly-once** 보장 (Storm은 at-least-once)
- **Stateful 처리** (window, aggregation)
- **Event time / Processing time** 구분
- **Watermarks**로 늦은 이벤트 처리

```java
DataStream<Tweet> tweets = env.addSource(new KafkaSource());

DataStream<Tuple2<String, Long>> hashtagCounts = tweets
    .flatMap((tweet, out) -> tweet.hashtags.forEach(h -> out.collect(h)))
    .keyBy(h -> h)
    .window(TumblingProcessingTimeWindows.of(Time.minutes(5)))
    .sum(1);
```

## 7.8 Lambda Architecture의 비판

Jay Kreps (Kafka 창시자)가 *Kappa Architecture*를 제안.

**Lambda의 문제**

- 두 레이어 = 두 코드베이스 (배치 + 스트리밍)
- 정합성 유지가 어려움
- 운영이 복잡

**Kappa의 대안**

- 모든 데이터를 stream으로 (Kafka 토픽)
- 스트리밍 엔진(Flink)이 *재처리* 가능
- 단일 코드베이스
- 시스템이 더 간결

| 아키텍처 | 흐름 |
|----------|------|
| Lambda | Raw → Batch → Result + Raw → Stream → Result → Merge |
| Kappa | Raw → Stream → Result (재처리 시 stream을 처음부터 다시) |

## 7.9 Spark Structured Streaming

Spark가 스트리밍도 지원. DataFrame API로 통합.

```scala
val streamingDF = spark.readStream
  .format("kafka")
  .option("subscribe", "events")
  .load()

val processed = streamingDF
  .filter($"type" === "click")
  .groupBy(window($"timestamp", "5 minutes"))
  .count()

processed.writeStream
  .format("console")
  .outputMode("update")
  .start()
```

배치 코드와 *거의 동일*. 통합된 API. 사실상 Kappa 패턴 지원.

## 7.10 모던 추세 — 통합

| 시기 | 패턴 |
|------|------|
| 2010 | Lambda (Hadoop + Storm) |
| 2015 | Kappa (Kafka + Flink) |
| 2020 | 통합 API (Spark Structured Streaming, Beam) |
| 2025 | 클라우드 네이티브 (Kinesis, BigQuery Streaming, Snowflake) |

직접 Hadoop/Storm을 짤 일은 줄어든다. 매니지드 서비스가 추상화.

## 7.11 CAP 정리 — 분산의 한계

- **Consistency** — 모든 노드가 같은 데이터
- **Availability** — 모든 요청이 응답을 받음
- **Partition tolerance** — 네트워크 분리 시에도 동작

세 가지를 *동시*에 만족하는 것은 불가능하다 (CAP theorem). 분산 데이터 시스템은 *어느 둘*을 선택해야 한다.

| 선택 | 시스템 |
|------|--------|
| CA (분리 가정 X) | 전통적 RDB |
| CP | HBase, MongoDB, Redis (강한 일관성 모드) |
| AP | Cassandra, DynamoDB, Riak |

Lambda Architecture는 *eventual consistency*를 받아들임. CAP의 AP 쪽.

## 7.12 분산 데이터의 실무 도구

**저장**

- HDFS (Hadoop)
- S3 (AWS, 사실상 표준)
- BigQuery, Snowflake, Databricks Lake

**배치 처리**

- Spark (가장 인기)
- Hadoop MapReduce (레거시)
- BigQuery, Athena (managed)

**스트리밍**

- Flink (가장 강력)
- Kafka Streams
- Spark Structured Streaming
- AWS Kinesis (managed)
- Google Dataflow (managed)

**오케스트레이션**

- Airflow (가장 인기)
- Dagster, Prefect (모던 대안)

## 정리

- **분산 데이터**는 *동시성의 확장* — 한 머신 → 수천 머신
- **MapReduce** — 함수형 변환의 분산 버전
- **Spark** — MapReduce의 메모리 기반 진화
- **Lambda Architecture** — Batch + Speed, 정확성 + 실시간
- **Kappa Architecture** — 모두 stream으로 통합
- **CAP theorem** — 분산의 본질적 트레이드오프
- 실무는 *managed service*로 추상화 진행

## 한국 개발자의 함정

1. ***빅데이터 = Hadoop*이라는 옛 시각** — 2010년대 중반부터 Spark로 이동했다. 모던 시스템은 클라우드 매니지드.
2. ***Lambda는 항상 필요*하다는 가정** — Kappa로 충분한 경우가 많다. 단일 코드베이스가 운영 부담이 적다.
3. ***Streaming = real-time*이라는 동일시** — End-to-end latency가 수십 ms ~ 수 초다. 진짜 real-time(<10 ms)은 별도 시스템.
4. ***Spark가 만능*이라는 가정** — 매우 큰 데이터엔 Spark. 중간 규모는 DuckDB / Polars가 더 빠르다.
5. ***CAP에서 두 개*만 고르라는 단순화** — 실제로는 latency / consistency 스펙트럼이다. PACELC theorem이 더 정확.

## 실무 적용

**이론 → 실무**

| 도구 | 용도 |
|------|------|
| MapReduce | 학술 / 레거시 |
| Apache Spark | 사실상 표준 (배치) |
| Apache Flink | 모던 스트리밍 표준 |
| Kafka | 메시지 백본 |
| Airflow | 워크플로 오케스트레이션 |
| BigQuery / Snowflake | 매니지드 분석 |

**클라우드 매니지드**

| 클라우드 | 도구 |
|----------|------|
| AWS | EMR, Glue, Kinesis, Redshift |
| GCP | Dataflow, BigQuery, Pub/Sub |
| Azure | Synapse, Event Hubs |

**설계 결정**

| 규모 / 요건 | 권장 |
|-------------|------|
| 작은~중간 (TB) | Spark on K8s 또는 매니지드 |
| 큰 (PB) | 클라우드 데이터 웨어하우스 |
| 실시간 | Flink + Kafka |
| 분석 워크로드 | Snowflake / BigQuery |
| ML 학습 | Spark MLlib, Ray, Dask |

## 자기 점검

- [ ] Batch Layer와 Speed Layer의 차이는?
- [ ] MapReduce의 Shuffle 단계가 의미하는 것은?
- [ ] Spark가 MapReduce보다 빠른 이유는?
- [ ] Lambda vs Kappa 트레이드오프는?
- [ ] CAP theorem과 실무 선택은?
- [ ] Exactly-once vs At-least-once의 의미는?

## 시리즈 마무리

7주의 여정 끝.

| Week | 모델 | 한 줄 요약 |
|------|------|-----------|
| 1 | Threads and Locks | 가장 익숙, 가장 위험 |
| 2 | Functional Programming | 불변성의 힘 |
| 3 | The Clojure Way | Identity / State 분리 |
| 4 | Actors | 격리 + 메시지 |
| 5 | CSP | 채널 중심 흐름 |
| 6 | Data Parallelism | GPU / SIMD |
| 7 | Lambda Architecture | 분산 데이터 |

### 모델별 최적 사용

| 상황 | 모델 |
|------|------|
| 짧은 임계 영역 / 단일 머신 | Threads + Locks |
| 순수 계산 / 데이터 파이프라인 | Functional |
| 복잡한 상태 + 합성 | Clojure Way (STM) |
| 분산 + Fault tolerance | Actors |
| 흐름 명확한 동시성 | CSP |
| 대규모 수치 / 신호 처리 | Data Parallelism |
| 빅데이터 / 실시간 | Lambda / Kappa |

### 한 가지 진리

> 어떤 모델도 *만능*이 아니다. 문제에 *적절한 모델*을 고르는 안목.

이게 7주를 끝낸 후 남을 가장 큰 가치.

## 관련 항목

- [Ch 6: Data Parallelism](/blog/parallel/seven-concurrency-models/ch06-data-parallelism)
- [Ch 1: Threads and Locks](/blog/parallel/seven-concurrency-models/ch01-threads-and-locks) — 시리즈 시작
- [DDIA: Designing Data-Intensive Applications](/blog/parallel/designing-data-intensive-applications/chapter01-reliable-scalable-maintainable) — 분산 데이터 심화
- [AMP Ch 1: Introduction](/blog/parallel/parallel-principles/ch01-introduction) — 동시성 이론
- [C++ Concurrency in Action Ch 1: Hello](/blog/parallel/cpp-concurrency-in-action/chapter01-hello-concurrent-world) — C++ 실무
