---
title: "UML 24: 시간과 공간 — Deadline, Location, 분산 시스템"
date: 2026-04-05T14:00:00
description: "실시간 시스템·분산 시스템에서 필수인 시간 제약과 위치 표기."
tags: [UML, Real-time, Deadline, Location, Distribution]
series: "UML User Guide"
seriesOrder: 24
draft: false
---

## 한 줄 요약

> **"언제·어디서가 중요할 때"** — 실시간 시스템과 분산 시스템에선 시간·공간 표기를 빼면 안 된다.

## 어떤 문제를 푸는가

평범한 클래스 다이어그램에는 시간이 안 보입니다. 그러나 다음 시스템에선 시간이 도메인의 일부입니다.

- 실시간 임베디드 (응답 시간 데드라인)
- 금융 (timestamp 정확성)
- IoT (센서 sampling)
- 분산 시스템 (latency, clock skew)

UML은 이를 위한 표기를 제공합니다.

## 한눈에 보는 예시

![Time constraint in sequence](/images/blog/uml/diagrams/item24-time-constraint.svg)

요청부터 응답까지 100ms 이내여야 한다는 시간 제약을 시퀀스 다이어그램에 직접 표기.

## 시간 표기

### Time Observation

메시지 옆에 시간 변수 표시:

```
   ┌───┐
   │ t │  ← request 송신 시간
   └───┘
   client → server: request
       (이벤트 발생 시각 = t)
```

### Time Constraint

시간 변수 간 제약:

```
{t' - t < 100ms}
{x.timestamp >= y.timestamp}
```

### Duration

활동 또는 시퀀스에서 한 구간의 소요 시간:

```
[Action] {duration <= 50ms}
```

## 시간 표현식

| 표기 | 의미 |
| --- | --- |
| `now` | 현재 시각 |
| `at(t)` | 특정 시각에 |
| `after(d)` | d만큼 후에 |
| `every(d)` | 매 d마다 |
| `[t1..t2]` | 시간 구간 |

## Timing Diagram — 시간 축 그래프

시간이 정말 중요한 상호작용은 **타이밍 다이어그램**으로.

```
       0    100   200   300   400 ms
        │    │    │    │    │
Client: ───request───┐
                     └─response─┐
Server:    ────receive──process─┘
```

시간 축은 가로, 객체는 세로. 객체의 **상태 변화**가 막대로 표시됩니다. 신호 처리·프로토콜 분석에 강력.

## 공간 — Location

분산 시스템에선 객체가 **어디에** 있는지가 도메인 정보입니다.

### Tagged value: location

```
+ Order {location = "Tokyo DC"}
```

### Deployment Diagram (item30 참조)

물리 노드와 그 위 컴포넌트.

```
┌─ Node: ap-northeast-1 ──┐
│  ┌─ Component: OrderSvc ┐│
│  └──────────────────────┘│
└──────────────────────────┘
```

### Distribution Pattern

UML 자체로는 부족할 때 SysML, MARTE 등 도메인 확장 프로파일을 씁니다.

## Quality of Service

UML 2.x는 QoS 어노테이션을 표준화했습니다.

```
+ getBalance() {latency <= 50ms, availability >= 99.9%}
```

`{...}` 안의 비기능 속성이 메서드의 QoS 명세.

## 자주 하는 실수

> ⚠️ 시간 제약을 다이어그램 밖에만

스펙 문서에 "응답 100ms 이내"라고만 적으면 다이어그램과 분리됩니다. **다이어그램에 직접** 표기하면 검토 시 잡기 쉬움.

> ⚠️ Location을 클래스 이름에

`OrderServiceTokyo` 같이 클래스 이름에 위치를 박지 마세요. **태그값**으로 분리.

> ⚠️ 타이밍 다이어그램을 모든 시퀀스에

타이밍은 **시간이 도메인의 일부**일 때만. 일반 비즈니스 로직엔 시퀀스로 충분.

## 정리

- 시간 제약은 `{...}` 안에 표기, `now`/`at`/`after`/`every`/`duration` 같은 표현식.
- **타이밍 다이어그램**은 시간 축 그래프 — 신호·프로토콜에 강력.
- 위치는 태그값(`{location=...}`)이나 **배포 다이어그램**으로.
- QoS(latency, availability)는 메서드/포트의 어노테이션으로.

다음(Part 6)부터는 **아키텍처 모델링** — 컴포넌트·배포로 시스템 구조 마무리.
