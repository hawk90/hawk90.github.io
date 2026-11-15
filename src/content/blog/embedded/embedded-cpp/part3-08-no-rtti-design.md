---
title: "No-RTTI C++ 설계 — dynamic_cast 제거와 정적 타입 분기"
slug: "embedded/embedded-cpp/part3-08-no-rtti-design"
date: 2026-04-30T09:26:00
description: "-fno-rtti 환경에서 type info 없이 다형성 — enum tag, std::variant, CRTP."
series: "Embedded C++ for Real Systems"
seriesOrder: 26
tags: [cpp, embedded, no-rtti, variant, type-id, polymorphism]
type: tech
topics: ["embedded"]
---

## 한 줄 요약

> **"RTTI 없이도 type-safe한 다형성이 가능합니다."** enum tag, `std::variant`, CRTP가 세 가지 대안입니다.

## 어떤 문제를 푸는가

RTTI(Run-Time Type Information)는 typeid와 런타임 타입 검사에 사용됩니다. 예외의 타입 매칭도 타입 정보를 사용하지만 컴파일러의 -fno-rtti와 예외 비활성은 별개의 옵션입니다.

- `typeid(obj)`로 type 정보를 얻습니다.
- `dynamic_cast<T*>(p)`로 안전한 down-cast를 수행합니다.
- GCC의 -fno-rtti에서도 예외 타입 매칭에 필요한 정보는 별도로 생성될 수 있습니다.

비용은 다음과 같습니다.

- type info 테이블이 클래스당 수십~수백 byte를 차지합니다.
- vtable에 type info 포인터가 추가됩니다.
- 총량이 수 KB에 이를 수 있습니다.

이 글은 RTTI를 끄기로 정한 프로젝트를 대상으로 합니다. 그렇다면 type 정보가 필요한 상황은 어떻게 처리할까요?

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

tag는 인스턴스마다 저장됩니다. enum 크기·padding·기존 virtual 소멸자의 vptr까지 포함해 ABI에서 측정해야 하며 RTTI 메타데이터와 단순히 같은 비용으로 비교할 수 없습니다.

### 헬퍼 매크로

```cpp
template<typename T> struct TypeOf; // 템플릿 사용보다 먼저 선언
template<typename Derived, typename Base>
Derived* checked_cast(Base* base) {
    if (base && base->type() == TypeOf<Derived>::value) {
        return static_cast<Derived*>(base);
    }
    return nullptr;
}

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

variant는 대안 객체를 내부에 저장하며 상태와 정렬 패딩도 포함합니다. 정확한 크기는 구현에 따르고 대안 타입이 내부적으로 heap을 쓰는지는 별도입니다.

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
- visitor는 최적화될 수 있지만 std::visit 구현과 후보 수에 따라 dispatch table의 간접 호출이 남을 수 있습니다.
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

이 주소 tag는 동일 프로그램 안에서 제한된 타입 집합을 식별하는 예입니다. dynamic_cast의 다중 상속·cross-cast 의미, 공유 라이브러리 경계, 영속 직렬화 ID까지 제공하는 구현은 아닙니다.

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

## std::any — 구현 범위를 구분하기

any_cast가 반드시 typeid를 실행해야 하는 것은 아닙니다. libc++·libstdc++는 RTTI가 꺼진 구성에서도 저장된 타입을 구현 내부 식별자로 비교할 수 있습니다. 반면 any::type() 같은 type_info 관찰 API는 RTTI 없는 구성에서 제공되지 않을 수 있습니다.

따라서 any를 전면 사용 불가라고 단정하지 말고 대상 표준 라이브러리의 지원 범위를 확인합니다. 다만 any는 저장 타입과 작은 객체 최적화 조건에 따라 heap을 쓸 수 있으므로 무할당 보장은 별도 문제입니다.

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

variant 기반 경로는 위 가상 상속 인터페이스를 쓰지 않습니다. 두 Event 정의는 대안별 독립 스케치이며 같은 범위에 함께 정의하지 않습니다. 실제 크기 이득은 빌드·링크 결과로 확인해야 합니다.

## Exception 처리도 무관

예외와 RTTI는 별개로 선택합니다. 두 기능을 모두 쓰지 않기로 정한 프로젝트는 다음 옵션을 함께 적용할 수 있지만, 반드시 세트여야 하는 것은 아닙니다.

```makefile
CXXFLAGS += -fno-exceptions -fno-rtti
```

## 자주 보는 함정과 안티패턴

### 1. dynamic_cast 호출 후 nullptr 안 체크
런타임 타입 검사가 필요한 downcast는 -fno-rtti에서 거부됩니다. 단순 upcast 같은 정적으로 해결되는 dynamic_cast까지 모두 불가능한 것은 아닙니다.

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
std::function의 호출은 RTTI 없이도 지원될 수 있습니다. target_type 같은 type_info 관찰 API의 가용성은 구현별로 확인합니다. 무할당 콜백이 필요하면 RTTI 설정과 별도로 저장 크기·할당 계약을 확인합니다.

### 6. exception 일부만 끔
예외와 RTTI는 독립 옵션입니다. 다만 GCC는 -frtti로 빌드한 파생 타입이 -fno-rtti 기반 클래스를 상속하는 구성 등 혼합 빌드에서 문제가 날 수 있다고 경고합니다. 공유 클래스 경계의 빌드 정책을 일관되게 관리합니다.

## 실행 확인 — any_cast·function·variant

다음 파일은 RTTI를 끈 libc++ 구성에서 타입 일치·불일치, function 호출, variant 분기를 확인합니다. type_info 관찰과 실제 downcast는 별도 거부 테스트로 나눕니다.

```cpp title="no-rtti.cpp"
#include <any>
#include <cassert>
#include <functional>
#include <variant>
struct Base { virtual ~Base() = default; };
struct Derived : Base {};
int main() {
    std::any value = 42;
    auto* matching = std::any_cast<int>(&value);
    assert(matching && *matching == 42);
    assert(std::any_cast<float>(&value) == nullptr);
    std::function<int(int)> add_one = +[](int n) { return n+1; };
    assert(add_one(41) == 42);
    std::variant<int, float> event = 7;
    assert(std::visit([](auto n) { return static_cast<int>(n); }, event) == 7);
#ifdef REQUIRE_RTTI
    Derived object; Base* base = &object;
    assert(dynamic_cast<Derived*>(base) != nullptr);
    (void)typeid(*base);
#endif
}
```

```bash
clang++ -std=c++17 -fno-rtti -Wall -Wextra -Werror no-rtti.cpp -o no-rtti
./no-rtti
```

RTTI on/off의 크기를 비교할 때는 다른 플래그를 고정합니다. 기존 표는 예외 설정도 동시에 바꾸고 재현 소스도 없었으므로 RTTI 단독 효과를 보여 주는 근거로 사용하지 않습니다.

## 정리

- RTTI 제거의 크기 효과는 같은 프로그램·예외 옵션으로 비교합니다.
- 대안은 세 가지입니다 — enum tag, `std::variant`(closed set), CRTP(compile-time).
- `dynamic_cast`는 type_id 시스템이나 visitor로 대체합니다.
- any_cast와 function 호출의 no-RTTI 지원은 구현에서 확인하며 type_info 관찰과 구분합니다.
- RTTI와 예외는 독립적으로 결정하고 공유 클래스의 빌드 경계를 점검합니다.

## 근거와 검증 범위

2026-10-22에 장별 명명 예제를 Homebrew Clang 23.1.3·libc++의 macOS arm64 host에서 실행했습니다. ASan·UBSan을 적용했으며 보드 실행·WCET·인증 적합성·외부 라이브러리 성공은 이 결과에 포함하지 않습니다. 다른 이름 없는 코드 블록은 주변에 정의한 장치 API를 가정하는 부분 예제이며 하나의 translation unit으로 합치지 않습니다.

- [libc++ any 구현의 no-RTTI 분기](https://github.com/llvm/llvm-project/blob/main/libcxx/include/any)

## 관련 항목

- [Part 1-02: 컴파일러 플래그](/blog/embedded/embedded-cpp/part1-02-compiler-flags) — `-fno-rtti`
- [Part 2-08: Static Polymorphism](/blog/embedded/embedded-cpp/part2-08-static-polymorphism) — CRTP
- [Part 4-06: State Machine](/blog/embedded/embedded-cpp/part4-06-state-machine) — std::variant 활용
- [GCC의 -fno-rtti 옵션과 혼합 빌드 주의](https://gcc.gnu.org/onlinedocs/gcc/C_002b_002b-Dialect-Options.html)

## 다음 글

[Part 3-09: 스마트 포인터 선택](/blog/embedded/embedded-cpp/part3-09-smart-pointer-choice) — `unique_ptr`, `shared_ptr`, raw pointer 사이에서 임베디드의 기본 선택을 정리합니다.
