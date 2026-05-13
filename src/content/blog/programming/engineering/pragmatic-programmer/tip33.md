---
title: "Tip 33: select Isn't Broken"
date: 2026-05-13
description: "select가 망가지지 않았다 — OS·언어·라이브러리는 — 자기 코드보다 — 훨씬 안정적이다."
series: "The Pragmatic Programmer"
seriesOrder: 33
tags: [pragmatic-programmer, debugging]
draft: true
---

## 이 팁의 메시지

> **`select` Isn't Broken** — 유닉스 `select(2)` 시스템 콜은 — 안 망가졌다. 자기 코드가 망가졌다.

## 일화

저자가 — `select()`가 동작하지 않는다고 — 며칠 디버깅. 결국 — 자기 코드의 — 인자 순서 오류.

> "내가 — `select`를 — 잘못 호출했다."

이게 — Tip 29("Fix the Problem, Not the Blame")의 — 한 케이스.

## 핵심 내용

- OS·언어·라이브러리 = **자기 코드보다 안정적**.
- 첫 의심은 — **자기 코드**.
- 자기의 가정이 — 깨졌을 가능성 — 가장 크다.
- "정말 안 망가졌나?" — 검증 후 의심.

## 의심 순서

1. **자기 코드** — 99%.
2. 자기 라이브러리 — 1%.
3. 운영체제·언어 — 거의 0%.

## 가끔의 예외

- 새 베타 버전 — 가능성 약간 있음.
- 특이한 환경 — ARM·embedded.
- 잘 알려진 버그 — 검색하면 나옴.

그러나 — 일반적으로 — **자기 코드 먼저**.

## 정리

- `select`는 안 망가졌다.
- 자기 코드 첫 의심.
- 자기 가정이 — 깨졌을 가능성.

## 관련 항목

- [Tip 29: Fix the Problem](/blog/programming/engineering/pragmatic-programmer/tip29)
- [Tip 32: Read the Error Message](/blog/programming/engineering/pragmatic-programmer/tip32)
- [Tip 34: Don't Assume—Prove](/blog/programming/engineering/pragmatic-programmer/tip34)
