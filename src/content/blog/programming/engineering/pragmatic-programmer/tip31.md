---
title: "Tip 31: Failing Test Before Fixing Code"
date: 2026-05-13
description: "코드를 고치기 전에 실패하는 테스트를 — 회귀를 막는 안전망."
series: "The Pragmatic Programmer"
seriesOrder: 31
tags: [pragmatic-programmer, testing, debugging]
draft: true
---

## 이 팁의 메시지

> **Failing Test Before Fixing Code** — 버그를 — 테스트로 **고정**시킨 후 — 코드를 고친다.

## 핵심 내용

- 버그 발견 → **테스트** 작성 (실패).
- 코드 수정 → 테스트 통과.
- 테스트는 — 그대로 남는다(회귀 방지).
- 같은 버그가 — 다시 나면 — 즉시 발견.

## 순서

1. 버그 재현 — 작은 입력.
2. 그 입력으로 — **실패하는** 테스트.
3. 테스트가 — 정말 실패하는가 확인.
4. 코드 수정.
5. 테스트 통과.
6. 다른 테스트도 통과 확인.
7. 커밋.

## 왜 테스트 먼저?

- 버그를 — **고정**시킨다.
- 같은 버그가 다시 나는 것을 — 막는다.
- 미래의 자기에게 — 선물.

## 회귀 방지

> 한 번 고친 버그가 — 6개월 후 — 다시 나오면?

테스트가 있으면 — **즉시** 발견. 없으면 — 다시 — 디버깅.

## TDD와의 관계

TDD는 — **새 기능**에도 — 테스트 먼저. 이 팁은 — 버그 수정의 — 한 케이스. TDD의 정신.

## 정리

- 버그 → 테스트 → 수정.
- 테스트가 — 회귀 방지.
- TDD의 정신.

## 관련 항목

- [Tip 30: Don't Panic](/blog/programming/engineering/pragmatic-programmer/tip30)
- [Tip 32: Read the Damn Error Message](/blog/programming/engineering/pragmatic-programmer/tip32)
- [Clean Code Ch 9: Unit Tests](/blog/programming/engineering/clean-code/chapter09-unit-tests)
- [Code Complete Ch 22: Developer Testing](/blog/programming/engineering/code-complete/ch22-Developer-Testing)
