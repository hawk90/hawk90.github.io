---
title: "실행 페이즈 및 작업 항목"
source: "archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/page.html"
generated_at: 2026-08-01T07:38:34.968Z
---

# 실행 페이즈 및 작업 항목

<!-- source message: 44 -->

## B-01. Topic Hub의 역할 정의

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

<!-- source message: 44 -->

# B-02. 공통 Hub 페이지 구조

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

<!-- source message: 44 -->

# B-03. `PCIe & CXL` Hub 생성

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

<!-- source message: 44 -->

# B-04. `PCIe & CXL` 하위 구조

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

<!-- source message: 44 -->

# B-05. `PCIe & CXL` Start Here

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

<!-- source message: 44 -->

# B-06. `PCIe & CXL` 대표 글 선정 기준

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

<!-- source message: 44 -->

# B-07. `PCIe & CXL` 문서 역할 분류

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

<!-- source message: 44 -->

# B-08. `PCIe & CXL` 기존 글 배치 작업

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

<!-- source message: 44 -->

# B-09. `PCIe & CXL` 중복 후보 분석

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

<!-- source message: 44 -->

# B-10. `PCIe & CXL` Hub 완료 조건

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

<!-- source message: 44 -->

# B-11. `Firmware & Bootloader` Hub 생성

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

<!-- source message: 44 -->

# B-12. `Firmware & Bootloader` 하위 구조

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

<!-- source message: 44 -->

# B-13. `Firmware & Bootloader` Start Here

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

<!-- source message: 44 -->

# B-14. `Firmware & Bootloader` Featured 역할

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

<!-- source message: 44 -->

# B-15. Firmware와 PCIe Hub의 경계

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

<!-- source message: 44 -->

# B-16. Topic registry 생성

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

<!-- source message: 44 -->

# B-17. Hub 큐레이션과 자동 목록 분리

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

<!-- source message: 44 -->

# B-18. Hub용 데이터 모델

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

<!-- source message: 44 -->

# B-19. 대표 문서 20개 선정

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

<!-- source message: 44 -->

# B-20. 대표 문서 보완 우선순위

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

<!-- source message: 44 -->

# B-21. 대표 문서 최소 metadata

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

<!-- source message: 44 -->

# B-22. 대표 문서 상단 UI

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

<!-- source message: 44 -->

# B-23. 대표 문서 하단 UI

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

<!-- source message: 44 -->

# B-24. Hub와 태그 페이지 관계

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

<!-- source message: 44 -->

# B-25. Hub 페이지 컴포넌트 구조

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

<!-- source message: 44 -->

# B-26. Hub의 접근성과 모바일

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

<!-- source message: 44 -->

# B-27. Hub 성능 기준

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

<!-- source message: 44 -->

# B-28. Epic B 완료 기준

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

# Epic B 우선순위 요약

| ID | 작업 | 우선순위 | 난도 | 효과 |
|---|---|---:|---:|---:|
| B-01 | Hub 역할·공통 구조 정의 | P0 | 낮음 | 높음 |
| B-03 | PCIe & CXL Hub 생성 | P0 | 중간 | 매우 높음 |
| B-05 | PCIe & CXL Start Here | P0 | 중간 | 매우 높음 |
| B-09 | PCIe/CXL 중복 후보 분석 | P1 | 중간 | 높음 |
| B-11 | Firmware & Bootloader Hub 생성 | P0 | 중간 | 매우 높음 |
| B-13 | Firmware Start Here | P0 | 중간 | 높음 |
| B-16 | Topic registry | P0 | 낮음 | 높음 |
| B-17 | 수동·자동 큐레이션 분리 | P1 | 중간 | 높음 |
| B-19 | 대표 문서 20개 선정 | P0 | 중간 | 매우 높음 |
| B-21 | 대표 문서 최소 metadata | P1 | 중간 | 높음 |
| B-23 | 역할 기반 다음 글 UI | P1 | 중간 | 높음 |
| B-25 | 공통 Hub 템플릿 | P1 | 중간 | 중간 |

---

# 두 번째 실제 실행 묶음

가장 현실적인 첫 배포 단위는 다음이다.

```text
1. Topic registry 생성
2. PCIe & CXL Hub 초안
3. Firmware & Bootloader Hub 초안
4. 각 Hub에 Start Here 3개 선정
5. Featured 문서 총 8개 선정
6. 홈 Core Topics에서 두 Hub 연결
```

이 단계에서는 모든 기존 글에 metadata를 넣지 않아도 된다.

먼저 대표 문서와 Hub만 연결한다.

> 전체 콘텐츠를 구조화한 뒤 Hub를 공개하는 것이 아니라, Hub를 먼저 만들고 핵심 글부터 점진적으로 편입하는 편이 현실적이다.

다음 단계는 **Task 3-3. 콘텐츠 신뢰성·상태·대표 글 보완 백로그**다. 대표 글 20개에 `type`, `status`, `updated`, `lastVerified`, 테스트 환경, 근거·관찰·가설 구분을 어떻게 적용할지 실제 작업 단위로 정리한다.

<!-- source message: 47 -->

## E-01. 빌드 단계별 기준선 측정

현재는 전체 빌드가 느리거나 heap을 많이 사용하더라도 어느 단계가 원인인지 분명하지 않을 수 있다.

전체 시간만 기록해서는 다음을 구분할 수 없다.

```text
Markdown 파싱
Shiki 하이라이팅
검색 인덱스
OG 이미지
SVG·다이어그램
링크 검사
Astro 페이지 생성
```

## 작업

각 주요 단계의 시작·종료 시간과 처리량을 기록한다.

```text
단계 이름
처리 문서 수
처리 코드 블록 수
소요 시간
메모리 변화
생성 파일 크기
```

## 예시 출력

```text
[content] 532 documents parsed in 4.2s
[highlight] 8,412 code blocks processed in 31.8s
[search] 532 records generated in 2.1s
[og] 12 assets regenerated in 6.3s
[astro] 711 pages rendered in 18.4s
```

## 메모리 측정

최소한 다음을 기록한다.

```text
시작 RSS
단계 종료 RSS
Peak RSS
Node heap used
```

정밀 profiler를 처음부터 만들 필요는 없다. `process.memoryUsage()`와 CI 시간 기록만으로도 1차 병목을 찾을 수 있다.

## 완료 조건

- 전체 빌드 시간이 단계별로 나뉨
- 가장 느린 상위 3개 단계가 확인됨
- Peak memory가 어느 단계에서 증가하는지 확인됨
- 문서 수와 코드 블록 수가 함께 기록됨

## 우선순위

```text
P0
```

---

<!-- source message: 47 -->

# E-02. 빌드 명령 역할 분리

하나의 `build` 명령이 모든 감사와 생성 작업을 실행하면 로컬 반복 속도가 지나치게 느려진다.

## 권장 명령

```text
dev
check
build
build:release
audit
```

## 역할

### `dev`

```text
로컬 개발 서버
변경 콘텐츠 중심
무거운 전체 감사 제외
```

### `check`

```text
TypeScript
콘텐츠 schema
내부 링크
relation integrity
slug uniqueness
```

### `build`

```text
일반 production 정적 빌드
필수 생성 작업
```

### `build:release`

```text
production build
검색 인덱스
Sitemap
RSS
필수 OG
배포 smoke test
```

### `audit`

```text
전체 외부 링크
중복 후보
오래된 문서
대형 이미지
전체 콘텐츠 품질 리포트
```

## 핵심 원칙

```text
정확성을 위해 반드시 필요한 검사
≠
매번 실행해야 하는 검사
```

## 완료 조건

- 오탈자 수정에 전체 외부 링크 검사가 실행되지 않음
- 로컬에서도 CI와 동일한 필수 검사 실행 가능
- `build`와 `audit`의 실패 의미가 구분됨
- 배포에 필요한 작업은 `build:release` 한 명령으로 재현 가능

## 우선순위

```text
P0
```

---

<!-- source message: 47 -->

# E-03. 공통 Content Manifest 생성

현재 가장 큰 구조적 개선 후보다.

검색 생성기, 링크 검사기, Topic Hub, RSS, Sitemap이 각각 Markdown을 읽고 있다면 같은 콘텐츠를 여러 번 파싱하게 된다.

## 목표 구조

```text
Markdown files
      ↓
Content Manifest
      ↓
Pages / Search / RSS / Sitemap / Graph / Audits
```

## Manifest 예시

```ts
interface ContentManifestEntry {
  id: string;
  sourcePath: string;
  slug: string;
  url: string;

  title: string;
  description: string;
  published: string;
  updated?: string;
  lastVerified?: string;

  topic?: string;
  type?: string;
  status: string;

  headings: {
    id: string;
    text: string;
    depth: number;
  }[];

  internalLinks: string[];
  symbols: string[];
  errorMessages: string[];

  contentHash: string;
}
```

## Manifest에 넣지 않을 것

```text
전체 Markdown AST
전체 syntax token
전체 렌더링 HTML
모든 코드 블록 원문
전체 이미지 binary
```

공통 데이터는 유지하되 대형 중간 객체는 빌드 끝까지 보관하지 않는다.

## 완료 조건

- 콘텐츠 파싱 진입점이 한 곳으로 통합됨
- 검색·Sitemap·RSS가 동일한 공개 정책을 사용함
- 문서마다 안정적인 `contentHash`가 생성됨
- AST는 필요한 단계 이후 해제됨

## 우선순위

```text
P0
```

## 예상 난도

```text
높음
```

하지만 이후의 검색·링크·증분 빌드를 모두 단순화하기 때문에 수익률이 크다.

---

<!-- source message: 47 -->

# E-04. Publication Policy 중앙화

현재 각 생성기가 다음을 각각 판단하면 안 된다.

```text
이 글은 공개하는가?
검색에 넣는가?
Sitemap에 넣는가?
RSS에 넣는가?
Hub에 노출하는가?
```

## 권장 함수

```ts
interface PublicationDecision {
  render: boolean;
  index: boolean;
  includeInSearch: boolean;
  includeInSitemap: boolean;
  includeInRss: boolean;
  includeInHubLists: boolean;
}

function getPublicationDecision(
  entry: ContentManifestEntry,
  environment: "development" | "production"
): PublicationDecision
```

## 예시 정책

```text
draft
→ production render 제외

current
→ 모든 일반 출력 포함

needs-review
→ render/search/sitemap 포함, Featured 제외

historical
→ render/search 포함, ranking 감점

superseded
→ render 가능, 일반 추천·Featured 제외

archived
→ 직접 URL만 유지하거나 일반 목록 제외
```

## 완료 조건

- 검색과 Sitemap의 문서 집합이 충돌하지 않음
- Draft가 어느 생성물에도 새지 않음
- 상태 정책 변경이 한 곳에서 가능
- 각 컴포넌트가 상태 분기 로직을 다시 구현하지 않음

## 우선순위

```text
P0
```

---

<!-- source message: 47 -->

# E-05. Markdown 다중 파싱 제거

## 탐지 방법

코드베이스에서 다음 패턴을 찾는다.

```text
glob Markdown
gray-matter parse
remark parse
getCollection 반복 호출
본문 문자열 재처리
```

도구마다 별도로 파일을 순회하고 있다면 공통 manifest로 이동한다.

## 허용되는 예외

실제 렌더링용 AST와 검색용 metadata 추출은 요구가 다를 수 있다.

그러나 최소한:

```text
front matter
URL
상태
Topic
heading
링크
hash
```

는 한 번만 추출한다.

## 완료 조건

- 동일 문서의 metadata 파싱 횟수가 한 빌드에서 최소화됨
- 링크 검사기가 Markdown 파일을 다시 읽지 않음
- Topic Hub가 별도로 front matter를 재해석하지 않음

## 우선순위

```text
P0
```

---

<!-- source message: 47 -->

# E-06. AST 생명주기 제한

모든 글의 AST를 배열에 저장하면 콘텐츠가 증가할수록 Peak RSS가 커진다.

## 나쁜 흐름

```text
전체 문서 읽기
→ 전체 AST 보관
→ 모든 transformation
→ 모든 출력 완료 후 해제
```

## 권장 흐름

```text
문서 1개 읽기
→ 필요한 metadata 추출
→ 렌더 또는 중간 파일 생성
→ AST 해제
→ 다음 문서
```

일부 전역 분석에는 전체 문서 정보가 필요하지만, 이때도 전체 AST가 아니라 작은 manifest만 사용한다.

## 완료 조건

- 전역 배열에 Markdown AST나 syntax token이 없음
- 문서 처리 후 참조가 제거됨
- Peak RSS가 문서 수에 거의 선형으로 증가하지 않음
- heap 확대 없이 빌드가 가능한지 재검토됨

## 우선순위

```text
P0
```

---

<!-- source message: 47 -->

# E-07. Shiki 처리량 측정

코드 블록이 많은 기술 블로그에서는 syntax highlighting이 가장 큰 병목일 가능성이 있다.

## 먼저 측정할 것

```text
전체 코드 블록 수
언어별 코드 블록 수
평균 코드 길이
상위 20개 대형 코드 블록
하이라이팅 총 시간
생성 HTML 크기
```

## 언어 분포 예시

```text
cpp: 3,200
c: 1,850
bash: 1,100
text: 980
python: 430
rust: 310
unknown: 74
```

이 자료가 있어야 어떤 grammar를 실제로 유지할지 판단할 수 있다.

## 완료 조건

- 사용 언어 분포가 확인됨
- `text`, 로그, 출력이 코드 하이라이팅 대상과 구분됨
- 상위 대형 코드 블록이 식별됨
- Shiki가 전체 빌드에서 차지하는 비율이 측정됨

## 우선순위

```text
P0
```

---

<!-- source message: 47 -->

# E-08. 코드 블록 역할 분리

현재 모든 fenced block이 코드로 취급된다면 다음도 syntax highlighting을 받을 수 있다.

```text
터미널 출력
커널 로그
디렉터리 구조
레지스터 덤프
ASCII 다이어그램
설정 결과
```

## 권장 role

```text
source
command
output
log
dump
text
```

Markdown metadata 예시:

````markdown
```bash role="command"
cmake --build build
```

```text role="output"
[100%] Built target analyzer
```

```text role="log"
pci 0000:01:00.0: BAR 0: assigned
```
````

## 처리 정책

| 역할 | Highlight | 검색 symbol 추출 | 기본 wrap |
|---|---|---|---|
| source | 예 | 예 | 아니오 |
| command | 예 | 제한적 | 아니오 |
| output | 아니오 또는 최소 | 아니오 | 선택 |
| log | 아니오 또는 최소 | 오류만 | 선택 |
| dump | 아니오 | 아니오 | 아니오 |
| text | 아니오 | 아니오 | 예 |

## 완료 조건

- 로그와 출력이 무거운 grammar를 사용하지 않음
- 검색 인덱스에 전체 로그가 들어가지 않음
- UI에서 명령과 출력이 구분됨
- 기존 콘텐츠는 기본값으로 계속 렌더링 가능

## 우선순위

```text
P1
```

---

<!-- source message: 47 -->

# E-09. Shiki 언어 Allowlist

사용하지 않는 언어 grammar까지 모두 로드할 필요가 없다.

## 작업

실제 언어 통계를 기준으로 allowlist를 만든다.

```ts
const SUPPORTED_LANGUAGES = [
  "c",
  "cpp",
  "bash",
  "python",
  "rust",
  "toml",
  "yaml",
  "json",
  "cmake",
  "asm",
  "text",
] as const;
```

## Alias 정규화

```text
c++ → cpp
cxx → cpp
shell → bash
sh → bash
plaintext → text
console → text 또는 shell-session
```

## 미등록 언어

무거운 자동 감지 대신 `text`로 fallback하고 warning을 남긴다.

```text
Unknown code language "cuu" in post X; rendered as text.
```

## 완료 조건

- grammar 로드 목록이 명시적
- alias가 한 곳에서 관리됨
- 오타가 빌드 메모리를 예측 불가능하게 늘리지 않음
- 사용하지 않는 grammar가 제거됨

## 우선순위

```text
P1
```

---

<!-- source message: 47 -->

# E-10. 코드 하이라이팅 캐시

동일한 코드와 동일한 테마·옵션이면 결과도 동일하다.

## Cache key

```text
hash(
  code
  + canonicalLanguage
  + themeVersion
  + pluginOptions
)
```

## 저장 대상

```text
highlighted HTML
또는
필요한 token 결과
```

## 주의

캐시는 정확한 무효화 정책 없이 도입하면 stale 결과를 만든다.

다음이 바뀌면 무효화해야 한다.

```text
Shiki 버전
테마
코드 옵션
line highlighting metadata
renderer version
```

## 적용 우선순위

1차 개선에서 캐시를 바로 구현하지 않아도 된다.

먼저:

```text
로그 highlighting 제거
grammar 축소
대형 전체 소스 분리
```

를 적용한다.

그 이후에도 Shiki가 주 병목이면 캐시를 추가한다.

## 완료 조건

- cache key에 renderer version 포함
- cache miss/hit 수가 측정됨
- 캐시 삭제 후에도 전체 재생성 가능
- 캐시가 Git 원본으로 취급되지 않음

## 우선순위

```text
P2
```

---

<!-- source message: 47 -->

# E-11. 대형 코드 블록 감사

하이라이팅 비용과 페이지 DOM을 동시에 줄이는 작업이다.

## 리포트

```text
문서
heading
language
line count
character count
generated HTML size
```

## 검토 기준

다음은 분리 후보다.

```text
200줄 이상
설명 없이 전체 파일 삽입
본문에서 일부만 참조
동일 코드가 여러 글에 중복
```

## 개선 방법

```text
핵심 부분만 본문에 포함
생략부 명시
전체 소스는 GitHub permalink
함수 단위로 분할
```

## 주의

길다고 무조건 제거하지 않는다. Source Walkthrough에서 전체 문맥이 필요한 경우도 있다.

## 완료 조건

- 상위 20개 대형 코드 블록 검토
- 불필요한 전체 파일 삽입 축소
- 본문 코드와 외부 전체 소스 역할 구분
- 검색 인덱스와 DOM 크기 감소 확인

## 우선순위

```text
P1
```

---

<!-- source message: 47 -->

# E-12. 변경 파일 인식

모든 작업을 완전 증분화하기 전에, 최소한 변경 범위를 인식하도록 한다.

## 변경 입력

```text
Git diff
content hash
generator config hash
```

## 변경 파일 기반으로 처리 가능한 작업

```text
front matter validation
OG 이미지
이미지 경로 검사
문서별 검색 레코드
내부 outgoing link 검사
다이어그램 생성
```

## 전체 검사가 필요한 작업

```text
slug uniqueness
전체 relation integrity
redirect cycle
Sitemap 병합
검색 인덱스 최종 병합
```

## 완료 조건

- 변경 문서 목록을 한 번 계산해 여러 단계가 공유
- 문서별 작업과 전역 작업이 구분됨
- main release에서는 필요한 전체 불변조건을 계속 검사

## 우선순위

```text
P1
```

---

<!-- source message: 47 -->

# E-13. 문서별 파생 레코드 생성

검색 인덱스 전체를 매번 처음부터 만드는 대신 문서별 레코드를 생성할 수 있다.

```text
.cache/search/<content-id>.json
```

## 재생성 조건

```text
contentHash 변경
search schema 변경
alias registry 변경
extractor version 변경
```

마지막에는 공개 가능한 레코드만 병합한다.

```text
문서별 레코드
→ publication filter
→ search-index.json
```

## 장점

- 글 하나 수정 시 추출 비용 감소
- 삭제 문서 식별 가능
- 검색 생성 문제를 문서 단위로 디버깅 가능

## 주의

최종 병합 자체는 전체 문서 집합을 확인해야 한다.

## 우선순위

```text
P1
```

---

<!-- source message: 47 -->

# E-14. OG 이미지 증분 생성

모든 글의 OG 이미지를 매번 다시 만들 필요는 없다.

## 입력 hash

```text
문서 제목
부제목
Topic
작성자
템플릿 버전
폰트 버전
생성기 버전
```

이미지 파일의 존재만으로 재사용하지 말고 입력 hash를 비교한다.

## Manifest 예시

```json
{
  "pcie-bar-sizing": {
    "inputHash": "abc123",
    "output": "pcie-bar-sizing.png",
    "generatorVersion": "2"
  }
}
```

## 필수와 선택 구분

### 필수 OG

```text
홈
Topic Hub
Featured Guide
```

### 선택 OG

일반 글은 생성 실패 시 기본 공유 이미지를 사용할 수 있다.

## 완료 조건

- 변경된 문서만 OG 재생성
- 제목 변경이 반드시 자산 갱신으로 이어짐
- 삭제 글의 전용 OG가 정리됨
- 생성 실패가 조용히 무시되지 않음

## 우선순위

```text
P1
```

---

<!-- source message: 47 -->

# E-15. 다이어그램 파이프라인 격리

TikZ·LaTeX·Graphviz 같은 도구를 모든 production build의 필수 경로에 두면 환경 재현성이 낮아진다.

## 권장 구조

```text
diagram source
→ 별도 generate command
→ optimized SVG
→ 일반 Astro build가 SVG 사용
```

## 실행 조건

```text
source hash 변경
generator version 변경
명시적 전체 재생성
```

## PR 정책

외부 기여가 가능하다면 위험한 generator를 고권한 배포 job에서 직접 실행하지 않는다.

## 완료 조건

- 일반 텍스트 수정은 LaTeX 설치 없이 빌드 가능
- 변경된 다이어그램만 재생성
- source와 output 관계가 manifest에 존재
- 생성 결과가 없을 때 오류 또는 명확한 fallback

## 우선순위

```text
P1
```

---

<!-- source message: 47 -->

# E-16. 이미지 처리 정책

모든 이미지를 매번 다시 최적화하지 않는다.

## 원본과 파생물

```text
assets/source/
assets/generated/
```

또는 논리적으로라도 구분한다.

## 입력 hash

```text
원본 파일 hash
출력 크기
format
quality
transformer version
```

## 문서별 검사

변경된 문서의 이미지에 대해서만:

```text
존재 여부
width·height
대형 파일
alt 후보
```

를 확인한다.

전체 미사용 이미지 감사는 정기 작업으로 돌린다.

## 우선순위

```text
P1
```

---

<!-- source message: 47 -->

# E-17. CI Job 분리

## 권장 파이프라인

### Job 1: Fast validation

```text
install
schema
internal links
relations
typecheck
```

### Job 2: Build

```text
production build
search
RSS
Sitemap
required assets
```

### Job 3: Smoke test

```text
generated dist serve
대표 URL 확인
대표 asset 확인
검색 JSON parse
```

### Job 4: Deploy

```text
artifact 다운로드
GitHub Pages 배포만 수행
```

## 핵심 보안·성능 효과

- build job는 `contents: read`
- deploy job만 최소 write 권한
- build를 여러 job에서 반복하지 않음
- 생성 artifact를 재사용

## 완료 조건

- 배포 job가 dependency build를 다시 실행하지 않음
- 테스트한 artifact와 배포 artifact가 동일
- deploy 권한이 build script에 노출되지 않음
- 실패 단계가 명확히 구분됨

## 우선순위

```text
P0
```

---

<!-- source message: 47 -->

# E-18. Dependency 설치 캐시

캐시부터 최적화하기 전에 lockfile 기반 재현성을 먼저 확보한다.

## Cache key 후보

```text
OS
Node major
package manager version
lockfile hash
```

## 캐시 대상

package manager가 권장하는 다운로드 캐시를 우선한다.

`node_modules` 전체 캐시는 환경 차이로 문제를 만들 수 있으므로 도구 권장 방식에 따른다.

## 완료 조건

- lockfile 변경 시 캐시 무효화
- Node 버전 변경 시 캐시 분리
- cache hit 여부가 CI 로그에 나타남
- 캐시를 지워도 정상 빌드 가능

## 우선순위

```text
P1
```

---

<!-- source message: 47 -->

# E-19. 동일 작업의 Job 간 중복 제거

다음 구조는 피한다.

```text
test job: install + full build
build job: install + full build
deploy job: install + full build
```

## 권장

```text
validation
+
한 번의 release build
+
artifact 기반 smoke test·deploy
```

필요한 경우 validation job는 작은 fixture 또는 manifest 검사만 수행한다.

## 완료 조건

- 전체 Astro build는 파이프라인에서 한 번
- 검색 인덱스도 한 번 생성
- OG와 다이어그램이 여러 job에서 반복 생성되지 않음

## 우선순위

```text
P0
```

---

<!-- source message: 47 -->

# E-20. 메모리 증설을 완료 조건으로 삼지 않기

현재 `--max-old-space-size=8192` 같은 설정이 있다면 즉시 제거할 필요는 없다.

먼저 안전망으로 유지하면서 원인을 줄인다.

## 개선 순서

```text
1. 단계별 측정
2. AST retention 제거
3. Markdown 다중 파싱 제거
4. Shiki 범위 축소
5. 파생 작업 증분화
6. 그 후 heap 설정 재평가
```

## 완료 기준

다음 중 하나가 되어야 한다.

```text
8GB 설정 없이 안정적 빌드
또는
큰 heap이 필요한 정확한 이유가 문서화됨
```

## 피해야 할 판단

```text
빌드 성공
→ 메모리 문제 해결
```

GC 시간이 길어지고 CI 사양 의존성이 커졌다면 해결된 것이 아니다.

---

<!-- source message: 47 -->

# E-21. 빌드 예산 설정

현재 기준선을 측정한 다음 현실적인 예산을 정한다.

## 예산 항목

```text
Fast validation 시간
Release build 시간
Peak RSS
검색 인덱스 압축 크기
전체 JS
대표 글 HTML 크기
dist 총량
```

## 예시

수치는 측정 후 정해야 하지만 형태는 다음과 같다.

```text
Fast validation: 30초 이내
Release build p95: 현재 기준 +10% 이내
Peak RSS: 4GB 이하
Search index gzip: 500KB 이하
Homepage JS: 기존 대비 증가 없음
```

## 중요

임의의 이상적인 수치를 먼저 정하지 않는다.

```text
현재 baseline
→ 허용 회귀율
→ 점진적 목표
```

순서로 정한다.

## 우선순위

```text
P1
```

---

<!-- source message: 47 -->

# E-22. 빌드 회귀 리포트

각 release build에 다음을 artifact로 남긴다.

```json
{
  "commit": "abc123",
  "documents": 532,
  "pages": 711,
  "codeBlocks": 8412,
  "durationMs": 62800,
  "peakRssMb": 3410,
  "searchIndexBytes": 412880,
  "distBytes": 184220000
}
```

## 비교 규칙

```text
빌드 시간 +20%
Peak RSS +20%
검색 인덱스 +20%
JS +15%
```

같은 변화가 발생하면 경고한다.

처음부터 배포를 차단하지 말고 추세를 관찰한 뒤 기준을 강화한다.

## 완료 조건

- 최근 build와 이전 build 비교 가능
- 콘텐츠 증가와 성능 회귀를 구분 가능
- 급격한 변화가 로그에서 바로 보임

## 우선순위

```text
P1
```

---

<!-- source message: 47 -->

# E-23. 대표 복잡도 페이지 Canary 선정

전체 평균만으로는 극단적으로 무거운 글 문제를 찾기 어렵다.

## Canary 후보

```text
코드 블록이 가장 많은 글
표가 가장 넓은 글
다이어그램이 가장 많은 글
수식이 많은 글
일반 대표 Guide
```

## 검사 항목

```text
HTML 크기
DOM node 수
render 시간
모바일 스크롤
코드 가로 overflow
TOC 길이
```

## 완료 조건

- 3~5개 canary 페이지 고정
- 주요 UI·빌드 변경에서 반복 검증
- 가장 깨끗한 글만 테스트하지 않음

## 우선순위

```text
P1
```

---

<!-- source message: 47 -->

# E-24. 배포 결과 Smoke Test

빌드 성공 뒤 실제 `dist`를 로컬 서버로 열어 검사한다.

## 최소 URL

```text
/
대표 Guide
PCIe & CXL Hub
Firmware & Bootloader Hub
검색 페이지
404
```

## 검사

```text
HTTP 200 또는 예상 상태
title 존재
canonical 존재
H1 하나
주요 CSS·JS 로드
검색 JSON parse
대표 이미지 존재
내부 핵심 링크 유효
```

## 완료 조건

- source가 아니라 최종 `dist` 검사
- GitHub Pages의 실제 base path 조건 반영
- 배포 전 자동 실행
- 외부 광고·댓글 실패는 본문 성공에 영향 없음

## 우선순위

```text
P0
```

---

<!-- source message: 47 -->

# E-25. 실패 등급 분리

모든 감사가 release blocker가 되면 결국 검사를 끄게 된다.

## Error

```text
schema 불일치
중복 URL
없는 내부 문서
필수 asset 누락
검색 JSON 생성 실패
production build 실패
```

## Warning

```text
description 누락
대형 코드 블록
오래된 외부 링크
needs-review 장기 방치
대형 이미지
```

## Info

```text
새로운 alias 후보
중복 가능성
Hub 편입 후보
읽기 환경 보완 제안
```

## 완료 조건

- 각 rule의 severity가 명시됨
- Warning만으로 배포가 막히지 않음
- 중요한 오류가 수백 개 warning에 묻히지 않음

## 우선순위

```text
P0
```

---

<!-- source message: 47 -->

# E-26. 외부 링크 검사를 정기 작업으로 이동

외부 URL은 일시 장애와 rate limit 때문에 CI를 불안정하게 만든다.

## 매 변경마다

```text
내부 링크
내부 anchor
문서 ID
redirect target
```

## 주간 또는 월간

```text
외부 링크
최종 redirect
HTTP 상태
반복 실패
```

## 결과 정책

```text
1회 실패 → 기록
연속 실패 → warning
핵심 출처 반복 실패 → 수동 검토
```

## 완료 조건

- 외부 네트워크 장애가 일반 배포를 막지 않음
- 반복 실패 링크는 추적됨
- 핵심 사양·소스 링크는 높은 우선순위로 표시됨

## 우선순위

```text
P1
```

---

<!-- source message: 47 -->

# E-27. 로컬 Fast Path

콘텐츠 한 문장을 수정할 때 전체 검색·OG·외부 감사를 기다리면 작업 흐름이 나빠진다.

## 로컬 기본 흐름

```text
Astro dev
변경 문서 schema
변경 문서 링크
필요한 렌더링만
```

## 명시적으로 실행

```text
npm run check
npm run build:release
npm run audit
```

## 완료 조건

- 일반 글 편집이 무거운 파이프라인을 자동 실행하지 않음
- push 전 필수 검사는 한 명령으로 수행 가능
- release 결과와 로컬 빠른 경로의 역할 차이가 문서화됨

## 우선순위

```text
P1
```

---

<!-- source message: 47 -->

# E-28. 빌드 환경 고정

재현성 없는 빌드는 성능 측정도 신뢰할 수 없다.

## 고정할 것

```text
Node 버전
package manager 버전
lockfile
Python 버전
다이어그램 도구 버전
locale
timezone
```

## 특히 날짜

게시일과 Sitemap 날짜가 CI timezone에 따라 달라지지 않게 한다.

```text
Asia/Seoul로 표시할 것
UTC로 저장할 것
```

중 하나를 명확히 결정한다.

## 완료 조건

- 로컬과 CI의 주요 버전이 일치
- 빌드 결과가 실행 locale에 따라 달라지지 않음
- 같은 commit에서 불필요한 생성 diff가 발생하지 않음

## 우선순위

```text
P0
```

---

<!-- source message: 47 -->

# E-29. 생성물 Source of Truth 명확화

## Source

```text
Markdown
Topic registry
Hub config
alias registry
diagram source
redirect manifest
```

## Derived

```text
검색 인덱스
Sitemap
RSS
OG 이미지
optimized SVG
content graph
```

Derived data는 언제든 재생성 가능해야 한다.

## 완료 조건

- 생성 파일을 수동 수정하지 않음
- 생성물에 generator version과 input hash 존재
- source와 artifact 디렉터리가 구분됨
- stale artifact를 manifest 기준으로 정리 가능

## 우선순위

```text
P0
```

---

<!-- source message: 47 -->

# E-30. 성능 최적화 종료 조건

최적화가 끝없이 이어지면 안 된다.

이번 Epic은 다음이 충족되면 1차 완료로 본다.

```text
병목 단계가 측정된다
공통 manifest가 존재한다
중복 Markdown 파싱이 줄었다
Shiki 범위가 정리됐다
빌드·감사 명령이 분리됐다
검색·OG·다이어그램이 변경 기반으로 동작한다
CI에서 build가 한 번만 실행된다
Peak RSS와 시간 회귀를 확인할 수 있다
```

Lighthouse 100이나 모든 작업의 완전 증분화는 완료 조건이 아니다.

---

# Epic E 완료 기준

## 측정

```text
단계별 시간
Peak RSS
문서·코드 블록 수
인덱스·dist 크기
```

## 구조

```text
공통 Content Manifest
중앙 Publication Policy
source와 derived 경계
```

## 실행 경로

```text
Fast validation
Release build
정기 audit
```

## 증분 처리

```text
검색 레코드
OG
다이어그램
이미지 검사
```

## CI

```text
Build 1회
Artifact 재사용
Smoke test
권한 분리
```

---

# Epic E 우선순위 요약

| ID | 작업 | 우선순위 | 난도 | 효과 |
|---|---|---:|---:|---:|
| E-01 | 단계별 기준선 측정 | P0 | 낮음 | 매우 높음 |
| E-02 | 빌드 명령 분리 | P0 | 낮음 | 높음 |
| E-03 | 공통 Content Manifest | P0 | 높음 | 매우 높음 |
| E-04 | Publication Policy 중앙화 | P0 | 중간 | 매우 높음 |
| E-05 | Markdown 다중 파싱 제거 | P0 | 중간 | 매우 높음 |
| E-06 | AST 생명주기 제한 | P0 | 중간 | 매우 높음 |
| E-07 | Shiki 처리량 측정 | P0 | 낮음 | 높음 |
| E-08 | 코드 블록 역할 분리 | P1 | 중간 | 높음 |
| E-09 | 언어 Allowlist | P1 | 낮음 | 중간 |
| E-11 | 대형 코드 블록 감사 | P1 | 중간 | 높음 |
| E-12 | 변경 파일 인식 | P1 | 중간 | 높음 |
| E-13 | 문서별 검색 레코드 | P1 | 중간 | 높음 |
| E-14 | OG 증분 생성 | P1 | 중간 | 중간 |
| E-15 | 다이어그램 격리 | P1 | 중간 | 높음 |
| E-17 | CI Job 분리 | P0 | 중간 | 매우 높음 |
| E-19 | Job 중복 제거 | P0 | 낮음 | 높음 |
| E-21 | 빌드 예산 | P1 | 낮음 | 높음 |
| E-24 | Dist Smoke Test | P0 | 중간 | 매우 높음 |
| E-25 | 실패 등급 분리 | P0 | 낮음 | 높음 |
| E-28 | 환경 고정 | P0 | 중간 | 높음 |

---

# 다섯 번째 실제 실행 묶음

첫 번째 배포 단위에서는 완전한 증분 빌드까지 갈 필요가 없다.

다음 순서가 현실적이다.

```text
1. 전체 빌드의 단계별 시간과 Peak RSS 기록
2. 코드 블록 언어·크기 통계 생성
3. build, build:release, audit 명령 분리
4. 공통 Content Manifest의 최소 버전 구현
5. 검색·Sitemap·RSS가 같은 Publication Policy 사용
6. CI 전체 Astro build를 한 번만 실행
7. 생성 artifact를 smoke test한 뒤 그대로 배포
8. 외부 링크 전체 검사는 정기 작업으로 이동
```

이 단계에서 메모리가 충분히 줄어들면 복잡한 캐시 시스템은 만들지 않아도 된다.

반대로 여전히 Shiki와 파생 자산 생성이 주 병목으로 확인될 때만 문서별 캐시와 증분 생성을 추가한다.

다음은 **Task 3-6. SEO·AdSense 재신청 준비 백로그**다. 색인 페이지 유형 정리, 중복·Thin Page 처리, About·Privacy·Editorial Policy, 대표 문서 보완, 광고 적용 전 검사와 재신청 완료 조건을 실제 작업 단위로 연결한다.

<!-- source message: 49 -->

## F-01. 현재 공개 URL 유형 전수 조사

### 문제

일반 글이 많더라도 다음 페이지가 함께 공개되고 색인된다면 사이트 전체 인상이 약해질 수 있다.

```text
빈 태그 페이지
글이 1개뿐인 카테고리
검색 결과 페이지
페이지네이션
Draft나 Placeholder
관리 기능
구판·중복 문서
단순 날짜 아카이브
```

### 작업

최종 배포 결과의 모든 URL을 유형별로 집계한다.

| 페이지 유형 | URL 수 | 색인 대상 | Sitemap | 광고 대상 |
|---|---:|---|---|---|
| Article |  | 예 | 예 | 조건부 |
| Topic Hub |  | 예 | 예 | 조건부 |
| Series Hub |  | 선별 | 선별 | 조건부 |
| Tag |  | 선별 | 선별 | 대체로 제외 |
| Archive |  | 선별 | 선별 | 제외 권장 |
| Search |  | 아니오 | 아니오 | 제외 |
| Admin |  | 아니오 | 아니오 | 제외 |
| Draft |  | 공개 제외 | 아니오 | 제외 |
| Superseded |  | 상황별 | 상황별 | 제외 권장 |
| 404 | 1 | 아니오 | 아니오 | 제외 |

### 구현 방법

공통 Content Manifest 외에 최종 생성 페이지 manifest를 만든다.

```ts
interface GeneratedPage {
  url: string;
  pageType:
    | "article"
    | "topic"
    | "series"
    | "tag"
    | "archive"
    | "search"
    | "admin"
    | "error";
  indexable: boolean;
  canonical: string;
  includeInSitemap: boolean;
  adsEligible: boolean;
}
```

### 완료 조건

- 최종 배포 URL 총수가 확인됨
- 페이지 유형별 색인 정책이 존재함
- 검색·관리·빈 결과 페이지가 Sitemap에 포함되지 않음
- 광고 가능 여부가 페이지 유형에 따라 결정됨

### 우선순위

```text
P0
```

---

<!-- source message: 49 -->

# F-02. Indexability Matrix 확정

각 페이지가 단순히 공개되었다는 이유로 자동 색인되면 안 된다.

## 권장 정책

| 유형 | Index | Follow | Sitemap |
|---|---|---|---|
| Current Article | 예 | 예 | 포함 |
| Needs Review Article | 예 | 예 | 포함 |
| Historical Article | 선별 | 예 | 선별 |
| Superseded Article | 대체로 아니오 또는 신판 우선 | 예 | 대체로 제외 |
| Topic Hub | 예 | 예 | 포함 |
| 강한 Series Hub | 예 | 예 | 포함 |
| 얕은 Tag | 아니오 | 예 | 제외 |
| 내부 검색 결과 | 아니오 | 예 | 제외 |
| 관리자 페이지 | 아니오 | 아니오 | 제외 |
| Draft | 출력 제외 | 해당 없음 | 제외 |
| 404 | 아니오 | 상황별 | 제외 |

## 중요한 구분

```text
중복 페이지 통합
→ canonical 또는 redirect

검색 결과에서 제외
→ noindex

외부 접근 자체 차단
→ 인증 또는 빌드 제외
```

Canonical과 `noindex`를 같은 의미로 사용해서는 안 된다. Google은 canonical을 중복 URL 중 대표 URL을 제안하는 방법으로 설명하며, Sitemap에는 선호하는 canonical URL을 포함하도록 안내한다. 다만 최종 canonical 선택은 Google이 할 수 있다. citeturn733970search35turn733970search41turn733970search27

### 완료 조건

- 모든 page type에 index 정책이 정의됨
- `noindex` URL이 Sitemap에 없음
- canonical이 실제로 동등하지 않은 다른 문서를 가리키지 않음
- 공개 제외 페이지는 robots 설정이 아니라 빌드에서 제외됨

### 우선순위

```text
P0
```

---

<!-- source message: 49 -->

# F-03. Sitemap을 공개 가치 목록으로 정리

### 문제

Sitemap을 모든 생성 URL의 덤프로 사용하면 사이트가 중요하게 여기는 URL을 구분하기 어렵다.

### 작업

Sitemap에는 다음을 중심으로 넣는다.

```text
Current Article
선별된 Historical Article
Topic Hub
강한 Series Hub
About
Editorial Policy
Privacy Policy
```

다음은 제외한다.

```text
Draft
Search
Admin
404
임의 Filter
얕은 Tag
Redirect URL
Superseded 구주소
```

Google은 Sitemap을 검색엔진에 URL을 알리고 처리 상태를 확인하는 수단으로 안내하며, Sitemap에 포함된 URL은 선호 canonical 후보로 활용될 수 있다고 설명한다. citeturn733970search34turn733970search41

### 추가 작업

Sitemap의 `lastmod`는 실제 의미 있는 콘텐츠 변경일을 사용한다.

```text
빌드한 날짜
≠
콘텐츠를 수정한 날짜
```

모든 URL의 `lastmod`가 배포 때마다 현재 날짜로 변경되는 구조는 피한다.

### 완료 조건

- Sitemap URL과 indexable page 집합이 일치
- redirect URL이 없음
- Draft와 검색 페이지가 없음
- `lastmod`가 실제 콘텐츠 수정에 대응
- Search Console에서 처리 오류를 확인할 수 있음

### 우선순위

```text
P0
```

---

<!-- source message: 49 -->

# F-04. Canonical URL 전수 검증

### 검사할 문제

```text
모든 글이 홈 canonical을 가리킴
preview domain이 canonical
http와 https 혼재
trailing slash 정책 불일치
태그와 Topic Hub가 서로 canonical
구판이 무관한 대표 글 canonical
```

## 권장 원칙

일반적으로 독립적인 문서는 자기 URL을 canonical로 사용한다.

```html
<link
  rel="canonical"
  href="https://hawk90.github.io/topics/pcie-cxl/"
/>
```

실제 중복 콘텐츠만 대표 URL로 통합한다.

### 자동 검사

```text
canonical 존재
absolute HTTPS URL
production origin
자기 URL 또는 허용된 중복 대상
canonical target가 indexable
redirect chain 없음
```

### 완료 조건

- 모든 indexable 페이지에 canonical 존재
- canonical target가 200 응답
- preview 주소가 운영 canonical로 노출되지 않음
- Sitemap URL과 canonical URL이 일치

### 우선순위

```text
P0
```

---

<!-- source message: 49 -->

# F-05. 얕은 태그 페이지 정리

### 문제

태그가 많으면 다음과 같은 페이지가 대량 생성된다.

```text
제목
글 1개
짧은 카드
```

이 페이지는 사용자에게 별도 탐색 가치를 거의 제공하지 못한다.

### 작업 분류

#### 핵심 태그

다음 조건을 만족하면 Topic Hub나 강한 보조 허브로 승격한다.

```text
글이 충분히 있음
사이트 핵심 전문 분야임
고유한 설명과 큐레이션이 가능함
```

#### 일반 태그

글 목록 탐색 기능으로 유지하되 색인 필요성을 검토한다.

#### 1회성 태그

통합·alias·삭제 후보로 처리한다.

### 1차 기준 예시

```text
1~2개 글
→ 기본 noindex 후보

3~5개 글
→ 실제 탐색 가치 수동 확인

6개 이상
→ 설명·대표 글을 추가하거나 Topic 승격 검토
```

이는 Google의 공식 숫자 기준이 아니라 사이트 운영을 위한 내부 검토 기준이다.

### 완료 조건

- 1회성 태그 수가 집계됨
- 동의어 태그가 통합됨
- 핵심 태그와 단순 필터 태그가 구분됨
- 얕은 태그 페이지가 Sitemap에서 제거됨
- 중요한 주제는 Topic Hub로 연결됨

### 우선순위

```text
P0
```

---

<!-- source message: 49 -->

# F-06. 얕은 Series 페이지 강화

### 문제

시리즈 페이지가 다음처럼 되어 있다면 일반 목록과 차이가 없다.

```text
시리즈 제목
Part 1
Part 2
Part 3
```

### 보완 요소

```text
시리즈 목표
대상 독자
선행 지식
전체 진행 순서
각 편의 역할
완독 후 다음 단계
```

### 색인 기준

다음이 있는 시리즈만 독립적인 indexable page로 유지한다.

```text
명확한 학습 목표
3편 이상 또는 충분한 독립 구조
고유한 설명
순서가 실제 의미를 가짐
```

단순히 같은 태그의 글을 묶은 페이지라면 태그나 Topic과 역할이 중복될 수 있다.

### 완료 조건

- 모든 indexable Series Hub에 고유한 소개가 있음
- 각 편이 무엇을 설명하는지 표시됨
- 미완성·빈 시리즈는 색인되지 않음
- Series와 Topic의 역할이 중복되지 않음

### 우선순위

```text
P1
```

---

<!-- source message: 49 -->

# F-07. 빈 페이지와 Placeholder 제거

Google Publisher Policies는 게시자 콘텐츠가 없거나 낮은 가치의 화면, 공사 중인 화면 등에 Google 광고를 게재하지 못하도록 한다. citeturn733970search18

### 검사 대상

```text
내용 준비 중
Coming Soon
검색 결과 없음
빈 Topic
빈 Tag
빈 Series
빈 통계 페이지
관리자 로그인
로딩 전용 화면
```

### 권장 처리

| 상태 | 처리 |
|---|---|
| 작성 중 문서 | Production build 제외 |
| 미래 Topic | 실제 콘텐츠 준비 후 공개 |
| 검색 결과 없음 | noindex + 광고 제외 |
| 빈 태그 | 생성하지 않음 |
| 관리자 페이지 | Production에서 제거 또는 인증 |
| 삭제된 문서 | 적절한 404·410·redirect |

### 완료 조건

- `dist`에서 Placeholder 문구 검색 결과 0건
- 빈 목록 페이지 생성 없음
- 검색 결과 없음 화면에 광고 코드 없음
- 관리자 화면이 일반 사이트 탐색에 노출되지 않음

### 우선순위

```text
P0
```

---

<!-- source message: 49 -->

# F-08. 콘텐츠 중복·Cannibalization 1차 정리

### 대상

우선 유사 제목과 같은 검색 의도를 가진 상위 20개 묶음만 분석한다.

예:

```text
PCIe BAR란
PCIe BAR 설명
BAR 크기 구하기
PCIe BAR 주소 할당
```

### 판단 결과

```text
통합
역할 구분
버전 분리
Historical
Superseded
유지
```

### 통합 기준

다음을 대부분 만족하면 통합 가능성이 높다.

```text
같은 검색 질문
동일 설명 반복
별도 실험 없음
버전 차이 없음
각 글이 독립적으로 완결되지 않음
```

### 역할 구분 예

```text
Guide:
PCIe 장치 초기화 전체 흐름

Concept:
BAR 크기 탐색과 주소 할당

Debug Note:
BAR가 0으로 보이는 원인

Reference:
BAR 레지스터 비트 구조
```

### 완료 조건

- 중복 후보 20개 묶음 분석
- 최소 5개 묶음에 통합 또는 역할 지정
- 구판에 대체 문서 링크 추가
- 내부 링크가 최종 대표 문서를 가리킴
- redirect chain 없이 최종 URL로 연결

### 우선순위

```text
P0
```

---

<!-- source message: 49 -->

# F-09. 대표 문서 10개 완성

기존 Epic C의 대표 문서 20개 중 최소 10개를 재신청 전에 `current` 상태로 완성한다.

## 각 문서 필수 항목

```text
명확한 제목과 description
콘텐츠 타입
Primary Topic
현재 상태
수정일
필요한 경우 검증일
환경·버전
근거와 출처
작성자의 분석
적용 범위와 한계
다음 학습 경로
```

## 콘텐츠 가치 강화 항목

다음 중 최소 하나가 분명히 보여야 한다.

```text
직접 구현
직접 측정
실제 장애 분석
공식 사양과 코드 연결
잘못된 가설을 제외한 과정
버전별 차이
의사결정 기준
```

Google Search의 사람 중심 콘텐츠 가이드는 콘텐츠가 기존 또는 의도한 독자에게 유용한지, 직접적인 경험과 깊이를 보여주는지, 독자가 목표 달성에 충분한 도움을 받는지 평가하도록 권장한다. citeturn733970search15

### 완료 조건

- 대표 문서 10개가 `current`
- `needs-review` 문서가 Featured에 없음
- 문서마다 독창적인 경험·분석 요소가 있음
- 단순 공식 문서 번역에 머물지 않음
- 모바일에서 코드·표·다이어그램이 정상

### 우선순위

```text
P0
```

---

<!-- source message: 49 -->

# F-10. 일반적인 AI 문장 제거

### 검사 대상

```text
이번 글에서는 자세히 알아보겠습니다
다양한 장점이 있습니다
매우 중요한 기술입니다
앞으로 더욱 중요해질 것입니다
결론적으로 효율적인 방법입니다
```

이런 표현이 무조건 잘못된 것은 아니지만, 구체적인 정보 없이 반복되면 문서 밀도를 낮춘다.

### 치환 원칙

```text
추상적인 중요성
→ 실제 영향을 설명

일반적인 장점
→ 측정된 결과나 사용 조건

포괄적 결론
→ 확인된 범위와 한계
```

### 예시

#### 이전

```text
Pinned memory는 성능 향상에 매우 중요한 기술입니다.
```

#### 개선

```text
이 테스트에서는 pageable memory보다 pinned memory의
1GB H2D 전송 시간이 중앙값 기준 약 44% 짧았다.
다만 작은 전송에서는 할당 비용이 이득을 상쇄할 수 있다.
```

### 완료 조건

- 대표 문서의 일반적 서론과 결론 재검토
- 핵심 주장에 환경·원인·결과 중 하나 이상 포함
- AI 문장 탐지 점수 같은 불확실한 지표를 품질 기준으로 사용하지 않음
- 글자 수를 늘리기 위한 보충 문단 없음

### 우선순위

```text
P1
```

---

<!-- source message: 49 -->

# F-11. 홈과 Topic Hub 완성

AdSense 재신청 전에 최소한 다음 구조가 실제로 배포돼 있어야 한다.

```text
홈
├── 사이트 목적
├── Core Topics
├── Featured Guides
└── Latest Posts

Topic Hub
├── 주제 설명
├── Start Here
├── Core Concepts
├── Featured Guides
└── Debug & Experiments
```

### 최소 완료 범위

```text
PCIe & CXL Hub
Firmware & Bootloader Hub
대표 글 8개 이상 연결
```

### 완료 조건

- 홈이 최신 글 목록으로만 구성되지 않음
- 핵심 주제와 대표 문서가 첫 방문에서 확인됨
- Hub가 단순 카드 자동 목록이 아님
- 모든 Featured 문서가 `current`

### 우선순위

```text
P0
```

---

<!-- source message: 49 -->

# F-12. About 페이지 개편

### About 페이지가 답해야 할 질문

```text
누가 운영하는가
어떤 주제를 다루는가
어떤 경험을 바탕으로 쓰는가
어떻게 검증하는가
어떻게 오류를 제보하는가
```

### 권장 구성

```text
짧은 소개
전문 분야
실무·연구 경험의 범위
작성 원칙
오류 제보·연락 경로
```

### 피해야 할 것

```text
과도한 자기 홍보
입증할 수 없는 전문가 표현
회사 내부 정보 노출
이력서 전체 복사
SEO 키워드 나열
```

### 권장 핵심 문장 방향

```text
CUDA·FPGA 기반 영상 처리, 임베디드 펌웨어,
PCIe 장치와 시스템 소프트웨어 개발 경험을 바탕으로
코드·사양·실험 결과를 연결해 설명합니다.
```

### 완료 조건

- 운영자 이름 또는 일관된 작성자 정체성 표시
- 실제 경험 범위가 구체적이고 과장되지 않음
- GitHub 또는 오류 제보 경로 존재
- 홈과 글의 작성자 정보가 About으로 연결

### 우선순위

```text
P0
```

---

<!-- source message: 49 -->

# F-13. Editorial Policy 페이지 작성

### 목적

“SEO를 위한 정책 페이지”가 아니라 실제 문서 품질 관리 방식을 공개한다.

### 포함할 내용

```text
출처 우선순위
사실·관찰·가설 구분
수정일과 검증일 차이
버전이 오래된 문서 처리
AI 사용 범위
오류 수정 방법
```

### 간단한 원칙 예시

```text
직접 확인한 결과를 우선합니다.
확인하지 못한 내용은 가설로 표시합니다.
버전 영향을 받는 글에는 환경과 검증 시점을 기록합니다.
중대한 오류는 수정 기록과 함께 바로잡습니다.
AI는 구조와 문장 개선에 활용하지만 핵심 기술 주장은
사양·소스코드·실험 결과로 확인합니다.
```

### 완료 조건

- 실제 운영 방식과 일치
- 형식적인 선언에 머물지 않음
- 대표 문서의 상태 모델을 설명
- 오류 제보 링크 제공

### 우선순위

```text
P1
```

---

<!-- source message: 49 -->

# F-14. Contact와 오류 제보 경로 정비

### 가능한 경로

```text
GitHub Issue
이메일
Giscus 댓글
문서별 Edit 링크
```

모두 제공할 필요는 없다.

권장 최소 조합:

```text
일반 연락: 이메일 또는 GitHub 프로필
문서 오류: GitHub Issue
```

### 글 하단 UI

```text
이 문서에서 오류를 발견했나요?
GitHub에서 수정 제안 또는 오류를 제보할 수 있습니다.
```

### 완료 조건

- 연락 경로가 실제로 작동
- 이메일 주소를 이미지나 난해한 방식으로 숨기지 않음
- 오류 제보 시 문서 URL이나 ID가 자동 포함
- 중요한 댓글 정정은 본문으로 반영

### 우선순위

```text
P1
```

---

<!-- source message: 49 -->

# F-15. Privacy Policy 작성·현행화

AdSense의 필수 콘텐츠 안내는 개인정보 처리방침에 Google을 포함한 제3자 광고 제공자의 쿠키 사용과 맞춤형 광고 거부 방법 등에 관한 정보를 포함하도록 안내한다. 실제 사용 중인 광고·분석·댓글 서비스에 맞춰 작성해야 한다. citeturn733970search4

## 실제 데이터 흐름 먼저 조사

```text
AdSense
Analytics
Giscus
Local Storage
검색어 수집
외부 폰트
Newsletter
```

## Privacy Policy에 포함할 후보

```text
운영자와 연락 방법
수집하는 정보
수집 목적
쿠키·로컬 스토리지
Google 광고와 제3자 제공자
Analytics
Giscus와 GitHub Discussions
외부 링크
보존과 삭제
정책 변경일
```

Google의 Privacy & messaging 기능은 GDPR이나 미국 주별 개인정보 규정 등에 대응하는 동의·거부 메시지를 구성할 수 있도록 제공된다. 실제 적용 의무는 방문 지역과 데이터 처리 방식에 따라 달라지므로 단순 배너 복사보다는 사용 중인 서비스와 지역을 기준으로 설정해야 한다. citeturn733970search11turn733970search22

### 피해야 할 것

- 다른 블로그 정책 복사
- 사용하지 않는 서비스 나열
- 사용하는 서비스 누락
- 광고 도입 전후 정책 불일치
- 실제 동의 제어 없이 버튼만 있는 배너

### 완료 조건

- 현재 네트워크 요청과 정책 내용이 일치
- Privacy 링크가 푸터에 항상 존재
- 광고·분석 서비스 변경 시 정책 검토 절차 존재
- 마지막 변경일 표시

### 우선순위

```text
P0
```

---

<!-- source message: 49 -->

# F-16. Terms·Disclaimer의 과잉 생성 방지

About, Contact, Privacy는 실제 역할이 명확하다.

반면 다음 페이지는 필요성 없이 형식적으로 만들지 않는다.

```text
Terms of Service
Medical Disclaimer
Financial Disclaimer
Affiliate Disclaimer
Cookie Policy 별도 페이지
```

사이트가 해당 서비스를 제공하거나 관련 내용을 다루지 않는다면 빈 법률 템플릿은 오히려 실제 운영과 불일치할 수 있다.

### 원칙

```text
실제 처리와 책임 관계가 있을 때 작성
단순히 승인에 도움이 될 것 같아서 만들지 않음
```

제휴 링크나 협찬이 생긴다면 해당 관계를 글과 정책에서 명확히 공개한다.

---

<!-- source message: 49 -->

# F-17. 구조화 데이터 최소 구현

구조화 데이터는 콘텐츠 품질의 대체 수단이 아니다. Google은 구조화 데이터가 페이지에 실제로 표시되는 콘텐츠를 정확히 표현해야 하며, 기술적으로 유효하더라도 품질 가이드라인을 충족하지 않으면 검색 기능에 표시되지 않을 수 있다고 안내한다. citeturn733970search21turn733970search2

## 권장 최소 구성

### 홈

```text
WebSite
Person 또는 Organization는 실제 운영 형태에 맞게 선별
```

### 글

```text
BlogPosting 또는 Article
BreadcrumbList
```

Article 구조화 데이터는 Google이 제목·이미지·날짜·작성자 등 페이지 정보를 이해하는 데 도움을 줄 수 있다. citeturn733970search14

## 실제 값과 연결

```text
headline ← 문서 title
description ← 문서 description
datePublished ← published
dateModified ← updated
author ← 실제 작성자
mainEntityOfPage ← canonical
```

`lastVerified`를 `dateModified`로 자동 대체하지 않는다.

### 완료 조건

- 화면에 없는 평가·리뷰·전문가 정보를 넣지 않음
- canonical·날짜·작성자가 실제 페이지와 일치
- Rich Results Test로 대표 페이지 검사
- schema 실패가 일반 본문 렌더를 막지 않음

### 우선순위

```text
P1
```

---

<!-- source message: 49 -->

# F-18. 제목과 Description 감사

### 검사 대상

```text
제목 중복
설명 중복
너무 일반적인 제목
키워드 나열형 제목
자동 생성 첫 문장 description
빈 description
```

## 대표 문서 제목 원칙

```text
한 글에 하나의 핵심 질문
주요 기술 고유명 포함
불필요한 ‘완벽 정리’ 표현 자제
```

### 예시

#### 이전

```text
PCIe 완벽 정리 총정리 개념 원리 BAR MMIO
```

#### 개선

```text
PCIe BAR 크기는 어떻게 탐색되고 주소가 할당되는가
```

## Description 원칙

```text
무엇을 설명하는가
어떤 범위인가
독자가 무엇을 얻는가
```

### 완료 조건

- 대표 20개 제목·description 수동 검토
- 전체 사이트 중복 title 없음
- description 완전 동일 중복 없음
- 페이지 언어와 description 언어 일치

### 우선순위

```text
P0
```

---

<!-- source message: 49 -->

# F-19. 검색 색인 품질 검사

### Search Console에서 확인할 대상

```text
대표 글 10개
Topic Hub 2개
홈
About
Privacy
Editorial Policy
```

### 확인 항목

```text
Google이 선택한 canonical
색인 여부
마지막 크롤링
모바일 렌더링
차단된 자원
중복 판단
```

### 주의

모든 페이지에 수동 색인 요청을 반복하는 방식은 구조적 해결책이 아니다.

먼저 다음을 고친다.

```text
내부 링크
Sitemap
canonical
콘텐츠 중복
페이지 품질
```

### 완료 조건

- 핵심 페이지가 내부 링크로 발견 가능
- Sitemap 제출 및 처리 확인
- 대표 페이지의 Google-selected canonical 확인
- 예상치 못한 중복 canonical 문제 없음

### 우선순위

```text
P0
```

---

<!-- source message: 49 -->

# F-20. 404와 삭제 URL 정비

### 좋은 404 페이지

```text
페이지를 찾을 수 없다는 명확한 안내
검색
Core Topics
홈
대표 Guide
```

### 피해야 할 것

```text
200 상태로 “페이지 없음” 표시
광고 삽입
수십 개 추천 카드
자동으로 홈 redirect
```

### 삭제 글 처리

```text
대체 문서 있음
→ 가장 가까운 문서로 redirect

대체 문서 없음
→ 정상적인 404 또는 적절한 제거 응답

외부 참조가 많은 중요 문서
→ 짧은 대체 안내 페이지 검토
```

### 완료 조건

- 존재하지 않는 URL이 200으로 응답하지 않음
- 404에 광고 없음
- 삭제 URL을 무조건 홈으로 redirect하지 않음
- redirect chain 없음

### 우선순위

```text
P1
```

---

<!-- source message: 49 -->

# F-21. 모바일 콘텐츠 경험 감사

재신청 전 실제 모바일 화면을 대표 페이지 기준으로 검사한다.

## 페이지

```text
홈
Topic Hub
일반 Guide
코드가 많은 글
표가 많은 글
검색
About
Privacy
404
```

## 검사

```text
본문 글자 크기
코드 가로 스크롤
표 overflow
광고 슬롯 예정 위치
고정 헤더
목차
다이어그램 확대
링크·버튼 터치 영역
CLS
```

### 완료 조건

- 본문을 가리는 고정 요소 없음
- 코드 복사 버튼이 코드를 덮지 않음
- 표와 코드가 viewport를 확장하지 않음
- Topic Hub 탐색이 한 열에서도 이해 가능
- 핵심 콘텐츠가 Hero 아래 너무 늦게 시작하지 않음

### 우선순위

```text
P0
```

---

<!-- source message: 49 -->

# F-22. 광고 없는 상태에서 사이트 감사

승인 준비 중에는 광고 배치 최적화보다 콘텐츠와 페이지 품질을 먼저 확인한다.

### 검사할 것

```text
광고 코드 없이 레이아웃 정상
빈 광고 슬롯 없음
Auto Ads 관련 이전 설정 없음
실험용 광고 placeholder 없음
```

### 이유

광고가 없는 상태에서도 페이지가 완결돼야 한다.

AdSense는 게시자 콘텐츠가 없는 화면에 광고를 허용하지 않으며, 광고 배치 모범 사례에서도 사용자가 원하는 콘텐츠를 쉽게 찾을 수 있는 경험을 강조한다. citeturn733970search18turn733970search23

### 완료 조건

- 모든 페이지가 광고 없이 자연스럽게 읽힘
- 광고 공간을 전제로 한 큰 빈 영역 없음
- 검색·404·관리 페이지에 광고 코드 없음

### 우선순위

```text
P0
```

---

<!-- source message: 49 -->

# F-23. 광고 가능 페이지 정책 작성

승인 이후를 대비하되 실제 광고는 승인 후 적용한다.

## 광고 가능 후보

```text
Current Article
충분한 설명이 있는 Topic Hub
완성된 Guide
```

## 광고 제외

```text
홈 Hero 근처
Search
404
Admin
Draft
빈 Tag
얕은 Archive
Superseded
Archived
개인정보·연락 페이지
```

## 조건부 제외

```text
매우 짧은 Reference
Historical
Needs Review
도구 전용 페이지
```

### 코드 예

```ts
function isAdsEligible(page: GeneratedPage): boolean {
  if (!page.indexable) return false;

  return (
    page.pageType === "article" &&
    page.status === "current" &&
    page.hasSubstantialPublisherContent
  );
}
```

`hasSubstantialPublisherContent`를 글자 수 하나로 자동 판정하지 않는다.

### 완료 조건

- 광고 코드가 전체 Layout에 무조건 삽입되지 않음
- 페이지 유형과 상태 기반 조건 존재
- 404·검색·관리 페이지 광고 차단 테스트 존재

### 우선순위

```text
P1
```

---

<!-- source message: 49 -->

# F-24. 광고 제외 영역 설계

Google의 광고 배치 정책은 광고를 콘텐츠나 내비게이션으로 오인하게 만들거나, 우발적인 클릭을 유도하거나, 광고에 부자연스러운 주의를 끄는 배치를 제한한다. citeturn733970search5

## 기술 문서 보호 영역

```text
제목과 첫 문단
코드와 해당 코드 설명 사이
표와 표 해석 사이
다이어그램과 캡션 사이
단계별 절차 중간
경고·주의 블록 주변
결론 직전
```

## 상대적으로 안전한 후보

```text
큰 장이 끝난 뒤
본문 종료 뒤
관련 글 이전
긴 문서의 독립된 섹션 경계
```

### 완료 조건

- 코드·표·절차를 하나의 보호 단위로 취급
- 광고 주변에 버튼·복사·다음 글 링크가 밀착되지 않음
- 광고 제목처럼 보이는 heading 없음
- 자동 광고 적용 시 실제 삽입 위치 검토

### 우선순위

```text
P1
```

---

<!-- source message: 49 -->

# F-25. 광고 슬롯 CLS 방지

### 작업

광고 슬롯을 적용할 경우 예상 크기를 확보한다.

```css
.ad-slot {
  min-height: var(--reserved-ad-height);
}
```

다만 실제 광고가 없는 상태에서 지나치게 큰 빈 공간이 남지 않도록 로드 상태와 실패 상태를 구분한다.

### 검사

```text
모바일 CLS
광고 로드 실패
광고 차단기 사용
느린 네트워크
화면 회전
```

### 완료 조건

- 광고 로드 시 본문 위치가 크게 이동하지 않음
- 실패 시 불필요한 큰 빈 공간 제거
- 코드·표 위치가 이동하지 않음

---

<!-- source message: 49 -->

# F-26. AdSense 재신청 전 최종 체크리스트

## 콘텐츠

```text
[ ] 대표 문서 10개 이상 current
[ ] 실제 경험·분석·실험이 명확함
[ ] 중복 후보 20개 검토
[ ] 구판과 신판 관계 정리
[ ] Placeholder와 빈 페이지 없음
[ ] Topic Hub 2개 이상 완성
```

## 색인

```text
[ ] Sitemap에 canonical URL만 포함
[ ] Search·Admin·404·Draft 제외
[ ] 얕은 Tag 정책 적용
[ ] canonical 전수 검증
[ ] 대표 페이지의 Google-selected canonical 확인
```

## 신뢰

```text
[ ] About
[ ] Contact
[ ] Privacy Policy
[ ] Editorial Policy
[ ] 작성자 정보
[ ] 오류 제보 경로
```

## UX

```text
[ ] 모바일 대표 페이지 확인
[ ] 내부 검색 정상
[ ] 깨진 내부 링크 없음
[ ] 코드·표·다이어그램 정상
[ ] 광고 없는 상태에서 레이아웃 완성
```

## 기술

```text
[ ] HTTPS
[ ] robots와 noindex 충돌 없음
[ ] Sitemap 처리 확인
[ ] 404가 올바른 상태
[ ] 구조화 데이터 대표 페이지 검사
[ ] 배포 결과 smoke test
```

---

<!-- source message: 49 -->

# F-27. 재신청 판단 기준

다음 조건이 충족되기 전에 날짜만 기다렸다가 다시 신청하지 않는다.

```text
이전 신청 이후 실질적 변경이 있음
대표 콘텐츠의 가치가 강화됨
색인 페이지 집합이 정리됨
사이트 목적과 전문 분야가 명확해짐
신뢰·개인정보 페이지가 실제 운영과 일치함
```

## 실질적 변경 예

```text
홈 정보 구조 개편
Topic Hub 2개 공개
대표 글 10개 재검증
얕은 태그 noindex 또는 통합
중복 문서 통합
About·Privacy·Editorial Policy 개편
```

## 실질적이지 않은 변경

```text
문장 일부 교정
글 2~3개 추가
테마 색상 변경
메뉴명 변경
날짜만 최신화
광고 코드 재삽입
```

### 중요한 점

재신청 기준을 충족해도 승인 결과를 보장할 수는 없다.

목표는 심사 시스템을 속이는 것이 아니라:

```text
독자가 사이트의 전문성을 이해하고
대표 문서를 찾으며
각 문서의 근거와 현재 상태를 판단할 수 있게 만드는 것
```

이다.

---

<!-- source message: 49 -->

# F-28. 재신청 후 변경 동결 범위

재신청 직후 사이트 전체 구조를 다시 크게 변경하면 상태 관찰이 어려워진다.

## 동결 권장 영역

```text
canonical
URL
index 정책
홈 주요 구조
대표 문서 목록
광고 코드
```

## 계속 가능한 작업

```text
오탈자 수정
깨진 링크 수정
사실 오류 수정
작은 모바일 버그 수정
```

### 완료 조건

- 재신청 시점의 commit SHA 기록
- 변경 내용 요약 보존
- 구조적 변경은 결과 확인 전 제한
- 긴급 오류는 즉시 수정 가능

---

<!-- source message: 49 -->

# F-29. Search Console 변경 로그

간단한 Markdown 파일이면 충분하다.

```markdown
## 2026-08-01

- 홈을 Topic-first 구조로 변경
- PCIe & CXL Hub 추가
- 얕은 태그 43개 noindex
- 대표 글 10개 검증
- Sitemap에서 검색·아카이브 URL 제거
```

## 이후 관찰할 것

```text
핵심 페이지 색인
canonical 변경
노출 검색어
대표 Hub 유입
중복 페이지 상태
```

검색 지표는 변경 직후가 아니라 충분한 관찰 기간 후 해석한다.

---

<!-- source message: 49 -->

# F-30. Epic F 완료 조건

## 사이트 구조

```text
홈이 사이트 목적과 핵심 Topic을 설명
Topic Hub 최소 2개
Featured Guide 최소 8개
Latest Posts가 보조 역할
```

## 콘텐츠

```text
대표 글 20개 선정
최소 10개 current
중복·구판 후보 20개 검토
빈·Placeholder 페이지 없음
```

## 색인

```text
페이지 유형별 index 정책
Sitemap과 canonical 일치
얕은 Tag 정리
Search·Admin·404 제외
```

## 신뢰

```text
About
Contact
Privacy
Editorial Policy
작성자·오류 제보 연결
```

## 광고 준비

```text
광고 없는 완성된 레이아웃
광고 가능 페이지 정책
광고 제외 영역
CLS 방지 계획
```

## 검증

```text
production dist smoke test
모바일 대표 페이지 검사
내부 링크·anchor 검사
Search Console 핵심 페이지 확인
```

---

# Epic F 우선순위 요약

| ID | 작업 | 우선순위 | 난도 | 효과 |
|---|---|---:|---:|---:|
| F-01 | 공개 URL 전수 조사 | P0 | 중간 | 매우 높음 |
| F-02 | Indexability Matrix | P0 | 낮음 | 매우 높음 |
| F-03 | Sitemap 정리 | P0 | 중간 | 높음 |
| F-04 | Canonical 검증 | P0 | 중간 | 매우 높음 |
| F-05 | 얕은 Tag 정리 | P0 | 중간 | 매우 높음 |
| F-06 | Series Hub 강화 | P1 | 중간 | 높음 |
| F-07 | 빈·Placeholder 제거 | P0 | 낮음 | 매우 높음 |
| F-08 | 중복·Cannibalization 정리 | P0 | 높음 | 매우 높음 |
| F-09 | 대표 문서 10개 완성 | P0 | 높음 | 매우 높음 |
| F-11 | 홈·Topic Hub 완성 | P0 | 중간 | 매우 높음 |
| F-12 | About 개편 | P0 | 낮음 | 높음 |
| F-13 | Editorial Policy | P1 | 낮음 | 높음 |
| F-15 | Privacy Policy | P0 | 중간 | 매우 높음 |
| F-18 | 제목·Description 감사 | P0 | 중간 | 높음 |
| F-19 | Search Console 검사 | P0 | 중간 | 높음 |
| F-21 | 모바일 감사 | P0 | 중간 | 매우 높음 |
| F-22 | 광고 없는 상태 감사 | P0 | 낮음 | 높음 |
| F-23 | 광고 가능 페이지 정책 | P1 | 중간 | 높음 |
| F-26 | 최종 체크리스트 | P0 | 낮음 | 매우 높음 |

---

# 여섯 번째 실제 실행 묶음

재신청 전 실제 작업은 다음 순서가 가장 현실적이다.

```text
1. 최종 배포 URL 유형과 색인 상태 집계
2. Search·Admin·Draft·빈 Tag를 Sitemap에서 제거
3. 얕은 Tag와 중복 Series 페이지 정리
4. 대표 글 10개를 current 상태로 보완
5. PCIe & CXL, Firmware & Bootloader Hub 완성
6. About·Privacy·Editorial Policy 공개
7. canonical·title·description 전수 검사
8. 모바일·404·검색·Topic Hub smoke test
9. 광고 코드 없이 최종 사이트 검토
10. 변경 commit과 체크리스트를 기록한 뒤 재신청
```

# 이번 단계의 핵심 결론

`hawk90.github.io`의 AdSense 대응에서 가장 피해야 할 접근은 다음이다.

```text
글자 수 늘리기
AI로 모든 글 재작성
신규 글 대량 발행
법률 페이지 템플릿 복사
광고 배치부터 최적화
```

현재 필요한 것은 콘텐츠 양의 증가보다 다음이다.

```text
색인할 가치가 있는 URL만 남기기
대표 기술 문서의 독창성과 검증 흔적 강화
좋은 글을 Topic Hub로 연결하기
운영자와 작성 원칙을 명확히 보여주기
빈·중복·구판 페이지가 사이트 인상을 지배하지 않게 하기
```

재신청의 직접 목표는 “Google에 좋은 사이트처럼 보이기”가 아니다.

> 실제 독자가 이 사이트의 전문 분야를 이해하고, 대표 문서를 발견하고, 기술적 주장의 근거와 현재 유효성을 판단할 수 있는 상태를 만드는 것이 목표다.
:::

다음 단계는 **Task 3-7. 보안·개인정보·GitHub Actions 정비 백로그**다. 공개 사이트와 관리자 기능 분리, workflow 최소 권한, action SHA 고정, 외부 스크립트 목록, CSP와 민감 정보 검사를 실제 작업 단위로 정리한다.

<!-- source message: 51 -->

## H-01. 테스트 계층 확정

테스트를 네 계층으로 나눈다.

```text
1. Content validation
2. Build integration
3. Browser smoke test
4. Scheduled audit
```

## 1. Content validation

빠르고 결정적이어야 한다.

```text
schema
slug uniqueness
internal links
relations
publication policy
```

## 2. Build integration

실제 production 결과를 생성한다.

```text
Astro build
search index
Sitemap
RSS
generated assets
```

## 3. Browser smoke test

최종 `dist`를 브라우저에서 확인한다.

```text
홈
Topic Hub
대표 글
검색
404
모바일
```

## 4. Scheduled audit

외부 환경 때문에 느리거나 flaky할 수 있는 검사다.

```text
외부 링크
dependency 상태
콘텐츠 최신성
대형 이미지
중복 후보
```

## 완료 조건

- 각 검사가 어느 계층에 속하는지 명확함
- 느린 감사가 일반 글 수정을 막지 않음
- 배포 전에 반드시 필요한 검사가 별도 명령으로 실행됨

## 우선순위

```text
P0
```

---

<!-- source message: 51 -->

# H-02. 빠른 Content Validation 명령

권장 명령:

```bash
npm run check:content
```

포함할 검사:

```text
front matter schema
content ID
slug uniqueness
Topic ID 존재
type·status enum
날짜 형식
필수 description
relation 대상 존재
자기 참조
상태 불변조건
```

## 상태 불변조건 예

```text
superseded → featured 불가
archived → home 노출 불가
draft → Sitemap 불가
noindex → Sitemap 불가
featured → status=current
```

## 오류 출력 예

```text
ERROR [content/status-featured]
src/content/posts/old-pcie-bar.md

A superseded document cannot be featured.
Suggested action: remove it from featured config or set a valid current replacement.
```

## 완료 조건

- 파일명과 문제 위치가 표시됨
- 오류 이유와 수정 방향이 나옴
- JSON 또는 SARIF 출력 가능성 검토
- 로컬과 CI가 같은 명령을 사용

## 우선순위

```text
P0
```

---

<!-- source message: 51 -->

# H-03. Content Fixture 세트 생성

실제 전체 콘텐츠만으로 parser와 schema를 테스트하면 edge case를 재현하기 어렵다.

## 최소 fixture

```text
valid-guide.md
valid-debug-note.md
historical-post.md
invalid-status.md
missing-topic.md
duplicate-slug.md
broken-relation.md
korean-heading.md
long-code-block.md
raw-html.md
```

## fixture의 목적

각 파일은 하나 또는 소수의 동작만 재현한다.

예:

```yaml
---
title: Duplicate URL
slug: pcie-bar
status: current
type: concept
topic: pcie-cxl
---
```

다른 fixture와 동일 slug를 사용해 충돌을 검증한다.

## 피해야 할 것

- 실제 게시글 전체 복사
- fixture 자체가 수백 줄
- 여러 오류를 한 파일에 몰아넣기
- production 문서 변경에 따라 fixture도 계속 수정

## 완료 조건

- 주요 콘텐츠 타입 fixture 존재
- 실패해야 하는 fixture와 예상 오류 정의
- 한글·영문·특수문자 사례 포함
- parser 변경 시 빠르게 실행 가능

## 우선순위

```text
P1
```

---

<!-- source message: 51 -->

# H-04. Internal Link 검사

매 변경마다 검사한다.

## 검사 대상

```text
없는 내부 URL
없는 content ID
깨진 heading anchor
draft 문서 링크
archived 문서의 일반 추천
redirect를 거치는 내부 링크
```

## Anchor 검사

원본 heading 문자열이 아니라 실제 생성된 heading ID를 사용한다.

```text
Markdown
→ heading manifest
→ link target validation
```

예:

```markdown
[BAR 탐색](./pcie-bar/#size-probing)
```

검증 대상:

```text
해당 문서 존재
`size-probing` ID 존재
```

## Redirect debt

내부 링크가 redirect를 통과하면 warning으로 처리한다.

```text
WARNING:
`/old-pcie-bar/` redirects to `/pcie-bar-sizing/`.

Update the internal link to the canonical URL.
```

## 완료 조건

- 내부 링크는 매 commit 검사
- 코드 블록 안 URL은 검사 대상에서 제외
- Markdown reference link도 지원
- redirect target가 아니라 최종 canonical로 연결

## 우선순위

```text
P0
```

---

<!-- source message: 51 -->

# H-05. Relation Integrity 검사

대표 문서와 Hub 관계가 깨지지 않게 한다.

## 검사 대상

```text
parent
prerequisites
next
related
supersedes
```

## 불변조건

```text
대상 문서 존재
자기 참조 없음
중복 relation 없음
supersedes cycle 없음
archived 문서를 next로 추천하지 않음
동일 글이 여러 UI slot에 중복되지 않음
```

## Cycle 검사

특히 다음 관계는 cycle이 없어야 한다.

```text
supersedes
next
필수 prerequisite
```

`related`는 양방향 또는 cycle이 있어도 괜찮다.

## 완료 조건

- 존재하지 않는 문서 ID 차단
- cycle 경로가 오류에 표시됨
- inverse relation이 필요한 경우 자동 파생 또는 검증
- 구판이 대표 경로에 들어오지 않음

## 우선순위

```text
P0
```

---

<!-- source message: 51 -->

# H-06. Topic Hub Validation

각 Hub가 단순 빈 껍데기로 공개되지 않게 한다.

## 검사 항목

```text
고유 title
고유 description
Start Here 1~3개
Featured 3~6개
관련 Topic 최소 1개
모든 문서 current 또는 허용 상태
중복 article ID 없음
```

## 예외 처리

초기 구축 중인 Hub는 production에서 숨기거나 `noindex`할 수 있다.

하지만 공개 Hub라면 완성 기준을 적용한다.

## 완료 조건

- 빈 Hub 생성 없음
- Start Here가 발행순으로 자동 결정되지 않음
- Featured에 `needs-review`나 `superseded` 없음
- Hub 링크가 모두 실제 문서로 연결

## 우선순위

```text
P0
```

---

<!-- source message: 51 -->

# H-07. Featured Content Validation

홈의 Featured는 사이트 대표 문서이므로 일반 글보다 강한 기준을 적용한다.

## 필수 조건

```text
status=current
description 존재
Primary Topic 존재
type 지정
canonical URL 존재
상위 Hub 연결
```

환경이나 버전이 중요한 글은:

```text
lastVerified 또는 명시적인 historical scope
```

가 필요하다.

## 추가 검사

```text
Featured 4~6개
같은 Topic으로 과도하게 편중되지 않음
동일 검색 의도의 중복 문서 없음
```

Topic 다양성은 자동 오류보다 warning이 적절하다.

## 완료 조건

- Featured 설정 오류가 build 전에 차단됨
- 구판이 홈에 노출되지 않음
- 모든 Featured 링크가 200 응답
- Featured 카드 metadata 누락 없음

## 우선순위

```text
P0
```

---

<!-- source message: 51 -->

# H-08. Publication Set 일치 검사

다음 생성물이 서로 다른 문서 정책을 사용하면 안 된다.

```text
렌더링 페이지
검색 인덱스
Sitemap
RSS
Topic Hub 자동 목록
```

## 집합 검사

예:

```text
renderedCurrentArticles
searchCurrentArticles
sitemapCurrentArticles
```

를 비교한다.

## 허용되는 차이

```text
Historical:
렌더링·검색에는 포함
Sitemap은 선별

Archived:
직접 URL 유지
검색·RSS·Hub에서 제외
```

차이는 Publication Policy에 명시돼 있어야 한다.

## 자동 오류 예

```text
ERROR:
Draft document `private-xrt-note` exists in search-index.json.
```

```text
ERROR:
Noindex URL `/tags/misc/` is included in sitemap.xml.
```

## 완료 조건

- 공통 Publication Policy 사용
- 예외가 코드 여러 곳에 흩어지지 않음
- Draft·Search·Admin이 공개 목록에 없음
- 삭제 글의 stale 검색 레코드 없음

## 우선순위

```text
P0
```

---

<!-- source message: 51 -->

# H-09. Production Build 통합 테스트

권장 명령:

```bash
npm run build:release
```

반드시 다음을 실제로 생성한다.

```text
HTML
CSS·JS
검색 인덱스
Sitemap
RSS
필수 OG
Topic Hub
404
```

## 검사할 실패

```text
unknown syntax grammar
생성 asset 누락
잘못된 base path
JSON serialization 오류
duplicate route
Markdown transformation 오류
```

## 완료 조건

- main merge 전 production build 실행
- build가 최종 배포 설정을 사용
- dev server 성공만으로 배포하지 않음
- build artifact가 이후 smoke test와 deploy에 재사용됨

## 우선순위

```text
P0
```

---

<!-- source message: 51 -->

# H-10. 최종 `dist` 구조 검사

원본이 아니라 배포물을 검사한다.

## 기본 검사

```text
HTML 파일 수
예상하지 못한 확장자
숨김 파일
.env
backup 파일
source map
admin bundle
secret pattern
```

## 파일 크기 검사

```text
대형 HTML
대형 JS
대형 CSS
대형 이미지
검색 인덱스
```

예:

```text
WARNING:
`/posts/cuda-complete-guide/index.html` is 3.8 MB.
Largest contributors: code blocks, line-number markup.
```

## 완료 조건

- 민감 파일이 artifact에 없음
- 관리자 자산이 없음
- 예상 밖의 대형 파일이 보고됨
- 배포 파일 목록을 artifact로 보존 가능

## 우선순위

```text
P0
```

---

<!-- source message: 51 -->

# H-11. Dist HTTP Smoke Test

생성된 `dist`를 실제 HTTP 서버로 제공하고 검사한다.

```bash
npm run preview:dist
npm run test:smoke
```

## 최소 URL

```text
/
PCIe & CXL Hub
Firmware & Bootloader Hub
대표 Guide 2개
Historical 문서 1개
검색
About
Privacy
Editorial Policy
존재하지 않는 URL
```

## 검사 항목

```text
예상 HTTP status
title
meta description
canonical
H1 하나
주요 내비게이션
CSS·JS 로드
핵심 내부 링크
```

## 404

존재하지 않는 URL은 404 동작을 확인한다.

GitHub Pages의 실제 404 제공 특성도 고려해 테스트 환경과 운영 환경 차이를 문서화한다.

## 완료 조건

- 대표 URL 모두 정상
- 404가 soft 404 형태로 200 응답하지 않음
- 자산 경로가 production base에서 정상
- 외부 댓글·광고 실패와 무관하게 본문 표시

## 우선순위

```text
P0
```

---

<!-- source message: 51 -->

# H-12. SEO Metadata 회귀 검사

모든 indexable 페이지에서 검사한다.

```text
title
description
canonical
robots
Open Graph
published
updated
author
```

## 불변조건

```text
title 비어 있지 않음
H1과 title이 완전히 무관하지 않음
description 존재
canonical은 HTTPS production URL
noindex URL은 Sitemap 제외
preview origin 없음
```

## 중복 감사

- title 완전 중복
- description 완전 중복
- canonical 중복
- 여러 페이지가 같은 OG URL 사용

일부 공통 정책 페이지는 예외가 있을 수 있지만, 일반 글은 고유해야 한다.

## 완료 조건

- 대표 페이지는 PR마다 검사
- 전체 중복 검사는 release 또는 정기 audit
- canonical target가 실제 페이지임
- 날짜가 미래로 설정되지 않음

## 우선순위

```text
P0
```

---

<!-- source message: 51 -->

# H-13. 구조화 데이터 검사

대표 페이지 대상으로만 시작한다.

## 페이지

```text
홈
Topic Hub
Guide
Debug Note
About
```

## 검사

```text
유효 JSON-LD
페이지 내용과 일치
canonical 일치
author 일치
날짜 일치
Breadcrumb URL 일치
```

## 피해야 할 것

- 화면에 없는 review
- 가짜 rating
- 모든 글을 HowTo로 표시
- About 페이지를 Article로 표시
- `lastVerified`를 게시일처럼 사용

## 완료 조건

- JSON parse 오류 없음
- schema type이 페이지 역할과 일치
- 실제 화면에 없는 정보 없음
- 구조화 데이터 실패가 페이지 build를 깨뜨리지 않음

## 우선순위

```text
P1
```

---

<!-- source message: 51 -->

# H-14. 검색 Golden Query 테스트

Task 3-4에서 만든 대표 검색어를 자동 테스트한다.

## 최소 query 수

```text
20개
```

구성:

```text
상위 주제
정확한 개념
한글 alias
영문 alias
기호 용어
identifier
오류 메시지
```

## 테스트 형식

```yaml
- query: PCIe BAR
  mustInclude:
    - pcie-bar-sizing
  preferredTopThree:
    - pcie-device-initialization
  exclude:
    - old-pcie-bar-note
```

## 판정

정확한 내부 점수를 고정하지 않는다.

검사할 것은 다음이다.

```text
필수 문서 포함
선호 문서 상위 3개
구판 제외
무관한 문서 과다 노출 없음
```

## 완료 조건

- 검색 알고리즘 변경 시 자동 실행
- 한글·영문 alias 모두 테스트
- 기호 제거로 C++·MSI-X가 깨지지 않음
- `superseded` 문서가 일반 검색 상위에 없음

## 우선순위

```text
P0
```

---

<!-- source message: 51 -->

# H-15. 검색 UI 브라우저 테스트

검색 알고리즘만 맞아도 UI가 깨질 수 있다.

## 동작 시나리오

```text
검색 버튼 클릭
인덱스 로딩
검색어 입력
결과 선택
Escape로 닫기
focus 복원
결과 없음
인덱스 로드 실패
```

## 키보드

```text
Tab
Shift+Tab
Enter
Arrow keys를 지원한다면 해당 동작
Escape
```

## 보안 입력

다음 검색어를 넣어도 DOM이 깨지거나 실행되지 않아야 한다.

```text
<script>alert(1)</script>
"><img src=x onerror=alert(1)>
C++
MSI-X
&
```

## 완료 조건

- 검색 modal focus trap 정상
- 닫은 후 원래 버튼으로 focus 복귀
- highlight가 안전한 DOM API로 생성
- 모바일 키보드에서 결과 영역 사용 가능
- 검색 실패 fallback 존재

## 우선순위

```text
P0
```

---

<!-- source message: 51 -->

# H-16. 접근성 자동 검사

대표 페이지에 axe 계열 자동 검사를 적용할 수 있다.

## 대상

```text
홈
Topic Hub
대표 Guide
검색 modal
404
```

## 자동으로 잘 잡는 항목

```text
accessible name 누락
색 대비 일부
heading 구조 일부
form label
ARIA 오류
중복 ID
```

## 자동 검사로 충분하지 않은 항목

```text
링크 문구 품질
문서 논리 구조
다이어그램 설명
focus 이동의 자연스러움
```

## 완료 조건

- 심각한 자동 접근성 오류 0개
- warning은 의도와 이유를 검토
- suppression은 구체적인 요소에만 적용
- 라이트·다크 테마 중 최소 대표 페이지 검사

## 우선순위

```text
P1
```

---

<!-- source message: 51 -->

# H-17. 수동 키보드 Smoke Checklist

자동화가 놓치는 핵심 흐름만 짧게 확인한다.

```text
[ ] Skip link로 본문 이동
[ ] Header 메뉴 접근
[ ] 검색 열기·닫기
[ ] 검색 결과 선택
[ ] Topic Hub Start Here 순서 탐색
[ ] 코드 복사 버튼 접근
[ ] Heading permalink 접근
[ ] 댓글 열기 기능 접근
```

## 완료 조건

- 마우스 없이 핵심 탐색 가능
- focus indicator가 모든 인터랙션에서 보임
- modal 뒤쪽으로 focus가 빠지지 않음
- 카드가 실제 `<a>` 또는 `<button>`으로 구현됨

## 우선순위

```text
P1
```

---

<!-- source message: 51 -->

# H-18. 모바일 Viewport Smoke Test

## 권장 viewport

```text
360×800
390×844
태블릿 폭 768
```

모든 기기를 테스트할 필요는 없지만 작은 폭과 일반 모바일 폭은 필요하다.

## 페이지 유형

```text
홈
Topic Hub
긴 Guide
코드 많은 글
표 많은 글
검색
Privacy
404
```

## 검사

```text
가로 페이지 overflow
코드 버튼 겹침
표 잘림
Hero 과대 점유
Header 높이
TOC overlay
긴 영문 identifier
touch target
```

## 자동 검사 가능 항목

```javascript
document.documentElement.scrollWidth <= window.innerWidth
```

하지만 의도적인 코드·표 내부 가로 스크롤은 허용한다.

페이지 전체 viewport만 확장되지 않게 한다.

## 완료 조건

- 페이지 전체 가로 스크롤 없음
- 코드·표는 자체 스크롤 영역 사용
- Core Topics와 Featured가 한 열에서도 이해 가능
- 검색 modal이 화면과 키보드에 가리지 않음

## 우선순위

```text
P0
```

---

<!-- source message: 51 -->

# H-19. Visual Canary 세트

모든 페이지 screenshot을 보존하지 않는다.

대표적인 문제 페이지 5개 정도만 선정한다.

## 권장 Canary

```text
홈
PCIe & CXL Hub
코드 블록이 가장 많은 글
표·다이어그램이 많은 글
검색 modal 열린 상태
```

추가로 다크모드 대표 글 1개를 포함할 수 있다.

## Screenshot 상태

```text
Desktop light
Mobile light
대표 페이지 dark
```

## 안정화 조건

- 외부 광고·댓글 mock 또는 제외
- 날짜·현재 시간 고정
- font 고정
- animation 비활성화
- 동일 브라우저 환경

## 완료 조건

- 주요 CSS 변경에서 실행
- 작은 렌더링 차이에 과민하지 않은 threshold 사용
- 결과 diff를 사람이 볼 수 있음
- 실패 시 무조건 snapshot 갱신하지 않음

## 우선순위

```text
P1
```

---

<!-- source message: 51 -->

# H-20. 코드 블록 회귀 검사

기술 블로그의 핵심 UI다.

## 시나리오

```text
짧은 코드
긴 코드
긴 한 줄
한글 주석
로그
명령과 출력
line highlight
파일명 표시
복사
```

## 검사

```text
강제 wrap 여부
가로 스크롤
복사 결과 원문 일치
복사 버튼 겹침
line number alignment
다크모드 대비
```

## 복사 결과

UI용 line number나 강조 markup이 clipboard에 들어가면 안 된다.

```text
화면:
1 int main() {

복사:
int main() {
```

## 완료 조건

- 코드 원문이 정확히 복사됨
- 모바일에서 첫 줄이 버튼에 가리지 않음
- 로그·출력이 불필요한 syntax grammar를 사용하지 않음
- 장문 코드 페이지 DOM 회귀 추적

## 우선순위

```text
P1
```

---

<!-- source message: 51 -->

# H-21. 표와 다이어그램 회귀 검사

## 표

```text
wide table
긴 identifier
많은 열
모바일
인쇄
```

검사:

```text
페이지 viewport 확장 없음
가로 스크롤 영역 명확
header cell 존재
caption 존재 여부
```

## 다이어그램

```text
SVG 렌더링
viewBox
text clipping
모바일 축소
alt·본문 설명
```

## 완료 조건

- 대표 표와 SVG를 canary로 지정
- 생성 성공뿐 아니라 실제 렌더링 확인
- 텍스트가 잘리지 않음
- 색만으로 관계를 구분하지 않음

## 우선순위

```text
P1
```

---

<!-- source message: 51 -->

# H-22. 보안 회귀 검사

매 release build에서 다음을 자동 검사한다.

```text
secret pattern
private key header
.env 파일
admin route
OAuth secret 문자열
unsafe innerHTML 위치
금지 iframe domain
workflow permissions
```

## Production artifact 검사

다음을 검색한다.

```text
client_secret
ghp_
Authorization:
BEGIN PRIVATE KEY
/admin
```

오탐을 줄이기 위해 예제 placeholder allowlist를 제한적으로 둔다.

## 완료 조건

- 실제 가능성이 높은 secret은 build 차단
- 민감 파일은 artifact 생성 단계에서 차단
- production 관리자 코드 존재 시 오류
- allowlist가 전체 디렉터리 단위가 아님

## 우선순위

```text
P0
```

---

<!-- source message: 51 -->

# H-23. GitHub Actions Lint

검사할 내용:

```text
permissions 명시
write-all 금지
Action full SHA
사용하지 않는 secret
pull_request_target 위험 패턴
deploy job 권한 분리
```

## 오류 예

```text
ERROR:
Third-party action `vendor/action@v2` is not pinned to a full commit SHA.
```

```text
ERROR:
Build job requests `contents: write`.
Expected: `contents: read`.
```

## 완료 조건

- workflow 변경 PR에서 자동 실행
- 제3자 action mutable tag 차단
- deploy 외 job의 불필요 write 권한 차단
- 위험한 `pull_request_target` 사용 감지

## 우선순위

```text
P0
```

---

<!-- source message: 51 -->

# H-24. 성능 회귀 기준

Task 3-5에서 만든 build metrics를 비교한다.

## 추적 지표

```text
release build duration
Peak RSS
검색 인덱스 크기
홈 JavaScript
대표 Guide HTML
dist 총량
```

## 초기 정책

먼저 warning으로 시작한다.

```text
Build time +20%
Peak RSS +20%
Search index +20%
Homepage JS +15%
Canary HTML +20%
```

## 주의

콘텐츠가 실제로 많이 늘어난 경우와 구조적 회귀를 구분한다.

따라서 함께 기록한다.

```text
문서 수
코드 블록 수
이미지 수
변경 파일 수
```

## 완료 조건

- 이전 release와 비교 가능
- 갑작스러운 증가가 PR에서 보임
- 초기에 warning으로 운영
- 충분한 baseline 뒤 blocker 범위 검토

## 우선순위

```text
P1
```

---

<!-- source message: 51 -->

# H-25. 외부 Integration 실패 테스트

댓글·Analytics·AdSense·외부 폰트를 차단한 상태에서 페이지를 연다.

## 기대 결과

```text
본문 정상
내비게이션 정상
내부 검색 또는 fallback 정상
레이아웃 유지
오류가 사용자에게 과도하게 노출되지 않음
```

## 테스트 방법

브라우저에서 관련 domain 요청을 block하거나 test 환경에서 script URL을 실패시키는 방식으로 확인한다.

## 완료 조건

- Giscus 실패가 본문을 깨뜨리지 않음
- 광고 실패 시 큰 빈 공간이 남지 않음
- Analytics 차단 시 navigation 정상
- 외부 폰트 차단 시 읽을 수 있는 fallback

## 우선순위

```text
P1
```

---

<!-- source message: 51 -->

# H-26. 광고 제외 페이지 회귀 검사

승인 후 광고를 적용할 경우 반드시 자동 검사한다.

## 광고가 없어야 하는 페이지

```text
404
Search
Admin
Draft
Privacy
Contact
Superseded
Archived
빈 Tag
```

## 검사 방법

최종 HTML에서 광고 script와 slot markup 존재 여부를 확인한다.

## Article 조건

```text
status=current
adsEligible=true
publisher content 존재
```

글자 수 하나만으로 판정하지 않는다.

## 완료 조건

- 광고 script가 global layout에 무조건 삽입되지 않음
- 제외 페이지에 광고 markup 0개
- 상태 변경 시 광고 eligibility가 자동 반영
- 광고 없는 상태에서도 레이아웃 완전

## 우선순위

```text
P1
```

---

<!-- source message: 51 -->

# H-27. 출시 전 수동 대표 문서 리뷰

자동화로 기술 정확성을 판정할 수 없다.

대표 문서 10개에 대해 마지막 수동 리뷰를 진행한다.

## 공통

```text
[ ] 제목이 실제 질문과 일치
[ ] description이 고유함
[ ] 핵심 결론에 근거가 있음
[ ] 관찰과 가설이 구분됨
[ ] 버전·환경이 필요하면 표시됨
[ ] 적용 범위와 한계가 있음
[ ] 구판 링크가 최신 문서를 방해하지 않음
[ ] 다음 학습 경로가 있음
```

## Source Walkthrough

```text
[ ] commit 또는 tag
[ ] file과 symbol
[ ] 현재 소스와 차이 가능성
```

## Experiment

```text
[ ] baseline
[ ] 반복 횟수
[ ] 결과 단위
[ ] 일반화 한계
```

## Debug Note

```text
[ ] 증상
[ ] 정상 기대값
[ ] 제외한 가설
[ ] 해결 후 검증
```

## 완료 조건

- 대표 글 10개 리뷰 완료 기록
- 리뷰 중 발견한 중대한 오류 수정
- 검증하지 못한 글은 `current`로 강제하지 않음
- Featured 목록과 리뷰 결과 일치

## 우선순위

```text
P0
```

---

<!-- source message: 51 -->

# H-28. 단계적 출시 전략

홈, Hub, metadata, 검색, 색인, 빌드를 모두 한 번에 배포하면 원인 추적이 어렵다.

## Release 1: 콘텐츠 기반

```text
상태·타입 schema
대표 글 metadata
Topic registry
```

사용자 화면 변화는 최소화한다.

## Release 2: 탐색 구조

```text
홈 개편
Topic Hub
Featured Guides
역할 기반 다음 글
```

## Release 3: 검색·색인

```text
SearchDocument
alias
상태 ranking
Sitemap
canonical
tag 정책
```

## Release 4: 파이프라인

```text
Content Manifest
Publication Policy
CI build 1회
smoke test
```

## Release 5: 신뢰·정책

```text
About
Privacy
Editorial Policy
보안·외부 integration 정리
```

실제로는 일부를 합칠 수 있지만, 데이터 구조와 UI·SEO 대규모 변경을 한 번에 섞지 않는 것이 중요하다.

## 완료 조건

- 각 release가 독립적으로 rollback 가능
- migration과 redesign이 분리됨
- 각 단계에 완료 조건과 smoke test 존재
- URL 변경은 별도 검토

## 우선순위

```text
P0
```

---

<!-- source message: 51 -->

# H-29. Release Branch와 Commit 경계

## 분리할 변경

```text
기계적 front matter migration
수동 콘텐츠 수정
UI redesign
검색 알고리즘
dependency update
workflow 변경
```

각 항목을 가능한 한 별도 commit으로 둔다.

## 예시

```text
1. chore(content): add status and type fields
2. content(pcie): verify five canonical guides
3. feat(home): add core topics and featured guides
4. feat(search): add alias-aware search documents
5. ci: split build and deploy jobs
```

## 피해야 할 것

```text
홈 개편 + dependency major upgrade + 글 500개 formatter 적용
```

## 완료 조건

- 의미 변경과 formatting noise 분리
- rollback 단위가 명확
- lockfile 변경이 콘텐츠 diff에 묻히지 않음
- 대량 migration 결과를 별도 검토 가능

## 우선순위

```text
P1
```

---

<!-- source message: 51 -->

# H-30. 데이터 Migration Dry Run

Front matter나 URL을 대량 수정할 때 적용한다.

## 흐름

```text
analyze
→ dry-run
→ report
→ sample review
→ apply
→ full validation
```

## 리포트

```text
수정 파일 수
추가·변경 필드
해석 실패 파일
중복 URL
예상 redirect
```

## Idempotency

같은 migration을 두 번 실행해도 두 번째에는 변경이 없어야 한다.

## 완료 조건

- Dry run 없이 원본 수정 금지
- 실패 파일 목록 명확
- 기계적 변경과 수동 판단 분리
- 적용 후 전체 manifest 비교
- migration 전후 commit 경계 존재

## 우선순위

```text
P0
```

---

<!-- source message: 51 -->

# H-31. Rollback 계획

## 콘텐츠 rollback

문서 수정 commit을 되돌린다.

## UI rollback

기존 홈·검색 컴포넌트를 다시 활성화한다.

## 배포 rollback

이전 정상 artifact를 재배포한다.

## URL rollback

URL을 원복하기보다 redirect 정책을 유지하면서 이전 UI나 콘텐츠를 복구하는 것이 안전할 수 있다.

## 준비할 것

```text
최근 정상 artifact
commit SHA
배포 명령
domain·canonical 확인 절차
```

## 완료 조건

- 이전 artifact 재배포 가능
- rollback에 새 dependency install이 필요하지 않음
- 복구 후 대표 URL smoke test 존재
- rollback이 canonical URL을 임시 domain으로 바꾸지 않음

## 우선순위

```text
P1
```

---

<!-- source message: 51 -->

# H-32. Production Verification

배포 완료 메시지로 끝내지 않는다.

## 즉시 확인

```text
홈
Topic Hub 2개
대표 글 2개
검색
Sitemap
RSS
404
```

## 검사

```text
실제 production origin
canonical
최신 CSS·JS
검색 index version
대표 internal link
HTTPS
```

## 외부 서비스

댓글·Analytics·AdSense는 나중에 확인해도 되지만, 오류가 핵심 콘텐츠에 영향을 주지 않아야 한다.

## 완료 조건

- 실제 운영 URL에서 smoke test
- 배포 commit SHA 확인
- Sitemap과 검색 인덱스가 새 버전인지 확인
- 예상치 못한 캐시·구버전 asset 없음

## 우선순위

```text
P0
```

---

<!-- source message: 51 -->

# H-33. 출시 후 관찰 기간

기술 오류와 검색 효과는 관찰 시점이 다르다.

## 즉시 확인

```text
build
links
UI
검색 기능
404
canonical
```

## 며칠 내 확인

```text
Search Console crawling
Sitemap 처리
Google-selected canonical
Core Web Vitals 초기 이상
```

## 장기 확인

```text
검색 유입
Topic Hub 이동
대표 문서 노출
AdSense 결과
```

검색 지표를 하루 이틀 만에 평가하지 않는다.

## 완료 조건

- 즉시 기술 검증과 장기 관측을 분리
- 변경 로그와 commit 기록 존재
- 관찰 기간 중 불필요한 구조 재변경 제한

## 우선순위

```text
P1
```

---

<!-- source message: 51 -->

# H-34. 실패 Severity 정책

## Blocker

```text
production build 실패
중복 URL
깨진 핵심 내부 링크
Draft 노출
secret 탐지
Sitemap·canonical 충돌
관리 코드 production 포함
검색 JSON 파손
```

## Warning

```text
대형 코드 블록
description 부족
오래된 외부 링크
Needs Review 장기 방치
성능 예산 증가
Topic 다양성 부족
```

## Info

```text
alias 후보
통합 후보
Hub 편입 후보
환경 정보 보완 제안
```

## 완료 조건

- Warning 폭증이 blocker를 가리지 않음
- 각 rule의 배포 차단 여부가 명확
- 오탐이 많은 rule은 warning 이하
- rule마다 rationale과 수정 예시 존재

## 우선순위

```text
P0
```

---

<!-- source message: 51 -->

# H-35. CI 파이프라인 최종안

권장 흐름:

```text
Pull Request
├── Content Validation
├── Typecheck
├── Workflow Security Lint
└── 필요한 경우 Preview Build

Main
├── Content Validation
├── Production Build
├── Dist Validation
├── Browser Smoke
├── Security Scan
├── Artifact Upload
└── Deploy

Scheduled
├── External Link Audit
├── Dependency Audit
├── Content Freshness
└── Asset Audit
```

## 핵심 제약

```text
Astro full build는 한 번
Deploy job에서 재빌드하지 않음
외부 네트워크 검사는 일반 배포와 분리
```

## 완료 조건

- 테스트한 artifact를 그대로 배포
- build와 deploy 권한 분리
- 실패 위치가 명확
- scheduled audit 실패가 일반 콘텐츠 배포를 무조건 차단하지 않음

## 우선순위

```text
P0
```

---

<!-- source message: 51 -->

# H-36. 테스트 유지비 제한

다음 신호가 보이면 테스트 체계가 과도해지고 있는 것이다.

```text
사소한 문장 수정에 수십 snapshot 갱신
fixture가 실제 콘텐츠보다 복잡
flaky visual test 재실행이 일상화
대부분의 warning이 항상 무시됨
테스트 때문에 dependency가 크게 증가
```

## 유지 원칙

```text
빈번하고 치명적인 문제 자동화
드물고 의미적인 문제는 수동 리뷰
불안정한 외부 조건은 정기 audit
```

## 삭제 후보

- 실제 버그를 잡지 못하는 snapshot
- 항상 suppression되는 lint
- 구현 세부사항만 고정하는 unit test
- 운영하지 않는 브라우저 전체 matrix

## 완료 조건

- 테스트마다 보호하는 계약이 설명 가능
- 6개월간 가치가 없었던 검사는 제거 검토
- 테스트 코드가 콘텐츠 파이프라인보다 커지지 않음

## 우선순위

```text
P1
```

---

# Epic H 완료 기준

## 콘텐츠

```text
schema
상태 불변조건
slug uniqueness
내부 링크
relation integrity
Hub·Featured validation
```

## 생성물

```text
production build
publication set 일치
Sitemap·RSS·Search
dist 민감 파일 검사
```

## 브라우저

```text
대표 URL smoke
검색 modal
모바일
키보드
404
외부 script 실패
```

## SEO

```text
title·description
canonical
robots
구조화 데이터
Sitemap
```

## 보안

```text
secret scan
admin code 제외
workflow permissions
Action SHA
광고 제외 페이지
```

## 출시

```text
단계적 배포
dry-run migration
rollback
production verification
변경 로그
```

---

# Epic H 우선순위 요약

| ID | 작업 | 우선순위 | 난도 | 효과 |
|---|---|---:|---:|---:|
| H-01 | 테스트 계층 확정 | P0 | 낮음 | 높음 |
| H-02 | Content Validation | P0 | 중간 | 매우 높음 |
| H-04 | Internal Link 검사 | P0 | 중간 | 매우 높음 |
| H-05 | Relation Integrity | P0 | 중간 | 매우 높음 |
| H-06 | Hub Validation | P0 | 낮음 | 높음 |
| H-07 | Featured Validation | P0 | 낮음 | 높음 |
| H-08 | Publication Set 일치 | P0 | 중간 | 매우 높음 |
| H-09 | Production Build Test | P0 | 낮음 | 매우 높음 |
| H-10 | Dist 구조 검사 | P0 | 중간 | 높음 |
| H-11 | HTTP Smoke Test | P0 | 중간 | 매우 높음 |
| H-12 | SEO Metadata 검사 | P0 | 중간 | 매우 높음 |
| H-14 | 검색 Golden Query | P0 | 중간 | 매우 높음 |
| H-15 | 검색 UI 테스트 | P0 | 중간 | 매우 높음 |
| H-18 | 모바일 Smoke | P0 | 중간 | 매우 높음 |
| H-22 | 보안 회귀 검사 | P0 | 중간 | 매우 높음 |
| H-23 | Workflow Security Lint | P0 | 낮음 | 매우 높음 |
| H-27 | 대표 문서 수동 리뷰 | P0 | 높음 | 매우 높음 |
| H-28 | 단계적 출시 | P0 | 중간 | 매우 높음 |
| H-30 | Migration Dry Run | P0 | 중간 | 매우 높음 |
| H-32 | Production Verification | P0 | 낮음 | 매우 높음 |
| H-35 | CI 최종안 | P0 | 중간 | 매우 높음 |

---

# 여덟 번째 실제 실행 묶음

처음부터 시각 회귀와 모든 브라우저 테스트까지 만들 필요는 없다.

첫 번째 안정화 배포에서는 다음만 구현한다.

```text
1. Content schema·slug·relation 검사
2. 내부 링크와 heading anchor 검사
3. Hub·Featured 상태 불변조건 검사
4. Search·Sitemap·RSS 공개 집합 일치 검사
5. Production build 1회
6. 최종 dist의 secret·admin·민감 파일 검사
7. 홈·Hub·대표 글·검색·404 HTTP smoke test
8. Golden query 20개 테스트
9. 모바일 viewport 가로 overflow 검사
10. Workflow permission·Action SHA lint
11. 테스트한 artifact를 그대로 배포
12. 운영 URL에서 대표 페이지 재검증
```

이 수준만으로도 지금까지 A~G에서 만든 핵심 구조의 대부분을 보호할 수 있다.

# 이번 단계의 핵심 결론

테스트의 목표는 리팩토링을 어렵게 만드는 것이 아니다.

> 콘텐츠 정체성, 대표 문서, URL, 검색, 색인, 배포 결과가 조용히 다시 무너지는 것을 막는 것이 목표다.

`hawk90.github.io`에서 가장 가치가 높은 테스트는 작은 UI 컴포넌트의 내부 구현보다 다음을 보호하는 테스트다.

```text
대표 문서가 current인가
Hub 링크가 실제 문서인가
구판이 검색·Featured에 나타나지 않는가
Sitemap과 canonical이 일치하는가
검색이 올바른 글을 찾는가
최종 dist에 민감한 파일이 없는가
모바일에서 기술 문서를 읽을 수 있는가
```

다음 단계는 **Task 3-9. 전체 실행 로드맵과 스프린트 계획**이다. 지금까지 A~H의 백로그를 2주·6주·12주 단위로 압축하고, 의존성·우선순위·완료 기준을 실제 실행 순서로 묶는 단계다.

<!-- source message: 61 -->

## ARC-01. Domain 기본 모델 생성

```text
ContentType
ContentStatus
ContentDocument
TopicDefinition
PublicationDecision
```

<!-- source message: 61 -->

## ARC-02. Astro Entry Normalizer 생성

```text
CollectionEntry
→ ContentDocument
```

<!-- source message: 61 -->

## ARC-03. Content Manifest 생성

```text
byId
byUrl
documents
```

<!-- source message: 61 -->

## ARC-04. Publication Policy 중앙화

```text
render
index
search
sitemap
rss
featured
ads
```

<!-- source message: 61 -->

## ARC-05. Topic Registry 이동

현재 흩어진 카테고리·Topic 상수를 한 곳으로 통합한다.

<!-- source message: 61 -->

## ARC-06. Home Featured Curation 이동

front matter나 컴포넌트 내부 배열을 Domain Curation으로 이동한다.

<!-- source message: 61 -->

## ARC-07. Topic Hub Query 작성

```text
Start Here
Featured
자동 Article 목록
```

<!-- source message: 61 -->

## ARC-08. Search Generator를 Manifest 기반으로 변경

전체 Markdown을 다시 파싱하지 않게 한다.

<!-- source message: 61 -->

## ARC-09. Sitemap과 RSS를 Publication Policy에 연결

<!-- source message: 61 -->

## ARC-10. 기존 중복 loader 삭제

---

# 58. 권장 커밋 순서

```text
1. refactor(domain): add normalized content model

2. refactor(content): build shared content manifest

3. feat(publication): centralize publication decisions

4. refactor(topic): move topic registry and curation

5. refactor(home): render featured content from domain queries

6. refactor(search): build index from content manifest

7. refactor(seo): align sitemap and RSS publication sets

8. test(domain): validate content, curation and publication rules

9. cleanup: remove duplicate content loaders
```

---

# 59. 완료 기준

이 태스크는 폴더를 모두 옮겼다고 완료되는 것이 아니다.

다음이 충족돼야 한다.

```text
Content Status 규칙을 한 파일에서 변경할 수 있다.

Featured 문서 ID가 잘못되면 build가 실패한다.

검색과 Sitemap이 같은 공개 문서 집합을 사용한다.

Topic Hub가 Markdown 파일을 직접 다시 읽지 않는다.

페이지 컴포넌트가 status별 조건문을 반복하지 않는다.

관리자·검색·광고 기능이 콘텐츠 Domain과 분리된다.

Astro를 교체하더라도 Domain Model과 Policy를 상당 부분 재사용할 수 있다.
```

# 이번 단계의 핵심 결론

좋은 디렉터리 구조의 목적은 파일을 찾기 쉽게 만드는 데만 있지 않다.

> 같은 정책이 여러 위치에 복제되지 않게 하고, 콘텐츠의 의미와 화면 표현을 분리하는 것이 진짜 목적이다.

`hawk90.github.io`에 필요한 것은 복잡한 엔터프라이즈 아키텍처가 아니다.

```text
정규화된 Content Model
하나의 Manifest
하나의 Publication Policy
명시적인 Topic·Curation
얇은 Astro Page
표현 중심 Component
```

이 여섯 가지면 충분하다.

다음 단계는 **Task 3-16. Content Manifest와 Publication Policy 실제 TypeScript 설계**다. 이번 아키텍처에서 가장 중요한 두 요소를 실제 인터페이스, 생성 흐름, validation, query와 테스트 코드 수준으로 더 구체화하는 단계다.

<!-- source message: 62 -->

## CPM-01. Content Domain 타입

```text
ContentType
ContentStatus
ContentDocument
ContentRelations
TestedEnvironment
```

<!-- source message: 62 -->

## CPM-02. Raw Entry Normalizer

```text
Astro entry
→ ContentDocument
```

<!-- source message: 62 -->

## CPM-03. Content Manifest

```text
documents
byId
byUrl
byTopic
```

<!-- source message: 62 -->

## CPM-04. 필수 Validation

```text
중복 ID
중복 URL
잘못된 Topic
없는 relation
자기 참조
```

<!-- source message: 62 -->

## CPM-05. Publication Policy

```text
current
needs-review
historical
superseded
archived
draft
```

<!-- source message: 62 -->

## CPM-06. Featured Validation

```text
current만 허용
```

<!-- source message: 62 -->

## CPM-07. Search·Sitemap Adapter

동일 Policy 결과를 사용한다.

<!-- source message: 62 -->

## CPM-08. 테스트

```text
상태 Matrix
중복 ID
없는 relation
Featured historical 차단
Draft production 제외
```

---

# 권장 커밋 순서

```text
1. feat(domain): define normalized content document model

2. refactor(content): normalize Astro entries into content documents

3. feat(content): build and validate shared content manifest

4. feat(publication): centralize document publication decisions

5. refactor(search): derive search documents from the manifest

6. refactor(seo): derive sitemap entries from publication policy

7. test(content): cover manifest and policy invariants
```

---

# 완료 기준

이 태스크는 다음이 가능해지면 완료다.

```text
한 문서의 상태를 바꾸면
검색·Sitemap·RSS·Featured 정책이 일관되게 바뀐다.

존재하지 않는 문서를 Featured나 relation에 넣으면
build가 명확하게 실패한다.

검색 생성기와 Sitemap 생성기가
Markdown을 별도로 다시 읽지 않는다.

기존 문서는 Migration Mode로 유지하고
대표 문서와 신규 문서는 Strict하게 검증할 수 있다.

Content Manifest를 브라우저에 그대로 노출하지 않고
각 기능에 필요한 최소 파생 데이터만 생성한다.
```

# 이번 단계의 핵심 결론

Content Manifest는 새로운 데이터베이스가 아니다.

> 흩어진 Markdown metadata를 한 번 정규화해서 사이트 전체가 동일한 문서 정의를 사용하도록 만드는 빌드 타임 모델이다.

Publication Policy도 복잡한 권한 시스템이 아니다.

> 문서 상태 하나가 검색·Sitemap·Featured마다 다른 의미로 해석되지 않게 하는 중앙 규칙이다.

이 두 구조만 안정적으로 만들어도 현재 블로그에서 발생할 가능성이 큰 중복 파싱, 상태 불일치, 구판 노출, 검색·Sitemap 드리프트를 상당 부분 제거할 수 있다.

<!-- source message: 64 -->

## SEA-01. SearchDocument 모델 생성

```text
제목
설명
Heading
Alias
Topic
Type
Status
```

---

<!-- source message: 64 -->

## SEA-02. Manifest 기반 검색 문서 생성

Publication Policy의 `includeInSearch`를 사용한다.

---

<!-- source message: 64 -->

## SEA-03. Terminology Alias Registry 생성

우선 핵심 용어 30개.

예:

```text
C++
MSI-X
PCIe BAR
IOMMU
Device Tree
SoftIRQ
Pinned Memory
Bank Conflict
```

---

<!-- source message: 64 -->

## SEA-04. Query 정규화 구현

```text
Unicode
대소문자
공백
하이픈
기호 보존
```

---

<!-- source message: 64 -->

## SEA-05. 검색 Adapter 구현

검색 라이브러리와 Domain 분리.

---

<!-- source message: 64 -->

## SEA-06. Golden Query 테스트

20개 검색어와 기대 결과.

---

<!-- source message: 64 -->

## SEA-07. Search Dialog 지연 로딩

검색 버튼 클릭 전 index 미요청.

---

<!-- source message: 64 -->

## SEA-08. 검색 결과 View Model

```text
Topic
Type
상태
일치 필드
```

---

<!-- source message: 64 -->

## SEA-09. 안전한 Highlight

`innerHTML` 없이 구현.

---

<!-- source message: 64 -->

## SEA-10. 결과 없음·오류 Fallback

Topic Hub와 전체 글 목록으로 연결.

---

# 69. 권장 커밋 순서

```text
1. feat(search): define minimal search document model

2. refactor(search): derive searchable documents from content manifest

3. feat(search): add terminology and technical query normalization

4. feat(search): introduce weighted search adapter

5. test(search): add golden query regression set

6. feat(search-ui): lazy-load search dialog and index

7. fix(search-ui): render safe highlights and fallback states

8. perf(search): report index size and initialization cost
```

---

# 70. 완료 기준

이 태스크는 검색창이 생겼다고 완료되는 것이 아니다.

다음이 충족돼야 한다.

```text
PCIe를 검색하면 Topic Hub와 대표 Guide가 먼저 나온다.

PCIe BAR를 검색하면 BAR 대표 Concept가 상위에 나온다.

pci_scan_child_bus를 검색하면 Linux 소스 분석 글을 찾는다.

캐시 일관성과 cache coherence가 같은 대표 글로 연결된다.

일반 검색에서 구판과 superseded 글이 대표 글을 밀어내지 않는다.

정확한 과거 버전 검색에서는 Historical 글을 찾을 수 있다.

검색을 사용하지 않으면 인덱스를 다운로드하지 않는다.

사용자 입력이 HTML로 실행되지 않는다.

검색 실패 시 Topic Hub로 계속 탐색할 수 있다.
```

# 이번 단계의 핵심 결론

기술 블로그 검색의 품질은 Fuzzy Search 알고리즘이 얼마나 복잡한지로 결정되지 않는다.

> 어떤 문서를 검색 대상으로 삼고, 어떤 필드에 의미를 부여하며, 대표 문서와 구판의 우선순위를 어떻게 정하는지가 더 중요하다.

`hawk90.github.io`에서는 다음 네 가지가 핵심이다.

```text
대표 문서 우선
기술 식별자 지원
한글·영문 Alias
상태 기반 검색 순위
```

이 네 가지가 제대로 동작하면 단순한 문자열 검색만으로도 일반 블로그 검색보다 훨씬 강한 지식 탐색 경험을 만들 수 있다.

<!-- source message: 65 -->

## REL-01. 관계 Domain 모델

```text
prerequisites
next
related
supersededBy
```

<!-- source message: 65 -->

## REL-02. 관계 정규화

빈 배열·중복 제거·ID trim.

<!-- source message: 65 -->

## REL-03. Relation Validation

```text
없는 문서
자기 참조
중복
잘못된 상태
```

<!-- source message: 65 -->

## REL-04. 역방향 Graph 생성

```text
prerequisiteOf
inbound relation
```

<!-- source message: 65 -->

## REL-05. Article Relation View Model

```text
Topic
Prerequisite
Next
Example
Replacement
```

<!-- source message: 65 -->

## REL-06. ArticleRelations UI

정적 HTML·모바일 한 열.

<!-- source message: 65 -->

## REL-07. 대표 문서 20개 매핑

문서당 관계 2~5개.

<!-- source message: 65 -->

## REL-08. 고아 문서 리포트

Current 우선.

<!-- source message: 65 -->

## REL-09. 태그 기반 추천을 fallback으로 이동

명시적 관계 우선.

<!-- source message: 65 -->

## REL-10. 내부 Redirect Link 감사

구주소 내부 링크 정리.

---

# 91. 권장 커밋 순서

```text
1. feat(relations): define document relation model

2. feat(relations): validate targets and relation invariants

3. feat(relations): build reverse prerequisite graph

4. feat(content): map representative documents to learning relations

5. feat(article): render prerequisite, next and example links

6. feat(audit): report orphan and dead-end documents

7. refactor(recommendations): prefer explicit relations over tags

8. fix(links): replace redirected internal URLs with canonical targets
```

---

# 92. 완료 기준

이 태스크는 관련 글 카드가 생겼다고 완료되는 것이 아니다.

다음이 가능해야 한다.

```text
대표 글을 읽기 전에 필요한 선행 개념을 알 수 있다.

글을 다 읽은 뒤 다음 단계가 명확하다.

Concept와 실제 Debug 사례가 연결된다.

구판은 신판으로 직접 안내된다.

대표 문서가 태그 목록 외에도 의미 있는 inbound link를 가진다.

고아 Current 문서를 식별하고 처리할 수 있다.

태그가 같다는 이유만으로 무관한 글을 추천하지 않는다.

문서 삭제·이름 변경 시 관계 오류가 build에서 발견된다.
```

# 이번 단계의 핵심 결론

내부 링크는 검색엔진을 위한 링크 수 늘리기가 아니다.

> 독자가 하나의 문서에서 다음 이해 단계로 이동하도록 만드는 학습 인터페이스다.

`hawk90.github.io`에서는 다음 관계가 특히 중요하다.

```text
원리 Concept
→ Linux·Firmware Source Walkthrough
→ 실제 FPGA·CUDA·PCIe Debug Note
```

이 연결이 잘 만들어지면 일반적인 개념 정리 블로그와 달리:

```text
왜 그런가
→ 코드에서는 어떻게 동작하는가
→ 실제 장비에서는 어떻게 실패하는가
```

까지 하나의 경로로 이어지는 기술 지식베이스가 된다.

<!-- source message: 66 -->

## ART-01. Article Page View Model

```text
Header
Status
Summary
Environment
Evidence
Relations
Revision
```

<!-- source message: 66 -->

## ART-02. Article Header 개편

Type·Topic·Description·날짜 우선순위 정리.

<!-- source message: 66 -->

## ART-03. Status Notice

Needs Review·Historical·Superseded·Archived.

<!-- source message: 66 -->

## ART-04. TL;DR 지원

대표 Guide·Concept에 선택적으로 적용.

<!-- source message: 66 -->

## ART-05. Prerequisite Notice

최대 2~3개.

<!-- source message: 66 -->

## ART-06. TOC 정리

H2·H3, 모바일 `<details>`.

<!-- source message: 66 -->

## ART-07. Code Block Role

Source·Command·Output·Log·Error.

<!-- source message: 66 -->

## ART-08. Scope·Environment·Evidence

대표 문서부터 적용.

<!-- source message: 66 -->

## ART-09. Article Relations

Topic·Prerequisite·Next·Example.

<!-- source message: 66 -->

## ART-10. Error Report·Edit Link

문서 ID와 URL 자동 포함.

<!-- source message: 66 -->

## ART-11. Mobile Article Audit

Code·Table·TOC·Heading.

<!-- source message: 66 -->

## ART-12. Type별 Quality Warning

Debug·Experiment·Source Walkthrough.

---

# 100. 권장 커밋 순서

```text
1. feat(article): add structured article page view model

2. feat(article): redesign header with type, topic and status

3. feat(article): render status notices and prerequisites

4. feat(article): add summary, environment and evidence sections

5. refactor(code): distinguish source, command, output and error blocks

6. feat(article): render role-based next reading and examples

7. feat(article): add edit and error-report actions

8. fix(article): improve mobile code, tables and table of contents

9. test(article): add content-type canary pages and smoke checks
```

---

# 101. 완료 기준

이 태스크는 Article Layout이 예뻐졌다고 완료되는 것이 아니다.

다음이 가능해야 한다.

```text
독자가 첫 화면에서 문서의 목적과 상태를 판단할 수 있다.

Historical·Needs Review 문서가 Current처럼 보이지 않는다.

긴 Guide에서 전체 구조와 현재 위치를 파악할 수 있다.

명령·출력·로그·오류가 서로 구분된다.

실험 결과가 환경·Baseline·한계와 함께 표시된다.

Source Walkthrough의 대상 Version과 Symbol을 확인할 수 있다.

본문을 다 읽은 뒤 다음 문서가 명확하다.

기술적 오류를 쉽게 제보하거나 수정 제안할 수 있다.

모바일에서 코드·표·다이어그램 때문에 페이지 전체가 깨지지 않는다.
```

# 이번 단계의 핵심 결론

좋은 기술 문서 페이지는 글의 본문만 잘 보이게 하는 Layout이 아니다.

> 독자가 문서의 신뢰 범위와 읽는 순서를 이해하고, 코드와 증거를 검토하며, 다음 학습 단계로 이동하게 만드는 인터페이스다.

`hawk90.github.io`에서는 특히 다음 흐름이 중요하다.

```text
문서의 역할과 상태
→ 핵심 모델
→ 코드·사양·관찰
→ 범위와 한계
→ 다음 개념 또는 실전 사례
```

이 흐름이 모든 대표 문서에 일관되게 적용되면 개별 게시물 모음이 아니라 실제 엔지니어링 문서 체계로 보이기 시작한다.

<!-- source message: 67 -->

## EWF-01. Content Generator

```text
type
topic
title
ID·slug
draft
템플릿
```

<!-- source message: 67 -->

## EWF-02. 신규 문서 Strict Validation

필수 metadata와 링크 검사.

<!-- source message: 67 -->

## EWF-03. Representative Validation

Featured·Start Here·대표 문서 강한 Gate.

<!-- source message: 67 -->

## EWF-04. Content Review CLI

문서 하나의 오류와 Warning 출력.

<!-- source message: 67 -->

## EWF-05. Changed Document Review

Git diff 기반 검사.

<!-- source message: 67 -->

## EWF-06. Publish Dry Run

날짜·draft·status 변경 미리보기.

<!-- source message: 67 -->

## EWF-07. Freshness Policy

Topic·Type별 재검토 후보.

<!-- source message: 67 -->

## EWF-08. Review Queue Report

Featured와 검색 유입 문서 우선.

<!-- source message: 67 -->

## EWF-09. Redaction Scan

로그·스크린샷·본문의 민감 정보 후보.

<!-- source message: 67 -->

## EWF-10. Pull Request Checklist

기술·편집·운영 검수.

---

# 95. 권장 커밋 순서

```text
1. feat(content-tools): add type-aware article generator

2. feat(validation): enforce strict rules for new documents

3. feat(validation): add representative content quality gates

4. feat(content-tools): add article review command

5. feat(content-tools): support publish dry-run and date updates

6. feat(audit): report stale and high-priority review documents

7. feat(security): scan changed content for sensitive information

8. docs(editorial): document authoring and publication workflow
```

---

# 96. 완료 기준

이 태스크는 문서 템플릿 파일이 생겼다고 완료되는 것이 아니다.

다음이 가능해야 한다.

```text
신규 글이 기본적으로 Draft와 Needs Review 상태로 생성된다.

문서 타입에 맞는 최소 골격에서 작성을 시작할 수 있다.

발행 전에 기술·편집·민감 정보 검사를 실행할 수 있다.

대표 문서는 일반 문서보다 높은 기준을 통과해야 한다.

published·updated·lastVerified가 서로 다른 의미로 관리된다.

오래된 문서는 날짜만으로 자동 폐기되지 않고 검토 Queue에 들어간다.

중요한 기술 오류를 수정했을 때 변경 이력을 남길 수 있다.

전체 과정이 복잡한 CMS 없이 Git과 CLI 안에서 수행된다.
```

# 이번 단계의 핵심 결론

좋은 기술 콘텐츠 시스템은 글을 작성하기 어렵게 만드는 검문소가 아니다.

> 작성자가 핵심 질문, 근거, 환경, 범위와 다음 읽기를 빠뜨리지 않도록 돕고, 검증되지 않은 문서가 대표 콘텐츠처럼 노출되는 것을 막는 안전장치다.

`hawk90.github.io`에 가장 적합한 흐름은 다음 정도다.

```text
간단한 문서 생성
→ 기술 검증
→ 편집 검수
→ 자동 Validation
→ 명시적 발행
→ 주기적 재검토
```

이 흐름이 자리 잡으면 기존 글을 한 번 정리하고 끝나는 것이 아니라, 앞으로 추가되는 글도 같은 품질 체계 안에서 계속 성장할 수 있다.

<!-- source message: 68 -->

## MIG-01. 전체 Content Inventory

URL·날짜·태그·코드·링크·이미지 집계.

<!-- source message: 68 -->

## MIG-02. Migration Tier와 Action 모델

```text
Representative
Valuable
Legacy
Remove or Merge
```

<!-- source message: 68 -->

## MIG-03. Topic·Type 제안 리포트

근거와 Confidence 포함.

<!-- source message: 68 -->

## MIG-04. 대표 문서 20개 수동 분류

기술 가치와 보완량 기록.

<!-- source message: 68 -->

## MIG-05. Batch Manifest 형식

적용 전 변경 계획 검토.

<!-- source message: 68 -->

## MIG-06. Dry-run Migration Script

실제 파일 수정 없이 Diff 예상 출력.

<!-- source message: 68 -->

## MIG-07. Metadata-only Migration

본문을 변경하지 않고 ID·Topic·Type·Status 적용.

<!-- source message: 68 -->

## MIG-08. Historical·Superseded 처리

환경·대체 문서 안내.

<!-- source message: 68 -->

## MIG-09. 중복 콘텐츠 후보 리포트

검색 의도와 고유 근거 비교.

<!-- source message: 68 -->

## MIG-10. Internal Link·Redirect 정리

내부 링크는 최종 Canonical로 수정.

<!-- source message: 68 -->

## MIG-11. Legacy Adapter

미마이그레이션 문서의 Build 호환 유지.

<!-- source message: 68 -->

## MIG-12. Migration Progress Report

대표성·연결성·상태 분류 중심.

---

# 99. 권장 커밋 순서

```text
1. feat(migration): inventory legacy content and URLs

2. feat(migration): define migration tiers and actions

3. feat(migration): generate topic and type suggestions

4. content: classify first representative migration batch

5. feat(migration): apply reviewed metadata manifests

6. content(pcie): verify and promote representative guides

7. content(history): mark version-specific articles as historical

8. content(cleanup): merge duplicate and superseded articles

9. fix(links): update internal links to canonical destinations

10. feat(report): track migration and content health progress
```

---

# 100. 첫 번째 실제 Batch

가장 추천하는 시작 단위는 다음이다.

```text
PCIe & CXL 관련 문서 15개
```

구성:

```text
대표 Guide 후보 3개
Concept 후보 4개
Debug Note 3개
Source Walkthrough 2개
Historical 후보 2개
중복 후보 1개 묶음
```

실행:

```text
1. 기존 URL 전부 고정
2. ID·Topic·Type 후보 작성
3. Status 수동 결정
4. 대표 3개만 기술 재검증
5. Debug Note를 Concept에 연결
6. Historical 환경 명시
7. Hub의 Start Here와 Featured에 연결
8. 검색 Golden Query에 PCIe 검색어 추가
```

이 Batch가 완료되면 나머지 Topic에도 같은 방법을 반복할 수 있다.

---

# 완료 기준

이 태스크는 모든 기존 Markdown에 새 필드가 생겼다고 완료되는 것이 아니다.

다음이 가능해야 한다.

```text
기존 콘텐츠 전체의 현재 상태와 URL을 파악할 수 있다.

대표·일반·Legacy·정리 대상 문서를 구분할 수 있다.

자동화는 후보를 제시하고 의미 판단은 사람이 수행한다.

대표 문서부터 새로운 Article·Hub·Search 구조로 이전된다.

미마이그레이션 문서도 기존 URL에서 안전하게 동작한다.

Historical과 Superseded가 Current 문서와 경쟁하지 않는다.

대량 변경을 Batch 단위로 검토하고 되돌릴 수 있다.

새로운 콘텐츠가 추가될수록 Legacy 부채가 다시 늘어나지 않는다.
```

# 이번 단계의 핵심 결론

수백 개의 기존 글을 한 번에 완벽하게 정리하려는 계획은 성공하기 어렵다.

가장 현실적인 방식은 다음이다.

```text
전체 Inventory
→ 대표 문서 우선
→ Topic별 작은 Batch
→ Metadata와 본문 분리
→ 기존 URL 보존
→ Historical·Superseded 적극 활용
→ Legacy Adapter로 공존
```

즉, 마이그레이션의 목표는 모든 과거 글을 새 글처럼 만드는 것이 아니다.

> 좋은 글을 대표 경로로 끌어올리고, 과거 글에는 정확한 역할을 부여하며, 약한 콘텐츠가 사이트 전체의 인상을 결정하지 못하게 만드는 것이다.

<!-- source message: 70 -->

## PRN-01. 기능 Inventory

```text
Core
Supporting
Editorial
Questionable
```

으로 분류한다.

<!-- source message: 70 -->

## PRN-02. Dependency Inventory

사용 위치와 Bundle·Build 영향을 기록한다.

<!-- source message: 70 -->

## PRN-03. Admin Surface 제거 또는 격리

Production Route와 번들에서 제외한다.

<!-- source message: 70 -->

## PRN-04. Client Island Audit

불필요한 `client:*`를 제거한다.

<!-- source message: 70 -->

## PRN-05. External Script Lazy Loading

댓글·광고·Analytics 실패를 격리한다.

<!-- source message: 70 -->

## PRN-06. Markdown Pipeline Audit

중복 Parser와 불필요한 Plugin을 찾는다.

<!-- source message: 70 -->

## PRN-07. Feature Flag Cleanup

전환 완료 Flag와 구 구현을 함께 삭제한다.

<!-- source message: 70 -->

## PRN-08. Build Command 통합

로컬과 CI가 같은 명령을 사용한다.

<!-- source message: 70 -->

## PRN-09. Dead Code·CSS 후보 Report

자동 삭제 없이 검토 목록 생성.

<!-- source message: 70 -->

## PRN-10. 전후 Metrics 비교

```text
Build time
Peak RSS
JavaScript
HTML
Dependency count
```

---

# 80. 권장 커밋 순서

```text
1. audit: inventory runtime features and dependencies

2. cleanup: remove unused dependencies and integrations

3. security: exclude admin tooling from production

4. perf: remove hydration from static content components

5. perf: lazy-load comments and optional integrations

6. refactor(markdown): remove duplicate parsing and plugins

7. cleanup: remove completed feature flags and legacy components

8. refactor(build): consolidate local and CI commands

9. report: compare build and bundle metrics after pruning
```

---

# 완료 기준

이 태스크는 `package.json`의 줄 수가 줄었다고 완료되는 것이 아니다.

다음 상태가 되어야 한다.

```text
JavaScript가 없어도 홈·Hub·Article을 탐색할 수 있다.

공개 사이트에 관리자·편집 기능이 포함되지 않는다.

댓글·광고·Analytics 실패가 본문을 깨뜨리지 않는다.

같은 콘텐츠를 여러 Parser가 반복 처리하지 않는다.

사용하지 않는 Feature Flag와 구 구현이 남아 있지 않다.

검색을 사용하지 않는 방문자는 검색 Index를 받지 않는다.

콘텐츠 작성 도구가 공개 Runtime과 분리돼 있다.

기능 제거 전후의 Build·Bundle 개선을 수치로 확인할 수 있다.
```

# 핵심 결론

`hawk90.github.io`에서 가장 위험한 기술적 안티패턴 중 하나는 **블로그를 잘 만들려다가 블로그 플랫폼을 만드는 것**이다.

```text
좋은 콘텐츠
+
명확한 탐색
+
작은 정적 Runtime
+
필요한 Build Tool
```

이면 충분하다.

새 기능이 생길 때마다 다음 질문을 먼저 해야 한다.

> 이 기능이 독자가 더 좋은 기술 내용을 찾고 이해하도록 돕는가, 아니면 내가 또 하나의 시스템을 만들고 싶어서 추가하는가?

<!-- source message: 71 -->

## OPS-01. Build Once, Deploy Same Artifact

Build와 Deploy를 분리하고 Artifact를 전달한다.

<!-- source message: 71 -->

## OPS-02. Workflow 권한 최소화

Build와 Deploy Job별 권한을 명시한다.

<!-- source message: 71 -->

## OPS-03. Concurrency 적용

오래된 배포가 최신 배포를 덮어쓰지 못하게 한다.

<!-- source message: 71 -->

## OPS-04. Dist Validation

```text
Draft
Admin
Secret
Canonical
Sitemap
필수 파일
```

검사.

<!-- source message: 71 -->

## OPS-05. Production Metadata

Commit SHA·Build Version을 기록한다.

<!-- source message: 71 -->

## OPS-06. Base Path·URL 검사

Production Origin과 대표 자산 URL을 검증한다.

<!-- source message: 71 -->

## OPS-07. Production Artifact Browser Smoke

개발 서버가 아니라 `dist`를 테스트한다.

<!-- source message: 71 -->

## OPS-08. Post-deploy Smoke

실제 운영 Domain의 핵심 URL을 확인한다.

<!-- source message: 71 -->

## OPS-09. Hashed Generated Assets

Search Index와 변경 자산의 Cache 불일치를 방지한다.

<!-- source message: 71 -->

## OPS-10. Redirect Validation

Chain·Cycle·Canonical 불일치를 검사한다.

<!-- source message: 71 -->

## OPS-11. External Integration 격리

댓글·광고·Analytics 실패가 본문에 영향을 주지 않게 한다.

<!-- source message: 71 -->

## OPS-12. Rollback Runbook

직전 정상 Commit으로 복구하는 절차를 문서화한다.

---

# 99. 권장 커밋 순서

```text
1. ci: separate build and pages deployment jobs

2. ci: deploy the exact tested artifact

3. security: minimize workflow permissions

4. ci: cancel superseded page deployments

5. test(dist): validate production artifacts and sensitive files

6. test(browser): run smoke checks against the static dist

7. fix(urls): validate base paths, canonical and generated assets

8. feat(ops): expose deployed commit metadata

9. test(deploy): verify critical production URLs after deployment

10. docs(ops): document rollback and incident recovery
```

---

# 100. 완료 기준

이 태스크는 GitHub Actions에 단계가 늘었다고 완료되는 것이 아니다.

다음 상태여야 한다.

```text
테스트한 산출물과 배포한 산출물이 동일하다.

오래된 Workflow가 최신 사이트를 덮어쓰지 못한다.

Draft·Admin·내부 Report가 Production에 포함되지 않는다.

로컬 개발 서버가 아니라 최종 dist를 검증한다.

Production Origin·Base Path·Canonical이 일관된다.

Search Index와 HTML의 Cache Version이 맞는다.

댓글·광고·Analytics 장애가 본문을 깨뜨리지 않는다.

현재 배포된 Commit을 확인할 수 있다.

문제가 발생하면 직전 정상 버전으로 되돌리는 절차가 명확하다.
```

# 핵심 결론

정적 사이트의 장점은 장애가 아예 없다는 것이 아니다.

> 배포 결과가 하나의 불변 Artifact이고, 외부 기능이 핵심 콘텐츠와 분리되며, 문제가 생기면 이전 정상 상태로 쉽게 돌아갈 수 있다는 데 있다.

`hawk90.github.io`의 운영 경계는 다음처럼 단순해야 한다.

```text
재현 가능한 Build
→ 최종 Artifact 검증
→ 동일 Artifact 배포
→ 운영 Smoke
→ 빠른 Rollback
```

이 다섯 단계가 안정적이면 사이트 구조를 크게 개선하는 과정에서도 Production을 안전하게 유지할 수 있다.

<!-- source message: 72 -->

## VIS-01. CSS Responsibility Audit

```text
Global
Layout
Component
Prose
Utility
```

책임과 중복 규칙을 조사한다.

<!-- source message: 72 -->

## VIS-02. Core Design Tokens 정리

```text
Text
Surface
Border
Accent
Spacing
Radius
Typography
```

만 우선 정의한다.

<!-- source message: 72 -->

## VIS-03. Container System

```text
Site
Reading
Wide
```

세 가지 폭 규칙을 정리한다.

<!-- source message: 72 -->

## VIS-04. Prose Vertical Rhythm

Heading·문단·목록·코드·표·Figure 간격을 일관화한다.

<!-- source message: 72 -->

## VIS-05. Technical Overflow Audit

```text
긴 Identifier
Code
Table
Diagram
URL
```

의 모바일 Overflow를 검사한다.

<!-- source message: 72 -->

## VIS-06. Heading·Anchor Offset

Sticky Header와 Deep Link 충돌을 제거한다.

<!-- source message: 72 -->

## VIS-07. Card Role 분리

범용 Boolean Card를 역할 중심 컴포넌트로 정리한다.

<!-- source message: 72 -->

## VIS-08. Badge·Status Density 감소

첫 화면 Metadata를 우선순위에 맞게 단순화한다.

<!-- source message: 72 -->

## VIS-09. Dark Mode Surface Audit

본문·카드·코드·Callout·표의 대비와 계층을 확인한다.

<!-- source message: 72 -->

## VIS-10. Responsive Navigation Audit

모바일 Header와 Menu에서 핵심 기능을 재정렬한다.

<!-- source message: 72 -->

## VIS-11. Accessibility Interaction Audit

```text
Focus
Target size
Hover-only
Zoom
Reduced Motion
```

을 점검한다.

<!-- source message: 72 -->

## VIS-12. Visual Canary 구성

실제 기술 콘텐츠 극단값을 포함한 대표 페이지를 고정한다.

---

# 권장 커밋 순서

```text
1. refactor(styles): separate tokens, prose and layout responsibilities

2. refactor(layout): introduce site, reading and wide containers

3. fix(prose): normalize heading and block spacing

4. fix(responsive): prevent code, tables and identifiers from breaking pages

5. refactor(cards): replace boolean-heavy cards with role-based variants

6. fix(theme): improve dark-mode surfaces and technical content contrast

7. fix(navigation): simplify mobile header and menu hierarchy

8. fix(a11y): restore focus, target size and reduced-motion behavior

9. test(visual): add representative content and viewport canaries
```

---

# 완료 기준

이 태스크는 색상과 간격이 예뻐졌다고 완료되는 것이 아니다.

다음 상태여야 한다.

```text
긴 한글 제목과 영문 식별자가 Layout을 깨뜨리지 않는다.

일반 문단은 읽기 좋은 폭을 유지하면서 코드와 표는 충분한 공간을 쓴다.

모바일에서 페이지 전체가 가로 스크롤되지 않는다.

Header·TOC·Anchor 이동이 서로 충돌하지 않는다.

Card와 Metadata가 화면마다 다른 규칙으로 증식하지 않는다.

Light·Dark Mode에서 코드·표·Callout의 의미와 대비가 유지된다.

Keyboard Focus와 Touch Target이 명확하다.

200% Zoom과 실제 기술 콘텐츠 극단값에서도 핵심 정보가 사라지지 않는다.

시각적 장식보다 콘텐츠 계층과 읽기 흐름이 우선한다.
```

# 핵심 결론

기술 블로그의 CSS는 일반 마케팅 사이트보다 더 강한 콘텐츠 내구성이 필요하다.

```text
긴 텍스트
긴 코드
넓은 표
깊은 Heading
복잡한 Figure
```

가 들어와도 매번 예외를 추가하지 않고 견뎌야 한다.

따라서 좋은 시각 구조는:

```text
소수의 Container
일관된 Vertical Rhythm
제한된 Token
명확한 Prose 규칙
역할 중심 Component
콘텐츠 기반 Breakpoint
```

로 만들어진다.

디자인 시스템의 목적은 모든 화면을 똑같이 보이게 하는 것이 아니다.

> 새로운 글과 새로운 기술 형식이 추가돼도 레이아웃이 무너지지 않게 만드는 것이다.

<!-- source message: 73 -->

## TST-01. 테스트 계층 분리

Unit·Content·Artifact·Browser의 책임을 명확히 한다.

<!-- source message: 73 -->

## TST-02. 실제 기술 문자열 Fixture

```text
C++
MSI-X
std::vector
한글 제목
긴 식별자
```

를 추가한다.

<!-- source message: 73 -->

## TST-03. Domain Policy Matrix

상태별 핵심 계약을 검증한다.

<!-- source message: 73 -->

## TST-04. Invalid Content Fixture

```text
중복 ID
잘못된 Topic
없는 Relation
Cycle
```

을 고정한다.

<!-- source message: 73 -->

## TST-05. Markdown Pipeline Fixture

Code·Table·Heading·Legacy 문법을 검증한다.

<!-- source message: 73 -->

## TST-06. Generated HTML Contract

H1·Canonical·Robots·Main 구조를 검사한다.

<!-- source message: 73 -->

## TST-07. Golden Search Queries

대표 검색어의 Top-N 회귀를 막는다.

<!-- source message: 73 -->

## TST-08. Dist Artifact Test

Draft·Admin·민감 경로가 없는지 검사한다.

<!-- source message: 73 -->

## TST-09. Browser Core Flow

Home·Hub·Article·Search를 접근 가능한 Selector로 검증한다.

<!-- source message: 73 -->

## TST-10. JavaScript Disabled Smoke

핵심 정적 탐색을 보호한다.

<!-- source message: 73 -->

## TST-11. Visual Canary 축소

전체 페이지가 아니라 위험 영역 중심으로 관리한다.

<!-- source message: 73 -->

## TST-12. Warning Baseline

기존 Warning은 추적하되 신규 부채 증가를 차단한다.

---

# 103. 권장 커밋 순서

```text
1. test(domain): cover publication and relation invariants

2. test(fixtures): add realistic technical content edge cases

3. test(content): validate the complete content manifest

4. test(markdown): protect code, tables, headings and legacy syntax

5. test(artifacts): verify generated HTML, sitemap and RSS contracts

6. test(search): add golden query ranking regressions

7. test(browser): cover core navigation and search flows

8. test(browser): verify readable pages without JavaScript

9. test(visual): limit screenshots to representative risk canaries

10. ci: separate fast checks from full regression suites
```

---

# 완료 기준

이 태스크는 테스트 개수나 Coverage가 늘었다고 완료되는 것이 아니다.

다음 상태가 되어야 한다.

```text
중복 ID 같은 데이터 오류는 브라우저 테스트 전에 발견된다.

Markdown Renderer 변경이 기존 코드·표·Anchor를 깨뜨리면 감지된다.

실제 생성 HTML의 Canonical과 H1 계약을 검사한다.

검색 결과가 존재하는지만 아니라 대표 문서 순위를 보호한다.

C++, MSI-X, 한글 같은 실제 기술 문자열이 테스트된다.

Draft와 내부 도구가 배포 Artifact에 들어가면 실패한다.

JavaScript 없이도 핵심 콘텐츠 탐색이 가능함을 확인한다.

Visual Test는 작은 문구 변경이 아니라 실제 Layout 회귀에 집중한다.

테스트 실패가 어떤 계층과 규칙의 문제인지 빠르게 알 수 있다.

전체 Suite가 느려져도 빠른 Local Check는 유지된다.
```

# 핵심 결론

`hawk90.github.io`에서 좋은 테스트 구조는 모든 것을 브라우저로 검증하거나 모든 출력을 Snapshot으로 저장하는 것이 아니다.

```text
Domain 규칙
→ 작은 빠른 테스트

실제 콘텐츠 집합
→ Manifest 검증

Markdown과 생성 파일
→ Integration 계약

사용자 핵심 흐름
→ 소수의 Browser Test

시각적 위험 영역
→ 선별된 Canary
```

이렇게 오류를 가장 가까운 계층에서 잡아야 한다.

> 테스트의 목적은 리팩터링을 막는 것이 아니라, 콘텐츠와 UI를 자유롭게 바꾸면서도 사이트의 핵심 계약은 깨지지 않는다는 확신을 주는 것이다.

<!-- source message: 75 -->

## ADS-01. Indexable URL Inventory

다음 유형별 URL 수를 집계한다.

```text
Article
Tag
Category
Pagination
Archive
Search
Hub
Draft
```

<!-- source message: 75 -->

## ADS-02. Thin Surface Audit

```text
본문 글자 수
고유 Description
목록 비율
광고 적격성
색인 상태
```

를 후보 신호로 사용한다.

글자 수만으로 자동 판정하지 않는다.

<!-- source message: 75 -->

## ADS-03. Non-content Page Policy

```text
Search
404
Tag
Pagination
Empty State
```

의 `noindex`, Sitemap, 광고 정책을 확정한다.

<!-- source message: 75 -->

## ADS-04. Representative Content Set

대표 기술 문서 10~20개를 선정한다.

<!-- source message: 75 -->

## ADS-05. Home Content Rebalance

최근 글보다 대표 Topic과 Guide를 우선한다.

<!-- source message: 75 -->

## ADS-06. Core Topic Hub 3~5개

고유 설명과 학습 경로를 작성한다.

<!-- source message: 75 -->

## ADS-07. Short-note Consolidation

같은 검색 의도의 짧은 메모를 통합한다.

<!-- source message: 75 -->

## ADS-08. Historical·Superseded Cleanup

구판이 Current와 경쟁하지 않게 한다.

<!-- source message: 75 -->

## ADS-09. About·Privacy 정비

실제 저자 경험과 사용 서비스를 정확히 설명한다.

<!-- source message: 75 -->

## ADS-10. Sitemap·Canonical Audit

색인되길 원하는 대표 URL만 일관되게 전달한다.

<!-- source message: 75 -->

## ADS-11. Ad Eligibility Map

페이지 유형별 광고 허용 여부를 중앙 정책으로 둔다.

<!-- source message: 75 -->

## ADS-12. Manual Review Checklist

재신청 전 대표·무작위 URL을 실제 브라우저에서 확인한다.

---

# 95. 권장 실행 순서

```text
1. audit(seo): inventory every indexable page type

2. fix(indexing): noindex search, empty and duplicate listing pages

3. fix(sitemap): submit only canonical content destinations

4. content: strengthen the first ten representative technical articles

5. feat(topics): publish three complete technical topic hubs

6. refactor(home): lead with expertise and representative content

7. content: consolidate overlapping short technical notes

8. content: classify obsolete articles as historical or superseded

9. docs(site): clarify author expertise and privacy practices

10. audit(ads): verify ad eligibility by page type
```

---

# 96. 가장 먼저 하지 말아야 할 일

```text
500개 글 AI 확장
모든 글에 FAQ 추가
모든 글 날짜 최신화
모든 Tag에 설명 자동 생성
글자 수 기준으로 일괄 삭제
Sitemap에 모든 URL 추가
AdSense 재신청 반복
```

이 방식은 내용의 본질보다 형식을 건드린다.

---

# 97. 가장 먼저 해야 할 일

```text
색인되는 URL 종류 파악
빈·목록·검색 페이지 정리
대표 기술 문서 선정
기존 경험과 증거를 대표 글에 드러냄
홈과 Hub에서 대표 글을 연결
구판과 짧은 메모가 대표 글과 경쟁하지 않게 함
```

새 글을 수십 개 쓰기 전에 이미 가진 콘텐츠의 강점을 보이게 하는 작업이 우선이다.

---

# 완료 기준

이 태스크는 AdSense가 승인됐다고만 완료되는 것이 아니다.

다음 상태가 되어야 한다.

```text
색인 가능한 URL 대부분이 독립적인 검색 가치를 가진다.

Tag·Search·Pagination이 Article과 같은 광고 정책을 사용하지 않는다.

홈에서 사이트의 전문 영역과 대표 문서를 즉시 알 수 있다.

대표 글에는 직접 경험·코드·실험·소스 분석 중 하나가 분명히 존재한다.

짧은 메모가 같은 검색 의도의 여러 페이지로 분산되지 않는다.

과거 문서는 환경과 상태가 명확하다.

구판·중복 URL보다 현재 Canonical 문서가 내부 링크와 Sitemap의 중심이 된다.

광고가 없어도 모든 광고 대상 페이지가 완성된 콘텐츠 페이지로 보인다.

About과 Privacy가 실제 작성자와 사이트 운영 방식을 정확히 설명한다.

재신청 전에 대표 URL과 무작위 Legacy URL을 사람이 직접 검토할 수 있다.
```

# 핵심 결론

`hawk90.github.io`의 문제는 **실제 기술 내용이 없어서**라기보다 다음일 가능성이 더 크다.

```text
강한 기술 콘텐츠가
수백 개의 짧은 메모·목록·구판·날짜순 구조 속에 묻혀 있음
```

따라서 해결은 콘텐츠를 무작정 더 만드는 것이 아니다.

```text
강한 콘텐츠를 대표 경로로 올리고
약한 URL의 색인·광고 노출을 줄이고
직접 경험과 근거를 문서 안에서 보이게 하는 것
```

이다.

Google의 공식 방향도 페이지 수나 특정 글자 수보다 **사람에게 유용하고 신뢰할 수 있으며 만족스러운 콘텐츠**, 그리고 명확하게 탐색·발견할 수 있는 사이트를 강조한다. citeturn517910search3turn517910search10turn517910search15
