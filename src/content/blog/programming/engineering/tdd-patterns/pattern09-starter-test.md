---
title: "Pattern 9: Starter Test"
date: 2026-05-10T09:00:00
description: "처음 test — 가장 작고 퇴화된(degenerate) 케이스로 시작."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 9
tags: [tdd, beck, starter-test]
draft: true
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> 새 기능 시작 시 *가장 작고 퇴화된 케이스*를 첫 테스트로. 인프라 검증 + 모멘텀 확보가 목적.

## 동기 (Motivation)

새 기능을 시작하려는데 *어디서부터* 손대야 할지 모름. Test List는 있지만 *첫 테스트*가 막막.

**Starter Test**의 원칙:

- *가장 단순한 케이스*부터.
- 0, null, 빈 입력 같은 *퇴화 케이스 (degenerate case)*.
- *Hello World 수준의 스켈레톤*.
- 빠르게 Green → *모멘텀* 확보.

첫 테스트의 목적은 *기능 구현*이 아니라 *시작하는 것*.

### 신호

- 새 기능 시작 시 *cursor가 멈춤*.
- 첫 시도가 *너무 큼*.
- 인프라가 *제대로 setup됐는지* 모름.
- *5분간 코드 한 줄도 못 씀*.

### Starter Test의 역할

1. **인프라 검증** — test framework, import, class 존재 모두 한 번에.
2. **모멘텀 확보** — Green bar의 *심리적 효과*.
3. **스켈레톤 생성** — production class/method의 *최소 뼈대*.

### 무엇이 "가장 간단한가"

| 타입 | Starter Test |
| --- | --- |
| 숫자 | 0, 1 |
| 문자열 | `""`, `"a"` |
| 리스트 | `[]`, `[x]` |
| 불린 | `True` 단일 |
| 객체 | 기본 생성자 |
| API | health check, 200 응답 |

## 절차 (Mechanics)

1. **Test List 검토**.
2. *퇴화 케이스* 식별 (빈 입력, 0).
3. *trivial assertion* 작성.
4. *최소 production 스켈레톤* — `class Foo: pass`로도 OK.
5. Green 확인.
6. 다음 테스트(*One Step*)로.

## 예시 1 — Collection 기능

```python
# Starter: 빈 컬렉션
def test_empty_list_has_zero_sum():
    assert sum_all([]) == 0

# Step 2: 원소 하나
def test_single_element():
    assert sum_all([5]) == 5

# Step 3: 여러 원소
def test_multiple_elements():
    assert sum_all([1, 2, 3]) == 6
```

빈 입력으로 *함수 존재 + 인프라* 검증. 이후 자연스러운 일반화.

## 예시 2 — 파서

```python
# Starter
def test_parse_empty_string():
    assert parse("") == []

# 그 다음
def test_parse_single_word():
    assert parse("hello") == ["hello"]

def test_parse_multiple_words():
    assert parse("hello world") == ["hello", "world"]
```

## 예시 3 — Class existence

```python
# Starter — class와 method가 존재만 검증
def test_calculator_exists():
    calc = Calculator()
    result = calc.add(0, 0)
    assert result == 0

# production 최소
class Calculator:
    def add(self, a, b): return 0
```

다음 테스트가 *일반화*를 끌어낸다 ([Pattern 24: Triangulate](/blog/programming/engineering/tdd-patterns/pattern24-triangulate)).

## 자주 보는 안티패턴

### 1. *Starter로 너무 큼*
첫 테스트가 *5개의 method + 3개의 dependency* — Starter 정신 위배.

### 2. *Starter Test로 끝*
```python
def test_empty(): assert sum_all([]) == 0

class SumAll:
    def sum_all(self, items): return 0   # 이대로 끝?
```
Starter는 *시작*. *One Step Test*로 계속 진전.

### 3. *Test 없는 starter*
"일단 코드 좀 짜고 테스트는 나중에" → Test First 위배.

### 4. *너무 사소함*
```python
def test_truth(): assert True
```
검증할 *production 동작* 없음. starter도 *어떤 동작 검증*이어야.

### 5. *Multiple starter*
한 번에 *5개의 starter test* 작성 → 어디까지 갔는지 모름. *한 번에 하나*.

### 6. *Hello world 그대로*
example code를 *그대로 복사* — *진짜 starter*가 아닌 *demo*. 실제 도메인.

## Modern variants

### Walking skeleton (Cockburn)

end-to-end *최소 동작 시스템*. UI → API → DB까지 *얇은 슬라이스*로 한 번 통과. 이후 *기능 추가*.

### TDD "ping-pong" pair

A가 starter 작성 → B가 통과시킴 → B가 다음 test → A가 통과 — *교대*. starter가 *짧은 ping*.

### Test-driven scaffolding

Yeoman, Rails generator 등이 *starter test*를 *자동 생성* (예: `rails generate scaffold User name email`).

### CI smoke test

deploy 직후 *최소 health check* — production starter test.

## 도구 / IDE

| 도구 | 기능 |
| --- | --- |
| pytest | trivial test 즉시 작성 |
| Jest --init | scaffold |
| 생성기 (Rails, Yeoman) | starter file 자동 |
| Vim/Emacs snippet | trivial test boilerplate |

## 성능 고려

starter test는 *극히 빠름* (trivial). cycle 부담 0.

## 관련 패턴

- [Pattern 8: One Step Test](/blog/programming/engineering/tdd-patterns/pattern08-one-step-test) — 다음 테스트 선택
- [Pattern 3: Test List](/blog/programming/engineering/tdd-patterns/pattern03-test-list) — 전체 테스트 계획
- [Pattern 4: Test First](/blog/programming/engineering/tdd-patterns/pattern04-test-first) — Red-Green-Refactor
- [Pattern 23: Fake It](/blog/programming/engineering/tdd-patterns/pattern23-fake-it) — 최소 production 만들기
- [Pattern 24: Triangulate](/blog/programming/engineering/tdd-patterns/pattern24-triangulate) — 일반화 유도
