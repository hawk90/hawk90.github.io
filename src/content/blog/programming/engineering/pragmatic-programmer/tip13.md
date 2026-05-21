---
title: "Tip 13: Build Documentation In, Don't Bolt It On"
date: 2026-05-11T13:00:00
description: "문서를 안으로 짜 넣어라 — 마지막에 덧붙이지 마라. 코드와 함께 자란다."
series: "The Pragmatic Programmer"
seriesOrder: 13
tags: [pragmatic-programmer, documentation]
draft: false
---

## 이 팁의 메시지

> **Tip 13: Build Documentation In, Don't Bolt It On.** Documentation created separately from code is less likely to be correct and up to date.

문서를 프로젝트 마지막에 작성하면 어떻게 될까? 마감에 쫓기고, 작성자의 기억은 흐릿해지고, 코드와 어긋난 문서가 만들어진다. 문서는 코드와 함께 자라야 한다.

## 마지막에 덧붙임의 함정

프로젝트 막바지에 문서를 작성하면 여러 문제가 생긴다.

마감이 임박하면 문서는 항상 후순위로 밀린다. "일단 출시하고 나중에 쓰자"가 "영원히 안 쓴다"가 된다. 설령 쓴다 해도 작성자의 기억이 흐릿해서 부정확하다. 코드는 이미 여러 번 바뀌었지만, 문서는 초기 설계만 담고 있다.

결과적으로 다음 사람은 문서를 믿지 않고 코드만 읽는다. 문서 작성에 들인 시간이 낭비된다.

## 코드 안으로 짜 넣기

문서를 코드와 가까이 두면 함께 업데이트할 가능성이 높아진다.

- **함수 위의 docstring**: 함수의 의도를 한 줄로 남긴다.
- **모듈 근처의 README**: 모듈의 책임과 사용 예를 담는다.
- **API 문서**: 코드에서 자동 생성한다(Javadoc, Sphinx, TSDoc).
- **테스트**: 실행 가능한 문서다. 예상 동작이 코드로 표현된다.

코드를 수정할 때 바로 옆의 주석이나 README도 함께 수정하게 된다.

## 좋은 문서가 담는 것

모든 것을 문서화할 필요는 없다. 코드가 이미 말하는 것은 반복하지 않는다.

| 담아야 하는 것 | 담지 않아도 되는 것 |
|---------------|-------------------|
| **왜**: 결정의 배경 | 무엇: 코드가 말한다 |
| **불변식**: 항상 참인 조건 | 어떻게: 코드가 말한다 |
| **함정**: 미래의 위험 | 자명한 사실 |

"이 함수는 x를 받아서 y를 반환한다"는 코드를 보면 안다. "왜 이 방식을 선택했는가"는 코드만 봐서는 모른다.

## DRY 원칙

> 정보는 한 자리에만 있어야 한다.

코드에 표현된 정보를 문서에 다시 쓰면 둘 중 하나가 먼저 낡는다. 그리고 어느 쪽이 맞는지 모르게 된다. 코드가 유일한 진실의 원천(single source of truth)이 되도록 하고, 문서는 코드가 담지 못하는 맥락만 추가한다.

## 정리

- 문서는 과정의 일부다. 마지막에 덧붙이면 부패한다.
- 코드 가까이에 문서를 두고, 변경할 때 함께 업데이트한다.
- 왜, 불변식, 함정을 담는다. 무엇과 어떻게는 코드가 말한다.
- DRY 원칙을 문서에도 적용한다.

## 다음 장 예고

[Tip 14: Good Design Is Easier to Change Than Bad Design](/blog/programming/engineering/pragmatic-programmer/tip14)에서는 "좋은 설계"를 측정하는 구체적인 기준을 제시한다. 변경 비용이 설계 품질의 척도다.

## 관련 항목

- [Tip 12: It's Both What You Say and the Way You Say It](/blog/programming/engineering/pragmatic-programmer/tip12)
- [Tip 14: Good Design Is Easier to Change Than Bad Design](/blog/programming/engineering/pragmatic-programmer/tip14)
