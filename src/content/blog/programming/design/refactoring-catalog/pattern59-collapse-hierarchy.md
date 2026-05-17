---
title: "Pattern 59: Collapse Hierarchy"
date: 2026-06-03T11:00:00
description: "Superclass와 subclass가 거의 동일 — 계층을 합쳐 단순화."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 59
tags: [refactoring, collapse-hierarchy, fowler]
draft: true
type: book-review
bookTitle: "Refactoring: Improving the Design of Existing Code, 2nd Edition"
bookAuthor: "Martin Fowler"
---

## 한 줄 요약

> Superclass와 한 subclass가 *거의 같아져* 두 class가 *나뉘는 의미가 사라졌다*면, 합친다.

## 동기 (Motivation)

상속 계층은 *변화의 축*을 설계자가 예측해 만든다. 그러나 예측이 빗나갈 수 있다 — *처음엔 분기될 줄 알았지만 결국 통합되거나*, *기능이 한쪽으로만 집중되어 다른 쪽이 빈 껍질*이 된다.

```javascript
// Before
class Employee {
  constructor(name) { this._name = name; }
  get name() { return this._name; }
  doWork() { return "default"; }
}
class Salesperson extends Employee {
  // 시간이 지나며 모든 차이가 사라졌다 — superclass와 동일
}
```

`Salesperson`이 *superclass와 완전 동일*. *분리 의미 0*.

```javascript
// After
class Employee {
  constructor(name) { this._name = name; }
  get name() { return this._name; }
  doWork() { return "default"; }
}
// Salesperson 제거
```

### Extract Superclass의 역방향

[Pattern 58: Extract Superclass](/blog/programming/design/refactoring-catalog/pattern58-extract-superclass)가 *분리*라면, Collapse Hierarchy는 *통합*. *디자인은 계속 진화*하며 두 방향 모두 자연스럽다.

### 신호

- subclass가 *override 없음*, 또는 *trivial*.
- superclass와 subclass의 *책임 구분 모호*.
- 새 기능이 *항상 한쪽에만 추가*되어 다른 쪽이 *비어감*.
- *분리 의도였던 차이*가 사라짐.

### 언제 적용하는가

- subclass와 superclass가 *동일에 가까움*.
- *향후 분기 가능성 낮음*.
- 계층이 *더 이상 의미 없음*.

### 언제 적용하지 않는가

- 향후 *분기 예상*.
- 다른 코드가 *type 구분 활용*.
- *Sealed type* 안전성 의존.

## 절차 (Mechanics)

1. **어느 class를 남길지** 결정 (superclass든 subclass든 *적절한 이름*).
2. 다른 class의 *남은 method/field 통합*.
3. *모든 caller*를 남은 class로 변경.
4. 한 class 제거.
5. 컴파일·테스트.

## 예시 1 — 위 Employee 예 참고.

## 예시 2 — Subclass에 모든 행동이 모임

```javascript
// Before
class Person {
  constructor(name) { this._name = name; }
}
class Adult extends Person {
  constructor(name, age) { super(name); this._age = age; }
  vote() { /* */ }
  drive() { /* */ }
  // 거의 모든 사람이 adult로 다뤄짐
}
```

Person이 사실상 *empty*. Adult가 *실질 인물*.

```javascript
// After — Person으로 통합 (Adult 이름 버림)
class Person {
  constructor(name, age) {
    this._name = name;
    this._age = age;
  }
  vote() { /* */ }
  drive() { /* */ }
}
```

## 예시 3 — 부분 collapse (다중 계층)

```javascript
// Before
class Vehicle {}
class LandVehicle extends Vehicle {}
class Car extends LandVehicle {}
class Truck extends LandVehicle {}
```

`LandVehicle`이 *중간 계층인데 차이 없음*.

```javascript
// After
class Vehicle {}
class Car extends Vehicle {}
class Truck extends Vehicle {}
```

*깊이 한 단계 감소*. 계층이 의미를 가진 부분만 남김.

## 자주 보는 안티패턴

### 1. *충동적 collapse*
*잠시 차이 없음*이라고 즉시 합치면 *나중에 분리 재투자*. 패턴이 *지속*되는지 확인.

### 2. *Sealed type 의존 코드 깨기*
`when (v) { is Car -> ...; is Truck -> ...; is LandVehicle -> ... }` exhaustive check가 *변경*. 모든 caller 정리.

### 3. *Subclass 이름 vs Superclass 이름*
어느 이름이 *더 도메인 적절*한지. 잘못 선택하면 *재이름* 필요.

### 4. *함께 collapse 누락*
계층 일부만 collapse — 결국 *애매한 중간 상태*. 한 번에 정리.

### 5. *History 손실*
collapse한 class의 *git history*가 *유실되는 것처럼 보임* — 사실 git log --follow로 추적 가능, 그러나 *이유는 commit message에*.

### 6. *Caller가 instanceof 의존*
caller가 *removed class의 instanceof* — 컴파일 깨짐. find usages.

## Modern variants

### Sealed → no sealed

```kotlin
// Before
sealed class Vehicle
class LandVehicle : Vehicle()
class Car : LandVehicle()

// After
open class Vehicle
class Car : Vehicle()
```

### TypeScript

```typescript
// Before
abstract class Person {}
class Adult extends Person { /* */ }

// After
class Person { /* */ }
```

### Rust — 계층 자체 없음

Rust는 상속 없음 — *trait + enum*. *Collapse Hierarchy*가 자주 *struct + variant 통합*.

## 도구 / IDE

| 도구 | 기능 |
| --- | --- |
| IntelliJ | "Inline Class" — subclass를 superclass에 흡수 |
| Eclipse | "Inline" |
| Rider | 같음 |

## 성능 고려

계층 단순화 → *조금 더 빠른 vtable* (한 단계). 보통 무관.

## 관련 패턴

- **역방향**: [Pattern 58: Extract Superclass](/blog/programming/design/refactoring-catalog/pattern58-extract-superclass)
- **자매**: [Pattern 57: Remove Subclass](/blog/programming/design/refactoring-catalog/pattern57-remove-subclass), [Pattern 17: Inline Class](/blog/programming/design/refactoring-catalog/pattern17-inline-class)
- **계층 대안**: [Pattern 60: Replace Subclass with Delegate](/blog/programming/design/refactoring-catalog/pattern60-replace-subclass-with-delegate)
