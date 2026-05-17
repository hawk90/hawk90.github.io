---
title: "Pattern 34: Value Object"
date: 2026-07-02T10:00:00
description: "Immutable·equality·hash — value-based 객체."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 34
tags: [tdd, beck, value-object, ddd]
draft: true
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> 값으로 비교하는 불변 객체를 사용하여 부작용 없는 안전한 코드를 만든다.

## 동기 (Motivation)

5달러 지폐 두 장이 있다. 같은가, 다른가?

```python
# Identity 비교 (참조)
bill1 = Money(5, "USD")
bill2 = Money(5, "USD")
bill1 is bill2  # False — 다른 객체

# Value 비교 (값)
bill1 == bill2  # True — 같은 값
```

**Value Object**는 **값으로 비교**한다. Beck의 Money 예제의 핵심이다.

## Value Object 특징

### 1. 불변 (Immutable)

```python
class Money:
    def __init__(self, amount, currency):
        self._amount = amount
        self._currency = currency

    @property
    def amount(self):
        return self._amount

    @property
    def currency(self):
        return self._currency

    # setter 없음!
```

### 2. 값으로 비교 (Equality)

```python
class Money:
    def __eq__(self, other):
        if not isinstance(other, Money):
            return False
        return (self._amount == other._amount and
                self._currency == other._currency)

    def __hash__(self):
        return hash((self._amount, self._currency))
```

### 3. 연산은 새 객체 반환

```python
class Money:
    def add(self, other):
        if self._currency != other._currency:
            raise ValueError("통화가 다릅니다")
        return Money(self._amount + other._amount, self._currency)

    def times(self, multiplier):
        return Money(self._amount * multiplier, self._currency)
```

## 전체 구현

```python
from dataclasses import dataclass

@dataclass(frozen=True)  # frozen=True로 불변
class Money:
    amount: int
    currency: str

    def add(self, other: 'Money') -> 'Money':
        if self.currency != other.currency:
            raise ValueError("통화가 다릅니다")
        return Money(self.amount + other.amount, self.currency)

    def times(self, multiplier: int) -> 'Money':
        return Money(self.amount * multiplier, self.currency)

    @classmethod
    def dollar(cls, amount: int) -> 'Money':
        return cls(amount, "USD")

    @classmethod
    def franc(cls, amount: int) -> 'Money':
        return cls(amount, "CHF")
```

## 테스트

```python
def test_money_equality():
    assert Money.dollar(5) == Money.dollar(5)
    assert Money.dollar(5) != Money.dollar(6)
    assert Money.dollar(5) != Money.franc(5)

def test_money_addition():
    five = Money.dollar(5)
    result = five.add(Money.dollar(3))

    assert result == Money.dollar(8)
    assert five == Money.dollar(5)  # 원본 불변

def test_money_multiplication():
    five = Money.dollar(5)
    result = five.times(3)

    assert result == Money.dollar(15)
    assert five == Money.dollar(5)  # 원본 불변

def test_money_hashable():
    # dict key로 사용 가능
    prices = {
        Money.dollar(5): "coffee",
        Money.dollar(10): "lunch"
    }
    assert prices[Money.dollar(5)] == "coffee"
```

## Value Object vs Entity

| 특성 | Value Object | Entity |
|------|-------------|--------|
| 비교 | 값으로 (==) | ID로 |
| 변경 | 불변 | 가변 |
| 예시 | Money, Date, Address | User, Order |
| 수명 | 사용 후 버림 | 추적 필요 |

```python
# Value Object: 5달러는 어디서든 5달러
money1 = Money.dollar(5)
money2 = Money.dollar(5)
assert money1 == money2  # 같음

# Entity: 두 사용자는 ID가 다르면 다름
user1 = User(id=1, name="Alice")
user2 = User(id=2, name="Alice")
assert user1 != user2  # 다름 (ID가 다름)
```

## Value Object의 이점

### Thread-Safe

```python
# 불변이므로 공유해도 안전
shared_money = Money.dollar(100)

# 여러 스레드에서 동시 접근 — 문제 없음
def thread_a():
    total = shared_money.add(Money.dollar(50))

def thread_b():
    total = shared_money.times(2)
```

### Side-Effect Free

```python
def calculate_total(items):
    total = Money.dollar(0)
    for item in items:
        total = total.add(item.price)  # 새 객체 생성
    return total

# 원본 items의 price는 변경되지 않음
```

## 정리

- **값으로 비교** — `__eq__`, `__hash__` 구현
- **불변** — 생성 후 변경 불가
- **연산은 새 객체 반환**
- **Thread-safe, side-effect free**
- **Money 예제의 핵심**
- **DDD Value Object**와 동일

## 관련 패턴

- [Pattern 33: Command](/blog/programming/engineering/tdd-patterns/pattern33-command) — 연산 캡슐화
- [Pattern 35: Null Object](/blog/programming/engineering/tdd-patterns/pattern35-null-object) — 특수 값
- [Pattern 39: Factory Method](/blog/programming/engineering/tdd-patterns/pattern39-factory-method) — 생성 메서드

