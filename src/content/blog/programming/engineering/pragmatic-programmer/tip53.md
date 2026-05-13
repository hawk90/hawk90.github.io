---
title: "Tip 53: Has-A Trumps Is-A"
date: 2026-05-13
description: "Has-A가 Is-A를 이긴다 — 합성을 — 상속보다. 책의 마지막 팁."
series: "The Pragmatic Programmer"
seriesOrder: 53
tags: [pragmatic-programmer, oop]
---

## 이 팁의 메시지

> **Has-A Trumps Is-A** — 합성 > 상속. 책의 — **마지막 팁**.

53개 팁의 — 마지막. 다시 강조 — **합성**이 — 상속보다 — 거의 항상 — 더 낫다.

## 핵심 내용

- "is-a" 관계 — 자주 의심.
- "has-a" 관계 — 자주 자연.
- 합성 — 유연성·테스트성·결합도.
- 상속 — 정말 — is-a인 경우만.

## is-a의 함정

```python
class Stack(list):   # Stack is-a List? — 위험.
    pass

# 그러나 — `list.insert(0, x)`도 — 사용 가능.
# Stack의 — 약속이 — 깨진다.
```

상속한 부모의 — **모든** 메서드를 — 자식도 노출. 의도 X.

## has-a — 합성

```python
class Stack:
    def __init__(self):
        self._items = []  # has-a — list.

    def push(self, x):
        self._items.append(x)

    def pop(self):
        return self._items.pop()
```

내부 = `list`. 그러나 외부 = Stack의 — **자기 약속**만.

## 평가 질문

- "X is a Y" — 정말 "is-a"인가, "behaves like"인가?
- "X has a Y" — 사실인가?
- Y의 — 어느 부분이 — 필요한가?

## 책의 마지막 메시지

53개 팁의 마지막이 — 합성. Hunt & Thomas의 — 강한 권고.

> 상속의 함정에 빠지지 마라. — **has-a**를 — 즐겨라.

## 정리

- has-a > is-a.
- 상속 = 정말 is-a인 경우만.
- 합성 = 유연·테스트·결합.
- **53개 팁의 마지막**.

## 관련 항목

- [Tip 51: Don't Pay Inheritance Tax](/blog/programming/engineering/pragmatic-programmer/tip51)
- [Tip 52: Prefer Interfaces](/blog/programming/engineering/pragmatic-programmer/tip52)
- [Design Patterns: Composition over Inheritance](/blog/programming/design/design-patterns/)
- [Effective Java: Favor Composition over Inheritance](/blog/programming/engineering/effective-java/)
