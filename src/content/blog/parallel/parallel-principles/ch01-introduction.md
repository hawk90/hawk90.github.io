---
title: "Chapter 1: Introduction"
date: 2026-05-12
description: "멀티프로세서 프로그래밍이 왜 필요한가. 공유 메모리와 메시지 전달. 병렬 프로그래밍의 어려움."
series: "The Art of Multiprocessor Programming"
seriesOrder: 1
tags: [parallel, concurrency, book-review, amp, introduction, C++, C]
type: book-review
bookTitle: "The Art of Multiprocessor Programming"
bookAuthor: "Maurice Herlihy, Nir Shavit"
draft: false
---

> **The Art of Multiprocessor Programming** Chapter 1 요약
>
> 이 시리즈는 C++20/23과 C11을 사용하여 최신 문법으로 재구성했다.

## 1.1 공유 객체와 동기화

### 왜 멀티프로세서인가?

**Moore's Law의 종말**

```
1970s-2000s: 클럭 속도 ↑ → 단일 스레드 성능 ↑
2005~: 클럭 속도 정체 (발열 한계)
2005~: 코어 수 ↑ → 병렬 처리 필수
```

단일 스레드 성능 향상이 멈췄다. 성능을 높이려면 **여러 코어**를 활용해야 한다.

### 공유 메모리 vs 메시지 전달

![공유 메모리 vs 메시지 전달](/images/blog/parallel/diagrams/ch01-shared-vs-message.svg)

**공유 메모리 (Shared Memory)** — 모든 프로세서가 같은 메모리에 접근. 통신은 읽기/쓰기, 동기화는 락 / 원자적 연산.

**메시지 전달 (Message Passing)** — 각 프로세서가 독립된 메모리. 통신은 명시적 메시지 송수신, 동기화는 메시지 순서.

**이 책의 초점**: 공유 메모리 멀티프로세서

---

## 1.2 병렬 프로그래밍의 도전

### 도전 1: 상호 배제 (Mutual Exclusion)

**C++20**

```cpp
#include <atomic>
#include <thread>

std::atomic<int> counter{0};

void dangerous_increment() {
    // 위험: non-atomic 버전
    // int temp = counter.load(std::memory_order_relaxed);
    // counter.store(temp + 1, std::memory_order_relaxed);

    // 안전: atomic increment
    counter.fetch_add(1, std::memory_order_relaxed);
}
```

**C11 (`<stdatomic.h>`)**

```c
#include <stdatomic.h>

atomic_int counter = 0;

void dangerous_increment(void) {
    // 안전: atomic increment
    atomic_fetch_add(&counter, 1);
}
```

해결: 한 번에 하나의 스레드만 접근 허용

### 도전 2: 조건 동기화 (Condition Synchronization)

**C++20 (std::condition_variable + std::mutex)**

```cpp
#include <mutex>
#include <condition_variable>
#include <queue>

std::mutex mtx;
std::condition_variable cv;
std::queue<int> buffer;

void consumer() {
    std::unique_lock lock(mtx);
    cv.wait(lock, [] { return !buffer.empty(); });  // 조건 대기
    int item = buffer.front();
    buffer.pop();
}

void producer(int item) {
    {
        std::scoped_lock lock(mtx);
        buffer.push(item);
    }
    cv.notify_one();
}
```

**C11 (`<threads.h>`)**

```c
#include <threads.h>

mtx_t mtx;
cnd_t cv;
int buffer[100];
int count = 0;

int consumer(void* arg) {
    mtx_lock(&mtx);
    while (count == 0) {
        cnd_wait(&cv, &mtx);  // 조건 대기
    }
    int item = buffer[--count];
    mtx_unlock(&mtx);
    return item;
}

int producer(void* arg) {
    int item = *(int*)arg;
    mtx_lock(&mtx);
    buffer[count++] = item;
    mtx_unlock(&mtx);
    cnd_signal(&cv);
    return 0;
}
```

### 도전 3: 지연과 실패 (Latency and Failure)

```
스레드 A가 락을 잡고 멈추면?
- 다른 스레드들은 영원히 대기?
- 데드락, 라이브락
```

해결: 락-프리 알고리즘, 타임아웃

**C++20 — std::jthread와 cooperative cancellation**

```cpp
#include <thread>
#include <stop_token>

void worker(std::stop_token stoken) {
    while (!stoken.stop_requested()) {
        // 작업 수행
    }
}

int main() {
    std::jthread t(worker);
    // t.request_stop()으로 중단 요청 가능
    // 소멸자에서 자동 join
}
```

---

## 1.3 병렬 프로그래밍의 예술

### 정확성 vs 성능의 트레이드오프

| 접근 | 정확성 | 성능 | 복잡도 |
|-----|--------|------|--------|
| 거친 락 (Coarse) | 쉬움 | 낮음 | 낮음 |
| 세밀한 락 (Fine) | 어려움 | 높음 | 높음 |
| 락-프리 (Lock-free) | 매우 어려움 | 가장 높음 | 매우 높음 |

### 추상화 레벨

```
High   ─┬─ Transactional Memory
Level   │  Concurrent Collections (std::concurrent_*)
        │  Locks and Conditions (std::mutex, std::condition_variable)
        │  Atomic Operations (std::atomic, stdatomic.h)
Low    ─┴─ Memory Model (std::memory_order)
Level
```

**위로 갈수록**: 사용하기 쉬움, 성능 손실 가능
**아래로 갈수록**: 성능 좋음, 버그 위험

---

## 1.4 C++20/23 동시성 기능

### C++11 → C++23 진화

| 표준 | 추가된 기능 |
|------|------------|
| C++11 | `std::thread`, `std::mutex`, `std::atomic`, `std::future` |
| C++14 | `std::shared_timed_mutex` |
| C++17 | `std::shared_mutex`, `std::scoped_lock`, 병렬 알고리즘 |
| C++20 | `std::jthread`, `std::stop_token`, `std::latch`, `std::barrier`, `std::counting_semaphore` |
| C++23 | `std::generator` (코루틴), hazard pointer (제안 중) |

### C++20 신규 기능 맛보기

**std::latch — 일회성 카운터**

```cpp
#include <latch>
#include <thread>
#include <vector>

void worker(std::latch& done) {
    // 작업 수행
    done.count_down();
}

int main() {
    constexpr int N = 10;
    std::latch done(N);
    std::vector<std::jthread> threads;

    for (int i = 0; i < N; ++i) {
        threads.emplace_back(worker, std::ref(done));
    }

    done.wait();  // 모든 워커가 끝날 때까지 대기
}
```

**std::barrier — 재사용 가능 동기점**

```cpp
#include <barrier>
#include <thread>
#include <print>

void worker(std::barrier<>& sync_point, int id) {
    for (int phase = 0; phase < 3; ++phase) {
        std::println("Worker {} phase {}", id, phase);
        sync_point.arrive_and_wait();
    }
}

int main() {
    constexpr int N = 4;
    std::barrier sync_point(N);
    std::vector<std::jthread> threads;

    for (int i = 0; i < N; ++i) {
        threads.emplace_back(worker, std::ref(sync_point), i);
    }
}
```

**std::counting_semaphore**

```cpp
#include <semaphore>
#include <thread>

std::counting_semaphore<10> slots(10);  // 최대 10개 동시 접근

void limited_resource_access() {
    slots.acquire();
    // 리소스 사용 (최대 10개 스레드만 동시 접근)
    slots.release();
}
```

---

## 1.5 C11 동시성 기능

### `<stdatomic.h>` 기본

```c
#include <stdatomic.h>
#include <threads.h>
#include <stdio.h>

atomic_int shared_counter = 0;
atomic_flag spinlock = ATOMIC_FLAG_INIT;

void increment(void) {
    // atomic increment
    atomic_fetch_add_explicit(&shared_counter, 1, memory_order_relaxed);
}

void spinlock_acquire(void) {
    while (atomic_flag_test_and_set_explicit(&spinlock, memory_order_acquire)) {
        // spin
    }
}

void spinlock_release(void) {
    atomic_flag_clear_explicit(&spinlock, memory_order_release);
}
```

### `<threads.h>` 기본

```c
#include <threads.h>
#include <stdio.h>

int thread_func(void* arg) {
    int id = *(int*)arg;
    printf("Thread %d\n", id);
    return 0;
}

int main(void) {
    thrd_t threads[4];
    int ids[4] = {0, 1, 2, 3};

    for (int i = 0; i < 4; ++i) {
        thrd_create(&threads[i], thread_func, &ids[i]);
    }

    for (int i = 0; i < 4; ++i) {
        thrd_join(threads[i], NULL);
    }

    return 0;
}
```

---

## 1.6 실습: Amdahl의 법칙

### 병렬화의 한계

프로그램의 일부만 병렬화 가능:

$$
\text{Speedup} = \frac{1}{(1-p) + \frac{p}{n}}
$$

- **p**: 병렬화 가능 비율
- **n**: 프로세서 수

### 예시

```
90% 병렬화 가능, 10코어:
Speedup = 1 / (0.1 + 0.9/10) = 1 / 0.19 ≈ 5.3x

90% 병렬화 가능, 100코어:
Speedup = 1 / (0.1 + 0.9/100) = 1 / 0.109 ≈ 9.2x

90% 병렬화 가능, ∞ 코어:
Speedup = 1 / 0.1 = 10x (최대)
```

**결론**: 순차 부분이 전체를 지배한다.

### C++17 병렬 알고리즘으로 측정

```cpp
#include <algorithm>
#include <execution>
#include <vector>
#include <chrono>
#include <print>

int main() {
    std::vector<double> data(100'000'000, 1.0);

    // 순차 실행
    auto t1 = std::chrono::high_resolution_clock::now();
    std::for_each(std::execution::seq, data.begin(), data.end(),
                  [](double& x) { x = std::sin(x) * std::cos(x); });
    auto t2 = std::chrono::high_resolution_clock::now();

    // 병렬 실행
    auto t3 = std::chrono::high_resolution_clock::now();
    std::for_each(std::execution::par, data.begin(), data.end(),
                  [](double& x) { x = std::sin(x) * std::cos(x); });
    auto t4 = std::chrono::high_resolution_clock::now();

    auto seq_time = std::chrono::duration<double>(t2 - t1).count();
    auto par_time = std::chrono::duration<double>(t4 - t3).count();

    std::println("Sequential: {:.3f}s", seq_time);
    std::println("Parallel:   {:.3f}s", par_time);
    std::println("Speedup:    {:.2f}x", seq_time / par_time);
}
```

---

## 1.7 이 책의 구조

### Part I: Principles (원리)

| Chapter | 내용 |
|---------|------|
| Ch 2 | Mutual Exclusion: 상호 배제의 이론 |
| Ch 3 | Concurrent Objects: 정확성 정의 (Linearizability) |
| Ch 4 | Shared Memory: 레지스터와 원자적 스냅샷 |

### Part II: Practice (실전)

| Chapter | 내용 |
|---------|------|
| Ch 5-6 | 동기화 프리미티브의 힘과 한계 |
| Ch 7-8 | 스핀락, 모니터, 블로킹 동기화 |
| Ch 9-15 | 동시성 자료구조 (리스트, 큐, 스택, 해시, ...) |
| Ch 16-17 | 스케줄링, 배리어 |
| Ch 18 | 트랜잭셔널 메모리 |

---

## 핵심 개념

| 개념 | 정의 | C++ | C |
|-----|------|-----|---|
| **Shared Memory** | 여러 프로세서가 공유하는 메모리 | `std::atomic<T>` | `_Atomic T` |
| **Mutual Exclusion** | 한 번에 하나만 임계 영역 진입 | `std::mutex` | `mtx_t` |
| **Linearizability** | 동시 실행이 순차 실행처럼 보임 | - | - |
| **Lock-free** | 일부가 멈춰도 시스템은 진행 | `std::atomic<T>::compare_exchange_*` | `atomic_compare_exchange_*` |
| **Wait-free** | 모든 스레드가 유한 시간 내 완료 | - | - |

---

## 생각해볼 질문

1. 왜 클럭 속도를 계속 올릴 수 없는가?
2. 공유 메모리와 메시지 전달 중 어떤 게 더 쉬운가?
3. 락-프리가 항상 빠른가?
4. Amdahl의 법칙이 비관적인 이유는?

---

## 한국 개발자의 흔한 함정

```
1. *멀티스레드 = 빠름*이라는 착각
   - Amdahl: 순차 부분이 지배
   - 동기화 오버헤드가 이득보다 클 수 있음

2. *mutex만 쓰면 안전*하다는 오해
   - 정확성 ≠ 성능
   - 거친 락은 확장성을 죽인다

3. *락-프리 = 무조건 좋다*
   - 구현이 매우 어렵다
   - 코어 수 적으면 락이 더 빠를 수 있다

4. *프레임워크가 다 해준다*
   - 메모리 모델 이해 없이는 미묘한 버그
```

## 실무 적용 — 어디서 만나나

```
C++20/23:
- std::jthread         → 자동 join + stop_token
- std::latch/barrier   → 동기화 지점
- std::counting_semaphore → 리소스 제한
- std::atomic<T>::wait → 스핀락 대신 대기

C11:
- <stdatomic.h>       → atomic_*
- <threads.h>         → thrd_*, mtx_*, cnd_*

비교:
- C++ std::mutex       ↔ C mtx_t
- C++ std::thread      ↔ C thrd_t
- C++ std::atomic<T>   ↔ C _Atomic T
- C++ condition_variable ↔ C cnd_t
```

## 자기 점검

```
□ Moore's Law 종말의 의미를 한 줄로 설명?
□ Shared memory vs message passing 차이 명시?
□ Amdahl 법칙 직접 계산 가능?
□ C++20 std::jthread vs std::thread 차이?
□ C11 atomic_flag의 용도?
□ Lock-free vs Wait-free 구분?
```

## 관련 항목

- [Chapter 2: Mutual Exclusion](/blog/parallel/parallel-principles/ch02-mutual-exclusion) — 다음 글
- [Chapter 3: Concurrent Objects](/blog/parallel/parallel-principles/ch03-concurrent-objects) — Linearizability
- [C++ Concurrency in Action — Ch 1](/blog/parallel/cpp-concurrency-in-action/chapter01-hello-concurrent-world) — C++ 관점

---

다음 글: [Chapter 2: Mutual Exclusion](/blog/parallel/parallel-principles/ch02-mutual-exclusion)
