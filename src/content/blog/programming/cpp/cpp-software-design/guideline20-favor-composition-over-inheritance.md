---
title: "가이드라인 20: 상속보다 합성을 선호하라"
date: 2026-05-13T20:00:00
description: "Composition over Inheritance — GoF의 핵심 메시지이자 모던 C++의 정설. 상속은 강결합이고 composition은 유연하다."
tags: [C++, Software Design, Composition, Inheritance]
series: "C++ Software Design"
seriesOrder: 20
draft: true
---

## 왜 이 가이드라인이 중요한가?

GoF 책 1장에서 가장 자주 인용되는 문장이 있다.

> "**Favor object composition over class inheritance.**"

30년이 지난 지금도 그대로 진리다. 모던 C++ 코드는 거의 항상 composition을 우선한다.

상속의 문제는 다음과 같다.

- **강결합** — derived가 base에 깊이 의존한다(구현 디테일까지).
- **컴파일 타임 결정** — 런타임에 교체할 수 없다.
- **fragile base class** — base의 변경이 모든 derived에 영향을 준다.
- **다중 상속의 복잡성** — diamond, virtual base 등.
- **LSP를 깨기 쉽다** — derived가 base의 약속을 위반하기 쉽다.

composition의 이점은 다음과 같다.

- **약결합** — 인터페이스만 의존한다.
- **런타임 교체** — 객체를 갈아 끼울 수 있다.
- **유연성** — 다양한 조합이 가능하다.
- **테스트 친화** — DI가 자연스럽다.

Iglberger가 강하게 권하는 가이드라인이다. 거의 모든 GoF 패턴이 composition 기반이다.

## 핵심 내용

- **Composition over Inheritance** — GoF와 모던 C++의 정설.
- 상속은 IS-A 관계(가이드라인 6의 LSP), composition은 HAS-A 관계다.
- 상속의 함정 — 강결합, fragile base, LSP 위반, 컴파일 타임 강제.
- composition의 이점 — 약결합, 유연성, 런타임 교체, 테스트 친화.
- 거의 모든 패턴이 composition 기반이다(Strategy, Observer, Bridge 등).

## 비교 — 상속과 composition

### Bad — 상속 남용

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
c.start();          // ⚠️ Car에 그대로 노출 — 의미가 분명하지 않다
```

`Car`가 `Engine`을 상속하면 IS-A 의미가 된다. 그러나 **Car는 Engine이 아니다**. Engine을 **가질** 뿐이다(HAS-A).

상속의 의도치 않은 결과는 다음과 같다.

- Engine의 모든 public 메서드가 Car에 그대로 노출된다.
- LSP를 위반할 가능성이 생긴다.
- 다른 Engine 종류로 교체할 수 없다(컴파일 시간에 고정).

### Good — Composition

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

// 메서드를 추가하면 런타임 교체도 가능하다
```

장점은 다음과 같다.

- Car는 Engine을 **사용**할 뿐 IS-A 의미를 갖지 않는다.
- Engine 종류를 런타임에 교체할 수 있다.
- Engine의 public 메서드가 Car에 자동으로 노출되지 않는다.
- DI가 자연스러워서 테스트에서 MockEngine을 주입한다.

## IS-A vs HAS-A

```cpp
// IS-A
class Dog : public Animal { };     // 개는 동물이다

// HAS-A
class Car {
    Engine engine_;     // 차는 엔진을 가진다
};
```

두 클래스의 관계가 IS-A인지 HAS-A인지부터 묻자.

- IS-A — 자연어로 "X는 Y의 일종"이라고 말할 수 있다. LSP를 만족하면 상속이 적합하다.
- HAS-A — "X는 Y를 가진다"라고 말할 수 있다. composition이다.

대부분의 관계는 HAS-A다. 상속은 진짜 IS-A일 때만 꺼낸다.

## "재사용 함정" — 상속

```cpp
class StringList : public std::vector<std::string> {     // ⚠️ 코드 재사용을 위해 상속한다
public:
    void log() { /* ... */ }
};

StringList sl;
sl.push_back("hello");
sl.size();
sl.log();
```

문제는 이렇다.

- `std::vector`의 인터페이스가 모두 노출된다.
- StringList가 vector인가? LSP는 검증되는가?
- `std::vector`의 변경(예: allocator 변경)이 StringList에 영향을 준다.
- non-virtual destructor 위험이 있다(가이드라인 7 EC++).

composition으로 가면 이렇게 된다.

```cpp
class StringList {
    std::vector<std::string> data_;
public:
    void add(std::string s) { data_.push_back(std::move(s)); }
    size_t size() const { return data_.size(); }
    void log();
};
```

`std::vector`는 구현 디테일이 되고, 외부 인터페이스는 도메인 의도로 채워진다.

## 상속이 적절한 경우 — IS-A + LSP

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

- Circle은 정말로 Shape의 일종이다.
- LSP를 만족한다(Shape의 모든 약속을 지킨다).
- Shape의 인터페이스가 Circle에 자연스럽게 들어맞는다.

이게 상속의 정당한 사용이다.

## composition의 네 가지 형태

### 1) 멤버 변수 — 강한 소유

```cpp
class Car {
    Engine engine_;        // 값 멤버 — Car의 일부다
};
```

Car가 생성되면 Engine도 생성되고, Car가 소멸하면 Engine도 소멸한다.

### 2) 포인터 / 참조 — 약한 결합

```cpp
class Car {
    Engine* engine_;       // 외부 객체 — Car가 소유하지 않는다
public:
    Car(Engine* e) : engine_(e) {}
};
```

라이프타임이 분리된다. Engine은 Car보다 오래 살아야 한다.

### 3) 스마트 포인터 — 명시적 소유

```cpp
class Car {
    std::unique_ptr<Engine> engine_;    // 소유한다
};
```

값 의미론을 유지하면서 인터페이스 다형성도 가능하다.

### 4) std::function — 동작 composition

```cpp
class Button {
    std::function<void()> on_click_;     // 동작을 주입한다
public:
    void set_handler(std::function<void()> f) { on_click_ = std::move(f); }
};
```

행동 자체를 매개변수로 받는다.

## Strategy = Composition

```cpp
class Sorter {
    std::function<void(std::vector<int>&)> strategy_;
public:
    template<typename F>
    Sorter(F f) : strategy_(std::move(f)) {}
};
```

Strategy 패턴은 composition 기반이다. **알고리즘을 가진다**.

대조적으로 Template Method는 상속 기반이다.

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

같은 의도를 다른 메커니즘으로 풀어낸다. Strategy 쪽이 일반적으로 더 유연하다.

## Iglberger 책의 거의 모든 패턴이 composition이다

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

상속 기반은 Template Method 정도다. 모던 C++은 composition을 우선한다.

## 상속의 문제 — Fragile Base Class

```cpp
class Base {
public:
    void doA() { /* ... */ }
    void doB() { doA(); /* ... */ }     // doA를 내부에서 호출한다
};

class Derived : public Base {
public:
    void doA() override { /* 변경한다 */ }     // ⚠️
};
```

`Derived::doA`가 `Base::doB`의 동작에 영향을 준다. Base 작성자는 Derived를 알지 못한다. derived가 base의 내부에 의존하는 상태가 된다.

이것이 **fragile base class** 문제다. Base의 작은 변경이 모든 derived에 영향을 준다.

composition에는 이 문제가 없다. 객체 사이의 통신이 명시적 인터페이스로만 일어난다.

## 다중 상속의 함정

```cpp
class A { void f(); };
class B { void f(); };

class C : public A, public B {
public:
    // c.f() 호출? 모호하므로 명시가 필요하다
};

C c;
c.f();           // ❌ 모호
c.A::f();        // 명시
c.B::f();
```

다중 상속은 name conflict, diamond, virtual base 같은 복잡성을 데려온다.

composition은 자연스럽게 여러 객체를 조합한다.

```cpp
class C {
    A a_;
    B b_;
public:
    void doA() { a_.f(); }
    void doB() { b_.f(); }
};
```

명확하다.

## "IS-A처럼 보이지만 사실은 HAS-A"

자주 헷갈리는 케이스가 있다.

### Square와 Rectangle (가이드라인 6)

```cpp
class Square : public Rectangle { /* ... */ };
```

수학적으로는 IS-A 같지만, 변경 가능한 객체 모델에서는 LSP가 깨진다.

```cpp
class Square {
    int side_;
};

class Rectangle {
    int width_, height_;
};
```

별도 클래스로 둔다. composition으로는 둘 다 `Shape`라는 공통 base를 상속할 수 있다(IS-A를 만족할 때).

### Penguin과 Bird

```cpp
class Penguin : public Bird { /* fly가 throw */ };     // LSP 위반
```

분류 자체를 다시 본다.

```cpp
class FlyingBird : public Bird { virtual void fly() = 0; };
class FlightlessBird : public Bird { };
class Penguin : public FlightlessBird { };
```

## C++ 표준 라이브러리도 composition을 우선한다

```cpp
std::vector<int> v;                          // value 멤버
std::shared_ptr<Widget> p;                    // composition
std::function<void()> f;                      // composition
std::optional<T> o;                           // composition (variant 내부)
std::variant<A, B, C> v;                      // composition
```

표준이 거의 모두 composition이다. 상속은 `std::exception` 계층 정도가 눈에 띈다.

## composition의 한 한계 — 인터페이스 노출

```cpp
class Car {
    Engine engine_;
public:
    void drive() { engine_.start(); }
    // engine의 다른 메서드는 노출되지 않는다
};

Car c;
c.drive();         // OK
c.engine_.start();  // ❌ private
```

상속이라면 base의 메서드가 자동으로 노출된다. composition은 명시적으로 wrap해야 한다.

```cpp
class Car {
    Engine engine_;
public:
    void start() { engine_.start(); }     // delegate
    void stop()  { engine_.stop(); }
    // ... 일일이 wrap한다
};
```

보일러플레이트가 따라온다. 그러나 **노출할 인터페이스를 명시적으로 고르는** 이점이 더 크다.

## C++ 도구 — wrapping의 단순화

```cpp
class StringList {
    std::vector<std::string> data_;
public:
    // using으로 vector의 일부 메서드만 노출하기도 한다 (C++23 std::forward_like 활용)
    // 또는 inheriting constructor / using declaration (private 상속 활용)
};

// 또는 private 상속 (EC++ 가이드라인 39)
class StringList : private std::vector<std::string> {
public:
    using std::vector<std::string>::push_back;
    using std::vector<std::string>::size;
    void log();
};
```

private 상속은 composition의 특수 형태다(EC++ 항목 39).

## 함정 — composition 흉내

```cpp
class Wrapper {
    Inner* inner_;
public:
    // Inner의 모든 메서드를 그대로 wrap한다 — 보일러플레이트
    void method1() { inner_->method1(); }
    void method2() { inner_->method2(); }
    void method3() { inner_->method3(); }
    // ... 메서드 50개 ...
};
```

이건 상속과 효과가 같으면서 코드만 많아진 경우다. 진짜 composition은 **인터페이스를 차별화**한다.

```cpp
class Wrapper {
    Inner* inner_;
public:
    void domain_specific_method() {     // 도메인 의도를 드러내는 이름
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

## Entity-Component-System(ECS) — composition의 극단

게임 엔진의 표준 패턴이다.

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

// 또는 — 더 모던한 ECS
class World {
    std::unordered_map<EntityId, Position> positions_;
    std::unordered_map<EntityId, Velocity> velocities_;
    std::unordered_map<EntityId, Health>   healths_;

    // 시스템 — 컴포넌트별로 처리한다
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

OOP 상속(`class Player : public Character : public Entity`) 대신 **컴포넌트 조합**을 쓴다. 유연성이 크게 올라간다.

## composition + Concepts (C++20)

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

concept으로 composition에 필요한 인터페이스를 명시한다. duck typing이다.

## 함정 — 지나치게 작은 composition

```cpp
class Coordinate {
    Number x_;     // ⚠️ int 대신 Number 클래스로?
    Number y_;
};
```

값 객체를 너무 잘게 클래스로 wrap하지는 말자. 가이드라인 25의 strong types와 균형을 맞춘다.

기준은 **도메인 의미가 충분히 강할 때만** 타입을 분리하는 것이다.

## 함정 — 상속을 "재사용 도구"로 쓴다

```cpp
class A {
public:
    void utility1();
    void utility2();
};

class B : public A {     // ⚠️ 유틸리티를 쓰려고 상속한다
public:
    void do_b_stuff();
};
```

재사용을 위한 상속은 안티패턴이다. 자유 함수나 composition으로 푼다.

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

## 모던 변형 — CRTP mixin (가이드라인 26)

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
    // operator!= 가 자동으로 생긴다
};
```

CRTP는 상속 문법을 쓰지만 컴파일 타임에 동작한다. mixin 패턴이다. 일반 상속의 단점을 피한다.

## 빠른 결정 — 상속과 composition 중에서

```
이 관계가 IS-A인가 HAS-A인가?
├── 진짜 IS-A이고 LSP를 만족한다 → 상속 OK
├── HAS-A → composition
├── 재사용이 목적이다? → composition (또는 자유 함수)
├── 컴파일 타임 다형성 (mixin)? → CRTP
└── 모호하다 → composition으로 시작한다
```

## 실무 가이드 — 체크리스트

새 클래스 관계를 설계할 때 다음을 점검하자.

- [ ] IS-A인가 HAS-A인가?
- [ ] LSP를 만족하는가? (가이드라인 6)
- [ ] 재사용 목적의 상속은 아닌가?
- [ ] 상속이라면 base의 모든 인터페이스가 노출돼도 좋은가?
- [ ] composition으로 명시적 인터페이스만 노출하지 않는가?
- [ ] 런타임 교체가 필요한가? → composition.
- [ ] DI / 테스트가 필요한가? → composition.

## 정리

**Composition over Inheritance**는 GoF와 모던 C++의 정설이다.

상속은 IS-A + LSP를 만족할 때만 쓴다. 강결합, fragile base class, 컴파일 타임 결정이라는 한계가 있다.

composition은 HAS-A 관계에 어울린다. 약결합과 유연성을 갖추고, 런타임 교체와 DI에 친화적이다.

대부분의 관계는 composition으로 푼다. 상속은 특수한 경우다.

도구는 다음과 같다.

- 멤버 변수(강한 소유)
- 스마트 포인터 + 인터페이스(약결합)
- `std::function`(행동 주입)
- ECS(컴포넌트 조합)
- CRTP(컴파일 타임 mixin)

## 관련 항목

- [가이드라인 6: LSP](/blog/programming/cpp/cpp-software-design/guideline06-adhere-to-the-expected-behavior-of-abstractions) — 상속의 조건
- [가이드라인 19: Strategy](/blog/programming/cpp/cpp-software-design/guideline19-use-strategy-to-isolate-how-things-are-done) — composition 패턴
- [가이드라인 22: 값 의미론](/blog/programming/cpp/cpp-software-design/guideline22-prefer-value-semantics-over-reference-semantics) — composition의 가치
- [Effective C++ 항목 32: public 상속 = is-a](/blog/programming/cpp/effective-cpp/item32-make-sure-public-inheritance-models-is-a) — 상속의 의미
- [Effective C++ 항목 38: composition](/blog/programming/cpp/effective-cpp/item38-model-has-a-or-implemented-in-terms-of-through-composition) — HAS-A
