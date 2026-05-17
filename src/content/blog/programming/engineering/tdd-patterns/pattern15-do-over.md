---
title: "Pattern 15: Do Over"
date: 2026-07-01T15:00:00
description: "막혔을 때 — 처음부터 다시. Sunk cost fallacy를 거부하는 용기."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 15
tags: [tdd, beck, do-over, restart]
draft: true
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> 너무 깊이 막혔을 때 *지금 작업을 버리고 처음부터*. 첫 시도의 *학습*이 두 번째 시도의 기반.

## 동기 (Motivation)

30분째 같은 코드와 씨름. 테스트는 통과 안 함, 코드는 *점점 복잡*, 무엇이 문제인지도 *불분명*.

두 가지 선택:

1. *계속 파고든다* — "여기까지 왔는데 포기할 순 없어".
2. **처음부터 다시** — "이 접근법이 잘못".

**Do Over**는 두 번째. 지금 코드를 *버리고 깨끗한 상태*에서 다시.

### Sunk Cost Fallacy

"이미 30분 투자했는데 버릴 수 없어" — *매몰 비용 오류*.

- 30분은 *이미 지나간* 시간.
- 잘못된 방향 30분 더 → 60분 낭비.
- 처음부터 다시 하면 *15분에 끝날 수도*.

투자한 시간은 *의사결정에 영향 주면 안 됨*. 중요한 건 *앞으로 어떻게 할지*.

### 신호

- Red bar가 *10분 이상* 지속.
- 코드가 *점점 복잡해짐*.
- *무엇이 문제인지* 설명 못 함.
- 테스트 통과시키려 *hack 추가*.
- "이건 나중에 정리하면 되지" 같은 생각.
- 같은 곳에서 *반복 실패*.

### 언제 적용하는가

- *방향이 근본적으로 잘못*.
- 코드가 *수렴 못 함*.
- 학습이 충분해진 *지금 다시 시작이 더 빠름*.

### 언제 적용하지 않는가

- *거의 다 됐음* — 작은 문제만 남음.
- *문제 명확* — 해결책 알지만 실행만 남음.
- *5분 이내*에 끝날 것 같음.

## 절차 (Mechanics)

1. **상태 자각** — "이거 잘 안 되네".
2. *결정* — Do Over할지 계속할지.
3. **현재 작업 보존**:
   - `git stash` (혹시 참고할지도).
   - 또는 *branch에 commit*.
4. **clean state** (`git checkout .`).
5. *첫 시도에서 배운 것* 정리.
6. **다시 시작** — 다른 접근.

## 예시 1 — 복잡한 의존성

```python
# 첫 시도 (30분 후)
class ComplexDiscountCalculator:
    def __init__(self, user, cart, coupons, promotions, membership, loyalty):
        # 너무 많은 의존성...
        ...
    def calculate(self):
        # 복잡한 로직, 테스트 실패 중
        ...

# Do Over 결정!
# $ git checkout .

# 두 번째 시도 (15분 후)
def calculate_discount(price, discount_rate):
    """단순하게 시작"""
    return price * (1 - discount_rate)

# 테스트 통과, 여기서 점진 확장
```

복잡한 architecture가 문제. *함수 한 개*로 시작이 옳음.

## 예시 2 — Git stash 활용

```bash
# 현재 진행 상황 보존
git stash save "discount 첫 번째 시도 — 막힘, 참고용"

# 깨끗한 상태
git status   # clean

# 두 번째 시도 시작
# ...

# 나중에 stash 검토 (선택)
git stash list
git stash show -p stash@{0}
```

버리지만 *학습 보존*.

## 예시 3 — Branch + checkpoint

```bash
git checkout -b attempt-1
# 작업하다 막힘
git commit -am "WIP: 막힌 상태, attempt 1"

git checkout main
git checkout -b attempt-2
# 새 접근으로
```

여러 시도를 *branch*로 보존. 비교 가능.

## 자주 보는 안티패턴

### 1. *Do Over 거부*
"여기까지 왔는데..." → 더 깊은 막힘. *결정 빨리*.

### 2. *기록 없이 버리기*
첫 시도의 *학습 손실*. stash 또는 메모.

### 3. *Do Over 남용*
*조금만 어려워도* 매번 restart → 진척 0. *진짜 막힌 경우*만.

### 4. *같은 접근 반복*
Do Over 후 *같은 방식*으로 시작 → 같은 막힘. *학습 반영*.

### 5. *Do Over 후 즉시 다시 시작*
처음 시도 *피로 누적* → 같은 함정. [Break](/blog/programming/engineering/tdd-patterns/pattern14-break) 먼저.

### 6. *팀과 공유 안 함*
혼자 Do Over → 동료는 *변경 사항 못 봄*. PR 의도 명확화.

## Modern variants

### Spike & throw away

탐색용 *spike* — 학습만 목적, *결과 버림*. Do Over의 *의도적 계획*.

```python
# 1. Spike branch
git checkout -b spike-feature-X
# 빠르게 prototype, 테스트 없이 동작 확인

# 2. 학습 정리 (메모, ADR)

# 3. Branch 폐기 + TDD로 재구현
git checkout main
git branch -D spike-feature-X
```

### Worst Thing First

가장 어려운 부분 먼저 *spike* → 실현 가능성 확인 후 *깨끗하게 다시*.

### "Always be deleting"

Sandi Metz: *코드를 자주 삭제*. *deleting is design*.

### Strangler Fig

기존 시스템 옆에 *새 구현*. 점진적 대체.

### Reset to checkpoint (IDE Local History)

IntelliJ Local History — git commit 없이도 *시간 여행*. 안전한 Do Over.

### Mob programming + Reset

mob에서 한 방향 *5분 시도* → 안 되면 *합의 reset*. 빠른 학습.

## 도구 / IDE

| 도구 | 기능 |
| --- | --- |
| git stash, checkout | 변경 폐기 |
| git reflog | 잃어버린 commit 복구 |
| IDE Local History | 파일 단위 시간 여행 |
| jj (Jujutsu) | git 대안, undo 강력 |
| dura | git auto-commit (백그라운드) |

## 첫 시도의 학습 — 두 번째에 반영

| 첫 시도 발견 | 두 번째 시도 적용 |
| --- | --- |
| A가 B에 의존 | B 먼저, A를 그 위에 |
| 한 번에 너무 많음 | 단계 분해 |
| 잘못된 추상화 | 더 구체적 |
| 의존성 너무 많음 | 함수 시작 |

## 성능 고려

추상 — 코드 성능 무관. *개발 시간*에 큰 영향. 한 번의 Do Over가 *2-3배 시간 절약*.

## 관련 패턴

- [Pattern 14: Break](/blog/programming/engineering/tdd-patterns/pattern14-break) — 휴식 후 다시
- [Pattern 16: Child Test](/blog/programming/engineering/tdd-patterns/pattern16-child-test) — 더 작은 테스트로 분해
- [Pattern 8: One Step Test](/blog/programming/engineering/tdd-patterns/pattern08-one-step-test) — 작은 스텝으로 막힘 방지
- [Pattern 9: Starter Test](/blog/programming/engineering/tdd-patterns/pattern09-starter-test) — 새로운 시작
