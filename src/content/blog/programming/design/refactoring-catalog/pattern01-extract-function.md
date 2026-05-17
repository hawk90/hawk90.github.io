---
title: "Pattern 1: Extract Function"
date: 2026-06-01T01:00:00
description: "긴 함수에서 의도를 드러내는 작은 함수로."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 1
tags: [refactoring, extract-function, fowler]
draft: true
type: book-review
bookTitle: "Refactoring: Improving the Design of Existing Code, 2nd Edition"
bookAuthor: "Martin Fowler"
---

## 한 줄 요약

> 코드 한 토막이 *무엇을 하는지* 한 줄로 말할 수 있다면 그것은 함수가 되어야 한다.

## 동기 (Motivation)

긴 함수의 본문에는 *구현(implementation)*과 *의도(intention)*가 섞여 있다. 의도는 "왜"를 말하고 구현은 "어떻게"를 말한다. 둘을 분리하면 읽는 사람이 함수 이름만 보고 의도를 파악하고, 필요할 때만 본문으로 내려간다.

Fowler가 가장 자주 쓰는 리팩터링이다. 잘 골라낸 이름은 *주석보다 강한 문서*가 된다.

언제 적용하는가:
- 함수가 한 화면을 넘긴다
- 코드 블록 앞에 "this part does X" 같은 주석이 붙어 있다
- 같은 코드가 여러 곳에 중복돼 있다
- 변수 이름이 한 토막의 의도를 충분히 설명하지 못한다

## 절차 (Mechanics)

1. 새 함수를 만들고 *의도를 드러내는 이름*을 붙인다(동작이 아닌 목적).
2. 추출할 코드를 원래 함수에서 새 함수로 복사한다.
3. 새 함수의 *지역 변수와 매개변수*를 정리한다.
   - 사용만 하는 변수는 매개변수로
   - 추출된 코드 안에서 수정되는 변수는 반환값으로(둘 이상이면 Split Variable 또는 객체)
4. 컴파일하고 테스트한다.
5. 원래 위치의 코드를 새 함수 호출로 대체한다.
6. 다른 호출자가 같은 패턴을 가지는지 둘러본다(중복 제거 기회).

## 예시 (Before → After)

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

각 함수 이름이 본문 위 주석을 대체한다.

## 주의

- 매개변수가 6개를 넘으면 먼저 [Introduce Parameter Object](/blog/programming/design/refactoring-catalog/pattern08-introduce-parameter-object)부터 검토한다.
- 추출 후 호출자가 *추출된 함수만 호출*하는 얇은 wrapper가 되면 그 호출자도 추출 대상이 될 수 있다.
- 성능 우려는 보통 기우다. 측정 전까지는 가독성을 우선으로 둔다.

## 관련 패턴

- 역연산: [Pattern 2: Inline Function](/blog/programming/design/refactoring-catalog/pattern02-inline-function)
- 함께 자주: [Pattern 5: Change Function Declaration](/blog/programming/design/refactoring-catalog/pattern05-change-function-declaration) — 이름이 마음에 안 들 때
- 데이터 정리: [Pattern 8: Introduce Parameter Object](/blog/programming/design/refactoring-catalog/pattern08-introduce-parameter-object)
