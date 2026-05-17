---
title: "Pattern 55: Push Down Field"
date: 2026-06-03T07:00:00
description: "Superclass field가 일부 subclass에만 — 해당 subclass로 내려보낸다."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 55
tags: [refactoring, inheritance, push-down-field, fowler]
draft: true
type: book-review
bookTitle: "Refactoring: Improving the Design of Existing Code, 2nd Edition"
bookAuthor: "Martin Fowler"
---

## 한 줄 요약

> Superclass field가 *일부 subclass에만 의미*있다면 — 해당 subclass로 내려보내 *unused 데이터*를 정리.

## 동기 (Motivation)

[Pull Up Field](/blog/programming/design/refactoring-catalog/pattern52-pull-up-field)의 *역방향*. 시간이 지나며 *일부 subclass에서만 사용*되는 field가 생길 수 있다.

```javascript
// Before
class Employee {
  constructor() {
    this._name = "";
    this._quota = 0;   // Salesperson에서만 의미
  }
}
class Salesperson extends Employee {}
class Engineer extends Employee {}
class Manager extends Employee {}
```

`_quota`가 *Salesperson에만 의미*. Engineer/Manager에선 *항상 0* — *메모리 낭비*, *코드 잡음*.

```javascript
// After
class Employee {
  constructor() { this._name = ""; }
}
class Salesperson extends Employee {
  constructor() { super(); this._quota = 0; }
}
class Engineer extends Employee {}
class Manager extends Employee {}
```

### 신호

- superclass field가 *대부분 subclass에서 무관*.
- field가 *항상 default 값* (subclass에서 안 씀).
- *push down method* 시 field도 함께 이동.

### 언제 적용하는가

- field가 *소수 subclass*에만 의미.
- *Pull Up이 과거에 잘못 적용*됨.
- 상속 계층 *재구조화* 중.

### 언제 적용하지 않는가

- field가 *대부분 의미*있고 *일부 default* — 그대로 두는 게 단순.
- composition으로 *완전 재모델링*이 답인 경우.

## 절차 (Mechanics)

1. **field 사용 분석** — 어느 subclass에 의미?
2. **해당 subclass로 field 선언 이동**.
3. **superclass에서 field 제거**.
4. **superclass에 있던 field 사용 코드** 정리.
5. 컴파일·테스트.

## 예시 1 — 위 quota 예 참고.

## 예시 2 — 사용 method도 함께

```javascript
// Before
class Customer {
  constructor() { this._loyaltyPoints = 0; }   // Premium에만 의미
  earnPoints(amount) { this._loyaltyPoints += amount; }
}
class RegularCustomer extends Customer {}
class PremiumCustomer extends Customer {}
```

```javascript
// After
class Customer {}
class RegularCustomer extends Customer {}
class PremiumCustomer extends Customer {
  constructor() { super(); this._loyaltyPoints = 0; }
  earnPoints(amount) { this._loyaltyPoints += amount; }
}
```

field와 *관련 method 함께* 이동 — [Push Down Method](/blog/programming/design/refactoring-catalog/pattern54-push-down-method).

## 예시 3 — Intermediate class

field가 *여러 subclass에 의미*인데 *전체 superclass에는 의미 없음*.

```javascript
// Before
class Employee {
  constructor() { this._salary = 0; }
}
class SalariedEmployee extends Employee {}
class HourlyEmployee extends Employee {}
class Volunteer extends Employee {}   // salary = 0, 의미 없음
```

```javascript
// After — 중간 계층 도입
class Employee {}
class PaidEmployee extends Employee {
  constructor() { super(); this._salary = 0; }
}
class SalariedEmployee extends PaidEmployee {}
class HourlyEmployee extends PaidEmployee {}
class Volunteer extends Employee {}
```

`PaidEmployee` 계층 추가 — *salary가 있는 그룹*만 분리. push down + restructure.

## 자주 보는 안티패턴

### 1. *Push down으로 인한 중복*
3개 subclass에 각각 *같은 field* 추가 → [Pull Up Field](/blog/programming/design/refactoring-catalog/pattern52-pull-up-field)로 다시 올려야. 신중 결정.

### 2. *Field만 이동, method는 안 옮김*
field 사용 method도 함께 이동해야. 누락 시 *NullReferenceException*.

### 3. *Caller가 super 타입 접근*
caller가 `employee.quota` 호출 → push down 후 *컴파일 에러*. caller 정리 필수.

### 4. *Serialization 호환 깨짐*
JSON/DB serialization이 *기존 schema* 의존 — push down 시 *마이그레이션 필요*.

### 5. *너무 깊은 계층*
push down 반복 → 4단계+ 깊이. *flat structure + composition*이 단순.

### 6. *Premature push down*
field가 *대부분 의미*인데 한 subclass에서만 *임시 무시*→ push down하면 *향후 재추가 부담*.

## Modern variants

### Composition

```javascript
class Employee {
  constructor(payment) { this._payment = payment; }
  get salary() { return this._payment?.salary ?? 0; }
}

const salaried = new Employee({ type: "salary", salary: 50000 });
const volunteer = new Employee(null);
```

상속 안 쓰고 *옵셔널 component*.

### Optional field

```typescript
class Employee {
  salary?: number;   // optional
}
```

field 자체를 *옵셔널 타입*으로 — push down 없이도 표현.

### Discriminated union (TS)

```typescript
type Employee =
  | { type: "salaried"; salary: number }
  | { type: "hourly"; rate: number; hours: number }
  | { type: "volunteer" };
```

각 case가 *자기 field만* — type-safe.

### Rust enum variant

```rust
enum Employee {
    Salaried { salary: u32 },
    Hourly { rate: f64, hours: u32 },
    Volunteer,
}
```

variant마다 *고유 데이터*. push down의 *type 차원 표현*.

## 도구 / IDE

| 도구 | 기능 |
| --- | --- |
| IntelliJ | "Push Members Down" — field/method 함께 |
| Eclipse | "Push Down" |
| Rider | 같음 |

## 성능 고려

field 위치는 *메모리 절약* — superclass에 두면 *모든 subclass instance에 공간*. 작은 차이지만 큰 객체에서 유의미.

## 관련 패턴

- **역방향**: [Pattern 52: Pull Up Field](/blog/programming/design/refactoring-catalog/pattern52-pull-up-field)
- **자매**: [Pattern 54: Push Down Method](/blog/programming/design/refactoring-catalog/pattern54-push-down-method)
- **계층 정리**: [Pattern 60: Remove Subclass](/blog/programming/design/refactoring-catalog/pattern60-remove-subclass)
