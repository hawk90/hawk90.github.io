---
title: "DSA 19: 단순 정렬 — Bubble, Selection, Insertion"
date: 2026-06-05T10:00:00
description: "O(n²) 정렬 3종 — 작은 입력엔 충분, 큰 입력엔 부적절."
tags: [Data Structure, Algorithm, Sort]
series: "Data Structures and Algorithms"
seriesOrder: 19
draft: true
---

## 한 줄 요약

> **"O(n²) 정렬 — 작은 데이터엔 단순함이 미덕"** — 큰 데이터엔 quick/merge로.

## 어떤 문제를 푸는가

배열을 정렬 — 가장 기본적인 알고리즘.

세 단순 정렬은 모두 O(n²) — 큰 데이터엔 부적절. 그러나:
- **n ≤ 50** 정도면 quick sort보다 빠를 수도 (오버헤드 적음)
- **거의 정렬된 입력**엔 insertion sort가 O(n)
- **이해 + 구현** 단순 → 학습 가치

## Bubble Sort

### 직관

인접한 두 원소 비교 → 큰 게 뒤로. 한 번 돌면 가장 큰 게 끝으로 (bubble up).

```
[5, 2, 4, 1, 3]
 5↔2 → [2, 5, 4, 1, 3]
    5↔4 → [2, 4, 5, 1, 3]
       5↔1 → [2, 4, 1, 5, 3]
          5↔3 → [2, 4, 1, 3, 5]   ← 5 확정
... (n-1번 반복)
```

### C++ 구현

```cpp
void bubbleSort(std::vector<int>& a) {
    int n = a.size();
    for (int i = 0; i < n - 1; ++i) {
        bool swapped = false;
        for (int j = 0; j < n - 1 - i; ++j) {
            if (a[j] > a[j + 1]) {
                std::swap(a[j], a[j + 1]);
                swapped = true;
            }
        }
        if (!swapped) break;   // 이미 정렬됨 — 조기 종료
    }
}
```

### C 구현

```c
void bubble_sort(int* a, int n) {
    for (int i = 0; i < n - 1; ++i) {
        int swapped = 0;
        for (int j = 0; j < n - 1 - i; ++j) {
            if (a[j] > a[j + 1]) {
                int t = a[j]; a[j] = a[j + 1]; a[j + 1] = t;
                swapped = 1;
            }
        }
        if (!swapped) break;
    }
}
```

### 분석

| | 시간 |
| --- | --- |
| 최선 (정렬됨) | O(n) — 한 번 돌고 종료 |
| 평균/최악 | O(n²) |

공간: O(1) — in-place.
**stable**: ✅ (같은 값 순서 유지).

## Selection Sort

### 직관

매 회 **최솟값을 찾아 맨 앞과 swap**.

```
[5, 2, 4, 1, 3]
min = 1 → swap [1, 2, 4, 5, 3]
       min = 2 (이미 자리) → [1, 2, 4, 5, 3]
              min = 3 → swap [1, 2, 3, 5, 4]
                     min = 4 → swap [1, 2, 3, 4, 5]
```

### C++ 구현

```cpp
void selectionSort(std::vector<int>& a) {
    int n = a.size();
    for (int i = 0; i < n - 1; ++i) {
        int minIdx = i;
        for (int j = i + 1; j < n; ++j)
            if (a[j] < a[minIdx]) minIdx = j;
        if (minIdx != i) std::swap(a[i], a[minIdx]);
    }
}
```

### C 구현

```c
void selection_sort(int* a, int n) {
    for (int i = 0; i < n - 1; ++i) {
        int min_idx = i;
        for (int j = i + 1; j < n; ++j)
            if (a[j] < a[min_idx]) min_idx = j;
        if (min_idx != i) {
            int t = a[i]; a[i] = a[min_idx]; a[min_idx] = t;
        }
    }
}
```

### 분석

| | 시간 |
| --- | --- |
| 모든 경우 | O(n²) — swap 횟수만 다름 |

공간: O(1).
**stable**: ❌ (장거리 swap이 같은 값의 순서를 깨뜨릴 수 있음).
**swap 횟수**: O(n) — 정렬 중 최소.

→ swap 비용이 큰 경우(큰 객체) 의외의 이점.

## Insertion Sort

### 직관

이미 정렬된 부분에 다음 원소를 **올바른 위치에 삽입**. 카드 게임에서 카드 정리하듯.

```
[5, 2, 4, 1, 3]
[5] | 2, 4, 1, 3        ← 정렬됨 | 미정렬
2를 삽입 → [2, 5] | 4, 1, 3
4를 삽입 → [2, 4, 5] | 1, 3
1을 삽입 → [1, 2, 4, 5] | 3
3을 삽입 → [1, 2, 3, 4, 5]
```

### C++ 구현

```cpp
void insertionSort(std::vector<int>& a) {
    int n = a.size();
    for (int i = 1; i < n; ++i) {
        int key = a[i];
        int j = i - 1;
        while (j >= 0 && a[j] > key) {
            a[j + 1] = a[j];
            --j;
        }
        a[j + 1] = key;
    }
}
```

### C 구현

```c
void insertion_sort(int* a, int n) {
    for (int i = 1; i < n; ++i) {
        int key = a[i];
        int j = i - 1;
        while (j >= 0 && a[j] > key) {
            a[j + 1] = a[j];
            --j;
        }
        a[j + 1] = key;
    }
}
```

### 분석

| | 시간 |
| --- | --- |
| 최선 (정렬됨) | **O(n)** ← 가장 큰 강점 |
| 평균/최악 | O(n²) |

공간: O(1).
**stable**: ✅.
**adaptive**: ✅ — 거의 정렬된 입력에 매우 빠름.

## 셋 비교

| | Bubble | Selection | Insertion |
| --- | --- | --- | --- |
| 평균 시간 | O(n²) | O(n²) | O(n²) |
| 최선 시간 | O(n) | O(n²) | O(n) |
| 메모리 | O(1) | O(1) | O(1) |
| stable | ✅ | ❌ | ✅ |
| adaptive | ✅ | ❌ | ✅ |
| swap 횟수 | O(n²) | O(n) | O(n²) |
| 거의 정렬됨 | 빠름 | 항상 같음 | **매우 빠름** |
| 실용 | 거의 안 씀 | 거의 안 씀 | 작은 n에 좋음 |

## 실용 — Insertion Sort의 부활

> ⚠️ Insertion sort는 작은 n에서 quick sort보다 빠름 — 오버헤드 적음.

→ **Quick sort + Insertion sort 하이브리드**: n < 16 정도면 insertion sort로 전환. 표준 라이브러리(`std::sort`)가 사용하는 패턴.

## 정렬의 안정성 (Stability)

같은 값의 원소들의 **원래 순서 유지** 여부.

```
[(3, "A"), (1, "X"), (3, "B")]

stable sort:    [(1, "X"), (3, "A"), (3, "B")]    ← A가 B보다 앞
non-stable:     [(1, "X"), (3, "B"), (3, "A")]    ← 순서 보장 X
```

여러 키로 정렬하거나 객체 정렬에서 중요.

## 트레이드오프 — 한눈에

| 차원 | 단순 정렬 (3종) |
| --- | --- |
| 작은 n (≤ 50) | ✅ 충분 |
| 큰 n | ❌ O(n²) — 못 씀 |
| 메모리 | ✅ O(1) |
| 코드 단순성 | ✅ 5~10줄 |
| 학습 가치 | ✅ |

## 실제 사례

- **`std::sort` 내부** — quick sort + insertion sort (작은 부분배열) + heap sort (재귀 깊이 한도)
- **임베디드** — 작은 배열 정렬
- **온라인 알고리즘** — insertion sort는 데이터 들어올 때마다 정렬

## 다음

- [효율 정렬 (Quick, Merge, Heap)](/blog/programming/data-structures-and-algorithms/item20-efficient-sort)
