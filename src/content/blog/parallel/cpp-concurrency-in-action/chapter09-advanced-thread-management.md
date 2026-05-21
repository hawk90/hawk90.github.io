---
title: "Ch 9: Advanced thread management"
date: 2026-05-06T09:00:00
description: "thread pool, work stealing, interruption (cooperative), 스레드 친밀성."
tags: [C++, C, Concurrency, Thread Pool, Work Stealing]
series: "C++ Concurrency in Action"
seriesOrder: 9
draft: false
---

스레드를 생성하고 삭제하는 것은 비용이 든다. 스레드 풀을 사용하면 이 비용을 줄일 수 있다. 이 장에서는 고급 스레드 관리 기법을 다룬다.

9장의 주제를 한 줄로 줄이면 *production-grade 동시성*의 길이다. thread pool, 취소(interruption), 우선순위 관리는 *데모 수준의 동시성*을 *실제 서비스가 매일 24시간 돌리는 동시성*으로 끌어올리는 핵심 도구들이다. 8장이 *어떻게 병렬화할지*를 다루었다면, 9장은 *그 병렬을 어떻게 운영할지*를 다룬다.

비유로 풀면 thread pool은 *콜센터*에 가깝다. 손님이 전화를 걸 때마다 새 직원을 채용하면 채용·교육 비용이 통화당 발생한다. 상시 직원을 N명 두고 *전화 큐*를 처리하게 하면 비용이 분산된다. 한 직원이 통화를 마치면 다음 큐의 전화를 받는다. 손님 입장에선 *대기 시간*이 비용이고, 운영자 입장에선 *직원 수와 큐 길이의 균형*이 설계 과제다.

work stealing은 같은 콜센터에서 *직원 간 협력*을 한 단계 더 끌어올린 패턴이다. 어떤 직원의 큐가 비었는데 옆 직원의 큐가 쌓여 있다고 하자. 일 없는 직원이 옆 직원의 *큐 뒤쪽*에서 전화를 가져와 받는다. 부하 균형이 자동으로 맞춰지고, 큐가 정적으로 분배되었을 때 생기는 *놀고 있는 직원*을 줄인다.

이 패턴이 효과적인 이유는 *충돌 영역의 분리*다. 소유자는 큐의 한쪽 끝(보통 LIFO)만 쓰고 도둑은 반대쪽 끝만 본다. 평소엔 두 영역이 만나지 않아 락이 거의 필요 없다. 큐가 거의 비었을 때만 양쪽이 만나, 그 경계에서만 동기화를 한다. 이 *경합 최소화*가 work stealing 큐의 핵심 발명이다 (Chase-Lev deque).

interruption은 진행 중인 직원에게 *작업 중단을 정중히 요청*하는 메커니즘이다. C++의 thread는 강제 종료를 안전하게 제공하지 않으므로 cooperative 모델이 표준이다. 직원에게 *상담을 적당한 지점에서 마무리해 달라*고 신호를 보내고, 직원이 그 신호를 자기 일정에 맞춰 확인한 뒤 정리한다. 강제로 끊지 않기 때문에 자료구조의 일관성이 깨지지 않는다.

C++20의 `std::jthread`와 `std::stop_token`이 이 패턴을 표준화했다. `jthread`는 소멸 시 자동으로 stop 요청을 보내고 join하는 RAII 객체다. *fire-and-forget*과 *수명 관리*를 한 단계 안전하게 만든다. 함수는 `stop_token`을 인자로 받아 주기적으로 `stop_requested()`를 검사한다. 책의 9.2가 직접 구현하는 `interruptible_thread`가 C++20에서 표준으로 들어온 것이라고 보면 된다.

실제 시스템에서는 이 패턴들이 거의 항상 라이브러리에 녹아 있다. Java의 `ForkJoinPool`은 work stealing의 표준 구현이다. .NET의 `ThreadPool`은 OS 스케줄링과 협력하는 우선순위 기반 풀이다. Tokio(Rust)는 async/await 위에 work stealing 런타임을 얹어 수만 개의 async task를 적은 OS 스레드로 처리한다. Go runtime의 스케줄러는 goroutine을 M개의 OS 스레드 위에 N:M으로 매핑하면서 자체 work stealing을 한다. 9장은 이 라이브러리들이 *내부에서 어떻게 동작하는지*를 직접 짜 보는 챕터로 읽으면 흐름이 잡힌다.

## 9.1 스레드 풀 기초

### 왜 스레드 풀인가

스레드 생성은 *생각보다 비싸다*. 리눅스에서 `clone()` 호출 자체가 마이크로초 단위이고, 그 위에 8 MB의 기본 스택 매핑, TLS 초기화, glibc 자료구조 설정이 더해진다. 짧은 작업에 매번 스레드를 만들면 작업 시간보다 생성·소멸 시간이 길어진다. 스레드 풀은 *N개를 미리 만들어 두고 재사용*하는 것으로 이 비용을 분산한다.

![스레드 풀 재사용](/images/blog/parallel/diagrams/thread-pool-reuse.svg)

| 측면 | 매번 생성 | 스레드 풀 |
|------|-----------|-----------|
| 생성 비용 | 작업마다 | 시작 시 1회 |
| 메모리 | 불안정 | 예측 가능 |
| 확장성 | 제한적 | 우수 |
| 자원 제어 | 어려움 | 용이 |

표의 *자원 제어*가 보통 가장 큰 차이를 만든다. 매번 스레드를 만들면 동시에 살아 있는 스레드 수가 부하에 따라 폭발할 수 있다. 1000개의 요청이 동시에 들어오면 1000개의 스레드가 생성된다. 풀은 *N개로 상한*을 명시적으로 둔다. 부하가 많아지면 큐에 쌓일 뿐, 스레드 수가 폭발하지는 않는다. 메모리 사용량과 컨텍스트 스위치 빈도가 예측 가능해진다.

stack 메모리 사용량도 무시하면 안 된다. Linux의 기본 스택 크기는 8 MB이고, 1000개의 스레드는 그 자체로 8 GB의 가상 주소 공간을 잡는다. 32비트 시스템에서는 주소 공간이 부족해지고, 64비트에서도 메모리 매핑이 늘어 page table 비용이 커진다. 풀의 *N개*가 이 모든 비용의 상한을 잡는다.

### 가장 단순한 스레드 풀 (Listing 9.1)

Williams는 책의 9.1.1에서 *fire-and-forget* 형태의 가장 단순한 풀로 시작한다. 작업은 `std::function<void()>`로 표현되고, 결과 회수도 예외 전달도 없다. 워커 스레드는 미리 생성해 두고 무한 루프로 큐에서 작업을 꺼낸다.

```cpp
#include <atomic>
#include <thread>
#include <vector>
#include <functional>

// threadsafe_queue는 Listing 6.2의 그것 (push / wait_and_pop / try_pop)
class thread_pool {
    std::atomic<bool> done_;
    threadsafe_queue<std::function<void()>> work_queue_;
    std::vector<std::thread> threads_;
    join_threads joiner_;  // 소멸 시 모든 스레드 join (Listing 8.2)

    void worker_thread() {
        while (!done_) {
            std::function<void()> task;
            if (work_queue_.try_pop(task)) {
                task();
            } else {
                std::this_thread::yield();
            }
        }
    }

public:
    thread_pool() : done_(false), joiner_(threads_) {
        unsigned const thread_count = std::thread::hardware_concurrency();
        try {
            for (unsigned i = 0; i < thread_count; ++i) {
                threads_.emplace_back(&thread_pool::worker_thread, this);
            }
        } catch (...) {
            done_ = true;
            throw;
        }
    }

    ~thread_pool() { done_ = true; }

    template<typename FunctionType>
    void submit(FunctionType f) {
        work_queue_.push(std::function<void()>(f));
    }
};
```

세 가지 포인트가 있다. 첫째, `done_` 플래그와 워커 큐를 *멤버 선언 순서*대로 두는 것이 중요하다. `joiner_`가 마지막에 와야 소멸 시 가장 먼저 호출되어 워커들을 안전하게 정리한다. 둘째, 생성자에서 예외가 발생하면 즉시 `done_=true`로 만들어 이미 만들어진 스레드들을 정지시킨다. 셋째, 빈 큐일 때 `yield()`로 양보하는 단순한 폴링이라 busy-wait에 가까운 동작이 된다.

### 작업 완료를 기다리는 풀 (Listing 9.2)

Listing 9.1은 결과를 회수할 방법이 없다. 책의 9.1.2는 `std::packaged_task<>`를 사용하여 결과와 예외를 `std::future`로 반환하는 풀을 만든다. 한 가지 문제는 `std::packaged_task`가 *이동 전용*이라 `std::function`에 넣을 수 없다는 점이다. Williams는 이를 위해 작은 type-erasure 래퍼를 둔다.

```cpp
class function_wrapper {
    struct impl_base {
        virtual void call() = 0;
        virtual ~impl_base() {}
    };

    template<typename F>
    struct impl_type : impl_base {
        F f;
        impl_type(F&& f_) : f(std::move(f_)) {}
        void call() override { f(); }
    };

    std::unique_ptr<impl_base> impl_;

public:
    template<typename F>
    function_wrapper(F&& f)
        : impl_(new impl_type<F>(std::move(f))) {}

    void operator()() { impl_->call(); }

    function_wrapper() = default;
    function_wrapper(function_wrapper&& other) noexcept
        : impl_(std::move(other.impl_)) {}
    function_wrapper& operator=(function_wrapper&& other) noexcept {
        impl_ = std::move(other.impl_);
        return *this;
    }

    function_wrapper(const function_wrapper&) = delete;
    function_wrapper(function_wrapper&) = delete;
    function_wrapper& operator=(const function_wrapper&) = delete;
};
```

### 결과 반환 풀 (Listing 9.3)

`function_wrapper`를 큐 원소로 사용하면 `packaged_task`를 그대로 큐에 넣을 수 있다.

```cpp
class thread_pool {
    std::atomic<bool> done_;
    threadsafe_queue<function_wrapper> work_queue_;
    std::vector<std::thread> threads_;
    join_threads joiner_;

    void worker_thread() {
        while (!done_) {
            function_wrapper task;
            if (work_queue_.try_pop(task)) {
                task();
            } else {
                std::this_thread::yield();
            }
        }
    }

public:
    template<typename FunctionType>
    std::future<typename std::invoke_result_t<FunctionType>>
    submit(FunctionType f) {
        using result_type = std::invoke_result_t<FunctionType>;

        std::packaged_task<result_type()> task(std::move(f));
        std::future<result_type> res(task.get_future());
        work_queue_.push(std::move(task));  // packaged_task → function_wrapper
        return res;
    }

    // 생성자 / 소멸자는 Listing 9.1과 동일
};
```

이 풀은 호출자가 `submit()`의 반환 `future`로 결과나 예외를 회수할 수 있다. Quick-sort 같은 분할 정복 알고리즘을 풀로 옮길 때 이 형태가 출발점이 된다.

### 사용 예제

```cpp
int main() {
    thread_pool pool;  // hardware_concurrency() 만큼 워커

    std::vector<std::future<int>> results;
    for (int i = 0; i < 10; ++i) {
        results.push_back(pool.submit([i] {
            return i * i;
        }));
    }

    for (auto& r : results) {
        std::cout << r.get() << ' ';
    }
    // 0 1 4 9 16 25 36 49 64 81
}
```

### 동적 스레드 관리 (책의 권고)

책은 9.1 마지막에서 풀 크기를 *런타임에* 조정하는 문제를 다룬다. 표준 라이브러리에는 별도 기능이 없으므로 직접 만들어야 한다. 두 가지 패턴이 일반적이다. 첫째, 워커가 일정 시간 idle이면 자발적으로 종료한다(`wait_for` 타임아웃). 둘째, 부하 측정값(큐 길이·평균 대기 시간)에 따라 dispatcher 스레드가 워커를 추가하거나 정지 플래그를 set한다. 두 패턴 모두 *워커 수의 단조 감소를 보장*하는 것이 어렵다. 책의 권고는 풀 크기 조정을 *시작 시 1회*로 제한하고, 정말 변동 부하라면 *역할별로 풀을 분리*하라는 것이다(예: compute pool은 hardware_concurrency 고정, I/O pool은 대용량). 동적 풀의 구체 구현은 9.5에서 다룬다.

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

thread pool의 처리량은 *작업 큐의 구조*가 결정한다. 큐가 하나면 모든 워커가 그 한 큐를 두고 락을 다투기 때문에 코어 수가 늘어날수록 경합이 커진다. 큐를 워커별로 분리하면 경합이 줄지만 부하 균형이 깨진다. 두 가지 극단 사이의 절충이 작업 큐 전략의 본질이다.

### Global Queue vs Thread-Local Queue

![Global queue vs Thread-local queue](/images/blog/cpp-concurrency-in-action/diagrams/ch09-global-vs-local-queue.svg)

### Thread-Local Queue 요점

| 측면 | Global queue | Thread-local queue |
|------|--------------|--------------------|
| 락 경합 | 워커 수에 비례 | 낮음 |
| Locality | 작업이 임의 워커로 | 같은 워커가 연속 처리 |
| 부하 분산 | 자연스러움 | 한쪽에 쌓일 수 있음 |
| 처리량 | 코어 수가 늘수록 한계 | 코어 확장에 강함 |

Thread-local queue는 락 경합을 줄이지만 *부하 불균형* 문제를 낳는다. 다음 절의 work stealing이 이 문제의 표준 해법이다. Williams가 9.1.4에서 보이는 Listing 9.7이 정확히 이 통합 형태다.

## 9.3 Work Stealing

work stealing은 *부하 불균형*을 동적으로 해결하는 표준 기법이다. 각 워커는 자기 *전용 큐*를 가지고, 자기 큐가 비면 다른 워커의 큐 *뒤쪽*에서 작업을 *훔쳐 온다*. 큐의 앞쪽은 소유자만 쓰고 뒤쪽은 도둑이 쓰는 식으로 충돌 영역을 분리한다.

세 가지 이유로 work stealing이 표준이 되었다. 첫째, *동적*이다. 정적 분배와 달리 실제 작업 길이가 예측되지 않는 상황에서도 균형을 맞춘다. 둘째, *지역성에 친화적*이다. 소유자는 자기 큐의 LIFO 쪽을 쓰므로 가장 최근에 큐에 들어간 작업을 먼저 처리한다. 그 작업이 캐시에 남아 있을 가능성이 높다. 셋째, *경합이 적다*. 빈 큐만 도둑맞으므로 평소엔 큐가 락 없는 SPSC처럼 동작한다.

비유로 들면 *옆 직원의 미결 박스 뒤쪽에서 일감을 꺼내는* 것과 비슷하다. 자기 박스가 비었을 때만 옆 박스를 본다. 옆 직원이 *지금 보고 있는 일*은 박스 앞쪽에 있으니, 도둑은 *뒤쪽*에서 일을 가져간다. 그래야 옆 직원의 캐시 상태를 흩뜨리지 않는다.

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

### 책의 work-stealing 큐 (Listing 9.6)

Williams는 책의 9.1.4에서 단일 소유자 + 다중 도둑을 가정한 단순한 deque 래퍼를 보여 준다. 소유자는 *앞*(front)을 LIFO로 쓰고, 도둑은 *뒤*(back)에서 FIFO로 꺼낸다.

```cpp
class work_stealing_queue {
private:
    using data_type = function_wrapper;
    std::deque<data_type> the_queue_;
    mutable std::mutex the_mutex_;

public:
    work_stealing_queue() {}
    work_stealing_queue(const work_stealing_queue&) = delete;
    work_stealing_queue& operator=(const work_stealing_queue&) = delete;

    void push(data_type data) {
        std::lock_guard<std::mutex> lock(the_mutex_);
        the_queue_.push_front(std::move(data));
    }

    bool empty() const {
        std::lock_guard<std::mutex> lock(the_mutex_);
        return the_queue_.empty();
    }

    bool try_pop(data_type& res) {
        std::lock_guard<std::mutex> lock(the_mutex_);
        if (the_queue_.empty()) return false;
        res = std::move(the_queue_.front());
        the_queue_.pop_front();
        return true;
    }

    bool try_steal(data_type& res) {
        std::lock_guard<std::mutex> lock(the_mutex_);
        if (the_queue_.empty()) return false;
        res = std::move(the_queue_.back());
        the_queue_.pop_back();
        return true;
    }
};
```

소유자와 도둑이 *같은* 끝을 다투지 않으므로 락 경합이 줄어든다. 진짜 lock-free Chase-Lev deque로 가는 출발점이기도 하다.

### Per-thread queue 풀 (Listing 9.7, 9.8)

이제 풀이 워커마다 자신의 큐를 들고, 글로벌 큐는 fallback으로 둔다. 핵심은 `thread_local` 포인터로 각 워커가 자기 큐를 식별하는 것이다.

```cpp
class thread_pool {
    using task_type = function_wrapper;

    std::atomic_bool done_;
    threadsafe_queue<task_type> pool_work_queue_;
    std::vector<std::unique_ptr<work_stealing_queue>> queues_;
    std::vector<std::thread> threads_;
    join_threads joiner_;

    static thread_local work_stealing_queue* local_work_queue_;
    static thread_local unsigned my_index_;

    void worker_thread(unsigned my_index) {
        my_index_ = my_index;
        local_work_queue_ = queues_[my_index_].get();
        while (!done_) {
            run_pending_task();
        }
    }

    bool pop_task_from_local_queue(task_type& task) {
        return local_work_queue_ && local_work_queue_->try_pop(task);
    }

    bool pop_task_from_pool_queue(task_type& task) {
        return pool_work_queue_.try_pop(task);
    }

    bool pop_task_from_other_thread_queue(task_type& task) {
        for (unsigned i = 0; i < queues_.size(); ++i) {
            unsigned const index = (my_index_ + i + 1) % queues_.size();
            if (queues_[index]->try_steal(task)) return true;
        }
        return false;
    }

public:
    thread_pool() : done_(false), joiner_(threads_) {
        unsigned const thread_count = std::thread::hardware_concurrency();
        try {
            for (unsigned i = 0; i < thread_count; ++i) {
                queues_.push_back(
                    std::unique_ptr<work_stealing_queue>(new work_stealing_queue));
            }
            for (unsigned i = 0; i < thread_count; ++i) {
                threads_.emplace_back(&thread_pool::worker_thread, this, i);
            }
        } catch (...) {
            done_ = true;
            throw;
        }
    }

    ~thread_pool() { done_ = true; }

    template<typename FunctionType>
    std::future<typename std::invoke_result_t<FunctionType>>
    submit(FunctionType f) {
        using result_type = std::invoke_result_t<FunctionType>;
        std::packaged_task<result_type()> task(f);
        std::future<result_type> res(task.get_future());

        if (local_work_queue_) {
            local_work_queue_->push(std::move(task));
        } else {
            pool_work_queue_.push(std::move(task));
        }
        return res;
    }

    void run_pending_task() {
        task_type task;
        if (pop_task_from_local_queue(task) ||
            pop_task_from_pool_queue(task) ||
            pop_task_from_other_thread_queue(task)) {
            task();
        } else {
            std::this_thread::yield();
        }
    }
};
```

세 단계 우선순위가 핵심이다. *로컬 → 글로벌 → 도둑질* 순서로 작업을 찾는다. 풀 내부에서 `submit()`이 호출되면(분할 정복 재귀) 자기 로컬 큐에 push해 cache locality를 살린다. 외부 호출자는 글로벌 큐로 들어간다. 다른 워커가 일을 다 끝낸 경우에만 도둑질이 일어난다.

`run_pending_task()`는 *공개* 멤버 함수로 두어 풀 사용자가 자신이 제출한 future를 기다리는 동안 *다른 작업을 처리*할 수 있도록 한다. 이는 8장의 `parallel_quick_sort`에서 본 패턴이다.

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

책의 단순한 mutex 기반 구현은 강한 메모리 모델에서도 옳지만, 락 경합이 병목이 되기 쉽다. 실전에서는 Chase-Lev deque 같은 lock-free 변형이 쓰인다. 아이디어는 *bottom*은 소유자만 쓰고, *top*은 도둑끼리 CAS로 다투며, 큐가 거의 빌 때만 양쪽이 충돌하므로 그때만 CAS로 동기화한다는 것이다. Intel oneTBB, Java ForkJoinPool, Go runtime이 모두 이 계열을 변형해 쓴다. 상세 구현은 Chase·Lev 2005 논문과 Lê·Pop·Cohen·Nardelli 2013의 C++ memory model 분석을 참조하면 좋다.

## 9.4 스레드 인터럽트

interruption은 *진행 중인 스레드를 중단시키는* 메커니즘이다. C++의 thread는 OS 수준의 강제 종료(POSIX `pthread_cancel`, Win32 `TerminateThread`)를 안전하게 제공하지 않는다. 강제로 끊으면 락이 잡혀 있을 수도 있고, 자료구조가 일관성 없는 상태일 수도 있고, 스택의 RAII 객체가 풀리지 않을 수도 있다. 그래서 표준 접근은 *cooperative* 모델이다. 외부에서 *중단 요청*만 보내고, 스레드는 적절한 지점에서 그 요청을 확인해 스스로 정리한다.

비유로 들면 회사에서 직원에게 *퇴근 신호*를 보내는 것과 같다. "지금 즉시 일을 멈춰라"가 아니라 "다음 안전한 지점에서 일을 정리하고 퇴근하라"는 의미다. 직원은 적당한 시점(예: 한 트랜잭션을 끝낸 직후)에 신호를 확인하고 정리한다. 책상에 흩어진 자료를 모으고, 컴퓨터를 정상 종료하고 퇴근하는 순서다. 강제로 책상에서 끌어내지 않기 때문에 자료가 흩어진 상태로 남지 않는다.

C++20에서는 표준화된 형태로 `std::jthread`와 `std::stop_token`이 들어왔다. `jthread`는 소멸 시 자동으로 stop 요청을 보내고 join한다. 함수가 `stop_token`을 받으면 그 안에서 주기적으로 `stop_requested()`를 검사한다. 이 메커니즘이 책의 Listing 9.9가 직접 구현하는 것과 사실상 같은 모델이다.

### 책의 interruptible_thread (Listing 9.9)

C++20 이전, Williams는 책의 9.2에서 *cooperative* 인터럽션을 구현하는 방법을 직접 보여 준다. 핵심 아이디어는 *각 스레드별 플래그*를 `thread_local`로 두고, 인터럽트 가능한 대기 함수에서 그 플래그를 검사하는 것이다.

```cpp
class interrupt_flag {
public:
    void set();
    bool is_set() const;
};

thread_local interrupt_flag this_thread_interrupt_flag;

class interruptible_thread {
    std::thread internal_thread_;
    interrupt_flag* flag_;

public:
    template<typename FunctionType>
    interruptible_thread(FunctionType f) {
        std::promise<interrupt_flag*> p;

        internal_thread_ = std::thread([f, &p] {
            p.set_value(&this_thread_interrupt_flag);
            try {
                f();
            } catch (thread_interrupted const&) {
                // 인터럽션은 정상 종료
            }
        });

        flag_ = p.get_future().get();
    }

    void interrupt() {
        if (flag_) flag_->set();
    }

    void join() { internal_thread_.join(); }
    void detach() { internal_thread_.detach(); }
    bool joinable() const { return internal_thread_.joinable(); }
};
```

부모 스레드가 자식의 `thread_local` 플래그에 접근해야 하기 때문에 `std::promise<interrupt_flag*>`로 주소를 넘겨 받는다. 자식이 시작하자마자 자신의 플래그 주소를 promise에 set하고, 생성자가 future로 받아 저장한다.

### interruption_point (Listing 9.10)

작업 코드는 *interruption point*를 명시적으로 호출해야 한다. `thread_interrupted`는 일반 예외 타입이며, 워커 코드에서 catch하지 않으면 위의 `interruptible_thread` 생성자의 lambda가 잡는다.

```cpp
class thread_interrupted : public std::exception {
public:
    char const* what() const noexcept override {
        return "thread interrupted";
    }
};

void interruption_point() {
    if (this_thread_interrupt_flag.is_set()) {
        throw thread_interrupted();
    }
}

// 작업 코드에서
void long_task() {
    for (int i = 0; i < 1000000; ++i) {
        do_chunk(i);
        interruption_point();  // 주기적으로 검사
    }
}
```

이 접근의 한계는 *대기 중인 스레드는 응답하지 않는다*는 점이다. `condition_variable::wait()`로 잠들어 있으면 플래그를 검사할 기회가 없다. 책은 이 문제를 두 단계로 해결한다.

### 대기 중 인터럽트, condition_variable (Listing 9.11~9.12)

먼저 `interrupt_flag`를 *조건 변수 인지*로 확장한다. 인터럽트가 발생하면 현재 대기 중인 cv를 깨우도록 만든다.

```cpp
class interrupt_flag {
    std::atomic<bool> flag_;
    std::condition_variable* thread_cond_;
    std::mutex set_clear_mutex_;

public:
    interrupt_flag() : thread_cond_(nullptr) {}

    void set() {
        flag_.store(true, std::memory_order_relaxed);
        std::lock_guard<std::mutex> lk(set_clear_mutex_);
        if (thread_cond_) thread_cond_->notify_all();
    }

    bool is_set() const {
        return flag_.load(std::memory_order_relaxed);
    }

    void set_condition_variable(std::condition_variable& cv) {
        std::lock_guard<std::mutex> lk(set_clear_mutex_);
        thread_cond_ = &cv;
    }

    void clear_condition_variable() {
        std::lock_guard<std::mutex> lk(set_clear_mutex_);
        thread_cond_ = nullptr;
    }

    struct clear_cv_on_destruct {
        ~clear_cv_on_destruct() {
            this_thread_interrupt_flag.clear_condition_variable();
        }
    };
};
```

이제 인터럽트 가능한 wait를 작성할 수 있다. 핵심은 *짧은 타임아웃*으로 wait하고, 깨어날 때마다 플래그를 검사하는 것이다.

```cpp
void interruptible_wait(std::condition_variable& cv,
                        std::unique_lock<std::mutex>& lk) {
    interruption_point();
    this_thread_interrupt_flag.set_condition_variable(cv);
    interrupt_flag::clear_cv_on_destruct guard;

    interruption_point();
    cv.wait_for(lk, std::chrono::milliseconds(1));
    interruption_point();
}

template<typename Predicate>
void interruptible_wait(std::condition_variable& cv,
                        std::unique_lock<std::mutex>& lk,
                        Predicate pred) {
    interruption_point();
    this_thread_interrupt_flag.set_condition_variable(cv);
    interrupt_flag::clear_cv_on_destruct guard;
    while (!this_thread_interrupt_flag.is_set() && !pred()) {
        cv.wait_for(lk, std::chrono::milliseconds(1));
    }
    interruption_point();
}
```

1ms마다 일어나 플래그를 검사하므로 latency는 최대 1ms로 보장된다. 책은 이 polling이 부담스러우면 `condition_variable_any` 버전으로 lock 자체를 가로채는 더 정교한 구현을 9.2.4에서 보여 준다(Listing 9.13~9.14). 핵심 아이디어는 인터럽트 플래그가 들고 있는 *custom lockable*로 wait의 락을 감싸, set() 시점에 락을 가로채 cv를 깨우는 것이다.

### future 대기 인터럽트 (Listing 9.15)

`std::future::wait()`은 cv와 달리 외부에서 깨울 통로가 없다. Williams는 `wait_for`를 짧은 타임아웃으로 반복하며 플래그를 검사하는 방법을 제시한다.

```cpp
template<typename T>
void interruptible_wait(std::future<T>& uf) {
    while (!this_thread_interrupt_flag.is_set()) {
        if (uf.wait_for(std::chrono::milliseconds(1))
                == std::future_status::ready) {
            break;
        }
    }
    interruption_point();
}
```

응답성과 polling 오버헤드의 trade-off가 있다. 1ms로 설정하면 응답성은 좋지만 idle CPU 사용이 비어 있지 않다. 실시간 시스템이 아니라면 10ms~100ms 수준으로 늘리는 편이 일반적이다.

### Interruption point 가이드

interrupt를 받아들일 수 있는 지점은 작업 코드 안에 *명시적으로* 박아 두어야 한다.

```cpp
void worker() {
    while (true) {
        chunk_of_work();
        interruption_point();          // 일반 검사 지점

        std::unique_lock lk(mtx);
        interruptible_wait(cv, lk,     // 대기도 인터럽트 가능
                          [] { return ready; });

        auto fut = pool.submit(task);
        interruptible_wait(fut);       // future도 인터럽트 가능
    }
}
```

핵심 규칙은 *모든 긴 작업이 어떤 형태로든 점검 지점을 통과한다*는 것이다. 이를 어기면 인터럽트는 영원히 도달하지 못한다.

### C++20 std::stop_token

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

## 9.5 스레드 풀 고급 기능

기본 thread pool은 *FIFO 큐 + 동일 워커*가 전부다. 실제 시스템은 여기에 몇 가지 기능을 더 얹는다. 우선순위, 지연 실행, 동적 스레드 수 조정, exception 전파, future 회수 등이다.

우선순위는 *어떤 작업을 먼저 처리할지*를 명시적으로 통제한다. 예를 들어 사용자 입력 응답은 백그라운드 데이터 동기화보다 먼저 처리되어야 한다. 단순한 FIFO 큐 대신 priority queue를 쓰는 식으로 구현한다. 다만 우선순위가 잘못 설계되면 *낮은 우선순위 작업이 영원히 기다리는* starvation이 발생한다. aging(시간이 지나면 우선순위를 점차 올림) 같은 보정이 필요하다.

지연 실행과 schedule은 *언제 작업을 실행할지*를 제어한다. 일정 시간 후, 또는 특정 시각에 실행되는 작업이 그것이다. .NET의 `Timer`나 Java의 `ScheduledExecutorService`가 같은 기능을 제공한다.

동적 스레드 수 조정은 *부하에 따라 풀 크기를 조절*하는 것이다. 부하가 낮으면 일부 워커를 idle 상태로, 부하가 높으면 새 워커를 생성한다. ThreadPoolExecutor에 `corePoolSize`와 `maximumPoolSize`가 분리되어 있는 이유다.

다만 동적 조정에는 *진동(oscillation)*의 위험이 있다. 부하가 출렁이면 스레드 수도 함께 출렁여, 평균적으로는 OS 자원만 낭비하는 결과가 될 수 있다. *keepalive time*과 *최소 풀 크기*로 진동을 제어하는 것이 일반적인 절차다. 부하가 낮은 상태가 일정 시간 지속되어야 워커를 정리하고, 최소 크기 이하로는 줄이지 않는다.

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

스레드 친화성은 *어느 코어에서 어느 스레드를 실행할지*를 통제하는 메커니즘이다. 기본적으로 OS 스케줄러는 부하 균형을 위해 스레드를 코어 사이에서 이동시키지만, 이 이동이 캐시 효율을 떨어뜨릴 수 있다. 한 코어의 L1/L2 캐시에 워밍업된 데이터가, 스레드가 다른 코어로 이동하는 순간 그 캐시에서 *없어진* 셈이 된다.

비유로 풀면 *전담 작업대*를 배정하는 것과 같다. 한 작업자가 매번 다른 작업대로 옮겨 다니면 *자기 도구가 어디 있는지 매번 다시 찾아야* 한다. 한 작업대에 고정하면 도구가 손에 익은 자리에 있다. 캐시도 같다. 같은 코어를 계속 쓰면 같은 코어의 캐시가 *손에 익는다*.

다만 친화성을 함부로 쓰면 부작용이 크다. OS 스케줄러는 *부하 균형*과 *전력 관리*를 함께 고려한다. 친화성을 고정하면 그 결정을 무력화하는 셈이라, 잘못 쓰면 한 코어만 과부하 상태가 되거나, idle 상태에 들어가야 할 코어가 깨어 있어 전력 소모가 늘어난다. 친화성은 *지연 시간이 결정적*인 영역(고빈도 트레이딩, 실시간 신호 처리)에서 정밀한 측정 후에 사용하는 도구다.

NUMA(Non-Uniform Memory Access) 시스템에서는 친화성의 의미가 더 무겁다. 서로 다른 NUMA 노드의 메모리는 접근 지연이 *수 배* 차이 나므로, 스레드를 그 메모리가 있는 노드에 고정하는 것이 처리량에 큰 영향을 준다. `numactl`이나 `libnuma`로 명시적으로 제어한다.

jemalloc과 mimalloc 같은 현대 allocator는 NUMA를 인식해 *각 스레드가 자기 노드의 메모리를 할당받도록* 한다. 친화성과 allocator가 협력해야 NUMA의 이점이 실제 처리량으로 이어진다.

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

설계 시 가장 자주 잘못 결정되는 것이 *스레드 수*다. 코어 수와 같게 두는 것이 항상 정답은 아니다. 작업의 성격에 따라 답이 달라진다. CPU 바운드 작업이면 코어 수가 합리적인 출발점이지만, I/O 바운드 작업이면 그보다 훨씬 많은 스레드가 적절하다. I/O 대기 동안 CPU는 다른 스레드를 처리할 수 있기 때문이다.

또 하나 흔히 빠지는 함정은 *deadlock*이다. thread pool 안에서 다른 풀 작업의 `future.get()`을 기다리면, 모든 워커가 *서로의 결과를 기다리는* 상태에 빠질 수 있다. 풀 안에서 풀의 작업을 동기적으로 기다리지 않는 것이 안전 원칙이다.

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

9장의 흐름을 한 줄로 묶으면, 8장의 *알고리즘적 동시성*을 9장의 *운영 동시성*으로 옮기는 작업이다. 작업 단위와 분할은 8장이 정했지만, 그 작업을 누가, 어떤 큐에서, 언제 실행하고, 어떻게 중단시킬지가 9장의 주제다. production 시스템은 8장과 9장의 결합 위에서 동작한다. 어느 하나만 잘 짜도 부족하다.

특히 *cooperative cancellation*과 *bounded thread pool*은 production-grade 시스템의 필수 요건이다. 강제 종료는 데이터 손상을, 무제한 스레드 생성은 OOM과 컨텍스트 스위치 폭발을 만든다. 두 결정이 시스템의 *안정성 상한*을 정한다고 봐도 무방하다.

## 한국 개발자의 함정

**1. *thread pool 안에서 future.get() 호출***

- 같은 풀의 다른 작업 결과 기다림 → deadlock
- 풀 크기보다 많은 dependency chain이면 멈춤
- continuation / 별도 풀 / async-await 사용

**2. *모든 작업을 같은 풀에***

- CPU 바운드 + I/O 바운드 섞이면 성능 저하
- 풀을 *역할별*로 분리 (compute / io / background)
- I/O 풀은 더 크게

**3. *Work stealing이 만능***

- 매우 짧은 작업엔 오버헤드 큼
- locality가 중요한 작업엔 그대로가 더 빠름
- 보통 fork-join 패턴에 잘 맞음

**4. *Thread affinity = 항상 성능 향상***

- OS 스케줄러를 막아 오히려 손해 가능
- NUMA 시스템에서만 보통 이득
- 측정 + 실험 필요

**5. *stop_token을 무시***

- 협력적 취소 → 작업 코드가 *체크*해야 함
- 긴 계산 루프엔 주기적으로 stop_requested() 호출
- condition_variable_any로 wait 중단도 가능

## 현실 시스템에서의 thread 관리

9장의 코드는 *실제 production 시스템의 작동 원리*다. 어떤 라이브러리가 9장의 어떤 부분을 어떻게 구현했는지를 매핑해 두면 본문이 더 잘 들어온다.

| 시스템 | 핵심 기법 | 특징 |
|--------|----------|------|
| **Java ForkJoinPool** | work stealing + recursive task | divide-and-conquer 최적화 |
| **.NET ThreadPool** | global queue + local queue + work stealing | I/O completion 별도 처리 |
| **Tokio (Rust)** | async/await + work stealing | 수만 task를 적은 OS thread로 |
| **Go runtime scheduler** | M:N 매핑, GMP 모델 | goroutine 단위 스케줄링 |
| **Intel oneTBB** | work stealing + recursive split | grain-size 자동 조정 |

Java ForkJoinPool은 *분할-정복* 알고리즘에 최적화되어 있다. 각 task가 `compute()` 안에서 더 작은 task로 자기 자신을 쪼개 풀에 다시 던지는 패턴이다. work stealing은 새로 만든 task를 자기 큐에 push하고, 자기 큐가 비었을 때만 다른 워커의 큐를 도둑질한다.

.NET ThreadPool은 두 종류의 큐를 가진다. *글로벌 큐*는 외부에서 들어온 작업을 받고, *로컬 큐*는 워커가 자기 작업 안에서 만든 sub-task를 받는다. 워커는 로컬 큐 → 글로벌 큐 → 다른 워커의 로컬 큐 순으로 작업을 찾는다. 이 *우선순위 순서*가 캐시 지역성을 살리는 핵심이다.

Tokio는 *async/await 위*에 work stealing을 얹은 사례다. async task는 OS thread보다 가볍기 때문에 수만 개를 만들어도 메모리가 폭발하지 않는다. Tokio runtime은 코어 수만큼의 OS thread를 띄우고, async task를 그 thread들 위에 분배한다. C++의 thread pool과 다른 점은, task가 *await에서 suspend*되면 thread가 다음 task를 가져갈 수 있다는 점이다.

Go runtime scheduler는 *M:N 매핑*의 정수다. goroutine(G)을 OS thread(M) 위에서 logical processor(P)를 통해 스케줄링한다. P가 work stealing 큐의 단위가 되고, 코어 수와 비슷하게 설정된다. goroutine이 syscall로 블록되면 그 M은 다른 goroutine을 처리하지 못하지만, runtime이 새 M을 생성해 P를 넘겨받게 한다. 이 자동화가 Go의 동시성이 *쉽게 느껴지는* 이유다.

**이론 → 실무:**

- thread_pool             → Boost.Asio thread_pool, taskflow, BS::thread_pool
- work-stealing           → Intel oneTBB (구 TBB), rayon (Rust), ForkJoinPool (Java)
- priority pool           → 사용자 정의 또는 Asio
- stop_token (C++20)      → std::jthread, std::condition_variable_any
- thread affinity         → pthread_setaffinity_np, SetThreadAffinityMask
- NUMA 인지               → libnuma, jemalloc, mimalloc

**라이브러리:**

- C++: Boost.Asio, taskflow, oneTBB, Folly executors
- Rust: rayon (CPU 바운드), tokio (I/O — async-std는 사실상 유지 보수 중단)
- Java: ExecutorService, ForkJoinPool, CompletableFuture
- Go: goroutine + work-stealing runtime
- C#: TPL, Task.Run, async/await

**설계 결정:**

- 짧은 CPU 작업          → fixed-size pool (hardware_concurrency)
- I/O 바운드             → 큰 pool (수십~수백)
- 우선순위 필요          → priority_queue 기반 pool
- 부하 변동             → adaptive pool
- NUMA / 대규모         → NUMA-aware + thread affinity

## 자기 점검

- [ ] Global queue vs Thread-local queue 차이?
- [ ] Work stealing의 *bottom*과 *top* 비대칭 이유?
- [ ] Chase-Lev deque의 핵심 트릭?
- [ ] stop_token이 *cooperative*인 의미?
- [ ] thread pool 내 future.get() deadlock 시나리오?
- [ ] CPU bound와 I/O bound 풀 크기 차이?
- [ ] NUMA awareness가 필요한 시점?

## 다음 장 예고

다음 장에서는 C++17/20의 병렬 알고리즘을 다룬다. 실행 정책을 사용해 표준 알고리즘을 병렬로 실행하는 방법을 살펴본다.

## 관련 항목

- [Ch 2: Managing Threads](/blog/parallel/cpp-concurrency-in-action/chapter02-managing-threads)
- [Ch 8: Designing Concurrent Code](/blog/parallel/cpp-concurrency-in-action/chapter08-designing-concurrent-code)
- [Ch 10: Parallel Algorithms](/blog/parallel/cpp-concurrency-in-action/chapter10-parallel-algorithms)
- [AMP Ch 16: Work Stealing](/blog/parallel/parallel-principles/ch16-futures-scheduling-work-distribution)
- [AMP Ch 15: Priority Queues](/blog/parallel/parallel-principles/ch15-priority-queues)
