---
title: "Ch 2: Environment + Language Compliance (Rule 1-13)"
date: 2025-09-30T03:00:00
description: "JSF C++ Rules 1-13 — 함수 크기 한계, cyclomatic complexity, ISO C++03 준수, 컴파일러 확장 회피."
tags: [jsf-cpp, environment, language, iso-14882, complexity, function-size]
series: "JSF C++"
seriesOrder: 2
draft: false
---

JSF C++의 *첫 13 rule*. *환경 + 언어 준수* 영역. *Rule 1*이 가장 유명 — *함수 200 LSLOC 한계*. 다른 항공·우주 표준이 *나중에 채택*. 이 장은 *Rule 1-13의 의미·근거·실전 적용*까지.

## AV Rule 1 — 함수 크기 200 LSLOC

```
AV Rule 1 (Will)
"Any one function (or method) will contain no more than 200 logical
 source lines of code (L-SLOCs)."
```

**LSLOC = Logical Source Lines of Code** (주석·빈 줄·중괄호 제외).

### 200 vs 60 vs 100 — 표준별 비교

```
JSF C++:        200 L-SLOC
NASA JPL:       60 L-SLOC
MISRA C:        명시 없음
AUTOSAR C++14: 명시 없음 (프로젝트 정책)
Linux Kernel:   ~30 (관습)
Google Style:   40 (강력 권장)
```

JSF의 *200*은 *항공 SW의 복잡한 알고리즘*을 고려. 단 *대부분 함수는 50 미만*이 목표.

### 측정 도구

```bash
# Lizard (Python)
lizard --LSLOC src/

# Output:
# pitch_pid_compute       45 LoC  CCN 5
# stall_warning           87 LoC  CCN 8
# autopilot_main         245 LoC  CCN 18   ← Rule 1 위반

# Helix QAC
qac.exe -prj jsf.prj    # AV Rule 1 자동 검출
```

### 위반 시 대응

```cpp
// 위반 (245 LSLOC)
void AutopilotMain(...) {
    // 245 lines of mode switching, control law, etc.
}

// Good — 분할
void AutopilotMain(...) {
    UpdateMode();           // 50 LSLOC
    UpdateControlLaw();     // 80 LSLOC
    UpdateOutputs();        // 45 LSLOC
    UpdateMonitoring();     // 35 LSLOC
}
```

각 sub-function이 *single responsibility*. *리뷰·테스트 용이*.

## AV Rule 2 — Self-modifying Code 금지

```
AV Rule 2 (Will)
"There shall not be any self-modifying code."
```

```cpp
// 위반 — runtime code generation
void *code = mmap(NULL, 4096, PROT_READ | PROT_WRITE | PROT_EXEC, ...);
memcpy(code, machine_code, sizeof(machine_code));
((void (*)())code)();  // 위반

// 위반 — code patching
void Foo() { /* ... */ }
char *patch = (char *)Foo;
patch[0] = 0xC3;  // 위반 — Foo 함수 수정
```

이유:
- *Static analysis 불가능*
- *Verification 불가능*
- *MC/DC coverage 불가능*
- 항공기에서 *상상 불가*

100% 금지. *deviation 없음*.

## AV Rule 3 — Cyclomatic Complexity ≤ 20

```
AV Rule 3 (Will)
"All functions shall have a cyclomatic complexity number of less than 20."
```

### McCabe Cyclomatic Complexity

```
CCN = E - N + 2P
  E = edges in control flow graph
  N = nodes in control flow graph
  P = connected components (보통 1)

또는 단순 계산:
  CCN = 1 + (number of if/while/for/case/&&/||/?:)
```

### 예

```cpp
int Process(int x) {        // CCN start = 1
    if (x > 0) {            // +1 = 2
        if (x < 100) {      // +1 = 3
            return 1;
        }
    }
    return 0;
}
// Final CCN = 3
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
// Final CCN = 5
```

### 다른 표준 비교

```
JSF C++:        CCN ≤ 20
NASA JPL:       CCN ≤ 10 (제곱이라 더 엄격)
NIST:           CCN ≤ 10
Microsoft:      CCN ≤ 25
Linux:          명시 없음
```

JSF의 20은 *항공 알고리즘*에 적합. *모드 management* 같은 큰 switch가 *자연스럽게 15-20*.

### Tool

```
Lizard:                  무료
Understand:              상용
SonarQube:               무료/유료
Helix QAC:               상용

리포트 예:
  Average CCN: 4.2
  Max CCN: 18 (process_telemetry)
  Violations of Rule 3: 0
  Functions > 10: 5
  Functions > 15: 2
```

## AV Rule 4 — Tab 사용 금지 (옵션)

```
AV Rule 4 (Should)
"Tabs should be avoided."
```

탭 vs 스페이스의 *영원한 논쟁*. JSF는 *spaces 권장*. 항공계 대부분이 4-space.

```cpp
// 권장 (4 spaces)
void Foo() {
    if (x > 0) {
        Bar();
    }
}
```

`.editorconfig` 또는 `clang-format`로 강제.

```ini
# .editorconfig
[*.cpp]
indent_style = space
indent_size = 4
```

## AV Rule 5-12 — Headers and Includes

```
AV Rule 5: Header file naming (.h, .hpp)
AV Rule 6: Header file structure (include guard)
AV Rule 7: Source file structure (include order)
AV Rule 8-12: Include rules
```

### AV Rule 6 — Header Guard

```cpp
// foo.hpp
#ifndef PROJECT_MODULE_FOO_HPP
#define PROJECT_MODULE_FOO_HPP

// content

#endif // PROJECT_MODULE_FOO_HPP
```

또는 *`#pragma once`* (비표준이지만 대부분 컴파일러 지원).

```cpp
// foo.hpp
#pragma once

// content
```

JSF는 *include guard 권장*. `#pragma once`는 *컴파일러 의존*.

### AV Rule 7 — Include Order

```cpp
// foo.cpp

// 1. 자기 자신 (interface 검증)
#include "foo.hpp"

// 2. System headers
#include <cstdint>
#include <string>

// 3. 외부 library
#include <boost/optional.hpp>

// 4. Project headers
#include "common.hpp"
#include "utils.hpp"

// 5. Local (같은 모듈)
#include "foo_internal.hpp"
```

이 *순서*가 *include dependency 명확*. *self-include first*가 *header completeness 검증* (header가 *self-contained*인지).

## AV Rule 13 — ISO/IEC 14882:2002 (C++03) 준수

```
AV Rule 13 (Will)
"All code shall conform to ISO/IEC 14882:2002(E) standard C++."
```

C++03이 *기준*. 2005년 JSF 발행 시 *available standard*. *C++11/14는 사용 불가* (JSF 원본 기준).

### 컴파일러 옵션

```bash
# GCC
g++ -std=c++03 -pedantic -Wall -Wextra -Werror src.cpp

# Clang
clang++ -std=c++03 -pedantic -Wall -Wextra -Werror src.cpp
```

`-pedantic`이 *비-표준 확장 거부*. JSF 준수에 필수.

### 비-표준 확장 회피

```cpp
// 위반 — GCC 확장
int arr[size];                        // VLA (C99 only, GCC C++ 확장)
typeof(x) y;                          // GCC typeof
__attribute__((packed)) struct S {};  // GCC attribute

// Good — 표준
int *arr = new int[size];             // 동적 배열
decltype(x) y;                        // C++11 — JSF 원본은 불가
// packed: 매크로로 wrapping
```

### Compiler-specific 회피 패턴

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
struct PACKED Header { ... };
ALWAYS_INLINE int compute(...) { ... }
```

매크로 *wrapping*으로 *portable*. JSF 원칙 충족.

## 추가 Environment Rules (Rule 5-12 상세)

### AV Rule 5 — File Naming

```
AV Rule 5 (Should)
"Identifiers in an inner scope shall not use the same name as an
 identifier in an outer scope, and therefore hide that identifier."
```

```cpp
// 위반
int counter;                  // outer scope

void Foo() {
    int counter = 5;          // 위반 — outer hide
    counter++;
}

// Good
int g_counter;                // global (g_ prefix)

void Foo() {
    int counter = 5;          // local 명확
    counter++;
}
```

### AV Rule 6 — Empty if/else

```
AV Rule 6 (Should)
"#include statements shall only be preceded by other preprocessor
 directives or comments."
```

```cpp
// 위반
void Foo();                   // declaration before include
#include "header.hpp"

// Good
#include "header.hpp"

void Foo();
```

## C++03의 한계 — 30년 전 표준

JSF C++ 2005 발행 시 *C++03 기준*. 현대 관점에서:

```
C++03이 가지지 못한 기능:
  - auto (C++11)
  - lambda (C++11)
  - nullptr (C++11)
  - enum class (C++11)
  - Range-based for (C++11)
  - Move semantics (C++11)
  - Variadic templates (C++11)
  - constexpr (C++11)
  - std::unique_ptr (C++11)
  - Threading (C++11)

→ JSF 원본은 이 모든 기능 사용 불가
```

F-35가 *2005-2020*에 개발되면서 *C++03에 lock-in*. C++14 진화는 *나중에 part of "modernization"*.

### F-35 Block 4 — C++ 진화

```
F-35 Block 4 (2020+ upgrade):
  - C++14 fragmentary adoption
  - 일부 module에서 modern C++
  - 전체적으로 C++03 호환 유지
  
이유:
  - Legacy code 호환
  - Compiler qualification 비용
  - 새 verification

Lesson:
  Aerospace에서 *언어 upgrade*는 *수년~수십년 지연*.
```

KF-21이 *C++14/17 채택*은 *F-35보다 빠를 수* 있음. 새 시작이라 *legacy burden 없음*.

## 비교 — JSF C++ vs MISRA C++:2008 vs AUTOSAR C++14

```
                   JSF (2005)        MISRA (2008)    AUTOSAR (2017)
─────────────────────────────────────────────────────────────────
Standard            C++03            C++03           C++14
Function size       200 LSLOC        명시 없음        명시 없음 (프로젝트)
Cyclomatic          ≤ 20             ≤ 10            ≤ 10
Tab                 회피             상관없음         상관없음
Include guard       의무             권장             권장
Self-modifying      금지             금지             금지

차이점:
  JSF가 *function size + cyclomatic threshold가 더 관대*
  → 항공 algorithm 특성 반영

  MISRA/AUTOSAR가 *더 엄격* → 자동차 산업의 *작은 함수 trend* 반영
```

## 실전 — JSF Rule 1 위반 처리

```cpp
// 위반 — 245 LSLOC autopilot main loop
void AutopilotMain() {
    // 모드 결정
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

**Refactoring 1 — strategy pattern**:

```cpp
class AutopilotMode {
public:
    virtual ~AutopilotMode() = default;
    virtual void Execute() = 0;
};

class ManualMode : public AutopilotMode {
    void Execute() override { /* 50 lines */ }
};

class HeadingHoldMode : public AutopilotMode {
    void Execute() override { /* 60 lines */ }
};

// 각 mode가 별도 class → 각 Execute()가 < 100 LSLOC
// AutopilotMain은 단순 dispatch
void AutopilotMain() {
    current_mode_->Execute();
}
```

**Refactoring 2 — function extraction**:

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

둘 다 *AV Rule 1 충족*. Strategy pattern이 *더 OO*. Function extraction이 *더 단순*.

JSF에서는 *function extraction* 일반적 — RTTI/virtual 비용 회피.

## Tool 통합

```yaml
# CI pipeline (Jenkins / GitLab)
stages:
  - lint
  - build
  - test

jsf_compliance:
  stage: lint
  script:
    - lizard --LSLOC src/ -L 200 -C 20  # AV Rule 1, 3
    - g++ -std=c++03 -pedantic -Werror src/*.cpp  # AV Rule 13
    - helix-qac.exe -prj jsf.prj         # All JSF rules
    - clang-format --dry-run -Werror src/*.cpp  # AV Rule 4 (style)
```

매 commit이 *Rule 1, 3, 13 검증*. 위반 시 *build fail*.

## 정리

- AV Rule 1: 함수 ≤ 200 LSLOC (NASA JPL의 60보다 관대).
- AV Rule 2: Self-modifying 100% 금지.
- AV Rule 3: Cyclomatic ≤ 20 (JPL/NASA의 10보다 관대).
- AV Rule 13: ISO C++03 준수. 비-표준 확장 회피.
- C++03 한정 → modern C++ 기능 사용 불가 (auto, lambda, nullptr 등).
- F-35 Block 4가 *C++14 fragmentary 도입*. *aerospace 언어 upgrade 늦음*.
- KF-21 같은 새 프로젝트는 *C++14/17 직접 채택* 가능.

## 다음 장 예고

3장은 *Lexical, Naming Conventions* (Rule 14-66) — Hungarian-like prefix, 식별자 규칙.

## 관련 항목

- [Ch 1 — JSF C++ 배경](/blog/embedded/aerospace-standards/jsf-cpp/chapter01-introduction)
- [Ch 3 — Lexical, Naming](/blog/embedded/aerospace-standards/jsf-cpp/chapter03-lexical-naming)
- [NASA JPL Power of 10](/blog/embedded/aerospace-standards/jpl-power-of-ten/chapter01-the-ten-rules)
- [DO-178C Ch 6 — SCS](/blog/embedded/aerospace-standards/do-178c/chapter06-source-code-standards)
- [Lizard — Code metric](https://github.com/terryyin/lizard)
