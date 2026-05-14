---
title: "DSA 28: B-트리 / B+ 트리 — 디스크 친화 인덱스"
date: 2026-03-02T04:00:00
description: "한 노드에 키 多 — 디스크 페이지에 최적화. 모든 RDBMS의 인덱스 토대."
tags: [Data Structure, Algorithm, B-Tree, Database]
series: "Data Structures and Algorithms"
seriesOrder: 28
draft: true
---

## 한 줄 요약

> **"디스크 한 번에 페이지(보통 4KB)를 읽으니 키도 많이 읽자"** — 한 노드에 수백 개 키.

## 어떤 문제를 푸는가

이진 탐색 트리(BST)의 노드는 키 1개·자식 2개. n개 키 → 트리 높이 log₂(n).

**디스크**에선:
- 한 번 I/O = 페이지(4~16 KB) 읽음
- 키 하나 읽으려고 한 페이지를 읽는 건 낭비
- BST는 **trees high → 많은 I/O**

→ 한 노드에 수백 개 키, 자식도 수백 개 → 트리 높이 log_t(n)으로 줄임 (t = 노드의 자식 수).

n=10⁹, t=100 → 높이 ≈ 5. **5번 디스크 read로 검색 완료**.

## B-Tree 정의 (degree t)

각 노드:
- 키 개수: **t-1 ~ 2t-1** (루트만 예외 — 최소 1)
- 자식 개수: **t ~ 2t** (또는 0 — leaf)
- 키는 정렬됨
- 자식들이 키 사이의 범위를 담당

```
          [10, 20]
         /   |    \
   [3,7] [13,17] [25,30]
```

루트: 키 2 (`10, 20`). 자식 3개. 각 자식의 키들이 부모의 키 범위에 부합.

## 검색

BST와 비슷 — 한 노드 안에서 **이진 탐색** 후 적절한 자식으로.

```cpp
Node* search(Node* x, int k) {
    int i = 0;
    while (i < x->n && k > x->keys[i]) ++i;
    if (i < x->n && k == x->keys[i]) return x;
    if (x->isLeaf) return nullptr;
    return search(x->children[i], k);
}
```

**시간**: O(t × log_t(n)) = **O(log n)** (t는 상수). 디스크 I/O = O(log_t(n)) ≈ 매우 작음.

## 삽입

leaf에 추가. 가득 차면 **분할 (split)** — 중간 키를 부모로 올림.

```
가득 찬 leaf [3, 7, 9, 13, 17] (5개, 분할)
   ↓ 분할
[3, 7]  [13, 17]
       ↑
       9가 부모로
```

부모도 가득 차면 → 부모도 분할 → 위로 전파. 루트까지 가면 트리 높이 +1 — **유일하게 높이가 증가하는 경로**.

## 삭제

복잡 — 3가지 case (leaf 삭제, 내부 노드 삭제, 부족하면 형제와 merge / 분배).

자세한 건 CLRS 18장.

## B+ Tree

B-tree의 변형, 더 흔히 사용:

- **모든 데이터(또는 포인터)는 leaf에만**
- 내부 노드는 **인덱스 (라우팅) 만**
- **Leaf끼리 연결 리스트** — range query에 유리

```
       [10, 20]              ← 내부 (라우팅)
      /   |    \
[3,7] [13,17] [25,30]         ← leaf (실제 데이터)
   ↔     ↔      ↔            ← leaf 연결
```

### 장점

- range query: leaf 따라 순회 — 매우 빠름
- 내부 노드에 키만 → fan-out ↑ → 트리 더 얕음

대부분 **DB 인덱스는 B+ tree**.

## C++ 구현 — B-Tree (개념적, 단순)

```cpp
template<int T>   // degree
class BTree {
    struct Node {
        int  keys[2 * T - 1];
        Node* children[2 * T];
        int  n = 0;
        bool isLeaf = true;
    };

    Node* root = nullptr;

public:
    Node* search(Node* x, int k) {
        int i = 0;
        while (i < x->n && k > x->keys[i]) ++i;
        if (i < x->n && k == x->keys[i]) return x;
        if (x->isLeaf) return nullptr;
        return search(x->children[i], k);
    }

    // insert / split / delete 생략 — 책 한 챕터 분량
};
```

전체 구현은 매우 길어 — 학습용으로 라이브러리 사용 권장.

## C 구현 — 검색 핵심

```c
#define T 4   // degree

typedef struct BTNode {
    int keys[2 * T - 1];
    struct BTNode* children[2 * T];
    int n;
    int is_leaf;
} BTNode;

BTNode* btree_search(BTNode* x, int k) {
    int i = 0;
    while (i < x->n && k > x->keys[i]) ++i;
    if (i < x->n && k == x->keys[i]) return x;
    if (x->is_leaf) return NULL;
    return btree_search(x->children[i], k);
}
```

## 시간 복잡도

| | 시간 (디스크 I/O) |
| --- | --- |
| 검색 | O(log_t n) |
| 삽입 | O(log_t n) |
| 삭제 | O(log_t n) |

t = 100, n = 10⁹ → 약 4-5번 I/O. RAM이라면 → O(log n).

## B-Tree vs Red-Black

| | B-Tree | Red-Black |
| --- | --- | --- |
| 노드당 키 | 수백 | 1 |
| 디스크 친화 | ✅ | ❌ |
| 메모리 인덱스 | 약간 무거움 | ✅ |
| 표준 라이브러리 | 거의 없음 (DB) | ✅ |

## 다른 변형

- **B*-Tree**: split 시 형제와 분배 → 더 균형
- **B-link Tree**: 동시성 제어 (concurrent access)
- **fractal tree** / **LSM tree**: write-heavy workload (RocksDB, Cassandra)

## 트레이드오프 — 한눈에

| 차원 | B-Tree |
| --- | --- |
| 디스크 I/O 최소화 | ✅ 핵심 강점 |
| 검색·삽입·삭제 | ✅ O(log_t n) |
| 노드 분할·병합 복잡 | ⚠️ 코드 복잡 |
| 메모리 (크기 큰 노드) | ⚠️ 페이지 단위 |

## 실제 사례

- **모든 RDBMS 인덱스** — MySQL InnoDB, PostgreSQL, Oracle, SQL Server (B+ tree)
- **파일 시스템** — NTFS, HFS+, ext4 (B+ tree 변형)
- **MongoDB 인덱스**
- **CouchDB** — B+ tree (append-only)

## 다음

- [Trie / Patricia (디지털 탐색)](/blog/programming/algorithms/data-structures-and-algorithms/item29-trie-patricia)
