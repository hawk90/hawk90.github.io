---
title: "DSA 10: 이진 트리 — 정의와 순회"
date: 2026-03-03T10:00:00
description: "이진 트리의 정의와 4가지 순회 (preorder, inorder, postorder, level-order)."
tags: [Data Structure, Algorithm, Binary Tree, Traversal]
series: "Data Structures and Algorithms"
seriesOrder: 10
draft: false
---

## 한 줄 요약

> **"각 노드 자식이 최대 2개"** — 4가지 순회로 트리의 모든 정보를 꺼낼 수 있다.

## 어떤 문제를 푸는가

선형(배열·리스트)으론 표현하기 어려운 **계층 구조** — 파일 시스템, AST, BST, 힙, 의사결정 트리 등.

이진 트리는 가장 단순한 트리 — 모든 다른 트리의 토대.

## 정의

이진 트리 = 빈 트리이거나, **루트 + 왼쪽 서브트리 + 오른쪽 서브트리** (서브트리도 이진 트리).

재귀적 정의 → 재귀 알고리즘이 자연스러움.

## 용어

<img src="/images/blog/dsa/diagrams/item10-binary-tree-terms.svg" alt="이진 트리 용어" style="max-width:100%; background:white; padding:8px; border-radius:6px;" />

| 용어 | 의미 |
| --- | --- |
| **루트(root)** | 최상위 노드 |
| **부모(parent)** / **자식(child)** | 직접 위·아래 노드 |
| **잎(leaf)** | 자식 없는 노드 |
| **내부 노드(internal)** | 자식 있는 노드 |
| **깊이(depth)** | 루트에서 거리 |
| **높이(height)** | 가장 깊은 leaf까지 거리 |
| **레벨(level)** | depth + 1 (루트가 레벨 1) |

## 트리의 종류 (모양에 따라)

| 종류 | 정의 |
| --- | --- |
| **포화 이진 트리** (full / proper) | 모든 노드가 0 또는 2개 자식 |
| **완전 이진 트리** (complete) | 마지막 레벨 빼고 다 차고, 마지막은 왼쪽부터 |
| **균형 이진 트리** (balanced) | 좌·우 서브트리 높이 차이 ≤ 1 |
| **이진 탐색 트리** (BST) | 왼쪽 < 루트 < 오른쪽 (item 13) |
| **힙** | 부모가 자식보다 크거나(max) 작거나(min) (item 12) |

## 노드 표현

### C++

```cpp
template<typename T>
struct Node {
    T value;
    Node* left  = nullptr;
    Node* right = nullptr;
};
```

### C

```c
typedef struct Node {
    int value;
    struct Node* left;
    struct Node* right;
} Node;

Node* node_new(int v) {
    Node* n = malloc(sizeof(Node));
    n->value = v;
    n->left = n->right = NULL;
    return n;
}
```

## 4가지 순회

<img src="/images/blog/dsa/diagrams/item10-expr-tree-eval.svg" alt="표현식 트리 평가" style="max-width:100%; background:white; padding:8px; border-radius:6px;" />

| 순회 | 순서 | 결과 |
| --- | --- | --- |
| **Preorder** (전위) | 루트 → 왼쪽 → 오른쪽 | 1, 2, 4, 5, 3, 6 |
| **Inorder** (중위) | 왼쪽 → 루트 → 오른쪽 | 4, 2, 5, 1, 3, 6 |
| **Postorder** (후위) | 왼쪽 → 오른쪽 → 루트 | 4, 5, 2, 6, 3, 1 |
| **Level-order** (레벨) | 레벨별 (BFS) | 1, 2, 3, 4, 5, 6 |

## C++ 구현 — 재귀 순회

```cpp
template<typename T>
void preorder(Node<T>* root) {
    if (!root) return;
    std::cout << root->value << " ";
    preorder(root->left);
    preorder(root->right);
}

template<typename T>
void inorder(Node<T>* root) {
    if (!root) return;
    inorder(root->left);
    std::cout << root->value << " ";
    inorder(root->right);
}

template<typename T>
void postorder(Node<T>* root) {
    if (!root) return;
    postorder(root->left);
    postorder(root->right);
    std::cout << root->value << " ";
}
```

## 반복 순회 — 명시적 스택

재귀 대신 스택으로:

```cpp
template<typename T>
void preorderIterative(Node<T>* root) {
    std::stack<Node<T>*> st;
    if (root) st.push(root);

    while (!st.empty()) {
        Node<T>* n = st.top(); st.pop();
        std::cout << n->value << " ";
        if (n->right) st.push(n->right);   // 오른쪽 먼저 push
        if (n->left)  st.push(n->left);    // 왼쪽 나중 (top에서 먼저 pop됨)
    }
}
```

## Level-order — 큐 사용 (BFS)

```cpp
template<typename T>
void levelOrder(Node<T>* root) {
    if (!root) return;
    std::queue<Node<T>*> q;
    q.push(root);

    while (!q.empty()) {
        Node<T>* n = q.front(); q.pop();
        std::cout << n->value << " ";
        if (n->left)  q.push(n->left);
        if (n->right) q.push(n->right);
    }
}
```

## C 구현 — 재귀 순회

```c
void preorder(Node* root) {
    if (!root) return;
    printf("%d ", root->value);
    preorder(root->left);
    preorder(root->right);
}

void inorder(Node* root) {
    if (!root) return;
    inorder(root->left);
    printf("%d ", root->value);
    inorder(root->right);
}

void postorder(Node* root) {
    if (!root) return;
    postorder(root->left);
    postorder(root->right);
    printf("%d ", root->value);
}
```

## 시간 복잡도

모든 순회: **O(n)** — 모든 노드 한 번씩 방문.
공간: **O(h)** — 재귀 깊이 = 트리 높이. 균형이면 O(log n), 최악(편향)이면 O(n).

## 응용

| 순회 | 자주 쓰는 곳 |
| --- | --- |
| **Preorder** | 트리 복제, 디렉토리 트리 출력 |
| **Inorder** | BST에서 정렬된 순서로 |
| **Postorder** | 트리 삭제, 후위 표기식, 표현식 평가 |
| **Level-order** | BFS, 가장 가까운 노드 찾기 |

### 표현식 트리 평가 (Postorder)

<img src="/images/blog/dsa/diagrams/item10-expression-tree.svg" alt="이진 표현식 트리" style="max-width:100%; background:white; padding:8px; border-radius:6px;" />

```cpp
int eval(Node* root) {
    if (!root->left && !root->right) return root->value;   // leaf = 숫자
    int l = eval(root->left);
    int r = eval(root->right);
    switch (root->op) {
        case '+': return l + r;
        case '-': return l - r;
        case '*': return l * r;
        case '/': return l / r;
    }
}
```

## 트레이드오프 — 한눈에

| 차원 | Binary Tree |
| --- | --- |
| 계층 표현 | ✅ 자연스러움 |
| 순회 4가지 패턴 | ✅ |
| 재귀 친화 | ✅ |
| 스택 깊이 (편향 트리) | ⚠️ O(n) — overflow 위험 |
| 메모리 (포인터 2개/노드) | ⚠️ 노드당 16~24 byte 오버헤드 |

## 실제 사례

- **AST** (컴파일러)
- **DOM**
- **파일 시스템** 트리
- **의사결정 트리**, **게임 트리** (체스 minimax)
- **인덱스 트리** (DB의 B-tree, item 28)

## 다음

- [스레드 이진 트리, 표현식 트리](/blog/programming/algorithms/data-structures-and-algorithms/item11-threaded-tree-expression)
