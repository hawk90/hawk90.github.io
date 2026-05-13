---
title: "DSA 5: 구조체 — 다항식과 희소 행렬"
date: 2026-03-01T14:00:00
description: "구조체 활용 — 다항식 표현, 희소 행렬 압축으로 0이 많은 데이터 효율 처리."
tags: [Data Structure, Algorithm, Sparse Matrix, Polynomial]
series: "Data Structures and Algorithms"
seriesOrder: 5
draft: true
---

## 한 줄 요약

> **"0이 99%인 행렬을 어떻게 효율적으로 저장할까"** — 0 아닌 항만 저장 = 희소 행렬.

## 어떤 문제를 푸는가

### 다항식 — 두 가지 표현

`P(x) = 3x⁴ + 5x² + 2` — 어떻게 저장?

**A. 계수 배열** (모든 차수 포함):
```cpp
int coeffs[5] = {2, 0, 5, 0, 3};   // [x⁰, x¹, x², x³, x⁴]
```
- ✅ 단순, 인덱스로 차수 접근
- ❌ `100x¹⁰⁰⁰` 처럼 sparse면 0이 너무 많음

**B. (계수, 차수) 쌍의 배열** (0 아닌 항만):
```cpp
struct Term { int coef; int exp; };
Term poly[3] = {{3, 4}, {5, 2}, {2, 0}};
```
- ✅ sparse에 효율적
- ❌ 인덱스 접근 X — 차수를 찾아야

### 희소 행렬 (Sparse Matrix)

대형 행렬에서 **대부분 항이 0**인 경우 (예: 그래프 인접 행렬, FEM, NLP).

```
1000 × 1000 행렬 = 10⁶ 항 = 4 MB (int)
그러나 0 아닌 항이 1000개뿐이면? → 0.001%
```

→ 0 아닌 항만 `(행, 열, 값)` 트리플로 저장.

## C++ 구현 — 다항식 (희소 형태)

```cpp
#include <vector>
#include <iostream>

struct Term {
    int coef;
    int exp;
};

class Polynomial {
    std::vector<Term> terms;   // 차수 내림차순 정렬 가정
public:
    void add(int coef, int exp) {
        if (coef != 0) terms.push_back({coef, exp});
    }

    Polynomial operator+(const Polynomial& other) const {
        Polynomial result;
        std::size_t i = 0, j = 0;
        while (i < terms.size() && j < other.terms.size()) {
            if (terms[i].exp == other.terms[j].exp) {
                int sum = terms[i].coef + other.terms[j].coef;
                if (sum != 0) result.terms.push_back({sum, terms[i].exp});
                ++i; ++j;
            } else if (terms[i].exp > other.terms[j].exp) {
                result.terms.push_back(terms[i++]);
            } else {
                result.terms.push_back(other.terms[j++]);
            }
        }
        while (i < terms.size())       result.terms.push_back(terms[i++]);
        while (j < other.terms.size()) result.terms.push_back(other.terms[j++]);
        return result;
    }

    void print() const {
        for (const auto& t : terms)
            std::cout << t.coef << "x^" << t.exp << " ";
        std::cout << '\n';
    }
};

// 사용
Polynomial a; a.add(3, 4); a.add(5, 2); a.add(2, 0);   // 3x⁴ + 5x² + 2
Polynomial b; b.add(1, 4); b.add(7, 1);                 // x⁴ + 7x
auto c = a + b;
c.print();   // 4x⁴ + 5x² + 7x¹ + 2
```

**시간 복잡도** — 두 다항식 덧셈: O(m + n) — 양쪽을 한 번씩만 순회 (정렬되어 있으면).

## C 구현 — 다항식

```c
#include <stdio.h>
#include <stdlib.h>

typedef struct {
    int coef;
    int exp;
} Term;

typedef struct {
    Term*  terms;
    size_t count;
    size_t capacity;
} Polynomial;

void poly_init(Polynomial* p) { p->terms = NULL; p->count = 0; p->capacity = 0; }

void poly_add_term(Polynomial* p, int coef, int exp) {
    if (coef == 0) return;
    if (p->count == p->capacity) {
        p->capacity = p->capacity ? p->capacity * 2 : 4;
        p->terms = realloc(p->terms, p->capacity * sizeof(Term));
    }
    p->terms[p->count++] = (Term){coef, exp};
}

void poly_free(Polynomial* p) { free(p->terms); }
```

## 희소 행렬 — 트리플 형식

`(행, 열, 값)` 트리플의 배열, 행 우선 정렬.

```cpp
struct Triple {
    int row;
    int col;
    int value;
};

class SparseMatrix {
    int rows, cols;
    std::vector<Triple> entries;   // (row, col) 사전식 정렬
public:
    SparseMatrix(int r, int c) : rows(r), cols(c) {}

    void set(int r, int c, int v) {
        if (v != 0) entries.push_back({r, c, v});
    }

    int get(int r, int c) const {
        for (const auto& e : entries)
            if (e.row == r && e.col == c) return e.value;
        return 0;
    }
};
```

`get`이 O(n) — 빈번한 조회는 **CSR/CSC 형식**(아래)이 적합.

## 더 효율적: CSR (Compressed Sparse Row)

행렬을 3개 배열로:
- `values[]` — 0 아닌 값들
- `col_idx[]` — 각 값의 열 번호
- `row_ptr[]` — 각 행의 시작 인덱스

```
       col → 0 1 2 3
   row 0:    5 0 0 8
   row 1:    0 3 0 0
   row 2:    0 0 0 7
   row 3:    1 0 0 0

values  = [5, 8, 3, 7, 1]
col_idx = [0, 3, 1, 3, 0]
row_ptr = [0, 2, 3, 4, 5]
         행0  행1 행2 행3 끝
```

→ 행렬-벡터 곱(`Ax`)이 O(nnz) (nnz = 0 아닌 항 수).

```cpp
struct CSRMatrix {
    int rows, cols;
    std::vector<double> values;
    std::vector<int>    col_idx;
    std::vector<int>    row_ptr;   // size = rows + 1

    std::vector<double> multiply(const std::vector<double>& x) const {
        std::vector<double> y(rows, 0.0);
        for (int i = 0; i < rows; ++i)
            for (int k = row_ptr[i]; k < row_ptr[i + 1]; ++k)
                y[i] += values[k] * x[col_idx[k]];
        return y;
    }
};
```

NumPy/SciPy의 `scipy.sparse.csr_matrix`, Eigen의 SparseMatrix가 같은 패턴.

## 희소 행렬 형식 비교

| 형식 | 임의 접근 | 행렬-벡터 곱 | 행 추가 | 열 추가 |
| --- | --- | --- | --- | --- |
| **Triple (COO)** | O(n) | O(nnz) | 쉬움 | 쉬움 |
| **CSR** | O(log) — 행 안에서 binary search | O(nnz) — 빠름 | 비쌈 | 매우 비쌈 |
| **CSC** | O(log) | O(nnz) | 매우 비쌈 | 비쌈 |
| **DOK** (dict of keys) | O(1) | 느림 | 쉬움 | 쉬움 |

→ **구축은 COO/DOK, 사용은 CSR/CSC로 변환**하는 패턴이 일반적.

## 트레이드오프 — 한눈에

| 차원 | Sparse Matrix |
| --- | --- |
| 메모리 (sparse 데이터) | ✅ 큰 절약 |
| 행렬-벡터 곱 (CSR) | ✅ O(nnz) |
| 임의 접근 | ❌ O(n) ~ O(log) |
| 동적 추가/삭제 | ⚠️ 형식에 따라 |
| 단순 연산은 dense보다 복잡 | ⚠️ 코드 복잡 |

## 실제 사례

- **그래프 인접 행렬** → CSR (item 19)
- **FEM (Finite Element Method)** — 유한요소법, 큰 sparse 행렬
- **NLP** — 단어 출현 행렬 (대부분 0)
- **추천 시스템** — 사용자×아이템 행렬

## 다음

- [스택 — 미로·표현식](/blog/programming/algorithms/data-structures-and-algorithms/item06-stack)
