---
title: "Part 3-08: No-RTTI 설계"
date: 2026-05-07T08:00:00
description: "-fno-rtti 환경에서 type info 없이 다형성 — enum tag, std::variant, CRTP."
series: "Embedded C++ for Real Systems"
seriesOrder: 26
tags: [cpp, embedded, no-rtti, variant, type-id, polymorphism]
type: tech
---

## 한 줄 요약

> **"RTTI 없이도 type-safe한 다형성이 가능합니다."** enum tag, `std::variant`, CRTP가 세 가지 대안입니다.

## 어떤 문제를 푸는가

C++의 RTTI(Run-Time Type Information)는 세 가지 기능을 제공합니다.

- `typeid(obj)`로 type 정보를 얻습니다.
- `dynamic_cast<T*>(p)`로 안전한 down-cast를 수행합니다.
- 예외 처리에서 type-based catch를 가능하게 합니다.

비용은 다음과 같습니다.

- type info 테이블이 클래스당 수십~수백 byte를 차지합니다.
- vtable에 type info 포인터가 추가됩니다.
- 총량이 수 KB에 이를 수 있습니다.

임베디드는 `-fno-rtti`로 빌드합니다. 그렇다면 type 정보가 필요한 상황은 어떻게 처리할까요?

```cpp
class Shape { /* virtual */ };
class Circle : public Shape {};

Shape* s = create();
auto* c = dynamic_cast<Circle*>(s);   // RTTI 필요
if (c) c->circle_method();
```

이 글은 RTTI 없는 세 가지 대안을 다룹니다.

## 대안 1 — Enum Tag

가장 단순한 방식으로, type을 enum으로 표현합니다.

```cpp
enum class ShapeType { Circle, Square, Triangle };

class Shape {
public:
    Shape(ShapeType t) : type_(t) {}
    ShapeType type() const { return type_; }
    virtual ~Shape() = default;

private:
    ShapeType type_;
};

class Circle : public Shape {
public:
    Circle() : Shape(ShapeType::Circle) {}
    void roll() { /* */ }
};

// 사용
Shape* s = create();
if (s->type() == ShapeType::Circle) {
    static_cast<Circle*>(s)->roll();
}
```

`type_` enum이 type을 식별하는 역할을 합니다. `static_cast`는 안전 검증을 해 주지 않으므로 enum 체크와 짝지어 씁니다.

비용은 클래스당 enum size(4 byte) 정도로, RTTI보다 작습니다.

### 헬퍼 매크로

```cpp
template<typename Derived, typename Base>
Derived* checked_cast(Base* base) {
    if (base && base->type() == TypeOf<Derived>::value) {
        return static_cast<Derived*>(base);
    }
    return nullptr;
}

template<typename T> struct TypeOf;
template<> struct TypeOf<Circle> { static constexpr ShapeType value = ShapeType::Circle; };
template<> struct TypeOf<Square> { static constexpr ShapeType value = ShapeType::Square; };

auto* c = checked_cast<Circle>(s);
```

`dynamic_cast`를 흉내 낼 수 있지만, 모든 type을 enum과 TypeOf 매핑으로 등록해야 합니다.

## 대안 2 — `std::variant` (C++17)

type-safe tagged union입니다. closed type set에 자연스럽게 들어맞습니다.

```cpp
#include <variant>

class Circle {
public:
    void roll() { /* */ }
    float area() const { return 3.14f * r * r; }
private:
    float r = 1.0f;
};

class Square {
public:
    float area() const { return s * s; }
private:
    float s = 1.0f;
};

class Triangle {
public:
    float area() const { return 0.5f * b * h; }
private:
    float b = 1.0f, h = 1.0f;
};

using Shape = std::variant<Circle, Square, Triangle>;

Shape s = Circle{};

// 1. holds_alternative
if (std::holds_alternative<Circle>(s)) {
    std::get<Circle>(s).roll();
}

// 2. std::visit — 모든 가능 타입에 적용
float a = std::visit([](auto&& shape) {
    return shape.area();
}, s);

// 3. if constexpr 분기
std::visit([](auto&& shape) {
    using T = std::decay_t<decltype(shape)>;
    if constexpr (std::is_same_v<T, Circle>) {
        shape.roll();
    } else if constexpr (std::is_same_v<T, Square>) {
        // square 전용
    }
}, s);
```

`std::variant`의 내부 size는 `max(sizeof of all types) + index`이며 heap을 쓰지 않습니다.

### 가상 함수의 완전 대체

```cpp
// 전통 — virtual
class IShape {
public:
    virtual ~IShape() = default;
    virtual float area() const = 0;
};

// variant 대체 — vtable 없음, RTTI 없음
using Shape = std::variant<Circle, Square, Triangle>;

float compute_area(const Shape& s) {
    return std::visit([](auto&& sh) { return sh.area(); }, s);
}
```

컴파일 타임에 모든 type을 알고 있어야 하며, 런타임에 type을 추가할 수는 없습니다.

장점은 다음과 같습니다.

- vtable과 type info가 모두 0입니다.
- visitor가 인라인되어 간접 호출이 0입니다.
- value semantics를 가집니다.

단점도 있습니다.

- type set이 closed라서 런타임 확장이 불가합니다.
- 모든 type의 메모리를 차지하므로(가장 큰 type이 sizeof를 결정합니다) 큰 type 하나가 전체를 부풉니다.

자세한 비교는 [Part 4-06: State Machine](/blog/embedded/embedded-cpp/part4-06-state-machine)에서 다룹니다.

## 대안 3 — CRTP (Static Polymorphism)

[Part 2-08](/blog/embedded/embedded-cpp/part2-08-static-polymorphism)에서 다룬 패턴으로, 컴파일 타임에 type을 결정합니다.

```cpp
template<typename Derived>
class ShapeBase {
public:
    float area() const {
        return static_cast<const Derived*>(this)->area_impl();
    }
};

class Circle : public ShapeBase<Circle> {
public:
    float area_impl() const { return 3.14f * r * r; }
private:
    float r;
};

Circle c;
float a = c.area();   // compile-time dispatch
```

RTTI와 vtable이 모두 0입니다. 다만 runtime polymorphism은 사용할 수 없습니다.

## 자체 type-id 시스템

도메인 특화된 type id가 필요할 때 직접 정의합니다.

```cpp
template<typename T>
struct TypeId {
    static const void* value() {
        static const int dummy = 0;
        return &dummy;
    }
};

// 각 type마다 다른 주소 — 유니크 ID
class Base {
public:
    virtual const void* type_id() const = 0;
    virtual ~Base() = default;
};

class Derived : public Base {
public:
    const void* type_id() const override {
        return TypeId<Derived>::value();
    }
};

// 사용
Base* b = get();
if (b->type_id() == TypeId<Derived>::value()) {
    auto* d = static_cast<Derived*>(b);
}
```

전역 변수의 주소가 unique type id 역할을 합니다. RTTI 없이도 strict type 비교가 가능합니다.

`typeid`의 대체 구현이며, Boost.TypeIndex 같은 일부 라이브러리도 같은 아이디어를 사용합니다.

## `dynamic_cast` 대체

```cpp
// dynamic_cast (RTTI 필요)
auto* d = dynamic_cast<Derived*>(base);

// 대체 1 — enum tag + static_cast
if (base->type() == NodeType::Derived) {
    auto* d = static_cast<Derived*>(base);
}

// 대체 2 — type_id
if (base->type_id() == TypeId<Derived>::value()) {
    auto* d = static_cast<Derived*>(base);
}

// 대체 3 — visitor (std::variant)
std::visit([](auto&& obj) {
    using T = std::decay_t<decltype(obj)>;
    if constexpr (std::is_same_v<T, Derived>) {
        // Derived 전용
    }
}, variant_obj);
```

각 패턴이 조금씩 다른 트레이드오프를 가집니다. type set이 닫혀 있고 value semantics를 원한다면 variant가 가장 깔끔합니다.

## std::any — 사용 가능?

`std::any`는 type-erased container이며 내부적으로 typeid를 사용합니다.

```cpp
#include <any>

std::any a = 42;
auto* p = std::any_cast<int>(&a);   // RTTI 필요
```

`-fno-rtti`에서는 컴파일 에러가 발생하므로 임베디드에서는 `std::any`를 사용할 수 없습니다.

대안은 closed type set의 `std::variant`입니다.

## 임베디드 — Event 시스템

```cpp
// 전통 — virtual
class IEvent {
public:
    virtual ~IEvent() = default;
    virtual void dispatch() = 0;
};

class ClickEvent : public IEvent { void dispatch() override { /* */ } };
class KeyEvent : public IEvent { void dispatch() override { /* */ } };

// variant 기반
struct ClickEvent { int x, y; };
struct KeyEvent { int keycode; };
struct TimerEvent { uint32_t ms; };

using Event = std::variant<ClickEvent, KeyEvent, TimerEvent>;

void dispatch(const Event& e) {
    std::visit([](auto&& ev) {
        using T = std::decay_t<decltype(ev)>;
        if constexpr (std::is_same_v<T, ClickEvent>) {
            handle_click(ev);
        } else if constexpr (std::is_same_v<T, KeyEvent>) {
            handle_key(ev);
        }
        // ...
    }, e);
}
```

vtable과 RTTI가 모두 0이며 코드 크기를 수 KB 절약할 수 있습니다.

## Exception 처리도 무관

`-fno-exceptions`와 `-fno-rtti`를 함께 끄는 것이 일반적인 임베디드 표준입니다.

```makefile
CXXFLAGS += -fno-exceptions -fno-rtti
```

## 자주 보는 함정과 안티패턴

### 1. dynamic_cast 호출 후 nullptr 안 체크
RTTI가 없으면 `dynamic_cast` 자체가 컴파일 에러가 됩니다. 코드 변환이 필요합니다.

### 2. typeid 사용
`typeid` 호출도 컴파일 에러로 떨어집니다. 직접 type_id 시스템이나 enum을 씁니다.

### 3. enum tag와 type 일관성 깨짐
```cpp
class Circle : public Shape {
public:
    Circle() : Shape(ShapeType::Square) {}   // 잘못 — 컴파일 에러 없음
};
```
static_assert나 factory function으로 일관성을 보장합니다.

### 4. variant에 큰 type
```cpp
using Event = std::variant<SmallEvent, HugeEvent>;
// sizeof(Event) = sizeof(HugeEvent) + 인덱스
```
큰 type을 분리하거나 pointer를 사용합니다.

### 5. std::function의 RTTI 의존
`std::function`은 내부 type erasure에 typeid를 사용합니다. RTTI를 끄면 일부 기능이 제한되므로 함수 포인터나 `etl::delegate`로 대체합니다.

### 6. exception 일부만 끔
예외와 RTTI는 세트로 끕니다. 한 모듈만 RTTI를 켜 두면 링크 충돌이 발생할 수 있습니다.

## 측정 — RTTI 끄기 효과

같은 코드를 RTTI on/off로 비교합니다(STM32F4, 단순한 상속 프로젝트).

```text
-frtti -fexceptions:
  .text: 52 KB
  type info tables: 6 KB
  total: 58 KB

-fno-rtti -fno-exceptions:
  .text: 38 KB
  type info tables: 0
  total: 38 KB

차이: 20 KB (35% 감소)
```

큰 프로젝트일수록 차이가 더 벌어집니다. RTTI 끄기는 임베디드의 기본 설정입니다.

## 정리

- `-fno-rtti`로 type info table을 제거하면 수 KB를 절약할 수 있습니다.
- 대안은 세 가지입니다 — enum tag, `std::variant`(closed set), CRTP(compile-time).
- `dynamic_cast`는 type_id 시스템이나 visitor로 대체합니다.
- `std::any`는 사용할 수 없고 `std::function`도 부분 제한이 있습니다.
- RTTI와 예외는 세트로 켜고 끄는 것이 보통입니다.

## 관련 항목

- [Part 1-02: 컴파일러 플래그](/blog/embedded/embedded-cpp/part1-02-compiler-flags) — `-fno-rtti`
- [Part 2-08: Static Polymorphism](/blog/embedded/embedded-cpp/part2-08-static-polymorphism) — CRTP
- [Part 4-06: State Machine](/blog/embedded/embedded-cpp/part4-06-state-machine) — std::variant 활용
- [GoF 23: Visitor](/blog/programming/design/gof-design-patterns/item23-visitor) — std::visit

## 다음 글

[Part 3-09: 스마트 포인터 선택](/blog/embedded/embedded-cpp/part3-09-smart-pointer-choice) — `unique_ptr`, `shared_ptr`, raw pointer 사이에서 임베디드의 기본 선택을 정리합니다.
