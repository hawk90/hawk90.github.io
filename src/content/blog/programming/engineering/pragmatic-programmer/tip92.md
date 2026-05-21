---
title: "Tip 92: Test State Coverage, Not Code Coverage"
date: 2026-05-12T20:00:00
description: "코드 커버리지가 아니라 상태 커버리지를 테스트하라. 실행된 줄이 아니라 검증된 상태가 중요하다."
series: "The Pragmatic Programmer"
seriesOrder: 92
tags: [pragmatic-programmer, testing, coverage]
draft: false
---

## 이 팁의 메시지

> **Tip 92: Test State Coverage, Not Code Coverage.** Identify and test significant program states.

중요한 프로그램 상태를 식별하고 테스트하라.

## 코드 커버리지의 한계

100% 코드 커버리지가 100% 버그 없음을 의미하지 않는다.

```python
def divide(a, b):
    return a / b

def test_divide():
    assert divide(10, 2) == 5
    # 100% 커버리지, 하지만 0으로 나누기 테스트 안 함
```

모든 줄이 실행되어도 모든 상태가 검증된 건 아니다.

## 상태 커버리지란

프로그램이 가질 수 있는 의미 있는 상태들을 테스트한다.

```text
주문 상태 예:
- 생성됨 (Created)
- 결제 대기 (Pending Payment)
- 결제 완료 (Paid)
- 배송 중 (Shipping)
- 배송 완료 (Delivered)
- 취소됨 (Cancelled)
- 환불됨 (Refunded)

각 상태에서 가능한 전이를 테스트한다.
```

## 상태 전이 테스트

```text
유효한 전이:
생성됨 → 결제 대기
결제 대기 → 결제 완료
결제 대기 → 취소됨
결제 완료 → 배송 중
배송 중 → 배송 완료
결제 완료 → 환불됨

무효한 전이 (테스트 필요):
생성됨 → 배송 완료 (불가능해야 함)
취소됨 → 결제 완료 (불가능해야 함)
배송 완료 → 취소됨 (불가능해야 함)
```

## 코드 vs 상태 커버리지

| 코드 커버리지 | 상태 커버리지 |
|---------------|---------------|
| 줄이 실행되었는가? | 상태가 검증되었는가? |
| 양적 측정 | 질적 측정 |
| 도구로 쉽게 측정 | 분석이 필요 |
| 100%여도 버그 가능 | 상태별 버그 감소 |

## 상태 식별 방법

```text
1. 도메인 상태:
   - 사용자: 비회원, 회원, VIP, 정지
   - 상품: 판매중, 품절, 단종

2. 데이터 상태:
   - 비어있음, 하나, 여러 개, 가득 참
   - null, 빈 문자열, 정상 값

3. 시스템 상태:
   - 초기화 전, 실행 중, 종료 중
   - 연결됨, 끊김, 재연결 중
```

## 상태 기반 테스트 예

```python
class TestShoppingCart:
    def test_empty_cart_total(self):
        cart = ShoppingCart()
        assert cart.total() == 0

    def test_single_item_cart(self):
        cart = ShoppingCart()
        cart.add(Item("apple", 1000))
        assert cart.total() == 1000

    def test_multiple_items_cart(self):
        cart = ShoppingCart()
        cart.add(Item("apple", 1000))
        cart.add(Item("banana", 500))
        assert cart.total() == 1500

    def test_cart_after_remove(self):
        cart = ShoppingCart()
        cart.add(Item("apple", 1000))
        cart.remove("apple")
        assert cart.total() == 0
        assert cart.is_empty()
```

## 경계 상태

```text
경계 상태 테스트:
- 빈 컬렉션
- 단일 요소
- 최대 용량
- 용량 초과 시도

- 최솟값
- 최솟값 - 1
- 최댓값
- 최댓값 + 1

- null / None
- 빈 문자열
- 공백만 있는 문자열
```

## 상태 다이어그램 활용

```text
[비로그인] --로그인--> [로그인]
    |                    |
    v                    v
[게스트 장바구니]    [회원 장바구니]
    |                    |
    +--------+----------+
             |
             v
         [결제]
             |
    +--------+--------+
    v                 v
[성공]             [실패]
```

다이어그램의 모든 노드와 엣지를 테스트한다.

## 정리

- 코드 커버리지 100%가 버그 없음을 보장하지 않는다.
- 의미 있는 프로그램 상태를 식별한다.
- 각 상태와 상태 전이를 테스트한다.
- 무효한 전이도 테스트한다.
- 경계 상태에 집중한다.
- 상태 다이어그램으로 빠진 테스트를 찾는다.

## 다음 장 예고

[Tip 93: Find Bugs Once](/blog/programming/engineering/pragmatic-programmer/tip93)에서는 같은 버그를 두 번 찾지 않는 방법을 다룬다.

## 관련 항목

- [Tip 91: Use Saboteurs to Test Your Testing](/blog/programming/engineering/pragmatic-programmer/tip91)
- [Tip 66: A Test Is the First User of Your Code](/blog/programming/engineering/pragmatic-programmer/tip66)
