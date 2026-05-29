---
title: "Tip 45: Tell, Don't Ask"
date: 2026-05-11T21:00:00
description: "묻지 말고 시켜라. 객체에서 데이터를 꺼내 처리하지 말고, 객체에게 일을 시켜라."
series: "The Pragmatic Programmer"
seriesOrder: 45
tags: [pragmatic-programmer, oop]
draft: true
---

## 이 팁의 메시지

> **Tip 45: Tell, Don't Ask.** Don't get values from an object, transform them, and stuff them back. Make the object do the work.

객체에서 값을 꺼내고, 변환하고, 다시 넣지 마라. 객체가 일을 하게 하라.

## 묻기 vs 시키기

"묻기"는 객체에서 데이터를 꺼내 호출자가 처리하는 방식이다.

```python
# 묻기: 나쁜 패턴
if account.balance > 100:
    account.balance -= 100
```

호출자가 `balance`를 읽고, 비교하고, 직접 수정한다. 호출자가 `account`의 내부 구현을 알고 있다.

"시키기"는 객체에게 원하는 결과를 요청하는 방식이다.

```python
# 시키기: 좋은 패턴
account.withdraw(100)
```

호출자는 "100을 출금해 줘"라는 의도만 표현한다. 내부 구현은 `account`가 알아서 한다.

## 시키기의 이점

| 이점 | 설명 |
|------|------|
| 캡슐화 | 내부 구현이 바뀌어도 호출자에 영향 없다 |
| 응집력 | 행동이 데이터 가까이에 있다 |
| 결합도 감소 | 호출자가 내부를 모른다 |

`account`가 `balance`를 `Decimal`에서 `int`로 바꿔도 `withdraw()`의 시그니처는 그대로다. 묻기 방식이었다면 호출자를 모두 바꿔야 한다.

## 예외: 데이터 객체

모든 객체가 "시키기"를 따를 필요는 없다. 다음은 예외다.

- **DTO(Data Transfer Object)**: 데이터만 옮기는 객체
- **값 객체(Value Object)**: 불변 데이터를 담는 객체
- **쿼리**: 답을 받는 게 목적인 경우

이런 경우에는 데이터를 요청하는 게 자연스럽다.

## 적용 기준

"이 객체에서 데이터를 꺼내서 내가 처리하고 있나?"라고 물어보라. 그렇다면 그 처리를 객체 안으로 옮길 수 있는지 검토한다.

객체는 데이터와 행동의 묶음이다. 데이터만 꺼내 쓰면 객체가 아니라 구조체다.

## 정리

- 객체에서 데이터를 꺼내 처리하지 않는다.
- 객체에게 원하는 결과를 요청한다.
- 데이터와 행동은 한 자리에 둔다.
- DTO, 값 객체, 쿼리는 예외다.

## 다음 장 예고

[Tip 46: Don't Chain Method Calls](/blog/programming/engineering/pragmatic-programmer/tip46)에서는 메서드 체인이 왜 위험한지, 데메테르 법칙을 다룬다.

## 관련 항목

- [Tip 44: Decoupled Code Is Easier to Change](/blog/programming/engineering/pragmatic-programmer/tip44)
- [Tip 46: Don't Chain Method Calls](/blog/programming/engineering/pragmatic-programmer/tip46)
