---
title: "Tip 17: Eliminate Effects Between Unrelated Things"
date: 2026-05-11T17:00:00
description: "관련 없는 것들 사이의 영향을 제거하라 — 직교성. 한 변경이 한 자리만 건드리도록."
series: "The Pragmatic Programmer"
seriesOrder: 17
tags: [pragmatic-programmer, design, orthogonality]
draft: true
---

## 이 팁의 메시지

> **Tip 17: Eliminate Effects Between Unrelated Things.** Design components that are self-contained, independent, and have a single, well-defined purpose.

수학과 물리학에서 말하는 직교성(Orthogonality)을 소프트웨어에 적용한다. 두 축이 직교하면 한 축을 따라 움직여도 다른 축의 값은 변하지 않는다. 소프트웨어에서 두 모듈이 직교하면 한 모듈을 수정해도 다른 모듈에 영향이 없다.

## 헬리콥터 메타포

저자들은 헬리콥터 조종간을 예로 든다.

헬리콥터에는 여러 조종간이 있다. 각 조종간이 독립적으로 한 축만 제어하면 조종이 가능하다. 그러나 한 손을 움직였을 때 모든 축이 함께 변하면 어떨까? 조종이 불가능해진다.

코드도 같다. 한 모듈을 수정했을 때 관련 없는 모듈까지 영향을 받으면, 시스템을 제어할 수 없다.

## 직교성의 이점

직교적인 시스템에는 여러 장점이 있다.

- **변경의 국지화**: 한 자리만 수정하면 된다. 도미노 효과가 없다.
- **테스트의 격리**: 한 모듈만 시험하면 된다. 다른 모듈을 신경 쓰지 않아도 된다.
- **재사용**: 한 모듈을 다른 맥락에서 그대로 쓸 수 있다.
- **이해의 용이함**: 한 부분씩 이해하면 된다. 전체를 머릿속에 담지 않아도 된다.

## 직교성을 깨뜨리는 것들

다음 요소들이 직교성을 해친다.

- **전역 상태**: 모든 모듈이 같은 전역 변수에 의존하면, 그 변수를 바꿀 때 모든 모듈이 영향을 받는다.
- **강결합**: 인터페이스 없이 구현에 직접 의존하면, 구현 변경이 사용자 모두에게 전파된다.
- **이중 책임**: 한 모듈이 두 가지 일을 하면, 한 책임을 바꿀 때 다른 책임도 건드리게 된다.
- **숨겨진 의존**: 호출 순서가 결과를 바꾸면, 순서를 모르는 사람은 예측 불가능한 버그를 만난다.

## 직교성을 높이는 방법

반대로, 다음 방법들이 직교성을 높인다.

- **인터페이스로 의존**: 구현 대신 추상에 의존한다.
- **의존성 주입(DI)**: 의존성을 외부에서 주입받는다.
- **순수 함수**: 입력만으로 출력이 결정된다. 외부 상태에 의존하지 않는다.
- **불변 데이터**: 공유해도 안전하다. 한 쪽에서 바꿔도 다른 쪽이 영향받지 않는다.

## 정리

- 직교성 = 독립성. 한 변경이 한 자리만 건드린다.
- 직교적이면 변경 비용이 낮고, 테스트가 쉽고, 재사용이 가능하다.
- 전역 상태, 강결합, 이중 책임, 숨겨진 의존이 직교성을 깨뜨린다.
- 인터페이스, DI, 순수 함수, 불변 데이터가 직교성을 높인다.

## 다음 장 예고

[Tip 18: There Are No Final Decisions](/blog/programming/engineering/pragmatic-programmer/tip18)에서는 모든 결정을 가역적으로 설계해야 한다는 점을 다룬다. 어제의 "영원한 결정"이 오늘의 안티패턴이 된다.

## 관련 항목

- [Tip 16: Make It Easy to Reuse](/blog/programming/engineering/pragmatic-programmer/tip16)
- [Tip 18: There Are No Final Decisions](/blog/programming/engineering/pragmatic-programmer/tip18)
