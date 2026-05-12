---
title: "DSA 4: 배열 — 1차원·다차원, 행 우선·열 우선"
date: 2026-03-01T13:00:00
description: "배열의 인덱스 계산, 다차원 표현, 행 우선/열 우선 차이가 캐시에 미치는 영향."
tags: [Data Structure, Algorithm, Array]
series: "Data Structures and Algorithms"
seriesOrder: 4
draft: false
---

## 한 줄 요약

> **"메모리에 연속해 놓고 인덱스로 곧장 접근"** — O(1) 임의 접근의 핵심.

## 어떤 문제를 푸는가

배열은 가장 단순한 자료구조 — 그러나 **메모리 레이아웃**이 성능을 좌우. 행 우선과 열 우선의 차이는 큰 행렬에서 수십 배 차이를 낼 수 있음.

## 배열의 본질

**연속된 메모리 + 인덱스 → 주소 산술**.

```
arr[i] 주소 = base + i × sizeof(T)
```

→ 임의 접근 **O(1)**. 인덱스만 알면 곧바로 위치 계산.

## 1차원 배열 — C++

```cpp
#include <array>
#include <vector>

int  raw[10];                 // C 스타일 — 크기 고정, 스택
std::array<int, 10> arr;      // 크기 컴파일 타임, 안전
std::vector<int> vec(10);     // 크기 런타임, 힙, 동적 변경 가능
```

| | 크기 | 위치 | 변경 |
| --- | --- | --- | --- |
| `int[10]` | 컴파일 타임 | 스택 | 불가 |
| `std::array` | 컴파일 타임 | 스택 | 불가 |
| `std::vector` | 런타임 | 힙 | 가능 (resize) |

## 1차원 배열 — C

```c
int raw[10];                  // 스택, 크기 컴파일 타임
int* dyn = malloc(10 * sizeof(int));  // 힙
free(dyn);
```

C에는 RAII 없으니 `malloc`/`free` 짝 맞춤 필수.

## 다차원 배열

```cpp
int mat[3][4];      // 3×4 행렬
mat[1][2] = 7;
```

C++는 **행 우선**(row-major) — `mat[i][j]`의 메모리 주소 = base + (i × 4 + j) × sizeof(int).

```
mat[0][0] mat[0][1] mat[0][2] mat[0][3]    ← 한 행이 연속
mat[1][0] mat[1][1] mat[1][2] mat[1][3]
mat[2][0] mat[2][1] mat[2][2] mat[2][3]
```

## 행 우선 vs 열 우선 — 캐시의 핵심

| 언어 | 순서 |
| --- | --- |
| **C / C++ / Python** | 행 우선 |
| **Fortran / MATLAB / R** | 열 우선 |

같은 알고리즘이라도 **메모리 접근 순서가 캐시 라인과 일치**해야 빠름.

### ❌ 캐시 비친화 (C++에서 열 우선 순회)

```cpp
const int N = 1024;
int mat[N][N];
long sum = 0;
for (int j = 0; j < N; ++j)        // 바깥: 열
    for (int i = 0; i < N; ++i)    // 안: 행
        sum += mat[i][j];           // ◄── 캐시 미스 폭탄
```

`mat[0][0]`, `mat[1][0]`, `mat[2][0]`... 1024 byte씩 점프 → 매번 새 캐시 라인.

### ✅ 캐시 친화 (행 우선)

```cpp
for (int i = 0; i < N; ++i)        // 바깥: 행
    for (int j = 0; j < N; ++j)    // 안: 열
        sum += mat[i][j];           // 연속 메모리 — 캐시 친화
```

같은 알고리즘이지만 실측 **수~수십 배** 차이.

## 다차원 vs 1차원 시뮬레이션

```cpp
// 진짜 2차원
int mat[3][4];

// 1차원으로 시뮬레이션 (행 우선)
int flat[3 * 4];
auto at = [](int i, int j) { return i * 4 + j; };
flat[at(1, 2)] = 7;
```

`std::vector`로 동적 행렬 만들 때 `vector<vector<int>>`보다 **1차원 vector + 인덱스 산술**이 캐시 친화.

```cpp
class Matrix {
    int rows, cols;
    std::vector<int> data;
public:
    Matrix(int r, int c) : rows(r), cols(c), data(r * c) {}
    int& operator()(int i, int j) { return data[i * cols + j]; }
};
```

## 시간 복잡도

| 연산 | 복잡도 |
| --- | --- |
| 임의 접근 `arr[i]` | O(1) |
| 끝에 추가 (`vector::push_back`, amortized) | O(1) |
| 중간 삽입/삭제 | O(n) — 뒤를 다 밀어야 |
| 탐색 (정렬 안 된) | O(n) |
| 탐색 (정렬됨, binary search) | O(log n) |

## 동적 배열 (`std::vector`) 동작

```cpp
std::vector<int> v;
v.push_back(1);    // capacity 1
v.push_back(2);    // capacity 2
v.push_back(3);    // capacity 4 — 재할당
v.push_back(4);    // capacity 4
v.push_back(5);    // capacity 8 — 재할당
```

용량 부족 시 **두 배로 재할당** → 평균 O(1) (amortized).

## 트레이드오프 — 한눈에

| 차원 | Array |
| --- | --- |
| 임의 접근 | ✅ O(1) |
| 캐시 친화 | ✅ 연속 메모리 |
| 끝에 추가 (vector) | ✅ amortized O(1) |
| 중간 삽입/삭제 | ❌ O(n) |
| 크기 변경 (raw) | ❌ 불가 — vector 사용 |

## 실제 사례

- 거의 모든 컨테이너의 기반
- 수치 계산 라이브러리 (NumPy, Eigen, BLAS)
- 비트맵 / 픽셀 데이터
- 행렬 연산 (행 우선 vs 열 우선 결정 필수)

## 다음

- [구조체 / 다항식 / 희소 행렬](/blog/programming/algorithms/data-structures-and-algorithms/item05-structures-polynomials-sparse-matrix)
