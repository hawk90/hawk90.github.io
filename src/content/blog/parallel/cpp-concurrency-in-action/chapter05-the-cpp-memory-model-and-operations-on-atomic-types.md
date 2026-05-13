---
title: "Ch 5: The C++ memory model and operations on atomic types"
date: 2026-05-20T05:00:00
description: "memory order — relaxed / acquire / release / seq_cst. std::atomic, fence, happens-before."
tags: [C++, Concurrency, Memory Model, Atomic, Memory Order]
series: "C++ Concurrency in Action"
seriesOrder: 5
draft: true
---

뮤텍스 없이 스레드 안전한 코드를 작성하려면 메모리 모델을 이해해야 한다. 이 장에서는 C++ 메모리 모델, `std::atomic`, 그리고 memory order를 다룬다.

## 5.1 메모리 모델이란

### 컴파일러와 CPU는 재정렬한다

작성한 코드와 실행되는 코드는 다를 수 있다.

```cpp
int a = 0, b = 0;

// 스레드 1
void thread1() {
    a = 1;  // (1)
    b = 2;  // (2)
}

// 스레드 2
void thread2() {
    while (b != 2);  // (3)
    assert(a == 1);  // 💥 실패할 수 있다!
}
```

**왜?**
- **컴파일러 재정렬**: 최적화로 (1)과 (2)의 순서를 바꿀 수 있다
- **CPU 재정렬**: 스토어 버퍼, 캐시 등으로 다른 코어에서 다른 순서로 관측될 수 있다

### C++ 메모리 모델의 목적

C++ 메모리 모델은 **멀티스레드 환경에서 코드의 의미**를 정의한다.

- 어떤 동작이 **정의**되고 어떤 동작이 **정의되지 않은**지
- 스레드 간에 **어떤 값이 관측될 수 있는**지
- **순서 보장**이 언제 성립하는지

### 핵심 개념: happens-before

**A happens-before B**이면:
- A의 결과가 B에서 보인다
- A의 부수 효과가 B 이전에 완료된다

```
mutex.lock()   happens-before   mutex.unlock()
a = 1          happens-before   mutex.unlock()
mutex.lock()   happens-before   read(a)

따라서:
a = 1 의 결과가 read(a)에서 보인다 ✓
```

뮤텍스는 happens-before 관계를 자동으로 만들어준다. atomic은 수동으로 제어한다.

## 5.2 std::atomic 기초

### 원자적 연산

`std::atomic<T>`의 연산은 **원자적**이다. 중간 상태가 관측되지 않는다.

```cpp
#include <atomic>

std::atomic<int> counter{0};

void increment() {
    ++counter;  // 원자적 증가. 데이터 레이스 없음.
}
```

### 기본 연산

```cpp
std::atomic<int> x{0};

// 저장 (store)
x.store(42);
x = 42;  // 동일

// 로드 (load)
int v = x.load();
int v2 = x;  // 동일

// 교환 (exchange)
int old = x.exchange(100);  // old = 42, x = 100

// Read-Modify-Write (RMW)
x.fetch_add(5);   // x += 5, 이전 값 반환
x.fetch_sub(3);   // x -= 3
x.fetch_and(0xF); // x &= 0xF
x.fetch_or(0x10); // x |= 0x10
x.fetch_xor(0x1); // x ^= 0x1
```

### compare_exchange

**CAS (Compare-And-Swap)**: 기대 값과 같으면 새 값으로 교체.

```cpp
std::atomic<int> x{5};

int expected = 5;
bool success = x.compare_exchange_strong(expected, 10);
// x == 5였으므로: x = 10, success = true, expected = 5

expected = 5;
success = x.compare_exchange_strong(expected, 20);
// x == 10이므로: x = 10 (불변), success = false, expected = 10 (현재값으로 갱신)
```

두 가지 버전:
- `compare_exchange_strong`: 정확히 동작. 루프 없이 사용 가능.
- `compare_exchange_weak`: spurious failure 가능. 루프 내에서 사용.

```cpp
// strong: 단일 시도
if (x.compare_exchange_strong(expected, new_value)) {
    // 성공
}

// weak: 루프 패턴
while (!x.compare_exchange_weak(expected, new_value)) {
    // expected는 현재 값으로 갱신됨
    // 필요하면 new_value 재계산
}
```

## 5.3 Memory Order

### 여섯 가지 memory order

```cpp
enum memory_order {
    memory_order_relaxed,
    memory_order_consume,  // 거의 사용 안 함
    memory_order_acquire,
    memory_order_release,
    memory_order_acq_rel,
    memory_order_seq_cst   // 기본값
};
```

### memory_order_seq_cst (기본값)

**Sequential Consistency**: 모든 스레드가 같은 순서를 관측한다.

```cpp
std::atomic<bool> x{false}, y{false};
std::atomic<int> z{0};

void thread1() {
    x.store(true, std::memory_order_seq_cst);
}

void thread2() {
    y.store(true, std::memory_order_seq_cst);
}

void thread3() {
    while (!x.load(std::memory_order_seq_cst));
    if (y.load(std::memory_order_seq_cst)) ++z;
}

void thread4() {
    while (!y.load(std::memory_order_seq_cst));
    if (x.load(std::memory_order_seq_cst)) ++z;
}

// 실행 후: z는 반드시 1 또는 2. 0은 불가능.
```

**seq_cst**는 가장 강한 보장이지만 성능 비용이 있다.

### memory_order_relaxed

**순서 보장 없음.** 원자성만 보장한다.

```cpp
std::atomic<int> counter{0};

void relaxed_increment() {
    counter.fetch_add(1, std::memory_order_relaxed);
}
```

**용도**: 단순 카운터. 순서가 중요하지 않을 때.

```cpp
// 예: 통계 수집
std::atomic<uint64_t> requests{0};
std::atomic<uint64_t> errors{0};

void handle_request() {
    requests.fetch_add(1, std::memory_order_relaxed);
    if (process()) {
        // OK
    } else {
        errors.fetch_add(1, std::memory_order_relaxed);
    }
}
```

### memory_order_acquire / release

**Acquire-Release 의미론**: 동기화 지점을 만든다.

```cpp
std::atomic<bool> ready{false};
int data = 0;

void producer() {
    data = 42;                                    // (1)
    ready.store(true, std::memory_order_release); // (2) release
}

void consumer() {
    while (!ready.load(std::memory_order_acquire)); // (3) acquire
    assert(data == 42);                             // (4) 반드시 성공
}
```

**규칙:**
- **Release store 이전**의 모든 쓰기는
- **Acquire load 이후**에서 반드시 보인다

![Acquire-Release 의미론](/images/blog/parallel/diagrams/acquire-release-semantics.svg)

### memory_order_acq_rel

Read-Modify-Write 연산에서 **동시에** acquire와 release 역할.

```cpp
std::atomic<Node*> head{nullptr};

void push(Node* node) {
    node->next = head.load(std::memory_order_relaxed);
    while (!head.compare_exchange_weak(
        node->next, node,
        std::memory_order_acq_rel,  // 성공 시: acquire + release
        std::memory_order_relaxed   // 실패 시: relaxed
    ));
}
```

## 5.4 std::atomic_flag

### 가장 단순한 atomic

`std::atomic_flag`는 lock-free가 **보장**되는 유일한 atomic 타입.

```cpp
std::atomic_flag flag = ATOMIC_FLAG_INIT;  // 반드시 이렇게 초기화

// test_and_set: true로 설정하고 이전 값 반환
bool was_set = flag.test_and_set();

// clear: false로 설정
flag.clear();
```

### 스핀락 구현

```cpp
class spinlock {
    std::atomic_flag flag = ATOMIC_FLAG_INIT;

public:
    void lock() {
        while (flag.test_and_set(std::memory_order_acquire)) {
            // 스핀
        }
    }

    void unlock() {
        flag.clear(std::memory_order_release);
    }
};
```

**주의:** 실제 코드에서는 `std::mutex`를 쓰라. 스핀락은 CPU를 낭비한다.

## 5.5 std::atomic<T*>

### 포인터 연산

```cpp
int data[10];
std::atomic<int*> ptr{data};

int* p = ptr.load();
ptr.store(data + 5);

// 포인터 산술
int* old = ptr.fetch_add(2);  // ptr += 2, 이전 포인터 반환
ptr.fetch_sub(1);             // ptr -= 1
```

### ABA 문제

포인터 atomic에서 주의할 점.

```cpp
// 스레드 1
Node* old = head.load();
// ... 중단 ...

// 스레드 2
pop(head);     // old 노드 제거
push(new_node);
push(old);     // 💥 같은 주소에 다른 노드!

// 스레드 1 재개
head.compare_exchange(old, new_head);  // 성공하지만 잘못됨!
```

**해결:** 7장에서 다룬다 (tagged pointer, hazard pointer).

## 5.6 Fences

### std::atomic_thread_fence

개별 연산이 아닌 **전역 동기화 지점**을 만든다.

```cpp
std::atomic<bool> x{false}, y{false};
int data = 0;

void producer() {
    data = 42;
    std::atomic_thread_fence(std::memory_order_release);
    x.store(true, std::memory_order_relaxed);
}

void consumer() {
    while (!x.load(std::memory_order_relaxed));
    std::atomic_thread_fence(std::memory_order_acquire);
    assert(data == 42);  // 성공
}
```

**fence는 연산과 분리된 동기화 지점.** 개별 연산에 memory order를 지정하는 것보다 유연하다.

### 용도

- 여러 relaxed 연산을 한 번에 동기화
- 레거시 코드와의 호환
- 성능 최적화 (신중하게!)

## 5.7 Memory Order 선택 가이드

### 결정 트리

```
순서가 중요한가?
├─ 아니오 → relaxed
│
└─ 예 → 다른 스레드와 동기화가 필요한가?
         ├─ 아니오 → relaxed (같은 변수에 대한 순서만 보장)
         │
         └─ 예 → 읽기인가, 쓰기인가?
                  ├─ 읽기 → acquire
                  ├─ 쓰기 → release
                  └─ 둘 다 (RMW) → acq_rel 또는 seq_cst
```

### 실용적 조언

1. **기본값으로 시작**: `seq_cst`
2. **프로파일링 후 최적화**: 정말 필요한 경우에만 약한 order 사용
3. **relaxed는 카운터에만**: 순서가 필요 없는 통계 등
4. **acquire/release 쌍으로**: 생산자-소비자 패턴
5. **의심스러우면 seq_cst**: 정확성 > 성능

## 5.8 실전 예제: Lock-free 카운터

### Relaxed 카운터

```cpp
class counter {
    std::atomic<long> count_{0};

public:
    void increment() {
        count_.fetch_add(1, std::memory_order_relaxed);
    }

    long get() const {
        return count_.load(std::memory_order_relaxed);
    }
};
```

### Acquire-Release 플래그

```cpp
class one_time_flag {
    std::atomic<bool> flag_{false};

public:
    void set() {
        flag_.store(true, std::memory_order_release);
    }

    void wait() {
        while (!flag_.load(std::memory_order_acquire)) {
            std::this_thread::yield();
        }
    }
};
```

### CAS 루프 패턴

```cpp
template<typename T>
class atomic_max {
    std::atomic<T> value_;

public:
    explicit atomic_max(T init) : value_(init) {}

    void update(T new_val) {
        T current = value_.load(std::memory_order_relaxed);
        while (new_val > current &&
               !value_.compare_exchange_weak(
                   current, new_val,
                   std::memory_order_relaxed)) {
            // current는 자동으로 현재 값으로 갱신됨
        }
    }

    T get() const {
        return value_.load(std::memory_order_relaxed);
    }
};
```

## 정리

- **C++ 메모리 모델**은 멀티스레드 코드의 의미를 정의한다
- **happens-before**가 핵심 개념이다. 이 관계가 없으면 데이터 레이스
- `std::atomic`은 원자적 연산을 제공한다
- **Memory order**로 동기화 강도를 제어한다:
  - `seq_cst`: 가장 강함, 기본값, 가장 안전
  - `acquire/release`: 생산자-소비자 동기화
  - `relaxed`: 순서 없음, 카운터 등에만
- **compare_exchange**는 lock-free 알고리즘의 핵심
- **fence**는 여러 연산을 한 번에 동기화

## 다음 장 예고

다음 장에서는 락 기반 스레드 안전 자료구조를 설계한다. 스택, 큐, 해시 테이블을 예로 들어 락 입자도와 성능 트레이드오프를 다룬다.
