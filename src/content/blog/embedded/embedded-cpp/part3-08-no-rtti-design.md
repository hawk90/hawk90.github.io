---
title: "Part 3-08: No-RTTI 설계"
date: 2026-05-15T08:00:00
description: "-fno-rtti 환경에서 type info 없이 다형성 — enum tag, std::variant, CRTP."
series: "Embedded C++ for Real Systems"
seriesOrder: 26
tags: [cpp, embedded, no-rtti, variant, type-id, polymorphism]
type: tech
---

## 한 줄 요약

> **"RTTI 없이도 *type-safe 다형성*."** — enum tag, `std::variant`, CRTP가 *3가지 대안*.

## 어떤 문제를 푸는가

C++의 *RTTI*(Run-Time Type Information)는:

- `typeid(obj)` — type 정보
- `dynamic_cast<T*>(p)` — 안전한 down-cast
- 예외 처리의 *type-based catch*

비용:
- *type info 테이블* — 클래스당 수십-수백 byte
- *vtable에 type info 포인터*
- *총 수 KB* 가능

임베디드는 `-fno-rtti`. 그러면 *type 정보가 필요할 때*?

```cpp
class Shape { /* virtual */ };
class Circle : public Shape {};

Shape* s = create();
auto* c = dynamic_cast<Circle*>(s);   // RTTI 필요
if (c) c->circle_method();
```

이 글은 *RTTI 없는 3가지 대안*입니다.

## 대안 1 — Enum Tag

가장 단순. *type을 enum으로 표현*.

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

`type_` enum이 *type 식별 역할*. `static_cast`는 *안전 검증 X* — *enum 체크와 짝*.

비용: *클래스당 enum size* (4 byte). RTTI보다 작음.

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

`dynamic_cast` 흉내. *모든 type을 enum + TypeOf 매핑* 필요.

## 대안 2 — `std::variant` (C++17)

*type-safe tagged union*. closed type set에 자연.

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

`std::variant`의 *내부 size* = `max(sizeof of all types) + index`. *heap 없음*.

### 가상 함수 *완전 대체*

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

*컴파일 타임에 모든 type 알아야*. 런타임 추가 type 못 함.

장점:
- *vtable 0*
- *type info 0*
- *간접 호출 0* (visitor가 인라인)
- *value semantics*

단점:
- *type set closed* — 런타임 확장 불가
- *모든 type의 메모리 차지* (큰 type 하나가 sizeof 결정)

자세한 비교는 [Part 4-06: State Machine](/blog/embedded/embedded-cpp/part4-06-state-machine).

## 대안 3 — CRTP (Static Polymorphism)

[Part 2-08](/blog/embedded/embedded-cpp/part2-08-static-polymorphism)에서 다룬 패턴. *컴파일 타임에 type 결정*.

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

*RTTI 0, vtable 0*. 단 *runtime polymorphism 못 함*.

## 자체 type-id 시스템

도메인 특화 *type id*가 필요할 때. 직접 정의.

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

*전역 변수 주소*가 *unique type id*. RTTI 없이도 *strict type 비교*.

C++23 `typeid`의 *대체 구현*. 일부 라이브러리(Boost.TypeIndex 등)가 같은 idea.

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

각 패턴이 *조금씩 다른 trade-off*. *닫힌 type set* + *value semantics*면 *variant 가장 깔끔*.

## std::any — 사용 가능?

`std::any`는 *type-erased container*. 내부적으로 *typeid 사용*.

```cpp
#include <any>

std::any a = 42;
auto* p = std::any_cast<int>(&a);   // RTTI 필요
```

`-fno-rtti`에서는 *컴파일 에러*. *임베디드에서 std::any 사용 불가*.

대안: `std::variant` (closed type set).

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

*vtable 0, RTTI 0*. 코드 크기 *수 KB 절약*.

## Exception 처리도 무관

`-fno-exceptions` + `-fno-rtti`. *둘 다 끔*. 일반 임베디드 표준.

```makefile
CXXFLAGS += -fno-exceptions -fno-rtti
```

## 자주 보는 함정과 안티패턴

### 1. *dynamic_cast 호출 후 nullptr 안 체크*
RTTI 없으면 `dynamic_cast`가 *컴파일 에러*. 코드 변환 필요.

### 2. *typeid 사용*
`typeid` 호출 — 컴파일 에러. *직접 type_id 시스템* 또는 *enum*.

### 3. *enum tag와 type 일관성 깨짐*
```cpp
class Circle : public Shape {
public:
    Circle() : Shape(ShapeType::Square) {}   // 잘못 — 컴파일 에러 없음
};
```
*static_assert* 또는 *factory function*으로 보장.

### 4. *variant에 큰 type*
```cpp
using Event = std::variant<SmallEvent, HugeEvent>;
// sizeof(Event) = sizeof(HugeEvent) + 인덱스
```
*큰 type 분리*. 또는 *pointer 사용*.

### 5. *std::function의 RTTI 의존*
`std::function`은 *내부 type erasure에 typeid 사용*. *RTTI 없으면* 일부 기능 제한. *함수 포인터*나 *etl::delegate*.

### 6. *exception 일부만 끔*
*예외와 RTTI는 *세트*로* 끔. 한 모듈만 RTTI 있으면 *링크 충돌* 가능.

## 측정 — RTTI 끄기 효과

같은 코드, RTTI on/off (STM32F4, simple inheritance project).

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

큰 프로젝트는 *더 큰 차이*. RTTI 끄기 *임베디드 기본*.

## 정리

- `-fno-rtti`로 *type info tables 제거*. 수 KB 절약.
- 대안 3가지: *enum tag*, *std::variant* (closed set), *CRTP* (compile-time).
- *dynamic_cast 대체*: type_id 시스템 또는 visitor.
- `std::any` 사용 불가. `std::function`도 *부분 제한*.
- RTTI와 예외는 *세트로 켜고 끔*.

## 관련 항목

- [Part 1-02: 컴파일러 플래그](/blog/embedded/embedded-cpp/part1-02-compiler-flags) — `-fno-rtti`
- [Part 2-08: Static Polymorphism](/blog/embedded/embedded-cpp/part2-08-static-polymorphism) — CRTP
- [Part 4-06: State Machine](/blog/embedded/embedded-cpp/part4-06-state-machine) — std::variant 활용
- [GoF 23: Visitor](/blog/programming/design/gof-design-patterns/item23-visitor) — std::visit

## 다음 글

[Part 3-09: 스마트 포인터 선택](/blog/embedded/embedded-cpp/part3-09-smart-pointer-choice) — `unique_ptr` vs `shared_ptr` vs raw pointer. 임베디드의 *기본 선택*.
