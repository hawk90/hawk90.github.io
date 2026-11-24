---
title: "임베디드 C++ 표준 선택 가이드 — C++11/14/17/20/23 트레이드오프"
slug: "embedded/embedded-cpp/part1-08-cpp-standard-choice"
date: 2026-04-28T09:08:00
description: "C++11/14/17/20/23 — 임베디드에서 어느 표준을 골라야 하나. 컴파일러 지원, 표준 라이브러리 변화, 핵심 기능 비교."
series: "Embedded C++ for Real Systems"
seriesOrder: 8
tags: [cpp, embedded, standard, cpp11, cpp17, cpp20, cpp23, compiler-support]
type: tech
topics: ["embedded"]
---

## 한 줄 요약

> **표준은 필요한 기능과 실제 target toolchain의 언어·라이브러리 지원으로 고릅니다.** C++17을 비교 기준으로 삼고, C++20의 concepts·span이나 C++23의 expected가 필요한 경우 해당 기능의 컴파일·링크 probe를 추가합니다.

## 어떤 문제를 푸는가

C++ 표준 선택은 프로젝트 수명 전체에 영향을 줍니다. 너무 낮으면 좋은 기능을 쓸 수 없고, 너무 높으면 컴파일러 지원이 부족하거나 인증에 막힙니다.

임베디드의 관점은 데스크톱과 다릅니다. 다음을 함께 평가해야 합니다.

- **컴파일러와 라이브러리 판**: 같은 vendor도 제품·release·target에 따라 지원 범위가 다릅니다
- **표준 라이브러리 크기**: 새 라이브러리 타입은 그만큼 코드를 링크합니다. 측정 방법은 [Part 1-04](/blog/embedded/embedded-cpp/part1-04-code-size-analysis)에 있습니다
- **안전 요구와 도구 근거**: 코딩 지침의 언어 판, 분석기 지원, compiler/tool qualification 범위를 구분합니다
- **팀 친숙도**: C++20 concepts는 학습 곡선이 있습니다

## 각 표준의 핵심 기능

### C++11 — 임베디드의 최소 baseline

언어 기능은 해당 compiler의 지원 표에서 확인하고 표준 라이브러리는 별도로 확인합니다. GCC·Clang 버전 하나만으로 모든 target 라이브러리까지 보장되지는 않습니다.

| 기능 | 임베디드 가치 |
| --- | --- |
| `constexpr` (제한적) | 컴파일 타임 계산의 *시작* |
| `auto` | 가독성 |
| Range-based for | 가독성 |
| `nullptr` | `NULL` 매크로 대체, 타입 안전 |
| `enum class` | 네임스페이스 분리, 암묵 변환 차단 |
| `static_assert` | 컴파일 타임 검증 |
| `unique_ptr` | 단독 소유권. deleter와 runtime 요구는 구현별 확인 |
| `noexcept` | 예외 없음 명시 |
| `final`, `override` | virtual 오류 잡기 |
| Rvalue reference, move semantics | 복사 비용 감소 |
| Variadic template | type-safe printf 대체 |
| `std::array` | 고정 크기 컨테이너 |
| Initializer list | 균일한 초기화 |
| Lambda | 콜백 단순화 |
| `std::function` | 저장 대상·구현에 따라 heap 사용 가능 |

위 표의 기능은 모두 C++11에서 들어왔습니다. 그래서 C++03에서 C++11로 가는 변화가 가장 크고, 새 프로젝트를 C++11 미만으로 시작할 이유는 거의 남지 않습니다.

### C++14 — 작은 개선

loop를 포함한 constexpr와 generic lambda 등이 추가됩니다. compiler의 언어 지원 표와 target library를 함께 확인합니다.

| 기능 | 임베디드 가치 |
| --- | --- |
| Generalized `constexpr` (변수, loop) | 더 많은 컴파일 타임 |
| `auto` 반환 타입 | 가독성 |
| Generic lambda | template 람다 |
| Binary literal `0b1010` | 비트 마스크 가독성 |
| Variable templates | `pi<double>` 같은 사용 |
| Deprecated `[[deprecated]]` | API migration |

C++11에서 C++14로 올릴 때 코드가 바뀌어야 하는 경우도 있습니다. 표준의 호환성 부록은 C++14에서 "constexpr 비정적 멤버 함수가 더 이상 암묵적으로 const 멤버 함수가 아니다"를 C++11과의 차이로 적습니다([diff.cpp11.dcl.dcl]/1). `struct Reg { int v; constexpr int get() { return v; } };`의 `get()`을 `constexpr Reg` 객체에서 부르는 코드는 g++-16 `-std=c++11`에서 통과하고, `-std=c++14`에서는 `error: passing 'const Reg' as 'this' argument discards qualifiers`로 멈춥니다. C++14부터는 `const`를 직접 붙여야 합니다.

### C++17 — 권장 기본

GCC와 Clang의 공식 C++ status 표는 개별 기능별 지원 판을 제공합니다. vendor toolchain은 정확한 release notes와 library 구성까지 확인해야 하므로 제품명만으로 완전 지원을 단정하지 않습니다.

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
| Filesystem | OS 파일 시스템 필요. freestanding 헤더 목록에 없음 |

`std::optional`과 `std::variant`만으로도 C++17 채택 가치가 충분합니다. 예외 없는 에러 처리와 closed sum type을 가능하게 합니다.

### C++20 — concept이 게임 체인저

concepts·modules·coroutines 같은 언어 기능과 span·ranges 같은 라이브러리는 지원 시점이 서로 다릅니다. `-std=c++20`이 받아들여지는 것과 모든 기능이 구현되는 것은 다릅니다.

| 기능 | 임베디드 가치 |
| --- | --- |
| Concepts | 템플릿 제약, 에러 메시지 명확 |
| `std::span` | 비소유 연속 범위 view. 수명과 범위 접근 조건은 호출자가 지킴 |
| Ranges (제한적) | `<algorithm>` 대체 |
| `consteval` | 컴파일 타임 *강제* |
| `constinit` | static/thread 저장 기간 변수의 상수 초기화 요구 |
| Designated initializers | `S{.x=1, .y=2}`. C++은 선언 순서 등 C와 다른 제약이 있음 |
| Modules | 헤더 재파싱 제거. GCC 16.2.0 문서는 아직 실험적이며 `-fmodules`로 켠다고 적음 |
| Coroutines (기본) | async. 코루틴 상태는 할당 함수(promise 타입에서 먼저 찾고, 없으면 전역 `operator new`)로 얻음([dcl.fct.def.coroutine]/9) |
| `std::bit_cast` | type-safe bit manipulation |
| Three-way comparison `<=>` | 비교 연산자 자동 |
| `std::endian` | 엔디안 컴파일 타임 확인 |
| Lambda in unevaluated context | template 단순화 |

C++20의 가장 큰 가치는 concepts와 `std::span`입니다. concepts는 template error message를 읽을 수 있게 만듭니다. `std::span`은 포인터와 길이를 한 인자로 묶지만 기본 subscript의 범위 검사나 소유권을 보장하지 않습니다. 원본 배열보다 오래 저장한 span은 dangling이 됩니다.

```cpp
// C++17 이전
void process(int* buf, size_t len);

// C++20
void process(std::span<int> buf);   // pointer와 크기를 함께 전달. 수명·범위 조건 확인 필요
```

### C++23 — 필요한 기능별로 확인

C++23 mode와 개별 기능 지원을 구분합니다. `<expected>`, `<mdspan>`, `<print>` 등은 compiler 자체보다 표준 라이브러리와 target runtime의 제공 여부가 중요합니다.

| 기능 | 임베디드 가치 |
| --- | --- |
| `std::expected<T, E>` | 예외 없는 Result type |
| `std::mdspan` | 다차원 배열 view |
| `std::print` | iostream 없는 출력 |
| `if consteval` | 컴파일 타임 분기 명시 |
| Deducing `this` | CRTP 단순화 |
| `std::byteswap` | 엔디안 변환 |

`std::expected`는 값과 오류를 표현하고, byteswap이나 mdspan도 각각 endian 변환과 다차원 view가 필요한 프로젝트에서 가치가 있습니다. `std::expected`는 Rust의 `Result<T, E>`에 대응합니다. 라이브러리 지원은 언어 모드보다 늦게 왔습니다. [cppreference의 C++23 지원 표](https://en.cppreference.com/w/cpp/compiler_support/23)에 따르면 `std::expected`는 libstdc++ 12·libc++ 16부터, `std::print`는 libstdc++ 14부터 들어 있습니다. 자세한 내용은 [Part 3-07](/blog/embedded/embedded-cpp/part3-07-expected)에서 다룹니다.

새 프로젝트에서 C++20을 선택할지는 제품 수명, 인증 도구, 표준 라이브러리와 실제 toolchain 지원을 함께 보고 결정합니다. C++23은 `std::expected` 같은 기능이 필요하고 toolchain이 제공할 때 선택하는 식으로 범위를 좁힐 수 있습니다.

## 채택 전에 남길 toolchain 기록

"GCC 13이면 C++23", "vendor compiler는 C++17까지" 같은 최대 표준 표는 개별 기능과 라이브러리 구성을 놓칩니다. 다음 정보를 실제 빌드에서 수집하면 compiler 업그레이드 때도 같은 판단을 반복할 수 있습니다.

| 확인 대상 | 남길 증거 | 실패 시 조치 |
| --- | --- | --- |
| 언어 기능 | compiler 전체 버전·target triple·-std·기능별 compile probe | 지원되는 표현으로 대체하거나 compiler 변경 |
| 표준 라이브러리 | libc++/libstdc++/vendor library 판·feature macro·link 결과 | 대체 타입 또는 제공되는 subset 선택 |
| runtime | 예외·RTTI·heap·thread·OS 의존 symbol | runtime 제공 또는 기능 제한 |
| 안전 요구 | 적용 지침 판·도구 지원 범위·프로젝트 qualification 근거 | 안전 계획과 도구 검증 갱신 |
| 회귀 | 동일 workload의 기능·크기·경고·실시간 제약 결과 | 문제 기능을 좁혀 원인 분석 |

C++17을 현재 프로젝트의 비교 baseline으로 둘 수 있지만, 이것이 모든 신규 임베디드 제품의 의무 표준은 아닙니다. C++20/23을 선택할 때는 필요한 기능을 좁히고 실제 target toolchain의 compile·link·runtime 결과로 판단합니다. 인증 환경에서도 특정 연도나 언어 판만으로 도구가 인증되었다고 결론내리지 않습니다.

## 컴파일러 플래그 — 표준 명시

```makefile
# C++17 (권장 기본)
CXXFLAGS += -std=c++17

# C++20
CXXFLAGS += -std=c++20

# C++23 (GCC 16.2.0 문서 기준 experimental)
CXXFLAGS += -std=c++23   # 이전 이름 c++2b는 deprecated
```

`-std`를 빼면 컴파일러 기본값이 적용되고, 기본값은 컴파일러마다 다릅니다. 이 글을 쓴 Mac에서 아무 옵션 없이 `__cplusplus`를 출력해 보면 g++-16과 arm-none-eabi-g++ 16.2.0은 `202002L`(GCC 16 문서: `gnu++20`이 C++ 기본값), Homebrew Clang 23.1.5는 `201703L`, Apple clang 21은 `201402L`이었습니다. 같은 소스가 컴파일러만 바꿔도 다른 표준으로 빌드되므로 `-std`는 항상 명시합니다.

`-std=gnu++17`은 GNU dialect를 선택합니다. `-std=c++17`에서도 GCC/Clang은 예약 표기인 `__attribute__`를 받아들입니다. 아래 probe의 `__attribute__((noinline))`은 `-std=c++17 -pedantic-errors`에서도 Clang 23.1.5와 g++-16 모두 오류 없이 컴파일됐습니다. 그래서 확장 하나가 컴파일된다고 dialect가 바뀐 것은 아니고, `-pedantic-errors`도 이중 밑줄 확장까지 막지는 않습니다.

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

`<concepts>` 헤더는 libstdc++에 GCC 10부터 들어왔습니다. 언어 기능과 라이브러리 기능은 따로 들어오므로(위 `std::expected`가 그 예) 코드에서는 `__cpp_lib_*` feature test macro로 확인합니다.

```cpp
#include <version>

#if __cpp_lib_concepts >= 202002L
    // concept 라이브러리 사용 가능
#endif

#if __cpp_lib_expected >= 202202L
    // std::expected 사용 가능
#endif
```

## 실행 probe — 언어 모드와 라이브러리 지원

다음 예시는 동일한 compiler와 library 조합에서 span과 expected의 제공 여부를 구분합니다. Apple Silicon에서 Homebrew Clang 23.1.5(libc++)와 g++-16(libstdc++)으로 실행했습니다. 이 결과는 ARM bare-metal 표준 라이브러리 제공의 증거가 아닙니다. 이 글의 arm-none-eabi-g++에는 libstdc++가 없어 같은 probe를 컴파일하지 못했습니다.

```cpp title="standard-probe.cpp"
#include <version>
#include <iostream>
#if defined(__cpp_lib_span) && __cpp_lib_span >= 202002L
#include <span>
#endif
#if defined(__cpp_lib_expected) && __cpp_lib_expected >= 202202L
#include <expected>
#endif
__attribute__((noinline)) int retained_extension() { return 7; }
int main() {
    std::cout << "cplusplus=" << __cplusplus << '\n';
#if defined(REQUIRE_SPAN)
#if !defined(__cpp_lib_span) || __cpp_lib_span < 202002L
#error span support required
#else
    int values[] = {20, 22};
    std::span<int> view(values);
    if (view.size() != 2 || view[0] + view[1] != 42) return 1;
    std::cout << "span=42\n";
#endif
#endif
#if defined(REQUIRE_EXPECTED)
#if !defined(__cpp_lib_expected) || __cpp_lib_expected < 202202L
#error expected support required
#else
    std::expected<int, int> ok(42), error(std::unexpected(5));
    if (!ok || *ok != 42 || error || error.error() != 5) return 2;
    std::cout << "expected=42,error=5\n";
#endif
#endif
    return retained_extension() == 7 ? 0 : 3;
}
```

```bash
clang++ -std=c++17 -pedantic-errors standard-probe.cpp -o probe17
./probe17
clang++ -std=c++20 -pedantic-errors -DREQUIRE_SPAN standard-probe.cpp -o probe20
./probe20
clang++ -std=c++23 -pedantic-errors -DREQUIRE_EXPECTED standard-probe.cpp -o probe23
./probe23
# 필요한 기능이 없는 모드에서는 명시적으로 실패
clang++ -std=c++17 -DREQUIRE_SPAN standard-probe.cpp -o missing-span
```

두 컴파일러의 출력은 같았습니다.

```text
cplusplus=201703
cplusplus=202002
span=42
cplusplus=202302
expected=42,error=5
```

세 실행 모두 exit 0이었고, 마지막 C++17 + REQUIRE_SPAN은 의도대로 `#error span support required`로 컴파일이 멈췄습니다. libc++와 libstdc++ 모두 C++17 모드에서는 `__cpp_lib_span`을 정의하지 않는다는 뜻입니다.

## 표준에 따라 변하는 best practice

각 코드는 서로 다른 표준에서 쓰는 대안 조각입니다. 함께 붙여 컴파일하는 완성 프로그램이 아닙니다. 아래 나눗셈 예시는 int로 표현 가능한 몫과 유효한 out pointer를 전제로 하며, 실제 API는 INT_MIN/-1 overflow와 null 입력도 계약에 포함해야 합니다.

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

// C++17 — 고정 배열 크기를 template 인자로 유지
template<std::size_t N> void process(int (&data)[N]);

// C++20 — std::span 비소유 view
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

C++20 쪽은 제약이 템플릿 매개변수 자리에 바로 보이고, 위반하면 컴파일러가 어느 concept이 실패했는지 알려 줍니다([Part 2-10](/blog/embedded/embedded-cpp/part2-10-concepts)).

## 안전 요구와 언어 표준을 구분하기

코딩 지침 준수, 정적 분석기의 기능 지원, compiler/tool qualification은 서로 다른 근거입니다. 지침마다 대상 언어 판이 정해져 있습니다. AUTOSAR C++14 지침은 이름대로 C++14, [MISRA C++:2023](https://misra.org.uk/product/misra-cpp2023/)은 C++17을 대상으로 합니다. 지침을 적용한다면 그 지침이 대상으로 삼은 언어와 deviation 정책을 먼저 고정합니다. DO-178C·ISO 26262 등 프로젝트 요구에 맞는 tool confidence/qualification 근거는 안전 계획에서 확인하며, 분석기 제품명이 나열되어 있다는 이유만으로 compiler와 모든 C++ 기능이 인증되었다고 보지 않습니다.

표준을 바꾸면 위 C++14의 `constexpr` 멤버 함수처럼 컴파일 결과가 달라지는 코드, 새 경고, 회귀 시험과 도구 검증 범위가 함께 바뀝니다. 학습 시간만 드는 무료 변경이 아닙니다.

## 자주 보는 함정과 안티패턴

### 1. 너무 높은 표준 선택

"최신이니까 C++23"으로 갔다가 벤더 toolchain이 미지원이라 컴파일 실패하는 경우입니다. toolchain 확인이 먼저입니다.

### 2. 너무 낮은 표준 고수

"우리 회사는 C++03"이 2026년에도 이어지면 `nullptr`, `enum class`, `unique_ptr` 같은 기본 안전 기능을 쓸 수 없습니다.

### 3. gnu++와 c++ 혼동

`-std=c++17`과 `-std=gnu++17`은 선택한 dialect가 다릅니다. `__attribute__` 등 일부 확장은 전자에서도 허용될 수 있으며 그 사용이 mode를 자동으로 바꾸지는 않습니다. 실제 옵션과 진단 결과로 정책을 검사합니다.

### 4. feature test macro 미사용

헤더만 include하고 기능 존재를 가정합니다. 위 probe에서 C++17 모드는 `<span>`을 제공하지 않았습니다. `__cpp_lib_*`로 확인하면 없는 기능을 명시적인 `#error`나 대체 구현으로 처리할 수 있습니다.

### 5. 표준 라이브러리가 임베디드에서 가능하다고 가정

`<filesystem>`, `<thread>`, `<regex>`는 표준의 freestanding 헤더 목록([compliance] 표 27)에 없습니다. OS 파일 시스템·스레드나 locale이 필요한 라이브러리이므로, bare-metal 라이브러리 구성이 무엇을 제공하는지 문서로 확인한 뒤 씁니다.

### 6. 팀에 표준을 알리지 않음

`auto`, `constexpr`, `concept`가 익숙하지 않은 팀에 한꺼번에 도입하면 리뷰어가 코드를 검증하기 어려워집니다. 기능 단위로 점진적으로 도입합니다.

## 1차 자료와 확인 범위

- [GCC C++ language status](https://gcc.gnu.org/projects/cxx-status.html) — 기능별 언어 지원과 library 지원 표의 구분
- [Clang C++ status](https://clang.llvm.org/cxx_status.html) — mode와 개별 기능의 구현 상태
- [GCC language standards](https://gcc.gnu.org/onlinedocs/gcc/Standards.html) — ISO/GNU dialect
- [C++ draft: span](https://eel.is/c++draft/views.span)와 [expected](https://eel.is/c++draft/expected) — 비소유 view와 값/오류 타입의 계약
- [C++ draft: C++11과의 호환성](https://eel.is/c++draft/diff.cpp11) — C++14에서 바뀐 constexpr 멤버 함수 규칙
- [cppreference C++23 compiler support](https://en.cppreference.com/w/cpp/compiler_support/23) — 라이브러리 기능별 지원 버전

2026-11-16 host probe(Clang 23.1.5, g++-16)는 compiler mode, 확장 허용, span 범위 정보와 expected의 성공·오류 상태를 확인했습니다. 기본 `__cplusplus`는 네 컴파일러에서 출력했습니다. target vendor compiler, bare-metal library 링크, 인증 근거와 코드 크기·시간 변화는 확인하지 않았습니다.

## 정리

- C++17을 비교 baseline으로 둘 수 있지만 필요한 기능과 실제 target 지원을 먼저 확인합니다.
- C++20 concepts·span, C++23 expected 등 필요한 기능은 실제 compiler와 library 조합으로 probe합니다.
- 새 표준의 가치는 필요한 기능별로 판단하며 언어 mode만으로 library 지원을 가정하지 않습니다.
- vendor 이름이나 대략적인 버전 상한보다 정확한 release·target·library 지원 표를 확인합니다.
- 코딩 지침의 적용 판·도구 qualification·프로젝트 안전 근거를 구분하며, 언어 판이나 도구 이름만으로 인증 적합성을 판단하지 않습니다.

## 관련 항목

- [Part 1-02: 컴파일러 플래그](/blog/embedded/embedded-cpp/part1-02-compiler-flags) — `-std=c++17` 등 표준 명시
- [Part 2-10: Concepts (C++20)](/blog/embedded/embedded-cpp/part2-10-concepts) — C++20 핵심 기능
- [Part 3-07: std::expected (C++23)](/blog/embedded/embedded-cpp/part3-07-expected) — Result type
- AUTOSAR C++14 Guidelines — 인증 환경의 표준 subset

## 다음 글 (Part 2 시작)

[Part 2-01: RAII 기초](/blog/embedded/embedded-cpp/part2-01-raii-basics) — Modern C++의 가장 강력한 자원 관리 기법을 다룹니다. 정상적인 scope 이탈에서 소멸자가 자원을 정리하는 계약과, 강제 종료·reset 등 적용되지 않는 경계를 다룹니다.
