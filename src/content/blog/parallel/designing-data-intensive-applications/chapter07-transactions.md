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

Kleppmann이 이 챕터에서 정확한 정의와 트레이드오프를 정리한다. 트랜잭션은 "여러 읽기와 쓰기를 하나의 논리적 단위로 묶는 방법"이다. 묶는 이유는 단 하나 — 부분 실패와 동시성에서 애플리케이션이 신경 쓸 일을 줄이기 위해서다.

일상의 비유는 직관적이다. **은행 송금**. 내 계좌에서 100원이 빠지고 상대 계좌에 100원이 들어가는 두 동작은 함께 일어나야 한다. 한쪽만 일어나면 돈이 증발하거나 복제된다. 트랜잭션은 이 "함께"를 보장하는 도구다.

## ACID — 마케팅 용어가 된 약속

전통적 정의.

- **Atomicity** — 모두 commit 또는 모두 abort
- **Consistency** — 무결성 규칙 유지
- **Isolation** — 동시 트랜잭션이 서로 안 보임
- **Durability** — commit된 데이터는 영구

이 단어가 의미를 잃은 이유 — 각 DB가 다르게 해석. 특히 Isolation. ACID라고 적힌 두 시스템이 실제로 제공하는 보장은 완전히 다를 수 있다.

> "ACID has become mostly a marketing term."

Kleppmann의 통찰 — 각 글자를 따로 본다. 묶어서 "ACID 지원"이라 외치는 마케팅은 무시하고, 각 글자가 이 DB에서 실제로 무엇을 의미하는지 묻는다.

## A — Atomicity

"분해되지 않음". 트랜잭션 안의 모든 변경이 함께 성공 또는 함께 실패.

```sql
BEGIN;
  UPDATE accounts SET balance = balance - 100 WHERE id = 1;
  UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;
```

중간에 실패하면 — 둘 다 안 일어난 것처럼. Kleppmann은 "Abortability"가 더 정확한 표현이라고 말한다. 원자성의 핵심은 "쪼개지지 않음"이 아니라 "중간에 실패해도 깔끔히 되돌릴 수 있음"이기 때문이다.

다중 스레드 프로그래밍의 atomic 연산과 헷갈리지 말 것. 거기서의 atomic은 "다른 스레드가 중간 상태를 못 본다"는 의미다. 트랜잭션의 atomicity는 "중간에 실패하면 없던 일로"라는 의미. 이름이 같을 뿐 다른 개념이다.

### Atomicity vs Consistency — 흔한 혼동

많은 입문서가 두 개를 섞는다. 정리:

- **Atomicity** — DB가 보장. 모든 변경 또는 아무것도 변경 없음.
- **Consistency** — 애플리케이션이 보장. 트랜잭션 후에도 비즈니스 규칙 유지.

DB는 "외래키 위반"이나 "unique 위반"은 잡아준다. 그러나 "통장 잔액은 음수가 될 수 없다"는 비즈니스 규칙은 애플리케이션 코드가 짚어야 한다. DB의 atomic rollback은 이 규칙을 지키는 도구일 뿐이다.

## C — Consistency

데이터 무결성. 그러나 이건 사실 **애플리케이션의 책임**이다. DB가 외래키 / unique constraint를 강제하지만, 비즈니스 규칙은 코드에 있다.

Kleppmann의 의견 — C는 ACID에서 가장 약한 글자. 사실 application property이지 DB property가 아님. 실제로 ACID의 C는 약자를 만들기 위해 끼워 넣은 면이 강하다는 게 학계의 일반적 평가다.

## I — Isolation

동시 트랜잭션의 격리. 가장 복잡한 글자. Section 따로 다룬다.

일상 비유. **화면 보호필름**. 옆 사람 화면에서 내 화면이 안 보이게 막는다. Isolation은 옆 트랜잭션의 중간 상태가 내 트랜잭션에 새어 들어오지 못하게 막는다.

## D — Durability

Commit된 데이터는 영구. 하드웨어 고장에도 살아남는다.

- WAL 같은 fsync로 디스크 commit
- 복제로 노드 고장 대비

완벽한 durability는 없다 — 모든 데이터센터가 동시에 사라지면? 그러나 합리적인 수준에서는 보장. 단일 디스크 fsync도 정전이나 펌웨어 버그에서 깨질 수 있고, 복제도 모든 복제본이 동시에 사라지면 무용지물이다. Durability는 절대적 약속이 아니라 "어디까지 견디는가"의 정의다.

## Isolation Level — 격리의 단계

직렬 실행 (serial)이 가장 강한 격리. 그러나 너무 느림. 그래서 약한 격리 단계들이 정의됨.

| 단계 | 방지하는 문제 |
|---|---|
| Read Uncommitted | Dirty Write |
| Read Committed | Dirty Read |
| Repeatable Read / Snapshot Isolation | Non-Repeatable Read |
| Serializable | 모든 동시성 anomaly |

SQL 표준은 네 단계를 정의했다. 그러나 표준의 정의가 모호하고 구현마다 다르다. Postgres의 `REPEATABLE READ`는 사실 snapshot isolation이고, Oracle의 `SERIALIZABLE`은 사실 snapshot isolation이다. 표준 이름에 속지 말고 실제 보장을 확인해야 한다.

## Read Committed

가장 기본적인 보장.

- **No Dirty Reads** — 다른 트랜잭션의 commit 안 된 데이터를 읽지 않음
- **No Dirty Writes** — 다른 트랜잭션의 commit 안 된 데이터를 덮어쓰지 않음

대부분의 DB가 default. PostgreSQL, Oracle, SQL Server.

**구현**: row-level 락 + multi-version. 읽는 동안은 옛 버전, 쓰는 동안만 락.

### Dirty Read의 문제

```
T1: UPDATE balance = balance - 100 WHERE id = 1   (commit 전)
T2: SELECT balance WHERE id = 1   → 잘못된 값을 봄
T1: ROLLBACK
T2: 이미 잘못된 값으로 결정 내림
```

Dirty read를 막으면 — 다른 트랜잭션이 abort할 수도 있는 값을 보고 결정하지 않는다.

### Dirty Write의 문제

```
T1: UPDATE order SET buyer = 'Alice' WHERE id = 1
T2: UPDATE order SET buyer = 'Bob' WHERE id = 1
T1: UPDATE invoice SET to = 'Alice' WHERE order_id = 1
T2: UPDATE invoice SET to = 'Bob' WHERE order_id = 1
```

각 row가 다른 트랜잭션 사이에서 섞이면 — order는 Bob이지만 invoice는 Alice 같은 일관성 깨짐. Read Committed는 row-level 락으로 이걸 막는다.

## Snapshot Isolation

Read Committed의 더 강한 버전.

> 트랜잭션이 시작할 때의 **일관된 스냅샷**을 본다. 다른 트랜잭션의 변경은 안 보임.

```
T1: read x = 10
[T2 commits: x = 20]
T1: read x = 10   ← 여전히 10 (스냅샷 유지)
```

PostgreSQL, MySQL InnoDB, Oracle 모두 지원. 보통 `REPEATABLE READ` 또는 `SNAPSHOT ISOLATION`이라 부름.

**구현** — **MVCC** (Multi-Version Concurrency Control). 각 행이 여러 버전을 유지, 트랜잭션 ID로 자기에게 맞는 버전 찾음.

### MVCC의 동작

Postgres의 MVCC를 간단히 들여다본다.

- 모든 row는 `xmin` (생성 트랜잭션 ID), `xmax` (삭제 트랜잭션 ID)를 가짐
- 트랜잭션 시작 시 — 현재 active 트랜잭션 ID 집합 기록
- 읽을 때 — `xmin <= my_id AND (xmax IS NULL OR xmax > my_id)`인 버전만 봄

```
row v1: xmin=100, xmax=200   ← T100이 만들고 T200이 삭제 표시
row v2: xmin=200, xmax=NULL  ← T200이 새로 만듦
```

T150이 읽으면 v1을 본다. T250이 읽으면 v2를 본다. 락 없이 일관된 스냅샷.

### MySQL InnoDB의 MVCC

InnoDB도 비슷하지만 다른 방식. row에 직접 옛 버전을 두지 않고 — **undo log**에 옛 버전을 둔다. 읽기는 현재 row를 읽고, 자기 스냅샷에 안 맞으면 undo log를 거꾸로 따라가며 적합한 버전을 찾는다.

긴 트랜잭션이 많으면 undo log가 부풀어 성능이 떨어진다. Postgres의 `VACUUM`처럼 InnoDB도 정기적 정리가 필요하다.

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

대부분의 케이스는 atomic write 한 줄로 끝난다. SQL을 잘 쓰면 lost update 걱정을 코드에서 비즈니스 레벨로 옮길 수 있다.

## Write Skew

더 미묘한 문제. 두 트랜잭션이 **다른 행**을 쓰지만 같은 비즈니스 규칙을 깸. 책의 의사 예제 — 병원 on-call 의사 시스템.

```
규칙: 의사 두 명이 동시에 휴가 못 감 (최소 1명 onCall)

상태: on_call = [Alice, Bob]

T1: SELECT count(*) FROM doctors WHERE on_call = true   → 2
T1: 2 >= 2 이므로 Alice의 휴가 허용
T2: SELECT count(*) FROM doctors WHERE on_call = true   → 2
T2: 2 >= 2 이므로 Bob의 휴가 허용
T1: UPDATE doctors SET on_call = false WHERE name = 'Alice'
T2: UPDATE doctors SET on_call = false WHERE name = 'Bob'
COMMIT, COMMIT

결과: 둘 다 휴가, 0명 onCall — 규칙 위반
```

각자 다른 row를 만지므로 락이 안 겹침. 그러나 비즈니스 규칙은 깨짐. 두 트랜잭션이 같은 **predicate** (`on_call = true`)에 대한 가정을 동시에 깬다.

다른 예제 — 회의실 더블 부킹, 게임 닉네임 동시 등록, 클레임 처리 중복 등. 패턴은 같다. "조건을 만족하는 row의 집합을 읽고, 그 집합에 의존한 결정으로 row를 쓴다."

해법은 **Serializable** 수준만 보장. 또는 명시적으로 같은 row를 잠그는 트릭 (`SELECT ... FOR UPDATE`로 의도된 predicate를 락으로 표현).

## Phantom Read와 Predicate Lock

새 행이 삽입되어 query 결과가 달라짐.

```
T1: SELECT count(*) FROM rooms WHERE booked = false  → 5
T2: INSERT INTO rooms VALUES ('new room', false)
T1: SELECT count(*) FROM rooms WHERE booked = false  → 6
```

같은 query 두 번이 다른 결과.

Row-level 락만으로는 phantom을 막을 수 없다. 락의 대상이 되는 row가 아직 존재하지 않기 때문이다. 해법은 **predicate lock** — "이 조건을 만족하는 모든 row와, 앞으로 만들어질 row도 포함" 같은 락. 구현은 비싸다. 그래서 실용 시스템은 **index-range lock** (특정 인덱스 범위를 잠금)으로 근사한다.

MySQL InnoDB의 `SERIALIZABLE`은 next-key locking으로 phantom을 막는다. Postgres SSI는 다른 접근 (뒤에서).

## Serializable Isolation

가장 강한 단계. **마치 한 번에 한 트랜잭션만 실행되는 것처럼** 동작.

일상 비유. **한 줄 영업**. 손님이 한 명씩만 들어와 주문하고 나가는 식당. 한 사람이 나가야 다음 사람이 들어온다. 동시에 들어온 척하지만 사실은 직렬.

세 가지 구현 접근.

### 1. Literal Serial Execution

진짜로 한 번에 하나. 단일 스레드.

```
모든 트랜잭션이 한 큐에 들어옴
한 워커가 차례로 실행
```

**Redis, VoltDB, FoundationDB**가 이 방식 (또는 부분적으로).

**가능한가?** — 메모리 가격이 떨어져 전체 데이터셋이 메모리에 들어가는 시대. 디스크 I/O가 병목이던 시절보다 단순 직렬화의 비용이 낮아짐.

**적합한 워크로드**:

- 트랜잭션이 짧다 (수십 µs ~ 수 ms)
- 트랜잭션의 read/write set이 작다
- 트랜잭션이 미리 정해진 stored procedure로 와있다 (대화식 트랜잭션 X)

VoltDB가 이런 모델을 OLTP에 적용했다. 트랜잭션을 stored procedure로 등록해두면 한 코어가 직렬로 처리. Redis도 단일 스레드 모델 (싱글 스레드 + multiplexing)이라 사실상 직렬 트랜잭션을 자연스럽게 얻는다.

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

Predicate lock으로 phantom도 처리. 그러나 predicate lock은 구현이 비싸 — 실제로는 next-key / range lock으로 근사한다.

PostgreSQL의 `SERIALIZABLE` 이전 버전 등이 사용. MySQL InnoDB의 `SERIALIZABLE`은 여전히 2PL 기반.

### 3. Serializable Snapshot Isolation (SSI)

상대적으로 새로운 방법 (2008년 PostgreSQL 9.1).

**낙관적**:

- Snapshot Isolation처럼 진행
- Commit 시 — 다른 트랜잭션과 충돌했는지 확인
- 충돌하면 abort

```
T1 시작: snapshot taken
T1: read X (스냅샷 버전)
T2 시작: snapshot taken
T2: write X (새 버전)
T2: commit
T1: commit 시도 → T1이 읽은 X가 T2에 의해 바뀜 → abort
```

DB는 각 트랜잭션의 read set과 write set을 추적. Commit 시 누군가의 write가 내 read를 무효화했는지 검사.

**장점** — 충돌이 적으면 매우 빠름. 락 없음.
**단점** — 충돌이 많으면 abort가 많아 비효율.

PostgreSQL의 `SERIALIZABLE` 모드. 잘 작동하면 2PL보다 빠름. 대화식 트랜잭션도 지원.

### FoundationDB의 SSI

FoundationDB는 SSI를 분산 환경에서 구현한 대표 사례. 모든 트랜잭션이 한 곳 (resolver)에서 충돌 검증. 워크로드가 분산되어도 commit 검증은 중앙화된다.

처리량은 검증의 직렬화로 제한되지만 — 검증 자체가 단순한 set intersection이라 매우 빠르게 돌아간다. 그래서 수십만 트랜잭션/초도 가능.

## Spanner — External Consistency

Google Spanner는 한 발 더 나아간다. **External consistency**라는 더 강한 보장 — "트랜잭션 T2가 T1의 commit 이후에 시작했다면, T2는 T1을 본다."

구현은 TrueTime API + 2PC + Paxos의 조합. TrueTime은 GPS와 원자시계로 노드 간 시계 오차를 ms 이하로 묶는다. 그 위에서 commit timestamp를 안전하게 부여한다.

Ch 9에서 다시 다룬다. 여기서는 — "Serializable보다 더 강한 보장도 존재한다"는 것만 기억.

## Isolation의 트레이드오프

| 단계 | 강도 | 성능 | 사용 |
|---|---|---|---|
| Read Uncommitted | 매우 약함 | 매우 빠름 | 거의 안 씀 |
| Read Committed | 약함 | 빠름 | 보통 default |
| Snapshot Isolation | 중간 | 보통 | 대부분의 경우 충분 |
| Serializable | 최대 | 느림 | 정확성 최우선 |

**대부분의 애플리케이션** — Snapshot Isolation으로 충분.
**금융 / 정확성 핵심** — Serializable.

### 시스템 사례 한눈에

| 시스템 | Default | 가장 강한 격리 | 구현 |
|---|---|---|---|
| Postgres | Read Committed | Serializable | MVCC + SSI |
| MySQL InnoDB | Repeatable Read | Serializable | MVCC + 2PL + next-key lock |
| Oracle | Read Committed | Serializable (실은 SI) | MVCC + undo log |
| SQL Server | Read Committed | Serializable | Lock-based or MVCC opt-in |
| FoundationDB | Serializable | Serializable | SSI (낙관적) |
| Spanner | External Consistency | External Consistency | TrueTime + 2PC + Paxos |
| VoltDB | Serializable | Serializable | Literal serial (single thread) |
| Redis (MULTI/EXEC) | Serializable | Serializable | Single thread |

같은 "Serializable"이 시스템마다 다른 구현으로 제공된다. 선택할 때는 구현의 트레이드오프를 본다 — 락 경합 vs abort 비율 vs 처리량 상한.

## Repeatable Read의 표준 vs 실제

SQL 표준은 `REPEATABLE READ`를 "트랜잭션 안에서 같은 row를 두 번 읽으면 같은 값"으로 정의. 그러나 phantom은 허용. 그래서 표준의 `REPEATABLE READ`는 — 사실상 무용에 가깝다.

각 DB는 자기 방식으로 강화.

- **Postgres** — `REPEATABLE READ`가 snapshot isolation. Phantom도 막힘 (스냅샷 기반).
- **MySQL InnoDB** — `REPEATABLE READ`가 snapshot isolation + next-key lock으로 일부 phantom 방지. Write skew는 여전히 가능.
- **Oracle** — `SERIALIZABLE`이 사실은 snapshot isolation.
- **SQL Server** — `SNAPSHOT` 격리 레벨을 별도 옵션으로 추가.

표준 이름만 보고 격리 보장을 단정하지 말 것. 각 DB의 문서를 직접 읽어야 한다.

## Long-Running Read의 비용

MVCC 기반 DB에서 — long-running read 트랜잭션이 있으면 — 그 트랜잭션이 시작한 시점 이후의 모든 row 옛 버전을 보관해야 한다. 일반 워크로드에서는 `VACUUM` (Postgres) 또는 undo log purge (MySQL)로 옛 버전이 정리되지만, 긴 트랜잭션이 그 정리를 막는다.

```text
T0: long read 트랜잭션 시작 (1시간 돈다)
T1, T2, ...: 짧은 트랜잭션들이 row 갱신
1시간 후 T0 끝남 → 그동안 쌓인 모든 옛 버전을 한 번에 정리 가능
```

문제는 — 1시간 동안 disk가 부풀고, query plan에서 옛 버전을 따라가는 비용이 증가. Postgres에서 "vacuum이 안 돌아간다"는 흔한 incident의 원인은 — 한 idle 트랜잭션이 남아 있어 GC 대상에서 제외되고 있다.

운영 팁:

- 트랜잭션은 짧게 (가능하면 ms 단위).
- 대화식 트랜잭션 (사용자 입력 기다리는) 피하기.
- 모니터링 — `pg_stat_activity`에서 `state = 'idle in transaction'`을 알람.

## Optimistic vs Pessimistic — 다른 시각

격리 구현을 — concurrency control의 두 큰 부류로 본다.

- **Pessimistic** — "충돌이 자주 일어난다고 가정." 미리 락을 잡고 진행. 2PL이 대표.
- **Optimistic** — "충돌이 드물다고 가정." 충돌 없이 진행하고 commit 시 검증. SSI가 대표.

```text
Pessimistic:           Optimistic:
  begin                  begin
  lock(X)                read(X)
  read(X)                write(X)
  write(X)               commit:
  unlock(X)                validate (충돌 검사)
  commit                   if 충돌 → abort
                           else → apply
```

| | Pessimistic | Optimistic |
|---|---|---|
| 충돌 빈도 낮을 때 | 락 비용만큼 손해 | 매우 빠름 |
| 충돌 빈도 높을 때 | 정상 동작 | abort/retry로 throughput 폭락 |
| Deadlock | 가능 | 없음 (validate에서 거부) |
| 구현 복잡도 | 보통 | 높음 (read set 추적) |

워크로드를 알면 적절한 도구를 고를 수 있다. 같은 데이터에 자주 경합하면 pessimistic, 분포가 넓으면 optimistic.

## 작은 예시 — 은행 송금에 어떤 격리가 필요한가

은행 송금. 흔한 OLTP 워크로드.

```sql
BEGIN;
  SELECT balance FROM accounts WHERE id = 1;   -- 1000
  -- 애플리케이션: 1000 >= 100 이므로 송금 가능
  UPDATE accounts SET balance = balance - 100 WHERE id = 1;
  UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;
```

- Read Committed — 부족. 두 송금이 동시에 잔액 1000을 보고 각자 100씩 빼면 잔액이 800이 되어야 하지만 lost update 가능.
- Snapshot Isolation — `UPDATE balance = balance - 100`를 쓰면 lost update 회피. 그러나 `SELECT` 후 분기하는 경우는 write skew 가능.
- Serializable — 안전. abort/retry로 정확성 보장.

가장 단순한 답은 — atomic SQL을 쓰고 (`UPDATE WHERE balance >= 100`), 잔액 검증을 한 SQL로 끝낸다. 그러면 Snapshot Isolation으로도 충분. SQL의 표현력을 다 쓰면 isolation level을 한 단계 낮춰도 정확성을 유지할 수 있다.

## Single-Object vs Multi-Object Operation

여러 row에 걸친 트랜잭션은 비싸다. 한 row 안에서 끝나는 연산은 — 거의 모든 DB가 atomic을 무료로 준다.

```sql
-- Single-row, 무료 atomic
UPDATE accounts SET balance = balance - 100 WHERE id = 1;

-- Multi-row, 트랜잭션 필요
BEGIN;
  UPDATE accounts SET balance = balance - 100 WHERE id = 1;
  UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;
```

NoSQL의 많은 시스템 (DynamoDB, MongoDB 초기 버전 등)이 — single-row atomicity만 보장하고 multi-row 트랜잭션은 지원 안 함. 데이터 모델 설계 단계에서 — 한 row (또는 한 document)에 같이 변할 데이터를 묶어 두면 트랜잭션 없이 된다.

그러나 — 이게 항상 가능한 건 아니다. 송금처럼 두 entity 사이 invariant가 있는 경우는 multi-row 트랜잭션을 피할 수 없다.

## Stored Procedure — 트랜잭션 코드의 위치

대화식 트랜잭션 (`BEGIN ... 클라이언트 처리 ... COMMIT`)은 — 네트워크 RTT 동안 락이 유지되어 느리다. 클라이언트 장애 시 락이 한참 남기도 한다.

대안 — **stored procedure**. 트랜잭션 코드 전체를 DB 서버에 미리 등록. 클라이언트는 한 번의 RPC로 호출.

```text
대화식:
  client → DB: BEGIN
  client: think 50ms
  client → DB: SELECT
  client: think 50ms
  client → DB: UPDATE
  client: think 50ms
  client → DB: COMMIT
  total: 200ms+ 락 유지

Stored procedure:
  client → DB: CALL transfer(1, 2, 100)
  total: 1 RTT
```

VoltDB가 — stored procedure만 받는 모델. 단일 스레드 직렬 실행을 가능하게 하는 전제.

## 격리 선택의 가이드

| 워크로드 | 권장 격리 |
|---|---|
| 단순 read-heavy, 정확성 약간 양보 가능 | Read Committed |
| 일반 OLTP, 대부분의 응용 | Snapshot Isolation |
| 금융, 재고, 동시 등록 | Serializable |
| 매우 짧고 단순한 트랜잭션, 메모리 OLTP | Literal Serial Execution |

기본 원칙 — 격리는 강할수록 정확하지만 느리다. 응용의 정확성 요구를 분석해 — 충분히 강한 가장 약한 격리를 고른다. 그러나 — 잘 모르겠으면 강한 쪽 (Serializable)을 default로 두고, 측정으로 병목이 확인되면 약하게 풀어 가는 게 안전한 순서다.

## 정리

- **ACID**의 각 글자를 따로 본다 — Consistency는 사실 application property
- **Atomicity ≠ Consistency** — DB가 보장하는 것 vs 애플리케이션이 보장하는 것
- **Read Committed** — Dirty Read 방지, default
- **Snapshot Isolation** — 일관된 스냅샷, MVCC (Postgres / MySQL InnoDB)
- **Lost Update / Write Skew / Phantom** — Snapshot만으론 부족
- **Serializable** — 가장 강함, 세 가지 구현
  - Literal serial — Redis, VoltDB
  - 2PL — MySQL InnoDB
  - SSI — Postgres, FoundationDB
- **Predicate lock** — phantom 방지의 이론적 도구, 실용은 next-key lock으로 근사
- **External Consistency** — Spanner. Serializable + 인과 순서까지
- 대부분 SI로 충분, Serializable은 정확성 최우선 때

## 다음 장 예고

다음 장은 **분산 시스템의 문제들** — 네트워크는 신뢰할 수 없고, 시계는 동기 안 됐고, 부분 실패가 일어난다. 여태까지 본 트랜잭션의 보장이 분산 환경에서 왜 더 어려워지는지를 본다.

## 관련 항목

- [Ch 6: Partitioning](/blog/parallel/designing-data-intensive-applications/chapter06-partitioning)
- [Ch 8: 분산 시스템의 문제들](/blog/parallel/designing-data-intensive-applications/chapter08-the-trouble-with-distributed-systems)
- [Ch 9: 일관성과 합의](/blog/parallel/designing-data-intensive-applications/chapter09-consistency-and-consensus)
- [AMP Ch 18: Transactional Memory](/blog/parallel/parallel-principles/ch18-transactional-memory) — STM과의 비교
