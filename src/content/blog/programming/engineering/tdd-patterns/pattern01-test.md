---
title: "Pattern 1: Test"
date: 2026-07-01T01:00:00
description: "자동화된 test가 TDD의 atom."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 1
tags: [tdd, beck, test, automation]
draft: true
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> 자동화된 테스트는 TDD의 원자(atom)다. 수동 검증을 자동화된 자기 검증으로 바꾸면 두려움이 자신감으로 변한다.

## 동기 (Motivation)

프로그래머는 코드를 바꿀 때 두렵다. "이걸 고치면 저쪽이 깨지지 않을까?" 두려움은 변경을 회피하게 만들고, 회피는 코드를 썩게 만든다. Beck은 이 악순환을 끊는 도구로 **자동화된 테스트**를 제안한다.

자동화된 테스트가 주는 것:
- **즉각적 피드백**: 코드가 맞는지 틀렸는지 1초 안에 알 수 있다
- **회귀 방지**: 과거에 작동하던 코드가 여전히 작동하는지 확인
- **문서화**: 테스트 코드 자체가 "이 코드는 이렇게 쓰는 것"을 보여주는 예제
- **설계 도구**: 테스트하기 어려운 코드는 설계가 나쁜 코드

수동 테스트의 문제:
- 반복할 때마다 비용 발생
- 사람이 지치면 생략됨
- 결과 해석이 주관적

## 무엇이 테스트인가

Beck의 정의: **자동화된 자기 검증(automated self-verification)**

```python
# 이것은 테스트가 아니다 (수동 검증)
print(add(2, 3))  # 5가 나오면 맞는 거겠지...

# 이것이 테스트다 (자동 검증)
def test_add():
    assert add(2, 3) == 5
```

테스트는 **예상(expected)**과 **실제(actual)**를 비교하고, 다르면 실패를 알린다. 사람이 출력을 눈으로 보고 판단할 필요가 없다.

## 테스트의 세 역할

1. **Specification**: 코드가 무엇을 해야 하는지 명세
2. **Documentation**: 코드를 어떻게 사용하는지 예제
3. **Regression Detection**: 과거 동작이 유지되는지 검증

세 역할이 하나의 산출물(테스트 코드)에서 나온다. 별도의 문서를 작성하고 유지할 필요가 줄어든다.

## 테스트와 신뢰

Beck의 핵심 통찰: **Test = Trust**

테스트가 없으면:
- "이거 고쳐도 될까?" → 두려움 → 회피
- 코드 변경 최소화 → 기술 부채 누적

테스트가 있으면:
- "테스트 통과하면 괜찮아" → 자신감 → 적극적 리팩터링
- 코드 품질 유지

## 예시: 첫 번째 테스트

```python
# money_test.py
def test_multiplication():
    five = Dollar(5)
    five.times(2)
    assert five.amount == 10
```

이 테스트는 아직 빨간 막대(실패)다. Dollar 클래스가 없으니까. 하지만 **무엇을 만들어야 하는지** 명확해졌다.

## 테스트 작성 시점

TDD에서는 **프로덕션 코드 작성 전에** 테스트를 먼저 쓴다. 이게 [Pattern 4: Test First](/blog/programming/engineering/tdd-patterns/pattern04-test-first)다.

순서:
1. 테스트 작성 (빨간 막대)
2. 테스트 통과시키는 최소 코드 (초록 막대)
3. 리팩터링 (초록 막대 유지)

## 주의

- 테스트도 코드다. 유지보수 비용이 있다
- 너무 많은 테스트는 부담이 될 수 있다
- 테스트가 구현에 너무 결합되면 리팩터링이 어려워진다

## 관련 패턴

- [Pattern 2: Isolated Test](/blog/programming/engineering/tdd-patterns/pattern02-isolated-test) — 테스트는 서로 독립적이어야
- [Pattern 4: Test First](/blog/programming/engineering/tdd-patterns/pattern04-test-first) — 코드보다 테스트 먼저
- [Pattern 27: Assertion](/blog/programming/engineering/tdd-patterns/pattern27-assertion) — 테스트의 핵심 검증 메커니즘
