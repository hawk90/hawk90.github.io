---
title: "임베디드 에러 처리 패턴 — Result 전파·재시도·복구 정책"
slug: "embedded/embedded-cpp/part3-06-error-handling-patterns"
date: 2026-04-30T09:24:00
description: "Result의 에러 타입 일치, 유한 재시도, 실패 맥락과 reset 보존 조건을 연결합니다."
series: "Embedded C++ for Real Systems"
seriesOrder: 24
tags: [cpp, embedded, error-handling, result-type, error-chain, fatal-error]
type: tech
topics: ["embedded"]
---

## 한 줄 요약

> **"에러 처리는 네 가지 결정으로 정리됩니다."** fatal 분류, 에러 코드, 결과 타입, 맥락 전파를 정합니다.

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
    InternalError,
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

tl::expected<float, ErrorContext> read_temperature_with_context() {
    auto raw = read_register(0x10);
    if (!raw) return tl::unexpected(ERR_CTX(Error::SensorFault, raw.error()));
    return celsius(*raw);
}
```

옵션 2는 Error가 아닌 ErrorContext를 오류 타입으로 선언해야 합니다. 별칭 Result<float>에 ErrorContext를 그대로 반환하면 타입이 맞지 않습니다. 맥락을 추가할 경계·크기와 원인 보존 수준을 정합니다.

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
    g_crash_info.message[sizeof(g_crash_info.message) - 1] = '\0';
    g_crash_info.crc = crash_crc_excluding_crc_field(g_crash_info);

    NVIC_SystemReset();
}

// 부팅 시
void check_crash_info() {
    if (g_crash_info.magic == 0xCAFEBABE &&
        g_crash_info.crc == crash_crc_excluding_crc_field(g_crash_info)) {
        // 이전 crash 정보 있음
        log_persistent("Recovered from crash: %s", g_crash_info.message);
    }
}
```

이 부분은 보드 의존 스케치입니다. .noinit은 비휘발성을 뜻하지 않으며 linker 배치·startup 초기화 제외·reset 종류·RAM 보존에 따라 유지 여부가 달라집니다. CRC 함수는 crc 필드를 제외한 명시적으로 직렬화한 필드 바이트를 처리해야 하고 초기화되지 않은 padding은 포함하면 안 됩니다. reset_count·PC 캡처와 쓰기 중 reset 대책도 구현해야 합니다. NVIC_SystemReset은 되돌아오지 않는 보드 wrapper로 제공하고, 실제 전원 차단 보존은 검증하지 않았습니다.

## 안전 요구에 따른 검증 범위

다음은 프로젝트 검증 계획에서 검토할 항목입니다. DO-178C·ISO 26262의 특정 조항이나 인증 적합성을 이 예제로 입증하는 것은 아닙니다.

- 모든 에러 경로를 테스트해야 합니다.
- recovery time을 명시하고 검증해야 합니다.
- fail-safe behavior(예: power-off)를 정의해야 합니다.
- 로깅이 critical 메모리에 안전하게 기록되어야 합니다.

```cpp
// 프로젝트의 pre/post-condition 예시
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
    throw std::exception();   // -fno-exceptions에서는 일반적으로 컴파일 오류
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
예외를 끈 translation unit에서는 `try`/`catch`를 사용할 수 없으므로, 예외를 사용하지 않는 오류 전달 방식으로 바꿔야 합니다.

## 실행 확인 — 제한된 재시도와 맥락 변환

이 파일은 C++23 표준 expected를 사용합니다. 앞의 tl 예제와 같은 translation unit으로 이어 붙이는 코드는 아닙니다. Timeout만 정해진 횟수 안에서 재시도하고, 다른 에러는 즉시 전파합니다. 0회 요청은 실제 장치 호출 없이 Timeout을 반환하도록 계약을 정합니다.

```cpp title="recovery.cpp"
#include <cassert>
#include <expected>
enum class Error { Timeout, SensorFault, InternalError };
template<class T> using Result = std::expected<T, Error>;
struct ErrorContext { Error code; Error cause; };
template<class Read> Result<int> retry(Read read, int attempts) {
    for (int n = 0; n < attempts; ++n) {
        auto result = read();
        if (result || result.error() != Error::Timeout) return result;
    }
    return std::unexpected(Error::Timeout);
}
std::expected<int, ErrorContext> with_context(Result<int> value) {
    if (!value) return std::unexpected(ErrorContext{Error::SensorFault, value.error()});
    return *value;
}
int main() {
    int calls = 0;
    auto eventual = [&]() -> Result<int> {
        if (++calls < 3) return std::unexpected(Error::Timeout);
        return 42;
    };
    assert(retry(eventual, 3).value_or(-1) == 42 && calls == 3);
    calls = 0;
    assert(!retry(eventual, 0) && calls == 0);
    auto fatal = [&]() -> Result<int> { ++calls; return std::unexpected(Error::InternalError); };
    auto failed = retry(fatal, 3);
    assert(!failed && calls == 1);
    auto context = with_context(failed);
    assert(context.error().cause == Error::InternalError);
}
```

C++23·-fno-exceptions로 실행 가능하며 예외를 던지는 value() 대신 검사·value_or를 사용합니다. 지연 함수·장치·RTOS·reset 보존과 표준 인증 적합성은 검증 범위 밖입니다. 실제 재시도에는 전체 시간 예산과 마지막 요청 뒤 불필요한 대기 제거도 필요합니다.

## 정리

- 에러 처리는 네 가지 결정으로 정리됩니다 — fatal과 recoverable 구분, error code 표준화, Result type 통일, chain 전파.
- 프로젝트 전체에서 `Result<T> = tl::expected<T, Error>`로 통일합니다.
- Try macro나 `and_then`으로 체인을 단순화합니다.
- Logging은 `source_location`이나 매크로로 통합합니다.
- Recovery 패턴은 retry, fallback, state machine 전이로 구성됩니다.
- Fatal error는 비휘발성 메모리에 정보를 보존한 뒤 reset합니다.

## 근거와 검증 범위

2026-10-22에 장별 명명 예제를 Homebrew Clang 23.1.3·libc++의 macOS arm64 host에서 실행했습니다. ASan·UBSan을 적용했으며 보드 실행·WCET·인증 적합성·외부 라이브러리 성공은 이 결과에 포함하지 않습니다. 다른 이름 없는 코드 블록은 주변에 정의한 장치 API를 가정하는 부분 예제이며 하나의 translation unit으로 합치지 않습니다.

- [expected 오류 타입과 monadic 계약](https://eel.is/c++draft/expected)

## 관련 항목

- [Part 3-05: No-Exception 설계](/blog/embedded/embedded-cpp/part3-05-no-exception-design)
- [Part 3-07: std::expected](/blog/embedded/embedded-cpp/part3-07-expected)
- [Part 4-06: State Machine](/blog/embedded/embedded-cpp/part4-06-state-machine)
- [C++ expected의 관찰·monadic 계약](https://eel.is/c++draft/expected)

## 다음 글

[Part 3-07: std::expected (C++23)](/blog/embedded/embedded-cpp/part3-07-expected) — 값 또는 에러를 표현하는 C++23 표준 Result 타입의 상세 사용법을 다룹니다.
