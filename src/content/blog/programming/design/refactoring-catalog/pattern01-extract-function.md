---
title: "Pattern 1: Extract Function"
date: 2026-05-02T01:00:00
description: "긴 함수에서 의도를 드러내는 작은 함수로 — Fowler가 가장 자주 쓰는 리팩터링."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 1
tags: [refactoring, extract-function, fowler]
draft: true
type: book-review
bookTitle: "Refactoring: Improving the Design of Existing Code, 2nd Edition"
bookAuthor: "Martin Fowler"
---

## 한 줄 요약

> 코드 한 토막이 *무엇을 하는지* 한 줄로 말할 수 있다면, 그것은 함수가 되어야 한다.

## 동기 (Motivation)

긴 함수에는 *구현(implementation)*과 *의도(intention)*가 섞여 있다. 의도는 "왜 이것을 하는가"를, 구현은 "어떻게 하는가"를 말한다. 둘이 한 덩어리로 들러붙어 있으면 읽는 사람은 매번 *어떻게*를 다 따라간 뒤에야 *왜*를 짐작한다.

두 차원을 분리하는 가장 단순한 도구가 Extract Function이다. 짧은 함수에 *의도를 담은 이름*을 붙이면 그 이름이 *주석보다 강한 문서*가 된다. 호출자는 함수 이름만 보고 의도를 파악하고, 필요할 때만 본문으로 내려간다.

Fowler 본인이 가장 자주 쓰는 리팩터링이다. 1판에서는 "함수가 한 화면을 넘기면" 같은 길이 기준을 강조했지만 2판에서는 *의도를 한 줄로 말할 수 있는가*로 기준이 바뀌었다. 길이 자체보다 *추상화 단계*가 중요하다는 입장.

### 언제 적용하는가

- 함수가 한 화면을 넘긴다.
- 코드 블록 앞에 `// this part does X` 같은 주석이 붙어 있다. 그 주석은 *함수 이름이 되고 싶다*는 신호.
- 같은 코드 또는 *거의 같은 코드*가 여러 곳에 중복된다.
- 변수 이름이 한 토막의 의도를 충분히 설명하지 못한다.
- 함수 내부에서 *추상화 단계가 섞여* 있다 — 한 줄은 비즈니스 규칙, 다음 줄은 SQL 문자열 조립.
- 디버깅 시 한 블록을 *통째로 step over*하고 싶다.

### 두 종류의 반대 의견과 답

> "함수가 많아지면 호출 비용이 비싸지지 않나?"

거의 무시할 수 있다. 현대 JIT·LLVM·V8은 핫패스 함수를 인라인한다. 측정 전까지는 가독성을 우선.

> "함수가 너무 많으면 점프하느라 더 헤맨다."

좋은 *이름*이 점프를 줄인다. 함수 이름이 의도를 충실히 담으면 본문으로 내려갈 일이 거의 없다. 이름이 약하면 그것이 추출 자체의 문제가 아니라 *이름의 문제*다.

## 절차 (Mechanics)

1. 새 함수를 만들고 *의도를 드러내는 이름*을 붙인다. *동작*("compute total")이 아닌 *목적*("calculate outstanding balance")으로.
2. 추출할 코드를 원래 함수에서 새 함수로 **복사**한다 (자르지 말고).
3. 새 함수의 *지역 변수와 매개변수*를 정리한다.
   - 사용만 하는 변수는 **매개변수**로.
   - 추출 코드 안에서 *수정되는* 변수는 **반환값**으로. 둘 이상 수정되면 [Split Variable](/blog/programming/design/refactoring-catalog/pattern30-split-variable)부터 또는 객체 반환.
   - 매개변수가 너무 많으면 [Introduce Parameter Object](/blog/programming/design/refactoring-catalog/pattern08-introduce-parameter-object).
4. 컴파일 / 테스트.
5. 원래 위치에서 추출한 코드를 *새 함수 호출*로 대체한다.
6. 같은 또는 유사한 코드가 다른 호출자에 있는지 둘러본다. 있다면 그 호출도 새 함수로 옮기는 기회.

언어가 *지역 함수* (JavaScript의 nested function, Python의 nested def)를 지원하면 그 안에서 시작해 외부 변수 캡처에 기대도 OK. 안정되면 모듈 최상위로 [Move Function](/blog/programming/design/refactoring-catalog/pattern21-move-function).

## 예시 1 — 주석을 함수 이름으로

가장 흔한 케이스. 주석으로 구역이 나뉜 긴 함수.

```javascript
// Before
function printOwing(invoice) {
  let outstanding = 0;

  // print banner
  console.log("***********************");
  console.log("**** Customer Owes ****");
  console.log("***********************");

  // calculate outstanding
  for (const o of invoice.orders) outstanding += o.amount;

  // record due date
  const today = Clock.today;
  invoice.dueDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 30);

  // print details
  console.log(`name: ${invoice.customer}`);
  console.log(`amount: ${outstanding}`);
  console.log(`due: ${invoice.dueDate.toLocaleDateString()}`);
}
```

각 주석이 *함수 이름이 되고 싶다*고 외친다.

```javascript
// After
function printOwing(invoice) {
  printBanner();
  const outstanding = calculateOutstanding(invoice);
  recordDueDate(invoice);
  printDetails(invoice, outstanding);
}

function printBanner() {
  console.log("***********************");
  console.log("**** Customer Owes ****");
  console.log("***********************");
}

function calculateOutstanding(invoice) {
  let result = 0;
  for (const o of invoice.orders) result += o.amount;
  return result;
}

function recordDueDate(invoice) {
  const today = Clock.today;
  invoice.dueDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 30);
}

function printDetails(invoice, outstanding) {
  console.log(`name: ${invoice.customer}`);
  console.log(`amount: ${outstanding}`);
  console.log(`due: ${invoice.dueDate.toLocaleDateString()}`);
}
```

호출자 `printOwing`을 읽으면 *4단계 알고리즘*이 한눈에 들어온다. 각 단계의 *구현*이 궁금할 때만 그 함수로 내려간다. 이게 추상화 계층(layered abstraction)의 가장 작은 형태.

### 미세 결정 — `recordDueDate`가 invoice를 변경한다

`recordDueDate(invoice)`는 *부수효과*(invoice 변경)를 일으킨다. 이름이 `record`로 시작해 *상태 변경*임을 알린다. 만약 *반환*하는 함수로 바꾸려면 `dueDateFor(invoice)`로 이름·시그니처를 모두 바꾼다. 부수효과 함수와 query 함수를 *분리*하는 패턴이 [Separate Query from Modifier](/blog/programming/design/refactoring-catalog/pattern41-separate-query-from-modifier).

## 예시 2 — 지역 변수를 매개변수로 (read-only)

```javascript
// Before
function reportLines(customer) {
  const lines = [];
  gatherCustomerData(lines, customer);
  return lines;
}

function gatherCustomerData(out, customer) {
  out.push(["name", customer.name]);
  out.push(["location", customer.location]);
}
```

`gatherCustomerData`가 `out`을 *변경*해서 결과를 돌려준다 — Java/C 스타일. JavaScript에선 *반환값*이 더 자연스럽다.

```javascript
// After
function reportLines(customer) {
  return gatherCustomerData(customer);
}

function gatherCustomerData(customer) {
  return [
    ["name", customer.name],
    ["location", customer.location],
  ];
}
```

매개변수가 read-only가 되어 함수가 *pure*해진다. 테스트·재사용 모두 좋아진다.

## 예시 3 — 지역 변수가 변경되는 경우

추출하려는 코드가 *지역 변수를 수정*한다면 *반환값*으로 처리한다.

```javascript
// Before
function calculateScore(player) {
  let baseScore  = player.baseScore;
  let multiplier = 1.0;

  // bonus
  if (player.hasBonus) {
    baseScore += player.bonus;
    multiplier += 0.2;
  }
  // penalty
  if (player.hasPenalty) {
    baseScore -= player.penalty;
    multiplier -= 0.1;
  }

  return baseScore * multiplier;
}
```

두 변수가 각각 두 블록에서 변경된다. *Split Variable*도 어려운 케이스. 객체 반환으로 묶는다.

```javascript
// After
function calculateScore(player) {
  let { baseScore, multiplier } = applyBonus(player, { baseScore: player.baseScore, multiplier: 1.0 });
  ({ baseScore, multiplier }    = applyPenalty(player, { baseScore, multiplier }));
  return baseScore * multiplier;
}

function applyBonus(player, { baseScore, multiplier }) {
  if (player.hasBonus) {
    baseScore += player.bonus;
    multiplier += 0.2;
  }
  return { baseScore, multiplier };
}

function applyPenalty(player, { baseScore, multiplier }) {
  if (player.hasPenalty) {
    baseScore -= player.penalty;
    multiplier -= 0.1;
  }
  return { baseScore, multiplier };
}
```

객체 분해와 재할당이 번거롭다. 이 시점에 보통 [Replace Primitive with Object](/blog/programming/design/refactoring-catalog/pattern14-replace-primitive-with-object)로 `Score { base, multiplier, apply() }`를 만드는 게 다음 자연스러운 단계.

## 자주 보는 안티패턴

### 1. 너무 작은 추출
한 줄짜리 함수가 *그 한 줄을 단순 재명명*만 한다면 가독성 이득이 없다. `function increment(x) { return x + 1; }` 같은 경우. 그 한 줄이 *도메인 의미*를 가질 때만 추출.

### 2. 이름이 동작을 베끼는 경우
`processData()`, `handleInput()`, `doStuff()` — 이름이 의도를 못 담는다. 동작이 보이는 게 아니라 *왜·무엇이 결과인가*가 보여야 한다. 이름이 안 떠오르면 그 코드 토막 자체가 *책임이 모호*한 것 — 한 번 더 분할.

### 3. 추출 후 매개변수 폭발
6개 이상 매개변수를 받는 함수가 됐다면 추출 전 단계 — [Introduce Parameter Object](/blog/programming/design/refactoring-catalog/pattern08-introduce-parameter-object)로 묶기.

### 4. 너무 깊은 nesting 안에서 추출
삼중 if 안의 한 토막을 추출하면 함수 시그니처가 *그 nesting의 컨텍스트를 매개변수로* 받느라 복잡해진다. 먼저 [Replace Nested Conditional with Guard Clauses](/blog/programming/design/refactoring-catalog/pattern37-replace-nested-conditional-with-guard-clauses)로 nesting을 평탄화.

### 5. 부수효과 함수와 query 함수 섞기
한 추출 함수가 *상태도 바꾸고 값도 반환*하면 호출 순서·횟수에 의존하는 코드가 된다. [Separate Query from Modifier](/blog/programming/design/refactoring-catalog/pattern41-separate-query-from-modifier).

### 6. 호출자에 *남은 한 줄*에 의미 없음
추출 결과 호출자가 *그 함수만 부르는 빈 wrapper*가 되면, 호출자 자체가 추출의 대상이거나 [Inline Function](/blog/programming/design/refactoring-catalog/pattern02-inline-function) 후보.

## Modern variants

### Arrow function · IIFE
JavaScript에선 추출 함수가 *재사용 없을 때* arrow function이나 IIFE로 인라인 정의해 *위치를 가까이* 둘 수 있다.

```javascript
const total = (() => {
  let r = 0;
  for (const o of orders) r += o.amount;
  return r;
})();
```

가독성에선 trade-off — 한 번 보고 끝낼 거면 OK, 재사용 가능하면 정식 함수.

### Currying / partial application
함수형 코드에선 *매개변수를 단계적으로 받는* 형태로 추출이 자연스럽다.

```javascript
const taxableCharge = (rate) => (amount) => amount * (1 - rate);
const localTax = taxableCharge(0.08);
const a = localTax(100);
const b = localTax(200);
```

같은 *고정 인자*에 다른 입력을 적용하는 패턴이 반복되면 currying이 깔끔.

### Method object
함수 안 지역 변수가 너무 많고 서로 얽혀 있어 추출이 어렵다면 [Replace Function with Command](/blog/programming/design/refactoring-catalog/pattern49-replace-function-with-command)로 *클래스로 승격*. 각 단계가 메서드, 지역 변수가 필드.

## 도구 / IDE

| 도구 | 단축키 |
| --- | --- |
| IntelliJ / WebStorm | Cmd-Option-M (Extract Method) |
| VS Code | Cmd-. → "Extract function" |
| Rider (C#) | Ctrl-R, M |
| Eclipse | Alt-Shift-M |
| Rust Analyzer | "Extract into function" code action |

자동 도구는 *모든 변수 분석*을 사람보다 정확히 한다. 매번 수동으로 하지 말 것.

## 성능 고려

- JIT (V8, HotSpot, .NET) 모두 hot function 인라인. 호출 비용 거의 0.
- C/C++/Rust는 `inline` 힌트 또는 컴파일러 최적화로 자동.
- 측정 결과 hot path에 정말 영향 있다면 호출 횟수 줄이는 다른 리팩터링 (loop fusion, caching) 검토.

## 관련 패턴

- **역연산**: [Pattern 2: Inline Function](/blog/programming/design/refactoring-catalog/pattern02-inline-function)
- **함께 자주**: [Pattern 5: Change Function Declaration](/blog/programming/design/refactoring-catalog/pattern05-change-function-declaration) — 이름이 마음에 안 들 때
- **데이터 정리**: [Pattern 8: Introduce Parameter Object](/blog/programming/design/refactoring-catalog/pattern08-introduce-parameter-object), [Pattern 30: Split Variable](/blog/programming/design/refactoring-catalog/pattern30-split-variable)
- **함수 → 객체**: [Pattern 49: Replace Function with Command](/blog/programming/design/refactoring-catalog/pattern49-replace-function-with-command)
- **함수 → 모듈**: [Pattern 21: Move Function](/blog/programming/design/refactoring-catalog/pattern21-move-function)
- **부수효과 분리**: [Pattern 41: Separate Query from Modifier](/blog/programming/design/refactoring-catalog/pattern41-separate-query-from-modifier)
