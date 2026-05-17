---
title: "Pattern 39: Introduce Special Case"
date: 2026-06-02T15:00:00
description: "Null·missing·unknown 처리를 special case object로 — caller가 분기에서 해방."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 39
tags: [refactoring, special-case, null-object, fowler]
draft: true
type: book-review
bookTitle: "Refactoring: Improving the Design of Existing Code, 2nd Edition"
bookAuthor: "Martin Fowler"
---

## 한 줄 요약

> 같은 *특별 case 체크*가 여러 곳에 반복된다면, 그 case를 *전용 객체*로 만들고 호출자가 분기하지 않게.

## 동기 (Motivation)

null check, "unknown" check, "default" check — 같은 검사가 *호출자마다* 반복되면, 그 검사 자체가 도메인 모델에 없는 *우연*이 된다.

```javascript
// Before — null check 흩어짐
function getName(customer) {
  return customer == null ? "occupant" : customer.name;
}
function getBillingPlan(customer) {
  return customer == null ? defaultPlan() : customer.billingPlan;
}
function getPaymentHistory(customer) {
  return customer == null ? newEmptyPaymentHistory() : customer.paymentHistory;
}
```

`customer == null` 분기가 *모든 메서드*. 새 메서드 추가 시 null check도 *함께 추가*해야 함.

**Special Case Object** (Null Object의 일반화): "unknown customer"를 *진짜 객체*로 표현. 모든 메서드가 *기본 응답*을 직접 반환.

```javascript
// After — UnknownCustomer
class UnknownCustomer {
  get isUnknown() { return true; }
  get name() { return "occupant"; }
  get billingPlan() { return registry["billingPlans"].basic; }
  get paymentHistory() { return new NullPaymentHistory(); }
}

function getName(customer)           { return customer.name; }
function getBillingPlan(customer)    { return customer.billingPlan; }
function getPaymentHistory(customer) { return customer.paymentHistory; }
```

호출자는 *분기 없음*. unknown인지 확인이 필요한 곳만 `customer.isUnknown` 체크.

### 신호

- 같은 *null/default check*가 여러 곳.
- "missing" / "unknown" / "default"를 표현하는 *언어 관용 표현이 부재*.
- *주석으로 case 설명* — "// if customer is null, use default".
- 새 메서드 추가 시 *null 처리도 함께* 추가해야 함.

### 언제 적용하는가

- special case가 *모델의 일급 개념*이어야 함.
- null check가 *3곳 이상*에 같은 패턴.
- 도메인이 *기본 동작*을 명확히 정의 (e.g., "unknown customer는 occupant라 부른다").

### 언제 적용하지 않는가

- special case가 *single point*에만 등장.
- *진짜 null* (오류, 못 찾음)이라 *호출자가 인식*해야 함.
- 단순한 *Optional/Maybe*로 충분 (단일 호출자).

## 절차 (Mechanics)

1. **현재 customer 객체의 인터페이스** 파악.
2. **special case class**를 만들어 같은 인터페이스 구현 — 모든 메서드가 *기본 응답* 반환.
3. **isUnknown** 등 *case 식별 query* 추가.
4. **factory**가 *적절한 인스턴스* 반환 (정상이면 Customer, 없으면 UnknownCustomer).
5. **호출처에서 null check 제거**, 일반 메서드 호출로 전환.
6. 컴파일·테스트.

## 예시 1 — Customer / UnknownCustomer

위 예 참고.

## 예시 2 — Null Object의 가장 단순 케이스

```javascript
// Before
class Logger {
  log(msg) { console.log(msg); }
}

const logger = config.debug ? new Logger() : null;

// 호출처마다
if (logger != null) logger.log("...");
```

```javascript
// After
class Logger {
  log(msg) { console.log(msg); }
}
class NullLogger {
  log(msg) {}   // no-op
}

const logger = config.debug ? new Logger() : new NullLogger();

// 호출처
logger.log("...");   // 항상 안전
```

NullLogger는 *Special Case의 가장 순수한 형태* — Null Object 패턴.

## 예시 3 — Read-only special case

복잡한 도메인의 unknown은 *read-only* 값 객체로.

```javascript
// Before
function isUnknown(arg) {
  if (!(arg instanceof Customer || arg === null)) throw new Error();
  return arg === null;
}

function getSite(customer) {
  return isUnknown(customer) ? new Site("unknown") : customer.site;
}
```

```javascript
// After
class Customer {
  constructor(name, billingPlan, paymentHistory) { /* ... */ }
  get isUnknown() { return false; }
  get name() { return this._name; }
  get billingPlan() { return this._billingPlan; }
  get site() { return this._site; }
}

class UnknownCustomer {
  get isUnknown() { return true; }
  get name() { return "occupant"; }
  get billingPlan() { return registry.billingPlans.basic; }
  get site() { return new Site("unknown"); }
}

function getSite(customer) { return customer.site; }
```

UnknownCustomer는 *immutable special value*. *factory function*이 적절히 반환.

## 자주 보는 안티패턴

### 1. *Special case object가 mutable*
UnknownCustomer에 *set* 하는 코드가 들어가면 "unknown인데 변경?" 의미 혼란. *immutable*로.

### 2. *Method 누락*
새 method를 Customer에만 추가, UnknownCustomer에 안 추가 → 호출 시 *undefined* (JS) / NPE (Java). 인터페이스 / abstract class로 강제.

### 3. *Side effect 가진 null object*
NullLogger의 `log`가 *비밀리에 metric 전송* — surprise. 진짜 no-op만.

### 4. *Null과 special case 혼용*
일부 호출자에는 special case 반환, 일부에는 null — *일관성 없음*. 한 방식.

### 5. *Special case의 isUnknown 체크 의존*
모든 호출자가 *결국 isUnknown 체크*한다면 *Null Object 효과 사라짐*. 진짜 "기본 동작" 정의가 가능한 case만.

### 6. *너무 많은 special case*
"unknown", "pending", "deleted", "anonymous" — case별 class 폭증. 적정선.

## Modern variants

### Optional / Maybe / Result

Java `Optional<T>`, Rust `Option<T>`, Haskell `Maybe a` — *언어 차원의 special case*.

```java
Optional<Customer> customer = findById(id);
String name = customer.map(Customer::getName).orElse("occupant");
```

호출자가 *명시적*으로 처리. Special Case Object의 *언어 표준화*.

### Null safety (Kotlin)

```kotlin
val name = customer?.name ?: "occupant"
```

`?:`(elvis) — Kotlin 차원의 default 표현.

### TypeScript `??`

```typescript
const name = customer?.name ?? "occupant";
```

### Rust — `enum`으로 명시

```rust
enum CustomerLookup {
    Known(Customer),
    Unknown,
}

fn name(c: &CustomerLookup) -> &str {
    match c {
        CustomerLookup::Known(c) => &c.name,
        CustomerLookup::Unknown  => "occupant",
    }
}
```

exhaustive match — special case가 *도메인에 명시*.

### React — Default props

```jsx
function Avatar({ user = anonymousUser }) {
  return <img src={user.avatar} />;
}
```

`anonymousUser`가 special case object.

## Null Object 패턴 (역사)

이 refactoring은 **Null Object 패턴**의 일반화. Bobby Woolf가 1996년 *Pattern Languages of Program Design 3*에서 소개. Kent Beck도 *Smalltalk Best Practice Patterns*에서 사용.

Fowler는 *Special Case Object*로 일반화 — null뿐만 아니라 *모든 특별 case*에 적용.

## 도구 / IDE

| 도구 | 기능 |
| --- | --- |
| IntelliJ | "Generate Null Object" (일부 플러그인) |
| Resharper | "Convert to Optional" / "Convert null check" |

## 성능 고려

object 호출 overhead는 일반적으로 무시. *NullObject 패턴*의 경우 *no-op method 호출이 진짜 nothing* — JIT가 dead code eliminate.

## 관련 패턴

- **자매**: [Pattern 38: Replace Conditional with Polymorphism](/blog/programming/design/refactoring-catalog/pattern38-replace-conditional-with-polymorphism)
- **준비**: [Pattern 12: Encapsulate Record](/blog/programming/design/refactoring-catalog/pattern12-encapsulate-record)
- **assertion**: [Pattern 40: Introduce Assertion](/blog/programming/design/refactoring-catalog/pattern40-introduce-assertion)
