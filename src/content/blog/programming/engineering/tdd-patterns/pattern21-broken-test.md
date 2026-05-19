---
title: "Pattern 21: Broken Test"
date: 2026-05-10T21:00:00
description: "Solo 작업 끝낼 때 — failing test로 놔두기. 복귀 시 어디서 멈췄는지 즉시."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 21
tags: [tdd, beck, broken-test, context-switching]
draft: true
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> Solo 작업 중단 시 *실패 테스트를 의도적으로 남김*. 복귀 시 *어디서 멈췄는지* 즉시 파악.

## 동기 (Motivation)

퇴근 시간 — 코드를 짜다 멈춰야 한다. 다음 날 *"어디까지 했더라?"* — 코드 보고 *상황 재구성*에 시간 소모.

**Broken Test**는 작업을 멈출 때 *의도적으로 실패하는 테스트*를 남긴다. 다음 날 test 실행 → *fail 메시지 = bookmark*.

### 신호

- 매일 *시작에 10분 이상* 상황 파악.
- *어제 뭐 했지?* 자주.
- *컨텍스트 스위치* 후 진척 떨어짐.
- 회의/점심 후 *흐름 끊김*.

### 언제 적용하는가

| 조건 | OK |
| --- | --- |
| Solo 작업 | ✓ |
| 개인 branch | ✓ |
| 다른 사람이 안 만짐 | ✓ |
| Context switching 빈번 | ✓ |

### 언제 적용하지 않는가

| 조건 | 금지 |
| --- | --- |
| 페어 프로그래밍 중 | ✗ |
| main/develop branch (CI red) | ✗ |
| 공유 코드베이스 | ✗ |

팀 환경은 [Clean Check-in](/blog/programming/engineering/tdd-patterns/pattern22-clean-check-in) 원칙.

## 절차 (Mechanics)

1. **작업 끝낼 시점 인식** (퇴근, 휴식).
2. **현재 진행 사항** 파악.
3. **다음 step을 표현하는 테스트** 작성.
4. *의도적 fail* (assert False 또는 미구현 method 호출).
5. **commit + push** (개인 branch).
6. **복귀 시 test 실행** → fail 메시지가 *그 자리로 인도*.

## 예시 1 — 단순 broken test

```python
def test_order_total_includes_tax():
    """내일 이거 구현해야 함"""
    order = Order()
    order.add_item(Item("Book", 1000))
    total = order.total_with_tax()
    # 아직 구현 안 됨 — 내일 여기서 시작
    assert total == 1100   # 10% 세금
```

다음 날 실행:

```text
FAILED test_order_total_includes_tax
  AttributeError: 'Order' object has no attribute 'total_with_tax'
```

*정확히 어디*서 멈췄는지.

## 예시 2 — 명시적 bookmark

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

테스트 *이름 자체가 TODO*. assertion message가 *상세 메모*.

## 예시 3 — Context switching 보조

```python
# 긴 회의 전
def test_RESUME_after_meeting_fix_validation():
    """회의 끝나고 validation 버그 수정"""
    assert False
```

회의 후 *바로 돌아갈 위치*. *thinking 비용* 절감.

## 자주 보는 안티패턴

### 1. *Team branch에 push*
shared branch에 broken test → *CI red* → *팀 전체 영향*. 절대 금지.

### 2. *Broken test 다수*
```python
def test_NEXT_A(): assert False
def test_NEXT_B(): assert False
def test_NEXT_C(): assert False
```
어디서 시작? *하나만*.

### 3. *오래된 broken test 누적*
며칠/주 동안 *잊고 방치* → 진짜 fail과 구분 안 됨. 매일 정리.

### 4. *Broken test로 commit이 영원히 broken*
git log에 *broken commit 영구 남음*. 다음 commit에서 *fix* + amend (개인 branch만).

### 5. *Production CI 통과 안 함*
CI가 broken test 잡으면 *PR block*. local commit / 개인 branch만.

### 6. *Broken test로 push*
원격에 broken test push → 동료가 *pull 후 혼란*. local 또는 personal fork.

## Modern variants

### Git WIP commit

```bash
git add . && git commit -m "WIP: tax calculation, test failing"
git push origin personal-branch
```

명확한 *WIP 표시*. 다음 작업 시 *commit message가 안내*.

### Pomodoro 끝

25분 끝나면 *broken test 남기고* 휴식. 복귀 시 즉시.

### Pair programming notes

다른 pair member에게 *broken test로 인계*. 명확한 *handoff*.

### Branch protection

```yaml
# .github/workflows/ci.yml
branches:
  - main
  - develop
# personal branch는 CI 안 돌림 → broken OK
```

policy로 broken test 허용 branch 명시.

### IDE bookmark 통합

VS Code/IntelliJ의 *bookmark*와 함께 — 코드 위치 + 의도.

### TODO panel + broken test

TODO 주석 + broken test 함께 — *복귀 시 두 신호*.

## Broken Test vs TODO 주석

| Broken Test | TODO 주석 |
| --- | --- |
| 실행 시 *반드시 보임* | 잊기 쉬움 |
| *fail 메시지로 가이드* | 주석은 silent |
| CI에서 *자동 차단* | grep으로 찾아야 |
| 의도적 *불완전 표현* | description |

## 도구 / IDE

| 도구 | 기능 |
| --- | --- |
| pytest --lf | 마지막 fail test만 |
| IntelliJ Bookmarks | 코드 위치 + 메모 |
| VS Code TODO Tree | TODO 시각화 |
| git stash + name | 의미 있는 stash |

## 성능 고려

추상 — 코드 성능 무관. *개발자 throughput*에 큰 효과. 매일 5-10분 절약 → *연간 수십 시간*.

## 관련 패턴

- [Pattern 22: Clean Check-in](/blog/programming/engineering/tdd-patterns/pattern22-clean-check-in) — 팀 환경의 반대 원칙
- [Pattern 14: Break](/blog/programming/engineering/tdd-patterns/pattern14-break) — 작업 중단 시점
- [Pattern 3: Test List](/blog/programming/engineering/tdd-patterns/pattern03-test-list) — 작업 계획
- [Pattern 12: Another Test](/blog/programming/engineering/tdd-patterns/pattern12-another-test) — 새 아이디어 기록
