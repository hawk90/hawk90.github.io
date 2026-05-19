---
title: "Ch 6: 파티셔닝"
date: 2026-05-12T06:00:00
description: "데이터를 노드들에 어떻게 나눌 것인가 — Key range, Hash, Hotspot 처리, Secondary index, Rebalancing."
tags: [DDIA, Partitioning, Sharding, Consistent Hashing]
series: "Designing Data-Intensive Applications"
seriesOrder: 6
draft: true
---

## 이 챕터의 메시지

복제(replication)는 같은 데이터를 여러 곳에 두는 것. **파티셔닝**(sharding)은 *다른* 데이터를 다른 곳에 두는 것.

```text
1TB 데이터 → 10 노드에 각 100GB
```

왜 파티셔닝하는가.

- **확장성** — 한 노드에 다 안 들어간다
- **읽기/쓰기 처리량** — 부하를 여러 노드로 분산

복제와 파티셔닝은 *함께 쓰인다*. 각 파티션이 다시 여러 복제본을 가진다. 한 노드는 여러 파티션의 leader이거나 follower일 수 있다.

일상적 비유 — 파티셔닝은 *책을 알파벳별로 다른 책장에 분류*하는 일이다. 모든 책을 한 책장에 쌓으면 무너지고 찾기 어렵다. A-D는 1번 책장, E-L은 2번 책장. 그러다 한 책장이 너무 무거워지면 *책장 재배치*(rebalancing)가 필요하다.

## 파티셔닝과 복제의 결합

전형적인 배치.

```text
Partition 1 (a-d):  leader=N1, followers=[N2, N3]
Partition 2 (e-l):  leader=N2, followers=[N3, N4]
Partition 3 (m-r):  leader=N3, followers=[N4, N1]
Partition 4 (s-z):  leader=N4, followers=[N1, N2]
```

각 노드가 어떤 파티션의 leader, 다른 파티션의 follower 역할을 동시에 한다. 부하가 균등해진다.

## Key Range Partitioning

키의 *연속 범위*를 노드에 할당.

```text
Partition 1: a-d → Node 1
Partition 2: e-l → Node 2
Partition 3: m-r → Node 3
Partition 4: s-z → Node 4
```

BigTable, HBase, RethinkDB, MongoDB(범위 sharding 모드)가 채택.

### 장점

- **Range query 자연스러움** — `WHERE key BETWEEN 'e' AND 'k'`는 partition 2만 query
- **정렬된 데이터 효율적** — 인접 키들이 같은 partition
- **인접 시간 데이터** — 같은 날 로그가 같은 partition (감사·분석에 유리)

### 단점 — Hot Spot

같은 *유리함*이 거꾸로 문제를 만든다. 키가 시간순이면 모든 쓰기가 *마지막 partition*에 쏠림.

```text
키: 2026-05-19T10:00:00, 2026-05-19T10:00:01, ...
모두 마지막 partition에 → 한 노드 과부하
```

해법.

- **키에 무작위 접두사 추가** — `<hash(value)>-<timestamp>`. 분산은 되지만 range query 불가
- **시간 범위를 작게 분할** — partition 자동 분할 임계치를 낮춤
- **Application-level 분산** — 사용자 ID + 시간 같은 복합 키

## Hash Partitioning

키를 *해시*해서 노드를 결정.

```text
hash("alice") % 4 = 2 → Node 2
hash("bob")   % 4 = 1 → Node 1
hash("carol") % 4 = 3 → Node 3
```

Cassandra, Riak, MongoDB(hash sharding), DynamoDB, Voldemort가 채택.

### 해시 함수

JVM의 `Object.hashCode()`는 같은 키가 다른 process에서 다른 값을 낼 수 있어 *부적합*. 분산 시스템은 **언어·플랫폼 독립적**이고 **결정적**인 해시 함수를 쓴다.

- MurmurHash3
- xxHash
- MD5의 일부 (Cassandra의 Murmur3Partitioner 이전)

암호학적 보안은 필요 없다. 분포의 균등성과 속도가 중요.

### 장점

- **Hot spot 자연스럽게 분산** — 해시가 균등하면 부하가 균등
- **단순한 구현**

### 단점

- **Range query 불가능** — `WHERE key BETWEEN 'e' AND 'k'`는 모든 노드 query 필요. 그래서 *scatter-gather*가 됨
- **연속 키의 이점 사라짐** — 같은 사용자 로그가 여러 노드에 흩어짐

### 복합 키 — 절충안

Cassandra의 패턴 — *partition key*는 해시, *clustering key*는 범위.

```sql
CREATE TABLE messages (
  user_id UUID,           -- partition key (hash)
  ts TIMESTAMP,           -- clustering key (sorted within partition)
  body TEXT,
  PRIMARY KEY ((user_id), ts)
);
```

같은 user_id는 같은 노드 → 그 안에서 ts 범위 query 가능. 사용자별 메시지 timeline 같은 패턴에 잘 맞음.

## Skew와 Hot Spot — Celebrity Problem

Hash partitioning이 일반적으로는 균등 분포를 만든다. 그러나 **single hot key**가 있다면 해시도 못 푼다.

```text
Celebrity Alice의 트윗 — 모든 follower가 같은 user_id를 query
→ 한 partition에 트래픽 집중
```

DynamoDB는 *hot partition* 경고를 명시적으로 띄운다. Twitter timeline, Instagram 인기 게시물, 게임 글로벌 랭킹 — 모두 같은 문제.

해법.

**1. Random suffix / prefix**

```text
alice           → alice-00, alice-01, ..., alice-99
              → 100개 키, 다른 partition에 분산
```

쓰기는 무작위 suffix에 분산. 읽기는 100개 모두 query 후 합산 (*fan-out read*).

**2. Application-level caching**

Celebrity 데이터는 CDN/Redis에 caching. DB hot key 자체를 줄임.

**3. Pre-aggregation**

Twitter fan-out — 작성 시 follower의 timeline에 *미리* 복사 (write-time fan-out). 읽기 hot key를 없앰. Celebrity는 반대로 *read-time fan-out*.

**4. 별도 파티션**

Hot tenant를 자기 dedicated partition으로 분리. DynamoDB의 *adaptive capacity*가 이런 동작을 자동 수행.

## Secondary Index 처리

Primary key로 파티셔닝하면 그 키 query는 쉽다. **다른 속성**으로 query는?

```sql
SELECT * FROM cars WHERE color = 'red'
```

color는 partition key가 아니다. 어떻게 처리하나? 두 가지 모델.

### 1. Local Index (Document-Partitioned)

각 partition이 *자기 데이터*에 대한 인덱스만 유지.

```text
Partition 1: cars + local index on color (red→list, blue→list, ...)
Partition 2: cars + local index on color
Partition 3: cars + local index on color
```

**읽기** — 모든 partition에 query 보냄, 결과 합산 → **scatter-gather**

**쓰기** — 한 partition만 갱신 → 빠르고 단순

장단점이 명확하다.

| 측면 | Local Index |
|------|-------------|
| 쓰기 | 빠름 (한 partition) |
| 읽기 | 느림 (모든 partition) |
| 일관성 | 자연스러움 (한 트랜잭션) |
| 구현 | 단순 |

MongoDB(local secondary index), Elasticsearch(per-shard inverted index), Cassandra(local SASI)가 이 모델.

### 2. Global Index (Term-Partitioned)

인덱스 자체를 partition.

```text
Color index:
  red  → Node 1 (값: [car1, car5, car8, ...])
  blue → Node 2 (값: [car2, car3, ...])
  green → Node 3 (...)
```

**읽기** — 한 partition만 query → 빠름

**쓰기** — 데이터 partition + 인덱스 partition도 갱신 → 분산 트랜잭션 필요

장단점.

| 측면 | Global Index |
|------|--------------|
| 쓰기 | 느림 (다중 partition + 분산 트랜잭션) |
| 읽기 | 빠름 (한 partition) |
| 일관성 | 어려움 (eventually consistent 흔함) |
| 구현 | 복잡 |

DynamoDB Global Secondary Index가 이 모델 — 단 *eventually consistent*. 쓰기 후 인덱스 갱신에 lag.

### 선택 기준

- *읽기 쿼리 빈도 >> 쓰기 빈도* → global
- *쓰기 빈도 >> 읽기 빈도* → local
- *강한 일관성 필요* → local
- *낮은 읽기 latency 필요* → global

## Rebalancing

노드를 추가하거나 제거할 때 — 데이터를 재분배해야 한다.

### Hash mod N — 나쁜 접근

```text
node = hash(key) % N
```

N이 4 → 5로 바뀌면 *거의 모든* 키의 노드가 바뀜. 대규모 데이터 이동. 운영 환경에서 절대 못 씀.

### Fixed Number of Partitions

처음에 partition 수를 *크게* 정해둔다 (예: 1000개). 노드 수가 적어도 많은 partition.

```text
초기: 4 노드, 1000 partition → 노드당 250 partition
노드 추가: 5 노드 → 각 노드에서 50개씩 새 노드로 이관
                  → 노드당 200 partition
```

장점.

- 노드 추가/제거 시 *partition 단위*로만 이동
- Partition 수는 고정 → 키→partition 매핑은 안 바뀜
- 운영 단순

단점.

- 처음에 partition 수를 잘 정해야 함. 너무 적으면 노드 추가 한계, 너무 많으면 오버헤드
- Partition 크기가 데이터 양에 비례해 변함 (균일하지 않음)

**Riak, Elasticsearch, Couchbase, Voldemort**가 이 방식.

### Dynamic Partitioning

Partition 크기 기반 자동 분할/병합.

- Partition이 너무 커지면 **split**
- Partition이 너무 작아지면 옆 partition과 **merge**

HBase, MongoDB, BigTable, Cassandra 4.0+의 일부 모드가 이 방식.

장점.

- 데이터 양에 자동 적응
- 작은 데이터셋은 partition 수 적게 시작 가능

단점.

- 운영 복잡 — split이 *언제* 일어나는지 예측 어려움
- 초기 hotspot — 데이터가 적을 땐 partition 하나에 모두 들어가 분산 안 됨. **Pre-splitting**으로 완화

### Partitioning Proportional to Nodes

노드 수에 *비례한* partition 수. 노드 추가 시 — 기존 partition 하나를 분할해서 새 노드로.

Cassandra의 *vnode* 모델이 여기에 가깝다. 각 노드가 여러 가상 노드를 보유.

## Consistent Hashing

해시 공간을 *원*으로 보고 노드와 키를 원 위에 배치.

![Consistent Hashing](/images/blog/parallel/diagrams/consistent-hashing.svg)

키는 시계 방향으로 *가장 가까운* 노드로 간다.

```text
        N1
       ┌─┐
   ┌───┤ ├───┐
   │   └─┘   │
   │ key1    │
   │  ↓     N2
   │ N1      │
   │   ┌─┐   │
   │   │ │   │
   N4  └─┘   │
   │  key2   │
   │  ↓      │
   │  N3     │
   └───┐  ┌──┘
       └──┘
        N3
```

### Virtual Nodes

각 물리 노드가 원 위에 *여러 가상 노드*를 가짐 (보통 100~256개). 분포가 더 균등해짐.

```text
물리: N1, N2, N3
가상: N1-0, N1-1, ..., N1-127
      N2-0, N2-1, ..., N2-127
      N3-0, N3-1, ..., N3-127
```

장점.

- 노드 추가/제거 시 *원 위 인접한 키들만* 이동 → 데이터 이동 최소화
- Virtual node 덕에 분포 균등
- 노드 용량이 다르면 가상 노드 수로 조절

Amazon Dynamo 논문의 핵심 기여. Cassandra, Riak, Memcached의 클라이언트 라이브러리(Ketama)에 광범위 채택.

### Consistent Hashing vs Fixed Partitions

| 측면 | Consistent Hashing | Fixed Partitions |
|------|---------------------|-------------------|
| 노드 추가 시 이동 | 인접 키만 (1/N) | partition 단위 이동 |
| 분포 균등성 | virtual node로 해결 | 처음부터 균등 |
| 키→노드 매핑 | 직접 계산 | 매핑 테이블 |
| 대표 시스템 | Cassandra, Dynamo | Riak, Elasticsearch |

## Routing — 어느 노드에 가는가

클라이언트가 어느 노드에 query를 보낼지 어떻게 아는가? 세 가지 방식.

### 1. Client가 routing 결정

클라이언트 라이브러리에 라우팅 로직이 들어있음. partition map을 클라이언트가 들고 있다가 직접 노드 결정.

- DynamoDB SDK
- Cassandra의 token-aware driver

장점 — 한 hop. 단점 — 모든 클라이언트가 라우팅 정보를 최신으로 유지해야.

### 2. Server가 forward

아무 노드에 보내면 그 노드가 올바른 노드로 forward.

- Cassandra의 coordinator 노드
- Riak

장점 — 클라이언트 단순. 단점 — 두 hop, coordinator 부하.

### 3. Routing tier

별도 라우팅 서비스.

- MongoDB의 `mongos`
- Vitess의 vtgate
- Twemproxy

장점 — 분리된 관심사. 단점 — 추가 인프라.

### Routing 정보의 일관성

가장 어려운 부분 — partition map이 분산 환경에서 *일관되게 유지*되는 것. 노드가 죽거나 추가되면 모든 노드/클라이언트가 즉시 알아야 함.

**Coordination 서비스** 사용이 일반적.

- **ZooKeeper** — HBase, Kafka, Solr
- **etcd** — Kubernetes, CockroachDB
- **Consul** — Vault, HashiCorp 생태계

이들이 *strongly consistent metadata*를 제공. 9장에서 합의 알고리즘과 함께 깊이 다룬다.

## Request Routing의 진화

운영 사례로 본 진화.

1. **단일 노드** — 모든 요청 한 곳. 단순. 한계.
2. **수동 sharding** — application 코드에 분기. 유지 어려움.
3. **client-aware sharding** — driver가 자동. Cassandra, DynamoDB.
4. **proxy sharding** — mongos, vtgate. 운영 단순.
5. **service mesh** — Envoy 등이 metadata 기반 라우팅. Kubernetes 시대.

## 시스템 사례

### Cassandra

- Hash partitioning (Murmur3)
- Consistent hashing + virtual nodes
- Leaderless replication과 결합
- Token-aware client driver

### MongoDB Sharding

- Hash 또는 Range partitioning 선택
- `mongos` routing tier
- Config server가 partition map 보관
- Auto-split, balancer가 자동 rebalancing

### Kafka Partitions

- Topic이 N partition으로 분할
- Producer가 key 해시로 partition 결정 (또는 round-robin)
- 각 partition은 순서 보장, partition 사이는 보장 없음
- Consumer group의 consumer 수 ≤ partition 수

### DynamoDB Partition Key

- Hash partitioning이 기본 모델
- Partition key + (optional) sort key
- 같은 partition key는 *같은 노드*, sort key로 정렬
- Adaptive capacity가 hot partition 자동 처리

### HBase

- Range partitioning (region 단위)
- ZooKeeper가 routing 정보 보관
- 자동 region split
- HMaster가 region 할당

## Rebalancing — Automatic vs Manual

자동 rebalancing은 양날의 검이다.

**자동의 위험**.

- 거짓 양성으로 *불필요한 rebalancing* 발동 → 네트워크 폭주
- Cascading failure — 한 노드 느려짐 → rebalancing → 다른 노드 부하 → 또 rebalancing
- Foreground 트래픽과 *대역폭 경쟁*

**수동의 비용**.

- 사람의 관심 필요
- 변경이 늦어짐

실용적 절충 — 자동 rebalancing이 *제안*만 하고 *사람이 승인*. Cassandra, HBase가 이 방향. Kubernetes의 cluster autoscaler도 유사 패턴.

## Partition 수 결정

처음에 partition 수를 어떻게 정할 것인가? 운영 경험 기반의 가이드라인.

- **목표 partition 크기** — 10~100 GB 정도
- **노드당 partition 수** — 10~100
- **최대 노드 수** — 미래 3년 예측 ×2

예: 5 노드 시작, 100 partition. 노드당 20 partition, 10 노드까지 균등 분산 가능. 그 이상은 partition 수 두 배로 split.

너무 많은 partition의 부작용.

- Per-partition 메타데이터 오버헤드
- 모든 partition을 읽는 query의 fan-out 폭발
- Coordinator 부하

너무 적은 partition의 부작용.

- Hot partition 발생 가능성 증가
- 노드 추가 한계

## Cross-Partition Operation의 어려움

파티셔닝의 가장 큰 비용 — *여러 partition에 걸친 작업*은 어렵다.

- **Cross-partition JOIN** — 모든 partition에서 데이터 가져와 합치기. 매우 비쌈
- **Cross-partition transaction** — 분산 트랜잭션 필요. 2PC, Saga 등 (7장, 9장)
- **Global secondary index** — 인덱스 자체가 분산. 일관성 보장이 어려움

운영 통찰 — *application 설계 시* cross-partition 작업을 *최소화*. 같이 query되는 데이터는 같은 partition key로 묶기. 이게 데이터 모델 설계의 핵심.

### Denormalization으로 회피

관계형 DB의 정규화는 단일 노드에서는 미덕. 파티셔닝 환경에서는 *비싼 JOIN의 원인*. 그래서 NoSQL은 *denormalization을 권장*.

```text
주문 데이터:
  관계형: orders + users + products (JOIN)
  Cassandra: orders_by_user (denormalized, user_id를 partition key로)
```

쓰기 시 여러 테이블에 copy, 읽기 시 한 partition만. *write amplification*을 지불해 *read amplification*을 줄인다.

## Partition과 Sharding 용어

같은 개념의 다른 이름.

| 시스템 | 용어 |
|--------|------|
| MongoDB | shard |
| Cassandra | partition (의 token range) |
| HBase | region |
| BigTable | tablet |
| Elasticsearch | shard |
| Riak | vnode |
| Kafka | partition |
| DynamoDB | partition |

용어가 다를 뿐 본질은 같다 — 데이터를 노드들에 *분할*하는 단위.

## 운영 사례 — Scaling Story

운영 경험에서 본 흔한 패턴.

1. **단일 노드** — RDB 단일 인스턴스. 가장 빠른 시작
2. **Read replica** — leader-follower 복제 추가. 읽기 부하 분산
3. **Functional partitioning** — 서비스별 별도 DB. 마이크로서비스 분해
4. **Horizontal sharding** — 한 테이블을 여러 노드로. 가장 큰 도약
5. **Multi-region** — 지리적 분산. multi-leader 또는 read-only replica

각 단계가 *문제를 해결*하지만 *새로운 어려움*을 가져온다. Sharding을 늦게 시작할수록 좋다 — 가능한 단일 노드의 한계까지 밀어붙이고, 정말 필요할 때 시작.

## 정리

- 파티셔닝 = 다른 데이터를 다른 노드에. 복제와 결합해 함께 쓴다
- **Key Range** — range query 친화, hot spot 위험. BigTable, HBase
- **Hash** — 균등 분포, range query 불가. Cassandra, DynamoDB, Riak
- 복합 키 — partition key는 hash, clustering key는 정렬 (Cassandra 패턴)
- **Hot key (celebrity problem)** — random suffix, caching, fan-out으로 분산
- **Secondary index** — local(scatter-gather, 쓰기 빠름) vs global(읽기 빠름, 분산 트랜잭션)
- **Rebalancing** — hash mod N 금지. Fixed partition / dynamic / proportional / consistent hashing
- **Consistent hashing** — 노드 추가 시 인접 키만 이동. Virtual node로 균등 분포
- **Routing** — client / server-forward / routing tier. ZooKeeper·etcd로 metadata 관리
- 비유 — partition = 책 알파벳별 책장, rebalancing = 책장 재배치
- 사례 — Cassandra(hash+vnode), MongoDB(hash/range+mongos), Kafka(producer key hash), DynamoDB(partition key), HBase(range+region)

## 다음 장 예고

다음 장은 **Transactions** — ACID, isolation level, 동시 실행 문제들. 단일 노드 트랜잭션부터 분산 트랜잭션의 어려움까지.

## 관련 항목

- [Ch 5: Replication](/blog/parallel/designing-data-intensive-applications/chapter05-replication)
- [Ch 7: Transactions](/blog/parallel/designing-data-intensive-applications/chapter07-transactions)
- [AMP Ch 13: Concurrent Hashing](/blog/parallel/parallel-principles/ch13-concurrent-hashing-and-natural-parallelism)
