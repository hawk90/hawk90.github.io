---
title: "Pattern 14: Replace Primitive with Object"
date: 2026-06-01T14:00:00
description: "Primitive obsession 해소 — 값 객체로."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 14
tags: [refactoring, primitive-obsession, value-object, fowler]
draft: true
type: book-review
bookTitle: "Refactoring: Improving the Design of Existing Code, 2nd Edition"
bookAuthor: "Martin Fowler"
---

## 한 줄 요약

> `string "USD"`, `int currency_code` 같은 primitive에 의미를 부여하는 *값 객체*로 승격한다.

## 동기 (Motivation)

primitive obsession은 string·number·bool로 도메인 의미를 표현하는 *나쁜 냄새*다. 다음 코드가 한 신호.

```javascript
// price도 number, weight도 number, 둘이 섞이면?
function shipping(price, weight) { return price * weight * 0.01; }
shipping(weight, price);  // 컴파일러는 못 잡음
```

값 객체로 승격하면 *type safety*가 생기고, 단위 변환·검증·domain method (`addPercent`, `convertTo`)가 자연스럽게 모인다. DDD의 *value object*와 같은 동기.

## 절차 (Mechanics)

1. 아직 안 됐다면 [Encapsulate Variable](/blog/programming/design/refactoring-catalog/pattern06-encapsulate-variable).
2. 값을 감쌀 단순 class 생성. 생성자에 raw value, getter.
3. setter 안에서 wrapper로 변환, getter는 wrapper의 raw 반환.
4. 클래스 이름이 새 type을 잘 표현하는지 확인.
5. [Move Function](/blog/programming/design/refactoring-catalog/pattern21-move-function)으로 관련 동작을 wrapper로 이동.
6. 테스트.

## 예시 (Before → After)

```javascript
// Before — order.priority가 string
class Order {
  constructor(data) { this._priority = data.priority; }
  get priority() { return this._priority; }
}

const highPriorityCount = orders.filter(o =>
  o.priority === "high" || o.priority === "rush"
).length;
```

```javascript
// After — Priority value object
class Priority {
  constructor(value) {
    if (!Priority.legalValues().includes(value))
      throw new Error(`<${value}> is invalid for Priority`);
    this._value = value;
  }
  toString()         { return this._value; }
  get _index()       { return Priority.legalValues().indexOf(this._value); }
  static legalValues(){ return ["low", "normal", "high", "rush"]; }
  equals(other)      { return this._index === other._index; }
  higherThan(other)  { return this._index > other._index; }
}

class Order {
  constructor(data) { this._priority = new Priority(data.priority); }
  get priority()    { return this._priority; }
}

const highPriorityCount = orders.filter(o =>
  o.priority.higherThan(new Priority("normal"))
).length;
```

이제 `higherThan` 같은 *도메인 비교*가 가능하고, 잘못된 우선순위 값(`"medium"`)은 *생성 시점*에 차단된다.

## 결과

- Type safety (mixing 차단)
- 검증을 한 곳에
- 도메인 메서드 추가 자연스러움 (단위 변환, 비교, 산술)
- 직렬화·테스트 friendly

## 주의

- 모든 primitive를 객체화할 필요는 없다. *도메인 의미*가 있는 것만.
- `equals`/`hashCode`(Java) 또는 동등성 정의 필수.
- Wrapper 비용 — hot path면 측정 후 결정.

## 관련 패턴

- 자매: [Pattern 12: Encapsulate Record](/blog/programming/design/refactoring-catalog/pattern12-encapsulate-record)
- DDD value: [Pattern 33: Change Reference to Value](/blog/programming/design/refactoring-catalog/pattern33-change-reference-to-value)
- 매개변수 묶음: [Pattern 8: Introduce Parameter Object](/blog/programming/design/refactoring-catalog/pattern08-introduce-parameter-object)
