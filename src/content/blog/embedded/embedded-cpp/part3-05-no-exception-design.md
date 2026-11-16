---
title: "No-Exception C++ 설계 — 코드 크기·결정성 트레이드오프"
slug: "embedded/embedded-cpp/part3-05-no-exception-design"
date: 2026-04-30T09:23:00
description: "-fno-exceptions 환경에서 에러 처리 — error code, std::optional, std::expected."
series: "Embedded C++ for Real Systems"
seriesOrder: 23
tags: [cpp, embedded, no-exceptions, error-handling, optional, expected]
type: tech
topics: ["embedded"]
---

## 한 줄 요약

> **"예외를 끈 프로젝트는 실패 전달과 복구 계약을 명시해야 합니다."** error code, `std::optional`, `std::expected`로 명시적으로 에러를 처리합니다.

## 어떤 문제를 푸는가

예외를 켜면 무엇이 붙는지는 [Part 1-01](/blog/embedded/embedded-cpp/part1-01-cpp-vs-c#1-예외-처리)에서 오브젝트로 확인했습니다.

- 소멸자가 있는 지역 객체를 둔 함수마다 landing pad와 `.ARM.extab`/`.ARM.exidx` 테이블이 붙고, `__cxa_*`·personality 루틴을 libsupc++에서 끌어옵니다.
- throw의 지연은 unwinder가 테이블을 따라 frame을 하나씩 푸는 시간이라 호출 깊이에 따라 늘어납니다. 이 글에서는 그 시간을 재지 않았습니다.
- Stack unwinding은 생성이 완료된 자동 객체를 소멸시키는 정의된 동작입니다.
- 예외 허용 범위는 프로젝트의 안전 요구·코딩 규칙으로 정합니다.

이 글은 `-fno-exceptions`를 채택한 프로젝트를 대상으로 합니다. 그러나 에러는 여전히 발생하므로 예외 없이 어떻게 처리할지가 관건입니다.

이 글은 no-exception 환경에서 쓰는 에러 처리 패턴 네 가지를 정리합니다.

## 패턴 1 — Error code 반환

가장 단순한 방식으로, C의 전통적인 패턴입니다.

```cpp
enum class ErrorCode {
    Ok,
    InvalidInput,
    NotFound,
    NoMemory,
    Timeout,
    HardwareFault,
};

ErrorCode read_register(uint8_t addr, uint8_t& value) {
    if (addr >= MAX_ADDR) return ErrorCode::InvalidInput;
    if (!is_ready()) return ErrorCode::Timeout;

    value = bus_read(addr);
    return ErrorCode::Ok;
}

// 사용
uint8_t v;
auto err = read_register(0x10, v);
if (err != ErrorCode::Ok) {
    log_error("read failed");
    return err;
}
process(v);
```

장점은 명시적이고 가볍다는 점이고, 단점은 반환값과 결과가 out-parameter로 분리된다는 점입니다.

### 검증을 강제 — `[[nodiscard]]`

```cpp
[[nodiscard]] ErrorCode read_register(uint8_t addr, uint8_t& value);

read_register(0x10, v);   // WARNING — return 값 무시
```

`[[nodiscard]]`(C++17)는 기본 경고로 동작합니다. 위 호출에 g++-16은 `warning: ignoring return value of 'ErrorCode read_register(unsigned char, unsigned char&)', declared with attribute 'nodiscard' [-Wunused-result]`, Clang 23.1.5는 `warning: ignoring return value of function declared with 'nodiscard' attribute [-Wunused-result]`를 냈습니다. `-Werror`와 결합하면 에러로 승격됩니다. 함수마다 붙이는 대신 `enum class [[nodiscard]] ErrorCode`처럼 타입에 붙이면 그 타입을 반환하는 모든 함수에 적용됩니다.

## 패턴 2 — `std::optional` (C++17)

값의 유무만 표현하며, 에러 상세 정보는 담지 않습니다.

```cpp
#include <optional>

std::optional<uint8_t> read_register(uint8_t addr) {
    if (addr >= MAX_ADDR) return std::nullopt;
    if (!is_ready()) return std::nullopt;
    return bus_read(addr);
}

// 사용
if (auto v = read_register(0x10)) {
    process(*v);
} else {
    log_error("read failed");
}
```

장점은 반환값과 결과가 하나로 통합되어 간결하다는 점이고, 단점은 에러 종류를 알 수 없다는 점입니다.

`std::optional`은 값과 "값이 있는가" 플래그를 객체 안에 담으므로 heap을 쓰지 않습니다. 크기는 플래그에 T의 정렬만큼 padding이 붙어 정해집니다. g++-16과 Clang 23.1.5(64비트 호스트, 결과 동일)에서 `optional<uint8_t>`는 2바이트, `optional<float>`는 8바이트였습니다.

### 임베디드 — Optional 활용

```cpp
class TempSensor {
public:
    std::optional<float> read_celsius() {
        if (!sensor_ready()) return std::nullopt;
        return raw_to_celsius(read_raw());
    }
};

// 사용
TempSensor sensor;
if (auto t = sensor.read_celsius()) {
    if (*t > kThresholdCelsius) trigger_alarm();
}
```

성공 시에는 값을 그대로 반환하고, 실패 시에는 nullopt로 표현합니다.

## 패턴 3 — `std::expected` (C++23)

값 또는 에러 중 하나를 반환하며, 두 경우 모두 완전한 정보를 전달합니다.

```cpp
#include <expected>

enum class ReadError { InvalidAddr, Timeout, BusError };

std::expected<uint8_t, ReadError> read_register(uint8_t addr) {
    if (addr >= MAX_ADDR) return std::unexpected(ReadError::InvalidAddr);
    if (!is_ready()) return std::unexpected(ReadError::Timeout);
    return bus_read(addr);
}

// 사용
auto result = read_register(0x10);
if (result) {
    process(*result);
} else {
    switch (result.error()) {
        case ReadError::InvalidAddr: log_error("bad addr"); break;
        case ReadError::Timeout:     log_error("timeout"); break;
        case ReadError::BusError:    log_error("bus error"); break;
    }
}
```

장점은 값과 에러 종류가 하나로 통합되고 명시적이라는 점입니다. 위처럼 에러 enum을 `uint8_t` 기반으로 두면 `std::expected<uint8_t, ReadError>`는 2바이트였습니다(두 라이브러리 동일). 단점은 C++23 라이브러리 기능이라는 점입니다. libstdc++ 12·libc++ 16부터 들어 있습니다([Part 1-08](/blog/embedded/embedded-cpp/part1-08-cpp-standard-choice#c23--필요한-기능별로-확인)).

자세한 내용은 [Part 3-07: std::expected](/blog/embedded/embedded-cpp/part3-07-expected)에서 다룹니다.

## 패턴 4 — tl::expected (C++11 이후 백포트)

[TartanLlama/expected](https://github.com/TartanLlama/expected)는 C++11/14/17용 expected 계열 구현입니다. std의 API와 monadic 함수 이름·오버로드가 완전히 같다고 가정하지 말고 고정한 release의 문서를 확인합니다.

```cpp
#include <tl/expected.hpp>

tl::expected<uint8_t, ReadError> read_register(uint8_t addr) {
    if (addr >= MAX_ADDR) return tl::unexpected(ReadError::InvalidAddr);
    return bus_read(addr);
}
```

기본 사용법(`unexpected`, `operator bool`, `*`, `error()`)은 `std::expected`와 같은 모양입니다. 이 글에서는 tl::expected를 빌드하지 않았습니다.

## 비교 표

| 패턴 | 표준 | 에러 정보 | 반환 객체 크기 (`uint8_t` 결과) | 값과 에러 |
| --- | --- | --- | --- | --- |
| Error code + out param | C++98 | enum 값 | 4 (`enum class` 기본 `int`) + out param | 분리 |
| `std::optional<T>` | C++17 | 없음 (유/무만) | 2 | 하나 |
| `std::expected<T, E>` | C++23 | enum 값 | 2 (E가 `uint8_t` 기반) | 하나 |
| `tl::expected<T, E>` | C++11 이후 (백포트) | enum 값 | 측정 안 함 | 하나 |

크기는 g++-16·Clang 23.1.5 64비트 호스트의 `sizeof`입니다.

## STL의 예외 던지는 함수

`-fno-exceptions` 환경에서 주의해야 할 STL 함수들입니다.

```cpp
std::vector<int> v = {1, 2, 3};

v.at(10);                    // throw std::out_of_range
v[10];                       // UB (but no throw)

std::string s("hello");
s.at(100);                   // throw

std::stoi("not a number");   // throw
```

vec[10]의 범위 초과는 예외 플래그와 무관하게 계약 위반입니다. 직접 throw/try/catch를 쓴 translation unit은 Clang/GCC의 -fno-exceptions에서 컴파일 오류가 납니다. `at`·`stoi`처럼 라이브러리 안에서 던지는 함수는 컴파일되고, 실패하면 프로그램이 끝납니다. `-fno-exceptions`로 `std::stoi("not a number")`를 부르면 g++-16은 `terminate called after throwing an instance of 'std::invalid_argument'`, Clang 23.1.5(libc++)는 `libc++abi: terminating due to uncaught exception of type std::invalid_argument: stoi: no conversion`으로 둘 다 exit 134였습니다(`at()`은 [Part 1-02](/blog/embedded/embedded-cpp/part1-02-compiler-flags#주의--stl-함수가-던지는-예외)). 예외를 끈다고 오류 코드로 바뀌지 않습니다.

해결책은 명시적인 검증입니다.

```cpp
if (idx < v.size()) v[idx];

// std::stoi 대신
int result = 0;
auto [ptr, ec] = std::from_chars(str, str + len, result);
if (ec == std::errc{} && ptr == str + len) { /* 전체 입력 파싱 성공 */ }
```

`std::from_chars`(C++17)는 예외를 던지지 않고 결과를 `std::errc`로 돌려줍니다([charconv.from.chars]). 로케일도 쓰지 않습니다.

## 임베디드 패턴 — 계층화된 에러

```cpp
// 저수준 — bit-level error
enum class HwError {
    DeviceNotFound,
    BusTimeout,
    ChecksumMismatch,
};

tl::expected<uint8_t, HwError> read_sensor_register(uint8_t addr);

// 중수준 — 측정 변환
enum class MeasurementError {
    HardwareFault,    // hw 변환
    OutOfRange,
    Calibrating,
};

tl::expected<float, MeasurementError> read_temperature() {
    auto raw = read_sensor_register(0x00);
    if (!raw) return tl::unexpected(MeasurementError::HardwareFault);

    if (*raw == 0xFF) return tl::unexpected(MeasurementError::OutOfRange);
    if (sensor_calibrating()) return tl::unexpected(MeasurementError::Calibrating);

    return convert_to_celsius(*raw);
}

// 응용 — 알람 결정
void check_alarm() {
    auto t = read_temperature();
    if (!t) {
        log_error_with_code(static_cast<int>(t.error()));
        return;
    }

    if (*t > 80.0f) trigger_alarm();
}
```

각 계층의 에러는 그 도메인 의미를 가지며, 상위 계층이 하위의 상세 정보를 wrap합니다.

## 에러 전파 — and_then / or_else (C++23)

monadic operation으로 체인을 구성합니다.

```cpp
auto result = read_register(0x10)
    .and_then([](uint8_t raw) -> std::expected<float, ReadError> {
        return raw_to_celsius(raw);
    })
    .and_then([](float celsius) -> std::expected<float, ReadError> {
        return apply_calibration(celsius);
    });

if (result) {
    process(*result);
}
```

pipe 스타일로 흘러가며, 첫 실패에서 체인이 short-circuit됩니다. Rust의 Result와 비슷한 모양입니다.

`tl::expected`도 유사한 API를 제공합니다.

## Heap 없는 string error message

`std::string`은 SSO 버퍼보다 긴 내용을 heap에 둡니다. 오류 객체에는 고정 메시지를 가리키는 방식이 맞습니다.

```cpp
// BAD — dynamic string
struct Error {
    std::string message;
};

// GOOD — enum + static lookup
enum class Error { /* ... */ };

constexpr const char* error_message(Error e) {
    switch (e) {
        case Error::InvalidAddr: return "Invalid address";
        case Error::Timeout: return "Timeout";
        default: return "Unknown";
    }
}
```

문자열 리터럴은 정적 저장 기간을 갖지만 Flash/RAM 배치는 링커 스크립트·ABI에 따릅니다. 문자열 내용 자체는 동적 할당하지 않으며 포인터·오류 객체·조회 코드의 메모리는 남습니다.

## RAII와의 호환

`-fno-exceptions`에서도 RAII는 정상 동작합니다. 단 생성자 실패 처리가 까다롭습니다(throw를 쓸 수 없습니다).

```cpp
class Resource {
public:
    Resource() {
        // throw 못 함 — 실패 시 어떻게?
    }
};

// 대안 — factory function
class Resource {
    Resource() = default;   // private default

public:
    static std::optional<Resource> create(int param) {
        if (!validate(param)) return std::nullopt;
        return Resource{};
    }
};

if (auto r = Resource::create(42)) {
    r->use();
}
```

자세한 패턴은 [Part 2-01](/blog/embedded/embedded-cpp/part2-01-raii-basics)의 "Constructor에서 실패"를 참고합니다.

## 자주 보는 함정과 안티패턴

### 1. 예외 켜진 코드 link
한 모듈만 `-fexceptions`로 빌드하면 그 모듈의 unwind table과 libsupc++의 `__cxa_*`·personality 루틴이 다시 링크됩니다. `-fno-exceptions` 모듈의 함수에는 cleanup 코드가 없으므로, 예외가 두 모듈의 경계를 넘는 설계 자체를 피합니다. 모든 모듈의 플래그를 일치시키고, 링크 결과에 `__cxa_throw`·`__gxx_personality_v0`가 없는지 `nm`으로 확인합니다.

### 2. STL throw 함수 호출
`vec.at(idx)` 대신 `vec[idx]`로 쓰고 직접 검증합니다. `string::substr()`, `stoi()` 등에도 주의합니다.

### 3. 에러 반환값 무시
```cpp
ErrorCode foo();
foo();   // ignored
```
`[[nodiscard]]`와 `-Werror` 조합으로 막습니다.

### 4. optional/expected에 큰 객체
```cpp
std::optional<HugeStruct> result;   // sizeof(HugeStruct) + 플래그 + padding
```
`uint32_t` 256바이트 구조체로 재면 `optional<HugeStruct>`는 260바이트였습니다(플래그 1바이트 + 정렬 padding 3바이트). 반환값으로 쓰면 이 크기가 호출마다 stack에 잡히므로, 큰 결과는 호출자가 준 버퍼에 쓰고 `expected<void, E>`처럼 상태만 반환합니다.

### 5. 에러를 boolean으로 통합
```cpp
bool foo();   // 성공/실패만 — 이유 모름
```
enum을 써서 원인을 추적할 수 있게 합니다.

### 6. 예외 같은 코드 흐름
```cpp
auto v = read1();
if (!v) return /* propagate */;
auto w = read2(*v);
if (!w) return /* propagate */;
auto x = read3(*w);
// 매번 if 분기
```
C++23 `and_then`으로 체인을 구성하고, C++17이면 직접 마이그레이션합니다.

## 실행 확인 — 예외 없이 파싱 실패를 전달하기

아래 파일은 C++23 expected를 지원하는 표준 라이브러리가 필요합니다. 성공, 잘못된 입력, 후행 문자, 범위 초과를 구분하며 RAII 소멸도 확인합니다. MCU 코드 크기·지연은 측정하지 않았습니다.

```cpp title="no-exception.cpp"
#include <cassert>
#include <charconv>
#include <expected>
#include <string_view>
#include <system_error>
enum class ParseError { Invalid, Range };
[[nodiscard]] std::expected<int, ParseError> parse(std::string_view text) {
    if (text.empty()) return std::unexpected(ParseError::Invalid);
    int value = 0;
    auto [end, error] = std::from_chars(text.data(), text.data()+text.size(), value);
    if (error == std::errc::result_out_of_range) return std::unexpected(ParseError::Range);
    if (error != std::errc{} || end != text.data()+text.size())
        return std::unexpected(ParseError::Invalid);
    return value;
}
struct Guard { int& count; ~Guard() { ++count; } };
int main() {
    int cleaned = 0;
    { Guard guard{cleaned}; assert(parse("42").value_or(-1) == 42); }
    assert(cleaned == 1);
    assert(parse("").error() == ParseError::Invalid);
    assert(parse("bad").error() == ParseError::Invalid);
    assert(parse("12x").error() == ParseError::Invalid);
    assert(parse("999999999999999999999999").error() == ParseError::Range);
#ifdef IGNORE_RESULT
    parse("1"); // -Werror=unused-result에서 거부
#endif
}
```

```bash
clang++ -std=c++23 -fno-exceptions -Wall -Wextra -Werror no-exception.cpp -o no-exception
./no-exception
```

Homebrew Clang 23.1.5와 g++-16 모두 `-fno-exceptions -Wall -Wextra -Werror`로 exit 0이었습니다. `-DIGNORE_RESULT`는 Clang에서 `error: ignoring return value of function declared with 'nodiscard' attribute [-Werror,-Wunused-result]`로 거부됩니다. 예외를 꺼도 정상적인 scope 종료와 return에서는 destructor가 실행됩니다(`cleaned == 1`). abort·reset에서는 같은 보장이 없습니다.

## 정리

- 예외를 끄기로 정했다면 라이브러리 실패 경로와 최대 복구 지연까지 확인합니다.
- 4가지 패턴이 있습니다 — error code, `std::optional`, `std::expected`(C++23), `tl::expected`(백포트).
- STL의 throw 함수(`at()`, `stoi()`)는 회피하고 `from_chars` 같은 대체를 씁니다.
- 에러는 계층화하여 각 계층마다 의미 있는 enum을 정의합니다.
- Constructor 실패는 factory function과 optional 조합으로 처리합니다.
- `[[nodiscard]]`로 에러 무시를 방지합니다.

## 근거와 검증 범위

2026-11-16에 `no-exception.cpp`, `sizeof` 측정, `stoi` 실험을 Homebrew Clang 23.1.5(libc++)와 g++-16(libstdc++)으로 macOS arm64 host에서 실행했습니다. 보드 실행·WCET·tl::expected 빌드는 하지 않았습니다. 다른 이름 없는 코드 블록은 주변에 정의한 장치 API를 가정하는 부분 예제이며 하나의 translation unit으로 합치지 않습니다.

- [expected 관찰과 실패 계약](https://eel.is/c++draft/expected)
- [from_chars 파싱 계약](https://eel.is/c++draft/charconv.from.chars)

## 관련 항목

- [Part 1-02: 컴파일러 플래그](/blog/embedded/embedded-cpp/part1-02-compiler-flags) — `-fno-exceptions`
- [Part 3-06: 에러 처리 패턴](/blog/embedded/embedded-cpp/part3-06-error-handling-patterns)
- [Part 3-07: std::expected](/blog/embedded/embedded-cpp/part3-07-expected)
- [Part 2-01: RAII 기초](/blog/embedded/embedded-cpp/part2-01-raii-basics) — Constructor 실패

## 다음 글

[Part 3-06: 에러 처리 패턴](/blog/embedded/embedded-cpp/part3-06-error-handling-patterns) — 위의 도구들을 어떻게 조합해 실용적인 에러 시스템을 만드는지 살펴봅니다.
