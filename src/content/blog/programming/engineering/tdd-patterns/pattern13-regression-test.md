---
title: "Pattern 13: Regression Test"
date: 2026-05-10T13:00:00
description: "Bug 발견 시 — 그 bug를 잡는 test 먼저 작성, 영구적인 회귀 방지망."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 13
tags: [tdd, beck, regression-test, bug]
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> 버그 리포트 받으면 그 버그를 재현하는 테스트 먼저. 테스트가 fail하는 동안 버그 수정 → 통과하면 영구 안전망.

## 동기

버그가 들어왔다: "할인 쿠폰이 적용 안 돼요". 디버거 켜고 코드 뒤지고 싶은 유혹. TDD는 다른 순서:

1. 버그 재현 테스트 작성.
2. fail 확인 (Red).
3. 버그 수정.
4. 통과 확인 (Green).

장점:

- 버그가 정말 고쳐졌는지 확실.
- 같은 버그 재발 시 자동 탐지.
- 시스템 이해 갱신.

### 신호

- 같은 버그가 반복 발생.
- 한 곳 fix → 다른 곳 깨짐.
- 디버깅에 많은 시간.
- 버그 원인이 production에서 발견.

### 언제 적용하는가

- 모든 버그 fix. 예외 거의 없음.
- production 인시던트 후.
- 코드 리뷰에서 bug 발견 시.

## 절차

1. **버그 리포트 분석** — 입력·기대 출력·실제 출력.
2. **재현 테스트 작성** — bug 번호/설명 포함 이름.
3. **실행 → Red** 확인. red 안 보이면 재현 부정확.
4. **production 수정**.
5. **실행 → Green** 확인.
6. **기타 케이스도 추가** (보통 같이 발견됨).
7. **commit + bug tracker 링크**.

## 예시 1 — 쿠폰 미적용 버그

### 버그 리포트

> "할인 쿠폰 SAVE10을 적용했는데, 장바구니 총액이 그대로예요."

### Step 1: 재현

```python
def test_bug_123_coupon_applies_discount():
    """버그 #123: 할인 쿠폰이 장바구니에 적용되지 않음"""
    cart = Cart()
    cart.add(Item("A", 1000))
    cart.apply_coupon("SAVE10")   # 10% 할인
    assert cart.total() == 900
```

### Step 2: Red

```text
FAILED test_bug_123_coupon_applies_discount
AssertionError: 1000 != 900
```

버그 재현 확인.

### Step 3: Fix

```python
def apply_coupon(self, code):
    coupon = self.coupon_service.get(code)
    if coupon:
        self.discount = coupon.discount   # ← 빠져 있었음
```

### Step 4: Green

```text
PASSED test_bug_123_coupon_applies_discount
```

이제 영구 안전망. 같은 버그 재발 시 즉시.

## 예시 2 — Edge case 발견

```python
# 처음 발견: null user
def test_bug_101_null_user_crashes():
    """버그 #101: 사용자가 null일 때 크래시"""
    cart = Cart(user=None)
    # crash 대신 graceful behavior
    assert cart.total() == 0

# 함께 발견: 음수 quantity
def test_bug_102_negative_quantity():
    """버그 #102: 음수 수량 처리 오류"""
    cart = Cart()
    with pytest.raises(ValueError):
        cart.add(Item("A", 1000, quantity=-1))
```

한 버그 fix 중 관련 케이스 추가 발견 — Test List에 적고 함께.

## 예시 3 — Production 버그 분석

```python
# Production log에서 stack trace
# NullPointerException at Cart.apply_discount line 42

def test_bug_201_discount_when_subtotal_zero():
    """버그 #201: subtotal 0일 때 discount 계산 NPE"""
    cart = Cart()   # 빈 cart
    cart.apply_discount(0.10)
    assert cart.total() == 0   # 0 * 0.9 = 0, 정상
```

production log → 재현 시나리오를 테스트 코드로. 영구 방지.

## 자주 보는 안티패턴

### 1. 테스트 없이 직접 fix

"빠르게 고치자" → fix는 했지만 왜 발생했는지 모름, 재발 가능하다.

### 2. Fail 안 확인하고 fix

Red 단계 생략 → 테스트가 항상 통과하면서 fix와 무관 가능하다.

### 3. 너무 specific

```python
def test_bug_123():
    assert cart.total() == 900   # 1000 - 100 ?
```
의도 불명. evident data로.

### 4. Bug number만 이름

```python
def test_bug_123(): ...
```
이름에서 무엇인지 안 보임. 설명 포함.

### 5. Production fix → test 생략

hotfix 후 test 까먹음. 절차에 test 포함.

### 6. 너무 많은 mock

mock으로 재현했지만 실제 production에선 다른 경로 → 새로운 인시던트. 실제 시나리오 우선.

## Modern variants

### Issue tracker integration

PR 메시지에 issue link → test가 해당 issue resolve 표시.

```python
def test_bug_GH123_xxx():
    """https://github.com/org/repo/issues/123"""
```

### Bisect

`git bisect`로 어느 commit에서 발생했는지 자동 탐색.

```bash
git bisect start
git bisect bad HEAD
git bisect good v1.0
# Each step runs test → automatic locate
git bisect run pytest test_bug_123
```

### Chaos engineering

production-like fault injection으로 알려지지 않은 버그 발견.

### Property-based regression

```python
@given(st.integers())
def test_no_negative_total(n):
    cart = Cart(); cart.add(Item("A", n))
    assert cart.total() >= 0   # 발견된 invariant
```

한 버그 발견 후 property 추출 → 유사 케이스 자동 발견.

### Snapshot/golden testing

production output을 baseline에 저장 → 변경 시 diff 검토.

### Differential testing

두 implementation 비교 (old vs new, language A vs B) → behavior 차이 발견.

## 도구 / IDE

| 도구 | 기능 |
| --- | --- |
| pytest --lf | 마지막 실패 test만 재실행 |
| git bisect | regression introduction commit 찾기 |
| Sentry / Bugsnag | production error → test 재현 |
| Hypothesis | property-based regression |
| mutmut, pitest | mutation으로 test 품질 검증 |

## 성능 고려

regression test 누적 → test suite 시간 증가. 분리:

- Fast unit test (매 push).
- Slow integration (PR 또는 nightly).
- E2E (deploy 전).

## Regression test의 누적 가치

```python
# 시간이 지나며
def test_bug_101_null_user(): ...
def test_bug_102_negative_quantity(): ...
def test_bug_123_coupon_not_applied(): ...
def test_bug_201_npe_discount(): ...
# ... 수백 개
```

각 테스트가 과거 incident의 영구 기억. production 신뢰도 누적.

## 관련 패턴

- [Pattern 1: Test](/blog/programming/engineering/tdd-patterns/pattern01-test) — 테스트 기본
- [Pattern 4: Test First](/blog/programming/engineering/tdd-patterns/pattern04-test-first) — 테스트 먼저
- [Pattern 2: Isolated Test](/blog/programming/engineering/tdd-patterns/pattern02-isolated-test) — 테스트 격리
- [Pattern 32: All Tests](/blog/programming/engineering/tdd-patterns/pattern32-all-tests) — 전체 실행
