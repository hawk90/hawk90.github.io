---
title: "Tip 69: Test Your Software, or Your Users Will"
date: 2026-05-11T21:00:00
description: "소프트웨어를 테스트하라, 아니면 사용자가 테스트할 것이다."
series: "The Pragmatic Programmer"
seriesOrder: 69
tags: [pragmatic-programmer, testing, quality]
draft: false
---

## 이 팁의 메시지

> **Tip 69: Test Your Software, or Your Users Will.** Test ruthlessly. Don't make your users find bugs for you.

무자비하게 테스트하라. 사용자가 버그를 찾게 하지 마라.

## 사용자가 테스터가 되면

테스트를 건너뛰면 사용자가 테스터가 된다. 그러나 사용자는 좋은 테스터가 아니다.

| 개발자 테스트 | 사용자 "테스트" |
|--------------|----------------|
| 계획적 | 우연히 발견 |
| 재현 가능 | "어떻게 했는지 모르겠어요" |
| 빠른 피드백 | 버그 리포트까지 수일 |
| 수정 쉬움 | 이미 프로덕션에 있음 |
| 무료 | 신뢰 손실, 매출 손실 |

## 테스트 피라미드

```text
       /\
      /  \     E2E 테스트 (적음)
     /----\
    /      \   통합 테스트 (중간)
   /--------\
  /          \ 단위 테스트 (많음)
 /------------\
```

단위 테스트가 가장 많고, E2E 테스트가 가장 적다. 단위 테스트는 빠르고 안정적이다. E2E 테스트는 느리고 불안정하다.

## 단위 테스트

가장 작은 단위를 테스트한다.

```python
def calculate_tax(amount: float, rate: float) -> float:
    return amount * rate

def test_calculate_tax():
    assert calculate_tax(100, 0.1) == 10
    assert calculate_tax(200, 0.15) == 30
    assert calculate_tax(0, 0.1) == 0
```

빠르고, 격리되어 있고, 결정적이다.

## 통합 테스트

여러 컴포넌트의 상호작용을 테스트한다.

```python
def test_order_flow():
    # 여러 컴포넌트 통합
    user = create_test_user()
    product = create_test_product(price=100)
    order = order_service.create_order(user, [product])
    payment_service.process_payment(order)

    assert order.status == "paid"
    assert user.balance == previous_balance - 100
```

실제 데이터베이스나 외부 서비스의 테스트 인스턴스를 쓸 수 있다.

## E2E 테스트

전체 시스템을 사용자 관점에서 테스트한다.

```python
def test_user_can_purchase():
    browser = start_browser()
    browser.goto("/products")
    browser.click("상품 A")
    browser.click("장바구니 담기")
    browser.click("결제하기")
    browser.fill("카드번호", "1234...")
    browser.click("결제")

    assert browser.text_content(".result") == "결제 완료"
```

느리고 불안정하지만, 실제 사용자 경험을 검증한다.

## 테스트 커버리지

커버리지는 지표일 뿐, 목표가 아니다.

```text
80% 커버리지라고 해서 80%가 안전한 게 아니다.
- 실행됐지만 검증 안 된 코드
- 테스트가 없는 20%가 핵심일 수 있다
- 경계 조건이 테스트됐는지가 중요
```

의미 있는 테스트를 작성하는 것이 커버리지 숫자보다 중요하다.

## 경계 조건

버그는 경계에서 발생한다.

```python
def test_pagination_boundary():
    # 첫 페이지
    assert get_page(0) == first_10_items

    # 마지막 페이지
    assert get_page(total_pages - 1) == last_items

    # 범위 밖
    with pytest.raises(ValueError):
        get_page(-1)
    with pytest.raises(ValueError):
        get_page(total_pages)

    # 빈 결과
    assert get_page_of_empty_list(0) == []
```

0, 1, 마지막, 마지막+1, 빈 경우를 테스트한다.

## 회귀 테스트

버그를 발견하면 테스트를 먼저 작성한다.

```python
def test_issue_123_divide_by_zero():
    """
    Issue #123: total이 0일 때 ZeroDivisionError 발생
    """
    order = Order(items=[], total=0)
    # 예전에는 여기서 크래시
    result = calculate_average_item_price(order)
    assert result == 0
```

같은 버그가 다시 발생하지 않게 막는다.

## 무자비하게 테스트하라

Hunt와 Thomas는 "무자비하게" 테스트하라고 한다.

- 정상 경로만 테스트하지 않는다
- 실패 경로를 테스트한다
- 경계 조건을 테스트한다
- 악의적 입력을 테스트한다
- 동시성 조건을 테스트한다

```python
def test_malicious_input():
    # SQL 인젝션 시도
    result = search("'; DROP TABLE users; --")
    assert "error" not in result.lower()

    # XSS 시도
    result = save_comment("<script>alert('xss')</script>")
    assert "<script>" not in get_comment(result.id)
```

## 정리

- 테스트를 건너뛰면 사용자가 테스터가 된다.
- 테스트 피라미드: 단위 > 통합 > E2E.
- 경계 조건을 집중적으로 테스트한다.
- 버그마다 회귀 테스트를 작성한다.
- 무자비하게 테스트하라.

## 다음 장 예고

[Tip 70: Use Property-Based Tests to Validate Your Assumptions](/blog/programming/engineering/pragmatic-programmer/tip70)에서는 속성 기반 테스트를 다룬다.

## 관련 항목

- [Tip 68: Design to Test](/blog/programming/engineering/pragmatic-programmer/tip68)
- [Tip 70: Use Property-Based Tests to Validate Your Assumptions](/blog/programming/engineering/pragmatic-programmer/tip70)
