---
title: "Part 2-02: RAII 실전 패턴"
date: 2026-05-14T02:00:00
description: "scoped_lock, unique_ptr with custom deleter, ScopedXxx, Finally — 임베디드에 자주 등장하는 RAII 표준 패턴."
series: "Embedded C++ for Real Systems"
seriesOrder: 10
tags: [cpp, embedded, raii, scoped-lock, unique-ptr, finally, lock-guard]
type: tech
---

## 한 줄 요약

> **"표준 라이브러리가 5개의 RAII 도구를 제공합니다."** — `lock_guard`, `scoped_lock`, `unique_lock`, `unique_ptr`, `ScopeGuard` 패턴.

## 어떤 문제를 푸는가

RAII 자체는 단순한 원리지만, 실제 사용에서는 여러 표준 패턴이 각자의 자리를 가집니다.

- 단순 lock에는 `std::lock_guard`를 씁니다.
- 여러 mutex를 동시에 잡을 때는 `std::scoped_lock`이 어울립니다.
- 수동 unlock/relock이 필요하면 `std::unique_lock`을 씁니다.
- generic 자원(FD, peripheral handle)은 custom deleter를 단 `std::unique_ptr`로 감쌉니다.
- 임의 cleanup 코드는 `ScopeGuard`(Finally) 패턴으로 처리합니다.

각 도구가 언제, 왜, 어떻게 쓰이는지 정리합니다.

## 패턴 1 — `std::lock_guard`

C++11에 도입된 가장 단순한 mutex RAII입니다. 생성자에서 lock, 소멸자에서 unlock합니다.

```cpp
#include <mutex>

std::mutex m;
int counter = 0;

void increment() {
    std::lock_guard<std::mutex> lock(m);   // lock 획득
    counter++;
    // 소멸 시 unlock
}
```

C++17부터는 class template argument deduction이 가능합니다.

```cpp
std::lock_guard lock(m);   // 타입 추론
```

특징은 다음과 같습니다.
- 복사와 이동이 불가능합니다.
- unlock을 수동으로 호출할 수 없고 scope이 끝날 때까지 lock이 유지됩니다.
- 단일 mutex만 다룹니다.

`-fno-exceptions` 환경에서도 동작합니다. mutex가 예외를 던지지 않는 한 무관합니다.

### 임베디드 — RTOS 적응

`std::mutex`는 OS thread를 가정합니다. RTOS는 자체 mutex API를 쓰므로 RAII wrapper를 직접 만듭니다.

```cpp
class FreeRtosMutex {
    SemaphoreHandle_t handle_;
public:
    FreeRtosMutex() : handle_(xSemaphoreCreateMutex()) {}
    ~FreeRtosMutex() { vSemaphoreDelete(handle_); }
    SemaphoreHandle_t native() { return handle_; }

    FreeRtosMutex(const FreeRtosMutex&) = delete;
};

class FreeRtosLockGuard {
    SemaphoreHandle_t handle_;
public:
    explicit FreeRtosLockGuard(FreeRtosMutex& m) : handle_(m.native()) {
        xSemaphoreTake(handle_, portMAX_DELAY);
    }
    ~FreeRtosLockGuard() {
        xSemaphoreGive(handle_);
    }

    FreeRtosLockGuard(const FreeRtosLockGuard&) = delete;
};
```

사용은 다음과 같습니다.

```cpp
FreeRtosMutex m;
int counter = 0;

void increment() {
    FreeRtosLockGuard lock(m);
    counter++;
}
```

## 패턴 2 — `std::scoped_lock` (C++17)

여러 mutex를 deadlock 없이 동시에 lock합니다.

```cpp
std::mutex m1, m2;

void transfer(Account& from, Account& to, int amount) {
    std::scoped_lock lock(m1, m2);   // 두 mutex deadlock-free
    from.balance -= amount;
    to.balance += amount;
}
```

내부적으로는 deadlock 회피 알고리즘(보통 `try_lock` + back-off)을 사용합니다. 두 mutex가 서로 다른 순서로 동시에 호출돼도 안전합니다.

```cpp
// Thread A
std::scoped_lock lock(m1, m2);

// Thread B
std::scoped_lock lock(m2, m1);   // 다른 순서 OK
```

`std::lock_guard` 두 개를 다른 순서로 잡으면 deadlock이 발생하지만, `scoped_lock`은 이를 피합니다.

C++17 이전에는 `std::lock(m1, m2)`와 `std::lock_guard` 두 개로 같은 효과를 냈습니다.

## 패턴 3 — `std::unique_lock`

수동 unlock/relock이 필요한 경우에 씁니다. condition variable과 함께 자주 사용합니다.

```cpp
std::mutex m;
std::condition_variable cv;
bool ready = false;

void wait_for_event() {
    std::unique_lock lock(m);
    cv.wait(lock, []{ return ready; });   // wait가 unlock/relock 함
    // ready == true
}

void set_event() {
    {
        std::lock_guard lock(m);
        ready = true;
    }
    cv.notify_one();
}
```

`cv.wait`는 unlock 후 대기하다 signal을 받으면 relock합니다. `unique_lock`이 수동 unlock을 지원하므로 함께 동작합니다.

특징은 다음과 같습니다.
- unlock과 relock을 수동으로 호출할 수 있습니다.
- 이동이 가능하므로 다른 함수로 lock을 넘길 수 있습니다.
- 상태 추적 필드 때문에 `lock_guard`보다 약간 무겁습니다.

임베디드에서 condition variable을 쓰지 않는다면 `lock_guard`나 `scoped_lock`이면 충분합니다.

## 패턴 4 — `std::unique_ptr` with Custom Deleter

`unique_ptr`은 RAII의 모범 사례입니다. 기본은 `delete`로 해제하지만, custom deleter로 어떤 자원이든 관리할 수 있습니다.

```cpp
// File descriptor RAII
struct FdDeleter {
    void operator()(int* fd) const {
        if (fd && *fd >= 0) close(*fd);
        delete fd;
    }
};

using UniqueFd = std::unique_ptr<int, FdDeleter>;

UniqueFd open_file(const char* path) {
    int fd = open(path, O_RDONLY);
    if (fd < 0) return nullptr;
    return UniqueFd(new int(fd));
}
```

`new int`가 들어가 조금 무겁습니다. 값 타입을 활용하면 더 가볍게 만들 수 있습니다.

```cpp
struct Fd {
    int value;
    operator int() const { return value; }
};

struct FdDeleter {
    void operator()(Fd* fd) const {
        if (fd && fd->value >= 0) close(fd->value);
        delete fd;
    }
};
```

### 임베디드 — Pool에서 할당된 객체

```cpp
struct PoolDeleter {
    Pool* pool;
    void operator()(uint8_t* block) const {
        if (block) pool->free(block);
    }
};

using PoolPtr = std::unique_ptr<uint8_t, PoolDeleter>;

PoolPtr alloc_from_pool(Pool& p) {
    auto* block = static_cast<uint8_t*>(p.alloc());
    return PoolPtr(block, {&p});
}
```

`unique_ptr`이 pool에서 알아서 free하며, heap 자체는 사용하지 않습니다.

### 함수 포인터 deleter — runtime 비용 발생

```cpp
// 함수 포인터 — unique_ptr이 한 word 추가
using UniqueFile = std::unique_ptr<FILE, decltype(&fclose)>;
UniqueFile f(fopen("data.bin", "r"), &fclose);
```

`sizeof(UniqueFile)`이 8바이트가 됩니다(포인터 + 함수 포인터). struct나 lambda 같은 empty class deleter는 empty base optimization으로 4바이트로 줄어듭니다.

임베디드에서는 empty struct deleter를 권장합니다.

## 패턴 5 — `ScopeGuard` / Finally 패턴

임의의 cleanup 코드를 RAII로 묶는 패턴입니다. 클래스를 따로 만들기 번거로운 일회성 자원에 어울립니다.

```cpp
template<typename F>
class ScopeGuard {
    F func_;
    bool dismissed_ = false;
public:
    explicit ScopeGuard(F f) : func_(std::move(f)) {}
    ~ScopeGuard() { if (!dismissed_) func_(); }

    void dismiss() { dismissed_ = true; }

    ScopeGuard(const ScopeGuard&) = delete;
};

// 헬퍼
template<typename F>
ScopeGuard<F> make_scope_guard(F f) { return ScopeGuard<F>(std::move(f)); }

// 매크로 (선택)
#define FINALLY(code) auto _guard_##__LINE__ = make_scope_guard([&]{ code; })
```

사용은 다음과 같습니다.

```cpp
void process() {
    char* buf = (char*)malloc(1024);
    FINALLY(free(buf));   // 함수 끝에서 자동 free

    if (validate(buf) < 0) return;   // 정상 free
    do_work(buf);
    // 정상 free
}
```

C++ Core Guidelines의 `gsl::finally`도 같은 패턴입니다.

### 임베디드 — peripheral 일시 활성

```cpp
void send_uart_burst(const uint8_t* data, size_t len) {
    USART2->CR1 |= USART_CR1_UE;   // UART on
    auto guard = make_scope_guard([]{
        USART2->CR1 &= ~USART_CR1_UE;   // UART off — 항상 실행
    });

    for (size_t i = 0; i < len; ++i) {
        USART2->DR = data[i];
        while (!(USART2->SR & USART_SR_TC));
    }
}
```

함수 종료, return, 예외 어느 경로에서도 UART off가 보장됩니다.

### `dismiss` — commit 패턴

자원 반환을 취소하는 transaction 패턴입니다.

```cpp
bool transfer(Account& from, Account& to, int amount) {
    from.balance -= amount;
    auto rollback = make_scope_guard([&]{ from.balance += amount; });

    if (!to.deposit(amount)) return false;   // rollback 발동

    rollback.dismiss();   // 성공 — rollback 취소
    return true;
}
```

## 패턴 6 — Scoped<T> 일반 wrapper

특정 enable/disable 패턴을 반복해서 쓸 때 작성합니다.

```cpp
template<auto Enable, auto Disable>
struct Scoped {
    Scoped() { Enable(); }
    ~Scoped() { Disable(); }
    Scoped(const Scoped&) = delete;
};

// 사용
void enable_pins()  { GPIOA->MODER |=  0x3; }
void disable_pins() { GPIOA->MODER &= ~0x3; }

using ScopedPins = Scoped<&enable_pins, &disable_pins>;

void use_pins() {
    ScopedPins guard;
    // pins 활성 상태
}
```

C++17의 `auto` non-type template parameter를 활용합니다. 함수 포인터가 컴파일 타임에 박히므로 오버헤드가 0입니다.

## 패턴 7 — Resource Handle with Move

자원을 함수 간에 이전하고 싶을 때 쓰는 move-only 타입입니다.

```cpp
class FileHandle {
    int fd_ = -1;
public:
    explicit FileHandle(int fd) : fd_(fd) {}
    ~FileHandle() { if (fd_ >= 0) close(fd_); }

    FileHandle(const FileHandle&) = delete;
    FileHandle& operator=(const FileHandle&) = delete;

    // Move
    FileHandle(FileHandle&& other) noexcept : fd_(other.fd_) {
        other.fd_ = -1;
    }
    FileHandle& operator=(FileHandle&& other) noexcept {
        if (this != &other) {
            if (fd_ >= 0) close(fd_);
            fd_ = other.fd_;
            other.fd_ = -1;
        }
        return *this;
    }

    int get() const { return fd_; }
};

FileHandle open_data() {
    FileHandle f(open("data.bin", O_RDONLY));
    return f;   // move (또는 RVO)
}

void process() {
    FileHandle f = open_data();   // 이전
    // 사용
}
```

자원이 복사되지 않고 오직 이전만 가능합니다. `unique_ptr`과 유사하지만 별도의 heap 객체를 두지 않습니다.

## 패턴 8 — Critical Section with Interrupt Preservation

ARM Cortex-M에서 interrupt 상태를 보존하는 패턴입니다.

```cpp
class CriticalSection {
    uint32_t primask_;
public:
    CriticalSection() : primask_(__get_PRIMASK()) {
        __disable_irq();
    }
    ~CriticalSection() {
        __set_PRIMASK(primask_);   // 원래 상태 복원
    }

    CriticalSection(const CriticalSection&) = delete;
};
```

nested critical section에서도 안전합니다. 이전 상태가 enabled였다면 enable로, disabled였다면 그대로 복원됩니다.

```cpp
void outer() {
    CriticalSection cs1;   // disable interrupt

    counter++;
    inner();   // 안에서 또 cs

    // cs1 소멸 → 원래(enabled) 복원
}

void inner() {
    CriticalSection cs2;   // 이미 disabled — 변화 없음
    // ...
    // cs2 소멸 → 여전히 disabled (outer 안)
}
```

## 패턴 비교 요약

| 패턴 | 자원 | 특징 | 사용 시점 |
| --- | --- | --- | --- |
| `lock_guard` | 단일 mutex | 단순, copy-only-delete | 가장 흔한 case |
| `scoped_lock` | 여러 mutex | deadlock 회피 | 2개+ mutex |
| `unique_lock` | 단일 mutex | unlock/relock | cv.wait |
| `unique_ptr` + custom deleter | generic | heap pointer | 동적 자원 |
| `ScopeGuard` | 임의 코드 | lambda 기반 | 일회성 cleanup |
| `Scoped<>` | enable/disable | 함수 포인터 template | 반복 패턴 |
| Move-only handle | 자원 ownership | 함수 간 이전 | FD, peripheral handle |
| `CriticalSection` | interrupt state | 보존 + 복원 | nested ISR sync |

## 자주 보는 함정과 안티패턴

### 1. temporary lock_guard
```cpp
std::lock_guard(m);   // 임시 객체 — 즉시 소멸 → lock 안 됨!
```
임시 객체는 즉시 소멸하므로 lock이 유지되지 않습니다. 반드시 변수에 바인딩해 `std::lock_guard lock(m)` 형태로 씁니다.

### 2. unique_ptr의 함수 포인터 deleter
```cpp
std::unique_ptr<FILE, decltype(&fclose)> f(fopen(...), &fclose);
```
sizeof가 두 배로 늘어납니다. struct deleter를 권장합니다.

### 3. ScopeGuard 함수 호출 빠짐
```cpp
auto guard = make_scope_guard([&]{ cleanup(); });
guard.dismiss();   // 의도와 다르게 호출
do_more();
// dismiss 되어 cleanup 안 함
```
`dismiss`는 commit이 성공한 경우에만 호출해야 합니다.

### 4. lock_guard scope가 너무 짧음
```cpp
{
    std::lock_guard lock(m);
}
counter++;   // unlock 상태에서 접근
```
보호 범위가 실제 접근 코드를 포함해야 합니다.

### 5. RAII로 자원의 시작만 묶고 종료는 다른 곳
```cpp
class Starter {
    Starter() { peripheral_init(); }
    // 소멸자 정의 안 함 → cleanup 누락
};
```
생성과 소멸은 대칭이어야 합니다.

### 6. Move 후 destructor가 자원을 두 번 해제
```cpp
Handle(Handle&& other) : fd_(other.fd_) {}   // other.fd_ 안 비움
~Handle() { close(fd_); }   // 두 객체 모두 close → double close
```
move 시 원본을 `other.fd_ = -1`처럼 무효화해야 합니다.

## 측정 — `lock_guard` 오버헤드

```text
# 수동 lock/unlock
manual_lock:
    bl      mutex_lock
    ldr     r3, [counter]; adds r3, #1; str r3, [counter]
    bl      mutex_unlock
    bx      lr

# lock_guard 사용
raii_lock:
    bl      mutex_lock           ; constructor 인라인
    ldr     r3, [counter]; adds r3, #1; str r3, [counter]
    bl      mutex_unlock         ; destructor 인라인
    bx      lr
```

완전히 동일합니다. RAII는 zero-cost입니다.

## 정리

- 표준 RAII 패턴은 5가지입니다 — `lock_guard`, `scoped_lock`, `unique_lock`, `unique_ptr+deleter`, `ScopeGuard`.
- 임베디드에서는 Scoped enable/disable, Move-only handle, Critical section with preservation 패턴이 추가됩니다.
- Custom deleter는 struct나 lambda로 작성해 empty class optimization을 받으며, 함수 포인터는 sizeof를 늘립니다.
- ScopeGuard는 일회성 cleanup의 보편 패턴이며 `gsl::finally`도 같은 역할을 합니다.
- 모든 RAII는 zero-cost이며 컴파일러가 생성자와 소멸자를 인라인합니다.

## 관련 항목

- [Part 2-01: RAII 기초](/blog/embedded/embedded-cpp/part2-01-raii-basics) — RAII 원리
- [Part 3-03: Pool Allocator 구현](/blog/embedded/embedded-cpp/part3-03-pool-allocator) — pool + unique_ptr
- [Part 3-09: 스마트 포인터 선택](/blog/embedded/embedded-cpp/part3-09-smart-pointer-choice) — unique_ptr vs shared_ptr
- [Part 4-03: Lock-free 기초](/blog/embedded/embedded-cpp/part4-03-lock-free-basics) — lock 없이 atomic

## 다음 글

[Part 2-03: constexpr 기초](/blog/embedded/embedded-cpp/part2-03-constexpr-basics) — 컴파일 타임 계산으로 런타임 코드를 제거합니다. `-Os`보다 더 강력한 기능적 0 비용을 달성합니다.
