---
title: "Pattern 5: Change Function Declaration"
date: 2026-05-02T05:00:00
description: "함수 이름과 매개변수를 안전하게 바꾼다 — Rename Method + Add/Remove Parameter 통합."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 5
tags: [refactoring, function-declaration, rename, fowler]
draft: true
type: book-review
bookTitle: "Refactoring: Improving the Design of Existing Code, 2nd Edition"
bookAuthor: "Martin Fowler"
---

## 한 줄 요약

> 함수 시그니처는 사용자와의 *계약*이다. 계약 변경은 단계적·안전하게.

## 동기 (Motivation)

함수 이름은 그 함수가 *무엇을 하는지* 알리는 가장 강력한 단서다. 이름이 의도를 담지 못하면 사용자는 매번 본문을 봐야 한다. 매개변수도 같다 — 너무 많거나, 결합도가 높거나, 잘못된 경계에 놓여 있으면 계약 자체가 잘못이다.

이 리팩터링은 *이름 변경*과 *매개변수 변경*을 같은 도구로 묶는다 (1판에서는 Rename Method, Add Parameter, Remove Parameter, Parameterize Method가 모두 별도였다). 둘 다 *시그니처*를 건드린다는 공통점 때문.

### 좋은 이름을 찾는 법

Fowler의 추천 — *코드를 다른 사람에게 설명*해 본다. 그가 묻는 첫 질문이 *함수가 무엇인지*라면, 그 질문에 답하는 한 단어 또는 한 구가 좋은 이름이다.

너무 어렵다면 dummy comment를 본문 위에 적고 — 그 comment를 *동사 + 명사*로 줄여 본다. `// computes the total price including tax` → `totalPriceWithTax`.

### 매개변수 변경의 신호

- *boolean flag*가 분기를 결정한다 → [Remove Flag Argument](/blog/programming/design/refactoring-catalog/pattern43-remove-flag-argument)
- 같은 그룹이 여러 함수에 함께 다닌다 → [Introduce Parameter Object](/blog/programming/design/refactoring-catalog/pattern08-introduce-parameter-object)
- *사용되지 않는* 매개변수가 있다 → 제거
- 매개변수 일부가 *호출자가 이미 가진 객체*로부터 계산된다 → [Preserve Whole Object](/blog/programming/design/refactoring-catalog/pattern44-preserve-whole-object)
- 매개변수가 *항상 같은 식으로 계산*된다 → [Replace Parameter with Query](/blog/programming/design/refactoring-catalog/pattern45-replace-parameter-with-query)

변환 구조를 한눈에 보면 다음과 같다.

![Pattern 5 — before/after 구조](/images/blog/refactoring-catalog/diagrams/pattern05-change-function-declaration.svg)

## 절차 (Mechanics)

규모에 따라 두 가지.

### Simple Mechanics — 변경이 작고 호출처가 적을 때

1. 매개변수 변경이라면 함수 본문에서 *바꿀 매개변수*가 잘 추출 가능한지 검토.
2. 함수 선언을 바꾼다.
3. 모든 호출처를 새 선언에 맞게 수정.
4. 컴파일·테스트.

내부 모듈, private 함수, 호출처가 한 자리에 모여 있는 코드에 적합.

### Migration Mechanics — 호출처가 많거나 공개 API일 때

1. 본문을 추출해 *임시 함수*에 둔다.
2. *새 시그니처*의 새 함수를 만들고 본문은 임시 함수로 위임.
3. 옛 함수를 *deprecated*로 표시.
4. 호출처를 *한 곳씩* 새 함수로 옮긴다.
5. 모든 호출처가 옮겨지면 옛 함수와 임시 함수를 정리.

라이브러리 공개 API, 다른 팀이 쓰는 함수, 외부 클라이언트가 있는 함수에 필수. 한 번에 깨면 *모든 사용자가 깨진다*.

## 예시 1 — 이름이 의도를 담도록

```javascript
// Before — "circum"이 모호
function circum(radius) {
  return 2 * Math.PI * radius;
}
```

```javascript
// After
function circumference(radius) {
  return 2 * Math.PI * radius;
}
```

너무 사소해 보이지만 호출자에서 `circumference(r)`이 *수학적 의미*를 즉시 전달한다. 약어는 *반드시 통용되는 것*만.

## 예시 2 — 매개변수 추가 (Simple)

내부 함수에 *상태 표시* 매개변수를 추가.

```javascript
// Before
function addReservation(customer) {
  this._reservations.push(customer);
}
```

```javascript
// After
function addReservation(customer, isPriority) {
  if (isPriority) this._reservations.unshift(customer);
  else this._reservations.push(customer);
}
```

호출처가 적으면 한 번에 변경. 단 boolean flag는 [Remove Flag Argument](/blog/programming/design/refactoring-catalog/pattern43-remove-flag-argument)를 적용해 두 함수로 분리하는 게 더 좋다.

```javascript
// Better
function addReservation(customer)         { this._reservations.push(customer); }
function addPriorityReservation(customer) { this._reservations.unshift(customer); }
```

## 예시 3 — Migration 방식 (공개 API)

라이브러리가 `addReservation(customer)`를 공개했고 외부 호출자가 많다고 가정.

### 단계 1 — 본문 추출

```javascript
function addReservation(customer) {
  return zz_addReservation(customer);
}
function zz_addReservation(customer) {
  this._reservations.push(customer);
}
```

### 단계 2 — 새 시그니처 함수

```javascript
function addReservation(customer)         { return zz_addReservation(customer, false); }
function addPriorityReservation(customer) { return zz_addReservation(customer, true); }
function zz_addReservation(customer, isPriority) {
  if (isPriority) this._reservations.unshift(customer);
  else this._reservations.push(customer);
}
```

### 단계 3 — 옛 함수 deprecated

```javascript
/** @deprecated use addPriorityReservation */
function addReservationPriority(customer) {
  console.warn("deprecated");
  return addPriorityReservation(customer);
}
```

### 단계 4 — 호출처 마이그레이션 후 정리

모든 호출자가 새 API로 옮겨지면 임시 함수와 deprecated 함수를 제거.

## 자주 보는 안티패턴

### 1. 한 번에 모든 호출자 깨기
공개 API를 한 번에 바꾸면 *모든 사용자*가 동시에 깨진다. Semantic versioning이 깨지고 신뢰가 무너진다. 반드시 Migration.

### 2. IDE 안 쓰기
`grep`이나 손으로 호출처 찾기는 *누락*을 부른다. 정적 타입 언어에선 컴파일러가 잡아주지만, 동적 언어는 IDE의 *symbol search* + grep 보조.

### 3. 매개변수 *순서* 변경
같은 type의 매개변수 순서를 바꾸면 컴파일러가 못 잡는다. *반드시* Migration + deprecated.

```javascript
// Bad — 갑자기 순서 바꿈
function transfer(from, to, amount);  // before
function transfer(amount, from, to);  // after — 모든 호출처가 깨지지만 컴파일은 통과
```

### 4. 이름을 *유의어로* 바꾸기만
`get` → `fetch`, `compute` → `calculate` — 의미가 같다면 *바꾸지 마라*. rename은 *의도가 정말 달라질 때*만.

### 5. 한 번에 너무 많은 매개변수 변경
이름 변경 + 매개변수 추가 + 순서 변경을 *한 번에* 하면 어떤 변화가 어떤 회귀를 유발했는지 추적 불가. *한 변화씩*.

### 6. 임시 함수 이름이 영구화
Migration 중 만든 `zz_addReservation` 같은 임시 이름이 정리 안 돼 *영구 남는* 경우. *작업 끝낸다*는 원칙.

## Modern variants

### Backwards-compatible parameter — optional / default
JavaScript, Python, TypeScript는 기본값으로 호환 유지.

```javascript
function addReservation(customer, isPriority = false) { /* ... */ }
```

기존 호출자는 한 인자만 넘기면 OK. 단 boolean flag는 여전히 분리가 좋다.

### Builder / Fluent API
매개변수가 많아 시그니처가 길어지면 builder 패턴이 더 명확.

```javascript
new ReservationBuilder()
  .customer(customer)
  .priority(true)
  .build();
```

### Object parameter (named arguments)
Python의 keyword arguments, JS의 destructuring으로 *순서 무관*.

```javascript
function transfer({ from, to, amount, currency = "USD" }) { /* ... */ }
transfer({ amount: 100, from: alice, to: bob });
```

순서 실수가 사라진다.

## 도구 / IDE

| 도구 | 기능 |
| --- | --- |
| IntelliJ | F6 (rename), Cmd-F6 (change signature) |
| VS Code | F2 (rename symbol), refactoring extension의 "Change signature" |
| Rider | F2 / Ctrl-R, S |
| Rust Analyzer | rename symbol |

IDE의 *change signature*가 매개변수 추가·제거·순서 변경을 *모든 호출처에 반영*한다. 안전성 최고.

## 성능 고려

호출 자체 비용은 무관. 매개변수 객체화([Introduce Parameter Object](/blog/programming/design/refactoring-catalog/pattern08-introduce-parameter-object)) 시 *객체 할당 비용*이 추가될 수 있지만, JIT이 escape analysis로 보통 제거.

## 관련 패턴

- **매개변수 묶기**: [Pattern 8: Introduce Parameter Object](/blog/programming/design/refactoring-catalog/pattern08-introduce-parameter-object)
- **매개변수 정리**: [Pattern 43: Remove Flag Argument](/blog/programming/design/refactoring-catalog/pattern43-remove-flag-argument), [Pattern 44: Preserve Whole Object](/blog/programming/design/refactoring-catalog/pattern44-preserve-whole-object)
- **사용 안 하는 매개변수 제거**: [Pattern 45: Replace Parameter with Query](/blog/programming/design/refactoring-catalog/pattern45-replace-parameter-with-query)
- **변수 이름 변경**: [Pattern 7: Rename Variable](/blog/programming/design/refactoring-catalog/pattern07-rename-variable)
- **필드 이름 변경**: [Pattern 31: Rename Field](/blog/programming/design/refactoring-catalog/pattern31-rename-field)
