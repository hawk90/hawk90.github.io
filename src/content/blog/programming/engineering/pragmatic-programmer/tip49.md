---
title: "Tip 49: Programming Is About Code, But Programs Are About Data"
date: 2026-05-11T01:00:00
description: "프로그래밍은 코드에 관한 것이지만, 프로그램은 데이터에 관한 것이다. 데이터의 흐름을 보라."
series: "The Pragmatic Programmer"
seriesOrder: 49
tags: [pragmatic-programmer, design]
draft: false
---

## 이 팁의 메시지

> **Tip 49: Programming Is About Code, But Programs Are About Data.** The shape of your data shapes your code.

데이터의 형태가 코드의 형태를 결정한다.

## 데이터 중심 사고

Linus Torvalds는 이렇게 말했다.

> "나쁜 프로그래머는 코드를 걱정한다. 좋은 프로그래머는 데이터 구조와 그 관계를 걱정한다."

데이터 구조가 좋으면 코드는 자연스럽게 흘러나온다. 데이터 구조가 나쁘면 어떤 코드도 깔끔해질 수 없다.

## 데이터 흐름으로 생각하기

프로그램은 데이터의 변환이다. 입력이 변환1, 변환2, 변환3을 거쳐 출력이 된다. 각 변환 단계에서 데이터의 형태가 어떻게 바뀌는지 생각한다. 함수는 그 변환을 수행하는 도구다.

## 함수형 스타일

함수형 프로그래밍은 이 사고를 명시적으로 표현한다.

```python
# 데이터 흐름이 명확
result = (
    raw_data
    |> parse
    |> validate
    |> transform
    |> save
)
```

각 단계가 데이터를 받아 다음 형태로 변환한다. 코드가 데이터의 여정을 그린다.

## 데이터 구조 먼저

새 기능을 설계할 때 코드를 먼저 쓰지 않는다. 다음 순서로 접근한다.

1. **입력 데이터**가 어떤 형태인가?
2. **출력 데이터**가 어떤 형태여야 하는가?
3. **중간 단계**의 데이터 형태는?
4. 각 변환을 **함수**로 구현

데이터 구조가 정해지면 코드는 따라온다.

## 정리

- 코드는 도구이고, 데이터는 본질이다.
- 데이터 구조가 좋으면 코드가 자연스럽다.
- 프로그램을 데이터의 흐름으로 생각한다.
- 기능 설계 시 데이터 형태를 먼저 정한다.

## 다음 장 예고

[Tip 50: Don't Hoard State; Pass It Around](/blog/programming/engineering/pragmatic-programmer/tip50)에서는 상태를 객체에 쌓지 말고 함수에 전달하라는 점을 다룬다. 함수형 사고의 연장이다.

## 관련 항목

- [Tip 48: If It's Important Enough to Be Global, Wrap It in an API](/blog/programming/engineering/pragmatic-programmer/tip48)
- [Tip 50: Don't Hoard State; Pass It Around](/blog/programming/engineering/pragmatic-programmer/tip50)
