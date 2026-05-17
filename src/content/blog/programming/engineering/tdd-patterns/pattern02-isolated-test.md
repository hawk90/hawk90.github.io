---
title: "Pattern 2: Isolated Test"
date: 2026-07-01T02:00:00
description: "Test가 서로에게 의존하면 안 된다."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 2
tags: [tdd, beck, isolated-test, independence]
draft: true
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> 각 테스트는 독립적이어야 한다. 실행 순서나 다른 테스트의 결과에 영향받지 않아야 한다.

## 동기 (Motivation)

테스트 A가 실패하면 테스트 B, C, D도 연쇄적으로 실패하는 상황을 경험해 본 적이 있는가? 이런 테스트 스위트는 디버깅 지옥이다. 하나의 실패가 수십 개의 빨간 막대로 번지면, 진짜 문제가 어디인지 찾기 어렵다.

**격리된 테스트(Isolated Test)**는 이 문제를 해결한다:
- 각 테스트가 **독립적으로 실행** 가능
- 실행 순서가 **결과에 영향을 주지 않음**
- 하나의 실패가 **다른 테스트에 전파되지 않음**

격리의 핵심 적: **공유 상태(Shared State)**. 전역 변수, 싱글톤, 데이터베이스 레코드 등 테스트 간에 공유되는 모든 것이 격리를 깨뜨린다.

## 공유 상태의 문제

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
    delete_user("alice")  # test_create_user가 먼저 실행되어야 함!
    user_count -= 1
    assert get_user_count() == user_count
```

이 테스트들은 순서에 의존한다. `test_delete_user`가 먼저 실행되면 "alice"가 존재하지 않아 실패한다. 더 나쁜 건, 이 의존성이 **코드에 명시되지 않는다**는 것이다.

## 격리를 위한 기법

### 1. Fresh Fixture (setUp/tearDown)

```python
class UserTest(unittest.TestCase):
    def setUp(self):
        # 각 테스트 전에 깨끗한 상태로
        self.db = create_test_database()
        self.user_service = UserService(self.db)

    def tearDown(self):
        # 각 테스트 후에 정리
        self.db.clear()

    def test_create_user(self):
        self.user_service.create("alice")
        assert self.user_service.count() == 1

    def test_delete_user(self):
        self.user_service.create("bob")  # 이 테스트 자체에서 생성
        self.user_service.delete("bob")
        assert self.user_service.count() == 0
```

각 테스트가 자신만의 fixture를 갖는다. 순서가 바뀌어도 상관없다.

### 2. 전역 상태 회피

```python
# Bad: 전역 설정
CONFIG = {"debug": True}

def test_debug_mode():
    CONFIG["debug"] = False  # 다른 테스트에 영향!
    assert not is_debug()

# Good: 주입된 설정
def test_debug_mode():
    config = {"debug": False}
    app = App(config)
    assert not app.is_debug()
```

### 3. 테스트 더블 사용

```python
# 실제 데이터베이스 대신 인메모리 대체물
def test_save_order():
    db = InMemoryDatabase()  # 격리된 가짜 DB
    order_service = OrderService(db)

    order_service.save(Order(id=1, total=100))

    assert db.get("orders", 1).total == 100
```

## 격리 검증 방법

테스트가 진정으로 격리되었는지 확인하는 방법:

```bash
# 순서 무작위 실행
pytest --random-order

# 단일 테스트만 실행
pytest test_user.py::test_create_user -v

# 반복 실행
pytest --count=10 test_user.py
```

모든 경우에 같은 결과가 나와야 한다.

## 격리가 깨지는 신호

- 테스트를 **개별 실행하면 통과, 전체 실행하면 실패**
- **실행 순서에 따라** 결과가 달라짐
- **병렬 실행**하면 실패
- 특정 테스트 **제거 시** 다른 테스트가 실패

이런 현상이 보이면 공유 상태를 찾아 제거해야 한다.

## 언제 의도적으로 순서를 둘까

드물지만 **통합 테스트 시나리오**에서는 순서가 필요할 수 있다:

```python
class OrderWorkflowTest(unittest.TestCase):
    """주문 전체 흐름을 순서대로 테스트"""

    def test_1_create_order(self):
        ...

    def test_2_pay_order(self):
        ...

    def test_3_ship_order(self):
        ...
```

이 경우 **별도의 테스트 스위트로 분리**하고, 이름에 순서를 명시한다. 단, 단위 테스트에서는 이런 패턴을 피한다.

## 정리

- 각 테스트는 **독립적으로 실행** 가능해야 한다
- **공유 상태**는 격리의 적이다
- **setUp/tearDown**으로 fresh fixture를 만든다
- **전역 변수, 싱글톤**을 피하고 의존성을 주입한다
- 순서가 필요한 테스트는 **별도 스위트로 분리**한다
- 격리된 테스트는 **부분 실패 분석**이 쉽고 **flaky test**를 줄인다

## 관련 패턴

- [Pattern 1: Test](/blog/programming/engineering/tdd-patterns/pattern01-test) — 테스트의 기본 정의
- [Pattern 29: Fixture](/blog/programming/engineering/tdd-patterns/pattern29-fixture) — 테스트 데이터 설정
- [Pattern 31: Crash Test Dummy](/blog/programming/engineering/tdd-patterns/pattern31-crash-test-dummy) — 예외 상황 테스트
