---
title: "Pattern 16: Extract Class"
date: 2026-05-02T16:00:00
description: "Class가 너무 많은 책임을 질 때 일부를 새 class로 분리한다 — SRP."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 16
tags: [refactoring, extract-class, srp, fowler]
draft: true
type: book-review
bookTitle: "Refactoring: Improving the Design of Existing Code, 2nd Edition"
bookAuthor: "Martin Fowler"
---

## 한 줄 요약

> 클래스가 너무 많은 일을 한다면, 일부 데이터와 동작을 새 클래스로 빼낸다(Single Responsibility Principle).

## 동기 (Motivation)

클래스가 처음에는 단순했지만 시간이 지나면서 책임이 늘어나는 것이 자연스러운 흐름이다. 어느 순간 *함께 다니는 field들*과 *그것을 다루는 method들*이 보이면, 그 묶음을 새 클래스로 추출할 시점이다.

[Combine Functions into Class](/blog/programming/design/refactoring-catalog/pattern09-combine-functions-into-class)의 *역방향* — 한 클래스가 너무 자라면 분할.

### 신호 (Bad Smells)

- 일부 method가 *특정 field 그룹*만 다룬다.
- field 이름에 *접두사*나 *그룹 hint*가 보인다 (`shippingAddress`, `shippingCity`, `shippingZip`, ...).
- 클래스 한 줄 설명이 *"X and Y"* 또는 *"and"가 두 번 이상*.
- 한 영역의 변경이 *다른 영역 method도 같이 건드림*.
- 클래스 길이가 500줄 이상 — 한 화면을 훨씬 넘김.
- 메서드 수가 20개 이상.
- 다른 사람이 한 메서드를 추가하려면 *클래스 전체*를 읽어야 한다.

### SRP — 변경의 축

Robert C. Martin: "A class should have only one reason to change."

*하나의 변경 사유* = 하나의 책임. 클래스에 *두 사유*가 동시에 있으면 한 변경이 다른 영역까지 *영향*. 영향이 *불가피한* 결합이면 OK지만, *우연한* 결합이면 분리.

### 언제 적용하는가

- 위 신호 중 *둘 이상*.
- field 그룹이 *명확히 구분*된다.
- 분리 후 *각 클래스의 단일 책임*이 한 단어로 표현된다.

## 절차 (Mechanics)

1. **분리할 책임을 정의**한다 — 한 문장으로 새 클래스의 책임 말할 수 있어야.
2. **새 class를 만든다**. 옛 class가 *새 class 인스턴스를 가지게* (composition).
3. [Move Field](/blog/programming/design/refactoring-catalog/pattern22-move-field)로 field를 *한 곳씩* 이동.
4. [Move Function](/blog/programming/design/refactoring-catalog/pattern21-move-function)으로 method 이동.
5. 옛 class는 새 class에 *위임(facade)* 또는 일부 인터페이스 제거.
6. 새 class의 가시성 결정 (value object면 노출, 내부면 private).
7. 테스트.

## 예시 1 — Person + TelephoneNumber

```javascript
// Before — Person이 전화번호까지 다룸
class Person {
  constructor(name, officeAreaCode, officeNumber) {
    this._name = name;
    this._officeAreaCode = officeAreaCode;
    this._officeNumber = officeNumber;
  }
  get name() { return this._name; }
  get telephoneNumber() {
    return `(${this._officeAreaCode}) ${this._officeNumber}`;
  }
  get officeAreaCode() { return this._officeAreaCode; }
  get officeNumber()   { return this._officeNumber; }
  set officeAreaCode(arg) { this._officeAreaCode = arg; }
  set officeNumber(arg)   { this._officeNumber = arg; }
}
```

`officeAreaCode`, `officeNumber`, `telephoneNumber`가 한 영역. 다른 곳에서도 *전화번호*가 필요할 수 있다.

```javascript
// After
class TelephoneNumber {
  constructor(areaCode, number) {
    this._areaCode = areaCode;
    this._number = number;
  }
  get areaCode() { return this._areaCode; }
  set areaCode(arg) { this._areaCode = arg; }
  get number()   { return this._number; }
  set number(arg)   { this._number = arg; }
  toString() { return `(${this._areaCode}) ${this._number}`; }
}

class Person {
  constructor(name, areaCode, number) {
    this._name = name;
    this._telephone = new TelephoneNumber(areaCode, number);
  }
  get name() { return this._name; }
  get telephoneNumber() { return this._telephone.toString(); }
  // 위임이 너무 많으면 Person이 _telephone을 직접 노출 (Remove Middle Man)
}
```

이제 `TelephoneNumber`는 *재사용 가능*하고, `Person`은 *이름·주소·전화* 책임 중 *전화 부분만* 다른 곳으로.

## 예시 2 — God class 분리

```javascript
// Before — User가 너무 많음
class User {
  // identity
  _email; _hashedPassword;

  // profile
  _firstName; _lastName; _avatar; _bio;

  // preferences
  _theme; _language; _timezone;

  // session
  _lastLoginAt; _lastIp; _sessionToken;

  // 메서드 30개...
}
```

각 그룹이 *다른 변경 사유*. 분리.

```javascript
// After
class Credentials {
  constructor(email, hashedPassword) { /* ... */ }
  verify(plain) { /* bcrypt 등 */ }
  changePassword(newPlain) { /* ... */ }
}

class Profile {
  constructor(firstName, lastName, avatar, bio) { /* ... */ }
  get fullName() { return `${this._firstName} ${this._lastName}`; }
}

class Preferences {
  constructor(theme, language, timezone) { /* ... */ }
}

class Session {
  constructor() { /* lastLoginAt, lastIp, sessionToken */ }
  refresh() { /* ... */ }
}

class User {
  constructor(credentials, profile, prefs, session) {
    this.credentials = credentials;
    this.profile = profile;
    this.prefs = prefs;
    this.session = session;
  }
}
```

User는 *aggregate root*가 되고, 각 sub-class는 *독립적으로 변경*.

## 예시 3 — value object 분리

```javascript
// Before — Order에 주소 필드 6개
class Order {
  _street; _city; _state; _zip; _country;
  _customerEmail;
  _items;

  formattedAddress() {
    return `${this._street}\n${this._city}, ${this._state} ${this._zip}\n${this._country}`;
  }
}
```

```javascript
// After
class Address {
  constructor(street, city, state, zip, country) { /* ... */ }
  toString() { return `${this._street}\n${this._city}, ${this._state} ${this._zip}\n${this._country}`; }
  // distance 계산, 우편 가능 여부 등 도메인 메서드
}

class Order {
  constructor(address, customerEmail, items) {
    this._address = address;
    this._customerEmail = customerEmail;
    this._items = items;
  }
  get formattedAddress() { return this._address.toString(); }
}
```

`Address`는 *다른 곳에서도 재사용* (배송, 청구, 회원).

## 자주 보는 안티패턴

### 1. 양방향 reference 만들기
```javascript
class Person { _telephone; }
class TelephoneNumber { _owner; }   // back-pointer
```
순환 의존이 생기면 *garbage collection 문제, 직렬화 문제, lifetime 꼬임*. 한쪽만 알게.

### 2. 너무 많은 작은 클래스
*책임 단위가 모호한데* 추출하면 갈피를 못 잡는 작은 클래스가 늘어난다. *명확한 책임* 있을 때만.

### 3. 위임만 잔뜩 (facade)
```javascript
class Person {
  get areaCode()      { return this._telephone.areaCode; }
  set areaCode(arg)   { this._telephone.areaCode = arg; }
  get number()        { return this._telephone.number; }
  // ... 모든 전화 메서드 forward
}
```
[Remove Middle Man](/blog/programming/design/refactoring-catalog/pattern19-remove-middle-man) 시즌. 또는 *전화 부분*은 client가 *직접* `person.telephone`을 보게.

### 4. 추출이 *우연한 응집*에 기반
같은 알파벳 시작이나 *우연히 함께 변경된* field를 묶으면 가짜 책임. 진짜는 *변경 사유 통일*.

### 5. 새 클래스 이름이 약함
`PersonData`, `PersonHelper`, `PersonUtil` — 가치 없는 이름. 도메인 단어로.

### 6. 추출 후 *상호 의존 폭발*
새 클래스 A가 B를, B가 C를, C가 A를 — 추출 전보다 *더 복잡*. 추출 후 그래프 검증.

## Modern variants

### Composition over inheritance
*상속*으로 책임을 나누는 옛 스타일 (`PersonWithAddress extends Person`) 보다 *composition*. Extract Class는 기본적으로 composition.

### Value object 발견
[Replace Primitive with Object](/blog/programming/design/refactoring-catalog/pattern14-replace-primitive-with-object)와 결합 — 추출 결과가 *값 객체*면 immutable + equals.

### Aggregate root (DDD)
큰 클래스를 분리하면서 *aggregate root* 패턴 발견:

```text
Order (root)
├── ShippingAddress
├── BillingAddress
├── OrderItems (collection)
└── PaymentMethod
```

root만 외부에 노출, sub-entity는 root 통해 접근. 일관성 경계.

### Modular monolith
Extract Class를 *대규모로* 적용 → 모듈 단위 분리. Java module, Rust crate, TS workspace.

## 도구 / IDE

| 도구 | 기능 |
| --- | --- |
| IntelliJ | "Extract Class" / "Extract Delegate" |
| Rider | "Extract Class" |
| Eclipse | Extract Class refactoring |
| VS Code | 수동 (TypeScript code action 일부) |

자동 도구가 *field 이동 + method 이동 + 호출처 갱신* 한 번에. 수동은 누락 위험.

## 성능 고려

객체 한 단계가 추가되어 *메모리 + 호출 비용*. JIT escape analysis가 보통 제거. 측정 후 결정.

## 관련 패턴

- **역연산**: [Pattern 17: Inline Class](/blog/programming/design/refactoring-catalog/pattern17-inline-class)
- **도구**: [Pattern 21: Move Function](/blog/programming/design/refactoring-catalog/pattern21-move-function), [Pattern 22: Move Field](/blog/programming/design/refactoring-catalog/pattern22-move-field)
- **자매**: [Pattern 9: Combine Functions into Class](/blog/programming/design/refactoring-catalog/pattern09-combine-functions-into-class)
- **위임 정리**: [Pattern 18: Hide Delegate](/blog/programming/design/refactoring-catalog/pattern18-hide-delegate), [Pattern 19: Remove Middle Man](/blog/programming/design/refactoring-catalog/pattern19-remove-middle-man)
- **값 객체**: [Pattern 14: Replace Primitive with Object](/blog/programming/design/refactoring-catalog/pattern14-replace-primitive-with-object), [Pattern 33: Change Reference to Value](/blog/programming/design/refactoring-catalog/pattern33-change-reference-to-value)
