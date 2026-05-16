---
title: "Ch 7: Designing lock-free concurrent data structures"
date: 2026-05-20T07:00:00
description: "lock-free / wait-free 정의, compare-and-swap, ABA 문제, hazard pointer."
tags: [C++, C, Concurrency, Lock-free, Atomic, CAS]
series: "C++ Concurrency in Action"
seriesOrder: 7
draft: true
---

뮤텍스 없이 스레드 안전한 자료구조를 만들 수 있다. 원자적 연산만으로 동기화를 달성하는 lock-free 프로그래밍을 다룬다.

## 7.1 Lock-free의 의미

### 정의

| 용어 | 정의 | 보장 |
|------|------|------|
| **Lock-free** | 최소 하나의 스레드가 진행 | 일부 starvation 가능 |
| **Wait-free** | 모든 스레드가 유한 시간 내 진행 | starvation 없음 |
| **Obstruction-free** | 다른 스레드 중단 시 진행 | 가장 약함 |

```cpp
// Lock-free: 한 스레드가 멈춰도 다른 스레드는 진행
void lock_free_push(Node* node) {
    node->next = head.load();
    while (!head.compare_exchange_weak(node->next, node));
    // CAS 실패 = 다른 스레드가 성공 → 시스템은 진행 중
}

// Lock-based: 락 보유 스레드가 멈추면 모두 멈춤
void lock_based_push(Node* node) {
    std::lock_guard lock(mtx);  // 💥 이 스레드가 죽으면?
    node->next = head;
    head = node;
}
```

### 왜 Lock-free인가

| 장점 | 단점 |
|------|------|
| 데드락 불가 | 구현 복잡 |
| 우선순위 역전 없음 | 디버깅 어려움 |
| 시그널 핸들러 안전 | 메모리 관리 복잡 |
| 일부 상황에서 더 빠름 | ABA, 메모리 순서 이슈 |

**현실:** 대부분의 경우 `std::mutex`가 더 낫다. lock-free는 특수한 상황에서만.

## 7.2 Lock-free 스택

![CAS 루프 흐름](/images/blog/parallel/diagrams/cas-loop.svg)

### 기본 구현

```cpp
template<typename T>
class lock_free_stack {
    struct node {
        std::shared_ptr<T> data;
        node* next;
        node(const T& d) : data(std::make_shared<T>(d)), next(nullptr) {}
    };

    std::atomic<node*> head{nullptr};

public:
    void push(const T& data) {
        node* new_node = new node(data);
        new_node->next = head.load();
        while (!head.compare_exchange_weak(new_node->next, new_node));
    }

    std::shared_ptr<T> pop() {
        node* old_head = head.load();
        while (old_head &&
               !head.compare_exchange_weak(old_head, old_head->next));
        return old_head ? old_head->data : nullptr;
        // 💥 old_head 메모리 누수!
    }
};
```

**문제:** `old_head`를 언제 `delete`할 수 있는가? 다른 스레드가 아직 사용 중일 수 있다.

### C11 Lock-free 스택 (Treiber Stack)

```c
// C11 <stdatomic.h> 기반 Lock-free Stack
#include <stdatomic.h>
#include <stdlib.h>
#include <stdbool.h>

typedef struct LFNode {
    void* data;
    struct LFNode* next;
} LFNode;

typedef struct {
    _Atomic(LFNode*) head;
} LockFreeStack;

void lf_stack_init(LockFreeStack* s) {
    atomic_store(&s->head, NULL);
}

void lf_stack_push(LockFreeStack* s, void* data) {
    LFNode* new_node = malloc(sizeof(LFNode));
    new_node->data = data;

    LFNode* old_head = atomic_load_explicit(&s->head, memory_order_relaxed);
    do {
        new_node->next = old_head;
    } while (!atomic_compare_exchange_weak_explicit(
        &s->head,
        &old_head,
        new_node,
        memory_order_release,
        memory_order_relaxed));
}

bool lf_stack_pop(LockFreeStack* s, void** out_data) {
    LFNode* old_head = atomic_load_explicit(&s->head, memory_order_acquire);

    while (old_head != NULL) {
        if (atomic_compare_exchange_weak_explicit(
                &s->head,
                &old_head,
                old_head->next,
                memory_order_release,
                memory_order_acquire)) {
            *out_data = old_head->data;
            // 주의: old_head 메모리 회수는 별도 처리 필요!
            // free(old_head); // 위험! 다른 스레드가 사용 중일 수 있음
            return true;
        }
    }
    return false;  // 스택이 비어 있음
}
```

## 7.3 메모리 회수 문제

### 문제 상황

```
Thread 1                    Thread 2
───────────────────────────────────────
old = head.load()
                            old = head.load() // 같은 노드
head.CAS(old, old->next)
delete old                  // 💥 Thread 2가 아직 사용 중!
                            old->data  // 💥 use-after-free
```

### 해결법 1: 지연 삭제 (Deferred Reclamation)

삭제 대상 노드를 목록에 모았다가 안전할 때 삭제.

```cpp
std::atomic<node*> to_be_deleted{nullptr};

void try_reclaim(node* old_head) {
    if (threads_in_pop == 1) {  // 혼자면 안전하게 삭제
        node* nodes = to_be_deleted.exchange(nullptr);
        delete_nodes(nodes);
        delete old_head;
    } else {
        // 나중에 삭제
        old_head->next = to_be_deleted.load();
        while (!to_be_deleted.compare_exchange_weak(old_head->next, old_head));
    }
}
```

### 해결법 2: Hazard Pointer

"이 포인터를 사용 중"이라고 공개적으로 선언.

```cpp
std::atomic<void*> hazard_pointers[MAX_THREADS];

void* get_hazard_pointer_for_current_thread() {
    // 현재 스레드의 hazard pointer 반환
}

template<typename T>
class hazard_pointer_owner {
    std::atomic<void*>& hp_;
public:
    hazard_pointer_owner() : hp_(get_hazard_pointer_for_current_thread()) {}
    ~hazard_pointer_owner() { hp_.store(nullptr); }

    void set(T* p) { hp_.store(p); }
    T* get() const { return static_cast<T*>(hp_.load()); }
};

// 삭제 전: 아무도 이 포인터를 hazard로 등록하지 않았는지 확인
bool outstanding_hazard_pointers_for(void* p) {
    for (auto& hp : hazard_pointers) {
        if (hp.load() == p) return true;
    }
    return false;
}
```

#### C11 Hazard Pointer (개념적 구현)

```c
// C11 Hazard Pointer 개념
#include <stdatomic.h>
#include <stdbool.h>
#include <stdlib.h>

#define MAX_THREADS 64
#define HP_PER_THREAD 2

typedef struct {
    _Atomic(void*) hazard[HP_PER_THREAD];
} HPRecord;

static HPRecord hp_records[MAX_THREADS];
static _Thread_local int my_thread_idx = -1;
static atomic_int next_thread_idx = 0;

static void hp_init_thread(void) {
    if (my_thread_idx < 0) {
        my_thread_idx = atomic_fetch_add(&next_thread_idx, 1);
    }
}

// 포인터 보호 선언
void* hp_protect(int slot, _Atomic(void*)* source) {
    hp_init_thread();
    void* ptr;
    do {
        ptr = atomic_load(source);
        atomic_store(&hp_records[my_thread_idx].hazard[slot], ptr);
    } while (ptr != atomic_load(source));  // 변경됐으면 재시도
    return ptr;
}

// 보호 해제
void hp_clear(int slot) {
    atomic_store(&hp_records[my_thread_idx].hazard[slot], NULL);
}

// 삭제 가능 여부 확인
bool hp_is_protected(void* ptr) {
    for (int i = 0; i < MAX_THREADS; ++i) {
        for (int j = 0; j < HP_PER_THREAD; ++j) {
            if (atomic_load(&hp_records[i].hazard[j]) == ptr) {
                return true;  // 누군가 보호 중
            }
        }
    }
    return false;
}

// 안전할 때만 삭제
void hp_retire(void* ptr) {
    // 실제 구현에서는 retire list에 추가하고
    // 주기적으로 scan해서 보호되지 않은 것만 삭제
    if (!hp_is_protected(ptr)) {
        free(ptr);
    }
    // else: retire list에 추가하고 나중에 재시도
}
```

### 해결법 3: Reference Counting

`std::shared_ptr`의 원자적 버전을 사용.

```cpp
template<typename T>
class lock_free_stack_refcount {
    struct counted_node_ptr {
        int external_count;
        node* ptr;
    };

    struct node {
        std::shared_ptr<T> data;
        std::atomic<int> internal_count;
        counted_node_ptr next;
    };

    std::atomic<counted_node_ptr> head;
    // ... 복잡한 구현 ...
};
```

## 7.4 ABA 문제

![ABA 문제](/images/blog/parallel/diagrams/aba-problem.svg)

### 문제 상황

```
초기: head → A → B → C

Thread 1                    Thread 2
───────────────────────────────────────
old = head (= A)
expected_next = old->next (= B)
                            pop() // A 제거
                            pop() // B 제거
                            push(D)
                            push(A) // 같은 주소 재사용!
                            // head → A → D

// Thread 1 재개
head.CAS(A, B)  // 성공! A == A
// 💥 head → B (하지만 B는 이미 삭제됨!)
```

### 해결: Tagged Pointer

포인터에 카운터를 추가해 ABA를 탐지.

```cpp
struct counted_node_ptr {
    uint16_t tag;      // 변경 횟수
    node* ptr;
};

// 64비트 시스템에서 atomic<counted_node_ptr> 사용 가능
// 또는 128비트 CAS 필요 (cmpxchg16b)

void push(node* new_node) {
    counted_node_ptr new_head;
    new_head.ptr = new_node;
    counted_node_ptr old_head = head.load();
    do {
        new_node->next = old_head;
        new_head.tag = old_head.tag + 1;  // 태그 증가
    } while (!head.compare_exchange_weak(old_head, new_head));
}
```

### C11 Tagged Pointer (ABA 해결)

```c
// C11 Tagged Pointer (포인터 하위 비트 활용)
#include <stdatomic.h>
#include <stdint.h>
#include <stdbool.h>

// 64비트 시스템에서 포인터 하위 3비트는 정렬로 인해 항상 0
// 이 비트를 버전 카운터로 활용 (0-7 범위)
// 더 큰 범위가 필요하면 128비트 CAS 사용

typedef struct {
    uintptr_t value;  // 포인터 + 하위 비트에 태그
} TaggedPtr;

#define TAG_BITS 3
#define TAG_MASK ((1UL << TAG_BITS) - 1)
#define PTR_MASK (~TAG_MASK)

static inline void* tagged_get_ptr(TaggedPtr tp) {
    return (void*)(tp.value & PTR_MASK);
}

static inline unsigned tagged_get_tag(TaggedPtr tp) {
    return (unsigned)(tp.value & TAG_MASK);
}

static inline TaggedPtr tagged_make(void* ptr, unsigned tag) {
    TaggedPtr tp;
    tp.value = ((uintptr_t)ptr & PTR_MASK) | (tag & TAG_MASK);
    return tp;
}

// 더 큰 태그가 필요한 경우 (16비트 태그 + 48비트 포인터)
// x86-64에서 사용자 공간 주소는 48비트만 유효

typedef struct {
    uint64_t ptr_and_tag;  // 상위 16비트: 태그, 하위 48비트: 포인터
} WideTaggedPtr;

#define WIDE_TAG_SHIFT 48
#define WIDE_PTR_MASK ((1ULL << WIDE_TAG_SHIFT) - 1)

static inline void* wide_tagged_get_ptr(WideTaggedPtr tp) {
    return (void*)(tp.ptr_and_tag & WIDE_PTR_MASK);
}

static inline uint16_t wide_tagged_get_tag(WideTaggedPtr tp) {
    return (uint16_t)(tp.ptr_and_tag >> WIDE_TAG_SHIFT);
}

static inline WideTaggedPtr wide_tagged_make(void* ptr, uint16_t tag) {
    WideTaggedPtr tp;
    tp.ptr_and_tag = ((uint64_t)tag << WIDE_TAG_SHIFT) |
                     ((uintptr_t)ptr & WIDE_PTR_MASK);
    return tp;
}

// 사용 예: Lock-Free Stack with Tagged Pointer
typedef struct TaggedNode {
    void* data;
    WideTaggedPtr next;
} TaggedNode;

typedef struct {
    _Atomic(uint64_t) head;  // WideTaggedPtr를 uint64_t로
} TaggedStack;

void tagged_stack_push(TaggedStack* s, void* data) {
    TaggedNode* new_node = aligned_alloc(8, sizeof(TaggedNode));
    new_node->data = data;

    uint64_t old_head = atomic_load(&s->head);
    uint64_t new_head;

    do {
        WideTaggedPtr old_tp = {old_head};
        new_node->next = old_tp;

        // 태그 증가
        WideTaggedPtr new_tp = wide_tagged_make(
            new_node,
            wide_tagged_get_tag(old_tp) + 1);
        new_head = new_tp.ptr_and_tag;
    } while (!atomic_compare_exchange_weak(&s->head, &old_head, new_head));
}
```

## 7.5 Lock-free 큐

### Michael-Scott 큐 (요약)

```cpp
template<typename T>
class lock_free_queue {
    struct node {
        std::atomic<T*> data;
        std::atomic<node*> next;
    };

    std::atomic<node*> head;
    std::atomic<node*> tail;

public:
    lock_free_queue() {
        node* dummy = new node;
        dummy->next = nullptr;
        head = tail = dummy;
    }

    void push(T value) {
        T* new_data = new T(std::move(value));
        node* new_node = new node;
        new_node->data = new_data;
        new_node->next = nullptr;

        node* old_tail;
        while (true) {
            old_tail = tail.load();
            node* next = old_tail->next.load();
            if (old_tail == tail.load()) {
                if (next == nullptr) {
                    if (old_tail->next.compare_exchange_weak(next, new_node)) {
                        break;  // 성공
                    }
                } else {
                    // tail 뒤처짐 → 앞으로
                    tail.compare_exchange_weak(old_tail, next);
                }
            }
        }
        tail.compare_exchange_weak(old_tail, new_node);
    }

    // pop은 더 복잡... (hazard pointer 또는 reference counting 필요)
};
```

## 7.6 가이드라인

### 언제 Lock-free를 쓰는가

| 상황 | 권장 |
|------|------|
| 일반적인 경우 | `std::mutex` |
| 시그널 핸들러 | lock-free 필요 |
| 실시간 시스템 | lock-free 고려 |
| 극한 성능 | 프로파일 후 결정 |

### 구현 팁

1. **작게 시작**: 복잡한 구조 대신 단순한 것부터
2. **검증된 구현 사용**: Intel oneTBB, Boost.Lockfree, folly
3. **메모리 순서 신중히**: `seq_cst`로 시작, 필요시 완화
4. **ABA 대비**: tagged pointer 또는 hazard pointer
5. **테스트**: ThreadSanitizer 필수

## 정리

- **Lock-free**는 최소 하나의 스레드가 진행을 보장한다
- **메모리 회수**가 핵심 과제다: hazard pointer, reference counting
- **ABA 문제**는 tagged pointer로 해결한다
- 대부분의 경우 **`std::mutex`가 더 낫다**
- lock-free가 필요하면 **검증된 라이브러리**를 사용하라

## 한국 개발자의 함정

```
1. *Lock-free = 무조건 빠름*
   - 구현 복잡 + cache contention → 종종 락보다 느림
   - 짧은 임계 영역이면 std::mutex가 충분
   - 측정 없이 lock-free 선택 금지

2. *new/delete를 lock-free에서 자유롭게*
   - 메모리 회수가 ABA의 원인
   - hazard pointer / epoch / 지연 삭제 필요
   - 직접 구현은 거의 항상 누수 또는 use-after-free

3. *Wait-free = Lock-free*
   - Wait-free는 더 강한 조건
   - 모든 스레드가 유한 step 안에 진행
   - 거의 모든 lock-free 자료구조는 wait-free 아님

4. *atomic<T>가 lock-free임*
   - 컴파일러가 mutex로 구현할 수도
   - is_lock_free() / is_always_lock_free 체크
   - atomic_flag만 항상 lock-free 보장

5. *seq_cst로 lock-free 짜면 안전*
   - 정확성은 맞지만 *극도로* 느림
   - 락보다 못한 경우 다반사
   - 필요한 만큼만 약한 order 사용
```

## 실무 적용

```
이론 → 실무:
- Lock-free Stack (Treiber) → boost::lockfree::stack
- Lock-free Queue (M-S)     → boost::lockfree::queue, folly::MPMCQueue
- SPSC Queue                → folly::ProducerConsumerQueue, rigtorp/SPSCQueue
- Hazard Pointer            → folly::hazptr, libcds, atomic_shared_ptr
- Epoch-based               → crossbeam-epoch (Rust)

언어별:
- C++: boost::lockfree, folly, libcds, moodycamel::ConcurrentQueue
- Java: ConcurrentLinkedQueue, AtomicReference (GC가 ABA 해결)
- Rust: crossbeam (epoch-based)
- Go: 직접 구현 드묾, channel로 대체

설계 결정:
- 우선 std::mutex 시도
- 측정에서 mutex가 병목 → lock-free 라이브러리
- 라이브러리에 없는 자료구조 → 신중히 직접 구현
- 직접 구현 시 ThreadSanitizer + 검증 필수
```

## 자기 점검

```
□ Lock-free와 Wait-free 차이?
□ ABA 문제 발생 시나리오?
□ Hazard Pointer 작동 원리?
□ Tagged Pointer로 ABA 해결?
□ Michael-Scott Queue의 helping 메커니즘?
□ is_lock_free()와 is_always_lock_free 차이?
□ Lock-free가 무조건 *빠른 게 아닌* 이유?
```

## 다음 장 예고

다음 장에서는 동시성 코드 설계를 다룬다. 작업 분할, false sharing, Amdahl의 법칙을 살펴본다.

## 관련 항목

- [Ch 5: Memory Model](/blog/parallel/cpp-concurrency-in-action/chapter05-the-cpp-memory-model-and-operations-on-atomic-types)
- [Ch 6: Lock-based Data Structures](/blog/parallel/cpp-concurrency-in-action/chapter06-designing-lock-based-concurrent-data-structures)
- [Ch 8: Designing Concurrent Code](/blog/parallel/cpp-concurrency-in-action/chapter08-designing-concurrent-code)
- [AMP Ch 10: Concurrent Queues and ABA](/blog/parallel/parallel-principles/ch10-concurrent-queues-and-the-aba-problem)
- [AMP Ch 11: Concurrent Stacks](/blog/parallel/parallel-principles/ch11-concurrent-stacks-and-elimination)
- [AMP Ch 5: Synchronization Power](/blog/parallel/parallel-principles/ch05-relative-power-of-synchronization) — CAS와 합의
