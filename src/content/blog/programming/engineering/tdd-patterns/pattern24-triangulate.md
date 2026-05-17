---
title: "Pattern 24: Triangulate"
date: 2026-07-01T24:00:00
description: "두 examples로 abstraction 강제 — 일반화의 방향."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 24
tags: [tdd, beck, triangulate, generalization]
draft: true
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> 두 번째 예제를 추가하여 구현을 일반화하도록 강제한다.

## 동기 (Motivation)

Fake It으로 상수를 반환했다. 언제 진짜 구현으로 바꿔야 하나?

```python
def test_plus():
    assert plus(2, 3) == 5

def plus(a, b):
    return 5  # Fake
```

**두 번째 예제**를 추가하면 상수로는 안 된다:

```python
def test_plus_different():
    assert plus(3, 4) == 7  # 5를 반환하면 실패!
```

이것이 **Triangulate** — **두 점으로 위치를 특정**하듯, 두 예제로 구현을 특정한다.

## Triangulate 예시

### 단계 1: Fake It

```python
def test_fibonacci_0():
    assert fibonacci(0) == 0

def fibonacci(n):
    return 0  # Fake
```

### 단계 2: 두 번째 예제

```python
def test_fibonacci_1():
    assert fibonacci(1) == 1

def fibonacci(n):
    if n == 0:
        return 0
    return 1  # 여전히 조금 Fake
```

### 단계 3: 세 번째 예제로 패턴 발견

```python
def test_fibonacci_2():
    assert fibonacci(2) == 1

def fibonacci(n):
    if n == 0:
        return 0
    if n == 1:
        return 1
    return 1  # 패턴이 보이기 시작
```

### 단계 4: 일반화

```python
def test_fibonacci_3():
    assert fibonacci(3) == 2

def fibonacci(n):
    if n == 0:
        return 0
    if n == 1:
        return 1
    return fibonacci(n-1) + fibonacci(n-2)  # 일반화!
```

## 몇 개의 예제가 필요한가?

```text
보통 2개면 충분하다.

1개: 상수로 통과 가능 (Fake It)
2개: 일반화 강제
3개: 거의 필요 없음 (확신이 없을 때만)
4개+: 과잉
```

### 예외: 경계 조건

```python
# 경계 조건은 추가 예제가 유용
def test_empty_list():
    assert sum([]) == 0

def test_single_item():
    assert sum([5]) == 5

def test_multiple_items():
    assert sum([1, 2, 3]) == 6

def test_negative_numbers():
    assert sum([-1, -2, 3]) == 0
```

## Triangulate의 방향 찾기

GPS처럼 **두 신호**로 위치를 특정한다:

```text
Test 1: plus(2, 3) == 5
  → return 5 (위치 불확실)

Test 2: plus(3, 4) == 7
  → return a + b (위치 특정!)
```

## 언제 Triangulate를 쓰나

```text
✓ 일반화 방향이 불확실할 때
✓ 알고리즘의 패턴을 찾을 때
✓ 귀납적으로 설계할 때
✓ Fake It 후 진행이 막힐 때

✗ 구현이 명확할 때 (Obvious Implementation)
✗ 이미 패턴을 알 때
✗ 단순한 위임일 때
```

## Triangulate vs Obvious Implementation

```python
# Triangulate가 필요한 경우
def test_roman_1():
    assert to_roman(1) == "I"
def test_roman_2():
    assert to_roman(2) == "II"
def test_roman_3():
    assert to_roman(3) == "III"
def test_roman_4():
    assert to_roman(4) == "IV"  # 패턴 변화!

# Obvious Implementation으로 충분한 경우
def test_double():
    assert double(5) == 10
# 바로 구현해도 됨
def double(n):
    return n * 2
```

## 귀납적 설계

Triangulate는 **귀납적 설계**의 도구다:

```text
예제 1 → 가설 1 (상수)
예제 2 → 가설 2 (조건문)
예제 3 → 가설 3 (재귀/반복)
   ...
예제 N → 일반 해법
```

**예제가 구현을 이끈다**.

## 정리

- **두 번째 예제**로 일반화 강제
- **GPS 삼각측량**처럼 위치 특정
- **보통 2개면 충분** (경계 조건은 예외)
- **귀납적 설계** — 예제가 구현을 이끔
- **Fake It 후 자연스러운 다음 단계**
- **명확하면 건너뛰어도** OK

## 관련 패턴

- [Pattern 23: Fake It](/blog/programming/engineering/tdd-patterns/pattern23-fake-it) — Triangulate 전 단계
- [Pattern 25: Obvious Implementation](/blog/programming/engineering/tdd-patterns/pattern25-obvious-implementation) — Triangulate 건너뛰기
- [Pattern 6: Test Data](/blog/programming/engineering/tdd-patterns/pattern06-test-data) — 예제 선택

