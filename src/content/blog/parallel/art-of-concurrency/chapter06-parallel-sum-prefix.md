---
title: "Ch 6: Parallel Sum and Prefix Scan"
date: 2025-05-20T06:00:00
description: "병렬 합과 프리픽스 스캔 — 기본 병렬 패턴"
series: "The Art of Concurrency"
seriesOrder: 6
tags: [concurrency, parallel-sum, prefix-scan, reduction, pattern]
draft: true
type: book-review
bookTitle: "The Art of Concurrency"
bookAuthor: "Clay Breshears"
---

## 병렬 합 (Parallel Sum)

**가장 기본적인 병렬 패턴**: 리덕션 (Reduction).

```
문제: N개 요소의 합 계산

순차: O(N) 시간
sum = 0;
for (i = 0; i < N; i++)
    sum += A[i];

병렬: O(N/P + log P) 시간 (P 프로세서)
```

---

### 순차 버전

```
입력: [3, 1, 4, 1, 5, 9, 2, 6]

sum = 0
sum = 0 + 3 = 3
sum = 3 + 1 = 4
sum = 4 + 4 = 8
sum = 8 + 1 = 9
...
sum = 31

시간: O(N)
```

---

### 분할 정복 접근

```
아이디어:
배열을 반으로 나눠 각각 합을 구하고 더함

[3, 1, 4, 1, 5, 9, 2, 6]
        ↓ 분할
[3, 1, 4, 1]    [5, 9, 2, 6]
    ↓               ↓
   9    +          22
        ↓
       31
```

```
의사코드:

parallel_sum(A, lo, hi):
    if (hi - lo <= THRESHOLD):
        return sequential_sum(A, lo, hi)

    mid = (lo + hi) / 2

    // 병렬 재귀
    left_sum = spawn parallel_sum(A, lo, mid)
    right_sum = parallel_sum(A, mid, hi)
    sync

    return left_sum + right_sum
```

---

### 리덕션 트리

```
8개 요소, 4 스레드:

단계 0 (로컬 합):
T0: [3, 1] → 4
T1: [4, 1] → 5
T2: [5, 9] → 14
T3: [2, 6] → 8

단계 1 (페어 리덕션):
T0: 4 + 5 = 9
T2: 14 + 8 = 22

단계 2 (최종):
T0: 9 + 22 = 31

트리 시각화:
           31
          ╱  ╲
        9     22
       ╱ ╲   ╱  ╲
      4   5  14   8
     ╱╲  ╱╲  ╱╲  ╱╲
    3 1 4 1 5 9 2 6
```

**시간 복잡도**:

```
P 프로세서, N 요소:
- 로컬 합: O(N/P)
- 트리 리덕션: O(log P)
- 총: O(N/P + log P)

이상적 속도향상: P / (1 + P log P / N)
N >> P일 때 거의 선형
```

---

## 프리픽스 스캔 (Prefix Scan)

**누적 합** (Cumulative Sum) — 리덕션의 확장.

### 정의와 용도

```
프리픽스 합 (Prefix Sum):
입력:  [a₀, a₁, a₂, a₃, ...]
출력:  [a₀, a₀+a₁, a₀+a₁+a₂, ...]

예:
입력:  [3, 1, 4, 1, 5, 9]
출력:  [3, 4, 8, 9, 14, 23]
```

**두 종류**:

| 종류 | 정의 | 예 (입력: [3,1,4,1]) |
|------|------|---------------------|
| **Inclusive** | out[i] = Σ(a[0..i]) | [3, 4, 8, 9] |
| **Exclusive** | out[i] = Σ(a[0..i-1]) | [0, 3, 4, 8] |

**용도**:

```
- 누적 분포
- 병렬 필터링 (compaction)
- 기수 정렬
- 다항식 평가
- 스트림 압축
- 히스토그램 계산
```

---

### 순차 버전

```
inclusive_scan(A, N):
    out[0] = A[0]
    for (i = 1; i < N; i++)
        out[i] = out[i-1] + A[i]
    return out

시간: O(N)

문제: 각 단계가 이전 결과에 의존
→ 단순히 병렬화 불가
```

---

### 병렬 프리픽스 알고리즘

**Hillis-Steele 알고리즘** (비효율적이지만 이해하기 쉬움):

```
아이디어: 각 단계에서 2^d 거리의 요소와 더함

입력: [3, 1, 4, 1, 5, 9, 2, 6]

d=0: 2^0=1 거리로 더함
[3, 1+3, 4+1, 1+4, 5+1, 9+5, 2+9, 6+2]
[3, 4,   5,   5,   6,  14,  11,   8]

d=1: 2^1=2 거리로 더함
[3, 4, 5+3, 5+4, 6+5, 14+5, 11+6, 8+14]
[3, 4, 8,   9,  11,  19,   17,   22]

d=2: 2^2=4 거리로 더함
[3, 4, 8, 9, 11+3, 19+4, 17+8, 22+9]
[3, 4, 8, 9,  14,  23,   25,   31]

결과 (inclusive): [3, 4, 8, 9, 14, 23, 25, 31]
```

```
시각화:

단계 d=0:
[3] [1] [4] [1] [5] [9] [2] [6]
 │   │╲  │╲  │╲  │╲  │╲  │╲  │
 │   │ ╲ │ ╲ │ ╲ │ ╲ │ ╲ │ ╲ │
 ▼   ▼  ▼▼  ▼▼  ▼▼  ▼▼  ▼▼  ▼▼
[3] [4] [5] [5] [6][14][11] [8]

단계 d=1:
  ╲   ╲
   ╲   ╲  ...
[3] [4] [8] [9] [11][19][17][22]

단계 d=2:
      ╲       ╲
       ╲       ╲  ...
[3] [4] [8] [9][14][23][25][31]
```

**복잡도**:

```
시간: O(log N) 단계 × O(N) 작업/단계 = O(N log N)
→ 순차보다 더 많은 총 작업!
→ 하지만 각 단계는 완전 병렬
```

---

### 작업 효율적 스캔

**Blelloch 알고리즘**: O(N) 작업, O(log N) 단계.

```
두 단계:
1. Up-sweep (Reduce): 트리 위로 부분합 계산
2. Down-sweep: 트리 아래로 프리픽스 전파
```

```
Up-sweep (입력: [3, 1, 4, 1, 5, 9, 2, 6]):

d=0: 인접 쌍 합
[3, 4, 4, 5, 5, 14, 2, 8]
     ↑     ↑      ↑    ↑

d=1: 거리 2 합
[3, 4, 4, 9, 5, 14, 2, 22]
           ↑            ↑

d=2: 거리 4 합
[3, 4, 4, 9, 5, 14, 2, 31]
                       ↑
트리:
                  31
               ╱     ╲
             9        22
           ╱  ╲     ╱   ╲
          4    5   14    8
```

```
Down-sweep:

루트에 0 설정: [3, 4, 4, 9, 5, 14, 2, 0]

d=2: 왼쪽은 부모, 오른쪽은 부모+왼쪽형제
[3, 4, 4, 0, 5, 14, 2, 9]
           ↑            ↑

d=1:
[3, 4, 4, 0, 5, 9, 2, 9]
              ↑     ↑

d=0:
[0, 3, 4, 8, 9, 14, 23, 25]
 ↑  ↑  ↑  ↑  ↑   ↑   ↑   ↑

결과 (exclusive): [0, 3, 4, 8, 9, 14, 23, 25]
```

**복잡도**:

```
Up-sweep: O(N) 작업
Down-sweep: O(N) 작업
총 작업: O(N)
단계: O(log N)

→ 작업 효율적! 순차와 같은 양의 총 작업
```

---

## 응용

### 병렬 필터링 (Compaction)

```
문제: 조건을 만족하는 요소만 추출

순차:
out_idx = 0
for (i = 0; i < N; i++)
    if (predicate(A[i]))
        out[out_idx++] = A[i]

병렬:
1. 플래그 배열 생성: flag[i] = predicate(A[i]) ? 1 : 0
2. 프리픽스 스캔: indices = exclusive_scan(flags)
3. 병렬 scatter: if flag[i] then out[indices[i]] = A[i]
```

```
예: 짝수만 추출

입력:    [3, 8, 2, 5, 4, 7, 6, 1]
플래그:  [0, 1, 1, 0, 1, 0, 1, 0]
스캔:    [0, 0, 1, 2, 2, 3, 3, 4]

scatter:
- A[1]=8 → out[0]
- A[2]=2 → out[1]
- A[4]=4 → out[2]
- A[6]=6 → out[3]

출력: [8, 2, 4, 6]
```

### 기수 정렬에서의 사용

```
기수 정렬의 각 패스:
1. 각 비트별로 0과 1 개수 세기
2. 프리픽스 스캔으로 목적지 계산
3. 병렬 scatter
```

---

## 정리

- **병렬 합**: 리덕션 트리, O(N/P + log P)
- **프리픽스 스캔**: 누적 연산, 많은 알고리즘의 기초
- **Hillis-Steele**: 단순, O(N log N) 작업
- **Blelloch**: 작업 효율적, O(N) 작업
- **응용**: 필터링, 정렬, 히스토그램

---

## 핵심 비교

| 알고리즘 | 총 작업 | 단계 | 특징 |
|----------|--------|------|------|
| 순차 | O(N) | O(N) | 병렬화 불가 |
| Hillis-Steele | O(N log N) | O(log N) | 작업 비효율 |
| Blelloch | O(N) | O(log N) | 작업 효율 |

| 패턴 | 입력 | 출력 | 연산 |
|------|------|------|------|
| Reduction | [a₀..aₙ] | 단일 값 | Σaᵢ |
| Inclusive Scan | [a₀..aₙ] | [s₀..sₙ] | sᵢ = Σa[0..i] |
| Exclusive Scan | [a₀..aₙ] | [s₀..sₙ] | sᵢ = Σa[0..i-1] |

---

## 관련 항목

- [Ch 5: Threading Libraries](/blog/parallel/art-of-concurrency/chapter05-threading-libraries) — 동기화 기초
- [Ch 7: MapReduce](/blog/parallel/art-of-concurrency/chapter07-mapreduce) — 리덕션 일반화
- [Ch 8: Sorting](/blog/parallel/art-of-concurrency/chapter08-sorting) — 정렬에서 스캔 사용
- [DDIA Ch 10: Batch Processing](/blog/parallel/designing-data-intensive-applications/chapter10-batch-processing) — MapReduce 상세
