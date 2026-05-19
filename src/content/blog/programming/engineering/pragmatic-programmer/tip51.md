---
title: "Tip 51: Don't Pay Inheritance Tax"
date: 2026-05-11T03:00:00
description: "상속세를 내지 마라 — 상속은 비싸다. 인터페이스·합성·믹스인이 — 거의 항상 더 낫다."
series: "The Pragmatic Programmer"
seriesOrder: 51
tags: [pragmatic-programmer, oop]
draft: true
---

## 이 팁의 메시지

> **Don't Pay Inheritance Tax** — 상속은 — **세금**. 거의 항상 — 다른 옵션이 더 낫다.

20주년 개정판의 — 강한 메시지. 1판에서는 OO 강조였지만 — 20년 후 — Hunt & Thomas는 — **상속에 회의적**.

## 핵심 내용

- 상속 = 강결합.
- 부모 변경 → 모든 자식 영향.
- 다중 상속 — 복잡.
- 합성·인터페이스·믹스인 — 더 유연.

## 상속의 세금

- **강결합** — 자식이 — 부모의 구현에 의존.
- **변경 위험** — 부모 변경이 — 자식에 — 영향.
- **사슬** — 자식의 자식의 자식 ...
- **이중 상속** — 다이아몬드 문제.

## 대안 1 — 인터페이스

```python
# 상속 X — 인터페이스 구현.
class Bird(Protocol):
    def fly(self) -> None: ...

class Sparrow:
    def fly(self): ...

class Penguin:
    # fly X — 안 구현. 인터페이스 자체에서 안 가짐.
    def swim(self): ...
```

## 대안 2 — 합성

```python
# is-a 대신 — has-a.
class Logger:
    def log(self, msg): ...

class Service:
    def __init__(self, logger: Logger):
        self.logger = logger   # 합성.

    def do_something(self):
        self.logger.log("...")
```

## 대안 3 — 믹스인

```python
# 작은 행동의 — 조합.
class Comparable:
    def __lt__(self, other): ...

class Hashable:
    def __hash__(self): ...

class MyClass(Comparable, Hashable):
    ...
```

## 정리

- 상속 = 세금.
- 인터페이스·합성·믹스인 — 거의 항상 더.
- is-a 신중히, has-a 즐겨.

## 관련 항목

- [Tip 50: Don't Hoard State](/blog/programming/engineering/pragmatic-programmer/tip50)
- [Tip 52: Prefer Interfaces](/blog/programming/engineering/pragmatic-programmer/tip52)
- [Tip 53: Has-A Trumps Is-A](/blog/programming/engineering/pragmatic-programmer/tip53)
- [Design Patterns: Composition over Inheritance](/blog/programming/design/design-patterns/)
