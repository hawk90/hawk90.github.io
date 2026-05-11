---
title: "UML 22: 프로세스와 스레드 — 액티브 객체와 동시성"
date: 2026-07-05T12:00:00
description: "두 줄 테두리, par fragment, 동기화 표기 — UML이 동시성을 그리는 방법."
tags: [UML, Concurrency, Active Object, Thread]
series: "UML User Guide"
seriesOrder: 22
draft: false
---

## 한 줄 요약

> **"테두리가 두 줄이면 자기 스레드를 가졌다"** — 액티브 객체 표기는 동시성 모델링의 시작.

## 어떤 문제를 푸는가

멀티스레드·이벤트 루프·액터 시스템을 그릴 때 평범한 클래스 박스로는 부족합니다. **누가 자기 스레드를 가지는지**, **어디서 동기화가 일어나는지**가 안 보이거든요.

UML은 동시성을 위한 별도 표기를 가집니다.

## 한눈에 보는 예시

![Active producer-consumer](/images/blog/uml/diagrams/item22-active-objects.svg)

Producer와 Consumer는 **각자 자기 스레드** (두 줄 테두리). 둘이 공유 Queue를 통해 통신.

## Active Object — 두 줄 테두리

UML의 액티브 클래스는 박스 테두리가 **두 줄**입니다.

```
+================+
|  <<active>>    |
|   Scheduler    |
+================+
|   - thread     |
+================+
|   + run()      |
+================+
```

코드 매핑:
- Java: `Thread`를 상속받거나 자기 ExecutorService 보유
- C#: `Task`를 자기 안에서 시작
- Erlang/Akka: 액터

## 동시성을 그리는 방법

### 1. 시퀀스 다이어그램의 par fragment

```
┌─ par ──────────────────────────┐
│ OrderSvc → Email: notify(...)   │
│ ────────────                    │
│ OrderSvc → Analytics: log(...)  │
└─────────────────────────────────┘
```

두 메시지가 **동시에** 시작됨.

### 2. 활동 다이어그램의 fork/join

19편에서 본 것 — 굵은 가로 막대.

### 3. 상태 머신의 직교 영역 (Orthogonal Regions)

```
┌── Online ──────────────────┐
│ ┌── Auth ─────┐            │
│ │ Anon | LoggedIn          │
│ └─────────────┘            │
│ ───────────────────────── │
│ ┌── Connection ─┐          │
│ │ Idle | Active │          │
│ └────────────────┘          │
└────────────────────────────┘
```

한 객체가 동시에 **여러 직교 상태**를 가질 수 있음 — Statecharts(Harel)의 영향.

## 동기화 표기

### Critical region

시퀀스 다이어그램의 `critical` fragment — 임계 구역.

```
┌─ critical ──────────────┐
│ Worker → SharedRes: lock │
│ Worker → SharedRes: use  │
│ Worker → SharedRes: unlock│
└──────────────────────────┘
```

### Synchronous vs Asynchronous

시퀀스에서 다시 강조:
- `─▶` 동기 (호출자가 대기)
- `─▷` 비동기 (호출자 진행)

### Reentrant / Non-reentrant 연산

```
+ deposit(amt) {sequential}     ← 한 번에 하나만
+ deposit(amt) {concurrent}     ← 동시 호출 OK
+ deposit(amt) {guarded}        ← 차례로 처리
```

UML의 `concurrency` 속성으로 메서드별 동시성 정책을 표시.

## 프로세스 vs 스레드 vs 액터

UML은 이 셋을 **모두 액티브 객체로** 추상화합니다. 차이는 스테레오타입으로:

| 스테레오타입 | 의미 |
| --- | --- |
| `<<process>>` | OS 프로세스 |
| `<<thread>>` | OS 스레드 |
| `<<actor>>` (Akka 등) | 메시지 기반 액터 |

세 가지 다 두 줄 테두리로 그립니다.

## 동시성 패턴 표기

### Producer-Consumer

위 그림과 같음 — 두 액티브 객체 + 공유 큐.

### Pipe-and-Filter

```
[Source] → [FilterA] → [FilterB] → [Sink]
```

각 단계가 액티브 객체, 버퍼로 연결.

### Master-Worker

```
       [Master]
        /  |  \
   [W1] [W2] [W3]
```

Master가 작업을 나눠 Worker들에게 송신.

## 자주 하는 실수

> ⚠️ 모든 클래스를 액티브로

스레드를 새로 만드는 클래스만 액티브. **자기 실행 컨텍스트 없으면 일반 클래스**.

> ⚠️ par fragment 남발

병렬은 비용이 듭니다. **진짜 동시에 일어나야 의미가 있는** 경우만.

> ⚠️ 동기화 표시 누락

공유 자원이 있는데 `critical`/`guarded` 표시가 없으면 race condition을 그린 셈.

## 정리

- 액티브 객체는 **두 줄 테두리** — 자기 스레드 보유.
- 시퀀스의 `par`, 활동의 fork/join, 상태 머신의 직교 영역으로 동시성 표현.
- 동기화는 `critical`/`{guarded}`/`{sequential}` 같은 표기.
- `<<process>>`/`<<thread>>`/`<<actor>>` 스테레오타입으로 종류 구별.

다음 편은 **상태 / 활동 다이어그램의 심화** — composite state, history, region.
