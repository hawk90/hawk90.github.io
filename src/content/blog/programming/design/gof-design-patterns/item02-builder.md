---
title: "GoF 2: Builder"
date: 2026-05-01T02:00:00
description: "복잡한 객체를 단계별로 조립 — 같은 과정으로 다른 결과를 만든다."
tags: [Design Pattern, GoF, C++, C, Creational]
series: "GoF Design Patterns"
seriesOrder: 2
draft: false
---

## 한 줄 요약

> **"인자 폭탄 생성자를 단계별 조립으로"** — `new Pizza(true, false, "thin", ...)` 대신 `Pizza().setDough().addTopping()...build()`.

## 비유 — 서브웨이 샌드위치

서브웨이에서 샌드위치 주문하는 과정을 떠올려봅시다.

1. *빵* 선택 (화이트, 위트, 허니오트 ...)
2. *치즈* 선택 (체다, 모짜렐라, 페퍼잭 ...)
3. *야채* 선택 (양상추, 토마토, 피클 ...)
4. *소스* 선택 (마요, 머스타드, 스위트칠리 ...)
5. *최종 제출* — 직원이 만들어줍니다.

각 *단계가 명시적*이고, *순서가 정해져* 있으며, 같은 절차로 *햄 샌드위치*도 *베지 샌드위치*도 만들어집니다.

Builder가 바로 이 *주문서 → 직원이 조립*의 흐름입니다.

- *주문서* = Director가 호출하는 단계 순서
- *직원* = Builder (단계별 메서드 구현)
- *완성 샌드위치* = `build()`가 반환하는 객체

생성자에 *10개의 인자*를 한 번에 넣는 대신, 각 단계를 *명명된 메서드*로 분리합니다.

## 어떤 문제를 푸는가

생성자에 인자가 너무 많아질 때 — 의도가 코드에서 사라집니다.

```cpp
// 안티패턴: 인자 폭탄
Pizza p(true, false, true, false, "thin", "tomato", 12, false);
//      ^ 각 인자가 무슨 뜻??
```

`bool` 4개가 나란히 있으면 **호출자가 매번 헤더를 봐야** 합니다. 컴파일러는 순서를 안 챙겨주고, 한 번 잘못 넘기면 silent bug.

대안으로 *오버로드* 또는 *기본값* 늘리기도 한계가 있습니다.

```cpp
// Bad: 텔레스코핑 생성자
Pizza(string dough);
Pizza(string dough, string sauce);
Pizza(string dough, string sauce, vector<string> toppings);
Pizza(string dough, string sauce, vector<string> toppings, bool glutenFree);
// ... 8개 인자 모든 조합?
```

Builder는 단계별 메서드로 같은 일을 명확하게 합니다.

```cpp
auto p = PizzaBuilder()
            .setDough("thin")
            .setSauce("tomato")
            .addTopping("cheese")
            .build();
```

같은 객체지만 **읽힙니다**. 각 setter가 의도를 이름에 담고, 누락된 단계가 있다면 `build()`에서 검증 가능.

## 한눈에 보는 구조

두 가지 형태가 있습니다.

**모던 fluent 형태** (자주 쓰임):
```
Builder ── 메서드 체인 ── build() ──► Product
```

**전통 GoF 형태** (Director가 순서를 통제):
<img src="/images/blog/gof/diagrams/item02-builder.svg" alt="Builder 패턴 클래스 다이어그램" style="max-width:100%; background:white; padding:8px; border-radius:6px;" />

Director는 "어떤 순서로 부품을 조립할까", Builder는 "각 부품을 어떻게 만들까".

## 언제 쓰면 좋은가

- 생성자 인자가 4~5개를 넘어가는 객체
- **단계별 조립**이 자연스러운 도메인 (HTML, SQL, 메뉴, 설정)
- 같은 알고리즘으로 **다른 표현**을 만들고 싶을 때 (HTML/PDF/JSON 변환기)
- **불변 객체**를 만들 때 (build 후 변경 불가)

## 언제 쓰면 안 되나

> ⚠️ **단순한 객체엔 과도** — 인자 1~2개면 그냥 생성자.

> ⚠️ **C++20 designated initializers**가 더 깔끔할 때도 있음 (집합체 초기화).

> ⚠️ **객체가 자주 바뀌어야 하면** Builder는 *불변* 생성에 어울리고, mutable 객체에는 그냥 setter가 충분.

## 헷갈리는 패턴과의 차이

| 비교 대상 | 무엇이 다른가 |
| --- | --- |
| [Abstract Factory](/blog/programming/design/gof-design-patterns/item01-abstract-factory) | Abstract Factory는 *여러 별개 객체*를 한 군으로. Builder는 *하나의 복잡한 객체*를 단계적으로. |
| [Factory Method](/blog/programming/design/gof-design-patterns/item03-factory-method) | Factory Method는 *한 호출에 한 객체*. Builder는 *여러 호출 누적 + 마지막에 객체 반환*. |
| [Prototype](/blog/programming/design/gof-design-patterns/item04-prototype) | Prototype은 *기존 객체 복제*. Builder는 *처음부터 조립*. |

판별 한 줄: *"객체 하나를 단계별로 만들고 그 단계에 이름을 붙이고 싶다"*면 Builder.

## C++ 구현 — fluent 스타일

가장 흔한 모던 형태. 메서드 체인 + `*this` 반환.

### 1. Product

```cpp
struct Pizza {
    std::string              dough;
    std::string              sauce;
    std::vector<std::string> toppings;
    bool                     glutenFree = false;
};
```

### 2. Builder

```cpp
class PizzaBuilder {
    Pizza pizza;
public:
    PizzaBuilder& setDough(std::string d)   { pizza.dough = std::move(d); return *this; }
    PizzaBuilder& setSauce(std::string s)   { pizza.sauce = std::move(s); return *this; }
    PizzaBuilder& addTopping(std::string t) { pizza.toppings.push_back(std::move(t)); return *this; }
    PizzaBuilder& makeGlutenFree()          { pizza.glutenFree = true; return *this; }

    Pizza build() { return std::move(pizza); }
};
```

각 setter가 `*this`를 반환 → 체인 가능. `build()`에서 결과를 꺼냄.

### 3. 사용

```cpp
auto p = PizzaBuilder()
            .setDough("thin")
            .setSauce("tomato")
            .addTopping("cheese")
            .addTopping("basil")
            .makeGlutenFree()
            .build();
```

## C++ 구현 — 전통 GoF (Director + Builder)

알고리즘(순서)과 구현(어떤 부품)을 명확히 분리하고 싶을 때.

```cpp
class PizzaBuilder {
public:
    virtual ~PizzaBuilder() = default;
    virtual void buildDough()    = 0;
    virtual void buildSauce()    = 0;
    virtual void buildToppings() = 0;
    virtual Pizza getResult()    = 0;
};

class HawaiianPizzaBuilder : public PizzaBuilder {
    Pizza pizza;
public:
    void buildDough()    override { pizza.dough = "regular"; }
    void buildSauce()    override { pizza.sauce = "tomato"; }
    void buildToppings() override { pizza.toppings = {"ham", "pineapple"}; }
    Pizza getResult()    override { return std::move(pizza); }
};
```

Director는 **어떤 순서로 부르는지**만 결정 — 무엇을 만드는지는 Builder.

```cpp
class PizzaDirector {
    PizzaBuilder* builder;
public:
    explicit PizzaDirector(PizzaBuilder* b) : builder(b) {}

    void construct() {
        builder->buildDough();
        builder->buildSauce();
        builder->buildToppings();
    }
};

// 사용
HawaiianPizzaBuilder b;
PizzaDirector(&b).construct();
Pizza p = b.getResult();
```

같은 Director에 다른 Builder를 끼우면 **같은 순서로 다른 피자**.

## 자주 보는 안티패턴

### 1. Builder가 mutable Product 반환 (불변성 깨짐)

```cpp
// Bad
class HttpRequestBuilder {
    HttpRequest req;
public:
    HttpRequest& build() { return req; }   // ◄── 참조 반환
};

auto& r = builder.build();
r.url = "evil.com";   // ◄── 외부에서 수정
builder.build();       // ◄── 두 번째 호출은 어떻게?
```

**문제**: Builder의 핵심 가치(완성된 객체 보장) 무산. 그리고 build 후 builder 재사용이 모호.

**해결**: `build()`가 값(또는 `unique_ptr`) 반환, 객체는 불변.

### 2. `build()` 후 builder 재사용

```cpp
PizzaBuilder b;
auto p1 = b.setDough("thin").build();
auto p2 = b.setDough("thick").build();   // ◄── b의 상태는?
```

**문제**: `build()`에서 `std::move(pizza)` 했으면 `b`는 moved-from. 다시 쓰면 부분 상태.

**해결**: build를 호출하면 builder 무효화 (또는 reset). 명시적으로 한 번만 사용.

### 3. 필수 단계 검증 없음

```cpp
// Bad
PizzaBuilder b;
auto p = b.build();   // ◄── dough 없는 피자, 컴파일 OK
p.cook();              // 런타임 폭발
```

**문제**: 필수 부품이 빠졌는데 컴파일 통과.

**해결**: `build()`에서 검증 + 예외, 또는 type-state pattern (아래 변형).

### 4. Builder에 너무 많은 책임 (god builder)

```cpp
class SuperBuilder {
    // 1000줄, 50개 setter, 10개 build*()
};
```

**문제**: Builder가 Product보다 큼. 각 setter끼리 숨겨진 dependency.

**해결**: Builder 분할 (각 sub-builder가 한 영역). Director가 sub-builder 조립.

### 5. setter끼리의 순서 의존 (순서 깨면 broken)

```cpp
// Bad
b.setSauce("tomato");
b.setDough("thin");     // ◄── setDough가 setSauce를 reset
b.build();   // ◄── sauce 사라짐
```

**문제**: setter가 다른 setter의 상태를 무효화.

**해결**: setter는 독립적이어야 함. 순서 의존이 진짜 필요하면 Director로 강제.

### 6. fluent + 상속 (`return *this` 함정)

```cpp
class Base {
public:
    Base& setX() { /* ... */ return *this; }
};
class Derived : public Base {
public:
    Derived& setY() { /* ... */ return *this; }
};

Derived().setX().setY();   // ◄── setX 후 타입이 Base& — setY 호출 불가
```

**문제**: 부모의 fluent 메서드가 자식 타입을 잃음.

**해결**: CRTP로 자기 타입 보존.

```cpp
template <typename T>
class BuilderBase {
public:
    T& setX() { /* ... */ return static_cast<T&>(*this); }
};
class Derived : public BuilderBase<Derived> { /* ... */ };
```

## Modern C++ 변형

### 1. Type-state builder (필수 단계 컴파일 타임 강제)

각 단계가 다른 타입을 반환하면 **빠진 단계가 컴파일 에러**.

```cpp
struct NoDough {};
struct DoughSet  { std::string dough; };
struct SauceSet  { std::string dough, sauce; };

class PizzaBuilder {
public:
    static auto start() { return PizzaBuilder<NoDough>{}; }
};

template <typename State>
class TypedBuilder;

template <>
class TypedBuilder<NoDough> {
public:
    TypedBuilder<DoughSet> setDough(std::string d) {
        return {DoughSet{std::move(d)}};
    }
};

template <>
class TypedBuilder<DoughSet> {
    DoughSet state;
public:
    TypedBuilder<SauceSet> setSauce(std::string s) {
        return {{std::move(state.dough), std::move(s)}};
    }
};

template <>
class TypedBuilder<SauceSet> {
    SauceSet state;
public:
    Pizza build() { return Pizza{std::move(state.dough), std::move(state.sauce)}; }
};
```

`setDough` 빼먹고 `build` 호출하면 컴파일 에러.

### 2. Designated initializers (C++20)

단순 집합체엔 굳이 builder 안 만들고:

```cpp
auto p = Pizza{
    .dough    = "thin",
    .sauce    = "tomato",
    .toppings = {"cheese"}
};
```

순서는 *선언 순서대로*. 누락 가능, 기본값 사용. 그러나 검증 없음.

### 3. Named arguments emulation (struct of options)

```cpp
struct PizzaOptions {
    std::string dough = "regular";
    std::string sauce = "tomato";
    std::vector<std::string> toppings = {};
    bool glutenFree = false;
};

Pizza make(PizzaOptions opts);

// 사용
auto p = make({.dough = "thin", .toppings = {"cheese"}});
```

Builder의 가독성 + 단순한 구현. C++20 designated init과 결합하면 매우 깔끔.

### 4. Parameter object + chained validation

```cpp
class PizzaBuilder {
    Pizza pizza;
    std::vector<std::string> errors;
public:
    auto& setDough(std::string d) {
        if (d.empty()) errors.push_back("dough empty");
        else pizza.dough = std::move(d);
        return *this;
    }
    std::expected<Pizza, std::vector<std::string>> build() {
        if (!errors.empty()) return std::unexpected(errors);
        return std::move(pizza);
    }
};
```

C++23 `std::expected`로 오류를 값으로.

### 5. Coroutine builder (DSL)

```cpp
auto build_pizza() -> std::generator<Pizza> {
    Pizza p;
    p.dough = "thin"; co_yield p;
    p.sauce = "tomato"; co_yield p;
    p.toppings.push_back("cheese"); co_yield p;
}
```

각 단계를 generator로 — DSL-like API.

### 6. Template metaprogramming Builder

```cpp
template <typename... Setters>
class Builder {
    // 컴파일 타임에 setter 조합 검증
};
```

복잡하지만 진짜 타입 안전한 DSL 가능. Boost.Hana 스타일.

## C 구현

```c
typedef struct {
    char dough[32];
    char sauce[32];
    char toppings[8][32];
    int  topping_count;
    int  gluten_free;
} Pizza;

typedef struct {
    Pizza pizza;
} PizzaBuilder;

void pb_init(PizzaBuilder* b)                       { memset(b, 0, sizeof *b); }
void pb_set_dough(PizzaBuilder* b, const char* d)   { strncpy(b->pizza.dough, d, 31); }
void pb_add_topping(PizzaBuilder* b, const char* t) {
    if (b->pizza.topping_count < 8)
        strncpy(b->pizza.toppings[b->pizza.topping_count++], t, 31);
}
Pizza pb_build(PizzaBuilder* b) { return b->pizza; }
```

사용:

```c
PizzaBuilder b; pb_init(&b);
pb_set_dough(&b, "thin");
pb_add_topping(&b, "cheese");
Pizza p = pb_build(&b);
```

## 성능 — Builder의 오버헤드

`Pizza` 생성 1000만 번.

| 방식 | 시간 | 비고 |
| --- | --- | --- |
| 직접 생성자 | 50ms | baseline |
| Fluent builder + move | 52ms | 거의 같음 (`*this` 반환은 인라인) |
| Director + virtual Builder | 80ms | 가상 호출 비용 |
| Designated initializer | 50ms | 컴파일러가 직접 init |
| Type-state builder | 50ms | 컴파일 타임에 다 사라짐 |
| `std::function` 콜백 builder | 120ms | 함수 객체 오버헤드 |

Modern fluent + move는 사실상 무료. Director 형태가 가장 비싼 편.

## 트레이드오프 — 한눈에

| 차원 | Builder |
| --- | --- |
| 인자 많은 객체 가독성 | ✅ 매우 좋음 |
| 단계 누락 검증 | ✅ `build()`에서 가능 |
| 불변 객체 생성 | ✅ 자연스러움 |
| 같은 과정 → 다른 결과 | ✅ Director 분리로 |
| 단순 객체에 적용 | ❌ 과도 (보일러플레이트) |
| 단계 강제 (필수 단계 누락 컴파일 에러) | ⚠️ type-state 패턴으로만 가능 |
| Builder 자체의 mutable 상태 | ⚠️ 재사용·쓰레드 안전 주의 |

## 실제 사례

- **`std::stringstream`** — `<<` 체인으로 문자열 조립
- **LLVM의 `IRBuilder`** — IR instruction 단계별 조립
- **Java `StringBuilder`, `Stream.Builder`**
- **Protocol Buffers**의 `Foo.newBuilder()`
- **SwiftUI / Flutter**의 declarative UI builder
- **Lombok `@Builder`** — Java fluent builder 자동 생성
- **Rust `std::process::Command`** — fluent 프로세스 spawn
- **SQL query builder** — Knex.js, SQLAlchemy
- **HTTP client builder** — `HttpRequest.Builder` (Java 11+), reqwest (Rust)

## 관련 패턴

- **[Abstract Factory (item 1)](/blog/programming/design/gof-design-patterns/item01-abstract-factory)** — Abstract Factory는 객체 군을 즉시 반환 / Builder는 단일 복잡 객체를 단계적으로 조립
- **[Composite (item 8)](/blog/programming/design/gof-design-patterns/item08-composite)** — Builder가 만드는 결과가 종종 Composite 트리 구조
- **[Prototype (item 4)](/blog/programming/design/gof-design-patterns/item04-prototype)** — 조립 비용이 크면 Builder 결과를 prototype으로 두고 clone
- **[Pattern Relationships (item 24)](/blog/programming/design/gof-design-patterns/item24-pattern-relationships-overview)** — 생성 패턴 5종 중 "복잡한 단일 객체" 담당
