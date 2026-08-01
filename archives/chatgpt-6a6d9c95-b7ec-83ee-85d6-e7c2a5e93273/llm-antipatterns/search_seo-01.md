---
title: "Search and SEO (60 anti-patterns)"
category: search_seo
item_count: 60
---
# Search and SEO
> LLM instructions: Treat each `AP-*` block as an atomic claim. Use `Original IDs` and `Related IDs` for traceability; do not infer that nearby blocks are duplicates.
## AP-S-01 — Search-First Content
- Category: Search and SEO
- Original IDs: S-01
- Source messages: f5f2581f-3744-41b0-a106-96d642f2a0c9
- Merge status: canonical source
### Source material
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
## AP-S-02 — Content Quantity Fallacy
- Category: Search and SEO
- Original IDs: S-02
- Source messages: f5f2581f-3744-41b0-a106-96d642f2a0c9
- Merge status: canonical source
### Source material
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
## AP-S-03 — Word-Count Padding
- Category: Search and SEO
- Original IDs: S-03
- Source messages: f5f2581f-3744-41b0-a106-96d642f2a0c9
- Merge status: canonical source
### Source material
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
## AP-S-04 — Generic AI Prose
- Category: Search and SEO
- Original IDs: S-04
- Source messages: f5f2581f-3744-41b0-a106-96d642f2a0c9
- Merge status: canonical source
### Source material
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
## AP-S-05 — AI Rewrite Without Added Value
- Category: Search and SEO
- Original IDs: S-05
- Source messages: f5f2581f-3744-41b0-a106-96d642f2a0c9
- Merge status: canonical source
### Source material
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
## AP-S-06 — Specification Translation Site
- Category: Search and SEO
- Original IDs: S-06
- Source messages: f5f2581f-3744-41b0-a106-96d642f2a0c9
- Merge status: canonical source
### Source material
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
## AP-S-07 — Aggregation Without Synthesis
- Category: Search and SEO
- Original IDs: S-07
- Source messages: f5f2581f-3744-41b0-a106-96d642f2a0c9
- Merge status: canonical source
### Source material
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
## AP-S-08 — Experience-Free Expertise
- Category: Search and SEO
- Original IDs: S-08
- Source messages: f5f2581f-3744-41b0-a106-96d642f2a0c9
- Merge status: canonical source
### Source material
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
## AP-S-09 — Authority by Bio Only
- Category: Search and SEO
- Original IDs: S-09
- Source messages: f5f2581f-3744-41b0-a106-96d642f2a0c9
- Merge status: canonical source
### Source material
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
## AP-S-10 — No Editorial Purpose
- Category: Search and SEO
- Original IDs: S-10
- Source messages: f5f2581f-3744-41b0-a106-96d642f2a0c9
- Merge status: canonical source
### Source material
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
## AP-S-11 — Thin Article
- Category: Search and SEO
- Original IDs: S-11
- Source messages: f5f2581f-3744-41b0-a106-96d642f2a0c9
- Merge status: canonical source
### Source material
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
## AP-S-12 — Thin Tag Page
- Category: Search and SEO
- Original IDs: S-12
- Source messages: f5f2581f-3744-41b0-a106-96d642f2a0c9
- Merge status: canonical source
### Source material
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
## AP-S-13 — Thin Series Page
- Category: Search and SEO
- Original IDs: S-13
- Source messages: f5f2581f-3744-41b0-a106-96d642f2a0c9
- Merge status: canonical source
### Source material
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
## AP-S-14 — Thin Category Page
- Category: Search and SEO
- Original IDs: S-14
- Source messages: f5f2581f-3744-41b0-a106-96d642f2a0c9
- Merge status: canonical source
### Source material
### 범주 설명 없이 카드만 나열

### 개선

카테고리 페이지가 직접 답해야 한다.

> 이 분야가 무엇이고, 어디서 시작하며, 어떤 순서로 읽어야 하는가?

---
## AP-S-15 — Empty Search Page Indexing
- Category: Search and SEO
- Original IDs: S-15
- Source messages: f5f2581f-3744-41b0-a106-96d642f2a0c9
- Merge status: canonical source
### Source material
### 검색 결과 페이지가 색인됨

### 문제

검색어별로 내용이 거의 없는 URL이 대량 생성될 수 있다.

### 개선

내부 검색 결과 페이지는 일반적으로 검색 색인 대상으로 만들 필요가 적다.

---
## AP-S-16 — Filter Combination Indexing
- Category: Search and SEO
- Original IDs: S-16
- Source messages: f5f2581f-3744-41b0-a106-96d642f2a0c9
- Merge status: canonical source
### Source material
### 필터 조합마다 URL과 색인 페이지 생성

```text
?topic=cpp&type=guide&year=2026
```

### 문제

유사한 목록 URL이 대량 발생한다.

### 개선

대표 Topic·Series 페이지를 제외한 임의 필터 조합은 색인 전략을 별도로 관리한다.

---
## AP-S-17 — Pagination Duplication
- Category: Search and SEO
- Original IDs: S-17
- Source messages: f5f2581f-3744-41b0-a106-96d642f2a0c9
- Merge status: canonical source
### Source material
### 페이지네이션 URL이 거의 동일한 문맥을 가짐

### 문제

각 페이지가 단순 글 카드 나열뿐이라면 독립적인 검색 유입 가치가 낮다.

### 개선

페이지네이션은 탐색 기능으로 유지하되 대표 허브의 고유 설명과 경쟁하지 않게 한다.

---
## AP-S-18 — Placeholder Page Exposure
- Category: Search and SEO
- Original IDs: S-18
- Source messages: f5f2581f-3744-41b0-a106-96d642f2a0c9
- Merge status: canonical source
### Source material
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
## AP-S-19 — Tool Page Without Publisher Content
- Category: Search and SEO
- Original IDs: S-19
- Source messages: f5f2581f-3744-41b0-a106-96d642f2a0c9
- Merge status: canonical source
### Source material
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
## AP-S-20 — Image Gallery Without Explanation
- Category: Search and SEO
- Original IDs: S-20
- Source messages: f5f2581f-3744-41b0-a106-96d642f2a0c9
- Merge status: canonical source
### Source material
### 이미지나 다이어그램만 나열

### 개선

각 이미지가 무엇을 보여주며 어떤 결론을 뒷받침하는지 설명한다.

---
## AP-S-21 — Duplicate URL Variants
- Category: Search and SEO
- Original IDs: S-21
- Source messages: f5f2581f-3744-41b0-a106-96d642f2a0c9
- Merge status: canonical source
### Source material
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
## AP-S-22 — Canonical to the Homepage
- Category: Search and SEO
- Original IDs: S-22
- Source messages: f5f2581f-3744-41b0-a106-96d642f2a0c9
- Merge status: canonical source
### Source material
### 모든 페이지 canonical이 홈을 가리킴

### 문제

개별 글이 홈과 동일한 콘텐츠가 아니므로 잘못된 canonical 신호가 된다.

### 개선

개별 글은 일반적으로 자기 URL을 canonical로 사용한다. 실제 중복 페이지일 때만 대표 페이지를 지정한다.

---
## AP-S-23 — Canonical to a Non-Equivalent Page
- Category: Search and SEO
- Original IDs: S-23
- Source messages: f5f2581f-3744-41b0-a106-96d642f2a0c9
- Merge status: canonical source
### Source material
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
## AP-S-24 — Canonical and Noindex Conflict
- Category: Search and SEO
- Original IDs: S-24
- Source messages: f5f2581f-3744-41b0-a106-96d642f2a0c9
- Merge status: canonical source
### Source material
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
## AP-S-25 — Canonical Blocked by robots.txt
- Category: Search and SEO
- Original IDs: S-25
- Source messages: f5f2581f-3744-41b0-a106-96d642f2a0c9
- Merge status: canonical source
### Source material
### 크롤러가 canonical을 확인할 수 없음

### 문제

robots.txt로 막으면 페이지 안의 canonical 요소를 읽지 못할 수 있다.

### 개선

색인을 막으려면 크롤링 가능 상태에서 `noindex`를 사용해야 한다. Google은 `noindex` 태그로 색인을 차단하는 방법을 별도로 안내한다. citeturn453314search36

---
## AP-S-26 — Duplicate Excerpts
- Category: Search and SEO
- Original IDs: S-26
- Source messages: f5f2581f-3744-41b0-a106-96d642f2a0c9
- Merge status: canonical source
### Source material
### 여러 글이 같은 서론과 description 사용

### 문제

각 페이지가 어떤 고유 질문에 답하는지 구분하기 어려워진다.

### 개선

각 문서의 차별적인 범위와 결과를 description에 작성한다.

---
## AP-S-27 — Topic Cannibalization
- Category: Search and SEO
- Original IDs: S-27
- Source messages: f5f2581f-3744-41b0-a106-96d642f2a0c9
- Merge status: canonical source
### Source material
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
## AP-S-28 — Old and New Article Competition
- Category: Search and SEO
- Original IDs: S-28
- Source messages: f5f2581f-3744-41b0-a106-96d642f2a0c9
- Merge status: canonical source
### Source material
### 구판과 신판이 동시에 검색됨

### 개선

```text
구판 상단에 대체 문서 안내
상태를 superseded로 표시
내부 링크를 신판으로 전환
필요하면 redirect 또는 canonical 검토
```

---
## AP-S-29 — Copying Content Across Series
- Category: Search and SEO
- Original IDs: S-29
- Source messages: f5f2581f-3744-41b0-a106-96d642f2a0c9
- Merge status: canonical source
### Source material
### 시리즈마다 동일한 선행 설명 반복

### 개선

대표 Concept 문서로 분리하고 시리즈 글에서는 필요한 만큼만 요약한다.

---
## AP-S-30 — Multi-Language Duplication Without hreflang
- Category: Search and SEO
- Original IDs: S-30
- Source messages: f5f2581f-3744-41b0-a106-96d642f2a0c9
- Merge status: canonical source
### Source material
### 한글·영문판 관계가 표시되지 않음

### 문제

번역 페이지가 독립적인 중복처럼 해석될 가능성이 있고 사용자가 적절한 언어 페이지를 찾기 어렵다.

### 개선

완전한 번역 페이지를 운영한다면 각 언어 URL·canonical·언어 연결 정책을 일관되게 관리한다.

---
## AP-S-31 — Sitemap as a Dump
- Category: Search and SEO
- Original IDs: S-31
- Source messages: f5f2581f-3744-41b0-a106-96d642f2a0c9
- Merge status: canonical source
### Source material
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
## AP-S-32 — Noindex but Included in Sitemap
- Category: Search and SEO
- Original IDs: S-32
- Source messages: f5f2581f-3744-41b0-a106-96d642f2a0c9
- Merge status: canonical source
### Source material
### 색인 제외 페이지가 Sitemap에 존재

### 문제

한쪽에서는 색인을 요청하고 다른 쪽에서는 막는 모순된 운영이 된다.

### 개선

Sitemap과 index 정책을 같은 manifest에서 생성한다.

---
## AP-S-33 — Draft Leakage
- Category: Search and SEO
- Original IDs: S-33
- Source messages: f5f2581f-3744-41b0-a106-96d642f2a0c9
- Merge status: canonical source
### Source material
### Draft가 정적 결과물이나 Sitemap에 포함

### 개선

빌드 단계에서 Draft를 완전히 제외하고 CI에서 검증한다.

---
## AP-S-34 — Missing Canonical in Generated Pages
- Category: Search and SEO
- Original IDs: S-34
- Source messages: f5f2581f-3744-41b0-a106-96d642f2a0c9
- Merge status: canonical source
### Source material
### 글에는 canonical이 있지만 Topic·Series에는 없음

### 개선

검색 대상이 되는 모든 페이지 유형에 canonical 정책을 정의한다.

---
## AP-S-35 — Soft 404 Article
- Category: Search and SEO
- Original IDs: S-35
- Source messages: f5f2581f-3744-41b0-a106-96d642f2a0c9
- Merge status: canonical source
### Source material
### URL은 200이지만 실질 콘텐츠가 없음

예:

```text
글을 찾을 수 없습니다.
이 콘텐츠는 이동했습니다.
```

### 개선

삭제된 페이지는 적절한 상태 코드나 관련 페이지 redirect를 사용한다.

---
## AP-S-36 — Redirect Chain
- Category: Search and SEO
- Original IDs: S-36
- Source messages: f5f2581f-3744-41b0-a106-96d642f2a0c9
- Merge status: canonical source
### Source material
### URL 변경이 누적됨

```text
A → B → C → D
```

### 문제

크롤링과 사용자 이동이 불필요하게 길어진다.

### 개선

오래된 모든 URL을 최종 URL로 직접 연결한다.

---
## AP-S-37 — Internal Links to Redirects
- Category: Search and SEO
- Original IDs: S-37
- Source messages: f5f2581f-3744-41b0-a106-96d642f2a0c9
- Merge status: canonical source
### Source material
### 사이트 내부 링크가 이전 주소를 계속 가리킴

### 개선

redirect는 외부 링크 보존용으로 사용하고 내부 링크는 최종 canonical URL로 수정한다.

---
## AP-S-38 — Uncrawlable Navigation
- Category: Search and SEO
- Original IDs: S-38
- Source messages: f5f2581f-3744-41b0-a106-96d642f2a0c9
- Merge status: canonical source
### Source material
### JavaScript 클릭 이벤트로만 페이지 이동

Google Search Essentials는 검색엔진이 페이지를 발견할 수 있도록 크롤링 가능한 링크를 만들 것을 권장한다. citeturn453314search26

### 개선

기본 `<a href>`를 유지하고 JavaScript 전환은 보조 기능으로 사용한다.

---
## AP-S-39 — Orphan Canonical Content
- Category: Search and SEO
- Original IDs: S-39
- Source messages: f5f2581f-3744-41b0-a106-96d642f2a0c9
- Merge status: canonical source
### Source material
### canonical 페이지지만 내부 링크가 없음

### 문제

Sitemap에만 존재하고 사이트 구조상 중요성이 드러나지 않는다.

### 개선

대표 허브, 시리즈 또는 관련 글에서 연결한다.

---
## AP-S-40 — Indexing Everything by Default
- Category: Search and SEO
- Original IDs: S-40
- Source messages: f5f2581f-3744-41b0-a106-96d642f2a0c9
- Merge status: canonical source
### Source material
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
## AP-S-41 — Title Template Duplication
- Category: Search and SEO
- Original IDs: S-41
- Source messages: f5f2581f-3744-41b0-a106-96d642f2a0c9
- Merge status: canonical source
### Source material
### 모든 제목이 같은 접미사를 반복

```text
PCIe BAR | Hawk Blog | Systems Notes
```

사이트 이름이 너무 길면 실제 문서 제목이 검색 결과에서 잘릴 수 있다.

### 개선

고유 제목을 우선하고 브랜드 접미사는 짧게 유지한다.

---
## AP-S-42 — Keyword-Stuffed Title
- Category: Search and SEO
- Original IDs: S-42
- Source messages: f5f2581f-3744-41b0-a106-96d642f2a0c9
- Merge status: canonical source
### Source material
### 제목에 관련 키워드를 전부 삽입

Google Search Essentials는 사용자가 검색할 표현을 제목·주요 heading·링크 문구 등 눈에 띄는 위치에 자연스럽게 사용할 것을 권장하지만, 이는 나열식 과잉 삽입을 의미하지 않는다. citeturn453314search26

### 개선

한 페이지당 하나의 주요 질문이나 결과에 집중한다.

---
## AP-S-43 — Duplicate Meta Description
- Category: Search and SEO
- Original IDs: S-43
- Source messages: f5f2581f-3744-41b0-a106-96d642f2a0c9
- Merge status: canonical source
### Source material
### 여러 페이지가 같은 설명 사용

### 개선

각 페이지에서 독자가 얻는 고유 결과를 설명한다.

---
## AP-S-44 — Automated First-Sentence Description
- Category: Search and SEO
- Original IDs: S-44
- Source messages: f5f2581f-3744-41b0-a106-96d642f2a0c9
- Merge status: canonical source
### Source material
### 본문 첫 문장을 그대로 meta description으로 사용

### 문제

첫 문장이 배경 설명이면 검색 결과에서 가치가 드러나지 않는다.

### 개선

수동 description을 핵심 글부터 작성하고, fallback도 목적·범위 중심으로 생성한다.

---
## AP-S-45 — Empty Description
- Category: Search and SEO
- Original IDs: S-45
- Source messages: f5f2581f-3744-41b0-a106-96d642f2a0c9
- Merge status: canonical source
### Source material
### description 누락

Google이 본문에서 snippet을 만들 수 있지만, 중요한 대표 글은 직접 설명을 작성하는 편이 사이트의 의도를 통제하기 쉽다.

---
## AP-S-46 — Multiple H1
- Category: Search and SEO
- Original IDs: S-46
- Source messages: f5f2581f-3744-41b0-a106-96d642f2a0c9
- Merge status: canonical source
### Source material
### 레이아웃 제목과 글 제목이 모두 H1

### 개선

페이지의 주 제목을 하나로 명확히 하고 나머지는 적절한 heading level을 사용한다.

---
## AP-S-47 — Heading for Styling
- Category: Search and SEO
- Original IDs: S-47
- Source messages: f5f2581f-3744-41b0-a106-96d642f2a0c9
- Merge status: canonical source
### Source material
### 글자 크기를 위해 heading 사용

```text
H2 다음 H5
```

### 문제

문서 구조와 목차가 왜곡된다.

### 개선

스타일은 CSS로 처리하고 heading은 의미 순서를 따른다.

---
## AP-S-48 — Structured Data Decoration
- Category: Search and SEO
- Original IDs: S-48
- Source messages: f5f2581f-3744-41b0-a106-96d642f2a0c9
- Merge status: canonical source
### Source material
### JSON-LD만 넣으면 SEO가 해결된다고 생각

Google의 구조화 데이터 가이드라인은 markup이 해당 페이지에 실제로 표시되고 설명되는 콘텐츠와 일치해야 한다고 요구한다. citeturn453314search37

### 개선

먼저 화면의 콘텐츠 모델을 정리한 뒤 구조화 데이터로 표현한다.

---
## AP-S-49 — Fabricated Structured Data
- Category: Search and SEO
- Original IDs: S-49
- Source messages: f5f2581f-3744-41b0-a106-96d642f2a0c9
- Merge status: canonical source
### Source material
### 화면에 없는 평가·저자·날짜를 markup에 추가

### 문제

구조화 데이터가 실제 콘텐츠를 정확하게 표현하지 않는다.

### 개선

화면에서 확인할 수 있는 정보만 사용한다.

---
## AP-S-50 — One Schema Type Everywhere
- Category: Search and SEO
- Original IDs: S-50
- Source messages: f5f2581f-3744-41b0-a106-96d642f2a0c9
- Merge status: canonical source
### Source material
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
## AP-S-51 — Anonymous Expert Content
- Category: Search and SEO
- Original IDs: S-51
- Source messages: f5f2581f-3744-41b0-a106-96d642f2a0c9
- Merge status: canonical source
### Source material
### 고급 기술 글인데 작성자 정보가 없음

### 개선

- 작성자 이름
- 전문 분야
- About 링크
- 수정·문의 방법

을 제공한다.

---
## AP-S-52 — Inflated Author Claim
- Category: Search and SEO
- Original IDs: S-52
- Source messages: f5f2581f-3744-41b0-a106-96d642f2a0c9
- Merge status: canonical source
### Source material
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
## AP-S-53 — No Contact Path
- Category: Search and SEO
- Original IDs: S-53
- Source messages: f5f2581f-3744-41b0-a106-96d642f2a0c9
- Merge status: canonical source
### Source material
### 오류를 발견해도 제보할 방법이 없음

### 개선

- GitHub Issue
- 이메일
- 댓글
- 수정 제안 링크

중 하나를 명확히 제공한다.

---
## AP-S-54 — Missing Privacy Policy
- Category: Search and SEO
- Original IDs: S-54
- Source messages: f5f2581f-3744-41b0-a106-96d642f2a0c9
- Merge status: canonical source
### Source material
### 분석·댓글·광고를 사용하지만 개인정보 안내가 없음

### 개선

사이트에서 실제 사용하는 서비스에 맞는 개인정보 처리방침을 제공한다.

특히 Analytics, AdSense, Giscus, 쿠키·로컬 스토리지 사용 여부를 실제 구현과 일치시켜야 한다.

---
## AP-S-55 — Template Privacy Policy
- Category: Search and SEO
- Original IDs: S-55
- Source messages: f5f2581f-3744-41b0-a106-96d642f2a0c9
- Merge status: canonical source
### Source material
### 다른 사이트 정책을 복사

### 문제

실제로 사용하지 않는 서비스가 적혀 있거나 사용 중인 서비스가 누락된다.

### 개선

현재 사이트의 데이터 흐름을 기준으로 작성한다.

---
## AP-S-56 — Missing Content Update Policy
- Category: Search and SEO
- Original IDs: S-56
- Source messages: f5f2581f-3744-41b0-a106-96d642f2a0c9
- Merge status: canonical source
### Source material
### 글이 언제·왜 수정되는지 불명확

### 개선

간단한 원칙을 공개할 수 있다.

```text
중대한 기술 오류는 즉시 수정
버전 변화는 검증 후 업데이트
역사적 글은 삭제보다 상태 표시
```

---
## AP-S-57 — No Correction History
- Category: Search and SEO
- Original IDs: S-57
- Source messages: f5f2581f-3744-41b0-a106-96d642f2a0c9
- Merge status: canonical source
### Source material
### 오류가 수정돼도 아무 표시 없음

### 개선

중요한 변경은 짧은 수정 기록을 제공한다.

---
## AP-S-58 — Broken About Page
- Category: Search and SEO
- Original IDs: S-58
- Source messages: f5f2581f-3744-41b0-a106-96d642f2a0c9
- Merge status: canonical source
### Source material
### About은 있지만 일반적인 자기소개만 있음

### 개선

About 페이지는 사이트와 콘텐츠를 이해하도록 해야 한다.

- 어떤 주제를 다루는가
- 어떤 경험을 기반으로 하는가
- 글을 어떻게 검증하는가
- 독자가 무엇을 기대할 수 있는가

---
## AP-S-59 — Missing Ownership Signal
- Category: Search and SEO
- Original IDs: S-59
- Source messages: f5f2581f-3744-41b0-a106-96d642f2a0c9
- Merge status: canonical source
### Source material
### 사이트 운영 주체가 보이지 않음

### 개선

푸터·About·저자 페이지에서 일관된 이름과 사이트 정체성을 사용한다.

---
## AP-S-60 — Unclear Affiliate or Sponsorship Disclosure
- Category: Search and SEO
- Original IDs: S-60
- Source messages: f5f2581f-3744-41b0-a106-96d642f2a0c9
- Merge status: canonical source
### Source material
### 광고·제휴·협찬 여부가 불명확

### 개선

경제적 관계가 있는 글에서는 명확히 공개한다.

---
