---
title: "Part 3-06: 에러 처리 패턴"
date: 2026-05-07T06:00:00
description: "Result types, error chains, exception-free RAII — 실용적 에러 시스템 구축 패턴."
series: "Embedded C++ for Real Systems"
seriesOrder: 24
tags: [cpp, embedded, error-handling, result-type, error-chain, fatal-error]
type: tech
---

## 한 줄 요약

> **"에러 처리는 세 가지 결정으로 정리됩니다."** 어디서 발견할지, 어떻게 전파할지, 어떻게 복구할지를 정합니다.

## 어떤 문제를 푸는가

[Part 3-05](/blog/embedded/embedded-cpp/part3-05-no-exception-design)에서 도구를 소개했습니다. 이 글은 그것을 엮은 전체 시스템 이야기입니다.

대부분의 임베디드 프로젝트가 에러 처리에 일관성을 갖추지 못합니다.

- 어떤 곳은 error code, 어떤 곳은 bool, 어떤 곳은 exception을 씁니다.
- 전파 방식이 함수마다 다릅니다.
- fatal과 recoverable 구분이 모호합니다.
- 로깅, 알람, 무시 사이의 결정이 산발적입니다.

시스템 차원의 패턴이 필요합니다. 이 글은 네 가지 결정으로 정리합니다.

## 결정 1 — Fatal vs Recoverable

모든 에러는 둘 중 하나로 분류됩니다.

**Fatal**은 시스템을 유지할 수 없는 경우입니다.

- Heap corruption
- Stack overflow
- Hardware bus fault
- Watchdog reset 임박

**Recoverable**은 처리 가능한 경우입니다.

- Sensor reading invalid
- Buffer full
- Timeout
- Invalid user input

각각 다른 반응 전략을 가집니다.

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

프로젝트 전체에서 통일된 에러 종류를 정의합니다.

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

숫자 범위로 분류해 두면 새 에러를 해당 범위 안에서 추가할 수 있습니다.

## 결정 3 — Result type 통일

모든 함수가 같은 Result 타입을 반환하면 일관성이 생깁니다.

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

함수 호출은 다음과 같이 이어집니다.

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

저수준 에러를 고수준 에러로 wrap해 디버깅 정보를 보존합니다.

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

옵션 2는 디버깅 정보가 풍부하지만 코드 크기가 늘어납니다. 트레이드오프입니다.

## 패턴 — Try Macro

C++23 이전에는 반환 후 검사가 반복됩니다. 매크로로 단순화할 수 있습니다.

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

Rust의 `?` operator와 유사한 형태입니다. GCC extension인 statement expression을 쓰므로 gnu++ 모드에서만 동작합니다.

C++23의 monadic chain(`and_then`)으로 표준적으로 대체할 수 있습니다.

## Logging 통합

에러 발생 시 위치, 내용, 시점을 함께 기록합니다. 로그가 디버깅의 1차 정보입니다.

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

C++20의 `std::source_location`을 함수 매개변수의 default로 두면 위치가 자동으로 채워집니다.

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

복구 가능한 에러는 재시도나 fallback으로 처리하고, 진짜 에러는 그대로 전파합니다.

## State Machine + 에러

상태 머신에서는 에러를 상태 전이 트리거로 사용합니다.

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

자세한 state machine은 [Part 4-06](/blog/embedded/embedded-cpp/part4-06-state-machine)에서 다룹니다.

## Fatal error handling

`fatal_error`는 마지막 수단입니다. 호출 직전까지 최대한 정보를 보존합니다.

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

reset 이후에도 `g_crash_info`가 보존되므로 반복 crash를 추적할 수 있습니다.

## 인증 환경 — DO-178C, ISO 26262

인증 환경에서는 에러 처리에 추가 제약이 붙습니다.

- 모든 에러 경로를 테스트해야 합니다.
- recovery time을 명시하고 검증해야 합니다.
- fail-safe behavior(예: power-off)를 정의해야 합니다.
- 로깅이 critical 메모리에 안전하게 기록되어야 합니다.

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

pre/post-condition을 명시하고 모든 분기 코드를 커버해야 합니다.

## 자주 보는 함정과 안티패턴

### 1. Silent failure
```cpp
bool foo();   // false 반환만 — 이유 모름
```
enum과 `[[nodiscard]]`를 함께 씁니다.

### 2. 에러를 magic value로
```cpp
int read();   // -1 반환 = 에러 (?)
```
-1이 valid 값일 수 있습니다. 명시적으로 optional이나 expected를 사용합니다.

### 3. 예외와 error code 혼용
```cpp
void foo() {
    throw std::exception();   // -fno-exceptions에서 abort
}
ErrorCode bar();
```
프로젝트 전체에서 통일합니다. exception을 끄면 어디에서도 throw하지 않습니다.

### 4. 에러 로그 너무 많음
```cpp
if (auto r = read(); !r) {
    log_error("read failed");   // 매 호출
}
```
timeout처럼 빈번한 에러는 logging level로 통제합니다.

### 5. fatal_error가 너무 흔함
recoverable한 경우까지 fatal로 처리하면 시스템이 자주 reset됩니다. 분류를 신중히 합니다.

### 6. try/catch + -fno-exceptions
```cpp
try { foo(); } catch (...) {}   // 컴파일 에러
```
예외를 끄면 try를 금지합니다.

## 측정 — 에러 처리 패턴의 코드 영향

같은 함수를 다른 에러 처리 방식으로 비교합니다.

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

예외가 압도적으로 크고, optional과 expected는 거의 동일합니다.

## 정리

- 에러 처리는 네 가지 결정으로 정리됩니다 — fatal과 recoverable 구분, error code 표준화, Result type 통일, chain 전파.
- 프로젝트 전체에서 `Result<T> = tl::expected<T, Error>`로 통일합니다.
- Try macro나 `and_then`으로 체인을 단순화합니다.
- Logging은 `source_location`이나 매크로로 통합합니다.
- Recovery 패턴은 retry, fallback, state machine 전이로 구성됩니다.
- Fatal error는 비휘발성 메모리에 정보를 보존한 뒤 reset합니다.

## 관련 항목

- [Part 3-05: No-Exception 설계](/blog/embedded/embedded-cpp/part3-05-no-exception-design)
- [Part 3-07: std::expected](/blog/embedded/embedded-cpp/part3-07-expected)
- [Part 4-06: State Machine](/blog/embedded/embedded-cpp/part4-06-state-machine)
- [Refactoring Pattern 40: Introduce Assertion](/blog/programming/design/refactoring-catalog/pattern40-introduce-assertion) — 검증

## 다음 글

[Part 3-07: std::expected (C++23)](/blog/embedded/embedded-cpp/part3-07-expected) — 값 또는 에러를 표현하는 C++23 표준 Result 타입의 상세 사용법을 다룹니다.
