---
title: "Tip 65: Testing Is Not About Finding Bugs"
date: 2026-05-11T17:00:00
description: "테스트는 버그 찾기가 아니다. 테스트는 설계를 이끌고, 문서화하고, 확신을 준다."
series: "The Pragmatic Programmer"
seriesOrder: 65
tags: [pragmatic-programmer, testing, tdd]
draft: false
---

## 이 팁의 메시지

> **Tip 65: Testing Is Not About Finding Bugs.** A test is the first user of your code. Testing is a perspective into your code.

테스트는 코드의 첫 번째 사용자다. 테스트는 코드를 바라보는 관점이다.

## 버그 찾기 vs 더 많은 것

테스트가 버그를 찾는다고 생각하기 쉽다. 그러나 테스트의 가치는 더 크다.

| 역할 | 설명 |
|------|------|
| 설계 | 테스트하기 어려운 코드는 설계가 나쁜 것 |
| 문서화 | 테스트가 사용법을 보여준다 |
| 확신 | 변경해도 기존 기능이 동작한다는 확신 |
| 피드백 | 빠르게 실패를 알려준다 |

## 테스트가 설계를 이끈다

테스트하기 어렵다면 설계를 재고한다.

```python
# 테스트하기 어려움: 숨겨진 의존성
class OrderProcessor:
    def process(self, order):
        db = Database.get_connection()  # 숨겨진 의존
        payment = PaymentGateway()      # 숨겨진 의존
        ...
```

테스트하려면 실제 데이터베이스와 결제 시스템이 필요하다.

```python
# 테스트하기 쉬움: 명시적 의존성
class OrderProcessor:
    def __init__(self, db, payment_gateway):
        self.db = db
        self.payment = payment_gateway

    def process(self, order):
        ...

# 테스트에서 모킹 가능
def test_order_processing():
    mock_db = MockDatabase()
    mock_payment = MockPaymentGateway()
    processor = OrderProcessor(mock_db, mock_payment)
    processor.process(test_order)
```

테스트가 강제한 설계가 더 좋다. 의존성이 명시적이고 교체 가능하다.

## 테스트가 문서다

테스트는 코드의 사용법을 보여준다.

```python
def test_user_registration():
    # 사용법을 보여준다
    user = User(email="test@example.com", password="secure123")
    result = register(user)

    assert result.success
    assert result.user.id is not None
    assert result.user.email == "test@example.com"
```

README보다 테스트가 더 정확하다. 테스트는 항상 최신이다. 테스트가 실패하면 업데이트되기 때문이다.

## 테스트가 확신을 준다

테스트가 있으면 변경이 두렵지 않다.

```python
# 리팩터링 전
def calculate_total(items):
    total = 0
    for item in items:
        total += item.price * item.quantity
    return total

# 리팩터링 후
def calculate_total(items):
    return sum(item.price * item.quantity for item in items)
```

테스트가 통과하면 리팩터링이 안전하다는 확신이 생긴다.

## 테스트 작성 시점

버그를 발견한 후가 아니라 코드 작성 전에 테스트를 작성한다.

```text
TDD (테스트 주도 개발):
1. 실패하는 테스트 작성
2. 테스트를 통과하는 최소 코드 작성
3. 리팩터링
4. 반복
```

테스트를 먼저 작성하면 "이 코드가 뭘 해야 하는가?"를 먼저 생각하게 된다.

## 테스트 가능한 코드의 특징

- **작은 함수**: 한 가지 일만 한다
- **명시적 의존**: 숨겨진 전역 상태가 없다
- **부작용 분리**: 순수 로직과 I/O가 분리된다
- **단일 책임**: 테스트할 것이 명확하다

```python
# 좋은 예: 순수 함수
def calculate_discount(price: float, rate: float) -> float:
    return price * (1 - rate)

# 테스트 쉬움
def test_discount():
    assert calculate_discount(100, 0.1) == 90
    assert calculate_discount(100, 0.2) == 80
```

## 정리

- 테스트는 버그 찾기 이상의 가치가 있다.
- 테스트하기 어려운 코드는 설계를 개선한다.
- 테스트가 살아있는 문서다.
- 테스트가 변경에 대한 확신을 준다.
- 테스트를 먼저 작성하면 설계가 좋아진다.

## 다음 장 예고

[Tip 66: A Test Is the First User of Your Code](/blog/programming/engineering/pragmatic-programmer/tip66)에서는 테스트를 코드의 첫 번째 사용자로 보는 관점을 다룬다.

## 관련 항목

- [Tip 64: Refactor Early, Refactor Often](/blog/programming/engineering/pragmatic-programmer/tip64)
- [Tip 66: A Test Is the First User of Your Code](/blog/programming/engineering/pragmatic-programmer/tip66)
