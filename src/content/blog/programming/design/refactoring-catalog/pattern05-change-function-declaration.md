---
title: "Pattern 5: Change Function Declaration"
date: 2026-06-01T05:00:00
description: "함수 이름과 매개변수를 안전하게 바꾼다."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 5
tags: [refactoring, function-declaration, rename, fowler]
draft: true
type: book-review
bookTitle: "Refactoring: Improving the Design of Existing Code, 2nd Edition"
bookAuthor: "Martin Fowler"
---

## 한 줄 요약

> 함수 시그니처는 사용자와의 *계약*이다. 계약 변경은 단계적·안전하게.

## 동기 (Motivation)

함수 이름은 그 함수가 *무엇을 하는지*를 알리는 가장 강력한 단서다. 이름이 의도를 담지 못하면 사용자는 매번 본문을 봐야 한다. 매개변수도 같다 — 너무 많거나, 결합도가 높거나, 잘못된 경계에 놓여 있으면 계약 자체가 잘못이다.

이 리팩터링은 *이름 변경*과 *매개변수 변경*을 같은 도구로 묶는다. 둘 다 시그니처를 건드리기 때문이다.

(이전 이름: Rename Method, Add Parameter, Remove Parameter)

언제 적용하는가:
- 함수 이름이 의도를 담지 못한다
- 매개변수가 너무 많아 호출 시점에 *무엇이 무엇인지* 모호하다
- 매개변수 일부가 *함께 다니는* 경향이 있다(Parameter Object 후보)
- 한 매개변수가 *사용되지 않는다*

## 절차 (Mechanics)

규모에 따라 두 가지.

### Simple Mechanics (변경이 작고 호출처가 적을 때)
1. 매개변수 변경이라면 함수 본문에서 *바꿀 매개변수*가 잘 추출 가능한지 검토한다.
2. 함수 선언을 바꾼다.
3. 모든 호출처를 새 선언에 맞게 수정한다.
4. 컴파일하고 테스트한다.

### Migration Mechanics (호출처가 많거나 공개 API일 때)
1. 본문을 추출해 *임시 함수*에 둔다.
2. 새 시그니처로 *새 함수*를 만들고 본문은 임시 함수로 위임한다.
3. 옛 함수를 *deprecated*로 표시하고 호출처를 한 곳씩 새 함수로 옮긴다.
4. 모든 호출처가 옮겨지면 옛 함수를 제거한다.

## 예시 (Before → After)

```javascript
// Before — circumference라는 이름이 *둘레*만 의미하는데 함수는 직경도 반환?
function circum(radius) {
  return 2 * Math.PI * radius;
}

// After — 의도를 명확히
function circumference(radius) {
  return 2 * Math.PI * radius;
}
```

매개변수 추가 예:
```javascript
// Before
function addReservation(customer) {
  this.reservations.push(customer);
}

// After — priority 매개변수 추가, Migration 방식
function addReservation(customer) {
  this._addReservation(customer, false);
}
function _addReservation(customer, priority) {
  if (priority) this.reservations.unshift(customer);
  else this.reservations.push(customer);
}
// 호출자 한 곳씩 새 시그니처로 이동
```

## 주의

- 공개 API(library 인터페이스)는 *반드시* Migration 방식. 한 번에 깨면 모든 사용자가 깨진다.
- IDE의 `rename` 기능을 활용하라 — 안전성 보장.
- 매개변수 *순서* 변경이 가장 위험. type이 같으면 컴파일러가 못 잡는다.

## 관련 패턴

- 매개변수 묶기: [Pattern 8: Introduce Parameter Object](/blog/programming/design/refactoring-catalog/pattern08-introduce-parameter-object)
- 매개변수 정리: [Pattern 43: Remove Flag Argument](/blog/programming/design/refactoring-catalog/pattern43-remove-flag-argument), [Pattern 44: Preserve Whole Object](/blog/programming/design/refactoring-catalog/pattern44-preserve-whole-object)
- 사용 안 하는 매개변수 제거: [Pattern 45: Replace Parameter with Query](/blog/programming/design/refactoring-catalog/pattern45-replace-parameter-with-query)
