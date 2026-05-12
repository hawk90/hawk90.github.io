---
title: "가이드라인 15: 타입 추가와 연산 추가 중 무엇을 위한 디자인인지 결정하라"
date: 2026-05-14T11:00:00
description: "Expression Problem — 새 타입 잦은지 새 연산 잦은지에 따라 도구 선택. virtual vs std::variant."
tags: [C++, Software Design, Expression Problem, Visitor]
series: "C++ Software Design"
seriesOrder: 15
---

## 왜 이 가이드라인이 중요한가?

가이드라인 5(확장)에서 — Expression Problem 살짝 언급. 이번 가이드라인이 그 본격 분석.

**Expression Problem**: 두 차원(타입, 연산) 모두 OCP 만족하기 어렵다.

```
            새 타입 추가가 잦음           새 연산 추가가 잦음
            ──────────────────         ──────────────────
가상 함수   │ ✅ 새 derived만           │ ❌ 인터페이스 변경
(상속)     │   기존 코드 무수정        │   모든 derived 수정
─────────  ┼─────────────────────────  ┼─────────────────────────
std::variant│ ❌ variant + 모든 visit │ ✅ 새 비-멤버 함수만
+ visit    │   수정                    │   기존 클래스 무수정
```

이 비대칭이 — **디자인 결정의 핵심**. 도메인의 **변화 방향**을 식별하고 — 그에 맞는 도구 선택.

## 핵심 내용

- **Expression Problem**: 두 차원(타입, 연산)을 모두 OCP 만족하기 어려움
- 도메인에서 — **타입 추가가 잦은가, 연산 추가가 잦은가** 식별 필수
- **타입 추가 잦음** → 가상 함수 (상속 기반 다형성)
- **연산 추가 잦음** → `std::variant` + visit
- 둘 다 잦음 → External Polymorphism (가이드라인 31), Type Erasure (32-34)

## 비교 — 두 시나리오

### 시나리오 A — 새 도형이 자주 추가

게임 / 그래픽 엔진. 도형 종류 — 늘어남(Circle, Square, Triangle, Pentagon, ...). 연산은 — `area()`, `draw()` 두 개 정도로 고정.

```cpp
// 가상 함수 — 새 타입 추가에 OCP
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
// 기존 코드 무수정 — OCP 만족
```

### 시나리오 B — 새 연산이 자주 추가

언어 인터프리터 / AST. 노드 종류 — 정해짐(Literal, BinaryOp, Variable, ...). 연산은 — `evaluate()`, `print()`, `compile()`, `type_check()`, `serialize()`, `optimize()`, ...

```cpp
// std::variant + visit — 새 연산 추가에 OCP
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

// 기존 노드 클래스 무수정 — OCP 만족
```

## 가상 함수의 OCP 비대칭

가상 함수로 — 새 연산 추가 시도:

```cpp
class Shape {
public:
    virtual double area() const = 0;
    virtual void draw() const = 0;
    
    // 새 연산 추가
    virtual std::string serialize() const = 0;     // ⚠️ 인터페이스 변경
};

// 결과 — 모든 derived 수정:
class Circle : public Shape {
public:
    double area() const override;
    void draw() const override;
    std::string serialize() const override;     // 추가
};

class Square : public Shape {
    // 또 추가
};

// 100개 derived 있으면 — 100곳 수정
```

**가상 함수의 한계**: 새 연산 = 인터페이스 진화 = 모든 derived 수정.

비-멤버 함수로 가상 함수 우회:

```cpp
std::string serialize(const Shape& s);     // 비-멤버
```

본문에서 — `dynamic_cast`로 분기:

```cpp
std::string serialize(const Shape& s) {
    if (auto* c = dynamic_cast<const Circle*>(&s)) return "...";
    if (auto* sq = dynamic_cast<const Square*>(&s)) return "...";
    // ⚠️ 모든 derived 알아야 — Open 깨짐
}
```

이 패턴 — Iglberger가 강하게 권고 X. dynamic_cast 남발은 신호.

## std::variant의 OCP 비대칭

variant로 — 새 타입 추가 시도:

```cpp
using Shape = std::variant<Circle, Square, Triangle>;

// 새 타입 Pentagon 추가
using Shape = std::variant<Circle, Square, Triangle, Pentagon>;     // ⚠️ variant 변경

// 모든 visit 함수 — Pentagon 처리 추가:
double area(const Shape& s) {
    return std::visit([](const auto& shape) {
        // Pentagon 케이스 추가? 또는 generic 람다로 자동 처리?
    }, s);
}
```

generic 람다 사용하면 — 자동 처리 가능:

```cpp
double area(const Shape& s) {
    return std::visit([](const auto& shape) { return shape.area(); }, s);
    // Pentagon이 area()만 가지면 — 자동
}
```

이게 — variant + 멤버 메서드의 강점.

명시적 visit으로 — `std::is_same_v` 분기:

```cpp
double area(const Shape& s) {
    return std::visit([](const auto& shape) -> double {
        if constexpr (std::is_same_v<decltype(shape), const Circle&>) {
            return M_PI * shape.radius * shape.radius;
        }
        else if constexpr (std::is_same_v<decltype(shape), const Square&>) {
            return shape.side * shape.side;
        }
        // Pentagon 추가 시 — 여기 추가 필요
    }, s);
}
```

이 경우 — 새 타입 추가가 모든 visit 수정 강제. variant의 OCP 한계.

## 도메인별 결정 — 5 영역

### 1) 그래픽 / UI

- **타입**: 도형, 위젯 — 늘어남
- **연산**: render, hit-test, layout — 거의 고정

→ **가상 함수**

### 2) 컴파일러 / 인터프리터

- **타입**: AST 노드 — 거의 고정 (문법으로 정의)
- **연산**: parse, type-check, optimize, codegen — 늘어남

→ **`std::variant` + visit**

### 3) 게임 엔티티

- **타입**: 플레이어, 적, 아이템, 환경 — 늘어남
- **연산**: update, render — 거의 고정

→ **가상 함수** (또는 ECS 같은 컴포지션)

### 4) 네트워크 프로토콜

- **타입**: 메시지 종류 — 프로토콜로 정의됨 (고정)
- **연산**: parse, serialize, log, validate, route — 늘어남

→ **`std::variant` + visit**

### 5) 명령 / 이벤트

- **타입**: 명령/이벤트 종류 — 도메인마다 다름
- **연산**: handle, log, replay, undo — 늘어남

→ 보통 **`std::variant`**

## 양쪽 다 잦은 경우 — Type Erasure / External Polymorphism

```
플러그인 시스템 — 외부 plugin이 새 타입 추가, 호스트 코드가 새 연산 추가
```

양쪽 모두 OCP — 어려움.

해결책:

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

각 타입에 — 외부에서 wrapper. 새 타입 추가 — wrapper 추가, 기존 코드 무수정.

### Type Erasure (가이드라인 32-34)

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

`std::function`처럼 — value semantics + runtime polymorphism. 두 차원 모두 OCP.

## 도구 결정 — Decision Tree

```
새 타입 vs 새 연산 — 어느 게 더 자주 변하나?
├── 타입 추가 잦음 → 가상 함수
│   (도형, 위젯, 게임 엔티티)
├── 연산 추가 잦음 → std::variant + visit
│   (AST, 메시지, 이벤트, 명령)
├── 양쪽 다 잦음 → External Polymorphism / Type Erasure
│   (플러그인, 일반 라이브러리)
├── 도메인이 고정 (둘 다 안 변함) → 단순 함수/클래스
└── 도메인 진화 불명확 → 단순한 것부터, refactor
```

## 함정 — 잘못된 도구 선택

```cpp
// AST에 가상 함수 사용
class AstNode {
public:
    virtual ~AstNode() = default;
    virtual void evaluate() = 0;
    virtual void print() = 0;
    virtual void type_check() = 0;
    virtual void optimize() = 0;
    virtual void serialize() = 0;
    // ... 50개 연산 추가 →
};

class Literal : public AstNode {
public:
    void evaluate() override;
    void print() override;
    void type_check() override;
    // ... 50개 메서드 구현 강제
};
```

연산 50개 → AstNode 인터페이스 50줄 + 모든 derived 50개 메서드. OCP 위반 빈번.

```cpp
// AST에 variant + visit
using AstNode = std::variant<Literal, BinaryOp, Variable, ...>;

// 새 연산 = 비-멤버 함수
double evaluate(const AstNode& n);
std::string print(const AstNode& n);
void type_check(const AstNode& n);
void optimize(AstNode& n);
std::string serialize(const AstNode& n);
```

연산 50개 → 함수 50개. 각각 독립. 노드 클래스는 — 변경 없음.

## 함정 — 너무 일찍 결정

```cpp
// 프로젝트 시작 시점 — 변화 방향 모름
class Foo {
    virtual void op() = 0;
};
```

처음엔 — 단순. 도메인 진화 보며 — 패턴 결정.

**Rule of Three** — 3번 반복되면 추상화. 가이드라인 2 참고.

## 함정 — 혼합 사용

```cpp
// 가상 함수 + variant — 양쪽
class IShape { virtual double area() = 0; };

using Shape = std::variant<Circle, Square, Triangle>;
// ⚠️ 두 패턴 동시에 — 혼란
```

한 도메인 — 한 패턴. 일관성 유지.

## 변형 — 가상 함수의 함수 추가 방식

가상 함수에서 — 새 연산 추가:

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

비-멤버 함수가 — 가상 메서드 위에 build. OCP 일부 만족 (단, 가상 메서드 인터페이스 확장은 여전히 어려움).

## 변형 — Acyclic Visitor (가이드라인 18)

전통 GoF Visitor:

```cpp
class Visitor {
public:
    virtual void visit(Circle&) = 0;
    virtual void visit(Square&) = 0;
};
```

새 도형 추가 → Visitor 인터페이스 변경. **타입 추가에 OCP 위반**.

Acyclic Visitor — 이 문제 일부 해결. 그러나 — 복잡 + 성능 비용. Iglberger는 — `std::variant` 권장.

## 함정 — Visitor의 dynamic_cast

```cpp
// 잘못된 "Visitor" 시도
void process(Shape* s) {
    if (auto* c = dynamic_cast<Circle*>(s)) {
        process_circle(c);
    } else if (auto* sq = dynamic_cast<Square*>(s)) {
        process_square(sq);
    }
    // 새 도형 추가 시 — 이 함수 수정
}
```

이게 — 가상 함수 + variant 둘 다 아닌 어색한 중간. 신호:
- 모든 derived 알아야 함 — Open 깨짐
- dynamic_cast 비용
- 누락 시 — 런타임 미정의

해결: **올바른 패턴 선택**.

## 실전 예 — JSON 파서

```cpp
// JSON value — 타입 고정 (RFC로 정의)
class Null   { };
class Bool   { bool value; };
class Number { double value; };
class String { std::string value; };
class Array  { std::vector<Value> elements; };     // Value 자체 재귀
class Object { std::map<std::string, Value> members; };

using Value = std::variant<Null, Bool, Number, String, Array, Object>;
```

연산 — 자주 추가:

```cpp
std::string serialize(const Value&);
Value parse(std::string_view);
void validate(const Value&, const Schema&);
double extract_double(const Value&);
Value transform(const Value&, const Transformer&);
// 더 많이 추가 가능 — 기존 클래스 무수정
```

**JSON = variant + visit의 모범**.

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
// Entity 인터페이스 무변경
```

게임에선 — entity 종류가 늘어남. 가상 함수가 적합.

연산이 — 늘어나면? 가상 함수가 부담:

```cpp
class Entity {
public:
    virtual void update(float dt) = 0;
    virtual void render() = 0;
    virtual void serialize() = 0;     // 추가? 모든 entity 수정
    virtual void replicate() = 0;
    virtual void serialize_for_save() = 0;
    // ...
};
```

해결책 — **ECS (Entity-Component-System)**. composition으로 — 데이터와 동작 분리. 게임 엔진의 표준.

## C++ 표준 — 두 도구의 균형

```cpp
// 가상 함수
class std::exception { virtual const char* what() const noexcept = 0; };
class std::ostream { /* virtual */ };

// variant (C++17+)
std::variant<...>
std::optional<...>     // variant<T, monostate>
```

표준이 — 도메인에 맞게 도구 선택. 새 코드도 따라가는 게 일관성.

## 모던 변형 — `std::overload`(C++23) 또는 사용자 정의

```cpp
// C++23 std::overload (또는 직접 구현)
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

각 케이스가 — 명시적 람다. 가독성 ↑, 컴파일러가 누락 케이스 검출.

## 실무 가이드 — 결정 순서

새 시스템 디자인 시:

1. **도메인 분석** — 무엇이 자주 변하나?
2. **변화 차원 식별** — 타입? 연산?
3. **도구 선택** — 위 결정 트리
4. **단순한 것부터** — 변화가 명확해질 때까지 기다림
5. **Refactor** — 필요 시

## 실무 가이드 — 체크리스트

- [ ] **변화의 축**(타입 vs 연산) 식별?
- [ ] 도구가 그 축에 맞나? (가상 vs variant)
- [ ] 양쪽 다 변하면 — Type Erasure 검토?
- [ ] 너무 일찍 추상화하지 않았나?
- [ ] 일관된 도구 사용 (혼합 X)?

## 정리

**Expression Problem** — 두 차원(타입, 연산) 모두 OCP는 어렵다.

| 변화 방향 | 도구 |
| --- | --- |
| 새 타입 잦음 | 가상 함수 |
| 새 연산 잦음 | `std::variant` + visit |
| 둘 다 | External Polymorphism / Type Erasure |

**도메인 분석**이 — 도구 선택의 출발점.

다음 가이드라인부터 — 각 패턴의 모던 구현.

## 관련 항목

- [가이드라인 2: 변화를 위한 디자인](/blog/programming/cpp-software-design/guideline02-design-for-change) — 변화의 축
- [가이드라인 5: 확장을 위한 디자인](/blog/programming/cpp-software-design/guideline05-design-for-extension) — OCP
- [가이드라인 16: Visitor로 연산 확장](/blog/programming/cpp-software-design/guideline16-use-visitor-to-extend-operations) — 본격 Visitor
- [가이드라인 17: std::variant Visitor](/blog/programming/cpp-software-design/guideline17-consider-stdvariant-for-implementing-visitor) — 모던 구현
