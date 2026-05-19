---
title: "Ch 10: Batch 처리"
date: 2026-05-12T10:00:00
description: "MapReduce, Hadoop, Spark. 대량 데이터의 배치 처리 — 입력 partition, sort, reduce."
tags: [DDIA, Batch, MapReduce, Hadoop, Spark]
series: "Designing Data-Intensive Applications"
seriesOrder: 10
draft: true
---

## 이 챕터의 메시지

Part III의 시작이다. 1~9장은 **데이터의 원본 시스템** — DB, 복제, 트랜잭션, 합의 — 을 다뤘다. Part III는 그 원본에서 파생된 **derived data** — 인덱스, 캐시, 분석 뷰, ML 학습셋, 검색 인덱스 — 의 세계다.

10장은 **배치 처리(batch processing)**. 대량의 *유한한* 입력을 받아 대량의 출력을 만드는 작업이다.

```text
입력: 어제의 모든 로그 (1TB)
처리: 사용자별 활동 통계 계산
출력: 사용자별 통계 (10GB)
```

특징은 세 가지다.

1. **유한성** — 입력의 끝이 있다. 다음 장의 stream은 끝이 없다.
2. **처리량 우선** — 한 건의 응답 시간보다 전체 처리량(throughput)이 중요하다.
3. **재실행 가능** — 입력이 바뀌지 않으므로 출력도 같다. idempotent하다.

Kleppmann은 이 장에서 *Unix 파이프 → MapReduce → Hadoop → 데이터플로 엔진(Spark/Flink)* 의 흐름으로 배치의 진화를 설명한다.

## Unix Philosophy — 배치의 원조

```bash
cat /var/log/nginx/access.log |
    awk '{print $7}' |
    sort |
    uniq -c |
    sort -rn |
    head -5
```

이 한 줄이 *어떤 URL이 가장 많이 요청됐는지*를 출력한다. Doug McIlroy, Ken Thompson, Dennis Ritchie 같은 Unix 선조들의 설계 철학에서 흘러나온 패턴이다.

핵심 원칙은 네 가지다.

- **한 가지 일을 잘한다** — `sort`는 정렬만, `uniq`은 중복 제거만 한다.
- **Plain text 인터페이스** — stdout이 곧 stdin이다. 구조화된 형식보다 평탄한 텍스트가 합성에 유리하다.
- **파이프로 합성** — 작은 도구를 조합해 큰 작업을 만든다.
- **입력은 불변** — 원본 파일을 건드리지 않는다. 결과는 새 파일로 쓴다.

이게 **MapReduce의 정신적 조상**이다. 분산 환경으로 확장된 같은 아이디어다.

### 일상 비유 — 부엌 도구의 조합

블렌더, 채칼, 거름망. 각각은 한 가지만 한다. 그러나 조합하면 토마토 수프부터 소르베까지 만든다. Unix 도구도 마찬가지다.

### `sort`의 비밀 — 외부 정렬

`sort`가 1TB 파일을 정렬할 수 있다. 메모리가 8GB뿐이어도. 비결은 **외부 정렬(external sort)** — 디스크의 임시 파일을 활용해 분할 정렬한 뒤 병합한다. 이 알고리즘이 MapReduce shuffle 단계의 기반이 된다.

## MapReduce — Google의 대규모 배치 (2004)

Google이 2004년 OSDI 논문 *"MapReduce: Simplified Data Processing on Large Clusters"*에서 발표한 모델이다. 웹 인덱스를 만들기 위한 도구로 만들어졌다.

```python
def map(key, value):
    # 입력 한 레코드 → 0개 이상의 (key, value) 출력
    for word in value.split():
        emit((word, 1))

def reduce(key, values):
    # 같은 key의 values를 받아 출력
    emit((key, sum(values)))
```

**메커니즘은 세 단계다**.

1. **Map** — 입력을 (key, value) 쌍으로 변환. 모든 partition에서 병렬 실행.
2. **Shuffle** — 같은 key가 같은 reducer로 가도록 네트워크 너머로 정렬·분배.
3. **Reduce** — 각 key의 모든 value를 모아 집계.

`hello world hello`라는 입력에 word count를 돌리면.

```text
Map:    (hello, 1), (world, 1), (hello, 1)
Shuffle: hello → [1, 1], world → [1]
Reduce: hello: 2, world: 1
```

### 일상 비유 — 수만 권의 책에서 한 단어 빈도 세기

도서관에 책 만 권이 있고 "love"가 몇 번 등장하는지 세고 싶다고 하자.

- **Map** — 사서 100명이 각자 100권씩 받아 책의 모든 페이지에서 "love"를 발견할 때마다 종이쪽지에 `(love, 1)` 적는다.
- **Shuffle** — 모든 사서의 쪽지를 모은 뒤 단어별로 분류한다. "love" 쪽지는 한 더미로, "hate" 쪽지는 다른 더미로.
- **Reduce** — 각 더미를 집계한다. "love 더미"는 한 사서가 받아 쪽지 개수를 더한다.

이게 MapReduce의 정확한 작동 방식이다. **partition은 동네별 분담**과 같다. 한 사서가 모든 책을 읽기는 무리지만 100명이 나눠 읽으면 100배 빠르다.

### Shuffle의 진짜 비용

Map이 빠르다. Reduce도 빠르다. 그런데 **shuffle이 가장 비싸다**. 모든 노드의 map 출력이 네트워크를 가로질러 reducer에 모여야 한다. 디스크에 spill되고, 정렬되고, 다시 읽힌다.

```text
Map output → 로컬 디스크 (spill, sort)
           → 네트워크 (shuffle)
           → Reduce 노드 디스크 (merge)
           → Reduce 입력
```

MapReduce의 모든 최적화는 결국 **shuffle 줄이기**로 수렴한다. Combiner, partitioner, in-mapper combining — 모두 shuffle 트래픽을 줄이는 기법이다.

### 분산 실행

```text
1000개 노드:
- 100GB 입력 → 1000 partition × 100MB
- 각 노드가 한 partition에 대해 map 실행
- shuffle (네트워크 통신) → 같은 key 묶기
- 각 노드가 reduce 실행
- 결과 partition들이 다음 단계의 입력
```

데이터를 노드 사이에 옮기는 비용을 최소화하려고 **데이터 근처에 계산을 보낸다**. 이걸 **data locality**라 부른다. 코드는 KB 단위, 데이터는 GB 단위. 작은 걸 옮긴다.

### 책의 web indexing 사례

DDIA가 자세히 다루는 예다. Google이 MapReduce를 만든 이유.

웹 인덱스를 만들려면.

1. 크롤러가 수십억 페이지를 가져온다.
2. **Map** — 각 페이지에서 모든 단어를 추출, `(word, doc_id)`를 emit.
3. **Shuffle** — 같은 단어의 모든 doc_id가 같은 reducer로.
4. **Reduce** — 단어별 posting list 생성 → 역인덱스(inverted index).

```text
Page A: "the cat sat"
Page B: "the dog ran"

Map A: (the, A), (cat, A), (sat, A)
Map B: (the, B), (dog, B), (ran, B)

Shuffle:
  the → [A, B]
  cat → [A]
  dog → [B]
  sat → [A]
  ran → [B]

Reduce:
  the → posting_list("the"): [A, B]
  cat → posting_list("cat"): [A]
  ...
```

검색 엔진의 핵심 데이터 구조가 이 한 job으로 만들어진다. MapReduce가 빅데이터 시대를 연 이유다.

## Hadoop — MapReduce의 오픈소스

Google MapReduce 논문(2004) → Yahoo가 Hadoop으로 오픈소스(2006). Doug Cutting이 만들었고, 아들의 봉제 코끼리 인형 이름을 땄다.

핵심 구성은 세 가지다.

- **HDFS** (Hadoop Distributed File System) — 분산 스토리지.
- **MapReduce** — 분산 처리 엔진.
- **YARN** — 리소스 관리자(나중에 분리됨).

Hadoop은 2010년대 빅데이터의 토대였다. 그러나 점차 Spark, Flink 등에 자리를 내준다.

### HDFS의 기본 — block, replication, locality

HDFS는 Google File System(GFS)의 클론이다. 핵심 개념 셋.

**Block**. 파일을 128MB 단위의 블록으로 잘라 저장한다. 큰 파일도 작은 단위로 다룬다.

```text
hdfs://logs/2026-05-19.log (5 GB)
  → block_0001 (128 MB)
  → block_0002 (128 MB)
  → ...
  → block_0040 (128 MB)
```

**Replication**. 각 블록을 *세 노드에* 복제한다. 한 노드가 죽어도 데이터 손실 없음. 보통 두 개는 같은 랙, 한 개는 다른 랙(rack-aware placement). 네트워크 장애와 디스크 장애를 동시에 견딘다.

**Locality**. NameNode가 어느 블록이 어느 노드에 있는지 안다. MapReduce 스케줄러가 작업을 데이터가 있는 노드로 보낸다.

```text
block_0001 on [node3, node7, node12]
→ map task for block_0001 scheduled on node3 (or 7, 12)
```

데이터를 옮기지 않고 코드만 옮긴다. 1000-node 클러스터에서 결정적인 최적화다.

### NameNode와 DataNode

```text
NameNode (1대, master):
  - 파일 → block 매핑
  - block → DataNode 위치
  - 메타데이터만, 메모리에 보관

DataNode (수천 대):
  - 실제 블록 저장
  - NameNode에 heartbeat
  - block 읽기/쓰기 응답
```

NameNode가 single point of failure였던 게 초기 Hadoop의 약점. 나중에 HA(High Availability) NameNode로 보완.

## MapReduce의 한계

MapReduce는 빅데이터의 새 시대를 열었지만 한계가 분명했다.

**1. 단계마다 디스크 I/O**

```text
Map output → 디스크
Shuffle → 디스크
Reduce → 디스크
```

여러 단계의 job이면 매 단계 디스크. 머신러닝의 반복 알고리즘처럼 100번 도는 작업이 100번 디스크를 친다. 메모리에 캐시할 수 없다.

**2. 표현력 제한**

복잡한 알고리즘은 표현이 어렵다. 반복(iterative), DAG, ML — `map → reduce → map → reduce`로 강제하는 게 부자연스럽다.

**3. 코드량**

기본 처리도 boilerplate가 많다. Word count조차 수십 줄의 Java 코드.

**4. 지연(latency)**

job 시작에 분 단위 오버헤드. 작은 작업도 빠르게 못 돌린다.

이 한계가 다음 세대 — Spark, Tez, Flink — 의 동기가 된다.

## Join 알고리즘 — 분산 환경의 join

배치 처리의 큰 부분이 **join**이다. 사용자 테이블과 주문 테이블, 클릭 로그와 사용자 프로필 — 두 데이터셋을 합치는 작업이다. 단일 머신의 DB는 인덱스를 활용해 join한다. 분산 환경에서는 다르다. 데이터가 노드 사이에 흩어져 있다.

DDIA가 자세히 다루는 세 가지 전략.

### 1. Reduce-Side Join (Sort-Merge Join)

가장 일반적이고 가장 비싼 방법.

```text
Map A: 각 레코드 → (join_key, ("A", record))
Map B: 각 레코드 → (join_key, ("B", record))

Shuffle: 같은 join_key가 같은 reducer로

Reduce: 한 key의 A·B 레코드들을 묶어 join
```

장점.

- 두 dataset 모두 클 때 동작.
- 사전 가정 없음.

단점.

- shuffle 트래픽 막대함. 두 dataset 전체가 네트워크를 가로지른다.
- skew(특정 key에 데이터 집중) 시 한 reducer가 너무 많은 일을 받음.

**Skew 처리**. Pig의 *skewed join*, Hive의 *skew hint* — hot key를 여러 reducer로 분산. 또는 hot key를 random suffix로 분할한 뒤 reduce 후 재집계.

### 2. Map-Side Join — Broadcast Hash Join

한 dataset이 작을 때 쓴다.

```text
1. 작은 dataset을 hash table로 메모리에 로드
2. 큰 dataset을 map에서 스캔하며 hash table에서 lookup
3. Reduce 단계 없음!
```

```python
# Mapper의 초기화 단계
def setup():
    small_table = load_small_dataset()  # 메모리에
    self.hash_map = {row.key: row for row in small_table}

def map(key, large_record):
    if large_record.join_key in self.hash_map:
        emit(join(large_record, self.hash_map[large_record.join_key]))
```

장점.

- shuffle 없음 — 매우 빠름.
- Reduce 없음 — map만 돌면 끝.

단점.

- 작은 dataset이 메모리에 들어가야 함. 보통 < 수 GB.

Spark에서 `broadcast(df)`로 명시적 지정. **Hive autobroadcast** — 작은 테이블은 자동으로 broadcast.

### 3. Map-Side Join — Partitioned Hash Join

두 dataset 모두 같은 키로 미리 partition된 경우.

```text
A partitioned by user_id (1000 partitions)
B partitioned by user_id (1000 partitions)

→ partition_i의 A와 B만 join (shuffle 없음!)
→ 각 mapper가 자기 partition만 책임
```

장점.

- 큰 dataset 두 개를 shuffle 없이 join.
- Hive/Spark의 **bucketed table**이 이걸 가능하게 함.

단점.

- 두 dataset이 같은 키, 같은 partition 수로 미리 정렬되어 있어야 함.

### 일상 비유 — 결혼식 좌석 배치

신랑 측 하객 명단과 신부 측 하객 명단을 합쳐 좌석을 정해야 한다.

- **Reduce-side join** — 모든 명단을 한 곳에 모아 알파벳순으로 정렬 후 매칭. 정확하지만 작업량 큼.
- **Broadcast hash join** — 신랑 측 명단(짧음)을 모든 테이블에 복사. 신부 측 명단을 보면서 매칭.
- **Partitioned join** — 미리 성씨별로 명단을 나눠 놨다. 김씨 명단끼리만 비교하면 됨.

### Join 선택 결정표

| 상황 | 권장 |
|---|---|
| A 작음 (< 1GB), B 큼 | Broadcast hash |
| A·B 같은 키로 partition돼 있음 | Partitioned hash |
| 둘 다 크고 partition 없음 | Reduce-side (sort-merge) |
| Skew 심함 | Skewed join (split hot key) |

## Dataflow Engines — DAG 기반의 차세대

MapReduce의 한계를 극복하기 위해 등장한 게 **dataflow engines**다. Spark, Tez, Flink, Apache Beam이 대표.

핵심 차이는 **연산 그래프(DAG)** 를 통째로 다룬다는 점.

```text
MapReduce:
  Job 1 (Map → Reduce) → 디스크
  Job 2 (Map → Reduce) → 디스크
  Job 3 (Map → Reduce) → 결과

Dataflow Engine:
  단일 DAG
  Stage1 → Stage2 → Stage3 → 결과
  중간 결과를 메모리/파이프로 직접 전달
```

DAG 전체를 본다는 건.

- 어디서 shuffle이 필요한지 미리 안다.
- 어떤 단계는 같은 노드에 합칠 수 있다(operator chaining).
- 통계가 있으면 join 전략을 동적으로 고른다(adaptive execution).

### Apache Tez

Hadoop 위에 DAG 엔진을 얹은 프로젝트. Hive on Tez로 자주 쓴다. MapReduce job 여러 개를 합쳐 하나의 DAG으로 실행 → 중간 디스크 I/O 제거.

```text
Hive query: SELECT ... JOIN ... GROUP BY ... ORDER BY ...

MapReduce 시절: 4-5개 MR job, 매 단계 디스크
Tez: 한 DAG, 메모리/파이프 연결
```

### Apache Spark — 메모리 기반의 표준

Matei Zaharia 등이 Berkeley AMPLab에서 개발(2010). 가장 널리 쓰이는 dataflow engine.

```python
data = sc.textFile("hdfs://logs")
counts = (data
    .flatMap(lambda line: line.split())
    .map(lambda word: (word, 1))
    .reduceByKey(lambda a, b: a + b))
counts.saveAsTextFile("hdfs://output")
```

핵심 개념.

- **RDD** (Resilient Distributed Dataset) — 메모리에 분산된 데이터셋. 불변, 파티션됨.
- **Lineage** — RDD가 어떻게 만들어졌는지의 그래프. 노드 실패 시 lineage로 재계산.
- **Lazy evaluation** — transformation은 평가를 지연. action(`collect`, `count`, `save`)이 호출돼야 실행.

### Apache Flink — true streaming + batch

Flink는 사실 stream 엔진이지만 배치도 stream의 특별 경우로 본다(*bounded stream*). 11장에서 자세히.

배치 측면에서는 Spark와 비슷하지만 pipelined execution이 더 강하다. stage 사이 데이터를 디스크에 spill하지 않고 즉시 다음 operator로 흘려보낸다.

### Apache Beam — 통합 모델

Google이 만든 모델. 한 코드로 배치와 stream을 동시에. 백엔드(runner)로 Dataflow, Spark, Flink 등을 고른다.

```python
import apache_beam as beam

with beam.Pipeline() as p:
    counts = (p
        | 'Read' >> beam.io.ReadFromText('logs.txt')
        | 'Split' >> beam.FlatMap(lambda x: x.split())
        | 'Count' >> beam.combiners.Count.PerElement())
    counts | 'Write' >> beam.io.WriteToText('out')
```

같은 파이프라인을 GCP Dataflow에서 돌리든, 로컬 Flink에서 돌리든.

### MapReduce vs Spark — 정량 비교

| 측면 | MapReduce | Spark |
|---|---|---|
| 중간 결과 | 디스크 | 메모리 |
| 반복 알고리즘 (PageRank, ML) | 매우 비쌈 | 빠름 |
| 표현력 | 제한적 (map/reduce만) | 풍부 (수십 종 transformation) |
| API | Java | Python, Scala, Java, R, SQL |
| 속도 | 1× | 10-100× |
| Fault tolerance | 매 단계 디스크 | Lineage 재계산 |

### Spark의 DataFrame / SQL — 모던 추상화

RDD보다 한 단계 위. 컬럼 단위 최적화(Catalyst optimizer)와 Tungsten 엔진의 코드 생성.

```python
df = spark.read.parquet("/data/sales")
result = (df
    .groupBy("country")
    .agg(F.sum("amount").alias("total"))
    .orderBy(F.col("total").desc()))
```

또는 직접 SQL.

```sql
SELECT country, SUM(amount) AS total
FROM sales
GROUP BY country
ORDER BY total DESC
```

이게 **모던 데이터 엔지니어링의 표준**이다. Spark SQL이 RDD보다 더 흔히 쓰인다.

### 일상 비유 — 공장 라인 vs 일괄 작업

MapReduce는 작업장 하나하나가 분리된 공장이다. 한 작업장 작업이 끝나면 트럭(디스크)에 실어 다음 작업장으로 옮긴다. 트럭 적재·이동·하역이 매번 든다.

Dataflow engine은 컨베이어 벨트로 연결된 공장 라인이다. 한 작업이 끝나는 즉시 벨트가 다음 작업장으로 흘려보낸다. 트럭이 필요 없다.

## Workflow Engines — 여러 job의 오케스트레이션

복잡한 배치는 여러 단계의 job이다. 매일 새벽 1시에 로그 수집, 2시에 변환, 3시에 분석 DB 적재 — 이런 의존성과 스케줄을 관리하는 도구가 **workflow engine**이다.

- **Airflow** — Python DAG. Airbnb가 만들어 Apache로 기증. 가장 널리 쓰임.
- **Luigi** — Spotify가 만든 초기 도구. 여전히 일부에서.
- **Prefect, Dagster** — 새 세대. Pythonic API, 더 나은 관측성.
- **Argo Workflows** — Kubernetes 네이티브.

```python
# Airflow DAG 예
from airflow import DAG
from airflow.operators.python import PythonOperator
from datetime import datetime

with DAG('daily_etl', start_date=datetime(2026, 5, 1),
         schedule_interval='@daily') as dag:

    extract = PythonOperator(task_id='extract',
                             python_callable=extract_logs)
    transform = PythonOperator(task_id='transform',
                               python_callable=run_spark_job)
    load = PythonOperator(task_id='load',
                          python_callable=load_to_snowflake)

    extract >> transform >> load
```

Workflow engine이 처리하는 것.

- **스케줄링** — cron-like 스케줄.
- **의존성** — A가 끝나야 B 시작.
- **재시도** — 실패 시 자동 재실행.
- **모니터링** — 실패 알람, UI 대시보드.
- **백필(backfill)** — 과거 일자 재실행.
- **SLA 추적** — 시간 초과 알람.

### 데이터 lineage와 reproducibility

좋은 workflow는 **재실행 가능(reproducible)** 해야 한다.

- 같은 입력 → 같은 출력.
- 어제의 job을 오늘 다시 돌려도 같은 결과.
- 새 버전의 로직을 과거 데이터에 적용 가능(backfill).

이 idempotency가 배치의 핵심 미덕이다.

## Batch의 출력 — 데이터 어디로 가는가

배치 처리의 결과는 다양한 곳으로 흐른다.

- **분석 DB** — Snowflake, BigQuery, Redshift, ClickHouse.
- **검색 인덱스** — Elasticsearch, Solr.
- **키-값 스토어** — Redis, Cassandra (lookup용 sorted index).
- **ML 학습 데이터** — Feature store, TFRecord.
- **다른 시스템의 입력** — 다음 단계의 batch job.

### 인덱스 빌드 패턴

검색 시스템이 자주 쓰는 패턴.

```text
1. HDFS에 raw 로그
2. Spark job: 검색 인덱스 segment 생성
3. Elasticsearch / Solr에 atomic swap으로 교체
```

라이브 시스템에 직접 업데이트하지 않는다. *새 인덱스를 통째로 만들고 한 번에 교체*. 라이브가 안전.

### 배치의 idempotency 원칙

배치는 거의 항상 **idempotent**해야 한다.

- 같은 입력 → 같은 출력.
- 실패하면 재실행으로 회복.
- 부분 출력은 폐기 후 처음부터.

이게 분산 환경에서 fault tolerance의 기반이다. retry가 안전해진다.

## 작은 예시 — 일별 사용자 활동 통계

전체를 묶는 현실적인 예. 매일 어제의 nginx 로그에서 사용자별 페이지뷰를 집계한다고 하자.

**1. HDFS에 raw 로그**.

```text
hdfs:///logs/2026-05-18/access.log.gz (분산된 1000 partition)
```

**2. Spark job**.

```python
from pyspark.sql import SparkSession
from pyspark.sql import functions as F

spark = SparkSession.builder.appName("daily_pv").getOrCreate()

# 로그 읽기
logs = spark.read.text("hdfs:///logs/2026-05-18/*.gz")

# 파싱
parsed = logs.select(
    F.regexp_extract('value', r'user_id=(\w+)', 1).alias('user_id'),
    F.regexp_extract('value', r'GET (/[^\s]*)', 1).alias('path'),
)

# 사용자 프로필과 join (broadcast - 작은 테이블)
profiles = spark.read.parquet("hdfs:///profiles/")
joined = parsed.join(F.broadcast(profiles), "user_id")

# 집계
daily_pv = (joined
    .groupBy("user_id", "country", "path")
    .agg(F.count("*").alias("pageviews"))
    .filter(F.col("pageviews") > 0))

# 결과 atomic swap으로 출력
daily_pv.write.mode("overwrite").parquet("hdfs:///agg/2026-05-18/")
```

**3. Airflow DAG**.

```python
with DAG('daily_pv', schedule_interval='@daily') as dag:
    wait = ExternalTaskSensor(task_id='wait_for_logs', ...)
    spark = SparkSubmitOperator(task_id='aggregate',
                                application='/jobs/daily_pv.py')
    load = PythonOperator(task_id='load_to_redshift',
                          python_callable=copy_to_redshift)

    wait >> spark >> load
```

여기에 들어 있는 모든 개념.

- HDFS의 block·replication·locality.
- Spark의 lazy evaluation과 DAG.
- Broadcast hash join.
- Idempotent output (overwrite).
- Workflow engine의 스케줄링·의존성.

## 정리

- 배치 처리 = **유한한 대량 입력 → 대량 출력**(오프라인, throughput 중심).
- **Unix Philosophy** — 작은 도구의 합성. 배치의 정신적 조상.
- **MapReduce** — Map + Shuffle + Reduce. Google 2004 논문. 웹 인덱싱이 원래 동기.
- **Hadoop / HDFS** — 오픈소스 표준. block(128MB), 3× replication, data locality.
- **Join 알고리즘** — Reduce-side(sort-merge), Broadcast hash, Partitioned hash. 데이터 크기·skew·partition 상태로 선택.
- **MapReduce의 한계** — 단계마다 디스크, 표현력 제한, 반복 알고리즘 비쌈.
- **Dataflow engines** — Spark, Tez, Flink, Beam. DAG 통째로, 메모리 기반, 10-100× 속도.
- **Spark** — RDD + lineage + lazy. DataFrame/SQL이 모던 표준.
- **Apache Beam** — 한 코드로 배치+stream 통합 모델.
- **Workflow engines** — Airflow, Prefect, Dagster. 스케줄·의존성·재시도.
- 배치는 **idempotent**. 재실행이 안전해야 한다.

## 다음 장 예고

다음 장은 **Stream 처리**다. 배치가 *유한한* 입력을 처리한다면, stream은 *무한한* 입력을 즉시 처리한다. Kafka, Flink, Kafka Streams의 세계로 들어간다. 그리고 마지막 12장에서 둘이 *unbundled database* 비전 안에서 합쳐진다.

## 관련 항목

- [Ch 9: Consistency](/blog/parallel/designing-data-intensive-applications/chapter09-consistency-and-consensus) — 배치의 fault tolerance가 단순한 이유
- [Ch 4: Encoding](/blog/parallel/designing-data-intensive-applications/chapter04-encoding-and-evolution) — Parquet, Avro 등 직렬화 형식
- [Ch 6: Partitioning](/blog/parallel/designing-data-intensive-applications/chapter06-partitioning) — partition 전략이 join 비용을 정함
- [Ch 11: Stream](/blog/parallel/designing-data-intensive-applications/chapter11-stream-processing) — 무한 입력의 처리
- [Ch 12: 미래](/blog/parallel/designing-data-intensive-applications/chapter12-the-future-of-data-systems) — batch와 stream의 통합 비전
