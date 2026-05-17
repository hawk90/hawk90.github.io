---
title: "Pattern 60: Replace Subclass with Delegate"
date: 2026-06-03T12:00:00
description: "상속의 강한 결합을 피하고 — 다른 차원의 다양성을 표현하기 위해 위임으로."
series: "Refactoring Catalog (Fowler 2nd ed)"
seriesOrder: 60
tags: [refactoring, delegation, composition, fowler]
draft: true
type: book-review
bookTitle: "Refactoring: Improving the Design of Existing Code, 2nd Edition"
bookAuthor: "Martin Fowler"
---

## 한 줄 요약

> *"Favor composition over inheritance."* — 상속이 한 차원의 분류만 표현하기에 부족하거나, 런타임 변경이 필요하거나, 결합을 줄이고 싶을 때 subclass를 *delegate object*로 교체.

## 동기 (Motivation)

상속의 한계:

- **단일 차원만**: subclass는 *한 분류축*에만. 두 차원(예: 영업/엔지니어 × 정규직/계약직) → *4 subclass* 폭증.
- **런타임 불변**: 인스턴스의 type을 *바꿀 수 없음*. order가 *pending → paid*로 변경되어야 하면 *새 인스턴스*.
- **강한 결합**: superclass 변경이 *모든 subclass에 직접 영향*.

```javascript
// Before — Booking + PremiumBooking
class Booking {
  constructor(show, date) { this._show = show; this._date = date; }
  get hasTalkback() { return this._show.hasOwnProperty("talkback") && !this.isPeakDay; }
  get basePrice() {
    let result = this._show.price;
    if (this.isPeakDay) result += Math.round(result * 0.15);
    return result;
  }
  get isPeakDay() { /* */ }
}

class PremiumBooking extends Booking {
  constructor(show, date, extras) { super(show, date); this._extras = extras; }
  get hasTalkback() { return this._show.hasOwnProperty("talkback"); }
  get basePrice() { return Math.round(super.basePrice + this._extras.premiumFee); }
  get hasDinner() { return this._extras.hasOwnProperty("dinner") && !this.isPeakDay; }
}
```

PremiumBooking이 subclass. 그러나:

- 한 booking이 *런타임에 premium으로 업그레이드* 못 함.
- premium이 *다른 차원의 옵션*(extras)을 가지므로 의미가 살짝 다름.

```javascript
// After — Delegate
class Booking {
  constructor(show, date) { this._show = show; this._date = date; this._premiumDelegate = null; }
  get hasTalkback() {
    return this._premiumDelegate
      ? this._premiumDelegate.hasTalkback
      : this._show.hasOwnProperty("talkback") && !this.isPeakDay;
  }
  get basePrice() {
    const base = this._show.price + (this.isPeakDay ? Math.round(this._show.price * 0.15) : 0);
    return this._premiumDelegate ? this._premiumDelegate.extendBasePrice(base) : base;
  }
  get hasDinner() {
    return this._premiumDelegate ? this._premiumDelegate.hasDinner : undefined;
  }
  // 런타임 업그레이드
  _bePremium(extras) { this._premiumDelegate = new PremiumBookingDelegate(this, extras); }
}

class PremiumBookingDelegate {
  constructor(host, extras) { this._host = host; this._extras = extras; }
  get hasTalkback() { return this._host._show.hasOwnProperty("talkback"); }
  extendBasePrice(base) { return Math.round(base + this._extras.premiumFee); }
  get hasDinner() { return this._extras.hasOwnProperty("dinner") && !this._host.isPeakDay; }
}

function createBooking(show, date) { return new Booking(show, date); }
function createPremiumBooking(show, date, extras) {
  const b = new Booking(show, date);
  b._bePremium(extras);
  return b;
}
function upgradeToPremium(booking, extras) {
  booking._bePremium(extras);
}
```

장점:
- *런타임 업그레이드 가능*.
- *premium delegate가 분리*되어 책임 명확.
- 다른 *옵션 차원* 추가 가능 (예: VIP delegate, Corporate delegate)와 *조합*.

### Composition over Inheritance

GoF의 가장 자주 인용되는 격언. 상속은 *컴파일 타임 고정*, composition은 *런타임 유연*. 새 프로젝트는 *기본 composition*, 진짜 *is-a*만 상속.

### 신호

- subclass가 *런타임 변경* 필요.
- *여러 분류 차원*이 subclass로 표현 어려움 (조합 폭증).
- *상속의 부수효과* (super 호출 잘못, override 잊음).
- *다중 superclass* 필요 (단일 상속 언어).

### 언제 적용하는가

- *동적 type 변경* 필요.
- *여러 차원 다양성*.
- *상속 깊이*가 깊어 부담.
- *composition 우선* 정책.

### 언제 적용하지 않는가

- 상속이 *명확히 어울리는* 경우.
- subclass *수가 적고 안정*.
- 성능 hot path에서 *delegate overhead* 부담.

## 절차 (Mechanics)

1. **delegate class 작성** (subclass 한 개당).
2. delegate에 *subclass의 method 옮김*.
3. main class에 *delegate field*.
4. main class method가 *delegate에 dispatch*.
5. *factory function*에서 delegate 설정.
6. subclass 제거.
7. 컴파일·테스트.

## 예시 1 — 위 Booking 예 참고.

## 예시 2 — Strategy 패턴 결합

```javascript
class Employee {
  constructor(name, paymentType) {
    this._name = name;
    this._paymentType = paymentType;   // delegate
  }
  get monthlyPay() { return this._paymentType.calculate(); }
}

class SalariedPayment {
  constructor(salary) { this._salary = salary; }
  calculate() { return this._salary;}
}
class HourlyPayment {
  constructor(rate, hours) { this._rate = rate; this._hours = hours; }
  calculate() { return this._rate * this._hours; }
}

// 런타임 변경
const e = new Employee("Alice", new SalariedPayment(5000));
e._paymentType = new HourlyPayment(50, 100);   // 동적 변경
```

### 예시 3 — 다차원 결합

```javascript
// 영업/엔지니어 × 정규직/계약직
const e1 = new Employee("A", new EngineerRole(), new FullTimeContract());
const e2 = new Employee("B", new SalesRole(),    new ContractorContract());
// ... 모든 조합 가능
```

class 폭증 없이 *조합 표현*.

## 자주 보는 안티패턴

### 1. *Delegate가 너무 thin*
delegate가 *한 method만* — 가치 적음. 진짜 *별개 책임*인지 확인.

### 2. *Main class와 delegate의 양방향 의존*
delegate가 *main을 알고*, main도 *delegate를 안다* — 순환. delegate가 *호스트 알 필요 있을 때만*.

### 3. *Delegate 누락 처리*
delegate가 *null일 때 동작* 정의 안 됨 → NPE. null check 또는 *NullObject 패턴*.

### 4. *Performance 비용*
hot path에서 *delegate 호출 + null check* 반복 — 측정 후 결정.

### 5. *상속이 옳은데 강제 composition*
*명확한 is-a*인데 composition으로 표현 → 복잡 증가. *언제 inheritance인지* 판단.

### 6. *Delegate 인터페이스 불명확*
여러 delegate가 *다른 method 시그니처* → main이 어떻게 dispatch? *interface/abstract* 정의.

## Modern variants

### GoF Strategy 패턴

본질이 동일 — *행동을 객체로 분리*.

### Trait composition (Rust)

```rust
trait Payable { fn calculate(&self) -> u32; }

struct SalariedPayment { salary: u32 }
impl Payable for SalariedPayment { fn calculate(&self) -> u32 { self.salary } }

struct Employee {
    name: String,
    payment: Box<dyn Payable>,   // dynamic dispatch
}
```

### Mixin (Scala, Ruby)

```scala
trait Salaried { def calculate(): Int }
trait Hourly { def calculate(): Int }

class Employee(name: String) extends Salaried { def calculate() = 5000 }
```

mixin이 *부분적 상속처럼* 보이지만 *delegate 효과*.

### React HOC / hooks

```javascript
function withLogging(Component) {
  return function(props) {
    log("rendering");
    return <Component {...props} />;
  };
}
```

class extension 대신 *함수 합성*.

## 도구 / IDE

| 도구 | 기능 |
| --- | --- |
| IntelliJ | "Replace Inheritance with Delegation" |
| Rider | 같음 |
| Eclipse | "Convert to Delegation" |

## 성능 고려

method 호출 한 단계 추가 — JIT 인라인. 보통 무관.

런타임 변경 능력은 *vtable 캐시 침입* 가능 — *megamorphic call site* 성능 저하 (극히 드물게).

## 관련 패턴

- **자매**: [Pattern 61: Replace Superclass with Delegate](/blog/programming/design/refactoring-catalog/pattern61-replace-superclass-with-delegate)
- **GoF**: Strategy, State, Decorator
- **격언**: "Favor composition over inheritance" (GoF, Effective Java)
