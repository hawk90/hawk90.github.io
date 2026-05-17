---
title: "Pattern 8: One Step Test"
date: 2026-07-01T08:00:00
description: "다음 test는 *한 걸음만* 더 — 너무 큰 도약 금지."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 8
tags: [tdd, beck, one-step-test, red-bar]
draft: true
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> 테스트 목록에서 다음 테스트를 고를 때, 통과시킬 자신이 있는 가장 작은 테스트를 선택한다.

## 동기 (Motivation)

테스트 목록이 있다:

```text
[ ] 빈 장바구니 총액 = 0
[ ] 상품 1개 추가
[ ] 할인 쿠폰 적용
[ ] 복합 할인 (쿠폰 + 적립금)
[ ] 배송비 계산
```

어떤 순서로 진행해야 할까?

**너무 큰 도약**의 문제:
- 갑자기 "복합 할인"을 구현하려 하면 **막힌다**
- 막히면 **불안**해지고, 불안하면 **포기**하고 싶어진다
- 오래 Red bar(실패) 상태로 있으면 **리듬이 깨진다**

**One Step Test**는 **한 걸음씩** 전진하는 것이다:
- 지금 내가 **통과시킬 수 있는** 가장 작은 테스트
- 성공하면 **자신감** 상승, 다음 한 걸음
- **작은 성공의 연속**이 큰 기능을 만든다

## 도약 크기 조절

Beck은 "step size는 confidence에 비례한다"고 말한다:

| 상황 | 도약 크기 |
|------|----------|
| 익숙한 도메인 | 큰 스텝 OK |
| 새로운 기술 | 작은 스텝 |
| 자신감 높음 | 여러 케이스 한 번에 |
| 자신감 낮음 | 한 케이스씩 |
| 막혔을 때 | 더 작은 스텝으로 |

## 예시: 장바구니 구현

### 너무 큰 도약 (Bad)

```python
# 첫 테스트로 이걸 선택하면?
def test_complex_discount():
    cart = Cart()
    cart.add(Item("A", 1000))
    cart.add(Item("B", 2000))
    cart.apply_coupon("SAVE10")
    cart.use_points(500)
    assert cart.total() == 2200  # 쿠폰 10% + 적립금 500
```

Cart, Item, 쿠폰, 적립금을 한 번에 구현해야 한다. 막힐 가능성 높다.

### 한 걸음씩 (Good)

```python
# Step 1: 가장 간단한 것
def test_empty_cart():
    cart = Cart()
    assert cart.total() == 0

# Step 2: 조금만 더
def test_single_item():
    cart = Cart()
    cart.add(Item("A", 1000))
    assert cart.total() == 1000

# Step 3: 또 한 걸음
def test_two_items():
    cart = Cart()
    cart.add(Item("A", 1000))
    cart.add(Item("B", 2000))
    assert cart.total() == 3000

# Step 4: 이제 할인
def test_percentage_discount():
    cart = Cart()
    cart.add(Item("A", 1000))
    cart.apply_discount(0.10)
    assert cart.total() == 900

# ... 계속
```

각 스텝이 작고 확실하다.

## 막혔을 때

큰 스텝을 시도했다가 막히면?

1. **테스트 취소** (git checkout 또는 삭제)
2. **더 작은 테스트**로 분해
3. 작은 것부터 **다시 시작**

```python
# 막힌 테스트
def test_discount_with_coupon():
    # ... 복잡한 로직, 어떻게 구현하지?
    pass

# 분해
def test_coupon_exists():
    coupon = Coupon("SAVE10", discount=0.10)
    assert coupon.is_valid()

def test_coupon_applies_discount():
    coupon = Coupon("SAVE10", discount=0.10)
    assert coupon.apply(1000) == 900
```

## 신호: 스텝이 너무 큰가?

- Red bar가 **5분 이상** 지속
- **어디서 시작할지** 모르겠음
- **여러 개념**을 동시에 도입해야 함
- **디버깅**이 필요함 (테스트가 왜 실패하는지 분석)

이런 신호가 보이면 **뒤로 물러나서** 더 작은 스텝을 찾는다.

## 정리

- 다음 테스트는 **통과시킬 자신 있는 것** 선택
- 스텝 크기는 **자신감에 비례**
- 막히면 **더 작은 스텝**으로 분해
- 오래 Red bar 상태 = **스텝이 너무 큼**
- **작은 성공의 연속**이 리듬을 만든다

## 관련 패턴

- [Pattern 3: Test List](/blog/programming/engineering/tdd-patterns/pattern03-test-list) — 테스트 목록 관리
- [Pattern 9: Starter Test](/blog/programming/engineering/tdd-patterns/pattern09-starter-test) — 첫 테스트 선택
- [Pattern 4: Test First](/blog/programming/engineering/tdd-patterns/pattern04-test-first) — Red-Green-Refactor 사이클
