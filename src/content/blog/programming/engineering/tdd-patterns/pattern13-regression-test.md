---
title: "Pattern 13: Regression Test"
date: 2026-07-01T13:00:00
description: "Bug 발견 시 — 그 bug를 잡는 test 먼저."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 13
tags: [tdd, beck, regression-test, bug]
draft: true
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> 버그 리포트를 받으면 그 버그를 재현하는 테스트를 먼저 작성한다. 테스트가 실패하는 동안 버그를 수정한다.

## 동기 (Motivation)

버그 리포트가 들어왔다: "할인 쿠폰이 적용 안 돼요."

바로 디버거를 켜고 코드를 뒤지고 싶은 유혹이 있다. 하지만 TDD 방식은 다르다:

1. **버그를 재현하는 테스트** 작성
2. 테스트가 **실패하는지 확인** (Red)
3. 버그 **수정**
4. 테스트가 **통과하는지 확인** (Green)

이 순서의 장점:
- 버그가 **정말 고쳐졌는지** 확실히 알 수 있다
- 같은 버그가 **다시 발생하면 테스트가 잡는다**
- 시스템에 대한 **이해가 갱신**된다

## Regression Test 작성 예시

### 버그 리포트

> "할인 쿠폰 SAVE10을 적용했는데, 장바구니 총액이 그대로예요."

### Step 1: 재현 테스트 작성

```python
def test_coupon_applies_discount():
    """버그 #123: 할인 쿠폰이 적용되지 않음"""
    cart = Cart()
    cart.add(Item("A", 1000))

    cart.apply_coupon("SAVE10")  # 10% 할인 쿠폰

    assert cart.total() == 900  # 예상: 1000 * 0.9 = 900
```

### Step 2: 테스트 실행 — 실패 확인

```text
FAILED test_coupon_applies_discount
AssertionError: 1000 != 900
```

좋다. 버그가 재현된다.

### Step 3: 버그 수정

```python
def apply_coupon(self, code):
    coupon = self.coupon_service.get(code)
    if coupon:
        self.discount = coupon.discount  # 이 줄이 빠져 있었다!
```

### Step 4: 테스트 통과 확인

```text
PASSED test_coupon_applies_discount
```

버그가 고쳐졌고, 이 테스트는 **영구적인 회귀 방지망**이 된다.

## 테스트를 못 쓰면?

버그를 재현하는 테스트를 쓰기 어렵다면, 그 자체가 **신호**다:

| 상황 | 의미 |
|------|------|
| 테스트하려면 많은 setup 필요 | 결합도가 높음 → 리팩터링 필요 |
| 외부 의존성 때문에 재현 불가 | 의존성 주입 필요 |
| 무엇이 버그인지 불명확 | 요구사항 명확화 필요 |

테스트 불가 = 설계 개선 기회.

## 회귀 테스트의 누적

시간이 지나면 회귀 테스트가 쌓인다:

```python
def test_bug_101_null_user():
    """버그 #101: 사용자가 null일 때 크래시"""
    ...

def test_bug_102_negative_quantity():
    """버그 #102: 음수 수량 처리 오류"""
    ...

def test_bug_123_coupon_not_applied():
    """버그 #123: 할인 쿠폰 미적용"""
    ...
```

이 테스트들이 **안전망**이 된다. 과거 버그가 다시 나타나면 즉시 잡힌다.

## Regression Test 네이밍

버그 번호나 설명을 포함하면 나중에 추적이 쉽다:

```python
# 방법 1: 버그 번호
def test_bug_123():
    ...

# 방법 2: 설명적 이름
def test_coupon_discount_applied_to_total():
    ...

# 방법 3: 둘 다
def test_bug_123_coupon_not_applied():
    """버그 #123: 할인 쿠폰이 장바구니에 적용되지 않음"""
    ...
```

## 정리

- 버그 리포트 받으면 **재현 테스트 먼저**
- 테스트가 **실패해야** 버그가 확인된 것
- 수정 후 **테스트 통과**로 완료 확인
- 테스트를 못 쓰면 **설계 개선 신호**
- 회귀 테스트가 **누적되어 안전망** 형성

## 관련 패턴

- [Pattern 1: Test](/blog/programming/engineering/tdd-patterns/pattern01-test) — 테스트의 정의
- [Pattern 4: Test First](/blog/programming/engineering/tdd-patterns/pattern04-test-first) — 테스트 먼저
- [Pattern 2: Isolated Test](/blog/programming/engineering/tdd-patterns/pattern02-isolated-test) — 테스트 격리
