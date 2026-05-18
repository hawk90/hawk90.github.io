---
title: "UML 31: 시스템과 모델 — 시리즈를 마무리하며"
date: 2026-04-02T07:00:00
description: "31편의 UML 시리즈 정리. System은 Models를 포함하고, Models는 Diagrams를 가진다."
tags: [UML, Modeling, Summary, System]
series: "UML User Guide"
seriesOrder: 31
draft: true
---

## 한 줄 요약

> **"시스템 ⊃ 모델 ⊃ 다이어그램"** — 시스템은 여러 모델의 묶음, 모델은 여러 다이어그램으로 그려진다. 31편 동안 다룬 모든 것이 이 한 줄에 모인다.

## 어떤 문제를 푸는가

시리즈 30편 동안 13가지 다이어그램을 다뤘습니다. 마지막으로 이 모든 것을 **한 시스템 안에서** 어떻게 관리하는지를 봅니다.

## 한눈에 보는 구조

![System contains models contains diagrams](/images/blog/uml/diagrams/item31-systems-and-models.svg)

- **시스템**(System): 우리가 모델링하려는 대상 전체.
- **모델**(Model): 시스템의 한 면(view)을 보여주는 추상.
- **다이어그램**(Diagram): 모델 안의 한 시각화.

## System

UML 모델링의 최상위 단위. 시스템은:

- 명확한 **경계**를 가진다
- **목적**을 가진다
- 외부 환경과 **인터페이스**한다
- 여러 **서브시스템**으로 분해된다

`<<system>>` 스테레오타입을 패키지에 적용해 시스템을 표시.

## Model — 같은 시스템의 다른 면

한 시스템은 **여러 모델**로 본다. Kruchten의 4+1 뷰가 대표:

| 뷰 | 모델 | 관심사 |
| --- | --- | --- |
| Logical | 도메인 모델 | 구조·행위 |
| Process | 동시성 모델 | 성능·확장 |
| Implementation | 구현 모델 | 모듈 |
| Deployment | 배포 모델 | 토폴로지 |
| Use Case | 시나리오 모델 | 사용자 관점 |

각 모델은 자기 다이어그램 집합을 가진다.

## Diagram — 모델의 시각적 투영

다이어그램은 모델의 **한 페이지**입니다 — 모든 정보를 다 보여주지 않습니다.

- 같은 모델에서 여러 다이어그램이 나온다.
- 같은 요소가 다른 다이어그램에 다른 디테일로.
- 모델 자체는 도구의 데이터베이스에 들어있다.

## Trace — 모델 간 추적성

좋은 UML 모델은 **추적성**(traceability)을 가집니다:

- 유스케이스 → 시퀀스: 시나리오가 어떻게 객체 협력으로 풀리나
- 클래스 → 컴포넌트: 어떤 클래스들이 묶여 컴포넌트가 되나
- 컴포넌트 → 노드: 어떤 노드에 배포되나
- 요구사항 → 테스트: 어떤 테스트가 어떤 요구사항을 검증하나

UML 도구는 이 trace 링크를 자동으로 관리합니다.

## 시리즈에서 배운 것

### Part 1 (1-3): 기반

- 모델링의 4가지 목적: 시각화·명세·구축·문서화
- UML 세 덩어리: building blocks, rules, common mechanisms
- 13개 다이어그램은 모두 이 토대 위에

### Part 2 (4-8): 기본 구조

- 클래스 5요소
- 4가지 관계: dependency · association · generalization · realization
- 클래스 다이어그램: 도메인의 지도

### Part 3 (9-14): 고급 구조

- 분류자 패밀리: 인터페이스 · 데이터타입 · 시그널 · 액티브
- composition · qualified · n-ary · association class
- 패키지로 모델 관리
- 객체 다이어그램: 한 순간의 스냅샷

### Part 4 (15-19): 기본 행위

- 상호작용의 4 building block
- 유스케이스: 외부에서 본 가치 단위
- 시퀀스: 시간 축 협력
- 활동: 흐름이 주인공일 때

### Part 5 (20-24): 고급 행위

- 이벤트 4종: Call · Signal · Time · Change
- 상태 머신: 객체 라이프사이클
- 동시성·composite state·history·region
- 시간 제약과 위치

### Part 6 (25-30): 아키텍처

- 컴포넌트: 빌드·배포·교체 단위
- 협력과 패턴: 재사용 가능한 디자인
- 컴포넌트·배포 다이어그램: 운영의 청사진

## 실무 권장 사항

### 최소한 그려둘 것

작은 프로젝트라도 다음 5개는 그려둘 가치가 있습니다.

1. **유스케이스 다이어그램** — 시스템 스코프
2. **클래스 다이어그램 (도메인)** — 핵심 도메인 객체
3. **시퀀스 다이어그램 (주요 시나리오)** — 핵심 흐름
4. **상태 머신 (복잡한 객체)** — 라이프사이클
5. **배포 다이어그램** — 운영 토폴로지

### 그리지 말 것

- UML 자체가 목적이 되는 다이어그램
- 코드를 그대로 옮긴 다이어그램 (가치 없음)
- 6개월 동안 안 본 다이어그램 (유지 안 됨)
- 도구가 자동 생성한 거대한 다이어그램 (읽기 어려움)

## 마치며

UML은 30년 가까이 살아남았습니다. 다음 두 이유로:

1. **공통 어휘** — 팀이 같은 그림으로 같은 이야기를 한다.
2. **다중 시각** — 시스템을 여러 면에서 본다.

도구·언어·플랫폼이 바뀌어도 이 두 가치는 변하지 않습니다.

> **"좋은 모델은 좋은 코드보다 오래간다."**

31편이 끝났습니다. 화이트보드에 UML을 그릴 때 이 시리즈의 한 편이라도 떠올라 도움이 된다면 충분합니다.

감사합니다.

---

## 시리즈 색인

1. [왜 모델링하는가](/blog/programming/design/uml/item01-why-we-model)
2. [UML 소개](/blog/programming/design/uml/item02-introducing-the-uml)
3. [Hello, World](/blog/programming/design/uml/item03-hello-world)
4. [클래스](/blog/programming/design/uml/item04-classes)
5. [관계](/blog/programming/design/uml/item05-relationships)
6. [공통 메커니즘](/blog/programming/design/uml/item06-common-mechanisms)
7. [다이어그램](/blog/programming/design/uml/item07-diagrams)
8. [클래스 다이어그램](/blog/programming/design/uml/item08-class-diagrams)
9. [고급 클래스](/blog/programming/design/uml/item09-advanced-classes)
10. [고급 관계](/blog/programming/design/uml/item10-advanced-relationships)
11. [인터페이스·타입·역할](/blog/programming/design/uml/item11-interfaces-types-roles)
12. [패키지](/blog/programming/design/uml/item12-packages)
13. [인스턴스](/blog/programming/design/uml/item13-instances)
14. [객체 다이어그램](/blog/programming/design/uml/item14-object-diagrams)
15. [상호작용](/blog/programming/design/uml/item15-interactions)
16. [유스케이스](/blog/programming/design/uml/item16-use-cases)
17. [유스케이스 다이어그램](/blog/programming/design/uml/item17-use-case-diagrams)
18. [시퀀스 다이어그램](/blog/programming/design/uml/item18-sequence-diagrams)
19. [활동 다이어그램](/blog/programming/design/uml/item19-activity-diagrams)
20. [이벤트와 시그널](/blog/programming/design/uml/item20-events-and-signals)
21. [상태 머신](/blog/programming/design/uml/item21-state-machines)
22. [프로세스와 스레드](/blog/programming/design/uml/item22-processes-and-threads)
23. [상태/활동 다이어그램 심화](/blog/programming/design/uml/item23-state-and-activity-diagrams)
24. [시간과 공간](/blog/programming/design/uml/item24-time-and-space)
25. [컴포넌트](/blog/programming/design/uml/item25-components)
26. [배포](/blog/programming/design/uml/item26-deployment)
27. [협력](/blog/programming/design/uml/item27-collaborations)
28. [패턴과 프레임워크](/blog/programming/design/uml/item28-patterns-and-frameworks)
29. [컴포넌트 다이어그램](/blog/programming/design/uml/item29-component-diagrams)
30. [배포 다이어그램](/blog/programming/design/uml/item30-deployment-diagrams)
31. **시스템과 모델** (현재)
