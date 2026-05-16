---
title: "Ch 2: Environment + Language Compliance"
date: 2025-09-30T03:00:00
description: "JSF C++ — 함수 크기 한계, cyclomatic complexity, ISO C++03 준수, 컴파일러 확장 회피."
tags: [jsf-cpp, environment, language, iso-14882, complexity, function-size]
series: "JSF C++"
seriesOrder: 2
draft: false
---

JSF C++의 *환경 + 언어 준수* 영역. *함수 크기 한계*, *cyclomatic complexity 한계*, *ISO C++03 준수*가 핵심. 일부는 다른 항공·우주 표준에도 *공통 정신*. *정확한 AV Rule 번호·wording은 원문 PDF 참조*.

## 함수 크기 — 약 200 LSLOC

JSF는 *함수 길이를 LSLOC* (Logical Source Lines of Code)로 제한. *주석·빈 줄·중괄호 제외*. 정확한 수치와 wording은 *원문 PDF Rule 1*.

### 표준별 함수 크기 비교

```
JSF C++:        약 200 L-SLOC
NASA JPL:       60 L-SLOC (Power of 10 Rule 4)
Google Style:   ~40 권장
MISRA C / C++:  명시 없음 (프로젝트 정책)
```

JSF의 한계가 다소 관대한 편이나, *실전 함수는 그보다 짧게* 가져가는 것이 일반적.

### 측정 도구

```bash
# Lizard (open source)
lizard --LSLOC src/

# 출력 예
# pitch_pid_compute       45 LoC  CCN 5
# stall_warning           87 LoC  CCN 8
# autopilot_main         245 LoC  CCN 18

# Helix QAC
qac.exe -prj jsf.prj
```

### 위반 시 — Function Decomposition

```cpp
// 위반 (245 LSLOC)
void AutopilotMain(...) {
    // 245 lines
}

// Good — 분할
void AutopilotMain(...) {
    UpdateMode();
    UpdateControlLaw();
    UpdateOutputs();
    UpdateMonitoring();
}
```

각 sub-function이 *single responsibility*. 리뷰·테스트 용이.

## Self-modifying Code 금지

```cpp
// 회피 — runtime code generation
void *code = mmap(NULL, 4096, PROT_READ | PROT_WRITE | PROT_EXEC, ...);
memcpy(code, machine_code, sizeof(machine_code));
((void (*)())code)();

// 회피 — code patching
void Foo() { /* ... */ }
char *patch = (char *)Foo;
patch[0] = 0xC3;
```

이유:
- Static analysis 불가
- Verification 불가
- MC/DC coverage 불가

항공 critical SW에서는 *deviation 없는 금지*.

## Cyclomatic Complexity 한계

JSF는 *함수당 cyclomatic complexity*를 제한. 한계 값은 *원문 Rule 3*. 일반적인 값은 *함수당 약 20 이내*.

### McCabe Cyclomatic Complexity

```
CCN = E - N + 2P
  E = control flow graph edges
  N = nodes
  P = connected components (보통 1)

또는 단순 계산:
  CCN = 1 + (number of if/while/for/case/&&/||/?:)
```

### 예

```cpp
int Process(int x) {        // CCN = 1
    if (x > 0) {            // +1 = 2
        if (x < 100) {      // +1 = 3
            return 1;
        }
    }
    return 0;
}
// CCN = 3
```

```cpp
int Complex(int x, int y) {  // 1
    if (x > 0 && y > 0) {    // +1 (if) +1 (&&) = 3
        for (int i = 0; i < 10; i++) {  // +1 = 4
            if (i % 2 == 0) {            // +1 = 5
                continue;
            }
        }
    }
    return 0;
}
// CCN = 5
```

### 표준별 CCN 비교

```
JSF C++:        ≤ 20
NASA JPL:       ≤ 10 (Power of 10 정신, 더 엄격)
NIST:           ≤ 10 권장
Microsoft:      ≤ 25
Linux:          명시 없음
```

### 측정 도구

```
Lizard:           open source
Understand:       상용
SonarQube:        무료/상용
Helix QAC:        상용
```

## Tab vs Spaces

JSF는 *spaces 권장* (Tab 회피). 항공계 대부분 4-space.

```ini
# .editorconfig
[*.cpp]
indent_style = space
indent_size = 4
```

`clang-format` 또는 `.editorconfig`로 강제.

## Header — Include Guard

```cpp
// foo.hpp
#ifndef PROJECT_MODULE_FOO_HPP
#define PROJECT_MODULE_FOO_HPP

// content

#endif
```

또는 `#pragma once` (비표준이지만 대부분 컴파일러 지원).

```cpp
#pragma once
```

JSF는 *표준 include guard 권장*.

## Include Order

```cpp
// foo.cpp

// 1. 자기 자신 (header completeness 검증)
#include "foo.hpp"

// 2. System headers
#include <cstdint>
#include <string>

// 3. 외부 library
#include <boost/optional.hpp>

// 4. Project headers
#include "common.hpp"
#include "utils.hpp"
```

*Self-include first*가 *header가 self-contained인지 검증*.

## Identifier Shadowing 회피

```cpp
// 회피
int counter;                  // outer

void Foo() {
    int counter = 5;          // outer hide (shadowing)
    counter++;
}

// Good
int g_counter;                // global (명시)

void Foo() {
    int counter = 5;          // local 명확
    counter++;
}
```

## ISO C++ 준수

JSF는 *ISO C++ 표준 준수*를 요구. 원본 (2005) 발행 시점에서 *기준은 C++03* (ISO/IEC 14882:2003).

### 컴파일러 옵션 예

```bash
# GCC — C++03 + 엄격
g++ -std=c++03 -pedantic -Wall -Wextra -Werror src.cpp

# Clang
clang++ -std=c++03 -pedantic -Wall -Wextra -Werror src.cpp
```

`-pedantic`이 *비-표준 확장 거부*. JSF 준수에 유용.

### 비-표준 확장 회피

```cpp
// 회피 — GCC 확장
int arr[size];                        // VLA (C99 only)
typeof(x) y;                          // GCC typeof
__attribute__((packed)) struct S {};  // GCC attribute

// Good — 표준 또는 macro wrapping
int *arr = new int[size];
// packed 등은 매크로로 wrapping
```

### Portable Compiler-specific 코드

```cpp
// macros.hpp
#if defined(__GNUC__)
#  define PACKED      __attribute__((packed))
#  define ALWAYS_INLINE __attribute__((always_inline))
#elif defined(_MSC_VER)
#  define PACKED      __pragma(pack(push, 1))
#  define ALWAYS_INLINE __forceinline
#else
#  define PACKED
#  define ALWAYS_INLINE
#endif

// 사용
struct PACKED Header { /* ... */ };
ALWAYS_INLINE int compute(/* ... */) { /* ... */ }
```

매크로 *wrapping*으로 *portable*. JSF 정신 충족.

## C++03 한정의 의미

JSF 원본은 *C++03 기준*. 다음 기능은 *원본 범위 외*:

```
C++11 이후 기능 (JSF 원본 사용 불가):
  - auto
  - lambda
  - nullptr
  - enum class
  - Range-based for
  - Move semantics
  - Variadic templates
  - constexpr
  - std::unique_ptr / std::shared_ptr
  - Threading library
```

새 프로젝트나 후속 표준 (AUTOSAR C++14, MISRA C++:2023)이 *modern 기능을 단계적 도입*.

## 표준 간 비교 — 공통점·차이점

각 표준이 자기 문서에 명시한 정책 (구체 rule 번호·wording은 원문 PDF):

```
                     JSF C++ (2005)      MISRA C++:2008      AUTOSAR C++14
                                                              (2017)
Standard 기준         C++03                C++03                C++14
함수 크기 명시        있음                  명시 없음            명시 없음
Cyclomatic 명시       있음                  명시 없음            명시 없음
Tab 정책              회피 권장             명시 없음            명시 없음
Include guard         권장                  권장                 권장
Self-modifying        금지                  금지                 금지
```

JSF가 *function size + cyclomatic threshold를 명시*한 점이 특징.

## Refactoring 예 — 큰 함수 분할

```cpp
// 위반 — 큰 autopilot main loop
void AutopilotMain() {
    if (mode == MANUAL) {
        // 50 lines
    } else if (mode == HEADING_HOLD) {
        // 60 lines
    } else if (mode == ALTITUDE_HOLD) {
        // 55 lines
    } else if (mode == NAV) {
        // 80 lines
    }
}
```

### 방법 1 — Function Extraction

```cpp
void AutopilotMain() {
    switch (mode) {
        case MANUAL:        UpdateManual();        break;
        case HEADING_HOLD:  UpdateHeadingHold();   break;
        case ALTITUDE_HOLD: UpdateAltitudeHold();  break;
        case NAV:           UpdateNav();           break;
    }
}
// 각 Update*가 < 100 LSLOC
```

### 방법 2 — Strategy Pattern

```cpp
class AutopilotMode {
public:
    virtual ~AutopilotMode() {}
    virtual void Execute() = 0;
};

class ManualMode : public AutopilotMode {
    void Execute() override { /* 50 lines */ }
};

class HeadingHoldMode : public AutopilotMode {
    void Execute() override { /* 60 lines */ }
};

void AutopilotMain() {
    current_mode_->Execute();
}
```

JSF 환경에서는 *function extraction*이 단순하고 *virtual cost 없음*. Strategy pattern은 *더 OO + virtual cost*.

## CI 통합 예

```yaml
# CI pipeline (예시)
stages:
  - lint
  - build
  - test

jsf_compliance:
  stage: lint
  script:
    - lizard --LSLOC src/ -L 200 -C 20
    - g++ -std=c++03 -pedantic -Werror src/*.cpp
    - helix-qac.exe -prj jsf.prj
    - clang-format --dry-run -Werror src/*.cpp
```

매 commit이 *함수 크기, complexity, language 준수 검증*. 위반 시 *build fail*.

## 정리

- 함수 크기 한계 (LSLOC) — 정확한 값은 원문 Rule 1.
- Self-modifying code 금지.
- Cyclomatic complexity 한계 — 정확한 값은 원문 Rule 3.
- Tab 회피, spaces 권장.
- ISO C++ 준수 — 원본 기준 C++03. `-pedantic`로 강제.
- Include guard, header organization.
- Identifier shadowing 회피.
- 비-표준 확장은 *매크로 wrapping*으로 portable.
- 후속 표준 (AUTOSAR C++14, MISRA C++:2023)이 *modern 기능을 단계적 통합*.

## 다음 장 예고

3장은 *Lexical, Naming Conventions* — Hungarian-like prefix, 식별자 규칙.

## 관련 항목

- [Ch 1 — JSF C++ 배경](/blog/embedded/aerospace-standards/jsf-cpp/chapter01-introduction)
- [Ch 3 — Lexical, Naming](/blog/embedded/aerospace-standards/jsf-cpp/chapter03-lexical-naming)
- [NASA JPL Power of 10](/blog/embedded/aerospace-standards/jpl-power-of-ten/chapter01-the-ten-rules)
- [DO-178C Ch 6 — Source Code Standards](/blog/embedded/aerospace-standards/do-178c/chapter06-source-code-standards)
- [Lizard — Code metric](https://github.com/terryyin/lizard)
