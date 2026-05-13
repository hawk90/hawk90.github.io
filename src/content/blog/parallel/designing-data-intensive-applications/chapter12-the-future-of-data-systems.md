---
title: "Ch 12: 데이터 시스템의 미래"
date: 2025-07-03T04:00:00
description: "Kleppmann의 비전 — Unbundling Database, dataflow 사고, 인간을 위한 데이터 시스템."
tags: [DDIA, Future, Dataflow, Ethics]
series: "Designing Data-Intensive Applications"
seriesOrder: 12
draft: true
---

## 이 챕터의 메시지

마지막 장. Kleppmann이 책 전체를 회고하고 미래의 방향을 제시한다.

세 가지 큰 비전.

1. **Database를 분해(unbundle)**
2. **Dataflow 사고**
3. **인간을 위한 데이터 시스템**

## Unbundling the Database

전통적 관점 — 데이터베이스는 모놀리스. 한 시스템이 모든 걸 한다.

- 저장
- 인덱싱
- 트랜잭션
- 복제
- 백업
- 쿼리
- 캐시

Kleppmann의 미래 — **이걸 분해**. 각 책임을 별도 컴포넌트가.

```
[Source of Truth: Kafka]
       ↓ (event stream)
       │
   ┌───┼───┐
   │   │   │
   ↓   ↓   ↓
[Search] [DB] [Cache] [Analytics]
(역할별 최적화 시스템)
```

각 시스템이 자기 사용 패턴에 최적화. **Materialized View가 분산된 시스템 전체에 분산**.

## Dataflow 사고

핵심 통찰 — 데이터의 흐름을 1차 시민으로 본다.

전통적:
- 요청 → DB query → 응답
- Imperative — "이걸 해라"

Dataflow:
- 이벤트 → stream → 파생 데이터
- Declarative — "이게 변하면 저것도 변한다"

이게 React / Vue 같은 모던 UI 프레임워크의 정신과 닮음. **상태가 아닌 변환**으로 사고.

```python
# 명령형
def update_total():
    total = sum(orders)
    cache.set("total", total)

# Dataflow
@derived_from(orders)
def total():
    return sum(orders)
# orders 변할 때마다 total 자동 갱신
```

확장하면 — 전체 시스템이 dataflow graph. 각 노드가 입력 변환해서 다음 노드로.

이게 stream 처리, materialized view, GraphQL의 subscription 등이 공유하는 정신.

## End-to-End Argument

분산 시스템 디자인 원칙. Saltzer, Reed, Clark의 1984년 논문에서.

> **신뢰성 / 정확성 / 보안은 end-to-end에서 보장돼야 한다. 중간 레이어가 부분적으로 처리해도 충분하지 않다.**

예 — exactly-once. 메시지 큐가 "exactly-once 보장"한다고 해도, 받는 쪽에서 idempotent하지 않으면 의미 없음.

이게 모던 시스템 디자인의 중요 가르침. **각 레이어가 자기 보장만 하고, 전체 정확성은 application이 책임진다**.

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

## 인간을 위한 데이터 시스템

마지막 장의 가장 깊은 메시지. Kleppmann이 강조하는 것 — **데이터 시스템은 사람을 다루는 도구**.

- 데이터에는 사람이 있다 — privacy, dignity
- 잘못된 알고리즘은 차별 / 편향을 만든다
- 데이터의 출처와 사용을 신중히

이건 단순 기술 문제가 아닌 윤리 문제. 엔지니어가 책임져야 할 영역.

**예시** — 신용 점수 알고리즘이 우편번호 기반으로 차별. 가난한 동네 사람이 자동으로 낮은 점수. 코드는 작동하지만 사회적으로 잘못됨.

> "Engineers can no longer hide behind 'just following requirements.' We have to take responsibility for what our systems do."

엔지니어는 더 이상 "그저 요구사항을 따랐다"고 숨을 수 없다. 우리 시스템이 하는 일에 책임져야 한다.

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

- **Unbundling Database** — 모놀리스 DB를 분해해 각 책임에 최적화된 시스템
- **Dataflow** — 상태가 아닌 변환으로 사고
- **End-to-End** — 정확성은 전체 경로에서 보장
- **각 use case에 맞는 일관성** — 단일 패러다임 X
- **신뢰** — 데이터 시스템의 본질
- **인간을 위한 시스템** — 윤리적 책임은 엔지니어의 몫
- 한 줄 요약 — **신뢰할 수 없는 컴포넌트로 신뢰할 수 있는 시스템**

## 시리즈 완결 — 감사 인사

12장의 여정을 끝까지 함께해 주셔서 감사하다.

분산 시스템은 끝없이 깊은 분야다. 이 책이 그 입구를 열어 주는 도구이길.

> "Data is the lifeblood of modern applications. The systems that manage it deserve our deepest thought."

— Hawk

## 관련 항목

- [Ch 1: Reliability / Scalability / Maintainability](/blog/parallel/designing-data-intensive-applications/chapter01-reliable-scalable-maintainable) — 시작점
- [AMP 시리즈](/blog/parallel/parallel-principles/ch01-introduction) — 동시성 이론
- [Clean Architecture 시리즈](/blog/programming/design/clean-architecture/chapter01-what-is-design-and-architecture) — 시스템 디자인의 다른 차원
- [C++ Concurrency in Action 시리즈](/blog/parallel/cpp-concurrency-in-action/) — 단일 노드 동시성 실전
