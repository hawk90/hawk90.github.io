---
title: "DSA 26: AVL 트리 — 회전과 균형"
date: 2026-06-08T10:00:00
description: "엄격한 균형 BST. 모든 연산 worst-case O(log n)."
tags: [Data Structure, Algorithm, BST, AVL, Balanced Tree]
series: "Data Structures and Algorithms"
seriesOrder: 26
draft: true
---

## 한 줄 요약

> **"좌·우 서브트리 높이 차이 ≤ 1 — 회전으로 강제 유지"** — BST 최악 O(n)을 O(log n)으로.

## 어떤 문제를 푸는가

[item 13 BST](/blog/programming/data-structures-and-algorithms/item13-binary-search-tree)는 평균 O(log n)이지만 **최악 O(n)** (편향 트리).

→ 균형을 강제로 유지. AVL은 **첫 self-balancing BST** (1962, Adelson-Velsky/Landis).

## AVL 속성

각 노드 v: `|height(left) - height(right)| ≤ 1`

→ 트리 높이 = O(log n) 보장.

## 회전 (Rotation)

균형 깨졌을 때 **국소 재구성**. O(1).

### 단일 회전 — Right Rotation (LL case)

```
       y                 x
      / \               / \
     x   C    →        A   y
    / \                   / \
   A   B                 B   C
```

x를 새 루트로, y의 왼쪽 자식이 x의 오른쪽 자식 자리로.

### Left Rotation (RR case)

대칭.

### 이중 회전

#### LR case — left-right

```
     z                 z                  y
    / \               / \                / \
   x   D            y   D     →        x   z
  / \              / \                / \ / \
 A   y            x   C              A  B C  D
    / \          / \
   B   C        A   B
```

x에 left rotation → z에 right rotation.

#### RL case — right-left

대칭.

## 4가지 case 결정

부모 / 자식의 균형 인자(balance factor) 부호로:

```
LL case:  ++ (left subtree heavy, left's left)
LR case:  +- (left subtree heavy, left's right)
RR case:  -- (right subtree heavy, right's right)
RL case:  -+
```

## C++ 구현

```cpp
struct Node {
    int value;
    int height;
    Node* left  = nullptr;
    Node* right = nullptr;
};

int height(Node* n) { return n ? n->height : 0; }
int balance(Node* n) { return n ? height(n->left) - height(n->right) : 0; }
void updateHeight(Node* n) {
    n->height = 1 + std::max(height(n->left), height(n->right));
}

Node* rotateRight(Node* y) {
    Node* x = y->left;
    Node* B = x->right;
    x->right = y;
    y->left  = B;
    updateHeight(y);
    updateHeight(x);
    return x;
}

Node* rotateLeft(Node* x) {
    Node* y = x->right;
    Node* B = y->left;
    y->left  = x;
    x->right = B;
    updateHeight(x);
    updateHeight(y);
    return y;
}

Node* insert(Node* node, int v) {
    if (!node) return new Node{v, 1};
    if      (v < node->value) node->left  = insert(node->left, v);
    else if (v > node->value) node->right = insert(node->right, v);
    else return node;   // 중복

    updateHeight(node);
    int bf = balance(node);

    // LL
    if (bf > 1 && v < node->left->value)  return rotateRight(node);
    // RR
    if (bf < -1 && v > node->right->value) return rotateLeft(node);
    // LR
    if (bf > 1 && v > node->left->value) {
        node->left = rotateLeft(node->left);
        return rotateRight(node);
    }
    // RL
    if (bf < -1 && v < node->right->value) {
        node->right = rotateRight(node->right);
        return rotateLeft(node);
    }
    return node;
}

class AVLTree {
    Node* root = nullptr;
public:
    void insert(int v) { root = ::insert(root, v); }
    // remove, find도 비슷한 패턴
};
```

## C 구현

```c
typedef struct AVLNode {
    int value;
    int height;
    struct AVLNode* left;
    struct AVLNode* right;
} AVLNode;

static int max_int(int a, int b) { return a > b ? a : b; }
static int height(AVLNode* n) { return n ? n->height : 0; }
static int balance(AVLNode* n) { return n ? height(n->left) - height(n->right) : 0; }
static void update(AVLNode* n) {
    n->height = 1 + max_int(height(n->left), height(n->right));
}

AVLNode* rotate_right(AVLNode* y) {
    AVLNode* x = y->left;
    y->left = x->right;
    x->right = y;
    update(y); update(x);
    return x;
}

AVLNode* rotate_left(AVLNode* x) {
    AVLNode* y = x->right;
    x->right = y->left;
    y->left = x;
    update(x); update(y);
    return y;
}

AVLNode* avl_insert(AVLNode* node, int v) {
    if (!node) {
        AVLNode* n = malloc(sizeof(AVLNode));
        n->value = v; n->height = 1; n->left = n->right = NULL;
        return n;
    }
    if (v < node->value) node->left = avl_insert(node->left, v);
    else if (v > node->value) node->right = avl_insert(node->right, v);
    else return node;

    update(node);
    int bf = balance(node);

    if (bf > 1 && v < node->left->value)   return rotate_right(node);
    if (bf < -1 && v > node->right->value) return rotate_left(node);
    if (bf > 1 && v > node->left->value) {
        node->left = rotate_left(node->left);
        return rotate_right(node);
    }
    if (bf < -1 && v < node->right->value) {
        node->right = rotate_right(node->right);
        return rotate_left(node);
    }
    return node;
}
```

## 시간 복잡도

| | 시간 |
| --- | --- |
| 검색 | **O(log n)** worst |
| 삽입 | O(log n) |
| 삭제 | O(log n) — 회전 최대 O(log n)번 |

높이 보장: `h ≤ 1.44 log(n+2) - 0.328`.

## AVL vs Red-Black

| | AVL | Red-Black |
| --- | --- | --- |
| 균형 엄격 | ✅ 더 엄격 | 덜 엄격 (높이 ≤ 2 log) |
| 검색 | ✅ 약간 빠름 | 약간 느림 |
| 삽입·삭제 | 회전 多 | 회전 少 |
| 구현 복잡 | ⚠️ | ⚠️ 비슷 |
| 표준 라이브러리 | DB 인덱스 (일부) | C++ `std::set/map`, Java TreeMap |

→ **삽입·삭제 빈번** → Red-Black, **검색 빈번** → AVL.

## 트레이드오프 — 한눈에

| 차원 | AVL Tree |
| --- | --- |
| 모든 연산 worst O(log n) | ✅ |
| 검색 빠름 | ✅ |
| 삽입·삭제 회전 많음 | ⚠️ |
| 구현 복잡 | ❌ 일반 BST의 2배 |
| 메모리 (height 저장) | ⚠️ 노드당 4~8 byte 추가 |

## 실제 사례

- **DB 인덱스** 일부 (메모리 인덱스)
- **언어 라이브러리** — 모던 언어는 보통 Red-Black
- **Linux kernel — VMA tree** (Virtual Memory Areas) 일부
- **연산 기하** 일부

## 다음

- [Red-Black 트리, Splay Tree](/blog/programming/data-structures-and-algorithms/item27-red-black-tree)
