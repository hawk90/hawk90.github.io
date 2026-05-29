---
title: "Tip 37: Design with Contracts"
date: 2026-05-11T13:00:00
description: "계약으로 설계하라. 사전 조건·사후 조건·불변식을 명시해서 책임을 분명히 한다."
series: "The Pragmatic Programmer"
seriesOrder: 37
tags: [pragmatic-programmer, design]
draft: true
---

## 이 팁의 메시지

> **Tip 37: Design with Contracts.** Use contracts to document and verify that code does no more and no less than it claims to do.

계약을 사용해서 코드가 주장하는 것 이상도 이하도 아닌 것을 문서화하고 검증하라.

## Design by Contract (DBC)

Design by Contract는 Bertrand Meyer가 Eiffel 언어에서 제안한 개념이다. 함수(또는 메서드)와 호출자 사이에 *계약*을 맺는다.

| 계약 요소 | 설명 | 책임 |
|-----------|------|------|
| 사전 조건(precondition) | 호출 전에 참이어야 하는 조건 | 호출자 |
| 사후 조건(postcondition) | 호출 후에 참이어야 하는 조건 | 함수 |
| 불변식(invariant) | 항상 참이어야 하는 조건 | 양쪽 |

계약이 명확하면 누가 잘못했는지도 명확해진다.

## 예제

다음은 Python 의사 코드로 표현한 은행 출금 함수다.

```python
def withdraw(account, amount):
    """
    사전: account.balance >= amount, amount > 0
    사후: account.balance == old_balance - amount
    불변: account.balance >= 0
    """
    assert amount > 0, "Amount must be positive"
    assert account.balance >= amount, "Insufficient balance"

    old_balance = account.balance
    account.balance -= amount

    assert account.balance == old_balance - amount
    assert account.balance >= 0
```

사전 조건을 어기면 호출자의 잘못이다. 사후 조건을 어기면 함수의 잘못이다. 책임이 분리된다.

## 책임의 분리

계약이 없으면 "누구 잘못이야?"라는 질문에 답하기 어렵다. 계약이 있으면 다음처럼 판단한다.

- **사전 조건 위반**: 호출자가 잘못 호출했다.
- **사후 조건 위반**: 함수 내부에 버그가 있다.

디버깅 시간이 줄어든다.

## 느슨한 계약이라도

언어가 DBC를 지원하지 않아도 최소한 *문서*로 계약을 명시할 수 있다. Docstring에 "이 함수는 amount가 양수라고 가정한다"라고 쓰면 호출자가 책임을 인식한다.

더 나아가 assert로 계약을 코드에 표현하면 디버그 모드에서 자동 검증된다.

## 정리

- 계약은 사전 조건, 사후 조건, 불변식으로 구성된다.
- 사전 조건은 호출자 책임, 사후 조건은 함수 책임이다.
- 계약이 명확하면 디버깅이 쉬워진다.
- 최소한 문서로, 가능하면 assert로 표현한다.

## 다음 장 예고

[Tip 38: Crash Early](/blog/programming/engineering/pragmatic-programmer/tip38)에서는 잘못이 발견되면 즉시 멈춰야 한다는 점을 다룬다. 위장된 회복은 더 큰 문제를 만든다.

## 관련 항목

- [Tip 36: You Can't Write Perfect Software](/blog/programming/engineering/pragmatic-programmer/tip36)
- [Tip 38: Crash Early](/blog/programming/engineering/pragmatic-programmer/tip38)
- [Tip 39: Use Assertions to Prevent the Impossible](/blog/programming/engineering/pragmatic-programmer/tip39)
