---
title: "Pattern 8: Introduce Parameter Object"
date: 2026-05-02T08:00:00
description: "여러 인자가 함께 다니면 객체로 묶어 잠재 도메인 객체를 표면화한다."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 8
tags: [refactoring, parameter-object, data-clump, fowler]
draft: true
type: book-review
bookTitle: "Refactoring: Improving the Design of Existing Code, 2nd Edition"
bookAuthor: "Martin Fowler"
---

## 한 줄 요약

> 같은 매개변수 그룹이 여러 함수에 함께 다닌다면, 그것은 잠재된 *도메인 객체*다.

## 동기 (Motivation)

`start, end` 두 매개변수가 여러 함수에 *함께 다니는 패턴*을 Fowler는 **data clump** (데이터 뭉치)라 부른다. 이는 *아직 만들어지지 않은 객체*의 신호다. 객체로 묶으면 다음 일들이 자연스러워진다.

1. **시그니처 단순화** — 함수 매개변수가 3-5개 → 1-2개로 줄어든다.
2. **순서 실수 차단** — 같은 타입 매개변수 두 개의 순서 바뀜이 사라진다.
3. **관련 동작이 모임** — `range.contains(x)`, `range.overlap(other)` 같은 자연스러운 메서드가 *객체 안*에 모인다.
4. **도메인 언어 발견** — "DateRange", "Money", "Coordinates" 같은 *도메인 용어*가 코드에 자리잡는다.

도메인 주도 설계(DDD)의 *value object* 발견 과정과 같다.

### 신호 — Data Clump 감별

- 3개 이상 매개변수가 *함께 다닌다*.
- 같은 그룹이 *여러 함수*에서 반복된다.
- 그 그룹에 *자연스러운 연산*이 있다 (range의 contains, point의 distance).
- 한 매개변수만 따로 쓰면 *의미가 어색*하다 (start만 있고 end가 없으면?).
- 호출자가 *항상 함께 변수에 담아* 함수를 호출한다.

### 언제 적용하는가

- 같은 매개변수 3개 이상이 *2-3개 함수*에서 반복.
- 매개변수 그룹에 *불변식*이 있다 (`start <= end`).
- 그 그룹이 *도메인 개념*을 가진다.

## 절차 (Mechanics)

1. *데이터 클래스* (또는 record, struct)를 만든다. 처음에는 단순 record로.
2. 변경할 함수를 [Change Function Declaration](/blog/programming/design/refactoring-catalog/pattern05-change-function-declaration)로 새 매개변수에 추가한다 (옛 매개변수도 잠시 유지).
3. 호출처를 *한 곳씩* 새 객체로 옮긴다 — 호출처마다 테스트.
4. 옛 매개변수를 제거한다.
5. 자연스러운 동작이 보이면 함수를 객체로 이동 ([Move Function](/blog/programming/design/refactoring-catalog/pattern21-move-function)).
6. 객체에 *값 의미*가 생기면 [Replace Primitive with Object](/blog/programming/design/refactoring-catalog/pattern14-replace-primitive-with-object)로 진화.

## 예시 1 — 단순 record 시작

```javascript
// Before — start/end가 여러 함수에 다님
function amountInvoiced(startDate, endDate) { /* ... */ }
function amountReceived(startDate, endDate) { /* ... */ }
function amountOverdue(startDate, endDate)  { /* ... */ }
```

```javascript
// After — DateRange record
class DateRange {
  constructor(start, end) {
    this._start = start;
    this._end = end;
  }
  get start() { return this._start; }
  get end()   { return this._end; }
}

function amountInvoiced(dateRange) { /* ... */ }
function amountReceived(dateRange) { /* ... */ }
function amountOverdue(dateRange)  { /* ... */ }
```

호출처:

```javascript
// Before
const inv = amountInvoiced(start, end);

// After
const inv = amountInvoiced(new DateRange(start, end));
```

이 단계만 해도 시그니처가 단순해지고 *순서 바뀜*이 사라진다.

## 예시 2 — 도메인 메서드 발견

객체로 묶고 나면 *자연스러운 연산*이 보인다.

```javascript
// 호출처들에서 자주 반복되는 패턴
if (date >= startDate && date <= endDate) { /* ... */ }
```

이걸 `DateRange.contains(date)`로 이동.

```javascript
class DateRange {
  // ... 위의 것 ...
  contains(date) { return date >= this._start && date <= this._end; }
  overlapsWith(other) {
    return !(this._end < other._start || other._end < this._start);
  }
  durationDays() {
    return Math.round((this._end - this._start) / 86400000);
  }
}
```

도메인 언어 — `contains`, `overlapsWith`, `durationDays` — 가 *클래스 안에 모인다*. 호출자에서 흩어진 if 문이 한 줄로 줄어든다.

```javascript
// Before
if (date >= range.start && date <= range.end) { /* ... */ }

// After
if (range.contains(date)) { /* ... */ }
```

## 예시 3 — Money value object

```javascript
// Before
function add(amount1, currency1, amount2, currency2) {
  if (currency1 !== currency2) throw new Error("currency mismatch");
  return { amount: amount1 + amount2, currency: currency1 };
}
```

매개변수 4개. 한 쌍이 한 *Money*인데.

```javascript
// After
class Money {
  constructor(amount, currency) {
    this._amount = amount;
    this._currency = currency;
  }
  get amount()   { return this._amount; }
  get currency() { return this._currency; }
  add(other) {
    if (this._currency !== other._currency) throw new Error("currency mismatch");
    return new Money(this._amount + other._amount, this._currency);
  }
  multiply(scalar) { return new Money(this._amount * scalar, this._currency); }
  equals(other)    { return this._amount === other._amount && this._currency === other._currency; }
}

// 호출
const total = price.add(tax).multiply(1.05);
```

`add`가 객체 메서드가 되어 *자기 자신을 입력*으로 받는다. 이게 [Replace Primitive with Object](/blog/programming/design/refactoring-catalog/pattern14-replace-primitive-with-object)의 자연스러운 결과.

## 자주 보는 안티패턴

### 1. 객체 안에 *동작이 영원히 없음*
record로 시작해서 *언제까지나 단순 데이터 그릇*이면 OK 그러나 가치 절반만 얻은 것. 시간이 지나며 자연스러운 연산을 찾아 메서드로 이동.

### 2. 객체 이름이 너무 일반적
`Pair`, `Args`, `Params` — 도메인 의미를 못 담는다. `DateRange`, `Money`, `Coordinate` 같은 *영역 단어*로.

### 3. 한 번에 *너무 많은* 함수 변경
시그니처 변경을 *모든 함수*에 동시 적용하면 회귀 추적 불가. *한 함수, 한 호출자씩*.

### 4. 매개변수 객체에 *너무 많이 채움*
"이것도 같이 가니까" 식으로 *관련 없는 필드*까지 묶으면 god object. 도메인 응집이 명확한 것만.

### 5. Mutable parameter object
객체를 mutable로 두면 *공유 상태 버그*. immutable로 — Java record, TS readonly, Rust struct.

### 6. 값 비교가 reference equality
```javascript
const a = new Money(100, "USD");
const b = new Money(100, "USD");
a === b;  // false — reference 비교
a.equals(b);  // true — 명시적
```
객체화 시 `equals` 또는 `===` 오버로딩(Java) 또는 데이터 클래스(Kotlin)로 *값 동등*을 명시.

## Modern variants

### Destructuring으로 객체화 부담 최소화

```javascript
// 객체 도입 비용 최소화
function amountInvoiced({ start, end }) { /* ... */ }
amountInvoiced({ start, end });
```

키워드 인자처럼 사용. 작은 단계로 시작.

### Kotlin / Scala data class

```kotlin
data class DateRange(val start: LocalDate, val end: LocalDate) {
    fun contains(date: LocalDate) = date in start..end
}
```

`equals`, `hashCode`, `toString`, `copy` 자동 생성.

### Rust struct

```rust
struct DateRange { start: Date, end: Date }

impl DateRange {
    fn contains(&self, d: Date) -> bool { d >= self.start && d <= self.end }
}
```

### TypeScript Interface vs Class
*구조 정의만* 필요하면 interface, *메서드 포함*이면 class.

```typescript
interface DateRangeData { start: Date; end: Date; }     // 데이터
class DateRange implements DateRangeData {              // + 동작
  constructor(public start: Date, public end: Date) {}
  contains(d: Date) { return d >= this.start && d <= this.end; }
}
```

## 도구 / IDE

| 도구 | 기능 |
| --- | --- |
| IntelliJ | "Introduce Parameter Object" refactoring |
| Rider | Ctrl-R, O |
| Eclipse | "Introduce Parameter Object" |
| VS Code | 수동 (TypeScript code action 일부) |

## 성능 고려

객체 할당 비용이 추가될 수 있다. JIT의 escape analysis가 *스택 할당*으로 최적화하지만 항상 그렇진 않다. Hot path라면 측정.

다만 *값 객체* 패턴은 보통 *cache locality 향상* (관련 데이터가 한 곳에) 효과로 상쇄.

## 결과 정리

- 호출 시그니처 단순
- 매개변수 *순서 실수* 차단
- 도메인 응집이 객체로 모임
- 새 동작(`overlap`, `iterate days`) 추가 자연스러움
- 테스트 — 객체 단위로 작성하기 쉬움
- 직렬화·로깅 — 객체 단위로 통일

## 관련 패턴

- **시그니처 변경**: [Pattern 5: Change Function Declaration](/blog/programming/design/refactoring-catalog/pattern05-change-function-declaration)
- **함수 이동**: [Pattern 21: Move Function](/blog/programming/design/refactoring-catalog/pattern21-move-function)
- **값 객체 승격**: [Pattern 14: Replace Primitive with Object](/blog/programming/design/refactoring-catalog/pattern14-replace-primitive-with-object)
- **자매**: [Pattern 9: Combine Functions into Class](/blog/programming/design/refactoring-catalog/pattern09-combine-functions-into-class)
- **전체 객체 보존**: [Pattern 44: Preserve Whole Object](/blog/programming/design/refactoring-catalog/pattern44-preserve-whole-object)
