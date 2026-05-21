---
title: "UML 13: 인스턴스 — 특정 시점의 객체, 밑줄과 콜론 표기"
date: 2026-05-03T13:00:00
description: "클래스가 아니라 객체. 밑줄·콜론 두 기호로 표현하는 인스턴스의 모든 것."
tags: [UML, Object, Instance, Snapshot]
series: "UML 2.5.1"
seriesOrder: 13
draft: false
---

## 한 줄 요약

> **"객체는 밑줄 그어진 `이름 : 클래스`"** — UML에서 클래스와 객체의 시각적 차이는 단 두 기호.

## 어떤 문제를 푸는가

클래스 다이어그램은 **타입**을 보여줍니다. 그런데 "지금 시점의 메모리에 어떤 객체가 있는가"를 보고 싶을 때가 있습니다 — 디버깅, 알고리즘 시연, 시나리오 설명.

UML은 이때 **인스턴스(객체)**를 그립니다. 클래스와 시각적 차이를 분명히 합니다.

## 한눈에 보는 구조

![Instances](/images/blog/uml/diagrams/item13-instances.svg)

| 기호 | 의미 |
| --- | --- |
| 밑줄 | 인스턴스 (객체) |
| `이름 : 타입` | 이름있는 인스턴스 |
| `: 타입` | 익명 인스턴스 |
| 콜론 위치 | 이름 뒤에 타입 |

## 인스턴스 표기 패턴

### 1. 이름있는 인스턴스

<img src="/images/blog/uml/diagrams/item13-named-instance.svg" alt="이름 있는 인스턴스 — o1 : Order" style="max-width:100%; background:white; padding:8px; border-radius:6px;" />

`o1`은 객체의 식별자 (인스턴스 이름).

### 2. 익명 인스턴스

<img src="/images/blog/uml/diagrams/item13-anonymous-instance.svg" alt="익명 인스턴스 — : Customer" style="max-width:100%; background:white; padding:8px; border-radius:6px;" />

이름이 중요하지 않을 때.

### 3. 다중 분류 인스턴스

```
  o1 : Order, Auditable
```

객체 하나가 여러 클래스의 인스턴스를 동시에 만족할 때.

### 4. 명시적 클래스 없음

**o1:**

타입을 모를 때(또는 중요하지 않을 때).

## 속성 슬롯

인스턴스의 두 번째 칸엔 **속성 슬롯**이 들어갑니다.

<img src="/images/blog/uml/diagrams/item13-instance-detailed.svg" alt="상세 인스턴스 — 모든 필드 표시" style="max-width:100%; background:white; padding:8px; border-radius:6px;" />

- 값은 리터럴, 다른 인스턴스 참조, 컬렉션 등 모두 가능.
- 보여주고 싶은 슬롯만 적습니다.

## 인스턴스 vs 클래스 — 큰 차이

| | 클래스 | 인스턴스 |
| --- | --- | --- |
| 표기 | 굵은 글씨 | 밑줄 |
| 시간성 | 무시간 | 특정 시점 |
| 다이어그램 | 클래스 다이어그램 | 객체 다이어그램 |
| 칸 의미 | 속성 정의 | 속성 값 |

## 링크 (Link)

인스턴스 간의 연결은 **링크**(class의 association이 instance 레벨에서 인스턴스화된 것).

![Object link between Order and Customer instances](/images/blog/uml/diagrams/item13-object-link.svg)

- 클래스 다이어그램의 association ↔ 객체 다이어그램의 link
- 다중도는 객체 레벨에선 표시 안 함 (이미 인스턴스 갯수가 시각적으로 드러남)

## 정적 속성과 인스턴스

정적 속성은 클래스 자체에 속하므로 인스턴스 슬롯에는 안 들어갑니다.

```
class Counter {
    static int total;   ← Counter 클래스 박스에 표시
    int id;             ← 각 인스턴스 슬롯에 표시
}
```

## 활용 — 알고리즘 시각화

객체 다이어그램은 알고리즘 시연에 강력합니다.

```
Step 1: head → [1] → [2] → [3] → null

Step 2: head → [2] → [3] → null
        (deleted [1])
```

각 단계의 객체 그래프를 스냅샷으로 그립니다.

## 자주 하는 실수

> ⚠️ 밑줄 빼먹기

클래스인지 객체인지 구분하는 **유일한 기호**가 밑줄입니다. 절대 생략하지 마세요.

> ⚠️ 인스턴스에 연산 적기

인스턴스 칸은 **속성 값**입니다 — 연산은 클래스에 속함. 보여주려면 클래스 다이어그램에서.

> ⚠️ 너무 많은 인스턴스를 한 다이어그램에

객체 다이어그램의 강점은 **명료함**입니다. 핵심 시나리오 한 장면만.

## 정리

- 인스턴스는 **밑줄 그어진 `이름 : 타입`** 형식.
- 이름은 생략 가능(`: 타입`).
- 속성 슬롯엔 **값**이 들어간다 — 정의가 아니라.
- 인스턴스 간 연결은 **링크** — 다중도 표시 없음.
- 알고리즘·디버깅 시연에 강력.

다음 편은 **객체 다이어그램** — 인스턴스를 모아 시스템의 한 순간을 보여주는 다이어그램.
