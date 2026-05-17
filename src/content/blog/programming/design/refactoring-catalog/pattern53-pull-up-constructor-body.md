---
title: "Pattern 53: Pull Up Constructor Body"
date: 2026-06-03T05:00:00
description: "Subclass constructor의 공통 setup — superclass constructor + super() 호출로."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 53
tags: [refactoring, inheritance, constructor, fowler]
draft: true
type: book-review
bookTitle: "Refactoring: Improving the Design of Existing Code, 2nd Edition"
bookAuthor: "Martin Fowler"
---

## 한 줄 요약

> Subclass constructor가 *공통 setup 코드*를 반복한다면, 그 부분을 superclass constructor로 올리고 *super()*로 호출.

## 동기 (Motivation)

Constructor는 *생성 시점의 invariant*를 설정하는 곳. 여러 subclass의 constructor가 *같은 setup*을 반복하면:

- 새 subclass 추가 시 *또 복사*.
- setup 변경이 *모든 subclass 동시* 수정.
- *initialization 순서* invariant 위반 위험.

```javascript
// Before
class Party {}
class Employee extends Party {
  constructor(name, id, monthlyCost) {
    super();
    this._name = name;
    this._id = id;
    this._monthlyCost = monthlyCost;
  }
}
class Department extends Party {
  constructor(name, staff) {
    super();
    this._name = name;
    this._staff = staff;
  }
}
```

`_name` 설정이 두 subclass에 *반복*.

```javascript
// After
class Party {
  constructor(name) {
    this._name = name;
  }
}
class Employee extends Party {
  constructor(name, id, monthlyCost) {
    super(name);
    this._id = id;
    this._monthlyCost = monthlyCost;
  }
}
class Department extends Party {
  constructor(name, staff) {
    super(name);
    this._staff = staff;
  }
}
```

공통 *name 초기화*가 superclass에. subclass는 *자기 책임*만.

### 신호

- 여러 subclass constructor가 *공통 setup*.
- *Pull Up Field* 후 자연스러운 다음 단계.
- 새 subclass에서 *같은 setup 코드 복사*.

### 언제 적용하는가

- 공통 setup이 *동일*.
- *상속 계층이 적절*.
- `super()` 호출이 *언어/관용적*으로 허용.

### 언제 적용하지 않는가

- subclass 간 *초기화 순서가 의미*인데 super() 우선이 *깨뜨림*.
- *복잡한 초기화* — Factory function이 더 적절 ([Pattern 48](/blog/programming/design/refactoring-catalog/pattern48-replace-constructor-with-factory-function)).

## 절차 (Mechanics)

1. **공통 코드 식별**.
2. 한 subclass에서 *공통 코드를 super constructor로 이동*.
3. subclass에 *super() 호출*.
4. 컴파일·테스트.
5. 다른 subclass도 같은 방식.

### Constructor restrictions

대부분 언어는 *super() 호출이 constructor 첫 줄* 강제 (Java, C#). JS는 *this 사용 전*에 super() 필수. 이 제약 안에서 *공통 코드가 첫 위치인지* 확인.

## 예시 1 — 기본 패턴

위 Party 예 참고.

## 예시 2 — 일부 공통

```javascript
// Before
class Employee extends Party {
  constructor(name, id) {
    super(name);
    this._validate(name);   // Employee-specific
    this._id = id;
    this._calculateInitialSalary();
  }
}
class Manager extends Party {
  constructor(name, level) {
    super(name);
    this._validate(name);   // 중복
    this._level = level;
  }
}
```

`_validate`가 중복 — superclass로.

```javascript
// After
class Party {
  constructor(name) {
    this._name = name;
    this._validate(name);
  }
  _validate(name) {
    if (!name) throw new Error("name required");
  }
}
class Employee extends Party {
  constructor(name, id) {
    super(name);   // _validate 포함
    this._id = id;
    this._calculateInitialSalary();
  }
}
class Manager extends Party {
  constructor(name, level) {
    super(name);
    this._level = level;
  }
}
```

## 예시 3 — Initialization order issue

```javascript
// Before — subclass가 super() 호출 *후* 일부 field 변경
class Manager extends Employee {
  constructor(name, grade) {
    super(name);
    this._grade = grade;
    this._calculateBonus();   // _grade 사용
  }
}
```

`_calculateBonus`가 subclass field 의존. super constructor에서 호출하면 *_grade가 아직 미초기화* — bug.

**해결**: subclass가 *full state 준비 후* method 호출. 또는 *초기화 method를 protected*로 분리.

```javascript
class Employee {
  constructor(name) {
    this._name = name;
    // _calculateBonus 같은 hook은 여기서 안 호출
  }
}

class Manager extends Employee {
  constructor(name, grade) {
    super(name);
    this._grade = grade;
    this._calculateBonus();   // 자기 책임
  }
}
```

## 자주 보는 안티패턴

### 1. *Super가 subclass field 의존*
초기화 순서 깨짐. virtual method를 *constructor에서 호출하지 않는다*는 격언.

### 2. *Telescoping constructor*
super(name, id, role, dept, ...) 등 많은 인자 — *Builder* 또는 *parameter object*.

### 3. *Subclass별 다른 super 호출 흐름*
super를 *조건부 호출*하거나 *생략* — 언어가 *금지*.

### 4. *Constructor에 비즈니스 로직*
constructor가 *DB load*, *side effect* — factory로 분리.

### 5. *Premature pull up*
constructor 한 줄 공통 — 부담 대비 이득 적음.

### 6. *Subclass의 cleanup 책임 누락*
super()가 *resource 획득*, subclass가 *cleanup 안 함* — leak. try/finally 또는 Destructor 패턴.

## Modern variants

### Java/Kotlin

```kotlin
abstract class Party(val name: String) {
    init { require(name.isNotBlank()) }
}
class Employee(name: String, val id: Int) : Party(name)
```

primary constructor로 깔끔.

### Rust — no constructor inheritance

```rust
struct Party { name: String }
struct Employee { party: Party, id: u32 }

impl Employee {
    fn new(name: String, id: u32) -> Self {
        Self { party: Party { name }, id }
    }
}
```

상속 없이 *composition*. 초기화 명시.

### TypeScript

```typescript
abstract class Party {
  constructor(protected name: string) {}
}
class Employee extends Party {
  constructor(name: string, private id: number) { super(name); }
}
```

`protected` parameter property — boilerplate 최소.

### Factory + private constructor

```javascript
class Employee {
  static create(name, id) {
    const e = new Employee(name);
    e._id = id;
    return e;
  }
}
```

constructor *직접 호출 없이* factory가 단계적 초기화.

## 도구 / IDE

| 도구 | 기능 |
| --- | --- |
| IntelliJ | "Pull Members Up" — constructor도 함께 |
| Rider | 같음 |

## 성능 고려

constructor 호출 한 단계 추가 — 무관. JIT 인라인.

## 관련 패턴

- **자매**: [Pattern 51: Pull Up Method](/blog/programming/design/refactoring-catalog/pattern51-pull-up-method), [Pattern 52: Pull Up Field](/blog/programming/design/refactoring-catalog/pattern52-pull-up-field)
- **대안**: [Pattern 48: Replace Constructor with Factory Function](/blog/programming/design/refactoring-catalog/pattern48-replace-constructor-with-factory-function)
- **격언**: "Don't call virtual methods in constructor"
