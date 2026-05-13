---
title: "UML 21: 상태 머신 — 객체의 라이프사이클"
date: 2026-04-05T11:00:00
description: "둥근 박스, 화살표, 가드 — 라이프사이클이 복잡한 객체를 다루는 결정타."
tags: [UML, State Machine, Behavior, Statechart]
series: "UML User Guide"
seriesOrder: 21
draft: true
---

## 한 줄 요약

> **"객체의 인생을 그림으로"** — 상태 머신은 객체가 어떤 상태를 거치며 살아가는지를 보여준다.

## 어떤 문제를 푸는가

`Order` 객체를 생각해봅시다. 코드로 보면:

```cpp
if (status == Placed) { /* ... */ }
else if (status == Paid) { /* ... */ }
else if (status == Shipped) { /* ... */ }
// ...
```

이 if-else가 시스템 전체에 흩어져 있으면 "어떤 상태가 어떤 상태로 갈 수 있나"가 묻힙니다. 상태 머신은 이 라이프사이클을 **한 그림에** 모읍니다.

## 한눈에 보는 예시 — 문

![Door state machine](/images/blog/uml/diagrams/item21-state-machine.svg)

세 상태: Closed, Open, Locked. 다섯 트랜지션: open, close, lock, unlock.

## 구성 요소

| 요소 | 그림 | 의미 |
| --- | --- | --- |
| State | 둥근 사각형 | 한 상태 |
| Initial | 까만 점 | 시작점 |
| Final | 점이 든 원 | 종료점 |
| Transition | 화살표 | 상태 변화 |
| Trigger | 화살표 위 텍스트 | 변화의 원인 |
| Guard | `[...]` | 조건 |
| Action | `/...` | 트랜지션에 동반되는 동작 |

## 트랜지션 표기

```
event(args) [guard] / action
```

예시:

<img src="/images/blog/uml/diagrams/item21-guarded-transition.svg" alt="Guard와 effect가 붙은 자가 전이" style="max-width:100%; background:white; padding:8px; border-radius:6px;" />

## State 내부 동작

상태 안에도 동작을 적을 수 있습니다.

<img src="/images/blog/uml/diagrams/item21-state-internals.svg" alt="상태 내부 — entry·exit·do·internal 트랜지션" style="max-width:100%; background:white; padding:8px; border-radius:6px;" />

- `entry` — 상태 진입 시 한 번
- `exit` — 상태 탈출 시 한 번
- `do` — 상태에 머무는 동안 (오래 걸리는 작업)
- 내부 이벤트 — 상태를 안 떠나며 처리

## Guard

```
            transfer(amt) [amt > limit]
[Active] ───────────────────────────→ [HoldForReview]
```

같은 이벤트라도 조건에 따라 다른 상태로. **상호 배타적** guard를 써야 합니다.

## Action vs Activity

- **Action** — 짧은 동작, 트랜지션 중 즉시 실행 (`/ debit(amt)`)
- **Activity** (do) — 오래 걸리는, 상태에 머무는 동안 (`do / monitor()`)

## 결정적 vs 비결정적

UML 상태 머신은 기본적으로 **결정적**입니다 — 한 상태에서 한 이벤트는 정확히 한 트랜지션을 트리거.

같은 이벤트로 두 트랜지션이 있고 guard가 둘 다 참이면 비결정적 — 보통은 피해야 할 모델.

## 자주 하는 실수

> ⚠️ 모든 객체에 상태 머신을

대부분 객체는 상태가 단순합니다 (있다·없다, 또는 한두 단계). 상태 머신은 **3개 이상의 의미 있는 상태**가 있을 때.

> ⚠️ 상태에 데이터를 다 적기

`Processing(itemCount=42, startTime=...)` 같이 적으면 상태 폭발. 상태는 **이름**만, 데이터는 객체 속성.

> ⚠️ Guard 누락

같은 이벤트로 여러 트랜지션이 있는데 guard를 안 적으면 어디로 갈지 모름. 명시하세요.

## 정리

- 상태 머신은 **객체 라이프사이클**의 시각화.
- 트랜지션: `event [guard] / action`.
- 상태 내부: `entry / exit / do / 내부 이벤트`.
- 결정적이어야 — guard는 상호 배타적.

다음 편은 **프로세스와 스레드** — 액티브 객체와 동시성을 다루는 UML 표기.
