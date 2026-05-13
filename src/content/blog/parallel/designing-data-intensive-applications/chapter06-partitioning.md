---
title: "Ch 6: 파티셔닝"
date: 2026-07-02T02:00:00
description: "데이터를 노드들에 어떻게 나눌 것인가 — Key range, Hash, Hotspot 처리, Secondary index, Rebalancing."
tags: [DDIA, Partitioning, Sharding, Consistent Hashing]
series: "Designing Data-Intensive Applications"
seriesOrder: 6
---

## 이 챕터의 메시지

복제는 같은 데이터를 여러 곳에. **파티셔닝**(sharding)은 다른 데이터를 다른 곳에.

```
1TB 데이터 → 10 노드에 각 100GB
```

**왜 파티셔닝?**

- **확장성** — 한 노드에 안 들어감
- **읽기/쓰기 처리량** — 분산

복제와 파티셔닝은 **함께 쓰임**. 각 파티션이 여러 복제본을 가짐.

## Key Range Partitioning

키 범위를 노드에 할당.

```
Partition 1: a-d → Node 1
Partition 2: e-l → Node 2
Partition 3: m-r → Node 3
Partition 4: s-z → Node 4
```

**장점**:
- Range query 자연스러움 (`WHERE key BETWEEN 'e' AND 'k'`)
- 정렬된 데이터에 효율적

**단점**:
- **Hot spot** — 어떤 범위에 트래픽 집중
- 예: 타임스탬프를 키로 → 모든 쓰기가 마지막 partition

해법: 키에 무작위 접두사 추가 — sortable한 부분은 살리고 hot spot 분산.

## Hash Partitioning

키를 해시해서 노드 결정.

```
hash("alice") % 4 = 2 → Node 2
hash("bob")   % 4 = 1 → Node 1
hash("carol") % 4 = 3 → Node 3
```

**장점**:
- Hot spot 분산 (해시가 균등하면)
- 단순

**단점**:
- Range query 불가능 (`WHERE key BETWEEN ...` — 모든 노드 query 필요)

대부분의 모던 NoSQL — Cassandra, DynamoDB, MongoDB — 가 hash partitioning.

## Skew와 Hot Spot

Hash partitioning이 일반적으로 균등 분포. 그러나 **single hot key**가 있다면?

```
Celebrity Alice의 트윗 — 모든 follower가 같은 키 query
→ 한 partition에 트래픽 집중
```

해법:

- **Random suffix** — `alice` 대신 `alice-00`, `alice-01`, ... 100개 키. 읽기 시 모든 100개 합산.
- **Application-level** — celebrity 데이터는 특별 처리.

## Secondary Index 처리

Primary key로 파티셔닝하면 그 키는 OK. **다른 속성으로 query**는?

```sql
SELECT * FROM cars WHERE color = 'red'
```

color는 partition key가 아님. 어디서 찾나?

### 1. Document-Partitioned Index (Local Index)

각 partition이 자기 데이터에 대한 인덱스만 유지.

```
Partition 1: cars + index on color (red→list, blue→list, ...)
Partition 2: cars + index on color
...
```

**읽기** — 모든 partition에 query 보냄, 결과 합산 (**scatter-gather**).
**쓰기** — 한 partition만 갱신.

**장점**: 쓰기 단순.
**단점**: 읽기 느림 (모든 partition).

### 2. Term-Partitioned Index (Global Index)

인덱스 자체를 partition.

```
Color index:
  red → Node 1 (값: [car1, car5, car8, ...])
  blue → Node 2 (값: [car2, car3, ...])
  ...
```

**읽기** — 한 partition만 query.
**쓰기** — 인덱스 partition도 갱신 (분산 트랜잭션 필요).

**장점**: 읽기 빠름.
**단점**: 쓰기 비쌈, 분산 트랜잭션 어려움.

## Rebalancing

노드를 추가/제거하면 — 데이터를 재분배해야 한다.

### Hash mod N — 나쁜 접근

```
node = hash(key) % N
```

N이 바뀌면 — 거의 모든 키의 노드가 바뀜. 대규모 데이터 이동.

### Fixed Number of Partitions

처음에 partition 수를 크게 정함 (예: 1000개). 노드 수가 적어도 많은 partition.

```
초기: 4 노드, 1000 partition → 노드당 250 partition
노드 추가: 5 노드 → 각 노드에서 200 partition씩 이관
```

**Riak, Elasticsearch, Couchbase**가 이 방식.

### Dynamic Partitioning

Partition 크기 기반.

- Partition이 너무 크면 분할 (split)
- Partition이 너무 작으면 합침 (merge)

HBase, Cassandra (4.0+), BigTable.

### Partitioning Proportional to Nodes

노드 수에 비례한 partition 수. 노드 추가 시 — 한 partition을 분할해서 새 노드로.

Cassandra (옛), Ketama.

## Consistent Hashing

해시 공간을 원으로 보고 노드와 키를 배치.

```
       hash space
    [0]─────[2^160]
     │   ●Node A  │
     │            │
     │  ●key X    │
     │            │
     │       ●Node B
     │            │
     │  ●Node C   │
```

키는 시계 방향으로 가장 가까운 노드로 갑니다.

**장점**: 노드 추가/제거 시 일부 키만 이동.

**Virtual Node** — 각 물리 노드가 여러 가상 노드. 분포 균등화.

Amazon Dynamo가 이 방식. Cassandra도.

## Routing — 어느 노드에 가는가

클라이언트가 어느 노드에 query를 보낼지 어떻게 아는가?

**1. Client가 routing 결정** — 라이브러리에 라우팅 로직.
**2. Server가 forward** — 아무 노드에 보내면 올바른 노드로 전달.
**3. Routing tier** — 별도 라우팅 서비스.

대부분의 시스템 — 라우팅 정보가 분산 환경에서 일관되게 유지되는 게 어려움. **Zookeeper / etcd** 같은 coordination 서비스 사용.

## 정리

- 파티셔닝 = 데이터를 노드들에 분산
- **Key Range** — range query 친화, hot spot 위험
- **Hash** — 균등 분포, range query 불가
- **Single hot key** — random suffix로 분산
- **Secondary index** — local (쓰기 빠름) vs global (읽기 빠름)
- **Rebalancing** — fixed partitions / dynamic / consistent hashing
- **Routing** — Zookeeper 같은 coordination 서비스

## 다음 장 예고

다음 장은 **Transactions** — ACID, isolation level, 동시 실행 문제들.

## 관련 항목

- [Ch 5: Replication](/blog/parallel/designing-data-intensive-applications/chapter05-replication)
- [AMP Ch 13: Concurrent Hashing](/blog/parallel/parallel-principles/ch13-concurrent-hashing-and-natural-parallelism)
