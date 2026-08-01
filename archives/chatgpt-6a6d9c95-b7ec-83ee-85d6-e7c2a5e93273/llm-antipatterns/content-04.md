---
title: "Content strategy and structure (59 anti-patterns)"
category: content
item_count: 59
---
# Content strategy and structure
> LLM instructions: Treat each `AP-*` block as an atomic claim. Use `Original IDs` and `Related IDs` for traceability; do not infer that nearby blocks are duplicates.
## AP-G-41 — Publish Without a Canonical Role
- Category: Content strategy and structure
- Original IDs: G-41
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
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
## AP-G-42 — Publish Without Parent Topic
- Category: Content strategy and structure
- Original IDs: G-42
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
### 상위 주제가 없는 글

### 문제

발행 즉시 고아 문서가 된다.

### 개선

적어도 한 개의 Topic Hub에 연결한다.

---
## AP-G-43 — Publish Without Internal Links
- Category: Content strategy and structure
- Original IDs: G-43
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
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
## AP-G-44 — Publish Without Search Preview Review
- Category: Content strategy and structure
- Original IDs: G-44
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
### 실제 검색 결과에서 제목·설명이 어떻게 보일지 확인하지 않음

### 개선

모바일 너비와 일반 검색 snippet 길이에서 제목과 description을 검토한다.

---
## AP-G-45 — Publish Without Mobile Review
- Category: Content strategy and structure
- Original IDs: G-45
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
### 데스크톱만 확인

### 문제

표·코드·다이어그램·목차가 모바일에서 깨질 수 있다.

### 개선

대표 모바일 폭에서 최소 smoke review를 한다.

---
## AP-G-46 — Publish Without Production Build
- Category: Content strategy and structure
- Original IDs: G-46
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
### dev server에서만 확인

### 문제

정적 경로, base URL, generated assets, Sitemap 문제를 놓친다.

### 개선

발행 전 production build 결과를 확인한다.

---
## AP-G-47 — Publish Without Content Diff
- Category: Content strategy and structure
- Original IDs: G-47
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
### 자동화가 metadata·링크를 예상보다 많이 변경

### 개선

발행 전 파일 diff와 생성 manifest diff를 검토한다.

---
## AP-G-48 — Publication Date Manipulation
- Category: Content strategy and structure
- Original IDs: G-48
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
### 업데이트한 글을 새 글처럼 보이게 작성일 변경

### 문제

독자와 검색엔진이 문서 역사를 잘못 이해할 수 있다.

### 개선

게시일은 유지하고 수정일을 별도로 관리한다.

---
## AP-G-49 — Bulk Publication Burst
- Category: Content strategy and structure
- Original IDs: G-49
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
### 짧은 기간에 유사 글을 대량 발행

### 문제

- 독자가 소화하기 어려움
- 홈이 한 주제로 도배
- 자동 생성 인상을 줄 수 있음
- 각 글의 연결·검수가 약해질 수 있음

### 개선

시리즈 허브를 먼저 만들고, 각 글이 완결됐을 때 순차적으로 발행한다.

---
## AP-G-50 — Announcement Without Discovery Integration
- Category: Content strategy and structure
- Original IDs: G-50
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
### 새 글을 SNS에 공유하지만 사이트 내부 구조에는 반영하지 않음

### 개선

외부 홍보보다 Hub, Featured, 내부 링크에 먼저 반영한다.

---
## AP-G-51 — Update Trigger Is Only Age
- Category: Content strategy and structure
- Original IDs: G-51
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
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
## AP-G-52 — Update Means Rewrite
- Category: Content strategy and structure
- Original IDs: G-52
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
### 기존 글을 전면 재작성

### 문제

고유한 역사와 기존 링크 문맥이 사라질 수 있다.

### 개선

오류 수정, 보강, 구조 개편, 구판 대체를 구분한다.

---
## AP-G-53 — Cosmetic Update as Freshness
- Category: Content strategy and structure
- Original IDs: G-53
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
### 문장이나 날짜만 바꾸고 최신 글처럼 표시

### 문제

실제 기술 검증이 없는데 신선도 신호만 바뀐다.

### 개선

`updated`와 `lastVerified`를 분리한다.

---
## AP-G-54 — Update Without Change Summary
- Category: Content strategy and structure
- Original IDs: G-54
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
### 무엇이 달라졌는지 알 수 없음

### 개선

대표 글은 짧은 변경 내용을 표시한다.

---
## AP-G-55 — Update Breaks Incoming Search Intent
- Category: Content strategy and structure
- Original IDs: G-55
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
### 유입이 많던 내용을 삭제하고 다른 주제로 바꿈

### 문제

같은 URL이 전혀 다른 질문에 답하게 된다.

### 개선

검색 의도가 크게 달라지면 새 글을 만들고 기존 글에서 연결한다.

---
## AP-G-56 — New Version Replaces Historical Evidence
- Category: Content strategy and structure
- Original IDs: G-56
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
### 최신 버전 설명으로 과거 동작을 모두 덮어씀

### 문제

오래된 환경을 유지하는 독자와 기술 변천 기록에 불리하다.

### 개선

구판을 Historical로 유지하거나 버전별 차이를 별도 절로 보존한다.

---
## AP-G-57 — New Findings Not Propagated
- Category: Content strategy and structure
- Original IDs: G-57
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
### 대표 글은 수정했지만 관련 글은 이전 설명 유지

### 문제

사이트 내부에 서로 충돌하는 주장이 생긴다.

### 개선

콘텐츠 그래프에서 영향을 받는 글 후보를 찾는다.

---
## AP-G-58 — Update Only High-Traffic Pages
- Category: Content strategy and structure
- Original IDs: G-58
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
### 인기 없는 글은 계속 방치

### 문제

핵심 선행 개념이나 희귀 장애 글의 오류가 남는다.

### 개선

트래픽과 구조적 중요성을 함께 본다.

---
## AP-G-59 — Update Without Rechecking Links
- Category: Content strategy and structure
- Original IDs: G-59
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
### 본문을 바꾸면서 관련 링크 의미가 달라짐

### 개선

수정한 절 주변의 내부·외부 링크를 다시 검토한다.

---
## AP-G-60 — Perpetual Needs Review
- Category: Content strategy and structure
- Original IDs: G-60
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
### `needs-review` 상태만 늘어남

### 문제

상태가 경고가 아니라 무시되는 기본값이 된다.

### 개선

상태별 처리 기한과 우선순위를 둔다.

---
## AP-G-61 — Merge by Length Alone
- Category: Content strategy and structure
- Original IDs: G-61
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
### 짧은 글은 무조건 합침

### 문제

짧지만 독립적인 오류 해결·Reference 가치를 잃을 수 있다.

### 개선

길이가 아니라 검색 의도와 고유 정보로 판단한다.

---
## AP-G-62 — Merge Without Information Mapping
- Category: Content strategy and structure
- Original IDs: G-62
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
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
## AP-G-63 — Delete Without Replacement Analysis
- Category: Content strategy and structure
- Original IDs: G-63
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
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
## AP-G-64 — Redirect Everything to Homepage
- Category: Content strategy and structure
- Original IDs: G-64
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
### 삭제 글을 홈으로 전환

### 문제

사용자가 기대한 정보와 전혀 다른 페이지로 이동한다.

### 개선

가장 가까운 대체 문서로 redirect하고 없으면 명확한 404가 낫다.

---
## AP-G-65 — Superseded but Still Featured
- Category: Content strategy and structure
- Original IDs: G-65
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
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
## AP-G-66 — Historical Content Hidden
- Category: Content strategy and structure
- Original IDs: G-66
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
### 오래됐다는 이유로 가치 있는 기록을 완전히 숨김

### 문제

버전별 동작과 시스템 변화 기록을 잃는다.

### 개선

Historical 상태로 유지하되 최신 문서와 명확히 연결한다.

---
## AP-G-67 — No Tombstone Page
- Category: Content strategy and structure
- Original IDs: G-67
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
### 중요한 글을 삭제하고 URL만 사라짐

### 개선

외부 참조가 많은 문서는 짧은 대체 안내 페이지를 유지할 수 있다.

---
## AP-G-68 — Duplicate Content Kept for Sentiment
- Category: Content strategy and structure
- Original IDs: G-68
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
### 애착 때문에 유사 글을 모두 유지

### 문제

사이트 구조와 검색 의도가 계속 분열된다.

### 개선

원문은 Git history에 남아 있으므로 공개 사이트에서는 최선의 문서 구조를 우선한다.

---
## AP-G-69 — Content Retirement Without Link Cleanup
- Category: Content strategy and structure
- Original IDs: G-69
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
### redirect는 있지만 내부 링크는 모두 구주소

### 개선

내부 링크는 최종 문서로 직접 수정한다.

---
## AP-G-70 — No Retirement Record
- Category: Content strategy and structure
- Original IDs: G-70
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
### 왜 글을 합치거나 폐기했는지 모름

### 개선

간단한 콘텐츠 결정 로그를 남긴다.

---
## AP-G-71 — AI Topic Factory
- Category: Content strategy and structure
- Original IDs: G-71
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
### AI로 주제 목록을 대량 생성

### 문제

사이트 정체성, 기존 중복, 직접 경험을 고려하지 않은 아이디어가 늘어난다.

### 개선

AI는 기존 Topic 지도 안의 공백을 찾는 데 사용한다.

---
## AP-G-72 — AI Outline Determines the Argument
- Category: Content strategy and structure
- Original IDs: G-72
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
### AI가 만든 목차를 그대로 사용

### 문제

일반적인 서론–장점–단점–결론 구조가 반복된다.

### 개선

먼저 핵심 질문과 실제 증거를 정한 뒤 AI로 누락을 검토한다.

---
## AP-G-73 — AI Fills Unknowns
- Category: Content strategy and structure
- Original IDs: G-73
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
### 확인하지 못한 기술 내용을 AI 문장으로 연결

### 문제

그럴듯한 허위 내용이 들어갈 수 있다.

### 개선

모르는 부분은 `[UNKNOWN]`으로 남기고 원자료나 실험으로 확인한다.

---
## AP-G-74 — AI Citation Hallucination
- Category: Content strategy and structure
- Original IDs: G-74
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
### AI가 제시한 문서·절 번호를 그대로 사용

### 개선

모든 인용은 실제 원문에서 확인한다.

---
## AP-G-75 — AI Makes Every Article Complete
- Category: Content strategy and structure
- Original IDs: G-75
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
### 짧은 메모에도 서론·배경·결론을 자동 추가

### 문제

정보량은 같지만 분량과 일반 문장이 증가한다.

### 개선

Reference나 짧은 Debug Note는 짧고 직접적으로 유지한다.

---
## AP-G-76 — AI Removes Authorial Uncertainty
- Category: Content strategy and structure
- Original IDs: G-76
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
### “가능성이 있다”를 확정 표현으로 바꿈

### 문제

가설과 관찰의 경계가 사라진다.

### 개선

불확실성 표시는 기술적 정확성의 일부로 보존한다.

---
## AP-G-77 — AI Normalizes Specialized Terminology
- Category: Content strategy and structure
- Original IDs: G-77
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
### 정확한 도메인 표현을 일반어로 바꿈

### 문제

읽기 쉬워지지만 기술적 의미가 달라질 수 있다.

### 개선

용어 정확성을 우선하고 필요한 경우 별도 설명을 붙인다.

---
## AP-G-78 — AI Rewrite Erases Failure History
- Category: Content strategy and structure
- Original IDs: G-78
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
### 실패 과정과 시행착오를 깔끔한 성공 서사로 재작성

### 문제

실무적 고유 가치가 사라진다.

### 개선

실패한 가설과 판단 과정은 의도적으로 유지한다.

---
## AP-G-79 — AI Review Confirms Existing Bias
- Category: Content strategy and structure
- Original IDs: G-79
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
### 원하는 결론을 담은 초안을 AI에게 검토 요청

### 문제

AI가 대체로 초안의 프레임 안에서 답한다.

### 개선

반대 입장 검토를 별도로 요청하고 원자료로 판단한다.

---
## AP-G-80 — No AI Usage Boundary
- Category: Content strategy and structure
- Original IDs: G-80
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
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
## AP-G-81 — New Article Bias
- Category: Content strategy and structure
- Original IDs: G-81
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
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
## AP-G-82 — Visible Work Bias
- Category: Content strategy and structure
- Original IDs: G-82
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
### 홈 디자인이나 새 글처럼 눈에 보이는 작업만 우선

### 문제

스키마·redirect·상태 정리 같은 기반 작업이 계속 미뤄진다.

### 개선

독자에게 직접 보이지 않더라도 장기 가치가 큰 작업에 시간을 배정한다.

---
## AP-G-83 — Easy Fix Queue Dominance
- Category: Content strategy and structure
- Original IDs: G-83
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
### 간단한 오탈자와 metadata만 계속 처리

### 문제

대표 문서 재구성처럼 어려운 작업이 미뤄진다.

### 개선

작은 작업과 큰 작업을 별도 queue로 관리한다.

---
## AP-G-84 — Everything Is P0
- Category: Content strategy and structure
- Original IDs: G-84
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
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
## AP-G-85 — No Editorial Roadmap
- Category: Content strategy and structure
- Original IDs: G-85
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
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
## AP-G-86 — Roadmap as a Promise
- Category: Content strategy and structure
- Original IDs: G-86
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
### 공개 로드맵의 모든 글을 작성해야 한다고 느낌

### 문제

우선순위가 바뀌어도 계획을 유지하게 된다.

### 개선

로드맵은 방향이지 계약이 아니며 정기적으로 폐기·통합한다.

---
## AP-G-87 — No Capacity for Maintenance
- Category: Content strategy and structure
- Original IDs: G-87
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
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
## AP-G-88 — Tooling Work Disguised as Editorial Work
- Category: Content strategy and structure
- Original IDs: G-88
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
### 글을 쓰기 위해 에디터·추천 시스템부터 개발

### 문제

콘텐츠 개선이 시작되지 않는다.

### 개선

수동 작업에서 실제 병목이 반복되는지 먼저 확인한다.

---
## AP-G-89 — No Stop Condition
- Category: Content strategy and structure
- Original IDs: G-89
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
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
## AP-G-90 — Perfection Blocks Publication
- Category: Content strategy and structure
- Original IDs: G-90
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
### 모든 내용을 완벽히 확인할 때까지 발행하지 않음

### 문제

유용한 검증 결과도 오래 비공개 상태로 남는다.

### 개선

불확실성과 한계를 명시하고 현재 확인한 범위까지 발행할 수 있다.

---
## AP-G-91 — Single Quality Score
- Category: Content strategy and structure
- Original IDs: G-91
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
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
## AP-G-92 — Checklist Completion Equals Quality
- Category: Content strategy and structure
- Original IDs: G-92
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
### 항목을 모두 채우면 좋은 글

### 문제

형식은 완벽하지만 핵심 통찰이 없을 수 있다.

### 개선

체크리스트는 최소 품질 보장용이며 콘텐츠 가치는 별도 판단한다.

---
## AP-G-93 — Readability Over Accuracy
- Category: Content strategy and structure
- Original IDs: G-93
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
### 쉽게 쓰기 위해 중요한 조건을 제거

### 개선

조건을 삭제하지 말고 계층적으로 설명한다.

```text
핵심 요약
정확한 상세
예외와 한계
```

---
## AP-G-94 — Accuracy Over Usability
- Category: Content strategy and structure
- Original IDs: G-94
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
### 모든 조건과 예외를 본문 첫 부분에 넣음

### 문제

정확하지만 읽기 어려운 사양서가 된다.

### 개선

기본 모델을 먼저 설명하고 세부 예외를 별도 절로 분리한다.

---
## AP-G-95 — Originality Means Never Explaining Basics
- Category: Content strategy and structure
- Original IDs: G-95
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
### 독창성을 위해 배경 설명을 완전히 제거

### 문제

글이 독립적으로 이해되지 않는다.

### 개선

필요한 최소 배경은 제공하되, 일반 설명이 핵심 콘텐츠를 압도하지 않게 한다.

---
## AP-G-96 — Evergreen as a Requirement
- Category: Content strategy and structure
- Original IDs: G-96
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
### 모든 글이 영구적으로 유효해야 한다고 생각

### 문제

릴리스 분석, 장애 기록, 역사적 문서도 가치가 있다.

### 개선

Evergreen, Versioned, Historical 콘텐츠를 구분한다.

---
## AP-G-97 — Every Article Must Be Comprehensive
- Category: Content strategy and structure
- Original IDs: G-97
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
### 모든 글이 완전한 교과서여야 함

### 문제

짧고 정확한 Reference와 Debug Note의 장점을 잃는다.

### 개선

콘텐츠 타입별 충분함의 기준을 다르게 둔다.

---
## AP-G-98 — Every Article Must Be Searchable Alone
- Category: Content strategy and structure
- Original IDs: G-98
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
### 내부 문맥 없이도 모든 글이 완전히 독립적이어야 함

### 문제

배경 설명 중복이 증가한다.

### 개선

최소 독립성을 유지하면서 Hub·선행 문서 연결을 활용한다.

---
## AP-G-99 — No Editorial Principles
- Category: Content strategy and structure
- Original IDs: G-99
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
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
