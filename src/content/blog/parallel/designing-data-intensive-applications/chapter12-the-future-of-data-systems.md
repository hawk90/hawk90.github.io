---
title: "Ch 12: 데이터 시스템의 미래"
date: 2026-05-12T12:00:00
description: "Kleppmann의 비전 — Unbundling Database, dataflow 사고, 인간을 위한 데이터 시스템."
tags: [DDIA, Future, Dataflow, Ethics]
series: "Designing Data-Intensive Applications"
seriesOrder: 12
draft: true
---

## 이 챕터의 메시지

마지막 장이다. Kleppmann이 책 전체를 회고하고 미래의 방향을 제시한다.

세 가지 큰 비전.

1. **Database를 분해(unbundle)** — 모놀리스 DB를 stream 기반 컴포넌트의 조합으로.
2. **Dataflow 사고** — 상태가 아닌 *변환*으로 시스템을 본다.
3. **인간을 위한 데이터 시스템** — 윤리, privacy, 책임.

이 장은 *답*보다 *방향*을 제시한다. 책 전체에서 다룬 도구와 패턴이 미래에 어떻게 합쳐질지에 대한 Kleppmann의 비전이다.

## Unbundling the Database

전통적 관점 — 데이터베이스는 모놀리스다. 한 시스템(PostgreSQL, Oracle 등)이 모든 걸 한다.

- 저장
- 인덱싱(B-Tree, hash, full-text)
- 트랜잭션
- 복제
- 백업
- 쿼리 엔진
- 캐시

Kleppmann의 미래 — **이걸 분해(unbundle)** 한다. 각 책임을 별도 컴포넌트가 맡는다.

```text
[Source of Truth: Kafka]
       ↓ (event stream)
       │
   ┌───┼───┬────────┐
   │   │   │        │
   ↓   ↓   ↓        ↓
[Search][DB][Cache][Analytics DB]
   ↑     ↑   ↑       ↑
Elasticsearch
       Postgres
              Redis
                   Snowflake
```

각 시스템이 자기 사용 패턴에 최적화된 도구를 쓴다. **Materialized view가 시스템 전체에 분산**된 모양.

### 일상 비유 — 부엌도구 따로 사기 vs 주방 일체형

오래된 *주방 일체형*은 모든 게 한 박스에 들어 있다. 인덕션, 오븐, 후드, 식기세척기, 냉장고가 한 통.

- 한 부품 고장 나면 전체 교체.
- 인덕션이 약하면 모든 요리가 약해진다.

*부엌도구 따로 사기*는 각 도구를 별도로 산다.

- 강한 인덕션은 인덕션 가게에서.
- 좋은 오븐은 오븐 가게에서.
- 식기세척기 고장 나면 그것만 교체.
- 다만 — 따로 연결하고 조율해야 한다.

Unbundled database가 후자다. 각 시스템(search, KV, analytics)이 자기 분야의 best가 될 수 있다. 대신 통합·정합·운영의 책임은 *통합하는 엔지니어*에게 넘어온다.

### 어떻게 실제로 작동하나

**Source of truth** — Kafka (또는 다른 event log).

```text
1. Application이 *이벤트를* Kafka에 쓴다.
2. Kafka가 영구 보관, partition, replication.
3. 각 derived system이 자기 consumer로 Kafka를 읽어 자기 표현 만든다.
   - Elasticsearch: 검색 인덱스
   - Cassandra: KV lookup
   - Snowflake: 분석 큐브
   - Redis: 캐시
```

이게 **stream으로 derived data를 빌드**하는 패턴. 11장의 CDC + 12장의 비전 결합.

### Materialized View가 시스템 전체로

전통적 materialized view — 한 DB 안의 캐시.
Unbundled 시대 — Materialized view가 *시스템* 단위가 된다.

- Elasticsearch = orders stream의 *search-optimized materialized view*.
- Redis = orders stream의 *latency-optimized materialized view*.
- Snowflake = orders stream의 *analytics-optimized materialized view*.

모두 같은 source of truth에서 파생. 일관성은 stream replay로 보장.

## Dataflow 사고

핵심 통찰 — 데이터의 *흐름*을 1차 시민으로 본다.

```text
전통적:
  요청 → DB query → 응답
  Imperative — "이걸 해라"

Dataflow:
  이벤트 → stream → 파생 데이터
  Declarative — "이게 변하면 저것도 자동으로 변한다"
```

이게 React/Vue 같은 모던 UI 프레임워크의 정신과 닮았다. **상태가 아닌 변환**으로 사고한다.

```python
# 명령형
def update_total():
    total = sum(orders)
    cache.set("total", total)
# 누군가 update_total() 호출해야 작동

# Dataflow
@derived_from(orders)
def total():
    return sum(orders)
# orders 변할 때마다 total 자동 갱신
```

확장하면 — 전체 시스템이 dataflow graph가 된다. 각 노드가 입력 변환해서 다음 노드로.

```text
clicks ──┐
         ├─→ user_activity ──┐
profiles─┘                   ├─→ recommendations
                  features ──┘
```

이게 stream 처리, materialized view, GraphQL subscription, 심지어 spreadsheet 셀의 자동 재계산 등이 공유하는 정신이다.

### Derived data로서의 materialized view

12장의 핵심 통찰 중 하나. *모든 derived data는 materialized view로 볼 수 있다*.

- 인덱스 = view (테이블의 정렬된 view).
- 캐시 = view (자주 읽는 값의 view).
- 분석 큐브 = view (집계된 view).
- 검색 인덱스 = view (역색인 view).

전통적으로 이걸 각자 다른 도구로 만들었다. Stream 기반 unbundled 시대에는 *모두 같은 패턴*으로 만든다.

```text
source events → stream processor → derived view (in 각종 storage)
                                    ↓ 자동 갱신
                                source가 변하면 view도
```

### Lambda → Kappa → Unified

10장에서 Lambda Architecture(batch + stream)와 Kappa Architecture(stream-only)를 봤다. 12장은 한 걸음 더 — *모든 처리가 dataflow*다.

```text
Batch = bounded stream (시작과 끝이 있는 stream)
Stream = unbounded stream
→ 같은 처리 모델, 다른 입력 특성
```

Apache Beam이 이 비전을 코드 레벨에서 실현. 한 코드가 batch에도 stream에도 돌아간다.

## End-to-End Argument

분산 시스템 디자인의 결정적 원칙. Saltzer, Reed, Clark의 1984년 *End-to-End Arguments in System Design* 논문에서.

> 신뢰성·정확성·보안은 **end-to-end**에서 보장돼야 한다. 중간 레이어가 부분적으로 처리해도 충분하지 않다.

### 예 — exactly-once

메시지 큐가 "exactly-once 보장"이라고 해도. 받는 쪽 application이 idempotent하지 않으면 결국 의미가 없다.

```text
Queue: "exactly-once 보장" (네트워크 레이어)
Consumer:
    process(msg)
    write_to_db(result)   ← 여기 실패 후 재시작
    commit_offset
→ DB에 같은 결과 두 번 쓰일 수 있음
```

큐 레이어의 보장이 *전체 시스템의 보장*을 뜻하지 않는다. **무결성(integrity)은 application 수준에서 멱등성으로 다시 보장**해야 한다.

### 멱등성 — application의 책임

전형적 패턴.

```python
def process(event):
    # event id를 unique key로 사용
    if db.exists_processed(event.id):
        return  # 이미 처리됨
    with db.transaction():
        apply_change(event)
        db.mark_processed(event.id)
```

이게 모던 분산 시스템 디자인의 중요 가르침이다. **각 레이어가 자기 보장만 하고, 전체 정확성은 application이 책임진다**.

### Integrity vs Timeliness

Kleppmann이 강조하는 또 다른 구분.

- **Integrity** — 데이터가 정확. 손실/중복/오류 없음.
- **Timeliness** — 데이터가 최신.

이 둘은 *다른 보장*이다.

```text
높은 integrity + 낮은 timeliness:
  → 정확하지만 5분 지연
  → 대부분의 비즈니스에 OK

낮은 integrity + 높은 timeliness:
  → 빠르지만 가끔 틀린 값
  → 거의 항상 NOT OK
```

CAP/CALM 논의에서 부족한 부분. *eventual consistency*는 timeliness 약화지 integrity 약화가 아니어야 한다. 어떤 시점이든 *결국 정확한 값*에 수렴해야 한다.

## Data Integration Patterns

12장은 *여러 시스템을 어떻게 묶을 것인가*에 많은 분량을 쓴다.

### 1. Dual write — 안 됨

```text
Application
   ↓
   ├─→ DB
   └─→ Search Index
```

두 곳에 동시에 write. 한쪽 실패 시 inconsistency. *피해야 할 패턴*.

### 2. Application → DB → CDC → derived

```text
Application → DB → CDC → Kafka → Search Index
                                 → Cache
                                 → Analytics
```

DB가 source of truth. CDC로 변경을 stream에. 각 derived 시스템이 자기 페이스로 갱신.

**장점**. 일관성 보장. DB가 commit한 변경만 흘러감.

**단점**. DB가 병목. CDC 지연.

### 3. Event log → derived (full event sourcing)

```text
Application → Kafka (events) → DB
                             → Search Index
                             → Cache
                             → Analytics
```

이벤트 로그가 source of truth. DB조차 derived view.

**장점**. 모든 시스템이 동등하게 derived. Audit, replay 가능.

**단점**. 패러다임 전환. 기존 app 재설계 필요.

대부분의 현실 시스템이 1+2의 혼합으로 살아간다. 3은 새 시스템 설계 시 선택지.

### 시스템 사례 — lambda-style stack

전형적 모던 분산 스택.

```text
Postgres → Debezium → Kafka → ┬─→ Elasticsearch (검색)
                              ├─→ Redis (캐시)
                              ├─→ Materialize (실시간 뷰)
                              └─→ Snowflake (분석)
```

각 컴포넌트가 자기 분야의 best of breed. CDC가 source of truth와 derived를 묶는다.

## Schema Migration

스키마는 변한다. DDIA 책 전체에서 강조한 것.

전통적 — 모든 데이터를 한 번에 마이그레이션 (downtime).
모던 — Stream으로 점진적 마이그레이션.

```
Old schema → CDC → Stream → New schema
                                ↓
                             New data store
```

스키마 변경이 **continuous deployment**의 일부가 됨.

## 정확성 vs 가용성 — 다시

CAP의 한계는 책 전반에 걸쳐 언급. Kleppmann의 최종 입장.

> 트레이드오프는 시나리오별. 단순한 CAP 분류로 시스템을 평가하는 건 부족.

각 작업마다 다른 보장이 필요할 수 있음.

- 사용자 등록 — strong consistency 필요
- 페이지뷰 카운트 — eventual consistency OK
- 잔고 계산 — strong consistency 필수
- 추천 — eventual OK

**시스템 전체를 한 패러다임에 묶지 않는다**. 각 use case에 맞는 일관성.

## 신뢰

데이터 시스템은 **신뢰**의 도구. 사용자가 시스템을 믿어야 사용한다.

신뢰의 차원:

- **Reliability** — 작동한다 (1장)
- **정확성** — 잘못된 정보 안 줌
- **Privacy** — 데이터를 안전하게 보관
- **Audit** — 누가 무엇을 언제 했는지 추적

이 신뢰가 깨지면 — 시스템의 가치가 0이 된다.

## 인간을 위한 데이터 시스템 — 윤리

마지막 장의 가장 깊은 메시지다. Kleppmann이 강조하는 것 — **데이터 시스템은 사람을 다루는 도구**다. 이 절은 책의 마지막 절이기도 하다.

### 데이터에는 사람이 있다

추상적으로 *row*, *event*, *record*라고 부르지만 — 그 안에 사람이 있다.

- 의료 기록.
- 위치 이력.
- 메시지 내용.
- 결제 패턴.
- 검색 쿼리.

이 데이터의 잘못된 사용은 *실제 사람*의 삶에 영향을 준다. 직장, 보험, 신용, 자유.

### 차별(discrimination)과 편향(bias)

잘못된 알고리즘은 차별을 *자동화·확대*한다.

**예 1 — 신용 점수**. 우편번호 기반 위험 평가가 가난한 동네 사람에게 자동으로 낮은 점수. *redlining*의 디지털 재현이다. 코드는 정확히 작동한다 — 사회적으로는 잘못됐다.

**예 2 — 채용 알고리즘**. 과거 채용 데이터로 학습. 과거에 여성이 적었던 직군이면 미래에도 여성 지원자를 거른다. 편향이 *데이터에 박혀* 영구화된다.

**예 3 — 형사 사법**. 재범 예측 알고리즘이 인종에 따라 다른 위험도. ProPublica의 *Machine Bias* 조사가 폭로한 문제.

엔지니어가 *무엇을 만드는지* 알아야 한다. 모델이 *어떤 편향*을 학습할지 미리 검토해야 한다.

### Surveillance — 감시

데이터 시스템은 본질적으로 *감시 능력*을 가진다. 사용자 행동을 매 순간 기록.

```text
앱 사용 → 클릭/스크롤/머문 시간 → 이벤트 로그
위치 권한 → GPS → 이동 패턴 stream
음성 어시스턴트 → 항상 듣고 있음 → 음성 데이터
```

이게 *상품 개선*용일 수도, *광고 타겟팅*용일 수도, *정부 감시*용일 수도 있다. 엔지니어가 시스템이 어디까지 가는지 책임진다.

### Privacy

전통적 privacy 보호.

- 익명화 — 이름 제거.
- 집계 — 개인이 아닌 집단 통계만.

이게 *재식별 공격(re-identification attack)* 에 약하다. Netflix Prize 데이터셋이 익명화됐지만 IMDB 평가와 cross-reference로 개인이 식별됐다.

모던 접근.

- **Differential Privacy** — 통계에 의도적 noise 추가. 한 개인의 데이터 포함 여부가 결과에 *수학적으로* 영향 없게.
- **Federated Learning** — 데이터를 중앙으로 모으지 않고 각 기기에서 학습. 모델만 모음.
- **Homomorphic encryption** — 암호화된 채로 계산.

이런 기법들이 *privacy를 default*로 만드는 방향. GDPR, CCPA 같은 법규가 강제하기 시작.

### 데이터의 보유와 폐기

데이터를 *얼마나 오래* 보관하는가도 결정.

- 무한 보관 — *언젠가* 유출되면 끝.
- 짧은 보관 — *언제든* 잃을 위험은 시간 비례.

GDPR의 *right to be forgotten* — 사용자가 자기 데이터 삭제 요청 가능. 이게 *실제로 가능한 시스템*을 설계하는 게 어렵다. 한 row 삭제가 그 row에서 derived된 모든 cache·인덱스·analytics·backup을 따라가야 한다.

이게 unbundled database 시대에 *더* 어렵다. derived data가 곳곳에 흩어져 있으니까.

### 엔지니어의 책임

> "Engineers can no longer hide behind 'just following requirements.' We have to take responsibility for what our systems do."

엔지니어는 더 이상 "그저 요구사항을 따랐다"고 숨을 수 없다. 우리 시스템이 하는 일에 책임진다.

- *어떤* 데이터를 모을지.
- *어떻게* 보관할지.
- *누구에게* 보여줄지.
- *얼마나* 오래 둘지.
- *어떤 의사결정*에 쓸지.

이 모든 게 기술적 *동시에* 윤리적 결정이다. 12장의 마지막 메시지는 — *기술이 가능하다고 해서 옳은 건 아니다*.

## 시리즈 마무리

12장의 여정 회고.

**Part I — Foundations**:
- 신뢰성 / 확장성 / 유지보수성
- 데이터 모델 — relational, document, graph
- 스토리지 — LSM vs B-Tree
- 인코딩 — Protobuf, Avro

**Part II — Distributed Data**:
- 복제 — single/multi/leaderless leader
- 파티셔닝 — key range vs hash
- 트랜잭션 — ACID, isolation
- 분산의 문제 — 네트워크, 시계, 부분 실패
- 일관성과 합의 — linearizability, Paxos/Raft

**Part III — Derived Data**:
- 배치 — MapReduce, Spark
- Stream — Kafka, Flink
- 미래 — unbundling, dataflow, 인간을 위한

이 모든 게 모던 데이터 시스템의 본질.

## 핵심 메시지를 한 줄로

> **신뢰할 수 없는 컴포넌트로 신뢰할 수 있는 시스템을 만든다.**

- 네트워크는 깨진다
- 시계는 안 맞는다
- 노드는 죽는다
- 사람은 실수한다

이 모든 것을 받아들이고, 그래도 **사용자에게 정확하고 빠른 응답**을 주는 시스템을 짓는다. 이게 모던 분산 시스템 엔지니어링의 핵심.

## 추가 학습

DDIA 이후에 권장되는 자료.

- *Database Internals* (Petrov) — DB 내부 더 깊이
- *Streaming Systems* (Akidau et al.) — Stream 처리 깊이
- *Distributed Systems* (van Steen & Tanenbaum) — 분산 이론
- *Site Reliability Engineering* (Google) — 운영 차원
- Kleppmann의 *Distributed Systems* lecture (YouTube) — 후속 강의

## 정리

- **Unbundling Database** — 모놀리스 DB를 분해해 각 책임에 최적화된 시스템 조합으로. Kafka가 source of truth, derived system들이 각자 view를 만든다.
- **Dataflow 사고** — 상태가 아닌 *변환*으로 사고. 모든 derived data가 materialized view. batch와 stream이 같은 모델로 통합.
- **End-to-End** — 정확성은 *application 레이어*에서 멱등성으로 보장. 중간 레이어 보장만으로 불충분.
- **Integrity vs Timeliness** — eventual consistency는 timeliness 약화이지 integrity 약화가 아니어야 한다.
- **Data Integration** — Dual write 회피. CDC + Kafka가 표준 패턴. lambda-style stack(Postgres + Debezium + Kafka + Elasticsearch + Snowflake)이 모던 기본형.
- **각 use case에 맞는 일관성** — 단일 패러다임 강요 금지. 잔고는 strong, 추천은 eventual.
- **윤리** — 차별, surveillance, privacy. 엔지니어가 *기술적·윤리적* 양면 책임.
- 한 줄 요약 — **신뢰할 수 없는 컴포넌트로 신뢰할 수 있는 시스템을 만든다**.

## 시리즈 완결

12장의 여정을 끝까지 함께해 준 독자에게 감사한다.

분산 시스템은 끝없이 깊은 분야다. 이 책이 그 입구를 열어 주는 도구이길 바란다. DDIA의 진정한 가치는 *최신 시스템에 대한 카탈로그*가 아니라 *오랜 시간 변하지 않을 원리*를 정리한 데 있다. 5년 뒤에는 Kafka 대신 다른 도구가 표준일지 모른다. 그러나 *replayable log + derived view + idempotent processing*은 그대로 유효할 것이다.

> "Data is the lifeblood of modern applications. The systems that manage it deserve our deepest thought."

— Hawk

## 관련 항목

- [Ch 1: Reliability / Scalability / Maintainability](/blog/parallel/designing-data-intensive-applications/chapter01-reliable-scalable-maintainable) — 시작점
- [AMP 시리즈](/blog/parallel/parallel-principles/ch01-introduction) — 동시성 이론
- [Clean Architecture 시리즈](/blog/programming/design/clean-architecture/chapter01-what-is-design-and-architecture) — 시스템 디자인의 다른 차원
- [C++ Concurrency in Action 시리즈](/blog/parallel/cpp-concurrency-in-action/chapter01-hello-concurrent-world/) — 단일 노드 동시성 실전
