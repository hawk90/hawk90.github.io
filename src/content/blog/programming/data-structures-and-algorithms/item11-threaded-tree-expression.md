---
title: "DSA 11: 스레드 이진 트리 + 표현식 트리"
date: 2026-06-03T11:00:00
description: "null 포인터를 inorder의 다음 노드로 활용 — 스레드 트리. 표현식 트리로 수식 평가."
tags: [Data Structure, Algorithm, Threaded Tree, Expression Tree]
series: "Data Structures and Algorithms"
seriesOrder: 11
draft: true
---

## 한 줄 요약

> **"안 쓰는 NULL 포인터 자리를 inorder 후속자(successor)로"** — 스택 없이 O(1) 공간 순회.

## 어떤 문제를 푸는가

n개 노드 이진 트리에는 2n개 자식 포인터, 그러나 **n+1개가 NULL**. 아까운 공간을 활용 — inorder의 **다음 노드 (successor)**나 **이전 노드 (predecessor)**를 가리키도록.

→ 재귀·스택 없이 inorder 순회 O(1) 추가 공간.

## 스레드 이진 트리 — 노드 구조

```cpp
template<typename T>
struct ThreadedNode {
    T value;
    ThreadedNode* left;
    ThreadedNode* right;
    bool leftThread;     // true면 left가 inorder predecessor
    bool rightThread;    // true면 right가 inorder successor
};
```

- `leftThread = false` → `left`는 진짜 자식
- `leftThread = true` → `left`는 inorder 이전 노드 (스레드)

## 동작 원리

<img src="/images/blog/dsa/diagrams/item11-threaded-tree.svg" alt="스레드 이진 트리" style="max-width:100%; background:white; padding:8px; border-radius:6px;" />

## C++ 구현 — 스레드 이진 트리 inorder

스레드 트리에서 inorder 순회는 **반복문**으로 가능 (스택/재귀 X):

```cpp
template<typename T>
ThreadedNode<T>* leftmost(ThreadedNode<T>* n) {
    while (n && !n->leftThread && n->left)
        n = n->left;
    return n;
}

template<typename T>
ThreadedNode<T>* inorderSuccessor(ThreadedNode<T>* n) {
    if (n->rightThread) return n->right;       // 스레드면 직접
    return leftmost(n->right);                  // 아니면 오른쪽 서브트리의 leftmost
}

template<typename T>
void inorder(ThreadedNode<T>* root) {
    ThreadedNode<T>* cur = leftmost(root);
    while (cur) {
        std::cout << cur->value << " ";
        cur = inorderSuccessor(cur);
    }
}
```

**공간 복잡도 O(1)** — 일반 재귀 inorder는 O(h) 스택.

## C 구현

```c
typedef struct ThreadedNode {
    int value;
    struct ThreadedNode* left;
    struct ThreadedNode* right;
    int leftThread;
    int rightThread;
} ThreadedNode;

ThreadedNode* leftmost(ThreadedNode* n) {
    while (n && !n->leftThread && n->left)
        n = n->left;
    return n;
}

ThreadedNode* inorder_successor(ThreadedNode* n) {
    if (n->rightThread) return n->right;
    return leftmost(n->right);
}

void inorder(ThreadedNode* root) {
    ThreadedNode* cur = leftmost(root);
    while (cur) {
        printf("%d ", cur->value);
        cur = inorder_successor(cur);
    }
}
```

## 트레이드오프 — 스레드 트리

| 차원 | Threaded Tree |
| --- | --- |
| inorder 순회 공간 | ✅ O(1) (vs O(h)) |
| 순회 속도 | ✅ 비슷, 캐시 친화 가능 |
| 노드당 메모리 (bool 2개) | ⚠️ 작은 추가 |
| 삽입·삭제 코드 복잡 | ❌ 스레드 갱신 필요 |
| 모던 적용 | 거의 안 씀 — 메모리 충분, 재귀 OK |

> ⚠️ 모던 시스템엔 거의 안 씀 — 역사적·교육적 가치. 그러나 임베디드처럼 스택 부족 환경에선 의미.

---

## 표현식 트리 (Expression Tree)

수식을 트리로 표현 — 연산자가 내부 노드, 피연산자가 leaf.

### 예: `(3 + 4) * 2`

<img src="/images/blog/dsa/diagrams/item11-expression-tree.svg" alt="표현식 트리" style="max-width:100%; background:white; padding:8px; border-radius:6px;" />

순회 결과:
- **Inorder** (괄호 없이): 3 + 4 * 2 — 우선순위 깨짐 → 괄호 추가 필요
- **Preorder** (전위 표기): * + 3 4 2
- **Postorder** (후위 표기): 3 4 + 2 *

## C++ 구현 — 표현식 트리 평가

```cpp
struct ExprNode {
    bool      isOp;
    char      op;          // op일 때
    int       value;       // 숫자일 때
    ExprNode* left  = nullptr;
    ExprNode* right = nullptr;
};

int evaluate(ExprNode* root) {
    if (!root) return 0;
    if (!root->isOp) return root->value;     // leaf

    int l = evaluate(root->left);
    int r = evaluate(root->right);

    switch (root->op) {
        case '+': return l + r;
        case '-': return l - r;
        case '*': return l * r;
        case '/': return l / r;
    }
    return 0;
}

// (3 + 4) * 2 트리 만들기
ExprNode* num(int v)  { return new ExprNode{false, 0, v}; }
ExprNode* op(char o, ExprNode* l, ExprNode* r) {
    return new ExprNode{true, o, 0, l, r};
}

auto* expr = op('*', op('+', num(3), num(4)), num(2));
std::cout << evaluate(expr);   // 14
```

## C 구현 — 표현식 트리 평가

```c
typedef struct ExprNode {
    int isOp;
    char op;
    int value;
    struct ExprNode* left;
    struct ExprNode* right;
} ExprNode;

int evaluate(ExprNode* root) {
    if (!root) return 0;
    if (!root->isOp) return root->value;

    int l = evaluate(root->left);
    int r = evaluate(root->right);

    switch (root->op) {
        case '+': return l + r;
        case '-': return l - r;
        case '*': return l * r;
        case '/': return l / r;
    }
    return 0;
}
```

## 후위 표기식 → 표현식 트리 변환

```cpp
ExprNode* fromPostfix(const std::string& expr) {
    std::stack<ExprNode*> st;
    std::istringstream iss(expr);
    std::string token;

    while (iss >> token) {
        if (isdigit(token[0])) {
            st.push(num(std::stoi(token)));
        } else {
            ExprNode* r = st.top(); st.pop();
            ExprNode* l = st.top(); st.pop();
            st.push(op(token[0], l, r));
        }
    }
    return st.top();
}

auto* tree = fromPostfix("3 4 + 2 *");
std::cout << evaluate(tree);   // 14
```

## 응용

- **컴파일러 코드 생성** — AST의 표현식 부분
- **계산기 / 수식 입력** (그래프 도구)
- **SQL 쿼리 옵티마이저** — 쿼리 플랜 트리
- **수식 미분 / 단순화** (Mathematica)

## 트레이드오프 — 한눈에

| 차원 | Expression Tree |
| --- | --- |
| 수식 평가 (postorder) | ✅ 자연스러움 |
| 미분·단순화 | ✅ 트리 변환으로 |
| 출력 (3가지 표기) | ✅ 순회 종류로 |
| 메모리 (노드 1개/연산자·숫자) | ⚠️ 큰 식이면 노드 多 |

## 다음

- [힙 / 우선순위 큐](/blog/programming/data-structures-and-algorithms/item12-heap-priority-queue)
