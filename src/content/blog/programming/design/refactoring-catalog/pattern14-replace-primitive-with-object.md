---
title: "Pattern 14: Replace Primitive with Object"
date: 2026-05-02T14:00:00
description: "Primitive obsession 해소 — 값 객체로 type safety와 도메인 의미를 동시에."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 14
tags: [refactoring, primitive-obsession, value-object, fowler]
draft: true
type: book-review
bookTitle: "Refactoring: Improving the Design of Existing Code, 2nd Edition"
bookAuthor: "Martin Fowler"
---

## 한 줄 요약

> `string "USD"`, `int currency_code` 같은 primitive에 의미를 부여하는 *값 객체*로 승격한다.

## 동기 (Motivation)

**Primitive obsession**은 string·number·bool로 도메인 의미를 표현하는 *나쁜 냄새*다. 다음 코드가 한 신호.

```javascript
// price도 number, weight도 number — 둘이 섞이면?
function shipping(price, weight) { return price * weight * 0.01; }

shipping(weight, price);  // 컴파일러는 못 잡음, 런타임도 모름
```

값 객체로 승격하면 다음이 모인다.

1. **Type safety** — `Money`와 `Weight`가 별개 타입. 섞이면 컴파일 에러.
2. **검증을 한 곳에** — `new Currency("USDD")`이 생성 시점에 throw.
3. **도메인 메서드** — `money.convertTo(EUR)`, `weight.asKilograms()`.
4. **단위 명시** — `Duration.minutes(5)`가 `5` (sec/ms 모호)보다 명확.
5. **표시 형식** — `Money.toString()`이 통화 기호 포함.

DDD의 *value object*와 같은 동기. Eric Evans의 책에서 가장 자주 강조되는 패턴.

### 신호

- 같은 type의 매개변수 *섞임 가능성*이 있는 호출 (`(price, weight, tax)` 같은 number 3개).
- *문자열에 의미*가 담겨 있지만 type 시스템이 못 알아본다 (`"USD"`, `"high"`, `"red"`).
- 도메인 *연산이 반복*된다 (price + tax, duration1 + duration2).
- 검증 로직이 *호출자마다 반복*.

### 언제 적용하는가

- primitive에 *도메인 의미*가 있다.
- 같은 primitive에 *반복되는 연산·검증*.
- 단위·통화·범위 같은 *제약*이 있다.
- 잘못 섞이면 *런타임 버그*가 명확.

변환 구조를 한눈에 보면 다음과 같다.

![Pattern 14 — before/after 구조](/images/blog/refactoring-catalog/diagrams/pattern14-replace-primitive-with-object.svg)

## 절차 (Mechanics)

1. 아직 안 됐다면 [Encapsulate Variable](/blog/programming/design/refactoring-catalog/pattern06-encapsulate-variable).
2. 값을 감쌀 단순 class 생성. 생성자에 raw value, getter.
3. setter 안에서 wrapper로 변환, getter는 wrapper의 raw 반환.
4. 클래스 이름이 새 type을 잘 표현하는지 확인.
5. [Move Function](/blog/programming/design/refactoring-catalog/pattern21-move-function)으로 관련 동작을 wrapper로 이동.
6. 테스트.

## 예시 1 — Priority value

```javascript
// Before — order.priority가 string
class Order {
  constructor(data) { this._priority = data.priority; }
  get priority() { return this._priority; }
}

const highPriorityCount = orders.filter(o =>
  o.priority === "high" || o.priority === "rush"
).length;
```

문제 — `"medium"`이 잘못 들어오면 모름. `===` 대신 *순위 비교*도 어색.

```javascript
// After
class Priority {
  constructor(value) {
    if (!Priority.legalValues().includes(value))
      throw new Error(`<${value}> is invalid for Priority`);
    this._value = value;
  }
  toString()      { return this._value; }
  get _index()    { return Priority.legalValues().indexOf(this._value); }
  static legalValues() { return ["low", "normal", "high", "rush"]; }
  equals(other)   { return this._index === other._index; }
  higherThan(other) { return this._index > other._index; }
  lowerThan(other)  { return this._index < other._index; }
}

class Order {
  constructor(data) { this._priority = new Priority(data.priority); }
  get priority()    { return this._priority; }
}

const highPriorityCount = orders.filter(o =>
  o.priority.higherThan(new Priority("normal"))
).length;
```

- 잘못된 값 → *생성 시* throw.
- `higherThan` 같은 *도메인 비교* 가능.
- toString·equals·index 같은 표준 동작이 한 곳에.

## 예시 2 — Money

가장 고전적 사례.

```javascript
// Before
function add(amount1, currency1, amount2, currency2) {
  if (currency1 !== currency2) throw new Error("mismatch");
  return { amount: amount1 + amount2, currency: currency1 };
}
```

```javascript
// After
class Money {
  constructor(amount, currency) {
    if (typeof amount !== "number" || isNaN(amount))
      throw new Error("amount must be number");
    this._amount = amount;
    this._currency = currency;
  }
  get amount()   { return this._amount; }
  get currency() { return this._currency; }

  add(other) {
    this._assertSameCurrency(other);
    return new Money(this._amount + other._amount, this._currency);
  }
  subtract(other) {
    this._assertSameCurrency(other);
    return new Money(this._amount - other._amount, this._currency);
  }
  multiply(scalar) {
    return new Money(this._amount * scalar, this._currency);
  }
  equals(other) {
    return this._amount === other._amount && this._currency === other._currency;
  }
  _assertSameCurrency(other) {
    if (this._currency !== other._currency) throw new Error("currency mismatch");
  }
  toString() { return `${this._amount.toFixed(2)} ${this._currency}`; }
}

const total = new Money(100, "USD").add(new Money(50, "USD")).multiply(1.1);
// 165.00 USD
```

연산·검증·표현이 한 곳. *Martin Fowler의 Money 책 한 권 분량*.

## 예시 3 — Duration

```javascript
// Before
function sleep(timeoutMs) { /* ... */ }
sleep(5000);   // 5초인지 5밀리초인지?
```

```javascript
// After
class Duration {
  constructor(milliseconds) { this._ms = milliseconds; }
  static milliseconds(n) { return new Duration(n); }
  static seconds(n)      { return new Duration(n * 1000); }
  static minutes(n)      { return new Duration(n * 60 * 1000); }
  static hours(n)        { return new Duration(n * 60 * 60 * 1000); }
  get milliseconds() { return this._ms; }
  get seconds()      { return this._ms / 1000; }
  add(other)         { return new Duration(this._ms + other._ms); }
  toString()         {
    if (this._ms < 1000) return `${this._ms}ms`;
    if (this._ms < 60000) return `${this.seconds}s`;
    return `${this._ms / 60000}min`;
  }
}

function sleep(duration) { /* ... */ }
sleep(Duration.seconds(5));   // 명확
```

단위 실수 *원천 차단*.

## 자주 보는 안티패턴

### 1. 모든 primitive를 객체화
*변하지 않는 단순 ID, 일시적 카운터*까지 객체화하면 *불필요한 인프라*. 도메인 의미가 있을 때만.

### 2. equals/hashCode 누락
값 객체는 *값 동등*이 자연. reference 동등이면 set·map 키로 못 쓴다.

```javascript
const set = new Set();
set.add(new Money(100, "USD"));
set.has(new Money(100, "USD"));   // false — reference 비교!
```

JavaScript는 `===` 오버로드 불가 — `equals` 메서드 약속.

### 3. mutable value object
value object의 본질은 *immutable*. setter 두면 모든 가치 소실. `add`도 *새 인스턴스 반환*.

```javascript
// Bad
money.amount += 100;   // mutation — value object 의미 깨짐

// Good
money = money.add(new Money(100, money.currency));
```

### 4. 생성자가 무거움
검증·외부 호출이 *매 생성*마다 일어나면 hot path에서 부담. *factory + cache* 또는 *flyweight* 검토.

### 5. 너무 fine-grained
`UserId`, `OrderId`, `ProductId`를 모두 별 클래스로 — 합리적이지만 *극단으로 가면 ceremony*. 팀 합의.

### 6. 직렬화 망각
JSON으로 보낼 때 `Money` 객체가 `{_amount: 100, _currency: "USD"}` 형태로 — *호환 안 됨*. `toJSON()` 정의.

## Modern variants

### TypeScript branded types
런타임 객체 없이 *컴파일 타임만* 구분.

```typescript
type Currency = string & { readonly __brand: "Currency" };
function asCurrency(s: string): Currency {
  if (!["USD", "EUR", "KRW"].includes(s)) throw new Error();
  return s as Currency;
}

function priceIn(amount: number, c: Currency) { /* ... */ }
priceIn(100, "USD" as Currency);   // OK
priceIn(100, "USDD");               // 컴파일 에러 (만약 strict)
```

객체 할당 비용 없이 타입 안전.

### Kotlin value class

```kotlin
@JvmInline
value class Money(val cents: Long) {
    operator fun plus(o: Money) = Money(cents + o.cents)
}
```

JVM 차원에서 *primitive처럼* 컴파일 — wrapper 비용 0.

### Rust newtype

```rust
struct Money(pub u64, pub Currency);

impl Money {
    pub fn add(self, other: Money) -> Money { /* ... */ }
}
```

*zero-cost abstraction*. 같은 효과, 컴파일 후 사라짐.

### Java records (Java 17+)

```java
public record Money(BigDecimal amount, Currency currency) {
    public Money {
        if (amount.signum() < 0) throw new IllegalArgumentException();
    }
    public Money add(Money o) {
        if (!currency.equals(o.currency)) throw new IllegalArgumentException();
        return new Money(amount.add(o.amount), currency);
    }
}
```

자동 immutable, equals/hashCode.

### Python frozen dataclass

```python
from dataclasses import dataclass

@dataclass(frozen=True)
class Money:
    amount: Decimal
    currency: str

    def add(self, other: "Money") -> "Money":
        if self.currency != other.currency: raise ValueError("mismatch")
        return Money(self.amount + other.amount, self.currency)
```

## 도구 / IDE

| 도구 | 기능 |
| --- | --- |
| IntelliJ | "Replace primitive with type" 부분적 |
| Rider | "Create class from usages" |
| Rust Analyzer | "Wrap with newtype" |

대부분 수동 + Encapsulate Variable 기반.

## 성능 고려

- JIT 환경에선 단순 wrapper는 *escape analysis*로 스택 할당.
- Kotlin value class, Rust newtype, Java Valhalla(예정)는 *컴파일 타임에 사라짐*.
- 정말 hot path면 측정. 보통 무시 가능.

## 결과 정리

- Type safety — mixing 차단
- 검증 한 곳에
- 도메인 메서드 추가 자연스러움
- 직렬화·테스트 friendly
- *Money*, *Distance*, *Duration*은 거의 항상 가치 있음

## 관련 패턴

- **자매**: [Pattern 12: Encapsulate Record](/blog/programming/design/refactoring-catalog/pattern12-encapsulate-record)
- **DDD value**: [Pattern 33: Change Reference to Value](/blog/programming/design/refactoring-catalog/pattern33-change-reference-to-value)
- **매개변수 묶음**: [Pattern 8: Introduce Parameter Object](/blog/programming/design/refactoring-catalog/pattern08-introduce-parameter-object)
- **숫자 enum 대체**: [Pattern 56: Replace Type Code with Subclasses](/blog/programming/design/refactoring-catalog/pattern56-replace-type-code-with-subclasses)
