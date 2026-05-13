---
title: "Tip 43: Avoid Fortune-Telling"
date: 2026-05-13
description: "점치지 마라 — 미래의 요구를 — 지금 설계하지 마라. YAGNI."
series: "The Pragmatic Programmer"
seriesOrder: 43
tags: [pragmatic-programmer, design, yagni]
draft: true
---

## 이 팁의 메시지

> **Avoid Fortune-Telling** — "혹시 모르니까 ..." → 거의 항상 — 잘못된 설계.

## 핵심 내용

- 미래는 — 못 본다.
- "혹시 모르니까" 만든 추상 = — 거의 항상 잘못된 추상.
- YAGNI(You Aren't Gonna Need It).
- 지금 필요한 만큼만 — 만든다.

## 점치기의 함정

```python
# 점치기 — "다양한 결제 수단 — 미래에 ..."
class PaymentProcessor:
    def __init__(self):
        self.providers = {}
    def register_provider(self, name, provider):
        self.providers[name] = provider
    def process(self, name, amount):
        return self.providers[name].process(amount)

# 그러나 — 지금 — 결제 수단 한 개만.
```

추상화의 — **세 번째 사용**까지 — 실제 패턴을 모른다. 그 전에 만든 추상 = 잘못.

## YAGNI

> You Aren't Gonna Need It.

지금 필요한 만큼만. 미래의 요구가 나오면 — 그때 — 추상화.

## "혹시 모르니까"가 정당화되는 자리

- 잘 알려진 패턴(예: 데이터베이스 추상).
- 외부 의존(추상은 — 가역성 보호).
- 명확한 가까운 요구.

이 외 — 점치기.

## 정리

- 미래는 — 못 본다.
- "혹시 모르니까" X.
- YAGNI.
- 발견된 패턴만 — 추상화.

## 관련 항목

- [Tip 42: Take Small Steps](/blog/programming/engineering/pragmatic-programmer/tip42)
- [Tip 44: Decoupled Code](/blog/programming/engineering/pragmatic-programmer/tip44)
- [Clean Code Ch 14: Successive Refinement](/blog/programming/engineering/clean-code/chapter14-successive-refinement)
