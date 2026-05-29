---
title: "Tip 44: Decoupled Code Is Easier to Change"
date: 2026-05-11T20:00:00
description: "결합도 낮은 코드가 바꾸기 쉽다. ETC(Easier To Change) 원칙의 핵심이다."
series: "The Pragmatic Programmer"
seriesOrder: 44
tags: [pragmatic-programmer, design]
draft: true
---

## 이 팁의 메시지

> **Tip 44: Decoupled Code Is Easier to Change.** Coupling ties things together, so that it's harder to change just one thing.

결합은 것들을 묶는다. 그래서 하나만 바꾸기 어렵다.

## 결합도란

결합도(coupling)는 모듈 간의 의존 정도다. A 모듈이 B 모듈의 내부를 알수록 결합도가 높다. 결합도가 높으면 B를 바꿀 때 A도 바꿔야 한다.

반대로 결합도가 낮으면 한 모듈을 바꿔도 다른 모듈에 영향이 적다. 이것이 ETC(Easier To Change)의 핵심이다.

## 결합도의 종류

결합도는 여러 수준이 있다. 낮을수록 좋다.

| 종류 | 설명 | 수준 |
|------|------|------|
| 데이터 결합 | 단순 데이터를 인자로 전달 | 낮음 (좋음) |
| 스탬프 결합 | 구조체 전체를 전달 | 중간 |
| 제어 결합 | 흐름 제어용 플래그 전달 | 중간 |
| 공용 결합 | 전역 데이터 공유 | 높음 (나쁨) |
| 내용 결합 | 다른 모듈 내부에 직접 접근 | 최악 |

## 결합도 낮추기

결합도를 낮추는 방법은 여러 가지다.

- **인터페이스**: 구체 클래스가 아닌 추상에 의존한다.
- **의존성 주입(DI)**: 의존 객체를 외부에서 주입한다.
- **이벤트**: 직접 호출 대신 이벤트를 발행한다.
- **메시지**: 메시지 큐를 통해 비동기로 통신한다.

## 강결합의 표지

다음 상황이 보이면 결합도가 높다는 신호다.

- 한 곳을 바꾸면 여러 곳을 동시에 바꿔야 한다.
- 한 테스트를 실행하려면 여러 모듈을 초기화해야 한다.
- 한 모듈을 이해하려면 다른 모듈을 모두 읽어야 한다.

이 상황이 반복되면 리팩토링이 필요하다.

## 정리

- 결합도가 낮을수록 변경이 쉽다.
- 인터페이스, DI, 이벤트, 메시지로 결합을 끊는다.
- 한 변경이 여러 모듈에 퍼지면 강결합의 신호다.
- ETC의 핵심은 결합도 낮추기다.

## 다음 장 예고

[Tip 45: Tell, Don't Ask](/blog/programming/engineering/pragmatic-programmer/tip45)에서는 객체에 데이터를 요청하지 말고 일을 시키라는 원칙을 다룬다.

## 관련 항목

- [Tip 17: Eliminate Effects Between Unrelated Things](/blog/programming/engineering/pragmatic-programmer/tip17)
- [Tip 43: Avoid Fortune-Telling](/blog/programming/engineering/pragmatic-programmer/tip43)
- [Tip 45: Tell, Don't Ask](/blog/programming/engineering/pragmatic-programmer/tip45)
