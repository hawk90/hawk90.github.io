---
title: "Pattern 45: Replace Parameter with Query"
date: 2026-05-02T21:00:00
description: "함수가 스스로 알 수 있는 값을 매개변수로 받지 않는다 — caller 부담 제거."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 45
tags: [refactoring, parameter-query, fowler]
draft: true
type: book-review
bookTitle: "Refactoring: Improving the Design of Existing Code, 2nd Edition"
bookAuthor: "Martin Fowler"
---

## 한 줄 요약

> 함수가 *스스로 알아낼 수 있는 값*을 매개변수로 받는다면, 매개변수 제거 후 *내부에서 query*. caller의 책임 줄이고 signature 단순화.

## 동기 (Motivation)

매개변수는 *호출자가 결정*하는 입력. 그러나 어떤 매개변수는 *항상 같은 출처*에서 나온다 — caller가 *매번 같은 query를 호출해 전달*. 함수가 *직접 query*하면 *caller 부담 제거*.

```javascript
// Before — caller가 매번 동일한 query
class Order {
  get finalPrice() {
    const basePrice = this._quantity * this._itemPrice;
    let discountLevel;
    if (this._quantity > 100) discountLevel = 2;
    else discountLevel = 1;
    return this.discountedPrice(basePrice, discountLevel);
  }
  discountedPrice(basePrice, discountLevel) {
    switch (discountLevel) {
      case 1: return basePrice * 0.95;
      case 2: return basePrice * 0.9;
    }
  }
}
```

`discountedPrice`가 `discountLevel`을 받지만, *항상 같은 방식*으로 계산되어 전달됨. 메서드가 *스스로 알 수 있는 정보*.

```javascript
// After
class Order {
  get finalPrice() {
    return this.discountedPrice(this._quantity * this._itemPrice);
  }
  discountedPrice(basePrice) {
    switch (this._discountLevel) {
      case 1: return basePrice * 0.95;
      case 2: return basePrice * 0.9;
    }
  }
  get _discountLevel() {
    return this._quantity > 100 ? 2 : 1;
  }
}
```

`discountLevel`이 *getter*가 되어 함수가 *내부에서 query*. caller 단순화.

### 신호

- 매개변수가 *항상 같은 식*으로 *호출자에서 계산*.
- 다른 호출자가 *전달하는 값이 모두 동일*.
- 매개변수의 *진짜 의미*가 함수와 같은 객체에 있음.

### 언제 적용하는가

- 매개변수가 *함수가 속한 객체의 정보*만으로 계산 가능.
- query가 *순수*하고 referential transparency.
- *signature 단순화*가 가독성에 도움.

### 언제 적용하지 않는가

- 매개변수가 *호출 컨텍스트에 따라 다름* (caller 결정).
- query가 *외부 의존* (DB, API) — 함수의 *순수성 깨짐*.
- *함수의 재사용성* 감소.

변환 구조를 한눈에 보면 다음과 같다.

![Pattern 45 — before/after 구조](/images/blog/refactoring-catalog/diagrams/pattern45-replace-parameter-with-query.svg)

## 절차 (Mechanics)

1. **query function** 추출/존재 확인.
2. **매개변수 제거**, 내부에서 query 호출.
3. **호출처에서 매개변수 전달 제거**.
4. 컴파일·테스트.

## 예시 1 — 위 discountedPrice

참고.

## 예시 2 — 외부 상태 query

```javascript
// Before
function discountFor(customer, today) {
  if (today.isWeekend()) return 0.1;
  return customer.standardDiscount;
}

// 호출
const d = discountFor(customer, new Date());
```

`today`가 *항상 현재*. 함수가 *직접 가져오는 게 자연*.

```javascript
// After
function discountFor(customer) {
  if (new Date().isWeekend()) return 0.1;   // 또는 clock service
  return customer.standardDiscount;
}

const d = discountFor(customer);
```

caller 단순. 단 *테스트성*은 떨어질 수 있음 — `today`가 *주입*되면 *고정 시간으로 테스트* 가능. 그래서 *순수 함수형 코드*에서는 [Replace Query with Parameter](/blog/programming/design/refactoring-catalog/pattern46-replace-query-with-parameter)가 종종 더 유리.

## 예시 3 — 객체 자신의 state

```javascript
// Before
class Thermostat {
  setTemperature(target, currentMode) {
    if (currentMode === "auto") this._adjust(target);
    else this._setManual(target);
  }
}

// 호출
thermostat.setTemperature(72, thermostat.mode);
```

`currentMode`는 *항상 thermostat.mode*.

```javascript
// After
class Thermostat {
  setTemperature(target) {
    if (this._mode === "auto") this._adjust(target);
    else this._setManual(target);
  }
}

thermostat.setTemperature(72);
```

caller가 *thermostat 내부를 모르고도* 호출 가능.

## 자주 보는 안티패턴

### 1. *테스트성 손상*
매개변수 → query 변환으로 *test에서 mock 어려움*. clock·random·DB 같은 *변동 source*는 매개변수로 두는 게 testable.

### 2. *Hidden dependency*
함수가 *어떤 state*에 의존하는지 *signature에서 안 보임* — 추론 어려움. *명시적 의존*이 안전한 경우 많음.

### 3. *Pure function 깨기*
query가 *외부 상태*면 함수가 *non-pure*가 됨. 메모이즈/병렬화 어려워짐.

### 4. *과도한 query 사용*
함수 본문이 *self.x, self.y, self.z* 가득 — *Move Function*이 답일 수 있음.

### 5. *Caller 통제권 제거*
caller가 *값을 다르게 전달*하고 싶었을 수도 — 강제 query는 *유연성 손실*.

### 6. *동시성 race*
query가 *공유 state* 읽으면 *concurrent caller가 다른 값* 볼 수 있음 — lock/atomic.

## Modern variants

### Class state encapsulation

OOP의 자연스러운 형태 — 객체가 *자기 state*에 접근.

### Dependency injection 대안

DI는 *명시적 매개변수*. 어느 쪽이 옳은지는 *테스트 + 결합* 균형으로 결정.

### Reactive (Vue computed)

```javascript
const order = reactive({
  quantity: 0,
  itemPrice: 100,
  get discountLevel() { return this.quantity > 100 ? 2 : 1; },
  get finalPrice()    { return this.discountedPrice(this.quantity * this.itemPrice); }
});
```

자동 reactivity로 query 변경 자동 전파.

### Rust — `&self` query

```rust
impl Order {
    fn discount_level(&self) -> u32 { if self.quantity > 100 { 2 } else { 1 } }
    fn final_price(&self) -> f64 {
        self.discounted_price(self.quantity as f64 * self.item_price)
    }
}
```

## 도구 / IDE

| 도구 | 기능 |
| --- | --- |
| IntelliJ | "Replace Parameter with Query" |
| Rider | 같음 |
| Resharper | "Inline parameter value" |

## 성능 고려

query 호출은 *함수 호출 한 단계* — 무관. 단 query가 *비싸면* (DB, 계산) caller에서 *한 번 계산해 매개변수로 전달*이 빠를 수 있음.

## 관련 패턴

- **역방향**: [Pattern 46: Replace Query with Parameter](/blog/programming/design/refactoring-catalog/pattern46-replace-query-with-parameter)
- **자매**: [Pattern 32: Replace Derived Variable with Query](/blog/programming/design/refactoring-catalog/pattern32-replace-derived-variable-with-query)
- **객체화**: [Pattern 44: Preserve Whole Object](/blog/programming/design/refactoring-catalog/pattern44-preserve-whole-object)
