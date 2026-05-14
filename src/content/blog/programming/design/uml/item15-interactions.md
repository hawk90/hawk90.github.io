---
title: "UML 15: 상호작용 — 객체들이 메시지를 주고받는 방식"
date: 2026-04-01T15:00:00
description: "Lifeline · 메시지 · activation bar — 행위 모델링의 가장 핵심적인 어휘."
tags: [UML, Interaction, Sequence, Communication]
series: "UML User Guide"
seriesOrder: 15
draft: true
---

## 한 줄 요약

> **"객체끼리 메시지를 주고받는 그림"** — 상호작용 다이어그램의 토대.

## 어떤 문제를 푸는가

클래스 다이어그램은 "누가 누구를 안다"를 보여줍니다. 그런데 **실행 중에 뭐가 어떻게 일어나는지**는 안 보입니다.

```cpp
order.place();    // 이 한 줄 안에서
                  // OrderService가 Stripe를 부르고
                  // Repository에 저장하고
                  // 이벤트를 발행하는데...
```

상호작용 다이어그램은 이 **동적 흐름**을 그립니다.

## 한눈에 보는 구조

![Interaction basics](/images/blog/uml/diagrams/item15-interactions.svg)

## 상호작용의 4가지 building block

### 1. Lifeline — 객체의 시간선

각 참가 객체는 위에 박스, 아래로 점선이 내려갑니다. **위에서 아래로 시간이 흐릅니다**.

```
[: Caller]      [: Service]     [: Repo]
   |               |              |
   |               |              |
   v (시간)         v              v
```

### 2. Message — 메시지

객체 간 화살표.

| 표기 | 의미 |
| --- | --- |
| 실선 + 채워진 화살촉 | synchronous call (return을 기다림) |
| 실선 + 열린 화살촉 | asynchronous (return 안 기다림) |
| 점선 + 화살촉 | return value |
| `<<create>>` | 생성 |
| `<<destroy>>` (X 표시) | 소멸 |

### 3. Activation Bar — 실행 구간

lifeline 위의 **얇은 직사각형**. 그 객체가 활성화되어 있는 구간 — 메서드 실행 중.

### 4. Combined Fragment — 제어 구조

박스로 감싸 분기·반복을 표현. 자주 쓰는 종류:

- `alt` — if/else
- `opt` — if (옵션)
- `loop` — 반복
- `par` — 병렬
- `seq` — 순차 (기본)
- `critical` — 임계 구역
- `ref` — 다른 상호작용 참조

## 상호작용 vs 다이어그램

UML은 **상호작용(Interaction)**이라는 추상 개념과 그를 표현하는 4종 다이어그램을 구분합니다.

| 다이어그램 | 강조 |
| --- | --- |
| **시퀀스** | 시간 (위→아래) |
| **통신** | 객체 관계 (그래프) |
| **타이밍** | 시간 축 + 상태 변화 |
| **상호작용 개요** | 활동 + 시퀀스 결합 |

가장 흔히 쓰는 건 시퀀스. 다음 편에서 본격적으로.

## 자주 하는 실수

> ⚠️ 너무 많은 lifeline

7개를 넘는 lifeline이 들어간 시퀀스는 보통 가독성이 무너집니다. **시나리오를 쪼개세요**.

> ⚠️ Return을 모두 그리기

자명한 return은 생략해도 됩니다 — 다이어그램이 가벼워집니다.

> ⚠️ Activation bar를 생략

도구가 자동으로 안 그릴 때가 있어도, 손으로 그릴 땐 활성 구간을 표시해야 의미가 분명.

## 정리

- 상호작용은 **lifeline + 메시지 + activation + fragment**로 구성.
- 메시지 종류: **sync / async / return / create / destroy**.
- 4종 다이어그램(시퀀스·통신·타이밍·개요)로 같은 상호작용을 다르게 표현.
- 한 다이어그램에 너무 많은 객체 ❌.

다음 편은 **유스케이스** — 시스템 외부에서 본 상호작용.
