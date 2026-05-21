---
title: "Tip 15: DRY—Don't Repeat Yourself"
date: 2026-05-11T15:00:00
description: "DRY — 시스템 내 모든 지식은 명확한 단일 표현을 가져야 한다."
series: "The Pragmatic Programmer"
seriesOrder: 15
tags: [pragmatic-programmer, design]
draft: false
---

## 이 팁의 메시지

> **Tip 15: DRY — Don't Repeat Yourself.**
>
> *Every piece of knowledge must have a single, unambiguous, authoritative representation within a system.*

DRY는 이 책에서 가장 유명한 원칙이다. 그러나 자주 오해된다. DRY는 코드 중복 회피가 아니라 **지식 중복 회피**다.

## 코드 중복 ≠ 지식 중복

같은 코드가 두 번 나타난다고 해서 항상 DRY 위반은 아니다. 중요한 것은 그 코드가 표현하는 지식이 같은가다.

```python
# 코드가 비슷하지만, 표현하는 지식이 다르다.
def validate_email(s):
    return "@" in s and "." in s

def validate_phone(s):
    return s.isdigit() and len(s) >= 10

# 같은 검증 로직처럼 보여도, 의미가 다르면 중복이 아니다.
```

반대로, 코드는 다르지만 같은 지식을 표현하면 DRY 위반이다.

```python
# 사용자 나이 기준이 두 자리에 있다.
USER_AGE_LIMIT = 30

# 다른 파일에서 같은 값을 다시 쓴다.
if user.age > 30:  # USER_AGE_LIMIT을 참조해야 한다.
    apply_senior_discount()
```

## 지식 중복의 종류

DRY 위반은 여러 형태로 나타난다.

- **코드 중복**: 가장 흔히 말하는 중복. 같은 로직이 여러 자리에 있다.
- **문서 중복**: 코드의 동작을 문서에 다시 쓴다. 코드가 바뀌면 문서가 어긋난다.
- **데이터 중복**: 같은 데이터가 두 자리에 저장된다. 동기화 문제가 생긴다.
- **표현 중복**: 같은 사실을 다른 형식으로 표현한다(API 스키마와 클라이언트 타입 정의).
- **개발자 중복**: 두 명이 모르고 같은 함수를 따로 짠다. 조직의 문제다.

## 우연한 중복은 DRY 위반이 아니다

> 우연히 비슷한 코드를 억지로 추출하면 잘못된 추상이 생긴다.

두 함수가 우연히 같은 5줄을 가졌다고 하자. 지금은 같지만, 각각의 이유로 다르게 진화할 예정이다. 이때 공통 함수로 추출하면 나중에 분리해야 할 때 더 큰 비용을 치른다.

중복을 제거하기 전에 항상 묻는다. "이 두 코드가 같은 이유로 같은가, 우연히 같은가?"

## 적용 전 평가

DRY를 적용할 때 따르는 절차가 있다.

1. 두 코드가 문법적으로 비슷한가? → 비슷하면 다음 단계.
2. 두 코드가 같은 지식을 표현하는가? → 같으면 추출한다.
3. 다른 지식을 표현하는가? → 그대로 둔다.

성급한 추상화는 중복보다 해롭다.

## 정리

- DRY = 지식의 중복 회피. 코드 중복 회피가 아니다.
- 같은 코드라도 의미가 다르면 중복이 아니다.
- 우연한 중복은 추출하지 않는다.
- 중복을 제거하기 전에 "같은 이유로 같은가"를 묻는다.
- 위반하면 어긋남이 생기고, 어긋남이 버그가 된다.

## 다음 장 예고

[Tip 16: Make It Easy to Reuse](/blog/programming/engineering/pragmatic-programmer/tip16)에서는 DRY의 짝을 다룬다. 재사용이 어려우면 사람들은 새로 짠다. 결과적으로 중복이 생긴다.

## 관련 항목

- [Tip 14: Good Design Is Easier to Change Than Bad Design](/blog/programming/engineering/pragmatic-programmer/tip14)
- [Tip 16: Make It Easy to Reuse](/blog/programming/engineering/pragmatic-programmer/tip16)
