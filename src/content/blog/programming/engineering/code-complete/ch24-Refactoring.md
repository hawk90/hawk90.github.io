---
title: "Chapter 24: Refactoring"
date: 2026-06-21T00:00:00
description: "리팩토링 — 외부 동작은 보존, 내부 구조를 개선. 카탈로그·언제·테스트로 검증."
series: "Code Complete"
seriesOrder: 24
tags: [code-complete, refactoring, McConnell]
---

## 이 챕터의 메시지

리팩토링은 — **외부 동작을 바꾸지 않으면서 내부 구조를 개선**하는 일이다. Martin Fowler의 책이 표준이지만, McConnell도 한 챕터를 할애한다.

> 좋은 시스템 = **계속 리팩토링되는** 시스템.

## 핵심 내용

- 리팩토링 = **외부 동작 보존, 내부 개선**.
- **언제 하나** — 새 기능 추가 전, 버그 수정 후, 코드 리뷰 시.
- **테스트가 안전망** — 매 단계 통과 확인.
- **작은 단계로** — 큰 리팩토링은 작은 리팩토링의 누적.
- **카탈로그** 활용 (Fowler).

## 언제 리팩토링하나

McConnell이 제시하는 자리들.

### 1) 새 기능 추가 전

기능을 추가하기 전 — 코드를 새 기능을 받기 좋게 정리.

```
"이 기능을 추가하기 쉬운 모양으로 먼저 만든 후, 기능을 추가한다."
                                                      — Kent Beck
```

### 2) 버그 수정 후

버그를 고친 후 — 그 자리 코드를 깨끗하게. 같은 결함이 재발하지 않도록.

### 3) 코드 리뷰 시

리뷰에서 발견된 개선 자리를 — 즉시 또는 별도 PR로.

### 4) 명확함이 떨어졌을 때

자기 코드를 다시 보고 — "왜 이렇게 짰지?"가 들면. 그 자리를 정리.

## 흔한 리팩토링

Fowler의 카탈로그가 표준. 주요 항목:

- **Extract Function** — 큰 함수를 작게.
- **Inline Function** — 본문이 이름보다 명확하면.
- **Rename Variable/Function** — 더 좋은 이름으로.
- **Move Function/Field** — 적절한 클래스로 이동.
- **Replace Magic Number with Symbolic Constant**.
- **Encapsulate Variable** — 직접 접근을 메서드로.
- **Replace Conditional with Polymorphism** — switch를 다형성으로.
- **Extract Class** — 책임을 분리.
- **Replace Inheritance with Delegation** — 상속을 구성으로.

자세한 카탈로그는 — [Refactoring 시리즈](/blog/programming/engineering/refactoring/) 참고.

## 안전한 리팩토링

### 작은 단계로

> 큰 변경을 한 번에 하지 마라. **작은 변경을 여러 번**.

```
1. 함수 추출 → 테스트
2. 변수 이름 변경 → 테스트
3. 매개변수 추가 → 테스트
4. 본문 이동 → 테스트
```

각 단계가 분 단위. 매 단계가 테스트 통과로 안전 보증.

### 테스트가 안전망

리팩토링 전 — **테스트가 충분한지** 확인. 없으면 — 먼저 짠다.

테스트 없는 리팩토링은 — 동작 보존 보증이 없다.

### 자동화 도구 활용

현대 IDE는 — 많은 리팩토링을 자동화.

- **Rename** (한 단축키).
- **Extract Function**.
- **Move to Class**.
- **Change Signature**.

수동 수정보다 — 자동 도구가 안전하고 빠르다.

## 리팩토링 vs 새 코드

**리팩토링**: 외부 동작 보존, 내부 개선.

**새 코드**: 외부 동작 변경.

> 두 가지를 **한 PR에 섞지 마라**. 리뷰가 어렵고, 회귀 발생 시 원인 찾기 어렵다.

리팩토링 PR과 기능 PR을 분리.

## 함정

- **리팩토링 미루기** — "나중에" → 거의 안 함.
- **너무 큰 리팩토링** — 한 번에 너무 많은 변경.
- **테스트 없는 리팩토링** — 깨진 줄 모름.
- **새 기능과 섞기** — 회귀 추적 어려움.

## 정리

- 리팩토링 = **외부 동작 보존, 내부 개선**.
- **언제** — 기능 추가 전, 버그 수정 후, 리뷰 시.
- **작은 단계, 매 단계 테스트**.
- IDE의 자동화 도구 활용.
- **새 기능과 분리**된 PR.

## 관련 항목

- [Ch 23: Debugging](/blog/programming/engineering/code-complete/ch23-Debugging)
- [Ch 25: Code-Tuning Strategies](/blog/programming/engineering/code-complete/ch25-Code-Tuning-Strategies)
- [Refactoring 시리즈](/blog/programming/engineering/refactoring/)
- [Clean Code Ch 14: Successive Refinement](/blog/programming/engineering/clean-code/chapter14-successive-refinement)
