---
title: "Ch 4: Synchronizing concurrent operations"
date: 2026-05-20T04:00:00
description: "condition variable, future/promise/async, std::latch, std::barrier (C++20)."
tags: [C++, Concurrency, Condition Variable, Future, Latch, Barrier]
series: "C++ Concurrency in Action"
seriesOrder: 4
draft: false
---

뮤텍스는 데이터를 보호한다. 하지만 "이벤트가 발생할 때까지 대기"는 어떻게 할까? 이 장에서는 조건 변수, future/promise, 그리고 C++20의 latch와 barrier를 다룬다.

## 4.1 이벤트 대기

### 문제: 데이터가 준비될 때까지 대기

생산자-소비자 패턴을 생각해 보자.

```cpp
std::queue<Data> queue;
std::mutex mtx;

// 소비자: 데이터가 올 때까지 대기
void consumer() {
    while (true) {
        std::unique_lock<std::mutex> lock(mtx);
        if (!queue.empty()) {
            auto data = queue.front();
            queue.pop();
            lock.unlock();
            process(data);
        }
    }
}
```

**문제: busy waiting.** 큐가 비어 있어도 계속 락을 잡고 검사한다. CPU를 낭비한다.

### 나쁜 해결: sleep

```cpp
void consumer() {
    while (true) {
        std::unique_lock<std::mutex> lock(mtx);
        if (!queue.empty()) {
            // ...
        } else {
            lock.unlock();
            std::this_thread::sleep_for(100ms);  // 대기
        }
    }
}
```

**문제:**
- 데이터가 들어와도 100ms까지 기다릴 수 있다 (지연)
- 너무 짧은 sleep은 여전히 CPU 낭비
- 최적의 sleep 시간을 알 수 없다

### 올바른 해결: condition_variable

```cpp
std::condition_variable cv;

void consumer() {
    while (true) {
        std::unique_lock<std::mutex> lock(mtx);
        cv.wait(lock, [] { return !queue.empty(); });  // 조건 만족까지 대기
        auto data = queue.front();
        queue.pop();
        lock.unlock();
        process(data);
    }
}

void producer(Data data) {
    {
        std::lock_guard<std::mutex> lock(mtx);
        queue.push(data);
    }
    cv.notify_one();  // 대기 중인 스레드 깨우기
}
```

## 4.2 C11 조건 변수

C11은 `<threads.h>`에 조건 변수를 제공한다.

### C11 조건 변수 기본

```c
#include <stdio.h>
#include <threads.h>
#include <stdbool.h>

mtx_t mtx;
cnd_t cnd;
bool ready = false;

int waiter(void* arg) {
    (void)arg;
    mtx_lock(&mtx);
    while (!ready) {
        cnd_wait(&cnd, &mtx);  // 락 해제 + 대기 + 락 재획득
    }
    printf("Condition met!\n");
    mtx_unlock(&mtx);
    return 0;
}

int setter(void* arg) {
    (void)arg;
    mtx_lock(&mtx);
    ready = true;
    mtx_unlock(&mtx);
    cnd_signal(&cnd);  // 하나 깨움
    return 0;
}

int main(void) {
    mtx_init(&mtx, mtx_plain);
    cnd_init(&cnd);

    thrd_t t1, t2;
    thrd_create(&t1, waiter, NULL);
    thrd_create(&t2, setter, NULL);

    thrd_join(t1, NULL);
    thrd_join(t2, NULL);

    mtx_destroy(&mtx);
    cnd_destroy(&cnd);
    return 0;
}
```

### C11 vs C++11 조건 변수 비교

| 기능 | C11 | C++11 |
|------|-----|-------|
| 타입 | `cnd_t` | `std::condition_variable` |
| 초기화 | `cnd_init(&cnd)` | 기본 생성자 |
| 대기 | `cnd_wait(&cnd, &mtx)` | `cv.wait(lock)` |
| 시간 제한 대기 | `cnd_timedwait(&cnd, &mtx, &ts)` | `cv.wait_for(lock, duration)` |
| 하나 깨움 | `cnd_signal(&cnd)` | `cv.notify_one()` |
| 모두 깨움 | `cnd_broadcast(&cnd)` | `cv.notify_all()` |
| 소멸 | `cnd_destroy(&cnd)` | 소멸자 |

### C11 시간 제한 대기

```c
#include <time.h>

// 1초 타임아웃
struct timespec ts;
timespec_get(&ts, TIME_UTC);
ts.tv_sec += 1;

mtx_lock(&mtx);
int result = cnd_timedwait(&cnd, &mtx, &ts);
if (result == thrd_timedout) {
    // 타임아웃
} else if (result == thrd_success) {
    // 조건 충족
}
mtx_unlock(&mtx);
```

### C11 생산자-소비자 패턴

```c
#include <stdio.h>
#include <threads.h>
#include <stdbool.h>

#define QUEUE_SIZE 10

typedef struct {
    int data[QUEUE_SIZE];
    int head, tail, count;
    mtx_t mtx;
    cnd_t not_empty;
    cnd_t not_full;
} Queue;

void queue_init(Queue* q) {
    q->head = q->tail = q->count = 0;
    mtx_init(&q->mtx, mtx_plain);
    cnd_init(&q->not_empty);
    cnd_init(&q->not_full);
}

void queue_push(Queue* q, int value) {
    mtx_lock(&q->mtx);
    while (q->count == QUEUE_SIZE) {
        cnd_wait(&q->not_full, &q->mtx);
    }
    q->data[q->tail] = value;
    q->tail = (q->tail + 1) % QUEUE_SIZE;
    q->count++;
    cnd_signal(&q->not_empty);
    mtx_unlock(&q->mtx);
}

int queue_pop(Queue* q) {
    mtx_lock(&q->mtx);
    while (q->count == 0) {
        cnd_wait(&q->not_empty, &q->mtx);
    }
    int value = q->data[q->head];
    q->head = (q->head + 1) % QUEUE_SIZE;
    q->count--;
    cnd_signal(&q->not_full);
    mtx_unlock(&q->mtx);
    return value;
}
```

> **참고:** C11은 `std::future`, `std::promise`, `std::async`에 해당하는 기능이 없다. C에서 비동기 결과 전달이 필요하면 조건 변수와 공유 변수를 조합하거나 서드파티 라이브러리를 사용해야 한다.

## 4.3 std::condition_variable

![condition_variable 시퀀스](/images/blog/parallel/diagrams/condition-variable-sequence.svg)

### 기본 구조

```cpp
#include <condition_variable>

std::mutex mtx;
std::condition_variable cv;
bool ready = false;

void waiter() {
    std::unique_lock<std::mutex> lock(mtx);
    cv.wait(lock, [] { return ready; });
    // ready == true 일 때 진행
}

void setter() {
    {
        std::lock_guard<std::mutex> lock(mtx);
        ready = true;
    }
    cv.notify_one();
}
```

### wait의 동작

```cpp
cv.wait(lock, predicate);
```

다음과 동등하다:

```cpp
while (!predicate()) {
    cv.wait(lock);  // lock 해제 + 대기 + 깨어나면 lock 재획득
}
```

**핵심:** `wait`은 락을 **해제한 상태**로 대기한다. 깨어나면 다시 락을 획득한다.

### Spurious Wakeup

조건이 만족되지 않았는데도 깨어날 수 있다. **가짜 깨어남(spurious wakeup)**이다.

```cpp
// 위험: predicate 없는 wait
cv.wait(lock);  // 💥 spurious wakeup 가능

// 안전: predicate와 함께
cv.wait(lock, [] { return condition; });
```

**항상 predicate를 사용하라.** 표준이 spurious wakeup을 허용하기 때문이다.

### notify_one vs notify_all

| 함수 | 동작 |
|------|------|
| `notify_one()` | 대기 중인 스레드 **하나**를 깨움 |
| `notify_all()` | 대기 중인 스레드 **모두**를 깨움 |

```cpp
// 생산자-소비자 (1:1): notify_one
cv.notify_one();

// 브로드캐스트 (설정 변경 알림): notify_all
cv.notify_all();
```

하나만 처리할 작업이면 `notify_one`. 모두가 확인해야 할 상태 변화면 `notify_all`.

### wait_for / wait_until

타임아웃을 지정할 수 있다.

```cpp
std::unique_lock<std::mutex> lock(mtx);

// 최대 1초 대기
if (cv.wait_for(lock, 1s, [] { return ready; })) {
    // 조건 만족
} else {
    // 타임아웃
}

// 특정 시각까지 대기
auto deadline = std::chrono::steady_clock::now() + 5s;
if (cv.wait_until(lock, deadline, [] { return ready; })) {
    // 조건 만족
} else {
    // 타임아웃
}
```

## 4.4 std::future와 std::promise

### 일회성 결과 전달

조건 변수는 "조건"을 알린다. future/promise는 **값**을 전달한다.

```cpp
#include <future>

std::promise<int> prom;
std::future<int> fut = prom.get_future();

// 생산자 스레드
std::thread producer([&prom] {
    int result = expensive_computation();
    prom.set_value(result);  // 값 전달
});

// 소비자 (메인 스레드)
int value = fut.get();  // 결과 대기 및 수신

producer.join();
```

### std::promise

`promise`는 **값을 설정하는 쪽**이다.

```cpp
std::promise<std::string> prom;

// 값 설정
prom.set_value("Hello");

// 또는 예외 설정
prom.set_exception(std::make_exception_ptr(std::runtime_error("Error")));
```

`set_value` 또는 `set_exception`은 **한 번만** 호출할 수 있다.

### std::future

`future`는 **값을 받는 쪽**이다.

```cpp
std::future<int> fut = prom.get_future();

// 결과 대기 및 수신 (블로킹)
int value = fut.get();  // 값 또는 예외

// 상태 확인 (논블로킹)
if (fut.wait_for(0s) == std::future_status::ready) {
    // 준비됨
}
```

**`get()`은 한 번만 호출 가능.** 두 번 호출하면 UB.

### std::shared_future

여러 스레드가 같은 결과를 받아야 하면 `shared_future`를 사용한다.

```cpp
std::promise<int> prom;
std::shared_future<int> sfut = prom.get_future().share();

// 여러 스레드에서 get() 가능
std::thread t1([sfut] { int v = sfut.get(); });
std::thread t2([sfut] { int v = sfut.get(); });  // OK
```

## 4.5 std::async

### 비동기 작업 실행

`std::async`는 함수를 비동기로 실행하고 future를 반환한다.

```cpp
#include <future>

std::future<int> fut = std::async([] {
    return expensive_computation();
});

// 다른 작업 수행
do_other_work();

// 결과 수신
int result = fut.get();
```

### launch policy

```cpp
// 새 스레드에서 실행 (즉시)
auto fut1 = std::async(std::launch::async, task);

// 지연 실행 (get() 호출 시)
auto fut2 = std::async(std::launch::deferred, task);

// 구현에 맡김 (기본값)
auto fut3 = std::async(std::launch::async | std::launch::deferred, task);
```

**기본값은 구현 정의.** 반드시 새 스레드가 필요하면 `std::launch::async`를 명시하라.

### async의 함정: future 소멸자

`std::async`가 반환한 future의 소멸자는 **블로킹**한다.

```cpp
void fire_and_forget() {
    std::async(std::launch::async, long_task);
    // 💥 future 소멸자가 long_task 완료까지 대기!
}

void correct() {
    auto fut = std::async(std::launch::async, long_task);
    // ...
    fut.get();  // 명시적 대기
}
```

## 4.6 std::packaged_task

### 호출 가능 객체를 future와 연결

```cpp
#include <future>

std::packaged_task<int(int, int)> task([](int a, int b) {
    return a + b;
});

std::future<int> fut = task.get_future();

// 나중에 실행
std::thread t(std::move(task), 2, 3);
t.join();

int result = fut.get();  // 5
```

`packaged_task`는 작업을 **나중에, 다른 곳에서** 실행할 때 유용하다. GUI 스레드에서 백그라운드 작업을 큐에 넣는 패턴에 자주 쓰인다.

### async vs packaged_task

| 특성 | std::async | std::packaged_task |
|------|------------|-------------------|
| 실행 시점 | 호출 즉시 (또는 deferred) | 명시적 호출 시 |
| 실행 위치 | 라이브러리가 결정 | 호출하는 곳 |
| 소유권 | 내부 관리 | 사용자가 관리 |

## 4.7 std::latch (C++20)

### 일회성 동기화 지점

`latch`는 카운터가 0이 될 때까지 대기한다. **일회용**이다.

```cpp
#include <latch>

std::latch done(3);  // 3개 작업

void worker(int id) {
    do_work(id);
    done.count_down();  // 완료 신호
}

int main() {
    std::thread t1(worker, 1);
    std::thread t2(worker, 2);
    std::thread t3(worker, 3);

    done.wait();  // 3개 모두 완료까지 대기
    std::cout << "All done!\n";

    t1.join(); t2.join(); t3.join();
}
```

### arrive_and_wait

```cpp
void worker_sync() {
    do_work();
    done.arrive_and_wait();  // count_down + wait
    // 모든 워커가 여기 도달한 후 진행
}
```

## 4.8 std::barrier (C++20)

### 재사용 가능한 동기화 지점

`barrier`는 `latch`와 달리 **재사용** 가능하다. 반복적인 동기화에 적합하다.

```cpp
#include <barrier>

std::barrier sync_point(3, [] {
    std::cout << "Phase complete!\n";  // 콜백 (옵션)
});

void worker(int id) {
    for (int phase = 0; phase < 5; ++phase) {
        do_work(id, phase);
        sync_point.arrive_and_wait();  // 모두 도달까지 대기
    }
}

int main() {
    std::thread t1(worker, 1);
    std::thread t2(worker, 2);
    std::thread t3(worker, 3);

    t1.join(); t2.join(); t3.join();
}
```

출력:
```
Phase complete!
Phase complete!
Phase complete!
Phase complete!
Phase complete!
```

### latch vs barrier

| 특성 | std::latch | std::barrier |
|------|-----------|-------------|
| 재사용 | 불가 | 가능 |
| 콜백 | 없음 | 있음 |
| 용도 | 일회성 (초기화 완료) | 반복 (페이즈 동기화) |

## 4.9 std::counting_semaphore (C++20)

### 제한된 동시 접근

세마포어는 N개까지 동시 접근을 허용한다.

```cpp
#include <semaphore>

std::counting_semaphore<4> sem(4);  // 최대 4개 동시 접근

void limited_access() {
    sem.acquire();  // 획득 (또는 대기)
    // 최대 4개 스레드가 여기 동시에
    do_work();
    sem.release();  // 반환
}
```

### binary_semaphore

`std::binary_semaphore`는 최대 1인 세마포어다. 뮤텍스와 유사하지만 다른 스레드가 release할 수 있다.

```cpp
std::binary_semaphore signal(0);  // 초기값 0

void waiter() {
    signal.acquire();  // 0 → 대기
    std::cout << "Signaled!\n";
}

void signaler() {
    signal.release();  // 0 → 1, waiter 깨어남
}
```

## 4.10 동기화 패턴 정리

### 패턴 선택 가이드

| 요구사항 | 도구 |
|----------|------|
| 공유 데이터 보호 | `mutex` + `lock_guard` |
| 조건 만족까지 대기 | `condition_variable` |
| 일회성 결과 전달 | `future` / `promise` |
| 비동기 함수 호출 | `async` |
| 작업 큐 | `packaged_task` |
| 일회성 동기화 (N개 대기) | `latch` (C++20) |
| 반복 동기화 (페이즈) | `barrier` (C++20) |
| N개 동시 접근 제한 | `semaphore` (C++20) |

### 생산자-소비자 완전한 예제

```cpp
#include <queue>
#include <mutex>
#include <condition_variable>
#include <optional>

template<typename T>
class threadsafe_queue {
    std::queue<T> queue_;
    mutable std::mutex mtx_;
    std::condition_variable cv_;
    bool shutdown_ = false;

public:
    void push(T value) {
        {
            std::lock_guard lock(mtx_);
            queue_.push(std::move(value));
        }
        cv_.notify_one();
    }

    std::optional<T> pop() {
        std::unique_lock lock(mtx_);
        cv_.wait(lock, [this] {
            return !queue_.empty() || shutdown_;
        });
        if (shutdown_ && queue_.empty()) {
            return std::nullopt;
        }
        T value = std::move(queue_.front());
        queue_.pop();
        return value;
    }

    void shutdown() {
        {
            std::lock_guard lock(mtx_);
            shutdown_ = true;
        }
        cv_.notify_all();
    }
};
```

## 정리

- **조건 변수**는 "조건 만족까지 대기"를 효율적으로 구현한다
- `wait`에는 **항상 predicate를 사용**하라 (spurious wakeup 방지)
- **future/promise**는 일회성 결과를 전달한다
- `std::async`는 비동기 함수 호출의 가장 간단한 방법이다
- **C++20 latch**는 일회성, **barrier**는 반복적 동기화에 사용한다
- **세마포어**는 N개 동시 접근을 제한한다

## 한국 개발자의 함정

```
1. *cv.wait(lock) — predicate 없이*
   - Spurious wakeup으로 깨어남
   - 조건 확인 없이 진행 → race
   - 반드시 wait(lock, predicate)

2. *cv.notify_one()을 락 안에서 호출*
   - 동작은 함, 그러나 비효율
   - 깨어난 스레드가 즉시 락 못 잡음
   - notify는 락 *해제 후*가 보통 좋음

3. *fut.get()을 두 번 호출*
   - 두 번째는 UB
   - shared_future로 옮기거나 한 번만
   - 결과 보관은 별도 변수에

4. *std::async = 새 스레드*라는 오해
   - 기본 launch policy는 구현 정의
   - launch::async 명시 안 하면 deferred 가능
   - 명시적으로 launch::async 사용

5. *std::async future 소멸자 = non-blocking*
   - async가 반환한 future는 소멸자에서 *블로킹*
   - fire-and-forget으로 쓸 수 없음
   - 진짜 fire-and-forget은 jthread 또는 detached thread
```

## 실무 적용

```
이론 → 실무:
- condition_variable     → pthread_cond_t
- future / promise        → CompletableFuture (Java), Promise (JS), Future (Rust)
- packaged_task           → 작업 큐 / 스레드 풀의 task 단위
- async                   → 단발성 비동기, 단 launch policy 주의
- latch (C++20)           → CountDownLatch (Java), sync.WaitGroup (Go)
- barrier (C++20)         → CyclicBarrier (Java), pthread_barrier_t
- counting_semaphore      → Semaphore (Java), sem_t

언제 무엇:
- 결과 받기            → future / promise
- 이벤트 통보         → condition_variable
- 작업 분배           → packaged_task + thread pool
- N개 작업 완료 대기  → latch
- 반복 phase 동기화   → barrier
- 자원 풀 제한        → counting_semaphore

흔한 패턴:
- Producer-Consumer  → queue + mutex + condition_variable
- Fan-out/Fan-in     → async + future + when_all (boost / Folly)
- Pipeline           → 여러 단계의 thread + queue
```

## 자기 점검

```
□ Spurious wakeup의 정의와 대응?
□ notify_one과 notify_all 사용 자리?
□ wait_for의 반환값 의미?
□ promise.set_value를 두 번 호출하면?
□ async의 launch policy 영향?
□ async가 반환한 future의 *소멸자 블로킹*?
□ latch와 barrier 차이?
```

## 다음 장 예고

다음 장에서는 C++ 메모리 모델을 다룬다. `std::atomic`, memory order, happens-before 관계를 이해하면 락 없이도 스레드 안전한 코드를 작성할 수 있다.

## 관련 항목

- [Ch 3: Sharing Data](/blog/parallel/cpp-concurrency-in-action/chapter03-sharing-data-between-threads)
- [Ch 5: Memory Model](/blog/parallel/cpp-concurrency-in-action/chapter05-the-cpp-memory-model-and-operations-on-atomic-types)
- [AMP Ch 8: Monitors](/blog/parallel/parallel-principles/ch08-monitors-and-blocking-synchronization)
- [AMP Ch 17: Barriers](/blog/parallel/parallel-principles/ch17-barriers)
- [AMP Ch 16: Futures](/blog/parallel/parallel-principles/ch16-futures-scheduling-work-distribution)
