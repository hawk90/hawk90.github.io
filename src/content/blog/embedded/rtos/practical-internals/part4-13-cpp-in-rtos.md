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

> **"RTOS C++ = C API + RAII + 제한된 STL입니다."** — heap과 exception을 피하고 *scope-based* 자원 관리만 더해도 짝을 잃은 unlock 같은 실수가 구조적으로 사라집니다.

## 어떤 문제를 푸는가

FreeRTOS와 Zephyr의 공개 API는 *C 함수*입니다. mutex를 잡으면 반드시 풀고, queue handle을 만들면 반드시 해제해야 합니다. 짝을 빠뜨리면 deadlock 또는 자원 leak이 발생합니다.

C에서는 이 짝맞춤을 개발자가 매번 손으로 한다는 점이 가장 큰 위험입니다. 한 함수에 return path가 다섯 개라면 unlock도 다섯 곳에 적어야 하고, 새 path를 추가할 때 하나만 빠뜨려도 *조용히* 자원이 새기 시작합니다.

C++가 RTOS에 들어오는 첫 번째 가치는 **RAII**입니다. `MutexGuard` 같은 객체 하나만 도입해도, 정상 scope exit와 지원되는 exception unwind에서 unlock을 짝지을 수 있습니다. vTaskDelete·reset·longjmp가 C++ scope를 정상 종료하는 것은 아닙니다. 두 번째 가치는 *type-safe template*입니다. `xQueueCreate`가 void pointer로 다루던 메시지가 `StaticQueue<Cmd, 16>`처럼 type을 보존한 채 안전하게 다뤄집니다.

다만 RTOS는 *heap 사용 제한, 결정성 요구, code size 제약*이라는 환경 안에서 동작합니다. 이번 편은 쓸 것과 피할 것의 경계를 실제 빌드로 확인합니다. 이 글의 Homebrew `arm-none-eabi-g++` 16.2.0에는 C++ 표준 라이브러리 헤더(`<type_traits>`, `<mutex>`, `<coroutine>`)가 없어서, 아래 wrapper들은 Debian 13 arm64 guest에서 FreeRTOS V11.2.0 POSIX port(`portable/ThirdParty/GCC/Posix`)에 올려 g++ 14.2.0 `-std=c++20`으로 돌렸습니다. Cortex-M 쪽 code generation은 `arm-none-eabi-gcc`의 C builtin으로 따로 확인했습니다.

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

`-fno-exceptions` 환경에서도 동작합니다. 소멸자는 return·break·마지막 `}` 어느 쪽으로 scope를 나가도 불리고, exception unwinding은 그중 한 경로일 뿐입니다. 호텔 방 카드키를 문 옆 홈에 꽂아 두면 방을 나갈 때 전등이 저절로 꺼지는 것처럼, 나가는 길이 어디든 정리가 따라옵니다.

POSIX port 위에서 `MutexGuard`가 잡은 동안 holder가 자기 자신인지, scope를 나간 뒤 holder가 비었는지 확인했습니다.

```text
MutexGuard locked()=1, holder is me: 1
after scope, holder=(nil)
```

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

`__get_PRIMASK()`·`__disable_irq()`·`__set_PRIMASK()`는 CMSIS core header의 함수입니다. 진입 때 PRIMASK를 저장했다가 그대로 되돌리므로, 이미 interrupt가 막힌 상태에서 불러도 나갈 때 멋대로 풀지 않습니다. 다만 PRIMASK는 이 core의 configurable interrupt만 막을 뿐 다른 core나 DMA는 막지 못하고(4-07), FreeRTOS의 `taskENTER_CRITICAL()`이 쓰는 BASEPRI·nesting count와는 별개의 장치입니다. 한 critical section 안에서 둘을 섞지 않습니다. 이 클래스는 실행하지 않았습니다. 자세한 RAII 일반론은 [Embedded C++ 2-01](/blog/embedded/embedded-cpp/part2-01-raii-basics)에서 다룹니다.

## std::lock_guard와 호환되는 Mutex Wrapper

`std::lock_guard`는 C++ 표준의 BasicLockable 요구사항(`lock()`·`unlock()`)을 만족하는 타입이면 받습니다. `lock()`은 돌아올 때 소유권을 가져야 하므로, take 실패를 무시하고 돌아오는 wrapper는 이 계약을 어깁니다. 아래 `Mutex::lock()`이 실패 시 `std::abort()`하는 이유입니다. 다음은 FreeRTOS V11.2.0의 static mutex/queue를 묶은 예입니다.

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

`Cmd`(16-bit id + 6 byte) 4칸짜리 `StaticQueue`와 `Mutex`를 전역으로 두고 POSIX port에서 돌렸습니다.

```text
lock_guard<Mutex> acquired and released
push 0 -> true
push 1 -> true
push 2 -> true
push 3 -> true
push 4 -> false (full)
pop id=0
pop id=1
pop id=2
pop id=3
```

`std::lock_guard<Mutex>`가 그대로 컴파일·동작했고, 다섯 번째 push는 timeout 0이라 `false`로 돌아왔습니다. 이 `Mutex`는 task 전용이고 recursive가 아니며, 기다리는 task가 없을 때만 파괴합니다. 다른 task가 `vTaskDelete()`로 이 task를 지우면 그 task stack 위의 guard 소멸자는 불리지 않습니다. `vTaskDelete()`는 C++ scope를 빠져나가는 것이 아니라 그 task를 더 이상 실행하지 않는 것이기 때문입니다.

## std::thread vs xTaskCreate — 결정성의 차이

C++ working draft [thread.thread.destr]는 `~thread()`의 효과를 "If joinable(), invokes terminate"로 정합니다. 자동 join도 detach도 하지 않습니다. thread 함수가 이미 반환했어도 join하기 전까지는 joinable입니다. guest에서 thread 본체가 끝나기를 100 ms 기다린 뒤 join 없이 `main()`을 끝냈습니다.

```text
thread body ran and returned
joinable after body returned: 1
terminate called without an active exception
bash: line 1:  9599 Aborted                 ./thread_dtor
exit=134
```

본체가 끝났는데도 `joinable()`은 1이었고, 소멸자가 `std::terminate()`로 프로그램을 끝냈습니다. C++20의 `std::jthread`는 소멸자에서 join하므로 다른 타입입니다.

또 `std::thread` 생성자는 priority와 stack 크기를 받지 않습니다. RTOS task에 필요한 이 두 값을 정하려면 `xTaskCreate()`를 직접 부릅니다. 이때 task를 감싼 C++ 클래스의 소멸자에서 `vTaskDelete()`를 부르는 설계는 피합니다. 앞에서 본 대로 지워지는 task의 stack 위 객체는 소멸자가 불리지 않으므로, task에게 멈추라고 알리고 task가 스스로 끝났다고 알려 온 뒤에 owner를 파괴합니다.

## Static Queue Template — Type Safety + No Heap

FreeRTOS queue는 `memcpy()`로 byte를 복사하므로(3-07), 복사 생성자가 있는 객체를 넣으면 생성자 없이 byte만 옮겨집니다. `StaticQueue`의 첫 `static_assert`가 그것을 막습니다. `StaticQueue<std::string, 4>`를 선언하면 컴파일이 멈춥니다.

```text
rtos-objects.hpp:28:24: error: static assertion failed: queue copies raw bytes
```

pointer는 trivially copyable이라 통과하지만, 가리키는 객체의 수명과 누가 해제할지는 queue가 관리하지 않습니다(4-05의 이중 반환 예). queue의 저장소는 `StaticQueue` 객체 안에 있으므로, 이 객체를 `new`로 만들면 그 저장소도 heap에 놓입니다.

## ETL — Embedded Template Library

ETL(Embedded Template Library)의 `etl::vector<T, N>` 같은 container는 용량을 template 인자로 정해 객체 안에 저장소를 둡니다. 용량을 넘으면 어떻게 되는지는 설정에 달려 있습니다. ETL 문서의 "Error handler" 페이지는 `ETL_THROW_EXCEPTIONS`(예외), `ETL_USE_ASSERT_FUNCTION`(사용자 assert handler), `ETL_LOG_ERRORS`(사용자 error callback), `ETL_NO_CHECKS`(검사 없음)를 들고, 아무것도 정의하지 않으면 `assert`를 쓴다고 적습니다. `assert`는 `NDEBUG`가 정의된 release build에서 사라지므로, 기본 설정의 release build에서는 용량 초과가 조용히 지나갑니다. 같은 페이지는 push/pop 검사(`ETL_CHECK_PUSH_POP`)가 기본으로 꺼져 있고 호출 쪽이 full/empty를 확인한다는 전제라고 적습니다. ETL은 이 글에서 빌드하지 않았습니다. [Embedded C++ ETL](/blog/embedded/embedded-cpp/part4-02-etl-library)에서 구체적인 사용을 이어갑니다.

## 컴파일러 플래그 — RTTI와 Exception

`-fno-rtti`와 `-fno-exceptions`가 줄이는 크기는 프로그램마다 다르고, 이 글에서는 재지 않았습니다. 예전 판의 "일정 비율 감소" 같은 수치는 출처가 없어 지웠습니다.

`-fno-threadsafe-statics`는 함수 안 `static` 객체의 첫 초기화를 감싸는 guard 호출을 없앱니다. g++ 14.2.0 `-O2`로 `static S s;`를 가진 함수를 컴파일하고 `nm`으로 봤습니다.

```text
== g++ -O2 -c statics.cpp 
                 U _ZN1SC1Ev
                 U __cxa_guard_abort
                 U __cxa_guard_acquire
                 U __cxa_guard_release
== g++ -O2 -c statics.cpp -fno-threadsafe-statics
                 U _ZN1SC1Ev
```

옵션을 주면 `__cxa_guard_acquire`·`release`·`abort`가 사라집니다. 두 task가 처음 호출에 동시에 들어오면 constructor가 두 번 돌 수 있다는 뜻이므로, 이 옵션을 쓴다면 scheduler 시작 전에 그 함수를 한 번 불러 초기화를 끝내 둡니다.

## std::atomic — Cortex-M에서의 동작

`std::atomic<T>::is_always_lock_free`는 컴파일러의 `__atomic_always_lock_free(sizeof(T), 0)`과 같은 정보입니다. 헤더 없이 이 builtin과 `__atomic_fetch_add`를 `arm-none-eabi-gcc` 16.2.0 `-O2`로 세 core에 컴파일했습니다.

| `-mcpu` | 1·2·4 byte always lock-free | 8 byte | 4 byte fetch_add | 8 byte fetch_add |
| --- | --- | --- | --- | --- |
| cortex-m0 | 아님 | 아님 | `__atomic_fetch_add_4` 호출 | `__atomic_fetch_add_8` 호출 |
| cortex-m3 | 1 | 아님 | `ldrex`/`strex` loop | `__atomic_fetch_add_8` 호출 |
| cortex-m4 | 1 | 아님 | `ldrex`/`strex` loop | `__atomic_fetch_add_8` 호출 |

M3·M4에서도 64-bit atomic은 lock-free가 아니라 외부 helper 호출이 됐고, M0에서는 32-bit도 helper입니다. 이 helper는 이 툴체인의 libgcc에 없어서 M3용 64-bit `fetch_add`를 `-lgcc`로 링크하면 `undefined reference to '__atomic_fetch_add_8'`이 납니다. 쓰려면 직접 구현해야 하고, 그 구현이 interrupt를 막는 방식이라면 ISR에서의 안전성도 그 구현에 달립니다. relaxed counter 하나는 다른 데이터의 공개 순서를 보장하지 않으므로, 데이터를 넘길 때는 release store와 acquire load를 짝지어 씁니다(4-08).

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

`initial_suspend()`가 `suspend_always`라 만든 직후에는 본체가 돌지 않고, `step()`마다 다음 `co_await`까지 갑니다. POSIX port 위 task에서 돌린 결과입니다.

```text
created: phase=0
step1: phase=1 more=1
step2: phase=2 more=0
step3: phase=2 more=0
```

두 번째 step에서 본체가 끝나 `final_suspend()`에 멈추고, 세 번째 step은 `done()`이라 아무 일도 하지 않습니다. 이 예는 coroutine frame을 기본 `operator new`로 잡으므로 heap을 씁니다. heap 없이 쓰려면 `promise_type`에 `operator new`를 정의해 고정 pool에서 frame을 꺼내야 합니다. RTOS timer가 나중에 `resume()`을 부르게 만들면, timer가 queue에 넣어 둔 resume이 owner가 frame을 destroy한 뒤에 실행되는 경우까지 설계해야 합니다.

## Virtual Function의 비용

virtual 호출은 vtable을 거치는 간접 호출이지만, 컴파일러가 타입을 알면 직접 호출로 바꾸기도 합니다(devirtualization). 이 글에서는 재지 않았고, 예전 판의 Cortex-M4 cycle 표와 "RAII는 24 byte 동일 assembly" 표는 출처가 없어 지웠습니다. objdump에서 `blx rN`(간접)인지 `bl 함수`(직접)인지 보면 어느 쪽이 됐는지 알 수 있습니다. [정적 다형성](/blog/embedded/embedded-cpp/part2-08-static-polymorphism)으로 연결합니다.

## 자주 보는 함정과 안티패턴

- RAII가 `vTaskDelete()`나 reset에서도 소멸자를 실행한다고 봅니다.
- take 실패를 무시하고 `lock()`에서 돌아옵니다.
- byte-copy queue에 `std::string` 같은 객체를 넣습니다. `static_assert`로 막습니다.
- 여러 task가 첫 호출을 할 수 있는데 `-fno-threadsafe-statics`를 켭니다.
- Cortex-M에서 `std::atomic<uint64_t>`가 lock-free라고 봅니다. 위 실행에서 M3도 helper 호출이었습니다.
- `std::thread`를 join 없이 파괴합니다.

## 정리

- `MutexGuard`와 `std::lock_guard<Mutex>`는 FreeRTOS POSIX port에서 scope를 나갈 때 mutex를 놓았습니다.
- `std::thread`는 본체가 끝나도 joinable이고, join 없이 파괴하면 terminate합니다(exit 134).
- `StaticQueue`는 trivially copyable이 아닌 타입을 `static_assert`로 거절하고, 가득 차면 `false`를 돌려줍니다.
- Cortex-M3/M4의 64-bit atomic과 M0의 32-bit atomic은 lock-free가 아니라 helper 호출입니다.
- `-fno-threadsafe-statics`는 `__cxa_guard_*` 호출을 없앱니다.

## 근거 자료

- [FreeRTOS V11.2.0 queue/semphr](https://github.com/FreeRTOS/FreeRTOS-Kernel/tree/V11.2.0/include).
- [C++ draft thread destructor](https://eel.is/c++draft/thread.thread.destr), [lock requirements](https://eel.is/c++draft/thread.req.lockable.basic), [coroutine](https://eel.is/c++draft/dcl.fct.def.coroutine).
- [ETL error handling](https://www.etlcpp.com/docs/utilities/error-handler/), [GCC C++ options](https://gcc.gnu.org/onlinedocs/gcc/C_002b_002b-Dialect-Options.html).
- [FreeRTOS V11.2.0 POSIX port](https://github.com/FreeRTOS/FreeRTOS-Kernel/tree/V11.2.0/portable/ThirdParty/GCC/Posix): 이 글의 C++ 실행 환경.



다음 [Part 5의 5-01](/blog/embedded/rtos/practical-internals/part5-01-freertos-source)부터는 실제 RTOS 소스를 읽고, porting과 선택 기준으로 이어집니다.

## 관련 항목

- [4-12: AMP와 OpenAMP](/blog/embedded/rtos/practical-internals/part4-12-amp-openamp)
- [Embedded C++ 2-01: RAII 기초](/blog/embedded/embedded-cpp/part2-01-raii-basics)
- [Embedded C++ 2-08: Static Polymorphism (CRTP)](/blog/embedded/embedded-cpp/part2-08-static-polymorphism)
- [Embedded C++ 3-10: 소유권 모델](/blog/embedded/embedded-cpp/part3-10-ownership-model)
- [Embedded C++ 4-02: ETL Library](/blog/embedded/embedded-cpp/part4-02-etl-library)
