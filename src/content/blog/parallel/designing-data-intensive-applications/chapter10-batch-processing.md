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

Part III 시작. **Derived data** — 원본 데이터에서 파생된 데이터.

10장은 **배치 처리** — 대량의 입력을 받아 대량의 출력을 만드는 작업.

```
입력: 어제의 모든 로그 (1TB)
처리: 사용자별 활동 통계 계산
출력: 사용자별 통계 (10GB)
```

Unix 파이프부터 시작해 MapReduce, Spark까지.

## Unix Philosophy — 배치의 원조

```bash
cat /var/log/nginx/access.log |
    awk '{print $7}' |
    sort |
    uniq -c |
    sort -rn |
    head -5
```

Doug McIlroy 같은 Unix 선조들의 가르침.

- 작은 프로그램, 각자 한 일만
- Plain text로 통신
- 파이프로 합성

이게 **MapReduce의 정신적 조상**. 분산 환경으로 확장된 같은 아이디어.

## MapReduce — Google의 대규모 배치 (2004)

```python
def map(key, value):
    # 입력 한 레코드 → 0개 이상의 (key, value) 출력
    for word in value.split():
        emit((word, 1))

def reduce(key, values):
    # 같은 key의 values를 받아 출력
    emit((key, sum(values)))
```

**메커니즘**:

1. **Map** — 입력을 (key, value) 쌍으로 변환, 분산 실행
2. **Shuffle** — 같은 key가 같은 reducer로 가도록 정렬 / 분배
3. **Reduce** — 각 key의 모든 value를 모아 집계

`hello world hello`:
```
Map:    (hello, 1), (world, 1), (hello, 1)
Shuffle: hello → [1, 1], world → [1]
Reduce: hello: 2, world: 1
```

### 분산 실행

```
1000개 노드:
- 100GB 입력 → 1000 partition × 100MB
- 각 노드가 한 partition에 대해 map 실행
- shuffle (네트워크 통신) → 같은 key 묶기
- 각 노드가 reduce 실행
- 결과 partition들이 다음 단계의 입력
```

데이터를 노드 사이에 옮기는 비용을 최소화하려고 **데이터 근처에 계산**.

## Hadoop — MapReduce의 오픈소스

Google MapReduce 논문(2004) → Yahoo가 Hadoop으로 오픈소스(2006).

핵심 구성:

- **HDFS** (Hadoop Distributed File System) — 분산 스토리지
- **MapReduce** — 분산 처리
- **YARN** — 리소스 관리자 (later)

Hadoop은 2010년대 빅데이터의 토대. 그러나 점차 Spark 등에 자리 양보.

## MapReduce의 한계

**1. 단계마다 디스크 I/O**

```
Map output → 디스크
Shuffle → 디스크
Reduce → 디스크
```

여러 단계의 job이면 매 단계 디스크. 느림.

**2. 표현력 제한**

복잡한 알고리즘 — 반복, iterative, ML — 표현 어려움.

**3. 코드량**

기본적인 처리도 많은 boilerplate.

## Spark — 메모리 기반 배치

Matei Zaharia 등이 Berkeley AMPLab에서 개발 (2010).

**핵심 아이디어**:

- **RDD** (Resilient Distributed Dataset) — 메모리에 분산된 데이터셋
- **Lineage** — 데이터의 유도 그래프 — 실패 시 재계산
- **Transformations + Actions** — lazy evaluation

```python
data = sc.textFile("hdfs://...")
counts = data.flatMap(lambda line: line.split())
              .map(lambda word: (word, 1))
              .reduceByKey(lambda a, b: a + b)
counts.saveAsTextFile("hdfs://...")
```

**MapReduce vs Spark**:

| 측면 | MapReduce | Spark |
|---|---|---|
| 중간 결과 | 디스크 | 메모리 |
| 반복 알고리즘 | 매우 비쌈 | 빠름 |
| 표현력 | 제한적 | 풍부 |
| 속도 | 1× | 10-100× |

## DataFrame / SQL 추상화

Spark가 더 높은 추상화 제공.

```python
df = spark.read.parquet("/data/sales")
result = df.groupBy("country") \
           .agg(sum("amount").alias("total")) \
           .orderBy("total", ascending=False)
```

또는 직접 SQL.

```sql
SELECT country, SUM(amount) FROM sales GROUP BY country
```

이게 **모던 데이터 엔지니어링의 표준**. Spark SQL이 RDD보다 더 흔히 쓰임.

## Join 알고리즘

배치 처리의 큰 부분. 여러 데이터셋을 합치는 join.

### Sort-Merge Join

```
Dataset A: sort by join key
Dataset B: sort by join key
Merge: 두 정렬된 데이터를 스캔하며 결합
```

대규모 데이터에 자연스러움.

### Hash Join (Broadcast)

작은 데이터셋을 메모리의 hash table로. 큰 데이터셋을 스캔하며 lookup.

```
Build phase: 작은 데이터 → hash table
Probe phase: 큰 데이터 스캔, 매 row를 hash table에서 찾기
```

작은 dataset이 한 노드의 메모리에 들어갈 때 좋음.

### Partitioned Join

두 dataset 모두 같은 키로 partition. 같은 partition끼리 join.

```
A partitioned by user_id
B partitioned by user_id
→ partition_i의 A와 B만 join
```

분산 환경의 표준.

## Workflow Engines

복잡한 배치는 여러 단계의 job. 의존성을 관리하려면 **workflow engine**.

- **Airflow** — Python DAG
- **Luigi** — Spotify
- **Prefect, Dagster** — 새 세대

```python
# Airflow DAG
extract = PythonOperator(task_id='extract', python_callable=extract_data)
transform = PythonOperator(task_id='transform', python_callable=transform_data)
load = PythonOperator(task_id='load', python_callable=load_data)

extract >> transform >> load
```

스케줄링, 의존성, 재시도, 모니터링 모두 처리.

## Batch의 출력

배치 처리의 결과는 다양한 곳으로.

- 분석 DB (Snowflake, BigQuery)
- 검색 인덱스 (Elasticsearch)
- ML 모델 학습 데이터
- 다른 시스템의 입력

배치는 거의 항상 **idempotent** — 같은 입력 → 같은 출력. 실패하면 재실행으로 회복.

## 정리

- 배치 처리 = 대량 입력 → 대량 출력 (오프라인)
- **Unix Philosophy** — 작은 도구의 합성, 배치의 정신적 조상
- **MapReduce** — Map + Shuffle + Reduce, Google 2004
- **Hadoop / HDFS** — 오픈소스 표준 (2000년대)
- **Spark** — 메모리 기반, 10-100배 빠름, 모던 표준
- **DataFrame / SQL** — 모던 추상화
- **Join 알고리즘** — Sort-merge, Hash, Partitioned
- **Workflow Engine** — 복잡한 의존성 관리 (Airflow 등)
- 배치는 **idempotent**

## 다음 장 예고

다음 장은 **Stream 처리** — 배치의 반대, 무한한 입력의 즉시 처리.

## 관련 항목

- [Ch 9: Consistency](/blog/parallel/designing-data-intensive-applications/chapter09-consistency-and-consensus)
- [Ch 4: Encoding](/blog/parallel/designing-data-intensive-applications/chapter04-encoding-and-evolution) — 직렬화 형식
