---
title: "Ch 11: AUTOSAR C++14, MISRA C++:2008/2023과의 비교"
date: 2025-09-30T12:00:00
description: "JSF C++ → MISRA C++:2008 → AUTOSAR C++14 → MISRA C++:2023 진화. 규칙 mapping, 차이점, modern 적용 가이드."
tags: [jsf-cpp, autosar, misra-cpp, comparison, mapping, evolution]
series: "JSF C++"
seriesOrder: 11
draft: false
---

JSF C++ (2005)가 *modern aerospace C++의 출발점*. *15년에 걸쳐* MISRA C++:2008 → AUTOSAR C++14 → MISRA C++:2023으로 *진화*. 이 장은 *각 표준의 차이·rule mapping·migration 가이드*까지.

## 표준 진화 — Timeline

```
1998: C++98 표준 발행
2003: C++03 (minor revision)

2005: JSF C++ (Lockheed Martin) — F-35용
  - C++03 기반
  - 240+ rules
  - 항공 산업의 첫 modern C++ 표준

2008: MISRA C++:2008 (MISRA)
  - C++03 기반
  - 228 rules
  - 자동차 (MISRA C의 C++ 확장)
  - JSF C++의 영향 강함

2011: C++11 표준
2014: C++14 표준

2017: AUTOSAR C++14 (AUTOSAR consortium)
  - C++14 기반
  - 340+ rules
  - 자동차 (BMW, Bosch, Continental 주도)
  - JSF + MISRA C++:2008 → modern C++로 진화

2017: C++17
2020: C++20

2023: MISRA C++:2023 (MISRA)
  - C++17 기반
  - AUTOSAR + MISRA C++:2008 통합
  - 새로운 시작 (numbering reset)
  - 항공·자동차·우주 통합 표준
```

JSF가 *원조*. 모든 후세 표준이 *JSF 정신 + modern C++*.

## 규칙 수 비교

```
JSF C++ (2005)        : ~240 rules
MISRA C++:2008        : 228 rules
AUTOSAR C++14         : ~340 rules
MISRA C++:2023        : ~180 rules (재구조화)
```

MISRA C++:2023이 *적은 수*. *consolidation + clarity*.

## 강제도 분류 비교

```
JSF C++:
  Will        : MUST follow (~30개)
  Shall       : MUST follow with deviation procedure (~150개)
  Should      : SHOULD follow (~60개)
  Will not    : MUST NOT (~10개)

MISRA C++:2008:
  Required    : MUST follow (deviation 가능)
  Advisory    : SHOULD follow
  Document    : 문서화 의무

AUTOSAR C++14:
  Required    : MUST follow
  Advisory    : SHOULD follow
  Document    : 문서화

MISRA C++:2023:
  Mandatory   : 100% (no deviation)
  Required    : 사실상 의무 (deviation 까다로움)
  Advisory    : 권장
```

MISRA C++:2023이 *MISRA C 스타일 (Mandatory 추가)*. *엄격도 명확*.

## 표준별 *대표 규칙* 비교

### Exception 처리

```
JSF C++ (AV Rule 196):
  Will not — Exceptions shall not be used.
  → 완전 금지

MISRA C++:2008 (Rule 15-x):
  Required — Exceptions shall only be used for error handling.
  → 회피 강하게 권장, 사용 시 제약

AUTOSAR C++14 (A15-x):
  Required — Exceptions used per project policy
  → 프로젝트 차원 결정 (대부분 -fno-exceptions)

MISRA C++:2023:
  Recommendation 회피
  → 자동차 + 항공 모두 회피
```

JSF가 *가장 strict*. 후세 표준이 *조금 완화*했지만 *여전히 회피*.

### Dynamic Memory

```
JSF C++ (Rule 206):
  Should — new/delete를 init phase에 한정
  
MISRA C++:2008 (Rule 18-x):
  Required — new/delete 사용 시 제약 다수
  
AUTOSAR C++14 (A18-5-x):
  Required — std::make_unique 권장 (raw new 회피)
  Smart pointer 강조
  
MISRA C++:2023:
  Required — Modern memory management
  RAII 의무
```

JSF *raw new/delete*. AUTOSAR/MISRA C++:2023이 *smart pointer 도입*.

### Class Inheritance

```
JSF C++ (Rule 88):
  Should — Multiple inheritance interface only
  
MISRA C++:2008:
  Required — 같은 규칙
  
AUTOSAR C++14:
  Required — interface 외에는 회피
  Final 키워드 활용 권장
  
MISRA C++:2023:
  Required — final, override 의무
  Modern C++ feature 활용
```

기본 정신 동일. *modern keyword (override, final) 활용 차이*.

### RTTI

```
JSF C++ (Rule 96-97):
  Will not — typeid/dynamic_cast 완전 금지

MISRA C++:2008:
  Required — dynamic_cast 회피 권장
  typeid 회피

AUTOSAR C++14:
  Advisory — dynamic_cast 회피
  단 특정 상황 허용 (visitor 등)

MISRA C++:2023:
  유사
```

JSF가 *완전 금지*. 후세 표준이 *조금 유연*.

## Rule Mapping Table

핵심 규칙의 *표준별 매핑*:

```
=== Rule Mapping ===

Topic                         JSF       MISRA08    AUTOSAR14   MISRA23
─────────────────────────────────────────────────────────────────────
Function size limit            Rule 1    -          -            -
                              (200)     (no max)   (project)    (project)

Cyclomatic complexity          Rule 3    -          -            -
                              (≤20)     (no max)   (no max)     (no max)

No goto                        Rule 96   Rule 6-6   A6-6-1       Rule 9.6.x
                                                                  (Required)

No setjmp/longjmp              Rule 174  Rule 17-x  A15-x        Rule 21.x
                              (Will not)            (Required)

No varargs                     Rule 180  Rule 8-4   A8-4-x       -
                                                                  (Mandatory)

No exceptions                  Rule 196  Rule 15-x  A15-x        Recommendation
                              (Will not) (Required) (Required)

No recursion                   Rule 179  Rule 7-x   A7-5-2       Rule 7.x
                              (Will)     (Required) (Required)

new/delete init only           Rule 206  -          A18-5-x      Required
                              (Should)              (Required)

Multiple inheritance limit     Rule 88   Rule 10-x  A10-x        Rule 13.x
                              (Should)   (Required) (Required)

No RTTI                        Rule 96-97 Rule 5-2-x A5-2-x      Required
                              (Will not) (Required) (Advisory)

No public data in class        Rule 67   Rule 11-x  A11-x        Rule 17.x
                              (Should)   (Required) (Required)

No friend                      Rule 89   -          A11-x        Required
                              (Should)              (Required)

const correctness              Rule 70   Rule 7-x   A7-1-x       Required
                              (Should)   (Required) (Required)

Virtual destructor             Rule 79   Rule 12-x  A12-4-x      Required
                              (Will)     (Required) (Required)

C-style cast forbidden         Rule 156  Rule 5-2-x A5-2-x       Required
                              (Will)     (Required) (Required)
```

## 자세한 비교 — Exception

### JSF C++ (Rule 196)

```cpp
// 100% 금지
// 컴파일러 옵션: -fno-exceptions
// 시도하면 컴파일 에러

// Alternative: return code
ErrorCode DoWork() {
    if (error) return ERROR_FAIL;
    return SUCCESS;
}
```

### MISRA C++:2008 (Rule 15-x)

```cpp
// 회피 권장 (필요 시 사용 가능 with constraints)
// Exception 사용 시:
// - Standard exception class만 throw
// - try block 단순화
// - catch 순서 정확 (specific first)

// 예 (allowed)
try {
    Process();
} catch (const std::out_of_range &e) {
    LogError(e.what());
}
```

### AUTOSAR C++14 (A15-x)

```cpp
// 프로젝트 정책에 따라
// 자동차 시장: 대부분 -fno-exceptions
// 단 일부 partition (less critical)는 exception 사용

// Allowed pattern:
class CFlightException : public std::runtime_error {
public:
    explicit CFlightException(const std::string &msg)
        : std::runtime_error(msg) {}
};
```

### MISRA C++:2023

```cpp
// Recommendation 회피
// std::expected 권장 (C++23)

#include <expected>

std::expected<Result, ErrorCode> ProcessData(const Data &input) {
    if (!input.IsValid()) {
        return std::unexpected(ERROR_INVALID);
    }
    return Result{/* ... */};
}

// 호출
auto r = ProcessData(d);
if (r) {
    Use(*r);
} else {
    HandleError(r.error());
}
```

진화: *exception 금지 → 회피 → modern alternative (std::expected)*.

## 자세한 비교 — Smart Pointer

### JSF C++ (raw pointer)

```cpp
// Raw pointer, manual lifecycle
class CFlightController {
public:
    int Initialize() {
        m_pSensor = new CSensor();  // init phase
        if (m_pSensor == NULL) return ERROR_MEMORY;
        return SUCCESS;
    }
    
    ~CFlightController() {
        delete m_pSensor;
        m_pSensor = NULL;
    }

private:
    CSensor *m_pSensor;
    
    CFlightController(const CFlightController &);
    CFlightController& operator=(const CFlightController &);
};
```

### AUTOSAR C++14 (smart pointer)

```cpp
// std::unique_ptr (single ownership)
class FlightController {
public:
    FlightController() : sensor_(std::make_unique<Sensor>()) {}
    
    // Copy 자동 deleted (unique_ptr이 non-copyable)
    
private:
    std::unique_ptr<Sensor> sensor_;
};
```

### MISRA C++:2023

```cpp
// Smart pointer 의무
// std::unique_ptr 우선
// std::shared_ptr는 *진정 공유* 시만

class FlightController {
public:
    explicit FlightController(std::unique_ptr<Sensor> sensor)
        : sensor_(std::move(sensor)) {}

private:
    std::unique_ptr<Sensor> sensor_;
};
```

진화: *raw pointer → smart pointer 권장 → smart pointer 의무*.

## 자세한 비교 — Modern C++ Feature

### `auto` keyword

```
JSF C++ (C++03):  사용 불가 (C++11+)
MISRA C++:2008:    사용 불가
AUTOSAR C++14:     Advisory 회피 (가독성)
MISRA C++:2023:    명확할 때만 사용
```

```cpp
// AUTOSAR: 회피
auto x = SomeFunction();  // x 타입 불명확

// MISRA C++:2023: OK if obvious
auto it = container.begin();  // iterator 명확
auto p = std::make_unique<Foo>();  // 타입 명확
```

### Range-based `for`

```
JSF C++ (C++03):  사용 불가
MISRA C++:2008:    사용 불가
AUTOSAR C++14:     권장
MISRA C++:2023:    의무화 (가능 시)
```

```cpp
// Old (C++03)
for (std::vector<int>::iterator it = v.begin(); it != v.end(); ++it) {
    process(*it);
}

// New (C++11+)
for (auto &item : v) {
    process(item);
}
```

### `enum class`

```
JSF C++ (C++03):  사용 불가 (E prefix workaround)
MISRA C++:2008:    사용 불가
AUTOSAR C++14:     권장 (unscoped enum 회피)
MISRA C++:2023:    의무화
```

```cpp
// Old JSF
enum EColor {
    COLOR_RED,
    COLOR_GREEN,
    COLOR_BLUE,
    COLOR_MAX = 0x7FFFFFFF
};

// Modern
enum class Color : std::uint8_t {
    Red,
    Green,
    Blue
};
```

### Lambda

```
JSF C++ (C++03):  사용 불가
MISRA C++:2008:    사용 불가
AUTOSAR C++14:     사용 가능 (단 capture by reference 신중)
MISRA C++:2023:    광범위 사용
```

```cpp
// AUTOSAR/MISRA C++:2023
auto IsPositive = [](int x) { return x > 0; };

std::vector<int> v = {1, -2, 3, -4};
auto count = std::count_if(v.begin(), v.end(), IsPositive);
```

### `constexpr`

```
JSF C++ (C++03):  사용 불가
MISRA C++:2008:    사용 불가
AUTOSAR C++14:     광범위 권장
MISRA C++:2023:    의무화 (가능 시)
```

```cpp
// Modern
constexpr int Factorial(int n) {
    int result = 1;
    for (int i = 2; i <= n; ++i) result *= i;
    return result;
}

constexpr int kF5 = Factorial(5);  // compile-time
```

### `nullptr`

```
JSF C++ (C++03):  사용 불가 (NULL 또는 0)
MISRA C++:2008:    사용 불가
AUTOSAR C++14:     의무화 (NULL/0 회피)
MISRA C++:2023:    의무화
```

```cpp
// Old JSF
CFoo *p = NULL;
if (p != NULL) { /* ... */ }

// Modern
Foo* p = nullptr;
if (p != nullptr) { /* ... */ }
```

## Naming Convention 비교

```
JSF C++:
  Class:           CFoo (C prefix)
  Interface:       IFoo (I prefix)
  Enum:            EColor (E prefix)
  Member:          m_value, m_pName (m_ + p_)
  Static:          s_count
  Parameter:       p_input
  Local:           l_temp
  Template:        TFoo (T prefix)

MISRA C++:2008:
  명시 안 함 (프로젝트 자체)
  Hungarian 회피 권장

AUTOSAR C++14:
  명시 안 함 (프로젝트 자체)
  Hungarian 회피 권장

MISRA C++:2023:
  Modern style
  Hungarian-like 회피
  trailing underscore_ 또는 m_ 모두 가능
```

JSF만 *Hungarian-like 강제*. 후세 표준은 *유연*.

## Tool Support 비교

```
도구            JSF C++   MISRA08   AUTOSAR14   MISRA23
─────────────────────────────────────────────────────
Helix QAC         ✓        ✓         ✓           ✓
LDRA Testbed      ✓        ✓         ✓           ✓
Polyspace         ✓        ✓         ✓           ✓
Coverity          ✓        ✓         ✓           ✓
clang-tidy        부분     부분       부분 (cppcoreguidelines)  부분
SonarQube         부분     부분       부분        부분
```

상용 도구가 *모든 표준 지원*. *clang-tidy는 부분 지원* (CppCoreGuidelines가 AUTOSAR/MISRA C++:2023과 가까움).

## 코드 비교 — 같은 기능 다른 스타일

### Task: 50 Hz 비행 제어 loop

#### JSF C++ (2005)

```cpp
// flight_control.h (JSF C++)
#ifndef FLIGHT_CONTROL_H
#define FLIGHT_CONTROL_H

#include "sensor.h"
#include "actuator.h"

class CFlightController {
public:
    explicit CFlightController(ISensor *p_pSensor,
                                IActuator *p_pActuator);
    ~CFlightController();
    
    int Initialize();
    int Step();
    int SetMode(EFlightMode p_eMode);
    EFlightMode GetMode() const;

private:
    // No copy
    CFlightController(const CFlightController &);
    CFlightController& operator=(const CFlightController &);
    
    int UpdateControlLaw();
    
    ISensor   *m_pSensor;
    IActuator *m_pActuator;
    EFlightMode m_eMode;
    float m_targetAltitude;
    
    static const int MAX_HISTORY = 10;
    float m_altitudeHistory[MAX_HISTORY];
    int m_historyIndex;
};

#endif // FLIGHT_CONTROL_H
```

```cpp
// flight_control.cpp (JSF C++)
#include "flight_control.h"

CFlightController::CFlightController(ISensor *p_pSensor,
                                      IActuator *p_pActuator)
    : m_pSensor(p_pSensor)
    , m_pActuator(p_pActuator)
    , m_eMode(MODE_MANUAL)
    , m_targetAltitude(0.0F)
    , m_historyIndex(0)
{
    for (int i = 0; i < MAX_HISTORY; i++) {
        m_altitudeHistory[i] = 0.0F;
    }
}

CFlightController::~CFlightController()
{
    // Pointers not owned (composition)
}

int CFlightController::Step()
{
    int l_altitude;
    int l_rc = m_pSensor->Read(&l_altitude);
    if (l_rc != SUCCESS) return l_rc;
    
    m_altitudeHistory[m_historyIndex] = static_cast<float>(l_altitude);
    m_historyIndex = (m_historyIndex + 1) % MAX_HISTORY;
    
    l_rc = UpdateControlLaw();
    if (l_rc != SUCCESS) return l_rc;
    
    return SUCCESS;
}
```

#### AUTOSAR C++14 (2017)

```cpp
// flight_control.hpp
#pragma once

#include <array>
#include <memory>
#include "sensor.hpp"
#include "actuator.hpp"

namespace flight {

enum class FlightMode {
    Manual,
    HeadingHold,
    AltitudeHold,
    Nav
};

class FlightController final {
public:
    FlightController(std::shared_ptr<ISensor> sensor,
                     std::shared_ptr<IActuator> actuator) noexcept;
    
    // Rule of zero (defaults OK)
    
    bool Initialize() noexcept;
    bool Step() noexcept;
    void SetMode(FlightMode mode) noexcept { mode_ = mode; }
    FlightMode GetMode() const noexcept { return mode_; }

private:
    bool UpdateControlLaw() noexcept;
    
    std::shared_ptr<ISensor> sensor_;
    std::shared_ptr<IActuator> actuator_;
    FlightMode mode_{FlightMode::Manual};
    float target_altitude_{0.0F};
    
    static constexpr std::size_t kMaxHistory = 10;
    std::array<float, kMaxHistory> altitude_history_{};
    std::size_t history_index_{0};
};

}  // namespace flight
```

```cpp
// flight_control.cpp
#include "flight_control.hpp"
#include <algorithm>

namespace flight {

FlightController::FlightController(std::shared_ptr<ISensor> sensor,
                                    std::shared_ptr<IActuator> actuator) noexcept
    : sensor_{std::move(sensor)}
    , actuator_{std::move(actuator)} {}

bool FlightController::Step() noexcept {
    auto altitude = sensor_->Read();
    if (!altitude) return false;
    
    altitude_history_[history_index_] = static_cast<float>(*altitude);
    history_index_ = (history_index_ + 1) % kMaxHistory;
    
    return UpdateControlLaw();
}

}  // namespace flight
```

#### MISRA C++:2023 (2023)

```cpp
// flight_control.hpp
#pragma once

#include <array>
#include <expected>
#include <memory>
#include "sensor.hpp"
#include "actuator.hpp"

namespace flight {

enum class FlightMode : std::uint8_t {
    Manual,
    HeadingHold,
    AltitudeHold,
    Nav
};

enum class Error : std::int32_t {
    Ok = 0,
    SensorRead = -1,
    ControlLaw = -2,
};

class FlightController final {
public:
    FlightController(std::unique_ptr<ISensor> sensor,
                     std::unique_ptr<IActuator> actuator) noexcept;
    
    [[nodiscard]] std::expected<void, Error> Initialize() noexcept;
    [[nodiscard]] std::expected<void, Error> Step() noexcept;
    
    void SetMode(FlightMode mode) noexcept { mode_ = mode; }
    [[nodiscard]] FlightMode GetMode() const noexcept { return mode_; }

private:
    [[nodiscard]] std::expected<void, Error> UpdateControlLaw() noexcept;
    
    std::unique_ptr<ISensor> sensor_;
    std::unique_ptr<IActuator> actuator_;
    FlightMode mode_{FlightMode::Manual};
    float target_altitude_{0.0F};
    
    static constexpr std::size_t kMaxHistory = 10U;
    std::array<float, kMaxHistory> altitude_history_{};
    std::size_t history_index_{0U};
};

}  // namespace flight
```

```cpp
// flight_control.cpp
#include "flight_control.hpp"
#include <algorithm>

namespace flight {

FlightController::FlightController(std::unique_ptr<ISensor> sensor,
                                    std::unique_ptr<IActuator> actuator) noexcept
    : sensor_{std::move(sensor)}
    , actuator_{std::move(actuator)} {}

[[nodiscard]]
std::expected<void, Error> FlightController::Step() noexcept {
    auto altitude_result = sensor_->Read();
    if (!altitude_result) {
        return std::unexpected(Error::SensorRead);
    }
    
    altitude_history_[history_index_] = static_cast<float>(*altitude_result);
    history_index_ = (history_index_ + 1U) % kMaxHistory;
    
    return UpdateControlLaw();
}

}  // namespace flight
```

차이 정리:

```
JSF C++ → AUTOSAR C++14 → MISRA C++:2023:

raw pointer       → shared_ptr        → unique_ptr (move)
EFlightMode       → enum class        → enum class with underlying type
int return code   → bool noexcept     → std::expected<void, Error>
m_/p_ prefix      → trailing _         → trailing _ + namespace
MAX_HISTORY       → kMaxHistory       → kMaxHistory (constexpr)
#include guard    → #pragma once      → #pragma once
{} init           → {} init           → {} init + [[nodiscard]]
Hungarian         → no                → no
```

15+ 년 진화. *기본 정신 동일 (encapsulation, deterministic)*. *Syntax + idiom 진화*.

## Migration Cost

```
JSF C++ → AUTOSAR C++14 migration:

Code base size: ~1M LoC
Engineers: 50

Estimated effort:
  Manual conversion:        30 person-years
  Tool-assisted:            15 person-years
  Testing/verification:     20 person-years
  Re-qualification:         10 person-years
  Total:                    ~75 person-years

Cost: ~$15M (at $200k/person-year)

ROI:
  Maintainability:          50% improvement
  Bug rate:                 30% reduction
  New developer onboarding: 40% faster

Decision factors:
  - Legacy maintenance cost vs migration cost
  - Mission lifetime remaining
  - Future developer pool (JSF specialist 부족)
```

F-35 (25M LoC)는 *마이그레이션 cost 너무 큼*. *JSF style 유지*.

KF-21 같은 *새 프로젝트*는 *처음부터 modern style 채택* 가능.

## 실용 — 어느 표준 선택?

```
=== 표준 선택 가이드 ===

새 항공 프로젝트:
  - 큰 mission (F-35 급):
    MISRA C++:2023 권장
    또는 AUTOSAR C++14 (성숙 도구)
    JSF C++는 *legacy continuation*에만

  - 중간 mission (KF-21 급):
    MISRA C++:2023 또는 AUTOSAR C++14
    JSF의 strict policy 일부 차용 (RAII, encapsulation)

  - 작은 mission (drone, small UAV):
    MISRA C++:2023 lite
    또는 자체 표준

자동차:
  - 차세대 (2025+): MISRA C++:2023
  - 현재 양산: AUTOSAR C++14
  - 일부 legacy: MISRA C++:2008

우주:
  - ESA missions: ECSS coding (자체 + MISRA 참고)
  - NASA: 자체 (JPL Power of 10) + MISRA
  - 신생 우주: lite version

군 (한국):
  - JSF C++ (F-35 FACO related)
  - 자체 표준 (KF-21)
  - 향후: MISRA C++:2023으로 통일?
```

## 한국 산업 — 실제 채택

```
회사            현재 표준
─────────────────────────────────────
KAI (KF-21)      자체 + MISRA (modern style)
KAI (T-50/F-X)   자체 + JSF 영향 (legacy)
KAI (F-35 FACO)  JSF C++ (Lockheed 강제)

Hyundai/Kia      AUTOSAR C++14
Hanwha (군)      자체 (DoD + MISRA)
LIG Nex1         자체 (DoD + MISRA)

KARI (위성)      C 위주 (MISRA C)
                 일부 C++ (자체 표준)
KARI (누리호)     C 위주

신생 우주        Lightweight (MISRA C lite)
신생 자동차      AUTOSAR C++14 (스타트업도)
```

한국 산업이 *상당히 다양*. *정통 JSF C++ 사용은 KAI F-35 FACO 한정*.

## 미래 — Convergence

```
2025+ 예상 변화:

1. MISRA C++:2023이 *통합 표준*
   - 자동차 + 항공 모두 채택
   - JSF/AUTOSAR/MISRA08 → MISRA23 마이그레이션

2. Modern C++ 광범위 채택
   - C++17/20 features 광범위
   - constexpr, concepts, ranges 광범위
   - Coroutines (제한적)

3. AI/ML 통합 표준
   - DO-178D (가칭) for ML
   - ASIL ML
   - 검토 중

4. Memory safety
   - Static analysis 강화
   - Pointer safety (lifetime annotation)
   - Rust 영향 (single ownership)

5. Tool 진화
   - clang-tidy 표준 도구화
   - Cloud-based verification farm
   - AI-assisted code review
```

15년 후 *MISRA C++:2023이 dominant*. JSF/AUTOSAR/MISRA08는 *legacy 위주*.

## KF-21 적용 추천 — Modern Approach

```cpp
// KF-21 권장 stack (assumed):

표준: MISRA C++:2023 + 자체 추가 rule
컴파일러: GCC 12+ 또는 Clang 16+ (C++17/20)
RTOS: VxWorks (qualified) 또는 RTEMS
도구:
  - Helix QAC (MISRA C++:2023)
  - Polyspace Bug Finder
  - LDRA Testbed (MC/DC)
  - VectorCAST (test + coverage)
  - SonarQube (modern style)

Coding style:
  - snake_case_ for members
  - PascalCase for class
  - smart pointers
  - constexpr 광범위
  - std::expected for errors
  - Range-based for
  - enum class
  - Concepts (선택적)
```

이런 *modern stack*이 *F-35의 next generation*.

## Cheat Sheet — 표준별 차이

```
| Feature           | JSF        | MISRA08    | AUTOSAR14   | MISRA23     |
|-------------------|------------|------------|-------------|-------------|
| C++ standard      | C++03      | C++03      | C++14       | C++17       |
| Exception         | Banned     | Restricted | Project     | Discouraged |
| RTTI              | Banned     | Restricted | Restricted  | Restricted  |
| new/delete        | Init only  | Restricted | unique_ptr  | unique_ptr  |
| Multi-inheritance | Interface  | Interface  | Interface   | Interface   |
| Virtual dtor      | Required   | Required   | Required    | Required    |
| C-style cast      | Banned     | Banned     | Banned      | Banned      |
| const             | Required   | Required   | Required    | Required    |
| Hungarian         | m_, p_, l_ | Optional   | Discouraged | Discouraged |
| auto              | N/A        | N/A        | Allowed     | Allowed     |
| enum class        | N/A        | N/A        | Recommended | Required    |
| nullptr           | N/A        | N/A        | Required    | Required    |
| range-based for   | N/A        | N/A        | Allowed     | Recommended |
| constexpr         | N/A        | N/A        | Recommended | Required    |
| Lambda            | N/A        | N/A        | Allowed     | Allowed     |
| Smart pointers    | N/A        | N/A        | Required    | Required    |
| std::expected     | N/A        | N/A        | N/A         | Recommended |
```

JSF의 *strict 정신*이 *모든 표준에 보존*. *Modern syntax 추가*.

## 정리

- JSF C++ (2005)가 *modern aerospace C++의 출발점*.
- 진화: JSF → MISRA C++:2008 → AUTOSAR C++14 → MISRA C++:2023.
- *기본 정신 동일* (encapsulation, deterministic, RAII).
- *Modern C++ feature 점진 도입* (smart pointer, auto, enum class, lambda).
- *Exception 금지*는 *전 표준 공통* (수준 차이).
- *RTTI 금지*도 공통.
- F-35 = JSF C++ legacy.
- KF-21 = 자체 표준 (modern).
- 한국 자동차 = AUTOSAR C++14.
- 신생 회사 = 자체 lite.
- 미래: MISRA C++:2023이 *통합 표준*.

## 다음 장 예고

12장 (마지막): *Tool Qualification, F-35 사례, 시리즈 마무리*.

## 관련 항목

- [Ch 10 — Exceptions, Memory, Library](/blog/embedded/aerospace-standards/jsf-cpp/chapter10-exceptions-memory-library)
- [Ch 12 — Tools, Certification, 마무리](/blog/embedded/aerospace-standards/jsf-cpp/chapter12-tools-certification)
- [MISRA C++:2008 → C++:2023 진화](https://misra.org.uk/misra-c-plus-plus-2023/)
- [AUTOSAR C++14 전체 시리즈](/blog/embedded/car-standards/autosar-cpp/chapter01-intro)
- [CppCoreGuidelines (MISRA 23 referenced)](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines)
