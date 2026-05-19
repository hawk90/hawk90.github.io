---
title: "Pattern 34: Change Value to Reference"
date: 2026-05-02T10:00:00
description: "여러 곳에 복사된 같은 객체 — 단일 reference로 통합."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 34
tags: [refactoring, reference, identity, fowler]
draft: true
type: book-review
bookTitle: "Refactoring: Improving the Design of Existing Code, 2nd Edition"
bookAuthor: "Martin Fowler"
---

## 한 줄 요약

> 같은 *identity*의 데이터가 여러 곳에 *복사*되어 있다면, 단일 reference로 합쳐 *update가 한 번에* 반영되게.

## 동기 (Motivation)

[Pattern 33: Change Reference to Value](/blog/programming/design/refactoring-catalog/pattern33-change-reference-to-value)의 *역방향*. 데이터가 어느 쪽인지는 *도메인이 결정*한다.

`Customer`가 여러 `Order`에 *값으로 복사*되어 있는 경우.

```javascript
class Order {
  constructor(data) {
    this._customer = new Customer(data.customer);   // 매 order마다 새 Customer
  }
}
```

같은 customer가 3개의 order를 내면 *Customer instance가 3개*. 한 customer의 *이름 변경*은:
- 3개의 order에서 각각 갱신해야 함.
- 하나라도 빼먹으면 *일관성 깨짐*.
- *동일성 비교*가 reference 비교로 안 됨.

→ identity를 가진 entity로 전환. *repository*에서 같은 ID에 대해 *같은 instance* 반환.

```javascript
class CustomerRepository {
  constructor() { this._customers = new Map(); }
  findById(id) {
    if (!this._customers.has(id)) {
      this._customers.set(id, new Customer(id, ...));
    }
    return this._customers.get(id);   // 같은 ID → 같은 instance
  }
}

class Order {
  constructor(data) {
    this._customer = customerRepo.findById(data.customerId);   // shared
  }
}
```

이제 `customer.name = "..."` 한 번이면 *모든 order에 반영*.

### 신호

- 같은 데이터가 *여러 객체에 복사*됨.
- 한 곳의 update가 *다른 곳에 반영 안 됨* bug.
- *identity 비교* 필요해짐 ("같은 사람인가?").
- *외부 시스템*과 데이터 동기화 (DB row).

### 언제 적용하는가

- 데이터가 *식별 가능*하고 update가 의미를 가짐.
- *DDD entity* 모델로 표현하고 싶음.
- 한 곳에서 변경한 결과가 *모든 사용처에 반영*되어야 함.

### 언제 적용하지 않는가

- 데이터가 *진짜 immutable* 또는 *공유 update 의미 없음* — value object 유지.
- 단순한 *snapshot*이 의도.

## 절차 (Mechanics)

1. **Repository 도입** — ID로 instance lookup.
2. **Factory/Builder**를 repository로 라우팅.
3. *기존 value 생성 지점*을 repository lookup으로 교체.
4. 컴파일·테스트.

## 예시 1 — Customer를 reference로

```javascript
// Before — value Customer
class Customer {
  constructor(data) {
    this._id = data.id;
    this._name = data.name;
  }
  get id()   { return this._id; }
  get name() { return this._name; }
}

class Order {
  constructor(data) {
    this._customer = new Customer(data.customer);   // 매번 새 instance
  }
  get customer() { return this._customer; }
}

// 사용
const order1 = new Order({ customer: { id: 1, name: "Alice" } });
const order2 = new Order({ customer: { id: 1, name: "Alice" } });
order1.customer === order2.customer;   // false — 다른 instance
```

```javascript
// After — repository로 단일 instance
class CustomerRepository {
  constructor() { this._customers = new Map(); }
  registerCustomer(id) {
    if (!this._customers.has(id)) {
      this._customers.set(id, new Customer(id));
    }
    return this._customers.get(id);
  }
  findCustomer(id) { return this._customers.get(id); }
}

const repo = new CustomerRepository();

class Order {
  constructor(data) {
    this._customer = repo.registerCustomer(data.customer.id);
    // 이름·기타 데이터는 customer가 보유
  }
  get customer() { return this._customer; }
}

const order1 = new Order({ customer: { id: 1 } });
const order2 = new Order({ customer: { id: 1 } });
order1.customer === order2.customer;   // true — 같은 instance

order1.customer.name = "Bob";
order2.customer.name;   // "Bob" — 자동 반영
```

## 예시 2 — 외부 데이터 source

repository가 *DB*에서 인스턴스를 load할 수도 있다.

```javascript
class CustomerRepository {
  constructor(db) { this._db = db; this._cache = new Map(); }
  async findById(id) {
    if (!this._cache.has(id)) {
      const row = await this._db.query("SELECT * FROM customers WHERE id = ?", id);
      this._cache.set(id, new Customer(row));
    }
    return this._cache.get(id);
  }
}
```

같은 ID에 대해 *한 번만 load*, 이후는 캐시 — *identity map* 패턴. ORM (Hibernate, ActiveRecord)이 자동.

## 예시 3 — Order/Customer dependency injection

repository를 *parameter*로 받으면 테스트 용이.

```javascript
class OrderFactory {
  constructor(customerRepo) { this._customerRepo = customerRepo; }
  create(data) {
    const customer = this._customerRepo.findById(data.customerId);
    return new Order(customer, data.items);
  }
}

// 테스트
const fakeRepo = { findById: (id) => ({ id, name: "Test" }) };
const factory = new OrderFactory(fakeRepo);
```

## 자주 보는 안티패턴

### 1. *Global singleton repository*
`CustomerRepository.instance` static — 테스트 분리 어려움, 동시성 문제. *dependency injection*.

### 2. *Identity map* 메모리 leak
캐시가 *영구 유지*되면 메모리 누수. weak reference (JS `WeakMap`, Java `WeakHashMap`) 또는 LRU.

### 3. *concurrent registerCustomer race*
다중 스레드에서 두 thread가 동시에 `registerCustomer(1)` 호출 → 두 instance 생성. lock/atomic 필요.

### 4. *Mutable value를 reference로 둠*
value object를 reference로 만들면 *공유 mutation* 위험 부활. *immutable로 유지하면서 식별*은 별도 ID로.

### 5. *Repository에 비즈니스 로직*
repository는 *lookup만* 책임. 비즈니스 로직은 entity 또는 service.

### 6. *모든 객체를 reference로*
DDD에서 *entity*는 reference, *value object*는 value. 도메인에 맞춰 구분.

## Modern variants

### ORM (Hibernate, ActiveRecord, Prisma)

`entityManager.find(Customer.class, 1)` — 같은 session에서 *identity map* 자동.

```java
Customer a = em.find(Customer.class, 1);
Customer b = em.find(Customer.class, 1);
a == b;   // true (same session)
```

### Flyweight 패턴

```javascript
class IconFactory {
  constructor() { this._icons = new Map(); }
  get(name) {
    if (!this._icons.has(name)) this._icons.set(name, new Icon(name));
    return this._icons.get(name);
  }
}
```

같은 icon 한 번만 instance. 메모리 절약.

### Identity map (Domain-Driven Design)

repository = *load + identity map*. Eric Evans DDD 책에서 명시.

### React — Context 또는 Redux store

```javascript
const { user } = useContext(UserContext);   // 같은 user 공유
```

값을 props로 전달하지 않고 *공유 store*에서 lookup.

### Rust — `Rc`/`Arc`

```rust
use std::rc::Rc;
let customer = Rc::new(Customer::new(1));
let order1 = Order::new(Rc::clone(&customer));
let order2 = Order::new(Rc::clone(&customer));
```

reference count로 *공유*. 단 mutation에는 `RefCell`/`Mutex` 추가.

## 도구 / IDE

| 도구 | 기능 |
| --- | --- |
| ORM | Hibernate, JPA, ActiveRecord, Prisma, Diesel |
| Identity map | 거의 모든 ORM 내장 |
| DI 프레임워크 | Spring, Guice, Dagger, InversifyJS |

## 성능 고려

- *Identity map*은 캐시 — *반복 lookup 빠름*.
- 캐시 *invalidation* 정책 중요 (TTL, LRU, weak ref).
- *Concurrent access* 시 lock overhead — read-heavy면 `ConcurrentHashMap` 등.

## 관련 패턴

- **역방향**: [Pattern 33: Change Reference to Value](/blog/programming/design/refactoring-catalog/pattern33-change-reference-to-value)
- **준비**: [Pattern 12: Encapsulate Record](/blog/programming/design/refactoring-catalog/pattern12-encapsulate-record)
- **DDD**: aggregate root, repository, identity map
