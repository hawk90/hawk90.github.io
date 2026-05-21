---
title: "Tip 31: Failing Test Before Fixing Code"
date: 2026-05-11T07:00:00
description: "코드를 고치기 전에 실패하는 테스트를 먼저 작성하라. 버그를 고정시키고 회귀를 막는 안전망이다."
series: "The Pragmatic Programmer"
seriesOrder: 31
tags: [pragmatic-programmer, testing, debugging]
draft: false
---

## 이 팁의 메시지

> **Tip 31: Failing Test Before Fixing Code.** Before you fix a bug, write a test that fails because of the bug.

버그를 고치기 전에 먼저 그 버그 때문에 실패하는 테스트를 작성한다. 테스트가 버그를 *고정*시키면, 코드를 수정해서 테스트를 통과시킨다. 테스트는 코드베이스에 그대로 남아 회귀 방지 역할을 한다.

## 왜 테스트 먼저인가

버그를 발견하고 바로 코드를 고치면 두 가지 문제가 생긴다.

첫째, 정말 고친 건지 확신이 없다. 같은 조건을 재현하기가 생각보다 어렵고, 눈으로 확인한 것은 착각일 수 있다. 둘째, 6개월 후에 같은 버그가 다시 나오면 다시 디버깅해야 한다. 테스트가 있으면 즉시 발견되지만, 테스트가 없으면 사용자가 먼저 발견한다.

테스트를 먼저 작성하면 버그를 *재현 가능한 형태*로 고정시킨다. 고정된 버그는 도망가지 않는다.

## 절차

버그 수정의 표준 절차는 다음과 같다.

1. **재현 조건 파악**: 버그가 일어나는 가장 작은 입력을 찾는다.
2. **테스트 작성**: 그 입력을 넣으면 실패하는 테스트를 만든다.
3. **테스트 실행**: 테스트가 정말 실패하는지 확인한다. 실패하지 않으면 테스트가 잘못된 것이다.
4. **코드 수정**: 버그를 고친다.
5. **테스트 통과**: 테스트가 통과하는지 확인한다.
6. **회귀 확인**: 다른 테스트가 깨지지 않았는지 확인한다.
7. **커밋**: 테스트와 수정을 함께 커밋한다.

## 회귀 방지

한 번 고친 버그가 6개월 후에 다시 나오면 어떻게 될까. 테스트가 있으면 CI가 즉시 알려 준다. 테스트가 없으면 사용자가 보고하기 전까지 모른다.

테스트는 미래의 자기 자신에게 보내는 선물이다. "이 버그는 이미 한 번 잡았다. 다시 만들지 마라."

## TDD와의 관계

TDD(Test-Driven Development)는 *새 기능*에도 테스트를 먼저 작성한다. 이 팁은 버그 수정에 한정된 케이스지만, TDD의 정신과 같다. 테스트가 설계를 이끈다.

## 정리

- 버그를 발견하면 먼저 실패하는 테스트를 작성한다.
- 테스트가 버그를 고정시킨다.
- 코드를 수정해서 테스트를 통과시킨다.
- 테스트는 회귀 방지 안전망이 된다.
- 미래의 자신에게 보내는 선물이다.

## 다음 장 예고

[Tip 32: Read the Damn Error Message](/blog/programming/engineering/pragmatic-programmer/tip32)에서는 에러 메시지를 정말로 읽어야 한다는 점을 다룬다. 가장 값진 정보가 가장 자주 무시된다.

## 관련 항목

- [Tip 30: Don't Panic](/blog/programming/engineering/pragmatic-programmer/tip30)
- [Tip 32: Read the Damn Error Message](/blog/programming/engineering/pragmatic-programmer/tip32)
