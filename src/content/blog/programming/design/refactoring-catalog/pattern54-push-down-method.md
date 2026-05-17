---
title: "Pattern 54: Push Down Method"
date: 2026-06-03T06:00:00
description: "Superclass method가 일부 subclass에만 의미 있다면 — 해당 subclass로 내려보낸다."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 54
tags: [refactoring, inheritance, push-down-method, fowler]
draft: true
type: book-review
bookTitle: "Refactoring: Improving the Design of Existing Code, 2nd Edition"
bookAuthor: "Martin Fowler"
---

## 한 줄 요약

> Superclass의 method가 *일부 subclass에만 의미*있다면, 그 subclass로 내려 보낸다. 잘못된 일반화의 교정 + Liskov 위반 회피.

## 동기 (Motivation)

[Pull Up Method](/blog/programming/design/refactoring-catalog/pattern51-pull-up-method)의 *역방향*. 상속 계층은 시간에 따라 *진화*하며, *과거에는 공통이었으나 지금은 일부에만 의미*인 method가 생긴다.

```javascript
// Before
class Employee {
  get quota() { /* sales quota 계산 */ }
}
class Salesperson extends Employee {}
class Engineer extends Employee {}
```

`quota`는 *영업 사원에만 의미*. Engineer에선 *의미 없음* — 호출하면 nonsense 또는 NotImplementedException.

```javascript
// After
class Employee {}
class Salesperson extends Employee {
  get quota() { /* sales quota 계산 */ }
}
class Engineer extends Employee {}
```

`quota`가 *Salesperson에만*. Engineer를 *Employee polymorphic*하게 다뤄도 quota 호출하지 않음.

### 신호

- superclass method가 *일부 subclass에서 의미 없음*.
- 일부 subclass가 method를 *override해서 throw* 또는 *no-op*.
- "이 subclass에선 이 method 호출하지 마세요" 주석.
- *Liskov 위반*: 일부 subclass에서 *예외 동작*.

### 언제 적용하는가

- method가 *1-2 subclass에만 의미*.
- *Liskov 위반*을 *합리화* 중.
- 새 subclass 추가 시 *method가 의미 없음*.

### 언제 적용하지 않는가

- method가 *대부분 subclass에 의미* — 일부 예외라면 Special Case나 default.
- composition으로 *완전 재구조화*가 더 적절.

## 절차 (Mechanics)

1. **사용처 식별** — 어느 subclass에 의미 있는지.
2. **그 subclass로 method 복사**.
3. **superclass에서 제거** (또는 abstract로 변경).
4. 컴파일·테스트 — *제거한 곳에서 호출 안 됨* 확인.

## 예시 1 — 위 quota 예 참고.

## 예시 2 — 다중 subclass 중 일부

```javascript
// Before
class Customer {
  get monthlyFee() { return 10; }
}
class RegularCustomer extends Customer {}
class PremiumCustomer extends Customer {}
class GuestCustomer extends Customer {
  get monthlyFee() { return 0; }   // override to nothing
}
```

GuestCustomer가 *override해서 무력화*. fee가 *Guest에는 무의미*.

```javascript
// After
class Customer {}
class PaidCustomer extends Customer {
  get monthlyFee() { return 10; }
}
class RegularCustomer extends PaidCustomer {}
class PremiumCustomer extends PaidCustomer {}
class GuestCustomer extends Customer {}   // fee 없음
```

*중간 계층 PaidCustomer 추가*로 자연 분리. GuestCustomer는 *fee를 알 필요 없음*.

## 예시 3 — Abstract로 변경

```javascript
// Before
class Shape {
  area() { return 0; }   // 기본은 0 — 의미 없음
}
class Rectangle extends Shape {
  area() { return this.w * this.h; }
}
class Circle extends Shape {
  area() { return Math.PI * this.r ** 2; }
}
```

`Shape.area()`가 *default 0* — Shape 직접 인스턴스화 시 의미 없음.

```javascript
// After
class Shape {
  area() { throw new Error("abstract"); }   // 또는 abstract 키워드
}
// 또는 TS/Java
abstract class Shape {
  abstract area(): number;
}
class Rectangle extends Shape { area() { return this.w * this.h; } }
class Circle extends Shape    { area() { return Math.PI * this.r ** 2; } }
```

push down + abstract — *Shape를 직접 인스턴스화 못 함*. 모든 *구체 subclass가 area 구현*.

## 자주 보는 안티패턴

### 1. *모든 push down → flat 구조*
공통 method까지 push down하면 *상속 계층 의미 상실*. 진짜 일부에만 의미인 method만.

### 2. *Subclass 폭증*
"이 method를 가진 subclass" + "안 가진 subclass" 차이로 *새 subclass 분리* → 계층 깊어짐. composition 검토.

### 3. *Caller가 type check*
`if (employee instanceof Salesperson) employee.quota()` — type check가 *코드에 침투*. 좋지 않음. visitor pattern 또는 method를 superclass에 *optional/default 반환*으로.

### 4. *Override 무력화*
원래 push down 대신 *override해서 무시*는 *임시방편*. 진짜 push down이 깔끔.

### 5. *너무 깊은 계층*
push down으로 *4단계+ 깊이* — 유지 어려움. 2-3 단계 권장.

### 6. *Move 누락*
관련 field/helper method도 함께 이동해야 — *부분 push down*은 broken.

## Modern variants

### Sealed hierarchies (Kotlin/Scala/Java 17+)

```kotlin
sealed class Customer
class RegularCustomer : Customer()
class PremiumCustomer : Customer()
class GuestCustomer : Customer()
```

*exhaustive match*로 *method 부재*를 *type system이 검증*.

### Composition

```javascript
class Customer {
  constructor(billing) { this._billing = billing; }
  get monthlyFee() { return this._billing.fee(); }
}

const guest = new Customer(new GuestBilling());   // fee = 0
const paid = new Customer(new PaidBilling(10));
```

상속 대신 *strategy*.

### Trait / Mixin

```rust
trait Quotaable {
    fn quota(&self) -> u32;
}

struct Salesperson;
impl Quotaable for Salesperson { fn quota(&self) -> u32 { /* */ } }

// Engineer는 Quotaable 안 구현
struct Engineer;
```

*trait*으로 *capability 표현*. push down의 자연 표현.

## 도구 / IDE

| 도구 | 기능 |
| --- | --- |
| IntelliJ | "Push Members Down" |
| Eclipse | "Push Down" |
| Rider | 같음 |

## 성능 고려

성능 무관 — *조직 변경만*. JIT는 같은 vtable lookup.

## 관련 패턴

- **역방향**: [Pattern 51: Pull Up Method](/blog/programming/design/refactoring-catalog/pattern51-pull-up-method)
- **자매**: [Pattern 55: Push Down Field](/blog/programming/design/refactoring-catalog/pattern55-push-down-field)
- **계층 정리**: [Pattern 60: Remove Subclass](/blog/programming/design/refactoring-catalog/pattern60-remove-subclass)
- **원칙**: Liskov Substitution Principle
