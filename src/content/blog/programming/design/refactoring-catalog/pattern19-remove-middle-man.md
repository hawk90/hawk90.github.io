---
title: "Pattern 19: Remove Middle Man"
date: 2026-05-02T19:00:00
description: "Delegate가 너무 많아지면 중개자를 제거 — Hide Delegate의 역연산."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 19
tags: [refactoring, middle-man, remove-delegate, fowler]
draft: true
type: book-review
bookTitle: "Refactoring: Improving the Design of Existing Code, 2nd Edition"
bookAuthor: "Martin Fowler"
---

## 한 줄 요약

> Hide Delegate를 과하게 적용해 클래스가 *단순 통과 메서드*로 채워지면, 중개자를 제거하고 client가 직접 호출하게 한다.

## 동기 (Motivation)

[Hide Delegate](/blog/programming/design/refactoring-catalog/pattern18-hide-delegate)의 결과로 server class에 *단순 forwarding 메서드*가 쌓이면 그 class의 가치가 줄어든다. *반은 자기 일, 반은 남의 일 위임*이면 직접 호출이 더 깔끔하다.

### 균형 — Demeter의 spirit vs Ceremony

Demeter는 *원리*이지 dogma가 아니다. 모든 chain을 숨기면 *forwarding 천국*. 반대로 모든 걸 노출하면 *결합 폭발*. 균형이 핵심.

```text
Hide Delegate ◄────────► Remove Middle Man
       (감추기)            (드러내기)
       
적용 기준 — server의 *정체성*이 forwarding으로 흐려지는가?
```

forwarding이 50% 이상이면 *server가 단순 facade*. 그 facade가 필요하면 두고, 아니면 제거.

### 신호

- server class의 *대부분 메서드*가 단순 위임.
- forwarding 메서드 추가가 *server의 책임과 무관*.
- client가 *delegate object*에 직접 접근하는 게 더 자연스러움.
- server class가 단순 *데이터 보유 + getter*만 남음.

### 언제 적용하는가

- Hide Delegate를 과하게 적용했다.
- 새 forwarding이 *반복적으로* 추가된다 — 추가 비용이 의미보다 큼.
- client 코드가 더 자연스럽게 *delegate를 직접 알면* 좋다.
- *delegate가 첫 번째 시민*이 되어야 할 시점.

## 절차 (Mechanics)

1. **delegate getter**를 server class에 추가 (이미 있으면 skip).
2. delegating method를 사용하는 client를 *직접 호출*로 변경 (한 곳씩).
3. 모든 client가 옮겨졌으면 forwarding method 제거.
4. 테스트.

## 예시 1 — 단순 케이스

```javascript
// Before — Person이 manager를 통째 위임
class Person {
  constructor(department) { this._department = department; }
  get manager()      { return this._department.manager; }
  get chargeCode()   { return this._department.chargeCode; }
  get costCenter()   { return this._department.costCenter; }
  setChargeCode(c)   { this._department.chargeCode = c; }
  // ... department의 거의 모든 메서드 forward
}

// Client
const manager = person.manager;
person.setChargeCode("X-001");
```

`Person.manager`, `Person.chargeCode`, `Person.setChargeCode` 모두 *forwarding*. `Person`이 *department facade*에 그침.

```javascript
// After — department를 직접 노출
class Person {
  constructor(department) { this._department = department; }
  get department() { return this._department; }
}

// Client
const manager = person.department.manager;
person.department.chargeCode = "X-001";
```

forwarding 코드가 사라지고 *client가 명시적*으로 department를 알게 됨.

## 예시 2 — 부분만 제거

모든 forwarding을 제거할 필요는 없다. *자주 쓰는 일부*는 남기고, *드물게 쓰는* 것만 제거.

```javascript
class Person {
  get department() { return this._department; }   // 노출
  get manager()    { return this._department.manager; }   // 가장 자주 — 남김
  // chargeCode, costCenter는 제거 — client가 person.department.xxx로
}
```

균형 — 가치 있는 forwarding은 *남기고* 의미 없는 것만 제거.

## 예시 3 — Fluent API 보존

위임처럼 보이지만 *체인*인 경우는 그대로.

```javascript
// 위임이 아니라 builder
class QueryBuilder {
  where(cond)   { /* ... */ return this; }
  orderBy(col)  { /* ... */ return this; }
  limit(n)      { /* ... */ return this; }
  build() { /* SQL 생성 */ }
}

query.where("status = 'active'").orderBy("name").limit(10).build();
```

이건 *fluent API*. Remove Middle Man 대상 아님.

## 자주 보는 안티패턴

### 1. Hide / Remove 사이 *번복 반복*
같은 chain을 *Hide → Remove → Hide* 반복하면 PR 리뷰가 끝없다. *팀 합의*로 한쪽 정해 안정.

### 2. *외부 노출* 클래스에서 즉시 제거
public API에 forwarding 메서드를 제거하면 *모든 사용자가 깨진다*. deprecated 후 migration.

### 3. *너무 일찍* 결정
Hide Delegate 적용 후 *충분히 시간을 줘* 정말 forwarding이 *과한지* 관찰. 첫인상으로 결정하지 말 것.

### 4. *부분 제거* 없이 모두 제거
일부 forwarding은 *진짜 가치 있을 수 있다*. 모두 제거하면 *Hide Delegate가 필요한 부분*까지 잃는다.

### 5. *DTO에 적용*
DTO나 immutable record의 *구조 노출*은 정상. 거기에 Hide / Remove 적용은 의미 없다.

### 6. *Test breakage 무시*
forwarding 제거 시 *test의 chain* 도 깨진다. test 코드도 정리.

## Modern variants

### TypeScript — 노출 vs 캡슐화 trade-off

```typescript
class Order {
  private _customer: Customer;
  get customer(): Readonly<Customer> { return this._customer; }   // readonly로 노출
}
```

*노출*하되 *수정 차단*. 균형.

### Rust — `pub(crate)` / `pub(super)`
세분화된 가시성. *모듈 내부만 노출*해 Hide / Remove의 *부분 절충*.

```rust
pub(crate) fn department(&self) -> &Department { &self.department }
```

### Java module system (Java 9+)
모듈 단위 가시성. *패키지 내부만 노출*.

## 균형의 표

| 상황 | 추천 |
| --- | --- |
| forwarding 1-3개, *server 정체성 명확* | Hide Delegate |
| forwarding 5+개, *server가 facade*만 | Remove Middle Man |
| forwarding이 *클라이언트마다 다름* | 부분 노출 |
| forwarding이 *수시로 변경* | Hide Delegate (한 곳에서 흡수) |
| delegate가 *immutable*하고 *공개 API*에 가까움 | Remove Middle Man (직접 노출) |

## 도구 / IDE

| 도구 | 기능 |
| --- | --- |
| IntelliJ | "Inline" + "Inline Method" |
| Rider | 수동 |

자동 도구 일부 지원. 수동이 안전.

## 성능 고려

method 호출 한 단계 제거 → *측정 불가능한 차이*. JIT 인라인.

## 관련 패턴

- **역연산**: [Pattern 18: Hide Delegate](/blog/programming/design/refactoring-catalog/pattern18-hide-delegate)
- **자매**: [Pattern 17: Inline Class](/blog/programming/design/refactoring-catalog/pattern17-inline-class)
- **함수 인라인**: [Pattern 2: Inline Function](/blog/programming/design/refactoring-catalog/pattern02-inline-function)
