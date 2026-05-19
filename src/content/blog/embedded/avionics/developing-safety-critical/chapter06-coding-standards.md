---
title: "Ch 6: 코딩 표준 — MISRA·CERT·JSF C++"
date: 2026-05-26T06:00:00
description: "DO-178C에서 코딩 표준의 위치 — MISRA C·CERT C·JSF C++의 비교와 선택."
series: "Developing Safety-Critical Software"
seriesOrder: 6
tags: [avionics, do-178c, misra, cert, jsf-cpp, coding-standard]
draft: true
---

## 한 줄 요약

> **"Coding standard = 언어 subset + naming + review rule"** — undefined behavior 회피가 본질이다.

## DO-178C에서 코딩 표준의 위치

```text
Plans (5):
  PSAC·SDP·SVP·SCMP·SQAP

Standards (3):
  SRS (Requirements)
  SDS (Design)
  SCS (Software Code Standards) ← 여기
  
SCS 내용:
  - 언어 (C·C++·Ada)
  - Subset rule (MISRA·CERT·JSF C++)
  - Naming convention
  - Comment·header
  - Error handling
  - Memory·pointer rule
  - Concurrency rule
```

코딩 표준 — *준수 evidence가 audit 대상*. Static analyzer + manual review.

## C 표준 — MISRA C 2023

```text
MISRA C 2023 (구 MISRA C:2012 Amd 4):
  Origin — 영국 자동차 협회 (1998)
  자동차 + 항공 + 의료 + 산업 채택
  
Rule 분류:
  Mandatory — 절대 위반 금지
  Required — 위반 시 deviation 필요
  Advisory — 권장
  
Total — 175+ rules
  
대표 rule:
  Rule 17.7: Return value 사용 또는 (void) 캐스트
  Rule 21.3: malloc·free 금지
  Rule 11.X: Pointer cast 제한
  Rule 10.X: Implicit type conversion 금지
  Rule 18.4: Pointer arithmetic 제한
```

자동차에 시작했지만 *항공·우주에도 광범위 채택*.

## MISRA C 예시

```c
// Rule 17.7: Return value 사용 or 명시적 무시
int result = read(fd, buf, len);   // OK
(void)printf("debug\n");           // OK (explicit ignore)
printf("debug\n");                 // ⚠️ violation

// Rule 21.3: malloc 금지
char *p = malloc(100);             // ⚠️ violation
char buf[100];                     // OK

// Rule 10.1: Implicit conversion 금지
int a = 100;
unsigned int b;
b = a;                             // ⚠️ violation
b = (unsigned int)a;               // OK

// Rule 11.3: Pointer cast 제한
int *pi;
float *pf = (float*)pi;            // ⚠️ violation
```

C 함정 — *컴파일러 silent acceptance*. MISRA가 강제 catch.

## CERT C — 보안 중심

```text
CERT C Coding Standard:
  Origin — CERT/CC (Carnegie Mellon SEI)
  *Security* vulnerability 방지
  
Rule 분류:
  Rules — 위반 시 명백한 보안 hole
  Recommendations — best practice
  
영역:
  Preprocessor (PRE)
  Declarations·Initialization (DCL)
  Expressions (EXP)
  Integers (INT)
  Strings (STR)
  Memory Management (MEM)
  Concurrency (CON)
  Error Handling (ERR)
  
대표 rule:
  STR31-C: Null-terminate 보장
  INT30-C: Unsigned overflow 회피
  MEM30-C: free 후 access 금지
```

MISRA가 *안전성*, CERT가 *보안성*. 둘 다 사용 보통.

## CERT C 예시

```c
// STR31-C: Buffer overflow 회피
char dst[10];
strncpy(dst, src, sizeof(dst));
dst[sizeof(dst)-1] = '\0';   // null-terminate

// INT30-C: Unsigned wrap-around 방지
unsigned int a = 4000000000;
if (a + 100 < a) {           // overflow check
    // error
}

// MEM30-C: Use-after-free 방지
char *p = malloc(100);
free(p);
*p = 'A';                    // ⚠️ violation
p = NULL;                    // OK practice
```

CERT C — *공격 vector 분석*. 항공·우주에 security 측면 추가.

## C++ 표준 — JSF C++ 2005

```text
JSF (Joint Strike Fighter) C++ Coding Standard:
  Origin — Lockheed Martin F-35 program (2005)
  Major C++ subset for safety-critical
  
주요 결정:
  - No exception
  - No RTTI (typeid·dynamic_cast)
  - No multiple inheritance (1 + interface OK)
  - No virtual base class (diamond)
  - No template (제한적, 후속 versions 완화)
  - No dynamic memory after init
  - No new·delete in critical paths
  - Initializer list 사용
  - const correctness
  
221 rules · 78 should · 119 will · 24 may
```

C++의 *안전 영역만*. RTOS·실시간·결정성·analysis.

## JSF C++ 2005 예시

```cpp
// AV Rule 60: No exception in safety-critical
void compute() noexcept;     // OK

// AV Rule 88: No multiple inheritance
class A : public B, public C {};   // ⚠️ violation
class A : public B {};              // OK
class A : public IInterface {};     // OK (interface)

// AV Rule 184: No RTTI
typeid(obj);                 // ⚠️ violation
dynamic_cast<Derived*>(p);   // ⚠️ violation

// AV Rule 206: Initializer list 사용
class Object {
public:
    Object() : value(0) {}   // OK
    // 회피
    Object() { value = 0; }  // ⚠️ violation
};
```

F-35 — JSF C++. Boeing·Airbus — *Ada·MISRA C* 위주.

## AUTOSAR C++14·MISRA C++ 2023

```text
AUTOSAR C++14 (2017):
  자동차 SW (ISO 26262)
  ASIL-D 충족
  C++14 + 안전 subset
  
MISRA C++ 2023:
  AUTOSAR C++14 + MISRA C++ 2008 통합
  JSF C++의 modern 후속
  C++17 일부 허용
  
주요 변화:
  - constexpr 활용
  - auto 제한적 사용
  - Move semantics 가능
  - std::optional·variant
  - 일부 template 가능
```

차세대 — *MISRA C++ 2023* — 자동차·항공·우주 통합 추세.

## 코딩 표준 비교

```text
표준        주력 영역       Style              C/C++   year
MISRA C    safety          conservative        C       2023
CERT C     security        defensive           C       2016+
JSF C++    safety          C++03 subset        C++     2005
AUTOSAR    automotive      C++14 subset        C++     2017
MISRA C++  safety          C++17 subset        C++     2023
HIC++      legacy          general guidelines  C++     2013
CERT C++   security        defensive           C++     2016+
```

선택 — *도메인·언어·certification authority*.

## Naming Convention

```text
Standard convention (typical):

Variables:
  snake_case   - MISRA·CERT·Linux kernel
  camelCase    - JSF C++·AUTOSAR
  
Functions:
  snake_case 또는 camelCase
  Prefix module/system
    avionics_compute_attitude()
    AvionicsComputeAttitude()
    
Constants·macros:
  UPPER_SNAKE_CASE
  MAX_BUFFER_SIZE
  PI_FLOAT
  
Types:
  typedef ... my_type_t      (C)
  class MyType               (C++)
  
Files:
  module_subsystem.c|h
  ModuleSubsystem.cpp|hpp
```

일관성 — *coding standard에 명시*.

## Comment·Header Standard

```c
/**
 * @file       altitude_filter.c
 * @brief      Altitude estimation using Kalman filter
 * @author     [Name]
 * @date       2026-05-19
 * @version    1.2.3
 * @copyright  [Copyright notice]
 *
 * Requirements:
 *   HLR-AVIONICS-ALT-0001
 *   LLR-AVIONICS-ALT-0042
 *
 * Verification:
 *   TC-ALT-001 to TC-ALT-015
 */

/**
 * @brief Update altitude estimate with new measurement
 *
 * @param[in,out] state   Filter state (mutable)
 * @param[in]     meas    Latest measurement
 * @return    0 on success, -EINVAL on invalid input
 *
 * @pre  state != NULL
 * @post state->altitude updated
 */
int alt_filter_update(alt_state_t *state, const alt_meas_t *meas);
```

각 *function·module*에 표준 header. Traceability·verification 정보 포함.

## Static Analyzer Tools

```text
MISRA C·CERT C:
  - Polyspace (MathWorks) — formal verification
  - Coverity (Synopsys) — semantic analysis
  - PC-lint Plus — classic
  - LDRA Testbed — coverage·MISRA
  - Klocwork — IDE integration
  - cppcheck — open source
  - clang-tidy + MISRA checker — modern
  
JSF C++·AUTOSAR C++14·MISRA C++:
  - Polyspace C++
  - Coverity C++
  - LDRA C++
  - AXIVION (Bauhaus Suite)
  - clang-tidy + plugins
  
Coverage·formal:
  - Astrée — abstract interpretation
  - SPARK (Ada) — formal proof
  - Frama-C — C analysis framework
```

각 tool — *DO-330 qualification 필요*. 다음 챕터.

## Tool Output 예

```text
$ polyspace-bug-finder code.c

altitude.c:42:5: MISRA-2023 Rule 17.7 (required)
    The value returned by 'read()' must be used or 
    explicitly cast to void.

altitude.c:78:9: CERT-C MEM30-C
    Pointer 'p' is dereferenced after free()

altitude.c:112:13: MISRA-2023 Rule 21.3 (required)
    Use of malloc() — dynamic allocation not allowed
```

각 violation — *severity·rule·location·suggestion*.

## Manual Code Review

```text
Static analyzer만으로 부족:
  - 알고리즘 적절성
  - Architecture 준수
  - Comment 정확성
  - Naming 적절성
  - Error handling 일관성
  - Performance·readability

Review process:
  1. Author 자가 review
  2. Peer review (1+ reviewer)
  3. Lead review (architecture·convention)
  4. QA review (process 준수)
  
산출물 — review record (date·reviewers·issues·resolution)
```

DO-178C — *manual review + static analysis* 결합.

## Korean Application

```text
방사청 SW 신뢰성시험 (한국 방산):
  필수 — *코딩 표준 명시 + 준수 evidence*
  대표:
    MISRA C (자동차·방산)
    한국 자체 standard 보완
    KARI 자체 C standard (KSLV-II)
  Tool — Coverity·Polyspace 도입 추세
  
KARI Flight SW:
  KSLV-II:
    C language
    Custom subset based on MISRA C
    Internal review process
    
한화에어로스페이스·LIG넥스원:
  자체 + MISRA C
  AUTOSAR C++ 일부 (자동차 분리)
```

한국 — *MISRA C 위주*. JSF C++ 직접 채택은 드뭄.

## C++ 의 부상 — Modern Safety-Critical

```text
2000년대 — Ada·C 위주
2010년대 — C++03·11 일부 채택
2020년대 — C++14·17·20 safety subset
  
이유:
  - Performance 동등
  - Abstraction (RAII·smart pointer)
  - constexpr (compile-time computation)
  - Template (zero-cost generic)
  - Type safety
  
F-35 — JSF C++ 2005
JWST·Mars Rover — C++ + safety subset
SpaceX Dragon·Starlink — C++ heavy
Boeing 787·Airbus A350 — Ada·C 위주 (legacy)
NASA Orion·SLS — C++ 채택
```

차세대 — *Modern C++ + safety subset*. AUTOSAR·MISRA C++ 2023.

## Coding Standard Sample

```text
Project SCS sample (요약):

1. Language
   C++17 (-std=c++17)
   GCC 11.3.0 cross-compiler
   
2. Subset
   MISRA C++ 2023 + AUTOSAR C++14 (no conflict)
   
3. Forbidden
   - new·delete (dynamic memory after init)
   - exception (compile -fno-exceptions)
   - RTTI (compile -fno-rtti)
   - virtual inheritance (diamond)
   - Multiple inheritance (1 base + interface OK)
   - Recursive function (stack analysis)
   - goto
   
4. Required
   - const correctness
   - constexpr 적극 활용
   - RAII
   - Initializer list
   - override·final specifier
   - Static analysis (Polyspace + clang-tidy)
   
5. Naming
   namespace::ClassName::method_name()
   variable_name
   CONSTANT_NAME
   
6. Comment
   Doxygen header per file·function
   Traceability tag (HLR·LLR·TC)
```

## 자주 하는 실수

> ⚠️ MISRA "준수"라고만 명시, *어느 version* 미명시

```text
"MISRA C 준수" → audit 시 어느 version?
→ MISRA C:2012 vs 2023 차이 있음
```

→ Plan에 *명확한 version + amendment level*.

> ⚠️ Static analyzer만 신뢰

```text
Polyspace pass → "안전하다"
→ 분석 한계 (path explosion·undefined call)
→ Algorithmic 결함 catch 불가
```

→ Static analysis + *manual review + test*.

> ⚠️ Tool deviation report 미관리

```text
Static analyzer가 false positive 100건
→ "모두 무시"
→ 진짜 violation 묻힘
```

→ Each deviation — *review·document·justify*.

> ⚠️ C++ subset 무리 적용

```text
C++03 subset → C++17 코드와 혼재
→ Compile fail
→ Subset rule 모순
```

→ *Single language version*.

## 정리

- **MISRA C 2023** — safety, 가장 광범위.
- **CERT C** — security, 보완.
- **JSF C++ 2005** — F-35, 첫 C++ safety standard.
- **AUTOSAR C++14 / MISRA C++ 2023** — modern subset.
- 각 표준 — *plan에 version·amendment 명시*.
- Static analyzer + manual review *결합*.
- 한국 — *MISRA C* 위주, *KARI custom* 일부.
- Tool은 다음 챕터 *DO-330 qualification*.

다음 편은 **Verification — Reviews·Analyses·Testing**.

## 관련 항목

- [Ch 5: Design](/blog/embedded/avionics/developing-safety-critical/chapter05-design)
- [Ch 7: Verification](/blog/embedded/avionics/developing-safety-critical/chapter07-verification)
- [Embedded Automotive — MISRA C](/blog/embedded/automotive/misra-c)
- [Embedded Automotive — CERT C](/blog/embedded/automotive/cert-c)
