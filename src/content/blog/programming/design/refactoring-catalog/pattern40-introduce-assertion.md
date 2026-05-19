---
title: "Pattern 40: Introduce Assertion"
date: 2026-05-02T16:00:00
description: "암묵적 invariant를 코드로 명시 — 가정이 깨지면 즉시 실패."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 40
tags: [refactoring, assertion, invariant, design-by-contract, fowler]
draft: true
type: book-review
bookTitle: "Refactoring: Improving the Design of Existing Code, 2nd Edition"
bookAuthor: "Martin Fowler"
---

## 한 줄 요약

> *"이 시점에 이 조건이 참이어야 한다"* — 함수가 묵시적으로 가정하는 것을 `assert`로 명시한다. 가정이 깨지면 *조용한 버그* 대신 *즉시 실패*.

## 동기 (Motivation)

코드의 모든 함수는 *전제 조건*과 *불변식*을 가진다. 그것이 문서에 적혀 있지도, 코드로 표현되지도 않으면 — 가정이 깨졌을 때 *수십 줄 후에 이상한 결과*로 나타나거나, *production에서 미묘한 bug*로 잠복한다.

```javascript
// Before — 암묵적 가정
function getExpenseLimit(employee) {
  return employee.primaryProject
    ? employee.primaryProject.memberCount * 100
    : employee.personalExpenseLimit;
}
```

이 함수는 *"primaryProject가 있거나 personalExpenseLimit이 있다"*를 가정한다. 둘 다 없으면 `undefined` 반환. 호출자는 의미 없는 결과를 받고 *어디서 잘못됐는지 모름*.

```javascript
// After
function getExpenseLimit(employee) {
  console.assert(
    employee.primaryProject || employee.personalExpenseLimit > 0,
    "employee must have either primaryProject or personalExpenseLimit"
  );
  return employee.primaryProject
    ? employee.primaryProject.memberCount * 100
    : employee.personalExpenseLimit;
}
```

가정이 코드로 *명시*. 위반되면 *그 자리에서 실패*. 디버깅이 *수십 줄 후*가 아닌 *원인 지점*에서 가능.

### Assertion이란 무엇인가

Assertion은 *프로그래머가 보장하는 조건*. 만약 깨지면 *프로그램 버그*. 따라서:

- *항상 참*이어야 함.
- *비즈니스 로직 분기에 쓰지 않음*.
- *production에서 제거 가능* (성능 위해).
- 동작에 영향 주면 안 됨.

### Assertion vs Exception vs 비즈니스 분기

| 종류 | 사용처 | 처리 |
| --- | --- | --- |
| **Assertion** | 프로그래머 보장 (있을 수 없는 상황) | crash / log |
| **Exception** | 외부 입력 검증, I/O 실패 | 호출자가 처리 |
| **비즈니스 분기** | 정상 도메인 변형 | 코드 분기 |

```javascript
function divide(a, b) {
  // 비즈니스 검증 — caller가 잘못 호출할 수 있음
  if (b === 0) throw new Error("division by zero");
  return a / b;
}

function calculateAverage(values) {
  // 내부 invariant — 호출자는 늘 비빈 배열 전달해야
  assert(values.length > 0, "values must be non-empty");
  return values.reduce((s, x) => s + x, 0) / values.length;
}
```

### 신호

- 함수 본문에 `// assumes x > 0` 같은 *주석으로 가정 표현*.
- *NaN*, `undefined`, null 결과가 *멀리서 발생*한 버그.
- 같은 가정이 여러 함수에 반복.
- *코드 리뷰*에서 "이게 어떻게 되는 거지?" 질문 빈번.

### 언제 적용하는가

- 함수의 *전제 조건*이 *주석으로만* 표현됨.
- 같은 invariant가 *여러 곳*에 가정됨.
- *디버깅 어려운* bug의 root cause 추적.

변환 구조를 한눈에 보면 다음과 같다.

![Pattern 40 — before/after 구조](/images/blog/refactoring-catalog/diagrams/pattern40-introduce-assertion.svg)

## 절차 (Mechanics)

1. **암묵적 가정** 식별 (주석, 작명, 변수 사용 패턴에서 단서).
2. *assert* 추가 — fail 시 *명확한 메시지*.
3. 컴파일·테스트 — *기존 호출자가 가정 위반*하지 않는지 확인.
4. 추가 후 *비즈니스 검증과 혼동하지 않게* — assertion은 *실수 잡는 용*.

## 예시 1 — Numeric invariant

```javascript
// Before
function getDiscountedPrice(price, discountRate) {
  return price * (1 - discountRate);
}
```

`discountRate`가 *0 ≤ rate ≤ 1*이어야 함을 가정. 위반되면 *음수 가격* 같은 *조용한 bug*.

```javascript
// After
function getDiscountedPrice(price, discountRate) {
  console.assert(
    discountRate >= 0 && discountRate <= 1,
    `discountRate must be 0..1, got ${discountRate}`
  );
  return price * (1 - discountRate);
}
```

## 예시 2 — Object state invariant

```javascript
class Account {
  withdraw(amount) {
    console.assert(this._balance >= 0, "balance invariant: must be non-negative");
    console.assert(amount > 0, "amount must be positive");
    this._balance -= amount;
    console.assert(this._balance >= 0, "withdraw caused negative balance");
  }
}
```

method *진입 전*과 *완료 후* 모두 검증. **Design by Contract**의 *pre/post-condition*.

## 예시 3 — Collection invariant

```javascript
function processItems(items) {
  console.assert(Array.isArray(items), "items must be array");
  console.assert(items.length > 0, "items must be non-empty");
  console.assert(items.every(i => typeof i === "object"), "all items must be objects");

  return items.map(transform);
}
```

복잡한 입력에 대한 *완전한 가정 명시*.

## 자주 보는 안티패턴

### 1. *Assertion에 side effect*
```javascript
assert(processAndCheck());   // side effect 있는 함수
```
production에서 assertion 제거 시 *processAndCheck()도 사라짐* → 동작 변경.

### 2. *비즈니스 검증을 assertion으로*
```javascript
function divide(a, b) {
  assert(b !== 0);   // ← 호출자가 0 줄 수 있는 정상 시나리오
  return a / b;
}
```
caller 실수도 정상 시나리오면 *throw Error*.

### 3. *지나치게 자주*
모든 함수에 5개씩 — 노이즈. *핵심 invariant*만.

### 4. *Assertion 메시지 부재*
```javascript
assert(x > 0);   // 실패 시 어디서 왜 잘못됐는지 모름
```
*상세 메시지*: `assert(x > 0, "expected positive x, got ${x}")`.

### 5. *Production에서 disable 안 함*
hot path에서 assertion이 *항상 평가*되면 성능 저하. Java `-da`, Python `-O`, JS는 환경 설정.

### 6. *Assertion이 동작에 영향*
```javascript
let x;
assert(x = compute()); // ← assertion 안에서 변수 할당
```
disable 시 x가 undefined. assertion은 *검사만*.

## Modern variants

### Java `assert`

```java
public int divide(int a, int b) {
    assert b != 0 : "divisor must be non-zero";
    return a / b;
}
```

`-ea`(enable assertions)로 활성화. 기본 off.

### Python `assert`

```python
def average(values):
    assert len(values) > 0, "values must be non-empty"
    return sum(values) / len(values)
```

`python -O`로 stripping.

### Rust — `assert!`, `debug_assert!`

```rust
fn average(values: &[f64]) -> f64 {
    debug_assert!(!values.is_empty(), "values must be non-empty");
    values.iter().sum::<f64>() / values.len() as f64
}
```

`debug_assert!`는 release 빌드에서 제거. `assert!`는 항상 유지.

### TypeScript — `asserts` keyword

```typescript
function assertDefined<T>(x: T | undefined, msg: string): asserts x is T {
  if (x === undefined) throw new Error(msg);
}

const customer = lookup(id);
assertDefined(customer, "customer not found");
customer.name;   // ← 컴파일러가 타입 narrowing
```

assertion이 *type narrowing*까지 한다.

### Design by Contract (Eiffel)

Bertrand Meyer가 1986년 *Eiffel*에서 도입. `require`/`ensure`/`invariant` 키워드 언어 차원.

```eiffel
deposit (amount: INTEGER)
    require
        amount > 0
    do
        balance := balance + amount
    ensure
        balance = old balance + amount
end
```

현대 언어로는 *Kotlin contracts*, *Java JML*, *C# Code Contracts* (deprecated).

## 도구 / IDE

| 도구 | 기능 |
| --- | --- |
| Java | `assert` keyword (`-ea`) |
| Python | `assert` |
| C/C++ | `<assert.h>` `assert()` (NDEBUG로 비활성) |
| Rust | `assert!`, `debug_assert!` |
| TypeScript | `asserts` keyword + custom helpers |
| 정적 분석 | SpotBugs, ESLint, Clippy로 일부 invariant 감지 |

## 성능 고려

- *Production assertion*은 비용 — 짧으면 무시, 복잡 검증이면 hot path에 두지 말 것.
- *Debug 빌드만*: Rust `debug_assert!`, C++ `assert` (NDEBUG로 strip).
- *성능 critical loop* 내부 assertion은 *상위 한 번* 확인으로 대체.

## 관련 패턴

- **자매**: [Pattern 39: Introduce Special Case](/blog/programming/design/refactoring-catalog/pattern39-introduce-special-case)
- **방어 코딩**: 외부 입력은 *exception*, 내부 가정은 *assertion*
- **Design by Contract**: pre/post-condition, class invariant
