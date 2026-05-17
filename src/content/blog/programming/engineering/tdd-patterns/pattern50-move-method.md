---
title: "Pattern 50: Move Method"
date: 2026-07-03T02:00:00
description: "Method가 다른 class에서 더 잘 살면 — 이사."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 50
tags: [tdd, beck, move-method, feature-envy]
draft: true
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> 메서드가 다른 클래스의 데이터를 더 많이 사용한다면 그 클래스로 옮긴다.

## 동기 (Motivation)

**Feature Envy** — 메서드가 **자기 클래스보다 다른 클래스**에 더 관심:

```python
class Order:
    def __init__(self, customer):
        self.customer = customer

    def calculate_discount(self):
        # customer의 데이터만 사용!
        if self.customer.membership_years > 5:
            return 0.2
        elif self.customer.total_purchases > 10000:
            return 0.15
        elif self.customer.is_vip:
            return 0.1
        return 0
```

`calculate_discount`는 **Customer**에 있어야 한다.

## Move Method 적용

### Before

```python
class Order:
    def __init__(self, customer, items):
        self.customer = customer
        self.items = items

    def calculate_discount(self):
        # Feature Envy — customer만 참조
        if self.customer.membership_years > 5:
            return 0.2
        elif self.customer.total_purchases > 10000:
            return 0.15
        elif self.customer.is_vip:
            return 0.1
        return 0

    def total(self):
        subtotal = sum(item.price for item in self.items)
        discount = self.calculate_discount()
        return subtotal * (1 - discount)

class Customer:
    def __init__(self):
        self.membership_years = 0
        self.total_purchases = 0
        self.is_vip = False
```

### After

```python
class Customer:
    def __init__(self):
        self.membership_years = 0
        self.total_purchases = 0
        self.is_vip = False

    def discount_rate(self):
        # 이제 자기 데이터 사용
        if self.membership_years > 5:
            return 0.2
        elif self.total_purchases > 10000:
            return 0.15
        elif self.is_vip:
            return 0.1
        return 0

class Order:
    def __init__(self, customer, items):
        self.customer = customer
        self.items = items

    def total(self):
        subtotal = sum(item.price for item in self.items)
        discount = self.customer.discount_rate()  # 위임
        return subtotal * (1 - discount)
```

## Move Method 과정

### Step 1: 대상 클래스에 메서드 복사

```python
class Customer:
    def discount_rate(self):  # 새 메서드
        if self.membership_years > 5:
            return 0.2
        elif self.total_purchases > 10000:
            return 0.15
        elif self.is_vip:
            return 0.1
        return 0
```

### Step 2: self 참조 수정

```python
# Before (Order에서)
if self.customer.membership_years > 5:

# After (Customer에서)
if self.membership_years > 5:
```

### Step 3: 원래 메서드를 delegate로

```python
class Order:
    def calculate_discount(self):
        return self.customer.discount_rate()  # delegate
```

### Step 4: 호출자 수정

```python
# 모든 호출자가 customer.discount_rate() 사용하도록 수정
total = subtotal * (1 - self.customer.discount_rate())
```

### Step 5: 원래 메서드 삭제

```python
class Order:
    # calculate_discount 삭제
    pass
```

## 파라미터가 필요한 경우

```python
# Before
class Report:
    def format_amount(self, account):
        # account의 데이터 사용
        return f"${account.balance:.2f} ({account.currency})"

# After
class Account:
    def format_amount(self):
        return f"${self.balance:.2f} ({self.currency})"

class Report:
    def render(self, account):
        return account.format_amount()  # 위임
```

## 양방향 참조가 있을 때

```python
# Before
class Order:
    def __init__(self, customer):
        self.customer = customer

    def notify(self):
        # 양쪽 데이터 필요
        message = f"Order {self.id} for {self.customer.name}"
        self.customer.send_email(message)

# After — Order를 파라미터로
class Customer:
    def notify_order(self, order):
        message = f"Order {order.id} for {self.name}"
        self.send_email(message)

class Order:
    def notify(self):
        self.customer.notify_order(self)
```

## 테스트

```python
def test_customer_discount_vip():
    customer = Customer()
    customer.is_vip = True

    assert customer.discount_rate() == 0.1

def test_customer_discount_long_member():
    customer = Customer()
    customer.membership_years = 10

    assert customer.discount_rate() == 0.2

def test_order_total_with_discount():
    customer = Customer()
    customer.is_vip = True

    order = Order(customer, [Item(100)])

    assert order.total() == 90  # 10% 할인
```

## Feature Envy 징후

```python
# 징후 1: 다른 객체의 getter 체이닝
def method(self):
    return self.other.data.value.amount

# 징후 2: 다른 객체 필드만 사용
def calculate(self):
    return self.other.a + self.other.b + self.other.c

# 징후 3: 자기 필드 미사용
def process(self):
    # self.xxx를 전혀 안 씀
    return self.collaborator.do_something()
```

## Move와 다른 리팩터링

### Move Method vs Extract Method

```python
# Extract: 같은 클래스 내 분리
def long_method(self):
    part1()
    part2()  # → extract
    part3()

# Move: 다른 클래스로 이동
def foreign_method(self):
    # 다른 객체 데이터만 사용 → move
    pass
```

### Move Method + Extract Interface

```python
# 1. Move Method로 적절한 위치로
# 2. Extract Interface로 테스트 가능하게

class PaymentProcessor:
    def calculate_fee(self, payment):
        # payment 데이터만 사용
        return payment.amount * 0.03

# After move
class Payment:
    def fee(self):
        return self.amount * 0.03

# + Extract Interface
class Chargeable(ABC):
    @abstractmethod
    def fee(self) -> float: pass
```

## 정리

- **Feature Envy 해소**
- **데이터와 행동을 함께** 배치
- **응집도 향상**
- **테스트가 이동을 보호**
- **delegate → 삭제** 순서
- **캡슐화 개선**

## 관련 패턴

- [Pattern 47: Extract Method](/blog/programming/engineering/tdd-patterns/pattern47-extract-method) — 메서드 분리
- [Pattern 49: Extract Interface](/blog/programming/engineering/tdd-patterns/pattern49-extract-interface) — 인터페이스 추출
- [Pattern 51: Method Object](/blog/programming/engineering/tdd-patterns/pattern51-method-object) — 메서드를 클래스로

