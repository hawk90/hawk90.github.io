---
title: "Pattern 14: Break"
date: 2026-05-10T14:00:00
description: "지쳤거나 막히면 — 휴식. 피곤한 상태로 짠 코드가 가장 비싸다."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 14
tags: [tdd, beck, break, rest]
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> 지쳤거나 막혔을 때는 잠시 쉰다. 피곤한 상태로 짠 코드는 가장 비싸다.

## 동기

Beck의 인간적 통찰: "피곤한 상태로 짠 코드가 가장 비싸다."

- 실수가 늘어남.
- 실수 찾는 데 더 많은 시간.
- 잘못된 설계 결정.
- 그 결정을 나중에 고치는 데 더 많은 시간.

휴식은 나약함이 아니라 전략.

### 신호 — 휴식 필요

- 같은 버그를 30분 이상 쳐다봄.
- 키보드 앞에서 멍하니.
- 짜증 시작.
- 테스트가 fail인데 왜인지 모름.
- 타이핑 속도 눈에 띄게 느려짐.
- 같은 줄을 반복 수정.
- 코드를 읽어도 의미 안 들어옴.

### 휴식의 종류

| 종류 | 시간 | 활동 |
| --- | --- | --- |
| Micro | 1-5분 | 일어서기, 스트레칭, 창밖 |
| 짧은 | 15-30분 | 산책, 커피, 잡담, 다른 일 |
| 긴 | 하루+ | 퇴근, "sleep on it", 주말 |

## 절차

1. **신호 감지** — 자신의 상태 자각.
2. 현재 작업 상태 보존 — `git stash` 또는 commit, TODO 메모.
3. **휴식 종류 결정** — 짧은 좌절이면 micro, 깊은 막힘이면 길게.
4. **완전한 휴식** — 코드 생각 멈춤. 무의식이 일하도록.
5. **복귀 시 메모 확인** — 어디서 멈췄는지.
6. Fresh eye로 다시 봄.

## 예시 1 — Micro break

```text
같은 테스트를 20분째 디버깅.
화면 노려보다 → 자리에서 일어남.
물 한 컵 마시며 창밖 보기 (2분).
다시 앉아서 코드 → "아! 이 if 조건이 거꾸로네!"
```

뇌의 기본 모드 네트워크가 활성 → 패턴 발견.

## 예시 2 — Sleep on it

```text
복잡한 의존성 주입 설계 — 막힘.
퇴근.

다음 날 아침 샤워 중:
"아, 의존성 주입 대신 service locator 한 단계만 두면 되겠다!"
```

수면 중 기억 consolidation. 무의식적 문제 해결.

## 예시 3 — 퇴근 전 루틴

```python
# 의도적으로 실패하는 테스트 남기기
def test_next_feature():
    assert False, "내일 여기서 시작 — discount with multiple coupons"

# TODO 메모
# TODO: CartService 리팩터링 (extract DiscountCalculator)
# TODO: 할인 로직 edge case 테스트 추가
```

다음 날 바로 진입. context switch 비용 감소.

## 자주 보는 안티패턴

### 1. "5분만 더"가 30분

"거의 다 됐어" → 시간 누적. 명확한 타이머 룰.

### 2. 영웅 코드

밤새 코딩 → bug 가득. 다음 날 디버깅에 더 큰 시간. 휴식이 전체 효율.

### 3. Break 중 일 생각

물리적 휴식인데 머릿속 계속 코드 → 진짜 회복 안 됨. 완전 분리.

### 4. 복귀 시 어디였는지 모름

TODO/메모 없음 → 5분간 상황 재구성. 퇴근 전 루틴.

### 5. Flow 중 강제 break

Pomodoro에 너무 충실 → flow 깨짐. 상황 판단 필요하다.

### 6. *Pair/팀과 break 안 맞춤*

혼자만 휴식 → 동료 blocking. 동기화.

## Modern variants

### Pomodoro Technique

```text
25분 작업 → 5분 휴식 → 25분 작업 → 5분 휴식
→ 4사이클 후 15-30분 긴 휴식
```

구조화된 휴식. TDD cycle과 잘 맞음.

### Ultradian rhythm

90분 집중 → 20분 깊은 휴식. 인간 생체 리듬에 맞춤.

### Async work

원격팀 — 막히면 문서 작성, code review 등 다른 종류의 작업. 휴식과 진척 모두.

### Stand-up / walk-and-talk

walking meeting — 움직임 + 토론. 갇혀 있던 생각 풀림.

### Rubber duck debugging

문제를 오리(또는 동료)에게 설명 → 설명하다 해결책 발견. 휴식 + 정리.

### Hammock-driven development (Rich Hickey)

어려운 문제는 *해먹/소파에서* 생각. 컴퓨터 앞 떠나기.

### Digital detox

장기 휴가 — 코드 완전 차단. 큰 통찰 시간.

## 도구 / IDE

| 도구 | 기능 |
| --- | --- |
| Pomodoro timer (Be Focused, Forest) | 구조화된 휴식 |
| Time Out (Mac) | 강제 break 알림 |
| Stretchly | 마이크로 break |
| RescueTime | 화면 시간 추적 |
| 책상에서 일어나기 알림 | Apple Watch / Fitbit |

## 성능 고려

추상 — 코드 성능 무관. 인간 성능에 직접 영향. 휴식 없이 일한 시간 *>>* 휴식 후 효율적 시간.

## Flow vs 휴식

| Flow 유지 | 휴식 필요 |
| --- | --- |
| 에너지 넘침 | 에너지 떨어짐 |
| 아이디어 술술 | 막힘 |
| 시간 가는 줄 모름 | 시간 안 감 |
| 테스트 계속 통과 | 같은 테스트 fail 반복 |
| 자발적 의욕 | 강제로 앉아 있음 |

## 관련 패턴

- [Pattern 15: Do Over](/blog/programming/engineering/tdd-patterns/pattern15-do-over) — 처음부터 다시
- [Pattern 8: One Step Test](/blog/programming/engineering/tdd-patterns/pattern08-one-step-test) — 작은 스텝으로 막힘 방지
- [Pattern 3: Test List](/blog/programming/engineering/tdd-patterns/pattern03-test-list) — 복귀를 위한 메모
- [Pattern 22: Clean Check-in](/blog/programming/engineering/tdd-patterns/pattern22-clean-check-in) — 휴식 전 코드 상태 깨끗이
