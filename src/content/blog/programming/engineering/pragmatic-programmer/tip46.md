---
title: "Tip 46: Don't Chain Method Calls"
date: 2026-05-11T22:00:00
description: "메서드 호출을 줄줄이 잇지 마라. 데메테르 법칙: 친구의 친구의 친구를 만지지 마라."
series: "The Pragmatic Programmer"
seriesOrder: 46
tags: [pragmatic-programmer, oop]
draft: true
---

## 이 팁의 메시지

> **Tip 46: Don't Chain Method Calls.** Try not to have more than one dot when you access something.

무언가에 접근할 때 점 하나 이상을 쓰지 않도록 노력하라.

## 데메테르 법칙

데메테르 법칙(Law of Demeter)은 "친구에게만 말하라"는 원칙이다. 객체는 직접 친구에게만 메시지를 보내야 한다. 친구의 친구, 친구의 친구의 친구에게 직접 말하면 안 된다.

점(`.`)이 많은 체인은 데메테르 법칙을 위반하는 신호다.

## 나쁜 예: 긴 체인

```python
# 너무 긴 체인
total = order.customer.address.zipcode.region.tax_rate * order.subtotal
```

이 코드는 `order`에서 시작해 `customer`, `address`, `zipcode`, `region`, `tax_rate`까지 5단계를 파고든다. 이 중 어느 하나의 구조가 바뀌면 이 코드도 바꿔야 한다.

## 좋은 예: 의도 표현

```python
# 의도만 표현
total = order.calculate_total_with_tax()
```

호출자는 "세금 포함 총액을 계산해 줘"라는 의도만 표현한다. `order`가 내부에서 어떻게 세금을 계산하든 호출자는 모른다.

## 왜 위험한가

긴 체인은 여러 모듈에 의존한다. 의존이 많을수록 변경에 취약하다.

| 문제 | 설명 |
|------|------|
| 결합도 증가 | 호출자가 내부 구조를 안다 |
| 변경 전파 | 한 곳이 바뀌면 체인 전체가 깨진다 |
| 테스트 어려움 | 중간 객체를 모두 모킹해야 한다 |

## 예외: Fluent API

Fluent API나 빌더 패턴은 긴 체인처럼 보이지만 성격이 다르다.

```python
# Fluent API: 같은 객체를 반환
result = (
    Query()
    .select("name", "email")
    .from_table("users")
    .where("active", True)
    .execute()
)
```

각 메서드가 같은 객체(또는 새 빌더)를 반환한다. 깊이 들어가는 게 아니라 단계를 쌓는 것이다. 이건 괜찮다.

## 구분 기준

- **깊이**: `a.b.c.d.e` 형태로 점점 더 깊은 객체에 접근하면 문제다.
- **빌더**: 같은 객체에서 메서드를 연속 호출하면 괜찮다.

차이점은 "남의 내부에 파고드는가, 자기 상태를 쌓는가"이다.

## 정리

- 점이 많으면 데메테르 법칙 위반의 신호다.
- 친구의 친구의 친구에게 직접 말하지 않는다.
- 의도를 표현하는 메서드를 만들어 내부를 숨긴다.
- Fluent API와 빌더 패턴은 예외다.

## 다음 장 예고

[Tip 47: Avoid Global Data](/blog/programming/engineering/pragmatic-programmer/tip47)에서는 전역 데이터가 왜 위험한지 다룬다.

## 관련 항목

- [Tip 45: Tell, Don't Ask](/blog/programming/engineering/pragmatic-programmer/tip45)
- [Tip 47: Avoid Global Data](/blog/programming/engineering/pragmatic-programmer/tip47)
