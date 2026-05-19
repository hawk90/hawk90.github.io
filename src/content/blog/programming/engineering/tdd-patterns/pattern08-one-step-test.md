---
title: "Pattern 8: One Step Test"
date: 2026-05-10T08:00:00
description: "다음 test는 한 걸음만 더 — 통과시킬 자신 있는 가장 작은 테스트."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 8
tags: [tdd, beck, one-step-test, red-bar]
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> 테스트 목록에서 다음 테스트를 고를 때 통과시킬 자신 있는 가장 작은 테스트를 선택. Red bar가 짧을수록 리듬이 유지된다.

## 동기

너무 큰 도약의 문제:

- 갑자기 복잡한 기능을 구현하려 하면 막힘.
- 막히면 불안 → 포기 충동.
- Red bar가 오래 지속 → 리듬 깨짐.

**One Step Test**는 한 걸음씩 전진. 지금 통과시킬 수 있는 가장 작은 테스트. 성공의 연쇄가 큰 기능을 만든다.

Beck의 원칙: "step size is proportional to confidence".

| 상황 | 도약 크기 |
| --- | --- |
| 익숙한 도메인 | 큰 스텝 OK |
| 새 기술 | 작은 스텝 |
| 자신감 높음 | 여러 케이스 한 번에 |
| 자신감 낮음 | 한 케이스씩 |
| 막혔을 때 | 더 작은 스텝으로 |

### 신호

- Red bar가 5분 이상.
- 어디서 시작할지 모름.
- 여러 개념을 동시에 도입해야 함.
- 디버깅 필요 (왜 실패하는지 분석).

## 절차

1. **Test List 확인**.
2. 자신 있는 가장 작은 테스트 선택.
3. Red-Green-Refactor 사이클 실행.
4. 막히면 현재 테스트 취소 (git checkout) → 더 작은 스텝으로 분해.
5. 사이클이 순조로우면 자신감 ↑ → 다음 스텝 더 크게.
6. 사이클이 어려우면 자신감 ↓ → 더 작은 스텝.

## 예시 1 — 장바구니 (작은 스텝)

```python
# Step 1: 가장 단순
def test_empty_cart():
    cart = Cart()
    assert cart.total() == 0

# Step 2: 조금 더
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

# Step 4: 이제 할인 도입
def test_percentage_discount():
    cart = Cart()
    cart.add(Item("A", 1000))
    cart.apply_discount(0.10)
    assert cart.total() == 900
```

각 스텝이 trivial green — 자신감 누적.

## 예시 2 — 너무 큰 스텝 (안티)

```python
# 첫 테스트로 이것을 선택하면?
def test_complex_discount():
    cart = Cart()
    cart.add(Item("A", 1000))
    cart.add(Item("B", 2000))
    cart.apply_coupon("SAVE10")
    cart.use_points(500)
    assert cart.total() == 2200
```

Cart + Item + Coupon + Points를 동시에 구현해야. 막힐 확률 큼.

## 예시 3 — 막힌 후 분해

큰 테스트에서 막힘:

```python
# 막힌 테스트
def test_discount_with_coupon():
    # ... 복잡한 로직, 어떻게 구현하지?
    pass
```

분해:

```python
# Step 1: 쿠폰 존재
def test_coupon_exists():
    coupon = Coupon("SAVE10", discount=0.10)
    assert coupon.is_valid()

# Step 2: 쿠폰 할인 적용
def test_coupon_applies_discount():
    coupon = Coupon("SAVE10", discount=0.10)
    assert coupon.apply(1000) == 900

# Step 3: 쿠폰 to cart
def test_cart_apply_coupon():
    cart = Cart(); cart.add(Item("A", 1000))
    cart.apply_coupon(Coupon("SAVE10", 0.10))
    assert cart.total() == 900

# 이제 복합도 자연스러움
```

작은 성공의 연쇄 → 큰 기능.

## 자주 보는 안티패턴

### 1. 너무 큰 스텝 고집

자존심으로 큰 스텝 시도 → 막힘 → 시간 낭비. 미리 분해 결정.

### 2. 너무 작은 스텝

모든 테스트가 trivial → 과도한 분해 + 진행 느림. 자신감 있는 만큼 큰 스텝.

### 3. Red bar 시간 무시

"조금만 더 하면 되겠지" → 30분 Red. 5분 룰.

### 4. 분해 안 함

막혀도 원래 테스트 고집. git checkout으로 취소 + 분해.

### 5. Step size를 fixed

항상 같은 크기 → 상황 적응 못 함. 동적 조정.

### 6. Pair programming 무시

혼자 막히면 동료에게 — pair가 fresh perspective 제공.

## Modern variants

### TDD with timer

```bash
# 5분 timer
timer 5m && echo "Red bar too long — break it down"
```

물리 timer로 Red bar 5분 제한.

### Mob programming

여러 명이 한 컴퓨터에서 작업 — 작은 스텝 자연. 한 사람의 대담함이 그룹의 신중함으로 균형.

### CI/CD short feedback

push마다 수십 초 안에 결과 — 작은 스텝에 인센티브.

### Bigger steps in TDD (Beck 후기)

Beck은 후기에 "the smallest test"보다 "the most valuable test"도 강조 — 자신감이 있으면 더 큰 스텝 OK.

```python
# 익숙한 도메인 — 큰 스텝
def test_full_user_creation():
    user = User.create(name="Alice", email="a@b.c", role="admin")
    assert user.is_admin()
    assert user.email == "a@b.c"
```

## 도구 / IDE

| 도구 | 기능 |
| --- | --- |
| Watch mode (pytest-watch, jest --watch) | 즉각 피드백 |
| Wallaby.js | 라이브 test 결과 |
| NCrunch (.NET) | 같음 |
| git stash / branch | 막힌 시도 취소 |
| Timer | Pomodoro/물리 timer로 시간 제약 |

## 성능 고려

작은 스텝 → 작은 테스트 → 빠른 실행. 큰 스텝 → 큰 테스트 → 느림. 빠른 cycle을 위해 unit 우선, integration은 별도.

## 관련 패턴

- [Pattern 3: Test List](/blog/programming/engineering/tdd-patterns/pattern03-test-list) — 다음 테스트 후보들
- [Pattern 9: Starter Test](/blog/programming/engineering/tdd-patterns/pattern09-starter-test) — 첫 테스트 선택
- [Pattern 4: Test First](/blog/programming/engineering/tdd-patterns/pattern04-test-first) — Red-Green-Refactor 사이클
- [Pattern 14: Break](/blog/programming/engineering/tdd-patterns/pattern14-break) — 막혔을 때 잠시 쉬기
