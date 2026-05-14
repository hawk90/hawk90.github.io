---
title: "UML 5: 관계 — Dependency · Association · Generalization · Realization"
date: 2026-04-01T05:00:00
description: "네 가지 관계만 알면 UML 다이어그램의 99%는 읽을 수 있다."
tags: [UML, Class Diagram, Relationships, OOP]
series: "UML User Guide"
seriesOrder: 5
draft: true
---

## 한 줄 요약

> **"점선·실선·빈 삼각형·점선 삼각형"** — UML 관계는 이 네 가지면 충분.

## 어떤 문제를 푸는가

클래스 박스 하나만 그리면 그건 그냥 자료구조 도면입니다. 시스템은 **관계**로 살아납니다. 누가 누구를 알고, 누가 누구의 일종이고, 누가 누구를 의존하는지.

UML은 이 관계를 네 가지로 정리합니다.

## 한눈에 보는 구조

![Relationships](/images/blog/uml/diagrams/item05-relationships.svg)

위에서 아래로: **의존 → 연관 → 일반화 → 실체화**. 그림이 점점 굵어지는 순서이기도 합니다 (약한 관계 → 강한 관계).

## 1. Dependency — 의존

**점선 + 화살표.** "A가 B를 쓴다, B가 변하면 A도 영향받는다."

가장 약한 관계입니다. A는 B를 **임시로** 사용합니다 — 메서드 파라미터로, 지역변수로, 반환값으로.

```cpp
class ClientA {
public:
    void process(ServiceA& s) { s.doIt(); }   // ServiceA에 의존
};
```

스테레오타입으로 의존의 종류를 더 구체화할 수 있습니다.

- `<<use>>` — 단순 사용
- `<<create>>` — 인스턴스 생성
- `<<call>>` — 호출
- `<<derive>>` — 파생 (계산된 값)

## 2. Association — 연관

**실선.** "A는 B를 안다 (필드로 보유)."

객체끼리의 **지속적인** 연결입니다. A가 B에 대한 참조를 멤버로 가지고 있을 때.

```cpp
class Order {
    Customer* customer;   // Order는 Customer와 연관
};
```

### 다중도 (Multiplicity)

연관 양 끝엔 **몇 개**가 연결되는지 표시합니다.

| 표기 | 의미 |
| --- | --- |
| `1` | 정확히 1개 |
| `0..1` | 0 또는 1 |
| `*` 또는 `0..*` | 0개 이상 |
| `1..*` | 1개 이상 |
| `2..5` | 2개에서 5개 |

### 방향성

- 양방향: `Order ─ Customer` — 서로 안다
- 단방향: `Order → Customer` — Order만 안다

### Aggregation vs Composition

연관의 특수 형태:

- **Aggregation** (빈 마름모) — "전체-부분"이지만 부분이 독립 생존. 부서 ◇ 직원.
- **Composition** (꽉 찬 마름모) — "전체-부분", 부분의 생명주기가 전체에 묶임. 집 ◆ 방.

## 3. Generalization — 일반화

**실선 + 빈 삼각형.** "A는 B의 일종이다 (상속)."

```cpp
class Dog : public Animal { /* ... */ };
```

OOP의 "is-a" 관계. 자식이 부모의 속성·연산·관계·의미를 모두 물려받습니다.

다중 상속도 그릴 수 있습니다 — 화살표 두 개를 두 부모에게.

## 4. Realization — 실체화

**점선 + 빈 삼각형.** "A는 B의 명세를 구현한다 (인터페이스 구현)."

```java
class ArrayList implements List { /* ... */ }
```

일반화와 실체화의 차이는:

- 일반화 = **구조 + 행동** 둘 다 물려받음 (extends)
- 실체화 = **행동(인터페이스)만** 약속, 구조는 안 물려받음 (implements)

다이어그램 표기는 거의 같지만 **점선 vs 실선**으로 구분됩니다.

## 자주 하는 실수

> ⚠️ 의존과 연관을 혼동

지역변수로만 쓰면 **의존**(점선), 멤버 필드로 가지면 **연관**(실선). 헷갈리면 "오래 살고 있나?"로 판단.

> ⚠️ Aggregation을 남발

빈 마름모 vs 꽉 찬 마름모의 차이가 잘 모호하면 그냥 **연관**으로 그리세요. 도메인 의미가 분명할 때만 마름모를 씁니다.

> ⚠️ 다중도 생략

`Order ─ Customer` 만 그리면 1대1인지 1대다인지 모릅니다. 양 끝에 숫자를 적으세요.

## 네 관계 한눈에

| 관계 | 표기 | 의미 | 코드 |
| --- | --- | --- | --- |
| Dependency | 점선 → | "쓴다" | 파라미터·로컬 |
| Association | 실선 | "안다" | 멤버 필드 |
| Generalization | 실선 + 빈 △ | "일종이다" | extends |
| Realization | 점선 + 빈 △ | "구현한다" | implements |

## 정리

- UML 관계는 **4종이면 충분**.
- 굵기: **의존(점선) < 연관(실선) < 상속(삼각형)**.
- 연관에 **다중도**·**방향**·**aggregation/composition**을 더해 의미를 풍성하게.
- 실체화는 점선 삼각형 — Java/C# 인터페이스 구현이 대표.

다음 편은 **공통 메커니즘** — 스테레오타입·태그값·제약·노트로 UML 어휘를 확장하는 법.
