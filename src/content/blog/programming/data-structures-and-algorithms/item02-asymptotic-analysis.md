---
title: "DSA 2: 시간/공간 복잡도와 점근 표기 (O, Ω, Θ)"
date: 2026-03-01T11:00:00
description: "알고리즘 성능을 입력 크기에 대한 함수로 표현 — Big-O / Theta / Omega의 정확한 정의."
tags: [Data Structure, Algorithm, Complexity]
series: "Data Structures and Algorithms"
seriesOrder: 2
draft: false
---

## 한 줄 요약

> **"입력이 100배 커지면 시간은 몇 배?"** — 점근 표기는 이 질문에 답하는 도구.

## 어떤 문제를 푸는가

알고리즘 둘 중 어느 게 빠른가? 단순히 "내 컴에서 1초"로는 부족하다 — 머신·컴파일러·입력에 따라 다름.

대신 **입력 크기 n**에 대해 시간이 어떻게 증가하는지로 비교 → **점근 표기**.

```
정렬 A: 0.5초 (n=1000)
정렬 B: 0.6초 (n=1000)

n=1000000일 때?
A가 O(n²) 이면 → 약 14시간
B가 O(n log n) 이면 → 약 12분
```

상수 시간(0.5 vs 0.6)은 의미 없음. **증가율**이 진짜 비교 대상.

## 세 표기법의 정확한 정의

### Big-O (`O`) — 상한

> `f(n) = O(g(n))` ⟺ ∃ c > 0, n₀ : ∀ n ≥ n₀, `f(n) ≤ c · g(n)`

"적당한 상수 c와 충분히 큰 n부터 항상 c·g(n) 이하".

→ "**최악의 경우 이만큼 빠르다**"는 보장.

### Big-Omega (`Ω`) — 하한

> `f(n) = Ω(g(n))` ⟺ ∃ c > 0, n₀ : ∀ n ≥ n₀, `f(n) ≥ c · g(n)`

→ "**최선의 경우라도 이보다 느리다**".

### Big-Theta (`Θ`) — 정확한 차수

> `f(n) = Θ(g(n))` ⟺ `f = O(g)` AND `f = Ω(g)`

→ "**정확히 이만큼 증가한다**".

## 흔한 함정

`f(n) = O(g(n))`은 **상한**일 뿐 — `O(n²)`인 알고리즘이 실제로는 `O(n)`일 수도 있음.

예: Bubble Sort
- 일반: O(n²)
- 이미 정렬된 입력: O(n) — 그러나 보통 O(n²)이라고 부름 (worst case)

→ 명시 안 하면 보통 **worst case의 Θ** 또는 **upper bound O**.

## 흔한 차수 계층

```
O(1)        < O(log n) < O(n) < O(n log n) < O(n²) < O(n³) < O(2ⁿ) < O(n!)
상수          로그        선형     선형로그      이차     삼차     지수      계승
```

n = 1,000,000일 때 비교:

| 차수 | 연산 횟수 |
| --- | --- |
| O(1) | 1 |
| O(log n) | ~20 |
| O(n) | 10⁶ |
| O(n log n) | ~2×10⁷ |
| O(n²) | 10¹² (사실상 불가) |
| O(2ⁿ) | 우주 멸망 후에도 |

## 시간 복잡도 분석 예제

### 예 1 — 단순 루프

```cpp
int sum = 0;
for (int i = 0; i < n; ++i) sum += i;
// → O(n)
```

### 예 2 — 이중 루프

```cpp
for (int i = 0; i < n; ++i)
    for (int j = 0; j < n; ++j)
        do_something();
// → O(n²)
```

### 예 3 — 분할 정복

```cpp
int binarySearch(int* arr, int n, int target) {
    int lo = 0, hi = n - 1;
    while (lo <= hi) {
        int mid = (lo + hi) / 2;
        if (arr[mid] == target) return mid;
        if (arr[mid] < target) lo = mid + 1;
        else hi = mid - 1;
    }
    return -1;
}
// → 매 반복마다 절반 → O(log n)
```

### 예 4 — 재귀 (마스터 정리 미리보기)

```cpp
T(n) = 2 T(n/2) + n   // merge sort
// → O(n log n)
```

자세한 분석은 [item03 (재귀와 분할 정복)](/blog/programming/data-structures-and-algorithms/item03-recursion-and-divide-conquer).

## 공간 복잡도

시간뿐 아니라 **메모리 사용량**도 같은 표기.

```cpp
// in-place — O(1) 추가 공간
void reverse(int* arr, int n) {
    for (int i = 0; i < n / 2; ++i) std::swap(arr[i], arr[n - 1 - i]);
}

// O(n) 추가 공간 (새 배열)
std::vector<int> reversed(const std::vector<int>& v) {
    return std::vector<int>(v.rbegin(), v.rend());
}
```

재귀 호출의 콜 스택도 공간 비용:
- merge sort: O(n) (배열 복사) + O(log n) (스택)
- quick sort in-place: O(1) + O(log n) ~ O(n) (스택)

## 평균/최선/최악

| 케이스 | 의미 |
| --- | --- |
| **최악(worst)** | 모든 입력에서 보장 — 가장 흔한 분석 |
| **평균(average)** | 입력 분포 가정 — 분석 어려움 |
| **최선(best)** | 가장 좋은 입력 — 보통 의미 X |

기본은 **worst case**. 평균이 더 의미 있는 경우(quick sort)는 명시.

## 핵심 정리

- O = 상한, Ω = 하한, Θ = 정확
- 상수 무시, 최고차항만 봄
- 기본 차수 계층 외우기 (1 < log < n < n log n < n² < 2ⁿ)
- 보통 worst case 분석

## 다음

- [재귀와 분할 정복](/blog/programming/data-structures-and-algorithms/item03-recursion-and-divide-conquer)
