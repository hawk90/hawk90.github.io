---
title: "Ch 3: Lexical + Naming Conventions (Rule 14-66)"
date: 2025-09-30T04:00:00
description: "JSF C++ Rules 14-66 — 주석, 식별자, Hungarian-like prefix (m_, s_, p_, l_), F-35 코드 명명."
tags: [jsf-cpp, lexical, comments, naming, hungarian, prefix, identifier]
series: "JSF C++"
seriesOrder: 3
draft: false
---

JSF C++ Rule 14-66은 *어휘 + 명명 규칙*. *Hungarian-like prefix* (m_, s_, p_, l_)가 *F-35 코드의 trademark*. 현대 *Modern C++ style*에서는 *deprecated*되지만 *legacy aerospace codebase*에서 흔히 발견. 이 장은 *모든 명명 규칙·이유·비판·진화*까지.

## AV Rule 14-29 — Whitespace + Comments

```
AV Rule 16 (Should)
"Tabs should be avoided."

AV Rule 17 (Will not)
"The literals 'L' and 'l' shall not be used in long type designation
 due to confusion with the digit '1'."
```

```cpp
// 위반
long x = 100l;       // l과 1 헷갈림

// Good
long x = 100L;       // L 사용
```

다른 표준 (MISRA, AUTOSAR)도 동일 — *trivial but important*.

```
AV Rule 18-22 — Whitespace consistency
AV Rule 23-29 — Comment policy
```

### AV Rule 24-26 — Comment Style

```cpp
// AV Rule 24 (Will)
// Use /* */ for block comments
/*
 * This is a multi-line comment.
 * Each line starts with " * ".
 */

// AV Rule 25 (Will)
// Use // for single-line comments
int x = 5;  // single-line comment

// AV Rule 26 (Will)
// Doxygen comments use /** */
/**
 * @brief Brief description.
 *
 * Detailed description.
 *
 * @param[in] x Parameter description.
 * @return Return value description.
 */
int Compute(int x);
```

JSF가 *Doxygen 표준 채택*. 항공계 광범위 사용.

### AV Rule 28 — Avoid Commented-out Code

```cpp
// 위반
void Foo() {
    int x = 5;
    // int old_x = 10;  // 옛 값 — 누가 알겠는가?
    // Bar(old_x);      // 옛 코드
    Bar(x);
}

// Good — VCS가 있다
void Foo() {
    int x = 5;
    Bar(x);
}
```

VCS *Git에 있는 history*가 충분. *commented-out code = noise*.

## AV Rule 30-66 — Naming Conventions

JSF의 *trademark*. *Hungarian-like prefix system*.

### Naming Hierarchy

```
JSF C++ 명명 체계:

Type        : PascalCase (e.g., MyClass)
Function    : PascalCase (e.g., DoWork)
Variable    : camelCase or snake_case
Constant    : SCREAMING_SNAKE
Macro       : SCREAMING_SNAKE

Scope prefix:
  g_         Global
  s_         Static (file-scope)
  m_         Member (class data)
  p_         Pointer
  l_         Local (rare)

Type prefix:
  T          Template parameter (TFoo)
  I          Interface (IDrawable)
  E          Enum (EColor)
```

### AV Rule 47 — Member Variable Prefix

```cpp
class Foo {
public:
    void SetValue(int value);
private:
    int m_value;        // m_ prefix
    int m_count;
    char *m_pBuffer;    // m_p (member pointer)
};
```

`m_` prefix가 *member임을 명시*. `this->`보다 *짧음*.

### AV Rule 48 — Static Variable Prefix

```cpp
// foo.cpp

static int s_initialized = 0;   // s_ prefix
static int s_counter = 0;

void Init() {
    s_initialized = 1;
}
```

`s_`이 *static (file-scope) variable* 표시. *외부 노출 없음*.

### AV Rule 49 — Pointer Prefix

```cpp
class Foo {
private:
    int m_value;
    char *m_pName;     // member pointer (m_p)
    Bar *m_pBar;       // member pointer to Bar
};

void Process(char *p_data, int len) {  // parameter pointer (p_)
    char *l_pTemp = malloc(100);       // local pointer (l_p)
}
```

이중 prefix (m_p, l_p)가 *member + pointer* 또는 *local + pointer* 표시. *Hungarian의 강한 영향*.

### AV Rule 50 — Local Variable Prefix

```cpp
void Process() {
    int l_count = 0;       // local prefix (rare)
    int l_index = 0;
}
```

`l_` prefix는 *덜 흔함*. 보통 *생략하고 그냥 camelCase*.

### AV Rule 51-66 — Identifier Format

```cpp
// AV Rule 51 (Will)
// Class names: PascalCase
class FlightController { /* ... */ };

// AV Rule 52 (Will)
// Method names: PascalCase
class FlightController {
public:
    void EngageAutopilot();   // method PascalCase
    int GetAltitude() const;
};

// AV Rule 53 (Will)
// Local variable: camelCase or snake_case
void Foo() {
    int currentAltitude = 0;
    int target_altitude = 0;  // 양쪽 허용
}

// AV Rule 54 (Will)
// Constant: SCREAMING_SNAKE
const int MAX_ALTITUDE = 40000;
const float DEG_TO_RAD = 0.01745f;

// AV Rule 55 (Will)
// Macro: SCREAMING_SNAKE with prefix
#define JSF_DEBUG 1
#define MAX_BUFFER_SIZE 256

// AV Rule 56 (Will)
// Enum: PascalCase + E prefix (옵션)
enum EColor {
    COLOR_RED,
    COLOR_GREEN,
    COLOR_BLUE
};
```

## Hungarian Notation — 역사와 비판

Hungarian이 *처음에 의도*했던 것:

```
Microsoft (1980s):
  - Simonyi의 Hungarian: 의미 prefix (semantic)
    예: cb for count of bytes
        rw for row
  
  - Apps Hungarian: 응용 의미
        ix for index
        cch for character count

  - Systems Hungarian: type prefix (degenerated)
        iCount, szName, fActive
```

JSF는 *Systems Hungarian 영향* — *type/scope prefix*.

### 비판

```
Modern C++ 관점:
  1. Redundant — type system이 이미 표시
  2. Verbose — m_pBuffer vs buffer
  3. 변경 시 cascade — 타입 바꿈 → prefix 변경
  4. IDE가 이미 보여줌 (hover, color)
  5. 가독성 저하

옹호:
  1. Scope 즉시 명확 (m_, s_, g_)
  2. 큰 codebase 일관성
  3. Legacy 유지
  4. Type 정보 (p_, T)
```

### 현대 표준의 진화

```
JSF C++ (2005):         Hungarian-like (m_, s_, p_)
MISRA C++:2008:          Hungarian 회피 (자동차)
AUTOSAR C++14 (2017):    Hungarian 명시 회피
MISRA C++:2023:          Modern style (no Hungarian)
Google C++ Style:        No Hungarian (camelCase + member_)
LLVM Style:              No Hungarian (PascalCase 일관)
```

*최신 표준이 Hungarian 회피*. JSF가 *그 시대 product*.

## KF-21 vs F-35 — Naming Style 차이

```
F-35 (Lockheed Martin, JSF C++ 적용):
  class CFlightController {
      m_pBuffer;
      m_currentAltitude;
      void DoWork(int p_input) {
          int l_result;
      }
  };

KF-21 (KAI, MISRA + 자체 표준):
  class FlightController {
      char* buffer;
      int currentAltitude;
      void DoWork(int input) {
          int result;
      }
  };
```

KF-21이 *modern style*. *Hungarian-like 회피*.

## Class Name Prefix — C 또는 I

```
AV Rule 67 (Should) — Class prefix C 사용 (옵션)
class CFlightController { /* ... */ };

AV Rule 68 — Interface (pure virtual) class: I prefix
class IDrawable {
public:
    virtual void Draw() = 0;
    virtual ~IDrawable() = default;
};
```

C prefix가 *MFC (Microsoft Foundation Class)*의 영향. JSF가 채택.

```cpp
// JSF 스타일
class CFlightCtrl { /* ... */ };
class CAutopilot { /* ... */ };

// 현대 스타일
class FlightController { /* ... */ };
class Autopilot { /* ... */ };
```

C prefix는 *별로 가치 없음*. JSF의 *legacy quirk*.

I prefix는 *interface*에 의미 있음. 일부 modern style도 채택.

## Template Parameter — T Prefix

```cpp
template <typename T>
class Vector {
    T m_data;
};

// 좀 더 엄격: T + name
template <typename TItem>
class List {
    TItem m_item;
};
```

`T` prefix가 *template parameter 표시*. 일부 표준에서 *권장*.

## Enum — E Prefix

```cpp
enum EColor {
    COLOR_RED,
    COLOR_GREEN,
    COLOR_BLUE
};

EColor c = COLOR_RED;
```

JSF의 *Hungarian extension*. *enum class*가 없는 시대 (C++03)에 *type 구분 명시 효과*.

C++11의 *enum class* 도입 후 *불필요*.

```cpp
// C++11
enum class Color {
    RED,
    GREEN,
    BLUE
};

Color c = Color::RED;
// Color prefix 자동 — Hungarian 불필요
```

## Real Code Example — F-35 Style

JSF C++ 그대로 적용한 *F-35 style 코드*:

```cpp
// flight_controller.h
#ifndef JSF_FLIGHT_CONTROLLER_H
#define JSF_FLIGHT_CONTROLLER_H

class CSensorData;
class CActuatorCommand;

class CFlightController {
public:
    CFlightController();
    ~CFlightController();

    // Initialize with configuration
    bool Initialize(const CFlightConfig &p_config);
    
    // Main flight control step
    void Step(const CSensorData *p_pSensor, CActuatorCommand *p_pActuator);
    
    // Mode change
    void SetMode(EFlightMode p_eMode);
    EFlightMode GetCurrentMode() const;

private:
    // 멤버 변수 (m_ prefix)
    bool             m_bInitialized;
    EFlightMode      m_eCurrentMode;
    CFlightConfig    *m_pConfig;
    CPIDController   *m_pPitchCtrl;
    CPIDController   *m_pRollCtrl;
    CPIDController   *m_pYawCtrl;
    float            m_currentAltitude;
    float            m_targetAltitude;
    
    // Private methods (PascalCase)
    void UpdatePitchControl(const CSensorData *p_pSensor);
    void UpdateRollControl(const CSensorData *p_pSensor);
    void UpdateYawControl(const CSensorData *p_pSensor);
    
    // Static helpers
    static int s_instanceCount;
};

#endif // JSF_FLIGHT_CONTROLLER_H
```

```cpp
// flight_controller.cpp
#include "flight_controller.h"
#include "sensor_data.h"
#include "actuator_command.h"

int CFlightController::s_instanceCount = 0;

CFlightController::CFlightController()
    : m_bInitialized(false)
    , m_eCurrentMode(MODE_MANUAL)
    , m_pConfig(NULL)
    , m_pPitchCtrl(NULL)
    , m_pRollCtrl(NULL)
    , m_pYawCtrl(NULL)
    , m_currentAltitude(0.0f)
    , m_targetAltitude(0.0f)
{
    s_instanceCount++;
}

CFlightController::~CFlightController()
{
    delete m_pPitchCtrl;
    delete m_pRollCtrl;
    delete m_pYawCtrl;
    s_instanceCount--;
}

bool CFlightController::Initialize(const CFlightConfig &p_config)
{
    m_pConfig = const_cast<CFlightConfig *>(&p_config);
    m_pPitchCtrl = new CPIDController(p_config.GetPitchGains());
    m_pRollCtrl = new CPIDController(p_config.GetRollGains());
    m_pYawCtrl = new CPIDController(p_config.GetYawGains());
    m_bInitialized = true;
    return true;
}

void CFlightController::Step(const CSensorData *p_pSensor,
                              CActuatorCommand *p_pActuator)
{
    if (!m_bInitialized || p_pSensor == NULL || p_pActuator == NULL) {
        return;
    }
    
    UpdatePitchControl(p_pSensor);
    UpdateRollControl(p_pSensor);
    UpdateYawControl(p_pSensor);
}

void CFlightController::UpdatePitchControl(const CSensorData *p_pSensor)
{
    float l_pitchError = m_targetAltitude - p_pSensor->GetPitch();
    float l_pitchCommand = m_pPitchCtrl->Compute(l_pitchError);
    // ...
}
```

이런 *JSF C++ style*이 *F-35 codebase*. 25M LoC.

## KF-21 Style — Modern C++

대조적으로 KF-21이 *modern style 채택*할 수 있는 경우 (가정):

```cpp
// flight_controller.h (Modern style)
#pragma once

#include <memory>

class SensorData;
class ActuatorCommand;
class FlightConfig;

class FlightController {
public:
    explicit FlightController(const FlightConfig& config);
    ~FlightController() = default;
    
    void Step(const SensorData& sensor, ActuatorCommand& actuator);
    
    void SetMode(FlightMode mode);
    FlightMode GetCurrentMode() const { return current_mode_; }

private:
    void UpdatePitchControl(const SensorData& sensor);
    void UpdateRollControl(const SensorData& sensor);
    void UpdateYawControl(const SensorData& sensor);
    
    // Member variables (trailing underscore)
    FlightMode current_mode_;
    std::unique_ptr<PIDController> pitch_ctrl_;
    std::unique_ptr<PIDController> roll_ctrl_;
    std::unique_ptr<PIDController> yaw_ctrl_;
    float current_altitude_;
    float target_altitude_;
};
```

차이:
- *Hungarian prefix 없음*
- *C prefix 없음*
- *snake_case_*  (Google style trailing underscore)
- *enum class*
- *smart pointer* (`std::unique_ptr`)
- *raw pointer 대신 reference*
- *modern initialization* (in-class initializer 또는 ctor body)

*같은 functionality, 다른 style*. 둘 다 *valid*.

## Common Findings — Naming

```
실전 finding (Helix QAC 검출):

1. "m_buffer는 m_ prefix지만 pointer입니다 → m_pBuffer로"
   → AV Rule 47/49 위반

2. "FlightController class는 C prefix 누락"
   → AV Rule 67 (Should — 강제 아님)

3. "MAX_BUFF는 macro지만 SCREAMING_SNAKE 아님 (BUFF만)"
   → AV Rule 55

4. "p_data parameter의 p_ prefix 누락"
   → AV Rule 49

5. "long 100l (소문자 l) 사용"
   → AV Rule 17 (Will)

6. "namespace의 inner scope name이 outer 가림"
   → AV Rule 5

수정:
  모든 위반에 *JSF 규칙대로 rename*. *consistency*가 핵심.
```

## Modern C++의 명명 — 비교

```
JSF C++:
  CFlightController, m_pBuffer, l_count

Google C++ Style:
  FlightController, buffer_, count

LLVM Style:
  FlightController, Buffer, Count (everything PascalCase)

Boost Style:
  flight_controller, buffer, count (snake_case)

CppCoreGuidelines:
  무엇이든 일관성 (PascalCase 또는 snake_case)
  Hungarian 회피
  member에 underscore suffix는 OK
```

JSF가 *unique style*. 다른 표준과 *상당히 다름*.

## Naming Style — 통합 추세

```
2020+ trend:

회피:
  - Hungarian prefix (m_, s_, p_, l_)
  - C class prefix
  - E enum prefix

권장:
  - Consistent PascalCase 또는 snake_case
  - Member trailing _ (Google)
  - Smart pointers, no raw pointers
  - enum class
  - Strong typing

JSF C++ Future:
  F-35 maintenance는 JSF 유지
  새 mission은 modern (AUTOSAR 영향)
  MISRA C++:2023이 modern 통합
```

JSF C++ 명명은 *역사적 가치*. 새 프로젝트는 *modern style 선택* 가능.

## 한국 적용 — 실제

```
KAI:
  F-35 FACO: JSF C++ style 직접 (Lockheed 제공)
  KF-21: 자체 표준 (MISRA + modern)
  T-50/FA-50: legacy code (Lockheed influence)

LIG Nex1:
  자체 표준 (군 표준)
  일부 modern, 일부 legacy

신생 우주:
  Modern style (Google C++, LLVM)
  Hungarian 회피
  C++14/17 활용
```

## Code Review Checklist — Naming

```
Code Review 시 naming 체크:

□ Class: PascalCase, C prefix (필요 시), I for interface
□ Method: PascalCase
□ Local variable: camelCase 또는 snake_case
□ Member variable: m_ prefix + type info (m_p for pointer)
□ Static variable: s_ prefix
□ Global variable: g_ prefix (피하지만)
□ Constant: SCREAMING_SNAKE
□ Macro: SCREAMING_SNAKE
□ Enum: PascalCase + E prefix
□ Template parameter: T prefix
□ File name: snake_case.h, snake_case.cpp
□ 일관성 (mixed style 회피)
```

## Tool 자동화

```
Naming check tools:
  - Helix QAC (custom rules)
  - clang-tidy (readability-identifier-naming check)
  - SonarQube
  - Cppcheck (limited)

clang-tidy 설정 예:
```

```yaml
# .clang-tidy
Checks: 'readability-identifier-naming'

CheckOptions:
  - { key: readability-identifier-naming.ClassPrefix,             value: 'C' }
  - { key: readability-identifier-naming.ClassCase,                value: 'CamelCase' }
  - { key: readability-identifier-naming.MemberPrefix,             value: 'm_' }
  - { key: readability-identifier-naming.MemberCase,                value: 'lower_case' }
  - { key: readability-identifier-naming.ConstantCase,             value: 'UPPER_CASE' }
  - { key: readability-identifier-naming.GlobalVariablePrefix,     value: 'g_' }
  - { key: readability-identifier-naming.StaticVariablePrefix,     value: 's_' }
  - { key: readability-identifier-naming.FunctionCase,             value: 'CamelCase' }
```

CI에서 *naming 자동 검증*. 위반 시 *PR 실패*.

## 정리

- JSF C++의 *trademark*는 *Hungarian-like prefix* (m_, s_, p_, l_).
- C class prefix, I interface, E enum prefix.
- 2005 발행 (C++03 시대)의 *style choice*.
- 현대 표준 (AUTOSAR, Google, LLVM)은 *Hungarian 회피*.
- F-35 25M LoC가 *JSF style*. *legacy maintenance* 부담.
- KF-21 같은 *새 프로젝트*는 *modern style* 선택 가능.
- *Consistency*가 *style 자체보다 중요*.
- 자동화 (clang-tidy, Helix QAC)로 *naming 자동 검증*.

## 다음 장 예고

4장은 *Macros, Types, Constants* (Rule 67-153) — 매크로 정책, 타입 변환, 상수 정의.

## 관련 항목

- [Ch 2 — Environment, Language](/blog/embedded/aerospace-standards/jsf-cpp/chapter02-environment-language)
- [Ch 4 — Macros, Types, Constants](/blog/embedded/aerospace-standards/jsf-cpp/chapter04-macros-types-constants)
- [AUTOSAR C++14 Ch 2 — Language](/blog/embedded/car-standards/autosar-cpp/chapter02-language-build)
- [Google C++ Style Guide](https://google.github.io/styleguide/cppguide.html)
- [LLVM Coding Standards](https://llvm.org/docs/CodingStandards.html)
