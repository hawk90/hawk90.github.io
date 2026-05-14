---
title: "Tip 22: Program Close to the Problem Domain"
date: 2026-05-13T22:00:00
description: "문제 도메인 가까이에서 프로그램하라 — 도메인 언어를 — 코드에 반영하라."
series: "The Pragmatic Programmer"
seriesOrder: 22
tags: [pragmatic-programmer, design]
draft: true
---

## 이 팁의 메시지

> **Program Close to the Problem Domain** — 코드의 단어 = **도메인의 단어**.

DDD(Domain-Driven Design)의 정신과 한 줄.

## 핵심 내용

- 도메인 단어를 — 코드에 그대로 쓴다.
- 기술 추상화 — 한 발 뒤로.
- 도메인 전문가가 — 코드를 읽을 수 있게.
- 번역 비용 — 줄어든다.

## 좋은 예

```python
# 도메인 가까이.
order.cancel()
customer.suspend()
invoice.send_reminder()
```

도메인 전문가가 — 단어를 안다. 의도가 — 즉시 전달.

## 나쁜 예

```python
# 기술 추상화.
db.update("orders", id=order_id, status="X")
queue.push(MessageType.SUS, customer_id)
mailer.send(template="reminder", to=invoice.email)
```

기술이 — 도메인을 가린다. 전문가가 — 코드를 못 읽음.

## DSL — 작은 도메인 언어

- 설정 — YAML/TOML.
- 빌드 — Makefile, Gradle.
- 데이터 — SQL.
- 도메인 — 자기 DSL.

DSL이 — 도메인을 — 직접 표현.

## 정리

- 코드 단어 = 도메인 단어.
- 도메인 전문가가 읽을 수 있게.
- DSL — 작은 도메인 언어.

## 관련 항목

- [Tip 21: Prototype to Learn](/blog/programming/engineering/pragmatic-programmer/tip21)
- [Tip 23: Estimate](/blog/programming/engineering/pragmatic-programmer/tip23)
- [Domain-Driven Design: Ubiquitous Language](/blog/programming/design/domain-driven-design/chapter02-ubiquitous-language)
