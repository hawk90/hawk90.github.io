---
title: "Phase 1 — Domain and information foundation"
item_count: 46
---

# Phase 1 — Domain and information foundation

> Execute these tasks in order within this phase. Do not mark a task complete without linking evidence or a verification command.

## PH-ARC-01 — Domain 기본 모델 생성

- Original task: ARC-01
- Source message: 07c1744e-8164-4d0d-b280-38b916880df0
- Status: pending

### Task details

```text
ContentType
ContentStatus
ContentDocument
TopicDefinition
PublicationDecision
```

## PH-ARC-02 — Astro Entry Normalizer 생성

- Original task: ARC-02
- Source message: 07c1744e-8164-4d0d-b280-38b916880df0
- Status: pending

### Task details

```text
CollectionEntry
→ ContentDocument
```

## PH-ARC-03 — Content Manifest 생성

- Original task: ARC-03
- Source message: 07c1744e-8164-4d0d-b280-38b916880df0
- Status: pending

### Task details

```text
byId
byUrl
documents
```

## PH-ARC-04 — Publication Policy 중앙화

- Original task: ARC-04
- Source message: 07c1744e-8164-4d0d-b280-38b916880df0
- Status: pending

### Task details

```text
render
index
search
sitemap
rss
featured
ads
```

## PH-ARC-05 — Topic Registry 이동

- Original task: ARC-05
- Source message: 07c1744e-8164-4d0d-b280-38b916880df0
- Status: pending

### Task details

현재 흩어진 카테고리·Topic 상수를 한 곳으로 통합한다.

## PH-ARC-06 — Home Featured Curation 이동

- Original task: ARC-06
- Source message: 07c1744e-8164-4d0d-b280-38b916880df0
- Status: pending

### Task details

front matter나 컴포넌트 내부 배열을 Domain Curation으로 이동한다.

## PH-ARC-07 — Topic Hub Query 작성

- Original task: ARC-07
- Source message: 07c1744e-8164-4d0d-b280-38b916880df0
- Status: pending

### Task details

```text
Start Here
Featured
자동 Article 목록
```

## PH-ARC-08 — Search Generator를 Manifest 기반으로 변경

- Original task: ARC-08
- Source message: 07c1744e-8164-4d0d-b280-38b916880df0
- Status: pending

### Task details

전체 Markdown을 다시 파싱하지 않게 한다.

## PH-ARC-09 — Sitemap과 RSS를 Publication Policy에 연결

- Original task: ARC-09
- Source message: 07c1744e-8164-4d0d-b280-38b916880df0
- Status: pending

### Task details



## PH-ARC-10 — 기존 중복 loader 삭제

- Original task: ARC-10
- Source message: 07c1744e-8164-4d0d-b280-38b916880df0
- Status: pending

### Task details

---

## PH-B-01 — Topic Hub의 역할 정의

- Original task: B-01
- Source message: e5772c7f-1398-4495-b5fa-a8ef0b26706d
- Status: pending

### Task details

Topic Hub는 다음 세 가지를 동시에 담당해야 한다.

```text
1. 분야 소개
2. 학습 지도
3. 대표 콘텐츠 큐레이션
```

반대로 다음 역할은 맡기지 않는다.

```text
모든 글 자동 나열
태그 페이지 대체
백과사전 전체 설명
전체 검색 기능
복잡한 지식 그래프
```

좋은 Topic Hub는 장문 튜토리얼도 아니고 단순 아카이브도 아니다.

> 해당 분야의 지도와 출발점이다.

---

## PH-B-02 — 공통 Hub 페이지 구조

- Original task: B-02
- Source message: e5772c7f-1398-4495-b5fa-a8ef0b26706d
- Status: pending

### Task details

두 Hub 모두 같은 기본 뼈대를 사용한다.

```text
Hero
Topic Overview
Start Here
Concept Map
Featured Guides
Debug & Experiments
Reference
Related Topics
Recently Updated
```

초기 버전에서는 아래 정도로 줄여도 충분하다.

```text
Hero
Start Here
Core Concepts
Featured Guides
Debug & Experiments
Related Topics
```

---

## Hero

포함할 정보:

```text
Topic 이름
한 문장 정의
이 Hub가 다루는 범위
대상 독자
```

예:

```text
PCIe & CXL

PCIe 장치 발견, BAR, 인터럽트, DMA부터
CXL 메모리 주소 변환과 Linux 노출 과정까지
호스트와 장치 사이의 시스템 흐름을 설명합니다.
```

---

## Start Here

대표 진입 문서 3개 이내로 제한한다.

```text
처음 시작
구조 이해
실전 진입
```

예:

```text
처음 시작:
PCIe 장치는 어떻게 발견되고 초기화되는가

구조 이해:
BAR, MSI-X와 DMA의 전체 흐름

실전 진입:
Linux에서 PCIe 장치를 추적하는 방법
```

---

## Core Concepts

하위 개념을 단순 태그가 아니라 의미 묶음으로 보여준다.

```text
Enumeration
BAR & MMIO
Interrupt
DMA & IOMMU
CXL Memory
Linux Integration
```

각 개념은 다음을 가진다.

```text
이름
짧은 설명
대표 문서
```

---

## Featured Guides

주제 전체를 이해하는 데 가장 중요한 문서 4~6개.

---

## Debug & Experiments

실제 장애·실험·로그 분석 글을 따로 묶는다.

이 영역이 `hawk90.github.io`의 차별화 포인트다.

---

## Related Topics

다른 Hub와의 교차 관계를 보여준다.

예:

```text
PCIe & CXL
→ Linux & Systems
→ Firmware & Bootloader
→ GPU & CUDA
```

---

## PH-B-03 — `PCIe & CXL` Hub 생성

- Original task: B-03
- Source message: e5772c7f-1398-4495-b5fa-a8ef0b26706d
- Status: pending

### Task details

## 권장 URL

```text
/topics/pcie-cxl/
```

신규 URL은 짧고 안정적으로 유지한다.

## 페이지 제목

```text
PCIe & CXL
```

## 설명

```text
PCIe 장치의 열거, BAR, MSI-X, DMA와 IOMMU,
CXL 메모리 주소 변환과 운영체제 통합 과정을 다룹니다.
```

---

## PH-B-04 — `PCIe & CXL` 하위 구조

- Original task: B-04
- Source message: e5772c7f-1398-4495-b5fa-a8ef0b26706d
- Status: pending

### Task details

추천 구조는 다음이다.

```text
PCIe & CXL
├── PCIe Architecture
├── Enumeration & Configuration Space
├── BAR & MMIO
├── Interrupt
├── DMA & IOMMU
├── CXL Architecture
├── CXL Memory Mapping
└── Linux Integration
```

너무 많은 하위 Topic을 독립 페이지로 만들 필요는 없다.

초기에는 Hub 내부 섹션으로만 사용한다.

---

## PH-B-05 — `PCIe & CXL` Start Here

- Original task: B-05
- Source message: e5772c7f-1398-4495-b5fa-a8ef0b26706d
- Status: pending

### Task details

첫 진입 문서는 3개면 충분하다.

## 1. PCIe 전체 흐름

가칭:

```text
PCIe 장치는 어떻게 발견되고 사용할 수 있게 되는가
```

다룰 내용:

```text
Link up
Configuration Space
Enumeration
BAR probing
Address allocation
Driver binding
Interrupt
DMA
```

이 문서는 세부 설명보다 전체 흐름과 관련 문서 연결이 목적이다.

## 2. BAR 대표 문서

가칭:

```text
PCIe BAR 크기 탐색과 주소 할당 과정
```

다룰 내용:

```text
BAR register
Size probing
32/64-bit BAR
MMIO address assignment
Host access
```

## 3. CXL 메모리 대표 문서

가칭:

```text
CXL 메모리는 호스트 주소 공간에 어떻게 연결되는가
```

다룰 내용:

```text
HPA
DPA
HDM Decoder
Firmware tables
Linux NUMA
```

---

## PH-B-06 — `PCIe & CXL` 대표 글 선정 기준

- Original task: B-06
- Source message: e5772c7f-1398-4495-b5fa-a8ef0b26706d
- Status: pending

### Task details

대표 글은 조회수보다 구조적 역할로 선정한다.

## 필수 조건

다음 중 최소 세 가지:

```text
전체 흐름을 설명함
다른 글의 선행 문서임
직접 분석·실험이 있음
현재 환경에서 유효함
다른 사이트에서 찾기 어려운 정보가 있음
```

## 추천 역할 분배

```text
1개: 전체 Guide
2개: 핵심 Concept
1개: Source Walkthrough
1개: Debug Note
1개: Experiment
```

예를 들어 Featured가 6개라면:

```text
PCIe 장치 초기화 전체 흐름
BAR 크기 탐색
MSI-X 설정
Linux PCI enumeration source walkthrough
CXL HDM Decoder
PCIe mmap 실패 디버깅
```

---

## PH-B-07 — `PCIe & CXL` 문서 역할 분류

- Original task: B-07
- Source message: e5772c7f-1398-4495-b5fa-a8ef0b26706d
- Status: pending

### Task details

기존 글을 다음으로 나눈다.

```text
Guide
Concept
Debug Note
Experiment
Source Walkthrough
Reference
```

예:

| 주제 | 권장 유형 |
|---|---|
| Configuration Space 개념 | Concept |
| BAR size probing | Concept |
| Linux PCI enumeration 추적 | Source Walkthrough |
| U250 BAR mmap 실패 | Debug Note |
| MSI-X latency 측정 | Experiment |
| PCI capability ID 표 | Reference |

같은 주제라도 역할이 다르면 공존할 수 있다.

반대로 역할도 같고 검색 의도도 같다면 통합 후보가 된다.

---

## PH-B-08 — `PCIe & CXL` 기존 글 배치 작업

- Original task: B-08
- Source message: e5772c7f-1398-4495-b5fa-a8ef0b26706d
- Status: pending

### Task details

각 기존 글에 다음만 우선 지정한다.

```yaml
topic: pcie-cxl
type: concept
status: current
```

처음부터 관계 metadata를 모두 넣지 않는다.

1차 작업에서는 다음 세 필드만 있어도 충분하다.

```text
parent topic
content type
status
```

2차 작업에서 대표 글에만 추가한다.

```yaml
prerequisites:
next:
related:
```

---

## PH-B-09 — `PCIe & CXL` 중복 후보 분석

- Original task: B-09
- Source message: e5772c7f-1398-4495-b5fa-a8ef0b26706d
- Status: pending

### Task details

다음 유형을 찾아야 한다.

## 개념 중복

```text
PCIe BAR란
BAR 크기 계산
BAR 크기 탐색
BAR 주소 할당
```

서로 독립적인 검색 의도가 있는지 확인한다.

권장 결과:

```text
대표 Concept:
BAR 크기 탐색과 주소 할당

보조 Debug:
BAR가 0으로 보이는 이유

Reference:
BAR bit layout
```

## CXL 구조 중복

```text
CXL memory
HDM Decoder
HPA to DPA
Linux NUMA
```

모두 하나의 거대 글로 합칠 필요는 없다.

대신 대표 Guide를 상위에 두고 세부 문서를 연결한다.

---

## PH-B-10 — `PCIe & CXL` Hub 완료 조건

- Original task: B-10
- Source message: e5772c7f-1398-4495-b5fa-a8ef0b26706d
- Status: pending

### Task details

```text
Hub 설명 존재
Start Here 3개 이하
Core Concepts 6~8개
Featured 4~6개
Debug 또는 Experiment 3개 이상
관련 Topic 2개 이상
모든 링크 유효
```

추가 완료 조건:

- 단순 최신순 목록이 아님
- 구판 글을 Featured로 노출하지 않음
- 같은 글이 여러 섹션에 과도하게 반복되지 않음
- 모바일에서도 처음 두 섹션이 쉽게 읽힘
- JS 없이 전체 탐색 가능

---

## PH-B-11 — `Firmware & Bootloader` Hub 생성

- Original task: B-11
- Source message: e5772c7f-1398-4495-b5fa-a8ef0b26706d
- Status: pending

### Task details

## 권장 URL

```text
/topics/firmware-bootloader/
```

## 페이지 제목

```text
Firmware & Bootloader
```

## 설명

```text
보드 초기화, UEFI, U-Boot, BSP, 장치 발견과
운영체제로 제어권이 넘어가는 부팅 흐름을 다룹니다.
```

---

## PH-B-12 — `Firmware & Bootloader` 하위 구조

- Original task: B-12
- Source message: e5772c7f-1398-4495-b5fa-a8ef0b26706d
- Status: pending

### Task details

```text
Firmware & Bootloader
├── Boot Flow
├── UEFI
├── U-Boot
├── BSP
├── Device Initialization
├── Memory & MMIO
├── Secure Boot
└── Handoff to OS
```

하위 구조는 다음처럼도 묶을 수 있다.

```text
Boot Architecture
Hardware Initialization
Bootloader Internals
Security
OS Handoff
```

초기에는 5개 정도가 더 관리하기 쉽다.

---

## PH-B-13 — `Firmware & Bootloader` Start Here

- Original task: B-13
- Source message: e5772c7f-1398-4495-b5fa-a8ef0b26706d
- Status: pending

### Task details

## 1. 전체 부팅 흐름

가칭:

```text
전원이 켜진 뒤 운영체제가 시작되기까지
```

다룰 내용:

```text
Reset vector
ROM
First-stage boot
DRAM initialization
Device initialization
Bootloader
Kernel handoff
```

## 2. U-Boot 구조

가칭:

```text
U-Boot는 보드를 어떻게 초기화하는가
```

다룰 내용:

```text
SPL
Driver model
Device tree
PCIe initialization
Environment
Boot command
```

## 3. UEFI 구조

가칭:

```text
UEFI는 하드웨어와 운영체제 사이에서 무엇을 하는가
```

다룰 내용:

```text
SEC
PEI
DXE
BDS
Runtime services
ACPI handoff
```

---

## PH-B-14 — `Firmware & Bootloader` Featured 역할

- Original task: B-14
- Source message: e5772c7f-1398-4495-b5fa-a8ef0b26706d
- Status: pending

### Task details

추천 분배:

```text
1개: 전체 Boot Guide
1개: U-Boot Source Walkthrough
1개: UEFI Architecture
1개: BSP/Board Initialization
1개: Secure Boot
1개: 실제 부팅 장애 Debug Note
```

이 Hub에서는 실무 기반 Debug Note가 특히 중요하다.

예:

```text
DRAM 초기화 실패
PCIe 장치 미탐지
Device tree mismatch
Boot device 탐색 실패
Secure Boot 인증 실패
```

---

## PH-B-15 — Firmware와 PCIe Hub의 경계

- Original task: B-15
- Source message: e5772c7f-1398-4495-b5fa-a8ef0b26706d
- Status: pending

### Task details

PCIe 초기화 글은 두 Hub에 걸칠 수 있다.

이때 중복 저장하거나 복사하지 않는다.

## 기준

글의 중심 질문이 무엇인지 본다.

### PCIe Hub 중심

```text
BAR는 어떻게 할당되는가
MSI-X는 어떻게 설정되는가
```

### Firmware Hub 중심

```text
U-Boot는 PCIe controller를 어떤 순서로 초기화하는가
UEFI DXE에서 PCI bus를 어떻게 열거하는가
```

하나를 parent로 지정하고 다른 Hub에서는 교차 링크로 노출한다.

```yaml
parent: firmware-bootloader
relatedTopics:
  - pcie-cxl
```

초기 schema에 `relatedTopics`가 없다면 Hub 큐레이션 파일에서만 연결해도 된다.

---

## PH-B-16 — Topic registry 생성

- Original task: B-16
- Source message: e5772c7f-1398-4495-b5fa-a8ef0b26706d
- Status: pending

### Task details

Topic 이름을 글마다 자유 문자열로 넣으면 표기 드리프트가 발생한다.

따라서 작은 registry를 둔다.

```ts
export const TOPICS = {
  pcieCxl: {
    id: "pcie-cxl",
    title: "PCIe & CXL",
    href: "/topics/pcie-cxl/",
  },
  firmwareBootloader: {
    id: "firmware-bootloader",
    title: "Firmware & Bootloader",
    href: "/topics/firmware-bootloader/",
  },
} as const;
```

또는 YAML:

```yaml
topics:
  - id: pcie-cxl
    title: PCIe & CXL
    description: ...
  - id: firmware-bootloader
    title: Firmware & Bootloader
    description: ...
```

## 완료 조건

- Topic ID는 영문 slug
- 화면 표시명은 별도
- alias와 title이 분리
- URL이 registry 한 곳에만 정의
- 글에서는 Topic ID만 사용

---

## PH-B-17 — Hub 큐레이션과 자동 목록 분리

- Original task: B-17
- Source message: e5772c7f-1398-4495-b5fa-a8ef0b26706d
- Status: pending

### Task details

Hub의 모든 콘텐츠를 수동으로 적으면 최신 글 반영이 어렵다.

반대로 전부 자동 생성하면 태그 페이지와 같아진다.

따라서 두 영역을 분리한다.

## 수동 큐레이션

```text
Start Here
Featured Guides
Core Concepts
```

## 자동 생성 가능

```text
Recently Updated
All Articles
Debug Notes
Experiments
```

이 방식이 균형이 좋다.

---

## PH-B-18 — Hub용 데이터 모델

- Original task: B-18
- Source message: e5772c7f-1398-4495-b5fa-a8ef0b26706d
- Status: pending

### Task details

초기 권장 모델:

```ts
interface TopicHubConfig {
  id: string;
  title: string;
  description: string;
  startHere: string[];
  featured: string[];
  sections: {
    title: string;
    description?: string;
    articles: string[];
  }[];
  relatedTopics: string[];
}
```

예:

```ts
export const PCIE_CXL_HUB = {
  id: "pcie-cxl",
  title: "PCIe & CXL",
  description: "...",
  startHere: [
    "pcie-device-initialization",
    "pcie-bar-sizing",
    "cxl-memory-address-mapping",
  ],
  featured: [
    "linux-pci-enumeration",
    "pcie-msix",
    "cxl-hdm-decoder",
  ],
};
```

복잡한 CMS는 필요 없다.

---

## PH-B-19 — 대표 문서 20개 선정

- Original task: B-19
- Source message: e5772c7f-1398-4495-b5fa-a8ef0b26706d
- Status: pending

### Task details

두 Hub를 만들면서 전체 사이트의 대표 문서 20개를 선정한다.

추천 배분:

```text
PCIe & CXL: 5개
Firmware & Bootloader: 5개
C++: 4개
GPU & CUDA: 3개
Linux & Systems: 3개
```

정확히 균등할 필요는 없다.

선정 시 다음을 기록한다.

```text
문서 ID
대표 Topic
문서 유형
현재 상태
왜 대표인가
보완이 필요한가
```

예:

| 문서 | Topic | 유형 | 상태 | 선정 이유 |
|---|---|---|---|---|
| PCIe BAR size probing | PCIe & CXL | Concept | Current | 다수 글의 선행 개념 |
| Linux PCI enumeration | PCIe & CXL | Source Walkthrough | Needs Review | 고유 소스 분석 |
| U-Boot driver model | Firmware | Guide | Current | Bootloader 핵심 구조 |

---

## PH-B-20 — 대표 문서 보완 우선순위

- Original task: B-20
- Source message: e5772c7f-1398-4495-b5fa-a8ef0b26706d
- Status: pending

### Task details

대표 문서라고 바로 홈에 노출하면 안 된다.

다음 순서로 검사한다.

```text
1. 기술적으로 현재도 유효한가
2. 제목과 description이 명확한가
3. 환경과 버전이 필요한가
4. 관련 글과 다음 경로가 있는가
5. 중복 문서와 역할이 겹치지 않는가
6. 모바일에서 코드·표가 정상인가
```

상태가 `needs-review`라면 보완 후 Featured로 올린다.

---

## PH-B-21 — 대표 문서 최소 metadata

- Original task: B-21
- Source message: e5772c7f-1398-4495-b5fa-a8ef0b26706d
- Status: pending

### Task details

대표 문서부터 다음을 갖춘다.

```yaml
type: guide
topic: pcie-cxl
status: current
updated: 2026-08-01
```

실제로 검증했다면:

```yaml
lastVerified: 2026-08-01
```

하지만 단순 문장 수정만 했다면 `lastVerified`를 바꾸지 않는다.

---

## PH-B-22 — 대표 문서 상단 UI

- Original task: B-22
- Source message: e5772c7f-1398-4495-b5fa-a8ef0b26706d
- Status: pending

### Task details

대표 글 상단에는 정보가 너무 많아지지 않도록 다음만 우선 표시한다.

```text
Content Type
Primary Topic
Status
Updated
```

환경 정보가 중요한 글은 별도 compact 영역:

```text
Tested on
Linux 6.x
GCC 13
U250 / XRT 2.13
```

모든 글에 같은 환경 필드를 강제하지 않는다.

---

## PH-B-23 — 대표 문서 하단 UI

- Original task: B-23
- Source message: e5772c7f-1398-4495-b5fa-a8ef0b26706d
- Status: pending

### Task details

추천 구조:

```text
상위 Topic
필요한 선행 개념
다음에 읽을 글
관련 실전 사례
```

예:

```text
상위 주제
PCIe & CXL

선행 개념
PCIe Configuration Space

다음 단계
MSI-X 설정 흐름

실전 사례
U250 BAR mmap 실패 분석
```

`관련 글 8개` 같은 단순 카드 목록보다 역할 기반 링크가 낫다.

---

## PH-B-24 — Hub와 태그 페이지 관계

- Original task: B-24
- Source message: e5772c7f-1398-4495-b5fa-a8ef0b26706d
- Status: pending

### Task details

기존 태그 페이지를 모두 제거할 필요는 없다.

## Topic Hub

```text
편집된 구조
설명
학습 순서
대표 글
```

## Tag page

```text
해당 태그를 가진 글의 전체 목록
```

중요한 주제는 Topic Hub가 canonical 탐색 페이지가 되고, 태그 페이지는 보조 목록으로 남긴다.

SEO 관점에서 둘이 거의 같은 내용이라면 태그 페이지 색인 필요성을 검토한다.

---

## PH-B-25 — Hub 페이지 컴포넌트 구조

- Original task: B-25
- Source message: e5772c7f-1398-4495-b5fa-a8ef0b26706d
- Status: pending

### Task details

권장:

```text
TopicHero
StartHereList
TopicSection
FeaturedGuideList
RelatedTopicLinks
```

피해야 할 구조:

```text
PCIeHubPage
CXLHubPage
FirmwareHubPage
UbootHubPage
```

각 Hub마다 별도 페이지 컴포넌트를 복제하지 않는다.

공통 템플릿과 데이터 config로 구성한다.

---

## PH-B-26 — Hub의 접근성과 모바일

- Original task: B-26
- Source message: e5772c7f-1398-4495-b5fa-a8ef0b26706d
- Status: pending

### Task details

## 모바일

- 2열·3열 카드 강제 금지
- Start Here 순서를 명확히 표시
- 긴 설명은 2~3줄 이내
- 섹션이 너무 많으면 접지 말고 우선순위를 줄임

## 접근성

- Topic 카드 전체를 올바른 링크로 구현
- 섹션 제목 계층 유지
- 순서가 있는 학습 경로는 `<ol>`
- 단순 관련 목록은 `<ul>`
- 색만으로 유형 구분하지 않음

---

## PH-B-27 — Hub 성능 기준

- Original task: B-27
- Source message: e5772c7f-1398-4495-b5fa-a8ef0b26706d
- Status: pending

### Task details

Topic Hub는 정적 페이지여야 한다.

```text
클라이언트 hydration 없음
검색 인덱스 전체 로드 없음
무거운 그래프 없음
외부 API 호출 없음
```

글 목록과 metadata는 build time에 생성한다.

이미지 없이도 충분히 좋은 Hub를 만들 수 있다.

---

## PH-B-28 — Epic B 완료 기준

- Original task: B-28
- Source message: e5772c7f-1398-4495-b5fa-a8ef0b26706d
- Status: pending

### Task details

## 구조

```text
PCIe & CXL Hub 1개
Firmware & Bootloader Hub 1개
공통 Topic Hub 템플릿
Topic registry
```

## 콘텐츠

```text
각 Hub Start Here 3개 이하
각 Hub Featured 4~6개
대표 문서 전체 20개 선정
```

## 연결

```text
홈 Core Topics에서 Hub 연결
대표 문서에서 Hub backlink
Hub에서 관련 Topic 연결
```

## 품질

```text
구판 Featured 없음
깨진 링크 없음
모바일 레이아웃 확인
모든 Hub에 고유 description 존재
```

---

## PH-CPM-01 — Content Domain 타입

- Original task: CPM-01
- Source message: e720b385-bb03-4aeb-a750-4ebcfb296b96
- Status: pending

### Task details

```text
ContentType
ContentStatus
ContentDocument
ContentRelations
TestedEnvironment
```

## PH-CPM-02 — Raw Entry Normalizer

- Original task: CPM-02
- Source message: e720b385-bb03-4aeb-a750-4ebcfb296b96
- Status: pending

### Task details

```text
Astro entry
→ ContentDocument
```

## PH-CPM-03 — Content Manifest

- Original task: CPM-03
- Source message: e720b385-bb03-4aeb-a750-4ebcfb296b96
- Status: pending

### Task details

```text
documents
byId
byUrl
byTopic
```

## PH-CPM-04 — 필수 Validation

- Original task: CPM-04
- Source message: e720b385-bb03-4aeb-a750-4ebcfb296b96
- Status: pending

### Task details

```text
중복 ID
중복 URL
잘못된 Topic
없는 relation
자기 참조
```

## PH-CPM-05 — Publication Policy

- Original task: CPM-05
- Source message: e720b385-bb03-4aeb-a750-4ebcfb296b96
- Status: pending

### Task details

```text
current
needs-review
historical
superseded
archived
draft
```

## PH-CPM-06 — Featured Validation

- Original task: CPM-06
- Source message: e720b385-bb03-4aeb-a750-4ebcfb296b96
- Status: pending

### Task details

```text
current만 허용
```

## PH-CPM-07 — Search·Sitemap Adapter

- Original task: CPM-07
- Source message: e720b385-bb03-4aeb-a750-4ebcfb296b96
- Status: pending

### Task details

동일 Policy 결과를 사용한다.

## PH-CPM-08 — 테스트

- Original task: CPM-08
- Source message: e720b385-bb03-4aeb-a750-4ebcfb296b96
- Status: pending

### Task details

```text
상태 Matrix
중복 ID
없는 relation
Featured historical 차단
Draft production 제외
```

---

