---
title: "Pattern 26: One to Many"
date: 2026-07-02T02:00:00
description: "Single-item에서 collection으로 — 점진적 일반화."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 26
tags: [tdd, beck, one-to-many, collection]
draft: true
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> 컬렉션을 다룰 때 단일 항목부터 시작해서 점진적으로 여러 항목으로 확장한다.

## 동기 (Motivation)

리스트의 합계를 구현해야 한다. 바로 반복문을 작성할까?

```python
def test_sum():
    assert sum([1, 2, 3, 4, 5]) == 15
```

TDD에서는 **더 작은 스텝**으로 시작한다: **단일 항목**부터.

## One to Many 예시

### 단계 1: 단일 항목

```python
def test_sum_single():
    assert sum([5]) == 5

def sum(numbers):
    return numbers[0]  # 단일 항목만 처리
```

### 단계 2: 두 개

```python
def test_sum_two():
    assert sum([2, 3]) == 5

def sum(numbers):
    return numbers[0] + numbers[1]  # 두 개 처리
```

### 단계 3: 여러 개 (일반화)

```python
def test_sum_many():
    assert sum([1, 2, 3, 4, 5]) == 15

def sum(numbers):
    total = 0
    for n in numbers:
        total += n
    return total
```

## 왜 이렇게 하나?

### 알고리즘의 본질 발견

단일 항목을 처리하는 코드가 **알고리즘의 핵심**이다:

```python
# 단일 항목 처리
def process(item):
    return transform(item)

# 여러 항목은 단일 처리의 확장
def process_all(items):
    return [process(item) for item in items]
```

### 경계 조건 자연스럽게 고려

```python
# 자연스럽게 빈 리스트도 고려하게 됨
def test_sum_empty():
    assert sum([]) == 0

def test_sum_single():
    assert sum([5]) == 5

def test_sum_many():
    assert sum([1, 2, 3]) == 6
```

## 다양한 적용

### 최댓값

```python
# 1. 단일 항목
def test_max_single():
    assert max([7]) == 7

# 2. 두 개
def test_max_two():
    assert max([3, 7]) == 7

# 3. 여러 개
def test_max_many():
    assert max([3, 7, 2, 9, 1]) == 9
```

### 필터링

```python
# 1. 단일 항목 (통과)
def test_filter_single_pass():
    assert filter_evens([2]) == [2]

# 2. 단일 항목 (탈락)
def test_filter_single_fail():
    assert filter_evens([3]) == []

# 3. 여러 개
def test_filter_many():
    assert filter_evens([1, 2, 3, 4, 5]) == [2, 4]
```

### 변환 (Map)

```python
# 1. 단일 항목
def test_double_single():
    assert double_all([3]) == [6]

# 2. 여러 개
def test_double_many():
    assert double_all([1, 2, 3]) == [2, 4, 6]
```

## Test List의 자연스러운 진행

One to Many는 **Test List 작성**의 가이드가 된다:

```text
Test List for sum():
1. [ ] 빈 리스트 → 0
2. [ ] 단일 항목 → 그 값
3. [ ] 두 항목 → 합
4. [ ] 여러 항목 → 총합
5. [ ] 음수 포함
6. [ ] 소수 포함
```

## Reduce 패턴과의 관계

One to Many는 **reduce 패턴**을 자연스럽게 이끈다:

```python
# 단일 → 두 개 → 여러 개 → reduce 발견
def sum(numbers):
    return reduce(lambda acc, n: acc + n, numbers, 0)

def max(numbers):
    return reduce(lambda acc, n: acc if acc > n else n, numbers, numbers[0])
```

## 객체 컬렉션에도 적용

```python
# 1. 단일 주문
def test_total_single_order():
    orders = [Order(amount=100)]
    assert total_amount(orders) == 100

# 2. 여러 주문
def test_total_multiple_orders():
    orders = [Order(100), Order(200), Order(300)]
    assert total_amount(orders) == 600
```

## 정리

- **단일 항목**부터 시작
- **점진적으로 여러 항목**으로 확장
- **알고리즘의 본질** 발견
- **경계 조건** 자연스럽게 고려
- **Test List**의 자연스러운 가이드
- **Reduce 패턴**으로 이어짐

## 관련 패턴

- [Pattern 24: Triangulate](/blog/programming/engineering/tdd-patterns/pattern24-triangulate) — 예제로 일반화
- [Pattern 3: Test List](/blog/programming/engineering/tdd-patterns/pattern03-test-list) — 테스트 계획
- [Pattern 8: One Step Test](/blog/programming/engineering/tdd-patterns/pattern08-one-step-test) — 작은 스텝

