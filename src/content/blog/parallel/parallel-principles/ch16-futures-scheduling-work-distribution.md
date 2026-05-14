---
title: "Chapter 16: Future, Scheduling, Work Distribution"
date: 2026-05-12
description: "Future로 동시성 표현, work stealing으로 부하 분산. Fork-Join 패턴."
series: "The Art of Multiprocessor Programming"
seriesOrder: 16
tags: [parallel, concurrency, book-review, amp, future, work-stealing, fork-join, C++, C]
type: book-review
bookTitle: "The Art of Multiprocessor Programming"
bookAuthor: "Maurice Herlihy, Nir Shavit"
draft: false
---

> **The Art of Multiprocessor Programming** Chapter 16 요약
>
> 이 시리즈는 C++20/23과 C11을 사용하여 최신 문법으로 재구성했다.

## 16.1 Future — 동시성 추상화

Future는 **아직 완료되지 않은 계산의 결과**를 표현한다.

```cpp
// C++20 — std::future 기본 사용
#include <future>
#include <iostream>

int compute() {
    // 무거운 계산
    return 42;
}

int main() {
    // 비동기로 compute 실행
    std::future<int> future = std::async(std::launch::async, compute);

    // ... 다른 일 하다가 ...

    // 결과 기다림 (블록)
    int result = future.get();
    std::cout << "Result: " << result << '\n';
}
```

```c
// C11 — Future 개념 구현 (C11에는 future가 없음)
#include <threads.h>
#include <stdatomic.h>
#include <stdbool.h>
#include <stdlib.h>

typedef struct {
    int result;
    atomic_bool done;
    mtx_t mtx;
    cnd_t cnd;
} Future;

typedef struct {
    Future* future;
    int (*func)(void);
} FutureTask;

int future_thread(void* arg) {
    FutureTask* task = (FutureTask*)arg;
    int result = task->func();

    mtx_lock(&task->future->mtx);
    task->future->result = result;
    atomic_store(&task->future->done, true);
    cnd_signal(&task->future->cnd);
    mtx_unlock(&task->future->mtx);

    return 0;
}

Future* future_create(int (*func)(void)) {
    Future* f = malloc(sizeof(Future));
    atomic_init(&f->done, false);
    mtx_init(&f->mtx, mtx_plain);
    cnd_init(&f->cnd);

    FutureTask* task = malloc(sizeof(FutureTask));
    task->future = f;
    task->func = func;

    thrd_t t;
    thrd_create(&t, future_thread, task);
    thrd_detach(t);

    return f;
}

int future_get(Future* f) {
    mtx_lock(&f->mtx);
    while (!atomic_load(&f->done)) {
        cnd_wait(&f->cnd, &f->mtx);
    }
    int result = f->result;
    mtx_unlock(&f->mtx);
    return result;
}

bool future_is_done(Future* f) {
    return atomic_load(&f->done);
}
```

스레드의 lower-level 추상화. 결과가 어디서 어떻게 계산되는지는 future가 숨김.

C++의 `std::future`, JavaScript의 `Promise`, Rust의 `Future` 트레잇 — 모두 같은 아이디어.

## 16.2 Future의 가치

스레드를 직접 다루는 것보다 future가 좋은 이유.

**1. 합성 가능**

```cpp
// C++20 — 여러 future 합성
#include <future>
#include <vector>

int compute_a() { return 10; }
int compute_b() { return 20; }
int combine(int a, int b) { return a + b; }

int main() {
    auto f1 = std::async(std::launch::async, compute_a);
    auto f2 = std::async(std::launch::async, compute_b);

    // 두 결과를 기다려 합침
    int result = combine(f1.get(), f2.get());
    return result;  // 30
}
```

여러 future를 묶어 더 큰 계산을 표현.

**2. 백엔드 독립**

같은 future API 위에 다른 실행 모델 — 스레드 풀, 워크 큐, async runtime 등.

**3. 에러 처리**

```cpp
// C++20 — future의 예외 전파
#include <future>
#include <stdexcept>
#include <iostream>

int risky_compute() {
    throw std::runtime_error("Something went wrong!");
}

int main() {
    auto future = std::async(std::launch::async, risky_compute);

    try {
        int result = future.get();  // 예외가 여기서 던져짐
    } catch (const std::exception& e) {
        std::cerr << "Caught: " << e.what() << '\n';
    }
}
```

future가 예외/실패를 캡처해 `get()`에서 전파.

## 16.3 Fork-Join 패턴

병렬 알고리즘의 기본 구조.

```cpp
// C++20 — Fork-Join 병렬 합계
#include <future>
#include <vector>
#include <numeric>

constexpr size_t THRESHOLD = 1000;

long parallel_sum(const std::vector<int>& arr, size_t start, size_t end) {
    if (end - start < THRESHOLD) {
        // 순차 합계
        return std::accumulate(arr.begin() + start, arr.begin() + end, 0L);
    }

    size_t mid = start + (end - start) / 2;

    // Fork — 왼쪽을 다른 스레드에 위임
    auto left_future = std::async(std::launch::async,
                                   parallel_sum,
                                   std::cref(arr), start, mid);

    // 현재 스레드에서 오른쪽 처리
    long right = parallel_sum(arr, mid, end);

    // Join — 왼쪽 결과 기다림
    long left = left_future.get();

    return left + right;
}
```

```c
// C11 — Fork-Join 병렬 합계 (간략화)
#include <threads.h>
#include <stdlib.h>

#define THRESHOLD 1000

typedef struct {
    const int* arr;
    size_t start;
    size_t end;
    long result;
} SumTask;

int sum_thread(void* arg) {
    SumTask* task = (SumTask*)arg;
    long sum = 0;

    if (task->end - task->start < THRESHOLD) {
        for (size_t i = task->start; i < task->end; ++i) {
            sum += task->arr[i];
        }
        task->result = sum;
        return 0;
    }

    size_t mid = task->start + (task->end - task->start) / 2;

    // Fork
    SumTask left_task = {task->arr, task->start, mid, 0};
    thrd_t left_thread;
    thrd_create(&left_thread, sum_thread, &left_task);

    // 현재 스레드에서 오른쪽
    SumTask right_task = {task->arr, mid, task->end, 0};
    sum_thread(&right_task);

    // Join
    thrd_join(left_thread, NULL);

    task->result = left_task.result + right_task.result;
    return 0;
}

long parallel_sum(const int* arr, size_t n) {
    SumTask task = {arr, 0, n, 0};
    sum_thread(&task);
    return task.result;
}
```

- **Fork** — 작업을 둘로 쪼개고 한 쪽을 다른 스레드에 위임
- **Join** — 두 결과를 기다려 합침

병렬 정렬, 병렬 reduce, 병렬 검색 등이 모두 이 패턴.

## 16.4 작업 분산의 문제

Fork-join을 효율적으로 실행하려면.

**스레드 풀** — 미리 정해진 수의 스레드가 작업을 처리.

```cpp
// C++20 — 간단한 스레드 풀
#include <thread>
#include <vector>
#include <queue>
#include <mutex>
#include <condition_variable>
#include <functional>
#include <future>

class ThreadPool {
    std::vector<std::jthread> workers_;
    std::queue<std::function<void()>> tasks_;
    std::mutex mtx_;
    std::condition_variable cv_;
    std::atomic<bool> stop_{false};

public:
    explicit ThreadPool(size_t num_threads) {
        for (size_t i = 0; i < num_threads; ++i) {
            workers_.emplace_back([this](std::stop_token st) {
                while (!st.stop_requested()) {
                    std::function<void()> task;
                    {
                        std::unique_lock lock(mtx_);
                        cv_.wait(lock, [this, &st] {
                            return st.stop_requested() || !tasks_.empty();
                        });
                        if (st.stop_requested() && tasks_.empty()) return;
                        task = std::move(tasks_.front());
                        tasks_.pop();
                    }
                    task();
                }
            });
        }
    }

    template<typename F, typename... Args>
    auto submit(F&& f, Args&&... args)
        -> std::future<std::invoke_result_t<F, Args...>>
    {
        using return_type = std::invoke_result_t<F, Args...>;
        auto task = std::make_shared<std::packaged_task<return_type()>>(
            std::bind(std::forward<F>(f), std::forward<Args>(args)...)
        );
        std::future<return_type> result = task->get_future();
        {
            std::lock_guard lock(mtx_);
            tasks_.emplace([task] { (*task)(); });
        }
        cv_.notify_one();
        return result;
    }

    ~ThreadPool() {
        for (auto& w : workers_) {
            w.request_stop();
        }
        cv_.notify_all();
    }
};
```

각 스레드가 작업 큐를 가진다. 새 작업이 들어오면 어느 큐로?

## 16.5 단순 분산 — Centralized Queue

```
모든 스레드가 같은 글로벌 큐에서 가져감.
```

**장점**: 부하 자동 균형.
**단점**: 글로벌 큐가 hot spot.

스레드 수가 많아지면 큐 자체가 병목.

## 16.6 Work Stealing

Cilk 프로젝트 (Blumofe & Leiserson, 1999)의 핵심 알고리즘.

**아이디어**:
- 각 스레드가 자기 작업 큐 (deque)를 가짐
- 자기 큐에 작업 추가 / 처리 — 한 쪽 끝 (bottom)에서
- **다른 스레드 큐**에서 훔칠 때 — 반대 끝 (top)에서

```
Thread 1 deque: [task_a, task_b, task_c]
                 ↑ top                 ↑ bottom
                 │                     │
              Steal!                Thread 1이 push/pop
              (다른 스레드가)
```

**장점**:
- 자기 큐에 대한 작업은 거의 경합 없음 (혼자 bottom 만짐)
- 부하가 불균형하면 다른 스레드가 훔쳐 가서 균형
- O(N)에 가까운 스케일링

## 16.7 Work Stealing의 디테일

### Push/Pop (자기 큐)

bottom에서.

```cpp
// C++20 — Work-Stealing Deque (Chase-Lev)
#include <atomic>
#include <vector>
#include <optional>

template<typename T>
class WorkStealingDeque {
    std::vector<T> buffer_;
    std::atomic<int64_t> top_{0};
    std::atomic<int64_t> bottom_{0};

public:
    explicit WorkStealingDeque(size_t capacity)
        : buffer_(capacity) {}

    // 소유자가 호출 — bottom에서 push
    void push(T item) {
        int64_t b = bottom_.load(std::memory_order_relaxed);
        buffer_[b % buffer_.size()] = std::move(item);
        std::atomic_thread_fence(std::memory_order_release);
        bottom_.store(b + 1, std::memory_order_relaxed);
    }

    // 소유자가 호출 — bottom에서 pop
    std::optional<T> pop() {
        int64_t b = bottom_.load(std::memory_order_relaxed) - 1;
        bottom_.store(b, std::memory_order_relaxed);
        std::atomic_thread_fence(std::memory_order_seq_cst);

        int64_t t = top_.load(std::memory_order_relaxed);
        if (t <= b) {
            T item = buffer_[b % buffer_.size()];
            if (t == b) {
                // 마지막 원소 — steal과 경쟁
                if (!top_.compare_exchange_strong(
                        t, t + 1,
                        std::memory_order_seq_cst,
                        std::memory_order_relaxed)) {
                    // steal이 이김
                    bottom_.store(b + 1, std::memory_order_relaxed);
                    return std::nullopt;
                }
                bottom_.store(b + 1, std::memory_order_relaxed);
            }
            return item;
        }
        // 비어 있음
        bottom_.store(b + 1, std::memory_order_relaxed);
        return std::nullopt;
    }

    // 도둑이 호출 — top에서 steal
    std::optional<T> steal() {
        int64_t t = top_.load(std::memory_order_acquire);
        std::atomic_thread_fence(std::memory_order_seq_cst);
        int64_t b = bottom_.load(std::memory_order_acquire);

        if (t < b) {
            T item = buffer_[t % buffer_.size()];
            if (top_.compare_exchange_strong(
                    t, t + 1,
                    std::memory_order_seq_cst,
                    std::memory_order_relaxed)) {
                return item;
            }
        }
        return std::nullopt;
    }
};
```

```c
// C11 — Work-Stealing Deque (간략화)
#include <stdatomic.h>
#include <stdbool.h>
#include <stddef.h>
#include <stdlib.h>

typedef struct {
    void** buffer;
    size_t capacity;
    atomic_llong top;
    atomic_llong bottom;
} WorkStealingDeque;

WorkStealingDeque* deque_create(size_t capacity) {
    WorkStealingDeque* d = malloc(sizeof(WorkStealingDeque));
    d->buffer = malloc(sizeof(void*) * capacity);
    d->capacity = capacity;
    atomic_init(&d->top, 0);
    atomic_init(&d->bottom, 0);
    return d;
}

void deque_push(WorkStealingDeque* d, void* item) {
    long long b = atomic_load_explicit(&d->bottom, memory_order_relaxed);
    d->buffer[b % d->capacity] = item;
    atomic_thread_fence(memory_order_release);
    atomic_store_explicit(&d->bottom, b + 1, memory_order_relaxed);
}

void* deque_pop(WorkStealingDeque* d) {
    long long b = atomic_load_explicit(&d->bottom, memory_order_relaxed) - 1;
    atomic_store_explicit(&d->bottom, b, memory_order_relaxed);
    atomic_thread_fence(memory_order_seq_cst);

    long long t = atomic_load_explicit(&d->top, memory_order_relaxed);

    if (t <= b) {
        void* item = d->buffer[b % d->capacity];
        if (t == b) {
            if (!atomic_compare_exchange_strong_explicit(
                    &d->top, &t, t + 1,
                    memory_order_seq_cst, memory_order_relaxed)) {
                atomic_store_explicit(&d->bottom, b + 1, memory_order_relaxed);
                return NULL;
            }
            atomic_store_explicit(&d->bottom, b + 1, memory_order_relaxed);
        }
        return item;
    }

    atomic_store_explicit(&d->bottom, b + 1, memory_order_relaxed);
    return NULL;
}

void* deque_steal(WorkStealingDeque* d) {
    long long t = atomic_load_explicit(&d->top, memory_order_acquire);
    atomic_thread_fence(memory_order_seq_cst);
    long long b = atomic_load_explicit(&d->bottom, memory_order_acquire);

    if (t < b) {
        void* item = d->buffer[t % d->capacity];
        if (atomic_compare_exchange_strong_explicit(
                &d->top, &t, t + 1,
                memory_order_seq_cst, memory_order_relaxed)) {
            return item;
        }
    }
    return NULL;
}
```

대부분 락 없이 가능 (혼자 만지니까). 다만 top에서 steal이 동시에 일어날 수 있어서 — bottom과 top이 만나면 CAS로 처리.

### Steal (다른 스레드의 큐)

CAS로 top을 진행. 여러 도둑이 동시에 시도하면 한 명만 성공.

### Random Victim 선택

```cpp
// C++20 — Work Stealing Scheduler
#include <vector>
#include <random>
#include <thread>
#include <functional>

class WorkStealingScheduler {
    std::vector<WorkStealingDeque<std::function<void()>>> deques_;
    std::vector<std::jthread> workers_;
    std::atomic<bool> running_{true};
    int num_workers_;

public:
    explicit WorkStealingScheduler(int num_workers)
        : num_workers_(num_workers) {

        for (int i = 0; i < num_workers; ++i) {
            deques_.emplace_back(4096);
        }

        for (int i = 0; i < num_workers; ++i) {
            workers_.emplace_back([this, i] { worker_loop(i); });
        }
    }

    void submit(int worker_id, std::function<void()> task) {
        deques_[worker_id].push(std::move(task));
    }

private:
    void worker_loop(int id) {
        thread_local std::mt19937 rng(std::random_device{}());

        while (running_.load(std::memory_order_acquire)) {
            // 1. 자기 큐에서 pop 시도
            if (auto task = deques_[id].pop()) {
                (*task)();
                continue;
            }

            // 2. 다른 큐에서 steal
            std::uniform_int_distribution<int> dist(0, num_workers_ - 1);
            int victim = dist(rng);
            if (victim != id) {
                if (auto task = deques_[victim].steal()) {
                    (*task)();
                    continue;
                }
            }

            std::this_thread::yield();
        }
    }
};
```

랜덤한 다른 스레드의 큐를 훔침. 결국 모든 스레드가 비슷한 부하.

## 16.8 Work Stealing의 성능 분석

이론적 결과 (Blumofe & Leiserson).

- 작업 T_1 = 단일 스레드에 걸리는 시간
- 작업 T_∞ = 무한 스레드에 걸리는 시간 (critical path)
- P 스레드에 걸리는 시간 T_P:

$$
T_P \leq \frac{T_1}{P} + O(T_\infty)
$$

즉 work stealing은 **거의 최적**에 가까운 스케일링을 보장.

병목은 critical path (T_∞)에 있음. critical path가 짧은 작업일수록 병렬화 효과 크다.

## 16.9 실제 구현체

Work stealing은 모든 모던 동시성 런타임의 기반.

| 시스템 | 언어 |
|---|---|
| OpenCilk (MIT) | C/C++ — Intel Cilk Plus는 GCC 8.5(2020)에서 제거, 학술 후속 |
| Intel oneTBB | C++ — oneAPI에 통합 (구 Intel TBB) |
| C++17 parallel STL | C++ |
| OpenMP tasks | C/C++/Fortran |
| libdispatch (GCD) | C/Objective-C |
| Rayon | Rust |
| Tokio | Rust async |
| Go runtime | Go (goroutine 스케줄러) |

각각 디테일은 다르지만 핵심 알고리즘은 work stealing.

## 16.10 C++20/23의 병렬 알고리즘

```cpp
// C++20 — 병렬 알고리즘 (execution policy)
#include <algorithm>
#include <execution>
#include <vector>
#include <numeric>

int main() {
    std::vector<int> data(1'000'000);
    std::iota(data.begin(), data.end(), 0);

    // 병렬 정렬
    std::sort(std::execution::par, data.begin(), data.end());

    // 병렬 reduce
    long sum = std::reduce(std::execution::par, data.begin(), data.end(), 0L);

    // 병렬 transform
    std::transform(std::execution::par_unseq,
                   data.begin(), data.end(), data.begin(),
                   [](int x) { return x * 2; });
}
```

내부적으로 work stealing 스케줄러 사용 (구현체에 따라 다름).

## 16.11 Continuation Stealing

ABP (Arora, Blumofe, Plaxton) work stealing — 호출자 측 작업을 훔쳐 감.

```cpp
// 전통적 Child Stealing
auto f = fork(child_task);   // child 위임
do_some_work();              // parent 계속
result = f.get();

// Continuation Stealing (Cilk 방식)
// fork 즉시 child가 현재 스레드에서 실행
// parent의 나머지(continuation)가 deque에 들어감
```

이게 stack을 더 효율적으로 쓰는 변형. Cilk가 이 방식.

## 16.12 균형 잡힌 작업 vs 불균형

Work stealing의 좋은 점 — **불균형한 작업에 강함**.

```
순진한 분할:
- 작업을 P개로 나눠 각 스레드에 분배
- 한 스레드의 작업이 일찍 끝나면 idle

Work stealing:
- 짧은 작업 끝낸 스레드가 다른 큐에서 훔침
- 모든 스레드가 끝까지 일함
```

불균형이 클수록 work stealing 이득이 큼. 균형이 잘 잡힌 작업이면 정적 분배도 OK.

## 정리

- **Future** — 비동기 계산의 추상화, 합성 가능
- **Fork-Join** — 작업을 쪼개고 합치는 병렬 패턴
- **Work Stealing** — 각 스레드 자기 큐 + 비면 훔침
- **거의 최적** 스케일링 보장 (Blumofe & Leiserson 결과)
- 모던 동시성 런타임의 기반 (oneTBB, Rayon, Go scheduler, Tokio — Cilk는 학술 OpenCilk만 잔존)
- **불균형 작업**에 특히 강함

## 한국 개발자의 함정

```
1. *Future.get() = 비동기*라는 오해
   - get은 *블록*. 단지 결과 추출 기다림
   - 진짜 비동기는 콜백 / coroutine / then
   - C++20 coroutine + co_await가 진짜 비동기

2. *Thread Pool에 작업 무한 제출 = 빠름*
   - 큐가 무한히 자라면 OOM
   - 큐 크기 제한 + 거절 정책 필요
   - 작업 크기 조절도 중요

3. *Work Stealing은 만능*
   - 작업 단위가 너무 작으면 overhead 큼
   - 너무 크면 부하 균형 안 됨
   - THRESHOLD 튜닝 중요

4. *std::async = 항상 새 스레드*
   - std::launch::deferred면 호출 시점까지 지연
   - std::launch::async만 새 스레드 보장
   - 기본값은 구현체 정의
```

## 실무 적용

```
이론 → 실무:
- Future                  → std::future, std::async (C++)
- Promise                 → std::promise (C++)
- Work Stealing           → Intel oneTBB, libdispatch
- Fork-Join               → std::async + recursive
- Parallel STL            → std::execution::par

언어별:
- C++: std::async, std::future, oneTBB, parallel STL
- C: 직접 구현 (thrd_t + 큐), OpenMP
- Rust: rayon (CPU 바운드), tokio (I/O 바운드)
- Go: goroutine + work-stealing scheduler

설계:
- CPU 바운드 → oneTBB / parallel STL / OpenMP
- I/O 바운드 → async runtime / coroutine
- 혼합 → oneTBB + async
```

## 자기 점검

```
□ Future의 합성성과 합성 불가능 차이?
□ Fork-Join 패턴의 THRESHOLD 의미?
□ Work Stealing에서 *bottom*과 *top*의 비대칭?
□ Random victim 선택의 이유?
□ Continuation Stealing과 Child Stealing 차이?
□ Critical Path (T_∞)가 병목인 이유?
```

## 다음 장 예고

다음 장은 **Barriers** — 여러 스레드가 한 시점에서 동기화하는 패턴.

## 관련 항목

- [Ch 15: Priority Queue](/blog/parallel/parallel-principles/ch15-priority-queues)
- [Ch 17: Barriers](/blog/parallel/parallel-principles/ch17-barriers)
- [C++ Concurrency in Action Ch 4: Future](/blog/parallel/cpp-concurrency-in-action/chapter04-synchronizing-concurrent-operations)
- [C++ Concurrency in Action Ch 9: Thread Pool](/blog/parallel/cpp-concurrency-in-action/chapter09-advanced-thread-management)
