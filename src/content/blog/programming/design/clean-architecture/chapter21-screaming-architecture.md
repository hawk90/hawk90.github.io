---
title: "Ch 21: 비명 지르는 아키텍처"
date: 2026-05-01T21:00:00
description: "디렉터리 구조만 봐도 시스템이 무엇을 하는지 즉시 외쳐야 한다. 'Rails 프로젝트'가 아니라 '병원 시스템'이라고."
tags: [Architecture, ScreamingArchitecture, DomainDriven]
series: "Clean Architecture"
seriesOrder: 21
draft: true
---

## 이 챕터의 메시지

건축 도면을 본다고 상상하자. 도면을 펼치자마자 그 건물이 **무엇**인지 알 수 있어야 한다 — 집인가? 도서관인가? 병원인가?

소프트웨어 시스템의 디렉터리 구조도 같아야 한다. 디렉터리를 열자마자 그 시스템이 무엇을 하는지가 보여야 한다 — 도서관 시스템? 병원 시스템? 결제 시스템?

이게 **Screaming Architecture**다. 아키텍처가 도메인을 외쳐야 한다.

## 흔한 안티 패턴

대부분의 프로젝트는 다음과 비슷한 디렉터리 구조를 가진다.

```
src/
├── controllers/
├── models/
├── views/
├── services/
├── repositories/
└── utils/
```

이걸 보면 — "이건 MVC 웹 앱이구나" 라고 알 수 있다. 그러나 그 외에는 **아무것도 모른다**. 무엇에 관한 시스템인가? 도서관? 병원? 결제? 알 수 없다.

이게 안티 패턴이다. 디렉터리 구조가 **프레임워크**를 외치고 있다. 도메인이 아니라.

## 더 안 좋은 사례

```
src/
├── rails_helpers/
├── activerecord_models/
├── spring_controllers/
```

이건 더 나쁘다. 디렉터리가 프레임워크 이름까지 노출한다. 프레임워크를 바꾸려면 디렉터리 구조를 다 갈아엎어야 한다.

## Screaming Architecture

좋은 디렉터리 구조는 다음과 같다.

```
src/
├── patient_admission/         ← 입원
├── billing/                   ← 청구
├── lab_results/               ← 검사 결과
├── pharmacy/                  ← 약국
├── shared_kernel/
└── infrastructure/
```

이걸 본다면 "이건 병원 시스템이구나"가 명확하다. **도메인이 외친다**.

각 폴더는 **use case 또는 도메인 개념** 단위로 구성된다. 프레임워크는 한쪽 구석(infrastructure)에 있다.

## 왜 중요한가

이게 단순한 미적 이슈가 아니다. 실질적인 영향이 있다.

**1. 새 개발자의 학습 속도**

새로 합류한 개발자가 폴더 구조를 보고 도메인을 파악할 수 있다. "병원 시스템이구나, 환자 입원 모듈이 있고, 청구가 있고..."

프레임워크 중심 구조에서는 새 개발자가 도메인을 파악하려면 모든 코드를 다 읽어야 한다.

**2. 도메인 우선 사고**

폴더가 도메인을 보여 주면, 자연스럽게 도메인 차원에서 사고하게 된다. "이 기능은 어느 도메인에 속하나?" — 코드의 위치를 결정하는 기준이 도메인이 된다.

프레임워크 중심에서는 "이건 컨트롤러인가? 서비스인가?" — 디테일이 결정 기준이 된다.

**3. 프레임워크 교체 가능성**

프레임워크를 바꿔도 도메인 구조가 그대로 유지된다. Rails에서 Django로 옮겨도 patient_admission/ 폴더는 그대로다 — 내용물만 다시 짜면 된다.

## 프레임워크는 디테일

Martin이 거듭 강조하는 주장.

> **Your architecture should tell readers about the system, not about the frameworks you used in your system.**

아키텍처는 **시스템 자체**를 말해야 한다. 사용한 프레임워크가 아니라.

프레임워크는 17장에서 말한 "디테일"이다. 도구일 뿐이다. 시스템의 본질이 아니다.

## 테스트 가능성

Screaming Architecture는 **프레임워크 없는 테스트**를 가능하게 만든다.

- patient_admission/ 안의 코드는 Spring/Rails 없이도 테스트 가능
- 비즈니스 규칙이 프레임워크에 매여 있지 않으므로
- 테스트는 빠르고 격리됨

이게 Use Case 단위로 코드를 묶었을 때의 부가 이득이다.

## use case 단위 vs 레이어 단위

전통적인 레이어 디자인은 다음과 같다.

```
controllers/
  PatientController.java
  BillingController.java
services/
  PatientService.java
  BillingService.java
repositories/
  PatientRepository.java
  BillingRepository.java
```

같은 도메인 개념의 코드가 세 폴더에 흩어진다. 한 use case를 이해하려면 세 폴더를 모두 본다.

Screaming Architecture는 use case 단위로 묶는다.

```
patient_admission/
  PatientAdmissionController.java
  PatientAdmissionService.java
  PatientAdmissionRepository.java
  PatientAdmissionTests.java
```

한 use case의 모든 코드가 한 곳에 있다. CCP(Common Closure Principle) — 같이 변하는 것을 같이 둔다 — 의 실천이다.

## DDD와의 연관

이 아이디어는 Domain-Driven Design의 **Bounded Context**, **Module** 개념과 정확히 일치한다.

- DDD의 Bounded Context = 한 도메인 영역의 경계
- DDD의 Module = 한 도메인 개념 묶음

Screaming Architecture는 DDD의 모듈화 원칙을 디렉터리 구조에 적용한 것이다.

## 정리

- 디렉터리 구조가 **도메인을 외쳐야** 한다 — 프레임워크가 아니라
- 폴더 단위 = **use case 또는 도메인 개념** — 레이어가 아니라
- 프레임워크는 한쪽 구석(infrastructure)에 격리
- 새 개발자의 학습, 도메인 우선 사고, 프레임워크 교체 가능성 — 모두 개선
- CCP의 실천 — 같이 변하는 것을 같이 둔다
- DDD의 Bounded Context / Module과 같은 정신

## 다음 장 예고

다음 장은 **The Clean Architecture** — 책의 이름이자, 책 전체의 시각적 요약. 동심원 다이어그램.

## 관련 항목

- [Ch 20: 비즈니스 규칙](/blog/programming/design/clean-architecture/chapter20-business-rules) — 도메인의 핵심
- [DDD 시리즈](/blog/programming/design/domain-driven-design/chapter01-crunching-knowledge/) — 같은 정신의 깊은 다룸
