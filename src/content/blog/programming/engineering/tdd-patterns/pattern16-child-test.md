---
title: "Pattern 16: Child Test"
date: 2026-07-01T16:00:00
description: "큰 test가 막히면 — 더 작은 test로."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 16
tags: [tdd, beck, child-test, decomposition]
draft: true
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> 현재 테스트가 너무 크면, 그 일부를 통과시키는 더 작은 테스트(Child Test)를 먼저 작성한다.

## 동기 (Motivation)

테스트를 작성했는데, 통과시키려면 한 번에 너무 많은 코드를 작성해야 한다. 막힌다.

**Child Test**는 이 상황을 해결한다:
1. 현재 큰 테스트를 **잠시 보류** (주석 또는 @skip)
2. 큰 테스트의 **일부를 검증하는 작은 테스트** 작성
3. 작은 테스트 **통과**
4. 큰 테스트로 **돌아가기**

스텝 크기를 **동적으로 조절**하는 기법이다.

## 예시: 할인 계산

### 막힌 테스트 (Parent)

```python
def test_complex_discount():
    """여러 할인 조건이 복합 적용"""
    cart = Cart()
    cart.add(Item("A", 10000))
    cart.add(Item("B", 5000))
    cart.apply_coupon("SAVE10")      # 쿠폰 10%
    cart.apply_points(1000)          # 적립금 1000원
    cart.apply_membership("VIP")     # VIP 추가 5%

    # 계산: (15000 * 0.9 - 1000) * 0.95 = 11875
    assert cart.total() == 11875
```

한 번에 세 가지 할인을 구현해야 한다. 막힌다.

### Child Test들

```python
# Child 1: 쿠폰만
def test_coupon_discount():
    cart = Cart()
    cart.add(Item("A", 10000))
    cart.apply_coupon("SAVE10")

    assert cart.total() == 9000  # 10000 * 0.9

# Child 2: 적립금만
def test_points_discount():
    cart = Cart()
    cart.add(Item("A", 10000))
    cart.apply_points(1000)

    assert cart.total() == 9000  # 10000 - 1000

# Child 3: 멤버십만
def test_membership_discount():
    cart = Cart()
    cart.add(Item("A", 10000))
    cart.apply_membership("VIP")

    assert cart.total() == 9500  # 10000 * 0.95
```

각각 통과시킨 후, **Parent로 돌아간다**.

## 워크플로우

```text
1. Parent Test 작성 → 막힘
2. Parent Test @skip 또는 주석 처리
3. Child Test 1 작성 → Green
4. Child Test 2 작성 → Green
5. Child Test 3 작성 → Green
6. Parent Test 다시 활성화 → Green (또는 약간의 통합 코드)
```

```python
# Parent Test 보류
@pytest.mark.skip(reason="child tests 먼저")
def test_complex_discount():
    ...

# Child Tests 작성 및 통과

# Parent Test 다시 활성화
# @pytest.mark.skip 제거
def test_complex_discount():
    ...  # 이제 통과!
```

## Child Test가 Parent를 대체할 수도

때로는 Child Test들이 **충분히 커버**해서 Parent가 불필요해진다:

```python
# 이 세 테스트가 있으면
def test_coupon_discount(): ...
def test_points_discount(): ...
def test_membership_discount(): ...
def test_combined_coupon_and_points(): ...
def test_combined_all_three(): ...  # 단순 통합 확인

# Parent의 복잡한 테스트는 삭제해도 됨
```

## Child Test 네이밍

Parent와 관련성을 보여주는 이름:

```python
# Parent
def test_order_total():
    ...

# Children
def test_order_total_empty_cart():
    ...

def test_order_total_single_item():
    ...

def test_order_total_with_discount():
    ...
```

## 정리

- 큰 테스트가 막히면 **작은 테스트로 분해**
- Parent를 **보류**하고 Child부터 작성
- Child 통과 후 **Parent로 돌아감**
- **스텝 크기 동적 조절**의 가장 흔한 도구
- Child가 Parent를 **대체**할 수도 있음

## 관련 패턴

- [Pattern 8: One Step Test](/blog/programming/engineering/tdd-patterns/pattern08-one-step-test) — 작은 스텝 선택
- [Pattern 9: Starter Test](/blog/programming/engineering/tdd-patterns/pattern09-starter-test) — 가장 작은 테스트로 시작
- [Pattern 15: Do Over](/blog/programming/engineering/tdd-patterns/pattern15-do-over) — 처음부터 다시
