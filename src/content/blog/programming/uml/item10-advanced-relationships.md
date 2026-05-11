---
title: "UML 10: 고급 관계 — Composition · Qualified · N-ary · Association Class"
date: 2026-07-03T11:00:00
description: "관계는 4종이 기본 — 그 위에 composition·한정자·n항·연관 클래스를 얹는다."
tags: [UML, Class Diagram, Relationships, Composition]
series: "UML User Guide"
seriesOrder: 10
draft: false
---

## 한 줄 요약

> **"관계의 의미를 더 정확히"** — 4가지 기본 관계에 composition/aggregation, qualified, n-ary, association class를 얹어 진짜 도메인 의미를 표현한다.

## 어떤 문제를 푸는가

5편의 4가지 관계만으로는 부족할 때가 있습니다.

- `Order` ── `Item`: 그냥 연관? 주문이 사라지면 아이템도 사라져야 하는데?
- `Bank` ── `Account`: 계좌번호로 찾아야 하는데 그 키를 어디에?
- `Person`과 `Company`가 **고용 관계**일 때 그 관계 자체가 속성(시작일·연봉)을 갖는다면?

UML은 이런 케이스를 위한 추가 표기를 제공합니다.

## 한눈에 보는 구조

![Advanced relationships](/images/blog/uml/diagrams/item10-advanced-relationships.svg)

## 1. Composition vs Aggregation

| 표기 | 의미 | 생명주기 |
| --- | --- | --- |
| ◆ (꽉 찬 마름모) | composition | 전체가 죽으면 부분도 죽음 |
| ◇ (빈 마름모) | aggregation | 전체가 죽어도 부분은 살아남음 |

```
House ◆—— Room        # 집 허물면 방도 없어짐
Department ◇—— Employee   # 부서 없어져도 직원은 남음
```

> 💡 실무에선 **composition만 쓰고 aggregation은 거의 안 씁니다**. 도메인 의미가 모호한 경우가 많고, Fowler도 "aggregation은 무시해도 된다"고 합니다.

## 2. Qualified Association — 한정자

연관에 **키**를 명시합니다.

```
Bank [accountNo] —— Account
```

- 의미: Bank는 `accountNo`를 키로 `Account`에 접근.
- 코드 매핑: `Map<String, Account>` 같은 자료구조.

은행-계좌, 사전-단어, DB-row 같은 lookup 관계를 정확히 표현할 때 유용합니다.

## 3. N-ary Association — 3항 이상 관계

세 개 이상의 클래스가 동시에 얽힐 때 **마름모**(diamond) 한 개로 표현합니다.

```
        Project
           |
           ◇
          / \
   Student   Mentor
```

학생-멘토-프로젝트 세 명이 동시에 등록되는 관계.

> 💡 실무에선 n-ary보다 **n-ary를 풀어 association class 또는 별도 클래스**로 만드는 게 더 명확합니다.

## 4. Association Class — 연관 클래스

**관계 자체가 속성을 가질 때**.

```
Person ── employed ── Company
            |
          (dashed)
            |
           Job
       + startDate
       + salary
```

- `Person`과 `Company`의 고용 관계가 데이터(`startDate`, `salary`)를 가진다.
- 점선으로 관계 본선과 연결.

DB의 **연결 테이블** (join table)을 모델링할 때 자연스럽게 등장합니다.

## 5. Generalization Sets

상속 계층의 **분류 축**을 명시합니다.

```
Animal
   ├─{age-group}─ Adult / Juvenile
   └─{species}── Dog / Cat / Bird
```

`{disjoint}`, `{overlapping}`, `{complete}`, `{incomplete}` 제약으로 분류 방식을 더 정확히.

## 6. Dependency 변종

`<<use>>` 외에도:

- `<<call>>` — 호출
- `<<send>>` — 시그널 송신
- `<<instantiate>>` — 인스턴스 생성
- `<<derive>>` — 파생 데이터 (계산)
- `<<refine>>` — 더 자세한 모델로의 정련

## 자주 하는 실수

> ⚠️ Composition을 디폴트로

확실한 소유 관계가 아니라면 그냥 **연관**을 씁니다. composition은 "수명 동기화"라는 강한 약속.

> ⚠️ N-ary로 그려야 마땅한 걸 단항 두 개로

3항 관계를 두 개의 2항 관계로 쪼개면 **잘못된 의미**가 됩니다. 함께 얽혀야 의미가 있는 관계라면 마름모로.

> ⚠️ Association class와 일반 클래스 혼동

연관 클래스는 **그 관계 인스턴스마다 정확히 하나**가 존재합니다. 일반 클래스와 다른 의미.

## 정리

- **Composition(◆)** 은 강한 소유(수명 동기화), **aggregation(◇)** 은 약한 소유(거의 안 씀).
- **Qualified association**은 키 기반 lookup — `Map<K, V>` 매핑.
- **N-ary**는 3개 이상의 클래스가 동시에 얽힐 때 마름모.
- **Association class**는 관계 자체가 속성을 가질 때.
- Dependency는 `<<use>>` 외에도 다양한 변종을 가짐.

다음 편은 **인터페이스 · 타입 · 역할** — ball-and-socket 표기와 의존성 역전.
