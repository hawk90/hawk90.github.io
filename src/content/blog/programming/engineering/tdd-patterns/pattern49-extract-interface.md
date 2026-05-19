---
title: "Pattern 49: Extract Interface"
date: 2026-05-10T01:00:00
description: "Test seam·dependency 분리 — interface 추출로 DIP 실현."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 49
tags: [tdd, beck, extract-interface, dependency-inversion]
draft: true
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> 구체 class에서 *interface 추출* → *test 대역 주입 가능*. Dependency Inversion 실현.

## 동기 (Motivation)

구체 의존이 *test 방해*:

```python
class OrderService:
    def __init__(self):
        self.db = PostgresDatabase()   # 구체 의존
```

*test에서 fake 못 끼움*. 인터페이스 추출 후 DI:

```python
class Database(ABC):
    @abstractmethod
    def query(self, sql) -> list: pass

class OrderService:
    def __init__(self, database: Database):   # 인터페이스 의존
        self.db = database
```

### 신호

- *test에서 외부 의존 대체* 어려움.
- 코드가 *구체 class 직접 import*.
- *DIP 위반*.
- *플러그인 시스템* 필요.

### 언제 적용하는가

- *외부 의존성* (DB, network, FS).
- *test seam* 필요.
- *DIP* 적용.
- *plugin*/strategy.

### 언제 적용하지 않는가

- *순수 로직* — DIP 무관.
- 구현이 *진짜 하나*뿐 + 변경 없음.
- *Over-abstraction* 위험.

## 절차 (Mechanics)

1. **사용되는 method** 식별 — 호출자가 진짜 부르는 것만.
2. **abstract base / interface** 작성.
3. *구체 class*가 *상속/구현*.
4. **caller signature**를 *interface로* 변경.
5. *test에서 fake/mock 주입*.

## 예시 1 — DB interface

```python
class Database(ABC):
    @abstractmethod
    def query(self, sql) -> list: pass
    @abstractmethod
    def save(self, table, data) -> None: pass

class PostgresDatabase(Database):
    def query(self, sql): ...
    def save(self, table, data): ...

class FakeDatabase(Database):
    def __init__(self): self.data = {}; self.queries = []
    def query(self, sql):
        self.queries.append(sql)
        return self.data.get(sql, [])
    def save(self, table, data):
        self.data.setdefault(table, []).append(data)

class OrderService:
    def __init__(self, database: Database):
        self.db = database

# Test
def test_get_order():
    fake = FakeDatabase()
    fake.data["SELECT * FROM orders WHERE id=1"] = [{"id": 1, "total": 100}]
    service = OrderService(fake)
    assert service.get_order(1)["total"] == 100
```

## 예시 2 — Python Protocol (structural)

```python
from typing import Protocol

class Database(Protocol):
    def query(self, sql: str) -> list: ...
    def save(self, table: str, data: dict) -> None: ...

# 명시적 상속 없이도 OK
class PostgresDatabase:
    def query(self, sql): return self.conn.execute(sql)
    def save(self, table, data): ...

class FakeDatabase:
    def query(self, sql): return []
    def save(self, table, data): pass

def use(db: Database):   # protocol type
    db.query("SELECT 1")
```

duck typing + 명시 type.

## 예시 3 — Interface segregation

```python
# Bad — 너무 큰
class Repository(ABC):
    def find(self): ...
    def save(self): ...
    def delete(self): ...
    def count(self): ...
    def exists(self): ...

# Good — 분리
class Reader(ABC):
    def find(self): pass

class Writer(ABC):
    def save(self): pass
    def delete(self): pass

class ReportService:
    def __init__(self, reader: Reader):   # 읽기만 필요
        self.reader = reader
```

ISP — 필요한 것만 의존.

## 자주 보는 안티패턴

### 1. *모든 class에 interface*
순수 로직까지 → boilerplate. *외부 경계*만.

### 2. *Interface가 1대1 매핑*
구현이 *항상 1개*면 interface 가치 작음. 진짜 *교체 가능*해야.

### 3. *Interface 너무 큼*
모든 method 포함 → 구현 부담. ISP.

### 4. *Mock 대신 fake 안 만듦*
mock library 의존 → coupled. *진짜 fake* 작성.

### 5. *Concrete leak*
caller가 `isinstance(db, PostgresDatabase)` → DIP 깨짐. interface만 사용.

### 6. *Interface가 implementation detail 노출*
`get_connection()` 같은 *내부 method* interface에 → 누수.

## Modern variants

### Java/Kotlin interface

```java
public interface Database {
    List<Row> query(String sql);
    void save(String table, Map<String, Object> data);
}
```

### TypeScript

```typescript
interface Database {
  query(sql: string): Row[];
  save(table: string, data: Record<string, unknown>): void;
}
```

### Rust trait

```rust
trait Database {
    fn query(&self, sql: &str) -> Vec<Row>;
    fn save(&self, table: &str, data: &Data);
}
```

trait + `Box<dyn Database>` 또는 generic.

### Go interface (implicit)

```go
type Database interface {
    Query(sql string) []Row
    Save(table string, data Data)
}
// 구현 명시 안 함 — method만 맞으면 OK
```

structural typing.

### Hexagonal architecture

```text
domain ──→ port (interface) ←── adapter (impl)
```

domain이 *port에만 의존*, adapter 교체 가능.

### DDD Repository pattern

```python
class UserRepository(ABC):
    @abstractmethod
    def find_by_id(self, id) -> User: pass
    @abstractmethod
    def save(self, user: User) -> None: pass

class SqlUserRepository(UserRepository): ...
class InMemoryUserRepository(UserRepository): ...
```

도메인은 *repository interface*만 안다.

## 도구 / IDE

| 도구 | 기능 |
| --- | --- |
| IntelliJ "Extract Interface" | 자동 |
| Resharper | 같음 |
| Pyright/Mypy Protocol | structural type 검증 |
| TypeScript interface | 명시 type |

## Dependency Inversion Principle

```text
Before:
  OrderService → PostgresDatabase (구체)

After:
  OrderService → Database (추상)
                   ↑
            PostgresDatabase
            FakeDatabase
```

상위 모듈이 *추상에만 의존*. SOLID의 D.

## 성능 고려

interface call은 *vtable lookup* — JIT inline. 거의 무관. Rust trait object는 *약간 비용* (dynamic dispatch) — generic으로 *static dispatch* 가능.

## 관련 패턴

- [Pattern 40: Imposter](/blog/programming/engineering/tdd-patterns/pattern40-imposter) — 테스트 대역
- [Pattern 43: Singleton](/blog/programming/engineering/tdd-patterns/pattern43-singleton) — DI 대안
- [Pattern 37: Pluggable Object](/blog/programming/engineering/tdd-patterns/pattern37-pluggable-object) — 객체 교체
- SOLID DIP, ISP
- Hexagonal architecture (ports & adapters)
