---
title: "Ch 7: Classes 기본"
date: 2026-05-18T08:00:00
description: "JSF C++ — class vs struct, encapsulation, friend 회피, operator overload 정책, special member functions."
tags: [jsf-cpp, classes, struct, encapsulation, friend, operator-overload, raii]
series: "JSF C++"
seriesOrder: 7
draft: true
---

JSF C++의 *class 영역*. *public data는 struct만*, *friend 회피*, *operator overload 신중*. 항공 SW의 *encapsulation 강조*. *정확한 AV Rule 번호·wording은 원문 PDF 참조*.

## public/protected 데이터는 struct에만

```cpp
// 회피 — class에 public data
class FlightState {
public:
    int altitude;
    int airspeed;
    EFlightMode mode;
};

// Good 1 — struct (data-only)
struct FlightState {
    int altitude;
    int airspeed;
    EFlightMode mode;
};

// Good 2 — class with accessors
class CFlightState {
public:
    int GetAltitude() const { return m_altitude; }
    void SetAltitude(int v) { m_altitude = v; }

private:
    int m_altitude;
    int m_airspeed;
    EFlightMode m_mode;
};
```

JSF의 *class vs struct 관습*:

```
struct: pure data aggregate
   - 모든 멤버 public
   - No methods (또는 trivial)
   - C 호환

class: encapsulated behavior
   - 모든 데이터 private
   - public method로만 access
   - OOP encapsulation
```

Modern C++의 CppCoreGuidelines C.2도 같은 정신.

## Class 가시성 순서

```cpp
class CFoo {
public:        // 먼저 (interface)
    CFoo();
    ~CFoo();
    void DoWork();

protected:     // 다음 (inheritance interface)
    virtual void OnEvent();

private:       // 마지막 (implementation)
    int m_data;
    void HelperFunc();
};
```

이유: header를 읽는 사람이 *interface 먼저* 본다. Private은 *implementation detail*.

## Accessor — 단순한 inline

```cpp
class CFoo {
public:
    int GetValue() const { return m_value; }     // inline OK
    void SetValue(int v) { m_value = v; }

private:
    int m_value;
};
```

복잡한 accessor는 *.cpp에 정의*. inline의 trade-off는 *header 변경 시 모든 user 재컴파일*.

## Const Correctness

```cpp
class CFoo {
public:
    int GetValue() const;
    bool IsValid() const;
    
    void SetValue(int v);
    void Reset();
    
    void Process(const CData &p_data);   // 변경 안 함
    void Modify(CData &p_data);          // 변경
};
```

`const`는 *문서이자 강제*. *모든 read-only*에 권장.

## Special Member Functions

C++03 special members:
- Default constructor
- Destructor
- Copy constructor
- Copy assignment

C++11에 *move constructor*, *move assignment* 추가.

### Default Constructor 명시

```cpp
// 회피 — no constructor
class CFoo {
private:
    int m_value;   // uninitialized
};

CFoo f;            // m_value 미정
int x = f.GetValue();   // UB

// Good — 명시 ctor + initializer
class CFoo {
public:
    CFoo() : m_value(0) {}
private:
    int m_value;
};
```

### Rule of Three / Five

JSF는 *pointer member를 가진 class*에 *copy ctor, dtor, copy assignment*를 함께 제공 권장 (Rule of Three).

```cpp
// C++03 Rule of Three
class CFoo {
public:
    CFoo();
    ~CFoo();
    CFoo(const CFoo &);
    CFoo& operator=(const CFoo &);
};

// C++11 Rule of Five (move 추가)
class CFoo {
public:
    CFoo();
    ~CFoo();
    CFoo(const CFoo &);
    CFoo& operator=(const CFoo &);
    CFoo(CFoo &&) noexcept;
    CFoo& operator=(CFoo &&) noexcept;
};
```

### Copy 금지 패턴

```cpp
// C++03: private + undefined
class CSingleton {
public:
    static CSingleton& Instance();
private:
    CSingleton() {}
    ~CSingleton() {}
    
    CSingleton(const CSingleton &);              // declaration only
    CSingleton& operator=(const CSingleton &);   // declaration only
};

// C++11: = delete (더 명확)
class CSingleton {
public:
    static CSingleton& Instance();
    
    CSingleton(const CSingleton &) = delete;
    CSingleton& operator=(const CSingleton &) = delete;

private:
    CSingleton() {}
    ~CSingleton() {}
};
```

`= delete`가 *linker error 대신 compile error*. 의도 명확.

### Polymorphic Class = Virtual Destructor

```cpp
// 회피
class CBase {
public:
    void Process();
    ~CBase();           // non-virtual
};

class CDerived : public CBase {
public:
    ~CDerived();        // 추가 cleanup
};

CBase *p = new CDerived();
delete p;               // ~CDerived() 호출 안 됨

// Good
class CBase {
public:
    virtual ~CBase();
};
```

Polymorphic이면 *virtual destructor 의무*.

## Multiple Inheritance — Interface 외 회피

```cpp
// 회피 — concrete 다중 상속
class CA { /* data */ };
class CB { /* data */ };
class CC : public CA, public CB { /* 다이아몬드 위험 */ };

// Good — interface만 다중
class IReadable {
public:
    virtual int Read() = 0;
    virtual ~IReadable() {}
};

class IWritable {
public:
    virtual int Write() = 0;
    virtual ~IWritable() {}
};

class CFile : public IReadable, public IWritable { /* OK */ };
```

자세한 내용은 Ch 8 (Inheritance) 참고.

## `friend` — 회피

```cpp
// 회피
class CFoo {
    friend class CHelper;
    friend void HelperFunc(CFoo &);
private:
    int m_secret;
};

class CHelper {
public:
    void DoWork(CFoo &foo) {
        foo.m_secret = 100;   // friend라 OK
    }
};
```

`friend`가 *encapsulation*을 깬다. JSF는 *최후의 수단*.

### 정당화 예 — operator overload

```cpp
class CMatrix {
public:
    CMatrix();
private:
    int m_data[10][10];
    
    friend std::ostream& operator<<(std::ostream &os, const CMatrix &m);
};

std::ostream& operator<<(std::ostream &os, const CMatrix &m) {
    for (int i = 0; i < 10; i++) {
        for (int j = 0; j < 10; j++) {
            os << m.m_data[i][j] << " ";
        }
        os << "\n";
    }
    return os;
}
```

`operator<<`는 *member function일 수 없음* (외부 `os` 인자 제어). friend가 유일 또는 public accessor 추가.

### 대안 — public accessor

```cpp
class CMatrix {
public:
    int Get(int i, int j) const { return m_data[i][j]; }
private:
    int m_data[10][10];
};

std::ostream& operator<<(std::ostream &os, const CMatrix &m) {
    for (int i = 0; i < 10; i++) {
        for (int j = 0; j < 10; j++) {
            os << m.Get(i, j) << " ";
        }
        os << "\n";
    }
    return os;
}
```

Trade-off: *너무 많은 accessor*가 *encapsulation 약화*.

## Operator Overload — 신중

```cpp
class CVector {
public:
    CVector operator+(const CVector &v) const;   // OK — 의미 명확
    CVector operator*(int n) const;              // OK — scaling
    
    CVector operator<<(int n) const;             // 회피 — bit shift? stream?
    bool operator!() const;                       // 회피 — empty? not?
};
```

일반 권장:
- *Arithmetic* (`+`, `-`, `*`, `/`) — OK
- *Comparison* (`==`, `!=`, `<`) — OK
- *Subscript* (`[]`) — OK (container)
- *Function call* (`()`) — 신중
- *Conversion operator* — 회피 (implicit 변환 위험)
- *`new`/`delete` overload* — 회피

### Conversion Operator 회피

```cpp
// 회피
class CMoney {
public:
    operator int() const { return m_amount; }   // implicit
private:
    int m_amount;
};

CMoney m(100);
int x = m;        // implicit — 위험

// Good — explicit accessor
class CMoney {
public:
    int GetAmount() const { return m_amount; }
private:
    int m_amount;
};

CMoney m(100);
int x = m.GetAmount();
```

C++11의 `explicit operator`도 가능:

```cpp
class CMoney {
public:
    explicit operator int() const { return m_amount; }
};

int x = m;                       // 컴파일 에러
int x = static_cast<int>(m);     // OK
```

## Single-arg Constructor — `explicit`

```cpp
class CFoo {
public:
    CFoo(int x);              // implicit 변환 가능
};

void Bar(CFoo f);
Bar(42);                       // implicit — 의도?

// Good
class CFoo {
public:
    explicit CFoo(int x);
};

Bar(42);                       // 컴파일 에러
Bar(CFoo(42));                 // 명시
```

C++11의 *braced init*도 `explicit`로 차단:

```cpp
explicit CFoo(int x);
CFoo f = {42};   // 컴파일 에러
```

## Class Hierarchy Depth

JSF는 *얕은 hierarchy* 권장. 깊으면 *유지보수 어려움*.

```cpp
class CA {};
class CB : public CA {};
class CC : public CB {};       // 보통 OK
class CD : public CC {};       // 가능하면 회피
```

## Concrete vs Abstract Base

```cpp
// 회피 — concrete class 상속
class CConcrete {
public:
    void Method();             // non-virtual
};

class CDerived : public CConcrete { /* ... */ };

// Good — abstract base
class IBase {
public:
    virtual void Method() = 0;
    virtual ~IBase() {}
};

class CConcrete : public IBase {
public:
    void Method() override;
};
```

Abstract base가 *interface 명확*.

## 일반적인 Class Design 예

```cpp
// flight_control.h

class ISensor {
public:
    virtual ~ISensor() {}
    virtual int Read(int *p_pValue) = 0;
    virtual bool IsValid() const = 0;
};

class IActuator {
public:
    virtual ~IActuator() {}
    virtual int Write(int p_value) = 0;
    virtual int GetCurrentPosition(int *p_pValue) = 0;
};

class CAltitudeSensor : public ISensor {
public:
    explicit CAltitudeSensor(int p_address);
    ~CAltitudeSensor();
    
    int Read(int *p_pValue);
    bool IsValid() const;
    
    int Calibrate();
    int GetTemperature(int *p_pTemp) const;

private:
    int m_address;
    bool m_bValid;
    int m_calibrationOffset;

    CAltitudeSensor(const CAltitudeSensor &);
    CAltitudeSensor& operator=(const CAltitudeSensor &);
};

class CFlightController {
public:
    CFlightController(ISensor *p_pAltSensor,
                      ISensor *p_pAirSpeedSensor,
                      IActuator *p_pElevatorAct,
                      IActuator *p_pAileronAct);
    ~CFlightController();
    
    int Initialize();
    int Step();
    int SetMode(EFlightMode p_eMode);
    EFlightMode GetMode() const;

private:
    int ReadSensors();
    int ComputeControlLaw();
    int WriteActuators();
    
    ISensor   *m_pAltSensor;
    ISensor   *m_pAirSpeedSensor;
    IActuator *m_pElevatorAct;
    IActuator *m_pAileronAct;
    
    EFlightMode m_eMode;
    
    CFlightController(const CFlightController &);
    CFlightController& operator=(const CFlightController &);
};
```

JSF style 특징:
- *Interface (I prefix)*로 추상화
- *Composition* (sensor/actuator를 포함)
- *No multiple inheritance* (interface 외)
- *No friend*
- *Explicit constructor*
- *Const correctness*
- *Virtual destructor* in interfaces
- *Copy 금지* (declaration only 또는 `= delete`)

## Composition over Inheritance

```cpp
// 회피
class CSensorReader : public CCommunicationLayer, public CDataProcessor { /* ... */ };

// Good
class CSensorReader {
public:
    CSensorReader(CCommunicationLayer *p_pComm, CDataProcessor *p_pProcessor)
        : m_pComm(p_pComm), m_pProcessor(p_pProcessor) {}
    
    int Read() {
        int data = m_pComm->Receive();
        return m_pProcessor->Process(data);
    }

private:
    CCommunicationLayer *m_pComm;
    CDataProcessor *m_pProcessor;
};
```

Composition이 *flexible + mockable*.

## Singleton 패턴

```cpp
class CFlightStateManager {
public:
    static CFlightStateManager& Instance();
    
    void SetMode(EFlightMode p_eMode);
    EFlightMode GetMode() const;

private:
    CFlightStateManager();
    ~CFlightStateManager();
    
    CFlightStateManager(const CFlightStateManager &);
    CFlightStateManager& operator=(const CFlightStateManager &);
    
    EFlightMode m_eCurrentMode;
};

// .cpp
CFlightStateManager& CFlightStateManager::Instance() {
    static CFlightStateManager s_instance;
    return s_instance;
}
```

C++11에서 *Meyers Singleton*은 *thread-safe* (function-local static initialization). C++03은 *수동 mutex 필요*.

Singleton의 trade-off: *test 어려움*. Modern style은 *dependency injection* 선호.

## RAII (Exception 없이도)

```cpp
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

void Foo() {
    CScopedLock lock(&g_mutex);
    DoWork();
    // 함수 종료 시 자동 unlock
}
```

Exception 없이도 *function scope 종료 = destructor*. JSF RAII 핵심.

## Modern C++ 차이 — 참고

JSF C++03 시기 이후의 *modern C++ 스타일*과의 차이는 후속 표준이 다룬다:

- Smart pointers (`std::unique_ptr`, `std::shared_ptr`)
- `= default` / `= delete`
- `noexcept`
- `std::optional` (C++17)
- Brace initialization `{}`

각 표준이 *어디까지 허용*하는지는 *AUTOSAR C++14*, *MISRA C++:2023* 문서 참조.

## 일반적인 finding (classes)

**실전에서 자주 발견되는 위반:**

**1. class에 public data → struct이어야**

**2. polymorphic class에 virtual destructor 누락**

**3. multiple inheritance from 두 concrete class**

**4. friend 사용 (정당화 부족)**

**5. implicit conversion operator**

**6. single-arg constructor에 explicit 누락**

**7. 깊은 hierarchy**

## 정리

- **public data는 struct만** — class는 encapsulation.
- **Rule of Three** (C++03) / Rule of Five (C++11) — pointer member 있는 class.
- **Virtual destructor** in polymorphic class.
- **Multiple inheritance** — interface 외 회피.
- **friend** 회피 — 최후의 수단.
- **Operator overload** 신중 — conversion operator 특히.
- **Single-arg ctor**에 `explicit`.
- **Composition > Inheritance**.
- **RAII** — exception 없이도 destructor 활용.
- JSF style: *raw pointer + manual lifecycle*. Modern: *smart pointer + DI*.

## 다음 장 예고

8장은 *Inheritance, Virtual, RTTI 금지*.

## 관련 항목

- [Ch 6 — Statements, Functions](/blog/embedded/aerospace-standards/jsf-cpp/chapter06-statements-functions)
- [Ch 8 — Inheritance, Virtual](/blog/embedded/aerospace-standards/jsf-cpp/chapter08-classes-inheritance)
- [AUTOSAR C++14 Ch 5 — Classes, Inheritance](/blog/embedded/automotive/autosar-cpp/chapter05-classes-inheritance)
- [CppCoreGuidelines C.2: struct vs class](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines)
