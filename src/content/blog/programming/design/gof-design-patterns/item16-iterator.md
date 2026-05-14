---
title: "GoF 16: Iterator"
date: 2026-02-01T16:00:00
description: "컬렉션 내부 구조 노출 없이 순회 — STL의 토대."
tags: [Design Pattern, GoF, C++, C, Behavioral]
series: "GoF Design Patterns"
seriesOrder: 16
draft: true
---

## 한 줄 요약

> **"컨테이너 내부 모르고도 순회"** — STL과 모든 모던 언어 컬렉션의 토대.

## 어떤 문제를 푸는가

같은 알고리즘(`find`, `count`, `sort`)을 vector·list·set·map에 적용하고 싶지만 — 각 컨테이너의 **내부 구조**(배열, 노드, 트리, 해시 테이블)는 다릅니다.

→ **Iterator** 추상화 계층. 알고리즘은 iterator로 작동하므로 컨테이너 종류와 무관해짐.

C++ STL 전체가 이 패턴 위에 있습니다.

## 한눈에 보는 구조

<img src="/images/blog/gof/diagrams/item16-iterator.svg" alt="Iterator 패턴 클래스 다이어그램" style="max-width:100%; background:white; padding:8px; border-radius:6px;" />

컨테이너가 **자신의 iterator를 반환** → 클라이언트는 iterator로만 작업.

## 외부 vs 내부 iterator

| 외부 | 내부 |
| --- | --- |
| 클라이언트가 진행 (`++it`) | 컨테이너가 진행, 콜백 받음 |
| STL 일반 iterator | `std::for_each` |
| 유연 (어디서든 멈출 수 있음) | 단순 |

## 언제 쓰면 좋은가

- 집합체의 내부 표현을 노출하지 않고 순회하고 싶을 때
- 다양한 순회 방식 지원 (forward, reverse, level-order)
- 다른 종류의 집합체에 대해 **통일된 인터페이스** 제공

## 언제 쓰면 안 되나

> ⚠️ **iterator invalidation** — 컨테이너 수정 시 iterator 무효화. 표준 컨테이너의 invalidation 규칙 숙지 필수.

> ⚠️ **단일 패스만 필요**하면 그냥 `for` + index도 충분.

## C++ 구현 — 표준 인터페이스

### 1. 컨테이너 + iterator 클래스

```cpp
template<typename T>
class LinkedList {
    struct Node { T value; Node* next; };
    Node* head = nullptr;

public:
    class iterator {
        Node* current;
    public:
        using iterator_category = std::forward_iterator_tag;
        using value_type        = T;
        using difference_type   = std::ptrdiff_t;
        using pointer           = T*;
        using reference         = T&;

        explicit iterator(Node* n) : current(n) {}

        T&        operator*()  const { return current->value; }
        iterator& operator++()       { current = current->next; return *this; }
        iterator  operator++(int)    { auto tmp = *this; ++(*this); return tmp; }

        bool operator==(const iterator& o) const { return current == o.current; }
        bool operator!=(const iterator& o) const { return current != o.current; }
    };

    iterator begin() { return iterator(head); }
    iterator end()   { return iterator(nullptr); }
};
```

표준 트레이트(`iterator_category`, `value_type`)를 정의하면 STL 알고리즘이 자동으로 동작.

### 2. 사용 — range-for 자동 지원

```cpp
LinkedList<int> list;
for (int x : list) std::cout << x << ' ';   // ◄── begin/end만 있으면 됨
```

### 3. STL 알고리즘 호환

```cpp
auto it    = std::find(list.begin(), list.end(), 42);
auto count = std::count(list.begin(), list.end(), 0);
```

## C++20 변형 — 코루틴 generator

lazy iterator를 한 줄로.

```cpp
#include <generator>    // C++23

std::generator<int> range(int from, int to) {
    for (int i = from; i < to; ++i) co_yield i;
}

for (int i : range(0, 10)) { /* ... */ }
```

## C 구현

```c
typedef struct {
    Node* current;
} ListIterator;

ListIterator list_begin(LinkedList* l) {
    return (ListIterator){l->head};
}

int list_iter_done(ListIterator* it) {
    return it->current == NULL;
}

int list_iter_value(ListIterator* it) {
    return it->current->value;
}

void list_iter_next(ListIterator* it) {
    it->current = it->current->next;
}

// 사용
ListIterator it = list_begin(list);
while (!list_iter_done(&it)) {
    int v = list_iter_value(&it);
    /* 처리 */
    list_iter_next(&it);
}
```

## Iterator 카테고리 (C++ STL)

| 카테고리 | 능력 |
| --- | --- |
| **input** | 단일 패스, 읽기 |
| **output** | 단일 패스, 쓰기 |
| **forward** | 다중 패스, `++` |
| **bidirectional** | + `--` |
| **random access** | + `+`, `-`, `[]` |

## 트레이드오프 — 한눈에

| 차원 | Iterator |
| --- | --- |
| 컨테이너 추상화 | ✅ 알고리즘 재사용 |
| 동시 다중 순회 | ✅ 각자 iterator |
| 다양한 순회 방식 | ✅ |
| iterator invalidation | ⚠️ 컨테이너 수정 시 |
| 복잡한 컨테이너 iterator 구현 | ⚠️ 까다로움 |

## 실제 사례

- **C++ STL** 전체
- **Java Collections**의 `Iterator`
- **Python**의 iterator protocol (`__iter__`, `__next__`)
- 거의 모든 모던 언어의 컬렉션

## 관련 패턴

- **[Composite (item 8)](/blog/programming/design/gof-design-patterns/item08-composite)** — Composite 트리 순회에 Iterator
- **[Factory Method (item 3)](/blog/programming/design/gof-design-patterns/item03-factory-method)** — 컨테이너의 `iterator()` 자체가 Factory Method
- **[Memento (item 18)](/blog/programming/design/gof-design-patterns/item18-memento)** — Iterator의 위치를 Memento로 저장
- **[Visitor (item 23)](/blog/programming/design/gof-design-patterns/item23-visitor)** — Visitor가 Iterator로 노드 순회
