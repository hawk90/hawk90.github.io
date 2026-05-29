---
title: "Tip 23: Estimate to Avoid Surprises"
date: 2026-05-11T23:00:00
description: "놀라움을 피하려면 추정하라 — 추정 = 예측이 아니라 사고 도구."
series: "The Pragmatic Programmer"
seriesOrder: 23
tags: [pragmatic-programmer, estimation]
draft: true
---

## 이 팁의 메시지

> **Tip 23: Estimate to Avoid Surprises.** Estimate before you start. You'll spot potential problems up front.

추정의 목적은 정확한 시간 예측이 아니다. 작업을 분해하면서 위험과 미지를 발견하는 것이 핵심이다. 추정은 사고의 도구다.

## 추정의 진짜 목적

많은 사람이 추정을 "정확한 완료 일자 예측"이라고 생각한다. 그러나 소프트웨어 추정은 거의 항상 빗나간다. 그렇다면 왜 추정하는가?

- **위험 발견**: 작업을 분해하면서 "이 부분은 잘 모르겠다"가 드러난다.
- **계획 수립**: 무엇을 먼저 해야 하는지 우선순위가 보인다.
- **소통**: 이해관계자에게 대략적인 기대치를 전달한다.

추정 과정에서 발견한 미지가 추정 결과보다 가치 있다.

## 적절한 정밀도

추정 결과를 어떻게 표현하는가도 중요하다.

> "약 3주"  vs  "3주 1일 4시간"

후자는 정밀해 보이지만, 오히려 신뢰를 떨어뜨린다. 그 정도로 정확하게 예측할 수 있는 상황이 아니기 때문이다. 시간 범위에 따라 적절한 단위를 선택한다.

| 예상 기간 | 적절한 단위 |
|----------|-----------|
| 며칠 | 시간 |
| 몇 주 | 일 |
| 몇 달 | 주 |

## 추정 후 학습

추정은 한 번 하고 끝나는 것이 아니다.

1. 추정한다.
2. 실제 작업한다.
3. 실제 시간을 기록한다.
4. 추정과 실제를 비교한다.
5. 패턴을 학습한다.
6. 다음 추정에 반영한다.

이 사이클을 반복하면 추정 정확도가 올라간다. 그러나 더 중요한 것은 "어디서 빗나가는가"를 이해하게 된다는 점이다.

## 정리

- 추정 = 사고 도구. 정확한 예측이 아니다.
- 추정 과정에서 위험과 미지를 발견한다.
- 정밀도보다 적절한 단위를 선택한다.
- 실제와 비교하고 학습한다.

## 다음 장 예고

[Tip 24: Iterate the Schedule with the Code](/blog/programming/engineering/pragmatic-programmer/tip24)에서는 일정도 코드처럼 반복해서 갱신해야 한다는 점을 다룬다.

## 관련 항목

- [Tip 22: Program Close to the Problem Domain](/blog/programming/engineering/pragmatic-programmer/tip22)
- [Tip 24: Iterate the Schedule with the Code](/blog/programming/engineering/pragmatic-programmer/tip24)
