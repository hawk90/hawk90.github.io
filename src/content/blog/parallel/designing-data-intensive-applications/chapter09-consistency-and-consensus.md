---
title: "Ch 9: 일관성과 합의"
date: 2026-05-12T09:00:00
description: "Linearizability, Causal Consistency, CAP 정리. Consensus 알고리즘 — Paxos, Raft. Two-Phase Commit."
tags: [DDIA, Consistency, Linearizability, Consensus, Paxos, Raft, CAP]
series: "Designing Data-Intensive Applications"
seriesOrder: 9
draft: true
---

## 이 챕터의 메시지

분산 시스템의 가장 어려운 주제. 노드들 사이에서 "무엇이 진실인가"에 어떻게 합의할 것인가.

이 챕터에서 다루는 개념들.

- **Linearizability** — 가장 강한 단일 객체 일관성
- **Causal Consistency** — 인과 순서 보존
- **CAP 정리** — 트레이드오프
- **Consensus** — Paxos, Raft
- **Two-Phase Commit** — 분산 트랜잭션

일상의 비유. **Linearizability = 모두가 같은 시계**. 어느 도시 어느 사람이 보든 — 동일한 시계, 동일한 순간. 어떤 결정이 "지금"보다 앞이면 모두에게 앞이고, 뒤면 모두에게 뒤다. **Causal = 원인이 결과 앞에**. 시계는 다 달라도 좋은데 — "비가 와서 우산을 폈다"는 인과는 모두에게 같은 순서로 보여야 한다.

## Linearizability — "최신" 답이 의미가 있는 것

> 모든 작업이 어떤 직렬 순서로 즉시 일어난 것처럼 동작.

```text
T1: write(x, 1)
T2: read(x) → 1 (또는 더 새 값)
T3: read(x) → 1 또는 그 이후 값
```

linearizable system에서는 "최신 값"이 명확. 단일 노드의 강한 일관성을 분산에 확장.

**핵심 속성** — "recency guarantee". 한 read가 어떤 write보다 시간상 뒤라면, read는 그 write 이후의 값을 본다. "단일 복사본 환상" — 시스템이 분산되어 있어도 마치 한 노드처럼 동작.

```text
실제:
  Node A: x = 1 (replicated to B, C)
  Client 1: write(x, 2) → A
  Client 2: read(x) → B, returns 1 (옛 값)
  Client 3: read(x) → A, returns 2 (새 값)

Linearizable이면:
  Client 2의 read가 Client 1의 write 완료 후라면 — 2를 봐야 함
  3을 못 보면 linearizability 위반
```

**대가** — 매우 비싸다. Linearizable이 되려면 모든 노드가 항상 동의해야 함. 네트워크 partition에서는 quorum이 동작하는 한쪽만 진행 가능.

### Linearizability vs Serializability

이름이 비슷해 헷갈리지만 다른 개념.

| | Linearizability | Serializability |
|---|---|---|
| 대상 | 단일 객체 | 여러 객체에 걸친 트랜잭션 |
| 보장 | 실시간 순서 | 어떤 직렬 순서가 존재 |
| 관심 | 분산 복제 | 동시 트랜잭션 |
| 비용 | 매우 비쌈 (consensus 필요) | 비쌈 (락 또는 abort) |

둘 다 제공하면 **strict serializability** 또는 **external consistency**. Spanner가 이걸 제공.

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

```text
A: post photo
B: comment on photo

다른 사용자가 볼 때:
  먼저 photo, 그 다음 comment (인과 순서) — 보장
  Alice의 다른 글 vs Bob의 다른 글 — 순서 자유
```

Linearizable은 **global total order**. Causal은 **partial order** — 인과 관계가 있을 때만 강제.

**훨씬 싸다** — partition을 견딘다. AP 시스템도 causal consistency는 줄 수 있다.

### 인과 관계의 추적

두 이벤트의 인과 관계는 어떻게 알 수 있나? 세 가지 도구.

- **Lamport timestamp** — 단조 증가 counter. 모든 이벤트에 부여.
- **Vector clock** — 노드별 counter 벡터. 부분 순서 정확.
- **Sequencer** — 한 노드가 단조 ID 부여 (그 노드가 SPOF).

```text
Lamport: T_A = 5, T_B = 7 → B가 A보다 뒤 (어쩌면)
Vector: V_A = [3,2,1], V_B = [3,4,1] → B가 A보다 뒤 (확정)
       V_A = [3,2,1], V_C = [2,3,2] → 비교 불가 (concurrent)
```

Lamport는 — total order를 주지만 인과 관계의 진위는 알 수 없다. Vector clock은 — 두 이벤트가 인과적으로 비교 가능한지를 확정한다.

## Total Order Broadcast — Consensus의 다른 이름

모든 노드가 같은 순서로 메시지를 받음.

```text
모든 노드: msg1, msg2, msg3, msg4, ... (같은 순서)
```

이게 가능하면 — replicated state machine이 가능. 모든 노드가 같은 입력 → 같은 상태.

Total order broadcast = consensus와 등가. 한 쪽이 가능하면 다른 쪽도 가능. 그래서 Raft / Paxos가 total order broadcast를 구현하는 알고리즘이라고 봐도 좋다.

### Replicated State Machine

```text
State_0 → apply(op_1) → State_1 → apply(op_2) → State_2 → ...
```

모든 노드가 같은 시작 상태에서, 같은 순서로 같은 연산을 적용 → 항상 같은 상태. 이 패턴이 etcd, Zookeeper, CockroachDB 등 거의 모든 강한 일관성 시스템의 기반.

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

**증명 직관** — async에서는 "느린 노드"와 "죽은 노드"를 구분 불가능. 알고리즘이 결정을 내릴 시점을 정해두면 — 그 시점에 그 결정에 결정적인 노드가 그냥 느린 척하면 알고리즘이 잘못된 결정을 강요받음.

**현실에선 어떻게?** — Asynchronous를 약간 양보. Partial synchronous 가정. 또는 timeout으로 진행 보장. Safety는 항상 보장, liveness는 "결국 partial sync가 되면" 보장.

이게 Paxos / Raft가 동작하는 이유. Async에서 잘못된 결정은 하지 않는다. 영원히 못 끝낼 수 있을 뿐.

## Paxos / Raft

분산 consensus의 실용 알고리즘.

### Paxos (Lamport, 1989)

가장 유명하면서 이해 어려운 알고리즘. 다음 단계.

1. **Prepare** — proposer가 번호 n을 던져 권한 요청
2. **Promise** — acceptor가 더 큰 번호 promise (이 후 더 작은 번호는 무시)
3. **Accept** — proposer가 값을 보냄, 다수 acceptor 동의 시 결정
4. **Commit** — 결정된 값을 모두에게 알림

**Multi-Paxos** — 여러 값을 연속으로 결정 (state machine). 매번 prepare phase를 안 하기 위해 leader를 한 번 뽑고 그 후로는 accept만.

이해 어렵기로 악명. Lamport의 원논문이 너무 추상적이라 후속 논문들이 더 나옴. "Paxos Made Simple"도 여전히 어렵다는 평.

### Raft (Ongaro & Ousterhout, 2014)

**이해 가능한 consensus**를 목표로 디자인. Stanford의 박사 논문에서 출발.

세 부분으로 분해.

- **Leader Election** — 한 leader 선출, 그가 결정 주도
- **Log Replication** — leader가 entry를 followers에 전파
- **Safety** — 같은 entry를 두 leader가 다르게 commit 못 함

#### Leader Election

각 노드가 **term** (epoch)을 가진다. Term은 단조 증가.

```text
Follower → (election timeout) → Candidate
Candidate: 자기 term 증가, vote 요청
다수 vote → Leader
다른 leader 발견 (더 큰 term) → Follower
```

Election timeout은 randomized — 모두 동시에 candidate가 되어 vote 분할되는 걸 피함. 보통 150–300ms.

#### Log Replication

Leader가 client의 모든 명령을 받음. Log에 append. Follower들에 `AppendEntries` RPC로 전파.

```text
Leader log:  [1: x=1] [2: y=2] [3: z=3]
Follower:    [1: x=1] [2: y=2]            ← 뒤처짐, 따라잡기
```

다수가 entry를 받으면 — leader가 commit. Commit된 entry는 state machine에 적용.

#### Safety

가장 미묘한 부분. 같은 인덱스의 log entry가 두 노드에서 다른 명령이 되지 않게 보장.

- Election restriction — 가장 최신 log를 가진 candidate만 leader 가능
- Term 검증 — Leader가 자기 term의 entry를 commit한 후에만 옛 term의 entry를 indirectly commit

Raft가 산업에 빠르게 채택. etcd, Consul, CockroachDB, TiKV — 모두 Raft.

### Paxos vs Raft

| | Paxos | Raft |
|---|---|---|
| 발표 연도 | 1989 | 2014 |
| 가독성 | 어려움 | 쉬움 |
| Leader | 옵션 (Multi-Paxos) | 필수 |
| 산업 채택 | Google Chubby, Spanner | etcd, CockroachDB, Consul, TiKV |
| 변종 | 많음 (EPaxos, Fast Paxos 등) | 비교적 통일 |

이론적 power는 같음. 실용에서는 Raft가 빠르게 표준이 됐다.

## Two-Phase Commit (2PC)

분산 트랜잭션 — 여러 노드에 걸친 ACID.

**Phase 1 — Prepare**:

- Coordinator → 모든 participant: "준비됐어?"
- 각 participant: "준비됐어 (yes)" 또는 "불가 (no)"

**Phase 2 — Commit/Abort**:

- 모두 yes → coordinator가 "commit"
- 하나라도 no → "abort"
- 모든 participant가 수행

```text
T0: client → coordinator: start transaction
T1: coordinator → A, B: prepare
T2: A, B → coordinator: yes
T3: coordinator: commit log (durability point)
T4: coordinator → A, B: commit
T5: A, B: 실제 commit
```

T3가 결정점이다. 여기를 넘으면 — 어떤 fault가 와도 결정은 commit. T3 전이면 abort. Participant는 prepare 응답 후 — coordinator의 결정을 기다리는 동안 자기 자원을 잠그고 있다.

### 2PC의 문제

**Blocking**. Coordinator가 phase 2에서 죽으면 — participant는 commit / abort를 알 수 없음. 영원히 기다림.

이걸 **uncertain phase** 또는 **in doubt** 라 부름.

```text
T1: prepare yes → 자원 잠금
T2: coordinator crash
T3: participant: 락 잡은 채 무한 대기
```

해법:

- **3PC** (3-Phase Commit) — 더 복잡, 여전히 한계 (network partition에서 깨짐)
- **Coordinator를 분산** — Raft 위에 2PC. 결정 자체를 합의로.
- **분산 트랜잭션을 피함** — 마이크로서비스 스타일

### 2PC vs 3PC

3PC는 — phase 2 사이에 "pre-commit" phase를 끼워, 어느 한쪽이 죽어도 다른 노드의 상태로부터 결정을 추론 가능하게. 그러나 — network partition 가정 아래서는 여전히 깨진다. 실용 시스템에서는 거의 안 쓴다.

## Saga Pattern

분산 트랜잭션의 실용적 대안. 마이크로서비스 시대에 인기.

```text
Step 1: Order Service — create order
Step 2: Payment Service — charge card
Step 3: Inventory Service — reserve
Step 4: Shipping Service — ship

실패 시 — 보상 트랜잭션 (compensating action)으로 롤백
  Cancel shipping → release inventory → refund payment → cancel order
```

- ACID 양보 (특히 isolation)
- Eventual consistency
- 더 가용적
- 보상 로직을 직접 설계해야 함 (DB가 해주지 않음)

Saga는 — 분산 트랜잭션의 비용을 회피하는 대신, 일시적 불일치를 받아들이고 보상으로 마무리. 비즈니스 도메인에서 자연스러운 패턴이면 좋은 선택.

## Epoch / Fencing — Consensus의 빠진 한 조각

Consensus 알고리즘은 — 한 번에 한 leader만 결정 권한을 가지게 보장한다. 그러나 옛 leader가 자기가 더 이상 leader가 아닌 걸 모를 수 있다 (Ch 8의 process pause).

해법 — **epoch number** + **fencing token**.

```text
Term 5: Leader A → operations with token=5
[A가 GC pause]
Term 6: 새 leader B → operations with token=6
[A 깨어남, 자기가 leader라고 믿음]
A → storage: write with token=5
Storage: "내가 본 최대 token=6, 5는 거부"
```

Raft의 term number가 이걸 한다. 모든 RPC에 term이 포함되며, 옛 term의 RPC는 무시. 이게 — Raft의 safety가 process pause에서도 보장되는 이유.

## Leader Lease — 빠른 read의 트릭

매 read마다 quorum 통신은 비싸다. Lease를 쓰면 — leader가 일정 시간 동안 자기가 유일한 leader임을 보장받는다. 그 동안은 leader가 단독으로 read 응답 가능.

```text
T0: Leader가 5초 lease 받음
T0 ~ T5: Leader 단독 read OK
T5: lease 만료, 갱신 필요
```

문제는 — lease는 시계에 의존. Ch 8의 시계 문제가 그대로 적용. NTP 오차나 process pause로 lease가 시계상 만료됐어도 leader가 모를 수 있다.

Spanner는 — TrueTime의 uncertainty bound로 lease의 시계 문제를 다룬다. 일반 시스템은 — lease 만료 약간 전에 새 read를 quorum으로 fallback.

## Membership / Coordination Services

분산 시스템의 인프라.

- **Zookeeper** — Hadoop 생태계 표준. ZAB (Zookeeper Atomic Broadcast)라는 자체 consensus 프로토콜.
- **etcd** — Kubernetes, CockroachDB의 기반. Raft 사용.
- **Consul** — service discovery. Raft 사용.

이들 자체가 작은 강한 일관성 시스템 (보통 Raft / ZAB 위에). 큰 시스템이 이 작은 시스템을 통해 합의.

**책임**:

- 누가 leader인가
- 어떤 노드가 살아 있는가
- 설정 (분산된 설정 파일)
- 분산 락
- 서비스 등록

직접 구현하기보다 — 이런 도구를 쓴다.

## 시스템 사례

### Zookeeper ZAB

Zookeeper Atomic Broadcast. Paxos의 변종이지만 — leader 기반, 항상 같은 leader가 모든 write를 처리. Total order broadcast 제공.

Hadoop 시대의 분산 coordination 표준. HBase, Kafka (메타데이터), Solr 등이 의존.

### etcd Raft

Raft의 reference 구현 중 하나. Go로 작성. Kubernetes의 모든 상태가 여기 저장된다 — Pod, Deployment, Secret 등.

Snapshot, log compaction, learner (non-voting) node 같은 production 기능을 갖춤. 다른 시스템 (CockroachDB, TiKV)이 라이브러리로 가져다 쓰는 경우도 많다.

### CockroachDB — Raft + HLC

CockroachDB는 — 각 range (shard)마다 별도 Raft group. 수천 개의 Raft가 동시에 돈다.

Timestamp는 **HLC** (Hybrid Logical Clock) — physical time과 logical counter를 결합. Spanner의 TrueTime처럼 strict한 시계 동기화 없이도, 노드 간 인과 순서를 추적.

```text
HLC = (physical_time, logical_counter)
  대소 비교 시 physical 우선, 같으면 logical
```

NTP 오차를 logical counter로 흡수. Spanner만큼 강한 external consistency는 아니지만 — 일반 데이터센터 하드웨어에서 동작.

### Spanner — Paxos + TrueTime

Google Spanner. 각 shard마다 Paxos group. TrueTime API로 commit timestamp 안전하게 부여. External consistency 제공.

Ch 7, Ch 8에서 다룬 내용. 여기서는 — "consensus와 시계 동기화의 조합으로 strictest한 일관성을 분산에서 달성한 예"로 기억.

## Read-Your-Writes / Monotonic Reads / Consistent Prefix

Eventual consistency의 변종들. Linearizability보다 약하지만 — 사용자 체감에서 일관성을 흉내내는 보장들.

- **Read-Your-Writes** — 자기가 방금 쓴 글을 자기는 본다. 다른 사용자는 아직 못 봐도 OK.
- **Monotonic Reads** — 한 번 새 값을 본 사용자는 다음 read에서 더 옛 값으로 후퇴하지 않는다.
- **Consistent Prefix** — 인과 순서가 보존된 write의 prefix를 본다. (Causal consistency의 단순화.)

```text
Read-Your-Writes 위반:
  Alice: 자기 프로필 사진 변경
  Alice: 새로고침 → 옛 사진 (다른 복제본에서 read)
  → 사용자 입장에서 "내가 한 게 안 됨"

Monotonic Reads 위반:
  Alice: read → "5 messages"
  Alice: read → "3 messages"
  → 사용자 입장에서 "메시지가 사라짐"
```

응용 레벨에서 이런 일관성을 흉내내는 트릭. Read-Your-Writes는 — 자기 write를 캐시에 두고 read 시 캐시 우선. 또는 — 자기 user ID에 묶인 read는 항상 leader에서. Monotonic Reads는 — 한 사용자는 항상 같은 복제본에서 read (sticky session).

대부분의 SNS / 댓글 서비스는 — 이 정도면 충분. linearizability를 풀어주는 대신 — 비용을 크게 줄인다.

## 합의의 한계 — 비싼 만큼 신중히

Consensus는 — 분산 시스템의 가장 강력한 도구이지만 동시에 가장 비싼 도구다.

- 모든 결정이 다수 노드의 동의 필요 → 최소 1 RTT
- Leader 장애 시 election → 수백 ms 정지
- Cross-datacenter consensus → 수십 ms latency

그래서 — 모든 결정을 consensus로 하지 않는다. **누가 leader인가** 같은 메타데이터 결정만 consensus로, 그 후 leader가 단독으로 빠른 결정. 또는 — strong consistency가 정말 필요한 부분만 consensus, 나머지는 eventual consistency.

## Linearizability를 언제 쓰는가

Linearizability가 정말 필요한 경우 — 의외로 적다. 흔한 사례.

- **Leader election** — "누가 leader인가"에 두 답이 있으면 split brain. Linearizable한 single register가 필요.
- **Uniqueness constraint** — 두 사용자가 같은 이메일로 동시 등록. 한 명만 성공해야.
- **Cross-channel timing dependency** — 한 채널 (DB)에 write 후, 다른 채널 (메시지 큐)로 알림. 알림 받은 다른 노드가 DB를 읽으면 — write가 보여야 한다.

이런 경우가 아니면 — eventual consistency 또는 causal consistency로 충분.

```text
SNS 글 게시:
  Alice가 글 → DB write → Bob의 feed가 새 글 표시
  → 5초 지연돼도 응용에 큰 문제 없음
  → eventual consistency OK

ATM 송금:
  잔액 확인 → 인출 → 다른 ATM에서 또 인출?
  → 두 인출이 동시면 두 번 인출 가능
  → linearizability 또는 명시적 lock 필요
```

## ZooKeeper의 격리 모델

ZooKeeper는 분산 coordination의 표준 — Hadoop, Kafka 등이 의존. 격리 모델을 이해하면 — 어떻게 써야 안전한지 보인다.

- **Linearizable writes** — 모든 write가 linearizable. 한 leader가 모든 write 직렬화.
- **Sequential consistency for reads** — read는 follower에서도 가능. 옛 데이터를 볼 수 있음.
- **`sync` 명령** — read 직전 호출하면 linearizable read 흉내. Leader까지 sync 강제.

이 모델을 모르고 "ZooKeeper는 강한 일관성"으로 알면 — 옛 데이터 기반 결정이 일어날 수 있다. 안전한 leader election을 위해 — `sync` 후 read하는 패턴이 표준.

## ABD 알고리즘 — Linearizable Read의 비싼 비용

Linearizable read를 만드는 가장 단순한 방법.

```text
Read:
  1. 모든 (또는 quorum) 노드에서 (value, version) 가져옴
  2. 가장 큰 version을 고름
  3. 그 값을 quorum에 다시 write (writeback)
  4. 그 값을 반환
```

Writeback 단계가 핵심. 그 단계가 없으면 — 다음 read가 더 옛 값을 볼 수도 있다. 이 알고리즘이 **ABD** (Attiya-Bar-Noy-Dolev). Quorum read가 그냥 빠르지 않은 이유다.

Raft 같은 leader 기반 시스템은 — leader가 모든 read를 처리하면 writeback 없이 linearizable. 다만 leader 부담이 늘고 — leader가 자기가 진짜 leader인지 항상 확인해야 한다 (위의 lease 또는 매 read마다 quorum heartbeat).

## 정리

- **Linearizability** — 가장 강한 단일 객체 일관성, "단일 복사본 환상"
- **Linearizability ≠ Serializability** — 분산 복제 vs 동시 트랜잭션
- **CAP** — partition 시 C vs A 트레이드오프 (단순화된 시각)
- **Causal Consistency** — partial order, 인과만 보존, 거의 모든 응용에 충분
- **Total Order Broadcast = Consensus**
- **FLP** — async에서 deterministic consensus 불가능 (safety는 보장, liveness만 양보)
- **Paxos** — 1989, 이해 어려움. Multi-Paxos가 실용.
- **Raft** — 2014, leader election + log replication + safety. 산업 표준.
- **2PC** — 분산 트랜잭션, blocking 문제. 3PC는 실용 X.
- **Saga** — eventual consistency의 실용적 대안. 보상 로직 직접 설계.
- **Zookeeper (ZAB) / etcd Raft / CockroachDB (Raft + HLC) / Spanner (Paxos + TrueTime)** — 실용 시스템.

## 다음 장 예고

여기서 Part II 끝. 다음 장부터 Part III — **Derived Data**. Batch 처리부터.

## 관련 항목

- [Ch 7: Transactions](/blog/parallel/designing-data-intensive-applications/chapter07-transactions)
- [Ch 8: 분산의 문제](/blog/parallel/designing-data-intensive-applications/chapter08-the-trouble-with-distributed-systems)
- [AMP Ch 5-6: Consensus](/blog/parallel/parallel-principles/ch05-relative-power-of-synchronization)
- [AMP Ch 3: Linearizability](/blog/parallel/parallel-principles/ch03-concurrent-objects)
