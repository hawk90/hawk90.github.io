---
title: "Pattern 8: Introduce Parameter Object"
date: 2026-06-01T08:00:00
description: "여러 인자가 함께 다니면 객체로 묶는다."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 8
tags: [refactoring, parameter-object, data-clump, fowler]
draft: true
type: book-review
bookTitle: "Refactoring: Improving the Design of Existing Code, 2nd Edition"
bookAuthor: "Martin Fowler"
---

## 한 줄 요약

> 같은 매개변수 그룹이 여러 함수에 함께 다닌다면, 그것은 잠재된 *도메인 객체*다.

## 동기 (Motivation)

`start, end` 두 매개변수가 여러 함수에 *함께 다니는 패턴*을 Fowler는 **data clump**라 부른다. 이는 *아직 만들어지지 않은 객체*의 신호다. 객체로 묶으면 시그니처가 단순해지고, 관련 동작(예: `contains`, `overlap`)이 자연스럽게 그 객체로 이동한다.

언제 적용하는가:
- 3개 이상 매개변수가 *함께 다닌다*
- 같은 그룹이 여러 함수에서 반복된다
- 그 그룹에 자연스러운 *연산*이 있다 (range의 contains, point의 distance)

## 절차 (Mechanics)

1. *데이터 클래스* (또는 record)를 만든다. 처음에는 단순 record로.
2. 변경할 함수를 [Change Function Declaration](/blog/programming/design/refactoring-catalog/pattern05-change-function-declaration)로 새 매개변수에 추가한다.
3. 호출처를 한 곳씩 새 객체로 옮긴다 — 호출처마다 테스트.
4. 옛 매개변수를 제거한다.
5. 자연스러운 동작이 보이면 함수를 객체로 이동([Move Function](/blog/programming/design/refactoring-catalog/pattern21-move-function)).
6. 객체에 *값 의미*가 생기면 [Replace Primitive with Object](/blog/programming/design/refactoring-catalog/pattern14-replace-primitive-with-object)로 진화.

## 예시 (Before → After)

```javascript
// Before — start/end가 여러 함수에 다님
function amountInvoiced(startDate, endDate) { /* ... */ }
function amountReceived(startDate, endDate) { /* ... */ }
function amountOverdue(startDate, endDate)  { /* ... */ }
```

```javascript
// After — DateRange 객체
class DateRange {
  constructor(start, end) {
    this._start = start;
    this._end = end;
  }
  get start() { return this._start; }
  get end()   { return this._end; }
  contains(date) { return date >= this._start && date <= this._end; }
}

function amountInvoiced(dateRange) { /* ... */ }
function amountReceived(dateRange) { /* ... */ }
function amountOverdue(dateRange)  { /* ... */ }
```

`contains` 같은 자연스러운 연산이 `DateRange`에 모인다 — *도메인 모델 발견*.

## 결과

- 호출 시그니처가 단순해진다
- 매개변수 *순서 실수*가 사라진다
- 새 함수가 객체로 응집되며 *도메인 언어*가 형성된다
- 새 동작(`overlap`, `iterate days`) 추가가 자연스러워진다

## 주의

- 옛 매개변수를 *한 번에* 제거하지 말고 신/구 시그니처를 잠깐 둘 다 유지한 후 마이그레이션.
- 객체 안에 *동작이 끝까지 안 생긴다면* 그저 record일 뿐 — 그래도 가치가 있다.
- Primitive 객체(`{start, end}`)부터 시작하고 *나중에 클래스*로 승격해도 된다.

## 관련 패턴

- 시그니처 변경: [Pattern 5: Change Function Declaration](/blog/programming/design/refactoring-catalog/pattern05-change-function-declaration)
- 함수 이동: [Pattern 21: Move Function](/blog/programming/design/refactoring-catalog/pattern21-move-function)
- 값 객체 승격: [Pattern 14: Replace Primitive with Object](/blog/programming/design/refactoring-catalog/pattern14-replace-primitive-with-object)
- 자매: [Pattern 9: Combine Functions into Class](/blog/programming/design/refactoring-catalog/pattern09-combine-functions-into-class)
