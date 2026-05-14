---
title: "UML 23: 상태 / 활동 다이어그램 심화 — Composite · History · Region"
date: 2026-04-01T23:00:00
description: "상태 안에 상태, 활동 안에 활동 — 큰 상태 머신을 가독성 있게 그리는 기법."
tags: [UML, State Machine, Composite State, History]
series: "UML User Guide"
seriesOrder: 23
draft: true
---

## 한 줄 요약

> **"상태 안에 상태가 있다"** — composite state, history, region으로 큰 상태 머신을 계층화한다.

## 어떤 문제를 푸는가

상태가 10개 넘어가는 시스템은 평면 상태 머신으론 그릴 수 없습니다 — 화살표가 거미줄.

Harel statechart에서 출발한 UML 상태 머신은 **계층화·병렬화·기억** 기능을 가집니다.

## 한눈에 보는 예시

![Composite state with history](/images/blog/uml/diagrams/item23-composite-state.svg)

- `Connected` 상태 **안에** `Idle`, `Working` 상태가 있음 (composite).
- `Disconnected`로 빠졌다가 돌아올 때 마지막 내부 상태로 복귀 (history).

## Composite State — 상태 안 상태

<img src="/images/blog/uml/diagrams/item23-composite-on.svg" alt="복합 상태 On — Loading · Ready" style="max-width:100%; background:white; padding:8px; border-radius:6px;" />

`On` 안에 두 하위 상태. 외부에서 `On`이라는 한 상태로 보이고, 내부 디테일은 확대했을 때만.

### External vs Internal Transition

- **외부 트랜지션** — 트랜지션이 `Connected` 자체를 떠남 → `entry`/`exit`가 실행됨.
- **내부 트랜지션** — `Connected` 안에서만 일어남 → `entry`/`exit` 실행 안 됨.

## History — 마지막 내부 상태 기억

복합 상태에서 빠져나갔다가 돌아올 때, 마지막에 있던 내부 상태로 가고 싶을 때.

### Shallow history (H)

<img src="/images/blog/uml/diagrams/item23-history-marker.svg" alt="히스토리 마커 H — Connected의 마지막 자식으로 복귀" style="max-width:100%; background:white; padding:8px; border-radius:6px;" />

`Connected` 안의 직접 하위 상태 중 마지막 것.

### Deep history (H*)

```
[Connected (H*)]
       ↓
  (가장 깊은 하위 상태까지 복원)
```

복합 상태가 다중 레벨로 깊을 때.

## Region — 직교 영역

22편에서 본 직교 영역. 한 상태가 여러 직교 region을 가지면 그 region들은 **동시에** 활성.

<img src="/images/blog/uml/diagrams/item23-driving-orthogonal.svg" alt="Driving — Audio와 Cruise 두 직교 영역" style="max-width:100%; background:white; padding:8px; border-radius:6px;" />

두 region이 독립적으로 상태를 가짐.

## Submachine — 재사용

큰 상태 머신을 다른 상태 머신에서 **불러올** 수 있습니다.

```
[OrderState : OrderSubMachine]
```

상태 박스가 다른 상태 머신의 인스턴스. 라이브러리화 가능.

## Activity Diagram의 심화

### Interruptible Region

<img src="/images/blog/uml/diagrams/item23-interruptible-region.svg" alt="중단 가능 영역 — cancel 시그널로 중단" style="max-width:100%; background:white; padding:8px; border-radius:6px;" />

영역 안 어디서나 cancel 시그널 받으면 빠져나옴.

### Expansion Region

<img src="/images/blog/uml/diagrams/item23-expansion-region.svg" alt="확장 영역 — for each item" style="max-width:100%; background:white; padding:8px; border-radius:6px;" />

컬렉션의 각 원소에 대해 영역 안 흐름이 반복.

### Pin

활동 사이 데이터 흐름의 정확한 위치. 활동 박스 가장자리의 작은 사각형.

```
[Action1] ──pin──→ [Action2]
```

## 자주 하는 실수

> ⚠️ Composite state를 안 쓰고 평면으로

상태 6개 넘어가면 그루핑해서 composite state로 묶으세요. 거미줄이 사라집니다.

> ⚠️ History를 모든 composite에

history는 **돌아왔을 때 의미가 있을 때만**. 항상 시작 상태로 가는 게 자연스러우면 history 불필요.

> ⚠️ Region 남발

직교 region은 동시성 모델에 강력하지만 가독성을 깨기 쉽습니다. 진짜 **독립적인 차원**일 때만.

## 정리

- **Composite state**: 상태 안 상태 — 계층화로 가독성.
- **History (H, H\*)**: 돌아왔을 때 마지막 내부 상태로.
- **Region**: 직교 영역 — 동시 활성.
- **Submachine**: 상태 머신 재사용.
- 활동 다이어그램도 interruptible region · expansion region · pin 같은 심화 표기.

다음 편은 **시간과 공간** — UML이 deadline·위치·물리적 분산을 표현하는 법.
