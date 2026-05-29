---
title: "Part 2-05: Conformance / policy"
date: 2026-05-23T10:00:00
description: "Part 2-05: Abseil의 platform conformance 정책 — 지원 컴파일러, 표준 버전, deprecated_if_unavailable."
series: "Abseil Code Review"
seriesOrder: 10
tags: [cpp, abseil, conformance, policy, base, platform]
type: book-review
bookTitle: "Abseil C++ Common Libraries"
bookAuthor: "Google"
draft: true

---

> **한 줄 요약**: Abseil은 어떤 컴파일러·플랫폼·C++ 표준을 지원하는지 명문화된 정책을 가진다. `ABSL_DEPRECATED_IF_UNAVAILABLE` 같은 매크로는 미지원 환경에서 graceful degradation을 가능하게 한다.

## 어떤 문제를 푸는가

라이브러리가 "어디서 동작하는가"는 사용자에게 가장 중요한 질문이다. 답이 모호하면 사용자는 매번 직접 확인해야 한다. Abseil은 명확한 conformance 정책을 가진다.

세 축이 있다.

1. **Tier 1 컴파일러** — 정식 지원. CI에서 매번 빌드·테스트.
2. **Tier 2 컴파일러** — Best-effort. 보고가 들어오면 고침.
3. **그 외** — 동작 보장 없음.

## 컴파일러·표준 지원 정책

### C++ 표준 최소 버전

> **C++14 이상**

C++14가 최소다. C++11은 지원하지 않는다. C++14를 선택한 이유는 generic lambda, variable templates 같은 기능이 internal 구현에 필요하기 때문이다.

이 정책은 시간이 지나면서 올라간다. 2024년경 일부 sub-library에서 C++17 최소를 요구하기 시작했고, 곧 전체가 C++17 최소로 옮겨갈 예정이다.

### 컴파일러 지원

| 컴파일러 | 최소 버전 | Tier |
|---|---|---|
| GCC | 7+ | 1 |
| Clang | 7+ | 1 |
| MSVC | 2017 (19.10+) | 1 |
| Apple Clang | Xcode 11+ | 1 |
| MinGW-w64 | 최신 | 2 |
| Intel ICX | 최신 | 2 |
| 그 외 | — | 미지원 |

Tier 1은 Google 사내 CI에서 매 commit마다 빌드된다. Tier 2는 사용자 보고에 의존한다.

### 플랫폼 지원

| 플랫폼 | Tier |
|---|---|
| Linux (x86_64, aarch64) | 1 |
| macOS (x86_64, arm64) | 1 |
| Windows (x86_64) | 1 |
| iOS, Android | 1 (제한적) |
| FreeBSD, OpenBSD | 2 |
| WebAssembly | 2 |
| Bare-metal embedded | 미지원 |

embedded는 명시적으로 미지원이다. dynamic allocation을 가정하는 코드가 많고, raw_logging 같은 일부 예외를 제외하면 RTOS 환경에 적합하지 않다.

## ABSL_DEPRECATED_IF_UNAVAILABLE

마이그레이션을 부드럽게 해주는 매크로.

```cpp
// absl/base/policy_checks.h에서 발췌
#if SOME_FEATURE_AVAILABLE
    #define ABSL_DEPRECATED_IF_UNAVAILABLE(msg)
#else
    #define ABSL_DEPRECATED_IF_UNAVAILABLE(msg) ABSL_DEPRECATED(msg)
#endif

// 사용
ABSL_DEPRECATED_IF_UNAVAILABLE("Will require C++17 in next LTS")
absl::optional<int> Find(int key);
```

특정 기능이 지원되는 환경에서는 deprecation 없이 동작하고, 지원되지 않는 환경에서만 deprecation 경고. 마이그레이션 시 일부 환경만 먼저 옮기는 패턴.

## ABSL_INTERNAL_C_PLUSPLUS — 표준 버전 감지

```cpp
#if defined(_MSVC_LANG)
    #define ABSL_INTERNAL_C_PLUSPLUS _MSVC_LANG
#else
    #define ABSL_INTERNAL_C_PLUSPLUS __cplusplus
#endif

#if ABSL_INTERNAL_C_PLUSPLUS >= 201703L
    // C++17+
#endif
```

`_MSVC_LANG` vs `__cplusplus`의 차이를 흡수한다. MSVC는 `/Zc:__cplusplus` 옵션 없이는 `__cplusplus`가 199711L로 보고된다. `_MSVC_LANG`을 우선 확인하는 것이 정답.

## policy_checks.h — 컴파일 시점 검사

Abseil은 모든 컴파일에서 정책 위반을 잡는다.

```cpp
// absl/base/policy_checks.h의 핵심
#if defined(_MSVC_LANG) && _MSVC_LANG < 201402L
    #error "C++ versions less than C++14 are not supported."
#elif defined(__cplusplus) && __cplusplus < 201402L
    #error "C++ versions less than C++14 are not supported."
#endif

#if defined(__GNUC__) && !defined(__clang__) && __GNUC__ < 7
    #error "Abseil requires GCC 7 or later."
#endif
```

지원하지 않는 환경에서 빌드하면 컴파일러 에러로 명확히 거부한다. silent 동작보다 명시적 거부가 낫다는 정책.

## 표준 도달 시 마이그레이션

Abseil의 polyfill은 표준 도달 후 자동으로 std로 redirect할 수 있다.

```cpp
// absl/base/options.h
#define ABSL_OPTION_USE_STD_OPTIONAL 2

// 의사 코드
#if ABSL_OPTION_USE_STD_OPTIONAL == 2  // 자동 감지
    #if ABSL_INTERNAL_C_PLUSPLUS >= 201703L && ABSL_HAVE_STD_OPTIONAL
        namespace absl { template <typename T> using optional = std::optional<T>; }
    #else
        // absl 자체 구현
    #endif
#elif ABSL_OPTION_USE_STD_OPTIONAL == 1
    namespace absl { template <typename T> using optional = std::optional<T>; }
#else
    // 항상 absl 자체 구현
#endif
```

`absl::optional`이 `std::optional`의 alias가 될 수도, 자체 type일 수도 있다. 이 redirection은 ABI에 영향을 준다. ([Part 1-05](/blog/programming/code-review/abseil/part1-05-versioning-abi) 참조)

## conformance 위반 사례

Abseil이 의도적으로 std를 따르지 않는 부분.

### exception 사용

Abseil은 `-fno-exceptions` 빌드를 지원한다. 따라서 일부 API는 throw가 아닌 LOG(FATAL) 또는 return-error를 쓴다.

```cpp
// std::optional::value()는 bad_optional_access throw
auto v = opt.value();  // throw if empty

// absl::optional은 exception 활성화 시에만 throw
// -fno-exceptions에서는 LOG(FATAL)
auto v = abs_opt.value();
```

### initializer_list constexpr

```cpp
// C++11: constexpr 제약 많음
// C++14: constexpr 완화

// Abseil은 C++14 가정 — constexpr 적극 활용
constexpr absl::Span<int> s(arr);
```

### RTTI 사용

`-fno-rtti` 빌드를 지원하므로 `typeid`, `dynamic_cast`를 내부에서 쓰지 않는다. 일부 디버그 기능(stack trace decoding)은 RTTI 비활성화 시 제한된다.

## 코드 리뷰 포인트

```cpp
// 회피 — 컴파일러 분기를 직접
#if defined(__GNUC__) && __GNUC__ < 7
    // ...
#endif

// Good — Abseil 정책 검사를 신뢰
#include "absl/base/policy_checks.h"  // 미지원 환경이면 #error
```

```cpp
// 회피 — __cplusplus만 검사
#if __cplusplus >= 201703L
    // MSVC에서 동작 안 함

// Good — Abseil의 통일된 매크로
#if ABSL_INTERNAL_C_PLUSPLUS >= 201703L
```

```cpp
// 회피 — Tier 외 컴파일러 동작 가정
// "MinGW에서 잘 돌 거야" — Tier 2이므로 보장 없음
// 회사 정책상 MinGW 필수라면, 자체 CI 추가하고 deviation 문서화
```

리뷰에서:

1. **타깃 컴파일러가 Tier 1인가** — 아니라면 자체 CI 필요.
2. **C++ 표준 버전 감지가 정확한가** — `_MSVC_LANG` 처리.
3. **policy violation이 명시적으로 처리되는가** — silent 통과 금지.

## 자주 보는 안티패턴

```cpp
// 회피 — Abseil이 지원 안 한다고 명시한 환경에서 쓰기
// bare-metal RTOS에 absl::flat_hash_map을 넣음
// — heap 할당, exception, 큰 코드 크기. 보통 부적합.
```

```cpp
// 회피 — C++ 표준 버전을 빌드 시스템과 헤더에서 따로 지정
// CMakeLists.txt: CMAKE_CXX_STANDARD 17
// 헤더 안: #if __cplusplus >= 201402L (C++14만 가정)
// 일관성 없음. 한 곳에서 결정.
```

```cpp
// 회피 — exception을 가정한 API를 -fno-exceptions에서 사용
try {
    auto v = opt.value();
} catch (const std::bad_optional_access&) {
    // -fno-exceptions에서는 도달 안 함. LOG(FATAL)로 죽음.
}

// Good — bool check 우선
if (opt.has_value()) {
    auto v = *opt;
}
```

## 정리

- Abseil의 conformance는 Tier 1 (GCC 7+, Clang 7+, MSVC 2017+, Apple Clang 11+) 기반.
- C++14 최소, 곧 C++17로 올라갈 예정.
- 정책 위반은 `policy_checks.h`에서 컴파일 에러로 거부.
- `_MSVC_LANG`과 `__cplusplus` 차이는 `ABSL_INTERNAL_C_PLUSPLUS`로 흡수.
- bare-metal embedded는 명시적으로 미지원.

## 다음 편

Part 2-06에서 memory utilities를 본다. `absl::AllocatorTraits` 같은 도구가 표준 allocator를 어떻게 보완하는지, `make_unique` 같은 polyfill의 위치는 어디인지.

## 관련 항목

- [Part 1-02: Design philosophy](/blog/programming/code-review/abseil/part1-02-design-philosophy)
- [Part 1-04: LTS vs HEAD](/blog/programming/code-review/abseil/part1-04-lts-vs-head-release)
- [Part 1-05: Versioning & ABI 호환성](/blog/programming/code-review/abseil/part1-05-versioning-abi)
- [Part 2-01: ABSL_HAVE_* / ABSL_ATTRIBUTE_*](/blog/programming/code-review/abseil/part2-01-abseil-macros)
- [Part 2-06: Memory utilities](/blog/programming/code-review/abseil/part2-06-memory-utilities)
- [원문 — Abseil platform support](https://abseil.io/about/compatibility#platforms)
