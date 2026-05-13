---
title: "Tip 41: Act Locally"
date: 2026-05-13
description: "지역적으로 행동하라 — 변수의 수명을 짧게. 사이드 이펙트를 가까이에서 처리."
series: "The Pragmatic Programmer"
seriesOrder: 41
tags: [pragmatic-programmer, design]
---

## 이 팁의 메시지

> **Act Locally** — 변수·상태·작용을 — **작은 범위**에 가두라.

## 핵심 내용

- 변수 범위 — 가장 좁게.
- 사이드 이펙트 — 가까운 자리에.
- 멀리 가는 작용 = 어려운 디버깅.
- 지역성 = **이해 가능성**.

## 변수 범위

```python
# Good — 좁은 범위.
def process(items):
    for item in items:
        result = transform(item)
        yield result

# 안 좋은 패턴 — 함수 시작에서 — 모두 선언.
def process(items):
    result = None
    temp = None
    counter = 0
    # ... 100 줄 후 ...
```

## 사이드 이펙트의 지역화

```python
# Good — 지역적.
def calculate_total(items):
    return sum(item.price for item in items)

# 안 좋은 패턴 — 전역에 — 작용.
total = 0
def calculate_total(items):
    global total
    for item in items:
        total += item.price
```

## 이점

- 한 자리만 — 읽으면 — 흐름 안다.
- 다른 함수에 — 영향 X.
- 테스트 — 격리.
- 동시성 — 안전.

## 정리

- 변수 — 좁게.
- 작용 — 가까이.
- 지역성 = 이해 + 안전.

## 관련 항목

- [Tip 40: Finish What You Start](/blog/programming/engineering/pragmatic-programmer/tip40)
- [Tip 42: Take Small Steps](/blog/programming/engineering/pragmatic-programmer/tip42)
- [Tip 47: Avoid Global Data](/blog/programming/engineering/pragmatic-programmer/tip47)
