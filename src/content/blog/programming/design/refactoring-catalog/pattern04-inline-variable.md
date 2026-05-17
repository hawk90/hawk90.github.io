---
title: "Pattern 4: Inline Variable"
date: 2026-06-01T04:00:00
description: "변수 이름이 원래 표현식보다 더 정보를 주지 못할 때."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 4
tags: [refactoring, inline-variable, fowler]
draft: true
type: book-review
bookTitle: "Refactoring: Improving the Design of Existing Code, 2nd Edition"
bookAuthor: "Martin Fowler"
---

## 한 줄 요약

> 변수 이름이 원래 표현식보다 더 많은 의미를 주지 못한다면, 변수는 사라져야 한다.

## 동기 (Motivation)

이름을 붙였지만 *원래 표현식만큼 명확*하거나, 변수가 *다른 리팩터링의 걸림돌*이 되는 경우가 있다. 이때 변수를 인라인한다. Extract Variable의 역연산이다.

언제 적용하는가:
- 변수 이름이 *표현식의 단순 재명명*에 그친다 (`const price = basePrice;`)
- 함수 추출 등 다음 리팩터링을 위해 표현식을 *그 자리에 직접* 두는 게 편하다
- 변수가 *한 번만* 쓰이며 의미를 더하지 않는다

## 절차 (Mechanics)

1. 표현식이 *side effect 없는지* 확인한다.
2. 변수가 한 번만 할당되는지 확인한다(한 번만 할당, 즉 immutable처럼 행동).
3. 변수가 처음 쓰이는 곳을 찾아 표현식으로 바꾼다.
4. 컴파일하고 테스트한다.
5. 모든 사용처를 같은 방식으로 교체한다.
6. 변수 선언을 제거한다.

## 예시 (Before → After)

```javascript
// Before
const basePrice = anOrder.basePrice;
return basePrice > 1000;
```

```javascript
// After
return anOrder.basePrice > 1000;
```

`basePrice`라는 임시 이름이 `anOrder.basePrice`보다 더 정보를 주지 않는다.

## 주의

- Side effect가 있는 표현식(`counter++`, `nextId()`)은 인라인 시 *호출 횟수가 바뀌어* 동작이 깨질 수 있다.
- 변수가 *여러 번 할당*된다면 [Split Variable](/blog/programming/design/refactoring-catalog/pattern30-split-variable)부터.
- 표현식이 길어 한 줄에 안 들어가면 인라인이 오히려 가독성을 해친다.

## 관련 패턴

- 역연산: [Pattern 3: Extract Variable](/blog/programming/design/refactoring-catalog/pattern03-extract-variable)
- 함수 인라인: [Pattern 2: Inline Function](/blog/programming/design/refactoring-catalog/pattern02-inline-function)
- 변수 분리: [Pattern 30: Split Variable](/blog/programming/design/refactoring-catalog/pattern30-split-variable)
