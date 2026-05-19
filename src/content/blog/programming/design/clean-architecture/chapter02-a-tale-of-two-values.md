---
title: "Ch 2: 두 가치 이야기"
date: 2026-05-01T02:00:00
description: "소프트웨어의 두 가치 — 행동(현재 작동)과 구조(변경 친화). 어느 쪽이 더 중요한가, 그리고 왜 늘 행동이 이기는가."
tags: [Architecture, Values, Eisenhower]
series: "Clean Architecture"
seriesOrder: 2
draft: true
---

## 이 챕터의 메시지

소프트웨어는 두 가지 다른 가치를 제공한다.

1. **행동(behavior)** — 시스템이 지금 무엇을 하는가
2. **구조(structure)** — 시스템을 앞으로 얼마나 쉽게 바꿀 수 있는가

대부분의 조직은 첫 번째만 본다. 그리고 그게 거의 모든 소프트웨어 재앙의 출발점이다. Martin은 이 챕터에서 두 가치를 명확히 구분하고, **구조가 행동보다 더 중요하다**고 주장한다.

## 두 가치의 정의

### 행동의 가치

"이 시스템이 명세대로 동작한다."

- 기능이 작동한다
- 버그가 없다
- 비즈니스 요구를 충족한다

흔히 "소프트웨어"라고 하면 이 행동을 떠올린다. 사용자에게 직접 보이는 가치다.

### 구조의 가치

"이 시스템을 쉽게 변경할 수 있다."

- 새 기능 추가가 빠르다
- 버그 수정이 안전하다
- 요구사항이 바뀌어도 시스템 대부분을 다시 짤 필요가 없다

사용자에게 직접 보이지 않는다 — 다만 그 결과가 누적되어 보인다. 같은 기능을 추가하는 데 어떤 팀은 하루, 어떤 팀은 한 달이 걸린다면 구조의 차이다.

## 어느 쪽이 더 중요한가

직관적으로는 행동이 더 중요해 보인다. 작동하지 않는 소프트웨어는 가치가 없으니까.

Martin은 이 직관을 뒤집는다. 사고 실험.

**시스템 A** — 완벽하게 동작한다. 그러나 어떤 변경도 불가능하다.

요구사항이 변하면 시스템은 무용지물이 된다. 모든 요구사항이 영원히 그대로일 수는 없으므로, 이 시스템은 결국 가치가 없어진다.

**시스템 B** — 동작하지 않는다. 그러나 변경이 매우 쉽다.

이건 한 번만 변경하면 — 동작하게 만들면 — 가치를 가진다. 그리고 앞으로의 변경도 모두 쉽다.

**시스템 B가 시스템 A보다 가치 있다.** 동작은 한 번의 변경이지만, 변경 가능성은 무한히 누적된다.

> "If you give me a program that works perfectly but is impossible to change, then it won't work when the requirements change, and I won't be able to make it work. Therefore the program will become useless. If you give me a program that does not work but is easy to change, then I can make it work, and I can keep it working as requirements change. Therefore the program will remain continually useful."

물론 현실에서 어느 한쪽만 가진 시스템은 없다. 둘 다 가져야 한다. 다만 **우선순위**의 문제다 — 어느 쪽을 더 중시할 것인가.

## 우선순위의 함정

대부분의 조직은 행동을 우선시한다. 이유는 명백하다.

- 행동은 **눈에 보인다** — 데모할 수 있다
- 구조는 **눈에 안 보인다** — 슬라이드에 그려도 의미를 못 전달한다
- 행동은 **단기 이익** — 분기 매출, 다음 릴리스
- 구조는 **장기 이익** — 6개월 후 개발 속도

또 행동은 마케팅, 영업, 임원이 모두 이해한다. 구조는 엔지니어만 이해한다. 그래서 모든 의사 결정 회의에서 행동이 우선시된다.

이게 함정이다. 단기적으로는 합리적이지만, 누적되면 시스템이 망가진다 — 1장의 그래프, 비용이 지수적으로 증가하는 그래프가 정확히 이 함정의 결과다.

## 아이젠하워 매트릭스

Martin은 미국 대통령 아이젠하워의 의사 결정 매트릭스를 인용한다.

```
                 긴급                  긴급하지 않음
            ┌──────────────────┬──────────────────┐
            │                  │                  │
   중요     │    1. 긴급+중요   │  2. 중요+미긴급   │
            │   (즉시 처리)     │  (계획 / 투자)    │
            │                  │                  │
            ├──────────────────┼──────────────────┤
            │                  │                  │
  중요하지  │  3. 긴급+안중요   │ 4. 안긴급+안중요   │
   않음     │  (위임 / 거절)    │  (무시)          │
            │                  │                  │
            └──────────────────┴──────────────────┘
```

소프트웨어의 두 가치를 이 매트릭스에 매핑하면.

- **행동** — 1번 또는 3번 (긴급)
- **구조** — 2번 (중요하지만 긴급하지 않음)

문제는 인간이 **긴급한 것을 중요한 것보다 우선시**하는 경향이 있다는 것. 그래서 1번뿐 아니라 3번(긴급+중요하지 않음)도 2번보다 먼저 처리된다.

> "Business managers and developers fall into this trap all the time. Urgent but not important features are elevated to the importance of urgent and important. The result is that the truly important features get neglected. Among them is the architecture."

긴급+중요하지 않은 기능들에 시간을 쓰면서, 진짜 중요한 것 — 아키텍처 — 은 늘 뒤로 밀린다.

## 아키텍트의 책임

이 함정에서 시스템을 지키는 것이 아키텍트(또는 리드 엔지니어)의 책임이라고 Martin은 본다.

아키텍트는 두 가지 일을 한다.

1. **구조의 가치를 옹호한다** — 회의에서, 우선순위 논의에서, 매번 구조가 더 중요하다고 주장한다
2. **그 주장을 일정과 압박 앞에서 지킨다** — 굽히지 않는다

이게 종종 정치적 갈등을 만든다. 비즈니스 측은 더 많은 기능을 원하고, 아키텍트는 더 적은 기능을 권한다. 단기적으로는 비즈니스가 옳다. 장기적으로는 아키텍트가 옳다.

Martin의 입장은 단호하다. **이 갈등은 정상이며, 아키텍트는 갈등을 피하지 말아야 한다**. 갈등을 피하면 구조가 무너지고, 결국 비즈니스도 망가진다.

> "Software architects are, by virtue of their job description, more focused on the structure of the system than on its features and functions. Architects create an architecture that allows those features and functions to be easily developed, easily modified, and easily extended."

## 우선순위가 뒤집힌 결과

Martin은 자신의 경험에서 사례를 든다. 한 팀이 새 기능을 계속 출시한다. 회사 매출이 오른다. 임원들이 만족한다. 6개월 후, 새 기능 하나 만드는 데 두 배의 시간이 든다. 1년 후, 4배. 2년 후, 새 기능을 만들 수 없어진다.

이 시점에 비즈니스 측이 엔지니어에게 묻는다 — "왜 이렇게 느려졌나?" 엔지니어는 답한다 — "코드가 망가졌다. 처음부터 다시 짜야 한다."

비즈니스 측의 반응은 두 가지 중 하나다.

1. 받아들이고 다시 짠다 — 1년 손해
2. 받아들이지 않고 계속 간다 — 회사가 망한다

이 시점에 후회해도 늦다. 구조의 가치가 무너진 결과를 되돌리는 건 거의 불가능하다.

## 정리

- 소프트웨어의 두 가치 — **행동**과 **구조**
- **구조가 행동보다 더 중요** — 변경 가능성은 무한히 누적되는 가치다
- 그러나 대부분의 조직은 **행동을 우선시** — 눈에 보이고 단기적이라서
- 아이젠하워 매트릭스에서 구조는 **중요하지만 긴급하지 않음**(2번) — 늘 뒤로 밀린다
- **아키텍트의 책임**은 이 우선순위를 뒤집고, 구조를 옹호하는 것
- 이 옹호를 안 하면 시스템은 무너진다 — 1장의 비용 그래프대로

## 다음 장 예고

다음 장부터는 **프로그래밍 패러다임**을 다룬다. 구조적 / 객체 지향 / 함수형 — 각 패러다임이 무엇을 **제약**하는가, 그리고 그 제약이 아키텍처에 어떤 의미를 가지는가.

## 관련 항목

- [Ch 1: 디자인이란](/blog/programming/design/clean-architecture/chapter01-what-is-design-and-architecture) — 변경 비용 일정성
- [C++ Software Design 가이드라인 2: 변경 대비](/blog/programming/cpp/cpp-software-design/guideline02-design-for-change)
- [Refactoring Ch 2: 원칙](/blog/programming/design/refactoring/ch02) — Design Stamina Hypothesis
