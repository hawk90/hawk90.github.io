---
title: "Pattern 17: Inline Class"
date: 2026-06-01T17:00:00
description: "Class가 더 이상 충분한 책임을 갖지 못하면 다른 class로 합친다."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 17
tags: [refactoring, inline-class, fowler]
draft: true
type: book-review
bookTitle: "Refactoring: Improving the Design of Existing Code, 2nd Edition"
bookAuthor: "Martin Fowler"
---

## 한 줄 요약

> Class가 단순 wrapper에 그쳐 추상의 가치가 비용보다 작다면, 다른 class로 합친다. Extract Class의 역연산.

## 동기 (Motivation)

리팩터링을 거치며 클래스의 책임이 *점점 다른 곳으로 옮겨가* 얇은 wrapper만 남는 경우가 있다. 또는 [Extract Class](/blog/programming/design/refactoring-catalog/pattern16-extract-class)를 *잘못 적용*해서 분리가 의미 없는 클래스가 생기기도 한다. 이때 인라인한다.

### 두 가지 동기

**1. 책임 소실 — 자연스러운 감소**

원래는 명확한 책임을 가졌지만 시간이 지나며 관련 기능이 *다른 클래스로 이동*하거나 *제거*되면서, 남은 것이 *단순 데이터 보유*뿐인 경우.

**2. 잘못된 추출 복구**

추출이 *너무 성급*했거나 *우연한 응집*에 기반했다면 분리 자체가 의미 없다. 합치는 게 답.

리팩터링은 한 방향이 아니다. *Extract Class → Inline Class → 다시 Extract Class*는 흔한 사이클. 한 번에 *완벽한 분할*을 만들 필요 없다 — 시도하고 후회하면 되돌리고 다시 시도.

### 신호

- 클래스가 *얇은 wrapper*만 됨.
- 클래스의 method가 *대부분 단순 forwarding*.
- 클래스 사용처가 *한 곳*만 남음.
- 추출 후 *예상한 재사용*이 일어나지 않음.
- 클래스 이름이 점점 모호해짐 (`Helper`, `Utils`).

### 언제 적용하는가

- 클래스가 *단지 위임*만 함.
- 잘못 추출된 helper가 *오히려 가독성을 해친다*.
- 두 클래스가 *너무 밀접하게 결합*해 한 클래스처럼 행동.

## 절차 (Mechanics)

1. **흡수할 클래스**(target) 선택. 보통은 *현재 그 클래스를 가장 많이 쓰는 곳*.
2. 옛 클래스의 public method를 흡수 클래스로 [Move Function](/blog/programming/design/refactoring-catalog/pattern21-move-function).
3. field도 [Move Field](/blog/programming/design/refactoring-catalog/pattern22-move-field)로 이동.
4. 옛 클래스의 모든 사용처를 새 클래스로 변경.
5. 옛 클래스 삭제.
6. 테스트.

각 단계마다 *컴파일 + 테스트 그린*. 한 번에 다 옮기지 말 것.

## 예시 1 — 얇은 wrapper 제거

```javascript
// Before — TrackingInformation이 거의 빈 wrapper
class TrackingInformation {
  constructor(shippingCompany, trackingNumber) {
    this._shippingCompany = shippingCompany;
    this._trackingNumber = trackingNumber;
  }
  get shippingCompany() { return this._shippingCompany; }
  get trackingNumber()  { return this._trackingNumber; }
  get display() { return `${this._shippingCompany}: ${this._trackingNumber}`; }
}

class Shipment {
  constructor(trackingInfo) { this._trackingInformation = trackingInfo; }
  get trackingInfo() { return this._trackingInformation.display; }
}
```

`TrackingInformation`은 도메인 단어이지만 *Shipment 외에는 사용처 없음*, 메서드 하나뿐.

```javascript
// After
class Shipment {
  constructor(shippingCompany, trackingNumber) {
    this._shippingCompany = shippingCompany;
    this._trackingNumber = trackingNumber;
  }
  get trackingInfo() { return `${this._shippingCompany}: ${this._trackingNumber}`; }
}
```

한 단계 제거. 호출 chain이 짧아진다.

## 예시 2 — 잘못된 추출 되돌리기

```javascript
// Before — Person에서 PersonValidator를 추출했지만 활용 안 됨
class PersonValidator {
  validate(person) {
    if (!person.name) throw new Error("name required");
    if (person.age < 0) throw new Error("age invalid");
  }
}

class Person {
  constructor(name, age) {
    this._name = name;
    this._age = age;
    new PersonValidator().validate(this);
  }
}
```

`PersonValidator`가 *오직 Person에서만* 사용. 분리의 가치 없음.

```javascript
// After
class Person {
  constructor(name, age) {
    if (!name) throw new Error("name required");
    if (age < 0) throw new Error("age invalid");
    this._name = name;
    this._age = age;
  }
}
```

검증이 *생성자 안*에 직접. 한 클래스로 합쳐졌고 *검증 - 데이터 책임*은 어차피 Person에 묶여 있었다.

## 예시 3 — 두 클래스 강한 결합

```javascript
// Before — Order와 OrderDetails가 거의 항상 같이
class OrderDetails {
  constructor(customerId, shippingAddress) {
    this._customerId = customerId;
    this._shippingAddress = shippingAddress;
  }
}

class Order {
  constructor(items, orderDetails) {
    this._items = items;
    this._details = orderDetails;
  }
  get customerId()      { return this._details._customerId; }   // 또는 getter delegate
  get shippingAddress() { return this._details._shippingAddress; }
}
```

`OrderDetails`가 *Order 안에서만* 살고 모든 호출이 위임을 거친다. 합치자.

```javascript
// After
class Order {
  constructor(items, customerId, shippingAddress) {
    this._items = items;
    this._customerId = customerId;
    this._shippingAddress = shippingAddress;
  }
  get customerId()      { return this._customerId; }
  get shippingAddress() { return this._shippingAddress; }
}
```

위임이 사라지고 *Order가 자체로 완전*.

## 자주 보는 안티패턴

### 1. 너무 일찍 인라인
Extract Class를 한 지 얼마 안 됐는데 *책임이 자랄 시간*을 주지 않고 인라인하면, 곧 다시 같은 분리가 필요해진다. *충분히 관찰* 후 결정.

### 2. 한 번에 *큰 클래스 인라인*
500줄 클래스를 한 번에 흡수하면 흡수 클래스가 *god class*가 된다. 단계적으로.

### 3. 외부 노출 클래스 인라인
public API로 노출된 클래스를 인라인하면 *모든 사용자가 깨진다*. 먼저 deprecated → migration.

### 4. *진짜 책임 있는* 클래스 인라인
얇아 보이지만 *향후 확장 가능성*이 있는 클래스를 성급히 합치면 *재추출*이 필요해진다. 추가 메서드 가능성 검토.

### 5. 다른 곳에서 *조용히 쓰던* 클래스 인라인
"이 클래스는 X에서만 쓰여" 라고 가정했지만 *동적 호출, reflection, lib 외부* 사용 누락. 신중히 검색.

## Modern variants

### IDE의 inline class
IntelliJ, Rider는 *자동으로 모든 사용처* 갱신. 안전.

### TypeScript module 통합
별도 파일에 있던 작은 클래스를 *같은 파일로* 가져오면서 인라인. import 줄어듦.

### Rust struct merge
Rust에선 lifetime·ownership 관계 정리도 함께. 두 struct가 *완전 결합*이면 합쳐서 *self-ownership*으로.

## 도구 / IDE

| 도구 | 기능 |
| --- | --- |
| IntelliJ | "Inline Class" |
| Rider | "Inline" |
| Eclipse | Inline Class refactoring |
| VS Code | 수동 |

## 성능 고려

객체 한 단계 제거 → 메모리·호출 비용 감소. 보통 *측정 가능한 차이 없음*.

## 관련 패턴

- **역연산**: [Pattern 16: Extract Class](/blog/programming/design/refactoring-catalog/pattern16-extract-class)
- **함수 이동**: [Pattern 21: Move Function](/blog/programming/design/refactoring-catalog/pattern21-move-function)
- **필드 이동**: [Pattern 22: Move Field](/blog/programming/design/refactoring-catalog/pattern22-move-field)
- **위임 제거**: [Pattern 19: Remove Middle Man](/blog/programming/design/refactoring-catalog/pattern19-remove-middle-man)
- **함수 인라인**: [Pattern 2: Inline Function](/blog/programming/design/refactoring-catalog/pattern02-inline-function)
