---
title: "Pattern 49: Extract Interface"
date: 2026-07-03T01:00:00
description: "Test seam·dependency 분리 — interface 추출."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 49
tags: [tdd, beck, extract-interface, dependency-inversion]
draft: true
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> 구체 클래스에서 인터페이스를 추출하여 테스트 대역 주입을 가능하게 한다.

## 동기 (Motivation)

**구체 클래스에 직접 의존**하면 테스트가 어렵다:

```python
class OrderService:
    def __init__(self):
        self.db = PostgresDatabase()  # 구체 클래스에 의존

    def get_order(self, id):
        return self.db.query(f"SELECT * FROM orders WHERE id={id}")
```

**인터페이스를 추출**하면 대역 주입이 가능해진다.

## Extract Interface 적용

### Before (구체 의존)

```python
class PostgresDatabase:
    def query(self, sql):
        # 실제 DB 연결
        return self.connection.execute(sql)

    def save(self, table, data):
        # 실제 저장
        pass

class OrderService:
    def __init__(self):
        self.db = PostgresDatabase()  # 하드코딩
```

### After (인터페이스 의존)

```python
from abc import ABC, abstractmethod

class Database(ABC):
    """추출된 인터페이스"""
    @abstractmethod
    def query(self, sql) -> list:
        pass

    @abstractmethod
    def save(self, table, data) -> None:
        pass

class PostgresDatabase(Database):
    def query(self, sql):
        return self.connection.execute(sql)

    def save(self, table, data):
        # 실제 저장
        pass

class OrderService:
    def __init__(self, database: Database):  # 인터페이스에 의존
        self.db = database
```

## 테스트에서의 활용

### Fake 구현

```python
class FakeDatabase(Database):
    """테스트용 가짜 DB"""
    def __init__(self):
        self.data = {}
        self.queries = []

    def query(self, sql):
        self.queries.append(sql)
        return self.data.get(sql, [])

    def save(self, table, data):
        if table not in self.data:
            self.data[table] = []
        self.data[table].append(data)
```

### 테스트 작성

```python
def test_get_order():
    # Fake 주입
    fake_db = FakeDatabase()
    fake_db.data["SELECT * FROM orders WHERE id=1"] = [
        {"id": 1, "total": 100}
    ]

    service = OrderService(fake_db)

    order = service.get_order(1)

    assert order["total"] == 100

def test_save_order():
    fake_db = FakeDatabase()
    service = OrderService(fake_db)

    service.save_order(Order(id=1, total=100))

    assert len(fake_db.data["orders"]) == 1
```

## Python의 Protocol

**Python 3.8+**에서는 `Protocol`로 암묵적 인터페이스:

```python
from typing import Protocol

class Database(Protocol):
    """구조적 서브타이핑"""
    def query(self, sql: str) -> list: ...
    def save(self, table: str, data: dict) -> None: ...

# 명시적 상속 없이도 호환
class PostgresDatabase:
    def query(self, sql: str) -> list:
        return self.connection.execute(sql)

    def save(self, table: str, data: dict) -> None:
        pass

class FakeDatabase:
    def query(self, sql: str) -> list:
        return []

    def save(self, table: str, data: dict) -> None:
        pass

# 둘 다 Database 프로토콜 충족
def use_database(db: Database):
    db.query("SELECT 1")
```

## 추출 과정

### Step 1: 사용되는 메서드 식별

```python
class EmailSender:
    def send(self, to, subject, body):
        # SMTP 로직
        pass

    def send_bulk(self, recipients, subject, body):
        for r in recipients:
            self.send(r, subject, body)

    def validate_email(self, email):
        # 유효성 검사
        pass

# OrderService는 send()만 사용
class OrderService:
    def __init__(self, email_sender):
        self.email = email_sender

    def confirm_order(self, order):
        self.email.send(
            order.customer.email,
            "Order Confirmed",
            f"Order {order.id} confirmed"
        )
```

### Step 2: 필요한 메서드만 인터페이스로

```python
class Notifier(ABC):
    """필요한 것만 추출"""
    @abstractmethod
    def send(self, to: str, subject: str, body: str) -> None:
        pass

# EmailSender가 구현
class EmailSender(Notifier):
    def send(self, to, subject, body):
        # SMTP 로직
        pass

# 다른 구현 가능
class SlackNotifier(Notifier):
    def send(self, to, subject, body):
        # Slack 메시지
        pass
```

### Step 3: 의존성 주입

```python
class OrderService:
    def __init__(self, notifier: Notifier):  # 인터페이스에 의존
        self.notifier = notifier
```

## Interface Segregation

**너무 큰 인터페이스**는 분리:

```python
# Bad — 너무 큰 인터페이스
class Repository(ABC):
    @abstractmethod
    def find(self, id): pass

    @abstractmethod
    def find_all(self): pass

    @abstractmethod
    def save(self, entity): pass

    @abstractmethod
    def delete(self, id): pass

    @abstractmethod
    def count(self): pass

    @abstractmethod
    def exists(self, id): pass

# Good — 분리된 인터페이스
class Reader(ABC):
    @abstractmethod
    def find(self, id): pass

    @abstractmethod
    def find_all(self): pass

class Writer(ABC):
    @abstractmethod
    def save(self, entity): pass

    @abstractmethod
    def delete(self, id): pass

# 필요한 것만 의존
class ReportService:
    def __init__(self, reader: Reader):  # 읽기만 필요
        self.reader = reader
```

## Dependency Inversion

```text
Before:
  OrderService → PostgresDatabase (구체)

After:
  OrderService → Database (추상)
                    ↑
             PostgresDatabase
             FakeDatabase
```

**고수준 모듈**(OrderService)이 **저수준 모듈**(PostgresDatabase)에 의존하지 않음.

## 주의사항

### Over-abstraction

```python
# Bad — 모든 것에 인터페이스
class StringFormatterInterface(ABC):
    @abstractmethod
    def format(self, s: str) -> str: pass

class UpperCaseFormatter(StringFormatterInterface):
    def format(self, s: str) -> str:
        return s.upper()

# Good — 단순한 경우는 그냥 함수
def uppercase(s: str) -> str:
    return s.upper()
```

### 테스트에 필요할 때만

```python
# 외부 의존성 → 인터페이스 추출
# 순수 로직 → 인터페이스 불필요

class Calculator:  # 인터페이스 불필요
    def add(self, a, b):
        return a + b

class PaymentGateway(ABC):  # 인터페이스 필요
    @abstractmethod
    def charge(self, amount): pass
```

## 정리

- **구체 클래스에서 인터페이스 추출**
- **테스트 대역 주입** 가능
- **Dependency Inversion** 실현
- **Python Protocol**로 암묵적 구현
- **필요한 메서드만** 인터페이스에
- **Over-abstraction 주의**

## 관련 패턴

- [Pattern 40: Imposter](/blog/programming/engineering/tdd-patterns/pattern40-imposter) — 테스트 대역
- [Pattern 43: Singleton](/blog/programming/engineering/tdd-patterns/pattern43-singleton) — DI 대안
- [Pattern 37: Pluggable Object](/blog/programming/engineering/tdd-patterns/pattern37-pluggable-object) — 객체 교체

