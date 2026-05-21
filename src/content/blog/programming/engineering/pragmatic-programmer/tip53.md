---
title: "Tip 53: Delegate to Services: Has-A Trumps Is-A"
date: 2026-05-11T05:00:00
description: "서비스에 위임하라. Has-A가 Is-A를 이긴다. 합성이 상속보다 거의 항상 더 낫다."
series: "The Pragmatic Programmer"
seriesOrder: 53
tags: [pragmatic-programmer, oop]
draft: false
---

## 이 팁의 메시지

> **Tip 53: Delegate to Services: Has-A Trumps Is-A.** Prefer composition to inheritance.

서비스에 위임하라. Has-A가 Is-A를 이긴다.

## 상속의 함정

"X는 Y의 일종이다(is-a)"라는 문장이 맞는 것 같아도, 상속은 종종 문제를 일으킨다.

```python
class Stack(list):
    pass

stack = Stack()
stack.push = stack.append  # append를 push로 쓰자
stack.push(1)
stack.push(2)

# 그런데 list의 다른 메서드도 쓸 수 있다
stack.insert(0, 999)  # 스택 규칙 위반
```

`Stack`이 `list`를 상속하면, `list`의 모든 메서드가 노출된다. `insert`, `reverse`, `sort` 같은 메서드가 스택의 LIFO 규칙을 깨뜨린다.

## 합성으로 해결

상속 대신 합성을 쓴다.

```python
class Stack:
    def __init__(self):
        self._items = []  # has-a

    def push(self, item):
        self._items.append(item)

    def pop(self):
        return self._items.pop()

    def is_empty(self):
        return len(self._items) == 0
```

내부적으로는 `list`를 쓰지만, 외부에는 `push`, `pop`, `is_empty`만 노출한다. 스택의 규칙을 완벽히 지킨다.

## 서비스에 위임

합성의 핵심은 *위임(delegation)*이다. 직접 하지 않고 다른 객체에게 맡긴다.

```python
class OrderProcessor:
    def __init__(self, validator, pricer, notifier):
        self.validator = validator
        self.pricer = pricer
        self.notifier = notifier

    def process(self, order):
        self.validator.validate(order)  # 위임
        total = self.pricer.calculate(order)  # 위임
        self.notifier.send(order, total)  # 위임
        return total
```

`OrderProcessor`는 검증, 가격 계산, 알림을 각각 다른 서비스에 위임한다. 각 서비스를 교체하거나 모킹하기 쉽다.

## 판단 기준

상속과 합성 중 무엇을 쓸지 고민될 때 다음을 물어본다.

| 질문 | 상속 | 합성 |
|------|------|------|
| "X는 정말 Y의 일종인가?" | 예 | 아니오 |
| "Y의 모든 메서드가 X에서도 의미 있는가?" | 예 | 아니오 |
| "X가 Y의 내부 구현에 의존해도 괜찮은가?" | 예 | 아니오 |

세 질문 모두 "예"가 아니면 합성을 쓴다. 대부분의 경우 합성이 맞다.

## 실전 예

**상속이 맞는 경우**: `FileNotFoundException`이 `IOException`을 상속. 파일을 못 찾는 것은 정말 IO 예외의 일종이다.

**합성이 맞는 경우**: `Car`가 `Engine`을 가진다. 자동차는 엔진의 일종이 아니라, 엔진을 가진다.

```python
class Car:
    def __init__(self, engine: Engine):
        self.engine = engine

    def start(self):
        self.engine.ignite()
```

## 정리

- "is-a"가 정말 맞는지 신중히 따진다.
- 대부분의 경우 "has-a"가 더 자연스럽다.
- 합성은 유연성, 테스트 용이성, 낮은 결합도를 준다.
- 서비스에 위임하면 각 책임이 명확해진다.
- 상속은 정말 계층 관계가 있을 때만 쓴다.

## 다음 장 예고

[Tip 54: Parameterize Your App Using External Configuration](/blog/programming/engineering/pragmatic-programmer/tip54)에서는 설정을 외부에 두어 유연성을 확보하는 방법을 다룬다.

## 관련 항목

- [Tip 51: Don't Pay Inheritance Tax](/blog/programming/engineering/pragmatic-programmer/tip51)
- [Tip 52: Prefer Interfaces to Express Polymorphism](/blog/programming/engineering/pragmatic-programmer/tip52)
- [Tip 50: Don't Hoard State; Pass It Around](/blog/programming/engineering/pragmatic-programmer/tip50)
