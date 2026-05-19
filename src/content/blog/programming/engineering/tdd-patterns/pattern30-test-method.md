---
title: "Pattern 30: Test Method"
date: 2026-05-10T06:00:00
description: "Test 한 case = 한 method — naming·구조·AAA로 의도 표현."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 30
tags: [xunit, test-method, naming, beck]
draft: true
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> 각 테스트 케이스를 *하나의 메서드*로, *이름으로 의도 표현*. test method가 *문서이자 명세*.

## 동기 (Motivation)

테스트 메서드는 *문서*. 이름만 봐도 *무엇을 검증하는지* 알아야 한다.

```python
# Bad
def test_1(): ...
def test_order(): ...

# Good
def test_order_total_with_discount_applied(): ...
def test_order_rejects_negative_quantity(): ...
```

### 신호

- `test_1`, `test_basic` 같은 *generic 이름*.
- 한 메서드에 *여러 시나리오*.
- 실패 시 *어떤 동작이 깨졌는지* 이름에서 안 보임.
- 같은 이름이 *여러 클래스*에 (동작 다른데).

### 네이밍 컨벤션

| 패턴 | 예시 |
| --- | --- |
| `test_action_when_condition_then_result` | `test_order_when_discount_applied_then_reduced` |
| `should_result_when_condition` | `should_return_sum_when_adding_two_numbers` |
| `MethodName_Scenario_ExpectedResult` (xUnit) | `Add_TwoPositives_ReturnsSum` |
| `test_X` (단순) | `test_empty_cart_total_is_zero` |

팀 *합의*가 핵심.

## 절차 (Mechanics)

1. **테스트할 동작 식별**.
2. **명명 컨벤션 적용** — 의도가 *이름에 표현*.
3. **AAA 구조** — Arrange, Act, Assert.
4. **한 개념만** 검증 — 여러 동작이면 *분리*.
5. **크기 통제** — 50줄+면 *분해*.
6. **독립성 확보** — 다른 test에 의존 금지.

## 예시 1 — AAA 패턴

```python
def test_order_total_with_tax():
    # Arrange
    order = Order()
    order.add(Item("Book", 1000))
    tax_rate = 0.1

    # Act
    total = order.total_with_tax(tax_rate)

    # Assert
    assert total == 1100
```

세 단계 *빈 줄로 구분*. 읽기 쉬움.

## 예시 2 — 한 개념만

```python
# Bad — 여러 동작 섞임
def test_user():
    user = create_user("Alice")
    assert user.name == "Alice"
    user.update_name("Bob")
    assert user.name == "Bob"
    user.delete()
    assert user.is_deleted

# Good — 개념별 분리
def test_create_user_with_name():
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

실패 시 *원인 명확*.

## 예시 3 — Helper로 setup 단순화

```python
def create_order_with_items(*prices):
    """테스트용 주문 helper"""
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

setup *반복 제거*, test 의도 명확.

## 자주 보는 안티패턴

### 1. *Generic 이름*
`test_1`, `test_works`, `test_basic` — 실패 시 *추측*. 의도 표현.

### 2. *너무 긴 method*
50줄+ → 분해. 한 method = 한 시나리오.

### 3. *Multiple act*
```python
def test_x():
    cart.add(a)
    assert cart.total == ...
    cart.add(b)
    assert cart.total == ...
```
여러 *act*는 *여러 test*로.

### 4. *Order dependency*
```python
def test_1_create(): global user; user = create()
def test_2_update(): user.update()
```
실행 순서 의존. *각 test 자체 setup*.

### 5. *Long name + abbreviation*
```python
def test_o_t_wd_a_th_r(): ...
```
*풀네임* 사용. abbreviation 금지.

### 6. *Test class name도 generic*
```python
class TestX: ...
```
도메인 표현. `TestUserRegistration`, `TestCartCheckout`.

## Modern variants

### BDD describe / it (Jest, Mocha, RSpec)

```javascript
describe("ShoppingCart", () => {
  describe("when empty", () => {
    it("returns total 0", () => { ... });
  });

  describe("with single item", () => {
    it("returns item price as total", () => { ... });
  });
});
```

자연스러운 *계층 구조*.

### Spock (Groovy)

```groovy
def "should return sum when adding two numbers"() {
    given:
    def calc = new Calculator()

    when:
    def result = calc.add(2, 3)

    then:
    result == 5
}
```

label로 *AAA 명시*.

### Cucumber

```gherkin
Scenario: Add to cart updates total
  Given an empty cart
  When I add an item costing 100
  Then total should be 100
```

비기술자 표현.

### Parameterized

```python
@pytest.mark.parametrize("input,expected", [
    (1, 1),
    (2, 4),
    (3, 9),
])
def test_square(input, expected):
    assert square(input) == expected
```

한 method로 *여러 case* — *각 case별 test name 자동*.

### Test class organization

```python
class TestUserRegistration:
    class TestValidInput:
        def test_creates_user(self): ...
        def test_assigns_id(self): ...

    class TestInvalidInput:
        def test_rejects_empty_email(self): ...
        def test_rejects_duplicate(self): ...
```

nested class로 *그룹화*.

## 도구 / IDE

| 도구 | 기능 |
| --- | --- |
| IDE test panel | tree 구조 시각화 |
| pytest --co | 수집된 test 목록 |
| JUnit @Nested | 계층적 표현 |
| Spock label | AAA 표시 |
| Cucumber HTML report | 시각적 시나리오 |

## 성능 고려

추상 — 코드 성능 무관. *test maintenance*에 영향. 명확한 이름 → *디버깅 시간 단축*. 작은 method → *fast cycle*.

## 관련 패턴

- [Pattern 1: Test](/blog/programming/engineering/tdd-patterns/pattern01-test) — 테스트의 기본
- [Pattern 27: Assertion](/blog/programming/engineering/tdd-patterns/pattern27-assertion) — 검증
- [Pattern 28: Fixture](/blog/programming/engineering/tdd-patterns/pattern28-fixture) — 공통 설정
- [Pattern 2: Isolated Test](/blog/programming/engineering/tdd-patterns/pattern02-isolated-test) — 격리
