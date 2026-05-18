---
title: "Part 4-01: Intrusive Containers"
date: 2026-05-16T01:00:00
description: "객체가 자기 next pointer 보유 — 동적 할당 없는 linked list와 tree."
series: "Embedded C++ for Real Systems"
seriesOrder: 29
tags: [cpp, embedded, intrusive, linked-list, container, no-alloc]
type: tech
---

## 한 줄 요약

> **"Intrusive = 객체 안에 *list pointer 박힘*."** — `std::list`의 wrapper node 없음. *zero allocation*.

## 어떤 문제를 푸는가

`std::list<T>`의 내부 구조:

```text
[head] → [Node{prev, next, T data}] → [Node{...}] → ...
```

각 *Node가 heap에 할당*. *T 외에 두 pointer 추가 메모리*. 임베디드에 부담.

**Intrusive container**는 *반대*:

```text
[head] → [T{prev, next, other fields}] → [T{...}] → ...
```

*T 자체에 prev/next pointer 포함*. list node *별도 할당 없음*.

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

*추가 할당 0*. Linux 커널, FreeRTOS 등이 *전부 intrusive*.

## Linux 커널 스타일 — `list_head`

Linux 커널의 `list.h`가 *표준 idiom*.

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

list_head g_pending_list;   // 헤드

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

`container_of` 매크로가 *핵심 트릭*. `list_head*`에서 *enclosing struct pointer* 계산.

C++로는 *template*으로 더 깔끔.

## C++ Template intrusive list

```cpp
template<typename T, typename T::ListLink T::*LinkMember>
class IntrusiveList {
    T* head_ = nullptr;
    T* tail_ = nullptr;

public:
    void push_front(T* node) {
        if (!head_) {
            head_ = tail_ = node;
            (node->*LinkMember).next = nullptr;
            (node->*LinkMember).prev = nullptr;
        } else {
            (node->*LinkMember).next = head_;
            (node->*LinkMember).prev = nullptr;
            (head_->*LinkMember).prev = node;
            head_ = node;
        }
    }

    void erase(T* node) {
        auto& link = node->*LinkMember;
        if (link.prev) (link.prev->*LinkMember).next = link.next;
        else head_ = link.next;
        if (link.next) (link.next->*LinkMember).prev = link.prev;
        else tail_ = link.prev;
    }

    T* front() const { return head_; }

    class Iterator {
        T* p_;
    public:
        Iterator(T* p) : p_(p) {}
        T& operator*() { return *p_; }
        Iterator& operator++() {
            p_ = (p_->*LinkMember).next;
            return *this;
        }
        bool operator!=(const Iterator& o) const { return p_ != o.p_; }
    };

    Iterator begin() { return {head_}; }
    Iterator end() { return {nullptr}; }
};
```

사용:

```cpp
struct Task {
    struct ListLink { Task *prev, *next; };
    ListLink pending_link;
    ListLink ready_link;
    int priority;
};

IntrusiveList<Task, &Task::pending_link> pending;
IntrusiveList<Task, &Task::ready_link> ready;

Task t1, t2;
pending.push_front(&t1);
pending.push_front(&t2);

for (auto& t : pending) {
    process(t);
}
```

*같은 Task*가 *두 list에 동시에* 들어갈 수도 (서로 다른 link). 매우 유연.

## Boost.Intrusive

Boost의 *intrusive container 라이브러리*. 임베디드 친화.

```cpp
#include <boost/intrusive/list.hpp>

namespace bi = boost::intrusive;

struct Task : public bi::list_base_hook<> {
    int priority;
};

using TaskList = bi::list<Task>;

TaskList g_pending;

Task t1, t2;
g_pending.push_back(t1);
g_pending.push_back(t2);

for (auto& t : g_pending) {
    process(t);
}
```

`bi::list_base_hook`이 *prev/next 포함*. *상속만 하면* intrusive.

여러 list에 동시 가입:

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

장점:
- *Heap 0*
- *추가 메모리 minimal* (prev/next만)
- *erase O(1)* — node 자체 알면

## Intrusive vs std::list 비교

| | `std::list<T>` | Intrusive |
| --- | --- | --- |
| 메모리 | T + Node (heap) | T 안에 link (free) |
| 할당 | 매번 heap alloc | 0 |
| Erase | O(n) (iterator로) | O(1) (node 자체로) |
| 다중 list 가입 | 어려움 (T를 복사) | 자연스러움 |
| Type safety | 강함 | 보통 (template으로 강화) |
| 표준 | C++11 | non-standard (Boost) |

임베디드에서 *intrusive가 압도적 우위*.

## ETL의 intrusive_list

```cpp
#include <etl/intrusive_list.h>

class Task : public etl::list_link<0> {
public:
    int priority;
};

using TaskList = etl::intrusive_list<Task, etl::list_link<0>>;

TaskList tasks;
Task t1, t2;
tasks.push_back(t1);
tasks.push_back(t2);
```

ETL이 *임베디드 friendly*. *Boost보다 가벼움*.

## 다른 intrusive 자료구조

### Intrusive doubly linked list (RB-tree)

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

RB-tree로 *priority 정렬 자동*. *heap 0*.

### Intrusive hash map

```cpp
struct Item : public bi::unordered_set_base_hook<> {
    int key;
    // ...
};

using ItemMap = bi::unordered_set<Item>;
```

bucket array는 *별도 stack/static 할당*.

## 임베디드 — RTOS Task Queue

전형적 사용 — *RTOS scheduler task queue*.

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

*heap 없음 + O(1) operations*. FreeRTOS, Zephyr 모두 이 패턴.

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

*Pool에서 alloc + intrusive list로 enqueue*. 임베디드 *event-driven*의 표준.

## 자주 보는 함정과 안티패턴

### 1. *Container 소유권 모호*
intrusive list는 *node를 소유하지 않음*. *외부에서 lifetime 관리*. *list 소멸 시 node 해제 안 됨*.

```cpp
{
    Task t;
    list.push_back(t);
}   // t 소멸 — list에는 dangling pointer
```
*scope 일치* 또는 *명시적 erase*.

### 2. *Erase 이전 사용*
```cpp
auto* t = list.front();
list.pop_front();
t->priority;   // OK (node는 살아 있음, list만 없앰)
```
intrusive에선 *list와 node 분리*. 이건 OK. *node를 free한 후 사용*은 UB.

### 3. *Double linking*
```cpp
list1.push_back(t);
list2.push_back(t);   // 같은 link 사용 — 양쪽 깨짐
```
*다른 link 멤버* 사용.

### 4. *알맞은 link tag 없음*
*다중 list 가입* 시 *각자 다른 tag* 필수.

### 5. *Const correctness*
intrusive container는 *node 내부 변경* — *const list iteration*에 *non-const node 변경 가능*. 주의.

### 6. *Concurrent 수정*
intrusive list의 *push/pop은 non-atomic*. multi-task에 *mutex* 또는 *lock-free intrusive list*.

## 측정 — std::list vs intrusive

같은 1000개 객체 enqueue/dequeue (STM32F4).

```text
std::list<Task>:
  push_back: ~150 cycles (heap alloc + node init)
  pop_front: ~80 cycles (heap free)
  total: ~230 ms (1000 ops × push/pop)
  heap usage: ~24 KB (Task + Node)

intrusive list<Task>:
  push_back: ~10 cycles (pointer update)
  pop_front: ~10 cycles
  total: ~20 ms
  heap usage: 0 (Task pool만)
```

*10배 이상 빠름 + heap 0*. 임베디드 *결정적 동작*.

## 정리

- Intrusive = *객체 안에 list link 포함*. *node 별도 할당 0*.
- Linux 커널 `list_head` + `container_of` — 전통 패턴.
- Boost.Intrusive, ETL의 intrusive_list — C++ 라이브러리.
- 다중 list 가입 자연 (서로 다른 link).
- *RTOS scheduler*, *event queue*, *driver chain*에 표준.
- *Container는 소유 안 함* — *외부에서 lifetime 관리*.

## 관련 항목

- [Part 3-01: 동적 할당 없이](/blog/embedded/embedded-cpp/part3-01-no-dynamic-alloc)
- [Part 3-03: Pool Allocator](/blog/embedded/embedded-cpp/part3-03-pool-allocator) — pool + intrusive
- [Part 4-02: ETL 라이브러리](/blog/embedded/embedded-cpp/part4-02-etl-library)
- [Practical RTOS Internals](/blog/embedded/rtos/practical-internals) — RTOS scheduler

## 다음 글

[Part 4-02: ETL 라이브러리](/blog/embedded/embedded-cpp/part4-02-etl-library) — *임베디드 STL 대체*. heap 없는 vector, map, queue, fsm.
