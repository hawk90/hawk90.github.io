---
title: "Tip 49: Programming Is About Code, But Programs Are About Data"
date: 2026-05-13
description: "프로그래밍은 코드에 관한 것이지만, 프로그램은 데이터에 관한 것 — 데이터의 흐름을 보라."
series: "The Pragmatic Programmer"
seriesOrder: 49
tags: [pragmatic-programmer, design]
draft: true
---

## 이 팁의 메시지

> **Programming Is About Code, But Programs Are About Data** — 코드는 — 도구. 프로그램의 본질 = **데이터**.

## 핵심 내용

- 데이터의 흐름이 — 프로그램.
- 코드 = 데이터를 — 변환하는 도구.
- 데이터 구조 — 알면 — 코드가 — 흘러나온다.
- "데이터 우선" 설계.

## Linus Torvalds의 말

> "Bad programmers worry about the code. Good programmers worry about data structures and their relationships."

데이터 구조가 — 좋으면 — 코드는 — 자연스럽다. 데이터 구조가 — 나쁘면 — 어떤 코드도 — 안 좋다.

## 데이터 흐름

- **입력** → **변환** → **출력**.
- 각 단계의 — 데이터 모양.
- 함수 = 데이터의 — 변환기.

## 함수형 스타일

```python
# 데이터의 흐름이 — 명확.
result = (
    raw_data
    | parse
    | validate
    | transform
    | save
)
```

각 단계가 — 데이터를 — 다음 모양으로.

## 정리

- 코드 = 도구.
- 데이터 = 본질.
- 데이터 구조부터 — 설계.

## 관련 항목

- [Tip 48: Wrap Global in API](/blog/programming/engineering/pragmatic-programmer/tip48)
- [Tip 50: Don't Hoard State](/blog/programming/engineering/pragmatic-programmer/tip50)
- [Code Complete Ch 12: Fundamental Data Types](/blog/programming/engineering/code-complete/ch12-Fundamental-Data-Types)
