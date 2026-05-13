---
title: "Chapter 1: Welcome to Software Construction"
date: 2025-06-20T01:00:00
description: "소프트웨어 construction이란 무엇인가 — 코딩과 디버깅을 중심으로 한 활동들. 전체 개발 과정에서의 위치와 중요성."
series: "Code Complete"
seriesOrder: 1
tags: [software-construction, code-complete, McConnell]
draft: true
---

## 이 챕터의 메시지

Steve McConnell이 책의 첫 챕터에서 정의를 명확히 한다 — **"construction"이란 무엇을 가리키는가?** 일반적으로 소프트웨어 개발은 여러 활동으로 나뉜다. 이 중 "construction"은 **코딩과 디버깅을 중심**으로 하면서 상세 설계·단위 테스트·통합 테스트의 일부를 포함한다.

> Construction은 전체 개발 시간의 **30~80%**를 차지하며, **모든 프로젝트에서 반드시 일어나는** 유일한 활동이다.

## 핵심 내용

- Construction의 중심은 **코딩·디버깅**, 거기에 상세 설계·단위 테스트·통합 테스트의 일부.
- **시간 비중** — 프로젝트 크기에 따라 30~80%.
- **결함 비중** — 소규모 프로젝트의 75%, 중·대규모의 50~75%가 construction에서 발생.
- 다른 단계는 건너뛸 수 있어도 — **construction은 반드시 한다**.
- 코드는 시스템의 **유일하게 정확하고 최신인 표현**.

## Construction의 범위

McConnell은 소프트웨어 개발 활동을 다음과 같이 나열한다(§1.1, Figure 1-1).

- 문제 정의 (Problem Definition)
- 요구사항 개발 (Requirements Development)
- 건설 계획 (Construction Planning)
- 소프트웨어 아키텍처 (Software Architecture)
- **상세 설계** (Detailed Design) ← construction에 포함
- **코딩과 디버깅** (Coding and Debugging) ← construction의 중심
- **단위 테스트** (Unit Testing) ← construction에 포함
- **통합 테스트** (Integration Testing) ← construction에 포함
- 통합 (Integration)
- 시스템 테스트 (System Testing)
- 수정 유지보수 (Corrective Maintenance)

McConnell의 표현 — *"construction은 대체로 코딩·디버깅이지만 — 상세 설계·단위 테스트·통합 테스트의 요소도 일부 포함한다"*.

## Construction의 구체적 작업

McConnell이 본문에 열거하는 construction 작업(§1.1):

- 작업 진행을 위한 기반 검증.
- 코드를 어떻게 테스트할지 결정.
- 클래스와 루틴(routine)의 설계와 작성.
- 변수와 명명된 상수의 생성과 명명.
- 제어 구조 선택과 명령문 블록 조직.
- 자기 코드의 단위 테스트·통합 테스트·디버깅.
- 동료의 저수준 설계·코드 리뷰, 자기 코드 리뷰 받기.
- 포맷팅·주석으로 코드 다듬기.
- 별도로 만든 컴포넌트의 통합.
- 코드 튜닝(크기·속도).

## 왜 construction이 중요한가 (§1.2)

### 1. 큰 시간 비중

> "프로젝트 크기에 따라, construction은 일반적으로 — 전체 시간의 **30~80%**를 차지."

이만큼의 시간을 쓰는 활동은 — 프로젝트 성공에 직접적 영향을 줄 수밖에 없다.

### 2. 중심 활동

요구사항과 아키텍처는 construction을 **효과적으로 하기 위해** 그 전에 한다. 시스템 테스트는 construction이 잘 되었는지 **확인하기 위해** 그 후에 한다. Construction이 — **개발 프로세스의 중심**.

### 3. 개인 생산성의 큰 차이

McConnell이 인용 — Sackman, Erikson, Grant(1968)는 construction 단계의 개인 생산성이 **10~20배** 차이날 수 있음을 보였다. 이후 여러 연구(Curtis 1981, Mills 1983, Card 1987, DeMarco & Lister 1999, Boehm 2000)에서 확인됨.

> 이 책은 — **최고 프로그래머들이 이미 쓰고 있는 기법**을 — 모든 프로그래머가 배우게 하는 책.

### 4. 코드는 시스템의 유일한 정확한 표현

요구사항·설계 문서는 시간이 지나면 — **낡는다**. 코드는 — **항상 최신**. 그러므로 코드가 시스템의 가장 신뢰할 수 있는 문서.

### 5. 반드시 일어나는 유일한 활동 (KEY POINT)

> 이상적인 프로젝트 = 신중한 요구사항 + 아키텍처 + construction + 통계적 시스템 테스트.

그러나 — 현실의 프로젝트는 요구사항을 건너뛰고, 설계를 줄이고, 테스트를 잘라낸다. 하지만 — **construction만은 건너뛸 수 없다**. 프로그램이 있으려면 — construction이 있어야 한다.

## "Coding"이라 부르지 않는 이유

McConnell은 "coding"이 부적절한 단어라고 지적한다.

> "Coding"은 — 사전에 만들어진 설계를 컴퓨터 언어로 **기계적 번역**하는 것을 — 함의한다. Construction은 — 그렇지 않다.

Construction = **실질적 창의성과 판단**을 포함한다. 그래서 책 전체에서 "programming"과 "construction"을 동의어로 사용.

## Key Points (§1.3 직후)

McConnell이 직접 정리한 챕터의 키 포인트:

- 소프트웨어 construction은 **개발의 중심 활동**.
- 주요 활동 = 상세 설계, 코딩, 디버깅, 개발자 테스트.
- 다른 흔한 이름: "coding and debugging", "programming".
- Construction의 품질이 — 소프트웨어의 품질에 큰 영향.
- 결국, construction을 어떻게 하는지에 대한 이해가 — **얼마나 좋은 프로그래머인가**를 결정.

## 정리

- Construction = 코딩·디버깅 중심 + 상세 설계·단위/통합 테스트 일부.
- 시간 30~80%, 결함 50~75%.
- 다른 단계는 줄여도 — construction은 반드시 일어남.
- 개인 생산성 10~20x 차이.
- 코드 = 시스템의 유일한 정확한 표현.

## 관련 항목

- [Ch 2: 풍부한 이해를 위한 은유](/blog/programming/engineering/code-complete/ch02-Metaphors-for-a-Richer-Understanding)
- [Clean Code Ch 1: 클린 코드](/blog/programming/engineering/clean-code/chapter01-clean-code)
