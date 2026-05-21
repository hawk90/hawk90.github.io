---
title: "Chapter 16: Future, Scheduling, Work Distribution"
date: 2026-05-06T16:00:00
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

## 일상의 비유로 보기

성능을 가르는 결정은 *알고리즘*이 아니라 *배분*인 경우가 많다. **N 개의 일을 P 개의 코어가 어떻게 받아 드는가** — 이 한 줄이 16장의 주제다.

카페 한 곳을 머릿속에 그려 본다. 손님이 줄을 서서 음료를 주문한다. 가게 안에는 바리스타가 여러 명 있다. 손님 한 명이 들어올 때마다 음료 한 잔이 만들어져야 한다. 이때 *누가 어느 주문을 받고, 언제 만들어 내는가*에 따라 같은 인력으로도 처리량이 두세 배까지 갈린다.

각 비유를 한 줄로 정리한다.

- **Future** — 카페에서 음료를 주문하면 진동벨을 받는다. 음료는 *지금 만들어지는 중*이고, 손님은 자리에 앉아 다른 일을 한다. 진동벨이 울리면 가서 받는다. 진동벨 자체가 음료가 아니다. *나중에 음료를 받을 권리*다. 이게 future다. 결과의 핸들을 먼저 받고, 필요할 때 `get()`으로 결과를 꺼낸다.
- **Static scheduling** — 단체 손님이 좌석을 미리 정해 두고 들어온다. 예측 가능하지만 한 자리가 비어도 다른 사람이 옮겨 앉지 못한다. 작업을 미리 P개로 균등 분할해 각 코어에 박는 방식이다. 부하가 균등하면 최적이지만, 일부 작업이 더 무거우면 그 코어가 끝날 때까지 나머지가 논다.
- **Dynamic scheduling** — 일반 손님이 들어오면 가까운 직원이 와서 주문을 받는다. 누가 어떤 주문을 받을지 미리 정하지 않는다. 한 곳에 일이 몰리지 않게 균형이 잡힌다. 다만 *누가 받을지* 협상하는 데 약간의 비용이 든다.
- **Work-stealing** — 한 직원이 자기 주문 큐가 비었을 때, 동료의 큐에서 *제일 오래된 일*을 가져와 처리한다. 가만히 쉬지 않는다. 부하가 불균등해도 자연히 평탄해진다. Cilk++의 핵심 아이디어이고, Java ForkJoinPool, Rust Rayon, Go runtime의 기반이다.

| 비유 | 시스템 사례 |
|------|------------|
| 진동벨 | `std::future`, Java `Future<V>`, JavaScript `Promise`, Rust `Future` 트레잇 |
| 정해진 좌석 | OpenMP `schedule(static)`, MPI 도메인 분할, CUDA 고정 grid |
| 가까운 직원 호출 | OpenMP `schedule(dynamic)`, 중앙 작업 큐, Java `ExecutorService` |
| 동료의 일감 가져오기 | Cilk++, Java ForkJoinPool, Rust Rayon, Go runtime, Intel oneTBB |

이 네 가지의 *왜*와 *언제*를 이번 장이 풀어 간다. Future는 표현의 추상화, work-stealing은 분배의 알고리즘이다.

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

## 16.2 Java의 Future와 ExecutorService

책의 모델은 Java의 `java.util.concurrent`. 핵심은 세 가지 추상화의 분리다.

- `Runnable` / `Callable<V>` — *무엇*을 할지
- `Future<V>` — 결과의 *핸들*
- `ExecutorService` — *어떻게* / *어디서* 실행할지

```java
// Java — Herlihy & Shavit Ch16의 기본 모델
import java.util.concurrent.*;

ExecutorService exec = Executors.newFixedThreadPool(4);

Callable<Integer> task = () -> {
    Thread.sleep(100);
    return 42;
};

Future<Integer> f = exec.submit(task);

// 다른 일을 하다가 결과 회수
int result = f.get();      // 완료까지 블록
exec.shutdown();
```

핵심 통찰은 스레드 생성과 작업 표현의 분리다. 호출자는 스레드를 *생성*하지 않고 작업을 *제출*만 한다. 실행 정책은 `ExecutorService` 구현체가 결정한다 — fixed pool, cached pool, fork-join pool.

```cpp
// C++20 — 같은 모델의 C++ 대응
#include <future>
#include <thread>
#include <functional>

// std::async가 ExecutorService 역할 (한정적)
auto f = std::async(std::launch::async, [] { return 42; });
int r = f.get();
```

C++의 `std::async`는 정책을 두 가지(`async`, `deferred`)만 가진다. 진짜 풀은 직접 구현하거나 `oneTBB`, `Boost.Asio` 같은 외부 라이브러리가 필요하다.

## 16.3 Future의 가치

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

## 16.4 Future로 행렬 곱

책 Listing 16.4의 멀티스레드 행렬 곱은 future의 표현력을 잘 보여준다. 결과 행렬을 사분면으로 쪼개 재귀로 내려간다.

$$
C = A \cdot B \quad\Longrightarrow\quad
\begin{pmatrix}C_{00} & C_{01}\\ C_{10} & C_{11}\end{pmatrix}
= \begin{pmatrix}A_{00}B_{00}+A_{01}B_{10} & A_{00}B_{01}+A_{01}B_{11}\\ A_{10}B_{00}+A_{11}B_{10} & A_{10}B_{01}+A_{11}B_{11}\end{pmatrix}
$$

각 항이 독립이라 8개 곱이 병렬, 그다음 4개 덧셈이 병렬.

```cpp
// C++20 — 분할 정복 행렬 곱 (Ch16 Listing 16.4 재현)
#include <future>
#include <vector>

using Matrix = std::vector<std::vector<double>>;

void multiply(const Matrix& A, const Matrix& B, Matrix& C,
              int row, int col, int n) {
    if (n == 1) {
        C[row][col] += A[row][col] * B[row][col];
        return;
    }
    int half = n / 2;
    // 8개 곱을 future로 fork
    std::vector<std::future<void>> mults;
    for (int i = 0; i < 2; ++i) {
        for (int j = 0; j < 2; ++j) {
            for (int k = 0; k < 2; ++k) {
                mults.push_back(std::async(std::launch::async,
                    multiply, std::cref(A), std::cref(B), std::ref(C),
                    row + i * half, col + j * half, half));
            }
        }
    }
    for (auto& f : mults) f.get();   // join
}
```

흥미로운 점은 *모든 곱이 동시에 시작 가능*하다는 것이다. 합은 누산이라 더 신중해야 하지만, 핵심 통찰은 작업 의존 그래프가 **DAG**(directed acyclic graph)이고 future가 그 간선을 표현한다는 것.

## 16.5 Multithreaded Fibonacci

가장 작은 예 — Fibonacci로 fork/join의 비용/이득 균형을 본다.

```cpp
// C++20 — Fork/Join Fibonacci (Ch16의 첫 예)
#include <future>

long fib(int n) {
    if (n < 2) return n;
    auto left = std::async(std::launch::async, fib, n - 1);
    long right = fib(n - 2);
    return left.get() + right;
}
```

이 코드는 *틀린 건 아니지만* 비용이 폭발한다. 매 호출이 스레드를 만들면 $O(\phi^n)$개의 스레드. 책의 교훈은 두 가지다.

- 작업 단위(grain)가 fork 비용보다 *훨씬 커야* 한다.
- threshold를 둬 작은 입력은 순차 처리.

```cpp
// C++20 — Threshold가 있는 fib
long fib_par(int n, int cutoff) {
    if (n < cutoff) {
        // 순차 — 일반 재귀 fib
        if (n < 2) return n;
        return fib_par(n - 1, cutoff) + fib_par(n - 2, cutoff);
    }
    auto left = std::async(std::launch::async, fib_par, n - 1, cutoff);
    long right = fib_par(n - 2, cutoff);
    return left.get() + right;
}
```

`cutoff = 25` 정도가 보통의 fork/join 풀에서 합리적인 trade-off. 너무 크면 병렬성 부족, 너무 작으면 overhead 폭발.

## 16.6 Fork-Join 패턴

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

## 16.7 정적 vs 동적 작업 할당

작업 단위를 P개의 스레드에 어떻게 나눌지가 작업 분산의 출발점이다. 책은 두 축을 명확히 가른다.

**정적 할당 (Static)**

```cpp
// C++20 — 균등 정적 분할
void parallel_for_static(int begin, int end, int P,
                         std::function<void(int)> body) {
    std::vector<std::jthread> ts;
    int chunk = (end - begin) / P;
    for (int p = 0; p < P; ++p) {
        int lo = begin + p * chunk;
        int hi = (p == P - 1) ? end : lo + chunk;
        ts.emplace_back([=] {
            for (int i = lo; i < hi; ++i) body(i);
        });
    }
}
```

장점은 단순성과 0에 가까운 스케줄링 overhead. 단점은 *불균등한 작업*에 약함 — 한 스레드가 일찍 끝나면 idle.

**동적 할당 (Dynamic)**

- *Centralized queue* — 공유 큐에서 일감 하나씩 꺼냄. 부하 균형은 자동, 큐 자체가 병목.
- *Work stealing* — 각자 큐 + 비면 훔침. 보통 가장 좋은 절충.

| 방식 | 부하 균형 | Overhead | 좋은 경우 |
|---|---|---|---|
| Static | 나쁨 | 거의 0 | 입력이 균등할 때 |
| Centralized queue | 좋음 | 큐 경합 | P 작고 작업 큰 경우 |
| Work stealing | 매우 좋음 | 낮음 | 일반 |

책은 이후 절들 내내 동적 할당, 특히 work stealing을 다룬다.

## 16.8 작업 분산의 문제

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

## Critical-Path 길이 분석

책 16.6절의 *work*와 *span*(critical path) 개념을 더 들여다본다.

- **Work** $T_1$ — 단일 스레드 총 작업량
- **Span** $T_\infty$ — 작업 DAG의 *가장 긴 경로* 길이 (자원 무한해도 못 줄임)
- **Speedup** $T_1 / T_P \le P$
- **Parallelism** $T_1 / T_\infty$ — 무한 스레드일 때의 이상적 speedup

Brent의 정리와 work-stealing 분석을 합쳐 P 스레드 실행시간 상한:

$$T_P \le \frac{T_1}{P} + O(T_\infty)$$

즉, 작업이 *충분히 평행*($T_1 / T_\infty \gg P$)하면 거의 선형 가속. 예: Fibonacci $T(n)$.

| 양 | $\text{fib}(n)$ |
|---|---|
| Work $T_1$ | $\Theta(\phi^n)$ |
| Span $T_\infty$ | $\Theta(n)$ |
| Parallelism | $\Theta(\phi^n / n)$ |

행렬 곱(분할 정복, 책 Listing 16.4)은 $T_1 = \Theta(n^3)$, $T_\infty = \Theta(\log^2 n)$로 parallelism이 $\Theta(n^3 / \log^2 n)$. 매우 평행.

설계 교훈은 명확하다: **알고리즘을 짤 때 span을 줄여라**. 순차 의존 사슬을 짧게 유지하면 P가 커져도 이득을 본다.

## 16.10 실제 구현체

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

## Yielding Deque와 Balancing Pool

책 Ch16.5.2~16.5.3은 work-stealing deque의 *한계 케이스*들을 다룬다.

**Yielding Deque** (Listing 16.14 변형) — bottom과 top이 만났을 때 도둑이 owner와 *CAS 경쟁*을 한다. 두 명 모두 실패할 수 있고, 그러면 owner는 자기 작업을 잃고 도둑도 빈 손이다. Herlihy & Shavit는 마지막 원소를 다툴 때 owner가 우선권을 갖도록 약간의 양보(yield) 로직을 추가한 변형을 제안한다.

```cpp
// 단순화한 Yielding 의도 — 마지막 원소에서 owner 우선
std::optional<T> pop_yielding() {
    // 일반 pop와 같음. 다만 마지막 원소 경합 시
    // CAS 실패 후 잠시 yield하고 재시도 — owner가 더 자주 이김
    // (책: bottom이 top을 따라잡기 직전, owner가 short yield)
}
```

**Balancing Pool** (책 16.5.3) — work stealing의 *상위* 추상화로, 큐가 비기 전에도 큐 사이 작업을 *밀어* 옮기는 풀. 임의의 두 큐의 길이 차가 일정 임계 이상이면 긴 쪽이 짧은 쪽으로 작업을 옮긴다.

```
work stealing          balancing pool
─────────────          ───────────────
idle 후 훔침            "거의 idle"이 되기 전에 미리 옮김
reactive               proactive
```

장점은 도둑이 일을 찾는 *latency*를 줄임. 단점은 적극적 이동이 *오히려* cache locality를 망칠 수 있음.

실무에서는 work stealing이 표준. Balancing pool은 특정 워크로드(긴 작업의 정적 추정이 가능한 경우)에 한정.

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

## 다시 카페로 — 디자인 결정의 비유

배운 내용을 카페 비유로 다시 묶어 본다. 같은 가게라도 운영 정책에 따라 처리량과 손님 만족도가 달라진다.

**누가 어디서 일을 꺼내는가**. 자기 큐의 *아래*(bottom)에서 꺼내고, 다른 사람 큐의 *위*(top)에서 훔친다. 카페로 옮기면, 직원이 자기 카운터 *제일 앞*(최근 받은 주문)을 처리하고, 동료의 카운터에서는 *제일 오래된 주문*을 가져온다. 왜 이렇게 비대칭일까. 자기 큐의 앞쪽 주문은 캐시에 신선하다 — 방금 만들고 있던 음료라 컵·시럽·잔이 손에 있다. 동료의 오래된 주문은 어차피 자기 캐시에 없으니 *큰 일감*을 가져와 통째로 처리하는 편이 낫다. 자료구조로 보면 양 끝을 다르게 쓰는 *double-ended queue*(deque)다.

**훔칠 대상은 어떻게 고르는가**. *무작위*다. 직원이 동료를 한 명 무작위로 골라 그 카운터를 본다. 일이 있으면 가져오고, 없으면 다른 동료를 다시 무작위로 고른다. 왜 무작위인가. 부하가 큰 동료를 *정확히* 고르는 알고리즘은 추가 통신을 필요로 한다. 무작위는 그 비용 없이 평균적으로 잘 분산된다. 이론적으로는 *기대* 시간이 $O(T_1 / P + T_\infty)$로 거의 최적임이 증명됐다 — $T_1$이 직렬 시간, $T_\infty$가 비대 시간(critical path).

**일감 크기는 얼마가 적당한가**. 너무 작으면 *주문 한 잔 만들 시간보다 카운터 사이를 왔다 갔다 하는 시간*이 더 들어간다. 너무 크면 한 명이 큰 주문에 묶여 부하가 다시 한쪽으로 몰린다. 실무 코드에서는 임계값 `THRESHOLD`로 — 작업 크기가 어느 선 아래로 떨어지면 *나누지 않고 직렬*로 마무리한다. 행렬 곱이라면 16x16, fibonacci 같은 재귀라면 $n < 20$. 이게 fork-join에서 가장 자주 손대는 파라미터다.

**언제 work-stealing이 안 어울리나**. 작업이 균등하게 잘 나뉜다면 정해진 좌석(static)이 더 빠르다 — 협상 비용이 0이다. CPU 바운드가 아니라 *I/O 바운드*면 코어 수보다 *동시 in-flight 요청 수*가 병목이라 비동기 런타임(coroutine, epoll)이 맞다. CUDA grid처럼 *수만 개* 단위로 잘게 쪼개 한 번에 디스패치하는 모델도 work-stealing이 필요 없다. 즉, 카페가 *체인 점포*고 손님이 *주문 키오스크*에 직접 넣는다면 직원끼리 일감을 훔칠 일이 없다.

| 결정 | 카페 비유 | 시스템에서의 의미 |
|------|---------|--------------------|
| 자기 큐 끝 ↔ 동료 큐 머리 | 신선한 컵 vs 오래된 큰 주문 | 캐시 지역성 + 일감 크기 최적화 |
| 무작위 동료 선택 | "아무나 한 명 보기" | 협상 비용 없는 부하 분산 |
| THRESHOLD | 한 잔짜리는 그냥 직접 만든다 | task overhead < useful work 보장 |
| Static vs steal | 단체 vs 자유석 | 불균형 정도에 따른 선택 |

이 네 가지가 work-stealing 런타임을 튜닝할 때 거의 모든 손잡이다. Rayon의 `with_min_len`, oneTBB의 grain size, Go의 GOMAXPROCS, Java ForkJoinPool의 `getCommonPoolParallelism()` — 이름은 달라도 같은 손잡이를 돌리고 있다.

### Future가 진동벨일 뿐인 이유

마지막으로 future로 돌아온다. 진동벨 비유에서 자주 놓치는 부분 — 벨은 *음료가 다 됐을 때*만 울린다. *벨을 받는 행위*는 비동기지만, *벨이 울리기를 기다리는 행위*는 동기다. `future.get()`이 정확히 그 기다림이다.

진짜 비동기가 되려면 *벨이 울렸을 때 자동으로 해야 할 행동*을 미리 등록해 둬야 한다 — 이게 콜백, then-chain, `co_await`다. JavaScript `Promise.then(...)`, Rust `async/await`, C++20 coroutine, Java `CompletableFuture.thenApply(...)` — 모두 같은 아이디어.

| 형태 | 의미 |
|------|------|
| `future.get()` | 벨이 울릴 때까지 *내가* 기다린다 (동기 회수) |
| `future.then(f)` | 벨이 울리면 *시스템이* `f`를 실행한다 (비동기 합성) |
| `co_await future` | 코루틴이 일시 정지, 벨 울리면 재개 (비동기 합성, 동기 모양) |

세 가지를 혼동하면 "future를 썼는데도 왜 멈춰 있지" 같은 의문이 생긴다. 진동벨을 받았다고 음료가 빨라지지는 않는다. 다만 *그 사이에 다른 일을 할 수 있을 뿐*이다.

### 런타임별 비유 매핑

같은 work-stealing 아이디어가 언어/런타임마다 다른 이름으로 등장한다. 이름이 달라도 *카페* 비유는 같다.

| 런타임 | 진동벨 | 직원 카운터 | 일감 훔치기 | THRESHOLD |
|--------|--------|-------------|-------------|-----------|
| Java | `Future<V>`, `CompletableFuture` | `ForkJoinPool` worker queue | 정식 work-stealing | `RecursiveTask`의 분할 임계값 |
| C++20 | `std::future`, `std::shared_future` | oneTBB task arena | oneTBB scheduler | `tbb::auto_partitioner` grain size |
| Rust | `impl Future`, `JoinHandle` | Rayon thread pool / Tokio executor | Rayon + Tokio 둘 다 | `with_min_len`, `par_iter` chunk |
| Go | (channel + goroutine) | P (processor) 로컬 큐 | runtime scheduler steal | `runtime.GOMAXPROCS` |
| Cilk++ (학술 잔존) | spawn/sync | 작업자 스택 | child stealing | `cilk_for` grainsize |

한 줄로 정리하면 — *진동벨 + 동료 일감 가져오기* 두 가지 아이디어가 거의 모든 모던 동시성 런타임의 뼈대다.

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

- [ ] Future의 합성성과 합성 불가능 차이?
- [ ] Fork-Join 패턴의 THRESHOLD 의미?
- [ ] Work Stealing에서 *bottom*과 *top*의 비대칭?
- [ ] Random victim 선택의 이유?
- [ ] Continuation Stealing과 Child Stealing 차이?
- [ ] Critical Path (T_∞)가 병목인 이유?

## 다음 장 예고

다음 장은 **Barriers** — 여러 스레드가 한 시점에서 동기화하는 패턴.

## 관련 항목

- [Ch 15: Priority Queue](/blog/parallel/parallel-principles/ch15-priority-queues)
- [Ch 17: Barriers](/blog/parallel/parallel-principles/ch17-barriers)
- [C++ Concurrency in Action Ch 4: Future](/blog/parallel/cpp-concurrency-in-action/chapter04-synchronizing-concurrent-operations)
- [C++ Concurrency in Action Ch 9: Thread Pool](/blog/parallel/cpp-concurrency-in-action/chapter09-advanced-thread-management)
