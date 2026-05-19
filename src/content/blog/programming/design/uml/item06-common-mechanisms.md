---
title: "UML 6: 공통 메커니즘 — 명세 · 꾸밈 · 분류 · 확장"
date: 2026-05-03T06:00:00
description: "UML이 30년 가까이 살아남는 이유 — 표준 어휘를 도메인에 맞게 늘릴 수 있다."
tags: [UML, Stereotype, Tag Value, Constraint, Extensibility]
series: "UML 2.5.1"
seriesOrder: 6
draft: false
---

## 한 줄 요약

> **"표준 어휘만으로 부족하면 늘려라"** — 스테레오타입·태그값·제약. UML은 자기 자신을 확장하는 법까지 표준화했다.

## 어떤 문제를 푸는가

`<<entity>>`, `<<service>>`, `<<controller>>`. 표준 UML에는 이런 어휘가 없습니다. DDD나 MVC, 클린 아키텍처에 등장하는 분류들이죠.

UML은 이 도메인 어휘를 **언어 자체를 고치지 않고** 도입할 수 있게 합니다. 그 도구가 이 편의 주제 — 공통 메커니즘(common mechanisms).

## 한눈에 보는 구조

![Common mechanisms](/images/blog/uml/diagrams/item06-common-mechanisms.svg)

`<<entity>>` 스테레오타입, `{author=...}` 태그값, `{ordered}` 제약이 한 다이어그램에 다 들어있습니다.

## 네 가지 메커니즘

### 1. 명세 (Specifications)

UML의 모든 그림 요소엔 **텍스트 명세**가 따라붙습니다. 클래스 박스는 명세의 시각적 투영(projection)일 뿐.

```
Order 클래스 명세:
- 책임: 주문 생성, 결제 처리, 배송 추적
- 불변 조건: total >= 0
- 사전 조건 (place): 결제 정보 유효
- 사후 조건 (place): 상태 = Placed
```

그림에 안 보이는 디테일은 모두 명세에 들어갑니다.

### 2. 꾸밈 (Adornments)

기본 요소에 정보를 더 붙이는 표기:

- 가시성 표시 (`+`, `-`, `#`, `~`)
- 다중도 (`1..*`)
- 역할 이름 (`employer`, `employee`)
- 객체 표시 (`Order:Sales`)
- 활성 클래스 (테두리 두 줄)

꾸밈은 **있으면 추가 정보, 없으면 모름**입니다.

### 3. 공통 분류 (Common Divisions)

UML은 모든 어휘를 두 축으로 나눕니다.

| 분류 1: 추상 vs 구체 | 클래스 ↔ 객체 |
| --- | --- |
| 분류 2: 인터페이스 vs 구현 | 약속 ↔ 실현 |

이 두 분류는 클래스에만 적용되지 않습니다 — 컴포넌트도, 노드도, 협력도 같은 분류를 가집니다.

### 4. 확장 메커니즘 (Extensibility)

UML 어휘를 **언어를 안 고치고** 늘리는 세 방법.

#### 스테레오타입 (Stereotype)

`<<...>>` 꺾쇠로 표기. **새로운 어휘**.

```
<<entity>>     <<value object>>     <<service>>
<<controller>> <<repository>>       <<factory>>
```

도구에 따라 아이콘으로도 표현됩니다 (예: `<<actor>>`는 막대 사람 그림으로).

#### 태그값 (Tagged Values)

`{key=value}` 형태. **새로운 속성**.

```
{author = "hawk"}
{version = 1.2}
{deprecated}
{deadline = "2026-07-15"}
```

도구는 이 값을 빌드·문서화에 활용합니다.

#### 제약 (Constraints)

`{...}` 형태. **새로운 의미 규칙**.

```
{ordered}        — 순서 있음
{unique}         — 중복 없음
{xor}            — 둘 중 하나만
{readOnly}       — 변경 불가
{subset}         — 한 집합이 다른 집합의 부분집합
```

OCL(Object Constraint Language)로 더 정확하게 쓸 수도 있습니다:

```
{self.balance >= 0}
{self.orders->forAll(o | o.status <> 'canceled')}
```

### UML Profile

이 세 확장을 **묶어** 도메인 전용 UML 변종을 만들 수 있습니다 — **UML Profile**. EJB, BPMN, SysML 등이 대표 사례입니다.

## 노트 (Notes)

따로 분류되지만 자주 쓰이는 요소: **노트(주석)**.

```
[ 이 클래스는 thread-safe ]
     |
     | (dashed line)
     |
   [Customer]
```

설명·근거·TODO를 다이어그램에 직접 적을 때 씁니다. 코드의 주석과 같은 역할.

## 자주 하는 실수

> ⚠️ 스테레오타입 남발

`<<class>>`, `<<helper>>` 같은 자명한 스테레오타입은 의미가 없습니다. **도메인 분류**를 도입할 때만 쓰세요.

> ⚠️ 태그값을 모든 곳에

태그값은 도구·자동화 컨텍스트에서 의미 있을 때 씁니다. 사람만 볼 거면 그냥 노트에 적는 게 낫습니다.

> ⚠️ 제약을 자연어로만

복잡한 제약은 OCL로 쓰면 도구가 검증할 수 있습니다. "양수여야 함" 정도면 자연어로 충분.

## 정리

- **명세**: 그림 뒤의 텍스트 — 그림은 일부, 명세가 전부.
- **꾸밈**: 가시성·다중도 등 추가 정보 — 있으면 풍성하게.
- **공통 분류**: 추상↔구체, 인터페이스↔구현 두 축이 UML 전체에 적용.
- **확장**: 스테레오타입(어휘) · 태그값(속성) · 제약(규칙) 세 가지. 묶어서 **Profile**.

다음 편은 **다이어그램** — 13종 다이어그램의 큰 그림.
