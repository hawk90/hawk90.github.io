---
title: "Pattern 9: Combine Functions into Class"
date: 2026-06-01T09:00:00
description: "같은 데이터를 다루는 함수들을 한 클래스로 모은다."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 9
tags: [refactoring, class-extraction, fowler]
draft: true
type: book-review
bookTitle: "Refactoring: Improving the Design of Existing Code, 2nd Edition"
bookAuthor: "Martin Fowler"
---

## 한 줄 요약

> 함수들이 같은 데이터를 계속 만진다면, 그 안에 *클래스가 숨어* 있다.

## 동기 (Motivation)

같은 데이터 그룹을 다루는 함수가 여러 개 있고 그 함수들이 비슷한 매개변수를 받는다면, *암묵적으로 객체가 존재*하는 것이다. 클래스로 묶으면 데이터와 동작이 결합되고, 클라이언트는 *어떤 함수가 그 데이터에 적용 가능한지* 한눈에 본다.

언제 적용하는가:
- 함수들이 *같은 record나 매개변수 그룹*을 반복 받는다
- 그 데이터에 *파생 값(derived)*을 계산하는 함수가 늘어난다
- 도메인 개념이 함수 사이에 흩어져 있다

## 절차 (Mechanics)

1. 데이터를 [Encapsulate Record](/blog/programming/design/refactoring-catalog/pattern12-encapsulate-record)로 감싼다(이미 객체면 생략).
2. 함수들을 한 곳씩 [Move Function](/blog/programming/design/refactoring-catalog/pattern21-move-function)으로 새 클래스로 이동.
3. 매개변수가 클래스 데이터와 중복되면 제거.
4. 파생 값 함수는 *계산 메서드*(getter or memoized)로.
5. 클라이언트 호출을 메서드 호출로 바꾼다.

## 예시 (Before → After)

```javascript
// Before — 함수 4개가 같은 reading 객체를 받음
function base(reading)        { return reading.month * reading.quantity; }
function taxableCharge(reading) { return Math.max(0, base(reading) - taxThreshold(reading.year)); }
function calculateBaseCharge(reading) { return base(reading); }

// 호출
const reading = { customer: "ivan", quantity: 10, month: 5, year: 2026 };
const base    = calculateBaseCharge(reading);
const tax     = taxableCharge(reading);
```

```javascript
// After
class Reading {
  constructor(data) {
    this._customer = data.customer;
    this._quantity = data.quantity;
    this._month    = data.month;
    this._year     = data.year;
  }
  get customer() { return this._customer; }
  get quantity() { return this._quantity; }
  get month()    { return this._month; }
  get year()     { return this._year; }

  get baseCharge()     { return this.month * this.quantity; }
  get taxableCharge()  { return Math.max(0, this.baseCharge - taxThreshold(this.year)); }
}

// 호출
const reading = new Reading({ customer: "ivan", quantity: 10, month: 5, year: 2026 });
const base    = reading.baseCharge;
const tax     = reading.taxableCharge;
```

함수 간 호출 chain이 객체 내부로 들어가고, 클라이언트는 *깨끗한 API*만 본다.

## 변형 — Combine Functions into Transform

데이터에 *변경 없이 파생만* 한다면 클래스 대신 [Combine Functions into Transform](/blog/programming/design/refactoring-catalog/pattern10-combine-functions-into-transform). 함수형 스타일에 적합.

## 주의

- *유효한 도메인 객체*가 보이지 않는다면 transform이 더 낫다.
- 모든 함수가 클래스로 가야 하는 건 아니다 — *통일된 응집*이 보이는 함수만.
- Pure function이면 transform 검토, 상태가 있으면 class.

## 관련 패턴

- 대안: [Pattern 10: Combine Functions into Transform](/blog/programming/design/refactoring-catalog/pattern10-combine-functions-into-transform)
- 도구: [Pattern 12: Encapsulate Record](/blog/programming/design/refactoring-catalog/pattern12-encapsulate-record), [Pattern 21: Move Function](/blog/programming/design/refactoring-catalog/pattern21-move-function)
- 자매: [Pattern 8: Introduce Parameter Object](/blog/programming/design/refactoring-catalog/pattern08-introduce-parameter-object)
