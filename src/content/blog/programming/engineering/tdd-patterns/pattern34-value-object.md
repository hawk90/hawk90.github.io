---
title: "Pattern 34: Value Object"
date: 2026-07-02T10:00:00
description: "Immutable·equality·hash — value-based 객체로 안전한 코드."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 34
tags: [tdd, beck, value-object, ddd]
draft: true
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> *값으로 비교*하는 *불변 객체*. Beck의 Money 예제의 핵심, DDD *Value Object*와 동일.

## 동기 (Motivation)

5달러 두 장은 *같은가*?

```python
bill1 = Money(5, "USD")
bill2 = Money(5, "USD")

bill1 is bill2   # False — 다른 객체
bill1 == bill2   # True — 같은 값
```

**Value Object**는 *값으로 비교*. *identity가 아닌 content*가 본질.

### 신호

- 데이터가 *변하지 않음*.
- 두 instance가 *같은 데이터면 같다*.
- *thread-safe* 필요.
- DDD value object로 모델링.

### 특징

| 특성 | Value Object | Entity |
| --- | --- | --- |
| 비교 | 값 (`==`) | ID |
| 변경 | 불변 | 가변 |
| 예시 | Money, Date, Address | User, Order |
| 수명 | 사용 후 버림 | 추적 필요 |

## 절차 (Mechanics)

1. **데이터만 가진 class**.
2. *Immutable* — setter 없음, field 불변.
3. **equality 재정의** (`__eq__`, `__hash__`).
4. **연산**은 *새 instance 반환*.
5. *factory method* (`Money.dollar(5)`) 옵션.

## 예시 1 — Money

```python
from dataclasses import dataclass

@dataclass(frozen=True)
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

`@dataclass(frozen=True)`가 *자동 equality + hash + immutable*.

### 테스트

```python
def test_money_equality():
    assert Money.dollar(5) == Money.dollar(5)
    assert Money.dollar(5) != Money.dollar(6)
    assert Money.dollar(5) != Money.franc(5)

def test_money_addition():
    five = Money.dollar(5)
    result = five.add(Money.dollar(3))
    assert result == Money.dollar(8)
    assert five == Money.dollar(5)   # 원본 불변

def test_money_hashable():
    prices = {Money.dollar(5): "coffee", Money.dollar(10): "lunch"}
    assert prices[Money.dollar(5)] == "coffee"
```

## 예시 2 — DateRange

```python
@dataclass(frozen=True)
class DateRange:
    start: date
    end: date

    def __post_init__(self):
        if self.start > self.end:
            raise ValueError("start > end")

    def contains(self, d: date) -> bool:
        return self.start <= d <= self.end

    def overlaps(self, other: 'DateRange') -> bool:
        return not (self.end < other.start or other.end < self.start)

    def extend(self, days: int) -> 'DateRange':
        return DateRange(self.start, self.end + timedelta(days=days))
```

날짜 범위가 *값*. 비교·연산이 자연.

## 예시 3 — Address

```python
@dataclass(frozen=True)
class Address:
    street: str
    city: str
    postcode: str
    country: str

    def with_postcode(self, postcode: str) -> 'Address':
        return Address(self.street, self.city, postcode, self.country)
```

`with_postcode` 같은 *변경*은 *새 instance*.

## 자주 보는 안티패턴

### 1. *Setter 잠시*
"잠깐만 mutable" → invariant 깨짐. *완전 불변*.

### 2. *equality 누락*
`__eq__` 없음 → reference 비교만. 도메인 코드에서 *false negative*.

### 3. *hash 안 구현*
`__eq__` 있는데 `__hash__` 없음 → dict/set key 사용 불가.

### 4. *Mutable field*
```python
@dataclass(frozen=True)
class Bad:
    items: list[int]   # ← list는 mutable
```
inner mutability → invariant 약함. tuple/frozenset 사용.

### 5. *큰 객체에 value*
1MB 데이터를 value로 → 매 변경 *복사 비용*. *structural sharing* (Immer).

### 6. *DB identity와 혼동*
DB row가 있는 entity를 value로 → 식별 깨짐. *Value vs Entity* 구분.

## Modern variants

### Java record (Java 14+)

```java
public record Money(BigDecimal amount, String currency) {
    public Money add(Money other) {
        if (!currency.equals(other.currency)) throw new IllegalArgumentException();
        return new Money(amount.add(other.amount), currency);
    }
}
```

자동 equality/hashCode/toString.

### Kotlin data class

```kotlin
data class Money(val amount: BigDecimal, val currency: String) {
    fun add(other: Money) = require(currency == other.currency).let {
        copy(amount = amount + other.amount)
    }
}

val b = a.copy(amount = a.amount * 2)
```

`copy`로 immutable update.

### C# record (C# 9+)

```csharp
public record Money(decimal Amount, string Currency);

var b = a with { Amount = a.Amount * 2 };
```

`with` expression — 새 instance.

### Rust

```rust
#[derive(Clone, PartialEq, Eq, Hash)]
struct Money {
    amount: u64,
    currency: Currency,
}
```

모든 struct가 기본 value. *Move/Clone* semantics 명시.

### TypeScript readonly

```typescript
class Money {
  constructor(
    readonly amount: number,
    readonly currency: string
  ) {}

  add(other: Money): Money {
    if (this.currency !== other.currency) throw new Error();
    return new Money(this.amount + other.amount, this.currency);
  }
}
```

`readonly` keyword + structural typing.

### Immutable.js / Immer (JS)

```javascript
import { produce } from "immer";
const newState = produce(state, draft => { draft.amount += 100 });
```

대형 immutable update에 *structural sharing*.

## 도구 / IDE

| 도구 | 기능 |
| --- | --- |
| Python @dataclass(frozen=True) | 자동 immutable |
| Java record | record class |
| Kotlin data class | copy / equality |
| C# record | with expression |
| Rust derive(...) | trait 자동 |
| Lombok @Value | Java boilerplate 제거 |
| Immer | JS structural sharing |

## 성능 고려

- **불변 = thread-safe** — lock 불필요.
- *작은 객체*는 heap 할당 부담 < concurrency 안전성.
- *큰 객체* 빈번 변경 → structural sharing.
- *escape analysis* (JIT)로 stack 할당 가능.
- *hash 캐싱* — immutable이라 안전.

## 관련 패턴

- [Pattern 33: Command](/blog/programming/engineering/tdd-patterns/pattern33-command) — 연산 캡슐화
- [Pattern 35: Null Object](/blog/programming/engineering/tdd-patterns/pattern35-null-object) — 특수 값
- [Pattern 39: Factory Method](/blog/programming/engineering/tdd-patterns/pattern39-factory-method) — 생성 메서드
- DDD Value Object
