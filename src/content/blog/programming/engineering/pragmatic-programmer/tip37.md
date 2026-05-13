---
title: "Tip 37: Design with Contracts"
date: 2026-05-13
description: "계약으로 설계하라 — DBC. 사전 조건·사후 조건·불변식을 — 명시하라."
series: "The Pragmatic Programmer"
seriesOrder: 37
tags: [pragmatic-programmer, design]
draft: true
---

## 이 팁의 메시지

> **Design with Contracts** — Design By Contract(DBC). Bertrand Meyer의 — 정통.

## 핵심 내용

- **사전 조건**(precondition) — 호출자가 보장.
- **사후 조건**(postcondition) — 함수가 보장.
- **불변식**(invariant) — 상시 참인 조건.
- 계약을 — 코드와 문서에 — 명시.

## 계약의 예

```python
def withdraw(account, amount):
    """
    사전: account.balance >= amount, amount > 0.
    사후: account.balance == old_balance - amount.
    불변: account.balance >= 0.
    """
    assert amount > 0
    assert account.balance >= amount
    old_balance = account.balance
    account.balance -= amount
    assert account.balance == old_balance - amount
    assert account.balance >= 0
```

## 누가 잘못?

- 사전 조건 위반 → **호출자**의 잘못.
- 사후 조건 위반 → **함수**의 잘못.
- 책임이 — 명확.

## 게으른 계약

- 입력 검증 X — 사전 조건 가정.
- 결과 검증 X — 사후 조건 가정.

엄격한 DBC가 — 어렵다면 — 최소한 **문서로**.

## 코드의 자기 검증

assert로 — 계약을 — 코드에 표현. 디버그 모드만 — 활성화.

## 정리

- 사전·사후·불변.
- 책임 분리.
- 문서 + assert로 — 표현.

## 관련 항목

- [Tip 36: Can't Write Perfect Software](/blog/programming/engineering/pragmatic-programmer/tip36)
- [Tip 38: Crash Early](/blog/programming/engineering/pragmatic-programmer/tip38)
- [Tip 39: Use Assertions](/blog/programming/engineering/pragmatic-programmer/tip39)
- [Code Complete Ch 8: Defensive Programming](/blog/programming/engineering/code-complete/ch08-Defensive-Programming)
