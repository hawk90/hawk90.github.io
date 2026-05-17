---
title: "Pattern 27: Assertion"
date: 2026-07-02T03:00:00
description: "Test의 boolean 검증 — assertion API."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 27
tags: [xunit, assertion, beck]
draft: true
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> 테스트의 기대값을 boolean assertion으로 표현하고, 실패 시 유용한 메시지를 제공한다.

## 동기 (Motivation)

테스트의 핵심은 **검증**이다. 실제 결과가 기대한 것과 같은가?

```python
# 가장 기본적인 assertion
assert actual == expected
```

하지만 이것만으로는 부족하다. 실패했을 때 **무엇이 틀렸는지** 알아야 한다.

## 기본 Assertion 종류

### assertEqual

```python
# 값이 같은가?
assertEqual(actual, expected)
assertEqual(result, 42)
assertEqual(user.name, "Alice")
```

### assertTrue / assertFalse

```python
# 참/거짓인가?
assertTrue(user.is_active)
assertFalse(order.is_cancelled)
assertTrue(len(items) > 0)
```

### assertIs / assertIsNot

```python
# 같은 객체인가? (identity)
assertIs(singleton1, singleton2)
assertIsNot(copy, original)
assertIsNone(result)
assertIsNotNone(user)
```

### assertRaises

```python
# 예외가 발생하는가?
with assertRaises(ValueError):
    parse_int("not a number")

with assertRaises(ZeroDivisionError):
    divide(10, 0)
```

## 좋은 실패 메시지

### 나쁜 예

```python
assert result == expected
# AssertionError
# (무엇이 틀렸는지 모름)
```

### 좋은 예

```python
assertEqual(result, expected)
# AssertionError: 42 != 43
# (actual과 expected 모두 보임)

assertEqual(user.name, "Alice", "사용자 이름이 틀림")
# AssertionError: 사용자 이름이 틀림
# Expected: "Alice"
# Actual: "Bob"
```

## 도메인 특화 Assertion

### 직접 작성

```python
def assertValidEmail(email):
    """이메일 형식 검증"""
    assert "@" in email, f"Invalid email: {email}"
    assert "." in email.split("@")[1], f"Invalid domain: {email}"

# 사용
def test_user_email():
    user = create_user("test@example.com")
    assertValidEmail(user.email)
```

### 복합 Assertion

```python
def assertOrderValid(order):
    """주문 유효성 검증"""
    assertIsNotNone(order.id, "주문 ID 없음")
    assertTrue(order.total > 0, "주문 금액이 0 이하")
    assertIsNotNone(order.user, "사용자 정보 없음")
    assertTrue(len(order.items) > 0, "주문 항목 없음")

# 사용
def test_create_order():
    order = create_order(user, items)
    assertOrderValid(order)
```

## Matcher 라이브러리

### Hamcrest 스타일 (Python)

```python
from hamcrest import *

# 더 읽기 좋은 assertion
assert_that(result, equal_to(42))
assert_that(name, starts_with("Al"))
assert_that(items, has_length(3))
assert_that(user, has_property("name", "Alice"))
```

### pytest 스타일

```python
# pytest는 기본 assert가 강력
def test_example():
    result = calculate()
    assert result == 42  # 실패 시 상세 정보 제공

# 컬렉션 비교
def test_items():
    items = get_items()
    assert items == ["a", "b", "c"]  # 차이점 표시
```

### AssertJ 스타일 (Java 개념, Python 구현)

```python
# Fluent API
assertThat(result)\
    .isNotNone()\
    .isGreaterThan(0)\
    .isLessThan(100)

assertThat(users)\
    .hasSize(3)\
    .extracting("name")\
    .contains("Alice", "Bob")
```

## Assertion 설계 원칙

### 하나의 논리적 검증

```python
# 좋음: 하나의 개념
def test_user_creation():
    user = create_user("Alice")
    assertValidUser(user)  # 사용자 유효성 한 번에 검증

# 나쁨: 무관한 것들 섞음
def test_everything():
    user = create_user("Alice")
    assert user.name == "Alice"
    assert calculate_tax(100) == 10  # 관계없는 검증
```

### 실패 원인 명확히

```python
# 좋음: 실패 원인 추적 가능
def test_order_total():
    order = create_order(items)
    assertEqual(order.subtotal, 1000, "소계 계산 오류")
    assertEqual(order.tax, 100, "세금 계산 오류")
    assertEqual(order.total, 1100, "총계 계산 오류")

# 나쁨: 어디가 틀렸는지 모름
def test_order_total():
    order = create_order(items)
    assert order.total == 1100  # 실패하면 어디서?
```

## Assertion Count

```python
# 테스트당 assertion 수는?
# 규칙: "하나의 논리적 assertion"

# OK: 여러 assertion이지만 하나의 개념
def test_user_creation():
    user = create_user("Alice", "alice@example.com")
    assertEqual(user.name, "Alice")
    assertEqual(user.email, "alice@example.com")
    assertTrue(user.is_active)
    # 모두 "사용자가 올바르게 생성됨"을 검증

# 나쁨: 관련 없는 assertion들
def test_misc():
    assert 1 + 1 == 2
    assert len("hello") == 5
    assert [1, 2, 3].pop() == 3
```

## 정리

- **Assertion**은 테스트의 핵심 검증
- **실패 메시지**가 디버깅의 열쇠
- **도메인 특화 assertion**으로 가독성 향상
- **Matcher 라이브러리**로 표현력 증가
- **하나의 논리적 개념**을 검증
- **실패 원인**이 명확하도록

## 관련 패턴

- [Pattern 30: Test Method](/blog/programming/engineering/tdd-patterns/pattern30-test-method) — 테스트 구조
- [Pattern 5: Assert First](/blog/programming/engineering/tdd-patterns/pattern05-assert-first) — Assertion 먼저 작성
- [Pattern 7: Evident Data](/blog/programming/engineering/tdd-patterns/pattern07-evident-data) — 명확한 기대값

