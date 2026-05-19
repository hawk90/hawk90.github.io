---
title: "UML 19: 활동 다이어그램 — 워크플로와 알고리즘의 흐름"
date: 2026-05-03T19:00:00
description: "객체가 아니라 행동에 집중. 비즈니스 프로세스·알고리즘·UX 흐름을 그릴 때."
tags: [UML, Activity Diagram, Workflow, Flowchart]
series: "UML 2.5.1"
seriesOrder: 19
draft: false
---

## 한 줄 요약

> **"객체가 아니라 행동에 집중"** — 비즈니스 워크플로, 알고리즘, UX 흐름을 그릴 때 시퀀스 대신 활동.

## 어떤 문제를 푸는가

시퀀스 다이어그램은 **누가 누구에게**를 보여줍니다. 그런데 행위자보다 **흐름 자체**가 중요할 때가 있습니다.

- 주문 처리 비즈니스 프로세스
- 회원 가입 UX flow
- 정렬 알고리즘의 단계
- 결제 승인 절차

이때는 활동 다이어그램이 시퀀스보다 더 잘 맞습니다.

## 한눈에 보는 예시

![Activity flow](/images/blog/uml/diagrams/item19-activity.svg)

주문 받음 → 재고 확인 → (있으면 결제, 없으면 backorder 통보) → 배송 → 종료.

## 구성 요소

| 요소 | 그림 | 의미 |
| --- | --- | --- |
| Initial node | 까만 점 | 시작 |
| Final node | 점이 든 동그라미 | 종료 |
| Action | 둥근 박스 | 한 단계 |
| Decision | 마름모 | 분기 |
| Merge | 마름모 | 분기 합류 |
| Fork | 굵은 가로 막대 | 병렬 분기 |
| Join | 굵은 가로 막대 | 병렬 합류 |
| Flow | 화살표 | 다음 단계로 |
| Object | 사각형 (lifeline 아님) | 단계 간 데이터 |

## Decision — 분기

<img src="/images/blog/uml/diagrams/item19-decision-branch.svg" alt="분기 다이아몬드 — [yes] 결제, [no] backorder" style="max-width:100%; background:white; padding:8px; border-radius:6px;" />

가드(`[yes]`, `[no]`)는 **상호 배타적**이어야 합니다 — 정확히 한 가지가 참.

## Fork & Join — 병렬

<img src="/images/blog/uml/diagrams/item19-fork-join.svg" alt="활동 fork·join — 병렬 분기와 합류" style="max-width:100%; background:white; padding:8px; border-radius:6px;" />

병렬로 실행 가능한 단계들을 fork 사이에 두고, 모두 끝나면 join. 멀티스레드·비동기 작업 표현에 강력.

## Swimlane (Partition)

활동을 **담당자별 트랙**으로 나누는 표기.

<img src="/images/blog/uml/diagrams/item19-swimlane.svg" alt="Swimlane 활동 — Customer · System · Bank" style="max-width:100%; background:white; padding:8px; border-radius:6px;" />

각 활동이 **누구의 책임**인지 한눈에. BPMN(Business Process Model and Notation)이 이걸 더 발전시켰습니다.

## 활동 vs 시퀀스 — 어떤 걸 언제

| 상황 | 다이어그램 |
| --- | --- |
| 객체 간 호출 흐름 | 시퀀스 |
| 비즈니스 프로세스 | 활동 (swimlane) |
| 알고리즘 단계 | 활동 |
| 병렬 작업 | 활동 (fork/join) |
| UX flow | 활동 |
| API 시나리오 | 시퀀스 |

> 💡 "**객체가 주인공**이면 시퀀스, **흐름이 주인공**이면 활동."

## Activity vs Action

UML 2.x에서 미묘한 구분:

- **Action** — 더 이상 쪼개지지 않는 단위 (단일 step)
- **Activity** — 여러 action으로 구성된 행위 (재사용 가능한 단위)

활동 다이어그램의 둥근 박스 하나는 action일 수도, sub-activity일 수도 있습니다.

## 객체 흐름 (Object Flow)

활동 사이에 **데이터**가 흐르는 것을 표현.

```
(주문 받음) → [주문서] → (재고 확인)
```

화살표 위에 객체 박스를 두면 "이 활동의 결과물이 다음 활동의 입력".

## 자주 하는 실수

> ⚠️ Flowchart로만 쓰기

활동 다이어그램의 강점은 **swimlane**과 **fork/join**입니다. 단순한 flowchart라면 그냥 flowchart로.

> ⚠️ Decision의 가드가 겹침

`[x > 0]`과 `[x >= 0]`이 동시에 분기에 있으면 의미가 모호. **상호 배타적**으로.

> ⚠️ Join 빼먹기

fork로 나뉘었으면 반드시 join으로 합쳐야 합니다. 안 합치면 한 분기가 어디 가는지 모름.

## 정리

- 활동 다이어그램은 **흐름이 주인공**.
- Decision · Fork · Join 세 종류의 분기·합류.
- **Swimlane**으로 책임 표시 — BPMN의 뿌리.
- 객체 흐름으로 단계 간 데이터 표현.
- 객체가 주인공이면 시퀀스, **흐름이 주인공이면 활동**.

다음(Part 5)부터는 **고급 행위 모델링** — 이벤트·시그널·상태 머신·동시성.
