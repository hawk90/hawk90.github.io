---
title: "Pattern 2: Isolated Test"
date: 2026-05-10T02:00:00
description: "Test가 서로에게 의존하면 안 된다 — 격리는 디버깅과 신뢰의 토대."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 2
tags: [tdd, beck, isolated-test, independence]
draft: true
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> 각 테스트는 *독립적*으로 실행 가능해야 한다. 실행 순서·다른 테스트 결과에 *영향받지 않아야* 한다.

## 동기 (Motivation)

테스트 A가 실패하면 B, C, D도 *연쇄적으로 실패*하는 상황 — 디버깅 지옥. 하나의 실패가 수십 개의 빨간 막대로 번지면 *진짜 문제*가 어디인지 알 수 없다.

격리된 테스트는:

- 각 테스트가 *독립 실행* 가능.
- 실행 순서가 *결과에 영향 없음*.
- 한 실패가 *다른 테스트에 전파되지 않음*.

격리의 핵심 적: **공유 상태** (전역 변수, singleton, DB row, 파일 시스템, 환경 변수).

```python
# 위험한 공유 상태
user_count = 0

def test_create_user():
    global user_count
    create_user("alice")
    user_count += 1
    assert get_user_count() == user_count

def test_delete_user():
    global user_count
    delete_user("alice")   # ← test_create_user가 먼저 실행되어야!
    user_count -= 1
    assert get_user_count() == user_count
```

`test_delete_user`가 먼저 실행되면 *alice 부재*로 실패. 의존성이 *코드에 명시되지 않음* — silent.

### 신호

- 테스트를 *개별 실행하면 통과, 전체 실행하면 실패*.
- *실행 순서*에 따라 결과 달라짐.
- *병렬 실행*하면 실패 (race).
- 특정 테스트 *제거 시 다른 테스트가 실패*.
- 테스트가 *지난 실행 결과*를 가정.

### 격리 vs 독립성의 정도

| 수준 | 의미 |
| --- | --- |
| **Class isolation** | 같은 test class 내에서 격리 |
| **Process isolation** | 다른 process — 가장 강력 |
| **Order independence** | 어떤 순서로 실행해도 OK |
| **Parallel safety** | 동시 실행 안전 |

목표는 *최소한 order independence*. 더 강한 격리는 비용·복잡도에 따라.

## 절차 (Mechanics)

1. **공유 상태 식별** — global, static, DB, 파일, 환경변수.
2. **fresh fixture 패턴 적용** — setUp/teardown 또는 fixture function.
3. **외부 의존을 mock 또는 in-memory로** 대체.
4. **순서 무작위 실행으로 검증** (`pytest --random-order`, JUnit `@TestMethodOrder(Random.class)`).
5. **병렬 실행으로 검증** (`pytest -n auto`).
6. 실패 시 root cause 추적, 공유 제거 반복.

## 예시 1 — Fresh fixture

```python
class UserTest(unittest.TestCase):
    def setUp(self):
        self.db = create_test_database()
        self.user_service = UserService(self.db)

    def tearDown(self):
        self.db.clear()

    def test_create_user(self):
        self.user_service.create("alice")
        assert self.user_service.count() == 1

    def test_delete_user(self):
        self.user_service.create("bob")   # 이 테스트 자체에서 생성
        self.user_service.delete("bob")
        assert self.user_service.count() == 0
```

각 테스트가 *자신의 fixture* — 순서 무관.

## 예시 2 — DI로 전역 회피

```python
# Bad
CONFIG = {"debug": True}
def test_debug_mode():
    CONFIG["debug"] = False   # 다른 테스트 영향
    assert not is_debug()

# Good
def test_debug_mode():
    config = {"debug": False}
    app = App(config)
    assert not app.is_debug()
```

*의존 주입*으로 *test별 상태 격리*.

## 예시 3 — In-memory 대체

```python
def test_save_order():
    db = InMemoryDatabase()   # 격리된 가짜 DB
    order_service = OrderService(db)
    order_service.save(Order(id=1, total=100))
    assert db.get("orders", 1).total == 100
```

`InMemoryDatabase`가 *test마다 새로 생성*. *외부 DB와 격리*.

## 자주 보는 안티패턴

### 1. *Test class 수준의 상태 공유*
```python
class Test(unittest.TestCase):
    counter = 0   # ← class-level state
    def test_a(self): Test.counter += 1
    def test_b(self): assert Test.counter == 1
```
순서 의존. instance variable 또는 fresh fixture.

### 2. *DB cleanup 누락*
test가 DB에 record 남기면 *다음 테스트가 영향*. *transaction rollback* 또는 *truncate*.

### 3. *Global mock 안 reset*
```python
@mock.patch("module.func")
def test_a(mock_func):
    pass
# 다른 test에서 module.func이 *여전히 mocked*면 영향
```
mock context 종료 보장.

### 4. *File system pollution*
```python
def test_x():
    open("/tmp/data.txt", "w").write("...")
    # 다음 테스트에서 이 file을 봄
```
*tempdir + cleanup* 사용.

### 5. *Test 간 순서 의존 인정*
"test_1_X", "test_2_Y" 이름으로 *순서 강제* — 진짜 격리가 깨진 것. *통합 시나리오*면 별도 suite로.

### 6. *Singleton 무력화 잊음*
production singleton이 test에 *그대로 살아 있음*. test에서 *reset* 또는 *factory로 변경*.

## Modern variants

### Test containers (Docker)

```python
from testcontainers.postgres import PostgresContainer

def test_with_real_db():
    with PostgresContainer() as postgres:
        db = connect(postgres.get_connection_url())
        # 각 test마다 *진짜 PostgreSQL container* 격리
```

real-world 의존도 *containerized 격리*.

### Snapshot of state

```javascript
// Database snapshot/restore
beforeEach(() => db.snapshot());
afterEach(() => db.restore());
```

### Hermetic build (Bazel)

```bash
bazel test //...   # 외부 의존 차단
```

test가 *외부 network/file*에 접근 불가 — *완전 격리* 강제.

### Property-based test isolation

Hypothesis/QuickCheck는 *입력 생성마다 fresh state* — 자연스러운 격리.

### Parallel test runners

```bash
pytest -n auto       # pytest-xdist
jest --maxWorkers=4  # Jest
go test -parallel 4  # Go
```

병렬 안전성 검증.

## 도구 / IDE

| 도구 | 격리 기능 |
| --- | --- |
| pytest | fixture scope (function/class/module/session), `--random-order` |
| JUnit 5 | `@TestInstance`, `@MethodOrder(Random)` |
| RSpec | `--order random` |
| Jest | `--testSequencer`, fresh module 매 test |
| Mockito | `@MockitoSettings`, reset |
| Testcontainers | Docker 격리 |
| Bazel | hermetic build |

## 성능 고려

- *Fresh fixture*는 *setup overhead*. 빠른 test는 *function scope*, 느린 setup은 *module scope*로 균형.
- *In-memory DB* > *real DB* — 속도 우위.
- *Process isolation*은 *가장 강력*하지만 *가장 느림*.
- *Parallel test*는 격리 보장 시 *전체 시간 단축*.

## 관련 패턴

- [Pattern 1: Test](/blog/programming/engineering/tdd-patterns/pattern01-test) — 테스트의 기본 정의
- [Pattern 28: Fixture](/blog/programming/engineering/tdd-patterns/pattern28-fixture) — fresh fixture 작성
- [Pattern 17: Mock Object](/blog/programming/engineering/tdd-patterns/pattern17-mock-object) — 외부 의존 격리
- [Pattern 32: All Tests](/blog/programming/engineering/tdd-patterns/pattern32-all-tests) — 전체 실행 신뢰
