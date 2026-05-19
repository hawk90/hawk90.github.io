---
title: "Ch 33: 사례 연구 — 비디오 판매"
date: 2026-05-01T09:00:00
description: "비디오 판매 시스템을 Clean Architecture로 설계. Actor 분석부터 컴포넌트 분리, 의존성 그래프까지의 실전."
tags: [Architecture, CaseStudy]
series: "Clean Architecture"
seriesOrder: 33
draft: true
---

## 이 챕터의 메시지

지금까지 다룬 모든 원칙을 한 시스템에 적용해 보는 사례 연구. 비디오 판매 시스템을 디자인한다.

이 시스템은 다음을 한다.

- 비디오 강의를 판매
- 학생이 강의를 구매하고 시청
- 강사가 강의 콘텐츠를 관리
- 관리자가 시스템 운영

## Step 1 — Actor 식별

7장의 SRP가 actor 기반이라고 했다. 첫 단계는 actor를 식별하는 것.

**Actors**:

1. **Author (강사)** — 강의 콘텐츠 작성/편집
2. **Viewer (학생)** — 강의 구매/시청
3. **Administrator (관리자)** — 카탈로그/사용자/가격 관리

각 actor는 다른 변경 요구를 만든다. 그래서 각 actor의 코드가 분리되어야 한다.

## Step 2 — Use Case 카탈로그

각 actor마다 어떤 use case가 있는가.

**Author**:
- 강의 생성 / 편집 / 삭제
- 챕터 추가
- 비디오 업로드

**Viewer**:
- 카탈로그 둘러보기
- 강의 구매
- 강의 시청
- 진도 추적

**Administrator**:
- 사용자 관리
- 강의 카탈로그 관리
- 가격 정책 변경

이 use case들이 시스템의 핵심 행위다. Clean Architecture의 Use Cases 층에 해당.

## Step 3 — Actor × Data로 분리

전통적인 디자인은 "비디오는 한 클래스" 모델을 만든다. Author가 만들 때나 Viewer가 보는 때나 같은 Video 클래스.

Clean Architecture는 다르게 본다. **같은 비디오 데이터지만 각 actor의 시점에서 다른 모델**.

```
Video (저장)
   ↓
   ├── AuthorVideoModel    (편집용 — 권한, 편집 상태, 메타데이터)
   ├── ViewerVideoModel    (시청용 — 진도, 추천, 리뷰)
   └── AdminVideoModel     (관리용 — 통계, 매출, 신고)
```

각 actor마다 별도 모델. 같은 비디오를 다른 시점에서 보는 데이터 구조.

이게 7장의 SRP의 자연스러운 결과 — actor별 분리.

## Step 4 — 컴포넌트 분리

actor와 use case를 묶어 컴포넌트로.

```
[Author 컴포넌트]
   - AuthorVideoModel
   - CreateLectureUseCase
   - UpdateLectureUseCase
   - UploadVideoUseCase

[Viewer 컴포넌트]
   - ViewerVideoModel
   - BrowseUseCase
   - PurchaseUseCase
   - WatchUseCase

[Admin 컴포넌트]
   - AdminVideoModel
   - ManageCatalogUseCase
   - ManageUsersUseCase
   - ManagePricingUseCase
```

각 컴포넌트는 자기 actor의 변경 요구에만 반응한다. 다른 actor가 변경을 요구해도 안 영향 받는다 — **CCP**.

## Step 5 — 공통 컴포넌트

세 컴포넌트가 공유하는 코어 데이터가 있다.

```
[Shared Kernel]
   - Video (raw 저장 객체)
   - User (계정 정보)
   - Pricing (가격 정책)
```

이건 어떤 actor도 단독으로 가지지 못하는 공유 자원이다. 별도 컴포넌트로 분리.

다만 신중하게 — Shared Kernel은 변경하기 어렵다. 공유 부분이 너무 많아지면 결국 모든 actor에 영향. **작게 유지**한다.

## Step 6 — 의존성 그래프

컴포넌트 사이의 의존을 그린다.

```
[Frameworks & Drivers]
       ↓ (depends on)
[Interface Adapters]
       ↓
[Author UC]  [Viewer UC]  [Admin UC]
       ↓           ↓           ↓
       └───────────┴───────────┘
                   ↓
            [Shared Kernel]
            (Entities)
```

모든 의존이 안쪽(Shared Kernel)을 향한다. 의존성 규칙 만족.

## Step 7 — 디테일 격리

Adapter 층의 디테일을 격리.

```
[Author UC]
     ↓ uses
[LectureRepository] (인터페이스)
     ↑ implements
[MySqlLectureRepository] (Adapter)
     ↓ uses
[MySQL] (Framework)
```

DB는 가장 바깥. 비즈니스 로직은 인터페이스만 안다.

UI도 마찬가지.

```
[Viewer UC]
     ↑ presented by
[WatchPresenter]
     ↓ to
[WatchViewModel]
     ↓ displayed by
[WatchView] (Web/Mobile/...)
```

UI 기술이 바뀌어도 Use Case는 그대로.

## Step 8 — 어떻게 점진적 진화시킬 것인가

이 디자인이 완전한 형태로 시작하지 않아도 된다. 점진적 진화 가능.

1. **MVP** — Author / Viewer 둘만, 모놀리스, 단일 DB
2. **확장** — Admin 추가, 여전히 모놀리스
3. **분리** — Viewer가 트래픽 가장 큼 → Viewer 컴포넌트 추출 (마이크로서비스)
4. **분리** — Author 콘텐츠 작성이 분리 필요 → Author 컴포넌트 추출

각 단계마다 컴포넌트 경계가 이미 잘 그어져 있으므로 추출이 비교적 쉽다. 이게 모듈러 모놀리스 → 마이크로서비스 진화의 정확한 모습.

## 정리

- 사례 연구는 모든 원칙의 종합 적용
- **Actor 식별** → SRP
- **Use Case 카탈로그** → 시스템의 핵심 행위
- **Actor × Data 분리** → 같은 데이터를 다른 시점에서
- **컴포넌트 분리** → CCP 기반
- **Shared Kernel** → 신중하게, 작게
- **의존성 그래프** → 안쪽으로
- **디테일 격리** → DB, UI 인터페이스 뒤로
- **점진적 진화** → 처음 다 만들 필요 없음

## 다음 장 예고

마지막 장(34)은 Simon Brown이 쓴 "The Missing Chapter" — 실전 코드 조직에 대한 추가 조언.

## 관련 항목

- [Ch 22: The Clean Architecture](/blog/programming/design/clean-architecture/chapter22-the-clean-architecture)
- [Ch 7: SRP](/blog/programming/design/clean-architecture/chapter07-srp-the-single-responsibility-principle)
- [Ch 21: Screaming Architecture](/blog/programming/design/clean-architecture/chapter21-screaming-architecture)
