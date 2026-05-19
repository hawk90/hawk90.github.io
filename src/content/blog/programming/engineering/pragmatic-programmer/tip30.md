---
title: "Tip 30: Don't Panic"
date: 2026-05-11T06:00:00
description: "당황하지 마라 — Hitchhiker's Guide의 가르침. 한 발 뒤로 — 깊게 호흡."
series: "The Pragmatic Programmer"
seriesOrder: 30
tags: [pragmatic-programmer, debugging]
draft: true
---

## 이 팁의 메시지

> **Don't Panic** — *Hitchhiker's Guide to the Galaxy*의 표지. Hunt & Thomas의 디버깅 첫 규칙.

## 핵심 내용

- 당황 = 사고 능력 마비.
- 한 발 뒤로.
- 호흡.
- **체계적**으로 접근.

## 당황의 패턴

- 무작위로 — 자리 바꿔 본다.
- "이것이 되었으면 ..." 빌어 본다.
- 깊이 — 안 본다.
- 같은 자리 — 반복 검사.

이 모드에서는 — 시간만 흐른다.

## 체계적 접근

1. **재현** — 버그가 — 항상 일어나는가, 가끔인가?
2. **격리** — 어느 코드 줄까지 — 정상?
3. **가설** — 어떤 가정이 — 깨졌는가?
4. **검증** — 가설을 — 데이터로 확인.
5. **수정** — 한 자리만.
6. **회귀** — 다른 곳이 — 깨지지 않았는가?

## 디버거 + 로그

- 작은 버그 — 로그면 충분.
- 복잡한 버그 — 디버거.
- 동시성 — 로그 + 시점 표시.

## 정리

- 당황 = 시간 낭비.
- 한 발 뒤로 — 체계적.
- 6단계: 재현→격리→가설→검증→수정→회귀.

## 관련 항목

- [Tip 29: Fix the Problem](/blog/programming/engineering/pragmatic-programmer/tip29)
- [Tip 31: Failing Test Before Fixing](/blog/programming/engineering/pragmatic-programmer/tip31)
- [Code Complete Ch 23: Debugging](/blog/programming/engineering/code-complete/ch23-Debugging)
