---
title: "Ch 6: Designing lock-based concurrent data structures"
date: 2026-05-20T06:00:00
description: "thread-safe stack/queue/map 설계. 락 입자, 예외 안전, 인터페이스 vs 구현."
tags: [C++, C, Concurrency, Data Structures, Mutex]
series: "C++ Concurrency in Action"
seriesOrder: 6
draft: true
---

스레드 안전한 자료구조를 설계하는 방법을 다룬다. 단순히 뮤텍스를 감싸는 것 이상으로, 인터페이스 설계와 락 입자도가 중요하다.

## 6.1 설계 원칙

### 스레드 안전의 의미

자료구조가 스레드 안전하려면:
1. **불변성 유지**: 어떤 스레드도 깨진 상태를 관측하지 않는다
2. **데이터 레이스 없음**: 동시 접근이 안전하다
3. **예외 안전**: 예외 발생 시에도 일관된 상태 유지

### 인터페이스 설계의 중요성

3장에서 본 `top() + pop()` 문제를 기억하라.

```cpp
// 💥 스레드 안전하지 않은 인터페이스
stack.empty();    // true
stack.top();      // 💥 다른 스레드가 pop했으면?
stack.pop();
```

**해결:** 연산을 통합한다.

```cpp
// ✓ 스레드 안전한 인터페이스
std::optional<T> value = stack.try_pop();
```

### 락 입자도 (Granularity)

| 접근 | 장점 | 단점 |
|------|------|------|
| 전역 락 | 단순함 | 병렬성 없음 |
| 연산별 락 | 중간 병렬성 | 구현 복잡 |
| 노드별 락 | 최대 병렬성 | 매우 복잡, 데드락 위험 |

## 6.2 스레드 안전 스택

### 기본 구현

```cpp
#include <mutex>
#include <stack>
#include <memory>
#include <stdexcept>

struct empty_stack : std::exception {
    const char* what() const noexcept override {
        return "empty stack";
    }
};

template<typename T>
class threadsafe_stack {
    std::stack<T> data_;
    mutable std::mutex mtx_;

public:
    threadsafe_stack() = default;

    threadsafe_stack(const threadsafe_stack& other) {
        std::lock_guard lock(other.mtx_);
        data_ = other.data_;
    }

    threadsafe_stack& operator=(const threadsafe_stack&) = delete;

    void push(T value) {
        std::lock_guard lock(mtx_);
        data_.push(std::move(value));
    }

    std::shared_ptr<T> pop() {
        std::lock_guard lock(mtx_);
        if (data_.empty()) throw empty_stack();
        auto result = std::make_shared<T>(std::move(data_.top()));
        data_.pop();
        return result;
    }

    void pop(T& value) {
        std::lock_guard lock(mtx_);
        if (data_.empty()) throw empty_stack();
        value = std::move(data_.top());
        data_.pop();
    }

    bool empty() const {
        std::lock_guard lock(mtx_);
        return data_.empty();
    }
};
```

### 설계 결정

1. **`top()`과 `pop()` 통합**: 원자적 연산으로 경합 방지
2. **두 가지 `pop()` 오버로드**:
   - `shared_ptr<T>` 반환: 복사 불가 타입도 OK
   - 참조 인자: 할당 오버헤드 회피
3. **`mutable` mutex**: `const` 멤버 함수에서도 락 가능

### C11 스레드 안전 스택

```c
// C11 <threads.h> 기반 스레드 안전 스택
#include <threads.h>
#include <stdlib.h>
#include <stdbool.h>

typedef struct StackNode {
    void* data;
    struct StackNode* next;
} StackNode;

typedef struct {
    StackNode* head;
    mtx_t mtx;
} ThreadsafeStack;

int ts_stack_init(ThreadsafeStack* s) {
    s->head = NULL;
    return mtx_init(&s->mtx, mtx_plain);
}

void ts_stack_destroy(ThreadsafeStack* s) {
    mtx_lock(&s->mtx);
    while (s->head != NULL) {
        StackNode* old = s->head;
        s->head = old->next;
        free(old);
    }
    mtx_unlock(&s->mtx);
    mtx_destroy(&s->mtx);
}

void ts_stack_push(ThreadsafeStack* s, void* data) {
    StackNode* new_node = malloc(sizeof(StackNode));
    new_node->data = data;

    mtx_lock(&s->mtx);
    new_node->next = s->head;
    s->head = new_node;
    mtx_unlock(&s->mtx);
}

bool ts_stack_try_pop(ThreadsafeStack* s, void** out_data) {
    mtx_lock(&s->mtx);
    if (s->head == NULL) {
        mtx_unlock(&s->mtx);
        return false;
    }
    StackNode* old = s->head;
    *out_data = old->data;
    s->head = old->next;
    mtx_unlock(&s->mtx);
    free(old);
    return true;
}

bool ts_stack_empty(ThreadsafeStack* s) {
    mtx_lock(&s->mtx);
    bool empty = (s->head == NULL);
    mtx_unlock(&s->mtx);
    return empty;
}
```

### 한계

- **전역 락**: push와 pop이 동시에 불가
- **예외 시 데이터 손실 가능**: `pop()` 중 복사 생성자 예외

## 6.3 스레드 안전 큐

### 기본 구현 (조건 변수 사용)

```cpp
#include <queue>
#include <mutex>
#include <condition_variable>
#include <memory>

template<typename T>
class threadsafe_queue {
    std::queue<T> data_;
    mutable std::mutex mtx_;
    std::condition_variable cv_;

public:
    void push(T value) {
        {
            std::lock_guard lock(mtx_);
            data_.push(std::move(value));
        }
        cv_.notify_one();
    }

    void wait_and_pop(T& value) {
        std::unique_lock lock(mtx_);
        cv_.wait(lock, [this] { return !data_.empty(); });
        value = std::move(data_.front());
        data_.pop();
    }

    std::shared_ptr<T> wait_and_pop() {
        std::unique_lock lock(mtx_);
        cv_.wait(lock, [this] { return !data_.empty(); });
        auto result = std::make_shared<T>(std::move(data_.front()));
        data_.pop();
        return result;
    }

    bool try_pop(T& value) {
        std::lock_guard lock(mtx_);
        if (data_.empty()) return false;
        value = std::move(data_.front());
        data_.pop();
        return true;
    }

    std::shared_ptr<T> try_pop() {
        std::lock_guard lock(mtx_);
        if (data_.empty()) return nullptr;
        auto result = std::make_shared<T>(std::move(data_.front()));
        data_.pop();
        return result;
    }

    bool empty() const {
        std::lock_guard lock(mtx_);
        return data_.empty();
    }
};
```

### C11 스레드 안전 큐

```c
// C11 <threads.h> 기반 스레드 안전 큐 (조건 변수 사용)
#include <threads.h>
#include <stdlib.h>
#include <stdbool.h>

typedef struct QueueNode {
    void* data;
    struct QueueNode* next;
} QueueNode;

typedef struct {
    QueueNode* head;
    QueueNode* tail;
    mtx_t mtx;
    cnd_t not_empty;
} ThreadsafeQueue;

int ts_queue_init(ThreadsafeQueue* q) {
    q->head = NULL;
    q->tail = NULL;
    if (mtx_init(&q->mtx, mtx_plain) != thrd_success) return -1;
    if (cnd_init(&q->not_empty) != thrd_success) {
        mtx_destroy(&q->mtx);
        return -1;
    }
    return 0;
}

void ts_queue_destroy(ThreadsafeQueue* q) {
    mtx_lock(&q->mtx);
    while (q->head != NULL) {
        QueueNode* old = q->head;
        q->head = old->next;
        free(old);
    }
    mtx_unlock(&q->mtx);
    cnd_destroy(&q->not_empty);
    mtx_destroy(&q->mtx);
}

void ts_queue_push(ThreadsafeQueue* q, void* data) {
    QueueNode* new_node = malloc(sizeof(QueueNode));
    new_node->data = data;
    new_node->next = NULL;

    mtx_lock(&q->mtx);
    if (q->tail == NULL) {
        q->head = q->tail = new_node;
    } else {
        q->tail->next = new_node;
        q->tail = new_node;
    }
    cnd_signal(&q->not_empty);
    mtx_unlock(&q->mtx);
}

void ts_queue_wait_and_pop(ThreadsafeQueue* q, void** out_data) {
    mtx_lock(&q->mtx);
    while (q->head == NULL) {
        cnd_wait(&q->not_empty, &q->mtx);
    }
    QueueNode* old = q->head;
    *out_data = old->data;
    q->head = old->next;
    if (q->head == NULL) q->tail = NULL;
    mtx_unlock(&q->mtx);
    free(old);
}

bool ts_queue_try_pop(ThreadsafeQueue* q, void** out_data) {
    mtx_lock(&q->mtx);
    if (q->head == NULL) {
        mtx_unlock(&q->mtx);
        return false;
    }
    QueueNode* old = q->head;
    *out_data = old->data;
    q->head = old->next;
    if (q->head == NULL) q->tail = NULL;
    mtx_unlock(&q->mtx);
    free(old);
    return true;
}
```

### Fine-grained 락 큐

head와 tail에 별도 락을 사용하면 push와 pop이 동시에 가능하다.

![Fine-grained 큐 구조](/images/blog/parallel/diagrams/fine-grained-queue.svg)

```cpp
template<typename T>
class fine_grained_queue {
    struct node {
        std::shared_ptr<T> data;
        std::unique_ptr<node> next;
    };

    std::mutex head_mtx_;
    std::unique_ptr<node> head_;
    std::mutex tail_mtx_;
    node* tail_;

    node* get_tail() {
        std::lock_guard lock(tail_mtx_);
        return tail_;
    }

    std::unique_ptr<node> pop_head() {
        std::lock_guard lock(head_mtx_);
        if (head_.get() == get_tail()) {
            return nullptr;
        }
        std::unique_ptr<node> old_head = std::move(head_);
        head_ = std::move(old_head->next);
        return old_head;
    }

public:
    fine_grained_queue() : head_(new node), tail_(head_.get()) {}

    fine_grained_queue(const fine_grained_queue&) = delete;
    fine_grained_queue& operator=(const fine_grained_queue&) = delete;

    void push(T value) {
        auto new_data = std::make_shared<T>(std::move(value));
        std::unique_ptr<node> p(new node);
        node* new_tail = p.get();
        {
            std::lock_guard lock(tail_mtx_);
            tail_->data = new_data;
            tail_->next = std::move(p);
            tail_ = new_tail;
        }
    }

    std::shared_ptr<T> try_pop() {
        std::unique_ptr<node> old_head = pop_head();
        return old_head ? old_head->data : nullptr;
    }
};
```

**핵심:** 더미 노드를 사용해 head와 tail이 같은 노드를 가리키는 것을 방지한다. 이로써 head_mtx와 tail_mtx를 분리할 수 있다.

### C11 Fine-grained 락 큐

```c
// C11 Two-Lock Queue (head/tail 분리)
#include <threads.h>
#include <stdlib.h>
#include <stdbool.h>

typedef struct FGNode {
    void* data;
    struct FGNode* next;
} FGNode;

typedef struct {
    FGNode* head;
    FGNode* tail;
    mtx_t head_mtx;
    mtx_t tail_mtx;
} FineGrainedQueue;

int fg_queue_init(FineGrainedQueue* q) {
    // 더미 노드 생성
    FGNode* dummy = malloc(sizeof(FGNode));
    dummy->data = NULL;
    dummy->next = NULL;

    q->head = q->tail = dummy;

    if (mtx_init(&q->head_mtx, mtx_plain) != thrd_success) return -1;
    if (mtx_init(&q->tail_mtx, mtx_plain) != thrd_success) {
        mtx_destroy(&q->head_mtx);
        return -1;
    }
    return 0;
}

void fg_queue_push(FineGrainedQueue* q, void* data) {
    FGNode* new_node = malloc(sizeof(FGNode));
    new_node->data = data;
    new_node->next = NULL;

    mtx_lock(&q->tail_mtx);
    q->tail->next = new_node;
    q->tail = new_node;
    mtx_unlock(&q->tail_mtx);
}

bool fg_queue_try_pop(FineGrainedQueue* q, void** out_data) {
    mtx_lock(&q->head_mtx);
    FGNode* old_head = q->head;
    FGNode* new_head = old_head->next;

    if (new_head == NULL) {
        mtx_unlock(&q->head_mtx);
        return false;  // 큐가 비어 있음
    }

    *out_data = new_head->data;
    q->head = new_head;
    mtx_unlock(&q->head_mtx);

    free(old_head);  // 이전 더미 노드 해제
    return true;
}
```

## 6.4 스레드 안전 해시 맵

### Bucket-level 락

```cpp
#include <vector>
#include <list>
#include <shared_mutex>
#include <functional>
#include <algorithm>

template<typename Key, typename Value, typename Hash = std::hash<Key>>
class threadsafe_map {
    class bucket {
        using bucket_value = std::pair<Key, Value>;
        using bucket_data = std::list<bucket_value>;
        bucket_data data_;
        mutable std::shared_mutex mtx_;

        typename bucket_data::iterator find_entry(const Key& key) {
            return std::find_if(data_.begin(), data_.end(),
                [&](const bucket_value& item) {
                    return item.first == key;
                });
        }

    public:
        Value value_for(const Key& key, const Value& default_value) const {
            std::shared_lock lock(mtx_);
            auto it = std::find_if(data_.begin(), data_.end(),
                [&](const bucket_value& item) {
                    return item.first == key;
                });
            return it == data_.end() ? default_value : it->second;
        }

        void add_or_update(const Key& key, const Value& value) {
            std::unique_lock lock(mtx_);
            auto it = find_entry(key);
            if (it == data_.end()) {
                data_.push_back({key, value});
            } else {
                it->second = value;
            }
        }

        void remove(const Key& key) {
            std::unique_lock lock(mtx_);
            auto it = find_entry(key);
            if (it != data_.end()) {
                data_.erase(it);
            }
        }
    };

    std::vector<std::unique_ptr<bucket>> buckets_;
    Hash hasher_;

    bucket& get_bucket(const Key& key) const {
        size_t index = hasher_(key) % buckets_.size();
        return *buckets_[index];
    }

public:
    explicit threadsafe_map(size_t num_buckets = 19)
        : buckets_(num_buckets) {
        for (auto& b : buckets_) {
            b = std::make_unique<bucket>();
        }
    }

    threadsafe_map(const threadsafe_map&) = delete;
    threadsafe_map& operator=(const threadsafe_map&) = delete;

    Value value_for(const Key& key, const Value& default_value = Value()) const {
        return get_bucket(key).value_for(key, default_value);
    }

    void add_or_update(const Key& key, const Value& value) {
        get_bucket(key).add_or_update(key, value);
    }

    void remove(const Key& key) {
        get_bucket(key).remove(key);
    }
};
```

### 설계 포인트

1. **버킷별 락**: 서로 다른 버킷 접근은 병렬 가능
2. **shared_mutex**: 읽기는 동시에, 쓰기는 배타적
3. **고정 버킷 수**: 리사이징은 복잡하므로 생략

### C11 스레드 안전 해시 맵 (POSIX rwlock)

```c
// C11 + POSIX — Bucket-level Read-Write Lock Hash Map
#include <pthread.h>
#include <stdlib.h>
#include <string.h>
#include <stdbool.h>

#define NUM_BUCKETS 19

typedef struct Entry {
    char* key;
    int value;
    struct Entry* next;
} Entry;

typedef struct {
    Entry* head;
    pthread_rwlock_t lock;
} Bucket;

typedef struct {
    Bucket buckets[NUM_BUCKETS];
} ThreadsafeMap;

static size_t hash_string(const char* key) {
    size_t hash = 0;
    while (*key) {
        hash = hash * 31 + (unsigned char)*key++;
    }
    return hash;
}

int ts_map_init(ThreadsafeMap* m) {
    for (int i = 0; i < NUM_BUCKETS; ++i) {
        m->buckets[i].head = NULL;
        if (pthread_rwlock_init(&m->buckets[i].lock, NULL) != 0) {
            // 이전에 초기화된 락 정리
            for (int j = 0; j < i; ++j) {
                pthread_rwlock_destroy(&m->buckets[j].lock);
            }
            return -1;
        }
    }
    return 0;
}

void ts_map_destroy(ThreadsafeMap* m) {
    for (int i = 0; i < NUM_BUCKETS; ++i) {
        pthread_rwlock_wrlock(&m->buckets[i].lock);
        Entry* e = m->buckets[i].head;
        while (e != NULL) {
            Entry* next = e->next;
            free(e->key);
            free(e);
            e = next;
        }
        pthread_rwlock_unlock(&m->buckets[i].lock);
        pthread_rwlock_destroy(&m->buckets[i].lock);
    }
}

bool ts_map_get(ThreadsafeMap* m, const char* key, int* out_value, int default_value) {
    size_t idx = hash_string(key) % NUM_BUCKETS;
    Bucket* b = &m->buckets[idx];

    pthread_rwlock_rdlock(&b->lock);  // 읽기 락
    for (Entry* e = b->head; e != NULL; e = e->next) {
        if (strcmp(e->key, key) == 0) {
            *out_value = e->value;
            pthread_rwlock_unlock(&b->lock);
            return true;
        }
    }
    pthread_rwlock_unlock(&b->lock);
    *out_value = default_value;
    return false;
}

void ts_map_put(ThreadsafeMap* m, const char* key, int value) {
    size_t idx = hash_string(key) % NUM_BUCKETS;
    Bucket* b = &m->buckets[idx];

    pthread_rwlock_wrlock(&b->lock);  // 쓰기 락

    // 기존 엔트리 찾기
    for (Entry* e = b->head; e != NULL; e = e->next) {
        if (strcmp(e->key, key) == 0) {
            e->value = value;
            pthread_rwlock_unlock(&b->lock);
            return;
        }
    }

    // 새 엔트리 추가
    Entry* new_entry = malloc(sizeof(Entry));
    new_entry->key = strdup(key);
    new_entry->value = value;
    new_entry->next = b->head;
    b->head = new_entry;

    pthread_rwlock_unlock(&b->lock);
}

void ts_map_remove(ThreadsafeMap* m, const char* key) {
    size_t idx = hash_string(key) % NUM_BUCKETS;
    Bucket* b = &m->buckets[idx];

    pthread_rwlock_wrlock(&b->lock);

    Entry** pp = &b->head;
    while (*pp != NULL) {
        if (strcmp((*pp)->key, key) == 0) {
            Entry* to_delete = *pp;
            *pp = to_delete->next;
            free(to_delete->key);
            free(to_delete);
            pthread_rwlock_unlock(&b->lock);
            return;
        }
        pp = &(*pp)->next;
    }

    pthread_rwlock_unlock(&b->lock);
}
```

**참고:** C11 표준은 `<threads.h>`만 제공하고 읽기-쓰기 락(`shared_mutex` 상당)은 없다. POSIX `pthread_rwlock_t`를 사용한다.

## 6.5 예외 안전성

### 기본 보장 vs 강한 보장

| 수준 | 의미 |
|------|------|
| 없음 | 예외 시 상태 불명 |
| 기본 보장 | 예외 시 유효한 상태, 데이터 손실 가능 |
| 강한 보장 | 예외 시 원래 상태 |
| 무예외 | 예외 던지지 않음 |

### 강한 보장 달성

```cpp
void push(T value) {
    auto new_data = std::make_shared<T>(std::move(value));  // 예외 가능
    std::lock_guard lock(mtx_);
    data_.push(new_data);  // noexcept (포인터 복사)
}
```

**핵심:** 예외 가능 연산(할당, 복사)을 락 **밖에서** 수행한다.

## 6.6 설계 가이드라인

### 체크리스트

1. **인터페이스**
   - [ ] 경합 가능한 연산 조합이 없는가?
   - [ ] 반환 값으로 성공/실패 전달하는가?
   - [ ] 예외 안전한가?

2. **락**
   - [ ] 락 범위가 최소인가?
   - [ ] 데드락 가능성이 없는가?
   - [ ] 읽기 전용 연산에 shared_lock을 쓰는가?

3. **성능**
   - [ ] 예외 가능 코드를 락 밖으로 뺐는가?
   - [ ] 락 보유 중 I/O나 무거운 연산이 없는가?

### 일반적인 실수

```cpp
// 💥 실수 1: 락 보유 중 외부 함수 호출
void bad_push(T value) {
    std::lock_guard lock(mtx_);
    log("Pushing");  // 💥 log가 락을 잡으면 데드락!
    data_.push(std::move(value));
}

// 💥 실수 2: 참조 반환으로 내부 노출
T& top() {
    std::lock_guard lock(mtx_);
    return data_.top();  // 💥 락 해제 후 참조 사용됨
}
```

## 정리

- **인터페이스**가 스레드 안전의 핵심이다. 경합 가능 조합을 제거하라
- **락 입자도**와 **병렬성**은 트레이드오프다
- **shared_mutex**로 읽기 병렬성을 높여라
- **예외 가능 코드**를 락 밖에서 실행하라
- 락 보유 중 **외부 함수 호출을 피하라**

## 한국 개발자의 함정

```
1. *std::stack을 mutex로 감싸면 thread-safe*
   - 개별 연산은 안전
   - empty + top + pop 조합은 race
   - 인터페이스 자체를 재설계 필요

2. *fine-grained lock = 항상 더 빠름*
   - 락 획득/해제 비용 큼
   - 짧은 임계 영역은 coarse가 더 빠름
   - 측정 + 경합 수준에 따라 선택

3. *shared_mutex가 만능*
   - reader가 압도적일 때만 이득
   - 짧은 임계 영역은 mutex가 더 빠름
   - 쓰기/읽기 비율 측정 필수

4. *예외 시 데이터 손실*
   - pop()이 복사 생성자에서 예외 → 데이터 손실
   - shared_ptr 반환 또는 참조 인자로 해결
   - move semantics + RAII 활용

5. *락 안에서 외부 함수 호출*
   - 콜백 / 로깅 / 알림이 락을 잡으면 deadlock
   - 락 해제 후 호출
   - "락은 최소한"
```

## 실무 적용

```
이론 → 실무:
- threadsafe_stack       → 직접 구현 (std::stack + mutex)
- threadsafe_queue       → boost::lockfree::queue (lock-free 대체)
- threadsafe_map         → folly::ConcurrentHashMap, tbb::concurrent_hash_map
- fine-grained queue     → Michael-Scott (lock-free) 대체

언어별:
- C++: oneTBB (구 TBB), folly, boost::lockfree, std::shared_mutex
- Java: ConcurrentLinkedQueue, ConcurrentHashMap (lock-free 또는 striped)
- Rust: dashmap, crossbeam::queue
- Go: sync.Map, channel

설계 원칙:
- 인터페이스: try_pop, wait_pop (분리된 empty + top 금지)
- 락 입자: 측정 후 선택
- 예외: 강한 보장 추구 (shared_ptr 반환)
- 락 범위: 최소화 (할당은 락 밖)
```

## 자기 점검

```
□ empty + top + pop 조합이 race인 이유?
□ try_pop과 wait_pop 패턴 차이?
□ Fine-grained queue에서 dummy node의 역할?
□ Bucket-level locking과 striped locking 차이?
□ 강한 예외 보장 달성 방법?
□ 락 안 외부 함수 호출의 위험성?
```

## 다음 장 예고

다음 장에서는 **lock-free** 자료구조를 다룬다. 뮤텍스 없이 원자적 연산만으로 스레드 안전을 달성하는 방법을 살펴본다.

## 관련 항목

- [Ch 3: Sharing Data](/blog/parallel/cpp-concurrency-in-action/chapter03-sharing-data-between-threads)
- [Ch 5: Memory Model](/blog/parallel/cpp-concurrency-in-action/chapter05-the-cpp-memory-model-and-operations-on-atomic-types)
- [Ch 7: Lock-free Data Structures](/blog/parallel/cpp-concurrency-in-action/chapter07-designing-lock-free-concurrent-data-structures)
- [AMP Ch 9: Linked Lists](/blog/parallel/parallel-principles/ch09-linked-lists-the-role-of-locking)
- [AMP Ch 13: Concurrent Hashing](/blog/parallel/parallel-principles/ch13-concurrent-hashing-and-natural-parallelism)
- [AMP Ch 14: Skiplists](/blog/parallel/parallel-principles/ch14-skiplists-and-balanced-search)
