---
title: "DSA 34: DP 패턴 카탈로그 — LIS, LCS, Knapsack, Edit Distance"
date: 2026-03-10T10:00:00
description: "DP의 5가지 표준 패턴과 의사결정 트리."
tags: [Data Structure, Algorithm, Dynamic Programming, DP]
series: "Data Structures and Algorithms"
seriesOrder: 34
draft: false
---

## 한 줄 요약

> **"중복 계산 캐싱 + 부분구조 = DP"** — 5가지 패턴이면 거의 모든 DP 문제 커버.

## DP의 두 조건

1. **부분구조 (Optimal Substructure)** — 큰 문제의 해 = 부분 문제 해의 조합
2. **중복 부분 문제 (Overlapping Subproblems)** — 같은 부분 문제가 반복

→ **memoization** (top-down, 재귀+캐시) 또는 **tabulation** (bottom-up, 표 채우기).

## 패턴 1 — Fibonacci류 (1D, 선형 의존)

```
dp[i] = f(dp[i-1], dp[i-2], ...)
```

### 예 — 계단 오르기

n계단, 한 번에 1 또는 2 — 몇 가지 방법?

```cpp
int climb(int n) {
    if (n <= 2) return n;
    std::vector<int> dp(n + 1);
    dp[1] = 1; dp[2] = 2;
    for (int i = 3; i <= n; ++i) dp[i] = dp[i-1] + dp[i-2];
    return dp[n];
}
```

공간 최적화: `dp[i-1]`, `dp[i-2]` 둘만 → O(1).

## 패턴 2 — LIS (Longest Increasing Subsequence)

```
dp[i] = i번째 원소를 끝으로 하는 가장 긴 증가 부분 수열의 길이
```

### O(n²) 단순

```cpp
int lis(const std::vector<int>& a) {
    int n = a.size();
    std::vector<int> dp(n, 1);
    for (int i = 1; i < n; ++i)
        for (int j = 0; j < i; ++j)
            if (a[j] < a[i]) dp[i] = std::max(dp[i], dp[j] + 1);
    return *std::max_element(dp.begin(), dp.end());
}
```

### O(n log n) — Patience Sort (binary search)

```cpp
int lisFast(const std::vector<int>& a) {
    std::vector<int> tail;
    for (int x : a) {
        auto it = std::lower_bound(tail.begin(), tail.end(), x);
        if (it == tail.end()) tail.push_back(x);
        else *it = x;
    }
    return tail.size();
}
```

## 패턴 3 — LCS (Longest Common Subsequence)

두 문자열 X, Y의 가장 긴 공통 부분 수열.

```
dp[i][j] = X[0..i], Y[0..j]의 LCS 길이

if X[i] == Y[j]: dp[i][j] = dp[i-1][j-1] + 1
else:            dp[i][j] = max(dp[i-1][j], dp[i][j-1])
```

### C++ 구현

```cpp
int lcs(const std::string& x, const std::string& y) {
    int m = x.size(), n = y.size();
    std::vector<std::vector<int>> dp(m + 1, std::vector<int>(n + 1, 0));
    for (int i = 1; i <= m; ++i)
        for (int j = 1; j <= n; ++j)
            if (x[i-1] == y[j-1]) dp[i][j] = dp[i-1][j-1] + 1;
            else                  dp[i][j] = std::max(dp[i-1][j], dp[i][j-1]);
    return dp[m][n];
}
```

**시간**: O(mn). **공간**: O(mn) → O(min(m,n))으로 최적화 가능.

### 응용

- **diff** — `git diff`, `diff` 명령어
- **DNA 시퀀스** 비교
- **버전 관리** — merge

## 패턴 4 — Knapsack (0/1)

n개 아이템 (무게 w, 가치 v), 배낭 용량 W. 가치 최대화 (각 아이템 0 또는 1번).

```
dp[i][w] = i개 아이템 중 선택, 무게 ≤ w 일 때 최대 가치

if w[i] > w: dp[i][w] = dp[i-1][w]   ← i 못 담음
else:        dp[i][w] = max(dp[i-1][w], dp[i-1][w-w[i]] + v[i])
                                       ↑ 안 담기      ↑ 담기
```

### C++ 구현

```cpp
int knapsack(const std::vector<int>& w, const std::vector<int>& v, int W) {
    int n = w.size();
    std::vector<std::vector<int>> dp(n + 1, std::vector<int>(W + 1, 0));
    for (int i = 1; i <= n; ++i)
        for (int j = 0; j <= W; ++j)
            if (w[i-1] > j) dp[i][j] = dp[i-1][j];
            else            dp[i][j] = std::max(dp[i-1][j], dp[i-1][j-w[i-1]] + v[i-1]);
    return dp[n][W];
}
```

**시간**: O(nW) — 사이비-다항 (W가 입력 크기 아닌 입력 값에 따라).
**공간**: O(nW) → O(W)로 최적화 (1D 배열, **뒤에서 앞으로** 업데이트).

```cpp
int knapsack1D(const std::vector<int>& w, const std::vector<int>& v, int W) {
    std::vector<int> dp(W + 1, 0);
    for (int i = 0; i < (int)w.size(); ++i)
        for (int j = W; j >= w[i]; --j)   // ◄── 역순 — 같은 i 덮어쓰기 방지
            dp[j] = std::max(dp[j], dp[j-w[i]] + v[i]);
    return dp[W];
}
```

### 변형

- **Unbounded Knapsack** — 각 아이템 무한 — 정방향 업데이트
- **Subset Sum** — 가치 = 무게 (특정 합 존재 여부)
- **Coin Change** — 동전으로 amount 만들기

## 패턴 5 — Edit Distance (Levenshtein)

두 문자열 변환의 최소 연산 수 (insert, delete, replace).

```
dp[i][j] = X[0..i] → Y[0..j] 최소 연산

if X[i] == Y[j]: dp[i][j] = dp[i-1][j-1]
else:            dp[i][j] = 1 + min(dp[i-1][j],     // 삭제
                                    dp[i][j-1],     // 삽입
                                    dp[i-1][j-1])   // 치환
```

### C++ 구현

```cpp
int editDistance(const std::string& x, const std::string& y) {
    int m = x.size(), n = y.size();
    std::vector<std::vector<int>> dp(m + 1, std::vector<int>(n + 1));
    for (int i = 0; i <= m; ++i) dp[i][0] = i;
    for (int j = 0; j <= n; ++j) dp[0][j] = j;
    for (int i = 1; i <= m; ++i)
        for (int j = 1; j <= n; ++j)
            if (x[i-1] == y[j-1]) dp[i][j] = dp[i-1][j-1];
            else                  dp[i][j] = 1 + std::min({dp[i-1][j], dp[i][j-1], dp[i-1][j-1]});
    return dp[m][n];
}
```

### 응용

- **맞춤법 교정** — 편집 거리 작은 단어 추천
- **DNA 정렬**
- **OCR 후처리**
- **diff (line-level vs char-level)**

## DP 의사결정 트리

```
문제 봤을 때:
1. 부분구조 + 중복? → DP 후보
2. 상태 정의: dp[i] / dp[i][j] / dp[i][j][k] / ...
3. 점화식 — 부분 문제 어떻게 결합?
4. base case — dp[0], dp[0][0]
5. 순서 — 작은 문제 먼저
6. 공간 최적화 — 직전 행만 필요하면 1D
```

## C 구현 — 0/1 Knapsack (1D)

```c
int knapsack(int* w, int* v, int n, int W) {
    int dp[W + 1];
    for (int i = 0; i <= W; ++i) dp[i] = 0;

    for (int i = 0; i < n; ++i)
        for (int j = W; j >= w[i]; --j)
            if (dp[j - w[i]] + v[i] > dp[j])
                dp[j] = dp[j - w[i]] + v[i];
    return dp[W];
}
```

## DP vs 다른 패러다임

| 문제 종류 | 패러다임 |
| --- | --- |
| 부분구조 + 중복 | **DP** |
| 부분구조, 중복 X | **분할 정복** |
| 그리디 선택 가능 | **그리디** (item 27) |
| 모든 경우 시도 + 가지치기 | **백트래킹** (item 35) |

## 트레이드오프 — 한눈에

| 차원 | DP |
| --- | --- |
| 지수 → 다항 | ✅ 강력 |
| 메모리 | ⚠️ 표 크기 |
| 코드 작성 어려움 | ⚠️ 점화식 발견 |
| 디버깅 (잘못된 점화식) | ⚠️ |
| 표준 패턴 익히면 | ✅ |

## 실제 사례

- **컴파일러 최적화** — 명령어 스케줄링
- **자연어 처리** — Viterbi 알고리즘 (HMM)
- **음성 인식**, **OCR**
- **금융** — 옵션 가격 (Black-Scholes 외)
- **경영학** — 자원 할당

## 다음

- [백트래킹](/blog/programming/data-structures-and-algorithms/item35-backtracking)
