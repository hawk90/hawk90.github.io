---
title: "Pattern 27: Assertion"
date: 2026-07-02T03:00:00
description: "Test의 boolean 검증 — assertion API와 실패 메시지의 기술."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 27
tags: [xunit, assertion, beck]
draft: true
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> 테스트의 기대값을 *boolean assertion*으로 표현하고, *실패 시 유용한 메시지* 제공. assertion이 *test의 의도*.

## 동기 (Motivation)

테스트의 핵심은 *검증*. 실제 결과가 기대와 같은가?

```python
assert actual == expected
```

이것만으론 부족 — *실패 시 무엇이 틀렸는지* 알아야 한다.

### 좋은 assertion vs 나쁜 assertion

```python
# Bad
assert result == expected
# AssertionError (no detail)

# Good — message + actual/expected
assertEqual(result, expected)
# AssertionError: 42 != 43

# Better — context
assertEqual(user.name, "Alice", "사용자 이름이 틀림")
# AssertionError: 사용자 이름이 틀림
#   Expected: "Alice"
#   Actual:   "Bob"
```

### 신호

- 실패 시 *원인 추적 어려움*.
- assertion 한 줄에 *여러 조건*.
- *generic message* (`assert True`).
- *deep equality* 검증이 *불완전*.

### 언제 적용하는가

- 모든 테스트. assertion 없으면 *테스트 아님*.

## 절차 (Mechanics)

1. **검증 대상** 식별 — value, type, state, 호출.
2. **적절한 assertion 선택** — equal, true, raises, instance.
3. **명확한 메시지** 추가 (의미 있는 경우).
4. *실패 시 충분한 정보* 확인.
5. 너무 복잡하면 *custom assertion* 추출.

## 예시 1 — 기본 assertion 종류

```python
# Equality
assertEqual(result, 42)
assertEqual(user.name, "Alice")

# Boolean
assertTrue(user.is_active)
assertFalse(order.is_cancelled)

# Identity
assertIs(singleton1, singleton2)
assertIsNone(result)
assertIsNotNone(user)

# Exception
with assertRaises(ValueError):
    parse_int("not a number")

# Type
assertIsInstance(obj, MyClass)

# Collection
assertIn(item, collection)
assertCountEqual(actual, expected)   # 순서 무관

# Approximate
assertAlmostEqual(0.1 + 0.2, 0.3, places=7)
```

## 예시 2 — Domain-specific assertion

```python
def assertValidEmail(email):
    assert "@" in email, f"Invalid email: {email}"
    assert "." in email.split("@")[1], f"Invalid domain: {email}"

def assertOrderValid(order):
    assertIsNotNone(order.id, "주문 ID 없음")
    assertTrue(order.total > 0, "주문 금액이 0 이하")
    assertIsNotNone(order.user, "사용자 정보 없음")
    assertTrue(len(order.items) > 0, "주문 항목 없음")

# 사용
def test_create_order():
    order = create_order(user, items)
    assertOrderValid(order)
```

복잡한 검증을 *재사용 가능 helper*로.

## 예시 3 — Fluent matchers

```python
# AssertJ-style (Python: assertpy)
from assertpy import assert_that

assert_that(result).is_not_none().is_greater_than(0).is_less_than(100)
assert_that(users).has_size(3).extracting("name").contains("Alice", "Bob")
```

읽기 좋고 *combined assertion*.

## 자주 보는 안티패턴

### 1. *Generic message*
```python
assert x   # 실패 시 무엇?
```
*값 + context* 명시.

### 2. *Multiple unrelated assertions*
```python
def test_x():
    assert calculate_tax(100) == 10
    assert user.name == "Alice"   # 무관
```
각 *논리 단위*마다 test.

### 3. *Floating point ==*
```python
assert 0.1 + 0.2 == 0.3   # False
```
`assertAlmostEqual`, `pytest.approx`.

### 4. *Implicit assertion*
```python
def test_x():
    result = compute()
    # ← assertion 없음, 실행만
```
명시적 assert.

### 5. *Over-specific*
```python
assert str(error) == "ValueError: invalid input at line 42"
```
*essence* 검증 — message 전체 ↑ fragile.

### 6. *Snapshot 남발*
```python
expect(component).toMatchSnapshot()
```
편리하지만 *의도 모호*. 명시적 assertion 우선.

## Modern variants

### Hamcrest matchers

```python
from hamcrest import *
assert_that(result, equal_to(42))
assert_that(name, starts_with("Al"))
assert_that(items, has_length(3))
assert_that(user, has_property("name", "Alice"))
```

natural English 표현.

### AssertJ (Java)

```java
assertThat(users)
    .hasSize(3)
    .extracting(User::getName)
    .containsExactly("Alice", "Bob", "Charlie");
```

fluent + type-safe.

### Chai (JavaScript)

```javascript
expect(result).to.equal(42).and.to.be.a("number");
result.should.have.property("name", "Alice");
```

### Pytest's plain `assert` + introspection

```python
def test():
    assert calculate() == expected   # ← pytest가 양쪽 값 출력
```

pytest의 *assertion rewriting*. plain assert로 충분.

### Property-based

```python
@given(st.integers())
def test_double(n):
    assert double(n) == n + n   # property assertion
```

### Approval testing

```python
verify(complex_output)   # baseline 비교
```

복잡한 output을 *file 비교*.

### Soft assertions

```python
from softest import TestCase

class T(TestCase):
    def test(self):
        self.soft_assert(self.assertEqual, a, 1)
        self.soft_assert(self.assertEqual, b, 2)
        self.assert_all()   # 모든 fail 모음
```

*모든 검증 실행 + 모든 실패 보고*.

## Assertion count

```python
# OK — 한 개념의 여러 측면
def test_user_creation():
    user = create_user("Alice", "alice@example.com")
    assertEqual(user.name, "Alice")
    assertEqual(user.email, "alice@example.com")
    assertTrue(user.is_active)

# Bad — 무관 검증
def test_misc():
    assert 1 + 1 == 2
    assert len("hello") == 5
```

*"하나의 논리적 검증"* 룰.

## 도구 / IDE

| 도구 | 기능 |
| --- | --- |
| pytest | plain assert + rewriting |
| unittest | xUnit-style |
| AssertJ (Java) | fluent assertion |
| Hamcrest | matcher |
| assertpy (Python) | fluent |
| Chai (JS) | BDD/TDD assertion |
| Test::More (Perl) | TAP output |

## 성능 고려

assertion은 *test 본문의 비중*. 빠른 검증이 *fast cycle*. *Deep equality*는 *큰 객체*에서 느릴 수 있음 — *대안*: hash, summary.

## 관련 패턴

- [Pattern 30: Test Method](/blog/programming/engineering/tdd-patterns/pattern30-test-method) — 테스트 구조
- [Pattern 5: Assert First](/blog/programming/engineering/tdd-patterns/pattern05-assert-first) — Assertion 먼저
- [Pattern 7: Evident Data](/blog/programming/engineering/tdd-patterns/pattern07-evident-data) — 명확한 기대값
- [Pattern 31: Exception Test](/blog/programming/engineering/tdd-patterns/pattern31-exception-test) — 예외 검증
