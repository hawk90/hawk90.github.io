---
title: "Pattern 32: Replace Derived Variable with Query"
date: 2026-06-02T08:00:00
description: "계산 가능한 값을 변수로 저장하지 말고 query로 — single source of truth."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 32
tags: [refactoring, derived-variable, query, fowler]
draft: true
type: book-review
bookTitle: "Refactoring: Improving the Design of Existing Code, 2nd Edition"
bookAuthor: "Martin Fowler"
---

## 한 줄 요약

> 어떤 변수가 *다른 데이터로부터 계산 가능*하다면, 변수를 두지 말고 *query 함수*로 만든다. 동기화 책임이 사라진다.

## 동기 (Motivation)

상태(mutable state)는 *비싼 자원*이다. 한 번 만들면 *그것을 최신으로 유지*하는 책임이 따라온다. *derived state*(다른 데이터로부터 계산되는 상태)는 특히 위험하다 — 원본이 바뀌었는데 derived가 갱신을 놓치면 *invariant 위반*이다.

```javascript
class Order {
  constructor(items) {
    this._items = items;
    this._total = items.reduce((s, i) => s + i.price, 0);   // derived
  }
  addItem(item) {
    this._items.push(item);
    // _total 갱신 잊으면 → bug
  }
}
```

`_total`은 `_items`로부터 계산된다. 별도 변수로 두면 *모든 `_items` 변경 지점*에서 `_total`도 갱신해야 한다. 한 곳이라도 빠지면 *조용히 잘못된 답*.

derived를 *변수가 아닌 query*로 바꾸면 *single source of truth* — `_items`만 진실, `total`은 그것의 *view*다.

```javascript
class Order {
  constructor(items) {
    this._items = items;
  }
  addItem(item) { this._items.push(item); }
  get total() { return this._items.reduce((s, i) => s + i.price, 0); }
}
```

`addItem`이 더 이상 `_total`을 신경 쓸 필요 없다. `get total`은 *호출 시점의 정확한 값*.

### 신호

- 두 field가 *항상 함께 변경*되어야 함 (`_items`와 `_total`).
- 한 field가 *다른 field의 단순 변환*.
- bug 리포트: "*수량은 맞는데 합계가 다름*".
- field 갱신 코드가 *여러 곳*에 반복.

### 언제 적용하는가

- *계산 비용이 작다* (O(n)이지만 n이 작거나 호출 빈도 적음).
- 원본 데이터가 *자주 변경됨* → derived 동기화 부담 큼.
- *single source of truth*가 도메인 모델에 부합.

### 언제 적용하지 않는가

- 계산 비용이 *매 호출마다* 크고, 호출이 *자주 일어남* → memoization으로 절충.
- 결과를 *외부 시스템에 저장*해야 함 (예: DB의 indexed column).
- *event sourcing*에서는 일부러 derived를 저장하기도 (snapshot).

## 절차 (Mechanics)

1. **derived field의 모든 갱신 지점**을 식별.
2. 동일 계산을 *query function*으로 도입.
3. 호출처 한 곳씩 *변수 대신 query 호출*로 변경.
4. 모든 호출처 옮겼으면 *원본 field 제거*.
5. 컴파일·테스트.

## 예시 1 — 단순 derived field

```javascript
// Before
class ProductionPlan {
  constructor() {
    this._production = 0;
    this._adjustments = [];
  }
  get production() { return this._production; }
  applyAdjustment(adjustment) {
    this._adjustments.push(adjustment);
    this._production += adjustment.amount;   // derived 갱신
  }
}
```

`_production`이 `_adjustments`로부터 derived. 매번 sync 책임.

```javascript
// After
class ProductionPlan {
  constructor() {
    this._adjustments = [];
  }
  get production() {
    return this._adjustments.reduce((s, a) => s + a.amount, 0);
  }
  applyAdjustment(adjustment) {
    this._adjustments.push(adjustment);
  }
}
```

`applyAdjustment`가 한 줄이 됐다. `production`은 *항상 정확*.

## 예시 2 — Multiple derived fields

```javascript
// Before
class Account {
  constructor(transactions) {
    this._transactions = transactions;
    this._balance = transactions.reduce((s, t) => s + t.amount, 0);
    this._lastTransactionAt = transactions[transactions.length - 1]?.date;
    this._transactionCount = transactions.length;
  }
  addTransaction(t) {
    this._transactions.push(t);
    this._balance += t.amount;
    this._lastTransactionAt = t.date;
    this._transactionCount++;
  }
}
```

3개의 derived가 모두 sync 필요. `addTransaction`이 *4줄*에 4개의 invariant.

```javascript
// After
class Account {
  constructor(transactions) {
    this._transactions = transactions;
  }
  addTransaction(t) {
    this._transactions.push(t);
  }
  get balance() {
    return this._transactions.reduce((s, t) => s + t.amount, 0);
  }
  get lastTransactionAt() {
    return this._transactions[this._transactions.length - 1]?.date;
  }
  get transactionCount() {
    return this._transactions.length;
  }
}
```

3개의 query가 `_transactions`라는 *single source of truth*에서 derive. invariant 위반 불가.

## 예시 3 — Memoization (계산 비싸면)

derived 변수의 *원래 의도*가 보통 "캐시"다. derived를 query로 바꾸면 *매번 재계산*된다 — 비용이 크면 명시적 memoization.

```javascript
// After + memoization
class Order {
  constructor(items) {
    this._items = items;
    this._totalCache = null;
  }
  addItem(item) {
    this._items.push(item);
    this._totalCache = null;   // invalidate
  }
  get total() {
    if (this._totalCache === null) {
      this._totalCache = this._items.reduce((s, i) => s + i.price, 0);
    }
    return this._totalCache;
  }
}
```

이제 캐시 *무효화*만 신경 쓰면 됨 — *모든 갱신 지점에서 sync*보다 부담이 적다(cache invalidation이 더 쉬운 문제).

함수형 라이브러리:

```javascript
// lodash memoize, ramda memoize, react useMemo
const memoizedTotal = useMemo(() => items.reduce(...), [items]);
```

## 자주 보는 안티패턴

### 1. derived 변수를 *DB column으로 저장*
ORM 모델에서 `total` column을 두면 sync 부담. *materialized view*나 *trigger*로 DB 레벨에서 처리하거나 계산 query 사용.

### 2. *부분 갱신*
일부 derived는 변수, 일부는 query — *일관성 깨짐*. 정책을 통일.

### 3. memoize 무효화 *놓침*
캐시 invalidate 빠뜨리면 stale 결과. *모든 mutator*에서 무효화.

### 4. *getter에서 mutation*
```javascript
get total() {
  this._total = this._items.reduce(...);   // ← getter가 state 변경
  return this._total;
}
```
getter는 *side effect free*. mutation은 lazy init 패턴으로만(첫 호출에서만).

### 5. *Event sourcing 무시*
event sourcing에서는 *snapshot*이 의도적 derived 저장. 패턴 적용 전 도메인 확인.

### 6. *concurrent access* 무시
다중 스레드/async에서 cache invalidation은 *race condition*. lock·atomic·immutable 패턴.

## Modern variants

### React `useMemo`

```javascript
function Order({ items }) {
  const total = useMemo(() => items.reduce((s, i) => s + i.price, 0), [items]);
  return <div>{total}</div>;
}
```

dependency가 바뀔 때만 재계산. *derived view*에 자연.

### Vue computed property

```javascript
const order = reactive({
  items: [],
  get total() {
    return this.items.reduce((s, i) => s + i.price, 0);
  }
});
```

reactive 객체의 query는 *자동 reactivity*.

### Redux selector (reselect)

```javascript
const selectTotal = createSelector(
  [(state) => state.items],
  (items) => items.reduce((s, i) => s + i.price, 0)
);
```

자동 memoize.

### Kotlin computed property

```kotlin
class Order(val items: List<Item>) {
  val total: Int get() = items.sumOf { it.price }   // derived
}
```

`val total = ...`(stored)와 `val total get() = ...`(computed)의 명확한 구분.

### Rust — derived는 함수로

Rust는 *stored derived 거의 없음*. method로 표현.

```rust
impl Order {
    fn total(&self) -> u32 { self.items.iter().map(|i| i.price).sum() }
}
```

## 도구 / IDE

| 도구 | 기능 |
| --- | --- |
| IntelliJ | "Convert Field to Property/Getter" |
| Memoize 라이브러리 | lodash, ramda, reselect, lru-cache |
| Reactive 프레임워크 | Vue computed, React useMemo, Svelte derived |

## 성능 고려

- *호출 비용*: O(n) 합계는 보통 무시 가능. 하지만 *깊은 중첩 query*나 *큰 collection*에서 메모이즈 검토.
- *반응성 비용*: Vue/Solid의 reactive query는 자동 dependency tracking — 항상 빠르지 않음.
- *측정 우선*: 변경 후 profiler로 확인. 추정으로 memoize 추가하지 않음.

## 관련 패턴

- **자매**: [Pattern 15: Replace Temp with Query](/blog/programming/design/refactoring-catalog/pattern15-replace-temp-with-query)
- **반대**: stored derived는 *event sourcing snapshot*이나 DB *materialized view*
- **준비**: [Pattern 6: Encapsulate Variable](/blog/programming/design/refactoring-catalog/pattern06-encapsulate-variable)
