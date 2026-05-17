---
title: "Pattern 56: Replace Type Code with Subclasses"
date: 2026-06-03T08:00:00
description: "Type code (enum·string) 대신 다형성 subclass — 분기 사라지고 type-specific 동작 자연."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 56
tags: [refactoring, type-code, subclass, fowler]
draft: true
type: book-review
bookTitle: "Refactoring: Improving the Design of Existing Code, 2nd Edition"
bookAuthor: "Martin Fowler"
---

## 한 줄 요약

> `type` 필드(string/enum)로 동작 분기하던 class를 type별 *subclass*로 분리. switch가 사라지고 type 추가가 *class 추가*가 된다.

## 동기 (Motivation)

type code는 데이터로 *종류*를 표현하는 가장 단순한 방식. 그러나 종류에 따라 *행동이 달라지면* 코드가 분기 가득.

```javascript
// Before — type code
class Employee {
  constructor(name, type) {
    this._name = name;
    this._type = type;   // "engineer" | "manager" | "salesperson"
  }
  get capitalizedType() { return this._type[0].toUpperCase() + this._type.slice(1); }
  toString() { return `${this._name} (${this.capitalizedType})`; }
  // 행동이 type에 의존
  getMonthlyBonus() {
    switch (this._type) {
      case "engineer":     return 100;
      case "manager":      return 500;
      case "salesperson":  return 200;
    }
  }
}
```

type을 *문자열로 보유*. method가 *switch로 분기*. 새 type 추가 시 *모든 switch 수정*.

[Replace Conditional with Polymorphism](/blog/programming/design/refactoring-catalog/pattern38-replace-conditional-with-polymorphism)을 적용하려면 *type별 subclass*가 먼저 필요. 그 단계가 *Replace Type Code with Subclasses*.

```javascript
// After — subclass
class Employee {
  constructor(name) { this._name = name; }
  get type() { throw new Error("abstract"); }
  get capitalizedType() { return this.type[0].toUpperCase() + this.type.slice(1); }
  toString() { return `${this._name} (${this.capitalizedType})`; }
}
class Engineer extends Employee {
  get type() { return "engineer"; }
  getMonthlyBonus() { return 100; }
}
class Manager extends Employee {
  get type() { return "manager"; }
  getMonthlyBonus() { return 500; }
}
class Salesperson extends Employee {
  get type() { return "salesperson"; }
  getMonthlyBonus() { return 200; }
}

function createEmployee(name, type) {
  switch (type) {
    case "engineer":    return new Engineer(name);
    case "manager":     return new Manager(name);
    case "salesperson": return new Salesperson(name);
  }
}
```

switch는 *factory에 한 번*. 각 subclass가 *자기 type의 책임*.

### 신호

- *type field*가 코드 곳곳에서 switch.
- 새 type 추가 시 *여러 곳 수정*.
- type별로 *특수 데이터/메서드*.
- *Replace Conditional with Polymorphism* 적용 전 단계.

### 언제 적용하는가

- type 종류가 *제한적*이고 *상대적으로 안정*.
- type별 행동이 *충분히 다름* (3+ 메서드).
- 새 type 추가가 *예측됨*.

### 언제 적용하지 않는가

- type이 *런타임에 자주 변경* — 인스턴스 type 못 바꿈 (subclass는 불변).
- 종류가 *3 이하* + 간단한 차이 — type code 충분.
- *sealed enum + pattern match* 언어가 더 자연 (Rust, Kotlin).

## 절차 (Mechanics)

1. **type field 캡슐화** (getter만).
2. **type별 subclass** 작성. 각 subclass의 *type getter*가 해당 값.
3. **factory function** — type에 따라 적절 subclass 반환.
4. caller가 *factory 사용*하도록 변경.
5. **type 의존 method**를 [Replace Conditional with Polymorphism](/blog/programming/design/refactoring-catalog/pattern38-replace-conditional-with-polymorphism)으로 이동.
6. **type field 제거** (가능하면).
7. 컴파일·테스트.

## 예시 1 — 위 Employee 예 참고.

## 예시 2 — Indirect inheritance (Subclass 직접 못 만들 때)

기존 class에 *enum 의존 코드 많음* → 한 번에 subclass 못 만들 수도. *간접 상속*:

```javascript
// Before — Employee는 다른 곳에서 inherit돼서 못 바꿈
class Employee {
  get type() { return this._type._value; }
  set type(arg) { this._type = EmployeeType.create(arg); }
}
```

EmployeeType만 subclass로:

```javascript
class EmployeeType {
  static create(value) {
    switch (value) {
      case "engineer":    return new Engineer();
      case "manager":     return new Manager();
      case "salesperson": return new Salesperson();
    }
  }
}
class Engineer extends EmployeeType {
  toString() { return "engineer"; }
  getMonthlyBonus() { return 100; }
}
// ...
```

`Employee`는 *EmployeeType*에 위임. 간접적이지만 *동일 효과*.

## 예시 3 — Subclass에 type-specific data

```javascript
// Before
class Insurance {
  constructor(type, params) {
    this._type = type;
    this._params = params;
  }
  calculatePremium() {
    switch (this._type) {
      case "auto":
        return this._params.carValue * 0.01;
      case "home":
        return this._params.houseValue * 0.005;
    }
  }
}
```

```javascript
// After
class Insurance {}
class AutoInsurance extends Insurance {
  constructor(carValue) { super(); this._carValue = carValue; }
  calculatePremium() { return this._carValue * 0.01; }
}
class HomeInsurance extends Insurance {
  constructor(houseValue) { super(); this._houseValue = houseValue; }
  calculatePremium() { return this._houseValue * 0.005; }
}
```

subclass별 *고유 field*. type-specific 데이터가 *각 class에 자연*.

## 자주 보는 안티패턴

### 1. *Runtime type 변경 필요*
"order의 status가 pending → paid → shipped" → subclass는 *type 변경 불가* (instance 교체 필요). State 패턴 또는 *type field 유지*.

### 2. *Subclass 폭증*
type이 *수백 개* → class 수백 개. *data table*이나 *strategy*가 더 적합.

### 3. *기존 type code 남김*
subclass 만들었지만 *기존 type field 안 지움* → 두 시스템 공존. 마이그레이션 완료.

### 4. *Caller가 subclass 직접 의존*
caller가 `if (e instanceof Engineer)` — 다형성 효과 무력화. *Employee interface*만 사용.

### 5. *Factory 누락*
caller가 `new Engineer()` 직접 호출 → factory의 *type 정규화* 우회. factory 강제.

### 6. *Sealed type 회피*
Rust/Kotlin은 *enum + pattern match*가 더 안전 (exhaustive). subclass가 강제 답은 아님.

## Modern variants

### Rust — enum

```rust
enum Insurance {
    Auto { car_value: f64 },
    Home { house_value: f64 },
}

impl Insurance {
    fn premium(&self) -> f64 {
        match self {
            Insurance::Auto { car_value }    => car_value * 0.01,
            Insurance::Home { house_value }  => house_value * 0.005,
        }
    }
}
```

각 variant가 *자기 데이터 + 자기 행동*. subclass 효과 + *exhaustive 검증*.

### Kotlin sealed class

```kotlin
sealed class Insurance {
    abstract fun premium(): Double
}
class AutoInsurance(val carValue: Double) : Insurance() {
    override fun premium() = carValue * 0.01
}
class HomeInsurance(val houseValue: Double) : Insurance() {
    override fun premium() = houseValue * 0.005
}

// when으로 exhaustive
fun describe(i: Insurance): String = when (i) {
    is AutoInsurance -> "auto"
    is HomeInsurance -> "home"
}
```

### TypeScript discriminated union

```typescript
type Insurance =
  | { type: "auto"; carValue: number }
  | { type: "home"; houseValue: number };

function premium(i: Insurance): number {
  switch (i.type) {
    case "auto": return i.carValue * 0.01;
    case "home": return i.houseValue * 0.005;
  }
}
```

class 없이도 type-safe.

### Java sealed (Java 17+)

```java
sealed interface Insurance permits AutoInsurance, HomeInsurance {
    double premium();
}
record AutoInsurance(double carValue)   implements Insurance { ... }
record HomeInsurance(double houseValue) implements Insurance { ... }
```

## 도구 / IDE

| 도구 | 기능 |
| --- | --- |
| IntelliJ | "Replace Type Code with Subclass" |
| Rider | 같음 |
| Resharper | "Replace conditional with polymorphism" |

## 성능 고려

다형성은 *vtable lookup* — JIT 인라인. 일반적으로 무관.

`enum` 기반은 *cache-friendly* (contiguous storage). hot path 측정.

## 관련 패턴

- **다음 단계**: [Pattern 38: Replace Conditional with Polymorphism](/blog/programming/design/refactoring-catalog/pattern38-replace-conditional-with-polymorphism)
- **역방향**: [Pattern 57: Remove Subclass](/blog/programming/design/refactoring-catalog/pattern57-remove-subclass)
- **자매**: [Pattern 58: Extract Superclass](/blog/programming/design/refactoring-catalog/pattern58-extract-superclass)
- **상태 변경 필요**: GoF State 패턴
