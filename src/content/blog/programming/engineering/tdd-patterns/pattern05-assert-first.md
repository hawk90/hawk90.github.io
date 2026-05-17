---
title: "Pattern 5: Assert First"
date: 2026-07-01T05:00:00
description: "테스트에서 assertion부터 — 거꾸로 코딩으로 의도를 명확히."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 5
tags: [tdd, beck, assert-first]
draft: true
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> 테스트를 *assertion부터* 쓰고 *거꾸로* 올라가며 action·setup을 채운다. *목적*이 먼저 명확해진다.

## 동기 (Motivation)

순서대로 setup → action → assert로 작성하면:

```python
def test_something():
    # 1. setup — 뭐가 필요한지 확실치 않은 채 모두 준비
    user = User("alice")
    cart = Cart(user)
    item = Item("book", 1000)

    # 2. action
    cart.add(item)

    # 3. assertion — "뭘 검증하지?"
    assert cart.total() == ???
```

setup이 *방대해지고 검증 대상이 모호*. 불필요한 fixture가 *섞임*.

**Assert First**는 반대:

1. *원하는 결과*(assertion)부터.
2. 그 결과를 얻는 *action*.
3. action에 필요한 *fixture*.

이 순서는 *목적*을 먼저 고정 → setup이 *최소*가 됨.

### 신호

- 테스트의 *setup이 길고 의도 불명*.
- *불필요한 fixture* — 안 쓰는 user, address 등.
- 작성 중 *assert에서 막힘* ("이게 뭐 나와야 하지?").
- 같은 setup이 여러 테스트에 *복사 붙여넣기*.

## 절차 (Mechanics)

1. **assertion 작성** — 원하는 결과부터.
2. **action 추가** — 그 결과를 만드는 호출.
3. **fixture 추가** — action에 필요한 최소 setup.
4. 실행 → fail (production 코드 없음).
5. production 코드 작성 → green.

## 예시 1 — 단순 패턴

### Step 1: Assertion 먼저

```python
def test_discount_applied():
    assert order.total() == 900   # 10% 할인 후
```

`order` 미정의. OK.

### Step 2: Action

```python
def test_discount_applied():
    order.apply_discount(0.10)
    assert order.total() == 900
```

### Step 3: Fixture

```python
def test_discount_applied():
    order = Order(total=1000)
    order.apply_discount(0.10)
    assert order.total() == 900
```

완성. fixture가 *필요한 것만*.

## 예시 2 — 불필요 fixture 제거

```python
# Before — 모두 준비
def test_user_full_name():
    user = User(
        first_name="Alice",
        last_name="Kim",
        email="alice@example.com",   # 불필요
        age=30,                       # 불필요
        address="Seoul",              # 불필요
        phone="010-1234-5678"         # 불필요
    )
    assert user.full_name() == "Alice Kim"

# After — assertion에서 역산
def test_user_full_name():
    user = User(first_name="Alice", last_name="Kim")
    assert user.full_name() == "Alice Kim"
```

테스트가 *full_name 동작만 검증*. 다른 field는 무관.

## 예시 3 — 복잡한 시나리오

```python
# Step 1: 원하는 결과
def test_reservation_confirmed():
    assert reservation.status == "confirmed"
    assert email_service.sent_to == "user@example.com"

# Step 2: action
def test_reservation_confirmed():
    reservation.confirm()
    assert reservation.status == "confirmed"
    assert email_service.sent_to == "user@example.com"

# Step 3: fixture
def test_reservation_confirmed():
    email_service = FakeEmailService()
    user = User(email="user@example.com")
    reservation = Reservation(user, email_service)

    reservation.confirm()

    assert reservation.status == "confirmed"
    assert email_service.sent_to == "user@example.com"
```

목적(*reservation confirm 후 상태 + email 전송*)이 먼저, *그것을 검증하기 위한 fixture*만 도입.

## 자주 보는 안티패턴

### 1. *복사된 setup 그대로 사용*
다른 테스트 fixture를 *복사*해서 *불필요 부분 남김*. *Assert First 정신* 위배.

### 2. *Assertion 부정확*
"결과가 *대충* 이러면 OK" — assertion이 *느슨*. 명확한 값.

### 3. *Multiple assertions 흩어짐*
한 테스트에 *서로 무관 assertion* — 의도 모호. 한 test에 *한 동작*.

### 4. *Setup → assert 순환*
assert 보고 *setup 더 추가, 또 assert 수정* — 의도가 *드리프트*. *처음 의도* 고정 후 setup.

### 5. *Magic value 사용*
```python
assert result == 42   # 왜 42?
```
값이 *어디서 왔는지* 명시 ([Evident Data](/blog/programming/engineering/tdd-patterns/pattern07-evident-data)).

### 6. *Test name과 assertion 불일치*
`test_calculates_tax`인데 *total 검증* — 이름이 *의도와 다름*.

## Modern variants

### Arrange-Act-Assert (AAA)

```python
def test_x():
    # Arrange
    cart = Cart()
    # Act
    cart.add(item)
    # Assert
    assert cart.total() == 100
```

표준 패턴. Assert First는 *작성 순서*는 반대지만 *최종 구조는 같음*.

### Given-When-Then (BDD)

```gherkin
Given an empty cart
When I add an item costing 100
Then total should be 100
```

비기술자 표현. 작성 시 *Then(assertion)부터* 작성하는 것도 자연스러움.

### Test data builder

```python
def test_discount():
    order = OrderBuilder().with_total(1000).build()   # builder가 fixture 단순화
    order.apply_discount(0.10)
    assert order.total() == 900
```

복잡한 fixture를 *builder로 캡슐화*. assertion 중심.

### Object Mother

```python
def test_discount():
    order = ObjectMother.standardOrder()   # 표준 fixture
    order.apply_discount(0.10)
    assert order.total() == 900
```

자주 쓰는 fixture를 *factory function*. 단 *암묵 의존* 위험.

### Parameterized test

```python
@pytest.mark.parametrize("total,rate,expected", [
    (1000, 0.10, 900),
    (2000, 0.50, 1000),
])
def test_discount(total, rate, expected):
    order = Order(total=total)
    order.apply_discount(rate)
    assert order.total() == expected
```

여러 경우 *한 번에*. assertion이 *데이터 기반*.

## Outside-In Thinking

Assert First는 *Outside-In 사고*:

```text
What (결과)
  ↓
How (행동)
  ↓
Given (조건)
```

BDD의 Given-When-Then을 *반대로 작성*하면 같은 구조. *Outside-In TDD* (London school)의 출발점.

## 도구 / IDE

| 도구 | Assert First 지원 |
| --- | --- |
| 모든 test framework | 패턴은 *작성 습관* — 도구 무관 |
| IDE snippet | `test → assert → action → fixture` 순 snippet |
| pytest parametrize | assertion-data 분리 |
| Spock (Groovy) | `given:`, `when:`, `then:` 블록 |

## 성능 고려

작성 순서일 뿐 — 코드 성능 무관. *fixture 최소화*로 test *실행 빨라질 수* 있음.

## 관련 패턴

- [Pattern 4: Test First](/blog/programming/engineering/tdd-patterns/pattern04-test-first) — 코드보다 테스트 먼저
- [Pattern 27: Assertion](/blog/programming/engineering/tdd-patterns/pattern27-assertion) — assertion 작성법
- [Pattern 7: Evident Data](/blog/programming/engineering/tdd-patterns/pattern07-evident-data) — assertion에 의도 드러내기
- [Pattern 28: Fixture](/blog/programming/engineering/tdd-patterns/pattern28-fixture) — fresh fixture 작성
