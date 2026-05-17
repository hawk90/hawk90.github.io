---
title: "Pattern 2: Inline Function"
date: 2026-06-01T02:00:00
description: "함수 본문이 이름만큼 명확하면 인라인한다."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 2
tags: [refactoring, inline-function, fowler]
draft: true
type: book-review
bookTitle: "Refactoring: Improving the Design of Existing Code, 2nd Edition"
bookAuthor: "Martin Fowler"
---

## 한 줄 요약

> 함수의 본문이 이름만큼 명확하다면, 그 함수는 사라져야 한다.

## 동기 (Motivation)

추출(Extract)이 너무 많아져 *함수 자체가 노이즈*가 될 때가 있다. 잘못 추출된 helper를 되돌리거나, 본문이 너무 단순해 호출 자체가 군더더기인 경우에 인라인한다.

리팩터링은 한 방향이 아니다. *Extract → Inline → 다시 Extract*를 반복하며 코드의 결을 찾아간다.

언제 적용하는가:
- 함수 본문이 이름만큼 의미가 명확하다 (`getRating()`이 그냥 `score`만 반환)
- 잘못 추출된 helper가 오히려 가독성을 해친다
- 너무 많은 위임(delegation)으로 호출 chain이 길어진다

## 절차 (Mechanics)

1. 다형성 함수(override)가 아닌지 확인한다. override가 있으면 인라인 불가.
2. 모든 호출처를 찾는다.
3. 각 호출처에서 함수 호출을 본문으로 바꾼다.
4. 컴파일하고 테스트한다 — *각 단계마다*.
5. 함수 정의를 제거한다.

호출처가 많으면 한 번에 다 바꾸지 말고 *한 곳씩* 인라인하면서 테스트한다.

## 예시 (Before → After)

```javascript
// Before
function getRating(driver) {
  return moreThanFiveLateDeliveries(driver) ? 2 : 1;
}
function moreThanFiveLateDeliveries(driver) {
  return driver.numberOfLateDeliveries > 5;
}
```

```javascript
// After
function getRating(driver) {
  return driver.numberOfLateDeliveries > 5 ? 2 : 1;
}
```

`moreThanFiveLateDeliveries`는 *이름이 본문과 같은 의미*를 가진다. 한 줄 인라인이 더 직접적이다.

## 주의

- 인라인 후 길이가 길어져 가독성이 떨어지면 *다른 위치에 다른 이름으로 다시 추출*한다.
- 재귀 함수는 인라인 불가.
- 호출 chain이 너무 길면 한 단계씩 천천히. 한 번에 여러 단계를 인라인하면 추적이 어려워진다.

## 관련 패턴

- 역연산: [Pattern 1: Extract Function](/blog/programming/design/refactoring-catalog/pattern01-extract-function)
- 변수 인라인: [Pattern 4: Inline Variable](/blog/programming/design/refactoring-catalog/pattern04-inline-variable)
- 위임 제거: [Pattern 19: Remove Middle Man](/blog/programming/design/refactoring-catalog/pattern19-remove-middle-man)
