---
title: "Part 3-05: No-Exception 설계"
date: 2026-05-07T05:00:00
description: "-fno-exceptions 환경에서 에러 처리 — error code, std::optional, std::expected."
series: "Embedded C++ for Real Systems"
seriesOrder: 23
tags: [cpp, embedded, no-exceptions, error-handling, optional, expected]
type: tech
---

## 한 줄 요약

> **"임베디드에서는 예외를 끕니다."** error code, `std::optional`, `std::expected`로 명시적으로 에러를 처리합니다.

## 어떤 문제를 푸는가

C++ 예외는 런타임 비용이 큽니다.

- Unwind table이 수 KB 추가됩니다.
- `throw` 시 수십 μs의 지연이 생기며 deterministic하지 않습니다.
- Stack unwinding으로 예측하지 못한 destructor가 호출됩니다.
- 인증 환경에서는 대부분 금지됩니다.

임베디드는 거의 항상 `-fno-exceptions`로 빌드합니다. 그러나 에러는 여전히 발생하므로 예외 없이 어떻게 처리할지가 관건입니다.

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

`[[nodiscard]]`(C++17)가 컴파일러 경고를 띄우고, `-Werror`와 결합하면 에러로 승격됩니다.

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

`std::optional`은 내부적으로 union과 bool 조합이므로 heap을 쓰지 않고, sizeof는 `sizeof(T)`에 약간 더해진 정도입니다.

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

장점은 값과 에러 종류가 하나로 통합되고 명시적이라는 점이고, 단점은 C++23이라 toolchain이 지원하지 않을 수 있다는 점입니다.

자세한 내용은 [Part 3-07: std::expected](/blog/embedded/embedded-cpp/part3-07-expected)에서 다룹니다.

## 패턴 4 — tl::expected (C++17 호환)

C++23 `std::expected`의 header-only 백포트입니다. C++17부터 사용할 수 있습니다.

```cpp
#include <tl/expected.hpp>

tl::expected<uint8_t, ReadError> read_register(uint8_t addr) {
    if (addr >= MAX_ADDR) return tl::unexpected(ReadError::InvalidAddr);
    return bus_read(addr);
}
```

API가 `std::expected`와 거의 동일합니다. 임베디드에서는 C++17과 백포트를 함께 쓰는 패턴이 흔합니다.

## 비교 표

| 패턴 | 표준 | 에러 정보 | 코드 크기 | 사용성 |
| --- | --- | --- | --- | --- |
| Error code + out param | C++98 | 풍부 | 작음 | 보통 |
| `std::optional<T>` | C++17 | 없음 (유/무만) | 작음 | 좋음 |
| `std::expected<T, E>` | C++23 | 풍부 | 작음 | 매우 좋음 |
| `tl::expected<T, E>` | C++17 (백포트) | 풍부 | 작음 | 매우 좋음 |

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

`-fno-exceptions`로 컴파일하면 다음 동작이 섞입니다.

- 일부는 abort를 호출합니다.
- 일부는 UB를 일으킵니다.
- 일부는 컴파일 에러로 떨어집니다.

해결책은 명시적인 검증입니다.

```cpp
if (idx < v.size()) v[idx];

// std::stoi 대신
int result = 0;
auto [ptr, ec] = std::from_chars(str, str + len, result);
if (ec == std::errc{}) { /* OK */ }
```

`std::from_chars`(C++17)는 예외를 던지지 않으므로 임베디드에서 안전합니다.

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
    .and_then([](uint8_t raw) -> std::expected<float, Error> {
        return raw_to_celsius(raw);
    })
    .and_then([](float celsius) -> std::expected<float, Error> {
        return apply_calibration(celsius);
    });

if (result) {
    process(*result);
}
```

pipe 스타일로 흘러가며, 첫 실패에서 체인이 short-circuit됩니다. Rust의 Result와 비슷한 모양입니다.

`tl::expected`도 유사한 API를 제공합니다.

## Heap 없는 string error message

`std::string`은 heap을 사용하므로 고정 메시지만 권장합니다.

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

Flash에 박힌 문자열이므로 RAM과 heap 사용은 0입니다.

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
한 모듈만 `-fexceptions`로 빌드하면 unwind table이 다시 들어옵니다. 모든 모듈을 일치시킵니다.

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
std::optional<HugeStruct> result;   // sizeof(HugeStruct) + 1
```
pointer를 활용하거나 큰 객체를 분리합니다.

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

## 측정 — 예외 켰을 때와 끈 시점의 코드 크기

같은 단순 프로그램을 STM32F4에서 비교합니다.

```text
-fexceptions:
  .text       : 42 KB
  .ARM.extab  : 4.2 KB (unwind table)
  .ARM.exidx  : 3.1 KB (exception index)
  total       : ~49 KB

-fno-exceptions:
  .text       : 38 KB
  total       : ~38 KB
```

약 7 KB 차이가 납니다. 작은 프로젝트에서는 수십 퍼센트에 이릅니다.

## 정리

- 임베디드는 `-fno-exceptions`로 빌드하며 예외 없이 에러를 처리합니다.
- 4가지 패턴이 있습니다 — error code, `std::optional`, `std::expected`(C++23), `tl::expected`(백포트).
- STL의 throw 함수(`at()`, `stoi()`)는 회피하고 `from_chars` 같은 대체를 씁니다.
- 에러는 계층화하여 각 계층마다 의미 있는 enum을 정의합니다.
- Constructor 실패는 factory function과 optional 조합으로 처리합니다.
- `[[nodiscard]]`로 에러 무시를 방지합니다.

## 관련 항목

- [Part 1-02: 컴파일러 플래그](/blog/embedded/embedded-cpp/part1-02-compiler-flags) — `-fno-exceptions`
- [Part 3-06: 에러 처리 패턴](/blog/embedded/embedded-cpp/part3-06-error-handling-patterns)
- [Part 3-07: std::expected](/blog/embedded/embedded-cpp/part3-07-expected)
- [Part 2-01: RAII 기초](/blog/embedded/embedded-cpp/part2-01-raii-basics) — Constructor 실패

## 다음 글

[Part 3-06: 에러 처리 패턴](/blog/embedded/embedded-cpp/part3-06-error-handling-patterns) — 위의 도구들을 어떻게 조합해 실용적인 에러 시스템을 만드는지 살펴봅니다.
