---
title: "Pattern 51: Pull Up Method"
date: 2026-06-03T03:00:00
description: "Subclass 여러 곳에 같은 method가 있으면 — superclass로 올려 DRY."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 51
tags: [refactoring, inheritance, pull-up-method, fowler]
draft: true
type: book-review
bookTitle: "Refactoring: Improving the Design of Existing Code, 2nd Edition"
bookAuthor: "Martin Fowler"
---

## 한 줄 요약

> 여러 subclass에 *동일한 method*가 있다면 superclass로 끌어올려 *중복 제거*. 상속 계층의 가장 일반적인 리팩토링.

## 동기 (Motivation)

상속 계층은 *공통 동작*을 superclass에서 표현하고 *차이*만 subclass에서 표현하기 위해 존재한다. subclass가 *같은 method*를 *복제*하고 있다면 그 의미가 깨진다 — 한 subclass의 변경이 *다른 subclass에 자동으로 반영되지 않고*, 변경을 빠뜨리면 *일관성 붕괴*.

```javascript
// Before — 중복
class Employee {}
class Salesperson extends Employee {
  get name() { return this._name; }
}
class Engineer extends Employee {
  get name() { return this._name; }
}
```

`name` getter가 두 subclass에 *완전 동일*. 새 subclass 추가하면 *또 복사*.

```javascript
// After
class Employee {
  get name() { return this._name; }
}
class Salesperson extends Employee {}
class Engineer extends Employee {}
```

`name`이 *한 곳*. 새 subclass는 *자동으로 상속*.

### 신호

- 두 subclass 이상에 *signature + body 동일* method.
- 비슷하지만 *micro difference* — 통합 가능한지 검토.
- 새 subclass 추가 시 *같은 method 복사*.
- bug fix가 *한 subclass에만 적용*되고 다른 곳에서 같은 bug 재발.

### 언제 적용하는가

- method가 *2개 이상의 subclass*에 동일.
- *상속 계층 자체가 적절* — composition으로 옮길 게 아님.
- subclass들이 *진짜 형제*.

### 언제 적용하지 않는가

- *우연히 같은* method (의미가 다름) — 추출하면 향후 변경 방해.
- 한 subclass에만 있는 *unique behavior*.
- 상속이 잘못된 모델링 — *Push Down*이나 *Composition*이 답.

## 절차 (Mechanics)

1. **target method들이 진짜 동일**한지 확인 — variable 이름, 호출 method 모두.
2. signature 다르면 [Change Function Declaration](/blog/programming/design/refactoring-catalog/pattern05-change-function-declaration)으로 통일.
3. **한 subclass의 method를 superclass로 복사**.
4. *다른 subclass의 같은 method 제거*.
5. 컴파일·테스트.
6. (반복) 모든 subclass에서 제거되면 끝.

## 예시 1 — 위 name 예 참고.

## 예시 2 — Form Template Method 변형

```javascript
// Before
class Site {}
class ResidentialSite extends Site {
  get monthlyCharge() {
    const baseAmount = this._readings.current - this._readings.previous;
    const taxableAmount = Math.max(0, baseAmount - this._tax.threshold);
    return baseAmount * this._rate + taxableAmount * this._tax.rate;
  }
}
class LifelineSite extends Site {
  get monthlyCharge() {
    const baseAmount = this._readings.current - this._readings.previous;
    const taxableAmount = Math.max(0, baseAmount - this._tax.threshold);
    return baseAmount * this._rate + taxableAmount * this._tax.rate;
  }
}
```

method가 *완전 동일* — pull up 가능.

```javascript
// After
class Site {
  get monthlyCharge() {
    const baseAmount = this._readings.current - this._readings.previous;
    const taxableAmount = Math.max(0, baseAmount - this._tax.threshold);
    return baseAmount * this._rate + taxableAmount * this._tax.rate;
  }
}
class ResidentialSite extends Site {}
class LifelineSite extends Site {}
```

만약 *micro 차이*가 있다면 → **Form Template Method**.

```javascript
// 두 subclass가 *대부분 같지만 한 단계 다름*
class Site {
  get monthlyCharge() {
    return this._baseCharge() + this._taxCharge();   // template
  }
  _baseCharge() { /* common */ }
  _taxCharge()  { return 0; }                        // hook — subclass에서 override
}
class ResidentialSite extends Site {
  _taxCharge() { return /* full tax */; }
}
class LifelineSite extends Site {
  _taxCharge() { return 0; }                         // lifeline은 무세
}
```

공통은 *템플릿*, 차이는 *hook method*.

## 예시 3 — Signature 통일 후 pull up

```javascript
// Before — signature 다름
class Salesperson extends Employee {
  totalAnnualCost() { return this._monthlyCost * 12; }
}
class Engineer extends Employee {
  annualCost() { return this._monthlyCost * 12; }
}
```

이름이 다름 — *Change Function Declaration*으로 통일 후 pull up.

```javascript
// Step 1: Rename
class Salesperson extends Employee {
  annualCost() { return this._monthlyCost * 12; }
}
class Engineer extends Employee {
  annualCost() { return this._monthlyCost * 12; }
}

// Step 2: Pull Up
class Employee {
  annualCost() { return this._monthlyCost * 12; }
}
class Salesperson extends Employee {}
class Engineer extends Employee {}
```

## 자주 보는 안티패턴

### 1. *부분 일치를 강제 통합*
80% 같지만 20% 다름 → pull up 후 *if 분기 가득*. *Template Method*나 *Strategy* 활용.

### 2. *Field 차이 무시*
method가 같지만 *참조 field가 subclass마다 다른 이름/타입* → 컴파일 실패 또는 silent bug. *Pull Up Field* 먼저.

### 3. *Liskov 위반*
method를 모든 subclass에 의미 있게 적용 못 함 → 일부 subclass에서 *unsupported exception*. 옳지 않음.

### 4. *Premature pull up*
subclass가 *2개뿐인데 한 method만 같음* — 우연일 수도. 충분한 *반복*을 본 후.

### 5. *Composition 회피*
inheritance가 어울리지 않는데 강제 pull up → 깊은 계층. composition 검토.

### 6. *Multiple inheritance 무시*
JS/Java 등 single inheritance에서 *공통이지만 직계 부모 없음* — mixin/trait 또는 *common parent 추가* 필요.

## Modern variants

### Java/Kotlin abstract class

```kotlin
abstract class Employee {
    abstract val monthlyCost: Int
    fun annualCost(): Int = monthlyCost * 12   // 공통
}
```

### TypeScript abstract

```typescript
abstract class Employee {
  abstract get monthlyCost(): number;
  annualCost(): number { return this.monthlyCost * 12; }
}
```

### Rust — default trait method

```rust
trait Employee {
    fn monthly_cost(&self) -> u32;
    fn annual_cost(&self) -> u32 { self.monthly_cost() * 12 }   // default impl
}
```

trait의 *default method*는 pull up과 같은 효과. *상속 없이* 표현.

### Mixin (Ruby, Scala)

여러 모듈에서 공통 method를 *섞어 넣음*. 다중 상속 대안.

### Composition over inheritance

```javascript
class Employee {
  constructor(costCalculator) { this._calc = costCalculator; }
  annualCost() { return this._calc.calculate(); }
}
```

상속 자체를 회피.

## 도구 / IDE

| 도구 | 기능 |
| --- | --- |
| IntelliJ / WebStorm | "Pull Members Up" (Ctrl+Alt+Shift+P 또는 Refactor menu) |
| Eclipse | "Pull Up" |
| Rider (C#) | "Pull Members Up" |

자동 도구가 *모든 subclass의 method 동일성 확인 + 안전한 이동*. *수동 pull up은 실수* 위험.

## 성능 고려

상속 계층은 *vtable lookup*. JIT 인라인. 런타임 영향 무시.

## 관련 패턴

- **역방향**: [Pattern 54: Push Down Method](/blog/programming/design/refactoring-catalog/pattern54-push-down-method)
- **자매**: [Pattern 52: Pull Up Field](/blog/programming/design/refactoring-catalog/pattern52-pull-up-field), [Pattern 53: Pull Up Constructor Body](/blog/programming/design/refactoring-catalog/pattern53-pull-up-constructor-body)
- **부분 일치**: Form Template Method (GoF Template Method)
- **준비**: [Pattern 5: Change Function Declaration](/blog/programming/design/refactoring-catalog/pattern05-change-function-declaration)
