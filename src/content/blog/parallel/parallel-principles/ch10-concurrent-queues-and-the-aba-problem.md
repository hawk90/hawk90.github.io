---
title: "Chapter 10: Concurrent Queue와 ABA 문제"
date: 2026-05-12T10:00:00
description: "Michael-Scott Lock-Free Queue. ABA 문제와 그 해법 — version counter, hazard pointer, epoch."
series: "The Art of Multiprocessor Programming"
seriesOrder: 10
tags: [parallel, concurrency, book-review, amp, queue, michael-scott, aba, hazard-pointer, C++, C]
type: book-review
bookTitle: "The Art of Multiprocessor Programming"
bookAuthor: "Maurice Herlihy, Nir Shavit"
draft: false
---

> **The Art of Multiprocessor Programming** Chapter 10 요약
>
> 이 시리즈는 C++20/23과 C11을 사용하여 최신 문법으로 재구성했다.

## 10.1 Queue의 동시성 도전

Queue는 두 끝(head, tail)에서 동시 작업이 일어난다. enqueue는 tail, dequeue는 head.

좋은 디자인 — **dequeue와 enqueue가 서로 안 막아야** 한다. 락을 두 개 따로 잡으면 가능.

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

## 10.3 Michael-Scott Lock-Free Queue

가장 유명한 lock-free queue. 표준 라이브러리들이 자주 이 알고리즘 사용.

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

## 10.4 ABA 문제

Lock-free 자료구조의 악명 높은 함정.

![ABA 문제](/images/blog/parallel/diagrams/aba-problem.svg)

```
시나리오:
1. 스레드 X: ptr 읽음 = A
2. 스레드 X: 잠시 멈춤 (interrupt)
3. 스레드 Y: pop(A), push(B), pop(B), push(A)
   → ptr이 다시 A지만, 내부 구조는 다름
4. 스레드 X: CAS(ptr, A, new) → 성공
   → 그러나 의도와 다른 결과
```

A → B → A로 돌아왔다. CAS는 단순히 "값이 같으면 성공"이므로 이 변화를 못 잡는다.

### 왜 위험한가

```
Lock-free stack:
1. X가 top 읽음 = A
2. Y가 pop(A) — A는 메모리 풀로
3. Y가 pop(B) — B도
4. Y가 push(A) — 재사용, 그러나 next 포인터가 다름
5. X가 CAS(top, A, ...) — 성공
6. → next 포인터가 잘못된 곳을 가리킴 → 메모리 손상
```

## 10.5 ABA 해법 — Version Counter

CAS의 대상에 **버전 카운터**를 추가.

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

## 10.6 ABA 해법 — Hazard Pointer

Michael의 hazard pointer (2004) — 메모리 회수와 ABA를 함께 해결.

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

## 10.8 GC 언어의 이점

Java / C# / Go 같은 GC 언어는 **ABA가 자동으로 해결되는 경우가 많다**.

- ABA에서 A가 두 번 등장하려면 메모리 회수가 일어나야 함
- GC 언어는 "누가 보고 있는 동안"은 회수 안 함
- 그래서 ABA가 발생 안 함

C++은 수동 회수 — hazard pointer / epoch / version counter 필요.

이게 lock-free 알고리즘 구현이 C++에서 특히 어려운 이유 중 하나.

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

```
1. *ABA는 드문 일*이라는 오해
   - 실제로는 *높은 부하 + 메모리 재사용*에서 자주 발생
   - 한 번 발생하면 디버깅 거의 불가능 (재현 어려움)
   - 처음부터 대비 필요

2. *C++ smart pointer라서 ABA 안전*
   - std::shared_ptr 자체는 thread-safe하지만
   - 포인터 교체 연산은 atomic이 아님
   - C++20 std::atomic<std::shared_ptr> 사용

3. *128-bit CAS = 만능*
   - CMPXCHG16B는 x86-64 한정
   - ARM은 LDXP/STXP (Load-Link/Store-Conditional 변형)
   - 이식성 고려 시 hazard pointer가 안전

4. *lock-free queue를 직접 구현*
   - Michael-Scott도 미묘한 코너 케이스 많음
   - 메모리 모델 (acquire/release) 어김
   - folly / moodycamel / boost::lockfree 사용 권장
```

## 실무 적용

```
이론 → 실무:
- Two-Lock Queue      → std::mutex 두 개 + std::queue
- Michael-Scott       → folly::MPMCQueue, moodycamel::ConcurrentQueue
- ABA + version       → folly::PackedSyncPtr
- Hazard Pointer      → folly::HazptrHolder
- Epoch               → crossbeam-epoch (Rust)

C++20 고성능 큐:
- SPSC (단일 생산자-단일 소비자): boost::lockfree::spsc_queue
- MPMC (다중 생산자-다중 소비자): moodycamel::ConcurrentQueue
- Work stealing: folly::UnboundedQueue

라이브러리 선택:
- 일반용: std::mutex + std::queue (충분히 빠름)
- 고성능: moodycamel::ConcurrentQueue
- Facebook 스타일: folly::MPMCQueue
- Gaming/실시간: lock-free ring buffer
```

## 자기 점검

```
□ ABA의 정의와 발생 조건?
□ Michael-Scott에서 *helping*의 역할?
□ version counter의 한계 (DCAS)?
□ Hazard Pointer의 작동 원리?
□ Epoch reclamation의 단점?
□ GC 언어에서 ABA가 *자동* 해결되는 이유?
```

## 다음 장 예고

다음 장은 **Concurrent Stack과 Elimination** — Stack의 lock-free 디자인.

## 관련 항목

- [Ch 9: Linked Lists](/blog/parallel/parallel-principles/ch09-linked-lists-the-role-of-locking)
- [Ch 11: Stack과 Elimination](/blog/parallel/parallel-principles/ch11-concurrent-stacks-and-elimination)
- [C++ Concurrency in Action Ch 7: Lock-free](/blog/parallel/cpp-concurrency-in-action/chapter07-designing-lock-free-concurrent-data-structures)
- [C++ Concurrency in Action Ch 5: Memory Model](/blog/parallel/cpp-concurrency-in-action/chapter05-the-cpp-memory-model-and-operations-on-atomic-types)
