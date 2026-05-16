---
title: "Ch 9: 동시성, atomic, memory model"
date: 2025-09-15T10:00:00
description: "std::thread(A21), atomic memory_order(A23), race 회피, lock-free 제한, 임베디드 RTOS 대응."
tags: [autosar, cpp, concurrency, atomic, memory-model, thread]
series: "AUTOSAR C++14"
seriesOrder: 9
draft: false
---

C++11이 도입한 *thread, atomic, memory model*은 *언어 차원의 동시성 추상*을 가능하게 했다. 하지만 *분석 곤란*과 *성능 함정*이 큰 영역. AUTOSAR는 *통제된 사용*을 요구한다.

## A21 — Threads

### A21-0-1 — `std::thread` 인자 전달은 *명확히*

```c++
// 함정 — 기본 by value 복사
int x = 5;
std::thread t([](int v) { /* ... */ }, x);    // x 복사됨

// 참조 전달 시 std::ref
std::thread t([](int &v) { /* ... */ }, std::ref(x));    // x 참조
```

`std::thread`의 인자는 *기본적으로 by value 저장*. 참조하려면 `std::ref`/`std::cref`.

### A21-0-2 — Thread 함수 인자가 *thread보다 길게 살아 있음*

```c++
// 위반
void Run(const std::string &s);

void Foo() {
    {
        std::string s = "hello";
        std::thread t(Run, s);          // s를 thread에 전달 (by value OK)
        // ... 또는 std::ref(s)면 dangling
        t.detach();
    }
    // s 사라졌지만 thread 실행 중
}
```

*detach*한 thread는 *부모 scope를 벗어나*도 실행. 인자 참조가 *dangling*되지 않게.

### A21-1-1 — `std::thread`는 *join 또는 detach*

```c++
// 위반 — destructor에서 join 안 함 → std::terminate
{
    std::thread t(Worker);
}   // 위반 — t가 joinable인데 join 안 함

// Good — RAII wrapper (C++20 jthread)
std::thread t(Worker);
t.join();        // 또는 t.detach();
```

C++20의 `std::jthread`는 *destructor에서 자동 join*. C++14는 *수동*.

```c++
class ScopedThread {
public:
    ScopedThread(std::thread &&t) : t_(std::move(t)) {}
    ~ScopedThread() noexcept {
        if (t_.joinable()) t_.join();
    }
private:
    std::thread t_;
};
```

## A22 — Functors and Lambdas

### A22-0-1 — Lambda 캡처는 *값으로 또는 명시 참조*

```c++
// 위반 — & 캡처 후 thread로 분리
{
    int x = 5;
    std::thread t([&]() { Use(x); });    // x dangling 위험
    t.detach();
}

// Good
{
    int x = 5;
    std::thread t([x]() { Use(x); });    // value 캡처
    t.detach();
}
```

### A22-0-2 — `std::bind` 회피, lambda 사용

```c++
// 회피
auto f = std::bind(Foo, _1, 42);

// Good
auto f = [](auto x) { return Foo(x, 42); };
```

Lambda가 더 깔끔하고 *인라이닝 가능*.

## A23 — Synchronization

### A23-0-1 — Atomic은 *thread-safe*

```c++
#include <atomic>

std::atomic<int> counter{0};

// Thread 1
counter.fetch_add(1);

// Thread 2
int v = counter.load();
```

기본 memory order는 *`memory_order_seq_cst`* — *가장 강한 순서 보장*. 거의 모든 경우 OK. 성능이 critical하면 *명시 약한 ordering*.

### A23-0-2 — Memory order *기본 seq_cst*

```c++
// Good — 기본 seq_cst
counter.fetch_add(1);

// 명시
counter.fetch_add(1, std::memory_order_seq_cst);

// 약한 ordering — 성능 critical할 때만
counter.fetch_add(1, std::memory_order_relaxed);
```

*relaxed* / *acquire* / *release* / *acq_rel* / *seq_cst* 다섯 단계. 잘못 쓰면 *race condition* 미묘하게 발생.

### A23-0-3 — Lock 없이 *공유 객체 접근 금지*

```c++
// 위반
int shared = 0;
std::thread t1([&]() { shared++; });
std::thread t2([&]() { shared--; });
```

비-atomic 객체는 *반드시 mutex*.

```c++
// Good
std::mutex m;
int shared = 0;
std::thread t1([&]() {
    std::lock_guard<std::mutex> lock(m);
    shared++;
});
```

### A23-0-4 — `std::lock_guard` 또는 RAII로 *mutex 관리*

```c++
// 위반 — 수동 lock/unlock
m.lock();
DoWork();         // throw 시 unlock 누락
m.unlock();

// Good — RAII
{
    std::lock_guard<std::mutex> lock(m);
    DoWork();
}   // 자동 unlock — exception-safe
```

C++17의 `std::scoped_lock`은 *여러 mutex 동시 잠금*에서 deadlock 회피.

```c++
// 위반 — deadlock 가능
m1.lock();
m2.lock();

// Good
std::scoped_lock lock(m1, m2);     // deadlock-free
```

### A23-1-1 — `std::lock_guard` < `std::unique_lock` < `std::shared_lock`

| 종류 | 용도 |
|------|------|
| `lock_guard` | 단순 RAII lock, 가장 가볍다 |
| `unique_lock` | 수동 unlock, condition variable과 결합 |
| `shared_lock` | reader-writer 패턴의 reader |

```c++
// reader-writer
std::shared_mutex m;

// reader
std::shared_lock<std::shared_mutex> lock(m);     // 여러 reader 동시

// writer
std::unique_lock<std::shared_mutex> lock(m);     // exclusive
```

### A23-1-2 — *Recursive mutex* 회피

```c++
// 회피 — 재귀 mutex는 설계 문제 신호
std::recursive_mutex m;

void Foo() {
    m.lock();
    Bar();         // Bar도 m을 잠그면 OK (recursive)
    m.unlock();
}
```

재귀 mutex는 *함수 설계가 잘못된 신호*. *불변량 보장*이 어렵다.

## A24 — Race Conditions

### A24-0-1 — *Race condition* 도구로 검출

```bash
g++ -fsanitize=thread -g app.cpp
./app
# data race 발생 시 두 thread의 stack 출력
```

ThreadSanitizer가 *유일한 자동 검출 도구*. *테스트 단계 필수*.

### A24-0-2 — *Deadlock* 회피 패턴

```c++
// 위반 — 두 thread가 mutex 잠금 순서 다름
// Thread 1
m1.lock();
m2.lock();         // 잠재적 deadlock

// Thread 2
m2.lock();
m1.lock();

// Good — 항상 같은 순서
// Thread 1, 2 모두
m1.lock();
m2.lock();

// 더 좋음 — scoped_lock
std::scoped_lock lock(m1, m2);     // 내부에서 deadlock-free 알고리즘
```

## A25 — Memory Management (Concurrency)

### A25-0-1 — Allocator는 *thread-safe*

기본 `std::allocator`(즉 `new`/`delete`)는 *thread-safe*. 커스텀 allocator를 만들 때는 *thread safety 보장*.

### A25-0-2 — *Lock-free* 알고리즘은 *분석 후*

```c++
// lock-free queue 예 (단순화)
std::atomic<Node *> head;

void Push(Node *n) {
    Node *old_head = head.load();
    do {
        n->next = old_head;
    } while (!head.compare_exchange_weak(old_head, n));
}
```

Lock-free는 *성능은 좋지만 분석이 매우 어렵다*. memory order 실수가 *재현 어려운 race*. 임베디드는 *기존 검증된 알고리즘*(예: Michael & Scott queue) 외 자체 구현 회피.

## RTOS 동시성 — POSIX와의 매핑

AUTOSAR Classic은 *OSEK/AUTOSAR OS*. Adaptive는 *POSIX*.

```
POSIX (Adaptive)         FreeRTOS                Zephyr
─────────────────       ────────────             ────────
std::thread             xTaskCreate              k_thread_create
std::mutex              SemaphoreHandle (mutex)  k_mutex
std::condition_variable QueueHandle (sync)        k_condvar
std::atomic             직접 사용 (대부분 OK)     직접 사용
```

C++ 표준 동시성 API는 *POSIX 위에서 동작*. 임베디드 RTOS는 *native API*가 더 효율적인 경우 많음.

## 임베디드 — 동시성 정책

| 패턴 | 권장 |
|------|------|
| Atomic | ✓ 단순 카운터·플래그 |
| Mutex | ✓ 짧은 critical section |
| Condition variable | △ 복잡도 증가 — 단순 producer-consumer만 |
| Semaphore | △ ISR과 task 동기화 |
| Lock-free | ✗ 기존 검증 알고리즘 외 |
| Thread pool | △ 정적 풀 권장 |
| async, future | ✗ 동적 메모리 + 예외 |

## CVE 사례

```
2017 — Linux kernel CVE-2017-7308
       socket TPACKET_V3 race → kernel pointer 손상 → LPE

2022 — Java DirtyPipe-like (CVE-2022-0847)
       pipe buffer overwrite race → arbitrary file write
```

동시성 race는 *재현이 어렵고 패치도 어렵다*. *처음부터 안전 패턴*이 최선.

## 정리

- `std::thread`는 *반드시 join 또는 detach*. RAII wrapper.
- Lambda·thread 인자에서 *dangling reference* 차단.
- Atomic 기본은 *seq_cst*. 약한 ordering은 *명시*.
- 공유 객체는 *반드시 lock_guard 등 RAII mutex*.
- Recursive mutex와 lock-free는 *설계 신호* — 신중히.
- ThreadSanitizer로 *race 자동 검출*.
- RTOS native API와 *C++ 표준 동시성* 사이 선택은 *성능·이식성*에 따라.

## 다음 장 예고

10장은 시리즈 마무리 — 도구, 인증, MISRA C++:2023 마이그레이션.

## 관련 항목

- [Ch 8 — STL](/blog/embedded/automotive/autosar-cpp/chapter08-stl)
- [Ch 10 — Tools, Cert, MISRA 2023](/blog/embedded/automotive/autosar-cpp/chapter10-tools-cert)
- [CERT C Ch 10 — POSIX, Concurrency](/blog/embedded/automotive/cert-c/chapter10-posix-concurrency)
