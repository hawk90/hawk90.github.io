---
title: "Ch 8: Sorting"
date: 2025-05-20T08:00:00
description: "병렬 정렬 알고리즘 — 퀵소트, 머지소트, 비트닉 소트"
series: "The Art of Concurrency"
seriesOrder: 8
tags: [concurrency, sorting, parallel-sort, quicksort, mergesort, bitonic]
draft: true
type: book-review
bookTitle: "The Art of Concurrency"
bookAuthor: "Clay Breshears"
---

## 정렬의 병렬화

**정렬은 가장 잘 연구된 알고리즘 문제**. 병렬화 기회도 다양.

```
순차 정렬의 한계:

비교 기반 정렬의 하한: Ω(N log N)

N = 10억 원소:
- 순차: ~30억 비교 연산
- 8코어 병렬: 이론적 ~3.75억 비교/코어
```

**병렬화 접근법**:

| 접근 | 아이디어 | 대표 알고리즘 |
|------|----------|---------------|
| 분할 정복 | 분할 후 병렬 재귀 | 퀵소트, 머지소트 |
| 비교 네트워크 | 고정 비교 패턴 | 비트닉, 오드-이븐 |
| 샘플 기반 | 샘플로 분할점 결정 | 샘플소트 |

---

## 병렬 퀵소트

**분할 정복의 대표 알고리즘**을 병렬화.

### 분할 병렬화

```
순차 퀵소트:
1. 피벗 선택
2. 분할: 피벗보다 작은/큰 원소 분리
3. 재귀적으로 양쪽 정렬

분할 단계 분석:
- 각 원소를 피벗과 비교 → 독립적
- 하지만 결과 배치는 의존성 있음
```

```
순차 분할 (Lomuto):

partition(A, lo, hi):
    pivot = A[hi]
    i = lo
    for j = lo to hi-1:
        if A[j] < pivot:
            swap(A[i], A[j])
            i++
    swap(A[i], A[hi])
    return i

문제: swap이 순차적 → 병렬화 어려움
```

**병렬 분할 기법**:

```
1. 병렬 프리픽스 분할:

단계 1: 각 원소 플래그 (피벗보다 작은가?)
[5, 2, 8, 1, 9, 3]  피벗=4
[0, 1, 0, 1, 0, 1]  flags (< pivot)

단계 2: 프리픽스 스캔
less_count = scan(flags)    = [0, 0, 1, 1, 2, 2]
greater_count = scan(!flags) = [0, 1, 1, 2, 2, 3]

단계 3: 병렬 scatter
if flags[i]: out[less_count[i]] = A[i]
else: out[num_less + greater_count[i]] = A[i]

결과: [2, 1, 3, 5, 8, 9]
```

```
복잡도:
- 순차 분할: O(N)
- 병렬 분할: O(N/P + log N)
  - scan: O(N/P + log P)
  - scatter: O(N/P)
```

### 재귀 병렬화

**더 쉬운 접근**: 분할 후 양쪽을 병렬로 정렬.

```
parallel_quicksort(A, lo, hi):
    if hi - lo < THRESHOLD:
        sequential_sort(A, lo, hi)
        return

    mid = partition(A, lo, hi)

    // 병렬 재귀
    spawn parallel_quicksort(A, lo, mid-1)
    parallel_quicksort(A, mid+1, hi)
    sync
```

```
분석:

재귀 트리:
              [전체]
             ╱     ╲
        [좌측]     [우측]
        ╱   ╲      ╱   ╲
      ...   ...  ...   ...

병렬성:
- 레벨 0: 1 작업 (분할)
- 레벨 1: 2 작업 (병렬)
- 레벨 2: 4 작업 (병렬)
- ...
- 레벨 k: 2^k 작업

문제: 불균형 분할 시 병렬성 저하
- 최악: 1 : N-1 분할 → 선형 의존성
- 최선: N/2 : N/2 분할 → 완전 이진 트리
```

**개선: 샘플 기반 분할**:

```
문제: 단일 피벗 → 불균형 위험

해결: P개 피벗으로 P+1개 버킷 생성

1. 랜덤 샘플 추출
2. 샘플 정렬 후 P-1개 피벗 선택
3. 원소들을 P개 버킷에 분배 (병렬)
4. 각 버킷 독립 정렬 (병렬)

예 (4 스레드):
샘플에서 피벗 3개 선택: [25, 50, 75]
버킷: [0-25), [25-50), [50-75), [75-100]
각 스레드가 버킷 하나 정렬
```

---

## 병렬 머지소트

**안정적인 분할**과 **병합의 병렬화**.

### 분할 정복

```
순차 머지소트:
1. 배열을 반으로 분할 (재귀)
2. 각 반을 정렬 (재귀)
3. 정렬된 두 반을 병합

장점: 항상 균등 분할 → 예측 가능한 병렬성
```

```
parallel_mergesort(A, lo, hi):
    if hi - lo < THRESHOLD:
        sequential_sort(A, lo, hi)
        return

    mid = (lo + hi) / 2

    // 병렬 재귀 - 항상 균등 분할!
    spawn parallel_mergesort(A, lo, mid)
    parallel_mergesort(A, mid+1, hi)
    sync

    merge(A, lo, mid, hi)
```

```
재귀 트리 (항상 균형):

              [0..7]
             ╱     ╲
        [0..3]     [4..7]
        ╱   ╲      ╱   ╲
     [0,1] [2,3] [4,5] [6,7]

깊이 log N
각 레벨에서 병렬 작업 증가
```

### 병렬 병합

**병합 단계도 병렬화** 가능.

```
순차 병합:

merge(A, B, out):
    i = j = k = 0
    while i < len(A) and j < len(B):
        if A[i] <= B[j]:
            out[k++] = A[i++]
        else:
            out[k++] = B[j++]
    // 나머지 복사
    시간: O(N)

문제: 비교 → 선택 → 쓰기가 순차적
```

**병렬 병합 기법**:

```
아이디어: 분할 정복으로 병합

parallel_merge(A, B, out):
    if len(A) + len(B) < THRESHOLD:
        sequential_merge(A, B, out)
        return

    // A의 중간 원소로 B 분할
    mid_a = len(A) / 2
    mid_b = binary_search(B, A[mid_a])

    // A[mid_a]가 out에서 갈 위치
    out_pos = mid_a + mid_b

    // 병렬 재귀
    spawn parallel_merge(A[0..mid_a], B[0..mid_b], out[0..out_pos])
    parallel_merge(A[mid_a..], B[mid_b..], out[out_pos..])
    sync
```

```
시각화:

A: [1, 3, 5, 7, 9]
B: [2, 4, 6, 8, 10]

A의 중간: 5
B에서 5의 위치: 인덱스 2 (4와 6 사이)

분할:
좌측: merge([1,3], [2,4]) → out[0..4]
우측: merge([5,7,9], [6,8,10]) → out[4..10]

재귀적으로 병렬 실행
```

```
복잡도:
- 순차 병합: O(N)
- 병렬 병합: O(N/P + log²N)
  - 깊이 O(log N), 각 레벨 O(log N) 검색
```

---

## 비트닉 소트

**고정된 비교 패턴**으로 데이터 독립적 정렬.

### 비트닉 시퀀스

```
정의:
비트닉 시퀀스 = 증가 후 감소 (또는 그 순환)

예:
[1, 4, 7, 6, 3, 2] ✓ 비트닉 (1→7 증가, 7→2 감소)
[5, 3, 1, 2, 6, 8] ✓ 비트닉 (순환 시 8→3 감소, 3→8 증가)
[1, 3, 2, 4, 5]    ✗ 비트닉 아님
```

**비트닉 머지**:

```
핵심 관찰:
비트닉 시퀀스를 반으로 나눠 비교-교환하면
두 개의 작은 비트닉 시퀀스가 됨

비트닉 머지:
[8, 7, 6, 5 | 1, 2, 3, 4]  비트닉 시퀀스

비교: (8,1), (7,2), (6,3), (5,4)
교환 후: [1, 2, 3, 4 | 8, 7, 6, 5]

좌측 모두 ≤ 우측
각 절반도 비트닉!

재귀적으로:
[1,2,3,4] → [1,2] [3,4] → [1] [2] [3] [4]
[8,7,6,5] → [6,5] [8,7] → [5] [6] [7] [8]
```

### 비교 네트워크

```
비트닉 소트 네트워크 (8개 원소):

입력: a b c d e f g h

단계 1: 쌍별 정렬 (4개 비교기)
(a,b) (c,d) (e,f) (g,h)

단계 2: 4원소 비트닉 머지 (4개 비교기)
(a,c) (b,d)  정렬
(e,g) (f,h)  역순 정렬
→ 비트닉 시퀀스 형성

단계 3-4: 비트닉 머지 (6개 비교기)
...

총 비교: O(N log²N)
```

```
비트닉 소트 네트워크 시각화:

     ┌──●──┐     ┌──●──┐     ┌──●──┐
0 ───┤     ├──●──┤     ├──●──┤     ├─── 0
     └──●──┘  │  └──●──┘  │  └──●──┘
              │           │
     ┌──●──┐  │  ┌──●──┐  │  ┌──●──┐
1 ───┤     ├──┼──┤     ├──●──┤     ├─── 1
     └──●──┘  │  └──●──┘     └──●──┘
              │
     ┌──●──┐  │  ┌──●──┐     ┌──●──┐
2 ───┤     ├──┼──┤     ├──●──┤     ├─── 2
     └──●──┘  │  └──●──┘  │  └──●──┘
              │           │
     ┌──●──┐  │  ┌──●──┐  │  ┌──●──┐
3 ───┤     ├──●──┤     ├──●──┤     ├─── 3
     └──●──┘     └──●──┘     └──●──┘

●──● = 비교-조건부 교환 (compare-exchange)
```

**구현**:

```
bitonic_sort(A, lo, cnt, dir):
    if cnt > 1:
        k = cnt / 2

        // 전반부 오름차순, 후반부 내림차순
        spawn bitonic_sort(A, lo, k, ASCENDING)
        bitonic_sort(A, lo+k, k, DESCENDING)
        sync

        // 비트닉 머지
        bitonic_merge(A, lo, cnt, dir)

bitonic_merge(A, lo, cnt, dir):
    if cnt > 1:
        k = cnt / 2

        // 병렬 비교-교환
        parallel_for i = lo to lo+k:
            compare_exchange(A, i, i+k, dir)

        // 재귀 머지
        spawn bitonic_merge(A, lo, k, dir)
        bitonic_merge(A, lo+k, k, dir)
        sync
```

**특징**:

| 특징 | 설명 |
|------|------|
| 데이터 독립적 | 비교 패턴이 입력과 무관 |
| 병렬 친화적 | 같은 단계의 비교는 독립적 |
| 하드웨어 적합 | GPU, SIMD에 적합 |
| 비교 횟수 | O(N log²N) — 최적 아님 |

---

## 성능 비교

**알고리즘별 특성**:

| 알고리즘 | 총 작업 | 병렬 단계 | 안정성 | 특징 |
|----------|---------|-----------|--------|------|
| 병렬 퀵소트 | O(N log N) | O(log N) | 불안정 | 캐시 친화적 |
| 병렬 머지소트 | O(N log N) | O(log N) | 안정 | 균형 보장 |
| 비트닉 소트 | O(N log²N) | O(log²N) | 불안정 | 데이터 독립 |

```
속도 향상 분석 (P 프로세서):

병렬 퀵소트:
- 이상적: O(N log N / P)
- 분할 병목: O(N/P + log N)
- 불균형 시: 성능 저하

병렬 머지소트:
- 분할: 완전 병렬
- 병합 병목: O(N/P + log²N)
- 예측 가능한 성능

비트닉 소트:
- 단계: O(log²N)
- 각 단계 O(N/P)
- 총: O(N log²N / P)
```

**실제 성능 고려 사항**:

```
캐시 효과:
- 퀵소트: in-place, 좋은 캐시 지역성
- 머지소트: 추가 메모리, 캐시 미스 가능
- 비트닉: 점프 패턴, 캐시 비친화적 가능

부하 균형:
- 퀵소트: 피벗 선택에 의존
- 머지소트: 항상 균등
- 비트닉: 완전 균등

메모리:
- 퀵소트: O(log N) 스택
- 머지소트: O(N) 추가 공간
- 비트닉: O(1) 추가 (in-place 가능)
```

---

## 정리

- **병렬 퀵소트**: 재귀 병렬화 쉬움, 불균형 위험
- **병렬 머지소트**: 균형 보장, 병합도 병렬화 가능
- **비트닉 소트**: 데이터 독립적, GPU/SIMD 적합
- **프리픽스 스캔**: 분할 단계 병렬화의 핵심

---

## 핵심 비교

| 기준 | 퀵소트 | 머지소트 | 비트닉 |
|------|--------|----------|--------|
| 분할 | 피벗 의존 | 항상 균등 | 고정 패턴 |
| 작업량 | O(N log N) | O(N log N) | O(N log²N) |
| 깊이 | O(log N) 평균 | O(log N) | O(log²N) |
| 추가 메모리 | O(log N) | O(N) | O(1) |
| 안정성 | 불안정 | 안정 | 불안정 |
| 적합한 환경 | CPU, 캐시 | 범용 | GPU, SIMD |

---

## 관련 항목

- [Ch 6: Parallel Sum and Prefix Scan](/blog/parallel/art-of-concurrency/chapter06-parallel-sum-prefix) — 분할 병렬화 기초
- [Ch 7: MapReduce](/blog/parallel/art-of-concurrency/chapter07-mapreduce) — 분산 정렬
- [Ch 9: Searching](/blog/parallel/art-of-concurrency/chapter09-searching) — 정렬 후 검색
- [Ch 2: Concurrent or Not Concurrent?](/blog/parallel/art-of-concurrency/chapter02-concurrent-or-not) — 분할 정복 분해
