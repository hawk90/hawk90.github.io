---
title: "Pattern 43: Singleton (avoid)"
date: 2026-05-10T19:00:00
description: "Beck도 추천하지 않는 패턴 — global state 회피, DI 우선."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 43
tags: [tdd, beck, singleton, anti-pattern]
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
draft: true

---

## 한 줄 요약

> Singleton은 테스트를 어렵게 만들고 숨겨진 의존성을 만든다. 가능한 피하고 DI 사용.

## 동기

Singleton은 GoF 패턴이지만 TDD에선 안티패턴.

```python
class Database:
    _instance = None
    @classmethod
    def get_instance(cls):
        if cls._instance is None: cls._instance = cls()
        return cls._instance

# 어디서나
db = Database.get_instance()
```

**문제**:
- 테스트에서 교체 불가.
- 숨겨진 의존성 — signature에 안 보임.
- 전역 상태 공유 — 테스트 격리 깨짐.

### 신호

- 테스트마다 *DB/state 초기화* 부담.
- 코드 곳곳 `getInstance()` 호출.
- test 순서 의존.
- mocking 어려움.

### 언제 적용 해도 되는가

- 진정한 hardware 자원 (serial port).
- immutable config (변경 없음).
- stateless logger.
- cross-cutting concern (metric).

진짜 unavoidable인 경우만.

## 절차 (Mechanics) — Singleton 제거

1. **Singleton 사용처 식별**.
2. **dependency를 constructor 주입**.
3. Singleton class는 factory로 전환.
4. test에서 fake 주입.

## 예시 1 — Before/After

```python
# Before — Singleton 의존
class UserService:
    def get_user(self, id):
        db = Database.get_instance()
        return db.query(...)

# After — DI
class UserService:
    def __init__(self, database):
        self.db = database

    def get_user(self, id):
        return self.db.query(...)

# 사용
service = UserService(PostgresDatabase())   # production
service = UserService(FakeDatabase())       # test
```

의존성 명시 + 교체 가능하다.

## 예시 2 — Multiple dependency

```python
class OrderProcessor:
    def __init__(self, database, logger, mailer):
        self.db = database
        self.logger = logger
        self.mailer = mailer

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

세 dependency 모두 명시 + test에서 fake.

## 예시 3 — Pytest fixture로 DI

```python
@pytest.fixture
def fake_database():
    return FakeDatabase()

@pytest.fixture
def fake_mailer():
    return FakeMailer()

@pytest.fixture
def order_processor(fake_database, fake_mailer):
    return OrderProcessor(database=fake_database, mailer=fake_mailer)

def test_process_order(order_processor, fake_database):
    order = Order(id=1, items=["item1"])
    order_processor.process(order)
    assert len(fake_database.saved) == 1
```

fixture가 자동 주입.

## 자주 보는 안티패턴

### 1. Singleton + 전역 mutable state

가장 위험. 테스트 격리 불가.

### 2. Singleton + 숨은 호출

class deep에 `getInstance()` → 의존 알기 어려움.

### 3. Test에서 reset 필요

`Singleton.reset()` 호출 + 잊으면 leak → flaky.

### 4. Thread-safe 무시

multi-thread에서 `getInstance()` race → double creation.

### 5. Singleton + Database connection

test마다 production DB connect → 데이터 손상 위험.

### 6. Singleton 검증 어려움

행동 검증보다 상태 검증에 집착 → fragile.

## Modern variants

### Dependency Injection framework

```java
@Component
public class OrderProcessor {
    @Autowired private Database db;
    @Autowired private Mailer mailer;
}
```

Spring, Guice, Dagger가 DI container 관리.

### Service locator

```python
class ServiceLocator:
    services = {}

    @classmethod
    def register(cls, name, instance):
        cls.services[name] = instance

    @classmethod
    def get(cls, name):
        return cls.services[name]
```

test에서 register 교체. Singleton보다 조금 나음.

### Context object

```python
@contextmanager
def app_context(database, logger):
    ctx = AppContext(database, logger)
    try: yield ctx
    finally: pass

with app_context(FakeDb(), FakeLogger()) as ctx:
    service = UserService(ctx.database)
```

scope 명시.

### Factory + flag

```python
class DatabaseFactory:
    _factory = lambda: PostgresDatabase()

    @classmethod
    def create(cls): return cls._factory()

    @classmethod
    def set_factory(cls, fn): cls._factory = fn

# Test
DatabaseFactory.set_factory(lambda: FakeDatabase())
```

### Module-level singleton (Python)

```python
# module.py
_db = None

def get_db():
    global _db
    if _db is None: _db = Database()
    return _db

# Test에서 monkey-patch 가능
import module
module._db = FakeDatabase()
```

Python module 자체가 singleton-like.

### Rust — global state 어려움 by design

```rust
// Rust는 global mut state 의도적으로 어렵게
static GLOBAL: Mutex<Option<Database>> = Mutex::new(None);
```

언어가 Singleton 회피 강제.

## Singleton vs DI

| 관점 | Singleton | DI |
| --- | --- | --- |
| 테스트 격리 | 어려움 | 쉬움 |
| 의존성 파악 | 숨겨짐 | 명시 |
| 유연성 | 낮음 | 높음 |
| 상태 관리 | 전역 | 지역 |
| 동시성 | 위험 | 안전 |

## 도구 / IDE

| 도구 | 기능 |
| --- | --- |
| Spring | DI container |
| Guice | DI |
| Dagger | compile-time DI |
| InversifyJS | TS DI |
| pytest fixture | test DI |

## 성능 고려

- DI overhead: 객체 생성/lookup 약간. JIT inline.
- Singleton: lookup 빠름 (단 thread-safe lock 비용).
- 대부분 무시할 수준. 디자인 우선.

## 관련 패턴

- [Pattern 37: Pluggable Object](/blog/programming/engineering/tdd-patterns/pattern37-pluggable-object) — 객체 교체
- [Pattern 40: Imposter](/blog/programming/engineering/tdd-patterns/pattern40-imposter) — 테스트 대역
- [Pattern 39: Factory Method](/blog/programming/engineering/tdd-patterns/pattern39-factory-method) — 생성 캡슐화
- anti-pattern 인식: Singleton, Service Locator (조심)
