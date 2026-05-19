---
title: "Tip 48: If It's Important Enough to Be Global, Wrap It in an API"
date: 2026-05-11T00:00:00
description: "전역으로 둘 만큼 중요하면 — API로 감싸라. 직접 접근 X, 메서드를 통해."
series: "The Pragmatic Programmer"
seriesOrder: 48
tags: [pragmatic-programmer, design]
draft: true
---

## 이 팁의 메시지

> **If It's Important Enough to Be Global, Wrap It in an API** — 전역이 — 정말 필요하다면 — 적어도 — **API**를 통해.

Tip 47과 짝. "전역을 피하라"가 — 어려운 경우 — "최소한 직접 접근 X".

## 핵심 내용

- 전역 데이터 직접 X.
- API(메서드)로 — 감싼다.
- 내부 구현 — 숨겨진다.
- 변경 시 — 한 자리만.

## 예 — 설정

```python
# 안 좋은 패턴 — 직접 접근.
config["database"]["host"]

# Good — API.
config.get_database_host()
```

- 내부가 — dict인지 — 객체인지 — 모름.
- 구조가 변해도 — API만 — 안정.

## 예 — 로깅

```python
# Good — 전역 로거를 — API로.
logger.info("User logged in", user_id=123)

# 내부 = 전역 로거. 그러나 호출자는 — API만.
```

## 이점

- **변경 격리** — 내부가 변해도 — 호출자 안 깨짐.
- **접근 제어** — 변경 자리를 — 통제.
- **테스트** — API를 — 모킹.
- **추가 로직** — 로깅·검증 — 한 자리.

## 정리

- 전역 = 위험.
- 어쩔 수 없으면 — API로.
- 변경·접근·테스트 — 안전.

## 관련 항목

- [Tip 47: Avoid Global Data](/blog/programming/engineering/pragmatic-programmer/tip47)
- [Tip 49: About Code and Data](/blog/programming/engineering/pragmatic-programmer/tip49)
