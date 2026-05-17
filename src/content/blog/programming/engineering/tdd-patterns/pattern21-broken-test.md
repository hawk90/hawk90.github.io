---
title: "Pattern 21: Broken Test"
date: 2026-07-01T21:00:00
description: "Solo 작업 끝낼 때 — failing test로 놔두기."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 21
tags: [tdd, beck, broken-test, context-switching]
draft: true
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> Solo 작업을 중단할 때 마지막 테스트를 실패 상태로 남겨두면, 돌아왔을 때 어디서 멈췄는지 즉시 알 수 있다.

## 동기 (Motivation)

퇴근 시간이다. 코드를 열심히 짜다 멈춰야 한다. 다음 날 와서 "어디까지 했더라?"

```python
# 어제 코드... 뭘 하고 있었지?
class OrderProcessor:
    def process(self, order):
        # TODO: 뭔가 하려고 했는데...
        pass
```

**Broken Test**는 이 문제를 해결한다. 작업을 멈출 때 **의도적으로 실패하는 테스트를 남겨둔다**.

## Broken Test 예시

### 작업 중단 시

```python
def test_order_total_includes_tax():
    """내일 이거 구현해야 함"""
    order = Order()
    order.add_item(Item("Book", 1000))

    total = order.total_with_tax()

    # 아직 구현 안 됨 — 내일 여기서 시작
    assert total == 1100  # 10% 세금
```

다음 날 테스트를 실행하면:

```text
FAILED test_order_total_includes_tax
  AttributeError: 'Order' object has no attribute 'total_with_tax'
```

**정확히 어디서 멈췄는지** 알려준다.

### 더 명확하게

```python
def test_NEXT_implement_tax_calculation():
    """
    다음 작업: 세금 계산 구현
    1. Order.total_with_tax() 메서드 추가
    2. 세율 10% 적용
    3. 반올림 처리
    """
    assert False, "여기서 시작"
```

테스트 이름 자체가 **TODO 메모**다.

## 언제 사용하나

### Solo 작업 Only

```text
✓ 혼자 작업할 때
✓ 개인 브랜치에서
✓ 다른 사람이 코드를 건드리지 않을 때

✗ 페어 프로그래밍 중 (다른 사람이 이어받음)
✗ main/develop 브랜치 (CI가 빨간불)
✗ 공유 코드베이스 (팀원 혼란)
```

### Context Switching용

```python
# 긴 회의 전
def test_RESUME_after_meeting_fix_validation():
    """회의 끝나고 validation 버그 수정"""
    assert False
```

## Broken Test vs TODO 주석

```python
# TODO 주석 — 찾기 어려움
# TODO: 세금 계산 구현
def total(self):
    return self.subtotal

# Broken Test — 강제로 상기
def test_NEXT_tax_calculation():
    assert False  # 테스트 실행하면 반드시 보임
```

**TODO 주석**은 잊어버리기 쉽다. **Broken Test**는 **실행할 때마다 상기**시킨다.

## 주의사항

### 팀 환경에서는 Clean Check-in

```text
Solo:
  git commit -m "WIP: 세금 계산 작업 중 (test failing)"
  # 개인 브랜치 OK

Team:
  git commit -m "feat: 세금 계산 완료 (all tests green)"
  # main/develop에는 항상 green
```

### 하나만 남기기

```python
# 나쁨 — 실패 테스트가 여러 개
def test_NEXT_feature_A(): assert False
def test_NEXT_feature_B(): assert False
def test_NEXT_feature_C(): assert False
# 어디서 시작해야 하지?

# 좋음 — 하나만
def test_NEXT_feature_A(): assert False
# 다음은 A 완료 후 결정
```

## Bookmark 패턴

Broken Test는 **코드 북마크**다:

```python
# 오늘 할 일
def test_CURRENT_working_on_this():
    """현재 작업 중"""
    assert False

# 내일 할 일
def test_TOMORROW_do_this_next():
    """다음 작업"""
    assert False
```

테스트 실행 결과가 **할 일 목록**이 된다.

## 정리

- **Solo 작업 중단 시** 실패 테스트 남기기
- **돌아왔을 때** 어디서 멈췄는지 즉시 파악
- **팀 환경에서는 사용 금지** (Clean Check-in)
- **하나의 실패 테스트**만 남기기
- **TODO 주석보다 강력**한 상기 도구
- **코드 북마크**로 활용

## 관련 패턴

- [Pattern 22: Clean Check-in](/blog/programming/engineering/tdd-patterns/pattern22-clean-check-in) — 팀 환경의 반대 원칙
- [Pattern 14: Break](/blog/programming/engineering/tdd-patterns/pattern14-break) — 작업 중단 시점
- [Pattern 3: Test List](/blog/programming/engineering/tdd-patterns/pattern03-test-list) — 작업 계획

