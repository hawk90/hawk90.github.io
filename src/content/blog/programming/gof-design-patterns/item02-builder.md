---
title: "GoF 2: Builder"
date: 2026-02-01T11:00:00
description: "복잡한 객체를 단계별로 조립 — 같은 과정으로 다른 결과를 만든다."
tags: [Design Pattern, GoF, C++, C, Creational]
series: "GoF Design Patterns"
seriesOrder: 2
---

## 한 줄 요약

> **"인자 폭탄 생성자를 단계별 조립으로"** — `new Pizza(true, false, "thin", ...)` 대신 `Pizza().setDough().addTopping()...build()`.

## 어떤 문제를 푸는가

생성자에 인자가 너무 많아질 때 — 의도가 코드에서 사라집니다.

```cpp
// 안티패턴: 인자 폭탄
Pizza p(true, false, true, false, "thin", "tomato", 12, false);
//      ^ 각 인자가 무슨 뜻??
```

Builder는 단계별 메서드로 같은 일을 명확하게 합니다.

```cpp
auto p = PizzaBuilder()
            .setDough("thin")
            .setSauce("tomato")
            .addTopping("cheese")
            .build();
```

같은 객체지만 **읽힙니다**.

## 한눈에 보는 구조

두 가지 형태가 있습니다.

**모던 fluent 형태** (자주 쓰임):
```
Builder ── 메서드 체인 ── build() ──► Product
```

**전통 GoF 형태** (Director가 순서를 통제):
```
Director ──► Builder (interface)
                △
                │
        ConcreteBuilder ──► Product
```

Director는 "어떤 순서로 부품을 조립할까", Builder는 "각 부품을 어떻게 만들까".

## 언제 쓰면 좋은가

- 생성자 인자가 4~5개를 넘어가는 객체
- **단계별 조립**이 자연스러운 도메인 (HTML, SQL, 메뉴, 설정)
- 같은 알고리즘으로 **다른 표현**을 만들고 싶을 때 (HTML/PDF/JSON 변환기)
- **불변 객체**를 만들 때 (build 후 변경 불가)

## 언제 쓰면 안 되나

> ⚠️ **단순한 객체엔 과도** — 인자 1~2개면 그냥 생성자.

> ⚠️ **C++20 designated initializers**가 더 깔끔할 때도 있음 (집합체 초기화).

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

## 트레이드오프 — 한눈에

| 차원 | Builder |
| --- | --- |
| 인자 많은 객체 가독성 | ✅ 매우 좋음 |
| 단계 누락 검증 | ✅ `build()`에서 가능 |
| 불변 객체 생성 | ✅ 자연스러움 |
| 같은 과정 → 다른 결과 | ✅ Director 분리로 |
| 단순 객체에 적용 | ❌ 과도 (보일러플레이트) |
| 단계 강제 (필수 단계 누락 컴파일 에러) | ⚠️ type-state 패턴으로만 가능 |

## 모던 C++ 변형

### type-safe builder

각 단계가 다른 타입을 반환하면 **빠진 단계가 컴파일 에러**.

```cpp
class PizzaBuilder_NoDough { /* setDough만 가능 */ };
class PizzaBuilder_NoSauce { /* setSauce, addTopping만 */ };
// ...
```

복잡하지만 강력한 타입 안전.

### designated initializers (C++20)

단순 집합체엔 굳이 builder 안 만들고:

```cpp
auto p = Pizza{
    .dough    = "thin",
    .sauce    = "tomato",
    .toppings = {"cheese"}
};
```

## 실제 사례

- `std::stringstream` (`<<` 체인으로 문자열 조립)
- LLVM의 `IRBuilder`
- Java `StringBuilder`, `Stream.Builder`
- Protocol Buffers의 `Foo.newBuilder()`
- SwiftUI / Flutter의 declarative UI builder

## 관련 패턴

- **[Abstract Factory (item 1)](/blog/programming/gof-design-patterns/item01-abstract-factory)** — Abstract Factory는 객체 군을 즉시 반환 / Builder는 단일 복잡 객체를 단계적으로 조립
- **[Composite (item 8)](/blog/programming/gof-design-patterns/item08-composite)** — Builder가 만드는 결과가 종종 Composite 트리 구조
- **[Prototype (item 4)](/blog/programming/gof-design-patterns/item04-prototype)** — 조립 비용이 크면 Builder 결과를 prototype으로 두고 clone
