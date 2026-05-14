---
title: "Chapter 6: Consensus의 보편성"
date: 2026-05-12T06:00:00
description: "CAS가 universal한 이유 — Universal Construction. 어떤 순차 객체든 wait-free 동시 객체로 변환 가능."
series: "The Art of Multiprocessor Programming"
seriesOrder: 6
tags: [parallel, concurrency, book-review, amp, universal-construction, cas, C++, C]
type: book-review
bookTitle: "The Art of Multiprocessor Programming"
bookAuthor: "Maurice Herlihy, Nir Shavit"
draft: false
---

> **The Art of Multiprocessor Programming** Chapter 6 요약
>
> 이 시리즈는 C++20/23과 C11을 사용하여 최신 문법으로 재구성했다.

## 6.1 Universal이란 무엇인가

5장에서 CAS의 Consensus Number가 ∞임을 봤다. 그것이 "universal하다"는 뜻은 다음이다.

> **CAS가 있으면 어떤 순차 객체든 wait-free 동시 객체로 만들 수 있다.**

이걸 증명하는 알고리즘이 **Universal Construction**이다. 6장의 핵심 내용.

## 6.2 기본 아이디어 — 명령의 순서 합의

순차 객체에 대한 동시 접근을 다음과 같이 본다.

```
입력: 여러 스레드가 명령을 던진다 (push, pop, enqueue, ...)
출력: 모든 스레드가 같은 명령 순서에 합의한다
```

명령의 순서가 합의되면, 그 순서대로 순차 객체에 적용하면 된다. 모든 스레드가 같은 결과를 본다.

문제는 — **여러 스레드가 동시에 명령을 던질 때 누구의 명령이 먼저인지를 어떻게 합의할 것인가**.

답: **CAS를 통한 consensus**.

## 6.3 Universal Construction — Lock-Free 버전

```cpp
// C++20: Universal Construction (Lock-Free)
#include <atomic>
#include <memory>
#include <functional>

// 명령을 표현하는 노드
template <typename T, typename R>
struct Node {
    std::function<R(T&)> operation;  // 순차 객체에 적용할 명령
    std::atomic<Node*> next{nullptr};
    std::atomic<R> result{};
    std::atomic<bool> done{false};

    explicit Node(std::function<R(T&)> op) : operation(std::move(op)) {}
};

// Universal Construction
template <typename T, typename R = void>
class UniversalConstruction {
    std::atomic<Node<T, R>*> head;
    T sequential_object;  // 순차 객체

public:
    UniversalConstruction() {
        // 센티널 노드
        head.store(new Node<T, R>(nullptr), std::memory_order_release);
    }

    R apply(std::function<R(T&)> operation) {
        auto* my_node = new Node<T, R>(operation);

        // CAS로 내 명령을 로그 끝에 붙임
        while (true) {
            Node<T, R>* current_head = head.load(std::memory_order_acquire);
            Node<T, R>* expected_next = nullptr;

            // 현재 head의 next가 null이면 내 노드를 붙임
            if (current_head->next.compare_exchange_strong(
                    expected_next, my_node,
                    std::memory_order_seq_cst,
                    std::memory_order_relaxed)) {
                // 성공: head 업데이트
                head.store(my_node, std::memory_order_release);
                break;
            } else {
                // 다른 스레드가 먼저 붙임 — head 업데이트 도움
                head.compare_exchange_strong(current_head, expected_next,
                    std::memory_order_seq_cst,
                    std::memory_order_relaxed);
            }
        }

        // 로그를 처음부터 끝까지 재생하여 결과 계산
        return replay_and_get_result(my_node);
    }

private:
    R replay_and_get_result(Node<T, R>* target) {
        // 로그 재생 로직 (실제 구현은 더 복잡)
        // 여기서는 개념적 설명
        return target->result.load(std::memory_order_acquire);
    }
};
```

```c
// C11: Universal Construction (개념적 Lock-Free)
#include <stdatomic.h>
#include <stdlib.h>
#include <stdbool.h>

// 명령 타입 (예: 스택 연산)
typedef enum { PUSH, POP } OpType;

typedef struct {
    OpType type;
    int value;
} Operation;

typedef struct Node {
    Operation op;
    _Atomic(struct Node*) next;
    _Atomic int result;
    _Atomic bool done;
} Node;

typedef struct {
    _Atomic(Node*) head;
} UniversalConstruction;

Node* node_create(Operation op) {
    Node* n = malloc(sizeof(Node));
    n->op = op;
    atomic_init(&n->next, NULL);
    atomic_init(&n->result, 0);
    atomic_init(&n->done, false);
    return n;
}

void uc_init(UniversalConstruction* uc) {
    Operation sentinel = {0, 0};
    atomic_init(&uc->head, node_create(sentinel));
}

int uc_apply(UniversalConstruction* uc, Operation op) {
    Node* my_node = node_create(op);

    // CAS로 내 명령을 로그 끝에 붙임
    while (true) {
        Node* current_head = atomic_load_explicit(&uc->head,
                memory_order_acquire);
        Node* expected_next = NULL;

        // 현재 head의 next가 null이면 내 노드를 붙임
        if (atomic_compare_exchange_strong_explicit(&current_head->next,
                &expected_next, my_node,
                memory_order_seq_cst,
                memory_order_relaxed)) {
            // 성공: head 업데이트
            atomic_store_explicit(&uc->head, my_node, memory_order_release);
            break;
        } else {
            // 다른 스레드가 먼저 붙임 — head 업데이트 도움
            atomic_compare_exchange_strong_explicit(&uc->head,
                    &current_head, expected_next,
                    memory_order_seq_cst,
                    memory_order_relaxed);
        }
    }

    // 결과 대기 및 반환
    while (!atomic_load_explicit(&my_node->done, memory_order_acquire)) {
        // spin
    }
    return atomic_load_explicit(&my_node->result, memory_order_acquire);
}
```

**핵심**:

1. 각 명령을 노드로 만든다
2. 명령들을 연결 리스트로 잇는다 (head 포인터로)
3. CAS로 head를 내 노드로 업데이트한다 — **순서 합의**
4. 합의된 순서대로 명령을 재생하면 결과가 나온다

CAS가 명령 순서에 합의하는 역할을 한다.

## 6.4 Wait-Free 보장

위 코드는 **lock-free**다 — 적어도 한 스레드는 진행한다. 그러나 **wait-free**는 아니다 — 한 스레드가 무한히 CAS 실패를 반복할 수 있다.

Wait-free로 만들려면 **helping** 메커니즘이 필요하다.

```
A가 B의 명령을 도와준다:
- A가 자기 명령을 CAS로 붙이려 시도
- B도 같은 시도를 하고 있다면
- A가 B의 명령을 먼저 붙여 줌 (도움)
- 그 다음 A 자신의 명령을 붙임
```

다른 스레드가 도와주므로 모든 스레드가 유한 시간 안에 진행한다.

### Helping의 메커니즘

각 스레드가 "announce array"에 자신의 명령을 announce한다.

```cpp
// C++20: Wait-Free Universal Construction (Helping 포함)
#include <atomic>
#include <memory>
#include <functional>
#include <array>

template <typename T, typename R, size_t N>
class WaitFreeUC {
    struct Node {
        std::function<R(T&)> operation;
        std::atomic<Node*> next{nullptr};
        std::atomic<size_t> sequence{0};
    };

    std::atomic<Node*> head;
    std::array<std::atomic<Node*>, N> announce;  // 스레드별 announce 슬롯

public:
    WaitFreeUC() {
        head.store(new Node{nullptr}, std::memory_order_release);
        for (auto& slot : announce) {
            slot.store(nullptr, std::memory_order_relaxed);
        }
    }

    R apply(size_t thread_id, std::function<R(T&)> operation) {
        auto* my_node = new Node{operation};
        announce[thread_id].store(my_node, std::memory_order_release);

        // 다른 스레드도 도와주기
        for (size_t round = 0; round < N; ++round) {
            // 가장 오래된 pending 노드 찾기
            Node* node_to_help = find_oldest_pending();
            if (node_to_help != nullptr) {
                try_to_append(node_to_help);
            }
        }

        // 내 명령이 처리될 때까지 대기
        while (my_node->sequence.load(std::memory_order_acquire) == 0) {
            // spin (실제로는 helping 계속)
        }

        announce[thread_id].store(nullptr, std::memory_order_release);
        return compute_result(my_node);
    }

private:
    Node* find_oldest_pending() {
        for (auto& slot : announce) {
            Node* n = slot.load(std::memory_order_acquire);
            if (n != nullptr && n->sequence.load(std::memory_order_acquire) == 0) {
                return n;
            }
        }
        return nullptr;
    }

    void try_to_append(Node* node) {
        Node* current_head = head.load(std::memory_order_acquire);
        Node* expected_next = nullptr;

        if (current_head->next.compare_exchange_strong(
                expected_next, node,
                std::memory_order_seq_cst,
                std::memory_order_relaxed)) {
            node->sequence.store(
                current_head->sequence.load(std::memory_order_relaxed) + 1,
                std::memory_order_release);
            head.store(node, std::memory_order_release);
        }
    }

    R compute_result(Node* node) {
        // 로그 재생하여 결과 계산
        // (실제 구현은 더 복잡)
        return R{};
    }
};
```

```c
// C11: Wait-Free Universal Construction (Helping 포함, 개념적)
#include <stdatomic.h>
#include <stdlib.h>
#include <stdbool.h>

#define MAX_THREADS 64

typedef struct Node {
    int op_type;
    int op_value;
    _Atomic(struct Node*) next;
    _Atomic size_t sequence;
} Node;

typedef struct {
    _Atomic(Node*) head;
    _Atomic(Node*) announce[MAX_THREADS];
} WaitFreeUC;

void wfuc_init(WaitFreeUC* uc) {
    Node* sentinel = malloc(sizeof(Node));
    atomic_init(&sentinel->next, NULL);
    atomic_init(&sentinel->sequence, 0);
    atomic_init(&uc->head, sentinel);

    for (int i = 0; i < MAX_THREADS; ++i) {
        atomic_init(&uc->announce[i], NULL);
    }
}

Node* find_oldest_pending(WaitFreeUC* uc) {
    for (int i = 0; i < MAX_THREADS; ++i) {
        Node* n = atomic_load_explicit(&uc->announce[i], memory_order_acquire);
        if (n != NULL &&
            atomic_load_explicit(&n->sequence, memory_order_acquire) == 0) {
            return n;
        }
    }
    return NULL;
}

void try_to_append(WaitFreeUC* uc, Node* node) {
    Node* current_head = atomic_load_explicit(&uc->head, memory_order_acquire);
    Node* expected_next = NULL;

    if (atomic_compare_exchange_strong_explicit(&current_head->next,
            &expected_next, node,
            memory_order_seq_cst,
            memory_order_relaxed)) {
        size_t new_seq = atomic_load_explicit(&current_head->sequence,
                memory_order_relaxed) + 1;
        atomic_store_explicit(&node->sequence, new_seq, memory_order_release);
        atomic_store_explicit(&uc->head, node, memory_order_release);
    }
}

int wfuc_apply(WaitFreeUC* uc, int thread_id, int op_type, int op_value) {
    Node* my_node = malloc(sizeof(Node));
    my_node->op_type = op_type;
    my_node->op_value = op_value;
    atomic_init(&my_node->next, NULL);
    atomic_init(&my_node->sequence, 0);

    atomic_store_explicit(&uc->announce[thread_id], my_node,
            memory_order_release);

    // 다른 스레드도 도와주기
    for (int round = 0; round < MAX_THREADS; ++round) {
        Node* node_to_help = find_oldest_pending(uc);
        if (node_to_help != NULL) {
            try_to_append(uc, node_to_help);
        }
    }

    // 내 명령이 처리될 때까지 대기
    while (atomic_load_explicit(&my_node->sequence, memory_order_acquire) == 0) {
        // spin
    }

    atomic_store_explicit(&uc->announce[thread_id], NULL, memory_order_release);
    return 0;  // 실제로는 결과 계산
}
```

이게 wait-free의 비용 — N 스레드가 있으면 모든 작업이 O(N) 단위로 동작한다.

## 6.5 실용성 — Universal vs 실제

Universal Construction이 보여 주는 것은 **이론적 가능성**이다. 실제로는 다음 문제들이 있다.

**1. 성능**

매 작업마다 전체 로그를 재생한다 — O(history length). 비효율적.

**2. 메모리**

명령 로그가 무한히 자란다. 가비지 컬렉션 / 압축 필요.

**3. 직접 구현 어려움**

복잡한 자료구조(우선순위 큐, 스킵 리스트 등)는 직접 lock-free 구현이 훨씬 빠르다.

실용성을 위해서는 **자료구조별 특화 lock-free 알고리즘**을 짠다. Universal Construction은 "이론상 가능" 증명용.

## 6.6 실용적 Lock-Free 예시

Universal Construction 대신 실제로 사용하는 패턴들.

```cpp
// C++20: 실용적 Lock-Free Stack
#include <atomic>
#include <memory>
#include <optional>

template <typename T>
class LockFreeStack {
    struct Node {
        T data;
        Node* next;
        explicit Node(T val) : data(std::move(val)), next(nullptr) {}
    };

    std::atomic<Node*> head{nullptr};

public:
    void push(T value) {
        Node* new_node = new Node(std::move(value));
        new_node->next = head.load(std::memory_order_relaxed);

        // CAS 루프
        while (!head.compare_exchange_weak(new_node->next, new_node,
                std::memory_order_release,
                std::memory_order_relaxed)) {
            // new_node->next가 자동으로 갱신됨
        }
    }

    std::optional<T> pop() {
        Node* old_head = head.load(std::memory_order_acquire);

        while (old_head != nullptr) {
            if (head.compare_exchange_weak(old_head, old_head->next,
                    std::memory_order_acquire,
                    std::memory_order_relaxed)) {
                T result = std::move(old_head->data);
                delete old_head;  // 주의: ABA 문제 가능
                return result;
            }
            // old_head가 자동으로 갱신됨
        }
        return std::nullopt;
    }
};
```

```c
// C11: 실용적 Lock-Free Stack
#include <stdatomic.h>
#include <stdlib.h>
#include <stdbool.h>

typedef struct StackNode {
    int data;
    struct StackNode* next;
} StackNode;

typedef struct {
    _Atomic(StackNode*) head;
} LockFreeStack;

void stack_init(LockFreeStack* s) {
    atomic_init(&s->head, NULL);
}

void stack_push(LockFreeStack* s, int value) {
    StackNode* new_node = malloc(sizeof(StackNode));
    new_node->data = value;
    new_node->next = atomic_load_explicit(&s->head, memory_order_relaxed);

    // CAS 루프
    while (!atomic_compare_exchange_weak_explicit(&s->head,
            &new_node->next, new_node,
            memory_order_release,
            memory_order_relaxed)) {
        // new_node->next가 자동으로 갱신됨
    }
}

bool stack_pop(LockFreeStack* s, int* result) {
    StackNode* old_head = atomic_load_explicit(&s->head, memory_order_acquire);

    while (old_head != NULL) {
        if (atomic_compare_exchange_weak_explicit(&s->head,
                &old_head, old_head->next,
                memory_order_acquire,
                memory_order_relaxed)) {
            *result = old_head->data;
            free(old_head);  // 주의: ABA 문제 가능
            return true;
        }
        // old_head가 자동으로 갱신됨
    }
    return false;
}
```

## 6.7 정리 — 이 챕터의 의미

이론적 결론.

> **CAS만 있으면 어떤 자료구조든 wait-free로 만들 수 있다.**

이게 lock-free / wait-free 연구의 토대다. 모든 문제가 풀릴 수 있다는 보장.

실용적 결론.

> **그러나 universal construction을 직접 쓰진 않는다. 자료구조별 특화 알고리즘을 짠다.**

7-15장이 자료구조별 특화 알고리즘을 다룬다. Universal construction은 가능성의 증명이다.

## 6.8 Lock-Free vs Wait-Free 다시

Universal Construction 맥락에서 진행 조건의 의미가 명확해진다.

- **Wait-free**: 모든 스레드가 유한 시간 안에 진행 (helping 필요)
- **Lock-free**: 적어도 한 스레드가 진행 (CAS만으로 가능)
- **Obstruction-free**: 다른 스레드가 멈춰 있을 때만 진행

실용적으로는 **lock-free**가 가장 자주 쓰인다. Wait-free는 helping 비용이 크고, obstruction-free는 보장이 너무 약하다.

## 정리

- **CAS는 universal** — 어떤 순차 객체든 wait-free 동시 객체로 변환 가능
- 메커니즘 — **명령을 로그에 CAS로 추가**, 순서 합의
- **Wait-free**를 위해서는 **helping** 필요
- 비용 — 작업당 O(history) 또는 O(N)
- 실용적으로는 자료구조별 특화 알고리즘 사용
- **존재성 증명**으로서의 가치 — 모든 문제가 해결 가능함을 보장

## 한국 개발자의 함정

```
1. *Universal construction이 실용적*이라는 오해
   - O(N) overhead로 사실상 안 씀
   - 존재성 증명일 뿐 (이론적 가치)

2. *Helping 메커니즘은 항상 필요*
   - Wait-free에만 필요
   - Lock-free는 helping 없이 가능

3. *CAS면 wait-free*라는 혼동
   - CAS 단독은 lock-free
   - Wait-free는 추가 메커니즘 필요

4. *Lock-free stack/queue가 최적*이라는 착각
   - ABA 문제 — 다음 챕터에서 다룸
   - 메모리 관리 (hazard pointers, epoch-based reclamation)
```

## C++20/23의 Lock-Free 지원

```cpp
// C++20: atomic_shared_ptr (wait-free reference counting)
#include <atomic>
#include <memory>

// C++20에서 추가된 atomic<shared_ptr<T>>
std::atomic<std::shared_ptr<int>> atomic_sp;

void example() {
    auto sp = std::make_shared<int>(42);
    atomic_sp.store(sp, std::memory_order_release);

    auto loaded = atomic_sp.load(std::memory_order_acquire);
}

// C++20: atomic_ref (기존 객체에 atomic 연산)
#include <atomic>

void atomic_ref_example() {
    int value = 0;
    std::atomic_ref<int> ref{value};

    ref.fetch_add(1, std::memory_order_relaxed);
    // value가 1이 됨
}
```

## 자기 점검

```
□ Universal construction 알고리즘 흐름?
□ Helping이 필요한 이유?
□ Lock-free / Wait-free / Obstruction-free 구분 (3번째)?
□ Universality의 *이론적 의미*?
□ 실용적 lock-free 자료구조 패턴?
□ C++20의 atomic_shared_ptr, atomic_ref?
```

## 다음 장 예고

다음 장부터 실용적 자료구조 — **스핀 락**과 contention 관리.

## 관련 항목

- [Ch 5: Consensus Number](/blog/parallel/parallel-principles/ch05-relative-power-of-synchronization)
- [Ch 7: Spin Locks](/blog/parallel/parallel-principles/ch07-spin-locks-and-contention)
- [Ch 10: Concurrent Queues](/blog/parallel/parallel-principles/ch10-concurrent-queues-and-the-aba-problem)
- [C++ Concurrency in Action Ch 7: Lock-free 자료구조](/blog/parallel/cpp-concurrency-in-action/chapter07-designing-lock-free-concurrent-data-structures)
