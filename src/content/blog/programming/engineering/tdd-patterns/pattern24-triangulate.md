---
title: "Pattern 24: Triangulate"
date: 2026-07-01T24:00:00
description: "두 examples로 abstraction 강제 — 일반화의 방향 GPS 삼각측량."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 24
tags: [tdd, beck, triangulate, generalization]
draft: true
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> *두 번째 예제*를 추가해 구현을 일반화하도록 강제. GPS *삼각측량*처럼 *두 점으로 위치 특정*.

## 동기 (Motivation)

[Fake It](/blog/programming/engineering/tdd-patterns/pattern23-fake-it)으로 상수를 반환. *언제 진짜 구현*으로 바꿔야 하나?

```python
def test_plus():
    assert plus(2, 3) == 5

def plus(a, b):
    return 5   # Fake
```

두 번째 예제 추가 → 상수로 fail:

```python
def test_plus_different():
    assert plus(3, 4) == 7   # Fake 5 → 실패

def plus(a, b):
    return a + b   # 일반화 강제
```

이것이 **Triangulate**. 두 점으로 *위치 특정*.

### 신호

- Fake It 후 *진행 방향* 결정 필요.
- 알고리즘 *패턴*을 *예제로 발견*하고 싶음.
- *귀납적 설계* — 구체에서 추상으로.

### 언제 적용하는가

- 일반화 *방향 불확실*.
- *알고리즘 패턴 탐색*.
- Fake It 후 진행 *막힘*.

### 언제 적용하지 않는가

- 구현이 *명확* → [Obvious Implementation](/blog/programming/engineering/tdd-patterns/pattern25-obvious-implementation).
- 이미 *패턴을 앎*.
- 단순 *위임*.

## 절차 (Mechanics)

1. **첫 테스트** → Fake로 통과.
2. **두 번째 테스트** — 다른 입력/출력.
3. Fake로는 *fail*.
4. **일반화** — 두 케이스 모두 통과시키는 구현.
5. *세 번째 테스트*로 *추가 검증* (필요 시).

## 예시 1 — Fibonacci

### Step 1: Fake

```python
def test_fibonacci_0():
    assert fibonacci(0) == 0

def fibonacci(n):
    return 0   # Fake
```

### Step 2: 두 번째 (부분 일반화)

```python
def test_fibonacci_1():
    assert fibonacci(1) == 1

def fibonacci(n):
    if n == 0: return 0
    return 1   # 여전히 부분 Fake
```

### Step 3: 패턴 발견

```python
def test_fibonacci_2():
    assert fibonacci(2) == 1
# 통과 — 우연

def test_fibonacci_3():
    assert fibonacci(3) == 2
# fail — 일반화 필요

def fibonacci(n):
    if n <= 1: return n
    return fibonacci(n-1) + fibonacci(n-2)
```

귀납적으로 *알고리즘 발견*.

## 예시 2 — 단순 plus

```python
# Test 1
def test_plus_2_3(): assert plus(2, 3) == 5

# Fake
def plus(a, b): return 5

# Test 2
def test_plus_3_4(): assert plus(3, 4) == 7

# Fake fail → 일반화
def plus(a, b): return a + b
```

가장 단순. *2개 예제로 충분*.

## 예시 3 — Roman numerals (패턴 변화)

```python
# 일관 패턴
def test_roman_1(): assert to_roman(1) == "I"
def test_roman_2(): assert to_roman(2) == "II"
def test_roman_3(): assert to_roman(3) == "III"

# 패턴 변화 발견
def test_roman_4(): assert to_roman(4) == "IV"   # ← "IIII" 아님!

# 일반화 시 새 규칙 도입
def to_roman(n):
    if n >= 4: ...   # 새 규칙
    return "I" * n
```

triangulate가 *예상치 못한 규칙*을 *예제로 드러냄*.

## 몇 개의 예제가 필요한가

| 개수 | 의미 |
| --- | --- |
| 1개 | 상수 통과 (Fake It) |
| 2개 | 일반화 강제 |
| 3개 | 확신 부족 시 |
| 4개+ | 보통 과잉 |

### 경계 조건은 예외

```python
def test_empty_list(): assert sum([]) == 0
def test_single(): assert sum([5]) == 5
def test_multiple(): assert sum([1,2,3]) == 6
def test_negative(): assert sum([-1,-2,3]) == 0
```

*경계*는 *별도 테스트*.

## 자주 보는 안티패턴

### 1. *Triangulate 무한 반복*
4개, 5개... 일반화 부담. *2-3개*면 충분.

### 2. *Triangulate 안 함*
Fake로 끝 → production 깨짐. 반드시 일반화.

### 3. *너무 유사한 예제*
```python
plus(2, 3) == 5
plus(2, 4) == 6   # a 같음 — 일반화 강제 약함
```
*충분히 다른 예제*.

### 4. *Magic value triangulate*
```python
assert to_roman(7) == "VII"   # 왜 7?
```
*Evident Data*와 결합.

### 5. *Triangulate가 알고리즘 도출 못 함*
복잡 알고리즘은 *triangulate만으로* 부족 — *학습 + 디자인* 병행.

### 6. *Refactor 생략*
일반화 후 즉시 다음 — 코드 정리 안 함. 항상 *refactor* 단계.

## Modern variants

### Property-based testing

```python
@given(st.integers(), st.integers())
def test_plus_commutative(a, b):
    assert plus(a, b) == plus(b, a)
```

*수많은 예제 자동 생성* — triangulate의 *극단*.

### Parameterize

```python
@pytest.mark.parametrize("a,b,expected", [
    (2, 3, 5),
    (3, 4, 7),
    (-1, 1, 0),
    (0, 0, 0),
])
def test_plus(a, b, expected):
    assert plus(a, b) == expected
```

데이터 *테이블*로 다양한 예제.

### Example-driven specification (BDD)

```gherkin
Examples:
  | a | b | result |
  | 2 | 3 | 5      |
  | 3 | 4 | 7      |
```

비기술자와도 공유.

### "Move from concrete to abstract"

triangulate는 *generalize* 사이클 — concrete code → 발견된 abstraction.

## GPS 삼각측량 비유

```text
Test 1: plus(2, 3) == 5
  → 위치 후보 무한 (return 5, return a+b, return a*b 등 a=2,b=3에서 5 되는 모든 함수)

Test 2: plus(3, 4) == 7
  → 위치 후보 좁아짐 → return a+b가 가장 단순한 적합
```

두 신호로 *고유한 점* 특정.

## 도구 / IDE

| 도구 | 기능 |
| --- | --- |
| pytest.mark.parametrize | 다중 예제 |
| Hypothesis | property-based |
| Cucumber/SpecFlow | scenario examples |
| QuickCheck (Haskell) | property-based 원조 |

## 성능 고려

여러 예제 추가 → test 수 ↑. 하지만 각 test는 *trivial 속도*. 무관.

## 관련 패턴

- [Pattern 23: Fake It](/blog/programming/engineering/tdd-patterns/pattern23-fake-it) — Triangulate 전 단계
- [Pattern 25: Obvious Implementation](/blog/programming/engineering/tdd-patterns/pattern25-obvious-implementation) — Triangulate 건너뛰기
- [Pattern 6: Test Data](/blog/programming/engineering/tdd-patterns/pattern06-test-data) — 예제 선택
- [Pattern 7: Evident Data](/blog/programming/engineering/tdd-patterns/pattern07-evident-data) — 의도 드러내기
