---
title: "Content strategy and structure (60 anti-patterns)"
category: content
item_count: 60
---
# Content strategy and structure
> LLM instructions: Treat each `AP-*` block as an atomic claim. Use `Original IDs` and `Related IDs` for traceability; do not infer that nearby blocks are duplicates.
## AP-A-01 — Article Warehouse
- Category: Content strategy and structure
- Original IDs: A-01
- Source messages: d23c12f4-bf60-4ada-a60b-7a6c9976c2c3
- Merge status: canonical source
### Source material
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
## AP-A-01-2 — 저장소의 1차 목적 선언
- Category: Content strategy and structure
- Original IDs: A-01
- Source messages: f9081919-335b-4876-8c62-d7793d412fc1
- Merge status: canonical source
### Source material
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
## AP-A-02 — Chronological Architecture
- Category: Content strategy and structure
- Original IDs: A-02
- Source messages: d23c12f4-bf60-4ada-a60b-7a6c9976c2c3
- Merge status: canonical source
### Source material
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
## AP-A-02-2 — 홈 Hero 문구 재정의
- Category: Content strategy and structure
- Original IDs: A-02
- Source messages: f9081919-335b-4876-8c62-d7793d412fc1
- Merge status: canonical source
### Source material
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
## AP-A-03 — Flat Knowledge Model
- Category: Content strategy and structure
- Original IDs: A-03
- Source messages: d23c12f4-bf60-4ada-a60b-7a6c9976c2c3
- Merge status: canonical source
### Source material
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
## AP-A-03-2 — 홈 정보 구조 변경
- Category: Content strategy and structure
- Original IDs: A-03
- Source messages: f9081919-335b-4876-8c62-d7793d412fc1
- Merge status: canonical source
### Source material
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
## AP-A-04 — Missing Topic Hub
- Category: Content strategy and structure
- Original IDs: A-04
- Source messages: d23c12f4-bf60-4ada-a60b-7a6c9976c2c3
- Merge status: canonical source
### Source material
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
## AP-A-04-2 — Core Topics 영역 추가
- Category: Content strategy and structure
- Original IDs: A-04
- Source messages: f9081919-335b-4876-8c62-d7793d412fc1
- Merge status: canonical source
### Source material
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
## AP-A-05 — Article-First Design
- Category: Content strategy and structure
- Original IDs: A-05
- Source messages: d23c12f4-bf60-4ada-a60b-7a6c9976c2c3
- Merge status: canonical source
### Source material
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
## AP-A-05-2 — Featured Guides 영역 추가
- Category: Content strategy and structure
- Original IDs: A-05
- Source messages: f9081919-335b-4876-8c62-d7793d412fc1
- Merge status: canonical source
### Source material
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
## AP-A-06 — Mega-Article Architecture
- Category: Content strategy and structure
- Original IDs: A-06
- Source messages: d23c12f4-bf60-4ada-a60b-7a6c9976c2c3
- Merge status: canonical source
### Source material
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
## AP-A-06-2 — Latest Posts 역할 축소
- Category: Content strategy and structure
- Original IDs: A-06
- Source messages: f9081919-335b-4876-8c62-d7793d412fc1
- Merge status: canonical source
### Source material
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
## AP-A-07 — Fragmentation by Default
- Category: Content strategy and structure
- Original IDs: A-07
- Source messages: d23c12f4-bf60-4ada-a60b-7a6c9976c2c3
- Merge status: canonical source
### Source material
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
## AP-A-07-2 — 홈의 사이트 신뢰 신호 추가
- Category: Content strategy and structure
- Original IDs: A-07
- Source messages: f9081919-335b-4876-8c62-d7793d412fc1
- Merge status: canonical source
### Source material
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
## AP-A-08 — Framework-Centric Architecture
- Category: Content strategy and structure
- Original IDs: A-08
- Source messages: d23c12f4-bf60-4ada-a60b-7a6c9976c2c3
- Merge status: canonical source
### Source material
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
## AP-A-08-2 — 홈 SEO metadata 정비
- Category: Content strategy and structure
- Original IDs: A-08
- Source messages: f9081919-335b-4876-8c62-d7793d412fc1
- Merge status: canonical source
### Source material
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
## AP-A-09 — Theme Product Convergence
- Category: Content strategy and structure
- Original IDs: A-09
- Source messages: d23c12f4-bf60-4ada-a60b-7a6c9976c2c3
- Merge status: canonical source
### Source material
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
## AP-A-09-2 — 홈 컴포넌트 경계 단순화
- Category: Content strategy and structure
- Original IDs: A-09
- Source messages: f9081919-335b-4876-8c62-d7793d412fc1
- Merge status: canonical source
### Source material
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
## AP-A-10 — Configuration-Driven Everything
- Category: Content strategy and structure
- Original IDs: A-10
- Source messages: d23c12f4-bf60-4ada-a60b-7a6c9976c2c3
- Merge status: canonical source
### Source material
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
## AP-A-10-2 — 홈 개편의 완료 기준
- Category: Content strategy and structure
- Original IDs: A-10
- Source messages: f9081919-335b-4876-8c62-d7793d412fc1
- Merge status: canonical source
### Source material
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
## AP-A-11 — Static Site with SPA Ambition
- Category: Content strategy and structure
- Original IDs: A-11
- Source messages: d23c12f4-bf60-4ada-a60b-7a6c9976c2c3
- Merge status: canonical source
### Source material
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
## AP-A-12 — Hydration Without Interaction
- Category: Content strategy and structure
- Original IDs: A-12
- Source messages: d23c12f4-bf60-4ada-a60b-7a6c9976c2c3
- Merge status: canonical source
### Source material
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
## AP-A-13 — Content and Rendering Coupling
- Category: Content strategy and structure
- Original IDs: A-13
- Source messages: d23c12f4-bf60-4ada-a60b-7a6c9976c2c3
- Merge status: canonical source
### Source material
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
## AP-A-14 — Custom Markdown Language
- Category: Content strategy and structure
- Original IDs: A-14
- Source messages: d23c12f4-bf60-4ada-a60b-7a6c9976c2c3
- Merge status: canonical source
### Source material
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
## AP-A-15 — URL–Taxonomy Coupling
- Category: Content strategy and structure
- Original IDs: A-15
- Source messages: d23c12f4-bf60-4ada-a60b-7a6c9976c2c3
- Merge status: canonical source
### Source material
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
## AP-A-16 — Navigation as a File Browser
- Category: Content strategy and structure
- Original IDs: A-16
- Source messages: d23c12f4-bf60-4ada-a60b-7a6c9976c2c3
- Merge status: canonical source
### Source material
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
## AP-A-17 — Search as Primary Navigation
- Category: Content strategy and structure
- Original IDs: A-17
- Source messages: d23c12f4-bf60-4ada-a60b-7a6c9976c2c3
- Merge status: canonical source
### Source material
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
## AP-A-18 — Integration Entanglement
- Category: Content strategy and structure
- Original IDs: A-18
- Source messages: d23c12f4-bf60-4ada-a60b-7a6c9976c2c3
- Merge status: canonical source
### Source material
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
## AP-A-19 — Generated Asset Dependency
- Category: Content strategy and structure
- Original IDs: A-19
- Source messages: d23c12f4-bf60-4ada-a60b-7a6c9976c2c3
- Merge status: canonical source
### Source material
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
## AP-A-20 — Internal Platform Before User Value
- Category: Content strategy and structure
- Original IDs: A-20
- Source messages: d23c12f4-bf60-4ada-a60b-7a6c9976c2c3
- Merge status: canonical source
### Source material
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
## AP-C-01 — Topic-Only Title
- Category: Content strategy and structure
- Original IDs: C-01
- Source messages: bd5012a2-ecde-4821-87a1-d92f6b433abf
- Merge status: canonical source
### Source material
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
## AP-C-01-2 — 콘텐츠 상태 모델 확정
- Category: Content strategy and structure
- Original IDs: C-01
- Source messages: 6c73b6f1-f444-44c3-bda2-4196ea9f48f9
- Merge status: canonical source
### Source material
모든 글을 무조건 `current`와 `old`로만 나누면 부족하다.

추천 상태는 다섯 개다.

```text
current
needs-review
historical
superseded
archived
```
## AP-C-02 — Keyword Stack Title
- Category: Content strategy and structure
- Original IDs: C-02
- Source messages: bd5012a2-ecde-4821-87a1-d92f6b433abf
- Merge status: canonical source
### Source material
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
## AP-C-02-2 — 상태별 노출 정책 정의
- Category: Content strategy and structure
- Original IDs: C-02
- Source messages: 6c73b6f1-f444-44c3-bda2-4196ea9f48f9
- Merge status: canonical source
### Source material
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
## AP-C-03 — Part-Number Naming
- Category: Content strategy and structure
- Original IDs: C-03
- Source messages: bd5012a2-ecde-4821-87a1-d92f6b433abf
- Merge status: canonical source
### Source material
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
## AP-C-03-2 — 최소 metadata schema 도입
- Category: Content strategy and structure
- Original IDs: C-03
- Source messages: 6c73b6f1-f444-44c3-bda2-4196ea9f48f9
- Merge status: canonical source
### Source material
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
## AP-C-04 — Delayed Value Proposition
- Category: Content strategy and structure
- Original IDs: C-04
- Source messages: bd5012a2-ecde-4821-87a1-d92f6b433abf
- Merge status: canonical source
### Source material
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
## AP-C-04-2 — `updated`와 `lastVerified` 분리
- Category: Content strategy and structure
- Original IDs: C-04
- Source messages: 6c73b6f1-f444-44c3-bda2-4196ea9f48f9
- Merge status: canonical source
### Source material
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
## AP-C-05 — Dictionary Opening
- Category: Content strategy and structure
- Original IDs: C-05
- Source messages: bd5012a2-ecde-4821-87a1-d92f6b433abf
- Merge status: canonical source
### Source material
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
## AP-C-05-2 — 콘텐츠 타입 확정
- Category: Content strategy and structure
- Original IDs: C-05
- Source messages: 6c73b6f1-f444-44c3-bda2-4196ea9f48f9
- Merge status: canonical source
### Source material
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
## AP-C-06 — Generic Importance Claim
- Category: Content strategy and structure
- Original IDs: C-06
- Source messages: bd5012a2-ecde-4821-87a1-d92f6b433abf
- Merge status: canonical source
### Source material
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
## AP-C-06-2 — 타입별 최소 품질 기준
- Category: Content strategy and structure
- Original IDs: C-06
- Source messages: 6c73b6f1-f444-44c3-bda2-4196ea9f48f9
- Merge status: canonical source
### Source material
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
## AP-C-07 — Background Inflation
- Category: Content strategy and structure
- Original IDs: C-07
- Source messages: bd5012a2-ecde-4821-87a1-d92f6b433abf
- Merge status: canonical source
### Source material
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
## AP-C-07-2 — 대표 문서 20개 감사표 생성
- Category: Content strategy and structure
- Original IDs: C-07
- Source messages: 6c73b6f1-f444-44c3-bda2-4196ea9f48f9
- Merge status: canonical source
### Source material
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
## AP-C-08 — Repeated Context Boilerplate
- Category: Content strategy and structure
- Original IDs: C-08
- Source messages: bd5012a2-ecde-4821-87a1-d92f6b433abf
- Merge status: canonical source
### Source material
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
## AP-C-08-2 — 대표 문서의 상단 신뢰 블록
- Category: Content strategy and structure
- Original IDs: C-08
- Source messages: 6c73b6f1-f444-44c3-bda2-4196ea9f48f9
- Merge status: canonical source
### Source material
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
## AP-C-09 — Scope Creep Article
- Category: Content strategy and structure
- Original IDs: C-09
- Source messages: bd5012a2-ecde-4821-87a1-d92f6b433abf
- Merge status: canonical source
### Source material
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
## AP-C-09-2 — 상태 배너 설계
- Category: Content strategy and structure
- Original IDs: C-09
- Source messages: 6c73b6f1-f444-44c3-bda2-4196ea9f48f9
- Merge status: canonical source
### Source material
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
## AP-C-10 — One Article, Multiple Audiences
- Category: Content strategy and structure
- Original IDs: C-10
- Source messages: bd5012a2-ecde-4821-87a1-d92f6b433abf
- Merge status: canonical source
### Source material
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
## AP-C-10-2 — 근거·관찰·추론 구분
- Category: Content strategy and structure
- Original IDs: C-10
- Source messages: 6c73b6f1-f444-44c3-bda2-4196ea9f48f9
- Merge status: canonical source
### Source material
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
## AP-C-11 — Undefined Reader Prerequisite
- Category: Content strategy and structure
- Original IDs: C-11
- Source messages: bd5012a2-ecde-4821-87a1-d92f6b433abf
- Merge status: canonical source
### Source material
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
## AP-C-11-2 — 가설을 사실로 바꾸는 자동 문체 수정 금지
- Category: Content strategy and structure
- Original IDs: C-11
- Source messages: 6c73b6f1-f444-44c3-bda2-4196ea9f48f9
- Merge status: canonical source
### Source material
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
## AP-C-12 — Post Homogeneity
- Category: Content strategy and structure
- Original IDs: C-12
- Source messages: bd5012a2-ecde-4821-87a1-d92f6b433abf
- Merge status: canonical source
### Source material
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
## AP-C-12-2 — 테스트 환경 템플릿
- Category: Content strategy and structure
- Original IDs: C-12
- Source messages: 6c73b6f1-f444-44c3-bda2-4196ea9f48f9
- Merge status: canonical source
### Source material
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
## AP-C-13 — Tutorial Without Outcome
- Category: Content strategy and structure
- Original IDs: C-13
- Source messages: bd5012a2-ecde-4821-87a1-d92f6b433abf
- Merge status: canonical source
### Source material
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
## AP-C-13-2 — 소스코드 분석 글에 commit 기준 추가
- Category: Content strategy and structure
- Original IDs: C-13
- Source messages: 6c73b6f1-f444-44c3-bda2-4196ea9f48f9
- Merge status: canonical source
### Source material
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
## AP-C-14 — Command Dump
- Category: Content strategy and structure
- Original IDs: C-14
- Source messages: bd5012a2-ecde-4821-87a1-d92f6b433abf
- Merge status: canonical source
### Source material
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
## AP-C-14-2 — 사양 기반 글에 revision 추가
- Category: Content strategy and structure
- Original IDs: C-14
- Source messages: 6c73b6f1-f444-44c3-bda2-4196ea9f48f9
- Merge status: canonical source
### Source material
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
## AP-C-15 — Magic Fix
- Category: Content strategy and structure
- Original IDs: C-15
- Source messages: bd5012a2-ecde-4821-87a1-d92f6b433abf
- Merge status: canonical source
### Source material
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
## AP-C-15-2 — 디버깅 글의 실패 과정 복원
- Category: Content strategy and structure
- Original IDs: C-15
- Source messages: 6c73b6f1-f444-44c3-bda2-4196ea9f48f9
- Merge status: canonical source
### Source material
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
