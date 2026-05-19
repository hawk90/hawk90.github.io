---
title: "Ch 6: Statements + Functions"
date: 2026-05-18T07:00:00
description: "JSF C++ — goto/setjmp 금지, varargs 금지, 재귀 금지, 함수 parameter 한계, return value 검사."
tags: [jsf-cpp, statements, functions, goto, varargs, recursion, return-value]
series: "JSF C++"
seriesOrder: 6
draft: false
---

JSF C++의 *제어흐름 + 함수 정책*. *goto/setjmp/longjmp 금지*, *varargs 금지*, *재귀 금지*. 항공 SW의 *deterministic 보장* 핵심. *정확한 AV Rule 번호·wording은 원문 PDF 참조*.

## Statements

### 모든 block 중괄호

```cpp
// 회피 — 중괄호 없음
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

MISRA Rule 15.6과 같은 정신. *"goto fail" 버그* (Apple 2014)가 대표적인 단점 예.

### Switch + default

```cpp
// 회피
switch (mode) {
    case MODE_MANUAL: HandleManual(); break;
    case MODE_AUTO: HandleAuto(); break;
}

// Good
switch (mode) {
    case MODE_MANUAL: HandleManual(); break;
    case MODE_AUTO: HandleAuto(); break;
    default:
        assert(0);
        EnterSafeMode();
        break;
}
```

`default`가 *항상 있어야*. 미처 처리 안 한 case 대비.

### Switch Fallthrough 명시

```cpp
// 회피 — silent fallthrough
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
            /* fall through */
    case 2: DoB(); break;
}
```

C++17의 `[[fallthrough]]` attribute가 *더 명확*. C++03 미지원.

### Switch 2+ cases

Case 하나뿐이면 `if`로 단순화. Switch는 *2개 이상*에서 의미가 있다.

### Loop Termination 보장

```cpp
// 회피 — 무한 루프 (의도적이지만 명시 X)
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

### for / while

```cpp
// 회피 — body에서 loop counter 변경
for (int i = 0; i < n; i++) {
    if (cond) i += 5;
}

// 회피 — init/cond/iter 변수 불일치
for (int i = 0; i < n; j++) { /* ... */ }

// 회피 — floating point loop counter
for (float t = 0.0F; t < 1.0F; t += 0.1F) { /* ... */ }
```

Floating point loop가 *누적 오차*로 *예상 반복 수 다름*.

### Conditional logic

```cpp
// 회피 — else 누락
if (cond1) { DoA(); }
else if (cond2) { DoB(); }

// Good — 마지막에 else
if (cond1) { DoA(); }
else if (cond2) { DoB(); }
else {
    LogWarn("Unexpected condition");
}

// 회피 — 복잡한 condition 한 줄에
if (a && b && (c || d) && !e) { /* ... */ }

// Good — 의미 있는 이름의 boolean
bool conditionMet = a && b && (c || d) && !e;
if (conditionMet) { /* ... */ }
```

## Functions

### Function Prototype 명시

```cpp
// 회피 — old-style C
void Foo(a, b)
    int a;
    int b;
{ /* ... */ }

// Good — prototype
void Foo(int a, int b) { /* ... */ }
```

C++에서는 *old-style 금지*. 컴파일러가 대부분 reject.

### Function Parameter 수 제한

```cpp
// 회피 — 너무 많은 parameter
void Configure(int p1, int p2, int p3, int p4, int p5,
               int p6, int p7, int p8, int p9, int p10);

// Good — 구조체로
struct ConfigParams {
    int p1, p2, p3;
    int p4, p5, p6;
    int p7, p8, p9, p10;
};
void Configure(const ConfigParams &params);
```

많은 parameter가 *cognitive load 증가 + 순서 실수 위험*. *Miller의 7±2* 원리를 따른다.

### Return Value 검사

```cpp
// 회피
fopen("config", "r");           // return value 무시
strcpy(dst, src);                // strcpy returns dst

// Good
FILE *fp = fopen("config", "r");
if (fp == NULL) {
    return ERROR_FILE;
}

// 명시 무시
(void)strcpy(dst, src);
```

`(void)` cast가 *의도 무시 명시*. grep-able.

### Recursion 금지

```cpp
// 회피 — 직접 재귀
int Factorial(int n) {
    return n <= 1 ? 1 : n * Factorial(n - 1);
}

// 회피 — 간접 재귀
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
- *Worst-case stack size 보장 어려움*
- *Stack overflow가 catastrophic*

NASA JPL Power of 10 Rule 1과 같은 정신.

### Varargs 금지

```cpp
// 회피 — varargs
int LogMessage(const char *fmt, ...);

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
```

`varargs`의 일반적 위험:
- *Type safety 없음* (`printf("%d", "string")` — undefined)
- *Compiler check 불가*
- Stack 사용이 *플랫폼 의존*

C++11의 *variadic template*이 type-safe 대안. C++03 원본은 *둘 다 없음*.

### Pointer Parameter

```cpp
// 함수 parameter pointer는 const가 default 권장
void Process(const char *data, int len);  // 변경 안 함
void Modify(char *buffer, int len);        // 변경

// NULL check
void Process(const char *data, int len) {
    if (data == NULL) return;
    if (len < 0) return;
    /* ... */
}
```

### Inline Functions — 간단하게

```cpp
// OK — 간단
inline int Max(int a, int b) {
    return (a > b) ? a : b;
}

// 회피 — 50 line inline
inline void ProcessFrame(const Frame &frame) {
    /* 50 lines */
}
```

Inline은 *컴파일러 hint*. 큰 함수는 *inline 효과 없음 + binary 폭증*.

### setjmp / longjmp 금지

```cpp
// 회피
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
    if (error) longjmp(env, 1);
}
```

`setjmp/longjmp`가 *비국소 점프*. *Destructor 호출 안 됨*, *resource leak 위험*. JSF에서 금지.

## Exception 금지

JSF는 *exception 사용을 금지*. 이는 *가장 잘 알려진 JSF 정책*.

```cpp
// 회피
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

Exception 금지의 일반적 근거:

```
1. 처리 시간 비결정적
   - throw 시 stack unwinding, destructor 호출
   - WCET 분석 어려움

2. Static analysis 곤란
   - 어디서 throw, 어디서 catch?
   - Control flow가 implicit

3. 100% coverage 어려움
   - 모든 throw path 검증 곤란

4. Binary 부담
   - Exception 활성화 시 추가 metadata
```

대부분 *`-fno-exceptions`로 컴파일*하여 시도 시 *컴파일 에러*.

```bash
g++ -fno-exceptions src.cpp
clang++ -fno-exceptions src.cpp
```

### Exception 대신 — Return Code Pattern

```cpp
enum ErrorCode {
    SUCCESS = 0,
    ERROR_INVALID_ARG = -1,
    ERROR_OUT_OF_MEMORY = -2,
    ERROR_TIMEOUT = -3,
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

이런 *return code propagation*이 *JSF style의 기본*.

### Modern Alternative — `std::expected` (C++23)

```cpp
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

auto result = ProcessData(d);
if (result) {
    Use(*result);
} else {
    LogError(result.error());
}
```

*Rust Result<T, E>* 패턴. C++23의 *exception-less error handling*. 항공 친화 패턴.

## JSF Style Function 예

```cpp
// flight_controller.h
class CFlightController {
public:
    explicit CFlightController(const CFlightConfig &p_config);
    ~CFlightController();
    
    ErrorCode Initialize();
    ErrorCode Step(const CSensorData *p_pSensor, CActuatorCommand *p_pActuator);
    ErrorCode SetMode(EFlightMode p_eMode);
    EFlightMode GetCurrentMode() const;

private:
    ErrorCode UpdatePitchControl(const CSensorData *p_pSensor);
    ErrorCode UpdateRollControl(const CSensorData *p_pSensor);
    ErrorCode UpdateYawControl(const CSensorData *p_pSensor);
    
    bool             m_bInitialized;
    EFlightMode      m_eCurrentMode;
    CFlightConfig    *m_pConfig;
    CPIDController   *m_pPitchCtrl;
    CPIDController   *m_pRollCtrl;
    CPIDController   *m_pYawCtrl;
    
    CFlightController(const CFlightController &);
    CFlightController& operator=(const CFlightController &);
};
```

```cpp
// flight_controller.cpp
ErrorCode CFlightController::Step(const CSensorData *p_pSensor,
                                   CActuatorCommand *p_pActuator)
{
    // Pre-conditions
    if (p_pSensor == NULL || p_pActuator == NULL) {
        return ERROR_INVALID_ARG;
    }
    if (!m_bInitialized) {
        return ERROR_NOT_INITIALIZED;
    }
    
    // Return value 검사
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
    
    p_pActuator->SetPitch(m_pPitchCtrl->GetOutput());
    p_pActuator->SetRoll(m_pRollCtrl->GetOutput());
    p_pActuator->SetYaw(m_pYawCtrl->GetOutput());
    
    return SUCCESS;
}
```

JSF style 특징:
- Pre-condition checks
- Return code propagation (no exception)
- No recursion, no goto
- Parameter validation
- Function decomposition (각 helper가 작음)

## RAII Without Exceptions

```cpp
class CFileHandle {
public:
    explicit CFileHandle(const char *p_path);
    ~CFileHandle();
    
    bool IsValid() const { return m_pFile != NULL; }

private:
    FILE *m_pFile;
    
    CFileHandle(const CFileHandle &);
    CFileHandle& operator=(const CFileHandle &);
};

CFileHandle::CFileHandle(const char *p_path) {
    m_pFile = fopen(p_path, "r");
    // No throw on fail — caller checks IsValid()
}

CFileHandle::~CFileHandle() {
    if (m_pFile != NULL) {
        fclose(m_pFile);
        m_pFile = NULL;
    }
}

void Foo() {
    CFileHandle file("config.txt");
    if (!file.IsValid()) {
        return;
    }
    // use file — 자동 cleanup at }
}
```

Exception 없는 RAII = *constructor에서 throw 안 함*, *caller가 IsValid 확인*.

## Function 복잡도

함수 *길이 + cyclomatic complexity* 제한. JSF의 일반 지침은 *함수 짧게*. 길어지면 *decomposition*.

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
    
    return CheckFaults();
}
```

각 sub-function이 짧으면 *cyclomatic complexity 낮음 + test 쉬움*.

## Ada 영향 — 일반적인 관찰

C/C++ 이전 *항공 임베디드 분야*는 *Ada* 사용이 일반적이었다 (Ada83 / Ada95). Ada가 *strong typing + exception 처리 deterministic* 같은 특성을 가진다.

```ada
-- Ada
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
// JSF C++ style
ErrorCode ProcessData(const Data &p_input, Result &p_output) {
    if (!IsValid(p_input)) {
        return ERROR_INVALID_ARG;
    }
    
    Compute(p_input, p_output);
    return SUCCESS;
}
```

구조가 유사. JSF style이 *Ada-like programming*을 C++에 적용한 측면이 있다는 *기술적 관찰*은 산업 문헌에 자주 등장한다.

### SPARK Ada

*SPARK*는 Ada subset + *formal verification* 도구. *Runtime error 부재 증명* 가능. 일부 *highest-criticality* 영역에 사용. 자세히는 [adacore.com](https://www.adacore.com/sparkpro) 참조.

## 일반적인 finding (functions)

```
실전에서 자주 발견되는 위반:

1. 함수 parameter 수 과다
2. fopen / strcpy return 값 무시
3. Recursive function (직접 또는 간접)
4. varargs (...) 사용
5. try/catch 사용
6. setjmp + longjmp
7. 50+ line inline function
8. default 없는 switch
```

## 정리

- **Statements**: 모든 block 중괄호, switch+default, fallthrough 명시, loop termination 보장.
- **Functions**: parameter 적게, return value 검사, recursion/varargs/setjmp 금지.
- **Exception 금지** — return code pattern으로 대체.
- *RAII는 exception 없이* — constructor에서 throw 안 함, IsValid 확인.
- *Ada-like programming* 정신 — strong typing + return-code error.
- *C++23 std::expected*가 modern alternative.
- *Function decomposition*이 핵심 practice.
- 정확한 AV Rule 번호·wording은 *원문 PDF*.

## 다음 장 예고

7장은 *Classes basic* — class vs struct, encapsulation, friend, operator overload.

## 관련 항목

- [Ch 5 — Declarations, Casts](/blog/embedded/aerospace-standards/jsf-cpp/chapter05-declarations-casts)
- [Ch 7 — Classes basic](/blog/embedded/aerospace-standards/jsf-cpp/chapter07-classes-basic)
- [Ch 10 — Exceptions, Memory](/blog/embedded/aerospace-standards/jsf-cpp/chapter10-exceptions-memory-library)
- [MISRA C Ch 8 — Functions](/blog/embedded/automotive/misra-c/chapter08-functions)
- [NASA JPL Power of 10](/blog/embedded/aerospace-standards/jpl-power-of-ten/chapter01-the-ten-rules)
