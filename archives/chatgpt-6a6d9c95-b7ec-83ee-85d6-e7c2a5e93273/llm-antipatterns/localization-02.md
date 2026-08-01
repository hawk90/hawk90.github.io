---
title: "Localization and terminology (40 anti-patterns)"
category: localization
item_count: 40
---
# Localization and terminology
> LLM instructions: Treat each `AP-*` block as an atomic claim. Use `Original IDs` and `Related IDs` for traceability; do not infer that nearby blocks are duplicates.
## AP-L-60 — Subject Omission Ambiguity
- Category: Localization and terminology
- Original IDs: L-60
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
### 한국어에서 주어를 계속 생략

기술 글에서는 `호스트`, `장치`, `드라이버`, `펌웨어` 중 누가 동작하는지 모호해질 수 있다.

### 개선

행위 주체가 바뀔 때는 명시한다.

---
## AP-L-61 — Pronoun Ambiguity
- Category: Localization and terminology
- Original IDs: L-61
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
```text
이것이 이를 초기화한다.
```

### 문제

어떤 객체를 의미하는지 불분명하다.

### 개선

기술 대상의 이름을 반복하는 편이 더 낫다.

---
## AP-L-62 — Passive Voice Import
- Category: Localization and terminology
- Original IDs: L-62
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
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
## AP-L-63 — Nominalization Overload
- Category: Localization and terminology
- Original IDs: L-63
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
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
## AP-L-64 — English Sentence Order in Korean
- Category: Localization and terminology
- Original IDs: L-64
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
### 긴 수식어를 앞에 계속 배치

### 문제

문장 끝까지 가야 핵심 동사를 알 수 있다.

### 개선

긴 기술 문장은 두 문장으로 나누고 결론을 앞에 둔다.

---
## AP-L-65 — Connector Overuse
- Category: Localization and terminology
- Original IDs: L-65
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
```text
따라서, 또한, 반면에, 이에 따라
```

가 매 문단 반복.

### 문제

AI형 문체처럼 보이고 문장이 기계적이다.

### 개선

논리 관계가 실제로 필요한 곳에서만 사용한다.

---
## AP-L-66 — False Friend Translation
- Category: Localization and terminology
- Original IDs: L-66
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
예:

```text
eventually → 결과적으로
```

문맥상 `마침내` 또는 `결국`일 수 있다.

### 개선

기술 문맥과 시간 관계를 확인한다.

---
## AP-L-67 — Modal Verb Loss
- Category: Localization and terminology
- Original IDs: L-67
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
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
## AP-L-68 — Specification Normative Language Collapse
- Category: Localization and terminology
- Original IDs: L-68
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
### `MUST`, `SHOULD`, `MAY`를 모두 같은 어조로 번역

### 문제

규격 요구 수준이 사라진다.

### 개선

규격의 normative keyword를 명확히 구분한다.

---
## AP-L-69 — Untranslated Idiom
- Category: Localization and terminology
- Original IDs: L-69
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
### 영문 표현을 그대로 옮겨 의미가 이상함

```text
hot path를 뜨겁게 만든다
```

### 개선

업계 관용어인지, 설명이 필요한 표현인지 구분한다.

---
## AP-L-70 — Korean Explanation Becomes More Ambiguous Than English
- Category: Localization and terminology
- Original IDs: L-70
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
### 번역 과정에서 정확한 원문보다 설명이 모호해짐

### 개선

정확성이 중요한 문장은 원문 용어와 한국어 해석을 함께 둔다.

---
## AP-L-71 — Diagram Labels in Mixed Languages
- Category: Localization and terminology
- Original IDs: L-71
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
### 한 그림 안에 한국어와 영문 라벨이 무질서하게 섞임

### 개선

한 언어를 기본으로 하고 고유 명칭만 원문 유지한다.

---
## AP-L-72 — Diagram Translation Diverges from Text
- Category: Localization and terminology
- Original IDs: L-72
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
### 본문은 `호스트 물리 주소`, 그림은 `HPA`, 표는 `Host PA`

### 문제

같은 개념인지 다시 해석해야 한다.

### 개선

첫 등장에 대응 관계를 정의하고 이후 일관되게 사용한다.

---
## AP-L-73 — Table Header Translation Drift
- Category: Localization and terminology
- Original IDs: L-73
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
### 같은 필드명이 표마다 다르게 번역

### 개선

레지스터·프로토콜 필드는 공식 원문을 유지하고 한국어 설명을 별도 열에 둔다.

---
## AP-L-74 — Translated Register Names
- Category: Localization and terminology
- Original IDs: L-74
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
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
## AP-L-75 — Unit Localization Error
- Category: Localization and terminology
- Original IDs: L-75
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
### 소수점·천 단위·단위 표기가 섞임

```text
1,5 GB/s
1.5GBps
1.5 GB/sec
```

### 개선

사이트 전체 단위 표기 규칙을 정한다.

---
## AP-L-76 — Binary–Decimal Unit Collapse
- Category: Localization and terminology
- Original IDs: L-76
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
### GB와 GiB를 혼용

### 문제

성능과 메모리 용량 비교에서 오차가 생긴다.

### 개선

측정 기준에 따라 정확한 단위를 사용한다.

---
## AP-L-77 — Full-Width Character in Code Context
- Category: Localization and terminology
- Original IDs: L-77
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
### 한국어 입력기의 전각 기호가 코드나 명령에 들어감

### 문제

복사 실행 시 오류가 발생한다.

### 개선

코드·명령 블록은 ASCII 기호를 검증한다.

---
## AP-L-78 — Translate Everything Strategy
- Category: Localization and terminology
- Original IDs: L-78
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
### 모든 글을 두 언어로 운영하려 함

### 문제

유지보수 비용이 거의 두 배가 된다.

### 개선

대표 Evergreen 글과 국제적 검색 가치가 큰 글부터 선별한다.

---
## AP-L-79 — No Translation Priority
- Category: Localization and terminology
- Original IDs: L-79
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
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
## AP-L-80 — Translation Before Source Stabilization
- Category: Localization and terminology
- Original IDs: L-80
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
### 원문이 계속 바뀌는 상태에서 번역

### 문제

번역 업데이트가 반복된다.

### 개선

대표 구조와 기술 검증이 안정된 뒤 번역한다.

---
## AP-L-81 — Separate Translation Workflow Without Sync
- Category: Localization and terminology
- Original IDs: L-81
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
### 번역본을 별도 파일로 관리하지만 연결 정보 없음

### 개선

source ID와 revision을 metadata로 관리한다.

---
## AP-L-82 — Automatic Translation Publication
- Category: Localization and terminology
- Original IDs: L-82
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
### 생성 후 검토 없이 바로 공개

### 문제

기술적 오류와 어색한 문장이 그대로 노출된다.

### 개선

Draft → 언어 검토 → 기술 검토 → 공개 순서를 둔다.

---
## AP-L-83 — One Locale Sitemap
- Category: Localization and terminology
- Original IDs: L-83
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
### 여러 언어 페이지를 운영하지만 Sitemap이 구분되지 않음

### 개선

언어별 URL 관계와 sitemap 구성을 일관되게 관리한다.

---
## AP-L-84 — Language Switch Loses Context
- Category: Localization and terminology
- Original IDs: L-84
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
### 언어를 바꾸면 홈으로 이동

### 문제

같은 글의 번역본을 찾기 어렵다.

### 개선

동일 콘텐츠 ID의 다른 언어 버전으로 이동한다.

---
## AP-L-85 — Missing Translation Fallback
- Category: Localization and terminology
- Original IDs: L-85
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
### 해당 언어 번역이 없을 때 빈 페이지 또는 404

### 개선

원문 언어로 이동할 수 있음을 명확히 안내한다.

---
## AP-L-86 — Automatic Locale Detection Override
- Category: Localization and terminology
- Original IDs: L-86
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
### 브라우저 언어에 따라 강제로 다른 페이지로 이동

### 문제

사용자가 원하는 언어를 선택하기 어렵고 검색 크롤링도 복잡해질 수 있다.

### 개선

자동 감지는 제안 수준으로 사용하고 사용자의 선택을 존중한다.

---
## AP-L-87 — Locale Stored Forever
- Category: Localization and terminology
- Original IDs: L-87
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
### 한 번 선택한 언어가 예상치 못하게 계속 강제됨

### 개선

언어 선택 상태를 명확히 보여주고 쉽게 변경할 수 있게 한다.

---
## AP-L-88 — Translated Function in Heading
- Category: Localization and terminology
- Original IDs: L-88
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
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
## AP-L-89 — Error Message Omitted from Title and Heading
- Category: Localization and terminology
- Original IDs: L-89
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
### 실제 오류 문자열은 본문 깊숙이만 존재

### 문제

정확한 오류 검색으로 유입되기 어렵다.

### 개선

핵심 오류 메시지는 제목 또는 주요 heading에 자연스럽게 포함한다.

---
## AP-L-90 — Searchable English Terms Hidden in Images
- Category: Localization and terminology
- Original IDs: L-90
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
### 다이어그램에만 영문 키워드 존재

### 문제

본문 검색과 검색엔진이 개념을 충분히 이해하지 못한다.

### 개선

중요한 라벨과 용어를 본문에서도 설명한다.

---
## AP-L-91 — Code Symbol Tokenization Failure
- Category: Localization and terminology
- Original IDs: L-91
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
### `std::vector`, `cudaMemcpyAsync`, `pci_dev`가 일반 단어로 분해

### 개선

기술 identifier 전용 검색 필드를 둔다.

---
## AP-L-92 — Punctuation-Normalized Wrongly
- Category: Localization and terminology
- Original IDs: L-92
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
### `A/B`, `C/C++`, `MSI/MSI-X`에서 의미 있는 기호 제거

### 개선

도메인별 tokenizer 규칙을 테스트한다.

---
## AP-L-93 — English Summary Without Substance
- Category: Localization and terminology
- Original IDs: L-93
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
### 영어 요약이 일반 문장 몇 줄뿐

### 문제

영문 독자가 실제 내용을 알 수 없다.

### 개선

요약을 제공한다면 핵심 문제·결론·환경을 담는다.

---
## AP-L-94 — Mixed Language Screen Reader Issue
- Category: Localization and terminology
- Original IDs: L-94
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
### 페이지 언어는 한국어인데 긴 영문 인용과 설명을 구분하지 않음

### 개선

긴 영문 문장이나 별도 인용에는 적절한 언어 정보를 제공할 수 있다. 다만 모든 약어에 과도하게 적용하지 않는다.

---
## AP-L-95 — Translation Hides Cultural Context
- Category: Localization and terminology
- Original IDs: L-95
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
### 국내 환경·제품·기관을 영문 독자가 안다고 가정

### 개선

필요한 최소 맥락을 추가한다.

---
## AP-L-96 — Local Assumptions in Global Guide
- Category: Localization and terminology
- Original IDs: L-96
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
### 시간대, 경로, 키보드, 운영체제 설정을 한국 환경 기준으로만 설명

### 개선

지역에 영향을 받는 설정은 명확히 표시한다.

---
## AP-L-97 — Locale-Specific Screenshot
- Category: Localization and terminology
- Original IDs: L-97
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
### 한글 UI 스크린샷만 제공하지만 영문 명칭으로 설명

### 문제

메뉴를 찾기 어렵다.

### 개선

화면 텍스트와 본문 명칭의 대응을 알려준다.

---
## AP-L-98 — Date Ambiguity Across Locales
- Category: Localization and terminology
- Original IDs: L-98
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
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
## AP-L-99 — Locale Changes Technical Meaning
- Category: Localization and terminology
- Original IDs: L-99
- Source messages: 1f017420-aeaa-4cd3-8f6f-bf0ee1178ae9
- Merge status: canonical source
### Source material
### 소수점, 정규식, shell locale 차이를 무시

### 문제

명령 출력과 파싱 결과가 달라질 수 있다.

### 개선

재현성이 중요한 실험에서는 locale 설정을 명시한다.

---
