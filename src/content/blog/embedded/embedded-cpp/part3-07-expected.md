---
title: "std::expected 분석 — C++23 결과 타입과 에러 전파"
slug: "embedded/embedded-cpp/part3-07-expected"
date: 2026-04-30T09:25:00
description: "C++23의 Result type — Rust 같은 monadic 에러 처리, 예외 없이 풍부한 정보."
series: "Embedded C++ for Real Systems"
seriesOrder: 25
tags: [cpp, embedded, expected, cpp23, result-type, monadic]
type: tech
topics: ["embedded"]
---

## 한 줄 요약

> **"`expected<T, E>`는 value 또는 error를 담습니다."** 예외 없이 풍부한 정보, 체인 가능성을 제공합니다. 객체 크기와 호출 비용은 T·E·ABI·최적화로 확인합니다.

## 어떤 문제를 푸는가

`std::optional<T>`는 값의 유무만 표현하므로 에러 종류는 알 수 없습니다.

```cpp
std::optional<int> divide(int a, int b);
// b == 0이라 실패? 또는 overflow? — 모름
```

C++23의 **`std::expected<T, E>`**가 이를 해결합니다.

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

Rust의 `Result<T, E>`와 거의 동일하며, 예외 없이 type-safe하게 작동합니다.

## 기본 사용

```cpp
#include <expected>

// 성공
std::expected<int, Error> success() {
    return 42;   // value
}

// 실패
std::expected<int, Error> failure() {
    return std::unexpected(Error::DivideByZero);
}

// 결과 확인
auto r = some_function();
if (r) {                    // 또는 r.has_value()
    int value = *r;         // 성공 확인 후 접근; value()는 실패 시 예외
} else {
    Error e = r.error();
}
```

`std::unexpected<E>`는 명시적 에러 wrapper입니다. `std::expected<T, E>`의 implicit 변환을 막아 T와 E가 같은 타입일 때 모호함을 방지합니다.

## sizeof와 layout

`expected<T, E>`는 내부적으로 union과 태그 bit로 구성됩니다.

```cpp
sizeof(std::expected<int, ErrorEnum>);
// g++-16·Clang 23.1.5: 8 byte (int 4 + 태그 1 + 정렬 패딩 3)

sizeof(std::expected<HugeStruct, ErrorCode>);
// max(sizeof HugeStruct, sizeof ErrorCode) + 태그 + 정렬
```

첫 줄의 8바이트는 64비트 호스트에서 libstdc++·libc++ 모두 같았습니다. 에러 enum을 `uint8_t` 기반으로 두면 `expected<uint8_t, E>`가 2바이트까지 줄어드는 것은 [Part 3-05](/blog/embedded/embedded-cpp/part3-05-no-exception-design#패턴-3--stdexpected-c23)에서 쟀습니다.

expected 자체는 값을 내부에 보관합니다. 저장 기간은 expected 객체의 선언 위치에 따르고, T나 E의 생성·복사 자체는 heap을 사용할 수 있습니다.

## 가용성 — 표준 라이브러리까지 확인

컴파일러 버전만으로 가용성을 판단할 수 없습니다. 언어 모드와 libstdc++·libc++·MSVC STL의 버전을 함께 확인합니다. 다음 기능 매크로는 C++23의 기본 expected와 monadic 확장을 구분하는 기준입니다.

```cpp
#include <expected>
#if !defined(__cpp_lib_expected) || __cpp_lib_expected < 202211L
#error "expected monadic operations required"
#endif
```

미지원 환경에서는 [TartanLlama/expected](https://github.com/TartanLlama/expected)의 C++11/14/17용 구현을 검토할 수 있습니다. release·구성 매크로를 고정하고 std와 API·실패 정책 차이를 확인합니다. 이 장의 실행 예제는 std만 사용하며 tl 라이브러리 성공을 검증했다고 주장하지 않습니다.

## Monadic operations (C++23)

C++23에서 `std::expected`와 함께 들어온 연산입니다(`__cpp_lib_expected` 202211L). 실패를 만나면 이후 단계를 건너뛰는 체인을 만듭니다.

```cpp
// 아래 개념 스케치에서는 공통 Error enum과 이 별칭을 정의합니다.
template<class T, class E = Error> using Result = std::expected<T, E>;
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
        return std::unexpected(e);
    });
```

| Method | 의미 |
| --- | --- |
| `.and_then(f)` | 성공이면 f를 호출하고 Result를 반환합니다 |
| `.or_else(f)` | 실패면 f를 호출하고 Result를 반환합니다 |
| `.transform(f)` | 성공이면 f를 호출하고 값을 반환합니다(자동 wrap) |
| `.transform_error(f)` | 실패면 에러를 변환합니다 |
| `.value_or(default)` | 성공 값 또는 default를 반환합니다 |
| `.has_value()` | bool로 보유 여부를 반환합니다 |

실패 뒤 and_then·transform의 성공 콜백은 건너뜁니다. or_else·transform_error는 실패 시 호출되며 or_else가 복구하면 뒤의 성공 연산이 다시 실행될 수 있습니다. and_then은 동일 에러 타입, or_else는 동일 값 타입을 유지해야 합니다.

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

두 읽기 중 하나가 실패하면 그 에러가 그대로 반환되고, 압력 읽기는 온도 읽기가 성공했을 때만 실행됩니다.

## Result<void, E> — void 특수

C++23 `expected`는 `T = void`도 지원합니다.

```cpp
std::expected<void, Error> write_register(uint8_t addr, uint8_t val) {
    if (addr >= MAX_ADDR) return std::unexpected(Error::InvalidAddr);
    bus_write(addr, val);
    return {};   // 성공, void
}

auto r = write_register(0x10, 0xFF);
if (!r) handle_error(r.error());
```

반환할 값이 없을 때 사용하며, bool 반환보다 명확합니다.

## 임베디드 — 에러 변환

저수준 에러를 고수준 에러로 변환합니다.

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
        return HighError::CommunicationFailed;
    });
}
```

`transform_error`로 에러 타입만 변환하면 값은 그대로 전파됩니다.

## 패턴 — Combinator로 여러 결과 합치기

C++23은 기본 combinator를 제공하지 않으므로 직접 만듭니다.

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

어느 한쪽이 실패하면 전체가 실패하며 양쪽 실패 시 a의 에러를 선택합니다. 단, read_temp()와 read_pressure()는 combine 호출 전에 둘 다 실행되고 인자 평가 순서는 지정되지 않습니다. 실패하면 두 번째 읽기 자체를 건너뛰려면 and_then을 사용합니다. 위 복사 기반 버전은 copyable 값에 한정됩니다.

## Move semantics — 큰 객체

```cpp
Result<HugeData> create_data() {
    HugeData d;
    // ... heavy initialization
    return d;   // move
}

auto r = create_data();
if (r) {
    HugeData d = std::move(*r);   // 성공 상태 확인 후 이동
    process(d);
} else {
    handle_error(r.error());
}
```

`return d;`는 `HugeData`에서 `Result<HugeData>`로의 변환이라 복사 생략 대상이 아니지만, 지역 변수 반환이므로 이동 생성자로 옮겨집니다. 값은 expected 객체 안에 있으므로 이 크기가 반환값 자리를 차지합니다.

## 자주 보는 함정과 안티패턴

### 1. value() 호출 전 확인 누락
```cpp
auto r = read();
auto v = r.value();   // r이 error면 std::bad_expected_access throw
```
표준의 value() 실패 동작은 `bad_expected_access`를 던지는 것입니다. `-fno-exceptions`로 에러 상태의 `value()`를 부르면 두 라이브러리 모두 프로그램을 끝냈습니다. g++-16(libstdc++)은 메시지 없이 abort(exit 134), Clang 23.1.5(libc++)는 `bad_expected_access was thrown in -fno-exceptions mode`를 출력한 뒤 exit 134였습니다. `*r`·`r.error()`도 해당 상태라는 전제조건이 있으므로 항상 상태를 먼저 검사합니다.

### 2. Implicit conversion 함정
```cpp
std::expected<int, int> r = 42;   // value or error? — value
return 0;   // 0이 error로 의도? — 모호
```
명시적으로 `return std::unexpected(0);`을 사용합니다.

### 3. expected를 boolean처럼 사용
```cpp
if (r == true) { /* */ }   // 직관에 어긋남
```
`expected<T, E>`의 `==`는 bool 변환이 아니라 보유한 값과의 비교입니다. `std::expected<int, Error> r = 42;`에서 `bool(r)`은 1인데 `r == true`는 0이었습니다(두 라이브러리 동일). `42 == true`, 즉 `42 == 1`을 비교했기 때문입니다. `if (r)` 또는 `r.has_value()`를 씁니다.

### 4. 에러 무시
```cpp
auto r = risky();
proceed();   // r 확인 안 함
```
`[[nodiscard]]`를 붙이지 않은 함수의 결과를 버리면 라이브러리마다 결과가 달랐습니다. g++-16은 libstdc++가 `std::expected` 클래스 자체에 `[[nodiscard]]`를 붙여 두어 `warning: ignoring returned value of type 'std::expected<int, Error>', declared with attribute 'nodiscard' [-Wunused-result]`를 냈고, Clang 23.1.5(libc++)는 아무 경고도 내지 않았습니다. 실패 무시를 차단해야 하는 함수에는 `[[nodiscard]]`를 직접 붙이고 `-Werror=unused-result`로 검증합니다.

### 5. Result type 인스턴스화 폭증
```cpp
Result<TypeA> ...
Result<TypeB> ...
// 각 T마다 expected 인스턴스
```
클래스 템플릿의 멤버는 쓰인 것만 인스턴스화되므로, 인스턴스마다 남는 코드는 실제로 쓰는 멤버만큼입니다. 이 글에서는 인스턴스 수에 따른 코드 크기를 재지 않았습니다. 늘어나는지 보려면 [Part 1-04](/blog/embedded/embedded-cpp/part1-04-code-size-analysis)의 `nm -S -C | grep expected`로 확인합니다.

### 6. Monadic chain에서 lambda 캡처
```cpp
auto r = compute()
    .and_then([big_obj = std::move(b)](int v) { ... });
```
lambda capture가 큰 객체를 들고 다니면 메모리 부담이 커집니다. references나 작은 객체로 좁힙니다.

## 실행 확인 — 경계값과 short-circuit

다음 독립 파일은 동일 에러 타입을 유지하는 and_then, 실패 콜백 건너뛰기, transform_error, void 결과를 확인합니다. INT_MIN/-1은 정수 나눗셈의 overflow이므로 나눗셈 전에 차단합니다.

```cpp title="expected-check.cpp"
#include <cassert>
#include <climits>
#include <expected>
#if !defined(__cpp_lib_expected) || __cpp_lib_expected < 202211L
#error "expected monadic operations required"
#endif
enum class Error { DivideByZero, Overflow };
[[nodiscard]] std::expected<int, Error> divide(int a, int b) {
    if (b == 0) return std::unexpected(Error::DivideByZero);
    if (a == INT_MIN && b == -1) return std::unexpected(Error::Overflow);
    return a / b;
}
int main() {
    assert(divide(10, 2).value_or(-1) == 5);
    assert(divide(INT_MIN, -1).error() == Error::Overflow);
    int calls = 0;
    auto step = [&](int n) -> std::expected<int, Error> { ++calls; return n+1; };
    auto failure = divide(1, 0).and_then(step);
    assert(!failure && calls == 0);
    auto success = divide(8, 2).and_then(step).transform([](int n) { return n*2; });
    assert(success.value_or(-1) == 10 && calls == 1);
    auto translated = failure.transform_error([](Error e) { return e == Error::DivideByZero ? 7 : 8; });
    assert(!translated && translated.error() == 7);
    std::expected<void, Error> done;
    assert(done.has_value());
#ifdef IGNORE_RESULT
    divide(1, 0);
#endif
}
```

```bash
clang++ -std=c++23 -fno-exceptions -Wall -Wextra -Werror expected-check.cpp -o expected-check
./expected-check
```

Homebrew Clang 23.1.5와 g++-16 모두 `-std=c++23 -fno-exceptions -Wall -Wextra -Werror`로 exit 0이었고, `-DIGNORE_RESULT`는 두 컴파일러 모두 `-Werror`에서 거부했습니다. 이 글의 ARM 툴체인에는 libstdc++가 없어 Cortex-M 코드 크기는 재지 못했습니다. sizeof는 객체 배치의 크기이며 함수의 기계어 크기가 아닙니다.

## 정리

- `std::expected<T, E>`(C++23)는 value 또는 error를 담으며 Rust의 `Result<T, E>`에 대응합니다.
- tl::expected는 C++11/14/17 환경용 구현이며 고정 버전의 차이를 확인합니다.
- Monadic operations(`and_then`, `or_else`, `transform`)로 체인을 구성합니다.
- expected는 값을 내부에 보관하지만 T·E의 내부 할당은 별도로 확인합니다.
- 에러 변환은 `transform_error`로 계층화합니다.
- 중요한 결과를 반환하는 함수에 직접 [[nodiscard]]를 붙여 무시 진단을 검증합니다.

## 근거와 검증 범위

2026-11-16에 `expected-check.cpp`와 `sizeof`·`value()`·`==`·nodiscard 시험을 Homebrew Clang 23.1.5(libc++)와 g++-16(libstdc++)으로 macOS arm64 host에서 실행했습니다. 보드 실행·WCET·tl::expected 빌드는 하지 않았습니다. 다른 이름 없는 코드 블록은 주변에 정의한 장치 API를 가정하는 부분 예제이며 하나의 translation unit으로 합치지 않습니다.

- [expected 값·에러·monadic 계약](https://eel.is/c++draft/expected)

## 관련 항목

- [Part 3-05: No-Exception 설계](/blog/embedded/embedded-cpp/part3-05-no-exception-design) — 배경
- [Part 3-06: 에러 처리 패턴](/blog/embedded/embedded-cpp/part3-06-error-handling-patterns) — 시스템 설계
- [Part 1-08: C++ 표준 선택](/blog/embedded/embedded-cpp/part1-08-cpp-standard-choice) — C++23 채택
- [Rust Result documentation](https://doc.rust-lang.org/std/result/) — 동일 idea

## 다음 글

[Part 3-08: No-RTTI 설계](/blog/embedded/embedded-cpp/part3-08-no-rtti-design) — `-fno-rtti` 환경에서 type info 없이 다형성을 구현합니다.
