---
title: "DSA 8: 연결 리스트 — 단일·이중·원형"
date: 2026-05-15T08:00:00
description: "노드와 포인터로 연결 — 동적 크기, 중간 삽입/삭제 O(1)."
tags: [Data Structure, Algorithm, Linked List]
series: "Data Structures and Algorithms"
seriesOrder: 8
draft: true
---

## 한 줄 요약

> **"노드 + 다음 노드 포인터"** — 메모리 어디든 흩어져도 OK. 중간 삽입·삭제가 강함.

## 어떤 문제를 푸는가

배열의 약점:
- ❌ 중간 삽입·삭제 O(n) — 뒤를 다 밀어야
- ❌ 크기 변경이 어려움 (vector는 재할당 비용)

연결 리스트:
- ✅ 노드 단위 — 중간 삽입·삭제 O(1) (포인터만 바꿈)
- ✅ 동적 크기 자연스러움
- ❌ 임의 접근 O(n) — 처음부터 따라가야
- ❌ 캐시 비친화 — 노드가 메모리 흩어짐

## 한눈에 보는 구조

### 단일 연결 리스트 (Singly Linked List)

```
head → [A|·] → [B|·] → [C|·] → [D|/]
```

각 노드: `data + next 포인터`. 마지막은 `nullptr`.

### 이중 연결 리스트 (Doubly Linked List)

```
head ⇄ [/|A|·] ⇄ [·|B|·] ⇄ [·|C|·] ⇄ [·|D|/] ← tail
```

`prev`도 보유 → 양방향 순회.

### 원형 연결 리스트 (Circular Linked List)

<img src="/images/blog/dsa/diagrams/item08-linked-list.svg" alt="원형 연결 리스트" style="max-width:100%; background:white; padding:8px; border-radius:6px;" />

마지막이 head를 가리킴. round-robin에 유용.

## C++ 구현 — 단일 연결 리스트

```cpp
#include <iostream>

template<typename T>
class SinglyLinkedList {
    struct Node {
        T value;
        Node* next;
    };
    Node* head = nullptr;
    int   count = 0;

public:
    ~SinglyLinkedList() {
        while (head) {
            Node* tmp = head;
            head = head->next;
            delete tmp;
        }
    }

    void pushFront(const T& v) {
        head = new Node{v, head};
        ++count;
    }

    void pushBack(const T& v) {
        Node* node = new Node{v, nullptr};
        if (!head) head = node;
        else {
            Node* cur = head;
            while (cur->next) cur = cur->next;
            cur->next = node;
        }
        ++count;
    }

    bool remove(const T& v) {
        Node** cur = &head;
        while (*cur) {
            if ((*cur)->value == v) {
                Node* tmp = *cur;
                *cur = (*cur)->next;
                delete tmp;
                --count;
                return true;
            }
            cur = &(*cur)->next;
        }
        return false;
    }

    int size() const { return count; }

    void print() const {
        for (Node* cur = head; cur; cur = cur->next)
            std::cout << cur->value << " -> ";
        std::cout << "/\n";
    }
};
```

`remove`의 `Node**` 트릭 — 포인터의 포인터로 head 케이스도 통합 처리 (Linus Torvalds favorite).

## C++ — STL `std::forward_list` / `std::list`

```cpp
#include <forward_list>   // singly linked
#include <list>           // doubly linked

std::forward_list<int> sl;
sl.push_front(1);   // O(1) — pushFront만 있음
sl.insert_after(sl.before_begin(), 2);

std::list<int> dl;
dl.push_back(1);
dl.push_front(2);
auto it = dl.begin();
dl.insert(++it, 99);   // O(1) — iterator 위치에 삽입
```

> ⚠️ 모던 C++에선 `std::list`보다 `std::vector`가 거의 항상 빠름 — 캐시 친화. **진짜 빈번한 중간 삽입·삭제**에만 list.

## C 구현 — 단일 연결 리스트

```c
#include <stdio.h>
#include <stdlib.h>

typedef struct Node {
    int value;
    struct Node* next;
} Node;

typedef struct {
    Node* head;
    int   count;
} List;

void list_init(List* l) { l->head = NULL; l->count = 0; }

void list_push_front(List* l, int v) {
    Node* n = malloc(sizeof(Node));
    n->value = v;
    n->next = l->head;
    l->head = n;
    l->count++;
}

void list_push_back(List* l, int v) {
    Node* n = malloc(sizeof(Node));
    n->value = v;
    n->next = NULL;

    if (!l->head) { l->head = n; }
    else {
        Node* cur = l->head;
        while (cur->next) cur = cur->next;
        cur->next = n;
    }
    l->count++;
}

int list_remove(List* l, int v) {
    Node** cur = &l->head;
    while (*cur) {
        if ((*cur)->value == v) {
            Node* tmp = *cur;
            *cur = (*cur)->next;
            free(tmp);
            l->count--;
            return 1;
        }
        cur = &(*cur)->next;
    }
    return 0;
}

void list_free(List* l) {
    while (l->head) {
        Node* tmp = l->head;
        l->head = l->head->next;
        free(tmp);
    }
}
```

## C++ 구현 — 이중 연결 리스트 (핵심만)

```cpp
template<typename T>
class DoublyLinkedList {
    struct Node {
        T value;
        Node* prev;
        Node* next;
    };
    Node* head = nullptr;
    Node* tail = nullptr;

public:
    void pushBack(const T& v) {
        Node* n = new Node{v, tail, nullptr};
        if (tail) tail->next = n;
        else      head = n;
        tail = n;
    }

    void remove(Node* n) {     // O(1) — 노드 핸들이 있으면
        if (n->prev) n->prev->next = n->next;
        else         head = n->next;
        if (n->next) n->next->prev = n->prev;
        else         tail = n->prev;
        delete n;
    }
};
```

`remove`가 노드 포인터를 받으면 O(1) — 이게 list의 진짜 강점.

## 시간 복잡도 비교 — 배열 vs 리스트

| 연산 | 배열 (vector) | 단일 리스트 | 이중 리스트 |
| --- | --- | --- | --- |
| 임의 접근 | ✅ O(1) | ❌ O(n) | ❌ O(n) |
| 앞 삽입 | ❌ O(n) | ✅ O(1) | ✅ O(1) |
| 뒤 삽입 | ✅ amortized O(1) | O(n) (또는 tail 보유 시 O(1)) | ✅ O(1) |
| 중간 삽입 (위치 알 때) | ❌ O(n) | ✅ O(1) | ✅ O(1) |
| 탐색 | O(n) (정렬 시 O(log)) | O(n) | O(n) |
| 삭제 (노드 핸들) | ❌ O(n) | ✅ O(1) (prev 알면) | ✅ O(1) |
| 캐시 친화 | ✅ | ❌ | ❌ |
| 메모리 오버헤드 | 없음 | 노드당 포인터 1개 | 포인터 2개 |

## 트레이드오프 — 한눈에

| 차원 | Linked List |
| --- | --- |
| 동적 크기 | ✅ 자연스러움 |
| 중간 삽입·삭제 (위치 알 때) | ✅ O(1) |
| 임의 접근 | ❌ O(n) |
| 캐시 친화 | ❌ 매우 나쁨 |
| 메모리 오버헤드 | ❌ 포인터 + 할당자 비용 |
| 모던 CPU | ❌ 거의 항상 vector가 승 |

## 실제 사례

- **OS 자유 메모리 블록 리스트** (malloc 구현)
- **LRU 캐시** — 이중 연결 리스트 + 해시 (item 22)
- **multilevel feedback queue** (스케줄러)
- **그래프 인접 리스트** (item 19)
- **JVM/CLR 객체 GC 리스트**

## 다음

- [연결 리스트 응용 — 다항식·GLL](/blog/programming/algorithms/data-structures-and-algorithms/item09-linked-list-applications)
