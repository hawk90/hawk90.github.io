---
title: "Pattern 40: Imposter"
date: 2026-05-10T16:00:00
description: "다른 객체 *척하기* — duck typing 기반 polymorphism. Mock/Stub/Fake의 상위 개념."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 40
tags: [tdd, beck, imposter, duck-typing]
draft: true
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> 기존 객체와 *동일 인터페이스*를 구현해 *테스트에서 진짜처럼* 행세. *Mock/Stub/Fake의 상위 개념*.

## 동기 (Motivation)

테스트에서 *실제 객체 사용 어려움*:

```python
# 실제 server 요청? 느림 + 불안정
response = http_client.get("https://api.example.com/users")
```

**Imposter**는 *같은 인터페이스*를 가진 *가짜 객체*. *duck typing*에 기반.

### 신호

- 외부 자원 의존이 test 어렵게 만듦.
- Mock library 의존 부담.
- *flexible substitution* 필요.

### Imposter vs 다른 패턴

| 패턴 | 특징 |
| --- | --- |
| Mock | 호출 검증 중심 |
| Stub | 고정 응답 |
| Fake | 동작하는 단순 구현 |
| **Imposter** | 같은 인터페이스, 다른 구현 (일반) |

Imposter는 *상위 개념*. Mock/Stub/Fake/NullObject 모두 Imposter의 한 형태.

### 언제 적용하는가

- *외부 자원 격리*.
- *test seam* 만들기.
- *interface가 작고 명확*.
- *동적 언어*에서 자연.

### 언제 적용하지 않는가

- 실제 동작 검증이 *핵심* (integration test).
- *큰 interface* — Imposter 작성 부담.

## 절차 (Mechanics)

1. **target interface** 식별.
2. **Imposter class** 작성 — 같은 method signature.
3. **본문**은 *no-op / stub response / error throw* 등.
4. SUT가 *interface로 의존*.
5. test에서 Imposter 주입.

## 예시 1 — Fake HttpClient

```python
class HttpClient:
    def get(self, url): return requests.get(url)
    def post(self, url, data): return requests.post(url, json=data)

class FakeHttpClient:
    """HttpClient처럼 행세"""
    def __init__(self):
        self.responses = {}

    def get(self, url):
        return self.responses.get(url, Response(404))

    def post(self, url, data):
        return Response(201)

    def stub_response(self, url, response):
        self.responses[url] = response

# 테스트
def test_fetch_users():
    fake_client = FakeHttpClient()
    fake_client.stub_response(
        "https://api.example.com/users",
        Response(200, json={"users": ["Alice", "Bob"]})
    )

    service = UserService(http_client=fake_client)
    users = service.get_users()
    assert users == ["Alice", "Bob"]
```

## 예시 2 — Duck typing

```python
# 인터페이스 정의 없음
class RealDatabase:
    def save(self, data): ...
    def query(self, sql): ...

class FakeDatabase:
    def save(self, data): ...    # 같은 method
    def query(self, sql): ...

def process(db):
    db.save(data)
    return db.query("SELECT ...")

# 둘 다 동작
process(RealDatabase())
process(FakeDatabase())
```

method 시그니처만 *맞으면 OK*.

## 예시 3 — Protocol type (Python 3.8+)

```python
from typing import Protocol

class Database(Protocol):
    def save(self, data) -> None: ...
    def query(self, sql) -> list: ...

class RealDatabase:
    def save(self, data): ...
    def query(self, sql): ...

class FakeDatabase:
    def save(self, data): ...
    def query(self, sql): ...

def process(db: Database):   # Protocol 기반
    ...
```

*명시적 interface* + duck typing.

## 자주 보는 안티패턴

### 1. *Imposter가 너무 다름*
behavior가 *production과 차이 큼* → silent bug. 핵심 동작 유사 유지.

### 2. *Interface drift*
production에 method 추가 → *Imposter에 누락* → silent. abstract base class로 강제.

### 3. *모든 곳에 Imposter*
모든 collaborator를 Imposter로 → *integration 검증 부재*. 일부 *real*도.

### 4. *Test과 의도 결합*
Imposter behavior가 *test 결과 강결합* → 리팩터링 시 *test 깨짐*. *interface*만 의존.

### 5. *Interface 너무 큼*
20+ method 모두 구현 부담 → *segregation* (작은 interface).

### 6. *Static language에서 boilerplate*
Java/C# 등에서 Imposter 작성이 *많은 코드* → mock library 사용.

## Modern variants

### Mock library (mock framework)

```python
from unittest.mock import Mock
mock = Mock(spec=HttpClient)
mock.get.return_value = Response(200)
```

자동 Imposter 생성.

### Test double generation (mockito-jvm)

```java
HttpClient mock = Mockito.mock(HttpClient.class);
when(mock.get(any())).thenReturn(response);
```

reflection 기반 동적 Imposter.

### Type-safe duck typing (Go interfaces)

```go
type Database interface {
    Save(data Data) error
    Query(sql string) []Row
}

// 구현 명시 안 함 — method만 맞으면 자동
type FakeDb struct {}
func (f *FakeDb) Save(data Data) error { ... }
func (f *FakeDb) Query(sql string) []Row { ... }

var db Database = &FakeDb{}   // OK
```

Go의 *structural typing*.

### Trait (Rust)

```rust
trait Database {
    fn save(&self, data: &Data) -> Result<()>;
    fn query(&self, sql: &str) -> Vec<Row>;
}

struct FakeDb;
impl Database for FakeDb { ... }
```

### Sealed/abstract enforcement

```python
from abc import ABC, abstractmethod

class Database(ABC):
    @abstractmethod
    def save(self, data): pass
    @abstractmethod
    def query(self, sql): pass

class RealDb(Database):
    def save(self, data): ...
    def query(self, sql): ...

class FakeDb(Database):
    def save(self, data): ...
    def query(self, sql): ...
```

abstract → *implementation 누락 시 에러*.

### Hexagonal architecture (Ports & Adapters)

interface (port) + 여러 adapter — Imposter가 *test adapter*.

## 도구 / IDE

| 도구 | Imposter 지원 |
| --- | --- |
| unittest.mock | Mock + spec |
| Mockito | reflection mock |
| Sinon | JS spy/stub/mock |
| TypeScript Protocol | structural type |
| Go interface | structural |
| Rust trait | static dispatch |

## 성능 고려

Imposter는 *직접 호출* — 거의 무관. mock library의 reflection은 약간 느림. test 자체에선 무시.

## 관련 패턴

- [Pattern 17: Mock Object](/blog/programming/engineering/tdd-patterns/pattern17-mock-object) — 호출 검증
- [Pattern 18: Self Shunt](/blog/programming/engineering/tdd-patterns/pattern18-self-shunt) — test class가 Imposter
- [Pattern 20: Crash Test Dummy](/blog/programming/engineering/tdd-patterns/pattern20-crash-test-dummy) — 에러 유발 Imposter
- [Pattern 35: Null Object](/blog/programming/engineering/tdd-patterns/pattern35-null-object) — 기본 Imposter
