---
title: "Ch 13: 컴포넌트 응집도"
date: 2026-06-04T02:00:00
description: "무엇이 한 컴포넌트에 같이 들어가야 하는가. REP, CCP, CRP 세 원칙과 그 사이의 긴장."
tags: [Architecture, Components, Cohesion, REP, CCP, CRP]
series: "Clean Architecture"
seriesOrder: 13
---

## 이 챕터의 메시지

컴포넌트를 어떻게 나눌 것인가? 어떤 클래스들이 한 컴포넌트에 같이 들어가야 하는가?

Martin은 세 가지 원칙을 제시한다. 그 원칙들은 서로 **긴장 관계**다. 셋 모두를 동시에 만족시킬 수는 없고, 컴포넌트마다 어느 쪽을 우선시할지 선택해야 한다.

| 원칙 | 의미 | 약어 |
|---|---|---|
| Reuse/Release Equivalence Principle | 재사용 단위 = 릴리스 단위 | REP |
| Common Closure Principle | 함께 변하는 것은 함께 묶는다 | CCP |
| Common Reuse Principle | 함께 재사용되지 않는 것은 분리한다 | CRP |

## REP — 재사용/릴리스 등가성 원칙

> **The granule of reuse is the granule of release.**

재사용의 단위는 릴리스의 단위와 같다.

라이브러리를 쓰는 입장에서, 우리는 다음을 기대한다.

- 라이브러리에 **버전 번호**가 있다
- 새 버전이 나오면 **릴리스 노트**가 있다
- 우리가 의존하는 버전을 **고정**할 수 있다
- 다른 사람이 그 버전을 깨지 않는다고 신뢰할 수 있다

이게 가능하려면 라이브러리가 **하나의 릴리스 단위**여야 한다. 같은 의미로 응집된 클래스들의 묶음이 한 라이브러리가 된다.

따라서 **컴포넌트 안의 클래스들은 같은 목적을 공유**해야 한다. 무관한 클래스들이 한 컴포넌트에 섞여 있으면 사용자가 그 컴포넌트를 어떻게 다뤄야 할지 모른다.

## CCP — 공통 폐쇄 원칙

> **Gather into components those classes that change for the same reasons and at the same times.**

같은 이유로, 같은 시점에 변하는 클래스들을 한 컴포넌트에 모은다.

이것은 **SRP의 컴포넌트 수준 버전**이다. 한 컴포넌트는 한 이유로만 변해야 한다.

CCP는 **변경의 충격 범위**를 통제한다. 한 변경이 한 컴포넌트만 흔들면 좋다. 여러 컴포넌트를 동시에 흔들면 나쁘다 — 빌드, 테스트, 배포 모두에 비용이 든다.

> "For most applications, maintainability is more important than reusability. If the code in an application must change, you would rather that all of the changes occur in one component rather than be distributed across many components."

대부분 애플리케이션에서 유지보수성이 재사용성보다 중요하다. 변경이 한 컴포넌트에 모일수록 변경 비용이 작다.

## CRP — 공통 재사용 원칙

> **Don't force users of a component to depend on things they don't need.**

컴포넌트 사용자가 필요로 하지 않는 것에 의존하게 강요하지 마라.

이것은 **ISP의 컴포넌트 수준 버전**이다. 한 컴포넌트가 너무 많은 것을 포함하면, 그 컴포넌트를 쓰는 사용자도 자기가 안 쓰는 부분에 묶인다.

따라서 **같이 재사용되지 않는 클래스들은 같은 컴포넌트에 두지 마라**. 자주 함께 재사용되는 것끼리 묶고, 따로 쓰이는 것은 분리한다.

## 세 원칙의 긴장

세 원칙은 서로 다른 방향을 가리킨다.

- **REP** — 같은 목적의 클래스들 (재사용 단위 통일)
- **CCP** — 같이 변하는 클래스들 (변경 단위 통일)
- **CRP** — 같이 쓰이는 것만 (불필요한 의존 제거)

REP와 CCP는 **컴포넌트를 크게** 만들려는 압력이다. 더 많은 클래스를 한 컴포넌트에.

CRP는 **컴포넌트를 작게** 만들려는 압력이다. 사용자가 안 쓰는 것을 빼야 하므로.

긴장 다이어그램(tension diagram)으로 표현하면.

```
         CCP (변경 빈도)
          /\
         /  \
        /    \  너무 큼
       /      \  → 빈번한 변경
      /        \
     /          \
    REP─────────CRP
   (재사용)    (사용 의존)
```

세 정점 중 어느 쪽을 우선시하느냐에 따라 컴포넌트 크기가 결정된다.

## 프로젝트 단계별 우선순위

흥미로운 점은 우선순위가 **프로젝트 단계**에 따라 변한다는 것이다.

**프로젝트 초기**:
- 변경이 잦다
- CCP가 가장 중요 — 변경 비용 최소화
- 큰 컴포넌트 OK

**프로젝트 중기**:
- 안정화 시작
- CRP가 부상 — 사용자가 의존을 줄이고 싶어 한다
- 컴포넌트를 더 작게 쪼개기 시작

**프로젝트 후기 (라이브러리화)**:
- 재사용성이 중요
- REP가 우선 — 명확한 목적의 라이브러리
- CRP가 강하게 작동

Martin의 통찰 — **컴포넌트 분리는 정적인 디자인이 아니다**. 프로젝트가 자라면서 분리 방식도 진화한다.

## 실전 — 컴포넌트 응집의 신호

좋은 응집의 신호:
- 컴포넌트에 변경 요구가 일관되게 같은 종류로 들어온다
- 컴포넌트 안의 클래스들이 서로 자주 참조한다
- 사용자가 컴포넌트를 한 단위로 이해한다 — 이름이 명확하다

나쁜 응집의 신호:
- 한 변경이 여러 컴포넌트를 동시에 흔든다 (CCP 위반)
- 한 컴포넌트의 일부만 쓰는 사용자가 많다 (CRP 위반)
- 컴포넌트의 이름이 "Utils", "Helpers", "Common" — 목적 불명 (REP 위반)

## 정리

- 컴포넌트 응집도의 세 원칙 — **REP / CCP / CRP**
- **REP** — 재사용 단위 = 릴리스 단위, 같은 목적의 클래스를 묶는다
- **CCP** — 같이 변하는 것을 묶는다 (SRP의 컴포넌트 버전)
- **CRP** — 같이 안 쓰이는 것은 분리한다 (ISP의 컴포넌트 버전)
- 세 원칙은 **긴장 관계** — 모두 만족 불가
- 우선순위는 **프로젝트 단계에 따라 변한다**
- 정적 디자인이 아닌 진화하는 결정

## 다음 장 예고

다음 장은 **컴포넌트 결합** — 컴포넌트들이 서로 어떻게 의존해야 하는가. ADP, SDP, SAP.

## 관련 항목

- [Ch 7: SRP](/blog/programming/design/clean-architecture/chapter07-srp-the-single-responsibility-principle) — CCP의 출발점
- [Ch 10: ISP](/blog/programming/design/clean-architecture/chapter10-isp-the-interface-segregation-principle) — CRP의 출발점
- [C++ Software Design 가이드라인 28: 물리 의존 제거](/blog/programming/cpp/cpp-software-design/guideline28-build-bridges-to-remove-physical-dependencies)
