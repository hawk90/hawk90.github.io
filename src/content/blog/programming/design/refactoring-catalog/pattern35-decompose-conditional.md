---
title: "Pattern 35: Decompose Conditional"
date: 2026-05-02T11:00:00
description: "복잡한 조건문을 named function으로 — 무엇이 *왜* 분기인지 한눈에."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 35
tags: [refactoring, conditional, named-function, fowler]
draft: true
type: book-review
bookTitle: "Refactoring: Improving the Design of Existing Code, 2nd Edition"
bookAuthor: "Martin Fowler"
---

## 한 줄 요약

> 복잡한 조건문은 *결정 자체*와 *분기 결과*를 named function으로 분리해 *왜·무엇*을 코드에 새긴다.

## 동기 (Motivation)

조건문은 *분기 로직*을 표현하지만, 자라면서 *왜 이 조건인가*가 가려진다. 특히 다음이 섞이면 가독성이 급락한다.

- 비교식 자체가 *길고 도메인 용어 부재* (`if (date.before(SUMMER_START) || date.after(SUMMER_END))`).
- then/else 안 *여러 줄*의 계산.
- *boolean 연산자 조합*이 복잡 (`&&`, `||`, `!`).

```javascript
if (!aDate.isBefore(plan.summerStart) && !aDate.isAfter(plan.summerEnd)) {
  charge = quantity * plan.summerRate;
} else {
  charge = quantity * plan.regularRate + plan.regularServiceCharge;
}
```

읽는 사람은 *조건 의미*를 추측해야 한다 — "summer 범위 안인가?" then/else는 *길어질수록 분기 시작점*이 흐려진다.

각각을 named function으로 추출.

```javascript
if (summer()) {
  charge = summerCharge();
} else {
  charge = regularCharge();
}

function summer() {
  return !aDate.isBefore(plan.summerStart) && !aDate.isAfter(plan.summerEnd);
}
function summerCharge()  { return quantity * plan.summerRate; }
function regularCharge() { return quantity * plan.regularRate + plan.regularServiceCharge; }
```

조건문 자체가 *"if summer then summerCharge else regularCharge"*로 읽힌다 — 도메인 모델 그 자체.

### 신호

- 조건식이 *한 줄 넘어감*.
- then/else 블록이 *각 5줄 이상*.
- boolean 조합이 `&& || !` 3개 이상.
- 같은 조건이 *여러 곳에 중복*.
- 코드 리뷰에서 *조건 의미* 질문이 반복.

### 언제 적용하는가

- 조건문이 *길고 의도 불명*.
- 같은 조건을 *재사용*하려는 신호.
- *테스트 케이스*가 조건 단위로 작성되어야 함.

변환 구조를 한눈에 보면 다음과 같다.

![Pattern 35 — before/after 구조](/images/blog/refactoring-catalog/diagrams/pattern35-decompose-conditional.svg)

## 절차 (Mechanics)

1. **조건식**을 [Extract Function](/blog/programming/design/refactoring-catalog/pattern01-extract-function)으로 추출, *질문 형태* 이름 (`isSummer`, `canAffordLoan`).
2. **then-block**을 추출, *동사* 이름 (`calculateSummerCharge`).
3. **else-block**도 같이 추출.
4. 컴파일·테스트.

## 예시 1 — 기본 패턴

```javascript
// Before
function calculateCharge(date, quantity, plan) {
  let charge;
  if (!date.isBefore(plan.summerStart) && !date.isAfter(plan.summerEnd)) {
    charge = quantity * plan.summerRate;
  } else {
    charge = quantity * plan.regularRate + plan.regularServiceCharge;
  }
  return charge;
}
```

```javascript
// After
function calculateCharge(date, quantity, plan) {
  return isSummer(date, plan)
    ? summerCharge(quantity, plan)
    : regularCharge(quantity, plan);
}

function isSummer(date, plan) {
  return !date.isBefore(plan.summerStart) && !date.isAfter(plan.summerEnd);
}
function summerCharge(quantity, plan) {
  return quantity * plan.summerRate;
}
function regularCharge(quantity, plan) {
  return quantity * plan.regularRate + plan.regularServiceCharge;
}
```

함수 본문이 *비즈니스 규칙 문장*이 된다.

## 예시 2 — 다중 조건

```javascript
// Before
function getInsurancePrice(person, plan) {
  let price;
  if (person.age < 18 || (person.age > 65 && !person.isPremium)) {
    price = plan.basePrice * 0.5;
  } else if (person.hasChronicCondition && person.age > 40) {
    price = plan.basePrice * 1.5 + plan.surcharge;
  } else {
    price = plan.basePrice;
  }
  return price;
}
```

조건과 가격 계산 모두 *섞임*.

```javascript
// After
function getInsurancePrice(person, plan) {
  if (qualifiesForDiscount(person)) return discountedPrice(plan);
  if (requiresSurcharge(person))    return surchargedPrice(plan);
  return standardPrice(plan);
}

function qualifiesForDiscount(person) {
  return person.age < 18 || (person.age > 65 && !person.isPremium);
}
function requiresSurcharge(person) {
  return person.hasChronicCondition && person.age > 40;
}
function discountedPrice(plan)  { return plan.basePrice * 0.5; }
function surchargedPrice(plan)  { return plan.basePrice * 1.5 + plan.surcharge; }
function standardPrice(plan)    { return plan.basePrice; }
```

guard clause + decomposition. main 함수가 *규정 자체*. 도메인 전문가도 읽을 수 있다.

## 예시 3 — Boolean 조합 정리

```javascript
// Before
if (record.status === "active" &&
    record.expiresAt > new Date() &&
    !record.isFrozen &&
    record.balance > 0) {
  process(record);
}
```

`&&` 4개 — 의미 추측 어려움.

```javascript
// After
if (isReadyToProcess(record)) {
  process(record);
}

function isReadyToProcess(record) {
  return isActiveAndUnfrozen(record) && hasFunds(record);
}
function isActiveAndUnfrozen(record) {
  return record.status === "active" && !record.isFrozen && record.expiresAt > new Date();
}
function hasFunds(record) {
  return record.balance > 0;
}
```

2단계 decompose — *상위 의미*와 *세부 조건*. 테스트도 각 함수 단위.

## 자주 보는 안티패턴

### 1. *너무 잘게* 분해
`isPositive(n) { return n > 0; }` — 한 비교는 *그대로 두는 게 더 읽기 좋다*. 의미가 *복합*일 때만 추출.

### 2. *부적절한 이름*
`condition1()`, `check()` — 추출했지만 *이름이 의미 없음*. 도메인 단어가 필요.

### 3. *부수효과* 가진 query
```javascript
function isReady() {
  doSomething();   // ← side effect
  return true;
}
```
조건 query는 *순수 함수*여야. 부수효과 분리.

### 4. *조건 + 결과 혼합*
```javascript
function summerOrRegularCharge() {
  if (isSummer()) return summerCharge();
  return regularCharge();
}
```
이미 *Replace Conditional with Polymorphism*이 더 나은 case일 수 있음.

### 5. *Same condition* 여러 곳 중복
중복 추출이 안 됐다 — 중복이 보이면 그 조건이 *명백한 helper*.

### 6. *Boolean parameter*로 분기
```javascript
function charge(isSummer) {
  if (isSummer) return ...;
  return ...;
}
```
[Pattern 43: Remove Flag Argument](/blog/programming/design/refactoring-catalog/pattern43-remove-flag-argument) 적용 — 분기 자체를 함수 호출에서.

## Modern variants

### Ternary로 더 짧게

```javascript
return isSummer(date, plan)
  ? summerCharge(quantity, plan)
  : regularCharge(quantity, plan);
```

if/else가 *값 반환*만 하면 ternary가 더 읽기 좋다.

### Pattern matching (TS / Rust / Kotlin)

```rust
match season(date, plan) {
    Season::Summer => summer_charge(quantity, plan),
    Season::Regular => regular_charge(quantity, plan),
}
```

조건을 *enum*으로 표현하면 exhaustive check.

### Strategy 패턴

복잡한 분기는 [Pattern 38: Replace Conditional with Polymorphism](/blog/programming/design/refactoring-catalog/pattern38-replace-conditional-with-polymorphism) 또는 *Strategy*로 더 강력하게.

```javascript
const calculators = {
  summer: (q, p) => q * p.summerRate,
  regular: (q, p) => q * p.regularRate + p.regularServiceCharge
};
const calculate = calculators[currentSeason()];
```

### Guard clause

```javascript
function getPrice(person, plan) {
  if (qualifiesForDiscount(person)) return discountedPrice(plan);
  if (requiresSurcharge(person))    return surchargedPrice(plan);
  return standardPrice(plan);
}
```

[Pattern 37: Replace Nested Conditional with Guard Clauses](/blog/programming/design/refactoring-catalog/pattern37-replace-nested-conditional-with-guard-clauses)와 자주 조합.

## 도구 / IDE

| 도구 | 기능 |
| --- | --- |
| IntelliJ | "Extract Method" (Ctrl-Alt-M) |
| VS Code | "Extract to method" / "Extract to function" |
| ESLint | `complexity` rule — cyclomatic 한계 |
| SonarLint | "Cognitive Complexity" 경고 |

## 성능 고려

함수 호출 overhead는 *JIT 인라인*으로 사라진다. 런타임 영향 0.

## 관련 패턴

- **부모**: [Pattern 1: Extract Function](/blog/programming/design/refactoring-catalog/pattern01-extract-function)
- **자매**: [Pattern 36: Consolidate Conditional Expression](/blog/programming/design/refactoring-catalog/pattern36-consolidate-conditional-expression)
- **다음 단계**: [Pattern 38: Replace Conditional with Polymorphism](/blog/programming/design/refactoring-catalog/pattern38-replace-conditional-with-polymorphism)
- **Guard**: [Pattern 37: Replace Nested Conditional with Guard Clauses](/blog/programming/design/refactoring-catalog/pattern37-replace-nested-conditional-with-guard-clauses)
