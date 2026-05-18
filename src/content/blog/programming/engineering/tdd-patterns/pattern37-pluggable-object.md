---
title: "Pattern 37: Pluggable Object"
date: 2026-07-02T13:00:00
description: "If-statement 변종 — 객체 교체로 동작 변경. Strategy 패턴의 정신."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 37
tags: [tdd, beck, pluggable-object]
draft: true
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> 조건문 대신 *교체 가능한 객체* 사용. *런타임 동작 변경* + *Composition over inheritance*.

## 동기 (Motivation)

조건문 곳곳:

```python
def process(mode):
    if mode == "dev":
        log_to_console()
    else:
        log_to_server()
    # ... if mode 또
```

**Pluggable Object**는 조건문을 *객체 교체*로.

### 신호

- 같은 *type/mode 분기*가 여러 곳.
- 환경/설정에 따른 *비슷한 변형*.
- *테스트에서 dependency 교체* 어려움.
- 런타임 *동작 변경* 필요.

### Strategy 패턴과 동일

Pluggable Object는 GoF *Strategy 패턴*의 정신.

### 언제 적용하는가

- 분기가 *3+ 곳에 반복*.
- *런타임 변경* 필요.
- *테스트에서 fake 주입*.
- 환경별 *configuration*.

### 언제 적용하지 않는가

- 단순 *static 분기 한 곳*.
- 종류가 *2-3개 + 안 변함*.

## 절차 (Mechanics)

1. **공통 interface** 정의.
2. **각 종류 class** 구현.
3. main class가 *interface field* 보유.
4. 호출처가 *interface method 호출*.
5. *생성 시 적절한 구현 주입*.

## 예시 1 — Payment gateway

```python
class PaymentGateway:
    def charge(self, amount): raise NotImplementedError

class RealGateway(PaymentGateway):
    def charge(self, amount):
        return stripe.charge(amount)

class FakeGateway(PaymentGateway):
    def charge(self, amount):
        return {"status": "success", "fake": True}

class PaymentProcessor:
    def __init__(self, gateway):
        self.gateway = gateway   # Pluggable
    def process(self, amount):
        return self.gateway.charge(amount)

# 사용
prod = PaymentProcessor(RealGateway())
test = PaymentProcessor(FakeGateway())
```

테스트에서 *fake gateway 주입*.

## 예시 2 — Strategy 알고리즘

```python
class SortStrategy:
    def sort(self, data): raise NotImplementedError

class QuickSort(SortStrategy):
    def sort(self, data): return quick_sort(data)

class MergeSort(SortStrategy):
    def sort(self, data): return merge_sort(data)

class Sorter:
    def __init__(self, strategy):
        self.strategy = strategy
    def sort(self, data):
        return self.strategy.sort(data)

# 런타임 변경
sorter.strategy = MergeSort()
```

## 예시 3 — 다차원 조합

```python
class OrderProcessor:
    def __init__(self, validator, pricing, notifier):
        self.validator = validator
        self.pricing = pricing
        self.notifier = notifier

    def process(self, order):
        self.validator.validate(order)
        total = self.pricing.calculate(order)
        self.notifier.notify(order)
        return total

# 다양한 조합
processor = OrderProcessor(
    StrictValidator(),
    DiscountPricing(),
    EmailNotifier()
)
```

각 *책임이 plug-in* — 자유로운 조합.

## 자주 보는 안티패턴

### 1. *Strategy가 단지 함수 wrapper*
class가 *함수 하나만* — 그냥 *함수 전달*이 단순.

### 2. *모든 분기를 Pluggable*
간단한 한 곳 분기까지 → boilerplate. 진짜 *반복 + 변경*만.

### 3. *Tight coupling*
Strategy가 *호스트 class에 강결합* → 진짜 plug-in 아님. interface 명확.

### 4. *너무 많은 strategy*
20+ strategies → 관리 부담. *grouping* 또는 *factory*.

### 5. *Plug-in 순서 의존*
여러 strategy가 *특정 순서로* 호출되어야 → 깨지면 silent. 명시.

### 6. *Concurrent strategy mutation*
multi-thread에서 strategy *동적 교체* → race. immutable strategy.

## Modern variants

### Functional strategy (closure)

```python
def make_processor(charge_fn):
    def process(amount):
        return charge_fn(amount)
    return process

real = make_processor(stripe.charge)
fake = make_processor(lambda a: {"fake": True})
```

class 없이 *함수 전달*.

### Dependency Injection framework

```python
class PaymentProcessor:
    def __init__(self, gateway: PaymentGateway):   # interface
        self.gateway = gateway

# Spring, Guice, Dagger, InversifyJS가 주입
```

### Higher-order function

```javascript
const sorter = (strategy) => (data) => strategy(data);

const quickSorter = sorter(quickSort);
const mergeSorter = sorter(mergeSort);
```

### Plugin system

```python
class PluginRegistry:
    def __init__(self): self.plugins = {}
    def register(self, name, plugin): self.plugins[name] = plugin
    def get(self, name): return self.plugins[name]

registry.register("real", RealGateway())
registry.register("fake", FakeGateway())

gateway = registry.get(config.gateway_name)
```

설정 기반 plug-in.

### Rust trait object

```rust
trait Gateway { fn charge(&self, amount: u32) -> Result<()>; }

struct Processor {
    gateway: Box<dyn Gateway>,   // dynamic dispatch
}
```

### Plugin frameworks

- **Eclipse plug-ins** — OSGi.
- **VS Code extensions**.
- **Jenkins plug-ins**.
- *core + plug-in marketplace*.

## 도구 / IDE

| 도구 | Pluggable 지원 |
| --- | --- |
| Spring DI | interface 주입 |
| Guice / Dagger | DI |
| InversifyJS | TS DI |
| Pluggy (Python) | plugin |
| Stevedore (Python) | plugin loading |

## 성능 고려

interface call은 *vtable lookup* — JIT inline. 일반 무관. 다만 *megamorphic*(많은 구현) 시 약간 느림.

## Replace Conditional with Polymorphism

리팩터링 [Pattern 38: Replace Conditional with Polymorphism](/blog/programming/design/refactoring-catalog/pattern38-replace-conditional-with-polymorphism)과 *완전 동일* 정신.

## 관련 패턴

- [Pattern 35: Null Object](/blog/programming/engineering/tdd-patterns/pattern35-null-object) — 기본 동작 객체
- [Pattern 17: Mock Object](/blog/programming/engineering/tdd-patterns/pattern17-mock-object) — 테스트 대역
- [Pattern 36: Template Method](/blog/programming/engineering/tdd-patterns/pattern36-template-method) — 알고리즘 골격
- GoF Strategy pattern
