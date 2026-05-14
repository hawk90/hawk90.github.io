---
title: "Ch 9: Advanced thread management"
date: 2026-05-20T09:00:00
description: "thread pool, work stealing, interruption (cooperative), 스레드 친밀성."
tags: [C++, C, Concurrency, Thread Pool, Work Stealing]
series: "C++ Concurrency in Action"
seriesOrder: 9
draft: false
---

스레드를 생성하고 삭제하는 것은 비용이 든다. 스레드 풀을 사용하면 이 비용을 줄일 수 있다. 이 장에서는 고급 스레드 관리 기법을 다룬다.

## 9.1 스레드 풀 기초

### 왜 스레드 풀인가

![스레드 풀 재사용](/images/blog/parallel/diagrams/thread-pool-reuse.svg)

| 측면 | 매번 생성 | 스레드 풀 |
|------|-----------|-----------|
| 생성 비용 | 작업마다 | 시작 시 1회 |
| 메모리 | 불안정 | 예측 가능 |
| 확장성 | 제한적 | 우수 |
| 자원 제어 | 어려움 | 용이 |

### 기본 스레드 풀 구현

```cpp
#include <thread>
#include <vector>
#include <queue>
#include <mutex>
#include <condition_variable>
#include <functional>
#include <future>
#include <atomic>

class thread_pool {
    std::vector<std::thread> workers_;
    std::queue<std::function<void()>> tasks_;

    std::mutex queue_mutex_;
    std::condition_variable condition_;
    std::atomic<bool> stop_{false};

public:
    explicit thread_pool(size_t num_threads = std::thread::hardware_concurrency()) {
        for (size_t i = 0; i < num_threads; ++i) {
            workers_.emplace_back([this] {
                while (true) {
                    std::function<void()> task;

                    {
                        std::unique_lock lock(queue_mutex_);
                        condition_.wait(lock, [this] {
                            return stop_ || !tasks_.empty();
                        });

                        if (stop_ && tasks_.empty()) {
                            return;
                        }

                        task = std::move(tasks_.front());
                        tasks_.pop();
                    }

                    task();
                }
            });
        }
    }

    ~thread_pool() {
        stop_ = true;
        condition_.notify_all();
        for (auto& worker : workers_) {
            worker.join();
        }
    }

    template<typename F, typename... Args>
    auto submit(F&& f, Args&&... args) -> std::future<decltype(f(args...))> {
        using return_type = decltype(f(args...));

        auto task = std::make_shared<std::packaged_task<return_type()>>(
            std::bind(std::forward<F>(f), std::forward<Args>(args)...)
        );

        std::future<return_type> result = task->get_future();

        {
            std::lock_guard lock(queue_mutex_);
            if (stop_) {
                throw std::runtime_error("submit on stopped thread_pool");
            }
            tasks_.emplace([task]() { (*task)(); });
        }

        condition_.notify_one();
        return result;
    }
};
```

### 사용 예제

```cpp
int main() {
    thread_pool pool(4);  // 4개 워커 스레드

    // 작업 제출
    std::vector<std::future<int>> results;

    for (int i = 0; i < 10; ++i) {
        results.push_back(pool.submit([i] {
            std::this_thread::sleep_for(std::chrono::milliseconds(100));
            return i * i;
        }));
    }

    // 결과 수집
    for (auto& result : results) {
        std::cout << result.get() << " ";
    }
    // 출력: 0 1 4 9 16 25 36 49 64 81
}
```

### C11 기본 스레드 풀

C11에서는 `<threads.h>`를 사용하여 스레드 풀을 구현한다. `std::function` 같은 타입 소거가 없으므로 함수 포인터와 `void*`를 사용한다.

```c
#include <threads.h>
#include <stdatomic.h>
#include <stdlib.h>
#include <stdbool.h>

#define MAX_TASKS 1024

typedef void (*task_func)(void*);

typedef struct {
    task_func func;
    void* arg;
} Task;

typedef struct {
    thrd_t* workers;
    size_t num_workers;

    Task tasks[MAX_TASKS];
    size_t head;
    size_t tail;

    mtx_t queue_mtx;
    cnd_t condition;
    atomic_bool stop;
} ThreadPool;

static int worker_thread(void* arg) {
    ThreadPool* pool = (ThreadPool*)arg;

    while (true) {
        Task task = {NULL, NULL};

        mtx_lock(&pool->queue_mtx);

        while (pool->head == pool->tail && !atomic_load(&pool->stop)) {
            cnd_wait(&pool->condition, &pool->queue_mtx);
        }

        if (atomic_load(&pool->stop) && pool->head == pool->tail) {
            mtx_unlock(&pool->queue_mtx);
            break;
        }

        task = pool->tasks[pool->head];
        pool->head = (pool->head + 1) % MAX_TASKS;

        mtx_unlock(&pool->queue_mtx);

        if (task.func) {
            task.func(task.arg);
        }
    }

    return 0;
}

ThreadPool* thread_pool_create(size_t num_threads) {
    ThreadPool* pool = malloc(sizeof(ThreadPool));
    if (!pool) return NULL;

    pool->workers = malloc(sizeof(thrd_t) * num_threads);
    pool->num_workers = num_threads;
    pool->head = 0;
    pool->tail = 0;
    atomic_init(&pool->stop, false);

    mtx_init(&pool->queue_mtx, mtx_plain);
    cnd_init(&pool->condition);

    for (size_t i = 0; i < num_threads; ++i) {
        thrd_create(&pool->workers[i], worker_thread, pool);
    }

    return pool;
}

bool thread_pool_submit(ThreadPool* pool, task_func func, void* arg) {
    mtx_lock(&pool->queue_mtx);

    size_t next_tail = (pool->tail + 1) % MAX_TASKS;
    if (next_tail == pool->head) {
        mtx_unlock(&pool->queue_mtx);
        return false;  // 큐 가득 참
    }

    pool->tasks[pool->tail].func = func;
    pool->tasks[pool->tail].arg = arg;
    pool->tail = next_tail;

    mtx_unlock(&pool->queue_mtx);
    cnd_signal(&pool->condition);

    return true;
}

void thread_pool_destroy(ThreadPool* pool) {
    atomic_store(&pool->stop, true);
    cnd_broadcast(&pool->condition);

    for (size_t i = 0; i < pool->num_workers; ++i) {
        thrd_join(pool->workers[i], NULL);
    }

    mtx_destroy(&pool->queue_mtx);
    cnd_destroy(&pool->condition);
    free(pool->workers);
    free(pool);
}

// 사용 예
void square_task(void* arg) {
    int* val = (int*)arg;
    printf("%d ", (*val) * (*val));
}

int main(void) {
    ThreadPool* pool = thread_pool_create(4);

    int values[10];
    for (int i = 0; i < 10; ++i) {
        values[i] = i;
        thread_pool_submit(pool, square_task, &values[i]);
    }

    thrd_sleep(&(struct timespec){.tv_sec = 1}, NULL);  // 완료 대기
    thread_pool_destroy(pool);

    return 0;
}
```

## 9.2 작업 큐 전략

### Global Queue vs Thread-Local Queue

```
┌─────────────────────────────────────────────────────────────┐
│  Global Queue                                               │
│                                                             │
│  ┌──────────────────┐                                       │
│  │ [Task][Task][Task]│  ← 모든 스레드가 접근               │
│  └──────────────────┘                                       │
│         ↑    ↑    ↑                                         │
│       T1   T2   T3   (경합 발생!)                          │
│                                                             │
│  장점: 구현 단순, 로드 밸런싱 자동                          │
│  단점: 경합(contention), 캐시 효율 낮음                     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Thread-Local Queues                                        │
│                                                             │
│  T1: [Task][Task]     ← T1 전용                            │
│  T2: [Task]           ← T2 전용                            │
│  T3: [Task][Task][Task] ← T3 전용                          │
│                                                             │
│  장점: 경합 없음, 캐시 친화적                               │
│  단점: 로드 불균형 가능                                     │
└─────────────────────────────────────────────────────────────┘
```

### Thread-Local Queue 구현

```cpp
class thread_pool_local_queue {
    struct thread_data {
        std::queue<std::function<void()>> local_queue;
        std::mutex queue_mutex;
    };

    std::vector<std::thread> workers_;
    std::vector<std::unique_ptr<thread_data>> thread_data_;
    std::atomic<bool> stop_{false};
    std::atomic<size_t> next_thread_{0};

public:
    explicit thread_pool_local_queue(size_t num_threads) {
        thread_data_.reserve(num_threads);

        for (size_t i = 0; i < num_threads; ++i) {
            thread_data_.push_back(std::make_unique<thread_data>());
        }

        for (size_t i = 0; i < num_threads; ++i) {
            workers_.emplace_back([this, i] {
                auto& data = *thread_data_[i];

                while (!stop_) {
                    std::function<void()> task;

                    {
                        std::lock_guard lock(data.queue_mutex);
                        if (!data.local_queue.empty()) {
                            task = std::move(data.local_queue.front());
                            data.local_queue.pop();
                        }
                    }

                    if (task) {
                        task();
                    } else {
                        std::this_thread::yield();
                    }
                }
            });
        }
    }

    ~thread_pool_local_queue() {
        stop_ = true;
        for (auto& w : workers_) {
            w.join();
        }
    }

    void submit(std::function<void()> task) {
        // 라운드 로빈으로 분배
        size_t idx = next_thread_.fetch_add(1) % workers_.size();
        auto& data = *thread_data_[idx];

        std::lock_guard lock(data.queue_mutex);
        data.local_queue.push(std::move(task));
    }
};
```

## 9.3 Work Stealing

### 개념

![Work Stealing](/images/blog/parallel/diagrams/work-stealing.svg)

### Work Stealing 큐 (Deque 기반)

```cpp
#include <deque>
#include <optional>

template<typename T>
class work_stealing_queue {
    std::deque<T> tasks_;
    mutable std::mutex mtx_;

public:
    void push_front(T task) {
        std::lock_guard lock(mtx_);
        tasks_.push_front(std::move(task));
    }

    // 소유자가 앞에서 꺼냄 (LIFO - 캐시 친화적)
    std::optional<T> pop_front() {
        std::lock_guard lock(mtx_);
        if (tasks_.empty()) return std::nullopt;

        T task = std::move(tasks_.front());
        tasks_.pop_front();
        return task;
    }

    // 도둑이 뒤에서 훔침 (소유자와 충돌 최소화)
    std::optional<T> steal() {
        std::lock_guard lock(mtx_);
        if (tasks_.empty()) return std::nullopt;

        T task = std::move(tasks_.back());
        tasks_.pop_back();
        return task;
    }

    bool empty() const {
        std::lock_guard lock(mtx_);
        return tasks_.empty();
    }
};
```

### Work Stealing 스레드 풀

```cpp
class work_stealing_pool {
    using task_type = std::function<void()>;

    std::vector<std::thread> workers_;
    std::vector<std::unique_ptr<work_stealing_queue<task_type>>> queues_;
    std::atomic<bool> stop_{false};
    std::atomic<size_t> index_{0};

    static thread_local size_t my_index_;

public:
    explicit work_stealing_pool(size_t num_threads = std::thread::hardware_concurrency()) {
        queues_.reserve(num_threads);
        for (size_t i = 0; i < num_threads; ++i) {
            queues_.push_back(std::make_unique<work_stealing_queue<task_type>>());
        }

        for (size_t i = 0; i < num_threads; ++i) {
            workers_.emplace_back([this, i] {
                my_index_ = i;
                worker_loop(i);
            });
        }
    }

    ~work_stealing_pool() {
        stop_ = true;
        for (auto& w : workers_) {
            w.join();
        }
    }

    void submit(task_type task) {
        size_t idx = index_.fetch_add(1) % queues_.size();
        queues_[idx]->push_front(std::move(task));
    }

private:
    void worker_loop(size_t my_idx) {
        while (!stop_) {
            task_type task;

            // 1. 자신의 큐에서 먼저 시도
            if (auto t = queues_[my_idx]->pop_front()) {
                task = std::move(*t);
            }
            // 2. 다른 큐에서 훔치기
            else {
                bool found = false;
                for (size_t i = 0; i < queues_.size() && !found; ++i) {
                    size_t victim = (my_idx + i + 1) % queues_.size();
                    if (auto t = queues_[victim]->steal()) {
                        task = std::move(*t);
                        found = true;
                    }
                }

                if (!found) {
                    std::this_thread::yield();
                    continue;
                }
            }

            task();
        }
    }
};

thread_local size_t work_stealing_pool::my_index_ = 0;
```

### C11 Work Stealing 큐

C11에서 lock-free work stealing 큐를 구현하려면 `<stdatomic.h>`를 사용한다.

```c
#include <stdatomic.h>
#include <stdlib.h>
#include <stdbool.h>

#define WS_QUEUE_CAPACITY 1024

typedef struct {
    void* tasks[WS_QUEUE_CAPACITY];
    atomic_size_t top;
    atomic_size_t bottom;
} WorkStealingQueue;

void ws_queue_init(WorkStealingQueue* q) {
    atomic_init(&q->top, 0);
    atomic_init(&q->bottom, 0);
}

// 소유자가 push (단일 생산자)
void ws_queue_push(WorkStealingQueue* q, void* task) {
    size_t b = atomic_load_explicit(&q->bottom, memory_order_relaxed);
    q->tasks[b % WS_QUEUE_CAPACITY] = task;
    atomic_thread_fence(memory_order_release);
    atomic_store_explicit(&q->bottom, b + 1, memory_order_relaxed);
}

// 소유자가 pop (LIFO)
void* ws_queue_pop(WorkStealingQueue* q) {
    size_t b = atomic_load_explicit(&q->bottom, memory_order_relaxed) - 1;
    atomic_store_explicit(&q->bottom, b, memory_order_relaxed);
    atomic_thread_fence(memory_order_seq_cst);

    size_t t = atomic_load_explicit(&q->top, memory_order_relaxed);

    if (t <= b) {
        void* task = q->tasks[b % WS_QUEUE_CAPACITY];

        if (t == b) {
            // 마지막 항목 - CAS 필요
            if (!atomic_compare_exchange_strong_explicit(
                    &q->top, &t, t + 1,
                    memory_order_seq_cst, memory_order_relaxed)) {
                atomic_store_explicit(&q->bottom, b + 1, memory_order_relaxed);
                return NULL;
            }
            atomic_store_explicit(&q->bottom, b + 1, memory_order_relaxed);
        }
        return task;
    }

    atomic_store_explicit(&q->bottom, b + 1, memory_order_relaxed);
    return NULL;
}

// 도둑이 steal (FIFO - 소유자와 반대 방향)
void* ws_queue_steal(WorkStealingQueue* q) {
    size_t t = atomic_load_explicit(&q->top, memory_order_acquire);
    atomic_thread_fence(memory_order_seq_cst);
    size_t b = atomic_load_explicit(&q->bottom, memory_order_acquire);

    if (t < b) {
        void* task = q->tasks[t % WS_QUEUE_CAPACITY];

        if (!atomic_compare_exchange_strong_explicit(
                &q->top, &t, t + 1,
                memory_order_seq_cst, memory_order_relaxed)) {
            return NULL;  // 다른 도둑이 먼저 훔침
        }
        return task;
    }

    return NULL;
}
```

### Chase-Lev Deque (고성능 버전)

```cpp
// Lock-free work stealing deque (개념적 구현)
template<typename T>
class chase_lev_deque {
    static constexpr size_t INITIAL_CAPACITY = 32;

    struct array {
        std::atomic<T*> buffer[INITIAL_CAPACITY];
        size_t capacity;
    };

    std::atomic<size_t> top_{0};
    std::atomic<size_t> bottom_{0};
    std::atomic<array*> array_;

public:
    chase_lev_deque() {
        array_.store(new array{});
    }

    // 소유자가 아래에 push (단일 생산자)
    void push(T item) {
        size_t b = bottom_.load(std::memory_order_relaxed);
        size_t t = top_.load(std::memory_order_acquire);

        auto* a = array_.load(std::memory_order_relaxed);

        if (b - t >= a->capacity) {
            // 배열 확장 필요 (생략)
        }

        a->buffer[b % a->capacity].store(new T(std::move(item)),
                                          std::memory_order_relaxed);

        std::atomic_thread_fence(std::memory_order_release);
        bottom_.store(b + 1, std::memory_order_relaxed);
    }

    // 소유자가 아래에서 pop
    std::optional<T> pop() {
        size_t b = bottom_.load(std::memory_order_relaxed) - 1;
        auto* a = array_.load(std::memory_order_relaxed);

        bottom_.store(b, std::memory_order_relaxed);
        std::atomic_thread_fence(std::memory_order_seq_cst);

        size_t t = top_.load(std::memory_order_relaxed);

        if (t <= b) {
            T* item = a->buffer[b % a->capacity].load(std::memory_order_relaxed);

            if (t == b) {
                // 마지막 항목 - CAS 필요
                if (!top_.compare_exchange_strong(t, t + 1,
                        std::memory_order_seq_cst, std::memory_order_relaxed)) {
                    bottom_.store(b + 1, std::memory_order_relaxed);
                    return std::nullopt;
                }
                bottom_.store(b + 1, std::memory_order_relaxed);
            }

            T result = std::move(*item);
            delete item;
            return result;
        }

        bottom_.store(b + 1, std::memory_order_relaxed);
        return std::nullopt;
    }

    // 도둑이 위에서 steal
    std::optional<T> steal() {
        size_t t = top_.load(std::memory_order_acquire);
        std::atomic_thread_fence(std::memory_order_seq_cst);
        size_t b = bottom_.load(std::memory_order_acquire);

        if (t < b) {
            auto* a = array_.load(std::memory_order_relaxed);
            T* item = a->buffer[t % a->capacity].load(std::memory_order_relaxed);

            if (!top_.compare_exchange_strong(t, t + 1,
                    std::memory_order_seq_cst, std::memory_order_relaxed)) {
                return std::nullopt;  // 다른 도둑이 먼저 훔침
            }

            T result = std::move(*item);
            delete item;
            return result;
        }

        return std::nullopt;
    }
};
```

## 9.4 스레드 인터럽트 (C++20)

### std::stop_token

C++20은 협력적 스레드 중단을 위한 `std::stop_token`을 도입했다.

```cpp
#include <stop_token>
#include <thread>

void interruptible_work(std::stop_token stoken) {
    while (!stoken.stop_requested()) {
        // 작업 수행
        do_some_work();

        // 긴 작업 중간에 체크
        if (stoken.stop_requested()) {
            break;
        }
    }

    // 정리 작업
    cleanup();
}

int main() {
    std::jthread worker(interruptible_work);

    std::this_thread::sleep_for(std::chrono::seconds(2));

    // jthread 소멸 시 자동으로 stop 요청 + join
    // 또는 명시적으로:
    worker.request_stop();
    worker.join();
}
```

### stop_callback

중단 요청 시 콜백을 실행할 수 있다.

```cpp
void work_with_callback(std::stop_token stoken) {
    // 중단 요청 시 호출될 콜백 등록
    std::stop_callback callback(stoken, [] {
        std::cout << "Stop requested! Cleaning up...\n";
    });

    while (!stoken.stop_requested()) {
        do_work();
    }
}
```

### 조건 변수와 통합

```cpp
class interruptible_queue {
    std::queue<int> data_;
    std::mutex mtx_;
    std::condition_variable_any cv_;  // any 버전 필요

public:
    void push(int value) {
        {
            std::lock_guard lock(mtx_);
            data_.push(value);
        }
        cv_.notify_one();
    }

    std::optional<int> pop(std::stop_token stoken) {
        std::unique_lock lock(mtx_);

        // stop_token과 함께 대기
        if (!cv_.wait(lock, stoken, [this] { return !data_.empty(); })) {
            // 중단 요청됨
            return std::nullopt;
        }

        int value = data_.front();
        data_.pop();
        return value;
    }
};

void consumer(std::stop_token stoken, interruptible_queue& queue) {
    while (auto value = queue.pop(stoken)) {
        process(*value);
    }
    std::cout << "Consumer stopped\n";
}
```

### C11: 협력적 중단 패턴

C11에서는 `atomic_bool`을 사용하여 협력적 중단을 구현한다.

```c
#include <threads.h>
#include <stdatomic.h>
#include <stdbool.h>

typedef struct {
    thrd_t thread;
    atomic_bool stop_requested;
} InterruptibleThread;

typedef struct {
    InterruptibleThread* ithread;
    void (*work_func)(atomic_bool*);
} ThreadArg;

static int thread_func(void* arg) {
    ThreadArg* targ = (ThreadArg*)arg;
    targ->work_func(&targ->ithread->stop_requested);
    free(targ);
    return 0;
}

void interruptible_thread_create(InterruptibleThread* it,
                                  void (*func)(atomic_bool*)) {
    atomic_init(&it->stop_requested, false);

    ThreadArg* arg = malloc(sizeof(ThreadArg));
    arg->ithread = it;
    arg->work_func = func;

    thrd_create(&it->thread, thread_func, arg);
}

void interruptible_thread_request_stop(InterruptibleThread* it) {
    atomic_store(&it->stop_requested, true);
}

void interruptible_thread_join(InterruptibleThread* it) {
    thrd_join(it->thread, NULL);
}

// 사용 예
void my_work(atomic_bool* stop_flag) {
    while (!atomic_load(stop_flag)) {
        // 작업 수행
        do_some_work();

        // 긴 작업 중간에 체크
        if (atomic_load(stop_flag)) {
            break;
        }
    }
    cleanup();
}

int main(void) {
    InterruptibleThread worker;
    interruptible_thread_create(&worker, my_work);

    thrd_sleep(&(struct timespec){.tv_sec = 2}, NULL);

    interruptible_thread_request_stop(&worker);
    interruptible_thread_join(&worker);

    return 0;
}
```

### C++17 이전: 협력적 중단 패턴

```cpp
class interruptible_thread {
    std::thread thread_;
    std::atomic<bool> stop_requested_{false};

public:
    template<typename F>
    explicit interruptible_thread(F&& f) {
        thread_ = std::thread([this, f = std::forward<F>(f)] {
            f([this] { return stop_requested_.load(); });
        });
    }

    void request_stop() {
        stop_requested_.store(true);
    }

    void join() {
        if (thread_.joinable()) {
            thread_.join();
        }
    }

    ~interruptible_thread() {
        request_stop();
        join();
    }
};

// 사용
interruptible_thread worker([](auto is_stopped) {
    while (!is_stopped()) {
        do_work();
    }
});

std::this_thread::sleep_for(std::chrono::seconds(2));
worker.request_stop();
worker.join();
```

## 9.5 스레드 풀 고급 기능

### 우선순위 작업

```cpp
class priority_thread_pool {
    struct prioritized_task {
        int priority;
        std::function<void()> task;

        bool operator<(const prioritized_task& other) const {
            return priority < other.priority;  // 높은 우선순위가 먼저
        }
    };

    std::priority_queue<prioritized_task> tasks_;
    std::mutex mtx_;
    std::condition_variable cv_;
    std::vector<std::thread> workers_;
    std::atomic<bool> stop_{false};

public:
    explicit priority_thread_pool(size_t num_threads) {
        for (size_t i = 0; i < num_threads; ++i) {
            workers_.emplace_back([this] {
                while (true) {
                    std::function<void()> task;

                    {
                        std::unique_lock lock(mtx_);
                        cv_.wait(lock, [this] {
                            return stop_ || !tasks_.empty();
                        });

                        if (stop_ && tasks_.empty()) return;

                        task = std::move(const_cast<prioritized_task&>(
                            tasks_.top()).task);
                        tasks_.pop();
                    }

                    task();
                }
            });
        }
    }

    void submit(std::function<void()> task, int priority = 0) {
        {
            std::lock_guard lock(mtx_);
            tasks_.push({priority, std::move(task)});
        }
        cv_.notify_one();
    }

    ~priority_thread_pool() {
        stop_ = true;
        cv_.notify_all();
        for (auto& w : workers_) w.join();
    }
};
```

### 작업 그룹

```cpp
class task_group {
    std::atomic<size_t> pending_{0};
    std::promise<void> done_promise_;
    std::shared_future<void> done_future_;
    std::mutex exception_mtx_;
    std::exception_ptr exception_;

public:
    task_group() : done_future_(done_promise_.get_future()) {}

    template<typename F>
    void run(thread_pool& pool, F&& f) {
        ++pending_;
        pool.submit([this, f = std::forward<F>(f)] {
            try {
                f();
            } catch (...) {
                std::lock_guard lock(exception_mtx_);
                if (!exception_) {
                    exception_ = std::current_exception();
                }
            }

            if (--pending_ == 0) {
                done_promise_.set_value();
            }
        });
    }

    void wait() {
        done_future_.wait();
        if (exception_) {
            std::rethrow_exception(exception_);
        }
    }
};

// 사용
void parallel_work(thread_pool& pool) {
    task_group group;

    for (int i = 0; i < 100; ++i) {
        group.run(pool, [i] {
            process(i);
        });
    }

    group.wait();  // 모든 작업 완료 대기
}
```

### 동적 스레드 수 조정

```cpp
class adaptive_thread_pool {
    std::vector<std::thread> workers_;
    std::queue<std::function<void()>> tasks_;
    std::mutex mtx_;
    std::condition_variable cv_;

    std::atomic<bool> stop_{false};
    std::atomic<size_t> active_threads_{0};
    std::atomic<size_t> idle_threads_{0};

    size_t min_threads_;
    size_t max_threads_;

public:
    adaptive_thread_pool(size_t min_threads, size_t max_threads)
        : min_threads_(min_threads), max_threads_(max_threads) {

        for (size_t i = 0; i < min_threads_; ++i) {
            add_worker();
        }
    }

    void submit(std::function<void()> task) {
        {
            std::lock_guard lock(mtx_);
            tasks_.push(std::move(task));
        }
        cv_.notify_one();

        // 필요하면 스레드 추가
        maybe_add_worker();
    }

private:
    void add_worker() {
        workers_.emplace_back([this] {
            ++active_threads_;
            worker_loop();
            --active_threads_;
        });
    }

    void maybe_add_worker() {
        // 모든 스레드가 바쁘고, 아직 최대 아래면 추가
        if (idle_threads_ == 0 &&
            active_threads_ < max_threads_) {
            std::lock_guard lock(mtx_);
            add_worker();
        }
    }

    void worker_loop() {
        while (!stop_) {
            std::function<void()> task;

            {
                std::unique_lock lock(mtx_);
                ++idle_threads_;

                cv_.wait_for(lock, std::chrono::seconds(30), [this] {
                    return stop_ || !tasks_.empty();
                });

                --idle_threads_;

                if (stop_ && tasks_.empty()) return;

                if (tasks_.empty()) {
                    // 타임아웃 - 최소 스레드 수 이상이면 종료
                    if (active_threads_ > min_threads_) {
                        return;
                    }
                    continue;
                }

                task = std::move(tasks_.front());
                tasks_.pop();
            }

            task();
        }
    }
};
```

## 9.6 스레드 친화성 (Thread Affinity)

### CPU Pinning

특정 스레드를 특정 CPU 코어에 고정하면 캐시 효율이 향상될 수 있다.

```cpp
#ifdef __linux__
#include <pthread.h>
#include <sched.h>

void set_thread_affinity(std::thread& t, int cpu_id) {
    cpu_set_t cpuset;
    CPU_ZERO(&cpuset);
    CPU_SET(cpu_id, &cpuset);

    int rc = pthread_setaffinity_np(
        t.native_handle(),
        sizeof(cpu_set_t),
        &cpuset
    );

    if (rc != 0) {
        throw std::runtime_error("Failed to set thread affinity");
    }
}
#endif

#ifdef _WIN32
#include <windows.h>

void set_thread_affinity(std::thread& t, int cpu_id) {
    DWORD_PTR mask = 1ULL << cpu_id;
    HANDLE handle = t.native_handle();

    if (SetThreadAffinityMask(handle, mask) == 0) {
        throw std::runtime_error("Failed to set thread affinity");
    }
}
#endif
```

### NUMA 인지 스레드 풀

```cpp
#ifdef __linux__
#include <numa.h>

class numa_aware_pool {
    struct numa_node_pool {
        std::vector<std::thread> workers;
        std::queue<std::function<void()>> tasks;
        std::mutex mtx;
        std::condition_variable cv;
    };

    std::vector<std::unique_ptr<numa_node_pool>> nodes_;
    std::atomic<bool> stop_{false};

public:
    numa_aware_pool() {
        if (numa_available() < 0) {
            throw std::runtime_error("NUMA not available");
        }

        int num_nodes = numa_max_node() + 1;
        nodes_.reserve(num_nodes);

        for (int node = 0; node < num_nodes; ++node) {
            auto pool = std::make_unique<numa_node_pool>();

            // 이 노드의 CPU 수만큼 스레드 생성
            struct bitmask* cpus = numa_allocate_cpumask();
            numa_node_to_cpus(node, cpus);

            for (unsigned cpu = 0; cpu < numa_bitmask_nbytes(cpus) * 8; ++cpu) {
                if (numa_bitmask_isbitset(cpus, cpu)) {
                    pool->workers.emplace_back([this, pool_ptr = pool.get(), cpu] {
                        // 이 스레드를 특정 CPU에 고정
                        cpu_set_t cpuset;
                        CPU_ZERO(&cpuset);
                        CPU_SET(cpu, &cpuset);
                        pthread_setaffinity_np(pthread_self(), sizeof(cpuset), &cpuset);

                        worker_loop(pool_ptr);
                    });
                }
            }

            numa_free_cpumask(cpus);
            nodes_.push_back(std::move(pool));
        }
    }

    // 특정 NUMA 노드에 작업 제출
    void submit(std::function<void()> task, int numa_node = -1) {
        if (numa_node < 0) {
            numa_node = numa_node_of_cpu(sched_getcpu());
        }

        auto& pool = *nodes_[numa_node % nodes_.size()];
        {
            std::lock_guard lock(pool.mtx);
            pool.tasks.push(std::move(task));
        }
        pool.cv.notify_one();
    }

private:
    void worker_loop(numa_node_pool* pool) {
        while (!stop_) {
            std::function<void()> task;

            {
                std::unique_lock lock(pool->mtx);
                pool->cv.wait(lock, [this, pool] {
                    return stop_ || !pool->tasks.empty();
                });

                if (stop_ && pool->tasks.empty()) return;

                task = std::move(pool->tasks.front());
                pool->tasks.pop();
            }

            task();
        }
    }
};
#endif
```

## 9.7 스레드 풀 설계 고려사항

### 스레드 수 결정

```cpp
size_t optimal_thread_count() {
    size_t hardware_threads = std::thread::hardware_concurrency();

    // CPU 바운드 작업: hardware_threads
    // I/O 바운드 작업: hardware_threads * 2 이상
    // 혼합: 프로파일링으로 결정

    return hardware_threads > 0 ? hardware_threads : 4;
}

// I/O 바운드 작업용 계산
size_t io_bound_thread_count(double cpu_utilization, double wait_ratio) {
    // N = Ncpu * Ucpu * (1 + W/C)
    // Ncpu: CPU 수
    // Ucpu: 목표 CPU 사용률 (0.0 ~ 1.0)
    // W/C: 대기 시간 / 계산 시간 비율

    size_t ncpu = std::thread::hardware_concurrency();
    return static_cast<size_t>(ncpu * cpu_utilization * (1.0 + wait_ratio));
}
```

### 가이드라인

| 작업 유형 | 스레드 수 | 이유 |
|-----------|-----------|------|
| CPU 바운드 | `hardware_concurrency()` | 코어당 1개가 최적 |
| I/O 바운드 | 더 많이 | 대기 중 다른 작업 가능 |
| 혼합 | 프로파일링 | 작업 특성에 따라 다름 |

### 주의사항

```cpp
// 💥 잘못된 사용: 스레드 풀 내에서 future.get() 호출
void bad_usage(thread_pool& pool) {
    auto outer = pool.submit([&pool] {
        auto inner = pool.submit([] {
            return 42;
        });
        return inner.get();  // 💥 데드락 위험!
    });
    outer.get();
}

// ✓ 올바른 사용: continuation 사용 또는 별도 풀 사용
void good_usage(thread_pool& compute_pool, thread_pool& io_pool) {
    auto outer = compute_pool.submit([&io_pool] {
        // I/O 작업은 다른 풀에서
        auto io_result = io_pool.submit([] {
            return read_file();
        });
        // 계산만 수행
        return process(io_result.get());
    });
}
```

## 정리

- **스레드 풀**은 스레드 생성/삭제 비용을 줄인다
- **Work stealing**은 로드 밸런싱을 자동화한다
- **std::stop_token** (C++20)으로 협력적 중단을 구현한다
- **Thread affinity**로 캐시 효율을 높일 수 있다
- 스레드 수는 **작업 특성**에 맞게 결정한다:
  - CPU 바운드: 코어 수
  - I/O 바운드: 더 많이
- 스레드 풀 내에서 **future.get() 호출은 데드락 위험**이 있다

## 한국 개발자의 함정

```
1. *thread pool 안에서 future.get() 호출*
   - 같은 풀의 다른 작업 결과 기다림 → deadlock
   - 풀 크기보다 많은 dependency chain이면 멈춤
   - continuation / 별도 풀 / async-await 사용

2. *모든 작업을 같은 풀에*
   - CPU 바운드 + I/O 바운드 섞이면 성능 저하
   - 풀을 *역할별*로 분리 (compute / io / background)
   - I/O 풀은 더 크게

3. *Work stealing이 만능*
   - 매우 짧은 작업엔 오버헤드 큼
   - locality가 중요한 작업엔 그대로가 더 빠름
   - 보통 fork-join 패턴에 잘 맞음

4. *Thread affinity = 항상 성능 향상*
   - OS 스케줄러를 막아 오히려 손해 가능
   - NUMA 시스템에서만 보통 이득
   - 측정 + 실험 필요

5. *stop_token을 무시*
   - 협력적 취소 → 작업 코드가 *체크*해야 함
   - 긴 계산 루프엔 주기적으로 stop_requested() 호출
   - condition_variable_any로 wait 중단도 가능
```

## 실무 적용

```
이론 → 실무:
- thread_pool             → Boost.Asio thread_pool, taskflow, BS::thread_pool
- work-stealing           → Intel TBB, rayon (Rust), ForkJoinPool (Java)
- priority pool           → 사용자 정의 또는 Asio
- stop_token (C++20)      → std::jthread, std::condition_variable_any
- thread affinity         → pthread_setaffinity_np, SetThreadAffinityMask
- NUMA 인지               → libnuma, jemalloc, mimalloc

라이브러리:
- C++: Boost.Asio, taskflow, oneTBB, Folly executors
- Rust: rayon, tokio, async-std
- Java: ExecutorService, ForkJoinPool, CompletableFuture
- Go: goroutine + work-stealing runtime
- C#: TPL, Task.Run, async/await

설계 결정:
- 짧은 CPU 작업          → fixed-size pool (hardware_concurrency)
- I/O 바운드             → 큰 pool (수십~수백)
- 우선순위 필요          → priority_queue 기반 pool
- 부하 변동             → adaptive pool
- NUMA / 대규모         → NUMA-aware + thread affinity
```

## 자기 점검

```
□ Global queue vs Thread-local queue 차이?
□ Work stealing의 *bottom*과 *top* 비대칭 이유?
□ Chase-Lev deque의 핵심 트릭?
□ stop_token이 *cooperative*인 의미?
□ thread pool 내 future.get() deadlock 시나리오?
□ CPU bound와 I/O bound 풀 크기 차이?
□ NUMA awareness가 필요한 시점?
```

## 다음 장 예고

다음 장에서는 C++17/20의 병렬 알고리즘을 다룬다. 실행 정책을 사용해 표준 알고리즘을 병렬로 실행하는 방법을 살펴본다.

## 관련 항목

- [Ch 2: Managing Threads](/blog/parallel/cpp-concurrency-in-action/chapter02-managing-threads)
- [Ch 8: Designing Concurrent Code](/blog/parallel/cpp-concurrency-in-action/chapter08-designing-concurrent-code)
- [Ch 10: Parallel Algorithms](/blog/parallel/cpp-concurrency-in-action/chapter10-parallel-algorithms)
- [AMP Ch 16: Work Stealing](/blog/parallel/parallel-principles/ch16-futures-scheduling-work-distribution)
- [AMP Ch 15: Priority Queues](/blog/parallel/parallel-principles/ch15-priority-queues)
