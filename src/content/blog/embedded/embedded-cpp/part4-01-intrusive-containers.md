---
title: "Intrusive Containers 분석 — 동적 할당 없는 컨테이너 설계"
slug: "embedded/embedded-cpp/part4-01-intrusive-containers"
date: 2026-05-01T09:29:00
description: "객체가 자기 next pointer 보유 — 동적 할당 없는 linked list와 tree."
series: "Embedded C++ for Real Systems"
seriesOrder: 29
tags: [cpp, embedded, intrusive, linked-list, container, no-alloc]
type: tech
topics: ["embedded"]
---

## 한 줄 요약

> **"Intrusive = 객체 안에 list pointer를 박는 방식입니다."** `std::list`처럼 wrapper node를 두지 않으므로 추가 할당이 0입니다.

## 어떤 문제를 푸는가

`std::list<T>`의 내부 구조는 다음과 같습니다.

```text
[head] → [Node{prev, next, T data}] → [Node{...}] → ...
```

기본 allocator를 쓰면 각 Node의 저장 공간을 동적으로 확보하고, T 외에 두 pointer만큼 메모리가 더 필요합니다. 임베디드에는 부담이 됩니다.

**Intrusive container**는 구조가 반대입니다.

```text
[head] → [T{prev, next, other fields}] → [T{...}] → ...
```

T 자체에 prev/next pointer가 들어 있어 list node를 별도로 할당하지 않습니다.

```cpp
struct Task {
    Task* next;             // intrusive link
    int priority;
    void (*work)(void);
};

// List는 head pointer만
Task* g_pending_head = nullptr;

void add_task(Task* t) {
    t->next = g_pending_head;
    g_pending_head = t;
}
```

추가 할당이 0입니다. Linux의 list_head와 FreeRTOS의 ListItem_t처럼 객체에 link를 포함하는 구현이 있습니다. 모든 컨테이너와 연산이 같은 복잡도를 갖는다는 뜻은 아닙니다.

## Linux 커널 스타일 — `list_head`

Linux 커널의 `list.h`가 표준 idiom입니다.

```cpp
struct list_head {
    list_head* prev;
    list_head* next;
};

// 사용 — task에 list_head 임베드
struct Task {
    list_head link;     // 임베드
    int priority;
    char name[16];
};

list_head g_pending_list{&g_pending_list, &g_pending_list};   // 빈 원형 sentinel

void add_task(Task* t) {
    t->link.next = g_pending_list.next;
    t->link.prev = &g_pending_list;
    g_pending_list.next->prev = &t->link;
    g_pending_list.next = &t->link;
}

// list_head에서 Task로 변환
#define container_of(ptr, type, member) \
    (type*)((char*)(ptr) - offsetof(type, member))

void iterate() {
    for (list_head* p = g_pending_list.next;
         p != &g_pending_list;
         p = p->next) {
        Task* t = container_of(p, Task, link);
        // t 사용
    }
}
```

`container_of` 매크로가 핵심 트릭으로, `list_head*`에서 enclosing struct의 pointer를 계산합니다.

이 container_of는 Linux의 C 구현 관용구를 설명합니다. 임의의 C++ 객체에 대한 이식 가능한 복원 규칙으로 쓰지 않습니다. 아래는 enclosing pointer 계산을 피하고 member pointer와 T* link를 쓰는 대안입니다.

## C++ Template intrusive list

```cpp title="intrusive-list.h"
#pragma once
template<typename T, typename T::ListLink T::*LinkMember>
class IntrusiveList {
    T* head_ = nullptr;
    T* tail_ = nullptr;
public:
    IntrusiveList() = default;
    IntrusiveList(const IntrusiveList&) = delete;
    IntrusiveList& operator=(const IntrusiveList&) = delete;
    ~IntrusiveList() { clear(); }
    bool push_front(T* node) {
        if (!node || (node->*LinkMember).owner) return false;
        auto& link = node->*LinkMember;
        link = {nullptr, head_, this};
        if (head_) (head_->*LinkMember).prev = node;
        else tail_ = node;
        head_ = node;
        return true;
    }
    bool erase(T* node) {
        if (!node || (node->*LinkMember).owner != this) return false;
        auto& link = node->*LinkMember;
        if (link.prev) (link.prev->*LinkMember).next = link.next;
        else head_ = link.next;
        if (link.next) (link.next->*LinkMember).prev = link.prev;
        else tail_ = link.prev;
        link = {};
        return true;
    }
    void clear() { while (head_) erase(head_); }
    T* front() const { return head_; }
    struct Iterator {
        T* p;
        T& operator*() const { return *p; }
        Iterator& operator++() { p = (p->*LinkMember).next; return *this; }
        bool operator!=(const Iterator& o) const { return p != o.p; }
    };
    Iterator begin() { return {head_}; }
    Iterator end() { return {nullptr}; }
};
```

이 교육용 구현은 owner 포인터 한 개를 link에 추가해 이중 삽입·다른 list에서 erase를 거부합니다. 복사하면 head/owner 관계가 깨지므로 복사를 금지합니다. 노드는 clear 또는 container 소멸까지 살아 있어야 하며, 아직 연결된 노드를 이동·복사해 주소를 바꾸지 않습니다.


사용:

```cpp
struct Task {
    struct ListLink { Task *prev = nullptr, *next = nullptr; const void* owner = nullptr; };
    ListLink pending_link{};
    ListLink ready_link{};
    int priority;
};

Task t1, t2;  // container보다 먼저 생성하고 더 오래 유지
IntrusiveList<Task, &Task::pending_link> pending;
IntrusiveList<Task, &Task::ready_link> ready;
pending.push_front(&t1);
pending.push_front(&t2);

for (auto& t : pending) {
    process(t);
}
```

같은 Task가 서로 다른 link를 두면 두 list에 동시에 들어갈 수도 있습니다. 매우 유연한 구조입니다.

## Boost.Intrusive

Boost가 제공하는 intrusive container 라이브러리이며 임베디드 친화적입니다.

```cpp
#include <boost/intrusive/list.hpp>

namespace bi = boost::intrusive;

struct Task : public bi::list_base_hook<> {
    int priority;
};

using TaskList = bi::list<Task>;

Task t1, t2;
TaskList g_pending;  // node보다 먼저 소멸해 unlink
g_pending.push_back(t1);
g_pending.push_back(t2);

for (auto& t : g_pending) {
    process(t);
}
```

`bi::list_base_hook`이 prev/next를 포함하고, 상속만 하면 intrusive가 됩니다.

여러 list에 동시에 가입할 수도 있습니다.

```cpp
struct PendingTag;
struct ReadyTag;

struct Task : public bi::list_base_hook<bi::tag<PendingTag>>,
              public bi::list_base_hook<bi::tag<ReadyTag>> {
    int priority;
};

using PendingList = bi::list<Task, bi::base_hook<bi::list_base_hook<bi::tag<PendingTag>>>>;
using ReadyList = bi::list<Task, bi::base_hook<bi::list_base_hook<bi::tag<ReadyTag>>>>;
```

장점은 다음과 같습니다.

- Heap 사용이 0입니다.
- 선택한 hook mode에 따른 link와 검증 상태가 추가됩니다.
- node 자체를 알고 있으면 erase가 O(1)입니다.

## Intrusive vs std::list 비교

구조의 차이를 한눈에 보면 다음과 같습니다.

![std::list와 intrusive list 구조 비교](/images/blog/embedded-cpp/diagrams/part4-01-intrusive-vs-stdlist.svg)

| | `std::list<T>` | Intrusive |
| --- | --- | --- |
| 메모리 | T와 별도 node 저장 공간 | T 안의 link 저장 공간 |
| 할당 | allocator로 node 확보 | container 자체는 node를 할당하지 않음 |
| Erase | 단일 iterator erase O(1), 검색은 별도 | 연결 node를 아는 경우 O(1) |
| 다중 list 가입 | 어려움 (T를 복사) | 자연스러움 |
| Type safety | 강함 | 보통 (template으로 강화) |
| 표준 | C++98부터 | 비표준 구현/라이브러리 |

고정 주소의 객체를 여러 queue에서 빌려 쓰는 경우 intrusive가 맞을 수 있습니다. 별도 소유권·일반 값 의미·수명 관리가 필요하면 std::list와 allocator 또는 다른 고정 컨테이너가 더 단순할 수 있습니다.

## ETL의 intrusive_list

```cpp
#include <etl/intrusive_list.h>

class Task : public etl::list_link<0> {
public:
    int priority;
};

using TaskList = etl::intrusive_list<Task, etl::list_link<0>>;

Task t1, t2;
TaskList tasks;
tasks.push_back(t1);
tasks.push_back(t2);
```

ETL은 임베디드 친화적이며 Boost보다 가볍습니다.

## 다른 intrusive 자료구조

### Intrusive ordered set (RB-tree)

```cpp
// Boost.Intrusive
#include <boost/intrusive/set.hpp>

struct OrderedTask : public bi::set_base_hook<> {
    int priority;
    bool operator<(const OrderedTask& o) const { return priority < o.priority; }
};

using TaskSet = bi::set<OrderedTask>;
TaskSet sorted_tasks;
```

RB-tree로 priority가 자동 정렬되고 heap도 쓰지 않습니다.

### Intrusive hash map

```cpp
struct Item : public bi::unordered_set_base_hook<> {
    int key;
    // ...
};

using ItemMap = bi::unordered_set<Item>;
```

bucket array는 stack이나 static으로 별도 할당합니다.

## 임베디드 — RTOS Task Queue

전형적인 사용처는 RTOS scheduler의 task queue입니다.

```cpp
struct TaskTcb {
    TaskTcb* ready_next;     // intrusive ready queue
    TaskTcb* delayed_next;   // intrusive delayed queue
    uint32_t stack_ptr;
    uint32_t state;
    uint32_t priority;
    uint32_t wakeup_time;
    void (*entry)(void*);
};

static TaskTcb* g_ready_head[MAX_PRIORITY];   // priority별 queue
static TaskTcb* g_delayed_head;

void task_make_ready(TaskTcb* t) {
    t->ready_next = g_ready_head[t->priority];
    g_ready_head[t->priority] = t;
}
```

위 ready queue 앞 삽입은 O(1)입니다. 우선순위 탐색·시간순 delayed 삽입·삭제 등 scheduler의 모든 연산이 O(1)이라는 뜻은 아닙니다. 실제 RTOS 구현은 해당 버전의 list와 scheduler를 확인합니다.

## 임베디드 — Event Pool

```cpp
struct Event : public bi::list_base_hook<> {
    int type;
    uint32_t data;
};

ObjectPool<Event, 64> event_pool;
bi::list<Event> event_queue;

void post_event(int type, uint32_t data) {
    auto* e = event_pool.allocate();
    if (e) {
        e->type = type;
        e->data = data;
        event_queue.push_back(*e);
    }
}

void process_events() {
    while (!event_queue.empty()) {
        auto& e = event_queue.front();
        event_queue.pop_front();
        handle_event(e);
        event_pool.deallocate(&e);
    }
}
```

Pool에서 객체를 할당하고 intrusive list로 enqueue하는 방식이 임베디드 event-driven의 표준입니다.

## 자주 보는 함정과 안티패턴

### 1. Container의 소유권 모호
intrusive list는 node를 소유하지 않으므로 lifetime은 외부에서 관리해야 합니다. list가 소멸해도 node는 해제되지 않습니다.

```cpp
{
    Task t;
    list.push_back(t);
}   // t 소멸 — list에는 dangling pointer
```

scope를 일치시키거나 명시적으로 erase합니다.

### 2. Erase 이전 사용
```cpp
auto* t = list.front();
list.pop_front();
t->priority;   // OK (node는 살아 있음, list만 없앰)
```

intrusive 컨테이너는 list와 node가 분리되어 있으므로 위 코드는 안전합니다. 다만 node를 free한 후 사용하면 UB입니다.

### 3. Double linking
```cpp
list1.push_back(t);
list2.push_back(t);   // 같은 link 사용 — 양쪽 깨짐
```

서로 다른 link 멤버를 씁니다.

### 4. 알맞은 link tag 없음
다중 list에 가입할 때는 각자 다른 tag가 필요합니다.

### 5. Const correctness
const container iteration의 반환 타입은 API 계약에 따릅니다. Boost.Intrusive의 const_iterator는 const reference를 제공하며 intrusive라는 이유만으로 const가 무시되지는 않습니다. 위 교육용 구현은 const begin/end를 제공하지 않습니다.

### 6. Concurrent 수정
intrusive list의 push/pop은 atomic하지 않습니다. multi-task 환경에서는 mutex나 lock-free intrusive list가 필요합니다.

## 재현 — 수명과 이중 삽입 계약

```cpp title="intrusive-check.cpp"
#include "intrusive-list.h"
#include <cassert>
#include <iostream>
struct Task {
    struct ListLink { Task *prev = nullptr, *next = nullptr; const void* owner = nullptr; };
    ListLink pending{}, ready{};
    int priority = 0;
};
int main() {
    Task a{}, b{};
    IntrusiveList<Task, &Task::pending> pending, other;
    IntrusiveList<Task, &Task::ready> ready;
    assert(pending.push_front(&a));
    assert(!pending.push_front(&a) && !other.push_front(&a));
    assert(!other.erase(&a));
    assert(ready.push_front(&a));
    assert(pending.push_front(&b));
    int count = 0; for (auto& t : pending) { (void)t; ++count; }
    assert(count == 2 && pending.front() == &b);
    assert(pending.erase(&b) && pending.front() == &a);
    assert(!pending.erase(&b));
    pending.clear(); ready.clear();
    assert(pending.front() == nullptr && a.pending.owner == nullptr);
#ifdef BAD_COPY
    auto copy = pending;
#endif
    std::cout << "intrusive membership checks passed\n";
}
```

Clang 23.1.3 host에서 C++17·AddressSanitizer·UBSan으로 실행했고 정상 출력과 이중 삽입/잘못된 erase의 false 반환을 확인했습니다. BAD_COPY 정의는 삭제한 copy constructor 때문에 컴파일 실패합니다. 보드 cycle 수나 heap 포함 전체 workload의 성능 비교는 측정하지 않았습니다. 객체 저장 공간과 owner/link 메모리도 전체 RAM 예산에 포함합니다.

## 1차 자료

- [Boost.Intrusive](https://www.boost.org/doc/libs/latest/doc/html/intrusive.html) — hook, object lifetime와 const iterator 계약
- [C++ draft: list modifiers](https://eel.is/c++draft/list.modifiers) — 단일 iterator erase 복잡도
- [Linux list.h](https://github.com/torvalds/linux/blob/master/include/linux/list.h) — 원형 sentinel 초기화와 C 구현 범위

## 정리

- Intrusive 컨테이너는 객체 안에 list link를 포함하므로 node 별도 할당이 0입니다.
- Linux 커널의 `list_head`와 `container_of`가 전통적인 패턴입니다.
- C++ 라이브러리로는 Boost.Intrusive와 ETL의 intrusive_list가 있습니다.
- 서로 다른 link를 두면 다중 list 가입이 자연스럽게 가능합니다.
- RTOS scheduler, event queue, driver chain에서 표준 도구로 쓰입니다.
- 컨테이너는 객체를 소유하지 않으므로 lifetime은 외부에서 관리해야 합니다.

## 관련 항목

- [Part 3-01: 동적 할당 없이](/blog/embedded/embedded-cpp/part3-01-no-dynamic-alloc)
- [Part 3-03: Pool Allocator](/blog/embedded/embedded-cpp/part3-03-pool-allocator) — pool + intrusive
- [Part 4-02: ETL 라이브러리](/blog/embedded/embedded-cpp/part4-02-etl-library)
- [Practical RTOS Internals](/blog/embedded/rtos/practical-internals/00-preface) — RTOS 시리즈의 학습 구성

## 다음 글

[Part 4-02: ETL 라이브러리](/blog/embedded/embedded-cpp/part4-02-etl-library) — 임베디드 STL 대체. heap 없는 vector, map, queue, fsm.
