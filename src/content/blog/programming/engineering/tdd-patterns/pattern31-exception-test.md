---
title: "Pattern 31: Exception Test"
date: 2026-05-10T07:00:00
description: "Exception·error 경로 검증 — robustness의 절반."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 31
tags: [xunit, exception-test, error-path, beck]
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
draft: true

---

## 한 줄 요약

> 예외가 올바르게 발생하는지 테스트. 에러 경로의 정확성 검증이 robustness의 절반.

## 동기

코드는 정상 경로만 있는 게 아니다. 에러 경로도 검증되어야:

```python
def divide(a, b):
    if b == 0:
        raise ZeroDivisionError("0으로 나눌 수 없습니다")
    return a / b
```

이 에러 처리가 정확히 동작하는지 테스트.

### 신호

- production에서 예외 처리 버그 발견.
- positive case만 테스트, negative 빠짐.
- catch 블록이 test 안 됨.
- wrong exception type 발생.

### 언제 적용하는가

- 모든 raised exception 경로.
- 입력 검증 코드.
- 비즈니스 규칙 violation.
- 외부 자원 실패.

## 절차

1. **예외 발생 조건** 식별.
2. **테스트 작성** — `pytest.raises` 또는 `assertRaises`.
3. **정확한 exception type** 지정.
4. (필요시) *메시지/속성 검증*.
5. **negative case**도 — 정상 입력은 예외 없다.

## 예시 1 — 기본 패턴

```python
import pytest

def test_divide_by_zero_raises():
    with pytest.raises(ZeroDivisionError):
        divide(10, 0)

def test_divide_by_zero_message():
    with pytest.raises(ZeroDivisionError) as exc_info:
        divide(10, 0)
    assert "0으로 나눌 수 없습니다" in str(exc_info.value)
```

`pytest.raises`가 context manager로 검증.

## 예시 2 — 다양한 시나리오

```python
# 입력 검증
def test_invalid_email_raises():
    with pytest.raises(ValueError) as exc_info:
        create_user(email="invalid-email")
    assert "유효하지 않은 이메일" in str(exc_info.value)

# 상태 검증
def test_withdraw_insufficient_funds():
    account = Account(balance=100)
    with pytest.raises(InsufficientFundsError):
        account.withdraw(200)

# 비즈니스 규칙
def test_duplicate_registration():
    register_user("alice@example.com")
    with pytest.raises(DuplicateUserError):
        register_user("alice@example.com")
```

각 예외 시나리오 명시.

## 예시 3 — Exception 속성 검증

```python
def test_validation_error_details():
    with pytest.raises(ValidationError) as exc_info:
        validate_user({"name": "", "age": -1})

    error = exc_info.value
    assert error.field == "name"
    assert error.code == "REQUIRED"
    assert len(error.details) == 2
```

custom exception의 상세 속성까지 검증.

## 자주 보는 안티패턴

### 1. *수동 try/except*

```python
def test_bad():
    try:
        divide(10, 0)
        assert False, "예외 없음"   # 놓치기 쉬움
    except ZeroDivisionError:
        pass
```
프레임워크 API 사용 (`pytest.raises`).

### 2. Exception 전체 catch

```python
with pytest.raises(Exception):   # 너무 넓음
    divide(10, 0)
```
정확한 type 명시.

### 3. Exception type만 검증

```python
with pytest.raises(ValueError):
    parse(input)
```
*어떤 ValueError*인지 — message/code도 검증.

### 4. Message text 정확 일치

```python
assert str(error) == "Invalid email: alice@x.com at line 42"
```
fragile. substring 또는 code 검증.

### 5. Negative path 없음

정상 입력으로 예외 안 발생 검증 누락. 명시.

### 6. raises 안에 추가 assert

```python
with pytest.raises(...):
    divide(10, 0)
    assert something   # ← never reached
```
exception 후 코드는 unreachable. raises 밖으로.

## Modern variants

### Java assertThrows (JUnit 5)

```java
@Test
void testDivideByZero() {
    ZeroDivisionException ex = assertThrows(
        ZeroDivisionException.class,
        () -> divide(10, 0)
    );
    assertEquals("0으로 나눌 수 없습니다", ex.getMessage());
}
```

### Kotlin

```kotlin
@Test
fun testDivideByZero() {
    val ex = assertThrows<IllegalArgumentException> {
        divide(10, 0)
    }
    assertEquals("...", ex.message)
}
```

### Rust

```rust
#[test]
#[should_panic(expected = "0으로 나눌 수 없습니다")]
fn test_divide_by_zero() {
    divide(10, 0);
}

// 또는 Result로
#[test]
fn test_divide_by_zero_result() {
    assert!(matches!(divide(10, 0), Err(DivError::Zero)));
}
```

`#[should_panic]` 또는 Result pattern matching.

### TypeScript

```typescript
test("divide by zero", () => {
  expect(() => divide(10, 0)).toThrow(ZeroDivisionError);
  expect(() => divide(10, 0)).toThrow("0으로 나눌 수 없습니다");
});
```

### Property-based exception

```python
@given(st.integers())
def test_division_by_zero(a):
    with pytest.raises(ZeroDivisionError):
        divide(a, 0)
```

모든 a에 대해 0 나누기는 항상 예외.

### Error wrapping (Go)

```go
err := operation()
var myErr *MyError
if errors.As(err, &myErr) {
    // 검증
}
```

Go는 errors.As 패턴.

## 도구 / IDE

| 도구 | 기능 |
| --- | --- |
| pytest.raises | Python context manager |
| unittest.assertRaises | xUnit-style |
| JUnit 5 assertThrows | Java |
| Kotest shouldThrow | Kotlin |
| Jest toThrow | JS |
| RSpec raise_error | Ruby |

## 성능 고려

exception throw는 expensive (stack unwind). hot path에서 자제. test 자체는 빠름.

## 관련 패턴

- [Pattern 20: Crash Test Dummy](/blog/programming/engineering/tdd-patterns/pattern20-crash-test-dummy) — 에러 유발 fake
- [Pattern 27: Assertion](/blog/programming/engineering/tdd-patterns/pattern27-assertion) — 검증 API
- [Pattern 30: Test Method](/blog/programming/engineering/tdd-patterns/pattern30-test-method) — 테스트 구조
- [Pattern 13: Regression Test](/blog/programming/engineering/tdd-patterns/pattern13-regression-test) — 버그 재발 방지
