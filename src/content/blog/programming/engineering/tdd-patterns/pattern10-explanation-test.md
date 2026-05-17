---
title: "Pattern 10: Explanation Test"
date: 2026-07-01T10:00:00
description: "TDD 설명할 때 — 함께 test를 쓰면서 한다."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 10
tags: [tdd, beck, explanation-test, teaching]
draft: true
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> TDD를 다른 사람에게 가르치거나 설명할 때, 테스트를 함께 작성하면서 시연한다.

## 동기 (Motivation)

동료에게 TDD를 설명하려고 한다. 어떻게 해야 효과적일까?

**말로 설명**: "먼저 테스트를 쓰고, 실패하는 걸 확인하고, 코드를 작성해서 통과시키고..."

**시연으로 설명**: "자, 지금 이 기능을 만들어야 해. 먼저 테스트를 쓸게. `assert add(2, 3) == 5`. 실행해 보자. 실패하지? 이제 함수를 만들어보자..."

후자가 **훨씬 강력하다**.

## 왜 시연이 효과적인가

### 1. Learning by Doing

```python
# 말로 설명
"테스트를 먼저 쓰면 API를 호출자 입장에서 설계하게 돼요"

# 시연
"자, Calculator 클래스를 만들 거야.
어떻게 쓰고 싶어?
calc = Calculator()
result = calc.add(2, 3)
이렇게 쓰고 싶지 않아?
그럼 이걸 테스트로 적어보자."
```

### 2. 즉각적 피드백

```bash
$ pytest test_calc.py
FAILED - NameError: name 'Calculator' is not defined

"보이지? 아직 Calculator가 없어서 실패해.
이게 Red 상태야. 이제 통과시켜보자."
```

### 3. 질문과 대화 유도

```
동료: "근데 왜 5를 하드코딩해서 통과시켜요?"
나: "좋은 질문이야! 지금은 이게 가장 간단한 방법이거든.
     다음 테스트가 이걸 일반화하도록 밀어붙일 거야."
```

## Explanation Test 적용 상황

### 1. 페어 프로그래밍

```
A: "이 버그 어떻게 고칠까?"
B: "먼저 버그를 재현하는 테스트를 써보자."
A: "그래, 이렇게?"
   def test_bug_123():
       result = process(edge_case_input)
       assert result == expected
B: "실행해보자. 실패하지? 이게 버그야.
    이제 고쳐보자."
```

### 2. 코드 리뷰

```
"이 PR에서 어떤 케이스를 테스트했는지 보여줄게.
test_normal_case — 일반 흐름
test_edge_case — 경계 조건
test_error_case — 에러 처리
각각 뭘 검증하는지 테스트 코드 보면서 설명할게."
```

### 3. 새 팀원 온보딩

```
"우리 팀은 TDD로 작업해.
간단한 기능 하나를 같이 만들어 볼까?
주문 취소 기능. 테스트 먼저 써보자."
```

### 4. 몹 프로그래밍

여러 명이 함께 코드를 작성할 때, 테스트를 화면에 띄워놓고 진행:

```
드라이버: "다음 테스트는 뭘 써야 할까?"
네비게이터1: "쿠폰 적용 케이스"
네비게이터2: "그 전에 쿠폰 없는 경우부터"
드라이버: "좋아, 쿠폰 없으면 할인 없음. 이렇게 쓸게..."
```

## 효과적인 시연 팁

### 1. 작은 예제로 시작

```python
# Good: 5분 안에 끝나는 예제
def test_add():
    assert add(2, 3) == 5

# Bad: 30분 걸리는 복잡한 예제
def test_order_workflow():
    # 사용자 생성, 상품 추가, 결제, 배송, 환불...
```

### 2. 실패를 보여주기

```
"일부러 assertion을 틀리게 써볼게."
assert add(2, 3) == 6  # 일부러 틀림
"봐, 실패 메시지가 어떻게 나오는지 보여.
expected: 6, actual: 5
이게 디버깅을 쉽게 해줘."
```

### 3. 리팩터링 단계 보여주기

```
"테스트 통과했어. 이제 코드를 정리할 수 있어.
왜냐하면 테스트가 있으니까 안전하거든.
이 중복을 제거해볼까?
테스트 돌려보자. 여전히 통과하지?"
```

## 정리

- TDD를 **시연**으로 가르친다
- **함께 테스트를 작성**하며 대화한다
- **Learning by doing**이 말보다 강력하다
- 페어 프로그래밍, 몹 프로그래밍에 자연스럽게 통합
- 작은 예제, 실패 시연, 리팩터링 단계를 포함

## 관련 패턴

- [Pattern 1: Test](/blog/programming/engineering/tdd-patterns/pattern01-test) — 테스트의 기본
- [Pattern 4: Test First](/blog/programming/engineering/tdd-patterns/pattern04-test-first) — 테스트 먼저 쓰기
- [Pattern 9: Starter Test](/blog/programming/engineering/tdd-patterns/pattern09-starter-test) — 시연 시작점으로 적합
