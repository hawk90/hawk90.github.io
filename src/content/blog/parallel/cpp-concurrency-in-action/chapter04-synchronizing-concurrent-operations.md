---
title: "Ch 4: Synchronizing concurrent operations"
date: 2026-05-06T04:00:00
description: "condition variable, future/promise/async, std::latch, std::barrier (C++20)."
tags: [C++, Concurrency, Condition Variable, Future, Latch, Barrier]
series: "C++ Concurrency in Action"
seriesOrder: 4
draft: false
---

뮤텍스는 데이터를 보호한다. 하지만 "이벤트가 발생할 때까지 대기"는 어떻게 할까? 이 장에서는 조건 변수, future/promise, 그리고 C++20의 latch와 barrier를 다룬다.

## 4장이 푸는 단 하나의 문제

3장이 *한 메모리 위치를 둘 이상이 동시에 만질 때* 무엇이 깨지는가에 답했다면, 4장은 다른 방향의 문제다. **한 스레드가 다른 스레드의 일이 끝나기를 기다리는** 방법이다. 락은 *접근의 충돌*을 해결하지만 *시간 차의 협력*을 해결하지 않는다. 생산자가 데이터를 *언제* 넣었는지, 비동기 작업이 *언제* 끝났는지, 모든 워커가 *언제* 한 단계에 도달했는지 — 이런 질문에 답하는 도구가 이 장의 주제다.

이 장을 관통하는 도구는 셋이다. condition variable, future/promise/packaged_task/async, 그리고 C++20의 latch/barrier. 책의 4.1~4.4를 차례로 따라가되, 각각이 *어떤 종류의 기다림*을 표현하는지에 초점을 둔다.

### 비유로 잡는 도구의 역할

세 도구는 일상에서 잘 알려진 메타포로 환원된다. 코드를 보기 전에 그림으로 잡아 두면 API의 의도가 분명해진다.

| 도구 | 비유 | 본질 |
|------|------|------|
| `condition_variable` | 알람 시계 — 조건이 맞으면 깨워 준다 | 술어가 참이 될 때까지 대기/통보 |
| `future` / `promise` | 음식 주문 진동벨 — 결과는 *나중에* 한 번 도착 | 일회성의 비동기 결과 채널 |
| `packaged_task` | 음식 주문서 — 만들어 두면 *호출만으로* 실행 | 호출 가능 객체를 future로 감싸 둔다 |
| `async` | 주방에 주문 — 누가/언제 만들지는 정책이 정한다 | 함수 호출 → future. launch policy로 동기·비동기 선택 |
| `latch` (C++20) | 카운트다운 출발선 — 0에 도달하면 모두 출발 | 일회성 N→0 카운트다운 |
| `barrier` (C++20) | 마라톤의 구간 출발선 — 모두 모이면 다음 구간 시작 | 재사용 가능한 페이즈 동기화 |

알람 시계는 *조건의 변화*를 본다. 진동벨은 *값의 도착*을 본다. 카운트다운과 구간 출발선은 *모두 모이는 시점*을 본다. 같은 "대기"라도 *무엇을* 기다리느냐가 다르다.

### 시스템에서 만나는 같은 패턴

C++의 이름이 낯설어도, 실세계 시스템은 이미 같은 도구를 다른 이름으로 쓰고 있다. 라이브러리 코드를 읽거나 다른 언어에서 옮겨 올 때, 이름의 매핑만 잡혀 있으면 의도를 빠르게 추적할 수 있다.

- **gRPC async API**: `CompletionQueue::Next`가 "이 RPC가 끝났는가"를 future-style로 폴링한다. 내부적으로 컨디션 변수와 큐로 구현된다.
- **Boost.Asio future-based handlers**: `boost::asio::use_future`로 비동기 I/O 완료를 `std::future`로 받는다. `packaged_task`와 사실상 같은 모양이다.
- **Folly futures**: `folly::Future<T>`/`Promise<T>`는 표준 `future`/`promise`의 상위 호환이다. `.then` 연결, 예외 전파, executor 바인딩까지 같은 모델 위에서 확장된다.
- **Java `CountDownLatch` / `CyclicBarrier`**: 이름까지 그대로다. C++20 `latch`/`barrier`가 의도적으로 같은 어휘를 채택했다.
- **Linux `pthread_cond_t`**: condition variable의 원형. `pthread_cond_wait`가 mutex를 *원자적으로* 풀고 잠드는 동작이 C++ `wait`의 모델이다.

이 장의 코드는 위 라이브러리 어디에 가져다 놓아도 같은 의도가 통한다. *언어와 라이브러리는 어휘가 다를 뿐, 기다림의 종류는 정해져 있다*.

### 도구 선택의 결정 규칙

세 도구는 영역이 겹친다. 무엇으로든 똑같은 결과를 만들 수는 있지만, *의도가 가장 잘 보이는 도구*가 따로 있다. 다음 결정 규칙을 머리에 두고 본문을 읽으면 코드의 선택이 자연스럽게 납득된다.

1. *반복적으로* 조건의 변화를 기다리고, 통보의 횟수가 정해져 있지 않다 → **condition variable**.
2. 일회성으로 *값 한 개*가 도착하면 끝이다 → **future / promise**.
3. 호출 가능 객체를 미리 *포장*해서, 다른 곳에서 실행시키고 싶다 → **packaged_task**.
4. 결과는 일회성이지만 *어디서 실행할지는 정책에 맡긴다* → **async**.
5. N개의 스레드가 한 시점에 *모두 도달*해야 다음으로 갈 수 있다, 그 시점은 *한 번뿐*이다 → **latch**.
6. 같은 동기화를 *페이즈마다 반복*해야 한다 → **barrier**.

규칙은 단순하지만 실수도 단순한 곳에서 일어난다. condition variable로 일회성 결과를 보내는 코드, future를 반복 통보 채널로 오용하는 코드가 흔하다. 본문은 각 절에서 *왜 다른 도구가 더 자연스러운가*를 짚는다.

### 같은 문제 — 다른 도구의 비교

위 규칙을 한 그림으로 묶기 위해, 같은 시나리오를 세 도구로 각각 표현해 본다. 시나리오는 단순하다. *워커 스레드가 결과 하나를 만든다, 메인이 그 값을 받는다*.

```cpp
// (1) condition variable로 표현 — 결과를 "통보"로 다룬다
std::mutex mtx;
std::condition_variable cv;
std::optional<int> result;

// 워커
{
    std::lock_guard<std::mutex> lk(mtx);
    result = 42;
}
cv.notify_one();

// 메인
std::unique_lock<std::mutex> lk(mtx);
cv.wait(lk, [&]{ return result.has_value(); });
int v = *result;
```

```cpp
// (2) future/promise — 결과를 "값"으로 다룬다
std::promise<int> p;
auto f = p.get_future();

// 워커
p.set_value(42);

// 메인
int v = f.get();  // 블로킹, 정확히 한 번
```

```cpp
// (3) async — "어디서 실행할지"는 정책에 맡긴다
auto f = std::async(std::launch::async, []{ return 42; });
int v = f.get();
```

세 코드의 *코드량*과 *실수의 여지*를 보면 도구의 차이가 분명하다. (1)은 술어와 락이 필요하고, spurious wakeup을 신경 써야 한다. (2)는 일회성 결과에 정확히 맞는다. (3)은 *실행 위치*까지 정책으로 추상화한다. 일회성 결과라면 (1)을 쓸 이유가 없다. 본문은 이 결정을 각 절에서 다시 짚는다.

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

### Listing 4.1: 데이터 준비 알림

책의 첫 예시는 두 스레드 간 데이터 준비 알림 패턴이다. 생산자가 데이터 청크를 큐에 넣고 소비자가 청크 단위로 처리한다.

```cpp
std::mutex mut;
std::queue<data_chunk> data_queue;
std::condition_variable data_cond;

void data_preparation_thread() {
    while (more_data_to_prepare()) {
        data_chunk const data = prepare_data();
        {
            std::lock_guard<std::mutex> lk(mut);
            data_queue.push(data);
        }
        data_cond.notify_one();
    }
}

void data_processing_thread() {
    while (true) {
        std::unique_lock<std::mutex> lk(mut);
        data_cond.wait(lk, [] { return !data_queue.empty(); });
        data_chunk data = data_queue.front();
        data_queue.pop();
        lk.unlock();  // 처리 전 락 해제
        process(data);
        if (is_last_chunk(data)) break;
    }
}
```

세 가지 관용을 짚어 둔다. 첫째, 생산자는 `lock_guard`로 짧게 잡고 즉시 풀어 `notify_one`을 호출한다. 락을 잡은 채로 알리면 깨어난 소비자가 즉시 락을 잡지 못해 한 번 더 컨텍스트 스위치가 발생한다. 둘째, 소비자는 `unique_lock`을 써야 한다. `wait`이 내부적으로 `unlock`/`lock`을 호출하므로 `lock_guard`로는 동작하지 않는다. 셋째, `process(data)` 호출 전에 명시적으로 `lk.unlock()`을 호출해 처리 중에는 큐를 잠그지 않는다.

### 왜 unique_lock인가

`std::condition_variable::wait`은 락을 *조건적*으로 해제하고 다시 획득해야 한다. `lock_guard`는 RAII만 보장하고 중간에 unlock/lock을 노출하지 않으므로 `wait`이 요구하는 인터페이스를 만족시키지 못한다. 책은 *항상* `unique_lock<std::mutex>`을 쓰라고 단정한다. 비용은 `lock_guard`보다 약간 큰 상태 비트를 들고 다니는 정도다.

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

spurious wakeup은 구현이 효율적인 알림을 위해 허용한 *합법적인* 동작이다. predicate를 검사해 거짓이면 다시 `wait`을 호출하면 무해하다. predicate는 wait이 *몇 번이고* 호출할 수 있다고 가정해야 한다. 부수효과(예: `++check_count_`)를 두면 누적되며, 매 호출마다 락은 잡혀 있으니 보호된 변수를 안전하게 읽을 수 있다.

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

#### 선택 기준

| 상황 | 선택 |
|------|------|
| 큐에 항목 1개 추가, 소비자 N | `notify_one` — 한 명만 일감을 가져갈 수 있다 |
| 큐에 K개 한꺼번에 추가 | K번의 `notify_one` 또는 `notify_all` |
| 종료(shutdown) 플래그 변경 | `notify_all` — 모두가 상태를 재검사해야 한다 |
| writer 끝나고 reader 다수 풀어주기 | `notify_all` |
| 캐시 무효화 / 설정 reload | `notify_all` |
| 단일 결과(future-like 신호) | `notify_one` (대기 1명 보장 시) |

`notify_all`을 남발하면 *thundering herd*가 발생한다. N개 스레드가 동시에 깨어나 락을 두고 경합하고, 그중 한 명만 진행하고 나머지는 predicate 거짓으로 다시 `wait`으로 돌아간다. **predicate를 만족시킬 수 있는 스레드가 둘 이상**인 경우에만 `notify_all`을 쓴다.

`notify_one`은 락을 *해제한 뒤* 호출하는 것이 일반적으로 더 빠르다. 락 안에서 호출하면 깨어난 소비자가 즉시 락을 잡지 못해 한 번 더 컨텍스트 스위치가 발생할 수 있다(일부 구현은 `wait_morphing`으로 동등 비용 처리).

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

### chrono 시계 선택

C++ chrono는 세 종류의 시계를 제공한다. *시간 제한 대기*에서 어떤 시계를 쓰느냐가 정확성을 결정한다.

| 시계 | 단조성 | 사용처 |
|------|--------|--------|
| `std::chrono::steady_clock` | 단조 증가 (조정 불가) | **타임아웃, 경과 시간 측정** |
| `std::chrono::system_clock` | 시스템 시각, 조정 가능 | 절대 시각, 로그, 캘린더 |
| `std::chrono::high_resolution_clock` | 구현 정의 (대개 steady의 별칭) | 마이크로벤치마크 |

`system_clock`은 사용자가 시간을 바꾸거나 NTP sync로 점프할 수 있어 5초 타임아웃이 5시간 또는 즉시 반환으로 변질된다. 타임아웃에는 *반드시* `steady_clock`을 쓴다.

#### wait_for vs wait_until

`wait_for`는 내부적으로 *현재 시각 + duration*으로 변환해 `wait_until`을 호출한다. *루프에서 누적 타임아웃을 강제*할 때는 마감 시각을 고정한 `wait_until`이 안전하다.

```cpp
// 회피: spurious wakeup마다 500ms씩 다시 시작
while (!pred())
    if (cv.wait_for(lk, 500ms) == std::cv_status::timeout) return false;

// Good: 전체 마감 시각 고정
auto deadline = std::chrono::steady_clock::now() + 500ms;
while (!pred())
    if (cv.wait_until(lk, deadline) == std::cv_status::timeout) return false;
```

predicate 버전(`wait_until(lk, deadline, pred)`)을 쓰면 위 루프를 한 줄로 줄일 수 있다.

#### _for/_until API 일관성

| API | duration | time_point |
|-----|----------|-----------|
| `condition_variable::wait` | `wait_for` | `wait_until` |
| `future::wait` | `wait_for` | `wait_until` |
| `this_thread::sleep` | `sleep_for` | `sleep_until` |
| `mutex::lock` | `try_lock_for` | `try_lock_until` |

future의 `wait_for`는 `future_status::{ready, timeout, deferred}`를 반환한다. `deferred` 상태에서 폴링 루프를 그대로 짜면 무한 루프다. `get()`을 호출해야 비로소 실행된다.

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

### Listing 4.10: 다중 연결 처리에서 promise 활용

`packaged_task`가 task와 future를 묶는다면, `std::promise`는 그 결합을 풀어 *임의의 시점*에 future를 만족시킬 수 있게 한다. 책의 Listing 4.10은 한 스레드가 다수의 네트워크 연결을 처리하며 각 패킷에 대응하는 promise를 set하는 패턴이다.

```cpp
void process_connections(connection_set& connections) {
    while (!done(connections)) {
        for (auto connection = connections.begin();
             connection != connections.end(); ++connection) {
            if (connection->has_incoming_data()) {
                data_packet data = connection->incoming();
                std::promise<payload_type>& p =
                    connection->get_promise(data.id);
                p.set_value(data.payload);       // 대응 future 만족
            }
            if (connection->has_outgoing_data()) {
                outgoing_packet data =
                    connection->top_of_outgoing_queue();
                connection->send(data.payload);
                data.promise.set_value(true);    // 송신 완료 알림
            }
        }
    }
}
```

각 패킷마다 ID와 promise를 짝지어 두고, 응답이 도착하면 ID로 promise를 찾아 `set_value`로 만족시킨다. 호출자는 *어느 스레드가 응답을 처리하는지* 신경 쓰지 않고 future에서 결과를 기다린다. promise는 "비동기 신호기"로 동작한다.

### 예외 저장과 broken promise

`promise`는 값뿐 아니라 예외도 future로 전달할 수 있다. `set_exception(std::current_exception())`은 *현재 처리 중인 예외*를 그대로 저장하고, `set_exception(std::make_exception_ptr(std::logic_error("foo")))`는 타입을 직접 명시한다. 후자는 throw/catch 비용을 회피해 더 빠르다.

```cpp
try { some_promise.set_value(calculate_value()); }
catch (...) { some_promise.set_exception(std::current_exception()); }
```

`promise`를 set하지 않고 파괴하면 `future::get()`은 `std::future_error(broken_promise)`를 throw한다. *결과를 만들지 못하고 죽은* 비동기 작업이 호출자를 영원히 대기시키지 않게 보호하는 안전망이다.

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

| 특성 | std::future | std::shared_future |
|------|-------------|--------------------|
| 복사 | 불가 (move only) | 가능 |
| `get()` 호출 횟수 | 1회 (이후 UB) | 여러 번 OK |
| `get()` 반환 | `T` (move) | `T const&` (참조) |
| 대기 가능 스레드 | 1개 | 여러 개 |

책의 권고는 *각 스레드가 자기 복사본을 갖는 것*이다. 한 `shared_future`를 여러 스레드가 동시에 호출하면 race가 될 수 있다. 객체 자체는 thread-safe가 아니지만 *공유 상태*에 대한 동시 접근은 안전하다는 미묘한 구분이다. `promise<void>`로 시작 신호를 공유하면 N개 워커를 동시에 풀어줄 수 있다. C++20의 `std::latch`로도 같은 패턴을 만들 수 있지만, future 기반은 *시작 시점에 예외를 전파*할 수 있다는 장점이 있다.

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

### Listing 4.6: async에 인자 전달

`std::async`의 시그니처는 `std::thread`와 거의 같다. 첫 번째 인자가 launch policy 또는 호출 가능 객체, 그 뒤가 함수 인자다.

```cpp
struct X {
    void foo(int, std::string const&);
    std::string bar(std::string const&);
};

X x;
auto f1 = std::async(&X::foo, &x, 42, "hello");  // x.foo(42, "hello")
auto f2 = std::async(&X::bar, x, "goodbye");     // 복사본의 bar 호출

struct Y { double operator()(double); };
Y y;
auto f3 = std::async(Y(), 3.141);            // 임시
auto f4 = std::async(std::ref(y), 2.718);    // 같은 y 참조

X baz(X&);
auto f5 = std::async(baz, std::ref(x));      // baz(x)
auto f6 = std::async(move_only());           // move-only OK
```

`std::ref`로 감싸면 *참조* 전달이다. 감싸지 않으면 *복사*되며, 멤버 함수에 임시 객체를 넘기면 내부적으로 복사 후 그 복사본의 멤버를 호출한다.

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

#### deferred의 동작

`std::launch::deferred`는 "비동기"가 아니다. 호출자가 `get()` 또는 `wait()`을 호출할 때 *그 스레드에서 동기적으로* 실행된다. `wait_for(0s)`로 상태를 검사하면 항상 `future_status::deferred`를 반환하므로 폴링 루프는 무한 반복이 된다.

기본 정책(`async | deferred`)에서 구현이 `deferred`로 fallback하면 `fut.get()`을 호출하기 전까지 *아무 일도 일어나지 않는다*. 워크로드를 모두 `async`로 띄웠다고 가정한 코드는 데드락처럼 보이는 정지 상태에 빠진다. 책은 명시적으로 `std::launch::async`를 쓰라고 권한다.

| 정책 | 실행 시점 | 실행 스레드 | wait_for(0s) 결과 |
|------|----------|-------------|-------------------|
| `async` | 즉시 (별도 스레드) | 새 스레드 | `timeout` 또는 `ready` |
| `deferred` | `get()`/`wait()` 호출 시 | 호출 스레드 | `deferred` |
| 기본 | 구현 결정 | 구현 결정 | 가변 |

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

### Listing 4.9: GUI 스레드에서 백그라운드 작업 실행

책의 정전형 예시는 *GUI 스레드만 윈도우 핸들에 접근할 수 있다*는 제약 아래 다른 스레드의 작업을 GUI 스레드로 marshalling하는 패턴이다.

```cpp
std::mutex m;
std::deque<std::packaged_task<void()>> tasks;

void gui_thread() {
    while (!gui_shutdown_message_received()) {
        get_and_process_gui_message();
        std::packaged_task<void()> task;
        {
            std::lock_guard<std::mutex> lk(m);
            if (tasks.empty()) continue;
            task = std::move(tasks.front());
            tasks.pop_front();
        }
        task();                            // GUI 스레드에서 실행
    }
}

template<typename Func>
std::future<void> post_task_for_gui_thread(Func f) {
    std::packaged_task<void()> task(f);
    std::future<void> res = task.get_future();
    std::lock_guard<std::mutex> lk(m);
    tasks.push_back(std::move(task));
    return res;                            // 호출자는 res로 완료 대기 가능
}
```

`post_task_for_gui_thread`를 호출한 워커 스레드는 GUI 스레드가 *그 작업을 실행할 때까지* 자유롭게 다른 일을 하고, 필요해지면 `future::get`으로 완료를 기다린다. 메시지 큐를 직접 구현하지 않고도 *스레드 간 일감 분배 + 결과 수신*을 한 번에 해결한다.

### packaged_task의 thread-safety

`packaged_task` 자체는 thread-safe하지 않다. `task()` 호출은 한 번만 가능하며 동시 호출은 race다. 다만 *반환된 future*는 한 스레드가 보관하고 다른 스레드가 task를 실행하는 분리 모델을 지원한다. 즉 "future 보관자"와 "task 실행자"는 다른 스레드여도 되지만 같은 작업을 *두 번 invoke*하지는 못한다.

### async vs packaged_task

| 특성 | std::async | std::packaged_task |
|------|------------|-------------------|
| 실행 시점 | 호출 즉시 (또는 deferred) | 명시적 호출 시 |
| 실행 위치 | 라이브러리가 결정 | 호출하는 곳 |
| 소유권 | 내부 관리 | 사용자가 관리 |
| thread pool과 결합 | 어려움 | 자연스러움 |

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

## 4.10 동기화로 코드를 단순화하기

### 함수형 프로그래밍 스타일

책의 4.4절은 *공유 변경 상태를 줄이고 결과 전달은 future로 한다*는 관점을 제시한다. 알고리즘을 순수 함수 + 비동기 합성으로 표현하면 race를 원천 차단할 수 있다. 가장 유명한 예가 병렬 Quicksort다.

### Listing 4.12 / 4.13: 병렬 Quicksort

책의 Listing 4.12는 `std::list`를 *값으로* 받아 *값으로* 반환하는 순수 함수 형태의 순차 Quicksort다. `splice`로 노드를 옮기므로 비용은 작고, 공유 상태가 없으므로 race는 정의되지 않는다. Listing 4.13은 그 구조를 그대로 두고 *낮은 절반*만 `std::async`로 떼어내 병렬화한다.

```cpp
template<typename T>
std::list<T> parallel_quick_sort(std::list<T> input) {
    if (input.empty()) return input;

    std::list<T> result;
    result.splice(result.begin(), input, input.begin());
    T const& pivot = *result.begin();

    auto divide_point = std::partition(
        input.begin(), input.end(),
        [&](T const& t) { return t < pivot; });

    std::list<T> lower_part;
    lower_part.splice(lower_part.end(), input,
                      input.begin(), divide_point);

    // 낮은 절반은 비동기로
    std::future<std::list<T>> new_lower(
        std::async(&parallel_quick_sort<T>, std::move(lower_part)));

    // 높은 절반은 현재 스레드에서
    auto new_higher(parallel_quick_sort(std::move(input)));

    result.splice(result.end(), new_higher);
    result.splice(result.begin(), new_lower.get());   // 결과 합류
    return result;
}
```

핵심은 두 가지다. *낮은 절반*만 `std::async`로 떼어내고 *높은 절반*은 현재 스레드에서 진행한다. 깊이가 깊어질수록 스레드가 기하급수적으로 늘어나는 것을 막기 위해 표준은 시스템 부하를 보고 *async와 deferred 중 선택*할 수 있다. `new_lower.get()`은 미완성이면 대기, 완성이면 즉시 결과를 가져온다. 데이터 경쟁이 없는 이유는 `std::list`가 *값 의미*로 전달되기 때문이다.

함수형 접근의 장점은 공유 상태 부재(race 불가), 컴포지션 용이, 추론·디버깅 단순화다. 비용은 데이터 복사·이동과 메모리 사용량 증가다.

### 메시지 패싱으로 상태 분리

`std::async`는 *결과 전달*에 강하다. 다른 방향, *상호작용하는 액터*에는 메시지 패싱 모델이 자연스럽다. 책은 ATM(현금자동인출기) 상태 머신을 예시로 든다.

### Listing 4.15: ATM 상태 머신 (요약)

각 액터(ATM, 은행, 인터페이스)는 *자신의 큐*를 가진 별개의 스레드로 동작한다. 액터 간 통신은 *메시지를 큐에 넣는 것*뿐이다. 공유 변수도 락도 없다.

```cpp
class atm {
    messaging::receiver incoming;
    messaging::sender bank;
    messaging::sender interface_hardware;

    void (atm::*state)();
    std::string account;

    void waiting_for_card() {
        interface_hardware.send(display_enter_card());
        incoming.wait()
            .handle<card_inserted>([&](card_inserted const& msg) {
                account = msg.account;
                interface_hardware.send(display_enter_pin());
                state = &atm::getting_pin;
            });
    }

    void verifying_pin() {
        bank.send(verify_pin(account, pin, incoming));
        incoming.wait()
            .handle<pin_verified>([&](pin_verified const&) {
                state = &atm::wait_for_action;
            })
            .handle<pin_incorrect>([&](pin_incorrect const&) {
                interface_hardware.send(display_pin_incorrect_message());
                state = &atm::done_processing;
            });
    }

public:
    void run() {
        state = &atm::waiting_for_card;
        try { for (;;) (this->*state)(); }
        catch (messaging::close_queue const&) {}
    }
};
```

각 상태는 *함수 포인터*로 표현된다. 상태 함수는 다음 메시지를 기다린 뒤 그 종류에 따라 *다음 상태*를 결정한다. 메시지 핸들러는 `handle<T>([](T const&) {...})` 체인으로 표현되며, 큐는 일치하는 핸들러가 등록된 메시지가 도착할 때까지 대기한다.

메시지 패싱의 장점은 공유 가변 상태 제거(race 불가), 테스트 용이성(모의 큐로 단위 테스트), 명시적 상태 흐름(함수 포인터 전환이 곧 상태 다이어그램), 분산화 친화성(Erlang/Actor 모델로 확장)이다. 비용은 메시지 복사와 큐 관리 오버헤드. 처리량보다 *명확성*이 중요한 도메인(GUI, 디바이스 컨트롤러, 워크플로 엔진)에서 빛난다.

## 4.11 동기화 패턴 정리

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
- `notify_all`은 *predicate를 만족시킬 수 있는 스레드가 둘 이상*일 때만 쓴다
- **future/promise**는 일회성 결과를 전달한다. `shared_future`는 다중 수신자용
- `std::promise::set_exception`으로 예외도 future 너머로 전달 가능
- `std::async`는 *명시적으로 `launch::async`*를 쓰지 않으면 deferred로 폴백될 수 있다
- `std::packaged_task`는 작업 큐와 GUI marshalling에 적합
- **타임아웃에는 `steady_clock`** — `system_clock`은 시계 조정에 휘둘린다
- 함수형 스타일(Quicksort)은 *공유 상태*를 *값 전달*로 대체해 race를 원천 차단
- **메시지 패싱**(ATM 상태 머신)은 락 없이 액터 간 통신을 표현한다
- **C++20 latch**는 일회성, **barrier**는 반복적 동기화에 사용한다
- **세마포어**는 N개 동시 접근을 제한한다

## 한국 개발자의 함정

**1. *cv.wait(lock) — predicate 없이***

- Spurious wakeup으로 깨어남
- 조건 확인 없이 진행 → race
- 반드시 wait(lock, predicate)

**2. *cv.notify_one()을 락 안에서 호출***

- 동작은 함, 그러나 비효율
- 깨어난 스레드가 즉시 락 못 잡음
- notify는 락 *해제 후*가 보통 좋음

**3. *fut.get()을 두 번 호출***

- 두 번째는 UB
- shared_future로 옮기거나 한 번만
- 결과 보관은 별도 변수에

**4. *std::async = 새 스레드*라는 오해**

- 기본 launch policy는 구현 정의
- launch::async 명시 안 하면 deferred 가능
- 명시적으로 launch::async 사용

**5. *std::async future 소멸자 = non-blocking***

- async가 반환한 future는 소멸자에서 *블로킹*
- fire-and-forget으로 쓸 수 없음
- 진짜 fire-and-forget은 jthread 또는 detached thread

## 실무 적용

**이론 → 실무:**

- condition_variable     → pthread_cond_t
- future / promise        → CompletableFuture (Java), Promise (JS), Future (Rust)
- packaged_task           → 작업 큐 / 스레드 풀의 task 단위
- async                   → 단발성 비동기, 단 launch policy 주의
- latch (C++20)           → CountDownLatch (Java), sync.WaitGroup (Go)
- barrier (C++20)         → CyclicBarrier (Java), pthread_barrier_t
- counting_semaphore      → Semaphore (Java), sem_t

**언제 무엇:**

- 결과 받기            → future / promise
- 이벤트 통보         → condition_variable
- 작업 분배           → packaged_task + thread pool
- N개 작업 완료 대기  → latch
- 반복 phase 동기화   → barrier
- 자원 풀 제한        → counting_semaphore

**흔한 패턴:**

- Producer-Consumer  → queue + mutex + condition_variable
- Fan-out/Fan-in     → async + future + when_all (boost / Folly)
- Pipeline           → 여러 단계의 thread + queue

## 자기 점검

- [ ] Spurious wakeup의 정의와 대응?
- [ ] predicate가 부수효과를 가지면 안 되는 이유?
- [ ] notify_one과 notify_all 사용 자리?
- [ ] wait_for의 반환값 의미? future_status::deferred의 함정?
- [ ] promise.set_value를 두 번 호출하면?
- [ ] broken_promise는 언제 발생?
- [ ] async의 launch policy 영향? 기본 정책이 deferred로 떨어질 위험?
- [ ] async가 반환한 future의 *소멸자 블로킹*?
- [ ] packaged_task가 GUI marshalling에 어울리는 이유?
- [ ] shared_future를 여러 스레드가 안전하게 쓰는 모델?
- [ ] 타임아웃에 steady_clock을 써야 하는 이유?
- [ ] 함수형 Quicksort에서 race가 발생하지 않는 이유?
- [ ] 메시지 패싱과 락 기반 동기화의 트레이드오프?
- [ ] latch와 barrier 차이?

## 다음 장 예고

다음 장에서는 C++ 메모리 모델을 다룬다. `std::atomic`, memory order, happens-before 관계를 이해하면 락 없이도 스레드 안전한 코드를 작성할 수 있다.

## 관련 항목

- [Ch 3: Sharing Data](/blog/parallel/cpp-concurrency-in-action/chapter03-sharing-data-between-threads)
- [Ch 5: Memory Model](/blog/parallel/cpp-concurrency-in-action/chapter05-the-cpp-memory-model-and-operations-on-atomic-types)
- [AMP Ch 8: Monitors](/blog/parallel/parallel-principles/ch08-monitors-and-blocking-synchronization)
- [AMP Ch 17: Barriers](/blog/parallel/parallel-principles/ch17-barriers)
- [AMP Ch 16: Futures](/blog/parallel/parallel-principles/ch16-futures-scheduling-work-distribution)
