---
title: "4-13: C++ in RTOS — RAII·std::thread·ETL·Coroutine"
date: 2026-05-20T01:00:00
description: "RTOS C API를 C++ 객체로. RAII lock guard. std::thread/mutex thunks. ETL·Coroutine."
series: "Practical RTOS Internals"
seriesOrder: 45
tags: [cpp, rtos, raii, std-thread, std-mutex, etl, coroutine]
draft: true
---

## 한 줄 요약

> **"C++ in RTOS = C API + RAII + 약간의 STL"** — 안전하면서 *embedded 친화*.

## RAII Lock Guard

```cpp
class MutexGuard {
public:
    explicit MutexGuard(SemaphoreHandle_t mtx, TickType_t timeout = portMAX_DELAY)
        : mtx_(mtx), locked_(xSemaphoreTake(mtx, timeout) == pdTRUE) {}
    
    ~MutexGuard() {
        if (locked_) xSemaphoreGive(mtx_);
    }
    
    bool locked() const { return locked_; }
    
    MutexGuard(const MutexGuard&) = delete;
    MutexGuard& operator=(const MutexGuard&) = delete;
private:
    SemaphoreHandle_t mtx_;
    bool locked_;
};

/* 사용 */
void task(void *p) {
    MutexGuard lock(mtx);
    if (!lock.locked()) return;
    /* critical — scope 종료 시 자동 give */
}
```

Exception 미지원 환경 (`-fno-exceptions`)에서도 안전. RAII는 *exception-only* 아닌 *scope-based*.

## ScopedISR — IRQ Disable RAII

```cpp
class ScopedIRQDisable {
public:
    ScopedIRQDisable() : primask_(__get_PRIMASK()) { __disable_irq(); }
    ~ScopedIRQDisable() { __set_PRIMASK(primask_); }
private:
    uint32_t primask_;
};

/* 사용 */
{
    ScopedIRQDisable irq_off;
    update_shared_data();
}
```

`std::lock_guard`처럼 *scope exit 시 자동 enable*.

## std::thread / std::mutex Thunk

```cpp
/* FreeRTOS wrapper for std::thread */
class Thread {
public:
    Thread(void (*entry)(void*), void *arg, size_t stack_words, UBaseType_t prio) {
        xTaskCreate(entry, "thr", stack_words, arg, prio, &handle_);
    }
    
    ~Thread() {
        if (handle_) vTaskDelete(handle_);
    }
    
    void join() { /* implementation specific */ }
    
private:
    TaskHandle_t handle_ = nullptr;
};

class Mutex {
public:
    Mutex() : mtx_(xSemaphoreCreateMutex()) {}
    ~Mutex() { vSemaphoreDelete(mtx_); }
    
    void lock() { xSemaphoreTake(mtx_, portMAX_DELAY); }
    bool try_lock() { return xSemaphoreTake(mtx_, 0) == pdTRUE; }
    void unlock() { xSemaphoreGive(mtx_); }
    
private:
    SemaphoreHandle_t mtx_;
};

/* 사용 */
Mutex mtx;
std::lock_guard<Mutex> lock(mtx);
```

`std::lock_guard`·`std::unique_lock`이 *RAII 자동 제공*. Custom `Mutex`만 정의.

## Templated Queue

```cpp
template <typename T, size_t N>
class StaticQueue {
public:
    StaticQueue() {
        handle_ = xQueueCreateStatic(N, sizeof(T), storage_, &buf_);
    }
    
    bool push(const T& v, TickType_t timeout = portMAX_DELAY) {
        return xQueueSend(handle_, &v, timeout) == pdTRUE;
    }
    
    bool pop(T& v, TickType_t timeout = portMAX_DELAY) {
        return xQueueReceive(handle_, &v, timeout) == pdTRUE;
    }
    
private:
    StaticQueue_t buf_;
    uint8_t storage_[N * sizeof(T)] __attribute__((aligned(4)));
    QueueHandle_t handle_;
};

StaticQueue<message_t, 16> msg_queue;
```

Type-safe + static allocation.

## ETL (Embedded Template Library)

```cpp
#include <etl/vector.h>
#include <etl/queue.h>
#include <etl/string.h>

etl::vector<int, 100> v;
v.push_back(42);

etl::string<32> s = "hello";

etl::queue<message_t, 16> q;
q.push(msg);
```

`std::vector`·`std::string`의 *fixed-size 임베디드 변종*. *No heap*, no exceptions. MIT license.

채택:
- 자동차 ECU
- IoT (Nordic, Espressif)
- 위성 (CubeSat·NASA)

## C++ Coroutine — RTOS Integration

```cpp
#include <coroutine>

struct Task {
    struct promise_type {
        Task get_return_object() { return {}; }
        std::suspend_never initial_suspend() { return {}; }
        std::suspend_never final_suspend() noexcept { return {}; }
        void return_void() {}
        void unhandled_exception() {}
    };
};

struct Delay {
    TickType_t ticks;
    bool await_ready() { return false; }
    void await_suspend(std::coroutine_handle<> h) {
        /* RTOS timer로 ticks 후 h.resume() schedule */
        xTimerStart(timer_for(h, ticks), 0);
    }
    void await_resume() {}
};

Task my_task() {
    while (1) {
        led_on();
        co_await Delay{pdMS_TO_TICKS(500)};
        led_off();
        co_await Delay{pdMS_TO_TICKS(500)};
    }
}
```

GCC 10+·Clang 11+ — C++20 coroutines. RTOS task 위에서 *async chain*. Memory overhead 적음.

## std::pmr — Polymorphic Allocator

```cpp
#include <memory_resource>

std::pmr::monotonic_buffer_resource pool(buffer, sizeof(buffer));
std::pmr::vector<int> v(&pool);
v.push_back(42);   /* allocates from pool, not heap */
```

C++17 — 일부 STL container에 *custom allocator*. RTOS heap 분리·pool allocator 활용.

## RTTI / Exception 사용 결정

```bash
gcc -fno-rtti -fno-exceptions   # embedded 표준
```

장점:
- 코드 크기 ↓ (~20% 절약)
- WCET 분석 가능

단점:
- `dynamic_cast`·`typeid` 사용 불가
- `throw` 사용 불가
- 일부 STL container (`std::vector::at`은 throws) 사용 어색

→ 임베디드는 *대부분 disable*.

## std::atomic in Cortex-M

```cpp
#include <atomic>

std::atomic<int> counter;
counter.fetch_add(1, std::memory_order_relaxed);
```

Cortex-M3/M4 — LDREX/STREX 사용. C++17·20 표준 atomic 완벽 지원.

`std::atomic<int64_t>` — 32-bit 시스템에선 *lock-based*. ARM `LDREXD/STREXD` 사용 시 atomic.

## CMSIS-RTOS C++ — CMSIS-RTOS2

```cpp
#include "cmsis_os2.h"

extern "C" void task_func(void *arg) {
    while (1) {
        osDelay(1000);
    }
}

osThreadId_t tid = osThreadNew(task_func, nullptr, nullptr);
```

CMSIS-RTOS는 *C API* — `extern "C"`로 사용. C++ wrapper 라이브러리 (mbed OS) 별도.

## Mbed OS — C++ RTOS

```cpp
#include "mbed.h"

Thread t;
Mutex m;
EventQueue queue;

void task_func() {
    while (1) {
        ThisThread::sleep_for(1000ms);
    }
}

t.start(callback(task_func));
```

C++ 시작 RTOS — Arm Mbed (deprecated 2025 EOL이지만 reference로 유용). Zephyr이 후속.

## Zephyr C++ — Modern

```cpp
#include <zephyr/kernel.h>

K_MUTEX_DEFINE(mtx);
K_SEM_DEFINE(sem, 0, 1);

extern "C" void main(void) {
    k_mutex_lock(&mtx, K_FOREVER);
    /* ... */
    k_mutex_unlock(&mtx);
}
```

Zephyr — C API. C++ 호환 (헤더 `extern "C"`).

## constexpr·Templates — Compile-Time

```cpp
template <size_t N>
constexpr uint32_t fnv1a_hash(const char (&s)[N]) {
    uint32_t h = 2166136261u;
    for (size_t i = 0; i < N - 1; i++) {
        h ^= s[i];
        h *= 16777619u;
    }
    return h;
}

constexpr uint32_t key = fnv1a_hash("config_value");
```

Hash·LUT·dispatcher — 컴파일 타임 계산 → runtime 0 비용.

## 자동차·항공 C++

```text
MISRA C++ 2008·2023:
  - exception 사용 제한
  - dynamic dispatch 제한
  - template metaprogramming 제한
  
AUTOSAR C++14 Coding Guidelines:
  - 모던 C++ 일부 허용
  - safety-critical에 적합

JSF C++ (Lockheed Martin F-35):
  - 가장 보수적
  - F-35 비행 SW
```

→ ETL·subset C++로 *MISRA·AUTOSAR 호환*.

## 자주 하는 실수

> ⚠️ `new`/`delete` 남발

```cpp
Task *t = new Task();   /* ← heap, fragmentation */
```

→ static 객체 또는 *pool allocator*.

> ⚠️ Virtual function in ISR-critical path

```cpp
class Sensor { virtual void read() = 0; };
sensor->read();   /* vtable lookup — ISR에선 비용 큼 */
```

→ template polymorphism 또는 *concrete class*.

> ⚠️ Exception throw in RTOS

```cpp
xSemaphoreTake(mtx, 1);
if (failed) throw std::runtime_error(...);   /* ← lock 안 give */
```

→ exception 안 쓰거나 *RAII guard*.

> ⚠️ Static initialization order fiasco

```cpp
/* file1.cpp */
extern Sensor sensor;
Logger log(sensor);   /* sensor uninit? */
```

→ Schwarz counter·Construct-on-first-use idiom.

## 정리

- RTOS C++ — **RAII + C API wrap**.
- `std::lock_guard`·custom `Mutex`로 *safe critical section*.
- **ETL**·`std::pmr` — embedded-friendly STL.
- C++20 **coroutine**으로 *async chain*.
- `-fno-rtti -fno-exceptions` — embedded 표준.
- 자동차 — **MISRA C++·AUTOSAR C++14** 준수.

다음 part는 **System Examples**.

## 관련 항목

- [4-12: AMP·OpenAMP](/blog/embedded/rtos/practical-internals/part4-12-amp-openamp)
- [Embedded C++ for Real Systems Ch 1](/blog/embedded/standards/embedded-cpp/chapter01-overview)
