---
title: "Ch 2: Managing threads"
date: 2026-05-06T02:00:00
description: "std::thread 라이프사이클, join/detach, 인자 전달, std::jthread (C++20)."
tags: [C++, Concurrency, std::thread, std::jthread]
series: "C++ Concurrency in Action"
seriesOrder: 2
draft: true
---

스레드는 생성되고, 작업을 수행하고, 종료된다. 이 장에서는 스레드의 생애 주기를 관리하는 방법을 다룬다. `join`과 `detach`의 선택, 인자 전달의 함정, 그리고 C++20의 `std::jthread`까지.

## 2.1 스레드 시작

### std::thread 생성자

`std::thread`는 callable과 인자를 받는다.

```cpp
// 1. 함수 포인터
void task() { /* ... */ }
std::thread t1(task);

// 2. 함수 객체 (functor)
struct Task {
    void operator()() const { /* ... */ }
};
std::thread t2(Task{});

// 3. 람다
std::thread t3([] { /* ... */ });

// 4. 멤버 함수
struct Worker {
    void run() { /* ... */ }
};
Worker w;
std::thread t4(&Worker::run, &w);  // 첫 인자로 객체 포인터
```

### 즉시 실행

`std::thread` 생성자가 반환되면 새 스레드는 **이미 실행 중**이다.

```cpp
std::thread t([] {
    std::cout << "Running!\n";  // 즉시 실행 시작
});
// 이 시점에서 t는 이미 작업 중
t.join();
```

생성과 실행 사이에 지연이 없다. OS가 스레드를 언제 스케줄링할지는 보장되지 않지만, 생성 직후 실행 가능 상태가 된다.

### 가장 성가신 파싱 (Most Vexing Parse)

함수 객체를 전달할 때 주의해야 한다.

```cpp
struct Task {
    void operator()() const { }
};

// 💥 함수 선언으로 파싱됨!
std::thread t(Task());  // t는 함수: thread 타입 반환, 인자는 함수 포인터

// ✓ 해결법 1: 중괄호 초기화
std::thread t1{Task()};

// ✓ 해결법 2: 추가 괄호
std::thread t2((Task()));

// ✓ 해결법 3: 변수 분리
Task task;
std::thread t3(task);

// ✓ 해결법 4: 람다 (가장 명확)
std::thread t4([] { Task{}(); });
```

## 2.2 C11 스레드 관리

C11은 `<threads.h>`에서 스레드 관리 기능을 제공한다.

### C11 스레드 생성

```c
#include <stdio.h>
#include <threads.h>

int task(void* arg) {
    int* value = (int*)arg;
    printf("Thread received: %d\n", *value);
    return *value * 2;  // 반환값
}

int main(void) {
    thrd_t t;
    int arg = 21;

    // 스레드 생성
    if (thrd_create(&t, task, &arg) != thrd_success) {
        return 1;
    }

    // 결과 받기
    int result;
    thrd_join(t, &result);
    printf("Thread returned: %d\n", result);  // 42

    return 0;
}
```

### C11 vs C++11 스레드 관리 비교

| 기능 | C11 | C++11 |
|------|-----|-------|
| 생성 | `thrd_create(&t, func, arg)` | `std::thread t(func, args...)` |
| join | `thrd_join(t, &result)` | `t.join()` |
| detach | `thrd_detach(t)` | `t.detach()` |
| 현재 스레드 ID | `thrd_current()` | `std::this_thread::get_id()` |
| 양보 | `thrd_yield()` | `std::this_thread::yield()` |
| sleep | `thrd_sleep(&ts, NULL)` | `std::this_thread::sleep_for()` |
| 종료 | `thrd_exit(result)` | `return` 또는 예외 |

### C11 스레드 분리

```c
#include <threads.h>

int background_task(void* arg) {
    (void)arg;
    // 백그라운드 작업
    return 0;
}

int main(void) {
    thrd_t t;
    thrd_create(&t, background_task, NULL);
    thrd_detach(t);  // 분리 - 더 이상 join 불가

    // 메인은 계속 진행
    return 0;
}
```

### C11 스레드 sleep

```c
#include <threads.h>
#include <time.h>

void sleep_example(void) {
    // 500ms 대기
    struct timespec duration = {
        .tv_sec = 0,
        .tv_nsec = 500000000  // 500ms
    };
    struct timespec remaining;

    int result = thrd_sleep(&duration, &remaining);
    if (result == -1) {
        // 시그널로 중단됨, remaining에 남은 시간
    }
}
```

### C11 스레드 로컬 저장소

```c
#include <threads.h>

// 방법 1: thread_local 키워드 (C11)
thread_local int tls_var = 0;

// 방법 2: tss_t (스레드 특정 저장소)
tss_t key;

void destructor(void* data) {
    free(data);
}

int worker(void* arg) {
    (void)arg;

    // tss 사용
    int* data = malloc(sizeof(int));
    *data = 42;
    tss_set(key, data);

    // 나중에 가져오기
    int* retrieved = tss_get(key);
    printf("TSS value: %d\n", *retrieved);

    return 0;
}

int main(void) {
    tss_create(&key, destructor);

    thrd_t t;
    thrd_create(&t, worker, NULL);
    thrd_join(t, NULL);

    tss_delete(key);
    return 0;
}
```

> **참고:** C11 `thrd_join`은 반환값을 받을 수 있지만, C++11 `std::thread::join()`은 반환값이 없다. C++에서 결과를 받으려면 `std::future`를 사용해야 한다.

## 2.3 join과 detach

### joinable 상태

생성된 스레드는 **joinable** 상태다. 이 상태에서 소멸자가 호출되면 `std::terminate()`가 발생한다.

```cpp
void bad() {
    std::thread t(task);
    // join()도 detach()도 안 함
}  // 💥 std::terminate()
```

스레드를 `join()` 또는 `detach()`하면 non-joinable 상태가 된다.

```cpp
std::thread t(task);
std::cout << t.joinable() << "\n";  // true

t.join();  // 또는 t.detach()
std::cout << t.joinable() << "\n";  // false
```

### join: 대기

`join()`은 스레드가 완료될 때까지 호출 스레드를 블로킹한다.

```cpp
std::thread t([] {
    std::this_thread::sleep_for(std::chrono::seconds(2));
    std::cout << "Done!\n";
});

std::cout << "Waiting...\n";
t.join();  // 2초 대기
std::cout << "Thread finished.\n";
```

출력:
```
Waiting...
Done!
Thread finished.
```

**join 후 스레드 객체는 빈 껍데기가 된다.** ID가 없고, joinable이 false가 된다.

### detach: 분리

`detach()`는 스레드를 백그라운드로 보낸다. 더 이상 `std::thread` 객체로 제어할 수 없다.

```cpp
std::thread t([] {
    std::this_thread::sleep_for(std::chrono::seconds(2));
    std::cout << "Background done!\n";
});

t.detach();  // 백그라운드로
std::cout << "Main continues.\n";
// 프로그램이 2초 안에 종료되면 "Background done!"은 출력되지 않음
```

**detach된 스레드는 데몬(daemon) 스레드가 된다.** 메인 함수가 종료되면 같이 종료된다.

### join vs detach 선택 기준

| 상황 | 선택 | 이유 |
|------|------|------|
| 결과가 필요하다 | `join` | 완료까지 대기해야 결과를 받음 |
| 작업 완료 보장이 필요하다 | `join` | 종료 전 완료 확인 |
| "fire and forget" | `detach` | 결과 상관없이 백그라운드 실행 |
| 로깅, 모니터링 | `detach` | 메인 로직과 무관하게 실행 |

**대부분의 경우 `join`이 안전하다.** `detach`는 리소스 누수나 댕글링 참조 위험이 있다.

### detach 위험: 댕글링 참조

```cpp
void dangerous() {
    int local = 42;
    std::thread t([&local] {  // 지역 변수 참조!
        std::this_thread::sleep_for(std::chrono::seconds(1));
        std::cout << local << "\n";  // 💥 이미 파괴됨
    });
    t.detach();
}  // local 파괴. t는 아직 실행 중!
```

**detach 시 캡처는 반드시 값으로.** 또는 힙 할당된 객체를 `shared_ptr`로 관리한다.

```cpp
void safe() {
    auto data = std::make_shared<int>(42);
    std::thread t([data] {  // shared_ptr 복사 (reference count++)
        std::this_thread::sleep_for(std::chrono::seconds(1));
        std::cout << *data << "\n";  // ✓ 안전
    });
    t.detach();
}  // data가 파괴되어도 람다가 소유권 유지
```

## 2.4 예외 안전성

### 문제: 예외로 join을 건너뜀

```cpp
void work(int x) { /* ... */ }

void risky() {
    std::thread t(work, 42);

    process();  // 💥 예외 발생!

    t.join();   // 도달 못함 → std::terminate()
}
```

예외가 발생하면 `t.join()`이 호출되지 않고 함수가 종료된다. `t`의 소멸자가 호출될 때 joinable 상태이므로 프로그램이 죽는다.

### 해결법 1: try-catch

```cpp
void safer() {
    std::thread t(work, 42);

    try {
        process();
    } catch (...) {
        t.join();  // 예외 경로에서도 join
        throw;     // 재던지기
    }
    t.join();      // 정상 경로
}
```

작동하지만 코드가 지저분하다.

### 해결법 2: RAII thread guard

```cpp
class thread_guard {
    std::thread& t_;
public:
    explicit thread_guard(std::thread& t) : t_(t) {}

    ~thread_guard() {
        if (t_.joinable()) {
            t_.join();
        }
    }

    // 복사 금지
    thread_guard(const thread_guard&) = delete;
    thread_guard& operator=(const thread_guard&) = delete;
};

void safe() {
    std::thread t(work, 42);
    thread_guard guard(t);  // RAII

    process();  // 예외 발생해도 guard 소멸자가 join 호출
}
```

### 해결법 3: scoped_thread (소유권 이동)

```cpp
class scoped_thread {
    std::thread t_;
public:
    explicit scoped_thread(std::thread t) : t_(std::move(t)) {
        if (!t_.joinable()) {
            throw std::logic_error("No thread");
        }
    }

    ~scoped_thread() {
        t_.join();  // joinable 검사 불필요 (생성자에서 보장)
    }

    scoped_thread(scoped_thread&&) = default;
    scoped_thread& operator=(scoped_thread&&) = default;

    scoped_thread(const scoped_thread&) = delete;
    scoped_thread& operator=(const scoped_thread&) = delete;
};

void safe() {
    scoped_thread t(std::thread(work, 42));  // 소유권 이동
    process();
}
```

### 해결법 4: C++20 std::jthread

C++20의 `std::jthread`는 소멸자에서 자동 join한다.

```cpp
#include <thread>

void modern() {
    std::jthread t(work, 42);  // j = joining

    process();  // 예외 발생해도 OK
}  // t 소멸자에서 자동 join
```

**새 코드에서는 `std::jthread`를 기본으로 사용하라.**

## 2.5 std::jthread (C++20)

### 자동 join

```cpp
void demo() {
    std::jthread t([] {
        std::cout << "Working...\n";
    });
    // join() 호출 불필요
}  // 자동 join
```

### 협력적 취소: stop_token

`std::jthread`의 핵심 기능은 **협력적 취소(cooperative cancellation)**다.

```cpp
#include <thread>
#include <stop_token>

void cancelable_work(std::stop_token stop) {
    while (!stop.stop_requested()) {
        // 작업 수행
        std::this_thread::sleep_for(std::chrono::milliseconds(100));
    }
    std::cout << "Cancelled!\n";
}

int main() {
    std::jthread t(cancelable_work);

    std::this_thread::sleep_for(std::chrono::seconds(1));
    t.request_stop();  // 취소 요청

    // t 소멸자에서 join
}
```

첫 번째 매개변수가 `std::stop_token`이면 자동으로 전달된다.

### stop_callback

취소 시 콜백을 등록할 수도 있다.

```cpp
void with_callback(std::stop_token stop) {
    std::stop_callback callback(stop, [] {
        std::cout << "Cleanup on cancel!\n";
    });

    while (!stop.stop_requested()) {
        std::this_thread::sleep_for(std::chrono::milliseconds(100));
    }
}
```

### get_stop_source / get_stop_token

```cpp
std::jthread t(some_work);

std::stop_source& source = t.get_stop_source();
std::stop_token token = t.get_stop_token();

source.request_stop();  // == t.request_stop()
bool requested = token.stop_requested();
```

## 2.6 스레드 이동

### std::thread는 이동 가능

`std::thread`는 복사할 수 없지만 이동할 수 있다.

```cpp
std::thread t1(work);
std::thread t2 = std::move(t1);  // t1 → t2 소유권 이동

// t1은 이제 빈 상태 (joinable == false)
// t2가 스레드를 소유

t2.join();
```

### 함수에서 스레드 반환

```cpp
std::thread create_thread() {
    return std::thread(work);  // 이동 반환
}

void caller() {
    std::thread t = create_thread();  // 소유권 수신
    t.join();
}
```

### 컨테이너에 스레드 저장

```cpp
std::vector<std::thread> threads;

for (int i = 0; i < 4; ++i) {
    threads.emplace_back([i] {
        std::cout << "Thread " << i << "\n";
    });
}

for (auto& t : threads) {
    t.join();
}
```

주의: `push_back(std::thread(...))`도 가능하지만 `emplace_back`이 더 효율적이다.

## 2.7 스레드 개수 결정

### hardware_concurrency

하드웨어가 지원하는 동시 스레드 수를 반환한다.

```cpp
unsigned int n = std::thread::hardware_concurrency();
std::cout << "Cores: " << n << "\n";  // 예: 8
```

반환값은 **힌트**다. 0을 반환할 수도 있다 (정보 없음).

### 적정 스레드 수

```cpp
unsigned int num_threads = std::thread::hardware_concurrency();
if (num_threads == 0) {
    num_threads = 2;  // 기본값
}

// 작업 분할
std::vector<std::thread> workers;
size_t chunk_size = data.size() / num_threads;

for (unsigned int i = 0; i < num_threads; ++i) {
    auto begin = data.begin() + i * chunk_size;
    auto end = (i == num_threads - 1) ? data.end() : begin + chunk_size;
    workers.emplace_back(process_chunk, begin, end);
}

for (auto& w : workers) {
    w.join();
}
```

### 과도한 스레드의 비용

스레드 생성에는 오버헤드가 있다.

| 비용 | 대략적 크기 |
|------|------------|
| 스택 메모리 | 1~8 MB / 스레드 |
| 생성 시간 | 수십 μs ~ 수 ms |
| 컨텍스트 스위칭 | 수 μs |

**스레드 수가 코어 수를 크게 초과하면 성능이 저하된다.** 스케줄링 오버헤드와 캐시 오염이 발생한다.

## 2.8 스레드 식별

### std::thread::id

```cpp
std::thread::id main_id = std::this_thread::get_id();

std::thread t([main_id] {
    std::thread::id my_id = std::this_thread::get_id();
    std::cout << "Main: " << main_id << "\n";
    std::cout << "Worker: " << my_id << "\n";
});

std::cout << "t's ID: " << t.get_id() << "\n";
t.join();
```

### id 비교

```cpp
std::thread::id id1 = std::this_thread::get_id();
std::thread::id id2 = some_thread.get_id();

if (id1 == id2) {
    std::cout << "Same thread\n";
}
```

### id를 키로 사용

```cpp
std::map<std::thread::id, std::string> thread_names;
thread_names[std::this_thread::get_id()] = "main";

std::thread t([&] {
    thread_names[std::this_thread::get_id()] = "worker";
});
t.join();
```

**주의:** `std::thread::id`는 스레드가 종료된 후 재사용될 수 있다. 종료된 스레드의 ID를 장기간 보관하면 안 된다.

## 2.9 네이티브 핸들

### native_handle

플랫폼별 기능이 필요하면 네이티브 핸들을 사용한다.

```cpp
std::thread t(work);

#ifdef __linux__
pthread_t handle = t.native_handle();
// POSIX 스레드 API 사용
pthread_setname_np(handle, "worker");
#endif

t.join();
```

이식성을 포기하는 대신 플랫폼별 고급 기능(우선순위, CPU 친밀성 등)을 사용할 수 있다.

## 정리

- `std::thread`는 생성 즉시 실행을 시작한다
- 반드시 `join()` 또는 `detach()`를 호출해야 한다. 그렇지 않으면 `std::terminate()`
- `detach`는 댕글링 참조 위험이 있다. 값 캡처 또는 `shared_ptr` 사용
- 예외 안전성을 위해 RAII 가드 또는 **C++20 `std::jthread`** 사용
- `std::jthread`는 자동 join + `stop_token`으로 협력적 취소 지원
- `std::thread`는 이동 가능, 복사 불가
- `hardware_concurrency()`로 적정 스레드 수를 결정하되, 과도한 스레드는 피한다

## 한국 개발자의 함정

```
1. *Most Vexing Parse*에 당함
   - std::thread t(Task());  // 함수 선언으로 해석
   - 중괄호 / 람다 / 변수 분리로 해결
   - 가장 흔한 C++ 초보 버그

2. *detach 후 ref capture*
   - 지역 변수가 사라지면 댕글링
   - shared_ptr 또는 값 캡처
   - 진짜 fire-and-forget만 detach

3. *std::thread 복사 시도*
   - thread는 *unique* 자원
   - std::move(t)로만 전달 가능
   - vector에 넣을 때 emplace_back 또는 move

4. *jthread를 그냥 jthread*로만 씀
   - 진짜 가치는 stop_token (협력적 취소)
   - 첫 인자가 stop_token이면 자동 전달
   - 자동 join은 *부수 효과*

5. *hardware_concurrency × 2 = 적정 스레드*
   - 워크로드별로 다름
   - CPU 바운드: 코어 수
   - I/O 바운드: 훨씬 많이
```

## 실무 적용

```
이론 → 실무:
- thread_guard / scoped_thread → std::jthread (C++20)
- stop_token / stop_source     → cooperative cancellation
- native_handle                → pthread_setname_np, SetThreadPriority
- thread pool 직접 구현        → ASIO io_context, std::async (제한적)

플랫폼별:
- POSIX: pthread_setname_np, pthread_setaffinity_np
- Windows: SetThreadPriority, SetThreadAffinityMask
- macOS: pthread_set_qos_class_self_np (QoS class)

언제 jthread vs thread:
- 새 코드 → std::jthread 기본
- 명시적 lifecycle 제어 → std::thread + RAII
- 매우 짧은 작업 → std::async
```

## 자기 점검

```
□ Most Vexing Parse 해결 방법 4가지?
□ join과 detach의 *예외 경로* 차이?
□ thread_guard 패턴의 핵심?
□ jthread의 stop_token 자동 전달?
□ thread 이동의 의미 (unique ownership)?
□ hardware_concurrency()의 *힌트* 특성?
```

## 다음 장 예고

다음 장에서는 스레드 간 데이터 공유를 다룬다. race condition, `std::mutex`, lock guard, deadlock 회피, `std::shared_mutex`를 살펴본다.

## 관련 항목

- [Ch 1: Hello Concurrent World](/blog/parallel/cpp-concurrency-in-action/chapter01-hello-concurrent-world)
- [Ch 3: Sharing Data](/blog/parallel/cpp-concurrency-in-action/chapter03-sharing-data-between-threads)
- [AMP Ch 1: Introduction](/blog/parallel/parallel-principles/ch01-introduction)
