---
title: "Ch 7: MapReduce"
date: 2025-05-20T07:00:00
description: "MapReduce 패턴 — 대규모 데이터 병렬 처리의 핵심"
series: "The Art of Concurrency"
seriesOrder: 7
tags: [concurrency, mapreduce, pattern, data-parallel, functional]
draft: true
type: book-review
bookTitle: "The Art of Concurrency"
bookAuthor: "Clay Breshears"
---

## MapReduce란

**함수형 프로그래밍의 두 연산**을 대규모 병렬 처리에 적용한 패턴.

```
기본 아이디어:

입력 데이터 (키-값 쌍들)
       │
       ▼
┌──────────────────────────────────────────┐
│               MAP 단계                    │
│   각 입력에 함수 적용 → 중간 키-값 생성    │
└──────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│           SHUFFLE & SORT                  │
│   같은 키끼리 그룹화 & 정렬               │
└──────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│             REDUCE 단계                   │
│   각 키 그룹에 집계 함수 적용             │
└──────────────────────────────────────────┘
       │
       ▼
    최종 결과
```

**핵심 특징**:

| 특징 | 설명 |
|------|------|
| 데이터 병렬 | 입력을 분할해 독립적 처리 |
| 함수형 | 부작용 없는 순수 함수 |
| 확장성 | 데이터 크기에 따라 워커 추가 |
| 장애 허용 | 실패한 작업만 재실행 |

---

## Map 단계

**입력 키-값 쌍을 변환**하여 중간 키-값 쌍 생성.

```
Map 함수 시그니처:
map(k1, v1) → list((k2, v2))

입력: (키, 값) 한 쌍
출력: 0개 이상의 (새 키, 새 값) 쌍

특징:
- 순수 함수 (부작용 없음)
- 각 입력에 독립적으로 적용
- 완전 병렬화 가능
```

```
예: 문서 → 단어 목록

입력: ("doc1", "hello world hello")

map("doc1", "hello world hello"):
    for word in value.split():
        emit(word, 1)

출력:
    ("hello", 1)
    ("world", 1)
    ("hello", 1)
```

**Map의 병렬 실행**:

```
입력 분할 (4 파티션, 4 워커):

Partition 0 ──▶ Worker 0 ──▶ 중간 결과 0
Partition 1 ──▶ Worker 1 ──▶ 중간 결과 1
Partition 2 ──▶ Worker 2 ──▶ 중간 결과 2
Partition 3 ──▶ Worker 3 ──▶ 중간 결과 3

각 워커는 독립적 → 통신/동기화 불필요
```

---

## Reduce 단계

**같은 키의 값들을 집계**하여 최종 결과 생성.

```
Reduce 함수 시그니처:
reduce(k2, list(v2)) → list((k3, v3))

입력: 키 하나와 해당 키의 모든 값 리스트
출력: 집계된 결과 (보통 하나)

특징:
- 결합적(associative) 연산이면 병렬화 가능
- 교환적(commutative)이면 순서 무관
```

```
예: 단어별 개수 합산

입력: ("hello", [1, 1, 1])

reduce("hello", [1, 1, 1]):
    count = 0
    for v in values:
        count += v
    emit("hello", count)

출력: ("hello", 3)
```

**Reduce의 병렬 실행**:

```
키 공간 분할:

Keys a-m ──▶ Reducer 0 ──▶ 결과 파티션 0
Keys n-z ──▶ Reducer 1 ──▶ 결과 파티션 1

같은 키는 같은 리듀서로 → 중복 없이 집계
```

---

## Shuffle과 Sort

**Map 출력을 Reduce 입력으로 재배치**하는 핵심 단계.

```
Shuffle 과정:

Map 0 출력:          Map 1 출력:
(a, 1)               (b, 1)
(b, 1)               (a, 1)
(c, 1)               (c, 1)

        │ Shuffle (키 기준 재분배)
        ▼

Reducer 0 (a, b):    Reducer 1 (c):
a: [1, 1]            c: [1, 1]
b: [1, 1]
```

```
상세 단계:

1. 파티셔닝:
   - 키의 해시로 대상 리듀서 결정
   - partition(key) = hash(key) % num_reducers

2. 정렬:
   - 각 파티션 내에서 키 순 정렬
   - 같은 키의 값들이 연속

3. 전송:
   - 네트워크로 해당 리듀서에 전달
   - 가장 비용 큰 단계 (I/O 병목)

4. 머지:
   - 여러 매퍼의 결과를 머지 정렬
```

**Combiner 최적화**:

```
문제: Shuffle 네트워크 부하

해결: 로컬에서 먼저 부분 집계 (Combiner)

Map 출력:
(a, 1), (a, 1), (a, 1), (b, 1), (b, 1)

Combiner 적용 후:
(a, 3), (b, 2)

→ 전송량 감소!

조건: Reduce 함수가 결합적이어야
- 합: combiner 사용 가능
- 평균: 직접 불가 (합과 개수 분리 필요)
```

---

## MapReduce 예제

### Word Count

**가장 기본적인 MapReduce 예제**.

```
문제: 문서 집합에서 각 단어의 출현 빈도

입력:
doc1: "the quick brown fox"
doc2: "the fox jumps"
doc3: "brown fox brown"
```

```
Map 함수:

map(doc_id, content):
    for word in content.split():
        emit(word, 1)

Map 출력:
doc1 → (the,1), (quick,1), (brown,1), (fox,1)
doc2 → (the,1), (fox,1), (jumps,1)
doc3 → (brown,1), (fox,1), (brown,1)
```

```
Shuffle 후:

brown → [1, 1, 1]
fox → [1, 1, 1]
jumps → [1]
quick → [1]
the → [1, 1]
```

```
Reduce 함수:

reduce(word, counts):
    emit(word, sum(counts))

최종 출력:
brown: 3
fox: 3
jumps: 1
quick: 1
the: 2
```

---

### 역 인덱스

**검색 엔진의 핵심 데이터 구조**.

```
문제: 단어 → 해당 단어가 나오는 문서 목록

입력:
doc1: "cat dog"
doc2: "dog bird"
doc3: "cat bird cat"
```

```
Map 함수:

map(doc_id, content):
    for word in content.split():
        emit(word, doc_id)

Map 출력:
doc1 → (cat, doc1), (dog, doc1)
doc2 → (dog, doc2), (bird, doc2)
doc3 → (cat, doc3), (bird, doc3), (cat, doc3)
```

```
Shuffle 후:

bird → [doc2, doc3]
cat → [doc1, doc3, doc3]
dog → [doc1, doc2]
```

```
Reduce 함수:

reduce(word, doc_ids):
    unique_docs = sorted(set(doc_ids))
    emit(word, unique_docs)

최종 출력 (역 인덱스):
bird → [doc2, doc3]
cat → [doc1, doc3]
dog → [doc1, doc2]
```

---

### 행렬 곱셈

**대규모 행렬 연산의 MapReduce 구현**.

```
문제: C = A × B

A (m × k), B (k × n) → C (m × n)
C[i][j] = Σ A[i][p] × B[p][j]  (p = 0..k-1)
```

```
입력 표현:
A 원소: ("A", i, j, value)
B 원소: ("B", i, j, value)

예:
A = [[1, 2],     B = [[5, 6],
     [3, 4]]          [7, 8]]

입력:
(A, 0, 0, 1), (A, 0, 1, 2), (A, 1, 0, 3), (A, 1, 1, 4)
(B, 0, 0, 5), (B, 0, 1, 6), (B, 1, 0, 7), (B, 1, 1, 8)
```

```
Map 함수:

map(matrix, i, j, value):
    if matrix == "A":
        # A[i][j]는 C[i][*] 계산에 필요
        for col in range(n):  # B의 열 수
            emit((i, col), ("A", j, value))
    else:  # matrix == "B"
        # B[j][k]는 C[*][k] 계산에 필요
        for row in range(m):  # A의 행 수
            emit((row, j), ("B", i, value))
```

```
Reduce 함수:

reduce((i, j), values):
    # values: [("A", p, a_val), ("B", p, b_val), ...]
    a_vals = {}  # p → A[i][p]
    b_vals = {}  # p → B[p][j]

    for (matrix, p, val) in values:
        if matrix == "A":
            a_vals[p] = val
        else:
            b_vals[p] = val

    result = sum(a_vals[p] * b_vals[p] for p in a_vals)
    emit((i, j), result)
```

---

## 로컬 MapReduce 구현

**멀티코어를 위한 단순 구현**.

```
의사코드:

class LocalMapReduce:
    def __init__(self, num_workers):
        self.num_workers = num_workers

    def run(self, data, map_fn, reduce_fn):
        # 1. Map 단계 (병렬)
        chunks = split(data, self.num_workers)
        map_results = parallel_for_each(chunks, map_fn)

        # 2. Shuffle 단계
        shuffled = {}
        for key, value in flatten(map_results):
            if key not in shuffled:
                shuffled[key] = []
            shuffled[key].append(value)

        # 3. Reduce 단계 (병렬)
        keys = list(shuffled.keys())
        key_chunks = split(keys, self.num_workers)

        def reduce_chunk(key_list):
            results = []
            for key in key_list:
                result = reduce_fn(key, shuffled[key])
                results.append((key, result))
            return results

        return parallel_for_each(key_chunks, reduce_chunk)
```

```
실행 예:

# Word Count
data = ["hello world", "hello", "world world"]

def map_fn(line):
    return [(word, 1) for word in line.split()]

def reduce_fn(word, counts):
    return sum(counts)

mr = LocalMapReduce(num_workers=4)
result = mr.run(data, map_fn, reduce_fn)
# [("hello", 2), ("world", 3)]
```

**스레드 풀 활용**:

```
구현 구조:

┌────────────────────────────────────────┐
│            Master Thread               │
│  - 작업 분배                           │
│  - 결과 수집                           │
│  - Shuffle 조율                        │
└───────────────┬────────────────────────┘
                │
    ┌───────────┼───────────┐
    │           │           │
    ▼           ▼           ▼
┌───────┐  ┌───────┐  ┌───────┐
│Worker1│  │Worker2│  │Worker3│
│ (Map) │  │ (Map) │  │ (Map) │
└───────┘  └───────┘  └───────┘
    │           │           │
    └───────────┼───────────┘
                │ (Shuffle)
    ┌───────────┼───────────┐
    ▼           ▼           ▼
┌───────┐  ┌───────┐  ┌───────┐
│Worker1│  │Worker2│  │Worker3│
│(Reduce)│  │(Reduce)│  │(Reduce)│
└───────┘  └───────┘  └───────┘
```

---

## 정리

- **MapReduce**: 함수형 패턴의 대규모 병렬화
- **Map**: 입력별 독립 변환, 완전 병렬
- **Shuffle**: 키 기준 재분배, I/O 병목
- **Reduce**: 키별 집계, 결합적이면 병렬 가능
- **Combiner**: 로컬 사전 집계로 네트워크 최적화

---

## 핵심 비교

| 단계 | 입력 | 출력 | 병렬성 |
|------|------|------|--------|
| Map | (k1, v1) | list((k2, v2)) | 완전 병렬 |
| Shuffle | 모든 중간 결과 | 키별 그룹 | 네트워크 병목 |
| Reduce | (k2, list(v2)) | (k3, v3) | 키별 병렬 |

| 최적화 | 방법 | 효과 |
|--------|------|------|
| Combiner | 로컬 사전 집계 | 네트워크 부하↓ |
| 파티셔닝 | 균등 분배 | 부하 균형 |
| 압축 | 중간 결과 압축 | I/O↓ |

---

## 관련 항목

- [Ch 6: Parallel Sum and Prefix Scan](/blog/parallel/art-of-concurrency/chapter06-parallel-sum-prefix) — 리덕션 기초
- [Ch 8: Sorting](/blog/parallel/art-of-concurrency/chapter08-sorting) — MapReduce로 정렬
- [DDIA Ch 10: Batch Processing](/blog/parallel/designing-data-intensive-applications/chapter10-batch-processing) — 분산 MapReduce
- [Tanenbaum Ch 4: Naming](/blog/parallel/distributed-systems-tanenbaum/chapter04-naming) — 분산 키 공간
