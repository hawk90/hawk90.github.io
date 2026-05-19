---
title: "Pattern 48: Replace Constructor with Factory Function"
date: 2026-05-02T00:00:00
description: "Constructor의 한계 — factory function이 의미 있는 이름·다양한 구성·subtype 반환을 가능하게."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 48
tags: [refactoring, factory, constructor, fowler]
draft: true
type: book-review
bookTitle: "Refactoring: Improving the Design of Existing Code, 2nd Edition"
bookAuthor: "Martin Fowler"
---

## 한 줄 요약

> Constructor는 *class와 같은 이름 + 그 class만 반환*이라는 제약이 있다. Factory function은 *의미 있는 이름·subtype·conditional 생성*까지 가능.

## 동기 (Motivation)

Constructor의 두 제약:

1. **이름 = class 이름** — `new Customer()`는 *어떤 종류의 customer*인지 표현 불가.
2. **반환 = class 인스턴스** — subtype·null·기존 인스턴스 반환 불가.

이 제약은 다음 상황에서 문제.

- *생성 종류*가 여러 가지 (`Customer.regular()`, `Customer.vip()`).
- *subtype 결정*이 입력에 따라 달라짐 — caller가 *어떤 subtype을 만들지 결정*해야 함.
- *cache/pool*에서 *기존 instance 반환* (Flyweight).
- *생성에 비동기/실패* 가능성 — constructor가 async 불가.

```javascript
// Before — constructor만
class Employee {
  constructor(name, type) {
    this._name = name;
    this._type = type;
  }
}

// 호출 — type을 string으로
const e1 = new Employee("Alice", "engineer");
const e2 = new Employee("Bob", "manager");
```

호출자가 `"engineer"` 문자열 직접 — *오타 위험*, *invalid type 가능*.

```javascript
// After — factory functions
class Employee { /* ... */ }

function createEngineer(name) { return new Employee(name, "engineer"); }
function createManager(name)  { return new Employee(name, "manager"); }

const e1 = createEngineer("Alice");
const e2 = createManager("Bob");
```

호출이 *명확*. 새 type 추가가 *함수 추가*.

### 신호

- Constructor 호출 *직전에 type/mode 인자가 매번 같음*.
- 호출자가 *string/enum*으로 종류 선택.
- 생성 로직이 *복잡*해서 constructor 본문 길어짐.
- *subtype 결정*이 입력 데이터 기반.

### 언제 적용하는가

- 생성에 *의미 있는 이름* 필요 (`fromJson`, `fromUrl`, `regular`, `vip`).
- *subtype* 반환 필요.
- *cache/pool*에서 기존 instance 반환.
- *async 생성* 필요.

### 언제 적용하지 않는가

- 단순 생성 — constructor가 충분.
- Java/C# *constructor가 더 관용적*인 컨텍스트.

## 절차 (Mechanics)

1. **factory function** 작성 — 적절 이름.
2. constructor 호출을 factory 호출로 한 곳씩 교체.
3. 가능하면 *constructor를 private* (언어 지원 시).
4. 컴파일·테스트.

## 예시 1 — Subtype 선택

```javascript
// Before
class Employee {
  constructor(name, typeCode) {
    this._name = name;
    this._typeCode = typeCode;
  }
  get type() { return Employee.legalTypeCodes[this._typeCode]; }
  static get legalTypeCodes() { return { E: "Engineer", M: "Manager", S: "Salesperson" }; }
}

const candidate = new Employee("Alice", "E");
const leadEngineer = new Employee("Bob", "E");
```

`"E"`라는 *typecode*가 호출 사이트마다 등장 — *string typo 위험*.

```javascript
// After
class Employee {
  constructor(name, typeCode) { /* ... */ }
}

function createEngineer(name)    { return new Employee(name, "E"); }
function createManager(name)     { return new Employee(name, "M"); }
function createSalesperson(name) { return new Employee(name, "S"); }

const candidate = createEngineer("Alice");
const leadEngineer = createEngineer("Bob");
```

타입 안전 + 의미 명확.

## 예시 2 — Subclass 반환

```javascript
// Before
class Employee {
  constructor(name, typeCode) {
    this._name = name;
    this._typeCode = typeCode;
  }
  // type별 method가 switch로
  doWork() {
    switch (this._typeCode) {
      case "E": return this._engineerWork();
      case "M": return this._managerWork();
    }
  }
}
```

[Replace Conditional with Polymorphism](/blog/programming/design/refactoring-catalog/pattern38-replace-conditional-with-polymorphism)이 어울리는 상황. factory가 *subtype 결정*.

```javascript
// After
class Employee { /* 공통 method */ }
class Engineer extends Employee { doWork() { return "engineering"; } }
class Manager  extends Employee { doWork() { return "managing"; } }

function createEmployee(name, typeCode) {
  switch (typeCode) {
    case "E": return new Engineer(name);
    case "M": return new Manager(name);
    default: throw new Error(`unknown type ${typeCode}`);
  }
}

const e = createEmployee("Alice", "E");   // Engineer instance
```

호출자는 *Employee 인터페이스*만 사용. 실제 subtype은 factory 결정.

## 예시 3 — Async + cache

```javascript
class Customer {
  static _cache = new Map();

  static async findById(id) {
    if (Customer._cache.has(id)) return Customer._cache.get(id);
    const data = await db.queryCustomer(id);
    const customer = new Customer(data);
    Customer._cache.set(id, customer);
    return customer;
  }

  constructor(data) { /* */ }
}

const customer = await Customer.findById(42);
```

`findById`는 *async + cache*. constructor로는 불가능.

## 자주 보는 안티패턴

### 1. *Constructor + Factory 공존*
public constructor + factory 모두 노출 → caller가 어느 걸 써야 할지 혼란. constructor *private화* (가능 시) 또는 *factory 권장 명시*.

### 2. *Factory 이름 부적절*
`create`, `make`, `instantiate` — 의미 없음. *what to create* 명시 (`createEngineer`, `fromJson`).

### 3. *Factory에 비즈니스 로직*
생성 외 로직(검증, 통계)이 factory에 — *단일 책임 위반*. 분리.

### 4. *Async factory + Sync caller*
factory가 async인데 호출자가 sync 가정 — *await 망각*. type system이 보호 (TS, Rust).

### 5. *Subtype hiding*
factory가 subtype 반환하는데 caller가 *subtype만의 method* 호출 → 결합. *Liskov 원칙* 준수.

### 6. *Class explosion*
모든 case마다 subclass → *class 폭증*. *data driven 생성*도 고려.

## Modern variants

### Java/Kotlin/Swift static factory method

```java
class Money {
    public static Money usd(BigDecimal amount) { return new Money(amount, "USD"); }
    public static Money eur(BigDecimal amount) { return new Money(amount, "EUR"); }
    private Money(BigDecimal amount, String currency) { ... }
}

Money m = Money.usd(new BigDecimal("100"));
```

*Effective Java* (Bloch) "Item 1: Consider static factory methods" — 표준 권장.

### TypeScript — `private constructor` + `static`

```typescript
class Customer {
  private constructor(public readonly id: string) {}
  static fromDb(row: any) { return new Customer(row.id); }
  static guest() { return new Customer("guest"); }
}
```

### Rust — associated function

```rust
impl Customer {
    pub fn new(id: u32) -> Self { Self { id } }
    pub fn from_db(row: DbRow) -> Self { Self { id: row.id } }
    pub fn guest() -> Self { Self { id: 0 } }
}
```

Rust는 *constructor 개념 없음* — *모두 factory*.

### GoF Factory Method 패턴

```java
abstract class Creator {
    public Product factoryMethod() {
        return new ConcreteProduct();
    }
}
```

subclass가 *구체 type 결정*. Replace Constructor의 patterny variant.

### Builder + Factory

```javascript
class OrderBuilder {
  constructor() { this._items = []; }
  addItem(i) { this._items.push(i); return this; }
  build() { return new Order(this._items); }
}

new OrderBuilder().addItem(a).addItem(b).build();
```

복잡한 생성은 *Builder*.

## 도구 / IDE

| 도구 | 기능 |
| --- | --- |
| IntelliJ | "Replace Constructor with Factory Method" |
| Rider (C#) | 같음 |
| ESLint | factory 관련 규칙은 *없음* — 수동 patterns |

## 성능 고려

함수 호출 한 단계 추가 — JIT 인라인. *cache/pool*은 *생성 비용 절감*. *async factory*는 latency 도입.

## 관련 패턴

- **자매**: [Pattern 47: Remove Setting Method](/blog/programming/design/refactoring-catalog/pattern47-remove-setting-method)
- **subtype**: [Pattern 38: Replace Conditional with Polymorphism](/blog/programming/design/refactoring-catalog/pattern38-replace-conditional-with-polymorphism)
- **GoF**: Factory Method, Abstract Factory, Builder, Prototype
