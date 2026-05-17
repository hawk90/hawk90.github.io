---
title: "Pattern 16: Extract Class"
date: 2026-06-01T16:00:00
description: "Class가 너무 많은 책임을 질 때 일부를 분리한다."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 16
tags: [refactoring, extract-class, srp, fowler]
draft: true
type: book-review
bookTitle: "Refactoring: Improving the Design of Existing Code, 2nd Edition"
bookAuthor: "Martin Fowler"
---

## 한 줄 요약

> 클래스가 너무 많은 일을 한다면, 일부 데이터와 동작을 새 클래스로 빼낸다(SRP).

## 동기 (Motivation)

class가 처음에는 단순했지만 시간이 지나면서 책임이 늘어나는 것이 자연스러운 흐름이다. 어느 순간 *함께 다니는 field들*과 *그것을 다루는 method들*이 보이면, 그 묶음을 새 class로 추출할 시점이다.

신호:
- 일부 method가 *특정 field 그룹*만 다룬다
- field 이름에 *접두사*나 *그룹 hint*가 보인다 (`shippingAddress`, `shippingCity`...)
- class 한 줄 설명이 *"X and Y"* 또는 *"and"가 두 번 이상*

## 절차 (Mechanics)

1. 분리할 책임을 정의한다.
2. 새 class를 만들고 옛 class가 *새 class 인스턴스를 가지게* 한다.
3. [Move Field](/blog/programming/design/refactoring-catalog/pattern22-move-field)로 field 한 곳씩 이동.
4. [Move Function](/blog/programming/design/refactoring-catalog/pattern21-move-function)으로 method 이동.
5. 옛 class는 새 class에 위임(facade) 또는 일부 인터페이스 제거.
6. 새 class의 가시성 결정 (value object면 노출, 내부면 private).

## 예시 (Before → After)

```javascript
// Before — Person이 주소까지 다룸
class Person {
  constructor(name, officeAreaCode, officeNumber) {
    this._name = name;
    this._officeAreaCode = officeAreaCode;
    this._officeNumber = officeNumber;
  }
  get name() { return this._name; }
  get telephoneNumber() { return `(${this._officeAreaCode}) ${this._officeNumber}`; }
  get officeAreaCode() { return this._officeAreaCode; }
  get officeNumber()   { return this._officeNumber; }
}
```

```javascript
// After — TelephoneNumber 추출
class TelephoneNumber {
  constructor(areaCode, number) {
    this._areaCode = areaCode;
    this._number = number;
  }
  get areaCode() { return this._areaCode; }
  get number()   { return this._number; }
  toString()     { return `(${this._areaCode}) ${this._number}`; }
}

class Person {
  constructor(name, areaCode, number) {
    this._name = name;
    this._telephone = new TelephoneNumber(areaCode, number);
  }
  get name() { return this._name; }
  get telephoneNumber() { return this._telephone.toString(); }
}
```

이제 `TelephoneNumber`는 *재사용*되고, Person은 *주소·이름*에만 집중한다.

## 주의

- 양방향 reference 만들면 circular dependency. 한쪽만 알게 설계.
- 너무 많은 작은 class는 또 다른 문제. *책임 단위*가 명확할 때만.

## 관련 패턴

- 역연산: [Pattern 17: Inline Class](/blog/programming/design/refactoring-catalog/pattern17-inline-class)
- 도구: [Pattern 21: Move Function](/blog/programming/design/refactoring-catalog/pattern21-move-function), [Pattern 22: Move Field](/blog/programming/design/refactoring-catalog/pattern22-move-field)
- 자매: [Pattern 9: Combine Functions into Class](/blog/programming/design/refactoring-catalog/pattern09-combine-functions-into-class)
