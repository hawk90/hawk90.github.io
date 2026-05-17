---
title: "Pattern 38: Replace Conditional with Polymorphism"
date: 2026-06-02T14:00:00
description: "타입별 분기 — switch가 여러 곳에 흩어진다면 다형성에게."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 38
tags: [refactoring, polymorphism, switch, fowler]
draft: true
type: book-review
bookTitle: "Refactoring: Improving the Design of Existing Code, 2nd Edition"
bookAuthor: "Martin Fowler"
---

## 한 줄 요약

> `switch (type)` 같은 *타입 기반 분기*가 여러 곳에 흩어져 있다면, 다형성으로 옮긴다. 새 type 추가가 *기존 코드 수정*이 아닌 *새 class 추가*가 된다.

## 동기 (Motivation)

조건문 자체는 자연스럽다. 그러나 *type을 기준으로 한 분기*가 *코드베이스 여러 곳에 같은 형태*로 반복되면 문제다. 새 type을 추가하려면 *모든 switch를 찾아 수정*해야 하고, 한 곳을 빠뜨리면 *조용한 bug*다 — Open/Closed Principle 위반의 전형.

```javascript
// Before — type 분기가 여러 메서드에 반복
class Bird {
  constructor(data) {
    this._type = data.type;
    this._name = data.name;
    this._numberOfCoconuts = data.numberOfCoconuts;
    this._voltage = data.voltage;
    this._isNailed = data.isNailed;
  }
  get plumage() {
    switch (this._type) {
      case "EuropeanSwallow": return "average";
      case "AfricanSwallow":  return this._numberOfCoconuts > 2 ? "tired" : "average";
      case "NorwegianBlueParrot": return this._voltage > 100 ? "scorched" : "beautiful";
      default: return "unknown";
    }
  }
  get airSpeedVelocity() {
    switch (this._type) {
      case "EuropeanSwallow": return 35;
      case "AfricanSwallow":  return 40 - 2 * this._numberOfCoconuts;
      case "NorwegianBlueParrot": return this._isNailed ? 0 : 10 + this._voltage / 10;
      default: return null;
    }
  }
}
```

같은 switch가 *2개의 method에* 동일한 형태로 반복. *새 bird type 추가*는 두 곳을 수정. 자칫 한 곳 누락.

다형성으로 옮기면 *각 type별로 한 class*. 새 type은 *새 class 추가*만으로 끝.

```javascript
// After
class Bird {
  get plumage() { return "unknown"; }
  get airSpeedVelocity() { return null; }
}

class EuropeanSwallow extends Bird {
  get plumage() { return "average"; }
  get airSpeedVelocity() { return 35; }
}

class AfricanSwallow extends Bird {
  constructor(data) { super(data); this._numberOfCoconuts = data.numberOfCoconuts; }
  get plumage() { return this._numberOfCoconuts > 2 ? "tired" : "average"; }
  get airSpeedVelocity() { return 40 - 2 * this._numberOfCoconuts; }
}

class NorwegianBlueParrot extends Bird {
  constructor(data) { super(data); this._voltage = data.voltage; this._isNailed = data.isNailed; }
  get plumage() { return this._voltage > 100 ? "scorched" : "beautiful"; }
  get airSpeedVelocity() { return this._isNailed ? 0 : 10 + this._voltage / 10; }
}

function createBird(data) {
  switch (data.type) {
    case "EuropeanSwallow":     return new EuropeanSwallow(data);
    case "AfricanSwallow":      return new AfricanSwallow(data);
    case "NorwegianBlueParrot": return new NorwegianBlueParrot(data);
    default: return new Bird(data);
  }
}
```

switch는 *단 한 곳* (factory) — 새 type은 *class 추가 + factory에 한 줄*.

### 신호

- 같은 `switch (type)`이 *여러 메서드*에 반복.
- 새 type 추가 시 *여러 곳* 수정.
- 한 type만 가지는 *특수 필드*가 다른 type에서 의미 없음.
- *enum + switch* 패턴이 도메인 어디나.

### 언제 적용하는가

- type 분기가 *3곳 이상*에 같은 형태로 반복.
- 새 type *추가 빈도가 높음*.
- 각 type이 *고유 데이터/행동*을 가짐.
- 다형성 비용 < 변경 비용.

### 언제 적용하지 않는가

- type이 *고정* (절대 새로 추가 안 됨) — switch도 OK.
- 분기가 *단 한 곳*뿐 — 다형성 도입은 과잉.
- 언어가 *sealed/exhaustive match* 지원 — 새 type 빠뜨림이 컴파일 에러 (Rust, Kotlin sealed class).

## 절차 (Mechanics)

1. **base class와 subclasses** 준비 (없으면 [Replace Type Code with Subclasses](/blog/programming/design/refactoring-catalog/pattern56-replace-type-code-with-subclasses)).
2. **factory function**으로 적절 subclass 인스턴스 반환.
3. **switch가 있는 method**를 base class에 두고, 각 subclass에서 override.
4. switch 분기 *한 case씩 옮김*.
5. 모든 case 옮겼으면 switch 제거 (default만 base에 유지).
6. 컴파일·테스트.

## 예시 1 — 위 Bird

참고: 코드는 동기 섹션에 있음.

## 예시 2 — Strategy 패턴 변형

상속 대신 *composition*. 분기 로직을 *strategy 객체*에.

```javascript
// After (strategy)
const speedStrategies = {
  EuropeanSwallow:     (data) => 35,
  AfricanSwallow:      (data) => 40 - 2 * data.numberOfCoconuts,
  NorwegianBlueParrot: (data) => data.isNailed ? 0 : 10 + data.voltage / 10,
};

class Bird {
  constructor(data) { this._data = data; this._strategy = speedStrategies[data.type]; }
  get airSpeedVelocity() { return this._strategy ? this._strategy(this._data) : null; }
}
```

class 늘리지 않고 분기 제거. 단 *type별 데이터 차이*가 크면 strategy가 어색.

## 예시 3 — State 패턴

분기가 *현재 상태*에 따라 다르면 *state machine*으로.

```javascript
class Order {
  constructor() { this._state = new PendingState(); }
  pay()    { this._state = this._state.pay(this); }
  cancel() { this._state = this._state.cancel(this); }
}

class PendingState {
  pay(order)    { return new PaidState(); }
  cancel(order) { return new CancelledState(); }
}

class PaidState {
  pay(order)    { throw new Error("already paid"); }
  cancel(order) { return new RefundingState(); }
}
```

`switch (state)`가 *각 state class의 method*가 된다.

## 자주 보는 안티패턴

### 1. *모든 switch를 다형성으로*
한 곳뿐인 switch는 *그대로*가 더 단순. 다형성 도입은 *반복 + 변경 빈도*가 정당화.

### 2. *Class explosion*
1000개의 micro type 모두 class → *class만 많고 의미 없음*. *공통 행동*이 적으면 strategy/data table.

### 3. *Subclass가 행동 거의 동일*
override가 한두 method만 다름 — *상속보단 composition* (strategy).

### 4. *Type가 자주 바뀜*
order의 *status가 시간에 따라 변경*되는데 subclass로 표현 → 인스턴스가 *type 변경 불가*. State 패턴 또는 별도 status field.

### 5. *기존 switch 그대로 + 다형성도*
중복. 마이그레이션 *완전히 끝낸다*.

### 6. *Sealed match 무시*
Rust/Kotlin sealed는 *exhaustive*. 새 type 추가가 *컴파일 에러*로 보호. 굳이 다형성 안 가도 OK.

## Modern variants

### Rust — `enum` + `match`

```rust
enum Bird {
    EuropeanSwallow,
    AfricanSwallow { coconuts: u32 },
    NorwegianBlueParrot { voltage: u32, is_nailed: bool },
}

impl Bird {
    fn air_speed_velocity(&self) -> Option<f64> {
        match self {
            Bird::EuropeanSwallow => Some(35.0),
            Bird::AfricanSwallow { coconuts } => Some(40.0 - 2.0 * (*coconuts as f64)),
            Bird::NorwegianBlueParrot { voltage, is_nailed } =>
                if *is_nailed { Some(0.0) } else { Some(10.0 + *voltage as f64 / 10.0) },
        }
    }
}
```

exhaustive match — 새 variant 추가 시 *컴파일 에러*. 다형성 클래스 없이 *type-safe 분기*.

### Kotlin — sealed class

```kotlin
sealed class Bird {
    object EuropeanSwallow : Bird()
    data class AfricanSwallow(val coconuts: Int) : Bird()
    data class NorwegianBlueParrot(val voltage: Int, val isNailed: Boolean) : Bird()
}

fun Bird.airSpeedVelocity() = when (this) {
    EuropeanSwallow         -> 35
    is AfricanSwallow       -> 40 - 2 * coconuts
    is NorwegianBlueParrot  -> if (isNailed) 0 else 10 + voltage / 10
}
```

### TypeScript — discriminated union

```typescript
type Bird =
  | { type: "EuropeanSwallow" }
  | { type: "AfricanSwallow"; coconuts: number }
  | { type: "NorwegianBlueParrot"; voltage: number; isNailed: boolean };

function airSpeed(b: Bird): number {
  switch (b.type) {
    case "EuropeanSwallow":     return 35;
    case "AfricanSwallow":      return 40 - 2 * b.coconuts;
    case "NorwegianBlueParrot": return b.isNailed ? 0 : 10 + b.voltage / 10;
  }
}
```

`switch (b.type)`의 *exhaustive check*가 TS 4.x+ 강력.

### Pattern matching (Java 21+)

```java
sealed interface Bird {}
record EuropeanSwallow() implements Bird {}
record AfricanSwallow(int coconuts) implements Bird {}

int airSpeed(Bird b) {
    return switch (b) {
        case EuropeanSwallow e -> 35;
        case AfricanSwallow a  -> 40 - 2 * a.coconuts();
    };
}
```

## 도구 / IDE

| 도구 | 기능 |
| --- | --- |
| IntelliJ | "Replace conditional with polymorphism" |
| Rider | 같음 |
| ESLint (TS) | exhaustive check warning |

## 성능 고려

다형성은 *vtable lookup* — 보통 무시. JIT 인라인으로 비용 사라짐. *극한 hot path*에서는 enum + switch가 약간 빠를 수 있음 (CPU branch prediction).

## 관련 패턴

- **준비**: [Pattern 56: Replace Type Code with Subclasses](/blog/programming/design/refactoring-catalog/pattern56-replace-type-code-with-subclasses)
- **분해**: [Pattern 35: Decompose Conditional](/blog/programming/design/refactoring-catalog/pattern35-decompose-conditional)
- **자매**: [Pattern 39: Introduce Special Case](/blog/programming/design/refactoring-catalog/pattern39-introduce-special-case)
- **반대 (subclass 제거)**: [Pattern 60: Remove Subclass](/blog/programming/design/refactoring-catalog/pattern60-remove-subclass)
