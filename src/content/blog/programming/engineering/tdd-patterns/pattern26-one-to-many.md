---
title: "Pattern 26: One to Many"
date: 2026-05-10T02:00:00
description: "Single-item에서 collection으로 — 점진적 일반화. 알고리즘 본질 발견."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 26
tags: [tdd, beck, one-to-many, collection]
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> Collection을 다룰 때 단일 항목부터 시작해 점진적으로 여러 항목으로 확장. 알고리즘의 본질 발견.

## 동기

리스트 합계 구현 — 바로 반복문?

```python
def test_sum():
    assert sum([1, 2, 3, 4, 5]) == 15
```

TDD는 더 작은 스텝 — **단일 항목부터**.

이유:
- 알고리즘 핵심이 단일 처리 + 결합이라는 통찰.
- 경계 조건 자연스럽게 고려.
- Reduce 패턴으로 자연 진화.

### 신호

- collection을 다루는 새 기능 시작.
- 바로 반복문 작성 충동.
- 빈 collection, 단일 처리 잊음.
- 알고리즘 본질이 흐림.

### 언제 적용하는가

- Map/Reduce/Filter 같은 collection 알고리즘.
- 복잡한 collection 변환.
- 도메인 객체 집합 처리.

### 언제 적용하지 않는가

- 이미 standard library가 처리 (`sum()`, `max()`).
- 구현이 Obvious.

## 절차

1. **빈 collection** 테스트 (경계).
2. **단일 항목** 테스트 — 핵심 처리.
3. **두 항목** 테스트 — 결합 방식 등장.
4. **여러 항목** 테스트 — 일반화 강제.
5. *reduce/fold 패턴* 발견 가능하다.

## 예시 1 — Sum

```python
# 단계 1: 빈 (경계)
def test_sum_empty():
    assert sum([]) == 0

def sum(numbers):
    return 0

# 단계 2: 단일
def test_sum_single():
    assert sum([5]) == 5

def sum(numbers):
    if not numbers: return 0
    return numbers[0]

# 단계 3: 두 개
def test_sum_two():
    assert sum([2, 3]) == 5

def sum(numbers):
    if not numbers: return 0
    return numbers[0] + (numbers[1] if len(numbers) > 1 else 0)

# 단계 4: 여러 개 — 일반화
def test_sum_many():
    assert sum([1, 2, 3, 4, 5]) == 15

def sum(numbers):
    total = 0
    for n in numbers:
        total += n
    return total
```

알고리즘이 점진적으로 모습.

## 예시 2 — Max

```python
def test_max_single():
    assert maximum([7]) == 7

def test_max_two():
    assert maximum([3, 7]) == 7

def test_max_many():
    assert maximum([3, 7, 2, 9, 1]) == 9

# 점진적 → reduce
def maximum(items):
    result = items[0]
    for x in items[1:]:
        if x > result: result = x
    return result
```

## 예시 3 — Filter

```python
def test_filter_single_pass():
    assert filter_evens([2]) == [2]

def test_filter_single_fail():
    assert filter_evens([3]) == []

def test_filter_many():
    assert filter_evens([1, 2, 3, 4, 5]) == [2, 4]

def filter_evens(items):
    return [x for x in items if x % 2 == 0]
```

단일 통과/탈락 → 여러 개로.

## 자주 보는 안티패턴

### 1. 바로 loop 작성

"sum은 reduce지" → 단일 처리 못 봄. TDD 정신 위배.

### 2. 경계 무시

빈 collection test 없음 → production에서 IndexError. 항상 빈 case.

### 3. 너무 잘게

단일 → 두 개 → 세 개 → 네 개... → 과한 분해. 두 단계면 충분.

### 4. Reduce 강제

모든 collection을 reduce로 → 단순 sum 같은 case는 built-in이 명확하다.

### 5. *Stream/iterator 무시*

list만 가정 → infinite stream에서 깨짐. iterable 처리.

### 6. Production code도 one-by-one

test는 점진적이지만 production은 최종 일반화. test 진화와 production 진화 동시.

## Modern variants

### Functional style

```python
def sum(items):
    return reduce(lambda acc, x: acc + x, items, 0)
```

reduce는 one-to-many의 자연 결론.

### Generator / lazy

```python
def sum(iterable):
    total = 0
    for x in iterable:
        total += x
    return total

# infinite stream 대응
```

### Recursive

```python
def sum(items):
    if not items: return 0
    return items[0] + sum(items[1:])
```

base case (empty) + recursive — TDD 진화와 자연.

### Parallel reduce

```python
from concurrent.futures import ThreadPoolExecutor
def parallel_sum(items, chunk_size=1000):
    chunks = [items[i:i+chunk_size] for i in range(0, len(items), chunk_size)]
    with ThreadPoolExecutor() as ex:
        return sum(ex.map(sum, chunks))
```

성능 critical에서 fork-join.

### Stream API (Java, Kotlin)

```java
items.stream().reduce(0, Integer::sum);
```

## Test List의 가이드

**Test List for sum():**

- [ ] 빈 → 0
- [ ] 단일 → 그 값
- [ ] 두 항목 → 합
- [ ] 여러 → 총합
- [ ] 음수 포함
- [ ] 소수 포함
- [ ] 매우 큰 list (스트림)

체계적 테스트 진행.

## 도구 / IDE

| 도구 | One-to-Many 지원 |
| --- | --- |
| pytest.mark.parametrize | 단일→다중 일괄 test |
| Hypothesis `st.lists()` | 다양한 크기 |
| QuickCheck (Haskell) | property로 일반화 |

## 성능 고려

알고리즘 패턴 자체는 Big-O 결정 (O(n), O(n log n)). 단일→다중 최적화 기회 식별:
- Built-in 사용 (C 수준 빠름).
- Vectorized (NumPy, pandas).
- Parallel.

## 관련 패턴

- [Pattern 24: Triangulate](/blog/programming/engineering/tdd-patterns/pattern24-triangulate) — 예제로 일반화
- [Pattern 3: Test List](/blog/programming/engineering/tdd-patterns/pattern03-test-list) — 테스트 계획
- [Pattern 8: One Step Test](/blog/programming/engineering/tdd-patterns/pattern08-one-step-test) — 작은 스텝
- [Pattern 9: Starter Test](/blog/programming/engineering/tdd-patterns/pattern09-starter-test) — degenerate case 시작
