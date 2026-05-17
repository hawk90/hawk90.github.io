---
title: "Pattern 15: Do Over"
date: 2026-07-01T15:00:00
description: "막혔을 때 — 처음부터 다시."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 15
tags: [tdd, beck, do-over, restart]
draft: true
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> 너무 깊이 막혔을 때, 지금 작업을 버리고 처음부터 다시 시작한다. 첫 시도에서 배운 것이 두 번째 시도의 기반이 된다.

## 동기 (Motivation)

30분째 같은 코드와 씨름 중이다. 테스트는 통과하지 않고, 코드는 점점 복잡해지고, 무엇이 문제인지도 불분명하다.

이때 두 가지 선택지가 있다:
1. **계속 파고든다** — "여기까지 왔는데 포기할 순 없어"
2. **처음부터 다시** — "이 접근법이 잘못된 것 같아"

**Do Over**는 두 번째 선택이다. 지금 코드를 버리고 깨끗한 상태에서 다시 시작한다.

## Sunk Cost Fallacy

"이미 30분 투자했는데 버릴 수 없어" — 이것이 **Sunk Cost Fallacy**(매몰 비용 오류).

진실:
- 30분은 **이미 지나간 시간**
- 잘못된 방향으로 30분 더 가면 **60분 낭비**
- 처음부터 다시 하면 **15분에 끝날 수도**

투자한 시간은 의사결정에 영향을 주면 안 된다. 중요한 건 **앞으로** 어떻게 할지다.

## Do Over 실행

### Git 활용

```bash
# 현재 변경사항 확인
git status

# 모든 변경사항 버리기
git checkout .

# 또는 stash로 보관 (혹시 나중에 참고할지도)
git stash save "할인 로직 첫 번째 시도 — 실패"

# 깨끗한 상태에서 다시 시작
git status  # 클린!
```

### IDE 활용

- **Undo to checkpoint**: 저장점으로 돌아가기
- **Local history**: 과거 버전 탐색
- **Diff**: 무엇을 바꿨는지 확인 후 판단

## 두 번째 시도는 왜 다른가

첫 시도에서 배운 것들:
- **이 접근법은 안 된다**는 것
- 문제에 대한 **더 깊은 이해**
- **숨겨진 제약**의 발견
- **더 단순한 해결책**의 힌트

두 번째 시도는 이 학습을 바탕으로 한다.

```text
첫 시도: "A → B → C 순서로 구현해야지"
  → 막힘
  → 학습: "B가 A에 의존하는구나"

두 번째 시도: "B 먼저 하고, A를 그 위에 얹자"
  → 성공
```

## Do Over 신호

- Red bar가 **10분 이상** 지속
- 코드가 **점점 복잡해짐**
- **무엇이 문제인지** 설명할 수 없음
- 테스트를 통과시키려고 **핵 추가**
- "이건 나중에 정리하면 되지" 같은 생각

이런 신호가 보이면 멈추고 생각한다: "처음부터 다시 하면 더 빠를까?"

## Do Over vs 계속하기

| Do Over | 계속하기 |
|---------|---------|
| 방향이 근본적으로 잘못됨 | 작은 문제만 남음 |
| 코드가 점점 복잡해짐 | 코드가 수렴 중 |
| 무엇이 문제인지 모름 | 문제가 명확함 |
| 10분 이상 막힘 | 곧 해결될 것 같음 |

## 예시

```python
# 첫 시도 (30분 후)
class ComplexDiscountCalculator:
    def __init__(self, user, cart, coupons, promotions, membership):
        # 너무 많은 의존성...
        self.user = user
        self.cart = cart
        self.coupons = coupons
        # ... 20줄 더

    def calculate(self):
        # 복잡한 로직
        # 테스트 실패 중
        ...

# Do Over 결정!
# git checkout .

# 두 번째 시도 (15분 후)
def calculate_discount(price, discount_rate):
    """단순하게 시작"""
    return price * (1 - discount_rate)

# 테스트 통과, 여기서 확장
```

## 정리

- 깊이 막혔을 때 **처음부터 다시**
- **Sunk cost fallacy** 회피
- 첫 시도의 **학습이 가치**
- git stash/checkout으로 **깨끗하게 리셋**
- 두 번째 시도는 **더 빠르고 정확**

## 관련 패턴

- [Pattern 14: Break](/blog/programming/engineering/tdd-patterns/pattern14-break) — 휴식 후 다시
- [Pattern 16: Child Test](/blog/programming/engineering/tdd-patterns/pattern16-child-test) — 더 작은 테스트로 분해
- [Pattern 8: One Step Test](/blog/programming/engineering/tdd-patterns/pattern08-one-step-test) — 작은 스텝으로 막힘 방지
