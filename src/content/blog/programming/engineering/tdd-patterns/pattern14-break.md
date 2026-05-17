---
title: "Pattern 14: Break"
date: 2026-07-01T14:00:00
description: "지쳤거나 막히면 — 휴식."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 14
tags: [tdd, beck, break, rest]
draft: true
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> 지쳤거나 막혔을 때는 잠시 쉬어라. 피곤한 상태로 짠 코드가 가장 비싸다.

## 동기 (Motivation)

Beck의 인간적 통찰: **"피곤한 상태로 짠 코드가 가장 비싸다."**

왜?
- 실수가 늘어난다
- 실수를 찾는 시간이 늘어난다
- 잘못된 설계 결정을 내린다
- 그 결정을 나중에 고치는 데 더 많은 시간이 든다

휴식은 **나약함이 아니라 전략**이다.

## 휴식이 필요한 신호

- 같은 버그를 **30분 이상** 쳐다보고 있다
- 키보드 앞에서 **멍하니** 있다
- **짜증**이 나기 시작한다
- 테스트가 실패하는데 **왜인지 모르겠다**
- 타이핑 속도가 **눈에 띄게 느려졌다**

이런 신호가 오면 멈춰야 한다.

## 휴식의 종류

### 1. 마이크로 휴식 (1-5분)

```text
- 자리에서 일어나 스트레칭
- 창밖 보기
- 물 마시러 가기
- 화장실 가기
```

### 2. 짧은 휴식 (15-30분)

```text
- 커피 타임
- 산책
- 다른 사람과 잡담
- 완전히 다른 일 하기
```

### 3. 긴 휴식 (하루 이상)

```text
- 퇴근하고 자기
- "Sleep on it" — 자고 나면 해결책이 떠오른다
- 주말 보내고 월요일에 다시
```

## Pomodoro와의 통합

Pomodoro 기법은 **구조화된 휴식**:

```text
25분 작업 → 5분 휴식 → 25분 작업 → 5분 휴식
→ 4사이클 후 15-30분 긴 휴식
```

TDD와 잘 맞는다:
- 25분 안에 Red-Green-Refactor 여러 사이클
- 휴식 시간에 진짜 쉬기
- 강제된 리듬이 집중력 유지

## 무의식적 문제 해결

휴식 중에도 뇌는 **백그라운드에서 작동**한다:

```text
문제: "이 의존성을 어떻게 주입하지?"

산책 15분

해결책이 떠오름: "아, Factory로 감싸면 되겠구나"
```

이것이 **Sleep on it** 효과. 의식적으로 생각하지 않아도 무의식이 일한다.

## 휴식 vs Flow

"나 지금 Flow 상태인데, 쉬면 깨질 것 같아요."

맞다. Flow를 유지하는 것도 가치 있다. 균형이 필요하다:

| Flow 유지 | 휴식 필요 |
|----------|----------|
| 에너지가 넘친다 | 에너지가 떨어진다 |
| 아이디어가 술술 나온다 | 막혀 있다 |
| 시간 가는 줄 모른다 | 시간이 안 간다 |
| 테스트가 계속 통과한다 | 같은 테스트가 계속 실패 |

## 퇴근 전 루틴

하루를 마칠 때:

```python
# 1. 의도적으로 실패하는 테스트 하나 남기기
def test_next_feature():
    assert False, "내일 여기서 시작"

# 2. 다음 할 일 메모
# TODO: CartService 리팩터링
# TODO: 할인 로직 테스트 추가
```

다음 날 어디서 시작할지 명확해진다.

## 정리

- 피곤하거나 막히면 **휴식**
- 피곤한 코드는 **비싸다**
- 마이크로, 짧은, 긴 휴식을 상황에 맞게
- **Pomodoro**로 구조화된 휴식
- **무의식**이 백그라운드에서 일한다
- Flow와 휴식의 **균형**

## 관련 패턴

- [Pattern 15: Do Over](/blog/programming/engineering/tdd-patterns/pattern15-do-over) — 막혀서 처음부터 다시
- [Pattern 8: One Step Test](/blog/programming/engineering/tdd-patterns/pattern08-one-step-test) — 작은 스텝으로 막힘 방지
- [Pattern 3: Test List](/blog/programming/engineering/tdd-patterns/pattern03-test-list) — 복귀를 위한 메모
