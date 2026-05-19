---
title: "Pattern 57: Remove Subclass"
date: 2026-05-02T09:00:00
description: "Subclass가 더 이상 가치 없을 때 — 제거하고 type field로 단순화."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 57
tags: [refactoring, remove-subclass, fowler]
draft: true
type: book-review
bookTitle: "Refactoring: Improving the Design of Existing Code, 2nd Edition"
bookAuthor: "Martin Fowler"
---

## 한 줄 요약

> Subclass가 *trivial* (override 없음, 차이 없음)이라면 *type field*로 대체하고 subclass 제거. 단순함이 미덕.

## 동기 (Motivation)

[Replace Type Code with Subclasses](/blog/programming/design/refactoring-catalog/pattern56-replace-type-code-with-subclasses)의 *역방향*. 시간이 지나며 *subclass별 차이가 사라질 수* 있다. 행동이 통합되거나, 차이가 *데이터로 표현 가능*해진다.

```javascript
// Before — trivial subclass
class Person {
  constructor(name) { this._name = name; this._genderCode = "X"; }
  get name() { return this._name; }
  get genderCode() { return this._genderCode; }
}
class Male extends Person {
  get genderCode() { return "M"; }
}
class Female extends Person {
  get genderCode() { return "F"; }
}
```

Male/Female 차이가 *genderCode 값*뿐. *override 한 줄*. subclass의 의미가 약함.

```javascript
// After
class Person {
  constructor(name, genderCode) {
    this._name = name;
    this._genderCode = genderCode;
  }
  get name() { return this._name; }
  get genderCode() { return this._genderCode; }
}

// Factory도 단순화
function createPerson(name, genderCode) {
  return new Person(name, genderCode);
}
```

class 수 1/3로 감소. *데이터 차이*만 남았으면 *데이터로 표현*.

### 신호

- subclass가 *getter 한두 개만 override*.
- subclass가 *field 차이만 다름*.
- 상속 계층이 *깊은데 행동 차이 거의 없음*.
- `instanceof` 체크가 *type 식별 용도로만* 사용.

### 언제 적용하는가

- subclass 차이가 *trivial* (1-2 메서드, 단순 값).
- *다형성 활용도 낮음*.
- 미래에 *행동 분기 추가 가능성 낮음*.

### 언제 적용하지 않는가

- 향후 *행동 분기 예상* — 미리 subclass 유지.
- 다른 코드가 *subclass type을 활용*.
- *sealed type 안전성* 가치 큼.

## 절차 (Mechanics)

1. **factory function** 도입 — caller가 `new Male()` 대신 `createPerson("M")`.
2. **type 의존 코드** 모두 factory 통과시킴.
3. **type 식별 method** (`isMale()`) 등 추가, `instanceof` 체크 대체.
4. **subclass의 method를 superclass로** (필요 시 conditional 추가).
5. **subclass 제거**.
6. 컴파일·테스트.

## 예시 1 — 위 Person 예 참고.

## 예시 2 — Type 의존 method 통합

```javascript
// Before
class Employee {
  get description() { return `${this.name} the ${this.type}`; }
  get type() { return ""; }
}
class FullTimeEmployee extends Employee {
  get type() { return "fulltime"; }
  get vacationDays() { return 20; }
}
class PartTimeEmployee extends Employee {
  get type() { return "parttime"; }
  get vacationDays() { return 10; }
}
```

차이가 *데이터 두 값*뿐.

```javascript
// After
class Employee {
  constructor(name, type, vacationDays) {
    this._name = name;
    this._type = type;
    this._vacationDays = vacationDays;
  }
  get description() { return `${this._name} the ${this._type}`; }
  get type() { return this._type; }
  get vacationDays() { return this._vacationDays; }
}

const fullTime = new Employee("Alice", "fulltime", 20);
const partTime = new Employee("Bob", "parttime", 10);
```

## 예시 3 — Subclass 부분 제거

3개 subclass 중 *2개만 trivial*이면 *2개만 제거*.

```javascript
// Before
class Animal {}
class Dog extends Animal { sound() { return "woof"; } }
class Cat extends Animal { sound() { return "meow"; } }
class Lion extends Animal {
  sound() { return "roar"; }
  hunt() { /* complex */ }
}

// After (Dog/Cat 제거)
class Animal {
  constructor(soundType) { this._soundType = soundType; }
  sound() {
    switch (this._soundType) {
      case "dog": return "woof";
      case "cat": return "meow";
      default: throw new Error();
    }
  }
}
class Lion extends Animal {
  constructor() { super("lion"); }
  sound() { return "roar"; }
  hunt() { /* complex */ }
}
```

*복잡한 subclass(Lion)*은 유지, *trivial(Dog/Cat)*은 제거.

## 자주 보는 안티패턴

### 1. *너무 빨리 제거*
앞으로 *행동 분기 추가 예정*이면 subclass 유지. 단순화에 너무 매달리면 *재추가 부담*.

### 2. *instanceof 폭증*
subclass 제거 후 *그 자리에 instanceof 체크 가득* → 다형성 잃음. *type 식별 method* 또는 *다시 polymorphism*.

### 3. *Sealed type 가치 잃음*
Kotlin sealed class를 제거하면 *exhaustive match* 보호 사라짐. 신중히.

### 4. *Subclass 사용처 누락*
일부 caller가 *여전히 subclass type 의존* — 컴파일 깨짐. find usages 철저.

### 5. *Factory도 함께 제거*
factory가 *type 검증* 역할 있었는데 제거 — 잘못된 type 통과. factory 유지.

### 6. *History 손실*
git에서 *subclass class 사라지면* 이전 디자인 의도 손실. *commit message에 이유* 기록.

## Modern variants

### Sealed → enum

```kotlin
// Before
sealed class Gender { object Male : Gender(); object Female : Gender() }

// After
enum class Gender { MALE, FEMALE }
```

차이가 *type 식별만*이면 enum이 더 단순.

### TypeScript

```typescript
// Before
class Male extends Person {}
class Female extends Person {}

// After
type Gender = "male" | "female";
class Person { constructor(public gender: Gender) {} }
```

### Rust enum simplification

```rust
// Before — variants with no data
enum Status { Active, Pending, Closed }

// 행동 차이 없으면 그대로 OK. 다만 trait 구현이 많아지면 다시 보기.
```

## 도구 / IDE

| 도구 | 기능 |
| --- | --- |
| IntelliJ | "Inline Class" — subclass를 superclass에 합침 |
| Rider | 같음 |
| Eclipse | "Inline" |

## 성능 고려

class 수 감소 → *vtable 단순*. 메모리/속도 미세 차이 (일반 무관).

## 관련 패턴

- **역방향**: [Pattern 56: Replace Type Code with Subclasses](/blog/programming/design/refactoring-catalog/pattern56-replace-type-code-with-subclasses)
- **자매**: [Pattern 59: Collapse Hierarchy](/blog/programming/design/refactoring-catalog/pattern59-collapse-hierarchy)
- **inline**: [Pattern 17: Inline Class](/blog/programming/design/refactoring-catalog/pattern17-inline-class)
