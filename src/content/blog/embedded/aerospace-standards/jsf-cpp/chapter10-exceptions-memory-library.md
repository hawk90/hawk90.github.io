---
title: "Ch 10: Exceptions, Memory, Library, Multi-threading"
date: 2026-05-18T11:00:00
description: "JSF C++ — Exception 금지, dynamic memory 제한, STL 부분 사용, multi-threading 일반 정책."
tags: [jsf-cpp, exceptions, memory, new-delete, stl, multi-threading, static-pool]
series: "JSF C++"
seriesOrder: 10
draft: false
---

JSF C++의 가장 *strict한 영역들*. *Exception 금지*, *dynamic memory 제한*, *STL 일부만 사용*, *multi-threading은 OS가 관리*. 항공 SW의 *deterministic 우선* 정신. *정확한 AV Rule 번호와 wording은 원문 PDF 참조*.

## Exception 정책

JSF C++의 가장 잘 알려진 정책: *Exception 사용 금지*. `throw`, `try`/`catch`, exception specification 모두 금지.

### Return code 패턴

```cpp
// 회피 (JSF 위반)
void DoWork() {
    if (error) throw std::runtime_error("failed");
}

try {
    DoWork();
} catch (const std::exception &e) {
    HandleError();
}

// Good — return code
int DoWork() {
    if (error) return ERROR_CODE;
    return SUCCESS;
}

if (DoWork() != SUCCESS) {
    HandleError();
}
```

### Destructor에서의 cleanup

Exception 없이도 cleanup 필요. Destructor에서 *throw 금지*, 실패 시 *로그만*.

```cpp
class CFileWriter {
public:
    ~CFileWriter() {
        if (Flush() != SUCCESS) {
            LogError("Flush failed in destructor");
            // 다른 action 없음 — destructor에서는 throw 금지
        }
    }
};
```

## Dynamic Memory 정책

JSF는 *new/delete를 initialization phase에 한정* 권장. NASA JPL Power of 10 Rule 3과 같은 정신.

### 일반 패턴

```cpp
// 회피 — runtime allocation
class CController {
public:
    void Process() {
        Buffer *buf = new Buffer(1024);  // runtime new
        DoWork(buf);
        delete buf;
    }
};

// Good — init phase에 할당, runtime에는 reuse
class CController {
public:
    int Initialize() {
        m_pBuffer = new Buffer(1024);   // init phase OK
        return (m_pBuffer != NULL) ? SUCCESS : ERROR_NO_MEMORY;
    }
    
    void Process() {
        DoWork(m_pBuffer);   // no new
    }
    
    ~CController() {
        delete m_pBuffer;
    }

private:
    Buffer *m_pBuffer;
};
```

### Static Pool 패턴

```cpp
// 정적 풀
class CMessagePool {
public:
    static CMessage* Acquire() {
        for (int i = 0; i < POOL_SIZE; i++) {
            if (!s_used[i]) {
                s_used[i] = true;
                return &s_pool[i];
            }
        }
        return NULL;
    }
    
    static void Release(CMessage *p_pMsg) {
        int index = static_cast<int>(p_pMsg - s_pool);
        if (index >= 0 && index < POOL_SIZE) {
            s_used[index] = false;
        }
    }

private:
    static const int POOL_SIZE = 32;
    static CMessage s_pool[POOL_SIZE];
    static bool s_used[POOL_SIZE];
};

CMessage CMessagePool::s_pool[POOL_SIZE];
bool CMessagePool::s_used[POOL_SIZE] = {false};
```

이 패턴이 *real-time deterministic*. *런타임 heap activity 없음*.

### `new[]` / `delete[]` 짝

```cpp
// 위반
int *arr = new int[100];
delete arr;       // 위반 — new[]에는 delete[]

// Good
int *arr = new int[100];
delete[] arr;

// 또는 (JSF 권장) 정적
int s_arr[100];
```

### Memory Leak 방지 — RAII

```cpp
// 회피 — leak pattern
void Foo() {
    int *p = new int[100];
    if (error) return;     // leak
    delete[] p;
}

// Good — RAII wrapper (exception 없이도 동작)
class CArrayHolder {
public:
    explicit CArrayHolder(int n) : m_pData(new int[n]) {}
    ~CArrayHolder() { delete[] m_pData; }
    
    int* Get() { return m_pData; }

private:
    int *m_pData;
    CArrayHolder(const CArrayHolder &);
    CArrayHolder& operator=(const CArrayHolder &);
};

void Foo() {
    CArrayHolder holder(100);
    if (error) return;          // 자동 cleanup
}
```

RAII는 *exception이 없어도 동작*. Function scope를 벗어나면 destructor 자동 호출.

## STL — 부분 사용

JSF는 *동적 메모리 사용 컨테이너*를 회피하는 입장.

### Container 회피

```cpp
// 회피 — 동적 메모리 컨테이너
std::vector<int> v;
std::map<int, CString> m;
std::list<CFoo> l;

// 대안 — 자체 fixed-size 컨테이너
template <typename T, int N>
class CFixedVector { /* static array 기반 */ };

template <typename Key, typename Value, int N>
class CFixedMap { /* static storage 기반 */ };

CFixedVector<int, 100> v;
CFixedMap<int, CString, 32> map;
```

### Algorithm은 사용 가능

```cpp
// OK — STL algorithm은 *container 가정 없음*
int data[100];
std::sort(data, data + 100);
std::find(data, data + 100, 42);
```

Algorithm은 iterator 추상이라 C array에서도 동작.

### `std::string` 회피

```cpp
// 회피 — std::string은 동적 메모리
std::string name = "value";
name += " more";   // 재할당 가능

// Good — bounded buffer
char buffer[64];
strncpy(buffer, "value", sizeof(buffer) - 1);
buffer[sizeof(buffer) - 1] = '\0';
```

### `<iostream>` 회피

```cpp
// 회피 — iostream
std::cout << "Hello" << std::endl;

// Good — C-style
printf("Hello\n");

// 또는 자체 logger
LogInfo("Hello");
```

`std::cout`은 heap을 사용하며 무겁다.

### 외부 library 신중

Boost 등 외부 의존은 *qualification 부담* 증가. JSF는 *minimum dependency*.

```cpp
// 회피 — 외부 의존
#include <boost/shared_ptr.hpp>

// Good — 자체 구현
class CHandle { /* manual lifecycle */ };
```

## Multi-threading — JSF 접근

JSF는 *C++03 시기*라 *표준 thread library 없음*. *OS-level threading*을 *abstraction layer* 뒤로 둠.

### OS Abstraction

```cpp
// 회피 — pthread 직접 사용
#include <pthread.h>
pthread_t tid;
pthread_create(&tid, NULL, WorkerThread, NULL);

// Good — abstraction class
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
            Sleep(20);
        }
    }
};
```

### Mutex + RAII

```cpp
class CMutex {
public:
    int Lock(int p_timeoutMs);
    int Unlock();

private:
    void *m_pOsHandle;   // OS-specific
};

class CScopedLock {
public:
    explicit CScopedLock(CMutex *p_pMutex)
        : m_pMutex(p_pMutex) {
        m_pMutex->Lock(INFINITE);
    }
    
    ~CScopedLock() {
        m_pMutex->Unlock();
    }

private:
    CMutex *m_pMutex;
    CScopedLock(const CScopedLock &);
    CScopedLock& operator=(const CScopedLock &);
};

void Foo() {
    CScopedLock lock(&g_mutex);
    // critical section
}   // 자동 unlock
```

OS abstraction은 *portability*에도 유리. 같은 코드를 *다른 RTOS / OS*로 이식.

## RTOS — 항공 SW의 일반

항공 critical SW는 *DO-178C qualified RTOS* 위에서 동작. 공개된 *대표적인 qualified RTOS*:

- **Wind River VxWorks** (다양한 항공 프로그램에 사용)
- **Green Hills INTEGRITY-178** (DAL A qualified)
- **LynxOS-178** (Lynx Software Technologies)
- **DDC-I Deos**
- **SYSGO PikeOS**

각 vendor 페이지에서 *qualification 자료*를 공개한다. 개별 항공 프로그램이 *어느 RTOS를 사용하는지*는 *vendor / 프로그램 측이 공식 발표하지 않은 한 추정하지 않는 것이 안전*.

## ARINC 653 IMA

ARINC 653 *Integrated Modular Avionics*는 *partition* 기반:

```
ARINC 653 partition:
  - Spatial separation (각자 메모리 영역, MPU/MMU)
  - Temporal separation (각자 time slice)
  - Own I/O resources
  - 한 partition 결함이 다른 partition에 전파 안 됨

Multi-criticality SW를 *한 hardware*에서 안전 실행
```

A380, 787 등 *최근 대형 민간 항공기*가 *ARINC 653 IMA 사용*. 자세히는 [ARINC 653 표준 페이지](https://www.arinc.com/) 또는 표준 발행처 자료.

## Heap 사용 — 일반 전략

```
JSF/항공 SW heap strategy (일반):

Phase 1: Initialization (boot)
  new/malloc OK
  데이터 구조 / pool 초기화

Phase 2: Operation (runtime)
  new/malloc 금지
  정적 storage 또는 pool에서만
  Deterministic

Phase 3: Shutdown
  delete/free OK
```

운영 phase에 *heap activity 0*이 *real-time deterministic 보장* + *fragmentation 회피*.

## Static Storage 패턴

```cpp
// 모든 데이터를 정적으로
class CFlightSystem {
public:
    static CFlightSystem& Instance() {
        static CFlightSystem s_instance;
        return s_instance;
    }
    
    int Initialize();
    int Step();

private:
    CFlightSystem();
    ~CFlightSystem();
    
    CFlightController m_flightCtrl;
    CFaultManager m_faultMgr;
    char m_logBuffer[8192];
    CMessage m_msgPool[32];
};
```

전체 객체가 *.bss 또는 .data 섹션*. 컴파일 시 메모리 위치 결정.

## File-scope Static

```cpp
// flight_state.cpp
static int s_currentMode = 0;
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

File-scope static이 *encapsulation*. C-style global의 안전 대안.

## Buffer Safety — Bounded Wrapper

```cpp
// 회피
void ProcessInput(const char *p_pInput) {
    char buffer[100];
    strcpy(buffer, p_pInput);  // overflow 위험
}

// Good
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

private:
    static const size_t MAX_LEN = 256;
    char m_buffer[MAX_LEN];
    size_t m_length;
};
```

Wrapper class가 *encapsulated safety*. 모든 buffer가 *bounded*.

## RAII without Exceptions

JSF가 exception 없이도 RAII를 광범위하게 활용. *destructor 호출이 항상 발생*.

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

private:
    FILE *m_pFile;
    CFileHandle(const CFileHandle &);
    CFileHandle& operator=(const CFileHandle &);
};

int ProcessFile(const char *p_pPath) {
    CFileHandle file(p_pPath);
    if (!file.IsValid()) {
        return ERROR_OPEN_FAIL;
    }
    
    if (Error) {
        return ERROR_PROCESS;  // 자동 cleanup
    }
    
    return SUCCESS;  // 자동 cleanup
}
```

함수 scope를 벗어나면 destructor가 자동 호출되어 *resource leak 차단*.

## Memory 분석 — 일반 도구

DAL A 수준의 SW에서 일반적으로 수행하는 *메모리 분석*:

- Stack worst-case 분석 (정적 분석 도구 사용)
- Heap 사용 (init phase 외 0 보장)
- Memory protection (MPU/MMU)
- Stack overflow detection (canary 등)
- Pool exhaustion handling (safe mode)

도구 예: AbsInt StackAnalyzer, Bound-T (WCET) 등. 자세히는 *각 vendor 페이지*.

## Modern C++ Migration

JSF가 *C++03 기반*이라 *modern C++ 기능은 원본 범위 외*. 후속 표준이 다음을 *권장 또는 의무화*:

- Smart pointer (`std::unique_ptr`, `std::shared_ptr`)
- `auto`, `nullptr`, `enum class`
- Range-based for
- `constexpr` (광범위)
- Move semantics
- 표준 thread library (`std::thread`, `std::mutex`)

각 표준이 어디까지 허용하는지는 *AUTOSAR C++14 Guidelines*, *MISRA C++:2023* 문서 참조. 본 블로그의 [AUTOSAR C++14 시리즈](/blog/embedded/automotive/autosar-cpp/chapter01-intro)도 참고.

## 일반적인 정적 분석 finding (memory + library)

**실전에서 자주 발견되는 위반:**

**1. operational phase에서 operator new 호출**

- → init phase only

**2. std::vector / std::map 사용**

- → fixed-size 자체 컨테이너 권장

**3. real-time path에서 std::string**

- → bounded buffer 권장

**4. strcpy 사용**

- → strncpy + size 권장

**5. iostream cout 사용**

- → printf 또는 자체 logger

**6. 외부 library (Boost 등) 추가**

- → qualification 부담 검토

**7. pthread_create 직접 호출**

- → OS abstraction layer 권장

**8. error path에서 delete 누락**

- → RAII wrapper 권장

## 정리

- **Exception**: 금지. Return code propagation.
- **Memory**: new/delete는 *init phase only* 권장. 운영 phase는 static + pool.
- **STL Container**: 회피 (vector, map, string). 자체 fixed-size로.
- **STL Algorithm**: 사용 가능 (iterator 추상).
- **iostream**: 회피. printf 또는 자체 logger.
- **Multi-threading**: OS abstraction layer. Mutex + ScopedLock (RAII).
- **ARINC 653 IMA**: partition 기반 격리.
- **Buffer overflow**: bounded wrapper class.
- **RAII**: exception 없이도 동작. JSF 핵심 패턴.
- 정확한 AV Rule 번호 / wording은 *JSF 원문 PDF 참조*.

## 다음 장 예고

11장은 *AUTOSAR C++14, MISRA C++:2008/2023과의 비교*.

## 관련 항목

- [Ch 9 — Templates](/blog/embedded/aerospace-standards/jsf-cpp/chapter09-templates)
- [Ch 11 — AUTOSAR, MISRA 비교](/blog/embedded/aerospace-standards/jsf-cpp/chapter11-comparison)
- [AUTOSAR C++14 Ch 7 — Exception Handling](/blog/embedded/automotive/autosar-cpp/chapter07-exceptions)
- [AUTOSAR C++14 Ch 11 — RAII Pattern Catalog](/blog/embedded/automotive/autosar-cpp/chapter11-raii-pattern-catalog)
- [NASA JPL Power of 10 Rule 3 — Dynamic Memory](/blog/embedded/aerospace-standards/jpl-power-of-ten/chapter01-the-ten-rules)
