---
title: "Ch 3: Lexical + Naming Conventions"
date: 2025-09-30T04:00:00
description: "JSF C++ — 주석, 식별자, Hungarian-like prefix (m_, s_, p_, l_) 패턴."
tags: [jsf-cpp, lexical, comments, naming, hungarian, prefix, identifier]
series: "JSF C++"
seriesOrder: 3
draft: false
---

JSF C++의 *어휘 + 명명 규칙*. *Hungarian-like prefix* (m_, s_, p_, l_)가 *legacy aerospace codebase*에서 자주 보이는 패턴. *정확한 AV Rule 번호·wording은 원문 PDF 참조*.

## Whitespace + Literals

```cpp
// 회피
long x = 100l;       // l과 1 헷갈림

// Good
long x = 100L;       // L 사용
```

소문자 `l`이 *숫자 1*과 혼동. MISRA, AUTOSAR도 같은 정신.

## Comments

```cpp
// 다중 line — /* */
/*
 * This is a multi-line comment.
 * Each line starts with " * ".
 */

// 단일 line — //
int x = 5;  // single-line

// Doxygen — /** */
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

JSF가 *Doxygen 권장*. 항공계 광범위 사용.

### Commented-out Code 회피

```cpp
// 회피
void Foo() {
    int x = 5;
    // int old_x = 10;  // 옛 값
    // Bar(old_x);      // 옛 코드
    Bar(x);
}

// Good — VCS에 history 있음
void Foo() {
    int x = 5;
    Bar(x);
}
```

VCS (Git 등)가 *history 보존*. Commented-out = noise.

## Naming — Hungarian-like Prefix

JSF의 *대표적 trademark*. 명명 체계는 다음 정신을 따른다:

```
Type        : PascalCase (e.g., MyClass)
Function    : PascalCase (e.g., DoWork)
Variable    : camelCase 또는 snake_case
Constant    : SCREAMING_SNAKE
Macro       : SCREAMING_SNAKE

Scope prefix:
  g_         Global
  s_         Static (file-scope)
  m_         Member (class data)
  p_         Pointer (parameter)
  l_         Local (rare)

Type prefix:
  C          Class (옵션)
  I          Interface (pure virtual)
  E          Enum
  T          Template parameter
```

### Member Variable — `m_`

```cpp
class Foo {
public:
    void SetValue(int value);
private:
    int m_value;
    int m_count;
    char *m_pBuffer;   // m_p (member pointer)
};
```

`m_`이 *member 명시*. `this->`보다 짧음.

### Static Variable — `s_`

```cpp
// foo.cpp
static int s_initialized = 0;
static int s_counter = 0;

void Init() {
    s_initialized = 1;
}
```

`s_`이 *file-scope static* 표시.

### Pointer — `p_` / `m_p` / `l_p`

```cpp
class Foo {
private:
    int m_value;
    char *m_pName;        // member pointer
    Bar *m_pBar;
};

void Process(char *p_data, int len) {   // parameter pointer
    char *l_pTemp = malloc(100);        // local pointer
}
```

이중 prefix (`m_p`, `l_p`)가 *scope + type 모두 표시*. Hungarian의 강한 영향.

### Local Variable — `l_` (옵션)

```cpp
void Process() {
    int l_count = 0;
    int l_index = 0;
}
```

`l_`은 *덜 사용*. 보통 *그냥 camelCase*.

### Class — PascalCase + `C` prefix (옵션)

```cpp
class CFlightController { /* ... */ };
```

`C` prefix는 *MFC (Microsoft Foundation Class)*에서 유래한 *legacy 관습*. JSF에서 채택. *현대 style*에서는 *생략* 흔함.

### Interface — `I` prefix

```cpp
class IDrawable {
public:
    virtual void Draw() = 0;
    virtual ~IDrawable() {}
};
```

*Interface (pure abstract class)*에 `I` 명시. 일부 modern style도 채택.

### Enum — `E` prefix (C++03)

```cpp
enum EColor {
    COLOR_RED,
    COLOR_GREEN,
    COLOR_BLUE
};

EColor c = COLOR_RED;
```

C++03 unscoped enum에서 *type 구분 효과*. C++11의 `enum class` 등장 후 *불필요*.

```cpp
// C++11
enum class Color {
    RED,
    GREEN,
    BLUE
};

Color c = Color::RED;   // Color:: 자동 — prefix 불필요
```

### Template Parameter — `T` prefix

```cpp
template <typename T>
class Vector {
    T m_data;
};

template <typename TItem>
class List {
    TItem m_item;
};
```

`T` prefix가 *template parameter 표시*. 일부 표준 권장.

## Method / Function / Constant

```cpp
// Class & Method
class FlightController {
public:
    void EngageAutopilot();
    int GetAltitude() const;
};

// Local variable
void Foo() {
    int currentAltitude = 0;
    int target_altitude = 0;   // 양쪽 허용
}

// Constant
const int MAX_ALTITUDE = 40000;
const float DEG_TO_RAD = 0.01745F;

// Macro (회피 권장이지만 사용 시)
#define JSF_DEBUG 1
#define MAX_BUFFER_SIZE 256
```

## Hungarian의 역사와 비판

Hungarian이 *원래 의도*:

```
Microsoft (1980s, Charles Simonyi):
  - Apps Hungarian: semantic prefix
    예: cb (count of bytes), rw (row), ix (index)
  
  - Systems Hungarian: type prefix (변질)
    예: iCount, szName, fActive
```

JSF는 *Systems Hungarian의 영향* — type/scope prefix.

### Modern 관점의 비판

```
일반적 비판:
  1. Redundant — type system이 이미 표시
  2. Verbose
  3. 변경 시 cascade — 타입 변경 → prefix 변경
  4. 현대 IDE가 hover/색상으로 이미 보여줌
  5. 가독성 저하

옹호:
  1. Scope 즉시 명확
  2. 큰 codebase 일관성
  3. Legacy 유지
```

### 표준 진화

```
JSF C++ (2005):           Hungarian-like (m_, s_, p_)
MISRA C++:2008:           Hungarian 회피
AUTOSAR C++14 (2017):     Hungarian 회피
MISRA C++:2023:           Modern style
Google C++ Style:         No Hungarian (trailing _)
LLVM Style:               No Hungarian
```

최신 표준이 *Hungarian 회피*. JSF는 *그 시기의 product*.

## JSF Style 예 — Flight Controller

```cpp
// flight_controller.h
#ifndef JSF_FLIGHT_CONTROLLER_H
#define JSF_FLIGHT_CONTROLLER_H

class CSensorData;
class CActuatorCommand;
class CFlightConfig;
class CPIDController;

class CFlightController {
public:
    CFlightController();
    ~CFlightController();

    bool Initialize(const CFlightConfig &p_config);
    void Step(const CSensorData *p_pSensor, CActuatorCommand *p_pActuator);
    void SetMode(EFlightMode p_eMode);
    EFlightMode GetCurrentMode() const;

private:
    bool             m_bInitialized;
    EFlightMode      m_eCurrentMode;
    CFlightConfig    *m_pConfig;
    CPIDController   *m_pPitchCtrl;
    CPIDController   *m_pRollCtrl;
    CPIDController   *m_pYawCtrl;
    float            m_currentAltitude;
    float            m_targetAltitude;
    
    void UpdatePitchControl(const CSensorData *p_pSensor);
    void UpdateRollControl(const CSensorData *p_pSensor);
    void UpdateYawControl(const CSensorData *p_pSensor);
    
    static int s_instanceCount;
};

#endif
```

```cpp
// flight_controller.cpp
#include "flight_controller.h"

int CFlightController::s_instanceCount = 0;

CFlightController::CFlightController()
    : m_bInitialized(false)
    , m_eCurrentMode(MODE_MANUAL)
    , m_pConfig(NULL)
    , m_pPitchCtrl(NULL)
    , m_pRollCtrl(NULL)
    , m_pYawCtrl(NULL)
    , m_currentAltitude(0.0F)
    , m_targetAltitude(0.0F)
{
    s_instanceCount++;
}

CFlightController::~CFlightController() {
    delete m_pPitchCtrl;
    delete m_pRollCtrl;
    delete m_pYawCtrl;
    s_instanceCount--;
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

void CFlightController::UpdatePitchControl(const CSensorData *p_pSensor) {
    float l_pitchError = m_targetAltitude - p_pSensor->GetPitch();
    float l_pitchCommand = m_pPitchCtrl->Compute(l_pitchError);
    // ...
}
```

## Modern C++ Style — 비교

같은 functionality를 *modern style*로:

```cpp
// modern_flight_controller.hpp
#pragma once

#include <memory>

class SensorData;
class ActuatorCommand;
class FlightConfig;
class PIDController;

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
    
    FlightMode current_mode_;
    std::unique_ptr<PIDController> pitch_ctrl_;
    std::unique_ptr<PIDController> roll_ctrl_;
    std::unique_ptr<PIDController> yaw_ctrl_;
    float current_altitude_;
    float target_altitude_;
};
```

차이:
- Hungarian prefix 없음
- C prefix 없음
- snake_case_ (Google trailing underscore)
- enum class
- smart pointer
- raw pointer 대신 reference

같은 functionality, 다른 style. 둘 다 valid.

## 다른 코딩 표준의 명명 — 비교

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
  무엇이든 일관성. Hungarian 회피.
  member에 trailing underscore OK.
```

JSF는 *unique style*. 현대 표준들과 *상당히 다름*.

## 일반적인 finding (naming)

```
실전에서 자주 발견되는 위반:

1. m_buffer가 사실은 pointer → m_pBuffer로
2. p_data parameter의 p_ prefix 누락
3. long 100l (소문자 l)
4. Macro 이름이 일관 안 됨
5. inner scope name이 outer 가림 (shadowing)
```

## Tool 자동화 — clang-tidy 설정 예

```yaml
# .clang-tidy
Checks: 'readability-identifier-naming'

CheckOptions:
  - { key: readability-identifier-naming.ClassPrefix,             value: 'C' }
  - { key: readability-identifier-naming.ClassCase,               value: 'CamelCase' }
  - { key: readability-identifier-naming.MemberPrefix,            value: 'm_' }
  - { key: readability-identifier-naming.MemberCase,              value: 'lower_case' }
  - { key: readability-identifier-naming.ConstantCase,            value: 'UPPER_CASE' }
  - { key: readability-identifier-naming.GlobalVariablePrefix,    value: 'g_' }
  - { key: readability-identifier-naming.StaticVariablePrefix,    value: 's_' }
  - { key: readability-identifier-naming.FunctionCase,            value: 'CamelCase' }
```

CI에서 자동 검증. 위반 시 *PR 실패*.

## Code Review Checklist — Naming

```
□ Class: PascalCase (+ C prefix 옵션, I for interface)
□ Method: PascalCase
□ Local variable: camelCase 또는 snake_case
□ Member: m_ prefix (+ type info: m_p for pointer)
□ Static: s_ prefix
□ Global: g_ prefix (회피 권장)
□ Constant: SCREAMING_SNAKE
□ Macro: SCREAMING_SNAKE
□ Enum: PascalCase + E prefix (C++03)
□ Template parameter: T prefix
□ File name: snake_case.h / .cpp
□ 한 codebase 안 일관성
```

## 정리

- JSF C++의 *trademark*는 *Hungarian-like prefix* (m_, s_, p_, l_).
- C class prefix, I interface, E enum prefix.
- 2005 발행 (C++03 시기)의 *style choice*.
- 현대 표준 (AUTOSAR, MISRA C++:2023, Google, LLVM)은 *Hungarian 회피*.
- *Consistency*가 *style 자체보다 중요*.
- 자동화 (clang-tidy, Helix QAC)로 *naming 자동 검증*.
- 정확한 AV Rule 번호·wording은 *원문 PDF*.

## 다음 장 예고

4장은 *Macros, Types, Constants*.

## 관련 항목

- [Ch 2 — Environment, Language](/blog/embedded/aerospace-standards/jsf-cpp/chapter02-environment-language)
- [Ch 4 — Macros, Types, Constants](/blog/embedded/aerospace-standards/jsf-cpp/chapter04-macros-types-constants)
- [AUTOSAR C++14 Ch 2 — Language](/blog/embedded/car-standards/autosar-cpp/chapter02-language-build)
- [Google C++ Style Guide](https://google.github.io/styleguide/cppguide.html)
- [LLVM Coding Standards](https://llvm.org/docs/CodingStandards.html)
