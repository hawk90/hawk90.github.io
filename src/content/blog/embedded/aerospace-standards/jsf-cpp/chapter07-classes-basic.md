---
title: "Ch 7: Classes 기본 (Rule 67-95)"
date: 2025-09-30T08:00:00
description: "JSF C++ Rule 67-95 — class vs struct, encapsulation, friend 금지, operator overload 정책, special member functions."
tags: [jsf-cpp, classes, struct, encapsulation, friend, operator-overload, raii]
series: "JSF C++"
seriesOrder: 7
draft: false
---

JSF C++의 *class 영역* (Rule 67-95). *public data는 struct만*, *friend 회피*, *operator overload 제한*. 항공 SW의 *encapsulation 강조*. 이 장은 *각 rule + F-35 class design 패턴*까지.

## AV Rule 67 — public/protected 데이터는 struct만

```
AV Rule 67 (Should)
"Public and protected data should only be used in structs—not classes."
```

```cpp
// 위반 — class with public data
class FlightState {
public:
    int altitude;       // public data 위반
    int airspeed;
    EFlightMode mode;
};

// Good 1 — struct (data-only)
struct FlightState {
    int altitude;       // OK in struct
    int airspeed;
    EFlightMode mode;
};

// Good 2 — class with accessors
class FlightState {
public:
    int GetAltitude() const { return m_altitude; }
    void SetAltitude(int v) { m_altitude = v; }
    /* ... */
private:
    int m_altitude;     // private
    int m_airspeed;
    EFlightMode m_mode;
};
```

JSF의 *class vs struct 철학*:

```
struct: pure data aggregate (POD)
   - 모든 멤버 public
   - No methods (또는 trivial)
   - C 호환

class: encapsulated behavior
   - 모든 데이터 private
   - public method로만 access
   - OOP encapsulation
```

Modern C++에서도 *비슷한 관습* (CppCoreGuidelines C.2).

## AV Rule 68 — Class 가시성 순서

```cpp
// 권장 순서
class CFoo {
public:        // public 먼저 (interface)
    CFoo();
    ~CFoo();
    void DoWork();

protected:     // protected 다음 (inheritance interface)
    virtual void OnEvent();

private:       // private 마지막 (implementation)
    int m_data;
    void HelperFunc();
};
```

이유:
- *Header reader가 interface 먼저 본다*
- *Public이 most important*
- *Private은 implementation detail*

## AV Rule 69-75 — Member Access

### AV Rule 69 — Accessor (getter/setter) 단순 inline

```cpp
class CFoo {
public:
    int GetValue() const { return m_value; }     // inline OK (1 line)
    void SetValue(int v) { m_value = v; }        // inline OK

private:
    int m_value;
};
```

복잡한 accessor는 *.cpp에 정의*.

### AV Rule 70 — Const Correctness

```cpp
class CFoo {
public:
    // Read-only method → const
    int GetValue() const;
    bool IsValid() const;
    
    // Modifying method → non-const
    void SetValue(int v);
    void Reset();

    // Const-correct parameter
    void Process(const CData &p_data);  // p_data not modified
    void Modify(CData &p_data);         // p_data modified
};
```

`const` 사용이 *문서이자 강제*. *모든 read-only에 const* 권장.

### AV Rule 71-75 — Initialization List 관련

(이미 Ch 5에서 다룸 — AV Rule 146-147)

## AV Rule 76-87 — Special Member Functions

C++ 5 (또는 6) special members:
- Default constructor
- Destructor
- Copy constructor
- Copy assignment
- (Move constructor — C++11)
- (Move assignment — C++11)

### AV Rule 76 — Default Constructor 명시

```cpp
// 위반 — no constructor (compiler-generated)
class CFoo {
private:
    int m_value;    // uninitialized in compiler-generated ctor
};

CFoo f;             // m_value undefined
int x = f.GetValue();   // UB

// Good — 명시 constructor
class CFoo {
public:
    CFoo() : m_value(0) {}
private:
    int m_value;
};
```

### AV Rule 77 — Rule of Three (C++03) / Rule of Five (C++11)

```
AV Rule 77 (Should)
"A class that has any pointer member should provide a copy constructor,
 destructor, and assignment operator."
```

Rule of Three (C++03):

```cpp
class CFoo {
public:
    CFoo();
    ~CFoo();                           // destructor
    CFoo(const CFoo &);               // copy constructor
    CFoo& operator=(const CFoo &);     // copy assignment
};
```

C++11의 Rule of Five (move 추가):

```cpp
class CFoo {
public:
    CFoo();
    ~CFoo();
    CFoo(const CFoo &);
    CFoo& operator=(const CFoo &);
    CFoo(CFoo &&) noexcept;           // C++11 move ctor
    CFoo& operator=(CFoo &&) noexcept; // C++11 move assignment
};
```

JSF 원본 (C++03)은 *Rule of Three*. 후기 update에 *Rule of Five*.

### AV Rule 78 — Copy 금지 패턴

```cpp
// C++03: private + undefined
class CSingleton {
public:
    static CSingleton& Instance();
private:
    CSingleton() {}
    ~CSingleton() {}
    
    // Copy 금지 (private + undefined)
    CSingleton(const CSingleton &);          // not defined
    CSingleton& operator=(const CSingleton &); // not defined
};

// C++11: = delete
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

C++11이 *`= delete`로 더 명확*. *Linker error 대신 compile error*.

### AV Rule 79 — Destructor virtual (다형 시)

```cpp
// 위반
class CBase {
public:
    void Process();
    ~CBase();           // non-virtual destructor
};

class CDerived : public CBase {
public:
    ~CDerived();        // 추가 cleanup
};

CBase *p = new CDerived();
delete p;               // 위반 — Base::~Base()만 호출, ~CDerived() 누락

// Good
class CBase {
public:
    virtual ~CBase();   // virtual destructor
};
```

*Polymorphic class*는 *virtual destructor 필수*. Memory leak + resource leak 방지.

## AV Rule 88 — Multiple Inheritance 제한

```
AV Rule 88 (Should)
"A non-virtual base class with multiple inheritance is allowed only
 with interfaces (pure abstract classes)."
```

```cpp
// 위반 — 다중 비-virtual 상속
class CA { /* data */ };
class CB { /* data */ };
class CC : public CA, public CB { /* ... */ };
// 위반 — A와 B 둘 다 data 가짐

// Good — 인터페이스만 다중 상속
class IReadable {
public:
    virtual int Read() = 0;
    virtual ~IReadable() = default;
};

class IWritable {
public:
    virtual int Write() = 0;
    virtual ~IWritable() = default;
};

class CFile : public IReadable, public IWritable {
    /* ... */
};   // OK — interfaces만
```

JSF가 *다이아몬드 문제* 회피. *인터페이스 다중 상속만 허용*.

## AV Rule 89 — `friend` 사용 회피

```
AV Rule 89 (Should)
"`friend` classes/functions should only be used when no other reasonable
 alternative exists."
```

```cpp
// 회피 — friend 사용
class CFoo {
    friend class CHelper;        // CHelper가 private 접근
    friend void HelperFunc(CFoo &); // 함수 접근
private:
    int m_secret;
};

class CHelper {
public:
    void DoWork(CFoo &foo) {
        foo.m_secret = 100;  // private 접근 (friend라서 OK)
    }
};
```

`friend`가 *encapsulation 깬다*. JSF에서는 *최후의 수단*.

### friend 정당화 예

```cpp
// 정당한 사용: operator overload
class CMatrix {
public:
    CMatrix();
private:
    int m_data[10][10];
    
    // friend operator (member 접근 필요)
    friend std::ostream& operator<<(std::ostream &os, const CMatrix &m);
};

std::ostream& operator<<(std::ostream &os, const CMatrix &m) {
    for (int i = 0; i < 10; i++) {
        for (int j = 0; j < 10; j++) {
            os << m.m_data[i][j] << " ";  // friend라 m_data 접근 OK
        }
        os << "\n";
    }
    return os;
}
```

`operator<<`가 *member 함수일 수 없음* (외부 `os` 인자 제어 못함). *friend가 유일*.

### friend 대안

```cpp
// 대안 1: public accessor
class CMatrix {
public:
    int Get(int i, int j) const { return m_data[i][j]; }
private:
    int m_data[10][10];
};

// operator는 public 사용
std::ostream& operator<<(std::ostream &os, const CMatrix &m) {
    for (int i = 0; i < 10; i++) {
        for (int j = 0; j < 10; j++) {
            os << m.Get(i, j) << " ";  // public accessor
        }
        os << "\n";
    }
    return os;
}
```

*Public accessor*면 friend 불필요. 단 *너무 많은 accessor*가 *encapsulation 약화*. trade-off.

## AV Rule 90 — Operator Overload 신중

```cpp
// 회피 — 의미 불명확한 operator
class CVector {
public:
    CVector operator+(const CVector &v) const;   // OK — 의미 명확 (덧셈)
    CVector operator*(int n) const;               // OK — scaling
    
    CVector operator<<(int n) const;              // 회피 — bit shift? push?
    bool operator!() const;                         // 회피 — empty check? not?
};
```

`operator<<`이 *bit shift 또는 stream output*. *모호*.

JSF 권장:
- *Arithmetic operator* (`+`, `-`, `*`, `/`) — OK
- *Comparison* (`==`, `!=`, `<`, `>`) — OK
- *Subscript* (`[]`) — OK (container)
- *Function call* (`()`) — 신중
- *Conversion operator* — 회피 (implicit 변환)
- *`new`/`delete` overload* — 회피 (custom allocator)

### Conversion Operator 회피

```cpp
// 위반
class CMoney {
public:
    operator int() const { return m_amount; }  // implicit conversion
private:
    int m_amount;
};

CMoney m(100);
int x = m;        // implicit — 위험

// Good
class CMoney {
public:
    int GetAmount() const { return m_amount; }  // explicit accessor
private:
    int m_amount;
};

CMoney m(100);
int x = m.GetAmount();  // 명시
```

C++11의 `explicit operator`도 가능:

```cpp
class CMoney {
public:
    explicit operator int() const { return m_amount; }
};

int x = m;                        // 컴파일 에러
int x = static_cast<int>(m);      // OK
```

## AV Rule 91 — Implicit Constructor 회피

```
AV Rule 91 (Should)
"Single-parameter constructors should be marked explicit."
```

(이미 Ch 5에서 다룸 — AV Rule 148)

## AV Rule 92-95 — Class Hierarchy

```cpp
// AV Rule 92 (Should)
// Class hierarchy 깊이 ≤ 3
class CA {};
class CB : public CA {};
class CC : public CB {};       // OK — depth 3
class CD : public CC {};       // 회피 — depth 4

// AV Rule 93 (Should)
// Concrete class에서 *상속* 회피
class CConcrete {           // 구체 class
public:
    void Method();           // virtual 아님
};

class CDerived : public CConcrete {  // 위반 — concrete에서 상속
    /* ... */
};

// Good — abstract base
class IBase {                 // interface
public:
    virtual void Method() = 0;
};

class CConcrete : public IBase {
    void Method() override;
};

// AV Rule 94 (Should)
// Pure virtual 외 다른 base method가 *protected 또는 private*
class CBase {
public:
    virtual void Process() = 0;  // pure virtual
protected:
    void HelperFunc();            // derived 사용
private:
    int m_internal;
};
```

## 실전 — F-35 Class Hierarchy

JSF C++의 *typical class design*:

```cpp
// flight_control.h

// Interface
class ISensor {
public:
    virtual ~ISensor() = default;
    virtual int Read(int *p_pValue) = 0;
    virtual bool IsValid() const = 0;
};

class IActuator {
public:
    virtual ~IActuator() = default;
    virtual int Write(int p_value) = 0;
    virtual int GetCurrentPosition(int *p_pValue) = 0;
};

// Concrete sensor
class CAltitudeSensor : public ISensor {
public:
    explicit CAltitudeSensor(int p_address);
    ~CAltitudeSensor() override;
    
    // Interface methods
    int Read(int *p_pValue) override;
    bool IsValid() const override;
    
    // Specific methods
    int Calibrate();
    int GetTemperature(int *p_pTemp) const;

private:
    int m_address;
    bool m_bValid;
    int m_calibrationOffset;
};

// Controller using sensors
class CFlightController {
public:
    explicit CFlightController(ISensor *p_pAltSensor,
                                ISensor *p_pAirSpeedSensor,
                                IActuator *p_pElevatorAct,
                                IActuator *p_pAileronAct);
    ~CFlightController();
    
    // No copy
    CFlightController(const CFlightController &) = delete;
    CFlightController& operator=(const CFlightController &) = delete;
    
    // Public API
    int Initialize();
    int Step();
    int SetMode(EFlightMode p_eMode);
    EFlightMode GetMode() const;
    
private:
    // Helpers
    int ReadSensors();
    int ComputeControlLaw();
    int WriteActuators();
    
    // Pointers to interfaces
    ISensor   *m_pAltSensor;
    ISensor   *m_pAirSpeedSensor;
    IActuator *m_pElevatorAct;
    IActuator *m_pAileronAct;
    
    // Internal state
    EFlightMode m_eMode;
    int m_currentAltitude;
    int m_currentAirSpeed;
    int m_targetAltitude;
    int m_targetAirSpeed;
    
    // PID controllers (Composition, not Inheritance)
    CPIDController *m_pAltitudePID;
    CPIDController *m_pAirSpeedPID;
};
```

JSF style 특징:
- *Interface (I prefix)*로 abstract
- *Concrete class*가 interface 구현
- *Composition over inheritance* (CFlightController가 sensor/actuator 포함)
- *No multiple inheritance* (interfaces 외)
- *No friend*
- *Explicit constructor*
- *Const correctness*
- *Virtual destructor* in interfaces

## Composition vs Inheritance

```cpp
// 회피 — Inheritance 남용
class CSensorReader : public CCommunicationLayer, public CDataProcessor {
    /* 다중 상속, complex */
};

// Good — Composition
class CSensorReader {
public:
    explicit CSensorReader(CCommunicationLayer *p_pComm,
                            CDataProcessor *p_pProcessor)
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

*Composition*이 *flexible*. *Interface 통해 mock 가능* (test).

## Singleton Pattern — JSF Style

```cpp
// flight_state_manager.h

class CFlightStateManager {
public:
    // Singleton access
    static CFlightStateManager& Instance();
    
    // No copy
    CFlightStateManager(const CFlightStateManager &) = delete;
    CFlightStateManager& operator=(const CFlightStateManager &) = delete;
    
    // API
    void SetMode(EFlightMode p_eMode);
    EFlightMode GetMode() const;

private:
    CFlightStateManager();
    ~CFlightStateManager();
    
    EFlightMode m_eCurrentMode;
};

// .cpp
CFlightStateManager& CFlightStateManager::Instance() {
    static CFlightStateManager s_instance;   // Meyers Singleton (C++11 thread-safe)
    return s_instance;
}
```

*Meyers Singleton* (C++11 thread-safe). C++03은 *수동 mutex* 필요.

JSF는 *global state*를 *Singleton으로 캡슐화*. *Globals 직접 사용 회피*.

## RAII — Resource Acquisition Is Initialization

JSF는 *exception 없이도 RAII 적용*.

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
    
    // No copy
    CScopedLock(const CScopedLock &) = delete;
    CScopedLock& operator=(const CScopedLock &) = delete;

private:
    CMutex *m_pMutex;
};

// 사용
void Foo() {
    CScopedLock lock(&g_mutex);  // Lock here
    
    // critical section
    DoWork();
    
    // 자동 Unlock at }
}
```

RAII *destructor 사용*. Exception 없이도 *function 종료 시 cleanup*.

## Modern C++ Class — KF-21 Style

```cpp
// modern_flight_control.hpp

class FlightController {
public:
    // Use shared_ptr or unique_ptr (C++11+)
    FlightController(std::shared_ptr<Sensor> alt_sensor,
                     std::shared_ptr<Sensor> airspeed_sensor,
                     std::unique_ptr<Actuator> elevator,
                     std::unique_ptr<Actuator> aileron);
    
    ~FlightController() = default;
    
    // No copy, default move
    FlightController(const FlightController&) = delete;
    FlightController& operator=(const FlightController&) = delete;
    FlightController(FlightController&&) = default;
    FlightController& operator=(FlightController&&) = default;
    
    // Public API
    std::optional<Error> Initialize();   // C++17 optional
    std::optional<Error> Step();
    
    void SetMode(FlightMode mode);
    FlightMode GetMode() const noexcept { return mode_; }

private:
    std::shared_ptr<Sensor> alt_sensor_;
    std::shared_ptr<Sensor> airspeed_sensor_;
    std::unique_ptr<Actuator> elevator_;
    std::unique_ptr<Actuator> aileron_;
    
    FlightMode mode_{FlightMode::MANUAL};
    
    // PID controllers (owned)
    std::unique_ptr<PIDController> altitude_pid_;
    std::unique_ptr<PIDController> airspeed_pid_;
};
```

차이 (modern C++):
- *smart pointers* (`shared_ptr`, `unique_ptr`)
- *no raw pointers*
- *`std::optional<Error>`* (C++17)
- *`= default` and `= delete`* 명시
- *trailing underscore_*
- *brace init `{}`*
- *`noexcept`* 명시

JSF style은 *raw pointer + manual lifecycle*. Modern은 *smart pointer + RAII*.

## Singleton 회피 (Modern)

```cpp
// 위반 (modern 관점) — Singleton 남용
class FlightStateManager {
public:
    static FlightStateManager& Instance();
};

// 다른 코드 어디서나
FlightStateManager::Instance().SetMode(...);

// Modern 권장 — Dependency Injection
class FlightController {
public:
    FlightController(FlightStateManager& state, /* ... */);
    // state injected, easier to test
};
```

Singleton이 *test 어려움*. *Dependency injection*이 modern.

JSF C++03 시대는 *Singleton 흔함*. C++11+의 *modern style*은 *DI 권장*.

## Common Findings — Classes

```
실전 finding:

1. "Class FlightState에 public data altitude 있음"
   → AV Rule 67 위반 (struct이어야)

2. "CFoo class에 ~CFoo() 누락"
   → AV Rule 79 위반 (virtual destructor 필요 if polymorphic)

3. "Multi-inheritance from CLogger and CDatabase (both 데이터 있음)"
   → AV Rule 88 위반

4. "Class A가 Class B의 friend"
   → AV Rule 89 위반 (정당화 필요)

5. "Implicit operator int() 정의"
   → AV Rule 90 위반 (explicit operator)

6. "Class hierarchy depth 5"
   → AV Rule 92 위반 (≤ 3 권장)

7. "Single-arg constructor에 explicit 누락"
   → AV Rule 91 위반
```

## 정리

- **public data는 struct만** (AV Rule 67) — class는 encapsulation.
- **Rule of Three** (C++03) — destructor, copy ctor, assignment 함께.
- **Virtual destructor** in polymorphic class (AV Rule 79).
- **Multiple inheritance** — interface (pure virtual) 외 회피.
- **friend** 회피 — 최후의 수단.
- **Operator overload** 신중 — conversion operator 회피.
- **Composition > Inheritance** — flexibility.
- **RAII** — exception 없이도 destructor 활용.
- **JSF style**: raw pointers + manual lifecycle.
- **Modern style**: smart pointers + DI.

## 다음 장 예고

8장은 *Inheritance, Virtual* (Rule 88-100) — virtual function, override, RTTI 금지.

## 관련 항목

- [Ch 6 — Statements, Functions](/blog/embedded/aerospace-standards/jsf-cpp/chapter06-statements-functions)
- [Ch 8 — Inheritance, Virtual](/blog/embedded/aerospace-standards/jsf-cpp/chapter08-classes-inheritance)
- [AUTOSAR C++14 Ch 5 — Classes, Inheritance](/blog/embedded/car-standards/autosar-cpp/chapter05-classes-inheritance)
- [CppCoreGuidelines C.2: struct vs class](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines)
