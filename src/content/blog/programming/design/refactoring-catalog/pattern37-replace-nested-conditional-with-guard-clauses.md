---
title: "Pattern 37: Replace Nested Conditional with Guard Clauses"
date: 2026-05-02T13:00:00
description: "Nested if 피라미드를 early return으로 평탄화 — main path가 한눈에."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 37
tags: [refactoring, guard-clause, early-return, fowler]
draft: true
type: book-review
bookTitle: "Refactoring: Improving the Design of Existing Code, 2nd Edition"
bookAuthor: "Martin Fowler"
---

## 한 줄 요약

> 조건문은 두 정신 모델 — *"양쪽 다 정상 경로"*와 *"한쪽만 정상, 나머지는 예외"*. 후자라면 *예외를 먼저 처리하고 빠져나가라*. main path가 평탄해진다.

## 동기 (Motivation)

if/else는 *대칭적*이다. 두 분기가 *모두 정상 흐름*이면 if/else가 적절하다. 하지만 한쪽이 *예외/early exit*이고 다른 쪽이 *정상 본문*이라면, if/else는 *비대칭 의도*를 *대칭 syntax*에 억지로 끼워 맞춘 것.

```javascript
// Before — nested if
function getPayAmount(employee) {
  let result;
  if (employee.isSeparated) {
    result = { amount: 0, reasonCode: "SEP" };
  } else {
    if (employee.isRetired) {
      result = { amount: 0, reasonCode: "RET" };
    } else {
      // 본 계산 — 가장 깊이 묻힘
      let lorem = lorem(employee);
      let ipsum = ipsum(employee);
      result = { amount: lorem * ipsum, reasonCode: "" };
    }
  }
  return result;
}
```

본 계산이 *3단계 nesting* 안. 독자는 "정상 path가 어디?"를 찾아 *눈으로 indent를 따라가야* 한다. **guard clause**는 예외 조건을 *먼저 처리해 즉시 return*. 본 계산이 *최상위 수준*에 노출된다.

```javascript
// After — guard clauses
function getPayAmount(employee) {
  if (employee.isSeparated) return { amount: 0, reasonCode: "SEP" };
  if (employee.isRetired)   return { amount: 0, reasonCode: "RET" };
  // 본 계산 — flat
  const lorem = lorem(employee);
  const ipsum = ipsum(employee);
  return { amount: lorem * ipsum, reasonCode: "" };
}
```

함수가 *"이 둘이 아니면 일반 계산"*으로 읽힌다. main path가 *함수의 핵심*임을 syntax가 강조한다.

### 신호

- if-else 안에 if-else가 2단계 이상.
- 본 계산이 *깊이 묻혀* 있음.
- else 블록이 *길고 then 블록이 짧음* (또는 반대).
- 조건의 *비대칭 의도* (한쪽 예외 / 한쪽 본문).

### "Single return point" 논쟁

전통 구조적 프로그래밍은 *한 함수에 return 한 번*을 권장했다. 그러나 짧은 함수에서는 *guard clause의 early return*이 훨씬 읽기 좋다. Fowler는 *guard clause를 명확히 우대*. 다만:

- 함수가 *길면* (50+ 줄) early return이 흩어져 *추적 어려움*.
- *destructor/cleanup* 필요한 언어(C, manual resource)는 *single exit*가 안전.

→ **짧고 명확한 함수에는 guard clause, 긴 함수는 정리 후 guard.**

### 언제 적용하는가

- 한 분기가 *예외/early exit*.
- 본 계산이 *깊이 nested*.
- 코드를 읽을 때 *indent를 따라가야 함*.

### 언제 적용하지 않는가

- 두 분기가 *동등한 본문* (if/else 유지).
- 함수가 *너무 길어* return이 분산되면 추적 어려움.

## 절차 (Mechanics)

1. 가장 *바깥쪽 조건*을 보고, 그것이 *예외인지 본 path인지* 결정.
2. 예외라면 *조건 반전 + early return*.
3. 컴파일·테스트.
4. 다음 nested 조건도 반복.
5. 모두 평탄화되면 본 계산이 최상위에.

## 예시 1 — 기본 패턴

위에서 본 예. *세 단계 nesting → 두 guard + 본 계산*.

## 예시 2 — Reversing the conditional

```javascript
// Before
function adjustedCapital(instrument) {
  let result = 0;
  if (instrument.capital > 0) {
    if (instrument.interestRate > 0 && instrument.duration > 0) {
      result = (instrument.income / instrument.duration) * instrument.adjustmentFactor;
    }
  }
  return result;
}
```

```javascript
// After
function adjustedCapital(instrument) {
  if (instrument.capital <= 0) return 0;
  if (instrument.interestRate <= 0 || instrument.duration <= 0) return 0;
  return (instrument.income / instrument.duration) * instrument.adjustmentFactor;
}
```

각 guard는 *"이 조건이면 일찍 끝낸다"*. 본 계산은 더 이상 nested 아님.

## 예시 3 — Loop과 결합

```javascript
// Before — nested inside loop
function findProcessedItems(items) {
  const result = [];
  for (const item of items) {
    if (item) {
      if (!item.isArchived) {
        if (item.priority > 5) {
          result.push(process(item));
        }
      }
    }
  }
  return result;
}
```

```javascript
// After — guard inside loop
function findProcessedItems(items) {
  const result = [];
  for (const item of items) {
    if (!item) continue;
    if (item.isArchived) continue;
    if (item.priority <= 5) continue;
    result.push(process(item));
  }
  return result;
}
```

`continue`는 loop의 guard clause. 또는 *functional pipeline*으로 가능:

```javascript
function findProcessedItems(items) {
  return items
    .filter(item => item && !item.isArchived && item.priority > 5)
    .map(process);
}
```

## 자주 보는 안티패턴

### 1. *과도한 guard clause*
함수 앞부분이 *guard만 10개* — 한 함수에 책임이 너무 많음. [Extract Function](/blog/programming/design/refactoring-catalog/pattern01-extract-function)으로 분리.

### 2. *Cleanup 누락*
C/C++/Java try-finally 없이 early return 시 *자원 누수*. 언어가 cleanup을 *명시적*으로 요구한다면 single exit + try-finally.

### 3. *Boolean 반전 실수*
`if (x > 0)` → `if (x <= 0)` 변환에서 `<` vs `<=` 헷갈림. 테스트로 검증.

### 4. *조건 *복제*
nested guard들이 *반복 조건* 공유 — [Consolidate Conditional Expression](/blog/programming/design/refactoring-catalog/pattern36-consolidate-conditional-expression)으로 묶음.

### 5. *Always-true guard*
```javascript
if (true) return 0;   // 죽은 코드
```
디버깅 흔적.

### 6. *결과 일관성 결여*
guard들이 모두 다른 형식 반환 (`null`, `undefined`, `{}`, `0`) — 호출자가 *예외 케이스마다 다른 처리*. *통일된 표현* 사용.

## Modern variants

### Loop continue / break

```javascript
for (const x of items) {
  if (!isValid(x)) continue;   // guard
  process(x);
}
```

### Optional / Maybe

```rust
fn pay_amount(employee: &Employee) -> u32 {
    if employee.is_separated { return 0; }
    if employee.is_retired   { return 0; }
    compute_pay(employee)
}
```

Rust/Swift는 *early return 관용적*.

### Pattern matching

```kotlin
fun payAmount(employee: Employee): Pay = when {
    employee.isSeparated -> Pay(0, "SEP")
    employee.isRetired   -> Pay(0, "RET")
    else                 -> Pay(computeAmount(employee), "")
}
```

`when` (Kotlin) / `match` (Rust) — guard-style 표현식.

### Functional pipeline

filter/map 체인은 guard clause를 *암묵적*으로 표현.

```javascript
const result = items
  .filter(isValid)
  .filter(notArchived)
  .map(process);
```

## 도구 / IDE

| 도구 | 기능 |
| --- | --- |
| IntelliJ | "Replace if with guard clause" (Alt-Enter) |
| ReSharper (C#) | "Invert if statement" |
| ESLint | `no-else-return` — else 후 return 시 경고 |
| SonarLint | "Cognitive Complexity" 경고 |

## 성능 고려

early return은 *short-circuit*과 같음. 일반적으로 성능 향상 (불필요 계산 회피).

## 관련 패턴

- **자매**: [Pattern 36: Consolidate Conditional Expression](/blog/programming/design/refactoring-catalog/pattern36-consolidate-conditional-expression)
- **추출**: [Pattern 1: Extract Function](/blog/programming/design/refactoring-catalog/pattern01-extract-function)
- **분해**: [Pattern 35: Decompose Conditional](/blog/programming/design/refactoring-catalog/pattern35-decompose-conditional)
