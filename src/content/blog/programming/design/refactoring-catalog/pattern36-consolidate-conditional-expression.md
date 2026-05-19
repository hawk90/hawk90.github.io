---
title: "Pattern 36: Consolidate Conditional Expression"
date: 2026-05-02T12:00:00
description: "여러 조건이 같은 결과를 낸다면 — 하나로 묶어 의도를 드러낸다."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 36
tags: [refactoring, conditional, consolidate, fowler]
draft: true
type: book-review
bookTitle: "Refactoring: Improving the Design of Existing Code, 2nd Edition"
bookAuthor: "Martin Fowler"
---

## 한 줄 요약

> 여러 if 문이 *같은 결과*를 낸다면, `||`/`&&`로 묶고 가능하면 named function으로 — *공통 의미*를 한 줄로.

## 동기 (Motivation)

[Decompose Conditional](/blog/programming/design/refactoring-catalog/pattern35-decompose-conditional)의 *역방향*이자 동반자. 같은 결과를 내는 조건문이 여러 개 *흩어져 있으면*, 코드를 읽는 사람은 *"이 셋이 같은 이유로 같은 결과를 내는구나"*를 직접 인식해야 한다. 명시적으로 묶으면 *그 공통 이유*가 함수 이름으로 굳어진다.

```javascript
// Before
function disabilityAmount(employee) {
  if (employee.seniority < 2) return 0;
  if (employee.monthsDisabled > 12) return 0;
  if (employee.isPartTime) return 0;
  // ... 계산 ...
}
```

세 조건 모두 *"disability 자격이 없다"*는 같은 의미인데, 코드 상으로는 *세 개의 독립 분기*처럼 보인다.

```javascript
// After
function disabilityAmount(employee) {
  if (isNotEligibleForDisability(employee)) return 0;
  // ... 계산 ...
}

function isNotEligibleForDisability(employee) {
  return employee.seniority < 2
      || employee.monthsDisabled > 12
      || employee.isPartTime;
}
```

*공통 의미*가 함수 이름이 된다. 비즈니스 규칙이 *한 곳*에 모인다.

### 신호

- 연속된 `if`가 *모두 같은 값 반환* (또는 같은 명령 실행).
- 같은 변수에 같은 값 할당.
- if 본문이 *한 줄짜리 return*.
- 비즈니스 규칙이 *분기로 흩어져* 도메인 모델에서 약하게 보임.

### 언제 적용하는가

- 여러 분기의 *결과가 동일*.
- 조건들이 *논리적으로 한 그룹* (e.g., "자격 없음 조건").
- *named function*으로 추출하면 도메인 의미가 강해짐.

### 언제 적용하지 않는가

- 조건들이 *독립적*이고 한 가지 결과는 *우연의 일치*.
- 조건 *순서*가 의미 (e.g., 짧은 조건 먼저 평가로 성능 최적화) — 측정 후 결정.

## 절차 (Mechanics)

1. *모든 조건에 side effect 없음* 확인.
2. 첫 두 조건을 *boolean 연산자*(`||`/`&&`)로 묶음.
3. 컴파일·테스트.
4. 나머지 조건도 묶음.
5. 합쳐진 조건이 충분히 복잡하면 [Extract Function](/blog/programming/design/refactoring-catalog/pattern01-extract-function).

## 예시 1 — OR 통합

```javascript
// Before
function disabilityAmount(employee) {
  if (employee.seniority < 2) return 0;
  if (employee.monthsDisabled > 12) return 0;
  if (employee.isPartTime) return 0;
  return computeDisability(employee);
}
```

```javascript
// After
function disabilityAmount(employee) {
  if (isNotEligibleForDisability(employee)) return 0;
  return computeDisability(employee);
}

function isNotEligibleForDisability(employee) {
  return employee.seniority < 2
      || employee.monthsDisabled > 12
      || employee.isPartTime;
}
```

## 예시 2 — AND 통합

여러 *연속된 nested if*가 같은 결과를 낼 때.

```javascript
// Before
if (record.isActive) {
  if (record.balance > 0) {
    if (!record.isFrozen) {
      process(record);
    }
  }
}
```

```javascript
// After
if (record.isActive && record.balance > 0 && !record.isFrozen) {
  process(record);
}

// 또는 한 단계 더
if (canProcess(record)) {
  process(record);
}

function canProcess(record) {
  return record.isActive && record.balance > 0 && !record.isFrozen;
}
```

## 예시 3 — 혼합 (OR + AND)

```javascript
// Before
function shouldShowWarning(transaction) {
  if (transaction.amount > 10000) return true;
  if (transaction.fromCountry !== "domestic" && transaction.amount > 5000) return true;
  if (transaction.userIsNew && transaction.amount > 1000) return true;
  return false;
}
```

```javascript
// After
function shouldShowWarning(transaction) {
  return isHighAmount(transaction)
      || isInternationalAndModerate(transaction)
      || isNewUserAndNontrivial(transaction);
}

function isHighAmount(t)               { return t.amount > 10000; }
function isInternationalAndModerate(t) { return t.fromCountry !== "domestic" && t.amount > 5000; }
function isNewUserAndNontrivial(t)     { return t.userIsNew && t.amount > 1000; }
```

세 가지 *경고 조건*이 도메인 용어로 표현. 새 조건 추가/제거가 한 자리에서.

## 자주 보는 안티패턴

### 1. *Side effect* 있는 조건 통합
```javascript
if (logAndCheck()) ...   // ← log를 한 번만 호출하려는 의도
if (otherCheck()) ...
```
OR로 묶으면 *short-circuit*에 따라 호출 횟수 변경. side effect 분리 후 통합.

### 2. *Performance-critical* 짧은 조건 우선
```javascript
if (rare_but_cheap_check()) return early;
if (expensive_check()) return early;
```
OR 통합으로 *expensive_check* 항상 평가 시 성능 저하. 측정.

### 3. *Different 결과*인데 우연히 같이 보임
세 분기의 결과가 *지금은 같지만* 의미가 다를 수 있음 — 통합하면 *향후 변경* 어려움.

### 4. *함수 이름 부적절*
`condition()`, `check1()` — 이름이 의미 없으면 통합 효과 없음. 도메인 용어.

### 5. *너무 긴 합성 조건*
한 줄에 `&&`/`||`가 5개 이상이면 *읽기 어려움*. 2단계 decompose.

### 6. *De Morgan 오용*
`!(a && b)`을 `!a && !b`로 잘못 변환. 정확히 `!a || !b`.

## Modern variants

### Array `.some` / `.every`

```javascript
function isNotEligible(employee) {
  return [
    employee.seniority < 2,
    employee.monthsDisabled > 12,
    employee.isPartTime
  ].some(Boolean);
}
```

조건 목록을 *데이터*로. 동적 조건 추가에 유연.

### Rules engine

조건이 많고 *비즈니스 규칙*이 빈번히 바뀌면 *규칙 엔진* (json-rules-engine, Drools, OpenL Tablets) — 코드 외부로.

### Pattern matching (Rust/Kotlin)

```rust
match employee {
    Employee { seniority, .. } if *seniority < 2 => 0,
    Employee { months_disabled, .. } if *months_disabled > 12 => 0,
    Employee { is_part_time: true, .. } => 0,
    _ => compute_disability(employee),
}
```

guard syntax로 비슷한 효과.

## 도구 / IDE

| 도구 | 기능 |
| --- | --- |
| IntelliJ | "Merge sequential if's" |
| ESLint | `no-lonely-if`, `prefer-const` |
| SonarLint | "Cognitive Complexity" 경고로 통합 trigger |

## 성능 고려

OR/AND short-circuit으로 *불필요한 평가 회피*. 일반적으로 무관.

## 관련 패턴

- **역방향**: [Pattern 35: Decompose Conditional](/blog/programming/design/refactoring-catalog/pattern35-decompose-conditional)
- **다음**: [Pattern 1: Extract Function](/blog/programming/design/refactoring-catalog/pattern01-extract-function)
- **자매**: [Pattern 37: Replace Nested Conditional with Guard Clauses](/blog/programming/design/refactoring-catalog/pattern37-replace-nested-conditional-with-guard-clauses)
