---
title: "DSA 13: 이진 탐색 트리 (BST)"
date: 2026-03-03T13:00:00
description: "왼쪽 < 루트 < 오른쪽 — 평균 O(log n) 검색·삽입·삭제, 그러나 최악 O(n)."
tags: [Data Structure, Algorithm, BST, Tree]
series: "Data Structures and Algorithms"
seriesOrder: 13
draft: false
---

## 한 줄 요약

> **"왼쪽은 작고 오른쪽은 크다"** — 정렬된 데이터 검색·삽입·삭제 평균 O(log n).

## 어떤 문제를 푸는가

- **정렬된 데이터** 검색
- **삽입·삭제도 빈번**한 경우 (정렬된 배열은 삽입 O(n))
- **순서대로 순회** 가능 (inorder)

배열은 정렬·검색 OK지만 삽입 O(n). 해시 테이블은 평균 O(1)이지만 정렬 X. **BST는 절충**.

## BST 속성

모든 노드 v에 대해:
- 왼쪽 서브트리의 모든 노드 < v.value
- 오른쪽 서브트리의 모든 노드 > v.value

→ **inorder로 순회하면 정렬된 순서**.

## 한눈에 보는 구조

```
        30
       /  \
      20   50
     /     / \
    10    40  60
```

- 검색: 비교하며 좌/우로 — 평균 O(log n)
- 삽입: 검색 후 leaf로 — 평균 O(log n)
- 삭제: 좀 까다로움 (3가지 케이스)

## C++ 구현

```cpp
template<typename T>
class BST {
    struct Node {
        T value;
        Node* left  = nullptr;
        Node* right = nullptr;
    };
    Node* root = nullptr;

public:
    ~BST() { destroy(root); }

    void insert(const T& v) { root = insertNode(root, v); }

    bool contains(const T& v) const { return findNode(root, v) != nullptr; }

    void remove(const T& v) { root = removeNode(root, v); }

    void inorder() const { inorderNode(root); std::cout << '\n'; }

private:
    Node* insertNode(Node* n, const T& v) {
        if (!n) return new Node{v};
        if (v < n->value) n->left = insertNode(n->left, v);
        else if (v > n->value) n->right = insertNode(n->right, v);
        // v == n->value면 중복 무시 (또는 cnt++)
        return n;
    }

    Node* findNode(Node* n, const T& v) const {
        if (!n || n->value == v) return n;
        return v < n->value ? findNode(n->left, v) : findNode(n->right, v);
    }

    Node* findMin(Node* n) const {
        while (n->left) n = n->left;
        return n;
    }

    Node* removeNode(Node* n, const T& v) {
        if (!n) return nullptr;
        if (v < n->value) n->left = removeNode(n->left, v);
        else if (v > n->value) n->right = removeNode(n->right, v);
        else {
            // 케이스 1, 2: 자식 0 또는 1
            if (!n->left)  { Node* r = n->right; delete n; return r; }
            if (!n->right) { Node* l = n->left;  delete n; return l; }
            // 케이스 3: 자식 2개 — successor (오른쪽 서브트리의 최솟값) 가져오기
            Node* succ = findMin(n->right);
            n->value = succ->value;
            n->right = removeNode(n->right, succ->value);
        }
        return n;
    }

    void inorderNode(Node* n) const {
        if (!n) return;
        inorderNode(n->left);
        std::cout << n->value << " ";
        inorderNode(n->right);
    }

    void destroy(Node* n) {
        if (!n) return;
        destroy(n->left);
        destroy(n->right);
        delete n;
    }
};

// 사용
BST<int> tree;
for (int v : {30, 20, 50, 10, 40, 60}) tree.insert(v);
tree.inorder();   // 10 20 30 40 50 60
tree.remove(30);
tree.inorder();   // 10 20 40 50 60
```

## 삭제의 3가지 케이스

<img src="/images/blog/dsa/diagrams/item13-bst-skewed.svg" alt="치우친 BST" style="max-width:100%; background:white; padding:8px; border-radius:6px;" />

## C 구현

```c
#include <stdio.h>
#include <stdlib.h>

typedef struct Node {
    int value;
    struct Node* left;
    struct Node* right;
} Node;

Node* node_new(int v) {
    Node* n = malloc(sizeof(Node));
    n->value = v; n->left = n->right = NULL;
    return n;
}

Node* bst_insert(Node* root, int v) {
    if (!root) return node_new(v);
    if      (v < root->value) root->left  = bst_insert(root->left, v);
    else if (v > root->value) root->right = bst_insert(root->right, v);
    return root;
}

Node* bst_find(Node* root, int v) {
    if (!root || root->value == v) return root;
    return v < root->value ? bst_find(root->left, v)
                           : bst_find(root->right, v);
}

Node* bst_min(Node* root) {
    while (root->left) root = root->left;
    return root;
}

Node* bst_remove(Node* root, int v) {
    if (!root) return NULL;
    if      (v < root->value) root->left  = bst_remove(root->left, v);
    else if (v > root->value) root->right = bst_remove(root->right, v);
    else {
        if (!root->left)  { Node* r = root->right; free(root); return r; }
        if (!root->right) { Node* l = root->left;  free(root); return l; }
        Node* succ = bst_min(root->right);
        root->value = succ->value;
        root->right = bst_remove(root->right, succ->value);
    }
    return root;
}

void bst_inorder(Node* root) {
    if (!root) return;
    bst_inorder(root->left);
    printf("%d ", root->value);
    bst_inorder(root->right);
}
```

## 균형 문제 — 최악 O(n)

순서대로 1, 2, 3, 4, 5 삽입하면:

<img src="/images/blog/dsa/diagrams/item13-bst-delete.svg" alt="BST 삭제 3가지 케이스" style="max-width:100%; background:white; padding:8px; border-radius:6px;" />

→ 사실상 연결 리스트. 검색 O(n).

→ **균형 BST**(AVL, Red-Black)가 필요 — [item 26](/blog/programming/data-structures-and-algorithms/item26-avl-tree), [item 27](/blog/programming/data-structures-and-algorithms/item27-red-black-tree).

## 시간 복잡도

| 연산 | 평균 (균형) | 최악 (편향) |
| --- | --- | --- |
| 검색 | O(log n) | O(n) |
| 삽입 | O(log n) | O(n) |
| 삭제 | O(log n) | O(n) |
| inorder | O(n) | O(n) |
| min/max | O(log n) | O(n) |

## 트레이드오프 — 한눈에

| 차원 | BST |
| --- | --- |
| 정렬된 순회 (inorder) | ✅ O(n) |
| 검색·삽입·삭제 (균형) | ✅ O(log n) |
| 삭제 구현 | ⚠️ 복잡 (3가지 케이스) |
| 균형 보장 X | ❌ 최악 O(n) — 균형 BST 필요 |
| 메모리 (포인터 2개/노드) | ⚠️ |

## 실제 사례

- 학습 목적 — 직접 쓰기보단 균형 BST의 토대
- **C++ `std::set`/`std::map`** — Red-Black 트리 (균형 BST)
- **Java `TreeMap`/`TreeSet`** — Red-Black

## 다음

- [선택 트리, 포레스트, 집합 표현](/blog/programming/data-structures-and-algorithms/item14-selection-tree-forest-set)
