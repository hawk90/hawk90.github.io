---
title: "Pattern 31: Exception Test"
date: 2026-07-02T07:00:00
description: "Exception·error 경로 검증."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 31
tags: [xunit, exception-test, error-path, beck]
draft: true
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> 예외가 올바르게 발생하는지 테스트하여 에러 경로의 정확성을 검증한다.

## 동기 (Motivation)

코드는 **정상 경로**만 있는 게 아니다. **에러 경로**도 중요하다:

```python
def divide(a, b):
    if b == 0:
        raise ZeroDivisionError("0으로 나눌 수 없습니다")
    return a / b
```

이 에러 처리가 **정확히 동작하는지** 테스트해야 한다.

## Exception Test 방법

### pytest.raises

```python
import pytest

def test_divide_by_zero_raises():
    with pytest.raises(ZeroDivisionError):
        divide(10, 0)
```

### assertRaises (unittest)

```python
import unittest

class TestDivide(unittest.TestCase):
    def test_divide_by_zero(self):
        with self.assertRaises(ZeroDivisionError):
            divide(10, 0)
```

### 예외 메시지 검증

```python
def test_divide_by_zero_message():
    with pytest.raises(ZeroDivisionError) as exc_info:
        divide(10, 0)

    assert "0으로 나눌 수 없습니다" in str(exc_info.value)
```

## 흔한 실수

### 수동 try/except (나쁨)

```python
# 나쁨: 손으로 try/except 작성
def test_divide_by_zero_bad():
    try:
        divide(10, 0)
        assert False, "예외가 발생하지 않음"  # 놓치기 쉬움
    except ZeroDivisionError:
        pass  # 성공

# 좋음: 프레임워크 사용
def test_divide_by_zero_good():
    with pytest.raises(ZeroDivisionError):
        divide(10, 0)
```

### 너무 넓은 예외 (나쁨)

```python
# 나쁨: Exception 전체를 잡음
def test_bad_exception():
    with pytest.raises(Exception):  # 너무 넓음
        divide(10, 0)

# 좋음: 정확한 예외 타입
def test_good_exception():
    with pytest.raises(ZeroDivisionError):  # 정확
        divide(10, 0)
```

## 다양한 예외 시나리오

### 입력 검증

```python
def test_invalid_email_raises():
    with pytest.raises(ValueError) as exc_info:
        create_user(email="invalid-email")

    assert "유효하지 않은 이메일" in str(exc_info.value)

def test_empty_name_raises():
    with pytest.raises(ValueError):
        create_user(name="", email="test@example.com")
```

### 상태 검증

```python
def test_withdraw_insufficient_funds():
    account = Account(balance=100)

    with pytest.raises(InsufficientFundsError):
        account.withdraw(200)

def test_closed_account_cannot_withdraw():
    account = Account(balance=100)
    account.close()

    with pytest.raises(AccountClosedError):
        account.withdraw(50)
```

### 비즈니스 규칙

```python
def test_order_over_limit():
    user = User(daily_limit=10000)

    with pytest.raises(OrderLimitExceededError):
        create_order(user, amount=20000)

def test_duplicate_registration():
    register_user("alice@example.com")

    with pytest.raises(DuplicateUserError):
        register_user("alice@example.com")  # 중복
```

## 예외 속성 검증

```python
def test_exception_details():
    with pytest.raises(ValidationError) as exc_info:
        validate_user({"name": "", "age": -1})

    error = exc_info.value
    assert error.field == "name"
    assert error.code == "REQUIRED"
    assert len(error.details) == 2  # 두 필드 오류
```

## 예외가 발생하지 않아야 하는 테스트

```python
def test_valid_input_no_exception():
    # 예외가 발생하지 않으면 자동으로 통과
    result = divide(10, 2)
    assert result == 5

# 명시적으로 표현
def test_valid_email_accepted():
    try:
        user = create_user(email="valid@example.com")
        assert user.email == "valid@example.com"
    except ValidationError:
        pytest.fail("유효한 이메일인데 예외 발생")
```

## 정리

- **예외 발생** 테스트는 에러 경로 검증
- **프레임워크 제공 API** 사용 (pytest.raises, assertRaises)
- **정확한 예외 타입** 지정 (Exception 금지)
- **예외 메시지/속성** 검증 가능
- **수동 try/except** 회피
- **Negative path**가 robustness의 핵심

## 관련 패턴

- [Pattern 20: Crash Test Dummy](/blog/programming/engineering/tdd-patterns/pattern20-crash-test-dummy) — 에러 유발 fake
- [Pattern 27: Assertion](/blog/programming/engineering/tdd-patterns/pattern27-assertion) — 검증 API
- [Pattern 30: Test Method](/blog/programming/engineering/tdd-patterns/pattern30-test-method) — 테스트 구조

