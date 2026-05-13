---
title: "Tip 38: Crash Early"
date: 2026-05-13
description: "일찍 죽어라 — 잘못된 상태로 — 계속 가지 마라. 즉시 멈춰서 — 원인을 보여라."
series: "The Pragmatic Programmer"
seriesOrder: 38
tags: [pragmatic-programmer, defensive-programming]
---

## 이 팁의 메시지

> **Crash Early** — 잘못이 — 발견되면 — **즉시** 멈춘다. 회복 시도 X — 그게 더 큰 문제.

## 핵심 내용

- 발견 즉시 — 실패.
- 잘못된 상태로 — 계속 가지 마라.
- 회복 시도 = 위장이 — 더 큰 손상.
- 빠른 실패 = 빠른 진단.

## 늦은 실패의 함정

> 잘못된 입력 → 계속 처리 → 다른 함수에 → ... → 한참 후에 — 이상한 에러.

원인을 — 못 찾는다. 가장 늦은 자리에서 — 증상이 보이지만, 진짜 원인은 — 처음 자리.

## 일찍 실패

```python
def process(data):
    if not validate(data):
        raise ValueError(f"Invalid: {data}")  # 즉시 멈춤.
    # ... 처리 ...
```

원인 자리에서 — 멈추면 — 진단이 — 즉시.

## "회복" 함정

```python
# 안 좋은 패턴.
try:
    process(data)
except:
    data = default_value  # 위장.
    process(data)
```

데이터의 잘못을 — 가림. 다음 사람이 — 옛 버그를 — 못 본다.

## 예외 처리

- **예외적 상황** — 잡고 처리.
- **버그** — 잡지 마라. 일찍 죽어라.

## 정리

- 발견 즉시 멈춤.
- 회복 X = 위장.
- 일찍 실패 = 빠른 진단.

## 관련 항목

- [Tip 37: Design with Contracts](/blog/programming/engineering/pragmatic-programmer/tip37)
- [Tip 39: Use Assertions](/blog/programming/engineering/pragmatic-programmer/tip39)
- [Code Complete Ch 8: Defensive Programming](/blog/programming/engineering/code-complete/ch08-Defensive-Programming)
