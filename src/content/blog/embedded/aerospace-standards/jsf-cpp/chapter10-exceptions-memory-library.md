---
title: "Ch 10: Exceptions, Memory, Library, Multi-threading (Rule 191-220)"
date: 2025-09-30T11:00:00
description: "JSF C++ Rule 191-220 — Exception 완전 금지, new/delete 거의 금지, STL 부분 사용, multi-threading 정책."
tags: [jsf-cpp, exceptions, memory, new-delete, stl, multi-threading, static-pool]
series: "JSF C++"
seriesOrder: 10
draft: false
---

JSF C++의 *가장 strict한 영역*. *Exception 완전 금지*, *dynamic memory 거의 금지*, *STL 일부만 사용*, *multi-threading은 OS가 관리*. 항공 SW의 *deterministic 최우선*. 이 장은 *각 영역 + F-35 적용 + alternative*까지.

## AV Rule 191-200 — Exception 완전 금지

```
AV Rule 196 (Will not) — 가장 유명
"Exceptions shall not be used."
```

이미 Ch 6에서 깊이 본 *Exception 금지*. 추가 detail:

### AV Rule 191 — `throw` 금지

```cpp
// 위반
throw std::runtime_error("error");
throw 42;
throw "literal";

// Good — return code
return ERROR_CODE;
```

### AV Rule 192 — `try`/`catch` 금지

```cpp
// 위반
try {
    DoSomething();
} catch (const std::exception &e) {
    HandleError();
}

// Good — error code propagation
if (DoSomething() != SUCCESS) {
    HandleError();
}
```

### AV Rule 193 — `throw` 명세 금지

```cpp
// 위반 (C++03)
void Foo() throw(std::exception);
void Bar() throw();   // empty throw spec

// Good
void Foo() {
    /* return code */
}

// C++11 noexcept도 회피 (exception 자체 금지므로)
```

### AV Rule 194 — `std::terminate`, `std::unexpected` 회피

Exception 없으면 *호출 안 됨*. Defensive 회피.

### AV Rule 195 — Destructor에서 throw 금지

```cpp
// 위반 (C++03 era)
class CFoo {
public:
    ~CFoo() {
        if (error) throw 42;  // 위반
    }
};
```

Exception 없으니 trivial. 단 *destructor에서 cleanup 실패*는 *로그 + safe mode*.

```cpp
// Good
class CFoo {
public:
    ~CFoo() {
        if (Cleanup() != SUCCESS) {
            LogError("Cleanup failed");
            // 다른 action 없음 (destructor라서)
        }
    }
};
```

## AV Rule 201-210 — Memory Management

JSF의 *strictly limited dynamic memory*. NASA JPL Power of 10 Rule 3과 동일.

### AV Rule 206 — `new`/`delete` 거의 금지

```
AV Rule 206 (Should)
"Use of new and delete shall be limited to initialization phase."
```

```cpp
// 위반 — runtime allocation
class CFlightController {
public:
    void Process() {
        Buffer *buf = new Buffer(1024);  // 위반 — runtime allocation
        DoWork(buf);
        delete buf;
    }
};

// Good — 초기화 단계만
class CFlightController {
public:
    int Initialize() {
        m_pBuffer = new Buffer(1024);   // OK — init phase
        return (m_pBuffer != NULL) ? SUCCESS : ERROR_NO_MEMORY;
    }
    
    void Process() {
        // m_pBuffer 사용 (no new)
        DoWork(m_pBuffer);
    }
    
    ~CFlightController() {
        delete m_pBuffer;   // cleanup at shutdown
    }

private:
    Buffer *m_pBuffer;
};
```

### Static Pool 패턴

```cpp
// 정적 풀 (NASA JPL pattern)
class CCanMessagePool {
public:
    static CCanMessage* Acquire() {
        for (int i = 0; i < POOL_SIZE; i++) {
            if (!s_used[i]) {
                s_used[i] = true;
                return &s_pool[i];
            }
        }
        return NULL;
    }
    
    static void Release(CCanMessage *p_pMsg) {
        int index = static_cast<int>(p_pMsg - s_pool);
        if (index >= 0 && index < POOL_SIZE) {
            s_used[index] = false;
        }
    }

private:
    static const int POOL_SIZE = 32;
    static CCanMessage s_pool[POOL_SIZE];   // 정적 storage
    static bool s_used[POOL_SIZE];
};

// 정적 멤버 정의
CCanMessage CCanMessagePool::s_pool[POOL_SIZE];
bool CCanMessagePool::s_used[POOL_SIZE] = {false};

// 사용
void ProcessCanFrame() {
    CCanMessage *msg = CCanMessagePool::Acquire();
    if (msg == NULL) {
        // pool 고갈 (예상치 못함)
        EnterSafeMode();
        return;
    }
    
    msg->Init(/* ... */);
    Transmit(msg);
    
    CCanMessagePool::Release(msg);
}
```

이 패턴이 *F-35의 표준*. *런타임 new 없음*.

### AV Rule 207 — `placement new` 회피

```cpp
// 위반 — placement new
void *p = malloc(sizeof(CFoo));
CFoo *foo = new (p) CFoo();   // placement new

// Good — 정적 storage + manual init
static CFoo s_foo;  // 정적 instance
CFoo *foo = &s_foo;
foo->Init(/* ... */);
```

Placement new는 *advanced + dangerous*. JSF 회피.

### AV Rule 208 — `delete[]`/`delete` 짝

```cpp
// 위반
int *arr = new int[100];
delete arr;       // 위반 — new[]에는 delete[]

// Good
int *arr = new int[100];
delete[] arr;     // 짝 맞춤

// 또는 (JSF 권장) 정적
int s_arr[100];   // no delete needed
```

### AV Rule 209 — Memory Leak 방지

```cpp
// 위반 — leak pattern
void Foo() {
    int *p = new int[100];
    if (error) return;     // 위반 — leak!
    delete[] p;
}

// Good — single exit + cleanup
void Foo() {
    int *p = new int[100];
    if (p == NULL) return;
    
    if (!error) {
        // do work
    }
    
    delete[] p;
}

// 또는 RAII
class CArrayHolder {
public:
    explicit CArrayHolder(int n) : m_pData(new int[n]) {}
    ~CArrayHolder() { delete[] m_pData; }
    
    int* Get() { return m_pData; }

private:
    int *m_pData;
    CArrayHolder(const CArrayHolder &);  // no copy
    CArrayHolder& operator=(const CArrayHolder &);
};

void Foo() {
    CArrayHolder holder(100);   // RAII
    if (error) return;          // 자동 cleanup at destructor
    // do work
}
```

RAII가 *exception 없이도 cleanup*. JSF에 광범위.

## AV Rule 211-220 — Library Use

### AV Rule 211 — STL 사용 제한

```
AV Rule 211 (Should)
"STL containers shall not be used."
```

JSF가 *STL containers 회피*:
- `std::vector` — 동적 메모리
- `std::list` — 동적 메모리
- `std::map` — 동적 메모리 + red-black tree (복잡)
- `std::set` — 동적 메모리
- `std::deque` — 동적 메모리

대안:
```cpp
// 자체 fixed-size 컨테이너
template <typename T, int N>
class CFixedVector { /* ... */ };

template <typename Key, typename Value, int N>
class CFixedMap { /* ... */ };

CFixedVector<int, 100> v;
CFixedMap<int, CString, 32> map;
```

자체 구현이 *static memory*. *Real-time deterministic*.

### AV Rule 212 — `std::string` 회피

```cpp
// 위반 — std::string 동적 메모리
std::string name = "F-35";
name += " Lightning";   // 메모리 재할당 가능

// Good — C-string 또는 fixed buffer
const char *name = "F-35";
char buffer[64];
strncpy(buffer, name, sizeof(buffer) - 1);
buffer[sizeof(buffer) - 1] = '\0';
```

C-string이 *deterministic*. 단 *unsafe* (overflow 가능).

### AV Rule 213 — STL Algorithms는 OK (조건부)

```cpp
// OK — STL algorithm은 *container 가정 없음*
int data[100];
std::sort(data, data + 100);   // C array sort
std::find(data, data + 100, 42);
```

Algorithms는 *iterator 추상*. C array에서도 동작. *Container 없이 algorithm 사용*.

### AV Rule 214-216 — C 라이브러리 사용

```cpp
// OK — C 라이브러리 (조심해서)
#include <cstring>
#include <cstdio>
#include <cmath>

// 위반 회피:
strcpy(dst, src);          // 위반 — buffer overflow
strncpy(dst, src, n);      // OK with size

printf("%d", x);           // OK
gets(buffer);              // 위반 — 완전 금지

malloc(100);               // 위반 (no dynamic memory)
```

C 표준 일부 *완전 금지* (gets, atoi 등 unsafe). MISRA C와 동일.

### AV Rule 217 — `<iostream>` 회피

```cpp
// 회피 — iostream
std::cout << "Hello" << std::endl;

// Good — C-style
printf("Hello\n");

// 또는 자체 logger
LogInfo("Hello");
```

`std::cout`이 *heap 사용 + heavy*. C-style이 *predictable*.

### AV Rule 218 — Boost 등 외부 library 제한

```cpp
// 회피 — Boost 의존
#include <boost/shared_ptr.hpp>
boost::shared_ptr<CFoo> p(new CFoo);

// Good — 자체 구현
class CFooHandle {
    /* manual lifecycle management */
};
```

외부 library가 *부담*:
- *Source code review 필요*
- *Qualification 부담*
- *Maintenance dependency*

JSF는 *minimum external dependency*. *자체 lightweight library*.

### AV Rule 219-220 — Headers

```cpp
// AV Rule 219 (Should)
// 표준 header만 사용
#include <cstdint>
#include <cmath>
// 외부 header는 신중 review 후

// AV Rule 220 (Should)
// Conditional inclusion 제한
#ifdef _WIN32
#include <windows.h>
#endif
// → 회피 (platform-specific)
// → HAL layer로 분리
```

## Multi-threading — JSF 접근

JSF C++03 시절 *C++ 표준 threading 없음*. *OS-level threading*.

```cpp
// 위반 — pthread 직접
#include <pthread.h>

void* WorkerThread(void *arg) {
    /* ... */
    return NULL;
}

pthread_t tid;
pthread_create(&tid, NULL, WorkerThread, NULL);

// Good — OS 추상화 (custom or VxWorks)
class CTask {
public:
    CTask(const char *p_pName, int p_priority);
    int Start();
    int Stop();
    
protected:
    virtual void Run() = 0;
};

class CSensorTask : public CTask {
protected:
    void Run() override {
        while (m_bRunning) {
            ReadSensor();
            Sleep(20);  // 50 Hz
        }
    }
};

CSensorTask sensor_task("SensorTask", PRIORITY_HIGH);
sensor_task.Start();
```

F-35는 *RTOS (VxWorks)* 위에서 동작. *OS-level task* 사용.

### Mutex (RTOS API)

```cpp
class CMutex {
public:
    CMutex();
    ~CMutex();
    
    int Lock(int p_timeoutMs = INFINITE);
    int Unlock();

private:
    void *m_pOsHandle;   // OS-specific (HAL)
};

class CScopedLock {
public:
    explicit CScopedLock(CMutex *p_pMutex)
        : m_pMutex(p_pMutex) {
        m_pMutex->Lock();
    }
    
    ~CScopedLock() {
        m_pMutex->Unlock();
    }

private:
    CMutex *m_pMutex;
    CScopedLock(const CScopedLock &);
    CScopedLock& operator=(const CScopedLock &);
};

// 사용
void Foo() {
    CScopedLock lock(&g_mutex);
    // critical section
}   // 자동 unlock (RAII)
```

OS abstraction layer가 *portable*. JSF + VxWorks → JSF + Linux도 같은 코드.

### Lock-free 회피

```cpp
// 회피 — lock-free
std::atomic<int> counter;
counter.fetch_add(1, std::memory_order_relaxed);

// Good — mutex
class CCounter {
public:
    int Increment() {
        CScopedLock lock(&m_mutex);
        return ++m_value;
    }
private:
    int m_value;
    CMutex m_mutex;
};
```

Lock-free가 *complex + error-prone*. JSF는 *mutex 권장*.

## RTOS — VxWorks for F-35

F-35의 RTOS = *Wind River VxWorks*. *DO-178B/C qualified*.

```
VxWorks Cert:
  - DO-178C DAL A qualified
  - ARINC 653 IMA support
  - Wind River 표준 (Boeing, Airbus, Lockheed 다수 사용)
  - Wind River 인증 cost: 수억원

Alternative:
  - Green Hills INTEGRITY
  - LynxOS-178
  - DDC-I Deos (자세 제어 강함)
  - SYSGO PikeOS
```

F-35 SW가 *VxWorks 위*. 모든 task가 *VxWorks API*.

## Heap 사용 — JSF Strategy

```
JSF Heap Strategy:

Phase 1: Initialization (boot)
  - new/malloc OK
  - 모든 데이터 구조 할당
  - Pool initialization

Phase 2: Operation (runtime)
  - new/malloc 금지
  - 정적 또는 pool에서만
  - Deterministic

Phase 3: Shutdown
  - delete/free OK
  - Cleanup

→ Mission-critical operational phase에 *zero heap activity*
```

이 strategy가 *real-time deterministic 보장*. *heap fragmentation 회피*.

## Static Storage 패턴

```cpp
// 모든 데이터를 정적으로
class CFlightSystem {
public:
    // No new — instance가 정적
    static CFlightSystem& Instance() {
        static CFlightSystem s_instance;
        return s_instance;
    }
    
    int Initialize();
    int Step();

private:
    CFlightSystem();
    ~CFlightSystem();
    
    // 모든 멤버 정적 또는 stack
    CFlightController m_flightCtrl;        // value
    CFaultManager m_faultMgr;
    CSensorManager m_sensorMgr;
    
    char m_logBuffer[8192];               // 고정 buffer
    CCanMessage m_msgPool[32];            // 고정 pool
};
```

전체 시스템이 *.bss 또는 .data 섹션*. 컴파일 시 *완전 결정*.

## File Static Variables

```cpp
// flight_state.cpp
static int s_currentMode = 0;
static bool s_bInitialized = false;
static CMutex s_modeMutex;

int GetMode() {
    CScopedLock lock(&s_modeMutex);
    return s_currentMode;
}

void SetMode(int p_newMode) {
    CScopedLock lock(&s_modeMutex);
    s_currentMode = p_newMode;
}
```

File-scope static이 *encapsulation* (header에 노출 안 됨). C-style global 대안.

## Standard Library — JSF Approved Subset

```
허용 (JSF approved):
  <cstdint>           int32_t, uint16_t 등
  <cmath>             sin, cos, sqrt 등
  <cstdlib>           일부 (atoi 등은 회피)
  <cstring>           strncpy, memcpy 등 (size 명시)
  <cstdio>            printf 등 (heap-aware)
  <cassert>           assert
  <climits>           INT_MAX 등
  <cfloat>            FLT_MAX 등

제한 사용:
  <algorithm>         iterator-based OK
  <numeric>           OK

거의 회피:
  <vector>            dynamic memory
  <map>               dynamic memory
  <string>            dynamic memory
  <iostream>          heavy
  <fstream>           heap + I/O
  <iomanip>           formatting
  <regex>             heap + 복잡
  <thread>            C++11 (JSF 원본 외)
  <future>            C++11
  <chrono>            C++11
  <mutex>             C++11

완전 금지:
  <exception>         exception 금지
  <typeinfo>          RTTI 금지
```

## Modern Standard Library — KF-21 가능

```cpp
// JSF (C++03)
char buffer[256];
strncpy(buffer, "F-35", sizeof(buffer) - 1);
buffer[sizeof(buffer) - 1] = '\0';

// Modern (C++17+)
std::string_view name = "KF-21";
std::array<char, 256> buffer{};
std::copy(name.begin(), name.end(), buffer.begin());

// Static container (no heap)
boost::container::static_vector<int, 100> sv;  // C++11+ Boost
sv.push_back(42);
```

*Static container library*가 *JSF policy 충족 + modern style*.

## Concurrency — F-35 Architecture

F-35의 *task architecture* (단순화):

```
=== F-35 Flight Control Computer Tasks ===

Task 1: FCS Main Loop (Highest priority)
  Frequency: 50 Hz (20 ms)
  Function: Sensor read → Control law → Actuator command
  WCET: 15 ms

Task 2: Fault Detector
  Frequency: 10 Hz (100 ms)
  Function: Cross-check sensors, watchdog
  WCET: 30 ms

Task 3: Built-in Test (BIT)
  Frequency: 1 Hz (1 s)
  Function: Self-diagnostic
  WCET: 50 ms

Task 4: Communications
  Event-driven (CAN/ARINC 429)
  Function: Receive/send
  WCET: 1 ms per message

Task 5: Logger
  Lowest priority
  Function: Background log to NVM

Scheduler: Rate Monotonic (RTOS)
CPU utilization: ~78% worst-case
```

각 task가 *별도 stack*, *별도 priority*. *RTOS가 schedule*.

## ARINC 653 — Partition

```
ARINC 653 IMA (Integrated Modular Avionics):

각 partition (별도 spatial + temporal):
  Partition A: FCS (DAL A)
  Partition B: Display Manager (DAL B)
  Partition C: Mission Computer (DAL C)
  Partition D: IFE (DAL D)

각 partition:
  - Own memory (MPU)
  - Own time slice
  - Own I/O
  - Cannot affect other partition

→ Multi-criticality SW를 *한 hardware*에서 안전 실행
```

A380, 787, F-35가 *ARINC 653 IMA 사용*. JSF가 *partition-aware*.

## Memory Safety — Buffer Overflow 차단

```cpp
// 위반 — buffer overflow 위험
void ProcessInput(const char *p_pInput) {
    char buffer[100];
    strcpy(buffer, p_pInput);  // 위반 — overflow 가능
}

// Good
void ProcessInput(const char *p_pInput, int p_inputLen) {
    char buffer[100];
    if (p_inputLen >= sizeof(buffer)) {
        return;  // overflow 차단
    }
    strncpy(buffer, p_pInput, sizeof(buffer) - 1);
    buffer[sizeof(buffer) - 1] = '\0';
}

// Better — wrapper class
class CSafeString {
public:
    CSafeString() : m_length(0) { m_buffer[0] = '\0'; }
    
    int Set(const char *p_pStr) {
        size_t len = strnlen(p_pStr, MAX_LEN);
        if (len >= MAX_LEN) {
            return ERROR_TOO_LONG;
        }
        memcpy(m_buffer, p_pStr, len);
        m_buffer[len] = '\0';
        m_length = len;
        return SUCCESS;
    }
    
    const char* Get() const { return m_buffer; }
    size_t GetLength() const { return m_length; }

private:
    static const size_t MAX_LEN = 256;
    char m_buffer[MAX_LEN];
    size_t m_length;
};
```

Wrapper class가 *encapsulated safety*. 모든 buffer가 *bounded*.

## ASIL/DAL Memory Requirements

```
DAL A SW Memory Requirements:

1. No dynamic allocation post-init
2. Stack worst-case 분석
3. Heap usage <= 0 (after init)
4. Memory protection (MPU)
5. Stack overflow detection (canary)
6. Memory pool exhaustion handling (safe mode)

Tools:
  StackAnalyzer (AbsInt) — 정적 stack 분석
  Bound-T — WCET + memory
  Manual review for pool sizing
```

이런 *rigorous memory analysis*가 *항공 SW의 표준*.

## RAII without Exceptions

JSF가 *exception 없이 RAII*. *destructor 호출이 항상 일어남*.

```cpp
class CFileHandle {
public:
    explicit CFileHandle(const char *p_pPath) {
        m_pFile = fopen(p_pPath, "r");
    }
    
    ~CFileHandle() {
        if (m_pFile != NULL) {
            fclose(m_pFile);
            m_pFile = NULL;
        }
    }
    
    bool IsValid() const { return m_pFile != NULL; }
    FILE* Get() { return m_pFile; }
    
    // No copy
    CFileHandle(const CFileHandle &);
    CFileHandle& operator=(const CFileHandle &);

private:
    FILE *m_pFile;
};

// 사용
int ProcessFile(const char *p_pPath) {
    CFileHandle file(p_pPath);
    if (!file.IsValid()) {
        return ERROR_OPEN_FAIL;
    }
    
    // do work
    if (Error) {
        return ERROR_PROCESS;  // 자동 cleanup
    }
    
    return SUCCESS;  // 자동 cleanup
}
```

*Function scope 끝*에서 *destructor 자동 호출*. Resource leak 없음.

## F-35 Memory Usage 예 (대략)

```
F-35 FCC Memory Allocation:

Code (ROM):
  Application:      ~80 MB
  RTOS:             ~5 MB
  Drivers:          ~10 MB
  Total ROM:        ~100 MB

Data (RAM):
  Static (.bss + .data):    ~32 MB
  Stack (per task × tasks): ~16 MB total
  Heap (init phase):        ~8 MB (post-init: 0)
  RTOS overhead:            ~2 MB
  Total RAM:                ~64 MB

Heap activity:
  Init phase:     ~8 MB allocations
  Runtime:        0 (static + pool only)
  
Pool 사용:
  Message pool:   2048 × 256 bytes = 512 KB
  Task pool:      64 × 4096 bytes = 256 KB
  etc.
```

큰 binary이지만 *예측 가능 deterministic*.

## Modern Aerospace SW — 차세대

```
2020s+ Aerospace SW Trends:

1. Multi-core 활용
   - 단일 task → 병렬 task
   - 더 큰 algorithm 가능
   - 단 deterministic 분석 어려움

2. Linux + RT patch
   - PREEMPT_RT
   - 일부 위성 (Mars helicopter Ingenuity)
   - DO-178C 적용 어려움

3. AI/ML 통합
   - Sensor fusion ML
   - 자율 비행
   - 인증 framework 진행 중

4. Modern C++14/17/20
   - Smart pointers
   - constexpr 광범위
   - Concepts (C++20)
   - Coroutines (제한적)

5. Open source 확산
   - RTEMS (ESA)
   - 자체 RTOS
```

KF-21 같은 *새 항공 프로젝트*가 *현대 stack 가능*.

## JSF C++ → Modern C++ Migration

```
F-35 Block 4 (2020+):
  - Phase 1: Tool 업그레이드
    Compiler GCC 4.x → 9.x
    Static analyzer 업그레이드
  
  - Phase 2: Selective modernization
    Smart pointer (legacy code 외)
    auto 키워드 (제한적)
    Range-based for
  
  - Phase 3: 부분 C++14
    constexpr 광범위
    enum class
    Move semantics

  Block 5+ (검토 중):
    C++17/20 일부
    AI inference integration
    SOSA (Sensor Open Systems Architecture)
```

JSF C++가 *evolve*. 단 *근본 정신은 유지*.

## Common Findings — Memory + Library

```
실전 finding:

1. "operator new() 호출 in Process() (operational phase)"
   → AV Rule 206 위반 (init only)

2. "std::vector<int> 사용"
   → AV Rule 211 위반

3. "std::string 사용 in real-time path"
   → AV Rule 212 위반

4. "strcpy() — buffer overflow 위험"
   → strncpy + size 권장

5. "iostream cout 사용"
   → AV Rule 217 위반

6. "Boost 라이브러리 추가"
   → AV Rule 218 위반 (additional dependency)

7. "pthread_create 직접 호출"
   → OS abstraction layer 권장

8. "memory leak — error path에서 delete 누락"
   → AV Rule 209 위반 (RAII 권장)
```

## 정리

- **Exception**: 완전 금지 (Rule 196). Return code propagation.
- **Memory**: new/delete *init phase only*. Static + pool.
- **STL Container**: 회피 (vector, map, string). 자체 fixed-size.
- **STL Algorithm**: OK (iterator 추상).
- **iostream**: 회피. printf 또는 자체 logger.
- **Multi-threading**: RTOS API (VxWorks). OS abstraction layer.
- **Mutex + RAII**: ScopedLock 패턴.
- **ARINC 653 IMA**: Partition-aware design.
- **Buffer overflow 차단**: bounded wrapper class.
- F-35: 100 MB ROM, 64 MB RAM, *runtime heap 0*.
- KF-21+: Modern C++14/17 채택 가능.

## 다음 장 예고

11장은 *AUTOSAR C++14, MISRA C++:2008/2023과의 비교* — JSF vs 후세 표준.

## 관련 항목

- [Ch 9 — Templates](/blog/embedded/aerospace-standards/jsf-cpp/chapter09-templates)
- [Ch 11 — AUTOSAR, MISRA 비교](/blog/embedded/aerospace-standards/jsf-cpp/chapter11-comparison)
- [AUTOSAR C++14 Ch 7 — Exception Handling](/blog/embedded/car-standards/autosar-cpp/chapter07-exceptions)
- [AUTOSAR C++14 Ch 8 — STL](/blog/embedded/car-standards/autosar-cpp/chapter08-stl)
- [AUTOSAR C++14 Ch 11 — RAII Pattern Catalog](/blog/embedded/car-standards/autosar-cpp/chapter11-raii-pattern-catalog)
- [NASA JPL Power of 10 Rule 3 (no dynamic memory)](/blog/embedded/aerospace-standards/jpl-power-of-ten/chapter01-the-ten-rules)
