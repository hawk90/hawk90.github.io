---
title: "기술 포트폴리오 안티패턴"
source: "archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/page.html"
generated_at: 2026-08-01T07:38:34.968Z
---

# 기술 포트폴리오 안티패턴

<!-- source message: 26 -->

## A-01. Article Warehouse

### 글 창고

사이트가 다음처럼 구성된다.

```text
글
글
글
글
글
```

각 글의 품질은 나쁘지 않지만, 사이트 전체에서 어떤 지식 체계를 이루는지는 보이지 않는다.

### 증상

- 홈은 최신 글 목록 중심
- 카테고리는 단순 분류
- 글 사이의 선행·후속 관계가 없음
- 대표 가이드가 없음
- 특정 주제를 배우려면 검색해야 함
- 오래된 핵심 글이 묻힘

### 왜 문제인가

글이 늘어날수록 사이트의 가치는 증가해야 하는데, 실제로는 탐색 비용이 더 빠르게 증가한다.

```text
콘텐츠 증가
→ 선택지 증가
→ 탐색 난도 증가
→ 좋은 글 발견률 감소
```

### 발생 조건

- 100개 이상의 글
- 여러 전문 분야를 동시에 다룸
- 시리즈보다 단편 글이 많음
- 최근 글 중심 홈
- 내부 링크를 수동으로 거의 넣지 않음

### 개선 방향

```text
Topic
├── Guide
├── Concept
├── Experiment
├── Debug Note
└── Reference
```

글을 단순 게시물이 아니라 주제 아래의 역할 있는 문서로 배치한다.

### hawk90 적용

C++, CUDA, Firmware, PCIe, CXL 글을 단순 목록이 아니라 주제 허브 아래에 배치해야 한다.

---

<!-- source message: 26 -->

## A-02. Chronological Architecture

### 시간순 아키텍처

게시 날짜가 사이트의 가장 중요한 구조가 된다.

```text
2026년 글
2025년 글
2024년 글
```

### 증상

- 최신 글은 잘 보임
- 과거의 대표 글은 점점 뒤로 밀림
- 연속 학습이 어려움
- 글 작성 시점과 지식 순서가 일치하지 않음
- 검색 유입 없이는 오래된 글을 찾기 어려움

### 왜 문제인가

기술 지식은 시간순으로 배우지 않는다.

PCIe를 공부하는 사람은 최신 PCIe 글보다 다음 순서를 원한다.

```text
Configuration Space
→ Enumeration
→ BAR
→ MSI/MSI-X
→ DMA
→ IOMMU
```

### 개선 방향

시간축은 보조 탐색으로 남기고, 주제축을 중심에 둔다.

```text
Primary navigation: Topic
Secondary navigation: Series
Tertiary navigation: Date
```

### hawk90 적용

홈에서 최신 글은 하단으로 내리고 `Start Here`, `Core Topics`, `Featured Guides`를 먼저 둔다.

---

<!-- source message: 26 -->

## A-03. Flat Knowledge Model

### 평면 지식 모델

모든 주제가 동일한 깊이에 놓인다.

```text
C++
Linux
CUDA
PCIe
BAR
MSI
CXL
NUMA
```

### 증상

- 상위 개념과 하위 개념이 구분되지 않음
- 태그가 계층 구조를 대신함
- 주제마다 같은 크기의 메뉴 항목이 생김
- 세부 개념이 최상위 탐색에 노출됨

### 왜 문제인가

독자는 개념의 위치를 파악하지 못한다.

예를 들어 `BAR`가 PCIe의 하위 개념이라는 사실이 구조에서 드러나지 않는다.

### 개선 방향

```text
PCIe
├── Architecture
├── Configuration Space
├── Enumeration
├── BAR
├── Interrupt
│   ├── INTx
│   ├── MSI
│   └── MSI-X
└── DMA
```

### 주의

폴더 구조를 깊게 만들라는 뜻은 아니다. URL과 지식 계층은 분리할 수 있다.

---

<!-- source message: 26 -->

## A-04. Missing Topic Hub

### 주제 허브 부재

특정 주제의 글은 많지만 그 주제를 대표하는 페이지가 없다.

### 증상

- `CXL` 태그 페이지는 있음
- CXL 글 목록도 있음
- 하지만 CXL 전체를 설명하는 시작 페이지는 없음
- 어떤 글부터 읽어야 하는지 모름
- 분야 전체의 범위가 보이지 않음

### 왜 문제인가

개별 글은 검색어 하나에 답하지만, 허브는 다음 질문에 답한다.

> 이 분야 전체를 어떻게 이해해야 하는가?

### 좋은 허브 구성

```text
주제 소개
대상 독자
선행 지식
전체 구조도
추천 학습 순서
대표 가이드
실험 글
디버깅 글
레퍼런스
```

### hawk90 적용

우선 다음 두 개부터 만드는 것이 효과적이다.

```text
Firmware & Bootloader
PCIe & CXL
```

---

<!-- source message: 26 -->

## A-05. Article-First Design

### 글 우선 설계

새로운 정보를 작성할 때 항상 새 글부터 만든다.

```text
새로운 내용 발견
→ 새 Markdown 파일 생성
```

### 증상

- 기존 대표 글을 확장하지 않음
- 비슷한 주제의 짧은 글이 누적됨
- 하나의 개념이 여러 글에 분산됨
- 동일한 서론을 반복함
- 글 수가 곧 생산성처럼 느껴짐

### 왜 문제인가

모든 지식 단위가 독립적인 페이지일 필요는 없다.

작은 정보가 기존 가이드의 한 절로 들어가는 편이 더 유용할 수도 있다.

### 작성 전 판단

```text
새 글인가?
기존 글의 보강인가?
FAQ 항목인가?
Reference 표의 추가인가?
Debug 사례인가?
```

### hawk90 적용

CXL·PCIe·CUDA처럼 비슷한 설명이 반복되는 분야는 새 글을 추가하기 전에 기존 허브나 대표 가이드에 포함할 수 있는지 확인한다.

---

<!-- source message: 26 -->

## A-06. Mega-Article Architecture

### 거대 문서 중심 구조

한 주제의 모든 내용을 하나의 글에 넣는다.

```text
PCIe 완전 정복
- 역사
- PHY
- Protocol
- Enumeration
- BAR
- MSI-X
- DMA
- Linux
- Debugging
```

### 증상

- 글이 지나치게 길어짐
- 부분 업데이트가 어려움
- 검색 의도가 여러 개 섞임
- 독자가 필요한 부분을 찾기 어려움
- 한 섹션이 낡으면 전체 글이 낡아 보임

### 왜 문제인가

대표 가이드와 백과사전 전체를 혼동한다.

대표 가이드는 모든 세부 내용을 담는 문서가 아니라, 전체 구조와 세부 문서로 가는 길을 제공하는 문서여야 한다.

### 개선 방향

```text
PCIe Guide
├── 전체 흐름
├── 핵심 개념 요약
└── 세부 문서 링크
```

세부 내용은 별도 Concept, Debug Note, Reference로 분리한다.

---

<!-- source message: 26 -->

## A-07. Fragmentation by Default

### 기본적으로 너무 잘게 나누기

Mega-Article의 반대편 안티패턴이다.

```text
PCIe란?
BAR란?
BAR0란?
BAR1이란?
BAR 크기란?
BAR 크기 계산이란?
```

### 증상

- 1~3분짜리 글이 지나치게 많음
- 한 주제를 읽기 위해 여러 페이지 이동
- 각 글의 서론이 반복됨
- 검색 의도가 거의 같은 글이 여러 개 존재
- 페이지당 고유 정보가 적음

### 왜 문제인가

페이지 수는 늘지만 정보 밀도는 낮아진다.

검색엔진 입장에서도 어떤 페이지가 대표인지 판단하기 어렵다.

### 분리 기준

다음 중 하나가 있을 때 별도 글로 분리한다.

- 독립적인 검색 의도
- 별도의 실험
- 별도의 장애 사례
- 다른 독자층
- 충분한 설명과 예제
- 독립적으로 다시 찾을 가치

---

<!-- source message: 26 -->

## A-08. Framework-Centric Architecture

### 프레임워크 중심 아키텍처

콘텐츠 사이트인데 설계 판단이 콘텐츠보다 프레임워크 기능을 중심으로 이루어진다.

### 증상

- 새로운 Astro 기능을 사용할 이유를 찾음
- 페이지마다 컴포넌트화
- 단순한 Markdown으로 충분한데 MDX 사용
- 콘텐츠보다 transition, island, hydration 설계에 집중
- 사이트 개선이 프레임워크 업그레이드와 동일시됨

### 왜 문제인가

프레임워크는 독자에게 보이지 않는다.

독자가 원하는 것은:

```text
빠른 페이지
정확한 내용
좋은 탐색
읽기 편한 글
```

이지 Astro 기능 활용률이 아니다.

### 개선 원칙

```text
Content requirement
→ 최소 기술 선택
```

이 순서를 지킨다.

---

<!-- source message: 26 -->

## A-09. Theme Product Convergence

### 개인 사이트와 범용 테마의 융합

하나의 코드베이스가 실제 블로그와 범용 테마를 동시에 담당한다.

### 증상

- 모든 기능에 `enabled` 옵션이 생김
- 사용하지 않는 Newsletter provider도 지원
- 여러 Analytics 공급자를 추상화
- 실제 블로그에 필요 없는 기능을 유지
- 개인적인 UI 변경도 범용 API로 설계

### 왜 문제인가

두 제품의 목표가 다르기 때문이다.

```text
개인 블로그:
빠른 개선, 명확한 취향

범용 테마:
설정 가능성, 호환성, 문서화
```

### 개선 방향

최소한 우선순위를 명시한다.

```text
1차 목적: Hawk 기술 지식베이스
2차 목적: 범용 테마
```

범용화는 실제로 두 번 이상 반복된 요구에만 적용한다.

---

<!-- source message: 26 -->

## A-10. Configuration-Driven Everything

### 모든 것을 설정으로 해결

```ts
showAuthor: true
showReadingTime: true
showTags: true
showSeries: true
enableZenMode: true
enableTransition: true
```

### 증상

- 설정 파일이 거대한 CMS가 됨
- optional field가 계속 늘어남
- 테스트해야 할 조합이 폭발함
- 컴포넌트가 설정 조건문으로 가득 참
- 실제로는 한 조합만 사용함

### 왜 문제인가

유연성이 무료가 아니기 때문이다.

설정 하나가 추가되면:

- 타입
- 기본값
- UI 분기
- 테스트
- 문서
- 호환성

이 함께 증가한다.

### 개선 원칙

설정은 다음 세 범주로 제한한다.

```text
Site identity
Content behavior
External integration
```

고정해도 되는 디자인 판단은 코드 정책으로 둔다.

---

<!-- source message: 26 -->

## A-11. Static Site with SPA Ambition

### 정적 사이트의 SPA화

정적 블로그에 앱 같은 전환과 상태 유지 기능을 계속 추가한다.

### 증상

- 페이지 이동마다 lifecycle event 관리
- `astro:page-load` 구독 증가
- 외부 스크립트 재초기화
- 뒤로 가기와 스크롤 복원 오류
- 분석 pageview 누락
- 광고와 댓글 중복 로딩

### 왜 문제인가

기본 링크 이동이라면 브라우저가 무료로 처리할 문제를 애플리케이션 코드가 다시 책임진다.

### 개선 원칙

```text
정적 HTML만으로 정상 동작
+
SPA 전환은 점진적 향상
```

전환 기능이 제거돼도 사이트 기능이 깨지면 안 된다.

---

<!-- source message: 26 -->

## A-12. Hydration Without Interaction

### 상호작용 없는 Hydration

화면에 보이는 컴포넌트라는 이유만으로 클라이언트 JavaScript를 로드한다.

### 증상

- 정적인 카드도 React/Svelte island
- 날짜 표시를 위해 hydration
- 읽기 시간 표시를 런타임 계산
- 단순 테마 클래스 적용에 framework component 사용
- 첫 로딩 JS 증가

### 왜 문제인가

정적 사이트의 가장 큰 장점을 스스로 없앤다.

### 판단 기준

클라이언트 코드가 필요한 경우는 대략 다음이다.

- 사용자 입력
- 상태 변경
- 브라우저 API
- 지연 로딩 검색
- 댓글
- 테마 전환

그 외는 빌드 시 HTML로 생성한다.

---

<!-- source message: 26 -->

## A-13. Content and Rendering Coupling

### 콘텐츠와 렌더링 결합

Markdown 안에 사이트 구현 세부사항이 들어간다.

```mdx
<CustomCard variant="dark" padding="large">
```

### 증상

- 글이 특정 컴포넌트에 의존
- 테마 변경 시 글 전체 수정
- GitHub Markdown에서 읽히지 않음
- 다른 SSG로 이동하기 어려움
- 콘텐츠 작성자가 UI 구현을 알아야 함

### 왜 문제인가

콘텐츠의 수명은 프레임워크보다 길다.

Astro 테마는 바뀔 수 있지만 PCIe 설명 자체는 유지돼야 한다.

### 개선 방향

일반 콘텐츠는 순수 Markdown을 유지한다.

특별한 기능은 제한된 표준 확장으로 제공한다.

```text
Markdown
GFM
Math
Callout
Code metadata
```

사이트 전용 컴포넌트는 정말 필요한 글에만 사용한다.

---

<!-- source message: 26 -->

## A-14. Custom Markdown Language

### 자체 Markdown 언어화

Directive, shortcode, component, 특수 문법이 계속 늘어난다.

```text
:::warning
::tabs
[[diagram]]
{{benchmark}}
@status
```

### 증상

- 일반 Markdown parser가 처리하지 못함
- 문법 문서가 별도로 필요
- 작성 중 오류가 빌드 때만 발견됨
- migration이 어려움
- 플러그인 유지보수가 필요

### 왜 문제인가

블로그가 Markdown을 사용하는 것이 아니라 자체 문서 언어를 개발하게 된다.

### 개선 원칙

확장은 다음 조건을 만족할 때만 추가한다.

1. 여러 글에서 반복됨  
2. 순수 Markdown으로 표현하기 어렵다  
3. 장기적으로 유지할 가치가 있다  
4. fallback 표현이 존재한다  

---

<!-- source message: 26 -->

## A-15. URL–Taxonomy Coupling

### URL과 분류 체계 결합

파일 위치, 카테고리, URL이 하나로 묶인다.

```text
/content/cpp/memory/allocator.md
→ /cpp/memory/allocator/
```

### 증상

- 카테고리 변경이 URL 변경이 됨
- 글이 여러 주제에 걸치면 위치를 정하기 어려움
- 폴더 이동 시 외부 링크가 깨짐
- 정보 구조 개선을 미루게 됨

### 왜 문제인가

URL은 안정적이어야 하지만 분류 체계는 계속 변하기 때문이다.

### 개선 방향

```yaml
slug: allocator-design
topics:
  - cpp
  - memory
  - performance
```

URL과 taxonomy를 분리한다.

기존 URL은 redirect 또는 canonical로 보호한다.

---

<!-- source message: 26 -->

## A-16. Navigation as a File Browser

### 탐색 메뉴가 폴더 브라우저가 됨

저장소의 콘텐츠 폴더를 그대로 내비게이션으로 노출한다.

### 증상

- 작성자 관점의 디렉터리명이 메뉴가 됨
- 너무 많은 계층
- 사용자가 이해하기 어려운 약어
- 저장 편의와 탐색 편의가 혼동됨

### 왜 문제인가

파일 구조는 유지보수자를 위한 것이고, 내비게이션은 독자를 위한 것이다.

둘의 최적 구조는 다르다.

### 개선 방향

저장 구조:

```text
content/posts/2026/...
```

탐색 구조:

```text
Firmware
PCIe
CXL
CUDA
```

처럼 독립적으로 관리한다.

---

<!-- source message: 26 -->

## A-17. Search as Primary Navigation

### 검색 의존 탐색

콘텐츠를 찾으려면 검색어를 정확히 알아야 한다.

### 증상

- 메뉴는 단순함
- 카테고리는 너무 큼
- 결국 검색창만 사용
- 입문자는 검색할 용어 자체를 모름

### 왜 문제인가

검색은 알고 있는 것을 찾는 도구다.

학습자는 무엇을 모르는지 모르는 상태이므로 구조적 탐색이 필요하다.

### 개선 방향

```text
Browse by Topic
Browse by Content Type
Start Here
Learning Path
Search
```

검색은 이 구조를 보완해야 한다.

---

<!-- source message: 26 -->

## A-18. Integration Entanglement

### 외부 통합 얽힘

Analytics, Giscus, AdSense, Newsletter, OAuth가 페이지 생명주기에 직접 침투한다.

### 증상

- 각 컴포넌트가 page transition 이벤트를 구독
- 외부 스크립트 로딩 방식이 제각각
- 실패 시 전체 UI가 영향받음
- 개인정보 정책이 복잡해짐
- 기능 제거가 어려움

### 왜 문제인가

외부 서비스는 사이트보다 수명이 짧고 자주 변경된다.

### 개선 방향

외부 통합을 adapter처럼 다룬다.

```text
load
dispose
onNavigation
fallback
consent
```

핵심 콘텐츠 렌더링과 분리한다.

---

<!-- source message: 26 -->

## A-19. Generated Asset Dependency

### 파생 자산 종속

OG 이미지, 검색 인덱스, SVG, RSS, Sitemap 같은 생성물이 원본과 동기화되지 않으면 사이트가 깨진다.

### 증상

- 제목과 OG 이미지 불일치
- 삭제한 글이 검색에 남음
- 다이어그램 소스와 SVG 불일치
- 오래된 RSS 데이터
- 수동 생성 명령이 필요

### 왜 문제인가

파생 자산이 많을수록 캐시 무효화 문제가 커진다.

### 개선 원칙

모든 파생 자산은 다음 중 하나여야 한다.

```text
항상 재생성 가능
또는
입력 hash 기반 증분 생성
```

수동 관리되는 생성 파일은 피한다.

---

<!-- source message: 26 -->

## A-20. Internal Platform Before User Value

### 사용자 가치보다 내부 플랫폼을 먼저 만듦

문제가 보이면 곧바로 시스템을 개발한다.

```text
태그 문제
→ 태그 관리 도구

내부 링크 문제
→ AI 추천 엔진

검색 문제
→ 벡터 데이터베이스

글 수정 문제
→ 자체 CMS
```

### 증상

- 도구는 많아지지만 사용자 경험 변화는 적음
- 관리 시스템 구축에 시간이 오래 걸림
- 실제 콘텐츠 큐레이션은 미뤄짐
- 개인 블로그에 조직용 플랫폼이 생김

### 왜 문제인가

자동화는 반복 작업이 충분히 확인된 후에 해야 한다.

처음부터 시스템화하면 잘못된 프로세스를 빠르게 반복하게 된다.

### 개선 순서

```text
수동으로 10개 처리
→ 반복 패턴 확인
→ 간단한 스크립트
→ 충분히 커지면 시스템화
```

### hawk90 적용

AI 지식 그래프나 복잡한 추천 기능보다 먼저 대표 글 20개를 수동으로 선정하고 연결하는 것이 우선이다.

---

# Architecture 분야 요약

20개를 다시 묶으면 다섯 축으로 나뉜다.

## 지식 구조 문제

- Article Warehouse
- Chronological Architecture
- Flat Knowledge Model
- Missing Topic Hub
- Article-First Design
- Mega-Article
- Fragmentation

## 기술 중심 문제

- Framework-Centric Architecture
- Static Site with SPA Ambition
- Hydration Without Interaction
- Custom Markdown Language

## 제품 경계 문제

- Theme Product Convergence
- Configuration-Driven Everything
- Internal Platform Before User Value

## 콘텐츠 결합 문제

- Content and Rendering Coupling
- URL–Taxonomy Coupling
- Navigation as a File Browser
- Search as Primary Navigation

## 운영 경계 문제

- Integration Entanglement
- Generated Asset Dependency

---

# hawk90에서 우선 확인할 Architecture 5개

현재 가장 먼저 볼 것은 이 다섯 개다.

| 우선순위 | 안티패턴 | 이유 |
|---:|---|---|
| 1 | Article Warehouse | 기존 글의 가치가 연결되지 않음 |
| 2 | Missing Topic Hub | 전문 분야의 대표 진입점 부재 |
| 3 | Theme Product Convergence | 블로그보다 테마 개발이 커질 위험 |
| 4 | Chronological Architecture | 최근 글이 사이트 정체성을 지배 |
| 5 | Internal Platform Before User Value | 자동화보다 콘텐츠 구조가 뒤처짐 |

이번은 **Architecture 안티패턴 20개**까지다.

다음 단계는 **Task 2-2. Content Architecture Anti-patterns**로, 글의 제목·서론·구조·근거·실험·디버깅·AI 문체·중복 문제를 카탈로그 형태로 정리하면 된다.

<!-- source message: 27 -->

## C-01. Topic-Only Title

### 주제명만 있는 제목

예:

```text
PCIe BAR
CUDA Stream
UEFI Secure Boot
CXL Memory
```

### 증상

- 제목은 주제를 말하지만 문제를 말하지 않음
- 비슷한 글과 차별화되지 않음
- 독자가 얻을 결과를 예측하기 어려움
- 검색 결과에서 제목이 평범하게 보임

### 왜 문제인가

기술 독자는 주제 자체보다 다음을 찾는다.

```text
어떻게 동작하는가
왜 실패하는가
무엇이 다른가
어떻게 확인하는가
```

### 개선 방향

```text
PCIe BAR 크기는 어떻게 결정되는가
CUDA Stream을 늘려도 성능이 오르지 않는 이유
UEFI Secure Boot 인증서 만료가 부팅을 막는 과정
```

### hawk90 적용

기존 제목의 전문 용어는 유지하되, 핵심 질문이나 메커니즘을 제목에 드러내는 것이 좋다.

---

<!-- source message: 27 -->

## C-02. Keyword Stack Title

### 키워드 나열형 제목

예:

```text
CXL UEFI ACPI CEDT HDM Decoder Linux NUMA
```

### 증상

- 제목에 가능한 키워드를 모두 넣음
- 제목이 길고 읽기 어려움
- 모바일에서 여러 줄을 차지함
- 제목과 description의 역할이 중복됨

### 왜 문제인가

검색어를 많이 넣는다고 검색 의도가 명확해지는 것은 아니다.

오히려 글의 중심이 무엇인지 흐려진다.

### 개선 방향

제목은 한 가지 질문에 집중한다.

```text
UEFI는 CXL 메모리를 운영체제에 어떻게 전달하는가
```

나머지 키워드는 설명과 소제목에 배치한다.

---

<!-- source message: 27 -->

## C-03. Part-Number Naming

### 의미 없는 Part 번호

```text
CXL Part 1
CXL Part 2
CXL Part 3
```

### 증상

- 각 글의 내용을 제목만 보고 알 수 없음
- 중간 글부터 읽기 어려움
- 글을 삽입하거나 통합하면 번호가 깨짐
- 검색 결과에서 서로 구분되지 않음

### 개선 방향

```text
CXL 메모리 시스템 1 — 주소 변환 흐름
CXL 메모리 시스템 2 — HDM Decoder 구성
CXL 메모리 시스템 3 — Linux NUMA 노드 등록
```

번호는 보조 정보로만 사용한다.

---

<!-- source message: 27 -->

## C-04. Delayed Value Proposition

### 글의 목적이 늦게 나옴

글이 일반적인 배경 설명으로 오래 시작된다.

```text
PCI Express는 고속 직렬 인터페이스입니다.
오늘날 다양한 장치에서 사용됩니다.
```

### 증상

- 독자가 왜 이 글을 읽어야 하는지 늦게 알게 됨
- 핵심 문제까지 도달하는 데 시간이 걸림
- 비슷한 서론이 여러 글에서 반복됨

### 개선 방향

처음부터 범위를 밝힌다.

```text
이 글은 U-Boot에서 PCIe 장치가 검색되지 않는 문제를
링크 상태, Config Space 접근, BAR 할당 순서로 나누어 분석한다.
```

---

<!-- source message: 27 -->

## C-05. Dictionary Opening

### 사전식 도입부

모든 글이 정의로 시작한다.

```text
CXL은 Compute Express Link의 약자이다.
CUDA는 NVIDIA가 만든 병렬 컴퓨팅 플랫폼이다.
```

### 왜 문제인가

검색해서 들어온 독자는 이미 최소한의 용어를 알고 있을 가능성이 높다.

고급 글에서 매번 정의부터 시작하면 정보 밀도가 낮아진다.

### 개선 방향

한 문장으로 필요한 정의만 제공하고 바로 문제로 들어간다.

```text
CXL.mem은 호스트가 장치 메모리를 load/store 대상으로 접근하게 한다.
이 글에서는 그 주소가 Linux NUMA 노드로 등록되는 과정을 추적한다.
```

---

<!-- source message: 27 -->

## C-06. Generic Importance Claim

### 근거 없는 중요성 강조

```text
이 기술은 매우 중요합니다.
다양한 분야에서 널리 사용됩니다.
개발자라면 반드시 알아야 합니다.
```

### 증상

- 구체적인 이유가 없음
- AI 생성 문체처럼 보임
- 문장은 길지만 정보가 없음

### 개선 방향

중요하다고 말하지 말고 영향을 설명한다.

```text
BAR 크기 탐색이 잘못되면 펌웨어가 장치에 주소 공간을 할당하지 못하고,
운영체제에서도 해당 장치를 정상적으로 사용할 수 없다.
```

---

<!-- source message: 27 -->

## C-07. Background Inflation

### 배경 설명 팽창

핵심 주제보다 선행 개념 설명이 더 길다.

### 증상

- CUDA Stream 글인데 GPU 구조 설명이 절반
- CXL 장애 글인데 PCIe 역사부터 설명
- 임베디드 C++ 글인데 객체지향 개요부터 시작

### 왜 문제인가

검색 의도에 대한 답이 늦어지고, 다른 글과 중복이 커진다.

### 개선 방향

```text
최소 배경 설명
→ 상세 개념 문서 링크
→ 현재 글의 고유 내용
```

---

<!-- source message: 27 -->

## C-08. Repeated Context Boilerplate

### 동일 배경 반복

여러 글에 같은 설명이 반복된다.

```text
PCIe Configuration Space란...
CXL Type 3 장치는...
CUDA Stream은...
```

### 문제

- 중복 콘텐츠 증가
- 여러 글을 동시에 수정해야 함
- 글의 고유 정보 비율이 낮아짐
- 검색엔진이 문서 차이를 판단하기 어려움

### 개선 방향

대표 Concept 문서를 만들고, 다른 글에서는 짧게 요약한 뒤 링크한다.

---

<!-- source message: 27 -->

## C-09. Scope Creep Article

### 쓰면서 범위가 계속 확장됨

처음에는 BAR를 설명하다가:

```text
BAR
→ Enumeration
→ DMA
→ IOMMU
→ Driver
→ NUMA
```

까지 간다.

### 증상

- 제목과 본문 범위가 다름
- 결론이 여러 개 생김
- 일부 독자에게 불필요한 부분이 많음
- 수정하기 어려움

### 개선 방향

글 시작에 포함 범위와 제외 범위를 적는다.

```text
다룸:
BAR 크기 탐색과 주소 할당

다루지 않음:
DMA 매핑과 IOMMU
```

---

<!-- source message: 27 -->

## C-10. One Article, Multiple Audiences

### 여러 독자층을 동시에 만족시키려 함

한 글이 초보자와 커널 개발자 모두를 대상으로 한다.

### 증상

- 초보 설명과 소스코드 분석이 뒤섞임
- 전문가는 서론을 건너뜀
- 입문자는 후반을 이해하지 못함
- 글 길이가 계속 늘어남

### 개선 방향

대상 독자를 명확히 한다.

```text
대상:
PCIe 기본 개념을 알고 U-Boot 소스를 추적하려는 개발자
```

필요하면 입문 Guide와 Source Walkthrough를 분리한다.

---

<!-- source message: 27 -->

## C-11. Undefined Reader Prerequisite

### 선행 지식이 정의되지 않음

글은 고급인데 필요한 지식이 무엇인지 알 수 없다.

### 문제

독자가 중간에서 갑자기 막힌다.

### 개선 방향

```text
선행 지식:
- PCIe Configuration Space
- BAR 기본 구조
- U-Boot driver model
```

너무 많은 선행 지식이 필요하다면 해당 글이 허브나 가이드에 연결돼야 한다.

---

<!-- source message: 27 -->

## C-12. Post Homogeneity

### 모든 글이 같은 구조

모든 글이 다음 형태다.

```text
소개
설명
코드
결론
```

### 왜 문제인가

디버깅 글, 실험 글, 개념 글은 필요한 구조가 다르다.

### 개선 방향

콘텐츠 타입별 구조를 사용한다.

```text
Concept:
문제 → 모델 → 동작 → 오해

Debug:
증상 → 가설 → 증거 → 원인 → 해결

Experiment:
가설 → 방법 → 결과 → 해석 → 한계
```

---

<!-- source message: 27 -->

## C-13. Tutorial Without Outcome

### 튜토리얼의 결과가 불명확함

```text
다음 명령을 실행합니다.
설정 파일을 수정합니다.
```

하지만 완료 후 무엇이 보여야 하는지 없다.

### 개선 방향

각 단계에 기대 결과를 적는다.

```text
이 명령이 성공하면 `lspci`에 장치가 표시되고,
Kernel log에는 BAR 할당 결과가 출력된다.
```

---

<!-- source message: 27 -->

## C-14. Command Dump

### 명령어만 나열

```bash
cmake ..
make
sudo make install
```

### 증상

- 각 명령의 목적이 없음
- 실패 시 어디를 봐야 하는지 없음
- 환경 차이를 고려하지 않음
- 복사해서 실행하는 것 외에는 배울 것이 적음

### 개선 방향

```text
명령의 목적
필요한 전제
예상 출력
실패할 때 확인할 항목
```

을 함께 제공한다.

---

<!-- source message: 27 -->

## C-15. Magic Fix

### 이유 없는 해결 명령

```bash
sudo systemctl restart ...
```

“이렇게 하니 해결됐다”로 끝난다.

### 왜 문제인가

다른 환경에 적용할 수 없고, 재발했을 때 대응할 수 없다.

### 개선 방향

```text
왜 이 명령이 효과가 있었는가
어떤 상태를 초기화했는가
어떤 상황에서는 효과가 없는가
```

를 설명한다.

---

<!-- source message: 27 -->

## C-16. Fix-Only Debugging Note

### 해결책만 있고 진단 과정이 없음

### 증상

- 최종 원인만 제시
- 중간 가설이 없음
- 왜 다른 원인을 제외했는지 모름
- 로그가 단순 첨부됨

### 좋은 구조

```text
증상
정상 기대값
가능한 원인
수집한 증거
제외한 가설
확정 원인
해결
재발 방지
```

---

<!-- source message: 27 -->

## C-17. Log Dump Without Interpretation

### 로그 붙여넣기

긴 커널 로그나 빌드 로그를 그대로 붙인다.

### 문제

독자가 중요한 줄을 직접 찾아야 한다.

### 개선 방향

```text
전체 로그는 접거나 외부 파일로 제공
핵심 줄만 본문에 인용
각 줄의 의미 설명
정상 로그와 비교
```

---

<!-- source message: 27 -->

## C-18. Screenshot as Evidence

### 스크린샷만으로 결과 증명

터미널 화면이나 그래프 이미지가 있지만 원본 값이 없다.

### 문제

- 검색 불가
- 복사 불가
- 해상도가 낮으면 읽기 어려움
- 접근성 부족
- 결과 재분석 불가

### 개선 방향

스크린샷은 보조로 사용하고 텍스트·표·CSV·명령 출력을 함께 제공한다.

---

<!-- source message: 27 -->

## C-19. Evidence Blending

### 사실·관찰·추론이 섞임

```text
이 문제는 DDR 컨트롤러가 초기화되지 않았기 때문이다.
```

이 문장이 규격 근거인지, 실제 관찰인지, 추측인지 불명확하다.

### 개선 방향

```text
Specification
Observation
Interpretation
Hypothesis
Conclusion
```

을 구분한다.

---

<!-- source message: 27 -->

## C-20. Unmarked Hypothesis

### 가설을 사실처럼 표현

### 문제

기술 글의 신뢰성을 크게 떨어뜨린다.

### 개선 방향

표현을 명확히 한다.

```text
확인됨:
LTSSM이 Recovery에서 반복됨

추정:
RefClk 안정화 이전에 PERST#가 해제됐을 가능성

미확인:
보드 측 전원 시퀀스
```

---

<!-- source message: 27 -->

## C-21. Citation Dump

### 참고문헌을 끝에 몰아넣음

링크는 많지만 어느 문장을 뒷받침하는지 알 수 없다.

### 개선 방향

핵심 주장 근처에 근거를 배치하고, 마지막에는 전체 참고자료를 분류한다.

```text
Specification
Official Documentation
Source Code
Further Reading
```

---

<!-- source message: 27 -->

## C-22. Specification Paraphrase

### 규격 재서술이 콘텐츠의 대부분

### 증상

- 사양 문서 순서와 글 순서가 거의 같음
- 작성자의 해석이 적음
- 실제 예제나 로그가 없음
- 외부 문서를 짧게 번역한 수준

### 왜 문제인가

독창성과 실무 가치가 낮아 보일 수 있다.

### 개선 방향

규격 자체보다 다음을 추가한다.

```text
실제 구현에서 어떻게 보이는가
어떤 부분이 자주 오해되는가
로그나 레지스터에서 어떻게 확인하는가
다른 규격과 어떻게 연결되는가
```

---

<!-- source message: 27 -->

## C-23. Documentation Summary Article

### 공식 문서 요약만 있는 글

### 문제

원문보다 짧지만 더 정확하거나 더 유용하지 않으면 가치가 약하다.

### 개선 방향

요약에 최소 하나의 고유 가치를 추가한다.

- 실행 가능한 예제
- 비교표
- 실패 사례
- 버전 차이
- 실제 장비 결과
- 구조도
- 의사결정 기준

---

<!-- source message: 27 -->

## C-24. Code-as-Explanation

### 코드가 설명을 대신함

긴 코드 블록 뒤에:

```text
위와 같이 구현하면 된다.
```

로 끝난다.

### 문제

독자가 핵심 설계 판단을 직접 찾아야 한다.

### 개선 방향

코드보다 다음을 설명한다.

```text
왜 이 구조인가
불변조건은 무엇인가
오류 경로는 무엇인가
대안은 무엇인가
성능 비용은 어디에 있는가
```

---

<!-- source message: 27 -->

## C-25. Full Source Embedding

### 전체 소스코드를 본문에 넣음

### 문제

- 글이 너무 길어짐
- 핵심 코드가 묻힘
- 수정 시 본문과 저장소가 불일치
- 빌드·하이라이팅 비용 증가

### 개선 방향

본문에는 핵심 부분만 넣고, 전체 코드는 별도 저장소나 파일 링크로 제공한다.

---

<!-- source message: 27 -->

## C-26. Example Without Production Boundary

### 예제 코드와 실사용 코드의 경계가 없음

간단한 예제를 보여주면서 예외 처리·동시성·자원 해제·보안 고려가 빠져 있다.

### 문제

독자가 예제를 그대로 production에 적용할 수 있다.

### 개선 방향

```text
예제를 위해 생략한 것
실제 적용 시 필요한 것
적용하면 안 되는 조건
```

을 명시한다.

---

<!-- source message: 27 -->

## C-27. Benchmark Without Baseline

### 비교 기준 없는 성능 수치

```text
8.4 GB/s
12 ms
```

### 왜 문제인가

좋은 결과인지 판단할 수 없다.

### 개선 방향

```text
Baseline
변경 사항
동일 조건
반복 횟수
분산
하드웨어 한계
```

를 제공한다.

---

<!-- source message: 27 -->

## C-28. Benchmark Without Workload

### 측정 대상이 불명확함

“CUDA 최적화 후 30% 향상”이라고 하지만 입력 크기와 연산 특성이 없다.

### 개선 방향

- 데이터 크기
- 메모리 패턴
- 연산량
- warm-up
- 반복 횟수
- GPU·드라이버·CUDA 버전

을 명시한다.

---

<!-- source message: 27 -->

## C-29. Single-Run Benchmark

### 한 번 측정한 값 사용

### 문제

초기화 비용, 캐시, 시스템 노이즈에 크게 영향을 받는다.

### 개선 방향

여러 번 반복하고 대표값과 변동을 함께 제시한다.

```text
median
min/max
표준편차 또는 percentile
```

---

<!-- source message: 27 -->

## C-30. Benchmark Graph Without Raw Data

### 그래프만 있고 수치가 없음

### 문제

정확한 비교와 재분석이 어렵다.

### 개선 방향

그래프와 함께 표 또는 원본 데이터를 제공한다.

---

<!-- source message: 27 -->

## C-31. Experiment Without Hypothesis

### 측정은 했지만 질문이 없음

여러 조건을 테스트했지만 무엇을 확인하려는지 불명확하다.

### 개선 방향

```text
질문
가설
변수
고정 조건
측정 방법
결과
해석
```

순서로 작성한다.

---

<!-- source message: 27 -->

## C-32. Correlation as Causation

### 동시에 변한 것을 원인으로 단정

예:

```text
컴파일 옵션을 바꾸니 빨라졌으므로 vectorization 때문이다.
```

실제로 다른 최적화가 영향을 줬을 수 있다.

### 개선 방향

가능하면 단일 변수만 바꾸고, assembly·profiler·counter로 원인을 확인한다.

---

<!-- source message: 27 -->

## C-33. Success-Path-Only Tutorial

### 정상 경로만 설명

### 증상

- 실패했을 때 확인 방법 없음
- 권한·버전·경로 차이를 다루지 않음
- 독자는 조금만 다르면 막힘

### 개선 방향

최소한 자주 발생하는 실패 3개와 진단법을 포함한다.

---

<!-- source message: 27 -->

## C-34. Environment Omission

### 실행 환경 없음

### 문제

동작 여부를 재현할 수 없다.

### 필요한 최소 정보

```text
OS
Kernel
Compiler
Library/SDK
Hardware
Major configuration
```

모든 글에 전부 필요하지는 않지만 튜토리얼·실험·디버깅 글에는 중요하다.

---

<!-- source message: 27 -->

## C-35. Versionless Technical Article

### 버전 정보 없음

```text
CUDA에서 이렇게 한다
Linux에서 지원한다
Rust에서는 불가능하다
```

### 왜 문제인가

기술은 계속 바뀐다.

### 개선 방향

```text
CUDA 11.8 기준
Linux 6.12에서 확인
Rust 1.8x 이후
```

처럼 범위를 밝힌다.

---

<!-- source message: 27 -->

## C-36. Timeless Article Illusion

### 오래된 글이 현재 자료처럼 보임

### 증상

- 작성일만 있음
- 수정 여부 없음
- 현재도 유효한지 알 수 없음
- 대체 글이 있어도 연결되지 않음

### 개선 방향

```text
Current
Needs Review
Historical
Superseded
```

상태를 표시한다.

---

<!-- source message: 27 -->

## C-37. Silent Update

### 내용을 크게 바꿨지만 수정 이력이 없음

### 문제

예전에 읽은 독자가 무엇이 달라졌는지 모른다.

### 개선 방향

핵심 문서에는 간단한 변경 기록을 둔다.

```text
2026-07: Linux 6.12 동작 기준 추가
2026-05: CXL decoder 설명 수정
```

---

<!-- source message: 27 -->

## C-38. Unsupported Universal Claim

### 제한된 경험을 일반 법칙처럼 표현

```text
U250에서는 인터럽트를 사용할 수 없다.
C++는 펌웨어에 적합하지 않다.
```

### 개선 방향

관찰 범위를 명확히 한다.

```text
XRT 2.13.466과 해당 U250 플랫폼에서는
사용자 공간 ISR callback 경로를 확인하지 못했다.
```

---

<!-- source message: 27 -->

## C-39. Missing Limitation Section

### 글의 적용 한계가 없음

### 문제

독자가 다른 상황에도 결론을 일반화한다.

### 개선 방향

```text
이 결과는 x86 host와 PCIe Gen3 환경에 한정된다.
IOMMU disabled 환경은 측정하지 않았다.
```

---

<!-- source message: 27 -->

## C-40. Missing Counterexample

### 결론을 반박할 사례를 다루지 않음

### 왜 문제인가

기술적 판단이 너무 단순해진다.

### 개선 방향

```text
일반적으로 A가 유리하지만,
작은 입력에서는 초기화 비용 때문에 B가 더 빠를 수 있다.
```

---

<!-- source message: 27 -->

## C-41. Trade-off Omission

### 장점만 설명

예:

```text
Pinned memory는 빠르다.
```

하지만:

- 할당 비용
- OS 메모리 압박
- 사용량 제한
- 작은 전송에서 이득 부족

이 빠져 있다.

### 개선 방향

모든 설계 선택에 다음을 포함한다.

```text
장점
비용
적용 조건
비적용 조건
```

---

<!-- source message: 27 -->

## C-42. One Correct Architecture

### 하나의 설계를 정답처럼 제시

### 문제

시스템 설계는 제약에 따라 답이 달라진다.

### 개선 방향

```text
낮은 지연 우선
처리량 우선
메모리 제한
펌웨어 제약
유지보수 우선
```

별로 선택지를 비교한다.

---

<!-- source message: 27 -->

## C-43. No Decision Criteria

### 선택지는 나열하지만 선택 기준이 없음

```text
A도 가능하고 B도 가능하다.
```

### 개선 방향

```text
A를 선택할 조건
B를 선택할 조건
경계 조건
```

을 명시한다.

---

<!-- source message: 27 -->

## C-44. Diagram Without Purpose

### 보기 좋은 그림만 있음

### 증상

- 상자와 화살표는 많음
- 무엇을 설명하는지 불명확
- 본문과 연결되지 않음
- 모든 화살표 의미가 같음

### 개선 방향

다이어그램마다 하나의 질문을 답하게 한다.

```text
데이터가 어디로 이동하는가
제어권이 언제 바뀌는가
주소가 어떻게 변환되는가
장애가 어디서 전파되는가
```

---

<!-- source message: 27 -->

## C-45. Unlabeled Arrow Diagram

### 화살표 의미가 없음

화살표가 호출, 데이터, 의존성, 소유권 중 무엇인지 알 수 없다.

### 개선 방향

범례나 라벨을 사용한다.

```text
call
data
interrupt
ownership
configuration
```

---

<!-- source message: 27 -->

## C-46. Screenshot-Heavy Explanation

### 도구 화면 캡처가 설명 대부분

### 문제

- 버전 변경에 약함
- 검색할 수 없음
- 접근성 부족
- 핵심 개념보다 UI 위치에 종속됨

### 개선 방향

스크린샷은 위치 확인에만 쓰고, 원리와 명령을 텍스트로 설명한다.

---

<!-- source message: 27 -->

## C-47. Uncaptioned Figure

### 그림 설명이 없음

### 문제

그림만 따로 보았을 때 의미를 알 수 없다.

### 개선 방향

캡션에서 그림이 보여주는 결론을 설명한다.

```text
Figure 3. HDM Decoder가 HPA 범위를 장치 DPA로 매핑하는 과정.
```

---

<!-- source message: 27 -->

## C-48. Abrupt Ending

### 설명이나 코드 직후 글이 끝남

### 문제

독자가 무엇을 기억해야 하는지 모른다.

### 개선 방향

마지막에 다음을 정리한다.

```text
핵심 결론
적용 조건
한계
다음 글
```

---

<!-- source message: 27 -->

## C-49. Summary Repetition

### 결론이 본문 복사

본문 소제목을 다시 나열할 뿐 새로운 판단이 없다.

### 개선 방향

결론에서는 다음 질문에 답한다.

```text
그래서 무엇이 중요한가
무엇을 먼저 확인해야 하는가
어떤 선택을 해야 하는가
```

---

<!-- source message: 27 -->

## C-50. No Next Action

### 읽은 뒤 무엇을 해야 하는지 없음

### 개선 방향

글 유형에 따라 다음 행동을 제안한다.

```text
다음 개념 읽기
명령 실행
측정 재현
대표 Guide로 돌아가기
관련 장애 사례 확인
```

---

# Content Architecture 분야 핵심 묶음

## 제목과 도입

- Topic-Only Title
- Keyword Stack Title
- Part-Number Naming
- Delayed Value Proposition
- Dictionary Opening
- Generic Importance Claim

## 범위와 독자

- Background Inflation
- Repeated Context Boilerplate
- Scope Creep
- Multiple Audiences
- Undefined Prerequisite

## 튜토리얼과 디버깅

- Command Dump
- Magic Fix
- Fix-Only Debugging
- Log Dump
- Success-Path-Only Tutorial

## 근거와 신뢰성

- Evidence Blending
- Unmarked Hypothesis
- Citation Dump
- Specification Paraphrase
- Unsupported Universal Claim

## 코드와 실험

- Code-as-Explanation
- Full Source Embedding
- Benchmark Without Baseline
- Single-Run Benchmark
- Experiment Without Hypothesis

## 유지와 정확성

- Environment Omission
- Versionless Article
- Timeless Article Illusion
- Silent Update
- Missing Limitation

## 전달 방식

- Diagram Without Purpose
- Screenshot-Heavy Explanation
- Abrupt Ending
- Summary Repetition
- No Next Action

---

# hawk90에서 우선 확인할 8개

| 우선순위 | 안티패턴 | 이유 |
|---:|---|---|
| 1 | Specification Paraphrase | 규격·고급 주제 글의 독창성 검증 필요 |
| 2 | Repeated Context Boilerplate | 연관된 시스템 글이 많아 중복 가능성 큼 |
| 3 | Evidence Blending | 실측·규격·추론 구분이 전문성에 중요 |
| 4 | Versionless Technical Article | CUDA·Linux·CXL은 버전 영향이 큼 |
| 5 | Fix-Only Debugging Note | 실무 경험을 차별화된 콘텐츠로 바꿀 수 있음 |
| 6 | Benchmark Without Baseline | 성능 글의 신뢰성과 재현성 문제 |
| 7 | Topic-Only Title | 검색 결과에서 글의 고유 가치가 약해짐 |
| 8 | Abrupt Ending | 다음 글과 Topic Hub 연결 기회를 잃음 |

다음은 **Task 2-3. Information Architecture & Navigation Anti-patterns**로 이어가면 된다. 여기서는 카테고리·태그·시리즈·검색·내부 링크·Breadcrumb·고아 문서 문제를 더 세밀하게 카탈로그화한다.

<!-- source message: 28 -->

## I-01. Category Explosion

### 카테고리 폭발

카테고리가 너무 세분화된다.

```text
C++
Modern C++
C++20
C++23
Templates
STL
Memory
Performance
```

### 문제

- 어디에 넣어야 할지 애매함
- 같은 글이 여러 카테고리에 걸침
- 카테고리별 글 수가 너무 적어짐
- 탐색보다 분류 유지 비용이 커짐

### 개선

최상위 카테고리는 5~8개 정도로 제한한다.

세부 주제는 Topic 또는 Tag로 처리한다.

---

<!-- source message: 28 -->

## I-02. Category Overlap

### 카테고리 역할 중복

```text
Firmware
Embedded
BSP
Bootloader
Low-Level
```

이들이 실제로는 상당 부분 겹친다.

### 문제

사용자가 어느 메뉴를 눌러야 할지 모른다.

### 개선

각 분류 축의 역할을 명확히 한다.

```text
Category = 큰 지식 분야
Topic = 세부 기술 주제
Tag = 횡단 특성
Type = 문서 역할
```

---

<!-- source message: 28 -->

## I-03. Category as Storage Location

### 저장 폴더를 카테고리로 사용

작성 편의를 위한 폴더가 사용자 탐색 구조가 된다.

### 문제

저장 구조와 독자 구조의 목적이 다르다.

### 개선

파일 위치와 사이트 분류를 분리한다.

---

<!-- source message: 28 -->

## I-04. Category as Identity

### 하나의 글이 한 카테고리만 가져야 한다고 가정

예를 들어:

```text
CXL + Linux + NUMA + Firmware
```

글을 하나의 폴더에만 넣어야 한다.

### 문제

시스템 분야는 주제가 본질적으로 교차한다.

### 개선

대표 Category 하나와 복수 Topic을 허용한다.

---

<!-- source message: 28 -->

## I-05. Empty Category

### 글이 거의 없는 카테고리

카테고리는 존재하지만 글이 1~2개뿐이다.

### 문제

- 얕은 목록 페이지 생성
- 탐색 가치가 거의 없음
- 사이트가 미완성처럼 보임

### 개선

최소 글 수나 대표 설명이 생기기 전까지 공개 카테고리로 승격하지 않는다.

---

<!-- source message: 28 -->

## I-06. Tag Explosion

### 태그 폭발

태그가 수백 개로 늘어난다.

### 증상

- 글마다 새로운 태그 생성
- 1회성 태그 증가
- 대소문자와 표기 불일치
- 유사 태그 중복

### 개선

태그 생성 규칙을 둔다.

```text
최소 3개 이상 글에서 재사용
표준 표기 사용
대체 태그와 동의어 관리
```

---

<!-- source message: 28 -->

## I-07. Synonym Tag Drift

### 동의어 태그 분열

```text
cpp
c++
cplusplus
modern-cpp
cxx
```

### 문제

같은 콘텐츠가 여러 태그 페이지로 분산된다.

### 개선

Canonical tag dictionary를 둔다.

```text
canonical: cpp
aliases:
  - c++
  - cplusplus
  - cxx
```

---

<!-- source message: 28 -->

## I-08. Version-as-Tag Abuse

### 모든 버전을 태그로 만듦

```text
cuda-11
cuda-11.8
cuda-12
cuda-12.4
cuda-13
```

### 문제

태그 체계가 버전 번호로 오염된다.

### 개선

버전은 metadata나 tested environment로 관리하고, 정말 탐색 가치가 있을 때만 태그화한다.

---

<!-- source message: 28 -->

## I-09. Tag as Category

### 태그가 사실상 카테고리 역할

`CXL`, `CUDA`, `Linux`처럼 핵심 분야를 단순 태그로만 관리한다.

### 문제

- 설명 없는 목록만 제공
- 학습 순서 없음
- 대표 문서 없음

### 개선

핵심 분야는 Topic Hub로 승격한다.

---

<!-- source message: 28 -->

## I-10. Tag Cloud Navigation

### 태그 클라우드에 탐색을 맡김

태그 크기와 빈도로 사이트 구조를 보여준다.

### 문제

많이 쓴 주제가 중요한 주제처럼 보일 뿐, 지식 구조는 전달되지 않는다.

### 개선

태그 클라우드는 보조 탐색으로만 사용한다.

---

<!-- source message: 28 -->

## I-11. Series as Folder

### 시리즈가 단순 글 묶음

시리즈 페이지가 다음과 같다.

```text
Part 1
Part 2
Part 3
```

### 문제

전체 학습 목표와 각 글의 역할이 보이지 않는다.

### 개선

시리즈 허브에 다음을 추가한다.

```text
학습 목표
선행 지식
전체 지도
각 글 설명
완독 후 다음 단계
```

---

<!-- source message: 28 -->

## I-12. Series Order Fragility

### 수동 순서 번호 의존

```yaml
seriesOrder: 1
seriesOrder: 2
seriesOrder: 3
```

### 문제

- 순서 중복
- 중간 삽입 어려움
- 글 삭제 시 공백
- 여러 작성자가 수정할 때 충돌

### 개선

검증 스크립트를 두고, 필요하면 명시적 시리즈 manifest에서 순서를 관리한다.

---

<!-- source message: 28 -->

## I-13. Series Without Entry Point

### 시리즈 시작점 부재

검색으로 Part 4에 들어왔는데 시리즈 전체를 이해하기 어렵다.

### 개선

모든 시리즈 글 상단에 다음을 표시한다.

```text
이 글은 전체 7편 중 4편
이전 글
다음 글
시리즈 전체 보기
```

---

<!-- source message: 28 -->

## I-14. Series Without Exit

### 시리즈를 다 읽고도 다음 경로가 없음

### 개선

마지막 글에서 상위 Topic Hub와 다음 심화 시리즈를 연결한다.

---

<!-- source message: 28 -->

## I-15. Series and Topic Duplication

### 시리즈와 Topic이 같은 역할

예:

```text
Topic: CXL
Series: CXL
Tag: CXL
Category: CXL
```

### 문제

네 개의 목록 페이지가 거의 동일해진다.

### 개선

역할을 분리한다.

```text
Topic = 분야 전체
Series = 순서가 있는 학습 묶음
Tag = 횡단 속성
```

---

<!-- source message: 28 -->

## I-16. Archive-First Navigation

### 연도·월별 아카이브가 주요 탐색

```text
2026년 7월
2026년 6월
2026년 5월
```

### 문제

독자는 작성 시점보다 주제를 찾는다.

### 개선

아카이브는 보조 메뉴나 푸터 수준으로 내린다.

---

<!-- source message: 28 -->

## I-17. Pagination as Discovery

### 페이지네이션이 콘텐츠 발견 수단

사용자가 1페이지부터 37페이지까지 넘겨야 오래된 글을 찾는다.

### 문제

좋은 과거 글이 사실상 사라진다.

### 개선

대표 글, Topic Hub, 검색, 시리즈를 통해 직접 접근하게 한다.

---

<!-- source message: 28 -->

## I-18. Infinite Scroll Archive

### 무한 스크롤 글 목록

### 문제

- URL 상태가 불안정
- 뒤로 가기 경험이 나쁨
- 원하는 위치 재방문 어려움
- Footer 접근 어려움
- 오래된 글 탐색이 피곤함

### 개선

기술 지식 사이트에는 명시적 페이지네이션이나 Topic 탐색이 더 적합하다.

---

<!-- source message: 28 -->

## I-19. Latest-Only Homepage

### 홈이 최신 글만 보여줌

### 문제

사이트의 핵심 자산이 최신성에 묻힌다.

### 개선

홈 우선순위를 다음처럼 둔다.

```text
Start Here
Core Topics
Featured Guides
Recently Updated
Latest Posts
```

---

<!-- source message: 28 -->

## I-20. Popularity-Only Homepage

### 인기 글만 노출

### 문제

과거에 우연히 유입된 글이 계속 상위에 남고, 새롭고 중요한 글은 묻힌다.

### 개선

편집자 선정과 데이터 기반 추천을 섞는다.

---

<!-- source message: 28 -->

## I-21. No Start Here

### 신규 방문자를 위한 시작점 없음

### 문제

글이 많을수록 첫 진입이 더 어렵다.

### 개선

다음과 같은 페이지를 만든다.

```text
시스템 프로그래밍 처음 시작하기
C++ 성능 최적화 학습 경로
Firmware와 Bootloader 로드맵
```

---

<!-- source message: 28 -->

## I-22. Start Here Overload

### 시작 페이지가 너무 방대함

모든 분야를 한 페이지에 넣는다.

### 문제

시작 페이지 자체가 또 하나의 거대 문서가 된다.

### 개선

전체 Start Here는 작은 지도 역할만 하고, 분야별 로드맵으로 연결한다.

---

<!-- source message: 28 -->

## I-23. Missing Breadcrumb

### 상위 구조 표시 없음

글 상단에 제목과 날짜만 있다.

### 문제

독자는 현재 글이 사이트 어디에 속하는지 모른다.

### 개선

```text
Home > Firmware > PCIe > Enumeration
```

같은 Breadcrumb을 제공한다.

---

<!-- source message: 28 -->

## I-24. Fake Breadcrumb

### 폴더 경로를 그대로 Breadcrumb으로 표시

```text
Home > Blog > 2026 > 07 > Notes > PCIe
```

### 문제

저장 위치는 보여주지만 지식 구조는 보여주지 못한다.

### 개선

독자 관점의 Topic 계층을 사용한다.

---

<!-- source message: 28 -->

## I-25. Breadcrumb Without Links

### Breadcrumb이 텍스트 장식

상위 항목을 눌러 이동할 수 없다.

### 개선

모든 중간 노드를 실제 허브 페이지에 연결한다.

---

<!-- source message: 28 -->

## I-26. Orphan Article

### 들어오는 내부 링크가 없는 글

검색이나 직접 URL로만 발견된다.

### 문제

- 사이트 구조상 중요도가 없음
- 대표 문서와 연결되지 않음
- 검색엔진 발견과 평가가 약해질 수 있음

### 개선

각 글은 최소 하나 이상의 상위 Hub나 관련 글에서 연결되게 한다.

---

<!-- source message: 28 -->

## I-27. Dead-End Article

### 나가는 링크가 없는 글

글을 읽고 나면 다음 행동이 없다.

### 개선

최소 하나를 제공한다.

```text
상위 주제로 돌아가기
다음 글
관련 개념
실습 글
```

---

<!-- source message: 28 -->

## I-28. Related Posts by Shared Tag Only

### 태그 겹침만으로 관련 글 추천

### 문제

`Linux` 태그 하나가 겹친다는 이유로 전혀 다른 글이 추천될 수 있다.

### 개선

추천 관계에 가중치를 둔다.

```text
동일 Topic
선행·후속 관계
동일 Series
동일 Content Type
본문 명시 링크
공통 Tag
```

---

<!-- source message: 28 -->

## I-29. Random Related Posts

### 임의 추천

### 문제

방문자의 학습 흐름과 무관하다.

### 개선

랜덤은 보조 기능으로만 사용하고, 핵심 추천은 의미 관계로 구성한다.

---

<!-- source message: 28 -->

## I-30. Circular Recommendation Trap

### 같은 글들만 서로 순환 추천

A가 B를 추천하고, B가 C를 추천하고, C가 다시 A를 추천한다.

### 문제

사용자가 한 작은 묶음 밖으로 나가지 못한다.

### 개선

상위 Topic, 인접 분야, 다음 난이도로 연결을 확장한다.

---

<!-- source message: 28 -->

## I-31. Internal Link as “Click Here”

### 의미 없는 앵커 텍스트

```text
자세한 내용은 여기를 참고하세요.
```

### 문제

링크 목적을 알기 어렵고 접근성과 SEO 모두 약하다.

### 개선

```text
PCIe BAR 크기 탐색 과정에서 자세히 설명한다.
```

처럼 링크 대상의 의미를 앵커에 넣는다.

---

<!-- source message: 28 -->

## I-32. Excessive Inline Linking

### 거의 모든 용어에 링크

### 문제

본문이 파란 링크로 가득 차 읽기 흐름이 깨진다.

### 개선

한 개념은 문맥상 가장 중요한 첫 등장이나 실제 선행 설명이 필요할 때만 링크한다.

---

<!-- source message: 28 -->

## I-33. Link Without Context

### 링크는 있지만 왜 읽어야 하는지 없음

```text
관련 글: MSI-X
```

### 개선

```text
BAR 할당 이후 인터럽트 경로까지 추적하려면 MSI-X 설정 글을 이어서 읽는다.
```

---

<!-- source message: 28 -->

## I-34. Link Rot Inside the Site

### 내부 URL 변경으로 링크 깨짐

### 원인

- 폴더 이동
- slug 변경
- 카테고리 개편
- 글 통합

### 개선

- 안정적인 slug
- redirect map
- CI broken link 검사
- 글 통합 시 이전 URL 유지

---

<!-- source message: 28 -->

## I-35. External-Link-Only Context

### 핵심 선행 설명을 외부 링크에 의존

### 문제

외부 문서가 사라지거나 내용이 바뀌면 글 자체가 이해되지 않는다.

### 개선

현재 글에 필요한 최소 설명은 제공하고, 외부 링크는 추가 근거로 사용한다.

---

<!-- source message: 28 -->

## I-36. Search as Exact Match

### 정확한 문자열만 찾는 검색

`MSI-X`와 `MSIX`, `C++`와 `cpp`가 별개로 처리된다.

### 개선

- alias dictionary
- 대소문자 정규화
- 하이픈·기호 정규화
- 동의어 확장

---

<!-- source message: 28 -->

## I-37. Acronym Search Failure

### 약어와 풀네임 연결 실패

```text
IOMMU
Input Output Memory Management Unit
```

가 서로 연결되지 않는다.

### 개선

검색 문서에 명시적 alias를 둔다.

---

<!-- source message: 28 -->

## I-38. Korean-English Search Split

### 한글과 영문 검색 결과 분리

```text
메모리 일관성
cache coherence
```

가 같은 주제인데 별개로 처리된다.

### 개선

Topic metadata에 한글·영문 alias를 함께 관리한다.

---

<!-- source message: 28 -->

## I-39. Search Result Without Context

### 결과에 제목만 표시

### 문제

비슷한 제목 중 무엇을 선택해야 할지 모른다.

### 개선

다음을 함께 표시한다.

```text
Content Type
Topic
Description
Matched heading
Updated date
```

---

<!-- source message: 28 -->

## I-40. Search Result Without Match Highlight

### 어디에서 검색어가 일치했는지 안 보임

### 개선

제목, 소제목, 설명 중 매칭된 위치를 짧게 강조한다.

---

<!-- source message: 28 -->

## I-41. Search Ranking by Frequency

### 키워드가 많이 등장한 글을 상위 노출

### 문제

긴 글이나 코드 덤프가 과도하게 유리하다.

### 개선

필드별 가중치를 둔다.

```text
Title > Keyword > Topic > Heading > Description > Body
```

---

<!-- source message: 28 -->

## I-42. Code Noise in Search

### 코드와 로그가 검색 결과를 오염

### 문제

함수명이나 에러 문자열이 반복된 글이 과도하게 상위 노출된다.

### 개선

기본 검색에서는 코드와 로그를 제외하거나 별도 검색 모드로 분리한다.

---

<!-- source message: 28 -->

## I-43. Full Index Eager Loading

### 검색하지 않아도 전체 인덱스 다운로드

### 문제

초기 로딩과 모바일 메모리 비용이 증가한다.

### 개선

검색 UI를 열 때 지연 로드하거나 Topic별로 분할한다.

---

<!-- source message: 28 -->

## I-44. Search Without Filters

### 모든 문서가 한 목록에 섞임

### 개선

최소 필터를 제공한다.

```text
All
Guide
Debug
Experiment
Reference
```

과도하게 복잡한 필터 UI는 피한다.

---

<!-- source message: 28 -->

## I-45. Filter Explosion

### 검색 필터가 너무 많음

```text
연도
난이도
언어
플랫폼
버전
작성자
유형
상태
```

### 문제

검색보다 필터 설정이 더 복잡해진다.

### 개선

실제로 선택에 영향을 주는 2~3개 축만 노출한다.

---

<!-- source message: 28 -->

## I-46. No Zero-Result Recovery

### 검색 결과가 없으면 끝

### 개선

- 유사 검색어
- alias
- Topic 추천
- 철자 교정
- 관련 Guide

를 제공한다.

---

<!-- source message: 28 -->

## I-47. Search Hides Canonical Guides

### 일반 글이 대표 Guide보다 위에 노출

### 문제

사용자는 단편 글부터 들어가 전체 구조를 놓친다.

### 개선

대표 Guide와 Topic Hub에 ranking boost를 준다.

---

<!-- source message: 28 -->

## I-48. Topic Hub as Article List

### Topic Hub가 글 목록뿐

### 문제

일반 태그 페이지와 다를 바가 없다.

### 개선

Hub가 직접 다음 정보를 제공해야 한다.

```text
주제 정의
전체 구조
학습 순서
대표 문서
하위 주제
최근 변경
```

---

<!-- source message: 28 -->

## I-49. Topic Hub as Mega-Article

### Hub에 모든 설명을 넣음

### 문제

Hub와 세부 문서 역할이 섞인다.

### 개선

Hub는 지도와 큐레이션 중심으로 유지한다.

---

<!-- source message: 28 -->

## I-50. Stale Topic Hub

### 새 글이 허브에 반영되지 않음

### 문제

허브보다 최신 글 목록이 더 정확해진다.

### 개선

자동 후보 추천과 수동 큐레이션을 결합한다.

---

<!-- source message: 28 -->

## I-51. Missing Cross-Topic Links

### 분야별로 고립

```text
CUDA
PCIe
NUMA
CXL
Linux
```

각 Topic 안에서는 연결되지만 서로 연결되지 않는다.

### 문제

네 블로그의 가장 큰 차별점인 **기술 간 연결성**이 사라진다.

### 개선

다음과 같은 교차 경로를 만든다.

```text
CUDA Memory Transfer
→ PCIe Bandwidth
→ NUMA Placement
→ CXL Memory Tier
```

---

<!-- source message: 28 -->

## I-52. Knowledge Graph Without Editorial Judgment

### 자동 링크 그래프를 그대로 사용

키워드 공통도만으로 관계를 만든다.

### 문제

기술적으로는 연결되지만 학습적으로는 의미 없는 관계가 많아진다.

### 개선

자동화는 후보를 만들고, 대표 관계는 사람이 승인한다.

---

<!-- source message: 28 -->

## I-53. Backlink Overload

### 모든 역링크를 표시

문서가 참조된 모든 페이지를 하단에 노출한다.

### 문제

수십 개 링크가 생겨 정보 가치가 떨어진다.

### 개선

상위 의미 관계만 노출하고 전체 역링크는 별도 패널에서 제공한다.

---

<!-- source message: 28 -->

## I-54. No Content Status in Navigation

### 오래된 글과 최신 글이 똑같이 보임

### 개선

목록과 검색 결과에서 상태를 표시한다.

```text
Current
Historical
Needs Review
Superseded
```

---

<!-- source message: 28 -->

## I-55. No Difficulty Signal

### 난이도 구분 없음

### 문제

초보자가 고급 소스 분석 글에 바로 진입할 수 있다.

### 개선

너무 세밀한 점수 대신:

```text
Intro
Intermediate
Advanced
```

정도로만 표시한다.

---

<!-- source message: 28 -->

## I-56. Difficulty as Absolute Truth

### 난이도를 고정된 객관값처럼 사용

### 문제

독자의 배경에 따라 난이도는 달라진다.

### 개선

난이도와 함께 선행 지식을 표시한다.

---

<!-- source message: 28 -->

## I-57. Audience-Free Navigation

### 대상 독자 구분이 없음

### 개선

필요한 곳에 다음 역할을 표시한다.

```text
Firmware Engineer
Kernel Developer
CUDA Beginner
Performance Engineer
```

모든 페이지에 강제할 필요는 없다.

---

<!-- source message: 28 -->

## I-58. Mobile Navigation Collapse

### 데스크톱 구조를 모바일 메뉴에 그대로 넣음

### 문제

- 메뉴가 너무 깊음
- 접기 항목이 많음
- 현재 위치가 보이지 않음

### 개선

모바일에서는 핵심 Topic과 검색만 우선 제공한다.

---

<!-- source message: 28 -->

## I-59. Sidebar Overload

### 긴 글에서 사이드바에 너무 많은 정보

```text
TOC
Series
Related
Ads
Author
Tags
```

### 문제

본문 집중을 방해하고 좁은 화면에서 복잡하다.

### 개선

현재 글에 가장 필요한 하나나 둘만 고정한다.

---

<!-- source message: 28 -->

## I-60. TOC as Heading Dump

### 모든 H2·H3·H4를 목차에 표시

### 문제

목차가 본문만큼 길어진다.

### 개선

기본은 H2·핵심 H3만 표시하고 세부 항목은 접는다.

---

# Information Architecture 분야 핵심 묶음

## 분류 체계

- Category Explosion
- Category Overlap
- Tag Explosion
- Synonym Tag Drift
- Series and Topic Duplication

## 진입과 탐색

- Latest-Only Homepage
- No Start Here
- Missing Breadcrumb
- Archive-First Navigation
- Pagination as Discovery

## 링크 구조

- Orphan Article
- Dead-End Article
- Related Posts by Shared Tag Only
- Internal Link as “Click Here”
- Link Rot Inside the Site

## 검색

- Search as Exact Match
- Korean-English Search Split
- Search Ranking by Frequency
- Code Noise in Search
- Search Without Filters

## 지식베이스

- Topic Hub as Article List
- Stale Topic Hub
- Missing Cross-Topic Links
- Knowledge Graph Without Editorial Judgment
- No Content Status in Navigation

---

# hawk90에서 우선 확인할 10개

| 우선순위 | 안티패턴 | 이유 |
|---:|---|---|
| 1 | Latest-Only Homepage | 최신 글이 사이트 전체 정체성을 지배 |
| 2 | Missing Topic Hub | 전문 분야의 대표 진입점이 약함 |
| 3 | Orphan Article | 과거 핵심 글이 묻힐 가능성 큼 |
| 4 | Series and Topic Duplication | Tag·Series·Category 역할 중복 가능 |
| 5 | Search Ranking by Frequency | 긴 코드·로그 글이 유리할 수 있음 |
| 6 | Korean-English Search Split | 한글 설명과 영문 기술 용어가 혼재 |
| 7 | Related Posts by Shared Tag Only | 시스템 분야에서 관계 정확도가 낮음 |
| 8 | Missing Cross-Topic Links | 네 콘텐츠의 가장 큰 차별점이 연결성 |
| 9 | No Content Status in Navigation | 오래된 기술 문서의 신뢰 판단 어려움 |
| 10 | TOC as Heading Dump | 장문 기술 문서에서 실제 사용성 저하 |

다음은 **Task 2-4. Performance & Build Anti-patterns**다. Astro 빌드, Shiki, Markdown 처리, 검색 인덱스, 이미지, 폰트, 클라이언트 JavaScript, GitHub Actions와 대규모 콘텐츠 처리 문제를 카탈로그화하면 된다.

<!-- source message: 29 -->

## P-01. Full Corpus Rebuild

### 글 하나를 수정해도 전체 사이트 재생성

### 증상

- 작은 오탈자 수정에도 모든 Markdown 처리
- 모든 코드 블록 재하이라이팅
- 전체 검색 인덱스 재생성
- 모든 OG 이미지 검사
- 전체 Sitemap·RSS 재생성

### 왜 문제인가

콘텐츠가 적을 때는 단순하지만, 수백 개 글과 수만 개 코드 블록에서는 로컬 개발과 CI 모두 느려진다.

### 개선 방향

```text
개발 빌드
배포 빌드
정기 감사
```

를 분리한다.

---

<!-- source message: 29 -->

## P-02. Heap Expansion as Optimization

### 빌드 실패를 메모리 증가로 해결

```text
--max-old-space-size=8192
```

### 증상

- 메모리 부족 때마다 heap 상향
- CI runner 사양에 의존
- GC 시간이 계속 증가
- 근본 병목은 측정하지 않음

### 왜 문제인가

메모리 증가는 임시 안전망이지 확장 전략이 아니다.

### 개선 방향

- peak RSS 측정
- 단계별 메모리 사용 측정
- 대형 객체 생명주기 단축
- 콘텐츠 chunk 처리
- 불필요한 AST 유지 제거

---

<!-- source message: 29 -->

## P-03. Build Pipeline Monolith

### 모든 생성·검사를 하나의 build에 묶음

```text
OG
Search
RSS
Sitemap
Links
Series
Images
Freshness
Style
```

를 한 명령에서 처리한다.

### 문제

- 실패 원인 파악이 어려움
- 빠른 로컬 확인이 불가능
- 경고성 감사도 배포를 막음
- 작은 수정도 전체 파이프라인 실행

### 개선

```text
build:fast
build:release
audit:content
audit:links
generate:assets
```

로 역할을 분리한다.

---

<!-- source message: 29 -->

## P-04. Every Audit Is a Release Blocker

### 모든 품질 검사가 배포를 차단

### 문제

이미지 없음, 오래된 글, 문체 문제까지 모두 오류로 취급하면 결국 검사 자체를 끄게 된다.

### 개선

```text
ERROR
WARNING
INFO
```

등급을 나눈다.

배포 차단은 깨진 링크, 스키마 오류, 생성 실패처럼 명확한 문제로 제한한다.

---

<!-- source message: 29 -->

## P-05. Parse the Same Content Repeatedly

### 도구마다 Markdown을 다시 읽음

링크 감사, 시리즈 검사, 검색 생성, 중복 검사, 신선도 검사가 각각 파일을 파싱한다.

### 문제

- I/O와 파싱 비용 중복
- parser 설정 불일치
- front matter 해석 차이
- 규칙 간 결과 충돌

### 개선

한 번 파싱한 공통 content manifest를 모든 도구가 사용한다.

---

<!-- source message: 29 -->

## P-06. AST Retention Explosion

### 모든 문서 AST를 빌드 끝까지 보관

### 문제

대형 콘텐츠에서 메모리를 급격히 소비한다.

### 개선

- 문서 단위 처리
- 필요한 metadata만 추출
- 처리 후 AST 해제
- 전역 배열에 전체 tree 저장 금지

---

<!-- source message: 29 -->

## P-07. Build-Time Everything

### 모든 작업을 빌드 시점에 수행

### 증상

- 읽기 시간 계산
- OG 생성
- 링크 그래프
- 검색 인덱스
- 중복 분석
- 이미지 분석
- 모든 변환

### 문제

배포 빌드가 너무 많은 책임을 가진다.

### 개선

변경 빈도에 따라 나눈다.

```text
매 빌드
변경 파일만
주간 배치
수동 감사
```

---

<!-- source message: 29 -->

## P-08. No Build Budget

### 빌드 시간·메모리 목표가 없음

### 문제

느려져도 “원래 콘텐츠가 많아서”라고 받아들이게 된다.

### 개선

예산을 정한다.

```text
로컬 빠른 검증: 10초 이내
배포 빌드: 5분 이내
peak memory: 4GB 이하
```

환경에 맞게 수치는 조정하되 추세를 기록한다.

---

<!-- source message: 29 -->

## P-09. No Build Regression Tracking

### 빌드가 느려져도 언제부터인지 모름

### 개선

CI에서 다음을 기록한다.

- 총 시간
- 페이지 수
- 코드 블록 수
- peak memory
- 출력 크기
- 검색 인덱스 크기

변화율이 임계치를 넘으면 경고한다.

---

<!-- source message: 29 -->

## P-10. Content Count as the Only Scale Metric

### 글 개수만 규모로 봄

### 문제

성능 비용은 글 수보다 다음에 더 크게 좌우될 수 있다.

- 코드 블록 수
- 코드 길이
- 수식 수
- 이미지 수
- 다이어그램 수
- heading 수
- 생성 페이지 수

### 개선

콘텐츠 complexity metric을 별도로 관리한다.

---

# Syntax Highlighting

<!-- source message: 29 -->

## P-11. Highlight Everything

### 모든 `<pre>`를 syntax highlighting

로그, 출력, 디렉터리 구조, 레지스터 덤프까지 Shiki로 처리한다.

### 문제

불필요한 토큰화와 HTML 증가가 발생한다.

### 개선

```text
source code
shell command
plain output
log
dump
```

역할을 구분한다.

---

<!-- source message: 29 -->

## P-12. Load Every Language Grammar

### 사용하지 않는 언어까지 모두 로드

### 문제

초기화 시간과 메모리 사용량이 증가한다.

### 개선

실제 사용하는 언어만 allowlist로 관리한다.

새 언어가 필요할 때 명시적으로 추가한다.

---

<!-- source message: 29 -->

## P-13. Grammar Alias Duplication

### 같은 언어가 여러 alias로 중복 로드

```text
cpp
c++
cxx
cplusplus
```

### 개선

canonical language id를 정하고 alias는 입력 정규화로 처리한다.

---

<!-- source message: 29 -->

## P-14. Unknown Language Fallback to Heavy Parser

### 미등록 언어를 무거운 자동 감지로 처리

### 문제

오타 하나가 예측하지 못한 parser 비용을 만든다.

### 개선

알 수 없는 언어는 `text`로 fallback하고 감사에서 경고한다.

---

<!-- source message: 29 -->

## P-15. Dual-Theme HTML Duplication

### 다크·라이트 테마 토큰을 모두 HTML에 포함

### 문제

코드 블록이 많으면 출력 HTML이 크게 증가한다.

### 개선

현재 방식의 실제 출력 크기를 측정하고, 필요하면 CSS variable 기반 또는 단일 기본 테마를 검토한다.

---

<!-- source message: 29 -->

## P-16. Runtime Highlighting

### 브라우저에서 코드 하이라이팅

### 문제

- 긴 글에서 main thread 점유
- 첫 렌더 후 layout 변화
- 모바일 성능 저하
- JavaScript 의존

### 개선

기술 블로그는 기본적으로 빌드 타임 highlighting이 적합하다.

---

<!-- source message: 29 -->

## P-17. Line-Level Feature Everywhere

### 모든 코드 블록에 line number·copy·wrap·mark 기능 적용

### 문제

작은 코드 블록에도 DOM과 CSS가 과도해진다.

### 개선

기능을 코드 블록 길이와 metadata에 따라 선택한다.

---

<!-- source message: 29 -->

## P-18. Full Source in Article

### 긴 전체 소스를 본문에 포함

### 성능 문제

- 하이라이팅 시간 증가
- HTML 용량 증가
- DOM 노드 증가
- 검색 인덱스 오염

### 개선

본문은 핵심 부분만, 전체 코드는 별도 파일로 제공한다.

---

# Search

<!-- source message: 29 -->

## P-19. Full Body Search Index

### 모든 본문 텍스트를 검색 JSON에 포함

### 문제

- 인덱스 크기 폭증
- 코드·로그 노이즈
- 파싱 시간 증가
- 모바일 메모리 증가

### 개선

제목, 설명, 소제목, 키워드, 핵심 excerpt 중심으로 구성한다.

---

<!-- source message: 29 -->

## P-20. Eager Search Index Loading

### 검색을 사용하지 않아도 인덱스를 다운로드

### 개선

검색 모달을 열 때 지연 로드한다.

---

<!-- source message: 29 -->

## P-21. Single Giant Search Index

### 모든 분야를 하나의 거대한 파일로 제공

### 개선

필요하면 Topic이나 콘텐츠 타입별 shard로 나눈다.

```text
search-core.json
search-cpp.json
search-systems.json
```

---

<!-- source message: 29 -->

## P-22. Search Index Includes HTML

### 렌더링된 HTML 전체 저장

### 문제

태그 제거와 entity 처리 비용이 크고 불필요한 UI 텍스트가 섞인다.

### 개선

렌더링 전의 정제된 검색 문서를 생성한다.

---

<!-- source message: 29 -->

## P-23. Search Snippet Generated at Runtime

### 브라우저에서 전체 본문을 탐색해 snippet 생성

### 문제

검색할 때마다 문자열 처리 비용이 크다.

### 개선

빌드 시 heading별 짧은 excerpt를 준비한다.

---

<!-- source message: 29 -->

## P-24. Search Ranking on Main Thread

### 큰 인덱스의 ranking을 UI thread에서 동기 처리

### 문제

입력 중 끊김이 발생한다.

### 개선

- 작은 인덱스 유지
- debounce
- 필요하면 Web Worker 사용
- 결과 개수 제한

---

<!-- source message: 29 -->

## P-25. Index Invalidated by Any Change

### 글 하나 수정해도 전체 검색 인덱스 재생성

### 개선

문서별 검색 레코드를 생성하고 마지막 병합만 수행하는 증분 방식을 고려한다.

---

# Images and Generated Assets

<!-- source message: 29 -->

## P-26. Original PNG Everywhere

### 고해상도 PNG를 그대로 배포

### 문제

기술 다이어그램과 스크린샷이 많으면 페이지 용량이 커진다.

### 개선

- 사진: AVIF/WebP
- 선형 다이어그램: SVG
- 스크린샷: WebP/PNG 선택
- 원본 크기 제한

---

<!-- source message: 29 -->

## P-27. SVG Without Optimization

### 생성된 SVG에 편집기 metadata와 불필요한 path가 남음

### 개선

SVGO 계열 최적화를 적용하되 수식·텍스트가 깨지지 않는지 확인한다.

---

<!-- source message: 29 -->

## P-28. Rasterized Technical Diagram

### 벡터로 가능한 구조도를 PNG로 저장

### 문제

- 확대 시 흐림
- 다크모드 대응 어려움
- 텍스트 검색 불가
- 파일 크기 증가

### 개선

가능하면 SVG를 사용한다.

---

<!-- source message: 29 -->

## P-29. No Intrinsic Image Dimensions

### `width`와 `height` 없이 이미지 삽입

### 문제

이미지 로딩 중 CLS가 발생한다.

### 개선

빌드 시 실제 크기를 추출해 속성을 넣는다.

---

<!-- source message: 29 -->

## P-30. Lazy Loading the LCP Image

### 첫 화면 핵심 이미지까지 lazy load

### 문제

LCP가 늦어진다.

### 개선

첫 화면 대표 이미지는 eager 또는 preload하고, 아래 이미지만 lazy 처리한다.

---

<!-- source message: 29 -->

## P-31. Eager Loading Every Image

### 홈 카드 이미지와 본문 이미지를 모두 즉시 로드

### 개선

viewport 아래 자산은 lazy load한다.

---

<!-- source message: 29 -->

## P-32. One Image Size for Every Viewport

### 모바일과 데스크톱에 동일한 대형 이미지

### 개선

`srcset`과 `sizes`를 제공한다.

---

<!-- source message: 29 -->

## P-33. Generated Asset Staleness

### 제목 변경 후 OG 이미지가 갱신되지 않음

### 개선

입력 hash를 기준으로 파생 자산을 재생성한다.

---

<!-- source message: 29 -->

## P-34. Generated Assets Committed Indefinitely

### 파생 파일을 Git에 계속 축적

### 문제

- 저장소 비대화
- merge conflict
- stale 파일 잔존
- 원본과 생성물 혼동

### 개선

배포에서 재생성 가능하면 Git 추적을 피한다.

---

<!-- source message: 29 -->

## P-35. Prune by Filename Only

### 파생 자산 정리를 파일명 규칙에만 의존

### 문제

slug 변경, alias, redirect에서 잘못 삭제할 수 있다.

### 개선

현재 content manifest를 기준으로 유효 자산 목록을 만든다.

---

<!-- source message: 29 -->

## P-36. Diagram Toolchain in Critical Path

### TikZ·LaTeX 같은 무거운 도구가 모든 배포 빌드에 포함

### 문제

환경 설치가 복잡하고 작은 글 수정도 다이어그램 도구에 의존한다.

### 개선

변경된 다이어그램만 생성하고 결과를 캐시한다.

---

# JavaScript and Rendering

<!-- source message: 29 -->

## P-37. JavaScript for Static Metadata

### 날짜·읽기 시간·태그 표시를 클라이언트에서 계산

### 개선

빌드 시 HTML로 생성한다.

---

<!-- source message: 29 -->

## P-38. Global Bundle for Page-Specific Features

### 검색, 댓글, 수식, 관리자 기능 JS가 모든 페이지에 포함

### 개선

페이지 유형별로 나누고 필요할 때만 로드한다.

---

<!-- source message: 29 -->

## P-39. ClientRouter Tax on Every Page

### 부드러운 전환을 위해 모든 페이지가 라우터 비용 부담

### 문제

기능 자체보다 lifecycle 복잡성이 커질 수 있다.

### 개선

실제 사용자 가치와 성능을 측정하고 progressive enhancement로 유지한다.

---

<!-- source message: 29 -->

## P-40. Duplicate Event Registration After Navigation

### 페이지 전환 때 이벤트가 계속 중복 등록

### 증상

- 클릭 한 번에 여러 번 실행
- 메모리 증가
- 검색 모달 중복
- 댓글 재생성

### 개선

명시적 dispose와 단일 lifecycle manager를 둔다.

---

<!-- source message: 29 -->

## P-41. Third-Party Script Eager Loading

### Giscus·Analytics·AdSense·Newsletter를 즉시 로드

### 문제

초기 네트워크와 main thread를 점유한다.

### 개선

- 댓글: viewport 근처에서 로드
- 뉴스레터: 사용자 상호작용 후
- 광고: 콘텐츠 안정성 고려
- 분석: 최소 구성

---

<!-- source message: 29 -->

## P-42. All Icons in One Library

### 아이콘 몇 개를 위해 전체 라이브러리 번들

### 개선

정적 SVG 또는 tree-shakable import를 사용한다.

---

<!-- source message: 29 -->

## P-43. Runtime Theme Initialization Flash

### 테마가 JavaScript 실행 후 적용되어 화면이 번쩍임

### 개선

초기 HTML 전에 작은 inline script로 저장된 테마를 적용하거나 CSS media query를 기본으로 사용한다.

---

<!-- source message: 29 -->

## P-44. Font Loading Cascade

### 여러 폰트와 weight가 순차 로딩

### 문제

- 텍스트 교체
- CLS
- 네트워크 증가

### 개선

본문·코드 폰트를 최소화하고 실제 사용하는 weight만 제공한다.

---

<!-- source message: 29 -->

## P-45. Local Font Without Subsetting

### 한글·영문 전체 glyph를 큰 파일로 제공

### 개선

필요한 문자 범위를 분할하거나 시스템 폰트 fallback을 적극 활용한다.

---

<!-- source message: 29 -->

## P-46. Preload Everything

### 모든 폰트·이미지·스크립트를 preload

### 문제

브라우저 우선순위를 오히려 망친다.

### 개선

LCP와 핵심 폰트처럼 정말 중요한 자원만 preload한다.

---

<!-- source message: 29 -->

## P-47. Prefetch Every Link

### 글 목록의 모든 링크를 미리 요청

### 문제

콘텐츠가 많은 홈·태그 페이지에서 네트워크 낭비가 크다.

### 개선

hover·viewport·intent 기반으로 제한한다.

---

<!-- source message: 29 -->

## P-48. No JavaScript Failure Fallback

### JS가 실패하면 검색·메뉴·탐색이 동작하지 않음

### 개선

기본 링크와 정적 페이지 구조를 유지한다.

---

# CSS and DOM

<!-- source message: 29 -->

## P-49. Utility Class Duplication

### 같은 긴 Tailwind 조합이 여러 파일에 반복

### 문제

빌드 성능보다 유지보수성과 일관성 비용이 커진다.

### 개선

반복되는 의미 단위를 컴포넌트나 semantic class로 추출한다.

---

<!-- source message: 29 -->

## P-50. DOM Inflation by Decorative Wrappers

### 스타일을 위해 중첩 `<div>`가 많음

### 문제

장문 글과 많은 카드에서 DOM 크기가 커진다.

### 개선

의미 없는 wrapper를 줄이고 CSS layout을 단순화한다.

---

<!-- source message: 29 -->

## P-51. Heading Anchor DOM Bloat

### 모든 heading에 복잡한 anchor wrapper와 icon 추가

### 개선

필요한 최소 markup만 사용하고 hover 시 시각화한다.

---

<!-- source message: 29 -->

## P-52. Table Wrapper Everywhere

### 모든 표에 복잡한 스크롤·복사·caption UI

### 문제

간단한 표에도 많은 DOM과 JS가 추가된다.

### 개선

큰 표나 overflow 가능성이 있는 표에만 강화 기능을 쓴다.

---

<!-- source message: 29 -->

## P-53. Permanent Offscreen UI

### 검색 모달·메뉴·패널을 항상 DOM에 유지

### 개선

필요할 때 렌더링하거나 최소 markup으로 유지한다.

---

# GitHub Actions and CI

<!-- source message: 29 -->

## P-54. Cold Install Every Build

### 매번 dependency를 처음부터 설치

### 개선

package manager cache와 lockfile 기반 캐시를 사용한다.

---

<!-- source message: 29 -->

## P-55. Cache Without Correct Key

### 캐시 key가 너무 넓거나 좁음

### 문제

- 잘못된 artifact 재사용
- 매번 cache miss
- dependency 변경 미반영

### 개선

lockfile, Node 버전, 주요 config hash를 key에 포함한다.

---

<!-- source message: 29 -->

## P-56. Cache Generated Output Blindly

### content 변경을 고려하지 않고 build output 캐시

### 문제

오래된 페이지나 OG 이미지가 배포될 수 있다.

### 개선

입력 fingerprint를 명확히 한다.

---

<!-- source message: 29 -->

## P-57. Duplicate Work Across Jobs

### build, test, deploy job가 각각 전체 콘텐츠 처리

### 개선

한 번 생성한 artifact를 후속 job에서 재사용한다.

---

<!-- source message: 29 -->

## P-58. Matrix Build Without Value

### 여러 Node·OS 조합에서 전체 블로그 빌드

### 문제

범용 테마가 아니라 실제 개인 사이트라면 과도할 수 있다.

### 개선

실제 지원 환경만 테스트한다.

---

<!-- source message: 29 -->

## P-59. Heavy Audit on Every Commit

### typo 수정에도 전체 중복 분석·신선도 검사

### 개선

변경 파일 기반 감사와 정기 전체 감사를 분리한다.

---

<!-- source message: 29 -->

## P-60. No Changed-File Awareness

### 변경 범위를 전혀 활용하지 않음

### 개선

다음은 변경된 문서 중심으로 처리할 수 있다.

- OG 이미지
- 링크 검사
- 이미지 검사
- front matter validation
- 관련 글 후보

---

<!-- source message: 29 -->

## P-61. Build Artifact Recompression

### 각 단계에서 같은 파일을 반복 압축·해제

### 개선

artifact 전달 방식을 단순화하고 압축 횟수를 줄인다.

---

<!-- source message: 29 -->

## P-62. Deploy Before Smoke Test

### 생성된 정적 결과를 확인하지 않고 바로 배포

### 개선

최소한 다음을 검사한다.

- 홈 200
- 대표 글 200
- Sitemap 존재
- 검색 인덱스 파싱
- 주요 asset 존재
- 내부 링크 샘플

---

<!-- source message: 29 -->

## P-63. No Preview Deployment

### 운영 배포 전 실제 결과 확인 불가

### 개선

큰 구조 변경에는 preview 환경이나 artifact 확인 단계를 둔다.

---

<!-- source message: 29 -->

## P-64. CI Logs as Profiling

### 단순 시작·종료 시간만 보고 병목 추정

### 개선

빌드 내부 단계별 timing을 별도 출력한다.

---

# Runtime Page Performance

<!-- source message: 29 -->

## P-65. Heavy Homepage

### 홈에 너무 많은 카드·이미지·통계·애니메이션

### 문제

가장 많이 방문하는 페이지가 가장 무거워진다.

### 개선

홈은 핵심 Topic과 대표 글 중심으로 제한한다.

---

<!-- source message: 29 -->

## P-66. Render Every Archive Item

### 수백 개 글을 한 페이지 DOM에 출력

### 개선

페이지네이션이나 정적 분할을 사용한다.

---

<!-- source message: 29 -->

## P-67. Huge In-Page TOC

### 긴 글의 모든 heading을 한 번에 렌더링

### 문제

목차 자체가 복잡하고 모바일에서 부담스럽다.

### 개선

H2 중심, 필요한 H3만 포함한다.

---

<!-- source message: 29 -->

## P-68. Sticky Everything

### 헤더·TOC·공유·광고가 모두 sticky

### 문제

화면 공간을 줄이고 scroll 성능을 악화시킨다.

### 개선

한 화면에 하나의 주요 sticky 요소만 둔다.

---

<!-- source message: 29 -->

## P-69. Code Block Width Breakout

### 긴 코드가 viewport를 넓혀 전체 레이아웃을 흔듦

### 개선

코드 컨테이너의 overflow를 명확히 관리하고 모바일에서 wrap 정책을 구분한다.

---

<!-- source message: 29 -->

## P-70. Math Layout Shift

### KaTeX 스타일이나 폰트가 늦게 적용되어 수식 크기가 바뀜

### 개선

필수 CSS를 초기 렌더에 포함하고 수식 영역 크기 변화를 줄인다.

---

<!-- source message: 29 -->

## P-71. Comments in Critical Rendering Path

### 댓글 영역이 본문 초기 렌더를 지연

### 개선

본문과 독립적으로 지연 로드한다.

---

<!-- source message: 29 -->

## P-72. Ads Before Content Stability

### 광고가 자리 예약 없이 삽입

### 문제

CLS와 읽기 흐름 저하.

### 개선

광고 슬롯 크기를 예약하고 기술 문서의 논리적 경계를 침범하지 않게 한다.

---

<!-- source message: 29 -->

## P-73. Analytics Overcollection

### 여러 분석 도구를 동시에 사용

### 문제

성능·개인정보·운영 복잡성이 증가한다.

### 개선

실제 의사결정에 사용하는 지표만 수집한다.

---

<!-- source message: 29 -->

## P-74. Performance Score Theater

### Lighthouse 100 자체가 목표

### 문제

실사용 문제보다 점수 최적화에 집중한다.

### 개선

다음 사용자 행동을 측정한다.

- 글이 빠르게 보이는가
- 검색이 즉시 반응하는가
- 코드 스크롤이 부드러운가
- 페이지 이동 후 상태가 정상인가

---

# Build Reliability

<!-- source message: 29 -->

## P-75. Non-Deterministic Build

### 같은 입력인데 결과가 달라짐

### 원인

- 현재 시각 사용
- 랜덤 OG 배치
- 외부 API 의존
- 정렬되지 않은 파일 순회
- 로컬 환경별 폰트 차이

### 개선

빌드 입력을 고정하고 정렬과 locale을 명시한다.

---

<!-- source message: 29 -->

## P-76. Network-Dependent Build

### 배포 중 외부 문서나 이미지 다운로드

### 문제

외부 장애가 블로그 배포를 막는다.

### 개선

필요한 자산은 사전에 관리하거나 실패 시 명확한 fallback을 둔다.

---

<!-- source message: 29 -->

## P-77. Locale-Dependent Sorting

### 실행 환경에 따라 한글·영문 정렬 순서가 달라짐

### 개선

정렬 locale과 비교 함수를 명시한다.

---

<!-- source message: 29 -->

## P-78. Timezone-Dependent Dates

### CI timezone에 따라 게시일이 달라짐

### 개선

날짜 파싱과 출력 timezone을 고정한다.

---

<!-- source message: 29 -->

## P-79. Silent Partial Generation

### 일부 OG·SVG 생성이 실패해도 빌드는 성공

### 문제

배포 후 깨진 자산이 발견된다.

### 개선

필수 자산 실패는 명시적으로 오류 처리하고, 선택 자산은 warning으로 남긴다.

---

<!-- source message: 29 -->

## P-80. Output Growth Without Alarm

### 정적 결과물이 계속 커지지만 감시하지 않음

### 개선

다음을 기록한다.

```text
전체 dist 크기
HTML 크기
검색 인덱스
이미지
JS
CSS
```

급격한 증가를 경고한다.

---

# hawk90에서 우선 확인할 12개

| 우선순위 | 안티패턴 | 이유 |
|---:|---|---|
| 1 | Full Corpus Rebuild | 콘텐츠와 코드 블록 규모가 이미 큼 |
| 2 | Heap Expansion as Optimization | 8GB heap은 병목 신호 |
| 3 | Parse the Same Content Repeatedly | 감사 스크립트가 많아 중복 가능성 큼 |
| 4 | Highlight Everything | 44,000개 코드 블록에서 영향이 큼 |
| 5 | Full Body Search Index | 검색 파일 크기와 정확도 모두 위험 |
| 6 | Build Pipeline Monolith | 로컬 개발과 배포 책임 분리 필요 |
| 7 | No Build Regression Tracking | 규모 증가 추세를 놓치기 쉬움 |
| 8 | Diagram Toolchain in Critical Path | TikZ 등 외부 도구가 배포 안정성에 영향 |
| 9 | Third-Party Script Eager Loading | Giscus·AdSense 도입 후 성능 저하 가능 |
| 10 | Generated Asset Staleness | OG·SVG·검색 인덱스 동기화 중요 |
| 11 | Heavy Audit on Every Commit | 품질 도구가 개발 속도를 저해할 수 있음 |
| 12 | Output Growth Without Alarm | 정적 사이트라도 배포 크기가 계속 증가 가능 |

# 이번 단계의 핵심 결론

성능 문제의 중심은 Astro 자체가 아니다.

> **콘텐츠 규모와 파생 처리량이 커졌는데, 빌드 모델은 여전히 작은 블로그처럼 전체 재처리를 기본으로 하는 것**

이 가장 큰 위험이다.

따라서 우선순위는 프레임워크 교체가 아니라 다음이다.

```text
측정
처리 단계 분리
공통 manifest
증분 생성
Shiki 범위 축소
검색 인덱스 정제
CI 작업 중복 제거
```

다음은 **Task 2-5. SEO & AdSense Anti-patterns**다. 여기서는 색인, canonical, thin page, 중복 콘텐츠, AI 문체, 저자 신뢰, 정책 페이지, 광고 배치와 “콘텐츠 가치 부족” 대응을 카탈로그 형태로 정리하면 된다.

<!-- source message: 31 -->

## S-01. Search-First Content

### 검색엔진을 먼저 생각한 콘텐츠

```text
사람이 실제로 궁금해하는 문제
<
검색량이 높은 키워드
```

### 증상

- 검색어마다 별도 글 생성
- 제목이 키워드 조합처럼 보임
- 글의 목적보다 검색 순위가 우선
- 실제 경험 없이 검색 결과를 재조합
- 독자가 읽고도 충분한 답을 얻지 못함

### 문제

Google은 검색 순위를 조작하기 위한 콘텐츠보다, 기존 또는 의도한 독자에게 실질적으로 도움이 되는 사람 중심 콘텐츠를 권장한다. citeturn453314search0turn453314search26

### 개선

```text
실제 질문
→ 직접 분석
→ 근거
→ 재현 가능한 결과
→ 검색 표현 최적화
```

순서로 접근한다.

---

<!-- source message: 31 -->

## S-02. Content Quantity Fallacy

### 글 수가 많으면 가치가 높다고 생각

### 증상

- 매일 글 발행 자체가 목표
- 짧은 글을 계속 분리
- 기존 글 갱신보다 신규 글 작성
- 글 수를 AdSense 승인 조건처럼 취급

### 문제

사이트에 글이 많아도 각각의 고유 정보가 적거나 탐색 가치가 낮으면 콘텐츠 가치가 자동으로 높아지지 않는다.

### 개선

다음을 더 중요하게 본다.

```text
고유한 정보
직접 경험
문제 해결력
정확성
완결성
관련 글 연결
```

---

<!-- source message: 31 -->

## S-03. Word-Count Padding

### 글자 수를 늘리기 위한 문장

```text
이 기술은 매우 중요합니다.
다양한 환경에서 활용됩니다.
앞으로도 중요성이 커질 것입니다.
```

### 문제

분량은 늘지만 독자가 얻는 정보는 늘지 않는다.

### 개선

추상적인 중요성 대신 구체적인 영향을 쓴다.

```text
BAR 주소가 잘못 할당되면 운영체제가 장치의 MMIO 영역에 접근할 수 없다.
```

---

<!-- source message: 31 -->

## S-04. Generic AI Prose

### 어디에나 적용되는 AI형 문체

### 증상

- “자세히 알아보겠습니다”
- “다양한 장점이 있습니다”
- 모든 글의 문장 구조가 비슷함
- 구체적인 환경·실패·판단이 없음

Google은 생성형 AI 사용 자체보다 결과물의 정확성·품질·관련성을 강조하며, 자동 생성된 제목·설명·대체 텍스트 같은 메타데이터도 동일하게 품질 관리해야 한다고 안내한다. citeturn453314search19turn453314search32

### 개선

- 실제 로그
- 사용한 버전
- 실패한 접근
- 직접 내린 판단
- 적용 한계

를 글 안에 포함한다.

---

<!-- source message: 31 -->

## S-05. AI Rewrite Without Added Value

### 기존 자료를 AI로 다시 표현

### 증상

- 공식 문서 순서를 그대로 따름
- 표현만 달라짐
- 실험이나 예제가 없음
- 출처 원문보다 정보가 적음

### 개선

최소한 다음 중 하나를 추가한다.

```text
실제 장비 검증
코드 흐름 분석
버전 차이
잘못 알려진 내용 검증
실패 사례
비교 실험
의사결정 기준
```

---

<!-- source message: 31 -->

## S-06. Specification Translation Site

### 사양서 번역이 사이트의 대부분

### 문제

번역 자체가 유용할 수는 있지만, 사이트 전체가 원문 재서술에 머물면 작성자의 독창적인 가치가 약해진다.

### 개선

```text
사양 내용
+
실제 구현
+
로그에서 확인하는 방법
+
자주 발생하는 오해
+
작성자의 검증 결과
```

로 확장한다.

---

<!-- source message: 31 -->

## S-07. Aggregation Without Synthesis

### 여러 자료를 모았지만 통합하지 않음

### 증상

- 링크와 인용문은 많음
- 자료마다 주장하는 내용을 나열
- 최종 판단이나 구조화가 없음

### 개선

자료를 수집한 뒤 다음을 제공한다.

```text
공통점
차이점
충돌하는 부분
실제 적용 판단
남은 불확실성
```

---

<!-- source message: 31 -->

## S-08. Experience-Free Expertise

### 전문적인 표현은 있지만 직접 경험이 없음

### 증상

- 깊은 용어 사용
- 실제 환경 정보 없음
- 관찰 로그 없음
- 실험 결과 없음
- 실패와 한계가 없음

### 개선

직접 경험이 있는 글은 이를 명확히 표시한다.

```text
Tested
Observed
Measured
Implemented
Debugged
```

조사형 글은 조사형 글이라고 구분한다.

---

<!-- source message: 31 -->

## S-09. Authority by Bio Only

### About 페이지로만 전문성을 증명

### 문제

긴 경력 소개가 있어도 개별 글의 근거가 약하면 신뢰가 완성되지 않는다.

### 개선

전문성은 각 문서에서도 보여야 한다.

- 검증 환경
- 참고 규격
- 코드 위치
- 측정 방법
- 수정일
- 적용 범위

---

<!-- source message: 31 -->

## S-10. No Editorial Purpose

### 사이트가 무엇을 제공하는지 불명확

### 증상

- C++, 역사, 일상, 뉴스, 제품 리뷰가 모두 섞임
- 홈의 설명이 포괄적
- 독자층이 불명확
- 어떤 글이 핵심인지 알 수 없음

### 개선

```text
누구에게
어떤 문제를
어떤 방식으로 설명하는 사이트인가
```

를 한두 문장으로 정한다.

---

# B. Thin Content와 페이지 품질

<!-- source message: 31 -->

## S-11. Thin Article

### 독립 페이지로서 정보량이 부족한 글

### 증상

- 정의 한두 문단
- 코드 한 개
- 결론 없음
- 다른 글과 합칠 수 있음
- 검색 결과에서 기대한 답을 충분히 제공하지 못함

### 주의

짧다고 무조건 Thin Content는 아니다.

짧아도 다음이 명확하면 가치가 있을 수 있다.

- 특정 오류의 정확한 해결법
- 희귀한 레지스터 정보
- 재현 가능한 작은 실험
- 빠른 Reference

---

<!-- source message: 31 -->

## S-12. Thin Tag Page

### 제목과 글 목록만 있는 태그 페이지

```text
Tag: PCIe

- 글 A
- 글 B
```

### 문제

태그 페이지가 수백 개 생성되면 사이트에 고유 설명이 거의 없는 목록형 URL이 많이 생긴다.

### 개선

- 중요한 태그는 Topic Hub로 승격
- 글이 적은 태그 페이지는 색인 필요성 검토
- 태그 설명과 대표 글 추가
- 동의어 태그 통합

---

<!-- source message: 31 -->

## S-13. Thin Series Page

### 시리즈 제목과 목차만 있음

### 개선

시리즈 페이지에 다음을 추가한다.

```text
학습 목표
대상 독자
선행 지식
전체 구조
각 글의 역할
완독 후 다음 단계
```

---

<!-- source message: 31 -->

## S-14. Thin Category Page

### 범주 설명 없이 카드만 나열

### 개선

카테고리 페이지가 직접 답해야 한다.

> 이 분야가 무엇이고, 어디서 시작하며, 어떤 순서로 읽어야 하는가?

---

<!-- source message: 31 -->

## S-15. Empty Search Page Indexing

### 검색 결과 페이지가 색인됨

### 문제

검색어별로 내용이 거의 없는 URL이 대량 생성될 수 있다.

### 개선

내부 검색 결과 페이지는 일반적으로 검색 색인 대상으로 만들 필요가 적다.

---

<!-- source message: 31 -->

## S-16. Filter Combination Indexing

### 필터 조합마다 URL과 색인 페이지 생성

```text
?topic=cpp&type=guide&year=2026
```

### 문제

유사한 목록 URL이 대량 발생한다.

### 개선

대표 Topic·Series 페이지를 제외한 임의 필터 조합은 색인 전략을 별도로 관리한다.

---

<!-- source message: 31 -->

## S-17. Pagination Duplication

### 페이지네이션 URL이 거의 동일한 문맥을 가짐

### 문제

각 페이지가 단순 글 카드 나열뿐이라면 독립적인 검색 유입 가치가 낮다.

### 개선

페이지네이션은 탐색 기능으로 유지하되 대표 허브의 고유 설명과 경쟁하지 않게 한다.

---

<!-- source message: 31 -->

## S-18. Placeholder Page Exposure

### 작성 중 페이지가 공개됨

```text
내용 준비 중
추후 업데이트 예정
```

AdSense 정책은 게시자 콘텐츠가 없거나 가치가 낮은 화면, 공사 중인 화면에 광고를 게재하지 못하도록 한다. citeturn453314search20

### 개선

- Draft로 유지
- 완성 후 공개
- 필요한 경우 광고 비활성화
- 검색 색인 제외

---

<!-- source message: 31 -->

## S-19. Tool Page Without Publisher Content

### 계산기·검색·도구만 있고 설명이 없음

### 문제

도구 자체가 유용하더라도 사용법·제약·해석 없이 입력창과 결과만 제공하면 게시자 콘텐츠가 부족해 보일 수 있다.

### 개선

- 도구 목적
- 입력 의미
- 결과 해석
- 한계
- 예제
- 관련 기술 설명

을 함께 제공한다.

---

<!-- source message: 31 -->

## S-20. Image Gallery Without Explanation

### 이미지나 다이어그램만 나열

### 개선

각 이미지가 무엇을 보여주며 어떤 결론을 뒷받침하는지 설명한다.

---

# C. 중복 콘텐츠와 Canonical

<!-- source message: 31 -->

## S-21. Duplicate URL Variants

### 동일 페이지가 여러 URL로 접근됨

```text
/post
/post/
/post/index.html
```

### 문제

검색엔진이 대표 URL을 직접 선택해야 하고 링크 신호가 분산될 수 있다.

Google은 중복되거나 매우 유사한 페이지가 있을 때 canonical URL을 지정하는 방법을 제공한다. citeturn453314search2turn453314search8

### 개선

- 일관된 trailing slash 정책
- 내부 링크 통일
- Sitemap에 canonical URL만 포함
- 필요하면 redirect
- self-referencing canonical

---

<!-- source message: 31 -->

## S-22. Canonical to the Homepage

### 모든 페이지 canonical이 홈을 가리킴

### 문제

개별 글이 홈과 동일한 콘텐츠가 아니므로 잘못된 canonical 신호가 된다.

### 개선

개별 글은 일반적으로 자기 URL을 canonical로 사용한다. 실제 중복 페이지일 때만 대표 페이지를 지정한다.

---

<!-- source message: 31 -->

## S-23. Canonical to a Non-Equivalent Page

### 유사 주제라는 이유로 다른 글을 canonical 지정

```text
CUDA Stream 글
→ CUDA 전체 가이드 canonical
```

### 문제

Canonical은 단순 관련 페이지를 묶는 기능이 아니다. 대표 페이지에는 중복 페이지 내용의 상당 부분이 포함돼야 한다. citeturn453314search15

### 개선

글을 통합했다면 이전 페이지를 redirect하거나, 실제로 거의 동일한 경우에만 canonical을 사용한다.

---

<!-- source message: 31 -->

## S-24. Canonical and Noindex Conflict

### canonical과 noindex를 무계획하게 함께 사용

### 문제

대표 페이지 선택과 색인 차단이라는 서로 다른 신호가 섞인다.

Google은 canonical URL이 `noindex` 상태인지 확인하라고 안내한다. citeturn453314search15

### 개선

목적을 구분한다.

```text
중복 통합 → canonical 또는 redirect
검색 제외 → noindex
```

---

<!-- source message: 31 -->

## S-25. Canonical Blocked by robots.txt

### 크롤러가 canonical을 확인할 수 없음

### 문제

robots.txt로 막으면 페이지 안의 canonical 요소를 읽지 못할 수 있다.

### 개선

색인을 막으려면 크롤링 가능 상태에서 `noindex`를 사용해야 한다. Google은 `noindex` 태그로 색인을 차단하는 방법을 별도로 안내한다. citeturn453314search36

---

<!-- source message: 31 -->

## S-26. Duplicate Excerpts

### 여러 글이 같은 서론과 description 사용

### 문제

각 페이지가 어떤 고유 질문에 답하는지 구분하기 어려워진다.

### 개선

각 문서의 차별적인 범위와 결과를 description에 작성한다.

---

<!-- source message: 31 -->

## S-27. Topic Cannibalization

### 같은 검색 의도를 여러 글이 경쟁

```text
PCIe BAR란
PCIe BAR 설명
PCIe BAR 완벽 정리
PCIe BAR 개념
```

### 개선

- 대표 Concept 하나
- Guide
- Debug Note
- Reference

처럼 역할별 검색 의도를 구분한다.

---

<!-- source message: 31 -->

## S-28. Old and New Article Competition

### 구판과 신판이 동시에 검색됨

### 개선

```text
구판 상단에 대체 문서 안내
상태를 superseded로 표시
내부 링크를 신판으로 전환
필요하면 redirect 또는 canonical 검토
```

---

<!-- source message: 31 -->

## S-29. Copying Content Across Series

### 시리즈마다 동일한 선행 설명 반복

### 개선

대표 Concept 문서로 분리하고 시리즈 글에서는 필요한 만큼만 요약한다.

---

<!-- source message: 31 -->

## S-30. Multi-Language Duplication Without hreflang

### 한글·영문판 관계가 표시되지 않음

### 문제

번역 페이지가 독립적인 중복처럼 해석될 가능성이 있고 사용자가 적절한 언어 페이지를 찾기 어렵다.

### 개선

완전한 번역 페이지를 운영한다면 각 언어 URL·canonical·언어 연결 정책을 일관되게 관리한다.

---

# D. 색인과 크롤링

<!-- source message: 31 -->

## S-31. Sitemap as a Dump

### 공개 URL을 전부 Sitemap에 넣음

### 포함되기 쉬운 것

- 태그 1개짜리 페이지
- 검색 페이지
- 관리자 페이지
- Draft
- redirect URL
- 중복 필터 페이지

### 개선

Sitemap에는 검색에 노출할 가치가 있는 canonical URL만 넣는다.

---

<!-- source message: 31 -->

## S-32. Noindex but Included in Sitemap

### 색인 제외 페이지가 Sitemap에 존재

### 문제

한쪽에서는 색인을 요청하고 다른 쪽에서는 막는 모순된 운영이 된다.

### 개선

Sitemap과 index 정책을 같은 manifest에서 생성한다.

---

<!-- source message: 31 -->

## S-33. Draft Leakage

### Draft가 정적 결과물이나 Sitemap에 포함

### 개선

빌드 단계에서 Draft를 완전히 제외하고 CI에서 검증한다.

---

<!-- source message: 31 -->

## S-34. Missing Canonical in Generated Pages

### 글에는 canonical이 있지만 Topic·Series에는 없음

### 개선

검색 대상이 되는 모든 페이지 유형에 canonical 정책을 정의한다.

---

<!-- source message: 31 -->

## S-35. Soft 404 Article

### URL은 200이지만 실질 콘텐츠가 없음

예:

```text
글을 찾을 수 없습니다.
이 콘텐츠는 이동했습니다.
```

### 개선

삭제된 페이지는 적절한 상태 코드나 관련 페이지 redirect를 사용한다.

---

<!-- source message: 31 -->

## S-36. Redirect Chain

### URL 변경이 누적됨

```text
A → B → C → D
```

### 문제

크롤링과 사용자 이동이 불필요하게 길어진다.

### 개선

오래된 모든 URL을 최종 URL로 직접 연결한다.

---

<!-- source message: 31 -->

## S-37. Internal Links to Redirects

### 사이트 내부 링크가 이전 주소를 계속 가리킴

### 개선

redirect는 외부 링크 보존용으로 사용하고 내부 링크는 최종 canonical URL로 수정한다.

---

<!-- source message: 31 -->

## S-38. Uncrawlable Navigation

### JavaScript 클릭 이벤트로만 페이지 이동

Google Search Essentials는 검색엔진이 페이지를 발견할 수 있도록 크롤링 가능한 링크를 만들 것을 권장한다. citeturn453314search26

### 개선

기본 `<a href>`를 유지하고 JavaScript 전환은 보조 기능으로 사용한다.

---

<!-- source message: 31 -->

## S-39. Orphan Canonical Content

### canonical 페이지지만 내부 링크가 없음

### 문제

Sitemap에만 존재하고 사이트 구조상 중요성이 드러나지 않는다.

### 개선

대표 허브, 시리즈 또는 관련 글에서 연결한다.

---

<!-- source message: 31 -->

## S-40. Indexing Everything by Default

### 공개된 모든 URL은 검색돼야 한다고 생각

### 문제

검색 결과 페이지, 얕은 태그, 실험적 페이지, 관리자 화면 등은 색인 가치가 낮을 수 있다.

### 개선

페이지 유형별로 명시적 정책을 둔다.

```text
index
noindex
draft
redirect
removed
```

---

# E. 제목·설명·구조화 데이터

<!-- source message: 31 -->

## S-41. Title Template Duplication

### 모든 제목이 같은 접미사를 반복

```text
PCIe BAR | Hawk Blog | Systems Notes
```

사이트 이름이 너무 길면 실제 문서 제목이 검색 결과에서 잘릴 수 있다.

### 개선

고유 제목을 우선하고 브랜드 접미사는 짧게 유지한다.

---

<!-- source message: 31 -->

## S-42. Keyword-Stuffed Title

### 제목에 관련 키워드를 전부 삽입

Google Search Essentials는 사용자가 검색할 표현을 제목·주요 heading·링크 문구 등 눈에 띄는 위치에 자연스럽게 사용할 것을 권장하지만, 이는 나열식 과잉 삽입을 의미하지 않는다. citeturn453314search26

### 개선

한 페이지당 하나의 주요 질문이나 결과에 집중한다.

---

<!-- source message: 31 -->

## S-43. Duplicate Meta Description

### 여러 페이지가 같은 설명 사용

### 개선

각 페이지에서 독자가 얻는 고유 결과를 설명한다.

---

<!-- source message: 31 -->

## S-44. Automated First-Sentence Description

### 본문 첫 문장을 그대로 meta description으로 사용

### 문제

첫 문장이 배경 설명이면 검색 결과에서 가치가 드러나지 않는다.

### 개선

수동 description을 핵심 글부터 작성하고, fallback도 목적·범위 중심으로 생성한다.

---

<!-- source message: 31 -->

## S-45. Empty Description

### description 누락

Google이 본문에서 snippet을 만들 수 있지만, 중요한 대표 글은 직접 설명을 작성하는 편이 사이트의 의도를 통제하기 쉽다.

---

<!-- source message: 31 -->

## S-46. Multiple H1

### 레이아웃 제목과 글 제목이 모두 H1

### 개선

페이지의 주 제목을 하나로 명확히 하고 나머지는 적절한 heading level을 사용한다.

---

<!-- source message: 31 -->

## S-47. Heading for Styling

### 글자 크기를 위해 heading 사용

```text
H2 다음 H5
```

### 문제

문서 구조와 목차가 왜곡된다.

### 개선

스타일은 CSS로 처리하고 heading은 의미 순서를 따른다.

---

<!-- source message: 31 -->

## S-48. Structured Data Decoration

### JSON-LD만 넣으면 SEO가 해결된다고 생각

Google의 구조화 데이터 가이드라인은 markup이 해당 페이지에 실제로 표시되고 설명되는 콘텐츠와 일치해야 한다고 요구한다. citeturn453314search37

### 개선

먼저 화면의 콘텐츠 모델을 정리한 뒤 구조화 데이터로 표현한다.

---

<!-- source message: 31 -->

## S-49. Fabricated Structured Data

### 화면에 없는 평가·저자·날짜를 markup에 추가

### 문제

구조화 데이터가 실제 콘텐츠를 정확하게 표현하지 않는다.

### 개선

화면에서 확인할 수 있는 정보만 사용한다.

---

<!-- source message: 31 -->

## S-50. One Schema Type Everywhere

### 모든 페이지를 `Article`로 표시

### 문제

홈, Topic Hub, 저자 페이지, 검색 페이지의 역할이 다르다.

### 개선

페이지 성격에 맞게 최소한으로 사용한다.

```text
WebSite
Person
BlogPosting 또는 TechArticle
BreadcrumbList
```

---

# F. 신뢰성과 운영 정보

<!-- source message: 31 -->

## S-51. Anonymous Expert Content

### 고급 기술 글인데 작성자 정보가 없음

### 개선

- 작성자 이름
- 전문 분야
- About 링크
- 수정·문의 방법

을 제공한다.

---

<!-- source message: 31 -->

## S-52. Inflated Author Claim

### 경력이나 권위를 과장

### 문제

실제 근거와 어긋나면 신뢰를 떨어뜨린다.

### 개선

구체적인 경험 범위를 사실대로 설명한다.

```text
CUDA와 FPGA 기반 영상 처리 경험
PCIe·CXL 펌웨어 및 드라이버 연구
```

처럼 확인 가능한 범위를 쓴다.

---

<!-- source message: 31 -->

## S-53. No Contact Path

### 오류를 발견해도 제보할 방법이 없음

### 개선

- GitHub Issue
- 이메일
- 댓글
- 수정 제안 링크

중 하나를 명확히 제공한다.

---

<!-- source message: 31 -->

## S-54. Missing Privacy Policy

### 분석·댓글·광고를 사용하지만 개인정보 안내가 없음

### 개선

사이트에서 실제 사용하는 서비스에 맞는 개인정보 처리방침을 제공한다.

특히 Analytics, AdSense, Giscus, 쿠키·로컬 스토리지 사용 여부를 실제 구현과 일치시켜야 한다.

---

<!-- source message: 31 -->

## S-55. Template Privacy Policy

### 다른 사이트 정책을 복사

### 문제

실제로 사용하지 않는 서비스가 적혀 있거나 사용 중인 서비스가 누락된다.

### 개선

현재 사이트의 데이터 흐름을 기준으로 작성한다.

---

<!-- source message: 31 -->

## S-56. Missing Content Update Policy

### 글이 언제·왜 수정되는지 불명확

### 개선

간단한 원칙을 공개할 수 있다.

```text
중대한 기술 오류는 즉시 수정
버전 변화는 검증 후 업데이트
역사적 글은 삭제보다 상태 표시
```

---

<!-- source message: 31 -->

## S-57. No Correction History

### 오류가 수정돼도 아무 표시 없음

### 개선

중요한 변경은 짧은 수정 기록을 제공한다.

---

<!-- source message: 31 -->

## S-58. Broken About Page

### About은 있지만 일반적인 자기소개만 있음

### 개선

About 페이지는 사이트와 콘텐츠를 이해하도록 해야 한다.

- 어떤 주제를 다루는가
- 어떤 경험을 기반으로 하는가
- 글을 어떻게 검증하는가
- 독자가 무엇을 기대할 수 있는가

---

<!-- source message: 31 -->

## S-59. Missing Ownership Signal

### 사이트 운영 주체가 보이지 않음

### 개선

푸터·About·저자 페이지에서 일관된 이름과 사이트 정체성을 사용한다.

---

<!-- source message: 31 -->

## S-60. Unclear Affiliate or Sponsorship Disclosure

### 광고·제휴·협찬 여부가 불명확

### 개선

경제적 관계가 있는 글에서는 명확히 공개한다.

---

# G. 광고 배치와 사용자 경험

<!-- source message: 31 -->

## S-61. Ads on Non-Content Pages

### 콘텐츠가 없는 화면에도 광고

예:

- 404
- 검색 결과 없음
- 관리자 화면
- 로그인 화면
- 빈 태그 페이지
- 로딩 화면

AdSense 정책은 게시자 콘텐츠가 없거나 가치가 낮은 화면, 탐색·알림 목적 화면 등에 광고를 게재하지 못하도록 한다. citeturn453314search20

### 개선

페이지 유형별 광고 활성화 정책을 둔다.

---

<!-- source message: 31 -->

## S-62. Ads Before Primary Content

### 본문보다 광고가 먼저 보임

### 문제

사용자가 원하는 정보를 찾기 어렵다.

Google의 광고 배치 모범 사례는 광고를 사용자가 관심 있어 하는 콘텐츠 근처에 두되, 사용자가 찾는 콘텐츠를 쉽게 발견할 수 있게 하라고 권장한다. citeturn453314search45

### 개선

첫 화면에서 문서 제목·목적·핵심 내용이 광고보다 우선하게 한다.

---

<!-- source message: 31 -->

## S-63. Ads Between Explanation and Evidence

### 설명과 코드·표 사이에 광고

```text
이 결과가 발생한 이유는
[광고]
다음 로그에서 볼 수 있다.
```

### 문제

기술 문서의 논리적 흐름이 끊긴다.

### 개선

광고는 다음처럼 내용 경계가 명확한 위치에 둔다.

- 주요 장이 끝난 뒤
- 본문 종료 후
- 관련 글 이전
- 큰 섹션 사이

---

<!-- source message: 31 -->

## S-64. Ads Inside Code Walkthrough

### 코드 설명 중간에 광고 삽입

### 문제

코드와 설명의 대응 관계가 깨진다.

### 개선

코드 블록, 캡션, 설명을 하나의 보호된 콘텐츠 단위로 취급한다.

---

<!-- source message: 31 -->

## S-65. Ads Inside Step-by-Step Procedure

### 단계 중간에 광고

```text
1단계
2단계
광고
3단계
```

### 문제

작업 순서를 놓치기 쉽다.

### 개선

전체 절차가 끝난 뒤 배치한다.

---

<!-- source message: 31 -->

## S-66. Auto Ads Without Exclusion Zones

### 자동 광고가 모든 본문 위치에 삽입될 수 있음

Auto Ads는 사이트를 분석해 광고 위치를 자동 선택하며, 광고 형식과 개수 등을 설정에서 조정할 수 있다. citeturn453314search24turn453314search30

### 개선

기술 글에서는 다음 영역을 광고 제외 대상으로 고려한다.

- 코드와 해설
- 표와 해석
- 다이어그램과 캡션
- 단계별 튜토리얼
- 경고·안전 안내
- 결론 직전

---

<!-- source message: 31 -->

## S-67. Maximum Ad Density

### 가능한 모든 위치에 광고

### 문제

수익 최적화가 콘텐츠 소비를 방해한다.

### 개선

페이지 길이만으로 광고 수를 결정하지 말고 문서 구조와 실제 읽기 경험을 기준으로 한다.

---

<!-- source message: 31 -->

## S-68. Ad-Shaped Navigation

### 메뉴·다운로드 버튼과 광고가 비슷함

### 문제

사용자가 광고를 콘텐츠 탐색 요소로 오인할 수 있다.

### 개선

광고와 사이트 UI의 시각적 역할을 명확히 구분한다.

---

<!-- source message: 31 -->

## S-69. Accidental Click Layout

### 광고가 버튼·코드 복사·페이지 이동 요소에 붙어 있음

### 문제

의도하지 않은 클릭을 유도할 수 있다.

Google 광고 배치 정책은 광고의 부정확한 클릭 유도나 사용자 행동을 방해하는 배치를 제한한다. citeturn453314search5

### 개선

광고 주변에 충분한 공간을 두고 상호작용 요소와 분리한다.

---

<!-- source message: 31 -->

## S-70. Ad-Induced CLS

### 광고가 늦게 삽입되며 본문을 밀어냄

### 개선

- 광고 슬롯 크기 예약
- layout shift 측정
- 모바일별 크기 검증
- 코드·표 위치 변화 방지

---

<!-- source message: 31 -->

## S-71. Sticky Ad Competition

### 헤더·TOC·광고가 모두 고정

### 문제

본문 화면이 좁아지고 특히 모바일에서 읽기가 어렵다.

### 개선

고정 요소의 총 화면 점유율을 제한한다.

---

<!-- source message: 31 -->

## S-72. Auto-Refreshing Ads

### 사용자 요청 없이 광고를 주기적으로 새로고침

AdSense 광고 배치 정책은 사용자가 요청하지 않은 자동 새로고침이나 자동 이동 방식의 광고 게재를 허용하지 않는다. citeturn453314search5

---

<!-- source message: 31 -->

## S-73. Ads on Draft or Preview

### 개발·미리보기 페이지에 실제 광고 코드

### 개선

Production canonical 페이지에만 광고가 활성화되도록 환경을 분리한다.

---

<!-- source message: 31 -->

## S-74. Ads on Superseded Content

### 폐기된 문서에도 같은 광고 밀도

### 문제

사용자가 잘못된 정보를 읽는 동안 광고만 노출될 수 있다.

### 개선

대체 문서로 강하게 안내하고, 내용 가치가 거의 없다면 광고를 비활성화한다.

---

<!-- source message: 31 -->

## S-75. Monetization Before Page Quality

### 승인과 광고 삽입을 먼저 처리

### 개선 순서

```text
콘텐츠 구조
신뢰 페이지
색인 정리
모바일 경험
내부 링크
성능
광고 신청
광고 배치
```

---

# hawk90에서 특히 확인할 15개

| 우선순위 | 안티패턴 | 이유 |
|---:|---|---|
| 1 | Specification Translation Site | 규격·공식 문서 기반 글의 고유 가치 확인 필요 |
| 2 | AI Rewrite Without Added Value | 짧은 기간에 다량 생성된 글의 경험·근거 강화 필요 |
| 3 | Thin Tag Page | 태그가 많으면 얕은 색인 URL이 대량 발생 |
| 4 | Thin Series Page | 시리즈를 단순 목록이 아닌 학습 허브로 바꿔야 함 |
| 5 | Topic Cannibalization | CXL·PCIe·Bootloader 유사 글끼리 경쟁 가능 |
| 6 | Old and New Article Competition | 글이 많아 구판·신판이 공존할 가능성이 큼 |
| 7 | Duplicate Meta Description | 대량 콘텐츠에서 자동 설명 중복 가능 |
| 8 | Indexing Everything by Default | 태그·검색·관리·빈 페이지 색인 감사 필요 |
| 9 | Orphan Canonical Content | 좋은 과거 글의 내부 링크 부족 가능 |
| 10 | Experience-Free Expertise | 실제 업무·실험 기반 흔적이 차별화 핵심 |
| 11 | Broken About Page | 일반 자기소개보다 전문 분야와 작성 원칙 필요 |
| 12 | Missing Privacy Policy | AdSense·Analytics·Giscus 사용 시 중요 |
| 13 | Ads Between Explanation and Evidence | 기술 문서의 논리 흐름을 가장 크게 훼손 |
| 14 | Auto Ads Without Exclusion Zones | 코드·표·다이어그램 사이 광고 방지 필요 |
| 15 | Ad-Induced CLS | 긴 기술 글의 읽기 경험과 성능에 영향 |

---

# AdSense “콘텐츠 가치 부족” 대응 순서

## 1단계: 색인 대상 감사

다음 URL 수를 집계한다.

```text
일반 글
Topic
Series
Tag
Archive
Pagination
Search
Admin
Draft
Redirect
404
```

그리고 각 유형을 다음처럼 분류한다.

```text
Index
Noindex
Exclude from build
Redirect
```

---

## 2단계: 대표 글 20개 가치 강화

각 글에 다음을 보완한다.

```text
작성 목적
직접 경험
테스트 환경
근거와 출처
작성자의 해석
적용 한계
관련 글
수정·검증일
```

---

## 3단계: 중복 콘텐츠 정리

- 유사 제목
- 같은 검색 의도
- 동일한 서론
- 구판과 신판
- 너무 짧게 분리된 시리즈

를 통합하거나 역할을 구분한다.

---

## 4단계: 허브 페이지 강화

단순 카드 목록 대신:

```text
분야 설명
학습 지도
대표 Guide
Debug Note
Experiment
Reference
```

를 제공한다.

---

## 5단계: 신뢰 페이지 점검

최소한 다음은 실제 내용과 일치해야 한다.

```text
About
Contact
Privacy Policy
작성·검증 원칙
오류 제보 경로
```

---

## 6단계: 광고 없는 상태로 품질 확인

승인 전에는 광고 위치보다 다음을 먼저 확인한다.

- 모바일에서 쉽게 읽히는가
- 검색과 내비게이션이 정상인가
- 빈 페이지가 없는가
- 깨진 링크가 없는가
- 핵심 페이지가 색인 가능한가
- Draft가 노출되지 않는가

---

# 이번 단계의 핵심 결론

`hawk90.github.io`에서 AdSense 대응을 위해 가장 피해야 할 오해는 이것이다.

> “콘텐츠 가치 부족이니 새 글을 더 많이 써야 한다.”

실제로는 다음이 더 중요할 가능성이 크다.

```text
기존 글의 고유 가치 증명
중복·구판 정리
얕은 목록 페이지 관리
대표 Topic Hub 구축
작성자와 검증 정보 강화
색인 대상 명확화
```

특히 네 사이트는 이미 글의 양이 부족한 단계가 아니다. 따라서 신규 글 100개를 추가하는 것보다 **핵심 글 20개와 대표 허브 5개를 강하게 만드는 작업**이 사이트 인식과 실제 독자 경험에 더 큰 영향을 줄 가능성이 높다.

<!-- source message: 32 -->

## U-01. Design Before Reading

### 읽기보다 디자인이 앞섬

홈과 글 페이지의 시각적 인상이 강하지만, 본문을 읽는 데 직접 도움이 되지 않는다.

### 증상

- 큰 Hero
- 배경 애니메이션
- 그라데이션
- glass effect
- 과도한 shadow
- 콘텐츠보다 UI 장식이 먼저 보임

### 문제

기술 블로그의 핵심 작업은 감상이 아니라 **정확한 정보를 읽고 다시 찾는 것**이다.

### 개선

장식 요소는 다음 질문을 통과해야 한다.

> 독자가 글의 위치·구조·중요도를 이해하는 데 기여하는가?

그렇지 않으면 줄인다.

---

<!-- source message: 32 -->

## U-02. Portfolio–Knowledge Base Confusion

### 포트폴리오와 지식베이스 UI 혼합

홈은 개인 포트폴리오처럼 구성되고, 내부는 기술 백과사전처럼 구성된다.

### 증상

- 홈은 자기소개와 경력 중심
- 글 페이지는 문서 사이트
- 내비게이션 목적이 페이지마다 달라짐
- 방문자가 사이트의 주목적을 헷갈림

### 개선

홈에서도 지식베이스 정체성을 우선한다.

```text
사이트 목적
핵심 분야
시작 경로
대표 문서
작성자
```

순서가 적합하다.

---

<!-- source message: 32 -->

## U-03. Hero Dominance

### Hero 영역이 첫 화면을 독점

### 문제

첫 화면에서 실제 콘텐츠와 전문 분야가 보이지 않는다.

### 개선

Hero를 짧게 유지하고 첫 화면 안에 최소한 하나를 보여준다.

- 핵심 Topic
- Start Here
- Featured Guide
- 최근 업데이트

---

<!-- source message: 32 -->

## U-04. Latest Card Wall

### 카드가 계속 반복되는 홈

```text
카드
카드
카드
카드
```

### 문제

글의 중요도와 역할이 모두 같아 보인다.

### 개선

다음처럼 표현을 구분한다.

```text
Featured Guide
Topic Entry
Recently Updated
Latest Article
```

모든 콘텐츠를 동일한 카드 컴포넌트로 표현하지 않는다.

---

<!-- source message: 32 -->

## U-05. Card Metadata Overload

### 카드에 정보가 너무 많음

- 제목
- 설명
- 태그 5개
- 날짜
- 수정일
- 읽기 시간
- 난이도
- 시리즈
- 콘텐츠 유형
- 상태

### 문제

사용자는 실제 제목을 찾기 어려워진다.

### 개선

목록 문맥에 필요한 정보만 표시한다.

#### 홈

```text
제목
짧은 설명
Topic
```

#### 검색 결과

```text
제목
콘텐츠 유형
일치한 문맥
수정일
```

#### 시리즈

```text
순서
제목
학습 역할
```

---

<!-- source message: 32 -->

## U-06. Badge Confetti

### 배지가 화면을 뒤덮음

```text
C++
Advanced
Updated
Guide
Linux
Performance
12 min
```

### 문제

모든 정보가 강조되므로 실제로는 아무것도 강조되지 않는다.

### 개선

한 카드에서 시각적 배지는 최대 1~2종류만 사용한다. 나머지는 일반 텍스트로 처리한다.

---

<!-- source message: 32 -->

## U-07. Everything Is a Card

### 모든 요소를 카드로 만듦

- 글
- Topic
- 저자
- 통계
- 시리즈
- 태그
- 공지

### 문제

정보 계층이 평평해진다.

### 개선

카드는 독립적인 선택 단위에만 사용한다.

단순 정보와 연속 목록은 선, 여백, 타이포그래피만으로도 충분하다.

---

<!-- source message: 32 -->

## U-08. Visual Hierarchy Flattening

### 모든 제목과 블록이 비슷하게 강조됨

### 증상

- H2와 카드 제목이 비슷함
- callout과 일반 본문 차이가 약함
- 중요한 결론이 다른 문단과 같음

### 개선

각 수준의 역할을 명확히 한다.

```text
페이지 제목
주요 장
하위 절
본문
보조 metadata
```

크기뿐 아니라 여백과 위치로 계층을 표현한다.

---

# 타이포그래피와 읽기

<!-- source message: 32 -->

## U-09. Full-Width Prose

### 본문이 화면 전체 폭을 사용

### 문제

긴 문장을 읽을 때 시선 이동이 커지고 다음 줄로 복귀하기 어렵다.

### 개선

본문 폭은 적절하게 제한하고, 코드·표·다이어그램만 필요할 때 넓게 확장한다.

---

<!-- source message: 32 -->

## U-10. Over-Narrow Technical Prose

### 본문 폭이 지나치게 좁음

일반 산문에는 괜찮지만 긴 용어와 inline code가 많은 기술 글에서는 줄바꿈이 과도해진다.

### 문제

```text
std::hardware_destructive_
interference_size
```

같은 표현이 빈번하게 깨진다.

### 개선

기술 문서에서는 일반 에세이보다 약간 넓은 본문 폭을 허용한다.

---

<!-- source message: 32 -->

## U-11. Tiny Body Text

### 데스크톱 화면 기준으로 본문 글자가 작음

### 문제

장문 글의 피로가 빠르게 증가한다.

### 개선

본문은 시각적 밀도보다 장시간 독서를 기준으로 설정한다.

---

<!-- source message: 32 -->

## U-12. Oversized Heading Cascade

### 제목이 지나치게 큼

H1·H2가 본문 흐름을 반복적으로 끊는다.

### 문제

긴 기술 글에서 화면 대부분이 heading으로 채워진다.

### 개선

문서 페이지의 heading은 마케팅 페이지보다 절제한다.

---

<!-- source message: 32 -->

## U-13. Weak Paragraph Separation

### 문단 구분이 약함

긴 기술 설명이 거대한 텍스트 덩어리로 보인다.

### 개선

- 문단 길이 제한
- 적절한 행간
- 섹션 여백
- 핵심 문장 분리

를 사용한다.

---

<!-- source message: 32 -->

## U-14. Excessive Paragraph Fragmentation

### 모든 문장을 별도 문단으로 작성

### 증상

```text
이것은 문제다.

왜냐하면 그렇다.

따라서 바꿔야 한다.
```

### 문제

모바일 메시지 같은 리듬이 되어 논리적 연결이 약해진다.

### 개선

같은 논리 단위는 하나의 문단으로 묶는다.

---

<!-- source message: 32 -->

## U-15. Decorative Font for Technical Content

### 장식적인 폰트를 본문이나 제목에 사용

### 문제

약어·숫자·코드가 많은 기술 문서에서 판독성이 떨어진다.

### 개선

브랜드 폰트는 Hero나 로고에 제한하고, 본문은 중립적이고 안정적인 글꼴을 사용한다.

---

<!-- source message: 32 -->

## U-16. Too Many Font Families

### 본문·제목·코드·UI에 모두 다른 폰트

### 문제

시각적 통일성과 로딩 성능이 모두 나빠진다.

### 개선

```text
본문/UI 폰트 1개
코드 폰트 1개
```

정도로 제한한다.

---

<!-- source message: 32 -->

## U-17. Weight Inflation

### 다양한 굵기를 너무 많이 사용

```text
300, 400, 500, 600, 700, 800
```

### 문제

폰트 로딩과 시각적 일관성이 나빠진다.

### 개선

실제로 의미가 다른 2~3단계만 사용한다.

---

<!-- source message: 32 -->

## U-18. Inline Code Noise

### 모든 기술 용어를 inline code로 표시

```text
`PCIe`, `Linux`, `CXL`, `driver`, `memory`
```

### 문제

문장 전체가 회색 박스처럼 보이고 읽는 리듬이 깨진다.

### 개선

inline code는 다음에 사용한다.

- 실제 identifier
- 명령
- 경로
- literal
- 타입·함수명

일반 기술명은 보통 텍스트로 쓴다.

---

<!-- source message: 32 -->

## U-19. Low-Contrast Metadata

### 날짜·태그·설명이 너무 연함

### 문제

디자인상 세련돼 보이지만 실제로 읽기 어렵다.

### 개선

보조 정보라도 접근 가능한 대비를 유지한다.

---

<!-- source message: 32 -->

## U-20. Pure Black Dark Mode

### 완전한 검정 배경과 강한 흰색 본문

### 문제

긴 글에서 눈부심과 대비 피로가 커질 수 있다.

### 개선

다크모드에서도 배경·본문·보조 텍스트 사이에 단계적인 톤을 사용한다.

---

# 코드 블록

<!-- source message: 32 -->

## U-21. Code Block as a Black Box

### 코드 블록이 본문에서 지나치게 강한 시각 요소

### 문제

코드가 설명보다 더 중요해 보이며 긴 글의 흐름을 분절한다.

### 개선

코드 블록의 배경·테두리·제목을 절제하고, 핵심 부분만 포함한다.

---

<!-- source message: 32 -->

## U-22. Always-On Line Numbers

### 한두 줄 코드에도 줄 번호 표시

### 문제

시각적 노이즈와 DOM이 증가한다.

### 개선

긴 코드 또는 본문에서 특정 줄을 참조할 때만 사용한다.

---

<!-- source message: 32 -->

## U-23. Unclear Code Language

### 코드 블록의 언어·파일명이 보이지 않음

### 문제

C와 C++, shell 입력과 출력, 의사코드를 구분하기 어렵다.

### 개선

필요한 경우 다음을 표시한다.

```text
driver.cpp
C++
```

단순 코드에는 과한 헤더를 붙이지 않는다.

---

<!-- source message: 32 -->

## U-24. Copy Button Everywhere

### 한 줄 출력이나 로그에도 복사 버튼

### 문제

버튼이 반복되고 실제 코드 내용보다 UI가 더 눈에 띈다.

### 개선

사용자가 실제로 실행하거나 재사용할 코드에만 제공한다.

---

<!-- source message: 32 -->

## U-25. Copy Button Covers Code

### 모바일에서 복사 버튼이 첫 줄 코드를 가림

### 개선

버튼 공간을 미리 확보하거나 코드 헤더 영역에 배치한다.

---

<!-- source message: 32 -->

## U-26. Horizontal Scroll Ambiguity

### 코드 블록이 가로 스크롤 가능하지만 표시가 없음

### 문제

오른쪽에 더 많은 코드가 있다는 사실을 모른다.

### 개선

스크롤 가능성을 자연스럽게 드러내고, 모바일에서 scrollbar가 완전히 숨지 않도록 한다.

---

<!-- source message: 32 -->

## U-27. Forced Code Wrapping

### 긴 코드를 자동 줄바꿈

### 문제

- indentation 파괴
- 로그 행 분리
- 문자열 의미 혼동
- 복사 시 원문과 달라 보임

### 개선

기본은 가로 스크롤로 두고, 독자가 선택적으로 wrap을 켤 수 있게 한다.

---

<!-- source message: 32 -->

## U-28. No Wrap Option

### 모바일에서 긴 코드가 계속 가로 스크롤만 요구됨

### 개선

코드 성격에 따라 wrap 토글을 제공할 수 있다.

- 소스코드: nowrap
- 로그·출력: wrap 선택 가능

---

<!-- source message: 32 -->

## U-29. Syntax Color Overload

### 토큰마다 강한 색 사용

### 문제

코드 구조보다 색상이 먼저 보이며 다크·라이트 테마 간 의미가 달라진다.

### 개선

적은 수의 명확한 색상과 충분한 대비를 사용한다.

---

<!-- source message: 32 -->

## U-30. Theme Switching as a Primary Feature

### 코드 테마 선택지가 너무 많음

### 문제

대부분의 독자는 글을 읽기 위해 왔으며, 테마 선택은 부차적인 기능이다.

### 개선

안정적인 light/dark 기본 테마를 제공하고 선택지는 최소화한다.

---

<!-- source message: 32 -->

## U-31. Highlighted Lines Without Explanation

### 일부 줄을 강조하지만 이유가 없음

### 개선

본문에서 해당 줄이 왜 중요한지 명시적으로 설명한다.

---

<!-- source message: 32 -->

## U-32. Long Code Without Navigation

### 수백 줄 코드가 하나의 블록

### 개선

- 핵심 구간 분할
- 생략 표시
- 함수별 설명
- 전체 소스 링크

를 사용한다.

---

<!-- source message: 32 -->

## U-33. Code and Explanation Distance

### 코드와 설명이 멀리 떨어짐

### 문제

독자가 앞뒤로 계속 스크롤해야 한다.

### 개선

코드 일부 바로 아래에 설명을 배치하고, 큰 결론은 블록 뒤에 정리한다.

---

# 표와 다이어그램

<!-- source message: 32 -->

## U-34. Desktop-Only Table

### 넓은 표가 모바일 레이아웃을 깨뜨림

### 개선

다음 중 상황에 맞는 방식을 사용한다.

- 가로 스크롤
- 핵심 열 우선
- 카드형 변환
- 표 분할
- 요약표와 상세표 분리

---

<!-- source message: 32 -->

## U-35. Hidden Horizontal Table Scroll

### 표의 오른쪽 열이 잘렸지만 스크롤 가능 여부가 보이지 않음

### 개선

스크롤 영역의 경계를 분명하게 표현한다.

---

<!-- source message: 32 -->

## U-36. Table as Paragraph Replacement

### 모든 비교를 표로 작성

### 문제

복잡한 인과관계와 예외가 셀 안에 갇힌다.

### 개선

표는 비교와 조회에 사용하고, 해석은 표 아래 문장으로 제공한다.

---

<!-- source message: 32 -->

## U-37. Giant Comparison Table

### 열과 행이 너무 많아 비교가 불가능

### 개선

- 핵심 기준 표
- 상세 기준 표
- 결론

으로 나눈다.

---

<!-- source message: 32 -->

## U-38. Unresponsive Diagram

### 큰 SVG나 PNG가 모바일에서 축소되어 읽을 수 없음

### 개선

- 확대 기능
- 영역별 분리
- 모바일용 대체 도식
- 텍스트 설명

을 제공한다.

---

<!-- source message: 32 -->

## U-39. Zoom Without Pan Clarity

### 이미지는 확대되지만 이동 방법이 불명확

### 개선

일관된 확대·이동 동작과 닫기 방법을 제공한다.

---

<!-- source message: 32 -->

## U-40. Color-Only Diagram Semantics

### 선이나 상태를 색상만으로 구분

### 문제

색각 이상과 흑백 출력에서 의미가 사라진다.

### 개선

색상과 함께 다음을 사용한다.

- 선 종류
- 아이콘
- 라벨
- 패턴
- 모양

---

<!-- source message: 32 -->

## U-41. Diagram–Text Mismatch

### 그림 명칭과 본문 용어가 다름

### 문제

같은 컴포넌트인지 독자가 다시 해석해야 한다.

### 개선

용어·색·약어를 글 전체에서 일관되게 사용한다.

---

<!-- source message: 32 -->

## U-42. Screenshot Text Too Small

### 데스크톱 전체 화면 캡처를 본문 폭으로 축소

### 문제

로그와 UI 글자가 읽히지 않는다.

### 개선

필요 영역을 crop하고 핵심 부분을 별도 확대한다.

---

<!-- source message: 32 -->

## U-43. Diagram Without Accessible Alternative

### 그림에 중요한 정보가 있지만 대체 설명 없음

### 개선

alt에 모든 내용을 억지로 넣기보다 본문에서 그림의 구조와 핵심 결론을 설명한다.

---

# 목차와 장문 문서

<!-- source message: 32 -->

## U-44. TOC as a Mirror

### 모든 heading을 그대로 복제한 목차

### 문제

목차가 너무 길고 현재 구조를 이해하는 데 도움이 되지 않는다.

### 개선

핵심 H2와 중요한 H3만 표시한다.

---

<!-- source message: 32 -->

## U-45. Sticky TOC Without Current Context

### 목차는 고정되어 있지만 현재 섹션 표시가 약함

### 개선

현재 위치를 명확하게 표시하고, 너무 빠르게 highlight가 흔들리지 않게 한다.

---

<!-- source message: 32 -->

## U-46. Aggressive Scroll Spy

### 작은 스크롤에도 active heading이 계속 변경

### 문제

목차가 깜박이며 주의를 빼앗는다.

### 개선

일정한 관찰 영역과 안정적인 전환 기준을 사용한다.

---

<!-- source message: 32 -->

## U-47. TOC Covers Content

### 작은 화면에서 TOC 패널이 본문을 가림

### 개선

모바일에서는 별도 drawer나 접힌 요약으로 제공한다.

---

<!-- source message: 32 -->

## U-48. No Reading Progress Context

### 긴 글에서 현재 어느 정도 읽었는지 알 수 없음

### 개선

단순 진행률보다 다음 정보가 더 유용할 수 있다.

```text
현재 섹션
전체 주요 섹션
다음 섹션
```

진행 바는 보조적으로 사용한다.

---

<!-- source message: 32 -->

## U-49. Misleading Reading Time

### 코드·표·다이어그램이 많은 글에 일반 글자 수 공식 적용

### 문제

“8분”이라고 표시됐지만 실제로는 30분이 걸릴 수 있다.

### 개선

읽기 시간을 절대값처럼 강조하지 않거나, 기술 콘텐츠 특성에 맞게 조정한다.

---

<!-- source message: 32 -->

## U-50. Zen Mode Hides Necessary Context

### 집중 모드가 Breadcrumb·시리즈·상태까지 제거

### 문제

본문에 집중할 수 있지만 글의 위치와 신뢰 정보가 사라진다.

### 개선

집중 모드는 장식과 보조 UI만 숨기고 중요한 문서 metadata는 유지한다.

---

<!-- source message: 32 -->

## U-51. No Section Permalink

### 특정 부분을 공유하기 어려움

### 개선

heading anchor를 제공하되 아이콘이 항상 시끄럽게 보이지 않도록 한다.

---

<!-- source message: 32 -->

## U-52. Anchor Scroll Under Header

### heading 링크로 이동하면 고정 헤더 아래에 제목이 가려짐

### 개선

`scroll-margin-top` 등으로 여유를 둔다.

---

<!-- source message: 32 -->

## U-53. Back-to-Top as a Substitute

### 긴 글 탐색을 “맨 위로” 버튼 하나로 해결

### 문제

사용자는 상단이 아니라 상위 장이나 Topic Hub로 이동하고 싶을 수 있다.

### 개선

목차, 섹션 이동, 다음 글 링크를 함께 제공한다.

---

# 모바일 UX

<!-- source message: 32 -->

## U-54. Desktop Shrunk to Mobile

### 데스크톱 레이아웃을 단순 축소

### 문제

- 카드가 너무 길어짐
- metadata 줄바꿈
- 코드 버튼 겹침
- 표·TOC 불편
- sticky 요소 과밀

### 개선

모바일에서는 정보 우선순위를 다시 정한다.

---

<!-- source message: 32 -->

## U-55. Mobile Header Overload

### 로고·검색·테마·메뉴·프로필을 모두 표시

### 문제

본문 시작 전에 헤더가 많은 공간을 차지한다.

### 개선

모바일 헤더에는 핵심 동작 2~3개만 남긴다.

---

<!-- source message: 32 -->

## U-56. Tiny Touch Targets

### heading anchor·복사·메뉴 버튼이 작음

### 문제

정확한 터치가 어렵다.

### 개선

시각적 아이콘은 작아도 실제 클릭 영역은 충분히 확보한다.

---

<!-- source message: 32 -->

## U-57. Hover-Only Interaction

### hover 해야만 설명·링크·버튼이 보임

### 문제

터치 기기와 키보드 사용자는 기능을 발견하지 못한다.

### 개선

hover는 추가 피드백으로만 사용하고 기능 자체는 항상 접근 가능하게 한다.

---

<!-- source message: 32 -->

## U-58. Swipe Conflict

### 이미지 확대·코드 스크롤·페이지 내비게이션이 모두 swipe 사용

### 문제

사용자 의도와 다른 동작이 발생한다.

### 개선

수평 제스처의 역할을 제한한다.

---

<!-- source message: 32 -->

## U-59. Sticky Footer or Ad on Small Screen

### 작은 화면 하단을 고정 UI가 계속 차지

### 문제

본문 가시 영역이 크게 줄어든다.

### 개선

닫을 수 있게 하고 화면 점유율을 엄격히 제한한다.

---

<!-- source message: 32 -->

## U-60. Mobile Search Modal as Desktop Dialog

### 작은 화면에서 중앙 modal 사용

### 문제

키보드가 올라오면 결과 영역이 거의 사라진다.

### 개선

모바일에서는 전체 화면 검색 화면이 더 적합할 수 있다.

---

# 상호작용과 상태

<!-- source message: 32 -->

## U-61. Interaction Without Feedback

### 버튼을 눌러도 상태 변화가 불명확

예:

- 코드 복사
- 검색 로딩
- 테마 변경
- 댓글 로딩

### 개선

짧고 명확한 상태 피드백을 제공한다.

---

<!-- source message: 32 -->

## U-62. Toast Spam

### 작은 행동마다 toast 표시

### 문제

읽기 흐름을 방해한다.

### 개선

복사 성공처럼 일시적 행동은 버튼 상태 변화만으로 충분할 수 있다.

---

<!-- source message: 32 -->

## U-63. Animation as Confirmation

### 애니메이션이 유일한 상태 표시

### 문제

모션을 줄인 사용자나 화면 낭독기에는 전달되지 않는다.

### 개선

텍스트·ARIA 상태와 함께 사용한다.

---

<!-- source message: 32 -->

## U-64. Page Transition Disorientation

### 이동은 부드럽지만 새 페이지가 시작됐다는 인지가 약함

### 문제

제목 morph나 화면 유지 때문에 현재 위치를 놓칠 수 있다.

### 개선

페이지 제목·focus·scroll 위치를 명확히 갱신한다.

---

<!-- source message: 32 -->

## U-65. Broken Back Navigation

### SPA 전환 후 뒤로 가기 위치가 이상함

### 문제

장문 글과 검색 결과 사이를 오갈 때 큰 불편을 만든다.

### 개선

검색 상태와 스크롤 복원을 검증한다.

---

<!-- source message: 32 -->

## U-66. Modal Focus Escape

### 검색 modal이 열렸는데 Tab이 뒤 페이지로 이동

### 개선

focus trap, 초기 focus, Escape 종료, 종료 후 focus 복귀를 지원한다.

---

<!-- source message: 32 -->

## U-67. Escape Key Inconsistency

### 어떤 modal은 Escape로 닫히고 다른 것은 안 닫힘

### 개선

사이트 전체 상호작용 규칙을 일관되게 만든다.

---

<!-- source message: 32 -->

## U-68. Hidden State Persistence

### 검색어·필터·테마가 예상치 못하게 유지됨

### 문제

사용자는 왜 이전 상태가 나타나는지 이해하지 못한다.

### 개선

유지할 상태와 페이지 이동 시 초기화할 상태를 명시적으로 구분한다.

---

<!-- source message: 32 -->

## U-69. No Loading Strategy

### 검색·댓글·대형 이미지가 로드되는 동안 빈 공간

### 개선

필요한 곳에만 skeleton이나 간단한 상태 문구를 사용한다.

---

<!-- source message: 32 -->

## U-70. Skeleton for Instant Content

### 거의 즉시 뜨는 정적 콘텐츠에도 skeleton

### 문제

오히려 화면 깜박임과 복잡성이 증가한다.

### 개선

실제 지연이 있는 콘텐츠에만 사용한다.

---

# 접근성

<!-- source message: 32 -->

## U-71. Div-Based Links

### 클릭 가능한 카드가 `<div>` 이벤트로 구현

### 문제

- 키보드 접근 불가
- 새 탭 열기 불가
- 링크 의미 전달 불가

### 개선

실제 이동은 `<a href>`를 사용한다.

---

<!-- source message: 32 -->

## U-72. Button–Link Confusion

### 이동 동작을 버튼으로, 상태 동작을 링크로 구현

### 개선

```text
페이지 이동 → link
현재 페이지 상태 변경 → button
```

원칙을 지킨다.

---

<!-- source message: 32 -->

## U-73. Missing Focus Indicator

### 키보드로 이동해도 현재 요소가 보이지 않음

### 개선

브랜드 디자인과 어울리는 명확한 focus style을 제공한다.

---

<!-- source message: 32 -->

## U-74. Focus Style Removed for Aesthetics

### `outline: none`만 사용

### 문제

키보드 사용자가 현재 위치를 알 수 없다.

### 개선

기본 outline을 제거한다면 더 나은 대체 표시를 반드시 제공한다.

---

<!-- source message: 32 -->

## U-75. Incorrect Heading Hierarchy

### 시각적 크기 때문에 heading level을 선택

### 문제

화면 낭독기와 문서 구조가 왜곡된다.

### 개선

논리적 계층을 기준으로 heading을 사용하고 스타일은 CSS로 제어한다.

---

<!-- source message: 32 -->

## U-76. Skipped Heading Levels

```text
H1 → H3 → H5
```

### 문제

문서 구조를 탐색하기 어렵다.

### 개선

필요한 의미 구조를 순차적으로 설계한다.

---

<!-- source message: 32 -->

## U-77. Empty Link Label

### 아이콘만 있는 링크에 accessible name 없음

예:

- GitHub 아이콘
- heading link
- 공유 버튼

### 개선

`aria-label` 또는 가시 텍스트를 제공한다.

---

<!-- source message: 32 -->

## U-78. Redundant ARIA

### native HTML로 해결할 수 있는데 ARIA를 과도하게 사용

### 문제

잘못된 role과 상태가 오히려 접근성을 해친다.

### 개선

먼저 semantic HTML을 사용하고 부족한 부분만 ARIA로 보완한다.

---

<!-- source message: 32 -->

## U-79. Dark Mode Contrast Failure

### 라이트모드는 괜찮지만 다크모드의 링크·코드·보조 텍스트 대비가 낮음

### 개선

두 테마를 각각 독립적으로 검사한다.

---

<!-- source message: 32 -->

## U-80. Color-Only Link Identification

### 본문 링크가 색상 차이만 있음

### 문제

색 구분이 어려운 사용자가 링크를 인지하기 어렵다.

### 개선

밑줄이나 다른 비색상 단서를 함께 사용한다.

---

<!-- source message: 32 -->

## U-81. Reduced Motion Ignored

### 페이지 전환·제목 morph·smooth scroll을 항상 실행

### 개선

`prefers-reduced-motion`을 존중한다.

---

<!-- source message: 32 -->

## U-82. Auto-Focus Surprise

### 페이지 이동 후 검색창이나 다른 UI에 자동 focus

### 문제

화면 낭독기와 키보드 사용 흐름을 방해한다.

### 개선

사용자가 명시적으로 기능을 열었을 때만 focus를 이동한다.

---

<!-- source message: 32 -->

## U-83. Keyboard-Inaccessible Code Controls

### 복사·wrap·확대 버튼이 키보드로 접근되지 않음

### 개선

실제 button 요소와 명확한 label을 사용한다.

---

<!-- source message: 32 -->

## U-84. No Skip Link

### 매 페이지마다 긴 헤더·사이드바를 지나야 본문에 도달

### 개선

“본문으로 건너뛰기” 링크를 제공한다.

---

<!-- source message: 32 -->

## U-85. Language Not Declared

### 문서 언어가 HTML에 지정되지 않음

### 문제

화면 낭독기의 발음과 자동 번역이 부정확해진다.

### 개선

페이지의 주요 언어를 정확히 지정한다.

---

<!-- source message: 32 -->

## U-86. Mixed-Language Pronunciation Failure

### 한글 글에 영문 약어가 많지만 읽기 지원이 부족

### 개선

필요한 경우 약어의 풀네임을 첫 등장에 제공한다. 모든 용어에 별도 언어 속성을 붙이는 과도한 작업은 피한다.

---

<!-- source message: 32 -->

## U-87. Alt Text as Filename

```text
image-2026-07-19.png
```

### 문제

이미지의 의미를 설명하지 못한다.

### 개선

이미지의 목적에 맞게 작성한다.

장식 이미지는 빈 alt를 사용한다.

---

<!-- source message: 32 -->

## U-88. Alt Text as Full Diagram Dump

### 복잡한 다이어그램 전체를 alt 한 문장에 억지로 넣음

### 문제

지나치게 길고 이해하기 어렵다.

### 개선

alt에는 그림의 목적을 간단히 쓰고, 상세 구조는 본문에서 설명한다.

---

<!-- source message: 32 -->

## U-89. Inaccessible Tables

### header cell과 scope가 없는 표

### 문제

행과 열의 관계를 이해하기 어렵다.

### 개선

semantic table markup과 명확한 caption을 사용한다.

---

<!-- source message: 32 -->

## U-90. Visual Order–DOM Order Mismatch

### CSS grid로 화면 순서를 바꿨지만 DOM 순서는 다름

### 문제

키보드·화면 낭독기 순서와 시각적 순서가 일치하지 않는다.

### 개선

DOM 자체를 의미 있는 순서로 작성한다.

---

# 콘텐츠 신뢰 UX

<!-- source message: 32 -->

## U-91. Hidden Publication Status

### 오래된 글인지 최신 글인지 바로 알 수 없음

### 개선

글 상단에서 다음을 명확히 보여준다.

```text
Last updated
Last verified
Current / Historical / Superseded
```

---

<!-- source message: 32 -->

## U-92. Metadata Wall Before Content

### 본문 전에 metadata가 너무 많이 나옴

```text
작성자
날짜
수정일
검증일
태그
시리즈
난이도
읽기 시간
환경
상태
```

### 문제

실제 글이 늦게 시작된다.

### 개선

핵심 metadata만 상단에 두고 상세 환경은 접거나 별도 섹션으로 둔다.

---

<!-- source message: 32 -->

## U-93. Warning Banner Fatigue

### 모든 글에 여러 배너가 있음

- 오래된 글
- AI 사용
- 광고 안내
- 쿠키
- 시리즈
- 검증 환경

### 문제

중요한 경고도 무시하게 된다.

### 개선

상태 정보를 하나의 compact document status 영역으로 합친다.

---

<!-- source message: 32 -->

## U-94. Citation Link Clutter

### 문장마다 긴 외부 링크 아이콘이 붙음

### 개선

인용 표시는 절제하고 참고문헌 접근은 명확하게 유지한다.

---

<!-- source message: 32 -->

## U-95. External Link Surprise

### 외부 링크가 새 탭으로 열리는지, PDF인지 구분되지 않음

### 개선

특수한 경우에만 파일 형식이나 외부 이동을 표시한다. 모든 외부 링크에 아이콘을 붙여 시끄럽게 만들 필요는 없다.

---

<!-- source message: 32 -->

## U-96. No Error Reporting Path

### 기술 오류를 발견해도 제보 방법이 본문 가까이에 없음

### 개선

글 하단에 작은 수정 제안 링크를 둔다.

```text
오류 제보
GitHub에서 수정 제안
```

---

<!-- source message: 32 -->

## U-97. Comment Section as Support Desk

### 모든 질문을 댓글로 받지만 검색·정리되지 않음

### 문제

중요한 정정과 추가 설명이 댓글에 묻힌다.

### 개선

반복되는 질문은 본문이나 FAQ로 승격한다.

---

<!-- source message: 32 -->

## U-98. Comment Dominance

### 댓글 UI가 관련 글과 결론보다 먼저 나옴

### 개선

본문 결론과 다음 학습 경로를 먼저 보여주고 댓글은 그 이후에 둔다.

---

# 인쇄와 공유

<!-- source message: 32 -->

## U-99. Print as Screenshot

### 브라우저 화면을 그대로 인쇄

### 문제

헤더·광고·버튼·사이드바가 함께 출력된다.

### 개선

인쇄 스타일에서 다음을 제거한다.

- 내비게이션
- 댓글
- 광고
- 상호작용 버튼
- sticky UI

그리고 URL·제목·작성일·본문을 유지한다.

---

<!-- source message: 32 -->

## U-100. Printed Code Clipping

### 긴 코드가 인쇄 페이지 밖으로 잘림

### 개선

인쇄 시 wrap 정책과 글꼴 크기를 별도로 관리한다.

---

<!-- source message: 32 -->

## U-101. Dark Background Printing

### 다크모드 상태가 인쇄에도 반영

### 개선

인쇄는 밝은 배경과 높은 대비를 기본으로 한다.

---

<!-- source message: 32 -->

## U-102. Shared Link Without Section Context

### 특정 heading URL을 공유해도 페이지에서 위치가 명확하지 않음

### 개선

anchor 이동 후 heading에 일시적인 focus 또는 highlight를 줄 수 있다. 과도한 애니메이션은 피한다.

---

<!-- source message: 32 -->

## U-103. Social Share Button Wall

### 여러 SNS 버튼이 글마다 반복

### 문제

기술 독자에게 가치가 낮고 외부 스크립트가 늘어날 수 있다.

### 개선

기본은 링크 복사 하나로 충분하다.

---

# hawk90에서 먼저 확인할 UI/UX 15개

| 우선순위 | 안티패턴 | 이유 |
|---:|---|---|
| 1 | Latest Card Wall | 홈이 글 목록 중심이면 정보 계층이 약해짐 |
| 2 | Card Metadata Overload | 글 유형·상태 추가 시 카드가 복잡해질 위험 |
| 3 | Full-Width 또는 Over-Narrow Prose | 장문·코드 중심 글의 핵심 읽기 품질 |
| 4 | Inline Code Noise | 기술 용어가 많은 글에서 시각적 피로 가능 |
| 5 | TOC as a Mirror | 긴 기술 글에서 목차가 과도해질 가능성 |
| 6 | Mobile Navigation Collapse | Topic·검색·시리즈가 늘면 모바일 복잡성 증가 |
| 7 | Code and Explanation Distance | 코드 분석 글의 이해도에 직접 영향 |
| 8 | Forced Code Wrapping | C++·CUDA·로그 가독성 훼손 가능 |
| 9 | Desktop-Only Table | 비교표와 레지스터 표가 모바일에서 취약 |
| 10 | Unresponsive Diagram | CXL·PCIe 구조도가 작은 화면에서 읽기 어려움 |
| 11 | Page Transition Disorientation | ClientRouter 사용 시 focus·scroll 검증 필요 |
| 12 | Missing Focus Indicator | 검색·modal·코드 버튼 접근성 핵심 |
| 13 | Reduced Motion Ignored | morph·transition 기능이 있는 사이트에서 중요 |
| 14 | Metadata Wall Before Content | 상태·유형·검증 정보 추가 시 발생 가능 |
| 15 | Comment Dominance | 지식 탐색보다 댓글이 먼저 보이지 않도록 해야 함 |

# 이번 단계의 핵심 결론

기술 블로그 UX의 가장 흔한 오해는 이것이다.

> 기능이 많고 예쁘면 사용자 경험이 좋아진다.

실제로는 다음이 더 중요하다.

```text
읽기 폭
글자 크기
정보 계층
코드와 설명의 거리
모바일 표·다이어그램
목차의 단순성
현재 위치
다음 학습 경로
키보드 접근
문서 상태
```

`hawk90.github.io`처럼 콘텐츠가 많고 기술 밀도가 높은 사이트는 화려한 블로그보다는 **읽기 좋은 기술 문서 도구**에 가까워야 한다.

다음은 **Task 2-7. Maintainability, Tooling & Content Operations Anti-patterns**다. 콘텐츠 스키마, 자동화 스크립트, migration, dependency, CI, 생성 자산, 문서 드리프트, 운영 규칙을 카탈로그화하면 된다.

<!-- source message: 33 -->

## M-01. Schema Drift

### 글마다 front matter 규칙이 다름

예:

```yaml
title:
date:
tags:
```

과거 글은 이 정도인데, 최근 글은:

```yaml
title:
description:
published:
updated:
series:
seriesOrder:
status:
topics:
```

까지 늘어난다.

### 문제

- fallback 코드가 계속 증가
- 어떤 필드가 필수인지 불명확
- 검색·시리즈·SEO 결과가 글마다 다름
- 오래된 글을 수정하기 어려움

### 개선

단일 schema를 정의하고 migration 경로를 둔다.

---

<!-- source message: 33 -->

## M-02. Optional Field Explosion

### 모든 metadata가 optional

### 증상

렌더링 코드가 다음처럼 된다.

```ts
if (post.data.description) ...
if (post.data.updated) ...
if (post.data.status) ...
if (post.data.series) ...
```

### 문제

실제 데이터 품질을 코드가 계속 보정하게 된다.

### 개선

핵심 필드는 필수로 두고, 특수한 필드만 optional로 둔다.

---

<!-- source message: 33 -->

## M-03. Required Field Inflation

### 반대로 모든 필드를 필수화

### 문제

짧은 Reference 글에도 audience, difficulty, lastVerified, series, prerequisites를 억지로 넣게 된다.

### 개선

콘텐츠 타입별 schema를 나눈다.

```text
Guide
Debug Note
Experiment
Reference
```

마다 필요한 필드가 다르다.

---

<!-- source message: 33 -->

## M-04. One Schema for Every Content Type

### 모든 글에 같은 metadata 구조 사용

### 문제

실험 글에는 환경·방법이 중요하고, 개념 글에는 선행 지식과 관련 개념이 중요하다.

### 개선

공통 필드와 타입별 확장 필드를 분리한다.

---

<!-- source message: 33 -->

## M-05. Free-Text Enum

### 상태·유형·난이도를 문자열로 자유 입력

```yaml
status: current
status: Current
status: active
status: up-to-date
```

### 문제

필터와 검색이 일관되게 동작하지 않는다.

### 개선

허용값을 enum으로 제한하고 alias를 migration에서 정리한다.

---

<!-- source message: 33 -->

## M-06. Taxonomy Without Registry

### Topic과 Tag를 글마다 직접 생성

### 문제

- 오타
- 동의어
- 대소문자 차이
- 한글·영문 혼재
- 사용되지 않는 태그 증가

### 개선

중앙 taxonomy registry를 둔다.

---

<!-- source message: 33 -->

## M-07. Series Metadata Duplication

### 모든 글이 시리즈 이름과 설명을 반복 저장

### 문제

시리즈 이름 변경 시 여러 글을 수정해야 한다.

### 개선

시리즈 manifest에서 이름·설명·순서를 관리하고 글은 시리즈 ID만 참조한다.

---

<!-- source message: 33 -->

## M-08. Derived Data Stored Manually

### 읽기 시간·관련 글·이전/다음 글을 front matter에 직접 저장

### 문제

원본이 바뀌면 쉽게 stale 상태가 된다.

### 개선

파생 가능한 값은 빌드 시 계산한다.

---

<!-- source message: 33 -->

## M-09. Generated Field Committed as Source

### 자동 생성 description이나 keyword가 원본처럼 저장

### 문제

사람이 작성한 값과 자동 값의 경계가 사라진다.

### 개선

source metadata와 derived metadata를 분리한다.

---

<!-- source message: 33 -->

## M-10. Hidden Defaults

### 값이 없을 때 어떤 기본값이 적용되는지 모름

예:

```text
status 없음 → current?
difficulty 없음 → intermediate?
```

### 문제

오래된 글이 의도와 다르게 분류된다.

### 개선

기본값은 명시적으로 문서화하고, 가능한 경우 migration으로 실제 값을 채운다.

---

# Migration

<!-- source message: 33 -->

## M-11. Forever Backward Compatibility

### 모든 과거 형식을 영원히 지원

### 증상

```ts
post.data.date ?? post.data.published ?? post.data.pubDate
```

### 문제

렌더링 코드가 데이터 역사 전체를 책임진다.

### 개선

한 번 migration하고 오래된 필드 지원을 제거한다.

---

<!-- source message: 33 -->

## M-12. Big-Bang Migration

### 수백 개 글을 한 번에 완벽히 바꾸려 함

### 문제

- 변경량이 지나치게 큼
- 검토 불가능
- 중간 상태가 없음
- 실패 시 되돌리기 어려움

### 개선

대표 글, 유입 상위 글, 현재 Topic 순으로 단계적으로 진행한다.

---

<!-- source message: 33 -->

## M-13. Migration Without Dry Run

### migration 실행 즉시 파일 수정

### 문제

예상치 못한 대량 변경이 발생한다.

### 개선

```text
analyze
dry-run
report
apply
validate
```

단계를 분리한다.

---

<!-- source message: 33 -->

## M-14. Migration Without Idempotency

### 같은 migration을 두 번 실행하면 결과가 달라짐

### 문제

CI나 로컬에서 반복 실행하기 어렵다.

### 개선

migration은 여러 번 실행해도 동일 결과가 나오게 만든다.

---

<!-- source message: 33 -->

## M-15. Migration Without Backup Boundary

### 자동 수정 전에 변경 범위를 보존하지 않음

### 개선

Git branch 또는 명확한 commit boundary에서 실행하고 한 migration당 한 commit을 유지한다.

---

<!-- source message: 33 -->

## M-16. Semantic Migration by Regex

### 정규식만으로 Markdown 의미 구조 변경

### 문제

코드 블록, front matter, 링크, 수식 안의 문자열까지 잘못 수정할 수 있다.

### 개선

구조 변경은 parser 기반으로 처리하고 regex는 단순한 안전한 변경에만 사용한다.

---

<!-- source message: 33 -->

## M-17. Path Migration Without Redirects

### 파일과 URL을 이동했지만 redirect 없음

### 문제

외부 링크와 검색 유입이 깨진다.

### 개선

이전 slug map을 유지하고 최종 URL로 직접 redirect한다.

---

<!-- source message: 33 -->

## M-18. Migration Without Validation

### 수정 후 build만 성공하면 완료로 간주

### 문제

의미가 잘못됐지만 문법상 정상일 수 있다.

### 개선

- 스키마 검사
- 링크 검사
- diff 통계
- 샘플 렌더링
- 이전/이후 manifest 비교

를 수행한다.

---

# Scripts and Tooling

<!-- source message: 33 -->

## M-19. One Script per Symptom

### 문제마다 새로운 스크립트 작성

```text
audit-links.py
fix-links.py
check-tags.py
check-series.py
check-dates.py
```

### 문제

공통 로직과 규칙이 분산된다.

### 개선

공통 parser·manifest·diagnostic framework 위에 rule을 추가한다.

---

<!-- source message: 33 -->

## M-20. Every Script Parses Markdown Differently

### Node와 Python 도구가 서로 다른 parser 사용

### 문제

한 도구에서는 유효하고 다른 도구에서는 오류가 된다.

### 개선

공통 중간 manifest를 생성해 모든 도구가 소비하게 한다.

---

<!-- source message: 33 -->

## M-21. Script as Undocumented Tribal Knowledge

### 작성자만 실행 방법을 앎

### 증상

- 옵션 설명 없음
- 입력·출력 불명확
- 실패 코드 없음
- README에 이름만 존재

### 개선

각 명령에 `--help`, 목적, 예제, 실패 조건을 제공한다.

---

<!-- source message: 33 -->

## M-22. Hidden Script Side Effects

### audit 명령인데 파일도 수정

### 문제

검사와 수정의 경계가 불명확하다.

### 개선

```text
audit:links
fix:links
```

처럼 읽기와 쓰기 명령을 분리한다.

---

<!-- source message: 33 -->

## M-23. Auto-Fix Without Confidence

### 불확실한 링크나 태그를 자동 수정

### 문제

기술적으로 유효하지만 의미상 틀린 연결이 생긴다.

### 개선

confidence threshold를 두고 애매한 경우 report만 생성한다.

---

<!-- source message: 33 -->

## M-24. No Fixture Tests for Content Tools

### 실제 전체 블로그로만 스크립트 검증

### 문제

작은 edge case를 재현하기 어렵다.

### 개선

테스트용 Markdown fixture를 둔다.

- 잘못된 front matter
- 코드 블록 안 링크
- 한글 slug
- 중복 시리즈 순서
- redirect alias

---

<!-- source message: 33 -->

## M-25. Full Repository Scan for Every Command

### 작은 검사도 모든 파일 탐색

### 문제

도구 사용이 느려지고 자주 실행하지 않게 된다.

### 개선

변경 파일 모드와 전체 모드를 분리한다.

---

<!-- source message: 33 -->

## M-26. Tool Output as Unstructured Text

### 결과가 터미널 문자열뿐

### 문제

CI annotation, dashboard, 자동 수정에 재사용하기 어렵다.

### 개선

사람용 출력과 JSON/SARIF 출력 옵션을 함께 제공한다.

---

<!-- source message: 33 -->

## M-27. No Severity Model

### 모든 문제를 동일하게 출력

### 개선

```text
error
warning
info
suggestion
```

으로 나누고 배포 차단 여부를 분리한다.

---

<!-- source message: 33 -->

## M-28. Rule Without Rationale

### “description이 없습니다”만 출력

### 문제

왜 필요한지, 어떻게 고쳐야 하는지 알기 어렵다.

### 개선

진단 결과에 이유와 수정 예를 포함한다.

---

<!-- source message: 33 -->

## M-29. Rule Explosion

### 품질 규칙이 계속 늘어남

### 문제

글을 쓰기보다 lint를 만족시키는 작업이 된다.

### 개선

규칙마다 다음을 기록한다.

- 해결하는 실제 문제
- 오탐률
- 자동 수정 가능성
- 차단 여부
- 폐기 조건

---

<!-- source message: 33 -->

## M-30. Linter as Editorial Authority

### 기계 규칙이 글의 문체와 판단까지 지배

### 문제

모든 글이 같은 구조와 문장 리듬을 갖게 된다.

### 개선

정확성·일관성 규칙은 자동화하고, 설명 방식은 작성자의 판단을 남긴다.

---

# CI/CD

<!-- source message: 33 -->

## M-31. CI as the Only Reproducible Environment

### 로컬에서는 전체 검증을 실행하기 어려움

### 문제

문제가 push 후에만 발견된다.

### 개선

CI와 같은 명령을 로컬에서도 실행할 수 있게 한다.

---

<!-- source message: 33 -->

## M-32. Local and CI Command Divergence

### 로컬 `npm run build`와 CI build가 다름

### 문제

로컬 성공 후 CI 실패가 반복된다.

### 개선

CI는 package script를 호출하고 별도 로직을 최소화한다.

---

<!-- source message: 33 -->

## M-33. Hidden Environment Dependency

### CI에만 설치된 도구에 의존

예:

```text
LaTeX
Python package
system font
ImageMagick
```

### 개선

필수 의존성을 명시하고 bootstrap script 또는 container를 제공한다.

---

<!-- source message: 33 -->

## M-34. Floating Tool Versions

### Node·Python·OS package 버전이 고정되지 않음

### 문제

어제 성공한 빌드가 오늘 실패할 수 있다.

### 개선

주요 런타임과 생성 도구 버전을 명시적으로 고정한다.

---

<!-- source message: 33 -->

## M-35. CI Workflow Logic Duplication

### 여러 workflow에 install·build·cache 설정 반복

### 문제

한 곳만 수정되어 동작이 달라진다.

### 개선

재사용 workflow 또는 composite action으로 공통화한다.

---

<!-- source message: 33 -->

## M-36. Deploy on Every Branch Push

### 불필요한 preview·artifact 생성

### 개선

브랜치와 변경 경로에 따라 실행 범위를 제한한다.

---

<!-- source message: 33 -->

## M-37. No Path-Based Trigger

### 문서 오탈자 수정에도 tooling 전체 테스트

### 개선

콘텐츠·UI·도구 변경에 따라 job을 나눈다.

단, 최종 main 배포에서는 통합 검사를 유지한다.

---

<!-- source message: 33 -->

## M-38. CI Cache as a Mystery

### 캐시가 왜 hit/miss 되는지 모름

### 문제

stale 결과나 낮은 효율을 방치한다.

### 개선

cache key와 대상 디렉터리를 문서화하고 hit ratio를 확인한다.

---

<!-- source message: 33 -->

## M-39. Flaky Build Accepted as Normal

### 가끔 메모리 부족이나 timeout이 발생

### 문제

재실행으로 넘기면 근본 원인이 누적된다.

### 개선

flaky 실패를 별도 issue로 추적하고 재시도는 보조 장치로만 사용한다.

---

<!-- source message: 33 -->

## M-40. No Post-Deploy Verification

### 배포 성공 메시지만 확인

### 개선

배포 후 대표 URL, 검색 인덱스, Sitemap, 주요 asset을 smoke test한다.

---

# Dependencies

<!-- source message: 33 -->

## M-41. Dependency Archaeology

### 왜 설치했는지 모르는 패키지

### 문제

삭제하기 무서워 계속 남는다.

### 개선

각 주요 dependency의 목적을 기록한다.

---

<!-- source message: 33 -->

## M-42. Feature Removed, Dependency Retained

### MDX나 편집 기능은 제거했지만 패키지는 남음

### 문제

설치·보안·업데이트 비용이 지속된다.

### 개선

기능 제거 checklist에 dependency, config, docs, tests 제거를 포함한다.

---

<!-- source message: 33 -->

## M-43. Production and Tooling Dependencies Mixed

### editor-only·build-only 패키지가 모두 같은 범주

### 문제

의존성 역할을 파악하기 어렵다.

### 개선

runtime, build, editor, content-tools 역할을 분리한다.

---

<!-- source message: 33 -->

## M-44. Dependency for a Trivial Function

### 작은 slug 처리나 날짜 포맷 때문에 큰 패키지 설치

### 문제

업데이트와 공급망 표면이 커진다.

### 개선

패키지 도입 전 실제 절감되는 복잡성을 비교한다.

---

<!-- source message: 33 -->

## M-45. Multiple Libraries for the Same Job

### Markdown parser나 날짜 라이브러리가 여러 개

### 문제

동작 차이와 번들·설치 비용이 증가한다.

### 개선

용도를 통합하거나 사용 범위를 명확히 분리한다.

---

<!-- source message: 33 -->

## M-46. Unbounded Plugin Stack

### remark·rehype plugin이 계속 증가

### 문제

호환성·실행 순서·업그레이드 위험이 커진다.

### 개선

플러그인마다 필요성, 입력, 출력, 순서 의존성을 문서화한다.

---

<!-- source message: 33 -->

## M-47. Major Upgrade by Habit

### 기능상 필요 없이 최신 major로 즉시 이동

### 문제

콘텐츠 개선보다 migration 비용이 커진다.

### 개선

보안·지원 종료·명확한 이점이 있을 때 업그레이드한다.

---

<!-- source message: 33 -->

## M-48. Frozen Dependencies Forever

### 반대로 업데이트를 무기한 미룸

### 문제

나중에 한 번에 큰 migration이 필요해진다.

### 개선

정기적인 작은 업데이트와 major 업그레이드를 분리한다.

---

<!-- source message: 33 -->

## M-49. Lockfile Without Reproducibility

### lockfile은 있지만 시스템 dependency가 고정되지 않음

### 개선

Node 외에 Python, LaTeX, font, image tools까지 포함한 환경 정의가 필요하다.

---

<!-- source message: 33 -->

## M-50. Vulnerability Scanner as Upgrade Bot

### 취약점 경고가 나오면 맥락 없이 모두 업데이트

### 문제

실제 사용하지 않는 경로의 경고 때문에 안정성을 해칠 수 있다.

### 개선

노출 여부와 실행 경로를 평가하고 제거·업데이트·완화 중 선택한다.

---

# Documentation Drift

<!-- source message: 33 -->

## M-51. README as Marketing Copy

### 실제 상태보다 기능을 크게 설명

### 문제

구현과 문서가 어긋난다.

### 개선

현재 지원, 실험, 계획을 구분한다.

---

<!-- source message: 33 -->

## M-52. Feature List Without Ownership

### 기능은 나열되지만 어디서 구현되는지 모름

### 개선

핵심 기능에 source location과 책임 모듈을 연결한다.

---

<!-- source message: 33 -->

## M-53. Stale Setup Guide

### 설치 명령이 현재 버전과 맞지 않음

### 문제

새 환경에서 시작부터 실패한다.

### 개선

CI에서 setup 문서의 핵심 명령을 실제 실행해 검증할 수 있다.

---

<!-- source message: 33 -->

## M-54. Architecture in Comments Only

### 중요한 판단이 config 주석에만 남음

### 문제

파일을 바꾸거나 삭제하면 맥락이 사라진다.

### 개선

중요한 결정은 짧은 ADR로 남긴다.

---

<!-- source message: 33 -->

## M-55. ADR Without Consequences

### 결정만 기록

```text
Astro를 사용한다.
```

### 문제

왜 선택했고 무엇을 포기했는지 모른다.

### 개선

Context, Decision, Consequences를 기록한다.

---

<!-- source message: 33 -->

## M-56. ADR as Immutable Law

### 과거 결정을 절대 변경하지 않음

### 개선

결정 상태를 표시한다.

```text
accepted
superseded
deprecated
```

---

<!-- source message: 33 -->

## M-57. Documentation Duplication

### README, Wiki, 코드 주석에 같은 설명 반복

### 문제

한 곳만 갱신되어 충돌한다.

### 개선

한 곳을 source of truth로 두고 다른 곳에서는 링크한다.

---

<!-- source message: 33 -->

## M-58. No Operational Runbook

### 배포 실패·검색 인덱스 오류·OG 실패 대응법 없음

### 개선

자주 발생하는 운영 문제의 진단과 복구 절차를 짧게 정리한다.

---

<!-- source message: 33 -->

## M-59. No Content Authoring Guide

### 글 작성 규칙이 암묵적

### 문제

미래의 본인도 예전 규칙을 잊는다.

### 개선

- 제목
- description
- 코드 블록 언어
- 이미지 경로
- 콘텐츠 타입
- 검증 정보

에 대한 최소 가이드를 둔다.

---

<!-- source message: 33 -->

## M-60. Documentation Without Deletion

### 제거된 기능 문서가 계속 남음

### 개선

기능 삭제 시 문서 검색과 정리를 checklist에 포함한다.

---

# Generated Assets

<!-- source message: 33 -->

## M-61. Source–Artifact Ambiguity

### 어떤 파일이 원본이고 생성물인지 불명확

### 문제

생성된 SVG나 OG 이미지를 직접 수정하게 된다.

### 개선

디렉터리와 파일 헤더로 source와 generated를 구분한다.

---

<!-- source message: 33 -->

## M-62. Generated File Modified Manually

### 생성물을 직접 수정해 임시 해결

### 문제

다음 빌드에서 덮어씌워진다.

### 개선

원본 또는 generator를 수정한다.

---

<!-- source message: 33 -->

## M-63. Artifact Naming by Display Title

### 제목 변경 시 파일명도 변경

### 문제

불필요한 삭제·생성과 링크 변화가 발생한다.

### 개선

안정적인 content ID나 slug를 사용한다.

---

<!-- source message: 33 -->

## M-64. No Artifact Manifest

### 어떤 글이 어떤 OG·SVG·검색 레코드를 생성했는지 모름

### 개선

입력과 출력 관계를 manifest로 관리한다.

---

<!-- source message: 33 -->

## M-65. Stale Artifact Preservation

### 원본 글이 삭제돼도 생성물이 남음

### 개선

manifest 기준 prune을 사용한다.

---

<!-- source message: 33 -->

## M-66. Over-Aggressive Prune

### 현재 build에서 참조되지 않는다는 이유로 공유 자산 삭제

### 개선

공유 자산과 문서 전용 자산을 구분한다.

---

<!-- source message: 33 -->

## M-67. Generator Version Not Recorded

### 어떤 버전으로 OG·SVG를 만들었는지 모름

### 문제

결과 차이를 추적하기 어렵다.

### 개선

manifest나 build metadata에 generator version을 기록한다.

---

<!-- source message: 33 -->

## M-68. Non-Deterministic Asset Generation

### 폰트·시스템·random 값에 따라 이미지 결과가 달라짐

### 개선

폰트와 locale, seed, tool version을 고정한다.

---

<!-- source message: 33 -->

## M-69. Generated Asset Review Blind Spot

### 코드 diff에는 이미지 결과가 보이지 않음

### 개선

큰 시각 변경에는 preview artifact나 screenshot diff를 제공한다.

---

<!-- source message: 33 -->

## M-70. Asset Pipeline Owns Publishing

### 이미지 생성 실패 때문에 텍스트 수정도 배포 불가

### 개선

필수 자산과 선택 자산을 구분하고 fallback을 제공한다.

---

# Content Operations

<!-- source message: 33 -->

## M-71. Publish-and-Forget

### 글을 발행한 뒤 다시 보지 않음

### 문제

오래된 정보와 깨진 링크가 누적된다.

### 개선

업데이트·검증·폐기 주기를 운영 프로세스에 포함한다.

---

<!-- source message: 33 -->

## M-72. Date-Based Review Only

### 오래된 글이면 모두 검토 대상으로 지정

### 문제

안정적인 개념 글까지 불필요하게 검토한다.

### 개선

변화 가능성에 따라 주기를 다르게 둔다.

```text
specification
toolchain
API
benchmark
historical note
```

---

<!-- source message: 33 -->

## M-73. No Content Ownership

### 어느 주제를 우선 관리할지 기준이 없음

개인 블로그에서도 주제가 많으면 사실상 같은 문제가 생긴다.

### 개선

핵심 Topic별 대표 허브와 유지 우선순위를 둔다.

---

<!-- source message: 33 -->

## M-74. New Content Before Existing Debt

### 기존 글 정리보다 새 글 작성이 항상 우선

### 문제

사이트 전체 품질은 개선되지 않는다.

### 개선

콘텐츠 작업 시간을 예를 들어 다음처럼 나눈다.

```text
신규 50%
업데이트 30%
통합·폐기 20%
```

비율은 조정할 수 있다.

---

<!-- source message: 33 -->

## M-75. No Merge Policy for Similar Articles

### 비슷한 글을 언제 합칠지 기준이 없음

### 개선

다음을 동시에 만족하면 통합 후보로 본다.

- 동일 검색 의도
- 설명 중복
- 독립 실험 없음
- 내부 링크 관계가 약함

---

<!-- source message: 33 -->

## M-76. Deletion Aversion

### 작성한 글을 절대 삭제하거나 통합하지 않음

### 문제

구판·중복·낮은 품질 글이 계속 남는다.

### 개선

redirect와 superseded 상태를 활용해 지식을 보존하면서 구조는 정리한다.

---

<!-- source message: 33 -->

## M-77. Update Without Revalidation

### 문장만 수정하고 환경 검증일도 최신으로 변경

### 문제

실제로 테스트하지 않았는데 최신 글처럼 보인다.

### 개선

`updated`와 `lastVerified`를 분리한다.

---

<!-- source message: 33 -->

## M-78. Bulk AI Refresh

### 오래된 글 전체를 AI로 일괄 재작성

### 문제

- 고유 경험 손실
- 문체 획일화
- 새로운 오류
- 사실 검증 부족

### 개선

AI는 후보와 구조 개선에 사용하고, 핵심 기술 주장과 경험은 직접 검증한다.

---

<!-- source message: 33 -->

## M-79. Editorial Template Lock-In

### 모든 글이 같은 템플릿을 강제

### 문제

글 유형과 주제 특성이 사라진다.

### 개선

콘텐츠 타입별 최소 구조만 제공하고 설명 방식은 유연하게 둔다.

---

<!-- source message: 33 -->

## M-80. No Content Retirement Workflow

### 폐기 상태만 있고 실제 처리 절차가 없음

### 개선

```text
identify
review
redirect or mark historical
update internal links
remove from hubs
retain or remove from sitemap
```

절차를 정한다.

---

# Release and Change Management

<!-- source message: 33 -->

## M-81. Content and Platform Changes Mixed

### 한 commit에서 글 50개와 UI 구조를 동시에 변경

### 문제

검토와 rollback이 어렵다.

### 개선

콘텐츠 migration, 플랫폼 변경, 디자인 변경을 가능한 한 분리한다.

---

<!-- source message: 33 -->

## M-82. Giant Refactor Commit

### 수천 파일 변경을 한 commit으로 처리

### 문제

의미 있는 diff 검토가 불가능하다.

### 개선

기계적 변경과 수동 의미 변경을 별도 commit으로 나눈다.

---

<!-- source message: 33 -->

## M-83. Formatting Noise in Semantic Change

### 내용 수정과 formatter 전체 적용이 섞임

### 개선

formatting-only commit을 먼저 분리한다.

---

<!-- source message: 33 -->

## M-84. No Rollback Plan

### 배포 후 문제 발생 시 이전 사이트로 돌아가기 어려움

### 개선

배포 artifact 또는 이전 commit 기반 rollback 절차를 유지한다.

---

<!-- source message: 33 -->

## M-85. Preview Not Representative

### preview에서는 Analytics·광고·base URL·asset 경로가 다름

### 문제

운영에서만 발생하는 오류를 놓친다.

### 개선

운영과 최대한 유사한 preview 설정을 사용한다.

---

<!-- source message: 33 -->

## M-86. Feature Flag Cemetery

### 오래된 실험 flag가 계속 남음

```text
enableNewSearch
useNewCard
legacySeries
```

### 문제

코드 경로가 증가하고 실제 사용 상태를 모른다.

### 개선

flag에 만료일과 제거 조건을 둔다.

---

<!-- source message: 33 -->

## M-87. Permanent Compatibility Layer

### 구형 URL·schema·컴포넌트 adapter가 계속 남음

### 개선

호환 계층마다 종료 조건을 정하고 migration 완료 후 제거한다.

---

<!-- source message: 33 -->

## M-88. Release Notes Without User Impact

### 내부 파일 변경만 설명

### 개선

다음처럼 사용자와 운영 관점으로 작성한다.

```text
검색 결과 정확도 개선
기존 CXL 글 URL 유지
모바일 코드 블록 스크롤 수정
```

---

<!-- source message: 33 -->

## M-89. No Baseline Before Refactor

### 구조를 바꿨지만 개선 여부를 비교할 수 없음

### 개선

리팩토링 전 다음을 기록한다.

- build time
- memory
- index size
- broken links
- Lighthouse
- 주요 페이지 screenshot

---

<!-- source message: 33 -->

## M-90. Completion Defined as Code Merge

### 기능 구현이 끝나면 완료

### 문제

문서, migration, 운영 검증, 기존 콘텐츠 적용이 빠진다.

### 개선

완료 조건에 다음을 포함한다.

```text
code
tests
docs
migration
content adoption
production validation
```

---

# hawk90에서 우선 확인할 15개

| 우선순위 | 안티패턴 | 이유 |
|---:|---|---|
| 1 | Schema Drift | 글 수가 많아 과거·현재 metadata 차이 가능성이 큼 |
| 2 | Every Script Parses Markdown Differently | 감사·생성 도구가 많아 규칙 불일치 위험 |
| 3 | Forever Backward Compatibility | 오래된 형식을 코드에서 계속 지원할 가능성 |
| 4 | One Script per Symptom | 자동화가 별도 내부 플랫폼으로 성장할 수 있음 |
| 5 | No Fixture Tests for Content Tools | 대량 자동 수정의 신뢰성 확보 필요 |
| 6 | Auto-Fix Without Confidence | 내부 링크 자동 수정 시 의미 오류 가능 |
| 7 | Required Field Inflation | 콘텐츠 구조 개선 중 front matter 폭발 위험 |
| 8 | Dependency Archaeology | MDX·editor·generator 관련 잔존 의존성 점검 |
| 9 | README as Marketing Copy | 설명 기능과 실제 구현 상태 차이 가능 |
| 10 | Source–Artifact Ambiguity | OG·SVG·검색 인덱스 등 생성물 관리 중요 |
| 11 | Publish-and-Forget | 수백 개 기술 글의 최신성 유지 문제 |
| 12 | Update Without Revalidation | 수정일과 실제 검증일을 구분해야 함 |
| 13 | New Content Before Existing Debt | 애드센스 대응에서 신규 글보다 기존 구조 개선 우선 |
| 14 | Content and Platform Changes Mixed | 대규모 개편 시 검토·rollback 어려움 |
| 15 | No Baseline Before Refactor | 개선 효과를 판단하려면 현재 수치가 필요 |

# 이번 단계의 핵심 결론

유지보수 문제의 본질은 스크립트 수나 dependency 수 자체가 아니다.

> **콘텐츠를 해석하는 규칙이 여러 곳으로 분산되고, 과거 형식과 파생 자산을 계속 호환하면서 시스템의 책임이 늘어나는 것**

이 핵심 위험이다.

가장 좋은 방향은 다음이다.

```text
단일 콘텐츠 schema
단일 content manifest
공통 진단 모델
단계적 migration
명확한 source/artifact 경계
업데이트·폐기 정책
측정 가능한 완료 조건
```

다음은 **Task 2-8. Security, Privacy & Supply-Chain Anti-patterns**로 이어갈 수 있다. GitHub Pages 자체는 단순하지만 AdSense·Analytics·Giscus·OAuth·관리자 편집기·외부 스크립트·CI secret·dependency가 추가되면서 생기는 문제를 정리하는 단계다.

<!-- source message: 35 -->

## SEC-01. Static Means Secure

### 정적 사이트이므로 보안 검토가 필요 없다고 생각

정적 HTML만 배포하더라도 다음은 여전히 존재한다.

- 외부 JavaScript
- 공급망 공격
- XSS
- 악성 링크
- DNS·도메인 설정
- GitHub Actions 권한
- 노출된 secret
- 관리자 도구
- 개인정보 수집

### 개선

정적 사이트의 장점은 공격 표면이 **작다**는 것이지, 공격 표면이 **없다**는 뜻은 아니다.

---

<!-- source message: 35 -->

## SEC-02. No Backend, No Sensitive Data

### 서버가 없으니 민감한 정보가 없다고 생각

저장소와 빌드 환경에는 다음이 있을 수 있다.

```text
Analytics ID
AdSense 설정
GitHub token
OAuth secret
배포 token
개인 이메일
초안 문서
비공개 이미지
```

공개해도 되는 식별자와 절대 공개하면 안 되는 secret을 구분해야 한다.

---

<!-- source message: 35 -->

## SEC-03. Public Repository as a Secret Store

### 나중에 사용할 설정값을 저장소에 먼저 기록

```env
GITHUB_CLIENT_SECRET=...
```

### 문제

한 번 Git history에 들어간 secret은 파일만 삭제해도 안전해지지 않는다.

### 개선

노출된 secret은 삭제가 아니라 **폐기·재발급**해야 한다.

---

<!-- source message: 35 -->

## SEC-04. Security by Obscurity

### `/admin` 주소를 메뉴에서 숨기면 안전하다고 생각

### 문제

공개 정적 자산, Sitemap, JavaScript bundle, 저장소 코드에서 경로를 발견할 수 있다.

### 개선

관리자 기능은 주소 은닉이 아니라 인증·권한 검증으로 보호한다.

---

<!-- source message: 35 -->

## SEC-05. Development Feature in Production

### 실험용 관리자·미리보기 기능이 운영 빌드에 포함

### 문제

UI에서 보이지 않아도 코드와 endpoint가 남을 수 있다.

### 개선

공개 사이트 빌드에서는 기능을 숨기는 것이 아니라 **아예 포함하지 않는 것**이 좋다.

---

# B. 외부 JavaScript

<!-- source message: 35 -->

## SEC-06. Trust Every Third-Party Script

### 유명 서비스의 JavaScript는 무조건 안전하다고 가정

예:

- Analytics
- AdSense
- 댓글
- Newsletter
- 공유 버튼
- 검색 서비스

외부 스크립트는 공급자가 침해되거나 전달 경로가 변조되면 사이트 방문자에게 영향을 줄 수 있다. OWASP도 제3자 JavaScript를 별도의 공급망 위험으로 다룬다. citeturn392708search12turn392708search25

### 개선

외부 스크립트마다 다음을 기록한다.

```text
왜 필요한가
어떤 데이터를 읽는가
어떤 도메인과 통신하는가
제거하면 무엇이 깨지는가
지연 로드할 수 있는가
```

---

<!-- source message: 35 -->

## SEC-07. Third-Party Script Accumulation

### 기능 하나마다 외부 스크립트 추가

```text
Analytics
AdSense
Giscus
Newsletter
Social share
Heatmap
Error tracking
```

### 문제

각 서비스의 위험은 작아도 전체 공격 표면과 개인정보 흐름은 누적된다.

### 개선

한 서비스가 실제 의사결정이나 사용자 가치에 기여하지 않는다면 제거한다.

---

<!-- source message: 35 -->

## SEC-08. Third-Party Script in Critical Path

### 외부 서비스가 실패하면 본문도 표시되지 않음

### 개선

```text
본문 렌더링
↓
외부 기능 지연 로딩
```

순서를 유지한다.

외부 스크립트 실패는 댓글·광고·분석 기능에만 영향을 줘야 한다.

---

<!-- source message: 35 -->

## SEC-09. No Content Security Policy

### 브라우저가 어디서든 스크립트와 자원을 불러올 수 있음

CSP는 허용된 스크립트·스타일·이미지·프레임 출처를 제한하는 방어 계층이다. XSS와 비인가 외부 자원 로딩 위험을 줄일 수 있다. citeturn392708search18turn392708search34turn392708search43

### 개선 예시 방향

```text
default-src 'self'
script-src 'self' 필요한 외부 도메인
img-src 'self' data: 필요한 이미지 도메인
frame-src Giscus 등 명시적 도메인
```

AdSense나 Analytics를 사용하면 허용 목록이 복잡해질 수 있으므로 실제 네트워크 요청을 기준으로 설계해야 한다.

---

<!-- source message: 35 -->

## SEC-10. CSP Added After Everything

### 외부 기능을 모두 붙인 뒤 마지막에 CSP 추가

### 문제

이미 inline script, 동적 style, 여러 외부 도메인에 의존해 엄격한 CSP를 적용하기 어려워진다.

### 개선

새 integration을 추가할 때 CSP 영향도 함께 검토한다.

---

<!-- source message: 35 -->

## SEC-11. CSP with `unsafe-inline` Everywhere

### CSP는 있지만 대부분 허용

```text
script-src 'self' 'unsafe-inline' 'unsafe-eval' *
```

### 문제

정책이 존재하지만 실질적인 보호 효과가 작다.

### 개선

가능하면 nonce나 hash 기반 script 정책을 사용하고, `unsafe-eval`이 필요한 의존성을 줄인다.

---

<!-- source message: 35 -->

## SEC-12. CSP Report Ignored

### CSP 위반 리포트가 많아도 방치

### 문제

실제 공격, 잘못된 설정, 브라우저 확장 노이즈를 구분하지 못한다.

### 개선

처음에는 report-only 정책으로 관찰하고, 필요한 출처만 정제한 뒤 강제 정책으로 전환한다.

---

<!-- source message: 35 -->

## SEC-13. No Subresource Integrity

### CDN script를 URL만 믿고 로드

SRI는 내려받은 자원의 cryptographic hash가 기대값과 일치하는지 브라우저가 확인하게 한다. CDN 자원이 예기치 않게 변경되는 위험을 줄이는 데 사용된다. citeturn392708search8turn392708search22

### 주의

AdSense처럼 공급자가 동적으로 변경하는 스크립트는 SRI 적용이 현실적으로 어려울 수 있다. 고정 버전의 정적 CDN 자원에 더 적합하다.

---

<!-- source message: 35 -->

## SEC-14. SRI Without `crossorigin`

### integrity hash는 있지만 교차 출처 검증 설정이 잘못됨

### 문제

브라우저가 자원을 의도대로 검증하거나 로드하지 못할 수 있다.

### 개선

외부 정적 자원에 SRI를 적용할 때 CORS 조건을 함께 검토한다.

---

<!-- source message: 35 -->

## SEC-15. Script Version Floating

### 외부 CDN에서 최신 버전을 자동 사용

```html
<script src=".../library/latest.js">
```

### 문제

검토하지 않은 변경이 즉시 운영에 들어온다.

### 개선

고정된 version이나 immutable URL을 사용한다.

---

<!-- source message: 35 -->

## SEC-16. Same-Origin Proxy as Automatic Trust

### 외부 script를 자체 도메인으로 proxy하면 안전하다고 생각

### 문제

출처만 바뀔 뿐 코드 자체의 신뢰 문제는 남는다.

### 개선

version, integrity, 검토, 업데이트 절차가 함께 필요하다.

---

# C. XSS와 콘텐츠 렌더링

<!-- source message: 35 -->

## SEC-17. Markdown Is Trusted HTML

### Markdown 콘텐츠는 작성자가 썼으니 항상 안전하다고 가정

현재는 혼자 작성하더라도 향후 다음 경로가 생길 수 있다.

- 관리자 편집기
- 외부 기여
- 자동 import
- AI 생성 초안
- RSS·책 노트 동기화
- GitHub issue 기반 콘텐츠

### 문제

raw HTML이나 scriptable attribute가 렌더링될 수 있다.

### 개선

Markdown pipeline에서 raw HTML 허용 정책을 명확히 한다.

---

<!-- source message: 35 -->

## SEC-18. Raw HTML Everywhere

### Markdown 표현이 불편할 때 직접 HTML 삽입

```html
<div onclick="...">
<iframe ...>
<script ...>
```

### 문제

콘텐츠와 실행 코드 경계가 무너지고 sanitization이 어려워진다.

### 개선

필요한 embed는 허용된 컴포넌트나 directive로 제한한다.

---

<!-- source message: 35 -->

## SEC-19. Unsafe HTML Injection

### 검색 결과나 제목을 `innerHTML`로 삽입

```javascript
results.innerHTML = userControlledText;
```

XSS는 악성 콘텐츠가 페이지 문맥에서 실행되게 만들 수 있는 심각한 취약점이다. citeturn392708search29

### 개선

기본은 `textContent`와 안전한 DOM API를 사용한다. 정말 HTML이 필요하면 검증된 sanitizer와 명확한 허용 목록을 쓴다.

---

<!-- source message: 35 -->

## SEC-20. Search Highlight via String Replacement

### 검색어를 HTML 문자열에 직접 치환

```javascript
text.replace(query, `<mark>${query}</mark>`)
```

### 문제

검색 입력이 markup으로 해석될 수 있다.

### 개선

텍스트 노드를 분리해 `<mark>` 요소를 DOM API로 만든다.

---

<!-- source message: 35 -->

## SEC-21. Unescaped Front Matter

### 제목·description·태그를 HTML attribute에 그대로 삽입

### 문제

문자열이 attribute 문맥을 탈출할 수 있다.

### 개선

Astro의 기본 escaping을 우회하지 말고, 직접 HTML 문자열을 조립하지 않는다.

---

<!-- source message: 35 -->

## SEC-22. Trusting Generated Content

### AI나 자동화가 만든 Markdown은 안전하다고 가정

### 문제

의도하지 않은 HTML, 외부 iframe, 추적 링크, 위험한 protocol이 들어갈 수 있다.

### 개선

생성 주체와 관계없이 동일한 content validation을 적용한다.

---

<!-- source message: 35 -->

## SEC-23. Unsafe URL Scheme

### 링크의 `href`를 검증하지 않음

```text
javascript:
data:
file:
```

### 개선

콘텐츠 링크에서 허용할 protocol을 제한한다.

일반적으로:

```text
https
http
mailto
내부 상대 경로
```

정도로 관리할 수 있다.

---

<!-- source message: 35 -->

## SEC-24. Unrestricted Iframe Embedding

### 어떤 URL이든 iframe으로 삽입 가능

### 문제

피싱 화면, 추적, 권한 요청, clickjacking 관련 위험이 늘어난다.

### 개선

- 허용 도메인 목록
- `sandbox`
- 필요한 최소 `allow`
- 명확한 제목
- 지연 로딩

을 사용한다.

OWASP는 제3자 콘텐츠 격리에 iframe sandbox와 CSP를 방어 수단으로 제안한다. citeturn392708search12

---

<!-- source message: 35 -->

## SEC-25. Overpowered Iframe Sandbox

### sandbox를 쓰지만 모든 권한을 다시 허용

```html
sandbox="allow-scripts allow-same-origin allow-forms allow-popups ..."
```

### 문제

sandbox 효과가 크게 약해진다.

### 개선

기능에 필요한 최소 권한만 허용한다.

---

<!-- source message: 35 -->

## SEC-26. Untrusted SVG as Image

### 외부 SVG를 일반 이미지처럼 신뢰

SVG는 단순 그림 파일이 아니라 스크립트·외부 참조와 상호작용 요소를 포함할 수 있다.

### 개선

외부 SVG를 inline HTML로 삽입하지 말고, 필요하다면 sanitize하거나 빌드 과정에서 안전한 형태로 변환한다.

---

<!-- source message: 35 -->

## SEC-27. Generated SVG Injection

### TikZ·다이어그램 생성 결과를 무조건 inline

### 문제

생성 도구나 입력 경로가 변하면 예상치 못한 markup이 들어갈 수 있다.

### 개선

생성물도 허용 요소·attribute 검사를 거친다.

---

# D. GitHub Actions 공급망

<!-- source message: 35 -->

## SEC-28. Actions Pinned by Mutable Tag

```yaml
uses: actions/checkout@v4
```

태그는 편리하지만 변경 가능한 참조다. GitHub는 action을 immutable하게 사용하려면 full-length commit SHA로 고정하는 것을 권장한다. citeturn392708search1turn392708search11

### 개선

```yaml
uses: actions/checkout@<full-commit-sha>
```

그리고 사람이 이해할 수 있도록 옆에 버전 주석을 둔다.

---

<!-- source message: 35 -->

## SEC-29. Arbitrary Third-Party Action

### README가 편리해 보여 바로 workflow에 추가

### 문제

Action은 저장소 코드·토큰·artifact에 접근할 수 있다.

GitHub도 action source가 secret과 repository 데이터를 어떻게 처리하는지 검토할 것을 권장한다. citeturn392708search1

### 개선

- 공식 action 우선
- 소스와 유지보수 상태 검토
- full SHA pin
- 최소 권한
- 대체 가능한 간단한 shell 명령과 비교

---

<!-- source message: 35 -->

## SEC-30. Default Broad Workflow Permissions

### `GITHUB_TOKEN` 권한을 명시하지 않음

### 문제

workflow가 실제 필요한 범위보다 큰 권한을 받을 수 있다.

### 개선

workflow 또는 job 단위로 최소 권한을 지정한다.

```yaml
permissions:
  contents: read
```

배포 job만 필요한 write 권한을 별도로 준다.

---

<!-- source message: 35 -->

## SEC-31. Write Token in Build Job

### Markdown build와 배포가 같은 고권한 job

### 문제

빌드 dependency나 script가 침해되면 write token까지 접근할 가능성이 커진다.

### 개선

```text
untrusted build
→ artifact
→ minimal deploy job
```

으로 권한 경계를 나눈다.

---

<!-- source message: 35 -->

## SEC-32. Secrets Available to Every Step

### workflow 전체에 secret을 환경변수로 설정

```yaml
env:
  TOKEN: ${{ secrets.TOKEN }}
```

### 문제

필요하지 않은 action과 script도 secret을 볼 수 있다.

### 개선

실제로 사용하는 단일 step에만 전달한다.

---

<!-- source message: 35 -->

## SEC-33. Secret Printed Through Debug Logging

### troubleshooting을 위해 환경 전체 출력

```bash
env
set -x
```

### 문제

secret masking이 모든 변형과 가공된 문자열을 완벽히 막는다고 가정하면 위험하다.

### 개선

민감한 환경에서는 전체 environment와 command tracing을 출력하지 않는다.

---

<!-- source message: 35 -->

## SEC-34. Secret in Build Artifact

### 환경변수를 정적 HTML이나 JavaScript에 삽입

### 문제

정적 사이트에 포함된 값은 결국 모든 방문자가 볼 수 있다.

### 개선

브라우저에서 필요한 값은 public identifier로 취급한다. 비밀이 필요한 기능은 정적 사이트에 직접 넣을 수 없다.

---

<!-- source message: 35 -->

## SEC-35. Pull Request Workflow with Secrets

### 외부 PR 콘텐츠를 secret이 있는 workflow에서 처리

### 문제

악성 PR이 build script나 package script를 변경해 secret을 탈취할 수 있다.

### 개선

외부 기여 검증과 권한 있는 배포를 분리한다.

---

<!-- source message: 35 -->

## SEC-36. Unsafe `pull_request_target`

### fork PR 코드를 privileged context에서 checkout·실행

### 문제

기여자의 코드를 저장소 권한과 함께 실행할 수 있다.

### 개선

`pull_request_target`은 metadata 처리처럼 명확히 안전한 작업으로 제한한다.

---

<!-- source message: 35 -->

## SEC-37. Branch Name Injection

### PR 제목·브랜치·commit message를 shell 명령에 직접 삽입

```bash
echo "${{ github.event.pull_request.title }}"
```

사용 위치에 따라 shell injection 위험이 생길 수 있다.

### 개선

환경변수로 전달하고 shell quoting을 엄격히 한다. 가능하면 GitHub context 값을 명령 코드로 직접 조립하지 않는다.

---

<!-- source message: 35 -->

## SEC-38. Untrusted Markdown Executed During Build

### 글 속 directive가 shell command나 파일 경로를 생성

예:

```text
TikZ input
diagram command
include path
```

### 문제

외부 PR의 콘텐츠가 build host에서 명령 실행이나 임의 파일 접근으로 이어질 수 있다.

### 개선

- command argument allowlist
- 작업 디렉터리 격리
- shell 문자열 조립 금지
- 외부 PR에서는 위험한 generator 비활성화

---

<!-- source message: 35 -->

## SEC-39. Build Tool with Repository Write Access

### formatter나 migration script가 CI에서 원본 저장소를 직접 수정·push

### 문제

오류나 침해 시 대량 변경을 자동 반영할 수 있다.

### 개선

자동 수정은 PR을 생성하고 사람이 검토하게 한다.

---

<!-- source message: 35 -->

## SEC-40. Deployment From Unreviewed Commit

### 임의 branch나 workflow_dispatch 입력으로 운영 배포

### 개선

보호된 branch와 검토된 artifact만 배포한다.

---

# E. npm과 Dependency Supply Chain

<!-- source message: 35 -->

## SEC-41. Blind Dependency Installation

### 패키지 이름과 다운로드 수만 보고 설치

npm 생태계의 dependency는 취약점과 공급망 위험을 포함할 수 있으므로 검토와 관리가 필요하다. citeturn392708search39turn392708search44

### 개선

새 dependency마다 다음을 확인한다.

```text
유지보수 상태
소유자 변경
release 빈도
transitive dependency
install script
필요 권한
대체 가능성
```

---

<!-- source message: 35 -->

## SEC-42. Dependency for Minor Convenience

### 몇 줄이면 되는 기능에 대형 패키지 추가

### 문제

직접 코드 수는 줄지만 공급망과 업데이트 책임은 늘어난다.

### 개선

패키지 도입 비용을 다음으로 평가한다.

```text
코드 절감
보안 표면
dependency tree
업데이트 빈도
브라우저 bundle
빌드 영향
```

---

<!-- source message: 35 -->

## SEC-43. Transitive Dependency Blindness

### 직접 설치한 패키지만 검토

### 문제

실제 의존성 대부분은 하위 패키지일 수 있다.

### 개선

lockfile 변화와 dependency tree 크기를 함께 검토한다.

---

<!-- source message: 35 -->

## SEC-44. Automatic Major Update Merge

### Dependabot PR이 테스트만 통과하면 자동 merge

### 문제

API 변경 외에도 빌드 결과·HTML·보안 정책·추적 동작이 달라질 수 있다.

### 개선

패키지 역할에 따라 정책을 나눈다.

```text
patch: 자동화 가능
minor: 검토
major: 수동 검증
security: 노출도 평가 후 우선 처리
```

Dependabot은 업데이트 자동화를 지원하지만, 자동화 범위와 승인 정책은 별도로 설계해야 한다. citeturn392708search17

---

<!-- source message: 35 -->

## SEC-45. Vulnerability Count Theater

### `npm audit` 숫자 0만 목표

### 문제

빌드 시에만 사용하는 패키지와 실제 브라우저에 전달되는 코드의 위험이 다르다.

### 개선

```text
실행 가능성
노출 경로
영향도
사용 버전
완화 수단
```

을 평가한다.

---

<!-- source message: 35 -->

## SEC-46. Ignoring Build-Time Compromise

### 브라우저 bundle에 포함되지 않으니 build dependency는 안전하다고 생각

### 문제

빌드 도구는 원본 콘텐츠, secret, output HTML을 변경할 수 있다.

### 개선

build dependency도 production supply chain으로 취급한다.

---

<!-- source message: 35 -->

## SEC-47. Install Script Trust

### package의 `preinstall`·`postinstall` 실행을 무조건 허용

### 문제

설치 과정에서 임의 코드가 실행될 수 있다.

### 개선

새 package의 lifecycle script를 확인하고 필요하지 않은 실행 권한을 줄인다.

---

<!-- source message: 35 -->

## SEC-48. Lockfile Bypass

### CI에서 lockfile과 다른 최신 dependency 설치

### 개선

재현 가능한 설치 명령을 사용하고 lockfile 변경은 코드처럼 검토한다.

---

<!-- source message: 35 -->

## SEC-49. Lockfile Change Hidden in Large PR

### 콘텐츠 대량 수정과 dependency update가 섞임

### 문제

공급망 변화 검토가 묻힌다.

### 개선

dependency 변경은 별도 PR이나 commit으로 분리한다.

---

<!-- source message: 35 -->

## SEC-50. Abandoned Dependency Retention

### 더 이상 유지되지 않는 plugin을 계속 사용

### 문제

새로운 Astro·Node 환경에서 호환성뿐 아니라 보안 패치도 기대하기 어렵다.

### 개선

핵심 plugin마다 유지보수 상태와 제거 대안을 기록한다.

---

# F. OAuth와 관리자 편집기

<!-- source message: 35 -->

## SEC-51. OAuth Secret in Static Client

### GitHub OAuth client secret을 Astro 정적 bundle에 포함

### 문제

브라우저에 전달된 secret은 secret이 아니다.

### 개선

OAuth code exchange에 secret이 필요한 구조라면 신뢰할 수 있는 server-side component가 필요하다.

---

<!-- source message: 35 -->

## SEC-52. Personal Access Token in Browser Storage

### GitHub PAT를 `localStorage`에 저장

### 문제

동일 origin의 XSS나 악성 script가 읽을 수 있다.

### 개선

개인용 로컬 도구로 범위를 제한하거나, 짧은 수명의 token과 안전한 backend session 구조를 사용한다.

---

<!-- source message: 35 -->

## SEC-53. Long-Lived Broad PAT

### 저장소 전체를 수정할 수 있는 장기 token 사용

### 개선

- fine-grained token
- 특정 저장소
- 필요한 권한만
- 짧은 만료
- 주기적 회전

을 적용한다.

---

<!-- source message: 35 -->

## SEC-54. OAuth Scope Inflation

### 미래 기능을 위해 넓은 scope 요청

### 문제

사용자와 저장소에 대한 불필요한 접근 권한을 가진다.

### 개선

현재 기능에 필요한 최소 scope만 요청한다.

---

<!-- source message: 35 -->

## SEC-55. Authentication Without Authorization

### 로그인했으면 누구나 글 수정 가능

### 문제

사용자 신원 확인과 권한 확인은 다른 문제다.

### 개선

허용 사용자·조직·저장소·branch를 별도로 검증한다.

---

<!-- source message: 35 -->

## SEC-56. Client-Side Authorization Only

### UI에서 관리자 메뉴를 숨기는 것으로 권한 처리

### 문제

API 요청은 직접 호출할 수 있다.

### 개선

권한이 필요한 모든 write operation은 신뢰 경계에서 다시 검증한다.

---

<!-- source message: 35 -->

## SEC-57. Missing OAuth `state`

### OAuth 요청과 callback의 연결을 검증하지 않음

### 문제

로그인 CSRF나 callback 혼동 위험이 생긴다.

### 개선

예측 불가능한 state 값을 생성하고 callback에서 검증한다.

---

<!-- source message: 35 -->

## SEC-58. Redirect URI Wildcard

### 여러 환경 지원을 위해 넓은 callback URL 허용

### 문제

token이나 authorization code가 예상치 못한 위치로 전달될 수 있다.

### 개선

정확한 redirect URI를 환경별로 등록한다.

---

<!-- source message: 35 -->

## SEC-59. Token in URL

### access token을 query string에 전달

### 문제

browser history, referrer, 로그에 남을 수 있다.

### 개선

URL에 secret이나 token을 넣지 않는다.

---

<!-- source message: 35 -->

## SEC-60. Editor Can Commit Anywhere

### 관리자 편집기가 임의 경로에 파일 저장

### 문제

workflow·config·script까지 수정할 수 있다.

### 개선

콘텐츠 전용 디렉터리와 허용 파일 확장자를 제한한다.

---

<!-- source message: 35 -->

## SEC-61. Editor Can Modify Workflow Files

### 콘텐츠 편집 token이 `.github/workflows`까지 수정 가능

### 문제

다음 CI 실행에서 코드 실행 권한으로 확대될 수 있다.

### 개선

콘텐츠 작성 권한과 workflow 관리 권한을 분리한다.

---

<!-- source message: 35 -->

## SEC-62. Unsanitized Commit Message

### 사용자 입력을 commit message나 API payload에 그대로 사용

### 개선

길이·문자·형식을 제한하고 로그 인젝션이나 제어문자를 제거한다.

---

<!-- source message: 35 -->

## SEC-63. No Conflict Detection

### 편집기가 최신 commit 확인 없이 덮어씀

### 문제

보안 취약점은 아니더라도 콘텐츠 무결성과 감사 가능성이 떨어진다.

### 개선

base commit SHA를 확인하고 conflict 시 명시적으로 중단한다.

---

# G. 개인정보와 추적

<!-- source message: 35 -->

## SEC-64. Analytics Without Data Inventory

### Analytics를 켰지만 어떤 데이터가 수집되는지 모름

### 개선

최소한 다음을 정리한다.

```text
수집 이벤트
쿠키 사용
IP 처리
보존 기간
외부 이전
사용 목적
```

---

<!-- source message: 35 -->

## SEC-65. Privacy Policy by Template

### 서비스 이름만 바꾼 정책 복사

### 문제

실제 Giscus·AdSense·Analytics 구성과 일치하지 않을 수 있다.

### 개선

실제 network와 storage 동작을 기준으로 작성한다.

---

<!-- source message: 35 -->

## SEC-66. Privacy Policy Drift

### 서비스는 추가·제거했지만 정책은 그대로

### 개선

외부 integration 변경을 개인정보 처리방침 검토 조건으로 만든다.

---

<!-- source message: 35 -->

## SEC-67. Consent Banner Theater

### 실제 제어 없이 “동의” 버튼만 제공

### 문제

버튼을 누르기 전에도 모든 추적 script가 로드될 수 있다.

### 개선

동의가 필요한 환경과 서비스라면 실제 script loading과 연결한다.

---

<!-- source message: 35 -->

## SEC-68. Consent for Everything

### 필수 기능까지 모두 쿠키 동의 대상으로 표시

### 문제

사용자에게 불필요한 선택 부담을 준다.

### 개선

필수 저장, 기능 저장, 분석, 광고를 구분한다.

---

<!-- source message: 35 -->

## SEC-69. Local Storage Without Disclosure

### 테마·검색 기록·읽기 상태를 저장하지만 안내 없음

### 개선

민감하지 않은 설정이라도 무엇을 왜 저장하는지 문서화한다.

---

<!-- source message: 35 -->

## SEC-70. Persistent Search History

### 검색어를 무기한 브라우저나 서버에 저장

### 문제

기술 검색어에도 회사명·오류 로그·내부 식별자가 포함될 수 있다.

### 개선

필요하지 않다면 저장하지 않고, 저장하더라도 사용자 제어와 짧은 보존을 적용한다.

---

<!-- source message: 35 -->

## SEC-71. Full URL Analytics Leakage

### query·fragment를 포함한 URL 전체를 analytics로 전송

### 문제

검색어, 내부 식별자, 임시 token 같은 정보가 섞일 수 있다.

### 개선

수집 전에 URL을 정규화하고 민감한 parameter를 제거한다.

---

<!-- source message: 35 -->

## SEC-72. Error Logging with Page Content

### 검색 입력이나 편집 중 문서를 오류 리포트에 첨부

### 개선

기본적으로 최소한의 기술 정보만 수집하고 콘텐츠 본문은 제외한다.

---

<!-- source message: 35 -->

## SEC-73. Giscus as a First-Party Comment Store

### 댓글 데이터가 완전히 사이트 내부에서 관리된다고 생각

Giscus는 GitHub Discussions와 GitHub 계정에 의존하는 외부 integration이다.

### 개선

댓글을 쓰면 외부 서비스로 이동한다는 사실과 관련 정책을 명확히 보여준다.

---

<!-- source message: 35 -->

## SEC-74. Loading Comments Before User Intent

### 댓글을 읽지 않는 사용자에게도 즉시 외부 요청

### 개선

댓글 영역에 도달하거나 사용자가 열었을 때 로드하는 방식을 고려한다.

---

<!-- source message: 35 -->

## SEC-75. Advertising Identifier Assumptions

### AdSense를 단순 이미지 광고처럼 생각

### 문제

광고 ecosystem은 쿠키·식별자·동의·지역별 규제와 연결될 수 있다.

### 개선

광고 도입 시 Google의 최신 정책과 사용 지역의 요구사항을 별도로 확인한다.

---

# H. 도메인·HTTPS·배포

<!-- source message: 35 -->

## SEC-76. HTTPS Optional

### HTTP 접속도 그대로 허용

GitHub Pages는 HTTPS 강제를 지원하며, HTTPS는 전송 중 가로채기와 변조 위험을 줄인다. citeturn392708search37

### 개선

`Enforce HTTPS`를 활성화하고 내부 링크와 canonical도 HTTPS로 통일한다.

---

<!-- source message: 35 -->

## SEC-77. Mixed Content

### HTTPS 페이지에서 HTTP 이미지·script 로드

### 문제

브라우저 차단이나 콘텐츠 변조 위험이 생긴다.

### 개선

모든 외부 자원을 HTTPS로 사용하거나 자체 호스팅한다.

---

<!-- source message: 35 -->

## SEC-78. Dangling Custom Domain

### GitHub Pages 설정을 제거했지만 DNS는 남음

### 문제

도메인 소유권과 hosting 연결이 어긋나면 takeover 위험을 검토해야 한다.

### 개선

사이트 이전·삭제 시 DNS와 Pages 설정을 함께 정리한다.

---

<!-- source message: 35 -->

## SEC-79. DNS Change Without Verification

### custom domain 변경 후 인증서·리다이렉트·canonical 미검증

### 개선

다음을 함께 확인한다.

```text
HTTPS certificate
www/apex redirect
canonical URL
Sitemap
GitHub Pages domain verification
```

---

<!-- source message: 35 -->

## SEC-80. Preview Domain Indexed

### preview·staging 사이트가 검색에 노출

### 문제

중복 콘텐츠와 운영 전 콘텐츠 노출이 발생한다.

### 개선

preview 환경은 인증하거나 `noindex`를 적용하고 Sitemap에서 제외한다.

---

<!-- source message: 35 -->

## SEC-81. Source Map Exposure Without Need

### production JavaScript source map을 공개

### 문제

비밀이 직접 들어가면 안 되지만, 내부 코드 구조와 개발 경로를 불필요하게 노출할 수 있다.

### 개선

실제 오류 분석에 필요한지 판단하고 공개 여부를 결정한다.

---

<!-- source message: 35 -->

## SEC-82. Backup Files in Public Output

### 다음 파일이 `dist`에 포함

```text
.env
*.bak
draft.md
source.psd
private.json
```

### 개선

배포 artifact allowlist 또는 민감 파일 검사를 둔다.

---

# I. 콘텐츠와 개인정보 노출

<!-- source message: 35 -->

## SEC-83. Internal Log Publication

### 기술 설명을 위해 회사 로그를 그대로 게시

### 노출 가능 정보

- 내부 hostname
- IP
- 사용자 이름
- 경로
- repository URL
- 고객명
- device serial
- token
- 이메일

### 개선

로그는 게시 전 구조적으로 redact한다.

---

<!-- source message: 35 -->

## SEC-84. Screenshot Metadata Leakage

### 터미널이나 브라우저 전체 화면 캡처

### 문제

탭 제목·북마크·경로·이메일·알림이 노출될 수 있다.

### 개선

필요 영역만 crop하고 게시 전 별도 검토한다.

---

<!-- source message: 35 -->

## SEC-85. Image EXIF Leakage

### 사진 원본의 위치·기기 metadata 유지

### 개선

게시 파이프라인에서 불필요한 metadata를 제거한다.

---

<!-- source message: 35 -->

## SEC-86. Repository URL Leakage

### 비공개 GitLab·Jira·사내 도메인을 그대로 표시

### 문제

직접 접근되지 않더라도 조직 구조와 기술 환경을 노출한다.

### 개선

콘텐츠 가치에 필요하지 않으면 일반화한다.

---

<!-- source message: 35 -->

## SEC-87. Personal Path Leakage

```text
/Users/sangduk/...
/home/hawk/...
```

### 문제

사용자 계정명과 개발 환경이 드러난다.

### 개선

예제 경로로 치환한다.

---

<!-- source message: 35 -->

## SEC-88. Real Token in Tutorial

### 설명을 위해 실제 API key 형식 사용

### 문제

샘플과 실 secret을 구분하기 어렵고 자동 scanner에 탐지될 수 있다.

### 개선

명백한 placeholder를 사용한다.

```text
YOUR_GITHUB_TOKEN
example.invalid
```

---

<!-- source message: 35 -->

## SEC-89. Secret Redaction by Partial Mask

```text
ghp_abcd********
```

### 문제

token prefix와 길이, 일부 값이 재사용·식별에 도움이 될 수 있다.

### 개선

secret 전체를 placeholder로 교체한다.

---

<!-- source message: 35 -->

## SEC-90. Private Draft in Git History

### 공개되지 않게 `draft: true`만 설정

### 문제

공개 repository에는 원본 Markdown이 그대로 보인다.

### 개선

비공개 내용은 공개 저장소에 commit하지 않는다. Draft flag는 사이트 출력 제어이지 접근 통제가 아니다.

---

# J. 보안 운영

<!-- source message: 35 -->

## SEC-91. No Security Update Routine

### 취약점 알림이 올 때만 대응

### 개선

정기적으로 다음을 확인한다.

```text
dependency alerts
GitHub Actions versions
외부 integrations
CSP violations
노출된 secrets
도메인 설정
```

---

<!-- source message: 35 -->

## SEC-92. Alert Fatigue

### 모든 dependency 경고를 같은 우선순위로 처리

### 개선

```text
브라우저 runtime
빌드 실행
개발 전용
도달 불가능 경로
```

별로 분류한다.

---

<!-- source message: 35 -->

## SEC-93. Security Scanner as Proof of Safety

### scanner가 통과했으니 안전하다고 판단

### 문제

권한 설계, 개인정보 흐름, 잘못된 OAuth 구조 같은 문제는 단순 dependency scan으로 잡히지 않는다.

### 개선

자동 검사와 threat modeling을 함께 사용한다.

---

<!-- source message: 35 -->

## SEC-94. No Integration Inventory

### 어떤 외부 도메인과 서비스가 연결됐는지 모름

### 개선

```text
Service
Purpose
Loaded on
Data sent
Credentials
Owner
Removal procedure
```

형태의 간단한 목록을 둔다.

---

<!-- source message: 35 -->

## SEC-95. No Secret Rotation Plan

### token이 노출됐을 때 무엇을 바꿔야 하는지 모름

### 개선

secret별 위치·권한·회전·폐기 절차를 기록한다.

---

<!-- source message: 35 -->

## SEC-96. Incident Means Site Defacement Only

### 화면이 변조돼야 침해라고 생각

실제로는 다음도 incident다.

- 악성 script 삽입
- 광고 계정 오용
- Analytics 데이터 변조
- OAuth token 노출
- content repository 변경
- DNS 변경
- secret 유출

### 개선

탐지·차단·복구 범위를 넓게 정의한다.

---

<!-- source message: 35 -->

## SEC-97. No Deployment Provenance

### 어떤 workflow와 dependency로 배포됐는지 모름

### 개선

배포 artifact에 commit SHA, build 시각, 주요 tool version을 기록한다.

---

<!-- source message: 35 -->

## SEC-98. Manual Emergency Edit

### 운영 장애 때 생성된 HTML을 직접 수정

### 문제

원본과 운영 상태가 달라지고 다음 배포에서 되돌아간다.

### 개선

항상 원본 저장소에서 수정하고 긴급 rollback 절차를 마련한다.

---

<!-- source message: 35 -->

## SEC-99. Security Controls Without Tests

### CSP·redirect·admin 제한을 설정했지만 실제 검증 없음

### 개선

배포 후 자동 검사를 둔다.

```text
HTTPS 강제
security headers
admin route 노출
source map
민감 파일
외부 script 출처
```

---

<!-- source message: 35 -->

## SEC-100. Maximum Security Complexity

### 개인 블로그에 기업용 보안 플랫폼 구축

### 문제

보안 설정이 복잡해져 업데이트가 멈추거나 잘못된 정책을 방치하게 된다.

### 개선

위험에 비례한 단순한 방어가 더 적합하다.

```text
공개 사이트는 순수 정적
관리 기능 분리
외부 script 최소화
workflow 최소 권한
secret 없음
dependency 고정
HTTPS 강제
```

---

# hawk90에서 우선 확인할 15개

| 우선순위 | 안티패턴 | 이유 |
|---:|---|---|
| 1 | OAuth Secret in Static Client | 관리자 기능을 붙일 경우 구조적으로 가장 위험 |
| 2 | Editor Can Modify Workflow Files | 콘텐츠 권한이 코드 실행 권한으로 확대될 수 있음 |
| 3 | Actions Pinned by Mutable Tag | CI 공급망의 기본 점검 항목 |
| 4 | Default Broad Workflow Permissions | build와 deploy 권한 분리 필요 |
| 5 | Write Token in Build Job | 대형 dependency·generator 실행과 고권한 token 분리 |
| 6 | Third-Party Script Accumulation | Giscus·Analytics·AdSense가 누적될 가능성 |
| 7 | No Content Security Policy | 외부 script와 iframe 제어 기반 필요 |
| 8 | Markdown Is Trusted HTML | 자동 import·관리자 편집기 도입 시 중요 |
| 9 | Search Highlight via String Replacement | 클라이언트 검색 구현에서 흔한 XSS 경로 |
| 10 | Untrusted Markdown Executed During Build | TikZ·다이어그램 generator가 있는 구조 |
| 11 | Dependency Archaeology | 실제 용도를 모르는 editor·MDX package 점검 |
| 12 | Privacy Policy Drift | 광고·댓글·분석 기능과 정책 일치 필요 |
| 13 | Internal Log Publication | 기술 글에서 사내 환경 정보 노출 가능성 큼 |
| 14 | Private Draft in Git History | 공개 저장소에서는 Draft도 공개 자료 |
| 15 | Maximum Security Complexity | 블로그보다 보안 플랫폼 개발로 번지지 않게 제한 |

---

# 추천 보안 기준선

`hawk90.github.io`의 현실적인 기준선은 이 정도면 충분하다.

## 공개 사이트

```text
순수 static output
HTTPS 강제
raw HTML 최소화
CSP 적용 가능성 검토
외부 script 최소화
댓글·광고 지연 로드
민감 파일 artifact 검사
```

## GitHub Actions

```text
actions full SHA pin
permissions 최소화
build와 deploy job 분리
secret을 필요한 step에만 전달
외부 PR에서 위험한 generator 제한
dependency와 lockfile 별도 검토
```

GitHub는 full commit SHA 고정을 action을 immutable하게 사용하는 방법으로 안내하고 있다. citeturn392708search1

## 관리자 편집기

```text
가능하면 공개 블로그와 별도 앱
정적 bundle에 secret 금지
fine-grained token
콘텐츠 경로만 수정
workflow·config 수정 금지
authorization server-side 검증
commit conflict 검출
```

## 콘텐츠

```text
로그·스크린샷 redaction
실 token 금지
사내 hostname 일반화
공개 저장소에 비공개 draft 금지
외부 SVG·iframe 허용 목록
```

---

# 이번 단계의 핵심 결론

정적 블로그의 가장 강한 보안 전략은 기능을 많이 붙인 뒤 복잡한 방어를 추가하는 것이 아니다.

> **공개 사이트는 가능한 한 정적으로 유지하고, 신뢰가 필요한 관리자·OAuth·쓰기 기능을 별도 경계로 분리하는 것**이 가장 효과적이다.

특히 네 사이트에서 위험이 커질 수 있는 지점은 Astro나 Markdown 자체보다 다음이다.

```text
GitHub Actions
외부 JavaScript
콘텐츠 generator
관리자 편집기
GitHub OAuth
공개 저장소의 로그와 초안
```

OWASP도 제3자 JavaScript 제한, CSP 같은 브라우저 방어 기능, dependency 관리가 공격 표면 축소에 중요하다고 안내한다. citeturn392708search34turn392708search39turn392708search44

다음 단계는 **Task 2-9. Observability, Analytics & Experimentation Anti-patterns**다. 방문자 분석, Search Console, Core Web Vitals, 로그, A/B 테스트, AdSense 지표와 블로그 운영 의사결정에서 발생하는 안티패턴을 정리하게 된다.

<!-- source message: 36 -->

## O-01. Analytics Without a Question

### 질문 없이 분석 도구부터 설치

### 증상

- 페이지뷰를 매일 확인
- 방문자 수는 알지만 무엇을 바꿀지 모름
- 이벤트는 많지만 의사결정에 쓰지 않음

### 개선

먼저 질문을 정한다.

```text
어떤 Topic Hub가 실제 탐색을 만든다?
검색 사용자는 원하는 글을 찾는가?
대표 글 20개가 내부 이동을 만드는가?
```

---

<!-- source message: 36 -->

## O-02. Pageview as Success

### 페이지뷰가 많으면 성공이라고 판단

### 문제

기술 글은 검색 결과에서 잠깐 열렸다 바로 닫혀도 페이지뷰가 발생한다.

### 함께 볼 지표

- 다음 내부 페이지 이동
- Topic Hub 이동
- 검색 후 결과 클릭
- 재방문
- 관련 글 선택
- 오류 제보
- 외부 코드·자료 링크 사용

---

<!-- source message: 36 -->

## O-03. Traffic Without Intent

### 모든 방문자를 같은 트래픽으로 봄

다음 방문은 의미가 다르다.

```text
정확한 오류 검색
개념 학습
시리즈 탐색
이력서·포트폴리오 확인
우연한 유입
```

### 개선

페이지 유형과 검색 의도를 분리해서 본다.

---

<!-- source message: 36 -->

## O-04. Sitewide Average Trap

### 사이트 전체 평균만 확인

예:

```text
평균 체류시간 2분
평균 이탈률 70%
```

### 문제

Reference 글과 장문 Guide를 같은 기준으로 평가할 수 없다.

### 개선

다음 단위로 나눈다.

```text
Content Type
Topic
길이
유입 채널
신규/재방문
모바일/데스크톱
```

---

<!-- source message: 36 -->

## O-05. Bounce Rate Panic

### 이탈률이 높으면 글이 나쁘다고 판단

특정 에러 해결 글은 한 페이지만 읽고 문제를 해결한 뒤 떠나는 것이 정상일 수 있다.

### 개선

페이지 목적에 맞는 성공 조건을 둔다.

```text
Debug Note:
정답을 빠르게 찾는 것

Guide:
다음 글이나 Topic Hub로 이동하는 것
```

---

<!-- source message: 36 -->

## O-06. Time-on-Page as Understanding

### 오래 머물면 잘 읽었다고 판단

### 문제

- 탭을 열어두었을 수 있음
- 이해가 어려워 오래 걸렸을 수 있음
- 코드 복사를 위해 방치했을 수 있음

### 개선

시간은 보조 지표로만 사용한다.

---

<!-- source message: 36 -->

## O-07. Scroll Depth as Completion

### 100% 스크롤을 완독으로 간주

### 문제

빠르게 끝까지 내렸을 수도 있고, TOC 링크로 이동했을 수도 있다.

### 개선

- 주요 섹션 도달
- 결론 노출
- 다음 글 클릭
- 코드 복사
- 허브 이동

등과 함께 본다.

---

<!-- source message: 36 -->

## O-08. Event Everything

### 모든 클릭을 이벤트로 수집

### 문제

- 데이터 비용 증가
- 개인정보 흐름 확대
- 분석이 복잡해짐
- 의미 없는 이벤트가 대부분

### 개선

실제 결정과 연결되는 이벤트만 남긴다.

---

<!-- source message: 36 -->

## O-09. Event Naming Drift

### 같은 행동을 여러 이름으로 기록

```text
search_click
search-result-click
click_search_result
```

### 문제

대시보드와 비교가 어려워진다.

### 개선

이벤트 taxonomy를 짧게 정의한다.

---

<!-- source message: 36 -->

## O-10. Analytics Schema Without Versioning

### 이벤트 구조를 바꾸지만 변경 시점을 기록하지 않음

### 문제

이전 데이터와 이후 데이터를 같은 기준으로 비교하게 된다.

### 개선

이벤트 버전 또는 배포 시점을 남긴다.

---

# Search Console

<!-- source message: 36 -->

## O-11. Impression Obsession

### 노출 수 증가만 성공으로 판단

### 문제

관련성이 낮은 검색어에 많이 노출될 수도 있다.

### 함께 볼 것

```text
검색어 의도
평균 순위
클릭률
실제 페이지 만족도
내부 이동
```

---

<!-- source message: 36 -->

## O-12. CTR Without Position Context

### CTR이 낮다고 제목을 즉시 변경

### 문제

평균 순위 20위의 CTR과 2위의 CTR은 비교할 수 없다.

### 개선

순위 구간과 검색어 의도를 함께 본다.

---

<!-- source message: 36 -->

## O-13. Average Position Worship

### 평균 순위 한 숫자에 집중

### 문제

서로 다른 검색어·국가·기기·페이지가 섞인다.

### 개선

핵심 검색어군과 대표 페이지 단위로 추적한다.

---

<!-- source message: 36 -->

## O-14. Query Chasing

### Search Console에 새 검색어가 보이면 곧바로 새 글 작성

### 문제

비슷한 글이 계속 늘고 Topic Cannibalization이 발생한다.

### 개선

먼저 판단한다.

```text
기존 글 보완?
FAQ 추가?
소제목 추가?
새 독립 글?
```

---

<!-- source message: 36 -->

## O-15. Zero-Click Misdiagnosis

### 노출은 많은데 클릭이 적으면 무조건 실패

### 가능성

- 검색 결과에서 답이 이미 보임
- 제목이 검색 의도와 다름
- 순위가 낮음
- 다른 페이지가 더 대표적임

원인을 구분해야 한다.

---

<!-- source message: 36 -->

## O-16. Index Coverage as a Score

### 색인된 페이지 수가 많을수록 좋다고 생각

### 문제

얕은 태그·아카이브 페이지까지 색인될 수 있다.

### 개선

색인 수보다 **색인할 가치가 있는 페이지가 제대로 색인됐는가**를 본다.

---

<!-- source message: 36 -->

## O-17. “Crawled, Not Indexed” Mass Fix

### 해당 상태의 모든 페이지를 억지로 색인시키려 함

### 문제

일부 페이지는 실제로 색인 가치가 낮을 수 있다.

### 개선

다음으로 분류한다.

```text
핵심 글
중복 글
얕은 목록
구판
Draft/실험 페이지
```

---

<!-- source message: 36 -->

## O-18. URL Inspection as a Workflow

### 페이지마다 수동 색인 요청

### 문제

구조적 문제를 수동 요청으로 가린다.

### 개선

내부 링크·Sitemap·canonical·콘텐츠 품질을 먼저 수정한다.

---

<!-- source message: 36 -->

## O-19. Search Console Without Change Log

### 제목·구조·canonical 변경 후 기록 없음

### 문제

몇 주 뒤 지표 변화의 원인을 찾기 어렵다.

### 개선

SEO 변경 로그를 유지한다.

---

<!-- source message: 36 -->

## O-20. Short Evaluation Window

### 변경 후 며칠만 보고 성공·실패 판단

검색 반영에는 시간이 걸릴 수 있다.

### 개선

변경 규모에 따라 관찰 기간을 정하고 성급한 재변경을 피한다.

---

# Core Web Vitals와 성능

<!-- source message: 36 -->

## O-21. Lab Data as Reality

### Lighthouse 결과만으로 실제 사용자 경험을 판단

### 문제

테스트 환경과 실제 기기·네트워크는 다르다.

### 개선

lab data와 field data를 함께 본다.

---

<!-- source message: 36 -->

## O-22. Field Data Without Page Type

### 사이트 전체 Core Web Vitals만 확인

### 문제

홈·일반 글·코드가 많은 글·검색 페이지의 병목이 다르다.

### 개선

페이지 유형별로 측정한다.

---

<!-- source message: 36 -->

## O-23. Lighthouse 100 Theater

### 100점이 아니면 실패

### 문제

사용자가 체감하지 못하는 미세 최적화에 시간을 쓴다.

### 개선

임계값을 넘은 뒤에는 콘텐츠와 탐색 문제를 우선한다.

---

<!-- source message: 36 -->

## O-24. Synthetic Benchmark Drift

### 테스트 환경이 계속 바뀜

### 문제

이전 결과와 비교할 수 없다.

### 개선

- 기기
- 네트워크
- 브라우저
- 페이지
- 캐시 상태

를 고정한다.

---

<!-- source message: 36 -->

## O-25. Homepage-Only Performance

### 홈만 측정

### 문제

실제 검색 유입은 긴 글 페이지로 들어올 가능성이 높다.

### 개선

대표 페이지 세트를 둔다.

```text
홈
일반 글
코드 많은 글
수식·다이어그램 글
검색
Topic Hub
```

---

<!-- source message: 36 -->

## O-26. Best-Case Page Benchmark

### 이미지와 코드가 거의 없는 가벼운 글만 테스트

### 개선

최악 또는 상위 95% 복잡도 페이지를 포함한다.

---

<!-- source message: 36 -->

## O-27. No Performance Regression Baseline

### 최적화 전 수치가 없음

### 문제

변경이 실제로 좋아졌는지 알 수 없다.

### 개선

배포별 주요 수치를 보존한다.

---

<!-- source message: 36 -->

## O-28. Single Run Performance Test

### 한 번의 Lighthouse 결과로 판단

### 문제

네트워크·CPU 노이즈가 크다.

### 개선

여러 번 측정하고 중앙값을 사용한다.

---

<!-- source message: 36 -->

## O-29. Bundle Size Without Execution Cost

### JS 파일 크기만 확인

### 문제

작은 파일도 실행 비용이 클 수 있고, 큰 파일도 거의 실행되지 않을 수 있다.

### 개선

- 다운로드
- parse
- compile
- execution
- main-thread blocking

을 함께 본다.

---

<!-- source message: 36 -->

## O-30. Performance Dashboard Without Ownership

### 지표는 있지만 누가 어떤 조건에서 고칠지 없음

### 개선

예산 초과 시 대응 규칙을 정한다.

---

# 내부 검색 관측

<!-- source message: 36 -->

## O-31. Search Usage as Success

### 검색 사용률이 높으면 검색이 좋다고 생각

### 반대 가능성

내비게이션이 나빠서 검색에 의존할 수도 있다.

### 개선

검색 사용률과 Topic 탐색 성공률을 함께 본다.

---

<!-- source message: 36 -->

## O-32. No-Result Query Ignored

### 결과 없는 검색어를 수집하지 않음

### 개선

개인정보를 최소화하면서 다음을 확인한다.

- 용어 alias 부족
- 한글·영문 차이
- 실제 콘텐츠 공백
- 오타

---

<!-- source message: 36 -->

## O-33. Search Query Collection Without Privacy

### 사용자가 입력한 전체 검색어를 외부 Analytics로 전송

### 문제

회사명·오류 메시지·내부 식별자가 들어갈 수 있다.

### 개선

가능하면 집계형으로 처리하거나 로컬 분석을 고려한다.

---

<!-- source message: 36 -->

## O-34. Search Click Without Success Signal

### 결과 클릭만 측정

### 문제

잘못 클릭했을 수도 있다.

### 개선

검색 후 다음 행동을 함께 본다.

```text
즉시 뒤로 가기
본문 체류
다음 내부 이동
검색 재시도
```

---

<!-- source message: 36 -->

## O-35. Search Ranking Changed Without Evaluation Set

### 알고리즘을 바꾸고 체감으로만 판단

### 개선

대표 검색어와 기대 결과 목록을 만든다.

예:

```text
"PCIe BAR"
"CXL NUMA"
"CUDA pinned memory"
"UEFI secure boot"
```

---

<!-- source message: 36 -->

## O-36. Popular Query Bias

### 많이 검색된 주제만 개선

### 문제

희귀하지만 중요한 전문 검색어가 무시된다.

### 개선

빈도와 중요도를 별도로 평가한다.

---

<!-- source message: 36 -->

## O-37. Search Metrics Distorted by Author

### 본인이 테스트한 검색이 사용자 데이터에 섞임

### 개선

개발·관리자 트래픽을 제외하거나 별도로 표시한다.

---

<!-- source message: 36 -->

## O-38. Search Index Size Without Query Quality

### 인덱스를 줄이는 것만 목표

### 문제

필요한 본문 정보까지 제거할 수 있다.

### 개선

크기와 검색 품질을 함께 평가한다.

---

<!-- source message: 36 -->

## O-39. Search Quality by Anecdote

### 검색 한두 번 잘 되면 충분하다고 판단

### 개선

정확도 평가 세트를 만든다.

```text
정확한 제목 검색
약어 검색
한글·영문 검색
오류 메시지 검색
상위 개념 검색
```

---

<!-- source message: 36 -->

## O-40. Zero-Result Auto-Content Generation

### 검색 결과가 없으면 자동으로 새 글 후보 생성

### 문제

노이즈·오타·민감 검색어를 콘텐츠 계획으로 오인할 수 있다.

### 개선

반복 빈도, 기존 글 보완 가능성, 사이트 정체성을 함께 판단한다.

---

# 콘텐츠 성과

<!-- source message: 36 -->

## O-41. Every Article Needs Traffic

### 모든 글이 높은 유입을 가져야 한다고 생각

### 문제

Reference·희귀 장애 기록은 트래픽이 적어도 가치가 높을 수 있다.

### 개선

콘텐츠 역할별 성공 기준을 둔다.

---

<!-- source message: 36 -->

## O-42. Low Traffic Means Delete

### 방문이 적은 글을 자동 삭제 후보로 분류

### 문제

- 신규 글
- 희귀한 전문 글
- 내부 선행 개념
- 포트폴리오 가치

를 놓칠 수 있다.

### 개선

트래픽 외에 구조적 중요성과 독창성을 본다.

---

<!-- source message: 36 -->

## O-43. High Traffic Means Good

### 많이 방문한 글을 무조건 대표 문서로 선정

### 문제

제목이 자극적이거나 넓은 검색어에 우연히 걸렸을 수 있다.

### 개선

정확성·전문성·내부 연결·전환을 함께 본다.

---

<!-- source message: 36 -->

## O-44. Traffic-Only Featured Content

### 홈 Featured가 인기순 자동 정렬

### 문제

사이트가 이미 잘되는 주제만 반복 강조한다.

### 개선

편집자 선정과 데이터를 함께 사용한다.

---

<!-- source message: 36 -->

## O-45. No Content Cohort Analysis

### 글을 모두 한 덩어리로 비교

### 개선

```text
발행 연도
콘텐츠 타입
Topic
업데이트 여부
직접 실험 포함 여부
```

로 묶어서 비교한다.

---

<!-- source message: 36 -->

## O-46. New vs Updated Content Confusion

### 신규 글과 기존 글 업데이트 효과를 구분하지 않음

### 개선

두 작업의 성과를 별도로 기록한다.

---

<!-- source message: 36 -->

## O-47. No Internal Journey Analysis

### 어떤 글을 읽고 다음 어디로 이동하는지 모름

### 개선

대표 학습 경로를 확인한다.

```text
Topic Hub
→ Guide
→ Concept
→ Debug Note
```

---

<!-- source message: 36 -->

## O-48. Funnel Thinking for Every Reader

### 블로그를 판매 전환 funnel처럼만 분석

### 문제

기술 지식 사이트의 목표는 학습·문제 해결·신뢰 형성일 수 있다.

### 개선

독자 목적에 맞는 journey를 정의한다.

---

<!-- source message: 36 -->

## O-49. Completion Rate Without Content Type

### 모든 글에 같은 완독 기준

### 개선

Reference는 빠른 정보 발견, Guide는 주요 섹션 소비처럼 다르게 본다.

---

<!-- source message: 36 -->

## O-50. No Qualitative Feedback

### 숫자만 보고 판단

### 문제

왜 어려웠는지, 무엇이 부족했는지 알 수 없다.

### 개선

- 댓글
- 오류 제보
- 짧은 피드백
- GitHub Issue
- 독자 인터뷰

를 제한적으로 활용한다.

---

# AdSense 측정

<!-- source message: 36 -->

## O-51. RPM as the Primary Product Metric

### 광고 수익을 사이트 품질의 대표 지표로 사용

### 문제

광고가 잘 보이는 구조와 좋은 기술 문서 구조는 충돌할 수 있다.

### 개선

수익은 제약 조건 안에서 최적화한다.

---

<!-- source message: 36 -->

## O-52. Revenue Without Page-Type Segmentation

### 모든 페이지의 광고 성과를 합쳐 봄

### 문제

긴 Guide와 짧은 Reference의 광고 기회가 다르다.

### 개선

페이지 유형별 수익과 사용자 경험을 분리해서 본다.

---

<!-- source message: 36 -->

## O-53. High Revenue, Poor Experience Ignored

### 광고 수익이 늘면 CLS·이탈·읽기 방해를 무시

### 개선

다음을 같이 본다.

```text
RPM
CLS
페이지 체류
내부 이동
모바일 종료
광고 차단 증가
```

---

<!-- source message: 36 -->

## O-54. Ad Click Optimization

### 광고 클릭을 늘리는 배치 실험

### 문제

오인 클릭이나 콘텐츠 방해를 유도할 수 있다.

### 개선

광고는 콘텐츠와 명확히 구분하고 클릭이 아니라 장기적인 페이지 경험과 정책 준수를 우선한다.

---

<!-- source message: 36 -->

## O-55. Auto Ads as a Black Box

### 자동 광고가 어디에 들어가는지 모름

### 개선

페이지 유형별 실제 삽입 위치를 검토하고 제외 영역을 관리한다.

---

<!-- source message: 36 -->

## O-56. Revenue Data Without Traffic Quality

### 수익 증가가 검색 품질 개선 때문인지 광고 밀도 증가 때문인지 모름

### 개선

트래픽·광고 설정·페이지 구조 변경을 구분해서 기록한다.

---

<!-- source message: 36 -->

## O-57. Ad Experiment Without Guardrails

### 광고 개수와 위치를 자유롭게 실험

### 개선

다음 안전 기준을 둔다.

```text
본문 시작 전 광고 금지
코드-설명 사이 금지
절차 중간 금지
CLS 예산
모바일 고정 광고 제한
```

---

<!-- source message: 36 -->

## O-58. Short-Term Revenue Winner

### 며칠 수익이 높은 배치를 채택

### 문제

요일·트래픽 구성·광고 입찰 변동에 영향을 받는다.

### 개선

충분한 기간과 표본을 확보하고 사용자 경험 지표도 함께 본다.

---

<!-- source message: 36 -->

## O-59. AdSense Rejection as Analytics Problem

### 승인 거절 원인을 지표 부족으로 해석

### 문제

실제 문제는 콘텐츠·신뢰·색인·정책일 수 있다.

### 개선

승인 전에는 수익 분석보다 사이트 품질 감사를 우선한다.

---

<!-- source message: 36 -->

## O-60. Revenue Attribution to a Single Change

### 허브 페이지 추가 후 수익이 늘었다고 즉시 인과 추론

### 문제

검색 순위, 계절성, 광고 시장 등 다른 변수가 많다.

### 개선

변경 로그와 충분한 관찰 기간을 사용한다.

---

# 실험과 A/B 테스트

<!-- source message: 36 -->

## O-61. A/B Test Before Enough Traffic

### 방문자가 적은데 실험부터 시행

### 문제

통계적으로 의미 있는 결과가 나오기 어렵다.

### 개선

저트래픽 사이트에서는 명확한 UX 원칙과 정성 평가가 더 효율적이다.

---

<!-- source message: 36 -->

## O-62. Testing Cosmetic Details First

### 버튼 색, 그림자, radius를 먼저 실험

### 문제

더 큰 구조적 문제를 놓친다.

### 우선 실험 대상

```text
홈의 Topic 구조
대표 글 노출
검색 결과 문맥
관련 글 관계
광고 위치
```

---

<!-- source message: 36 -->

## O-63. Multiple Variables in One Experiment

### 홈 구조·제목·광고·색상을 동시에 변경

### 문제

어떤 변화가 결과를 만들었는지 알 수 없다.

### 개선

한 실험에서 핵심 가설 하나만 다룬다.

---

<!-- source message: 36 -->

## O-64. No Experiment Hypothesis

### “이게 더 좋아 보인다” 수준

### 개선 예

```text
Topic Hub를 최신 글보다 먼저 노출하면,
신규 방문자의 두 번째 페이지 이동률이 증가할 것이다.
```

---

<!-- source message: 36 -->

## O-65. No Primary Metric

### 여러 지표 중 어떤 것을 기준으로 결정할지 없음

### 개선

주요 지표 하나와 안전 지표를 정한다.

```text
Primary:
내부 페이지 이동률

Guardrails:
LCP, CLS, 검색 종료율
```

---

<!-- source message: 36 -->

## O-66. Metric Shopping

### 원하는 결론이 나올 때까지 유리한 지표 선택

### 개선

실험 전에 판단 기준을 기록한다.

---

<!-- source message: 36 -->

## O-67. Stopping When It Looks Good

### 중간에 좋은 결과가 나오면 종료

### 문제

초기 변동을 승리로 오인할 수 있다.

### 개선

사전에 기간이나 표본 기준을 정한다.

---

<!-- source message: 36 -->

## O-68. Experiment Contamination

### 본인 테스트·봇·개발 트래픽이 실험에 포함

### 개선

가능한 범위에서 제외한다.

---

<!-- source message: 36 -->

## O-69. No Segment Analysis

### 전체 평균만 보고 결론

### 문제

모바일에서는 좋아지고 데스크톱에서는 나빠질 수 있다.

### 개선

중요 세그먼트를 사전에 정한다.

---

<!-- source message: 36 -->

## O-70. Segment Fishing

### 결과가 나올 때까지 세그먼트를 계속 쪼갬

### 개선

주요 세그먼트만 미리 정의한다.

---

<!-- source message: 36 -->

## O-71. Novelty Effect Ignored

### 새 디자인 직후의 반응을 장기 효과로 판단

### 개선

초기와 안정화 기간을 구분한다.

---

<!-- source message: 36 -->

## O-72. A/B Test Adds Permanent Complexity

### 실험 코드가 끝난 뒤에도 flag와 분기가 남음

### 개선

승자 결정 후 실험 코드와 이벤트를 제거한다.

---

<!-- source message: 36 -->

## O-73. Feature Flag Cemetery

### 과거 실험 flag가 계속 남음

### 개선

flag마다 만료일과 소유 목적을 둔다.

---

<!-- source message: 36 -->

## O-74. Experiment Without Accessibility Check

### 클릭률만 개선되면 채택

### 문제

키보드·스크린리더·모션 민감 사용자에게 나빠질 수 있다.

### 개선

접근성은 실험 대상이 아니라 기본 guardrail로 둔다.

---

<!-- source message: 36 -->

## O-75. Dark Pattern Experimentation

### 더 많은 클릭을 위해 혼동을 실험

### 문제

광고·뉴스레터·내비게이션 오인 클릭을 유도할 수 있다.

### 개선

사용자 의도가 명확한 실험만 수행한다.

---

# 빌드와 운영 관측

<!-- source message: 36 -->

## O-76. Build Time Without Stage Breakdown

### 총 빌드 시간만 기록

### 문제

Shiki, OG, 검색, Markdown 중 어디가 병목인지 모른다.

### 개선

단계별 시간을 측정한다.

---

<!-- source message: 36 -->

## O-77. Memory Peak Without Context

### peak RSS 숫자만 확인

### 개선

페이지 수·코드 블록 수·변경량과 함께 기록한다.

---

<!-- source message: 36 -->

## O-78. No Artifact Size Tracking

### dist가 커져도 알 수 없음

### 개선

다음을 분리한다.

```text
HTML
JS
CSS
Images
Search Index
OG Assets
```

---

<!-- source message: 36 -->

## O-79. CI Success Rate Ignored

### 가끔 실패해도 재실행으로 해결

### 문제

flaky build가 정상화된다.

### 개선

실패율과 원인을 추적한다.

---

<!-- source message: 36 -->

## O-80. Mean Build Time Only

### 평균만 확인

### 문제

간헐적인 매우 느린 빌드를 숨길 수 있다.

### 개선

median과 p95를 함께 본다.

---

<!-- source message: 36 -->

## O-81. No Changed-File Correlation

### 어떤 변경이 빌드 비용을 늘렸는지 모름

### 개선

변경된 글 수·코드 블록·이미지 수와 빌드 시간을 함께 기록한다.

---

<!-- source message: 36 -->

## O-82. Tooling Metrics Without Action Threshold

### 수치는 쌓이지만 경고 기준이 없음

### 개선

예:

```text
검색 인덱스 +20% → 검토
build p95 5분 초과 → 이슈
HTML 총량 +15% → diff 확인
```

---

<!-- source message: 36 -->

## O-83. Dashboard Graveyard

### 대시보드는 만들었지만 보지 않음

### 개선

정기적으로 확인할 핵심 화면 하나만 유지한다.

---

<!-- source message: 36 -->

## O-84. Manual Spreadsheet Metrics

### 지표를 수동 복사

### 문제

지속성이 낮고 오류가 발생한다.

### 개선

가능한 범위에서 자동 수집하되, 복잡한 플랫폼을 새로 만들지는 않는다.

---

<!-- source message: 36 -->

## O-85. Observability Platform Before Need

### 개인 블로그에 Grafana·데이터 웨어하우스 구축

### 문제

사이트보다 관측 시스템 유지가 더 커진다.

### 개선

Search Console, 간단한 Analytics, CI artifact 정도로 시작한다.

---

# 개인정보와 데이터 품질

<!-- source message: 36 -->

## O-86. Collect Now, Decide Later

### 나중에 쓸 수 있으니 모든 데이터를 저장

### 문제

개인정보 위험과 분석 복잡성이 증가한다.

### 개선

명확한 목적이 없는 데이터는 수집하지 않는다.

---

<!-- source message: 36 -->

## O-87. No Data Retention Policy

### 이벤트를 무기한 보존

### 개선

실제 비교에 필요한 기간만 유지한다.

---

<!-- source message: 36 -->

## O-88. Raw Query Logging

### 내부 검색어 원문 전체 저장

### 문제

민감한 오류·회사명·내부 정보가 포함될 수 있다.

### 개선

집계·정규화·익명화 가능성을 검토한다.

---

<!-- source message: 36 -->

## O-89. Full IP Dependence

### 사용자 구분을 위해 IP에 과도하게 의존

### 개선

필요 최소한의 집계 방식으로 제한한다.

---

<!-- source message: 36 -->

## O-90. Author Traffic Pollution

### 본인 방문과 자동화 트래픽이 성과에 포함

### 개선

개발자·봇·preview 트래픽을 가능한 범위에서 제외한다.

---

<!-- source message: 36 -->

## O-91. Bot Traffic as Popularity

### 크롤러 방문을 인기 글로 오인

### 개선

사람과 bot traffic을 분리한다.

---

<!-- source message: 36 -->

## O-92. Duplicate Pageview After Client Navigation

### ClientRouter 전환에서 pageview가 중복 기록

### 문제

페이지별 트래픽이 과대 계산된다.

### 개선

초기 load와 client navigation tracking을 명확히 분리한다.

---

<!-- source message: 36 -->

## O-93. Missing Pageview After Client Navigation

### 반대로 SPA 전환이 Analytics에 기록되지 않음

### 개선

페이지 생명주기를 중앙화하고 테스트한다.

---

<!-- source message: 36 -->

## O-94. URL Fragment Cardinality

### heading anchor마다 별도 페이지처럼 수집

### 문제

같은 글이 수많은 경로로 분할된다.

### 개선

분석 URL에서는 fragment를 제거하거나 별도 section event로 처리한다.

---

<!-- source message: 36 -->

## O-95. Query Parameter Cardinality

### 검색·필터 parameter 조합이 페이지 차원을 폭증

### 개선

canonical page path와 interaction event를 분리한다.

---

# 의사결정과 조직화

<!-- source message: 36 -->

## O-96. Metrics Without Editorial Judgment

### 숫자가 콘텐츠 우선순위를 자동 결정

### 문제

희귀하지만 중요한 전문 글을 제거하게 될 수 있다.

### 개선

데이터는 후보를 제시하고 최종 판단은 콘텐츠 가치와 전략을 포함한다.

---

<!-- source message: 36 -->

## O-97. Editorial Judgment Without Metrics

### 반대로 감으로만 결정

### 개선

대표 글 선정, 허브 개선, 검색 품질은 최소한의 데이터를 참고한다.

---

<!-- source message: 36 -->

## O-98. No Decision Log

### 왜 홈 구조를 바꿨는지 기록 없음

### 개선

작은 변경 로그를 남긴다.

```text
가설
변경
관찰 기간
결과
후속 결정
```

---

<!-- source message: 36 -->

## O-99. Constant Optimization

### 매주 구조와 제목을 변경

### 문제

지표가 안정화되기 전에 다시 바뀐다.

### 개선

명확한 개선 주기와 관찰 기간을 둔다.

---

<!-- source message: 36 -->

## O-100. Measurement as Product

### 측정 체계 구축 자체가 목적

### 문제

블로그와 콘텐츠 개선보다 dashboard와 event 설계에 시간을 더 쓴다.

### 개선

측정은 다음 세 질문에만 답하면 충분하다.

```text
독자가 원하는 글을 찾는가?
대표 콘텐츠로 이어지는가?
사이트 변경이 실제로 나아졌는가?
```

---

# hawk90에서 우선 확인할 15개

| 우선순위 | 안티패턴 | 이유 |
|---:|---|---|
| 1 | Analytics Without a Question | 지표 설치보다 개선 질문이 먼저 |
| 2 | Pageview as Success | 기술 글의 문제 해결 가치를 반영하지 못함 |
| 3 | Sitewide Average Trap | Guide·Debug·Reference 성격이 다름 |
| 4 | Query Chasing | 검색어마다 신규 글을 만들면 중복 증가 |
| 5 | Index Coverage as a Score | 얕은 페이지까지 색인하려는 위험 |
| 6 | Homepage-Only Performance | 실제 유입은 장문 글일 가능성이 큼 |
| 7 | Search Usage as Success | 내비게이션 실패 때문에 검색이 늘 수도 있음 |
| 8 | No-Result Query Ignored | alias와 콘텐츠 공백을 찾는 데 유용 |
| 9 | Search Query Collection Without Privacy | 내부 오류·회사명이 포함될 가능성 |
| 10 | Every Article Needs Traffic | 희귀 시스템 글의 장기 가치 보존 필요 |
| 11 | High Traffic Means Good | 대표 글은 전문성과 구조도 봐야 함 |
| 12 | RPM as Primary Product Metric | 광고가 문서 품질을 지배하지 않게 해야 함 |
| 13 | A/B Test Before Enough Traffic | 저트래픽에서는 정성 평가가 더 효율적 |
| 14 | Build Time Without Stage Breakdown | 8GB heap·대량 코드 블록 병목 분석 필요 |
| 15 | Measurement as Product | 블로그보다 관측 플랫폼이 커지는 것을 방지 |

# 추천 최소 관측 체계

복잡한 분석 플랫폼은 필요 없다.

## Search Console

```text
대표 페이지의 검색어·노출·클릭
색인되지 않은 핵심 페이지
구판과 신판 경쟁
Topic별 유입 변화
```

## 사용자 탐색

```text
Topic Hub → 글 이동
글 → 다음 글 이동
검색 → 결과 클릭
검색 결과 없음
```

## 성능

```text
홈
대표 Guide
코드가 많은 글
검색 페이지
```

의 LCP·INP·CLS와 주요 자산 크기.

## 빌드

```text
총 시간
peak memory
Shiki 시간
검색 인덱스 크기
dist 크기
```

## 콘텐츠 운영

```text
대표 글 20개의 업데이트 상태
고아 문서
중복 후보
Needs Review 문서
깨진 내부 링크
```

# 이번 단계의 핵심 결론

분석에서 가장 흔한 실수는 이것이다.

> 측정 가능한 것을 중요한 것으로 착각하는 것.

페이지뷰, 체류시간, RPM은 쉽게 측정되지만 네 블로그의 핵심 가치는 다음에 가깝다.

```text
희귀한 기술 문제를 정확히 설명함
여러 시스템 개념을 연결함
실제 로그와 경험을 남김
다음 학습 경로를 제공함
오래된 지식을 신뢰 가능하게 관리함
```

따라서 관측 체계도 이 가치를 강화하는 수준에서 멈춰야 한다.

<!-- source message: 37 -->

## G-01. Topic Impulse Publishing

### 떠오른 주제를 바로 새 글로 작성

### 증상

- 콘텐츠 지도 확인 없이 새 파일 생성
- 기존 글과 중복 여부를 확인하지 않음
- 아이디어가 생긴 순서대로 게시
- 사이트의 핵심 분야와 무관한 글이 늘어남

### 문제

개별 글은 괜찮아도 전체 사이트의 방향이 흐려진다.

### 개선

새 글을 쓰기 전에 다음 네 가지를 확인한다.

```text
기존 글 보완인가
독립적인 검색 의도가 있는가
핵심 Topic에 속하는가
직접 경험이나 고유 분석이 있는가
```

---

<!-- source message: 37 -->

## G-02. Backlog as a Graveyard

### 아이디어를 계속 쌓지만 우선순위가 없음

### 증상

- 초안 제목 수백 개
- 오래된 아이디어가 계속 남음
- 무엇부터 쓸지 결정하는 데 시간이 걸림
- 비슷한 아이디어가 중복 등록됨

### 개선

아이디어를 최소 네 상태로 분류한다.

```text
Next
Research
Merge into existing
Drop
```

---

<!-- source message: 37 -->

## G-03. SEO Query Becomes Editorial Strategy

### 검색어가 보이면 바로 콘텐츠 계획에 추가

### 문제

사이트 정체성과 무관한 주제가 늘어나고, 비슷한 검색어별 글이 분열된다.

### 개선

검색어는 글 후보가 아니라 다음 중 하나의 신호로 해석한다.

```text
기존 글 제목 문제
기존 글 설명 부족
alias 부족
FAQ 필요
실제 콘텐츠 공백
```

---

<!-- source message: 37 -->

## G-04. Trend Chasing

### 유행 기술을 빠르게 다루는 것이 우선

### 증상

- 최신 프레임워크 뉴스
- 발표 요약
- 릴리스 노트 재정리
- 일시적인 검색 유입 위주

### 문제

네 블로그의 강점인 저수준 시스템·실무 경험과 차별성이 약해질 수 있다.

### 개선

유행 주제라도 다음과 연결될 때 작성한다.

```text
기존 전문 분야
직접 실험
장기 참고 가치
고유한 해석
```

---

<!-- source message: 37 -->

## G-05. Coverage Anxiety

### 모든 주제를 다뤄야 한다는 압박

### 문제

- 얕은 입문 글 증가
- 전문 분야의 깊이 약화
- 유지해야 할 문서 범위 폭증

### 개선

다루지 않을 영역도 명시적으로 정한다.

```text
핵심적으로 다룸
필요할 때만 다룸
다루지 않음
```

---

<!-- source message: 37 -->

## G-06. Publication Cadence Fetish

### 정해진 주기에 맞추기 위해 글을 발행

### 증상

- 주 3회 발행이 목표
- 미완성 글도 일정 때문에 공개
- 기존 글 업데이트는 실적으로 보지 않음

### 문제

발행 빈도가 품질보다 우선된다.

### 개선

콘텐츠 성과를 다음처럼 함께 본다.

```text
신규 글
대표 글 업데이트
중복 통합
허브 개선
오래된 글 검증
```

---

<!-- source message: 37 -->

## G-07. Draft Too Early

### 조사 메모 단계에서 공개 Draft 생성

### 문제

공개 저장소에서는 `draft: true`여도 내용 자체가 보일 수 있다.

### 개선

민감하거나 미완성인 연구 노트는 공개 저장소 밖에서 관리하고, 게시 가능한 수준이 된 뒤 옮긴다.

---

<!-- source message: 37 -->

## G-08. Draft Forever

### 초안이 계속 쌓임

### 문제

- 관리 부담
- 비슷한 새 글이 다시 생성
- 연구 상태와 폐기 상태가 구분되지 않음

### 개선

초안마다 만료 시점을 둔다.

```text
30일 내 진행
기존 글에 병합
아이디어로 환원
삭제
```

---

<!-- source message: 37 -->

## G-09. Research Without a Question

### 자료를 많이 모으지만 무엇을 밝힐지 없음

### 증상

- 공식 문서 링크 다수
- 소스코드 위치 다수
- 결론이 정해지지 않음
- 글이 자료 모음집이 됨

### 개선

조사 시작 전에 한 문장 질문을 쓴다.

```text
Linux는 CXL Type 3 메모리를 어떤 단계에서 NUMA 노드로 등록하는가?
```

---

<!-- source message: 37 -->

## G-10. Research Scope Inflation

### 조사 중 연관 개념을 계속 추가

### 문제

한 글이 끝나지 않고 범위가 무한히 넓어진다.

### 개선

본문 범위와 별도 후속 글 후보를 분리한다.

```text
현재 글에서 답할 것
참고만 할 것
후속 글로 넘길 것
```

---

# 출처와 검증

<!-- source message: 37 -->

## G-11. Source Collection Without Hierarchy

### 출처 신뢰도를 구분하지 않음

```text
공식 규격
공식 문서
소스코드
개인 블로그
커뮤니티 답변
AI 답변
```

이 모두 같은 수준으로 취급된다.

### 개선

근거 우선순위를 정한다.

```text
1. 실제 관찰·측정
2. 공식 사양
3. 공식 소스코드·문서
4. 신뢰할 수 있는 기술 자료
5. 커뮤니티 경험
6. 미검증 가설
```

---

<!-- source message: 37 -->

## G-12. Citation as Decoration

### 참고 링크를 넣었으니 검증됐다고 생각

### 문제

출처가 실제 주장과 일치하지 않을 수 있다.

### 개선

각 핵심 주장에 대해 다음을 확인한다.

```text
출처가 직접 뒷받침하는가
버전이 일치하는가
문맥을 잘라내지 않았는가
현재도 유효한가
```

---

<!-- source message: 37 -->

## G-13. Secondary Source Cascade

### 다른 블로그가 인용한 블로그를 다시 인용

### 문제

원래 출처와 실제 근거가 사라지고 오류가 반복된다.

### 개선

가능하면 사양·소스·공식 문서까지 거슬러 올라간다.

---

<!-- source message: 37 -->

## G-14. Version-Mismatched Evidence

### 최신 글에 과거 버전의 자료를 근거로 사용

예:

```text
Linux 6.12 동작 설명
근거는 Linux 5.4 소스
```

### 문제

구조가 바뀌었을 가능성을 놓친다.

### 개선

근거의 버전을 본문 환경과 맞춘다.

---

<!-- source message: 37 -->

## G-15. Source Code Snapshot Without Commit

### 소스 위치만 언급

```text
drivers/pci/probe.c에서 처리한다.
```

### 문제

향후 줄 번호와 동작이 바뀐다.

### 개선

가능하면 다음을 함께 기록한다.

```text
repository
tag 또는 commit
file
symbol
```

---

<!-- source message: 37 -->

## G-16. Experiment After Conclusion

### 결론을 먼저 정하고 실험으로 확인하려 함

### 문제

원하는 결과만 선택하거나 반대 결과를 예외로 넘기기 쉽다.

### 개선

실험 전에 가설과 판정 기준을 적는다.

---

<!-- source message: 37 -->

## G-17. Only Successful Evidence

### 결론을 지지하는 결과만 게시

### 문제

실패 조건과 경계가 보이지 않아 일반화가 과해진다.

### 개선

반대 결과, 실패한 조건, 재현되지 않은 경우도 기록한다.

---

<!-- source message: 37 -->

## G-18. Unreproducible Private Evidence

### 회사 장비에서 확인했지만 공개할 수 없는 결과에 의존

### 문제

독자가 검증할 수 없고 회사 정보 노출 위험도 있다.

### 개선

- 공개 가능한 최소 환경으로 재현
- 구체 정보는 익명화
- 재현 불가능하면 관찰 범위를 명확히 표시

---

# 집필

<!-- source message: 37 -->

## G-19. Outline as a Table of Contents Only

### 소제목만 나열하고 논리 구조는 없음

```text
소개
원리
코드
결과
결론
```

### 개선

각 절이 답할 질문을 적는다.

```text
무슨 증상인가
어디까지 정상인가
어떤 가설을 제외했는가
최종 원인은 무엇인가
```

---

<!-- source message: 37 -->

## G-20. Introduction Written First and Never Revised

### 초기 예상 범위로 서론을 작성한 뒤 그대로 둠

### 문제

본문이 바뀌었는데 서론은 다른 글을 약속할 수 있다.

### 개선

본문이 완성된 뒤 제목·description·서론을 다시 작성한다.

---

<!-- source message: 37 -->

## G-21. Conclusion Written from Memory

### 본문을 다시 검토하지 않고 결론 작성

### 문제

실제 증거보다 강한 주장을 할 수 있다.

### 개선

결론의 각 문장이 본문의 증거와 대응하는지 확인한다.

---

<!-- source message: 37 -->

## G-22. Section-by-Section Isolation

### 각 절은 좋지만 서로 논리적으로 이어지지 않음

### 증상

- 절마다 새로운 시작
- 앞 절의 결과가 다음 절에서 사용되지 않음
- 글이 여러 노트의 결합처럼 보임

### 개선

절의 시작과 끝에 인과관계를 만든다.

```text
앞 절에서 확인한 A 때문에 이제 B를 검사한다.
```

---

<!-- source message: 37 -->

## G-23. Writing Around Missing Evidence

### 확인하지 못한 부분을 일반 설명으로 채움

### 문제

글이 길지만 핵심 원인이나 결과는 불명확해진다.

### 개선

확인하지 못했다면 그대로 한계로 표시한다.

---

<!-- source message: 37 -->

## G-24. Tone Uniformity by Automation

### 문체 검사로 모든 문장을 같은 톤으로 만듦

### 문제

디버깅 기록, 레퍼런스, 에세이가 모두 같은 리듬이 된다.

### 개선

금지할 저정보 문장은 관리하되 콘텐츠 유형별 문체 차이는 허용한다.

---

<!-- source message: 37 -->

## G-25. Excessive Personal Narrative

### 기술 문제보다 경험담이 더 길어짐

### 문제

검색 독자가 핵심 내용을 찾기 어렵다.

### 개선

개인 경험은 다음에 기여할 때 사용한다.

```text
문제 발생 맥락
판단 변화
실패 원인
실무적 교훈
```

---

<!-- source message: 37 -->

## G-26. No Personal Context at All

### 반대로 실제 경험을 완전히 제거

### 문제

공식 문서 요약처럼 보이고 고유 가치가 약해진다.

### 개선

필요한 범위에서 실제 환경과 판단 과정을 포함한다.

---

<!-- source message: 37 -->

## G-27. Emotional Certainty

### 답답함이나 확신이 기술적 단정으로 이어짐

예:

```text
이 설계는 완전히 잘못됐다.
```

### 개선

감정과 기술 판단을 분리하고 조건을 명확히 쓴다.

---

<!-- source message: 37 -->

## G-28. Unreviewed Terminology

### 한 글 안에서 용어가 바뀜

```text
device memory
CXL memory
expander memory
far memory
```

### 문제

같은 대상을 말하는지 구분하기 어렵다.

### 개선

첫 등장에 용어 관계를 정의하고 이후 표기를 통일한다.

---

<!-- source message: 37 -->

## G-29. Acronym Saturation

### 약어가 지나치게 많음

### 개선

- 첫 등장에 풀네임
- 문맥상 필요 없는 약어 제거
- 용어표는 긴 시리즈에만 제공

---

<!-- source message: 37 -->

## G-30. Translation Residue

### 영문 문장을 직역한 어색한 표현

### 문제

전문 용어는 정확하지만 문장의 인과관계가 불명확해질 수 있다.

### 개선

원문 구조보다 한국어 독자의 이해 순서에 맞춰 재구성한다.

---

# 리뷰

<!-- source message: 37 -->

## G-31. Proofreading Equals Review

### 맞춤법만 확인하면 리뷰 완료

### 실제 기술 리뷰 항목

```text
사실 정확성
논리 흐름
재현 가능성
버전 일치
출처 대응
적용 한계
내부 중복
```

---

<!-- source message: 37 -->

## G-32. Self-Review Immediately After Writing

### 작성 직후 바로 검수

### 문제

내용을 이미 알고 있어 누락을 보지 못한다.

### 개선

가능하면 시간을 두고 다시 읽거나 관점별 검사를 분리한다.

---

<!-- source message: 37 -->

## G-33. Review Without Reader Simulation

### 작성자의 지식으로만 읽음

### 개선

다음 독자 관점으로 각각 확인한다.

```text
검색으로 중간 글에 들어온 사람
기본 개념만 아는 사람
실제 문제를 해결하려는 사람
빠른 레퍼런스를 찾는 사람
```

---

<!-- source message: 37 -->

## G-34. Review Against Style, Not Purpose

### 템플릿 준수만 확인

### 문제

글이 실제 질문에 답하는지는 놓친다.

### 개선

리뷰의 첫 질문은 이것이어야 한다.

> 이 글은 제목이 약속한 문제를 충분히 해결하는가?

---

<!-- source message: 37 -->

## G-35. Technical Claim Without Verification Marker

### 어떤 문장을 확인해야 하는지 리뷰어가 모름

### 개선

초안에서 임시 marker를 사용할 수 있다.

```text
[VERIFY]
[SOURCE]
[MEASURE]
[UNKNOWN]
```

발행 전 모두 제거하거나 한계로 전환한다.

---

<!-- source message: 37 -->

## G-36. Review Checklist Inflation

### 체크 항목이 너무 많아 형식적으로 처리

### 개선

필수·권장·특수 유형으로 나눈다.

#### 모든 글 필수

```text
목적
정확성
출처
결론
링크
```

#### 실험 글 추가

```text
환경
baseline
반복
한계
```

---

<!-- source message: 37 -->

## G-37. No Regression Review

### 기존 대표 글을 수정하면서 핵심 내용이 사라지는지 확인하지 않음

### 개선

대규모 수정 전후로:

- 주요 결론
- 환경
- 코드
- 내부 링크
- 검색 의도

를 비교한다.

---

<!-- source message: 37 -->

## G-38. Link Check as Content Review

### 링크가 모두 살아 있으면 품질이 괜찮다고 판단

### 문제

링크는 유효하지만 실제 주장을 뒷받침하지 않을 수 있다.

### 개선

대표 글의 핵심 출처는 의미 수준으로 검토한다.

---

<!-- source message: 37 -->

## G-39. AI Review as Final Authority

### AI가 “문제가 없다”고 하면 발행

### 문제

전문 사양·코드·실험 결과를 잘못 검증할 수 있다.

### 개선

AI는 다음에 활용한다.

```text
누락 후보
문장 불명확성
중복
반론 후보
체크리스트
```

핵심 기술 판단은 원자료와 실행 결과로 확인한다.

---

<!-- source message: 37 -->

## G-40. No Adversarial Review

### 결론을 반박하려는 검토가 없음

### 개선

발행 전 다음을 질문한다.

```text
어떤 조건에서 틀리는가
다른 원인이 가능한가
결과를 재현하지 못할 경우는
독자가 오해할 표현은
```

---

# 발행

<!-- source message: 37 -->

## G-41. Publish Without a Canonical Role

### 이 글이 사이트에서 어떤 역할인지 정하지 않음

### 문제

발행 후 어디에 연결할지 모른다.

### 개선

발행 전에 하나를 지정한다.

```text
대표 Guide
Concept
Debug Note
Experiment
Reference
Supporting Note
```

---

<!-- source message: 37 -->

## G-42. Publish Without Parent Topic

### 상위 주제가 없는 글

### 문제

발행 즉시 고아 문서가 된다.

### 개선

적어도 한 개의 Topic Hub에 연결한다.

---

<!-- source message: 37 -->

## G-43. Publish Without Internal Links

### 글을 공개한 뒤 관련 글 연결을 나중으로 미룸

### 문제

대부분 영원히 추가되지 않는다.

### 개선

발행 조건에 다음을 포함한다.

```text
상위 Hub 링크
선행 글 링크
후속 또는 관련 글 링크
```

---

<!-- source message: 37 -->

## G-44. Publish Without Search Preview Review

### 실제 검색 결과에서 제목·설명이 어떻게 보일지 확인하지 않음

### 개선

모바일 너비와 일반 검색 snippet 길이에서 제목과 description을 검토한다.

---

<!-- source message: 37 -->

## G-45. Publish Without Mobile Review

### 데스크톱만 확인

### 문제

표·코드·다이어그램·목차가 모바일에서 깨질 수 있다.

### 개선

대표 모바일 폭에서 최소 smoke review를 한다.

---

<!-- source message: 37 -->

## G-46. Publish Without Production Build

### dev server에서만 확인

### 문제

정적 경로, base URL, generated assets, Sitemap 문제를 놓친다.

### 개선

발행 전 production build 결과를 확인한다.

---

<!-- source message: 37 -->

## G-47. Publish Without Content Diff

### 자동화가 metadata·링크를 예상보다 많이 변경

### 개선

발행 전 파일 diff와 생성 manifest diff를 검토한다.

---

<!-- source message: 37 -->

## G-48. Publication Date Manipulation

### 업데이트한 글을 새 글처럼 보이게 작성일 변경

### 문제

독자와 검색엔진이 문서 역사를 잘못 이해할 수 있다.

### 개선

게시일은 유지하고 수정일을 별도로 관리한다.

---

<!-- source message: 37 -->

## G-49. Bulk Publication Burst

### 짧은 기간에 유사 글을 대량 발행

### 문제

- 독자가 소화하기 어려움
- 홈이 한 주제로 도배
- 자동 생성 인상을 줄 수 있음
- 각 글의 연결·검수가 약해질 수 있음

### 개선

시리즈 허브를 먼저 만들고, 각 글이 완결됐을 때 순차적으로 발행한다.

---

<!-- source message: 37 -->

## G-50. Announcement Without Discovery Integration

### 새 글을 SNS에 공유하지만 사이트 내부 구조에는 반영하지 않음

### 개선

외부 홍보보다 Hub, Featured, 내부 링크에 먼저 반영한다.

---

# 업데이트

<!-- source message: 37 -->

## G-51. Update Trigger Is Only Age

### 오래됐다는 이유만으로 수정

### 문제

안정적인 개념 문서에 불필요한 작업이 발생한다.

### 개선

업데이트 신호를 다양화한다.

```text
버전 변경
깨진 명령
검색 의도 변화
오류 제보
대표 글 승격
새 실험 결과
```

---

<!-- source message: 37 -->

## G-52. Update Means Rewrite

### 기존 글을 전면 재작성

### 문제

고유한 역사와 기존 링크 문맥이 사라질 수 있다.

### 개선

오류 수정, 보강, 구조 개편, 구판 대체를 구분한다.

---

<!-- source message: 37 -->

## G-53. Cosmetic Update as Freshness

### 문장이나 날짜만 바꾸고 최신 글처럼 표시

### 문제

실제 기술 검증이 없는데 신선도 신호만 바뀐다.

### 개선

`updated`와 `lastVerified`를 분리한다.

---

<!-- source message: 37 -->

## G-54. Update Without Change Summary

### 무엇이 달라졌는지 알 수 없음

### 개선

대표 글은 짧은 변경 내용을 표시한다.

---

<!-- source message: 37 -->

## G-55. Update Breaks Incoming Search Intent

### 유입이 많던 내용을 삭제하고 다른 주제로 바꿈

### 문제

같은 URL이 전혀 다른 질문에 답하게 된다.

### 개선

검색 의도가 크게 달라지면 새 글을 만들고 기존 글에서 연결한다.

---

<!-- source message: 37 -->

## G-56. New Version Replaces Historical Evidence

### 최신 버전 설명으로 과거 동작을 모두 덮어씀

### 문제

오래된 환경을 유지하는 독자와 기술 변천 기록에 불리하다.

### 개선

구판을 Historical로 유지하거나 버전별 차이를 별도 절로 보존한다.

---

<!-- source message: 37 -->

## G-57. New Findings Not Propagated

### 대표 글은 수정했지만 관련 글은 이전 설명 유지

### 문제

사이트 내부에 서로 충돌하는 주장이 생긴다.

### 개선

콘텐츠 그래프에서 영향을 받는 글 후보를 찾는다.

---

<!-- source message: 37 -->

## G-58. Update Only High-Traffic Pages

### 인기 없는 글은 계속 방치

### 문제

핵심 선행 개념이나 희귀 장애 글의 오류가 남는다.

### 개선

트래픽과 구조적 중요성을 함께 본다.

---

<!-- source message: 37 -->

## G-59. Update Without Rechecking Links

### 본문을 바꾸면서 관련 링크 의미가 달라짐

### 개선

수정한 절 주변의 내부·외부 링크를 다시 검토한다.

---

<!-- source message: 37 -->

## G-60. Perpetual Needs Review

### `needs-review` 상태만 늘어남

### 문제

상태가 경고가 아니라 무시되는 기본값이 된다.

### 개선

상태별 처리 기한과 우선순위를 둔다.

---

# 통합과 폐기

<!-- source message: 37 -->

## G-61. Merge by Length Alone

### 짧은 글은 무조건 합침

### 문제

짧지만 독립적인 오류 해결·Reference 가치를 잃을 수 있다.

### 개선

길이가 아니라 검색 의도와 고유 정보로 판단한다.

---

<!-- source message: 37 -->

## G-62. Merge Without Information Mapping

### 두 글을 단순 복사·붙여넣기

### 문제

중복 설명과 충돌하는 결론이 남는다.

### 개선

통합 전에 다음을 표로 정리한다.

```text
공통 내용
고유 내용
충돌 내용
유지할 URL
redirect 대상
```

---

<!-- source message: 37 -->

## G-63. Delete Without Replacement Analysis

### 낮은 트래픽이라는 이유로 삭제

### 문제

외부 링크, 선행 개념, 검색 유입이 끊길 수 있다.

### 개선

삭제 전:

- inbound link
- external backlink
- 검색 유입
- 상위 Hub 의존성
- 대체 문서

를 확인한다.

---

<!-- source message: 37 -->

## G-64. Redirect Everything to Homepage

### 삭제 글을 홈으로 전환

### 문제

사용자가 기대한 정보와 전혀 다른 페이지로 이동한다.

### 개선

가장 가까운 대체 문서로 redirect하고 없으면 명확한 404가 낫다.

---

<!-- source message: 37 -->

## G-65. Superseded but Still Featured

### 폐기된 글이 홈·검색·허브에 계속 대표로 노출

### 개선

상태 변경 시 다음을 함께 갱신한다.

```text
Featured
Hub
Internal links
Search boost
Sitemap
```

---

<!-- source message: 37 -->

## G-66. Historical Content Hidden

### 오래됐다는 이유로 가치 있는 기록을 완전히 숨김

### 문제

버전별 동작과 시스템 변화 기록을 잃는다.

### 개선

Historical 상태로 유지하되 최신 문서와 명확히 연결한다.

---

<!-- source message: 37 -->

## G-67. No Tombstone Page

### 중요한 글을 삭제하고 URL만 사라짐

### 개선

외부 참조가 많은 문서는 짧은 대체 안내 페이지를 유지할 수 있다.

---

<!-- source message: 37 -->

## G-68. Duplicate Content Kept for Sentiment

### 애착 때문에 유사 글을 모두 유지

### 문제

사이트 구조와 검색 의도가 계속 분열된다.

### 개선

원문은 Git history에 남아 있으므로 공개 사이트에서는 최선의 문서 구조를 우선한다.

---

<!-- source message: 37 -->

## G-69. Content Retirement Without Link Cleanup

### redirect는 있지만 내부 링크는 모두 구주소

### 개선

내부 링크는 최종 문서로 직접 수정한다.

---

<!-- source message: 37 -->

## G-70. No Retirement Record

### 왜 글을 합치거나 폐기했는지 모름

### 개선

간단한 콘텐츠 결정 로그를 남긴다.

---

# AI 활용

<!-- source message: 37 -->

## G-71. AI Topic Factory

### AI로 주제 목록을 대량 생성

### 문제

사이트 정체성, 기존 중복, 직접 경험을 고려하지 않은 아이디어가 늘어난다.

### 개선

AI는 기존 Topic 지도 안의 공백을 찾는 데 사용한다.

---

<!-- source message: 37 -->

## G-72. AI Outline Determines the Argument

### AI가 만든 목차를 그대로 사용

### 문제

일반적인 서론–장점–단점–결론 구조가 반복된다.

### 개선

먼저 핵심 질문과 실제 증거를 정한 뒤 AI로 누락을 검토한다.

---

<!-- source message: 37 -->

## G-73. AI Fills Unknowns

### 확인하지 못한 기술 내용을 AI 문장으로 연결

### 문제

그럴듯한 허위 내용이 들어갈 수 있다.

### 개선

모르는 부분은 `[UNKNOWN]`으로 남기고 원자료나 실험으로 확인한다.

---

<!-- source message: 37 -->

## G-74. AI Citation Hallucination

### AI가 제시한 문서·절 번호를 그대로 사용

### 개선

모든 인용은 실제 원문에서 확인한다.

---

<!-- source message: 37 -->

## G-75. AI Makes Every Article Complete

### 짧은 메모에도 서론·배경·결론을 자동 추가

### 문제

정보량은 같지만 분량과 일반 문장이 증가한다.

### 개선

Reference나 짧은 Debug Note는 짧고 직접적으로 유지한다.

---

<!-- source message: 37 -->

## G-76. AI Removes Authorial Uncertainty

### “가능성이 있다”를 확정 표현으로 바꿈

### 문제

가설과 관찰의 경계가 사라진다.

### 개선

불확실성 표시는 기술적 정확성의 일부로 보존한다.

---

<!-- source message: 37 -->

## G-77. AI Normalizes Specialized Terminology

### 정확한 도메인 표현을 일반어로 바꿈

### 문제

읽기 쉬워지지만 기술적 의미가 달라질 수 있다.

### 개선

용어 정확성을 우선하고 필요한 경우 별도 설명을 붙인다.

---

<!-- source message: 37 -->

## G-78. AI Rewrite Erases Failure History

### 실패 과정과 시행착오를 깔끔한 성공 서사로 재작성

### 문제

실무적 고유 가치가 사라진다.

### 개선

실패한 가설과 판단 과정은 의도적으로 유지한다.

---

<!-- source message: 37 -->

## G-79. AI Review Confirms Existing Bias

### 원하는 결론을 담은 초안을 AI에게 검토 요청

### 문제

AI가 대체로 초안의 프레임 안에서 답한다.

### 개선

반대 입장 검토를 별도로 요청하고 원자료로 판단한다.

---

<!-- source message: 37 -->

## G-80. No AI Usage Boundary

### 어떤 작업을 AI에게 맡길지 기준 없음

### 권장 경계

#### 맡기기 좋은 작업

```text
문장 명료화
목차 후보
중복 탐지
반론 후보
체크리스트
태그 정규화 후보
```

#### 직접 검증할 작업

```text
사양 해석
코드 동작
벤치마크
보안 판단
법적 표현
실제 장애 원인
```

---

# 운영 우선순위

<!-- source message: 37 -->

## G-81. New Article Bias

### 새 글만 성과로 인정

### 개선

콘텐츠 운영 결과를 다음처럼 함께 관리한다.

```text
신규
업데이트
통합
폐기
허브
내부 링크
검증
```

---

<!-- source message: 37 -->

## G-82. Visible Work Bias

### 홈 디자인이나 새 글처럼 눈에 보이는 작업만 우선

### 문제

스키마·redirect·상태 정리 같은 기반 작업이 계속 미뤄진다.

### 개선

독자에게 직접 보이지 않더라도 장기 가치가 큰 작업에 시간을 배정한다.

---

<!-- source message: 37 -->

## G-83. Easy Fix Queue Dominance

### 간단한 오탈자와 metadata만 계속 처리

### 문제

대표 문서 재구성처럼 어려운 작업이 미뤄진다.

### 개선

작은 작업과 큰 작업을 별도 queue로 관리한다.

---

<!-- source message: 37 -->

## G-84. Everything Is P0

### 모든 문제가 긴급

### 개선

콘텐츠 위험을 다음처럼 나눈다.

```text
P0: 잘못된 기술 정보·보안·깨진 핵심 경로
P1: 대표 글·허브·중복
P2: 일반 최신성·UX
P3: 미관·선택 기능
```

---

<!-- source message: 37 -->

## G-85. No Editorial Roadmap

### 기술 로드맵은 있지만 콘텐츠 로드맵 없음

### 개선

분기별로 다음을 정한다.

```text
강화할 Topic
대표 Guide
통합 대상
검증 대상
새 실험
```

---

<!-- source message: 37 -->

## G-86. Roadmap as a Promise

### 공개 로드맵의 모든 글을 작성해야 한다고 느낌

### 문제

우선순위가 바뀌어도 계획을 유지하게 된다.

### 개선

로드맵은 방향이지 계약이 아니며 정기적으로 폐기·통합한다.

---

<!-- source message: 37 -->

## G-87. No Capacity for Maintenance

### 작성 시간 전부 신규 글에 사용

### 개선

예를 들어 다음처럼 명시적으로 배분한다.

```text
신규 40%
업데이트 30%
구조화 20%
도구·운영 10%
```

정확한 비율보다 유지보수 시간을 확보하는 것이 중요하다.

---

<!-- source message: 37 -->

## G-88. Tooling Work Disguised as Editorial Work

### 글을 쓰기 위해 에디터·추천 시스템부터 개발

### 문제

콘텐츠 개선이 시작되지 않는다.

### 개선

수동 작업에서 실제 병목이 반복되는지 먼저 확인한다.

---

<!-- source message: 37 -->

## G-89. No Stop Condition

### 대표 글 개선을 무한히 계속

### 문제

한 글에 과도한 시간을 쓰고 다른 구조 문제를 놓친다.

### 개선

완료 조건을 정한다.

```text
목적 명확
근거 확인
환경 표시
내부 링크
모바일 확인
상태 지정
```

---

<!-- source message: 37 -->

## G-90. Perfection Blocks Publication

### 모든 내용을 완벽히 확인할 때까지 발행하지 않음

### 문제

유용한 검증 결과도 오래 비공개 상태로 남는다.

### 개선

불확실성과 한계를 명시하고 현재 확인한 범위까지 발행할 수 있다.

---

# 품질 모델

<!-- source message: 37 -->

## G-91. Single Quality Score

### 모든 글을 하나의 점수로 평가

### 문제

Reference와 Guide가 같은 기준으로 비교된다.

### 개선

품질을 여러 축으로 본다.

```text
정확성
독창성
재현성
완결성
탐색 연결
최신성
```

---

<!-- source message: 37 -->

## G-92. Checklist Completion Equals Quality

### 항목을 모두 채우면 좋은 글

### 문제

형식은 완벽하지만 핵심 통찰이 없을 수 있다.

### 개선

체크리스트는 최소 품질 보장용이며 콘텐츠 가치는 별도 판단한다.

---

<!-- source message: 37 -->

## G-93. Readability Over Accuracy

### 쉽게 쓰기 위해 중요한 조건을 제거

### 개선

조건을 삭제하지 말고 계층적으로 설명한다.

```text
핵심 요약
정확한 상세
예외와 한계
```

---

<!-- source message: 37 -->

## G-94. Accuracy Over Usability

### 모든 조건과 예외를 본문 첫 부분에 넣음

### 문제

정확하지만 읽기 어려운 사양서가 된다.

### 개선

기본 모델을 먼저 설명하고 세부 예외를 별도 절로 분리한다.

---

<!-- source message: 37 -->

## G-95. Originality Means Never Explaining Basics

### 독창성을 위해 배경 설명을 완전히 제거

### 문제

글이 독립적으로 이해되지 않는다.

### 개선

필요한 최소 배경은 제공하되, 일반 설명이 핵심 콘텐츠를 압도하지 않게 한다.

---

<!-- source message: 37 -->

## G-96. Evergreen as a Requirement

### 모든 글이 영구적으로 유효해야 한다고 생각

### 문제

릴리스 분석, 장애 기록, 역사적 문서도 가치가 있다.

### 개선

Evergreen, Versioned, Historical 콘텐츠를 구분한다.

---

<!-- source message: 37 -->

## G-97. Every Article Must Be Comprehensive

### 모든 글이 완전한 교과서여야 함

### 문제

짧고 정확한 Reference와 Debug Note의 장점을 잃는다.

### 개선

콘텐츠 타입별 충분함의 기준을 다르게 둔다.

---

<!-- source message: 37 -->

## G-98. Every Article Must Be Searchable Alone

### 내부 문맥 없이도 모든 글이 완전히 독립적이어야 함

### 문제

배경 설명 중복이 증가한다.

### 개선

최소 독립성을 유지하면서 Hub·선행 문서 연결을 활용한다.

---

<!-- source message: 37 -->

## G-99. No Editorial Principles

### 개별 판단이 매번 달라짐

### 개선

짧은 원칙을 정한다.

```text
직접 확인한 것을 우선한다
가설은 가설로 표시한다
중복 글보다 대표 문서를 강화한다
버전과 환경을 숨기지 않는다
모르는 것은 모른다고 쓴다
```

---

<!-- source message: 37 -->

## G-100. Editorial System Becomes the Product

### 콘텐츠 운영 체계 자체를 계속 설계

### 문제

가이드, 점수표, 자동화, 대시보드는 완성되지만 실제 핵심 글은 개선되지 않는다.

### 개선

운영 체계는 다음 세 작업을 빠르게 만들면 충분하다.

```text
좋은 글을 발행
기존 글을 신뢰 가능하게 유지
필요 없는 글을 정리
```

---

# hawk90에서 우선 확인할 15개

| 우선순위 | 안티패턴 | 이유 |
|---:|---|---|
| 1 | Topic Impulse Publishing | 주제 범위가 넓어 콘텐츠 분산 가능성이 큼 |
| 2 | SEO Query Becomes Editorial Strategy | 애드센스 대응 중 검색어별 글 증가 위험 |
| 3 | Bulk Publication Burst | 비슷한 시스템 글의 연속 발행이 자동 생성 인상을 줄 수 있음 |
| 4 | Research Without a Question | 규격·소스 조사 글이 자료 모음으로 변할 수 있음 |
| 5 | Source Collection Without Hierarchy | 사양·소스·커뮤니티 근거를 구분해야 함 |
| 6 | Introduction Written First and Never Revised | 실제 본문과 제목·description 불일치 가능 |
| 7 | Proofreading Equals Review | 고급 기술 글은 사실·버전·재현성 검토가 핵심 |
| 8 | AI Review as Final Authority | CXL·PCIe·CUDA 세부 동작 검증에는 한계 |
| 9 | Publish Without Parent Topic | 새 글이 즉시 고아 문서가 되는 것을 방지 |
| 10 | Cosmetic Update as Freshness | 애드센스 대응 중 형식적 업데이트 방지 |
| 11 | New Findings Not Propagated | 여러 연관 글 사이 기술적 충돌 방지 |
| 12 | Merge by Length Alone | 짧지만 희귀한 Debug·Reference 글 보존 필요 |
| 13 | Bulk AI Refresh | 기존 고유 경험과 문체 손실 위험 |
| 14 | New Article Bias | 신규 작성보다 기존 대표 글 강화가 현재 우선 |
| 15 | Editorial System Becomes the Product | 블로그보다 관리 시스템이 커지는 것을 방지 |

# 추천 최소 편집 흐름

새로운 복잡한 CMS 없이도 다음이면 충분하다.

## 1. 아이디어

```text
새 글
기존 글 보완
통합
보류
```

중 하나로 분류한다.

## 2. 조사

```text
핵심 질문
확인된 사실
관찰
가설
미확인 사항
```

을 분리한다.

## 3. 집필

콘텐츠 타입에 맞는 최소 구조를 사용한다.

## 4. 리뷰

```text
정확성
근거
환경·버전
한계
내부 중복
다음 경로
```

를 확인한다.

## 5. 발행

```text
Parent Topic
관련 링크
description
모바일
production build
```

을 검사한다.

## 6. 유지

```text
Current
Needs Review
Historical
Superseded
```

상태를 관리한다.

---

# 이번 단계의 핵심 결론

기술 블로그 운영에서 가장 위험한 패턴은 글을 적게 쓰는 것이 아니다.

> **새 글을 계속 추가하면서 기존 지식의 관계·정확성·대표성을 관리하지 않는 것**이 더 큰 문제다.

현재 `hawk90.github.io`에는 신규 생산보다 다음 편집 작업의 수익률이 더 높을 가능성이 크다.

```text
대표 글 선정
유사 글 통합
실제 경험 강화
출처 계층화
Topic Hub 연결
수정일과 검증일 분리
구판 상태 표시
```

다음 단계는 **Task 2-11. Internationalization, Localization & Technical Terminology Anti-patterns**로 이어갈 수 있다. 한글·영문 기술 용어, 번역 글, URL, 검색 alias, 코드·수식·표기 일관성 문제를 정리하는 단계다.

<!-- source message: 38 -->

## L-01. Korean–English Term Drift

### 같은 개념을 여러 방식으로 표기

```text
메모리 일관성
캐시 일관성
cache coherence
coherency
```

### 문제

- 검색 결과가 분산됨
- 독자가 같은 개념인지 헷갈림
- 글마다 용어가 달라짐

### 개선

대표 표기를 정한다.

```text
첫 등장:
캐시 일관성(cache coherence)

이후:
캐시 일관성
```

---

<!-- source message: 38 -->

## L-02. Acronym-Only Writing

### 약어만 사용

```text
RC가 ECAM을 통해 BDF를 스캔하고 BAR를 할당한다.
```

### 문제

전문 독자라도 문맥이 바뀌면 읽기 어렵다.

### 개선

첫 등장에 풀네임을 제공한다.

```text
Root Complex(RC)
Enhanced Configuration Access Mechanism(ECAM)
Bus/Device/Function(BDF)
```

---

<!-- source message: 38 -->

## L-03. Full Name Every Time

### 반대로 매번 풀네임 반복

### 문제

문장이 지나치게 길고 기술 글의 밀도가 떨어진다.

### 개선

첫 등장 이후 약어를 사용한다.

---

<!-- source message: 38 -->

## L-04. Inconsistent Acronym Expansion

### 글마다 약어 풀이가 다름

예:

```text
DMA = Direct Memory Access
DMA = Direct Memory Access Engine
```

### 문제

개념과 구현체가 혼동된다.

### 개선

용어집 또는 중앙 terminology registry를 둔다.

---

<!-- source message: 38 -->

## L-05. Translation by Sound

### 의미보다 발음대로 옮김

```text
코히어런시
이뉴머레이션
프로비저닝
```

### 문제

한글 독자에게도 의미가 직관적이지 않고 검색어가 분산된다.

### 개선

일반적으로 통용되는 번역이 있으면 번역어를 우선하고 영문을 병기한다.

```text
열거(enumeration)
일관성(coherence)
프로비저닝(provisioning)
```

단, 업계에서 영문 음역이 더 널리 쓰이면 무리하게 번역하지 않는다.

---

<!-- source message: 38 -->

## L-06. Translation by Dictionary

### 문맥 없이 사전 뜻을 적용

예:

```text
memory ordering → 메모리 정렬
```

실제로는 문맥상 `메모리 순서` 또는 `메모리 순서 보장`에 가깝다.

### 개선

도메인 문맥을 기준으로 번역한다.

---

<!-- source message: 38 -->

## L-07. Over-Translation

### 고유 기술명을 억지로 번역

```text
Root Complex → 뿌리 복합체
```

### 문제

검색성과 정확성이 모두 떨어진다.

### 개선

고유 명칭은 원어를 유지하고 필요한 경우 의미만 설명한다.

---

<!-- source message: 38 -->

## L-08. Under-Translation

### 모든 설명을 영문 용어로만 작성

```text
The device performs enumeration and resource allocation.
```

### 문제

한국어 본문 안에서 읽기 흐름이 끊긴다.

### 개선

핵심 용어는 영문을 유지하되 문장 구조는 자연스러운 한국어로 작성한다.

---

<!-- source message: 38 -->

## L-09. Half-Translated Phrase

### 한글과 영문이 어색하게 섞임

```text
이 단계에서 resource allocation을 수행한다.
```

### 개선

둘 중 하나로 정리한다.

```text
이 단계에서 리소스를 할당한다.
```

또는 정확한 용어가 중요하면:

```text
이 단계에서 리소스 할당(resource allocation)을 수행한다.
```

---

<!-- source message: 38 -->

## L-10. English Noun Chain in Korean

### 영문 명사를 연속해서 붙임

```text
CXL Host Memory Device Decoder Configuration Flow
```

### 문제

한국어 독자가 문법 관계를 파악하기 어렵다.

### 개선

관계를 풀어 쓴다.

```text
CXL 호스트가 메모리 장치의 HDM Decoder를 설정하는 과정
```

---

# 검색과 alias

<!-- source message: 38 -->

## L-11. No Search Alias

### 표기가 다르면 검색되지 않음

```text
MSI-X
MSIX
MSI X
```

### 개선

검색 alias를 관리한다.

```yaml
canonical: msi-x
aliases:
  - msix
  - msi x
```

---

<!-- source message: 38 -->

## L-12. Korean–English Search Split

### 한글과 영문 검색이 별개

```text
주소 변환
address translation
```

### 개선

Topic metadata에 양쪽 표현을 함께 둔다.

---

<!-- source message: 38 -->

## L-13. Transliteration Search Failure

### 음역어와 원어가 연결되지 않음

```text
코히어런시
coherency
coherence
```

### 개선

검색 정규화에서 동의어를 연결한다.

---

<!-- source message: 38 -->

## L-14. Symbol Search Failure

### 특수문자 때문에 검색 실패

```text
C++
C#
MSI-X
x86-64
```

### 문제

검색 tokenizer가 `+`, `#`, `-`를 제거할 수 있다.

### 개선

기술 토큰을 위한 별도 정규화 규칙을 둔다.

---

<!-- source message: 38 -->

## L-15. Case-Sensitive Technical Search

### 대소문자가 다르면 검색되지 않음

```text
CUDA
cuda
Cuda
```

### 개선

검색은 대소문자를 정규화하되 화면 표기는 canonical form을 유지한다.

---

<!-- source message: 38 -->

## L-16. Version Search Ambiguity

### 버전 검색이 일반 숫자와 섞임

```text
C++20
CUDA 12.4
Linux 6.12
```

### 개선

버전 정보를 별도 metadata로 색인한다.

---

<!-- source message: 38 -->

## L-17. Alias Explosion

### 모든 표기 변형을 수동 등록

### 문제

alias registry가 과도하게 커지고 중복된다.

### 개선

다음을 분리한다.

```text
규칙 기반 정규화
명시적 기술 동의어
오타 보정
```

---

<!-- source message: 38 -->

## L-18. Search Alias Changes Display Text

### 검색 정규화를 위해 원문까지 변환

### 문제

표준 표기와 코드 identifier가 훼손된다.

### 개선

검색용 normalized field와 화면 표시값을 분리한다.

---

# URL과 slug

<!-- source message: 38 -->

## L-19. Korean Slug Everywhere

### 모든 URL을 한글로 생성

### 장점

- 제목과 직관적으로 대응

### 문제

- URL 인코딩 시 길어짐
- 공유할 때 읽기 어려움
- 일부 도구에서 처리 불편
- 제목 변경 시 slug 변경 유혹

### 개선

안정적이고 짧은 slug 정책을 정한다.

```text
/pcie-bar-sizing/
/cxl-hdm-decoder/
```

---

<!-- source message: 38 -->

## L-20. English Slug Without Meaning

### 영문 slug가 지나치게 축약됨

```text
/cxl-init-2/
/mem-topo-v3/
```

### 문제

시간이 지나면 의미를 알기 어렵다.

### 개선

짧지만 검색 의도가 드러나는 slug를 사용한다.

---

<!-- source message: 38 -->

## L-21. Translated Slug Drift

### 제목 번역이 바뀔 때 URL도 변경

### 문제

외부 링크와 색인이 깨진다.

### 개선

slug는 최초 확정 후 안정적으로 유지한다.

---

<!-- source message: 38 -->

## L-22. Mixed Slug Policy

```text
/cpp-memory/
/리눅스-스케줄러/
/2026/cxl-init/
```

### 문제

URL 체계가 일관되지 않는다.

### 개선

신규 글부터 하나의 정책을 적용한다. 기존 URL은 무리하게 일괄 변경하지 않는다.

---

<!-- source message: 38 -->

## L-23. Acronym-Only Slug

```text
/ats-pri-pasid/
```

### 문제

전문가에게는 명확하지만 일반 검색·공유에서는 의미가 약하다.

### 개선

필요하면 핵심 의미를 추가한다.

```text
/pcie-ats-pri-pasid-address-translation/
```

다만 너무 길게 만들지는 않는다.

---

<!-- source message: 38 -->

## L-24. Locale Prefix Without Multilingual Content

```text
/ko/
/en/
```

를 도입했지만 실제로 한 언어만 운영한다.

### 문제

경로만 복잡해진다.

### 개선

실제 다국어 운영 계획이 있을 때만 locale prefix를 도입한다.

---

<!-- source message: 38 -->

## L-25. Duplicate Language URLs

### 동일 콘텐츠를 `/ko/post`와 `/post`에서 모두 제공

### 문제

중복 URL이 생긴다.

### 개선

locale별 canonical과 redirect 정책을 명확히 한다.

---

# 번역 콘텐츠

<!-- source message: 38 -->

## L-26. Translation as Duplicate Publication

### 한국어 글을 그대로 영어로 기계 번역해 발행

### 문제

- 오류 가능성
- 문체 부자연스러움
- 유지보수 두 배
- 원문 업데이트가 번역에 반영되지 않음

### 개선

실제로 영어 독자가 읽을 가치가 높은 대표 글부터 선별한다.

---

<!-- source message: 38 -->

## L-27. Asymmetric Translation

### 한국어판과 영어판 내용이 크게 다름

### 문제

번역 관계인지 별도 문서인지 불명확하다.

### 개선

다음 중 하나를 명확히 한다.

```text
완전 번역
요약 번역
영문 독자를 위한 별도 재작성
```

---

<!-- source message: 38 -->

## L-28. Translation Lag

### 원문은 수정됐지만 번역은 오래된 상태

### 개선

번역 metadata에 source revision을 기록한다.

```yaml
translatedFrom:
sourceUpdatedAt:
translationStatus:
```

---

<!-- source message: 38 -->

## L-29. Translation Without Technical Review

### 언어만 자연스럽게 다듬고 기술 용어 검증은 없음

### 문제

전문 용어와 인과관계가 틀릴 수 있다.

### 개선

번역 후 기술적 의미를 원문과 대조한다.

---

<!-- source message: 38 -->

## L-30. Machine Translation of Code Comments

### 코드 주석까지 자동 번역

### 문제

identifier·API 이름·용어가 변형될 수 있다.

### 개선

코드는 원문을 유지하고 필요하면 코드 아래에서 설명한다.

---

<!-- source message: 38 -->

## L-31. Translated Error Messages

### 실제 오류 메시지를 한글로 번역

### 문제

독자가 원문 오류를 검색할 수 없다.

### 개선

원문을 먼저 제시하고 한국어 설명을 덧붙인다.

```text
"device not found"

장치를 찾지 못했다는 의미다.
```

---

<!-- source message: 38 -->

## L-32. Translated Command Output

### 터미널 출력을 번역

### 문제

실제 환경과 비교할 수 없다.

### 개선

출력은 원문 그대로 유지하고 해석만 번역한다.

---

<!-- source message: 38 -->

## L-33. Translation Without `hreflang`

### 실제 번역 페이지가 있지만 관계 표시 없음

### 문제

적절한 언어 페이지 선택과 중복 관리가 어려워진다.

### 개선

언어별 URL 관계와 canonical 정책을 일관되게 관리한다.

---

<!-- source message: 38 -->

## L-34. Canonical All Translations to One Language

### 영어판을 한국어판 canonical로 지정

### 문제

실제 번역 페이지가 독립적인 언어 콘텐츠라면 색인 신호가 잘못될 수 있다.

### 개선

각 언어 페이지는 일반적으로 자기 canonical을 갖고 상호 언어 연결을 둔다.

---

<!-- source message: 38 -->

## L-35. Partial Translation Presented as Complete

### 일부 절만 번역됐지만 완전한 번역처럼 보임

### 개선

번역 상태를 표시한다.

```text
전체 번역
요약본
번역 진행 중
```

---

# 기술 용어 관리

<!-- source message: 38 -->

## L-36. No Terminology Registry

### 용어 결정이 글마다 달라짐

### 개선

작은 glossary 또는 YAML registry를 둔다.

```yaml
canonical: cache coherence
ko: 캐시 일관성
aliases:
  - coherence
  - coherency
notes: CXL 문맥에서는 protocol 명칭을 원문 유지
```

---

<!-- source message: 38 -->

## L-37. Glossary as a Dictionary Dump

### 용어집이 단순 단어 목록

### 문제

실제 문맥과 관계가 보이지 않는다.

### 개선

각 용어에 다음을 포함한다.

```text
짧은 정의
상위 개념
관련 용어
대표 글
주의할 오해
```

---

<!-- source message: 38 -->

## L-38. Glossary Duplicates Articles

### 개념 글 전체를 용어집에 복사

### 개선

용어집은 짧은 설명과 대표 Concept 링크만 제공한다.

---

<!-- source message: 38 -->

## L-39. Terminology Change Without Migration

### 표준 용어를 바꿨지만 과거 글은 그대로

### 문제

검색과 내부 일관성이 깨진다.

### 개선

- 화면 표기 migration
- alias 유지
- redirect가 필요한 URL 확인
- 변경 기록

을 함께 처리한다.

---

<!-- source message: 38 -->

## L-40. One Korean Translation per English Term

### 모든 문맥에서 동일 번역 사용

예:

```text
context → 문맥
context → 실행 컨텍스트
context → GPU context
```

### 문제

도메인에 따라 뜻이 달라진다.

### 개선

용어를 문맥별로 정의한다.

---

<!-- source message: 38 -->

## L-41. Same Korean Word for Distinct Terms

예:

```text
consistency
coherence
```

를 모두 `일관성`으로 번역.

### 문제

기술적 차이가 사라진다.

### 개선

필요하면 영문을 병기하고 개념 차이를 설명한다.

---

<!-- source message: 38 -->

## L-42. Coherence–Consistency Collapse

### 캐시 일관성과 데이터 일관성을 같은 표현으로 처리

### 문제

메모리 모델과 분산 시스템 의미가 뒤섞인다.

### 개선

도메인별 canonical translation을 정한다.

---

<!-- source message: 38 -->

## L-43. Ordering–Order Confusion

### `memory ordering`, `execution order`, `byte order`를 비슷하게 번역

### 개선

```text
memory ordering → 메모리 순서 보장
execution order → 실행 순서
byte order → 바이트 순서
```

처럼 문맥을 구분한다.

---

<!-- source message: 38 -->

## L-44. Translation Hides Specification Terms

### 사양에 있는 정확한 이름을 번역만 제공

### 문제

원문 문서에서 해당 용어를 찾기 어렵다.

### 개선

사양 용어는 첫 등장에 원문을 병기한다.

---

<!-- source message: 38 -->

## L-45. Vendor Terminology Normalization

### 업체 고유 명칭을 일반 용어로 바꿈

### 문제

문서·도구에서 정확한 이름을 찾기 어려워진다.

### 개선

제품명·API·레지스터 이름은 원문을 유지한다.

---

# 코드와 식별자

<!-- source message: 38 -->

## L-46. Translating Identifiers

### 함수명·구조체명 의미를 본문에서 번역 이름으로만 표현

### 문제

소스 검색이 어렵다.

### 개선

identifier는 원문을 유지한다.

```text
`pci_bus_read_config_dword()` 함수는...
```

---

<!-- source message: 38 -->

## L-47. Identifier Formatting Drift

### 같은 identifier를 일반 텍스트와 inline code로 혼용

### 개선

함수·타입·매크로·파일 경로는 일관되게 inline code로 표시한다.

---

<!-- source message: 38 -->

## L-48. Code Comments Language Switching

### 한 코드 블록 안에서 한글·영문 주석이 무작위로 섞임

### 문제

공유성과 가독성이 떨어질 수 있다.

### 개선

예제의 대상 독자에 맞춰 한 언어를 기본으로 하고 필요한 용어만 병기한다.

---

<!-- source message: 38 -->

## L-49. Korean Identifier Examples

### 실제 코드에 한글 변수명을 사용

### 문제

가능은 하지만 독자가 일반 코드베이스에 적용하기 어렵고 일부 도구 호환성 문제가 생길 수 있다.

### 개선

코드는 업계 관행에 맞는 영문 identifier를 사용하고 설명은 한국어로 한다.

---

<!-- source message: 38 -->

## L-50. Translated File Names

### 실제 파일명을 한국어로 바꿔 설명

### 문제

저장소에서 찾을 수 없다.

### 개선

실제 파일명은 원문 그대로 표시한다.

---

<!-- source message: 38 -->

## L-51. Error Code Localization

### 오류 코드 이름까지 번역

```text
-ENOMEM → 메모리 없음 오류
```

설명은 가능하지만 실제 코드 표기를 숨기면 안 된다.

### 개선

```text
`-ENOMEM`은 메모리 할당 실패를 의미한다.
```

---

<!-- source message: 38 -->

## L-52. Case Normalization of Identifiers

### 문장 스타일에 맞춰 API 대소문자를 바꿈

```text
CMake → Cmake
GitHub → Github
```

### 개선

공식 표기를 유지한다.

---

# 제목과 메타데이터

<!-- source message: 38 -->

## L-53. Bilingual Title Overload

```text
PCIe BAR 크기 탐색(Size Probing)과 주소 할당(Address Allocation) 완전 정리
```

### 문제

제목이 너무 길어진다.

### 개선

제목은 주 언어 중심으로 쓰고 영문 용어는 description이나 본문 첫 등장에 둔다.

---

<!-- source message: 38 -->

## L-54. English Title, Korean Body

### 제목은 검색을 위해 영어, 본문은 한국어

### 문제

독자 기대와 실제 언어가 다를 수 있다.

### 개선

주요 독자 언어에 맞춘 제목을 사용하고 영문 키워드는 자연스럽게 포함한다.

---

<!-- source message: 38 -->

## L-55. Korean Title Without Searchable English Term

```text
주소 공간 할당 과정
```

### 문제

`PCIe BAR allocation`을 찾는 사용자가 글을 발견하기 어렵다.

### 개선

핵심 고유 용어는 제목이나 description에 포함한다.

```text
PCIe BAR 주소 공간은 어떻게 할당되는가
```

---

<!-- source message: 38 -->

## L-56. Meta Description Language Mismatch

### 한국어 페이지의 description이 영어

### 문제

검색 결과 경험이 불일치한다.

### 개선

페이지 주 언어와 meta description 언어를 맞춘다.

---

<!-- source message: 38 -->

## L-57. Mixed-Language Open Graph

### OG 제목·설명·이미지의 언어가 서로 다름

### 개선

페이지 locale에 따라 생성물을 일관되게 만든다.

---

<!-- source message: 38 -->

## L-58. Locale-Free Dates

### 날짜가 언어와 무관한 형식으로 제각각 표시

```text
08/01/2026
2026.08.01
August 1, 2026
```

### 개선

페이지 언어와 지역 관례에 맞는 표시를 사용하되 machine-readable date는 표준 형식으로 유지한다.

---

<!-- source message: 38 -->

## L-59. Localized Slug and Canonical Mismatch

### 화면 언어는 한국어인데 canonical이 다른 locale URL을 가리킴

### 개선

locale별 canonical 정책을 자동 검증한다.

---

# 문장과 문체

<!-- source message: 38 -->

## L-60. Subject Omission Ambiguity

### 한국어에서 주어를 계속 생략

기술 글에서는 `호스트`, `장치`, `드라이버`, `펌웨어` 중 누가 동작하는지 모호해질 수 있다.

### 개선

행위 주체가 바뀔 때는 명시한다.

---

<!-- source message: 38 -->

## L-61. Pronoun Ambiguity

```text
이것이 이를 초기화한다.
```

### 문제

어떤 객체를 의미하는지 불분명하다.

### 개선

기술 대상의 이름을 반복하는 편이 더 낫다.

---

<!-- source message: 38 -->

## L-62. Passive Voice Import

### 영문 수동태를 그대로 옮김

```text
이 값은 펌웨어에 의해 설정된다.
```

### 개선

행위 주체가 중요하면 능동형으로 쓴다.

```text
펌웨어가 이 값을 설정한다.
```

---

<!-- source message: 38 -->

## L-63. Nominalization Overload

### 명사형 표현이 연속됨

```text
설정 수행을 통한 초기화 진행
```

### 개선

동사 중심으로 쓴다.

```text
설정을 적용해 장치를 초기화한다.
```

---

<!-- source message: 38 -->

## L-64. English Sentence Order in Korean

### 긴 수식어를 앞에 계속 배치

### 문제

문장 끝까지 가야 핵심 동사를 알 수 있다.

### 개선

긴 기술 문장은 두 문장으로 나누고 결론을 앞에 둔다.

---

<!-- source message: 38 -->

## L-65. Connector Overuse

```text
따라서, 또한, 반면에, 이에 따라
```

가 매 문단 반복.

### 문제

AI형 문체처럼 보이고 문장이 기계적이다.

### 개선

논리 관계가 실제로 필요한 곳에서만 사용한다.

---

<!-- source message: 38 -->

## L-66. False Friend Translation

예:

```text
eventually → 결과적으로
```

문맥상 `마침내` 또는 `결국`일 수 있다.

### 개선

기술 문맥과 시간 관계를 확인한다.

---

<!-- source message: 38 -->

## L-67. Modal Verb Loss

### `may`, `can`, `must`의 강도가 번역에서 사라짐

### 문제

가능성·허용·필수 조건이 모두 단정으로 바뀐다.

### 개선

```text
may → 가능성이 있다 / 허용될 수 있다
must → 반드시 해야 한다
should → 권장한다
```

처럼 강도를 보존한다.

---

<!-- source message: 38 -->

## L-68. Specification Normative Language Collapse

### `MUST`, `SHOULD`, `MAY`를 모두 같은 어조로 번역

### 문제

규격 요구 수준이 사라진다.

### 개선

규격의 normative keyword를 명확히 구분한다.

---

<!-- source message: 38 -->

## L-69. Untranslated Idiom

### 영문 표현을 그대로 옮겨 의미가 이상함

```text
hot path를 뜨겁게 만든다
```

### 개선

업계 관용어인지, 설명이 필요한 표현인지 구분한다.

---

<!-- source message: 38 -->

## L-70. Korean Explanation Becomes More Ambiguous Than English

### 번역 과정에서 정확한 원문보다 설명이 모호해짐

### 개선

정확성이 중요한 문장은 원문 용어와 한국어 해석을 함께 둔다.

---

# 표와 다이어그램

<!-- source message: 38 -->

## L-71. Diagram Labels in Mixed Languages

### 한 그림 안에 한국어와 영문 라벨이 무질서하게 섞임

### 개선

한 언어를 기본으로 하고 고유 명칭만 원문 유지한다.

---

<!-- source message: 38 -->

## L-72. Diagram Translation Diverges from Text

### 본문은 `호스트 물리 주소`, 그림은 `HPA`, 표는 `Host PA`

### 문제

같은 개념인지 다시 해석해야 한다.

### 개선

첫 등장에 대응 관계를 정의하고 이후 일관되게 사용한다.

---

<!-- source message: 38 -->

## L-73. Table Header Translation Drift

### 같은 필드명이 표마다 다르게 번역

### 개선

레지스터·프로토콜 필드는 공식 원문을 유지하고 한국어 설명을 별도 열에 둔다.

---

<!-- source message: 38 -->

## L-74. Translated Register Names

### 사양의 레지스터 이름을 한국어로만 표시

### 문제

데이터시트에서 검색하기 어렵다.

### 개선

```text
Host Bridge Control Register
호스트 브리지 제어 레지스터
```

처럼 원문을 유지한다.

---

<!-- source message: 38 -->

## L-75. Unit Localization Error

### 소수점·천 단위·단위 표기가 섞임

```text
1,5 GB/s
1.5GBps
1.5 GB/sec
```

### 개선

사이트 전체 단위 표기 규칙을 정한다.

---

<!-- source message: 38 -->

## L-76. Binary–Decimal Unit Collapse

### GB와 GiB를 혼용

### 문제

성능과 메모리 용량 비교에서 오차가 생긴다.

### 개선

측정 기준에 따라 정확한 단위를 사용한다.

---

<!-- source message: 38 -->

## L-77. Full-Width Character in Code Context

### 한국어 입력기의 전각 기호가 코드나 명령에 들어감

### 문제

복사 실행 시 오류가 발생한다.

### 개선

코드·명령 블록은 ASCII 기호를 검증한다.

---

# 다국어 사이트 운영

<!-- source message: 38 -->

## L-78. Translate Everything Strategy

### 모든 글을 두 언어로 운영하려 함

### 문제

유지보수 비용이 거의 두 배가 된다.

### 개선

대표 Evergreen 글과 국제적 검색 가치가 큰 글부터 선별한다.

---

<!-- source message: 38 -->

## L-79. No Translation Priority

### 어떤 글을 영어로 옮길지 기준 없음

### 개선 기준

```text
고유 실험
국제적 희소성
Evergreen 가치
검색 수요
포트폴리오 가치
```

---

<!-- source message: 38 -->

## L-80. Translation Before Source Stabilization

### 원문이 계속 바뀌는 상태에서 번역

### 문제

번역 업데이트가 반복된다.

### 개선

대표 구조와 기술 검증이 안정된 뒤 번역한다.

---

<!-- source message: 38 -->

## L-81. Separate Translation Workflow Without Sync

### 번역본을 별도 파일로 관리하지만 연결 정보 없음

### 개선

source ID와 revision을 metadata로 관리한다.

---

<!-- source message: 38 -->

## L-82. Automatic Translation Publication

### 생성 후 검토 없이 바로 공개

### 문제

기술적 오류와 어색한 문장이 그대로 노출된다.

### 개선

Draft → 언어 검토 → 기술 검토 → 공개 순서를 둔다.

---

<!-- source message: 38 -->

## L-83. One Locale Sitemap

### 여러 언어 페이지를 운영하지만 Sitemap이 구분되지 않음

### 개선

언어별 URL 관계와 sitemap 구성을 일관되게 관리한다.

---

<!-- source message: 38 -->

## L-84. Language Switch Loses Context

### 언어를 바꾸면 홈으로 이동

### 문제

같은 글의 번역본을 찾기 어렵다.

### 개선

동일 콘텐츠 ID의 다른 언어 버전으로 이동한다.

---

<!-- source message: 38 -->

## L-85. Missing Translation Fallback

### 해당 언어 번역이 없을 때 빈 페이지 또는 404

### 개선

원문 언어로 이동할 수 있음을 명확히 안내한다.

---

<!-- source message: 38 -->

## L-86. Automatic Locale Detection Override

### 브라우저 언어에 따라 강제로 다른 페이지로 이동

### 문제

사용자가 원하는 언어를 선택하기 어렵고 검색 크롤링도 복잡해질 수 있다.

### 개선

자동 감지는 제안 수준으로 사용하고 사용자의 선택을 존중한다.

---

<!-- source message: 38 -->

## L-87. Locale Stored Forever

### 한 번 선택한 언어가 예상치 못하게 계속 강제됨

### 개선

언어 선택 상태를 명확히 보여주고 쉽게 변경할 수 있게 한다.

---

# 코드 검색성과 검색엔진

<!-- source message: 38 -->

## L-88. Translated Function in Heading

```text
장치 검색 함수 분석
```

### 문제

실제 함수명이 제목에 없어 검색성이 떨어진다.

### 개선

```text
`pci_scan_child_bus()`는 장치를 어떻게 열거하는가
```

---

<!-- source message: 38 -->

## L-89. Error Message Omitted from Title and Heading

### 실제 오류 문자열은 본문 깊숙이만 존재

### 문제

정확한 오류 검색으로 유입되기 어렵다.

### 개선

핵심 오류 메시지는 제목 또는 주요 heading에 자연스럽게 포함한다.

---

<!-- source message: 38 -->

## L-90. Searchable English Terms Hidden in Images

### 다이어그램에만 영문 키워드 존재

### 문제

본문 검색과 검색엔진이 개념을 충분히 이해하지 못한다.

### 개선

중요한 라벨과 용어를 본문에서도 설명한다.

---

<!-- source message: 38 -->

## L-91. Code Symbol Tokenization Failure

### `std::vector`, `cudaMemcpyAsync`, `pci_dev`가 일반 단어로 분해

### 개선

기술 identifier 전용 검색 필드를 둔다.

---

<!-- source message: 38 -->

## L-92. Punctuation-Normalized Wrongly

### `A/B`, `C/C++`, `MSI/MSI-X`에서 의미 있는 기호 제거

### 개선

도메인별 tokenizer 규칙을 테스트한다.

---

# 국제 독자와 접근성

<!-- source message: 38 -->

## L-93. English Summary Without Substance

### 영어 요약이 일반 문장 몇 줄뿐

### 문제

영문 독자가 실제 내용을 알 수 없다.

### 개선

요약을 제공한다면 핵심 문제·결론·환경을 담는다.

---

<!-- source message: 38 -->

## L-94. Mixed Language Screen Reader Issue

### 페이지 언어는 한국어인데 긴 영문 인용과 설명을 구분하지 않음

### 개선

긴 영문 문장이나 별도 인용에는 적절한 언어 정보를 제공할 수 있다. 다만 모든 약어에 과도하게 적용하지 않는다.

---

<!-- source message: 38 -->

## L-95. Translation Hides Cultural Context

### 국내 환경·제품·기관을 영문 독자가 안다고 가정

### 개선

필요한 최소 맥락을 추가한다.

---

<!-- source message: 38 -->

## L-96. Local Assumptions in Global Guide

### 시간대, 경로, 키보드, 운영체제 설정을 한국 환경 기준으로만 설명

### 개선

지역에 영향을 받는 설정은 명확히 표시한다.

---

<!-- source message: 38 -->

## L-97. Locale-Specific Screenshot

### 한글 UI 스크린샷만 제공하지만 영문 명칭으로 설명

### 문제

메뉴를 찾기 어렵다.

### 개선

화면 텍스트와 본문 명칭의 대응을 알려준다.

---

<!-- source message: 38 -->

## L-98. Date Ambiguity Across Locales

```text
08/01/2026
```

### 문제

8월 1일인지 1월 8일인지 모호하다.

### 개선

모호하지 않은 날짜 형식을 사용한다.

```text
2026-08-01
2026년 8월 1일
```

---

<!-- source message: 38 -->

## L-99. Locale Changes Technical Meaning

### 소수점, 정규식, shell locale 차이를 무시

### 문제

명령 출력과 파싱 결과가 달라질 수 있다.

### 개선

재현성이 중요한 실험에서는 locale 설정을 명시한다.

---

<!-- source message: 38 -->

## L-100. Localization System Becomes the Product

### 다국어 기능 개발이 콘텐츠보다 커짐

### 문제

번역 관리 UI, 자동 sync, locale routing을 만들다가 실제 대표 글 번역은 진행되지 않는다.

### 개선

대표 글 5~10개를 수동으로 번역해 실제 필요와 비용을 먼저 확인한다.

---

# hawk90에서 우선 확인할 15개

| 우선순위 | 안티패턴 | 이유 |
|---:|---|---|
| 1 | Korean–English Term Drift | 시스템 용어가 많아 글 간 표기 분열 가능성이 큼 |
| 2 | No Search Alias | 한글·영문·약어 검색 연결이 핵심 |
| 3 | Symbol Search Failure | C++, MSI-X, x86-64 같은 토큰이 많음 |
| 4 | Translation Hides Specification Terms | 사양·소스에서 원문 용어를 다시 찾아야 함 |
| 5 | Same Korean Word for Distinct Terms | coherence·consistency 등 의미 구분 중요 |
| 6 | Modal Verb Loss | 사양의 MUST·SHOULD·MAY 정확성이 중요 |
| 7 | Bilingual Title Overload | 제목이 이미 길고 전문 용어가 많음 |
| 8 | Korean Title Without Searchable English Term | 영문 기술 키워드 유입을 놓칠 수 있음 |
| 9 | Code Symbol Tokenization Failure | 함수·타입 중심 검색 품질에 직접 영향 |
| 10 | Error Message Omitted from Heading | 희귀 오류 검색 유입에 중요 |
| 11 | Mixed Slug Policy | 오래된 글과 신규 글의 URL 규칙이 다를 가능성 |
| 12 | Terminology Change Without Migration | 수백 개 글의 검색·일관성 유지 필요 |
| 13 | Translated Error Messages | 실제 오류 검색 가능성을 보존해야 함 |
| 14 | Translate Everything Strategy | 글 수가 많아 전면 번역은 유지 불가능 |
| 15 | Localization System Becomes the Product | 번역 플랫폼보다 핵심 글 선별이 먼저 |

# 추천 최소 용어 관리 모델

복잡한 번역 시스템까지는 필요 없다. 다음 정도면 충분하다.

```yaml
- id: cache-coherence
  en: cache coherence
  ko: 캐시 일관성
  aliases:
    - coherence
    - coherency
    - 코히어런시
  related:
    - memory-consistency
  note: CXL.cache와 CPU cache 문맥에서 사용
```

검색에서는 alias를 모두 사용하고, 화면에는 canonical 표기만 보여준다.

# 추천 표기 원칙

```text
고유 제품명·API·함수명은 원문 유지
첫 등장에 한국어와 영문 병기
이후에는 문맥에 맞는 대표 표기 사용
오류·로그·명령 출력은 원문 유지
사양의 MUST·SHOULD·MAY 강도 보존
제목은 한 언어 중심으로 간결하게 작성
```

# 이번 단계의 핵심 결론

한글 기술 블로그에서 영문 용어를 많이 쓰는 것 자체는 문제가 아니다.

문제는 다음이다.

> 같은 개념이 글마다 다른 이름으로 나타나고, 검색·제목·본문·다이어그램에서 서로 연결되지 않는 것.

따라서 목표는 모든 용어를 번역하는 것이 아니라:

```text
표준 표기
검색 alias
원문 추적 가능성
문맥별 의미 구분
일관된 제목과 metadata
```

를 유지하는 것이다.

다음은 **Task 2-12. Content Discoverability, Recommendation & Knowledge Graph Anti-patterns**로 이어갈 수 있다. 자동 관련 글, 추천 알고리즘, backlink, 선행·후속 관계, 지식 그래프 시각화에서 발생하는 안티패턴을 정리하는 단계다.

<!-- source message: 39 -->

## K-01. Related Posts by Tag Count

### 공통 태그 수만으로 관련 글 추천

```text
A와 B가 `linux`, `pcie` 태그를 공유
→ 관련 글
```

### 문제

태그는 넓고 모호하다. 같은 `Linux` 태그를 가진 글도 학습 관계는 전혀 다를 수 있다.

### 개선

추천 신호에 우선순위를 둔다.

```text
명시적 선행·후속 관계
동일 Topic
동일 Series
본문 링크
콘텐츠 타입
공통 Tag
```

---

<!-- source message: 39 -->

## K-02. Semantic Similarity Equals Relevance

### 임베딩 유사도가 높으면 관련 글이라고 판단

### 문제

문장이 비슷한 글은 찾지만, 독자가 다음에 읽어야 할 글을 찾는 것은 아니다.

예:

```text
PCIe BAR 개념 글
PCIe BAR 오류 로그 글
```

은 의미상 비슷하지만 역할은 다르다.

### 개선

유사도와 관계 유형을 분리한다.

```text
similar
prerequisite
next-step
example
counterexample
debug-case
reference
```

---

<!-- source message: 39 -->

## K-03. Recommendation Without Purpose

### 왜 추천하는지 설명하지 않음

```text
관련 글
- MSI-X
- DMA
- NUMA
```

### 문제

독자는 무엇을 얻는지 알 수 없다.

### 개선

```text
다음 단계: MSI-X 설정 흐름
선행 개념: PCIe Configuration Space
실전 사례: BAR mmap 실패 분석
```

처럼 이유를 표시한다.

---

<!-- source message: 39 -->

## K-04. Same Recommendation Everywhere

### 모든 글 하단에 동일한 인기 글 노출

### 문제

개인화나 문맥이 없고, 학습 흐름이 끊긴다.

### 개선

페이지 역할에 따라 추천 목표를 다르게 둔다.

```text
Guide → 세부 Concept
Concept → 실험·디버깅
Debug Note → 원리 문서
Reference → 대표 Guide
```

---

<!-- source message: 39 -->

## K-05. Popularity Bias

### 조회수 높은 글만 추천

### 문제

이미 인기 있는 글이 계속 더 노출되고, 희귀하지만 중요한 글은 묻힌다.

### 개선

편집자 우선순위와 구조적 중요도를 함께 반영한다.

---

<!-- source message: 39 -->

## K-06. Recency Bias

### 최신 글을 관련 글보다 우선 추천

### 문제

새 글이라는 이유만으로 문맥과 무관한 글이 노출된다.

### 개선

최신성은 관련성이 충분할 때만 보조 가중치로 쓴다.

---

<!-- source message: 39 -->

## K-07. Engagement Optimization

### 클릭률 높은 추천을 계속 강화

### 문제

자극적인 제목이나 쉬운 글만 상위에 남을 수 있다.

### 개선

클릭뿐 아니라 다음을 본다.

```text
학습 흐름
본문 체류
다음 이동
대표 Guide 도달
문제 해결 적합성
```

---

<!-- source message: 39 -->

## K-08. Recommendation Echo Chamber

### 특정 Topic 안에서만 추천이 순환

```text
CXL → CXL → CXL → CXL
```

### 문제

인접 기술과의 연결성이 사라진다.

### 개선

일부 추천은 교차 Topic 관계를 의도적으로 포함한다.

```text
CXL memory
→ NUMA
→ Linux memory tiering
→ PCIe address translation
```

---

<!-- source message: 39 -->

## K-09. Random Exploration Slot

### 다양성을 위해 임의 글을 추천

### 문제

학습 문맥과 전혀 맞지 않을 수 있다.

### 개선

랜덤 대신 편집된 “연결 주제” 슬롯을 사용한다.

---

<!-- source message: 39 -->

## K-10. Too Many Recommendations

### 글 하단에 추천 글 10~20개

### 문제

선택지가 많아지면서 실제 클릭은 어려워진다.

### 개선

역할이 다른 3~5개 정도만 노출한다.

```text
선행 1
다음 1
관련 개념 1
실전 사례 1
상위 Hub 1
```

---

# 관계 모델

<!-- source message: 39 -->

## K-11. One Generic Relation

### 모든 연결을 `related` 하나로 표현

### 문제

학습 순서와 참조 관계를 구분할 수 없다.

### 개선

최소 관계 유형을 둔다.

```text
parent
prerequisite
next
explains
implements
uses
contrasts
supersedes
```

---

<!-- source message: 39 -->

## K-12. Relation Type Explosion

### 관계 종류가 지나치게 많음

```text
loosely-related
somewhat-related
conceptually-precedes
implementation-example-of
```

### 문제

작성자가 일관되게 사용하기 어렵다.

### 개선

처음에는 5~8개 핵심 관계만 사용한다.

---

<!-- source message: 39 -->

## K-13. Directionless Relationship

### A와 B가 관련 있다는 것만 표시

### 문제

A가 B의 선행인지, B가 A의 구현인지 알 수 없다.

### 개선

관계 방향을 명시한다.

```text
Configuration Space
→ prerequisite of
BAR Allocation
```

---

<!-- source message: 39 -->

## K-14. Symmetric Relation Assumption

### 모든 관계를 양방향으로 처리

### 문제

`A is prerequisite of B`와 `B is prerequisite of A`는 같지 않다.

### 개선

대칭 관계와 비대칭 관계를 구분한다.

---

<!-- source message: 39 -->

## K-15. Missing Inverse Relation

### 관계는 저장했지만 반대편에서 활용하지 않음

예:

```text
A prerequisite of B
```

는 있지만 B 페이지에 “선행 문서 A”가 표시되지 않는다.

### 개선

그래프 생성 시 inverse relation을 파생한다.

---

<!-- source message: 39 -->

## K-16. Relation Stored in Multiple Places

### front matter, 시리즈 manifest, 본문 링크에 같은 관계 반복 저장

### 문제

정보가 어긋난다.

### 개선

원본 관계와 파생 관계를 구분하고 source of truth를 하나로 둔다.

---

<!-- source message: 39 -->

## K-17. Relation Inferred from Folder

### 파일 위치가 관계를 결정

```text
/cxl/linux/numa/
```

라고 해서 반드시 학습 순서나 상위 개념 관계가 정확한 것은 아니다.

### 개선

저장 경로와 지식 관계를 분리한다.

---

<!-- source message: 39 -->

## K-18. Relation Inferred from Title

### 제목에 같은 단어가 있으니 연결

### 문제

단어 공유와 개념 관계를 혼동한다.

### 개선

자동화는 후보만 만들고 중요한 관계는 승인한다.

---

<!-- source message: 39 -->

## K-19. Relation Without Evidence

### 왜 연결됐는지 기록 없음

### 개선

자동 생성 관계에는 근거를 남긴다.

```text
shared-topic
explicit-link
same-series
semantic-score
manual
```

---

<!-- source message: 39 -->

## K-20. Stale Relation

### 글이 통합·폐기됐는데 관계는 남음

### 개선

상태 변경과 관계 정리를 같은 workflow에 포함한다.

---

# 선행·후속 학습 경로

<!-- source message: 39 -->

## K-21. Linear Learning Path Assumption

### 모든 독자가 같은 순서로 읽는다고 가정

### 문제

독자의 배경과 목적이 다르다.

### 개선

여러 경로를 제공한다.

```text
개념 중심
소스코드 중심
디버깅 중심
성능 중심
```

---

<!-- source message: 39 -->

## K-22. One Start Point for Everyone

### 입문자가 하나의 긴 로드맵부터 시작해야 함

### 문제

경험자에게 불필요하고 초보자에게 과할 수 있다.

### 개선

선행 지식별 진입점을 제공한다.

---

<!-- source message: 39 -->

## K-23. Path Without Goal

### 글 순서는 있지만 완주 후 무엇을 알게 되는지 없음

### 개선

각 경로에 학습 목표를 적는다.

---

<!-- source message: 39 -->

## K-24. Path Without Exit

### 시리즈를 다 읽은 뒤 다음 단계가 없음

### 개선

상위 Topic이나 실전 프로젝트로 연결한다.

---

<!-- source message: 39 -->

## K-25. Path Locked to Publication Order

### 작성한 순서가 학습 순서

### 문제

작성자는 발견 순서로 썼지만 독자는 개념 순서로 배워야 한다.

### 개선

발행 순서와 학습 순서를 분리한다.

---

<!-- source message: 39 -->

## K-26. Prerequisite Chain Too Deep

### 한 글을 읽기 위해 10개 선행 글 요구

### 문제

진입 장벽이 너무 높다.

### 개선

필수 선행과 선택 선행을 구분하고, 짧은 요약을 제공한다.

---

<!-- source message: 39 -->

## K-27. Circular Prerequisites

### A를 이해하려면 B가 필요하고, B를 이해하려면 A가 필요

### 문제

학습 그래프가 닫힌다.

### 개선

기본 모델을 설명하는 독립 진입 문서를 둔다.

---

<!-- source message: 39 -->

## K-28. Hidden Prerequisite

### 본문 중간에서 갑자기 고급 개념 등장

### 개선

글 상단에 선행 지식을 표시한다.

---

<!-- source message: 39 -->

## K-29. Difficulty as Path

### 난이도 순으로만 콘텐츠를 연결

### 문제

난이도와 개념 의존성은 다르다.

### 개선

관계와 난이도를 별도 속성으로 관리한다.

---

<!-- source message: 39 -->

## K-30. Completing the Path Becomes the Goal

### 학습 경로의 모든 글을 읽어야 한다고 느끼게 함

### 문제

문제 해결형 독자에게 부담이다.

### 개선

필수·선택·심화 문서를 구분한다.

---

# Backlink

<!-- source message: 39 -->

## K-31. Backlink Dump

### 현재 글을 참조하는 모든 문서를 나열

### 문제

많은 글에서 수십 개 링크가 생긴다.

### 개선

의미 있는 backlink만 노출한다.

```text
이 글을 선행 지식으로 사용하는 Guide
이 글을 구현한 Source Walkthrough
이 글을 반박·보완한 글
```

---

<!-- source message: 39 -->

## K-32. Backlink Without Relation

### “이 글을 참조한 글”만 표시

### 문제

왜 참조했는지 모른다.

### 개선

참조 문맥이나 관계 유형을 표시한다.

---

<!-- source message: 39 -->

## K-33. Self-Generated Backlink Noise

### 자동 생성된 관련 글 영역의 링크까지 backlink로 계산

### 문제

그래프가 인위적으로 밀집한다.

### 개선

본문 명시 링크와 자동 추천 링크를 구분한다.

---

<!-- source message: 39 -->

## K-34. Navigation Links Counted as Knowledge Edges

### 헤더·푸터·태그 링크까지 지식 관계로 처리

### 문제

모든 페이지가 강하게 연결된 것처럼 보인다.

### 개선

UI 탐색 링크와 의미 관계 링크를 분리한다.

---

<!-- source message: 39 -->

## K-35. Backlink as Popularity Score

### backlink 수가 많으면 중요한 글이라고 판단

### 문제

공통 용어 글은 링크가 많고, 희귀 핵심 글은 적을 수 있다.

### 개선

관계 유형과 위치에 가중치를 둔다.

---

<!-- source message: 39 -->

## K-36. Missing Backlink for Renamed Pages

### slug 변경 후 링크는 redirect로 살아 있지만 그래프는 끊김

### 개선

canonical ID 기준으로 관계를 관리한다.

---

<!-- source message: 39 -->

## K-37. Backlink Page Indexed as Thin Content

### backlink 목록만 별도 URL로 생성

### 문제

내용이 거의 없는 페이지가 늘어난다.

### 개선

backlink는 문서 UI의 보조 정보로 제공한다.

---

# Topic Graph

<!-- source message: 39 -->

## K-38. Topic Equals Tag

### Topic Graph를 태그 공통도로 생성

### 문제

태그는 횡단 속성이라 지식 계층을 표현하지 못한다.

### 개선

Topic과 Tag를 분리한다.

---

<!-- source message: 39 -->

## K-39. Topic Hierarchy as a Tree Only

### 모든 주제가 하나의 부모만 가짐

### 문제

시스템 분야는 다중 관계가 많다.

예:

```text
DMA
→ PCIe
→ Memory
→ Driver
→ IOMMU
```

### 개선

탐색용 계층과 의미 그래프를 분리한다.

---

<!-- source message: 39 -->

## K-40. Graph Without Canonical Nodes

### `C++`, `cpp`, `cplusplus`가 별도 노드

### 문제

그래프가 분열된다.

### 개선

canonical ID와 alias를 사용한다.

---

<!-- source message: 39 -->

## K-41. Node for Every Tag

### 1회성 태그까지 그래프 노드

### 문제

노드가 너무 많고 의미가 약해진다.

### 개선

핵심 Topic과 주요 Concept만 노드화한다.

---

<!-- source message: 39 -->

## K-42. Article as Every Node

### 모든 글을 같은 크기의 노드로 표시

### 문제

대표 Guide와 작은 Note의 차이가 사라진다.

### 개선

노드 유형과 중요도를 구분한다.

---

<!-- source message: 39 -->

## K-43. Graph Density as Quality

### 연결이 많을수록 좋다고 판단

### 문제

의미 없는 링크가 많아질 수 있다.

### 개선

적은 수의 정확한 관계를 우선한다.

---

<!-- source message: 39 -->

## K-44. Disconnected Node Panic

### 고립 노드가 있으면 무조건 연결

### 문제

독립적인 Reference나 역사 기록은 고립되어도 괜찮을 수 있다.

### 개선

고립이 문제인지 문서 역할에 따라 판단한다.

---

<!-- source message: 39 -->

## K-45. Centrality as Editorial Importance

### 그래프 중심성이 높은 글을 대표 문서로 선정

### 문제

일반 개념 글이 구조상 중심이지만, 네 전문성을 대표하지 않을 수 있다.

### 개선

구조적 중요도와 편집자 중요도를 분리한다.

---

<!-- source message: 39 -->

## K-46. Graph Generated Once

### 지식 그래프를 만든 뒤 갱신하지 않음

### 문제

새 글과 통합 결과가 반영되지 않는다.

### 개선

manifest에서 재생성 가능하게 한다.

---

<!-- source message: 39 -->

## K-47. Graph Without State

### 폐기·구판·검토 필요 문서도 동일하게 표시

### 개선

노드 상태를 반영한다.

---

<!-- source message: 39 -->

## K-48. Graph Without Edge Provenance

### 연결 근거를 알 수 없음

### 개선

수동, 본문 링크, 시리즈, 자동 유사도 등 provenance를 기록한다.

---

# 시각화

<!-- source message: 39 -->

## K-49. Hairball Graph

### 모든 노드와 연결을 한 화면에 표시

### 문제

아무것도 읽을 수 없다.

### 개선

Topic, 수준, 관계 유형별 필터를 제공하거나 기본 범위를 작게 유지한다.

---

<!-- source message: 39 -->

## K-50. Force-Directed Layout as Structure

### 물리 시뮬레이션 배치를 실제 지식 구조로 해석

### 문제

노드 위치가 실행마다 달라지고 의미가 불분명하다.

### 개선

계층·경로·관계 유형에 맞는 레이아웃을 선택한다.

---

<!-- source message: 39 -->

## K-51. Animation-Heavy Graph

### 노드가 계속 움직임

### 문제

읽기 어렵고 성능과 접근성이 나빠진다.

### 개선

초기 배치 후 고정하고 reduced motion을 지원한다.

---

<!-- source message: 39 -->

## K-52. Zoom-Only Navigation

### 그래프에서 확대·축소만 가능

### 문제

키보드와 모바일 사용성이 나쁘다.

### 개선

검색, 목록, breadcrumb를 함께 제공한다.

---

<!-- source message: 39 -->

## K-53. Color-Only Node Types

### Topic·Guide·Debug를 색으로만 구분

### 개선

모양·라벨·범례를 함께 사용한다.

---

<!-- source message: 39 -->

## K-54. Tiny Labels

### 노드가 많아 제목이 읽히지 않음

### 개선

상위 노드만 라벨을 표시하고 상세는 선택 시 보여준다.

---

<!-- source message: 39 -->

## K-55. Graph Replaces Navigation

### 일반 메뉴와 Topic Hub 대신 그래프만 제공

### 문제

그래프는 탐색 보조이지 기본 정보 구조가 아니다.

### 개선

목록과 계층 탐색을 우선하고 그래프는 선택 기능으로 둔다.

---

<!-- source message: 39 -->

## K-56. Graph Has No User Question

### 멋있어 보여서 추가

### 문제

독자가 무엇을 할 수 있는지 불명확하다.

### 개선

그래프의 목적을 하나로 제한한다.

```text
이 주제의 선행 개념 찾기
현재 글과 연결된 실전 사례 찾기
전체 학습 경로 보기
```

---

<!-- source message: 39 -->

## K-57. Graph on Mobile by Default

### 작은 화면에서도 전체 그래프 렌더링

### 문제

조작과 성능이 모두 나쁘다.

### 개선

모바일에서는 목록형 관계 보기로 대체한다.

---

<!-- source message: 39 -->

## K-58. Graph State Not Shareable

### 필터·선택 상태를 URL로 공유할 수 없음

### 개선

필요한 경우 선택된 Topic과 관계 필터를 URL 상태로 표현한다.

---

<!-- source message: 39 -->

## K-59. Graph Requires Heavy Client Runtime

### 지식 관계를 보기 위해 큰 JS bundle 필요

### 문제

정적 사이트의 장점을 잃는다.

### 개선

기본 관계 목록은 정적 HTML로 제공하고 시각화는 지연 로드한다.

---

<!-- source message: 39 -->

## K-60. Graph Analytics Becomes a Product

### 노드 클릭·경로·중앙성을 분석하는 플랫폼까지 개발

### 문제

실제 콘텐츠 연결 작업보다 도구가 커진다.

### 개선

먼저 수동 Topic Hub와 관계 링크의 효과를 확인한다.

---

# 자동화와 AI 추천

<!-- source message: 39 -->

## K-61. AI Recommendation as Truth

### AI가 추천한 관련 글을 자동 게시

### 문제

문장 유사성은 높지만 기술 관계가 틀릴 수 있다.

### 개선

AI는 후보 생성에만 사용하고 중요한 추천은 승인한다.

---

<!-- source message: 39 -->

## K-62. LLM Reads Only Titles

### 제목과 description만 보고 관계 추천

### 문제

실제 결론과 범위를 이해하지 못한다.

### 개선

소제목·핵심 요약·콘텐츠 타입을 함께 제공한다.

---

<!-- source message: 39 -->

## K-63. LLM Reads Full Raw Article

### 전체 코드와 로그까지 모델에 전달

### 문제

비용·노이즈·개인정보 위험이 증가한다.

### 개선

정제된 문서 manifest와 요약을 사용한다.

---

<!-- source message: 39 -->

## K-64. Embedding Model Lock-In

### 특정 벡터 모델의 결과를 영구 관계로 저장

### 문제

모델 변경 시 점수와 관계가 달라진다.

### 개선

자동 점수는 재생성 가능한 파생 데이터로 취급한다.

---

<!-- source message: 39 -->

## K-65. Similarity Threshold by Guess

### 0.8 이상이면 관련 글 같은 임의 기준

### 문제

주제와 콘텐츠 유형마다 적절한 임계값이 다르다.

### 개선

대표 문서 쌍으로 평가 세트를 만든다.

---

<!-- source message: 39 -->

## K-66. No Negative Examples

### 관련된 문서만 테스트

### 문제

유사하지만 추천하면 안 되는 문서를 구분하지 못한다.

### 개선

비관련·중복·경쟁 관계 예시도 평가한다.

---

<!-- source message: 39 -->

## K-67. AI Generates Missing Links Everywhere

### 링크가 적은 글에 자동으로 많은 링크 삽입

### 문제

본문이 링크로 과밀해지고 의미가 약해진다.

### 개선

상위 몇 개 후보만 제시하고 문맥 적합성을 검토한다.

---

<!-- source message: 39 -->

## K-68. Generated Link Text

### AI가 앵커 문구까지 자동 삽입

### 문제

문체와 의미가 어색하거나 링크 대상과 정확히 일치하지 않을 수 있다.

### 개선

링크 후보와 권장 문맥만 제시하고 최종 문장은 사람이 작성한다.

---

<!-- source message: 39 -->

## K-69. Recommendation Feedback Loop

### 클릭이 많은 추천을 강화하면서 같은 글만 반복 노출

### 개선

다양성·구조적 중요도·새 문서 탐색을 별도 제약으로 둔다.

---

<!-- source message: 39 -->

## K-70. Cold-Start Neglect

### 새 글은 클릭 데이터가 없어 추천되지 않음

### 개선

명시적 관계와 Topic 구조를 기본 신호로 사용한다.

---

<!-- source message: 39 -->

## K-71. Model Upgrade Changes Site Structure

### 임베딩 모델 업데이트 후 추천과 그래프가 대폭 변경

### 문제

사이트 탐색이 불안정해진다.

### 개선

대표 관계는 수동 고정하고 자동 추천은 보조 슬롯에만 사용한다.

---

<!-- source message: 39 -->

## K-72. No Recommendation Versioning

### 알고리즘 변경 전후를 비교할 수 없음

### 개선

추천 manifest에 생성 버전과 모델 정보를 기록한다.

---

# Canonical Guide와 중복

<!-- source message: 39 -->

## K-73. No Canonical Node

### 같은 주제의 대표 글이 없음

### 문제

추천 알고리즘이 여러 유사 글을 동등하게 노출한다.

### 개선

Topic마다 대표 Guide·Concept를 지정한다.

---

<!-- source message: 39 -->

## K-74. Canonical Guide Dominates Everything

### 모든 관련 검색과 추천이 대표 Guide로만 감

### 문제

구체적인 Debug Note나 Reference가 묻힌다.

### 개선

사용자 의도에 따라 대표 문서와 세부 문서를 구분한다.

---

<!-- source message: 39 -->

## K-75. Duplicate Articles Linked as Related

### 사실상 같은 검색 의도의 글을 서로 추천

### 문제

중복을 유지하고 사용자 이동만 늘린다.

### 개선

통합 또는 역할 분리를 먼저 검토한다.

---

<!-- source message: 39 -->

## K-76. Superseded Article Recommended

### 구판이 관련 글에 계속 등장

### 개선

상태를 추천 점수와 필터에 반영한다.

---

<!-- source message: 39 -->

## K-77. Related Content Competes with Canonical

### 하위 글이 대표 문서보다 검색·추천에서 강함

### 개선

상위 Guide를 구조적 진입점으로 boost하되, 정확한 문제 검색에는 하위 글을 우선한다.

---

# 사용자 문맥

<!-- source message: 39 -->

## K-78. Same Recommendation for All Entry Points

### 검색으로 들어온 사용자와 시리즈를 따라온 사용자에게 같은 추천

### 문제

사용자 목적이 다르다.

### 개선

진입 문맥을 과도하게 추적하지 않더라도 페이지 내 위치에 따라 추천을 구분한다.

```text
상단: 선행 지식
하단: 다음 단계
```

---

<!-- source message: 39 -->

## K-79. Personalization Before Need

### 사용자별 추천 시스템을 구축

### 문제

트래픽이 적고 콘텐츠 관계가 명확한 기술 블로그에서는 과도하다.

### 개선

문맥 기반 정적 추천이 먼저다.

---

<!-- source message: 39 -->

## K-80. Persistent Reading Profile

### 사용자의 읽은 Topic과 검색 기록을 장기간 저장

### 문제

개인정보와 운영 복잡성이 증가한다.

### 개선

필요하다면 브라우저 로컬 상태로 최소화하고 명확한 제어를 제공한다.

---

<!-- source message: 39 -->

## K-81. Resume Reading Without Consent

### 읽기 위치를 자동 저장·복원

### 문제

공용 기기나 예상치 못한 상태 유지가 불편할 수 있다.

### 개선

선택 기능으로 제공한다.

---

<!-- source message: 39 -->

## K-82. “You May Also Like” Without Explanation

### 소비형 추천 문구 사용

### 문제

지식 문서의 학습 맥락이 약해진다.

### 개선

```text
다음에 읽을 글
필요한 선행 개념
같은 문제의 실전 사례
```

처럼 목적 중심 문구를 쓴다.

---

# 품질과 평가

<!-- source message: 39 -->

## K-83. Click-Through Rate as Relevance

### 클릭률이 높으면 추천이 정확하다고 판단

### 문제

제목의 매력과 실제 관련성을 구분하지 못한다.

### 개선

클릭 후 즉시 이탈·다음 탐색도 함께 본다.

---

<!-- source message: 39 -->

## K-84. Manual Curation Without Review

### 한 번 정한 관련 글을 영구 유지

### 문제

새 글·통합·구판 상태가 반영되지 않는다.

### 개선

대표 글 업데이트 시 관계도 검토한다.

---

<!-- source message: 39 -->

## K-85. Auto Recommendation Without Evaluation Set

### 추천 품질을 체감으로만 판단

### 개선

대표 문서마다 기대 관계를 소규모로 정의한다.

---

<!-- source message: 39 -->

## K-86. No Explanation for Exclusion

### 왜 특정 글이 추천되지 않는지 알 수 없음

### 문제

알고리즘 디버깅이 어렵다.

### 개선

후보 점수와 제외 사유를 개발용 report에 남긴다.

---

<!-- source message: 39 -->

## K-87. Recommendation Metrics Without Editorial Value

### 클릭은 적지만 반드시 필요한 선행 글을 제거

### 개선

일부 관계는 성과 지표와 무관하게 편집 원칙으로 유지한다.

---

<!-- source message: 39 -->

## K-88. Graph Completeness as Quality

### 모든 글에 관계를 채우는 것이 목표

### 문제

억지 연결이 늘어난다.

### 개선

관계가 없는 것이 더 정직한 문서도 허용한다.

---

<!-- source message: 39 -->

## K-89. Recommendation System Without Failure Fallback

### 추천 데이터 생성 실패 시 페이지 오류

### 개선

기본적으로 정적 상위 Topic 링크는 항상 제공한다.

---

<!-- source message: 39 -->

## K-90. Recommendation UI Dominates Conclusion

### 결론보다 추천 카드가 더 크게 보임

### 문제

글의 핵심 판단이 약해진다.

### 개선

본문 결론을 먼저 완성하고 추천은 보조 영역으로 둔다.

---

# 운영

<!-- source message: 39 -->

## K-91. Relationship Editing Requires Code Change

### 관련 글을 바꾸려면 컴포넌트 코드 수정

### 개선

콘텐츠 metadata나 manifest에서 관리한다.

---

<!-- source message: 39 -->

## K-92. Relationship Stored Only in Front Matter

### 모든 관계를 글 파일 상단에 직접 입력

### 문제

관계가 많아지면 front matter가 폭발한다.

### 개선

핵심 명시 관계만 front matter에 두고 나머지는 별도 graph manifest나 파생 데이터로 관리한다.

---

<!-- source message: 39 -->

## K-93. Central Graph File Merge Conflicts

### 모든 관계를 하나의 거대한 YAML에 저장

### 문제

수정 충돌과 가독성 문제가 생긴다.

### 개선

Topic별 파일 또는 문서 ID 기준 분할을 고려한다.

---

<!-- source message: 39 -->

## K-94. Graph Schema Without Validation

### 잘못된 node ID와 순환 관계가 그대로 들어감

### 개선

- 존재하지 않는 문서
- 금지된 순환
- 상태 불일치
- 중복 edge

를 검증한다.

---

<!-- source message: 39 -->

## K-95. Relation Migration Forgotten

### 글 통합 시 링크만 수정하고 graph edge는 방치

### 개선

콘텐츠 migration에 관계 migration을 포함한다.

---

<!-- source message: 39 -->

## K-96. Manual and Automatic Relations Mixed

### 어떤 관계가 사람이 지정했고 자동 생성됐는지 모름

### 개선

provenance를 저장한다.

---

<!-- source message: 39 -->

## K-97. Automatic Relations Committed as Source

### 임베딩 결과를 원본 metadata처럼 Git에 저장

### 문제

모델과 threshold 변경이 대규모 diff를 만든다.

### 개선

자동 관계는 빌드 산출물로 취급한다.

---

<!-- source message: 39 -->

## K-98. No Editorial Override

### 알고리즘 추천을 사람이 수정할 수 없음

### 개선

include, exclude, pin 기능을 제공한다.

---

<!-- source message: 39 -->

## K-99. Override Cemetery

### 과거 알고리즘 문제를 override로 계속 덮음

### 문제

예외 규칙이 누적된다.

### 개선

override가 많아지면 추천 모델이나 taxonomy를 수정한다.

---

<!-- source message: 39 -->

## K-100. Knowledge Graph Becomes the Product

### 그래프·추천 시스템 개발이 콘텐츠 연결보다 커짐

### 문제

정작 대표 Topic Hub와 핵심 내부 링크는 그대로다.

### 개선

다음 순서를 지킨다.

```text
수동으로 대표 글 20개 연결
Topic Hub 5개 구축
관계 유형 검증
자동 후보 생성
필요할 때 시각화
```

---

# hawk90에서 우선 확인할 15개

| 우선순위 | 안티패턴 | 이유 |
|---:|---|---|
| 1 | Related Posts by Tag Count | 기술 주제 관계를 정확히 표현하기 어려움 |
| 2 | Recommendation Without Purpose | 단순 관련 글보다 학습 역할이 중요 |
| 3 | One Generic Relation | 선행·후속·실전·구판 관계를 구분해야 함 |
| 4 | Missing Inverse Relation | 선행 글과 사용 글을 양쪽에서 보여줄 필요 |
| 5 | Path Locked to Publication Order | 작성 순서와 학습 순서가 다를 가능성 큼 |
| 6 | Circular Prerequisites | 시스템 개념이 서로 참조하며 진입점이 사라질 수 있음 |
| 7 | Missing Cross-Topic Recommendations | CUDA·PCIe·NUMA·CXL 연결이 차별화 요소 |
| 8 | Backlink Dump | 글 수가 많아지면 역링크 노이즈가 큼 |
| 9 | Topic Equals Tag | 태그 목록과 지식 구조를 분리해야 함 |
| 10 | Hairball Graph | 전체 시각화는 빠르게 읽을 수 없게 됨 |
| 11 | Graph Replaces Navigation | Topic Hub와 일반 탐색이 우선 |
| 12 | AI Recommendation as Truth | 기술 관계 오류를 자동 게시하면 신뢰 저하 |
| 13 | Duplicate Articles Linked as Related | 추천보다 통합이 우선인 글이 있을 수 있음 |
| 14 | Superseded Article Recommended | 구판 상태를 추천에 반영해야 함 |
| 15 | Knowledge Graph Becomes the Product | 도구 개발보다 수동 연결 검증이 먼저 |

# 추천 최소 관계 모델

처음부터 복잡하게 만들 필요는 없다.

```yaml
parent:
prerequisites:
next:
related:
supersedes:
```

이 정도면 충분하다.

예:

```yaml
parent: pcie
prerequisites:
  - pcie-configuration-space
next:
  - pcie-msi-x
related:
  - linux-pci-enumeration
supersedes: null
```

자동 추천은 이 명시 관계를 대체하지 않고 보조해야 한다.

# 추천 노출 구조

글 하단에는 최대 다음 정도가 적절하다.

```text
상위 주제
필요한 선행 개념
다음에 읽을 글
같은 문제의 실전 사례
```

`관련 글 8개`보다 역할이 분명한 3~4개 링크가 더 낫다.

# 이번 단계의 핵심 결론

좋은 추천 시스템의 목적은 클릭을 늘리는 것이 아니다.

> 독자가 현재 글의 위치를 이해하고, 다음에 필요한 지식으로 자연스럽게 이동하도록 돕는 것.

따라서 `hawk90.github.io`에서는 벡터 검색이나 화려한 그래프보다 먼저 다음이 필요하다.

```text
대표 Topic
Canonical Guide
명시적 선행 관계
다음 단계
구판 대체 관계
교차 Topic 연결
```

이 구조가 수동으로 안정된 뒤에 자동 추천과 그래프 시각화를 붙이는 것이 맞다.

<!-- source message: 40 -->

## T-01. Build Success Equals Correctness

### 빌드가 성공하면 사이트가 정상이라고 판단

Astro build가 성공했다는 것은 대체로 다음만 의미한다.

- 문법 오류가 없음
- import가 해결됨
- 정적 페이지 생성에 성공함

하지만 다음은 보장하지 않는다.

- 내부 링크가 올바른 문서를 가리킴
- 이미지가 실제로 표시됨
- 검색 결과가 적절함
- 글 내용이 정확함
- 모바일 레이아웃이 정상임
- OG 이미지가 최신임

### 개선

빌드 이후 별도의 의미 검증이 필요하다.

---

<!-- source message: 40 -->

## T-02. Type Safety as Content Safety

### TypeScript schema를 통과하면 콘텐츠도 올바르다고 판단

예:

```yaml
status: current
type: guide
```

값은 유효하지만 실제로 오래된 글일 수 있다.

### 문제

타입 시스템은 형식은 검증하지만 의미는 검증하지 못한다.

### 개선

형식 검증과 의미 검증을 분리한다.

```text
Schema validation
Semantic validation
Editorial review
```

---

<!-- source message: 40 -->

## T-03. Test Only the Framework

### Astro 컴포넌트와 utility 함수만 테스트

### 문제

실제 장애는 콘텐츠와 생성 파이프라인에서 더 많이 발생할 수 있다.

예:

- 잘못된 front matter
- 존재하지 않는 관련 글 ID
- 중복 series order
- 오래된 generated asset
- 검색 alias 누락

### 개선

콘텐츠 자체를 테스트 대상으로 취급한다.

---

<!-- source message: 40 -->

## T-04. Content Is Not Code

### Markdown은 사람이 읽는 문서이므로 자동 검증이 필요 없다고 생각

### 문제

수백 개 문서는 사실상 대형 데이터셋이다.

다음 오류는 자동화 없이 찾기 어렵다.

- 동일 slug
- 중복 제목
- 깨진 anchor
- 잘못된 날짜
- 존재하지 않는 이미지
- 폐기된 글 추천

### 개선

콘텐츠도 schema, lint, graph validation 대상으로 관리한다.

---

<!-- source message: 40 -->

## T-05. Test Every Detail

### 모든 문장과 HTML을 snapshot으로 고정

### 문제

작은 문구 변경에도 대량 실패가 발생한다.

### 개선

변하지 않아야 하는 계약만 테스트한다.

```text
URL
문서 구조
metadata
핵심 relation
검색 레코드
생성 자산 존재
```

---

# 단위 테스트

<!-- source message: 40 -->

## T-06. Utility-Only Unit Tests

### slug 함수, 날짜 함수만 단위 테스트

### 문제

실제 사이트 위험은 여러 단계가 결합된 곳에서 발생한다.

### 개선

콘텐츠 하나가 최종 페이지가 되는 흐름을 테스트한다.

---

<!-- source message: 40 -->

## T-07. Mock Everything

### 파일 시스템과 Markdown parser를 모두 mock

### 문제

실제 front matter, encoding, 경로 문제를 놓친다.

### 개선

작은 fixture 디렉터리를 실제로 읽는 테스트를 포함한다.

---

<!-- source message: 40 -->

## T-08. No Parser Fixture

### custom remark·rehype plugin을 실제 Markdown 예제로 검증하지 않음

### 개선

다음 fixture를 둔다.

```text
callout
수식
코드 metadata
한글 heading
중첩 목록
이미지
raw HTML
```

---

<!-- source message: 40 -->

## T-09. Happy-Path Fixture Only

### 정상 Markdown만 테스트

### 개선

의도적으로 잘못된 fixture도 필요하다.

```text
중복 front matter
잘못된 날짜
없는 language grammar
깨진 directive
중복 heading
```

---

<!-- source message: 40 -->

## T-10. Fixture Does Not Resemble Real Content

### 테스트 문서가 지나치게 단순

```markdown
# Hello

Test
```

### 문제

실제 100개 코드 블록, 수식, 표, 한글·영문 혼합 글의 문제를 잡지 못한다.

### 개선

대표적인 복잡도 fixture를 별도로 둔다.

---

<!-- source message: 40 -->

## T-11. Fixture Copy of Production Article

### 실제 글 전체를 테스트 fixture로 복사

### 문제

원본과 fixture가 따로 관리되어 불일치한다.

### 개선

특정 동작을 재현하는 최소 사례를 만든다.

---

<!-- source message: 40 -->

## T-12. Unit Test Internal Implementation

### 내부 함수 호출 순서까지 검증

### 문제

리팩토링할 때 기능은 같아도 테스트가 깨진다.

### 개선

입력과 출력 계약을 검증한다.

---

<!-- source message: 40 -->

## T-13. Generated HTML String Equality

### 전체 HTML 문자열을 정확히 비교

### 문제

attribute 순서나 공백 변경에도 실패한다.

### 개선

DOM 구조와 중요한 요소를 선택적으로 검사한다.

---

<!-- source message: 40 -->

## T-14. Locale-Dependent Test

### 개발 환경 언어에 따라 날짜·정렬 결과가 달라짐

### 개선

테스트 locale과 timezone을 고정한다.

---

<!-- source message: 40 -->

## T-15. Time-Dependent Test

### 현재 날짜에 따라 오래된 글 판정이 달라짐

### 개선

clock을 주입하거나 기준일을 명시한다.

---

# 통합 테스트

<!-- source message: 40 -->

## T-16. No End-to-End Content Pipeline Test

### Markdown부터 최종 HTML까지 한 번도 전체 검증하지 않음

### 개선

대표 fixture에 대해 다음 흐름을 실행한다.

```text
Markdown
→ schema
→ remark/rehype
→ HTML
→ search record
→ graph relation
```

---

<!-- source message: 40 -->

## T-17. Production Build Never Tested in CI

### lint와 unit test만 실행

### 문제

실제 정적 생성 단계의 오류를 놓친다.

### 개선

main merge 전 최소 한 번 production build를 실행한다.

---

<!-- source message: 40 -->

## T-18. Full Build Only Test

### 반대로 모든 테스트가 전체 사이트 build에 의존

### 문제

느리고 실패 원인을 찾기 어렵다.

### 개선

```text
빠른 schema 검사
fixture 통합 테스트
전체 production build
```

를 분리한다.

---

<!-- source message: 40 -->

## T-19. No Generated Output Inspection

### dist 생성 후 존재 여부만 확인

### 개선

대표 페이지의 최종 HTML에서 다음을 검사한다.

- title
- canonical
- description
- H1
- breadcrumb
- status
- 관련 링크

---

<!-- source message: 40 -->

## T-20. One Representative Page

### 홈 한 페이지만 통합 테스트

### 개선

최소 페이지 유형별 사례가 필요하다.

```text
홈
일반 글
시리즈 글
Topic Hub
404
검색
오래된 글
```

---

<!-- source message: 40 -->

## T-21. No Large-Article Test

### 작은 글만 테스트

### 문제

긴 TOC, 많은 코드 블록, 거대한 표에서 생기는 문제를 놓친다.

### 개선

상위 복잡도 글 하나를 canary로 정한다.

---

<!-- source message: 40 -->

## T-22. No Empty-State Test

### 검색 결과 없음, Topic 글 없음, 관련 글 없음 상태를 검증하지 않음

### 문제

빈 카드, 깨진 heading, 잘못된 광고 영역이 나타날 수 있다.

---

<!-- source message: 40 -->

## T-23. No Error-State Test

### 이미지 실패, 댓글 실패, 검색 인덱스 실패 상황을 확인하지 않음

### 개선

외부 integration 실패가 본문을 깨뜨리지 않는지 테스트한다.

---

<!-- source message: 40 -->

## T-24. Preview and Production Divergence

### preview에서는 정상인데 GitHub Pages base path에서 깨짐

### 개선

실제 production base URL과 asset path 조건을 테스트한다.

---

<!-- source message: 40 -->

## T-25. Test Against Source, Not Dist

### 원본 Markdown과 컴포넌트만 검사하고 최종 배포물을 보지 않음

### 문제

생성 과정에서 생긴 URL·asset·HTML 오류를 놓친다.

### 개선

일부 테스트는 반드시 `dist`를 대상으로 한다.

---

# 링크 검증

<!-- source message: 40 -->

## T-26. HTTP Status Only Link Check

### 200이면 정상 링크라고 판단

### 문제

- 다른 내용으로 redirect
- 로그인 페이지
- soft 404
- 원래 출처와 다른 문서

일 수 있다.

### 개선

핵심 출처는 제목이나 canonical까지 선택적으로 확인한다.

---

<!-- source message: 40 -->

## T-27. Every External Link on Every Commit

### 매 commit마다 모든 외부 URL 요청

### 문제

- 느림
- rate limit
- 일시 장애
- CI 불안정

### 개선

내부 링크는 매번, 외부 링크는 정기적으로 검사한다.

---

<!-- source message: 40 -->

## T-28. External Failure Blocks Publishing

### 외부 사이트 일시 장애가 배포를 차단

### 개선

외부 링크 실패는 기본적으로 warning으로 두고 반복 실패 시 검토한다.

---

<!-- source message: 40 -->

## T-29. Redirect Considered Healthy Forever

### 301·302이면 정상 처리

### 문제

redirect chain이나 다른 도메인으로 변경됐을 수 있다.

### 개선

최종 URL과 redirect 횟수를 기록한다.

---

<!-- source message: 40 -->

## T-30. Anchor Links Not Checked

### 페이지 URL은 존재하지만 `#specific-heading`이 사라짐

### 개선

내부 heading anchor까지 검증한다.

---

<!-- source message: 40 -->

## T-31. Generated Heading Slug Assumption

### heading slug 규칙이 항상 같다고 가정

### 문제

한글, 특수문자, 중복 heading에서 달라질 수 있다.

### 개선

실제 parser가 생성한 heading ID를 manifest에 포함한다.

---

<!-- source message: 40 -->

## T-32. Link Checker Parses Code Blocks

### 코드 예제 안 URL을 실제 링크로 검사

### 문제

가짜 domain이나 예제 URL 때문에 오탐이 발생한다.

### 개선

AST 문맥을 고려한다.

---

<!-- source message: 40 -->

## T-33. Link Checker Ignores Reference Links

### Markdown reference-style 링크를 놓침

### 개선

정규식이 아니라 Markdown AST 기반으로 검사한다.

---

<!-- source message: 40 -->

## T-34. Link Fixer Chooses Nearest Title

### 깨진 링크를 제목 유사도로 자동 수정

### 문제

의미가 다른 글로 연결될 수 있다.

### 개선

높은 확신이 없으면 후보만 제시한다.

---

<!-- source message: 40 -->

## T-35. Redirect Hides Internal Link Debt

### 내부 링크가 모두 redirect를 거치지만 검사 통과

### 개선

내부 링크는 최종 canonical URL을 직접 가리키게 한다.

---

# 검색 품질 테스트

<!-- source message: 40 -->

## T-36. Search Works Means Search Is Good

### 결과가 나오기만 하면 완료

### 문제

정확한 결과가 상위에 오는지는 별개다.

### 개선

대표 query set을 유지한다.

---

<!-- source message: 40 -->

## T-37. No Golden Query Set

### 검색 품질을 반복 비교할 기준 없음

### 개선 예:

```text
PCIe BAR
CXL HDM decoder
CUDA pinned memory
UEFI secure boot
MSI-X interrupt
```

각 query에 기대 상위 결과를 지정한다.

---

<!-- source message: 40 -->

## T-38. Only Exact Query Tests

### 제목과 동일한 검색어만 테스트

### 개선

다음을 포함한다.

- 약어
- 한글·영문
- 오타
- 오류 메시지
- 상위 개념
- identifier

---

<!-- source message: 40 -->

## T-39. No Negative Search Cases

### 결과가 없어야 하는 query를 테스트하지 않음

### 문제

무관한 글이 항상 상위에 나오는 문제를 놓친다.

---

<!-- source message: 40 -->

## T-40. Rank-One-Only Evaluation

### 첫 번째 결과만 검사

### 문제

전체 상위 결과 품질과 중복을 놓친다.

### 개선

상위 3~5개 결과를 평가한다.

---

<!-- source message: 40 -->

## T-41. Search Snapshot by Score

### 내부 점수 숫자를 그대로 snapshot

### 문제

알고리즘 미세 변경에 테스트가 자주 깨진다.

### 개선

정확한 점수보다 상대 순서와 포함 여부를 본다.

---

<!-- source message: 40 -->

## T-42. Search Test Ignores Content Status

### 폐기 글이 상위 결과여도 통과

### 개선

`superseded`, `historical` 상태의 ranking 규칙을 검증한다.

---

<!-- source message: 40 -->

## T-43. Search Test Ignores Canonical Guide

### 대표 Guide가 일반 단편 글 아래 있어도 문제로 보지 않음

### 개선

넓은 주제 검색에서는 Hub·Guide가 적절히 노출되는지 검사한다.

---

<!-- source message: 40 -->

## T-44. Search Test Dataset Too Small

### 문서 5개로 검색 알고리즘 테스트

### 문제

실제 수백 개 글에서 나타나는 충돌을 재현하지 못한다.

### 개선

실제 manifest의 축약 샘플이나 production index를 사용한 정기 테스트를 둔다.

---

<!-- source message: 40 -->

## T-45. Search Quality Tested Only Manually

### 체감으로 검색 확인

### 개선

자동 평가와 수동 점검을 병행한다.

---

# 시각 회귀 테스트

<!-- source message: 40 -->

## T-46. Screenshot Every Page

### 모든 페이지 전체 화면을 저장

### 문제

저장 공간·시간·오탐이 과도하다.

### 개선

대표 페이지 유형과 핵심 viewport만 선택한다.

---

<!-- source message: 40 -->

## T-47. No Visual Regression Test

### CSS 변경 후 사람이 몇 페이지 보는 것으로 끝

### 문제

오래된 글, 긴 표, 특수 코드 블록에서 깨짐을 놓친다.

### 개선

canary 페이지를 선정한다.

---

<!-- source message: 40 -->

## T-48. Pixel-Perfect Failure

### 1px 차이에도 실패

### 문제

폰트 렌더링과 OS 차이로 flaky해진다.

### 개선

허용 임계치와 안정된 실행 환경을 사용한다.

---

<!-- source message: 40 -->

## T-49. Visual Test on One Browser

### Chromium만 검사

### 문제

Safari의 font·sticky·overflow 차이를 놓칠 수 있다.

### 개선

전체 브라우저 matrix는 과할 수 있지만, 주요 변경은 최소한 Chromium과 WebKit을 확인한다.

---

<!-- source message: 40 -->

## T-50. Desktop-Only Screenshot

### 모바일 회귀가 검출되지 않음

### 개선

대표 모바일 폭을 포함한다.

---

<!-- source message: 40 -->

## T-51. Screenshot Without Interaction

### 초기 화면만 캡처

### 놓치는 것

- 검색 modal
- 모바일 메뉴
- 코드 wrap
- 이미지 확대
- 다크모드
- TOC active state

### 개선

핵심 상호작용 상태를 몇 개만 선택한다.

---

<!-- source message: 40 -->

## T-52. Dynamic Content in Screenshot

### 댓글·광고·시간 정보 때문에 매번 diff 발생

### 개선

외부 동적 영역을 mock하거나 visual test에서 제외한다.

---

<!-- source message: 40 -->

## T-53. Font Not Pinned

### CI 환경에 따라 fallback font가 달라짐

### 문제

대량 시각 diff가 발생한다.

### 개선

테스트 환경의 폰트와 렌더링 조건을 고정한다.

---

<!-- source message: 40 -->

## T-54. Dark Mode Untested

### 라이트모드만 회귀 테스트

### 개선

대표 글 한두 개는 두 테마를 모두 검사한다.

---

<!-- source message: 40 -->

## T-55. Generated Diagram Untested

### TikZ·SVG 결과가 깨져도 build는 성공

### 개선

대표 다이어그램의 렌더링 결과를 visual canary로 둔다.

---

# 접근성 테스트

<!-- source message: 40 -->

## T-56. Automated Accessibility Equals Accessible

### axe나 Lighthouse 통과로 완료

### 문제

자동 도구는 다음을 완전히 검증하지 못한다.

- heading 의미
- 링크 문구 품질
- 키보드 흐름
- 다이어그램 설명
- 논리적인 focus 이동

### 개선

자동 검사와 짧은 수동 검사를 함께 한다.

---

<!-- source message: 40 -->

## T-57. Accessibility Test on Homepage Only

### 글 페이지의 코드·표·TOC 문제를 놓침

### 개선

대표 장문 글과 검색 modal을 포함한다.

---

<!-- source message: 40 -->

## T-58. No Keyboard Test

### 마우스로만 검증

### 개선

최소 흐름을 테스트한다.

```text
skip link
검색 열기
검색 결과 선택
modal 닫기
본문 링크
코드 복사
```

---

<!-- source message: 40 -->

## T-59. Focus Visible Test Missing

### Tab 이동은 되지만 현재 위치가 안 보임

### 개선

자동화만으로 부족하면 실제 브라우저에서 확인한다.

---

<!-- source message: 40 -->

## T-60. Focus Order Follows DOM Accidentally

### CSS layout 변경 후 focus 순서가 이상해짐

### 개선

모바일 메뉴·카드 grid·sidebar에서 순서를 검증한다.

---

<!-- source message: 40 -->

## T-61. Modal Escape Not Tested

### 검색 modal에서 focus가 뒤 페이지로 빠짐

### 개선

open, initial focus, trap, Escape, focus restore를 테스트한다.

---

<!-- source message: 40 -->

## T-62. Reduced Motion Untested

### 모션 설정 사용자가 페이지 전환을 그대로 경험

### 개선

`prefers-reduced-motion` 조건을 자동 또는 수동 검증한다.

---

<!-- source message: 40 -->

## T-63. High Contrast Untested

### 색 대비 수치만 통과하지만 상태 구분이 사라짐

### 개선

링크, badge, current TOC, warning을 실제로 확인한다.

---

<!-- source message: 40 -->

## T-64. Screen Reader Label Snapshot

### `aria-label` 존재 여부만 검사

### 문제

문구가 실제 행동과 맞는지 모른다.

### 개선

대표 상호작용의 accessible name을 의미 수준으로 검토한다.

---

<!-- source message: 40 -->

## T-65. Semantic HTML Replaced by ARIA Tests

### role이 있으니 올바른 구조라고 판단

### 개선

native element 사용 여부를 우선 검사한다.

---

# 콘텐츠 품질 테스트

<!-- source message: 40 -->

## T-66. Grammar Linter as Technical Validator

### 맞춤법이 맞으면 좋은 글

### 문제

기술적 오류와 논리적 비약은 잡지 못한다.

### 개선

문체 검사와 기술 검증을 분리한다.

---

<!-- source message: 40 -->

## T-67. Minimum Word Count Rule

### 1,000자 미만이면 실패

### 문제

짧고 유용한 Reference와 Debug Note를 불필요하게 늘리게 된다.

### 개선

콘텐츠 타입별 최소 완결성을 평가한다.

---

<!-- source message: 40 -->

## T-68. Required Section Checklist Everywhere

### 모든 글에 서론·장점·단점·결론 강제

### 문제

콘텐츠가 획일화된다.

### 개선

유형별 필수 요소만 검사한다.

---

<!-- source message: 40 -->

## T-69. Description Length as Quality

### meta description 글자 수만 검사

### 문제

길이는 적절하지만 제목을 반복할 수 있다.

### 개선

제목과 description 중복도, 고유 정보 포함 여부를 함께 본다.

---

<!-- source message: 40 -->

## T-70. Duplicate Detector by Text Similarity Alone

### 유사 문장이 많으면 중복 글 판정

### 문제

공통 용어와 코드 때문에 오탐이 많다.

### 개선

- 제목
- 검색 의도
- section 구조
- 고유 실험
- canonical role

을 함께 본다.

---

<!-- source message: 40 -->

## T-71. AI Detector as Quality Gate

### AI 작성 가능성이 높으면 발행 차단

### 문제

탐지 정확성이 낮고 실제 품질과 직접 연결되지 않는다.

### 개선

근거·독창성·환경·검증 흔적을 평가한다.

---

<!-- source message: 40 -->

## T-72. Citation Count as Trust Score

### 출처가 많을수록 좋은 글

### 문제

자료 나열형 글이 유리해진다.

### 개선

핵심 주장과 출처의 대응을 본다.

---

<!-- source message: 40 -->

## T-73. Environment Section Presence Only

### 환경 항목이 존재하면 재현 가능하다고 판단

### 문제

값이 부정확하거나 핵심 설정이 빠질 수 있다.

### 개선

실험 유형별 필요한 환경 필드를 검증한다.

---

<!-- source message: 40 -->

## T-74. Updated Date Automatically Means Verified

### 파일 수정 시 `lastVerified`도 자동 갱신

### 문제

실제 테스트 없이 최신 상태가 된다.

### 개선

검증일은 명시적 사람 행동으로만 바뀌게 한다.

---

<!-- source message: 40 -->

## T-75. Broken Claim Detection by Keyword

### “항상”, “절대” 같은 단어만 경고

### 문제

문맥에 따라 정상일 수 있고, 더 미묘한 과장 표현은 놓친다.

### 개선

자동화는 후보를 표시하고 최종 판단은 사람에게 맡긴다.

---

# 메타데이터와 그래프 검증

<!-- source message: 40 -->

## T-76. Schema Valid, Relation Invalid

### 문서 ID 형식은 맞지만 대상 문서가 없음

### 개선

referential integrity를 검사한다.

---

<!-- source message: 40 -->

## T-77. Self-Referential Relation

```yaml
related:
  - current-article
```

### 개선

자기 참조를 차단한다.

---

<!-- source message: 40 -->

## T-78. Duplicate Relation

### 같은 글이 `next`, `related`, `prerequisite`에 중복

### 문제

UI에서 반복 노출될 수 있다.

### 개선

관계 우선순위와 중복 규칙을 검증한다.

---

<!-- source message: 40 -->

## T-79. Invalid Inverse Relation

### A의 next가 B인데 B의 prerequisite가 전혀 다른 문서

### 개선

필요한 관계는 양방향 일관성을 검사한다.

---

<!-- source message: 40 -->

## T-80. Circular Supersession

```text
A supersedes B
B supersedes A
```

### 개선

폐기 관계는 cycle이 없어야 한다.

---

<!-- source message: 40 -->

## T-81. Series Order Collision

### 같은 시리즈에 order 3이 두 개

### 개선

build 전에 차단한다.

---

<!-- source message: 40 -->

## T-82. Missing Series Member

### manifest에 문서는 있지만 실제 파일이 없음

### 개선

시리즈 manifest와 콘텐츠 집합을 대조한다.

---

<!-- source message: 40 -->

## T-83. Topic Hub References Draft

### 공개 Hub에서 draft 글을 링크

### 개선

환경별 공개 가능 상태를 검증한다.

---

<!-- source message: 40 -->

## T-84. Superseded Article Remains Featured

### 상태와 노출 metadata가 충돌

### 개선

상태 기반 불변조건을 둔다.

```text
superseded → featured 불가
draft → sitemap 불가
noindex → sitemap 불가
```

---

<!-- source message: 40 -->

## T-85. Canonical Slug Collision

### 여러 글이 같은 canonical URL 생성

### 개선

전체 manifest에서 URL uniqueness를 검사한다.

---

# 생성 자산 검증

<!-- source message: 40 -->

## T-86. Asset Exists Means Correct

### OG 파일이 존재하면 정상

### 문제

과거 제목이나 잘못된 폰트로 생성됐을 수 있다.

### 개선

source hash와 generator version을 비교한다.

---

<!-- source message: 40 -->

## T-87. Image Reference Without Dimension Check

### 파일은 있지만 지나치게 큰 원본

### 개선

크기·해상도·포맷 예산을 검사한다.

---

<!-- source message: 40 -->

## T-88. SVG Syntax Only Validation

### XML parser가 읽으면 정상

### 문제

텍스트가 잘리거나 viewBox가 잘못될 수 있다.

### 개선

대표 SVG는 실제 렌더링을 검증한다.

---

<!-- source message: 40 -->

## T-89. OG Text Overflow Untested

### 긴 한글·영문 제목이 이미지 밖으로 벗어남

### 개선

긴 제목·특수문자·이모지 fixture를 둔다.

---

<!-- source message: 40 -->

## T-90. Missing Font Fallback in Generator

### CI에서 한글 폰트가 없어 네모로 생성

### 개선

생성용 폰트를 명시적으로 포함하고 canary 결과를 검사한다.

---

<!-- source message: 40 -->

## T-91. Search Manifest and Page Set Diverge

### 삭제한 글이 검색 인덱스에 남음

### 개선

최종 공개 page manifest와 검색 레코드 집합을 비교한다.

---

<!-- source message: 40 -->

## T-92. RSS Contains Draft or Superseded Content

### 페이지 필터와 RSS 필터가 다름

### 개선

모든 출력이 공통 publication policy를 사용하게 한다.

---

<!-- source message: 40 -->

## T-93. Sitemap Contains Redirect Targets Twice

### 이전 URL과 최종 URL이 모두 Sitemap에 존재

### 개선

canonical 공개 URL만 포함한다.

---

<!-- source message: 40 -->

## T-94. OG Generation Failure Silently Falls Back

### 일부 글이 기본 이미지로 바뀌었지만 경고 없음

### 개선

대표 글이나 Featured 글의 OG 실패는 오류로 처리한다.

---

# 보안 테스트

<!-- source message: 40 -->

## T-95. Dependency Scan Only Security Test

### 취약점 스캔만 수행

### 놓치는 것

- 잘못된 CSP
- secret 노출
- unsafe HTML
- workflow 권한
- 민감 파일 배포

### 개선

정적 사이트에 맞는 보안 검사를 추가한다.

---

<!-- source message: 40 -->

## T-96. No Secret Scan in Content

### 코드만 secret scan

### 문제

Markdown 코드 블록과 로그에도 실제 token이 들어갈 수 있다.

### 개선

콘텐츠 파일과 이미지 metadata까지 범위를 검토한다.

---

<!-- source message: 40 -->

## T-97. CSP Header Presence Only

### CSP가 있으면 통과

### 문제

`unsafe-inline *`처럼 사실상 무의미할 수 있다.

### 개선

금지 directive와 허용 source 목록을 검사한다.

---

<!-- source message: 40 -->

## T-98. Admin Route Hidden Test

### 메뉴에 없으면 안전

### 개선

production artifact에 admin 코드와 route가 실제로 없는지 검사한다.

---

<!-- source message: 40 -->

## T-99. Workflow Permission Not Tested

### GitHub Actions의 기본 권한 변화에 의존

### 개선

workflow에서 `permissions`가 명시됐는지 lint한다.

---

<!-- source message: 40 -->

## T-100. Testing System Becomes the Product

### 테스트·fixture·dashboard가 실제 블로그보다 커짐

### 문제

모든 edge case를 자동화하려다 콘텐츠 개선이 멈춘다.

### 개선

위험과 빈도를 기준으로 테스트한다.

```text
깨지면 큰 문제인가
자주 발생하는가
자동화 비용이 낮은가
사람이 놓치기 쉬운가
```

---

# hawk90에서 우선 확인할 15개

| 우선순위 | 안티패턴 | 이유 |
|---:|---|---|
| 1 | Build Success Equals Correctness | 생성 성공과 콘텐츠 품질은 다름 |
| 2 | Content Is Not Code | 수백 개 Markdown은 사실상 데이터베이스 |
| 3 | No End-to-End Content Pipeline Test | schema부터 검색·관계까지 연결 검증 필요 |
| 4 | Every External Link on Every Commit | 감사 시스템이 CI를 불안정하게 만들 수 있음 |
| 5 | Anchor Links Not Checked | 장문 글 heading 변경 시 깨짐 가능 |
| 6 | No Golden Query Set | 검색 인덱스 개선 효과를 비교하기 어려움 |
| 7 | Search Test Ignores Content Status | 구판 노출 방지 필요 |
| 8 | No Visual Regression Test | 카드·코드·표·다이어그램 UI 변경이 많음 |
| 9 | Desktop-Only Screenshot | 모바일 코드·표 문제가 핵심 |
| 10 | Automated Accessibility Equals Accessible | 검색 modal과 ClientRouter는 수동 확인 필요 |
| 11 | Minimum Word Count Rule | 애드센스 대응 중 글 부풀리기 방지 |
| 12 | Updated Date Automatically Means Verified | 기술 문서 신뢰도에 직접 영향 |
| 13 | Superseded Article Remains Featured | 콘텐츠 상태와 노출 정책 검증 필요 |
| 14 | Search Manifest and Page Set Diverge | 삭제·Draft 글 검색 노출 방지 |
| 15 | Testing System Becomes the Product | 개인 블로그에 과도한 QA 플랫폼 방지 |

# 추천 최소 테스트 피라미드

복잡하게 시작할 필요는 없다.

## 매 변경마다

```text
content schema
내부 링크
relation integrity
slug uniqueness
production build
```

## 주요 UI 변경 시

```text
홈
대표 장문 글
모바일
다크모드
검색 modal
```

의 visual·accessibility smoke test.

## 검색 변경 시

```text
대표 query 20개
상위 결과
한글·영문 alias
구판 제외
```

검증.

## 정기 전체 감사

```text
외부 링크
콘텐츠 신선도
중복 후보
이미지 크기
dist 크기
보안 dependency
```

# 이번 단계의 핵심 결론

기술 블로그 테스트의 목표는 모든 변화를 막는 것이 아니다.

> **깨지면 사용자가 지식을 잘못 이해하거나, 중요한 문서를 찾지 못하거나, 운영자가 대량 오류를 놓치는 부분을 우선 보호하는 것**이다.

따라서 가장 가치 있는 테스트 대상은 컴포넌트 내부 구현보다 다음이다.

```text
콘텐츠 schema
URL
내부 링크
검색 순위
문서 상태
생성 자산
모바일 읽기
접근성
```

다음 단계는 **Task 2-14. Resilience, Backup, Portability & Long-Term Preservation Anti-patterns**로 이어가면 된다. GitHub·Astro·외부 서비스 장애, 콘텐츠 백업, URL 보존, 포맷 이식성, 장기 아카이빙 문제를 다루는 단계다.

<!-- source message: 41 -->

## R-01. Git Is the Backup

### Git 저장소가 있으니 백업이 끝났다고 생각

### 문제

Git은 변경 이력 관리에는 강하지만 다음을 모두 보장하지는 않는다.

- 계정 탈취 대응
- 저장소 삭제
- 조직 정책 변경
- LFS 객체 보존
- 외부 생성 자산 보존
- GitHub Discussions 댓글 보존
- 배포 설정 복구
- 도메인 설정 복구

### 개선

```text
원본 콘텐츠
저장소 metadata
생성 자산
배포 설정
도메인 설정
외부 서비스 데이터
```

를 별도 자산으로 보고 백업한다.

---

<!-- source message: 41 -->

## R-02. Single Remote Dependency

### GitHub 한 곳에만 원격 저장소 존재

### 문제

계정·서비스·정책 문제 발생 시 즉시 대체하기 어렵다.

### 개선

읽기 전용 mirror를 하나 더 둔다.

```text
GitHub
+
로컬 bare repository
또는
다른 Git hosting mirror
```

---

<!-- source message: 41 -->

## R-03. Local Clone as Backup

### 개발 PC의 clone을 백업으로 간주

### 문제

clone은 다음 이유로 완전한 백업이 아닐 수 있다.

- 일부 branch·tag 미수신
- shallow clone
- LFS 미다운로드
- untracked 파일 누락
- 같은 디스크 장애
- 자동 검증 없음

### 개선

정기적인 bare mirror와 복구 테스트를 사용한다.

---

<!-- source message: 41 -->

## R-04. Backup Without Restore Test

### 백업은 만들지만 실제 복구를 해보지 않음

### 문제

손상·누락·권한 문제를 장애 시점에 처음 발견한다.

### 개선

분기별 또는 반기별로 임시 디렉터리에서 다음을 수행한다.

```text
clone or restore
dependency install
production build
대표 페이지 확인
```

---

<!-- source message: 41 -->

## R-05. Backup Without Inventory

### 무엇을 백업하는지 목록이 없음

### 문제

Markdown만 보존하고 다음을 잃을 수 있다.

- 이미지 원본
- redirect map
- taxonomy registry
- OG source
- GitHub Actions
- domain configuration
- analytics export

### 개선

복구에 필요한 자산 목록을 문서화한다.

---

<!-- source message: 41 -->

## R-06. Repository Backup Without Secrets Recovery Plan

### 저장소는 복구했지만 배포 credentials가 없음

### 문제

운영 복구가 지연된다.

### 개선

secret 값 자체를 문서에 저장하지 않고:

```text
secret 이름
용도
발급 위치
권한
회전 방법
복구 담당 절차
```

를 기록한다.

---

<!-- source message: 41 -->

## R-07. Backup Includes Live Secrets

### 편의를 위해 `.env`와 token까지 통째로 백업

### 문제

백업 매체가 새로운 secret 유출 경로가 된다.

### 개선

콘텐츠 백업과 credential 관리 체계를 분리한다.

---

<!-- source message: 41 -->

## R-08. Generated Site as the Only Backup

### `dist/` 결과만 보존

### 문제

최종 HTML은 남지만 다음을 잃는다.

- 원본 Markdown
- metadata
- 시리즈 관계
- 검색 source
- 다이어그램 원본
- 수정 가능한 구조

### 개선

생성 결과는 보조 스냅샷이고 원본을 대체하지 않는다.

---

<!-- source message: 41 -->

## R-09. Source Only, No Rendered Snapshot

### 원본만 있으면 언제든 재생성 가능하다고 생각

### 문제

미래에 다음이 사라질 수 있다.

- 특정 Node 버전
- 오래된 package
- font
- LaTeX 환경
- Expressive Code 동작
- 외부 CDN 자산

### 개선

중요한 릴리스는 렌더링된 정적 artifact도 함께 보존한다.

---

<!-- source message: 41 -->

## R-10. Same Failure Domain Backup

### 원본과 백업이 같은 계정·클라우드·기기에 있음

### 문제

계정 정지, 랜섬웨어, 디스크 장애가 동시에 영향을 준다.

### 개선

최소 하나는 다른 failure domain에 둔다.

---

# 배포 복구

<!-- source message: 41 -->

## R-11. Deployment Is Rebuilt Manually

### 장애가 나면 기억에 의존해 다시 설정

### 문제

- Pages 설정
- custom domain
- HTTPS
- workflow permissions
- branch 설정

을 놓치기 쉽다.

### 개선

배포 절차와 설정을 가능한 한 코드와 runbook으로 남긴다.

---

<!-- source message: 41 -->

## R-12. No Known-Good Artifact

### 최신 main만 배포 가능

### 문제

새 빌드 도구가 깨졌을 때 이전 사이트로 즉시 되돌릴 수 없다.

### 개선

최근 정상 배포 artifact와 commit SHA를 보존한다.

---

<!-- source message: 41 -->

## R-13. Rollback Means Revert Everything

### 콘텐츠 오타와 플랫폼 장애를 같은 방식으로 rollback

### 문제

불필요한 변경까지 되돌릴 수 있다.

### 개선

다음을 구분한다.

```text
콘텐츠 rollback
플랫폼 rollback
배포 artifact rollback
DNS rollback
```

---

<!-- source message: 41 -->

## R-14. Rollback Untested

### 이론상 이전 commit으로 돌아갈 수 있음

### 문제

현재 dependency와 workflow가 과거 commit을 더 이상 빌드하지 못할 수 있다.

### 개선

기존 artifact를 재사용할 수 있는 배포 경로를 둔다.

---

<!-- source message: 41 -->

## R-15. Deploy From Mutable Environment

### 로컬 PC에서 수동으로 build 후 배포

### 문제

환경 차이와 재현성 부족이 생긴다.

### 개선

가능하면 고정된 CI 환경에서 배포 artifact를 생성한다.

---

<!-- source message: 41 -->

## R-16. No Post-Restore Validation

### 사이트가 열리면 복구 성공

### 문제

다음이 조용히 깨질 수 있다.

- 검색
- Sitemap
- canonical
- OG 이미지
- 댓글
- 내부 링크

### 개선

복구 smoke test 목록을 둔다.

---

<!-- source message: 41 -->

## R-17. Domain Recovery Ignored

### 저장소 복구만 준비

### 문제

도메인 등록자 계정, DNS, 인증서 문제가 더 큰 장애가 될 수 있다.

### 개선

도메인 소유권·등록자·DNS 레코드·만료일 복구 절차를 관리한다.

---

<!-- source message: 41 -->

## R-18. Automatic Renewal Assumption

### 도메인이 자동 갱신되니 신경 쓰지 않음

### 문제

결제 수단 만료·계정 잠금·이메일 접근 상실로 실패할 수 있다.

### 개선

만료 알림과 대체 연락 경로를 둔다.

---

<!-- source message: 41 -->

## R-19. DNS Records Undocumented

### 현재 DNS 설정을 대시보드에서만 확인 가능

### 개선

민감하지 않은 DNS 구조를 문서나 export로 보존한다.

---

<!-- source message: 41 -->

## R-20. No Emergency Static Host

### GitHub Pages 장애 시 대체 배포 경로 없음

### 개선

`dist/`만 있으면 다른 정적 호스팅에 올릴 수 있도록 host-specific coupling을 줄인다.

---

# 외부 서비스 회복력

<!-- source message: 41 -->

## R-21. Comments as Permanent Knowledge

### 중요한 정정·답변을 Giscus 댓글에만 남김

### 문제

댓글 서비스가 사라지거나 연결이 깨지면 지식도 사라진다.

### 개선

중요한 정정과 반복 질문은 본문으로 승격한다.

---

<!-- source message: 41 -->

## R-22. Analytics as Historical Archive

### Analytics 서비스가 모든 방문 기록을 영구 보존한다고 가정

### 문제

보존 기간·계정 변경·서비스 종료로 데이터가 사라질 수 있다.

### 개선

정말 필요한 장기 지표만 정기적으로 집계해 별도 보존한다.

---

<!-- source message: 41 -->

## R-23. External Image Hotlinking

### 외부 이미지 URL을 직접 사용

### 문제

- 원본 삭제
- URL 변경
- 접근 차단
- 추적
- 이미지 내용 교체

가능성이 있다.

### 개선

라이선스가 허용되고 장기 가치가 있는 자산은 자체 관리한다.

---

<!-- source message: 41 -->

## R-24. External Script as Required Functionality

### 검색·내비게이션이 외부 CDN 장애에 의존

### 개선

핵심 기능은 자체 정적 자산으로 제공하고 외부 script는 보조 기능으로 제한한다.

---

<!-- source message: 41 -->

## R-25. External Font Dependency

### 폰트 CDN 장애 시 레이아웃이 크게 깨짐

### 개선

합리적인 시스템 폰트 fallback과 크기 호환성을 확보한다.

---

<!-- source message: 41 -->

## R-26. Newsletter Provider Lock-In

### 구독자 목록과 폼이 특정 서비스에만 존재

### 문제

서비스 변경 시 구독자 이전과 동의 증빙이 어려울 수 있다.

### 개선

필요한 데이터 export 가능성과 이전 절차를 확인한다.

---

<!-- source message: 41 -->

## R-27. Search Service Lock-In

### 외부 검색 API 없이는 콘텐츠를 찾을 수 없음

### 개선

최소한의 정적 Topic·검색 fallback을 유지한다.

---

<!-- source message: 41 -->

## R-28. Social Platform as Discovery Backbone

### 외부 SNS 게시물 없이는 과거 글 발견이 어려움

### 문제

플랫폼 정책과 계정 상태에 영향을 받는다.

### 개선

사이트 내부 허브와 RSS를 주요 발견 경로로 유지한다.

---

<!-- source message: 41 -->

## R-29. AdSense Script Failure Breaks Layout

### 광고가 로드되지 않으면 큰 빈 공간이나 오류 발생

### 개선

광고는 실패해도 문서 레이아웃과 탐색이 정상이어야 한다.

---

<!-- source message: 41 -->

## R-30. OAuth Provider as Admin Availability

### GitHub OAuth가 장애면 콘텐츠 작성도 불가능

### 개선

로컬 Git 기반 작성 경로를 항상 유지한다.

---

# 포맷 이식성

<!-- source message: 41 -->

## R-31. Framework-Specific Content

### Markdown에 Astro 전용 컴포넌트가 다수 포함

### 문제

다른 정적 사이트 생성기로 이동하기 어렵다.

### 개선

일반 글은 표준 Markdown과 제한된 확장으로 유지한다.

---

<!-- source message: 41 -->

## R-32. MDX Component Lock-In

### 문서 의미가 특정 UI 컴포넌트에 의존

```mdx
<BenchmarkResult />
<InteractiveDiagram />
```

### 문제

컴포넌트 없이는 콘텐츠가 불완전해진다.

### 개선

핵심 정보는 Markdown에도 남기고 컴포넌트는 향상 기능으로 사용한다.

---

<!-- source message: 41 -->

## R-33. Custom Directive Without Fallback

### 전용 parser가 없으면 내용을 이해할 수 없음

### 개선

원문 자체가 최소한 읽을 수 있는 문법을 선택한다.

---

<!-- source message: 41 -->

## R-34. HTML Embedded for Layout

### 표·열·카드를 만들기 위해 복잡한 HTML 사용

### 문제

다른 renderer와 EPUB·PDF 변환에서 깨지기 쉽다.

### 개선

의미 구조와 화면 배치를 분리한다.

---

<!-- source message: 41 -->

## R-35. CSS Class in Content

```html
<div class="grid-cols-3 dark:bg-zinc-900">
```

### 문제

테마와 Tailwind 버전에 강하게 결합된다.

### 개선

콘텐츠에는 의미 역할만 남기고 스타일은 renderer에서 처리한다.

---

<!-- source message: 41 -->

## R-36. File Path as Public Identity

### 글 ID가 물리적 경로와 동일

### 문제

콘텐츠 이동이 public identity 변경이 된다.

### 개선

안정적인 content ID와 slug를 분리한다.

---

<!-- source message: 41 -->

## R-37. Front Matter Parser Lock-In

### 특정 YAML extension이나 custom type에 의존

### 문제

다른 도구에서 해석이 달라진다.

### 개선

단순하고 널리 지원되는 scalar·array·object를 사용한다.

---

<!-- source message: 41 -->

## R-38. Date Stored in Ambiguous Format

```yaml
date: 08/01/26
```

### 문제

도구와 locale에 따라 다르게 해석된다.

### 개선

ISO 8601 형식을 사용한다.

---

<!-- source message: 41 -->

## R-39. Implicit Metadata Derived From Filename

### 날짜·순서·언어를 파일명 규칙만으로 추론

### 문제

파일 이동과 이름 변경이 의미 변경으로 이어진다.

### 개선

중요한 의미는 metadata에 명시하고 파일명은 저장 편의로 사용한다.

---

<!-- source message: 41 -->

## R-40. Binary Source Format

### 다이어그램 원본이 독점 binary 파일뿐

### 문제

향후 도구 없이 수정하기 어렵다.

### 개선

가능하면 텍스트 기반 원본을 함께 보존한다.

---

# 미디어와 다이어그램 보존

<!-- source message: 41 -->

## R-41. Only Generated Diagram Kept

### SVG 결과만 있고 원본 source 없음

### 문제

수정과 재생성이 어렵다.

### 개선

```text
diagram source
generator version
generated output
```

관계를 보존한다.

---

<!-- source message: 41 -->

## R-42. Only Source Diagram Kept

### 생성 결과는 매번 도구로 만들어야 함

### 문제

도구가 사라지면 과거 사이트를 재현하지 못한다.

### 개선

중요한 release에는 결과물도 함께 보존한다.

---

<!-- source message: 41 -->

## R-43. Unversioned Diagram Toolchain

### 어떤 TikZ·Graphviz 버전을 사용했는지 모름

### 문제

미래에 레이아웃과 폰트가 달라질 수 있다.

### 개선

generator version을 manifest에 기록한다.

---

<!-- source message: 41 -->

## R-44. External Asset by Mutable URL

### `latest`, raw branch URL 같은 변경 가능한 주소 사용

### 문제

과거 글의 이미지나 코드가 미래에 달라질 수 있다.

### 개선

고정된 commit·release·자체 snapshot을 사용한다.

---

<!-- source message: 41 -->

## R-45. Screenshot Without Source Context

### 화면 캡처만 있고 재현 명령과 버전 없음

### 문제

나중에 무엇을 보여주는지 판단하기 어렵다.

### 개선

캡션 또는 metadata에 환경과 출처를 남긴다.

---

<!-- source message: 41 -->

## R-46. Lossy Re-encoding Loop

### 이미지 최적화 과정이 반복되며 품질 저하

### 개선

원본과 배포용 파생 파일을 분리한다.

---

<!-- source message: 41 -->

## R-47. No Original Image Preservation

### WebP 변환 후 원본 삭제

### 문제

다른 크기·형식으로 다시 만들 때 품질이 떨어진다.

### 개선

중요 자산의 무손실 또는 고품질 원본을 별도 보존한다.

---

<!-- source message: 41 -->

## R-48. Font-Dependent SVG

### 특정 시스템 폰트가 없으면 라벨 위치가 깨짐

### 개선

폰트 라이선스를 고려해 경로 변환 또는 안전한 fallback 전략을 선택한다.

---

<!-- source message: 41 -->

## R-49. Diagram Text as Paths Only

### 모든 글자를 path로 변환

### 장점

렌더링 일관성.

### 단점

- 검색 불가
- 접근성 저하
- 수정 어려움
- 파일 크기 증가

### 개선

장기 보존과 접근성 요구를 고려해 선택한다.

---

<!-- source message: 41 -->

## R-50. Media Without Checksums

### 백업된 자산이 손상됐는지 알 수 없음

### 개선

중요 archive에는 manifest와 checksum을 사용할 수 있다.

---

# URL 영속성

<!-- source message: 41 -->

## R-51. URL Changes With Every Taxonomy Refactor

### Category를 바꿀 때 URL도 바뀜

### 문제

외부 링크와 검색 유입이 지속적으로 깨진다.

### 개선

URL은 콘텐츠 정체성을, taxonomy는 탐색을 담당하게 분리한다.

---

<!-- source message: 41 -->

## R-52. Date-Based URL Lock-In

```text
/2026/08/01/post/
```

### 문제

수정·통합 후에도 오래된 날짜 구조가 남고 URL이 불필요하게 길다.

### 개선

날짜가 콘텐츠 의미에 중요하지 않다면 안정적인 slug 중심 URL을 고려한다.

기존 URL은 유지한다.

---

<!-- source message: 41 -->

## R-53. Title-Derived Slug Mutation

### 제목을 개선할 때 slug도 바꿈

### 개선

제목과 URL 수명주기를 분리한다.

---

<!-- source message: 41 -->

## R-54. No Redirect Registry

### redirect가 config 여러 곳에 흩어짐

### 문제

중복·cycle·chain을 관리하기 어렵다.

### 개선

단일 redirect manifest를 둔다.

---

<!-- source message: 41 -->

## R-55. Redirect Chain Accumulation

```text
old-a → old-b → new-c
```

### 개선

모든 이전 URL을 최종 URL로 직접 연결한다.

---

<!-- source message: 41 -->

## R-56. Redirect Provider Lock-In

### 특정 hosting 설정에만 redirect가 존재

### 문제

호스팅 이전 시 URL 보존이 깨진다.

### 개선

host-neutral redirect manifest에서 각 플랫폼 설정을 생성한다.

---

<!-- source message: 41 -->

## R-57. Canonical Depends on Runtime Host

### preview 환경이나 custom domain 변경 시 canonical이 잘못됨

### 개선

production canonical origin을 명시적으로 관리한다.

---

<!-- source message: 41 -->

## R-58. Anchor Instability

### heading 문구 변경 때 section URL이 깨짐

### 개선

중요한 장에는 안정적인 explicit ID를 고려한다.

모든 heading을 수동 ID로 만들 필요는 없다.

---

<!-- source message: 41 -->

## R-59. Duplicate Anchor Renumbering

### 앞쪽에 같은 heading을 추가하면 기존 `-2`, `-3` anchor가 변경

### 개선

외부 참조가 많은 주요 절은 명시적 anchor를 둔다.

---

<!-- source message: 41 -->

## R-60. Deleted URL Forgotten

### 글을 삭제하고 redirect·410·대체 안내 없이 방치

### 개선

삭제 결정마다 URL 처리 정책을 함께 기록한다.

---

# 장기 기술 정확성

<!-- source message: 41 -->

## R-61. Current State Overwrites History

### 최신 동작으로 글을 수정하며 과거 동작을 모두 제거

### 문제

이전 시스템을 유지하는 독자와 기술 변천 기록이 사라진다.

### 개선

버전 차이를 보존하거나 과거 문서를 Historical로 유지한다.

---

<!-- source message: 41 -->

## R-62. Historical Article Looks Current

### 오래된 환경을 다룬 글이 상태 표시 없이 남음

### 개선

대상 버전과 현재 상태를 명확히 표시한다.

---

<!-- source message: 41 -->

## R-63. Link to Latest Documentation

### 항상 최신 문서 URL만 연결

### 문제

과거 버전 글의 근거가 미래에 달라질 수 있다.

### 개선

가능하면 versioned documentation이나 snapshot을 사용한다.

---

<!-- source message: 41 -->

## R-64. Source Link to Main Branch

### 소스코드 분석 글이 `main` branch를 참조

### 문제

미래에 코드가 바뀌면 글과 링크가 불일치한다.

### 개선

tag 또는 commit permalink를 사용한다.

---

<!-- source message: 41 -->

## R-65. Spec Reference Without Revision

### “CXL Specification에 따르면”만 기록

### 문제

개정판마다 내용과 절 번호가 달라질 수 있다.

### 개선

사양 이름·revision·가능하면 section을 기록한다.

---

<!-- source message: 41 -->

## R-66. Benchmark Without Preservation Data

### 그래프만 남고 raw result·환경·실행 script가 없음

### 문제

나중에 결과를 재해석하거나 재현할 수 없다.

### 개선

중요 실험은 다음을 보존한다.

```text
source
build options
environment
raw measurements
analysis script
```

---

<!-- source message: 41 -->

## R-67. Environment Captured as Free Text Only

### “Ubuntu에서 테스트” 정도만 기록

### 문제

미래에 재현하기 어렵다.

### 개선

구조화된 핵심 환경 metadata와 설명을 함께 사용한다.

---

<!-- source message: 41 -->

## R-68. Tool Version Lost

### profiler·compiler·SDK 버전 없음

### 문제

결과 차이의 원인을 추적할 수 없다.

### 개선

실험·디버깅 글에는 주요 도구 버전을 남긴다.

---

<!-- source message: 41 -->

## R-69. Reproduction Requires Defunct Hardware

### 특정 장비에서만 재현 가능하지만 대체 설명이 없음

### 개선

- 관찰 결과
- 핵심 register/log
- 일반화 가능한 원리
- 대체 가능한 시뮬레이션

을 남긴다.

---

<!-- source message: 41 -->

## R-70. External Evidence Disappears

### 근거가 사라진 forum·issue 링크뿐

### 개선

저작권을 침해하지 않는 범위에서 핵심 사실과 문맥을 자체 설명하고 링크는 출처로 사용한다.

---

# 플랫폼 이전

<!-- source message: 41 -->

## R-71. No Export Path

### 현재 Astro 프로젝트에서 콘텐츠를 꺼내는 방법이 없음

### 개선

콘텐츠 manifest를 다음처럼 표준 형식으로 생성할 수 있게 한다.

```text
JSON
Markdown directory
RSS/Atom
static HTML
```

---

<!-- source message: 41 -->

## R-72. Export Loses Relationships

### Markdown만 복사하면 시리즈·Topic·redirect 관계가 사라짐

### 개선

taxonomy와 graph manifest도 export 대상에 포함한다.

---

<!-- source message: 41 -->

## R-73. Export Depends on Building the Whole Site

### export를 위해 현재 toolchain 전체가 필요

### 문제

프로젝트가 깨진 뒤에는 내보내기조차 어려워진다.

### 개선

가벼운 독립 export script를 유지한다.

---

<!-- source message: 41 -->

## R-74. Content IDs Not Stable

### 새로운 시스템으로 옮기면 문서 identity가 바뀜

### 문제

댓글·redirect·관계·번역 연결이 깨진다.

### 개선

framework와 무관한 안정적 content ID를 둔다.

---

<!-- source message: 41 -->

## R-75. Search Data Is Non-Portable

### 특정 검색 library 전용 index만 존재

### 개선

정제된 검색 document manifest를 원본으로 두고 library index는 파생한다.

---

<!-- source message: 41 -->

## R-76. Theme Contains Business Logic

### publication status·canonical·관계 계산이 UI component에 묶임

### 문제

테마를 바꾸면 콘텐츠 규칙도 다시 구현해야 한다.

### 개선

콘텐츠 정책을 독립 모듈 또는 manifest 단계에 둔다.

---

<!-- source message: 41 -->

## R-77. Build Scripts Assume Repository Name

### 경로와 URL이 `hawk90.github.io`에 하드코딩

### 문제

fork·mirror·새 domain 이전이 어렵다.

### 개선

site identity와 path를 config에서 주입한다.

---

<!-- source message: 41 -->

## R-78. GitHub Pages Assumptions Everywhere

### base path·404·redirect·deployment branch 규칙이 코드 곳곳에 존재

### 개선

hosting adapter와 핵심 사이트 로직을 분리한다.

---

<!-- source message: 41 -->

## R-79. No Alternative Render Test

### 콘텐츠가 현재 Astro에서만 읽히는지 확인

### 개선

대표 Markdown을 GitHub renderer나 일반 parser에서도 정기적으로 확인할 수 있다.

---

<!-- source message: 41 -->

## R-80. Migration Rewrite Temptation

### 플랫폼 이전 시 콘텐츠와 URL까지 전면 재작성

### 문제

여러 위험이 한 번에 겹친다.

### 개선

```text
1. 동일 콘텐츠·동일 URL로 이전
2. 안정화
3. 정보 구조 개선
```

순서를 권장한다.

---

# 아카이빙

<!-- source message: 41 -->

## R-81. Live Site Is the Archive

### 운영 사이트가 과거 상태도 보존한다고 생각

### 문제

업데이트와 삭제로 과거 맥락이 사라진다.

### 개선

중요한 시점의 정적 snapshot을 별도 보존한다.

---

<!-- source message: 41 -->

## R-82. Archive Without Discovery

### snapshot은 있지만 어디 있는지 모름

### 개선

릴리스 tag나 archive manifest로 시점과 위치를 기록한다.

---

<!-- source message: 41 -->

## R-83. Archive Every Build

### 모든 commit의 전체 정적 사이트를 영구 보존

### 문제

저장 비용과 관리 노이즈가 커진다.

### 개선

다음 시점만 선택할 수 있다.

```text
주요 리디자인
대규모 migration 전
연간 snapshot
중요 콘텐츠 release
```

---

<!-- source message: 41 -->

## R-84. Archive Without Checksums

### 파일이 장기간 손상됐는지 확인 불가

### 개선

중요 snapshot에 checksum manifest를 둔다.

---

<!-- source message: 41 -->

## R-85. Archive Uses Proprietary Container Only

### 특정 backup 제품 없이는 복원 불가

### 개선

일반 tar·zip·Git bundle·정적 파일처럼 널리 읽을 수 있는 포맷을 병행한다.

---

<!-- source message: 41 -->

## R-86. No Offline Readability

### 모든 CSS·font·script가 외부에 있어 snapshot이 독립적으로 열리지 않음

### 개선

장기 보존 snapshot은 필요한 핵심 자산을 자체 포함한다.

---

<!-- source message: 41 -->

## R-87. Archive Excludes Redirect History

### 최종 글만 보존하고 이전 URL 관계를 잃음

### 개선

redirect manifest도 archive에 포함한다.

---

<!-- source message: 41 -->

## R-88. Archive Excludes Comments and Corrections

### 본문 snapshot은 있지만 중요한 정정은 외부 댓글에만 있음

### 개선

핵심 정정은 본문 변경 이력에 반영한다.

---

<!-- source message: 41 -->

## R-89. No Human-Readable Manifest

### 파일은 많지만 어떤 snapshot인지 모름

### 개선

```text
site version
commit SHA
build date
tool versions
content count
known limitations
```

을 기록한다.

---

<!-- source message: 41 -->

## R-90. Preservation System Becomes the Product

### 완벽한 디지털 보존 플랫폼을 구축

### 문제

개인 블로그 운영 비용을 초과한다.

### 개선

현실적인 보존 단위를 선택한다.

```text
Git mirror
연간 static snapshot
원본 이미지
redirect manifest
복구 문서
```

---

# 장애 대응

<!-- source message: 41 -->

## R-91. No Failure Classification

### 모든 장애를 “사이트 안 됨”으로 처리

### 개선

```text
Build failure
Deploy failure
DNS failure
Content corruption
External integration failure
Account compromise
```

로 구분한다.

---

<!-- source message: 41 -->

## R-92. No Recovery Priority

### 모든 기능을 동시에 복구하려 함

### 개선 순서

```text
1. 핵심 정적 본문
2. URL·HTTPS
3. 검색·Sitemap
4. 이미지
5. 댓글·광고·분석
```

---

<!-- source message: 41 -->

## R-93. Comments Delay Site Recovery

### Giscus 복구까지 사이트 공개를 미룸

### 개선

외부 기능 없이도 핵심 사이트를 먼저 복구한다.

---

<!-- source message: 41 -->

## R-94. Analytics Required for Deployment

### 분석 script 설정 오류가 build를 막음

### 개선

분석·광고는 선택적 integration으로 취급한다.

---

<!-- source message: 41 -->

## R-95. Recovery Changes Canonical URLs

### 임시 호스트에서 복구하면서 해당 URL을 canonical로 출력

### 문제

검색 신호가 임시 domain으로 이동할 수 있다.

### 개선

임시 복구 환경과 production canonical 정책을 분리한다.

---

<!-- source message: 41 -->

## R-96. Emergency Host Indexed

### 임시 복구 사이트가 검색에 노출

### 개선

필요하면 `noindex`하고 원래 domain 복구 후 종료한다.

---

<!-- source message: 41 -->

## R-97. Incident Fix Without Root Cause

### 재배포해 정상화되면 종료

### 문제

같은 장애가 반복된다.

### 개선

짧은 incident note를 남긴다.

```text
원인
영향
복구
재발 방지
```

---

<!-- source message: 41 -->

## R-98. No Account Recovery Preparation

### GitHub·도메인·이메일 계정 복구 경로가 없음

### 개선

복구 이메일, 2FA backup code, 보안키 등 계정 복구 수단을 안전하게 관리한다.

---

<!-- source message: 41 -->

## R-99. Single Maintainer Knowledge

### 모든 복구 절차가 기억 속에만 있음

개인 사이트라도 몇 년 뒤의 본인은 사실상 다른 운영자다.

### 개선

짧은 운영·복구 문서를 남긴다.

---

<!-- source message: 41 -->

## R-100. Resilience Work Prevents Publishing

### 장애 대비를 완벽히 하느라 콘텐츠 작업이 멈춤

### 개선

최소 기준선에서 멈춘다.

```text
두 번째 Git mirror
정기 static snapshot
redirect manifest
복구 가능한 build 환경
핵심 runbook
```

---

# hawk90에서 우선 확인할 15개

| 우선순위 | 안티패턴 | 이유 |
|---:|---|---|
| 1 | Git Is the Backup | GitHub 한 곳만으로는 전체 운영 복구가 안 됨 |
| 2 | Backup Without Restore Test | 실제 build·배포 가능 여부가 중요 |
| 3 | Source Only, No Rendered Snapshot | 현재 복잡한 toolchain을 미래에 재현하지 못할 수 있음 |
| 4 | No Known-Good Artifact | Astro·Node·Shiki 업그레이드 실패 시 즉시 rollback 필요 |
| 5 | Comments as Permanent Knowledge | Giscus의 중요한 정정은 본문으로 승격해야 함 |
| 6 | Framework-Specific Content | 순수 Markdown 이식성을 계속 지켜야 함 |
| 7 | File Path as Public Identity | 분류 개편과 URL 변경을 분리해야 함 |
| 8 | Only Generated Diagram Kept | TikZ·SVG 원본과 결과를 함께 관리해야 함 |
| 9 | URL Changes With Taxonomy Refactor | 기존 검색 유입과 외부 링크 보존 핵심 |
| 10 | Source Link to Main Branch | 소스 분석 글은 commit permalink가 필요 |
| 11 | Spec Reference Without Revision | CXL·PCIe·UEFI 문서의 장기 정확성에 중요 |
| 12 | Search Data Is Non-Portable | 검색 라이브러리보다 검색 document manifest가 원본이어야 함 |
| 13 | GitHub Pages Assumptions Everywhere | 향후 다른 정적 host로 이전 가능해야 함 |
| 14 | No Account Recovery Preparation | GitHub·도메인 계정 상실이 가장 큰 단일 장애가 될 수 있음 |
| 15 | Preservation System Becomes the Product | 실제 콘텐츠보다 백업 플랫폼이 커지지 않게 제한 |

# 추천 최소 복원력 기준선

## 원본

```text
GitHub repository
+
별도 bare mirror
+
원본 이미지·다이어그램 source
```

## 배포

```text
최근 정상 static artifact
commit SHA
build tool version
간단한 smoke test
```

## URL

```text
안정적인 content ID
redirect manifest
canonical 정책
중요 anchor 보존
```

## 외부 서비스

```text
댓글·광고·분석 없이도 본문 정상
중요 댓글은 본문 반영
외부 이미지 hotlink 최소화
```

## 복구 문서

```text
저장소 복원
dependency 설치
production build
Pages 재설정
domain·HTTPS 확인
대표 URL 검증
```

# 이번 단계의 핵심 결론

장기 보존에서 가장 중요한 것은 모든 기술을 영구히 유지하는 것이 아니다.

> **콘텐츠 원본, 문서 정체성, URL 관계, 생성 결과를 서로 분리해 보존하는 것**이 핵심이다.

`hawk90.github.io`에 적합한 방향은 거대한 백업 시스템이 아니라 다음이다.

```text
순수 Markdown 우선
안정적인 content ID와 URL
Git mirror
연간 정적 snapshot
원본 다이어그램 보존
재현 가능한 build metadata
외부 서비스 없는 fallback
```

이 정도만 갖춰도 프레임워크·호스팅·외부 서비스가 바뀌더라도 기술 지식 자산은 오래 유지할 수 있다.

<!-- source message: 42 -->

## D-01. Anti-pattern Collector

### 안티패턴 수집 자체가 목적

### 증상

- 목록은 계속 길어짐
- 새로운 이름을 만드는 데 집중
- 저장소에 실제 적용하지 않음
- 중복된 안티패턴이 여러 분야에 존재
- 개선 작업보다 문서 분류 시간이 더 큼

### 문제

안티패턴 카탈로그는 행동을 돕는 도구이지 결과물이 아니다.

### 개선

각 항목은 최소한 다음 중 하나로 연결돼야 한다.

```text
검사 규칙
수동 리뷰 질문
구체적인 개선 작업
폐기 결정
```

---

<!-- source message: 42 -->

## D-02. Everything Is an Anti-pattern

### 모든 설계 선택을 문제로 해석

예:

```text
카드가 많다 → 안티패턴
카드가 적다 → 안티패턴
글이 길다 → 안티패턴
글이 짧다 → 안티패턴
```

### 문제

맥락과 목적이 사라진다.

### 개선

안티패턴은 기술이나 형태 자체가 아니라 다음 조건으로 정의해야 한다.

```text
특정 맥락에서
반복적으로 나타나며
비용이 이익보다 커지고
개선 가능한 구조적 원인이 있는 상태
```

---

<!-- source message: 42 -->

## D-03. Pattern Without Context

### 발생 조건 없이 이름만 붙임

예:

```text
ClientRouter는 안티패턴이다.
Tailwind는 안티패턴이다.
긴 글은 안티패턴이다.
```

### 문제

같은 선택도 규모와 목적에 따라 결과가 다르다.

### 개선

각 판단에 다음을 포함한다.

```text
어떤 규모에서
어떤 콘텐츠 유형에서
어떤 증상이 있을 때
무슨 비용이 발생하는가
```

---

<!-- source message: 42 -->

## D-04. Technology Blaming

### 구조 문제를 도구 탓으로 돌림

```text
빌드가 느리다 → Astro 문제
CSS가 복잡하다 → Tailwind 문제
콘텐츠가 얽힌다 → Markdown 문제
```

### 문제

실제 원인이 다음일 수 있다.

- 전체 corpus 재처리
- 과도한 생성물
- 콘텐츠 모델 부재
- 기능 경계 붕괴
- 운영 정책 부재

### 개선

도구 교체 전에 원인을 계층별로 나눈다.

```text
콘텐츠
데이터 모델
빌드 파이프라인
UI
도구
인프라
```

---

<!-- source message: 42 -->

## D-05. Best-Practice Absolutism

### 일반적인 모범 사례를 무조건 적용

예:

```text
모든 dependency는 최신이어야 한다.
모든 페이지는 구조화 데이터를 가져야 한다.
모든 글은 2,000자 이상이어야 한다.
모든 UI는 컴포넌트화해야 한다.
```

### 문제

블로그의 실제 목적과 규모를 무시한다.

### 개선

모범 사례를 다음 질문으로 바꾼다.

> 현재 문제를 줄이는 데 실제로 도움이 되는가?

---

<!-- source message: 42 -->

## D-06. Enterprise Solution Bias

### 개인 블로그 문제에 조직용 해결책 적용

예:

```text
콘텐츠 관계 관리
→ 그래프 데이터베이스

운영 지표
→ 데이터 웨어하우스

편집 흐름
→ 자체 CMS

검색
→ 벡터 검색 인프라
```

### 문제

구축·운영 비용이 문제 자체보다 커진다.

### 개선

단계적으로 확장한다.

```text
수동 규칙
→ 단순 manifest
→ 작은 스크립트
→ 반복 규모가 충분할 때 시스템화
```

---

<!-- source message: 42 -->

## D-07. Novelty Bias

### 새로운 기술을 해결책으로 선호

### 증상

- 오래된 단순 방법은 지루하게 느껴짐
- 검색 개선에 LLM부터 고려
- 카드 정리에 디자인 시스템부터 구축
- 콘텐츠 통합보다 새 플랫폼 개발

### 개선

가장 단순한 해결책부터 시도한다.

```text
수동 큐레이션
명시적 metadata
정적 링크
작은 validation script
```

---

<!-- source message: 42 -->

## D-08. Rewrite Reflex

### 문제가 많아 보이면 처음부터 다시 작성

### 문제

- 기존 URL과 콘텐츠 이력 손실
- 새로운 버그
- 완료까지 긴 시간
- 기존 문제를 새 구조에서 반복
- 실제 독자 가치는 늦게 개선

### 개선

재작성보다 경계 정리와 점진적 migration을 우선한다.

---

<!-- source message: 42 -->

## D-09. Local Optimization

### 한 지표만 개선

예:

```text
검색 인덱스 크기 감소
→ 검색 품질 악화

빌드 시간 감소
→ 검증 누락

카드 정보 축소
→ 상태 확인 어려움
```

### 개선

주요 지표와 guardrail을 함께 둔다.

```text
Primary improvement
+
깨지면 안 되는 조건
```

---

<!-- source message: 42 -->

## D-10. Symptom Suppression

### 원인 대신 표면 증상만 수정

예:

```text
태그가 너무 많음
→ 화면에서 일부 숨김

빌드 메모리 부족
→ heap 증가

중복 글
→ canonical만 추가

고아 글
→ 랜덤 관련 글 삽입
```

### 문제

구조적 문제는 그대로 남는다.

### 개선

증상, 직접 원인, 구조적 원인을 분리한다.

---

# 탐지 방식

<!-- source message: 42 -->

## D-11. Detection by Intuition Only

### 눈으로 보고 느낌으로 판단

### 문제

- 규모를 과대·과소평가
- 최근 본 문제에 편향
- 반복 측정 불가
- 개선 전후 비교 불가

### 개선

정성 판단과 간단한 수치를 함께 사용한다.

```text
글 수
고아 문서 수
검색 인덱스 크기
build peak memory
중복 Topic 후보
색인 페이지 유형
```

---

<!-- source message: 42 -->

## D-12. Metrics-Only Detection

### 수치가 임계치를 넘으면 무조건 문제

예:

```text
3분 글 → Thin Content
내부 링크 2개 → 고아에 가까움
코드 블록 100개 → 과도함
```

### 문제

콘텐츠 역할과 고유 가치를 놓친다.

### 개선

수치는 검토 후보를 찾는 데 사용하고 최종 판단은 문맥을 본다.

---

<!-- source message: 42 -->

## D-13. Threshold by Guess

### 근거 없이 임계값 설정

```text
태그는 최대 50개
글은 최소 1,500자
검색 인덱스는 1MB 이하
```

### 개선

현재 baseline과 사용자 환경을 기준으로 정한다.

---

<!-- source message: 42 -->

## D-14. Single Snapshot Diagnosis

### 한 시점의 상태만 보고 결론

### 문제

증가 추세와 일시적 현상을 구분하지 못한다.

### 개선

다음을 함께 본다.

```text
현재값
변화 추세
최근 구조 변경
예상 성장률
```

---

<!-- source message: 42 -->

## D-15. Repository-Only Diagnosis

### 코드와 파일만 보고 사이트 전체를 판단

### 놓칠 수 있는 것

- 실제 렌더링
- 모바일 사용성
- Search Console 상태
- 페이지 속도
- 검색 정확도
- 사용자 이동

### 개선

최소한 네 층을 함께 본다.

```text
저장소
빌드 결과
실제 사이트
운영 데이터
```

---

<!-- source message: 42 -->

## D-16. Production-Only Diagnosis

### 공개 화면만 보고 내부 원인을 추정

### 문제

같은 UI 증상도 여러 구현 원인이 있을 수 있다.

### 개선

실제 config, content schema, build script와 함께 분석한다.

---

<!-- source message: 42 -->

## D-17. Sample Bias

### 최근 글 몇 개만 보고 전체 콘텐츠 판단

### 문제

최근 CXL 글의 특성이 과거 C++·CUDA 글과 다를 수 있다.

### 개선

표본을 콘텐츠 유형과 연도별로 나눈다.

```text
최근 글
오래된 글
대표 글
짧은 글
장문 글
실험 글
디버깅 글
```

---

<!-- source message: 42 -->

## D-18. Worst-Case Generalization

### 가장 나쁜 글 하나로 전체 사이트를 평가

### 개선

단일 오류와 반복 패턴을 구분한다.

---

<!-- source message: 42 -->

## D-19. Average Hides Tail Risk

### 평균값만 봄

예:

```text
평균 빌드 시간
평균 이미지 크기
평균 코드 블록 수
```

### 문제

몇 개의 극단적인 글이 실제 병목일 수 있다.

### 개선

median, p95, 최대값과 상위 문제 문서를 함께 본다.

---

<!-- source message: 42 -->

## D-20. Detection Without Reproduction

### 문제라고 말하지만 실제로 재현하지 않음

예:

```text
ClientRouter가 Analytics를 깨뜨릴 수 있다.
검색이 모바일을 멈추게 할 수 있다.
```

### 문제

가능성과 실제 문제를 혼동한다.

### 개선

다음 상태를 구분한다.

```text
확인된 문제
높은 위험
잠재적 위험
일반적 주의사항
```

---

# 분류와 명명

<!-- source message: 42 -->

## D-21. Duplicate Anti-pattern Names

### 같은 현상을 여러 이름으로 기록

예:

```text
Article Warehouse
Content Warehouse
Post Archive Problem
Flat Content Collection
```

### 문제

카탈로그가 커지지만 실제 범주는 늘지 않는다.

### 개선

canonical ID와 alias를 둔다.

---

<!-- source message: 42 -->

## D-22. One Anti-pattern Covers Everything

### 너무 넓은 항목

```text
Poor Architecture
Bad SEO
Bad UX
```

### 문제

실행 가능한 개선으로 연결되지 않는다.

### 개선

하나의 항목은 하나의 관찰 가능한 구조와 주된 결과를 다룬다.

---

<!-- source message: 42 -->

## D-23. Micro-pattern Explosion

### 지나치게 세분화

예:

```text
복사 버튼이 로그에 있음
복사 버튼이 1줄 코드에 있음
복사 버튼이 모바일에서 겹침
```

### 문제

관리할 항목 수가 불필요하게 늘어난다.

### 개선

공통 원인을 가진 항목은 하나의 상위 패턴과 변형으로 묶는다.

---

<!-- source message: 42 -->

## D-24. Clever Name, Unclear Meaning

### 재미있는 이름이지만 이해가 어려움

### 개선

이름 아래에 즉시 설명 가능한 한국어 정의를 둔다.

---

<!-- source message: 42 -->

## D-25. Name Implies Moral Failure

### 설계 선택을 무능이나 게으름처럼 표현

### 문제

방어적인 반응을 만들고 실제 맥락을 놓친다.

### 개선

비난보다 발생 조건과 비용을 설명한다.

---

<!-- source message: 42 -->

## D-26. Classification by Technology Only

```text
Astro 안티패턴
Tailwind 안티패턴
Markdown 안티패턴
```

### 문제

같은 구조 문제가 여러 도구에서 반복된다.

### 개선

문제 축으로 분류한다.

```text
콘텐츠 모델
탐색
빌드
운영
보안
유지보수
```

---

<!-- source message: 42 -->

## D-27. Classification Without Cross-References

### 한 항목이 다른 문제와 연결되지 않음

예:

```text
Article Warehouse
→ Orphan Content
→ Search Dependency
→ Thin Tag Pages
```

### 개선

원인과 후속 결과 관계를 표시한다.

---

<!-- source message: 42 -->

## D-28. Taxonomy Becomes Hierarchy Debate

### 어느 분류에 넣을지를 오래 고민

### 문제

실제 개선이 지연된다.

### 개선

주 분류 하나와 관련 분류 몇 개면 충분하다.

---

<!-- source message: 42 -->

## D-29. Severity Embedded in Name

```text
Critical Tag Explosion
Fatal SPA Blog
```

### 문제

상황별 위험도를 유연하게 평가하기 어렵다.

### 개선

이름과 현재 저장소의 severity를 분리한다.

---

<!-- source message: 42 -->

## D-30. Catalog Without Versioning

### 안티패턴 정의가 바뀌어도 기록 없음

### 개선

카탈로그도 다음을 관리할 수 있다.

```text
active
merged
renamed
deprecated
```

복잡한 버전 시스템까지는 필요 없다.

---

# 우선순위

<!-- source message: 42 -->

## D-31. Severity-Only Prioritization

### 가장 심각한 문제부터 처리

### 문제

심각하지만 비용이 매우 큰 문제만 남아 실제 진척이 없을 수 있다.

### 개선

최소 네 축으로 평가한다.

```text
영향도
발생 범위
개선 비용
확신도
```

---

<!-- source message: 42 -->

## D-32. Easy-Win-Only Prioritization

### 쉬운 문제만 계속 해결

### 증상

- metadata 누락 수정
- 사소한 CSS 정리
- dependency 몇 개 삭제

하지만 Topic Hub와 콘텐츠 통합은 미룸.

### 개선

쉬운 작업과 구조적 작업을 함께 배치한다.

---

<!-- source message: 42 -->

## D-33. User Impact Ignored

### 코드가 지저분하다는 이유로 우선 처리

### 문제

독자에게 거의 보이지 않는 정리 작업이 핵심 UX보다 앞설 수 있다.

### 개선

다음 순서로 본다.

```text
정확성·신뢰
발견 가능성
읽기 경험
운영 안정성
내부 코드 미관
```

---

<!-- source message: 42 -->

## D-34. Maintenance Cost Ignored

### 사용자에게 보이는 기능만 우선

### 문제

빌드 불안정이나 migration 부채가 나중에 모든 개선을 막을 수 있다.

### 개선

사용자 영향과 미래 작업 차단 위험을 함께 본다.

---

<!-- source message: 42 -->

## D-35. Frequency Ignored

### 드물게 발생하는 큰 문제에만 집중

### 문제

매번 글을 쓸 때 발생하는 작은 마찰이 더 큰 총비용을 만들 수 있다.

### 개선

```text
영향 × 빈도
```

를 함께 평가한다.

---

<!-- source message: 42 -->

## D-36. Blast Radius Ignored

### 한 파일 문제와 전체 사이트 문제를 같은 우선순위로 봄

### 개선

영향 범위를 구분한다.

```text
한 글
한 Topic
한 페이지 유형
전체 사이트
배포 전체
```

---

<!-- source message: 42 -->

## D-37. Confidence Ignored

### 추측성 문제와 확인된 문제를 동일하게 처리

### 개선

확신도를 표시한다.

```text
confirmed
probable
possible
unknown
```

---

<!-- source message: 42 -->

## D-38. Reversibility Ignored

### 되돌리기 어려운 변경을 쉽게 시행

예:

- URL 전체 변경
- 콘텐츠 전면 migration
- 글 대량 삭제
- taxonomy 전환

### 개선

되돌리기 어려울수록 더 강한 검증과 단계적 rollout을 요구한다.

---

<!-- source message: 42 -->

## D-39. Dependency Order Ignored

### 선행 작업 없이 후속 기능부터 구현

예:

```text
지식 그래프 시각화
전에
canonical Topic과 relation schema가 없음
```

### 개선

작업 의존성을 먼저 정한다.

---

<!-- source message: 42 -->

## D-40. Priority Churn

### 새 문제가 보일 때마다 우선순위 변경

### 문제

진행 중 작업이 계속 중단된다.

### 개선

한 sprint 동안은 긴급 오류가 아닌 이상 우선순위를 고정한다.

---

# 점수화

<!-- source message: 42 -->

## D-41. False Precision Score

### 정교해 보이는 점수

```text
위험 점수 8.73
SEO 영향 6.42
```

### 문제

주관적 판단을 객관적 수치처럼 보이게 한다.

### 개선

3~5단계 정도의 거친 등급이면 충분하다.

---

<!-- source message: 42 -->

## D-42. One Composite Score

### 모든 요소를 하나의 숫자로 합침

### 문제

왜 높은 점수인지 알기 어렵다.

### 개선

영향도·비용·확신도를 별도로 보여준다.

---

<!-- source message: 42 -->

## D-43. Score Determines Decision Automatically

### 점수가 높은 항목은 무조건 실행

### 문제

전략적 방향과 작업 의존성을 놓친다.

### 개선

점수는 토론 순서를 돕는 도구로 사용한다.

---

<!-- source message: 42 -->

## D-44. Gaming the Score

### 측정 가능한 항목만 개선

예:

- 내부 링크 개수 증가
- description 채우기
- 글자 수 늘리기

### 문제

실제 정보 가치가 개선되지 않을 수 있다.

### 개선

수치와 샘플 수동 검토를 함께 둔다.

---

<!-- source message: 42 -->

## D-45. Score Without Baseline

### 현재 상태를 모른 채 목표 점수 설정

### 개선

먼저 현재 분포를 확인한다.

---

<!-- source message: 42 -->

## D-46. Static Score Forever

### 한번 평가한 위험도를 갱신하지 않음

### 문제

구조 변경으로 해결됐거나 더 심각해졌을 수 있다.

### 개선

주요 리팩토링 이후 재평가한다.

---

<!-- source message: 42 -->

## D-47. Sitewide Score Hides Distribution

### 사이트 전체 SEO 품질 72점

### 문제

대표 글은 좋고 태그 페이지는 나쁜 식의 차이를 숨긴다.

### 개선

페이지 유형과 Topic별 분포를 본다.

---

<!-- source message: 42 -->

## D-48. Scoring Every Article

### 모든 글을 복잡한 품질 점수로 평가

### 문제

운영 비용이 과도해진다.

### 개선

대표 글과 개선 후보부터 적용한다.

---

<!-- source message: 42 -->

## D-49. No “Do Nothing” Option

### 발견한 문제는 반드시 수정

### 문제

수정 비용이 이익보다 큰 항목도 있다.

### 개선

결정 상태를 둔다.

```text
fix
monitor
accept
defer
not applicable
```

---

<!-- source message: 42 -->

## D-50. Risk Acceptance Without Reason

### “일단 둔다”로 끝

### 개선

수용 이유와 재검토 조건을 짧게 기록한다.

---

# 개선 계획

<!-- source message: 42 -->

## D-51. Anti-pattern to Mega-Project

### 하나의 문제를 큰 프로젝트로 확대

예:

```text
관련 글이 부정확함
→ 지식 그래프 플랫폼 개발
```

### 개선

가장 작은 유효 개선부터 적용한다.

```text
대표 글 20개의 관련 링크 수동 수정
```

---

<!-- source message: 42 -->

## D-52. No Smallest Safe Change

### 최종 구조만 설계

### 문제

중간에 사용자 가치를 전달하지 못한다.

### 개선

각 작업에 최소 배포 단위를 둔다.

---

<!-- source message: 42 -->

## D-53. Refactor Without Baseline

### 개선 전 상태를 기록하지 않음

### 문제

효과를 판단할 수 없다.

### 개선

작업 유형에 맞는 baseline을 남긴다.

---

<!-- source message: 42 -->

## D-54. Refactor Without Acceptance Criteria

### “검색을 개선한다”

### 문제

언제 완료인지 알 수 없다.

### 개선 예:

```text
대표 검색어 20개에서
예상 문서가 상위 3개 안에 포함된다.
```

---

<!-- source message: 42 -->

## D-55. Acceptance Criteria as Implementation Detail

```text
MiniSearch를 사용한다.
JSON을 세 파일로 나눈다.
```

### 문제

사용자 결과가 아니라 구현 방식을 완료 기준으로 삼는다.

### 개선

결과를 기준으로 작성한다.

---

<!-- source message: 42 -->

## D-56. No Negative Acceptance Criteria

### 무엇을 개선할지만 정의

### 개선

깨지면 안 되는 것도 정한다.

```text
검색 품질 개선
단, 초기 JS와 index 크기는 기존 대비 20% 이상 증가하지 않는다.
```

---

<!-- source message: 42 -->

## D-57. Big-Bang Rollout

### 홈·검색·taxonomy·URL을 한 번에 변경

### 문제

원인 분석과 rollback이 어려워진다.

### 개선

순차적으로 배포한다.

---

<!-- source message: 42 -->

## D-58. Migration and Redesign Combined

### 콘텐츠 schema 변경과 UI redesign을 동시에 진행

### 문제

데이터 오류와 표현 오류를 구분하기 어렵다.

### 개선

```text
schema
→ migration
→ 검증
→ UI 적용
```

순서를 사용한다.

---

<!-- source message: 42 -->

## D-59. No Pilot Scope

### 처음부터 모든 글에 적용

### 개선

대표 Topic이나 20개 글로 pilot을 진행한다.

---

<!-- source message: 42 -->

## D-60. Pilot That Avoids Hard Cases

### 가장 깨끗한 글만 선택

### 문제

실제 migration 위험을 파악하지 못한다.

### 개선

다음을 섞는다.

```text
신규 글
오래된 글
긴 글
짧은 글
시리즈 글
특수 문법 글
```

---

# 구현 과정

<!-- source message: 42 -->

## D-61. Tool Before Policy

### 자동화부터 만들고 규칙은 나중에 정함

예:

```text
상태 migration script를 만듦
하지만 current와 historical 기준이 없음
```

### 개선

사람이 적용 가능한 정책을 먼저 정한다.

---

<!-- source message: 42 -->

## D-62. Policy Without Examples

### 원칙은 있지만 판단하기 어려움

### 개선

좋은 사례, 나쁜 사례, 경계 사례를 함께 둔다.

---

<!-- source message: 42 -->

## D-63. Automatic Fix by Default

### 검사 결과를 바로 수정

### 문제

의미적 오류가 대량 발생할 수 있다.

### 개선

기본은 report와 dry-run으로 둔다.

---

<!-- source message: 42 -->

## D-64. Manual Everything

### 안전을 이유로 모든 파일을 직접 수정

### 문제

반복적이고 실수가 발생한다.

### 개선

기계적 변환과 의미 판단을 분리한다.

```text
기계적 변환 → 자동화
의미 선택 → 사람
```

---

<!-- source message: 42 -->

## D-65. No Idempotency

### 같은 개선 스크립트를 재실행하면 계속 변경

### 개선

migration과 fixer는 반복 실행 안정성을 가져야 한다.

---

<!-- source message: 42 -->

## D-66. No Partial Failure Strategy

### 500개 중 한 파일 오류로 전체 작업 실패 또는 반대로 무시

### 개선

실패 파일을 명확히 보고하고 안전한 파일만 처리할지 정책을 정한다.

---

<!-- source message: 42 -->

## D-67. Hidden Mutation

### audit 명령이 파일을 바꿈

### 개선

검사와 수정 명령을 분리한다.

---

<!-- source message: 42 -->

## D-68. Generated Diff Overload

### 자동화가 수천 줄 formatting 변경까지 만듦

### 문제

의미 변경 검토가 어렵다.

### 개선

formatter와 semantic migration을 분리한다.

---

<!-- source message: 42 -->

## D-69. No Review Sampling

### 대량 자동 변경을 전체 눈으로 보거나 전혀 보지 않음

### 개선

위험 유형별 표본을 검토한다.

---

<!-- source message: 42 -->

## D-70. No Rollback Boundary

### 여러 종류의 개선을 한 commit에 적용

### 개선

작업 유형별 commit과 branch 경계를 둔다.

---

# 개선 후 검증

<!-- source message: 42 -->

## D-71. Done When Merged

### 코드가 main에 들어가면 완료

### 개선

실제 production에서 결과를 확인한다.

---

<!-- source message: 42 -->

## D-72. Validate Only the Happy Path

### 대표 페이지 하나만 확인

### 개선

변경 영향이 큰 경계 사례를 포함한다.

---

<!-- source message: 42 -->

## D-73. Measure Immediately

### 배포 직후 SEO·사용자 지표 판단

### 문제

검색 반영과 사용자 행동에 시간이 필요하다.

### 개선

기술 검증과 장기 효과 검증을 분리한다.

```text
즉시:
빌드·UI·링크

후속:
검색·사용자 이동·성능 추세
```

---

<!-- source message: 42 -->

## D-74. No Before–After Samples

### 수치만 비교하고 실제 페이지를 보지 않음

### 개선

대표 페이지와 query를 전후 비교한다.

---

<!-- source message: 42 -->

## D-75. Success Means No Regression

### 깨지지 않았으면 개선 성공

### 문제

실제 사용자 가치가 늘지 않았을 수 있다.

### 개선

목표한 행동이나 품질이 개선됐는지 확인한다.

---

<!-- source message: 42 -->

## D-76. Metric Improved, Experience Worsened

### 지표 승리를 그대로 채택

예:

```text
광고 RPM 증가
하지만 본문 흐름 악화
```

### 개선

guardrail을 적용한다.

---

<!-- source message: 42 -->

## D-77. No Long-Tail Validation

### 대표 글만 좋아지고 나머지 글이 깨짐

### 개선

전체 manifest 검사와 표본 페이지 검토를 함께 한다.

---

<!-- source message: 42 -->

## D-78. No Cleanup After Success

### migration adapter, feature flag, 임시 스크립트가 남음

### 문제

성공한 개선이 새로운 부채를 만든다.

### 개선

완료 조건에 임시 구조 제거를 포함한다.

---

<!-- source message: 42 -->

## D-79. No Documentation Update

### 구현은 바뀌었지만 작성 가이드와 README는 이전 규칙

### 개선

정책·도구·문서를 함께 갱신한다.

---

<!-- source message: 42 -->

## D-80. No Reassessment

### 한 번 해결한 문제는 영구 해결됐다고 생각

### 개선

규모와 콘텐츠 구조가 바뀌면 다시 평가한다.

---

# 안티패턴 관리 운영

<!-- source message: 42 -->

## D-81. Backlog Without States

### 안티패턴 목록에 발견 항목만 계속 추가

### 개선

상태를 둔다.

```text
observed
confirmed
planned
in-progress
resolved
accepted
not-applicable
```

---

<!-- source message: 42 -->

## D-82. Backlog Without Evidence

### 문제 이름만 기록

### 개선

다음을 연결한다.

```text
증거 페이지
관련 수치
발생 범위
재현 방법
```

---

<!-- source message: 42 -->

## D-83. One Issue per Anti-pattern

### 카탈로그 항목마다 GitHub Issue 생성

### 문제

실제 같은 원인을 가진 이슈가 폭발한다.

### 개선

개선 프로젝트나 원인 단위로 묶는다.

---

<!-- source message: 42 -->

## D-84. One Mega-Issue for Everything

### 반대로 모든 개선을 하나의 Issue에 넣음

### 문제

진척과 완료 기준이 불명확하다.

### 개선

사용자 가치 단위의 작업으로 분리한다.

---

<!-- source message: 42 -->

## D-85. No Owner Because Personal Project

### 개인 프로젝트이므로 담당 개념이 없음

### 문제

미래의 본인이 어떤 맥락에서 다시 봐야 하는지 모른다.

### 개선

담당자 대신 다음을 기록한다.

```text
다음 행동
재검토 시점
관련 영역
```

---

<!-- source message: 42 -->

## D-86. Deadline for Every Debt

### 모든 구조 문제에 기한 설정

### 문제

불필요한 압박과 우선순위 왜곡이 생긴다.

### 개선

긴급 문제와 기회 개선을 구분한다.

---

<!-- source message: 42 -->

## D-87. No Expiration for Experiments

### 임시 개선과 feature flag가 영구화

### 개선

실험 종료 조건과 제거 날짜를 둔다.

---

<!-- source message: 42 -->

## D-88. Closed Means Gone

### Issue를 닫았으므로 문제도 사라졌다고 생각

### 개선

검증 결과와 남은 제한을 기록한다.

---

<!-- source message: 42 -->

## D-89. Reopening as Failure

### 문제가 재발하면 이전 개선이 실패했다고 생각

### 문제

규모 증가로 새 임계점을 넘었을 수 있다.

### 개선

재발 원인을 기존 해결의 한계와 분리한다.

---

<!-- source message: 42 -->

## D-90. Governance System Becomes the Product

### 안티패턴 관리용 대시보드·스키마·도구 구축

### 문제

실제 사이트 개선보다 관리 시스템이 커진다.

### 개선

Markdown 문서와 단순 Issue label 정도로 시작한다.

---

# 심리적·의사결정 안티패턴

<!-- source message: 42 -->

## D-91. Shame-Driven Refactoring

### 과거 코드를 부끄러워서 전면 수정

### 문제

실제 사용자 영향보다 자기 평가가 우선된다.

### 개선

현재 목적과 비용을 기준으로 판단한다.

---

<!-- source message: 42 -->

## D-92. Sunk-Cost Preservation

### 이미 만든 기능이라 제거하지 못함

예:

- 관리자 편집기
- 여러 코드 테마
- 복잡한 페이지 전환
- 사용되지 않는 설정

### 개선

과거 비용이 아니라 미래 가치와 유지 비용을 본다.

---

<!-- source message: 42 -->

## D-93. Perfectionism as Architecture

### 모든 예외를 미리 처리

### 문제

실제 요구보다 복잡한 설계가 생긴다.

### 개선

현재 반복되는 요구만 지원한다.

---

<!-- source message: 42 -->

## D-94. Fear of Breaking Old Content

### 과거 글 때문에 구조를 전혀 개선하지 못함

### 개선

migration, redirect, status 표시로 위험을 관리한다.

---

<!-- source message: 42 -->

## D-95. Fear of Deletion

### 모든 글과 기능을 보존

### 문제

공개 구조가 계속 복잡해진다.

### 개선

Git history가 존재하므로 공개 사이트에는 현재 최선의 형태만 남길 수 있다.

---

<!-- source message: 42 -->

## D-96. Architecture as Identity

### 특정 기술 선택을 자신의 역량과 동일시

예:

```text
Astro를 버리면 설계가 실패한 것 같다.
직접 만든 테마를 줄이면 후퇴 같다.
```

### 개선

기술은 현재 목적을 위한 수단으로 본다.

---

<!-- source message: 42 -->

## D-97. Complexity as Professionalism

### 복잡한 구조가 더 전문적이라고 생각

### 문제

개인 기술 블로그에 불필요한 계층과 도구가 늘어난다.

### 개선

독자가 느끼는 전문성은 정확성과 설명에서 나온다.

---

<!-- source message: 42 -->

## D-98. Endless Analysis

### 충분한 분석 뒤에도 계속 새 항목을 찾음

### 문제

실행이 계속 미뤄진다.

### 개선

분석 종료 조건을 둔다.

```text
핵심 위험이 확인됨
우선순위가 정해짐
첫 작업이 명확함
```

---

<!-- source message: 42 -->

## D-99. Action Without Reflection

### 반대로 목록을 보자마자 수정

### 문제

관련 구조와 부작용을 놓친다.

### 개선

작은 계획과 baseline은 필요하다.

---

<!-- source message: 42 -->

## D-100. Anti-pattern Catalog Becomes the Product

### 카탈로그 완성도가 실제 사이트보다 중요해짐

### 문제

안티패턴 1,000개를 정리해도 사이트는 그대로일 수 있다.

### 개선

카탈로그의 성공 기준을 이렇게 정의한다.

```text
사용자가 더 쉽게 글을 찾는다.
대표 콘텐츠가 명확해진다.
기술 문서의 신뢰도가 높아진다.
운영 비용이 줄어든다.
```

---

# 실용적인 평가 모델

안티패턴 하나를 실제 작업으로 옮길 때는 이 정도면 충분하다.

| 항목 | 질문 |
|---|---|
| 증거 | 실제로 어디에서 발생하는가? |
| 영향 | 독자·검색·운영에 어떤 문제가 생기는가? |
| 범위 | 몇 개 페이지 또는 기능에 영향을 주는가? |
| 확신도 | 확인됐는가, 가능성만 있는가? |
| 비용 | 수정하는 데 어느 정도 작업이 필요한가? |
| 가역성 | 잘못됐을 때 쉽게 되돌릴 수 있는가? |
| 의존성 | 먼저 해야 할 작업이 있는가? |

점수는 정밀할 필요가 없다.

```text
영향: 낮음 / 중간 / 높음
범위: 일부 / 다수 / 전체
비용: 작음 / 중간 / 큼
확신: 가능 / 유력 / 확인
```

---

# 추천 작업 상태

```text
Observed
Confirmed
Accepted
Planned
In Progress
Resolved
Not Applicable
```

각 항목에는 한 줄의 증거만 연결한다.

예:

```yaml
id: A-01
name: Article Warehouse
status: confirmed
impact: high
scope: site-wide
evidence:
  - 홈페이지가 최신 글 중심
  - 대표 Topic Hub가 부족
nextAction:
  - PCIe & CXL Hub 초안 작성
```

이를 위한 별도 대시보드나 데이터베이스는 필요 없다.

---

# hawk90에서 먼저 실제 작업으로 바꿀 10개

지금까지 나온 수백 개 항목 중 우선순위는 이 정도로 줄일 수 있다.

| 우선순위 | 문제 | 첫 작업 |
|---:|---|---|
| 1 | Article Warehouse | 대표 글 20개 선정 |
| 2 | Missing Topic Hub | PCIe & CXL Hub 작성 |
| 3 | Identity–Content Mismatch | 홈의 사이트 설명 수정 |
| 4 | Chronological Architecture | Core Topics와 Featured Guides 추가 |
| 5 | Evidence Blending | 대표 글에 관찰·근거·추론 구분 |
| 6 | Versionless Content | 핵심 글의 환경·검증일 추가 |
| 7 | Topic Cannibalization | 유사 글 10개 역할 분석 |
| 8 | Search Index as a Dump | 검색 인덱스 크기와 필드 측정 |
| 9 | Full Corpus Build | 빌드 단계별 시간·메모리 측정 |
| 10 | Theme–Blog Convergence | 저장소의 1차 목적 한 문장 선언 |

여기서도 처음에는 **1~4번만 실행해도 충분하다.**

---

# Task 2 최종 결론

지금까지 Architecture부터 콘텐츠, 검색, 성능, SEO, UX, 운영, 보안, 관측, 편집, 다국어, 추천, 테스트, 보존까지 카탈로그화했다.

하지만 핵심은 수백 개 안티패턴이 아니다.

`hawk90.github.io`의 중심 문제는 다음 다섯 개로 압축된다.

```text
1. 좋은 글이 많지만 대표 지식 구조가 약함
2. 최신 글이 사이트 전체 정체성을 지배함
3. 콘텐츠보다 퍼블리싱 플랫폼이 빠르게 복잡해짐
4. 실제 경험·검증·문서 상태가 구조화되지 않음
5. 신규 글 작성이 기존 지식의 통합보다 앞섬
```

따라서 해결도 다섯 개다.

```text
Topic Hub
대표 글
명시적 관계
검증 정보
기능 경계
```

이것으로 **Task 2: Technical Blog Anti-pattern Catalog**는 마무리할 수 있다.

다음 단계는 카탈로그를 더 늘리는 것이 아니라 **Task 3. 실제 `hawk90.github.io` 개선 백로그 작성**이다. 지금까지의 일반 안티패턴을 실제 저장소 작업 단위로 바꾸고, `P0/P1/P2`, 예상 효과, 수정 위치, 완료 조건까지 정리하는 단계다.

<!-- source message: 43 -->

# A-01. 저장소의 1차 목적 선언

## 문제

현재 사이트는 다음 세 정체성이 동시에 섞여 있다.

```text
개인 기술 블로그
시스템 지식베이스
범용 Astro 테마
```

이 상태에서는 기능을 추가할 때 판단 기준이 흔들린다.

예를 들어 새로운 기능을 검토할 때:

```text
내 블로그 독자에게 필요한가?
범용 테마 사용자에게 필요한가?
관리자인 나에게 필요한가?
```

가 섞인다.

## 작업

README와 내부 설계 문서에 저장소의 우선순위를 선언한다.

권장 문구:

```text
This repository primarily powers Hawk's systems engineering
knowledge base.

Reusable theme features are secondary and should not increase
the complexity of the production site without a demonstrated need.
```

한국어 내부 원칙은 다음 정도면 된다.

```text
이 저장소의 1차 목적은 Hawk 기술 지식베이스 운영이다.
범용 테마 기능은 실제 사이트 요구를 해치지 않는 범위에서만 유지한다.
```

## 수정 후보 위치

```text
README.md
docs/architecture.md
또는
docs/adr/001-site-purpose.md
```

## 완료 조건

- 저장소 목적이 한 문장으로 명시됨
- 개인 사이트와 범용 테마의 우선순위가 구분됨
- 신규 기능 판단 기준이 세 가지 이하로 정리됨

## 기능 판단 기준

```text
독자의 콘텐츠 발견을 개선하는가
기술 문서의 신뢰성을 높이는가
운영 비용을 실제로 줄이는가
```

셋 중 하나에도 해당하지 않으면 우선 보류한다.

## 기대 효과

- 관리자 기능과 테마 기능의 무분별한 확장 억제
- 프레임워크 재작성 충동 감소
- 콘텐츠 구조 작업에 우선순위 집중
- 기능 삭제 판단이 쉬워짐

## 우선순위

```text
P0
```

## 예상 작업량

```text
매우 작음
```

---

<!-- source message: 43 -->

# A-02. 홈 Hero 문구 재정의

## 문제

현재 Hero가 C++ 중심의 개인 소개라면 실제 콘텐츠 범위를 충분히 표현하지 못한다.

최근 글은 CXL, UEFI, Bootloader, PCIe처럼 더 넓고 깊은 시스템 주제를 다룬다. 따라서 Hero와 실제 콘텐츠가 불일치한다.

## 작업

Hero를 다음 세 요소로 구성한다.

```text
정체성
핵심 분야
독자 가치
```

## 권장 구조

### Eyebrow

```text
Systems Engineering Knowledge Base
```

### 제목

```text
Low-level software, explained from code to hardware
```

또는 한국어 중심으로:

```text
코드에서 하드웨어까지 연결하는 시스템 기술 문서
```

### 설명

```text
C++, Linux, firmware, CUDA, PCIe와 CXL의 내부 동작,
성능 및 디버깅 과정을 실제 코드와 시스템 관점에서 정리합니다.
```

### 주요 버튼

```text
Start Here
Explore Topics
```

### 보조 버튼

```text
About Hawk
```

기존의 `Read the blog`는 목적이 너무 일반적이다. 홈 자체가 이미 블로그이기 때문에 어디로 이동하는지 명확하지 않다.

## 수정 후보 위치

```text
src/pages/index.astro
src/components/home/Hero.astro
src/consts/config.ts
```

## 완료 조건

- C++ 외에 시스템·펌웨어·CUDA·PCIe/CXL 범위가 드러남
- 사이트가 누구를 위한 것인지 한 문단 안에 나타남
- 첫 번째 CTA가 최신 글 목록이 아니라 시작 경로로 연결됨
- 모바일 첫 화면에서도 핵심 Topic 일부가 보임

## 기대 효과

- 사이트 정체성 명확화
- AdSense 심사 시 사이트 목적 전달 강화
- 신규 방문자가 전문 분야를 빠르게 이해
- 포트폴리오와 기술 지식베이스 역할 정렬

## 우선순위

```text
P0
```

---

<!-- source message: 43 -->

# A-03. 홈 정보 구조 변경

## 현재 가능 구조

```text
Hero
Latest Posts
```

## 목표 구조

```text
Hero
Start Here
Core Topics
Featured Guides
Recently Updated
Latest Posts
```

다만 처음부터 모든 구역을 구현하면 홈이 다시 무거워질 수 있다.

첫 번째 배포에서는 다음 네 구역으로 제한한다.

```text
Hero
Core Topics
Featured Guides
Latest Posts
```

`Start Here`와 `Recently Updated`는 실제 콘텐츠 큐레이션이 준비된 뒤 추가한다.

## 왜 이 순서인가

### Core Topics

사이트 전체 전문 영역을 설명한다.

### Featured Guides

최신 글과 무관하게 가장 가치 있는 문서를 노출한다.

### Latest Posts

현재 활동성과 최신 콘텐츠를 보여준다.

즉:

```text
정체성
→ 분야
→ 대표 가치
→ 최신 활동
```

순서가 된다.

## 완료 조건

- 최신 글 목록이 홈의 첫 번째 주요 콘텐츠가 아님
- Featured와 Latest가 시각적으로 구분됨
- 핵심 분야가 최신 게시 주제에 따라 바뀌지 않음
- 각 구역의 목적이 중복되지 않음

## 우선순위

```text
P0
```

---

<!-- source message: 43 -->

# A-04. Core Topics 영역 추가

## 목표

홈에서 사이트의 핵심 분야를 최대 6개로 보여준다.

## 권장 Topic

```text
C++
Systems Programming
Firmware & Bootloader
GPU & CUDA
PCIe
CXL
```

다만 초기에 실제 Hub가 준비되지 않았다면 `PCIe`와 `CXL`을 합쳐도 된다.

```text
PCIe & CXL
```

그러면 총 5개가 된다.

## 카드에 포함할 정보

```text
Topic 이름
한 문장 설명
대표 문서 수 또는 핵심 범위
Hub 링크
```

예:

```text
Firmware & Bootloader

UEFI, U-Boot, BSP와 하드웨어 초기화 흐름을
소스코드와 실제 부팅 과정 중심으로 설명합니다.
```

## 피해야 할 내용

- 태그를 5개 이상 나열
- 글 수를 과도하게 강조
- 모든 Topic에 다른 그림과 애니메이션
- 아직 없는 기능을 표현
- 최신 글 3개씩 중첩 표시

Topic 카드는 지도이지 미니 아카이브가 아니다.

## 데이터 모델 권장안

```ts
interface CoreTopic {
  id: string;
  title: string;
  description: string;
  href: string;
  featured?: boolean;
}
```

초기에는 단순 정적 배열이면 충분하다.

```ts
export const CORE_TOPICS = [
  {
    id: "cpp",
    title: "C++",
    description: "Modern C++, memory, performance and systems design.",
    href: "/topics/cpp/",
  },
];
```

CMS나 자동 생성 시스템을 만들 필요는 없다.

## 완료 조건

- Topic이 5~6개 이내
- 각각 명확히 다른 독자 목적을 가짐
- 모든 Topic 링크가 유효한 페이지로 연결됨
- 빈 Hub나 글 목록뿐인 페이지로 연결되지 않음

## 우선순위

```text
P0
```

## 선행 조건

```text
최소 2개의 Topic Hub 초안
나머지는 기존 카테고리 또는 임시 큐레이션 페이지 가능
```

---

<!-- source message: 43 -->

# A-05. Featured Guides 영역 추가

## 문제

현재 구조에서는 오래됐지만 중요한 문서가 최신 글에 밀린다.

## 목표

사이트의 전문성을 대표하는 문서를 홈에 고정적으로 노출한다.

## 첫 Featured 수

```text
4~6개
```

너무 많으면 Latest Posts와 차이가 사라진다.

## 선정 기준

Featured 문서는 다음 중 최소 세 가지를 만족해야 한다.

```text
직접 경험 또는 분석이 들어감
현재도 기술적으로 유효함
다른 글의 기반이 됨
검색 가치가 있음
네 전문성을 잘 보여줌
해당 Topic Hub의 대표 진입점임
```

## 제외 기준

```text
최근에 썼다는 이유만으로 선정
짧은 소식성 글
구판
검증 상태 불명확
다른 대표 글과 검색 의도 중복
```

## 카드 정보

```text
콘텐츠 타입
제목
한 문장 설명
Topic
```

날짜와 태그는 필수 아니다.

Featured는 최신성이 아니라 가치가 핵심이기 때문이다.

## 데이터 모델

초기에는 front matter에 `featured: true`를 모든 글에 넣지 않는 편이 낫다.

왜냐하면:

- Featured는 글의 본질적 속성이 아니라 홈 편집 상태
- 시간이 지나며 바뀜
- 여러 페이지에서 다른 Featured 기준이 생길 수 있음

따라서 별도 큐레이션 파일이 적합하다.

```ts
export const FEATURED_GUIDES = [
  "pcie-bar-sizing",
  "cxl-hdm-decoder",
  "cuda-memory-transfer",
];
```

또는:

```yaml
featured:
  - id: pcie-bar-sizing
    reason: canonical-guide
  - id: cxl-hdm-decoder
    reason: signature-content
```

## 완료 조건

- Featured가 4~6개로 제한됨
- 각 문서의 상태가 `current`
- description이 제목 반복이 아님
- 최소 3개 이상의 핵심 Topic을 대표
- 클릭 시 단편 글보다 대표 Guide 또는 강한 Concept로 연결

## 우선순위

```text
P0
```

---

<!-- source message: 43 -->

# A-06. Latest Posts 역할 축소

## 목표

Latest Posts를 제거하지 않고 역할을 명확히 제한한다.

Latest는 다음 질문에만 답해야 한다.

> 최근에 무엇이 새로 올라왔는가?

사이트의 핵심 문서나 학습 순서를 Latest가 책임지면 안 된다.

## 개선안

```text
최신 글 6개
더 보기 링크
```

정도로 제한한다.

기존에 10개 이상 표시한다면 홈의 대부분을 다시 시간순 피드가 차지할 수 있다.

## 카드 정보

```text
제목
짧은 설명 또는 Topic
게시일
```

Featured와 다르게 날짜를 강조해도 된다.

## 추가 고려

같은 주제의 글이 연속 발행되면 홈이 한 분야로 도배될 수 있다.

예:

```text
CXL
CXL
CXL
CXL
CXL
```

이 경우 선택지는 두 가지다.

### 그대로 노출

실제 최근 활동을 정확히 보여준다.

### Topic 다양성 제한

한 Topic에서 최대 2~3개만 노출한다.

초기에는 알고리즘을 만들지 말고 그대로 노출하는 편이 낫다. 다만 연속 시리즈는 하나의 시리즈 카드로 묶는 방식을 나중에 검토할 수 있다.

## 완료 조건

- Latest가 Featured보다 아래에 위치
- 표시 글 수가 제한됨
- 최신 글 전체 보기는 별도 아카이브로 연결
- Latest 카드가 Featured 카드와 시각적으로 구분됨

## 우선순위

```text
P1
```

---

<!-- source message: 43 -->

# A-07. 홈의 사이트 신뢰 신호 추가

## 문제

전문 콘텐츠가 있어도 홈에서 작성자의 경험과 작성 원칙이 잘 보이지 않으면 일반적인 자동 생성 블로그처럼 보일 수 있다.

## 목표

과도한 자기소개 없이 신뢰 근거를 짧게 제공한다.

## 권장 구성

Featured 아래 또는 푸터 이전에 작은 섹션을 둔다.

```text
About this knowledge base

실제 시스템 개발·디버깅 경험과 공식 사양,
소스코드 및 실험 결과를 바탕으로 문서를 작성합니다.
버전 영향을 받는 글에는 테스트 환경과 검증 시점을 표시합니다.
```

그리고 두 링크만 제공한다.

```text
About the author
Editorial principles
```

## 피해야 할 것

- 경력 전체를 홈에 나열
- 과장된 권위 표현
- 회사명과 프로젝트를 과도하게 공개
- E-E-A-T를 의식한 부자연스러운 문구
- “전문가가 작성했습니다” 같은 자기 선언

신뢰는 선언보다 구체적인 작성 원칙으로 보여주는 것이 낫다.

## 완료 조건

- 작성자와 사이트 운영 주체가 드러남
- 문서 검증 방식이 한두 문장으로 설명됨
- About·작성 원칙 페이지로 이동 가능
- 홈 분량을 과도하게 늘리지 않음

## 우선순위

```text
P1
```

---

<!-- source message: 43 -->

# A-08. 홈 SEO metadata 정비

## 목표

홈의 title과 description이 실제 주제를 반영하게 한다.

## 권장 title 예시

```text
Hawk Systems Notes — C++, Firmware, CUDA, PCIe and CXL
```

또는:

```text
Hawk Systems Knowledge Base
```

사이트 이름 자체를 짧게 유지하고 description에서 범위를 설명해도 된다.

## 권장 description 예시

```text
C++, Linux 시스템 프로그래밍, 펌웨어, CUDA,
PCIe와 CXL의 내부 동작과 디버깅을 다루는 기술 지식베이스입니다.
```

## 문제 가능성

모든 키워드를 title에 넣으면 제목이 길어진다.

따라서 추천은:

```text
Title:
Hawk Systems Knowledge Base

Description:
C++, Linux, firmware, CUDA, PCIe와 CXL의 내부 동작,
성능 및 디버깅을 다루는 기술 문서 모음.
```

이다.

## 완료 조건

- 홈 title이 일반적인 개인 블로그 문구가 아님
- description이 실제 핵심 Topic과 일치
- 제목과 설명이 같은 말을 반복하지 않음
- OG title과 description도 동일한 정체성을 유지
- canonical이 production 홈을 가리킴

## 우선순위

```text
P0
```

---

<!-- source message: 43 -->

# A-09. 홈 컴포넌트 경계 단순화

## 위험

홈을 개편하면서 다음처럼 컴포넌트가 급증할 수 있다.

```text
TopicCard
FeaturedGuideCard
LatestPostCard
StartHereCard
UpdatedPostCard
```

그리고 내부적으로 비슷한 metadata 표시가 반복된다.

## 권장 구조

```text
HomeHero
CoreTopics
FeaturedGuides
LatestPosts
```

표현 primitive는 공유한다.

```text
ContentTitle
ContentDescription
TopicLabel
DocumentType
```

그러나 하나의 거대한 `PostCard`에 variant prop 15개를 넣는 것도 피한다.

## 권장 카드 수

```text
FeaturedGuideCard
ArticleRow 또는 LatestArticleCard
TopicEntry
```

세 종류면 충분하다.

## 완료 조건

- 카드 컴포넌트 변형이 3개 이하
- metadata formatting이 공통화됨
- 날짜·Topic·상태 표시 규칙이 중복되지 않음
- 홈 전용 기능이 범용 테마 설정으로 과도하게 노출되지 않음

## 우선순위

```text
P1
```

---

<!-- source message: 43 -->

# A-10. 홈 개편의 완료 기준

단순히 “예뻐졌다”가 완료 기준이면 안 된다.

## 구조 완료 조건

```text
Hero
Core Topics
Featured Guides
Latest Posts
```

네 구역이 명확히 구분된다.

## 콘텐츠 완료 조건

```text
Core Topic 5개
Featured Guide 4~6개
Latest Post 6개 이하
```

가 실제 콘텐츠로 채워진다.

## UX 완료 조건

- 모바일 첫 화면에서 사이트 주제 또는 첫 Topic 일부가 보임
- Topic 링크가 모두 키보드로 접근 가능
- Featured와 Latest를 시각적으로 구분 가능
- 카드 전체가 올바른 `<a>` 링크로 작동
- hover 없이도 의미가 전달됨

## 성능 완료 조건

- 홈 초기 JavaScript가 기존보다 크게 증가하지 않음
- 모든 콘텐츠가 build-time HTML로 생성됨
- Topic과 Featured를 위해 별도 클라이언트 hydration을 추가하지 않음
- 이미지 추가 시 width·height가 존재
- 새 대형 폰트나 아이콘 라이브러리를 추가하지 않음

## SEO 완료 조건

- H1 하나
- 명확한 title·description
- 핵심 Topic이 실제 텍스트로 표시됨
- Featured Guide가 crawlable link
- 구조화 데이터가 있다면 화면 내용과 일치

---

# Epic A 우선순위 요약

| ID | 작업 | 우선순위 | 난도 | 예상 효과 |
|---|---|---:|---:|---:|
| A-01 | 저장소 목적 선언 | P0 | 낮음 | 중간 |
| A-02 | Hero 문구 재정의 | P0 | 낮음 | 높음 |
| A-03 | 홈 정보 구조 변경 | P0 | 중간 | 매우 높음 |
| A-04 | Core Topics 추가 | P0 | 중간 | 매우 높음 |
| A-05 | Featured Guides 추가 | P0 | 중간 | 매우 높음 |
| A-06 | Latest 역할 축소 | P1 | 낮음 | 중간 |
| A-07 | 신뢰 신호 추가 | P1 | 낮음 | 중간 |
| A-08 | 홈 SEO metadata 정비 | P0 | 낮음 | 높음 |
| A-09 | 컴포넌트 경계 단순화 | P1 | 중간 | 중간 |
| A-10 | 완료 조건·회귀 검사 | P0 | 낮음 | 높음 |

---

# 첫 번째 실제 실행 묶음

가장 작게 시작하면 다음 다섯 개면 된다.

```text
1. Hero 문구 교체
2. Core Topics 5개 추가
3. Featured Guides 4개 선정
4. Latest Posts를 하단으로 이동
5. 홈 title·description 수정
```

이 묶음만 완료해도 사이트는:

```text
최신 글 블로그
```

에서:

```text
전문 시스템 지식베이스
```

로 인식되는 방향으로 크게 이동한다.

다음은 **Task 3-2. Topic Hub와 대표 문서 백로그**다. `PCIe & CXL`, `Firmware & Bootloader` 두 Hub를 실제로 어떤 구성과 metadata로 만들고, 기존 글을 어떻게 배치할지 작업 단위로 정리하게 된다.

<!-- source message: 45 -->

## C-01. 콘텐츠 상태 모델 확정

모든 글을 무조건 `current`와 `old`로만 나누면 부족하다.

추천 상태는 다섯 개다.

```text
current
needs-review
historical
superseded
archived
```

## 상태 정의

### `current`

현재도 유효하며 대표 문서나 일반 탐색에서 적극적으로 노출해도 되는 글.

### `needs-review`

내용 일부가 낡았을 가능성이 있거나 환경·출처·결론을 다시 확인해야 하는 글.

### `historical`

특정 과거 버전이나 당시 환경을 설명하는 데 가치가 있는 글.

예:

```text
Linux 5.x 기준 동작
CUDA 11.8 기준 실험
XRT 2.13.466 환경의 U250 문제
```

### `superseded`

더 나은 신판이나 통합 문서가 존재하는 글.

### `archived`

사이트 구조상 적극적으로 노출하지 않지만 기록 보존 목적은 있는 글.

---

## 피해야 할 상태

```text
active
legacy
deprecated
old
obsolete
outdated
```

이런 표현은 기준이 모호하거나 서로 겹치기 쉽다.

## 완료 조건

- 상태 종류가 5개 이하
- 각 상태의 노출·검색·추천 규칙이 정의됨
- 상태 변경 기준이 문서화됨
- `updated`와 `lastVerified`가 상태와 분리됨

## 우선순위

```text
P0
```

---

<!-- source message: 45 -->

# C-02. 상태별 노출 정책 정의

상태만 저장하고 UI·검색·Sitemap에서 똑같이 처리하면 의미가 없다.

## 권장 정책

| 상태 | 일반 검색 | Topic Hub | Featured | Sitemap | 광고 |
|---|---|---|---|---|---|
| current | 정상 | 가능 | 가능 | 포함 | 가능 |
| needs-review | 정상 또는 감점 | 제한적 | 불가 | 포함 | 조건부 |
| historical | 상태 표시 | 별도 영역 | 불가 | 포함 가능 | 제한 |
| superseded | 신판 우선 | 제외 | 불가 | 상황별 | 비활성 권장 |
| archived | 기본 제외 | 제외 | 불가 | 대체로 제외 | 비활성 |

## 핵심 불변조건

```text
superseded → featured 불가
archived → home 노출 불가
needs-review → 대표 Guide 불가
draft → sitemap 불가
```

## 완료 조건

- 검색 ranking에 상태가 반영됨
- Hub와 Featured가 같은 상태 정책을 사용함
- 상태 규칙이 여러 컴포넌트에 중복 구현되지 않음

## 우선순위

```text
P0
```

---

<!-- source message: 45 -->

# C-03. 최소 metadata schema 도입

처음부터 모든 글에 거대한 front matter를 요구하면 실패한다.

대표 문서 20개부터 다음 필드만 우선 적용한다.

```yaml
type: guide
topic: pcie-cxl
status: current
updated: 2026-08-01
```

검증이 실제로 수행됐다면:

```yaml
lastVerified: 2026-08-01
```

필요한 글에는:

```yaml
testedWith:
  os: Ubuntu 24.04
  kernel: 6.8
  hardware: AMD Alveo U250
  sdk: XRT 2.13.466
```

## 필수와 선택

### 대표 글 필수

```text
type
topic
status
updated
```

### 실험·디버깅 글 권장

```text
lastVerified
testedWith
```

### 모든 글에 강제하지 않을 것

```text
difficulty
audience
readingTime
keywords
prerequisites
related
```

이런 값은 후속 단계에서 실제 필요가 확인되면 추가한다.

---

<!-- source message: 45 -->

# C-04. `updated`와 `lastVerified` 분리

이 둘은 반드시 다르게 취급해야 한다.

## `updated`

문서 내용이 수정된 날짜.

다음도 포함될 수 있다.

- 문장 정리
- 링크 수정
- 오탈자 수정
- 구조 개편
- 예제 추가

## `lastVerified`

기술적 주장이나 절차를 실제 환경에서 다시 확인한 날짜.

다음이 필요하다.

- 명령 재실행
- 코드 또는 사양 재확인
- 결과 재측정
- 대상 버전 확인

## 안티패턴

```text
문장 하나 수정
→ updated 변경
→ lastVerified도 자동 변경
```

## 권장 운영

`lastVerified`는 자동으로 바꾸지 않는다.

명시적인 검증 작업에서만 변경한다.

## 완료 조건

- 두 날짜가 UI에서 다른 의미로 표시됨
- 일반 수정으로 검증일이 갱신되지 않음
- 검증되지 않은 글이 최신처럼 보이지 않음

---

<!-- source message: 45 -->

# C-05. 콘텐츠 타입 확정

초기 타입은 여섯 개면 충분하다.

```text
guide
concept
debug-note
experiment
source-walkthrough
reference
```

## 타입별 목적

### Guide

주제 전체 흐름과 학습 경로 제공.

### Concept

하나의 개념이나 메커니즘을 깊게 설명.

### Debug Note

실제 증상·가설·증거·원인·해결 기록.

### Experiment

가설·방법·결과·해석·한계 중심.

### Source Walkthrough

특정 저장소·파일·함수의 실행 흐름 분석.

### Reference

빠르게 다시 찾기 위한 표·명령·레지스터·API 정리.

## 피해야 할 타입

```text
article
post
tutorial
note
```

너무 포괄적이거나 다른 타입과 겹친다.

## 완료 조건

- 대표 글 20개가 모두 한 타입으로 분류됨
- 같은 검색 의도의 글이 타입만 다르게 위장되지 않음
- 타입별 상단 UI와 리뷰 기준이 다름

---

<!-- source message: 45 -->

# C-06. 타입별 최소 품질 기준

모든 타입에 같은 템플릿을 강제하지 않는다.

## Guide

```text
대상과 범위
전체 구조
학습 순서
대표 하위 문서
결론 또는 다음 단계
```

## Concept

```text
핵심 질문
정확한 모델
동작 과정
오해하기 쉬운 부분
적용 범위
```

## Debug Note

```text
증상
정상 기대값
가설
수집한 증거
제외한 원인
확정 원인
해결
재발 방지
```

## Experiment

```text
질문
가설
환경
방법
baseline
결과
해석
한계
```

## Source Walkthrough

```text
대상 버전
진입점
호출 흐름
핵심 자료구조
중요 분기
최종 결과
```

## Reference

```text
범위
정확한 표기
빠른 조회 구조
출처
버전
```

---

<!-- source message: 45 -->

# C-07. 대표 문서 20개 감사표 생성

대표 글마다 다음을 한 행으로 관리한다.

| 문서 ID | Topic | Type | Status | 환경 필요 | 중복 후보 | 보완 수준 |
|---|---|---|---|---|---|---|
| pcie-bar-sizing | PCIe & CXL | Concept | Current | 예 | 있음 | 중간 |
| linux-pci-enumeration | PCIe & CXL | Source Walkthrough | Needs Review | 예 | 없음 | 높음 |
| uboot-driver-model | Firmware | Guide | Current | 부분 | 있음 | 낮음 |

## 보완 수준

```text
낮음
중간
높음
통합 검토
```

## 목적

- 모든 글을 동시에 수정하지 않음
- 어떤 글이 바로 Featured 가능한지 판단
- 중복과 검증 부채를 동시에 확인
- 작업량 예측

## 우선순위

```text
P0
```

---

<!-- source message: 45 -->

# C-08. 대표 문서의 상단 신뢰 블록

상단에 metadata를 모두 펼치면 본문 진입이 늦어진다.

권장 구조는 한 줄 또는 작은 패널이다.

```text
Concept · PCIe & CXL · Current
Updated 2026-08-01 · Verified 2026-07-20
```

환경이 중요한 문서는 별도 접이식 또는 짧은 행으로 둔다.

```text
Tested with: Linux 6.8 · GCC 13 · Alveo U250 · XRT 2.13.466
```

## 표시 우선순위

```text
상태
타입
Topic
업데이트
검증일
환경
```

단, 모든 값을 같은 시각적 무게로 강조하지 않는다.

## 피해야 할 것

- 배지 6개 이상
- 강한 경고색 남용
- 환경 전체를 거대한 표로 표시
- `current`를 과도하게 홍보
- 수정일과 검증일을 하나로 합침

---

<!-- source message: 45 -->

# C-09. 상태 배너 설계

`current` 글에는 별도 배너가 필요 없다.

경고가 필요한 상태만 표시한다.

## `needs-review`

```text
이 문서는 일부 환경이나 버전 정보를 다시 확인할 필요가 있습니다.
중요한 적용 전 원문 자료와 현재 버전을 함께 확인하세요.
```

## `historical`

```text
이 문서는 당시 환경을 기록한 자료입니다.
현재 버전에서는 동작이나 설정이 달라질 수 있습니다.
```

## `superseded`

```text
이 문서는 새 문서로 대체되었습니다.
현재 가이드: [신규 문서 제목]
```

## `archived`

```text
보존용 문서입니다. 일반 학습 경로에서는 사용하지 않습니다.
```

## 완료 조건

- 상태별 메시지가 한 문장으로 명확함
- 대체 문서가 있으면 직접 링크
- 배너가 본문보다 더 강하지 않음
- 검색 결과에도 상태가 최소한 표시됨

---

<!-- source message: 45 -->

# C-10. 근거·관찰·추론 구분

대표 기술 글에서 가장 중요한 개선 중 하나다.

## 구분 모델

```text
Specification
Source Code
Observation
Interpretation
Hypothesis
Conclusion
```

모든 글에 이 제목을 강제할 필요는 없다.

다만 문장 수준에서 구분이 보여야 한다.

## 예시

### 나쁜 표현

```text
DDR 컨트롤러가 초기화되지 않아 BAR 접근이 실패했다.
```

### 개선된 표현

```text
관찰 결과 BAR 영역을 mmap한 뒤에도 유효한 데이터가 반환되지 않았다.

보드 문서와 초기화 순서를 고려하면 DDR 컨트롤러가 아직 활성화되지 않았을
가능성이 있다. 다만 해당 상태 레지스터를 직접 확인하지 못했으므로
현재 단계에서는 가설로 남긴다.
```

## 권장 callout

```text
확인된 사실
관찰
가설
주의
```

네 가지 정도면 충분하다.

`specification`, `source`는 일반 인용으로 처리해도 된다.

---

<!-- source message: 45 -->

# C-11. 가설을 사실로 바꾸는 자동 문체 수정 금지

문장 정리나 AI 교정 과정에서 다음 변화가 자주 발생한다.

```text
가능성이 있다
→ 원인이다

확인하지 못했다
→ 확인됐다

이 환경에서는
→ 일반적으로
```

이를 막아야 한다.

## 리뷰 규칙

다음 표현이 변경되면 검토 대상으로 잡는다.

```text
가능성
추정
관찰
미확인
환경에 따라
현재 버전에서
```

## 자동화 가능 범위

- 위험 문구 후보 표시
- diff에서 불확실성 표현 삭제 감지
- 단정형 문장 후보 제시

최종 판단은 사람이 한다.

---

<!-- source message: 45 -->

# C-12. 테스트 환경 템플릿

환경을 자유 서술만 하면 글마다 형식이 달라진다.

하지만 모든 필드를 고정하면 과도하다.

## 공통 후보 필드

```yaml
testedWith:
  os:
  kernel:
  compiler:
  hardware:
  sdk:
  toolchain:
```

값이 없는 필드는 생략한다.

## 분야별 예시

### CUDA

```yaml
testedWith:
  os: Windows 11
  gpu: GTX 1070
  driver: 522.06
  cuda: 11.8
  compiler: MSVC 2019
```

### FPGA/XRT

```yaml
testedWith:
  os: CentOS 7.9
  kernel: 3.10.0-1160
  hardware: AMD Alveo U250
  xrt: 2.13.466
  vivado: 2021.2
```

### Linux source analysis

```yaml
testedWith:
  kernelSource: Linux 6.12
  architecture: x86_64
```

## 주의

환경 metadata는 상세 실험 기록을 대체하지 않는다.

복잡한 설정은 본문에 설명한다.

---

<!-- source message: 45 -->

# C-13. 소스코드 분석 글에 commit 기준 추가

`main`이나 최신 branch를 기준으로 분석하면 시간이 지나며 글이 틀어질 수 있다.

## 최소 표기

```text
Repository
Tag 또는 commit
File
Symbol
```

예:

```text
Linux kernel v6.12
drivers/pci/probe.c
pci_scan_child_bus()
```

가능하면 permalink를 사용한다.

## 완료 조건

- 대표 Source Walkthrough의 대상 버전이 명시됨
- 파일 경로와 symbol이 확인 가능
- 줄 번호보다 symbol 중심으로 설명
- 최신 코드와 달라질 가능성을 표시

---

<!-- source message: 45 -->

# C-14. 사양 기반 글에 revision 추가

다음 표현은 불충분하다.

```text
PCIe Specification에 따르면
CXL Specification에서는
UEFI 표준에 따르면
```

## 권장 표기

```text
PCI Express Base Specification Revision 5.0
CXL 3.0 Specification
UEFI Specification 2.10
```

정확한 section이 핵심 근거라면 함께 기록한다.

## 주의

사양서의 긴 문장을 그대로 복사하기보다 다음을 설명한다.

```text
해당 요구사항이 실제 구현에 어떤 의미인지
로그나 레지스터에서 어떻게 확인하는지
어떤 예외가 있는지
```

---

<!-- source message: 45 -->

# C-15. 디버깅 글의 실패 과정 복원

기존 Debug Note가 해결책만 남아 있다면 고유 가치가 약하다.

대표 디버깅 글에는 다음을 복원한다.

```text
처음 관찰한 증상
정상이라면 보여야 할 값
처음 세운 가설
실패한 접근
결정적인 로그 또는 측정
최종 원인
해결 후 검증
```

## 예시

```text
가설 1: BAR 매핑 주소가 잘못됐다
→ lspci와 resource 파일을 비교해 제외

가설 2: IOMMU가 주소를 변환했다
→ passthrough 설정과 dmesg를 확인해 가능성 낮음

가설 3: 장치 내부 DDR이 초기화되지 않았다
→ 초기화 순서를 변경한 뒤 유효 데이터 확인
```

이런 과정이 공식 문서 요약과 다른 실전 가치다.

---

<!-- source message: 45 -->

# C-16. 실험 글의 baseline과 반복 보완

성능 결과를 단일 숫자로 제시하지 않는다.

## 최소 항목

```text
Baseline
변경점
입력 크기
warm-up
반복 횟수
대표값
변동 범위
환경
```

## 결과 표 예시

| 조건 | Median | Min | Max | 반복 |
|---|---:|---:|---:|---:|
| Pageable | 12.8 ms | 12.4 | 13.5 | 50 |
| Pinned | 7.1 ms | 6.9 | 7.5 | 50 |

## 결론 예시

```text
이 환경과 전송 크기에서는 pinned memory가 약 44% 빠르다.
다만 작은 전송에서는 할당 비용 때문에 같은 이점이 나타나지 않을 수 있다.
```

---

<!-- source message: 45 -->

# C-17. 대표 글의 범위와 한계 추가

모든 대표 글에 장문의 `Limitations` 섹션이 필요하지는 않다.

다만 최소한 다음은 명확해야 한다.

```text
어떤 버전인가
어떤 환경인가
무엇을 확인하지 않았는가
어디까지 일반화할 수 있는가
```

## 짧은 형태

```text
범위: Linux 6.12의 x86 PCI 초기화 흐름을 기준으로 한다.
ARM host와 firmware-first 구성은 별도로 확인하지 않았다.
```

---

<!-- source message: 45 -->

# C-18. 대표 글 결론 재작성

좋은 결론은 본문 소제목을 반복하지 않는다.

다음 세 질문에 답한다.

```text
무엇이 핵심인가
실무에서는 무엇부터 확인해야 하는가
어떤 조건에서는 결론이 달라지는가
```

## 예시

```text
BAR 문제를 볼 때는 드라이버 코드보다 먼저 장치가 보고한 BAR 크기,
firmware의 주소 할당, 운영체제 resource 등록을 순서대로 확인해야 한다.

장치가 정상적으로 열거됐더라도 내부 메모리 컨트롤러 초기화가 끝나지 않았다면
BAR 접근 결과는 여전히 유효하지 않을 수 있다.
```

---

<!-- source message: 45 -->

# C-19. 대표 글의 하단 관계 추가

대표 글 20개에만 우선 적용한다.

```yaml
prerequisites:
  - pcie-configuration-space
next:
  - pcie-msix
related:
  - linux-pci-enumeration
```

## 노출 우선순위

```text
상위 Topic
필수 선행 1~2개
다음 단계 1개
실전 사례 1개
```

너무 많은 링크를 넣지 않는다.

## 완료 조건

- 대표 글에 dead end가 없음
- 같은 글이 여러 슬롯에 반복되지 않음
- `superseded` 글이 추천되지 않음
- 링크 이유가 UI에 표시됨

---

<!-- source message: 45 -->

# C-20. 대표 글 보완 순서

20개를 동시에 작업하지 않는다.

## 1차: 바로 Featured 가능한 글 5개

```text
상태가 current
내용이 비교적 완성됨
중복이 적음
보완량이 낮음
```

작업:

- metadata
- 제목·description
- 신뢰 블록
- Topic 연결
- 다음 글

## 2차: 강하지만 검증이 필요한 글 5개

작업:

- 버전·환경 재확인
- 출처 정리
- 결론 강도 조정
- 상태 current 전환

## 3차: 중복·구판과 엮인 글 5개

작업:

- 통합 여부 판단
- canonical role 결정
- redirect 또는 superseded 처리

## 4차: 실험·디버깅 대표 글 5개

작업:

- raw evidence
- 실패 가설
- baseline
- 한계 보강

---

<!-- source message: 45 -->

# C-21. 대표 글 리뷰 체크리스트

## 공통

```text
[ ] 제목이 한 가지 질문을 약속한다
[ ] description이 제목을 반복하지 않는다
[ ] type, topic, status가 지정됐다
[ ] updated와 lastVerified가 구분됐다
[ ] 핵심 주장의 근거가 있다
[ ] 사실과 가설이 구분된다
[ ] 적용 범위와 한계가 있다
[ ] 다음 학습 경로가 있다
```

## Source Walkthrough 추가

```text
[ ] 저장소 버전·commit이 있다
[ ] file과 symbol이 있다
[ ] 호출 흐름이 명확하다
```

## Debug Note 추가

```text
[ ] 증상과 정상 기대값이 있다
[ ] 제외한 가설이 있다
[ ] 해결 후 검증이 있다
```

## Experiment 추가

```text
[ ] baseline이 있다
[ ] 반복 횟수가 있다
[ ] raw result 또는 표가 있다
[ ] 결과 일반화 한계가 있다
```

---

<!-- source message: 45 -->

# C-22. 자동 검사와 사람 검토의 경계

## 자동화할 것

```text
필수 metadata 존재
enum 유효성
날짜 형식
Topic ID 존재
relation 대상 존재
상태 불변조건
대표 글의 description 존재
lastVerified가 미래 날짜인지
```

## 자동화하지 않을 것

```text
기술 결론이 옳은가
가설이 충분히 조심스럽게 표현됐는가
대표 글로 적합한가
중복 글을 합쳐야 하는가
출처가 실제 주장을 충분히 뒷받침하는가
```

---

<!-- source message: 45 -->

# C-23. `needs-review` 큐 운영

상태만 붙이고 방치하면 안 된다.

## 우선순위 계산

```text
대표 글 여부
검색 유입
기술 변화 가능성
오류 위험
상위 Hub 의존도
```

## 처리 상태

```text
queued
reviewing
verified
historical
superseded
```

별도 시스템이 아니라 간단한 Markdown 표나 GitHub Issue로 충분하다.

## 완료 조건

- `needs-review` 문서에 다음 행동이 있음
- 대표 문서는 기한 없이 방치하지 않음
- 검토 후 반드시 다른 상태로 전환됨

---

<!-- source message: 45 -->

# C-24. 구판 문서 처리

구판을 무조건 삭제하지 않는다.

## Historical로 둘 조건

- 과거 버전 유지 사용자에게 유용
- 기술 변화 기록 가치가 있음
- 다른 자료에서 참조함
- 당시 장애 해결 과정이 고유함

## Superseded로 둘 조건

- 같은 검색 의도의 신판이 있음
- 기존 글보다 명확하고 완전한 문서가 있음
- 두 글을 동시에 유지하면 혼동됨

## Redirect를 고려할 조건

- 기존 글의 고유 가치가 거의 없음
- 신판이 내용을 완전히 포함
- 외부 링크가 새 글로 가도 문맥이 자연스러움

---

<!-- source message: 45 -->

# C-25. 대표 글 보완과 AdSense 연결

AdSense 승인을 위한 형식적 작업으로 접근하면 안 된다.

대표 글 보완이 실질적으로 강화하는 것은 다음이다.

```text
작성자 경험
검증 가능한 환경
독창적인 분석
문서의 현재 상태
명확한 근거
관련 지식 구조
```

이는 단순히 글자 수를 늘리는 것보다 훨씬 직접적으로 콘텐츠 가치를 보여준다.

## 피해야 할 작업

```text
모든 글에 장문의 서론 추가
일반적인 장점·단점 문단 생성
불필요한 FAQ 대량 추가
문장만 AI로 길게 재작성
검증하지 않고 수정일만 갱신
```

---

# Epic C 완료 기준

## 대표 문서

```text
20개 선정 완료
20개 type/topic/status 지정
최소 10개 current
Featured 가능 문서 8개 이상
```

## 신뢰 정보

```text
환경이 필요한 글에 testedWith
실제 검증한 글에 lastVerified
사양 기반 글에 revision
소스 분석 글에 tag 또는 commit
```

## 내용

```text
사실·관찰·가설 구분
범위와 한계
역할 기반 다음 링크
중복·구판 상태 정리
```

## 시스템

```text
상태별 노출 정책
schema validation
relation validation
updated와 lastVerified 분리
```

---

# Epic C 우선순위 요약

| ID | 작업 | 우선순위 | 난도 | 효과 |
|---|---|---:|---:|---:|
| C-01 | 상태 모델 확정 | P0 | 낮음 | 매우 높음 |
| C-02 | 상태별 노출 정책 | P0 | 중간 | 매우 높음 |
| C-03 | 최소 metadata schema | P0 | 중간 | 높음 |
| C-04 | updated/verified 분리 | P0 | 낮음 | 높음 |
| C-05 | 콘텐츠 타입 확정 | P0 | 낮음 | 높음 |
| C-07 | 대표 글 감사표 | P0 | 중간 | 매우 높음 |
| C-08 | 상단 신뢰 블록 | P1 | 중간 | 높음 |
| C-10 | 근거·관찰·추론 구분 | P0 | 높음 | 매우 높음 |
| C-12 | 환경 템플릿 | P1 | 낮음 | 높음 |
| C-13 | 소스 commit 기준 | P1 | 중간 | 높음 |
| C-14 | 사양 revision | P1 | 중간 | 높음 |
| C-15 | 디버깅 과정 복원 | P1 | 높음 | 매우 높음 |
| C-19 | 역할 기반 관계 | P1 | 중간 | 높음 |
| C-23 | Needs Review 큐 | P1 | 낮음 | 중간 |
| C-24 | 구판 처리 | P1 | 중간 | 높음 |

---

# 세 번째 실제 실행 묶음

첫 배포 단위는 이 정도가 적절하다.

```text
1. 상태 5종과 콘텐츠 타입 6종 확정
2. 대표 글 20개 감사표 작성
3. 그중 5개에 최소 metadata 적용
4. 5개 글의 사실·가설·환경·한계 보완
5. 각 글에 상위 Topic과 다음 글 추가
6. 보완 완료 글만 홈 Featured에 등록
```

이 단계가 끝나면 홈과 Topic Hub에 노출되는 콘텐츠가 단순히 “잘 쓴 글”이 아니라 **현재 상태와 근거가 확인된 대표 문서**가 된다.

다음은 **Task 3-4. 검색·내부 링크·콘텐츠 관계 개선 백로그**다. 현재 검색 인덱스를 어떤 필드로 줄이고, 한글·영문 alias와 상태별 ranking을 어떻게 적용하며, 고아 문서와 관련 글을 실제 작업으로 정리할지 다룬다.

<!-- source message: 46 -->

## D-01. 현재 검색 구조 측정

개선 전에 현재 검색 인덱스와 결과 품질을 먼저 측정한다.

## 확인 항목

```text
검색 인덱스 파일 크기
문서 레코드 수
본문 전체 포함 여부
코드·로그 포함 여부
브라우저 초기 로드 여부
검색 소요 시간
```

추가로 대표 검색어 20개를 직접 확인한다.

예:

```text
PCIe BAR
CXL HDM Decoder
CUDA pinned memory
U-Boot driver model
MSI-X interrupt
Linux PCI enumeration
```

## 기록할 결과

| 검색어 | 기대 1순위 | 실제 1순위 | 기대 문서 Top 3 포함 | 문제 |
|---|---|---|---|---|
| PCIe BAR | BAR 대표 Concept | 짧은 과거 글 | 아니오 | 중복·빈도 편향 |
| CXL HDM Decoder | 대표 Guide | 관련 없는 CXL 글 | 예 | 순위 낮음 |

## 완료 조건

- 인덱스 크기와 초기 로드 방식이 확인됨
- 대표 검색어 20개의 baseline이 있음
- 검색 결과 문제를 최소 세 유형으로 분류함

## 우선순위

```text
P0
```

---

<!-- source message: 46 -->

# D-02. 검색 문서 모델 재설계

전체 렌더링 본문이나 HTML을 그대로 인덱싱하지 않는다.

## 권장 검색 레코드

```ts
interface SearchDocument {
  id: string;
  url: string;
  title: string;
  description: string;
  headings: string[];
  topic: string;
  type: string;
  status: string;
  aliases: string[];
  keywords: string[];
  excerpt?: string;
  updated?: string;
}
```

## 기본적으로 제외할 것

```text
전체 코드 블록
전체 로그
내비게이션 문구
댓글
광고
푸터
반복되는 시리즈 안내
```

## 별도 필드로 고려할 것

함수명과 오류 메시지 검색은 기술 블로그에서 가치가 있으므로 완전히 버리지 않는다.

```ts
symbols: string[];
errorMessages: string[];
```

이 값은 본문 전체 대신 빌드 시 선택적으로 추출한다.

## 완료 조건

- 검색 레코드와 렌더링 HTML이 분리됨
- 코드·로그가 일반 검색 점수를 지배하지 않음
- 함수명·오류 문자열은 필요한 범위에서 검색 가능

---

<!-- source message: 46 -->

# D-03. 검색 필드 가중치 정의

단어 출현 횟수만으로 순위를 계산하면 긴 글과 로그 덤프가 유리해진다.

## 권장 우선순위

```text
Title
> Alias·Symbol
> Topic
> Heading
> Description
> Keyword
> Excerpt
> Body summary
```

예시 가중치:

```text
title: 10
aliases: 9
symbols: 9
topic: 7
headings: 6
description: 5
keywords: 4
excerpt: 2
```

정확한 숫자보다 상대 우선순위가 중요하다.

## 상태 가중치

```text
current: 1.0
needs-review: 0.75
historical: 0.55
superseded: 검색 결과 하단 또는 기본 제외
archived: 기본 제외
```

## 타입 가중치

넓은 주제 검색에서는:

```text
Topic Hub
Guide
Concept
```

를 우선한다.

정확한 오류 메시지나 함수명 검색에서는:

```text
Debug Note
Source Walkthrough
Reference
```

가 우선할 수 있다.

즉 타입은 고정된 절대 점수가 아니라 검색 의도에 따라 보조적으로 사용한다.

---

<!-- source message: 46 -->

# D-04. 한글·영문·기호 alias registry

검색 alias는 글마다 무작정 입력하지 않고 중앙 registry를 우선 사용한다.

예:

```yaml
- id: pcie-bar
  canonical: PCIe BAR
  aliases:
    - base address register
    - 베이스 주소 레지스터
    - bar register

- id: msi-x
  canonical: MSI-X
  aliases:
    - msix
    - msi x

- id: cache-coherence
  canonical: cache coherence
  aliases:
    - 캐시 일관성
    - coherence
    - coherency
    - 코히어런시
```

## 규칙 기반 정규화

다음은 개별 alias 등록보다 공통 규칙으로 처리한다.

```text
대소문자
공백과 하이픈
복수 공백
Unicode normalization
```

## 명시적 alias가 필요한 것

```text
C++ ↔ cpp ↔ cxx
MSI-X ↔ MSIX
IOMMU ↔ Input-Output Memory Management Unit
주소 변환 ↔ address translation
```

## 완료 조건

- C++, CXL, MSI-X 같은 기호 용어 검색 가능
- 한글과 영문 검색이 같은 대표 문서로 연결
- alias가 화면 제목을 변경하지 않음
- 잘못된 동의어가 자동 확장되지 않음

---

<!-- source message: 46 -->

# D-05. 기술 식별자 검색 지원

네 사이트에서는 일반 키워드보다 다음 검색이 중요할 수 있다.

```text
cudaMemcpyAsync
pci_scan_child_bus
container_of
xclLoadXclBin
-ENOMEM
LTSSM
```

## 구현 원칙

- inline code와 코드 블록에서 식별자 후보 추출
- 모든 토큰을 저장하지 않고 빈도·길이·형태 필터 적용
- 표준 라이브러리와 핵심 함수명은 허용
- 단일 문자와 일반 예약어는 제외

## 후보 규칙

```text
snake_case
camelCase
PascalCase
namespace::symbol
UPPER_CASE_MACRO
negative error code
```

## 주의

44,000개 코드 블록 전체의 모든 token을 인덱싱하면 다시 인덱스가 비대해진다.

대표 symbol만 추출하거나 front matter에 명시하는 방식을 혼합한다.

```yaml
symbols:
  - pci_scan_child_bus
  - pci_bus_add_devices
```

---

<!-- source message: 46 -->

# D-06. 오류 메시지 검색 지원

Debug Note의 강점은 정확한 오류 문자열 검색이다.

예:

```text
device not found
failed to load xclbin
no space for BAR
unknown code model
```

## 권장 방법

본문에서 명시적으로 표시된 오류 블록만 추출한다.

```md
```text title="Error"
failed to load xclbin
```
```

또는 front matter:

```yaml
errorMessages:
  - failed to load xclbin
```

## 피해야 할 것

모든 로그 줄을 인덱싱하는 것.

## 완료 조건

- 대표 오류 메시지로 해당 Debug Note 검색 가능
- 일반 단어 검색에서 로그 문서가 과도하게 상위 노출되지 않음

---

<!-- source message: 46 -->

# D-07. 대표 검색어 Golden Set 생성

초기에는 20개 정도면 충분하다.

## 분류

### 정확한 개념

```text
PCIe BAR
CXL HDM Decoder
CUDA stream
```

### 한글 표현

```text
캐시 일관성
주소 변환
부트로더 초기화
```

### Identifier

```text
container_of
pci_scan_child_bus
cudaMemcpyAsync
```

### 오류 메시지

```text
failed to load xclbin
BAR mmap failed
```

### 상위 주제

```text
PCIe
Firmware
CUDA
```

## 기대 결과 정의

정확한 점수를 고정하지 않고:

```text
필수 포함 문서
상위 3개 기대 문서
노출되면 안 되는 구판
```

을 지정한다.

예:

```yaml
query: PCIe BAR
mustInclude:
  - pcie-bar-sizing
topThreePreferred:
  - pcie-device-initialization
exclude:
  - old-pcie-bar-note
```

---

<!-- source message: 46 -->

# D-08. 검색 결과 UI 재설계

검색 결과에는 제목만 보여주지 않는다.

## 권장 정보

```text
제목
Content Type
Topic
짧은 description 또는 일치한 heading
상태
수정일
```

예:

```text
PCIe BAR 크기 탐색과 주소 할당
Concept · PCIe & CXL · Current

BAR 레지스터에 all-ones를 기록해 크기를 탐색하는 과정과
32/64-bit MMIO 주소 할당을 설명합니다.
```

## 상태 표시

- `current`: 별도 강한 배지 불필요
- `needs-review`: 작은 경고
- `historical`: 버전 문맥 표시
- `superseded`: 기본 검색에서 제외하거나 신판 아래에 표시

## 피해야 할 것

- 태그 5개 이상
- 긴 본문 snippet
- 일치하지 않은 일반 서론
- 읽기 시간과 모든 metadata 노출

---

<!-- source message: 46 -->

# D-09. 검색 인덱스 지연 로딩

검색 기능을 사용하지 않는 방문자에게 전체 인덱스를 내려주지 않는다.

## 권장 흐름

```text
페이지 로드
→ 검색 버튼 클릭
→ 검색 UI 표시
→ 인덱스 로드
→ query 실행
```

인덱스가 충분히 작으면 한 파일로 시작한다.

초기부터 Topic별 shard를 만들 필요는 없다.

## 분할 기준

다음 조건이 실제로 발생할 때만 분할한다.

```text
압축 후 인덱스가 과도하게 큼
모바일에서 파싱 지연
검색 입력 중 main thread block
```

## 완료 조건

- 검색을 열지 않으면 인덱스 요청이 발생하지 않음
- 첫 검색 이후에는 재사용
- 로딩 실패 시 Topic 탐색 링크 제공

---

<!-- source message: 46 -->

# D-10. 검색 실패 fallback

인덱스 로딩이나 JavaScript가 실패해도 사이트 탐색이 막히면 안 된다.

## fallback

```text
Core Topics
전체 글 목록
주요 시리즈
```

로 이동할 수 있게 한다.

검색 결과 없음 상태에서는:

```text
유사 alias
관련 Topic
철자 보정 후보
대표 Guide
```

를 제공한다.

예:

```text
“MSIX” 검색 결과가 없습니다.

MSI-X를 찾으셨나요?
- PCIe MSI-X 설정 흐름
- PCIe Interrupt 개요
```

---

<!-- source message: 46 -->

# D-11. 고아 문서 정의

모든 내부 링크가 없는 글을 무조건 문제로 보지 않는다.

## 실질적인 고아 문서

다음을 모두 만족하는 글:

```text
공개 상태
일반 검색 대상
상위 Topic 없음
들어오는 의미 링크 없음
시리즈 소속 없음
```

태그 목록이나 아카이브 링크만 있는 경우도 구조상 고아에 가깝다.

## 예외

- 독립 Reference
- Historical 기록
- 의도적인 standalone landing page

예외도 가능하지만 이유를 기록한다.

---

<!-- source message: 46 -->

# D-12. 고아 문서 감사 리포트

리포트 필드:

```text
문서 ID
제목
상태
Topic
inbound 의미 링크 수
outbound 의미 링크 수
시리즈
추천 조치
```

추천 조치:

```text
Topic Hub에 연결
대표 Concept에서 연결
시리즈에 편입
다른 글과 통합
Historical 처리
그대로 유지
```

## 우선순위

먼저 다음 문서를 처리한다.

```text
current
검색 유입 있음
고유 내용 있음
상위 Topic 없음
```

---

<!-- source message: 46 -->

# D-13. 의미 링크와 UI 링크 분리

모든 `<a>`를 지식 관계로 계산하면 헤더·푸터·카드 링크 때문에 그래프가 왜곡된다.

## 의미 링크

```text
본문에서 설명 목적으로 연결
선행 문서
다음 문서
상위 Topic
대체 문서
```

## UI 링크

```text
헤더
푸터
태그 목록
아카이브
페이지네이션
```

콘텐츠 manifest에서는 의미 링크만 별도로 추출한다.

---

<!-- source message: 46 -->

# D-14. 내부 링크 anchor 개선

다음 표현은 피한다.

```text
여기
자세히 보기
관련 글
참고
```

## 개선 예

```text
PCIe BAR 크기 탐색 과정에서 자세히 설명한다.
Linux의 PCI enumeration 호출 흐름을 이어서 확인한다.
```

## 자동 검사 가능 범위

다음 anchor를 후보로 경고한다.

```text
여기
링크
클릭
참고
자세히
```

하지만 문맥에 따라 정상일 수 있으므로 warning만 제공한다.

---

<!-- source message: 46 -->

# D-15. 대표 문서의 역할 기반 관계

대표 문서 20개부터 다음 관계를 수동으로 지정한다.

```yaml
parent: pcie-cxl
prerequisites:
  - pcie-configuration-space
next:
  - pcie-msix
related:
  - linux-pci-enumeration
supersedes:
```

## 노출 규칙

### 글 상단

필요한 경우 선행 지식 1~2개.

### 글 하단

```text
상위 Topic
다음 단계
실전 사례
```

### 검색 결과

대표 Guide와 대체 문서 관계만 순위에 반영.

---

<!-- source message: 46 -->

# D-16. 관련 글 추천 재설계

기존 태그 기반 추천이 있다면 제거부터 하지 말고 우선순위를 바꾼다.

## 추천 신호 순서

```text
명시적 관계
동일 Series
동일 세부 Topic
본문 링크
동일 콘텐츠 타입
공통 Tag
```

## 추천 슬롯

```text
다음에 읽을 글
필요한 선행 개념
같은 문제의 실전 사례
```

각 슬롯 하나씩이면 충분하다.

## fallback

명시적 관계가 없으면:

```text
상위 Topic Hub
```

하나만 보여줘도 된다.

억지 관련 글 6개보다 낫다.

---

<!-- source message: 46 -->

# D-17. 구판과 신판 관계 처리

`superseded` 글은 단순히 검색에서 숨기는 것으로 끝내지 않는다.

## 구판 페이지

```text
대체 문서 안내
왜 대체됐는지
과거 버전에서만 유효한 내용
```

## 신판 페이지

필요하면:

```text
이전 버전 문서
```

를 Historical 자료로 연결한다.

## 검색

정확한 과거 버전 검색에서는 구판을 보여줄 수 있다.

예:

```text
XRT 2.13 U250 interrupt
```

하지만 일반 검색에서는 신판이 우선이다.

---

<!-- source message: 46 -->

# D-18. Topic Cannibalization 리포트

유사 글을 텍스트 유사도만으로 판단하지 않는다.

## 후보 생성 신호

```text
제목 유사도
동일 Topic
동일 주요 heading
공통 alias
비슷한 description
```

## 사람 검토 항목

```text
검색 의도가 같은가
문서 타입이 다른가
고유 실험이 있는가
버전이 다른가
하나가 다른 글을 완전히 포함하는가
```

## 결과

```text
유지
역할 구분
통합
Historical
Superseded
```

---

<!-- source message: 46 -->

# D-19. Topic Hub와 검색 역할 분리

검색은 정확한 질문을 가진 독자를 돕는다.

Topic Hub는 무엇을 읽어야 할지 모르는 독자를 돕는다.

따라서 검색 결과 페이지에서 넓은 검색어에는 Hub를 적절히 노출한다.

예:

```text
PCIe
```

검색 결과:

```text
1. PCIe & CXL Topic Hub
2. PCIe 장치 초기화 전체 Guide
3. PCIe Configuration Space
```

반면 정확한 검색어:

```text
PCIe BAR size probing
```

에서는 Concept 글이 1순위여야 한다.

---

<!-- source message: 46 -->

# D-20. 최근 검색·인기 검색 기능 보류

다음 기능은 초기 개선에 필요하지 않다.

```text
인기 검색어
최근 검색 기록
개인화 추천
자동 완성 서버
벡터 검색
LLM 검색 답변
```

이들은 개인정보·복잡성·운영 비용을 늘린다.

먼저 정적 lexical 검색과 명시적 alias를 제대로 만든다.

---

<!-- source message: 46 -->

# D-21. 검색 분석 최소화

검색 품질 개선을 위해 모든 원문 query를 장기 수집할 필요는 없다.

## 최소 관측

```text
검색 결과 없음 횟수
선택된 결과 순위
검색 후 재검색 여부
```

가능하면 원문 검색어는 로컬 집계 또는 짧은 보존을 고려한다.

특히 오류 로그와 회사 내부 식별자가 검색창에 들어갈 수 있다는 점을 고려한다.

---

<!-- source message: 46 -->

# D-22. 내부 링크 검증

매 변경마다 검사할 것:

```text
없는 문서 ID
깨진 내부 URL
깨진 heading anchor
superseded 문서 추천
draft 문서 링크
redirect를 거치는 내부 링크
```

## 정기 검사

외부 링크는 매 commit마다 전체 검사하지 않는다.

내부 링크는 빠르고 결정적이므로 매번 검사한다.

---

<!-- source message: 46 -->

# D-23. 검색 manifest와 공개 페이지 집합 일치

다음 집합은 공통 publication policy에서 생성해야 한다.

```text
공개 페이지
검색 인덱스
Sitemap
RSS
Topic Hub 자동 목록
```

## 불변조건

```text
draft → 어디에도 없음
archived → 일반 검색 기본 제외
superseded → Sitemap 정책에 따라 제한
공개하지 않은 페이지 → 검색 레코드 없음
```

이 규칙이 각 generator에 따로 구현되면 드리프트가 발생한다.

---

<!-- source message: 46 -->

# D-24. 검색 성능 예산

초기 권장 목표는 절대 수치보다 현재 대비 회귀 방지다.

## 기록할 것

```text
압축 전·후 인덱스 크기
인덱스 fetch 시간
파싱 시간
첫 검색 응답
후속 검색 응답
모바일 메모리
```

## 완료 기준 예시

```text
검색 미사용 시 인덱스 다운로드 없음
첫 검색 입력 후 UI가 장시간 멈추지 않음
대표 query 20개 품질 개선
기존 대비 인덱스 크기 급증 없음
```

---

<!-- source message: 46 -->

# D-25. 검색·관계 테스트

## 매 검색 변경 시

```text
Golden query 20개
한글·영문 alias
기호 포함 용어
identifier
오류 메시지
구판 제외
```

## 관계 변경 시

```text
대상 문서 존재
자기 참조 없음
중복 슬롯 없음
superseded 추천 없음
inverse 관계 일관성
```

## UI 변경 시

```text
모바일 검색
키보드 탐색
Escape 종료
focus 복원
결과 없음
인덱스 로드 실패
```

---

# Epic D 완료 기준

## 검색

```text
정제된 SearchDocument schema
대표 query 20개 baseline과 기대 결과
한글·영문·기호 alias
상태 기반 ranking
지연 로딩
```

## 내부 링크

```text
고아 문서 리포트
대표 글 역할 기반 관계
깨진 anchor 검사
redirect 내부 링크 정리
```

## 중복

```text
유사 글 10개 검토
대표 canonical role 지정
구판 상태 반영
```

## 품질

```text
검색 결과에 type/topic/status 표시
대표 Guide가 넓은 검색어에서 우선
정확한 오류·symbol 검색 가능
```

---

# Epic D 우선순위 요약

| ID | 작업 | 우선순위 | 난도 | 효과 |
|---|---|---:|---:|---:|
| D-01 | 현재 검색 baseline | P0 | 낮음 | 높음 |
| D-02 | 검색 문서 모델 | P0 | 중간 | 매우 높음 |
| D-03 | 필드·상태 가중치 | P0 | 중간 | 높음 |
| D-04 | alias registry | P0 | 중간 | 매우 높음 |
| D-05 | 식별자 검색 | P1 | 중간 | 높음 |
| D-06 | 오류 메시지 검색 | P1 | 중간 | 높음 |
| D-07 | Golden query set | P0 | 낮음 | 매우 높음 |
| D-08 | 검색 결과 UI | P1 | 중간 | 높음 |
| D-09 | 인덱스 지연 로딩 | P1 | 중간 | 중간 |
| D-11 | 고아 문서 정의 | P0 | 낮음 | 높음 |
| D-12 | 고아 문서 리포트 | P1 | 중간 | 높음 |
| D-15 | 역할 기반 관계 | P0 | 중간 | 매우 높음 |
| D-16 | 관련 글 재설계 | P1 | 중간 | 높음 |
| D-18 | Cannibalization 리포트 | P1 | 중간 | 높음 |
| D-23 | 공개 manifest 통합 | P0 | 높음 | 매우 높음 |

---

# 네 번째 실제 실행 묶음

첫 배포에서는 다음만 처리하는 것이 좋다.

```text
1. 대표 검색어 20개 baseline 작성
2. 검색 레코드에서 전체 코드·로그 제거
3. Title·Alias·Topic·Heading 가중치 적용
4. C++, MSI-X, CXL 등 핵심 alias 30개 등록
5. 대표 글 20개에 parent·next·related 관계 추가
6. 고아 문서 상위 20개 리포트 생성
7. 구판 문서가 Featured·추천에 나오지 않게 처리
```

이 단계가 끝나면 검색은 단순 문자열 찾기에서 **대표 지식을 우선하는 탐색 기능**으로 바뀌고, 개별 글도 더 이상 읽고 끝나는 막다른 페이지가 아니게 된다.

<!-- source message: 50 -->

## G-01. 공개 사이트와 관리자 기능 경계 확정

### 문제

블로그 저장소 안에 관리자 편집기, GitHub OAuth, 저장소 쓰기 기능까지 함께 들어가면 정적 사이트의 단순한 신뢰 경계가 무너진다.

### 권장 구조

```text
Public site
- 정적 HTML·CSS·JS
- 공개 콘텐츠 읽기
- 검색
- 댓글·광고는 선택적 외부 기능

Admin tool
- 인증
- 콘텐츠 편집
- GitHub API 쓰기
- 별도 배포 또는 로컬 전용
```

### 우선 선택안

개인 블로그라면 관리자 편집기의 기본 경로는 다음이 가장 안전하다.

```text
로컬 Git 편집
→ commit
→ pull request 또는 main push
→ CI 검증
→ 정적 배포
```

브라우저 기반 관리 기능이 반드시 필요하지 않다면 제거하거나 별도 프로젝트로 분리한다.

### 완료 조건

- 운영 정적 번들에 OAuth secret이 없음
- 공개 사이트가 저장소 쓰기 권한을 요구하지 않음
- `/admin` 주소를 숨기는 방식에 의존하지 않음
- 관리자 기능의 유지 또는 제거 이유가 문서화됨

### 우선순위

```text
P0
```

---

<!-- source message: 50 -->

## G-02. Production 빌드에서 관리자 코드 제거

### 문제

메뉴에서 링크만 숨겨도 route, JavaScript, API 설정이 최종 `dist`에 남을 수 있다.

### 작업

Production artifact에서 다음을 검사한다.

```text
/admin
OAuth client 설정
GitHub write API 호출
편집기 컴포넌트
저장소 선택 UI
token 저장 코드
```

### 구현 원칙

나쁜 방식:

```ts
if (isAdmin) {
  showAdminMenu();
}
```

운영 번들에는 관리자 코드가 그대로 포함된다.

더 나은 방식:

```text
별도 앱
또는
production build에서 route·module 자체 제외
```

### 자동 검사

```bash
grep -R "/admin" dist/
grep -R "client_secret" dist/
grep -R "localStorage.*token" dist/
```

문자열 검색만으로 충분하지 않으므로 route manifest와 JavaScript bundle도 함께 확인한다.

### 완료 조건

- Production route에 관리자 페이지 없음
- 관리자 전용 module이 client bundle에 없음
- 관리자 환경변수가 공개 JavaScript에 포함되지 않음
- 관리자 기능 없이 일반 사이트 build가 가능

### 우선순위

```text
P0
```

---

# GitHub Actions 권한

<!-- source message: 50 -->

## G-03. Workflow별 권한 전수 조사

### 문제

`GITHUB_TOKEN` 기본 권한이나 기존 workflow 설정에 의존하면 실제 필요보다 넓은 권한이 부여될 수 있다.

### 감사표

| Workflow | 목적 | 필요 권한 | 현재 권한 | 수정 |
|---|---|---|---|---|
| validate | schema·link 검사 | contents: read |  |  |
| build | 정적 artifact 생성 | contents: read |  |  |
| deploy | Pages 배포 | pages/id-token write |  |  |
| audit | 외부 링크·dependency | contents: read |  |  |

### 기본 권장

```yaml
permissions:
  contents: read
```

배포 job만 필요한 권한을 명시적으로 추가한다.

### 피해야 할 것

```yaml
permissions: write-all
```

또는 workflow 최상위에 광범위한 write 권한을 주고 모든 job이 공유하는 구조.

### 완료 조건

- 모든 workflow에 `permissions` 명시
- validation·build는 읽기 권한만 사용
- deploy job만 배포 권한 보유
- 사용하지 않는 `issues`, `pull-requests`, `packages` 쓰기 권한 없음

### 우선순위

```text
P0
```

---

<!-- source message: 50 -->

## G-04. Build와 Deploy 권한 분리

### 목표 구조

```text
Unprivileged build job
→ immutable artifact
→ privileged deploy job
```

### Build job

```yaml
permissions:
  contents: read
```

여기에서 수행:

```text
dependency install
content validation
Astro build
검색·RSS·Sitemap 생성
smoke test
```

### Deploy job

필요한 artifact만 다운로드한 뒤 Pages에 올린다.

여기에서는 다음을 하지 않는다.

```text
npm install
postinstall 실행
Markdown generator 실행
외부 PR 코드 실행
```

### 이유

빌드 dependency나 콘텐츠 generator가 침해되어도 배포 write 권한과 직접 결합되지 않게 한다.

### 완료 조건

- 테스트한 artifact와 배포 artifact가 동일
- deploy job가 저장소 코드를 다시 빌드하지 않음
- build job에 write token 없음
- artifact 출처 commit을 추적 가능

### 우선순위

```text
P0
```

---

<!-- source message: 50 -->

## G-05. Action 참조 고정

### 문제

다음과 같은 major tag는 관리에는 편리하지만 변경 가능한 참조다.

```yaml
uses: actions/checkout@v4
```

### 강화안

중요한 배포 workflow는 full commit SHA에 고정한다.

```yaml
uses: actions/checkout@<full-commit-sha> # v4.x
```

### 적용 우선순위

```text
공식 배포 action
artifact upload/download
외부 제3자 action
보안·secret 관련 action
```

### 운영 비용

SHA 고정은 업데이트가 자동으로 따라오지 않으므로 Dependabot이나 정기 점검이 필요하다.

따라서 단순 shell 명령으로 쉽게 대체할 수 있는 소규모 제3자 action은 제거하는 편이 나을 수 있다.

### 완료 조건

- 제3자 action은 모두 full SHA 고정
- 공식 핵심 action도 가능하면 SHA 고정
- SHA 옆에 이해 가능한 버전 주석 존재
- 업데이트 절차가 문서화됨

### 우선순위

```text
P0
```

---

<!-- source message: 50 -->

## G-06. 제3자 Action 최소화

### 감사 질문

각 action에 대해 다음을 확인한다.

```text
무슨 기능을 하는가
공식 action인가
shell 명령으로 대체 가능한가
저장소·token·artifact 중 무엇에 접근하는가
유지보수되고 있는가
```

### 제거 우선 후보

```text
간단한 파일 복사 action
단순 문자열 치환 action
작은 JSON 생성 action
관리되지 않는 link checker action
```

복잡한 action 하나를 설치하는 것보다 저장소 내부의 짧고 검토 가능한 script가 안전할 수 있다.

### 완료 조건

- 모든 제3자 action의 목적이 명확
- 대체 가능한 불필요 action 제거
- 유지보수 중단 action 없음
- action source 변경을 dependency 변경처럼 검토

### 우선순위

```text
P1
```

---

# Secret과 환경변수

<!-- source message: 50 -->

## G-07. Secret Inventory 작성

### 목록 형식

| Secret | 용도 | 사용 Workflow | 권한 | 만료·회전 | 공개 가능 여부 |
|---|---|---|---|---|---|
| Pages token | 자동 제공 | deploy | 최소 | 자동 | 비공개 |
| OAuth secret | 관리자 기능 | 분리 대상 | 저장소 제한 | 회전 | 절대 비공개 |
| Analytics ID | 브라우저 설정 | site | 없음 | 해당 없음 | 공개 식별자 |

### 중요한 구분

브라우저에 포함되는 값은 비밀로 취급할 수 없다.

예:

```text
Google Analytics measurement ID
AdSense publisher ID
Giscus repository mapping
```

이들은 공개 식별자다.

반면 다음은 절대 client bundle에 들어가면 안 된다.

```text
OAuth client secret
Personal Access Token
GitHub App private key
배포용 장기 token
```

### 완료 조건

- 저장소에서 사용하는 모든 secret 목록 존재
- 각 secret의 최소 권한과 사용 step 확인
- 공개 식별자와 secret이 구분됨
- 사용되지 않는 secret 삭제

### 우선순위

```text
P0
```

---

<!-- source message: 50 -->

## G-08. Secret 전달 범위 축소

### 나쁜 방식

```yaml
env:
  TOKEN: ${{ secrets.SOME_TOKEN }}
```

workflow 전체가 접근한다.

### 권장

```yaml
- name: Perform required operation
  env:
    TOKEN: ${{ secrets.SOME_TOKEN }}
  run: ./scripts/required-operation.sh
```

필요한 한 step에만 전달한다.

### 추가 원칙

- secret을 command-line argument에 직접 넣지 않음
- `env`, `printenv`, `set -x` 금지
- secret이 포함된 파일을 artifact로 업로드하지 않음
- build output에 환경변수 덤프를 포함하지 않음

### 완료 조건

- Secret이 job 전체에 설정되지 않음
- 사용하지 않는 step은 secret 접근 불가
- debug logging에서 환경 전체 출력 없음
- artifact 내부 secret scan 통과

### 우선순위

```text
P0
```

---

<!-- source message: 50 -->

## G-09. 노출된 Secret 대응 절차

### 원칙

Git에서 문자열을 삭제하는 것만으로 해결되지 않는다.

노출 시 순서:

```text
1. Secret 폐기
2. 새 credential 발급
3. 권한 축소
4. 사용 위치 교체
5. 로그·artifact·history 범위 조사
6. 필요하면 history 정리
7. 원인과 재발 방지 기록
```

### 피해야 할 것

```text
앞 네 글자만 남기고 마스킹
파일 삭제 후 같은 token 계속 사용
Private repo였다는 이유로 무시
```

### 완료 조건

- Incident runbook에 secret 노출 절차 존재
- credential 회전 위치를 찾을 수 있음
- 실제 token 대신 명백한 placeholder를 문서에 사용

### 우선순위

```text
P1
```

---

# Pull Request 보안

<!-- source message: 50 -->

## G-10. 외부 PR과 배포 흐름 분리

현재 외부 기여를 받지 않더라도 workflow는 안전한 기본 구조로 두는 편이 좋다.

### PR validation

```text
읽기 권한
secret 없음
배포 없음
위험한 generator 제한
```

### Main 배포

```text
보호된 branch
검토된 commit
별도 deploy job
```

### 완료 조건

- Fork PR에서 secret이 전달되지 않음
- PR workflow가 production deploy를 실행하지 않음
- PR이 workflow나 package script를 바꿔도 write token에 접근하지 못함
- 승인되지 않은 artifact가 운영에 배포되지 않음

### 우선순위

```text
P1
```

---

<!-- source message: 50 -->

## G-11. `pull_request_target` 제한

### 위험

`pull_request_target`은 대상 저장소 문맥에서 동작하므로 외부 PR 코드를 checkout하고 실행하면 위험할 수 있다.

### 허용 가능한 역할

```text
label 부여
PR metadata 검사
안전한 댓글 작성
```

### 금지할 역할

```text
PR branch checkout 후 npm install
PR의 build script 실행
외부 콘텐츠 generator 실행
secret을 사용하는 테스트
```

### 완료 조건

- 불필요한 `pull_request_target` 없음
- 사용한다면 PR 코드를 실행하지 않음
- 목적과 권한이 주석으로 설명됨

### 우선순위

```text
P1
```

---

# Dependency 공급망

<!-- source message: 50 -->

## G-12. Dependency 역할 분류

모든 dependency를 다음으로 분류한다.

```text
runtime
build
content-tool
development
optional integration
```

### 감사표

| Package | 역할 | Browser 전달 | Install Script | 유지 상태 | 대체 가능 |
|---|---|---:|---:|---|---|
| Astro | build | 일부 | 확인 | 활발 | 낮음 |
| Shiki | build | 아니오 | 확인 | 활발 | 중간 |
| 특정 plugin | content-tool | 아니오 | 확인 | 불명 | 높음 |

### 완료 조건

- 용도를 모르는 dependency 없음
- 제거된 기능의 잔존 package 없음
- 동일 목적의 library 중복 확인
- browser runtime dependency와 build dependency를 구분

### 우선순위

```text
P0
```

---

<!-- source message: 50 -->

## G-13. Install Script 감사

### 확인 대상

```text
preinstall
install
postinstall
prepare
```

설치 시 임의 코드가 실행될 수 있으므로 새 package 도입 시 lifecycle script를 확인한다.

### 작업

```bash
npm query ':attr(scripts, [postinstall])'
```

실제 package manager에 맞는 명령이나 lockfile 분석 도구를 사용한다.

### 정책

- 꼭 필요한 native build는 허용
- 이유를 모르는 postinstall은 검토
- 단순 도구인데 외부 binary 다운로드 시 경계 강화
- CI에서 불필요한 script를 비활성화할 수 있는지 검토

### 완료 조건

- Install script를 가진 direct dependency 목록 확보
- 외부 binary 다운로드 package 파악
- 불필요하거나 관리되지 않는 package 제거

### 우선순위

```text
P1
```

---

<!-- source message: 50 -->

## G-14. Lockfile 변경 분리

Dependency 변경과 대량 콘텐츠 수정이 같은 PR에 섞이면 공급망 diff가 묻힌다.

### 원칙

```text
dependency update
platform migration
content bulk edit
```

을 가능한 한 별도 commit이나 PR로 나눈다.

### 완료 조건

- Lockfile 대량 변경이 콘텐츠 수정에 섞이지 않음
- 새 transitive dependency 수를 확인할 수 있음
- major update는 별도 검증 기록 존재

### 우선순위

```text
P1
```

---

<!-- source message: 50 -->

## G-15. 취약점 알림 우선순위화

`npm audit` 숫자 0을 목표로 삼지 않는다.

### 분류

```text
브라우저에서 실행되는가
빌드 시 임의 코드를 실행하는가
개발 환경에만 있는가
실제 취약 경로가 도달 가능한가
업데이트로 회귀 위험이 큰가
```

### 결과 상태

```text
update
remove
mitigate
accept temporarily
not applicable
```

### 완료 조건

- Critical·High 경고의 실제 노출 경로 평가
- 단순 숫자 숨기기를 위해 무리한 major update를 하지 않음
- 수용한 위험에는 이유와 재검토 조건 존재

### 우선순위

```text
P1
```

---

# 외부 스크립트와 개인정보

<!-- source message: 50 -->

## G-16. 외부 Integration Inventory

### 목록

| Service | 목적 | 로드 페이지 | 전송 데이터 | 쿠키·저장소 | 제거 시 영향 |
|---|---|---|---|---|---|
| AdSense | 광고 | 조건부 article | 광고 관련 | 가능 | 광고만 제거 |
| Analytics | 통계 | 선별 | page event | 설정에 따라 | 통계만 제거 |
| Giscus | 댓글 | article 하단 | GitHub interaction | 외부 | 댓글만 제거 |
| 외부 폰트 | 표현 | 전체 | IP/request | 캐시 | fallback |

### 완료 조건

- 외부 요청 도메인 목록 확보
- 각 서비스의 목적과 데이터 흐름 확인
- 사용하지 않는 외부 script 제거
- Privacy Policy와 실제 integration이 일치

### 우선순위

```text
P0
```

---

<!-- source message: 50 -->

## G-17. 핵심 콘텐츠와 외부 Script 분리

### 원칙

외부 script가 실패하더라도 다음은 정상이어야 한다.

```text
본문
내비게이션
Topic Hub
내부 검색 fallback
관련 글
```

### 로딩 우선순위

```text
HTML과 핵심 CSS
→ 사이트 자체 기능
→ 댓글
→ 분석
→ 광고
```

### 완료 조건

- AdSense 실패 시 본문 정상
- Giscus 실패 시 댓글 영역만 영향
- Analytics 차단 시 페이지 이동 정상
- 외부 폰트 실패 시 읽을 수 있는 fallback

### 우선순위

```text
P0
```

---

<!-- source message: 50 -->

## G-18. 댓글 지연 로딩

### 현재 위험

댓글을 읽지 않는 사용자에게도 GitHub/Giscus 관련 요청이 즉시 발생할 수 있다.

### 권장 방식

```text
댓글 영역이 viewport에 가까워짐
또는
사용자가 댓글 열기 선택
→ Giscus 로드
```

### UX

초기 상태:

```text
댓글 보기
댓글은 GitHub Discussions를 통해 제공됩니다.
```

### 완료 조건

- 초기 화면에서 Giscus 요청 없음
- 댓글 로딩 실패가 본문에 영향 없음
- 외부 서비스 사용 사실 표시
- 중요한 정정은 댓글에만 남기지 않음

### 우선순위

```text
P1
```

---

<!-- source message: 50 -->

## G-19. 분석 이벤트 최소화

### 수집 대상 후보

```text
페이지 조회
Topic Hub → 글 이동
검색 결과 선택
검색 결과 없음
```

### 기본 제외

```text
전체 검색어 원문 장기 저장
코드 내용
편집 중 문서
사용자 IP 기반 장기 식별
모든 클릭 이벤트
```

특히 검색창에는 회사명, 내부 오류 로그, 사내 hostname이 입력될 수 있다.

### 완료 조건

- 각 이벤트가 실제 의사결정 질문과 연결됨
- 수집하지 않는 데이터가 정의됨
- Query parameter와 fragment가 analytics page path를 폭증시키지 않음
- 개발자와 bot 트래픽을 가능한 범위에서 분리

### 우선순위

```text
P1
```

---

<!-- source message: 50 -->

## G-20. Privacy Policy와 실제 동작 일치 검사

외부 Integration Inventory에서 Privacy Policy를 생성하는 것이 아니라, 사람이 실제 문장으로 정리한다.

### 검사 항목

```text
서비스 이름
수집 목적
쿠키·localStorage 사용
외부 전송
댓글의 GitHub 의존성
광고 설정
연락 방법
```

### 변경 트리거

다음 변경 시 Privacy Policy 검토:

```text
AdSense 추가·제거
Analytics 변경
Giscus 추가·제거
Newsletter 추가
검색어 수집 시작
외부 폰트 변경
```

### 완료 조건

- 정책에 사용하지 않는 서비스 없음
- 사용 중인 서비스 누락 없음
- 푸터 링크 정상
- 마지막 검토일 표시

### 우선순위

```text
P0
```

---

# CSP와 브라우저 보안

<!-- source message: 50 -->

## G-21. CSP 적용 가능성 조사

GitHub Pages 환경에서 header 제어가 제한될 수 있으므로 배포 방식에 맞는 현실적인 적용안을 확인한다.

### 먼저 할 일

현재 페이지가 사용하는 출처를 수집한다.

```text
script-src
style-src
img-src
font-src
connect-src
frame-src
```

### 초기 목표

완벽한 CSP보다 외부 출처 인벤토리를 정확히 만드는 것이 먼저다.

예상 정책 방향:

```text
default-src 'self'
img-src 'self' data: 필요한 이미지 도메인
font-src 'self' 필요한 폰트 도메인
frame-src Giscus 관련 도메인
connect-src Analytics·광고·댓글의 필요한 도메인
```

### 주의

AdSense는 여러 동적 출처를 사용할 수 있어 CSP가 복잡해질 수 있다. 광고를 위해 광범위한 wildcard를 추가하면 정책 효과가 크게 줄어들 수 있다.

### 완료 조건

- 현재 외부 출처 목록 존재
- 불필요한 출처 제거
- CSP 적용 가능·불가능 범위 문서화
- 무의미한 `*`, `unsafe-eval` 중심 정책을 도입하지 않음

### 우선순위

```text
P1
```

---

<!-- source message: 50 -->

## G-22. Inline Script 최소화

테마 초기화처럼 초기 렌더 전에 필요한 작은 script는 있을 수 있다.

하지만 다음이 늘어나면 CSP 적용과 유지보수가 어려워진다.

```text
inline event handler
동적 HTML 문자열
페이지마다 별도 inline script
```

### 개선

```text
onclick 속성 제거
명시적 event listener 사용
공통 client module로 이동
서버·빌드 타임 HTML 우선
```

### 완료 조건

- `onclick`, `onload` 같은 inline handler 없음
- `innerHTML` 사용 위치 전수 확인
- 필수 inline script가 소수이며 이유가 명확
- 동적 script 문자열 생성 없음

### 우선순위

```text
P1
```

---

<!-- source message: 50 -->

## G-23. `innerHTML`과 검색 Highlight 감사

### 위험 위치

```text
검색 결과 snippet
검색어 highlight
Markdown 외부 import
댓글 fallback
사용자 입력 메시지
```

### 권장

텍스트는 `textContent`로 삽입하고, highlight는 DOM node를 나눠 만든다.

나쁜 예:

```ts
result.innerHTML = text.replace(query, `<mark>${query}</mark>`);
```

개선 방향:

```ts
function appendHighlightedText(
  container: HTMLElement,
  text: string,
  query: string,
): void {
  // Match ranges, then append Text and <mark> nodes.
}
```

### 완료 조건

- 사용자 입력이 HTML 문자열로 직접 삽입되지 않음
- Markdown raw HTML 정책 명확
- 검색 query에 `<`, `"`, `&` 등을 넣어도 script 실행이나 DOM 파손 없음

### 우선순위

```text
P0
```

---

<!-- source message: 50 -->

## G-24. Raw HTML 허용 정책

### 선택지

#### 완전 금지

가장 단순하지만 기존 콘텐츠 호환성 문제가 있을 수 있다.

#### 제한 허용

필요한 태그와 attribute만 허용한다.

```text
표준 텍스트 요소
details/summary
제한된 iframe directive
안전한 class 없는 구조
```

#### 신뢰 콘텐츠로 전면 허용

현재 혼자 쓰더라도 미래의 import·AI 초안·외부 기여에서 위험이 커진다.

### 권장

Raw HTML 사용 위치를 먼저 집계하고, 기능별 컴포넌트나 directive로 대체한다.

```text
YouTube embed
callout
diagram
details
```

### 완료 조건

- Raw HTML 사용 문서 수 확인
- Script·inline event attribute 차단
- iframe은 허용 도메인·sandbox 정책 적용
- 자동 import 콘텐츠도 같은 validation 통과

### 우선순위

```text
P1
```

---

<!-- source message: 50 -->

## G-25. Iframe 허용 목록

### 허용 후보

```text
Giscus
YouTube
공식 문서의 제한된 embed
```

### 각 integration에 정의할 것

```text
도메인
sandbox
allow
referrerpolicy
loading
title
```

### 피해야 할 것

Markdown에서 임의 URL을 iframe으로 넣는 범용 기능.

### 완료 조건

- 허용되지 않은 iframe domain build warning 또는 error
- iframe마다 accessible title 존재
- 필요한 최소 권한만 허용
- 모바일 크기와 로딩 실패 fallback 존재

### 우선순위

```text
P1
```

---

# 민감 정보 노출

<!-- source message: 50 -->

## G-26. 콘텐츠 Secret Scan

기술 글의 코드 블록과 로그에도 secret이 들어갈 수 있다.

### 검사 패턴

```text
GitHub token 형식
AWS·Cloud API key 형식
Private key header
Bearer token
password=
client_secret
Authorization:
```

### 주의

예제 placeholder도 scanner에 걸릴 수 있으므로 다음처럼 명백히 가짜 값을 사용한다.

```text
YOUR_GITHUB_TOKEN
EXAMPLE_API_KEY
example.invalid
```

### 결과 정책

```text
실제 가능성이 높은 secret → build error
불명확한 토큰형 문자열 → warning + 수동 확인
```

### 완료 조건

- Markdown과 source code 모두 scan
- 생성된 `dist`도 scan
- Allowlist가 구체적이고 제한적
- 실제 token이 발견되면 즉시 회전 절차 실행

### 우선순위

```text
P0
```

---

<!-- source message: 50 -->

## G-27. 로그와 스크린샷 Redaction Checklist

### 로그에서 제거할 후보

```text
사내 hostname
사설·공인 IP
사용자 이름
절대 경로
고객명
Jira·GitLab 내부 URL
device serial
이메일
token
```

### 스크린샷에서 확인할 후보

```text
브라우저 탭
북마크
알림
터미널 prompt
홈 디렉터리
파일 목록
회사명
```

### 게시 전 처리

```text
필요 영역 crop
식별자 일반화
실 token 전체 교체
EXIF metadata 제거
```

### 완료 조건

- 콘텐츠 작성 가이드에 redaction checklist 존재
- 대표 기술 글 스크린샷 재검토
- 내부 hostname과 개인 경로 검색 리포트 존재
- 새 이미지에서 EXIF 제거 여부 확인

### 우선순위

```text
P0
```

---

<!-- source message: 50 -->

## G-28. 민감 파일 Artifact Allowlist

### 위험

`public/`이나 copy script 설정 오류로 다음이 배포될 수 있다.

```text
.env
*.bak
draft.md
private.json
source archive
원본 PSD
debug log
```

### 권장 방식

금지 목록만 두기보다 허용된 public 자산 경로를 명확히 한다.

### 배포 후 검사

```text
확장자 목록
숨김 파일
대형 예상 밖 파일
환경 파일명
source map
backup suffix
```

### 완료 조건

- `dist`의 금지 파일 검사
- `.env`, private key, backup 파일 없음
- 예상하지 못한 확장자 경고
- 배포 artifact 파일 목록 보존

### 우선순위

```text
P0
```

---

<!-- source message: 50 -->

## G-29. Source Map 공개 정책

### 판단 기준

```text
실제 오류 분석에 필요한가
브라우저 JS가 얼마나 복잡한가
오류 추적 도구를 사용하는가
내부 경로·주석 노출이 불필요한가
```

Source map 자체가 secret은 아니지만 공개 필요가 없다면 production에서 제외한다.

### 완료 조건

- 공개 여부가 의도적으로 결정됨
- source map 내부에 secret이 없는지 별도 검사
- 관리 코드가 source map을 통해 드러나지 않음

### 우선순위

```text
P2
```

---

# 도메인과 HTTPS

<!-- source message: 50 -->

## G-30. HTTPS·Canonical·Domain 점검

### 검사

```text
HTTP → HTTPS 전환
www/apex 일관성
GitHub Pages custom domain
canonical production origin
Sitemap origin
OG URL
```

### 완료 조건

- 모든 내부 absolute URL이 HTTPS
- HTTP 접근은 HTTPS로 이동
- 한 개의 production origin 사용
- 인증서 오류 없음
- preview URL이 canonical이나 Sitemap에 들어가지 않음

### 우선순위

```text
P0
```

---

<!-- source message: 50 -->

## G-31. Domain Takeover 방지 운영

Custom domain을 변경하거나 사이트를 이전할 때 DNS와 Pages 설정을 함께 관리한다.

### 문서화

```text
도메인 등록자
DNS provider
GitHub Pages 연결 방식
검증 상태
만료일
이전·삭제 절차
```

### 완료 조건

- 사용하지 않는 DNS record 없음
- GitHub Pages domain verification 확인
- 저장소 이동·삭제 시 DNS 정리 절차 존재
- 도메인 자동 갱신과 복구 연락 경로 확인

### 우선순위

```text
P1
```

---

# 보안 운영

<!-- source message: 50 -->

## G-32. 최소 보안 Runbook

최소한 다음 사건을 다룬다.

```text
Secret 노출
악성 dependency 의심
사이트 변조
GitHub 계정 침해
Domain·DNS 변경
잘못된 광고·외부 script 삽입
```

### 각 Runbook 구조

```text
탐지
즉시 차단
credential 회전
정상 artifact rollback
영향 범위 확인
재발 방지
```

### 완료 조건

- 저장소 안에 짧은 보안 runbook 존재
- 최근 정상 artifact 위치 확인 가능
- 계정 복구·2FA 수단 안전하게 관리
- 연락·지원 경로 기록

### 우선순위

```text
P1
```

---

<!-- source message: 50 -->

## G-33. 정기 보안 감사 범위

### 매 변경마다

```text
content secret scan
dist 민감 파일 검사
workflow permission lint
내부 HTML/XSS 관련 테스트
```

### 월간 또는 dependency 변경 시

```text
dependency 취약점
install script
외부 integration 목록
Action SHA 업데이트
```

### 분기별

```text
도메인·HTTPS
계정 복구
사용하지 않는 secret
Privacy Policy 일치
```

### 완료 조건

- 빠른 검사와 정기 검사가 분리
- 외부 네트워크 감사가 일반 배포를 불안정하게 하지 않음
- 반복 결과가 issue 또는 report로 남음

### 우선순위

```text
P1
```

---

<!-- source message: 50 -->

## G-34. 보안 수준의 종료 조건

이 Epic에서 다음까지 만들 필요는 없다.

```text
SIEM
상시 SOC
복잡한 WAF
자체 OAuth 서버
그래프 기반 공급망 플랫폼
```

### 1차 완료 기준

```text
공개 사이트에 secret·쓰기 권한 없음
관리 코드 production 제외
workflow 최소 권한
build·deploy 분리
action SHA 고정
외부 script 인벤토리
민감 콘텐츠·artifact scan
Privacy Policy 일치
HTTPS와 domain 정상
```

이 상태면 개인 정적 기술 블로그에 필요한 현실적인 기준선을 갖춘 것이다.

---

# Epic G 완료 기준

## 공개 사이트

```text
순수 정적 읽기 사이트
관리자 route·코드 없음
외부 서비스 실패와 본문 분리
raw HTML·iframe 정책
XSS 위험 위치 정리
```

## CI

```text
workflow permissions 명시
build와 deploy 분리
action SHA 고정
secret 최소 전달
fork PR에서 secret 없음
```

## 공급망

```text
dependency 역할 목록
install script 감사
lockfile 변경 분리
취약점 위험 기반 대응
```

## 개인정보

```text
외부 integration inventory
Privacy Policy 일치
댓글·광고·분석 데이터 흐름 파악
검색 이벤트 최소화
```

## 콘텐츠

```text
secret scan
로그·스크린샷 redaction
민감 파일 artifact 검사
production source map 정책
```

---

# Epic G 우선순위 요약

| ID | 작업 | 우선순위 | 난도 | 효과 |
|---|---|---:|---:|---:|
| G-01 | 공개·관리 경계 확정 | P0 | 중간 | 매우 높음 |
| G-02 | Production 관리자 코드 제거 | P0 | 중간 | 매우 높음 |
| G-03 | Workflow 권한 조사 | P0 | 낮음 | 매우 높음 |
| G-04 | Build·Deploy 분리 | P0 | 중간 | 매우 높음 |
| G-05 | Action SHA 고정 | P0 | 중간 | 높음 |
| G-06 | 제3자 Action 최소화 | P1 | 중간 | 높음 |
| G-07 | Secret Inventory | P0 | 낮음 | 매우 높음 |
| G-08 | Secret 전달 축소 | P0 | 낮음 | 높음 |
| G-12 | Dependency 역할 분류 | P0 | 중간 | 높음 |
| G-16 | 외부 Integration Inventory | P0 | 낮음 | 매우 높음 |
| G-17 | 외부 Script 실패 격리 | P0 | 중간 | 높음 |
| G-20 | Privacy Policy 일치 | P0 | 중간 | 매우 높음 |
| G-23 | `innerHTML`·검색 Highlight 감사 | P0 | 중간 | 매우 높음 |
| G-26 | 콘텐츠 Secret Scan | P0 | 중간 | 매우 높음 |
| G-27 | 로그·스크린샷 Redaction | P0 | 중간 | 매우 높음 |
| G-28 | Artifact 민감 파일 검사 | P0 | 낮음 | 높음 |
| G-30 | HTTPS·Domain 점검 | P0 | 낮음 | 매우 높음 |
| G-32 | 보안 Runbook | P1 | 낮음 | 높음 |

---

# 일곱 번째 실제 실행 묶음

가장 현실적인 첫 배포 단위는 다음이다.

```text
1. Production dist에서 관리자 route와 OAuth 관련 코드 제거
2. 모든 workflow에 최소 permissions 명시
3. Build와 Deploy job 분리
4. 외부·공식 Action을 full SHA로 고정
5. Secret Inventory와 외부 Integration Inventory 작성
6. 검색 UI의 innerHTML·highlight 처리 검사
7. Markdown·로그·dist를 대상으로 secret scan 추가
8. 사내 hostname·개인 경로·내부 URL 노출 리포트 생성
9. Privacy Policy를 실제 AdSense·Analytics·Giscus 구성과 일치시킴
10. HTTPS·canonical·custom domain 상태를 최종 검증
```

이 작업이 끝나면 공개 사이트는 다시 단순한 정적 읽기 사이트가 되고, 빌드·배포 권한과 외부 서비스 위험이 콘텐츠 자체로부터 분리된다.

다음은 **Task 3-8. 테스트·회귀 검증·출시 체크리스트 백로그**다. 지금까지 A~G에서 바꾼 홈, Hub, metadata, 검색, 색인, 빌드, 보안이 다시 깨지지 않도록 최소 테스트 세트와 출시 순서를 정의한다.
