---
title: "GoF 16: Iterator"
date: 2026-02-01T16:00:00
description: "컬렉션 내부 구조 노출 없이 순회 — STL의 토대."
tags: [Design Pattern, GoF, C++, C, Behavioral]
series: "GoF Design Patterns"
seriesOrder: 16
draft: false
---

## 한 줄 요약

> **"컨테이너 내부 모르고도 순회"** — STL과 모든 모던 언어 컬렉션의 토대.

## 어떤 문제를 푸는가

같은 알고리즘(`find`, `count`, `sort`)을 vector·list·set·map에 적용하고 싶지만 — 각 컨테이너의 **내부 구조**(배열, 노드, 트리, 해시 테이블)는 다릅니다.

```cpp
// Bad: 컨테이너마다 별도 구현
int findInVector(const std::vector<int>& v, int x) {
    for (std::size_t i = 0; i < v.size(); ++i)
        if (v[i] == x) return i;
    return -1;
}

int findInList(const std::list<int>& l, int x) {
    int i = 0;
    for (Node* n = l.head; n; n = n->next, ++i)
        if (n->value == x) return i;
    return -1;
}
// ... vector, list, set, map마다 반복
```

→ **Iterator** 추상화 계층. 알고리즘은 iterator로 작동하므로 컨테이너 종류와 무관해짐.

```cpp
// Good: 한 번 작성하면 모든 컨테이너에 적용
auto it = std::find(c.begin(), c.end(), x);
```

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

> ⚠️ **데이터가 정말 순서 없는 set이라면** iterator의 "순회 순서"가 의미 없을 수 있음.

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

## 자주 보는 안티패턴

### 1. Iterator invalidation 무시

```cpp
// Bad: erase 후에도 it 사용
for (auto it = v.begin(); it != v.end(); ++it) {
    if (*it == 0) v.erase(it);   // ◄── erase 후 it는 무효
}
```

**문제**: UB. 운 좋으면 crash, 운 나쁘면 데이터 손상.

**해결**: `erase`가 반환하는 다음 iterator 사용.

```cpp
for (auto it = v.begin(); it != v.end(); ) {
    if (*it == 0) it = v.erase(it);
    else ++it;
}
// 또는 C++20: std::erase(v, 0);
```

### 2. 잘못된 iterator 카테고리 선언

```cpp
// Bad: forward 능력만 있는데 random_access 선언
using iterator_category = std::random_access_iterator_tag;
// 그러나 operator+, operator[] 미구현
```

**문제**: STL이 random access라 믿고 `std::sort` 호출 → UB 또는 컴파일 에러.

**해결**: 실제 능력에 맞는 카테고리를 선언.

### 3. iterator가 컨테이너보다 오래 삶 (dangling)

```cpp
// Bad
auto get_iter() {
    std::vector<int> local = {1, 2, 3};
    return local.begin();   // ◄── 함수 끝나면 invalid
}
```

**문제**: 임시 컨테이너의 iterator는 함수 종료 시점에 dangling.

**해결**: 컨테이너 자체를 반환하거나, 호출자가 컨테이너의 수명을 책임.

### 4. `end()`를 매 반복마다 호출 (성능)

```cpp
// 의심스러움
for (auto it = c.begin(); it != c.end(); ++it) { /* ... */ }
// 컨테이너에 따라 end()가 비싸면 문제
```

**문제**: 대부분 컨테이너는 OK지만 일부 lazy/proxy 컨테이너는 `end()`가 비쌈.

**해결**: 길이가 안 변하면 캐싱.

```cpp
auto last = c.end();
for (auto it = c.begin(); it != last; ++it) { /* ... */ }
```

### 5. 무한 lazy 시퀀스에 `std::distance` 호출

```cpp
auto gen = infinite_naturals();
auto d = std::distance(gen.begin(), gen.end());   // ◄── 영원히 안 끝남
```

**해결**: `views::take(n)` 등으로 유한화.

## Modern C++ 변형

### 1. C++20 ranges — `begin/end` 직접 호출 줄이기

```cpp
#include <ranges>
#include <algorithm>

std::vector<int> v = {3, 1, 4, 1, 5, 9, 2, 6};

// 전통
std::sort(v.begin(), v.end());
auto it = std::find(v.begin(), v.end(), 4);

// ranges
std::ranges::sort(v);
auto it2 = std::ranges::find(v, 4);
```

iterator 쌍을 매번 안 적어도 됨.

### 2. C++23 coroutine generator

lazy iterator를 한 줄로.

```cpp
#include <generator>    // C++23

std::generator<int> range(int from, int to) {
    for (int i = from; i < to; ++i) co_yield i;
}

for (int i : range(0, 10)) { /* ... */ }
```

```cpp
// 무한 시퀀스도 가능
std::generator<std::uint64_t> fibonacci() {
    std::uint64_t a = 0, b = 1;
    while (true) {
        co_yield a;
        auto next = a + b;
        a = b;
        b = next;
    }
}

for (auto x : fibonacci() | std::views::take(10))
    std::cout << x << ' ';
```

### 3. Views — 합성 가능한 lazy iterator

```cpp
auto result = v
    | std::views::filter([](int x) { return x % 2 == 0; })
    | std::views::transform([](int x) { return x * x; })
    | std::views::take(5);

for (int x : result) std::cout << x << ' ';
```

중간 vector 안 만들고 lazy 평가.

### 4. Concepts로 iterator 요구 명시

```cpp
template <std::input_iterator It>
void process(It first, It last) { /* ... */ }

template <std::random_access_iterator It>
void sortInPlace(It first, It last) { /* ... */ }
```

요구 사항이 컴파일러 오류 메시지에 명확히 표시.

### 5. Sentinel — `end()`가 같은 타입일 필요 없음

```cpp
struct null_terminator_sentinel {
    bool operator==(const char* p) const { return *p == '\0'; }
};

auto s = "hello";
for (auto it = s; it != null_terminator_sentinel{}; ++it)
    std::cout << *it;
```

C-string처럼 "끝 조건이 다른" 시퀀스에 자연스러움.

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

| 카테고리 | 능력 | 대표 컨테이너 |
| --- | --- | --- |
| **input** | 단일 패스, 읽기 | `istream_iterator` |
| **output** | 단일 패스, 쓰기 | `back_inserter` |
| **forward** | 다중 패스, `++` | `forward_list` |
| **bidirectional** | + `--` | `list`, `map`, `set` |
| **random access** | + `+`, `-`, `[]`, `<` | `vector`, `deque`, `array` |
| **contiguous** (C++20) | + 메모리 연속 | `vector`, `array`, `string` |

알고리즘은 필요한 최소 카테고리로 작성 — `std::find`는 input, `std::sort`는 random access.

## 성능 — iterator vs index

`std::vector<int>` 1억 원소 합산.

| 방법 | 시간 | 비고 |
| --- | --- | --- |
| `for (int i = 0; i < n; ++i)` | 25ms | index 직접 |
| `for (auto it = v.begin(); ...)` | 25ms | random access iterator |
| `for (int x : v)` (range-for) | 25ms | iterator로 desugar |
| `std::accumulate` | 25ms | iterator 기반 |
| `std::reduce(par)` | 8ms | 병렬화 |

random access iterator는 index만큼 빠름. `forward_list`처럼 linked-list 기반은 cache miss로 느림 — 알고리즘 탓이 아닌 자료구조 탓.

## 트레이드오프 — 한눈에

| 차원 | Iterator |
| --- | --- |
| 컨테이너 추상화 | ✅ 알고리즘 재사용 |
| 동시 다중 순회 | ✅ 각자 iterator |
| 다양한 순회 방식 | ✅ |
| iterator invalidation | ⚠️ 컨테이너 수정 시 |
| 복잡한 컨테이너 iterator 구현 | ⚠️ 까다로움 |
| 카테고리 잘못 선언 | ⚠️ silent bug |

## 실제 사례

- **C++ STL** 전체 — `vector`, `list`, `map`, `set`, `unordered_map`, ...
- **Java Collections**의 `Iterator` 인터페이스
- **Python**의 iterator protocol (`__iter__`, `__next__`)
- **JavaScript**의 `Symbol.iterator`, generator function
- **Rust**의 `Iterator` trait (zero-cost, 합성 가능)
- **C# `IEnumerable<T>`** + LINQ
- 거의 모든 모던 언어의 컬렉션

## 관련 패턴

- **[Composite (item 8)](/blog/programming/design/gof-design-patterns/item08-composite)** — Composite 트리 순회에 Iterator
- **[Factory Method (item 3)](/blog/programming/design/gof-design-patterns/item03-factory-method)** — 컨테이너의 `iterator()` 자체가 Factory Method
- **[Memento (item 18)](/blog/programming/design/gof-design-patterns/item18-memento)** — Iterator의 위치를 Memento로 저장
- **[Visitor (item 23)](/blog/programming/design/gof-design-patterns/item23-visitor)** — Visitor가 Iterator로 노드 순회
- **[Pattern Relationships (item 24)](/blog/programming/design/gof-design-patterns/item24-pattern-relationships-overview)** — Iterator를 중심으로 한 순회 패턴 군집
