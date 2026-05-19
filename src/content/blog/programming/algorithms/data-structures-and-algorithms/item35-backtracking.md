---
title: "DSA 35: 백트래킹 — N-Queens, 부분집합, 분기 한정"
date: 2026-05-15T11:00:00
description: "모든 경우 시도 + 가지치기 — 조합·순열·제약 만족 문제의 표준."
tags: [Data Structure, Algorithm, Backtracking, N-Queens]
series: "Data Structures and Algorithms"
seriesOrder: 35
draft: true
---

## 한 줄 요약

> **"가능한 선택을 모두 시도, 안 되면 되돌아감"** — DFS + 제약 조건 + 가지치기.

## 어떤 문제를 푸는가

- **N-Queens** — n×n 체스판에 n개 퀸 (서로 공격 X)
- **부분집합** — 합이 target인 부분집합
- **순열·조합** — 모든 가능한 배열
- **스도쿠** — 가능한 숫자 채워보기
- **단어 분할** — 사전에 있는 단어로 문장 만들기

공통: **선택지의 트리** + 제약 위반 시 즉시 되돌아감.

## 백트래킹 일반 골격

```
backtrack(상태):
    if 종료 조건:
        결과 기록
        return
    for 가능한 선택:
        선택을 상태에 적용
        if 유효하면:                  # ← 가지치기
            backtrack(새 상태)
        선택 취소 (undo)
```

핵심: **시도 → 재귀 → 취소** (try-recurse-undo).

## 예 1 — 부분집합 합 (Subset Sum)

n개 정수 중 합이 target인 부분집합 찾기.

### C++ 구현

```cpp
void subsetSum(const std::vector<int>& nums, int target,
               std::vector<int>& current, int idx) {
    if (target == 0) {
        for (int x : current) std::cout << x << " ";
        std::cout << "\n";
        return;
    }
    if (target < 0 || idx >= (int)nums.size()) return;   // ◄── 가지치기

    // 선택
    current.push_back(nums[idx]);
    subsetSum(nums, target - nums[idx], current, idx + 1);
    current.pop_back();    // ◄── undo

    // 미선택
    subsetSum(nums, target, current, idx + 1);
}
```

각 원소마다 **선택/미선택** 두 분기 → 2^n 경우. 가지치기로 실제 빠름.

## 예 2 — N-Queens

n×n에 n개 퀸 배치, 서로 공격 X (같은 행·열·대각선 X).

각 행에 한 퀸 — n개 행에 대해 열 결정.

### C++ 구현

```cpp
class NQueens {
    int n;
    std::vector<int> col;        // col[i] = i행의 퀸 열
    std::vector<bool> usedCol, usedDiag1, usedDiag2;
    int count = 0;

public:
    int solve(int N) {
        n = N;
        col.assign(n, -1);
        usedCol.assign(n, false);
        usedDiag1.assign(2 * n, false);
        usedDiag2.assign(2 * n, false);
        backtrack(0);
        return count;
    }

private:
    void backtrack(int row) {
        if (row == n) { ++count; return; }

        for (int c = 0; c < n; ++c) {
            int d1 = row + c;
            int d2 = row - c + n;
            if (usedCol[c] || usedDiag1[d1] || usedDiag2[d2]) continue;

            col[row] = c;
            usedCol[c] = usedDiag1[d1] = usedDiag2[d2] = true;
            backtrack(row + 1);
            usedCol[c] = usedDiag1[d1] = usedDiag2[d2] = false;
            col[row] = -1;
        }
    }
};

NQueens nq;
std::cout << nq.solve(8);   // 92 (8-queens 해 개수)
```

8-queens는 **92가지 해**.

## 예 3 — 모든 순열 (Permutations)

```cpp
void permute(std::vector<int>& nums, int start, std::vector<std::vector<int>>& result) {
    if (start == (int)nums.size()) {
        result.push_back(nums);
        return;
    }
    for (int i = start; i < (int)nums.size(); ++i) {
        std::swap(nums[start], nums[i]);
        permute(nums, start + 1, result);
        std::swap(nums[start], nums[i]);   // undo
    }
}

std::vector<int> nums = {1, 2, 3};
std::vector<std::vector<int>> result;
permute(nums, 0, result);
// 6 permutations
```

## 예 4 — 스도쿠

빈 칸을 1~9로 채우되, 각 행·열·3×3 박스에 같은 숫자 X.

```cpp
bool isValid(int board[9][9], int row, int col, int num) {
    for (int i = 0; i < 9; ++i) {
        if (board[row][i] == num) return false;
        if (board[i][col] == num) return false;
        if (board[3*(row/3) + i/3][3*(col/3) + i%3] == num) return false;
    }
    return true;
}

bool solve(int board[9][9]) {
    for (int row = 0; row < 9; ++row)
        for (int col = 0; col < 9; ++col)
            if (board[row][col] == 0) {
                for (int num = 1; num <= 9; ++num) {
                    if (isValid(board, row, col, num)) {
                        board[row][col] = num;
                        if (solve(board)) return true;
                        board[row][col] = 0;   // undo
                    }
                }
                return false;   // 못 채움 → 되돌아감
            }
    return true;   // 모두 채움
}
```

## C 구현 — N-Queens

```c
int n;
int col[20];
int used_col[20], used_d1[40], used_d2[40];
int count_queens;

void backtrack(int row) {
    if (row == n) { ++count_queens; return; }
    for (int c = 0; c < n; ++c) {
        int d1 = row + c, d2 = row - c + n;
        if (used_col[c] || used_d1[d1] || used_d2[d2]) continue;
        col[row] = c;
        used_col[c] = used_d1[d1] = used_d2[d2] = 1;
        backtrack(row + 1);
        used_col[c] = used_d1[d1] = used_d2[d2] = 0;
    }
}

int n_queens(int N) {
    n = N;
    for (int i = 0; i < n; ++i) used_col[i] = 0;
    for (int i = 0; i < 2*n; ++i) used_d1[i] = used_d2[i] = 0;
    count_queens = 0;
    backtrack(0);
    return count_queens;
}
```

## 분기 한정 (Branch and Bound)

백트래킹 + **상한 (bound)** 으로 가지치기 강화.

### 0/1 Knapsack — 분기 한정

```
각 노드에서:
- 현재까지 가치
- 남은 아이템의 최대 가능 가치 (= 상한 bound)

만약 bound < 현재 best → 가지치기 (이 분기 더 안 봄)
```

### TSP (외판원 문제) — 분기 한정

각 부분 경로에서 최소 가능 비용 ≥ best → 가지치기.

분기 한정은 NP-hard 문제의 **실용적 해법** — exact answer + 가지치기로 빠름.

## 가지치기 전략

| 전략 | 의미 |
| --- | --- |
| **불가능 검사** | 현재 분기가 정답 못 만듦 → return |
| **상한·하한** | 더 좋은 답 못 나옴 → return |
| **순서 휴리스틱** | 좋은 분기부터 → 일찍 best 찾고 다른 분기 가지치기 |
| **대칭성 제거** | 회전·반사로 동등한 해 한 번만 |

## 시간 복잡도

워스트는 보통 지수 (2^n, n!). 가지치기로 실측 훨씬 빠름.

| 문제 | 워스트 | 실측 (good pruning) |
| --- | --- | --- |
| N-queens | n^n | 약 10^k (k = n/2) |
| Subset sum | 2^n | 훨씬 작음 |
| TSP | n! | 다항에 가까움 (작은 n) |

## 트레이드오프 — 한눈에

| 차원 | Backtracking |
| --- | --- |
| 정확한 답 (모든 해) | ✅ |
| 지수 → 가지치기로 다항 가까이 | ✅ (좋은 휴리스틱) |
| NP-hard에 적용 가능 | ✅ (실용 한도 내) |
| 큰 n | ❌ 한계 |

## 실제 사례

- **스도쿠 솔버**, **N-queens**, **8-puzzle**
- **CSP** (Constraint Satisfaction Problems)
- **컴파일러 — instruction scheduling** (분기 한정)
- **TSP / VRP** — 분기 한정
- **SAT solver** — DPLL (백트래킹 + unit propagation)

## 다음

- [모던 C++ 자료구조 활용](/blog/programming/algorithms/data-structures-and-algorithms/item36-modern-cpp-containers)
