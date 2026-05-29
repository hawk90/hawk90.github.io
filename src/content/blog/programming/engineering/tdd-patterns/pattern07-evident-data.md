---
title: "Pattern 7: Evident Data"
date: 2026-05-10T07:00:00
description: "테스트의 expected value를 계산식으로 — 의도를 드러낸다."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 7
tags: [tdd, beck, evident-data]
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
draft: true

---

## 한 줄 요약

> 테스트의 expected value를 하드코딩 대신 계산식으로 표현. 왜 그 값이 나오는지를 코드에 새긴다.

## 동기

```python
# A
def test_total():
    assert cart.total() == 300

# B
def test_total():
    price = 100
    quantity = 3
    assert cart.total() == price * quantity
```

A의 `300`은 어디서 왔는지 불명. B는 `100 * 3 = 300`이 *코드에 표현. 읽는 사람이 왜 300인지* 즉시.

### 신호

- 테스트에 맥락 없는 값 (`300`, `1234`).
- 변경 시 expected를 함께 수정해야 함 (의도 추적 어려움).
- 새 멤버가 왜 이 값? 질문.
- expected value가 production 출력의 단순 copy.

### 언제 적용하는가

- expected가 계산 가능한 값.
- 의도가 값 자체로는 안 보임.
- 유지보수에서 변경 가능성.

### 언제 하드코딩이 OK인가

- 값 자체가 명세: HTTP 200, `Math.PI`, ISO 표준 코드.
- 알려진 magic number: `0`, `1`, `-1` 같은 boundary.
- 계산식이 production을 그대로 복사: 테스트가 구현 버그를 함께 복사.

```python
# Bad — 구현 복사
def test_distance():
    x, y = 3, 4
    expected = (x ** 2 + y ** 2) ** 0.5   # 구현과 동일
    assert distance(x, y) == expected

# Good — 알려진 값
def test_345_triangle():
    assert distance(3, 4) == 5   # 피타고라스 정리
```

## 절차

1. **expected value 확인** — 단순 값인지, 계산 가능인지.
2. 입력 값에 이름 부여 (`price`, `quantity`).
3. expected를 계산식으로 작성 (`price * quantity`).
4. 너무 복잡하면 중간 변수 도입 (`subtotal = price * quantity`).
5. 알려진 값이면 하드코딩 유지.

## 예시 1 — 환율 변환

```python
# Before
def test_currency_conversion():
    usd = Dollar(100)
    krw = usd.to_krw()
    assert krw.amount == 130000   # 왜 130000?

# After
def test_currency_conversion():
    usd_amount = 100
    exchange_rate = 1300   # 1 USD = 1300 KRW
    usd = Dollar(usd_amount)
    krw = usd.to_krw()
    assert krw.amount == usd_amount * exchange_rate
```

`130000`이 명시적으로 산출. 환율 변경 시 상수 하나만 수정.

## 예시 2 — 할인 계산

```python
# Before
def test_discount():
    assert apply_discount(1000, 20) == 800

# After
def test_discount():
    original_price = 1000
    discount_percent = 20
    expected = original_price * (100 - discount_percent) / 100
    assert apply_discount(original_price, discount_percent) == expected
```

20% 할인 → 80% 적용 → `expected`. 공식이 자명하다.

## 예시 3 — 날짜 계산

```python
# Before
def test_subscription_end():
    assert subscription.end_date == date(2024, 4, 15)

# After
def test_subscription_end():
    start = date(2024, 1, 15)
    duration_months = 3
    subscription = Subscription(start, duration_months)
    expected_end = start + relativedelta(months=duration_months)
    assert subscription.end_date == expected_end
```

`date(2024, 4, 15)` 어디서?를 시작 + duration으로 표현.

## Evident Data의 수준

```python
# Level 1: 완전 하드코딩 (피하기)
assert total == 1100

# Level 2: 부분 계산 (최소)
assert total == 1000 + 100

# Level 3: 변수 + 계산 (권장)
price = 1000
tax = 100
assert total == price + tax

# Level 4: 의미 있는 이름 (최선)
base_price = 1000
tax_amount = base_price * 0.10
assert total == base_price + tax_amount
```

## 자주 보는 안티패턴

### 1. 구현을 테스트가 복사

expected가 production 알고리즘 그대로 → 같은 bug에 둘 다 fail 못 함. 독립 검증 가능한 값.

### 2. 계산식이 더 어려움

```python
expected = (((a * b) + (c / d)) % e) ** f   # 이해 어려움
```
의도가 더 불명. 단순화 또는 알려진 값 사용.

### 3. Magic number 변수만 만들기

```python
x = 42   # 여전히 의미 없음
assert process(x) == 84
```
이름이 의미 없으면 효과 없음. `positive_input`, `boundary_value` 등.

### 4. Floating point 정확 비교

```python
assert calculate_pi() == 3.14159   # 실패 위험
```
`pytest.approx`, `assertAlmostEqual` 사용.

### 5. 시간 의존

```python
assert created_at == datetime.now()   # 매번 실패
```
시간을 고정 주입 (clock service).

### 6. Comment로만 의도 표현

```python
assert total == 1100   # 1000 + 100 (tax)
```
주석은 검증되지 않음. 계산식으로 표현.

## Modern variants

### Pytest parameterize

```python
@pytest.mark.parametrize("price,rate,expected", [
    (1000, 0.10, 100),
    (2000, 0.05, 100),
    (500,  0.20, 100),
])
def test_tax(price, rate, expected):
    assert calculate_tax(price, rate) == expected
```

각 입력의 expected를 명시. 데이터 테이블로 패턴 가시화.

### Approval testing

```python
# approvaltests
verify(rendered_output)
```

복잡한 output을 baseline 파일과 비교 — 변경은 검토 후 승인.

### Property-based

```python
@given(st.integers(), st.integers())
def test_add_commutative(a, b):
    assert add(a, b) == add(b, a)   # property — value 아님
```

specific value 대신 불변량 검증.

### Spec by example (Cucumber)

```gherkin
Examples:
  | price | rate | expected |
  | 1000  | 0.10 | 100      |
  | 2000  | 0.05 | 100      |
```

비기술자도 값과 의도 동시 표현.

## 도구 / IDE

| 도구 | 기능 |
| --- | --- |
| pytest.mark.parametrize | 데이터 테이블 |
| AssertJ, Hamcrest | 의미 있는 assertion (`isCloseTo`, `containsExactly`) |
| approval-tests | baseline 비교 |
| Hypothesis | property-based |

## 성능 고려

계산식은 test 실행 시점에 평가 — overhead 무시. 복잡 fixture 계산은 setup 시간 영향 — 미리 계산 캐시 가능하다.

## 관련 패턴

- [Pattern 6: Test Data](/blog/programming/engineering/tdd-patterns/pattern06-test-data) — 어떤 데이터를 선택
- [Pattern 27: Assertion](/blog/programming/engineering/tdd-patterns/pattern27-assertion) — assertion 작성
- [Pattern 5: Assert First](/blog/programming/engineering/tdd-patterns/pattern05-assert-first) — assertion 먼저
- [Pattern 24: Triangulate](/blog/programming/engineering/tdd-patterns/pattern24-triangulate) — 여러 데이터로 일반화
