---
title: "가이드라인 5: 확장을 위한 디자인"
date: 2026-05-13T15:00:00
description: "Open-Closed Principle — 새 기능 추가가 기존 코드 수정 없이. 다형성, 템플릿, std::variant로 OCP."
tags: [C++, Software Design, SOLID, OCP, Open-Closed]
series: "C++ Software Design"
seriesOrder: 5
---

## 왜 이 가이드라인이 중요한가?

가이드라인 2(변화를 위한 디자인)가 — "**변화의 축을 분리**"였다면, 이번은 그 분리를 위한 **구체적 원칙** — Open-Closed Principle.

> "**Software entities should be open for extension, but closed for modification.**" — Bertrand Meyer, 1988

좋은 디자인은 — **새 기능 추가가 기존 코드 수정 없이** 가능. 새 결제 수단 추가 → 새 클래스 1개, 기존 0줄 수정. 새 출력 형식 → 새 클래스 1개, 기존 0줄.

반대로 — **기존 코드 수정 없이 확장 불가**한 디자인은 OCP 위반:

```cpp
double calculate_discount(Order& o, DiscountType t) {
    if (t == DiscountType::Senior)  return 0.1;
    if (t == DiscountType::Student) return 0.15;
    if (t == DiscountType::Bulk)    return 0.2;
    // 새 할인 추가 → 이 함수 수정 + enum 수정
}
```

확장하려면 — **기존 코드를 수정해야 함**. 위험. OCP의 도구는:

1. **다형성** (virtual functions)
2. **템플릿 / concepts**
3. **`std::variant` + visit**
4. **plugin / strategy pattern**

이 가이드라인이 — Part II의 모든 디자인 패턴의 토대.

## 핵심 내용

- **Open-Closed Principle (OCP)** — 확장에는 열려 있고, 수정에는 닫혀 있다
- 새 기능 추가가 — **기존 코드 수정 없이** 가능해야
- **`if`/`switch` 체인**은 OCP 위반의 흔한 형태
- 도구: **다형성, 템플릿/concepts, `std::variant`, plugin**
- "**확장의 축**"이 — **타입**인가 **연산**인가에 따라 도구 선택

## 비교 — OCP 위반 vs 만족

### Bad: 새 타입 추가 시 기존 코드 수정

```cpp
enum class ShapeType { Circle, Square, Triangle };

struct Shape {
    ShapeType type;
    double param1, param2;
};

double area(const Shape& s) {
    switch (s.type) {
        case ShapeType::Circle:   return M_PI * s.param1 * s.param1;
        case ShapeType::Square:   return s.param1 * s.param1;
        case ShapeType::Triangle: return 0.5 * s.param1 * s.param2;
    }
}

void draw(const Shape& s) {
    switch (s.type) {
        case ShapeType::Circle:   /* ... */; break;
        case ShapeType::Square:   /* ... */; break;
        case ShapeType::Triangle: /* ... */; break;
    }
}

// 새 도형 Pentagon 추가:
//   1. enum에 Pentagon 추가
//   2. area() switch에 case 추가
//   3. draw() switch에 case 추가
//   4. ... 다른 모든 함수도
//   → 기존 코드 수정 — OCP 위반
```

### Good: 다형성으로 확장 가능

```cpp
class Shape {
public:
    virtual ~Shape() = default;
    virtual double area() const = 0;
    virtual void draw() const = 0;
};

class Circle : public Shape {
    double radius_;
public:
    explicit Circle(double r) : radius_(r) {}
    double area() const override { return M_PI * radius_ * radius_; }
    void draw() const override { /* ... */ }
};

class Square   : public Shape { /* ... */ };
class Triangle : public Shape { /* ... */ };

// 새 도형 Pentagon:
class Pentagon : public Shape {
public:
    double area() const override { /* ... */ }
    void draw() const override { /* ... */ }
};
// 기존 코드는 0줄 수정 — OCP 만족
```

## 확장의 두 축 — 타입 vs 연산

가장 중요한 결정:

```
              새 타입 추가가 잦은가?       새 연산 추가가 잦은가?
              ──────────────────         ──────────────────
가상 함수    │ 좋음                     │ ⚠️ 모든 derived 수정
(상속)      │  (새 derived만 추가)     │
─────────  ┼─────────────────────────  ┼─────────────────────────
std::variant │ ⚠️ variant + 모든 visit │ 좋음
+ visit     │  수정                    │  (새 visit 함수만 추가)
```

이게 — Iglberger 책의 **가장 핵심적 통찰** 중 하나. 가이드라인 15-18(Visitor 패턴)에서 더 깊이.

### 시나리오 A — 새 타입이 자주 추가

도형 종류가 — 자주 늘어남(Circle, Square, Triangle, Pentagon, Hexagon, ...). 연산은 — `area()`, `draw()` 정도로 고정.

→ **가상 함수**(상속). 새 도형 = 새 derived 클래스, 기존 코드 무수정.

### 시나리오 B — 새 연산이 자주 추가

도형 종류는 — 정해짐(Circle, Square, Triangle). 연산은 — `area()`, `draw()`, `serialize()`, `bounding_box()`, `is_convex()`, ...

→ **`std::variant` + visit**. 새 연산 = 새 visit 함수, 기존 도형 클래스 무수정.

```cpp
using Shape = std::variant<Circle, Square, Triangle>;

// 새 연산 추가
double perimeter(const Shape& s) {
    return std::visit([](const auto& shape) { return shape.perimeter(); }, s);
}

// 새 연산 추가 — 기존 코드 무수정
double bounding_box_area(const Shape& s) { /* ... */ }
```

## OCP 위반의 시그널

코드에서 자주 보는 — OCP 위반 패턴:

### 1) `if`/`switch` 체인 on type

```cpp
if (type == "A") doA();
else if (type == "B") doB();
else if (type == "C") doC();
```

새 타입 추가 → 새 `else if`. 같은 패턴이 여러 함수에 반복되면 — OCP 위반.

해결: 다형성 또는 strategy.

### 2) Type tag + switch

```cpp
struct Event {
    enum Type { Click, KeyPress, MouseMove } type;
    union { ClickData c; KeyData k; MouseData m; };
};

void handle(const Event& e) {
    switch (e.type) {
        case Event::Click: /* ... */; break;
        // ...
    }
}
```

해결: `std::variant`.

```cpp
using Event = std::variant<ClickEvent, KeyEvent, MouseEvent>;

void handle(const Event& e) {
    std::visit([](const auto& specific) { specific.process(); }, e);
}
```

### 3) Enum + switch에 default 없음

```cpp
enum class State { Idle, Running, Stopped };

void process(State s) {
    switch (s) {
        case State::Idle:    /* ... */; break;
        case State::Running: /* ... */; break;
        case State::Stopped: /* ... */; break;
        // default 없음 — 새 상태 추가 시 컴파일러가 잡음 (-Wswitch)
    }
}
```

이건 — **의도된 패턴**일 수 있음. 새 상태 추가 시 모든 switch가 컴파일 에러 → 빠뜨림 없이 처리. C++26 reflection이 더 깔끔하게.

### 4) 매개변수에 type discriminator

```cpp
void render(Shape s, const std::string& format);
// format = "html" 또는 "json" 또는 ...
```

format 추가 → 함수 내부 분기 추가. 다형성 또는 visitor로.

## 도구 1 — 가상 함수 (전통)

```cpp
class Renderer {
public:
    virtual ~Renderer() = default;
    virtual std::string render(const Shape&) = 0;
};

class HtmlRenderer : public Renderer { /* ... */ };
class JsonRenderer : public Renderer { /* ... */ };

// 새 renderer 추가 — 클래스만 추가
class MarkdownRenderer : public Renderer { /* ... */ };
```

장점:
- 익숙한 OOP 패턴
- 런타임 다형성 (컨테이너에 다양한 타입 담기 가능)

단점:
- vtable 비용
- 인라이닝 불가
- 다중 상속 / virtual 상속의 복잡성

### 가상 함수의 OCP 위반 — Open hierarchy

```cpp
// 사용자가 Shape을 상속해 새 도형 만듦
// 사용자 코드에서 area_squared() 같은 새 연산 추가:
double area_squared(const Shape& s) {
    double a = s.area();      // OK — 가상 함수
    return a * a;
}
```

새 연산 추가 OK — 비-멤버 함수로. 그러나 — 새 연산이 **상태 접근**을 요구하면?

```cpp
double weighted_area(const Shape& s, const std::vector<double>& weights) {
    // 도형 종류별로 다른 가중 계산 필요?
    // Circle은 reset_weight, Square는 다른 방식 → 가상 함수 필요
    // → Shape 인터페이스에 새 메서드 추가 → 모든 derived 수정
}
```

**연산 추가가 잦은 도메인**에선 — 가상 함수가 OCP 한계.

## 도구 2 — `std::variant` + visit

```cpp
class Circle   { /* ... */ };
class Square   { /* ... */ };
class Triangle { /* ... */ };

using Shape = std::variant<Circle, Square, Triangle>;

// 연산 = 비-멤버 함수
double area(const Shape& s) {
    return std::visit([](const auto& x) {
        if constexpr (std::is_same_v<decltype(x), const Circle&>)
            return M_PI * x.radius * x.radius;
        else if constexpr (std::is_same_v<decltype(x), const Square&>)
            return x.side * x.side;
        // ...
    }, s);
}

// 또는 각 타입이 area() 멤버 가지면
double area(const Shape& s) {
    return std::visit([](const auto& x) { return x.area(); }, s);
}
```

장점:
- **새 연산 추가 = 비-멤버 함수 추가** — 기존 코드 무수정
- vtable 비용 X — variant는 tag dispatch
- 컴파일러가 — 모든 케이스 다뤘는지 검증
- value semantics

단점:
- **새 타입 추가 = variant 수정** — 사용자 코드까지 변경
- **닫힌 계층** — 사용자가 새 타입 못 추가

→ 도메인이 **타입은 정해짐, 연산이 잦음**일 때 좋음.

## 도구 3 — 템플릿 / concepts (C++20)

```cpp
template<typename T>
concept Shape = requires(const T& t) {
    { t.area() } -> std::convertible_to<double>;
    { t.draw() } -> std::same_as<void>;
};

template<Shape T>
void render(const T& shape) {
    shape.draw();
}

class Circle   { /* area(), draw() */ };
class Square   { /* area(), draw() */ };
// Circle, Square 자동으로 Shape concept 충족 — 상속 선언 없음
```

장점:
- vtable 비용 0 — 컴파일 타임 다형성
- **상속 선언 불필요** — 인터페이스 자동 충족 (duck typing)
- 인라이닝 / 강력한 최적화

단점:
- **런타임 다형성 X** — 컨테이너에 다른 타입 못 담음
- 코드 부피 (인스턴스마다)
- 디버깅 / 에러 메시지 (C++20 concepts로 개선)

→ **컴파일 타임에 타입 결정**되고 **성능 critical**일 때.

## 도구 4 — Strategy / Plugin

```cpp
class Compressor {
public:
    virtual ~Compressor() = default;
    virtual std::vector<std::byte> compress(std::span<const std::byte>) = 0;
};

class GzipCompressor : public Compressor { /* ... */ };
class ZstdCompressor : public Compressor { /* ... */ };

class FileWriter {
    std::unique_ptr<Compressor> compressor_;
public:
    explicit FileWriter(std::unique_ptr<Compressor> c)
        : compressor_(std::move(c)) {}
    void write(std::span<const std::byte> data);
};

// 새 압축 알고리즘 추가
class LzmaCompressor : public Compressor { /* ... */ };

FileWriter w{std::make_unique<LzmaCompressor>()};
// FileWriter 코드 무수정
```

런타임에 알고리즘 교체. Plugin 시스템의 기반.

## 두 종류의 변화 — 어디가 OCP가 깨지나

```
가상 함수 (Open hierarchy):
  + 새 타입 추가 → 기존 코드 무수정 ✅
  - 새 연산 추가 → 인터페이스 + 모든 derived 수정 ❌

std::variant (Closed set):
  + 새 연산 추가 → 새 함수만 ✅
  - 새 타입 추가 → variant + 모든 visit 수정 ❌

  → "Expression problem" — 한 차원만 닫혀 있음
```

**Expression problem**은 — 두 차원(타입, 연산) 모두 OCP 만족하는 게 어렵다는 정설. 한 차원 선택해야 함.

해결책들 (복잡):
- **External Polymorphism** (가이드라인 31) — vtable을 외부에
- **Type Erasure** (가이드라인 32-34) — concept-based 다형성

복잡한 해결책 — 도메인에 따라 선택.

## OCP의 함정 — Over-Engineering

```cpp
// 단순 카운터에 OCP 적용?
class ICounter {
    virtual void increment() = 0;
};
class CounterFactory { /* ... */ };
class CounterStrategy { /* ... */ };
```

가이드라인 1, 2의 함정 — **YAGNI**. 정말 **변화가 예상되는 축**에만 OCP. 모든 곳에 적용하면 — 복잡도 폭발.

원칙:
- **현재 알려진 변화의 축**만 OCP
- **3번 반복**되면 그제야 추상화
- 지금 단순한 게 — 미래의 자유

## C++20 `<=>` (spaceship) — OCP 친화

```cpp
class Point {
    int x, y;
public:
    auto operator<=>(const Point&) const = default;     // < <= > >= == != 자동
};
```

새 비교 연산자 — `<=>` 한 줄로 모두. OCP 친화 (연산 자동 추가).

## CRTP (Curiously Recurring Template Pattern) — 가이드라인 26-27

```cpp
template<typename Derived>
class Shape {
public:
    void draw() {
        static_cast<Derived*>(this)->doDraw();    // 컴파일 타임 호출
    }
};

class Circle : public Shape<Circle> {
public:
    void doDraw();
};
```

상속 문법 + 컴파일 타임 다형성. vtable 비용 0. mixin 패턴.

자세한 건 — 가이드라인 26-27.

## 함정 — 잘못된 추상화 수준

```cpp
class Animal {
public:
    virtual void breathe() = 0;
    virtual void eat() = 0;
    virtual void reproduce() = 0;
};

class Fish : public Animal {
    void breathe() override;     // 아가미
    void eat() override;
    void reproduce() override;
};

class Plant : public Animal {     // ⚠️ 식물이 동물?
    void breathe() override;     // 광합성
    // reproduce — 영양생식? 종자?
};
```

추상화가 너무 일반 — 도메인 의미 약함. 더 narrow한 인터페이스:

```cpp
class Breathable { virtual void breathe() = 0; };
class Eater      { virtual void eat() = 0; };

class Fish : public Breathable, public Eater { /* ... */ };
class Plant : public Breathable { /* eat은 다른 의미 */ };
```

## 실무 가이드 — 결정 트리

```
새 기능 추가가 자주 일어날 예정인가?
├── 새 타입 (Shape 종류) 추가 잦음 → 가상 함수 (or CRTP)
├── 새 연산 (Shape에 대한 작업) 추가 잦음 → std::variant + visit
├── 양쪽 다 자주 → External Polymorphism (가이드라인 31) / Type Erasure (32-34)
├── 컴파일 타임 결정 + 성능 critical → 템플릿 + concepts
├── 런타임 교체 → Strategy 패턴
└── 변화 예측 어려움 → 단순하게 시작, 변화 오면 refactor
```

## 실무 가이드 — 체크리스트

새 코드 작성 시:

- [ ] `if`/`switch` 체인이 — 새 타입/case 추가 시 수정 필요한가?
- [ ] 그렇다면 — 다형성 또는 variant로 대체 가능?
- [ ] **확장의 축**이 명확한가? (타입 vs 연산)
- [ ] 도구 선택이 그 축에 맞는가?
- [ ] 과도한 OCP 적용으로 — 단순한 일이 복잡해졌나? (YAGNI)
- [ ] 새 derived 추가 — 인터페이스 변경 없이 가능?

## 정리

**Open-Closed Principle** — 확장에 열려 있고, 수정에 닫혀 있다.

**Expression Problem**:
- 새 타입 잦음 → **가상 함수**
- 새 연산 잦음 → **`std::variant` + visit**
- 양쪽 다 → External Polymorphism / Type Erasure

원칙:
1. **확장의 축 식별** — 타입 vs 연산
2. 적절한 도구 선택
3. **YAGNI** — 모든 곳에 OCP 적용 X
4. `if`/`switch` on type = 신호

## 관련 항목

- [가이드라인 2: 변화를 위한 디자인](/blog/programming/cpp-software-design/guideline02-design-for-change) — 확장의 토대
- [가이드라인 4: 테스트 가능성](/blog/programming/cpp-software-design/guideline04-design-for-testability) — OCP의 자매
- [가이드라인 15: 타입/연산 추가 디자인](/blog/programming/cpp-software-design/guideline15-design-for-the-addition-of-types-or-operations) — 본격적 Visitor 도입
- [GoF Strategy](/blog/programming/gof-design-patterns/item19-strategy) — 알고리즘 교체
- [Effective C++ 항목 35: 가상 함수의 대안](/blog/programming/effective-cpp/item35-consider-alternatives-to-virtual-functions) — 다형성 도구들
