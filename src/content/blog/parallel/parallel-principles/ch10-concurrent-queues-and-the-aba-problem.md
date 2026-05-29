---
title: "Chapter 10: Concurrent Queue와 ABA 문제"
date: 2026-05-06T10:00:00
description: "Michael-Scott Lock-Free Queue. ABA 문제와 그 해법 — version counter, hazard pointer, epoch."
series: "The Art of Multiprocessor Programming"
seriesOrder: 10
tags: [parallel, concurrency, book-review, amp, queue, michael-scott, aba, hazard-pointer, C++, C]
type: book-review
bookTitle: "The Art of Multiprocessor Programming"
bookAuthor: "Maurice Herlihy, Nir Shavit"
draft: true
---

> **The Art of Multiprocessor Programming** Chapter 10 요약
>
> 이 시리즈는 C++20/23과 C11을 사용하여 최신 문법으로 재구성했다.

큐는 *연산 두 줄*인데 — `enqueue(x)`와 `dequeue()` — *동시성*에서는 가장 까다로운 자료구조 중 하나다. 두 연산이 양 끝에서 일어난다는 점이 동시 처리에 유리할 것 같지만, 그 단순한 구조가 ABA와 메모리 회수라는 두 함정을 동시에 부른다. 책은 이 챕터에서 *왜 큐가 어려운지*를 천천히 풀어 보인다.

세 가지 큐를 차례로 본다. **Bounded queue**는 자리가 한정된 *회전초밥* 같다 — 손님은 빈 자리에만 앉을 수 있고 FIFO 순서로 처리된다. **Two-lock queue**는 머리와 꼬리에 각각 직원이 한 명씩 있는 큐. **Michael-Scott unbounded queue**는 *우체국 우편물 줄* — 줄 끝(tail)이 잠시 어디인지 헷갈려도 다음 사람이 도와서 정정한다. 이 *helping*이 lock-free의 핵심이다.

마지막으로 ABA 문제를 다룬다. 동전을 던져 뒷면을 봤다가 잠깐 시선을 돌린 사이에 누가 같은 면이 그려진 *다른 동전*으로 바꿔치기했다고 생각해 보라. CAS는 "면이 같으면 통과"이므로 이 바꿔치기를 못 잡는다. 해법은 동전에 *날짜 도장*을 찍는 것 — version counter, hazard pointer, epoch이 다 같은 발상이다.

실세계 시스템: LMAX **Disruptor** (single-writer ring buffer), Kafka의 **producer batch queue** (배치 단위로 lock-free), Java의 `ConcurrentLinkedQueue` (Michael-Scott의 직접 구현)가 이 챕터의 알고리즘을 실전 규모로 끌어올린 사례다.

## 10.1 Queue의 동시성 도전

Queue는 두 끝(head, tail)에서 동시 작업이 일어난다. enqueue는 tail, dequeue는 head.

좋은 디자인 — **dequeue와 enqueue가 서로 안 막아야** 한다. 락을 두 개 따로 잡으면 가능.

비유로 보면: head와 tail이 *서로 떨어진 카운터*라는 점이 핵심이다. 카페에서 주문 카운터와 픽업 카운터가 분리되어 있으면 주문이 밀려도 픽업이 멈추지 않는다. 같은 카운터에서 둘 다 받으면 줄이 한 줄로 합쳐져 처리량이 절반.

## 10.2 Two-Lock Queue

```cpp
// C++20 Two-Lock Queue
#include <mutex>
#include <optional>

template <typename T>
class TwoLockQueue {
    struct Node {
        std::optional<T> item;
        Node* next = nullptr;
    };

    Node* head_;
    Node* tail_;
    std::mutex head_lock_;
    std::mutex tail_lock_;

public:
    TwoLockQueue() {
        // Sentinel node
        head_ = tail_ = new Node();
    }

    ~TwoLockQueue() {
        while (head_ != nullptr) {
            Node* temp = head_;
            head_ = head_->next;
            delete temp;
        }
    }

    void enqueue(T item) {
        Node* new_node = new Node();
        new_node->item = std::move(item);

        std::lock_guard lock(tail_lock_);
        tail_->next = new_node;
        tail_ = new_node;
    }

    std::optional<T> dequeue() {
        std::lock_guard lock(head_lock_);

        Node* first = head_;
        Node* next = first->next;

        if (next == nullptr) {
            return std::nullopt;  // 비어 있음
        }

        T item = std::move(*next->item);
        head_ = next;
        delete first;  // 이전 sentinel 삭제
        return item;
    }
};
```

```c
// C11 Two-Lock Queue
#include <pthread.h>
#include <stdlib.h>
#include <stdbool.h>

typedef struct TLNode {
    int item;
    bool has_item;
    struct TLNode* next;
} TLNode;

typedef struct {
    TLNode* head;
    TLNode* tail;
    pthread_mutex_t head_lock;
    pthread_mutex_t tail_lock;
} TwoLockQueue;

TLNode* tl_node_create(void) {
    TLNode* node = malloc(sizeof(TLNode));
    node->has_item = false;
    node->next = NULL;
    return node;
}

void tl_queue_init(TwoLockQueue* q) {
    // Sentinel node
    q->head = q->tail = tl_node_create();
    pthread_mutex_init(&q->head_lock, NULL);
    pthread_mutex_init(&q->tail_lock, NULL);
}

void tl_queue_destroy(TwoLockQueue* q) {
    while (q->head != NULL) {
        TLNode* temp = q->head;
        q->head = q->head->next;
        free(temp);
    }
    pthread_mutex_destroy(&q->head_lock);
    pthread_mutex_destroy(&q->tail_lock);
}

void tl_enqueue(TwoLockQueue* q, int item) {
    TLNode* new_node = tl_node_create();
    new_node->item = item;
    new_node->has_item = true;

    pthread_mutex_lock(&q->tail_lock);
    q->tail->next = new_node;
    q->tail = new_node;
    pthread_mutex_unlock(&q->tail_lock);
}

bool tl_dequeue(TwoLockQueue* q, int* out_item) {
    pthread_mutex_lock(&q->head_lock);

    TLNode* first = q->head;
    TLNode* next = first->next;

    if (next == NULL) {
        pthread_mutex_unlock(&q->head_lock);
        return false;  // 비어 있음
    }

    *out_item = next->item;
    q->head = next;
    pthread_mutex_unlock(&q->head_lock);

    free(first);  // 이전 sentinel 삭제
    return true;
}
```

**Sentinel node** 트릭 — `head`는 항상 dummy를 가리킨다. `head.next`가 실제 첫 항목. 이게 enqueue/dequeue를 분리하기 쉽게 한다.

## 10.2.1 BoundedQueue — Lock-Free 변형

책 Listing 10.6, 10.7은 capacity가 고정된 lock-free 큐다. 노드를 재사용하는 것이 두 lock 변형과 다르다.

회전초밥 비유가 잘 맞는 자료구조다. 자리는 정해진 수만큼만 있고, FIFO 순서로 한 칸씩 채워지고 비워진다. 자리가 다 차면 새 손님은 입장 불가 — `enqueue`가 `false`를 반환한다. 비어 있는 자리가 있는데도 잠깐 가득 차 보이는 *false negative*는 허용되지만, 빈 자리가 없는데 앉히는 *false positive*는 절대 금지. `size_`의 근사가 한쪽으로만 안전하게 기울도록 설계해야 한다.

```cpp
// C++20 BoundedQueueLockFree (책 10.6 재구성)
#include <atomic>
#include <optional>

template <typename T>
class BoundedQueueLockFree {
    struct Node {
        std::optional<T> item;
        std::atomic<Node*> next{nullptr};
    };

    std::atomic<Node*> head_;
    std::atomic<Node*> tail_;
    std::atomic<int> size_{0};
    const int capacity_;

public:
    explicit BoundedQueueLockFree(int cap) : capacity_(cap) {
        Node* sentinel = new Node();
        head_.store(sentinel);
        tail_.store(sentinel);
    }

    bool enqueue(T item) {
        // capacity 검사 — relaxed로 빠르게
        int s = size_.load(std::memory_order_relaxed);
        if (s >= capacity_) return false;

        Node* new_node = new Node();
        new_node->item = std::move(item);

        while (true) {
            Node* last = tail_.load(std::memory_order_acquire);
            Node* next = last->next.load(std::memory_order_acquire);
            if (last != tail_.load(std::memory_order_acquire)) continue;

            if (next == nullptr) {
                Node* expected = nullptr;
                if (last->next.compare_exchange_weak(expected, new_node)) {
                    tail_.compare_exchange_strong(last, new_node);
                    size_.fetch_add(1, std::memory_order_release);
                    return true;
                }
            } else {
                tail_.compare_exchange_strong(last, next);
            }
        }
    }

    std::optional<T> dequeue() {
        while (true) {
            Node* first = head_.load(std::memory_order_acquire);
            Node* last = tail_.load(std::memory_order_acquire);
            Node* next = first->next.load(std::memory_order_acquire);
            if (first != head_.load(std::memory_order_acquire)) continue;

            if (first == last) {
                if (next == nullptr) return std::nullopt;
                tail_.compare_exchange_strong(last, next);
            } else {
                T value = std::move(*next->item);
                if (head_.compare_exchange_strong(first, next)) {
                    size_.fetch_sub(1, std::memory_order_release);
                    return value;
                }
            }
        }
    }
};
```

**관찰**: `size_`는 정확한 카운트가 아니라 *근사*다. 두 producer가 동시에 마지막 자리를 잡으면 capacity를 잠시 초과한다. 책은 `permits` 패턴(reservation 먼저, 실제 enqueue는 뒤)으로 정확히 제한하는 변형도 보여준다.

## 10.3 Michael-Scott Lock-Free Queue

가장 유명한 lock-free queue. 표준 라이브러리들이 자주 이 알고리즘 사용.

*우체국 우편물 줄*을 그려 보자. 우편물을 줄 끝에 놓는 사람(enqueue)이 둘 있다. 한 명이 우편물은 놓았는데 *"줄 끝은 여기다"* 표시 깃발을 옮기다 멈춘다. 다음 사람이 와서 본다 — 우편물이 있는데 깃발은 한 칸 앞. 이 사람은 자기 우편물을 놓기 전에 *앞 사람의 깃발을 대신 옮겨준다* (helping). 이렇게 한 사람이 멈춰도 다른 사람들이 진행한다 — lock-freedom의 정수.

### Enqueue

```cpp
// C++20 Michael-Scott Lock-Free Queue
#include <atomic>
#include <optional>

template <typename T>
class MSQueue {
    struct Node {
        std::optional<T> item;
        std::atomic<Node*> next{nullptr};

        Node() = default;
        explicit Node(T i) : item(std::move(i)) {}
    };

    std::atomic<Node*> head_;
    std::atomic<Node*> tail_;

public:
    MSQueue() {
        Node* sentinel = new Node();
        head_.store(sentinel, std::memory_order_relaxed);
        tail_.store(sentinel, std::memory_order_relaxed);
    }

    void enqueue(T item) {
        Node* new_node = new Node(std::move(item));

        while (true) {
            Node* last = tail_.load(std::memory_order_acquire);
            Node* next = last->next.load(std::memory_order_acquire);

            if (last == tail_.load(std::memory_order_acquire)) {  // 일관성 확인
                if (next == nullptr) {
                    // last가 진짜 마지막 — CAS로 연결
                    if (last->next.compare_exchange_weak(next, new_node,
                            std::memory_order_release, std::memory_order_relaxed)) {
                        // tail 갱신 (실패해도 OK — 다른 스레드가 도와줌)
                        tail_.compare_exchange_strong(last, new_node,
                            std::memory_order_release, std::memory_order_relaxed);
                        return;
                    }
                } else {
                    // tail이 뒤처져 있음 — 다른 스레드 도와줌
                    tail_.compare_exchange_strong(last, next,
                        std::memory_order_release, std::memory_order_relaxed);
                }
            }
        }
    }

    std::optional<T> dequeue() {
        while (true) {
            Node* first = head_.load(std::memory_order_acquire);
            Node* last = tail_.load(std::memory_order_acquire);
            Node* next = first->next.load(std::memory_order_acquire);

            if (first == head_.load(std::memory_order_acquire)) {
                if (first == last) {
                    if (next == nullptr) {
                        return std::nullopt;  // 비어 있음
                    }
                    // tail이 뒤처져 있음 — 도와줌
                    tail_.compare_exchange_strong(last, next,
                        std::memory_order_release, std::memory_order_relaxed);
                } else {
                    T value = std::move(*next->item);
                    if (head_.compare_exchange_strong(first, next,
                            std::memory_order_release, std::memory_order_relaxed)) {
                        // Note: first 메모리 회수는 별도 처리 (hazard pointer 등)
                        return value;
                    }
                }
            }
        }
    }
};
```

```c
// C11 Michael-Scott Lock-Free Queue
#include <stdatomic.h>
#include <stdlib.h>
#include <stdbool.h>

typedef struct MSNode {
    int item;
    bool has_item;
    _Atomic(struct MSNode*) next;
} MSNode;

typedef struct {
    _Atomic(MSNode*) head;
    _Atomic(MSNode*) tail;
} MSQueue;

MSNode* ms_node_create(void) {
    MSNode* node = malloc(sizeof(MSNode));
    node->has_item = false;
    atomic_init(&node->next, NULL);
    return node;
}

MSNode* ms_node_create_with_item(int item) {
    MSNode* node = malloc(sizeof(MSNode));
    node->item = item;
    node->has_item = true;
    atomic_init(&node->next, NULL);
    return node;
}

void ms_queue_init(MSQueue* q) {
    MSNode* sentinel = ms_node_create();
    atomic_init(&q->head, sentinel);
    atomic_init(&q->tail, sentinel);
}

void ms_enqueue(MSQueue* q, int item) {
    MSNode* new_node = ms_node_create_with_item(item);

    while (true) {
        MSNode* last = atomic_load_explicit(&q->tail, memory_order_acquire);
        MSNode* next = atomic_load_explicit(&last->next, memory_order_acquire);

        if (last == atomic_load_explicit(&q->tail, memory_order_acquire)) {
            if (next == NULL) {
                MSNode* expected = NULL;
                if (atomic_compare_exchange_weak_explicit(&last->next, &expected, new_node,
                        memory_order_release, memory_order_relaxed)) {
                    // tail 갱신 (실패해도 OK)
                    MSNode* exp_last = last;
                    atomic_compare_exchange_strong_explicit(&q->tail, &exp_last, new_node,
                        memory_order_release, memory_order_relaxed);
                    return;
                }
            } else {
                // tail이 뒤처져 있음 — 도와줌
                MSNode* exp_last = last;
                atomic_compare_exchange_strong_explicit(&q->tail, &exp_last, next,
                    memory_order_release, memory_order_relaxed);
            }
        }
    }
}

bool ms_dequeue(MSQueue* q, int* out_item) {
    while (true) {
        MSNode* first = atomic_load_explicit(&q->head, memory_order_acquire);
        MSNode* last = atomic_load_explicit(&q->tail, memory_order_acquire);
        MSNode* next = atomic_load_explicit(&first->next, memory_order_acquire);

        if (first == atomic_load_explicit(&q->head, memory_order_acquire)) {
            if (first == last) {
                if (next == NULL) {
                    return false;  // 비어 있음
                }
                // tail이 뒤처져 있음 — 도와줌
                MSNode* exp_last = last;
                atomic_compare_exchange_strong_explicit(&q->tail, &exp_last, next,
                    memory_order_release, memory_order_relaxed);
            } else {
                *out_item = next->item;
                MSNode* exp_first = first;
                if (atomic_compare_exchange_strong_explicit(&q->head, &exp_first, next,
                        memory_order_release, memory_order_relaxed)) {
                    // Note: first 메모리 회수는 별도 처리 필요
                    return true;
                }
            }
        }
    }
}
```

**핵심 아이디어**:

1. tail이 실제 마지막 노드를 가리키지 않을 수도 있다 (다른 스레드의 enqueue가 진행 중)
2. 그런 경우 도와준다 — tail을 다음 노드로 진행

이게 lock-free의 핵심 — **다른 스레드가 멈춰 있어도 진행 가능**.

### Enqueue 단계별 추적 (책 Listing 10.10)

책의 enqueue는 두 CAS로 나뉘어 있다. 한 enqueue 작업은 두 단계로 보인다.

| 단계 | 작업 | 실패 시 |
|---|---|---|
| 1 | `last->next`를 nullptr→new_node로 CAS | 다른 enqueue가 먼저 — 처음부터 다시 |
| 2 | `tail`을 last→new_node로 CAS (advance) | 다른 스레드가 도와줌 — 무시 |

두 단계 사이에 있는 큐를 *quiescent*라고 부른다. 이 중간 상태에서 다른 스레드가 들어오면 `last->next != nullptr`을 본다. 이때 "도와주기"가 발동한다 — tail이 뒤처졌으므로 다른 스레드가 tail을 advance해 준다.

```text
초기:    head → S, tail → S
enqueue A 단계 1 후:  head → S → A, tail → S (뒤처짐!)
enqueue A 단계 2 후:  head → S → A, tail → A

여기서 enqueue B가 단계 1만 한 채 멈추면:
   head → S → A → B, tail → A (뒤처짐!)

enqueue C가 들어와서 last == tail == A, last->next == B를 본다.
→ tail.CAS(A, B)로 도와줌. B를 거치고 자신은 단계 1을 시도.
```

**linearization point**: enqueue는 *단계 1의 성공*. dequeue는 *head CAS의 성공*.

비유로 정리하면 — 우체국 직원이 손님이 우편물을 *놓는 순간*(단계 1)을 거래 시점으로 보고, *영수증을 발급*(단계 2)은 사후 정리로 본다. 영수증 발급이 지연돼도 거래 자체는 끝났다. 다음 손님이 와서 영수증이 아직 안 나왔다면 자신이 대신 발급해 준다 — helping. tail의 lagging은 *영수증 발급 지연*에 해당.

### Dequeue의 미묘한 케이스 (책 Listing 10.11)

dequeue가 처리해야 할 케이스는 셋이다.

1. **비어 있음**: `first == last && next == nullptr` → `null` 반환
2. **tail 뒤처짐**: `first == last && next != nullptr` → tail advance 도와주고 재시도
3. **정상**: `first != last` → `next`의 item 읽고 head advance

case 2를 빠뜨리면 — empty 상태와 "enqueue 진행 중" 상태를 구별 못 한다. 잘못된 `null` 반환이 가능.

```cpp
// 잘못된 dequeue (case 2 누락)
if (first == last) return std::nullopt;  // 버그!
```

이러면 enqueue 단계 1과 단계 2 사이에 dequeue가 들어오면 *큐에 원소가 있는데도 비었다고 반환*한다. Linearizability 위반.

### Helping의 *우체국 비유*를 더 자세히

helping 메커니즘을 우체국 카운터로 구체화해 본다. 손님 A가 우편물을 카운터에 *놓는* 단계 1을 끝낸 뒤, *영수증 발급* 단계 2로 가다가 잠시 멈췄다. 다음 손님 B가 와서 본다:

**B가 보는 상태:**

- 카운터 영수증판: A의 우편물 위치 표시 안 됨 (tail 이전 위치)
- 우편물 보관함: A의 우편물이 이미 들어있음 (last->next != null)

B는 두 가지 사실을 안다: (1) 영수증판이 우편물 보관함을 따라가지 못함, (2) 앞에 끼어든 사람이 단계 2를 못 끝냈음. B는 자기 일을 시작하기 전에 *A를 대신해* 영수증판을 정정한다 (`tail.CAS(A, B의 직전 우편물)`). 그 다음 자기 우편물의 단계 1을 시도한다.

A가 나중에 깨어나서 영수증판을 갱신하려 하면 — *이미 정정되어* CAS가 실패한다. A는 자기 단계 2가 *대신 처리되었음*을 깨닫고 그냥 return한다. 한 사람이 멈춰도 *시스템 전체는 진행*한다 — 이게 lock-freedom의 정수다.

비유로 한 단계 더 — *대기실에 잠든 의사*가 있어도 다음 의사가 그의 차트를 마무리해 주고 자기 환자를 본다. 일은 결코 멈추지 않는다.

### tail의 lagging

흥미롭게도 tail은 *반드시* 정확할 필요가 없다. enqueue도 dequeue도 lagging tail을 견디도록 짜여 있다. 이 약한 invariant 덕분에 enqueue가 두 CAS로 쪼개질 수 있다 — 만약 tail을 항상 정확하게 유지하려 했다면 두 변수를 atomic으로 함께 갱신해야 했을 것이다.

## 10.4 ABA 문제

Lock-free 자료구조의 악명 높은 함정.

비유로 풀면 — 동전을 던져 뒷면을 봤다. 잠깐 시선을 돌린 사이에 누가 그 동전을 빼가 다른 일에 쓰고는, 같은 면이 위로 향한 *다른* 동전으로 바꿔치기했다. 다시 봤을 때 면이 같으니 CAS는 "변화 없음"이라고 보고한다. 그러나 동전 자체는 바뀌었고, *그 동전이 가진 정보(next 포인터)*도 바뀌었다. 이 침묵의 변경이 ABA다.

![ABA 문제](/images/blog/parallel/diagrams/aba-problem.svg)

**시나리오:**


**1. 스레드 X: ptr 읽음 = A**


**2. 스레드 X: 잠시 멈춤 (interrupt)**


**3. 스레드 Y: pop(A), push(B), pop(B), push(A)**

- → ptr이 다시 A지만, 내부 구조는 다름

**4. 스레드 X: CAS(ptr, A, new) → 성공**

- → 그러나 의도와 다른 결과

A → B → A로 돌아왔다. CAS는 단순히 "값이 같으면 성공"이므로 이 변화를 못 잡는다.

비유를 더 구체화하면 — 매장에서 *상품권 번호*를 비교하는 시스템을 상상해 보자. 손님 X가 "1234번 상품권을 들고 있다"고 등록하고 잠깐 자리를 비웠다. 그 사이 매장이 1234번을 회수해 폐기하고, 새로 발급된 다른 손님의 *재사용된 1234번*을 등록한다. X가 돌아와서 "내 1234번 맞죠?"라고 묻자 매장은 "네 맞아요"라고 답한다 — 번호는 같지만 *다른 상품권*. CAS는 이 차이를 모른다. 그래서 *번호 + 발급 일자*를 함께 비교해야 한다 (version counter).

### ABA가 *재사용된 노드*에서 발생하는 이유

책의 핵심 통찰 — ABA는 임의의 값 변화가 아니라 *메모리 재사용*에서 온다. 새 노드를 매번 새 주소에 할당하면 ABA는 거의 불가능하다. 그러나 lock-free 자료구조는 보통 free list로 노드를 재활용한다.

**1. dequeue가 node X를 free list로 보냄**


**2. enqueue가 free list에서 X를 다시 꺼내 새 항목으로 사용**


**3. 다른 스레드는 여전히 *옛 X 포인터*를 들고 있음**


**4. 옛 X와 새 X의 주소가 같음 → CAS 통과 → 잘못된 next로 이어짐**

이래서 책은 ABA 해법과 *메모리 회수* 해법이 같은 문제임을 강조한다. 두 문제는 결국 "언제 노드를 자유롭게 재사용할 수 있는가?"라는 한 질문으로 수렴한다.

### 회수 → 재할당의 *주문 받기* 비유

ABA가 *왜 메모리 재사용에서 나오는지*를 식당으로 비유해 보자. 식당 테이블 번호가 8개뿐이라 손님이 떠나면 같은 번호를 다시 쓴다. 종업원 X가 "12번 테이블 주문 받음"이라고 기록한 뒤 다른 일을 본다. 그 사이 12번 손님이 떠나고 새 손님이 같은 12번 테이블에 앉았다. X가 돌아와서 "12번 주문 들어와 있죠?"라고 묻자, 시스템은 "네"라고 답한다 — 같은 12번이지만 *다른 손님의 주문*. 메뉴가 완전히 다를 수 있다. 메모리 재사용이 정확히 이 시나리오다.

### 왜 위험한가

**Lock-free stack:**


**1. X가 top 읽음 = A**


**2. Y가 pop(A) — A는 메모리 풀로**


**3. Y가 pop(B) — B도**


**4. Y가 push(A) — 재사용, 그러나 next 포인터가 다름**


**5. X가 CAS(top, A, ...) — 성공**


**6. → next 포인터가 잘못된 곳을 가리킴 → 메모리 손상**

## 10.5 ABA 해법 — Version Counter

CAS의 대상에 **버전 카운터**를 추가.

다시 동전 비유로 — 동전에 *날짜 도장*을 찍는다. 면이 같아도 도장이 다르면 다른 동전. CAS가 "면 + 도장"을 함께 비교하면 바꿔치기가 잡힌다. Java의 `AtomicStampedReference`가 이 발상의 표준 구현체다. C++은 표준 라이브러리에 동등한 클래스가 없어서 직접 packing하거나 128-bit atomic을 쓴다.

```cpp
// C++20 Version Counter (Double-Width CAS)
#include <atomic>
#include <cstdint>

template <typename T>
class VersionedPtr {
    struct alignas(16) Packed {
        T* ptr;
        uint64_t version;
    };

    std::atomic<Packed> data_;

public:
    VersionedPtr(T* ptr = nullptr) : data_{{ptr, 0}} {}

    T* get() const {
        return data_.load(std::memory_order_acquire).ptr;
    }

    bool compare_exchange(T* expected, T* desired) {
        Packed old_val = data_.load(std::memory_order_acquire);
        if (old_val.ptr != expected) {
            return false;
        }

        Packed new_val{desired, old_val.version + 1};
        return data_.compare_exchange_strong(old_val, new_val,
            std::memory_order_release, std::memory_order_relaxed);
    }
};

// Lock-Free Stack with Version Counter
template <typename T>
class LockFreeStack {
    struct Node {
        T item;
        Node* next;
    };

    VersionedPtr<Node> top_;

public:
    void push(T item) {
        Node* new_node = new Node{std::move(item), nullptr};
        while (true) {
            new_node->next = top_.get();
            if (top_.compare_exchange(new_node->next, new_node)) {
                return;
            }
        }
    }

    std::optional<T> pop() {
        while (true) {
            Node* old_top = top_.get();
            if (old_top == nullptr) {
                return std::nullopt;
            }
            if (top_.compare_exchange(old_top, old_top->next)) {
                T item = std::move(old_top->item);
                // Note: 메모리 회수는 별도 처리
                return item;
            }
        }
    }
};
```

```c
// C11 Version Counter (requires 128-bit CAS support)
#include <stdatomic.h>
#include <stdlib.h>
#include <stdbool.h>
#include <stdint.h>

// Note: This requires platform support for 128-bit atomic operations
// On x86-64: CMPXCHG16B instruction
// GCC: Use __int128 type

typedef struct {
    void* ptr;
    uint64_t version;
} VersionedPtr;

// Platform-specific: Use __atomic_compare_exchange on __int128
// Or use inline assembly for CMPXCHG16B

typedef struct StackNode {
    int item;
    struct StackNode* next;
} StackNode;

// Simplified version using separate atomic operations (not truly ABA-safe)
typedef struct {
    _Atomic(StackNode*) top;
    atomic_uint_fast64_t version;  // Version counter
} VersionedStack;

void vstack_init(VersionedStack* s) {
    atomic_init(&s->top, NULL);
    atomic_init(&s->version, 0);
}

void vstack_push(VersionedStack* s, int item) {
    StackNode* new_node = malloc(sizeof(StackNode));
    new_node->item = item;

    while (true) {
        new_node->next = atomic_load_explicit(&s->top, memory_order_acquire);
        if (atomic_compare_exchange_weak_explicit(&s->top,
                &new_node->next, new_node,
                memory_order_release, memory_order_relaxed)) {
            atomic_fetch_add_explicit(&s->version, 1, memory_order_relaxed);
            return;
        }
    }
}

// Note: For true ABA safety, need 128-bit CAS to atomically update
// both pointer and version together
```

매 변경마다 version을 1씩 증가. ABA가 와도 version이 다르므로 CAS 실패.

**문제** — 64비트 atomic만 보장되는 시스템에서는 ptr (8 byte) + version (8 byte) = 16 byte의 atomic이 필요. **DCAS** (double CAS) 또는 128비트 atomic 필요.

x86-64는 `CMPXCHG16B` 명령어 제공. C++에서는 `std::atomic<__int128>`.

### Java AtomicStampedReference 대응

책은 Java의 `AtomicStampedReference<T>`를 사용한다. C++로 대응하려면 다음 두 가지가 있다.

```cpp
// 방법 1 — 포인터의 상위 비트에 stamp packing (포인터 정렬 활용)
// 64-bit 시스템에서 user-space 포인터는 상위 16비트가 0
struct StampedPointer {
    static constexpr uint64_t PTR_MASK = 0x0000'FFFF'FFFF'FFFFULL;
    static constexpr uint64_t STAMP_SHIFT = 48;

    static uint64_t pack(void* p, uint16_t stamp) {
        return reinterpret_cast<uint64_t>(p) |
               (static_cast<uint64_t>(stamp) << STAMP_SHIFT);
    }
    static void* ptr(uint64_t v) {
        return reinterpret_cast<void*>(v & PTR_MASK);
    }
    static uint16_t stamp(uint64_t v) {
        return static_cast<uint16_t>(v >> STAMP_SHIFT);
    }
};

// std::atomic<uint64_t>로 한 번에 CAS — 8 byte로 ABA 방어
```

장점은 평범한 8-byte CAS만 쓴다는 점. 단점은 stamp가 16비트뿐이라 *충분히 빠른 재사용*에서는 wrap-around로 ABA 재발 가능. 보통은 보안용 stamp wrap이 일어날 만큼 빠르지 않지만, 책은 "stamp가 충분히 큰지" 검증해야 한다고 강조한다.

```cpp
// 방법 2 — 128-bit atomic (x86-64 CMPXCHG16B / ARM LDXP-STXP)
struct alignas(16) PackedRef {
    void* ptr;
    uint64_t stamp;  // 64-bit stamp는 wrap이 사실상 불가능
};
std::atomic<PackedRef> ref;  // gcc/clang은 -mcx16 필요
```

64-bit stamp는 매 사이클 1ns 증가해도 wrap에 ~584년 걸린다. 안전.

## 10.6 ABA 해법 — Hazard Pointer

Michael의 hazard pointer (2004) — 메모리 회수와 ABA를 함께 해결.

비유 — 도서관에서 책을 *읽는 중*임을 카운터에 알린다. 책장 사서는 "지금 누가 읽고 있는 책은 폐기 못 한다"라는 규칙을 따른다. 내가 보고 있는 동안 그 동전(노드)은 *물리적으로 회수되지 않으므로* 바꿔치기가 원천적으로 불가능. ABA의 원인이 *메모리 재사용*임을 정확히 막는다.

```cpp
// C++20 Hazard Pointer (개념적 구현)
#include <atomic>
#include <array>
#include <vector>
#include <thread>

template <typename T>
class HazardPointer {
    static constexpr size_t MAX_THREADS = 64;
    static constexpr size_t HP_PER_THREAD = 2;

    struct HPRecord {
        std::atomic<std::thread::id> owner;
        std::array<std::atomic<T*>, HP_PER_THREAD> hazard;
    };

    std::array<HPRecord, MAX_THREADS> hp_records_;
    thread_local static std::vector<T*> retire_list_;

    HPRecord* get_my_record() {
        auto my_id = std::this_thread::get_id();

        // 이미 할당된 레코드 찾기
        for (auto& record : hp_records_) {
            if (record.owner.load(std::memory_order_relaxed) == my_id) {
                return &record;
            }
        }

        // 새 레코드 할당
        std::thread::id empty_id;
        for (auto& record : hp_records_) {
            if (record.owner.compare_exchange_strong(empty_id, my_id,
                    std::memory_order_acquire, std::memory_order_relaxed)) {
                return &record;
            }
            empty_id = std::thread::id();
        }
        return nullptr;  // 레코드 부족
    }

public:
    // 포인터 보호 선언
    T* protect(size_t slot, std::atomic<T*>& source) {
        auto* record = get_my_record();
        T* ptr;
        do {
            ptr = source.load(std::memory_order_acquire);
            record->hazard[slot].store(ptr, std::memory_order_release);
        } while (ptr != source.load(std::memory_order_acquire));
        return ptr;
    }

    // 보호 해제
    void clear(size_t slot) {
        auto* record = get_my_record();
        record->hazard[slot].store(nullptr, std::memory_order_release);
    }

    // 은퇴 (나중에 삭제)
    void retire(T* ptr) {
        retire_list_.push_back(ptr);

        if (retire_list_.size() >= 2 * MAX_THREADS * HP_PER_THREAD) {
            scan();
        }
    }

private:
    void scan() {
        // 현재 보호 중인 포인터 수집
        std::vector<T*> protected_ptrs;
        for (const auto& record : hp_records_) {
            for (const auto& hp : record.hazard) {
                T* p = hp.load(std::memory_order_acquire);
                if (p != nullptr) {
                    protected_ptrs.push_back(p);
                }
            }
        }

        // 보호되지 않은 포인터 삭제
        std::vector<T*> new_retire_list;
        for (T* ptr : retire_list_) {
            bool is_protected = std::find(protected_ptrs.begin(),
                protected_ptrs.end(), ptr) != protected_ptrs.end();

            if (is_protected) {
                new_retire_list.push_back(ptr);
            } else {
                delete ptr;
            }
        }
        retire_list_ = std::move(new_retire_list);
    }
};

template <typename T>
thread_local std::vector<T*> HazardPointer<T>::retire_list_;
```

다른 스레드가 메모리를 회수하기 전에 hazard pointer를 검사한다 — 누군가 보고 있으면 회수 보류.

**장점**: 안전한 메모리 회수 + ABA 회피.
**단점**: 매번 hazard pointer 갱신 비용.

## 10.7 ABA 해법 — Epoch-Based Reclamation

각 스레드가 **epoch**을 가진다. 글로벌 epoch과 비교해 안전한 회수 시점 결정.

비유 — 분기별 결산. 각 스레드가 "이번 분기에 작업 중"이라고 표시하고 끝나면 표시를 지운다. 시스템 전체가 "지난 분기에 시작된 모든 작업이 끝났다"라고 확인되면 그 분기에 retire된 메모리를 일괄 회수한다. 일일이 보는 것이 아니라 *분기 단위*로 일괄 처리하기 때문에 hazard pointer보다 가볍지만, 한 스레드가 분기를 닫지 않으면 전체 회수가 멈춘다.

```cpp
// C++20 Epoch-Based Reclamation (개념적 구현)
#include <atomic>
#include <vector>
#include <array>
#include <thread>

template <typename T>
class EpochBasedReclamation {
    static constexpr size_t MAX_THREADS = 64;

    std::atomic<uint64_t> global_epoch_{0};
    std::array<std::atomic<uint64_t>, MAX_THREADS> thread_epochs_;
    std::array<std::vector<T*>, 3> garbage_;  // 3 epochs worth

    size_t get_thread_id() {
        thread_local size_t id = next_id_++;
        return id;
    }

    static std::atomic<size_t> next_id_;

public:
    class Guard {
        EpochBasedReclamation& ebr_;
        size_t thread_id_;

    public:
        explicit Guard(EpochBasedReclamation& ebr)
            : ebr_(ebr), thread_id_(ebr.get_thread_id()) {
            uint64_t epoch = ebr_.global_epoch_.load(std::memory_order_acquire);
            ebr_.thread_epochs_[thread_id_].store(epoch, std::memory_order_release);
        }

        ~Guard() {
            ebr_.thread_epochs_[thread_id_].store(UINT64_MAX,
                std::memory_order_release);
        }
    };

    void retire(T* ptr) {
        uint64_t epoch = global_epoch_.load(std::memory_order_relaxed);
        garbage_[epoch % 3].push_back(ptr);

        try_advance_epoch();
    }

private:
    void try_advance_epoch() {
        uint64_t current = global_epoch_.load(std::memory_order_acquire);

        // 모든 스레드가 현재 epoch 이상인지 확인
        for (size_t i = 0; i < MAX_THREADS; ++i) {
            uint64_t thread_epoch = thread_epochs_[i].load(std::memory_order_acquire);
            if (thread_epoch != UINT64_MAX && thread_epoch < current) {
                return;  // 아직 이전 epoch에 있는 스레드 있음
            }
        }

        // 안전하게 진행 가능
        if (global_epoch_.compare_exchange_strong(current, current + 1,
                std::memory_order_release, std::memory_order_relaxed)) {
            // 2 epoch 전 garbage 회수
            size_t reclaim_epoch = (current + 1) % 3;
            for (T* ptr : garbage_[reclaim_epoch]) {
                delete ptr;
            }
            garbage_[reclaim_epoch].clear();
        }
    }
};

template <typename T>
std::atomic<size_t> EpochBasedReclamation<T>::next_id_{0};
```

**장점**: hazard pointer보다 비용 적음 (per-thread epoch만 관리).
**단점**: 한 스레드가 epoch을 안 진행하면 모든 회수가 멈춤.

Rust의 `crossbeam-epoch`이 이 방식.

### Free List + Epoch 결합

책은 노드 *재사용*을 위해 epoch-based free list를 제안한다. 메모리 할당자를 거치지 않고 자체 free list로 캐시 친화적인 재사용을 노린다.

```cpp
// 개념적 구조 — 책 figure 10.x 재구성
template <typename T>
class EpochFreeList {
    struct Node { T value; Node* next; };
    static constexpr int NUM_EPOCHS = 3;

    // 각 epoch별 free 리스트 — 한 번에 한 epoch에만 추가
    std::array<std::atomic<Node*>, NUM_EPOCHS> bins_;
    std::atomic<int> current_epoch_{0};

public:
    void retire(Node* n) {
        int e = current_epoch_.load(std::memory_order_acquire);
        Node* old = bins_[e].load(std::memory_order_relaxed);
        do {
            n->next = old;
        } while (!bins_[e].compare_exchange_weak(old, n));
    }

    Node* acquire() {
        // 2 epoch 전의 bin에서 안전하게 재사용
        int e = current_epoch_.load(std::memory_order_acquire);
        int safe = (e + NUM_EPOCHS - 2) % NUM_EPOCHS;
        // bin에서 pop... (실제로는 thread-local free list 권장)
    }
};
```

**왜 작동하는가**: 모든 스레드가 epoch을 두 번 진행하는 사이에 들렀던 노드는 더 이상 누구도 보고 있지 않다 — quiescent 보장. 그래서 *2 epoch 전*의 bin은 안전하게 재사용 가능.

| 회수 전략 | 안전성 | 처리량 | 메모리 효율 |
|---|---|---|---|
| 즉시 `delete` | ABA 위험 | 빠름 | 좋음 |
| Hazard Pointer | 매우 안전 | 보통 | 좋음 |
| Epoch | 안전 (stall 시 메모리 누적) | 빠름 | 보통 |
| Epoch + Free list | 안전 + 할당 회피 | 매우 빠름 | 약간 손해 |

Linux 커널의 RCU(Read-Copy-Update)도 epoch과 같은 원리. grace period가 epoch이다.

### Free List의 본질

free list를 사용하는 모든 lock-free 자료구조는 ABA에 노출된다. 반대로 *항상 새 메모리를 할당*하면 ABA가 사실상 불가능하다 (주소가 충돌하려면 메모리가 한번 해제되어야 하므로). 그러나 매번 `new`/`malloc`은 lock-free 알고리즘의 빠른 경로를 망친다 — 할당자 자체가 락을 잡거나 contention의 원인이 된다.

그래서 책은 ABA 해법과 *재사용 가능한 free list*를 묶어서 다룬다. 두 문제는 사실 같은 문제 — *"언제 메모리를 안전하게 재사용할 수 있는가?"* 이 질문이 lock-free 자료구조의 *진짜 어려움*이다. 단순히 `delete first`라고 쓸 수 없다 — 다른 스레드가 first 포인터를 들고 있을 수 있다. 그래서 retire → epoch → reclaim의 우회 경로가 필요.

## 10.8 GC 언어의 이점

Java / C# / Go 같은 GC 언어는 **ABA가 자동으로 해결되는 경우가 많다**.

- ABA에서 A가 두 번 등장하려면 메모리 회수가 일어나야 함
- GC 언어는 "누가 보고 있는 동안"은 회수 안 함
- 그래서 ABA가 발생 안 함

C++은 수동 회수 — hazard pointer / epoch / version counter 필요.

이게 lock-free 알고리즘 구현이 C++에서 특히 어려운 이유 중 하나.

## 10.8.1 시스템 사례 — Disruptor, Kafka, ConcurrentLinkedQueue

실세계의 고성능 큐 세 가지를 본다. 각각이 이 챕터의 어느 개념을 *실용 규모로* 구현했는지 확인하면 이해가 굳어진다.

**LMAX Disruptor** — 금융 거래 시스템 LMAX가 만든 ring buffer 기반 큐. 핵심 아이디어:

- *단일 writer* 가정으로 enqueue 경합을 원천 제거
- *cache line padding*으로 false sharing 방지
- *sequence number*로 ABA 우회 (재사용 슬롯에 단조 증가 번호)

10.5의 version counter 발상이 sequence로 일반화된 형태. JVM에서 초당 6백만 메시지를 단일 thread로 처리한다고 알려져 있다.

**Kafka Producer Batch Queue** — 프로듀서가 메시지를 *배치*로 모아서 broker에 보낸다. 각 파티션마다 별도 큐를 두어 경합을 분산하고, 같은 배치 안에서는 lock-free로 append만 한다. Michael-Scott의 *helping* 패턴이 batch sealing 시점에 적용된다 — 한 thread가 sealing 중에 멈춰도 다른 thread가 끝까지 닫아준다.

**Java ConcurrentLinkedQueue** — `java.util.concurrent`의 표준 큐. Michael-Scott 알고리즘의 *거의 그대로의 구현*이다. Doug Lea가 작성. GC 언어라 ABA가 자동 해결되므로 version counter 없이 깨끗한 코드가 나온다.

| 시스템 | 핵심 기법 | ABA 처리 |
|---|---|---|
| Disruptor | Single-writer + sequence | sequence number (version의 일반화) |
| Kafka producer batch | Per-partition + lock-free append | GC로 자동 (JVM) |
| ConcurrentLinkedQueue | Michael-Scott 직접 구현 | GC로 자동 (JVM) |
| folly::MPMCQueue | Bounded + ticket | tag bit packing |

세 사례 모두 *완벽한 lock-free 일반화*를 노리지 않는다. 워크로드 가정(단일 writer, 배치 가능, GC 환경)을 활용해 *알고리즘을 단순화*한다. 이게 실용 시스템의 패턴 — 책의 일반 알고리즘은 worst case를 다루고, 실세계는 average case의 가정을 활용한다.

## 10.9 실용적 권장

| 상황 | 추천 |
|---|---|
| 짧은 임계 영역, 코어 ≈ 스레드 | Spin lock |
| 긴 임계 영역 | Mutex / condition variable |
| 단순 컨테이너 | Two-Lock Queue (락 두 개) |
| 고성능 lock-free | folly::MPMCQueue, moodycamel::ConcurrentQueue |
| 표준 | std::mutex + std::queue |

직접 lock-free queue를 짜는 것은 거의 항상 잘못이다. **검증된 라이브러리**를 쓴다.

## 10.10 C++20/23에서의 Lock-Free 프로그래밍

```cpp
// C++20 atomic_wait/notify (futex-like)
#include <atomic>
#include <thread>

std::atomic<int> flag{0};

void waiter() {
    flag.wait(0);  // flag가 0이 아닐 때까지 대기
    // 진행
}

void notifier() {
    flag.store(1);
    flag.notify_one();  // 또는 notify_all()
}
```

```cpp
// C++20 std::atomic<std::shared_ptr> — Lock-free shared_ptr
#include <atomic>
#include <memory>

std::atomic<std::shared_ptr<int>> atomic_ptr;

void writer() {
    auto new_ptr = std::make_shared<int>(42);
    atomic_ptr.store(new_ptr);
}

void reader() {
    auto ptr = atomic_ptr.load();
    if (ptr) {
        // 안전하게 사용
    }
}
```

## 정리

- Queue 동시성은 **두 끝(head/tail) 분리**가 핵심
- **Two-Lock Queue**가 가장 단순한 동시 구현
- **Michael-Scott**가 lock-free queue의 표준
- **ABA 문제** — 같은 값이지만 다른 의미
- ABA 해법 — version counter, hazard pointer, epoch
- GC 언어가 lock-free 구현에 유리
- 실용적으로는 **검증된 라이브러리** 사용

## 한국 개발자의 함정

**1. *ABA는 드문 일*이라는 오해**

- 실제로는 *높은 부하 + 메모리 재사용*에서 자주 발생
- 한 번 발생하면 디버깅 거의 불가능 (재현 어려움)
- 처음부터 대비 필요

**2. *C++ smart pointer라서 ABA 안전***

- std::shared_ptr 자체는 thread-safe하지만
- 포인터 교체 연산은 atomic이 아님
- C++20 std::atomic<std::shared_ptr> 사용

**3. *128-bit CAS = 만능***

- CMPXCHG16B는 x86-64 한정
- ARM은 LDXP/STXP (Load-Link/Store-Conditional 변형)
- 이식성 고려 시 hazard pointer가 안전

**4. *lock-free queue를 직접 구현***

- Michael-Scott도 미묘한 코너 케이스 많음
- 메모리 모델 (acquire/release) 어김
- folly / moodycamel / boost::lockfree 사용 권장

## 실무 적용

**이론 → 실무:**

- Two-Lock Queue      → std::mutex 두 개 + std::queue
- Michael-Scott       → folly::MPMCQueue, moodycamel::ConcurrentQueue
- ABA + version       → folly::PackedSyncPtr
- Hazard Pointer      → folly::HazptrHolder
- Epoch               → crossbeam-epoch (Rust)

**C++20 고성능 큐:**

- SPSC (단일 생산자-단일 소비자): boost::lockfree::spsc_queue
- MPMC (다중 생산자-다중 소비자): moodycamel::ConcurrentQueue
- Work stealing: folly::UnboundedQueue

**라이브러리 선택:**

- 일반용: std::mutex + std::queue (충분히 빠름)
- 고성능: moodycamel::ConcurrentQueue
- Facebook 스타일: folly::MPMCQueue
- Gaming/실시간: lock-free ring buffer

## 자기 점검

- [ ] ABA의 정의와 발생 조건?
- [ ] Michael-Scott에서 *helping*의 역할?
- [ ] version counter의 한계 (DCAS)?
- [ ] Hazard Pointer의 작동 원리?
- [ ] Epoch reclamation의 단점?
- [ ] GC 언어에서 ABA가 *자동* 해결되는 이유?

## 다음 장 예고

다음 장은 **Concurrent Stack과 Elimination** — Stack의 lock-free 디자인.

## 관련 항목

- [Ch 9: Linked Lists](/blog/parallel/parallel-principles/ch09-linked-lists-the-role-of-locking)
- [Ch 11: Stack과 Elimination](/blog/parallel/parallel-principles/ch11-concurrent-stacks-and-elimination)
- [C++ Concurrency in Action Ch 7: Lock-free](/blog/parallel/cpp-concurrency-in-action/chapter07-designing-lock-free-concurrent-data-structures)
- [C++ Concurrency in Action Ch 5: Memory Model](/blog/parallel/cpp-concurrency-in-action/chapter05-the-cpp-memory-model-and-operations-on-atomic-types)
