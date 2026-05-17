---
title: "Pattern 40: Imposter"
date: 2026-07-02T16:00:00
description: "다른 객체 *척하기* — polymorphism via duck typing."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 40
tags: [tdd, beck, imposter, duck-typing]
draft: true
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> 기존 객체와 동일한 인터페이스를 구현하여 테스트에서 진짜 객체처럼 행세한다.

## 동기 (Motivation)

테스트에서 **실제 객체를 사용하기 어려울 때**:

```python
# 실제 서버에 요청? 테스트가 느리고 불안정
response = http_client.get("https://api.example.com/users")
```

**Imposter**는 실제 객체와 **같은 인터페이스**를 가진 **가짜 객체**다.

## Imposter 패턴

### 실제 객체

```python
class HttpClient:
    def get(self, url):
        return requests.get(url)

    def post(self, url, data):
        return requests.post(url, json=data)
```

### Imposter (가짜)

```python
class FakeHttpClient:
    """HttpClient처럼 행세하는 Imposter"""
    def __init__(self):
        self.responses = {}

    def get(self, url):
        return self.responses.get(url, Response(404))

    def post(self, url, data):
        return Response(201)

    def stub_response(self, url, response):
        self.responses[url] = response
```

### 테스트에서 사용

```python
def test_fetch_users():
    # Imposter 설정
    fake_client = FakeHttpClient()
    fake_client.stub_response(
        "https://api.example.com/users",
        Response(200, json={"users": ["Alice", "Bob"]})
    )

    # SUT에 Imposter 주입
    service = UserService(http_client=fake_client)

    # 테스트
    users = service.get_users()
    assert users == ["Alice", "Bob"]
```

## Duck Typing

**Imposter**는 **duck typing**에 기반한다:

```python
# "오리처럼 걷고 오리처럼 울면 오리다"
# "get()과 post()가 있으면 HttpClient다"

def fetch_data(client):
    # client가 뭔지 상관없음
    # get() 메서드만 있으면 됨
    return client.get("/data")

# 둘 다 동작
fetch_data(RealHttpClient())
fetch_data(FakeHttpClient())
```

## Imposter vs 다른 패턴

| 패턴 | 특징 |
|------|------|
| Mock | 호출 검증에 초점 |
| Stub | 고정 응답 반환 |
| Fake | 실제 동작하는 단순 구현 |
| **Imposter** | 같은 인터페이스, 다른 구현 (일반화) |

Imposter는 **Mock, Stub, Fake의 상위 개념**이다.

## Self Shunt와의 관계

**Self Shunt**도 Imposter의 한 형태:

```python
class TestObserver:
    """테스트 클래스가 Observer처럼 행세"""
    def __init__(self):
        self.events = []

    def on_event(self, event):
        self.events.append(event)

    def test_publisher_notifies(self):
        publisher = Publisher()
        publisher.add_observer(self)  # 테스트 클래스가 Imposter

        publisher.publish("hello")

        assert "hello" in self.events
```

## Crash Test Dummy와의 관계

**Crash Test Dummy**도 Imposter의 한 형태:

```python
class FailingDatabase:
    """Database처럼 행세하지만 항상 실패"""
    def save(self, data):
        raise DatabaseError("Connection lost")

    def query(self, sql):
        raise DatabaseError("Timeout")
```

## 테스트 Seam 생성

Imposter는 **테스트 가능한 지점(seam)**을 만든다:

```python
class OrderService:
    def __init__(self, payment_gateway, inventory, notifier):
        # 세 곳 모두 Imposter 주입 가능
        self.payment = payment_gateway
        self.inventory = inventory
        self.notifier = notifier

# 테스트
def test_order_processing():
    service = OrderService(
        payment_gateway=FakePayment(),    # Imposter
        inventory=FakeInventory(),         # Imposter
        notifier=FakeNotifier()            # Imposter
    )
    # 완전히 격리된 테스트
```

## 인터페이스 없이 Imposter

Python에서는 **명시적 인터페이스 없이**도 Imposter 가능:

```python
# 인터페이스 정의 없음
class RealDatabase:
    def save(self, data): ...
    def query(self, sql): ...

class FakeDatabase:
    def save(self, data): ...  # 같은 메서드만 있으면 됨
    def query(self, sql): ...

# 둘 다 사용 가능
def process(db):
    db.save(data)
    return db.query("SELECT ...")
```

### 타입 힌트로 명시

```python
from typing import Protocol

class Database(Protocol):
    def save(self, data) -> None: ...
    def query(self, sql) -> list: ...

def process(db: Database):  # 프로토콜 사용
    ...
```

## 정리

- **같은 인터페이스**를 구현하는 가짜 객체
- **Duck typing** 기반
- **Mock, Stub, Fake의 일반화**
- **Self Shunt, Crash Test Dummy**의 상위 개념
- **테스트 seam** 생성
- **상속 없이 polymorphism**

## 관련 패턴

- [Pattern 17: Mock Object](/blog/programming/engineering/tdd-patterns/pattern17-mock-object) — 호출 검증
- [Pattern 18: Self Shunt](/blog/programming/engineering/tdd-patterns/pattern18-self-shunt) — 테스트가 Imposter
- [Pattern 20: Crash Test Dummy](/blog/programming/engineering/tdd-patterns/pattern20-crash-test-dummy) — 에러 유발 Imposter

