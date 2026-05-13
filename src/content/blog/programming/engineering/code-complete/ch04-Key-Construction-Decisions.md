---
title: "Chapter 4: Key Construction Decisions"
date: 2026-06-20T04:00:00
description: "construction을 시작하기 전 결정해야 할 핵심들 — 언어 선택, 컨벤션, 기술 흐름 위치, 자신만의 도구함."
series: "Code Complete"
seriesOrder: 4
tags: [code-complete, decisions, McConnell]
---

## 이 챕터의 메시지

준비가 끝났다고 곧장 키보드에 손을 올리지 마라. **construction 자체에도 미리 결정해야 할 것들**이 있다. 언어를 무엇으로 할지, 어떤 컨벤션을 따를지, 도구는 무엇을 쓸지.

> 이 결정들이 빠지면 — 매 줄을 짤 때마다 즉석에서 결정해야 한다. 일관성이 사라진다.

## 핵심 내용

- 언어 선택은 사고 자체에 영향을 준다.
- **프로그래밍 컨벤션**을 정해 일관성을 확보.
- 기술의 **위치**(어디에 있는가)에 맞춰 코드 짜기.
- 자신만의 **도구함**을 점진적으로 쌓는다.

## 언어가 사고를 형성한다

McConnell은 **Sapir-Whorf 가설**의 소프트웨어 버전을 소개한다 — **언어가 우리가 생각할 수 있는 범위를 결정한다**.

- Lisp 사용자는 모든 것을 재귀와 리스트로 본다.
- Smalltalk 사용자는 모든 것을 객체와 메시지로 본다.
- C 사용자는 모든 것을 포인터와 메모리로 본다.

이게 좋다·나쁘다가 아니라 — **어느 언어를 선택했는가가 결과의 모양**을 정한다. 도메인에 맞는 언어를 선택하는 것이 중요하다.

### 한 언어로만 생각하지 마라

한 언어에 갇히면 — 그 언어로 풀기 어려운 문제도 그 언어로 풀려 한다. **여러 언어를 알면** 같은 문제를 다른 각도로 본다.

## 프로그래밍 컨벤션

> "사소한" 결정이지만 — 시스템 전체에 영향을 준다.

좋은 컨벤션이 결정하는 것:

- 변수·함수 명명 규칙.
- 들여쓰기 폭.
- 중괄호 위치.
- 주석 형식.
- 파일 구성.

이 결정을 **프로젝트 시작에** 한다. 시작 후 바꾸면 — 누군가 이전 스타일로 짠 코드를 모두 다시 손대야 한다.

### 자동화

컨벤션은 **사람이 매번 따르지 않는다**. 자동 포맷터로 강제한다.

- C/C++: clang-format
- Java: Google Java Format
- Python: black, ruff format
- JavaScript: prettier

CI에서 자동 검증하면 — 컨벤션 위반이 PR 단계에서 막힌다.

## 기술의 위치를 의식하라

McConnell의 흥미로운 구분 — **"기술 안에서 짤 것인가, 기술 위에서 짤 것인가"**.

### 기술 안에서 (Programming INTO a Language)

언어의 한계를 받아들이고, 그 안에서 깔끔하게 짠다. 언어가 제공하는 도구를 활용해 자기 도메인을 표현한다.

```python
# 파이썬의 자연스러운 방식으로 풀기
result = [x * 2 for x in items if x > 0]
```

### 기술 위에서 (Programming IN a Language)

언어가 제공하지 않는 패턴을 **언어를 만들 듯이** 짠다. 한 단계 높은 추상에서 코드를 작성한다.

```python
# 도메인 DSL 만들기
order = Order().items(item("A", 2), item("B", 1)).ship(EXPRESS)
```

**좋은 프로그래머는 언어 위에서 짠다**. 자기 도메인의 어휘를 언어로 만들어 다음 사람이 그 어휘로 소통할 수 있게 한다.

## 자신만의 도구함

매일 같은 패턴을 반복하지 마라. **자기만의 헬퍼·유틸·템플릿**을 쌓는다.

- 자주 쓰는 보일러플레이트 → 함수/매크로.
- 자주 만나는 패턴 → 라이브러리 함수.
- 자주 쓰는 코드 스니펫 → IDE 템플릿.

이 도구함이 시간과 함께 풍부해진다. 새 프로젝트에 들어가도 — 같은 도구를 쓸 수 있다.

## 정리

- 언어가 **사고를 형성**한다. 여러 언어로 생각하는 능력을 기른다.
- **컨벤션을 미리** 정하고 **자동화**로 강제한다.
- **기술 위에서** 짜라 — 언어가 부족하면 도메인 어휘를 만든다.
- **자신만의 도구함**을 점진적으로 쌓는다.

## 관련 항목

- [Ch 3: Upstream Prerequisites](/blog/programming/engineering/code-complete/ch03--Upstream-Prerequisites)
- [Ch 5: Design in Construction](/blog/programming/engineering/code-complete/ch05-Design-in-Construction)
- [Pragmatic Programmer Tip 11: 함정 피하기](/blog/programming/engineering/pragmatic-programmer/tip11)
