---
title: "Tip 30: Don't Panic"
date: 2026-05-12T06:00:00
description: "당황하지 마라 — Hitchhiker's Guide의 가르침. 한 발 뒤로 — 깊게 호흡."
series: "The Pragmatic Programmer"
seriesOrder: 30
tags: [pragmatic-programmer, debugging]
draft: true
---

## 이 팁의 메시지

> **Tip 30: Don't Panic.** Whether it's the office, the media, or your own head—don't panic!

*Hitchhiker's Guide to the Galaxy*의 표지에 쓰인 문구다. 디버깅의 첫 번째 규칙이기도 하다. 당황하면 사고 능력이 마비된다. 한 발 뒤로 물러서고, 깊게 호흡하고, 체계적으로 접근해야 한다.

## 당황의 패턴

당황하면 다음과 같은 행동을 한다.

- 무작위로 코드를 바꿔 본다. "이것만 고치면 되겠지."
- "제발 되어라" 하고 빈다.
- 깊이 보지 않고 표면만 건드린다.
- 같은 자리를 반복해서 검사한다.

이 상태에서는 시간만 흐르고 버그는 안 잡힌다.

## 체계적 접근

당황을 멈추고 다음 단계를 따른다.

1. **재현**: 버그가 항상 일어나는가, 가끔인가? 재현 조건을 정확히 파악한다.
2. **격리**: 어느 코드까지 정상인가? 이분 탐색으로 범위를 좁힌다.
3. **가설**: 어떤 가정이 깨졌는가? 가설을 세운다.
4. **검증**: 가설을 데이터로 확인한다. 로그, 디버거, 테스트.
5. **수정**: 한 자리만 고친다. 여러 자리를 동시에 바꾸면 뭐가 효과인지 모른다.
6. **회귀**: 다른 곳이 깨지지 않았는지 확인한다.

이 과정을 따르면 버그는 결국 잡힌다.

## 도구 활용

상황에 따라 도구를 선택한다.

- **간단한 버그**: 로그 몇 줄이면 충분하다.
- **복잡한 버그**: 디버거로 상태를 추적한다.
- **동시성 버그**: 로그에 타임스탬프를 찍어서 순서를 파악한다.

도구는 체계적 접근을 돕는다. 그러나 도구보다 중요한 것은 침착함이다.

## 정리

- 당황 = 시간 낭비. 사고가 마비된다.
- 한 발 뒤로 물러서서 체계적으로.
- 재현 → 격리 → 가설 → 검증 → 수정 → 회귀.
- 도구를 활용하되, 침착함이 먼저다.

## 다음 장 예고

[Tip 31: Failing Test Before Fixing Code](/blog/programming/engineering/pragmatic-programmer/tip31)에서는 버그를 고치기 전에 먼저 실패하는 테스트를 작성해야 한다는 점을 다룬다.

## 관련 항목

- [Tip 29: Fix the Problem, Not the Blame](/blog/programming/engineering/pragmatic-programmer/tip29)
- [Tip 31: Failing Test Before Fixing Code](/blog/programming/engineering/pragmatic-programmer/tip31)
