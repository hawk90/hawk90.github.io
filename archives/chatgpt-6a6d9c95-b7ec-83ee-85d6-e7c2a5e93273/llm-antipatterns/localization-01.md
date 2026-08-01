---
title: "Localization and terminology (60 anti-patterns)"
category: localization
item_count: 60
---
# Localization and terminology
> LLM instructions: Treat each `AP-*` block as an atomic claim. Use `Original IDs` and `Related IDs` for traceability; do not infer that nearby blocks are duplicates.
## AP-L-01 — Korean–English Term Drift
- Category: Localization and terminology
- Original IDs: L-01
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
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
## AP-L-02 — Acronym-Only Writing
- Category: Localization and terminology
- Original IDs: L-02
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
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
## AP-L-03 — Full Name Every Time
- Category: Localization and terminology
- Original IDs: L-03
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
### 반대로 매번 풀네임 반복

### 문제

문장이 지나치게 길고 기술 글의 밀도가 떨어진다.

### 개선

첫 등장 이후 약어를 사용한다.

---
## AP-L-04 — Inconsistent Acronym Expansion
- Category: Localization and terminology
- Original IDs: L-04
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
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
## AP-L-05 — Translation by Sound
- Category: Localization and terminology
- Original IDs: L-05
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
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
## AP-L-06 — Translation by Dictionary
- Category: Localization and terminology
- Original IDs: L-06
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
### 문맥 없이 사전 뜻을 적용

예:

```text
memory ordering → 메모리 정렬
```

실제로는 문맥상 `메모리 순서` 또는 `메모리 순서 보장`에 가깝다.

### 개선

도메인 문맥을 기준으로 번역한다.

---
## AP-L-07 — Over-Translation
- Category: Localization and terminology
- Original IDs: L-07
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
### 고유 기술명을 억지로 번역

```text
Root Complex → 뿌리 복합체
```

### 문제

검색성과 정확성이 모두 떨어진다.

### 개선

고유 명칭은 원어를 유지하고 필요한 경우 의미만 설명한다.

---
## AP-L-08 — Under-Translation
- Category: Localization and terminology
- Original IDs: L-08
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
### 모든 설명을 영문 용어로만 작성

```text
The device performs enumeration and resource allocation.
```

### 문제

한국어 본문 안에서 읽기 흐름이 끊긴다.

### 개선

핵심 용어는 영문을 유지하되 문장 구조는 자연스러운 한국어로 작성한다.

---
## AP-L-09 — Half-Translated Phrase
- Category: Localization and terminology
- Original IDs: L-09
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
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
## AP-L-10 — English Noun Chain in Korean
- Category: Localization and terminology
- Original IDs: L-10
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
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
## AP-L-100 — Localization System Becomes the Product
- Category: Localization and terminology
- Original IDs: L-100
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
### 다국어 기능 개발이 콘텐츠보다 커짐

### 문제

번역 관리 UI, 자동 sync, locale routing을 만들다가 실제 대표 글 번역은 진행되지 않는다.

### 개선

대표 글 5~10개를 수동으로 번역해 실제 필요와 비용을 먼저 확인한다.

---
## AP-L-11 — No Search Alias
- Category: Localization and terminology
- Original IDs: L-11
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
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
## AP-L-12 — Korean–English Search Split
- Category: Localization and terminology
- Original IDs: L-12
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
### 한글과 영문 검색이 별개

```text
주소 변환
address translation
```

### 개선

Topic metadata에 양쪽 표현을 함께 둔다.

---
## AP-L-13 — Transliteration Search Failure
- Category: Localization and terminology
- Original IDs: L-13
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
### 음역어와 원어가 연결되지 않음

```text
코히어런시
coherency
coherence
```

### 개선

검색 정규화에서 동의어를 연결한다.

---
## AP-L-14 — Symbol Search Failure
- Category: Localization and terminology
- Original IDs: L-14
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
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
## AP-L-15 — Case-Sensitive Technical Search
- Category: Localization and terminology
- Original IDs: L-15
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
### 대소문자가 다르면 검색되지 않음

```text
CUDA
cuda
Cuda
```

### 개선

검색은 대소문자를 정규화하되 화면 표기는 canonical form을 유지한다.

---
## AP-L-16 — Version Search Ambiguity
- Category: Localization and terminology
- Original IDs: L-16
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
### 버전 검색이 일반 숫자와 섞임

```text
C++20
CUDA 12.4
Linux 6.12
```

### 개선

버전 정보를 별도 metadata로 색인한다.

---
## AP-L-17 — Alias Explosion
- Category: Localization and terminology
- Original IDs: L-17
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
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
## AP-L-18 — Search Alias Changes Display Text
- Category: Localization and terminology
- Original IDs: L-18
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
### 검색 정규화를 위해 원문까지 변환

### 문제

표준 표기와 코드 identifier가 훼손된다.

### 개선

검색용 normalized field와 화면 표시값을 분리한다.

---
## AP-L-19 — Korean Slug Everywhere
- Category: Localization and terminology
- Original IDs: L-19
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
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
## AP-L-20 — English Slug Without Meaning
- Category: Localization and terminology
- Original IDs: L-20
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
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
## AP-L-21 — Translated Slug Drift
- Category: Localization and terminology
- Original IDs: L-21
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
### 제목 번역이 바뀔 때 URL도 변경

### 문제

외부 링크와 색인이 깨진다.

### 개선

slug는 최초 확정 후 안정적으로 유지한다.

---
## AP-L-22 — Mixed Slug Policy
- Category: Localization and terminology
- Original IDs: L-22
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
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
## AP-L-23 — Acronym-Only Slug
- Category: Localization and terminology
- Original IDs: L-23
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
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
## AP-L-24 — Locale Prefix Without Multilingual Content
- Category: Localization and terminology
- Original IDs: L-24
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
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
## AP-L-25 — Duplicate Language URLs
- Category: Localization and terminology
- Original IDs: L-25
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
### 동일 콘텐츠를 `/ko/post`와 `/post`에서 모두 제공

### 문제

중복 URL이 생긴다.

### 개선

locale별 canonical과 redirect 정책을 명확히 한다.

---
## AP-L-26 — Translation as Duplicate Publication
- Category: Localization and terminology
- Original IDs: L-26
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
### 한국어 글을 그대로 영어로 기계 번역해 발행

### 문제

- 오류 가능성
- 문체 부자연스러움
- 유지보수 두 배
- 원문 업데이트가 번역에 반영되지 않음

### 개선

실제로 영어 독자가 읽을 가치가 높은 대표 글부터 선별한다.

---
## AP-L-27 — Asymmetric Translation
- Category: Localization and terminology
- Original IDs: L-27
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
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
## AP-L-28 — Translation Lag
- Category: Localization and terminology
- Original IDs: L-28
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
### 원문은 수정됐지만 번역은 오래된 상태

### 개선

번역 metadata에 source revision을 기록한다.

```yaml
translatedFrom:
sourceUpdatedAt:
translationStatus:
```

---
## AP-L-29 — Translation Without Technical Review
- Category: Localization and terminology
- Original IDs: L-29
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
### 언어만 자연스럽게 다듬고 기술 용어 검증은 없음

### 문제

전문 용어와 인과관계가 틀릴 수 있다.

### 개선

번역 후 기술적 의미를 원문과 대조한다.

---
## AP-L-30 — Machine Translation of Code Comments
- Category: Localization and terminology
- Original IDs: L-30
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
### 코드 주석까지 자동 번역

### 문제

identifier·API 이름·용어가 변형될 수 있다.

### 개선

코드는 원문을 유지하고 필요하면 코드 아래에서 설명한다.

---
## AP-L-31 — Translated Error Messages
- Category: Localization and terminology
- Original IDs: L-31
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
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
## AP-L-32 — Translated Command Output
- Category: Localization and terminology
- Original IDs: L-32
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
### 터미널 출력을 번역

### 문제

실제 환경과 비교할 수 없다.

### 개선

출력은 원문 그대로 유지하고 해석만 번역한다.

---
## AP-L-33 — Translation Without `hreflang`
- Category: Localization and terminology
- Original IDs: L-33
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
### 실제 번역 페이지가 있지만 관계 표시 없음

### 문제

적절한 언어 페이지 선택과 중복 관리가 어려워진다.

### 개선

언어별 URL 관계와 canonical 정책을 일관되게 관리한다.

---
## AP-L-34 — Canonical All Translations to One Language
- Category: Localization and terminology
- Original IDs: L-34
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
### 영어판을 한국어판 canonical로 지정

### 문제

실제 번역 페이지가 독립적인 언어 콘텐츠라면 색인 신호가 잘못될 수 있다.

### 개선

각 언어 페이지는 일반적으로 자기 canonical을 갖고 상호 언어 연결을 둔다.

---
## AP-L-35 — Partial Translation Presented as Complete
- Category: Localization and terminology
- Original IDs: L-35
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
### 일부 절만 번역됐지만 완전한 번역처럼 보임

### 개선

번역 상태를 표시한다.

```text
전체 번역
요약본
번역 진행 중
```

---
## AP-L-36 — No Terminology Registry
- Category: Localization and terminology
- Original IDs: L-36
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
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
## AP-L-37 — Glossary as a Dictionary Dump
- Category: Localization and terminology
- Original IDs: L-37
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
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
## AP-L-38 — Glossary Duplicates Articles
- Category: Localization and terminology
- Original IDs: L-38
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
### 개념 글 전체를 용어집에 복사

### 개선

용어집은 짧은 설명과 대표 Concept 링크만 제공한다.

---
## AP-L-39 — Terminology Change Without Migration
- Category: Localization and terminology
- Original IDs: L-39
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
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
## AP-L-40 — One Korean Translation per English Term
- Category: Localization and terminology
- Original IDs: L-40
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
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
## AP-L-41 — Same Korean Word for Distinct Terms
- Category: Localization and terminology
- Original IDs: L-41
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
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
## AP-L-42 — Coherence–Consistency Collapse
- Category: Localization and terminology
- Original IDs: L-42
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
### 캐시 일관성과 데이터 일관성을 같은 표현으로 처리

### 문제

메모리 모델과 분산 시스템 의미가 뒤섞인다.

### 개선

도메인별 canonical translation을 정한다.

---
## AP-L-43 — Ordering–Order Confusion
- Category: Localization and terminology
- Original IDs: L-43
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
### `memory ordering`, `execution order`, `byte order`를 비슷하게 번역

### 개선

```text
memory ordering → 메모리 순서 보장
execution order → 실행 순서
byte order → 바이트 순서
```

처럼 문맥을 구분한다.

---
## AP-L-44 — Translation Hides Specification Terms
- Category: Localization and terminology
- Original IDs: L-44
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
### 사양에 있는 정확한 이름을 번역만 제공

### 문제

원문 문서에서 해당 용어를 찾기 어렵다.

### 개선

사양 용어는 첫 등장에 원문을 병기한다.

---
## AP-L-45 — Vendor Terminology Normalization
- Category: Localization and terminology
- Original IDs: L-45
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
### 업체 고유 명칭을 일반 용어로 바꿈

### 문제

문서·도구에서 정확한 이름을 찾기 어려워진다.

### 개선

제품명·API·레지스터 이름은 원문을 유지한다.

---
## AP-L-46 — Translating Identifiers
- Category: Localization and terminology
- Original IDs: L-46
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
### 함수명·구조체명 의미를 본문에서 번역 이름으로만 표현

### 문제

소스 검색이 어렵다.

### 개선

identifier는 원문을 유지한다.

```text
`pci_bus_read_config_dword()` 함수는...
```

---
## AP-L-47 — Identifier Formatting Drift
- Category: Localization and terminology
- Original IDs: L-47
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
### 같은 identifier를 일반 텍스트와 inline code로 혼용

### 개선

함수·타입·매크로·파일 경로는 일관되게 inline code로 표시한다.

---
## AP-L-48 — Code Comments Language Switching
- Category: Localization and terminology
- Original IDs: L-48
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
### 한 코드 블록 안에서 한글·영문 주석이 무작위로 섞임

### 문제

공유성과 가독성이 떨어질 수 있다.

### 개선

예제의 대상 독자에 맞춰 한 언어를 기본으로 하고 필요한 용어만 병기한다.

---
## AP-L-49 — Korean Identifier Examples
- Category: Localization and terminology
- Original IDs: L-49
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
### 실제 코드에 한글 변수명을 사용

### 문제

가능은 하지만 독자가 일반 코드베이스에 적용하기 어렵고 일부 도구 호환성 문제가 생길 수 있다.

### 개선

코드는 업계 관행에 맞는 영문 identifier를 사용하고 설명은 한국어로 한다.

---
## AP-L-50 — Translated File Names
- Category: Localization and terminology
- Original IDs: L-50
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
### 실제 파일명을 한국어로 바꿔 설명

### 문제

저장소에서 찾을 수 없다.

### 개선

실제 파일명은 원문 그대로 표시한다.

---
## AP-L-51 — Error Code Localization
- Category: Localization and terminology
- Original IDs: L-51
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
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
## AP-L-52 — Case Normalization of Identifiers
- Category: Localization and terminology
- Original IDs: L-52
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
### 문장 스타일에 맞춰 API 대소문자를 바꿈

```text
CMake → Cmake
GitHub → Github
```

### 개선

공식 표기를 유지한다.

---
## AP-L-53 — Bilingual Title Overload
- Category: Localization and terminology
- Original IDs: L-53
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
```text
PCIe BAR 크기 탐색(Size Probing)과 주소 할당(Address Allocation) 완전 정리
```

### 문제

제목이 너무 길어진다.

### 개선

제목은 주 언어 중심으로 쓰고 영문 용어는 description이나 본문 첫 등장에 둔다.

---
## AP-L-54 — English Title, Korean Body
- Category: Localization and terminology
- Original IDs: L-54
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
### 제목은 검색을 위해 영어, 본문은 한국어

### 문제

독자 기대와 실제 언어가 다를 수 있다.

### 개선

주요 독자 언어에 맞춘 제목을 사용하고 영문 키워드는 자연스럽게 포함한다.

---
## AP-L-55 — Korean Title Without Searchable English Term
- Category: Localization and terminology
- Original IDs: L-55
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
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
## AP-L-56 — Meta Description Language Mismatch
- Category: Localization and terminology
- Original IDs: L-56
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
### 한국어 페이지의 description이 영어

### 문제

검색 결과 경험이 불일치한다.

### 개선

페이지 주 언어와 meta description 언어를 맞춘다.

---
## AP-L-57 — Mixed-Language Open Graph
- Category: Localization and terminology
- Original IDs: L-57
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
### OG 제목·설명·이미지의 언어가 서로 다름

### 개선

페이지 locale에 따라 생성물을 일관되게 만든다.

---
## AP-L-58 — Locale-Free Dates
- Category: Localization and terminology
- Original IDs: L-58
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
### 날짜가 언어와 무관한 형식으로 제각각 표시

```text
08/01/2026
2026.08.01
August 1, 2026
```

### 개선

페이지 언어와 지역 관례에 맞는 표시를 사용하되 machine-readable date는 표준 형식으로 유지한다.

---
## AP-L-59 — Localized Slug and Canonical Mismatch
- Category: Localization and terminology
- Original IDs: L-59
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
### 화면 언어는 한국어인데 canonical이 다른 locale URL을 가리킴

### 개선

locale별 canonical 정책을 자동 검증한다.

---
