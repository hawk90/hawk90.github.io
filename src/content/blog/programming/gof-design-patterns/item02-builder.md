---
title: "GoF 2: Builder"
date: 2026-02-01T11:00:00
description: "복잡한 객체 생성을 단계별로 분리 — 같은 과정으로 다른 표현을 만들 수 있다."
tags: [Design Pattern, GoF, C++, C, Creational]
series: "GoF Design Patterns"
seriesOrder: 2
draft: true
---

## 의도

복잡한 객체의 **생성 과정**과 **표현**을 분리합니다. 같은 생성 과정으로 다른 표현을 만들 수 있게 합니다.

## 동기

생성자에 인자가 너무 많아질 때(telescoping constructor 안티패턴), 또는 객체 생성에 여러 단계의 결정이 필요할 때 — 단순 생성자로는 명확하게 표현하기 어렵습니다.

```cpp
// 안티패턴 — 인자 폭탄
Pizza p(true, false, true, false, "thin", "tomato", 12, false);
//      ^ 각 인자가 무슨 뜻?
```

Builder는 단계별로 메서드를 호출하며 의도를 명확히 표현합니다.

```cpp
auto p = PizzaBuilder()
            .setDough("thin")
            .setSauce("tomato")
            .addTopping("cheese")
            .build();
```

## 적용 가능성

- 객체 생성 알고리즘이 부품 조립 방식과 독립이어야 할 때
- 한 생성 과정으로 여러 표현이 필요할 때 (HTML/JSON exporter 등)
- 생성자에 인자가 너무 많을 때
- 단계별 검증·조건부 단계가 필요할 때

## 구조

전통 GoF 형태:
```
Director ──> Builder (abstract)
              △
              │
       ConcreteBuilder ──> Product
```

모던 fluent 형태:
```
Builder ── 메서드 체인 ── build() ──> Product
```

## 참여자

- **Builder** — 제품의 부품을 만드는 추상 인터페이스
- **ConcreteBuilder** — Builder 구현, 부품 조립, 결과 추적
- **Director** — 생성 알고리즘(순서) 담당
- **Product** — 만들어지는 복잡한 객체

## C++ 구현 — fluent (모던)

```cpp
struct Pizza {
    std::string              dough;
    std::string              sauce;
    std::vector<std::string> toppings;
    bool                     glutenFree = false;
};

class PizzaBuilder {
    Pizza pizza;
public:
    PizzaBuilder& setDough(std::string d)   { pizza.dough = std::move(d); return *this; }
    PizzaBuilder& setSauce(std::string s)   { pizza.sauce = std::move(s); return *this; }
    PizzaBuilder& addTopping(std::string t) { pizza.toppings.push_back(std::move(t)); return *this; }
    PizzaBuilder& makeGlutenFree()          { pizza.glutenFree = true; return *this; }
    Pizza build()                           { return std::move(pizza); }
};

// 사용
auto p = PizzaBuilder()
            .setDough("thin")
            .setSauce("tomato")
            .addTopping("cheese")
            .addTopping("basil")
            .makeGlutenFree()
            .build();
```

## C++ 구현 — 전통 GoF (Director + Builder)

```cpp
class PizzaBuilder {
public:
    virtual ~PizzaBuilder() = default;
    virtual void buildDough() = 0;
    virtual void buildSauce() = 0;
    virtual void buildToppings() = 0;
    virtual Pizza getResult() = 0;
};

class HawaiianPizzaBuilder : public PizzaBuilder {
    Pizza pizza;
public:
    void buildDough()    override { pizza.dough = "regular"; }
    void buildSauce()    override { pizza.sauce = "tomato"; }
    void buildToppings() override { pizza.toppings = {"ham", "pineapple"}; }
    Pizza getResult()    override { return std::move(pizza); }
};

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

Director가 알고리즘(순서), Builder가 표현(어떤 재료) — 분리.

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
void pb_set_sauce(PizzaBuilder* b, const char* s)   { strncpy(b->pizza.sauce, s, 31); }
void pb_add_topping(PizzaBuilder* b, const char* t) {
    if (b->pizza.topping_count < 8)
        strncpy(b->pizza.toppings[b->pizza.topping_count++], t, 31);
}
Pizza pb_build(PizzaBuilder* b)                     { return b->pizza; }

// 사용
PizzaBuilder b; pb_init(&b);
pb_set_dough(&b, "thin");
pb_add_topping(&b, "cheese");
Pizza p = pb_build(&b);
```

## 결과 (트레이드오프)

**장점**
- 생성 과정의 단계가 명시적·검증 가능
- 같은 알고리즘으로 다른 표현 (HTML/PDF/JSON exporter)
- telescoping constructor 회피
- 불변 객체 만들기에 적합 (build() 후 변경 불가)

**단점**
- 보일러플레이트 (작은 객체엔 과도)
- 단계 누락 위험 (`build()` 시점 검증 필요)

## 변형

- **fluent interface** — 메서드 체인 + `*this` 반환 (현대 C++의 표준 형태)
- **named arguments emulation** — Builder를 통한 키워드 인자 흉내
- **type-safe builder** — 단계별로 다른 타입 반환해 컴파일 타임에 누락된 단계 검출
- **C++20 designated initializers** — 단순 집합체에는 builder 대신 사용 가능

## 알려진 사용 사례

- `std::stringstream` (문자열 단계 조립)
- LLVM의 `IRBuilder`
- Java `StringBuilder`, `Stream.Builder`
- Protocol Buffers 생성된 builder 클래스

## 관련 패턴

- **[Abstract Factory (item 1)](/blog/programming/gof-design-patterns/item01-abstract-factory)** — Abstract Factory도 객체 생성이지만, 객체 군의 즉시 반환에 집중. Builder는 단일 복잡 객체의 단계별 조립
- **[Composite (item 8)](/blog/programming/gof-design-patterns/item08-composite)** — Builder가 만드는 복잡한 객체가 종종 Composite 구조
- **[Prototype (item 4)](/blog/programming/gof-design-patterns/item04-prototype)** — 객체 생성 비용이 크면 Builder의 결과를 prototype으로 두고 clone
