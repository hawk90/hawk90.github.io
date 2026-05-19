---
title: "Pattern 44: Preserve Whole Object"
date: 2026-05-02T20:00:00
description: "객체의 여러 field만 빼서 전달하지 말고 — 객체를 통째로 넘긴다."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 44
tags: [refactoring, preserve-whole-object, fowler]
draft: true
type: book-review
bookTitle: "Refactoring: Improving the Design of Existing Code, 2nd Edition"
bookAuthor: "Martin Fowler"
---

## 한 줄 요약

> 한 객체에서 *여러 값을 빼서* 함수에 넘기고 있다면 — 객체 자체를 넘긴다. signature 단순화, 의존 표현 정직.

## 동기 (Motivation)

`process(person.age, person.height, person.weight)` 같은 호출은 *세 값을 따로 받지만 결국 한 person*. 다음 문제.

- *Signature 폭증* — person에 field 추가 시 시그니처도 변경.
- *호출 사이트 장황* — 세 줄로 같은 정보 전달.
- *결합 위장* — 함수는 person을 알지만 *"세 field만 알아"*라고 가장.

```javascript
// Before
function isInRange(low, high, value) {
  return value >= low && value <= high;
}

// 호출
const within = isInRange(room.daysTempRange.low, room.daysTempRange.high, room.currentTemp);
```

`room.daysTempRange.low/high`를 따로 빼서 넘김. tempRange 객체가 *이미 있는데* 분해.

```javascript
// After
function withinRange(room) {
  return room.currentTemp >= room.daysTempRange.low
      && room.currentTemp <= room.daysTempRange.high;
}

// 호출
const within = withinRange(room);
```

호출이 깔끔. 새 condition 추가 시 *호출 사이트 변경 없음*.

### 신호

- 함수가 *같은 객체의 여러 field*를 매개변수로 받음.
- 새 field 사용 시 *호출 사이트 줄줄이 수정*.
- 동일 객체에서 *여러 값을 추출하는 호출* 코드 반복.
- 함수가 받은 값을 *임시 변수로만 잠시 쓰고 마무리*.

### 언제 적용하는가

- 같은 객체에서 *2개 이상의 field*를 빼냄.
- 함수가 그 객체의 *다른 method*를 호출할 수 있을 만큼 가까움.
- *signature 안정성*이 가치 있음.

### 언제 적용하지 않는가

- 함수가 *객체에 의존하면 안 됨* (utility function, reuse 위해).
- 객체 *전체 의존이 의도된 단점* (좁은 surface 유지).
- 테스트에서 *mock 부담* 증가.

변환 구조를 한눈에 보면 다음과 같다.

![Pattern 44 — before/after 구조](/images/blog/refactoring-catalog/diagrams/pattern44-preserve-whole-object.svg)

## 절차 (Mechanics)

1. **새 매개변수**(객체)를 받는 함수 작성. 본문에서 *기존 매개변수를 객체에서 추출*.
2. **호출처 한 곳씩** 새 시그니처로 교체.
3. 모든 호출 옮겼으면 *기존 매개변수 제거*.
4. 컴파일·테스트.

## 예시 1 — 위 isInRange

참고.

## 예시 2 — 메서드 안 method 이동

```javascript
// Before
class Heating {
  highTemp() { return 25; }
  lowTemp()  { return 18; }
  alerts(room) {
    const high = this.highTemp();
    const low  = this.lowTemp();
    if (!room.daysTempRange.includes(low, high)) return ["temp out of range"];
    return [];
  }
}

// TempRange
class TempRange {
  constructor(low, high) { this._low = low; this._high = high; }
  get low()  { return this._low; }
  get high() { return this._high; }
  includes(otherLow, otherHigh) {
    return this._low <= otherLow && this._high >= otherHigh;
  }
}
```

`includes(low, high)`가 *두 값 받음*. `TempRange`를 받으면 자연.

```javascript
// After
class TempRange {
  constructor(low, high) { this._low = low; this._high = high; }
  get low()  { return this._low; }
  get high() { return this._high; }
  includes(other) {
    return this._low <= other.low && this._high >= other.high;
  }
}

class Heating {
  alerts(room) {
    const targetRange = new TempRange(this.lowTemp(), this.highTemp());
    if (!room.daysTempRange.includes(targetRange)) return ["temp out of range"];
    return [];
  }
}
```

`includes`가 *TempRange*만 알면 충분. signature 안정.

## 예시 3 — 데이터 + 메서드 노출

```javascript
// Before
function calculateOrderSummary(order) {
  return generateSummary(
    order.id,
    order.customerName,
    order.totalAmount(),
    order.itemCount()
  );
}

function generateSummary(id, name, total, count) {
  return `Order ${id} for ${name}: ${count} items, $${total}`;
}
```

```javascript
// After
function calculateOrderSummary(order) {
  return generateSummary(order);
}

function generateSummary(order) {
  return `Order ${order.id} for ${order.customerName}: ${order.itemCount()} items, $${order.totalAmount()}`;
}
```

`generateSummary`가 *order 도메인을 안다는 것을 솔직히 인정*. 새 field 추가 가벼움.

## 자주 보는 안티패턴

### 1. *Utility function*에 객체 강요
`isInRange(low, high, value)` 같은 *generic utility*는 *값을 받는 게 옳다* — 어떤 객체와도 동작.

### 2. *Mock 폭증*
테스트에서 객체 전체를 mock해야 — *큰 객체*면 *부담*. 그럼 *값을 받는 것이 더 testable*.

### 3. *부분 객체 전달*
객체 전체가 아닌 *반만* — 어차피 일관성 약함. *진짜 객체 분리* ([Pattern 16: Extract Class](/blog/programming/design/refactoring-catalog/pattern16-extract-class)).

### 4. *순환 의존*
A가 B 객체를 전달받고, B가 A 메서드를 호출 — *양방향 의존*. 위험.

### 5. *Anemic argument*
객체를 전달받았는데 *getter만 호출*하면 사실상 값 전달과 같음. *객체의 메서드 활용*까지 가야 의미.

### 6. *Encapsulation 깨기*
객체 내부 *private state에 접근*해서 사용하면 캡슐화 위반. public API만.

## Modern variants

### Method chaining

```javascript
room.alerts().tempOutOfRange(targetRange);
```

객체 자신의 *method 호출* — *preserve whole = self*.

### "Tell, Don't Ask"

객체에 묻고 답을 계산하지 말고, *직접 명령*. preserve whole의 한 형태.

### Rust — borrow

```rust
fn within_range(room: &Room) -> bool {
    room.current_temp >= room.days_temp_range.low
        && room.current_temp <= room.days_temp_range.high
}
```

`&Room`으로 객체 borrow.

### Destructuring (JS/TS)

```typescript
function alerts({ daysTempRange, currentTemp }: Room) {
  // 객체 받지만 destructure로 명시
}
```

객체 전달 + *함수 본문에서 필요한 부분만 명시*.

## 도구 / IDE

| 도구 | 기능 |
| --- | --- |
| IntelliJ | "Replace parameters with object" |
| Rider | "Convert parameter type" |
| ESLint | 일부 plugin이 *parameter 수 한계*로 trigger |

## 성능 고려

객체 전달은 *reference 한 개* — 값 여러 개보다 *적은 stack 사용*. JS는 동일.

JS의 *destructuring*은 약간의 overhead. 보통 무시.

## 관련 패턴

- **자매**: [Pattern 8: Introduce Parameter Object](/blog/programming/design/refactoring-catalog/pattern08-introduce-parameter-object)
- **반대 (객체 → 값)**: [Pattern 45: Replace Parameter with Query](/blog/programming/design/refactoring-catalog/pattern45-replace-parameter-with-query)
- **이동**: [Pattern 21: Move Function](/blog/programming/design/refactoring-catalog/pattern21-move-function) — 객체에 가까운 곳으로
