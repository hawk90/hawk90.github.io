---
title: "Tip 50: Don't Hoard State; Pass It Around"
date: 2026-05-11T02:00:00
description: "상태를 쌓아두지 말고 전달하라. 함수형 사고로 추론과 테스트를 쉽게 만든다."
series: "The Pragmatic Programmer"
seriesOrder: 50
tags: [pragmatic-programmer, design, functional]
draft: true
---

## 이 팁의 메시지

> **Tip 50: Don't Hoard State; Pass It Around.** Don't hide state in your code; pass it around explicitly.

코드에 상태를 숨기지 마라. 명시적으로 전달하라.

## 상태를 쌓는 방식

객체 지향에서 흔히 보는 패턴이다.

```python
class Calculator:
    def __init__(self):
        self.result = 0

    def add(self, n):
        self.result += n

    def get(self):
        return self.result

# 사용
calc = Calculator()
calc.add(5)
calc.add(3)
total = calc.get()  # 8
```

`Calculator`가 `result` 상태를 보관한다. 연산의 역사가 객체 안에 숨어 있다.

## 상태를 전달하는 방식

함수형 스타일에서는 상태를 명시적으로 전달한다.

```python
def add(state, n):
    return state + n

# 사용
total = add(add(0, 5), 3)  # 8

# 또는 reduce
from functools import reduce
total = reduce(add, [5, 3], 0)
```

상태가 매 단계 드러난다. 함수의 입력과 출력만 보면 동작을 안다.

## 상태 전달의 이점

| 이점 | 설명 |
|------|------|
| 추론 용이 | 입력만 보면 출력을 안다 |
| 테스트 용이 | 함수만 호출하면 된다. 초기화 필요 없다 |
| 동시성 안전 | 공유 상태가 없다 |
| 시간 여행 | 매 단계의 상태를 보존할 수 있다 |

디버깅할 때 중간 상태를 쉽게 확인할 수 있다. 리플레이도 가능하다.

## 언제 상태를 쌓는가

상태를 쌓는 게 적절한 경우도 있다.

- **성능**: 상태 복사 비용이 클 때
- **프레임워크 요구**: GUI 프레임워크가 상태 객체를 요구할 때
- **도메인 모델**: 객체의 정체성이 중요할 때 (예: `User`, `Order`)

그러나 순수 계산 로직에서는 상태 전달이 대부분 더 낫다.

## 정리

- 상태를 객체에 숨기지 않는다.
- 함수 인자로 명시적으로 전달한다.
- 추론, 테스트, 동시성이 쉬워진다.
- 성능이나 프레임워크 요구가 있을 때만 상태를 쌓는다.

## 다음 장 예고

[Tip 51: Don't Pay Inheritance Tax](/blog/programming/engineering/pragmatic-programmer/tip51)에서는 상속의 비용을 다룬다. 상속보다 위임과 조합을 선호하라.

## 관련 항목

- [Tip 49: Programming Is About Code, But Programs Are About Data](/blog/programming/engineering/pragmatic-programmer/tip49)
- [Tip 51: Don't Pay Inheritance Tax](/blog/programming/engineering/pragmatic-programmer/tip51)
- [Tip 47: Avoid Global Data](/blog/programming/engineering/pragmatic-programmer/tip47)
