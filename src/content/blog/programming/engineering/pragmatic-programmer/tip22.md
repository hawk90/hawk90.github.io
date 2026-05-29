---
title: "Tip 22: Program Close to the Problem Domain"
date: 2026-05-11T22:00:00
description: "문제 도메인 가까이에서 프로그램하라 — 도메인 언어를 — 코드에 반영하라."
series: "The Pragmatic Programmer"
seriesOrder: 22
tags: [pragmatic-programmer, design]
draft: true
---

## 이 팁의 메시지

> **Tip 22: Program Close to the Problem Domain.** Design and code in the language of the problem domain.

코드에서 쓰는 단어가 도메인 전문가가 쓰는 단어와 같아야 한다. 기술 추상화가 도메인을 가리면 의사소통이 어려워진다. Domain-Driven Design의 "보편 언어(Ubiquitous Language)"와 같은 정신이다.

## 도메인 가까이 vs 기술 추상화

같은 기능을 두 가지 방식으로 표현할 수 있다.

```python
# 도메인 가까이
order.cancel()
customer.suspend()
invoice.send_reminder()
```

```python
# 기술 추상화
db.update("orders", id=order_id, status="X")
queue.push(MessageType.SUS, customer_id)
mailer.send(template="reminder", to=invoice.email)
```

첫 번째 코드는 도메인 전문가가 읽을 수 있다. "주문을 취소하고, 고객을 중지하고, 청구서 리마인더를 보낸다." 두 번째 코드는 기술 세부 사항이 의도를 가린다.

## 번역 비용

코드가 도메인에서 멀어지면 번역 비용이 생긴다.

개발자가 도메인 전문가와 대화한다. 전문가는 "주문 취소"를 말한다. 개발자는 머릿속에서 "`db.update` with `status='X'`"로 번역한다. 이 번역 과정에서 오해가 생긴다. 도메인 단어를 코드에 그대로 쓰면 번역이 필요 없다.

## DSL — 작은 도메인 언어

도메인 언어를 더 밀어붙이면 DSL(Domain-Specific Language)이 된다.

- **설정**: YAML, TOML
- **빌드**: Makefile, Gradle
- **데이터 질의**: SQL
- **인프라**: Terraform HCL

DSL은 도메인의 개념을 직접 표현한다. 범용 프로그래밍 언어보다 표현력이 높다.

## 적용하기

도메인 가까이 프로그래밍하려면 다음을 실천한다.

- 도메인 전문가가 쓰는 단어를 코드에 그대로 쓴다.
- 기술 추상화(DB, 큐, HTTP)를 도메인 메서드 뒤에 숨긴다.
- 새 용어를 만들 때 도메인 전문가와 합의한다.
- 코드 리뷰에서 "이 단어가 도메인 용어인가?"를 묻는다.

## 정리

- 코드의 단어 = 도메인의 단어.
- 도메인 전문가가 코드를 읽을 수 있어야 한다.
- 기술 추상화는 도메인 뒤에 숨긴다.
- DSL로 도메인을 직접 표현할 수 있다.

## 다음 장 예고

[Tip 23: Estimate to Avoid Surprises](/blog/programming/engineering/pragmatic-programmer/tip23)에서는 추정의 목적이 정확한 예측이 아니라 위험 발견임을 다룬다.

## 관련 항목

- [Tip 21: Prototype to Learn](/blog/programming/engineering/pragmatic-programmer/tip21)
- [Tip 23: Estimate to Avoid Surprises](/blog/programming/engineering/pragmatic-programmer/tip23)
