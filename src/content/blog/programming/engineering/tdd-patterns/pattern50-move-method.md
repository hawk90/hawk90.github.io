---
title: "Pattern 50: Move Method"
date: 2026-05-10T02:00:00
description: "Method가 다른 class에서 더 잘 살면 — 이사. Feature Envy 해소."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 50
tags: [tdd, beck, move-method, feature-envy]
draft: true
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> Method가 *다른 class의 데이터*를 더 많이 사용하면 그 class로 이동. *Feature Envy* 해소.

## 동기 (Motivation)

```python
class Order:
    def __init__(self, customer):
        self.customer = customer

    def calculate_discount(self):
        # customer 데이터만 사용
        if self.customer.membership_years > 5: return 0.2
        elif self.customer.total_purchases > 10000: return 0.15
        elif self.customer.is_vip: return 0.1
        return 0
```

`calculate_discount`가 *customer 정보만* 사용. *Customer*에 있어야.

### 신호

- method가 *자기 class 데이터 거의 사용 안 함*.
- *다른 class 메서드만 호출*.
- *getter chaining* — `self.other.data.value`.
- *Demeter 위반*.

### 언제 적용하는가

- *Feature envy* 명확.
- 데이터와 행동을 *함께 둠*.
- *응집도 ↑*.

### 언제 적용하지 않는가

- method가 *진짜 양쪽 데이터 사용*.
- *순환 의존* 만들지 않게 주의.
- *interface 노출* 부적절.

## 절차 (Mechanics)

1. **대상 class에 method 복사**.
2. *self 참조 수정* (this.customer.X → this.X).
3. **원본을 delegate**로.
4. *호출자 점진 이전*.
5. **원본 제거**.

## 예시 1 — Discount → Customer

```python
# After
class Customer:
    def discount_rate(self):
        if self.membership_years > 5: return 0.2
        elif self.total_purchases > 10000: return 0.15
        elif self.is_vip: return 0.1
        return 0

class Order:
    def total(self):
        subtotal = sum(item.price for item in self.items)
        discount = self.customer.discount_rate()   # 위임
        return subtotal * (1 - discount)
```

데이터와 행동 *함께*.

## 예시 2 — Parameter 활용

```python
# Before
class Report:
    def format_amount(self, account):
        return f"${account.balance:.2f} ({account.currency})"

# After
class Account:
    def format_amount(self):
        return f"${self.balance:.2f} ({self.currency})"

class Report:
    def render(self, account):
        return account.format_amount()
```

## 예시 3 — 양방향 참조

```python
# Before
class Order:
    def notify(self):
        msg = f"Order {self.id} for {self.customer.name}"
        self.customer.send_email(msg)

# After — Order 자체를 parameter로
class Customer:
    def notify_order(self, order):
        msg = f"Order {order.id} for {self.name}"
        self.send_email(msg)

class Order:
    def notify(self):
        self.customer.notify_order(self)
```

self를 *parameter로* 넘김.

## 자주 보는 안티패턴

### 1. *양방향 의존 만들기*
이동 후 *Customer → Order, Order → Customer* 모두 → 순환. *단방향* 유지.

### 2. *Polymorphism 깨기*
override되는 method 이동 → 다형성 깨짐. *전체 계층* 함께.

### 3. *Move 후 caller 누락*
일부 caller가 *원본 호출* → 일관성 깨짐. find usages.

### 4. *Encapsulation 위반*
이동 method가 *private state 접근* → 캡슐 깨짐. *public API*만.

### 5. *Test 깨짐*
test가 *원본 위치 의존* → 이동 후 깨짐. test도 함께 이동.

### 6. *Move + Rename 동시*
한 commit에 둘 → 검토 어려움. *단계 분리*.

## Modern variants

### IDE Move Method

| IDE | 단축키 |
| --- | --- |
| IntelliJ | F6 |
| Resharper | F6 |
| VS Code | code action |

자동 + 안전 (모든 호출처 갱신).

### Move + Extract Interface

```python
class Customer:
    def discount_rate(self): ...

class Order:
    def __init__(self, customer: DiscountProvider):
        self.customer = customer
```

이동 후 *interface 추출* — DIP.

### Refactoring [Pattern 21: Move Function](/blog/programming/design/refactoring-catalog/pattern21-move-function)

Refactoring catalog의 대응.

### Trait method (Rust/Kotlin)

```kotlin
fun Customer.discountRate(): Double = when {
    membershipYears > 5 -> 0.2
    totalPurchases > 10000 -> 0.15
    isVip -> 0.1
    else -> 0.0
}
```

extension function — 원본 class 수정 없이 method 추가.

### Service object

method가 *어느 entity에도 자연스럽지 않으면* — service object.

```python
class DiscountCalculator:
    def calculate(self, customer): ...
```

## 도구 / IDE

| 도구 | Move Method |
| --- | --- |
| IntelliJ F6 | 안전 이동 |
| Rider | 같음 |
| Eclipse | "Move" refactor |
| Rust Analyzer | "Move definition" |

## 성능 고려

이동 자체는 *런타임 무관*. 호출 *depth 1단계* 추가는 JIT inline.

## Feature Envy 감별

```python
# 호출 비율
N_self = self.x, self.y, ... 호출 수
N_other(X) = other.X.a, other.X.b, ... 호출 수

if N_other(X) > N_self:
    # X로 이동 검토
```

## 관련 패턴

- [Pattern 47: Extract Method](/blog/programming/engineering/tdd-patterns/pattern47-extract-method) — 메서드 분리
- [Pattern 49: Extract Interface](/blog/programming/engineering/tdd-patterns/pattern49-extract-interface) — 인터페이스 추출
- [Pattern 51: Method Object](/blog/programming/engineering/tdd-patterns/pattern51-method-object) — 메서드를 class로
- Refactoring [Pattern 21: Move Function](/blog/programming/design/refactoring-catalog/pattern21-move-function)
- *원칙*: "Tell, don't ask"
