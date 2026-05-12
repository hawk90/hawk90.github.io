---
title: "가이드라인 20: 상속보다 합성을 선호하라"
date: 2026-05-14T16:00:00
description: "Composition over Inheritance — GoF의 핵심 메시지, 모던 C++의 정설. 상속은 강결합, composition은 유연."
tags: [C++, Software Design, Composition, Inheritance]
series: "C++ Software Design"
seriesOrder: 20
draft: false
---

## 왜 이 가이드라인이 중요한가?

GoF 책 1장 — 가장 자주 인용되는 문장:

> "**Favor object composition over class inheritance.**"

30년이 지난 지금도 — **여전히 진리**. 더 나아가 — C++ 모던 코드는 **거의 항상 composition 우선**.

상속의 문제:
- **강결합** — derived는 base에 깊이 의존 (구현 디테일까지)
- **컴파일 타임 결정** — 런타임 교체 불가
- **fragile base class** — base 변경이 모든 derived 영향
- **다중 상속의 복잡성** — diamond, virtual base 등
- **LSP 위반 쉬움** — derived가 base 약속 깨기 쉬움

Composition:
- **약결합** — interface만 의존
- **런타임 교체** — 객체 교체 가능
- **유연성** — 다양한 조합
- **테스트 친화** — DI 자연

이 가이드라인 — Iglberger의 강한 권고. 거의 모든 GoF 패턴이 — composition 기반.

## 핵심 내용

- **Composition over Inheritance** — GoF + 모던 C++의 정설
- 상속 = IS-A (가이드라인 6 LSP), composition = HAS-A
- 상속의 함정: 강결합, fragile base, LSP 위반, 컴파일 타임 강제
- Composition의 이점: 약결합, 유연성, 런타임 교체, 테스트 친화
- 거의 모든 패턴 — composition 기반 (Strategy, Observer, Bridge, ...)

## 비교 — 상속 vs Composition

### Bad: 상속 남용

```cpp
class Engine {
public:
    void start();
    void stop();
};

class Car : public Engine {     // ⚠️ Car는 Engine? — LSP 위반
public:
    void drive() {
        start();     // Engine의 메서드
    }
};

Car c;
c.start();          // ⚠️ Car에 직접 노출 — 의미 불분명
```

`Car`가 `Engine` 상속 — IS-A 의미. 그러나 — **Car는 Engine이 아님**. Engine을 **가짐**(HAS-A).

상속의 의도치 않은 결과:
- Engine의 모든 public 메서드 — Car에 노출
- LSP 위반 가능
- 다른 Engine 종류 교체 불가 (컴파일 시간 결정)

### Good: Composition

```cpp
class Engine {
public:
    virtual ~Engine() = default;
    virtual void start() = 0;
    virtual void stop() = 0;
};

class GasolineEngine : public Engine { /* ... */ };
class ElectricEngine : public Engine { /* ... */ };

class Car {
    std::unique_ptr<Engine> engine_;     // composition
public:
    explicit Car(std::unique_ptr<Engine> e) : engine_(std::move(e)) {}
    
    void drive() {
        engine_->start();
    }
};

// 다양한 Car
Car gas{std::make_unique<GasolineEngine>()};
Car electric{std::make_unique<ElectricEngine>()};

// 런타임 교체도 가능 (메서드 추가 시)
```

장점:
- Car는 Engine **사용**만, IS-A 의미 아님
- Engine 종류 — 런타임 교체
- Engine의 public 메서드 — Car에 자동 노출 X
- DI 자연 (테스트에서 MockEngine)

## IS-A vs HAS-A

```cpp
// IS-A
class Dog : public Animal { };     // 개는 동물

// HAS-A
class Car {
    Engine engine_;     // 차는 엔진을 가짐
};
```

질문: 두 클래스 관계가 — **IS-A인가 HAS-A인가**?

- IS-A — 자연어로 "X는 Y의 일종". LSP 만족하면 상속 OK.
- HAS-A — "X는 Y를 가진다". Composition.

대다수 — HAS-A. 상속은 — 진짜 IS-A일 때만.

## "Reuse" 함정 — 상속

```cpp
class StringList : public std::vector<std::string> {     // ⚠️ 코드 재사용 위해 상속
public:
    void log() { /* ... */ }
};

StringList sl;
sl.push_back("hello");
sl.size();
sl.log();
```

문제:
- `std::vector` 인터페이스 — 모두 노출
- StringList = vector? LSP 검증?
- `std::vector`의 모든 변경 (예: allocator) — StringList 영향
- non-virtual destructor — 위험 (가이드라인 7 EC++)

Composition으로:

```cpp
class StringList {
    std::vector<std::string> data_;
public:
    void add(std::string s) { data_.push_back(std::move(s)); }
    size_t size() const { return data_.size(); }
    void log();
};
```

`std::vector` — 구현 디테일. 외부 인터페이스 — 도메인 의도.

## 상속의 적절한 사용 — IS-A + LSP

```cpp
class Shape {
public:
    virtual ~Shape() = default;
    virtual double area() const = 0;
};

class Circle : public Shape {     // Circle IS-A Shape — LSP OK
    double radius_;
public:
    double area() const override { return M_PI * radius_ * radius_; }
};
```

- Circle은 정말 Shape의 일종
- LSP 만족 (Shape의 모든 약속 지킴)
- Shape 인터페이스 — Circle에 자연

이게 — 상속의 정당한 사용.

## Composition의 4가지 형태

### 1) 멤버 변수 — 강한 소유

```cpp
class Car {
    Engine engine_;        // 값 멤버 — Car의 일부
};
```

Car 생성 — Engine 생성. Car 소멸 — Engine 소멸.

### 2) 포인터/참조 — 약한 결합

```cpp
class Car {
    Engine* engine_;       // 외부 객체 — Car가 소유 X
public:
    Car(Engine* e) : engine_(e) {}
};
```

라이프타임 분리. Engine은 — Car보다 오래 살아야.

### 3) 스마트 포인터 — 명시적 소유

```cpp
class Car {
    std::unique_ptr<Engine> engine_;    // 소유
};
```

값 의미 + interface 다형성 가능.

### 4) std::function — 동작 composition

```cpp
class Button {
    std::function<void()> on_click_;     // 동작 주입
public:
    void set_handler(std::function<void()> f) { on_click_ = std::move(f); }
};
```

행동 자체를 — 매개변수로.

## Strategy = Composition

```cpp
class Sorter {
    std::function<void(std::vector<int>&)> strategy_;
public:
    template<typename F>
    Sorter(F f) : strategy_(std::move(f)) {}
};
```

Strategy 패턴 = composition 기반. **알고리즘을 가짐**.

대조 — Template Method (상속 기반):

```cpp
class Algorithm {
public:
    void run() {
        prepare();
        execute();     // hook
    }
protected:
    virtual void execute() = 0;
};
```

같은 의도, 다른 메커니즘. Strategy가 — 일반적으로 더 유연.

## Iglberger 책의 거의 모든 패턴 — Composition

| 패턴 | 메커니즘 |
| --- | --- |
| Strategy | composition (가이드라인 19) |
| Visitor | composition (variant 기반) |
| Adapter | composition |
| Decorator | composition |
| Observer | composition |
| Bridge | composition |
| Command | composition |
| Type Erasure | composition |
| ... | ... |

상속 기반 — Template Method 정도. 모던 C++ — composition 우선.

## 상속의 문제 — Fragile Base Class

```cpp
class Base {
public:
    void doA() { /* ... */ }
    void doB() { doA(); /* ... */ }     // doA를 내부 호출
};

class Derived : public Base {
public:
    void doA() override { /* 변경 */ }     // ⚠️
};
```

`Derived::doA`가 — `Base::doB`의 동작 영향. Base 작성자가 — Derived 모름. derived가 — base 내부 의존.

이게 — **fragile base class** 문제. Base의 작은 변경이 — 모든 derived 영향.

Composition — 이 문제 없음. 객체 사이 통신 — 명시적 인터페이스만.

## 다중 상속의 함정

```cpp
class A { void f(); };
class B { void f(); };

class C : public A, public B {
public:
    // c.f() 호출? 모호 — 명시 필요
};

C c;
c.f();           // ❌ 모호
c.A::f();        // 명시
c.B::f();
```

다중 상속 — name conflict, diamond inheritance, virtual base 등 복잡성.

Composition — 자연스럽게 여러 객체 조합:

```cpp
class C {
    A a_;
    B b_;
public:
    void doA() { a_.f(); }
    void doB() { b_.f(); }
};
```

명확.

## "Is-A로 보이지만 사실 HAS-A"

자주 헷갈리는 케이스:

### Square / Rectangle (가이드라인 6)

```cpp
class Square : public Rectangle { /* ... */ };
```

수학적 IS-A 같지만 — 변경 가능한 객체 모델에선 LSP 위반.

```cpp
class Square {
    int side_;
};

class Rectangle {
    int width_, height_;
};
```

별도 클래스. composition으로 — `Shape`이라는 공통 base에 둘 다 상속 (IS-A 만족하면).

### Penguin / Bird

```cpp
class Penguin : public Bird { /* fly throw */ };     // LSP 위반
```

→ 분류 자체 재고:

```cpp
class FlyingBird : public Bird { virtual void fly() = 0; };
class FlightlessBird : public Bird { };
class Penguin : public FlightlessBird { };
```

## C++ 표준 라이브러리 — Composition 우선

```cpp
std::vector<int> v;                          // value 멤버
std::shared_ptr<Widget> p;                    // composition
std::function<void()> f;                      // composition
std::optional<T> o;                           // composition (variant 내부)
std::variant<A, B, C> v;                      // composition
```

표준 — 거의 모두 composition. 상속 — `std::exception` hierarchy 정도.

## Composition의 한 한계 — 인터페이스 노출

```cpp
class Car {
    Engine engine_;
public:
    void drive() { engine_.start(); }
    // engine의 다른 메서드 — 노출 안 됨
};

Car c;
c.drive();         // OK
c.engine_.start();  // ❌ private
```

상속이면 — base 메서드 자동 노출. Composition은 — 명시적 wrap:

```cpp
class Car {
    Engine engine_;
public:
    void start() { engine_.start(); }     // delegate
    void stop()  { engine_.stop(); }
    // ... 일일이 wrap
};
```

보일러플레이트. 그러나 — **노출할 인터페이스를 명시적 선택**의 이점.

## C++ 도구 — wrapping 단순화

```cpp
class StringList {
    std::vector<std::string> data_;
public:
    // using으로 vector의 일부 메서드 노출 (C++23 std::forward_like 활용)
    // 또는 inheriting constructor / using declaration (private 상속 활용)
};

// 또는 private 상속 (가이드라인 39 EC++)
class StringList : private std::vector<std::string> {
public:
    using std::vector<std::string>::push_back;
    using std::vector<std::string>::size;
    void log();
};
```

private 상속 — composition의 특수 형태. 가이드라인 39 (EC++).

## 함정 — Composition 흉내

```cpp
class Wrapper {
    Inner* inner_;
public:
    // 모든 Inner 메서드를 wrap — boilerplate
    void method1() { inner_->method1(); }
    void method2() { inner_->method2(); }
    void method3() { inner_->method3(); }
    // ... 50 메서드 ...
};
```

이건 — 상속과 효과 같으면서 코드만 많음. 진짜 composition은 — **인터페이스 차별화**:

```cpp
class Wrapper {
    Inner* inner_;
public:
    void domain_specific_method() {     // 도메인 의도
        inner_->method1();
        inner_->method2();
        // 결합된 동작
    }
};
```

## 도메인별 결정

| 시나리오 | 권장 |
| --- | --- |
| Shape - Circle, Square (IS-A, LSP OK) | 상속 |
| Car - Engine (HAS-A) | composition |
| Service - Logger (DI) | composition |
| Container - Element type (template) | template |
| AST hierarchy | 가상 함수 또는 variant |
| Game entity - Components | composition (ECS) |

## Entity-Component-System (ECS) — Composition 극단

게임 엔진의 표준 패턴:

```cpp
struct Position { float x, y; };
struct Velocity { float dx, dy; };
struct Health   { int hp; };

class Entity {
    int id_;
    // 컴포넌트 — composition
    std::optional<Position> position_;
    std::optional<Velocity> velocity_;
    std::optional<Health>   health_;
};

// 또는 — 더 모던 ECS
class World {
    std::unordered_map<EntityId, Position> positions_;
    std::unordered_map<EntityId, Velocity> velocities_;
    std::unordered_map<EntityId, Health>   healths_;
    
    // 시스템 — 컴포넌트별 처리
    void update_physics() {
        for (auto& [id, pos] : positions_) {
            if (auto* vel = find(velocities_, id)) {
                pos.x += vel->dx;
                pos.y += vel->dy;
            }
        }
    }
};
```

OOP 상속 (`class Player : public Character : public Entity`) 대신 — **컴포넌트 조합**. 유연성 ↑.

## Composition + Concepts (C++20)

```cpp
template<typename T>
concept HasEngine = requires(T t) {
    { t.engine() } -> std::convertible_to<Engine&>;
};

template<HasEngine T>
void start_vehicle(T& v) {
    v.engine().start();
}
```

concept으로 — composition의 필요 인터페이스 명시. duck typing.

## 함정 — 너무 작은 composition

```cpp
class Coordinate {
    Number x_;     // ⚠️ int 대신 Number 클래스?
    Number y_;
};
```

값 객체를 — 클래스로 wrap 너무 많이. 가이드라인 25 (strong types)와의 균형.

기준: **도메인 의미가 강할 때만** 타입 분리.

## 함정 — 상속을 "재사용 도구"로

```cpp
class A {
public:
    void utility1();
    void utility2();
};

class B : public A {     // ⚠️ utility 메서드 쓰려고 상속
public:
    void do_b_stuff();
};
```

"재사용" 위한 상속 — 안티패턴. 자유 함수 또는 composition.

```cpp
namespace utility {
    void utility1();
    void utility2();
}

class B {
public:
    void do_b_stuff() {
        utility::utility1();     // 자유 함수
    }
};
```

## 모던 변형 — Mixin via CRTP (가이드라인 26)

```cpp
template<typename Derived>
class Comparable {
public:
    bool operator!=(const Derived& other) const {
        return !static_cast<const Derived*>(this)->operator==(other);
    }
};

class Point : public Comparable<Point> {
public:
    bool operator==(const Point& other) const;
    // operator!= 자동
};
```

CRTP — 상속 문법, 컴파일 타임. mixin 패턴. 일반 상속의 단점 회피.

## 빠른 결정 — 상속 vs Composition

```
이 관계가 — IS-A인가 HAS-A인가?
├── 진짜 IS-A + LSP 만족 → 상속 OK
├── HAS-A → composition
├── 재사용 목적? → composition (또는 자유 함수)
├── 컴파일 타임 다형성 (mixin)? → CRTP
└── 모호 → composition 시작
```

## 실무 가이드 — 체크리스트

새 클래스 관계 설계 시:

- [ ] **IS-A인가 HAS-A인가**?
- [ ] LSP 만족? (가이드라인 6)
- [ ] 재사용 목적으로 상속? — 안티패턴
- [ ] 상속 시 — base의 모든 인터페이스 노출 OK?
- [ ] Composition으로 — 명시적 인터페이스만 노출?
- [ ] 런타임 교체 필요? → composition
- [ ] DI / 테스트? → composition

## 정리

**Composition over Inheritance** — GoF + 모던 C++의 정설.

상속:
- IS-A + LSP 만족 시만
- 강결합, fragile base class
- 컴파일 타임 결정

Composition:
- HAS-A 관계
- 약결합, 유연성
- 런타임 교체, DI 친화

대다수 — composition. 상속은 — 특수 케이스.

도구:
- 멤버 변수 (강한 소유)
- 스마트 포인터 + interface (약결합)
- `std::function` (행동 주입)
- ECS (컴포넌트 조합)
- CRTP (컴파일 타임 mixin)

## 관련 항목

- [가이드라인 6: LSP](/blog/programming/cpp-software-design/guideline06-adhere-to-the-expected-behavior-of-abstractions) — 상속의 조건
- [가이드라인 19: Strategy](/blog/programming/cpp-software-design/guideline19-use-strategy-to-isolate-how-things-are-done) — Composition 패턴
- [가이드라인 22: value semantics](/blog/programming/cpp-software-design/guideline22-prefer-value-semantics-over-reference-semantics) — composition의 가치
- [Effective C++ 항목 32: public 상속 = is-a](/blog/programming/effective-cpp/item32-make-sure-public-inheritance-models-is-a) — 상속의 의미
- [Effective C++ 항목 38: composition](/blog/programming/effective-cpp/item38-model-has-a-or-implemented-in-terms-of-through-composition) — HAS-A
