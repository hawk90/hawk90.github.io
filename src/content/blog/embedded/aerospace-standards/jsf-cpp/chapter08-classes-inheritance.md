---
title: "Ch 8: Inheritance, Virtual, RTTI 금지"
date: 2026-05-18T09:00:00
description: "JSF C++ — 단일 상속, virtual function 정책, 다중 상속 제한, RTTI 금지, dynamic_cast 회피."
tags: [jsf-cpp, inheritance, virtual, multiple-inheritance, rtti, dynamic-cast]
series: "JSF C++"
seriesOrder: 8
draft: false
---

JSF C++의 *inheritance + virtual + RTTI* 정책. *RTTI 금지*, *virtual 신중*, *다중 상속 interface 외 회피*. 항공 SW의 *runtime cost 최소화 + analyzability* 정신. *정확한 AV Rule 번호·wording은 원문 PDF 참조*.

## Inheritance vs Composition

```cpp
// 안티 패턴 — Inheritance 남용
class CFlightController : public CCommunicationLayer,
                          public CDataProcessor,
                          public CLogger {
    /* concrete class 다중 상속 */
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

## Multiple Inheritance — Interface 외 회피

JSF는 *interface (pure abstract class) 외의 다중 상속을 회피*. Concrete class 두 개 이상의 상속이 *복잡 + 모호*.

```cpp
class IReadable {
public:
    virtual int Read(int *p_pValue) = 0;
    virtual bool IsValid() const = 0;
    virtual ~IReadable() {}
};

class IWritable {
public:
    virtual int Write(int p_value) = 0;
    virtual ~IWritable() {}
};

// OK — interface 다중 상속
class CSerialPort : public IReadable, public IWritable {
public:
    int Read(int *p_pValue) override;
    bool IsValid() const override;
    int Write(int p_value) override;
};

// 회피 — concrete class 다중 상속
class CFoo {
public:
    int m_data;
    void Process();
};

class CBar {
public:
    char m_buf[100];
};

class CCombined : public CFoo, public CBar { /* 회피 */ };
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
    /* m_id가 2번 — 어느 것? */
};

CDiamond d;
d.m_id;  // 컴파일 에러 (ambiguous)
```

*Virtual inheritance*가 해결책이지만 *복잡 + runtime cost*. JSF는 *diamond 자체를 회피하는 design*을 권장.

## Friend + 상속 — 회피

```cpp
// 회피
class CBase {
    friend class CDerived;
private:
    int m_secret;
};
```

상속과 friend의 *조합*이 *encapsulation 약화*. 누적되면 *유지보수 부담*.

## Virtual Function 정책

```cpp
// 회피 — 모든 method가 virtual (over-virtualization)
class CFlightController {
public:
    virtual int Initialize();
    virtual int Step();
    virtual int SetMode(int);
    virtual int GetMode() const;
    virtual int GetAltitude() const;
};

// Good — virtual은 *overridable 의도*만
class CFlightController {
public:
    int Initialize();              // not virtual
    int Step();                    // not virtual

    virtual int OnEvent(int evt);  // virtual — override 의도
    virtual ~CFlightController();  // virtual destructor
};
```

*Virtual = runtime cost* (vtable lookup). 필요한 곳만.

### Virtual의 일반적 비용

```
Non-virtual call:
  - Direct address (compile-time)
  - Inlineable

Virtual call:
  - vtable lookup (1 indirection)
  - Inline 불가
  - 추가 cache pressure (vtable이 별도 cache line)
```

비용의 정확한 정도는 *CPU, 컴파일러, branch prediction, 호출 패턴*에 따라 달라진다. *Hot path에서는 측정 + 신중*.

## Override 명시

C++03 원본 JSF는 *`override` 키워드 없음*. C++11/14 업데이트에서 도입.

```cpp
class CBase {
public:
    virtual int Process(int x);
};

class CDerived : public CBase {
public:
    int Process(int x) override;   // 명시 override
    // base에 같은 signature 없으면 컴파일 에러
};
```

### Override 누락의 함정

```cpp
class CBase {
public:
    virtual int Process(int x);
};

class CDerived : public CBase {
public:
    int Process(short x);  // 의도: override
                           // 실제: hiding (signature 다름)
};

CBase *p = new CDerived();
p->Process(5);  // CBase::Process 호출 (CDerived의 것 X)
```

`override` 키워드가 *컴파일 시점*에 함정 차단.

## Pure Virtual — Interface 강제

```cpp
class ISensor {
public:
    virtual int Read(int *p_pValue) = 0;
    virtual bool IsValid() const = 0;
    virtual ~ISensor() {}
};

ISensor s;  // 컴파일 에러 (cannot instantiate)

class CAltitudeSensor : public ISensor {
public:
    int Read(int *p_pValue) override;
    bool IsValid() const override;
};
```

`= 0`이 *concrete class에 override 의무*.

## Polymorphic Class = Virtual Destructor

```cpp
// 회피 — non-virtual destructor in polymorphic class
class CBase {
public:
    virtual void Process();   // virtual function 있음
    ~CBase();                  // not virtual ← 위험
};

class CDerived : public CBase {
public:
    int *m_pData;
    ~CDerived() { delete m_pData; }
};

CBase *p = new CDerived();
delete p;  // ~CDerived() 호출 안 됨 → leak

// Good
class CBase {
public:
    virtual void Process();
    virtual ~CBase();
};
```

Polymorphic class는 *virtual destructor 의무*.

## Liskov Substitution Principle (LSP)

JSF가 *LSP 정신*을 명시. *Derived class는 base를 안전하게 대체* 가능해야.

```cpp
// 회피 — LSP 위반의 고전 예
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
void Foo(CRectangle &r) {
    r.SetWidth(5);
    r.SetHeight(10);
    assert(r.GetArea() == 50);  // CSquare는 100
}
```

*Is-a 관계가 의미적으로 substitutable*인지 검토 필수.

## RTTI 금지

JSF는 *`typeid`*와 *`dynamic_cast`*를 *금지*. *RTTI 자체 비활성화* 권장.

### RTTI란

```cpp
#include <typeinfo>

CBase *p = GetSomePolymorphic();

const std::type_info &t = typeid(*p);   // runtime type 조회

CDerived *d = dynamic_cast<CDerived *>(p);  // runtime cast
if (d != NULL) {
    d->DerivedSpecific();
}
```

RTTI의 일반적 단점:
- *Runtime cost* (dynamic_cast가 hierarchy 탐색)
- *Binary size 증가* (vtable에 type info)
- *Static analysis 약화* (runtime에서 type 결정)
- *잘 설계된 polymorphism이면 보통 불필요*

### `-fno-rtti`

```bash
g++ -fno-rtti src.cpp
clang++ -fno-rtti src.cpp
```

JSF style에서는 *컴파일 옵션*으로 RTTI 자체를 끔. `typeid`/`dynamic_cast` 시도 시 *컴파일 에러*.

### RTTI 없는 Design

```cpp
// 회피 — dynamic_cast
void ProcessSensor(ISensor *p_pSensor) {
    if (CAltitudeSensor *alt = dynamic_cast<CAltitudeSensor *>(p_pSensor)) {
        alt->Calibrate();
    }
}

// Good 1 — Virtual function로 통일
class ISensor {
public:
    virtual void Calibrate() = 0;
};
// 단 모든 sensor에 Calibrate 의미 있어야

// Good 2 — Enum + static_cast (manual dispatch)
enum ESensorType { SENSOR_ALTITUDE, SENSOR_AIRSPEED };

class ISensor {
public:
    virtual ESensorType GetType() const = 0;
};

void ProcessSensor(ISensor *p_pSensor) {
    switch (p_pSensor->GetType()) {
        case SENSOR_ALTITUDE:
            static_cast<CAltitudeSensor *>(p_pSensor)->Calibrate();
            break;
        case SENSOR_AIRSPEED:
            /* ... */
            break;
    }
}

// Good 3 — Visitor pattern
class ISensorVisitor {
public:
    virtual void Visit(CAltitudeSensor &s) = 0;
    virtual void Visit(CAirSpeedSensor &s) = 0;
    virtual ~ISensorVisitor() {}
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

## Class Hierarchy Depth

깊은 hierarchy의 일반적 단점:
- Maintenance 어려움
- Cognitive load 증가
- Virtual call cost 누적

JSF는 *얕은 hierarchy* 권장. *Flat is better than nested*.

## vtable — 메커니즘

```cpp
class CBase {
public:
    virtual void A();
    virtual void B();
};

class CDerived : public CBase {
public:
    void A() override;
};
```

컴파일러가 생성하는 구조 (개념):

```
CBase::vtable      : [&CBase::A, &CBase::B]
CDerived::vtable   : [&CDerived::A, &CBase::B]

각 객체에 _vptr 포함:
  CDerived obj   : { _vptr → CDerived::vtable, members }

Virtual call:
  p->A();  →  (p->_vptr[0])(p);  // 1 indirection
```

정확한 layout은 *ABI/컴파일러* 의존.

## Composition 우선 — 일반 예

```cpp
// 회피 — Inheritance from concrete
class CDataLogger {
public:
    void Log(const char *p_msg);
};

class CFlightController : public CDataLogger {
    /* Logger를 *상속*받지만 사실은 *사용*만 */
};

// Good — Composition
class CFlightController {
public:
    explicit CFlightController(CDataLogger *p_pLogger)
        : m_pLogger(p_pLogger) {}
    
    void Process() {
        m_pLogger->Log("Processing");
    }

private:
    CDataLogger *m_pLogger;
};
```

*"Is-a flight controller a logger?"* — No. *Uses a logger*. Composition.

## Interface Segregation

```cpp
// 회피 — fat interface
class ISensorEverything {
public:
    virtual int Read(int *p_pValue) = 0;
    virtual void Calibrate() = 0;
    virtual void Reset() = 0;
    virtual int GetTemperature() = 0;
    virtual int GetPressure() = 0;
    virtual int GetVoltage() = 0;
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
```

작은 interface 다수가 *유연*. 큰 interface가 *implementation 부담*.

## 패턴 — Strategy (Composition + Interface)

```cpp
class IControlStrategy {
public:
    virtual ~IControlStrategy() {}
    virtual float Compute(float p_setpoint, float p_measure) = 0;
};

class CPIDStrategy : public IControlStrategy {
public:
    CPIDStrategy(float p_kp, float p_ki, float p_kd)
        : m_kp(p_kp), m_ki(p_ki), m_kd(p_kd), m_integral(0.0F) {}
    
    float Compute(float p_setpoint, float p_measure) override {
        /* PID logic */
        return 0.0F;
    }

private:
    float m_kp, m_ki, m_kd;
    float m_integral;
};

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
```

*Composition + interface = 유연성*. 알고리즘 교체 가능.

## 패턴 — Observer (Fixed-size)

```cpp
class IFaultObserver {
public:
    virtual ~IFaultObserver() {}
    virtual void OnFaultDetected(int p_faultCode) = 0;
};

class CFaultDetector {
public:
    CFaultDetector() : m_numObservers(0) {}
    
    int RegisterObserver(IFaultObserver *p_pObserver) {
        if (m_numObservers >= MAX_OBSERVERS) return -1;
        m_observers[m_numObservers++] = p_pObserver;
        return 0;
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
    static const int MAX_OBSERVERS = 10;
    IFaultObserver *m_observers[MAX_OBSERVERS];
    int m_numObservers;
    
    bool DetectFault();
    int GetFaultCode();
};
```

*Fixed array (no dynamic alloc)* + *interface dispatch*. JSF 정신.

## RTTI 회피 — Compile-time Polymorphism

C++ template으로 *runtime cost 없는* polymorphism 가능.

```cpp
// Runtime polymorphism
class IShape {
public:
    virtual float Area() const = 0;
};

float TotalArea(IShape **p_pShapes, int n) {
    float total = 0;
    for (int i = 0; i < n; i++) {
        total += p_pShapes[i]->Area();  // virtual
    }
    return total;
}

// Compile-time polymorphism (template)
template <typename T>
float Area(const T &shape) {
    return shape.Area();   // direct call
}

class CCircle {
public:
    float Area() const { return 3.14F * m_radius * m_radius; }
private:
    float m_radius;
};

CCircle c;
float a = Area(c);   // direct call, no vtable
```

Template이 *runtime cost 없음*. 단 *binary size ↑* (각 type instantiation).

## 일반적인 finding (inheritance / RTTI)

```
실전에서 자주 발견되는 위반:

1. Multiple inheritance from 두 concrete class
   → interface (pure abstract) 외 회피

2. Polymorphic class에 virtual destructor 없음
   → 의무

3. dynamic_cast 사용
   → 금지 (-fno-rtti 권장)

4. typeid 사용
   → 금지

5. 깊은 hierarchy
   → 얕게

6. Diamond inheritance
   → design 변경으로 회피

7. override keyword 누락 (C++11 이후)
   → 명시 권장

8. LSP 위반 (Rectangle/Square 류)
   → 의미적 substitutability 검토
```

## 정리

- Composition > Inheritance. 헷갈리면 composition.
- Multiple inheritance — *interface (pure abstract) 외 회피*.
- Virtual은 *overridable 의도*에만. Over-virtualization 회피.
- `override` 키워드 명시 (C++11+).
- Polymorphic class = *virtual destructor 의무*.
- LSP — derived가 base를 *의미적으로 대체* 가능.
- *RTTI 금지* — `typeid`, `dynamic_cast` 사용 X. `-fno-rtti`.
- RTTI 회피 design: virtual function 통일, enum + static_cast, Visitor pattern, template (compile-time).
- *얕은 hierarchy* 권장.
- 정확한 AV Rule 번호·wording은 *원문 PDF*.

## 다음 장 예고

9장은 *Templates* — 제네릭 프로그래밍, JSF의 template 제한.

## 관련 항목

- [Ch 7 — Classes basic](/blog/embedded/aerospace-standards/jsf-cpp/chapter07-classes-basic)
- [Ch 9 — Templates](/blog/embedded/aerospace-standards/jsf-cpp/chapter09-templates)
- [Ch 10 — Exceptions, Memory](/blog/embedded/aerospace-standards/jsf-cpp/chapter10-exceptions-memory-library)
- [AUTOSAR C++14 Ch 5 — Classes](/blog/embedded/automotive/autosar-cpp/chapter05-classes-inheritance)
- [CppCoreGuidelines](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines)
