---
title: "가이드라인 16: 연산 확장에 Visitor를 사용하라"
date: 2026-05-14T12:00:00
description: "GoF Visitor — 닫힌 타입 집합에 새 연산 추가. double dispatch 메커니즘 + 모던 한계."
tags: [C++, Software Design, Visitor, Design Patterns]
series: "C++ Software Design"
seriesOrder: 16
---

## 왜 이 가이드라인이 중요한가?

가이드라인 15에서 — Expression Problem. 연산 추가가 잦은 도메인엔 — **Visitor 패턴**.

```cpp
// 가상 함수만으로는 — 새 연산 추가 시 인터페이스 변경
class Shape {
    virtual double area() const = 0;
    virtual void draw() const = 0;
    // 새 연산 추가 → 모든 derived 수정
};
```

GoF Visitor — **double dispatch**로 우회. 새 연산 = 새 Visitor 클래스, 기존 도형 무수정.

이번 가이드라인 — GoF Visitor의 원본 + C++ 구현 + 한계. 가이드라인 17에서 모던 대안(`std::variant`).

## 핵심 내용

- **GoF Visitor** — 닫힌 타입 집합에 새 연산 추가 가능 (OCP for operations)
- **Double dispatch** — 두 단계 가상 호출로 (객체 타입 + 연산 타입)
- 새 도형 추가 — **인터페이스 변경 + 모든 Visitor 수정** (OCP 위반 for types)
- 보일러플레이트 多 — accept 메서드, Visitor 인터페이스
- 모던 C++에선 — **`std::variant` + visit** 권장 (가이드라인 17)

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
    virtual void accept(ShapeVisitor& v) = 0;     // 핵심 — visitor 받음
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

사용:

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
visitor.visit(shape) 호출 시:
  1. 컴파일러는 shape의 정적 타입(Shape*)만 알음
  2. shape->accept(visitor) 호출 — 가상 함수 dispatch
     → 실제 타입의 accept 실행 (예: Circle::accept)
  3. Circle::accept 안에서 visitor.visit(*this) 호출
     → *this의 정적 타입은 Circle (컴파일 타임 알려짐)
     → visitor.visit(Circle&) 호출 — 가상 함수 dispatch
     → 실제 Visitor의 visit(Circle&) 실행
```

두 번의 가상 dispatch — **double dispatch**. C++은 single dispatch만 직접 지원(가상 함수). Visitor가 이를 우회.

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

// 기존 Shape, Circle, Square, Triangle — 무수정 ✅
```

새 Visitor 추가 — Shape 인터페이스 무변경, 모든 도형 클래스 무변경.

## 새 타입 추가 — OCP 위반

```cpp
// 새 도형 Pentagon 추가
class Pentagon : public Shape {
public:
    double side;
    int count;
    void accept(ShapeVisitor& v) override { v.visit(*this); }     // ⚠️ visitor에 Pentagon 없음
};

// ShapeVisitor 수정
class ShapeVisitor {
public:
    virtual void visit(Circle&) = 0;
    virtual void visit(Square&) = 0;
    virtual void visit(Triangle&) = 0;
    virtual void visit(Pentagon&) = 0;     // ⚠️ 추가
};

// 모든 기존 Visitor 수정
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

// N개 visitor — N곳 수정. OCP 위반 (for types).
```

이게 Expression Problem (가이드라인 15). Visitor — 연산 추가에는 OCP, 타입 추가에는 OCP 위반.

## Visitor의 장점

### 1) 새 연산 추가가 자유로움

연산 추가 — Visitor 클래스 추가만. 기존 모든 elements는 무수정.

### 2) 연산 로직 — 한 곳에 모음

각 Visitor가 — 자기 연산의 모든 타입별 구현 보유. `AreaVisitor` 보면 모든 도형의 area 계산 한눈에.

대조 — 가상 함수의 경우, 각 도형 클래스에 area() 흩어짐:

```cpp
// 가상 함수: Circle::area, Square::area, ... 각각 다른 파일
class Circle  { double area() const { /* ... */ } };
class Square  { double area() const { /* ... */ } };
class Triangle{ double area() const { /* ... */ } };
```

Visitor — 모든 area 한 클래스에:

```cpp
class AreaVisitor : public ShapeVisitor {
public:
    void visit(Circle&)   { /* Circle area */ }
    void visit(Square&)   { /* Square area */ }
    void visit(Triangle&) { /* Triangle area */ }
};
```

연산 로직 응집도 ↑.

### 3) State 보존 가능

Visitor가 — 인스턴스 변수로 상태:

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

복잡한 연산 — 자연스럽게.

## Visitor의 단점

### 1) 타입 추가 시 OCP 위반

위에서 본 대로 — 새 도형 추가가 부담. Iglberger의 가장 큰 비판.

### 2) 보일러플레이트

```cpp
// Element 마다 — accept 메서드 추가
void accept(ShapeVisitor& v) override { v.visit(*this); }

// Visitor 마다 — visit overload 모든 타입에 대해
```

타입 N개, 연산 M개 → N×M 메서드.

### 3) 가상 함수 비용 × 2

double dispatch — 두 번의 vtable lookup. 핫 패스에 비쌈.

### 4) 양방향 의존

```
Shape ─── accept ────→ Visitor
Visitor ── visit ────→ Concrete Shape (Circle, Square, ...)
```

`ShapeVisitor`가 — 모든 concrete shape 알아야. ISP 위반 가능.

### 5) Visitor 상태가 thread-unsafe

```cpp
class AreaVisitor : public ShapeVisitor {
public:
    double result;     // 멤버
};

// 멀티스레드에서 같은 visitor 공유 → race
```

각 스레드 — 자기 visitor 인스턴스 사용.

## 변형 — Acyclic Visitor (가이드라인 18)

GoF Visitor의 순환 의존을 끊는 변형:

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
      public IVisitorFor<Square> {     // 지원 도형만
public:
    void visit(Circle&) override;
    void visit(Square&) override;
    // Triangle은 무관 — 안 처리
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
        // 지원 안 하면 — silent skip
    }
};
```

**장점**: 새 도형 추가 — 기존 visitor 무수정 (지원 안 하면 skip).

**단점**:
- dynamic_cast — 런타임 비용
- 가이드라인 27 — "성능 주의"
- 복잡도 ↑

Iglberger 가이드라인 18 — Acyclic Visitor의 성능 함정.

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

- accept 메서드 — 불필요
- Visitor 클래스 — 불필요 (람다)
- 가상 함수 비용 — X (tag dispatch)
- value semantics

Iglberger 권장 — 가능하면 variant 우선.

자세한 비교 — 가이드라인 17.

## GoF Visitor가 정당한 경우

variant 대신 GoF Visitor가 적합한 경우:

### 1) 다형성이 깊은 hierarchy

```cpp
class Animal {};
class Dog : public Animal {};
class Cat : public Animal {};
class GoldenRetriever : public Dog {};
class Persian : public Cat {};
```

variant — 모든 타입을 평면적으로. 깊은 hierarchy에 부적합.

### 2) Open hierarchy 필요

```cpp
// 라이브러리 사용자가 새 Shape 추가 가능
class UserShape : public Shape { /* ... */ };
```

variant — 닫힌 집합. 사용자 확장 불가.

가상 함수 + 사용자 정의 Visitor — open. (단, 사용자가 모든 visitor 수정해야 — 한계)

### 3) Stateful visitor

Visitor가 — 복잡한 상태 추적 필요. variant + 람다는 — 람다 캡처로 가능하지만 어색.

```cpp
class CountingVisitor : public ShapeVisitor {
    std::map<std::string, int> counts_;
public:
    void visit(Circle&)   { counts_["circle"]++; }
    // ...
    auto counts() const { return counts_; }
};
```

## C++ AST 예 — 실전

LLVM AST가 — Visitor 패턴 사용:

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

LLVM — 가상 함수와 visitor 혼합. 새 노드 종류 — 거의 안 추가 (언어 문법 고정). 새 패스 — 자주 추가.

## C++ 클래스 hierarchy 시각화 — UML

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

두 hierarchy 결합 — Visitor의 본질.

## 함정 — visit 안에서 다른 visit 호출

```cpp
class ComplexVisitor : public ShapeVisitor {
    void visit(Composite& c) override {
        for (auto& child : c.children) {
            child->accept(*this);     // 재귀 — OK
        }
    }
};
```

재귀 — 트리 구조에 자연. 단, 깊은 재귀는 — stack overflow 위험.

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

람다 — Visitor 클래스 대신. 짧고 명확.

C++23 `std::overload`:

```cpp
double a = std::visit(std::overload{
    [](const Circle& c)   { return M_PI * c.radius * c.radius; },
    [](const Square& s)   { return s.side * s.side; },
    [](const Triangle& t) { return 0.5 * t.base * t.height; }
}, shape);
```

각 타입별 — 명시적 케이스. 누락 시 컴파일러 검출.

## 디자인 결정 — Visitor or 가상 함수

| 시나리오 | 도구 |
| --- | --- |
| 타입 늘어남, 연산 적음 | 가상 함수 |
| 타입 적음, 연산 늘어남 | GoF Visitor 또는 variant |
| 평면적 타입 집합 | `std::variant` + visit |
| 깊은 hierarchy | GoF Visitor |
| Open hierarchy | GoF Visitor |
| Closed type set | `std::variant` + visit |
| 성능 critical | `std::variant` (vtable X) |

대부분 모던 C++ 코드 — **`std::variant` + visit이 우선**.

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

Visitor + Composite — 자연스러운 결합. 트리 순회.

## 실무 가이드 — Visitor 적용 시점

```
연산 추가가 잦은 도메인이다 — Visitor?
├── 타입 set이 작고 평면적 → std::variant + visit ✅
├── 타입 set이 크거나 깊은 hierarchy → GoF Visitor
├── Open hierarchy 필요 → GoF Visitor
├── 성능 critical → std::variant (vtable 회피)
└── 단순 도메인 → 가상 함수도 OK
```

## 실무 가이드 — 체크리스트

GoF Visitor 적용 시:

- [ ] 연산 추가가 — 정말 잦은가? (3+ visitor 예정)
- [ ] 타입 set은 — 비교적 고정?
- [ ] `std::variant`로 대체 가능? (closed set)
- [ ] 보일러플레이트 부담 감수 가능?
- [ ] 가상 함수 비용 ×2 — 성능 OK?
- [ ] Visitor 사이의 일관성 — 새 타입 추가 시 모두 수정?

## 정리

**GoF Visitor** — 닫힌 타입 집합에 새 연산 추가의 표준 패턴.

```
새 연산 추가 → 새 Visitor 클래스, 기존 무수정 ✅ (OCP)
새 타입 추가 → 모든 Visitor 수정      ❌ (OCP 위반)
```

모던 C++:
- **`std::variant` + visit** — 대부분 더 좋음 (가이드라인 17)
- GoF Visitor — 깊은 hierarchy / open hierarchy에만

다음: **가이드라인 17** — std::variant 기반 모던 Visitor.

## 관련 항목

- [가이드라인 15: 타입/연산 추가 디자인](/blog/programming/cpp-software-design/guideline15-design-for-the-addition-of-types-or-operations) — Expression Problem
- [가이드라인 17: std::variant Visitor](/blog/programming/cpp-software-design/guideline17-consider-stdvariant-for-implementing-visitor) — 모던 대안
- [가이드라인 18: Acyclic Visitor 성능](/blog/programming/cpp-software-design/guideline18-beware-the-performance-of-acyclic-visitor) — 변형의 함정
- [GoF Visitor](/blog/programming/gof-design-patterns/item22-visitor) — 1994년 정의
