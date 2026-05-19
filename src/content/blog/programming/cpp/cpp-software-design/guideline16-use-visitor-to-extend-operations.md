---
title: "가이드라인 16: 연산 확장에 Visitor를 사용하라"
date: 2026-05-02T16:00:00
description: "GoF Visitor — 닫힌 타입 집합에 새 연산을 더한다. double dispatch의 메커니즘과 모던 한계."
tags: [C++, Software Design, Visitor, Design Patterns]
series: "C++ Software Design"
seriesOrder: 16
draft: true
---

## 왜 이 가이드라인이 중요한가?

가이드라인 15에서 본 Expression Problem이 있다. 연산 추가가 잦은 도메인에는 **Visitor 패턴**이 답이다.

```cpp
// 가상 함수만으로는 새 연산을 더할 때마다 인터페이스를 손대야 한다
class Shape {
    virtual double area() const = 0;
    virtual void draw() const = 0;
    // 새 연산이 들어오면 모든 derived를 수정한다
};
```

GoF Visitor는 **double dispatch**로 이 문제를 우회한다. 새 연산 하나가 곧 새 Visitor 클래스고, 기존 도형 클래스는 손대지 않는다.

이번 가이드라인은 GoF Visitor의 원본 구조와 C++ 구현, 그리고 한계를 본다. 가이드라인 17에서 모던 대안인 `std::variant`로 이어진다.

## 핵심 내용

- **GoF Visitor** — 닫힌 타입 집합에 새 연산을 더할 수 있게 한다(연산에 대한 OCP).
- **Double dispatch** — 두 단계의 가상 호출로 객체 타입과 연산 타입을 모두 디스패치한다.
- 새 도형이 들어오면 인터페이스와 모든 Visitor를 손대야 한다(타입에 대한 OCP는 깨진다).
- accept 메서드와 Visitor 인터페이스 같은 보일러플레이트가 많다.
- 모던 C++에서는 **`std::variant` + visit**를 우선 권한다(가이드라인 17).

## GoF Visitor 구조

```cpp
// 1. Visitor 인터페이스
class ShapeVisitor {
public:
    virtual ~ShapeVisitor() = default;
    virtual void visit(class Circle&) = 0;
    virtual void visit(class Square&) = 0;
    virtual void visit(class Triangle&) = 0;
};

// 2. Element 인터페이스
class Shape {
public:
    virtual ~Shape() = default;
    virtual void accept(ShapeVisitor& v) = 0;     // 핵심 — visitor를 받는다
};

// 3. Concrete Elements
class Circle : public Shape {
public:
    double radius;
    void accept(ShapeVisitor& v) override { v.visit(*this); }     // double dispatch
};

class Square : public Shape {
public:
    double side;
    void accept(ShapeVisitor& v) override { v.visit(*this); }
};

class Triangle : public Shape {
public:
    double base, height;
    void accept(ShapeVisitor& v) override { v.visit(*this); }
};

// 4. Concrete Visitors — 연산
class AreaVisitor : public ShapeVisitor {
public:
    double result;
    void visit(Circle& c) override { result = M_PI * c.radius * c.radius; }
    void visit(Square& s) override { result = s.side * s.side; }
    void visit(Triangle& t) override { result = 0.5 * t.base * t.height; }
};

class DrawVisitor : public ShapeVisitor {
public:
    void visit(Circle&) override { /* 원 그리기 */ }
    void visit(Square&) override { /* 사각형 그리기 */ }
    void visit(Triangle&) override { /* 삼각형 그리기 */ }
};
```

사용은 다음과 같다.

```cpp
std::vector<std::unique_ptr<Shape>> shapes;
shapes.push_back(std::make_unique<Circle>(...));
shapes.push_back(std::make_unique<Square>(...));

AreaVisitor area;
for (auto& s : shapes) {
    s->accept(area);
    std::cout << "Area: " << area.result << '\n';
}
```

## Double Dispatch

```
visitor.visit(shape) 호출 시
  1. 컴파일러는 shape의 정적 타입(Shape*)만 안다
  2. shape->accept(visitor) 호출 — 가상 함수 dispatch
     → 실제 타입의 accept가 실행된다 (예: Circle::accept)
  3. Circle::accept 안에서 visitor.visit(*this)를 호출한다
     → *this의 정적 타입은 Circle (컴파일 타임에 알려진다)
     → visitor.visit(Circle&) 호출 — 또 한 번의 가상 함수 dispatch
     → 실제 Visitor의 visit(Circle&)가 실행된다
```

두 번의 가상 dispatch가 일어난다. 이게 **double dispatch**다. C++은 single dispatch만 직접 지원하고(가상 함수), Visitor가 이를 우회한다.

## 새 연산 추가 — OCP 만족

```cpp
// 새 연산: BoundingBox 계산
class BoundingBoxVisitor : public ShapeVisitor {
public:
    Rect result;
    void visit(Circle& c) override   { result = /* 원의 bounding box */; }
    void visit(Square& s) override   { result = /* ... */; }
    void visit(Triangle& t) override { result = /* ... */; }
};

// 기존 Shape, Circle, Square, Triangle은 손대지 않는다 ✅
```

새 Visitor를 추가해도 Shape 인터페이스와 모든 도형 클래스가 그대로다.

## 새 타입 추가 — OCP 위반

```cpp
// 새 도형 Pentagon 추가
class Pentagon : public Shape {
public:
    double side;
    int count;
    void accept(ShapeVisitor& v) override { v.visit(*this); }     // ⚠️ visitor에 Pentagon 케이스가 없다
};

// ShapeVisitor를 수정해야 한다
class ShapeVisitor {
public:
    virtual void visit(Circle&) = 0;
    virtual void visit(Square&) = 0;
    virtual void visit(Triangle&) = 0;
    virtual void visit(Pentagon&) = 0;     // ⚠️ 추가
};

// 모든 기존 Visitor를 수정해야 한다
class AreaVisitor : public ShapeVisitor {
public:
    // ...
    void visit(Pentagon& p) override { /* 추가 */ }     // ⚠️ 강제 수정
};

class DrawVisitor : public ShapeVisitor {
public:
    // ...
    void visit(Pentagon& p) override { /* 추가 */ }     // ⚠️
};

class BoundingBoxVisitor : public ShapeVisitor {
public:
    // ...
    void visit(Pentagon& p) override { /* 추가 */ }     // ⚠️
};

// visitor가 N개면 N군데를 손댄다. 타입에 대한 OCP가 깨진다.
```

이 비대칭이 Expression Problem의 본질이다(가이드라인 15). Visitor는 연산 추가에는 OCP를 만족하지만 타입 추가에서는 그렇지 않다.

## Visitor의 장점

### 1) 새 연산 추가가 자유롭다

연산 추가가 Visitor 클래스 하나 추가로 끝난다. 기존 element는 모두 그대로다.

### 2) 연산 로직이 한 곳에 모인다

각 Visitor가 자기 연산의 모든 타입별 구현을 갖는다. `AreaVisitor`만 보면 모든 도형의 area 계산이 한눈에 들어온다.

대조적으로, 가상 함수에서는 각 도형 클래스에 area()가 흩어진다.

```cpp
// 가상 함수: 각 도형의 area가 별도 파일에 흩어진다
class Circle  { double area() const { /* ... */ } };
class Square  { double area() const { /* ... */ } };
class Triangle{ double area() const { /* ... */ } };
```

Visitor에서는 한 클래스에 모인다.

```cpp
class AreaVisitor : public ShapeVisitor {
public:
    void visit(Circle&)   { /* Circle area */ }
    void visit(Square&)   { /* Square area */ }
    void visit(Triangle&) { /* Triangle area */ }
};
```

연산 로직의 응집도가 올라간다.

### 3) 상태를 보존할 수 있다

Visitor가 인스턴스 변수로 상태를 들고 다닐 수 있다.

```cpp
class TotalAreaVisitor : public ShapeVisitor {
    double total_ = 0;
public:
    double total() const { return total_; }

    void visit(Circle& c) override { total_ += M_PI * c.radius * c.radius; }
    void visit(Square& s) override { total_ += s.side * s.side; }
    // ...
};

TotalAreaVisitor v;
for (auto& s : shapes) s->accept(v);
std::cout << "Total: " << v.total();
```

복잡한 연산이 자연스럽게 풀린다.

## Visitor의 단점

### 1) 타입 추가에서 OCP가 깨진다

방금 살펴본 그대로다. 새 도형이 들어올 때마다 부담이 된다. Iglberger가 가장 강하게 비판하는 지점이다.

### 2) 보일러플레이트가 많다

```cpp
// Element마다 accept 메서드를 더해야 한다
void accept(ShapeVisitor& v) override { v.visit(*this); }

// Visitor마다 모든 타입에 대한 visit 오버로드가 필요하다
```

타입이 N개, 연산이 M개면 메서드가 N×M개 생긴다.

### 3) 가상 함수 비용이 두 번 든다

double dispatch는 vtable lookup이 두 번이다. 핫 패스에서는 비용이 만만치 않다.

### 4) 양방향 의존이 생긴다

```
Shape ─── accept ────→ Visitor
Visitor ── visit ────→ Concrete Shape (Circle, Square, ...)
```

`ShapeVisitor`가 모든 concrete shape을 알아야 한다. ISP 관점에서 부담이 된다.

### 5) Visitor의 상태는 thread-unsafe하다

```cpp
class AreaVisitor : public ShapeVisitor {
public:
    double result;     // 멤버
};

// 멀티스레드에서 같은 visitor를 공유하면 race가 생긴다
```

각 스레드는 자기 visitor 인스턴스를 쓰자.

## 변형 — Acyclic Visitor (가이드라인 18)

GoF Visitor의 순환 의존을 끊는 변형이다.

```cpp
class IShapeVisitor {     // 모든 visitor의 base
    virtual ~IShapeVisitor() = default;
};

template<typename Shape>
class IVisitorFor {     // 특정 도형에 대한 visit
public:
    virtual void visit(Shape&) = 0;
};

class AreaVisitor
    : public IShapeVisitor,
      public IVisitorFor<Circle>,
      public IVisitorFor<Square> {     // 지원하는 도형만 골라 상속한다
public:
    void visit(Circle&) override;
    void visit(Square&) override;
    // Triangle은 처리하지 않는다
};

class Shape {
public:
    virtual void accept(IShapeVisitor& v) = 0;
};

class Circle : public Shape {
public:
    void accept(IShapeVisitor& v) override {
        if (auto* visitor = dynamic_cast<IVisitorFor<Circle>*>(&v)) {
            visitor->visit(*this);
        }
        // 지원하지 않으면 그냥 건너뛴다
    }
};
```

장점은 분명하다. 새 도형이 추가돼도 기존 visitor는 손대지 않는다(지원하지 않으면 skip).

단점도 있다.

- `dynamic_cast`의 런타임 비용.
- 가이드라인 18 — "성능 주의".
- 복잡도가 올라간다.

가이드라인 18이 Acyclic Visitor의 성능 함정을 다룬다.

## 모던 변형 — std::variant + visit (가이드라인 17)

```cpp
// Visitor의 모던 대안
using Shape = std::variant<Circle, Square, Triangle>;

double area(const Shape& s) {
    return std::visit([](const auto& shape) {
        if constexpr (std::is_same_v<decltype(shape), const Circle&>)
            return M_PI * shape.radius * shape.radius;
        else if constexpr (std::is_same_v<decltype(shape), const Square&>)
            return shape.side * shape.side;
        else if constexpr (std::is_same_v<decltype(shape), const Triangle&>)
            return 0.5 * shape.base * shape.height;
    }, s);
}
```

장점은 다음과 같다.

- accept 메서드가 필요 없다.
- Visitor 클래스가 필요 없다(람다로 충분하다).
- 가상 함수 비용이 없다(tag dispatch).
- 값 의미론을 그대로 가져간다.

Iglberger의 권장은 분명하다. 가능하면 variant를 우선한다. 자세한 비교는 가이드라인 17에서 다룬다.

## GoF Visitor가 정당한 경우

variant 대신 GoF Visitor가 맞는 경우도 있다.

### 1) 다형성이 깊은 계층

```cpp
class Animal {};
class Dog : public Animal {};
class Cat : public Animal {};
class GoldenRetriever : public Dog {};
class Persian : public Cat {};
```

variant는 모든 타입을 평면적으로 묶는다. 깊은 hierarchy에는 어울리지 않는다.

### 2) Open hierarchy가 필요한 경우

```cpp
// 라이브러리 사용자가 새 Shape를 추가할 수 있다
class UserShape : public Shape { /* ... */ };
```

variant는 닫힌 집합이다. 사용자가 새 타입을 추가할 수 없다. 가상 함수 + 사용자 정의 Visitor는 open이다(단, 사용자가 모든 visitor를 손봐야 한다).

### 3) Stateful visitor

Visitor가 복잡한 상태를 추적해야 할 때다. variant + 람다 캡처로도 가능하지만 어색하다.

```cpp
class CountingVisitor : public ShapeVisitor {
    std::map<std::string, int> counts_;
public:
    void visit(Circle&)   { counts_["circle"]++; }
    // ...
    auto counts() const { return counts_; }
};
```

## C++ AST — 실전 예

LLVM의 AST가 Visitor 패턴을 사용한다.

```cpp
class ASTVisitor {
public:
    virtual void visit(BinaryOperator*) = 0;
    virtual void visit(UnaryOperator*) = 0;
    virtual void visit(CallExpr*) = 0;
    // ...
};

class ConstantFoldingVisitor : public ASTVisitor {
    // 최적화 패스
};

class CodegenVisitor : public ASTVisitor {
    // IR 생성
};
```

LLVM은 가상 함수와 visitor를 혼합한다. 새 노드 종류는 거의 추가되지 않고(언어 문법이 고정), 새 패스는 자주 추가된다.

## 클래스 hierarchy 시각화

```
        Shape (abstract)
        accept(v) = 0
            ▲
            │
    ┌───────┼───────┐
    │       │       │
  Circle  Square  Triangle
  accept()  accept() accept()

        ShapeVisitor (abstract)
        visit(Circle) = 0
        visit(Square) = 0
        visit(Triangle) = 0
            ▲
            │
        AreaVisitor
        visit(Circle)
        visit(Square)
        visit(Triangle)
```

두 hierarchy의 결합이 Visitor의 본질이다.

## 함정 — visit 안에서 또 다른 visit을 호출한다

```cpp
class ComplexVisitor : public ShapeVisitor {
    void visit(Composite& c) override {
        for (auto& child : c.children) {
            child->accept(*this);     // 재귀 — OK
        }
    }
};
```

재귀는 트리 구조에 자연스럽다. 다만 깊은 재귀는 stack overflow 위험이 있다.

## 모던 C++ — `std::visit` 직접 사용

```cpp
using Shape = std::variant<Circle, Square, Triangle>;

// 람다 visitor (가이드라인 17)
auto area_calc = [](const auto& s) -> double {
    if constexpr (std::is_same_v<decltype(s), const Circle&>)
        return M_PI * s.radius * s.radius;
    // ...
};

double a = std::visit(area_calc, shape);
```

람다가 Visitor 클래스를 대신한다. 짧고 명확하다.

C++23의 `std::overload`를 쓰면 더 깔끔해진다.

```cpp
double a = std::visit(std::overload{
    [](const Circle& c)   { return M_PI * c.radius * c.radius; },
    [](const Square& s)   { return s.side * s.side; },
    [](const Triangle& t) { return 0.5 * t.base * t.height; }
}, shape);
```

각 타입에 대한 케이스가 명시적으로 분리된다. 누락된 케이스를 컴파일러가 잡아 준다.

## 디자인 결정 — Visitor와 가상 함수 중 무엇을 고를까

| 시나리오 | 도구 |
| --- | --- |
| 타입이 늘어나고 연산은 적다 | 가상 함수 |
| 타입이 적고 연산이 늘어난다 | GoF Visitor 또는 variant |
| 평면적 타입 집합 | `std::variant` + visit |
| 깊은 hierarchy | GoF Visitor |
| Open hierarchy | GoF Visitor |
| 닫힌 타입 집합 | `std::variant` + visit |
| 성능 critical | `std::variant` (vtable 회피) |

대부분의 모던 C++ 코드는 `std::variant` + visit가 우선이다.

## 함정 — Visitor와 Composite 패턴

```cpp
class Shape { virtual void accept(...) = 0; };
class Group : public Shape {     // Composite
    std::vector<std::unique_ptr<Shape>> children;
    void accept(ShapeVisitor& v) override {
        v.visit(*this);
        for (auto& c : children) c->accept(v);
    }
};
```

Visitor와 Composite는 자연스럽게 결합한다. 트리 순회의 표준이다.

## 실무 가이드 — Visitor를 꺼낼 때

```
연산 추가가 잦은 도메인이다 — Visitor를 쓸까?
├── 타입 집합이 작고 평면적 → std::variant + visit ✅
├── 타입 집합이 크거나 계층이 깊다 → GoF Visitor
├── Open hierarchy가 필요하다 → GoF Visitor
├── 성능 critical → std::variant (vtable 회피)
└── 단순 도메인 → 가상 함수도 무난하다
```

## 실무 가이드 — 체크리스트

GoF Visitor를 도입할 때 다음을 점검한다.

- [ ] 연산 추가가 정말 잦은가? (visitor가 셋 이상 예상되는가)
- [ ] 타입 집합은 비교적 고정인가?
- [ ] `std::variant`로 대체할 수 있는가? (닫힌 집합)
- [ ] 보일러플레이트 부담을 받아들일 수 있는가?
- [ ] 가상 함수 비용 × 2의 성능 영향을 받아들일 수 있는가?
- [ ] visitor 사이의 일관성을 유지할 수 있는가? (새 타입 추가 시 모두 손볼 수 있는가)

## 정리

**GoF Visitor**는 닫힌 타입 집합에 새 연산을 더하는 표준 패턴이다.

```
새 연산 추가 → 새 Visitor 클래스, 기존 코드는 그대로 ✅ (OCP)
새 타입 추가 → 모든 Visitor를 손봐야 한다           ❌ (OCP 위반)
```

모던 C++에서는 다음으로 정리된다.

- **`std::variant` + visit** — 대부분 더 낫다(가이드라인 17).
- **GoF Visitor** — 깊은 hierarchy나 open hierarchy일 때만.

다음은 가이드라인 17 — `std::variant` 기반의 모던 Visitor다.

## 관련 항목

- [가이드라인 15: 타입/연산 추가 디자인](/blog/programming/cpp/cpp-software-design/guideline15-design-for-the-addition-of-types-or-operations) — Expression Problem
- [가이드라인 17: std::variant Visitor](/blog/programming/cpp/cpp-software-design/guideline17-consider-stdvariant-for-implementing-visitor) — 모던 대안
- [가이드라인 18: Acyclic Visitor의 성능](/blog/programming/cpp/cpp-software-design/guideline18-beware-the-performance-of-acyclic-visitor) — 변형의 함정
- [GoF Visitor](/blog/programming/design/gof-design-patterns/item22-visitor) — 1994년의 정의
