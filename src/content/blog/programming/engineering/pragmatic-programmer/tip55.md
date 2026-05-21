---
title: "Tip 55: Analyze Workflow to Improve Concurrency"
date: 2026-05-11T07:00:00
description: "워크플로를 분석해 동시성을 개선하라. 의존성을 파악하면 병렬 처리 기회가 보인다."
series: "The Pragmatic Programmer"
seriesOrder: 55
tags: [pragmatic-programmer, concurrency]
draft: false
---

## 이 팁의 메시지

> **Tip 55: Analyze Workflow to Improve Concurrency.** Exploit concurrency in your user's workflow.

사용자의 워크플로에서 동시성을 활용하라.

## 순차 처리의 함정

많은 프로그램이 작업을 순차적으로 처리한다.

```python
def process_order(order):
    validate(order)          # 2초
    calculate_total(order)   # 1초
    check_inventory(order)   # 3초
    charge_payment(order)    # 2초
    send_confirmation(order) # 1초
    # 총 9초
```

한 작업이 끝나야 다음 작업이 시작된다. 그러나 모든 작업이 서로 의존하는 것은 아니다.

## 의존성 분석

어떤 작업이 어떤 작업을 기다려야 하는지 분석한다.

![Parallel checks before sequential payment](/images/blog/pragmatic-programmer/diagrams/tip55-pipeline-stages.svg)

- `validate`, `calculate_total`, `check_inventory`는 독립적이다. 병렬 처리 가능.
- `charge_payment`는 세 작업 모두 끝나야 시작한다.
- `send_confirmation`은 결제 후에만 가능하다.

## 병렬 처리 적용

```python
import asyncio

async def process_order(order):
    # 병렬 처리
    await asyncio.gather(
        validate(order),
        calculate_total(order),
        check_inventory(order)
    )  # 가장 긴 작업 기준 3초

    await charge_payment(order)  # 2초
    await send_confirmation(order)  # 1초
    # 총 6초 (9초 → 6초)
```

병렬 처리로 9초가 6초로 줄었다. 30% 이상 빨라졌다.

## 액티비티 다이어그램

워크플로를 시각화하면 병렬 처리 기회가 드러난다.

![Order activity diagram: parallel checks → join → payment](/images/blog/pragmatic-programmer/diagrams/tip55-order-flow.svg)

## 파이프라인

여러 항목을 처리할 때는 파이프라인을 고려한다.

```python
# 순차: 주문 하나 완료 후 다음
for order in orders:
    process_order(order)

# 파이프라인: 단계별로 흘려보낸다
# 주문1 검증 → 주문1 계산 + 주문2 검증 → ...
```

주문1이 결제 단계에 있을 때 주문2는 검증 단계에 있을 수 있다. 전체 처리량이 늘어난다.

## 주의점

동시성에는 비용이 따른다.

| 고려 사항 | 설명 |
|----------|------|
| 공유 상태 | 여러 작업이 같은 데이터에 접근하면 충돌 |
| 순서 보장 | 결과 순서가 중요하면 추가 처리 필요 |
| 에러 처리 | 한 작업 실패 시 나머지 처리 방법 |
| 디버깅 | 타이밍에 따라 버그 재현이 어려움 |

병렬화는 명확한 이득이 있을 때만 도입한다.

## 정리

- 작업 간 의존성을 분석한다.
- 독립적인 작업은 병렬로 처리한다.
- 파이프라인으로 처리량을 높인다.
- 공유 상태, 순서, 에러 처리에 주의한다.
- 명확한 이득이 있을 때만 병렬화한다.

## 다음 장 예고

[Tip 56: Shared State Is Incorrect State](/blog/programming/engineering/pragmatic-programmer/tip56)에서는 공유 상태의 위험을 다룬다.

## 관련 항목

- [Tip 54: Parameterize Your App Using External Configuration](/blog/programming/engineering/pragmatic-programmer/tip54)
- [Tip 56: Shared State Is Incorrect State](/blog/programming/engineering/pragmatic-programmer/tip56)
