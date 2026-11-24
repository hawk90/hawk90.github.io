---
title: "임베디드 RAII 기초 — 리소스 안전성과 결정적 소멸 보장"
slug: "embedded/embedded-cpp/part2-01-raii-basics"
date: 2026-04-29T09:09:00
description: "Resource Acquisition Is Initialization — 자원 생명주기를 객체 생명주기에 묶는 C++의 핵심 idiom."
series: "Embedded C++ for Real Systems"
seriesOrder: 9
tags: [cpp, embedded, raii, resource, destructor, exception-safety]
type: tech
topics: ["embedded"]
---

## 한 줄 요약

> **"자원 = 객체, 해제 = 소멸자."** — 정상적인 scope 이탈과 처리되는 예외의 stack unwinding에서 정리를 실행합니다.

## 어떤 문제를 푸는가

자원(메모리, 파일, mutex, peripheral)을 획득한 뒤 해제하지 않으면 누수가 발생합니다. C에서는 호출자가 직접 짝을 맞춰 줘야 합니다.

```c
// C: 짝 맞추기 어려움
void process() {
    char* buf = malloc(1024);
    FILE* f = fopen("data.bin", "rb");

    if (read_data(buf, f) < 0) {
        fclose(f);
        free(buf);     // 두 번 적어야
        return;
    }

    if (validate(buf) < 0) {
        fclose(f);
        free(buf);     // 또 두 번
        return;
    }

    fclose(f);
    free(buf);         // 또
}
```

경로마다 정리 코드를 반복해야 하고, 새 경로를 추가할 때 빠뜨리기 쉽습니다. 예외가 도는 환경이라면 `read_data` 안에서 던진 예외가 이 함수를 지나가는 경로마다 따로 정리 코드가 필요해집니다.

**RAII** (Resource Acquisition Is Initialization)는 이 문제를 언어 차원에서 해결합니다.

```cpp
// C++: 짝 자동
void process() {
    std::array<char, 1024> buf;       // stack 자동 해제
    std::ifstream f("data.bin", std::ios::binary);   // 소멸자가 close

    if (read_data(buf.data(), f) < 0) return;
    if (validate(buf.data()) < 0) return;
}
```

생성이 완료된 지역 객체는 정상적인 return에서 소멸합니다. 획득 실패 처리, 소유권 모델, 해제 함수 구현까지 올바른 경우 정리 누락을 줄일 수 있습니다. `abort`, `_Exit`, 리셋, 전원 차단은 이 보장에 포함되지 않습니다.

## RAII의 정의

자원을 객체 생명주기에 묶는 idiom입니다.

1. **생성자**가 자원을 획득합니다 (메모리 할당, mutex lock, peripheral enable).
2. **소멸자**가 자원을 해제합니다 (메모리 free, unlock, disable).
3. 객체의 scope가 곧 자원의 lifetime이 됩니다.

C++ 표준이 다음 시점에 소멸자 호출을 보장합니다.

- 함수가 return하면 모든 local 객체의 소멸자가 호출됩니다.
- 처리할 예외로 stack unwinding이 진행되면 생성이 완료된 자동 객체를 역순으로 소멸시킵니다. 생성에 실패한 객체 자체의 소멸자는 호출되지 않습니다. 처리되지 않은 예외와 `terminate` 경로에는 같은 정리 보장을 적용하지 않습니다.
- 객체가 delete되면 소멸자가 호출됩니다.
- `main`이 반환하거나 `exit`가 불리면 static 객체의 소멸자가 호출됩니다([basic.start.term]/1). `main`이 끝나지 않는 무한 루프 firmware에서는 이 시점이 오지 않습니다.

## 임베디드의 RAII — 5가지 자원

임베디드 RAII가 다루는 주요 자원은 다음 다섯입니다.

1. **Mutex / Lock** — RTOS sync primitive
2. **Peripheral** — GPIO, UART, SPI 활성/비활성
3. **Interrupt** — critical section
4. **Memory** — pool 할당 / 반환
5. **DMA** — channel 획득 / 해제

각각의 RAII 패턴을 차례로 살펴봅니다.

## RAII 패턴 1 — Mutex Lock

가장 흔한 RAII 예입니다. unlock을 빠뜨리는 사고를 막아 줍니다.

```cpp
// 위험 — 수동 lock/unlock
void shared_function() {
    osMutexAcquire(my_mutex, osWaitForever);

    if (some_condition()) return;   // unlock 누락!

    do_work();

    osMutexRelease(my_mutex);
}

// RAII — 자동 unlock
class MutexLock {
public:
    explicit MutexLock(osMutexId_t m) : mutex_(m) {
        locked_ = osMutexAcquire(mutex_, osWaitForever) == osOK;
    }
    ~MutexLock() {
        if (locked_) osMutexRelease(mutex_);
    }

    bool owns_lock() const noexcept { return locked_; }

    // 복사 금지 — 자원의 소유권 unique
    MutexLock(const MutexLock&) = delete;
    MutexLock& operator=(const MutexLock&) = delete;

private:
    osMutexId_t mutex_;
    bool locked_ = false;
};

// 사용
void shared_function() {
    MutexLock lock(my_mutex);   // 획득 시도
    if (!lock.owns_lock()) return;

    if (some_condition()) return;   // 자동 unlock
    do_work();
    // 자동 unlock
}
```

핵심은 다음과 같습니다.
- CMSIS-RTOS2의 `osMutexAcquire(id, timeout)` 결과가 `osOK`일 때만 보호 구역에 진입하고 해제합니다. mutex API는 ISR에서 호출하지 않습니다.
- 소멸자에서 `osMutexRelease`를 호출합니다.
- 복사를 금지해 자원은 한 객체만 소유하도록 합니다.

C++17의 `std::scoped_lock`이 표준 라이브러리에서 제공하는 같은 패턴입니다. 자세한 내용은 [Part 2-02](/blog/embedded/embedded-cpp/part2-02-raii-patterns)에서 다룹니다.

## RAII 패턴 2 — Peripheral

UART, SPI 같은 peripheral 활성화도 RAII로 묶을 수 있습니다.

```cpp
class UartGuard {
public:
    UartGuard(const UartGuard&) = delete;
    UartGuard& operator=(const UartGuard&) = delete;
    UartGuard() {
        RCC->APB1ENR |= RCC_APB1ENR_USART2EN;   // clock 활성
        USART2->CR1 |= USART_CR1_UE;            // peripheral 활성
    }
    ~UartGuard() {
        USART2->CR1 &= ~USART_CR1_UE;           // 비활성
        RCC->APB1ENR &= ~RCC_APB1ENR_USART2EN;  // clock 끔 (power saving)
    }
};

void log_data() {
    UartGuard uart;   // UART on
    USART2->DR = 'A';
    while (!(USART2->SR & USART_SR_TC));
    USART2->DR = 'B';
    while (!(USART2->SR & USART_SR_TC));
    // 자동 UART off — power saving
}
```

이 스케치는 STM32F4식 레지스터 이름을 사용하며, USART2와 해당 clock을 이 scope가 독점 소유한다는 전제입니다. 핀·baud 설정, TC 플래그 처리, timeout은 생략했으므로 보드에 그대로 적용하는 드라이버가 아닙니다. 다른 사용자가 이미 활성화한 peripheral이라면 이전 상태를 저장·복원하거나 참조 횟수로 소유권을 관리해야 합니다.

## RAII 패턴 3 — Critical Section (Interrupt Disable)

ISR과 데이터를 공유할 때는 짧은 critical section이 필요합니다.

```cpp
// Bad — disable/enable 짝 맞춰야
void shared() {
    __disable_irq();
    counter++;
    if (counter > MAX) {
        __enable_irq();   // 까먹기 쉬움
        return;
    }
    __enable_irq();
}

// RAII
class InterruptGuard {
    uint32_t prev_;
public:
    InterruptGuard() {
        prev_ = __get_PRIMASK();
        __disable_irq();
    }
    ~InterruptGuard() {
        __set_PRIMASK(prev_);   // 진입 시 상태 복원
    }

    InterruptGuard(const InterruptGuard&) = delete;
    InterruptGuard& operator=(const InterruptGuard&) = delete;
};

void shared() {
    InterruptGuard guard;   // disable
    counter++;
    if (counter > MAX) return;   // 자동 enable
}
```

핵심은 이전 상태를 보존하는 데 있습니다. 이미 disabled 상태에서 진입했다면 다시 enable하지 않으므로, 중첩된 critical section에서도 바깥 구역이 끝나기 전에 인터럽트가 켜지지 않습니다.

이 예제의 PRIMASK는 현재 코어의 일반 maskable IRQ를 막습니다. NMI·HardFault, 다른 코어의 실행, DMA 접근까지 막지 않으며 FreeRTOS의 BASEPRI 임계 구역과도 범위가 다릅니다. 공유 자원 보호가 필요한 범위를 먼저 정하고 그 범위에 맞는 동기화 수단을 골라야 합니다.

이 클래스가 손으로 쓴 코드보다 비싼지는 컴파일 결과로 볼 수 있습니다. CMSIS의 `__get_PRIMASK`·`__set_PRIMASK`·`__disable_irq`를 같은 동작의 인라인 어셈블리(`mrs`·`msr`·`cpsid i`)로 정의하고, 이전 상태를 손으로 저장·복원하는 `shared_manual()`과 위 `shared_raii()`(`counter`는 `volatile uint32_t`)를 arm-none-eabi-g++ 16.2.0 `-mcpu=cortex-m4 -mthumb -Os`로 컴파일했습니다. 두 함수는 같은 28바이트, 같은 명령열이 나왔습니다.

```text
0000001c <_Z11shared_raiiv>:
  1c:	mrs	r1, PRIMASK
  20:	cpsid	i
  22:	ldr	r3, [pc, #16]
  24:	ldr	r2, [r3, #0]
  26:	adds	r2, #1
  28:	str	r2, [r3, #0]
  2a:	ldr	r3, [r3, #0]
  2c:	msr	PRIMASK, r1
  30:	bx	lr
```

`if (counter > MAX) return;`의 두 경로가 모두 PRIMASK 복원으로 끝나므로 컴파일러가 분기를 없애고 `volatile` 읽기(`ldr r3, [r3, #0]`)만 남겼습니다. 소멸자 호출은 `msr PRIMASK, r1` 한 명령이 됐습니다.

## RAII 패턴 4 — Pool Allocator Handle

custom allocator에서 할당된 블록도 RAII로 감쌀 수 있습니다.

```cpp
class PoolHandle {
public:
    PoolHandle(Pool* p, void* block) : pool_(p), block_(block) {}
    ~PoolHandle() {
        if (block_) pool_->free(block_);
    }

    // Move OK (소유권 이전), copy 금지
    PoolHandle(PoolHandle&& other) noexcept
        : pool_(other.pool_), block_(other.block_) {
        other.block_ = nullptr;
    }
    PoolHandle& operator=(PoolHandle&& other) noexcept {
        if (this != &other) {
            if (block_) pool_->free(block_);
            pool_ = other.pool_;
            block_ = other.block_;
            other.block_ = nullptr;
        }
        return *this;
    }
    PoolHandle(const PoolHandle&) = delete;
    PoolHandle& operator=(const PoolHandle&) = delete;

    void* get() { return block_; }

private:
    Pool* pool_;
    void* block_;
};
```

자원이 unique하므로 한 블록은 한 핸들만 가질 수 있고, 이전은 move로만 일어납니다. 자세한 pool 구현은 [Part 3-03](/blog/embedded/embedded-cpp/part3-03-pool-allocator)에서 다룹니다.

## RAII 패턴 5 — DMA Channel

DMA channel은 제한된 자원이므로 획득과 해제를 RAII로 묶습니다.

DMA는 비동기 작업이므로 소멸 전에 전송이 끝났거나 안전하게 취소되어야 합니다. 버퍼 수명, 채널 독점 소유권, IRQ와 DMA 요청 비활성화 순서는 대상 MCU의 reference manual에 따라 구현합니다. STM32F1 채널 IRQ 이름과 STM32F4 stream 레지스터를 섞은 범용 코드로는 이 계약을 구현할 수 없어, 여기서는 하드웨어 구현을 제시하지 않습니다.

정리 인터페이스는 성공한 획득만 소유하고, 소멸자에서는 실패를 던지지 않으며, 제한 없는 busy wait를 피해야 합니다. 아래 호스트 예제는 소유권과 정리 횟수만 검증하며 실제 DMA 종료를 검증하지 않습니다.



## RAII의 핵심 — Rule of Three/Five/Zero

C++의 기본 복사/이동 동작은 자원 관리에 부적합합니다. RAII 클래스는 이를 명시적으로 정의해야 합니다.

```cpp
class Resource {
public:
    Resource();                                 // 기본 생성자
    ~Resource();                                // 소멸자 (자원 해제)

    // *복사 금지* — 자원은 unique
    Resource(const Resource&) = delete;
    Resource& operator=(const Resource&) = delete;

    // *이동 허용* — 소유권 이전
    Resource(Resource&&) noexcept;
    Resource& operator=(Resource&&) noexcept;
};
```

**Rule of Three (C++98)**: 소멸자, 복사 생성자, 복사 대입 중 하나를 정의하면 셋 다 정의합니다.

**Rule of Five (C++11)**: 위 셋에 이동 생성자와 이동 대입까지 포함해 복사·이동 정책을 함께 검토합니다. 반드시 모두 구현해야 한다는 뜻은 아니며, 자원 특성에 따라 delete하거나 이동도 금지할 수 있습니다.

**Rule of Zero**: 직접 자원을 관리하지 않고 표준 RAII 클래스(`std::unique_ptr` 등)에 위임합니다. C++ Core Guidelines C.20 "기본 연산을 정의하지 않을 수 있다면 정의하지 마라"가 이 규칙입니다.

## RAII vs `defer` — 다른 언어와의 비교

Go의 `defer`, Java의 `try-with-resources`도 비슷한 의도를 가집니다.

```go
// Go defer
func process() {
    f := open("data.bin")
    defer f.close()   // 함수 끝에서 호출

    // ...
}
```

```java
// Java try-with-resources
try (var f = new FileInputStream("data.bin")) {
    // ...
}
```

```cpp
// C++ RAII
void process() {
    std::ifstream f("data.bin");
    // 자동 close — 별도 표시 불필요
}
```

C++ RAII는 사용하는 쪽에 추가 키워드가 필요 없습니다. Go의 `defer`와 Java의 try-with-resources는 호출하는 쪽이 매번 정리를 적어야 하지만, RAII는 정리를 타입이 한 번 정의합니다.

## 임베디드 특화 — Move semantics 주의

자원 이전 시 move가 복사보다 효율적입니다. 다만 예외 환경과 임베디드 환경에서 주의할 점이 있습니다.

```cpp
class Buffer {
public:
    Buffer(size_t n) : data_(new uint8_t[n]), size_(n) {}
    ~Buffer() { delete[] data_; }

    // Move
    Buffer(Buffer&& other) noexcept
        : data_(other.data_), size_(other.size_) {
        other.data_ = nullptr;
        other.size_ = 0;
    }

    // Copy 금지
    Buffer(const Buffer&) = delete;

private:
    uint8_t* data_;
    size_t size_;
};

Buffer create_buffer() {
    Buffer b(1024);
    return b;   // 복사 X, move (또는 RVO)
}
```

Move 생성자는 `noexcept`로 표시합니다(C++ Core Guidelines C.66). `std::vector`는 재할당할 때 `std::move_if_noexcept`로 원소를 옮기므로, 복사가 가능하고 이동이 `noexcept`가 아니면 복사를 고릅니다. 복사·이동 횟수를 세는 원소 타입을 `emplace_back`으로 다섯 번 넣어 보면(g++-16, libstdc++) 차이가 그대로 보입니다.

```text
move noexcept              copies=0 moves=7
move not noexcept          copies=7 moves=0
```

재할당이 세 번(용량 1→2→4→8) 일어나며 기존 원소 1+2+4 = 7개를 옮겼는데, `noexcept`가 없는 쪽은 7번 모두 복사했습니다. 복사 금지 타입에는 이 fallback이 없어 이동을 쓰고, 그 이동이 예외를 던지면 `vector`의 강한 예외 보장이 사라집니다.

## 자주 보는 함정과 안티패턴

### 1. 소멸자에서 예외
C++11부터 소멸자는 따로 적지 않으면 `noexcept`입니다. 그래서 소멸자에서 던진 예외는 바깥 `catch`에 닿지 못하고 `std::terminate`로 끝납니다. `~Closer() { throw 1; }`를 `try { Closer c; } catch (int) {}` 안에서 쓰면 g++-16은 컴파일 때 `warning: 'throw' will always call 'terminate' [-Wterminate]`를 내고, 실행하면 `terminate called after throwing an instance of 'int'`와 함께 exit 134(SIGABRT)로 끝납니다. 해제 API도 예외를 던지지 않도록 계약을 정합니다. `-fno-exceptions`에서는 소스의 `throw`가 컴파일 오류입니다([Part 1-01](/blog/embedded/embedded-cpp/part1-01-cpp-vs-c#1-예외-처리)).

```cpp
~Resource() noexcept {
    release();   // 예외를 던지지 않는 해제 API
}
```

### 2. Copy 허용
```cpp
class MutexLock {
public:
    MutexLock(osMutexId_t m) : mutex_(m) { osMutexAcquire(mutex_, osWaitForever); }
    ~MutexLock() { osMutexRelease(mutex_); }
    // copy 정의 안 함 → 컴파일러 자동 생성 → release 두 번
};

void shared() {
    MutexLock l(m);
    MutexLock l2 = l;   // copy → 둘 다 release → double release
}
```
CMSIS-RTOS2 mutex의 소유자는 객체가 아니라 스레드입니다. 소멸 순서상 `l2`의 release가 먼저 성공해 mutex를 풀고, 이어서 `l`의 소멸자가 부르는 두 번째 `osMutexRelease`는 소유하지 않은 mutex 해제가 되어 CMSIS-RTOS2 문서대로 `osErrorResource`를 반환합니다. 이 클래스는 반환값을 보지 않으므로 오류가 조용히 버려집니다. 복사본이 원본보다 먼저 소멸하는 구조(안쪽 scope, 값 전달)라면 보호 구역도 의도보다 일찍 풀립니다. 복사 연산자는 `= delete`로 명시적으로 막아야 합니다.

### 3. 전역 RAII로 long-lived 자원
```cpp
static MutexLock g_lock(some_mutex);   // 영원히 lock
```
RAII는 지역 객체에 어울립니다. 전역에 쓰면 해제 시점이 `main` 반환이나 `exit`가 되는데, 무한 루프 firmware에는 그 시점이 없습니다. 게다가 이 생성자는 `__libc_init_array` 안에서 돌기 때문에 RTOS 커널이 시작되기 전에 mutex를 획득하려고 합니다.

### 4. Constructor에서 실패
```cpp
class Uart {
public:
    Uart(int baud) {
        if (init_uart(baud) < 0) {
            // 어떻게 실패 처리?
            // 예외 throw → -fno-exceptions에서 불가
            // 값 반환은 불가; 빈 return은 가능하지만 별도 실패 상태가 필요
        }
    }
};
```
대안은 factory function이 `std::optional<Uart>`를 반환하도록 만드는 것입니다.

factory는 초기화 성공 후에만 소유권을 가진 객체를 만들고, 실패하면 `std::nullopt`를 반환해야 합니다. 단순히 기존 생성자를 다시 호출하면 초기화를 두 번 수행할 수 있습니다. 생성자에서 값을 반환할 수는 없지만 빈 `return;` 자체는 허용되므로, 실패 상태를 멤버에 남기는 대안도 가능합니다.

### 5. Move 후 사용
```cpp
Buffer b1(1024);
Buffer b2 = std::move(b1);
b1.write(...);   // b1은 moved-from 상태 → null 접근
```
이 Buffer는 이동 후 `data_ == nullptr`, `size_ == 0`입니다. 이동 후 허용할 연산을 클래스 계약에 명시하고 그 전제에 맞게 사용합니다. 모든 moved-from 객체가 무조건 사용 불가인 것은 아닙니다.

### 6. RAII 객체의 scope가 너무 작음
```cpp
{
    MutexLock l(m);
    counter = 0;
}   // 즉시 unlock
```
scope가 너무 짧으면 필요한 critical section을 모두 덮지 못합니다. 의도가 정말 그것인지 확인합니다.

## 작은 예제 — 획득 실패와 소유권 이전

다음은 하드웨어 대신 해제 횟수를 관찰하는 C++17 호스트 예제입니다. 조기 return, 이동, 획득 실패를 확인합니다.

```cpp title="raii-check.cpp"
#include <cassert>
#include <utility>
struct Handle {
    int* releases;
    explicit Handle(int* p) : releases(p) {}
    ~Handle() noexcept { if (releases) ++*releases; }
    Handle(const Handle&) = delete;
    Handle& operator=(const Handle&) = delete;
    Handle(Handle&& other) noexcept
        : releases(std::exchange(other.releases, nullptr)) {}
};
void early(int& n) { Handle h(&n); return; }
int main() {
    int n = 0;
    early(n);
    assert(n == 1);
    { Handle a(&n); Handle b(std::move(a)); }
    assert(n == 2);
    { Handle failed(nullptr); }
    assert(n == 2);
}
```

실행: `clang++ -std=c++17 -Wall -Wextra -pedantic-errors raii-check.cpp -o raii-check && ./raii-check`. Homebrew Clang 23.1.5, arm64 macOS에서 경고 없이 exit 0이었습니다. 언어는 소멸자의 인라인을 보장하지 않으므로, 비용은 위 `InterruptGuard`처럼 대상 빌드의 디스어셈블리로 비교합니다.

[표준 초안의 scope 이탈 규칙](https://eel.is/c++draft/stmt.dcl)과 [CMSIS-RTOS2 mutex 계약](https://arm-software.github.io/CMSIS_6/latest/RTOS2/group__CMSIS__RTOS__MutexMgmt.html)을 기준으로 정리 보장의 범위와 획득 성공 조건을 구분했습니다.

## 정리

- RAII는 자원 lifetime을 객체 lifetime에 묶어 생성자에서 획득하고 소멸자에서 해제합니다.
- 임베디드의 5가지 RAII 자원은 Mutex, Peripheral, Interrupt, Memory, DMA입니다.
- Rule of Three/Five/Zero로 자원 관리를 명시하며, 복사 금지와 이동 허용을 택하거나 표준 클래스에 위임합니다.
- 정리 소멸자는 예외를 밖으로 던지지 않는 계약을 두고 실패 보고는 별도 경로로 설계합니다.
- `InterruptGuard`는 `-Os` Cortex-M4에서 손으로 쓴 저장·복원과 같은 명령열이 됐습니다. 추가 비용은 이런 디스어셈블리 비교로 확인합니다.

## 관련 항목

- [Part 2-02: RAII 실전 패턴](/blog/embedded/embedded-cpp/part2-02-raii-patterns) — `std::scoped_lock`, Handle 패턴, ScopedXxx
- [Part 3-05: No-Exception 설계](/blog/embedded/embedded-cpp/part3-05-no-exception-design) — 예외 없는 환경의 RAII
- [Part 3-09: 스마트 포인터 선택](/blog/embedded/embedded-cpp/part3-09-smart-pointer-choice) — `unique_ptr`의 RAII

## 다음 글

[Part 2-02: RAII 실전 패턴](/blog/embedded/embedded-cpp/part2-02-raii-patterns) — `std::scoped_lock`, `std::unique_ptr` 커스텀 deleter, ScopedXxx 패턴.
