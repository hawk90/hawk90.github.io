---
title: "Tip 15: DRY—Don't Repeat Yourself"
date: 2026-05-13T15:00:00
description: "DRY — 시스템 내 모든 지식은 명확한 단일 표현을 가져야 한다."
series: "The Pragmatic Programmer"
seriesOrder: 15
tags: [pragmatic-programmer, design]
draft: true
---

## 이 팁의 메시지

> **DRY — Don't Repeat Yourself.**
>
> *Every piece of knowledge must have a single, unambiguous, authoritative representation within a system.*

이 책의 가장 유명한 원칙. 그러나 — **자주 오해**된다.

## 핵심 내용

- DRY는 — **코드 중복** 회피만이 아니다.
- **지식**(knowledge)의 중복 회피.
- 같은 사실이 — 두 자리에 있으면 — 어긋난다.
- 어긋남이 — 버그를 만든다.

## 오해 — 코드 = 지식 X

같은 줄을 두 번 쓰는 게 — DRY 위반이 아니다. **같은 지식**을 두 번 표현하는 게 위반.

```python
# 코드는 비슷하지만 — 다른 지식.
def validate_email(s): ...   # 이메일 검증.
def validate_phone(s): ...   # 전화 검증.

# 같은 정규식이라도 — 다른 의미면 — 중복 X.
```

반대로:

```python
# 사용자 나이 = 30 (한 자리).
USER_AGE = 30

# 다른 자리에서 — 같은 값을 — 다시 적음.
if user.age > 30: ...   # 위반? 어쩌면.
```

## 종류

- **코드 중복** — 가장 흔히 말하는 것.
- **문서 중복** — 코드와 어긋난다.
- **데이터 중복** — 한 데이터가 두 자리에 있다.
- **표현 중복** — 같은 사실을 — 다르게 표현.
- **개발자 중복** — 두 명이 — 같은 함수를 따로 짠다.

## DRY가 아닌 것

> 우연한 중복은 — DRY 위반 아니다.

두 함수가 — 우연히 같은 줄 5개를 가졌다. 의미는 다르다. → 추출 X. 추출하면 — **잘못된 추상**.

## 적용 전 평가

- 두 줄이 같다 → 의미도 같은가?
- 같다면 → 추출.
- 다르다면 → 그대로 둔다.

## 정리

- DRY = **지식**의 중복 회피.
- 코드 중복 ≠ 지식 중복.
- 우연한 중복 — 그대로 둔다.
- 위반 시 — 어긋남이 버그.

## 관련 항목

- [Tip 14: Good Design Is ETC](/blog/programming/engineering/pragmatic-programmer/tip14)
- [Tip 16: Make It Easy to Reuse](/blog/programming/engineering/pragmatic-programmer/tip16)
- [Clean Code Ch 17: Smells](/blog/programming/engineering/clean-code/chapter17-smells-and-heuristics)
- [Code Complete Ch 6: Working Classes](/blog/programming/engineering/code-complete/ch06-Working-Classes)
