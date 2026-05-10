---
title: "GoF 2: Builder"
date: 2026-02-01T11:00:00
description: "복잡한 객체 생성을 단계별로 — 같은 과정으로 다른 표현 만들기."
tags: [Design Pattern, GoF, C++, C, Creational]
series: "GoF Design Patterns"
seriesOrder: 2
draft: true
---

> **초안** — 정리 진행 중

## 의도

복잡한 객체의 생성과 표현을 분리 — 같은 생성 과정으로 다른 결과를 만들 수 있게 함.

## 언제 쓰나

- 객체 생성 알고리즘이 부품 조립 방식과 독립이어야 할 때
- 한 생성 과정으로 여러 표현이 필요할 때
- 생성자에 인자가 너무 많을 때 (telescoping constructor 회피)

## C++ 구현 — fluent interface

```cpp
class Pizza {
public:
    std::string dough;
    std::string sauce;
    std::vector<std::string> toppings;
};

class PizzaBuilder {
    Pizza pizza;
public:
    PizzaBuilder& setDough(std::string d)  { pizza.dough = std::move(d);  return *this; }
    PizzaBuilder& setSauce(std::string s)  { pizza.sauce = std::move(s);  return *this; }
    PizzaBuilder& addTopping(std::string t){ pizza.toppings.push_back(std::move(t)); return *this; }
    Pizza build() { return std::move(pizza); }
};

// 사용
auto p = PizzaBuilder()
            .setDough("thin")
            .setSauce("tomato")
            .addTopping("cheese")
            .addTopping("basil")
            .build();
```

## C++ 구현 — 전통 GoF (Director + Builder)

```cpp
class PizzaBuilder {
public:
    virtual ~PizzaBuilder() = default;
    virtual void buildDough() = 0;
    virtual void buildSauce() = 0;
    virtual Pizza getResult() = 0;
};

class HawaiianBuilder : public PizzaBuilder { /* 구체 단계들 */ };

class Director {
    PizzaBuilder* builder;
public:
    void construct() {
        builder->buildDough();
        builder->buildSauce();
    }
};
```

Director가 알고리즘(순서)을, Builder가 표현을 담당.

## C 구현 (sub)

```c
typedef struct {
    char dough[32];
    char sauce[32];
    char toppings[8][32];
    int  topping_count;
} Pizza;

typedef struct PizzaBuilder {
    Pizza pizza;
} PizzaBuilder;

void pb_init(PizzaBuilder* b) { memset(b, 0, sizeof *b); }
void pb_set_dough(PizzaBuilder* b, const char* d) { strncpy(b->pizza.dough, d, 31); }
void pb_add_topping(PizzaBuilder* b, const char* t) {
    if (b->pizza.topping_count < 8)
        strncpy(b->pizza.toppings[b->pizza.topping_count++], t, 31);
}
Pizza pb_build(PizzaBuilder* b) { return b->pizza; }

// 사용
PizzaBuilder b; pb_init(&b);
pb_set_dough(&b, "thin");
pb_add_topping(&b, "cheese");
Pizza p = pb_build(&b);
```

## 트레이드오프

- **장점**: 생성 과정 단계화, 같은 코드로 다른 결과, 가독성
- **단점**: 보일러플레이트, 단순 객체엔 과도
