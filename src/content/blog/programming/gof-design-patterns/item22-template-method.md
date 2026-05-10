---
title: "GoF 22: Template Method"
date: 2026-02-04T11:00:00
description: "알고리즘의 골격을 base에, 단계 구현을 derived에 — Hollywood 원칙."
tags: [Design Pattern, GoF, C++, C, Behavioral]
series: "GoF Design Patterns"
seriesOrder: 22
draft: true
---

## 의도

알고리즘의 **골격을 base 클래스**에 정의하고, 일부 단계는 **derived가 구현**하도록 합니다. 알고리즘 구조는 유지하면서 특정 단계만 변경.

## "Hollywood 원칙"

> "Don't call us, we'll call you."

base가 흐름을 통제, derived는 hook만 제공. 일반 함수 호출(derived → base)이 아니라 base → derived 호출 (제어 반전).

## 동기

데이터 마이닝 — 단계는 모두 같음 (열기 → 파싱 → 분석 → 보고 → 닫기), 그러나 입력 형식별로 파싱·분석이 다름. 골격을 base에, 변형 단계를 derived에.

## 적용 가능성

- 알고리즘의 불변 부분을 한 번만 구현하고, 변형 부분을 서브클래스에 맡기고 싶을 때
- 서브클래스 사이의 공통 동작을 분리해 코드 중복 제거
- 서브클래스 확장점을 통제 (어떤 단계를 override 가능한지 명시)

## 구조

```
   AbstractClass
   + templateMethod() ─┐
   + step1()*          │ (호출 흐름 결정)
   + step2()*          │
   + commonStep()  ◄───┘
        △
        │
   ConcreteClass
   + step1()
   + step2()
```

## 참여자

- **AbstractClass** — Template Method (알고리즘 골격) + 추상 단계 + 공통 단계
- **ConcreteClass** — 추상 단계 구현

## C++ 구현

```cpp
class DataMiner {
public:
    virtual ~DataMiner() = default;

    // Template Method — non-virtual (override 막음)
    void mine(const std::string& path) {
        auto raw      = openFile(path);
        auto parsed   = parseData(raw);       // 단계 1 (variable)
        auto analyzed = analyze(parsed);      // 단계 2 (variable)
        report(analyzed);                     // 단계 3 (variable)
        closeFile();
    }

protected:
    // 일반 단계 — base 제공
    std::string openFile(const std::string& path) { /* ... */ return ""; }
    void closeFile() { /* ... */ }

    // hook — derived가 정의
    virtual ParsedData parseData(const std::string& raw) = 0;
    virtual Result     analyze(const ParsedData& data)   = 0;
    virtual void       report(const Result& r)           = 0;
};

class CsvMiner : public DataMiner {
protected:
    ParsedData parseData(const std::string& raw) override { /* CSV 파싱 */ }
    Result     analyze(const ParsedData& d)      override { /* ... */ }
    void       report(const Result& r)           override { /* CSV 리포트 */ }
};

class JsonMiner : public DataMiner { /* JSON 버전 */ };

// 사용
CsvMiner m;
m.mine("data.csv");
```

알고리즘 골격(`mine`)은 변경 없음. 단계별 구현만 다름.

## NVI (Non-Virtual Interface)와의 관계

NVI는 Template Method의 일반화 — public non-virtual + private virtual hook.

```cpp
class Widget {
public:
    int healthValue() const {        // template method
        // 사전 처리 (mutex, 로깅 등)
        int v = doHealth();
        // 사후 처리
        return v;
    }
private:
    virtual int doHealth() const = 0;
};
```

EMC++ item 35 / 본 시리즈의 Strategy 항목 참고.

## Hook 메서드

추상이 아닌 **선택적 override** 메서드 — 기본 구현 제공, derived가 원하면 override.

```cpp
class Algorithm {
public:
    void run() {
        if (shouldLog()) log();      // hook
        doStep();
    }
private:
    virtual bool shouldLog() const { return false; }    // 기본 false
    virtual void log() const { /* ... */ }
    virtual void doStep() = 0;
};
```

## C 구현

```c
typedef struct DataMiner {
    ParsedData (*parse_data)(struct DataMiner*, const char*);
    Result     (*analyze)(struct DataMiner*, const ParsedData*);
    void       (*report)(struct DataMiner*, const Result*);
} DataMiner;

void data_miner_mine(DataMiner* m, const char* path) {
    char* raw = open_file(path);
    ParsedData parsed = m->parse_data(m, raw);
    Result r = m->analyze(m, &parsed);
    m->report(m, &r);
    close_file();
}
```

## 결과 (트레이드오프)

**장점**
- 알고리즘 골격 재사용 (DRY)
- 변경점이 명확 (어떤 단계가 derived에서 변할지 인터페이스에 표현)
- Hollywood 원칙으로 코드 흐름 일관성

**단점**
- 상속 강제 (composition + Strategy가 더 유연)
- Liskov 위험 (derived가 잘못 override하면 알고리즘 깨짐)
- 깊은 계층에서 디버깅 어려움 (interleave된 base/derived 호출)

## Strategy와의 비교

같은 문제(알고리즘 변형)에 대한 다른 해결:

- **Template Method**: 상속, 컴파일 타임 결정, 더 가벼움
- **Strategy**: composition, 런타임 교체 가능, 유연성 ↑

상속이 자연스러운 경우(알고리즘이 객체의 본질) Template Method, 외부 정책이면 Strategy.

## 변형

- **NVI** — Template Method의 일반화, 모든 public 가상 함수에 적용
- **Hook + 추상 단계** — 일부는 강제 override (추상), 일부는 선택 (hook)
- **`std::function` 단계** — 상속 없이 Template Method (Strategy로 일반화)

## 알려진 사용 사례

- 모든 컴파일러의 빌드 파이프라인
- 프레임워크의 lifecycle 메서드 (Java Servlet의 `service()` 등)
- 게임 엔진의 update loop
- ASP.NET MVC의 controller 흐름

## 관련 패턴

- **[Factory Method (item 3)](/blog/programming/gof-design-patterns/item03-factory-method)** — Factory Method는 종종 Template Method 안의 단계로 사용됨
- **[Strategy (item 21)](/blog/programming/gof-design-patterns/item21-strategy)** — 같은 문제의 다른 해결 (상속 vs composition)
- **[Composite (item 8)](/blog/programming/gof-design-patterns/item08-composite)** — Template Method가 Composite 노드를 순회하는 형태도 흔함
