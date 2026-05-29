---
title: "Tip 51: Don't Pay Inheritance Tax"
date: 2026-05-11T03:00:00
description: "상속세를 내지 마라. 상속은 강결합을 만든다. 인터페이스, 합성, 믹스인이 거의 항상 더 낫다."
series: "The Pragmatic Programmer"
seriesOrder: 51
tags: [pragmatic-programmer, oop]
draft: true
---

## 이 팁의 메시지

> **Tip 51: Don't Pay Inheritance Tax.** Inheritance is rarely the answer.

상속세를 내지 마라. 상속은 거의 답이 아니다.

## 상속의 비용

객체 지향 프로그래밍에서 상속은 강력한 도구로 소개된다. 그러나 실전에서 상속은 비싼 세금을 요구한다.

| 비용 | 설명 |
|------|------|
| 강결합 | 자식 클래스가 부모의 구현에 의존한다 |
| 변경 전파 | 부모 변경이 모든 자식에 영향을 준다 |
| 긴 사슬 | 자식의 자식의 자식으로 이어지면 추적이 어렵다 |
| 다이아몬드 문제 | 다중 상속 시 어느 부모의 메서드를 쓸지 모호하다 |

20주년 개정판에서 Hunt와 Thomas는 상속에 대해 훨씬 회의적인 태도를 보인다. 1판에서는 객체 지향을 강조했지만, 20년간의 경험은 상속의 한계를 명확히 보여주었다.

## 대안 1: 인터페이스

상속 대신 인터페이스를 쓰면 구현이 아닌 계약만 공유한다.

```python
from typing import Protocol

class Bird(Protocol):
    def fly(self) -> None: ...

class Sparrow:
    def fly(self):
        print("날아간다")

class Penguin:
    # fly를 구현하지 않는다. 펭귄은 날지 못한다.
    def swim(self):
        print("헤엄친다")
```

`Sparrow`는 `Bird` 프로토콜을 만족하지만, `Penguin`은 아니다. 상속으로는 이런 구분이 어색해진다. "펭귄은 새다"라고 상속하면 `fly`를 빈 메서드로 오버라이드해야 한다.

## 대안 2: 합성

"is-a" 대신 "has-a"를 쓴다.

```python
class Logger:
    def log(self, msg):
        print(msg)

class Service:
    def __init__(self, logger: Logger):
        self.logger = logger  # 합성

    def do_something(self):
        self.logger.log("작업 수행 중")
        # 실제 작업
```

`Service`가 `Logger`를 상속하지 않고 가진다. 나중에 다른 로거로 교체하기도 쉽다.

## 대안 3: 믹스인

작은 행동 조각을 조합한다.

```python
class Comparable:
    def __lt__(self, other): ...
    def __le__(self, other): ...

class Hashable:
    def __hash__(self): ...

class MyClass(Comparable, Hashable):
    # 두 믹스인의 기능을 조합한다
    ...
```

믹스인은 상속처럼 보이지만, 깊은 계층 대신 얕은 조합을 추구한다.

## 정리

- 상속은 세금이다. 강결합과 변경 전파 비용을 치른다.
- 인터페이스로 계약만 공유한다.
- 합성으로 "has-a" 관계를 표현한다.
- 믹스인으로 작은 행동을 조합한다.
- "is-a"가 정말 맞는지 신중히 따져본다.

## 다음 장 예고

[Tip 52: Prefer Interfaces to Express Polymorphism](/blog/programming/engineering/pragmatic-programmer/tip52)에서는 다형성을 인터페이스로 표현하는 방법을 다룬다.

## 관련 항목

- [Tip 50: Don't Hoard State; Pass It Around](/blog/programming/engineering/pragmatic-programmer/tip50)
- [Tip 52: Prefer Interfaces to Express Polymorphism](/blog/programming/engineering/pragmatic-programmer/tip52)
- [Tip 53: Delegate to Services: Has-A Trumps Is-A](/blog/programming/engineering/pragmatic-programmer/tip53)
