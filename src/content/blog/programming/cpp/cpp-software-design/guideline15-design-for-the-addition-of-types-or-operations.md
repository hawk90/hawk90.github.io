---
title: "가이드라인 15: 타입 추가와 연산 추가 중 무엇을 위한 디자인인지 결정하라"
date: 2026-05-14T11:00:00
description: "Expression Problem. 새 타입이 자주 들어오는지 새 연산이 자주 들어오는지에 따라 virtual과 std::variant 중에 고른다."
tags: [C++, Software Design, Expression Problem, Visitor]
series: "C++ Software Design"
seriesOrder: 15
---

## 왜 이 가이드라인이 중요한가?

가이드라인 5에서 Expression Problem을 잠시 언급했다. 이번 가이드라인이 본격적인 분석이다.

**Expression Problem** — 타입과 연산 두 차원 모두에서 OCP를 만족시키기는 어렵다.

```
            새 타입 추가가 잦음           새 연산 추가가 잦음
            ──────────────────         ──────────────────
가상 함수   │ ✅ 새 derived만 더하면 된다 │ ❌ 인터페이스를 손대야 한다
(상속)     │   기존 코드는 그대로다     │   모든 derived가 영향을 받는다
─────────  ┼─────────────────────────  ┼─────────────────────────
std::variant│ ❌ variant와 모든 visit │ ✅ 새 비-멤버 함수만 더한다
+ visit    │   를 손대야 한다           │   기존 클래스는 그대로다
```

이 비대칭이 디자인 결정의 핵심이다. 도메인이 어느 방향으로 변하는지를 먼저 식별하고, 거기에 맞는 도구를 고른다.

## 핵심 내용

- **Expression Problem** — 두 차원(타입과 연산)에서 OCP를 함께 만족시키기는 어렵다.
- 도메인에서 **타입 추가가 잦은지 연산 추가가 잦은지** 식별이 먼저다.
- 타입 추가가 잦으면 → 가상 함수(상속 기반 다형성).
- 연산 추가가 잦으면 → `std::variant` + visit.
- 둘 다 잦으면 → External Polymorphism(가이드라인 31), Type Erasure(32~34).

## 비교 — 두 시나리오

### 시나리오 A — 새 도형이 자주 들어온다

게임이나 그래픽 엔진을 떠올려 보자. 도형 종류가 늘어난다(Circle, Square, Triangle, Pentagon, …). 연산은 `area()`와 `draw()` 정도로 거의 고정이다.

```cpp
// 가상 함수 — 새 타입 추가에 OCP를 만족한다
class Shape {
public:
    virtual ~Shape() = default;
    virtual double area() const = 0;
    virtual void draw() const = 0;
};

class Circle : public Shape { /* ... */ };
class Square : public Shape { /* ... */ };

// 새 타입 추가
class Pentagon : public Shape {
public:
    double area() const override { /* ... */ }
    void draw() const override { /* ... */ }
};
// 기존 코드는 손대지 않는다. OCP 만족.
```

### 시나리오 B — 새 연산이 자주 들어온다

언어 인터프리터의 AST를 떠올려 보자. 노드 종류는 문법으로 정해져 있어 고정이다. 반면 연산은 `evaluate()`, `print()`, `compile()`, `type_check()`, `serialize()`, `optimize()` 등으로 늘어난다.

```cpp
// std::variant + visit — 새 연산 추가에 OCP를 만족한다
class Literal     { /* ... */ };
class BinaryOp    { /* ... */ };
class Variable    { /* ... */ };

using AstNode = std::variant<Literal, BinaryOp, Variable>;

// 새 연산 추가
std::string serialize(const AstNode& node) {
    return std::visit([](const auto& n) -> std::string {
        if constexpr (std::is_same_v<decltype(n), const Literal&>)
            return n.value_str();
        // ... 각 타입별 직렬화 ...
    }, node);
}

// 기존 노드 클래스는 손대지 않는다. OCP 만족.
```

## 가상 함수의 OCP 비대칭

가상 함수로 새 연산을 추가하면 다음과 같다.

```cpp
class Shape {
public:
    virtual double area() const = 0;
    virtual void draw() const = 0;

    // 새 연산 추가
    virtual std::string serialize() const = 0;     // ⚠️ 인터페이스가 바뀐다
};

// 결과 — 모든 derived를 손대야 한다
class Circle : public Shape {
public:
    double area() const override;
    void draw() const override;
    std::string serialize() const override;     // 추가
};

class Square : public Shape {
    // 또 추가해야 한다
};

// derived가 100개라면 100군데를 손댄다
```

가상 함수의 한계가 분명히 드러난다. 새 연산은 곧 인터페이스의 진화이고, 그 결과 모든 derived가 수정된다.

비-멤버 함수로 우회해 보자.

```cpp
std::string serialize(const Shape& s);     // 비-멤버
```

본문에서 `dynamic_cast`로 분기하는 식이다.

```cpp
std::string serialize(const Shape& s) {
    if (auto* c = dynamic_cast<const Circle*>(&s)) return "...";
    if (auto* sq = dynamic_cast<const Square*>(&s)) return "...";
    // ⚠️ 모든 derived를 알아야 한다 — open 계층이 깨진다
}
```

Iglberger는 이 패턴을 권장하지 않는다. `dynamic_cast`가 자주 등장한다는 것 자체가 신호다.

## std::variant의 OCP 비대칭

variant로 새 타입을 추가하면 다음과 같다.

```cpp
using Shape = std::variant<Circle, Square, Triangle>;

// 새 타입 Pentagon 추가
using Shape = std::variant<Circle, Square, Triangle, Pentagon>;     // ⚠️ variant가 바뀐다

// 모든 visit 함수가 Pentagon을 처리하도록 손봐야 한다
double area(const Shape& s) {
    return std::visit([](const auto& shape) {
        // Pentagon 케이스를 추가하거나, generic 람다로 자동 처리하거나
    }, s);
}
```

generic 람다를 쓰면 자동 처리가 가능하다.

```cpp
double area(const Shape& s) {
    return std::visit([](const auto& shape) { return shape.area(); }, s);
    // Pentagon이 area()만 가지면 자동으로 처리된다
}
```

이게 variant + 멤버 메서드 조합의 강점이다.

그러나 명시적 visit으로 `std::is_same_v` 분기를 쓰면 사정이 달라진다.

```cpp
double area(const Shape& s) {
    return std::visit([](const auto& shape) -> double {
        if constexpr (std::is_same_v<decltype(shape), const Circle&>) {
            return M_PI * shape.radius * shape.radius;
        }
        else if constexpr (std::is_same_v<decltype(shape), const Square&>) {
            return shape.side * shape.side;
        }
        // Pentagon을 추가하면 여기도 손봐야 한다
    }, s);
}
```

이 경우엔 새 타입이 모든 visit의 수정으로 이어진다. variant의 OCP 한계다.

## 도메인별 결정 — 다섯 영역

### 1) 그래픽 / UI

- 타입(도형, 위젯)이 늘어난다.
- 연산(render, hit-test, layout)은 거의 고정이다.

→ **가상 함수**

### 2) 컴파일러 / 인터프리터

- 타입(AST 노드)이 문법으로 거의 고정이다.
- 연산(parse, type-check, optimize, codegen)이 늘어난다.

→ **`std::variant` + visit**

### 3) 게임 엔티티

- 타입(플레이어, 적, 아이템, 환경)이 늘어난다.
- 연산(update, render)은 거의 고정이다.

→ **가상 함수**(또는 ECS 같은 composition)

### 4) 네트워크 프로토콜

- 타입(메시지 종류)이 프로토콜로 고정된다.
- 연산(parse, serialize, log, validate, route)이 늘어난다.

→ **`std::variant` + visit**

### 5) 명령 / 이벤트

- 타입(명령, 이벤트 종류)이 도메인마다 다르다.
- 연산(handle, log, replay, undo)이 늘어난다.

→ 보통 **`std::variant`**.

## 양쪽 다 잦으면 — Type Erasure나 External Polymorphism

```
플러그인 시스템 — 외부 플러그인이 새 타입을 추가하고, 호스트 코드는 새 연산을 추가한다
```

두 차원 모두에서 OCP를 만족시키기는 어렵다.

해결책은 두 가지가 있다.

### External Polymorphism (가이드라인 31)

```cpp
template<typename T>
class ExternalShape {
    T value_;
public:
    ExternalShape(T v) : value_(std::move(v)) {}
    double area() const { return value_.area(); }
};
```

각 타입을 외부에서 wrapper로 감싼다. 새 타입을 더할 때 wrapper만 추가하고 기존 코드는 손대지 않는다.

### Type Erasure (가이드라인 32~34)

```cpp
class AnyShape {
    struct Concept {
        virtual double area() const = 0;
        virtual ~Concept() = default;
    };

    template<typename T>
    struct Model : Concept {
        T value;
        double area() const override { return value.area(); }
    };

    std::unique_ptr<Concept> impl_;
public:
    template<typename T>
    AnyShape(T t) : impl_(std::make_unique<Model<T>>(std::move(t))) {}
    double area() const { return impl_->area(); }
};
```

`std::function`처럼 값 의미론과 런타임 다형성을 함께 갖춘 도구다. 두 차원 모두에서 OCP를 만족한다.

## 도구 결정 — 결정 트리

```
새 타입과 새 연산 중 어느 쪽이 자주 변하는가?
├── 타입 추가가 잦다 → 가상 함수
│   (도형, 위젯, 게임 엔티티)
├── 연산 추가가 잦다 → std::variant + visit
│   (AST, 메시지, 이벤트, 명령)
├── 양쪽 다 잦다 → External Polymorphism / Type Erasure
│   (플러그인, 일반 라이브러리)
├── 도메인이 고정이다(둘 다 안 변한다) → 단순 함수 / 클래스
└── 도메인 진화가 불명확하다 → 단순한 것부터, 필요해지면 리팩토링
```

## 함정 — 잘못된 도구 선택

```cpp
// AST에 가상 함수
class AstNode {
public:
    virtual ~AstNode() = default;
    virtual void evaluate() = 0;
    virtual void print() = 0;
    virtual void type_check() = 0;
    virtual void optimize() = 0;
    virtual void serialize() = 0;
    // ... 연산이 50개로 늘어난다
};

class Literal : public AstNode {
public:
    void evaluate() override;
    void print() override;
    void type_check() override;
    // ... 50개 메서드를 모두 구현해야 한다
};
```

연산이 50개가 되면 AstNode 인터페이스에 50줄이 붙고 모든 derived도 50개씩 구현해야 한다. OCP 위반이 빈번해진다.

variant + visit으로 가면 형태가 이렇게 바뀐다.

```cpp
using AstNode = std::variant<Literal, BinaryOp, Variable, ...>;

// 새 연산은 비-멤버 함수로
double evaluate(const AstNode& n);
std::string print(const AstNode& n);
void type_check(const AstNode& n);
void optimize(AstNode& n);
std::string serialize(const AstNode& n);
```

연산 50개가 함수 50개가 되고 각각이 독립적으로 늘어난다. 노드 클래스는 변경되지 않는다.

## 함정 — 너무 일찍 결정한다

```cpp
// 프로젝트 시작 시점에는 변화 방향을 알 수 없다
class Foo {
    virtual void op() = 0;
};
```

처음에는 단순하게 둔다. 도메인이 진화하는 양상을 보면서 패턴을 정한다. **Rule of Three** — 세 번 반복되기 전엔 추상화하지 않는다. 가이드라인 2의 정신이다.

## 함정 — 두 패턴을 혼합한다

```cpp
// 가상 함수와 variant를 같이 쓴다
class IShape { virtual double area() = 0; };

using Shape = std::variant<Circle, Square, Triangle>;
// ⚠️ 두 패턴을 동시에 쓰면 혼란스러워진다
```

한 도메인에는 한 패턴을 적용하자. 일관성을 유지한다.

## 변형 — 가상 함수에 함수를 더하는 방식

가상 함수에서 새 연산을 추가할 때는 비-멤버 함수로 빠지는 방법이 있다.

```cpp
class Shape {
public:
    virtual ~Shape() = default;
    virtual double area() const = 0;
};

// 새 연산 — 비-멤버 함수 + double dispatch
double calculate_volume(const Shape& s, double height) {
    return s.area() * height;
}

// 또는 정적 dispatch
template<typename ShapeType>
double calculate_volume(const ShapeType& s, double height) {
    return s.area() * height;
}
```

비-멤버 함수가 가상 메서드 위에 쌓인다. OCP를 어느 정도 만족하지만, 가상 인터페이스 자체의 확장은 여전히 어렵다.

## 변형 — Acyclic Visitor (가이드라인 18)

전통 GoF Visitor는 다음 모양이다.

```cpp
class Visitor {
public:
    virtual void visit(Circle&) = 0;
    virtual void visit(Square&) = 0;
};
```

새 도형이 추가되면 Visitor 인터페이스가 바뀐다. 타입 추가에서 OCP가 깨진다.

Acyclic Visitor는 이 문제를 일부 해결하지만 복잡하고 성능 비용이 든다. Iglberger는 보통 `std::variant`를 권한다.

## 함정 — Visitor의 dynamic_cast

```cpp
// 잘못된 "Visitor" 시도
void process(Shape* s) {
    if (auto* c = dynamic_cast<Circle*>(s)) {
        process_circle(c);
    } else if (auto* sq = dynamic_cast<Square*>(s)) {
        process_square(sq);
    }
    // 새 도형이 들어올 때마다 이 함수를 손대야 한다
}
```

가상 함수도 variant도 아닌 어색한 중간 형태다. 다음과 같은 신호로 드러난다.

- 모든 derived를 알아야 하므로 open 계층이 깨진다.
- `dynamic_cast` 비용이 따른다.
- 누락되면 런타임 동작이 정의되지 않는다.

해법은 단순하다. 올바른 패턴을 고른다.

## 실전 예 — JSON 파서

```cpp
// JSON value — 타입이 RFC로 고정되어 있다
class Null   { };
class Bool   { bool value; };
class Number { double value; };
class String { std::string value; };
class Array  { std::vector<Value> elements; };     // Value 자체가 재귀로 들어온다
class Object { std::map<std::string, Value> members; };

using Value = std::variant<Null, Bool, Number, String, Array, Object>;
```

연산은 자주 늘어난다.

```cpp
std::string serialize(const Value&);
Value parse(std::string_view);
void validate(const Value&, const Schema&);
double extract_double(const Value&);
Value transform(const Value&, const Transformer&);
// 얼마든지 더 추가할 수 있다. 기존 클래스는 손대지 않는다
```

JSON은 variant + visit의 모범 사례다.

## 실전 예 — 게임 엔티티

```cpp
class Entity {
public:
    virtual ~Entity() = default;
    virtual void update(float dt) = 0;
    virtual void render() = 0;
};

class Player : public Entity { /* ... */ };
class Enemy  : public Entity { /* ... */ };
class Bullet : public Entity { /* ... */ };

// 새 entity 종류 추가
class NPC : public Entity {
    void update(float dt) override;
    void render() override;
};
// Entity 인터페이스는 손대지 않는다
```

게임에서는 entity 종류가 늘어난다. 가상 함수가 잘 맞는다.

그러나 연산이 늘어나기 시작하면 부담이 된다.

```cpp
class Entity {
public:
    virtual void update(float dt) = 0;
    virtual void render() = 0;
    virtual void serialize() = 0;     // 추가? 모든 entity가 영향을 받는다
    virtual void replicate() = 0;
    virtual void serialize_for_save() = 0;
    // ...
};
```

해법은 **ECS(Entity-Component-System)** 다. composition으로 데이터와 동작을 분리한다. 게임 엔진의 표준 접근이다.

## C++ 표준 — 두 도구의 균형

```cpp
// 가상 함수
class std::exception { virtual const char* what() const noexcept = 0; };
class std::ostream { /* virtual */ };

// variant (C++17 이상)
std::variant<...>
std::optional<...>     // variant<T, monostate>로 보기도 한다
```

표준이 도메인에 맞게 도구를 가른다. 새 코드도 같은 결을 따르는 편이 일관된다.

## 모던 변형 — `std::overload`(C++23) 또는 사용자 정의

```cpp
// C++23 std::overload (혹은 직접 구현)
template<class... Ts>
struct overloaded : Ts... { using Ts::operator()...; };
template<class... Ts>
overloaded(Ts...) -> overloaded<Ts...>;

double area(const Shape& s) {
    return std::visit(overloaded{
        [](const Circle& c)   { return M_PI * c.radius * c.radius; },
        [](const Square& sq)  { return sq.side * sq.side; },
        [](const Triangle& t) { return 0.5 * t.base * t.height; }
    }, s);
}
```

각 케이스가 명시적인 람다로 갈린다. 가독성이 좋아지고, 누락된 케이스를 컴파일러가 잡아 준다.

## 실무 가이드 — 결정 순서

새 시스템을 디자인할 때는 다음 순서로 간다.

1. 도메인을 분석한다 — 무엇이 자주 변하는가?
2. 변화 차원을 식별한다 — 타입인가 연산인가?
3. 도구를 고른다 — 위의 결정 트리.
4. 단순한 것부터 시작한다. 변화가 분명해지기 전에는 추상화를 미룬다.
5. 필요해지면 리팩토링한다.

## 실무 가이드 — 체크리스트

- [ ] 변화의 축(타입 vs 연산)을 식별했는가?
- [ ] 도구가 그 축에 맞는가? (가상 vs variant)
- [ ] 양쪽 다 변한다면 Type Erasure를 검토했는가?
- [ ] 너무 일찍 추상화하지는 않았는가?
- [ ] 한 도메인에 한 도구로 일관성을 유지했는가?

## 정리

**Expression Problem** — 두 차원(타입과 연산) 모두에서 OCP를 만족시키기는 어렵다.

| 변화 방향 | 도구 |
| --- | --- |
| 새 타입이 잦다 | 가상 함수 |
| 새 연산이 잦다 | `std::variant` + visit |
| 둘 다 잦다 | External Polymorphism / Type Erasure |

**도메인 분석**이 도구 선택의 출발점이다.

다음 가이드라인부터 각 패턴의 모던 구현을 본격적으로 다룬다.

## 관련 항목

- [가이드라인 2: 변화를 위한 디자인](/blog/programming/cpp/cpp-software-design/guideline02-design-for-change) — 변화의 축
- [가이드라인 5: 확장을 위한 디자인](/blog/programming/cpp/cpp-software-design/guideline05-design-for-extension) — OCP
- [가이드라인 16: Visitor로 연산을 확장한다](/blog/programming/cpp/cpp-software-design/guideline16-use-visitor-to-extend-operations) — 본격 Visitor
- [가이드라인 17: std::variant로 Visitor를 구현한다](/blog/programming/cpp/cpp-software-design/guideline17-consider-stdvariant-for-implementing-visitor) — 모던 구현
