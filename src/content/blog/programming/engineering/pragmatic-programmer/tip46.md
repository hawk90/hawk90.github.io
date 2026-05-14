---
title: "Tip 46: Don't Chain Method Calls"
date: 2026-05-14T22:00:00
description: "메서드 호출을 줄줄이 잇지 마라 — 데메테르 법칙. 친구의 친구의 친구를 만지지 마라."
series: "The Pragmatic Programmer"
seriesOrder: 46
tags: [pragmatic-programmer, oop]
draft: true
---

## 이 팁의 메시지

> **Don't Chain Method Calls** — `a.b().c().d().e()` = — 너무 많은 의존.

데메테르 법칙(Law of Demeter)의 — 한 표현.

## 핵심 내용

- 한 객체는 — **직접 친구**에게만 — 말한다.
- 친구의 친구 — 안 만진다.
- 체인 = 다중 의존 = 깨질 위험.

## 안 좋은 예

```python
# 너무 긴 체인.
total = order.customer.address.zipcode.region.tax_rate * order.subtotal
```

- `order` → `customer` → `address` → `zipcode` → `region` → `tax_rate`.
- 어느 하나의 구조가 변하면 — 깨진다.

## 좋은 예

```python
# 의도를 묻는다.
total = order.calculate_total_with_tax()
```

order가 — 내부에서 — 처리. 호출자는 — 친구의 친구를 — 모름.

## 예외 — Fluent API

```python
# Builder/Fluent — 같은 객체를 반환.
result = (
    Query()
    .select("name", "email")
    .from_table("users")
    .where("active", True)
    .execute()
)
```

각 호출이 — 같은 객체를 — 반환. 깊이 들어가지 — 않는다. OK.

## 정리

- 체인 ≠ 길이.
- **깊이**가 — 문제.
- 친구의 친구 — 안 만짐.
- Fluent — 다른 종류.

## 관련 항목

- [Tip 45: Tell, Don't Ask](/blog/programming/engineering/pragmatic-programmer/tip45)
- [Tip 47: Avoid Global Data](/blog/programming/engineering/pragmatic-programmer/tip47)
- [Clean Code Ch 6: Objects and Data Structures](/blog/programming/engineering/clean-code/chapter06-objects-and-data-structures)
