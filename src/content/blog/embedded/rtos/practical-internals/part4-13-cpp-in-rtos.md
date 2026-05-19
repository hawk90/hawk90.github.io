---
title: "4-13: C++ in RTOS — RAII·std::thread·ETL·Coroutine"
date: 2026-05-07T01:00:00
description: "RTOS C API를 C++ 객체로 감싸는 패턴을 정리합니다. RAII MutexGuard와 ScopedIRQDisable, std::thread/std::mutex의 한계와 직접 xTaskCreate가 결정성을 갖는 이유, ETL로 STL을 대체하는 법, C++20 coroutine을 RTOS 위에 얹는 방식까지 다룹니다."
series: "Practical RTOS Internals"
seriesOrder: 45
tags: [cpp, rtos, raii, std-thread, std-mutex, etl, coroutine]
---

## 한 줄 요약

> **"RTOS C++ = C API + RAII + 제한된 STL입니다."** — heap과 exception을 피하고 *scope-based* 자원 관리만으로도 안전성을 크게 높일 수 있습니다.

## 어떤 문제를 푸는가

FreeRTOS, Zephyr, ThreadX 같은 RTOS의 공개 API는 *C 함수*입니다. mutex를 잡으면 반드시 풀고, queue handle을 만들면 반드시 해제해야 합니다. 짝을 빠뜨리면 deadlock 또는 자원 leak이 발생합니다.

C에서는 이 짝맞춤을 개발자가 매번 손으로 한다는 점이 가장 큰 위험입니다. 한 함수에 return path가 다섯 개라면 unlock도 다섯 곳에 적어야 하고, 새 path를 추가할 때 하나만 빠뜨려도 *조용히* 자원이 새기 시작합니다.

C++가 RTOS에 들어오는 첫 번째 가치는 **RAII**입니다. `MutexGuard` 같은 객체 하나만 도입해도, *함수가 어떻게 끝나든 소멸자가 unlock을 보장*합니다. 두 번째 가치는 *type-safe template*입니다. `xQueueCreate`가 void pointer로 다루던 메시지가 `StaticQueue<Cmd, 16>`처럼 type을 보존한 채 안전하게 다뤄집니다.

다만 RTOS는 *heap 사용 제한, 결정성 요구, code size 제약*이라는 환경 안에서 동작합니다. 표준 C++가 가진 모든 기능을 그대로 쓸 수는 없고, *어떤 것을 쓰고 어떤 것을 피할지*에 대한 판단이 필요합니다. 이번 편은 그 경계선을 정리합니다.

## RAII MutexGuard — 가장 작은 출발점

```cpp
class MutexGuard {
public:
    explicit MutexGuard(SemaphoreHandle_t mtx,
                        TickType_t timeout = portMAX_DELAY)
        : mtx_(mtx),
          locked_(xSemaphoreTake(mtx, timeout) == pdTRUE) {}

    ~MutexGuard() {
        if (locked_) {
            xSemaphoreGive(mtx_);
        }
    }

    bool locked() const noexcept { return locked_; }

    MutexGuard(const MutexGuard&)            = delete;
    MutexGuard& operator=(const MutexGuard&) = delete;

private:
    SemaphoreHandle_t mtx_;
    bool              locked_;
};
```

`-fno-exceptions` 환경에서도 안전합니다. RAII는 *exception unwinding에만 의존하는* 메커니즘이 아니라 *scope exit 시 소멸자 호출*이 본질이기 때문입니다. return으로 빠져 나가든, break로 빠져 나가든, 마지막 `}`에 도달하든 소멸자는 호출됩니다.

```cpp
void handle_command(void) {
    MutexGuard lock(state_mtx_, pdMS_TO_TICKS(10));
    if (!lock.locked()) {
        log_timeout();
        return;                   /* 자동 give 없음 — locked_ == false */
    }

    if (state_ == State::Idle) {
        return;                   /* 자동 give */
    }
    process_state(state_);
    /* 자동 give */
}
```

복사를 `= delete`로 막은 점이 중요합니다. 복사가 허용되면 *같은 mutex가 두 번 give*되어 카운트가 깨집니다.

## ScopedIRQDisable — Critical Section RAII

ISR과 데이터를 공유하는 짧은 critical section도 같은 패턴으로 묶습니다.

```cpp
class ScopedIRQDisable {
public:
    ScopedIRQDisable() noexcept : primask_(__get_PRIMASK()) {
        __disable_irq();
    }
    ~ScopedIRQDisable() noexcept {
        __set_PRIMASK(primask_);
    }

    ScopedIRQDisable(const ScopedIRQDisable&)            = delete;
    ScopedIRQDisable& operator=(const ScopedIRQDisable&) = delete;

private:
    uint32_t primask_;
};

void update_shared(void) {
    ScopedIRQDisable irq_off;
    counter_++;
    if (counter_ > kMax) {
        counter_ = 0;
        flag_    = true;
    }
    /* 자동 enable */
}
```

진입 시점의 PRIMASK를 저장했다가 복원하므로 *이미 disabled인 nested context*에서도 안전합니다. 자세한 RAII 일반론은 [Embedded C++ 2-01](/blog/embedded/embedded-cpp/part2-01-raii-basics)에서 다룹니다.

## std::lock_guard와 호환되는 Mutex Wrapper

RAII guard를 직접 만들지 않고 *표준 `std::lock_guard`를 그대로 쓰는* 방법이 있습니다. 직접 만들어야 할 것은 *BasicLockable 컨셉을 만족하는 mutex 클래스*뿐입니다.

```cpp
class Mutex {
public:
    Mutex() : mtx_(xSemaphoreCreateMutex()) {
        configASSERT(mtx_ != nullptr);
    }
    ~Mutex() {
        vSemaphoreDelete(mtx_);
    }

    void lock()      { xSemaphoreTake(mtx_, portMAX_DELAY); }
    bool try_lock()  { return xSemaphoreTake(mtx_, 0) == pdTRUE; }
    void unlock()    { xSemaphoreGive(mtx_); }

    Mutex(const Mutex&)            = delete;
    Mutex& operator=(const Mutex&) = delete;

private:
    SemaphoreHandle_t mtx_;
};

/* 사용 — STL guard를 그대로 활용 */
Mutex state_mtx;

void task(void) {
    std::lock_guard<Mutex> lock(state_mtx);
    do_work();
}
```

이 wrapper의 진짜 가치는 *코드가 표준 C++ 관용구로 표현된다*는 점입니다. 새 팀원이 와도 `std::lock_guard`라는 *익숙한 RAII 도구*를 그대로 읽으면 됩니다. 내부가 FreeRTOS인지 Zephyr인지는 별로 중요하지 않게 됩니다.

## std::thread vs xTaskCreate — 결정성의 차이

`std::thread`는 표준 C++ thread API이지만, *임베디드 RTOS에서 그대로 쓰기에는 잘 맞지 않습니다*. 이유 셋입니다.

첫째, `std::thread`의 구현은 보통 *pthread* 위에 얹혀 있습니다. RTOS에 pthread layer를 추가해야 동작하고, 그 layer 자체가 *heap을 쓰고 control block 크기가 커지는* 경향이 있습니다.

둘째, stack 크기와 priority를 *생성 시점에 명시적으로 지정할 수 없습니다*. 표준 `std::thread`의 생성자는 entry function과 인자만 받습니다. priority가 모두 같고 stack 크기를 컴파일러 default에 맡기는 형태가 됩니다. 임베디드에서는 *priority와 stack 크기가 곧 시스템 설계*인데 이것을 잃게 됩니다.

셋째, `std::thread` 객체가 *RAII로 자기 thread를 join하거나 detach*하려고 합니다. 임베디드 task는 보통 *영원히 도는 무한 루프*인데 `std::thread`의 소멸자가 호출되면 `std::terminate`가 호출됩니다.

결정적인 시스템에서는 *xTaskCreate 또는 k_thread_create를 명시적으로 호출*하는 편이 정직합니다.

```cpp
class TaskBase {
public:
    TaskBase(const char *name, void (*entry)(void*), void *arg,
             configSTACK_DEPTH_TYPE stack_words, UBaseType_t prio) {
        BaseType_t r = xTaskCreate(entry, name, stack_words, arg, prio, &handle_);
        configASSERT(r == pdPASS);
    }
    ~TaskBase() {
        if (handle_ != nullptr) {
            vTaskDelete(handle_);
        }
    }
    TaskHandle_t handle() const { return handle_; }

    TaskBase(const TaskBase&)            = delete;
    TaskBase& operator=(const TaskBase&) = delete;

private:
    TaskHandle_t handle_ = nullptr;
};
```

`std::thread` 인터페이스를 강제로 흉내내기보다 *RTOS API의 진짜 모양*을 C++에 노출하는 wrapper가 사용성과 결정성을 모두 살립니다.

## Static Queue Template — Type Safety + No Heap

`xQueueCreate`는 void pointer 기반이라 송신과 수신에서 *타입을 직접 맞춰야* 합니다. template으로 감싸면 컴파일러가 검사해 줍니다.

```cpp
template <typename T, size_t N>
class StaticQueue {
public:
    StaticQueue() {
        handle_ = xQueueCreateStatic(N, sizeof(T), storage_, &buf_);
        configASSERT(handle_ != nullptr);
    }

    bool push(const T& v, TickType_t timeout = portMAX_DELAY) {
        return xQueueSend(handle_, &v, timeout) == pdTRUE;
    }
    bool pop(T& v, TickType_t timeout = portMAX_DELAY) {
        return xQueueReceive(handle_, &v, timeout) == pdTRUE;
    }

    StaticQueue(const StaticQueue&)            = delete;
    StaticQueue& operator=(const StaticQueue&) = delete;

private:
    StaticQueue_t buf_;
    uint8_t       storage_[N * sizeof(T)] __attribute__((aligned(alignof(T))));
    QueueHandle_t handle_;
};

struct Command { uint16_t op; uint16_t arg; };
StaticQueue<Command, 16> cmd_q;

void producer(void) {
    cmd_q.push(Command{0x01, 0x42});
}

void consumer(void) {
    Command c;
    if (cmd_q.pop(c, pdMS_TO_TICKS(100))) {
        handle(c);
    }
}
```

*heap이 전혀 쓰이지 않습니다*. storage가 클래스 멤버이고 정렬도 type에 맞춰 자동으로 잡힙니다.

## ETL — Embedded Template Library

`std::vector`, `std::string`, `std::map`은 거의 모든 RTOS 환경에서 *heap을 동적으로 사용*합니다. 그 결과 fragmentation이 누적되고 WCET 분석이 깨집니다.

**ETL**(Embedded Template Library, MIT license)은 STL과 인터페이스가 비슷하지만 *모두 fixed-capacity, no heap, no exception*인 컨테이너 모음입니다.

```cpp
#include <etl/vector.h>
#include <etl/queue.h>
#include <etl/string.h>
#include <etl/map.h>

etl::vector<int, 100>            v;        /* 최대 100, 내부 storage */
etl::queue<Command, 16>          q;
etl::string<32>                  s = "hello";
etl::map<uint8_t, Sensor*, 8>    sensors;  /* key 최대 8개 */

v.push_back(42);

if (v.size() >= v.capacity()) {
    /* heap 확장 없음, 호출자가 결정 */
}
```

API가 STL과 매우 닮아 있어 *기존 C++ 코드의 사고방식*을 그대로 가져올 수 있습니다. 결정적으로, 동작은 *전부 stack 또는 static*입니다. 자세한 ETL 활용은 [Embedded C++ 4-02](/blog/embedded/embedded-cpp/part4-02-etl-library)에서 다룹니다.

## 컴파일러 플래그 — RTTI와 Exception

```bash
arm-none-eabi-g++ -std=c++20 -O2 \
    -fno-rtti \
    -fno-exceptions \
    -fno-threadsafe-statics
```

세 플래그가 RTOS C++의 표준 조합입니다.

`-fno-rtti`는 `dynamic_cast`와 `typeid`를 제거합니다. virtual class마다 따라붙던 *RTTI 메타데이터*가 사라져 *코드 크기 ~10% 절약*과 *결정성 개선*을 얻습니다.

`-fno-exceptions`는 throw/try/catch를 제거합니다. exception unwinding table이 사라져 *추가 ~10~20% 코드 절약*과 *WCET 분석 가능성*을 얻습니다. 단, 표준 라이브러리 일부 함수가 *exception throw로 실패를 보고*하므로 (`std::vector::at`, `std::stoi`) 그런 API는 피하거나 대체합니다.

`-fno-threadsafe-statics`는 함수 내 static 객체 초기화의 *thread-safe wrapper*(`__cxa_guard_acquire`)를 제거합니다. RTOS task가 한 함수의 첫 호출에서 경쟁할 가능성이 없거나 *직접 초기화 시점을 통제*한다면 안전합니다.

## std::atomic — Cortex-M에서의 동작

```cpp
#include <atomic>

std::atomic<int> counter{0};

void isr_handler(void) {
    counter.fetch_add(1, std::memory_order_relaxed);
}

void task(void) {
    int v = counter.load(std::memory_order_acquire);
    process(v);
}
```

Cortex-M3 이상은 `LDREX/STREX` 명령으로 *lock-free atomic*을 hardware로 지원합니다. C++ 표준 `std::atomic<T>`는 `T`가 word 크기(32-bit)이면 lock-free입니다.

`std::atomic<int64_t>`처럼 *word를 넘는 type*은 32-bit 시스템에서 *lock-based*가 됩니다. ARMv7-M은 `LDREXD/STREXD`로 64-bit lock-free를 지원하지만, 컴파일러가 자동으로 이 명령을 emit하는지는 옵션에 달려 있습니다. `is_lock_free()`를 컴파일 타임에 확인합니다.

## C++20 Coroutine — RTOS 위의 Async

C++20 coroutine은 *stackless* 비동기 단위입니다. RTOS task 위에서 *여러 async 흐름*을 표현할 때 유용합니다.

```cpp
#include <coroutine>

struct Task {
    struct promise_type {
        Task get_return_object() { return {}; }
        std::suspend_never initial_suspend() noexcept { return {}; }
        std::suspend_never final_suspend()  noexcept { return {}; }
        void return_void() {}
        void unhandled_exception() {}
    };
};

struct Delay {
    TickType_t ticks;
    bool await_ready() const noexcept { return false; }
    void await_suspend(std::coroutine_handle<> h) const {
        schedule_resume_after(h, ticks);    /* RTOS timer로 resume */
    }
    void await_resume() const noexcept {}
};

Task blink_task(GPIO_TypeDef *port, uint16_t pin) {
    while (true) {
        port->BSRR = pin;
        co_await Delay{pdMS_TO_TICKS(500)};
        port->BSRR = (uint32_t)pin << 16;
        co_await Delay{pdMS_TO_TICKS(500)};
    }
}
```

coroutine frame은 *컴파일러가 생성한 작은 구조체*이며 한 task의 stack과는 별도로 *promise type이 지정한 allocator*에서 할당됩니다. RTOS에서는 *pool allocator*를 promise에 묶어 heap fragmentation을 피하는 패턴이 일반적입니다.

핵심은 *한 task에서 여러 coroutine을 cooperative하게 돌릴 수 있다*는 점입니다. 한 task 안의 여러 상태 머신을 별도 sub-task로 만들지 않아도 됩니다.

## Virtual Function의 비용

virtual function 호출은 *vtable lookup → indirect call*로 평범한 함수 호출보다 약간 비쌉니다.

```text
Cortex-M4 @ 168 MHz, hot cache:
  direct call         : 2 cycle
  virtual call        : 5 ~ 7 cycle
  cold cache 시        : 30 cycle 이상 (vtable miss)
```

ISR 진입 직후 호출되는 hot path라면 *concrete type을 직접 호출*하거나 *static polymorphism(CRTP)* 으로 대체하는 편이 결정성에 좋습니다. CRTP 패턴은 [Embedded C++ 2-08](/blog/embedded/embedded-cpp/part2-08-static-polymorphism)에서 자세히 다룹니다.

```cpp
template <typename Derived>
class SensorBase {
public:
    void sample() {
        static_cast<Derived*>(this)->read_impl();   /* compile-time bind */
    }
};

class Imu : public SensorBase<Imu> {
public:
    void read_impl() { /* MMIO read */ }
};
```

vtable이 사라지므로 *직접 call로 inlining*되고 RTTI 메타데이터도 필요 없습니다.

## 자주 보는 함정과 안티패턴

> 경고 — heap-backed STL을 RTOS에서 그대로 사용

```cpp
std::vector<Cmd> queue;        /* heap, fragmentation */
queue.push_back(c);
```

장시간 동작 후 fragmentation으로 *malloc 실패*가 발생할 수 있습니다. `etl::vector<Cmd, N>` 또는 `StaticQueue<Cmd, N>`로 대체합니다.

> 경고 — 소멸자에서 예외

```cpp
~UartGuard() {
    if (deinit() < 0) throw std::runtime_error("...");
}
```

소멸자에서 예외를 던지면 stack unwinding 중 `std::terminate`가 호출됩니다. `-fno-exceptions`에서도 abort로 이어지므로 *소멸자는 항상 noexcept*이고 *실패는 조용히 처리*하거나 로깅합니다.

> 경고 — Static initialization order fiasco

```cpp
/* sensors.cpp */
Sensor g_sensor;

/* logger.cpp */
extern Sensor g_sensor;
Logger g_logger(g_sensor);     /* g_sensor 초기화 전일 수 있음 */
```

translation unit 사이의 *전역 객체 초기화 순서는 보장되지 않습니다*. *construct-on-first-use* idiom을 사용합니다.

```cpp
Sensor& sensor() {
    static Sensor s;            /* 첫 호출 시 1회 초기화 */
    return s;
}
```

`-fno-threadsafe-statics`를 쓰는 경우 *첫 호출이 단일 task에서만 일어남*을 설계자가 보장해야 합니다.

> 경고 — ISR에서 heap allocation

```cpp
void TIM2_IRQHandler(void) {
    auto evt = std::make_unique<Event>(...);    /* malloc in ISR */
    queue.push(std::move(evt));
}
```

malloc이 spinlock을 잡는 구현이라면 *ISR 안에서 hang*할 수 있고, 그렇지 않더라도 *WCET 분석이 깨집니다*. ISR이 쓰는 객체는 *static 또는 pool에서 미리 확보*합니다.

> 경고 — 거대한 template 인스턴스화

```cpp
StaticQueue<HugeStruct, 16384> q;
```

같은 template이 여러 type에 대해 인스턴스화되면 *code bloat*가 누적됩니다. 공통 로직은 *non-template base class*로 빼고 template은 *얇은 wrapper*로 두는 패턴이 안전합니다.

## RAII Overhead 측정

같은 mutex critical section을 C 수동 코드와 C++ RAII로 비교합니다(ARM Cortex-M4, `-O2`, FreeRTOS).

```text
# C 수동
shared:
    push    {r4, lr}
    bl      xSemaphoreTake
    ldr     r3, [counter]
    adds    r3, r3, #1
    str     r3, [counter]
    bl      xSemaphoreGive
    pop     {r4, pc}
# 24 bytes

# C++ RAII (MutexGuard)
shared:
    push    {r4, lr}
    bl      xSemaphoreTake
    ldr     r3, [counter]
    adds    r3, r3, #1
    str     r3, [counter]
    bl      xSemaphoreGive
    pop     {r4, pc}
# 24 bytes — 동일
```

생성자와 소멸자가 모두 inlining되어 *overhead가 0*입니다. 전형적인 zero-cost abstraction입니다.

## MISRA C++ / AUTOSAR C++14 — 안전 표준

```text
MISRA C++ 2008 / 2023:
  exception 사용 제한
  dynamic dispatch 제한
  template metaprogramming 제한

AUTOSAR C++14 Coding Guidelines:
  현대 C++ 일부 허용 (constexpr, auto, lambda)
  자동차 safety-critical에 적합

JSF C++ (Lockheed Martin F-35):
  가장 보수적, F-35 비행 소프트웨어용
```

이런 표준은 *ETL과 잘 어울립니다*. heap, exception, dynamic dispatch가 모두 제거된 상태에서 *RAII와 template으로만 안전성을 표현*하므로 분석 가능성과 결정성을 동시에 얻습니다. 자세한 소유권 모델은 [Embedded C++ 3-10](/blog/embedded/embedded-cpp/part3-10-ownership-model)에서 다룹니다.

## 정리

- RTOS C++의 출발점은 *RAII로 C API의 짝맞춤을 자동화*하는 것이며, `MutexGuard`와 `ScopedIRQDisable`이 가장 작은 시작점입니다.
- 표준 `std::lock_guard`를 그대로 쓰려면 *BasicLockable 컨셉만 만족하는 Mutex wrapper*를 만들면 됩니다.
- `std::thread`는 pthread layer, stack/priority 표현 부족, 소멸자 동작 차이 때문에 *임베디드 RTOS에서 그대로 쓰기에 부적합*합니다. xTaskCreate를 명시적으로 호출하는 thin wrapper가 정직합니다.
- `StaticQueue<T, N>` 같은 template은 *type safety와 no-heap*을 동시에 제공합니다.
- 표준 STL container는 heap을 쓰므로 *ETL의 fixed-capacity container*로 대체합니다.
- RTOS 빌드의 표준 컴파일러 옵션은 `-fno-rtti -fno-exceptions -fno-threadsafe-statics`입니다.
- `std::atomic`은 word 크기 type에 대해 Cortex-M3+에서 *lock-free*이며, ISR과 task 사이 카운터에 자연스럽게 쓰입니다.
- C++20 coroutine은 *한 task 안의 여러 async 흐름*을 stackless로 표현하는 도구로 활용 가치가 큽니다.
- virtual function은 hot path에서 측정 가능한 비용이 있으며, *CRTP 같은 static polymorphism*으로 대체 가능합니다.
- 소멸자 예외, static initialization order, ISR 안 heap allocation이 가장 자주 보는 함정입니다.

다음 part는 [Part 5](/blog/embedded/rtos/practical-internals/part5-04-porting)에서 RTOS porting과 시스템 통합 사례를 다룹니다.

## 관련 항목

- [4-12: AMP와 OpenAMP](/blog/embedded/rtos/practical-internals/part4-12-amp-openamp)
- [Embedded C++ 2-01: RAII 기초](/blog/embedded/embedded-cpp/part2-01-raii-basics)
- [Embedded C++ 2-08: Static Polymorphism (CRTP)](/blog/embedded/embedded-cpp/part2-08-static-polymorphism)
- [Embedded C++ 3-10: 소유권 모델](/blog/embedded/embedded-cpp/part3-10-ownership-model)
- [Embedded C++ 4-02: ETL Library](/blog/embedded/embedded-cpp/part4-02-etl-library)
