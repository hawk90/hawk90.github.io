---
title: "Pattern 28: Fixture"
date: 2026-07-02T04:00:00
description: "Test에 공유되는 setup — fixture."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 28
tags: [xunit, fixture, setup, beck]
draft: true
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> 여러 테스트에서 공통으로 사용하는 설정 코드를 fixture로 추출한다.

## 동기 (Motivation)

여러 테스트가 같은 설정을 반복한다:

```python
def test_order_total():
    user = User("Alice")
    product = Product("Book", 1000)
    order = Order(user)
    order.add(product)
    assert order.total == 1000

def test_order_with_discount():
    user = User("Alice")  # 중복
    product = Product("Book", 1000)  # 중복
    order = Order(user)  # 중복
    order.add(product)  # 중복
    order.apply_discount(10)
    assert order.total == 900
```

**Fixture**는 이 **공통 설정**을 추출한다.

## Fixture 패턴

### setUp 메서드 (xUnit 스타일)

```python
class TestOrder(unittest.TestCase):
    def setUp(self):
        self.user = User("Alice")
        self.product = Product("Book", 1000)
        self.order = Order(self.user)
        self.order.add(self.product)

    def test_order_total(self):
        self.assertEqual(self.order.total, 1000)

    def test_order_with_discount(self):
        self.order.apply_discount(10)
        self.assertEqual(self.order.total, 900)
```

### pytest fixture

```python
import pytest

@pytest.fixture
def user():
    return User("Alice")

@pytest.fixture
def product():
    return Product("Book", 1000)

@pytest.fixture
def order(user, product):
    order = Order(user)
    order.add(product)
    return order

def test_order_total(order):
    assert order.total == 1000

def test_order_with_discount(order):
    order.apply_discount(10)
    assert order.total == 900
```

## Fixture 수명

### Function 범위 (기본)

```python
@pytest.fixture
def fresh_order():
    """매 테스트마다 새로 생성"""
    return Order()

def test_1(fresh_order):  # 새 Order
    ...

def test_2(fresh_order):  # 또 새 Order
    ...
```

### Class 범위

```python
@pytest.fixture(scope="class")
def shared_db():
    """클래스 내 테스트들이 공유"""
    db = Database()
    db.connect()
    yield db
    db.disconnect()
```

### Module 범위

```python
@pytest.fixture(scope="module")
def expensive_resource():
    """모듈 내 모든 테스트가 공유"""
    return load_heavy_data()
```

## Fresh Fixture vs Shared Fixture

### Fresh Fixture (권장)

```python
# 매 테스트마다 새로운 fixture
def setUp(self):
    self.order = Order()  # 깨끗한 상태

def test_1(self):
    self.order.add(item)
    # order 상태 변경

def test_2(self):
    # 여전히 빈 order로 시작
```

### Shared Fixture (주의)

```python
# 위험: 테스트 간 상태 공유
@pytest.fixture(scope="module")
def shared_order():
    return Order()

def test_1(shared_order):
    shared_order.add(item)  # 상태 변경

def test_2(shared_order):
    # test_1의 item이 이미 있음!
    # 테스트 순서에 의존 — 나쁨
```

## tearDown

```python
class TestDatabase(unittest.TestCase):
    def setUp(self):
        self.db = Database()
        self.db.connect()

    def tearDown(self):
        self.db.disconnect()  # 정리

    def test_query(self):
        result = self.db.query("SELECT * FROM users")
        ...
```

### pytest의 yield

```python
@pytest.fixture
def db():
    db = Database()
    db.connect()
    yield db  # 여기서 테스트 실행
    db.disconnect()  # 테스트 후 정리
```

## Fixture 설계 원칙

### 필요한 것만

```python
# 나쁨: 모든 것을 fixture에
def setUp(self):
    self.user = User()
    self.product = Product()
    self.order = Order()
    self.payment = Payment()
    self.shipping = Shipping()
    # 대부분의 테스트가 일부만 사용

# 좋음: 필요한 것만
@pytest.fixture
def user():
    return User()

@pytest.fixture
def order(user):  # 필요한 fixture만 의존
    return Order(user)
```

### 명확한 이름

```python
# 나쁨
@pytest.fixture
def data():
    return {"name": "Alice"}

# 좋음
@pytest.fixture
def valid_user_data():
    return {"name": "Alice", "email": "alice@example.com"}

@pytest.fixture
def invalid_user_data():
    return {"name": "", "email": "invalid"}
```

### Fixture도 코드

```python
# Fixture도 잘 작성해야 함
@pytest.fixture
def complex_order():
    """
    복잡한 주문 시나리오:
    - 여러 상품
    - 할인 적용
    - 배송비 포함
    """
    user = create_premium_user()
    order = Order(user)
    order.add(Product("A", 1000))
    order.add(Product("B", 2000))
    order.apply_discount("SAVE10")
    order.set_shipping("express")
    return order
```

## 암묵적 결합 주의

```python
# 나쁨: fixture가 테스트 내용을 숨김
def test_order_total(self):
    # setUp에서 뭘 했는지 봐야 이해됨
    self.assertEqual(self.order.total, 1000)

# 좋음: 테스트 자체로 이해 가능
def test_order_total(self):
    order = Order()
    order.add(Product("Book", 1000))
    self.assertEqual(order.total, 1000)
```

중요한 설정은 **테스트 안에 명시**하는 것이 좋다.

## 정리

- **공통 설정**을 fixture로 추출
- **Fresh fixture** 권장 — 테스트 독립성
- **tearDown**으로 정리
- **필요한 것만** fixture에
- **명확한 이름** 사용
- **암묵적 결합** 주의 — 중요한 설정은 테스트에

## 관련 패턴

- [Pattern 29: External Fixture](/blog/programming/engineering/tdd-patterns/pattern29-external-fixture) — DB/파일 fixture
- [Pattern 2: Isolated Test](/blog/programming/engineering/tdd-patterns/pattern02-isolated-test) — 테스트 독립성
- [Pattern 30: Test Method](/blog/programming/engineering/tdd-patterns/pattern30-test-method) — 테스트 구조

