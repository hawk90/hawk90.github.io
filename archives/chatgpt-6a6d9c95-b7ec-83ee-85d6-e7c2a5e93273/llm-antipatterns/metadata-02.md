---
title: "Metadata and schema (30 anti-patterns)"
category: metadata
item_count: 30
---
# Metadata and schema
> LLM instructions: Treat each `AP-*` block as an atomic claim. Use `Original IDs` and `Related IDs` for traceability; do not infer that nearby blocks are duplicates.
## AP-M-61 — Source–Artifact Ambiguity
- Category: Metadata and schema
- Original IDs: M-61
- Source messages: f181338c-9c17-48e6-8abd-1c47ae2559d6
- Merge status: canonical source
### Source material
### 어떤 파일이 원본이고 생성물인지 불명확

### 문제

생성된 SVG나 OG 이미지를 직접 수정하게 된다.

### 개선

디렉터리와 파일 헤더로 source와 generated를 구분한다.

---
## AP-M-62 — Generated File Modified Manually
- Category: Metadata and schema
- Original IDs: M-62
- Source messages: f181338c-9c17-48e6-8abd-1c47ae2559d6
- Merge status: canonical source
### Source material
### 생성물을 직접 수정해 임시 해결

### 문제

다음 빌드에서 덮어씌워진다.

### 개선

원본 또는 generator를 수정한다.

---
## AP-M-63 — Artifact Naming by Display Title
- Category: Metadata and schema
- Original IDs: M-63
- Source messages: f181338c-9c17-48e6-8abd-1c47ae2559d6
- Merge status: canonical source
### Source material
### 제목 변경 시 파일명도 변경

### 문제

불필요한 삭제·생성과 링크 변화가 발생한다.

### 개선

안정적인 content ID나 slug를 사용한다.

---
## AP-M-64 — No Artifact Manifest
- Category: Metadata and schema
- Original IDs: M-64
- Source messages: f181338c-9c17-48e6-8abd-1c47ae2559d6
- Merge status: canonical source
### Source material
### 어떤 글이 어떤 OG·SVG·검색 레코드를 생성했는지 모름

### 개선

입력과 출력 관계를 manifest로 관리한다.

---
## AP-M-65 — Stale Artifact Preservation
- Category: Metadata and schema
- Original IDs: M-65
- Source messages: f181338c-9c17-48e6-8abd-1c47ae2559d6
- Merge status: canonical source
### Source material
### 원본 글이 삭제돼도 생성물이 남음

### 개선

manifest 기준 prune을 사용한다.

---
## AP-M-66 — Over-Aggressive Prune
- Category: Metadata and schema
- Original IDs: M-66
- Source messages: f181338c-9c17-48e6-8abd-1c47ae2559d6
- Merge status: canonical source
### Source material
### 현재 build에서 참조되지 않는다는 이유로 공유 자산 삭제

### 개선

공유 자산과 문서 전용 자산을 구분한다.

---
## AP-M-67 — Generator Version Not Recorded
- Category: Metadata and schema
- Original IDs: M-67
- Source messages: f181338c-9c17-48e6-8abd-1c47ae2559d6
- Merge status: canonical source
### Source material
### 어떤 버전으로 OG·SVG를 만들었는지 모름

### 문제

결과 차이를 추적하기 어렵다.

### 개선

manifest나 build metadata에 generator version을 기록한다.

---
## AP-M-68 — Non-Deterministic Asset Generation
- Category: Metadata and schema
- Original IDs: M-68
- Source messages: f181338c-9c17-48e6-8abd-1c47ae2559d6
- Merge status: canonical source
### Source material
### 폰트·시스템·random 값에 따라 이미지 결과가 달라짐

### 개선

폰트와 locale, seed, tool version을 고정한다.

---
## AP-M-69 — Generated Asset Review Blind Spot
- Category: Metadata and schema
- Original IDs: M-69
- Source messages: f181338c-9c17-48e6-8abd-1c47ae2559d6
- Merge status: canonical source
### Source material
### 코드 diff에는 이미지 결과가 보이지 않음

### 개선

큰 시각 변경에는 preview artifact나 screenshot diff를 제공한다.

---
## AP-M-70 — Asset Pipeline Owns Publishing
- Category: Metadata and schema
- Original IDs: M-70
- Source messages: f181338c-9c17-48e6-8abd-1c47ae2559d6
- Merge status: canonical source
### Source material
### 이미지 생성 실패 때문에 텍스트 수정도 배포 불가

### 개선

필수 자산과 선택 자산을 구분하고 fallback을 제공한다.

---
## AP-M-71 — Publish-and-Forget
- Category: Metadata and schema
- Original IDs: M-71
- Source messages: f181338c-9c17-48e6-8abd-1c47ae2559d6
- Merge status: canonical source
### Source material
### 글을 발행한 뒤 다시 보지 않음

### 문제

오래된 정보와 깨진 링크가 누적된다.

### 개선

업데이트·검증·폐기 주기를 운영 프로세스에 포함한다.

---
## AP-M-72 — Date-Based Review Only
- Category: Metadata and schema
- Original IDs: M-72
- Source messages: f181338c-9c17-48e6-8abd-1c47ae2559d6
- Merge status: canonical source
### Source material
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
## AP-M-73 — No Content Ownership
- Category: Metadata and schema
- Original IDs: M-73
- Source messages: f181338c-9c17-48e6-8abd-1c47ae2559d6
- Merge status: canonical source
### Source material
### 어느 주제를 우선 관리할지 기준이 없음

개인 블로그에서도 주제가 많으면 사실상 같은 문제가 생긴다.

### 개선

핵심 Topic별 대표 허브와 유지 우선순위를 둔다.

---
## AP-M-74 — New Content Before Existing Debt
- Category: Metadata and schema
- Original IDs: M-74
- Source messages: f181338c-9c17-48e6-8abd-1c47ae2559d6
- Merge status: canonical source
### Source material
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
## AP-M-75 — No Merge Policy for Similar Articles
- Category: Metadata and schema
- Original IDs: M-75
- Source messages: f181338c-9c17-48e6-8abd-1c47ae2559d6
- Merge status: canonical source
### Source material
### 비슷한 글을 언제 합칠지 기준이 없음

### 개선

다음을 동시에 만족하면 통합 후보로 본다.

- 동일 검색 의도
- 설명 중복
- 독립 실험 없음
- 내부 링크 관계가 약함

---
## AP-M-76 — Deletion Aversion
- Category: Metadata and schema
- Original IDs: M-76
- Source messages: f181338c-9c17-48e6-8abd-1c47ae2559d6
- Merge status: canonical source
### Source material
### 작성한 글을 절대 삭제하거나 통합하지 않음

### 문제

구판·중복·낮은 품질 글이 계속 남는다.

### 개선

redirect와 superseded 상태를 활용해 지식을 보존하면서 구조는 정리한다.

---
## AP-M-77 — Update Without Revalidation
- Category: Metadata and schema
- Original IDs: M-77
- Source messages: f181338c-9c17-48e6-8abd-1c47ae2559d6
- Merge status: canonical source
### Source material
### 문장만 수정하고 환경 검증일도 최신으로 변경

### 문제

실제로 테스트하지 않았는데 최신 글처럼 보인다.

### 개선

`updated`와 `lastVerified`를 분리한다.

---
## AP-M-78 — Bulk AI Refresh
- Category: Metadata and schema
- Original IDs: M-78
- Source messages: f181338c-9c17-48e6-8abd-1c47ae2559d6
- Merge status: canonical source
### Source material
### 오래된 글 전체를 AI로 일괄 재작성

### 문제

- 고유 경험 손실
- 문체 획일화
- 새로운 오류
- 사실 검증 부족

### 개선

AI는 후보와 구조 개선에 사용하고, 핵심 기술 주장과 경험은 직접 검증한다.

---
## AP-M-79 — Editorial Template Lock-In
- Category: Metadata and schema
- Original IDs: M-79
- Source messages: f181338c-9c17-48e6-8abd-1c47ae2559d6
- Merge status: canonical source
### Source material
### 모든 글이 같은 템플릿을 강제

### 문제

글 유형과 주제 특성이 사라진다.

### 개선

콘텐츠 타입별 최소 구조만 제공하고 설명 방식은 유연하게 둔다.

---
## AP-M-80 — No Content Retirement Workflow
- Category: Metadata and schema
- Original IDs: M-80
- Source messages: f181338c-9c17-48e6-8abd-1c47ae2559d6
- Merge status: canonical source
### Source material
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
## AP-M-81 — Content and Platform Changes Mixed
- Category: Metadata and schema
- Original IDs: M-81
- Source messages: f181338c-9c17-48e6-8abd-1c47ae2559d6
- Merge status: canonical source
### Source material
### 한 commit에서 글 50개와 UI 구조를 동시에 변경

### 문제

검토와 rollback이 어렵다.

### 개선

콘텐츠 migration, 플랫폼 변경, 디자인 변경을 가능한 한 분리한다.

---
## AP-M-82 — Giant Refactor Commit
- Category: Metadata and schema
- Original IDs: M-82
- Source messages: f181338c-9c17-48e6-8abd-1c47ae2559d6
- Merge status: canonical source
### Source material
### 수천 파일 변경을 한 commit으로 처리

### 문제

의미 있는 diff 검토가 불가능하다.

### 개선

기계적 변경과 수동 의미 변경을 별도 commit으로 나눈다.

---
## AP-M-83 — Formatting Noise in Semantic Change
- Category: Metadata and schema
- Original IDs: M-83
- Source messages: f181338c-9c17-48e6-8abd-1c47ae2559d6
- Merge status: canonical source
### Source material
### 내용 수정과 formatter 전체 적용이 섞임

### 개선

formatting-only commit을 먼저 분리한다.

---
## AP-M-84 — No Rollback Plan
- Category: Metadata and schema
- Original IDs: M-84
- Source messages: f181338c-9c17-48e6-8abd-1c47ae2559d6
- Merge status: canonical source
### Source material
### 배포 후 문제 발생 시 이전 사이트로 돌아가기 어려움

### 개선

배포 artifact 또는 이전 commit 기반 rollback 절차를 유지한다.

---
## AP-M-85 — Preview Not Representative
- Category: Metadata and schema
- Original IDs: M-85
- Source messages: f181338c-9c17-48e6-8abd-1c47ae2559d6
- Merge status: canonical source
### Source material
### preview에서는 Analytics·광고·base URL·asset 경로가 다름

### 문제

운영에서만 발생하는 오류를 놓친다.

### 개선

운영과 최대한 유사한 preview 설정을 사용한다.

---
## AP-M-86 — Feature Flag Cemetery
- Category: Metadata and schema
- Original IDs: M-86
- Source messages: f181338c-9c17-48e6-8abd-1c47ae2559d6
- Merge status: canonical source
### Source material
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
## AP-M-87 — Permanent Compatibility Layer
- Category: Metadata and schema
- Original IDs: M-87
- Source messages: f181338c-9c17-48e6-8abd-1c47ae2559d6
- Merge status: canonical source
### Source material
### 구형 URL·schema·컴포넌트 adapter가 계속 남음

### 개선

호환 계층마다 종료 조건을 정하고 migration 완료 후 제거한다.

---
## AP-M-88 — Release Notes Without User Impact
- Category: Metadata and schema
- Original IDs: M-88
- Source messages: f181338c-9c17-48e6-8abd-1c47ae2559d6
- Merge status: canonical source
### Source material
### 내부 파일 변경만 설명

### 개선

다음처럼 사용자와 운영 관점으로 작성한다.

```text
검색 결과 정확도 개선
기존 CXL 글 URL 유지
모바일 코드 블록 스크롤 수정
```

---
## AP-M-89 — No Baseline Before Refactor
- Category: Metadata and schema
- Original IDs: M-89
- Source messages: f181338c-9c17-48e6-8abd-1c47ae2559d6
- Merge status: canonical source
### Source material
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
## AP-M-90 — Completion Defined as Code Merge
- Category: Metadata and schema
- Original IDs: M-90
- Source messages: f181338c-9c17-48e6-8abd-1c47ae2559d6
- Merge status: canonical source
### Source material
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
