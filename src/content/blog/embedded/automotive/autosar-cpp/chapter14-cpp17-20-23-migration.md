---
title: "Ch 14: C++17/20/23 임베디드 적용 평가 매트릭스"
date: 2025-09-15T15:00:00
description: "C++17/20/23의 모든 주요 기능을 *임베디드 안전 critical 관점*에서 평가. 권장·중립·회피로 분류, 마이그레이션 전략."
tags: [autosar, cpp, cpp17, cpp20, cpp23, migration, modules, concepts, coroutines]
series: "AUTOSAR C++14"
seriesOrder: 14
draft: false
---

AUTOSAR C++14는 *C++14*에 고정됐다. 하지만 *후계 표준 MISRA C++:2023*은 C++17, 일부 C++20 채택. 이 장은 *C++17/20/23의 모든 주요 기능*을 *임베디드 안전 critical 관점*에서 평가하고 *마이그레이션 우선순위*를 본다.

## 평가 기준

```
권장 (✓✓):  안전 critical에 *적극 도입* 추천. 컴파일 시 검증 강화.
긍정 (✓):   도입 가능. 적용 영역 제한적.
중립 (○):  도입 무방. 큰 이점 없지만 해 없음.
주의 (△):  특정 패턴만 허용. 일반적 사용 회피.
회피 (✗):  안전 critical에 *권장하지 않음*. 분석 곤란, 결정성 손상 등.
```

## C++17 — 임베디드 적용 평가

### 코어 언어 기능

| 기능 | 평가 | 이유 |
|------|------|------|
| **if constexpr** | ✓✓ | 컴파일 시 분기. tag dispatch 대체. |
| **Structured bindings** | ✓ | 가독성 향상. `auto [a, b] = pair;` |
| **Inline variables** | ✓✓ | 헤더에 static 변수 정의 가능. ODR 안전. |
| **Class template argument deduction (CTAD)** | ✓ | `std::vector v{1, 2, 3};` 추론. 단순화. |
| **Fold expressions** | ✓ | Variadic template 간결화. |
| **`constexpr` lambda** | ✓✓ | 컴파일 시 lambda 평가. |
| **`__has_include`** | ✓ | 조건부 include — 이식성. |
| **Nested namespaces** | ✓ | `namespace a::b::c {}` — 가독성. |
| **Hexadecimal float literals** | ✓ | `0x1.8p3` — 정확한 부동소수. |
| **`u8` character literal** | ✓ | UTF-8 명시. |
| **Mandatory copy elision** | ✓✓ | RVO 의무화 — `std::move` 불필요. |
| **`[[fallthrough]]`, `[[nodiscard]]`, `[[maybe_unused]]`** | ✓✓ | Attribute 표준화. MISRA 호환. |
| **Removed `auto_ptr`, `bind1st`, `binary_function`** | ✓ | Deprecated 정리. |

### 표준 라이브러리

| 기능 | 평가 | 이유 |
|------|------|------|
| **`std::optional`** | ✓✓ | NULL pointer 대체. CERT EXP34 해소. |
| **`std::variant`** | ✓ | Type-safe union. |
| **`std::any`** | △ | 동적 타입. 분석 곤란. |
| **`std::string_view`** | ✓✓ | 비-소유 문자열. `const char *` 대체. |
| **`std::filesystem`** | ○ | 임베디드에 거의 무용 (filesystem 가정). |
| **`std::byte`** | ✓✓ | char/uint8_t 의미 분리. CERT INT37 해소. |
| **Parallel algorithms (`std::execution::par`)** | △ | RTOS에서 동작 미지원 흔함. |
| **`<memory_resource>`** (Polymorphic allocator) | ✓ | Custom allocator 표준화. |
| **`std::scoped_lock`** | ✓✓ | 다중 mutex deadlock-free. |
| **`std::launder`** | △ | 매우 미묘. 일반 코드에 불필요. |
| **`std::aligned_alloc`** | ✓ | C11 `aligned_alloc` 표준화. |

### 평가 — C++17 마이그레이션

**적극 도입 후보**:
- `if constexpr`, `[[nodiscard]]`, `[[fallthrough]]`
- `std::optional`, `std::string_view`, `std::byte`
- `std::scoped_lock`
- mandatory copy elision

**대부분의 자동차 OEM**이 *C++17로 점진 이전*. AUTOSAR R23-11 이후 *부분 C++17 채택*.

### C++17 예 — `std::optional` + `std::string_view`

```cpp
// C++14 — 옛 스타일
const char *find_value(const char *key);
if (find_value("foo") != nullptr) {
    // 사용
}

// C++17 — 명확한 의도
std::optional<std::string_view> find_value(std::string_view key);

if (auto v = find_value("foo")) {
    auto sv = *v;     // string_view
}

// or
auto v = find_value("foo").value_or("default");
```

NULL deref 차단, 의미 명확.

### C++17 예 — `std::byte`

```cpp
// C++14 — char가 정수인지 문자인지 헷갈림
char buf[256];
int sum = 0;
for (int i = 0; i < 256; i++) sum += buf[i];    // signed/unsigned char?

// C++17 — std::byte는 *명시적으로 octet*
std::byte buf[256];
int sum = 0;
for (int i = 0; i < 256; i++) sum += std::to_integer<int>(buf[i]);
```

`std::byte`는 *정수 산술 자동 변환 없음*. *byte 의미*만.

## C++20 — 큰 변화

### 코어 언어 — 큰 4개

| 기능 | 평가 | 이유 |
|------|------|------|
| **Concepts** | ✓✓ | SFINAE 대체. 에러 메시지 명확. 컴파일 시 계약. |
| **Modules** | △ | 컴파일 시간 단축, 하지만 *컴파일러·빌드 시스템 지원 미성숙*. |
| **Coroutines** | △ | Async 표준. 임베디드 RTOS 통합 어려움. 동적 메모리 사용. |
| **Ranges** | ✓ | iterator + algorithm 일관 인터페이스. |

### Concepts — 가장 큰 변화

```cpp
// C++14 SFINAE — 가독성 최악
template <typename T,
          typename = std::enable_if_t<std::is_integral_v<T>>>
T Increment(T value) { return value + 1; }

// C++20 — 깔끔
template <std::integral T>
T Increment(T value) { return value + 1; }

// 또는 abbreviated
auto Increment(std::integral auto value) { return value + 1; }
```

에러 메시지:

```
// C++14 SFINAE
error: no matching function for call to 'Increment(double)'
note: candidate template ignored: substitution failure [with T = double]
note: deduced template arguments produced type 'std::enable_if_t<false>' that is invalid

// C++20 concept
error: no matching function for call to 'Increment(double)'
note: constraints not satisfied
note: because 'std::integral<double>' evaluated to false
note: 'double' is not an integral type
```

C++20 에러는 *바로 이해 가능*.

### Modules — 어려움

```cpp
// C++20 — module 선언
export module math;

export int Add(int a, int b) { return a + b; }
```

```cpp
// 사용자
import math;
int x = Add(1, 2);
```

**장점**:
- Header 파싱 불필요 → 컴파일 시간 *대폭 감소* (1/10 수준)
- ODR 위반 차단
- Macro pollution 없음

**문제**:
- GCC 11+, Clang 16+ 지원. 임베디드 cross-compiler 지원 *미성숙*
- CMake 3.28+가 모듈 빌드 지원. 다른 빌드 시스템은 아직
- 디버거·정적 분석기 지원 진행 중

**임베디드 채택**: *수년 내 단계적*. 지금은 *header 유지* 권장.

### Coroutines — 임베디드 적합성

```cpp
// async I/O 패턴
generator<int> Range(int n) {
    for (int i = 0; i < n; i++) co_yield i;
}

for (int x : Range(10)) std::cout << x;
```

**문제**:
- *Coroutine frame*이 *heap allocation*. 안전 critical에서 *malloc 금지*와 충돌.
- *Custom allocator* 지정 가능하지만 *복잡*.
- 정적 분석 어려움.

**임베디드 적용**: *회피*. 일부 *FreeRTOS task 대체*로 시도되지만 *checkmark 미달*.

### Ranges — 깔끔한 알고리즘

```cpp
// C++17
std::vector<int> v = {1, 2, 3, 4, 5};
auto it = std::find_if(v.begin(), v.end(), [](int x) { return x > 3; });

// C++20 ranges
auto it = std::ranges::find_if(v, [](int x) { return x > 3; });

// 또는 view
auto evens = v | std::views::filter([](int x) { return x % 2 == 0; })
               | std::views::transform([](int x) { return x * x; });
```

**효과**: 가독성 ↑. 성능은 *컴파일러가 최적화 잘 함*.

**임베디드 적용**: *권장*. 단 *lazy evaluation* 패턴이라 *반복 호출 시 비용 분산*.

### 추가 C++20 기능

| 기능 | 평가 |
|------|------|
| `consteval` | ✓✓ — 컴파일 시 강제. |
| `constinit` | ✓✓ — 정적 초기화 보장. |
| `constexpr` 가상 함수 | ✓ |
| `constexpr` 동적 할당 (제한) | ○ — 컴파일 시 한정 |
| Three-way comparison `<=>` | ✓✓ — `operator==/!=/<` 자동 |
| Designated initializers | ✓ — `Foo f{.x = 1, .y = 2};` |
| `std::span` | ✓✓ — gsl::span 표준화 |
| `std::format` | ✓ — printf 안전 대체 |
| Calendar / timezone | ○ — 임베디드 거의 무용 |
| `std::source_location` | ✓ — `__FILE__/__LINE__` 대체 |
| `std::stop_token`, `std::jthread` | ✓ — RAII thread |
| Atomic wait/notify | ✓ |
| `std::barrier`, `std::latch` | ✓ — 동기화 primitive |

## C++23 — 점진적 개선

### 코어 언어

| 기능 | 평가 |
|------|------|
| **`if consteval`** | ✓✓ — consteval/constexpr 통합 |
| **Deducing `this`** | ✓ — explicit object parameter |
| **Multidimensional `operator[]`** | ✓ — `mat[i, j]` 가능 |
| **`#warning`** | ○ |
| **`auto(x)` decay copy** | ○ |

### 표준 라이브러리

| 기능 | 평가 |
|------|------|
| **`std::expected`** | ✓✓ — Error handling 표준. `std::variant<T, Error>` 대체. |
| **`std::print`** | ✓ — `std::format` 직접 출력 |
| **`std::mdspan`** | ✓ — multi-dimensional span |
| **`std::stacktrace`** | ✓ — 런타임 stacktrace (디버그) |
| **`std::flat_map`, `std::flat_set`** | ✓✓ — Vector-backed map. 임베디드 적합. |
| **`std::stoptoken` 통합** | ✓ |
| **`std::generator`** | △ — Coroutine 기반 |

### 새로운 안전 도구

**`std::expected<T, E>`**:

```cpp
// C++20 이전 — 예외 또는 에러 코드
int Parse(const std::string &s, int *out);

// C++23
std::expected<int, ParseError> Parse(std::string_view s);

auto r = Parse("42");
if (r) {
    int v = *r;
} else {
    ParseError e = r.error();
    HandleError(e);
}

// monadic chaining
auto result = Parse(s)
    .and_then([](int v) { return Validate(v); })
    .transform([](int v) { return v * 2; });
```

Rust의 `Result<T, E>` 패턴. *예외 없는 에러 처리* — 임베디드 권장.

**`std::flat_map`**:

```cpp
// C++17 std::map — 노드 기반, malloc 풍부
std::map<int, std::string> m;

// C++23 std::flat_map — vector 기반
std::flat_map<int, std::string> m;
// 데이터: vector<int> keys + vector<string> values, 정렬 유지
// 빠른 lookup (binary search), cache locality, 적은 할당
```

임베디드에 *훨씬 적합*. *AVL/Red-Black tree*의 dynamic allocation 회피.

## 마이그레이션 우선순위

```
Priority 1 (즉시 도입 권장):
  - [[nodiscard]], [[fallthrough]], [[maybe_unused]]
  - std::optional
  - std::string_view
  - std::byte
  - std::scoped_lock
  - if constexpr (tag dispatch 대체)
  - Mandatory copy elision

Priority 2 (검증 후 도입):
  - Concepts (가독성 큰 향상)
  - std::span (gsl::span 표준)
  - Three-way comparison
  - consteval / constinit
  - Designated initializers
  - std::format / std::print (printf 대체)
  - std::expected (에러 처리)
  - std::flat_map (heap 절약)

Priority 3 (사례별 검토):
  - Ranges (lazy 패턴 이해 필요)
  - std::source_location (디버그 용도)
  - Atomic wait/notify

Priority 4 (회피 또는 한정):
  - Modules (도구 미성숙)
  - Coroutines (heap 사용)
  - Parallel algorithms (RTOS 미지원)
  - Calendar / timezone
```

## 컴파일러 지원 매트릭스 (2024)

| 컴파일러 | C++17 | C++20 (core) | C++20 (modules) | C++23 |
|---------|-------|-------------|-----------------|-------|
| GCC 13 | 완전 | 완전 | 부분 | 부분 |
| Clang 17 | 완전 | 완전 | 부분 | 부분 |
| MSVC 2022 | 완전 | 완전 | 완전 | 부분 |
| **arm-none-eabi-gcc 12** | 완전 | 부분 | X | X |
| **arm-none-eabi-gcc 13** | 완전 | 부분 | 일부 | 매우 부분 |
| TI ARM CGT | C++14 | X | X | X |
| Renesas CC-RX | C++14 부분 | X | X | X |

자동차 cross-compiler는 *C++14에서 멈춰* 있는 경우가 많다. AUTOSAR C++14 채택의 이유.

## ABI 이슈

C++17 → C++20 변경은 *일부 ABI 변경*. 라이브러리·바이너리 재컴파일 필요.

```bash
# 같은 컴파일러로 모든 라이브러리 + 사용자 코드 빌드
# 동일 표준 모드 (-std=c++17 vs -std=c++20 혼용 X)
```

특히 *vendor 제공 SDK*가 *C++14만 지원*하면 *C++17 이상으로 빌드 어려움*.

## C++20 Module + Build System

CMake 3.28+ + Ninja 1.11+ + GCC 14 / Clang 17 조합이 안정.

```cmake
# CMakeLists.txt
cmake_minimum_required(VERSION 3.28)
set(CMAKE_CXX_STANDARD 20)

add_library(math STATIC)
target_sources(math
    PUBLIC FILE_SET CXX_MODULES FILES math.cppm)
```

자동차 cross-compiler 호환은 *수년 더* 필요.

## C++20 Concepts — 적용 예

### Numeric 타입 제한

```cpp
template <std::integral T>
T Clamp(T value, T min, T max) {
    return std::max(min, std::min(value, max));
}

Clamp(5, 0, 10);       // OK
Clamp(5.0, 0.0, 10.0); // 컴파일 에러 (floating_point 필요)
```

### Custom concept

```cpp
template <typename T>
concept Serializable = requires(T t, std::byte *buf) {
    { t.Serialize(buf) } -> std::same_as<size_t>;
    { T::kSerializedSize } -> std::convertible_to<size_t>;
};

template <Serializable T>
void Send(const T &val) {
    std::byte buf[T::kSerializedSize];
    val.Serialize(buf);
    // ... transmit ...
}
```

타입이 *Serialize 인터페이스*를 가지는지 컴파일 시 검증. *Duck typing의 정적 버전*.

## C++23 std::expected — Error monad

```cpp
enum class CanError { BusOff, Timeout, InvalidMsg };

std::expected<CanMessage, CanError> Receive(int timeout_ms);

// 사용
void Handle() {
    auto msg = Receive(100);

    // 패턴 1 — 명시적 체크
    if (!msg) {
        if (msg.error() == CanError::Timeout) RetryLater();
        else if (msg.error() == CanError::BusOff) Reinit();
        return;
    }
    Process(*msg);

    // 패턴 2 — monadic chaining
    Receive(100)
        .and_then([](CanMessage m) -> std::expected<Reply, CanError> {
            return ComputeReply(m);
        })
        .or_else([](CanError e) -> std::expected<Reply, CanError> {
            LogError(e);
            return std::unexpected(e);
        });
}
```

Rust의 `?` 연산자처럼 *짧고 안전한 에러 전파*.

## AUTOSAR → MISRA C++:2023 마이그레이션

MISRA C++:2023은 *AUTOSAR C++14 + MISRA C++:2008의 통합*. 차이점:

| 변경 | AUTOSAR → MISRA C++:2023 |
|------|--------------------------|
| 기반 표준 | C++14 → C++17 (옵션 C++20) |
| 규칙 수 | 340 → ~180 (재구조화) |
| 분류 | Required/Advisory → Mandatory/Required/Advisory |
| Concepts 일부 통합 | 새 추가 |

### 마이그레이션 단계

```
Phase 1 (~6개월):
  - Toolchain 업그레이드 (GCC/Clang)
  - Compiler 호환 확인
  - C++17 enable
  - 자동 마이그레이션 도구 (clang-tidy modernize-*)

Phase 2 (~6개월):
  - Priority 1 기능 도입
    - [[nodiscard]] 전역 적용
    - std::optional 도입
    - std::string_view 도입
    - std::byte 도입
  - MISRA C++:2023 매핑 표 작성

Phase 3 (~12개월):
  - Priority 2 기능 (concepts, span 등)
  - 새 코드부터 MISRA C++:2023 적용
  - 기존 코드 점진 마이그레이션

Phase 4 (~6개월):
  - 모든 코드 MISRA C++:2023
  - AUTOSAR C++14 보고 종료
  - 새 ISO 26262 심사 통과
```

총 *24-30개월* 계획.

## C++ 표준 진화 — 임베디드 관점

```
C++11/14: AUTOSAR C++14 정의 시점. Modern C++의 시작.
C++17:    안전 도구 (optional, byte, string_view), if constexpr.
C++20:    Concepts (큰 변화), 일부 도구 미성숙 (modules, coroutines).
C++23:    expected (error handling), flat_map (heap 절약).
C++26:    Reflection (예정), Contracts 표준화 (예정).
```

C++26의 *contracts*가 표준화되면 *Expects/Ensures*가 *언어 차원*에서 지원. *큰 안전성 향상*.

## 정리

- C++17은 *대부분 안전*. Priority 1 기능 즉시 도입 권장.
- C++20은 *Concepts가 가장 큰 가치*. Modules·Coroutines는 *대기*.
- C++23 `std::expected`, `std::flat_map`이 임베디드에 *직접 효과*.
- 자동차 cross-compiler가 *C++14에 멈춰* 있는 경우가 많아 *toolchain 업그레이드*가 마이그레이션 첫 단계.
- AUTOSAR C++14 → MISRA C++:2023 이전은 *24-30개월* 계획.
- 회피 권장: Modules (미성숙), Coroutines (heap), Parallel algorithms (RTOS 미지원).

## 다음 장 예고

15장은 *Real-time analysis* — WCET, scheduling analysis, AUTOSAR Adaptive의 실시간 보장.

## 관련 항목

- [Ch 12 — Compile-time C++](/blog/embedded/automotive/autosar-cpp/chapter12-compile-time-cpp)
- [Ch 13 — GSL Safety Types](/blog/embedded/automotive/autosar-cpp/chapter13-gsl-safety-types)
- [C++17 Compiler Support](https://en.cppreference.com/w/cpp/compiler_support/17)
- [C++20 Compiler Support](https://en.cppreference.com/w/cpp/compiler_support/20)
- [C++23 Compiler Support](https://en.cppreference.com/w/cpp/compiler_support/23)
- [MISRA C++:2023](https://misra.org.uk/misra-c-plus-plus-2023/)
