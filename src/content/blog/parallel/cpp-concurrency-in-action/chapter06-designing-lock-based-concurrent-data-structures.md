---
title: "Ch 6: Designing lock-based concurrent data structures"
date: 2026-05-20T06:00:00
description: "thread-safe stack/queue/map 설계. 락 입자, 예외 안전, 인터페이스 vs 구현."
tags: [C++, Concurrency, Data Structures, Mutex]
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

### Fine-grained 락 큐

head와 tail에 별도 락을 사용하면 push와 pop이 동시에 가능하다.

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

## 다음 장 예고

다음 장에서는 **lock-free** 자료구조를 다룬다. 뮤텍스 없이 원자적 연산만으로 스레드 안전을 달성하는 방법을 살펴본다.
