---
title: "Part 2-01: RAII 기초"
date: 2026-05-14T01:00:00
description: "Resource Acquisition Is Initialization — 자원 생명주기를 객체 생명주기에 묶는 C++의 핵심 idiom."
series: "Embedded C++ for Real Systems"
seriesOrder: 9
tags: [cpp, embedded, raii, resource, destructor, exception-safety]
type: tech
---

## 한 줄 요약

> **"자원 = 객체, 해제 = 소멸자."** — 함수가 어떻게 끝나든 소멸자가 반드시 호출됨을 언어가 보장합니다.

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

경로마다 정리 코드를 반복해야 하고, 새 경로를 추가할 때 빠뜨리기 쉽습니다. 예외가 도는 환경에서는 거의 불가능에 가깝습니다.

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

return이 어디서 일어나든 소멸자가 반드시 호출되므로 자원 누수가 원천적으로 불가능합니다.

## RAII의 정의

자원을 객체 생명주기에 묶는 idiom입니다.

1. **생성자**가 자원을 획득합니다 (메모리 할당, mutex lock, peripheral enable).
2. **소멸자**가 자원을 해제합니다 (메모리 free, unlock, disable).
3. 객체의 scope가 곧 자원의 lifetime이 됩니다.

C++ 표준이 다음 시점에 소멸자 호출을 보장합니다.

- 함수가 return하면 모든 local 객체의 소멸자가 호출됩니다.
- 함수에서 예외가 throw되면 stack unwinding이 모든 소멸자를 호출합니다.
- 객체가 delete되면 소멸자가 호출됩니다.
- 프로그램 종료 시 static 객체의 소멸자가 호출됩니다(임베디드에서는 보통 호출되지 않습니다).

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
        osMutexAcquire(mutex_, osWaitForever);
    }
    ~MutexLock() {
        osMutexRelease(mutex_);
    }

    // 복사 금지 — 자원의 소유권 unique
    MutexLock(const MutexLock&) = delete;
    MutexLock& operator=(const MutexLock&) = delete;

private:
    osMutexId_t mutex_;
};

// 사용
void shared_function() {
    MutexLock lock(my_mutex);   // 획득

    if (some_condition()) return;   // 자동 unlock
    do_work();
    // 자동 unlock
}
```

핵심은 다음과 같습니다.
- 생성자에서 `osMutexAcquire`를 호출합니다.
- 소멸자에서 `osMutexRelease`를 호출합니다.
- 복사를 금지해 자원은 한 객체만 소유하도록 합니다.

C++17의 `std::scoped_lock`이 표준 라이브러리에서 제공하는 같은 패턴입니다. 자세한 내용은 [Part 2-02](/blog/embedded/embedded-cpp/part2-02-raii-patterns)에서 다룹니다.

## RAII 패턴 2 — Peripheral

UART, SPI 같은 peripheral 활성화도 RAII로 묶을 수 있습니다.

```cpp
class UartGuard {
public:
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

함수가 끝나면 UART가 자동으로 꺼지므로 전력 관리가 함께 처리됩니다.

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
        if (!prev_) __enable_irq();   // 진입 시 disabled였으면 그대로
    }

    InterruptGuard(const InterruptGuard&) = delete;
};

void shared() {
    InterruptGuard guard;   // disable
    counter++;
    if (counter > MAX) return;   // 자동 enable
}
```

핵심은 이전 상태를 보존하는 데 있습니다. 이미 disabled 상태에서 진입했다면 다시 enable하지 않으므로, nested critical section에서도 안전합니다.

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

```cpp
class DmaChannel {
public:
    explicit DmaChannel(uint8_t ch) : channel_(ch) {
        // 채널 활성화
        DMA->CCR[channel_] |= DMA_CCR_EN;
    }
    ~DmaChannel() {
        DMA->CCR[channel_] &= ~DMA_CCR_EN;
        // 채널 인터럽트 끔
        NVIC_DisableIRQ(static_cast<IRQn_Type>(DMA1_Channel1_IRQn + channel_));
    }

    void start_transfer(void* src, void* dst, size_t len) { /* */ }
    bool is_done() const { /* */ }

    DmaChannel(const DmaChannel&) = delete;

private:
    uint8_t channel_;
};

void send_buffer(const uint8_t* data, size_t len) {
    DmaChannel ch(1);   // 채널 1 획득

    ch.start_transfer(const_cast<uint8_t*>(data), &UART->TX, len);
    while (!ch.is_done());

    // 자동 해제
}
```

## RAII의 핵심 — 3 of 5 규칙

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

**Rule of Five (C++11)**: 위 셋에 이동 생성자와 이동 대입을 더해 다섯을 모두 정의합니다.

**Rule of Zero**: 직접 자원을 관리하지 않고 표준 RAII 클래스(`std::unique_ptr` 등)에 위임합니다. 가장 권장되는 방식입니다.

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
// C++ RAII — 가장 깔끔
void process() {
    std::ifstream f("data.bin");
    // 자동 close — 별도 표시 불필요
}
```

C++ RAII는 추가 키워드가 필요 없습니다. 객체 scope 자체가 자원 lifetime이며, 가장 통합된 접근입니다.

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

Move 생성자는 `noexcept`로 표시하는 것이 강력히 권장됩니다. `std::vector` 등은 `noexcept`가 없으면 copy로 fallback해 성능이 떨어집니다.

## 자주 보는 함정과 안티패턴

### 1. 소멸자에서 예외
소멸자에서 예외를 던지면 stack unwinding 중 terminate됩니다. `-fno-exceptions` 환경에서도 abort로 이어질 수 있으므로, 소멸자는 항상 `noexcept`여야 합니다.

```cpp
~Resource() noexcept {
    release();   // try/catch로 모든 예외 잡기
}
```

### 2. Copy 허용
```cpp
class MutexLock {
public:
    MutexLock(osMutexId_t m) : mutex_(m) { osMutexAcquire(mutex_); }
    ~MutexLock() { osMutexRelease(mutex_); }
    // copy 정의 안 함 → 컴파일러 자동 생성 → double-release crash
};

void shared() {
    MutexLock l(m);
    MutexLock l2 = l;   // copy → 둘 다 release → double release
}
```
복사 연산자는 `= delete`로 명시적으로 막아야 합니다.

### 3. 전역 RAII로 long-lived 자원
```cpp
static MutexLock g_lock(some_mutex);   // 영원히 lock
```
RAII는 지역 객체에 어울립니다. 전역에 쓰면 해제 시점이 프로그램 종료(임베디드에서는 거의 일어나지 않음)가 되어 의도가 모호해집니다.

### 4. Constructor에서 실패
```cpp
class Uart {
public:
    Uart(int baud) {
        if (init_uart(baud) < 0) {
            // 어떻게 실패 처리?
            // 예외 throw → -fno-exceptions에서 불가
            // return → 안 됨 (생성자)
        }
    }
};
```
대안은 factory function이 `std::optional<Uart>`를 반환하도록 만드는 것입니다.

```cpp
std::optional<Uart> make_uart(int baud) {
    if (init_uart(baud) < 0) return std::nullopt;
    return Uart(/* private constructor */);
}
```

### 5. Move 후 사용
```cpp
Buffer b1(1024);
Buffer b2 = std::move(b1);
b1.write(...);   // b1은 moved-from 상태 → null 접근
```
move한 객체는 더 이상 사용하지 않는 것이 관례입니다.

### 6. RAII 객체의 scope가 너무 작음
```cpp
{
    MutexLock l(m);
    counter = 0;
}   // 즉시 unlock
```
scope가 너무 짧으면 필요한 critical section을 모두 덮지 못합니다. 의도가 정말 그것인지 확인합니다.

## 측정 — RAII overhead

같은 코드를 C 수동 정리와 C++ RAII로 비교합니다(ARM Cortex-M4, `-O2`).

```text
# C 수동 (mutex acquire/release)
shared:
    push    {r4, lr}
    bl      osMutexAcquire
    ldr     r3, [counter]
    adds    r3, r3, #1
    str     r3, [counter]
    bl      osMutexRelease
    pop     {r4, pc}
# 24 bytes

# C++ RAII (MutexLock 사용)
shared:
    push    {r4, lr}
    bl      osMutexAcquire
    ldr     r3, [counter]
    adds    r3, r3, #1
    str     r3, [counter]
    bl      osMutexRelease
    pop     {r4, pc}
# 24 bytes — 동일
```

완전히 동일합니다. 생성자와 소멸자가 인라인되어 오버헤드가 0이며, 전형적인 zero-cost abstraction입니다.

## 정리

- RAII는 자원 lifetime을 객체 lifetime에 묶어 생성자에서 획득하고 소멸자에서 해제합니다.
- 임베디드의 5가지 RAII 자원은 Mutex, Peripheral, Interrupt, Memory, DMA입니다.
- Rule of Three/Five/Zero로 자원 관리를 명시하며, 복사 금지와 이동 허용을 택하거나 표준 클래스에 위임합니다.
- 소멸자는 `noexcept`여야 하며 예외를 던지면 terminate됩니다.
- 컴파일러가 생성자와 소멸자를 인라인하므로 오버헤드가 0입니다.

## 관련 항목

- [Part 2-02: RAII 실전 패턴](/blog/embedded/embedded-cpp/part2-02-raii-patterns) — `std::scoped_lock`, Handle 패턴, ScopedXxx
- [Part 3-05: No-Exception 설계](/blog/embedded/embedded-cpp/part3-05-no-exception-design) — 예외 없는 환경의 RAII
- [Part 3-09: 스마트 포인터 선택](/blog/embedded/embedded-cpp/part3-09-smart-pointer-choice) — `unique_ptr`의 RAII
- [GoF 14: Command](/blog/programming/design/gof-design-patterns/item14-command) — Command + RAII undo

## 다음 글

[Part 2-02: RAII 실전 패턴](/blog/embedded/embedded-cpp/part2-02-raii-patterns) — `std::scoped_lock`, `std::unique_ptr` 커스텀 deleter, ScopedXxx 패턴.
