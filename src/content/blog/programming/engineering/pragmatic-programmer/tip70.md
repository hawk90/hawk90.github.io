---
title: "Tip 70: Use Property-Based Tests to Validate Your Assumptions"
date: 2026-05-11T22:00:00
description: "속성 기반 테스트로 가정을 검증하라. 무작위 입력으로 예상치 못한 버그를 찾는다."
series: "The Pragmatic Programmer"
seriesOrder: 70
tags: [pragmatic-programmer, testing, property-based]
draft: true
---

## 이 팁의 메시지

> **Tip 70: Use Property-Based Tests to Validate Your Assumptions.** Property-based tests will try things you never thought to try, and exercise your code in ways that wouldn't occur to you.

속성 기반 테스트는 당신이 생각하지 못한 것들을 시도하고, 떠오르지 않았을 방식으로 코드를 실행한다.

## 예제 기반 테스트의 한계

전통적인 테스트는 특정 예제로 검증한다.

```python
def test_reverse():
    assert reverse([1, 2, 3]) == [3, 2, 1]
    assert reverse([]) == []
    assert reverse([1]) == [1]
```

세 가지 경우만 테스트한다. 나머지 무한한 경우는 테스트하지 않는다.

## 속성 기반 테스트

속성(property)을 정의하고 무작위 입력으로 검증한다.

```python
from hypothesis import given
import hypothesis.strategies as st

@given(st.lists(st.integers()))
def test_reverse_twice_is_original(lst):
    assert reverse(reverse(lst)) == lst

@given(st.lists(st.integers()))
def test_reverse_preserves_length(lst):
    assert len(reverse(lst)) == len(lst)

@given(st.lists(st.integers()))
def test_reverse_preserves_elements(lst):
    assert sorted(reverse(lst)) == sorted(lst)
```

Hypothesis가 수백 개의 무작위 리스트를 생성해서 테스트한다.

## 속성 찾기

좋은 속성을 찾는 것이 핵심이다.

| 속성 유형 | 예 |
|----------|-----|
| 역연산 | encode 후 decode하면 원본 |
| 불변량 | 정렬 후에도 길이 같음 |
| 멱등성 | 두 번 적용해도 결과 같음 |
| 교환 | 순서 바꿔도 결과 같음 |
| 귀납 | 작은 문제의 답이 큰 문제에 포함 |

## 예: 정렬 함수

```python
from hypothesis import given
import hypothesis.strategies as st

@given(st.lists(st.integers()))
def test_sort_produces_sorted_output(lst):
    result = my_sort(lst)
    for i in range(len(result) - 1):
        assert result[i] <= result[i + 1]

@given(st.lists(st.integers()))
def test_sort_preserves_elements(lst):
    result = my_sort(lst)
    assert sorted(lst) == sorted(result)  # 같은 원소를 포함

@given(st.lists(st.integers()))
def test_sort_is_idempotent(lst):
    once = my_sort(lst)
    twice = my_sort(once)
    assert once == twice
```

## 예: JSON 인코더

```python
import json
from hypothesis import given
import hypothesis.strategies as st

# 중첩 JSON 데이터 생성
json_data = st.recursive(
    st.none() | st.booleans() | st.integers() | st.floats(allow_nan=False) | st.text(),
    lambda children: st.lists(children) | st.dictionaries(st.text(), children)
)

@given(json_data)
def test_json_roundtrip(data):
    encoded = json.dumps(data)
    decoded = json.loads(encoded)
    assert data == decoded
```

Hypothesis가 복잡한 중첩 데이터 구조를 생성해서 테스트한다.

## 축소(Shrinking)

실패하면 Hypothesis가 최소 실패 케이스를 찾는다.

원래 실패한 입력이 `[1847293, -3928, 0, 4827, -28374928, 0, 384, -1, 2]`처럼 복잡해도 Hypothesis가 자동으로 `[0, 1]` 같은 최소 입력으로 축소한다. 디버깅이 쉬워진다.

## 상태 기반 테스트

복잡한 시스템의 상태 전이를 테스트한다.

```python
from hypothesis.stateful import RuleBasedStateMachine, rule, invariant

class QueueMachine(RuleBasedStateMachine):
    def __init__(self):
        super().__init__()
        self.queue = Queue()
        self.model = []  # 참조 모델

    @rule(item=st.integers())
    def enqueue(self, item):
        self.queue.enqueue(item)
        self.model.append(item)

    @rule()
    def dequeue(self):
        if self.model:
            expected = self.model.pop(0)
            actual = self.queue.dequeue()
            assert actual == expected

    @invariant()
    def size_matches(self):
        assert self.queue.size() == len(self.model)

TestQueue = QueueMachine.TestCase
```

무작위 순서로 enqueue, dequeue를 호출하면서 불변량을 검증한다.

## 언제 쓰는가

| 적합한 경우 | 부적합한 경우 |
|------------|--------------|
| 명확한 속성이 있을 때 | 속성 정의가 어려울 때 |
| 무한한 입력 공간 | 특정 시나리오 검증 |
| 데이터 변환, 직렬화 | UI 테스트 |
| 순수 함수 | 외부 의존성이 많은 코드 |

## 정리

- 속성 기반 테스트는 무작위 입력으로 속성을 검증한다.
- 예제 기반 테스트가 놓치는 케이스를 찾는다.
- 역연산, 불변량, 멱등성 같은 속성을 찾는다.
- 축소(shrinking)로 최소 실패 케이스를 얻는다.
- Hypothesis, QuickCheck 같은 라이브러리를 활용한다.

## 다음 장 예고

[Tip 71: Keep It Simple and Minimize Attack Surfaces](/blog/programming/engineering/pragmatic-programmer/tip71)에서는 공격 표면을 최소화하는 보안 원칙을 다룬다.

## 관련 항목

- [Tip 69: Test Your Software, or Your Users Will](/blog/programming/engineering/pragmatic-programmer/tip69)
- [Tip 63: Test Your Estimates](/blog/programming/engineering/pragmatic-programmer/tip63)
