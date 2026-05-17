---
title: "Pattern 47: Remove Setting Method"
date: 2026-06-02T23:00:00
description: "Constructor 이후 변경되면 안 되는 field — setter를 제거해 immutable로."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 47
tags: [refactoring, immutability, setter, fowler]
draft: true
type: book-review
bookTitle: "Refactoring: Improving the Design of Existing Code, 2nd Edition"
bookAuthor: "Martin Fowler"
---

## 한 줄 요약

> field가 *생성 이후 변경될 의도가 없다*면 setter를 제거한다. setter의 존재 자체가 *변경 가능성을 광고*하므로.

## 동기 (Motivation)

객체 생성 시 한 번 설정된 후 *변경되면 안 되는 field*가 있다 — `id`, `dateOfBirth`, 외부 시스템 키 같은 *identity 속성*. setter를 두면:

- "이 field 바꿔도 되나?" 의심이 *호출자마다 발생*.
- 누군가 *실수로 변경* → 식별성 깨짐.
- *invariant*가 silent하게 위반.

setter 제거가 *컴파일 시점 보호*.

```javascript
// Before
class Person {
  constructor(id) { this._id = id; this._name = ""; }
  get id() { return this._id; }
  set id(arg) { this._id = arg; }   // ← id 변경 가능
  get name() { return this._name; }
  set name(arg) { this._name = arg; }
}

// 다른 곳에서
person.id = 999;   // 위험 — 같은 person인 척 다른 ID
```

```javascript
// After
class Person {
  constructor(id) { this._id = id; this._name = ""; }
  get id() { return this._id; }
  // id setter 제거
  get name() { return this._name; }
  set name(arg) { this._name = arg; }
}

person.id = 999;   // 에러 — getter only
```

`id`가 *생성 시 한 번만 결정*. 이후 변경 불가.

### 신호

- 생성자에서 *모든 field setting* 후 *바깥에서 setter 호출 거의 없음*.
- field가 *identity*에 해당 (id, key).
- *concurrent code*에서 race condition 의심.
- DDD value object로 모델링하고 싶음.

### 언제 적용하는가

- field가 *immutable identity*.
- 객체가 *value-like* — 변경되면 *새 객체*가 자연.
- setter를 *어디서도 호출 안 함* (조사 후).

### 언제 적용하지 않는가

- field가 *진짜 mutable* (lifecycle 동안 변경).
- ORM이 *setter로 hydrate* — 제거 시 hydration 깨짐 (특수 메서드/reflection 필요).
- *serialization framework*가 setter 의존.

## 절차 (Mechanics)

1. **setter 호출처 조사** — IDE find usages.
2. *생성자에서만* 호출되면 → constructor에서 직접 설정, setter 제거.
3. *외부에서 호출*되면 → 호출처 정리 (constructor로 옮김 또는 setter 유지).
4. 컴파일·테스트.

## 예시 1 — Identity field 보호

위 Person 예 참고.

## 예시 2 — Constructor 강화

```javascript
// Before
class Order {
  constructor() { /* nothing */ }
  set customerId(arg) { this._customerId = arg; }
  set orderDate(arg)  { this._orderDate = arg; }
}

// 사용
const o = new Order();
o.customerId = 42;
o.orderDate = new Date();
```

객체가 *부분 초기화 상태*. invariant 검증 어려움.

```javascript
// After
class Order {
  constructor(customerId, orderDate) {
    this._customerId = customerId;
    this._orderDate = orderDate;
  }
  get customerId() { return this._customerId; }
  get orderDate()  { return this._orderDate; }
}

const o = new Order(42, new Date());
```

객체가 *완전 초기화*된 상태로 탄생. setter 없음.

## 예시 3 — ORM 호환

ORM이 setter를 *필요*로 한다면 *protected setter* 또는 *factory method* 활용.

```javascript
// Hibernate/JPA style (Java)
class Customer {
  private Long id;
  // private setter for ORM only
  private void setId(Long id) { this.id = id; }
  public Long getId() { return id; }
}
```

```javascript
// TS 패턴
class Customer {
  private constructor(private readonly _id: number, private _name: string) {}

  static fromDb(row: any): Customer {
    return new Customer(row.id, row.name);   // factory가 ID 결정
  }
}
```

## 자주 보는 안티패턴

### 1. *모든 setter 제거*
setter가 진짜 필요한 field (`name`, `email`)도 제거 → *변경 불가*. 진짜 *immutable이어야 하는* field만.

### 2. *Test setup* 부담
test에서 setter로 *변형* 활용 — 제거 시 builder/factory 필요. test 인프라 함께 정비.

### 3. *Reflection으로 우회*
setter 없어도 reflection으로 변경. 진짜 보호는 *언어 차원의 immutability* (`final`/`readonly`/`val`).

### 4. *Subclass에서 setter 부활*
부모가 setter 제거했는데 subclass가 추가 → *Liskov 위반*. 일관성 유지.

### 5. *Constructor injection 부담*
의존이 많아 constructor signature 거대. *Builder* 또는 *parameter object*.

### 6. *Lazy initialization*과 충돌
field가 *최초 호출 시 계산*되어야 한다면 setter 형태 internal 유지, public은 getter만.

## Modern variants

### Java `final` field

```java
public class Person {
    private final String id;   // immutable
    private String name;       // mutable
    public Person(String id) { this.id = id; }
}
```

### Kotlin `val` vs `var`

```kotlin
class Person(val id: String, var name: String)
// id는 val (immutable), name은 var (mutable)
```

### C# `init` accessor (C# 9+)

```csharp
public record Person {
    public string Id { get; init; }   // constructor·object initializer 에서만 set
    public string Name { get; set; }  // 일반 setter
}
```

### TypeScript `readonly`

```typescript
class Person {
  constructor(readonly id: string, public name: string) {}
}
```

### Rust — 기본 immutable

```rust
struct Person {
    id: String,        // immutable by default
    name: String,
}
```

mut 키워드 없으면 변경 불가.

## 도구 / IDE

| 도구 | 기능 |
| --- | --- |
| IntelliJ | "Make Field Final" |
| Resharper (C#) | "Make Property Readonly" |
| ESLint | `prefer-const`, `@typescript-eslint/prefer-readonly` |
| Lombok | `@Value` 또는 `final` field |

## 성능 고려

immutable field는 *compile-time 보장*. *thread-safety free* — 동기화 비용 없음.

객체 변경이 *새 객체 생성*으로 바뀜 — 빈번한 변경에서 *GC 부담*. structural sharing(Immer 등)으로 완화.

## 관련 패턴

- **준비**: [Pattern 6: Encapsulate Variable](/blog/programming/design/refactoring-catalog/pattern06-encapsulate-variable)
- **자매**: [Pattern 33: Change Reference to Value](/blog/programming/design/refactoring-catalog/pattern33-change-reference-to-value)
- **Factory**: [Pattern 48: Replace Constructor with Factory Function](/blog/programming/design/refactoring-catalog/pattern48-replace-constructor-with-factory-function)
