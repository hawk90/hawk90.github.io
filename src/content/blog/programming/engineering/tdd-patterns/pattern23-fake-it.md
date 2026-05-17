---
title: "Pattern 23: Fake It (Til You Make It)"
date: 2026-07-01T23:00:00
description: "Constant return 부터 — 가장 빠른 green bar."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 23
tags: [tdd, beck, fake-it, green-bar]
draft: true
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> 테스트를 통과시키기 위해 우선 상수를 반환하고, 나중에 일반화한다.

## 동기 (Motivation)

TDD의 목표는 **빠르게 green bar**에 도달하는 것이다. 가장 빠른 방법은?

```python
def test_sum():
    assert sum([1, 2, 3]) == 6
```

가장 빠른 구현:

```python
def sum(numbers):
    return 6  # Fake it!
```

**비웃음 받을 수 있는** 구현이지만, **가장 작은 스텝**이다.

## Fake It 예시

### 단계 1: 상수 반환

```python
def test_plus():
    assert plus(2, 3) == 5

def plus(a, b):
    return 5  # Fake
```

### 단계 2: 변수 사용

```python
def plus(a, b):
    return 2 + 3  # 여전히 Fake, 하지만 테스트 데이터 사용
```

### 단계 3: 일반화

```python
def plus(a, b):
    return a + b  # Real implementation
```

이 과정이 **Fake It → Triangulate → Real**이다.

## 왜 이렇게 하나?

### 심리적 안전

```text
Red → Green: 최소 시간 (안도감)
Green → Refactor: 안전하게 개선
```

**red 상태가 오래 지속**되면 불안하다. **빨리 green**으로 가면 안정감.

### 작은 스텝 강제

```python
# 처음부터 완벽하게 하려는 충동
def plus(a, b):
    if not isinstance(a, (int, float)):
        raise TypeError(...)
    if not isinstance(b, (int, float)):
        raise TypeError(...)
    result = a + b
    if result > sys.maxsize:
        raise OverflowError(...)
    return result

# Fake It — 필요한 것만
def plus(a, b):
    return 5
```

**YAGNI** — 필요할 때 추가한다.

## Fake It의 변형

### 컬렉션도 상수로

```python
def test_get_users():
    users = get_users()
    assert len(users) == 3

def get_users():
    return ["Alice", "Bob", "Charlie"]  # Fake list
```

### 객체도 상수로

```python
def test_create_order():
    order = create_order("user_1", 1000)
    assert order.total == 1000

def create_order(user_id, amount):
    return Order(total=1000)  # Fake object
```

## Fake It 후 일반화

### Triangulate로

```python
# 두 번째 테스트 추가
def test_plus_different_numbers():
    assert plus(3, 4) == 7

# 이제 상수로는 안 됨 — 일반화 강제
def plus(a, b):
    return a + b
```

### Obvious Implementation으로

구현이 명확하면 바로:

```python
def plus(a, b):
    return a + b  # 너무 명확해서 Fake 불필요
```

## 언제 Fake It을 쓰나

```text
✓ 구현 방향이 불확실할 때
✓ 복잡한 알고리즘을 시작할 때
✓ 외부 의존성이 있을 때
✓ 자신감이 낮을 때

✗ 구현이 명확할 때 (Obvious Implementation)
✗ 이미 비슷한 코드가 있을 때
✗ 단순한 위임(delegation)일 때
```

## Beck의 조언

> "Fake it은 비웃음 받지만, 가장 실용적인 기법이다. 나도 자주 쓴다."

**작은 스텝**이 **자신감**을 만들고, 자신감이 **더 큰 스텝**을 가능하게 한다.

## 정리

- **상수 반환**으로 가장 빠르게 green
- **심리적 안전** — red 시간 최소화
- **작은 스텝 강제** — YAGNI 실천
- **Triangulate**로 일반화
- **명확하면 Obvious Implementation**으로
- **비웃음 받아도** 실용적

## 관련 패턴

- [Pattern 24: Triangulate](/blog/programming/engineering/tdd-patterns/pattern24-triangulate) — Fake 후 일반화
- [Pattern 25: Obvious Implementation](/blog/programming/engineering/tdd-patterns/pattern25-obvious-implementation) — Fake 건너뛰기
- [Pattern 8: One Step Test](/blog/programming/engineering/tdd-patterns/pattern08-one-step-test) — 작은 스텝 선택

