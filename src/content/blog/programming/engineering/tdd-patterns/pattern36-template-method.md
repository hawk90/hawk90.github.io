---
title: "Pattern 36: Template Method (in TDD)"
date: 2026-07-02T12:00:00
description: "Algorithm 골격 + subclass의 step 구현."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 36
tags: [tdd, beck, template-method, gof]
draft: true
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> 알고리즘의 골격은 부모 클래스에, 가변적인 단계는 자식 클래스에서 구현한다.

## 동기 (Motivation)

여러 클래스가 비슷한 알고리즘을 따르지만, **일부 단계만 다르다**:

```python
# 테스트 실행 순서
# 1. setUp
# 2. 테스트 실행
# 3. tearDown
```

**xUnit의 테스트 실행**이 바로 Template Method다.

## xUnit의 Template Method

### 골격 (부모)

```python
class TestCase:
    def run(self):
        """Template Method — 알고리즘 골격"""
        self.setUp()      # hook
        self.run_test()   # abstract
        self.tearDown()   # hook

    def setUp(self):
        """기본 구현 — 아무것도 안 함"""
        pass

    def tearDown(self):
        """기본 구현 — 아무것도 안 함"""
        pass
```

### 구체화 (자식)

```python
class MyTest(TestCase):
    def setUp(self):
        self.db = Database()
        self.db.connect()

    def run_test(self):
        result = self.db.query("SELECT * FROM users")
        assert len(result) > 0

    def tearDown(self):
        self.db.disconnect()
```

## Template Method 구조

```text
BaseClass
├── templateMethod()  # 골격 정의
│   ├── step1()       # 고정
│   ├── step2()       # hook (자식이 오버라이드)
│   └── step3()       # abstract (자식이 반드시 구현)
│
ConcreteClass extends BaseClass
├── step2()           # 오버라이드
└── step3()           # 구현
```

## TDD에서의 활용

### Pull Up Method의 결과

```python
# Before: 중복 코드
class DollarTest:
    def test_times(self):
        self.setup_dollar()
        result = self.dollar.times(2)
        self.verify_result(result)

class FrancTest:
    def test_times(self):
        self.setup_franc()
        result = self.franc.times(2)
        self.verify_result(result)

# After: Template Method
class MoneyTest:
    def test_times(self):
        money = self.create_money()  # abstract
        result = money.times(2)
        self.verify_result(result)

class DollarTest(MoneyTest):
    def create_money(self):
        return Dollar(5)

class FrancTest(MoneyTest):
    def create_money(self):
        return Franc(5)
```

### 테스트 Fixture

```python
class DatabaseTest:
    """데이터베이스 테스트의 Template Method"""

    def setUp(self):
        self.db = self.create_database()
        self.db.connect()
        self.seed_data()

    def create_database(self):
        """자식이 오버라이드"""
        return Database()

    def seed_data(self):
        """자식이 오버라이드"""
        pass

    def tearDown(self):
        self.db.clear()
        self.db.disconnect()

class UserDatabaseTest(DatabaseTest):
    def seed_data(self):
        self.db.insert(User("Alice"))
        self.db.insert(User("Bob"))
```

## Hook vs Abstract

```python
class BaseProcessor:
    def process(self):
        self.before_process()  # hook (기본 구현 있음)
        self.do_process()      # abstract (구현 필수)
        self.after_process()   # hook (기본 구현 있음)

    def before_process(self):
        pass  # hook — 기본은 아무것도 안 함

    def do_process(self):
        raise NotImplementedError  # abstract — 필수

    def after_process(self):
        pass  # hook — 기본은 아무것도 안 함
```

## 현대적 대안

### Strategy 패턴

```python
# Template Method 대신 Strategy
class Processor:
    def __init__(self, strategy):
        self.strategy = strategy

    def process(self):
        self.strategy.before()
        self.strategy.execute()
        self.strategy.after()
```

### Higher-Order Function

```python
# 함수로 단계 전달
def process(do_work, before=None, after=None):
    if before:
        before()
    do_work()
    if after:
        after()

# 사용
process(
    do_work=lambda: print("Working"),
    before=lambda: print("Starting"),
    after=lambda: print("Done")
)
```

### Composition over Inheritance

```python
# 상속 대신 조합
class TestRunner:
    def run(self, test, setup=None, teardown=None):
        if setup:
            setup()
        test()
        if teardown:
            teardown()
```

## 테스트 예시

```python
def test_template_method_calls_steps_in_order():
    calls = []

    class TestProcessor(BaseProcessor):
        def before_process(self):
            calls.append("before")

        def do_process(self):
            calls.append("do")

        def after_process(self):
            calls.append("after")

    processor = TestProcessor()
    processor.process()

    assert calls == ["before", "do", "after"]
```

## 정리

- **알고리즘 골격**은 부모에
- **가변 단계**는 자식이 구현
- **xUnit setUp/tearDown**이 대표적
- **Pull Up Method**의 자연스러운 결과
- **현대 대안** — Strategy, HOF, Composition
- **TDD에서 테스트 구조화**에 유용

## 관련 패턴

- [Pattern 37: Pluggable Object](/blog/programming/engineering/tdd-patterns/pattern37-pluggable-object) — 동작 교체
- [Pattern 28: Fixture](/blog/programming/engineering/tdd-patterns/pattern28-fixture) — setUp/tearDown
- [Pattern 39: Factory Method](/blog/programming/engineering/tdd-patterns/pattern39-factory-method) — 객체 생성 위임

