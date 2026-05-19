---
title: "Pattern 52: Pull Up Field"
date: 2026-05-02T04:00:00
description: "Subclass 공통 field — superclass로 끌어올려 데이터 중복 제거."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 52
tags: [refactoring, inheritance, pull-up-field, fowler]
draft: true
type: book-review
bookTitle: "Refactoring: Improving the Design of Existing Code, 2nd Edition"
bookAuthor: "Martin Fowler"
---

## 한 줄 요약

> 같은 데이터를 *여러 subclass에 같은 이름/타입*으로 보유한다면 superclass로 옮긴다. [Pull Up Method](/blog/programming/design/refactoring-catalog/pattern51-pull-up-method)의 *데이터 버전*이자 *발판*.

## 동기 (Motivation)

method를 superclass로 끌어올리려면 그 method가 사용하는 *field도 superclass에 있어야* 한다. 그래서 *Pull Up Field*는 *Pull Up Method 직전*에 자주 등장.

같은 field를 두 subclass가 *복제*하면:

- subclass 추가 시 *또 같은 field 선언*.
- field 타입 변경이 *여러 곳 동시* 필요.
- *공통 query/setter* 작성 못 함.

```javascript
// Before
class Employee {}
class Salesperson extends Employee {
  constructor() { super(); this._name = ""; }
}
class Engineer extends Employee {
  constructor() { super(); this._name = ""; }
}
```

`_name`이 두 subclass에 동일. superclass로.

```javascript
// After
class Employee {
  constructor() { this._name = ""; }
}
class Salesperson extends Employee {}
class Engineer extends Employee {}
```

### 신호

- 같은 *이름·타입·용도* field가 여러 subclass에.
- 다른 이름이지만 *의미 동일* (예: `salesNumber` vs `engNumber`이 모두 *직원번호*).
- Pull Up Method 시도 시 *field 차이로 막힘*.

### 언제 적용하는가

- field가 *2개+ subclass*에 공통.
- field 의미가 *상속 계층 전체*에서 의미.
- *Pull Up Method 준비*.

### 언제 적용하지 않는가

- field가 *일부 subclass에만 의미* — superclass에 두면 LSP 위반 / dead field.
- field가 *우연히 같은 이름* 다른 의미.

## 절차 (Mechanics)

1. **field 사용 분석** — 각 subclass에서 어떻게 쓰이는지.
2. **이름 다르면** [Rename Field](/blog/programming/design/refactoring-catalog/pattern31-rename-field)로 통일.
3. **타입 다르면** 호환 가능한 *공통 superclass type*으로 변경.
4. **superclass에 field 선언**.
5. *각 subclass에서 field 제거*.
6. 컴파일·테스트.

## 예시 1 — 위 _name 예 참고.

## 예시 2 — 이름 통일 먼저

```javascript
// Before
class Salesperson extends Employee {
  constructor() { super(); this._salesNumber = 0; }
}
class Engineer extends Employee {
  constructor() { super(); this._engineerNumber = 0; }
}
```

이름은 다르지만 *둘 다 직원번호*.

```javascript
// Step 1: Rename
class Salesperson extends Employee {
  constructor() { super(); this._employeeNumber = 0; }
}
class Engineer extends Employee {
  constructor() { super(); this._employeeNumber = 0; }
}

// Step 2: Pull Up
class Employee {
  constructor() { this._employeeNumber = 0; }
}
class Salesperson extends Employee {}
class Engineer extends Employee {}
```

## 예시 3 — 타입 통일

```javascript
// Before
class Manager extends Employee {
  constructor() { super(); this._reports = []; }   // array
}
class TeamLead extends Employee {
  constructor() { super(); this._reports = new Set(); }   // set
}
```

타입 다름 — superclass로 올리려면 *어느 쪽으로 통일*할지 결정.

```javascript
// After (Set 채택)
class Employee {
  constructor() { this._reports = new Set(); }
}
class Manager extends Employee {}
class TeamLead extends Employee {}
```

타입 변경에 따라 *사용처도 함께 수정* (Array method → Set method).

## 자주 보는 안티패턴

### 1. *우연한 일치*를 pull up
이름·타입이 같지만 *의미 다름* → 향후 변경 어려움. 의미 확인.

### 2. *Dead field*를 만듦
한 subclass에 만 의미 있는 field를 superclass로 → 다른 subclass에 *영원히 unused*. push down 검토.

### 3. *Initialization 순서 깨짐*
superclass constructor가 field 초기화 → subclass의 *기존 코드와 충돌* 가능. [Pull Up Constructor Body](/blog/programming/design/refactoring-catalog/pattern53-pull-up-constructor-body) 함께.

### 4. *Visibility 잘못*
private field를 superclass에 두면 *subclass에서 접근 불가*. `protected` 또는 *encapsulation method*.

### 5. *Premature*
2개 subclass만 있는데 *우연히 같음* → 일반화 부담. *3개 이상의 신호* 또는 *명확한 모델*.

### 6. *Composition 회피*
공통 데이터가 *공통 행동을 위한 게 아님* → 별도 component로 composition.

## Modern variants

### Java protected

```java
class Employee {
    protected String employeeNumber;
}
class Engineer extends Employee {
    // employeeNumber 직접 사용 가능
}
```

### Kotlin

```kotlin
abstract class Employee {
    protected var employeeNumber: String = ""
}
```

### Rust — composition over inheritance

```rust
struct EmployeeBase { number: String }
struct Engineer { base: EmployeeBase, ... }
struct Manager { base: EmployeeBase, ... }
```

Rust는 상속이 없음 — *composition*으로 같은 효과.

### TypeScript

```typescript
abstract class Employee {
  protected employeeNumber: number = 0;
}
class Engineer extends Employee {}
```

## 도구 / IDE

| 도구 | 기능 |
| --- | --- |
| IntelliJ | "Pull Members Up" (field도 함께 선택) |
| Eclipse | "Pull Up" — field와 method 모두 |
| Rider | 같음 |

## 성능 고려

field 위치는 *메모리 layout*만 영향 — 보통 무관. 큰 객체에서 *cache locality* 미세 변화 가능.

## 관련 패턴

- **역방향**: [Pattern 55: Push Down Field](/blog/programming/design/refactoring-catalog/pattern55-push-down-field)
- **자매**: [Pattern 51: Pull Up Method](/blog/programming/design/refactoring-catalog/pattern51-pull-up-method), [Pattern 53: Pull Up Constructor Body](/blog/programming/design/refactoring-catalog/pattern53-pull-up-constructor-body)
- **준비**: [Pattern 31: Rename Field](/blog/programming/design/refactoring-catalog/pattern31-rename-field)
