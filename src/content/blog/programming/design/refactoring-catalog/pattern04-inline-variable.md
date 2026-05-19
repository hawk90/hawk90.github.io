---
title: "Pattern 4: Inline Variable"
date: 2026-05-02T04:00:00
description: "변수 이름이 원래 표현식보다 정보를 더 주지 못할 때 — Extract Variable의 역연산."
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

이름을 붙였지만 그 이름이 *원래 표현식과 같은 정보*에 그치는 경우가 있다. 또는 잘못된 변수 추출로 *나중 리팩터링의 걸림돌*이 된 경우도 있다. 이때 변수를 인라인한다. Extract Variable의 역연산.

세 가지 흔한 동기.

### 1. 단순 재명명에 그친 변수
`const price = anOrder.basePrice;` — 변수가 *원본을 새 이름으로 부르는 것* 외에 정보를 더하지 않는다. 인라인이 더 직접적.

### 2. 다음 리팩터링을 막는 변수
[Extract Function](/blog/programming/design/refactoring-catalog/pattern01-extract-function)이나 [Move Function](/blog/programming/design/refactoring-catalog/pattern21-move-function)을 하려는데 변수가 *경계를 가로질러* 있다. 인라인 후 표현식이 *원래 자리*로 돌아가면 추출이 깔끔해진다.

### 3. 변수가 한 번만 사용
한 번만 쓰이는 임시 변수는 *읽는 사람의 시야를 분리*시킨다. 그 한 번이 시야에서 보이는 거리에 있다면 인라인이 더 흐름이 좋다.

### 언제 적용하는가

- 변수 이름이 표현식의 단순 재명명에 그친다 (`const price = basePrice;`).
- 다음 리팩터링을 위해 표현식을 그 자리에 두는 게 편하다.
- 변수가 한 번만 쓰이며 의미를 더하지 않는다.
- 변수가 *너무 짧은 라이프타임*을 가져 *불필요한 인지 비용*만 만든다.

## 절차 (Mechanics)

1. **표현식이 side effect 없는지** 확인. 있다면 인라인 시 동작이 바뀐다.
2. **변수가 한 번만 할당**되는지 확인 (immutable 처럼 행동).
3. **변수가 처음 쓰이는 곳**을 찾아 표현식으로 바꾼다.
4. 컴파일·테스트.
5. **모든 사용처를 같은 방식으로 교체**.
6. **변수 선언을 제거**.

## 예시 1 — 단순 재명명

```javascript
// Before
const basePrice = anOrder.basePrice;
return basePrice > 1000;
```

`basePrice`가 *임시 별명* 역할만 한다. 인라인.

```javascript
// After
return anOrder.basePrice > 1000;
```

한 단계 줄어든다.

## 예시 2 — 다음 리팩터링을 위한 평탄화

```javascript
// Before — 함수를 추출하고 싶지만 변수가 경계에 걸려 있음
function priceOrder(order) {
  const basePrice = order.quantity * order.itemPrice;
  if (basePrice > 1000) return basePrice * 0.95;
  return basePrice;
}
```

[Extract Function](/blog/programming/design/refactoring-catalog/pattern01-extract-function)으로 *할인 정책*을 빼고 싶지만 `basePrice`가 두 군데에 묶여 있다. 잠깐 인라인.

```javascript
// 인라인 후
function priceOrder(order) {
  if (order.quantity * order.itemPrice > 1000)
    return order.quantity * order.itemPrice * 0.95;
  return order.quantity * order.itemPrice;
}
```

이제 *price 표현식*만의 함수로 추출이 명확하다.

```javascript
// 재추출 후
function priceOrder(order) {
  const base = basePrice(order);
  if (base > 1000) return base * 0.95;
  return base;
}
function basePrice(order) { return order.quantity * order.itemPrice; }
```

처음 코드와 형태는 비슷하지만 *함수 추출 + 재사용 가능*이 더해진 형태.

## 예시 3 — 한 번 쓰는 임시 변수

```javascript
// Before
function isReady() {
  const ready = service.status === "ready";
  return ready;
}
```

```javascript
// After
function isReady() {
  return service.status === "ready";
}
```

`ready` 변수가 한 번만 쓰이고 *의미를 더하지도 않는다*.

## 자주 보는 안티패턴

### 1. Side effect 표현식 인라인
```javascript
const id = nextId();
useA(id);
useB(id);
```
`nextId()`는 *호출할 때마다* 다른 값을 줄 수 있다. 인라인하면 호출 횟수가 늘어 동작이 바뀐다. *그대로 둔다*.

### 2. 변수가 여러 번 할당되는 경우
한 변수가 여러 번 할당되면 인라인 불가. 먼저 [Split Variable](/blog/programming/design/refactoring-catalog/pattern30-split-variable)로 *각 할당을 다른 변수*로 분리.

```javascript
// Bad — 인라인 안 됨
let temp = 2 * (height + width);
console.log(temp);
temp = height * width;
console.log(temp);
```

### 3. 긴 표현식 인라인으로 줄 길이 폭발
```javascript
// 인라인 시 한 줄이 200자
return computeAttribute(database.lookup(user.identifier.canonicalize()).profile.preferences) > threshold;
```
한 줄에 너무 많은 정보가 들어가면 *읽기 더 어렵다*. 인라인이 항상 정답은 아니다.

### 4. 디버깅 친화성을 잃음
변수가 있을 때는 breakpoint와 watch가 쉽다. 인라인하면 표현식 중간을 볼 수 없다. 디버깅 중이면 *나중에* 인라인.

### 5. 의미 있는 이름을 잃음
`const customerName = user.name;` — 컨텍스트에 따라 `customerName`이 *도메인 의미*를 더할 수 있다. 단순 재명명이라고 단정하기 전에 이름의 가치를 본다.

## Modern variants

### Destructuring 인라인
```javascript
const { x, y } = point;
return Math.sqrt(x * x + y * y);
```

분해는 *변수를 만드는 것*이지만 보통은 *남겨두는* 게 낫다. 단순 변수 인라인 규칙을 분해에 그대로 적용하지 말 것.

### Const 표현식 폴딩
모던 컴파일러는 `const X = 42; useX(X);`를 자동으로 `useX(42)`로 폴딩한다. *런타임 비용*은 인라인 여부와 무관.

## 도구 / IDE

| 도구 | 단축키 |
| --- | --- |
| IntelliJ | Cmd-Option-N (Inline) |
| VS Code | Cmd-. → "Inline variable" |
| Rider | Ctrl-R, I |
| Rust Analyzer | "Inline local variable" |

## 성능 고려

변수 인라인과 보존은 *성능에 무관*. JIT/컴파일러가 결정.

## 관련 패턴

- **역연산**: [Pattern 3: Extract Variable](/blog/programming/design/refactoring-catalog/pattern03-extract-variable)
- **함수 인라인**: [Pattern 2: Inline Function](/blog/programming/design/refactoring-catalog/pattern02-inline-function)
- **변수 분리 후 인라인**: [Pattern 30: Split Variable](/blog/programming/design/refactoring-catalog/pattern30-split-variable)
- **임시 변수 → query**: [Pattern 15: Replace Temp with Query](/blog/programming/design/refactoring-catalog/pattern15-replace-temp-with-query)
