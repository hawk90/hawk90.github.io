---
title: "Pattern 42: Parameterize Function"
date: 2026-05-02T18:00:00
description: "비슷한 함수 여러 개 — 차이를 parameter로 빼서 DRY."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 42
tags: [refactoring, parameterize, dry, fowler]
draft: true
type: book-review
bookTitle: "Refactoring: Improving the Design of Existing Code, 2nd Edition"
bookAuthor: "Martin Fowler"
---

## 한 줄 요약

> 동일한 로직에 *상수만 다른* 함수 여러 개가 있다면, 그 상수를 *parameter*로 빼서 하나로 합친다.

## 동기 (Motivation)

DRY 위반의 가장 흔한 형태. 같은 패턴이 *literal만 다르게* 반복되면, 패턴이 변할 때 *모든 사본을 동시에* 수정해야 한다.

```javascript
// Before — 두 함수, literal만 다름
function tenPercentRaise(person) {
  person.salary = person.salary.multiply(1.1);
}
function fivePercentRaise(person) {
  person.salary = person.salary.multiply(1.05);
}
```

같은 패턴 `salary = salary * (1 + factor)`. factor만 다름. `7%` 인상이 필요하면 *세 번째 함수 추가*.

```javascript
// After — 한 함수
function raise(person, factor) {
  person.salary = person.salary.multiply(1 + factor);
}

// 호출
raise(employee, 0.1);
raise(employee, 0.05);
```

이제 *모든 인상률*을 처리. 동작이 바뀌면 *한 곳만 수정*.

### 신호

- 함수 이름에 *숫자/상수가 박혀 있음* (`tenPercent`, `processBatch100`).
- 함수 본문이 *거의 동일*하고 *몇 개 값만 다름*.
- 새 변형마다 *함수 복사 + 값 변경*.
- 함수 이름이 *길고 case-specific*.

### 언제 적용하는가

- 동일 패턴이 *2개 이상*의 함수에 반복.
- 차이가 *명확한 parameter로 표현 가능* (값, 함수, 객체).
- 새 변형이 *흔히 추가*됨.

### 언제 적용하지 않는가

- *지나친 parameter*가 가독성 손해.
- 두 함수가 *우연히 비슷하지만 다른 이유*로 존재 — 분리 유지가 의도 명확.
- *over-engineering* — 한 호출자뿐인데 일반화는 과잉.

## 절차 (Mechanics)

1. **차이 식별** — 두 함수 비교, *변하는 값*과 *공통 패턴* 구분.
2. **변하는 값을 parameter로** 받는 새 함수 작성.
3. **기존 호출처** 한 곳씩 새 함수로 교체.
4. 모든 호출 옮겼으면 *기존 함수 제거*.
5. 컴파일·테스트.

## 예시 1 — 숫자 parameter

위 raise 예 참고.

## 예시 2 — 범위 parameter

```javascript
// Before
function bottomBand(usage) {
  return Math.min(usage, 100) * 0.03;
}
function middleBand(usage) {
  return Math.max(0, Math.min(usage, 200) - 100) * 0.05;
}
function topBand(usage) {
  return Math.max(0, usage - 200) * 0.07;
}
```

```javascript
// After
function withinBand(usage, bottom, top, rate) {
  return Math.max(0, Math.min(usage, top) - bottom) * rate;
}

// 사용
const a = withinBand(usage, 0, 100, 0.03);
const b = withinBand(usage, 100, 200, 0.05);
const c = withinBand(usage, 200, Infinity, 0.07);
```

세 함수 → 한 함수 + 세 호출. 새 band 추가가 *한 줄*.

## 예시 3 — 함수 parameter (Higher-Order)

```javascript
// Before
function processGreaterThan100(items) {
  return items.filter(i => i.value > 100);
}
function processInRange50to150(items) {
  return items.filter(i => i.value >= 50 && i.value <= 150);
}
```

```javascript
// After
function process(items, predicate) {
  return items.filter(predicate);
}

// 사용
const a = process(items, i => i.value > 100);
const b = process(items, i => i.value >= 50 && i.value <= 150);
```

함수를 parameter로 — *strategy 추출*.

## 자주 보는 안티패턴

### 1. *Over-parameterize*
```javascript
function process(items, threshold1, threshold2, op, factor, ...) { /* */ }
```
parameter가 7개 — *호출 사이트에서 의미 추적 불가*. 객체로 묶거나 ([Pattern 8: Introduce Parameter Object](/blog/programming/design/refactoring-catalog/pattern08-introduce-parameter-object)) 분리.

### 2. *Boolean flag*로 분기
```javascript
function process(items, isStrict) {
  if (isStrict) ... else ...;
}
```
[Pattern 43: Remove Flag Argument](/blog/programming/design/refactoring-catalog/pattern43-remove-flag-argument) — flag보다 *별도 함수*.

### 3. *Default value 남용*
```javascript
function raise(person, factor = 0.1) { ... }
```
default가 *암묵적 결정*을 만듦 — 호출 사이트에서 명시 권장.

### 4. *복잡한 차이를 강제 통합*
두 함수가 *논리적으로 다른 일*인데 억지로 합침 — *각 case가 조건문 가득*. 분리가 옳음.

### 5. *Specific 이름 유지*
parameterize 후 함수 이름이 `processGreaterThan100` 그대로 — 새 의미를 *이름에 반영*.

### 6. *Strategy 객체 vs callback*
복잡한 strategy는 *객체*가 callback보다 표현력 우수.

## Modern variants

### Currying / Partial application

```javascript
const raise = (factor) => (person) => person.salary *= (1 + factor);
const tenPercent  = raise(0.1);
const fivePercent = raise(0.05);

// 호출
tenPercent(employee);
fivePercent(employee);
```

함수형 스타일 — *부분 적용*으로 *case별 함수* 생성.

### Builder / Configuration

```javascript
class Raise {
  constructor() { this.factor = 0; }
  by(factor) { this.factor = factor; return this; }
  apply(person) { person.salary *= (1 + this.factor); }
}

new Raise().by(0.1).apply(employee);
```

복잡한 parameter는 *builder*.

### Rust — generic + trait

```rust
fn process<F: Fn(&Item) -> bool>(items: &[Item], pred: F) -> Vec<Item> {
    items.iter().filter(|i| pred(i)).cloned().collect()
}
```

### TypeScript — generic function

```typescript
function process<T>(items: T[], predicate: (x: T) => boolean): T[] {
  return items.filter(predicate);
}
```

## 도구 / IDE

| 도구 | 기능 |
| --- | --- |
| IntelliJ | "Extract Parameter" |
| Rider (C#) | 같음 |
| ESLint | `no-duplicate-imports`, duplicate function 감지 |

## 성능 고려

함수 호출 추상화 — JIT 인라인으로 비용 0. 단 *high-order function*은 일부 환경에서 *closure 할당* — hot path 측정.

## 관련 패턴

- **자매**: [Pattern 43: Remove Flag Argument](/blog/programming/design/refactoring-catalog/pattern43-remove-flag-argument)
- **객체화**: [Pattern 8: Introduce Parameter Object](/blog/programming/design/refactoring-catalog/pattern08-introduce-parameter-object)
- **반대**: 일반 함수를 case별로 분리 (특수화)
