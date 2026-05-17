---
title: "Pattern 10: Combine Functions into Transform"
date: 2026-06-01T10:00:00
description: "파생값을 한 transform 함수로 모은다 — 함수형 / immutable 스타일."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 10
tags: [refactoring, transform-function, derived-data, fowler]
draft: true
type: book-review
bookTitle: "Refactoring: Improving the Design of Existing Code, 2nd Edition"
bookAuthor: "Martin Fowler"
---

## 한 줄 요약

> 같은 *파생 값(derived)* 계산이 여러 곳에 흩어져 있다면, 입력을 받아 *enriched 사본*을 반환하는 transform 함수로 모은다.

## 동기 (Motivation)

같은 데이터에서 *파생*되는 값(세금, 합계, 표시용 텍스트)을 여러 함수가 각자 계산하면 일관성을 잃기 쉽다. 한 곳에서 `taxableCharge`를 잘못 계산하고, 다른 곳에서 정정하면 *둘이 어긋난다*. 변경의 *단일 진실 원천*이 없는 게 문제.

Transform 함수는 입력 객체의 *깊은 복사*를 만들고 *파생 필드*를 더해 반환한다. 모든 계산이 한 곳에 모이고, 클라이언트는 *transform 결과*만 사용한다.

[Combine Functions into Class](/blog/programming/design/refactoring-catalog/pattern09-combine-functions-into-class)와 같은 의도지만 *함수형 + immutable* 스타일.

### Class vs Transform

| 측면 | Class | Transform |
| --- | --- | --- |
| 상태 변경 | 가능 (mutating method) | 없음 (immutable) |
| 함수형 친화 | 약함 | 강함 |
| 도메인 모델 | 자연스러움 | 단순 데이터에 적합 |
| 메모리 | 적음 | 더 큼 (복사) |
| 동시성 | lock 주의 | 안전 |
| Testing | mocking 필요 가능 | 입력→출력 단순 |
| ETL/Pipeline | 어색 | 자연스러움 |

### 언제 적용하는가

- 같은 derived 계산이 여러 호출처에서 반복.
- 데이터를 *변경하지 않고* 파생만 만들고 싶다.
- 데이터 파이프라인 (ETL, view 구성)이 자연스럽다.
- 함수형 스타일이 코드 베이스의 결.
- 동시성 안전성이 중요.
- 입력 객체를 *원본 그대로* 유지하고 싶다.

## 절차 (Mechanics)

1. Transform 함수를 만든다. 입력 객체의 *깊은 복사*를 반환하는 게 시작.
2. *첫 번째 파생 계산*을 transform 안으로 이동 (원본 함수는 transform 호출로 위임).
3. 호출처를 transform 결과를 사용하도록 바꾼다.
4. 다른 파생 계산도 같은 방식으로 이동.
5. 원본 derived 함수를 제거.

복사를 잊으면 원본이 *오염*된다 — immutability가 핵심.

## 예시 1 — Reading

```javascript
// Before — 두 함수가 같은 reading에서 파생
function base(reading)         { return reading.month * reading.quantity; }
function taxableCharge(reading){ return Math.max(0, base(reading) - taxThreshold(reading.year)); }

// 호출
const aReading = acquireReading();
const baseCharge = base(aReading);
const taxable    = taxableCharge(aReading);
```

```javascript
// After — transform
function enrichReading(original) {
  const result = _.cloneDeep(original);
  result.baseCharge    = base(result);
  result.taxableCharge = taxableCharge(result);
  return result;
}

// 호출
const reading = enrichReading(acquireReading());
const baseCharge = reading.baseCharge;
const taxable    = reading.taxableCharge;
```

이제 *어디서나 같은 enrichReading*만 통과시키면 일관된 파생 값을 얻는다. 원본 `acquireReading()` 결과는 *변하지 않음*.

## 예시 2 — Pipeline composition

여러 transform을 *합성*해 multi-stage pipeline.

```javascript
const pipe = (...fns) => (x) => fns.reduce((v, f) => f(v), x);

const enrichReading      = (r) => ({ ...r, baseCharge: r.month * r.quantity });
const applyDiscount      = (r) => ({ ...r, discount: r.baseCharge > 1000 ? 0.05 : 0 });
const finalizeWithTax    = (r) => ({
  ...r,
  total: (r.baseCharge * (1 - r.discount)) * 1.1,
});

const process = pipe(enrichReading, applyDiscount, finalizeWithTax);

const result = process(acquireReading());
// result.baseCharge, result.discount, result.total 모두
```

각 단계가 *작은 transform*. 단계 추가·삭제·재배열이 쉽다.

## 예시 3 — Server-side rendering (view model)

domain → view model 변환의 전형.

```javascript
function userViewModel(user) {
  const result = _.cloneDeep(user);
  result.fullName    = `${user.firstName} ${user.lastName}`;
  result.avatarUrl   = gravatarUrl(user.email);
  result.lastLoginAt = formatRelative(user.lastLoginTs);
  result.isAdmin     = user.roles.includes("admin");
  return result;
}

// 템플릿에서
const vm = userViewModel(user);
render(template, vm);
```

도메인 객체는 *그대로*, *view-specific 필드*만 enriched.

## 자주 보는 안티패턴

### 1. 복사를 잊음
```javascript
function enrich(r) {
  r.baseCharge = r.month * r.quantity;   // 원본 mutation!
  return r;
}
```
호출자가 *같은 reading*을 두 번째 호출하면 *이미 enriched* 상태 — 또 추가됨. 부작용으로 *전파*된다.

### 2. 얕은 복사로 충분하다 가정
```javascript
function enrich(r) {
  const result = { ...r };   // shallow
  result.items[0].price = 999;   // 원본의 items도 영향!
}
```
`spread`나 `Object.assign`은 *한 단계만* 복사. nested object는 공유. 의도와 다른 mutation 발생. *깊은 복사* 또는 *immutable library* (Immer, Immutable.js).

### 3. 너무 큰 transform
한 함수가 *수십 개 derived 필드*를 계산하면 다시 흩어진 함수가 된다. 작은 transform 여러 개 + pipeline.

### 4. Transform 안에서 외부 호출
```javascript
function enrichReading(r) {
  const result = { ...r };
  result.weather = api.getWeather(r.location);   // 부수효과!
}
```
Transform은 *pure*해야 한다. 외부 호출이 필요하면 *데이터 준비*와 *transform*을 분리.

### 5. Transform vs Class 잘못 선택
*복잡한 도메인 모델*이 자연스러운데 transform으로 가면 곧 record가 비대해진다. 결정 트리 활용.

## Modern variants

### Immer.js (JS)

```javascript
import { produce } from "immer";

const enrichReading = produce((draft) => {
  draft.baseCharge = draft.month * draft.quantity;
});

const enriched = enrichReading(reading);
```

Immer가 *구조적 공유*로 깊은 복사 비용을 줄임. Mutable처럼 작성하지만 *결과는 immutable*.

### Ramda / Lodash/fp

```javascript
import R from "ramda";

const enrichReading = R.pipe(
  R.assoc("baseCharge", R.converge(R.multiply, [R.prop("month"), R.prop("quantity")])),
  R.assoc("taxableCharge", /* ... */),
);
```

Pointfree style. 작은 함수의 composition.

### Rust — owned transformation

```rust
fn enrich_reading(r: Reading) -> EnrichedReading {
    let base = r.month * r.quantity;
    EnrichedReading {
        customer: r.customer,
        quantity: r.quantity,
        month: r.month,
        year: r.year,
        base_charge: base,
        taxable_charge: (base - tax_threshold(r.year)).max(0),
    }
}
```

ownership으로 원본을 *명시적*으로 consume.

### Persistent data structure
Clojure, Scala, Elixir의 immutable map은 *구조적 공유*로 복사 비용 거의 없음. 함수형 언어에선 transform이 *기본 패턴*.

## 도구 / IDE

별도 도구 없음. *수동 추출 + 복사 로직*.

## 성능 고려

- 깊은 복사 비용. 작은 객체엔 무시 가능, 큰 객체엔 *구조적 공유* (Immer, Immutable.js) 또는 lazy.
- Pipeline composition은 *중간 객체* N개 생성. JIT의 escape analysis로 일부 제거.
- 측정 후 결정 — 보통 가독성이 더 중요.

## 관련 패턴

- **대안**: [Pattern 9: Combine Functions into Class](/blog/programming/design/refactoring-catalog/pattern09-combine-functions-into-class)
- **단계 분리**: [Pattern 11: Split Phase](/blog/programming/design/refactoring-catalog/pattern11-split-phase)
- **값 객체**: [Pattern 14: Replace Primitive with Object](/blog/programming/design/refactoring-catalog/pattern14-replace-primitive-with-object)
- **derived → query**: [Pattern 32: Replace Derived Variable with Query](/blog/programming/design/refactoring-catalog/pattern32-replace-derived-variable-with-query)
