---
title: "Pattern 30: Test Method"
date: 2026-07-02T06:00:00
description: "Test 한 case = 한 method — naming·구조."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 30
tags: [xunit, test-method, naming, beck]
draft: true
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> 각 테스트 케이스를 하나의 메서드로 작성하고, 메서드 이름으로 의도를 명확히 표현한다.

## 동기 (Motivation)

테스트 메서드는 **문서**다. 이름만 봐도 **무엇을 검증하는지** 알아야 한다:

```python
# 나쁨: 무슨 테스트인지 모름
def test_1(): ...
def test_order(): ...

# 좋음: 의도가 명확
def test_order_total_with_discount_applied(): ...
def test_order_rejects_negative_quantity(): ...
```

## 네이밍 컨벤션

### 패턴 1: test_동작_조건_결과

```python
def test_add_returns_sum_of_two_numbers():
    assert add(2, 3) == 5

def test_divide_by_zero_raises_error():
    with pytest.raises(ZeroDivisionError):
        divide(10, 0)
```

### 패턴 2: test_X_when_Y_then_Z

```python
def test_order_total_when_discount_applied_then_reduced():
    ...

def test_user_login_when_password_wrong_then_fails():
    ...
```

### 패턴 3: should_결과_when_조건 (BDD 스타일)

```python
def should_return_sum_when_adding_two_numbers():
    ...

def should_raise_error_when_dividing_by_zero():
    ...
```

## AAA 패턴

**Arrange-Act-Assert** — 테스트의 표준 구조:

```python
def test_order_total_with_tax():
    # Arrange (준비)
    order = Order()
    order.add(Item("Book", 1000))
    tax_rate = 0.1

    # Act (실행)
    total = order.total_with_tax(tax_rate)

    # Assert (검증)
    assert total == 1100
```

### 구분 명확히

```python
def test_user_registration():
    # Arrange
    user_data = {"name": "Alice", "email": "alice@example.com"}

    # Act
    user = register_user(user_data)

    # Assert
    assert user.id is not None
    assert user.name == "Alice"
    assert user.is_active
```

빈 줄로 **세 단계를 구분**한다.

## 하나의 개념만 테스트

```python
# 나쁨: 여러 개념 섞임
def test_user():
    user = create_user("Alice")
    assert user.name == "Alice"  # 생성 테스트

    user.update_name("Bob")
    assert user.name == "Bob"  # 수정 테스트

    user.delete()
    assert user.is_deleted  # 삭제 테스트

# 좋음: 개념별 분리
def test_create_user():
    user = create_user("Alice")
    assert user.name == "Alice"

def test_update_user_name():
    user = create_user("Alice")
    user.update_name("Bob")
    assert user.name == "Bob"

def test_delete_user():
    user = create_user("Alice")
    user.delete()
    assert user.is_deleted
```

## 실패 시 원인 파악

테스트 이름은 **실패 시 첫 번째 정보**다:

```text
FAILED test_order_total_when_discount_exceeds_subtotal_then_zero

↑ 이름만으로 어떤 상황인지 파악 가능
```

```text
FAILED test_1

↑ 무슨 테스트인지 모름, 코드를 봐야 함
```

## 테스트 크기

### 작게 유지

```python
# 좋음: 작고 집중적
def test_empty_cart_total_is_zero():
    cart = Cart()
    assert cart.total == 0

def test_single_item_cart_total():
    cart = Cart()
    cart.add(Item(price=100))
    assert cart.total == 100
```

### 크면 분리

```python
# 나쁨: 너무 긴 테스트
def test_checkout_flow():
    # 50줄의 테스트 코드...
    pass

# 좋음: 단계별 분리
def test_checkout_validates_cart(): ...
def test_checkout_calculates_shipping(): ...
def test_checkout_applies_discount(): ...
def test_checkout_creates_order(): ...
```

## 헬퍼 메서드

반복되는 설정은 **헬퍼로 추출**:

```python
def create_order_with_items(*prices):
    """테스트용 주문 생성 헬퍼"""
    order = Order()
    for price in prices:
        order.add(Item(price=price))
    return order

def test_order_total():
    order = create_order_with_items(100, 200, 300)
    assert order.total == 600

def test_order_with_discount():
    order = create_order_with_items(1000)
    order.apply_discount(10)
    assert order.total == 900
```

## 테스트 실행 순서

```python
# 테스트는 순서에 의존하면 안 됨

# 나쁨: test_2가 test_1의 결과에 의존
def test_1_create_user():
    global user
    user = create_user("Alice")

def test_2_update_user():
    user.update_name("Bob")  # test_1이 먼저 실행되어야 함

# 좋음: 각 테스트가 독립적
def test_create_user():
    user = create_user("Alice")
    assert user.name == "Alice"

def test_update_user():
    user = create_user("Alice")  # 직접 생성
    user.update_name("Bob")
    assert user.name == "Bob"
```

## 정리

- **테스트 메서드 = 문서** — 이름으로 의도 표현
- **네이밍 컨벤션** 일관되게 사용
- **AAA 패턴** — Arrange, Act, Assert
- **하나의 개념**만 테스트
- **작게 유지** — 크면 분리
- **독립적** — 순서 의존 금지

## 관련 패턴

- [Pattern 1: Test](/blog/programming/engineering/tdd-patterns/pattern01-test) — 테스트의 기본
- [Pattern 27: Assertion](/blog/programming/engineering/tdd-patterns/pattern27-assertion) — 검증 방법
- [Pattern 28: Fixture](/blog/programming/engineering/tdd-patterns/pattern28-fixture) — 공통 설정

