---
title: "Ch 6: Source Code Standards & MISRA C 적용"
date: 2026-05-18T07:00:00
description: "SCS 문서 구성, MISRA C 적용, 명명 규칙, defensive programming, LLR ↔ Code traceability."
tags: [do-178c, source-code, scs, misra, defensive, traceability, code-review]
series: "DO-178C"
seriesOrder: 6
draft: false
---

DO-178C는 *특정 코딩 표준을 명시하지 않는다*. *프로젝트가 자체 SCS (Software Code Standards)*를 정의해 *심사관 승인*을 받는다. 대부분의 항공 프로젝트가 *MISRA C + 추가 규칙*을 채택. 이 장은 *SCS 작성, MISRA C 적용, LLR ↔ Code traceability, Code Review*까지.

## SCS의 역할 — DO-178C §11.8

> **Software Code Standards**: Standards applied to the development of Source Code to maintain consistency, readability, modifiability, and verifiability.

SCS는 *Plan 단계*에서 작성 (3장 참고). *Source Code Development*가 *SCS를 따라야* 한다.

**Plan 단계:**

- SCS 작성 → FAA SOI 1 review 승인

**Development 단계:**

- Source Code가 SCS 준수
- Static analysis로 자동 검증
- Code review로 수동 검증

**Verification 단계:**

- Coverage 분석 시 SCS 준수 재확인

## SCS 구성 — 표준 구조

```
1. Introduction
   - 적용 범위
   - 적용 언어 (C, C++, Ada)

2. Base Coding Standard
   - 외부 표준 채택 (MISRA C, JSF C++ 등)
   - 표준 버전 명시 (MISRA C:2012 Amendment 4)
   - 적용 등급 (Mandatory + Required + Advisory 일부)

3. Project-Specific Rules
   - 외부 표준 외 추가 규칙
   - 외부 표준의 일부 advisory를 required로 격상
   - 외부 표준의 일부 deviation 영역

4. Naming Conventions
   - File names
   - Type names
   - Function names
   - Variable names
   - Constants and macros

5. File Organization
   - Header structure
   - Implementation structure
   - Include order

6. Documentation Standards
   - 함수 doc comment 형식
   - 모듈 doc comment
   - Inline comment 가이드

7. Defensive Programming
   - Input validation
   - Error handling
   - Assertion usage
   - Resource management

8. Language-Specific Rules
   - C-specific (preprocessor, pointer)
   - C++-specific (RAII, exceptions, RTTI)

9. Code Review Checklist
   - Pre-commit checks
   - Peer review items

10. Compliance and Deviation Process
    - 위반 검출 도구
    - Deviation 절차 (Permit + Record)

11. References
```

## SCS 작성 예 — 항공 프로젝트

```
=== SCS — Flight Management Software (가상 template) ===
Project: FMS v2.0
DAL: B
Language: C

1. Introduction
   This document defines the source code standards for the
   Flight Management Software (FMS), DAL B.
   Applies to all production code in src/ directory.
   Test code in tests/ may deviate per agreed exceptions.

2. Base Coding Standard
   MISRA C:2012 Amendment 4 (2023)

   Severity assignments:
   - Mandatory: 100% compliance, no deviation
   - Required:  100% compliance OR deviation per §10
   - Advisory:  per project rules below

3. Project-Specific Rules

   3.1 Advisory → Required Promotions
   The following MISRA Advisory rules are promoted to Required:
   - Rule 5.9   (internal linkage identifier uniqueness)
   - Rule 8.7   (use static when possible)
   - Rule 11.5  (explicit cast for void *)
   - Rule 15.4  (single break/return per loop)
   - Rule 15.5  (single function exit point — with cleanup exception)
   - Rule 18.4  (use [] not pointer arithmetic)

   3.2 Additional Rules

   PR-001: All functions ≤ 60 LSLOC (excluding comments).
   PR-002: McCabe Cyclomatic Complexity ≤ 10.
   PR-003: Nesting depth ≤ 4.
   PR-004: Function parameters ≤ 6.
   PR-005: ISR functions ≤ 30 LSLOC.
   PR-006: All non-void function returns checked or (void) cast.
   PR-007: No dynamic memory allocation post-init (MISRA 21.3 strict).
   PR-008: No recursion (MISRA 17.2 strict, no deviation).
   PR-009: All header files have include guards (MISRA Dir 4.10).
   PR-010: All public functions have Doxygen documentation.
   PR-011: All input parameters validated (NULL check, range check).
   PR-012: All non-trivial assumptions have ASSERT.

4. Naming Conventions

   4.1 File Names
   - lowercase, underscore
   - Example: flight_ctrl.c, can_driver.h, sensor_filter.c

   4.2 Types
   - PascalCase
   - Suffix _t for typedef
   - Example: FlightState, CanMessage_t, sensor_data_t

   4.3 Functions
   - snake_case
   - Module prefix
   - Example: flight_ctrl_init(), can_driver_send()

   4.4 Variables
   - snake_case
   - Examples: current_altitude, error_count, p_buffer

   4.5 Constants and Macros
   - SCREAMING_SNAKE_CASE
   - Examples: MAX_ALTITUDE, FLIGHT_TIMEOUT_MS, DEG_TO_RAD(x)

   4.6 Module Prefix
   - All public functions: <module>_<action>
   - Examples: fms_compute_eta(), nav_get_position()

   4.7 Private vs Public
   - Public functions: declared in header
   - Private functions: static, in .c only

5. File Organization

   5.1 Header (.h) Structure
   ```
   /**
    * @file <filename>.h
    * @brief One-line module description
    * @author <author>
    * @date <date>
    *
    * Module overview (3-10 lines).
    * Allocation: HLR-XXX, HLR-YYY
    */

   #ifndef PROJECT_MODULE_FILENAME_H
   #define PROJECT_MODULE_FILENAME_H

   /* System includes */
   #include <stdint.h>
   #include <stddef.h>

   /* Project includes */
   #include "common_types.h"

   /* Forward declarations */
   struct OtherType;

   /* Public types */
   typedef struct { ... } module_data_t;

   /* Public constants */
   #define MODULE_MAX_SIZE 256U

   /* Public function declarations (with full Doxygen) */
   /**
    * @brief Initialize the module.
    * @param[in] config Pointer to configuration (non-NULL).
    * @return 0 on success, negative errno on failure.
    * @requirement HLR-XXX
    */
   int module_init(const module_config_t *config);

   #endif  /* PROJECT_MODULE_FILENAME_H */
   ```

   5.2 Implementation (.c) Structure
   ```
   /**
    * @file <filename>.c
    * @brief Implementation of <module>
    */

   /* Self-include first */
   #include "<filename>.h"

   /* System includes */
   #include <stdint.h>
   #include <string.h>

   /* Project includes */
   #include "logger.h"
   #include "rtos_wrapper.h"

   /* Private types */
   typedef struct { ... } internal_state_t;

   /* Private constants */
   #define BUFFER_DEPTH 32U

   /* Private (static) variables */
   static internal_state_t s_state = { 0 };

   /* Private function declarations */
   static int validate_input(const data_t *data);

   /* Public function implementations (in .h declaration order) */
   int module_init(const module_config_t *config) {
       /* ... */
   }

   /* Private function implementations */
   static int validate_input(const data_t *data) {
       /* ... */
   }
   ```

6. Documentation Standards

   6.1 Function Comments (Doxygen)
   Every public function MUST have:
   ```
   /**
    * @brief One-line summary (period at end).
    *
    * Detailed description (optional, 1-5 lines).
    *
    * @param[in]  param_name Description.
    * @param[out] param_name Description.
    * @return Description of return value.
    * @pre   Preconditions (NULL checks, ranges).
    * @post  Postconditions (state changes).
    * @retval 0 Success.
    * @retval -EINVAL Invalid parameter.
    * @note Special considerations.
    * @requirement HLR-XXX (LLR-YYY)
    */
   ```

   6.2 Module Comments
   Every .c and .h file MUST start with file-level Doxygen.

   6.3 Inline Comments
   - Comment WHY, not WHAT.
   - Magic numbers must have constant or comment.
   - Complex algorithms reference source paper.

7. Defensive Programming

   7.1 Input Validation
   Every public function:
   - NULL check all pointer parameters
   - Range check all integer parameters
   - Validate enum values

   ```c
   int module_compute(const data_t *input, uint32_t count, result_t *output) {
       if (input == NULL || output == NULL) return -EINVAL;
       if (count == 0 || count > MAX_COUNT) return -ERANGE;

       /* ... */
   }
7.2 Assertions
Every function: minimum 2 assertions (per JPL Power of 10).
- Pre-conditions: ASSERT(param != NULL);
- Post-conditions: ASSERT(result < MAX);
- Invariants: ASSERT(state.count >= 0);
   #define ASSERT(cond) do { \
       if (!(cond)) { \
           emergency_log("ASSERT: " #cond " at " __FILE__ ":%d", __LINE__); \
           emergency_halt(); \
       } \
   } while (0)
   ```

   7.3 Error Handling
   - All errors returned as negative errno
   - Caller MUST check (PR-006)
   - No silent failures

   7.4 Resource Management
   - All allocated resources freed
   - goto cleanup pattern (with deviation for Rule 15.4)
   - Match acquire/release in same function

8. Language-Specific Rules

   8.1 C-Specific
   - Use stdint.h types (int32_t, uint16_t)
   - Use stdbool.h for boolean
   - Use static inline instead of macros for functions
   - No GCC extensions (or wrapped in macros)

   8.2 Preprocessor
   - Macros: SCREAMING_SNAKE
   - Function macros: do { } while (0) pattern
   - Conditional: #if PROJECT_FOO not #ifdef
   - #pragma: wrapped in compatibility macros

9. Code Review Checklist
   See Appendix A.

10. Compliance and Deviation Process

    10.1 Detection
    Static analysis: Helix QAC 2024.2 (configured per QAC-CFG-FMS-2024)
    Continuous: every commit, every nightly build, every release

    10.2 Deviation
    For Required rule violations:
    - Author files Deviation Record (DR)
    - Module Owner approval
    - Safety Manager approval (for DAL B+)
    - DR tracked in DOORS module SCS-DR

11. References
    - MISRA C:2012 Amendment 4 (2023)
    - JPL Power of 10 (Holzmann 2006) — inspiration
    - DO-178C §11.8
    - PSAC §6 (Software Lifecycle Data)
```

이런 *50~100 페이지 SCS*가 *전 코드의 헌법*. 모든 코더가 *참고 + 준수*.

## MISRA C 적용 — 결정 사항

대부분 항공 프로젝트가 *MISRA C:2012 Amendment 4*. 추가 결정:

```
What to enforce:
□ All Mandatory (10개)         → 100%, no deviation
□ All Required (~110개)        → 100% OR deviation
□ Advisory (~30개)             → 선택적 (PR로 일부 격상)

What to skip:
□ Rule 11.4 (포인터-정수 변환)  → MMIO에 deviation
□ Rule 15.5 (단일 종료점)       → cleanup goto 패턴 허용
□ Rule 17.7 (반환값 검사)       → (void) cast로 명시 무시 허용
□ Rule 21.6 (stdio)             → debug 로그 wrapper 허용
```

각 결정이 *SCS에 명시*. 심사관에게 *명확한 정책*.

## SCS와 외부 라이브러리

**프로젝트 구조:**

- src/                   ← SCS 100% 준수 (deviation 보고)
- third_party/           ← SCS 면제 (별도 Permit)
- FreeRTOS/
- LWIP/
- libcrc/
- wrappers/              ← SCS 준수 (third_party와 src 사이 layer)

**심사관 view:**

- src와 wrappers: SCS 준수 입증
- third_party: 별도 SOUP (Software of Unknown Pedigree) 절차
- SOUP는 ED-12C §5.4.1 또는 DO-178C §11.6 (PDS) 적용

## LLR ↔ Code Traceability — A-5-3

각 LLR이 *어느 함수에 구현*되었는지 *추적 가능*해야.

**DOORS Traceability:**

- LLR-PFC-103
- ↓ implements
- pitch_controller.c::pitch_pid_compute()

**Code annotation:**

- /**
- @requirement LLR-PFC-103 */ void pitch_pid_compute(...) { ... }

Tool이 *코드 annotation*과 *DOORS LLR*을 *cross-reference*:

```bash
# DOORS DXL script
for each LLR:
   parent_hlr = LLR.outgoing("traces_to")
   impl_files = grep "@requirement " + LLR.ID + " src/**/*.c"
   if impl_files.empty():
       print "WARN: LLR " + LLR.ID + " not implemented"
```

DAL A/B = *100% LLR → Code 매핑*. *누락 LLR*은 finding.

## Coverage Counter-Example — Code without LLR

```c
// src/sensor.c

void sensor_init(void) {            /* LLR-SEN-001 */
    /* ... */
}

void sensor_calibrate(void) {       /* LLR-SEN-002 */
    /* ... */
}

static void debug_dump_state(void) {
    /* 디버그 함수, LLR 없음 — *언제 호출되는가*?
       SCS-DR-042: dev build only, #ifdef DEBUG */
}
```

*LLR 없는 코드*는 *dead code* 또는 *deactivated code*. *SCS-DR*로 정당화하거나 *제거*.

## Defensive Programming Patterns

```c
// 1. NULL check at function entry
int can_send_message(const can_msg_t *msg) {
    if (msg == NULL) return -EINVAL;
    if (msg->dlc > 8) return -ERANGE;

    /* ... */
}

// 2. Assertion for impossible states
static int internal_helper(int state) {
    switch (state) {
        case STATE_INIT:    return handle_init();
        case STATE_RUNNING: return handle_running();
        case STATE_ERROR:   return handle_error();
        default:
            ASSERT(0);  // 도달 불가
            return -EINVAL;
    }
}

// 3. Error code propagation
int process_frame(frame_t *f) {
    int rc;

    rc = validate_frame(f);
    if (rc != 0) return rc;

    rc = decode_payload(f);
    if (rc != 0) return rc;

    rc = transmit_result(f);
    if (rc != 0) return rc;

    return 0;
}

// 4. Resource cleanup with goto
int read_file(const char *path) {
    int fd = -1;
    char *buf = NULL;
    int rc = -1;

    fd = open(path, O_RDONLY);
    if (fd < 0) goto cleanup;

    buf = malloc(BUF_SIZE);
    if (buf == NULL) goto cleanup;

    if (read(fd, buf, BUF_SIZE) < 0) goto cleanup;

    /* process buf */
    rc = 0;

cleanup:
    if (buf) free(buf);
    if (fd >= 0) close(fd);
    return rc;
}

// 5. Range validation for ARINC 429 labels
int process_label(uint32_t arinc_word) {
    uint8_t label = arinc_word & 0xFF;
    if (label < ARINC_LABEL_MIN || label > ARINC_LABEL_MAX) {
        log_error("invalid label: %02X", label);
        return -EINVAL;
    }
    /* ... */
}
```

## Code Review Procedure

각 함수가 *peer review*. *최소 2명*. DAL B+ = Independence 의무.

### Pre-Review Checklist

```
Author checks before submitting:
□ Static analysis: 0 warnings
□ Compiler: 0 warnings (-Wall -Wextra -Werror)
□ Unit tests: 100% pass
□ Coverage: ≥ 90% (per module)
□ Doxygen: complete for all public functions
□ LLR annotations: present
□ MISRA: no Mandatory violations, Required justified
□ Code formatted (clang-format)
□ Commit message: convention + traceability
```

### Review Items

```
Reviewer checks:

Functional:
□ Does implementation match LLR?
□ All LLR cases handled?
□ Error paths complete?

Style:
□ Naming convention?
□ Function length ≤ 60?
□ Complexity ≤ 10?
□ Nesting ≤ 4?

Safety:
□ NULL checks at public function entry?
□ Range validation for inputs?
□ Assertions for invariants?
□ Resource cleanup (open/close, alloc/free)?

Defensive:
□ Error codes returned correctly?
□ Edge cases handled?
□ Concurrent access protected?

Performance:
□ WCET within budget?
□ Memory usage within budget?

Maintainability:
□ Doxygen complete and accurate?
□ Inline comments WHY not WHAT?
□ Code readable to junior engineer?
```

수십 항목. *체크리스트 기반 review*가 *consistent quality*.

### Review Tools

```
Gerrit                   — 큰 항공 프로젝트 (Boeing 등)
GitLab Merge Request     — 신생 회사
Atlassian Crucible       — 일부 OEM
GitHub PR Review         — 일반 사용
ReviewBoard              — 자체 호스팅

Plug-ins:
- DOORS link
- Static analysis result inline
- Coverage diff
```

### Review Statistics

```
좋은 review의 기준:

Review rate:        100-200 LoC per hour
Defect detection:   5-10 issues per 100 LoC (DAL A/B)
Defect categories:
  - Logic errors:        30%
  - Coding standard:     25%
  - Documentation:       20%
  - Style:               15%
  - Performance:         10%

Re-review after fix: 80% close in 1 round, 15% in 2, 5% in 3+
```

review가 *너무 빠르면* (300+ LoC/hour) *놓침이 많음*. *너무 느리면* (50 LoC/hour) *생산성 저하*.

## Coding Tools

**컴파일러 (TCL-1, qualified):**

- GCC for ARM (FAA AC 00-69, ESA Q-ST-80C에서 일부 qualified)
- Green Hills MULTI (전통 항공)
- Wind River Diab
- IAR Embedded Workbench
- AdaCore GNAT Pro (Ada)
- Vendor-specific: TI ARM CGT, etc.

**정적 분석:**

- Helix QAC
- Polyspace Bug Finder + Code Prover
- LDRA Testbed
- Coverity
- clang-tidy + scan-build (보완)

**Formatting:**

- clang-format
- Uncrustify
- astyle

**IDE:**

- VSCode + extensions
- Eclipse CDT
- Green Hills MULTI IDE
- IAR EW
- Wind River Workbench

## Common Code Findings — A-5

```
가장 흔한 Code-level finding (Major):

1. "function pitch_pid_compute() = 85 LSLOC > PR-001 (60)"
   → 코드 분할 필요

2. "function navigation_update() cyclomatic = 15 > PR-002 (10)"
   → 단순화 또는 분할

3. "MISRA Rule 17.7 violation: fopen() return ignored"
   → 검사 추가 or (void) cast

4. "MISRA Rule 9.1 (Mandatory) violation: uninitialized x at line 42"
   → 즉시 수정 (no deviation)

5. "LLR-PFC-103 not implemented in any file"
   → 코드 추가 or LLR 제거

6. "function calibrate() has 0 assertions"
   → ASSERT 추가 (JPL minimum 2)

7. "header sensor.h has no include guard"
   → MISRA Dir 4.10 / PR-009 위반

8. "global variable g_state lacks rationale"
   → SCS 위반: globals require justification
```

## 실전 — Pitch Controller 코드

```c
/**
 * @file pitch_controller.c
 * @brief Pitch PID Control Implementation
 * @author Flight Control Team
 * @date 2024-04-15
 *
 * Implements PID control for aircraft pitch axis.
 * Allocated to HLR-PFC-014 (Pitch Control Loop).
 *
 * @copyright Copyright (c) 2024 ABC Aerospace
 */

#include "pitch_controller.h"

#include <stdint.h>
#include <string.h>

#include "control_constants.h"
#include "logger.h"
#include "assertions.h"

/* Private constants */
#define I_TERM_LIMIT  10.0F
#define OUTPUT_LIMIT  100.0F

/**
 * @brief Compute pitch PID output.
 *
 * Implements proportional-integral-derivative control law per
 * Pitch Control Design Doc PCD-2024-007, §3.2.1.
 *
 * @param[in]     setpoint       Desired pitch (deg, ±20).
 * @param[in]     measure        Measured pitch (deg, ±90).
 * @param[out]    output         Elevator command (%, ±100).
 * @param[in,out] state          PID internal state (non-NULL).
 * @return 0 on success, negative errno on invalid input.
 * @retval 0       Success.
 * @retval -EINVAL NULL pointer or out-of-range parameter.
 *
 * @pre  state != NULL, output != NULL
 * @pre  |setpoint| ≤ 20.0
 * @pre  |measure|  ≤ 90.0
 * @pre  state initialized via pitch_pid_init()
 *
 * @post |*output| ≤ 100.0
 * @post |state->i_term| ≤ 10.0
 *
 * @note Cycle time: 20ms (50Hz).
 * @note WCET: 25μs measured on Cortex-A53 @ 1GHz.
 *
 * @requirement LLR-PFC-103 (parent: HLR-PFC-014)
 */
int pitch_pid_compute(
    float setpoint,
    float measure,
    float *output,
    pitch_pid_state_t *state)
{
    /* Pre-condition checks */
    if (output == NULL || state == NULL) {
        return -EINVAL;
    }
    if (setpoint < -20.0F || setpoint > 20.0F) {
        return -ERANGE;
    }
    if (measure < -90.0F || measure > 90.0F) {
        return -ERANGE;
    }

    ASSERT(state->initialized == 1);

    /* Compute error */
    float error = setpoint - measure;

    /* P term */
    float p_term = K_P * error;

    /* I term with anti-windup */
    state->i_term += K_I * error * DT;
    if (state->i_term >  I_TERM_LIMIT) state->i_term =  I_TERM_LIMIT;
    if (state->i_term < -I_TERM_LIMIT) state->i_term = -I_TERM_LIMIT;

    /* D term */
    float d_term = K_D * (error - state->prev_error) / DT;
    state->prev_error = error;

    /* Combine + saturate */
    float result = p_term + state->i_term + d_term;
    if (result >  OUTPUT_LIMIT) result =  OUTPUT_LIMIT;
    if (result < -OUTPUT_LIMIT) result = -OUTPUT_LIMIT;

    *output = result;

    /* Post-condition */
    ASSERT(*output >= -OUTPUT_LIMIT && *output <= OUTPUT_LIMIT);

    return 0;
}
```

특징:
- *모든 SCS 규칙 준수*
- LLR-PFC-103 명시
- Pre/post condition + assertion
- 모든 input validation
- *60 줄 미만*
- *Cyclomatic 5*
- *Nesting 2*

## 정리

- SCS는 *프로젝트 자체 작성* — DO-178C는 표준 명시 안 함.
- 거의 모든 항공 프로젝트 = *MISRA C:2012 Amendment 4 + 추가*.
- 명명 규칙, 파일 구조, doc, defensive programming, deviation 절차 모두 SCS에.
- 외부 라이브러리는 *SOUP (Software of Unknown Pedigree)*로 격리.
- LLR ↔ Code traceability는 *@requirement* annotation으로.
- Code review는 *peer + Independence (DAL B+)*. *체크리스트 기반*.
- 100-200 LoC/hour review rate, 100 LoC당 5-10 defect 발견.
- Tool: 컴파일러는 *qualified*, 정적 분석은 *QAC/Polyspace/LDRA*.

## 다음 장 예고

7장은 *Integration·Build·Executable Object Code* — 통합 절차, linker, memory map, EOC 검증.

## 관련 항목

- [Ch 5 — Software Design (LLR + Architecture)](/blog/embedded/aerospace-standards/do-178c/chapter05-software-design)
- [Ch 7 — Integration·Build·EOC](/blog/embedded/aerospace-standards/do-178c/chapter07-integration-build)
- [MISRA C Ch 1](/blog/embedded/automotive/misra-c/chapter01-introduction)
- [JPL Power of 10](/blog/embedded/aerospace-standards/jpl-power-of-ten/chapter01-the-ten-rules)
- [MISRA Project Coding Standard examples](https://misra.org.uk/)
