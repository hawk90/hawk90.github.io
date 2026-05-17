---
title: "Pattern 3: Test List"
date: 2026-07-01T03:00:00
description: "구현 시작 전에 — test 목록부터."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 3
tags: [tdd, beck, test-list, planning]
draft: true
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> 코드를 작성하기 전에 "어떤 테스트를 작성해야 하는가?"를 목록으로 만들어라.

## 동기 (Motivation)

머릿속에 모든 테스트 케이스를 담고 있으면 어떻게 될까? 코드를 작성하다가 "아, 이 경우도 테스트해야 하는데..."라는 생각이 떠오른다. 그 순간 작업이 중단된다. 집중이 깨진다.

**테스트 목록(Test List)**은 이 문제를 해결한다:
- 머릿속 아이디어를 **외부에 기록**
- 현재 작업에 **집중** 가능
- **진행 상황**을 눈으로 확인
- 중단 후 **복귀가 쉬움**

Beck은 이것을 "작업 메모리의 외부화"라고 부른다. 뇌는 테스트 목록을 기억하는 데 쓰지 말고, 코드 작성에 쓰자.

## 테스트 목록 작성법

### 1. Brain Dump

기능을 구현하기 전에, 떠오르는 모든 테스트 케이스를 적는다:

```text
[ ] 빈 장바구니의 총액은 0
[ ] 상품 1개 추가 후 총액
[ ] 같은 상품 2개 추가 후 총액
[ ] 다른 상품 2개 추가 후 총액
[ ] 할인 쿠폰 적용
[ ] 존재하지 않는 상품 추가 시 에러
[ ] 재고보다 많이 추가 시 에러
```

완벽할 필요 없다. 떠오르는 대로 적는다.

### 2. 진행하면서 업데이트

```text
[x] 빈 장바구니의 총액은 0          ← 완료
[x] 상품 1개 추가 후 총액            ← 완료
[ ] 같은 상품 2개 추가 후 총액       ← 현재 작업 중
[ ] 다른 상품 2개 추가 후 총액
[ ] 할인 쿠폰 적용
[ ] 존재하지 않는 상품 추가 시 에러
[ ] 재고보다 많이 추가 시 에러
[ ] 음수 수량 추가 시 에러           ← 새로 발견!
```

작업 중 새로운 케이스가 떠오르면 목록에 추가한다. 지금 작업을 중단하지 않고.

## 테스트 목록의 효과

### 1. 북마크 효과

회의에 불려가거나 점심을 먹고 돌아와도, 목록을 보면 어디까지 했는지 바로 알 수 있다.

### 2. 범위 제한

목록에 없는 테스트는 "지금 할 일이 아니다"라고 스스로에게 말할 수 있다. 범위 확장(scope creep)을 막는다.

### 3. 진행 시각화

```text
완료: 5/10 테스트
━━━━━━━━━━━━━━━━━━━━ 50%
```

목록이 줄어드는 것을 보면 동기부여가 된다.

## 어디에 작성할까

```python
# 코드 주석으로
# TODO:
# - test empty cart
# - test single item
# - test discount

# 또는 테스트 파일 상단에
"""
Test List:
[x] empty cart returns 0
[ ] single item adds to total
[ ] discount reduces total
"""

def test_empty_cart():
    cart = Cart()
    assert cart.total() == 0
```

IDE의 TODO 추적 기능, 별도 메모장, 화이트보드 — 어디든 좋다. 핵심은 **눈에 보이는 곳**에 두는 것.

## 목록 정리 전략

테스트 목록이 너무 길어지면 부담이 된다. 전략:

| 상황 | 전략 |
|------|------|
| 20개 이상 | 카테고리로 그룹화 |
| 우선순위 불명확 | 가장 간단한 것 먼저 |
| 막막할 때 | 가장 확실한 것 먼저 |
| 불안할 때 | 가장 위험한 것 먼저 |

## 예시: Money 클래스

Beck의 책 예제를 따라가 보자:

```text
Test List — Money
[ ] $5 + 10 CHF = $10 (환율 2:1)
[ ] $5 * 2 = $10
[x] amount를 private으로
[ ] Dollar 부작용 제거
[ ] Money 반올림
[ ] equals()
[ ] hashCode()
[ ] null과 비교
[ ] 다른 객체와 비교
```

작업하면서 `[x]`로 체크하고, 새로운 생각이 나면 추가한다.

## 정리

- 코드 작성 전에 **테스트 목록**을 만든다
- 목록은 **brain dump** — 완벽할 필요 없다
- 완료하면 **체크**, 새로 발견하면 **추가**
- 목록은 **작업 메모리의 외부화**
- **북마크 효과**로 중단 후 복귀가 쉬움
- **범위 제한**으로 scope creep 방지

## 관련 패턴

- [Pattern 4: Test First](/blog/programming/engineering/tdd-patterns/pattern04-test-first) — 목록에서 하나 골라 테스트 먼저
- [Pattern 8: One Step Test](/blog/programming/engineering/tdd-patterns/pattern08-one-step-test) — 목록에서 다음 테스트 선택 기준
- [Pattern 9: Starter Test](/blog/programming/engineering/tdd-patterns/pattern09-starter-test) — 첫 번째 테스트 선택
