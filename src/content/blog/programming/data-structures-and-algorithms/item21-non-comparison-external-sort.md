---
title: "DSA 21: 비교 외 정렬 + 외부 정렬"
date: 2026-03-05T12:00:00
description: "Counting / Radix / Bucket 정렬과 디스크 기반 외부 정렬."
tags: [Data Structure, Algorithm, Sort, Radix, External Sort]
series: "Data Structures and Algorithms"
seriesOrder: 21
draft: false
---

## 한 줄 요약

> **"비교 안 하면 O(n) 가능"** — 키의 분포·범위를 알면 Ω(n log n)을 깬다. 메모리 못 들면 외부 정렬.

## Ω(n log n) 하한

비교 기반 정렬은 모두 Ω(n log n) — 어떤 알고리즘도 평균적으로 더 빠를 수 없음.

증명: 비교 기반 정렬 = 결정 트리. n!개의 가능한 순열을 구분하려면 트리 깊이 ≥ log(n!) ≈ n log n.

→ **비교 안 하면** 깰 수 있음.

## 1. Counting Sort

### 직관

키가 **작은 정수 범위 [0, k)** 에 있을 때 — 각 값의 **개수**를 세서 위치 직접 결정.

```
입력: [4, 2, 2, 8, 3, 3, 1]   (범위 0~9)

1단계 — 카운트:
count: [0, 1, 2, 2, 1, 0, 0, 0, 1, 0]
        0  1  2  3  4  5  6  7  8  9

2단계 — 누적 합:
cum:   [0, 1, 3, 5, 6, 6, 6, 6, 7, 7]

3단계 — 결과 배치 (역순 = stable):
[1, 2, 2, 3, 3, 4, 8]
```

### C++ 구현

```cpp
void countingSort(std::vector<int>& a, int k) {
    int n = a.size();
    std::vector<int> count(k, 0);
    for (int x : a) ++count[x];

    for (int i = 1; i < k; ++i) count[i] += count[i - 1];   // 누적 합

    std::vector<int> output(n);
    for (int i = n - 1; i >= 0; --i)         // 역순 = stable
        output[--count[a[i]]] = a[i];

    a = output;
}
```

### 분석

- **시간**: O(n + k)
- **공간**: O(n + k)
- **stable**: ✅
- **조건**: 키가 정수 + 범위 작음 (k = O(n))

큰 k는 메모리 폭발 → Radix sort.

## 2. Radix Sort

### 직관

여러 자릿수의 키를 **자릿수별로** counting sort 반복 — 가장 낮은 자리부터 (LSD).

```
입력: [170, 45, 75, 90, 802, 24, 2, 66]

1의 자리:    [170, 90, 802, 2, 24, 45, 75, 66]
10의 자리:   [802, 2, 24, 45, 66, 170, 75, 90]
100의 자리:  [2, 24, 45, 66, 75, 90, 170, 802]
```

매 단계 stable counting sort 사용 → 최종 정렬됨.

### C++ 구현

```cpp
void countingSortByDigit(std::vector<int>& a, int exp) {
    int n = a.size();
    std::vector<int> output(n);
    int count[10] = {0};

    for (int x : a) ++count[(x / exp) % 10];
    for (int i = 1; i < 10; ++i) count[i] += count[i - 1];
    for (int i = n - 1; i >= 0; --i) {
        int d = (a[i] / exp) % 10;
        output[--count[d]] = a[i];
    }
    a = output;
}

void radixSort(std::vector<int>& a) {
    int maxVal = *std::max_element(a.begin(), a.end());
    for (int exp = 1; maxVal / exp > 0; exp *= 10)
        countingSortByDigit(a, exp);
}
```

### 분석

- **시간**: O(d × (n + k)) — d = 자릿수, k = 진법(보통 10 또는 256)
- **공간**: O(n + k)
- **stable**: ✅
- **조건**: 키가 정수·문자열·고정 길이

수십억 개의 32-bit 정수: O(4 × n) = O(n). Quick sort보다 빠를 수도.

## 3. Bucket Sort

### 직관

[0, 1) 같은 **균등 분포** 입력을 가정 — 입력을 **버킷**에 배분 → 각 버킷 내부 정렬 → 연결.

```
입력: [0.78, 0.17, 0.39, 0.26, 0.72, 0.94, 0.21, 0.12]
버킷 (10개):
0.0~0.1: []
0.1~0.2: [0.17, 0.12]
0.2~0.3: [0.26, 0.21]
0.3~0.4: [0.39]
0.7~0.8: [0.78, 0.72]
0.9~1.0: [0.94]

각 버킷 정렬 + 연결 → [0.12, 0.17, 0.21, 0.26, 0.39, 0.72, 0.78, 0.94]
```

### 분석

- **평균**: O(n + k) — 균등 분포 가정
- **최악**: O(n²) — 모두 한 버킷
- **공간**: O(n + k)

분포 알고 있을 때 강력. 모르면 위험.

## C 구현 — Counting Sort

```c
void counting_sort(int* a, int n, int k) {
    int* count = calloc(k, sizeof(int));
    for (int i = 0; i < n; ++i) ++count[a[i]];
    for (int i = 1; i < k; ++i) count[i] += count[i - 1];

    int* output = malloc(n * sizeof(int));
    for (int i = n - 1; i >= 0; --i) output[--count[a[i]]] = a[i];

    for (int i = 0; i < n; ++i) a[i] = output[i];
    free(count); free(output);
}
```

---

## 외부 정렬 (External Sort)

### 어떤 문제

데이터가 **메모리에 안 들어감** (수백 GB ~ TB). 디스크에 두고 정렬해야.

→ 한 번에 메모리에 못 올림 → **여러 번 디스크 ↔ 메모리 이동 + 병합**.

### Two-way Merge Sort (외부)

```
1. Phase A — 메모리에 들어가는 청크씩 읽어 정렬, 디스크에 sorted run 작성
2. Phase B — 두 run을 병합 → 한 run, 반복
```

```
[Disk] 100 GB 파일
  → 10 GB씩 읽어 quick sort → 10개의 sorted run

  Pass 1: 5쌍 병합 → 5개 run (각 20 GB)
  Pass 2: 2쌍 + 1개 → 3개 run
  Pass 3: 1쌍 + 1개 → 2개
  Pass 4: 병합 → 1개

→ ⌈log₂(10)⌉ = 4 pass
```

### k-way Merge로 pass 수 ↓

매 pass에서 k개의 run을 동시에 병합 (item 14의 토너먼트 트리).

`log_k(n/M)` pass — M = 메모리 크기.

### Replacement Selection — initial run 길이 ↑

힙으로 구현, 평균 2M 길이의 run 생성 → 초기 run 수 절반.

## 트레이드오프 — 한눈에

| 차원 | 비교 외 정렬 | 외부 정렬 |
| --- | --- | --- |
| O(n) 가능 | ✅ | ❌ |
| 키 제약 | ⚠️ 정수·문자열 | 없음 |
| 메모리 | O(n + k) | 부족 — 디스크 |
| I/O 비용 | — | 핵심 — pass 수 줄여야 |

## 실제 사례

- **Radix Sort** — 큰 정수 배열 (DB 인덱스, 통계)
- **Counting Sort** — bucket sort + radix sort 내부
- **외부 정렬** — DB의 ORDER BY (작업 메모리 초과 시), Hadoop sort phase, RDBMS의 sort merge join

## 다음

- [정적 해싱 (체이닝, 개방 주소법)](/blog/programming/data-structures-and-algorithms/item22-static-hashing)
