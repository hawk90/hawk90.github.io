---
title: "GoF 16: Iterator"
date: 2026-02-03T13:00:00
description: "컬렉션 내부 구조 노출 없이 순회 — STL의 토대."
tags: [Design Pattern, GoF, C++, C, Behavioral]
series: "GoF Design Patterns"
seriesOrder: 16
draft: true
---

> **초안** — 정리 진행 중

## 의도

집합체(컨테이너)의 내부 표현을 노출하지 않고 **요소를 순차 접근**할 수 있는 방법 제공.

## STL의 토대

C++ STL 전체가 이 패턴 위에 구축. 각 컨테이너는 자체 `iterator` 타입 제공, 알고리즘은 iterator로 작동 — 컨테이너 종류 무관.

## C++ 구현 — 표준 iterator 인터페이스

```cpp
template<typename T>
class LinkedList {
    struct Node { T value; Node* next; };
    Node* head = nullptr;
public:
    class iterator {
        Node* current;
    public:
        explicit iterator(Node* n) : current(n) {}
        T& operator*() const { return current->value; }
        iterator& operator++() { current = current->next; return *this; }
        bool operator!=(const iterator& other) const { return current != other.current; }
    };

    iterator begin() { return iterator(head); }
    iterator end()   { return iterator(nullptr); }
};

// 사용
LinkedList<int> list;
for (int x : list) {       // range-for — iterator 자동 사용
    std::cout << x << ' ';
}
```

range-for는 `begin()`/`end()`만 있으면 동작.

## 외부 vs 내부 iterator

- **외부**: 클라이언트가 진행 (보통 형태 — STL)
- **내부**: 컨테이너가 진행, 콜백을 받음 (`std::for_each`)

```cpp
std::vector<int> v;
std::for_each(v.begin(), v.end(), [](int x) { /* ... */ });   // 내부 (스타일)
```

## 변형 — generator (코루틴)

C++20 코루틴으로 lazy iterator 구현 가능. Python `yield`와 비슷.

```cpp
std::generator<int> range(int from, int to) {
    for (int i = from; i < to; ++i) co_yield i;
}
```

## C 구현

```c
typedef struct {
    Node* current;
} ListIterator;

ListIterator list_begin(LinkedList* l) {
    return (ListIterator){l->head};
}

int list_next(ListIterator* it, int* out) {
    if (!it->current) return 0;
    *out = it->current->value;
    it->current = it->current->next;
    return 1;
}

// 사용
ListIterator it = list_begin(list);
int val;
while (list_next(&it, &val)) {
    /* 처리 */
}
```

## 트레이드오프

- **장점**: 컨테이너 추상화, 알고리즘 재사용
- **단점**: 잘못된 사용 시 위험 (invalidation, 범위 초과)
