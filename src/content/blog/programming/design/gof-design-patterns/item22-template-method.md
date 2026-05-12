---
title: "GoF 22: Template Method"
date: 2026-02-04T11:00:00
description: "알고리즘 골격은 base, 단계 구현은 derived — Hollywood 원칙."
tags: [Design Pattern, GoF, C++, C, Behavioral]
series: "GoF Design Patterns"
seriesOrder: 22
---

## 한 줄 요약

> **"전체 흐름은 내가, 빈칸만 채워"** — base가 알고리즘 구조를, derived가 단계를.

## "Hollywood 원칙"

> **"Don't call us, we'll call you."**

base가 흐름을 통제, derived는 hook만 제공. **제어 반전**.

## 어떤 문제를 푸는가

데이터 마이닝 — 단계는 모두 같음 (열기 → 파싱 → 분석 → 보고 → 닫기), 그러나 입력 형식별로 파싱·분석이 다릅니다.

```
열기 (공통)        ← base
파싱 (CSV/JSON?)    ← derived 결정
분석 (도메인별)     ← derived 결정
보고 (포맷별)       ← derived 결정
닫기 (공통)        ← base
```

골격을 base에, 변형 단계를 derived에 — 같은 흐름을 여러 형식에 재사용.

## 한눈에 보는 구조

<img src="/images/blog/gof/diagrams/item22-template-method.svg" alt="Template Method 패턴 클래스 다이어그램" style="max-width:100%; background:white; padding:8px; border-radius:6px;" />

`templateMethod()`는 **non-virtual** — 호출 흐름이 derived에서 바뀌면 안 됨.

## 언제 쓰면 좋은가

- 알고리즘의 **불변 부분**을 한 번만 구현, **변형 부분**을 서브클래스에
- 서브클래스 사이의 **공통 동작**을 분리해 중복 제거
- 서브클래스 확장점을 통제 (어떤 단계만 override 가능한지 명시)

## 언제 쓰면 안 되나

> ⚠️ **상속 강제** — composition + Strategy가 더 유연한 경우 많음.

> ⚠️ **Liskov 위험** — derived가 잘못 override하면 알고리즘 깨짐.

## C++ 구현

### 1. AbstractClass — Template Method + 추상 단계

```cpp
class DataMiner {
public:
    virtual ~DataMiner() = default;

    // Template Method — non-virtual (override 막음)
    void mine(const std::string& path) {
        auto raw      = openFile(path);          // 공통
        auto parsed   = parseData(raw);          // ◄── variable
        auto analyzed = analyze(parsed);         // ◄── variable
        report(analyzed);                        // ◄── variable
        closeFile();                             // 공통
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
```

### 2. ConcreteClass

```cpp
class CsvMiner : public DataMiner {
protected:
    ParsedData parseData(const std::string& raw) override { /* CSV 파싱 */ }
    Result     analyze(const ParsedData& d)      override { /* ... */ }
    void       report(const Result& r)           override { /* CSV 리포트 */ }
};

class JsonMiner : public DataMiner { /* JSON 버전 */ };
```

### 3. 사용

```cpp
CsvMiner m;
m.mine("data.csv");   // 알고리즘 흐름은 공통, 단계만 CSV별
```

## NVI (Non-Virtual Interface) — Template Method의 일반화

public non-virtual + private virtual hook.

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

EMC++ item 35 / 본 시리즈의 [Strategy](/blog/programming/design/gof-design-patterns/item21-strategy) 항목 참고.

## Hook 메서드 — 선택적 override

추상이 아닌 **기본 구현 제공**, derived가 원하면 override.

```cpp
class Algorithm {
public:
    void run() {
        if (shouldLog()) log();      // ◄── hook
        doStep();
    }
private:
    virtual bool shouldLog() const { return false; }    // 기본
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

## Template Method vs Strategy — 같은 문제, 다른 해결

| | Template Method | Strategy |
| --- | --- | --- |
| 결합 | 상속 | composition |
| 결정 시점 | 컴파일 타임 | 런타임 |
| 변경 단위 | 단계별 | 알고리즘 전체 |
| 유연성 | ⚠️ 상속 트리에 묶임 | ✅ 런타임 교체 |

## 트레이드오프 — 한눈에

| 차원 | Template Method |
| --- | --- |
| 알고리즘 골격 재사용 | ✅ DRY |
| 변경점 명확 | ✅ override할 단계가 인터페이스에 |
| Hollywood 원칙 (코드 흐름 일관) | ✅ |
| 상속 강제 | ❌ |
| Liskov 위험 | ⚠️ 잘못 override하면 깨짐 |
| 깊은 계층 디버깅 | ⚠️ base/derived 호출 interleave |

## 실제 사례

- 모든 **컴파일러의 빌드 파이프라인**
- **프레임워크 lifecycle 메서드** (Java Servlet의 `service()`, React 컴포넌트 lifecycle)
- **게임 엔진의 update loop**
- **ASP.NET MVC controller** 흐름

## 관련 패턴

- **[Factory Method (item 3)](/blog/programming/design/gof-design-patterns/item03-factory-method)** — Factory Method는 Template Method 안의 단계로 자주 등장
- **[Strategy (item 21)](/blog/programming/design/gof-design-patterns/item21-strategy)** — 같은 문제의 다른 해결 (상속 vs composition)
- **[Composite (item 8)](/blog/programming/design/gof-design-patterns/item08-composite)** — Template Method가 Composite 노드를 순회하는 형태도 흔함
