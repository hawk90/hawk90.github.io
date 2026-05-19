---
title: "Pattern 22: Move Field"
date: 2026-05-02T22:00:00
description: "Field가 다른 class에서 더 자주 쓰이면 이동한다 — Feature Envy의 데이터 측면."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 22
tags: [refactoring, move-field, data-class, fowler]
draft: true
type: book-review
bookTitle: "Refactoring: Improving the Design of Existing Code, 2nd Edition"
bookAuthor: "Martin Fowler"
---

## 한 줄 요약

> 필드를 다루는 *대부분의 코드*가 다른 클래스에 있다면, 필드는 그 클래스로 이사 가야 한다.

## 동기 (Motivation)

데이터 구조는 *프로그램의 뼈대*다. 함수보다 더 변경하기 어렵고, 잘못 놓인 필드는 *수많은 의존*을 만든다. 필드가 *원래 클래스보다 다른 클래스에서 더 자주 읽고 쓰인다*면, 그것은 [Move Function](/blog/programming/design/refactoring-catalog/pattern21-move-function)의 데이터 측면 — Feature Envy의 데이터판.

신호:

1. **호출 통계** — 필드를 만지는 메서드 대부분이 다른 클래스에 있다.
2. **함께 다니는 필드들** — `address.street, address.city, customer.email`처럼 한 영역에 묶여야 할 필드가 잘못된 자리에.
3. **불변식 우회** — 한 필드의 변경이 다른 클래스의 필드와 *짝으로* 일어나야 하는데 위치가 떨어져 있어 일관성이 위태.
4. **상속 계층 정리** — 자식 클래스 대부분이 같은 필드를 갖는다면 [Pull Up Field](/blog/programming/design/refactoring-catalog/pattern52-pull-up-field).

### 데이터 이동의 어려움

함수는 *위임(delegation)*으로 임시 다리를 놓을 수 있지만 데이터는 *두 자리에 동시에 있을 수 없다*. 이중 저장은 *동기화 문제*를 부른다. 따라서 *마이그레이션 기간을 짧게*, *접근자(getter/setter)를 먼저* 두고 *내부 저장 위치만* 옮기는 패턴.

### 언제 적용하는가

- 필드 호출 *대부분*이 다른 클래스에 있다.
- 같은 클래스의 다른 필드와 *항상 함께* 사용되는 필드가 위치만 떨어져 있다.
- 도메인 모델 발견 — *값 객체*나 *별도 엔티티*가 보인다.
- 한 변경이 *여러 클래스를 동시에* 건드린다.

## 절차 (Mechanics)

1. **source 필드를 캡슐화**한다. [Encapsulate Variable](/blog/programming/design/refactoring-catalog/pattern06-encapsulate-variable) — 외부가 함수로만 접근.
2. **destination class**에 동일 의미의 필드를 추가 + getter/setter.
3. source의 getter/setter가 *destination에 위임*하도록 redirect.
4. source의 *내부 필드*를 제거.
5. 모든 클라이언트를 destination 직접 호출로 *점진 이동*.
6. source의 getter/setter도 제거.
7. 테스트.

각 단계마다 *컴파일 + 테스트 그린*. 데이터는 한 번에 옮기지 말 것.

## 예시 1 — 단순 이동

```javascript
// Before — discountRate가 Customer에 있지만 사실은 CustomerContract 관련
class Customer {
  constructor(name) {
    this._name = name;
    this._contract = new CustomerContract(new Date());
    this._discountRate = 0;
  }
  get discountRate() { return this._discountRate; }
  becomePreferred() {
    this._discountRate += 0.03;
    /* ... */
  }
  applyDiscount(amount) {
    return amount * (1 - this._discountRate);
  }
}

class CustomerContract {
  constructor(startDate) {
    this._startDate = startDate;
  }
}
```

`discountRate` 관련 메서드가 `applyDiscount`까지 다 *contract 의미*다. CustomerContract로 옮기는 게 자연.

### 단계 1 — Customer에서 캡슐화

```javascript
class Customer {
  // ... 위와 같음 ...
  get discountRate()  { return this._discountRate; }
  _setDiscountRate(arg) { this._discountRate = arg; }
  becomePreferred()   { this._setDiscountRate(this._discountRate + 0.03); }
  applyDiscount(amount){ return amount * (1 - this._discountRate); }
}
```

### 단계 2 — CustomerContract에 필드 + getter/setter

```javascript
class CustomerContract {
  constructor(startDate, discountRate = 0) {
    this._startDate = startDate;
    this._discountRate = discountRate;
  }
  get discountRate() { return this._discountRate; }
  set discountRate(arg) { this._discountRate = arg; }
}
```

### 단계 3 — Customer가 contract에 위임

```javascript
class Customer {
  get discountRate()       { return this._contract.discountRate; }
  _setDiscountRate(arg)    { this._contract.discountRate = arg; }
  // becomePreferred, applyDiscount는 그대로 — 내부 함수만 호출
}
```

`this._discountRate` 필드는 *제거*. 외부 클라이언트는 영향 없음.

### 단계 4 — 클라이언트가 contract 직접 사용

점진적으로 `customer.discountRate` 호출을 `customer.contract.discountRate`로. 또는 Customer가 *forwarding을 유지*해도 OK.

## 예시 2 — 호출 통계로 결정

```javascript
// Before
class Order {
  constructor() {
    this._items = [];
    this._customerEmail = "";   // customer의 영역인데 Order에?
  }
  validate() {
    if (!this._customerEmail.includes("@")) throw new Error("invalid email");
  }
  sendConfirmation() {
    return emailService.send(this._customerEmail, "confirmed");
  }
  formatReceipt() {
    return `${this._customerEmail}\n${this._items.length} items`;
  }
}
```

`_customerEmail` 사용처 — `validate`, `sendConfirmation`, `formatReceipt`. 모두 *email 관련*. Customer 객체가 있다면 거기로 옮기는 게 응집.

```javascript
// After
class Customer {
  constructor(email) {
    this._email = this._validateEmail(email);
  }
  get email() { return this._email; }
  _validateEmail(e) {
    if (!e.includes("@")) throw new Error("invalid email");
    return e;
  }
}

class Order {
  constructor(customer) {
    this._items = [];
    this._customer = customer;
  }
  sendConfirmation() { return emailService.send(this._customer.email, "confirmed"); }
  formatReceipt()    { return `${this._customer.email}\n${this._items.length} items`; }
}
```

`Customer` 자체가 *email invariant*를 보호하고, Order는 *주문 관련만*.

## 예시 3 — Pull Up Field로 진화

자식 여러 개가 같은 필드를 가질 때 부모로.

```javascript
class Employee {
  constructor(name) { this._name = name; }
}

class Manager extends Employee {
  constructor(name, salary) { super(name); this._salary = salary; }
  get salary() { return this._salary; }
}

class Engineer extends Employee {
  constructor(name, salary) { super(name); this._salary = salary; }
  get salary() { return this._salary; }
}
```

`_salary`가 두 자식 모두에. 부모로:

```javascript
class Employee {
  constructor(name, salary) {
    this._name = name;
    this._salary = salary;
  }
  get salary() { return this._salary; }
}

class Manager extends Employee {
  constructor(name, salary) { super(name, salary); }
}

class Engineer extends Employee {
  constructor(name, salary) { super(name, salary); }
}
```

자식의 중복 제거. 자세히는 [Pull Up Field](/blog/programming/design/refactoring-catalog/pattern52-pull-up-field).

## 자주 보는 안티패턴

### 1. 직접 이동 (캡슐화 단계 생략)
필드를 *바로* 옮기면 모든 호출처가 동시에 깨진다. *반드시* 캡슐화 → redirect → 클라이언트 이동 → 제거 순서.

### 2. *복제* — 양쪽 클래스에 같은 필드
"임시로 둘 다 둬도 되겠지" — 두 자리의 값이 *동기화 안 됨*. 한 곳을 update한 코드가 다른 곳을 잊으면 invariant 깨짐. 위임이 안전.

### 3. *Bidirectional reference* 만들기
Customer가 CustomerContract를, CustomerContract가 Customer를 — 순환. lifetime 꼬임, garbage collection 문제, 직렬화 어려움. 한쪽만 알게.

### 4. *Invariant 위배*
한 필드의 값이 *다른 필드와의 관계*를 유지해야 하는데, 옮기면서 그 관계가 깨질 수 있다. 옮기기 전 검증 로직도 같이.

### 5. *너무 많이 동시 이동*
필드 5개를 한 번에 옮기면 무엇이 회귀를 일으켰는지 추적 불가. *한 필드씩*.

### 6. 잘못된 도메인 분석
사용 통계만 보고 옮기면 *의미*를 놓칠 수 있다. `customer.totalSpent`가 통계상 Order에서 더 자주 쓰여도, *Customer에 속하는 게 도메인 의미*일 수 있다.

## Modern variants

### TypeScript readonly 필드
이동 후 *읽기 전용*으로 만들면 의도 명확.

```typescript
class Customer {
  constructor(readonly email: string) {
    if (!email.includes("@")) throw new Error();
  }
}
```

### Kotlin / Java records
record는 *자동 immutable*. 이동이 곧 *값 동등 객체* 확립.

```kotlin
data class CustomerContract(val startDate: LocalDate, val discountRate: Double)
```

### Rust ownership
필드 이동 시 *ownership* 명시. `move`로 source가 더 이상 소유 안 함을 컴파일러가 보장.

### Database schema migration
도메인 필드 이동은 *DB 컬럼 이동*과 같은 문제 — 점진적 migration, dual-write, dual-read 패턴.

## 도구 / IDE

| 도구 | 기능 |
| --- | --- |
| IntelliJ | "Move Field" |
| Rider | F6 |
| Eclipse | "Move" refactoring |

자동 도구가 *모든 호출처*를 함께 갱신. 누락 위험 줄어듦.

## 성능 고려

필드 이동은 *메모리 layout 변경*. cache locality 영향 가능 — hot path는 측정. 보통 무시 가능.

## 관련 패턴

- **함수 이동**: [Pattern 21: Move Function](/blog/programming/design/refactoring-catalog/pattern21-move-function)
- **캡슐화**: [Pattern 6: Encapsulate Variable](/blog/programming/design/refactoring-catalog/pattern06-encapsulate-variable)
- **클래스 분리**: [Pattern 16: Extract Class](/blog/programming/design/refactoring-catalog/pattern16-extract-class)
- **상속 계층 이동**: [Pattern 52: Pull Up Field](/blog/programming/design/refactoring-catalog/pattern52-pull-up-field), [Pattern 55: Push Down Field](/blog/programming/design/refactoring-catalog/pattern55-push-down-field)
- **데이터 뭉치 정리**: [Pattern 8: Introduce Parameter Object](/blog/programming/design/refactoring-catalog/pattern08-introduce-parameter-object)
