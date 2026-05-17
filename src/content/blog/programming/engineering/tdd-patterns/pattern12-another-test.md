---
title: "Pattern 12: Another Test"
date: 2026-07-01T12:00:00
description: "Tangent 아이디어 — test list에 추가하고 현재 작업 유지."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 12
tags: [tdd, beck, another-test, focus]
draft: true
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> 코딩 중 새로운 아이디어가 떠오르면, 지금 작업을 중단하지 말고 테스트 목록에 적어두고 현재 사이클을 완수한다.

## 동기 (Motivation)

테스트를 작성하고 있는데 갑자기 생각난다: "아, 이 경우도 테스트해야 하는데..."

그 순간 하던 일을 멈추고 새 테스트를 작성하면?
- 현재 작업의 **흐름이 끊긴다**
- 새 테스트가 막히면 **두 작업 모두 미완성**
- **집중력 분산**으로 실수 확률 상승

**Another Test** 패턴의 규율:
- 새 아이디어는 **테스트 목록에 적는다**
- 현재 Red-Green-Refactor **사이클을 완수**한다
- 그 다음 목록에서 **다음 테스트를 선택**한다

## Squirrel Effect

```text
현재 작업: test_add_single_item

생각: "아, 할인 쿠폰도 테스트해야지"
  → 할인 쿠폰 테스트 작성 시작
  → "쿠폰 만료일도 체크해야 하나?"
    → 만료일 테스트 작성 시작
    → "만료일 계산 로직이 복잡하네..."
      → 별도 DateUtil 클래스 추출 시작
      → ...

결과: 세 작업 모두 미완성, 두 시간 지남
```

이것이 "Squirrel Effect"(다람쥐 효과) — 새 자극에 반응하여 계속 방향을 튼다.

## 올바른 흐름

```text
현재 작업: test_add_single_item

생각: "아, 할인 쿠폰도 테스트해야지"
  → 테스트 목록에 추가: "[ ] 할인 쿠폰 적용"
  → 현재 테스트 계속 작성
  → Green bar 확인
  → 리팩터링
  → 사이클 완료

다음: 목록에서 다음 테스트 선택
```

## 테스트 목록 활용

```text
Test List:
[x] 빈 장바구니
[x] 상품 1개 추가        ← 방금 완료
[ ] 상품 2개 추가
[ ] 할인 쿠폰 적용       ← 떠오른 아이디어
[ ] 재고 초과 시 에러
```

목록이 **작업 메모리 역할**을 한다. 머릿속에 담아두지 않아도 된다.

## 아이디어 기록 방법

### 1. 테스트 파일에 주석

```python
def test_add_single_item():
    # ... 현재 작업 중

# TODO: 할인 쿠폰 테스트 추가
# TODO: 재고 초과 에러 테스트
```

### 2. 빈 테스트 함수

```python
def test_apply_discount_coupon():
    """할인 쿠폰 적용"""
    pass  # TODO

def test_stock_limit():
    """재고 초과 시 에러"""
    pass  # TODO
```

### 3. 물리적 메모

포스트잇, 화이트보드, 노트에 적기. 눈에 보이는 곳에.

## 언제 현재 작업을 멈춰도 되는가

예외적으로 즉시 방향 전환이 필요한 경우:

1. **현재 테스트가 근본적으로 잘못됨**을 깨달았을 때
2. **블로킹 버그**를 발견했을 때 (다른 테스트 진행 불가)
3. **설계 결함**이 명확해서 지금 고치는 게 나을 때

하지만 대부분의 "아, 이것도 해야 하는데"는 **나중에 해도 된다**.

## 정리

- 새 아이디어가 떠오르면 **목록에 적고** 현재 작업 유지
- **한 번에 하나씩** (one thing at a time)
- **Squirrel Effect** 회피
- 테스트 목록이 **작업 메모리 외부화**
- 사이클 완수 후 다음 테스트 선택

## 관련 패턴

- [Pattern 3: Test List](/blog/programming/engineering/tdd-patterns/pattern03-test-list) — 목록 관리
- [Pattern 8: One Step Test](/blog/programming/engineering/tdd-patterns/pattern08-one-step-test) — 다음 테스트 선택
- [Pattern 4: Test First](/blog/programming/engineering/tdd-patterns/pattern04-test-first) — 현재 사이클 완수
