---
title: "Tip 74: No One Knows Exactly What They Want"
date: 2026-05-12T02:00:00
description: "아무도 정확히 원하는 것을 모른다. 요구사항은 발견되는 것이지 수집되는 것이 아니다."
series: "The Pragmatic Programmer"
seriesOrder: 74
tags: [pragmatic-programmer, requirements, agile]
draft: false
---

## 이 팁의 메시지

> **Tip 74: No One Knows Exactly What They Want.** They might know a general direction, or maybe a rough outline, but they won't know the details of the trip.

대략적인 방향이나 윤곽은 알 수 있지만, 여정의 세부 사항은 모른다.

## 요구사항의 현실

프로젝트 시작 시 고객은 원하는 것을 정확히 모른다. 개발자도 가능한 것을 정확히 모른다.

고객이 "페이스북 같은 걸 만들어 주세요"라고 말하고, 개발자가 "네, 알겠습니다"라고 답한다. 6개월 후 고객은 "이게 아닌데요"라고 하고, 개발자는 "요구사항대로 했는데요"라고 한다. 문서화된 요구사항도 진짜 원하는 것과 다를 수 있다.

## 요구사항은 발견된다

수집(gathering)이 아니라 발견(discovering)이다.

| 접근법 | 설명 |
|--------|------|
| 수집 | 고객에게 묻고 받아 적는다. 고객도 모르는데 어떻게 받아 적나? |
| 발견 | 함께 탐험하며 찾아낸다. 만들어 보고, 보여주고, 피드백 받고, 조정한다. |

## 피드백 루프

작은 조각을 빠르게 보여주고 피드백을 받는다.

1주차에 와이어프레임을 보여주며 "이런 식으로 생각하고 있는데 맞나요?"라고 묻는다. 2주차에 "로그인 화면 만들었어요"라고 하면 고객이 "아, 소셜 로그인도 필요해요"라고 한다. 3주차에 소셜 로그인을 추가하면 "좋네요, 그런데 2FA도..."라는 새 요구가 나온다.

긴 사이클보다 짧은 피드백이 낫다.

## 프로토타입

실제로 동작하는 것을 보여준다.

```python
# 완성된 기능이 아니라 피드백을 받기 위한 프로토타입
def search_products(query):
    # 실제 검색 대신 하드코딩
    return [
        {"name": "Product A", "price": 100},
        {"name": "Product B", "price": 200},
    ]
```

프로토타입으로 대화를 시작한다. "이런 결과가 나오면 될까요?"

## 트레이서 불릿 vs 프로토타입

| 프로토타입 | 트레이서 불릿 |
|-----------|-------------|
| 버릴 코드 | 유지할 코드 |
| 빠르게 피드백 | 아키텍처 검증 |
| UI/UX 검증 | 기술 검증 |
| 고객용 | 개발팀용 |

둘 다 "모르는 것"을 발견하는 도구다.

## 사용자 관찰

말보다 행동을 본다.

| 고객의 말 | 고객의 행동 |
|----------|------------|
| "이 기능 자주 씁니다" | 실제로는 한 달에 한 번 사용 |
| "이 버튼은 필요 없어요" | 매번 그 버튼을 찾음 |

사용자가 실제로 어떻게 쓰는지 관찰한다.

## 도메인 전문가와 협력

기술만 알아서는 안 된다.

개발자가 "주문 취소는 언제 가능한가요?"라고 물으면 도메인 전문가는 "배송 전까지요"라고 답한다. "배송 전이란 정확히 언제죠?"라고 더 파고들면 "상품이 창고를 떠나기 전... 아, 부분 배송이면 복잡해요"라는 답이 나온다. 질문을 통해 숨겨진 규칙을 발견한다.

## 요구사항 문서

문서는 스냅샷이다.

| 버전 | 요구사항 |
|------|---------|
| 1.0 | 사용자는 상품을 검색할 수 있다 |
| 1.1 | 사용자는 카테고리별로 상품을 검색할 수 있다 |
| 1.2 | 사용자는 가격 범위로 필터링할 수 있다 |
| ... | ... |

문서는 계속 업데이트된다. 완성된 요구사항은 없다.

## 변경을 수용

요구사항은 바뀐다. 그것이 정상이다.

```python
# 변경을 예상한 설계
class PricingStrategy(Protocol):
    def calculate(self, order) -> float: ...

class FixedPricing:
    def calculate(self, order):
        return order.base_price

class DynamicPricing:
    def calculate(self, order):
        return order.base_price * demand_factor()

# 나중에 새 전략을 쉽게 추가
```

## 정리

- 아무도 처음부터 원하는 것을 정확히 모른다.
- 요구사항은 수집이 아니라 발견이다.
- 짧은 피드백 루프로 함께 찾아낸다.
- 프로토타입으로 대화를 시작한다.
- 말보다 행동을 관찰한다.
- 변경은 정상이다. 수용할 준비를 한다.

## 다음 장 예고

[Tip 75: Programmers Help People Understand What They Want](/blog/programming/engineering/pragmatic-programmer/tip75)에서는 프로그래머가 요구사항 발견을 돕는 방법을 다룬다.

## 관련 항목

- [Tip 73: Name Well; Rename When Needed](/blog/programming/engineering/pragmatic-programmer/tip73)
- [Tip 75: Programmers Help People Understand What They Want](/blog/programming/engineering/pragmatic-programmer/tip75)
- [Tip 22: Use Tracer Bullets to Find the Target](/blog/programming/engineering/pragmatic-programmer/tip22)
