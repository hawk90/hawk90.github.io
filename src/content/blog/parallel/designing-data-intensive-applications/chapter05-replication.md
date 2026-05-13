---
title: "Ch 5: 복제"
date: 2026-07-02T01:00:00
description: "데이터 복제의 세 모델 — Single-leader, Multi-leader, Leaderless. 복제 지연과 일관성 문제."
tags: [DDIA, Replication, SingleLeader, MultiLeader, Leaderless]
series: "Designing Data-Intensive Applications"
seriesOrder: 5
---

## 이 챕터의 메시지

Part II 시작. 분산 데이터의 첫 주제는 **복제**(replication) — 같은 데이터를 여러 노드에 복사.

왜 복제하는가:

- **가용성** — 한 노드 죽어도 다른 노드가 답
- **지연 감소** — 사용자 가까운 노드에서 응답
- **확장성** — 읽기를 여러 노드로 분산

세 가지 모델.

1. **Single-Leader** (Master-Slave)
2. **Multi-Leader**
3. **Leaderless**

## Single-Leader Replication

가장 흔한 모델.

```
        [Leader]
        /   |   \
   replicate
      /     |     \
[Follower] [Follower] [Follower]
```

- **쓰기**는 leader에게만
- **읽기**는 leader 또는 follower
- Leader가 변경을 followers에게 전파 (replication log)

PostgreSQL replication, MySQL replication, MongoDB primary/secondary.

### 동기 vs 비동기 복제

**동기** — leader가 follower의 ack를 기다림 후 클라이언트에게 응답.

- 일관성 강함 (follower가 최신)
- 가용성 약함 (한 follower 느리면 모두 느림)

**비동기** — follower 응답 안 기다림.

- 빠름
- Follower가 뒤처질 수 있음
- Leader가 죽으면 commit 안 된 데이터 손실 가능

**Semi-synchronous** — 일부 follower만 동기. 절충.

### 새 Follower 추가

1. Leader의 스냅샷
2. 스냅샷을 follower로 복사
3. Follower는 스냅샷 이후 변경을 따라잡음

### Leader Failure — Failover

Leader가 죽으면 — follower 중 하나를 새 leader로.

**문제**들:

- **Split brain** — 두 노드가 둘 다 leader라고 생각
- **언제 failover?** — 단순 timeout? 거짓 양성 위험
- **commit 안 된 데이터** — 옛 leader의 미complete 쓰기
- **이전 leader 복귀** — 뭐가 정통?

Failover는 분산 시스템의 가장 어려운 부분 중 하나.

## Replication Log 구현

### Statement-based

SQL 문을 그대로 전파.

```sql
-- 전파
INSERT INTO users VALUES (1, 'Alice', NOW());
```

**문제** — non-deterministic 함수. `NOW()`, `RAND()` 등은 follower에서 다른 값. MySQL이 옛날에 썼다가 버린 이유.

### Write-Ahead Log (WAL)

DB의 내부 변경 로그를 전파. PostgreSQL이 사용.

```
WAL: "page 123, offset 456, write bytes ABC..."
```

**장점** — non-deterministic 문제 없음.
**단점** — 스토리지 엔진과 결합. 버전 호환성 어려움.

### Logical (Row-based) Log

변경된 행을 직접 전파. MySQL binlog가 row-based 모드일 때.

```
Row inserted: table=users, row=(1, "Alice", "2024-01-01")
```

**장점** — 스토리지 엔진과 독립, 호환성 좋음.
**단점** — 큰 트랜잭션은 큰 로그.

## 복제 지연 문제

비동기 복제의 결과 — **follower가 뒤처짐**. 이게 가시적 문제들을 만든다.

### Read-Your-Writes Consistency

사용자가 자기 데이터를 쓰고 즉시 읽었는데 — 자기 쓰기가 안 보임.

```
사용자 → write to leader
사용자 → read from follower (아직 복제 안 됨)
사용자: "어? 내가 쓴 게 없네?"
```

해법:
- 자기 데이터는 leader에서 읽기
- 또는 자기 마지막 쓰기 이후 시간 동안 leader에서

### Monotonic Reads

같은 사용자가 차례로 두 follower에서 읽으면 — 첫 follower가 더 최신, 두 번째 follower가 옛 데이터. 시간이 거꾸로 흐르는 듯.

해법: 같은 사용자는 항상 같은 follower에서 읽기 (sticky session).

### Consistent Prefix Reads

인과 관계가 깨짐.

```
Alice: "What's the time?"
Bob: "10:30"

→ 다른 follower에서:
Bob: "10:30" (먼저 보임)
Alice: "What's the time?" (나중에 보임)
```

인과 순서가 뒤집힘. 해법은 9장에서.

## Multi-Leader Replication

여러 leader가 모두 쓰기 받음. 서로 복제.

```
[Leader 1] ←──→ [Leader 2]
    ↓             ↓
[Followers]   [Followers]
```

**사용 사례**:

- **Multi-datacenter** — 각 DC에 leader, DC 사이 비동기 복제
- **Offline-first** — 모바일 앱이 로컬 leader, 서버와 sync
- **Collaborative editing** — Google Docs

### Write Conflict

두 leader가 같은 행을 동시 변경하면?

```
Leader 1: "Alice" → "Alice Kim"
Leader 2: "Alice" → "Alice Lee"

복제 후: 어느 게 정통?
```

해법:

**1. 충돌 회피**

같은 행은 항상 같은 leader로 가게 (sharding).

**2. Last-Write-Wins (LWW)**

타임스탬프 큰 쪽이 이김. 단순하지만 데이터 손실.

**3. 사용자에게 묻기**

UI에서 충돌 해결 (Git merge처럼).

**4. CRDT (Conflict-free Replicated Data Types)**

자동 merge 가능한 자료구조. Counter, set, register, document 등의 CRDT.

## Leaderless Replication

Dynamo (Amazon)의 영향. Cassandra, Riak, Voldemort.

```
클라이언트 → 여러 노드에 직접 쓰기
클라이언트 → 여러 노드에서 직접 읽기
```

Leader 없음. 클라이언트가 직접 quorum과 통신.

### Quorum 읽기/쓰기

N개의 노드, W개에 쓰기 성공해야 commit, R개에서 읽기.

```
W + R > N → 강한 일관성
```

이 식이 핵심. 예: N=3, W=2, R=2 → W+R=4 > N=3 → 항상 최신 데이터 보장.

```
Write: [v1] [v1] [v0]   ← 2개 성공
Read:  [?]  [v1] [v1]   ← 2개에서 읽음, 적어도 하나 v1
```

### Hinted Handoff / Read Repair

일시적으로 다운된 노드의 데이터를 처리:

- **Hinted Handoff** — 다른 노드가 임시 보관, 노드 복귀 시 전달
- **Read Repair** — 읽기 시 오래된 노드 발견하면 갱신

### Anti-Entropy

백그라운드에서 노드들이 데이터를 비교하고 동기화.

- Merkle tree로 효율적 차이 발견

## 정리

- 복제 = 같은 데이터를 여러 노드에 — 가용성 / 지연 / 확장성
- **Single-Leader** — 가장 흔함, failover가 어려움
- **Multi-Leader** — multi-DC, offline-first, 충돌 해결 필요
- **Leaderless** — Dynamo, quorum (W+R > N)
- **복제 지연** — Read-your-writes, Monotonic reads, Consistent prefix 문제
- **CRDT** — 자동 충돌 해결 자료구조

## 다음 장 예고

다음 장은 **Partitioning** — 데이터를 노드들에 어떻게 나눌 것인가.

## 관련 항목

- [Ch 4: Encoding](/blog/parallel/designing-data-intensive-applications/chapter04-encoding-and-evolution)
- [AMP Ch 12: Distributed Coordination](/blog/parallel/parallel-principles/ch12-counting-sorting-and-distributed-coordination)
