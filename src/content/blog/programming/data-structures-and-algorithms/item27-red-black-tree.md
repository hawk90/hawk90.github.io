---
title: "DSA 27: Red-Black Tree, Splay Tree"
date: 2026-03-08T11:00:00
description: "C++/Java 표준 컨테이너의 토대 RB 트리 + 자주 접근한 노드를 빠르게 하는 Splay."
tags: [Data Structure, Algorithm, BST, Red-Black, Splay]
series: "Data Structures and Algorithms"
seriesOrder: 27
draft: false
---

## 한 줄 요약

> **"RB 트리는 표준 라이브러리의 표준, Splay는 자주 쓴 키가 빠른 self-adjusting"**

## Red-Black Tree

### 5가지 속성

1. 모든 노드는 **빨강 또는 검정**
2. 루트는 **검정**
3. 모든 leaf (NIL) 는 **검정**
4. 빨강 노드의 두 자식은 모두 **검정** (빨강이 연속 안 됨)
5. 모든 노드에서 leaf까지 가는 모든 경로의 **검정 노드 수가 같음** (black-height)

→ 트리 높이 ≤ 2 × black-height ≤ 2 log(n+1).

### 직관

- 빨강 = "옵션", 검정 = "필수"
- 빨강이 연속 못 → 빨강끼리 떨어져 있음
- 같은 black-height → 균형 보장

### 삽입 — 5가지 case

새 노드는 **빨강**으로 삽입 (속성 5 안 깨려고). 부모도 빨강이면 속성 4 깨짐 → 색 바꾸기 + 회전으로 복구.

```
case 1: 부모 빨강 + 삼촌(uncle) 빨강
        → 부모·삼촌 검정, 조부모 빨강, 조부모를 새로운 검사 노드로 (위로 전파)

case 2/3: 부모 빨강 + 삼촌 검정 + 새 노드가 안쪽
        → 부모 회전 → case 4/5

case 4/5: 부모 빨강 + 삼촌 검정 + 새 노드가 바깥쪽
        → 부모 검정, 조부모 빨강 + 조부모 회전
```

(거울 케이스 포함 5가지.)

### 시간 복잡도

| | 시간 |
| --- | --- |
| 검색 | O(log n) |
| 삽입 | O(log n) — 회전 ≤ 2회 |
| 삭제 | O(log n) — 회전 ≤ 3회 |

회전 횟수가 AVL보다 적음 — 삽입·삭제 빈번한 경우 우수.

### C++ 구현 — 핵심만

전체 구현은 ~300줄 — 핵심 골격만:

```cpp
enum Color { RED, BLACK };

struct RBNode {
    int     value;
    Color   color = RED;
    RBNode* left   = nullptr;
    RBNode* right  = nullptr;
    RBNode* parent = nullptr;
};

class RBTree {
    RBNode* root = nullptr;
    RBNode* NIL;   // 센티넬

public:
    RBTree() {
        NIL = new RBNode{0, BLACK};
        root = NIL;
    }

    void insert(int v) {
        // 1. BST 삽입 (빨강으로)
        // 2. fixViolation — 5가지 case 처리
        // (구체 구현 길어서 생략 — CLRS 13장 참고)
    }
};
```

### C 구현

전체는 길어 — `std::map` 같은 표준 라이브러리 사용 권장. 직접 짜기보단 라이브러리 활용.

## C++ 표준 — `std::set` / `std::map`

```cpp
#include <set>
#include <map>

std::set<int> s = {3, 1, 4, 1, 5, 9, 2, 6};   // 자동 정렬, 중복 제거
for (int x : s) std::cout << x << " ";          // 1 2 3 4 5 6 9 (정렬)

std::map<std::string, int> m;
m["apple"] = 1;
m["banana"] = 2;
// inorder 순회 = 키 정렬 순서
for (auto& [k, v] : m) std::cout << k << ":" << v << "\n";
```

내부 = Red-Black Tree. 모든 연산 O(log n) 보장.

`std::unordered_set/map`은 해시 테이블 — 평균 O(1)이지만 정렬 X, 최악 O(n).

## Splay Tree

### 직관

**Self-adjusting BST**. 접근한 노드를 매번 **루트로 이동**(splay).

→ 자주 쓴 노드 = 루트 가까이 = 빠름. 캐시처럼 동작.

### Splay 연산

3가지 case (zig, zig-zig, zig-zag) 회전:

```
zig (1단계): 부모와 swap
zig-zig: 같은 방향 두 번 회전
zig-zag: 반대 방향 회전 (LR 또는 RL과 같음)
```

매 접근 후 splay → 트리 구조 변경.

### 시간 복잡도 — amortized

| | amortized |
| --- | --- |
| 검색·삽입·삭제 | O(log n) |

**개별 연산은 O(n)일 수 있지만** 평균은 O(log n). worst-case 보장은 X.

### 장점

- **자주 쓴 키 빠름** (locality 활용)
- 코드 비교적 단순 (case 3개)
- balance factor·color 같은 메타데이터 X

### 단점

- worst-case 보장 X
- 매 검색이 트리 변경 → multi-thread 어려움
- 캐시 친화 X

### 응용

- **Sleator–Tarjan original** (1985)
- **WindowsNT의 virtual memory 일부**
- **압축 알고리즘** (deflate의 dictionary)
- **연산 기하 (link-cut tree)**의 토대

## 비교 — 균형 BST 셋

| | AVL | Red-Black | Splay |
| --- | --- | --- | --- |
| 균형 | 엄격 (h ≤ 1.44 log) | 느슨 (h ≤ 2 log) | self-adjusting |
| 검색 | ✅ 가장 빠름 | 좋음 | amortized |
| 삽입 | ⚠️ 회전 多 | ✅ 회전 ≤ 2 | amortized |
| worst-case | ✅ | ✅ | ❌ — amortized만 |
| 표준 라이브러리 | 일부 | ✅ C++ STL, Java TreeMap | 거의 없음 |
| locality 활용 | ❌ | ❌ | ✅ |

## 트레이드오프 — 한눈에

| 차원 | Red-Black |
| --- | --- |
| worst-case O(log n) | ✅ |
| 삽입·삭제 회전 ≤ 3 | ✅ AVL보다 적음 |
| 표준 채택 | ✅ C++/Java/Linux kernel |
| 구현 복잡 | ❌ 매우 |

## 실제 사례

- **C++ `std::set/map`** — Red-Black
- **Java `TreeSet`/`TreeMap`** — Red-Black
- **Linux kernel `rbtree`** — IO scheduler, ext3/ext4, namespace
- **MySQL B+tree 인덱스 페이지** (B-tree 변형)

## 다음

- [B-트리 / B+ 트리 (디스크)](/blog/programming/data-structures-and-algorithms/item28-b-tree)
