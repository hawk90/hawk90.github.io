---
title: "Tip 50: Don't Hoard State; Pass It Around"
date: 2026-05-13
description: "상태를 쌓아두지 말고 — 전달하라. 함수형 사고."
series: "The Pragmatic Programmer"
seriesOrder: 50
tags: [pragmatic-programmer, design, functional]
draft: true
---

## 이 팁의 메시지

> **Don't Hoard State; Pass It Around** — 객체에 — 상태를 쌓지 말고, 함수에 — 전달.

## 핵심 내용

- 상태 = **명시적**으로 — 흐른다.
- 객체 내부에 — 숨기지 X.
- 함수형 스타일의 — 정신.
- 추론·테스트 — 쉬워진다.

## 안 좋은 패턴 — 상태 쌓기

```python
class Calculator:
    def __init__(self):
        self.result = 0

    def add(self, n):
        self.result += n

    def get(self):
        return self.result

# 사용.
calc = Calculator()
calc.add(5)
calc.add(3)
total = calc.get()  # 8
```

`Calculator`가 — 상태를 — 보관.

## 좋은 패턴 — 상태 전달

```python
def add(state, n):
    return state + n

# 사용.
total = add(add(0, 5), 3)  # 8
# 또는.
from functools import reduce
total = reduce(add, [5, 3], 0)
```

상태가 — 매 단계 — 명시적.

## 이점

- **추론** — 입력만 보면 — 출력 안다.
- **테스트** — 함수만 — 호출.
- **동시성** — 공유 상태 X.
- **시간 여행** — 매 단계의 상태 — 보존.

## 정리

- 상태 쌓기 X.
- 매 함수에 — 명시적 전달.
- 함수형 정신.

## 관련 항목

- [Tip 49: About Code and Data](/blog/programming/engineering/pragmatic-programmer/tip49)
- [Tip 51: Don't Pay Inheritance Tax](/blog/programming/engineering/pragmatic-programmer/tip51)
- [Tip 47: Avoid Global Data](/blog/programming/engineering/pragmatic-programmer/tip47)
