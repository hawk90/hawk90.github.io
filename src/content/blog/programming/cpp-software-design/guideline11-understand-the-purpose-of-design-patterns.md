---
title: "가이드라인 11: 디자인 패턴의 목적을 이해하라"
date: 2026-05-13T21:00:00
description: "디자인 패턴 = 검증된 해결책 + 공유 어휘 — 의존성 분리와 변화 관리의 도구. GoF 30주년의 의미."
tags: [C++, Software Design, Design Patterns, GoF]
series: "C++ Software Design"
seriesOrder: 11
---

## 왜 이 가이드라인이 중요한가?

"디자인 패턴" — 종종 오해되는 단어:

- **오해 1**: "패턴 카탈로그를 외워 그대로 적용"
- **오해 2**: "객체 지향 = 디자인 패턴"
- **오해 3**: "GoF가 정의한 23개가 전부"
- **오해 4**: "디자인 패턴 안 쓰면 나쁜 코드"

이 가이드라인은 — 패턴의 **진짜 목적**을 명시. Iglberger의 메시지:

> "**A design pattern is intended to solve a problem.**"

**문제가 있어야 패턴**. 문제 없는데 패턴 적용 → over-engineering. 문제는 — **변화의 압력** 또는 **결합도 문제**.

패턴의 핵심 가치:
1. **검증된 해결책** — 수많은 프로젝트에서 입증
2. **공유 어휘** — 팀이 "Strategy 쓰자"로 빠르게 소통
3. **변화 관리** — 가이드라인 2의 구체적 도구

## 핵심 내용

- 디자인 패턴 = **검증된 해결책** + **공유 어휘**
- 패턴은 — **문제가 있을 때** 적용 (해결책 먼저 찾고 문제 만드는 것 X)
- 핵심 목적: **의존성 분리, 변화 관리, 결합도 격리**
- GoF는 — 시작이지 끝이 아님. 새 패턴 계속 발견 (Type Erasure, CRTP, ...)
- 패턴 자체가 목적이 아니라 — **달성하려는 디자인 속성**이 목적

## 패턴의 정의

```
Pattern = (Problem, Context, Solution, Consequences)
```

각 요소:

- **Problem**: 어떤 상황에서 어떤 문제?
- **Context**: 그 문제가 발생하는 배경
- **Solution**: 어떻게 해결하는가
- **Consequences**: 적용의 결과 (장단점)

GoF 책 — 이 4 요소를 매 패턴에 명시. 단순 코드 예제가 아닌 — **언제 + 왜** 적용.

## 패턴 vs Idiom vs Algorithm

| 개념 | 추상화 수준 | 예 |
| --- | --- | --- |
| **Algorithm** | 가장 낮음 | quicksort, binary search |
| **Idiom** | 언어 / 라이브러리 종속 | RAII, copy-and-swap |
| **Pattern** | 언어 독립적 디자인 | Strategy, Visitor |
| **Architecture** | 가장 높음 | MVC, Hexagonal |

패턴 — **언어 독립적 디자인 단위**. GoF는 — 1994년 C++ 책이었지만 — Java, Python 등 모든 OOP 언어에 적용.

## 패턴이 해결하는 것 — 의존성과 변화

Iglberger의 핵심 주장:

> "**Design patterns enable us to manage dependencies between things.**"

거의 모든 GoF 패턴 — **의존성 분리**가 본질:

| 패턴 | 분리하는 의존성 |
| --- | --- |
| Strategy | 알고리즘 ← 사용 컨텍스트 |
| Visitor | 연산 ← 자료구조 |
| Observer | 발행자 ← 구독자 |
| Adapter | 클라이언트 ← 외부 라이브러리 |
| Bridge | 추상 ← 구현 |
| Decorator | 핵심 기능 ← 부가 기능 |

각 패턴이 — **두 측면 사이에 추상화를 끼움**. 한 측이 변해도 다른 측 무영향.

## 공유 어휘로서의 패턴

```
개발자 A: "이거 어떻게 구현하지?"
개발자 B: "Visitor 패턴 쓰면 돼."
개발자 A: "아, 알았어."     ← 1초 만에 합의
```

vs

```
개발자 A: "이거 어떻게 구현하지?"
개발자 B: "음, 각 도형에 대해 같은 연산을 적용하는데, 새 연산이 자주 
          추가되니까 도형 클래스 안에 메서드 추가하지 말고, 외부에서
          타입별로 분기해서 처리하는 함수를 만들면 어떨까..."
```

**이름의 가치** — 패턴 이름이 — 복잡한 디자인을 한 단어로. 팀 간 소통 비용 ↓.

GoF가 이름을 통일해 둔 덕에 — 30년간 전 세계 개발자가 같은 용어로 디자인 토론.

## 함정 — Pattern Fever (패턴 광기)

```cpp
class Order {
    OrderStateMachine state_;          // State
    PaymentStrategy   payment_;        // Strategy
    NotificationFactory notif_factory_; // Factory
    OrderObserver*    observer_;       // Observer
    OrderVisitor*     visitor_;        // Visitor
    // ... 단순 주문에 패턴 가득
};
```

문제 없는데 패턴 적용 → **over-engineering**. 디자인 패턴 적용 자체가 목표가 됨.

원칙:
- **문제 → 패턴**, 아니라 **패턴 → 문제 만들기** X
- 단순한 코드가 — 종종 정답
- 패턴은 — 문제가 명확할 때 (가이드라인 12의 함정 참고)

## 함정 — 23개에 갇힘

GoF 23개 패턴 — 1994년 책. 그 후 새 패턴 발견:

- **CRTP** (Curiously Recurring Template Pattern) — C++ 특화
- **Type Erasure** — `std::function`, `std::any`
- **External Polymorphism** — vtable 없이 다형성
- **Pimpl** — 컴파일 의존성 격리
- **NVI** (Non-Virtual Interface) — Template Method 변형
- **Tag Dispatch** — C++ 특화
- **Expression Templates** — Eigen 등 수치 라이브러리

새 언어 기능 / 도메인 → 새 패턴. 23개는 시작.

## 함정 — GoF 그대로 구현

```cpp
// GoF 그대로 — 1994년 C++
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

모던 C++ 버전:

```cpp
// 가이드라인 22-23 — value-based Strategy
class Context {
    std::function<void()> strategy_;
public:
    template<typename F>
    Context(F f) : strategy_(std::move(f)) {}
    void use() { strategy_(); }
};

Context c{[]() { /* ... */ }};     // lambda 직접
Context c2{ConcreteStrategyA{}};   // 함수 객체
```

또는 — std::variant 기반:

```cpp
using Strategy = std::variant<StrategyA, StrategyB, StrategyC>;

class Context {
    Strategy strategy_;
public:
    void use() { std::visit([](const auto& s) { s.execute(); }, strategy_); }
};
```

**같은 패턴, 다른 구현**. C++20에선 — 가상 함수 + 상속이 종종 최선 X. Iglberger 책의 큰 가치 — 이 모던 재구성.

## 패턴은 — 디자인 속성을 위한 도구

패턴 자체가 목적이 아니라 — 달성하려는 **디자인 속성**:

| 속성 | 패턴 |
| --- | --- |
| **변경 가능성** (modifiability) | Strategy, Visitor, Bridge |
| **확장 가능성** (extensibility) | Decorator, Observer |
| **재사용성** | Adapter, Template Method |
| **테스트 가능성** | DI, Strategy |
| **성능** | Flyweight, Object Pool |

목적에서 — 패턴 선택. "Strategy 쓸까?"보다 "**변경 가능성이 필요한가?**" 먼저.

## 패턴 식별 — 3 신호

패턴이 — 도움 될 신호:

### 1) 반복되는 if/switch 체인

```cpp
if (format == "html") /* ... */;
else if (format == "json") /* ... */;
else if (format == "xml") /* ... */;
```

→ Strategy 또는 Polymorphism.

### 2) 같은 변환이 여러 곳

```cpp
// 두 곳에서 같은 변환
convert_data(...);
convert_data(...);  // 다른 함수
```

→ Adapter 또는 Decorator.

### 3) 강결합 — 한 클래스가 다른 클래스를 너무 잘 안다

```cpp
class A {
    void process(B& b) { b.internal_field_++; }     // ⚠️
};
```

→ Observer 또는 Strategy로 결합 격리.

## Refactoring으로 패턴

> "**Code first, patterns later.**"

처음부터 패턴 강제 X. 코드 작성 후 — **반복 / 변화 압력**이 발견되면 그제야 refactor.

```cpp
// 처음 — 단순
void process(int format, Data& d) {
    if (format == 1) /* ... */;
    else if (format == 2) /* ... */;
}

// 새 format 추가 빈번 → Strategy로 refactor
class Processor { virtual void process(Data&) = 0; };
class FormatAProcessor : public Processor { /* ... */ };
```

**Rule of Three** — 3번 반복되기 전엔 추상화 X. 가이드라인 2 참고.

## 패턴의 분류 — GoF 3 카테고리

### Creational — 객체 생성

- Singleton, Factory Method, Abstract Factory, Builder, Prototype

### Structural — 클래스/객체 구조

- Adapter, Bridge, Composite, Decorator, Facade, Flyweight, Proxy

### Behavioral — 객체 간 책임/소통

- Chain of Responsibility, Command, Interpreter, Iterator, Mediator,
  Memento, Observer, State, Strategy, Template Method, Visitor

Iglberger의 책 — 카테고리 무관, **의존성 분리** 관점에서 재구성.

## 패턴 vs 안티패턴

```
패턴    — 검증된 해결책
안티패턴 — 흔한 잘못
```

안티패턴도 — 공유 어휘:
- **God Class** — SRP 위반
- **Spaghetti Code** — 의존성 폭발
- **Magic Number / String** — 의미 없는 상수
- **Copy-Paste Programming** — DRY 위반
- **Premature Optimization** — 측정 없이 최적화
- **Yo-Yo Problem** — 상속 깊이 너무 깊음

패턴 + 안티패턴 — 디자인 어휘. 두 가지를 함께 알아야 — 무엇을 해야 하고 무엇을 피해야 하는지 명확.

## 함정 — 잘못된 패턴 식별

```cpp
class Singleton {
    static Singleton& instance() { /* ... */ }
};
```

"이건 Singleton 패턴이다" — 맞음. 그러나 **싱글톤이 적절한 해결책인지** 별개. 가이드라인 37-38 — "Singleton은 디자인 패턴이라기보다 구현 패턴".

패턴 식별 ≠ 패턴 적용 정당화.

## 패턴 학습 — 4 단계

1. **인식** (recognition) — 코드에서 패턴 보기
2. **이해** (understanding) — 의도와 트레이드오프
3. **적용** (application) — 도메인에 맞게 변형
4. **창조** (creation) — 새 패턴 인식 / 명명

대다수 개발자가 — 1-2 단계. 3-4 단계가 진정한 디자인 능력.

## 패턴 카탈로그

이 시리즈가 다룰 — 핵심 패턴들:

### GoF 패턴 (Iglberger가 다시 쓰기)
- Visitor (15-18)
- Strategy (19-23)
- Command (21)
- Adapter (24)
- Observer (25)
- Bridge (28-29)
- Prototype (30)
- Decorator (35)
- Singleton (37-38)

### C++ 특화 패턴
- CRTP (26-27)
- External Polymorphism (31)
- Type Erasure (32-34)

각 패턴 — GoF 원본 + 모던 C++ 재구성 + 트레이드오프.

## 패턴 외 — 디자인 원칙

패턴보다 더 기본적인 — 원칙들:

- **SOLID** — SRP, OCP, LSP, ISP, DIP
- **DRY** — Don't Repeat Yourself
- **YAGNI** — You Aren't Gonna Need It
- **KISS** — Keep It Simple, Stupid
- **Law of Demeter** — Don't talk to strangers
- **Composition over Inheritance**

패턴은 — 원칙의 **구체적 적용**. 원칙이 먼저, 패턴은 도구.

## Iglberger의 권고

1. **패턴 자체가 목적 X** — 디자인 속성이 목적
2. **단순한 코드 우선** — 문제가 명확할 때만 패턴
3. **GoF는 시작** — 새 패턴 계속 학습
4. **모던 C++ 도구 활용** — 1994년 구현 그대로 X
5. **공유 어휘** — 팀과 같은 용어 사용

## 실무 가이드 — 패턴 적용 결정

```
문제 인식
   ↓
"이게 정말 문제인가?" (변화 압력 / 결합도)
   ├── 아니다 → 단순한 코드 유지
   └── 그렇다 → 패턴 검토
                  ↓
              "어떤 디자인 속성 필요?"
                  ↓
              패턴 후보 (1~3개)
                  ↓
              각 후보의 트레이드오프
                  ↓
              가장 적합한 것 선택
                  ↓
              구현 + 코드 리뷰
```

## 실무 가이드 — 체크리스트

패턴 적용 전:

- [ ] **문제가 명확**한가? (변화 / 결합도 / 복잡도)
- [ ] **단순한 해결책**이 정말 부족한가? (YAGNI)
- [ ] 어떤 **디자인 속성** 달성하려는가?
- [ ] 후보 패턴들의 **트레이드오프** 비교?
- [ ] 모던 C++ 도구 활용 가능? (variant, function, concepts)
- [ ] 팀이 **공유 어휘** 가지고 있는가?

## 정리

디자인 패턴 = **검증된 해결책** + **공유 어휘**.

핵심:
1. **문제가 있어야 패턴** — 적용 자체가 목적 X
2. **의존성 분리, 변화 관리** — 패턴의 본질
3. **GoF는 시작** — 새 패턴 + 모던 재구성
4. **디자인 속성**이 진짜 목표 — 패턴은 도구

패턴 학습:
1. 인식 → 이해 → 적용 → 창조

다음 가이드라인부터 — 각 패턴의 모던 구현.

## 관련 항목

- [가이드라인 12: 패턴 오해](/blog/programming/cpp-software-design/guideline12-beware-of-design-pattern-misconceptions) — 흔한 오해
- [가이드라인 13: 패턴은 어디에나](/blog/programming/cpp-software-design/guideline13-design-patterns-are-everywhere) — 일상의 패턴
- [가이드라인 14: 패턴 이름으로 의도](/blog/programming/cpp-software-design/guideline14-use-a-design-patterns-name-to-communicate-intent) — 어휘의 가치
- [GoF Design Patterns](/blog/programming/gof-design-patterns) — 1994년 정전
