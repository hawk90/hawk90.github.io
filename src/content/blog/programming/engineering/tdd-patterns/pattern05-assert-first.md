---
title: "Pattern 5: Assert First"
date: 2026-07-01T05:00:00
description: "Test에서 assertion부터 — 거꾸로 코딩."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 5
tags: [tdd, beck, assert-first]
draft: true
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> 테스트를 작성할 때 assertion부터 먼저 쓰고, 거꾸로 올라가며 setup과 action을 채워라.

## 동기 (Motivation)

테스트를 순서대로 작성하면 어떻게 될까?

```python
def test_something():
    # 1. 먼저 setup을 쓴다
    user = User("alice")
    cart = Cart(user)
    item = Item("book", 1000)

    # 2. 그다음 action
    cart.add(item)

    # 3. 마지막에 assertion
    assert cart.total() == ???  # 여기서 "뭘 검증하지?"
```

setup을 쓰면서 "이게 다 필요한가?"라는 의문이 생긴다. 검증 대상이 명확하지 않으면 불필요한 코드가 늘어난다.

**Assert First**는 반대로 간다:
1. **원하는 결과(assertion)**를 먼저 쓴다
2. 그 결과를 얻기 위한 **action**을 쓴다
3. action에 필요한 **fixture(setup)**를 쓴다

## Assert First 예시

### Step 1: Assertion 먼저

```python
def test_discount_applied():
    assert order.total() == 900  # 10% 할인 적용 후 900원
```

아직 `order`가 없다. 괜찮다.

### Step 2: Action 추가

```python
def test_discount_applied():
    order.apply_discount(0.10)  # 10% 할인 적용
    assert order.total() == 900
```

아직 `order`가 정의되지 않았다.

### Step 3: Fixture 추가

```python
def test_discount_applied():
    order = Order(total=1000)  # 1000원 주문
    order.apply_discount(0.10)  # 10% 할인 적용
    assert order.total() == 900  # 결과는 900원
```

완성이다. 필요한 것만 setup에 들어갔다.

## 왜 이 순서가 좋은가

### 1. 목적이 명확해진다

assertion을 먼저 쓰면 "이 테스트가 무엇을 검증하는가?"가 분명해진다.

```python
# Bad: setup이 길고 목적이 불명확
def test_something():
    user = create_user()
    profile = create_profile(user)
    settings = create_settings(profile)
    order = create_order(user, settings)
    item1 = create_item("a", 100)
    item2 = create_item("b", 200)
    order.add(item1)
    order.add(item2)
    # ... 무엇을 테스트하려는 거지?
    assert order.total() == 300

# Good: 목적이 먼저
def test_order_total():
    assert order.total() == 300  # 이게 목적
    # → 300을 만들려면?
    # → 100 + 200 = 300
```

### 2. 불필요한 fixture가 줄어든다

```python
# Before: 혹시 몰라서 다 준비
def test_user_full_name():
    user = User(
        first_name="Alice",
        last_name="Kim",
        email="alice@example.com",      # 불필요
        age=30,                          # 불필요
        address="Seoul",                 # 불필요
        phone="010-1234-5678"            # 불필요
    )
    assert user.full_name() == "Alice Kim"

# After: assertion에서 역산
def test_user_full_name():
    user = User(first_name="Alice", last_name="Kim")
    assert user.full_name() == "Alice Kim"
```

## Outside-In Thinking

Assert First는 **Outside-In** 사고방식이다:

```
원하는 결과 (What)
    ↓
그 결과를 얻는 행동 (How)
    ↓
행동에 필요한 조건 (Given)
```

이 순서는 BDD(Behavior-Driven Development)의 Given-When-Then과 반대 순서로 **작성**하되, 결과적으로 같은 구조가 된다.

## 복잡한 예시

```python
# Step 1: 원하는 결과
def test_reservation_confirmed():
    assert reservation.status == "confirmed"
    assert email_service.sent_to == "user@example.com"

# Step 2: 그 결과를 얻는 행동
def test_reservation_confirmed():
    reservation.confirm()  # 확정 행동

    assert reservation.status == "confirmed"
    assert email_service.sent_to == "user@example.com"

# Step 3: 필요한 fixture
def test_reservation_confirmed():
    email_service = FakeEmailService()
    user = User(email="user@example.com")
    reservation = Reservation(user, email_service)

    reservation.confirm()

    assert reservation.status == "confirmed"
    assert email_service.sent_to == "user@example.com"
```

## 정리

- **Assertion부터** 작성하고 거꾸로 올라간다
- 순서: **결과 → 행동 → 조건**
- **목적이 명확**해지고 **불필요한 setup이 줄어든다**
- **Outside-In** 사고방식
- Test First 내부의 미시적 기법

## 관련 패턴

- [Pattern 4: Test First](/blog/programming/engineering/tdd-patterns/pattern04-test-first) — 코드보다 테스트 먼저
- [Pattern 27: Assertion](/blog/programming/engineering/tdd-patterns/pattern27-assertion) — assertion 작성법
- [Pattern 7: Evident Data](/blog/programming/engineering/tdd-patterns/pattern07-evident-data) — assertion에 의도 드러내기
