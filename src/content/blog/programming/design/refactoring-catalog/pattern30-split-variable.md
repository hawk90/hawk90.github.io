---
title: "Pattern 30: Split Variable"
date: 2026-06-02T06:00:00
description: "한 변수가 두 의미로 쓰이면 둘로 나눈다 — 한 변수 한 책임."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 30
tags: [refactoring, split-variable, fowler]
draft: true
type: book-review
bookTitle: "Refactoring: Improving the Design of Existing Code, 2nd Edition"
bookAuthor: "Martin Fowler"
---

## 한 줄 요약

> 한 변수가 *서로 다른 두 책임*에 재사용된다면, 변수를 둘로 나눠 각각 단일 책임으로.

## 동기 (Motivation)

변수의 *재사용*은 메모리 절약이라는 명목으로 정당화되곤 한다. 그러나 현대 컴파일러는 변수 재사용을 *알아서 최적화*한다. 사람의 *변수 재사용*은 *의미만 흐릿하게* 만든다.

```javascript
let temp = 2 * (height + width);   // 둘레
console.log(temp);
temp = height * width;             // 넓이
console.log(temp);
```

`temp`가 *둘레*와 *넓이* 두 의미. 이름이 *둘 다 표현 못 함*. 분리:

```javascript
const perimeter = 2 * (height + width);
console.log(perimeter);
const area = height * width;
console.log(area);
```

각 이름이 *자기 의미*. immutable + 의도 명확.

### 신호

- 변수에 *여러 번 할당*되는데, 할당마다 *다른 의미*.
- 변수 이름이 *모호하다* (`temp`, `result`, `value`).
- loop accumulator가 아닌데 *재할당*.
- 한 변수가 *두 영역에서 다른 type*을 가짐 (동적 언어).

### Loop accumulator는 예외

```javascript
let sum = 0;
for (const x of items) sum += x;
```

`sum`은 매번 재할당되지만 *같은 의미*. Split Variable 대상 아님.

### 언제 적용하는가

- 변수가 *두 의미*로 쓰임.
- 이름이 *한 의미만* 담아 *다른 사용처 의도 불명*.
- *immutable*로 만들고 싶다.

## 절차 (Mechanics)

1. **첫 번째 할당 + 사용처**에 새 이름 부여.
2. *가능하면* immutable (`const`, `final`)로 선언.
3. **두 번째 할당부터 다른 변수 이름**으로.
4. 컴파일·테스트.

## 예시 1 — 기본

```javascript
// Before
function distanceTravelled(scenario, time) {
  let result;
  let acc = scenario.primaryForce / scenario.mass;
  let primaryTime = Math.min(time, scenario.delay);
  result = 0.5 * acc * primaryTime * primaryTime;
  let secondaryTime = time - scenario.delay;
  if (secondaryTime > 0) {
    let primaryVelocity = acc * scenario.delay;
    acc = (scenario.primaryForce + scenario.secondaryForce) / scenario.mass;
    result += primaryVelocity * secondaryTime + 0.5 * acc * secondaryTime * secondaryTime;
  }
  return result;
}
```

`acc`가 *primary acceleration*과 *combined acceleration* 두 의미.

```javascript
// After
function distanceTravelled(scenario, time) {
  const primaryAcceleration = scenario.primaryForce / scenario.mass;
  const primaryTime = Math.min(time, scenario.delay);
  let result = 0.5 * primaryAcceleration * primaryTime * primaryTime;
  const secondaryTime = time - scenario.delay;
  if (secondaryTime > 0) {
    const primaryVelocity = primaryAcceleration * scenario.delay;
    const secondaryAcceleration =
      (scenario.primaryForce + scenario.secondaryForce) / scenario.mass;
    result += primaryVelocity * secondaryTime
            + 0.5 * secondaryAcceleration * secondaryTime * secondaryTime;
  }
  return result;
}
```

각 가속도가 *자기 이름*. `result`는 누적이므로 그대로.

## 예시 2 — Loop 누적과 다른 사용

```javascript
// Before
let total = 0;
for (const item of items) total += item.price;
// ...
total = total * 0.9;   // 변수 재사용 — 의미가 "할인 후 가격"으로 바뀜
console.log(total);
```

```javascript
// After
let subtotal = 0;
for (const item of items) subtotal += item.price;
const discountedTotal = subtotal * 0.9;
console.log(discountedTotal);
```

## 예시 3 — 입력 매개변수 재할당

```javascript
// Before
function discount(inputValue, quantity) {
  if (inputValue > 50) inputValue -= 2;
  if (quantity > 100) inputValue -= 1;
  return inputValue;
}
```

`inputValue`가 입력이자 결과 — 의미 흐림.

```javascript
// After
function discount(inputValue, quantity) {
  let result = inputValue;
  if (inputValue > 50) result -= 2;
  if (quantity > 100) result -= 1;
  return result;
}
```

`inputValue`는 *입력 그대로*, `result`는 *계산 결과*.

## 자주 보는 안티패턴

### 1. *Single use*는 분리할 필요 없음
변수가 *한 번만 할당*되면 이미 single purpose. Split 대상 아님.

### 2. Loop accumulator 분리
```javascript
let sum = 0;
for (const x of items) sum += x;
// → "각 iteration마다 다른 변수"는 잘못
```
같은 의미의 누적은 *그대로*.

### 3. *이름 못 정함*
변수를 두 의미로 쓰는 이유가 *이름 짓기 어려워서*인 경우. 도메인 단어로 노력.

### 4. *Type 변경* 까지 함께
JavaScript에서 `let x = 5; x = "hello";` — *type 변경*도 split이 답. 별 변수.

### 5. *너무 fine-grained*
표현식 한 줄에서만 의미가 다른 경우 — *변수 도입*조차 과잉. inline 그대로.

## Modern variants

### Const-by-default

```javascript
const a = compute();   // 한 번 할당
const b = transform(a);
```

각 단계가 *새 const*. Split이 자연.

### Immutable update pattern

```javascript
const v1 = { count: 0 };
const v2 = { ...v1, count: v1.count + 1 };   // 새 인스턴스
```

원본 *보존*, 변경은 *새 객체*. Split 자체가 패턴.

### Rust shadowing

```rust
let x = "5";
let x = x.parse::<i32>().unwrap();   // 같은 이름, 다른 type
```

Rust는 *shadowing*으로 같은 이름에 새 의미 — 보기에 split 안 했지만 *컴파일러는 다른 변수*. 의도 명확하면 OK.

## 도구 / IDE

| 도구 | 기능 |
| --- | --- |
| IntelliJ | "Split Variable" |
| Rider | 같음 |
| ESLint | `prefer-const` — 한 번 할당이면 const 자동 |

## 성능 고려

변수 분리는 컴파일러 단계에서 *최적화*. 런타임 영향 0.

## 관련 패턴

- **이름 정리**: [Pattern 7: Rename Variable](/blog/programming/design/refactoring-catalog/pattern07-rename-variable)
- **변수 인라인**: [Pattern 4: Inline Variable](/blog/programming/design/refactoring-catalog/pattern04-inline-variable)
- **임시 변수 → query**: [Pattern 15: Replace Temp with Query](/blog/programming/design/refactoring-catalog/pattern15-replace-temp-with-query)
