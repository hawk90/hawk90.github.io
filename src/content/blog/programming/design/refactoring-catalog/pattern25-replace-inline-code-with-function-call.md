---
title: "Pattern 25: Replace Inline Code with Function Call"
date: 2026-06-02T01:00:00
description: "Inline 코드가 기존 함수와 같은 일을 한다면 호출로 — DRY."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 25
tags: [refactoring, dry, function-call, fowler]
draft: true
type: book-review
bookTitle: "Refactoring: Improving the Design of Existing Code, 2nd Edition"
bookAuthor: "Martin Fowler"
---

## 한 줄 요약

> Inline 코드가 *이미 존재하는 함수*와 같은 일을 한다면, 호출로 바꿔 *단일 정의*로 통일한다.

## 동기 (Motivation)

DRY (Don't Repeat Yourself) 원칙의 직접 적용. 같은 로직을 *여러 곳에 inline*해 두면:

1. **일관성 잃기** — 한 곳에서 버그 수정해도 다른 곳은 그대로.
2. **변경 비용 증가** — 모든 사본 수정 + 동기화.
3. **의도 불명** — 5줄짜리 inline보다 *이름 있는 호출*이 더 명확.
4. **테스트 분산** — 한 함수에 모이면 테스트 한 번, 분산되면 각각.

함수가 *이미 있다*면 그것을 *발견*하는 게 핵심. *비슷한 의도*의 inline 코드를 보면 표준 라이브러리·utility·기존 helper에서 찾아본다.

### 표준 라이브러리 우선

직접 짤 가치가 거의 없는 것 — 정렬, 검색, 날짜 계산, JSON parsing, regex match, hash, base64. inline으로 짜기보단 *라이브러리 호출* 우선.

### Inline Function과의 관계

[Inline Function](/blog/programming/design/refactoring-catalog/pattern02-inline-function)의 *역방향*. 둘 다 *코드 결*에 따라 선택. Inline은 *함수가 가치 없을 때*, Replace는 *코드가 함수를 발견했을 때*.

### 언제 적용하는가

- 한 함수 본문에 들어가는 inline 코드가 *기존 함수*와 같다.
- 같은 로직이 *여러 위치*에 inline.
- 직접 짠 코드가 *표준 라이브러리에 있다*.
- *DRY 위반*이 보인다.

## 절차 (Mechanics)

1. **inline 코드와 동일 의미의 함수**를 찾는다 — 기존 함수, 표준 라이브러리, utility lib.
2. inline 코드를 함수 호출로 교체.
3. 테스트.
4. 다른 위치에도 같은 inline 코드가 있는지 둘러본다.

코드가 *정확히 같지 않으면* 약간 변형이 필요할 수도 — 매개변수, 약간의 조건 분기.

## 예시 1 — 기존 함수 발견

```javascript
// Before — 두 함수가 같은 일
function appliesToMass(s) {
  for (const state of states) {
    if (s === state) return true;
  }
  return false;
}

// 다른 곳에서
const found = states.includes(s);   // 같은 일
```

`Array.prototype.includes`가 *표준*. 직접 loop 짤 이유 없음.

```javascript
// After
function appliesToMass(s) {
  return states.includes(s);
}
```

한 줄. 표준 API 사용.

## 예시 2 — Lodash 활용

```javascript
// Before
const grouped = {};
for (const item of items) {
  const key = item.category;
  if (!grouped[key]) grouped[key] = [];
  grouped[key].push(item);
}
```

```javascript
// After
import _ from "lodash";
const grouped = _.groupBy(items, "category");
```

또는 ES2024+ Object.groupBy:

```javascript
const grouped = Object.groupBy(items, item => item.category);
```

## 예시 3 — Helper 함수 통일

```javascript
// 모듈 A
const fullName = `${user.firstName} ${user.lastName}`;

// 모듈 B
const fullName = user.firstName + " " + user.lastName;

// 모듈 C (helper 존재)
function formatFullName(user) {
  return `${user.firstName} ${user.lastName}`;
}
```

A, B는 inline. C에 helper 있음. inline을 호출로:

```javascript
// 모듈 A, B
import { formatFullName } from "./helpers";
const fullName = formatFullName(user);
```

한 곳에서 변경(예: middle name 추가)이면 모든 호출자 영향.

## 자주 보는 안티패턴

### 1. *비슷해 보이지만 다른* 함수 호출
함수 시그니처는 같지만 *동작이 다른* 경우 (예: `Array.includes`는 `===`, custom은 `==`). edge case 검증.

### 2. *과한 일반화*
한 곳의 inline을 *모든 곳에 적용 가능한 함수*로 추출하려다 매개변수 폭발. 추출은 *최소한*.

### 3. 라이브러리 의존성 폭발
*한 줄 함수* 위해 큰 라이브러리 import (lodash 전체). tree-shaking 또는 별 import.

### 4. *Performance 가정*
"loop가 더 빠르다" 가정 — 측정 후. 표준 API는 V8/JIT 최적화로 보통 같거나 빠름.

### 5. *코드 readability 잃음*
inline 5줄이 명확한데 외부 함수 호출이 *blackbox*면 가독성 감소. *이름이 의미를 더할 때만*.

## Modern variants

### Optional chaining
inline `if (user && user.address && user.address.city)`를 `user?.address?.city`로.

### Nullish coalescing
inline `x === null || x === undefined ? defaultValue : x`를 `x ?? defaultValue`로.

### Pipeline (proposal / Hack pipes)
inline 변환 chain을 `data |> filter(_, isValid) |> map(_, format)` 같은 표현으로.

### Rust iterator method
```rust
// Before
let mut sum = 0;
for x in items.iter() { if x.active { sum += x.score; } }

// After
let sum: i32 = items.iter().filter(|x| x.active).map(|x| x.score).sum();
```

표준 iterator method 활용.

## 도구 / IDE

| 도구 | 기능 |
| --- | --- |
| IntelliJ | "Replace with helper method" 일부 |
| ESLint | `prefer-array-includes`, `prefer-template` 등 자동 제안 |
| Rust Clippy | 표준 패턴 권장 |

linter가 *자동 제안*. 활용.

## 성능 고려

- 함수 호출 비용 ≈ 0 (JIT 인라인).
- 라이브러리 함수는 *수년 최적화*. 직접 짠 것보다 빠른 경우 많음.

## 관련 패턴

- **역연산**: [Pattern 2: Inline Function](/blog/programming/design/refactoring-catalog/pattern02-inline-function)
- **알고리즘 교체**: [Pattern 20: Substitute Algorithm](/blog/programming/design/refactoring-catalog/pattern20-substitute-algorithm)
- **함수 추출**: [Pattern 1: Extract Function](/blog/programming/design/refactoring-catalog/pattern01-extract-function)
