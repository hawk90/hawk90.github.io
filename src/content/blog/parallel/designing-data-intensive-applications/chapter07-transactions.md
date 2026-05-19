---
title: "Ch 7: 트랜잭션"
date: 2026-05-12T07:00:00
description: "ACID의 정확한 의미. Isolation level — Read Committed / Snapshot / Serializable. 동시 실행의 함정들."
tags: [DDIA, Transaction, ACID, Isolation, Serializable]
series: "Designing Data-Intensive Applications"
seriesOrder: 7
draft: true
---

## 이 챕터의 메시지

트랜잭션. 모두가 쓰는 단어지만 의미는 사람마다 다르다.

Kleppmann이 이 챕터에서 정확한 정의와 트레이드오프를 정리한다.

## ACID — 마케팅 용어가 된 약속

전통적 정의.

- **Atomicity** — 모두 commit 또는 모두 abort
- **Consistency** — 무결성 규칙 유지
- **Isolation** — 동시 트랜잭션이 서로 안 보임
- **Durability** — commit된 데이터는 영구

이 단어가 의미를 잃은 이유 — 각 DB가 다르게 해석. 특히 Isolation.

> "ACID has become mostly a marketing term."

Kleppmann의 통찰 — 각 글자를 따로 본다.

## A — Atomicity

"분해되지 않음". 트랜잭션 안의 모든 변경이 함께 성공 또는 함께 실패.

```sql
BEGIN
  UPDATE accounts SET balance = balance - 100 WHERE id = 1
  UPDATE accounts SET balance = balance + 100 WHERE id = 2
COMMIT
```

중간에 실패하면 — 둘 다 안 일어난 것처럼. "Abortability"가 더 정확한 표현.

## C — Consistency

데이터 무결성. 그러나 이건 사실 **애플리케이션의 책임**이다. DB가 외래키 / unique constraint를 강제하지만, 비즈니스 규칙은 코드에 있다.

Kleppmann의 의견 — C는 ACID에서 가장 약한 글자. 사실 application property이지 DB property가 아님.

## I — Isolation

동시 트랜잭션의 격리. 가장 복잡한 글자. Section 따로 다룬다.

## D — Durability

Commit된 데이터는 영구. 하드웨어 고장에도 살아남는다.

- WAL 같은 fsync로 디스크 commit
- 복제로 노드 고장 대비

완벽한 durability는 없다 — 모든 데이터센터가 동시에 사라지면? 그러나 합리적인 수준에서는 보장.

## Isolation Level — 격리의 단계

직렬 실행 (serial)이 가장 강한 격리. 그러나 너무 느림. 그래서 약한 격리 단계들이 정의됨.

| 단계 | 방지하는 문제 |
|---|---|
| Read Uncommitted | Dirty Write |
| Read Committed | Dirty Read |
| Repeatable Read / Snapshot Isolation | Non-Repeatable Read |
| Serializable | 모든 동시성 anomaly |

## Read Committed

가장 기본적인 보장.

- **No Dirty Reads** — 다른 트랜잭션의 commit 안 된 데이터를 읽지 않음
- **No Dirty Writes** — 다른 트랜잭션의 commit 안 된 데이터를 덮어쓰지 않음

대부분의 DB가 default. PostgreSQL, Oracle, SQL Server.

**구현**: row-level 락 + multi-version. 읽는 동안은 옛 버전, 쓰는 동안만 락.

## Snapshot Isolation

Read Committed의 더 강한 버전.

> 트랜잭션이 시작할 때의 **일관된 스냅샷**을 본다. 다른 트랜잭션의 변경은 안 보임.

```
T1: read x = 10
[T2 commits: x = 20]
T1: read x = 10  ← 여전히 10 (스냅샷 유지)
```

PostgreSQL, MySQL InnoDB, Oracle 모두 지원. 보통 `REPEATABLE READ` 또는 `SNAPSHOT ISOLATION`이라 부름.

**구현** — **MVCC** (Multi-Version Concurrency Control). 각 행이 여러 버전을 유지, 트랜잭션 ID로 자기에게 맞는 버전 찾음.

## Snapshot Isolation의 함정 — Lost Update

```
T1: read counter = 10
T2: read counter = 10
T1: counter = 10 + 1 = 11, write
T2: counter = 10 + 1 = 11, write   ← 잘못! 12여야 함
```

Snapshot Isolation도 이걸 막지 않음. 두 트랜잭션이 같은 옛 값을 보고 각자 갱신.

해법:

1. **Atomic write** — `UPDATE counter = counter + 1` (DB가 직접)
2. **Explicit lock** — `SELECT ... FOR UPDATE`
3. **Compare-and-Set** — `UPDATE ... WHERE value = old_value`
4. **Automatic detection** — PostgreSQL의 `REPEATABLE READ`는 일부 lost update 감지

## Write Skew

더 미묘한 문제. 두 트랜잭션이 **다른 행**을 쓰지만 같은 비즈니스 규칙을 깸.

```
규칙: 의사 두 명이 동시에 휴가 못 감 (최소 1명 onCall)

T1: read on_call = [Alice, Bob]
T2: read on_call = [Alice, Bob]
T1: Alice 휴가 (on_call에서 빼기) ← Bob만 남으니 OK
T2: Bob 휴가 (on_call에서 빼기)   ← Alice만 남으니 OK
결과: 둘 다 휴가, 0명 onCall — 규칙 위반
```

각자 다른 row를 만지므로 락이 안 겹침. 그러나 비즈니스 규칙은 깨짐.

해법은 **Serializable** 수준만 보장.

## Phantom

새 행이 삽입되어 query 결과가 달라짐.

```
T1: SELECT count(*) FROM rooms WHERE booked = false → 5
T2: INSERT INTO rooms VALUES ('new room', false)
T1: SELECT count(*) FROM rooms WHERE booked = false → 6
```

같은 query 두 번이 다른 결과.

## Serializable Isolation

가장 강한 단계. **마치 한 번에 한 트랜잭션만 실행되는 것처럼** 동작.

세 가지 구현 접근.

### 1. Literal Serial Execution

진짜로 한 번에 하나. 단일 스레드.

```
모든 트랜잭션이 한 큐에 들어옴
한 워커가 차례로 실행
```

**Redis, VoltDB, FoundationDB**가 이 방식 (또는 부분적으로).

**가능한가?** — 메모리 가격이 떨어져 전체 데이터셋이 메모리에 들어가는 시대. 디스크 I/O가 병목이던 시절보다 단순 직렬화의 비용이 낮아짐.

**단점**:
- 처리량이 단일 코어로 제한
- 트랜잭션이 짧아야 (다른 거 막으니까)
- Sharding으로 확장 가능, cross-shard는 어려움

### 2. Two-Phase Locking (2PL)

전통적 방법.

**Phase 1 — Growing**: 트랜잭션이 락을 얻음.
**Phase 2 — Shrinking**: 트랜잭션이 락을 놓음 (commit/abort 후).

```
T1: read x → shared lock on x
T1: write x → exclusive lock on x (upgrade)
T2: read x → wait (T1의 exclusive lock 때문)
T1: commit → 락 해제
T2: read x → ok
```

**문제**:
- 느림 (락 경합)
- Deadlock 가능 (DB가 감지하고 abort)

Predicate lock으로 phantom도 처리.

PostgreSQL의 `SERIALIZABLE` 이전 버전 등이 사용.

### 3. Serializable Snapshot Isolation (SSI)

상대적으로 새로운 방법 (2008년 PostgreSQL 9.1).

**낙관적**:
- Snapshot Isolation처럼 진행
- Commit 시 — 다른 트랜잭션과 충돌했는지 확인
- 충돌하면 abort

**장점** — 충돌이 적으면 매우 빠름. 락 없음.
**단점** — 충돌이 많으면 abort가 많아 비효율.

PostgreSQL의 `SERIALIZABLE` 모드. 잘 작동하면 2PL보다 빠름.

## Isolation의 트레이드오프

| 단계 | 강도 | 성능 | 사용 |
|---|---|---|---|
| Read Uncommitted | 매우 약함 | 매우 빠름 | 거의 안 씀 |
| Read Committed | 약함 | 빠름 | 보통 default |
| Snapshot Isolation | 중간 | 보통 | 대부분의 경우 충분 |
| Serializable | 최대 | 느림 | 정확성 최우선 |

**대부분의 애플리케이션** — Snapshot Isolation으로 충분.
**금융 / 정확성 핵심** — Serializable.

## 정리

- **ACID**의 각 글자를 따로 본다 — Consistency는 사실 application property
- **Read Committed** — Dirty Read 방지, default
- **Snapshot Isolation** — 일관된 스냅샷, MVCC
- **Lost Update / Write Skew / Phantom** — Snapshot만으론 부족
- **Serializable** — 가장 강함, 세 가지 구현 (Serial / 2PL / SSI)
- 대부분 SI로 충분, Serializable은 정확성 최우선 때

## 다음 장 예고

다음 장은 **분산 시스템의 문제들** — 네트워크는 신뢰할 수 없고, 시계는 동기 안 됐고, ...

## 관련 항목

- [Ch 6: Partitioning](/blog/parallel/designing-data-intensive-applications/chapter06-partitioning)
- [AMP Ch 18: Transactional Memory](/blog/parallel/parallel-principles/ch18-transactional-memory)
