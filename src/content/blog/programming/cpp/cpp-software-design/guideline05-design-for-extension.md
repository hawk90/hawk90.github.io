---
title: "가이드라인 5: 확장을 위한 디자인"
date: 2026-05-02T05:00:00
description: "Open-Closed Principle. 새 기능 추가가 기존 코드 수정 없이 끝나도록, 다형성과 템플릿과 std::variant로."
tags: [C++, Software Design, SOLID, OCP, Open-Closed]
series: "C++ Software Design"
seriesOrder: 5
draft: true
---

## 왜 이 가이드라인이 중요한가?

가이드라인 2가 "변화의 축을 분리하라"라는 큰 그림이었다면, 이번 가이드라인은 그 분리를 위한 구체적인 원칙인 Open-Closed Principle을 다룬다.

> "**Software entities should be open for extension, but closed for modification.**" — Bertrand Meyer, 1988

좋은 디자인은 **기존 코드를 손대지 않고 새 기능을 추가할 수 있어야** 한다. 새 결제 수단을 더한다면 새 클래스 하나만 추가하고 기존 코드는 0줄을 건드린다. 새 출력 형식도 마찬가지다.

반대로 기존 코드를 손봐야만 확장되는 디자인은 OCP 위반이다.

```cpp
double calculate_discount(Order& o, DiscountType t) {
    if (t == DiscountType::Senior)  return 0.1;
    if (t == DiscountType::Student) return 0.15;
    if (t == DiscountType::Bulk)    return 0.2;
    // 새 할인 추가 → 이 함수와 enum을 동시에 손대야 한다
}
```

확장하려면 기존 코드를 고쳐야 한다. 위험하다. OCP를 만드는 도구는 보통 다음 넷이다.

1. **다형성**(가상 함수)
2. **템플릿과 concepts**
3. **`std::variant` + visit**
4. **plugin / Strategy 패턴**

이 가이드라인이 Part II에 나오는 모든 디자인 패턴의 토대다.

## 핵심 내용

- **Open-Closed Principle(OCP)** — 확장에는 열려 있고, 수정에는 닫혀 있다.
- 새 기능 추가가 기존 코드 수정 없이 가능해야 한다.
- `if` / `switch` 체인이 OCP 위반의 가장 흔한 형태다.
- 도구는 다형성, 템플릿/concepts, `std::variant`, Strategy다.
- 확장의 축이 **타입**인지 **연산**인지에 따라 도구가 갈린다.

## 비교 — OCP 위반과 만족

### Bad — 새 타입을 더할 때 기존 코드를 손댄다

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

// 새 도형 Pentagon을 더하려면
//   1. enum에 Pentagon 추가
//   2. area()의 switch에 case 추가
//   3. draw()의 switch에 case 추가
//   4. ... 다른 모든 함수도 마찬가지로
//   → 기존 코드를 손대야 한다. OCP 위반이다.
```

### Good — 다형성으로 확장한다

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

// 새 도형 Pentagon
class Pentagon : public Shape {
public:
    double area() const override { /* ... */ }
    void draw() const override { /* ... */ }
};
// 기존 코드는 0줄을 손대지 않는다. OCP 만족.
```

## 확장의 두 축 — 타입과 연산

가장 중요한 결정 지점은 다음 표다.

```
              새 타입 추가가 잦은가?       새 연산 추가가 잦은가?
              ──────────────────         ──────────────────
가상 함수    │ 좋다                     │ ⚠️ 모든 derived를 손댄다
(상속)      │  (새 derived만 추가)     │
─────────  ┼─────────────────────────  ┼─────────────────────────
std::variant │ ⚠️ variant와 모든 visit │ 좋다
+ visit     │  를 손댄다               │  (새 visit 함수만 추가)
```

이것이 Iglberger 책의 가장 핵심적인 통찰 중 하나다. 가이드라인 15~18(Visitor)에서 본격적으로 다룬다.

### 시나리오 A — 새 타입이 자주 들어온다

도형 종류가 자주 늘어난다(Circle, Square, Triangle, Pentagon, Hexagon, …). 연산은 `area()`, `draw()` 정도로 고정되어 있다.

이 경우엔 **가상 함수**(상속) 가 맞다. 새 도형이 곧 새 derived 클래스다. 기존 코드는 손대지 않는다.

### 시나리오 B — 새 연산이 자주 들어온다

도형 종류는 정해져 있다(Circle, Square, Triangle). 연산이 자꾸 늘어난다 — `area()`, `draw()`, `serialize()`, `bounding_box()`, `is_convex()`, …

이 경우엔 **`std::variant` + visit**가 맞다. 새 연산이 곧 새 visit 함수다. 기존 도형 클래스는 손대지 않는다.

```cpp
using Shape = std::variant<Circle, Square, Triangle>;

// 새 연산 추가
double perimeter(const Shape& s) {
    return std::visit([](const auto& shape) { return shape.perimeter(); }, s);
}

// 또 다른 새 연산 — 기존 코드는 0줄 수정
double bounding_box_area(const Shape& s) { /* ... */ }
```

## OCP 위반의 신호

코드에서 자주 마주치는 패턴들이다.

### 1) 타입에 대한 `if` / `switch` 체인

```cpp
if (type == "A") doA();
else if (type == "B") doB();
else if (type == "C") doC();
```

새 타입이 들어오면 새 `else if`가 붙는다. 같은 패턴이 여러 함수에서 반복된다면 OCP 위반이다.

해법은 다형성이나 Strategy다.

### 2) 타입 태그와 switch

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

해법은 `std::variant`다.

```cpp
using Event = std::variant<ClickEvent, KeyEvent, MouseEvent>;

void handle(const Event& e) {
    std::visit([](const auto& specific) { specific.process(); }, e);
}
```

### 3) 열거형 + switch에 default를 두지 않는다

```cpp
enum class State { Idle, Running, Stopped };

void process(State s) {
    switch (s) {
        case State::Idle:    /* ... */; break;
        case State::Running: /* ... */; break;
        case State::Stopped: /* ... */; break;
        // default를 두지 않으면, 새 상태가 추가됐을 때 컴파일러가 잡아 준다(-Wswitch)
    }
}
```

이건 의도된 패턴일 때도 있다. 새 상태가 추가되면 모든 switch가 컴파일 에러를 내기 때문이다. C++26 reflection이 들어오면 더 깔끔해질 영역이다.

### 4) 매개변수에 타입 판별자를 넣는다

```cpp
void render(Shape s, const std::string& format);
// format = "html" 또는 "json" 또는 ...
```

format이 늘면 함수 내부 분기가 늘어난다. 다형성이나 visitor로 대체한다.

## 도구 1 — 가상 함수 (전통 방식)

```cpp
class Renderer {
public:
    virtual ~Renderer() = default;
    virtual std::string render(const Shape&) = 0;
};

class HtmlRenderer : public Renderer { /* ... */ };
class JsonRenderer : public Renderer { /* ... */ };

// 새 renderer 추가 — 클래스만 더하면 된다
class MarkdownRenderer : public Renderer { /* ... */ };
```

장점은 다음과 같다.

- 익숙한 OOP 패턴이다.
- 런타임 다형성을 그대로 누린다(컨테이너에 다양한 타입을 함께 담을 수 있다).

단점도 있다.

- vtable 비용이 든다.
- 인라이닝이 어렵다.
- 다중 상속과 virtual 상속이 얽히면 복잡해진다.

### 가상 함수의 OCP 한계 — 열린 계층에서 연산을 추가할 때

```cpp
// 사용자가 Shape를 상속해 새 도형을 만든다
// 그리고 사용자 코드에서 area_squared() 같은 새 연산을 더한다
double area_squared(const Shape& s) {
    double a = s.area();      // 가상 함수 호출 — OK
    return a * a;
}
```

비-멤버 함수로 새 연산을 더하는 것은 문제없다. 그런데 새 연산이 상태 접근을 요구한다면 이야기가 달라진다.

```cpp
double weighted_area(const Shape& s, const std::vector<double>& weights) {
    // 도형 종류별로 가중 계산이 다르다면?
    // Circle은 reset_weight, Square는 다른 방식 → 가상 함수가 필요해진다
    // → Shape 인터페이스에 새 메서드 추가 → 모든 derived를 손대야 한다
}
```

**연산이 자주 늘어나는 도메인**에서는 가상 함수의 OCP가 한계를 드러낸다.

## 도구 2 — `std::variant` + visit

```cpp
class Circle   { /* ... */ };
class Square   { /* ... */ };
class Triangle { /* ... */ };

using Shape = std::variant<Circle, Square, Triangle>;

// 연산은 비-멤버 함수로
double area(const Shape& s) {
    return std::visit([](const auto& x) {
        if constexpr (std::is_same_v<decltype(x), const Circle&>)
            return M_PI * x.radius * x.radius;
        else if constexpr (std::is_same_v<decltype(x), const Square&>)
            return x.side * x.side;
        // ...
    }, s);
}

// 또는 각 타입이 area()를 가지고 있다면
double area(const Shape& s) {
    return std::visit([](const auto& x) { return x.area(); }, s);
}
```

장점은 다음과 같다.

- 새 연산 추가가 비-멤버 함수 추가로 끝난다. 기존 코드는 그대로다.
- vtable 비용이 없다. variant는 태그 디스패치다.
- 모든 케이스를 다뤘는지 컴파일러가 검증한다.
- 값 의미론을 유지한다.

단점은 다음과 같다.

- 새 타입을 더하려면 variant 정의와 사용자 코드까지 손봐야 한다.
- 사용자가 새 타입을 추가할 수 없는 **닫힌 계층**이다.

도메인이 **타입은 정해져 있고 연산이 자주 늘어나는** 형태일 때 잘 맞는다.

## 도구 3 — 템플릿과 concepts (C++20)

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
// Circle, Square는 상속 선언 없이도 Shape concept을 자동으로 충족한다
```

장점은 다음과 같다.

- vtable 비용이 0이다. 컴파일 타임 다형성이다.
- 상속 선언 없이 인터페이스가 자동으로 충족된다(duck typing).
- 인라이닝과 강한 최적화가 가능하다.

단점은 다음과 같다.

- 런타임 다형성이 안 된다. 컨테이너에 다른 타입을 함께 담을 수 없다.
- 인스턴스가 늘수록 코드 부피가 커진다.
- 디버깅과 에러 메시지는 C++20 concept으로 많이 좋아졌지만 여전히 부담이 있다.

컴파일 타임에 타입이 결정되고 성능이 critical할 때 어울린다.

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
// FileWriter 코드는 0줄 손대지 않는다
```

런타임에 알고리즘을 갈아 끼울 수 있다. plugin 시스템의 토대이기도 하다.

## Expression Problem

```
가상 함수 (열린 계층):
  + 새 타입 추가 → 기존 코드 무수정 ✅
  - 새 연산 추가 → 인터페이스와 모든 derived 수정 ❌

std::variant (닫힌 집합):
  + 새 연산 추가 → 새 함수만 추가 ✅
  - 새 타입 추가 → variant와 모든 visit 수정 ❌

  → 한 축만 닫혀 있는 것이 정설이다.
```

**Expression Problem**은 두 차원(타입과 연산) 모두에서 OCP를 만족시키기가 어렵다는 고전적인 문제다. 어느 한 축을 골라야 한다.

복잡한 해법으로 가는 길도 있다.

- **External Polymorphism** (가이드라인 31) — vtable을 외부에 둔다.
- **Type Erasure** (가이드라인 32~34) — concept 기반 다형성.

복잡한 해법은 도메인이 정말로 두 축 모두에서 변화한다는 사실이 확인된 다음에 쓴다.

## OCP의 함정 — 과도한 추상화

```cpp
// 단순 카운터에 OCP를 적용한다고?
class ICounter {
    virtual void increment() = 0;
};
class CounterFactory { /* ... */ };
class CounterStrategy { /* ... */ };
```

가이드라인 1과 2에서 본 YAGNI의 함정이다. 정말 변화가 예상되는 축에만 OCP를 적용한다. 모든 곳에 적용하면 복잡도가 폭발한다.

원칙은 단순하다.

- 지금 알려진 변화의 축에만 OCP를 건다.
- 세 번 반복된 다음에야 추상화한다.
- 지금 단순한 코드가 미래의 자유를 만든다.

## C++20 `<=>` (spaceship) — OCP 친화적인 도구

```cpp
class Point {
    int x, y;
public:
    auto operator<=>(const Point&) const = default;     // <, <=, >, >=, ==, != 가 자동으로 생긴다
};
```

새 비교 연산자를 추가할 일을 `<=>` 한 줄로 끝낸다. OCP 친화적이다.

## CRTP — 가이드라인 26~27

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

상속 문법을 쓰면서 컴파일 타임 다형성을 얻는다. vtable 비용이 없는 mixin 패턴이다. 자세한 내용은 가이드라인 26과 27에서 다룬다.

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

class Plant : public Animal {     // ⚠️ 식물이 동물인가?
    void breathe() override;     // 광합성
    // reproduce — 영양생식? 종자?
};
```

추상화가 너무 일반적이면 도메인의 의미가 흐려진다. 더 좁은 인터페이스로 가른다.

```cpp
class Breathable { virtual void breathe() = 0; };
class Eater      { virtual void eat() = 0; };

class Fish : public Breathable, public Eater { /* ... */ };
class Plant : public Breathable { /* eat은 의미가 다르다 */ };
```

## 실무 가이드 — 결정 트리

```
새 기능 추가가 자주 일어날 예정인가?
├── 새 타입(Shape 종류) 추가 잦음 → 가상 함수(또는 CRTP)
├── 새 연산(Shape에 대한 작업) 추가 잦음 → std::variant + visit
├── 양쪽 다 자주 일어남 → External Polymorphism(가이드라인 31) 또는 Type Erasure(32~34)
├── 컴파일 타임 결정 + 성능 critical → 템플릿 + concepts
├── 런타임 교체 필요 → Strategy 패턴
└── 변화를 예측하기 어렵다 → 단순하게 시작하고, 변화가 오면 그때 리팩토링
```

## 실무 가이드 — 체크리스트

새 코드를 작성할 때 다음을 점검하자.

- [ ] `if` / `switch` 체인이 새 타입이나 case가 늘어날 때 수정을 요구하는가?
- [ ] 그렇다면 다형성이나 variant로 대체할 수 있는가?
- [ ] 확장의 축이 명확한가? (타입과 연산 중 어느 쪽인가)
- [ ] 도구 선택이 그 축에 맞는가?
- [ ] 과도한 OCP로 단순한 일을 복잡하게 만들지는 않았는가? (YAGNI)
- [ ] 새 derived를 인터페이스 변경 없이 더할 수 있는가?

## 정리

**Open-Closed Principle** — 확장에는 열려 있고, 수정에는 닫혀 있다.

Expression Problem을 기억하자.

- 새 타입이 자주 들어온다 → **가상 함수**
- 새 연산이 자주 들어온다 → **`std::variant` + visit**
- 양쪽 다 자주 들어온다 → External Polymorphism / Type Erasure

원칙은 다음과 같다.

1. 확장의 축을 식별한다 — 타입인가 연산인가.
2. 그 축에 맞는 도구를 고른다.
3. YAGNI — 모든 곳에 OCP를 적용하지 않는다.
4. 타입에 대한 `if` / `switch`는 곧 신호다.

## 관련 항목

- [가이드라인 2: 변화를 위한 디자인](/blog/programming/cpp/cpp-software-design/guideline02-design-for-change) — 확장의 토대
- [가이드라인 4: 테스트 가능성](/blog/programming/cpp/cpp-software-design/guideline04-design-for-testability) — OCP의 자매
- [가이드라인 15: 타입/연산 추가를 위한 디자인](/blog/programming/cpp/cpp-software-design/guideline15-design-for-the-addition-of-types-or-operations) — 본격적인 Visitor 도입
- [GoF Strategy](/blog/programming/design/gof-design-patterns/item19-strategy) — 알고리즘 교체
- [Effective C++ 항목 35: 가상 함수의 대안](/blog/programming/cpp/effective-cpp/item35-consider-alternatives-to-virtual-functions) — 다형성 도구들
