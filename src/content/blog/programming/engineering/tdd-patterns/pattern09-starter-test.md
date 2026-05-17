---
title: "Pattern 9: Starter Test"
date: 2026-07-01T09:00:00
description: "처음 test — 가장 작고 간단한 것."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 9
tags: [tdd, beck, starter-test]
draft: true
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> 새로운 기능을 시작할 때 가장 간단하고 퇴화된(degenerate) 케이스를 첫 테스트로 선택한다.

## 동기 (Motivation)

새 기능을 시작하려는데 어디서부터 손대야 할지 모르겠다. 테스트 목록은 있지만, 첫 테스트를 어떤 것으로 해야 할까?

**Starter Test**의 원칙:
- **가장 간단한 케이스**부터 시작
- 0개, null, 빈 입력 같은 **퇴화 케이스(degenerate case)**
- Hello World 수준의 **스켈레톤**
- 빠르게 Green으로 가서 **모멘텀** 확보

첫 테스트의 목적은 기능 구현이 아니라 **시작하는 것**이다.

## Starter Test 예시

### 컬렉션 기능

```python
# Starter: 빈 컬렉션
def test_empty_list_has_zero_sum():
    assert sum_all([]) == 0

# 그 다음: 원소 하나
def test_single_element():
    assert sum_all([5]) == 5

# 그 다음: 원소 여럿
def test_multiple_elements():
    assert sum_all([1, 2, 3]) == 6
```

### 파서 기능

```python
# Starter: 빈 입력
def test_parse_empty_string():
    assert parse("") == []

# 그 다음: 단일 토큰
def test_parse_single_word():
    assert parse("hello") == ["hello"]
```

### 계산기 기능

```python
# Starter: 가장 단순한 연산
def test_add_zero():
    calc = Calculator()
    assert calc.add(0, 0) == 0

# 또는
def test_return_input():
    calc = Calculator()
    assert calc.add(5, 0) == 5
```

## Starter Test의 역할

### 1. 인프라 검증

첫 테스트가 통과하면 다음이 확인된다:
- 테스트 프레임워크가 **작동**한다
- 클래스/함수가 **생성**된다
- import, 의존성이 **올바르다**
- 빌드가 **성공**한다

```python
# 이 간단한 테스트로 많은 것이 검증됨
def test_calculator_exists():
    calc = Calculator()  # 클래스 존재
    result = calc.add(0, 0)  # 메서드 존재
    assert result == 0  # 기본 동작
```

### 2. 모멘텀 확보

시작이 어렵다. 일단 Green bar를 보면 **자신감**이 생긴다.

```text
test_empty_list ... PASSED

좋아, 시작했다. 다음은 뭘까?
```

### 3. 스켈레톤 생성

첫 테스트는 코드의 **뼈대**를 만든다:

```python
# 첫 테스트
def test_order_creation():
    order = Order()
    assert order is not None

# 이로 인해 생성되는 스켈레톤
class Order:
    pass
```

## 무엇이 "가장 간단한가"

| 타입 | Starter Test |
|------|-------------|
| 숫자 | 0, 1 |
| 문자열 | `""`, `"a"` |
| 리스트 | `[]`, `[x]` |
| 불린 | `True` 또는 `False` 하나만 |
| 객체 | 기본 생성자 |

## 주의: Starter Test가 끝이 아니다

```python
# Starter Test만으로 끝내면 안 된다
def test_empty():
    assert sum_all([]) == 0

class SumAll:
    def sum_all(self, items):
        return 0  # 이게 끝?
```

Starter Test는 **시작**일 뿐이다. Test List의 다음 테스트가 구현을 **일반화**하도록 밀어붙인다.

## 정리

- 첫 테스트는 **가장 간단한 케이스**
- 빈 입력, 0, null 같은 **퇴화 케이스**
- **인프라 검증** + **모멘텀 확보**
- **스켈레톤 코드** 생성
- Starter Test는 **시작점**일 뿐, 끝이 아니다

## 관련 패턴

- [Pattern 8: One Step Test](/blog/programming/engineering/tdd-patterns/pattern08-one-step-test) — 다음 테스트 선택
- [Pattern 3: Test List](/blog/programming/engineering/tdd-patterns/pattern03-test-list) — 전체 테스트 계획
- [Pattern 4: Test First](/blog/programming/engineering/tdd-patterns/pattern04-test-first) — Red-Green-Refactor
