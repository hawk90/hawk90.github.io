---
title: "Tip 29: Fix the Problem, Not the Blame"
date: 2026-05-12T05:00:00
description: "비난이 아니라 문제를 고쳐라 — 누구의 잘못인지 따지는 시간에 — 문제를 해결할 수 있다."
series: "The Pragmatic Programmer"
seriesOrder: 29
tags: [pragmatic-programmer, debugging]
draft: false
---

## 이 팁의 메시지

> **Tip 29: Fix the Problem, Not the Blame.** It doesn't really matter whether the bug is your fault or someone else's—it is still your problem, and it still needs to be fixed.

버그를 만났을 때 "누구의 잘못인가"를 따지는 것은 시간 낭비다. 중요한 것은 문제를 해결하는 것이다. 비난은 학습을 방해한다.

## "내 코드 아니야" 함정

버그를 만나면 종종 이런 생각이 든다.

> "이건 운영체제 버그야."
> "이건 컴파일러 버그야."
> "이건 라이브러리 버그야."

가능성이 없는 것은 아니다. 그러나 확률은 극히 낮다. 99%는 자기 코드의 가정 어딘가가 잘못되었다. 가능성이 낮은 곳부터 찾으면 시간만 흐른다.

## 의심의 순서

버그를 찾을 때 의심의 순서가 있다.

1. **자기 코드**: 가장 가능성이 높다.
2. **사용 중인 라이브러리**: 내가 API를 잘못 쓰고 있을 수 있다.
3. **시스템/언어**: 가능성이 가장 낮다.

이 순서를 따르면 시간을 절약할 수 있다.

## 팀에서의 비난

팀에서 버그가 발견되면 "누가 했어?"라고 묻기 쉽다. 이 질문은 해로운 분위기를 만든다. 사람들은 실수를 숨기게 된다. 학습이 멈춘다.

대신 이렇게 묻는다.

> "어떻게 일어났나?"
> "어떻게 하면 다시 안 일어나게 할 수 있나?"

책임 문화와 비난 문화는 다르다. 책임은 문제를 해결하는 것이고, 비난은 사람을 겨냥하는 것이다.

## 정리

- 비난보다 해결이 먼저다.
- 자기 코드를 가장 먼저 의심한다.
- 팀에서는 "어떻게 일어났나"를 묻는다.
- 비난 문화는 학습을 멈춘다.

## 다음 장 예고

[Tip 30: Don't Panic](/blog/programming/engineering/pragmatic-programmer/tip30)에서는 디버깅의 첫 번째 규칙을 다룬다. 당황하지 말고 체계적으로 접근한다.

## 관련 항목

- [Tip 28: Always Use Version Control](/blog/programming/engineering/pragmatic-programmer/tip28)
- [Tip 30: Don't Panic](/blog/programming/engineering/pragmatic-programmer/tip30)
