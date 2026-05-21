---
title: "Tip 33: \"select\" Isn't Broken"
date: 2026-05-11T09:00:00
description: "select가 망가지지 않았다. OS·언어·라이브러리는 자기 코드보다 훨씬 안정적이다."
series: "The Pragmatic Programmer"
seriesOrder: 33
tags: [pragmatic-programmer, debugging]
draft: false
---

## 이 팁의 메시지

> **Tip 33: "select" Isn't Broken.** It is rare to find a bug in the OS or the compiler, or even a third-party product or library. The bug is most likely in the application.

OS나 컴파일러, 심지어 서드파티 라이브러리에서 버그를 찾는 일은 드물다. 버그는 거의 항상 자기 코드에 있다.

## 일화

저자 중 한 명이 유닉스의 `select(2)` 시스템 콜이 동작하지 않는다고 며칠을 디버깅했다. 결국 원인은 자기 코드의 인자 순서 오류였다. `select`가 망가진 게 아니었다. 자기가 `select`를 잘못 호출한 것이다.

이 이야기가 팁의 제목이 된 이유다.

## 의심의 순서

버그를 찾을 때는 다음 순서로 의심한다.

| 순서 | 대상 | 확률 |
|------|------|------|
| 1 | 자기 코드 | 99% |
| 2 | 자기가 사용하는 라이브러리의 *사용법* | 0.9% |
| 3 | 라이브러리 자체의 버그 | 0.09% |
| 4 | 운영체제·언어·컴파일러 | 0.01% |

확률이 99%인 자리를 건너뛰고 0.01%인 자리부터 의심하면 시간만 흐른다.

## 왜 시스템은 안정적인가

운영체제나 언어 런타임은 수백만 명이 수십 년간 사용해 왔다. 명백한 버그는 이미 발견되고 수정됐다. 자기 코드는 자기와 동료 몇 명만 본다. 어느 쪽에 버그가 있을 확률이 높겠는가.

물론 예외는 있다. 새 베타 버전, 특이한 환경(임베디드, ARM 등), 또는 이미 알려진 버그라면 시스템을 의심할 수도 있다. 그러나 일반적인 상황에서는 자기 코드를 먼저 본다.

## Tip 29의 연장선

이 팁은 [Tip 29: Fix the Problem, Not the Blame](/blog/programming/engineering/pragmatic-programmer/tip29)의 연장선이다. "내 코드가 아니라 OS 버그야"라고 말하는 것은 비난의 한 형태다. 비난을 멈추고 자기 코드를 검토하면 버그가 더 빨리 잡힌다.

## 정리

- `select`는 망가지지 않았다.
- 자기 코드를 먼저 의심한다.
- 시스템은 수백만 명이 테스트했다.
- 자기 코드는 자기만 테스트했다.
- 예외는 있지만 드물다.

## 다음 장 예고

[Tip 34: Don't Assume It—Prove It](/blog/programming/engineering/pragmatic-programmer/tip34)에서는 가정을 의심하고 데이터로 증명해야 한다는 점을 다룬다.

## 관련 항목

- [Tip 29: Fix the Problem, Not the Blame](/blog/programming/engineering/pragmatic-programmer/tip29)
- [Tip 32: Read the Damn Error Message](/blog/programming/engineering/pragmatic-programmer/tip32)
- [Tip 34: Don't Assume It—Prove It](/blog/programming/engineering/pragmatic-programmer/tip34)
