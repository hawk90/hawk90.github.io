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

> 임시 변수가 한 번만 계산되고 그대로 쓰인다면, query 함수로 빼서 재사용·테스트·이름화의 모든 가치를 얻는다.

## 동기 (Motivation)

`let basePrice = order.quantity * order.itemPrice;` 같은 임시 변수는 한 함수 안에서만 산다. query 함수로 빼면 *세 가지* 가치가 동시에 생긴다.

1. **다른 함수도 같은 계산을 재사용** — 호출만 하면 됨.
2. **테스트** — query는 *작은 함수*라 isolated 테스트 가능.
3. **이름** — query 함수 이름이 *변수 이름보다 더 책임 있게* 작용 (외부 API).

그리고 이것이 [Extract Function](/blog/programming/design/refactoring-catalog/pattern01-extract-function)의 *준비 단계*가 된다. 임시 변수를 query로 바꾸면 *함수 사이 매개변수 전달*이 줄어 추출 후 시그니처가 깔끔해진다.

### Method object 의 경우

Fowler가 강조하는 흐름:

```text
복잡한 함수
  ↓ Extract Variable로 의도 드러내기
복잡한 함수 + 의미 있는 임시 변수들
  ↓ Replace Temp with Query
복잡한 함수 + 의미 있는 query 함수들
  ↓ Extract Function 자연스럽게
짧은 함수 + query chain
  ↓ Combine Functions into Class
도메인 객체
```

작은 단계의 *연속*이 결국 *객체 모델*에 도달한다.

### 언제 적용하는가

- 임시 변수가 *간단한 표현식*이고 한 곳에서만 계산.
- 다른 함수도 같은 derived 값을 쓸 가능성.
- 함수 추출을 *준비* — 변수가 추출 경계에 걸리는 경우.
- 변수가 *함수 외부* 의미를 가지기 시작.

## 절차 (Mechanics)

1. **변수가 side effect 없이 한 번만 할당**되는지 확인.
2. 우변(right-hand)을 query 함수로 추출.
3. 변수를 inline ([Inline Variable](/blog/programming/design/refactoring-catalog/pattern04-inline-variable))해 query 호출로 대체.
4. 컴파일·테스트.

객체 메서드 안이면 query는 메서드, top-level 함수 안이면 query는 함수.

## 예시 1 — Order의 가격 계산

```javascript
// Before
class Order {
  constructor(quantity, itemPrice) {
    this._quantity = quantity;
    this._itemPrice = itemPrice;
  }
  get price() {
    const basePrice = this._quantity * this._itemPrice;
    const discountFactor = basePrice > 1000 ? 0.95 : 0.98;
    return basePrice * discountFactor;
  }
}
```

`basePrice`와 `discountFactor`가 임시 변수.

```javascript
// After
class Order {
  constructor(quantity, itemPrice) {
    this._quantity = quantity;
    this._itemPrice = itemPrice;
  }
  get basePrice()      { return this._quantity * this._itemPrice; }
  get discountFactor() { return this.basePrice > 1000 ? 0.95 : 0.98; }
  get price()          { return this.basePrice * this.discountFactor; }
}
```

세 query 함수가 *서로 호출*. 외부에서도 `order.basePrice` 같은 *직접 접근*이 가능해 다른 계산에서 재사용.

## 예시 2 — Extract Function 준비

```javascript
// Before — 함수 추출하고 싶지만 변수가 가운데 걸림
function reportOrder(order) {
  const basePrice = order.quantity * order.itemPrice;

  // print details
  console.log(`base: ${basePrice}`);
  console.log(`tax:  ${basePrice * 0.1}`);
  console.log(`total: ${basePrice * 1.1}`);
}
```

print 부분을 추출하려는데 `basePrice`가 *변수로* 묶여 있어 매개변수로 넘겨야 한다.

```javascript
// 단계 1 — temp → query
function reportOrder(order) {
  // print details
  console.log(`base: ${basePrice(order)}`);
  console.log(`tax:  ${basePrice(order) * 0.1}`);
  console.log(`total: ${basePrice(order) * 1.1}`);
}
function basePrice(order) { return order.quantity * order.itemPrice; }
```

```javascript
// 단계 2 — print 추출
function reportOrder(order) {
  printDetails(order);
}
function printDetails(order) {
  console.log(`base: ${basePrice(order)}`);
  console.log(`tax:  ${basePrice(order) * 0.1}`);
  console.log(`total: ${basePrice(order) * 1.1}`);
}
function basePrice(order) { return order.quantity * order.itemPrice; }
```

`basePrice` 매개변수 전달 없이 *함수 호출*만으로 모든 곳에서 사용.

## 예시 3 — 객체 안의 method object

```javascript
// Before — 복잡한 메서드, 임시 변수 4개
class HeatingPlan {
  constructor(temperatureRange) { this._range = temperatureRange; }

  isWithinRange(roomTemp) {
    const min = this._range.low;
    const max = this._range.high;
    const tolerance = 1;
    const adjusted = roomTemp;
    return adjusted >= min - tolerance && adjusted <= max + tolerance;
  }
}
```

```javascript
// After
class HeatingPlan {
  constructor(temperatureRange) { this._range = temperatureRange; }

  get min()       { return this._range.low; }
  get max()       { return this._range.high; }
  get tolerance() { return 1; }

  isWithinRange(roomTemp) {
    return roomTemp >= this.min - this.tolerance
        && roomTemp <= this.max + this.tolerance;
  }
}
```

각 query가 *재사용 가능*하고 *테스트 가능*. 변경(예: tolerance 1 → 0.5)이 *한 곳*에.

## 자주 보는 안티패턴

### 1. 비용 큰 query — caching 없이
```javascript
get expensiveValue() { return this._compute();   /* 매 호출 */ }
```
hot path에서 *수십 번* 호출되면 비용 폭발. memoization:

```javascript
get expensiveValue() {
  if (this._cached == null) this._cached = this._compute();
  return this._cached;
}
```

### 2. Side effect 있는 표현식
```javascript
const id = nextId();
useA(id);
useB(id);
```
`nextId()`를 query로 만들면 *호출 시점마다 다른 id*. 의미 깨짐. 변수 유지.

### 3. 한 함수 안에서만 의미 있는 변수
변수가 *진짜로 그 함수 안에서만 의미*가 있으면 query로 빼는 가치 적음. 다른 함수 재사용 가능성이 *없어 보일 때*는 그대로.

### 4. 너무 많은 query method
한 클래스에 *수십 개* 작은 query — anemic. 도메인 모델로 자연스러운지 검토.

### 5. Query가 mutable state에 의존
query가 *호출 시점*마다 다른 값 — *테스트 어려움*. mutable 의존을 *명시적 매개변수*로.

## Modern variants

### Computed property (Vue, MobX, SwiftUI)
모던 reactive framework는 *자동 캐싱 + dependency tracking*.

```javascript
// Vue 3
computed(() => basePrice.value * discountFactor.value)
```

자동 invalidation, 의존성 추적, 효율적 재계산.

### Lazy val (Scala, Kotlin)

```kotlin
class Order(val quantity: Int, val itemPrice: Double) {
    val basePrice by lazy { quantity * itemPrice }
}
```

*첫 접근 시 계산, 이후 캐싱*. Thread-safe.

### Memoization library

```javascript
import memoize from "lodash/memoize";
const basePrice = memoize((order) => order.quantity * order.itemPrice);
```

함수형 스타일에서 자주.

## 도구 / IDE

| 도구 | 기능 |
| --- | --- |
| IntelliJ | "Replace temp with query" |
| Rider | "Inline variable" 후 추출 |
| VS Code | 수동 |

## 성능 고려

- 단순 query는 인라인되어 비용 무시 가능.
- 복잡한 계산이면 *caching* 필수.
- 호출 횟수가 *너무 많을 때*만 측정 후 최적화.

## 관련 패턴

- **함수 추출**: [Pattern 1: Extract Function](/blog/programming/design/refactoring-catalog/pattern01-extract-function)
- **변수 인라인**: [Pattern 4: Inline Variable](/blog/programming/design/refactoring-catalog/pattern04-inline-variable)
- **파생 값**: [Pattern 32: Replace Derived Variable with Query](/blog/programming/design/refactoring-catalog/pattern32-replace-derived-variable-with-query)
- **메서드 → 객체**: [Pattern 9: Combine Functions into Class](/blog/programming/design/refactoring-catalog/pattern09-combine-functions-into-class)
