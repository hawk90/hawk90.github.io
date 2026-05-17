---
title: "Pattern 26: Slide Statements"
date: 2026-06-02T02:00:00
description: "관련 코드를 가까이 — 가독성과 다음 리팩토링의 발판."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 26
tags: [refactoring, slide-statements, readability, fowler]
draft: true
type: book-review
bookTitle: "Refactoring: Improving the Design of Existing Code, 2nd Edition"
bookAuthor: "Martin Fowler"
---

## 한 줄 요약

> 관련 있는 코드를 *서로 가까이* 두면 읽기 쉬워지고, 다음 리팩터링(Extract Function 등)도 자연스러워진다.

## 동기 (Motivation)

코드의 *읽기 흐름*은 위에서 아래로 흐른다. 관련 statement가 *흩어져 있으면* 독자가 이리저리 점프해야 한다. *가까이* 두면 한 번에 의미를 파악한다.

특히 **변수 선언은 사용 직전에** 두는 것이 좋다.

```javascript
// 흐름이 끊김
const startDate = new Date();   // 위에서 선언
console.log("Processing...");
processData();
log("done");
const end = startDate.toLocaleString();   // 한참 후 사용

// 사용 가까이
console.log("Processing...");
processData();
log("done");

const startDate = new Date();
const end = startDate.toLocaleString();
```

Slide는 *작은 리팩토링*이지만 [Extract Function](/blog/programming/design/refactoring-catalog/pattern01-extract-function) 같은 *큰 리팩토링의 발판*. 관련 코드가 모여 있어야 한 덩어리로 추출 가능.

### 신호

- 변수 선언이 *사용처에서 멀다*.
- 같은 주제(예: log, validation, formatting)의 statement가 *흩어져 있다*.
- 한 함수를 *추출하려는데* 관련 statement가 *순서 없이 섞여 있다*.

### 언제 적용하는가

- 변수 선언과 사용 사이 *거리가 멀다*.
- *같은 주제* statement가 흩어져 있다.
- [Extract Function](/blog/programming/design/refactoring-catalog/pattern01-extract-function)을 *준비*한다.
- 코드 review에서 *왜 이게 여기 있지?* 의문이 든다.

## 절차 (Mechanics)

1. **이동할 statement**의 *side effect와 dependency* 분석.
   - 어떤 변수를 *읽는가*? 어떤 변수에 *쓰는가*?
   - 다른 statement의 *결과에 의존*하는가?
2. **이동 가능한지 검증**: 이동 경로의 *중간 statement*가 이동할 statement의 dependency를 깨지 않는지.
3. **이동**.
4. **컴파일·테스트**.

### Side effect 분석 — 안전한 이동의 조건

statement A를 B 자리로 이동하려면, A와 B 사이의 *모든 statement* S에 대해:

- A가 *읽는* 변수를 S가 *쓰지 않음*.
- A가 *쓰는* 변수를 S가 *읽거나 쓰지 않음*.
- A와 S가 *공유 상태*에 동시 영향 없음.

이게 깨지면 이동 후 *행동 변경*.

## 예시 1 — 변수 선언을 사용처 가까이

```javascript
// Before
const pricingPlan = retrievePricingPlan();
const order       = retreiveOrder();

let charge;
const chargePerUnit = pricingPlan.unit;
// ... 한참 다른 로직 ...
// chargePerUnit 첫 사용
charge = order.units * chargePerUnit;
```

`chargePerUnit` 선언이 한참 위. 사용처 옆으로 옮기면 읽기 흐름이 자연.

```javascript
// After
const pricingPlan = retrievePricingPlan();
const order       = retreiveOrder();

let charge;
// ... 한참 다른 로직 ...
const chargePerUnit = pricingPlan.unit;
charge = order.units * chargePerUnit;
```

## 예시 2 — 같은 주제 statement 그룹화

```javascript
// Before — 영수증 출력이 흩어짐
function printReceipt(order) {
  console.log("===== Receipt =====");
  const total = order.items.reduce((s, x) => s + x.price, 0);
  console.log(`Customer: ${order.customer}`);
  const tax = total * 0.1;
  console.log(`Subtotal: ${total}`);
  console.log(`Tax: ${tax}`);
  console.log("===================");
}
```

계산 statement와 출력 statement가 섞여 있음. 그룹화:

```javascript
// After
function printReceipt(order) {
  // 계산
  const total = order.items.reduce((s, x) => s + x.price, 0);
  const tax   = total * 0.1;

  // 출력
  console.log("===== Receipt =====");
  console.log(`Customer: ${order.customer}`);
  console.log(`Subtotal: ${total}`);
  console.log(`Tax: ${tax}`);
  console.log("===================");
}
```

이제 [Extract Function](/blog/programming/design/refactoring-catalog/pattern01-extract-function)이 자연스럽다:

```javascript
function printReceipt(order) {
  const { total, tax } = calculate(order);
  printLines(order, total, tax);
}

function calculate(order) {
  const total = order.items.reduce((s, x) => s + x.price, 0);
  return { total, tax: total * 0.1 };
}

function printLines(order, total, tax) {
  console.log("===== Receipt =====");
  console.log(`Customer: ${order.customer}`);
  console.log(`Subtotal: ${total}`);
  console.log(`Tax: ${tax}`);
  console.log("===================");
}
```

## 예시 3 — Side effect 검증

```javascript
// Before
const order = readOrderFromDb();
const customer = readCustomerFromDb(order.customerId);   // DB 호출 (side effect)
processData();
sendEmail(customer.email);
```

`customer` 선언을 사용처 옆으로 옮기고 싶다.

```javascript
const order = readOrderFromDb();
processData();
const customer = readCustomerFromDb(order.customerId);
sendEmail(customer.email);
```

dependency 확인:
- `customer`가 *읽는* — `order.customerId` (이동 경로의 `processData()`는 order 변경 안 함 가정).
- `customer`는 DB *read* — `processData`가 DB write라면 *결과가 달라질 수 있다*.

만약 `processData`가 DB write라면 이동 *불가* — 둘 사이의 *읽기 시점 차이*가 의미를 바꾼다.

## 자주 보는 안티패턴

### 1. Side effect 무시
*statement 이동이 항상 안전하다*고 가정하면 행동 변경. 반드시 dependency 분석.

### 2. 너무 많이 한 번에
한 번에 *많은 statement* 이동하면 회귀 추적 불가. *한 statement씩*.

### 3. 변수 *재선언* 망각
일부 언어 (Java, C#)는 *블록 안에서만* 변수 유효. 이동 시 변수 scope 깨질 수 있다.

### 4. Sliding이 곧 *Extract*인 줄
slide 자체는 *준비*. extract 같은 큰 변경은 별도 단계로.

### 5. Comment 안 따라가기
statement에 붙은 *주석*이 그 statement의 *의미*. 같이 이동해야 의도 보존.

## Modern variants

### 함수형 스타일에선 자연스러움
함수형 코드는 *선언과 사용*이 보통 한 줄. slide 거의 불필요.

```rust
let total = items.iter().map(|x| x.price).sum::<f64>();
let tax = total * 0.1;
```

### TypeScript / IDE 도구
IntelliJ의 *move statement up/down* (Cmd-Shift-Up/Down). *자동 dependency 분석*은 약해 — 수동 검증.

### const-by-default
ES6의 `const`는 *재할당 금지*. side effect 분석이 단순해진다.

## 도구 / IDE

| 도구 | 기능 |
| --- | --- |
| IntelliJ | Cmd-Shift-Up/Down (Move statement) |
| VS Code | Alt-Up/Down (line move) — dependency 모름 |
| Rider | 같음 |

자동 도구는 *line move*만. *dependency 안전성*은 사람 책임.

## 성능 고려

statement 위치는 *컴파일러가 재배열* 가능 (instruction reordering, dead code elimination). 보통 무관.

## 관련 패턴

- **다음 단계**: [Pattern 1: Extract Function](/blog/programming/design/refactoring-catalog/pattern01-extract-function)
- **자매**: [Pattern 27: Split Loop](/blog/programming/design/refactoring-catalog/pattern27-split-loop)
- **변수 분리**: [Pattern 30: Split Variable](/blog/programming/design/refactoring-catalog/pattern30-split-variable)
