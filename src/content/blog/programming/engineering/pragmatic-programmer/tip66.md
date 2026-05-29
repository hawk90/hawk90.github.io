---
title: "Tip 66: A Test Is the First User of Your Code"
date: 2026-05-11T18:00:00
description: "테스트는 코드의 첫 번째 사용자다. 테스트가 어려우면 실제 사용자도 어렵다."
series: "The Pragmatic Programmer"
seriesOrder: 66
tags: [pragmatic-programmer, testing, design]
draft: true
---

## 이 팁의 메시지

> **Tip 66: A Test Is the First User of Your Code.** A test that's hard to write is a warning sign about your design.

테스트를 작성하기 어려우면 설계에 경고 신호다.

## 테스트 = 첫 번째 사용자

테스트 코드는 당신의 API를 사용하는 첫 번째 코드다. 테스트 작성이 어렵다면, 다른 개발자도 API 사용이 어려울 것이다.

```python
# 테스트 작성이 어려운 API
class ReportGenerator:
    def generate(self):
        data = self._fetch_from_database()
        template = self._load_template_from_disk()
        config = ConfigSingleton.get_instance()
        # ...
```

테스트하려면 데이터베이스, 파일 시스템, 싱글톤을 모두 준비해야 한다.

```python
# 테스트 작성이 쉬운 API
class ReportGenerator:
    def __init__(self, data_source, template_loader, config):
        self.data_source = data_source
        self.template_loader = template_loader
        self.config = config

    def generate(self):
        data = self.data_source.fetch()
        template = self.template_loader.load()
        # ...
```

의존성을 주입받으면 테스트에서 가짜 객체를 넣을 수 있다.

## 테스트가 보여주는 문제

테스트 작성 시 겪는 어려움은 설계 문제를 드러낸다.

| 테스트의 어려움 | 설계 문제 |
|----------------|----------|
| 설정이 많다 | 객체가 너무 많은 의존성을 가진다 |
| 모킹이 많다 | 결합도가 높다 |
| 테스트가 길다 | 함수가 너무 많은 일을 한다 |
| 테스트하기 어려운 부분이 있다 | 부작용이 로직에 섞여 있다 |

## 예: 부작용 분리

```python
# 테스트 어려움: 로직과 I/O가 섞임
def process_order(order_id):
    order = db.get_order(order_id)
    if order.total > 100:
        discount = order.total * 0.1
    else:
        discount = 0
    order.discount = discount
    db.save(order)
    email.send(order.customer, "주문 처리 완료")
    return order
```

테스트하려면 DB와 이메일 시스템이 필요하다.

```python
# 테스트 쉬움: 로직 분리
def calculate_discount(total: float) -> float:
    if total > 100:
        return total * 0.1
    return 0

def process_order(order_id, db, email_service):
    order = db.get_order(order_id)
    order.discount = calculate_discount(order.total)
    db.save(order)
    email_service.send(order.customer, "주문 처리 완료")
    return order

# 순수 로직 테스트
def test_calculate_discount():
    assert calculate_discount(150) == 15
    assert calculate_discount(50) == 0
```

순수 로직은 모킹 없이 테스트한다. I/O가 있는 부분만 모킹한다.

## 인터페이스 설계 검증

테스트가 API 사용성을 검증한다.

```python
# 사용하기 어려운 API
def test_awkward_api():
    builder = ComplexBuilder()
    builder.set_option_a(True)
    builder.set_option_b(False)
    builder.set_option_c("value")
    builder.set_option_d(42)
    config = builder.build()
    processor = Processor(config)
    processor.initialize()
    processor.prepare()
    result = processor.execute(data)
```

테스트 코드가 길면 실제 사용 코드도 길다.

```python
# 사용하기 쉬운 API
def test_clean_api():
    processor = Processor.with_defaults()
    result = processor.execute(data)
```

테스트가 짧으면 API가 사용하기 쉽다.

## 테스트 먼저 작성

TDD에서 테스트를 먼저 작성하면, API를 사용하는 관점에서 설계하게 된다.

```python
# 1. 먼저 테스트 작성: 어떻게 사용하고 싶은가?
def test_user_authentication():
    auth = Authenticator()
    result = auth.login("user@example.com", "password")
    assert result.success
    assert result.token is not None

# 2. 테스트가 통과하도록 구현
class Authenticator:
    def login(self, email: str, password: str) -> AuthResult:
        ...
```

테스트가 API의 모양을 결정한다.

## 정리

- 테스트는 API의 첫 번째 사용자다.
- 테스트 작성이 어려우면 설계를 개선한다.
- 순수 로직과 I/O를 분리한다.
- 테스트 코드 길이가 API 사용성을 반영한다.
- 테스트를 먼저 작성하면 좋은 API가 나온다.

## 다음 장 예고

[Tip 67: Build End-to-End, Not Top-Down or Bottom-Up](/blog/programming/engineering/pragmatic-programmer/tip67)에서는 시스템을 점진적으로 완성하는 방법을 다룬다.

## 관련 항목

- [Tip 65: Testing Is Not About Finding Bugs](/blog/programming/engineering/pragmatic-programmer/tip65)
- [Tip 67: Build End-to-End, Not Top-Down or Bottom-Up](/blog/programming/engineering/pragmatic-programmer/tip67)
