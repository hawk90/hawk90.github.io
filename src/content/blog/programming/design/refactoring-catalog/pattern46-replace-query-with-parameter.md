---
title: "Pattern 46: Replace Query with Parameter"
date: 2026-06-02T22:00:00
description: "함수 내부의 implicit 의존을 parameter로 — 순수성과 테스트성 회복."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 46
tags: [refactoring, dependency-injection, fowler]
draft: true
type: book-review
bookTitle: "Refactoring: Improving the Design of Existing Code, 2nd Edition"
bookAuthor: "Martin Fowler"
---

## 한 줄 요약

> 함수가 *외부 상태/global*에 의존하면 *추론과 테스트가 어렵다*. 의존을 *parameter로* 빼서 *명시 + 순수*에 가깝게.

## 동기 (Motivation)

[Replace Parameter with Query](/blog/programming/design/refactoring-catalog/pattern45-replace-parameter-with-query)의 *역방향*. 어느 쪽이 옳은지는 *맥락*에 달렸다.

함수 본문에서 *implicit query*가 많을수록:

- *순수성 깨짐*: 같은 입력에도 다른 결과 (global 상태에 의존).
- *테스트 어려움*: mock/setup이 복잡.
- *추론 어려움*: signature만 보고 *어떤 외부에 의존*하는지 모름.

```javascript
// Before
class HeatingPlan {
  get targetTemperature() {
    if (thermostat.selectedTemperature > this._max) return this._max;
    if (thermostat.selectedTemperature < this._min) return this._min;
    return thermostat.selectedTemperature;
  }
}
```

`thermostat`이 *global*. 이 함수는 *thermostat에 의존*하지만 signature에 표현 안 됨. 테스트하려면 *thermostat을 setup*해야.

```javascript
// After
class HeatingPlan {
  targetTemperature(selectedTemperature) {
    if (selectedTemperature > this._max) return this._max;
    if (selectedTemperature < this._min) return this._min;
    return selectedTemperature;
  }
}

// 호출
const target = heatingPlan.targetTemperature(thermostat.selectedTemperature);
```

함수가 *순수* — 같은 입력에 같은 결과. 테스트는 *값 전달*만으로.

### 신호

- 함수가 *global·singleton 상태* 읽음.
- *static method* 호출이 함수 본문 안.
- 함수 결과가 *외부 시점/state에 따라 변함*.
- *unit test 작성*에 큰 setup 필요.

### 언제 적용하는가

- 함수의 *재사용성* 높이고 싶음.
- *순수 함수*로 만들고 싶음 (memoize, 병렬, 추론).
- *test mock 부담* 줄이고 싶음.
- 의존이 *명시적으로 보여야 함* (DI 컨테이너).

### 언제 적용하지 않는가

- caller가 *전부 같은 값*을 전달 — 매개변수가 *항상 동일*하면 query가 더 단순.
- query가 *implementation detail*에 속함.

## 절차 (Mechanics)

1. **query**를 [Extract Variable](/blog/programming/design/refactoring-catalog/pattern03-extract-variable)로 추출.
2. **함수 본문 안**의 query 호출을 *그 변수로* 교체.
3. 변수를 [Change Function Declaration](/blog/programming/design/refactoring-catalog/pattern05-change-function-declaration)으로 *매개변수로 승격*.
4. 호출처에서 query를 *직접 전달*.
5. 컴파일·테스트.

## 예시 1 — Global state 제거

위 thermostat 예 참고.

## 예시 2 — Time dependency

```javascript
// Before
function getExpirationDate(invoice) {
  const today = new Date();
  return new Date(today.getTime() + invoice.daysToExpire * 86400000);
}
```

`new Date()`가 함수 안 — *테스트 시 시간 고정 어려움*.

```javascript
// After
function getExpirationDate(invoice, today) {
  return new Date(today.getTime() + invoice.daysToExpire * 86400000);
}

// 호출
const exp = getExpirationDate(invoice, new Date());

// 테스트
const fixed = new Date("2026-01-01");
expect(getExpirationDate(invoice, fixed)).toEqual(new Date("2026-01-31"));
```

*Clock injection* 패턴. 함수가 *순수*.

## 예시 3 — DB lookup 분리

```javascript
// Before
async function calculateOrderTax(order) {
  const customer = await db.findCustomer(order.customerId);
  return order.total * customer.taxRate;
}
```

DB 의존이 *함수 안* — 매번 DB hit, 테스트 시 *DB mock 필수*.

```javascript
// After
function calculateOrderTax(order, taxRate) {
  return order.total * taxRate;
}

// 호출
const customer = await db.findCustomer(order.customerId);
const tax = calculateOrderTax(order, customer.taxRate);
```

`calculateOrderTax`는 *순수 계산*. caller가 *DB 또는 mock 선택*.

## 자주 보는 안티패턴

### 1. *Parameter 폭증*
query를 다 빼면 *parameter 10개*. 의존이 너무 많다면 *Class 추출* ([Pattern 16](/blog/programming/design/refactoring-catalog/pattern16-extract-class))이 답.

### 2. *Caller 부담 가중*
caller가 같은 값을 *항상 계산해 전달* — [Replace Parameter with Query](/blog/programming/design/refactoring-catalog/pattern45-replace-parameter-with-query)로 다시 돌아갈 수도. *맥락 의존*.

### 3. *Time/random 전달*
시간·random은 *클럭 객체*로 묶어 한 번 전달. 매번 *별도 parameter*는 번거로움.

### 4. *Optional parameter 남용*
`function f(x, optionalDep = defaultDep)` — *default가 implicit 의존*. 분명한 표시.

### 5. *DI framework 의존 강제*
DI를 위해 *모든 함수 parameter화*는 과잉. 핵심 의존만.

### 6. *Pure-ness illusion*
parameter로 받지만 *그 객체가 mutable*이면 순수성 효과 약함. immutable 값 전달.

## Modern variants

### Functional core, imperative shell

```
[shell: I/O, time, DB] → calls → [core: pure functions]
```

순수 core가 *parameter로 받고*, shell이 *값 준비*.

### React props

```jsx
function PriceTag({ price, currency, formatter }) {
  return <span>{formatter(price, currency)}</span>;
}
```

모든 의존이 *props로 명시*.

### Rust — function signature exposes deps

```rust
fn calculate_tax(order: &Order, tax_rate: f64) -> f64 {
    order.total * tax_rate
}
```

함수 시그니처가 *완전한 의존 명세*.

### Dependency Injection 프레임워크

Spring `@Autowired`, Guice `@Inject`, Angular DI — *컨테이너가 parameter 주입*.

```typescript
class OrderService {
  constructor(private readonly db: Database, private readonly clock: Clock) {}
  calculateTax(order: Order) {
    const today = this.clock.now();   // injected
  }
}
```

## 도구 / IDE

| 도구 | 기능 |
| --- | --- |
| IntelliJ | "Replace Query with Parameter" |
| Resharper | "Make Method Static + Add Parameter" |
| ESLint | `no-global-assign` |

## 성능 고려

매개변수 전달 비용은 *무시*. 단 caller가 *불필요한 query*를 *매번 호출*하면 비용 증가 — 그 경우 *caller가 한 번 계산 후 캐시*.

## 관련 패턴

- **역방향**: [Pattern 45: Replace Parameter with Query](/blog/programming/design/refactoring-catalog/pattern45-replace-parameter-with-query)
- **자매**: [Pattern 6: Encapsulate Variable](/blog/programming/design/refactoring-catalog/pattern06-encapsulate-variable)
- **객체화**: [Pattern 16: Extract Class](/blog/programming/design/refactoring-catalog/pattern16-extract-class), [Pattern 21: Move Function](/blog/programming/design/refactoring-catalog/pattern21-move-function)
