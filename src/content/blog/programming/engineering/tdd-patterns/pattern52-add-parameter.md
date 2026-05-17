---
title: "Pattern 52: Add Parameter"
date: 2026-07-03T04:00:00
description: "Function signature에 안전하게 parameter 추가."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 52
tags: [tdd, beck, add-parameter, refactor]
draft: true
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> 메서드에 새 파라미터를 추가하여 동작을 확장한다.

## 동기 (Motivation)

메서드가 **추가 정보**를 필요로 할 때:

```python
# 현재
def send_email(self, to, body):
    # 항상 기본 제목 사용
    subject = "Notification"
    self._send(to, subject, body)

# 필요
def send_email(self, to, body, subject):  # 제목도 지정 가능
    self._send(to, subject, body)
```

## Add Parameter 적용

### 기본 과정

```python
# Before
def calculate_price(self, items):
    return sum(item.price for item in items)

# After — 할인율 파라미터 추가
def calculate_price(self, items, discount_rate):
    total = sum(item.price for item in items)
    return total * (1 - discount_rate)
```

### 호출자 수정

```python
# Before
price = calculator.calculate_price(items)

# After
price = calculator.calculate_price(items, 0.1)  # 10% 할인
```

## 기본값으로 점진적 이전

### Phase 1: 기본값 추가

```python
def calculate_price(self, items, discount_rate=0):  # 기본값
    total = sum(item.price for item in items)
    return total * (1 - discount_rate)

# 기존 호출자는 변경 불필요
price = calculator.calculate_price(items)  # discount_rate=0
```

### Phase 2: 호출자 하나씩 수정

```python
# 호출자 1
price = calculator.calculate_price(items, 0.1)

# 호출자 2 (아직 미수정)
price = calculator.calculate_price(items)

# 호출자 3
price = calculator.calculate_price(items, 0.15)
```

### Phase 3: 기본값 제거 (선택)

```python
# 모든 호출자 수정 완료 후
def calculate_price(self, items, discount_rate):  # 기본값 제거
    total = sum(item.price for item in items)
    return total * (1 - discount_rate)
```

## 오버로딩 (정적 언어)

```java
// Java — 오버로딩으로 호환성 유지

// 기존 시그니처 유지
public double calculatePrice(List<Item> items) {
    return calculatePrice(items, 0);  // 새 메서드에 위임
}

// 새 시그니처
public double calculatePrice(List<Item> items, double discountRate) {
    double total = items.stream()
        .mapToDouble(Item::getPrice)
        .sum();
    return total * (1 - discountRate);
}
```

## 테스트 관점

### 기존 테스트 유지

```python
def test_calculate_price_no_discount():
    calc = Calculator()
    items = [Item(100), Item(200)]

    # 기본값 사용 — 테스트 변경 불필요
    price = calc.calculate_price(items)

    assert price == 300
```

### 새 테스트 추가

```python
def test_calculate_price_with_discount():
    calc = Calculator()
    items = [Item(100), Item(200)]

    price = calc.calculate_price(items, 0.1)

    assert price == 270  # 300 * 0.9
```

## TDD 흐름에서

### Red

```python
def test_calculate_price_with_tax():
    calc = Calculator()
    items = [Item(100)]

    price = calc.calculate_price(items, tax_rate=0.1)  # 새 파라미터

    assert price == 110  # 100 + 10% 세금
```

### Green

```python
def calculate_price(self, items, tax_rate=0):
    total = sum(item.price for item in items)
    return total * (1 + tax_rate)  # 세금 적용
```

### Refactor

```python
def calculate_price(self, items, tax_rate=0, discount_rate=0):
    subtotal = sum(item.price for item in items)
    after_discount = subtotal * (1 - discount_rate)
    return after_discount * (1 + tax_rate)
```

## 파라미터 객체로 변환

파라미터가 **많아지면** 객체로 묶기:

```python
# Before — 파라미터 폭발
def calculate_price(
    self, items, discount_rate, tax_rate,
    shipping_rate, handling_fee, insurance_rate
):
    pass

# After — 파라미터 객체
@dataclass
class PricingOptions:
    discount_rate: float = 0
    tax_rate: float = 0
    shipping_rate: float = 0
    handling_fee: float = 0
    insurance_rate: float = 0

def calculate_price(self, items, options: PricingOptions = None):
    options = options or PricingOptions()
    # ...
```

```python
# 사용
options = PricingOptions(discount_rate=0.1, tax_rate=0.1)
price = calc.calculate_price(items, options)
```

## 키워드 인수 (Python)

```python
def send_email(
    self,
    to,
    body,
    subject="Notification",  # 기본값
    cc=None,
    bcc=None,
    priority="normal"
):
    pass

# 필요한 것만 지정
send_email(to="user@example.com", body="Hello", priority="high")
```

## 빌더 패턴과 결합

```python
class EmailBuilder:
    def __init__(self, to, body):
        self._to = to
        self._body = body
        self._subject = "Notification"
        self._cc = None
        self._priority = "normal"

    def with_subject(self, subject):
        self._subject = subject
        return self

    def with_priority(self, priority):
        self._priority = priority
        return self

    def build(self):
        return Email(
            to=self._to,
            body=self._body,
            subject=self._subject,
            cc=self._cc,
            priority=self._priority
        )

# 사용
email = (EmailBuilder("user@example.com", "Hello")
    .with_subject("Important")
    .with_priority("high")
    .build())
```

## 주의사항

### 파라미터 순서

```python
# Bad — 새 파라미터가 중간에
def method(a, new_param, b, c):  # 기존 호출 깨짐
    pass

# Good — 새 파라미터는 끝에
def method(a, b, c, new_param=None):  # 기존 호출 유지
    pass
```

### 너무 많은 파라미터

```python
# 3-4개 이상이면 객체로 묶기 고려
def method(a, b, c, d, e, f):  # Bad
    pass

def method(config):  # Good
    pass
```

## 정리

- **새 파라미터로 동작 확장**
- **기본값으로 점진적 이전**
- **오버로딩으로 호환성** 유지 (정적 언어)
- **기존 테스트 보호**
- **파라미터 많으면 객체로**
- **키워드 인수/빌더** 활용

## 관련 패턴

- [Pattern 53: Method Parameter to Constructor Parameter](/blog/programming/engineering/tdd-patterns/pattern53-method-parameter-to-constructor-parameter) — 파라미터 위치 변경
- [Pattern 47: Extract Method](/blog/programming/engineering/tdd-patterns/pattern47-extract-method) — 메서드 분리
- [Pattern 39: Factory Method](/blog/programming/engineering/tdd-patterns/pattern39-factory-method) — 생성 유연성

