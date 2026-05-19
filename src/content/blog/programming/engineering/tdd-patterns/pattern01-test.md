---
title: "Pattern 1: Test"
date: 2026-05-10T01:00:00
description: "자동화된 테스트가 TDD의 원자 — 두려움을 자신감으로."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 1
tags: [tdd, beck, test, automation]
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> 자동화된 테스트는 TDD의 원자(atom)다. 수동 검증을 자동화된 자기 검증으로 바꾸면 코드 변경의 두려움이 자신감으로 변한다.

## 동기

프로그래머는 코드를 바꿀 때 두렵다 — "이걸 고치면 저쪽이 깨지지 않을까?" 두려움은 변경을 회피하게 만들고, 회피는 코드를 썩게 만든다. Beck은 이 악순환을 끊는 도구로 **자동화된 테스트**를 제안한다.

자동화된 테스트가 주는 것:

- **즉각적 피드백**: 코드가 맞는지 틀렸는지 1초 안에.
- **회귀 방지**: 과거에 작동하던 코드가 여전히 작동하는지.
- **문서화**: 테스트 코드 자체가 사용 예제.
- **설계 도구**: 테스트하기 어려운 코드는 설계가 나쁜 코드.
- **심리적 안전망**: 두려움 → 자신감 → 적극적 리팩터링.

수동 테스트의 문제:

- 반복마다 비용 발생.
- 사람이 지치면 생략됨.
- 결과 해석이 주관적.

### 무엇이 테스트인가

Beck의 정의: **자동화된 자기 검증** (automated self-verification).

```python
# 이건 테스트가 아니다 (수동 검증)
print(add(2, 3))   # 5가 나오면 맞는 거겠지...

# 이건 테스트다 (자동 검증)
def test_add():
    assert add(2, 3) == 5
```

테스트는 예상(expected)과 실제(actual)를 비교하고, 다르면 실패를 알린다. 사람이 출력 보고 판단할 필요 없다.

### 테스트의 세 역할

1. **Specification**: 코드가 무엇을 해야 하는지.
2. **Documentation**: 코드를 어떻게 쓰는지 예제.
3. **Regression Detection**: 과거 동작이 유지되는지.

세 역할이 하나의 산출물(테스트 코드)에서 나온다. 별도 문서를 작성·유지할 필요가 줄어든다.

### 테스트와 신뢰

Beck의 핵심 통찰: **Test = Trust**.

- 테스트 없음 → "이거 고쳐도 될까?" → 두려움 → 회피 → 기술 부채 누적.
- 테스트 있음 → "테스트 통과하면 OK" → 자신감 → 적극적 리팩터링 → 품질 유지.

## 절차

1. **검증할 동작 식별** — 함수가 어떤 입력에 어떤 출력을 내야 하는가.
2. **test framework 선택** — pytest, JUnit, Mocha, RSpec 등.
3. **테스트 함수 작성** — `test_X` 또는 `it("does Y")` 명명.
4. **assertion 추가** — expected vs actual.
5. **실행 + fail** 확인 (red).
6. **production 코드 작성** — 최소 변경으로 통과.
7. **다시 실행 + pass** (green).
8. **리팩터링** (green 유지).

## 예시 1 — 최초의 테스트

```python
# money_test.py
def test_multiplication():
    five = Dollar(5)
    five.times(2)
    assert five.amount == 10
```

이 테스트는 빨간 막대다 — `Dollar` 클래스가 없다. 그러나 무엇을 만들어야 하는지 명확. Beck의 TDD by Example 1장의 출발.

## 예시 2 — 최소 구현으로 통과

```python
# Production
class Dollar:
    def __init__(self, amount): self.amount = amount
    def times(self, multiplier): self.amount *= multiplier

# 다시 테스트 실행 → green
```

가장 단순한 구현. 다른 모든 테스트가 통과한다는 기존 상태 유지 보장.

## 예시 3 — 다양한 언어에서의 동일 패턴

```javascript
// Jest (JavaScript)
test("multiplication", () => {
  const five = new Dollar(5);
  five.times(2);
  expect(five.amount).toBe(10);
});
```

```rust
// Rust
#[test]
fn multiplication() {
    let mut five = Dollar::new(5);
    five.times(2);
    assert_eq!(five.amount, 10);
}
```

```go
// Go
func TestMultiplication(t *testing.T) {
    five := Dollar{5}
    five.Times(2)
    if five.amount != 10 {
        t.Errorf("expected 10, got %d", five.amount)
    }
}
```

언어가 달라도 본질은 같다 — *assert expected == actual*.

## 자주 보는 안티패턴

### 1. Print 기반 검증

```python
def test_foo():
    print(foo())   # ← 사람이 출력 확인
```
이건 테스트가 아님. assertion 없음. 자동 검증 깨짐.

### 2. Assertion 없는 "테스트"

```python
def test_no_crash():
    do_something()   # 단순히 실행만
```
crash 검증만으로는 부족. 결과 검증 필요하다.

### 3. 지나치게 큰 테스트

한 테스트가 수십 개 assertion → 실패 시 어디서 깨졌는지 모호. 작은 단위로 분리.

### 4. Production 코드 안에 검증

```python
def production_function():
    result = compute()
    assert result > 0   # ← production assert 남용
    return result
```
debug용 assert는 OK, test 대용은 안 됨.

### 5. 과도한 mocking

모든 의존을 mock → 테스트가 실제 behavior 검증 못 함. 통합 테스트도 필요하다.

### 6. Snapshot 의존

```javascript
expect(component).toMatchSnapshot();
```
편리하지만 변화 의미를 사람이 판단해야. 명시적 assertion 우선.

## Modern variants

### Property-based testing

```python
# Hypothesis
from hypothesis import given, strategies as st

@given(st.integers(), st.integers())
def test_add_commutative(a, b):
    assert add(a, b) == add(b, a)
```

수많은 입력 자동 생성 — example-based 한계 보완.

### Snapshot testing

```javascript
// Jest
expect(rendered).toMatchSnapshot();
```

UI/직렬화 결과를 파일로 보존. 의도된 변경만 update.

### Mutation testing

```bash
# Pitest, mutmut
mutmut run
```

production 코드를 일부러 mutate하고 테스트가 잡아내는지 측정. 테스트 품질의 메타-측정.

### Approval testing

```python
# approvaltests
verify(complex_output)
```

복잡한 출력을 승인된 baseline과 비교.

### BDD (Behavior-Driven Development)

```gherkin
Feature: Multiplication
  Scenario: Multiplying dollar
    Given a Dollar of 5
    When I multiply by 2
    Then amount should be 10
```

비기술자도 읽을 수 있는 시나리오 표현 — Cucumber, SpecFlow.

## 도구 / IDE

| 언어 | 주요 framework |
| --- | --- |
| Python | pytest, unittest |
| Java | JUnit 5, TestNG |
| C# | xUnit, NUnit, MSTest |
| JavaScript | Jest, Vitest, Mocha |
| TypeScript | 위 + ts-node |
| Ruby | RSpec, Minitest |
| Rust | `#[test]` + cargo test |
| Go | `testing` + testify |
| Swift | XCTest |
| Kotlin | JUnit, Kotest |

| IDE 통합 |
| --- |
| IntelliJ — green/red gutter |
| VS Code — Test Explorer extension |
| Eclipse — JUnit view |
| Vim — vim-test plugin |
| Emacs — projectile-test |

## 성능 고려

- Test execution speed가 iteration 속도. 느린 테스트는 실행 안 됨 또는 분리 (unit vs integration).
- Parallel execution — 격리된 테스트는 병렬화 안전.
- Watch mode로 변경 파일만 실행.
- Mock vs real dependency — 속도와 신뢰성 트레이드오프.

## 관련 패턴

- [Pattern 2: Isolated Test](/blog/programming/engineering/tdd-patterns/pattern02-isolated-test) — 테스트는 서로 독립적이어야
- [Pattern 4: Test First](/blog/programming/engineering/tdd-patterns/pattern04-test-first) — 코드보다 테스트 먼저
- [Pattern 5: Assert First](/blog/programming/engineering/tdd-patterns/pattern05-assert-first) — assertion부터 작성
- [Pattern 27: Assertion](/blog/programming/engineering/tdd-patterns/pattern27-assertion) — 테스트의 핵심 검증 메커니즘
