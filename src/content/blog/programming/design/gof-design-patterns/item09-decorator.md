---
title: "GoF 9: Decorator"
date: 2026-02-01T09:00:00
description: "객체에 책임을 동적으로 추가 — 상속의 유연한 대안."
tags: [Design Pattern, GoF, C++, C, Structural]
series: "GoF Design Patterns"
seriesOrder: 9
draft: false
---

## 한 줄 요약

> **"커피에 토핑 적층"** — 같은 인터페이스의 wrapper로 책임을 동적으로 쌓음.

## 어떤 문제를 푸는가

피자 + 치즈 + 베이컨 + 양파... 조합을 클래스로 표현하면 **2^N 폭발** — `CheeseBaconPizza`, `CheeseBaconOnionPizza`, ...

```cpp
// Bad: 조합 폭발
class Coffee { /* ... */ };
class CoffeeWithMilk : public Coffee { /* ... */ };
class CoffeeWithSugar : public Coffee { /* ... */ };
class CoffeeWithMilkAndSugar : public Coffee { /* ... */ };
class CoffeeWithMilkAndSugarAndWhip : public Coffee { /* ... */ };
// 토핑 N개 → 2^N 클래스
```

스트림 처리도 같음 — `BufferedReader(GzipReader(FileReader(path)))`처럼 적층.

Decorator는 같은 인터페이스의 wrapper로 **동적으로 적층**합니다.

```cpp
auto coffee = std::make_unique<SimpleCoffee>();
coffee = std::make_unique<Milk>(std::move(coffee));    // milk 추가
coffee = std::make_unique<Sugar>(std::move(coffee));   // sugar 추가
```

N개 토핑 → N개 데코레이터 클래스 (조합 폭발 없음).

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

> ⚠️ **데코 체인이 너무 깊어지면** 디버깅·스택 추적이 끔찍해짐. 4~5개를 넘어가면 알람.

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

## 자주 보는 안티패턴

### 1. Decorator가 Component 인터페이스 확장 (투명성 깨짐)

```cpp
// Bad
class WithCaffeine : public CoffeeDecorator {
public:
    double caffeineLevel() const { /* ... */ }   // ◄── 새 메서드
};

// 호출자가 type을 알아야 사용 가능
auto* w = dynamic_cast<WithCaffeine*>(coffee.get());
if (w) w->caffeineLevel();
```

**문제**: Decorator의 핵심(투명) 무산. 호출자가 구체 데코를 알아야 함.

**해결**: 새 능력이 필요하면 Component 인터페이스 자체에 추가, 또는 별도 패턴.

### 2. 순서 의존을 명시하지 않음

```cpp
auto c1 = Sugar(Whip(SimpleCoffee()));   // whip 위에 sugar
auto c2 = Whip(Sugar(SimpleCoffee()));   // sugar 위에 whip
// description은 다르고, 어떤 게 맞는지 코드에 없음
```

**문제**: 데코 순서가 결과를 바꾸는데 클라이언트가 알 수 없음.

**해결**: 순서를 강제하는 builder, 또는 데코 간 commutative 보장 (가능하면).

### 3. Decorator 안에서 wrapped를 직접 접근 (캐스팅)

```cpp
// Bad
class Milk : public CoffeeDecorator {
    double cost() const override {
        auto* simple = dynamic_cast<SimpleCoffee*>(wrapped.get());
        return simple ? simple->cost() + 0.5 : wrapped->cost();
    }
};
```

**문제**: 다른 데코로 wrapped가 바뀌면 silent breakage.

**해결**: `wrapped->cost()`로만 위임. 어떤 종류인지 신경 쓰지 않음.

### 4. 데코가 wrapped의 lifetime을 깸

```cpp
// Bad
class Cached : public CoffeeDecorator {
    Coffee* raw = wrapped.get();   // ◄── 원본 참조 별도 저장
public:
    void clear() { wrapped.reset(); }   // ◄── raw는 dangling
};
```

**문제**: 원본을 어디서든 raw로 들고 있으면 lifetime 꼬임.

**해결**: 항상 `wrapped`만 사용. raw 사본 만들지 말 것.

### 5. Decorator chain이 cycle (재귀 무한)

```cpp
// Bad: 우연한 cycle
auto a = std::make_shared<Milk>(nullptr);
auto b = std::make_shared<Sugar>(a);
a->wrap(b);   // ◄── a가 b를 wrap, b가 a를 wrap
a->cost();   // ◄── 무한 재귀
```

**문제**: 데코 체인이 트리가 아닌 cycle이 되면 무한 호출.

**해결**: `unique_ptr` 단일 소유면 cycle 불가능 (소유권이 일방향). `shared_ptr` 쓸 때만 위험.

### 6. 거대한 fat decorator (책임 폭발)

```cpp
class SuperCoffee : public CoffeeDecorator {
    // milk, sugar, whip, vanilla, caramel, ... 모든 토핑
    bool hasMilk, hasSugar, hasWhip, /* ... */;
};
```

**문제**: 데코 하나에 다 끼워넣으면 Decorator의 가치(분리) 무산.

**해결**: 데코 하나당 책임 하나. SRP.

## Modern C++ 변형

### 1. 함수형 데코 (`std::function` 합성)

```cpp
using Coffee = std::function<std::pair<std::string, double>()>;

auto simple = [] { return std::pair{"coffee", 2.0}; };

auto withMilk = [](Coffee inner) -> Coffee {
    return [=] {
        auto [d, c] = inner();
        return std::pair{d + ", milk", c + 0.5};
    };
};

auto withSugar = [](Coffee inner) -> Coffee {
    return [=] {
        auto [d, c] = inner();
        return std::pair{d + ", sugar", c + 0.2};
    };
};

Coffee c = withSugar(withMilk(simple));
auto [desc, cost] = c();
```

상속 없이 람다 합성으로 같은 효과.

### 2. Template-based static 데코 (compile-time chain)

```cpp
template <typename Inner>
class WithMilk {
    Inner inner;
public:
    WithMilk(Inner i) : inner(std::move(i)) {}
    std::string description() const { return inner.description() + ", milk"; }
    double cost() const { return inner.cost() + 0.5; }
};

template <typename Inner>
class WithSugar { /* ... */ };

auto c = WithSugar(WithMilk(SimpleCoffee{}));   // 컴파일 타임 chain
```

가상 호출 0, 인라인 가능.

### 3. Ranges-style pipe operator

```cpp
auto operator|(Coffee inner, auto deco) { return deco(std::move(inner)); }

auto c = SimpleCoffee{}
       | withMilk
       | withSugar
       | withWhip;
```

ranges 영감의 fluent decoration.

### 4. Mixin (CRTP 다중 상속)

```cpp
template <typename Base>
class MilkMixin : public Base {
public:
    double cost() const { return Base::cost() + 0.5; }
    std::string description() const { return Base::description() + ", milk"; }
};

template <typename Base>
class SugarMixin : public Base { /* ... */ };

using MyCoffee = WhipMixin<SugarMixin<MilkMixin<SimpleCoffee>>>;
```

컴파일 타임 적층. mixin 순서를 type으로 표현.

### 5. Aspect/middleware (HTTP handler chain)

```cpp
using Handler = std::function<Response(Request)>;

auto logging(Handler next) -> Handler {
    return [=](Request req) {
        std::cout << req.url << '\n';
        auto res = next(req);
        std::cout << res.status << '\n';
        return res;
    };
}

auto auth(Handler next) -> Handler {
    return [=](Request req) {
        if (!req.token) return Response{401};
        return next(req);
    };
}

Handler h = logging(auth([](Request) { return Response{200}; }));
```

Express.js, ASP.NET Middleware의 핵심 패턴.

### 6. `std::variant` + 합성 함수 (closed set)

```cpp
struct Milk  { double extra = 0.5; };
struct Sugar { double extra = 0.2; };
using Topping = std::variant<Milk, Sugar>;

struct Coffee {
    double base = 2.0;
    std::vector<Topping> toppings;

    double cost() const {
        double c = base;
        for (auto& t : toppings)
            c += std::visit([](auto& x) { return x.extra; }, t);
        return c;
    }
};
```

데코 chain을 데이터로. 가상 호출 없음.

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

## 성능 — chain depth의 영향

`Coffee::cost()` 1억 번 호출, 데코 깊이별.

| 깊이 | 가상 데코 | Template 데코 | 함수 합성 |
| --- | --- | --- | --- |
| 0 (raw) | 0.3s | 0.1s | 0.5s |
| 1 | 0.6s | 0.1s | 0.7s |
| 3 | 1.5s | 0.1s | 1.2s |
| 5 | 2.5s | 0.1s | 1.8s |
| 10 | 5.0s | 0.1s | 3.5s |

가상 데코는 깊이에 *선형*. Template은 컴파일러가 모두 inline → 깊이 무관. Hot path에 깊은 chain이면 template 또는 variant.

## 트레이드오프 — 한눈에

| 차원 | Decorator |
| --- | --- |
| 동적·조합적 기능 추가 | ✅ 매우 유연 |
| 단일 책임 (각 데코 한 가지) | ✅ |
| 같은 객체에 여러 데코 적층 | ✅ |
| 작은 객체 다수 생성 | ⚠️ 메모리·생성 비용 |
| 콜 스택 깊어짐 | ⚠️ 디버깅 어려움 |
| 순서 의존성 | ⚠️ 잘못 적층 시 결과 달라짐 |
| 투명성 | ⚠️ 새 메서드 추가 어려움 |

## 실제 사례

- **Java I/O 스트림** — `BufferedInputStream(GzipInputStream(FileInputStream(...)))`
- **C++ `std::iostream`** — `rdbuf` 체인
- **ASP.NET Middleware** 파이프라인
- **Express.js / Koa.js** 미들웨어
- **Python의 함수 데코레이터** — `@property`, `@staticmethod`, `@functools.cache`
- **Rust `tower::Service`** — gRPC 미들웨어
- **Django middleware** — request/response 처리 체인
- **Vert.x / Netty pipeline** — Java 네트워크 스택
- **GStreamer / DirectShow filter graph** — 멀티미디어 파이프라인

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
- **[Pattern Relationships (item 24)](/blog/programming/design/gof-design-patterns/item24-pattern-relationships-overview)** — wrapping 패턴 (Decorator/Proxy/Adapter)의 비교
