---
title: "Part 3-05: No-Exception 설계"
date: 2026-05-15T05:00:00
description: "-fno-exceptions 환경에서 에러 처리 — error code, std::optional, std::expected."
series: "Embedded C++ for Real Systems"
seriesOrder: 23
tags: [cpp, embedded, no-exceptions, error-handling, optional, expected]
type: tech
---

## 한 줄 요약

> **"임베디드는 *예외 끔*."** — error code, `std::optional`, `std::expected`로 *명시적 에러 처리*.

## 어떤 문제를 푸는가

C++ 예외는 *런타임 비용*이 큽니다.

- Unwind table — *수 KB 추가*
- `throw` 시 *수십 μs* 지연 (deterministic 아님)
- Stack unwinding으로 *예측 못 한 destructor* 호출
- 인증 환경에서 *대부분 금지*

임베디드는 거의 항상 `-fno-exceptions`. 그러나 *에러는 발생*합니다. *예외 없이 어떻게* 처리하나.

이 글은 *no-exception 환경의 에러 처리 패턴* 4가지를 정리합니다.

## 패턴 1 — Error code 반환

가장 단순. C의 전통.

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

장점: *명시적, 가벼움*.
단점: *반환값과 결과 분리* (out-parameter).

### 검증을 강제 — `[[nodiscard]]`

```cpp
[[nodiscard]] ErrorCode read_register(uint8_t addr, uint8_t& value);

read_register(0x10, v);   // WARNING — return 값 무시
```

`[[nodiscard]]` (C++17)이 *컴파일러 경고*. *Werror로 에러*.

## 패턴 2 — `std::optional` (C++17)

값의 *유무*를 표현. 에러 *상세 정보 없음*.

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

장점: *반환값과 결과 통합*, *간결*.
단점: *에러 종류 모름*.

`std::optional`은 *내부적으로 union + bool* — *heap 없음, sizeof = sizeof(T) + 약간*.

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

성공 시 *값 직접 반환*. 실패는 *nullopt*.

## 패턴 3 — `std::expected` (C++23)

값 *또는* 에러. *완전한 정보*.

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

장점: *값 + 에러 종류 통합*, *명시적*.
단점: *C++23 — toolchain 미지원* 가능.

자세한 내용은 [Part 3-07: std::expected](/blog/embedded/embedded-cpp/part3-07-expected).

## 패턴 4 — tl::expected (C++17 호환)

C++23 std::expected의 *header-only 백포트*. C++17부터 사용 가능.

```cpp
#include <tl/expected.hpp>

tl::expected<uint8_t, ReadError> read_register(uint8_t addr) {
    if (addr >= MAX_ADDR) return tl::unexpected(ReadError::InvalidAddr);
    return bus_read(addr);
}
```

API가 *std::expected와 거의 동일*. *임베디드에서 C++17 + 백포트* 패턴.

## 비교 표

| 패턴 | 표준 | 에러 정보 | 코드 크기 | 사용성 |
| --- | --- | --- | --- | --- |
| Error code + out param | C++98 | 풍부 | 작음 | 보통 |
| `std::optional<T>` | C++17 | 없음 (유/무만) | 작음 | 좋음 |
| `std::expected<T, E>` | C++23 | 풍부 | 작음 | 매우 좋음 |
| `tl::expected<T, E>` | C++17 (백포트) | 풍부 | 작음 | 매우 좋음 |

## STL이 *예외 던지는 함수*

`-fno-exceptions` 환경에서 *주의할 STL*.

```cpp
std::vector<int> v = {1, 2, 3};

v.at(10);                    // throw std::out_of_range
v[10];                       // UB (but no throw)

std::string s("hello");
s.at(100);                   // throw

std::stoi("not a number");   // throw
```

`-fno-exceptions` 컴파일 시:
- 일부는 *abort 호출*
- 일부는 *UB*
- 일부는 *컴파일 에러*

해결 — *명시적 검증*:

```cpp
if (idx < v.size()) v[idx];

// std::stoi 대신
int result = 0;
auto [ptr, ec] = std::from_chars(str, str + len, result);
if (ec == std::errc{}) { /* OK */ }
```

`std::from_chars` (C++17)는 *예외 없음*. *임베디드 안전*.

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

각 *계층의 에러*는 *해당 도메인 의미*. 위 계층이 *상세를 wrap*.

## 에러 전파 — and_then / or_else (C++23)

monadic operations로 *체인 구성*.

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

*pipe-style*. 첫 실패에서 *체인 short-circuit*. *Rust의 Result*와 유사.

tl::expected도 *유사 API* 제공.

## Heap 없는 string error message

`std::string`은 *heap 사용*. *고정 메시지*만 권장.

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

*Flash에 박힌 string*. *RAM, heap 0*.

## RAII와의 호환

`-fno-exceptions`에서도 *RAII는 정상 동작*. 단 *생성자 실패*가 *까다로움* (throw 못 함).

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

자세한 패턴은 [Part 2-01](/blog/embedded/embedded-cpp/part2-01-raii-basics) "Constructor에서 실패".

## 자주 보는 함정과 안티패턴

### 1. *예외 켜진 코드 link*
한 모듈만 `-fexceptions` — *unwind table* 또 들어옴. *모든 모듈 일치*.

### 2. *STL throw 함수 호출*
`vec.at(idx)` 대신 `vec[idx]` + 직접 검증. `string::substr()`, `stoi()` 등 주의.

### 3. *에러 반환값 무시*
```cpp
ErrorCode foo();
foo();   // ignored
```
`[[nodiscard]]` + Werror.

### 4. *optional/expected에 큰 객체*
```cpp
std::optional<HugeStruct> result;   // sizeof(HugeStruct) + 1
```
*pointer 활용* 또는 *큰 객체 분리*.

### 5. *에러를 boolean으로 통합*
```cpp
bool foo();   // 성공/실패만 — 이유 모름
```
*enum 사용* — 추적 가능.

### 6. *예외 같은 코드 흐름*
```cpp
auto v = read1();
if (!v) return /* propagate */;
auto w = read2(*v);
if (!w) return /* propagate */;
auto x = read3(*w);
// 매번 if 분기
```
C++23 `and_then`으로 *체인*. C++17 직접 *마이그레이션*.

## 측정 — 예외 켰을 때 vs 끈 시 코드 크기

같은 simple program (STM32F4).

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

*7 KB 차이*. 작은 프로젝트에서 *수십 퍼센트*.

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

[Part 3-06: 에러 처리 패턴](/blog/embedded/embedded-cpp/part3-06-error-handling-patterns) — 위 도구들을 *어떻게 조합*해 *실용적 에러 시스템* 만드는가.
