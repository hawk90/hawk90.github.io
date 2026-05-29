---
title: "Pattern 29: External Fixture"
date: 2026-05-10T05:00:00
description: "Process·resource에 걸친 fixture — DB·file·network 관리."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 29
tags: [xunit, external-fixture, integration, beck]
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
draft: true

---

## 한 줄 요약

> 데이터베이스·파일·네트워크 같은 외부 리소스를 테스트에서 관리. 격리 vs 속도 트레이드오프.

## 동기

일반 fixture는 메모리 안에서 동작. 실제 시스템은 외부 리소스에 의존:

- DB, file system, network service, message queue, cache server.

**External Fixture**가 이런 리소스의 설정과 정리를 다룬다.

### 신호

- test가 *real DB/file*에 의존.
- test 후 cleanup 누락으로 다음 test 영향.
- 환경 차이 (local vs CI) 때문에 실패.
- test 속도 매우 느림.

### 언제 적용하는가

- integration test가 필수.
- 외부 시스템 동작 검증 (ORM 쿼리, file format).
- unit test mock으로 한계가 있음.

### 언제 적용하지 않는가

- 순수 비즈니스 로직 — mock으로 충분.
- 외부 자원이 너무 비싸 (전용 hardware).

## 절차

1. **외부 자원 식별** — DB, file, network.
2. **격리 전략 선택** — transaction rollback, fresh container, isolated namespace.
3. **fixture 작성** — 자원 획득 + cleanup.
4. **scope 결정** — session (비싼 자원) / function (mutating).
5. **에러 시 cleanup 보장** — finally 또는 yield.

## 예시 1 — DB transaction rollback (권장)

```python
@pytest.fixture
def db():
    connection = Database.connect("test_db")
    yield connection
    connection.close()

@pytest.fixture
def transactional_db(db):
    db.begin_transaction()
    yield db
    db.rollback()   # 모든 변경 취소
```

가장 빠르고 안전. 매 test가 clean state로 시작.

## 예시 2 — Testcontainers

```python
import testcontainers.postgres as postgres

@pytest.fixture(scope="module")
def postgres_db():
    with postgres.PostgresContainer("postgres:15") as pg:
        yield pg.get_connection_url()
```

*실제 PostgreSQL container* — production-like.

```text
✓ 실제 DB와 동일 환경
✓ CI/CD 일관
✗ 느림 (container 시작)
✗ Docker 필요
```

## 예시 3 — 파일 시스템

```python
def test_file_write(tmp_path):
    """pytest 내장 임시 디렉토리"""
    file = tmp_path / "test.txt"
    file.write_text("hello")
    assert file.read_text() == "hello"
    # 자동 정리됨
```

pytest의 `tmp_path` — 매 test마다 새 디렉토리, 끝나면 자동 cleanup.

## 자주 보는 안티패턴

### 1. Cleanup 누락

```python
@pytest.fixture
def db():
    return Database.connect("test")   # ← 닫지 않음
```
connection leak. yield 또는 finally.

### 2. Production DB 사용

실수로 production DB connect → 데이터 손상. 별도 test DB, 환경 검증.

### 3. Test 순서 의존

```python
def test_create(): db.execute("INSERT ...")
def test_read(): assert db.query("SELECT ...") == ...   # ← test_create 가정
```
독립성 깨짐. transaction rollback 또는 fresh state.

### 4. Session scope mutating

session scope DB에 write → 다른 test 영향. function scope + transaction.

### 5. Network test가 flaky

real network → 가끔 fail. mock + 별도 integration test.

### 6. Container 시작 비용

매 test마다 container → 분 단위 소요. *module/session scope* + 격리.

## Modern variants

### Transaction rollback (가장 흔함)

```python
@pytest.fixture
def db(session_db):
    session_db.begin_transaction()
    yield session_db
    session_db.rollback()
```

session DB 한 번 + transaction per-test.

### Snapshot/restore

```python
@pytest.fixture
def db(session_db):
    snapshot = session_db.create_snapshot()
    yield session_db
    session_db.restore(snapshot)
```

비싼 setup을 한 번, 매 test 후 snapshot 복원.

### Containers

```python
postgres = PostgresContainer()
redis = RedisContainer()
elasticsearch = ElasticsearchContainer()
```

각 service Docker.

### Hermetic test (Bazel)

```bash
bazel test //...
```

외부 network 차단 + sandbox.

### VCR / Polly (HTTP recording)

```python
@vcr.use_cassette()
def test_api():
    requests.get(...)   # 첫 실행 녹화, 이후 재생
```

real HTTP을 cassette로.

### Localstack (AWS)

```python
from localstack_pytest import *
def test_s3(s3_client):
    s3_client.put_object(...)   # 가짜 S3
```

AWS service mock.

### Database migrations on setup

```python
@pytest.fixture(scope="session")
def db():
    db = create_test_db()
    run_migrations(db)   # production schema
    yield db
    drop_test_db(db)
```

## Factory + cleanup tracking

```python
@pytest.fixture
def user_factory(db):
    created = []
    def _create(name, email=None):
        user = User(name, email or f"{name}@test.com")
        db.save(user)
        created.append(user)
        return user
    yield _create
    for user in created:
        db.delete(user)
```

생성된 자원을 추적해 일괄 cleanup.

## 격리 vs 속도 트레이드오프

| 전략 | 속도 | 격리 |
| --- | --- | --- |
| Fresh container per-test | 매우 느림 | 완벽 |
| Container per-session + transaction | 빠름 | 좋음 |
| In-memory replacement (sqlite for postgres) | 매우 빠름 | 좋음 (단 차이) |
| Mock | 가장 빠름 | 완벽 (단 fake) |

기본은 session container + per-test transaction.

## 도구 / IDE

| 도구 | 기능 |
| --- | --- |
| Testcontainers | Docker fixture |
| pytest tmp_path | 임시 디렉토리 |
| Factory_boy | object factory |
| Faker | fake data |
| Responses / VCR | HTTP recording |
| LocalStack | AWS mock |
| Toxiproxy | network fault |

## 성능 고려

- Container start 5-30초 — session scope.
- Transaction 매우 빠름 (ms).
- Filesystem OS-level (수 ms).
- Network mock 즉시.
- 큰 test suite는 parallel + 자원 namespace 격리.

## 관련 패턴

- [Pattern 28: Fixture](/blog/programming/engineering/tdd-patterns/pattern28-fixture) — 일반 fixture
- [Pattern 17: Mock Object](/blog/programming/engineering/tdd-patterns/pattern17-mock-object) — 외부 의존 대체
- [Pattern 2: Isolated Test](/blog/programming/engineering/tdd-patterns/pattern02-isolated-test) — 격리
- [Pattern 11: Learning Test](/blog/programming/engineering/tdd-patterns/pattern11-learning-test) — 외부 lib 학습
