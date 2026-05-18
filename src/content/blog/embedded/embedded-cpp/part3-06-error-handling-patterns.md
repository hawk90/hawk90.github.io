---
title: "Part 3-06: 에러 처리 패턴"
date: 2026-05-15T06:00:00
description: "Result types, error chains, exception-free RAII — 실용적 에러 시스템 구축 패턴."
series: "Embedded C++ for Real Systems"
seriesOrder: 24
tags: [cpp, embedded, error-handling, result-type, error-chain, fatal-error]
type: tech
---

## 한 줄 요약

> **"에러 처리는 *세 결정*입니다."** — 어디서 발견, 어떻게 전파, 어떻게 복구.

## 어떤 문제를 푸는가

[Part 3-05](/blog/embedded/embedded-cpp/part3-05-no-exception-design)가 *도구*를 소개했습니다. 이 글은 *전체 시스템*입니다.

대부분 임베디드 프로젝트가 *에러 처리에 일관성 없습니다*.

- 일부는 *error code*, 일부는 *bool*, 일부는 *exception*
- *전파 방식*이 함수마다 다름
- *fatal vs recoverable* 구분 모호
- *로깅 vs 알람 vs 무시* 결정 산발적

*시스템 차원의 패턴*이 필요. 이 글은 *4가지 결정*을 정리합니다.

## 결정 1 — Fatal vs Recoverable

모든 에러는 *둘 중 하나*.

**Fatal** — 시스템 *유지 불가*. 예:
- *Heap corruption*
- *Stack overflow*
- *Hardware bus fault*
- *Watchdog reset 임박*

**Recoverable** — 처리 가능. 예:
- *Sensor reading invalid*
- *Buffer full*
- *Timeout*
- *Invalid user input*

각각 다른 *반응 전략*.

```cpp
// Fatal — 즉시 복구 시도 또는 안전 모드
[[noreturn]] void fatal_error(const char* msg) {
    __disable_irq();
    log_to_persistent_storage(msg);
    NVIC_SystemReset();   // 또는 안전 상태로 강제
}

// Recoverable — 호출자에 보고
tl::expected<Data, Error> read_sensor() {
    if (!ready()) return tl::unexpected(Error::Timeout);
    return parse_data();
}
```

## 결정 2 — Error code 표준화

프로젝트 전체 *통일된 에러 종류*.

```cpp
// errors.h — 프로젝트 전체 공유
enum class Error : uint16_t {
    // 0-99: 공통
    Ok = 0,
    InvalidParam,
    NotInitialized,
    NotImplemented,

    // 100-199: 시간 관련
    Timeout = 100,
    NotReady,

    // 200-299: 메모리
    OutOfMemory = 200,
    BufferOverflow,
    AlignmentError,

    // 300-399: I/O
    IoError = 300,
    DeviceBusy,
    DeviceNotFound,

    // 400-499: protocol
    ProtocolError = 400,
    ChecksumMismatch,
    InvalidResponse,

    // 500-599: domain-specific
    SensorFault = 500,
    CalibrationFailed,
};

constexpr const char* error_name(Error e) {
    switch (e) {
        case Error::Ok:               return "Ok";
        case Error::InvalidParam:     return "InvalidParam";
        // ...
        default: return "Unknown";
    }
}
```

*숫자 범위로 분류*. 새 에러는 *범위 안에서 추가*.

## 결정 3 — Result type 통일

모든 함수가 *같은 Result 타입*. 일관성.

```cpp
// 프로젝트 전체 표준
template<typename T>
using Result = tl::expected<T, Error>;

// 사용
Result<int> divide(int a, int b);
Result<Data> read_sensor();
Result<void> write_register(uint8_t addr, uint8_t value);   // 반환값 없음

// void 특수
inline tl::unexpected<Error> err(Error e) { return tl::unexpected(e); }
```

함수 호출:

```cpp
auto result = read_sensor()
    .and_then([](Data d) -> Result<float> {
        return process(d);
    })
    .or_else([](Error e) -> Result<float> {
        if (e == Error::Timeout) return 0.0f;   // 기본값
        return err(e);   // 다른 에러는 전파
    });
```

## 결정 4 — 에러 chain 전파

저수준 에러를 *고수준 에러로 wrap*. 디버깅에 정보 보존.

```cpp
// 옵션 1 — 단순 변환 (정보 손실)
Result<float> read_temperature() {
    auto raw = read_register(0x10);
    if (!raw) return err(Error::SensorFault);   // 원본 에러 손실
    return celsius(*raw);
}

// 옵션 2 — Context 추가
struct ErrorContext {
    Error code;
    const char* function;
    int line;
    Error cause;   // 원인 에러
};

#define ERR_CTX(e, c) ErrorContext{(e), __func__, __LINE__, (c)}

Result<float> read_temperature() {
    auto raw = read_register(0x10);
    if (!raw) return tl::unexpected(ERR_CTX(Error::SensorFault, raw.error()));
    return celsius(*raw);
}
```

옵션 2는 *디버깅 풍부*하지만 *코드 크기 증가*. 트레이드오프.

## 패턴 — Try Macro

C++23 이전엔 *반환 후 검사*가 반복. 매크로로 단순화.

```cpp
#define TRY(expr) \
    ({ \
        auto _result = (expr); \
        if (!_result) return tl::unexpected(_result.error()); \
        std::move(*_result); \
    })

// 사용
Result<float> process() {
    auto raw = TRY(read_register(0x10));
    auto celsius = TRY(convert(raw));
    return celsius * 1.8f + 32.0f;
}
```

`?` operator (Rust)와 유사. GCC extension *statement expression* 사용 — *gnu++ 모드*에서만.

C++23 *monadic chain* (`and_then`)으로 *표준 대체* 가능.

## Logging 통합

에러 발생 시 *어디 + 무엇 + 언제*. 로그가 *debugging의 1차 정보*.

```cpp
// 매크로로 자동 file:line 정보
#define LOG_ERROR_RESULT(result) \
    do { \
        if (!(result)) { \
            log_error("%s:%d: error %s in %s", \
                __FILE__, __LINE__, \
                error_name((result).error()), __func__); \
        } \
    } while (0)

auto r = risky_operation();
LOG_ERROR_RESULT(r);
if (!r) return err(r.error());
```

C++20 `std::source_location`이 *함수 매개변수 default*로 자동 위치.

```cpp
template<typename T>
void log_if_error(const Result<T>& r,
                  std::source_location loc = std::source_location::current()) {
    if (!r) {
        log_error("%s:%d in %s: error %s",
                  loc.file_name(), loc.line(), loc.function_name(),
                  error_name(r.error()));
    }
}
```

## 패턴 — 우아한 복구

```cpp
Result<Data> read_with_retry(int max_retries = 3) {
    for (int i = 0; i < max_retries; ++i) {
        auto result = read_sensor();
        if (result) return result;

        if (result.error() == Error::Timeout) {
            // 잠시 대기 후 재시도
            sleep_ms(10);
            continue;
        }

        // 다른 에러는 즉시 반환
        return result;
    }

    return err(Error::Timeout);   // 최종 실패
}

Result<float> read_or_default() {
    return read_temperature()
        .or_else([](Error e) -> Result<float> {
            if (e == Error::Timeout || e == Error::NotReady) {
                return last_valid_temperature();   // fallback
            }
            return err(e);
        });
}
```

*복구 가능한 에러*는 *재시도/fallback*. *진짜 에러*는 *전파*.

## State Machine + 에러

상태 머신에서 *에러 = 상태 전이 트리거*.

```cpp
enum class DeviceState { Idle, Initializing, Ready, Error, Recovering };

void device_loop() {
    static DeviceState state = DeviceState::Idle;

    switch (state) {
        case DeviceState::Idle:
            if (auto r = init(); r) state = DeviceState::Ready;
            else state = DeviceState::Error;
            break;

        case DeviceState::Ready:
            if (auto r = process(); !r) {
                log_error("process failed");
                state = DeviceState::Error;
            }
            break;

        case DeviceState::Error:
            attempt_recovery();
            state = DeviceState::Recovering;
            break;

        case DeviceState::Recovering:
            if (auto r = recovery_check(); r) state = DeviceState::Ready;
            break;
    }
}
```

자세한 state machine은 [Part 4-06](/blog/embedded/embedded-cpp/part4-06-state-machine).

## Fatal error handling

`fatal_error`는 *진짜 마지막 수단*. 그 전에 *최대한 정보 보존*.

```cpp
struct CrashInfo {
    uint32_t magic;       // 0xCAFEBABE
    uint32_t reset_count;
    Error last_error;
    uint32_t stack_pointer;
    uint32_t program_counter;
    char message[64];
    uint32_t crc;
};

static_assert(sizeof(CrashInfo) <= 128);

// 비휘발성 메모리 (battery-backed RAM, FRAM, ...)
__attribute__((section(".noinit")))
CrashInfo g_crash_info;

[[noreturn]] void fatal_error(const char* msg, Error code) {
    __disable_irq();

    g_crash_info.magic = 0xCAFEBABE;
    g_crash_info.last_error = code;
    g_crash_info.stack_pointer = __get_MSP();
    // current PC 등...
    strncpy(g_crash_info.message, msg, sizeof(g_crash_info.message) - 1);
    g_crash_info.crc = calculate_crc(&g_crash_info);

    NVIC_SystemReset();
}

// 부팅 시
void check_crash_info() {
    if (g_crash_info.magic == 0xCAFEBABE &&
        g_crash_info.crc == calculate_crc(&g_crash_info)) {
        // 이전 crash 정보 있음
        log_persistent("Recovered from crash: %s", g_crash_info.message);
    }
}
```

*reset 후* `g_crash_info`가 *보존*. *반복 crash 추적*.

## 인증 환경 — DO-178C, ISO 26262

인증 환경은 *에러 처리에 추가 제약*.

- *모든 에러 경로* 테스트 필수
- *recovery time* 명시 + 검증
- *fail-safe behavior* 정의 — power-off 등
- *로깅이 critical 메모리에* 안전 기록

```cpp
// 인증 환경 표준 패턴
[[nodiscard]] Error perform_operation(Input* in, Output* out) {
    // pre-condition
    if (!in || !out) return Error::InvalidParam;
    if (!is_initialized()) return Error::NotInitialized;

    // operation
    auto result = do_work(in, out);

    // post-condition
    if (result == Error::Ok && !validate_output(out)) {
        return Error::InternalError;
    }

    return result;
}
```

*pre/post-condition 명시*. *모든 분기 코드 cover*.

## 자주 보는 함정과 안티패턴

### 1. *Silent failure*
```cpp
bool foo();   // false 반환만 — 이유 모름
```
*enum 사용 + nodiscard*.

### 2. *에러를 magic value로*
```cpp
int read();   // -1 반환 = 에러 (?)
```
*-1이 valid 값일 수* 있음. *명시적 optional/expected*.

### 3. *예외와 error code 혼용*
```cpp
void foo() {
    throw std::exception();   // -fno-exceptions에서 abort
}
ErrorCode bar();
```
*프로젝트 전체 통일*. exception 끄면 *어디서도 throw 금지*.

### 4. *에러 로그 너무 많음*
```cpp
if (auto r = read(); !r) {
    log_error("read failed");   // 매 호출
}
```
*timeout 같은 빈번한 에러는 logging level*로 통제.

### 5. *fatal_error가 너무 흔함*
*recoverable*도 fatal 처리 → 시스템 자주 reset. *분류 신중*.

### 6. *try/catch + -fno-exceptions*
```cpp
try { foo(); } catch (...) {}   // 컴파일 에러
```
*예외 끄면 try 금지*.

## 측정 — 에러 처리 패턴의 코드 영향

같은 함수, 다른 에러 처리.

```text
# bool 반환
bool f() { return true; }
크기: 8 B

# error code
ErrorCode f() { return ErrorCode::Ok; }
크기: 10 B

# optional<T>
std::optional<int> f() { return 42; }
크기: 16 B (return value + has_value flag)

# expected<T, E>
tl::expected<int, ErrorCode> f() { return 42; }
크기: 18 B

# 예외 (-fexceptions)
int f() { throw std::runtime_error("err"); }
크기: 312 B + unwind table 추가
```

*예외가 압도적으로 큼*. *optional/expected는 거의 동일*.

## 정리

- 에러 처리 *4결정*: fatal/recoverable, error code 표준, Result type 통일, chain 전파.
- *프로젝트 전체 통일* — `Result<T> = tl::expected<T, Error>`.
- *Try macro*나 `and_then`으로 *체인 단순화*.
- *Logging 통합* — `source_location` 또는 매크로.
- *Recovery 패턴*: retry, fallback, state machine 전이.
- *Fatal error*는 *비휘발성 메모리에 정보 보존* 후 reset.

## 관련 항목

- [Part 3-05: No-Exception 설계](/blog/embedded/embedded-cpp/part3-05-no-exception-design)
- [Part 3-07: std::expected](/blog/embedded/embedded-cpp/part3-07-expected)
- [Part 4-06: State Machine](/blog/embedded/embedded-cpp/part4-06-state-machine)
- [Refactoring Pattern 40: Introduce Assertion](/blog/programming/design/refactoring-catalog/pattern40-introduce-assertion) — 검증

## 다음 글

[Part 3-07: std::expected (C++23)](/blog/embedded/embedded-cpp/part3-07-expected) — *값 또는 에러*를 표현하는 C++23 표준 Result 타입의 *상세 사용법*.
