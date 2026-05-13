---
title: "Ch 3: Sharing data between threads"
date: 2026-05-20T03:00:00
description: "race condition, std::mutex, lock guard, deadlock 회피, std::shared_mutex."
tags: [C++, Concurrency, Mutex, Race Condition, Deadlock]
series: "C++ Concurrency in Action"
seriesOrder: 3
draft: true
---

스레드가 데이터를 공유하는 순간 문제가 시작된다. 이 장에서는 race condition의 본질, `std::mutex`로 보호하는 방법, deadlock을 피하는 전략을 다룬다.

## 3.1 Race Condition

### 데이터 레이스란

두 스레드가 같은 메모리에 동시에 접근하고, **적어도 하나가 쓰기**이면 **데이터 레이스**다.

```cpp
int counter = 0;

void increment() {
    for (int i = 0; i < 100000; ++i) {
        ++counter;  // 💥 데이터 레이스
    }
}

int main() {
    std::thread t1(increment);
    std::thread t2(increment);
    t1.join();
    t2.join();
    std::cout << counter << "\n";  // 예상: 200000, 실제: ?
}
```

실행할 때마다 다른 값이 나올 수 있다. 170000, 185432, 199876 — 예측 불가능하다.

### 왜 이런 일이?

`++counter`는 단일 연산이 아니다. 세 단계로 분해된다.

```
1. 메모리에서 counter 읽기   (LOAD)
2. 값에 1 더하기            (ADD)
3. 결과를 메모리에 쓰기      (STORE)
```

두 스레드가 동시에 실행하면:

```
Thread 1              Thread 2              counter
───────────────────────────────────────────────────
LOAD (0)                                    0
                      LOAD (0)              0
ADD (0+1=1)                                 0
                      ADD (0+1=1)           0
STORE (1)                                   1
                      STORE (1)             1  ← 하나 잃어버림!
```

두 스레드 모두 0을 읽어서 1을 썼다. 증가는 두 번 일어났지만 결과는 1이다.

### C++ 표준에서의 데이터 레이스

C++ 표준은 명확하다: **데이터 레이스는 정의되지 않은 동작(UB)**이다.

> 두 표현식 평가가 같은 메모리 위치에 접근하고, 적어도 하나가 수정이며, 둘 사이에 happens-before 관계가 없으면, 프로그램의 동작은 정의되지 않는다.

UB이므로 컴파일러는 아무 가정이나 할 수 있다. 최적화로 코드를 완전히 다르게 바꿔도 합법이다.

## 3.2 std::mutex

### 기본 사용법

`std::mutex`는 상호 배제(mutual exclusion)를 제공한다.

```cpp
#include <mutex>

std::mutex mtx;
int counter = 0;

void safe_increment() {
    for (int i = 0; i < 100000; ++i) {
        mtx.lock();
        ++counter;
        mtx.unlock();
    }
}
```

한 스레드가 `lock()`을 호출하면, 다른 스레드는 `unlock()`될 때까지 `lock()`에서 대기한다.

### 문제: 예외 시 unlock 실패

```cpp
void risky() {
    mtx.lock();
    process();  // 💥 예외 발생!
    mtx.unlock();  // 도달 못함 → 영원히 잠김
}
```

## 3.3 Lock Guards

### std::lock_guard

RAII로 락을 관리한다. 생성자에서 lock, 소멸자에서 unlock.

```cpp
void safe() {
    std::lock_guard<std::mutex> guard(mtx);
    ++counter;  // 보호됨
}  // guard 소멸 → 자동 unlock
```

**C++17부터 CTAD(Class Template Argument Deduction)** 사용 가능:

```cpp
std::lock_guard guard(mtx);  // <std::mutex> 생략
```

### std::unique_lock

`lock_guard`보다 유연하다. 지연 락, 조기 해제, 조건 변수와 함께 사용.

```cpp
std::unique_lock<std::mutex> lock(mtx);  // 즉시 락

// 지연 락
std::unique_lock<std::mutex> lock2(mtx, std::defer_lock);
// ... 나중에
lock2.lock();

// 조기 해제
lock.unlock();
// ... 락 없이 작업
lock.lock();  // 다시 획득

// 이동 가능
std::unique_lock<std::mutex> lock3 = std::move(lock);
```

### std::scoped_lock (C++17)

**여러 뮤텍스를 한 번에** deadlock 없이 잠근다.

```cpp
std::mutex mtx1, mtx2;

void safe_swap(Data& a, Data& b) {
    std::scoped_lock lock(mtx1, mtx2);  // 순서 무관, deadlock 방지
    std::swap(a, b);
}
```

**새 코드에서는 `std::scoped_lock`을 기본으로 사용하라.** 단일 뮤텍스도 OK.

## 3.4 Deadlock

### 교착 상태란

두 스레드가 서로가 가진 락을 기다리며 영원히 블로킹.

```cpp
std::mutex mtx_a, mtx_b;

void thread1() {
    std::lock_guard<std::mutex> lock_a(mtx_a);
    std::this_thread::sleep_for(1ms);  // 타이밍 문제 유발
    std::lock_guard<std::mutex> lock_b(mtx_b);  // 💥 thread2가 mtx_b 보유
}

void thread2() {
    std::lock_guard<std::mutex> lock_b(mtx_b);
    std::this_thread::sleep_for(1ms);
    std::lock_guard<std::mutex> lock_a(mtx_a);  // 💥 thread1이 mtx_a 보유
}
```

```
Thread 1              Thread 2
──────────────────────────────────
lock(mtx_a) ✓        lock(mtx_b) ✓
   ...                  ...
lock(mtx_b) 대기 →   lock(mtx_a) 대기 →
     ↑_______________________|
              데드락!
```

### 데드락의 4조건 (Coffman)

네 조건이 **모두** 만족되어야 데드락이 발생한다:

1. **상호 배제** — 리소스를 한 번에 하나만 사용
2. **점유 대기** — 리소스를 점유하면서 다른 리소스 대기
3. **비선점** — 강제로 리소스를 빼앗을 수 없음
4. **순환 대기** — 스레드들이 원형으로 서로를 대기

하나라도 깨면 데드락은 발생하지 않는다.

### 회피 전략 1: 락 순서 고정

모든 스레드가 **같은 순서**로 락을 획득하면 순환 대기가 깨진다.

```cpp
// 항상 mtx_a → mtx_b 순서로
void thread1() {
    std::lock_guard<std::mutex> lock_a(mtx_a);
    std::lock_guard<std::mutex> lock_b(mtx_b);
    // ...
}

void thread2() {
    std::lock_guard<std::mutex> lock_a(mtx_a);  // 순서 동일
    std::lock_guard<std::mutex> lock_b(mtx_b);
    // ...
}
```

### 회피 전략 2: std::lock + std::scoped_lock

`std::lock`은 데드락 회피 알고리즘을 사용해 여러 뮤텍스를 한 번에 잠근다.

```cpp
// C++11/14: std::lock + adopt_lock
void safe_swap() {
    std::lock(mtx_a, mtx_b);  // 둘 다 잠금 (순서 자동 결정)
    std::lock_guard<std::mutex> lock_a(mtx_a, std::adopt_lock);
    std::lock_guard<std::mutex> lock_b(mtx_b, std::adopt_lock);
    // ...
}

// C++17: scoped_lock (더 간단)
void safe_swap_17() {
    std::scoped_lock lock(mtx_a, mtx_b);
    // ...
}
```

### 회피 전략 3: 락 계층 (Hierarchical Locking)

각 뮤텍스에 레벨을 부여하고, **낮은 레벨 → 높은 레벨 순서로만** 획득한다.

```cpp
class hierarchical_mutex {
    std::mutex mtx_;
    unsigned long const hierarchy_value_;
    unsigned long previous_hierarchy_value_;
    static thread_local unsigned long this_thread_hierarchy_value_;

    void check_for_hierarchy_violation() {
        if (this_thread_hierarchy_value_ <= hierarchy_value_) {
            throw std::logic_error("mutex hierarchy violated");
        }
    }

public:
    explicit hierarchical_mutex(unsigned long value)
        : hierarchy_value_(value), previous_hierarchy_value_(0) {}

    void lock() {
        check_for_hierarchy_violation();
        mtx_.lock();
        previous_hierarchy_value_ = this_thread_hierarchy_value_;
        this_thread_hierarchy_value_ = hierarchy_value_;
    }

    void unlock() {
        this_thread_hierarchy_value_ = previous_hierarchy_value_;
        mtx_.unlock();
    }

    bool try_lock() {
        check_for_hierarchy_violation();
        if (!mtx_.try_lock()) return false;
        previous_hierarchy_value_ = this_thread_hierarchy_value_;
        this_thread_hierarchy_value_ = hierarchy_value_;
        return true;
    }
};

thread_local unsigned long
    hierarchical_mutex::this_thread_hierarchy_value_ = ULONG_MAX;
```

사용 예:

```cpp
hierarchical_mutex high_level(10000);
hierarchical_mutex mid_level(5000);
hierarchical_mutex low_level(1000);

void good() {
    std::lock_guard<hierarchical_mutex> h(high_level);
    std::lock_guard<hierarchical_mutex> m(mid_level);  // OK: 10000 > 5000
    std::lock_guard<hierarchical_mutex> l(low_level);  // OK: 5000 > 1000
}

void bad() {
    std::lock_guard<hierarchical_mutex> l(low_level);
    std::lock_guard<hierarchical_mutex> h(high_level);  // 💥 예외: 1000 < 10000
}
```

## 3.5 std::shared_mutex

### Reader-Writer Lock

읽기는 동시에 여러 스레드가, 쓰기는 배타적으로.

```cpp
#include <shared_mutex>

std::shared_mutex rw_mtx;
std::map<int, std::string> cache;

std::string read(int key) {
    std::shared_lock<std::shared_mutex> lock(rw_mtx);  // 읽기 락
    auto it = cache.find(key);
    return it != cache.end() ? it->second : "";
}

void write(int key, const std::string& value) {
    std::unique_lock<std::shared_mutex> lock(rw_mtx);  // 쓰기 락 (배타적)
    cache[key] = value;
}
```

- `std::shared_lock` — 읽기 락. 다른 shared_lock과 공존 가능.
- `std::unique_lock` — 쓰기 락. 다른 모든 락과 배타적.

### 언제 사용하는가

| 상황 | 권장 |
|------|------|
| 읽기 >> 쓰기 | `std::shared_mutex` |
| 읽기 ≈ 쓰기 | 일반 `std::mutex` |
| 쓰기 >> 읽기 | 일반 `std::mutex` |

`shared_mutex`는 오버헤드가 있다. 읽기가 압도적으로 많을 때만 이득이다.

## 3.6 std::call_once

### 단 한 번만 실행

초기화를 스레드 안전하게 한 번만 수행한다.

```cpp
std::once_flag init_flag;
std::shared_ptr<Resource> resource;

void init_resource() {
    resource = std::make_shared<Resource>();
}

void use_resource() {
    std::call_once(init_flag, init_resource);  // 첫 호출만 실행
    resource->do_something();
}
```

여러 스레드가 동시에 `call_once`를 호출해도 `init_resource`는 **정확히 한 번**만 실행된다. 나머지는 완료까지 대기.

### 정적 지역 변수의 대안

C++11부터 정적 지역 변수 초기화는 스레드 안전하다.

```cpp
Resource& get_resource() {
    static Resource instance;  // 스레드 안전한 초기화 (C++11+)
    return instance;
}
```

컴파일러가 내부적으로 `call_once`와 유사한 메커니즘을 사용한다.

## 3.7 락 입자도 (Granularity)

### 세밀한 락 vs 거친 락

| 입자도 | 장점 | 단점 |
|--------|------|------|
| **거친 락 (Coarse)** | 단순, 데드락 위험 낮음 | 병렬성 낮음 |
| **세밀한 락 (Fine)** | 병렬성 높음 | 복잡, 데드락 위험 |

```cpp
// 거친 락: 전체 컨테이너에 하나의 락
class CoarseQueue {
    std::mutex mtx_;
    std::queue<T> data_;
public:
    void push(T value) {
        std::lock_guard lock(mtx_);
        data_.push(std::move(value));
    }
    // ...
};

// 세밀한 락: 노드별 락 (6장에서 다룸)
// 더 복잡하지만 병렬 접근 가능
```

### 락 보유 시간 최소화

락을 잡고 있는 동안에는 **필요한 작업만** 수행한다.

```cpp
void bad() {
    std::lock_guard lock(mtx_);
    auto result = expensive_computation(data_);  // 💥 락 잡고 오래 계산
    send_to_network(result);                      // 💥 락 잡고 I/O
}

void good() {
    Data local_copy;
    {
        std::lock_guard lock(mtx_);
        local_copy = data_;  // 최소한의 작업만
    }
    auto result = expensive_computation(local_copy);  // 락 없이 계산
    send_to_network(result);                          // 락 없이 I/O
}
```

## 3.8 스레드 안전한 인터페이스

### top() + pop() 문제

```cpp
std::stack<int> s;

// 스레드 안전하지 않음!
if (!s.empty()) {
    int value = s.top();  // 다른 스레드가 pop 할 수 있음
    s.pop();              // 💥 이미 비어 있을 수 있음
}
```

`empty()`, `top()`, `pop()`이 개별적으로 보호되어도 **조합**이 안전하지 않다.

### 해결: 통합 인터페이스

```cpp
class threadsafe_stack {
    std::stack<T> data_;
    mutable std::mutex mtx_;
public:
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

    bool try_pop(T& value) {
        std::lock_guard lock(mtx_);
        if (data_.empty()) return false;
        value = std::move(data_.top());
        data_.pop();
        return true;
    }
};
```

`top()`과 `pop()`을 **하나의 원자적 연산**으로 합쳤다.

## 정리

- **데이터 레이스**는 정의되지 않은 동작이다. 반드시 동기화해야 한다
- `std::mutex`로 임계 영역을 보호한다. RAII 가드(`lock_guard`, `scoped_lock`)를 사용하라
- **데드락**은 순환 대기에서 발생한다. 락 순서 고정 또는 `std::scoped_lock` 사용
- `std::shared_mutex`는 읽기 위주 워크로드에서 병렬성을 높인다
- `std::call_once`로 스레드 안전한 일회성 초기화
- 락 입자도와 보유 시간을 최적화하라
- 인터페이스 레벨에서 원자성을 보장하라 (`top() + pop()` 통합)

## 다음 장 예고

다음 장에서는 스레드 간 **동기화**를 다룬다. condition variable로 이벤트를 대기하고, future/promise로 결과를 전달하고, C++20의 latch와 barrier를 살펴본다.
