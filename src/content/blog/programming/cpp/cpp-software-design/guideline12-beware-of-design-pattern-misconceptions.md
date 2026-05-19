---
title: "가이드라인 12: 디자인 패턴 오해를 경계하라"
date: 2026-05-02T12:00:00
description: "패턴은 클래스 다이어그램이 아니다. 의도와 트레이드오프, 그리고 흔한 여섯 가지 오해."
tags: [C++, Software Design, Design Patterns, Anti-patterns]
series: "C++ Software Design"
seriesOrder: 12
draft: true
---

## 왜 이 가이드라인이 중요한가?

가이드라인 11에서 패턴의 목적을 짚었다. 이번 가이드라인은 그 위에 쌓이는 **흔한 오해**를 정리한다.

가장 위험한 오해는 *"패턴은 곧 클래스 다이어그램이다"* 다. 실제 패턴은 다이어그램이나 코드 구조가 아니라 다음 셋이다.

- **의도(intent)**
- **문제와 해결의 관계**
- **트레이드오프**

UML 그림만 보고 의도와 분리된 채 적용하면, 잘못된 자리에 잘못된 패턴을 두게 된다.

## 핵심 내용

- 패턴은 **의도 + 문제 + 해결 + 트레이드오프**다. 다이어그램이 아니다.
- 흔한 여섯 오해는 다음과 같다.
  1. 패턴 = UML 다이어그램
  2. 패턴 = 구현(코드)
  3. 패턴 = 만능
  4. 객체 지향 = 패턴
  5. 패턴 카탈로그 외우기 = 디자인 실력
  6. 같은 구조 = 같은 패턴

## 오해 1 — 패턴은 UML 다이어그램이다

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

이건 Observer 패턴의 *클래스 다이어그램 한 형태*다. 그런데 다음 코드도 똑같이 Observer 패턴이다.

```cpp
button.on_click = []() { /* ... */ };     // 람다 콜백
```

다이어그램이 보이지 않을 뿐 의도는 같다. UML은 한 가지 구현일 뿐이고, 패턴 자체는 더 추상적이다.

## 오해 2 — 패턴은 코드 구조다

```cpp
class Strategy {                    // ⚠️ 이 코드를 보고 "Strategy다!"
    virtual void execute() = 0;
};

class ConcreteStrategy : public Strategy { /* ... */ };

class Context {
    Strategy* s_;
public:
    void use() { s_->execute(); }
};
```

같은 코드 구조가 다른 의도를 가질 수도 있다.

```cpp
class Renderer {                    // Strategy? State? Template Method?
    virtual void execute() = 0;     //   코드만 봐서는 알 수 없다
};
```

패턴은 **의도**다. 같은 코드라도 의도에 따라 Strategy도 되고 State도 된다. 컨텍스트가 결정한다.

### Strategy와 State — 같은 구조, 다른 의도

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

코드는 거의 같다. 차이는 의도에 있다.

- **Strategy** — 클라이언트가 알고리즘을 **선택**한다. 알고리즘끼리는 서로 무관하다.
- **State** — 상태가 **전환**된다. `IdleState`가 다음에 `RunningState`가 된다.

의도가 다르면 다른 패턴이다. UML만으로는 구분되지 않는다.

## 오해 3 — 패턴은 만능이다

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

`a + b` 한 줄에 패턴 세 개가 붙는다. over-engineering이다.

패턴은 문제가 있을 때만 꺼낸다(가이드라인 11). 단순한 코드가 최선일 때가 많다.

원칙은 다음과 같다.

- **YAGNI** — 미래의 가능성을 위해 패턴을 미리 적용하지 않는다.
- **Rule of Three** — 세 번 반복되기 전에는 추상화하지 않는다.
- **단순함이 미덕이다** — 패턴 때문에 단순함을 잃지 않는다.

## 오해 4 — 객체 지향이 곧 패턴이다

GoF가 객체 지향 디자인 책이라 OOP와 패턴이 동의어로 느껴지기 쉽다.

진실은 다르다.

- 패턴은 **언어 독립적**이다. Lisp, Haskell, Rust에도 같은 패턴이 있다.
- OOP만이 길이 아니다. 함수형, 제네릭, 데이터 지향도 디자인의 영역이다.
- 모던 C++은 OOP + 제네릭 + 함수형이 섞여 있다.

```cpp
// 함수형으로 표현한 Strategy
std::function<int(int, int)> op = [](int a, int b) { return a + b; };

// 객체 지향으로 표현한 Strategy
class Op { virtual int apply(int, int) = 0; };

// 같은 패턴, 다른 패러다임
```

C++은 multi-paradigm 언어다. 패턴을 OOP만으로 구현할 필요가 없다.

## 오해 5 — 카탈로그 외우기 = 디자인 실력

> "GoF 23개를 다 외웠으니 디자인을 잘한다" — 거짓이다.

진실은 다음과 같다.

- **언제 적용할지** — 카탈로그가 알려 주지 않는다.
- **어떻게 변형할지** — 도메인마다 다르다.
- **트레이드오프** — 컨텍스트에 따라 달라진다.

진짜 실력은 **의도 인식과 트레이드오프 판단**이다. 카탈로그는 어휘이자 시작점일 뿐이다.

학습 단계는 가이드라인 11에서 본 대로 인식 → 이해 → 적용 → 창조다. 대다수가 1~2단계에 머문다. 3~4단계가 진짜 디자인 영역이다.

## 오해 6 — 같은 구조면 같은 패턴이다

이미 오해 2에서 Strategy와 State의 사례를 봤다. 더 있다.

### Adapter, Decorator, Proxy

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

코드는 같지만 의도가 다르다.

| 패턴 | 의도 |
| --- | --- |
| **Adapter** | 인터페이스 변환 — 호환되지 않는 API를 맞춘다 |
| **Decorator** | 기능 추가 — 같은 인터페이스에 새 동작을 더한다 |
| **Proxy** | 접근 제어 — lazy load, security, caching |

같은 wrapping 구조가 의도에 따라 셋 다 될 수 있다. 의도를 이름이나 주석으로 분명히 드러내야 다른 개발자가 이해한다.

## 미묘한 오해 7 — Template Method와 Strategy

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

다음과 비교해 보자.

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

결과는 비슷하지만 방식이 다르다.

- **Template Method** — 상속이다. 알고리즘 골격이 base에 있고, 일부만 derived가 채운다.
- **Strategy** — composition이다. 알고리즘 전체가 교체된다.

모던 권장은 **Composition over Inheritance**(가이드라인 20)다. Strategy를 우선한다.

## 미묘한 오해 8 — Singleton은 만능이다

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

흔한 패턴이지만, 가이드라인 37~38은 *"Singleton은 디자인 패턴이라기보다 구현 패턴"* 이라는 입장이다. 보통은 안티패턴이다.

- 숨겨진 의존성
- 테스트 어려움
- 멀티스레드 함정

대안은 의존성 주입이다(Beautiful C++ 항목 14).

## 오해 9 — Factory는 늘 필요하다

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
auto widget = factory->create();     // 단순한 생성에 Factory가 정말 필요한가?
```

`std::make_unique<Widget>()` 한 줄이면 끝나는 자리에 Factory 클래스 두 개가 붙는다. over-engineering이다.

Factory가 정당한 경우는 다음과 같다.

- 객체 생성에 복잡한 로직이 있을 때(설정 읽기, DI 등).
- 런타임에 타입이 결정될 때.
- 테스트에서 mock 객체를 주입해야 할 때.

단순 생성이라면 `make_unique`를 직접 쓰거나 named constructor면 충분하다.

## 오해 10 — Observer는 늘 안전하다

```cpp
class Subject {
    std::vector<Observer*> observers_;
public:
    void attach(Observer* o) { observers_.push_back(o); }
    void notify() {
        for (auto* o : observers_) o->update();     // ⚠️ 위험하다
    }
};
```

함정은 여럿이다.

- **dangling pointer** — Observer가 detach하지 않고 소멸한다.
- **순환 참조** — Subject와 Observer가 서로 알면 cycle이 생긴다.
- **재진입** — `update` 안에서 attach/detach가 일어나면 vector 변경 중 iterator가 무효가 된다.
- **순서 의존** — observer 호출 순서가 보장되지 않는다.
- **예외** — 한 observer가 throw하면 나머지는 어떻게 되는가?

자세한 해법은 가이드라인 25에서 다룬다. 보통 `weak_ptr`나 `shared_ptr`, 혹은 메시지 큐를 동원한다.

## 오해 11 — Visitor가 OCP를 만족한다

```cpp
class Visitor {
public:
    virtual void visit(Circle&) = 0;
    virtual void visit(Square&) = 0;
};
```

새 도형을 더하면 Visitor 인터페이스가 바뀌고 모든 visitor 구현을 손봐야 한다. 도형 추가에는 OCP가 깨진다.

Visitor는 **새 연산 추가**에서는 OCP를 만족하지만 **새 타입 추가**에서는 위반한다. 가이드라인 5의 Expression Problem이 이 이야기다.

## 잘못된 패턴 적용 — 네 가지 신호

### 1) "패턴을 적용했는데 코드가 더 복잡해졌다"

패턴이 도메인에 맞지 않는다는 신호다. 단순화를 검토한다.

### 2) "다음 변경에 패턴이 방해가 된다"

추상화의 축이 잘못 잡혔다. 리팩토링한다.

### 3) "왜 이 패턴인지 설명하지 못한다"

이해 없이 카탈로그를 따라간 결과다. ADR을 써서 의도를 명시한다(가이드라인 10).

### 4) "팀이 같은 패턴을 다르게 부른다"

같은 코드를 누구는 Strategy로, 누구는 Command로 부른다. 의도가 불명확하다. 용어를 통일한다.

## 패턴 vs 라이브러리 — 모던 C++

C++ 표준 라이브러리가 많은 패턴을 내장하고 있다.

| GoF 패턴 | 표준 도구 |
| --- | --- |
| Singleton | (자제) — 의존성 주입을 우선 |
| Iterator | `<iterator>` |
| Visitor | `std::visit` + `std::variant` |
| Strategy | `std::function`, 람다 |
| Observer | `std::signal`(Boost), `std::observer_ptr`(제안) |
| Adapter | `std::span`, `std::string_view` |
| Decorator | 함수 합성 |
| Command | `std::function`, `std::packaged_task` |
| Memento | `std::any`, `std::variant` |
| Composite | `std::variant<Leaf, std::vector<Tree>>` (재귀) |

표준 도구가 패턴 직접 구현을 종종 대체한다. 가이드라인 17(`std::variant`로 Visitor)이 한 예다.

## 클래스 vs 함수 — 패턴의 도구

GoF 시대에는 모든 게 클래스였다. 모던 C++에서는 다르다.

```cpp
// GoF Strategy — 클래스 기반
class SortStrategy { virtual void sort(...) = 0; };

// 모던 — 함수 객체나 람다
auto sort_strategy = [](auto& v) { std::sort(v.begin(), v.end()); };
```

함수가 더 작은 추상화 단위다. 클래스가 정말 필요한지 매번 자문하자.

## 함정 — 패턴 이름을 잘못 쓴다

```cpp
class UserManager {     // ⚠️ "Manager"는 패턴이 아니라 안티패턴에 가깝다
    // ...
};

class UserHelper {      // ⚠️ "Helper"도 안티
    // ...
};
```

"Manager", "Helper", "Util", "Processor" 같은 이름은 의미가 비어 있다. 도메인의 의도가 드러나지 않는다. 가이드라인 14에서 의미 있는 이름을 다룬다.

## 패턴 너머의 큰 원칙 — Composition over Inheritance

GoF의 큰 메시지는 다음 한 문장이다.

> "**Favor object composition over class inheritance.**"

대다수 GoF 패턴이 composition 기반이다. 상속은 특정 경우에만 쓰인다.

```cpp
// 잘못된 모양 — 상속 남용
class FastCar : public Car { /* ... */ };
class FastSedan : public Sedan, public FastCar { /* 다중 상속, 복잡 */ };

// 좋은 모양 — composition
class Car {
    Engine engine_;
    Transmission trans_;
public:
    explicit Car(Engine e, Transmission t) : engine_(e), trans_(t) {}
};
```

상속은 IS-A, composition은 HAS-A다. 대부분은 HAS-A다. 가이드라인 20에서 자세히 다룬다.

## 깊은 메시지 — 패턴은 도구일 뿐이다

```
원칙 (SOLID, DRY, KISS, ...)
    ↓
디자인 속성 (변경 가능성, 결합도, ...)
    ↓
패턴 (검증된 해결책)
    ↓
구현 (코드)
```

패턴은 중간 도구다. 더 근본적인 것은 **원칙과 속성**이다. 패턴 적용 자체가 목적은 아니다.

## 좋은 패턴 사용의 다섯 표지

1. **의도가 명확하다** — 왜 적용했는지 ADR이나 주석에 적혀 있다.
2. **이름이 정확하다** — 표준 이름을 쓴다("Observer", "Strategy" 등).
3. **도메인 어휘를 함께 쓴다** — 패턴 이름만이 아니라 도메인 용어로(`Logger`, `OrderRepository`).
4. **트레이드오프를 인지한다** — 비용까지 의식한다.
5. **단순함이 유지된다** — 패턴 때문에 코드가 더 복잡해지지 않는다.

## 실무 가이드 — 패턴을 적용하기 전

다음 질문을 던지자.

- [ ] 문제가 분명한가? 어떤 변화 압력, 어떤 결합도 문제인가?
- [ ] 단순한 해결책으로는 정말 안 되는가? (YAGNI)
- [ ] 이 패턴의 의도가 지금 문제와 일치하는가? 같은 구조라고 같은 패턴은 아니다.
- [ ] 트레이드오프를 알고 있는가? 비용은 무엇인가?
- [ ] 모던 C++ 도구(`std::variant`, `std::function`)로 더 간단히 풀 수 있지 않은가?
- [ ] 표준 라이브러리에 이미 있는 도구는 아닌가? (`std::visit` 등)

## 실무 가이드 — 코드 리뷰

- [ ] 패턴 이름이 코드와 문서에 명시되어 있는가?
- [ ] 같은 패턴을 팀이 같은 용어로 부르는가?
- [ ] 의도가 도메인 어휘로 드러나는가?
- [ ] 단순한 대안을 검토했는가?

## 정리

흔한 오해를 다시 정리하면 다음과 같다.

1. 패턴 = UML — 틀렸다. 패턴은 의도다.
2. 패턴 = 코드 — 틀렸다. 같은 코드라도 다른 패턴일 수 있다.
3. 패턴 = 만능 — 틀렸다. 문제가 있을 때만 적용한다.
4. OOP = 패턴 — 틀렸다. 다중 패러다임이다.
5. 카탈로그 외우기 = 실력 — 틀렸다. 의도 인식이 본질이다.
6. 같은 구조 = 같은 패턴 — 틀렸다. 의도가 결정한다.

진짜 디자인 실력은 **의도 인식 + 트레이드오프 판단 + 단순함 유지**다.

## 관련 항목

- [가이드라인 11: 패턴의 목적](/blog/programming/cpp/cpp-software-design/guideline11-understand-the-purpose-of-design-patterns) — 패턴의 정의
- [가이드라인 13: 패턴은 어디에나 있다](/blog/programming/cpp/cpp-software-design/guideline13-design-patterns-are-everywhere) — 일상의 패턴
- [가이드라인 14: 패턴 이름으로 의도 전달](/blog/programming/cpp/cpp-software-design/guideline14-use-a-design-patterns-name-to-communicate-intent) — 이름의 가치
- [가이드라인 20: composition over inheritance](/blog/programming/cpp/cpp-software-design/guideline20-favor-composition-over-inheritance) — 패턴 너머의 큰 원칙
