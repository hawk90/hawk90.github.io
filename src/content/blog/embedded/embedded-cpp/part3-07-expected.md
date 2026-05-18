---
title: "Part 3-07: std::expected (C++23)"
date: 2026-05-15T07:00:00
description: "C++23의 Result type — Rust 같은 monadic 에러 처리, 예외 없이 풍부한 정보."
series: "Embedded C++ for Real Systems"
seriesOrder: 25
tags: [cpp, embedded, expected, cpp23, result-type, monadic]
type: tech
---

## 한 줄 요약

> **"`expected<T, E>` = *value 또는 error*."** — *예외 없이* 풍부한 정보 + *체인 가능* + *zero-cost*.

## 어떤 문제를 푸는가

`std::optional<T>`는 *값의 유무*만. *에러 종류* 모름.

```cpp
std::optional<int> divide(int a, int b);
// b == 0이라 실패? 또는 overflow? — 모름
```

C++23 **`std::expected<T, E>`**가 해결.

```cpp
enum class Error { DivideByZero, Overflow };

std::expected<int, Error> divide(int a, int b) {
    if (b == 0) return std::unexpected(Error::DivideByZero);
    if (a == INT_MIN && b == -1) return std::unexpected(Error::Overflow);
    return a / b;
}

auto r = divide(10, 0);
if (!r) {
    switch (r.error()) {
        case Error::DivideByZero: /* */ break;
        case Error::Overflow:     /* */ break;
    }
}
```

*Rust의 `Result<T, E>`* 거의 동일. *예외 없이* type-safe.

## 기본 사용

```cpp
#include <expected>

// 성공
std::expected<int, Error> success() {
    return 42;   // value
}

// 실패
std::expected<int, Error> failure() {
    return std::unexpected(Error::SomeError);
}

// 결과 확인
auto r = some_function();
if (r) {                    // 또는 r.has_value()
    int value = *r;         // 또는 r.value()
} else {
    Error e = r.error();
}
```

`std::unexpected<E>`는 *명시적 에러 wrapper*. `std::expected<T, E>`의 *implicit 변환 막음* (T와 E가 같은 타입일 때 모호 방지).

## sizeof와 layout

`expected<T, E>`는 *내부적으로 union + 태그 bit*.

```cpp
sizeof(std::expected<int, ErrorEnum>);
// 보통 8 byte (int 4 + bool 1 + 정렬 패딩)

sizeof(std::expected<HugeStruct, ErrorCode>);
// max(sizeof HugeStruct, sizeof ErrorCode) + 정렬
```

*heap 없음*. *stack에 직접 들어감*. 임베디드 친화.

## 가용성 — toolchain 확인

| 컴파일러 | `std::expected` |
| --- | --- |
| GCC 12+ | OK (`<expected>` 헤더) |
| Clang 16+ | OK |
| MSVC 19.33+ | OK |
| ARM Compiler 6 | *아직 미지원* (2026) |
| IAR | *아직 미지원* |

미지원 환경 — `tl::expected` 백포트 (C++17부터 사용).

```bash
# Conan 또는 직접 download
# https://github.com/TartanLlama/expected
```

```cpp
#include <tl/expected.hpp>

tl::expected<int, Error> divide(int a, int b);
```

API 거의 동일. 이후 *toolchain 업데이트* 시 *간단히 std로 마이그레이션*.

## Monadic operations (C++23)

`std::expected`의 *가장 강력한 기능*. *Rust ? operator* 같은 체인.

```cpp
// 4단계 처리
auto result = read_register(0x10)
    .and_then([](uint8_t raw) -> Result<float> {
        return raw_to_celsius(raw);
    })
    .and_then([](float c) -> Result<float> {
        return apply_calibration(c);
    })
    .transform([](float c) {
        return c * 1.8f + 32.0f;   // celsius → fahrenheit
    })
    .or_else([](Error e) -> Result<float> {
        if (e == Error::NotReady) return last_known_value;
        return tl::unexpected(e);
    });
```

| Method | 의미 |
| --- | --- |
| `.and_then(f)` | 성공이면 *f 호출 (Result 반환)* |
| `.or_else(f)` | 실패면 *f 호출 (Result 반환)* |
| `.transform(f)` | 성공이면 *f 호출 (값 반환)*. 자동 wrap |
| `.transform_error(f)` | 실패면 *에러 변환* |
| `.value_or(default)` | 성공 값 또는 default |
| `.has_value()` | bool |

체인 중 *첫 실패에서 short-circuit*. 이후 step은 *실행 안 됨*.

## 임베디드 — Driver chain

```cpp
struct SensorReading {
    float temperature;
    float pressure;
    uint16_t timestamp;
};

Result<SensorReading> read_sensor() {
    return read_temperature()
        .and_then([](float t) -> Result<std::pair<float, float>> {
            return read_pressure().transform([t](float p) {
                return std::pair{t, p};
            });
        })
        .transform([](auto pair) {
            return SensorReading{pair.first, pair.second, get_timestamp()};
        });
}

auto data = read_sensor();
if (data) {
    transmit(*data);
} else {
    handle_error(data.error());
}
```

여러 *연속 호출 + 실패 처리*가 *짧고 명확*.

## Result<void, E> — void 특수

C++23 `expected`는 `T = void`도 지원.

```cpp
std::expected<void, Error> write_register(uint8_t addr, uint8_t val) {
    if (addr >= MAX_ADDR) return std::unexpected(Error::InvalidAddr);
    bus_write(addr, val);
    return {};   // 성공, void
}

auto r = write_register(0x10, 0xFF);
if (!r) handle_error(r.error());
```

*반환할 값 없을 때*. *bool 반환보다 명확*.

## 임베디드 — 에러 변환

저수준 에러 → 고수준 에러.

```cpp
enum class LowError { BusTimeout, ChecksumFail };
enum class HighError { CommunicationFailed, DataCorrupted };

Result<Data, LowError> low_level_read();

Result<Data, HighError> high_level_read() {
    return low_level_read().transform_error([](LowError le) {
        switch (le) {
            case LowError::BusTimeout: return HighError::CommunicationFailed;
            case LowError::ChecksumFail: return HighError::DataCorrupted;
        }
    });
}
```

`transform_error`로 *에러 type만 변환*. *값은 그대로 전파*.

## 패턴 — Combinator로 여러 결과 합치기

C++23은 *기본 combinator* 없음. 직접:

```cpp
template<typename T1, typename T2, typename E>
auto combine(std::expected<T1, E> a, std::expected<T2, E> b)
    -> std::expected<std::pair<T1, T2>, E>
{
    if (!a) return std::unexpected(a.error());
    if (!b) return std::unexpected(b.error());
    return std::pair{*a, *b};
}

auto t_and_p = combine(read_temp(), read_pressure());
if (t_and_p) {
    auto [t, p] = *t_and_p;
    process(t, p);
}
```

*어느 한 쪽 실패*면 *전체 실패*. 여러 소스 결합 시 유용.

## Move semantics — 큰 객체

```cpp
Result<HugeData> create_data() {
    HugeData d;
    // ... heavy initialization
    return d;   // move
}

auto r = create_data();
HugeData d = std::move(*r);   // owner 이전
```

`std::expected`도 *move-aware*. 큰 객체도 *복사 없이* 처리.

## 자주 보는 함정과 안티패턴

### 1. *value() 호출 전 확인 누락*
```cpp
auto r = read();
auto v = r.value();   // r이 error면 std::bad_expected_access throw
```
*예외 켰을 때만 throw*. `-fno-exceptions`에선 *abort 또는 UB*. 항상 `if (r)`.

### 2. *Implicit conversion 함정*
```cpp
std::expected<int, int> r = 42;   // value or error? — value
return 0;   // 0이 error로 의도? — 모호
```
*명시적 unexpected*: `return std::unexpected(0);`.

### 3. *expected를 boolean처럼 사용*
```cpp
if (r == true) { /* */ }   // 직관에 어긋남
```
`if (r)` 또는 `r.has_value()`.

### 4. *에러 무시*
```cpp
auto r = risky();
proceed();   // r 확인 안 함
```
`[[nodiscard]]` (expected는 *default nodiscard*).

### 5. *Result type 인스턴스화 폭증*
```cpp
Result<TypeA> ...
Result<TypeB> ...
// 각 T마다 expected 인스턴스
```
보통 무시. 단 *수십 type*이면 *코드 크기 측정*.

### 6. *Monadic chain에서 lambda 캡처*
```cpp
auto r = compute()
    .and_then([big_obj = std::move(b)](int v) { ... });
```
*lambda capture가 큰 객체* → memory 부담. *references*나 *작은 객체*.

## 측정 — `expected` 비용

같은 함수, *return value* 형태 비교.

```text
# bool 반환
bool f() { return true; }
sizeof: 1 (or 4 with alignment)

# error code
ErrorCode f() { return Ok; }
sizeof: 4

# optional<int>
std::optional<int> f() { return 42; }
sizeof: 8

# expected<int, ErrorCode>
std::expected<int, ErrorCode> f() { return 42; }
sizeof: 8 (int + ErrorCode + flag, well aligned)

# 호출 어셈블리 (Cortex-M4 -O2)
모든 형태: 거의 동일 (4-8 instructions)
```

*sizeof 약간 큼*. *runtime 무시*. *type 안전 + monadic chain*의 가치가 *비용보다 큼*.

## 정리

- `std::expected<T, E>`(C++23)는 value 또는 error를 담으며 Rust의 `Result<T, E>`와 같습니다.
- `tl::expected` 백포트로 C++17부터 사용할 수 있습니다.
- Monadic operations(`and_then`, `or_else`, `transform`)로 체인을 구성합니다.
- heap을 쓰지 않고 stack에 직접 두므로 임베디드에 친화적입니다.
- 에러 변환은 `transform_error`로 계층화합니다.
- `[[nodiscard]]`가 기본이므로 무시하면 컴파일러가 경고합니다.

## 관련 항목

- [Part 3-05: No-Exception 설계](/blog/embedded/embedded-cpp/part3-05-no-exception-design) — 배경
- [Part 3-06: 에러 처리 패턴](/blog/embedded/embedded-cpp/part3-06-error-handling-patterns) — 시스템 설계
- [Part 1-08: C++ 표준 선택](/blog/embedded/embedded-cpp/part1-08-cpp-standard-choice) — C++23 채택
- [Rust Result documentation](https://doc.rust-lang.org/std/result/) — 동일 idea

## 다음 글

[Part 3-08: No-RTTI 설계](/blog/embedded/embedded-cpp/part3-08-no-rtti-design) — `-fno-rtti` 환경에서 *type info 없이* 다형성 구현.
