---
title: "GoF 16: Iterator"
date: 2026-02-03T13:00:00
description: "컬렉션 내부 구조 노출 없이 순회 — STL의 토대."
tags: [Design Pattern, GoF, C++, C, Behavioral]
series: "GoF Design Patterns"
seriesOrder: 16
draft: true
---

## 의도

집합체(컨테이너)의 내부 표현을 노출하지 않고 그 요소를 **순차적으로 접근**할 방법을 제공합니다.

## 동기

같은 알고리즘이 vector, list, set, map 등 여러 컨테이너에 동작하려면 — 각 컨테이너의 내부 구조에 의존하면 안 됨. Iterator가 추상화 계층.

C++ STL 전체가 이 패턴 위에 구축. 알고리즘은 iterator로 작동하므로 컨테이너 종류 무관.

## 적용 가능성

- 집합체의 내부 표현을 노출하지 않고 순회하고 싶을 때
- 다양한 순회 방식을 지원하고 싶을 때 (forward, reverse, level-order)
- 다른 종류의 집합체에 대해 통일된 인터페이스를 제공하고 싶을 때

## 구조

```
   Aggregate          Iterator
   + iterator()*      + first()
        △              + next()
        │              + isDone()
        │              + currentItem()
   ConcreteAggregate         △
   + iterator() ────► ConcreteIterator
```

## 참여자

- **Iterator** — 순회 인터페이스
- **ConcreteIterator** — 특정 집합체에 대한 iterator
- **Aggregate** — iterator 생성 인터페이스
- **ConcreteAggregate** — iterator 반환

## 외부 vs 내부

- **외부 iterator**: 클라이언트가 진행 (보통 형태, STL)
- **내부 iterator**: 컨테이너가 진행, 콜백 받음 (`std::for_each`)

```cpp
// 외부
for (auto it = v.begin(); it != v.end(); ++it) { /* ... */ }

// 내부
std::for_each(v.begin(), v.end(), [](int x) { /* ... */ });
```

## C++ 구현 — 표준 인터페이스

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

// 사용 — range-for 자동 지원
LinkedList<int> list;
for (int x : list) std::cout << x << ' ';
```

## C++ 구현 — STL 알고리즘 호환

표준 iterator 트레이트(`iterator_category`, `value_type`, ...)를 정의하면 STL 알고리즘이 동작.

```cpp
LinkedList<int> list;
auto it = std::find(list.begin(), list.end(), 42);
auto count = std::count(list.begin(), list.end(), 0);
```

## C++20 변형 — 코루틴 generator

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

## 결과 (트레이드오프)

**장점**
- 컨테이너 추상화 — 알고리즘 재사용
- 동시 다중 순회 가능 (각자 iterator)
- 다양한 순회 방식 지원

**단점**
- 잘못된 사용 시 위험 (iterator invalidation, 범위 초과)
- iterator 자체 객체 비용 (보통 작음)
- 복잡한 컨테이너의 iterator 구현 어려움

## Iterator Invalidation

컨테이너가 수정되면 iterator가 무효화될 수 있음 (vector resize, list erase 등). 표준 컨테이너의 invalidation 규칙 숙지 필요.

## 변형

- **bidirectional iterator** — 양방향 (`++`, `--`)
- **random access iterator** — 임의 접근 (`+`, `-`)
- **input/output iterator** — 한 방향 단일 패스
- **reverse_iterator** — 역방향 어댑터

## 알려진 사용 사례

- C++ STL 전체
- Java Collections의 Iterator
- Python의 iterator protocol (`__iter__`, `__next__`)
- 거의 모든 모던 언어의 컬렉션

## 관련 패턴

- **[Composite (item 8)](/blog/programming/gof-design-patterns/item08-composite)** — Composite 트리를 순회하는 데 Iterator 활용
- **[Factory Method (item 3)](/blog/programming/gof-design-patterns/item03-factory-method)** — 컨테이너의 `iterator()` 자체가 Factory Method
- **[Memento (item 18)](/blog/programming/gof-design-patterns/item18-memento)** — Iterator의 상태(현재 위치)를 Memento로 저장
- **[Visitor (item 23)](/blog/programming/gof-design-patterns/item23-visitor)** — Visitor가 Iterator로 노드를 순회
