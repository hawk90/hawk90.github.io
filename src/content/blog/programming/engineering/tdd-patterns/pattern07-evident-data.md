---
title: "Pattern 7: Evident Data"
date: 2026-07-01T07:00:00
description: "Test의 데이터는 *의미가 보이게*."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 7
tags: [tdd, beck, evident-data]
draft: true
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> 테스트의 expected value를 하드코딩하지 말고 계산식으로 표현하여 의도를 드러내라.

## 동기 (Motivation)

다음 두 테스트를 비교해 보자:

```python
# Version A
def test_total():
    assert cart.total() == 300

# Version B
def test_total():
    price = 100
    quantity = 3
    assert cart.total() == price * quantity
```

Version A의 `300`은 어디서 온 값인가? 읽는 사람은 알 수 없다. Version B는 `100 * 3 = 300`이라는 계산이 보인다. **왜 300인지** 명확하다.

**Evident Data**는 테스트 값에 의도를 담는 기법이다.

## Evident Data 적용

### Before: 하드코딩된 값

```python
def test_currency_conversion():
    usd = Dollar(100)
    krw = usd.to_krw()
    assert krw.amount == 130000  # 왜 130000?
```

### After: 계산식으로 표현

```python
def test_currency_conversion():
    usd_amount = 100
    exchange_rate = 1300  # 1 USD = 1300 KRW

    usd = Dollar(usd_amount)
    krw = usd.to_krw()

    assert krw.amount == usd_amount * exchange_rate
```

이제 `130000`이 어디서 왔는지 명확하다.

## 더 많은 예시

### 세금 계산

```python
# Bad
def test_tax():
    assert calculate_tax(1000) == 100

# Good
def test_tax():
    price = 1000
    tax_rate = 0.10
    assert calculate_tax(price) == price * tax_rate
```

### 할인 적용

```python
# Bad
def test_discount():
    assert apply_discount(1000, 20) == 800

# Good
def test_discount():
    original_price = 1000
    discount_percent = 20
    expected = original_price * (100 - discount_percent) / 100
    assert apply_discount(original_price, discount_percent) == expected
```

### 날짜 계산

```python
# Bad
def test_subscription_end():
    assert subscription.end_date == date(2024, 4, 15)

# Good
def test_subscription_end():
    start = date(2024, 1, 15)
    duration_months = 3
    subscription = Subscription(start, duration_months)

    expected_end = start + relativedelta(months=duration_months)
    assert subscription.end_date == expected_end
```

## 언제 하드코딩해도 되는가

모든 값을 계산식으로 쓸 필요는 없다. 다음 경우엔 하드코딩이 낫다:

### 1. 값 자체가 명세일 때

```python
def test_http_ok():
    assert response.status_code == 200  # HTTP 표준

def test_pi_approximation():
    assert round(calculate_pi(), 5) == 3.14159
```

### 2. 계산식이 구현을 그대로 복사할 때

```python
# Bad: 구현 로직을 테스트에 복사
def test_complex_formula():
    x = 5
    y = 3
    expected = (x ** 2 + y ** 2) ** 0.5  # 이게 구현 코드와 동일!
    assert distance(x, y) == expected
```

이 경우 테스트가 구현의 버그를 그대로 복사할 수 있다. 대신:

```python
# Good: 알려진 값 사용
def test_345_triangle():
    assert distance(3, 4) == 5  # 피타고라스의 정리로 알려진 값
```

## Evident Data의 수준

상황에 따라 표현 수준을 조절한다:

```python
# Level 1: 완전 하드코딩 (피하기)
assert total == 1100

# Level 2: 부분 계산 (최소한)
assert total == 1000 + 100

# Level 3: 변수 + 계산 (권장)
price = 1000
tax = 100
assert total == price + tax

# Level 4: 의미 있는 이름 + 계산 (최선)
base_price = 1000
tax_amount = base_price * 0.10
assert total == base_price + tax_amount
```

## 정리

- expected value를 **계산식으로 표현**한다
- 읽는 사람이 **"왜 이 값인가?"**를 알 수 있어야 한다
- **하드코딩된 값**은 의도를 숨긴다
- 값 자체가 명세이거나, 계산이 구현을 복사할 때는 **예외**
- 테스트는 **문서이자 설계 도구**다

## 관련 패턴

- [Pattern 6: Test Data](/blog/programming/engineering/tdd-patterns/pattern06-test-data) — 어떤 데이터를 선택할지
- [Pattern 27: Assertion](/blog/programming/engineering/tdd-patterns/pattern27-assertion) — assertion 작성법
- [Pattern 5: Assert First](/blog/programming/engineering/tdd-patterns/pattern05-assert-first) — assertion 먼저 쓰기
