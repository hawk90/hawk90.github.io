---
title: "Pattern 28: Fixture"
date: 2026-05-10T04:00:00
description: "Test에 공유되는 setup — fixture로 추출. Fresh vs Shared의 트레이드오프."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 28
tags: [xunit, fixture, setup, beck]
draft: true
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> 여러 테스트가 공유하는 설정을 *fixture로 추출*. *Fresh* (격리)와 *Shared* (성능)의 균형.

## 동기 (Motivation)

같은 setup이 여러 테스트에 *반복*:

```python
def test_order_total():
    user = User("Alice")
    product = Product("Book", 1000)
    order = Order(user); order.add(product)
    assert order.total == 1000

def test_order_with_discount():
    user = User("Alice")        # 중복
    product = Product("Book", 1000)   # 중복
    order = Order(user); order.add(product)   # 중복
    order.apply_discount(10)
    assert order.total == 900
```

**Fixture**가 *공통 설정*을 추출.

### 신호

- 같은 setup이 *여러 테스트* 반복.
- *test 본문이 setup으로 가득*, 검증이 작음.
- *복잡한 객체* 생성 코드 중복.

### 언제 적용하는가

- *3+ 테스트*에 같은 setup.
- *복잡한 객체 생성*.
- 외부 자원 (DB, file) 공유.

### 언제 적용하지 않는가

- *한 테스트*에만 사용 — inline.
- setup이 *너무 단순* (한 줄).
- *test 의도가 흐려질* 위험.

## Fresh vs Shared fixture

| Fresh | Shared |
| --- | --- |
| 매 test마다 새로 생성 | 여러 test 공유 |
| **격리 보장** | 격리 위험 |
| 약간 느림 | 빠름 |
| 안전 default | 비싼 setup |

기본은 **Fresh** ([Isolated Test](/blog/programming/engineering/tdd-patterns/pattern02-isolated-test)).

## 절차 (Mechanics)

1. **공통 setup 식별** — 여러 test에 같은 코드.
2. **추출 위치** 선택 — function/method/fixture.
3. **scope 결정** — function (fresh), class, module, session.
4. **cleanup** (tearDown / yield).
5. 각 test에서 fixture *사용*.

## 예시 1 — xUnit setUp/tearDown

```python
class TestOrder(unittest.TestCase):
    def setUp(self):
        self.user = User("Alice")
        self.product = Product("Book", 1000)
        self.order = Order(self.user)
        self.order.add(self.product)

    def tearDown(self):
        # cleanup (필요 시)
        pass

    def test_order_total(self):
        self.assertEqual(self.order.total, 1000)

    def test_order_with_discount(self):
        self.order.apply_discount(10)
        self.assertEqual(self.order.total, 900)
```

매 test 전 setUp → 매 test 후 tearDown.

## 예시 2 — pytest fixture + DI

```python
@pytest.fixture
def user():
    return User("Alice")

@pytest.fixture
def product():
    return Product("Book", 1000)

@pytest.fixture
def order(user, product):
    o = Order(user)
    o.add(product)
    return o

def test_order_total(order):
    assert order.total == 1000

def test_order_with_discount(order):
    order.apply_discount(10)
    assert order.total == 900
```

*Dependency injection*. fixture를 *합성*.

## 예시 3 — yield로 cleanup

```python
@pytest.fixture
def db():
    db = Database()
    db.connect()
    yield db   # 여기서 test 실행
    db.disconnect()   # test 후 cleanup
```

setUp + tearDown을 *한 함수에*.

### Scope

```python
@pytest.fixture(scope="function")   # default, fresh
@pytest.fixture(scope="class")      # class 내 공유
@pytest.fixture(scope="module")     # module 내 공유
@pytest.fixture(scope="session")    # session 전체 공유
```

비싼 setup은 *넓은 scope* — 단 격리 주의.

## 자주 보는 안티패턴

### 1. *Shared fixture mutation*
```python
@pytest.fixture(scope="module")
def shared_order():
    return Order()

def test_1(shared_order):
    shared_order.add(item)   # ← 상태 변경

def test_2(shared_order):
    # test_1의 item이 이미!
```
*순서 의존* → 격리 깨짐.

### 2. *Fixture가 너무 큼*
모든 객체 setup → 대부분 test는 *일부만 사용*. *필요한 것만* fixture.

### 3. *암묵적 의존*
```python
def test_order():
    # setUp에서 뭘 했는지 봐야 함
    self.assertEqual(self.order.total, 1000)
```
중요한 setup은 *test 안*에 명시.

### 4. *Fixture 이름 모호*
`data`, `config` — 의미 없음. `valid_user`, `empty_cart` 같은 *의도 표현*.

### 5. *cleanup 누락*
DB row, file, mock patch — *누수*. yield 또는 tearDown 필수.

### 6. *Fixture 안에 비즈니스 로직*
fixture가 *production 로직 흉내* → 진짜 코드와 *diverge*.

## Modern variants

### Factory Pattern

```python
@pytest.fixture
def user_factory():
    def _factory(name="Default", **kwargs):
        return User(name, **kwargs)
    return _factory

def test(user_factory):
    alice = user_factory("Alice")
    bob = user_factory("Bob", age=30)
```

*매번 다른* fixture 필요할 때.

### Object Mother

```python
class UserMother:
    @staticmethod
    def alice(): return User("Alice", "alice@x.com")
    @staticmethod
    def admin(): return User("Admin", "admin@x.com", role="admin")
```

자주 쓰는 *명명된* fixture.

### Test data builder

```python
user = UserBuilder().with_name("Alice").with_role("admin").build()
```

fluent builder로 유연.

### Conftest sharing (pytest)

```python
# conftest.py — 자동 공유
@pytest.fixture
def db(): ...
```

여러 test 파일에 *자동 적용*.

### Parametrized fixture

```python
@pytest.fixture(params=[1, 2, 3])
def number(request):
    return request.param

def test_double(number):
    assert double(number) == number * 2
```

같은 test를 *여러 fixture로* 실행.

### Async fixture

```python
@pytest.fixture
async def client():
    async with AsyncClient() as c:
        yield c
```

async 환경 지원.

## 도구 / IDE

| 도구 | 기능 |
| --- | --- |
| pytest fixture | DI + scope |
| pytest-mock | mock fixture |
| factory_boy | factory |
| FactoryBot (Ruby) | factory |
| AutoFixture (.NET) | 자동 생성 |
| Hypothesis | property-based fixture |

## 성능 고려

- *Function scope* 가장 느림, 가장 안전.
- *Session scope* 가장 빠름, 격리 위험.
- 비싼 setup (DB connection)은 *세션*, mutable state는 *function*.
- *test parallelism* + fixture scope 상호작용 — 측정.

## 관련 패턴

- [Pattern 29: External Fixture](/blog/programming/engineering/tdd-patterns/pattern29-external-fixture) — DB/파일 fixture
- [Pattern 2: Isolated Test](/blog/programming/engineering/tdd-patterns/pattern02-isolated-test) — 격리
- [Pattern 30: Test Method](/blog/programming/engineering/tdd-patterns/pattern30-test-method) — 테스트 구조
- [Pattern 6: Test Data](/blog/programming/engineering/tdd-patterns/pattern06-test-data) — 데이터 선택
