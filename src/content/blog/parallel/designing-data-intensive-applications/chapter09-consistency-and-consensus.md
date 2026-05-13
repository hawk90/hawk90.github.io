---
title: "Ch 9: 일관성과 합의"
date: 2026-07-03T01:00:00
description: "Linearizability, Causal Consistency, CAP 정리. Consensus 알고리즘 — Paxos, Raft. Two-Phase Commit."
tags: [DDIA, Consistency, Linearizability, Consensus, Paxos, Raft, CAP]
series: "Designing Data-Intensive Applications"
seriesOrder: 9
---

## 이 챕터의 메시지

분산 시스템의 가장 어려운 주제. 노드들 사이에서 "무엇이 진실인가"에 어떻게 합의할 것인가.

이 챕터에서 다루는 개념들.

- **Linearizability** — 가장 강한 단일 객체 일관성
- **Causal Consistency** — 인과 순서 보존
- **CAP 정리** — 트레이드오프
- **Consensus** — Paxos, Raft
- **Two-Phase Commit** — 분산 트랜잭션

## Linearizability — "최신" 답이 의미가 있는 것

> 모든 작업이 어떤 직렬 순서로 즉시 일어난 것처럼 동작.

```
T1: write(x, 1)
T2: read(x) → 1 (또는 더 새 값)
T3: read(x) → 1 또는 그 이후 값
```

linearizable system에서는 "최신 값"이 명확. 단일 노드의 강한 일관성을 분산에 확장.

**대가** — 매우 비싸다. Linearizable이 되려면 모든 노드가 항상 동의해야 함.

3장 AMP의 linearizability와 같은 개념. 분산 시스템에서 더 비싼 형태.

## CAP 정리 — 단순화된 트레이드오프

흔히 인용되지만 자주 오해되는 정리. 정확한 진술:

> 네트워크 partition 발생 시 — **Consistency** (linearizable)와 **Availability** (모든 요청 응답) 중 하나만 가능.

- **CP** — partition 시 일관성 위해 가용성 포기
- **AP** — partition 시 가용성 위해 일관성 포기

**Kleppmann의 비판** — CAP의 정의가 너무 좁다.

- Consistency = linearizable (다른 일관성은 무시)
- Availability = 모든 요청에 응답 (대다수 응답은 무시)
- Partition만 다룸 (지연, 시계 등은?)

> "CAP has done more harm than good. Better to think in terms of specific tradeoffs."

CAP를 단순한 약어로 보지 말고 — 구체적 트레이드오프를 분석한다.

## Causal Consistency — 약하지만 충분한 일관성

Linearizable보다 약하지만 거의 모든 응용에 충분.

> **인과적으로 관련된** 작업이 순서대로 보인다. 인과 관계 없는 작업은 어느 순서든 가능.

```
A: post photo
B: comment on photo

다른 사용자가 볼 때:
  먼저 photo, 그 다음 comment (인과 순서) — 보장
  Alice의 다른 글 vs Bob의 다른 글 — 순서 자유
```

Linearizable은 **global total order**. Causal은 **partial order** — 인과 관계가 있을 때만 강제.

**훨씬 싸다** — partition을 견딘다. AP 시스템도 causal consistency는 줄 수 있다.

## Sequence Number / Lamport Timestamp

Causal order를 추적하는 도구.

- **Lamport timestamp** — 8장에서 봤음
- **Vector clock** — 더 정확
- **Sequencer** — 한 노드가 단조 ID 부여

Causal consistency는 충분히 강한 일관성 + 충분히 좋은 성능의 균형.

## Total Order Broadcast — Consensus의 다른 이름

모든 노드가 같은 순서로 메시지를 받음.

```
모든 노드: msg1, msg2, msg3, msg4, ... (같은 순서)
```

이게 가능하면 — replicated state machine이 가능. 모든 노드가 같은 입력 → 같은 상태.

Total order broadcast = consensus와 등가.

## Consensus 문제 — 무엇인가

여러 노드가 한 값에 동의하는 것. 5장 AMP의 consensus와 같음 — 다만 분산 환경.

**요구사항**:

- **Uniform agreement** — 두 노드가 다른 값을 결정하지 않음
- **Integrity** — 한 번에 한 값만 결정
- **Validity** — 결정된 값은 누군가가 제안한 값
- **Termination** — 모든 fault-free 노드가 결국 결정

마지막 — termination — 이 분산에서 가장 어렵다.

### FLP Impossibility

Fischer, Lynch, Paterson 1985의 충격적 결과.

> **Asynchronous 분산 시스템에서 단 한 노드라도 죽을 수 있다면, deterministic consensus는 불가능.**

이게 분산 시스템 이론의 가장 유명한 불가능성 결과.

**현실에선 어떻게?** — Asynchronous를 약간 양보. Partial synchronous 가정. 또는 timeout으로 진행 보장.

## Paxos / Raft

분산 consensus의 실용 알고리즘.

### Paxos (Lamport, 1989)

가장 유명하면서 이해 어려운 알고리즘. 다음 단계.

1. **Prepare** — proposer가 번호를 던져 권한 요청
2. **Promise** — acceptor가 더 큰 번호 promise
3. **Accept** — proposer가 값을 보냄, 다수 acceptor 동의 시 결정
4. **Commit** — 결정된 값을 모두에게 알림

**Multi-Paxos** — 여러 값을 연속으로 결정 (state machine).

이해 어렵기로 악명. Lamport의 원논문이 너무 추상적이라 후속 논문들이 더 나옴.

### Raft (Ongaro & Ousterhout, 2014)

**이해 가능한 consensus**를 목표로 디자인.

- **Leader Election** — 한 leader 선출, 그가 결정 주도
- **Log Replication** — leader가 entry를 followers에 전파
- **Safety** — 같은 entry를 두 leader가 다르게 commit 못 함

Raft가 산업에 빠르게 채택. etcd, Consul, CockroachDB, TiKV — 모두 Raft.

## Two-Phase Commit (2PC)

분산 트랜잭션 — 여러 노드에 걸친 ACID.

**Phase 1 — Prepare**:
- Coordinator → 모든 participant: "준비됐어?"
- 각 participant: "준비됐어 (yes)" 또는 "불가 (no)"

**Phase 2 — Commit/Abort**:
- 모두 yes → coordinator가 "commit"
- 하나라도 no → "abort"
- 모든 participant가 수행

```
T0: client → coordinator: start transaction
T1: coordinator → A, B: prepare
T2: A, B → coordinator: yes
T3: coordinator: commit log
T4: coordinator → A, B: commit
T5: A, B: 실제 commit
```

### 2PC의 문제

**Blocking**. Coordinator가 phase 2에서 죽으면 — participant는 commit / abort를 알 수 없음. 영원히 기다림.

이걸 **uncertain phase** 또는 **in doubt** 라 부름.

해법:
- 3PC (3-Phase Commit) — 더 복잡, 여전히 한계
- Coordinator를 분산 (Raft 위에 2PC)
- 또는 분산 트랜잭션을 피함 (마이크로서비스 스타일)

## Saga Pattern

분산 트랜잭션의 실용적 대안. 마이크로서비스 시대에 인기.

```
Step 1: Order Service — create order
Step 2: Payment Service — charge card
Step 3: Inventory Service — reserve
Step 4: Shipping Service — ship

실패 시 — 보상 트랜잭션 (compensating action)으로 롤백
```

- ACID 양보
- Eventual consistency
- 더 가용적

## Membership / Coordination Services

분산 시스템의 인프라.

- **Zookeeper** — Hadoop 생태계 표준
- **etcd** — Kubernetes, CockroachDB의 기반
- **Consul** — service discovery

이들 자체가 작은 강한 일관성 시스템 (보통 Raft 위에). 큰 시스템이 이 작은 시스템을 통해 합의.

**책임**:
- 누가 leader인가
- 어떤 노드가 살아 있는가
- 설정 (분산된 설정 파일)
- 분산 락
- 서비스 등록

직접 구현하기보다 — 이런 도구를 쓴다.

## 정리

- **Linearizability** — 가장 강한 일관성, 비싸다
- **CAP** — partition 시 C vs A 트레이드오프 (단순화된 시각)
- **Causal Consistency** — partial order, 거의 모든 응용에 충분
- **Total Order Broadcast = Consensus**
- **FLP** — async에서 deterministic consensus 불가능
- **Paxos / Raft** — 실용적 consensus (partial sync 가정)
- **2PC** — 분산 트랜잭션, blocking 문제
- **Saga** — eventual consistency의 실용적 대안
- **Zookeeper / etcd** — 분산 coordination 인프라

## 다음 장 예고

여기서 Part II 끝. 다음 장부터 Part III — **Derived Data**. Batch 처리부터.

## 관련 항목

- [Ch 8: 분산의 문제](/blog/parallel/designing-data-intensive-applications/chapter08-the-trouble-with-distributed-systems)
- [AMP Ch 5-6: Consensus](/blog/parallel/parallel-principles/ch05-relative-power-of-synchronization)
- [AMP Ch 3: Linearizability](/blog/parallel/parallel-principles/ch03-concurrent-objects)
