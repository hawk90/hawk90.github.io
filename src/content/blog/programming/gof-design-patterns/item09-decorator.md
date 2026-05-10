---
title: "GoF 9: Decorator"
date: 2026-02-02T13:00:00
description: "객체에 책임을 동적으로 추가 — 상속의 유연한 대안."
tags: [Design Pattern, GoF, C++, C, Structural]
series: "GoF Design Patterns"
seriesOrder: 9
draft: true
---

## 의도

객체에 새 책임을 **동적으로** 추가합니다. 기능 확장 측면에서 **서브클래싱의 유연한 대안**.

## 동기

피자에 토핑 (치즈, 베이컨, 양파, 페퍼로니, ...) 조합을 클래스로 다루면 폭발 — `CheeseBaconPizza`, `CheeseBaconOnionPizza`, ... 2^N 개. Decorator는 같은 인터페이스의 wrapper로 동적으로 적층합니다.

스트림 처리도 같은 패턴 — `BufferedReader(GzipReader(FileReader(path)))`처럼.

## 적용 가능성

- 개별 객체에 책임을 동적으로·투명하게 추가하고 싶을 때
- 책임을 제거할 수도 있어야 할 때
- 서브클래싱 확장이 비실용적일 때 (조합 폭발)

## 구조

```
   Component (interface)
   + operation()*
        △
        │
   ┌────┴────┐
ConcComp  Decorator ◇──► Component
              + op()
                  △
                  │
            ConcDecorA, ConcDecorB
              + op()      + op()
              + addedBehavior()
```

## 참여자

- **Component** — 공통 인터페이스
- **ConcreteComponent** — 데코레이션 대상 객체
- **Decorator** — Component 인터페이스 구현 + Component 참조 보유
- **ConcreteDecorator** — 추가 책임 구현

## C++ 구현

```cpp
class Coffee {
public:
    virtual ~Coffee() = default;
    virtual std::string description() const = 0;
    virtual double      cost() const = 0;
};

class SimpleCoffee : public Coffee {
public:
    std::string description() const override { return "coffee"; }
    double      cost() const override        { return 2.0; }
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
    double      cost() const override        { return wrapped->cost() + 0.5; }
};

class Sugar : public CoffeeDecorator {
public:
    using CoffeeDecorator::CoffeeDecorator;
    std::string description() const override { return wrapped->description() + ", sugar"; }
    double      cost() const override        { return wrapped->cost() + 0.2; }
};

class Whip : public CoffeeDecorator {
public:
    using CoffeeDecorator::CoffeeDecorator;
    std::string description() const override { return wrapped->description() + ", whip"; }
    double      cost() const override        { return wrapped->cost() + 0.7; }
};

// 사용 — 동적 조립
auto c = std::make_unique<SimpleCoffee>();
auto withMilk = std::make_unique<Milk>(std::move(c));
auto withMilkSugar = std::make_unique<Sugar>(std::move(withMilk));
auto withMilkSugarWhip = std::make_unique<Whip>(std::move(withMilkSugar));

std::cout << withMilkSugarWhip->description() << ": $" << withMilkSugarWhip->cost();
// "coffee, milk, sugar, whip: $3.4"
```

순서를 바꾸거나 일부만 적용 가능 — 상속 트리 추가 없이.

## C 구현

```c
typedef struct Coffee {
    char*  (*description)(struct Coffee*);
    double (*cost)(struct Coffee*);
    void   (*destroy)(struct Coffee*);
} Coffee;

typedef struct {
    Coffee  base;
    Coffee* wrapped;
} Decorator;

// Milk
static char* milk_desc(Coffee* self) {
    Decorator* d = (Decorator*)self;
    char* inner = d->wrapped->description(d->wrapped);
    char* result = malloc(strlen(inner) + 32);
    sprintf(result, "%s, milk", inner);
    free(inner);
    return result;
}

static double milk_cost(Coffee* self) {
    Decorator* d = (Decorator*)self;
    return d->wrapped->cost(d->wrapped) + 0.5;
}

static void milk_destroy(Coffee* self) {
    Decorator* d = (Decorator*)self;
    d->wrapped->destroy(d->wrapped);     // 재귀적 해제
    free(d);
}
```

## 결과 (트레이드오프)

**장점**
- 동적·조합적 기능 확장
- 단일 책임 원칙 (각 데코레이터 한 가지 책임)
- 같은 객체에 여러 데코레이터 적층 가능
- 클라이언트가 데코된 객체 안 보임 (투명성)

**단점**
- 작은 객체가 많아짐
- 디버깅 시 콜 스택 깊음
- 순서 의존성 (Sugar 먼저 vs Whip 먼저 결과 다를 수도)
- Component 인터페이스 변경에 모든 Decorator 영향

## 변형

- **Mixin (CRTP)** — 컴파일 타임 데코레이터. 런타임 비용 없음
- **Filter chain** — 단방향만 (스트림 처리)

## 알려진 사용 사례

- Java I/O 스트림 (`BufferedInputStream(FileInputStream(...))`)
- C++ `std::iostream` (rdbuf 체인)
- ASP.NET Middleware 파이프라인
- Express.js / Koa.js 미들웨어

## 관련 패턴

- **[Adapter (item 6)](/blog/programming/gof-design-patterns/item06-adapter)** — Adapter는 인터페이스 변환, Decorator는 인터페이스 유지하며 책임 추가
- **[Composite (item 8)](/blog/programming/gof-design-patterns/item08-composite)** — Decorator는 Composite의 degenerate한 형태 (자식 1개)
- **[Strategy (item 21)](/blog/programming/gof-design-patterns/item21-strategy)** — Strategy는 알고리즘을 통째 교체, Decorator는 점진적 추가
- **[Proxy (item 12)](/blog/programming/gof-design-patterns/item12-proxy)** — 구조 동일, 의도 다름. Proxy는 접근 제어, Decorator는 책임 추가
- **[Chain of Responsibility (item 13)](/blog/programming/gof-design-patterns/item13-chain-of-responsibility)** — Decorator는 항상 작업 수행, CoR은 처리하거나 다음으로 패스
