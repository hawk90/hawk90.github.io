---
title: "Part 1-05: Versioning & ABI 호환성"
date: 2026-05-23T05:00:00
description: "Part 1-05: Abseil의 versioning 정책 — inline namespace, ABI 호환 범위, prebuilt 사용 시 함정."
series: "Abseil Code Review"
seriesOrder: 5
tags: [cpp, abseil, versioning, abi, compatibility, inline-namespace]
type: book-review
bookTitle: "Abseil C++ Common Libraries"
bookAuthor: "Google"
---

> **한 줄 요약**: Abseil의 ABI 정책은 "같은 빌드 단위 안에서만 호환을 보장"한다. 이 제약은 inline namespace로 강제되고, 다른 옵션으로 빌드된 두 Abseil 코드를 같은 실행 파일에 링크하면 컴파일 또는 링크 단계에서 실패하도록 설계되어 있다.

## 어떤 문제를 푸는가

C++ 라이브러리의 ABI는 미묘하다. 같은 헤더, 같은 함수 시그니처라도 컴파일 옵션이 다르면 메모리 레이아웃이나 calling convention이 달라질 수 있다.

```cpp
// 시나리오: 라이브러리 A는 std=c++17로 빌드, 라이브러리 B는 c++20로 빌드.
// 둘 다 absl::Time을 인자로 받는 함수를 export.
// 같은 binary에 링크하면? — undefined behavior.
```

C++ 표준 라이브러리는 이런 충돌을 막기 위해 inline namespace를 쓴다. libstdc++는 `__cxx11`, libc++는 `__1` 같은 이름이 그 예다. Abseil도 같은 기법을 더 적극적으로 활용한다.

## 정책: 단일 빌드 단위 내 ABI 호환

Abseil의 공식 약속은 한 줄이다.

> **같은 컴파일 옵션으로 같은 시점에 빌드된 코드끼리만 ABI 호환을 보장한다.**

이 정책은 두 가지 자유를 가져온다.

1. **내부 구현을 자유롭게 바꿀 수 있다** — `flat_hash_map`의 probing 방식이 LTS 사이에 바뀐 적이 있다.
2. **사용자가 잘못된 mix를 하면 빌드 시점에 잡힌다** — runtime crash가 아니라 link error.

대신 사용자는 다음 두 가지 시나리오를 피해야 한다.

```text
시나리오 A: 사전 빌드된 absl.so + 사용자가 빌드한 absl-사용 코드
  → 두 쪽의 컴파일 옵션이 다를 수 있음. 위험.

시나리오 B: 두 third-party가 각자 prebuild Abseil을 들고 옴
  → 같은 심볼이 두 번 정의될 수 있음. ODR violation.
```

## inline namespace로 강제

Abseil은 `ABSL_NAMESPACE_BEGIN` / `ABSL_NAMESPACE_END`라는 매크로를 모든 헤더 안에 둔다.

```cpp
// absl/base/config.h에서 발췌
#define ABSL_NAMESPACE_BEGIN \
    inline namespace lts_20240722 {

#define ABSL_NAMESPACE_END }
```

namespace 이름은 LTS 날짜 또는 HEAD commit hash에서 유래한다. 다른 버전으로 빌드된 Abseil의 심볼이 같은 binary 안에 들어오면 namespace 이름이 달라 link 단계에서 분리된다. 같은 심볼이 두 정의를 갖지 않게 된다.

```cpp
// 사용자 입장에서는 inline namespace이므로 보이지 않음
absl::Status s = absl::OkStatus();
// 실제 mangled name은 absl::lts_20240722::Status

// 두 버전이 섞이면 두 개의 다른 type으로 인식됨
// 컴파일 또는 link 단계에서 에러 발생
```

inline namespace의 핵심 속성은 다음과 같다.

- 사용자 코드는 `absl::Status`로 그대로 쓴다 (inline의 의미).
- 컴파일러가 보는 실제 namespace는 버전이 인코딩된 이름.
- ADL, template argument deduction도 정상 작동.

## ABI에 영향을 주는 옵션

같은 Abseil 소스 코드라도 다음 옵션이 다르면 ABI가 달라질 수 있다.

| 옵션 | ABI 영향 |
|---|---|
| C++ 표준 (c++17 vs c++20) | sizeof, layout 변경 가능 |
| `_GLIBCXX_USE_CXX11_ABI` | libstdc++의 string/list 표현 |
| `-fno-exceptions` | exception 비활성화 코드 경로 |
| `-fno-rtti` | RTTI 없는 환경 |
| `NDEBUG` | assert 코드 포함 여부 |
| `_LIBCPP_HARDENING_MODE` | libc++ 안전성 모드 |

Abseil은 이 중 일부를 inline namespace 이름에 인코딩한다. 모든 옵션을 잡지는 않지만, 가장 흔한 mismatch는 잡는다.

## ABSL_OPTION_USE_STD_*

Abseil은 polyfill 타입에 대해 컴파일 시점에 std 버전을 쓸지 absl 버전을 쓸지 선택하는 옵션을 제공한다.

```cpp
// absl/base/options.h
#define ABSL_OPTION_USE_STD_OPTIONAL 2
// 0 = absl::optional 자체 구현
// 1 = std::optional 사용 (C++17 이상에서)
// 2 = 자동 감지

#define ABSL_OPTION_USE_STD_STRING_VIEW 2
#define ABSL_OPTION_USE_STD_VARIANT 2
#define ABSL_OPTION_USE_STD_ANY 2
```

옵션 2가 default다. C++ 표준 버전을 감지해서 자동으로 선택한다.

ABI 관점에서 중요한 것은 다음이다.

```cpp
// 시나리오: A는 ABSL_OPTION_USE_STD_OPTIONAL=1로 빌드 (std::optional alias)
// 시나리오: B는 ABSL_OPTION_USE_STD_OPTIONAL=0로 빌드 (absl 자체 구현)
// A의 absl::optional<int>와 B의 absl::optional<int>는 다른 type
// → link 단계에서 잡혀야 한다
```

옵션이 다르면 inline namespace 이름이 달라지도록 빌드 시스템이 처리한다.

## prebuilt 사용 시 함정

ABI 정책을 가장 자주 어기는 시나리오는 시스템 패키지 사용이다.

```bash
# Ubuntu apt
sudo apt install libabsl-dev
# /usr/lib/x86_64-linux-gnu/libabsl_*.so 설치

# 사용자 코드에서
g++ -std=c++17 main.cc -labsl_strings -labsl_status
```

이때 `/usr/lib`의 libabsl_*.so가 어떤 옵션으로 빌드되었는지 사용자는 모른다. 사용자의 `-std=c++17`와 시스템 라이브러리의 빌드 옵션이 일치하지 않으면 미묘한 ABI 불일치가 발생한다. inline namespace로 잡히면 link error로 끝나지만, 어떤 경우는 runtime에 문제가 드러난다.

```text
권장 빌드 모델
────────────────
1. 사용자 프로젝트가 Abseil 소스를 가져와 자체 빌드
2. Bazel, CMake FetchContent, vcpkg manifest mode 모두 OK
3. apt/yum/brew의 시스템 패키지는 비권장 (단 toy/learning에는 OK)
```

## 두 라이브러리가 Abseil을 각자 갖고 오는 경우

```text
my_app
├── lib_x.so → Abseil 20240116.0 prebuilt 포함
├── lib_y.so → Abseil 20240722.0 prebuilt 포함
└── 사용자 코드 → Abseil 20240722.0 source build
```

이 시나리오에서 lib_x와 lib_y의 Abseil 심볼은 inline namespace 이름이 다르다. dynamic linker가 같은 심볼을 두 번 보지 않는다. 표면상은 동작한다.

문제는 인터페이스에 Abseil type이 노출된 경우다.

```cpp
// lib_x.h
#include "absl/status/status.h"
absl::Status DoSomething();  // 20240116 namespace

// lib_y.h
#include "absl/status/status.h"
absl::Status DoOther();  // 20240722 namespace

// 사용자 코드 — Status를 두 라이브러리 사이에 주고받으려 함
auto s = DoSomething();
return DoOther();  // 다른 type, 컴파일 에러
```

해법은 인터페이스에 Abseil type을 노출하지 않는 것이다. 라이브러리는 자기 내부에서만 Abseil을 쓰고, 인터페이스는 std 또는 자체 type으로.

## ABSL_LTS_RELEASE_VERSION

Abseil은 LTS 버전을 컴파일러 매크로로 노출한다.

```cpp
#include "absl/base/config.h"

#ifdef ABSL_LTS_RELEASE_VERSION
    // LTS 빌드. 값은 예: 20240722
    static_assert(ABSL_LTS_RELEASE_VERSION >= 20240116,
                  "Need at least 20240116 LTS");
#else
    // HEAD 빌드
#endif
```

이 매크로로 LTS 간 차이를 #if로 분기하는 것은 가능하지만 권장하지 않는다. 한 LTS 안에서 일관된 코드를 쓰는 게 낫다.

## std로의 마이그레이션 부담

ABI 정책 때문에 마이그레이션도 신중해야 한다.

```cpp
// 코드베이스 일부가 absl::optional, 나머지가 std::optional
void Process(absl::optional<int>);
void Process(std::optional<int>);
// 다른 type. 같은 함수 두 번 정의해야 하나? — 마이그레이션이 한 번에 끝나야 한다는 신호

// ABSL_OPTION_USE_STD_OPTIONAL=1로 두면 둘이 같은 type이 됨
// 하지만 이 옵션은 전체 코드베이스에서 통일되어야 함
```

마이그레이션은 코드베이스 전체를 한 단위로 본다. 점진적 변환은 어렵고, 한 commit으로 끊는 것이 깔끔하다.

## 코드 리뷰 포인트

```cpp
// 리뷰 질문 1: 라이브러리 인터페이스에 absl type이 들어가 있는가?
// my_lib.h (public header)
#include "absl/status/status.h"
absl::Status MyAPI();  // 사용자가 같은 LTS의 Abseil을 써야만 한다는 제약

// Good — 가능하면 std 또는 자체 type
std::error_code MyAPI();
// 또는 라이브러리 사용자에게 명확히 "Abseil 20240722.0 이상 필요" 문서화
```

```cmake
# 리뷰 질문 2: 시스템 Abseil + bundled Abseil이 mix되는가?
find_package(absl REQUIRED)         # 시스템
add_subdirectory(third_party/absl)  # bundled
# 컴파일 에러는 안 나지만 link 시점에 충돌 가능
```

```cpp
// 리뷰 질문 3: ABSL_OPTION_USE_STD_*를 임의로 변경하는가?
// 새 옵션을 코드베이스 일부에만 적용하면 type mismatch
#define ABSL_OPTION_USE_STD_OPTIONAL 1  // 절대 부분 변경 금지
```

## 자주 보는 안티패턴

```cpp
// 회피 — Abseil 내부 namespace를 직접 참조
absl::lts_20240722::Status s = ...;
// inline namespace는 추상화. 직접 참조하면 LTS 업데이트 시 깨짐.

// Good
absl::Status s = ...;
```

```cpp
// 회피 — 두 ABI 버전을 같은 binary에 mix
// 위에서 다룬 시나리오 — link error로 잡힐 수도 있고 안 잡힐 수도 있다.
```

## 정리

- Abseil의 ABI 호환은 "같은 빌드 단위 내"에서만.
- inline namespace에 LTS 버전과 옵션을 인코딩해서 mismatch를 link 단계에서 잡으려 한다.
- 시스템 패키지(apt 등)는 권장하지 않는다. source build가 안전.
- 라이브러리 인터페이스에 Abseil type을 노출하면 사용자에게 같은 Abseil 버전을 강제하게 됨.
- `ABSL_OPTION_USE_STD_*`는 코드베이스 전체에서 통일되어야 한다.

## 다음 편

Part 1을 마치고 Part 2로 넘어간다. Part 2-01에서 `ABSL_HAVE_*`, `ABSL_ATTRIBUTE_*` 매크로 군을 본다. 컴파일러와 플랫폼 차이를 흡수하는 첫 번째 도구.

## 관련 항목

- [Part 1-02: Design philosophy](/blog/programming/code-review/abseil/part1-02-design-philosophy)
- [Part 1-03: Build & dependency](/blog/programming/code-review/abseil/part1-03-build-dependency-bazel)
- [Part 1-04: LTS vs HEAD release model](/blog/programming/code-review/abseil/part1-04-lts-vs-head-release)
- [Part 2-01: ABSL_HAVE_* / ABSL_ATTRIBUTE_* macros](/blog/programming/code-review/abseil/part2-01-abseil-macros)
- [원문 — Abseil compatibility guidelines](https://abseil.io/about/compatibility)
- [원문 — absl/base/options.h](https://github.com/abseil/abseil-cpp/blob/master/absl/base/options.h)
