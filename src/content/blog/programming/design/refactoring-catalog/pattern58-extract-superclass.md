---
title: "Pattern 58: Extract Superclass"
date: 2026-05-02T10:00:00
description: "두 class에 공통 부분 — 공통 superclass 추출해 *is-a* 관계 명시."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 58
tags: [refactoring, extract-superclass, fowler]
draft: true
type: book-review
bookTitle: "Refactoring: Improving the Design of Existing Code, 2nd Edition"
bookAuthor: "Martin Fowler"
---

## 한 줄 요약

> 두 class에 *명확한 is-a 관계*와 *공통 부분*이 있다면 공통 superclass 추출. 단순 공유라면 *Extract Class (composition)*가 더 적합할 수 있다.

## 동기 (Motivation)

코드를 *진화*시키다 보면 처음에는 무관해 보였던 두 class가 *닮아 보임*. 공통 method, 공통 field, 공통 책임. 그때 superclass를 추출해 *공유*하면 DRY.

```javascript
// Before
class Department {
  constructor(name, staff) {
    this._name = name;
    this._staff = staff;
  }
  get totalAnnualCost() {
    return this._staff.map(e => e.annualCost).reduce((a, b) => a + b);
  }
  get name() { return this._name; }
  get headCount() { return this._staff.length; }
}

class Employee {
  constructor(name, id, monthlyCost) {
    this._name = name;
    this._id = id;
    this._monthlyCost = monthlyCost;
  }
  get monthlyCost() { return this._monthlyCost; }
  get name() { return this._name; }
  get id() { return this._id; }
  get annualCost() { return this._monthlyCost * 12; }
}
```

둘 다 *name*과 *cost 개념*. *Party*라는 superclass로 추출.

```javascript
// After
class Party {
  constructor(name) { this._name = name; }
  get name() { return this._name; }
  get annualCost() { return this.monthlyCost * 12; }
  get monthlyCost() { throw new Error("abstract"); }
}

class Department extends Party {
  constructor(name, staff) { super(name); this._staff = staff; }
  get headCount() { return this._staff.length; }
  get monthlyCost() {
    return this._staff.map(e => e.monthlyCost).reduce((a, b) => a + b);
  }
}

class Employee extends Party {
  constructor(name, id, monthlyCost) {
    super(name);
    this._id = id;
    this._monthlyCost = monthlyCost;
  }
  get id() { return this._id; }
  get monthlyCost() { return this._monthlyCost; }
}
```

`annualCost` 같은 *공통 로직*이 Party에. 새 Party type 추가 시 *name·annualCost 자동 상속*.

### "Is-a" vs "Has-a"

Extract Superclass는 *is-a 관계*가 명확할 때만. Department와 Employee가 *둘 다 Party*라는 *분류*가 자연스러우면 superclass. 단지 *공유 코드*만 원하면 Extract Class + composition.

```javascript
// Composition 대안
class CostCalculator {
  calculate(monthlyCost) { return monthlyCost * 12; }
}

class Department {
  constructor(name, staff) {
    this._costCalc = new CostCalculator();
    /* */
  }
  get annualCost() { return this._costCalc.calculate(this.monthlyCost); }
}
```

상속은 *강한 결합* — composition이 안전한 경우 많음.

### 신호

- 두 class에 *완전 동일*한 method.
- 두 class에 *같은 field*.
- 둘 다 *비슷한 책임*.
- 새 비슷한 class가 추가될 가능성.

### 언제 적용하는가

- *is-a 관계 명확*.
- 공통 부분이 *충분히 큼*.
- 향후 *비슷한 class 추가* 예상.

### 언제 적용하지 않는가

- *우연한 일치* — 의미가 다른데 우연히 닮음.
- *단순 코드 공유* — composition이 더 적합.
- *단일 상속 언어*에서 *이미 다른 superclass*.

## 절차 (Mechanics)

1. **공통 superclass** 작성 (또는 abstract).
2. **두 class를 superclass의 subclass로** 변경.
3. **공통 method**를 [Pull Up Method](/blog/programming/design/refactoring-catalog/pattern51-pull-up-method)로 이동.
4. **공통 field**를 [Pull Up Field](/blog/programming/design/refactoring-catalog/pattern52-pull-up-field)로 이동.
5. **constructor**도 [Pull Up Constructor Body](/blog/programming/design/refactoring-catalog/pattern53-pull-up-constructor-body).
6. 컴파일·테스트.

## 예시 1 — 위 Party 예 참고.

## 예시 2 — Abstract method 패턴

```javascript
// Before
class Cylinder {
  constructor(radius, height) { this._radius = radius; this._height = height; }
  get volume() { return Math.PI * this._radius ** 2 * this._height; }
}
class Sphere {
  constructor(radius) { this._radius = radius; }
  get volume() { return (4/3) * Math.PI * this._radius ** 3; }
}
```

`volume`이 공통 의미, 본문은 다름.

```javascript
// After
class Shape {
  constructor(radius) { this._radius = radius; }
  get radius() { return this._radius; }
  get volume() { throw new Error("abstract"); }
}
class Cylinder extends Shape {
  constructor(radius, height) { super(radius); this._height = height; }
  get volume() { return Math.PI * this.radius ** 2 * this._height; }
}
class Sphere extends Shape {
  get volume() { return (4/3) * Math.PI * this.radius ** 3; }
}
```

abstract method가 *contract* — 모든 subclass가 구현. polymorphic 사용 가능.

## 예시 3 — Template method

```javascript
// After (template method)
class Shape {
  describe() {
    return `${this.name()}: volume = ${this.volume}`;
  }
  name() { throw new Error("abstract"); }
  get volume() { throw new Error("abstract"); }
}
class Cylinder extends Shape {
  name() { return "Cylinder"; }
  get volume() { /* */ }
}
```

`describe`는 *공통 알고리즘*, hook(`name`, `volume`)이 *각 subclass에서 채움*. GoF *Template Method* 패턴.

## 자주 보는 안티패턴

### 1. *Superclass 너무 깊은 책임*
모든 공통 + 일부 일반 책임까지 → *God superclass*. *진짜 공통*만.

### 2. *Liskov 위반*
subclass가 *superclass 계약을 깨뜨림* (NotImplemented, 다른 동작). is-a 관계 확인.

### 3. *Composition을 무시*
"공통 로직 공유"는 composition으로도 가능. *is-a가 명확하지 않으면* composition.

### 4. *다중 상속 시도*
JS/Java/C#은 *단일 상속*. 여러 class에 *공통 trait* 필요 → mixin/trait/interface.

### 5. *Premature*
2 class만으로 superclass 추출은 *우연일 수도*. *3개 이상의 신호*에서.

### 6. *Subclass에 빈 method*
모든 subclass가 *어떤 method를 override*해야 한다면 abstract — 빈 default 두지 말 것.

## Modern variants

### Trait / Mixin

```rust
trait Named { fn name(&self) -> &str; }
trait Costed { fn annual_cost(&self) -> u32 { self.monthly_cost() * 12 } fn monthly_cost(&self) -> u32; }

struct Department { name: String, /* */ }
impl Named for Department { fn name(&self) -> &str { &self.name } }
impl Costed for Department { fn monthly_cost(&self) -> u32 { /* */ } }
```

*기능별 trait* — *단일 상속 제약 없음*.

### Interface segregation

```typescript
interface Named { name: string; }
interface Costed { monthlyCost: number; annualCost: number; }

class Department implements Named, Costed { /* */ }
class Employee implements Named, Costed { /* */ }
```

여러 *작은 interface*. 단일 superclass보다 유연.

### Composition root

```javascript
class Party {
  constructor(strategies) {
    this._cost = strategies.cost;
    this._name = strategies.name;
  }
  get annualCost() { return this._cost.calculate(); }
}
```

DI로 *공통 로직 주입*. 상속 없음.

## 도구 / IDE

| 도구 | 기능 |
| --- | --- |
| IntelliJ | "Extract Superclass" — 공통 추출 자동 |
| Eclipse | "Extract Superclass" |
| Rider | 같음 |

## 성능 고려

상속 계층 추가 — *vtable lookup 한 단계 더*. JIT 인라인. 무관.

## 관련 패턴

- **역방향**: [Pattern 59: Collapse Hierarchy](/blog/programming/design/refactoring-catalog/pattern59-collapse-hierarchy)
- **준비**: [Pattern 51: Pull Up Method](/blog/programming/design/refactoring-catalog/pattern51-pull-up-method), [Pattern 52: Pull Up Field](/blog/programming/design/refactoring-catalog/pattern52-pull-up-field), [Pattern 53: Pull Up Constructor Body](/blog/programming/design/refactoring-catalog/pattern53-pull-up-constructor-body)
- **대안**: [Pattern 16: Extract Class](/blog/programming/design/refactoring-catalog/pattern16-extract-class) (composition)
- **GoF**: Template Method
