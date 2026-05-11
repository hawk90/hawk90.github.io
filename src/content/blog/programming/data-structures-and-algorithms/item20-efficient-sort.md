---
title: "DSA 20: 효율 정렬 — Quick, Merge, Heap"
date: 2026-06-05T11:00:00
description: "O(n log n) 정렬 3종 — 분할 정복(Quick, Merge) + 힙 기반(Heap)."
tags: [Data Structure, Algorithm, Sort, QuickSort, MergeSort, HeapSort]
series: "Data Structures and Algorithms"
seriesOrder: 20
draft: false
---

## 한 줄 요약

> **"O(n log n) 정렬 3종"** — 평균 가장 빠른 quick, 안정·예측 가능한 merge, in-place 보장 heap.

## 어떤 문제를 푸는가

n ≥ 1000 정도부터는 **O(n²) 단순 정렬**로는 못 버팀. O(n log n) 정렬 3종이 표준.

| | 평균 시간 | 최악 시간 | 메모리 | stable |
| --- | --- | --- | --- | --- |
| **Quick** | O(n log n) | O(n²) | O(log n) 스택 | ❌ |
| **Merge** | O(n log n) | O(n log n) | O(n) | ✅ |
| **Heap** | O(n log n) | O(n log n) | O(1) | ❌ |

## 1. Quick Sort

### 직관 (분할 정복)

1. **pivot** 선택 (예: 마지막 원소)
2. pivot 기준으로 **분할** — 왼쪽엔 더 작은 것, 오른쪽엔 더 큰 것
3. 양쪽 부분 배열을 **재귀적으로** 정렬

```
[5, 2, 4, 6, 1, 3]   pivot = 3
→ [2, 1] [3] [5, 4, 6]
   ↓ 재귀     ↓ 재귀
   [1, 2]    [4, 5, 6]
→ [1, 2, 3, 4, 5, 6]
```

### C++ 구현 (Lomuto partition)

```cpp
int partition(std::vector<int>& a, int lo, int hi) {
    int pivot = a[hi];
    int i = lo - 1;
    for (int j = lo; j < hi; ++j) {
        if (a[j] < pivot) {
            ++i;
            std::swap(a[i], a[j]);
        }
    }
    std::swap(a[i + 1], a[hi]);
    return i + 1;
}

void quickSort(std::vector<int>& a, int lo, int hi) {
    if (lo >= hi) return;
    int p = partition(a, lo, hi);
    quickSort(a, lo, p - 1);
    quickSort(a, p + 1, hi);
}

// 사용
quickSort(arr, 0, arr.size() - 1);
```

### C 구현

```c
int partition(int* a, int lo, int hi) {
    int pivot = a[hi];
    int i = lo - 1;
    for (int j = lo; j < hi; ++j) {
        if (a[j] < pivot) {
            ++i;
            int t = a[i]; a[i] = a[j]; a[j] = t;
        }
    }
    int t = a[i + 1]; a[i + 1] = a[hi]; a[hi] = t;
    return i + 1;
}

void quick_sort(int* a, int lo, int hi) {
    if (lo >= hi) return;
    int p = partition(a, lo, hi);
    quick_sort(a, lo, p - 1);
    quick_sort(a, p + 1, hi);
}
```

### 분석

- **평균**: O(n log n) — 매번 거의 균형 분할
- **최악**: O(n²) — 이미 정렬된 입력에 마지막 원소 pivot
- **공간**: O(log n) — 스택 (in-place)

### Quick Sort의 함정과 대처

| 함정 | 해결 |
| --- | --- |
| 정렬된 입력 → O(n²) | **랜덤 pivot** 또는 **median-of-three** |
| 같은 값 다수 → O(n²) | **3-way partition** (Dutch National Flag) |
| 깊은 재귀 → 스택 오버플로 | **반복문 + 명시적 스택**, 또는 작은 부분은 다른 정렬 |

## 2. Merge Sort

### 직관 (분할 정복)

1. 배열을 반으로 **분할**
2. 각각 **재귀적으로** 정렬
3. 두 정렬된 배열을 **병합** (merge)

```
[5, 2, 4, 6, 1, 3]
→ [5, 2, 4] | [6, 1, 3]
→ [5][2,4] | [6][1,3]
→ [2, 4] [1, 3]
→ [2, 4, 5] | [1, 3, 6]
→ merge → [1, 2, 3, 4, 5, 6]
```

### C++ 구현

```cpp
void merge(std::vector<int>& a, int lo, int mid, int hi) {
    std::vector<int> tmp(hi - lo + 1);
    int i = lo, j = mid + 1, k = 0;

    while (i <= mid && j <= hi)
        tmp[k++] = (a[i] <= a[j]) ? a[i++] : a[j++];
    while (i <= mid) tmp[k++] = a[i++];
    while (j <= hi)  tmp[k++] = a[j++];

    for (int idx = 0; idx < k; ++idx)
        a[lo + idx] = tmp[idx];
}

void mergeSort(std::vector<int>& a, int lo, int hi) {
    if (lo >= hi) return;
    int mid = lo + (hi - lo) / 2;
    mergeSort(a, lo, mid);
    mergeSort(a, mid + 1, hi);
    merge(a, lo, mid, hi);
}
```

### C 구현

```c
void merge(int* a, int lo, int mid, int hi) {
    int n = hi - lo + 1;
    int* tmp = malloc(n * sizeof(int));
    int i = lo, j = mid + 1, k = 0;

    while (i <= mid && j <= hi)
        tmp[k++] = (a[i] <= a[j]) ? a[i++] : a[j++];
    while (i <= mid) tmp[k++] = a[i++];
    while (j <= hi)  tmp[k++] = a[j++];

    for (int idx = 0; idx < k; ++idx) a[lo + idx] = tmp[idx];
    free(tmp);
}

void merge_sort(int* a, int lo, int hi) {
    if (lo >= hi) return;
    int mid = lo + (hi - lo) / 2;
    merge_sort(a, lo, mid);
    merge_sort(a, mid + 1, hi);
    merge(a, lo, mid, hi);
}
```

### 분석

- **모든 경우**: O(n log n) — 보장
- **공간**: O(n) — 임시 배열
- **stable**: ✅
- **장점**: 외부 정렬 가능 (item 21), 연결 리스트에도 자연스러움

## 3. Heap Sort

### 직관

1. 배열을 **max-heap으로 변환** (build-heap, O(n))
2. 루트(최댓값)를 마지막 자리와 swap
3. 힙 크기 -1, siftDown
4. (n-1)번 반복

→ in-place + O(n log n) 보장.

### C++ 구현

```cpp
void siftDown(std::vector<int>& a, int i, int n) {
    while (2 * i + 1 < n) {
        int j = 2 * i + 1;
        if (j + 1 < n && a[j] < a[j + 1]) ++j;
        if (a[i] >= a[j]) break;
        std::swap(a[i], a[j]);
        i = j;
    }
}

void heapSort(std::vector<int>& a) {
    int n = a.size();
    // build-heap
    for (int i = n / 2 - 1; i >= 0; --i) siftDown(a, i, n);
    // extract one by one
    for (int i = n - 1; i > 0; --i) {
        std::swap(a[0], a[i]);
        siftDown(a, 0, i);
    }
}
```

### C 구현

```c
void sift_down(int* a, int i, int n) {
    while (2 * i + 1 < n) {
        int j = 2 * i + 1;
        if (j + 1 < n && a[j] < a[j + 1]) ++j;
        if (a[i] >= a[j]) break;
        int t = a[i]; a[i] = a[j]; a[j] = t;
        i = j;
    }
}

void heap_sort(int* a, int n) {
    for (int i = n / 2 - 1; i >= 0; --i) sift_down(a, i, n);
    for (int i = n - 1; i > 0; --i) {
        int t = a[0]; a[0] = a[i]; a[i] = t;
        sift_down(a, 0, i);
    }
}
```

### 분석

- **모든 경우**: O(n log n) — 보장
- **공간**: O(1) — in-place
- **stable**: ❌
- **단점**: 캐시 비친화 (인덱스 이동 멀리)

## 셋 비교 — 어느 걸?

| 상황 | 추천 |
| --- | --- |
| 일반적인 정렬 | **Quick** (평균 가장 빠름) |
| 안정성 필요 | **Merge** |
| 메모리 빡빡 | **Heap** |
| 외부 정렬 | **Merge** |
| 큰 객체 (swap 비쌈) | **Merge** (swap 적음) |
| 거의 정렬됨 | Quick + insertion 하이브리드 |
| 최악 보장 | **Merge** 또는 **Heap** |

## 표준 라이브러리

```cpp
#include <algorithm>
std::sort(v.begin(), v.end());        // 보통 introsort: quick + heap + insertion
std::stable_sort(v.begin(), v.end()); // merge sort 변형
```

`std::sort`는 **introsort** — quick sort + 재귀 깊이 초과 시 heap sort + 작은 부분 insertion sort.

## 정렬의 하한 — Ω(n log n)

**비교 기반** 정렬은 모두 Ω(n log n) — 결정 트리 분석.

→ 이를 깨려면 비교 외 정렬 ([item 21](/blog/programming/data-structures-and-algorithms/item21-non-comparison-external-sort)).

## 트레이드오프 — 한눈에

| 차원 | Quick | Merge | Heap |
| --- | --- | --- | --- |
| 평균 | ✅ 가장 빠름 | ✅ | ✅ |
| 최악 | ❌ O(n²) | ✅ | ✅ |
| 메모리 | ✅ O(log n) | ❌ O(n) | ✅ O(1) |
| stable | ❌ | ✅ | ❌ |
| 캐시 친화 | ✅ | ✅ | ❌ |
| 외부 정렬 | ❌ | ✅ | ❌ |

## 실제 사례

- **`std::sort`** — introsort
- **`std::stable_sort`** — merge sort 변형 (Timsort 도 popular)
- **Java `Arrays.sort()`** — primitive: dual-pivot quick / object: Timsort
- **Python `sorted()`, `list.sort()`** — Timsort
- **DB 정렬** — external merge sort

## 다음

- [비교 외 정렬 + 외부 정렬](/blog/programming/data-structures-and-algorithms/item21-non-comparison-external-sort)
