---
title: "가이드라인 12: 디자인 패턴 오해를 경계하라"
date: 2026-05-13T22:00:00
description: "패턴은 클래스 다이어그램이 아니다 — 의도와 트레이드오프. 흔한 6가지 오해."
tags: [C++, Software Design, Design Patterns, Anti-patterns]
series: "C++ Software Design"
seriesOrder: 12
---

## 왜 이 가이드라인이 중요한가?

가이드라인 11에서 — 패턴의 목적. 이번엔 **흔한 오해**를 정리.

가장 위험한 오해 — "**패턴 = 클래스 다이어그램**". 실제 패턴은:
- 클래스 다이어그램 (UML)
- 코드 구조

가 아니라

- **의도** (intent)
- **문제와 해결의 관계**
- **트레이드오프**

UML만 보고 — 의도와 분리되어 적용하면, **잘못된 곳에 잘못된 패턴**.

## 핵심 내용

- 패턴 = **의도 + 문제 + 해결 + 트레이드오프**, 다이어그램 X
- **6가지 흔한 오해**:
  1. 패턴 = UML 다이어그램
  2. 패턴 = 구현 (코드)
  3. 패턴 = 만능
  4. 객체 지향 = 패턴
  5. 패턴 카탈로그 외우기 = 디자인 실력
  6. 같은 구조 = 같은 패턴

## 오해 1 — 패턴 = UML 다이어그램

```
              ┌─────────┐
              │ Subject │
              └────┬────┘
              attach│detach│notify
                   ▼
              ┌─────────┐         ┌──────────┐
              │Observer │◄────────│ Concrete │
              └─────────┘         │ Subject  │
              update()             └──────────┘
```

UML — Observer 패턴의 *클래스 다이어그램*. 그러나:

```cpp
button.on_click = []() { /* ... */ };     // 람다로 콜백
```

이것도 — **Observer 패턴**이다. 다이어그램이 안 보이지만 의도는 동일.

UML은 — 한 가지 구현. 패턴 자체는 더 추상적.

## 오해 2 — 패턴 = 코드 구조

```cpp
class Strategy {                    // ⚠️ 이걸 보고 "Strategy다!"
    virtual void execute() = 0;
};

class ConcreteStrategy : public Strategy { /* ... */ };

class Context {
    Strategy* s_;
public:
    void use() { s_->execute(); }
};
```

같은 코드 구조 — 다른 의도:

```cpp
class Renderer {                    // Strategy? State? Template Method? 
    virtual void execute() = 0;     //   코드만으론 모름
};
```

패턴 = **의도**. 같은 코드가 — 의도에 따라 Strategy일 수도 State일 수도. 컨텍스트가 결정.

### Strategy vs State — 같은 구조, 다른 의도

```cpp
class Algorithm {
    virtual void process() = 0;
};
class QuickSort : public Algorithm { /* ... */ };
class MergeSort : public Algorithm { /* ... */ };
```

```cpp
class State {
    virtual void handle() = 0;
};
class IdleState    : public State { /* ... */ };
class RunningState : public State { /* ... */ };
```

코드 동일. 차이:
- **Strategy** — 클라이언트가 알고리즘 **선택**, 알고리즘끼리 무관
- **State** — 상태가 **전환** 가능, IdleState가 다음에 RunningState로

의도 다름 → 다른 패턴. UML만으론 구분 불가.

## 오해 3 — 패턴 = 만능

```cpp
class SimpleAdder {
    int add(int a, int b) { return a + b; }
};

// "패턴 적용해야지!"
class IAdder {
    virtual int add(int, int) = 0;
};
class SimpleAdderImpl : public IAdder { /* ... */ };
class AdderFactory {
    virtual std::unique_ptr<IAdder> create() = 0;
};
```

`a + b` 한 줄에 — 패턴 3개 적용. **over-engineering**.

패턴 = **문제가 있을 때만** (가이드라인 11). 단순한 코드가 — 종종 최선.

원칙:
- **YAGNI** — 미래의 가능성을 위해 패턴 X
- **Rule of Three** — 3번 반복되기 전엔 추상화 X
- **단순함이 미덕** — 패턴 적용으로 단순함 잃지 마라

## 오해 4 — 객체 지향 = 패턴

GoF가 — 객체 지향 디자인 책이라 OOP=패턴의 인상.

진실:
- 패턴은 — **언어 독립적** (Lisp, Haskell, Rust에도 패턴 존재)
- OOP가 — 유일한 길 X. 함수형, 제네릭, 데이터 지향 등도 디자인의 영역
- 모던 C++ — OOP + 제네릭 + 함수형 혼합

```cpp
// 함수형 — Strategy 패턴
std::function<int(int, int)> op = [](int a, int b) { return a + b; };

// 객체 지향 — Strategy 패턴
class Op { virtual int apply(int, int) = 0; };

// 같은 패턴, 다른 패러다임
```

C++은 — **multi-paradigm**. 패턴을 OOP만으로 구현할 필요 X.

## 오해 5 — 패턴 카탈로그 외우기 = 디자인 실력

```
"GoF 23개 다 외웠다 → 디자인 잘함" — 거짓
```

진실:
- **언제 적용?** — 카탈로그가 안 알려줌
- **어떻게 변형?** — 도메인마다 다름
- **트레이드오프?** — 컨텍스트 의존

진정한 실력 = **의도 인식 + 트레이드오프 판단**. 카탈로그는 — 어휘 + 시작점.

학습 단계 (가이드라인 11 참고):
1. **인식** — 코드에서 패턴 보기
2. **이해** — 의도 + 트레이드오프
3. **적용** — 도메인에 맞게 변형
4. **창조** — 새 패턴 인식 / 명명

대다수가 — 1-2 단계. **3-4 단계**가 진짜 디자인.

## 오해 6 — 같은 구조 = 같은 패턴

이미 오해 2에서 — Strategy vs State. 다른 예:

### Adapter vs Decorator vs Proxy

```cpp
class Component {
    virtual void operate() = 0;
};

class Wrapper : public Component {
    Component* wrapped_;
public:
    void operate() override {
        // ... wrapped_->operate(); ...
    }
};
```

코드 동일. 의도 차이:

| 패턴 | 의도 |
| --- | --- |
| **Adapter** | 인터페이스 변환 — incompatible API 호환 |
| **Decorator** | 기능 추가 — 같은 인터페이스에 새 동작 |
| **Proxy** | 접근 제어 — lazy load, security, caching |

같은 wrapping 구조 — 의도에 따라 셋 다 가능. 의도를 명시(이름, 주석)해야 — 다른 개발자가 이해.

## 미묘한 오해 7 — Template Method vs Strategy

```cpp
// Template Method
class Algorithm {
public:
    void run() {
        step1();
        step2();
        step3();
    }
    
protected:
    virtual void step1() = 0;
    void step2() { /* 공통 */ }
    virtual void step3() = 0;
};

class ConcreteAlgorithm : public Algorithm {
protected:
    void step1() override;
    void step3() override;
};
```

vs

```cpp
// Strategy
class Context {
    Strategy& strategy_;
public:
    void run() {
        prepare();
        strategy_.execute();
        cleanup();
    }
};
```

비슷한 결과 — 다른 방식.

**Template Method** — 상속, 알고리즘 골격 base, 일부만 derived.
**Strategy** — composition, 알고리즘 전체 교체.

**모던 권장** (가이드라인 20): **Composition over Inheritance** → Strategy 우선.

## 미묘한 오해 8 — Singleton은 만능

```cpp
class Logger {
public:
    static Logger& instance() {
        static Logger l;
        return l;
    }
};

Logger::instance().log("...");
```

흔한 패턴 — 그러나 가이드라인 37-38 — **"Singleton은 디자인 패턴이라기보다 구현 패턴"**, 그리고 보통 안티패턴.

- 숨겨진 의존성
- 테스트 어려움
- 멀티스레드 함정

대안: **의존성 주입** (가이드라인 14 EC++, Beautiful C++ 14).

## 오해 9 — Factory는 항상 필요

```cpp
class WidgetFactory {
public:
    virtual std::unique_ptr<Widget> create() = 0;
};

class StandardWidgetFactory : public WidgetFactory {
public:
    std::unique_ptr<Widget> create() override {
        return std::make_unique<Widget>();
    }
};

// 사용
auto factory = std::make_unique<StandardWidgetFactory>();
auto widget = factory->create();     // 단순한 Widget 생성에 Factory?
```

`std::make_unique<Widget>()` 한 줄로 끝나는데 — Factory 클래스 2개. Over-engineering.

Factory가 정당한 경우:
- 객체 생성 — **복잡한 로직** (설정 읽기, DI, 등)
- 런타임 결정 — **타입이 다양**
- 테스트에서 — **mock 객체 주입**

단순 생성 — `make_unique` 직접 또는 named constructor.

## 오해 10 — Observer는 항상 안전

```cpp
class Subject {
    std::vector<Observer*> observers_;
public:
    void attach(Observer* o) { observers_.push_back(o); }
    void notify() {
        for (auto* o : observers_) o->update();     // ⚠️ 위험
    }
};
```

함정:
- **dangling pointer** — Observer가 detach 안 하고 소멸
- **순환 참조** — Subject ↔ Observer가 서로 알면 cycle
- **재진입** — update 안에서 attach/detach → vector 변경 중 iterator 무효
- **순서 의존** — observer 호출 순서 보장 X
- **예외** — 한 observer가 throw하면 나머지는?

해결책 — 가이드라인 25에서 자세히. 보통 `weak_ptr`, `shared_ptr`, 또는 message queue.

## 오해 11 — Visitor가 OCP

```cpp
class Visitor {
public:
    virtual void visit(Circle&) = 0;
    virtual void visit(Square&) = 0;
};
```

새 도형 추가 → **Visitor 인터페이스 변경** + **모든 visitor 구현 수정**. 도형 추가에는 OCP 위반.

Visitor는 — **새 연산 추가**에 OCP, **새 타입 추가**엔 OCP 위반. 가이드라인 5 (Expression Problem) 참고.

## 잘못된 패턴 적용 — 4 신호

### 1) "패턴 적용했는데 더 복잡해짐"

신호 — 패턴이 도메인에 안 맞음. 단순화 검토.

### 2) "다음 변경에 패턴이 방해됨"

추상화가 — 잘못된 변화의 축으로. refactor.

### 3) "왜 이 패턴인지 설명 못 함"

이해 없이 — 카탈로그 따라함. ADR 작성으로 의도 명시 (가이드라인 10).

### 4) "팀이 패턴을 다르게 부름"

같은 코드를 한 명은 "Strategy", 다른 명은 "Command"로 부름. 의도 불명확. 통일.

## 패턴 vs 라이브러리 — 모던 C++

C++ 표준 라이브러리가 — 많은 패턴 내장:

| GoF 패턴 | 표준 도구 |
| --- | --- |
| Singleton | (자제) — 의존성 주입 |
| Iterator | `<iterator>` |
| Visitor | `std::visit` + `std::variant` |
| Strategy | `std::function`, 람다 |
| Observer | `std::signal` (Boost), `std::observer_ptr` (제안) |
| Adapter | `std::span`, `std::string_view` |
| Decorator | function composition |
| Command | `std::function`, `std::packaged_task` |
| Memento | `std::any`, `std::variant` |
| Composite | `std::variant<Leaf, std::vector<Tree>>` (재귀) |

**표준 도구가 — 종종 패턴 직접 구현 대체**. 가이드라인 17 (`std::variant` for Visitor) 등.

## 클래스 vs 함수 — 패턴 도구

GoF 시대 — 모든 게 클래스. 모던 C++:

```cpp
// GoF Strategy (클래스)
class SortStrategy { virtual void sort(...) = 0; };

// 모던 (함수 객체 / 람다)
auto sort_strategy = [](auto& v) { std::sort(v.begin(), v.end()); };
```

**함수가 — 더 작은 추상화 단위**. 클래스가 정말 필요한지 매번 자문.

## 함정 — 패턴 이름 잘못 사용

```cpp
class UserManager {     // ⚠️ "Manager"는 패턴이 아님 — anti-pattern
    // ...
};

class UserHelper {      // ⚠️ "Helper"도 안티
    // ...
};
```

"Manager", "Helper", "Util", "Processor" — **의미 없는 이름**. 도메인 의도가 없음. 가이드라인 14에서 — 의미 있는 이름.

## 패턴 외 — Composition over Inheritance

GoF의 큰 메시지:

> "**Favor object composition over class inheritance.**"

대다수 GoF 패턴 — composition 기반. 상속은 — 특정 경우만.

```cpp
// 잘못 — 상속 남용
class FastCar : public Car { /* ... */ };
class FastSedan : public Sedan, public FastCar { /* 다중 상속, 복잡 */ };

// 좋음 — composition
class Car {
    Engine engine_;
    Transmission trans_;
public:
    explicit Car(Engine e, Transmission t) : engine_(e), trans_(t) {}
};
```

상속은 — IS-A. composition은 — HAS-A. 대부분 HAS-A.

가이드라인 20 — 이 원칙 자세히.

## 깊은 메시지 — 패턴은 도구

```
원칙 (SOLID, DRY, KISS, ...)
    ↓
디자인 속성 (변경 가능성, 결합도, ...)
    ↓
패턴 (검증된 해결책)
    ↓
구현 (코드)
```

패턴은 — 중간 도구. **원칙과 속성**이 더 근본. 패턴 적용 자체가 목적 X.

## 좋은 패턴 사용의 5 표지

1. **의도가 명확** — 왜 적용했는지 ADR / 주석으로
2. **이름이 정확** — 표준 이름 사용 ("Observer", "Strategy")
3. **도메인 어휘** — 패턴 이름만이 아닌, 도메인 용어로 (`Logger`, `OrderRepository`)
4. **트레이드오프 인지** — 비용도 의식
5. **단순함 유지** — 패턴이 코드를 더 복잡하게 만들지 않음

## 실무 가이드 — 패턴 적용 전

질문:

- [ ] **문제가 명확한가?** 어떤 변화의 압력? 어떤 결합도?
- [ ] **단순한 해결책으로 안 되는가?** (YAGNI)
- [ ] **이 패턴의 의도가 문제와 일치하는가?** 같은 구조라고 같은 패턴 X
- [ ] **트레이드오프를 알고 있는가?** 비용은?
- [ ] **모던 C++ 도구로 더 간단히?** (`std::variant`, `std::function`)
- [ ] **표준 라이브러리에 이미 있나?** (`std::visit` 등)

## 실무 가이드 — 코드 리뷰

- [ ] 패턴 이름이 — 코드/문서에 명시?
- [ ] 같은 패턴을 — 팀이 같은 용어로?
- [ ] 의도가 도메인 어휘로?
- [ ] 단순한 대안 검토했는가?

## 정리

흔한 오해:
1. 패턴 = UML — **틀림** (패턴은 의도)
2. 패턴 = 코드 — **틀림** (같은 코드, 다른 패턴 가능)
3. 패턴 = 만능 — **틀림** (문제 있을 때만)
4. OOP = 패턴 — **틀림** (다중 패러다임)
5. 카탈로그 = 실력 — **틀림** (의도 인식이 본질)
6. 같은 구조 = 같은 패턴 — **틀림** (의도가 결정)

진짜 디자인 실력 = **의도 인식 + 트레이드오프 판단 + 단순함 유지**.

## 관련 항목

- [가이드라인 11: 패턴의 목적](/blog/programming/cpp-software-design/guideline11-understand-the-purpose-of-design-patterns) — 패턴 정의
- [가이드라인 13: 패턴은 어디에나](/blog/programming/cpp-software-design/guideline13-design-patterns-are-everywhere) — 일상의 패턴
- [가이드라인 14: 패턴 이름으로 의도](/blog/programming/cpp-software-design/guideline14-use-a-design-patterns-name-to-communicate-intent) — 이름의 가치
- [가이드라인 20: composition over inheritance](/blog/programming/cpp-software-design/guideline20-favor-composition-over-inheritance) — 패턴의 큰 원칙
