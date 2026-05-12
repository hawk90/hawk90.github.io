---
title: "가이드라인 17: Visitor 구현에 std::variant 고려하라"
date: 2026-05-14T13:00:00
description: "GoF Visitor의 모던 대안 — std::variant + std::visit. 보일러플레이트 X, value semantics, vtable 비용 X."
tags: [C++, Software Design, Visitor, std::variant, Modern C++]
series: "C++ Software Design"
seriesOrder: 17
---

## 왜 이 가이드라인이 중요한가?

가이드라인 16 — GoF Visitor의 단점 정리:
- 보일러플레이트 (accept, ShapeVisitor 인터페이스)
- 가상 함수 비용 ×2
- 양방향 의존
- thread-unsafe state

C++17 `std::variant` + `std::visit` — **거의 모든 단점 해결**:
- 보일러플레이트 X (accept 불필요)
- vtable 비용 X (tag dispatch)
- value semantics
- 컴파일 타임 dispatch 가능

Iglberger의 강력한 권장: **GoF Visitor 대신 variant**. 단, **closed type set**일 때.

## 핵심 내용

- `std::variant` + `std::visit` — GoF Visitor의 모던 대안
- **장점**: 보일러플레이트 X, vtable 비용 X, value semantics, type-safe
- **한계**: closed type set (사용자 확장 X), 깊은 hierarchy 부적합
- C++23 `std::overload` — 람다 visitor 더 깔끔
- 거의 모든 모던 C++ Visitor 코드는 — variant 기반

## 비교 — GoF Visitor vs std::variant

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

코드 — 길고 의식 많음.

### std::variant + visit

```cpp
struct Circle { double radius; };
struct Square { double side; };

using Shape = std::variant<Circle, Square>;

// 람다 visitor — 명시적 멤버 함수, 가상 X
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

훨씬 짧음. accept / Visitor 인터페이스 — 모두 제거.

## std::overload — 더 깔끔

C++23 표준 (또는 직접 구현):

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

각 타입별 — 명시적 람다. 누락 시 — 컴파일 에러.

## 멤버 함수 활용

variant 원소가 — 멤버 함수 가지면:

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

// 연산 = 단순 람다
double area(const Shape& s) {
    return std::visit([](const auto& x) { return x.area(); }, s);
}

void draw(const Shape& s) {
    std::visit([](const auto& x) { x.draw(); }, s);
}
```

각 도형이 — area, draw 메서드. variant 사용자는 — `visit + generic lambda`로 호출.

## 새 연산 추가 — OCP 만족

```cpp
// 새 연산: BoundingBox
struct Rect { double x, y, w, h; };

Rect bounding_box(const Shape& s) {
    return std::visit(overload{
        [](const Circle& c) { return Rect{-c.radius, -c.radius, 2*c.radius, 2*c.radius}; },
        [](const Square& s) { return Rect{0, 0, s.side, s.side}; }
    }, s);
}

// Shape, Circle, Square — 무수정 ✅
```

기존 코드 무수정 — 새 함수만 추가.

## 새 타입 추가 — variant 수정

```cpp
struct Triangle { double base, height; };

// variant 변경
using Shape = std::variant<Circle, Square, Triangle>;

// 기존 visit들 — Triangle 처리 추가:
double area(const Shape& s) {
    return std::visit(overload{
        [](const Circle& c)   { return M_PI * c.radius * c.radius; },
        [](const Square& s)   { return s.side * s.side; },
        [](const Triangle& t) { return 0.5 * t.base * t.height; }     // 추가
    }, s);
}
```

새 타입 추가는 — variant + 모든 visit 수정. **OCP 위반 for types** (가이드라인 15).

그러나 — **generic 람다 사용 시 자동 처리**:

```cpp
double area(const Shape& s) {
    return std::visit([](const auto& x) { return x.area(); }, s);
    // Triangle도 area() 가지면 — 무수정!
}
```

암묵 인터페이스 (`area()` 멤버) — 자동 충족.

## std::visit 메커니즘

```cpp
std::variant<Circle, Square> shape = Circle{...};

// std::visit 내부:
// 1. shape의 현재 alternative index 확인 (0 = Circle, 1 = Square)
// 2. index에 해당하는 jump table 통해 적절한 lambda 호출
// → 컴파일러가 jump table 또는 switch로 컴파일 (vtable 아님)
```

**Vtable이 없음** — tag-based dispatch. 종종 인라이닝까지.

## value semantics

```cpp
Shape s1 = Circle{5.0};
Shape s2 = s1;          // 복사 — Circle 복사
Shape s3 = std::move(s1);  // 이동

s2 = Square{10.0};      // 다른 타입으로 재할당 가능 (variant 자체는 같음)
```

variant — value 객체. heap 할당 X (대부분 구현). copy / move 자연.

대조 — GoF Visitor:

```cpp
std::unique_ptr<Shape> s1 = std::make_unique<Circle>(5.0);     // heap
std::unique_ptr<Shape> s2 = s1;     // ❌ unique_ptr 복사 불가
// 깊은 복사: clone() 메서드 필요 (가이드라인 30)
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

variant — value semantics이므로 vector에 직접. heap 포인터 X.

## 함정 — 너무 많은 타입

```cpp
using Shape = std::variant<
    Circle, Square, Triangle, Pentagon, Hexagon,
    Octagon, Star, Polygon, Spline, Ellipse,
    // ... 30개 ...
>;
```

variant 크기 — 가장 큰 alternative 크기 + tag. 너무 많으면:
- 메모리 부피 ↑
- 컴파일 시간 ↑
- 가독성 ↓

**~ 10개 미만**이 적절. 그 이상이면 — 가상 함수 또는 type erasure.

## 함정 — recursive variant

```cpp
using Tree = std::variant<Leaf, std::vector<Tree>>;     // ❌ 자기 자신 포함
```

variant — 완전 타입 필요. 재귀는 — indirection 필요:

```cpp
struct Tree;
using TreeChildren = std::vector<std::unique_ptr<Tree>>;
struct Tree {
    std::variant<Leaf, TreeChildren> data;
};
```

또는 — `std::recursive_wrapper` (Boost) / C++23 `std::variant` 직접 지원 일부.

## 함정 — 빈 variant (valueless_by_exception)

```cpp
Shape s = Circle{5.0};
try {
    s.emplace<Square>(/* ctor throws */);
} catch (...) {
    // s는 — valueless 상태
    if (s.valueless_by_exception()) {
        // ⚠️ 어떤 alternative도 아님
    }
}
```

생성자가 throw → variant — invalid state. `std::visit` 호출하면 — `std::bad_variant_access`.

대부분 — 정상 코드에서 발생 안 함. C++ 표준의 strong guarantee 한계.

## 표준 라이브러리의 variant 사용

```cpp
// std::optional<T> = std::variant<T, std::monostate> 비슷
std::optional<int> x = 42;

// 표준 라이브러리 자체가 variant 활용
// std::expected<T, E> (C++23) — variant 기반
```

표준이 — variant를 핵심 도구로.

## 모던 변형 — 강타입 wrappers

```cpp
// variant 직접 노출은 — 사용자 부담
using Shape = std::variant<Circle, Square, Triangle>;

// 강타입 wrapper
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
s.area();     // 단순 인터페이스
```

variant — 구현 디테일. 외부 인터페이스 — 단순 클래스.

## GoF Visitor가 더 적합한 경우

variant 대신 GoF가 좋은 경우:

### 1) 사용자 확장 (open hierarchy)

```cpp
// 라이브러리 사용자가 새 도형 추가
class UserCustomShape : public Shape { /* ... */ };
```

variant — closed set. 라이브러리가 — 사용자 추가 알 수 없음.

### 2) 깊은 hierarchy

```cpp
class Animal {};
class Mammal : public Animal {};
class Dog : public Mammal {};
class GoldenRetriever : public Dog {};
```

variant — 평면적. 다단계 계층 부적합.

### 3) Stateful visitor with complex initialization

GoF Visitor — 인스턴스 변수, 생성자, 의존성 주입 등.

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

람다로도 가능하지만 — capture가 많아짐.

### 4) 매우 많은 타입 (variant 부적합)

위에서 본 — variant alternative 너무 많음.

## C++ 표준 라이브러리에서 variant 활용

```cpp
// AST 라이브러리들 — variant 점점 채택
using Expression = std::variant<
    Literal,
    Variable,
    BinaryOp,
    UnaryOp,
    FunctionCall
>;
```

LLVM의 새 코드 — variant 사용. 옛 코드는 — 가상 함수.

## variant + concepts (C++20)

```cpp
template<typename T>
concept Shape = requires(const T& t) {
    { t.area() } -> std::convertible_to<double>;
    { t.draw() } -> std::same_as<void>;
};

// concept을 만족하는 타입만 variant에
using AnyShape = std::variant<Circle, Square, Triangle>;
static_assert(Shape<Circle>);
static_assert(Shape<Square>);
```

concept으로 — 추가 검증.

## constexpr variant (C++20)

```cpp
constexpr std::variant<int, double> v = 42;
constexpr int x = std::get<int>(v);     // 컴파일 타임
```

컴파일 타임 variant — limited but useful.

## 메모리 — variant vs 가상 함수

```cpp
sizeof(std::variant<Circle, Square>);
// = max(sizeof(Circle), sizeof(Square)) + sizeof(tag) + padding

sizeof(std::unique_ptr<Shape>);
// = sizeof(pointer)     ← 작음
// + 별도 heap 할당 (Circle 또는 Square)
```

variant — value, larger object. 가상 함수 + ptr — 작은 포인터 + heap.

**Cache friendliness** — variant 우세 (연속 메모리 vector에 직접).

## 함정 — std::visit의 반환 타입

```cpp
auto result = std::visit(overload{
    [](const Circle& c) { return c.area(); },           // double
    [](const Square& s) { return std::string{...}; }    // string
}, shape);     // ⚠️ 컴파일 에러 — 람다들 반환 타입 다름
```

`std::visit`은 — 모든 alternative의 반환 타입이 같아야. 컴파일러가 검사.

해결: 공통 타입으로:

```cpp
std::variant<double, std::string> result = std::visit(overload{...}, shape);
```

## 모던 함정 — too generic lambda

```cpp
double area(const Shape& s) {
    return std::visit([](const auto& x) {
        return x.area();     // x가 area() 없으면 컴파일 에러
    }, s);
}
```

generic 람다 — 편하지만 — 모든 alternative가 같은 인터페이스 가져야. 일부만 가지면 컴파일 에러.

명시적 케이스 — 더 안전:

```cpp
double area(const Shape& s) {
    return std::visit(overload{
        [](const Circle& c) { return c.area(); },
        [](const Square& s) { return s.area(); },
        // Triangle 추가 시 — 여기 추가 (컴파일러 강제)
    }, s);
}
```

## 성능 비교

```
GoF Visitor:
  shape->accept(v):
    1. vtable lookup for accept     (1 indirection)
    2. v.visit(*this) — vtable for visit  (1 indirection)
    3. virtual call cost
  
std::visit:
  std::visit(f, variant):
    1. tag check (boolean test)
    2. switch 또는 jump table     (1 indirection 또는 없음)
    3. lambda call — 종종 인라이닝
```

variant — **종종 더 빠름**. 인라이닝 가능, vtable 비용 X.

## 마이그레이션 — GoF → variant

```cpp
// 옛 코드
class Shape { virtual void accept(ShapeVisitor&) = 0; };
class Circle : public Shape { /* ... */ };

// 마이그레이션 단계
// 1. 데이터만 추출
struct Circle { double radius; };
struct Square { double side; };

// 2. variant 정의
using Shape = std::variant<Circle, Square>;

// 3. 연산 — 비-멤버 함수로
double area(const Shape& s) { /* visit */ }
```

단계적 마이그레이션 가능. 일부 모듈만 먼저.

## 결정 트리 — Visitor 구현 방법

```
Visitor 패턴 필요 — 어떻게 구현?
├── 타입 set 작고 (< 10), 평면적, closed → std::variant ✅
├── 타입 set 큼, 또는 깊은 hierarchy → GoF Visitor
├── 사용자 확장 필요 (plugin) → GoF Visitor
├── Stateful visitor + 복잡한 의존 → GoF Visitor
└── 성능 critical → std::variant (인라이닝)
```

## 실무 가이드 — 체크리스트

variant 적용 시:

- [ ] 타입 set이 — closed (사용자 추가 없음)?
- [ ] 타입 수 — 10 미만?
- [ ] 평면적 (깊은 hierarchy X)?
- [ ] value semantics 의도?
- [ ] 컨테이너에 담아야 하는가? → variant 자연
- [ ] 새 연산 추가가 잦은가? → variant 적합
- [ ] generic 람다 vs 명시적 overload?

## 정리

**`std::variant` + `std::visit`** — GoF Visitor의 모던 대안.

이점:
- ✅ 보일러플레이트 X
- ✅ vtable 비용 X
- ✅ Value semantics
- ✅ Type-safe (컴파일러 케이스 검출)
- ✅ Cache-friendly

한계:
- ❌ Closed type set (사용자 확장 X)
- ❌ 깊은 hierarchy 부적합
- ❌ 너무 많은 타입 (~10+) 부적합

**대부분 모던 C++ — variant 우선**. GoF Visitor는 — 특수 케이스만.

## 관련 항목

- [가이드라인 15: 타입/연산 추가](/blog/programming/cpp-software-design/guideline15-design-for-the-addition-of-types-or-operations) — Expression Problem
- [가이드라인 16: GoF Visitor](/blog/programming/cpp-software-design/guideline16-use-visitor-to-extend-operations) — 전통 패턴
- [가이드라인 18: Acyclic Visitor 성능](/blog/programming/cpp-software-design/guideline18-beware-the-performance-of-acyclic-visitor) — variant가 더 빠른 이유
- [가이드라인 22: value semantics](/blog/programming/cpp-software-design/guideline22-prefer-value-semantics-over-reference-semantics) — variant 본질
