---
title: "Part 1-08: C++ 표준 선택"
date: 2026-05-07T08:00:00
description: "C++11/14/17/20/23 — 임베디드에서 어느 표준을 골라야 하나. 컴파일러 지원, 표준 라이브러리 변화, 핵심 기능 비교."
series: "Embedded C++ for Real Systems"
seriesOrder: 8
tags: [cpp, embedded, standard, cpp11, cpp17, cpp20, cpp23, compiler-support]
type: tech
---

## 한 줄 요약

> **"권장은 C++17입니다. C++20은 concepts와 `std::span`의 가치가 큽니다."** C++23은 `std::expected`를 빼면 아직 적용하기 이른 표준입니다.

## 어떤 문제를 푸는가

C++ 표준 선택은 프로젝트 수명 전체에 영향을 줍니다. 너무 낮으면 좋은 기능을 쓸 수 없고, 너무 높으면 컴파일러 지원이 부족하거나 인증에 막힙니다.

임베디드의 관점은 데스크톱과 다릅니다. 다음을 함께 평가해야 합니다.

- **컴파일러 버전**: 벤더 toolchain은 몇 년 늦습니다(ARM, IAR)
- **표준 라이브러리 크기**: 새 기능이 코드 bloat를 만들 수 있습니다
- **인증 도구**: MISRA, AUTOSAR, DO-178C 도구가 새 표준 지원에 늦습니다
- **팀 친숙도**: C++20 concepts는 학습 곡선이 있습니다

## 각 표준의 핵심 기능

### C++11 — 임베디드의 최소 baseline

GCC 4.8+, Clang 3.3+가 지원합니다. 임베디드 toolchain은 거의 모두 지원합니다.

| 기능 | 임베디드 가치 |
| --- | --- |
| `constexpr` (제한적) | 컴파일 타임 계산의 *시작* |
| `auto` | 가독성 |
| Range-based for | 가독성 |
| `nullptr` | `NULL` 매크로 대체, 타입 안전 |
| `enum class` | 네임스페이스 분리, 암묵 변환 차단 |
| `static_assert` | 컴파일 타임 검증 |
| `unique_ptr` | RAII 소유권, 0 비용 |
| `noexcept` | 예외 없음 명시 |
| `final`, `override` | virtual 오류 잡기 |
| Rvalue reference, move semantics | 복사 비용 감소 |
| Variadic template | type-safe printf 대체 |
| `std::array` | 고정 크기 컨테이너 |
| Initializer list | 균일한 초기화 |
| Lambda | 콜백 단순화 |
| `std::function` | (주의) heap 사용 |

C++03에서 C++11로의 점프가 가장 큽니다. 새 프로젝트는 C++11이 절대 minimum입니다.

### C++14 — 작은 개선

GCC 4.9+에서 지원합니다. 사실상 C++11의 완성판입니다.

| 기능 | 임베디드 가치 |
| --- | --- |
| Generalized `constexpr` (변수, loop) | 더 많은 컴파일 타임 |
| `auto` 반환 타입 | 가독성 |
| Generic lambda | template 람다 |
| Binary literal `0b1010` | 비트 마스크 가독성 |
| Variable templates | `pi<double>` 같은 사용 |
| Deprecated `[[deprecated]]` | API migration |

C++11에서 C++14로의 전환은 대부분 자연스러운 업그레이드입니다. 호환성이 좋습니다.

### C++17 — 권장 기본

GCC 7+, Clang 5+에서 지원합니다. ARM Compiler 6도 완전히 지원합니다. 2025년 임베디드의 기본입니다.

| 기능 | 임베디드 가치 |
| --- | --- |
| `if constexpr` | 컴파일 타임 분기, 템플릿 단순화 |
| Structured bindings | `auto [a, b] = ...` |
| `std::optional` | 값 또는 없음 — 예외 대안 |
| `std::variant` | tagged union, type-safe |
| `std::string_view` | 0-copy 문자열 |
| `[[nodiscard]]` | 반환값 무시 경고 |
| `[[fallthrough]]` | switch fallthrough 명시 |
| Inline variables | 헤더에 변수 정의 |
| Class template argument deduction | `std::array{1, 2, 3}` |
| Folding expressions | variadic template 단순화 |
| Filesystem (조심) | bare-metal 미지원 |

`std::optional`과 `std::variant`만으로도 C++17 채택 가치가 충분합니다. 예외 없는 에러 처리와 closed sum type을 가능하게 합니다.

### C++20 — concept이 게임 체인저

GCC 10+, Clang 12+에서 지원합니다. 일부 기능은 GCC 13+가 필요합니다. ARM Compiler 6은 부분 지원입니다.

| 기능 | 임베디드 가치 |
| --- | --- |
| Concepts | 템플릿 제약, 에러 메시지 명확 |
| `std::span` | 포인터+길이 안전 wrap |
| Ranges (제한적) | `<algorithm>` 대체 |
| `consteval` | 컴파일 타임 *강제* |
| `constinit` | static 초기화 보장 |
| Designated initializers | `S{.x=1, .y=2}` (C 스타일) |
| Modules | 컴파일 시간 단축 (구현 미흡) |
| Coroutines (기본) | async (heap 주의) |
| `std::bit_cast` | type-safe bit manipulation |
| Three-way comparison `<=>` | 비교 연산자 자동 |
| `std::endian` | 엔디안 컴파일 타임 확인 |
| Lambda in unevaluated context | template 단순화 |

C++20의 가장 큰 가치는 concepts와 `std::span`입니다. concepts는 template error message를 읽을 수 있게 만듭니다. `std::span`은 C-style 배열의 위험을 type-safe 함수 인자로 대체합니다.

```cpp
// C++17 이전
void process(int* buf, size_t len);

// C++20
void process(std::span<int> buf);   // 길이 자동 추적, .data() / .size() 안전
```

### C++23 — 아직 이름

GCC 13+, Clang 15+에서 지원합니다. toolchain 지원이 불확실합니다.

| 기능 | 임베디드 가치 |
| --- | --- |
| `std::expected<T, E>` | 예외 없는 Result type |
| `std::mdspan` | 다차원 배열 view |
| `std::print` | iostream 없는 출력 |
| `if consteval` | 컴파일 타임 분기 명시 |
| Deducing `this` | CRTP 단순화 |
| `std::byteswap` | 엔디안 변환 |

`std::expected`만 임베디드 가치가 큽니다. Rust의 `Result<T, E>`에 대응합니다. 자세한 내용은 [Part 3-07](/blog/embedded/embedded-cpp/part3-07-expected)에서 다룹니다.

대부분 2026년 새 프로젝트에서는 C++20을 권장하고 C++17과 호환되게 만듭니다. C++23은 `std::expected`가 필요한 경우에만 씁니다.

## 임베디드 toolchain 지원 현황

2026년 기준(대략)으로 정리하면 다음과 같습니다.

| Toolchain | 최대 표준 | 비고 |
| --- | --- | --- |
| GCC 13+ (ARM, RISC-V) | C++23 (대부분) | 가장 빠름 |
| Clang 16+ | C++23 (대부분) | |
| ARM Compiler 6 (armclang) | C++17 (완전), C++20 부분 | Cortex-M 표준 |
| IAR EW (ARM) | C++17 (완전), C++20 부분 | 인증 환경 |
| Keil MDK (armcc legacy) | C++03 (legacy), C++11 (armclang) | 새 프로젝트는 armclang |
| Xilinx SDK / Vitis | GCC 기반, C++17 |  |
| ESP-IDF (Xtensa GCC) | C++17 (GCC 12+) | |
| Nordic SDK | GCC 기반 | |
| TI Code Composer (CCSv12) | C++17 (Clang 기반) | |
| Microchip XC32 | GCC 기반, C++17 | PIC32, SAM |

최신 표준을 쓰려면 GCC 기반 toolchain이 유리합니다. 벤더 컴파일러(ARM, IAR, Keil)는 1-2 표준 정도 늦습니다.

## 결정 트리

```text
프로젝트 시작 시:

1. 인증 환경 (DO-178C, ISO 26262)?
   YES → C++14 (보수적) 또는 C++17 (도구가 지원하면)
   NO  → 2번으로

2. 벤더 컴파일러 (ARM, IAR, Keil) 사용?
   YES → C++17 (최대), 일부 GCC 기능 사용 자제
   NO  → 3번으로 (GCC/Clang)

3. 팀이 새 표준 학습 시간 있나?
   YES → C++20 (concepts 가치 큼)
   NO  → C++17 (안정적)

4. std::expected 강하게 필요?
   YES → C++23 (GCC 13+ 필수)
   NO  → 위에서 결정한 표준
```

## 컴파일러 플래그 — 표준 명시

```makefile
# C++17 (권장 기본)
CXXFLAGS += -std=c++17

# C++20
CXXFLAGS += -std=c++20

# C++23 (실험적, gnu++ 변형 가능)
CXXFLAGS += -std=c++23   # 또는 c++2b (오래된 컴파일러)
```

GNU 확장을 쓰려면 `-std=gnu++17`을 활성화합니다. 비표준 확장(예: `__attribute__`)을 사용할 수 있습니다. 임베디드에서는 gnu++가 일반적입니다.

## 표준 라이브러리 vs 언어

표준 언어 기능과 표준 라이브러리 지원이 분리되어 있을 수 있습니다.

```cpp
#include <concepts>   // C++20 헤더 — GCC 10+
```

```cpp
// C++20 언어 기능 사용 (concept)
template<std::integral T>
T add(T a, T b) { return a + b; }
```

GCC 10은 언어를 지원하지만 라이브러리는 늦게 갱신될 수 있습니다. 경고가 나오면 `__cpp_lib_*` feature test macro로 확인합니다.

```cpp
#include <version>

#if __cpp_lib_concepts >= 202002L
    // concept 라이브러리 사용 가능
#endif

#if __cpp_lib_expected >= 202202L
    // std::expected 사용 가능
#endif
```

## 표준별 코드 크기 영향

같은 코드의 C++14, C++17, C++20 컴파일 크기입니다(STM32F4, GCC 13, `-Os -flto`).

```text
C++14: 42 KB
C++17: 41 KB   (-1KB — std::optional이 boost::optional보다 작음)
C++20: 40 KB   (-1KB — std::span이 별도 size 인자 제거)
C++23: 39 KB   (std::expected가 직접 구현 Result보다 작음)
```

새 표준이 코드를 더 크게 만들지는 않습니다. 오히려 표준 기능이 직접 구현보다 효율적입니다.

## 표준에 따라 변하는 best practice

같은 일을 다르게 표현하는 예입니다.

### Error 처리

```cpp
// C++11/14 — out-parameter
bool divide(int a, int b, int* result) {
    if (b == 0) return false;
    *result = a / b;
    return true;
}

// C++17 — std::optional
std::optional<int> divide(int a, int b) {
    if (b == 0) return std::nullopt;
    return a / b;
}

// C++23 — std::expected
std::expected<int, ErrorCode> divide(int a, int b) {
    if (b == 0) return std::unexpected(ErrorCode::DivByZero);
    return a / b;
}
```

### 배열 wrapping

```cpp
// C++11 — pointer + length
void process(int* data, size_t len);

// C++17 — string_view 유사
void process(const std::vector<int>& data);

// C++20 — std::span (0-cost)
void process(std::span<int> data);
```

### Template 제약

```cpp
// C++17 — SFINAE
template<typename T, std::enable_if_t<std::is_integral_v<T>, int> = 0>
T add(T a, T b);

// C++20 — concept
template<std::integral T>
T add(T a, T b);
```

C++20이 훨씬 읽기 좋습니다.

## 인증 환경 — 표준 도구 비용

DO-178C, ISO 26262, IEC 62304 환경에서는 각 표준에 대한 도구 인증이 별도입니다. 보통의 상황은 다음과 같습니다.

- C++14, C++17은 2026년 대부분 인증 가능합니다
- C++20은 일부 도구만 인증되어 있습니다(CodeSonar, Coverity 일부)
- C++23은 2027년 이후 인증이 시작될 것으로 예상됩니다

특정 기능 금지 목록도 표준별로 다릅니다. AUTOSAR C++14와 JSF C++(C++03 기반)는 기능 subset만 허용합니다.

자세한 비교는 다음을 참고합니다.

- [AUTOSAR C++14 Guidelines](/blog/embedded/automotive/autosar-cpp)
- [JSF C++ Coding Standards](/blog/embedded/aerospace-standards/jsf-cpp)
- [MISRA C](/blog/embedded/automotive/misra-c) — C 표준이지만 비교 참고용으로 유용합니다

## 자주 보는 함정과 안티패턴

### 1. 너무 높은 표준 선택

"최신이니까 C++23"으로 갔다가 벤더 toolchain이 미지원이라 컴파일 실패하는 경우입니다. toolchain 확인이 먼저입니다.

### 2. 너무 낮은 표준 고수

"우리 회사는 C++03"이 2026년에도 이어지면 `nullptr`, `enum class`, `unique_ptr` 같은 기본 안전 기능을 쓸 수 없습니다.

### 3. gnu++와 c++ 혼동

`-std=c++17`은 순수 표준만 허용합니다. `__attribute__`나 inline asm을 쓰면 gnu++17이 됩니다. 임베디드에서는 거의 항상 gnu++를 씁니다.

### 4. feature test macro 미사용

헤더만 include하고 기능 존재를 가정합니다. 컴파일러가 미지원이면 컴파일 에러가 납니다. `__cpp_lib_*`로 확인합니다.

### 5. 표준 라이브러리가 임베디드에서 가능하다고 가정

`<filesystem>`, `<thread>`, `<regex>` 같은 OS 의존 라이브러리는 bare-metal에서 링크 실패합니다. 헤더를 include할 때 주의합니다.

### 6. 팀에 표준을 알리지 않음

`auto`, `constexpr`, `concept`가 익숙하지 않은 팀에 강제로 도입하면 학습 곡선이 생기고 bug가 발생합니다. 점진적으로 도입합니다.

## 측정 — 표준 업그레이드 효과

작은 프로젝트(약 5K 줄 C++)의 C++14 → C++17 업그레이드 결과입니다.

- 코드 크기: 41KB → 40KB (-2.4%)
- 빌드 시간: -3%(template instantiation 효율)
- 줄 수: -8%(`auto`, structured bindings, `std::optional` 활용)
- 컴파일러 경고: -12%(`[[nodiscard]]`, `[[maybe_unused]]`)

표준 업그레이드는 거의 무료입니다. 새 표준 학습 시간만 비용입니다.

## 정리

- 권장 기본은 C++17입니다. 안정적이고 toolchain 호환이 좋으며 `optional`, `variant`, `if constexpr` 등 핵심 기능이 풍부합니다.
- C++20은 concepts와 `std::span` 때문에 가치가 크며, GCC 13+가 보장되면 채택합니다.
- C++23은 `std::expected`가 필요할 때만 고려하고 toolchain 지원을 확인합니다.
- 벤더 컴파일러(ARM, IAR, Keil)는 1-2 표준 늦으므로 항상 지원 표를 확인합니다.
- 인증 환경은 도구 인증에 따라 결정되며 AUTOSAR C++14나 JSF C++ 같은 subset 제약을 받습니다.

## 관련 항목

- [Part 1-02: 컴파일러 플래그](/blog/embedded/embedded-cpp/part1-02-compiler-flags) — `-std=c++17` 등 표준 명시
- [Part 2-10: Concepts (C++20)](/blog/embedded/embedded-cpp/part2-10-concepts) — C++20 핵심 기능
- [Part 3-07: std::expected (C++23)](/blog/embedded/embedded-cpp/part3-07-expected) — Result type
- [AUTOSAR C++14 Guidelines](/blog/embedded/automotive/autosar-cpp) — 인증 환경의 표준 subset

## 다음 글 (Part 2 시작)

[Part 2-01: RAII 기초](/blog/embedded/embedded-cpp/part2-01-raii-basics) — Modern C++의 가장 강력한 자원 관리 기법을 다룹니다. 소멸자가 반드시 호출됨을 언어가 보장합니다.
