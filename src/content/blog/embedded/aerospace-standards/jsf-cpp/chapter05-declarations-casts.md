---
title: "Ch 5: Declarations, Initialization, Casts, Expressions"
date: 2026-05-18T06:00:00
description: "JSF C++ — 선언 정책, 명시 초기화, C-style cast 금지, 표현식 평가, sizeof 함정."
tags: [jsf-cpp, declarations, initialization, casts, expressions, sizeof, static-cast]
series: "JSF C++"
seriesOrder: 5
draft: false
---

JSF C++의 *선언·초기화·캐스트·표현식* 정책. *명시 초기화 의무*, *C-style cast 금지*, *side effect 회피*. *정확한 AV Rule 번호·wording은 원문 PDF 참조*.

## Declaration

### 변수는 사용 직전에 선언

```cpp
// 회피 (C-style: 함수 시작에 모두)
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

C++는 *함수 어디서나 선언 가능*. C90의 *맨 위 선언* 관습을 회피.

장점: lifetime 명확, scope 최소화, read 쉬움.

### 한 줄에 한 선언

```cpp
// 회피
int x, y, z;
int *p1, p2;          // 함정 — p1만 pointer, p2는 int

// Good
int x;
int y;
int z;
int *p1;
int *p2;
```

`int *p1, p2;`가 *흔한 함정*. 명시 분리.

### 자동 변수 명시 초기화

```cpp
// 회피
int count;
char buf[100];
ProcessData(count, buf);   // count, buf undefined

// Good
int count = 0;
char buf[100] = {0};
ProcessData(count, buf);
```

C++03에서 *자동 변수가 자동 초기화 안 됨*. 명시 초기화 의무.

### Global 회피

```cpp
// 회피 — global
int g_counter = 0;
char g_buffer[256];

// Good — namespace 또는 class
namespace flight_state {
    int counter = 0;
    char buffer[256];
}

class FlightState {
public:
    static FlightState& Instance();
private:
    int counter_;
    char buffer_[256];
};
```

Global = *test 어려움 + concurrency 위험*. Encapsulation 권장.

### static / extern

```cpp
// 같은 컴파일 단위에서만 사용되는 함수/변수는 static
static int s_counter = 0;
static int Helper(int x) { return x * 2; }

// extern은 헤더에 (cpp에서 extern 정의 금지)
// foo.h
extern int g_value;
// foo.cpp
int g_value = 0;

// extern "C" 사용 시 명확히
extern "C" {
    void CFunction();
}
```

C와 C++ 혼용 시 *`extern "C"`* 필수 (name mangling 차이).

## Initialization

### Constructor 명시 초기화 list

```cpp
// 회피 — body에서 초기화
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
- Member 객체는 *어차피 default ctor 호출* → body 대입은 *두 번 초기화* (낭비)
- *const member*는 initializer list만 가능
- *Reference member*도 initializer list만

### 멤버 선언 순서대로 초기화

```cpp
class Foo {
public:
    Foo() : m_b(0), m_a(0) {}   // 위험 — 선언 순서와 다름
private:
    int m_a;   // 먼저 선언
    int m_b;   // 다음
};
```

C++는 *멤버를 선언 순서대로 초기화*. *initializer list 순서와 무관*.

```cpp
// 위험 패턴
class Foo {
public:
    Foo(int x) : m_b(x), m_a(m_b * 2) {}   // m_a가 먼저 → m_b 아직 garbage
private:
    int m_a;
    int m_b;
};
```

### `explicit` Constructor

```cpp
// 회피 — implicit 변환 허용
class MyClass {
public:
    MyClass(int x) : m_value(x) {}
private:
    int m_value;
};

void Foo(MyClass obj);
Foo(5);   // implicit MyClass(5) 변환

// Good
class MyClass {
public:
    explicit MyClass(int x) : m_value(x) {}
};

Foo(5);            // 컴파일 에러
Foo(MyClass(5));   // 명시
```

*Single-argument constructor*는 *모두 explicit* 권장.

### Rule of Three

```cpp
class Foo {
public:
    Foo();
    Foo(const Foo &other);
    Foo& operator=(const Foo &other);
    ~Foo();
};
```

Destructor 정의하면 copy ctor + assignment도 보통 필요. C++11에 *Rule of Five* (move 추가).

## Casts

### C-style Cast 금지

```cpp
// 회피
int x = (int)f;
char *p = (char *)q;
const int *cp = (const int *)mp;

// Good — 명시 cast
int x = static_cast<int>(f);
char *p = static_cast<char *>(q);
const int *cp = static_cast<const int *>(mp);
```

C-style cast의 위험:
- Static + const + reinterpret 모두 시도 (가장 강한 것 적용)
- 의도 가림
- grep으로 찾기 어려움

`static_cast`, `const_cast`, `reinterpret_cast`, `dynamic_cast`가 *명시 + grep-able*.

### `static_cast`가 기본

```cpp
class Base {};
class Derived : public Base {};

Derived d;
Base *b = static_cast<Base *>(&d);       // upcast
Derived *d2 = static_cast<Derived *>(b); // downcast, programmer 책임
```

대부분의 cast가 `static_cast`로 해결.

### `dynamic_cast` 회피

```cpp
// 회피 — RTTI 필요
Base *b = GetSomeBase();
Derived *d = dynamic_cast<Derived *>(b);

// Good — 다른 design
// 1. Virtual function로 통일
// 2. Enum + switch (manual dispatch)
```

JSF는 *RTTI 자체 금지*. 자세히는 Ch 8 (Inheritance) 참고.

### `const_cast` 회피

```cpp
// 위험 — const 제거
const int x = 5;
int *p = const_cast<int *>(&x);
*p = 10;   // UB

// Good — design 재검토
```

`const_cast`는 *legacy C API 호환*에만. 새 코드 회피.

### `reinterpret_cast` 회피

```cpp
// 위험 — strict aliasing 위반
float f = 3.14F;
int i = reinterpret_cast<int &>(f);   // UB

// Good — memcpy (well-defined)
float f = 3.14F;
int i;
memcpy(&i, &f, sizeof(i));

// 또는 C++20 std::bit_cast
int i = std::bit_cast<int>(f);
```

### Implicit Cast 회피

```cpp
// 회피
float f = 10;             // int → float
int i = 3.14F;            // float → int (silent truncation)
short s = 1000000;        // int → short (silent narrowing)

// Good
float f = 10.0F;
int i = static_cast<int>(3.14F);
short s;
if (1000000 > SHRT_MAX) HandleError();
s = static_cast<short>(1000000);
```

JSF의 *strict cast policy*. MISRA C와 같은 정신.

## Expressions

### Side Effect — Sequence Point

```cpp
// 회피
int i = 0;
int x = i++ + i++;   // UB — 평가 순서 미정

// Good
int i = 0;
int a = i++;
int b = i++;
int x = a + b;
```

C++03의 *sequence point*가 정확한 정의. C++11/17이 더 strict.

### sizeof 함정

```cpp
int a[10];
int n = sizeof(a) / sizeof(int);   // 10 (OK for array)

void Foo(int a[]) {
    int n = sizeof(a) / sizeof(int);
    // 함정 — a는 *pointer*, sizeof(int*)/sizeof(int)
}

// Good — 명시 size
void Foo(int *a, size_t n) { /* ... */ }
```

배열이 *함수 인자로 전달되면 pointer로 decay*. `sizeof`가 *예상 외 결과*.

### Bool 표현식

```cpp
// 회피 — int → bool implicit
int count = GetCount();
if (count) { /* ... */ }

// Good
if (count != 0) { /* ... */ }

// 회피 — bitwise vs logical 혼동
if (flag1 & flag2) { /* ... */ }   // bit AND를 boolean으로?

// Good
if ((flag1 & flag2) != 0) { /* ... */ }   // bit check
if (flag1 && flag2) { /* ... */ }         // logical
```

`&` (bitwise) vs `&&` (logical) — *명시 의도*.

## JSF Style 예 — PID 컨트롤러

```cpp
// pid_controller.h
#ifndef JSF_PID_CONTROLLER_H
#define JSF_PID_CONTROLLER_H

class CPIDController {
public:
    explicit CPIDController(float p_kp, float p_ki, float p_kd, float p_dt);
    ~CPIDController();
    
    void Reset();
    float Compute(float p_setpoint, float p_measure);

private:
    const float m_kp;
    const float m_ki;
    const float m_kd;
    const float m_dt;
    float m_integralTerm;
    float m_prevError;
    bool m_bInitialized;
    
    CPIDController(const CPIDController &);
    CPIDController& operator=(const CPIDController &);
};

#endif
```

```cpp
// pid_controller.cpp
#include "pid_controller.h"

CPIDController::CPIDController(float p_kp, float p_ki, float p_kd, float p_dt)
    : m_kp(p_kp)
    , m_ki(p_ki)
    , m_kd(p_kd)
    , m_dt(p_dt)
    , m_integralTerm(0.0F)
    , m_prevError(0.0F)
    , m_bInitialized(true)
{
}

CPIDController::~CPIDController() {
    m_bInitialized = false;
}

void CPIDController::Reset() {
    m_integralTerm = 0.0F;
    m_prevError = 0.0F;
}

float CPIDController::Compute(float p_setpoint, float p_measure) {
    if (!m_bInitialized) {
        return 0.0F;
    }
    
    const float l_error = p_setpoint - p_measure;
    const float l_pTerm = m_kp * l_error;
    
    m_integralTerm += m_ki * l_error * m_dt;
    if (m_integralTerm > 10.0F) m_integralTerm = 10.0F;
    if (m_integralTerm < -10.0F) m_integralTerm = -10.0F;
    
    const float l_dTerm = m_kd * (l_error - m_prevError) / m_dt;
    m_prevError = l_error;
    
    float l_output = l_pTerm + m_integralTerm + l_dTerm;
    if (l_output > 100.0F) l_output = 100.0F;
    if (l_output < -100.0F) l_output = -100.0F;
    
    return l_output;
}
```

JSF style 특징:
- `m_` member, `p_` parameter, `l_` local
- `F` float literal suffix
- `explicit` constructor
- Initializer list
- `const` member where appropriate
- No C-style cast
- Copy 금지 (declaration only)

## Modern C++ 변종 — 참고

같은 algorithm을 *modern style*로:

```cpp
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
    float integral_term_{0.0F};
    float prev_error_{0.0F};
};
```

차이:
- *trailing _* (Google style)
- *brace init* (C++11)
- *std::clamp* (C++17)
- *no Hungarian* / *no C prefix*
- `= delete`

같은 algorithm, 다른 style. 둘 다 valid.

## Tool 자동화

```bash
# Helix QAC — JSF rule profile
qac.exe -prj jsf.prj

# clang-tidy — modern style check
clang-tidy --checks='modernize-*,cppcoreguidelines-*,readability-*' src/

# 주요 check 예:
# modernize-use-default-member-init
# cppcoreguidelines-pro-type-cstyle-cast
# cppcoreguidelines-pro-type-static-cast-downcast
# readability-make-member-function-const
```

## 일반적인 finding (declarations / casts)

```
실전에서 자주 발견되는 위반:

1. 변수가 함수 시작에 선언되고 한참 후에 사용
2. int *p1, p2; — p2가 int인가 의도?
3. (int)f 사용 — static_cast 권장
4. Constructor body에서 m_x = 0
5. Initializer list 순서가 멤버 선언 순서와 다름
6. Single-arg ctor에 explicit 누락
7. dynamic_cast 사용 (RTTI 필요)
8. const_cast로 const 제거
```

## 정리

- **Declaration**: 사용 직전 선언, 한 줄에 하나, 명시 초기화 의무.
- **Initialization**: Constructor initializer list (멤버 선언 순서대로), `explicit` ctor.
- **Cast**: C-style 금지. `static_cast` 기본. `const_cast` / `reinterpret_cast` 회피. `dynamic_cast` 금지 (RTTI).
- **Expressions**: side effect sequence point 주의, `sizeof` 함정, bool 명시.
- *Modern C++*는 *brace init + auto + std::clamp*로 더 간결.
- 정확한 AV Rule 번호·wording은 *원문 PDF*.

## 다음 장 예고

6장은 *Statements, Functions* — goto 금지, varargs 금지, 재귀 금지.

## 관련 항목

- [Ch 4 — Macros, Types, Constants](/blog/embedded/aerospace-standards/jsf-cpp/chapter04-macros-types-constants)
- [Ch 6 — Statements, Functions](/blog/embedded/aerospace-standards/jsf-cpp/chapter06-statements-functions)
- [MISRA C Ch 4 — Syntax, Format](/blog/embedded/automotive/misra-c/chapter04-syntax-format)
- [AUTOSAR C++14 Ch 3 — Expressions](/blog/embedded/automotive/autosar-cpp/chapter03-expressions-conversions)
