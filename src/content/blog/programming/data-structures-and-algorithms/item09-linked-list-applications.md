---
title: "DSA 9: 연결 리스트 응용 — 다항식·GLL"
date: 2026-03-02T13:00:00
description: "다항식 덧셈, 일반화 연결 리스트(GLL)로 트리·재귀 구조 표현."
tags: [Data Structure, Algorithm, Linked List, Polynomial]
series: "Data Structures and Algorithms"
seriesOrder: 9
draft: false
---

## 한 줄 요약

> **"연결 리스트로 다항식, 그리고 리스트의 리스트로 임의 구조"** — GLL은 LISP의 자료구조 토대.

## 어떤 문제를 푸는가

### 1. 다항식 — 동적 sparse 표현

[item05](/blog/programming/data-structures-and-algorithms/item05-structures-polynomials-sparse-matrix)에서 배열로 다항식 봤음. 연결 리스트로는 **항이 동적으로 추가/삭제** 자유.

### 2. 일반화 연결 리스트 (Generalized Linked List, GLL)

리스트의 원소가 **데이터 또는 다른 리스트** — 즉 임의의 트리·재귀 구조 표현.

```
A = (a, (b, c, (d, e)), f)
```

→ LISP의 cons cell, S-expression, JSON tree 등의 토대.

## C++ 구현 — 다항식 (연결 리스트)

```cpp
struct Term {
    int   coef;
    int   exp;
    Term* next;
};

class Polynomial {
    Term* head = nullptr;

public:
    ~Polynomial() {
        while (head) {
            Term* tmp = head;
            head = head->next;
            delete tmp;
        }
    }

    // 차수 내림차순 유지
    void append(int coef, int exp) {
        if (coef == 0) return;
        Term* node = new Term{coef, exp, nullptr};
        if (!head) head = node;
        else {
            Term* cur = head;
            while (cur->next) cur = cur->next;
            cur->next = node;
        }
    }

    // 두 다항식 덧셈 — 차수 내림차순 정렬 가정
    Polynomial add(const Polynomial& other) const {
        Polynomial result;
        Term* a = head;
        Term* b = other.head;

        while (a && b) {
            if (a->exp == b->exp) {
                int sum = a->coef + b->coef;
                if (sum != 0) result.append(sum, a->exp);
                a = a->next; b = b->next;
            } else if (a->exp > b->exp) {
                result.append(a->coef, a->exp);
                a = a->next;
            } else {
                result.append(b->coef, b->exp);
                b = b->next;
            }
        }
        while (a) { result.append(a->coef, a->exp); a = a->next; }
        while (b) { result.append(b->coef, b->exp); b = b->next; }
        return result;
    }

    void print() const {
        for (Term* cur = head; cur; cur = cur->next)
            std::cout << cur->coef << "x^" << cur->exp << " ";
        std::cout << '\n';
    }
};
```

## C 구현 — 다항식

```c
typedef struct Term {
    int coef;
    int exp;
    struct Term* next;
} Term;

typedef struct {
    Term* head;
} Polynomial;

void poly_init(Polynomial* p) { p->head = NULL; }

void poly_append(Polynomial* p, int coef, int exp) {
    if (coef == 0) return;
    Term* n = malloc(sizeof(Term));
    n->coef = coef; n->exp = exp; n->next = NULL;

    if (!p->head) p->head = n;
    else {
        Term* cur = p->head;
        while (cur->next) cur = cur->next;
        cur->next = n;
    }
}

Polynomial poly_add(const Polynomial* a, const Polynomial* b) {
    Polynomial r; poly_init(&r);
    Term* p = a->head; Term* q = b->head;
    while (p && q) {
        if (p->exp == q->exp) {
            poly_append(&r, p->coef + q->coef, p->exp);
            p = p->next; q = q->next;
        } else if (p->exp > q->exp) {
            poly_append(&r, p->coef, p->exp); p = p->next;
        } else {
            poly_append(&r, q->coef, q->exp); q = q->next;
        }
    }
    while (p) { poly_append(&r, p->coef, p->exp); p = p->next; }
    while (q) { poly_append(&r, q->coef, q->exp); q = q->next; }
    return r;
}

void poly_free(Polynomial* p) {
    while (p->head) {
        Term* t = p->head;
        p->head = p->head->next;
        free(t);
    }
}
```

## 일반화 연결 리스트 (GLL)

각 노드가 두 가지 중 하나:
1. **원자(atom)** — 단순 데이터
2. **하위 리스트(sublist)** — 또 다른 리스트의 head

```
struct GLLNode {
    bool       isAtom;
    union {
        T          data;     // atom일 때
        GLLNode*   sublist;  // sublist일 때
    };
    GLLNode*   next;
};
```

### 예시

`A = (a, (b, c), d)` 의 GLL:

<img src="/images/blog/dsa/diagrams/item09-gll.svg" alt="일반화 연결 리스트 (GLL) 구조" style="max-width:100%; background:white; padding:8px; border-radius:6px;" />

## C++ 구현 — GLL (단순)

```cpp
struct GLLNode {
    bool      isAtom;
    char      data;            // atom일 때 의미
    GLLNode*  sublist;         // sublist일 때 의미 (atom일 땐 nullptr)
    GLLNode*  next;
};

GLLNode* atom(char c, GLLNode* next = nullptr) {
    return new GLLNode{true, c, nullptr, next};
}

GLLNode* list(GLLNode* sub, GLLNode* next = nullptr) {
    return new GLLNode{false, 0, sub, next};
}

// (a, (b, c), d)
GLLNode* example() {
    GLLNode* bc = atom('b', atom('c'));
    return atom('a', list(bc, atom('d')));
}

// 깊이 우선 출력
void print(GLLNode* l) {
    std::cout << "(";
    bool first = true;
    while (l) {
        if (!first) std::cout << ", ";
        if (l->isAtom) std::cout << l->data;
        else           print(l->sublist);
        first = false;
        l = l->next;
    }
    std::cout << ")";
}

print(example());   // (a, (b, c), d)
```

## 깊이 (depth) 계산 — 재귀

```cpp
int depth(GLLNode* l) {
    int maxD = 0;
    while (l) {
        if (!l->isAtom) {
            int d = 1 + depth(l->sublist);
            if (d > maxD) maxD = d;
        }
        l = l->next;
    }
    return maxD;
}
```

## 비교

```cpp
bool equal(GLLNode* a, GLLNode* b) {
    while (a && b) {
        if (a->isAtom != b->isAtom) return false;
        if (a->isAtom) {
            if (a->data != b->data) return false;
        } else {
            if (!equal(a->sublist, b->sublist)) return false;
        }
        a = a->next;
        b = b->next;
    }
    return a == nullptr && b == nullptr;
}
```

## 응용

- **LISP / Scheme의 cons cell** — GLL의 직접 구현
- **JSON / XML 파싱** — 트리 ≅ GLL
- **수식 트리** — 표현식의 자연스러운 표현
- **디렉토리 구조** — 파일 = atom, 폴더 = sublist

## 메모리 / 참조 관리

GLL은 **공유**될 수 있어 — 같은 sublist를 여러 곳에서 가리킴.

→ 직접 `delete`하면 이중 해제. **참조 카운트** 또는 **`std::shared_ptr`** 권장.

```cpp
struct GLLNode {
    bool isAtom;
    char data;
    std::shared_ptr<GLLNode> sublist;
    std::shared_ptr<GLLNode> next;
};
```

## 트레이드오프 — 한눈에

| 차원 | Linked List 응용 |
| --- | --- |
| 다항식 덧셈 (정렬됨) | ✅ O(m+n) |
| 동적 항 추가/삭제 | ✅ |
| 임의 차수 접근 | ❌ O(n) |
| GLL — 임의 구조 | ✅ 매우 일반적 |
| GLL 메모리 관리 | ⚠️ 공유 시 참조 카운트 |

## 실제 사례

- **LISP / Scheme** 프로그래밍 언어 자체
- **Mathematica** 식 표현
- **JSON / XML / YAML 파서**
- **컴파일러 AST**
- **수치 계산 라이브러리**의 다항식 (희소)

## 다음

- [이진 트리 — 정의·순회](/blog/programming/data-structures-and-algorithms/item10-binary-tree-traversal)
