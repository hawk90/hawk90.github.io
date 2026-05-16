---
title: "Ch 6: Statements + Functions (Rule 159-208)"
date: 2025-09-30T07:00:00
description: "JSF C++ Rule 159-208 — goto/setjmp 금지, varargs 금지, 재귀 금지, 함수 7 parameter 한계, return value 검사."
tags: [jsf-cpp, statements, functions, goto, varargs, recursion, return-value]
series: "JSF C++"
seriesOrder: 6
draft: false
---

JSF C++ Rule 159-208이 *제어흐름 + 함수 정책*. *goto/setjmp/longjmp 절대 금지*, *varargs 거의 금지*, *재귀 금지*. 항공 SW의 *deterministic 보장* 핵심. 이 장은 *각 rule + ADA 영향 + F-35 패턴*까지.

## AV Rule 159-175 — Statements

### AV Rule 159 — Control Statement Block

```
AV Rule 159 (Will)
"Statements within compound statement (block) shall have explicit
 braces."
```

```cpp
// 위반 — 중괄호 없음
if (cond) DoSomething();
while (i < n) i++;

// Good
if (cond) {
    DoSomething();
}
while (i < n) {
    i++;
}
```

MISRA Rule 15.6과 동일. *"goto fail" 버그*가 단적인 예 (Apple 2014).

### AV Rule 160 — Switch + Default

```cpp
// 위반 — default 없음
switch (mode) {
    case MODE_MANUAL: HandleManual(); break;
    case MODE_AUTO: HandleAuto(); break;
}

// Good
switch (mode) {
    case MODE_MANUAL: HandleManual(); break;
    case MODE_AUTO: HandleAuto(); break;
    default:
        assert(0);  // unexpected
        EnterSafeMode();
        break;
}
```

`default`가 *항상 있어야*. 미처 처리 안 한 case 대비.

### AV Rule 161 — Switch Fallthrough 명시

```cpp
// 위반 — break 누락 (silent fallthrough)
switch (x) {
    case 1: DoA();
    case 2: DoB(); break;
}

// Good — 명시적 break
switch (x) {
    case 1: DoA(); break;
    case 2: DoB(); break;
}

// 의도적 fallthrough — 주석
switch (x) {
    case 1: DoA();
            /* fall through */  // 명시
    case 2: DoB(); break;
}
```

C++17의 *`[[fallthrough]]`* attribute가 *더 명확*하지만 *C++03 미지원*.

### AV Rule 162 — Switch with 2+ cases

```cpp
// 위반 — case 1개 + default
switch (x) {
    case 1: DoA(); break;
    default: DoX(); break;
}

// Good — if/else로
if (x == 1) {
    DoA();
} else {
    DoX();
}
```

Case 하나면 *switch가 over-engineering*. `if`로 단순화.

### AV Rule 163 — Loop Termination 보장

```
AV Rule 163 (Will)
"All loops must have a non-trivial termination test."
```

```cpp
// 위반 — 무한 루프 (의도적이지만 명시 X)
while (true) {
    if (cond) break;
    DoWork();
}

// Good — 명시적 무한 + 명확한 exit
for (;;) {
    if (cond) break;
    DoWork();
}

// 또는 상한 명시 (NASA JPL Rule 2 정신)
for (int i = 0; i < MAX_ITERATIONS; i++) {
    if (cond) break;
    DoWork();
}
```

NASA JPL의 *Power of 10 Rule 2*와 같은 정신.

### AV Rule 164-170 — for/while/do-while

```cpp
// AV Rule 164 (Should)
// for loop counter 변경 금지 (body 안에서)
for (int i = 0; i < n; i++) {
    if (cond) i += 5;  // 위반 — 외부 변경
}

// AV Rule 165 (Should)
// for loop의 init/cond/iter 모두 *같은 변수* 사용
for (int i = 0; i < n; j++) {  // 위반 — j ≠ i
    ...
}

// AV Rule 166 (Should)
// for loop 평가 floating point 금지 (MISRA Rule 14.1)
for (float t = 0.0F; t < 1.0F; t += 0.1F) {  // 위반
    ...
}
```

### AV Rule 171-175 — Conditional Logic

```cpp
// AV Rule 171 (Should)
// if/else if chain의 *마지막은 항상 else*
if (cond1) { DoA(); }
else if (cond2) { DoB(); }
// 위반 — else 누락

// Good
if (cond1) { DoA(); }
else if (cond2) { DoB(); }
else {
    // unexpected (intentional empty)
    log_warn("Unexpected condition");
}

// AV Rule 172 (Should)
// Complex condition 단순화
if (a && b && (c || d) && !e) { ... }  // 복잡

// Good
bool conditionMet = a && b && (c || d) && !e;
if (conditionMet) { ... }
```

## AV Rule 176-200 — Functions

### AV Rule 176 — Function Prototype 명시

```cpp
// 위반 — old-style C
void Foo(a, b)
    int a;
    int b;
{
    /* ... */
}

// Good — prototype
void Foo(int a, int b) {
    /* ... */
}
```

C++03부터 *old-style 금지*. 컴파일러가 *대부분 reject*.

### AV Rule 177 — Function Parameter 7 이하

```cpp
// 위반
void Configure(int p1, int p2, int p3, int p4, int p5,
               int p6, int p7, int p8, int p9, int p10);  // 10 parameters

// Good — 구조체로
struct ConfigParams {
    int p1, p2, p3, p4, p5;
    int p6, p7, p8, p9, p10;
};
void Configure(const ConfigParams &params);

// 또는 builder 패턴
class ConfigBuilder {
public:
    ConfigBuilder& SetP1(int v) { /* ... */; return *this; }
    ConfigBuilder& SetP2(int v) { /* ... */; return *this; }
    /* ... */
    Config Build();
};
```

7개 한계가 *Miller's number* (인간 작업기억 7±2)에서 영감. *cognitive load* 감소.

### AV Rule 178 — Return Value Check

```cpp
// 위반
fopen("config", "r");           // return value 무시
strcpy(dst, src);                // strcpy returns dst

// Good
FILE *fp = fopen("config", "r");
if (fp == NULL) {
    return ERROR_FILE;
}

// 명시 무시
(void)strcpy(dst, src);          // intentional discard
```

`(void)` cast가 *의도 무시 명시*. *grep-able*.

### AV Rule 179 — Recursive Function 금지

```
AV Rule 179 (Will)
"Functions shall not call themselves, either directly or indirectly
 (i.e. recursion shall not be allowed)."
```

```cpp
// 위반 — 직접 재귀
int Factorial(int n) {
    return n <= 1 ? 1 : n * Factorial(n - 1);
}

// 위반 — 간접 재귀
void Foo() { Bar(); }
void Bar() { Foo(); }

// Good — iteration
int Factorial(int n) {
    int result = 1;
    for (int i = 2; i <= n; i++) result *= i;
    return result;
}

// Tree traversal — 명시적 스택
class StackBasedWalker {
public:
    void Walk(Node *root) {
        Node *stack[MAX_DEPTH];
        int top = 0;
        stack[top++] = root;
        
        while (top > 0) {
            Node *n = stack[--top];
            Visit(n);
            if (n->right && top < MAX_DEPTH) stack[top++] = n->right;
            if (n->left && top < MAX_DEPTH) stack[top++] = n->left;
        }
    }
};
```

이유:
- *Stack 사용량 정적 분석 불가*
- 항공기 *worst-case stack* 알아야 안전
- *Stack overflow가 catastrophic*

NASA JPL Power of 10과 동일.

### AV Rule 180 — Varargs (`...`) 금지

```
AV Rule 180 (Will)
"All variable parameter declarations and references shall not be used."
```

```cpp
// 위반
int LogMessage(const char *fmt, ...);  // varargs

// Good — overload
int LogMessage(const char *fmt);
int LogMessage(const char *fmt, int arg1);
int LogMessage(const char *fmt, int arg1, int arg2);

// 또는 structured
struct LogEntry {
    LogLevel level;
    const char *module;
    const char *message;
    int errorCode;
};
int LogMessage(const LogEntry &entry);

// 또는 stream
std::ostringstream oss;
oss << "Error: " << error << " in " << module;
LogString(oss.str());
```

`varargs` 위험:
- *Type safety 없음* (printf("%d", "string") — undefined)
- *Compiler check 못함*
- *Stack 사용 비표준*

C++11의 *variadic template*가 *type-safe 대안*. JSF C++03 원본은 *둘 다 금지*.

### AV Rule 181-185 — Pointer 처리

```cpp
// AV Rule 181 (Should)
// 함수 parameter pointer는 *const*가 default
void Process(const char *data, int len);  // data 변경 안 함
void Modify(char *buffer, int len);        // buffer 변경

// AV Rule 182 (Will)
// pointer parameter NULL check
void Process(const char *data, int len) {
    if (data == NULL) return;
    if (len < 0) return;
    /* ... */
}
```

### AV Rule 186-190 — Inline Functions

```cpp
// AV Rule 186 (Should)
// Inline 함수는 *간단*
inline int Max(int a, int b) {
    return (a > b) ? a : b;
}

// 위반 — 50 line inline
inline void ProcessFrame(const Frame &frame) {
    /* 50 lines of complex logic */
}
```

Inline은 *컴파일러 hint*. 큰 함수는 *inline 효과 없음 + code bloat*.

### AV Rule 191-195 — setjmp/longjmp 금지

```
AV Rule 174 (Will not)
"The setjmp macro and the longjmp function shall not be used."
```

```cpp
// 위반
#include <csetjmp>
jmp_buf env;

void Foo() {
    if (setjmp(env) == 0) {
        DoWork();
    } else {
        // jumped back here
    }
}

void DoWork() {
    if (error) longjmp(env, 1);  // 위반 — 비국소 점프
}
```

`setjmp/longjmp`가 *비국소 점프*. *Destructor 호출 안 됨*, *exception unwinding 안 됨*.

C++ exception (try/catch)이 *대안*이지만 *JSF Rule 196에서 exception도 금지*.

→ *return code* + *explicit error handling*만 남음.

## AV Rule 196 — Exception 금지 (가장 유명)

```
AV Rule 196 (Will not)
"Exceptions shall not be used."
```

```cpp
// 위반
try {
    DoWork();
} catch (const std::exception &e) {
    HandleError(e);
}

// Good — return code
int rc = DoWork();
if (rc != SUCCESS) {
    HandleError(rc);
}
```

JSF가 *exception 완전 금지*한 이유 (Lockheed Martin 문서):

```
1. 처리 시간 비결정적
   - try/catch가 *normal case* 비용 0
   - 그러나 *throw 시* 비용 큼 (stack unwinding, destructor 호출)
   - WCET 분석 어려움

2. Static analysis 곤란
   - 어디서 throw 가능?
   - Catch가 어디서 잡나?
   - Control flow가 *모든 함수에 implicit*

3. MC/DC coverage
   - 모든 throw path 검증
   - exception handler 모두 테스트
   - 효과적 100% 어려움

4. Bin size + RTTI
   - Exception 활성화 시 RTTI 필요 (some impl)
   - Binary 큼

5. 항공 standard
   - JSF Rule 196 (강제)
   - MISRA C++:2008 (회피 권장)
   - AUTOSAR C++14 (회피 권장)
```

대부분 항공 SW가 *`-fno-exceptions`로 컴파일*. 시도하면 *컴파일 에러*.

```bash
g++ -fno-exceptions src.cpp
```

### Exception 대신 — Return Code Pattern

```cpp
// 모든 함수 return int (또는 enum)
enum ErrorCode {
    SUCCESS = 0,
    ERROR_INVALID_ARG = -1,
    ERROR_OUT_OF_MEMORY = -2,
    ERROR_TIMEOUT = -3,
    /* ... */
};

ErrorCode ProcessData(const Data &input, Result &output) {
    if (input.IsValid() == false) {
        return ERROR_INVALID_ARG;
    }
    
    if (Compute(input, output) != SUCCESS) {
        return ERROR_INVALID_ARG;
    }
    
    return SUCCESS;
}

// 호출
Result r;
ErrorCode ec = ProcessData(d, r);
if (ec != SUCCESS) {
    LogError(ec);
    EnterSafeMode();
}
```

이런 *return code propagation*이 *F-35의 표준*. *exception의 모든 use case 대체*.

### Modern Alternative — `std::expected` (C++23)

```cpp
// C++23
std::expected<Result, ErrorCode> ProcessData(const Data &input) {
    if (!input.IsValid()) {
        return std::unexpected(ERROR_INVALID_ARG);
    }
    
    Result r;
    if (auto rc = Compute(input, r); rc != SUCCESS) {
        return std::unexpected(rc);
    }
    
    return r;
}

// 호출
auto result = ProcessData(d);
if (result) {
    Use(*result);
} else {
    LogError(result.error());
}
```

*Rust의 Result<T, E>* 패턴. C++23의 *exception-less error handling*. *항공 친화*.

## 실전 — JSF Style Function

```cpp
// flight_controller.h

class CFlightController {
public:
    // explicit constructor
    explicit CFlightController(const CFlightConfig &p_config);
    ~CFlightController();
    
    // No copy
    CFlightController(const CFlightController &) = delete;  // C++11
    CFlightController& operator=(const CFlightController &) = delete;
    
    // Public methods — clear contract
    ErrorCode Initialize();
    ErrorCode Step(const CSensorData *p_pSensor, CActuatorCommand *p_pActuator);
    ErrorCode SetMode(EFlightMode p_eMode);
    EFlightMode GetCurrentMode() const;
    
private:
    // Helper functions (no recursion)
    ErrorCode UpdatePitchControl(const CSensorData *p_pSensor);
    ErrorCode UpdateRollControl(const CSensorData *p_pSensor);
    ErrorCode UpdateYawControl(const CSensorData *p_pSensor);
    
    // Members
    bool             m_bInitialized;
    EFlightMode      m_eCurrentMode;
    CFlightConfig    *m_pConfig;
    CPIDController   *m_pPitchCtrl;
    CPIDController   *m_pRollCtrl;
    CPIDController   *m_pYawCtrl;
};
```

```cpp
// flight_controller.cpp

ErrorCode CFlightController::Step(const CSensorData *p_pSensor,
                                   CActuatorCommand *p_pActuator)
{
    // Pre-conditions (AV Rule 182)
    if (p_pSensor == NULL || p_pActuator == NULL) {
        return ERROR_INVALID_ARG;
    }
    if (!m_bInitialized) {
        return ERROR_NOT_INITIALIZED;
    }
    
    // Update each axis (return value 검사 — AV Rule 178)
    ErrorCode l_ec = UpdatePitchControl(p_pSensor);
    if (l_ec != SUCCESS) {
        return l_ec;
    }
    
    l_ec = UpdateRollControl(p_pSensor);
    if (l_ec != SUCCESS) {
        return l_ec;
    }
    
    l_ec = UpdateYawControl(p_pSensor);
    if (l_ec != SUCCESS) {
        return l_ec;
    }
    
    // Combine outputs (no exception, no recursion)
    p_pActuator->SetPitch(m_pPitchCtrl->GetOutput());
    p_pActuator->SetRoll(m_pRollCtrl->GetOutput());
    p_pActuator->SetYaw(m_pYawCtrl->GetOutput());
    
    return SUCCESS;
}
```

JSF style 특징:
- *Pre-condition checks*
- *Return code propagation* (no exception)
- *No recursion*
- *No goto*
- *Single exit point* (구조)
- *Parameter validation*

## RAII Without Exceptions

JSF는 *exception 없이 RAII 사용*. *Destructor가 *exception 없이*도 cleanup*.

```cpp
class CFileHandle {
public:
    explicit CFileHandle(const char *p_path);
    ~CFileHandle();
    
    bool IsValid() const { return m_pFile != NULL; }
    
    // No copy
    CFileHandle(const CFileHandle &) = delete;
    CFileHandle& operator=(const CFileHandle &) = delete;

private:
    FILE *m_pFile;
};

CFileHandle::CFileHandle(const char *p_path) {
    m_pFile = fopen(p_path, "r");
    // No exception throw on fail
    // Caller checks IsValid()
}

CFileHandle::~CFileHandle() {
    if (m_pFile != NULL) {
        fclose(m_pFile);
        m_pFile = NULL;
    }
}

// 사용
void Foo() {
    CFileHandle file("config.txt");
    if (!file.IsValid()) {
        // handle error (no exception)
        return;
    }
    
    // use file
    // 자동으로 destructor에서 fclose
}
```

Exception 없는 RAII = *check IsValid()*. 약간 verbose지만 *deterministic*.

## ADA 영향 — F/A-18, F-22 Heritage

F-35 *이전 세대*는 *Ada*. Ada가 *exception 가지만 deterministic*. JSF C++가 *Ada-like programming*을 C++에 강요.

```ada
-- Ada (F/A-18)
procedure Process_Data
    (Input  : in     Data_Type;
     Output :    out Result_Type;
     Status :    out Status_Type)
is
begin
    if not Is_Valid(Input) then
        Status := Invalid_Argument;
        return;
    end if;
    
    Compute(Input, Output);
    Status := Success;
end Process_Data;
```

```cpp
// C++ JSF style (F-35)
ErrorCode ProcessData(const Data &p_input, Result &p_output) {
    if (!IsValid(p_input)) {
        return ERROR_INVALID_ARG;
    }
    
    Compute(p_input, p_output);
    return SUCCESS;
}
```

*거의 동일 구조*. C++ JSF style이 *Ada 스타일을 C++로 옮긴 것*.

## ADA Comeback?

F-35 이후 *Ada가 재조명*:

```
2010s-2020s Ada renaissance:
  - Boeing 787 일부 Ada
  - ESA 새 mission Ada 검토
  - Critical SW가 Ada (RTCA DO-333 formal methods)
  - SPARK Ada (subset, formal verification)

이유:
  - Ada가 *exception 처리 deterministic*
  - SPARK이 *formal proof로 runtime error 부재 증명*
  - C++의 *복잡성 회피*

미래:
  - Ada + Modern C++ 공존
  - Critical은 SPARK Ada
  - 일반은 C++ (MISRA, AUTOSAR)
```

KAI / KARI도 *Ada 검토* 가능성. 학습 가치 큼.

## 함수 복잡도 — AV Rule 3 재방문

함수 *200 LSLOC + cyclomatic 20* 한계. 함수가 *길어지는 패턴*:

```cpp
// 안티 패턴 — 큰 함수
ErrorCode ProcessFlight() {
    // Mode 결정 (50 lines)
    // Control law (60 lines)
    // Telemetry (40 lines)
    // Fault check (50 lines)
    // ... 200+ lines
}

// 리팩토링
ErrorCode ProcessFlight() {
    ErrorCode ec = UpdateMode();
    if (ec != SUCCESS) return ec;
    
    ec = ApplyControlLaw();
    if (ec != SUCCESS) return ec;
    
    ec = UpdateTelemetry();
    if (ec != SUCCESS) return ec;
    
    ec = CheckFaults();
    return ec;
}

// 각 sub-function < 60 LSLOC, CCN < 10
```

이런 *function decomposition*이 *JSF + 다른 모든 표준의 공통 권장*.

## Common Findings — Functions

```
실전 finding:

1. "ProcessData(int p1, int p2, ..., int p10) — 10 parameters"
   → AV Rule 177 위반 (≤7)

2. "fopen() return 무시"
   → AV Rule 178 위반

3. "Recursive ParseExpression() function"
   → AV Rule 179 위반

4. "varargs LogMessage(fmt, ...)"
   → AV Rule 180 위반

5. "try { ... } catch (...) { ... } 사용"
   → AV Rule 196 위반

6. "setjmp + longjmp pattern"
   → AV Rule 174 위반

7. "Inline function 100 lines"
   → AV Rule 186 위반

8. "default 없는 switch"
   → AV Rule 160 위반
```

## 정리

- **Statements**: 모든 block 중괄호, switch+default, fallthrough 명시, loop termination 보장.
- **Functions**: 7 parameter, return value 검사, recursion/varargs/setjmp 금지.
- **Exception 완전 금지** (Rule 196) — return code pattern으로 대체.
- *RAII는 exception 없이* — destructor에서만 cleanup.
- *Ada 영향*: F/A-18, F-22 → F-35의 *Ada-like C++*.
- *C++23 std::expected*가 *modern alternative*.
- *Function decomposition*이 *core practice*.

## 다음 장 예고

7장은 *Classes basic* (Rule 67-95) — class vs struct, encapsulation, friend, operator overload.

## 관련 항목

- [Ch 5 — Declarations, Casts](/blog/embedded/aerospace-standards/jsf-cpp/chapter05-declarations-casts)
- [Ch 7 — Classes basic](/blog/embedded/aerospace-standards/jsf-cpp/chapter07-classes-basic)
- [Ch 10 — Exceptions, Memory](/blog/embedded/aerospace-standards/jsf-cpp/chapter10-exceptions-memory-library)
- [MISRA C Ch 8 — Functions](/blog/embedded/car-standards/misra-c/chapter08-functions)
- [NASA JPL Power of 10](/blog/embedded/aerospace-standards/jpl-power-of-ten/chapter01-the-ten-rules)
