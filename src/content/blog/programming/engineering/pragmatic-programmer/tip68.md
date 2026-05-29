---
title: "Tip 68: Design to Test"
date: 2026-05-11T20:00:00
description: "테스트를 고려해 설계하라. 테스트 가능한 코드가 좋은 코드다."
series: "The Pragmatic Programmer"
seriesOrder: 68
tags: [pragmatic-programmer, testing, design]
draft: true
---

## 이 팁의 메시지

> **Tip 68: Design to Test.** Start thinking about testing before you write a line of code.

코드를 한 줄 쓰기 전에 테스트를 생각하라.

## 테스트 가능성 = 좋은 설계

테스트하기 쉬운 코드는 대체로 좋은 설계를 가진다. 테스트 가능성은 다음을 요구하기 때문이다.

| 특성 | 설명 |
|------|------|
| 낮은 결합도 | 의존성을 교체할 수 있다 |
| 명시적 의존 | 숨겨진 상태가 없다 |
| 단일 책임 | 테스트할 것이 명확하다 |
| 작은 함수 | 테스트 케이스가 적다 |

## 테스트 불가능한 코드

```python
class OrderService:
    def process_order(self, order_id):
        # 숨겨진 의존: 전역 DB 연결
        order = Database.get_connection().find(order_id)

        # 숨겨진 의존: 현재 시간
        if datetime.now().hour < 9:
            raise BusinessError("영업 시간이 아닙니다")

        # 숨겨진 의존: 외부 서비스
        PaymentGateway().charge(order.customer_id, order.total)

        # 숨겨진 의존: 이메일 발송
        EmailService().send(order.customer_email, "주문 완료")
```

이 코드를 테스트하려면 실제 데이터베이스, 결제 시스템, 이메일 서버가 필요하다. 시간도 조작해야 한다.

## 테스트 가능하게 리팩터링

```python
class OrderService:
    def __init__(self, db, payment, email, clock):
        self.db = db
        self.payment = payment
        self.email = email
        self.clock = clock

    def process_order(self, order_id):
        order = self.db.find(order_id)

        if self.clock.current_hour() < 9:
            raise BusinessError("영업 시간이 아닙니다")

        self.payment.charge(order.customer_id, order.total)
        self.email.send(order.customer_email, "주문 완료")
```

이제 테스트에서 가짜 객체를 주입할 수 있다.

```python
def test_process_order_during_business_hours():
    mock_db = MockDatabase()
    mock_db.add_order(Order(id=1, total=100, customer_email="test@test.com"))

    mock_payment = MockPayment()
    mock_email = MockEmail()
    mock_clock = MockClock(current_hour=10)

    service = OrderService(mock_db, mock_payment, mock_email, mock_clock)
    service.process_order(1)

    assert mock_payment.charged_amount == 100
    assert mock_email.sent_to == "test@test.com"

def test_process_order_before_business_hours():
    mock_clock = MockClock(current_hour=7)
    service = OrderService(None, None, None, mock_clock)

    with pytest.raises(BusinessError):
        service.process_order(1)
```

## 의존성 주입 패턴

**생성자 주입**

```python
class Service:
    def __init__(self, repository):
        self.repository = repository
```

가장 일반적인 패턴이다. 의존성이 명시적이다.

**메서드 주입**

```python
class Service:
    def do_something(self, repository):
        repository.save(data)
```

메서드별로 다른 의존성이 필요할 때 쓴다.

**팩토리/프로바이더**

```python
class Service:
    def __init__(self, repository_factory):
        self.get_repository = repository_factory

    def do_something(self):
        repo = self.get_repository()
        repo.save(data)
```

지연 생성이 필요할 때 쓴다.

## 시간과 랜덤

테스트하기 어려운 두 가지: 시간과 랜덤.

```python
# 직접 호출 (테스트 어려움)
import datetime
import random

def generate_order_id():
    timestamp = datetime.datetime.now().timestamp()
    rand = random.randint(1000, 9999)
    return f"ORD-{timestamp}-{rand}"

# 주입 (테스트 쉬움)
def generate_order_id(clock, random_source):
    timestamp = clock.now().timestamp()
    rand = random_source.randint(1000, 9999)
    return f"ORD-{timestamp}-{rand}"

# 테스트
def test_generate_order_id():
    mock_clock = MockClock(timestamp=1000000)
    mock_random = MockRandom(value=5555)

    order_id = generate_order_id(mock_clock, mock_random)

    assert order_id == "ORD-1000000-5555"
```

## 설계 질문

코드를 작성하기 전에 묻는다.

1. 이 코드를 어떻게 테스트할 것인가?
2. 어떤 의존성이 있는가?
3. 의존성을 주입할 수 있는가?
4. 테스트에서 뭘 확인할 것인가?

답이 어려우면 설계를 다시 생각한다.

## 정리

- 테스트 가능성은 좋은 설계의 신호다.
- 숨겨진 의존성을 명시적으로 만든다.
- 의존성 주입으로 테스트 시 교체할 수 있게 한다.
- 시간, 랜덤, I/O는 추상화해서 주입한다.
- 코드 작성 전에 테스트를 생각한다.

## 다음 장 예고

[Tip 69: Test Your Software, or Your Users Will](/blog/programming/engineering/pragmatic-programmer/tip69)에서는 테스트하지 않으면 사용자가 테스트한다는 경고를 다룬다.

## 관련 항목

- [Tip 66: A Test Is the First User of Your Code](/blog/programming/engineering/pragmatic-programmer/tip66)
- [Tip 67: Build End-to-End, Not Top-Down or Bottom-Up](/blog/programming/engineering/pragmatic-programmer/tip67)
- [Tip 69: Test Your Software, or Your Users Will](/blog/programming/engineering/pragmatic-programmer/tip69)
