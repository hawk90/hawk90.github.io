---
title: "Tip 14: Good Design Is Easier to Change Than Bad Design"
date: 2026-05-11T14:00:00
description: "좋은 설계는 변경하기 쉽다 — 변경 비용이 설계 품질의 척도다."
series: "The Pragmatic Programmer"
seriesOrder: 14
tags: [pragmatic-programmer, design]
draft: false
---

## 이 팁의 메시지

> **Tip 14: Good Design Is Easier to Change Than Bad Design.** A thing is well designed if it adapts to the people who use it.

"좋은 설계"란 무엇인가? 아름다움? 우아함? 저자들은 더 구체적인 기준을 제시한다. 변경하기 쉬우면 좋은 설계고, 변경하기 어려우면 나쁜 설계다.

## ETC — Easier To Change

20주년 개정판에서 저자들은 설계 원칙을 한 줄로 요약했다.

> **ETC — Easier To Change.**

모든 설계 결정에서 한 가지 질문만 던지면 된다. "이 선택이 변경을 더 쉽게 하는가, 더 어렵게 하는가?" 답이 "더 쉽게"라면 좋은 설계 방향이다.

## 좋은 설계의 특징

변경이 쉬운 설계에는 공통점이 있다.

- **결합도가 낮다**: 한 모듈을 수정해도 다른 모듈에 영향이 적다.
- **응집도가 높다**: 관련 있는 것들이 한 자리에 모여 있어서 무엇이 어디 있는지 명확하다.
- **의존이 안정 방향이다**: 자주 바뀌는 것이 안정된 것에 의존한다.
- **추상이 적절하다**: 필요한 만큼만 추상화한다. 과도하지도, 부족하지도 않다.

이런 특징을 갖추면 변경 비용이 낮아진다.

## 나쁜 설계의 특징

변경이 어려운 설계에도 공통점이 있다.

- **결합도가 높다**: 한 변경이 도미노처럼 퍼진다.
- **응집도가 낮다**: 무엇이 어디 있는지 모른다. 코드를 찾아 헤맨다.
- **의존이 불안정 방향이다**: 안정된 것이 자주 바뀌는 것에 의존한다.
- **추상이 잘못된 자리에 있다**: 추상해야 할 것은 안 하고, 안 해도 될 것을 추상한다.

이런 설계에서는 작은 변경도 큰 비용을 치른다.

## 일상에서 ETC 적용하기

ETC를 습관으로 만들면 설계 품질이 올라간다.

- **새 함수를 짤 때**: "이 구조가 나중에 변경하기 쉬운가?"
- **코드 리뷰할 때**: "이 변경이 다음 변경을 어렵게 만드는가?"
- **설계 회의에서**: "어느 옵션이 더 ETC인가?"

처음에는 의식적으로 질문해야 하지만, 반복하면 자연스러워진다.

## 정리

- 좋은 설계 = 변경하기 쉬운 설계.
- ETC(Easier To Change)를 모든 결정의 기준으로 삼는다.
- 결합도, 응집도, 의존 방향, 추상 수준이 변경 비용을 결정한다.
- 추상적인 "아름다움"보다 구체적인 "변경 비용"으로 측정한다.

## 다음 장 예고

[Tip 15: DRY—Don't Repeat Yourself](/blog/programming/engineering/pragmatic-programmer/tip15)에서는 이 책에서 가장 유명한 원칙을 다룬다. DRY는 코드 중복 회피가 아니라 지식 중복 회피다.

## 관련 항목

- [Tip 13: Build Documentation In, Don't Bolt It On](/blog/programming/engineering/pragmatic-programmer/tip13)
- [Tip 15: DRY—Don't Repeat Yourself](/blog/programming/engineering/pragmatic-programmer/tip15)
