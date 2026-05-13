---
title: "Tip 45: Tell, Don't Ask"
date: 2026-05-13
description: "묻지 말고 시켜라 — 객체에 데이터를 받아 처리하지 말고, 객체에게 일을 시켜라."
series: "The Pragmatic Programmer"
seriesOrder: 45
tags: [pragmatic-programmer, oop]
draft: true
---

## 이 팁의 메시지

> **Tell, Don't Ask** — 객체의 — **데이터**를 — 받지 말고, 객체에게 — **일을 시켜라**.

## 핵심 내용

- 데이터를 — 객체 안에 둔다.
- 행동을 — 데이터 가까이에.
- 호출자 = "이걸 해 줘" 말한다.
- 내부 구현은 — 숨긴다.

## 안 좋은 패턴 — 묻기

```python
# 안 좋은 패턴.
if account.balance > 100:
    account.balance -= 100
```

호출자가 — 데이터를 — 본다. account의 — 내부에 — 의존.

## 좋은 패턴 — 시키기

```python
# Good.
account.withdraw(100)  # 객체가 — 알아서 처리.
```

내부 구현은 — 객체 안에. 호출자는 — 의도만 표현.

## 이점

- **캡슐화** — 내부가 변해도 — 외부 영향 X.
- **응집** — 행동이 — 데이터 가까이.
- **결합 ↓** — 호출자가 — 내부를 모름.

## 예외

- DTO, 값 객체 — 데이터만 들고 가는 객체. 묻기 OK.
- 쿼리 — 답을 받는 게 — 목적.

## 정리

- 데이터 + 행동 = 한 자리.
- 호출자 = 의도 표현.
- 캡슐화·응집·결합.

## 관련 항목

- [Tip 44: Decoupled Code](/blog/programming/engineering/pragmatic-programmer/tip44)
- [Tip 46: Don't Chain Method Calls](/blog/programming/engineering/pragmatic-programmer/tip46)
- [Clean Code Ch 6: Objects and Data Structures](/blog/programming/engineering/clean-code/chapter06-objects-and-data-structures)
