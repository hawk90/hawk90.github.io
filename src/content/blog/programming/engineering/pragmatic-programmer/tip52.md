---
title: "Tip 52: Prefer Interfaces to Express Polymorphism"
date: 2026-05-13
description: "다형성은 인터페이스로 표현하라 — 추상 클래스보다 인터페이스가 — 더 가볍고 유연."
series: "The Pragmatic Programmer"
seriesOrder: 52
tags: [pragmatic-programmer, oop]
---

## 이 팁의 메시지

> **Prefer Interfaces to Express Polymorphism** — 다형성 = 인터페이스(또는 프로토콜). 추상 클래스 X.

## 핵심 내용

- 다형성 = "여러 형태가 — 같은 인터페이스".
- 인터페이스 = **계약만** — 구현 X.
- 추상 클래스 = 계약 + 일부 구현.
- 다형성에는 — 인터페이스가 — 깔끔.

## 예 — 인터페이스

```python
from typing import Protocol

class Logger(Protocol):
    def log(self, msg: str) -> None: ...

# 어느 클래스든 — `log` 메서드만 있으면 — Logger.
class ConsoleLogger:
    def log(self, msg): print(msg)

class FileLogger:
    def log(self, msg): ...

def use(logger: Logger):
    logger.log("Hello")
```

## 인터페이스의 이점

- **다중 구현** — 한 클래스가 — 여러 인터페이스 구현.
- **상속 X** — 강결합 X.
- **테스트** — 모킹 쉬움.
- **명시적 계약** — 무엇을 약속하는지 — 명확.

## 추상 클래스의 자리

- **공유 구현** — 부분 구현을 — 공유하고 싶을 때.
- **템플릿 메서드** — 알고리즘의 — 뼈대 + 단계.

이런 경우 외 — 인터페이스.

## 정리

- 다형성 = 인터페이스.
- 추상 클래스 = 공유 구현 필요할 때만.
- 다중 구현·테스트·계약.

## 관련 항목

- [Tip 51: Don't Pay Inheritance Tax](/blog/programming/engineering/pragmatic-programmer/tip51)
- [Tip 53: Has-A Trumps Is-A](/blog/programming/engineering/pragmatic-programmer/tip53)
- [Effective Java: Prefer Interfaces to Abstract Classes](/blog/programming/engineering/effective-java/)
