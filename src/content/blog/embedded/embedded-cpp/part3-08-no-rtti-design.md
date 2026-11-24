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
- GCC 16 문서(`-fno-rtti` 항목)는 "예외 처리도 같은 정보를 쓰지만 G++가 필요할 때 생성한다"고 적습니다. `throw`하는 타입의 type_info는 `-fno-rtti`에서도 만들어집니다.

비용은 다음과 같습니다.

- 가상 함수가 있는 클래스마다 type_info 객체(`_ZTI*`)와 이름 문자열(`_ZTS*`)이 생깁니다. [Part 1-01](/blog/embedded/embedded-cpp/part1-01-cpp-vs-c#2-rtti)에서 클래스 세 개짜리 계층을 Cortex-M4로 컴파일하면 type_info 32바이트와 이름 21바이트 등 `.rodata`가 56바이트 늘었습니다.
- vtable의 type info 슬롯은 `-fno-rtti`에서도 자리가 남고 값만 0이 됩니다([Part 1-04](/blog/embedded/embedded-cpp/part1-04-code-size-analysis#워크플로-4--vtable-크기-추적)의 24바이트 vtable).
- 총량은 다형 클래스 수와 이름 길이에 비례합니다. 템플릿 클래스는 맹글된 이름이 길어 문자열이 커집니다.

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

`type_` enum이 type을 식별하는 역할을 합니다. static_cast는 동적 타입을 검증하지 않습니다. enum 체크가 유효하려면 factory·생성자·상속 제한 등으로 tag와 실제 타입의 일치를 별도로 유지해야 합니다. public base 생성자로 잘못된 tag를 넣을 수 있는 이 스케치는 그 invariant를 언어로 강제하는 완성 checked_cast 구현이 아닙니다.

tag는 인스턴스마다 저장됩니다. arm-none-eabi-g++ 16.2.0에서 vptr만 있는 클래스는 4바이트, `ShapeType`(기본 `int`) tag를 더한 `Shape`는 8바이트였습니다. tag를 `unsigned char` 기반 enum으로 줄여도 정렬 때문에 8바이트 그대로였습니다(`static_assert`로 확인). RTTI의 type_info는 클래스당 한 번, tag는 객체마다 붙는 비용입니다.

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

variant는 대안 객체를 내부에 저장하며 상태와 정렬 패딩도 포함합니다. 위 세 클래스(float 1개, 1개, 2개)로 만든 `std::variant<Circle, Square, Triangle>`은 libstdc++·libc++ 모두 12바이트(가장 큰 `Triangle` 8 + 인덱스 + padding)였습니다. 대안 타입이 내부적으로 heap을 쓰는지는 별도입니다.

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
- dispatch는 variant가 저장한 index로 정해집니다. 이 글에서는 `std::visit`의 생성 코드를 재지 않았습니다(이 글의 ARM 툴체인에는 `<variant>`가 없습니다).
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
    float r = 1.0f;
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

enum tag와 type_id는 기존 상속 계층을 유지한 채 downcast만 대체하고, variant는 계층 자체를 값 타입으로 바꿉니다. type set이 닫혀 있고 객체를 값으로 다루고 싶으면 variant, 이미 포인터로 다루는 계층이 있으면 enum tag가 바꿀 코드가 적습니다.

## std::any — 구현 범위를 구분하기

any_cast가 반드시 typeid를 실행해야 하는 것은 아닙니다. 아래 `no-rtti.cpp`는 `-fno-rtti`에서 g++-16(libstdc++)과 Clang 23.1.5(libc++) 모두 `any_cast`의 타입 일치·불일치를 맞게 판정했습니다. 두 라이브러리가 RTTI가 꺼진 구성에서 저장된 타입을 내부 식별자로 비교하기 때문입니다. 반면 type_info를 돌려주는 관찰 API는 `-fno-rtti`에서 아예 없습니다. `std::any::type()`은 g++-16에서 `'class std::any' has no member named 'type'`, Clang에서 `no member named 'type' in 'std::any'`로 컴파일되지 않았습니다.

따라서 any를 전면 사용 불가라고 단정하지 말고 쓰는 멤버가 `-fno-rtti`에서 제공되는지 봅니다. 다만 any는 저장 타입과 작은 객체 최적화 조건에 따라 heap을 쓸 수 있으므로 무할당 보장은 별도 문제입니다.

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

variant 기반 경로는 위 가상 상속 인터페이스를 쓰지 않습니다. 두 Event 정의는 대안별 독립 스케치이며 같은 범위에 함께 정의하지 않습니다. 이 글에서는 두 구현의 링크 크기를 재지 않았습니다.

## Exception 처리도 무관

예외와 RTTI는 별개로 선택합니다. 두 기능을 모두 쓰지 않기로 정한 프로젝트는 다음 옵션을 함께 적용할 수 있지만, 반드시 세트여야 하는 것은 아닙니다.

```makefile
CXXFLAGS += -fno-exceptions -fno-rtti
```

## 자주 보는 함정과 안티패턴

### 1. dynamic_cast 호출 후 nullptr 안 체크
런타임 타입 검사가 필요한 downcast는 -fno-rtti에서 거부됩니다. 단순 upcast 같은 정적으로 해결되는 dynamic_cast까지 모두 불가능한 것은 아닙니다.

### 2. typeid 사용
`typeid` 호출도 컴파일 에러로 떨어집니다. 아래 예제의 `-DREQUIRE_RTTI` 빌드에서 Clang 23.1.5는 `error: use of dynamic_cast requires -frtti`와 `error: use of typeid requires -frtti`, g++-16은 `error: 'dynamic_cast' not permitted with '-fno-rtti'`와 `error: cannot use 'typeid' with '-fno-rtti'`를 냈습니다. 직접 type_id 시스템이나 enum을 씁니다.

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
`std::function`의 호출은 `-fno-rtti`에서도 됩니다(아래 예제의 `add_one`). `target_type()`은 `std::any::type()`과 마찬가지로 두 라이브러리 모두 `-fno-rtti`에서 멤버가 없어 컴파일되지 않았습니다. 할당 여부는 RTTI와 무관하게 저장 크기가 정합니다([Part 3-01](/blog/embedded/embedded-cpp/part3-01-no-dynamic-alloc#stdfunction-대신)).

### 6. exception 일부만 끔
예외와 RTTI는 독립 옵션입니다. 다만 GCC 16 문서는 `-frtti`와 `-fno-rtti` 코드를 섞으면 "동작하지 않을 수 있다"고 적고, `-fno-rtti`로 컴파일한 클래스를 `-frtti`로 컴파일한 클래스의 base로 쓰면 링크가 실패할 수 있다는 예를 듭니다. 파생 클래스의 type_info가 base의 type_info를 참조하는데 base 쪽이 그것을 만들지 않았기 때문입니다. 공유 클래스 경계의 빌드 정책을 일관되게 관리합니다.

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

Homebrew Clang 23.1.5와 g++-16 모두 `-fno-rtti -Wall -Wextra -Werror`로 exit 0이었습니다. RTTI on/off의 크기를 비교할 때는 다른 플래그를 고정합니다. 위 [Part 1-01](/blog/embedded/embedded-cpp/part1-01-cpp-vs-c#2-rtti) 측정은 `-fno-exceptions`를 고정하고 RTTI만 바꿨습니다.

## 정리

- RTTI 제거의 크기 효과는 같은 프로그램·예외 옵션으로 비교합니다.
- 대안은 세 가지입니다 — enum tag, `std::variant`(closed set), CRTP(compile-time).
- `dynamic_cast`는 type_id 시스템이나 visitor로 대체합니다.
- any_cast와 function 호출의 no-RTTI 지원은 구현에서 확인하며 type_info 관찰과 구분합니다.
- RTTI와 예외는 독립적으로 결정하고 공유 클래스의 빌드 경계를 점검합니다.

## 근거와 검증 범위

2026-11-16에 `no-rtti.cpp`와 `any::type()`·`target_type()`·`sizeof` 시험을 Homebrew Clang 23.1.5(libc++)와 g++-16(libstdc++)으로 macOS arm64 host에서 실행했고, tag 크기는 arm-none-eabi-g++ 16.2.0에서 확인했습니다. 보드 실행은 하지 않았습니다. 다른 이름 없는 코드 블록은 주변에 정의한 장치 API를 가정하는 부분 예제이며 하나의 translation unit으로 합치지 않습니다.

- [libc++ any 구현의 no-RTTI 분기](https://github.com/llvm/llvm-project/blob/main/libcxx/include/any)

## 관련 항목

- [Part 1-02: 컴파일러 플래그](/blog/embedded/embedded-cpp/part1-02-compiler-flags) — `-fno-rtti`
- [Part 2-08: Static Polymorphism](/blog/embedded/embedded-cpp/part2-08-static-polymorphism) — CRTP
- [Part 4-06: State Machine](/blog/embedded/embedded-cpp/part4-06-state-machine) — std::variant 활용
- [GCC의 -fno-rtti 옵션과 혼합 빌드 주의](https://gcc.gnu.org/onlinedocs/gcc/C_002b_002b-Dialect-Options.html)

## 다음 글

[Part 3-09: 스마트 포인터 선택](/blog/embedded/embedded-cpp/part3-09-smart-pointer-choice) — `unique_ptr`, `shared_ptr`, raw pointer 사이에서 임베디드의 기본 선택을 정리합니다.
