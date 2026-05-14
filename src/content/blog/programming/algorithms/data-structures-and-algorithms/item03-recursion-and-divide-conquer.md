---
title: "DSA 3: 재귀와 분할 정복 — Tower of Hanoi"
date: 2026-03-01T03:00:00
description: "재귀의 본질: 작은 문제로 줄이기. Tower of Hanoi와 마스터 정리 입문."
tags: [Data Structure, Algorithm, Recursion, Divide and Conquer]
series: "Data Structures and Algorithms"
seriesOrder: 3
draft: true
---

## 한 줄 요약

> **"문제를 나 자신을 부르는 더 작은 문제로 줄여라"** — Tower of Hanoi 3줄 코드의 위력.

## 어떤 문제를 푸는가

문제가 **자기와 같은 형태의 더 작은 문제**로 환원되는 경우 — 재귀가 자연스러움.

대표 예: **Tower of Hanoi** — 원반 n개를 한 막대에서 다른 막대로 옮기되,
- 한 번에 1개만
- 큰 원반이 작은 원반 위에 못 옴

### 통찰

n개 옮기기 = 위 (n-1)개를 임시 막대로 옮기고 → 가장 큰 1개를 목적지로 → 임시의 (n-1)개를 목적지로

3단계로 자기 자신을 더 작게 부름 → **재귀**.

## C++ 구현

```cpp
#include <iostream>

void hanoi(int n, char from, char via, char to) {
    if (n == 0) return;          // base case

    hanoi(n - 1, from, to, via); // 1) (n-1)개를 via로
    std::cout << "원반 " << n << ": " << from << " -> " << to << '\n';
    hanoi(n - 1, via, from, to); // 3) (n-1)개를 to로
}

int main() {
    hanoi(3, 'A', 'B', 'C');
}
```

출력:
<img src="/images/blog/dsa/diagrams/item03-hanoi.svg" alt="하노이 탑 이동 단계" style="max-width:100%; background:white; padding:8px; border-radius:6px;" />

## C 구현

```c
#include <stdio.h>

void hanoi(int n, char from, char via, char to) {
    if (n == 0) return;

    hanoi(n - 1, from, to, via);
    printf("원반 %d: %c -> %c\n", n, from, to);
    hanoi(n - 1, via, from, to);
}

int main(void) {
    hanoi(3, 'A', 'B', 'C');
    return 0;
}
```

3줄 함수 — 그러나 n개 원반을 정확히 옮김.

## 시간 복잡도

`T(n) = 2T(n-1) + 1` — 점화식.

풀어 보면:

```
T(n) = 2T(n-1) + 1
     = 2(2T(n-2) + 1) + 1
     = 4T(n-2) + 2 + 1
     = ...
     = 2ⁿ T(0) + (2ⁿ⁻¹ + ... + 1)
     = 2ⁿ - 1
```

→ **O(2ⁿ)** — 지수.

n=64이면 우주 나이보다 오래 걸림 (Hanoi 전설의 의미).

## 분할 정복 (Divide and Conquer)

재귀의 일반화. 세 단계:

| 단계 | 의미 |
| --- | --- |
| **Divide** | 문제를 더 작은 부분 문제로 분할 |
| **Conquer** | 부분 문제를 재귀적으로 해결 |
| **Combine** | 부분 해를 합쳐 전체 해 |

대표 예:
- **Merge Sort**: 반으로 나눔 → 각각 정렬 → 병합
- **Quick Sort**: pivot 기준 분할 → 각각 정렬 (병합 불필요)
- **Binary Search**: 반으로 줄여 탐색
- **Hanoi**: 위 (n-1) → 가장 큰 1 → 아래 (n-1)

## 마스터 정리 (Master Theorem) 미리보기

분할 정복 점화식 `T(n) = a T(n/b) + f(n)` 의 해를 일반화:

| 조건 | T(n) |
| --- | --- |
| `f(n) = O(n^c)`, `c < log_b(a)` | `Θ(n^(log_b a))` |
| `f(n) = Θ(n^c · log^k n)`, `c = log_b(a)` | `Θ(n^c · log^(k+1) n)` |
| `f(n) = Ω(n^c)`, `c > log_b(a)` | `Θ(f(n))` |

자주 쓰는 결과:

| 점화식 | 풀이 | 알고리즘 |
| --- | --- | --- |
| `T(n) = 2T(n/2) + n` | O(n log n) | Merge Sort |
| `T(n) = 2T(n/2) + 1` | O(n) | Tree traversal |
| `T(n) = T(n/2) + 1` | O(log n) | Binary Search |
| `T(n) = T(n-1) + n` | O(n²) | Selection Sort |
| `T(n) = 2T(n-1) + 1` | O(2ⁿ) | Hanoi |

## 재귀 함정

### ⚠️ Stack overflow

깊은 재귀는 콜 스택 폭발. 보통 깊이 ~10⁴~10⁵에서 깨짐.

```cpp
int factorial(int n) {
    return n == 0 ? 1 : n * factorial(n - 1);
}
factorial(1000000);   // stack overflow
```

해결:
- **반복문으로 변환** (가능한 경우)
- **꼬리 재귀** (tail recursion) — 컴파일러가 최적화 가능 (C++ 보장 X)
- **명시적 스택**으로 변환

### ⚠️ 중복 계산

```cpp
int fib(int n) {
    if (n < 2) return n;
    return fib(n - 1) + fib(n - 2);   // 같은 값을 수없이 재계산
}
fib(40);   // O(2ⁿ) — 매우 느림
```

→ **DP / memoization**으로 해결 (item 25).

## 핵심 정리

- 재귀 = 작은 문제로 환원 + base case
- 분할 정복 = Divide → Conquer → Combine
- 마스터 정리로 점화식 빠르게 풀이
- 깊은 재귀 / 중복 계산 함정

## 다음

- [배열 / 다차원 / 행 우선·열 우선](/blog/programming/algorithms/data-structures-and-algorithms/item04-arrays)
