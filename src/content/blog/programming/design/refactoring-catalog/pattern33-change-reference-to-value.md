---
title: "Pattern 33: Change Reference to Value"
date: 2026-05-02T09:00:00
description: "Reference 객체를 immutable value로 — sharing 없는 데이터에 identity는 부담."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 33
tags: [refactoring, value-object, immutability, fowler]
draft: true
type: book-review
bookTitle: "Refactoring: Improving the Design of Existing Code, 2nd Edition"
bookAuthor: "Martin Fowler"
---

## 한 줄 요약

> 객체가 *공유될 필요 없고 identity가 의미 없으면* — reference 대신 *immutable value*. 동기화 없는 안전한 사본.

## 동기 (Motivation)

객체에는 두 종류가 있다.

- **Reference 객체**: 한 instance가 여러 곳에서 *공유*. update가 보이려면 reference로 전달. ID가 의미를 가짐 (`Customer#123`).
- **Value 객체**: 데이터 자체가 정체성. *equal한 두 사본*은 같음. ID 없음 (`Money(100, USD)`).

Java에서 `Date`나 `Money`를 reference로 만들면 *공유 mutation* 위험. 한 객체를 두 customer가 모두 `dateOfBirth`로 가지면, 한쪽이 *날짜를 바꾸면 다른 쪽도 바뀜*. 거의 항상 *버그*.

```javascript
const birthday = new Date("1990-01-01");
alice.dateOfBirth = birthday;
bob.dateOfBirth = birthday;
alice.dateOfBirth.setFullYear(2000);   // bob의 birth도 2000으로!
```

value object로 만들면 *immutable*. mutation이 *새 객체*를 만들고, 원본은 안전.

```javascript
class DateValue {
  constructor(date) { this._date = new Date(date); Object.freeze(this); }
  get year() { return this._date.getFullYear(); }
  withYear(year) {
    const d = new Date(this._date); d.setFullYear(year);
    return new DateValue(d);   // 새 인스턴스
  }
  equals(other) { return this._date.getTime() === other._date.getTime(); }
}
```

DDD에서 *Value Object* 패턴 — `Money`, `Address`, `DateRange`, `Coordinate`. 모두 sharing 없는 immutable.

### 신호

- 객체가 *생성 후 modify되지 않음*.
- 두 instance가 *같은 데이터면 같다고 봐야 함*.
- *equality*를 ID가 아닌 *content*로 비교.
- 다른 객체가 *복사*해서 사용해도 무방.
- *thread-safety* 필요.

### 언제 적용하는가

- 객체가 *변하지 않음* (또는 변하면 *새 객체*).
- *identity 비교*가 의미 없음.
- *concurrent access* 안전성 필요.
- DDD value object로 모델링.

### 언제 적용하지 않는가

- 한 instance가 *공유 상태*를 가져야 함 (`User`, `Order`).
- ID로 *find/update*가 핵심 (`Customer#123`).

## 절차 (Mechanics)

1. **모든 setter 제거** — class를 immutable로.
2. **constructor에서 모든 field 초기화**, 이후 변경 불가.
3. **equality method 재정의** (`equals`, `hashCode`, JS는 직접).
4. 변경이 필요한 곳은 *새 instance 반환*하는 with-methods.
5. 컴파일·테스트.

## 예시 1 — Telephone을 value로

```javascript
// Before — reference Telephone
class Telephone {
  constructor(areaCode, number) {
    this._areaCode = areaCode;
    this._number = number;
  }
  get areaCode() { return this._areaCode; }
  set areaCode(arg) { this._areaCode = arg; }
  get number() { return this._number; }
  set number(arg) { this._number = arg; }
}

// 두 person이 같은 인스턴스 가지면 위험
alice.officePhone = phone;
bob.officePhone = phone;
phone.number = "999";   // 둘 다 바뀜
```

```javascript
// After — value Telephone
class Telephone {
  constructor(areaCode, number) {
    this._areaCode = areaCode;
    this._number = number;
    Object.freeze(this);
  }
  get areaCode() { return this._areaCode; }
  get number() { return this._number; }
  equals(other) {
    if (!(other instanceof Telephone)) return false;
    return this._areaCode === other._areaCode && this._number === other._number;
  }
  withNumber(number) {
    return new Telephone(this._areaCode, number);
  }
  toString() { return `(${this._areaCode}) ${this._number}`; }
}

// 변경은 새 instance
alice.officePhone = new Telephone("02", "1234");
bob.officePhone = new Telephone("02", "1234");
// alice 변경은 bob에 영향 없음
alice.officePhone = alice.officePhone.withNumber("5678");
```

## 예시 2 — Person → Telephone 분리

reference로 두던 Telephone을 person 안에서 value로 표현.

```javascript
// Before
class Person {
  constructor() {
    this._telephoneNumber = new TelephoneNumber();   // reference
  }
  get officeAreaCode() { return this._telephoneNumber.areaCode; }
  set officeAreaCode(arg) { this._telephoneNumber.areaCode = arg; }
  get officeNumber() { return this._telephoneNumber.number; }
  set officeNumber(arg) { this._telephoneNumber.number = arg; }
}
```

```javascript
// After
class Person {
  constructor() {
    this._telephoneNumber = new TelephoneNumber("", "");
  }
  get officeAreaCode() { return this._telephoneNumber.areaCode; }
  set officeAreaCode(arg) {
    this._telephoneNumber = new TelephoneNumber(arg, this.officeNumber);
  }
  get officeNumber() { return this._telephoneNumber.number; }
  set officeNumber(arg) {
    this._telephoneNumber = new TelephoneNumber(this.officeAreaCode, arg);
  }
}

class TelephoneNumber {
  constructor(areaCode, number) {
    this._areaCode = areaCode;
    this._number = number;
  }
  get areaCode() { return this._areaCode; }
  get number()   { return this._number; }
  equals(other) { /* ... */ }
}
```

Person이 *value를 통째로 교체*. TelephoneNumber 자체는 immutable.

## 예시 3 — Money

가장 전형적인 value object.

```javascript
class Money {
  constructor(amount, currency) {
    this._amount = amount;
    this._currency = currency;
    Object.freeze(this);
  }
  get amount() { return this._amount; }
  get currency() { return this._currency; }
  plus(other) {
    if (other.currency !== this._currency) throw new Error("currency mismatch");
    return new Money(this._amount + other.amount, this._currency);
  }
  times(n) { return new Money(this._amount * n, this._currency); }
  equals(other) {
    if (!(other instanceof Money)) return false;
    return this._amount === other.amount && this._currency === other.currency;
  }
  toString() { return `${this._amount} ${this._currency}`; }
}

const a = new Money(100, "USD");
const b = new Money(50, "USD");
const sum = a.plus(b);   // 새 Money(150, USD), a/b는 그대로
```

`Money(100, USD)`가 어디에 있든 *같은 의미*. 공유해도 안전.

## 자주 보는 안티패턴

### 1. *Setter 일부만* 제거
일부 field만 immutable이면 *위장된 mutable*. *전부 immutable*이어야 의미.

### 2. `equals`/`hashCode` *재정의 잊음*
Java/Kotlin/C#에서는 필수. JS는 `Map` key 사용 시 *content-based* equality 안 됨 — 별도 유틸리티.

### 3. *Deep mutable* field
`Money`의 `currency`가 mutable Currency object면 immutability 위반. *모든 field*도 immutable.

### 4. *생성 비용 무시*
모든 변경이 새 instance — *극단적으로 빈번한 변경*에서는 메모리/GC 부담. 측정.

### 5. *Value인 척 Reference*
`OrderLine`이 immutable인데 *Order에서 in-place 추가*하면 — value 모델 깨짐. Order 자체도 immutable이거나, OrderLine만 value.

### 6. *Database identity와 혼동*
DB row가 있는 Entity는 *reference*. value object는 *embedded* (Hibernate `@Embeddable`).

## Modern variants

### Java `record`

```java
public record Money(BigDecimal amount, String currency) {}
```

자동 `equals`, `hashCode`, `toString`, immutable. value object 완벽 매치.

### Kotlin `data class`

```kotlin
data class Money(val amount: BigDecimal, val currency: String)
val a = Money(100, "USD")
val b = a.copy(amount = 200)   // immutable update
```

### C# `record`

```csharp
public record Money(decimal Amount, string Currency);
var b = a with { Amount = 200 };   // immutable copy
```

### Rust — 모든 struct가 기본 value

```rust
#[derive(Clone, PartialEq, Eq, Hash)]
struct Money { amount: u64, currency: Currency }
```

Move semantics + Copy/Clone trait — *공유는 명시적*.

### TypeScript — `readonly`

```typescript
class Money {
  constructor(
    readonly amount: number,
    readonly currency: string
  ) {}
}
```

`readonly` keyword + structural type.

### JavaScript — `Object.freeze`

```javascript
const money = Object.freeze({ amount: 100, currency: "USD" });
```

shallow freeze. deep freeze는 별도 유틸.

## 도구 / IDE

| 도구 | 기능 |
| --- | --- |
| IntelliJ | "Convert to Record" (Java), "Add equals/hashCode" |
| Rider (C#) | "Convert to record" |
| Lombok | `@Value` — Java immutable boilerplate 제거 |
| Immer (JS) | immutable update without boilerplate |

## 성능 고려

- *Heap 할당*: 변경마다 새 object — GC 부담. 작은 객체는 *escape analysis*로 stack 할당될 수 있음.
- *Structural sharing*: 큰 immutable collection은 trie 기반(Immer, Immutable.js) — *부분 공유*로 메모리 효율.
- *Concurrency*: lock 불필요 — 비용 절감.
- *Cache*: immutable이라 안전하게 캐싱 — *hashCode 캐시* 가능.

## 관련 패턴

- **역방향**: [Pattern 34: Change Value to Reference](/blog/programming/design/refactoring-catalog/pattern34-change-value-to-reference)
- **준비**: [Pattern 14: Replace Primitive with Object](/blog/programming/design/refactoring-catalog/pattern14-replace-primitive-with-object)
- **DDD**: [Pattern 16: Extract Class](/blog/programming/design/refactoring-catalog/pattern16-extract-class) — value object 추출
