---
title: "Pattern 36: Template Method (in TDD)"
date: 2026-07-02T12:00:00
description: "Algorithm 골격 + subclass의 step 구현. xUnit setUp/tearDown의 본질."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 36
tags: [tdd, beck, template-method, gof]
draft: true
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> *알고리즘 골격*은 부모 class에, *가변 단계*는 자식이 구현. xUnit의 *test 실행 순서*가 대표.

## 동기 (Motivation)

여러 class가 *비슷한 알고리즘*인데 *일부 단계만 다름*:

```text
# 테스트 실행
1. setUp     (가변)
2. run_test  (가변)
3. tearDown  (가변)
```

xUnit의 *test 실행 순서*가 Template Method.

### 신호

- 비슷한 알고리즘이 *여러 class*에 중복.
- *일부 단계*가 *고정*, *나머지*는 가변.
- *Pull Up Method*의 결과 자연.

### 언제 적용하는가

- 알고리즘 *고정 + 가변 step* 명확.
- *상속이 자연*.
- *호출 순서가 invariant*.

### 언제 적용하지 않는가

- *Composition*이 더 적합.
- 알고리즘 자체가 *다름*.
- *런타임 변경* 필요 (Strategy).

## 절차 (Mechanics)

1. **공통 알고리즘** 식별.
2. **부모 class에 template method** 작성.
3. **고정 step**은 부모에 *완전 구현*.
4. **가변 step**은 *abstract method* 또는 *hook* (default 있음).
5. **자식이 가변 step 구현**.

## 예시 1 — xUnit run

```python
class TestCase:
    def run(self):
        self.setUp()          # hook
        self.run_test()       # abstract
        self.tearDown()       # hook

    def setUp(self): pass
    def tearDown(self): pass
    def run_test(self):
        raise NotImplementedError

class MyTest(TestCase):
    def setUp(self):
        self.db = Database(); self.db.connect()

    def run_test(self):
        result = self.db.query("SELECT * FROM users")
        assert len(result) > 0

    def tearDown(self):
        self.db.disconnect()
```

*고정 순서* (setUp → test → tearDown), *가변 본문*.

## 예시 2 — Pull Up Method 결과

```python
# Before — 중복
class DollarTest:
    def test_times(self):
        d = Dollar(5)
        assert d.times(2).amount == 10

class FrancTest:
    def test_times(self):
        f = Franc(5)
        assert f.times(2).amount == 10

# After — Template
class MoneyTest:
    def test_times(self):
        money = self.create_money()   # hook
        assert money.times(2).amount == self.expected_double()

    def create_money(self): raise NotImplementedError
    def expected_double(self): raise NotImplementedError

class DollarTest(MoneyTest):
    def create_money(self): return Dollar(5)
    def expected_double(self): return 10

class FrancTest(MoneyTest):
    def create_money(self): return Franc(5)
    def expected_double(self): return 10
```

## 예시 3 — Hook vs Abstract

```python
class BaseProcessor:
    def process(self):
        self.before_process()   # hook (default no-op)
        self.do_process()       # abstract (필수)
        self.after_process()    # hook

    def before_process(self): pass          # default
    def do_process(self): raise NotImplementedError   # 필수
    def after_process(self): pass           # default
```

`hook` = optional override, `abstract` = required.

## 자주 보는 안티패턴

### 1. *Template method가 너무 큼*
20+ step → 자식 *override 결정 어려움*. 분해.

### 2. *Hook 무한 chain*
hook이 *base의 super* 호출 잊음 → broken chain. 명시 명세.

### 3. *Liskov 위반*
자식 override가 *base의 contract* 깨뜨림 → 알고리즘 break.

### 4. *Override 순서 의존*
*특정 순서로 override* 가정 → 새 자식이 위반. 순서 강제.

### 5. *Composition 적합한 경우*
runtime 변경 필요한데 inheritance 강제 → 유연성 손실. Strategy.

### 6. *모든 method가 abstract*
template method가 *추상의 추상* → 의미 없음. *최소 구체*.

## Modern variants

### Strategy 대안

```python
class Processor:
    def __init__(self, strategy):
        self.strategy = strategy
    def process(self):
        self.strategy.before()
        self.strategy.execute()
        self.strategy.after()
```

상속 → composition. 런타임 변경.

### Higher-order function

```python
def run_test(setup, test, teardown):
    setup()
    try:
        test()
    finally:
        teardown()

run_test(
    setup=lambda: db.connect(),
    test=lambda: assert_query(),
    teardown=lambda: db.disconnect()
)
```

함수형으로 *step 주입*.

### Pytest fixture

```python
@pytest.fixture
def db():
    db = Database(); db.connect()
    yield db
    db.disconnect()

def test_query(db):
    result = db.query(...)
    assert ...
```

setUp/tearDown을 *fixture로 분리*.

### Spring framework

```java
@TestExecutionListeners({MyListener.class})
class MyTest { ... }
```

framework가 *template method 제공*.

### Decorator

```python
def with_database(fn):
    def wrapper(*args, **kwargs):
        db = Database(); db.connect()
        try: return fn(db, *args, **kwargs)
        finally: db.disconnect()
    return wrapper

@with_database
def test_query(db):
    assert db.query(...)
```

cross-cutting concern을 *decorator*.

## 도구 / IDE

| 도구 | 기능 |
| --- | --- |
| pytest fixture | template 대안 |
| JUnit @Rule | template 보조 |
| Spring TestExecutionListener | framework template |
| Decorator | cross-cutting |

## 성능 고려

상속 lookup 1 단계 — JIT inline. 무관. *fixture/decorator*도 비슷.

## 관련 패턴

- [Pattern 37: Pluggable Object](/blog/programming/engineering/tdd-patterns/pattern37-pluggable-object) — 동작 교체
- [Pattern 28: Fixture](/blog/programming/engineering/tdd-patterns/pattern28-fixture) — setUp/tearDown
- [Pattern 39: Factory Method](/blog/programming/engineering/tdd-patterns/pattern39-factory-method) — 객체 생성 위임
- GoF Template Method
