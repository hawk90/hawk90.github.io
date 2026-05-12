---
title: "GoF 9: Decorator"
date: 2026-02-02T13:00:00
description: "객체에 책임을 동적으로 추가 — 상속의 유연한 대안."
tags: [Design Pattern, GoF, C++, C, Structural]
series: "GoF Design Patterns"
seriesOrder: 9
---

## 한 줄 요약

> **"커피에 토핑 적층"** — 같은 인터페이스의 wrapper로 책임을 동적으로 쌓음.

## 어떤 문제를 푸는가

피자 + 치즈 + 베이컨 + 양파... 조합을 클래스로 표현하면 **2^N 폭발** — `CheeseBaconPizza`, `CheeseBaconOnionPizza`, ...

스트림 처리도 같음 — `BufferedReader(GzipReader(FileReader(path)))`처럼 적층.

Decorator는 같은 인터페이스의 wrapper로 **동적으로 적층**합니다.

```cpp
auto coffee = std::make_unique<SimpleCoffee>();
coffee = std::make_unique<Milk>(std::move(coffee));    // milk 추가
coffee = std::make_unique<Sugar>(std::move(coffee));   // sugar 추가
```

## 한눈에 보는 구조

<img src="/images/blog/gof/diagrams/item09-decorator.svg" alt="Decorator 패턴 클래스 다이어그램" style="max-width:100%; background:white; padding:8px; border-radius:6px;" />

Decorator도 Component 구현. 내부에 **다른 Component를 보유** → 위임 + 추가 동작.

## 언제 쓰면 좋은가

- 개별 객체에 책임을 **동적·투명**하게 추가
- 책임을 **제거**할 수도 있어야 할 때
- 서브클래싱 확장이 비실용적일 때 (조합 폭발)

## 언제 쓰면 안 되나

> ⚠️ **고정된 조합 몇 개**라면 그냥 서브클래스가 단순.

> ⚠️ **순서 의존성** — Sugar→Whip vs Whip→Sugar 결과가 달라지는 경우 의도치 않게 망가지기 쉬움.

## C++ 구현

### 1. Component 인터페이스

```cpp
class Coffee {
public:
    virtual ~Coffee() = default;
    virtual std::string description() const = 0;
    virtual double      cost() const = 0;
};
```

### 2. ConcreteComponent — 시작점

```cpp
class SimpleCoffee : public Coffee {
public:
    std::string description() const override { return "coffee"; }
    double      cost() const override        { return 2.0; }
};
```

### 3. Decorator base — wrapped 보유

```cpp
class CoffeeDecorator : public Coffee {
protected:
    std::unique_ptr<Coffee> wrapped;
public:
    explicit CoffeeDecorator(std::unique_ptr<Coffee> c) : wrapped(std::move(c)) {}
};
```

### 4. ConcreteDecorator — 위임 + 추가

```cpp
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
```

### 5. 동적 조립

```cpp
auto c = std::make_unique<SimpleCoffee>();
auto withMilk      = std::make_unique<Milk>(std::move(c));
auto withMilkSugar = std::make_unique<Sugar>(std::move(withMilk));
auto full          = std::make_unique<Whip>(std::move(withMilkSugar));

std::cout << full->description() << ": $" << full->cost();
// "coffee, milk, sugar, whip: $3.4"
```

순서를 바꾸거나 일부만 적용 가능 — **상속 트리 추가 없이**.

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
```

## 트레이드오프 — 한눈에

| 차원 | Decorator |
| --- | --- |
| 동적·조합적 기능 추가 | ✅ 매우 유연 |
| 단일 책임 (각 데코 한 가지) | ✅ |
| 같은 객체에 여러 데코 적층 | ✅ |
| 작은 객체 다수 생성 | ⚠️ 메모리·생성 비용 |
| 콜 스택 깊어짐 | ⚠️ 디버깅 어려움 |
| 순서 의존성 | ⚠️ 잘못 적층 시 결과 달라짐 |

## 실제 사례

- **Java I/O 스트림** (`BufferedInputStream(FileInputStream(...))`)
- **C++ `std::iostream`** (rdbuf 체인)
- **ASP.NET Middleware** 파이프라인
- **Express.js / Koa.js** 미들웨어
- **Python의 함수 데코레이터** (`@property`, `@staticmethod`)

## Decorator vs Proxy vs Adapter — 비교

| | Decorator | Proxy | Adapter |
| --- | --- | --- | --- |
| 인터페이스 | 동일 | 동일 | 변환 |
| 의도 | 책임 추가 | 접근 제어 | 호환성 |
| wrapping | ✅ | ✅ | ✅ |

구조 비슷, **의도 다름**.

## 관련 패턴

- **[Adapter (item 6)](/blog/programming/design/gof-design-patterns/item06-adapter)** — Adapter는 인터페이스 변환, Decorator는 인터페이스 유지 + 책임 추가
- **[Composite (item 8)](/blog/programming/design/gof-design-patterns/item08-composite)** — Decorator는 Composite의 degenerate한 형태 (자식 1개)
- **[Strategy (item 21)](/blog/programming/design/gof-design-patterns/item21-strategy)** — Strategy는 알고리즘 통째 교체, Decorator는 점진적 추가
- **[Proxy (item 12)](/blog/programming/design/gof-design-patterns/item12-proxy)** — 구조 동일, 의도 다름. Proxy는 접근 제어
- **[Chain of Responsibility (item 13)](/blog/programming/design/gof-design-patterns/item13-chain-of-responsibility)** — Decorator는 항상 작업 수행, CoR은 처리하거나 패스
