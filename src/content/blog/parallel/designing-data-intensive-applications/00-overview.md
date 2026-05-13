---
title: "Designing Data-Intensive Applications — 시리즈 개요"
date: 2026-07-01T00:00:00
description: "Martin Kleppmann의 분산 데이터 시스템 정전. 신뢰성·확장성·유지보수성부터 batch / stream까지."
tags: [Distributed Systems, Database, DDIA, Kleppmann, Series]
series: "Designing Data-Intensive Applications"
seriesOrder: 0
---

## 책 소개

Martin Kleppmann, *Designing Data-Intensive Applications* (O'Reilly, 2017).

부제 — *The Big Ideas Behind Reliable, Scalable, and Maintainable Systems*.

이 책은 모던 데이터 시스템에 관한 가장 종합적인 입문서다. 데이터베이스 내부, 분산 시스템 이론, batch 처리, stream 처리 — 모든 영역을 같은 시각에서 다룬다.

## 시리즈 구조

### Part I — Foundations of Data Systems

| 장 | 주제 |
|---|---|
| Ch 1 | Reliable, Scalable, and Maintainable Applications |
| Ch 2 | Data Models and Query Languages |
| Ch 3 | Storage and Retrieval |
| Ch 4 | Encoding and Evolution |

### Part II — Distributed Data

| 장 | 주제 |
|---|---|
| Ch 5 | Replication |
| Ch 6 | Partitioning |
| Ch 7 | Transactions |
| Ch 8 | The Trouble with Distributed Systems |
| Ch 9 | Consistency and Consensus |

### Part III — Derived Data

| 장 | 주제 |
|---|---|
| Ch 10 | Batch Processing |
| Ch 11 | Stream Processing |
| Ch 12 | The Future of Data Systems |

## 핵심 메시지

Kleppmann이 책 전체에 걸쳐 강조하는 것.

**1. 세 가지 품질**

- **Reliability** — 문제가 생겨도 정확하게 동작
- **Scalability** — 부하 증가에 대응
- **Maintainability** — 다양한 사람이 효율적으로 일할 수 있음

**2. 추상화의 본질**

데이터 모델, 인덱스, 트랜잭션, 합의 — 모두 같은 도구. **신뢰할 수 없는 컴포넌트로 신뢰할 수 있는 시스템 만들기**.

**3. 트레이드오프**

CAP, ACID vs BASE, latency vs throughput, normalization vs denormalization — 모든 결정은 트레이드오프. **상황에 맞는 도구**.

## 함께 읽으면 좋은 자료

- [Art of Multiprocessor Programming](/blog/parallel/parallel-principles/ch01-introduction) — 동시성 이론
- [C++ Concurrency in Action](/blog/parallel/cpp-concurrency-in-action/) — C++ 동시성 실전
- [Clean Architecture](/blog/programming/design/clean-architecture/chapter01-what-is-design-and-architecture) — DB는 detail

## 책의 위상

DDIA는 출간 이후 분산 시스템 입문서의 표준이 됐다. 그 이유.

- **종합성** — DB부터 stream 처리까지 한 권에
- **균형** — 학계 이론 + 산업 실전의 균형
- **그림** — 50여 개의 다이어그램으로 개념 시각화
- **레퍼런스** — 각 챕터마다 풍부한 학술 / 산업 자료

## 학습 경로

```
Ch 1 (큰 그림)
    ↓
Part I (단일 노드)
    ├ Ch 2: 데이터 모델
    ├ Ch 3: 스토리지 엔진
    └ Ch 4: 인코딩
    ↓
Part II (분산 데이터)
    ├ Ch 5: 복제
    ├ Ch 6: 파티셔닝
    ├ Ch 7: 트랜잭션
    ├ Ch 8: 분산의 문제
    └ Ch 9: 합의
    ↓
Part III (파생 데이터)
    ├ Ch 10: Batch
    ├ Ch 11: Stream
    └ Ch 12: 미래
```

각 파트가 독립적이지만, Part I → II → III 순서가 자연스럽다.
