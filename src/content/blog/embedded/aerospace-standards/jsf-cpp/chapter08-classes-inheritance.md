---
title: "Ch 8: Classes 상속, Virtual, RTTI 금지 (Rule 88-100)"
date: 2025-09-30T09:00:00
description: "JSF C++ Rule 88-100 — 단일 상속, virtual function 정책, 다중 상속 제한, RTTI 완전 금지, dynamic_cast 회피."
tags: [jsf-cpp, inheritance, virtual, multiple-inheritance, rtti, dynamic-cast]
series: "JSF C++"
seriesOrder: 8
draft: false
---

JSF C++의 *inheritance + virtual + RTTI* 정책. *RTTI 완전 금지*, *virtual 신중*, *다중 상속 interface 외 금지*. 항공 SW의 *runtime cost 최소화 + analyzability*. 이 장은 *각 rule + vtable cost + Liskov + F-35 패턴*까지.

## AV Rule 87 — Inheritance vs Composition

```
AV Rule 87 (Should)
"A class will be defined to be either inheritance or composition."
```

```cpp
// 안티 패턴 — Inheritance 남용
class CFlightController : public CCommunicationLayer,
                          public CDataProcessor,
                          public CLogger {
    /* Multiple inheritance from concrete classes */
};

// Good — Composition
class CFlightController {
public:
    explicit CFlightController(CCommunicationLayer *p_pComm,
                                CDataProcessor *p_pProcessor,
                                CLogger *p_pLogger)
        : m_pComm(p_pComm)
        , m_pProcessor(p_pProcessor)
        , m_pLogger(p_pLogger) {}

private:
    CCommunicationLayer *m_pComm;
    CDataProcessor *m_pProcessor;
    CLogger *m_pLogger;
};
```

*"Has-a"* (composition) vs *"Is-a"* (inheritance). 헷갈리면 composition.

## AV Rule 88 — Multiple Inheritance 제한 (재방문)

```cpp
// AV Rule 88 (Should)
// Multiple inheritance는 interface (pure abstract) 외 금지

class IReadable {
public:
    virtual int Read(int *p_pValue) = 0;
    virtual bool IsValid() const = 0;
    virtual ~IReadable() = default;
};

class IWritable {
public:
    virtual int Write(int p_value) = 0;
    virtual ~IWritable() = default;
};

// OK — interface 다중 상속
class CSerialPort : public IReadable, public IWritable {
public:
    int Read(int *p_pValue) override;
    bool IsValid() const override;
    int Write(int p_value) override;
};

// 위반 — concrete class 다중 상속
class CFoo {
public:
    int m_data;       // 실제 data 가짐
    void Process();    // 실제 implementation
};

class CBar {
public:
    char m_buf[100];   // 실제 data 가짐
};

class CCombined : public CFoo, public CBar {  // 위반
    /* m_data + m_buf 모두 상속 */
};
```

### Diamond Problem

```cpp
class CBase {
public:
    int m_id;
};

class CDerived1 : public CBase { /* ... */ };
class CDerived2 : public CBase { /* ... */ };

class CDiamond : public CDerived1, public CDerived2 {
    /* m_id가 *2번* 상속 — 어느 것? */
};

CDiamond d;
d.m_id;  // 컴파일 에러 (ambiguous)
d.CDerived1::m_id;  // 명시 (어색)
```

*Virtual inheritance*가 해결:

```cpp
class CDerived1 : virtual public CBase { /* ... */ };
class CDerived2 : virtual public CBase { /* ... */ };
class CDiamond : public CDerived1, public CDerived2 { /* ... */ };

CDiamond d;
d.m_id;  // OK — 단일 m_id (virtual)
```

JSF는 *virtual inheritance도 회피*. *복잡 + runtime cost*.

## AV Rule 89 — Friend Inheritance (재방문)

```cpp
// 회피
class CBase {
    friend class CDerived;  // friend로 private 노출
private:
    int m_secret;
};
```

상속과 friend의 *조합 회피*. *Encapsulation 약화 누적*.

## AV Rule 90 — Virtual Function 정책

```cpp
// 위반 — 모든 method가 virtual (over-virtualization)
class CFlightController {
public:
    virtual int Initialize();
    virtual int Step();
    virtual int SetMode(int);
    virtual int GetMode() const;
    virtual int GetAltitude() const;
    virtual int Reset();
};

// Good — virtual은 *overridable* 의도만
class CFlightController {
public:
    int Initialize();              // not virtual (no override needed)
    int Step();                    // not virtual

    virtual int OnEvent(int evt);  // virtual — derived가 override
    virtual ~CFlightController();  // virtual destructor
};
```

*Virtual = runtime cost*. *vtable lookup*. 필요한 곳만.

### Virtual의 비용

```
Non-virtual call:
  - Direct address (compile-time)
  - 1 instruction
  - Inlineable

Virtual call:
  - vtable lookup (1 indirection)
  - 2-3 instructions
  - Not inlineable
  - Cache miss 가능 (vtable이 separate cache line)
```

Real-time critical에서 *virtual call이 < 5% overhead*. 그래도 *수십만 호출*에서 누적.

## AV Rule 91 — Override 명시

```cpp
// 위반 (C++03) — no `override` keyword
class CBase {
public:
    virtual int Process(int x);
};

class CDerived : public CBase {
public:
    int Process(int x);   // override? 또는 hiding?
};

// Good (C++11+)
class CDerived : public CBase {
public:
    int Process(int x) override;  // 명시 override
    // 만약 base에 같은 signature 없으면 compile error
};
```

C++03 JSF 원본은 *override 키워드 없음*. C++11/14 update에서 도입.

### Override 누락의 함정

```cpp
class CBase {
public:
    virtual int Process(int x);
};

class CDerived : public CBase {
public:
    int Process(short x);  // 의도: override
                           // 실제: hiding (signature 다름 — int vs short)
};

CBase *p = new CDerived();
p->Process(5);  // CBase::Process 호출 (CDerived::Process 호출 안 됨)
```

`override` 키워드 추가하면 *compile error*. 함정 차단.

## AV Rule 92 — Pure Virtual 사용

```cpp
// Interface (pure abstract)
class ISensor {
public:
    virtual int Read(int *p_pValue) = 0;        // pure virtual
    virtual bool IsValid() const = 0;
    virtual ~ISensor() = default;
};

// Cannot instantiate
ISensor s;  // 컴파일 에러

// 사용
class CAltitudeSensor : public ISensor {
public:
    int Read(int *p_pValue) override;
    bool IsValid() const override;
};

CAltitudeSensor as;  // OK
```

Pure virtual `= 0`이 *interface 강제*. *Concrete class 의무 override*.

### Pure Virtual + 기본 구현

```cpp
// C++03 — pure virtual + implementation 가능
class CBase {
public:
    virtual int Foo() = 0;
};

int CBase::Foo() {
    // pure virtual이지만 implementation 제공
    return 42;
}

class CDerived : public CBase {
public:
    int Foo() override {
        return CBase::Foo() + 1;  // base 호출
    }
};
```

흔치 않지만 *valid C++*. JSF는 *권장 X* (헷갈림).

## AV Rule 93 — Virtual Destructor (재방문)

```cpp
// 위반 — non-virtual destructor in polymorphic class
class CBase {
public:
    virtual void Process();   // virtual function 있음 (polymorphic)
    ~CBase();                  // not virtual
};

class CDerived : public CBase {
public:
    int *m_pData;
    ~CDerived() { delete m_pData; }  // cleanup
};

CBase *p = new CDerived();
delete p;  // 위반 — CBase::~CBase()만 호출, ~CDerived() 누락 → memory leak

// Good
class CBase {
public:
    virtual void Process();
    virtual ~CBase();        // virtual destructor
};
```

*Polymorphic class = virtual destructor 의무*. Memory leak 차단.

## AV Rule 94 — Liskov Substitution Principle (LSP)

```
AV Rule 94 (Should)
"Derived classes should fulfill the substitutability principle."
```

```cpp
// 위반 — LSP 위반
class CRectangle {
public:
    virtual void SetWidth(int w) { m_width = w; }
    virtual void SetHeight(int h) { m_height = h; }
    int GetArea() const { return m_width * m_height; }
protected:
    int m_width, m_height;
};

class CSquare : public CRectangle {
public:
    void SetWidth(int w) override {
        m_width = w;
        m_height = w;   // 정사각형 강제 (assumption 변경)
    }
    void SetHeight(int h) override {
        m_width = h;
        m_height = h;
    }
};

// LSP 위반 시나리오
void TestRectangle(CRectangle &r) {
    r.SetWidth(5);
    r.SetHeight(10);
    assert(r.GetArea() == 50);  // 위반 — CSquare는 100 또는 25 또는 ?
}
```

LSP: *Derived class는 base를 *대체* 가능*해야. 동작 일관.

JSF가 LSP 명시 — *항공 SW의 polymorphism에 더 엄격*.

## AV Rule 95-100 — RTTI 금지

```
AV Rule 96 (Will not)
"The `typeid` operator shall not be used."

AV Rule 97 (Will not)
"The `dynamic_cast` operator shall not be used."
```

### RTTI (Run-Time Type Information)란?

```cpp
// RTTI 활성화
#include <typeinfo>

CBase *p = GetSomePolymorphic();

// typeid
const std::type_info &t = typeid(*p);
std::cout << t.name() << std::endl;  // "CDerived" 또는 mangled

// dynamic_cast
CDerived *d = dynamic_cast<CDerived *>(p);
if (d != nullptr) {
    d->DerivedSpecific();
}
```

RTTI가 *runtime type query 가능*. 단:
- *vtable에 type info 추가* (binary size ↑)
- *dynamic_cast 비용* (linear search through hierarchy)
- *Compiler dependent 구현*

### JSF가 RTTI 금지 이유

```
1. Runtime cost
   - dynamic_cast가 hierarchy 탐색
   - F-35 50Hz cycle에 부담

2. Binary size
   - 모든 class의 type info 저장
   - 100K class = 큰 binary 증가

3. Compile-time analyzability 약화
   - runtime에서 type 결정
   - static analysis 어려움

4. Polymorphism 잘 설계 시 불필요
   - virtual function이면 충분
   - dynamic_cast 필요 = design smell
```

### `-fno-rtti` Compiler Option

```bash
g++ -fno-rtti src.cpp     # RTTI 비활성화
clang++ -fno-rtti src.cpp
```

*JSF style 의무*. typeid/dynamic_cast 시도 *컴파일 에러*.

### RTTI 없는 Design

```cpp
// 위반 — dynamic_cast 사용
void ProcessSensor(ISensor *p_pSensor) {
    if (CAltitudeSensor *alt = dynamic_cast<CAltitudeSensor *>(p_pSensor)) {
        alt->Calibrate();  // CAltitudeSensor 전용 method
    }
}

// Good 1 — Virtual function로 모든 sensor에 method
class ISensor {
public:
    virtual void Calibrate() = 0;  // 모든 sensor가 구현
};

// 단 *모든 sensor가 Calibrate 의미 없으면* over-virtualization

// Good 2 — Enum + switch (manual dispatch)
enum ESensorType {
    SENSOR_ALTITUDE,
    SENSOR_AIRSPEED,
    SENSOR_GYRO,
};

class ISensor {
public:
    virtual ESensorType GetType() const = 0;
};

void ProcessSensor(ISensor *p_pSensor) {
    switch (p_pSensor->GetType()) {
        case SENSOR_ALTITUDE:
            // ISensor → CAltitudeSensor (안전한 static_cast)
            static_cast<CAltitudeSensor *>(p_pSensor)->Calibrate();
            break;
        case SENSOR_AIRSPEED:
            /* ... */
            break;
    }
}

// Good 3 — Visitor pattern (no RTTI)
class ISensorVisitor {
public:
    virtual void Visit(CAltitudeSensor &s) = 0;
    virtual void Visit(CAirSpeedSensor &s) = 0;
    virtual ~ISensorVisitor() = default;
};

class ISensor {
public:
    virtual void Accept(ISensorVisitor &v) = 0;
};

class CAltitudeSensor : public ISensor {
public:
    void Accept(ISensorVisitor &v) override { v.Visit(*this); }
};

class CCalibrationVisitor : public ISensorVisitor {
public:
    void Visit(CAltitudeSensor &s) override { s.Calibrate(); }
    void Visit(CAirSpeedSensor &s) override { s.Calibrate(); }
};
```

Visitor pattern이 *type-safe dispatch*. *RTTI 없음*.

## AV Rule 98 — Exception Class 자체

```cpp
// Exception 금지 (Rule 196)이므로 적용 X
// 단 *catch 가능 환경*에서:

class CMyException {
public:
    explicit CMyException(const char *p_msg) : m_pMsg(p_msg) {}
    const char *GetMessage() const { return m_pMsg; }
private:
    const char *m_pMsg;
};
```

JSF는 *exception 자체 금지*. Exception class 정의도 *드물게 필요*.

## AV Rule 99-100 — Hierarchy Depth

```cpp
// 위반 — depth 5
class CA {};
class CB : public CA {};
class CC : public CB {};
class CD : public CC {};
class CE : public CD {};   // depth 5 위반

// Good — depth ≤ 3
class CA {};
class CB : public CA {};
class CC : public CB {};   // OK
```

깊은 hierarchy:
- *Maintenance 어려움*
- *Cognitive load*
- *Virtual call cost 누적*

JSF는 *≤ 3 권장*. *flat is better than nested*.

## Virtual Function — vtable

### vtable 메커니즘

```cpp
class CBase {
public:
    virtual void A();
    virtual void B();
};

class CDerived : public CBase {
public:
    void A() override;
    void C();
};
```

Compiler가 생성:

```
CBase::vtable      : [&CBase::A, &CBase::B]
CDerived::vtable   : [&CDerived::A, &CBase::B]

Each object has _vptr (pointer to vtable):
  CBase obj      : { _vptr → CBase::vtable, members }
  CDerived obj   : { _vptr → CDerived::vtable, members }

Virtual call:
  p->A();
  Translates to: (p->_vptr[0])(p);  // 1 indirection
```

### vtable Cost — 측정

```cpp
// Benchmark: virtual vs non-virtual call

class CBase {
public:
    virtual int VirtualMethod(int x) { return x + 1; }
    int NonVirtualMethod(int x) { return x + 1; }
};

void Benchmark() {
    CBase b;
    const int N = 1000000000;
    
    // Non-virtual
    auto start = clock();
    int sum1 = 0;
    for (int i = 0; i < N; i++) {
        sum1 += b.NonVirtualMethod(i);
    }
    auto t1 = clock() - start;
    
    // Virtual
    start = clock();
    int sum2 = 0;
    for (int i = 0; i < N; i++) {
        sum2 += b.VirtualMethod(i);
    }
    auto t2 = clock() - start;
    
    // 결과 (대표적):
    // Non-virtual: 0.5 sec
    // Virtual: 0.7 sec
    // 약 40% slower
    // 단 modern CPU branch prediction에서 차이 감소
}
```

Real-time hot path에서 *virtual 회피* 권장.

## Virtual Inheritance 회피

```cpp
// 위반 — virtual inheritance (diamond 해결용)
class CBase { /* ... */ };
class CDerived1 : virtual public CBase { /* ... */ };
class CDerived2 : virtual public CBase { /* ... */ };
class CDiamond : public CDerived1, public CDerived2 { /* ... */ };

// JSF: 회피 — diamond 자체 회피
// → multiple inheritance가 interface (no data)만이면 diamond 안 생김
```

Virtual inheritance가 *complex + slow*. *Design 변경*으로 회피.

## Inheritance vs Composition — F-35 결정

```cpp
// 위반 패턴 — Inheritance from concrete
class CDataLogger {
public:
    void Log(const char *p_msg);
    /* ... */
};

class CFlightController : public CDataLogger {  // 위반
    /* Logger 기능 상속받지만 사실은 사용만 */
};

// Good — Composition
class CFlightController {
public:
    explicit CFlightController(CDataLogger *p_pLogger)
        : m_pLogger(p_pLogger) {}
    
    void Process() {
        m_pLogger->Log("Processing");
        /* ... */
    }

private:
    CDataLogger *m_pLogger;
};
```

*"Is-a flight controller a logger?"* — No, *uses a logger*. Composition.

## Interface Segregation Principle

```cpp
// 위반 — fat interface
class ISensorEverything {
public:
    virtual int Read(int *p_pValue) = 0;
    virtual void Calibrate() = 0;
    virtual void Reset() = 0;
    virtual int GetTemperature() = 0;        // temperature sensor only?
    virtual int GetPressure() = 0;            // pressure sensor only?
    virtual int GetVoltage() = 0;             // voltage sensor only?
    /* 모든 가능한 method */
};

// Good — segregated
class IReadable {
public:
    virtual int Read(int *p_pValue) = 0;
};

class ICalibratable {
public:
    virtual void Calibrate() = 0;
};

class ITemperatureSensor : public IReadable, public ICalibratable {
public:
    virtual int GetTemperature() = 0;
};

class IPressureSensor : public IReadable, public ICalibratable {
public:
    virtual int GetPressure() = 0;
};
```

작은 interface 다수가 *flexible*. 큰 interface가 *implementation 부담*.

## Real-World F-35 — Sensor Hierarchy

```cpp
// === Interfaces (JSF "I" prefix) ===

class IReadable {
public:
    virtual int Read(int *p_pValue) = 0;
    virtual ~IReadable() = default;
};

class ICalibratable {
public:
    virtual int Calibrate() = 0;
    virtual ~ICalibratable() = default;
};

class IFaultMonitorable {
public:
    virtual EFaultStatus GetFaultStatus() const = 0;
    virtual int ClearFault() = 0;
    virtual ~IFaultMonitorable() = default;
};

// === Concrete sensors (multiple interface 상속 OK) ===

class CAltitudeSensor
    : public IReadable
    , public ICalibratable
    , public IFaultMonitorable
{
public:
    explicit CAltitudeSensor(int p_address);
    ~CAltitudeSensor() override;
    
    // No copy
    CAltitudeSensor(const CAltitudeSensor &) = delete;
    CAltitudeSensor& operator=(const CAltitudeSensor &) = delete;
    
    // IReadable
    int Read(int *p_pValue) override;
    
    // ICalibratable
    int Calibrate() override;
    
    // IFaultMonitorable
    EFaultStatus GetFaultStatus() const override;
    int ClearFault() override;
    
    // Specific methods (non-virtual)
    int GetCalibrationDate(time_t *p_pDate) const;

private:
    int m_address;
    int m_lastValue;
    int m_calibrationOffset;
    EFaultStatus m_eFaultStatus;
    time_t m_lastCalibrationTime;
};

// === Composition: Flight Controller uses sensors ===

class CFlightController {
public:
    explicit CFlightController(
        IReadable *p_pAltitudeSensor,
        IReadable *p_pAirSpeedSensor,
        ICalibratable *p_pCalibratableAlt,
        IFaultMonitorable *p_pAltFaultMon);
    
    int Step();

private:
    // Pointer to abstract interfaces (mockable for test)
    IReadable *m_pAltSensor;
    IReadable *m_pAirSpeedSensor;
    ICalibratable *m_pCalibratableAlt;
    IFaultMonitorable *m_pAltFaultMon;
};

// === Test: mock 가능 ===

class CMockSensor : public IReadable {
public:
    int Read(int *p_pValue) override {
        *p_pValue = m_mockValue;
        return 0;
    }
    
    void SetMockValue(int v) { m_mockValue = v; }

private:
    int m_mockValue;
};
```

JSF style:
- *Interface 다수, 작게*
- *Concrete class가 interface 구현*
- *Composition*으로 사용
- *Mock 가능* (test 용이)
- *RTTI 사용 X*

## Modern C++ Inheritance — KF-21 Style

```cpp
// modern_sensor.hpp

class IReadable {
public:
    virtual ~IReadable() = default;
    virtual std::optional<int> Read() = 0;  // C++17 optional
};

class ICalibratable {
public:
    virtual ~ICalibratable() = default;
    virtual void Calibrate() = 0;
};

class AltitudeSensor final : public IReadable, public ICalibratable {
public:
    explicit AltitudeSensor(int address) noexcept : address_{address} {}
    
    AltitudeSensor(const AltitudeSensor&) = delete;
    AltitudeSensor& operator=(const AltitudeSensor&) = delete;
    
    std::optional<int> Read() override;
    void Calibrate() override;

private:
    int address_;
    int last_value_{0};
    int calibration_offset_{0};
};
```

Modern 차이:
- `std::optional<int>` (return value + error in single type)
- `final` (no further inheritance — optimization hint)
- `noexcept` 명시
- `{}` brace initialization
- *No Hungarian prefix*

## Pattern — Strategy

JSF style strategy pattern (algorithm 교체):

```cpp
class IControlStrategy {
public:
    virtual ~IControlStrategy() = default;
    virtual float Compute(float p_setpoint, float p_measure) = 0;
};

class CPIDStrategy : public IControlStrategy {
public:
    explicit CPIDStrategy(float p_kp, float p_ki, float p_kd)
        : m_kp(p_kp), m_ki(p_ki), m_kd(p_kd) {}
    
    float Compute(float p_setpoint, float p_measure) override {
        // PID logic
        return /* ... */;
    }

private:
    float m_kp, m_ki, m_kd;
    float m_integral{0.0F};
};

class CLQRStrategy : public IControlStrategy {
public:
    float Compute(float p_setpoint, float p_measure) override {
        // LQR logic
        return /* ... */;
    }
};

// 사용
class CController {
public:
    explicit CController(IControlStrategy *p_pStrategy)
        : m_pStrategy(p_pStrategy) {}
    
    void Step(float p_setpoint, float p_measure) {
        float command = m_pStrategy->Compute(p_setpoint, p_measure);
        SendCommand(command);
    }

private:
    IControlStrategy *m_pStrategy;
};

// 다른 strategy로 swap
CPIDStrategy pid(2.5F, 0.8F, 0.15F);
CController controller(&pid);

CLQRStrategy lqr;
CController controller2(&lqr);
```

*Composition + interface* = *flexibility*. F-35의 *모드별 control algorithm 교체*에 사용.

## Pattern — Observer

```cpp
// Observer interface
class IFaultObserver {
public:
    virtual ~IFaultObserver() = default;
    virtual void OnFaultDetected(int p_faultCode) = 0;
};

// Subject (event source)
class CFaultDetector {
public:
    void RegisterObserver(IFaultObserver *p_pObserver) {
        // add to list (fixed array, no dynamic alloc)
        if (m_numObservers < MAX_OBSERVERS) {
            m_observers[m_numObservers++] = p_pObserver;
        }
    }
    
    void Process() {
        if (DetectFault()) {
            int code = GetFaultCode();
            for (int i = 0; i < m_numObservers; i++) {
                m_observers[i]->OnFaultDetected(code);
            }
        }
    }

private:
    static const int MAX_OBSERVERS = 10;  // 고정 (no dynamic)
    IFaultObserver *m_observers[MAX_OBSERVERS];
    int m_numObservers{0};
    
    bool DetectFault();
    int GetFaultCode();
};

// Concrete observer
class CSafetyManager : public IFaultObserver {
public:
    void OnFaultDetected(int p_faultCode) override {
        if (p_faultCode >= CRITICAL_FAULT) {
            EnterSafeMode();
        }
    }
};
```

JSF style observer:
- *Fixed array* (no dynamic alloc)
- *MAX_OBSERVERS 한계*
- *Interface 통한 dispatch*

## Common Findings — Inheritance

```
실전 finding:

1. "Multiple inheritance from CSensor and CDataProcessor (both data)"
   → AV Rule 88 위반

2. "Virtual destructor 누락 in polymorphic CBase"
   → AV Rule 79 위반

3. "dynamic_cast 사용"
   → AV Rule 97 위반 (RTTI 금지)

4. "typeid 사용"
   → AV Rule 96 위반

5. "Class hierarchy depth 6"
   → AV Rule 92 위반

6. "Diamond inheritance 발견"
   → 회피 권장 (AV Rule 88 정신)

7. "친구 클래스 + 친구 함수 다수"
   → AV Rule 89 위반

8. "override keyword 누락 (C++11 후)"
   → AV Rule 91 위반

9. "Rectangle/Square LSP 위반"
   → AV Rule 94 위반
```

## RTTI 회피 — Compile-time Polymorphism

C++ template으로 *compile-time polymorphism*:

```cpp
// Runtime polymorphism (RTTI 필요할 수도)
class IShape {
public:
    virtual float Area() const = 0;
};

float TotalArea(IShape **p_pShapes, int n) {
    float total = 0;
    for (int i = 0; i < n; i++) {
        total += p_pShapes[i]->Area();  // virtual call
    }
    return total;
}

// Compile-time polymorphism (template)
template <typename T>
float Area(const T &shape) {
    return shape.Area();  // direct call, no virtual
}

class CCircle {
public:
    float Area() const { return 3.14F * m_radius * m_radius; }
private:
    float m_radius;
};

class CSquare {
public:
    float Area() const { return m_side * m_side; }
private:
    float m_side;
};

// 각 shape type에 대해 별도 instantiation, 빠름
CCircle c;
CSquare s;
float area1 = Area(c);   // CCircle::Area() — direct call
float area2 = Area(s);   // CSquare::Area() — direct call
```

Template이 *runtime cost 없음*. 단 *binary size ↑* (각 type instantiation).

JSF C++03은 *template 사용 가능* (Ch 9). RTTI 회피에 활용.

## Aerospace Inheritance — 진화

```
1990s (Ada — F/A-18, F-22):
  - Tagged types (Ada inheritance)
  - Limited inheritance
  - Strong typing

2000s (JSF C++03 — F-35):
  - Interface inheritance only
  - No RTTI
  - vtable cost 최소화

2010s (AUTOSAR C++14 — 자동차):
  - JSF 정신 + modern C++
  - Smart pointers
  - override keyword

2020s (MISRA C++:2023 — 통합):
  - JSF + AUTOSAR + MISRA C++:2008
  - Modern C++14/17/20
  - Concept (C++20)

2030+ (예상):
  - C++23 std::expected
  - Concepts 광범위
  - Coroutine (제한적)
  - Module (실용화)
```

JSF C++가 *modern aerospace C++의 출발*. *진화하면서도 정신 유지*.

## 정리

- **AV Rule 87-88**: Composition > Inheritance. Multiple inheritance interface 외 금지.
- **AV Rule 90-91**: Virtual 신중. override 키워드 (C++11+).
- **AV Rule 92**: Pure virtual = interface.
- **AV Rule 93**: Polymorphic = virtual destructor.
- **AV Rule 94**: Liskov Substitution Principle.
- **AV Rule 96-97**: RTTI 완전 금지. typeid/dynamic_cast 회피.
- **AV Rule 99-100**: Hierarchy depth ≤ 3.
- vtable cost = ~40% per call (modern CPU에 작음).
- Compile-time polymorphism (template)으로 RTTI 회피.
- F-35: Interface 다수 + Composition + Mock-able design.

## 다음 장 예고

9장은 *Templates* (Rule 101-105) — 제네릭 프로그래밍, JSF의 template 제한.

## 관련 항목

- [Ch 7 — Classes basic](/blog/embedded/aerospace-standards/jsf-cpp/chapter07-classes-basic)
- [Ch 9 — Templates](/blog/embedded/aerospace-standards/jsf-cpp/chapter09-templates)
- [Ch 10 — Exceptions, Memory](/blog/embedded/aerospace-standards/jsf-cpp/chapter10-exceptions-memory-library)
- [AUTOSAR C++14 Ch 5 — Classes](/blog/embedded/car-standards/autosar-cpp/chapter05-classes-inheritance)
- [CppCoreGuidelines C.120-C.140](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines)
