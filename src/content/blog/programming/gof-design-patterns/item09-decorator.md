---
title: "GoF 9: Decorator"
date: 2026-02-02T13:00:00
description: "객체에 책임을 동적으로 추가 — 상속의 유연한 대안."
tags: [Design Pattern, GoF, C++, C, Structural]
series: "GoF Design Patterns"
seriesOrder: 9
draft: true
---

> **초안** — 정리 진행 중

## 의도

객체에 새 책임을 **동적으로** 추가. 기능 확장 측면에서 **서브클래싱의 유연한 대안**.

## 동기

피자 + 치즈 + 베이컨 + 양파... 각 조합마다 클래스 만들면 폭발. Decorator는 같은 인터페이스의 wrapper로 동적으로 쌓음.

## C++ 구현

```cpp
class Coffee {
public:
    virtual ~Coffee() = default;
    virtual std::string description() const = 0;
    virtual double cost() const = 0;
};

class SimpleCoffee : public Coffee {
public:
    std::string description() const override { return "coffee"; }
    double cost() const override { return 2.0; }
};

// 데코레이터 base
class CoffeeDecorator : public Coffee {
protected:
    std::unique_ptr<Coffee> wrapped;
public:
    explicit CoffeeDecorator(std::unique_ptr<Coffee> c) : wrapped(std::move(c)) {}
};

class Milk : public CoffeeDecorator {
public:
    using CoffeeDecorator::CoffeeDecorator;
    std::string description() const override { return wrapped->description() + ", milk"; }
    double cost() const override { return wrapped->cost() + 0.5; }
};

class Sugar : public CoffeeDecorator {
public:
    using CoffeeDecorator::CoffeeDecorator;
    std::string description() const override { return wrapped->description() + ", sugar"; }
    double cost() const override { return wrapped->cost() + 0.2; }
};

// 사용 — 동적 조립
auto c = std::make_unique<SimpleCoffee>();
auto withMilk = std::make_unique<Milk>(std::move(c));
auto withMilkSugar = std::make_unique<Sugar>(std::move(withMilk));

std::cout << withMilkSugar->description() << ": $" << withMilkSugar->cost() << '\n';
// "coffee, milk, sugar: $2.7"
```

순서를 바꾸거나 일부만 적용 가능 — 상속 트리 추가 없이.

## C 구현

```c
typedef struct Coffee {
    char* (*description)(struct Coffee*);
    double (*cost)(struct Coffee*);
} Coffee;

typedef struct {
    Coffee base;
    Coffee* wrapped;
} Decorator;

// Milk
char* milk_desc(Coffee* self) {
    Decorator* d = (Decorator*)self;
    char* inner = d->wrapped->description(d->wrapped);
    char* result = malloc(strlen(inner) + 32);
    sprintf(result, "%s, milk", inner);
    free(inner);
    return result;
}
```

## 트레이드오프

- **장점**: 동적·조합적 기능 확장, 단일 책임 원칙 (각 데코레이터 한 가지)
- **단점**: 작은 객체가 많아짐, 디버깅 시 콜 스택 깊음, 순서 의존성
