---
title: "Tip 21: Prototype to Learn"
date: 2026-05-11T21:00:00
description: "프로토타입은 학습을 위한 것 — 결과물이 아니라 학습이 목적이다."
series: "The Pragmatic Programmer"
seriesOrder: 21
tags: [pragmatic-programmer, development]
draft: false
---

## 이 팁의 메시지

> **Tip 21: Prototype to Learn.** Prototyping is a learning experience. Its value lies not in the code you produce, but in the lessons you learn.

프로토타입은 살아남는 코드가 아니다. 버리는 것을 전제로 만든다. 목적은 결과물이 아니라 학습이다. [Tip 20](/blog/programming/engineering/pragmatic-programmer/tip20)의 조명탄과 구분해야 한다.

## 조명탄과 프로토타입의 차이

둘은 자주 혼동된다. 그러나 목적이 다르다.

| 조명탄 | 프로토타입 |
|--------|-----------|
| 살아남는 코드 | 버리는 코드 |
| 끝에서 끝까지 연결 | 한 측면만 탐구 |
| 점차 완성됨 | 학습 후 폐기 |
| "어떻게 만들까?" | "이게 가능한가?" |

조명탄은 뼈대가 되어 살을 붙여 나간다. 프로토타입은 질문에 답한 뒤 버린다.

## 무엇을 프로토타이핑하는가

불확실하거나 위험한 자리만 프로토타이핑한다.

- **새 알고리즘**: 성능이 예상대로인지 검증한다.
- **새 라이브러리**: API가 우리 요구에 맞는지 확인한다.
- **새 UI 흐름**: 사용자 경험이 자연스러운지 시험한다.
- **외부 시스템 통합**: 통신이 예상대로 동작하는지 확인한다.

전체 시스템을 프로토타이핑할 필요는 없다. 불확실한 한 점만 찔러 본다.

## 폐기의 중요성

프로토타입의 가장 큰 함정은 "그대로 쓰자"는 유혹이다.

> "이 프로토타입 잘 돌아가네. 시간도 없는데 그냥 쓰자."

프로토타입에는 에러 처리가 없다. 테스트가 없다. 문서가 없다. 성능 최적화가 없다. 그대로 프로덕션에 넣으면 기술 부채가 된다. 프로토타입은 반드시 버리고, 배운 것을 바탕으로 처음부터 다시 작성해야 한다.

## 정리

- 프로토타입 = 학습 도구. 결과물이 아니다.
- 불확실하고 위험한 자리만 찔러 본다.
- 학습이 끝나면 반드시 버린다.
- 버리지 못하면 프로토타입이 아니다.

## 다음 장 예고

[Tip 22: Program Close to the Problem Domain](/blog/programming/engineering/pragmatic-programmer/tip22)에서는 코드의 단어가 도메인의 단어와 같아야 한다는 점을 다룬다.

## 관련 항목

- [Tip 20: Use Tracer Bullets to Find the Target](/blog/programming/engineering/pragmatic-programmer/tip20)
- [Tip 22: Program Close to the Problem Domain](/blog/programming/engineering/pragmatic-programmer/tip22)
