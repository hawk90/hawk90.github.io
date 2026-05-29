---
title: "UML 33: 커뮤니케이션 다이어그램 — 시퀀스의 공간적 자매"
date: 2026-05-03T04:30:00
description: "메시지를 시간 축이 아닌 공간(객체 배치)에 놓고 본다. UML 1.x의 'Collaboration Diagram'이 2.0에서 개명됐다."
tags: [UML, Communication Diagram, Interaction, Message]
series: "UML 2.5.1"
seriesOrder: 33
draft: true
---

## 한 줄 요약

> **"같은 정보를 시간이 아닌 공간으로"** — 객체들의 배치를 보여주고, 메시지엔 *번호*를 붙여 순서를 표기. 시퀀스 다이어그램의 자매.

## 어떤 문제를 푸는가

18편의 시퀀스 다이어그램은 **시간 축**을 길이로 가집니다. 그래서 *언제 무엇이 일어났나*가 잘 보이지만, *누가 누구를 아는가*는 묻혀버립니다.

커뮤니케이션 다이어그램은 같은 시나리오를 **공간 배치**로 그립니다. 메시지 순서는 번호(`1`, `1.1`, `2` ...)로 표시. 그러면 다음이 잘 보입니다.

- 어떤 객체끼리 *링크가 있는가* (구조 정보).
- 메시지 한두 개 흐름의 *공간적 응집*.

> 💡 **이름 주의** — UML 1.x에선 *Collaboration Diagram*, UML 2.0(2005)에서 **Communication Diagram**으로 개명됐습니다. 의미도 살짝 좁아졌습니다 — *역할 묶음*으로서의 "Collaboration"은 27편에서 다룬 **구조적 분류자**로 남고, 다이어그램은 *메시지 흐름* 시각화에 집중.

## 한눈에 보는 구조

![Communication diagram — order checkout](/images/blog/uml/diagrams/item33-communication.svg)

- 객체(또는 역할)는 박스로
- 객체 간 **링크**는 실선
- 링크 위에 **메시지 번호 + 이름**

## 시퀀스 ↔ 커뮤니케이션 — 같은 정보, 다른 시각

같은 시나리오를 두 표기로:

### 시퀀스 표기

![Same flow drawn as a sequence diagram](/images/blog/uml/diagrams/item33-comm-sequence-table.svg)

### 커뮤니케이션 표기

![Communication diagram: same calls indexed 1, 1.1, 1.2](/images/blog/uml/diagrams/item33-comm-numbered.svg)

같은 정보다. **연속 번호**가 시퀀스 다이어그램의 *시간 축* 역할.

## 번호 매기는 규칙

| 패턴 | 의미 |
| --- | --- |
| `1`, `2`, `3` | 같은 레벨, 순차 |
| `1.1`, `1.2` | `1`이 호출한 하위 메시지 |
| `1a`, `1b` | 같은 메시지의 분기 (alt) |
| `*[조건]` | 반복 (loop) |
| `1.1 / 2.1` | 병렬(parallel paths) |

복잡한 시나리오는 번호 표기가 빨리 무거워지므로, **분기·반복·병렬이 많으면 시퀀스로** 가는 게 좋습니다.

## 언제 무엇을 쓰나

| 강점 | 적합 |
| --- | --- |
| **공간 구조** | 객체 간 *링크가 어디 있는지* 보고 싶을 때 — 커뮤니케이션 |
| **시간 흐름** | 메시지 *순서·동시성·반복*이 중요할 때 — 시퀀스 |
| 객체 5개 이하 | 둘 다 잘 보임 |
| 메시지 20개 이상 | 둘 다 힘들어짐 — 분할 |

대부분 팀은 **시퀀스를 기본**으로 쓰고, *링크의 공간적 응집*을 강조하고 싶을 때만 커뮤니케이션을 함께 그립니다.

## 도구 지원

| 도구 | 커뮤니케이션 지원 |
| --- | --- |
| Sparx EA | ✓ |
| MagicDraw / Cameo | ✓ |
| Visual Paradigm | ✓ |
| PlantUML | ✓ (`@startuml ... :A --> :B : msg @enduml`) |
| Mermaid | ✗ (시퀀스만) |

PlantUML 예:

```text
@startuml
:Customer -> :Order : 1: checkout()
:Order -> :Inventory : 1.1: reserve()
:Order -> :Payment : 1.2: charge()
@enduml
```

(*우리 블로그에서는 PlantUML 대신 TikZ를 쓰지만, 도구 지원 메모 차원에서 표기.*)

## 자주 하는 실수

> ⚠️ 같은 정보를 두 다이어그램에 둘 다 그리기

시퀀스로 충분하면 시퀀스만. 두 시각이 *다른 가치*를 줄 때만 둘 다.

> ⚠️ 메시지 번호 매기기 누락

번호 없는 커뮤니케이션 다이어그램은 *그냥 객체 다이어그램*이 됩니다.

> ⚠️ "Collaboration Diagram"이라 부르기

UML 2.0 이후 공식 명칭은 *Communication Diagram*. 옛 책·도구가 옛 이름을 써도 본인 문서에선 새 이름을 씁니다.

## 정리

- 커뮤니케이션 다이어그램은 **공간 + 번호로 본 상호작용**.
- 시퀀스와 같은 정보, 다른 시각 — 도구가 보통 둘 사이 변환 지원.
- 번호 규칙: `1`, `1.1`, `1a`, `*[]`, `/` 으로 순차·중첩·분기·반복·병렬.
- **링크 응집**을 강조하고 싶을 때만 추가, 기본은 시퀀스로.
- UML 1.x의 *Collaboration Diagram*이 개명된 것 — 옛 이름 주의.

다음 편은 **상호작용 개요 + 타이밍 다이어그램** — 상호작용의 두 보조 시각.

## 관련 항목

- [UML 15: 상호작용](/blog/programming/design/uml/item15-interactions)
- [UML 18: 시퀀스 다이어그램](/blog/programming/design/uml/item18-sequence-diagrams)
- [UML 27: 협력](/blog/programming/design/uml/item27-collaborations) — *구조적* Collaboration(다이어그램 아님)
