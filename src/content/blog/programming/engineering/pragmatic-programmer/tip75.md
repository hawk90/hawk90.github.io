---
title: "Tip 75: Programmers Help People Understand What They Want"
date: 2026-05-12T03:00:00
description: "프로그래머는 사람들이 원하는 것을 이해하도록 돕는다. 질문하고, 보여주고, 탐험한다."
series: "The Pragmatic Programmer"
seriesOrder: 75
tags: [pragmatic-programmer, requirements, communication]
draft: false
---

## 이 팁의 메시지

> **Tip 75: Programmers Help People Understand What They Want.** Software development is an act of co-creation between users and programmers.

소프트웨어 개발은 사용자와 프로그래머 사이의 공동 창작이다.

## 프로그래머의 역할

단순히 요구사항을 받아 구현하는 것이 아니다.

```text
수동적: "네, 그렇게 만들겠습니다"
능동적: "이런 경우는 어떻게 되나요?"
```

프로그래머는 질문하고, 가능성을 제시하고, 함께 탐험한다.

## 올바른 질문

숨겨진 요구사항을 드러내는 질문을 한다.

```text
"사용자가 로그인하면 뭘 보게 되나요?"
"실패하면 어떻게 되나요?"
"데이터가 없을 때는요?"
"동시에 여러 명이 수정하면요?"
"10만 개의 항목이 있으면요?"
```

엣지 케이스 질문이 핵심 요구사항을 드러낸다.

## 시각화

말보다 보여준다.

```text
고객: "대시보드가 필요해요"
개발자: "이런 느낌인가요?" [스케치 보여줌]
고객: "아뇨, 차트가 더 크게요"
개발자: "이 정도?" [수정된 스케치]
고객: "네, 그리고 여기에 필터가..."
```

간단한 스케치나 와이어프레임이 긴 설명보다 효과적이다.

## 선택지 제시

하나의 방법만 있는 게 아니다.

```text
"이것을 구현하는 방법이 세 가지 있습니다:

A안: 간단하지만 제한적
- 1주 소요
- 기능 X만 지원

B안: 유연하지만 복잡
- 3주 소요
- 기능 X, Y, Z 지원

C안: 중간
- 2주 소요
- 기능 X, Y 지원

어떤 것이 좋을까요?"
```

트레이드오프를 명확히 하면 결정이 쉬워진다.

## 도메인 학습

프로그래머도 비즈니스를 이해해야 한다.

```python
# 도메인 이해 없이
def process(item, flag):
    if flag:
        return item.value * 0.9
    return item.value

# 도메인 이해 후
def apply_member_discount(product, is_premium_member):
    PREMIUM_DISCOUNT_RATE = 0.1
    if is_premium_member:
        return product.price * (1 - PREMIUM_DISCOUNT_RATE)
    return product.price
```

비즈니스 용어로 대화하고 코드에 반영한다.

## "왜"를 묻는다

요청 뒤의 이유를 이해한다.

```text
고객: "날짜 필드를 추가해 주세요"
개발자: "왜 필요하신가요?"
고객: "주문이 언제 들어왔는지 알아야 해서요"
개발자: "주문 생성 시간은 이미 저장되어 있어요. 혹시 다른 날짜가 필요하신가요?"
고객: "아, 배송 예정일이 필요해요"
```

진짜 필요한 것을 찾아낸다.

## 제약 조건 설명

기술적 제약을 이해 가능하게 설명한다.

```text
고객: "실시간으로 모든 데이터를 보여주세요"
개발자: "10만 건을 실시간으로 보여주면 페이지가 느려질 수 있어요.
         대신 최근 100건을 보여주고, 검색으로 나머지를 찾게 하면 어떨까요?"
고객: "그게 낫겠네요"
```

불가능을 말하기보다 대안을 제시한다.

## 점진적 정교화

한 번에 완벽하게 정의할 필요 없다.

```text
Sprint 1: "주문을 생성할 수 있다"
→ 구현 후 피드백

Sprint 2: "주문에 할인을 적용할 수 있다"
→ 구현 후 피드백

Sprint 3: "복잡한 프로모션 규칙을 지원한다"
→ 구현 후 피드백
```

각 단계에서 배우고 다음 단계를 정한다.

## 기대 관리

가능한 것과 불가능한 것을 솔직히 말한다.

```text
"이 기능은 2주면 충분합니다"
"이것은 기술적으로 어렵습니다. 대안을 찾아봐야 해요"
"이렇게 하면 나중에 확장하기 어려워요"
```

나쁜 소식도 빨리 전한다.

## 정리

- 프로그래머는 요구사항 발견의 파트너다.
- 질문으로 숨겨진 요구사항을 드러낸다.
- 시각화와 프로토타입으로 소통한다.
- 선택지와 트레이드오프를 제시한다.
- 도메인을 학습하고 비즈니스 용어로 대화한다.
- "왜"를 물어 진짜 필요를 찾는다.
- 제약은 대안과 함께 설명한다.

## 다음 장 예고

[Tip 76: Requirements Are Learned in a Feedback Loop](/blog/programming/engineering/pragmatic-programmer/tip76)에서는 요구사항 피드백 루프를 다룬다.

## 관련 항목

- [Tip 74: No One Knows Exactly What They Want](/blog/programming/engineering/pragmatic-programmer/tip74)
- [Tip 76: Requirements Are Learned in a Feedback Loop](/blog/programming/engineering/pragmatic-programmer/tip76)
