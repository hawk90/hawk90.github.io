---
title: "Ch 3: 저장과 검색"
date: 2026-05-12T03:00:00
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

비유로 옮기면 두 도서관 사서의 일하는 방식과 같다.

- **LSM**: *책이 들어오면 일단 새 책장에 쌓고*, *주말마다 정리해서 알파벳 순으로 합친다*. 책 넣는 일은 빠르고, 찾는 일은 *여러 책장을 뒤져야* 한다.
- **B-tree**: *책이 들어올 때마다 정확한 위치를 찾아 끼워 넣는다*. 책 넣는 일은 느리고, 찾는 일은 항상 *한 책장*에서 끝난다.

어느 방식이 *옳은가*는 *입출 패턴*에 달렸다. 매일 책이 폭발적으로 들어오면 LSM, 책 찾는 일이 압도적으로 많으면 B-tree.

## 세상에서 가장 단순한 DB

```bash
db_set() { echo "$1,$2" >> database; }
db_get() { grep "^$1," database | sed -e "s/^$1,//" | tail -n 1; }
```

`db_set` — append-only 로그.
`db_get` — 처음부터 끝까지 스캔, 마지막 값 반환.

**놀랍게도** 쓰기가 매우 빠르다 — append-only가 가장 빠른 디스크 패턴. *HDD의 sequential write*는 random write보다 *100배* 빠르다. *SSD*에서도 비슷한 차이가 난다 (수명 측면).

**그러나** 읽기가 O(N) — 데이터 많아지면 절망적.

이 단순한 시작에서 모던 DB가 두 방향으로 진화했다.

```text
세상 가장 단순한 DB
        ↓
        ├──[빠른 쓰기 유지, 인덱스 추가]──→  LSM Tree
        │
        └──[정렬된 페이지 구조]────────→  B-Tree
```

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

```text
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
2. *함께 WAL(write-ahead log)*에 append — crash 복구용
3. memtable 가득 차면 SSTable로 flush (sequential write)
4. 백그라운드 compaction이 SSTable을 merge

**읽기**:
1. memtable 확인
2. 없으면 최신 SSTable부터 차례로 확인
3. **Bloom filter**로 SSTable 안에 키 없으면 스킵

**장점**:
- 쓰기가 매우 빠름 (모두 sequential)
- 압축 효과적
- 디스크 효율적
- 쓰기 throughput이 매우 높음

**단점**:
- 읽기가 여러 SSTable 확인 (느림)
- Compaction이 background에서 디스크 사용
- Compaction이 *예측 불가능한 latency spike*를 만들 수 있음

LSM 사용 — Cassandra, RocksDB, LevelDB, HBase, Bigtable, ScyllaDB.

### Compaction 전략

두 큰 전략.

**Size-tiered** (Cassandra의 기본)
: 비슷한 크기의 SSTable이 모이면 합친다. 단순하고 *쓰기 비용*이 낮다. 그러나 *공간 amplification*이 크다.

**Leveled** (LevelDB, RocksDB)
: SSTable을 *level별로* 정리. 각 level은 일정 크기 제한. 다음 level과 *겹치는 범위*가 있으면 merge. *공간 amplification*이 작고 *읽기*에 유리.

```text
Leveled compaction:
  L0:  [SST] [SST] [SST]                   (10MB 합치면)
  L1:  [SST(100MB)]                        (100MB 합치면)
  L2:  [SST(1GB)] [SST(1GB)]
  L3:  [SST(10GB)] [SST(10GB)] ...
```

각 level이 *10배 크기*. 매 level 한 SSTable이 *다음 level의 약 10개*와 겹친다.

### Bloom Filter

*"이 키가 이 SSTable에 있는가?"*에 *false negative 없이* 빠르게 답한다.

```text
키 → 해시 k개 → 비트 배열의 k개 위치 set
검사: k개 위치가 모두 1이면 "있을 수 있음", 하나라도 0이면 "확실히 없음"
```

*false positive*는 있지만 *false negative*는 없다. SSTable 한 개당 *수 KB*의 Bloom filter로 *수 GB*의 SSTable을 *읽지 않고 스킵*할 수 있다. 읽기 성능에 결정적.

## B-Tree — Page-Oriented

```text
              [40 | 70]
             /    |    \
        [10|20]  [50|60] [80|90]
       /  |  \   ... ...
     [pages of data]
```

**고정 크기 페이지**로 디스크 구성. 보통 4KB ~ 16KB.

**쓰기**:
1. 정확한 페이지를 찾음 (트리 탐색)
2. 페이지를 변경 (in-place update)
3. 페이지가 가득 차면 분할

**읽기**:
1. 루트부터 트리 탐색
2. O(log N) 디스크 페이지 읽기 — 보통 *3~4단계*

**장점**:
- 읽기가 일관되게 빠름
- Transactional 더 단순 (페이지 단위 락)
- 수십 년의 최적화
- *index만으로 답이 나오는 covering query* 가능

**단점**:
- 쓰기가 random write (sequential 아님)
- WAL (Write-Ahead Log) 필요 (crash recovery)
- 페이지 분할 비용
- 한 페이지 일부만 채워지면 *공간 낭비*

B-Tree 사용 — PostgreSQL, MySQL InnoDB, SQLite, Oracle, SQL Server, MongoDB(WiredTiger).

### B-Tree의 변종

- **B+ tree** — 데이터는 *리프 노드*에만, 내부 노드는 키만. 가장 흔한 형태.
- **B^ε tree** — 내부 노드에 *변경 버퍼*. 쓰기 성능 향상 (TokuDB).
- **Bw-tree** — *lock-free* 변종 (Microsoft Hekaton).
- **Fractal tree** — buffered B-tree (Tokutek).

### Crash recovery — WAL

B-tree의 in-place update는 *부분 쓰기*에 취약하다. 페이지 4KB를 쓰는 도중 전원이 나가면 *반쪽 페이지*가 남는다.

해법: **WAL** (Write-Ahead Log).

```text
쓰기 절차:
  1. 변경 사항을 WAL에 append (sequential)
  2. WAL fsync (디스크 영구화)
  3. B-tree 페이지 in-place 변경
  4. (주기적으로) WAL 정리

crash 후 복구:
  1. 마지막 checkpoint부터 WAL 재실행
  2. 일관된 상태로 복원
```

WAL은 *append-only*. LSM의 *log*와 본질적으로 같은 아이디어다. B-tree도 *내부적으로는 log*를 쓰는 셈.

## LSM vs B-Tree

| 측면 | LSM | B-Tree |
|---|---|---|
| 쓰기 | 매우 빠름 (sequential) | 보통 (random) |
| 읽기 | 보통 (여러 SSTable) | 빠름 (트리 탐색) |
| 압축 | 좋음 (SSTable 압축) | 보통 |
| Write amplification | 큼 (compaction) | 작음 |
| Crash recovery | 쉬움 (log) | 어려움 (WAL) |
| Transactional | 더 어려움 | 더 쉬움 |
| Latency 일관성 | 변동 (compaction 영향) | 일관 |
| 공간 amplification | 작음 (압축) | 큼 (단편화) |

**Write-Heavy** — LSM (시계열, 로그, 분석).
**Read-Heavy** — B-Tree.

### Write amplification vs Read amplification

성능을 정확히 비교하려면 *세 가지 amplification*을 본다.

**Write amplification**
: *사용자 쓰기 1바이트*가 *디스크에 몇 바이트 쓰기로 변환*되는가.

```text
LSM:    1바이트 → memtable → SSTable → compaction L1 → compaction L2 ...
        총 디스크 쓰기 = 1 * (L0→L1 비율) * (L1→L2 비율) ... ≈ 10~30배
B-tree: 1바이트 → 페이지(4KB) 전체 + WAL 같은 페이지
        총 디스크 쓰기 ≈ 2 * 4KB / 평균 행 크기
```

LSM이 *데이터 크기* 측면에서는 더 많이 쓰지만, *sequential write*이라 *처리량*이 압도적으로 높다.

**Read amplification**
: *사용자 읽기 1건*이 *디스크 읽기 몇 건으로 변환*되는가.

```text
LSM:    여러 SSTable 검사 + Bloom filter false positive
B-tree: 트리 깊이만큼 (3~4 페이지)
```

**Space amplification**
: *논리 데이터 크기* 대비 *디스크 점유 크기*.

```text
LSM:    압축으로 작음. 그러나 compaction 중 *일시적으로* 2배.
B-tree: 페이지 단편화로 보통 30~50% 추가.
```

### SSD의 등장이 바꾼 것

전통적으로 *HDD*에서는 LSM이 압도적이었다 — random write가 10ms vs sequential 0.1ms. SSD에서는 차이가 줄었지만 *여전히* LSM이 유리하다 — *write amplification*이 SSD 수명에 직결되기 때문이다.

NVMe SSD 시대에는 *low write amplification*이 더 중요해졌다. RocksDB 같은 LSM도 *amplification 최소화*에 많은 엔지니어링이 들어간다.

## Secondary Index

기본 키(primary key) 외의 칼럼으로 검색하려면 *secondary index*.

```sql
SELECT * FROM users WHERE email = 'alice@example.com';
```

email로 검색하려면 *email → user_id*의 별도 인덱스가 필요.

### Clustered vs Non-clustered

**Clustered index** (MySQL InnoDB의 primary)
: *인덱스가 곧 데이터*. 리프 노드에 *전체 행*이 저장. PK로 검색 시 *한 번의 lookup*.

**Non-clustered index** (secondary)
: 리프 노드에 *PK*만 저장. secondary로 검색하면 *두 번의 lookup* — 인덱스 → PK → 데이터.

```text
PostgreSQL:
  모든 인덱스가 non-clustered (heap + index)
  PK 검색도 2단계
MySQL InnoDB:
  PK는 clustered (인덱스가 데이터)
  secondary는 PK 가리킴 → 2단계
```

### Covering Index

*query가 필요한 모든 칼럼*을 인덱스에 포함하면 *데이터 페이지를 안 읽는다*.

```sql
CREATE INDEX idx ON orders(user_id) INCLUDE (amount, created_at);

-- 이 query는 인덱스만으로 답이 나옴 (index-only scan)
SELECT user_id, amount FROM orders WHERE user_id = 42;
```

저장 공간이 늘지만 *읽기 성능*이 크게 개선. OLTP에서 자주 쓰는 기법.

### Multi-column Index

`(country, state, city)` 순서의 복합 인덱스.

```text
효과적 검색:
  WHERE country='KR'
  WHERE country='KR' AND state='Seoul'
  WHERE country='KR' AND state='Seoul' AND city='Gangnam'

비효율적:
  WHERE state='Seoul'             -- prefix가 없음
  WHERE country='KR' AND city='Gangnam'  -- 중간 키 빠짐
```

순서가 *중요*하다. 좌측 *prefix*가 매칭되는 query만 효과적.

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

```text
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

OLAP DB는 대부분 column-oriented — ClickHouse, Snowflake, BigQuery, DuckDB, Druid.

### 압축이 잘 되는 이유

같은 칼럼의 값들은 *type이 같고 분포가 비슷*하다.

```text
country 칼럼: [KR, KR, KR, US, US, KR, KR, ...]
```

이런 데이터는 *run-length encoding*, *dictionary encoding*, *bit-packing* 같은 단순한 압축으로 *10~30배* 줄어든다. row-oriented 저장으로는 이런 패턴이 안 보인다.

대표 압축 기법:

- **Run-length encoding (RLE)** — `KR×3, US×2, KR×2`
- **Dictionary encoding** — `{0: KR, 1: US}`로 매핑 후 `0,0,0,1,1,0,0`
- **Bit-packing** — 작은 정수를 *비트 단위*로 묶음
- **Frame of Reference** — 기준값에서의 차이만 저장
- **Delta encoding** — 이전 값과의 차이 (시계열에 효과적)

### Vectorized Execution

CPU의 *SIMD* 명령어를 활용. 한 칼럼의 *수천 개 값을 한 번에* 처리.

```text
전통적 row-oriented:
  for each row:
    if row.country == 'KR': count++

column-oriented + vectorized:
  load 1024 values into SIMD register
  compare against 'KR' (single instruction)
  count matches (single instruction)
```

CPU 명령 수가 *수십~수백 배* 적다. *L1/L2 캐시*에도 친화적 — 같은 칼럼의 연속 값들이 *연속 메모리*에 있다.

### Druid, ClickHouse, BigQuery

각자의 특화.

**Druid** — 시계열·이벤트. *roll-up*(미리 집계)이 핵심.

**ClickHouse** — *임의의 SQL*을 매우 빠르게. MergeTree 엔진.

**BigQuery** — 서버리스. Google의 Dremel 논문 기반. 페타바이트도 *몇 초*에.

```text
워크로드별 추천:
  사용자 행동 분석 / 로그:    ClickHouse, Druid
  데이터 웨어하우스 (별형 스키마): Snowflake, BigQuery, Redshift
  임베디드 / 단일 노드:        DuckDB
  실시간 OLAP:                 Apache Pinot, Druid
```

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

### Data Cube

여러 차원의 *모든 조합*을 미리 계산.

```text
차원: date × product × region × customer_segment
큐브: 모든 차원 조합에 대해 SUM(amount), COUNT(*)
```

*roll-up* (상세 → 요약), *drill-down* (요약 → 상세), *slice & dice* (한 차원 고정) 같은 OLAP 연산이 *상수 시간*. 그러나 *큐브 크기*가 차원 수에 *지수적*으로 커진다.

## 작은 예시 — 시스템 사례 비교

| 시스템 | 엔진 | 모델 | 워크로드 |
|---|---|---|---|
| PostgreSQL | B-tree | Relational | OLTP, 일반 |
| MySQL InnoDB | B-tree (clustered) | Relational | OLTP, 웹 |
| SQLite | B-tree | Relational | 임베디드 |
| MongoDB | B-tree (WiredTiger) | Document | OLTP, 유연한 스키마 |
| Cassandra | LSM | Wide-column | 시계열, 쓰기 많음 |
| HBase | LSM | Wide-column | 큰 분산, Hadoop 연동 |
| ScyllaDB | LSM (C++) | Wide-column | Cassandra 호환, 고성능 |
| RocksDB | LSM | KV (embedded) | 임베디드 엔진 |
| LevelDB | LSM | KV (embedded) | RocksDB의 조상 |
| Redis | 메모리 | KV / 자료구조 | 캐시, 세션 |
| ClickHouse | Column + LSM | Relational (OLAP) | 분석 |
| Druid | Column | Time series | 실시간 분석 |
| BigQuery | Column (Capacitor) | Relational (OLAP) | 서버리스 분석 |

각 시스템이 *특정 워크로드*에 특화. 만능 DB는 없다.

## 정리

- DB의 두 큰 패밀리 — **LSM Tree** vs **B-Tree**
- **LSM** — 쓰기 빠름, sequential, compaction (Cassandra, RocksDB)
- **B-Tree** — 읽기 빠름, transactional 친화 (PostgreSQL, MySQL)
- **SSTable** — 정렬된 디스크 파일, LSM의 기본 블록
- **Bloom filter** — false negative 없이 키 존재 여부 빠른 확인
- **Compaction 전략** — size-tiered vs leveled
- **Write/read/space amplification** — 정확한 비교 지표
- **WAL** — B-tree에도 *내부적으로 log* 사용
- **Secondary index** — clustered vs non-clustered, covering, multi-column
- **OLTP** — 적은 행, 자주 쓰기, low latency (row-oriented)
- **OLAP** — 많은 행, 분석, batch 로딩 (column-oriented)
- **Column store** — OLAP의 핵심 — 압축, SIMD, 일부 칼럼만
- **압축 기법** — RLE, dictionary, bit-packing, delta encoding
- **Materialized view / Cube** — 미리 계산된 집계, OLAP 가속

## 다음 장 예고

다음 장은 **Encoding and Evolution** — 데이터를 어떻게 직렬화하고 스키마를 진화시킬 것인가. JSON, protobuf, Avro, Thrift.

## 관련 항목

- [Ch 2: 데이터 모델](/blog/parallel/designing-data-intensive-applications/chapter02-data-models-and-query-languages)
- [AMP Ch 14: Skiplists](/blog/parallel/parallel-principles/ch14-skiplists-and-balanced-search) — B-Tree의 동시성 친척
- *The Log-Structured Merge-Tree (LSM-Tree)* — O'Neil et al., 1996 (LSM의 원전)
- *Bigtable* — Google, 2006 (SSTable 개념의 산업적 시작)
- *C-Store: A Column-Oriented DBMS* — Stonebraker et al., 2005
- *Dremel: Interactive Analysis of Web-Scale Datasets* — Google, 2010 (BigQuery의 기반)
