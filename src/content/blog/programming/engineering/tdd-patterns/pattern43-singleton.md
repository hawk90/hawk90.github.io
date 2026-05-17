---
title: "Pattern 43: Singleton (avoid)"
date: 2026-07-02T19:00:00
description: "Beck도 추천하지 않는 패턴 — global state 회피."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 43
tags: [tdd, beck, singleton, anti-pattern]
draft: true
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> Singleton은 테스트를 어렵게 만들고 숨겨진 의존성을 만든다 — 가능한 피하라.

## 동기 (Motivation)

**Singleton**은 GoF 패턴 중 하나지만, TDD에서는 **안티패턴**으로 본다:

```python
# Singleton 사용
class Database:
    _instance = None

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

# 어디서나 접근 가능
db = Database.get_instance()
db.query("SELECT ...")
```

**문제**: 테스트에서 이 싱글턴을 어떻게 교체할 것인가?

## Singleton의 문제점

### 1. 테스트 격리 불가

```python
class UserService:
    def get_user(self, id):
        db = Database.get_instance()  # 숨겨진 의존성
        return db.query(f"SELECT * FROM users WHERE id={id}")

# 테스트
def test_get_user():
    service = UserService()
    # Database.get_instance()가 실제 DB 연결!
    # 테스트마다 DB 상태가 공유됨
    user = service.get_user(1)  # 어떤 데이터가 있는지 모름
```

### 2. 상태 공유

```python
def test_first():
    db = Database.get_instance()
    db.insert(User("Alice"))
    # Alice가 DB에 있음

def test_second():
    db = Database.get_instance()
    users = db.query("SELECT * FROM users")
    # test_first의 Alice가 남아 있을 수도!
    # 테스트 순서에 따라 결과 달라짐
```

### 3. 숨겨진 의존성

```python
class OrderProcessor:
    def process(self, order):
        # 시그니처만 보면 의존성이 안 보임
        db = Database.get_instance()
        logger = Logger.get_instance()
        mailer = Mailer.get_instance()
        # 실제로는 3개의 전역 의존성!
```

## 대안: Dependency Injection

### Before (Singleton)

```python
class UserService:
    def get_user(self, id):
        db = Database.get_instance()
        return db.query(f"SELECT * FROM users WHERE id={id}")
```

### After (DI)

```python
class UserService:
    def __init__(self, database):
        self.db = database  # 의존성 명시적 주입

    def get_user(self, id):
        return self.db.query(f"SELECT * FROM users WHERE id={id}")

# 프로덕션
service = UserService(PostgresDatabase())

# 테스트
service = UserService(FakeDatabase())
```

## 테스트 가능한 설계

### 1. Constructor Injection

```python
class OrderProcessor:
    def __init__(self, database, logger, mailer):
        self.db = database
        self.logger = logger
        self.mailer = mailer

    def process(self, order):
        self.logger.info(f"Processing {order.id}")
        self.db.save(order)
        self.mailer.send_confirmation(order)

# 테스트
def test_order_processing():
    fake_db = FakeDatabase()
    fake_logger = FakeLogger()
    fake_mailer = FakeMailer()

    processor = OrderProcessor(fake_db, fake_logger, fake_mailer)
    processor.process(order)

    assert fake_db.saved_orders == [order]
    assert fake_mailer.sent_emails == 1
```

### 2. Factory/Provider 패턴

```python
class DatabaseProvider:
    """테스트에서 교체 가능한 Provider"""
    _factory = lambda: PostgresDatabase()

    @classmethod
    def get(cls):
        return cls._factory()

    @classmethod
    def set_factory(cls, factory):
        cls._factory = factory

# 테스트
def test_with_fake_db():
    DatabaseProvider.set_factory(lambda: FakeDatabase())
    try:
        # 테스트 코드
        pass
    finally:
        DatabaseProvider.set_factory(lambda: PostgresDatabase())
```

### 3. Context/Scope 기반

```python
from contextlib import contextmanager

class AppContext:
    def __init__(self):
        self.database = None
        self.logger = None

_current_context = None

@contextmanager
def app_context(database, logger):
    global _current_context
    old = _current_context
    _current_context = AppContext()
    _current_context.database = database
    _current_context.logger = logger
    try:
        yield _current_context
    finally:
        _current_context = old

# 사용
with app_context(FakeDatabase(), FakeLogger()) as ctx:
    service = UserService(ctx.database)
    # 테스트
```

## 진짜 Singleton이 필요한 경우

**매우 드물게** Singleton이 적합한 경우:

```python
# 1. 진정한 하드웨어 자원 (시스템에 하나뿐)
class SerialPort:
    """물리적으로 하나뿐인 시리얼 포트"""
    pass

# 2. 로깅 (side effect가 테스트 결과에 영향 없음)
class Logger:
    """로깅은 테스트 격리에 영향 없음"""
    pass

# 3. 설정 (읽기 전용)
class Config:
    """불변 설정은 공유해도 안전"""
    pass
```

**그러나** 이 경우에도 테스트를 위해 **교체 가능**하게 설계:

```python
class Logger:
    _instance = None
    _test_instance = None  # 테스트용 교체 지점

    @classmethod
    def get_instance(cls):
        if cls._test_instance:
            return cls._test_instance
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    @classmethod
    def set_test_instance(cls, instance):
        cls._test_instance = instance

    @classmethod
    def reset_test_instance(cls):
        cls._test_instance = None
```

## pytest fixture로 DI

```python
import pytest

@pytest.fixture
def fake_database():
    return FakeDatabase()

@pytest.fixture
def fake_mailer():
    return FakeMailer()

@pytest.fixture
def order_processor(fake_database, fake_mailer):
    return OrderProcessor(
        database=fake_database,
        mailer=fake_mailer
    )

def test_process_order(order_processor, fake_database):
    order = Order(id=1, items=["item1"])

    order_processor.process(order)

    assert len(fake_database.saved) == 1
```

## Singleton vs DI 비교

| 관점 | Singleton | DI |
|------|-----------|-----|
| 테스트 격리 | 어려움 | 쉬움 |
| 의존성 파악 | 숨겨짐 | 명시적 |
| 유연성 | 낮음 | 높음 |
| 코드량 | 적음 | 다소 많음 |
| 상태 관리 | 전역 | 지역 |

## 정리

- **Singleton은 TDD에서 안티패턴**
- **숨겨진 의존성** 생성
- **테스트 격리 방해**
- **전역 상태 공유** 문제
- **대안**: Dependency Injection
- **진짜 필요한 경우는 드묾**

## 관련 패턴

- [Pattern 37: Pluggable Object](/blog/programming/engineering/tdd-patterns/pattern37-pluggable-object) — 객체 교체
- [Pattern 40: Imposter](/blog/programming/engineering/tdd-patterns/pattern40-imposter) — 테스트 대역
- [Pattern 39: Factory Method](/blog/programming/engineering/tdd-patterns/pattern39-factory-method) — 생성 캡슐화

