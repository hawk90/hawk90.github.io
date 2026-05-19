---
title: "Pattern 18: Hide Delegate"
date: 2026-05-02T18:00:00
description: "Law of Demeter — 중개자 노출을 막아 클라이언트가 이웃의 이웃을 모르게."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 18
tags: [refactoring, law-of-demeter, hide-delegate, fowler]
draft: true
type: book-review
bookTitle: "Refactoring: Improving the Design of Existing Code, 2nd Edition"
bookAuthor: "Martin Fowler"
---

## 한 줄 요약

> 클라이언트가 `manager.getDepartment().getManager()` 같은 체인을 부른다면, 그 체인은 server class 내부에 숨긴다(Law of Demeter).

## 동기 (Motivation)

캡슐화는 *데이터 숨기기*가 전부가 아니다. *이웃의 이웃을 알게 만들지 않는 것*도 포함된다. 이게 **Law of Demeter**("Don't talk to strangers", *친구의 친구와는 말하지 말라*)다.

```javascript
const manager = person.department.manager;   // chain
```

이 코드의 문제 — `Department`의 *구조*가 client에 노출된다. department가 *manager 대신 leadList[0]*으로 바뀌면 모든 chain client가 깨진다. 한 단계 더 감추면 변경이 한 곳에 머문다.

### Law of Demeter — 누구와 대화 가능한가

객체 M의 메서드가 호출할 수 있는 *친구*:

1. **M 자신**의 메서드
2. **M의 매개변수**의 메서드
3. **M이 만든 객체**의 메서드
4. **M의 필드** (자기 컴포넌트)
5. **전역 객체**

⛔ *그 친구의 메서드의 반환값*에는 다이렉트로 말하면 안 된다.

엄격히 적용하면 너무 ceremony가 많아진다 (모든 chain을 wrapper로 감싸야 함). Fowler는 *원리지 dogma 아님* 강조 — *균형*이 중요.

### 신호

- `a.b().c().d().e()` 같은 *3단계 이상* chain.
- client가 server의 *내부 구조*를 알아야 작동.
- server class 내부 reorganize 시 *수많은 client*가 깨짐.

### 언제 적용하는가

- 자주 호출되는 chain이 있다.
- server의 *내부 구조*를 바꿀 가능성.
- client와 *깊은 객체*의 결합을 줄이고 싶다.
- *delegating method 몇 개* 추가가 부담 적다.

## 절차 (Mechanics)

1. **자주 호출되는 delegate method**를 server class에 추가.
2. client가 server method를 호출하도록 *한 곳씩* 변경.
3. 모든 client가 옮겨졌으면 server에서 delegate getter 제거 (가능하면).
4. 테스트.

## 예시 1 — 기본 패턴

```javascript
// Before — client가 department를 안다
class Person {
  get department() { return this._department; }
}
class Department {
  get manager()      { return this._manager; }
  get chargeCode()   { return this._chargeCode; }
  get costCenter()   { return this._costCenter; }
}

// Client
const manager = person.department.manager;   // chain
```

```javascript
// After — Person이 직접 manager 노출
class Person {
  get manager() { return this._department.manager; }
}

// Client
const manager = person.manager;   // 한 단계
```

이제 `Department` 구조가 바뀌어도 `Person.manager`만 그대로면 client는 무변.

## 예시 2 — Department 구조 변경 시뮬레이션

```javascript
// 시간이 지나며 Department가 바뀐다 — manager → leadership team
class Department {
  // before
  // get manager() { return this._manager; }

  // after
  get leadershipTeam() { return [this._primaryLead, ...this._secondaryLeads]; }
  get primaryLead()    { return this._primaryLead; }
}

// Hide Delegate 적용 안 됐다면
const manager = person.department.manager;   // undefined — 모든 client 깨짐

// Hide Delegate 적용됐다면
class Person {
  get manager() { return this._department.primaryLead; }   // 한 곳만 수정
}
const manager = person.manager;   // OK — client 영향 없음
```

캡슐화의 진정한 가치는 *변화의 격리*.

## 예시 3 — Network of objects

```javascript
// Before — 깊은 chain
const country = order.customer.address.country;
const tax = country.taxRate(order.total);
```

여러 단계 chain.

```javascript
// After
class Order {
  get customerCountry() { return this._customer.country; }   // hide customer.address
  taxFor(amount) { return this.customerCountry.taxRate(amount); }   // hide country.taxRate
}

class Customer {
  get country() { return this._address.country; }   // hide address
}

const tax = order.taxFor(order.total);
```

각 객체가 *자기 책임의 chain*만 숨김. 호출자는 *한 단계*만 본다.

## 자주 보는 안티패턴

### 1. 모든 chain을 *기계적*으로 숨김
Demeter를 dogma로 적용하면 server class에 *수십 개의 forwarding method*가 쌓인다 — [Remove Middle Man](/blog/programming/design/refactoring-catalog/pattern19-remove-middle-man) 시즌. *균형*.

### 2. *비공개 구조*까지 숨기기에 집착
data transfer object(DTO)는 *구조 그대로*가 의미. JSON 응답을 chain으로 접근하는 게 *자연스러울 수 있음*. 모든 케이스가 같지 않다.

### 3. Helper 객체 chain
`builder.withX().withY().withZ().build()` 같은 *fluent API*는 Demeter 위반처럼 보이지만 *반환값이 자신 (this)*. Demeter 무관 — 좋은 패턴.

### 4. *Test mock chain*에 적용
test에서 `mock.foo().bar().baz()` 같은 chain은 *test code*. production code의 Demeter 위반이 아니다.

### 5. 한 호출만 위해 method 추가
*한 client만 부르는* delegating method를 server에 추가하면 server가 *client-specific 메서드 모음*이 됨. *적어도 2-3 client*에서 같은 chain을 부를 때.

### 6. Demeter 위반 = 무조건 나쁨
*도메인 모델 탐색* 단계에선 chain이 *자연스럽고 옳을 수도*. server 구조가 *안정*되면 그때 hide. 미숙한 단계에 적용하면 *시도해 보기*가 어려워진다.

## Modern variants

### Reactive chain (RxJS, Observable)
`stream.pipe(filter(...), map(...))` 같은 chain은 Demeter 위반이 아님 — *Functional pipeline*. 같은 type 변형의 연속.

### Builder API
fluent builder는 자기 자신 반환. Demeter 안 어김.

### Optional chaining
```javascript
const manager = person?.department?.manager;
```
구문은 chain이지만 *null safety 표현* — Hide Delegate와 다른 측면.

### TS getter chain — type 안전
TypeScript는 chain의 *각 단계 type 추론*이 강력해 *컴파일 타임에 검증*. dynamic 언어보다 Demeter 위반 위험이 적음.

## 도구 / IDE

| 도구 | 기능 |
| --- | --- |
| IntelliJ | "Encapsulate Method" + 수동 |
| 일반 | "Extract Method" 활용 |

자동 도구가 *완전 자동*은 아님. 직접 메서드 추가 + 호출처 갱신.

## 성능 고려

method 호출 한 단계 추가. JIT 인라인으로 *비용 0*.

## 균형 — Demeter의 spirit

> "Tell, don't ask."

객체에 *질문하지 말고 시켜라*. 객체 구조를 묻고 답을 가공하는 대신, *원하는 결과*를 부탁한다. Demeter 본질.

```javascript
// Ask — bad
if (person.department.budget.amount > 1000) approveLoan(person);

// Tell — good
if (person.canAffordLoan()) approveLoan(person);
```

## 관련 패턴

- **역연산**: [Pattern 19: Remove Middle Man](/blog/programming/design/refactoring-catalog/pattern19-remove-middle-man)
- **자매**: [Pattern 6: Encapsulate Variable](/blog/programming/design/refactoring-catalog/pattern06-encapsulate-variable), [Pattern 12: Encapsulate Record](/blog/programming/design/refactoring-catalog/pattern12-encapsulate-record)
- **클래스 분리**: [Pattern 16: Extract Class](/blog/programming/design/refactoring-catalog/pattern16-extract-class)
