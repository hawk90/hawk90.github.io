---
title: "Tip 24: Iterate the Schedule with the Code"
date: 2026-05-12T00:00:00
description: "코드와 함께 일정도 반복하라 — 한 번에 못 박힌 일정은 — 거의 항상 빗나간다."
series: "The Pragmatic Programmer"
seriesOrder: 24
tags: [pragmatic-programmer, estimation]
draft: true
---

## 이 팁의 메시지

> **Tip 24: Iterate the Schedule with the Code.** Use the experience you gain as you implement to refine the project time scales.

코드는 반복해서 개발한다. 그런데 일정은 왜 처음에 한 번 정하고 끝인가? 일정도 코드처럼 반복해서 갱신해야 한다.

## 한 번에 못 박는 함정

프로젝트 시작 시점에 일정을 정한다. "3개월 후 출시." 이 시점에 가진 정보는 가장 적다. 그런데 그 일정이 고정된다.

3개월 후, 80%가 완료되었다. 그러나 나머지 20%가 2개월 더 걸린다. 왜? 처음에 몰랐던 것들이 드러났기 때문이다. 그러나 일정은 "3개월"로 고정되어 있어서, 팀은 압박을 받고, 품질이 떨어지거나, 기능이 잘린다.

## 반복 추정

매 반복(스프린트) 후에 일정을 다시 추정한다.

- "남은 일이 얼마인가?"
- "지금까지의 속도(velocity)는 어떠한가?"
- "새로 발견된 위험이 있는가?"

이 정보를 바탕으로 일정을 갱신한다. 처음 추정보다 정확해진다. 왜냐하면 이제 실제 데이터가 있기 때문이다.

## 매니저에게 말하는 법

일정 갱신은 두렵다. "처음에 3개월이라고 했는데 5개월이 됐다"고 말하면 신뢰가 떨어질까?

그러나 숨기면 더 나쁘다. 투명하고 일찍 말해야 한다.

> "지난 두 스프린트 속도를 보면, 남은 작업은 6주 더 필요합니다. 처음 추정 3개월에서 5개월로 갱신됩니다. 이유는 인증 시스템이 예상보다 복잡했기 때문입니다."

데이터와 이유를 함께 제시한다. 추측이 아니라 경험에 기반한 갱신이다.

## 정리

- 처음 일정은 정보가 가장 적을 때 만든다.
- 매 반복 후 일정을 갱신한다.
- 실제 속도와 새 발견을 반영한다.
- 매니저에게 투명하고 일찍 알린다.

## 다음 장 예고

[Tip 25: Keep Knowledge in Plain Text](/blog/programming/engineering/pragmatic-programmer/tip25)에서는 지식을 평문으로 저장해야 하는 이유를 다룬다.

## 관련 항목

- [Tip 23: Estimate to Avoid Surprises](/blog/programming/engineering/pragmatic-programmer/tip23)
- [Tip 25: Keep Knowledge in Plain Text](/blog/programming/engineering/pragmatic-programmer/tip25)
