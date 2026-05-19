---
title: "Pattern 9: Combine Functions into Class"
date: 2026-05-02T09:00:00
description: "같은 데이터를 다루는 함수들을 한 클래스로 모은다 — 도메인 모델 발견."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 9
tags: [refactoring, class-extraction, domain-model, fowler]
draft: true
type: book-review
bookTitle: "Refactoring: Improving the Design of Existing Code, 2nd Edition"
bookAuthor: "Martin Fowler"
---

## 한 줄 요약

> 함수들이 같은 데이터를 계속 만진다면, 그 안에 *클래스가 숨어* 있다.

## 동기 (Motivation)

같은 데이터 그룹을 다루는 함수가 여러 개 있고 그 함수들이 비슷한 매개변수를 받는다면, *암묵적으로 객체가 존재*하는 것이다. 클래스로 묶으면 다음 일이 일어난다.

1. **데이터 + 동작의 결합** — *어떤 함수가 그 데이터에 적용 가능한지* 한눈에 보인다.
2. **API 단순화** — 호출자가 함수 5개를 외울 필요가 없다. 객체 하나의 메서드.
3. **derived value 캐싱** — 객체가 내부 상태를 가질 수 있어 *계산 결과 재사용* 가능.
4. **도메인 모델 발견** — `Reading`, `Order`, `Customer` 같은 *영역 단어*가 코드에 자리잡는다.

[Introduce Parameter Object](/blog/programming/design/refactoring-catalog/pattern08-introduce-parameter-object)의 자연스러운 연장. 매개변수가 묶이고 → 그것을 다루는 함수도 같이 묶이는 흐름.

### 신호

- 함수들이 *같은 record나 매개변수 그룹*을 반복해서 받는다.
- 그 데이터에 *파생 값(derived)*을 계산하는 함수가 *늘어나는 추세*.
- 도메인 개념이 함수 사이에 흩어져 있고 *중심점이 없다*.
- 클라이언트 코드가 *항상 같은 객체*에 여러 함수를 차례로 호출한다.

### 언제 적용하는가

- 함수가 3개 이상 같은 데이터 그룹을 받는다.
- 그 데이터의 *형태가 안정적*이다 (자주 바뀐다면 [Combine Functions into Transform](/blog/programming/design/refactoring-catalog/pattern10-combine-functions-into-transform)이 더 적합).
- 객체의 *상태 변경* 가능성을 열어두고 싶다.
- 도메인 모델을 *명시적*으로 만들고 싶다.

## 절차 (Mechanics)

1. 데이터를 [Encapsulate Record](/blog/programming/design/refactoring-catalog/pattern12-encapsulate-record)로 감싼다 (이미 객체면 생략).
2. 함수들을 *한 곳씩* [Move Function](/blog/programming/design/refactoring-catalog/pattern21-move-function)으로 새 클래스로 이동.
3. 매개변수가 클래스 데이터와 *중복*되면 제거.
4. *파생 값* 함수는 계산 메서드(getter 또는 memoized)로.
5. 클라이언트 호출을 메서드 호출로 바꾼다.

## 예시 1 — 전형적 케이스

```javascript
// Before — 함수 4개가 같은 reading을 받음
function base(reading)         { return reading.month * reading.quantity; }
function taxableCharge(reading){ return Math.max(0, base(reading) - taxThreshold(reading.year)); }
function calculateBaseCharge(reading) { return base(reading); }

// 호출
const reading = { customer: "ivan", quantity: 10, month: 5, year: 2026 };
const base    = calculateBaseCharge(reading);
const tax     = taxableCharge(reading);
```

`reading` 매개변수가 모든 함수에 등장. *진짜 주인*은 `Reading`이다.

```javascript
// After
class Reading {
  constructor(data) {
    this._customer = data.customer;
    this._quantity = data.quantity;
    this._month    = data.month;
    this._year     = data.year;
  }
  get customer() { return this._customer; }
  get quantity() { return this._quantity; }
  get month()    { return this._month; }
  get year()     { return this._year; }

  get baseCharge()    { return this.month * this.quantity; }
  get taxableCharge() { return Math.max(0, this.baseCharge - taxThreshold(this.year)); }
}

// 호출
const reading = new Reading({ customer: "ivan", quantity: 10, month: 5, year: 2026 });
const base    = reading.baseCharge;
const tax     = reading.taxableCharge;
```

함수 사이 호출 chain이 객체 내부로 들어가고, 클라이언트는 *깨끗한 API*만 본다.

## 예시 2 — Memoization 가능

객체 내부 상태로 *비싼 계산* 캐싱.

```javascript
class Reading {
  // ... 위와 같음 ...
  get baseCharge() {
    if (this._baseCharge == null) this._baseCharge = this._computeBaseCharge();
    return this._baseCharge;
  }
  _computeBaseCharge() {
    // 비싼 계산 (예: 외부 호출, 큰 데이터 처리)
    return this.month * this.quantity;
  }
}
```

함수형이면 lazy var, 절차형이면 위 패턴.

## 예시 3 — 다른 객체와 협력

```javascript
// 새 메서드 추가 자연스러움
class Reading {
  // ...
  compare(other) { return this.baseCharge - other.baseCharge; }
  isHigherThan(other) { return this.compare(other) > 0; }
  withYear(newYear) {
    return new Reading({ customer: this._customer, quantity: this._quantity,
                         month: this._month, year: newYear });
  }
}
```

객체 *간 협력 메서드*, *시간 여행 메서드* — 모두 자연스럽게 추가.

## 자주 보는 안티패턴

### 1. 너무 모든 함수를 클래스로
*도메인 응집이 약한* 함수까지 같은 클래스에 넣으면 god class. *통일된 책임*이 보이는 묶음만.

### 2. anemic domain model
객체에 *getter/setter만* 두고 동작은 외부 service에 두면 클래스화의 가치 절반만. 동작도 같이 이동 ([Move Function](/blog/programming/design/refactoring-catalog/pattern21-move-function)).

### 3. mutable 객체 남용
객체화 후 *setter 천국*이 되면 invariant 깨지기 쉽다. 필요한 곳만 mutable, 나머지는 immutable + `with...` 메서드.

### 4. 상속으로 도망
클래스로 묶다 보면 *공통 부분*이 보여 base class를 만들고 싶어진다. *상속은 마지막 수단*. 우선 composition + delegation.

### 5. *순수 함수*가 더 어울리는 경우
계산만 하고 *상태 없음*이면 [Combine Functions into Transform](/blog/programming/design/refactoring-catalog/pattern10-combine-functions-into-transform)이 더 적합. 함수형 사고 권장.

### 6. 이름이 약함
`ReadingHelper`, `ReadingManager`, `ReadingUtils` — 의미를 못 담음. *도메인 단어*로.

## Modern variants

### Kotlin data class

```kotlin
data class Reading(
    val customer: String,
    val quantity: Int,
    val month: Int,
    val year: Int,
) {
    val baseCharge: Int get() = month * quantity
    val taxableCharge: Int get() = maxOf(0, baseCharge - taxThreshold(year))
}
```

자동 equals, hashCode, copy.

### Rust struct + impl

```rust
struct Reading { customer: String, quantity: i32, month: u32, year: u32 }

impl Reading {
    fn base_charge(&self) -> i32 { self.month as i32 * self.quantity }
    fn taxable_charge(&self) -> i32 { (self.base_charge() - tax_threshold(self.year)).max(0) }
}
```

### Python dataclass

```python
@dataclass(frozen=True)
class Reading:
    customer: str
    quantity: int
    month: int
    year: int

    @property
    def base_charge(self) -> int: return self.month * self.quantity
    @property
    def taxable_charge(self) -> int: return max(0, self.base_charge - tax_threshold(self.year))
```

### TypeScript + 메서드

```typescript
class Reading {
  constructor(
    readonly customer: string,
    readonly quantity: number,
    readonly month: number,
    readonly year: number,
  ) {}
  get baseCharge() { return this.month * this.quantity; }
  get taxableCharge() { return Math.max(0, this.baseCharge - taxThreshold(this.year)); }
}
```

## Class vs Transform 결정 트리

```text
함수 묶음이 같은 데이터 그룹을 다룬다
├── 상태 변경 있는가?
│   ├── YES → Combine into Class
│   └── NO →
│       ├── derived 값만 만드는가? → Combine into Transform
│       └── 그래도 객체 식이 자연스러운가? → Combine into Class
└── 데이터가 자주 형태 변하는가?
    ├── YES → Transform (lightweight)
    └── NO → Class (heavyweight, but rich)
```

## 도구 / IDE

| 도구 | 기능 |
| --- | --- |
| IntelliJ | "Move Method" 반복 |
| Rider | 수동 |
| VS Code | TypeScript code action 일부 |

대부분 수동. *한 함수씩* Move Method로 옮긴다.

## 성능 고려

객체 할당 비용. 만약 객체가 *짧은 라이프타임*이면 JIT의 escape analysis가 스택 할당으로 최적화 (Java HotSpot, V8).

## 관련 패턴

- **대안**: [Pattern 10: Combine Functions into Transform](/blog/programming/design/refactoring-catalog/pattern10-combine-functions-into-transform)
- **도구**: [Pattern 12: Encapsulate Record](/blog/programming/design/refactoring-catalog/pattern12-encapsulate-record), [Pattern 21: Move Function](/blog/programming/design/refactoring-catalog/pattern21-move-function)
- **자매**: [Pattern 8: Introduce Parameter Object](/blog/programming/design/refactoring-catalog/pattern08-introduce-parameter-object)
- **단일 필드 값 객체**: [Pattern 14: Replace Primitive with Object](/blog/programming/design/refactoring-catalog/pattern14-replace-primitive-with-object)
