---
title: "Pattern 3: Extract Variable"
date: 2026-06-01T03:00:00
description: "복잡한 표현식을 이름 있는 변수로."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 3
tags: [refactoring, extract-variable, fowler]
draft: true
type: book-review
bookTitle: "Refactoring: Improving the Design of Existing Code, 2nd Edition"
bookAuthor: "Martin Fowler"
---

## 한 줄 요약

> 복잡한 표현식에 이름을 붙여 의도를 드러낸다. (이전 이름: Introduce Explaining Variable)

## 동기 (Motivation)

표현식이 복잡하면 의미가 코드에 드러나지 않는다. *왜 이 계산을 하는가*가 보이지 않는다. 중간 결과에 이름을 붙이면 코드 자체가 설명이 된다.

언제 적용하는가:
- 한 줄 안에 여러 단계 계산이 섞여 있다
- 같은 표현식이 여러 곳에 반복된다
- 디버거에서 *중간 값을 보고 싶다*
- 표현식이 길어 한 줄에 안 들어간다

## 절차 (Mechanics)

1. 추출할 표현식에 *side effect가 없는지* 확인한다.
2. 변경 불가능한(`const`, `final`) 변수를 만든다.
3. 표현식 전체를 새 변수에 대입한다.
4. 원래 표현식을 새 변수로 교체한다.
5. 컴파일하고 테스트한다.
6. 같은 표현식이 다른 곳에도 있으면 한 곳씩 교체한다(중복 제거).

함수 범위를 넘어선 곳에서도 같은 표현식이 자주 쓰이면, 변수 추출보다 [Extract Function](/blog/programming/design/refactoring-catalog/pattern01-extract-function)이 더 낫다.

## 예시 (Before → After)

```javascript
// Before
function price(order) {
  return order.quantity * order.itemPrice
       - Math.max(0, order.quantity - 500) * order.itemPrice * 0.05
       + Math.min(order.quantity * order.itemPrice * 0.1, 100);
}
```

```javascript
// After
function price(order) {
  const basePrice = order.quantity * order.itemPrice;
  const quantityDiscount = Math.max(0, order.quantity - 500) * order.itemPrice * 0.05;
  const shipping = Math.min(basePrice * 0.1, 100);
  return basePrice - quantityDiscount + shipping;
}
```

이름이 *주석을 대체*한다. `basePrice`, `quantityDiscount`, `shipping`이 계산의 의미를 드러낸다.

## 주의

- 변수가 함수 범위를 넘는 의미를 가지면 [Extract Function](/blog/programming/design/refactoring-catalog/pattern01-extract-function)이 더 강력하다.
- 변수 이름이 떠오르지 않는다면 그 표현식의 *의도가 모호*하다는 신호다 — 더 먼저 설계를 고민한다.
- Side effect가 있는 표현식은 추출 시 *호출 횟수가 줄어들어* 동작이 바뀔 수 있다.

## 관련 패턴

- 역연산: [Pattern 4: Inline Variable](/blog/programming/design/refactoring-catalog/pattern04-inline-variable)
- 더 강한 도구: [Pattern 1: Extract Function](/blog/programming/design/refactoring-catalog/pattern01-extract-function)
- 변수 캡슐화: [Pattern 6: Encapsulate Variable](/blog/programming/design/refactoring-catalog/pattern06-encapsulate-variable)
