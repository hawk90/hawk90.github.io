---
title: "Pattern 17: Inline Class"
date: 2026-06-01T17:00:00
description: "Class가 더 이상 충분한 책임을 갖지 못하면 합친다."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 17
tags: [refactoring, inline-class, fowler]
draft: true
type: book-review
bookTitle: "Refactoring: Improving the Design of Existing Code, 2nd Edition"
bookAuthor: "Martin Fowler"
---

## 한 줄 요약

> Class가 단순 wrapper에 그쳐 추상의 가치가 비용보다 작다면, 다른 class로 합친다. Extract Class의 역연산.

## 동기 (Motivation)

리팩터링을 거치며 class의 책임이 점점 다른 곳으로 옮겨가 *얇은 wrapper*만 남는 경우가 있다. 또는 [Extract Class](/blog/programming/design/refactoring-catalog/pattern16-extract-class)를 잘못해서 *분리가 의미 없는* class가 생기기도 한다. 이때 인라인한다.

## 절차 (Mechanics)

1. 흡수할 class 선택.
2. 옛 class의 public method를 흡수 class에 [Move Function](/blog/programming/design/refactoring-catalog/pattern21-move-function).
3. field도 [Move Field](/blog/programming/design/refactoring-catalog/pattern22-move-field)로 이동.
4. 옛 class의 사용처를 새 class로 변경.
5. 옛 class 삭제.

## 예시 (Before → After)

```javascript
// Before — TrackingInformation이 거의 빈 wrapper
class TrackingInformation {
  constructor(shippingCompany, trackingNumber) {
    this._shippingCompany = shippingCompany;
    this._trackingNumber = trackingNumber;
  }
  get display() { return `${this._shippingCompany}: ${this._trackingNumber}`; }
}

class Shipment {
  constructor(trackingInfo) { this._trackingInformation = trackingInfo; }
  get trackingInfo() { return this._trackingInformation.display; }
}
```

```javascript
// After
class Shipment {
  constructor(shippingCompany, trackingNumber) {
    this._shippingCompany = shippingCompany;
    this._trackingNumber = trackingNumber;
  }
  get trackingInfo() { return `${this._shippingCompany}: ${this._trackingNumber}`; }
}
```

wrapper 한 단계 제거로 호출 chain이 짧아진다.

## 관련 패턴

- 역연산: [Pattern 16: Extract Class](/blog/programming/design/refactoring-catalog/pattern16-extract-class)
- 함수 이동: [Pattern 21: Move Function](/blog/programming/design/refactoring-catalog/pattern21-move-function)
- 위임 제거: [Pattern 19: Remove Middle Man](/blog/programming/design/refactoring-catalog/pattern19-remove-middle-man)
