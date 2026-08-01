---
title: "Catalog and review methodology (60 anti-patterns)"
category: methodology
item_count: 60
---
# Catalog and review methodology
> LLM instructions: Treat each `AP-*` block as an atomic claim. Use `Original IDs` and `Related IDs` for traceability; do not infer that nearby blocks are duplicates.
## AP-D-01 — Anti-pattern Collector
- Category: Catalog and review methodology
- Original IDs: D-01
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
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
## AP-D-01-2 — 현재 검색 구조 측정
- Category: Catalog and review methodology
- Original IDs: D-01
- Source messages: 94670747-2a28-4192-94fc-55bc12e998cc
- Merge status: canonical source
### Source material
개선 전에 현재 검색 인덱스와 결과 품질을 먼저 측정한다.
## AP-D-02 — Everything Is an Anti-pattern
- Category: Catalog and review methodology
- Original IDs: D-02
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
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
## AP-D-02-2 — 검색 문서 모델 재설계
- Category: Catalog and review methodology
- Original IDs: D-02
- Source messages: 94670747-2a28-4192-94fc-55bc12e998cc
- Merge status: canonical source
### Source material
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
## AP-D-03 — Pattern Without Context
- Category: Catalog and review methodology
- Original IDs: D-03
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
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
## AP-D-03-2 — 검색 필드 가중치 정의
- Category: Catalog and review methodology
- Original IDs: D-03
- Source messages: 94670747-2a28-4192-94fc-55bc12e998cc
- Merge status: canonical source
### Source material
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
## AP-D-04 — Technology Blaming
- Category: Catalog and review methodology
- Original IDs: D-04
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
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
## AP-D-04-2 — 한글·영문·기호 alias registry
- Category: Catalog and review methodology
- Original IDs: D-04
- Source messages: 94670747-2a28-4192-94fc-55bc12e998cc
- Merge status: canonical source
### Source material
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
## AP-D-05 — Best-Practice Absolutism
- Category: Catalog and review methodology
- Original IDs: D-05
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
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
## AP-D-05-2 — 기술 식별자 검색 지원
- Category: Catalog and review methodology
- Original IDs: D-05
- Source messages: 94670747-2a28-4192-94fc-55bc12e998cc
- Merge status: canonical source
### Source material
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
## AP-D-06 — Enterprise Solution Bias
- Category: Catalog and review methodology
- Original IDs: D-06
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
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
## AP-D-06-2 — 오류 메시지 검색 지원
- Category: Catalog and review methodology
- Original IDs: D-06
- Source messages: 94670747-2a28-4192-94fc-55bc12e998cc
- Merge status: canonical source
### Source material
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
## AP-D-07 — Novelty Bias
- Category: Catalog and review methodology
- Original IDs: D-07
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
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
## AP-D-07-2 — 대표 검색어 Golden Set 생성
- Category: Catalog and review methodology
- Original IDs: D-07
- Source messages: 94670747-2a28-4192-94fc-55bc12e998cc
- Merge status: canonical source
### Source material
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
## AP-D-08 — Rewrite Reflex
- Category: Catalog and review methodology
- Original IDs: D-08
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
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
## AP-D-08-2 — 검색 결과 UI 재설계
- Category: Catalog and review methodology
- Original IDs: D-08
- Source messages: 94670747-2a28-4192-94fc-55bc12e998cc
- Merge status: canonical source
### Source material
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
## AP-D-09 — Local Optimization
- Category: Catalog and review methodology
- Original IDs: D-09
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
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
## AP-D-09-2 — 검색 인덱스 지연 로딩
- Category: Catalog and review methodology
- Original IDs: D-09
- Source messages: 94670747-2a28-4192-94fc-55bc12e998cc
- Merge status: canonical source
### Source material
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
## AP-D-10 — Symptom Suppression
- Category: Catalog and review methodology
- Original IDs: D-10
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
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
## AP-D-10-2 — 검색 실패 fallback
- Category: Catalog and review methodology
- Original IDs: D-10
- Source messages: 94670747-2a28-4192-94fc-55bc12e998cc
- Merge status: canonical source
### Source material
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
## AP-D-100 — Anti-pattern Catalog Becomes the Product
- Category: Catalog and review methodology
- Original IDs: D-100
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
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
## AP-D-11 — Detection by Intuition Only
- Category: Catalog and review methodology
- Original IDs: D-11
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
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
## AP-D-11-2 — 고아 문서 정의
- Category: Catalog and review methodology
- Original IDs: D-11
- Source messages: 94670747-2a28-4192-94fc-55bc12e998cc
- Merge status: canonical source
### Source material
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
## AP-D-12 — Metrics-Only Detection
- Category: Catalog and review methodology
- Original IDs: D-12
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
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
## AP-D-12-2 — 고아 문서 감사 리포트
- Category: Catalog and review methodology
- Original IDs: D-12
- Source messages: 94670747-2a28-4192-94fc-55bc12e998cc
- Merge status: canonical source
### Source material
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
## AP-D-13 — Threshold by Guess
- Category: Catalog and review methodology
- Original IDs: D-13
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
### 근거 없이 임계값 설정

```text
태그는 최대 50개
글은 최소 1,500자
검색 인덱스는 1MB 이하
```

### 개선

현재 baseline과 사용자 환경을 기준으로 정한다.

---
## AP-D-13-2 — 의미 링크와 UI 링크 분리
- Category: Catalog and review methodology
- Original IDs: D-13
- Source messages: 94670747-2a28-4192-94fc-55bc12e998cc
- Merge status: canonical source
### Source material
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
## AP-D-14 — Single Snapshot Diagnosis
- Category: Catalog and review methodology
- Original IDs: D-14
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
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
## AP-D-14-2 — 내부 링크 anchor 개선
- Category: Catalog and review methodology
- Original IDs: D-14
- Source messages: 94670747-2a28-4192-94fc-55bc12e998cc
- Merge status: canonical source
### Source material
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
## AP-D-15 — Repository-Only Diagnosis
- Category: Catalog and review methodology
- Original IDs: D-15
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
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
## AP-D-15-2 — 대표 문서의 역할 기반 관계
- Category: Catalog and review methodology
- Original IDs: D-15
- Source messages: 94670747-2a28-4192-94fc-55bc12e998cc
- Merge status: canonical source
### Source material
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
## AP-D-16 — Production-Only Diagnosis
- Category: Catalog and review methodology
- Original IDs: D-16
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
### 공개 화면만 보고 내부 원인을 추정

### 문제

같은 UI 증상도 여러 구현 원인이 있을 수 있다.

### 개선

실제 config, content schema, build script와 함께 분석한다.

---
## AP-D-16-2 — 관련 글 추천 재설계
- Category: Catalog and review methodology
- Original IDs: D-16
- Source messages: 94670747-2a28-4192-94fc-55bc12e998cc
- Merge status: canonical source
### Source material
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
## AP-D-17 — Sample Bias
- Category: Catalog and review methodology
- Original IDs: D-17
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
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
## AP-D-17-2 — 구판과 신판 관계 처리
- Category: Catalog and review methodology
- Original IDs: D-17
- Source messages: 94670747-2a28-4192-94fc-55bc12e998cc
- Merge status: canonical source
### Source material
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
## AP-D-18 — Worst-Case Generalization
- Category: Catalog and review methodology
- Original IDs: D-18
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
### 가장 나쁜 글 하나로 전체 사이트를 평가

### 개선

단일 오류와 반복 패턴을 구분한다.

---
## AP-D-18-2 — Topic Cannibalization 리포트
- Category: Catalog and review methodology
- Original IDs: D-18
- Source messages: 94670747-2a28-4192-94fc-55bc12e998cc
- Merge status: canonical source
### Source material
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
## AP-D-19 — Average Hides Tail Risk
- Category: Catalog and review methodology
- Original IDs: D-19
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
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
## AP-D-19-2 — Topic Hub와 검색 역할 분리
- Category: Catalog and review methodology
- Original IDs: D-19
- Source messages: 94670747-2a28-4192-94fc-55bc12e998cc
- Merge status: canonical source
### Source material
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
## AP-D-20 — Detection Without Reproduction
- Category: Catalog and review methodology
- Original IDs: D-20
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
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
## AP-D-20-2 — 최근 검색·인기 검색 기능 보류
- Category: Catalog and review methodology
- Original IDs: D-20
- Source messages: 94670747-2a28-4192-94fc-55bc12e998cc
- Merge status: canonical source
### Source material
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
## AP-D-21 — Duplicate Anti-pattern Names
- Category: Catalog and review methodology
- Original IDs: D-21
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
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
## AP-D-21-2 — 검색 분석 최소화
- Category: Catalog and review methodology
- Original IDs: D-21
- Source messages: 94670747-2a28-4192-94fc-55bc12e998cc
- Merge status: canonical source
### Source material
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
## AP-D-22 — One Anti-pattern Covers Everything
- Category: Catalog and review methodology
- Original IDs: D-22
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
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
## AP-D-22-2 — 내부 링크 검증
- Category: Catalog and review methodology
- Original IDs: D-22
- Source messages: 94670747-2a28-4192-94fc-55bc12e998cc
- Merge status: canonical source
### Source material
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
## AP-D-23 — Micro-pattern Explosion
- Category: Catalog and review methodology
- Original IDs: D-23
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
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
## AP-D-23-2 — 검색 manifest와 공개 페이지 집합 일치
- Category: Catalog and review methodology
- Original IDs: D-23
- Source messages: 94670747-2a28-4192-94fc-55bc12e998cc
- Merge status: canonical source
### Source material
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
## AP-D-24 — Clever Name, Unclear Meaning
- Category: Catalog and review methodology
- Original IDs: D-24
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
### 재미있는 이름이지만 이해가 어려움

### 개선

이름 아래에 즉시 설명 가능한 한국어 정의를 둔다.

---
## AP-D-24-2 — 검색 성능 예산
- Category: Catalog and review methodology
- Original IDs: D-24
- Source messages: 94670747-2a28-4192-94fc-55bc12e998cc
- Merge status: canonical source
### Source material
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
## AP-D-25 — Name Implies Moral Failure
- Category: Catalog and review methodology
- Original IDs: D-25
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
### 설계 선택을 무능이나 게으름처럼 표현

### 문제

방어적인 반응을 만들고 실제 맥락을 놓친다.

### 개선

비난보다 발생 조건과 비용을 설명한다.

---
## AP-D-25-2 — 검색·관계 테스트
- Category: Catalog and review methodology
- Original IDs: D-25
- Source messages: 94670747-2a28-4192-94fc-55bc12e998cc
- Merge status: canonical source
### Source material
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
## AP-D-26 — Classification by Technology Only
- Category: Catalog and review methodology
- Original IDs: D-26
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
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
## AP-D-27 — Classification Without Cross-References
- Category: Catalog and review methodology
- Original IDs: D-27
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
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
## AP-D-28 — Taxonomy Becomes Hierarchy Debate
- Category: Catalog and review methodology
- Original IDs: D-28
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
### 어느 분류에 넣을지를 오래 고민

### 문제

실제 개선이 지연된다.

### 개선

주 분류 하나와 관련 분류 몇 개면 충분하다.

---
## AP-D-29 — Severity Embedded in Name
- Category: Catalog and review methodology
- Original IDs: D-29
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
```text
Critical Tag Explosion
Fatal SPA Blog
```

### 문제

상황별 위험도를 유연하게 평가하기 어렵다.

### 개선

이름과 현재 저장소의 severity를 분리한다.

---
## AP-D-30 — Catalog Without Versioning
- Category: Catalog and review methodology
- Original IDs: D-30
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
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
## AP-D-31 — Severity-Only Prioritization
- Category: Catalog and review methodology
- Original IDs: D-31
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
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
## AP-D-32 — Easy-Win-Only Prioritization
- Category: Catalog and review methodology
- Original IDs: D-32
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
### 쉬운 문제만 계속 해결

### 증상

- metadata 누락 수정
- 사소한 CSS 정리
- dependency 몇 개 삭제

하지만 Topic Hub와 콘텐츠 통합은 미룸.

### 개선

쉬운 작업과 구조적 작업을 함께 배치한다.

---
## AP-D-33 — User Impact Ignored
- Category: Catalog and review methodology
- Original IDs: D-33
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
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
## AP-D-34 — Maintenance Cost Ignored
- Category: Catalog and review methodology
- Original IDs: D-34
- Source messages: 0143a613-aed7-42cf-8623-bd431b5eabc7
- Merge status: canonical source
### Source material
### 사용자에게 보이는 기능만 우선

### 문제

빌드 불안정이나 migration 부채가 나중에 모든 개선을 막을 수 있다.

### 개선

사용자 영향과 미래 작업 차단 위험을 함께 본다.

---
