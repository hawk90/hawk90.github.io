---
title: "C++ in RTOS — RAII·std::thread·ETL·Coroutine"
slug: "embedded/rtos/practical-internals/part4-13-cpp-in-rtos"
date: 2026-05-07T09:45:00
description: "RTOS C API를 C++ 객체로 감싸는 패턴을 정리합니다. RAII MutexGuard와 ScopedIRQDisable, std::thread의 수명 계약, static queue의 byte-copy 제약, ETL 설정, coroutine frame 소유권과 RTOS 연결의 경계까지 다룹니다."
series: "Practical RTOS Internals"
seriesOrder: 45
tags: [cpp, rtos, raii, std-thread, std-mutex, etl, coroutine]
topics: ["embedded", "embedded/rtos"]
---

## 한 줄 요약

> **"RTOS C++ = C API + RAII + 제한된 STL입니다."** — heap과 exception을 피하고 *scope-based* 자원 관리만으로도 안전성을 크게 높일 수 있습니다.

## 어떤 문제를 푸는가

FreeRTOS, Zephyr, ThreadX 같은 RTOS의 공개 API는 *C 함수*입니다. mutex를 잡으면 반드시 풀고, queue handle을 만들면 반드시 해제해야 합니다. 짝을 빠뜨리면 deadlock 또는 자원 leak이 발생합니다.

C에서는 이 짝맞춤을 개발자가 매번 손으로 한다는 점이 가장 큰 위험입니다. 한 함수에 return path가 다섯 개라면 unlock도 다섯 곳에 적어야 하고, 새 path를 추가할 때 하나만 빠뜨려도 *조용히* 자원이 새기 시작합니다.

C++가 RTOS에 들어오는 첫 번째 가치는 **RAII**입니다. `MutexGuard` 같은 객체 하나만 도입해도, 정상 scope exit와 지원되는 exception unwind에서 unlock을 짝지을 수 있습니다. vTaskDelete·reset·longjmp가 C++ scope를 정상 종료하는 것은 아닙니다. 두 번째 가치는 *type-safe template*입니다. `xQueueCreate`가 void pointer로 다루던 메시지가 `StaticQueue<Cmd, 16>`처럼 type을 보존한 채 안전하게 다뤄집니다.

다만 RTOS는 *heap 사용 제한, 결정성 요구, code size 제약*이라는 환경 안에서 동작합니다. 표준 C++가 가진 모든 기능을 그대로 쓸 수는 없고, *어떤 것을 쓰고 어떤 것을 피할지*에 대한 판단이 필요합니다. 이번 편은 그 경계선을 정리합니다.

## RAII MutexGuard — 가장 작은 출발점

```cpp title="mutex-guard.hpp"
#pragma once
#include <cstdlib>
#include "FreeRTOS.h"
#include "semphr.h"
class MutexGuard {
public:
    explicit MutexGuard(SemaphoreHandle_t mtx,
                        TickType_t timeout = portMAX_DELAY)
        : mtx_(mtx),
          locked_(mtx != nullptr && xSemaphoreTake(mtx, timeout) == pdTRUE) {}

    ~MutexGuard() {
        if (locked_) {
            if (xSemaphoreGive(mtx_) != pdTRUE) std::abort();
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
    /* 진입 전 PRIMASK 상태 복원 */
}
```

해당 Cortex-M에서 진입 PRIMASK를 저장하고 복원하므로 기존 mask 상태를 유지합니다. NMI/HardFault·다른 core·DMA까지 배제하지 않으며 FreeRTOS port의 BASEPRI/critical nesting과 임의로 섞지 않습니다. 오래 보유하거나 block하지 않습니다. 자세한 RAII 일반론은 [Embedded C++ 2-01](/blog/embedded/embedded-cpp/part2-01-raii-basics)에서 다룹니다.

## std::lock_guard와 호환되는 Mutex Wrapper

BasicLockable의 lock은 성공적으로 소유권을 얻고 반환해야 합니다. configASSERT가 꺼질 수 있는 build에서 실패를 무시하는 lock wrapper는 이 계약을 만족하지 못합니다. 다음은 FreeRTOS V11.2.0의 static mutex/queue를 묶은 예입니다.

```cpp title="rtos-objects.hpp"
#pragma once
#include <cstddef>
#include <cstdint>
#include <cstdlib>
#include <limits>
#include <type_traits>
#include "FreeRTOS.h"
#include "semphr.h"
#include "queue.h"

/* 이 예의 fail-stop은 host abort. 제품에서는 검증된 board fault 정책 필요. */
inline void require_rtos(bool ok) { if (!ok) std::abort(); }
class Mutex {
    StaticSemaphore_t storage_{};
    SemaphoreHandle_t handle_;
public:
    Mutex() : handle_(xSemaphoreCreateMutexStatic(&storage_))
    { require_rtos(handle_ != nullptr); }
    ~Mutex() { vSemaphoreDelete(handle_); }
    void lock() { require_rtos(xSemaphoreTake(handle_, portMAX_DELAY) == pdTRUE); }
    bool try_lock() { return xSemaphoreTake(handle_, 0) == pdTRUE; }
    void unlock() { require_rtos(xSemaphoreGive(handle_) == pdTRUE); }
    Mutex(const Mutex&) = delete;
    Mutex& operator=(const Mutex&) = delete;
};

template<class T, std::size_t N> class StaticQueue {
    static_assert(std::is_trivially_copyable_v<T>, "queue copies raw bytes");
    static_assert(N > 0 && N <= std::numeric_limits<UBaseType_t>::max());
    static_assert(sizeof(T) <= std::numeric_limits<UBaseType_t>::max());
    static_assert(N <= std::numeric_limits<std::size_t>::max() / sizeof(T));
    StaticQueue_t control_{};
    std::uint8_t bytes_[N * sizeof(T)]{};
    QueueHandle_t handle_;
public:
    StaticQueue() : handle_(xQueueCreateStatic(static_cast<UBaseType_t>(N),
        static_cast<UBaseType_t>(sizeof(T)), bytes_, &control_))
    { require_rtos(handle_ != nullptr); }
    ~StaticQueue() { vQueueDelete(handle_); }
    bool push(const T& value, TickType_t wait = 0)
    { return xQueueSend(handle_, &value, wait) == pdTRUE; }
    bool pop(T& value, TickType_t wait = 0)
    { return xQueueReceive(handle_, &value, wait) == pdTRUE; }
    StaticQueue(const StaticQueue&) = delete;
    StaticQueue& operator=(const StaticQueue&) = delete;
};
```

Mutex는 std::lock_guard로 사용할 수 있습니다. task-only·nonrecursive로 사용하고 다른 owner/waiter가 없는 시점에 파괴합니다. 객체는 scheduler/task·board 초기화 순서가 확정된 위치에서 생성하며 move/copy를 금지합니다. RTOS task를 외부에서 삭제하면 그 stack의 guard 소멸자가 호출된다고 가정하지 않습니다.

## std::thread vs xTaskCreate — 결정성의 차이

std::thread의 소멸자는 **joinable이면 std::terminate를 호출**합니다. 자동 join이나 detach를 하지 않습니다. C++20 std::jthread와도 구분해야 합니다. thread 함수가 반환했더라도 join/detach 전에는 joinable일 수 있습니다.

표준 생성자는 RTOS priority·stack depth를 직접 받지 않습니다. native_handle/implementation extension의 지원은 library와 port에 따르므로 모두 같은 priority·같은 pthread heap 정책이라고 일반화하지 않습니다.

xTaskCreate를 직접 사용하면 RTOS 인자를 명시할 수 있지만 이것만으로 결정성이 보장되지는 않습니다. 생성 실패·stack·priority·allocator·entry object 수명과 종료 protocol을 함께 설계합니다. destructor에서 임의 vTaskDelete를 호출하는 wrapper는 task 내부 C++ 자원 정리와 handle 수명을 보장하지 않으므로 사용하지 않습니다. cooperative stop·실제 종료 확인 뒤 owner를 파괴하는 계약이 필요합니다.

## Static Queue Template — Type Safety + No Heap

위 StaticQueue는 raw byte copy 대상만 허용합니다. std::string·unique_ptr 등 비자명 객체를 그대로 queue로 보내면 생성/소멸·ownership이 복사되지 않습니다. pointer 메시지 역시 trivially copyable일 수 있지만 pointee 수명과 ownership 이전은 별도 계약입니다.

이 wrapper의 RTOS queue storage는 객체 내부에 있습니다. 해당 객체 자체가 new로 생성되거나 T가 pointer를 가졌다면 전체 application이 no-heap이라는 결론은 나오지 않습니다. full/empty·timeout을 bool로 반환하고 파괴 전에 producer/consumer와 waiters를 종료해야 합니다.

## ETL — Embedded Template Library

ETL의 fixed-capacity container는 용량을 미리 정하는 대안입니다. 그러나 모든 ETL 기능이 무조건 no-exception/no-heap이고 모든 payload도 동적 할당을 하지 않는다고 보장할 수는 없습니다. 설정·element type·capacity 초과의 error policy를 확인합니다.

ETL은 예외와 error handler 등 여러 정책을 지원합니다. push 전에 full/capacity를 확인하거나 선택한 error 처리를 검증합니다. 표준 container도 allocator·reserve·사용 경로에 따라 비용이 다르므로 이름만으로 fragmentation/WCET 실패를 판정하지 않습니다. [Embedded C++ ETL](/blog/embedded/embedded-cpp/part4-02-etl-library)에서 구체적인 사용을 이어갑니다.

## 컴파일러 플래그 — RTTI와 Exception

-fno-rtti와 -fno-exceptions는 사용하는 기능·library ABI·error policy에 맞춰 선택합니다. 크기가 일정 비율 줄거나 WCET가 자동 증명된다는 보장은 없습니다. compile options, map·object size와 실제 경로를 비교합니다.

-fno-threadsafe-statics는 local static 최초 초기화의 concurrency 보호를 제거합니다. 여러 task가 첫 호출에 경쟁할 수 있다면 사용하지 않거나 시작 전에 초기화를 완료하는 등의 별도 계약이 필요합니다. 모든 RTOS build에 적용하는 표준 조합은 아닙니다.

## std::atomic — Cortex-M에서의 동작

std::atomic의 lock-free 여부는 type·alignment·target·toolchain 구현으로 확인합니다. is_always_lock_free는 compile-time trait이고 is_lock_free는 객체에 대한 조회입니다. Cortex-M3 이상이면 모든 word-sized specialization이 항상 lock-free라는 언어 보장은 없습니다.

ARMv7-M에 LDREXD/STREXD가 있어 64-bit atomic이 자동 lock-free라는 설명도 사용하지 않습니다. helper call/lock 경로와 ISR 안전성을 실제 object로 확인합니다. relaxed counter 하나는 다른 payload의 공개 순서를 보장하지 않으며 release/acquire·소유권 규칙을 별도로 정합니다.

## C++20 Coroutine — RTOS 위의 Async

coroutine은 stackless 상태 흐름을 표현하지만 frame allocation이 자동으로 없어지지는 않습니다. 다음은 **외부 scheduler나 timer에 handle을 넘기지 않는**, owner 한 명의 수명 예제입니다.

```cpp title="owned-routine.hpp"
#pragma once
#include <coroutine>
#include <exception>
class Routine {
public:
    struct promise_type;
    using handle = std::coroutine_handle<promise_type>;
    struct promise_type {
        Routine get_return_object() { return Routine(handle::from_promise(*this)); }
        std::suspend_always initial_suspend() noexcept { return {}; }
        std::suspend_always final_suspend() noexcept { return {}; }
        void return_void() noexcept {}
        void unhandled_exception() noexcept { std::terminate(); }
    };
    explicit Routine(handle h) : h_(h) {}
    ~Routine() { if (h_) h_.destroy(); }
    Routine(const Routine&) = delete;
    Routine& operator=(const Routine&) = delete;
    bool step() {
        if (!h_ || h_.done()) return false;
        h_.resume();
        return !h_.done();
    }
private:
    handle h_;
};
inline Routine two_steps(unsigned& phase) {
    phase = 1;
    co_await std::suspend_always{};
    phase = 2;
}
```

예제는 기본 frame allocation을 사용하므로 no-heap·RT-safe를 주장하지 않습니다. phase의 수명은 Routine보다 길어야 하며 동시에 resume/destroy하지 않습니다. RTOS timer bridge를 추가하면 cancel 뒤 이미 queue에 든 resume, worker 문맥, frame pool 소진, 완료/취소 acknowledgement까지 설계해야 합니다. 단순 schedule_resume_after 의사 함수 하나가 그 수명을 보장하지 않습니다.

## Virtual Function의 비용

virtual dispatch는 실제 build에서 indirect call 또는 devirtualized/inlined call이 될 수 있습니다. source·toolchain·memory 배치 없는 Cortex-M4 cycle 표와 RAII 24-byte 동일 assembly 표는 실측 근거로 사용하지 않습니다.

최적화된 object와 map에서 code size와 call path를 비교합니다. CRTP도 무조건 inline/작은 code를 보장하지 않으며 type별 인스턴스화 비용을 함께 확인합니다. [정적 다형성](/blog/embedded/embedded-cpp/part2-08-static-polymorphism)으로 연결합니다.

## 자주 보는 함정과 안티패턴

- RAII가 vTaskDelete·reset·비정상 종료에서도 소멸자를 실행한다고 가정하지 않습니다.
- lock 실패를 무시한 채 BasicLockable의 lock에서 반환하지 않습니다.
- byte-copy queue에 비자명 C++ 객체를 넣거나 pointer 수명을 생략하지 않습니다.
- 초기화 경쟁이 있는데 thread-safe statics를 끄지 않습니다.
- ISR에서 allocator·atomic helper·coroutine resume가 허용된다고 가정하지 않습니다.
- fixed-capacity·특정 compiler flag·coding standard 이름을 결정성의 증거로 쓰지 않습니다.

## 정리

- RTOS wrapper는 획득 실패·owner/handle 수명·삭제 문맥까지 드러내야 합니다.
- std::thread는 joinable인 채 파괴하면 terminate하며 자동 join/detach하지 않습니다.
- static queue의 raw copy·capacity·파괴 전 waiters 종료 조건을 지킵니다.
- atomic·ETL·compiler 옵션의 실제 target와 설정을 확인합니다.
- coroutine frame owner와 resume/cancel scheduler 계약을 분리합니다.

## 근거 자료

- [FreeRTOS V11.2.0 queue/semphr](https://github.com/FreeRTOS/FreeRTOS-Kernel/tree/V11.2.0/include).
- [C++ draft thread destructor](https://eel.is/c++draft/thread.thread.destr), [lock requirements](https://eel.is/c++draft/thread.req.lockable.basic), [coroutine](https://eel.is/c++draft/dcl.fct.def.coroutine).
- [ETL error handling](https://www.etlcpp.com/docs/utilities/error-handler/), [GCC C++ options](https://gcc.gnu.org/onlinedocs/gcc/C_002b_002b-Dialect-Options.html).



다음 part는 [Part 5](/blog/embedded/rtos/practical-internals/part5-04-porting)에서 RTOS porting과 시스템 통합 사례를 다룹니다.

## 관련 항목

- [4-12: AMP와 OpenAMP](/blog/embedded/rtos/practical-internals/part4-12-amp-openamp)
- [Embedded C++ 2-01: RAII 기초](/blog/embedded/embedded-cpp/part2-01-raii-basics)
- [Embedded C++ 2-08: Static Polymorphism (CRTP)](/blog/embedded/embedded-cpp/part2-08-static-polymorphism)
- [Embedded C++ 3-10: 소유권 모델](/blog/embedded/embedded-cpp/part3-10-ownership-model)
- [Embedded C++ 4-02: ETL Library](/blog/embedded/embedded-cpp/part4-02-etl-library)
