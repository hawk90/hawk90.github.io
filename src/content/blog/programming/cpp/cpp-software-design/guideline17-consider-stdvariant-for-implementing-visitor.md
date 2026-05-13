---
title: "가이드라인 17: Visitor 구현에 std::variant를 고려하라"
date: 2026-05-14T13:00:00
description: "GoF Visitor의 모던 대안 — std::variant와 std::visit. 보일러플레이트가 없고 값 의미론을 지키며 vtable 비용도 없다."
tags: [C++, Software Design, Visitor, std::variant, Modern C++]
series: "C++ Software Design"
seriesOrder: 17
---

## 왜 이 가이드라인이 중요한가?

가이드라인 16에서 GoF Visitor의 단점을 정리했다.

- 보일러플레이트가 많다(accept, ShapeVisitor 인터페이스).
- 가상 함수 비용이 두 번 든다.
- 양방향 의존이 생긴다.
- visitor의 상태가 thread-unsafe하다.

C++17의 `std::variant`와 `std::visit`이 이 단점들을 거의 모두 해결한다.

- 보일러플레이트가 사라진다(accept가 필요 없다).
- vtable 비용이 없다(tag dispatch).
- 값 의미론을 그대로 가져간다.
- 컴파일 타임 dispatch가 가능하다.

Iglberger의 권장은 분명하다. **GoF Visitor 대신 variant를 우선한다**. 단, 타입 집합이 닫혀 있을 때 그렇다.

## 핵심 내용

- `std::variant` + `std::visit`이 GoF Visitor의 모던 대안이다.
- 장점은 보일러플레이트가 없고 vtable 비용이 없고 값 의미론을 갖추며 type-safe하다는 점이다.
- 한계는 타입 집합이 닫혀 있어야 한다는 점, 깊은 hierarchy에는 어울리지 않는다는 점이다.
- C++23의 `std::overload`로 람다 visitor를 더 깔끔하게 쓸 수 있다.
- 모던 C++에서 Visitor를 쓰는 코드의 대부분이 variant 기반이다.

## 비교 — GoF Visitor와 std::variant

### GoF Visitor

```cpp
class Shape { virtual void accept(ShapeVisitor&) = 0; };
class Circle : public Shape { /* accept, radius */ };
class Square : public Shape { /* accept, side */ };

class ShapeVisitor {
public:
    virtual void visit(Circle&) = 0;
    virtual void visit(Square&) = 0;
};

class AreaVisitor : public ShapeVisitor {
public:
    double result;
    void visit(Circle& c)  override { result = M_PI * c.radius * c.radius; }
    void visit(Square& s)  override { result = s.side * s.side; }
};

// 사용
std::unique_ptr<Shape> shape = std::make_unique<Circle>(...);
AreaVisitor v;
shape->accept(v);
double area = v.result;
```

코드가 길고 형식이 많다.

### std::variant + visit

```cpp
struct Circle { double radius; };
struct Square { double side; };

using Shape = std::variant<Circle, Square>;

// 람다 visitor — 명시적 멤버 함수가 아니고 가상도 아니다
auto area = [](const auto& s) -> double {
    if constexpr (std::is_same_v<decltype(s), const Circle&>)
        return M_PI * s.radius * s.radius;
    else if constexpr (std::is_same_v<decltype(s), const Square&>)
        return s.side * s.side;
};

// 사용
Shape shape = Circle{5.0};
double a = std::visit(area, shape);
```

훨씬 짧다. accept도 Visitor 인터페이스도 모두 사라졌다.

## std::overload — 더 깔끔하게

C++23 표준이거나 다음과 같이 직접 구현해 쓴다.

```cpp
template<class... Ts>
struct overload : Ts... { using Ts::operator()...; };
template<class... Ts>
overload(Ts...) -> overload<Ts...>;     // deduction guide

double area(const Shape& s) {
    return std::visit(overload{
        [](const Circle& c) { return M_PI * c.radius * c.radius; },
        [](const Square& s) { return s.side * s.side; }
    }, s);
}
```

각 타입에 대한 람다가 명시적으로 분리된다. 누락된 케이스를 컴파일러가 잡아 준다.

## 멤버 함수 활용

variant 원소들이 같은 멤버 함수를 가지면 더 단순해진다.

```cpp
struct Circle {
    double radius;
    double area() const { return M_PI * radius * radius; }
    void   draw() const { /* ... */ }
};

struct Square {
    double side;
    double area() const { return side * side; }
    void   draw() const { /* ... */ }
};

using Shape = std::variant<Circle, Square>;

// 연산은 단순한 람다로 끝난다
double area(const Shape& s) {
    return std::visit([](const auto& x) { return x.area(); }, s);
}

void draw(const Shape& s) {
    std::visit([](const auto& x) { x.draw(); }, s);
}
```

각 도형이 `area`와 `draw`를 갖고, variant 사용자는 `visit + generic lambda`로 호출한다.

## 새 연산 추가 — OCP 만족

```cpp
// 새 연산 — BoundingBox
struct Rect { double x, y, w, h; };

Rect bounding_box(const Shape& s) {
    return std::visit(overload{
        [](const Circle& c) { return Rect{-c.radius, -c.radius, 2*c.radius, 2*c.radius}; },
        [](const Square& s) { return Rect{0, 0, s.side, s.side}; }
    }, s);
}

// Shape, Circle, Square는 손대지 않는다 ✅
```

기존 코드를 그대로 두고 새 함수만 더한다.

## 새 타입 추가 — variant 수정

```cpp
struct Triangle { double base, height; };

// variant를 바꾼다
using Shape = std::variant<Circle, Square, Triangle>;

// 기존 visit들이 Triangle을 다루도록 수정한다
double area(const Shape& s) {
    return std::visit(overload{
        [](const Circle& c)   { return M_PI * c.radius * c.radius; },
        [](const Square& s)   { return s.side * s.side; },
        [](const Triangle& t) { return 0.5 * t.base * t.height; }     // 추가
    }, s);
}
```

새 타입을 더할 때는 variant와 모든 visit이 함께 손바뀐다. 타입 추가에 대한 OCP는 깨진다(가이드라인 15).

다만 generic 람다를 쓰면 자동으로 처리되기도 한다.

```cpp
double area(const Shape& s) {
    return std::visit([](const auto& x) { return x.area(); }, s);
    // Triangle도 area()만 가지면 무수정으로 동작한다
}
```

암묵 인터페이스(`area()` 멤버)를 자동으로 충족하는 모양이다.

## std::visit의 메커니즘

```cpp
std::variant<Circle, Square> shape = Circle{...};

// std::visit 내부 동작
// 1. shape의 현재 alternative index를 확인한다 (0 = Circle, 1 = Square)
// 2. index에 해당하는 jump table을 통해 적절한 lambda를 호출한다
// → 컴파일러가 jump table이나 switch로 컴파일한다 (vtable이 아니다)
```

vtable이 없다. tag 기반 dispatch이고, 인라이닝까지 가는 경우가 많다.

## 값 의미론

```cpp
Shape s1 = Circle{5.0};
Shape s2 = s1;            // 복사 — Circle 자체가 복사된다
Shape s3 = std::move(s1); // 이동

s2 = Square{10.0};        // 다른 타입으로 재할당한다 (variant 자체는 같다)
```

variant는 값 객체다. 대부분 구현에서 heap 할당도 일어나지 않는다. 복사와 이동이 자연스럽다.

대조해 보자. GoF Visitor에서는 다음 모양이 나온다.

```cpp
std::unique_ptr<Shape> s1 = std::make_unique<Circle>(5.0);     // heap
std::unique_ptr<Shape> s2 = s1;     // ❌ unique_ptr 복사 불가
// 깊은 복사를 원하면 clone() 메서드가 필요하다 (가이드라인 30)
```

## 컨테이너에 담기

```cpp
std::vector<Shape> shapes;
shapes.push_back(Circle{5.0});
shapes.push_back(Square{10.0});
shapes.push_back(Triangle{3, 4});

for (const auto& s : shapes) {
    std::cout << "Area: " << area(s) << '\n';
}
```

variant는 값 의미론이라 vector에 그대로 담는다. heap 포인터를 거치지 않는다.

## 함정 — 너무 많은 타입

```cpp
using Shape = std::variant<
    Circle, Square, Triangle, Pentagon, Hexagon,
    Octagon, Star, Polygon, Spline, Ellipse,
    // ... 서른 개 ...
>;
```

variant의 크기는 가장 큰 alternative의 크기에 tag 크기를 더한 값이다. alternative가 너무 많으면 부담이 된다.

- 메모리 부피가 커진다.
- 컴파일 시간이 길어진다.
- 가독성이 떨어진다.

10개 미만이 적절하다. 그 이상이면 가상 함수나 type erasure를 고려한다.

## 함정 — recursive variant

```cpp
using Tree = std::variant<Leaf, std::vector<Tree>>;     // ❌ 자기 자신을 포함한다
```

variant는 완전 타입을 요구한다. 재귀는 indirection을 거쳐야 한다.

```cpp
struct Tree;
using TreeChildren = std::vector<std::unique_ptr<Tree>>;
struct Tree {
    std::variant<Leaf, TreeChildren> data;
};
```

`std::recursive_wrapper`(Boost) 같은 도구나 C++23 일부 변형도 선택지다.

## 함정 — 빈 variant (valueless_by_exception)

```cpp
Shape s = Circle{5.0};
try {
    s.emplace<Square>(/* ctor throws */);
} catch (...) {
    // s는 valueless 상태가 된다
    if (s.valueless_by_exception()) {
        // ⚠️ 어떤 alternative도 아니다
    }
}
```

생성자가 throw하면 variant가 invalid 상태가 될 수 있다. 이때 `std::visit`을 호출하면 `std::bad_variant_access`가 던져진다.

대부분의 정상 코드에서는 발생하지 않는다. C++ 표준의 strong guarantee가 가진 한계 정도로 알아 두면 된다.

## 표준 라이브러리에서의 variant

```cpp
// std::optional<T>은 std::variant<T, std::monostate>와 비슷한 사고다
std::optional<int> x = 42;

// 표준 라이브러리 자체가 variant를 활용한다
// std::expected<T, E> (C++23) — variant 기반
```

표준이 variant를 핵심 도구로 받아들였다.

## 모던 변형 — 강타입 wrapper

```cpp
// variant를 직접 노출하면 사용자에게 부담이 된다
using Shape = std::variant<Circle, Square, Triangle>;

// 강타입 wrapper로 감싼다
class Shape {
    std::variant<Circle, Square, Triangle> data_;
public:
    template<typename T>
    Shape(T t) : data_(std::move(t)) {}

    double area() const {
        return std::visit([](const auto& s) { return s.area(); }, data_);
    }

    // ... 다른 연산 ...
};

Shape s = Circle{5.0};
s.area();     // 단순한 인터페이스
```

variant는 구현 디테일로 두고, 외부 인터페이스는 단순한 클래스로 노출한다.

## GoF Visitor가 더 적합한 경우

variant 대신 GoF가 맞는 경우도 있다.

### 1) 사용자 확장이 필요할 때(open hierarchy)

```cpp
// 라이브러리 사용자가 새 도형을 더한다
class UserCustomShape : public Shape { /* ... */ };
```

variant는 닫힌 집합이다. 라이브러리가 사용자 추가를 알 수 없다.

### 2) 깊은 hierarchy

```cpp
class Animal {};
class Mammal : public Animal {};
class Dog : public Mammal {};
class GoldenRetriever : public Dog {};
```

variant는 평면적이다. 다단계 계층에는 어울리지 않는다.

### 3) 복잡한 초기화가 필요한 stateful visitor

GoF Visitor는 인스턴스 변수, 생성자, 의존성 주입을 자유롭게 쓴다.

```cpp
class ComplexVisitor : public ShapeVisitor {
    Database& db_;
    Logger& log_;
    Cache cache_;
public:
    ComplexVisitor(Database& db, Logger& log) : db_(db), log_(log) {}
    // ...
};
```

람다로도 가능하지만 capture가 길어지면 어색해진다.

### 4) 매우 많은 타입 — variant 부적합

위에서 본 그대로다. alternative가 지나치게 많으면 variant가 무거워진다.

## C++ 표준 라이브러리에서의 variant 활용

```cpp
// AST 라이브러리들이 variant를 점점 채택한다
using Expression = std::variant<
    Literal,
    Variable,
    BinaryOp,
    UnaryOp,
    FunctionCall
>;
```

LLVM의 새 코드는 variant를 쓰고 옛 코드는 가상 함수를 쓴다.

## variant와 concepts (C++20)

```cpp
template<typename T>
concept Shape = requires(const T& t) {
    { t.area() } -> std::convertible_to<double>;
    { t.draw() } -> std::same_as<void>;
};

// concept을 만족하는 타입만 variant에 넣는다
using AnyShape = std::variant<Circle, Square, Triangle>;
static_assert(Shape<Circle>);
static_assert(Shape<Square>);
```

concept으로 한층 더 검증을 더한다.

## constexpr variant (C++20)

```cpp
constexpr std::variant<int, double> v = 42;
constexpr int x = std::get<int>(v);     // 컴파일 타임
```

컴파일 타임 variant. 제한적이지만 쓰임새가 있다.

## 메모리 — variant와 가상 함수

```cpp
sizeof(std::variant<Circle, Square>);
// = max(sizeof(Circle), sizeof(Square)) + sizeof(tag) + padding

sizeof(std::unique_ptr<Shape>);
// = sizeof(pointer)     ← 작다
// + 별도 heap 할당이 따라온다 (Circle 또는 Square)
```

variant는 값 객체라 크기가 크다. 가상 함수와 포인터는 포인터 자체는 작지만 heap 할당이 따라온다.

cache 친화성은 variant가 우세하다. vector에 직접 담아 연속 메모리에 둘 수 있다.

## 함정 — std::visit의 반환 타입

```cpp
auto result = std::visit(overload{
    [](const Circle& c) { return c.area(); },           // double
    [](const Square& s) { return std::string{...}; }    // string
}, shape);     // ⚠️ 컴파일 에러 — 람다들의 반환 타입이 다르다
```

`std::visit`은 모든 alternative의 반환 타입이 같아야 한다. 컴파일러가 검사한다.

해법은 공통 타입으로 묶는 것이다.

```cpp
std::variant<double, std::string> result = std::visit(overload{...}, shape);
```

## 함정 — 지나치게 generic한 람다

```cpp
double area(const Shape& s) {
    return std::visit([](const auto& x) {
        return x.area();     // x에 area()가 없으면 컴파일 에러
    }, s);
}
```

generic 람다는 편하지만 모든 alternative가 같은 인터페이스를 가져야 한다. 일부만 가지면 컴파일이 안 된다.

명시적 케이스가 더 안전하다.

```cpp
double area(const Shape& s) {
    return std::visit(overload{
        [](const Circle& c) { return c.area(); },
        [](const Square& s) { return s.area(); },
        // Triangle이 추가되면 컴파일러가 강제로 여기에도 케이스를 요구한다
    }, s);
}
```

## 성능 비교

```
GoF Visitor
  shape->accept(v):
    1. accept를 위한 vtable lookup    (간접 호출 1번)
    2. v.visit(*this) — visit의 vtable (간접 호출 1번)
    3. 가상 호출 비용

std::visit
  std::visit(f, variant):
    1. tag 확인 (booleansy 비교)
    2. switch 혹은 jump table         (간접 호출 1번 또는 없음)
    3. 람다 호출 — 인라이닝이 자주 일어난다
```

variant 쪽이 종종 더 빠르다. 인라이닝이 가능하고 vtable 비용이 없다.

## 마이그레이션 — GoF에서 variant로

```cpp
// 옛 코드
class Shape { virtual void accept(ShapeVisitor&) = 0; };
class Circle : public Shape { /* ... */ };

// 마이그레이션 단계
// 1. 데이터만 추출한다
struct Circle { double radius; };
struct Square { double side; };

// 2. variant를 정의한다
using Shape = std::variant<Circle, Square>;

// 3. 연산을 비-멤버 함수로 옮긴다
double area(const Shape& s) { /* visit */ }
```

단계적 마이그레이션이 가능하다. 일부 모듈만 먼저 옮겨 봐도 된다.

## 결정 트리 — Visitor를 어떻게 구현할까

```
Visitor 패턴이 필요하다 — 어떻게 구현할까?
├── 타입 집합이 작고(10 미만), 평면적이며 닫혀 있다 → std::variant ✅
├── 타입 집합이 크거나 hierarchy가 깊다 → GoF Visitor
├── 사용자 확장이 필요하다 (plugin) → GoF Visitor
├── Stateful visitor + 복잡한 의존이 있다 → GoF Visitor
└── 성능이 critical하다 → std::variant (인라이닝)
```

## 실무 가이드 — 체크리스트

variant를 적용할 때 다음을 점검한다.

- [ ] 타입 집합이 닫혀 있는가? (사용자가 추가할 일이 없는가)
- [ ] 타입 수가 10 미만인가?
- [ ] 평면적인가? (깊은 hierarchy가 아닌가)
- [ ] 값 의미론을 의도하는가?
- [ ] 컨테이너에 담아야 하는가? → variant가 자연스럽다.
- [ ] 새 연산 추가가 잦은가? → variant가 적합하다.
- [ ] generic 람다와 명시적 overload 중 어느 쪽이 맞는가?

## 정리

`std::variant` + `std::visit`는 GoF Visitor의 모던 대안이다.

이점은 다음과 같다.

- 보일러플레이트가 없다.
- vtable 비용이 없다.
- 값 의미론을 그대로 가져간다.
- type-safe하다(컴파일러가 케이스를 검출한다).
- cache 친화적이다.

한계는 다음과 같다.

- 타입 집합이 닫혀 있어야 한다(사용자 확장 불가).
- 깊은 hierarchy에는 어울리지 않는다.
- 타입이 지나치게 많으면(10+) 부담이 된다.

모던 C++에서는 variant를 우선한다. GoF Visitor는 특수한 경우에 꺼낸다.

## 관련 항목

- [가이드라인 15: 타입/연산 추가 디자인](/blog/programming/cpp/cpp-software-design/guideline15-design-for-the-addition-of-types-or-operations) — Expression Problem
- [가이드라인 16: GoF Visitor](/blog/programming/cpp/cpp-software-design/guideline16-use-visitor-to-extend-operations) — 전통 패턴
- [가이드라인 18: Acyclic Visitor의 성능](/blog/programming/cpp/cpp-software-design/guideline18-beware-the-performance-of-acyclic-visitor) — variant가 더 빠른 이유
- [가이드라인 22: 값 의미론](/blog/programming/cpp/cpp-software-design/guideline22-prefer-value-semantics-over-reference-semantics) — variant의 본질
