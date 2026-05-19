---
title: "Pattern 43: Remove Flag Argument"
date: 2026-05-02T19:00:00
description: "Boolean flag는 함수의 *두 가지 모드* — 별도 함수로 분리해 의도 노출."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 43
tags: [refactoring, flag-argument, boolean-flag, fowler]
draft: true
type: book-review
bookTitle: "Refactoring: Improving the Design of Existing Code, 2nd Edition"
bookAuthor: "Martin Fowler"
---

## 한 줄 요약

> `setMode(true)` 같은 *boolean flag*는 호출 사이트에서 *true가 무엇을 의미하는지* 알 수 없다. 모드별로 함수를 분리하면 *이름이 곧 의도*.

## 동기 (Motivation)

flag argument는 한 함수가 *여러 동작*을 한다는 신호. 호출자가 `process(order, true)`를 본 순간 *true가 무엇인지* 추측해야 한다 — IDE에 hover하거나 함수 정의를 열어 보지 않으면 모름.

```javascript
// Before — flag argument
function setDimension(name, value, isHeight) {
  if (isHeight) this._height = value;
  else this._width = value;
}

// 호출
setDimension("h", 100, true);
setDimension("w", 200, false);
```

`true`/`false`만 보고는 *어떤 차원*인지 알 수 없음. 메서드 이름·신호 모두 약함.

```javascript
// After — 모드별 함수
function setHeight(value) { this._height = value; }
function setWidth(value)  { this._width  = value; }

// 호출
setHeight(100);
setWidth(200);
```

호출 사이트가 *자체 설명*. 새 차원 추가가 *새 함수* (clean).

### "Flag argument" 정의 (Fowler 엄밀히)

flag argument는 *함수의 동작 모드를 선택하는 boolean 또는 enum*. 단순 *데이터*는 flag가 아니다.

```javascript
// 데이터 — flag 아님
setAge(person, 30);

// flag — 모드 선택
process(order, true);   // true가 "express"라는 의미
```

### 신호

- 함수 호출 `func(x, true)` 또는 `func(x, false)`만 보고 *의미 모름*.
- 함수 본문이 `if (flag) ... else ...`로 *완전히 다른 두 경로*.
- 새 모드 추가가 flag *여러 개*로 폭증 (`func(x, true, false, true)`).
- 함수 이름에 모드가 안 들어감.

### 언제 적용하는가

- flag가 *모드 분기*를 표현.
- 모드별 동작이 *상당히 다름*.
- 호출 사이트의 *의도 명확화* 필요.

### 언제 적용하지 않는가

- flag가 *선택적 동작 옵션* (e.g., `fetch(url, { cache: false })`). config object의 일부.
- *내부 helper*에서 두 함수를 묶는 implementation 디테일.

## 절차 (Mechanics)

1. **각 모드별로 explicit 함수** 작성.
2. **각 모드별 함수가 본 함수의 *flag 분기 본문***을 갖게.
3. **호출처를 한 곳씩** 새 explicit 함수로 교체.
4. 모든 호출 옮겼으면 원본 함수 제거.
5. 컴파일·테스트.

## 예시 1 — Premium delivery 분기

```javascript
// Before
function deliveryDate(order, isRush) {
  if (isRush) {
    let deliveryTime;
    if (["MA", "CT"].includes(order.deliveryState)) deliveryTime = 1;
    else if (["NY", "NH"].includes(order.deliveryState)) deliveryTime = 2;
    else deliveryTime = 3;
    return addDays(order.placedOn, 1 + deliveryTime);
  } else {
    let deliveryTime;
    if (["MA", "CT", "NY"].includes(order.deliveryState)) deliveryTime = 2;
    else if (["ME", "NH"].includes(order.deliveryState)) deliveryTime = 3;
    else deliveryTime = 4;
    return addDays(order.placedOn, 2 + deliveryTime);
  }
}

// 호출
deliveryDate(order, true);
deliveryDate(order, false);
```

```javascript
// After
function rushDeliveryDate(order) {
  let deliveryTime;
  if (["MA", "CT"].includes(order.deliveryState)) deliveryTime = 1;
  else if (["NY", "NH"].includes(order.deliveryState)) deliveryTime = 2;
  else deliveryTime = 3;
  return addDays(order.placedOn, 1 + deliveryTime);
}

function regularDeliveryDate(order) {
  let deliveryTime;
  if (["MA", "CT", "NY"].includes(order.deliveryState)) deliveryTime = 2;
  else if (["ME", "NH"].includes(order.deliveryState)) deliveryTime = 3;
  else deliveryTime = 4;
  return addDays(order.placedOn, 2 + deliveryTime);
}

// 호출
rushDeliveryDate(order);
regularDeliveryDate(order);
```

호출 *의도가 명확*. 각 함수는 *한 모드 책임*.

## 예시 2 — Boolean parameter object로 대체

flag가 *진짜 옵션* (모드가 아닌 선택 사항)이라면 *config object*.

```javascript
// Before
function fetch(url, withCache, withRetry, withTimeout) { /* */ }
fetch(url, true, false, true);
```

```javascript
// After — config object
function fetch(url, { cache = true, retry = false, timeout = true } = {}) { /* */ }
fetch(url, { cache: true, retry: false, timeout: true });
fetch(url, { cache: false });   // 부분 설정 가능
```

호출 사이트가 *self-document*. flag 자체는 사라지지 않지만 *의미 명확*.

## 예시 3 — Enum / 상수로

flag가 *3개 이상의 모드*면 boolean으론 부족.

```javascript
// Before
function process(data, isUrgent, isDryRun) { /* 4 case */ }
```

```javascript
// After
const Mode = { Normal: 'normal', Urgent: 'urgent', DryRun: 'dry-run', UrgentDryRun: 'urgent-dry-run' };

function process(data, mode) { /* */ }
process(data, Mode.Urgent);
```

또는 4 case 모두 별도 함수.

## 자주 보는 안티패턴

### 1. *Flag를 명명만 변경*
```javascript
function process(data, useNewAlgorithm) { ... }
```
이름이 boolean으로 어색. *별도 함수*가 거의 항상 옳음.

### 2. *Enum 도입 후 flag 그대로*
enum으로 *명확화는 되지만 분기는 여전*. 진짜 모드별 함수가 더 나은 경우 많음.

### 3. *Config object에 boolean 가득*
config 안 boolean 5개 → *호출 사이트의 의도 여전히 흐림*. 모드별 함수 검토.

### 4. *Library 외부 API 무시*
React `setState(value, callback)`처럼 *콜백 옵션*은 flag 아님 — 데이터.

### 5. *Function overload 흉내*
일부 언어(Java, C++)는 overload 가능 — `setHeight(int)`/`setWidth(int)`로 자연.

### 6. *Internal helper 만들 때*
공통 로직을 *internal helper*로 두고 *public은 분리* — 좋은 패턴.

## Modern variants

### Method overload (Java/C#)

```java
public void setHeight(int v) { this.height = v; }
public void setWidth(int v)  { this.width = v; }
```

### Builder API

```javascript
order.delivery().rush();
order.delivery().regular();
```

체인으로 의도 표현.

### Pattern matching (Rust/Kotlin)

```rust
enum DeliveryMode { Rush, Regular }
fn delivery_date(order: &Order, mode: DeliveryMode) -> Date {
    match mode {
        DeliveryMode::Rush    => rush_delivery_date(order),
        DeliveryMode::Regular => regular_delivery_date(order),
    }
}
```

enum + match — flag 대안.

### TypeScript discriminated union

```typescript
type DeliveryRequest =
  | { mode: "rush"; order: Order }
  | { mode: "regular"; order: Order };

function deliveryDate(req: DeliveryRequest): Date {
  return req.mode === "rush" ? rushDeliveryDate(req.order) : regularDeliveryDate(req.order);
}
```

## 도구 / IDE

| 도구 | 기능 |
| --- | --- |
| IntelliJ | "Extract Method" — 모드별 분리 |
| ESLint | `no-magic-numbers` — magic boolean 감지 |
| Sonar | "Boolean flag in function signature" 규칙 |

## 성능 고려

분리해도 *비용 동일*. JIT가 어차피 인라인. 가독성 우선.

## 관련 패턴

- **자매**: [Pattern 42: Parameterize Function](/blog/programming/design/refactoring-catalog/pattern42-parameterize-function)
- **분해**: [Pattern 35: Decompose Conditional](/blog/programming/design/refactoring-catalog/pattern35-decompose-conditional)
- **객체화**: [Pattern 8: Introduce Parameter Object](/blog/programming/design/refactoring-catalog/pattern08-introduce-parameter-object)
