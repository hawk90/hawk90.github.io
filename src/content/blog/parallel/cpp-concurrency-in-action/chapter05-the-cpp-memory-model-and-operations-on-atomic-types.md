---
title: "Ch 5: The C++ memory model and operations on atomic types"
date: 2026-05-06T05:00:00
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

## 5.3 C11 원자적 연산 (`<stdatomic.h>`)

C11은 C++11과 호환되는 원자적 연산을 `<stdatomic.h>`에서 제공한다.

### C11 기본 atomic 타입

```c
#include <stdatomic.h>
#include <stdbool.h>

// 기본 타입
atomic_int counter = 0;
atomic_bool flag = false;
atomic_long value = 0;

// 또는 _Atomic 키워드
_Atomic int counter2 = 0;
_Atomic(int) counter3 = 0;
```

### C11 atomic 연산

```c
#include <stdatomic.h>

atomic_int x = 0;

// 저장 (store)
atomic_store(&x, 42);
atomic_store_explicit(&x, 42, memory_order_release);

// 로드 (load)
int v = atomic_load(&x);
int v2 = atomic_load_explicit(&x, memory_order_acquire);

// 교환 (exchange)
int old = atomic_exchange(&x, 100);

// Read-Modify-Write
atomic_fetch_add(&x, 5);   // x += 5
atomic_fetch_sub(&x, 3);   // x -= 3
atomic_fetch_and(&x, 0xF); // x &= 0xF
atomic_fetch_or(&x, 0x10); // x |= 0x10
atomic_fetch_xor(&x, 0x1); // x ^= 0x1
```

### C11 compare_exchange

```c
atomic_int x = 5;

int expected = 5;
bool success = atomic_compare_exchange_strong(&x, &expected, 10);
// x == 5였으므로: x = 10, success = true

expected = 5;
success = atomic_compare_exchange_strong(&x, &expected, 20);
// x == 10이므로: success = false, expected = 10 (현재값)

// weak 버전 (루프에서 사용)
while (!atomic_compare_exchange_weak(&x, &expected, new_value)) {
    // expected는 현재 값으로 갱신됨
}
```

### C11 vs C++11 비교표

| 기능 | C11 | C++11 |
|------|-----|-------|
| 헤더 | `<stdatomic.h>` | `<atomic>` |
| 정수 타입 | `atomic_int` | `std::atomic<int>` |
| 초기화 | `atomic_int x = 0;` | `std::atomic<int> x{0};` |
| 저장 | `atomic_store(&x, v)` | `x.store(v)` |
| 로드 | `atomic_load(&x)` | `x.load()` |
| 교환 | `atomic_exchange(&x, v)` | `x.exchange(v)` |
| RMW | `atomic_fetch_add(&x, 1)` | `x.fetch_add(1)` |
| CAS | `atomic_compare_exchange_strong(&x, &exp, new)` | `x.compare_exchange_strong(exp, new)` |
| Memory order | `memory_order_seq_cst` | `std::memory_order_seq_cst` |

### C11 Memory Order

```c
// C11과 C++11의 memory_order는 동일
enum memory_order {
    memory_order_relaxed,
    memory_order_consume,
    memory_order_acquire,
    memory_order_release,
    memory_order_acq_rel,
    memory_order_seq_cst
};

// 명시적 memory order
atomic_store_explicit(&x, 42, memory_order_release);
int v = atomic_load_explicit(&x, memory_order_acquire);

atomic_fetch_add_explicit(&x, 1, memory_order_relaxed);
```

### C11 atomic_flag

```c
#include <stdatomic.h>

// 초기화 (반드시 이 매크로 사용)
atomic_flag flag = ATOMIC_FLAG_INIT;

// test_and_set
bool was_set = atomic_flag_test_and_set(&flag);
bool was_set2 = atomic_flag_test_and_set_explicit(&flag, memory_order_acquire);

// clear
atomic_flag_clear(&flag);
atomic_flag_clear_explicit(&flag, memory_order_release);
```

### C11 스핀락

```c
#include <stdatomic.h>

typedef struct {
    atomic_flag flag;
} spinlock_t;

#define SPINLOCK_INIT { ATOMIC_FLAG_INIT }

void spinlock_lock(spinlock_t* lock) {
    while (atomic_flag_test_and_set_explicit(&lock->flag, memory_order_acquire)) {
        // 스핀
    }
}

void spinlock_unlock(spinlock_t* lock) {
    atomic_flag_clear_explicit(&lock->flag, memory_order_release);
}

// 사용
spinlock_t lock = SPINLOCK_INIT;
spinlock_lock(&lock);
// 임계 영역
spinlock_unlock(&lock);
```

### C11 Fence

```c
#include <stdatomic.h>

atomic_bool ready = false;
int data = 0;

void producer(void) {
    data = 42;
    atomic_thread_fence(memory_order_release);
    atomic_store_explicit(&ready, true, memory_order_relaxed);
}

void consumer(void) {
    while (!atomic_load_explicit(&ready, memory_order_relaxed)) {}
    atomic_thread_fence(memory_order_acquire);
    assert(data == 42);  // 성공
}
```

### C11 완전한 예제: Lock-free 카운터

```c
#include <stdio.h>
#include <stdatomic.h>
#include <threads.h>

atomic_long counter = 0;

int worker(void* arg) {
    int increments = *(int*)arg;
    for (int i = 0; i < increments; ++i) {
        atomic_fetch_add_explicit(&counter, 1, memory_order_relaxed);
    }
    return 0;
}

int main(void) {
    const int num_threads = 4;
    const int increments = 100000;

    thrd_t threads[num_threads];
    int arg = increments;

    for (int i = 0; i < num_threads; ++i) {
        thrd_create(&threads[i], worker, &arg);
    }

    for (int i = 0; i < num_threads; ++i) {
        thrd_join(threads[i], NULL);
    }

    printf("Counter: %ld (expected: %d)\n",
           atomic_load(&counter), num_threads * increments);
    return 0;
}
```

> **참고:** C11 `<stdatomic.h>`와 C++11 `<atomic>`은 ABI 호환이 보장되지 않는다. C/C++ 혼합 프로젝트에서는 주의가 필요하다. 동일한 atomic 변수를 C와 C++에서 공유하지 마라.

## 5.4 Memory Order

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

## 5.5 std::atomic_flag

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

## 5.6 std::atomic<T*>

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

## 5.7 Fences

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

## 5.8 Memory Order 선택 가이드

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

## 5.9 실전 예제: Lock-free 카운터

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

## 한국 개발자의 함정

```
1. *relaxed로 다 빠르게*
   - 카운터 외에는 거의 항상 잘못
   - 동기화가 없어 다른 변수의 가시성 보장 안 됨
   - 의심스러우면 seq_cst

2. *acquire/release 쌍이 *변수마다*
   - release store의 *이전* 쓰기가 acquire load *이후* 보임
   - 같은 atomic 변수에 대한 acquire/release여야 함
   - 다른 변수 쌍은 동기화 안 됨

3. *x86이라 memory_order 무시 OK*
   - x86은 strong (TSO)이지만 컴파일러 재정렬은 여전히
   - ARM/POWER 이식 시 깨짐
   - 항상 memory_order 명시

4. *compare_exchange_strong vs weak*
   - weak는 spurious failure 가능 (특히 ARM)
   - strong은 내부 루프, 비용 약간 높음
   - 루프 안에서는 weak, 단일 시도는 strong

5. *seq_cst가 항상 자유로운 동기화*
   - 다중 변수 간 *global total order* 보장
   - 일부 컴파일러는 mfence (x86) 발생 → 비쌈
   - 가능하면 acq/rel
```

## 실무 적용

```
이론 → 실무:
- std::atomic<T>             → Java AtomicInteger / AtomicReference
- memory_order_relaxed       → AtomicInteger.lazySet 유사
- memory_order_acq_rel       → Java volatile semantics (대략)
- memory_order_seq_cst       → Java volatile + sequential consistency
- compare_exchange           → AtomicInteger.compareAndSet
- std::atomic_thread_fence   → Java VarHandle.fullFence

언어별:
- C++: std::atomic, std::memory_order
- Java: AtomicInteger, VarHandle (Java 9+), volatile
- Rust: std::sync::atomic, Ordering::{Relaxed, Acquire, Release, AcqRel, SeqCst}
- Go: sync/atomic (seq_cst만)
- C: stdatomic.h (C11+)

설계 패턴:
- 카운터 / 통계         → relaxed
- 단일 flag 통보       → release/acquire
- Producer-Consumer    → release write + acquire read
- Lock-free 자료구조   → acq_rel + 신중한 설계
- 모르겠으면           → seq_cst
```

## 자기 점검

```
□ Happens-before의 정의?
□ Sequential Consistency vs Acquire/Release 차이?
□ Relaxed에서 *원자성*은 보장되지만 *순서*는 안 되는 이유?
□ compare_exchange_weak의 spurious failure?
□ x86 TSO와 ARM Relaxed 메모리 모델 차이?
□ atomic_thread_fence의 용도?
□ atomic_flag만 lock-free 보장인 이유?
```

## 다음 장 예고

다음 장에서는 락 기반 스레드 안전 자료구조를 설계한다. 스택, 큐, 해시 테이블을 예로 들어 락 입자도와 성능 트레이드오프를 다룬다.

## 관련 항목

- [Ch 4: Synchronizing Concurrent Operations](/blog/parallel/cpp-concurrency-in-action/chapter04-synchronizing-concurrent-operations)
- [Ch 6: Lock-based Data Structures](/blog/parallel/cpp-concurrency-in-action/chapter06-designing-lock-based-concurrent-data-structures)
- [Ch 7: Lock-free Data Structures](/blog/parallel/cpp-concurrency-in-action/chapter07-designing-lock-free-concurrent-data-structures)
- [AMP Ch 3: Concurrent Objects](/blog/parallel/parallel-principles/ch03-concurrent-objects) — linearizability
- [AMP Ch 4: Shared Memory](/blog/parallel/parallel-principles/ch04-foundations-of-shared-memory) — memory models
- [AMP Ch 5: Synchronization Power](/blog/parallel/parallel-principles/ch05-relative-power-of-synchronization) — CAS
