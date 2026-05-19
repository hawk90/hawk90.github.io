---
title: "GoF 22: Template Method"
date: 2026-05-01T22:00:00
description: "알고리즘 골격은 base, 단계 구현은 derived — Hollywood 원칙."
tags: [Design Pattern, GoF, C++, C, Behavioral]
series: "GoF Design Patterns"
seriesOrder: 22
draft: false
---

## 한 줄 요약

> **"전체 흐름은 내가, 빈칸만 채워"** — base가 알고리즘 구조를, derived가 단계를.

## "Hollywood 원칙"

> **"Don't call us, we'll call you."**

base가 흐름을 통제, derived는 hook만 제공. **제어 반전**.

## 비유 — 시험지 양식

학교 시험지를 떠올려봅시다. *시험지 양식*은 학교가 만듭니다.

```text
[학교 머리말 + 학년/반/이름란]
1. ___________________
2. ___________________
3. ___________________
[제출 시간 안내]
```

학생은 *양식 자체*를 바꿀 수 없습니다. *빈칸*에 *답*만 채웁니다.

Template Method가 이 *시험지 양식*입니다.

- *양식* = base class의 `templateMethod()` — 알고리즘 골격 고정
- *빈칸* = abstract method (자식이 반드시 채워야)
- *답* = derived class의 override

흐름은 *부모가 결정*합니다 — *"네가 호출하지 마, 내가 호출할게"*라는 *Hollywood 원칙*. 라면 끓이기 절차(물 끓이기 → 면 넣기 → *각자 다른 양념*)도 같은 구조입니다.

## 어떤 문제를 푸는가

데이터 마이닝 — 단계는 모두 같음 (열기 → 파싱 → 분석 → 보고 → 닫기), 그러나 입력 형식별로 파싱·분석이 다릅니다.

순진하게는 형식마다 흐름 통째 복붙:

```cpp
// Bad: 흐름 중복
void mineCsv(const std::string& path) {
    auto raw = openFile(path);
    auto data = parseCsv(raw);     // 다름
    auto res = analyzeCsv(data);   // 다름
    reportCsv(res);                 // 다름
    closeFile();
}

void mineJson(const std::string& path) {
    auto raw = openFile(path);
    auto data = parseJson(raw);    // 다름
    auto res = analyzeJson(data);  // 다름
    reportJson(res);                // 다름
    closeFile();
}
// open/close 흐름 중복 — 새 단계 추가 시 모든 함수 수정
```

골격을 base에, 변형 단계를 derived에 — 같은 흐름을 여러 형식에 재사용.

```
열기 (공통)        ← base
파싱 (CSV/JSON?)    ← derived 결정
분석 (도메인별)     ← derived 결정
보고 (포맷별)       ← derived 결정
닫기 (공통)        ← base
```

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

> ⚠️ **단계 수가 너무 많거나** 서로 의존하면 base 코드 읽기 힘들고 derived가 깰 자유가 너무 큼.

## 헷갈리는 패턴과의 차이

| 비교 대상 | 무엇이 다른가 |
| --- | --- |
| [Strategy](/blog/programming/design/gof-design-patterns/item21-strategy) | Strategy는 *composition + 런타임 교체*. Template Method는 *상속 + 컴파일 타임 고정*. |
| [Factory Method](/blog/programming/design/gof-design-patterns/item03-factory-method) | Factory Method는 *Template Method의 한 단계가 객체 생성*일 때의 특수 경우. 자주 함께 등장. |
| Hook method | Template Method 안의 *override 가능한 빈 메서드* (필수 아닌 선택). |

판별 한 줄: *"알고리즘 골격은 고정, 일부 단계만 자식이 결정한다"*면 Template Method.

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

## 자주 보는 안티패턴

### 1. Template method가 virtual (derived가 흐름 깸)

```cpp
// Bad
class DataMiner {
public:
    virtual void mine(const std::string& path) {   // ◄── virtual
        /* ... */
    }
};

class BadMiner : public DataMiner {
public:
    void mine(...) override {
        // 흐름 통째 바꿈 — base의 일관성 깨짐
    }
};
```

**문제**: Template Method의 핵심(흐름 통제) 무산. derived가 자유롭게 깸.

**해결**: template method는 **non-virtual**. 또는 `final`로 명시.

### 2. Hook을 public으로 노출

```cpp
// Bad
class DataMiner {
public:
    virtual ParsedData parseData(const std::string& raw) = 0;   // ◄── public
};

// 외부에서 직접 호출 가능 → 흐름 우회
miner.parseData(raw);   // open/close 없이
```

**문제**: 호출 순서가 강제 안 됨. partial state 발생.

**해결**: hook을 `protected` (derived만), template method만 `public`.

### 3. Constructor에서 template method 호출 (가상 호출 함정)

```cpp
// Bad
class DataMiner {
public:
    DataMiner(const std::string& path) {
        mine(path);   // ◄── ctor에서 가상 호출
    }
};
```

**문제**: ctor에서 가상 호출은 *base 버전*만 실행 → pure virtual이면 UB.

**해결**: 객체 만든 *후* 별도 호출. `m.mine(path)`.

### 4. 단계 사이의 데이터를 멤버 변수로 (재진입 불가)

```cpp
// Bad
class DataMiner {
    std::string rawData;       // ◄── 단계 사이 공유
    ParsedData parsed;
public:
    void mine(const std::string& path) {
        rawData = openFile(path);
        parsed = parseData();
        // ...
    }
};

// 두 스레드가 동시에 mine() → race
```

**문제**: 멤버에 의존하면 재진입·동시성 깨짐.

**해결**: 단계 사이 데이터를 *반환값*으로 전달. 위 원본 예제처럼.

### 5. Derived가 base의 protected 데이터를 mutation

```cpp
// Bad
class DataMiner {
protected:
    int progress = 0;
};

class BadMiner : public DataMiner {
public:
    ParsedData parseData(...) override {
        progress = 100;   // ◄── base 상태 직접 수정
        /* ... */
    }
};
```

**문제**: base의 invariant가 derived에 의해 깨질 수 있음.

**해결**: protected 데이터를 *최소화*. 변경은 base가 제공하는 protected 메서드로만.

### 6. 단계가 너무 많아 인터페이스 비대화

```cpp
class Game {
public:
    void play() {
        initWindow();
        loadResources();
        initAudio();
        initInput();
        loop();
        cleanupInput();
        cleanupAudio();
        unloadResources();
        closeWindow();
    }
protected:
    virtual void initWindow() = 0;
    virtual void loadResources() = 0;
    // ... 20개 virtual
};
```

**문제**: derived가 *모든* 단계 구현 강제. 대부분 boilerplate.

**해결**: 단계 분할 (Composite Template Method). 또는 hook을 기본 구현 + 선택 override.

## Modern C++ 변형

### 1. CRTP (compile-time template method)

```cpp
template <typename Derived>
class DataMiner {
public:
    void mine(const std::string& path) {
        auto raw    = openFile(path);
        auto parsed = static_cast<Derived*>(this)->parseData(raw);
        auto res    = static_cast<Derived*>(this)->analyze(parsed);
        static_cast<Derived*>(this)->report(res);
        closeFile();
    }
};

class CsvMiner : public DataMiner<CsvMiner> {
public:
    ParsedData parseData(const std::string& raw) { /* ... */ }
    Result     analyze(const ParsedData& d)      { /* ... */ }
    void       report(const Result& r)           { /* ... */ }
};
```

가상 함수 0, 인라인 가능. Curiously Recurring Template Pattern.

### 2. Strategy 변환 — composition으로

```cpp
// Template Method의 단계들을 strategy로
class DataMiner {
    std::function<ParsedData(const std::string&)> parser;
    std::function<Result(const ParsedData&)> analyzer;
    std::function<void(const Result&)> reporter;
public:
    void mine(const std::string& path) {
        auto raw = openFile(path);
        auto p   = parser(raw);
        auto r   = analyzer(p);
        reporter(r);
        closeFile();
    }
};

DataMiner csvMiner{parseCsv, analyzeCsv, reportCsv};
```

상속 없이 같은 효과. 동적 교체 가능.

### 3. Pipeline / coroutine 기반

```cpp
auto mine(std::string_view path) -> std::generator<Step> {
    co_yield Step::OpenFile(path);
    auto raw    = co_await getResult();
    co_yield Step::Parse(raw);
    auto parsed = co_await getResult();
    // ...
}
```

흐름을 명시적 step으로. 중간에 cancel/pause 가능.

### 4. Concept-based static template method

```cpp
template <typename M>
concept Miner = requires(M m, const std::string& raw, const ParsedData& d) {
    m.parseData(raw);
    m.analyze(d);
    m.report(/* ... */);
};

template <Miner M>
void mine(M& m, const std::string& path) {
    auto raw = openFile(path);
    auto p   = m.parseData(raw);
    auto r   = m.analyze(p);
    m.report(r);
    closeFile();
}
```

상속 없이 type-safe.

### 5. Mixin chain (Policy-based)

```cpp
template <typename Parser, typename Analyzer, typename Reporter>
class DataMiner : Parser, Analyzer, Reporter {
public:
    void mine(const std::string& path) {
        auto raw = openFile(path);
        auto p   = Parser::parse(raw);
        auto r   = Analyzer::analyze(p);
        Reporter::report(r);
        closeFile();
    }
};

DataMiner<CsvParser, MyAnalyzer, JsonReporter> miner;
```

각 단계를 type으로 합성.

### 6. Coroutine + ranges pipeline

```cpp
auto pipeline = openFile("data.csv")
              | parseCsv
              | analyze
              | toReport;
```

함수 합성으로 template method를 데이터 흐름으로 재해석.

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

## 성능 — Template Method vs Strategy

`mine()` 100만 번.

| 방식 | 시간 | 비고 |
| --- | --- | --- |
| Virtual Template Method | 3.5s | 단계마다 가상 호출 |
| CRTP | 1.2s | inline 가능 |
| Strategy (`std::function`) | 4.0s | function 객체 overhead |
| Strategy (template) | 1.2s | inline |
| Concept-based | 1.2s | inline |

CRTP / template 기반은 vtable 없이 거의 직접 호출 수준.

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
| Hook 너무 많음 | ⚠️ 인터페이스 비대화 |

## 실제 사례

- **모든 컴파일러의 빌드 파이프라인** — preprocess → parse → semantic → codegen
- **프레임워크 lifecycle 메서드** — Java Servlet `service()`, React component lifecycle, Android Activity
- **게임 엔진의 update loop** — `Update()`, `FixedUpdate()`, `LateUpdate()`
- **ASP.NET MVC controller** 흐름
- **JUnit `@Before` / `@Test` / `@After`** — test lifecycle
- **iOS UIViewController** — `viewDidLoad`, `viewWillAppear`, ...
- **Spring `JdbcTemplate`** — connection lifecycle wrapping
- **OS 커널의 driver model** — `probe()`, `open()`, `read()`, `release()`
- **HTTP request handler** — middleware before/after hook

## 관련 패턴

- **[Factory Method (item 3)](/blog/programming/design/gof-design-patterns/item03-factory-method)** — Factory Method는 Template Method 안의 단계로 자주 등장
- **[Strategy (item 21)](/blog/programming/design/gof-design-patterns/item21-strategy)** — 같은 문제의 다른 해결 (상속 vs composition)
- **[Composite (item 8)](/blog/programming/design/gof-design-patterns/item08-composite)** — Template Method가 Composite 노드를 순회하는 형태도 흔함
- **[Bridge (item 7)](/blog/programming/design/gof-design-patterns/item07-bridge)** — Bridge도 변경점을 분리 — 다른 축
- **[Pattern Relationships (item 24)](/blog/programming/design/gof-design-patterns/item24-pattern-relationships-overview)** — 상속 기반 변형 / composition 기반 변형의 대비
