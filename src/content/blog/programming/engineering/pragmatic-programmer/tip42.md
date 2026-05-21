---
title: "Tip 42: Take Small Steps—Always"
date: 2026-05-11T18:00:00
description: "항상 작은 걸음을 걸어라. 큰 걸음은 큰 위험이고, 작은 걸음은 빠른 피드백이다."
series: "The Pragmatic Programmer"
seriesOrder: 42
tags: [pragmatic-programmer, development]
draft: false
---

## 이 팁의 메시지

> **Tip 42: Take Small Steps—Always.** Small steps always; check the feedback; and adjust before proceeding.

항상 작은 걸음을 걷고, 피드백을 확인하고, 다음으로 나아가기 전에 조정하라.

## 작은 걸음의 가치

1주일 동안 100곳을 바꾸고 테스트를 돌렸더니 실패한다. 어디서 깨졌는가? 100곳 중 어디인가? 원복하면 1주일을 잃는다.

반면 5분마다 작은 변경을 하고 테스트를 돌리면 어디서 깨졌는지 즉시 안다. 원복해도 5분 잃는 것으로 끝난다.

작은 걸음은 빠른 피드백이고, 빠른 피드백은 낮은 위험이다.

## 작은 걸음의 이점

| 이점 | 설명 |
|------|------|
| 즉시 발견 | 깨지면 바로 안다 |
| 쉬운 원복 | 작은 변경은 되돌리기 쉽다 |
| 명확한 리뷰 | 작은 커밋은 리뷰하기 쉽다 |
| 측정 가능한 진행 | 완료된 작은 단위가 쌓인다 |

## TDD와의 연결

TDD의 리듬은 빨강 → 초록 → 리팩토링이다. 각 단계는 5분 이내여야 한다.

1. **빨강**: 실패하는 테스트를 작성한다.
2. **초록**: 테스트를 통과시키는 최소한의 코드를 작성한다.
3. **리팩토링**: 코드를 정리한다.

매 단계 후에 테스트가 통과하는지 확인한다. 큰 걸음을 걷지 않는다.

## 점진적 리팩토링

리팩토링도 작은 걸음으로 한다.

- 한 함수만 추출한다.
- 한 변수 이름만 바꾼다.
- 한 클래스만 분리한다.

각 단계 후에 테스트를 돌린다. 한 번에 여러 리팩토링을 하면 어떤 변경이 문제인지 모른다.

## 큰 걸음의 함정

"나중에 한꺼번에 테스트하면 되지"라는 생각은 위험하다. 문제가 발견됐을 때 어디서 시작됐는지 알 수 없다. 디버깅 시간이 기하급수적으로 늘어난다.

## 정리

- 작은 걸음을 자주 걷는다.
- 매 걸음마다 피드백을 확인한다.
- 깨지면 즉시 발견하고 즉시 고친다.
- 큰 걸음은 큰 위험이다.

## 다음 장 예고

[Tip 43: Avoid Fortune-Telling](/blog/programming/engineering/pragmatic-programmer/tip43)에서는 미래를 예측해서 설계하는 것이 왜 위험한지 다룬다. YAGNI의 정신이다.

## 관련 항목

- [Tip 41: Act Locally](/blog/programming/engineering/pragmatic-programmer/tip41)
- [Tip 43: Avoid Fortune-Telling](/blog/programming/engineering/pragmatic-programmer/tip43)
