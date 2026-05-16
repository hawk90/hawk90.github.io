---
title: "Ch 5: Declarations, Initialization, Casts, Expressions (Rule 138-168)"
date: 2025-09-30T06:00:00
description: "JSF C++ Rule 138-168 — 선언 정책, 명시 초기화, C-style cast 금지, 표현식 평가 순서, sizeof 함정."
tags: [jsf-cpp, declarations, initialization, casts, expressions, sizeof, static-cast]
series: "JSF C++"
seriesOrder: 5
draft: false
---

JSF C++ Rule 138-168이 *선언·초기화·캐스트·표현식*. *명시 초기화 의무*, *C-style cast 금지*, *side effect 회피*. 이 장은 *각 rule의 의미·F-35 적용·modern style 비교*까지.

## AV Rule 138-145 — Declaration

### AV Rule 138 — 변수는 사용 *직전*에 선언

```cpp
// 위반 (C-style: 함수 시작에 모두)
void Foo() {
    int i, j, k;
    int sum = 0;
    int temp;
    char buf[64];

    for (i = 0; i < 10; i++) sum += i;
    for (j = 0; j < 5; j++) DoWork(j);
}

// Good — 사용처에 가까이
void Foo() {
    int sum = 0;
    for (int i = 0; i < 10; i++) sum += i;
    for (int j = 0; j < 5; j++) DoWork(j);
}
```

C++가 *함수 어디서나 선언 가능*. C90의 *맨 위 선언* 회피.

장점:
- *Lifetime 명확*
- *Scope 최소화*
- *Read 쉬움*

### AV Rule 139 — 한 줄에 한 선언

```cpp
// 위반
int x, y, z;
int *p1, p2;          // 함정 — p1만 pointer, p2는 int

// Good
int x;
int y;
int z;
int *p1;
int *p2;
```

`int *p1, p2;`가 *흔한 함정*. *명시 분리*.

### AV Rule 140 — 자동 변수 명시 초기화

```cpp
// 위반
int count;
char buf[100];
ProcessData(count, buf);  // count, buf undefined

// Good
int count = 0;
char buf[100] = {0};
ProcessData(count, buf);
```

C++03에서 *자동 변수가 자동 초기화 안 됨*. *명시 초기화 의무*.

### AV Rule 141 — Global Variable 회피

```cpp
// 위반 — global
int g_counter = 0;
char g_buffer[256];

// Good — namespace 또는 class
namespace flight_state {
    int counter = 0;
    char buffer[256];
}

// 또는 class
class FlightState {
public:
    static FlightState& Instance();
private:
    int counter_;
    char buffer_[256];
};
```

Global = *test 어려움 + concurrency 위험*. *encapsulation 강제*.

### AV Rule 142-145 — Static, Extern

```cpp
// AV Rule 142 (Will)
// 같은 컴파일 단위에서만 사용되는 함수/변수는 static
static int s_counter = 0;
static int Helper(int x) { return x * 2; }

// AV Rule 143 (Will)
// extern은 헤더에 (cpp에서 extern 정의 금지)
// foo.h
extern int g_value;
// foo.cpp
int g_value = 0;

// AV Rule 144 (Will)
// extern "C" 사용 시 명확히
extern "C" {
    void CFunction();
}
```

C와 C++ 혼용 시 *`extern "C"`* 필수 (name mangling 차이).

## AV Rule 146-155 — Initialization

### AV Rule 146 — Constructor 명시 초기화 list

```cpp
// 위반 — body에서 초기화
class Foo {
public:
    Foo() {
        m_value = 0;
        m_count = 0;
        m_name = "default";
    }
private:
    int m_value;
    int m_count;
    string m_name;
};

// Good — initializer list
class Foo {
public:
    Foo() : m_value(0), m_count(0), m_name("default") {}
private:
    int m_value;
    int m_count;
    string m_name;
};
```

이유:
- *member 객체는 *어차피 default ctor* 호출 → 두 번 초기화* (낭비)
- *const member는 initializer list만* 가능
- *reference member도 initializer list만*

### AV Rule 147 — 멤버 선언 순서대로 초기화

```cpp
class Foo {
public:
    Foo() : m_b(0), m_a(0) {}  // 위반 — 선언 순서 (m_a, m_b)와 다름
private:
    int m_a;  // 먼저 선언
    int m_b;  // 다음
};
```

C++는 *멤버를 선언 순서대로 초기화*. *initializer list 순서와 무관*.

```cpp
// 위험 패턴
class Foo {
public:
    Foo(int x) : m_b(x), m_a(m_b * 2) {}  // 위반 — m_a가 m_b 사용 (m_b 아직 초기화 X)
private:
    int m_a;
    int m_b;
};
```

m_a가 *m_b 사용* — 그러나 m_a가 *먼저 초기화* (선언 순서). m_b는 *아직 garbage*.

### AV Rule 148 — `explicit` Constructor

```cpp
// 위반 — implicit 변환 허용
class MyClass {
public:
    MyClass(int x) : m_value(x) {}  // not explicit
private:
    int m_value;
};

void Foo(MyClass obj) { /* ... */ }
Foo(5);  // 위반 — implicit MyClass(5) 변환

// Good
class MyClass {
public:
    explicit MyClass(int x) : m_value(x) {}  // explicit
private:
    int m_value;
};

Foo(5);            // 컴파일 에러
Foo(MyClass(5));   // 명시
```

*Single-argument constructor*는 *모두 explicit* 권장.

### AV Rule 149 — Copy Constructor + Assignment

```cpp
// AV Rule 149 (Will)
// Class에 copy ctor와 assignment 필요 시 *모두* 정의
class Foo {
public:
    Foo();
    Foo(const Foo &other);             // copy ctor
    Foo& operator=(const Foo &other);  // assignment
    ~Foo();
};
```

*Rule of Three* (C++03):
- Destructor 필요 → copy ctor + assignment도 필요
- Copy ctor 정의 → assignment + destructor도 보통 필요

C++11의 *Rule of Five* — move 추가. JSF 원본은 *C++03이라 Three*.

## AV Rule 156-165 — Casts

### AV Rule 156 — C-style Cast 금지

```cpp
// 위반 — C-style cast
int x = (int)f;
char *p = (char *)q;
const int *cp = (const int *)mp;

// Good — 명시 cast
int x = static_cast<int>(f);
char *p = static_cast<char *>(q);
const int *cp = static_cast<const int *>(mp);
```

C-style cast가 *위험*:
- *Static + const + reinterpret 모두 시도* (가장 강한 것 적용)
- *의도 가림*
- *grep으로 찾기 어려움*

`static_cast`, `const_cast`, `reinterpret_cast`, `dynamic_cast`가 *명시 + grep-able*.

### AV Rule 157 — `static_cast`만 사용 (대부분의 경우)

```cpp
// 같은 hierarchy: static_cast
class Base {};
class Derived : public Base {};
Derived d;
Base *b = static_cast<Base *>(&d);     // Good (upcast)
Derived *d2 = static_cast<Derived *>(b); // Good (downcast, programmer 책임)
```

`static_cast`가 *대부분 cast*. *type-related*.

### AV Rule 158 — `dynamic_cast` 회피

```cpp
// 위반 — dynamic_cast 사용
Base *b = GetSomeBase();
Derived *d = dynamic_cast<Derived *>(b);  // RTTI 필요

// Good — 다른 design
// 1. Polymorphism (virtual function) 사용
// 2. 또는 enum + switch (좀 더 OOP하지 않지만 안전)
```

`dynamic_cast`가 *RTTI 필요*. JSF는 *RTTI 회피* — runtime cost.

### AV Rule 159 — `const_cast` 회피

```cpp
// 위반 — const 제거
const int x = 5;
int *p = const_cast<int *>(&x);
*p = 10;  // UB

// Good — design 재검토
// const이면 const 유지
// 변경 필요하면 처음부터 non-const
```

`const_cast`는 *legacy C API 호환*에만. *새 코드 회피*.

### AV Rule 160 — `reinterpret_cast` 회피

```cpp
// 위반 — type punning
float f = 3.14F;
int i = reinterpret_cast<int &>(f);  // UB (strict aliasing 위반)

// Good — memcpy (well-defined)
float f = 3.14F;
int i;
memcpy(&i, &f, sizeof(i));

// 또는 C++20 std::bit_cast
int i = std::bit_cast<int>(f);
```

`reinterpret_cast`는 *strict aliasing 위반 위험*. *memcpy* 또는 *bit_cast*.

### AV Rule 161 — Implicit Cast 회피

```cpp
// 위반
float f = 10;          // int → float (implicit, sometimes silent precision loss)
int i = 3.14F;          // float → int (silent truncation)
short s = 1000000;      // int → short (silent narrowing)

// Good
float f = 10.0F;        // float literal
int i = static_cast<int>(3.14F);  // 명시
short s;
if (1000000 > SHRT_MAX) handle_error();
s = static_cast<short>(1000000);
```

JSF의 *strict cast policy*. MISRA C와 같은 정신.

## AV Rule 166-168 — Expressions

### AV Rule 166 — Side Effect 평가 순서

```cpp
// 위반 — sequence point 위반
int i = 0;
int x = i++ + i++;  // UB — 평가 순서 미정

// Good
int i = 0;
int a = i++;
int b = i++;
int x = a + b;
```

C++03의 *sequence point*가 정확. C++11/17이 *더 strict*.

### AV Rule 167 — sizeof 함정

```cpp
// 위반
int a[10];
int n = sizeof(a) / sizeof(int);  // 10 (OK for array)

void Foo(int a[]) {                // a는 *pointer*
    int n = sizeof(a) / sizeof(int);  // 위반 — sizeof(int*) / sizeof(int) = 2 (typical)
}

// Good — 명시 size
void Foo(int *a, size_t n) { /* ... */ }
void Foo(int a[], size_t n) { /* ... */ }  // 함수 시그니처상 동일
```

배열이 *함수 인자가 되면 pointer로 decay*. `sizeof`가 *예상치 못한 결과*.

### AV Rule 168 — Bool 표현식

```cpp
// 위반 — int → bool implicit
int count = GetCount();
if (count) { /* ... */ }   // count는 int

// Good
if (count != 0) { /* ... */ }

// 위반 — bitwise vs logical
if (flag1 & flag2) { ... }   // 비트 AND를 boolean으로?
if (flag1 && flag2) { ... }  // 명시 boolean
```

`&` (bitwise) vs `&&` (logical) 헷갈림. *명시 의도*.

## 실전 — F-35 Initialization Pattern

JSF C++ 스타일의 *완전한 class*:

```cpp
// pid_controller.h

#ifndef JSF_PID_CONTROLLER_H
#define JSF_PID_CONTROLLER_H

class CPIDController {
public:
    // Constructor with all parameters
    explicit CPIDController(float p_kp, float p_ki, float p_kd, float p_dt);
    
    // No copy or assignment (no need)
    CPIDController(const CPIDController &) = delete;             // C++11 if available
    CPIDController& operator=(const CPIDController &) = delete;
    
    ~CPIDController();
    
    // Public methods
    void Reset();
    float Compute(float p_setpoint, float p_measure);

private:
    // Members — initialized in initializer list
    const float m_kp;
    const float m_ki;
    const float m_kd;
    const float m_dt;
    float m_integralTerm;
    float m_prevError;
    bool m_bInitialized;
};

#endif // JSF_PID_CONTROLLER_H
```

```cpp
// pid_controller.cpp

#include "pid_controller.h"

// Constructor with initializer list (AV Rule 146, 147)
CPIDController::CPIDController(float p_kp, float p_ki, float p_kd, float p_dt)
    : m_kp(p_kp)
    , m_ki(p_ki)
    , m_kd(p_kd)
    , m_dt(p_dt)
    , m_integralTerm(0.0F)
    , m_prevError(0.0F)
    , m_bInitialized(true)
{
    // Empty body — all in initializer list
}

CPIDController::~CPIDController()
{
    m_bInitialized = false;
}

void CPIDController::Reset()
{
    m_integralTerm = 0.0F;
    m_prevError = 0.0F;
}

float CPIDController::Compute(float p_setpoint, float p_measure)
{
    if (!m_bInitialized) {
        return 0.0F;
    }
    
    // Cast: implicit OK (float → float)
    const float l_error = p_setpoint - p_measure;
    
    // P term
    const float l_pTerm = m_kp * l_error;
    
    // I term with anti-windup
    m_integralTerm += m_ki * l_error * m_dt;
    if (m_integralTerm > 10.0F) m_integralTerm = 10.0F;
    if (m_integralTerm < -10.0F) m_integralTerm = -10.0F;
    
    // D term
    const float l_dTerm = m_kd * (l_error - m_prevError) / m_dt;
    m_prevError = l_error;
    
    // Output with saturation
    float l_output = l_pTerm + m_integralTerm + l_dTerm;
    if (l_output > 100.0F) l_output = 100.0F;
    if (l_output < -100.0F) l_output = -100.0F;
    
    return l_output;
}
```

JSF style 특징:
- *m_ prefix*로 member
- *p_ prefix*로 parameter
- *l_ prefix*로 local
- *F suffix*로 float
- *explicit constructor*
- *Initializer list 사용*
- *No C-style cast*
- *const member where appropriate*

## Modern C++ 변종 — KF-21 / 신생 회사

```cpp
// modern_pid_controller.hpp

class PIDController {
public:
    explicit PIDController(float kp, float ki, float kd, float dt)
        : kp_{kp}, ki_{ki}, kd_{kd}, dt_{dt} {}
    
    PIDController(const PIDController&) = delete;
    PIDController& operator=(const PIDController&) = delete;
    
    void Reset() {
        integral_term_ = 0.0F;
        prev_error_ = 0.0F;
    }
    
    float Compute(float setpoint, float measure) {
        const float error = setpoint - measure;
        const float p_term = kp_ * error;
        
        integral_term_ += ki_ * error * dt_;
        integral_term_ = std::clamp(integral_term_, -10.0F, 10.0F);
        
        const float d_term = kd_ * (error - prev_error_) / dt_;
        prev_error_ = error;
        
        return std::clamp(p_term + integral_term_ + d_term, -100.0F, 100.0F);
    }

private:
    const float kp_;
    const float ki_;
    const float kd_;
    const float dt_;
    float integral_term_{0.0F};   // C++11 in-class init
    float prev_error_{0.0F};
};
```

차이:
- *trailing _* (Google style)
- *brace initialization* (C++11)
- *std::clamp* (C++17)
- *no Hungarian*
- *no C/I prefix*

같은 algorithm, 다른 style. 둘 다 *valid coding*.

## Common Findings

```
실전 finding (JSF C++):

1. "변수 x 함수 시작에 선언, 50 line 후에 사용"
   → AV Rule 138 위반

2. "int *p1, p2; — p2가 int가 의도?"
   → AV Rule 139 위반

3. "(int)f 사용 — static_cast 권장"
   → AV Rule 156 위반

4. "Constructor body에서 m_x = 0; 사용"
   → AV Rule 146 위반 (initializer list 권장)

5. "Initializer list 순서가 멤버 선언 순서와 다름"
   → AV Rule 147 위반 (undefined behavior 위험)

6. "explicit 누락 — implicit 변환 가능"
   → AV Rule 148 위반

7. "dynamic_cast 사용 — RTTI 필요"
   → AV Rule 158 위반
```

## Tool 자동화

```bash
# Helix QAC — JSF rule
qac.exe -prj jsf.prj   # AV Rule 138-168 자동

# clang-tidy — modern style
clang-tidy --checks='modernize-*,cppcoreguidelines-*,readability-*' src/

# 주요 check:
# modernize-use-default-member-init
# cppcoreguidelines-pro-type-cstyle-cast
# cppcoreguidelines-pro-type-static-cast-downcast
# readability-make-member-function-const
```

## 정리

- **Declaration**: 사용 직전 선언, 한 줄에 하나, 명시 초기화 의무.
- **Initialization**: Constructor initializer list (member 선언 순서대로), explicit ctor.
- **Cast**: C-style 금지. static_cast 권장. const_cast/reinterpret_cast 회피. dynamic_cast 금지 (RTTI).
- **Expressions**: side effect sequence point 주의, sizeof 함정, bool 명시.
- *F-35 25M LoC*가 *이 rule 100% 준수*.
- *Modern C++*는 *brace init + auto + smart pointer*로 *더 간결*.

## 다음 장 예고

6장은 *Statements, Functions* (Rule 159-208) — goto 금지, varargs 금지, 재귀 금지.

## 관련 항목

- [Ch 4 — Macros, Types, Constants](/blog/embedded/aerospace-standards/jsf-cpp/chapter04-macros-types-constants)
- [Ch 6 — Statements, Functions](/blog/embedded/aerospace-standards/jsf-cpp/chapter06-statements-functions)
- [MISRA C Ch 4 — Syntax, Format](/blog/embedded/car-standards/misra-c/chapter04-syntax-format)
- [AUTOSAR C++14 Ch 3 — Expressions](/blog/embedded/car-standards/autosar-cpp/chapter03-expressions-conversions)
