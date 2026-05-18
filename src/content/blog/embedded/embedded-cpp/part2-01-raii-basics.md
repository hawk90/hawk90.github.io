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

> **"자원 = 객체, 해제 = 소멸자."** — 함수가 어떻게 끝나든 *소멸자가 반드시 호출됨*을 *언어가 보장*합니다.

## 어떤 문제를 푸는가

자원(메모리, 파일, mutex, peripheral)을 *획득*하고 *해제*하지 않으면 *누수*입니다. C는 *호출자가 직접 짝을 맞춰야* 합니다.

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

*경로마다* 정리 코드 반복. 새 경로 추가 시 *까먹기 쉬움*. 예외 환경에선 *불가능에 가까움*.

**RAII** (Resource Acquisition Is Initialization)는 이 문제를 *언어 차원에서* 해결합니다.

```cpp
// C++: 짝 자동
void process() {
    std::array<char, 1024> buf;       // stack 자동 해제
    std::ifstream f("data.bin", std::ios::binary);   // 소멸자가 close

    if (read_data(buf.data(), f) < 0) return;
    if (validate(buf.data()) < 0) return;
}
```

*return이 어디서든* 소멸자 *반드시 호출*. 자원 누수 *불가능*.

## RAII의 정의

**자원을 객체 생명주기에 묶는 idiom**.

1. **생성자**가 자원 *획득* (메모리 할당, mutex lock, peripheral enable)
2. **소멸자**가 자원 *해제* (메모리 free, unlock, disable)
3. *객체의 scope*가 *자원의 lifetime*

C++ 표준이 *소멸자 호출을 보장*합니다.

- 함수가 *return*하면 — 모든 local 객체 소멸자
- 함수가 *예외 throw*하면 — stack unwinding이 모든 소멸자 호출
- 객체가 *delete*되면 — 소멸자
- *프로그램 종료* 시 — static 객체 소멸자 (임베디드는 보통 안 호출됨)

## 임베디드의 RAII — 5가지 자원

임베디드 RAII가 다루는 *주요 자원*:

1. **Mutex / Lock** — RTOS sync primitive
2. **Peripheral** — GPIO, UART, SPI 활성/비활성
3. **Interrupt** — critical section
4. **Memory** — pool 할당 / 반환
5. **DMA** — channel 획득 / 해제

각각의 RAII 패턴을 봅니다.

## RAII 패턴 1 — Mutex Lock

가장 흔한 RAII 예. *unlock 까먹기* 방지.

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

핵심:
- 생성자에서 `osMutexAcquire`
- 소멸자에서 `osMutexRelease`
- *복사 금지* — 자원은 *한 객체*만 소유

C++17의 `std::scoped_lock`이 표준 라이브러리의 같은 패턴. 자세한 내용은 [Part 2-02](/blog/embedded/embedded-cpp/part2-02-raii-patterns).

## RAII 패턴 2 — Peripheral

UART, SPI 같은 *peripheral 활성화*도 RAII로.

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

함수가 *끝나면 UART가 자동으로 꺼짐*. *전력 관리 자동*.

## RAII 패턴 3 — Critical Section (Interrupt Disable)

ISR과 *데이터 공유* 시 *짧은 critical section* 필요.

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

핵심: *이전 상태 보존*. 이미 disabled 상태에서 진입했으면 *enable하지 않음*. *nested critical section* 안전.

## RAII 패턴 4 — Pool Allocator Handle

custom allocator에서 *할당된 블록*을 RAII로.

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

자원이 *unique* — 한 블록은 *한 핸들*만. *move로만 이전*. 자세한 pool 구현은 [Part 3-03](/blog/embedded/embedded-cpp/part3-03-pool-allocator).

## RAII 패턴 5 — DMA Channel

DMA channel은 *제한된 자원*. 획득/해제 RAII.

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

## RAII의 핵심 — *3 of 5* 규칙

C++의 *복사/이동* 기본 동작이 *자원에 부적합*. RAII 클래스는 *명시적*으로 정의해야 함.

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

**Rule of Three (C++98)**: 소멸자, 복사 생성자, 복사 대입 — *셋 중 하나 정의하면 셋 다*.

**Rule of Five (C++11)**: 위 셋 + 이동 생성자, 이동 대입 — *다섯 모두*.

**Rule of Zero**: *직접 자원 관리 안 함*. 표준 RAII 클래스(`std::unique_ptr`)에 위임. *권장*.

## RAII vs `defer` — 다른 언어와의 비교

Go의 `defer`, Java의 `try-with-resources`도 *비슷한 의도*.

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

C++ RAII는 *추가 키워드 없음*. *객체 scope 자체가 자원 lifetime*. *가장 통합된 접근*.

## 임베디드 특화 — Move semantics 주의

자원 이전 시 *move*가 *복사보다 효율*. 그러나 *예외 환경*과 *임베디드 환경*에서 다른 점.

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

*Move 생성자는 noexcept*가 강력 권장. `std::vector` 등이 *noexcept 없으면 copy fallback* — 성능 저하.

## 자주 보는 함정과 안티패턴

### 1. *소멸자에서 예외*
소멸자가 *예외 던지면* stack unwinding 중 *terminate*. `-fno-exceptions`라도 *abort 가능*. 소멸자는 *항상 noexcept*.

```cpp
~Resource() noexcept {
    release();   // try/catch로 모든 예외 잡기
}
```

### 2. *Copy 허용*
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
*명시적 = delete*.

### 3. *전역 RAII로 long-lived 자원*
```cpp
static MutexLock g_lock(some_mutex);   // 영원히 lock
```
RAII는 *지역 객체*. 전역에 쓰면 *해제 시점*이 *프로그램 종료* (임베디드에선 거의 없음). 의도 불명.

### 4. *Constructor에서 실패*
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
대안: *factory function*이 `std::optional<Uart>` 반환.

```cpp
std::optional<Uart> make_uart(int baud) {
    if (init_uart(baud) < 0) return std::nullopt;
    return Uart(/* private constructor */);
}
```

### 5. *Move 후 사용*
```cpp
Buffer b1(1024);
Buffer b2 = std::move(b1);
b1.write(...);   // b1은 moved-from 상태 → null 접근
```
Move 후 *사용 안 함*이 관례.

### 6. *RAII 객체가 너무 작음*
```cpp
{
    MutexLock l(m);
    counter = 0;
}   // 즉시 unlock
```
*scope 너무 짧음* → 필요한 critical section 아님. 의도 확인.

## 측정 — RAII overhead

같은 코드의 C 수동 정리 vs C++ RAII (ARM Cortex-M4, `-O2`).

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

*완전 동일*. 생성자/소멸자가 *인라인*되어 *오버헤드 0*. *zero-cost abstraction*.

## 정리

- RAII = *자원 lifetime을 객체 lifetime에 묶음*. 생성자에서 획득, 소멸자에서 해제.
- 임베디드의 5가지 RAII 자원: *Mutex, Peripheral, Interrupt, Memory, DMA*.
- *Rule of Three/Five/Zero*: 자원 관리 명시. *복사 금지, 이동 허용* 또는 *표준 클래스 위임*.
- *소멸자는 noexcept*. 예외 던지면 terminate.
- *오버헤드 0* — 컴파일러가 생성자/소멸자 인라인.

## 관련 항목

- [Part 2-02: RAII 실전 패턴](/blog/embedded/embedded-cpp/part2-02-raii-patterns) — `std::scoped_lock`, Handle 패턴, ScopedXxx
- [Part 3-05: No-Exception 설계](/blog/embedded/embedded-cpp/part3-05-no-exception-design) — 예외 없는 환경의 RAII
- [Part 3-09: 스마트 포인터 선택](/blog/embedded/embedded-cpp/part3-09-smart-pointer-choice) — `unique_ptr`의 RAII
- [GoF 14: Command](/blog/programming/design/gof-design-patterns/item14-command) — Command + RAII undo

## 다음 글

[Part 2-02: RAII 실전 패턴](/blog/embedded/embedded-cpp/part2-02-raii-patterns) — `std::scoped_lock`, `std::unique_ptr` 커스텀 deleter, ScopedXxx 패턴.
