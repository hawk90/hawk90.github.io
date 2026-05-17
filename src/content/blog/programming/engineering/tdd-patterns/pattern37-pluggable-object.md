---
title: "Pattern 37: Pluggable Object"
date: 2026-07-02T13:00:00
description: "If-statement 변종 — 객체 교체로 동작 변경."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 37
tags: [tdd, beck, pluggable-object]
draft: true
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> 조건문 대신 교체 가능한 객체를 사용하여 런타임에 동작을 변경한다.

## 동기 (Motivation)

조건문이 코드 곳곳에 퍼진다:

```python
# 조건문 지옥
def process(mode):
    if mode == "dev":
        # 개발 모드 로직
        log_to_console()
    else:
        # 프로덕션 로직
        log_to_server()

    if mode == "dev":
        # 또 분기
        use_fake_db()
    else:
        use_real_db()
```

**Pluggable Object**는 조건문을 **객체 교체**로 대체한다.

## Pluggable Object 패턴

### Before (조건문)

```python
class PaymentProcessor:
    def __init__(self, mode):
        self.mode = mode

    def process(self, amount):
        if self.mode == "test":
            return self.fake_process(amount)
        else:
            return self.real_process(amount)

    def fake_process(self, amount):
        return {"status": "success", "fake": True}

    def real_process(self, amount):
        return gateway.charge(amount)
```

### After (Pluggable Object)

```python
class PaymentGateway:
    def charge(self, amount):
        raise NotImplementedError

class RealGateway(PaymentGateway):
    def charge(self, amount):
        return stripe.charge(amount)

class FakeGateway(PaymentGateway):
    def charge(self, amount):
        return {"status": "success", "fake": True}

class PaymentProcessor:
    def __init__(self, gateway):
        self.gateway = gateway  # Pluggable!

    def process(self, amount):
        return self.gateway.charge(amount)

# 사용
prod_processor = PaymentProcessor(RealGateway())
test_processor = PaymentProcessor(FakeGateway())
```

## Strategy 패턴과 동일

Pluggable Object는 **Strategy 패턴**과 같은 정신이다:

```python
# Pluggable Object = Strategy
class SortStrategy:
    def sort(self, data): ...

class QuickSort(SortStrategy):
    def sort(self, data):
        return quick_sort(data)

class MergeSort(SortStrategy):
    def sort(self, data):
        return merge_sort(data)

class Sorter:
    def __init__(self, strategy):
        self.strategy = strategy  # Pluggable

    def sort(self, data):
        return self.strategy.sort(data)
```

## 다양한 활용

### 환경별 설정

```python
# Development
config = Config(
    database=SqliteDatabase(),
    cache=MemoryCache(),
    logger=ConsoleLogger()
)

# Production
config = Config(
    database=PostgresDatabase(),
    cache=RedisCache(),
    logger=CloudLogger()
)

app = Application(config)
```

### 알고리즘 교체

```python
class PricingStrategy:
    def calculate(self, order): ...

class RegularPricing(PricingStrategy):
    def calculate(self, order):
        return order.subtotal

class DiscountPricing(PricingStrategy):
    def calculate(self, order):
        return order.subtotal * 0.9

class HolidayPricing(PricingStrategy):
    def calculate(self, order):
        return order.subtotal * 0.8

# 동적 교체
order.pricing = HolidayPricing()
total = order.pricing.calculate(order)
```

### Bot vs Human

```python
class Player:
    def make_move(self, game): ...

class HumanPlayer(Player):
    def make_move(self, game):
        return get_user_input()

class BotPlayer(Player):
    def make_move(self, game):
        return calculate_best_move(game)

# 게임 설정
game = Game(
    player1=HumanPlayer(),
    player2=BotPlayer()  # AI 상대
)
```

## 테스트에서의 활용

```python
def test_payment_success():
    # Fake gateway를 plug-in
    fake_gateway = FakeGateway(always_succeed=True)
    processor = PaymentProcessor(fake_gateway)

    result = processor.process(100)

    assert result["status"] == "success"

def test_payment_failure():
    # 실패하는 gateway를 plug-in
    failing_gateway = FakeGateway(always_fail=True)
    processor = PaymentProcessor(failing_gateway)

    result = processor.process(100)

    assert result["status"] == "failed"
```

## Replace Conditional with Polymorphism

Pluggable Object는 리팩터링의 **Replace Conditional with Polymorphism**과 같다:

```python
# Before
def get_speed(vehicle_type):
    if vehicle_type == "car":
        return 120
    elif vehicle_type == "bike":
        return 40
    elif vehicle_type == "plane":
        return 900

# After
class Vehicle:
    def get_speed(self): ...

class Car(Vehicle):
    def get_speed(self):
        return 120

class Bike(Vehicle):
    def get_speed(self):
        return 40

class Plane(Vehicle):
    def get_speed(self):
        return 900
```

## Composition 강조

```python
# 상속보다 조합
class OrderProcessor:
    def __init__(self,
                 validator,
                 pricing,
                 notifier):
        self.validator = validator  # Pluggable
        self.pricing = pricing      # Pluggable
        self.notifier = notifier    # Pluggable

    def process(self, order):
        self.validator.validate(order)
        total = self.pricing.calculate(order)
        self.notifier.notify(order)
        return total
```

## 정리

- **조건문을 객체 교체로** 대체
- **Strategy 패턴**과 동일
- **런타임 동작 변경** 가능
- **테스트 용이** — fake 객체 plug-in
- **Composition over Inheritance**
- **Replace Conditional with Polymorphism**

## 관련 패턴

- [Pattern 35: Null Object](/blog/programming/engineering/tdd-patterns/pattern35-null-object) — 기본 동작 객체
- [Pattern 17: Mock Object](/blog/programming/engineering/tdd-patterns/pattern17-mock-object) — 테스트 대역
- [Pattern 36: Template Method](/blog/programming/engineering/tdd-patterns/pattern36-template-method) — 알고리즘 골격

