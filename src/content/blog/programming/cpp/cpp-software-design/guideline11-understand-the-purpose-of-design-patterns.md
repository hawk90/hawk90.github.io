---
title: "가이드라인 11: 디자인 패턴의 목적을 이해하라"
date: 2026-05-13T21:00:00
description: "디자인 패턴은 검증된 해결책이자 공유 어휘다. 의존성 분리와 변화 관리의 도구라는, GoF 30년의 의미."
tags: [C++, Software Design, Design Patterns, GoF]
series: "C++ Software Design"
seriesOrder: 11
---

## 왜 이 가이드라인이 중요한가?

'디자인 패턴'은 자주 오해되는 단어다.

- 오해 1 — "패턴 카탈로그를 외워 그대로 적용하면 된다."
- 오해 2 — "객체 지향은 곧 디자인 패턴이다."
- 오해 3 — "GoF가 정의한 23개가 전부다."
- 오해 4 — "디자인 패턴을 쓰지 않으면 나쁜 코드다."

이 가이드라인은 패턴의 진짜 목적을 짚는다. Iglberger의 메시지는 단순하다.

> "**A design pattern is intended to solve a problem.**"

**문제가 있어야 패턴**이다. 문제도 없는데 패턴을 적용하면 over-engineering이 된다. 여기서 말하는 문제는 보통 **변화의 압력**이나 **결합도 문제**다.

패턴의 핵심 가치는 다음 세 가지다.

1. **검증된 해결책** — 수많은 프로젝트에서 효과가 확인된 것.
2. **공유 어휘** — 팀이 "Strategy 쓰자"라는 한마디로 합의할 수 있는 도구.
3. **변화 관리** — 가이드라인 2를 구체적으로 풀어내는 도구.

## 핵심 내용

- 디자인 패턴은 **검증된 해결책 + 공유 어휘**다.
- 패턴은 문제가 있을 때 적용한다. 해결책을 먼저 두고 문제를 만들어 가지 않는다.
- 핵심 목적은 의존성 분리, 변화 관리, 결합도 격리다.
- GoF는 시작이지 끝이 아니다. 새 패턴이 계속 발견된다(Type Erasure, CRTP 등).
- 패턴 자체가 목적이 아니라 달성하려는 **디자인 속성**이 목적이다.

## 패턴의 정의

```
Pattern = (Problem, Context, Solution, Consequences)
```

각 요소가 의미하는 바는 이렇다.

- **Problem** — 어떤 상황에서 어떤 문제가 생기는가?
- **Context** — 그 문제가 발생하는 배경.
- **Solution** — 어떻게 해결하는가.
- **Consequences** — 적용했을 때의 결과(장단점).

GoF 책은 모든 패턴에서 이 네 요소를 함께 명시한다. 단순한 코드 예제가 아니라 **언제, 왜** 적용하느냐를 다룬다.

## 패턴, idiom, 알고리즘의 차이

| 개념 | 추상화 수준 | 예 |
| --- | --- | --- |
| **Algorithm** | 가장 낮음 | quicksort, binary search |
| **Idiom** | 언어 / 라이브러리 종속 | RAII, copy-and-swap |
| **Pattern** | 언어 독립적 디자인 | Strategy, Visitor |
| **Architecture** | 가장 높음 | MVC, Hexagonal |

패턴은 **언어 독립적인 디자인 단위**다. GoF는 1994년 C++ 책으로 나왔지만 Java, Python을 비롯한 모든 OOP 언어에 그대로 적용된다.

## 패턴이 해결하는 것 — 의존성과 변화

Iglberger의 핵심 주장은 이렇다.

> "**Design patterns enable us to manage dependencies between things.**"

거의 모든 GoF 패턴의 본질이 의존성 분리다.

| 패턴 | 분리하는 의존성 |
| --- | --- |
| Strategy | 알고리즘 ↔ 사용 컨텍스트 |
| Visitor | 연산 ↔ 자료구조 |
| Observer | 발행자 ↔ 구독자 |
| Adapter | 클라이언트 ↔ 외부 라이브러리 |
| Bridge | 추상 ↔ 구현 |
| Decorator | 핵심 기능 ↔ 부가 기능 |

각 패턴이 두 측면 사이에 추상화를 끼워 한쪽이 바뀌어도 다른 쪽이 영향받지 않게 한다.

## 공유 어휘로서의 패턴

```
개발자 A: "이거 어떻게 구현하지?"
개발자 B: "Visitor 패턴 쓰면 돼."
개발자 A: "아, 알았어."     ← 1초 만에 합의된다
```

이름이 없으면 같은 대화가 다음처럼 길어진다.

```
개발자 A: "이거 어떻게 구현하지?"
개발자 B: "음, 각 도형에 같은 연산을 적용하는데, 새 연산이 자주
          추가되니까 도형 클래스 안에 메서드를 넣지 말고, 외부에서
          타입별로 분기해서 처리하는 함수를 만들면 어떨까…"
```

이름의 가치는 분명하다. 패턴 이름이 복잡한 디자인을 한 단어로 압축한다. 팀 간 소통 비용이 줄어든다.

GoF가 이름을 통일해 준 덕에 지난 30년간 전 세계 개발자가 같은 어휘로 디자인을 토론할 수 있었다.

## 함정 — Pattern Fever

```cpp
class Order {
    OrderStateMachine state_;          // State
    PaymentStrategy   payment_;        // Strategy
    NotificationFactory notif_factory_; // Factory
    OrderObserver*    observer_;       // Observer
    OrderVisitor*     visitor_;        // Visitor
    // ... 단순한 주문에 패턴이 가득하다
};
```

문제가 없는데 패턴을 적용하면 over-engineering이 된다. 디자인 패턴 적용 자체가 목적이 되어 버린다.

원칙은 이렇다.

- **문제 → 패턴** 순서다. **패턴 → 문제 만들기**가 아니다.
- 단순한 코드가 자주 정답이다.
- 패턴은 문제가 분명할 때만 꺼낸다(가이드라인 12 참고).

## 함정 — 23개에 갇힌다

GoF의 23개 패턴은 1994년 책이다. 이후 새 패턴이 계속 발견됐다.

- **CRTP** (Curiously Recurring Template Pattern) — C++ 특화
- **Type Erasure** — `std::function`, `std::any`
- **External Polymorphism** — vtable 없이 다형성
- **Pimpl** — 컴파일 의존성 격리
- **NVI** (Non-Virtual Interface) — Template Method 변형
- **Tag Dispatch** — C++ 특화
- **Expression Templates** — Eigen 같은 수치 라이브러리

새 언어 기능과 새 도메인이 등장하면 새 패턴이 생긴다. 23개는 시작점일 뿐이다.

## 함정 — GoF를 그대로 구현한다

```cpp
// GoF 그대로 — 1994년식 C++
class Strategy {
public:
    virtual ~Strategy() = default;
    virtual void execute() = 0;
};

class ConcreteStrategyA : public Strategy { /* ... */ };
class ConcreteStrategyB : public Strategy { /* ... */ };

class Context {
    Strategy* strategy_;     // raw pointer
public:
    Context(Strategy* s) : strategy_(s) {}
    void use() { strategy_->execute(); }
};
```

모던 C++ 버전은 이렇게 생긴다.

```cpp
// 가이드라인 22-23 — 값 기반 Strategy
class Context {
    std::function<void()> strategy_;
public:
    template<typename F>
    Context(F f) : strategy_(std::move(f)) {}
    void use() { strategy_(); }
};

Context c{[]() { /* ... */ }};     // lambda를 그대로 받는다
Context c2{ConcreteStrategyA{}};   // 함수 객체도 받는다
```

`std::variant` 기반도 가능하다.

```cpp
using Strategy = std::variant<StrategyA, StrategyB, StrategyC>;

class Context {
    Strategy strategy_;
public:
    void use() { std::visit([](const auto& s) { s.execute(); }, strategy_); }
};
```

**같은 패턴이지만 구현은 다르다**. C++20에서는 가상 함수 + 상속이 최선이 아닐 때가 많다. Iglberger 책의 큰 가치가 바로 이 모던 재구성이다.

## 패턴은 디자인 속성을 위한 도구다

패턴 자체가 목적이 아니라 달성하려는 **디자인 속성**이 목적이다.

| 속성 | 패턴 |
| --- | --- |
| **변경 가능성** (modifiability) | Strategy, Visitor, Bridge |
| **확장 가능성** (extensibility) | Decorator, Observer |
| **재사용성** | Adapter, Template Method |
| **테스트 가능성** | DI, Strategy |
| **성능** | Flyweight, Object Pool |

목적에서 출발해 패턴을 고른다. "Strategy를 쓸까?"가 아니라 *"변경 가능성이 필요한가?"* 가 먼저다.

## 패턴이 필요하다는 신호 — 세 가지

### 1) 반복되는 if / switch 체인

```cpp
if (format == "html") /* ... */;
else if (format == "json") /* ... */;
else if (format == "xml") /* ... */;
```

→ Strategy 또는 다형성.

### 2) 같은 변환이 여러 곳에 반복된다

```cpp
// 두 곳에서 같은 변환
convert_data(...);
convert_data(...);  // 다른 함수에서
```

→ Adapter 또는 Decorator.

### 3) 강결합 — 한 클래스가 다른 클래스를 너무 잘 안다

```cpp
class A {
    void process(B& b) { b.internal_field_++; }     // ⚠️
};
```

→ Observer 또는 Strategy로 결합을 격리한다.

## Refactoring으로 패턴에 다가간다

> "**Code first, patterns later.**"

처음부터 패턴을 강제하지 않는다. 코드를 쓰고 나서 반복이나 변화 압력이 드러나면 그때 리팩토링한다.

```cpp
// 처음 — 단순하게 시작한다
void process(int format, Data& d) {
    if (format == 1) /* ... */;
    else if (format == 2) /* ... */;
}

// 새 format이 자주 늘어난다 → Strategy로 리팩토링한다
class Processor { virtual void process(Data&) = 0; };
class FormatAProcessor : public Processor { /* ... */ };
```

**Rule of Three** — 세 번 반복되기 전에는 추상화하지 않는다. 가이드라인 2의 정신이다.

## 패턴 분류 — GoF의 세 카테고리

### Creational — 객체 생성

- Singleton, Factory Method, Abstract Factory, Builder, Prototype

### Structural — 클래스와 객체의 구조

- Adapter, Bridge, Composite, Decorator, Facade, Flyweight, Proxy

### Behavioral — 객체 간 책임과 소통

- Chain of Responsibility, Command, Interpreter, Iterator, Mediator,
  Memento, Observer, State, Strategy, Template Method, Visitor

Iglberger의 책은 카테고리와 무관하게, 의존성 분리 관점으로 패턴을 재구성한다.

## 패턴과 안티패턴

```
패턴    — 검증된 해결책
안티패턴 — 흔한 잘못
```

안티패턴도 공유 어휘다.

- **God Class** — SRP 위반
- **Spaghetti Code** — 의존성 폭발
- **Magic Number / String** — 의미 없는 상수
- **Copy-Paste Programming** — DRY 위반
- **Premature Optimization** — 측정 없이 최적화
- **Yo-Yo Problem** — 상속 깊이가 너무 깊다

패턴과 안티패턴은 함께 알아야 한다. 무엇을 해야 하는지와 무엇을 피해야 하는지가 모두 드러난다.

## 함정 — 잘못된 패턴 식별

```cpp
class Singleton {
    static Singleton& instance() { /* ... */ }
};
```

"이건 Singleton 패턴이다"라고 식별하는 것까지는 맞다. 그러나 **싱글톤이 정말로 적절한 해결책인가**는 별개의 문제다. 가이드라인 37~38에서 "Singleton은 디자인 패턴이라기보다 구현 패턴"이라는 입장을 다룬다.

패턴을 식별했다고 적용이 정당화되지는 않는다.

## 패턴 학습의 네 단계

1. **인식(recognition)** — 코드에서 패턴을 알아본다.
2. **이해(understanding)** — 의도와 트레이드오프를 이해한다.
3. **적용(application)** — 도메인에 맞게 변형해 적용한다.
4. **창조(creation)** — 새 패턴을 인식하고 이름을 붙인다.

대다수 개발자가 1~2단계에 머문다. 3~4단계가 진정한 디자인 능력이다.

## 시리즈가 다룰 패턴 카탈로그

### GoF 패턴(Iglberger의 모던 재구성)

- Visitor (15~18)
- Strategy (19~23)
- Command (21)
- Adapter (24)
- Observer (25)
- Bridge (28~29)
- Prototype (30)
- Decorator (35)
- Singleton (37~38)

### C++ 특화 패턴

- CRTP (26~27)
- External Polymorphism (31)
- Type Erasure (32~34)

각 패턴은 GoF 원본, 모던 C++ 재구성, 트레이드오프 세 측면에서 다룬다.

## 패턴보다 더 기본적인 디자인 원칙

- **SOLID** — SRP, OCP, LSP, ISP, DIP
- **DRY** — Don't Repeat Yourself
- **YAGNI** — You Aren't Gonna Need It
- **KISS** — Keep It Simple, Stupid
- **Law of Demeter** — Don't talk to strangers
- **Composition over Inheritance**

패턴은 원칙의 구체적 적용이다. 원칙이 먼저고 패턴이 도구다.

## Iglberger의 권고

1. 패턴 자체가 목적이 아니다. 디자인 속성이 목적이다.
2. 단순한 코드를 우선한다. 문제가 분명할 때만 패턴을 꺼낸다.
3. GoF는 시작이다. 새 패턴을 계속 학습한다.
4. 모던 C++ 도구를 활용한다. 1994년 구현을 그대로 쓰지 않는다.
5. 공유 어휘를 유지한다. 팀이 같은 용어로 말해야 한다.

## 실무 가이드 — 패턴 적용 결정

```
문제 인식
   ↓
"이게 정말 문제인가?" (변화 압력 / 결합도)
   ├── 아니다 → 단순한 코드를 유지한다
   └── 그렇다 → 패턴 검토
                  ↓
              "어떤 디자인 속성이 필요한가?"
                  ↓
              패턴 후보 1~3개
                  ↓
              각 후보의 트레이드오프
                  ↓
              가장 적합한 것 선택
                  ↓
              구현과 코드 리뷰
```

## 실무 가이드 — 체크리스트

패턴을 적용하기 전에 다음을 확인하자.

- [ ] 문제가 분명한가? (변화 / 결합도 / 복잡도)
- [ ] 단순한 해결책이 정말 부족한가? (YAGNI)
- [ ] 어떤 디자인 속성을 달성하려는가?
- [ ] 후보 패턴들의 트레이드오프를 비교했는가?
- [ ] 모던 C++ 도구를 활용할 수 있는가? (variant, function, concepts)
- [ ] 팀이 공유 어휘를 가지고 있는가?

## 정리

디자인 패턴은 **검증된 해결책 + 공유 어휘**다.

핵심은 다음과 같다.

1. 문제가 있어야 패턴이다. 적용 자체가 목적이 아니다.
2. 의존성 분리와 변화 관리가 패턴의 본질이다.
3. GoF는 시작이다. 새 패턴과 모던 재구성이 계속된다.
4. 디자인 속성이 진짜 목표다. 패턴은 도구다.

학습은 인식 → 이해 → 적용 → 창조 순서로 깊어진다.

다음 가이드라인부터 각 패턴의 모던 구현을 본격적으로 다룬다.

## 관련 항목

- [가이드라인 12: 패턴에 대한 오해](/blog/programming/cpp/cpp-software-design/guideline12-beware-of-design-pattern-misconceptions) — 흔한 오해 정리
- [가이드라인 13: 패턴은 어디에나 있다](/blog/programming/cpp/cpp-software-design/guideline13-design-patterns-are-everywhere) — 일상에서 만나는 패턴
- [가이드라인 14: 패턴 이름으로 의도 전달](/blog/programming/cpp/cpp-software-design/guideline14-use-a-design-patterns-name-to-communicate-intent) — 어휘의 가치
- [GoF Design Patterns](/blog/programming/design/gof-design-patterns) — 1994년의 정전
