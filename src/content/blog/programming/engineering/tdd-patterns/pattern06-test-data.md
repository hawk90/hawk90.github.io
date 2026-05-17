---
title: "Pattern 6: Test Data"
date: 2026-07-01T06:00:00
description: "Test에 어떤 데이터를 쓸지 — 의도가 드러나는 값."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 6
tags: [tdd, beck, test-data]
draft: true
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> 테스트 데이터는 그 테스트의 의도를 드러내는 값을 선택한다. 무의미한 magic number를 피한다.

## 동기 (Motivation)

테스트에 어떤 값을 쓸지는 사소해 보이지만 중요하다. 잘못된 데이터 선택은:
- 테스트의 **의도를 숨긴다**
- **유지보수를 어렵게** 만든다
- **버그를 놓치게** 한다

좋은 테스트 데이터는:
- 테스트가 **무엇을 검증하는지** 드러낸다
- **경계 조건**을 잡아낸다
- 읽는 사람이 **"왜 이 값인가?"**를 알 수 있다

## Magic Number 문제

```python
# Bad: 42와 84가 무슨 의미?
def test_double():
    result = double(42)
    assert result == 84
```

42는 왜 42인가? 특별한 이유가 있나? 없다면 읽는 사람이 혼란스럽다.

```python
# Good: 의도가 명확
def test_double():
    input_value = 5
    result = double(input_value)
    assert result == input_value * 2
```

또는:

```python
# Good: 변수명으로 의도 표현
def test_double_positive_number():
    positive_number = 7
    result = double(positive_number)
    assert result == 14
```

## 데이터 선택 전략

### 1. 대표적 값 (Representative Values)

일반적인 케이스를 대표하는 값:

```python
def test_calculate_tax():
    price = 1000  # 원 단위, 계산하기 쉬운 값
    tax_rate = 0.10  # 10%
    result = calculate_tax(price, tax_rate)
    assert result == 100
```

### 2. 경계 값 (Boundary Values)

버그가 숨어 있는 경계:

```python
def test_age_validation():
    # 경계값들
    assert is_adult(17) == False  # 경계 직전
    assert is_adult(18) == True   # 경계
    assert is_adult(19) == True   # 경계 직후
```

### 3. 특수 값 (Special Values)

0, null, 빈 문자열, 빈 리스트:

```python
def test_sum_empty_list():
    assert sum_all([]) == 0

def test_sum_single_element():
    assert sum_all([42]) == 42
```

### 4. 실제 같은 값 (Realistic Values)

프로덕션에서 볼 법한 데이터:

```python
def test_parse_email():
    # 실제 이메일 형식
    email = "alice.kim@example.com"
    result = parse_email(email)
    assert result.local == "alice.kim"
    assert result.domain == "example.com"
```

## 피해야 할 데이터

### 1. 의미 없는 값

```python
# Bad
def test_something():
    result = process(123, "abc", True)
    assert result == 456
```

### 2. 너무 복잡한 값

```python
# Bad: 이게 다 필요한가?
def test_user_creation():
    user = User(
        id=uuid.uuid4(),
        name="Alice Kim",
        email="alice@example.com",
        created_at=datetime.now(),
        updated_at=datetime.now(),
        settings={"theme": "dark", "lang": "ko"},
        permissions=["read", "write", "admin"]
    )
    assert user.is_valid()
```

테스트에 필요한 최소한의 데이터만 사용한다.

### 3. 테스트 간 중복 값

```python
# Bad: 같은 "42"가 여러 테스트에
def test_double():
    assert double(42) == 84

def test_triple():
    assert triple(42) == 126  # 같은 42, 왜?
```

각 테스트에 맞는 의도적인 값을 사용한다.

## 데이터 생성 헬퍼

반복되는 테스트 데이터는 헬퍼로 추출:

```python
def make_user(name="Test User", email="test@example.com"):
    """테스트용 기본 사용자 생성"""
    return User(name=name, email=email)

def make_order(total=1000, items=None):
    """테스트용 기본 주문 생성"""
    return Order(total=total, items=items or [])

# 사용
def test_user_full_name():
    user = make_user(name="Alice Kim")
    assert user.full_name() == "Alice Kim"

def test_order_discount():
    order = make_order(total=1000)
    order.apply_discount(0.1)
    assert order.total() == 900
```

## 정리

- 테스트 데이터는 **의도를 드러내야** 한다
- **Magic number**를 피하고 변수명으로 설명한다
- **경계값**, **특수값**, **대표값**을 전략적으로 선택
- **실제 같은 값**이 숨은 버그를 찾아준다
- **최소한의 데이터**만 사용한다
- 반복되면 **헬퍼 함수**로 추출

## 관련 패턴

- [Pattern 7: Evident Data](/blog/programming/engineering/tdd-patterns/pattern07-evident-data) — 계산식으로 의도 표현
- [Pattern 29: Fixture](/blog/programming/engineering/tdd-patterns/pattern29-fixture) — 테스트 데이터 설정
- [Pattern 5: Assert First](/blog/programming/engineering/tdd-patterns/pattern05-assert-first) — 필요한 데이터 역산
