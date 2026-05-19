---
title: "Ch 5: 복제"
date: 2026-05-12T05:00:00
description: "데이터 복제의 세 모델 — Single-leader, Multi-leader, Leaderless. 복제 지연과 일관성 문제."
tags: [DDIA, Replication, SingleLeader, MultiLeader, Leaderless]
series: "Designing Data-Intensive Applications"
seriesOrder: 5
draft: true
---

## 이 챕터의 메시지

Part II가 시작된다. 분산 데이터의 첫 주제는 **복제**(replication) — 같은 데이터를 여러 노드에 복사하는 것.

왜 복제하는가.

- **가용성** — 한 노드가 죽어도 다른 노드가 답을 준다
- **지연 감소** — 사용자에게 지리적으로 가까운 노드에서 응답
- **확장성** — 읽기 부하를 여러 노드로 분산

방법은 세 가지로 정리된다.

1. **Single-Leader** (Master-Slave, Primary-Replica)
2. **Multi-Leader** (Active-Active)
3. **Leaderless** (Dynamo-style)

일상적 비유를 미리 깔아두면 — single leader는 **본사**가 모든 결정을 내리고 **지점**들에 공문을 내려보내는 모델, multi-leader는 **여러 지부**가 각자 결정하고 서로 동기화하는 모델, leaderless는 모든 구성원이 **위원회 합의**로 매번 결정하는 모델이다.

## Single-Leader Replication

가장 흔하고 가장 단순한 모델.

![Single-Leader 복제](/images/blog/parallel/diagrams/single-leader-replication.svg)

- **쓰기**는 leader에게만 보낸다
- **읽기**는 leader 또는 follower 모두 가능
- Leader가 변경을 followers에게 *replication log*로 전파

PostgreSQL streaming replication, MySQL replication, MongoDB primary/secondary, SQL Server AlwaysOn, Oracle Data Guard — 대부분의 관계형 DB와 일부 NoSQL이 이 모델이다.

### 동기 vs 비동기 복제

**동기 복제** — leader가 follower의 ack를 기다린 후 클라이언트에게 응답한다.

- 일관성이 강하다 — follower가 항상 최신
- 가용성이 약하다 — follower 하나가 느리거나 죽으면 모든 쓰기가 막힘

**비동기 복제** — follower의 응답을 기다리지 않는다.

- 빠르다
- Follower가 뒤처질 수 있다
- Leader가 죽으면 commit 됐다고 알린 데이터가 사라질 수 있음 (durability gap)

**Semi-synchronous** — 일부 follower만 동기, 나머지는 비동기. 가장 흔한 절충안.

| 모드 | 일관성 | 가용성 | 처리량 | 사례 |
|------|--------|--------|--------|------|
| 동기 | 강함 | 약함 | 낮음 | 금융 (소수 사례) |
| Semi-sync | 중간 | 중간 | 중간 | MySQL 5.7+, Postgres `synchronous_commit=remote_apply` |
| 비동기 | 약함 | 강함 | 높음 | 대부분의 기본값 |

### 새 Follower 추가

운영 중에 follower를 추가하는 절차.

1. Leader의 **일관된 스냅샷**을 떠 둔다 (lock 없이, 보통 storage-level snapshot)
2. 스냅샷을 새 follower로 복사
3. Follower는 스냅샷 시점 이후의 변경 로그를 leader에 요청해 따라잡음 (*catch-up*)
4. Lag이 0에 가까워지면 정상 follower로 합류

PostgreSQL의 `pg_basebackup`이 이 흐름을 자동화한다.

### Leader Failure — Failover

Leader가 죽으면 follower 중 하나를 새 leader로 승격해야 한다. 단순해 보이지만 실제로는 분산 시스템에서 가장 어려운 부분 중 하나다.

문제들.

- **Split brain** — 옛 leader가 사실 살아있고 새 leader도 활동 중. 둘이 동시에 쓰기를 받음 → 충돌. **fencing**(STONITH, lease)으로 옛 leader를 확실히 차단해야 함
- **언제 failover?** — 단순 timeout이면 거짓 양성 위험. 네트워크 일시 분단으로 멀쩡한 leader를 죽이게 됨
- **Commit 안 된 데이터** — 비동기 복제에서 옛 leader가 아직 전파하지 않은 쓰기는 새 leader가 모름. 옛 leader가 돌아오면 그 쓰기는 *사라지거나* 충돌
- **이전 leader 복귀** — 둘 중 누가 정통인가. 보통 옛 leader를 follower로 강등하고 자체 데이터를 버림

GitHub은 2018년에 MySQL failover 중 split brain으로 24시간 outage를 겪었다. 자동 failover는 무서운 기능이다.

### Fencing — Split Brain 방어

새 leader가 선출되면 옛 leader가 어떤 식으로든 쓰기를 못 하게 막아야 한다.

- **STONITH** (Shoot The Other Node In The Head) — 옛 노드의 전원을 끄거나 네트워크를 차단
- **Lease + fencing token** — 단조 증가하는 토큰. storage 계층이 토큰이 더 작으면 거부
- **Quorum 기반 leader election** — Raft, Paxos. 다수결로 한 번에 한 leader만 인정

Fencing 없이 실패한 failover는 데이터 corruption으로 끝난다.

## Replication Log 구현

Leader가 변경을 어떻게 follower에 알리는가.

### Statement-based

SQL 문 자체를 그대로 전파한다.

```sql
-- 전파
INSERT INTO users VALUES (1, 'Alice', NOW());
```

**문제** — non-deterministic 함수. `NOW()`, `RAND()`, `AUTOINCREMENT` 등은 follower에서 다른 값이 나옴. trigger와 stored procedure도 위험.

MySQL이 옛날 기본값이었다가 row-based로 바꾼 이유.

### Write-Ahead Log (WAL)

DB의 내부 변경 로그를 그대로 전파. PostgreSQL streaming replication이 사용한다.

```text
WAL: "page 123, offset 456, write bytes ABC..."
```

**장점** — non-deterministic 문제 없음, 빠름
**단점** — 스토리지 엔진과 강결합. DB 메이저 버전 업그레이드 시 호환성 깨질 수 있어 *rolling upgrade 어려움*

### Logical (Row-based) Log

변경된 행을 직접 전파. MySQL binlog가 row-based 모드일 때 이 방식.

```text
Row inserted: table=users, row=(1, "Alice", "2024-01-01")
Row updated: table=orders, row_id=42, before=(...), after=(...)
```

**장점** — 스토리지 엔진과 독립, 버전 호환성 좋음, 외부 시스템(Debezium 같은 CDC)이 쉽게 소비
**단점** — 큰 트랜잭션은 큰 로그

### Trigger-based

DB의 trigger로 다른 테이블에 변경을 기록하고 외부 프로세스가 그 테이블을 폴링. 유연하지만 느리고 버그 많음. 거의 안 씀.

## 복제 지연 문제

비동기 복제의 결과 — **follower가 뒤처짐**(*replication lag*). 이게 가시적인 일관성 문제를 만든다.

### 시나리오 1 — Read-Your-Writes Consistency

사용자가 자기 데이터를 쓰고 즉시 읽었는데 자기 쓰기가 안 보임.

```text
사용자 → write to leader (프로필 사진 업데이트)
사용자 → read from follower (페이지 새로고침)
사용자 화면: 옛 사진 ("어? 내가 방금 바꿨는데?")
```

해법.

- 사용자 *자기 데이터*는 leader에서 읽기
- 또는 자기 마지막 쓰기 이후 일정 시간 동안만 leader에서 (timestamp 비교)
- 모니터링 — replication lag이 임계치 초과 시 알람

### 시나리오 2 — Monotonic Reads

같은 사용자가 차례로 두 follower에서 읽으면 첫 follower가 더 최신, 두 번째 follower가 옛 데이터인 경우. *시간이 거꾸로 흐르는 듯*한 경험.

```text
1차 read → Follower A (lag 100ms): 최신 댓글 10개
2차 read → Follower B (lag 2s): 댓글 8개 ("내 댓글이 사라졌어!")
```

해법 — 같은 사용자는 항상 같은 follower에서 읽기 (sticky session, user ID 해시).

### 시나리오 3 — Consistent Prefix Reads

인과 관계가 깨짐. 질문이 답보다 늦게 보이는 현상.

```text
Alice: "What's the time?"     ← Partition 1에 쓰기
Bob: "10:30"                  ← Partition 2에 쓰기

다른 follower에서 읽으면:
  Bob: "10:30" (먼저 도착)
  Alice: "What's the time?" (나중에 도착)
```

원인 — 서로 다른 partition은 서로 다른 lag을 가짐. 인과 관계 있는 쓰기가 *순서 보장* 없이 도착.

해법 — 인과 관계 있는 쓰기를 같은 partition에 놓거나, *causally consistent* 알고리즘 사용 (vector clock 등, 9장).

### 시나리오 4 — Cross-Device Consistency

같은 사용자가 폰에서 쓰고 노트북에서 읽을 때.

```text
폰 → leader: "이메일 주소 변경"
노트북 → follower: "옛 이메일 그대로"
```

device sticky가 안 통하므로 user-level sticky 또는 *write-through cache*가 필요. *centralized session*에 마지막 쓰기 timestamp를 둬서 그 시각 이전 데이터는 거부.

### 시나리오 5 — Pipeline Lag

쓰기 → 검색 인덱스 갱신 → 검색. 검색 인덱스가 별도 시스템이면 그 자체로 또 다른 lag.

```text
사용자 → 게시물 작성 (DB write)
사용자 → 자기 게시물 검색 → 검색 인덱스에 아직 없음
```

해법 — 자기 글은 *fallback*으로 DB 직접 조회, 또는 검색 결과에 *just-written marker*를 추가.

## Multi-Leader Replication

여러 leader가 모두 쓰기를 받고 서로에게 변경을 전파한다.

```text
[Leader 1] ←──→ [Leader 2]
    ↓             ↓
[Followers]   [Followers]
```

### 사용 사례

- **Multi-datacenter** — 각 DC에 leader를 둠. DC 내부 쓰기는 빠르고, DC 사이는 비동기 복제. 한 DC 전체가 죽어도 다른 DC가 운영 가능. AWS DynamoDB Global Tables, Cosmos DB multi-region writes
- **Offline-first** — 모바일 앱이 자기 로컬 DB(leader 역할)에 쓰고, 온라인 되면 서버와 sync. Apple Notes의 옛 동기화 모델이 유사
- **Collaborative editing** — Google Docs, Figma. 각 클라이언트가 leader, 서버 통해 다른 클라이언트와 sync

### Write Conflict

두 leader가 *같은 행*을 동시에 다르게 변경하면.

```text
Leader 1 (서울): users.name "Alice" → "Alice Kim"
Leader 2 (도쿄): users.name "Alice" → "Alice Lee"

DC 간 복제 후: 어느 게 정통?
```

해법 옵션.

**1. 충돌 회피** — 같은 행은 항상 같은 leader로 가게 라우팅 (sharding by user ID). 가장 단순하고 가장 흔함. 사실상 multi-leader가 아닌 *partitioned single-leader*.

**2. Last-Write-Wins (LWW)** — 타임스탬프 큰 쪽이 이김. 단순하지만 *데이터 손실* — 작은 timestamp 쓰기는 사라짐. 시계 동기화에도 취약.

**3. 사용자에게 묻기** — UI에서 충돌 해결 (Git merge처럼). Apple Notes의 옛 모델, Dropbox conflicted copy.

**4. 자동 merge** — application 레벨에서 도메인 규칙으로 merge. 예: 카운터는 합산, set은 union.

**5. CRDT (Conflict-free Replicated Data Types)** — 자동 merge가 *수학적으로* 보장되는 자료구조. Counter, set, register, document(Yjs, Automerge) 등.

### 토폴로지

Multi-leader는 *서로* 복제해야 하므로 토폴로지가 중요하다.

- **All-to-all** — 모든 leader가 다른 모든 leader에게 보냄. 가장 안전, 트래픽 많음
- **Circular** — leader들이 원으로 연결. 한 노드 죽으면 끊김
- **Star** — 한 중앙 leader가 허브. 허브 죽으면 모두 끊김

대부분 all-to-all을 쓰지만 *causal ordering* 보장이 어려움.

## Leaderless Replication

Amazon Dynamo (2007) 논문의 영향. Cassandra, Riak, Voldemort, ScyllaDB, DynamoDB가 이 계열.

```text
클라이언트 → 여러 노드에 직접 쓰기
클라이언트 → 여러 노드에서 직접 읽기
```

Leader 없이 클라이언트가 직접 *quorum*과 통신한다. 또는 coordinator 노드가 중개.

### Quorum 읽기/쓰기

N개의 replica 노드가 있을 때 W개에 쓰기 성공해야 commit, R개에서 읽기.

```text
W + R > N → 강한 일관성 보장
```

이 식이 핵심이다. 예: N=3, W=2, R=2 → W+R=4 > N=3 → 항상 최신 데이터 보장.

```text
Write: [v1] [v1] [v0]   ← 2개 성공 (W=2)
Read:  [?]  [v1] [v1]   ← 2개에서 읽음 (R=2)
                          → 적어도 하나는 v1
```

흔한 설정.

| N | W | R | 특성 |
|---|---|---|------|
| 3 | 2 | 2 | 기본값, 강한 일관성 |
| 3 | 3 | 1 | 읽기 빠름, 쓰기 모든 노드 |
| 3 | 1 | 3 | 쓰기 빠름, 읽기 모든 노드 |
| 5 | 3 | 3 | 더 큰 fault tolerance |

### Sloppy Quorum과 Hinted Handoff

엄격한 quorum이 안 되면 *옆 노드*에 임시 저장.

- **Sloppy Quorum** — 원래 담당 노드 중 W개를 못 채우면 다른 가용 노드에 임시로 씀. 가용성 우선
- **Hinted Handoff** — 원래 담당 노드가 복귀하면 임시 노드가 데이터를 전달

엄격한 quorum이 깨지므로 W+R>N의 일관성 보장도 깨진다. CAP 관점에서 *AP* 쪽으로 더 기울어진다.

### Read Repair와 Anti-Entropy

여러 노드에서 읽었을 때 버전이 다르면 — 옛 노드를 갱신해야 한다.

- **Read Repair** — 읽기 시 발견한 stale replica를 동기적으로 갱신. 자주 읽히는 키에만 효과적
- **Anti-Entropy** — 백그라운드 프로세스가 노드들을 비교하고 동기화. Merkle tree로 차이를 효율적으로 찾음

### Concurrent Write — Vector Clock

두 클라이언트가 동시에 같은 키에 다른 값을 쓰면 — 어느 게 최신인가?

타임스탬프(LWW)는 시계 동기화에 취약. Dynamo는 **vector clock**으로 인과 관계를 추적한다.

```text
v1 = {A:1}             ← 노드 A의 1번 쓰기
v2 = {A:1, B:1}        ← v1을 본 후 노드 B의 1번 쓰기
v3 = {A:2}             ← v1을 본 후 노드 A의 2번 쓰기

v2 vs v3 — 서로 모름. concurrent. 둘 다 보존
```

Concurrent 쓰기는 *sibling*으로 남기고 application이 merge한다. 시즌별 장바구니 머지가 Dynamo 논문의 유명한 예시.

## CAP 정리와 Replication 모델

세 모델을 CAP(Consistency, Availability, Partition tolerance) 관점에서 비교.

| 모델 | 네트워크 분단 시 |
|------|------------------|
| Single-leader (동기) | CP — 일관성 보존, 가용성 양보 |
| Single-leader (비동기) | AP-ish — 읽기는 살아있음, lag |
| Multi-leader | AP — 각 leader 독립 운영, 나중에 충돌 해결 |
| Leaderless (sloppy) | AP — 가용성 최우선 |
| Leaderless (strict quorum) | CP-ish — quorum 깨지면 거부 |

실제 시스템은 CAP의 양 극단에 고정돼 있지 않다. *언제* 어느 쪽으로 기울지를 *튜닝 가능*하게 노출한다.

## 시스템 사례

### MySQL Replication

- 기본은 비동기, 5.7+에서 semi-sync 옵션
- Binlog 기반 (row-based 권장)
- Failover는 외부 도구 (Orchestrator, MHA, ProxySQL)
- 그룹 복제(Group Replication)와 InnoDB Cluster로 자동화

### PostgreSQL Streaming Replication

- WAL 기반
- Synchronous / asynchronous 선택 가능
- Hot standby에서 read 가능
- Failover는 Patroni / repmgr 같은 외부 도구

### MongoDB Replica Set

- Primary 1, secondary N
- 자동 failover, election 내장
- Read preference 설정 (primary / secondary / nearest)
- Oplog 기반 복제

### Cassandra

- Leaderless, 모든 노드가 동등
- Tunable consistency — `ONE`, `QUORUM`, `ALL`, `LOCAL_QUORUM` 등
- Consistent hashing + virtual nodes
- Hinted handoff, read repair, anti-entropy

### DynamoDB

- Managed, 내부적으로 leaderless + multi-master
- Global Tables — multi-region multi-leader
- Last-Write-Wins 기본
- Strong consistency read 옵션

## 운영 관점 — Replication Lag 모니터링

복제 lag은 분산 DB의 가장 중요한 지표 중 하나다. 운영 시 다음을 본다.

- **Lag bytes** — leader WAL position - follower replay position
- **Lag seconds** — leader 마지막 commit 시각 - follower 마지막 apply 시각
- **Replay rate** — follower가 초당 처리하는 WAL 양
- **Network throughput** — leader↔follower 사이 대역폭

```text
Leader WAL pos: 0x1234ABCD
Follower pos:   0x1234A800
Lag bytes:      ~2 KB
```

임계치 초과 시 알람. 대처 방법.

- Follower 하드웨어 업그레이드 (replay가 bottleneck)
- 비동기 → semi-sync 약화
- Read replica 추가로 부하 분산
- Long-running query kill (Postgres `hot_standby_feedback`)

## CAP과 PACELC

CAP — 네트워크 분단(P) 시 일관성(C)과 가용성(A) 중 선택.

PACELC — 분단 시 P→C/A 선택, 평상시(E)에도 latency(L)와 consistency(C) 선택. 더 현실적인 모델.

| 시스템 | PACELC |
|--------|--------|
| Spanner | PC/EC — 일관성 우선 |
| DynamoDB | PA/EL — 가용성·latency 우선 |
| Cassandra | PA/EL |
| MongoDB | PA/EC — 분단 시 가용성, 평상시 일관성 |

복제 모델 선택이 이 위치를 결정한다.

## Causality와 Replication

이 챕터의 마지막 통찰 — *causality*는 시간보다 미묘하다.

Wall clock은 노드마다 다르고 NTP 동기화도 ms 단위 오차. 그래서 *물리 시계*만으로는 인과 관계를 보장할 수 없다.

해법.

- **Logical clock** — Lamport timestamp. 인과 관계 보존, total order 아님
- **Vector clock** — concurrent vs causal 구분 가능
- **Hybrid logical clock (HLC)** — 물리 시간 + 논리 시간 결합. CockroachDB가 사용
- **TrueTime** — Google Spanner의 GPS+atomic clock. 명시적 *uncertainty interval*

복제 시스템의 *진짜 일관성*은 9장(Consistency and Consensus)에서 깊이 다룬다.

## Failure Mode Catalog

복제 시스템에서 흔히 보는 장애 패턴.

| 장애 | 증상 | 대응 |
|------|------|------|
| Follower lag spike | replication delay 급증 | replay 가속, hot_standby_feedback 조정 |
| Leader OOM | 모든 쓰기 실패 | failover, max_connections 튜닝 |
| Split brain | 두 leader 동시 쓰기 | fencing 점검, quorum-based election |
| Sloppy quorum stale read | 옛 데이터 반환 | read repair, strict quorum 강제 |
| Bad WAL apply | follower 멈춤 | follower 재구성 (rebuild) |
| Cascading failover | 연쇄 leader 교체 | failover threshold 상향, manual intervention |

운영 매뉴얼에 패턴별 runbook을 준비해 두는 게 필수.

### Postgres 예시 — hot_standby_feedback

Follower에서 *long-running query*가 실행 중이면, leader가 VACUUM으로 삭제한 row가 follower에서 *아직 필요*할 수 있다. 그러면 follower의 query가 *cancel* 되거나, leader의 VACUUM이 지연됨.

`hot_standby_feedback = on`을 켜면 follower가 자기 query 상태를 leader에 알림. leader는 그 row를 VACUUM 안 함. 대신 leader bloat 증가 위험.

이런 미묘한 절충점이 복제 운영의 본질.

## 복제 모델 선택 가이드

실무에서 새 시스템을 시작할 때.

1. **읽기 ≫ 쓰기, 단일 리전** → Single-leader + async replicas. PostgreSQL streaming, MySQL replication
2. **읽기·쓰기 균등, 단일 리전, 강한 일관성** → Single-leader + synchronous replica. 비용 큰 대신 견고
3. **Multi-region, 가용성 우선** → Multi-leader 또는 leaderless. DynamoDB Global Tables, Cassandra
4. **Multi-region, 강한 일관성 필요** → Spanner, CockroachDB. 합의 알고리즘 기반
5. **Offline 클라이언트** → CRDT 기반 sync. Yjs, Automerge

대부분의 스타트업은 1번에서 시작해 트래픽이 늘면서 위로 올라간다. *처음부터 5번*은 과도한 복잡도.

## 정리

- 복제 = 같은 데이터를 여러 노드에. 가용성·지연·확장성을 얻음
- **Single-Leader** — 가장 흔함. 동기/비동기/semi-sync 선택. Failover의 split brain·fencing이 어려움
- **Replication log** — statement / WAL / row-based. row-based가 호환성 가장 좋음
- **복제 지연 5가지 시나리오** — Read-your-writes, Monotonic reads, Consistent prefix, Cross-device, Pipeline lag
- **Multi-Leader** — multi-DC, offline-first, collaborative editing. 충돌 해결이 본질적
- **CRDT** — 자동 충돌 해결 자료구조
- **Leaderless** — Dynamo 계열. Quorum (W+R > N), sloppy quorum, hinted handoff, read repair
- **Vector clock** — concurrent 쓰기 인과 관계 추적
- 비유 — leader = 본사, follower = 지점, multi-leader = 여러 지부, leaderless = 위원회 합의
- 사례 — MySQL/Postgres streaming, MongoDB replica set, Cassandra, DynamoDB

## 다음 장 예고

다음 장은 **Partitioning** — 데이터를 여러 노드에 *어떻게 나눌* 것인가. Key range vs hash, hot spot, secondary index, rebalancing의 세계.

## 관련 항목

- [Ch 4: Encoding](/blog/parallel/designing-data-intensive-applications/chapter04-encoding-and-evolution)
- [Ch 6: Partitioning](/blog/parallel/designing-data-intensive-applications/chapter06-partitioning)
- [AMP Ch 12: Distributed Coordination](/blog/parallel/parallel-principles/ch12-counting-sorting-and-distributed-coordination)
