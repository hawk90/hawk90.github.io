---
title: "Chapter 6: Consensus의 보편성"
date: 2026-05-06T06:00:00
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

## 들어가며 — *합의 한 가지로* 모든 것이 만들어진다

위원회로 다시 돌아가 보자. 회의실에 의장이 한 명 앉아 있고, 그가 할 줄 아는 일은 단 하나 — *모두가 동의하는 결정* 한 번을 내리는 것이다. 그가 큐를 다룰 줄도, 스택을 쌓을 줄도, 우선순위를 정렬할 줄도 모른다. 단지 "이 안건에 대해 모두 같은 답을 내자"라는 한 가지만 한다.

놀라운 사실은 이것이다. **이 의장 한 명만 있으면, 어떤 회의 절차도, 어떤 자료구조도, 어떤 동기화 객체도 만들 수 있다.** 큐, 스택, 우선순위 큐, 해시 테이블, 데이터베이스 트랜잭션 — 전부 의장의 단일 능력 위에 세울 수 있다.

이것이 *보편성*(universality)이다. 5장에서 CAS의 consensus number가 무한대임을 봤다. 6장은 그 결과의 의미를 본격적으로 펼친다 — CAS 한 가지로 *모든* wait-free 동시 객체가 구현 가능하다.

핵심 비유 세 가지로 이 챕터의 전체 그림이 잡힌다.

- **Universal construction은 위원회 의장의 회의 운영법이다.** 의장은 회의록을 쥐고 있다. 누가 어떤 발언을 하든, 의장이 *합의된 순서*로 회의록에 적는다. 모든 위원이 같은 회의록을 들여다보면, 같은 결과를 추론한다. 회의의 종류 — 큐, 스택, 트랜잭션 — 가 무엇이든 운영법은 같다.
- **Operation log는 그 회의록 자체다.** 각 작업이 한 줄로 추가되고, 줄들이 시간 순서로 이어진다. 회의록의 첫 줄부터 자기 줄까지 *재생*하면, 그 시점의 객체 상태가 나오고, 자기 작업의 결과도 거기서 결정된다.
- **Helping mechanism은 동료의 일을 대신 적어 주는 협력이다.** 빠른 위원이 느린 위원의 발언을 회의록에 먼저 옮겨 적는다. 그래야 느린 위원도 "내 발언이 결국 기록된다"는 보장 — *wait-freedom* — 을 받는다. 도움 없이 각자가 자기 발언만 적으면, 한 위원이 영원히 차례를 못 잡는 starvation이 가능하다.

이 세 조각이 합쳐지면 — 의장 한 명(CAS), 한 권의 회의록(operation log), 모두가 서로의 발언을 도와 적기(helping) — *어떤 순차 명세*든 wait-free 동시 객체로 자동 변환된다. 이게 universal construction이다.

그러나 6장의 마지막 메시지는 다음과 같다. **이 우아한 보편성은 *이론*의 영광이지 *실용*의 도구가 아니다.** 회의록을 모두가 매번 처음부터 재생하면, 회의가 길어질수록 비용이 폭증한다. 실용에서는 자료구조 하나하나마다 *전용 lock-free 알고리즘*을 짠다. 그럼에도 universal construction은 "모든 문제가 풀린다"는 *존재성 증명*으로 영원한 가치를 갖는다.

## 6.1 Universal이란 무엇인가

5장에서 CAS의 Consensus Number가 ∞임을 봤다. 그것이 "universal하다"는 뜻은 다음이다.

> **CAS가 있으면 어떤 순차 객체든 wait-free 동시 객체로 만들 수 있다.**

이걸 증명하는 알고리즘이 **Universal Construction**이다. 6장의 핵심 내용.

### Universal Object의 형식 정의

책의 **Section 6.2**에서 universal object를 다음과 같이 정의한다.

**주어진 것:**

- sequential object S — 순차 명세 (state + operations)
- consensus object    — wait-free consensus 구현 (CAS로 만들 수 있음)

**목표:**

- S의 *linearizable + wait-free* 동시 구현 C(S)를 만드는 일반적 절차.

**"보편적"의 의미:**

- *어떤 sequential object S에 대해서도* 동일한 절차로 C(S) 생성 가능.
- S의 내부 의미에 의존하지 않음 — operation의 응답을
- 순차 명세에 따라 계산할 수 있다는 사실만 요구.

이는 *알고리즘적 환원*이다. consensus와 read/write만 있으면, 다른 모든 동기화 원시는 불필요하다 — 순차 명세를 가지고 일관되게 적용하면 된다.

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

### 자료구조 — Operation Log

이 구조를 정리하면 다음과 같다.

```text
operation log =  단방향 linked list of nodes

  Node 구성:
    op       : function (T&) → R                # 순차 객체에 적용할 명령
    next     : atomic<Node*>                    # 다음 명령
    seq      : atomic<size_t>                   # 합의된 순서 번호 (0 = pending)
    invoker  : thread id                        # 누가 호출했는지
    result   : atomic<R>                        # 계산된 결과 (op 결과)

  Head 포인터:
    head : atomic<Node*>                        # 마지막으로 합의된 노드

  Sentinel 시작 노드:
    head 초기값 = sentinel (seq = 0, op = no-op)
```

각 스레드가 한 작업을 수행할 때, 자기 노드를 만들어 announce 슬롯에 넣고, 모든 스레드가 함께 협력하여 **하나의 일관된 순서**를 만든다.

**실행 흐름:**

- 1. thread t가 op_t를 만든다 → my_node_t
- 2. my_node_t를 announce[t]에 둔다 (다른 스레드도 도와줄 수 있도록)
- 3. 가장 오래된 pending op을 찾아 list에 append (CAS) — 자기 것이든 남의 것이든
- 4. my_node_t.seq가 0이 아닐 때까지 반복 (즉 list에 연결될 때까지)
- 5. sentinel부터 my_node_t까지 list 순회하며 op들을 차례로 적용
- 6. my_node_t.result 반환

이 단방향 list가 사실상 **operation의 history log**다. 순차 객체 S에 적용할 명령의 전순서 — 모든 스레드가 합의한 — 가 list의 head→tail 방향으로 기록된다.

## 6.4 Wait-Free 보장

위 코드는 **lock-free**다 — 적어도 한 스레드는 진행한다. 그러나 **wait-free**는 아니다 — 한 스레드가 무한히 CAS 실패를 반복할 수 있다.

Wait-free로 만들려면 **helping** 메커니즘이 필요하다.

**A가 B의 명령을 도와준다:**

- A가 자기 명령을 CAS로 붙이려 시도
- B도 같은 시도를 하고 있다면
- A가 B의 명령을 먼저 붙여 줌 (도움)
- 그 다음 A 자신의 명령을 붙임

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

### 정확성 — Linearizability 증명 스케치

이 알고리즘이 *진짜로* 순차 객체 S의 linearizable 구현인지 증명해야 한다.

**Step 1 — 합의된 순서의 존재:**

- 각 노드는 consensus 객체로 자기 sequence number를 결정한다.
- 서로 다른 노드는 서로 다른 sequence number를 갖는다.
- (consensus의 agreement 속성)

**Step 2 — Linearization point 지정:**

- operation op의 linearization point := op의 노드가 list에 성공적으로
- 연결된 순간 (CAS 성공 시점).
- 이 순간은 op의 호출 구간 [invocation, response] 사이에 있음.

**Step 3 — 동등성:**

- linearization point의 순서로 op들을 sequential하게 적용한 결과
- = 우리 구현에서 각 op이 반환한 결과.

왜? 각 노드는 자기 앞의 모든 노드 (즉 자기보다 작은 sequence number)
를 replay하여 결과를 계산하기 때문. linearization 순서와 일치.

따라서 모든 가능한 실행에 대해, 동등한 순차 실행이 존재한다 — 정의에 의해 linearizable.

### 정확성 — Wait-Freedom 증명 스케치

wait-freedom 부분은 helping 메커니즘에서 나온다.

**관찰:**

- apply(thread_id, op)이 호출되면 my_node를 announce[thread_id]에 둔다.

본 알고리즘의 main loop는 announce array의 모든 슬롯을 순회하며,
pending 노드를 모두 list에 append하려 시도한다.

**핵심 보조정리:**

- 어떤 노드 N이 announce array에 들어간 후,
- 최대 N개의 스레드만이 N보다 *먼저* sequence를 받을 수 있다.

왜? 모든 스레드가 announce array를 스캔하며 helping하므로,
N의 pending 상태를 본 어떤 스레드라도 N을 append하려 시도한다.

따라서 announce 후 최대 O(N) 작업 안에 my_node가
list에 연결되고 sequence number를 받는다.

**결론:**

- Wait-freedom 보장 — 모든 호출은 O(N²) step 안에 종료.
- (N개의 helping 라운드 × 각 라운드 O(N) work)

이게 wait-free universal construction의 핵심 증명이다. **helping이 starvation을 방지**한다 — 다른 스레드들이 끊임없이 새 op을 announce하더라도, 자기 op도 그들의 도움에 의해 결국 처리된다.

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

## 6.9 시스템 사례 — 회의록 패턴은 어디에나 있다

universal construction의 *형태* — 합의된 연산 로그 + 재생 — 는 한 머신 안의 데이터 구조를 훨씬 넘어 분산 시스템 전반에 퍼져 있다. 6장의 추상 알고리즘이 실제 시스템에서 어떻게 변주되는지 본다.

### Multi-Paxos — 회의록의 분산 버전

Leslie Lamport의 Paxos는 단일 결정 하나를 합의한다. Multi-Paxos는 결정을 *연속해서* 합의한다 — 첫 결정의 합의가 끝나면 leader를 재선출하지 않고 그대로 다음 결정으로 넘어간다.

```text
Slot 0:  의장 후보 → propose → quorum ack → 결정 v_0
Slot 1:  같은 의장 → propose → quorum ack → 결정 v_1
Slot 2:  같은 의장 → propose → quorum ack → 결정 v_2
...
모든 노드가 같은 슬롯 시퀀스에 합의 → operation log
```

이 슬롯 시퀀스가 곧 6장의 operation log다. 각 노드는 결정된 슬롯들을 처음부터 차례로 적용하여 자기 로컬 state machine을 갱신한다 — 회의록 재생.

![Replicated state machine cycle: client → leader → consensus → log → state](/images/blog/parallel-principles/diagrams/ch06-consensus-cycle.svg)

이 패턴을 **replicated state machine**이라 부른다. Universal construction의 분산 구현이다.

### Raft — 더 분명한 회의록

Diego Ongaro의 Raft는 Paxos의 본질을 더 명료하게 풀어쓴 합의 프로토콜이다. 세 가지 부분으로 나뉜다.

- **Leader election** — 의장 한 명을 정한다. 임기(term)가 있고, 임기가 바뀌면 새 의장.
- **Log replication** — 의장이 결정 로그를 다른 노드에 복제한다. quorum이 동의한 슬롯은 *committed*로 표시.
- **Safety** — 의장 자격 조건을 제한하여, 한 슬롯에 두 개의 다른 결정이 들어가지 않도록.

```text
Term 1:  Leader A → log: [v_0, v_1, v_2 committed]
Term 2:  Leader B → log: [v_0, v_1, v_2, v_3, v_4 committed]   (이어 받음)
Term 3:  Leader C → log: [v_0, v_1, v_2, v_3, v_4, v_5 ...]
```

각 노드는 committed된 로그 항목을 차례로 *apply*한다. 모두 같은 항목을 같은 순서로 적용하므로 — 6.3절의 "list 순회하며 op 적용"의 분산 버전 — 결과 상태가 같다.

Raft의 helping은 다소 다른 모양이다. follower가 응답하지 않으면 leader가 *AppendEntries*를 재전송하고, 따라잡지 못한 follower의 로그를 강제 동기화한다. 느린 노드를 빠른 노드(leader)가 끌고 가는 형태.

### Etcd / Consul — 키-값 저장소의 회의록

Etcd는 Raft를 그대로 가져다 키-값 저장소로 쓴다. 모든 `PUT`, `DELETE`, `CAS`가 Raft 로그에 들어간다. 클라이언트가 키를 읽으면 — 정확한 *linearizable read*를 원할 경우 — 읽기 자체도 로그에 들어간다 (또는 quorum read).

```text
client: PUT(/config, "v2")
   ↓
etcd leader: log append → replicate to followers → commit → apply
   ↓
local KV store: /config → "v2"
```

이게 6장 universal construction의 직접적 응용이다. 키-값 저장소라는 *순차 객체*를 wait-free linearizable로 만드는 분산 구현이다. 명령 = `PUT/GET/DELETE`, 합의 = Raft, 재생 = local apply.

Etcd가 Kubernetes의 핵심 저장소인 이유 — 클러스터의 모든 상태(파드 목록, 서비스, 컨피그)가 *한 권의 회의록*에 적혀 있고, 모든 컨트롤러가 그것을 읽어 같은 결정을 내린다.

### Apache BookKeeper — 회의록 *그 자체*가 서비스

BookKeeper는 더 직접적이다 — 분산 *append-only log*를 일급 서비스로 제공한다. operation log 그 자체가 상품이다.

```text
Application:
  ledger.addEntry(data) → quorum-replicated append
  ledger.readEntry(idx) → 특정 위치 읽기

ledger = immutable sequence of entries with strong ordering
```

Kafka, Pulsar 같은 메시지 큐가 이런 분산 로그 위에 세워진다. 메시지 = 회의록 한 줄. consumer = 재생하는 위원.

Pravega, DistributedLog, Pulsar BookKeeper 모두 같은 모델이다. 명령 로그를 분산하여 *append*만 받고, 그 위에 어떤 stateful 서비스든 — 큐, 토픽, 트랜잭션, KV — 구현한다. Universal construction의 산업적 발현.

### 패턴의 통일

| 시스템 | "의장" | "회의록" | 명령 |
|---|---|---|---|
| 6장 universal construction | CAS | linked list | 함수 호출 |
| Multi-Paxos | 선출된 proposer | slot sequence | 임의 결정 |
| Raft | leader (term) | replicated log | command |
| Etcd | Raft leader | wal log | PUT/DELETE/CAS |
| BookKeeper | ensemble + quorum | ledger | append |
| Kafka | partition leader | partition log | message |

같은 패턴이 단일 머신 lock-free 자료구조에서 글로벌 분산 서비스까지 일관되게 흐른다. universal construction은 그 패턴의 *수학적 정수*다. 모든 구현은 다음 두 가지를 어떻게 다루느냐로 갈린다.

- *의장의 결정 비용* — CAS 한 명령, network round trip, quorum vote
- *helping의 모습* — 직접 op 대신 append, leader가 follower 따라잡기, gossip

추상은 같고 비용만 다르다.

## 정리

- **CAS는 universal** — 어떤 순차 객체든 wait-free 동시 객체로 변환 가능
- 메커니즘 — **명령을 로그에 CAS로 추가**, 순서 합의
- **Wait-free**를 위해서는 **helping** 필요
- 비용 — 작업당 O(history) 또는 O(N)
- 실용적으로는 자료구조별 특화 알고리즘 사용
- **존재성 증명**으로서의 가치 — 모든 문제가 해결 가능함을 보장

## 한국 개발자의 함정

**1. *Universal construction이 실용적*이라는 오해**

- O(N) overhead로 사실상 안 씀
- 존재성 증명일 뿐 (이론적 가치)

**2. *Helping 메커니즘은 항상 필요***

- Wait-free에만 필요
- Lock-free는 helping 없이 가능

**3. *CAS면 wait-free*라는 혼동**

- CAS 단독은 lock-free
- Wait-free는 추가 메커니즘 필요

**4. *Lock-free stack/queue가 최적*이라는 착각**

- ABA 문제 — 다음 챕터에서 다룸
- 메모리 관리 (hazard pointers, epoch-based reclamation)

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

- [ ] Universal construction 알고리즘 흐름?
- [ ] Helping이 필요한 이유?
- [ ] Lock-free / Wait-free / Obstruction-free 구분 (3번째)?
- [ ] Universality의 *이론적 의미*?
- [ ] 실용적 lock-free 자료구조 패턴?
- [ ] C++20의 atomic_shared_ptr, atomic_ref?

## 다음 장 예고

다음 장부터 실용적 자료구조 — **스핀 락**과 contention 관리.

## 관련 항목

- [Ch 5: Consensus Number](/blog/parallel/parallel-principles/ch05-relative-power-of-synchronization)
- [Ch 7: Spin Locks](/blog/parallel/parallel-principles/ch07-spin-locks-and-contention)
- [Ch 10: Concurrent Queues](/blog/parallel/parallel-principles/ch10-concurrent-queues-and-the-aba-problem)
- [C++ Concurrency in Action Ch 7: Lock-free 자료구조](/blog/parallel/cpp-concurrency-in-action/chapter07-designing-lock-free-concurrent-data-structures)
