---
title: "Ch 3: 저장과 검색"
date: 2025-07-01T03:00:00
description: "DB의 내부 — Log-structured (LSM, SSTable) vs Page-oriented (B-tree). OLTP vs OLAP. Column store."
tags: [DDIA, Storage, LSM, BTree, OLTP, OLAP]
series: "Designing Data-Intensive Applications"
seriesOrder: 3
draft: true
---

## 이 챕터의 메시지

데이터베이스는 두 가지 일을 한다 — **저장**과 **검색**. 어떻게 하느냐가 성능을 결정한다.

이 챕터는 두 큰 스토리지 엔진 패밀리를 본다.

1. **Log-Structured** — LSM tree (Cassandra, RocksDB, LevelDB)
2. **Page-Oriented** — B-tree (PostgreSQL, MySQL InnoDB, SQLite)

각자 다른 트레이드오프.

## 세상에서 가장 단순한 DB

```bash
db_set() { echo "$1,$2" >> database }
db_get() { grep "^$1," database | sed -e "s/^$1,//" | tail -n 1 }
```

`db_set` — append-only 로그.
`db_get` — 처음부터 끝까지 스캔, 마지막 값 반환.

**놀랍게도** 쓰기가 매우 빠르다 — append-only가 가장 빠른 디스크 패턴.
**그러나** 읽기가 O(N) — 데이터 많아지면 절망적.

이 단순한 시작에서 모던 DB가 두 방향으로 진화했다.

## 방향 1 — Log + Index

쓰기 패턴은 유지(append-only), 읽기를 빠르게 — **인덱스**.

```
Log:        (key1, val1), (key2, val2), (key1, val3), ...
Hash Index: {key1 → offset_3, key2 → offset_2}
```

**Hash Index** — 메모리에 키 → 디스크 오프셋의 hash map. 읽기 O(1).

**문제** — 키가 많으면 인덱스가 메모리에 안 들어감.

## SSTable — Sorted String Table

키를 **정렬해서** 저장한다.

```
SSTable:
  apple → 100
  banana → 200
  cherry → 300
  ...
  zebra → 9999
```

**장점**:
- Sparse index만 있으면 됨 (모든 키 아님)
- Range query 자연스러움
- 압축 효과적
- Merge가 효율적 (mergesort)

이게 LSM Tree의 기본 building block.

## LSM Tree (Log-Structured Merge-Tree)

```
Memory (memtable):
  [in-memory balanced tree]
       │
       │ flush when full
       ↓
Disk SSTables:
  Level 0: [SSTable_1] [SSTable_2] [SSTable_3]
  Level 1: [Merged SSTable]
  Level 2: [Merged SSTable]
```

**쓰기**:
1. memtable에 추가 (in-memory)
2. memtable 가득 차면 SSTable로 flush
3. 백그라운드 compaction이 SSTable을 merge

**읽기**:
1. memtable 확인
2. 없으면 최신 SSTable부터 차례로 확인
3. **Bloom filter**로 SSTable 안에 키 없으면 스킵

**장점**:
- 쓰기가 매우 빠름 (모두 sequential)
- 압축 효과적
- 디스크 효율적

**단점**:
- 읽기가 여러 SSTable 확인 (느림)
- Compaction이 background에서 디스크 사용

LSM 사용 — Cassandra, RocksDB, LevelDB, HBase, Bigtable.

## B-Tree — Page-Oriented

```
              [40 | 70]
             /    |    \
        [10|20]  [50|60] [80|90]
       /  |  \   ... ...
     [pages of data]
```

**고정 크기 페이지**로 디스크 구성. 보통 4KB ~ 16KB.

**쓰기**:
1. 정확한 페이지를 찾음 (트리 탐색)
2. 페이지를 변경
3. 페이지가 가득 차면 분할

**읽기**:
1. 루트부터 트리 탐색
2. O(log N) 디스크 페이지 읽기

**장점**:
- 읽기가 일관되게 빠름
- Transactional 더 단순 (페이지 단위 락)
- 수십 년의 최적화

**단점**:
- 쓰기가 random write (sequential 아님)
- WAL (Write-Ahead Log) 필요 (crash recovery)
- 페이지 분할 비용

B-Tree 사용 — PostgreSQL, MySQL InnoDB, SQLite, Oracle, SQL Server.

## LSM vs B-Tree

| 측면 | LSM | B-Tree |
|---|---|---|
| 쓰기 | 매우 빠름 (sequential) | 보통 (random) |
| 읽기 | 보통 (여러 SSTable) | 빠름 (트리 탐색) |
| 압축 | 좋음 (SSTable 압축) | 보통 |
| Write amplification | 큼 (compaction) | 작음 |
| Crash recovery | 쉬움 (log) | 어려움 (WAL) |
| Transactional | 더 어려움 | 더 쉬움 |

**Write-Heavy** — LSM (시계열, 로그, 분석).
**Read-Heavy** — B-Tree.

## OLTP vs OLAP

데이터베이스의 두 큰 워크로드.

### OLTP (Online Transaction Processing)

```
SELECT * FROM customers WHERE id = 12345;
INSERT INTO orders VALUES (...);
UPDATE inventory SET qty = qty - 1 WHERE id = 999;
```

특징:
- 적은 행을 다룸 (보통 키로 정확히)
- 자주 쓰기
- 사용자 대면 (낮은 latency 필수)
- 적은 데이터 (GB ~ TB)

대표 — 일반 비즈니스 DB. PostgreSQL, MySQL, MongoDB.

### OLAP (Online Analytical Processing)

```sql
SELECT product_category, SUM(amount), COUNT(*)
FROM orders
WHERE date BETWEEN '2024-01-01' AND '2024-12-31'
GROUP BY product_category;
```

특징:
- 많은 행을 다룸 (수억 ~ 수십억)
- 거의 읽기만 (배치 로딩)
- 분석가 / 비즈니스 (높은 latency OK)
- 큰 데이터 (TB ~ PB)

대표 — Data Warehouse. Snowflake, BigQuery, Redshift, ClickHouse.

## Column-Oriented Storage

OLAP에 최적화된 저장 방식.

```
Row-Oriented (OLTP):
Row 1: [name, age, country, salary, ...]
Row 2: [name, age, country, salary, ...]

Column-Oriented (OLAP):
Column "name":   [Alice, Bob, Carol, ...]
Column "age":    [30, 35, 28, ...]
Column "salary": [50000, 60000, 55000, ...]
```

**Column-oriented의 강점**:

- 일부 칼럼만 읽으면 됨 (SELECT 3 columns from 100)
- 압축이 매우 효율적 (같은 칼럼 = 같은 타입, 비슷한 값)
- Vectorized execution (SIMD 활용)

**단점** — 한 행을 reconstruct하려면 모든 칼럼 읽기. OLTP에 부적합.

OLAP DB는 대부분 column-oriented — ClickHouse, Snowflake, BigQuery.

## Materialized View / Cube

OLAP의 자주 쓰는 집계를 미리 계산.

```sql
CREATE MATERIALIZED VIEW daily_sales AS
SELECT date, product, SUM(amount)
FROM orders
GROUP BY date, product;
```

- 쿼리 시 — view에서 즉시 답
- 데이터 변경 시 — view 갱신

Data warehouse의 핵심 도구.

## 정리

- DB의 두 큰 패밀리 — **LSM Tree** vs **B-Tree**
- **LSM** — 쓰기 빠름, sequential, compaction (Cassandra, RocksDB)
- **B-Tree** — 읽기 빠름, transactional 친화 (PostgreSQL, MySQL)
- **SSTable** — 정렬된 디스크 파일, LSM의 기본 블록
- **OLTP** — 적은 행, 자주 쓰기, low latency (row-oriented)
- **OLAP** — 많은 행, 분석, batch 로딩 (column-oriented)
- **Column store** — OLAP의 핵심 — 압축, SIMD, 일부 칼럼만

## 다음 장 예고

다음 장은 **Encoding and Evolution** — 데이터를 어떻게 직렬화하고 스키마를 진화시킬 것인가.

## 관련 항목

- [Ch 2: 데이터 모델](/blog/parallel/designing-data-intensive-applications/chapter02-data-models-and-query-languages)
- [AMP Ch 14: Skiplists](/blog/parallel/parallel-principles/ch14-skiplists-and-balanced-search) — B-Tree의 동시성 친척
