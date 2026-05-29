---
title: "Tip 76: Requirements Are Learned in a Feedback Loop"
date: 2026-05-12T04:00:00
description: "요구사항은 피드백 루프에서 학습된다. 만들고, 보여주고, 배우고, 반복한다."
series: "The Pragmatic Programmer"
seriesOrder: 76
tags: [pragmatic-programmer, requirements, agile]
draft: true
---

## 이 팁의 메시지

> **Tip 76: Requirements Are Learned in a Feedback Loop.** Our job is to create the feedback loops in which understanding can grow.

우리 일은 이해가 자랄 수 있는 피드백 루프를 만드는 것이다.

## 피드백 루프란

만들고 → 보여주고 → 피드백 받고 → 조정한다.

![Build → show → feedback → adjust cycle](/images/blog/pragmatic-programmer/diagrams/tip76-feedback-cycle.svg)

한 바퀴가 빠를수록 좋다.

## 루프 주기

| 루프 | 주기 | 목적 |
|------|------|------|
| 코드 | 분 | 컴파일, 테스트 |
| 기능 | 일 | 동작 확인 |
| 스프린트 | 주 | 비즈니스 피드백 |
| 릴리스 | 월 | 시장 피드백 |

짧은 루프를 가능하게 하는 것이 애자일의 핵심이다.

## 예: 기능 개발 루프

| 시점 | 공유 내용 | 피드백 |
|------|----------|--------|
| Day 1 오전 | 스케치/와이어프레임 | "검색 필드가 더 눈에 띄어야 해요" |
| Day 1 오후 | 수정된 디자인 | "좋아요, 진행해 주세요" |
| Day 2 | 기본 기능 구현 | "결과가 20개 이상이면 페이지네이션 해주세요" |
| Day 3 | 페이지네이션 추가 | "완벽해요!" |

매일 피드백을 받으면 방향을 빨리 잡는다.

## 피드백을 쉽게 받기

피드백을 주기 쉽게 만든다.

```python
# 피드백을 어렵게 만드는 코드
def complex_calculation():
    # 1000줄의 복잡한 로직
    ...
    return result

# 피드백을 쉽게 만드는 코드
def complex_calculation():
    intermediate = step1()
    log.debug(f"Step 1 result: {intermediate}")

    next_step = step2(intermediate)
    log.debug(f"Step 2 result: {next_step}")

    # 중간 결과를 볼 수 있음
    return final_step(next_step)
```

중간 결과를 볼 수 있으면 문제를 빨리 찾는다.

## 데모 환경

언제든 보여줄 수 있어야 한다.

스테이징 환경이 항상 동작하고, 테스트 데이터가 준비되어 있어야 한다. 기능 플래그로 미완성 기능을 숨기고 데모용 계정도 준비해 둔다. "잠깐, 빌드 중이에요"라고 하면 피드백 기회를 놓친다.

## 피드백 처리

모든 피드백이 같은 무게가 아니다.

피드백을 분류한다.

1. **버그**: 즉시 수정
2. **오해**: 설명 또는 UI 개선
3. **새 요구사항**: 백로그에 추가, 우선순위 결정
4. **범위 밖**: 기록하고 나중에 논의

피드백을 받았다고 모두 바로 반영하지 않는다. 우선순위를 정한다.

## 부정적 피드백 환영

"좋아요"만 듣는 것은 위험하다.

| 피드백 유형 | 예 |
|------------|---|
| 위험한 피드백 | "좋은 것 같아요" (구체적이지 않음) |
| 유용한 피드백 | "이 버튼 위치가 헷갈려요" (구체적) |

구체적인 피드백을 얻기 위해 "어떤 점이 불편하셨어요?", "다르게 동작했으면 하는 부분이 있나요?", "이 기능 없이 일하실 수 있나요?"라고 질문한다. 비판을 두려워하지 않는다.

## 빠른 실패

잘못된 방향을 빨리 발견하는 게 좋다.

| 발견 시점 | 피드백 | 비용 |
|----------|--------|-----|
| 3개월 후 | "완전히 다시 해야 해요" | 큰 비용 |
| 1주 후 | "방향을 바꿔야 해요" | 작은 비용 |
| 1일 후 | "이 부분 수정하면 돼요" | 최소 비용 |

실패를 일찍 발견할수록 수정 비용이 적다.

## A/B 테스트

실제 사용자로부터 피드백을 받는다.

```python
def show_checkout_button(user):
    if user.id % 2 == 0:
        return "Buy Now"  # A 그룹
    else:
        return "Add to Cart"  # B 그룹

# 2주 후 전환율 비교
```

의견이 아닌 데이터로 결정한다.

## 정리

- 요구사항은 피드백 루프에서 학습된다.
- 루프를 짧게 유지한다.
- 매일 또는 매주 보여주고 피드백 받는다.
- 데모 환경을 항상 준비한다.
- 부정적 피드백을 환영한다.
- 빠른 실패가 저렴한 실패다.

## 다음 장 예고

[Tip 77: Work with a User to Think Like a User](/blog/programming/engineering/pragmatic-programmer/tip77)에서는 사용자처럼 생각하는 방법을 다룬다.

## 관련 항목

- [Tip 75: Programmers Help People Understand What They Want](/blog/programming/engineering/pragmatic-programmer/tip75)
- [Tip 77: Work with a User to Think Like a User](/blog/programming/engineering/pragmatic-programmer/tip77)
