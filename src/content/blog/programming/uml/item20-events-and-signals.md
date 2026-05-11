---
title: "UML 20: 이벤트와 시그널 — 메시지의 4종류와 도메인 이벤트"
date: 2026-07-05T10:00:00
description: "Call · Signal · Time · Change — UML이 다루는 이벤트 네 부류와 시그널 계층."
tags: [UML, Event, Signal, Behavior]
series: "UML User Guide"
seriesOrder: 20
draft: false
---

## 한 줄 요약

> **"무엇이 일어났는가를 명세하다"** — 이벤트는 변화의 발생, 시그널은 비동기 메시지의 명세.

## 어떤 문제를 푸는가

상태 머신을 그릴 때 가장 어려운 건 **무엇이 상태를 바꾸는가**입니다. UML은 그 트리거를 네 가지로 분류합니다.

## 4가지 이벤트 종류

### 1. Call Event — 메서드 호출

```
ATM 상태머신에서:
  Idle → cardInserted() → CardInserted
```

가장 흔한 트리거. 객체에 어떤 연산이 호출되면 발생.

### 2. Signal Event — 비동기 시그널 수신

```
Order 상태머신:
  Placed → 「PaymentApproved」 → Paid
```

`<<signal>>` 분류자의 인스턴스가 도착했을 때.

### 3. Time Event — 시간

```
after(30s) → 타임아웃
when(now == 09:00) → 영업 시작
```

상대 시간(`after`) 또는 절대 시간(`when`).

### 4. Change Event — 조건이 참이 되는 순간

```
when(balance > 1000) → VIP로 승급
```

특정 조건식이 false → true로 바뀐 순간.

## Signal 계층

시그널은 클래스처럼 **계층**을 가질 수 있습니다.

![Signal hierarchy](/images/blog/uml/diagrams/item20-signal-hierarchy.svg)

상위 시그널을 핸들링하면 하위 시그널도 모두 잡힙니다 — 자바의 예외 계층과 같은 원리.

## Signal vs Call — 동기 vs 비동기

| | Signal | Call |
| --- | --- | --- |
| 동기성 | 비동기 (보내고 잊음) | 동기 (return 기다림) |
| 반환값 | 없음 | 있음 |
| 표기 | 시퀀스에서 `─▷` | 시퀀스에서 `─▶` |
| 대상 | 다수 수신자 가능 | 보통 1:1 |

도메인 이벤트(`OrderPlaced`, `PaymentApproved`)는 거의 모두 signal로 모델링합니다.

## Signal 송수신 표기

상태 머신에서:

```
[State1] ── signalA / sendSignal(B) ─→ [State2]
```

`/` 뒤에 **액션** — 트랜지션이 일어날 때 보낼 시그널, 호출할 메서드 등.

### Send/Receive 표기 (특수 모양)

```
   ┌─────────┐
───┤  Send   ───→
   └─────────┘
       (외쪽이 평행사변형)

   ←─── ┌─────────┐
        │ Receive │
        └─────────┘
```

활동 다이어그램에서 시그널 송수신을 시각적으로 강조할 때.

## Exception을 이벤트로

UML은 예외도 시그널의 한 종류로 봅니다.

```
[Action]  ──「Exception」─→  [Handler]
```

예외 핸들링 흐름을 활동 다이어그램에 자연스럽게 끼워 넣을 수 있습니다.

## 자주 하는 실수

> ⚠️ Call event를 signal로

`save()` 메서드 호출은 call event입니다. signal로 잘못 표기하면 동기/비동기 의미가 흐려집니다.

> ⚠️ Time event를 자연어로

`"30초 후"`가 아니라 `after(30s)`. UML 표기를 지키세요 — 도구가 의미를 알아봅니다.

> ⚠️ Change event 남발

`when(...)`은 비싼 이벤트입니다 — 조건을 계속 모니터링해야 함. 가능하면 call/signal로 바꾸세요.

## 정리

- 이벤트 4종: **Call · Signal · Time · Change**.
- Signal은 비동기, 계층 가능, 다수 수신자.
- 시간은 `after(t)`(상대) / `when(c)`(절대).
- 예외도 시그널의 한 형태.

다음 편은 **상태 머신** — 객체의 라이프사이클을 이벤트로 엮는 다이어그램.
