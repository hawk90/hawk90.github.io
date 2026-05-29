---
title: "UML 31: 프로파일 다이어그램 — 도메인을 위한 UML 확장"
date: 2026-05-03T03:30:00
description: "스테레오타입·태그값·제약을 모아 도메인 전용 UML을 만드는 first-class 메커니즘. UML 2.5에서 다이어그램으로 승격."
tags: [UML, Profile, Stereotype, Extension, Domain]
series: "UML 2.5.1"
seriesOrder: 31
draft: true
---

## 한 줄 요약

> **"UML을 도메인 언어로 만드는 공식 통로"** — 스테레오타입 한두 개 흩어 쓰는 게 아니라, 묶음으로 정의·재사용·도구 지원을 받는 패키지.

## 어떤 문제를 푸는가

06편 공통 메커니즘에서 확장(extensibility) 세 도구를 봤습니다 — 스테레오타입·태그값·제약. 그런데 이 셋만으로는 부족한 게 두 가지 있습니다.

- 도메인마다 같은 확장을 **여러 프로젝트에서** 재사용하려면 따로 모아둬야 합니다.
- 도구(Sparx EA, MagicDraw, Papyrus 등)가 그 확장을 **이해하려면** 표준화된 형식이 필요합니다.

이 답이 **UML 프로파일**입니다. 그리고 UML 2.5에서 프로파일을 그리는 **다이어그램**이 별도 종류로 승격됐습니다.

> 💡 **UML 2.0(2005)에선 13개**, **2.5(2015)에서 14개**가 된 이유 — 프로파일 다이어그램이 first-class diagram type으로 들어왔습니다.

## 한눈에 보는 구조

![Profile diagram example](/images/blog/uml/diagrams/item31-profile-diagram.svg)

- **점선 화살표 + `«extension»`** — 프로파일의 스테레오타입이 메타클래스(`Class`, `Component` 등)를 확장한다는 표시
- 박스 안 `«stereotype»` 키워드 — 사용자 정의 스테레오타입
- 태그값(`{tag = ...}`)·제약은 스테레오타입 박스 안에 정의

## 세 가지 확장 도구의 자리

| 도구 | 역할 | 표기 |
| --- | --- | --- |
| **Stereotype** | 새 어휘 — 메타클래스의 변종 | `«entity»`, `«controller»`, `«ECU»` |
| **Tagged Value** | 새 속성 — 스테레오타입에 데이터 |  `{persistence = "JPA"}` |
| **Constraint** | 새 의미 규칙 — OCL 또는 자연어 | `{author count > 0}` |

프로파일은 이 셋을 **하나의 패키지**로 묶고 `«profile»` 스테레오타입을 붙입니다.

## 만드는 절차

### 1) 메타클래스 임포트

확장하려는 UML 메타클래스를 프로파일에 끌어옵니다.

![JEE Profile pulls in Class / Component metaclasses](/images/blog/uml/diagrams/item31-profile-jee.svg)

### 2) 스테레오타입 정의

각 스테레오타입은 *어떤 메타클래스를 확장하는지* 명시.

![Stereotypes extend metaclasses via «extension»](/images/blog/uml/diagrams/item31-stereotype-extensions.svg)

### 3) 태그값·제약 추가

스테레오타입 박스 안:

```text
«stereotype» Entity
  --
  + table : String
  + persistenceUnit : String
  --
  {table != ""}
```

### 4) 사용 — Profile Application

다른 모델에서 `«apply» JEE`로 프로파일을 적용하면 그 모델 안에서 `«Entity»`, `«SessionBean»` 같은 어휘를 자유롭게 씁니다.

## 실전 예 — 임베디드 안전 프로파일

자동차 ECU 모델링에 쓰는 작은 프로파일:

| 스테레오타입 | 메타클래스 | 태그값 | 의미 |
| --- | --- | --- | --- |
| `«ECU»` | Node | `{cpu, ram, asil}` | 전자제어유닛 |
| `«SafetyFunction»` | Class | `{asil, timeBudget_ms}` | ISO 26262 안전 기능 |
| `«CANSignal»` | Class | `{id, dlc, cycle_ms}` | CAN 신호 |
| `«TimingBudget»` | Constraint | — | 응답시간 상한 |

이 프로파일을 적용한 모델은 **그냥 UML이 아니라 차량 임베디드용 UML**이 됩니다. 도구는 ASIL 등급에 따른 검증 규칙을 자동으로 돌릴 수 있습니다.

## 잘 알려진 표준 프로파일

| 프로파일 | 목적 | 어디서 |
| --- | --- | --- |
| **SysML** | 시스템 공학 | OMG |
| **MARTE** | 실시간 임베디드 | OMG |
| **UML Testing Profile** | 테스트 모델링 | OMG |
| **SoaML** | SOA | OMG |
| **EAST-ADL** | 자동차 아키텍처 | EAST-ADL Association |
| **AUTOSAR Meta Model** | AUTOSAR | AUTOSAR Consortium |

이들은 모두 *UML 위에 얹은* 도메인 확장 — 새 언어를 만든 게 아닙니다.

## Profile vs Metamodel Extension

UML을 진짜로 *새로 확장*하는 방법은 두 가지입니다.

| | Profile | Metamodel Extension (MOF) |
| --- | --- | --- |
| 도구 | Stereotype + Tag + Constraint | 새 메타클래스 정의 |
| 권한 | 누구나 | OMG 표준화 절차 필요 |
| 호환성 | 기존 UML 도구에서 작동 | 도구가 알아야 |
| 비용 | 낮음 | 높음 |

99% 경우 프로파일이 답입니다. 메타모델 확장은 SysML 같은 거대 표준에서만.

## 자주 하는 실수

> ⚠️ 모든 클래스에 스테레오타입

뭐든 스테레오타입을 붙이면 시각적 노이즈만 생깁니다. **표준 UML로 표현 안 되는 의미**가 있을 때만.

> ⚠️ 프로파일 없이 스테레오타입 흩뿌리기

작은 프로젝트라면 OK지만, 5개 이상 스테레오타입이 모이면 **프로파일로 묶어두세요** — 의미 정의·재사용·도구 지원이 따라옵니다.

> ⚠️ 메타클래스 확장 방향 반대로

`«extension»` 화살표는 *스테레오타입 → 메타클래스* 방향. "확장하는 쪽이 화살표 꼬리"입니다.

## 정리

- 프로파일은 **스테레오타입·태그값·제약의 공식 묶음** — UML 2.5에서 다이어그램으로 승격.
- 세 가지 확장 도구를 **하나의 재사용 가능 패키지**로 만든다.
- 표준 프로파일(SysML·MARTE·SoaML 등)은 모두 이 메커니즘.
- 도메인이 분명하면 5분 짜리 프로파일도 가치 있다.

다음 편은 **컴포지트 구조 다이어그램** — 클래스 내부의 부품·포트·연결.

## 관련 항목

- [UML 6: 공통 메커니즘](/blog/programming/design/uml/item06-common-mechanisms) — 스테레오타입·태그값·제약의 기본
- [UML 32: 컴포지트 구조 다이어그램](/blog/programming/design/uml/item32-composite-structure-diagrams)
