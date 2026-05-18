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

RAII 자체는 단순한 원리지만, *실제 사용*에서는 여러 표준 패턴이 *각자의 자리*를 가집니다.

- *단순 lock* — `std::lock_guard`
- *여러 mutex* — `std::scoped_lock`
- *수동 unlock/relock* 필요 — `std::unique_lock`
- *generic 자원* (FD, peripheral handle) — `std::unique_ptr` with custom deleter
- *임의 cleanup 코드* — `ScopeGuard` (Finally) 패턴

각 도구의 *언제, 왜, 어떻게*를 정리합니다.

## 패턴 1 — `std::lock_guard`

C++11. 가장 단순한 mutex RAII. *생성자에서 lock, 소멸자에서 unlock*.

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

C++17 — class template argument deduction:

```cpp
std::lock_guard lock(m);   // 타입 추론
```

특징:
- *복사/이동 불가*
- *unlock 수동 호출 불가* — scope이 끝까지 lock 유지
- *단일 mutex*만

`-fno-exceptions` 환경에서도 *동작*. mutex가 *예외 던지지 않으면* 무관.

### 임베디드 — RTOS 적응

`std::mutex`는 *OS thread* 가정. RTOS는 *자체 mutex API*. RAII wrapper 직접:

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

사용:

```cpp
FreeRtosMutex m;
int counter = 0;

void increment() {
    FreeRtosLockGuard lock(m);
    counter++;
}
```

## 패턴 2 — `std::scoped_lock` (C++17)

여러 mutex를 *deadlock 없이* 동시에 lock.

```cpp
std::mutex m1, m2;

void transfer(Account& from, Account& to, int amount) {
    std::scoped_lock lock(m1, m2);   // 두 mutex deadlock-free
    from.balance -= amount;
    to.balance += amount;
}
```

내부 알고리즘: *deadlock 회피 알고리즘* 사용 (보통 `try_lock` + back-off). 두 mutex가 *서로 다른 순서로 동시 호출*되어도 안전.

```cpp
// Thread A
std::scoped_lock lock(m1, m2);

// Thread B
std::scoped_lock lock(m2, m1);   // 다른 순서 OK
```

`std::lock_guard` 두 개로 *순서 다르게 잡으면 deadlock*. `scoped_lock`은 *피함*.

C++17 이전엔 `std::lock(m1, m2)` + `std::lock_guard` 두 개로 같은 효과.

## 패턴 3 — `std::unique_lock`

수동 *unlock/relock*이 필요한 경우. *condition variable*과 함께 자주 사용.

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

`cv.wait`는 *unlock 후 대기, signal 시 relock*. `unique_lock`이 *수동 unlock 가능*하므로 함께 동작.

특징:
- *unlock/relock 수동 호출 가능*
- *이동 가능* — 다른 함수로 lock 이전
- *lock_guard보다 약간 무거움* (상태 추적 필드)

임베디드에서 *condition variable 안 쓰면* `lock_guard`/`scoped_lock`로 충분.

## 패턴 4 — `std::unique_ptr` with Custom Deleter

`unique_ptr`은 *RAII의 모범 사례*. 기본은 `delete`로 해제, *커스텀 deleter*로 *어떤 자원도* 관리.

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

조금 무거움 (`new int`). *값 타입* 활용:

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

`unique_ptr`이 *pool에서 알아서 free*. heap 자체 안 씀.

### 함수 포인터 deleter — runtime 비용 발생

```cpp
// 함수 포인터 — unique_ptr이 한 word 추가
using UniqueFile = std::unique_ptr<FILE, decltype(&fclose)>;
UniqueFile f(fopen("data.bin", "r"), &fclose);
```

*sizeof(UniqueFile)이 8바이트* (포인터 + 함수 포인터). *empty class deleter*(struct/lambda)는 *empty base optimization*으로 *4바이트*.

임베디드는 *empty struct deleter* 권장.

## 패턴 5 — `ScopeGuard` / Finally 패턴

임의의 *cleanup 코드*를 RAII로. *클래스 만들기 귀찮은* 일회성 자원.

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

사용:

```cpp
void process() {
    char* buf = (char*)malloc(1024);
    FINALLY(free(buf));   // 함수 끝에서 자동 free

    if (validate(buf) < 0) return;   // 정상 free
    do_work(buf);
    // 정상 free
}
```

C++ Core Guidelines의 `gsl::finally`도 같은 패턴.

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

함수 끝/return/예외 — 모두 UART off 보장.

### `dismiss` — commit 패턴

자원 *반환을 취소*. *transaction 패턴*.

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

특정 *enable/disable* 패턴을 *반복할 때* 작성.

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

C++17 `auto` non-type template parameter 활용. *컴파일 타임에 함수 포인터 박힘* → *오버헤드 0*.

## 패턴 7 — Resource Handle with Move

자원을 *함수 간 이전*하고 싶을 때 — *move-only 타입*.

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

자원이 *복사 안 됨*. *오직 이전*. *unique_ptr과 유사*하지만 *별도 heap 객체 없음*.

## 패턴 8 — Critical Section with Interrupt Preservation

ARM Cortex-M에서 *interrupt 상태 보존*:

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

*nested critical section 안전*. 이전에 *enabled였으면 enable, disabled였으면 그대로*.

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

### 1. *temporary scope_lock*
```cpp
std::lock_guard(m);   // 임시 객체 — 즉시 소멸 → lock 안 됨!
```
변수에 *바인딩*. `std::lock_guard lock(m)`.

### 2. *unique_ptr의 함수 포인터 deleter*
```cpp
std::unique_ptr<FILE, decltype(&fclose)> f(fopen(...), &fclose);
```
*sizeof 두 배*. struct deleter 권장.

### 3. *ScopeGuard 함수 호출 빠짐*
```cpp
auto guard = make_scope_guard([&]{ cleanup(); });
guard.dismiss();   // 의도와 다르게 호출
do_more();
// dismiss 되어 cleanup 안 함
```
`dismiss`는 *commit 의도*만.

### 4. *lock_guard scope 너무 짧음*
```cpp
{
    std::lock_guard lock(m);
}
counter++;   // unlock 상태에서 접근
```
*보호 범위*에 *접근 코드 포함*.

### 5. *RAII로 자원 *시작*만, *종료*는 다른 곳*
```cpp
class Starter {
    Starter() { peripheral_init(); }
    // 소멸자 정의 안 함 → cleanup 누락
};
```
대칭 *생성/소멸*.

### 6. *Move 후 destructor가 자원 해제 시도*
```cpp
Handle(Handle&& other) : fd_(other.fd_) {}   // other.fd_ 안 비움
~Handle() { close(fd_); }   // 두 객체 모두 close → double close
```
move 시 *원본 무효화*: `other.fd_ = -1`.

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

*동일*. RAII는 *zero-cost*.

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

[Part 2-03: constexpr 기초](/blog/embedded/embedded-cpp/part2-03-constexpr-basics) — *컴파일 타임 계산*으로 런타임 코드 제거. `-Os`보다 더 강력한 *기능적 0 비용*.
