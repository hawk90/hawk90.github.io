---
title: "Tip 41: Act Locally"
date: 2026-05-11T17:00:00
description: "지역적으로 행동하라. 변수의 수명을 짧게 유지하고, 부작용을 가까이에서 처리한다."
series: "The Pragmatic Programmer"
seriesOrder: 41
tags: [pragmatic-programmer, design]
draft: true
---

## 이 팁의 메시지

> **Tip 41: Act Locally.** Keep the scope of mutable variables and open resources short and easily visible.

가변 변수와 열린 자원의 범위를 짧게, 쉽게 보이게 유지하라.

## 지역성의 원칙

코드를 읽을 때 한 화면 안에서 흐름이 완결되면 이해하기 쉽다. 변수가 100줄 위에서 선언되고 중간에 여러 번 바뀌면 추적이 어렵다. 부작용(side effect)이 멀리까지 퍼지면 버그를 찾기 어렵다.

지역성은 이해 가능성이다.

## 변수 범위를 좁게

변수는 사용하는 자리 바로 위에서 선언한다.

```python
# 좋은 패턴: 좁은 범위
def process(items):
    for item in items:
        result = transform(item)
        yield result

# 나쁜 패턴: 함수 시작에서 모두 선언
def process(items):
    result = None
    temp = None
    counter = 0
    # ... 100줄 후에 사용 ...
```

C 시절의 습관으로 함수 시작에 변수를 몰아 선언하는 경우가 있다. 현대 언어에서는 필요한 자리에서 선언하는 게 낫다.

## 부작용을 지역화

함수가 전역 상태를 바꾸면 그 함수의 영향 범위는 프로그램 전체다. 함수가 인자를 받아 결과를 반환하면 영향 범위는 그 함수 안이다.

```python
# 좋은 패턴: 부작용 없음
def calculate_total(items):
    return sum(item.price for item in items)

# 나쁜 패턴: 전역 변수 변경
total = 0
def calculate_total(items):
    global total
    for item in items:
        total += item.price
```

전역 변수를 쓰면 다른 함수가 같은 변수를 건드릴 수 있다. 테스트하기도 어렵다.

## 지역성의 이점

- **읽기 쉽다**: 한 자리만 읽으면 흐름을 안다.
- **테스트하기 쉽다**: 함수를 격리해서 테스트할 수 있다.
- **동시성에 안전하다**: 공유 상태가 없으면 경쟁 조건이 없다.
- **리팩토링하기 쉽다**: 범위가 좁으면 추출이 쉽다.

## 정리

- 변수 범위는 가장 좁게 유지한다.
- 부작용은 가까운 자리에서 처리한다.
- 지역성은 이해 가능성과 안전성을 높인다.
- 멀리 가는 작용은 디버깅을 어렵게 만든다.

## 다음 장 예고

[Tip 42: Take Small Steps—Always](/blog/programming/engineering/pragmatic-programmer/tip42)에서는 작은 변경을 자주 하는 것이 왜 안전한지 다룬다.

## 관련 항목

- [Tip 40: Finish What You Start](/blog/programming/engineering/pragmatic-programmer/tip40)
- [Tip 42: Take Small Steps—Always](/blog/programming/engineering/pragmatic-programmer/tip42)
- [Tip 47: Avoid Global Data](/blog/programming/engineering/pragmatic-programmer/tip47)
