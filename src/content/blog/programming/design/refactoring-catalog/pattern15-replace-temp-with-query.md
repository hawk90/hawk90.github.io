---
title: "Pattern 15: Replace Temp with Query"
date: 2026-06-01T15:00:00
description: "임시 변수를 query function으로 — Extract Function의 전 단계."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 15
tags: [refactoring, query-function, temp-variable, fowler]
draft: true
type: book-review
bookTitle: "Refactoring: Improving the Design of Existing Code, 2nd Edition"
bookAuthor: "Martin Fowler"
---

## 한 줄 요약

> 임시 변수가 한 번만 계산되고 그대로 쓰인다면, query 함수로 빼서 재사용 가능하게 만든다.

## 동기 (Motivation)

`let basePrice = order.quantity * order.itemPrice;` 같은 임시 변수는 한 함수 안에서만 산다. query 함수로 빼면 다른 함수도 같은 계산을 *호출만으로* 재사용한다. 그리고 이것이 [Extract Function](/blog/programming/design/refactoring-catalog/pattern01-extract-function)의 전제 조건이 되기도 한다.

언제 적용하는가:
- 임시 변수가 *간단한 표현식*이고 한 곳에서만 계산
- 다른 함수도 같은 derived 값을 쓸 가능성
- 함수 추출을 준비

## 절차 (Mechanics)

1. 변수가 *side effect 없이 한 번만* 할당되는지 확인.
2. 우변(right-hand)을 query 함수로 추출.
3. 변수를 inline ([Inline Variable](/blog/programming/design/refactoring-catalog/pattern04-inline-variable))해 query 호출로 대체.
4. 테스트.

## 예시 (Before → After)

```javascript
// Before
class Order {
  get price() {
    const basePrice = this._quantity * this._itemPrice;
    const discountFactor = basePrice > 1000 ? 0.95 : 0.98;
    return basePrice * discountFactor;
  }
}
```

```javascript
// After
class Order {
  get basePrice()       { return this._quantity * this._itemPrice; }
  get discountFactor()  { return this.basePrice > 1000 ? 0.95 : 0.98; }
  get price()           { return this.basePrice * this.discountFactor; }
}
```

각 derived가 *재사용 가능한 query*가 된다.

## 주의

- query가 비싸면 caching 필요 (memoization, getter cache).
- Side effect 있는 표현식은 inline 시 호출 횟수 변화로 의미가 바뀜.
- 한 함수 안에서만 의미 있는 임시 변수는 그대로 두는 게 낫다.

## 관련 패턴

- 함수 추출: [Pattern 1: Extract Function](/blog/programming/design/refactoring-catalog/pattern01-extract-function)
- 변수 인라인: [Pattern 4: Inline Variable](/blog/programming/design/refactoring-catalog/pattern04-inline-variable)
- 파생 값: [Pattern 32: Replace Derived Variable with Query](/blog/programming/design/refactoring-catalog/pattern32-replace-derived-variable-with-query)
