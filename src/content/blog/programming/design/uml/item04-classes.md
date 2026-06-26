---
title: "UML 4: 클래스 — 책임을 가진 가장 중요한 building block"
date: 2026-05-03T04:00:00
description: "클래스는 단순한 직사각형이 아니다 — 이름·속성·연산·책임·스테레오타입의 종합 패키지."
tags: [UML, Class Diagram, OOP, Fundamentals]
series: "UML 2.5.1"
seriesOrder: 4
draft: true
---

## 한 줄 요약

> **"같은 책임을 가진 객체들의 분류"** — 클래스는 데이터(속성)와 행동(연산)을 묶은 단위이자 시스템의 모든 다이어그램에 등장하는 주연.

## 어떤 문제를 푸는가

객체 지향 시스템을 그릴 때 가장 많이 그리는 것은 **클래스**입니다. 그래서 UML이 클래스를 어떻게 그리는지에 가장 많은 페이지를 할애합니다.

3편에서 봤듯 클래스는 3칸 직사각형입니다. 이 박스에 들어가는 5요소를 자세히 봅시다.

## 한눈에 보는 구조

![Class anatomy](/images/blog/uml/diagrams/item04-class-anatomy.svg)

왼쪽은 **구체 클래스**, 오른쪽은 **추상 클래스**(이름이 이탤릭, `<<abstract>>` 스테레오타입).

## 클래스 5요소

### 1. 이름 (Name)

- 단순 이름 (`Customer`) — 같은 패키지 안에서 사용
- 경로 이름 (`Sales::Customer`) — 패키지를 명시할 때

이름만으로 클래스의 책임이 짐작 가도록 명사를 신중히 고릅니다. `Manager`, `Helper`, `Util` 같은 모호한 이름은 안티패턴입니다.

### 2. 속성 (Attributes)

```
[가시성] 이름 [: 타입] [= 기본값] [{property}]
```

예시:

- id : Long
- name : String
- tier : Tier = Bronze
- email : String {unique}

`{property}`는 제약·꾸밈입니다: `{readOnly}`, `{ordered}`, `{unique}` 등.

### 3. 연산 (Operations)

```
[가시성] 이름(파라미터 리스트) [: 반환타입] [{property}]
```

파라미터는 `방향 이름 : 타입 = 기본값` 형식:
- 방향: `in` (기본), `out`, `inout`
- 예: `+ transfer(in amount : Money, out tx : TxResult) : void`

### 4. 책임 (Responsibilities)

UML 클래스에는 네 번째 (선택적) 칸 — 자연어로 그 클래스가 **무엇을 책임지는가**를 쓰는 칸이 있습니다.

<img src="/images/blog/uml/diagrams/item04-class-with-responsibilities.svg" alt="UML 클래스의 4번째 칸 — 책임(Responsibilities)" style="max-width:100%; background:white; padding:8px; border-radius:6px;" />

CRC 카드(Class-Responsibility-Collaborator)의 책임 부분이 그대로 들어옵니다. 초기 설계 단계엔 속성·연산보다 이 칸이 더 중요할 수 있습니다.

### 5. 스테레오타입 (Stereotype)

이름 위에 `<<entity>>`, `<<service>>`, `<<controller>>` 같이 분류를 붙입니다. UML 어휘 확장 메커니즘으로, 도메인에 맞는 분류를 도입할 때 씁니다.

## 추상 vs 구체

- **추상 클래스** — 이름이 이탤릭, `{abstract}` 또는 `<<abstract>>` 명시. 인스턴스화 불가.
- **추상 연산** — 연산 이름이 이탤릭, 본문 없음.
- **루트 / 리프** — `{root}` (상속 불가), `{leaf}` (자식 불가).

## 어떤 정보를 보이고 어떤 정보를 숨길까

UML 클래스는 **선택적**으로 정보를 보입니다.

- 다이어그램의 주인공이라면 — 풀 디테일
- 옆에서 잠깐 등장하면 — 이름만
- 시퀀스 다이어그램에서 — 보통 이름만

같은 클래스가 다이어그램마다 다르게 그려져도 됩니다. 보고 싶은 면만 보여주는 게 UML의 일관된 원칙.

## 자주 하는 실수

> ⚠️ "모든 클래스에 모든 칸을 다 채워야 합니다"

아닙니다. 책임·속성·연산 모두 **선택적**. 다이어그램 목적에 맞게.

> ⚠️ 클래스 이름을 동사로

`Manager`, `Processor`, `Handler`는 이름이 모호합니다. 책임이 너무 광범위하다는 신호 — 두 개로 쪼개세요.

> ⚠️ 가시성을 일관성 없이

같은 다이어그램 안에서 어떤 클래스는 `+`/`-`를 쓰고 다른 클래스는 안 쓰면 의도가 흐려집니다.

## 정리

- 클래스 5요소: **이름 · 속성 · 연산 · 책임 · 스테레오타입**.
- 속성·연산은 가시성·타입·제약을 모두 표시할 수 있습니다.
- 추상 클래스는 **이탤릭**, 추상 연산도 **이탤릭**.
- 같은 클래스도 다이어그램마다 **다른 디테일 수준**으로 그려도 됩니다.

다음 편은 **관계** — 클래스들이 어떻게 얽혀 시스템이 되는지.
