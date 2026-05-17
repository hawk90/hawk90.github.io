---
title: "Pattern 25: Obvious Implementation"
date: 2026-07-02T01:00:00
description: "구현이 명확하면 — 바로 진짜 구현."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 25
tags: [tdd, beck, obvious-implementation]
draft: true
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> 구현이 명확하고 자신 있으면 Fake It/Triangulate 없이 바로 진짜 구현을 작성한다.

## 동기 (Motivation)

모든 것을 Fake It으로 시작할 필요는 없다. **구현이 뻔할 때**가 있다:

```python
def test_double():
    assert double(5) == 10

# Fake It?
def double(n):
    return 10  # 이게 필요한가?

# Obvious Implementation
def double(n):
    return n * 2  # 바로 진짜 구현
```

**Obvious Implementation**은 **가장 큰 스텝**이다.

## Obvious Implementation 예시

### 단순 연산

```python
def test_add():
    assert add(2, 3) == 5

def add(a, b):
    return a + b  # 너무 명확
```

### 위임(Delegation)

```python
def test_user_name():
    user = User(name="Alice")
    assert user.get_name() == "Alice"

class User:
    def __init__(self, name):
        self._name = name

    def get_name(self):
        return self._name  # 단순 위임
```

### 표준 라이브러리 사용

```python
def test_sort():
    assert sort([3, 1, 2]) == [1, 2, 3]

def sort(items):
    return sorted(items)  # 표준 라이브러리 호출
```

## 3가지 구현 전략

Beck은 세 가지 전략을 제시한다:

| 전략 | 스텝 크기 | 언제 |
|------|----------|------|
| Fake It | 최소 | 불확실할 때 |
| Triangulate | 중간 | 패턴을 찾을 때 |
| Obvious Implementation | 최대 | 명확할 때 |

## 언제 Obvious Implementation을 쓰나

```text
✓ 구현이 머릿속에 명확할 때
✓ 비슷한 코드를 많이 작성해본 경험이 있을 때
✓ 단순한 위임/래핑일 때
✓ 표준 라이브러리 호출일 때

✗ 알고리즘이 복잡할 때
✗ 확신이 없을 때
✗ 실패 경험이 있는 유사 코드일 때
✗ 처음 다루는 도메인일 때
```

## 실패하면 후퇴

Obvious Implementation이 **실패하면 작은 스텝으로 후퇴**한다:

```python
def test_roman_to_int():
    assert roman_to_int("XIV") == 14

# 시도: Obvious Implementation
def roman_to_int(s):
    # 복잡해서 한 번에 안 됨... 테스트 실패

# 후퇴: Fake It
def roman_to_int(s):
    return 14  # 일단 green

# 후퇴: Triangulate
def test_roman_i():
    assert roman_to_int("I") == 1
def test_roman_v():
    assert roman_to_int("V") == 5
# ...점진적으로 구현
```

## 자신감의 척도

**Obvious Implementation을 얼마나 자주 쓰는가**는 **자신감의 척도**다:

```text
초보자:
  Fake It: 80%
  Triangulate: 15%
  Obvious: 5%

숙련자:
  Fake It: 30%
  Triangulate: 30%
  Obvious: 40%

전문가 (해당 도메인):
  Fake It: 10%
  Triangulate: 20%
  Obvious: 70%
```

## 과신 주의

```python
# 과신의 결과
def test_complex_algorithm():
    assert solve(input_data) == expected

# "이 정도는 바로 되지"
def solve(data):
    # 200줄의 복잡한 코드
    # ...
    return result

# 결과: 테스트 실패, 어디가 틀린지 모름
```

**실패했을 때 디버깅이 어려우면** Obvious Implementation이 **과했던 것**이다.

## Beck의 조언

> "나도 Obvious Implementation을 시도한다. 실패하면 Fake It으로 돌아간다. 부끄러운 일이 아니다."

**후퇴는 전략**이지 실패가 아니다.

## 정리

- **명확하면 바로 진짜 구현**
- **가장 큰 스텝** — 시간 절약
- **실패하면 작은 스텝으로 후퇴**
- **자신감의 척도** — 경험에 따라 다름
- **과신 주의** — 디버깅 어려우면 과했던 것
- **후퇴는 전략**

## 관련 패턴

- [Pattern 23: Fake It](/blog/programming/engineering/tdd-patterns/pattern23-fake-it) — 작은 스텝
- [Pattern 24: Triangulate](/blog/programming/engineering/tdd-patterns/pattern24-triangulate) — 중간 스텝
- [Pattern 8: One Step Test](/blog/programming/engineering/tdd-patterns/pattern08-one-step-test) — 스텝 크기 선택

